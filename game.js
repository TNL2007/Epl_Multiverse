(() => {
  const $ = (selector) => document.querySelector(selector);
  const homeScore = $("#home-score");
  const awayScore = $("#away-score");
  const minuteLabel = $("#match-minute");
  const decisionPanel = $("#decision-panel");
  const resultPanel = $("#result-panel");
  const choiceButtons = [...document.querySelectorAll(".choice")];
  const commentaryFeed = $("#commentary-feed");
  const timelineList = $("#timeline-list");
  const originalMatch = { home: 1, away: 1, minute: 72, seconds: 0, momentum: 0, winChance: 0 };
  let seasonData = null;
  let seasonStats = null;
  let actualMatch = null;
  let speechEnabled = false;
  let lastCommentary = "";
  const scenarios = [
    {
      minute: 72, clock: "72:00", title: "Liverpool break after Arsenal’s corner",
      copy: "The real match reached this moment at 1–1: Salah led the counter and squared for Trent, whose shot hit the bar. Replay that actual choice, or branch before it.",
      callout: "⚡ VERIFIED REAL MATCH MOMENT", caption: "LIVERPOOL COUNTER-ATTACK · 72’",
      options: [["through-ball", "Replay Salah’s pass to Trent", "Real match · shot hits the bar"], ["shoot", "Salah shoots instead", "Counterfactual · change the pass"], ["switch", "Hold the ball wider", "Counterfactual · change the move"]],
      models: {
        "through-ball": { outcomes: [["historic-bar", 1]] },
        shoot: { outcomes: [["goal", .18], ["saved", .48], ["miss", .34]] },
        switch: { outcomes: [["build", .72], ["cut-out", .28]] }
      }
    },
    {
      minute: 75, clock: "75:02", title: "Liverpool win a corner",
      copy: "Trent is over the ball. Van Dijk is waiting in the six-yard box, but Arsenal have everyone back. How do you play it?",
      callout: "⚡ SET PIECE", caption: "LIVERPOOL CORNER",
      options: [["cross", "Whip it into the six-yard box", "Big target · Crowded area"], ["short", "Work a short corner", "Create space · Extra pass"], ["recycle", "Reset and keep possession", "Lower risk · Build again"]],
      models: {
        cross: { outcomes: [["goal", .16], ["saved", .37], ["clearance", .47]] },
        short: { outcomes: [["build", .66], ["cut-out", .34]] },
        recycle: { outcomes: [["build", .80], ["cut-out", .20]] }
      }
    },
    {
      minute: 82, clock: "82:31", title: "Arsenal break into space",
      copy: "Saka is carrying the ball at Liverpool's back line. Your midfield is chasing back. Choose how to manage the danger.",
      callout: "⚡ DANGER: ARSENAL BREAK", caption: "ARSENAL COUNTER-ATTACK",
      options: [["press", "Close him down now", "Win it early · Risk the gap"], ["cover", "Drop off and protect the box", "Stay compact · Let them advance"], ["foul", "Stop the break with a foul", "Break the rhythm · Risk a card"]],
      models: {
        press: { outcomes: [["turnover", .40], ["chance-against", .50], ["goal-against", .10]] },
        cover: { outcomes: [["defuse", .68], ["chance-against", .24], ["goal-against", .08]] },
        foul: { outcomes: [["yellow", .58], ["red", .04], ["chance-against", .33], ["goal-against", .05]] }
      }
    }
  ];

  let state;
  let branches;
  let activeBranch;
  let completed = false;

  function newMatch() {
    state = { ...originalMatch, phase: 0, decisions: [], isFinal: false };
    branches = [];
    activeBranch = null;
    completed = false;
    homeScore.textContent = state.home;
    awayScore.textContent = state.away;
    updateWinProbability();
    updateClock();
    updateDecision();
    updateMomentum(0);
    updateImpact(null);
    resultPanel.classList.add("hidden");
    decisionPanel.classList.remove("hidden");
    commentaryFeed.innerHTML = '<article class="commentary-entry"><time>REAL</time><p>At 1–1, Liverpool break after an Arsenal corner. Salah squares for Trent Alexander-Arnold, who hits the crossbar.</p></article><article class="commentary-entry featured"><time>72:00</time><p><strong>Real moment.</strong> Replay the documented pass and crossbar, or explore a clearly labelled counterfactual.</p></article>';
    renderTimelines();
    lastCommentary = "Replay the real 72nd-minute counter or choose a counterfactual.";
    choiceButtons.forEach(button => button.disabled = false);
  }

  function updateClock() {
    const scenario = scenarios[Math.min(state.phase, scenarios.length - 1)];
    minuteLabel.textContent = scenario.clock;
  }

  function updateDecision() {
    const scenario = scenarios[Math.min(state.phase, scenarios.length - 1)];
    const heading = decisionPanel.querySelector("h2");
    decisionPanel.querySelector(".eyebrow").textContent = "YOUR DECISION · " + scenario.minute + "’";
    heading.textContent = scenario.title;
    decisionPanel.querySelector(".decision-copy").textContent = scenario.copy;
    $("#chance-callout").innerHTML = scenario.callout;
    $(".pitch-caption").textContent = scenario.caption;
    $("#ball").style.left = state.phase === 2 ? "54%" : state.phase === 1 ? "89%" : "69%";
    $("#ball").style.top = state.phase === 2 ? "21%" : state.phase === 1 ? "21%" : "25%";
    const phaseNumber = String(state.phase + 1).padStart(2, "0");
    decisionPanel.querySelector(".decision-number").innerHTML = phaseNumber + ' <i>/ 03</i>';
    choiceButtons.forEach((button, index) => {
      const option = scenario.options[index];
      button.dataset.choice = option[0];
      button.querySelector(".choice-text strong").textContent = option[1];
      button.querySelector(".choice-text small").textContent = option[2];
      button.disabled = false;
    });
    completed = false;
    $("#continue-button").onclick = null;
    resultPanel.classList.add("hidden");
    decisionPanel.classList.remove("hidden");
  }

  async function loadSeasonData() {
    try {
      const response = await fetch("./data/epl-2023-24-results.json");
      if (!response.ok) throw new Error("Season data request failed");
      seasonData = await response.json();
      seasonStats = buildSeasonStats(seasonData.matches || []);
      actualMatch = (seasonData.matches || []).find(match =>
        match.date === "2023-12-23" &&
        [match.team1, match.team2].includes("Liverpool FC") &&
        [match.team1, match.team2].includes("Arsenal FC")
      );
      const fixture = actualMatch
        ? "Historical fixture: " + actualMatch.date + " · " + actualMatch.round + " · Liverpool " + actualMatch.score.ft[0] + "–" + actualMatch.score.ft[1] + " Arsenal (full time)"
        : "Historical Premier League results loaded";
      $("#historical-match").textContent = fixture;
      const liverpool = seasonStats["Liverpool FC"];
      const arsenal = seasonStats["Arsenal FC"];
      $("#season-liverpool").textContent = "Liverpool · #" + liverpool.rank + " · " + liverpool.points + " pts · " + liverpool.gf + "–" + liverpool.ga + " goals";
      $("#season-arsenal").textContent = "Arsenal · #" + arsenal.rank + " · " + arsenal.points + " pts · " + arsenal.gf + "–" + arsenal.ga + " goals";
      $("#data-status").textContent = "2023/24 EPL RESULTS LOADED · ALTERNATE EVENTS ARE SIMULATED";
    } catch (error) {
      seasonData = null;
      seasonStats = null;
      actualMatch = null;
      $("#historical-match").textContent = "Season data could not be loaded. Match simulation still works with fallback odds.";
      $("#season-liverpool").textContent = "Liverpool · fallback profile";
      $("#season-arsenal").textContent = "Arsenal · fallback profile";
      $("#data-status").textContent = "OFFLINE FALLBACK · ILLUSTRATIVE ODDS";
    }
  }

  function buildSeasonStats(matches) {
    const table = {};
    let matchCount = 0;
    let totalGoals = 0;
    for (const match of matches) {
      if (!match.score || !match.score.ft) continue;
      const homeGoals = match.score.ft[0], awayGoals = match.score.ft[1];
      if (!Number.isFinite(homeGoals) || !Number.isFinite(awayGoals)) continue;
      for (const team of [match.team1, match.team2]) {
        table[team] ||= { played: 0, wins: 0, draws: 0, losses: 0, gf: 0, ga: 0, points: 0 };
      }
      const home = table[match.team1], away = table[match.team2];
      home.played++; away.played++;
      home.gf += homeGoals; home.ga += awayGoals;
      away.gf += awayGoals; away.ga += homeGoals;
      totalGoals += homeGoals + awayGoals;
      matchCount++;
      if (homeGoals > awayGoals) { home.wins++; away.losses++; home.points += 3; }
      else if (homeGoals < awayGoals) { away.wins++; home.losses++; away.points += 3; }
      else { home.draws++; away.draws++; home.points++; away.points++; }
    }
    const ranked = Object.entries(table).sort((a, b) =>
      b[1].points - a[1].points ||
      (b[1].gf - b[1].ga) - (a[1].gf - a[1].ga) ||
      b[1].gf - a[1].gf
    );
    ranked.forEach(([team, stats], index) => { stats.rank = index + 1; });
    table._league = { matches: matchCount, averageGoalsPerTeamMatch: totalGoals / (matchCount * 2) };
    return table;
  }

  function attackRate(team, opponent) {
    if (!seasonStats || !seasonStats[team] || !seasonStats[opponent]) return 1.45;
    const attack = seasonStats[team].gf / seasonStats[team].played;
    const opponentConcession = seasonStats[opponent].ga / seasonStats[opponent].played;
    return Math.sqrt(Math.max(.05, attack * opponentConcession));
  }

  function adjustedOutcomes(outcomes, target) {
    if (!seasonStats || !target) return outcomes;
    const average = seasonStats._league.averageGoalsPerTeamMatch || 1.45;
    const rate = target === "goal"
      ? attackRate("Liverpool FC", "Arsenal FC")
      : attackRate("Arsenal FC", "Liverpool FC");
    const multiplier = clamp(rate / average, .78, 1.22);
    const weighted = outcomes.map(([name, probability]) => [
      name, name === target ? probability * multiplier : probability
    ]);
    const total = weighted.reduce((sum, [, probability]) => sum + probability, 0);
    return weighted.map(([name, probability]) => [name, probability / total]);
  }

  function currentMinute() {
    return state.isFinal ? 90 : scenarios[Math.min(state.phase, 2)].minute;
  }

  function poisson(lambda, goals) {
    let value = Math.exp(-lambda);
    for (let i = 1; i <= goals; i++) value *= lambda / i;
    return value;
  }

  function matchProbabilities() {
    const minutesLeft = Math.max(0, 90 - currentMinute());
    const lambdaHome = attackRate("Liverpool FC", "Arsenal FC") * minutesLeft / 90;
    const lambdaAway = attackRate("Arsenal FC", "Liverpool FC") * minutesLeft / 90;
    let homeWin = 0, draw = 0, awayWin = 0;
    for (let h = 0; h <= 8; h++) for (let a = 0; a <= 8; a++) {
      const probability = poisson(lambdaHome, h) * poisson(lambdaAway, a);
      const finalHome = state.home + h, finalAway = state.away + a;
      if (finalHome > finalAway) homeWin += probability;
      else if (finalHome < finalAway) awayWin += probability;
      else draw += probability;
    }
    const total = homeWin + draw + awayWin || 1;
    return { homeWin: homeWin / total, draw: draw / total, awayWin: awayWin / total };
  }

  function updateWinProbability() {
    const probabilities = matchProbabilities();
    state.winChance = Math.round(probabilities.homeWin * 100);
    $("#win-chance").textContent = state.winChance + "%";
  }

  function expectedTableRipple() {
    const p = matchProbabilities();
    const homeDelta = 3 * p.homeWin + p.draw - 1;
    const awayDelta = 3 * p.awayWin + p.draw - 1;
    const score = clamp(Math.round(20 + 28 * (Math.abs(homeDelta) + Math.abs(awayDelta))), 0, 100);
    return { score, homeDelta, awayDelta };
  }

  function seasonTableSensitivity() {
    if (!seasonStats) return "Historical table comparison unavailable.";
    const homePoints = state.home > state.away ? 3 : state.home === state.away ? 1 : 0;
    const awayPoints = state.away > state.home ? 3 : state.home === state.away ? 1 : 0;
    const homeDelta = homePoints - 1, awayDelta = awayPoints - 1;
    const rows = Object.entries(seasonStats)
      .filter(([team]) => !team.startsWith("_"))
      .map(([team, stats]) => ({
        team,
        points: stats.points + (team === "Liverpool FC" ? homeDelta : team === "Arsenal FC" ? awayDelta : 0),
        gd: stats.gf - stats.ga + (team === "Liverpool FC" ? state.home - state.away : team === "Arsenal FC" ? state.away - state.home : 0),
        gf: stats.gf + (team === "Liverpool FC" ? state.home - originalMatch.home : team === "Arsenal FC" ? state.away - originalMatch.away : 0)
      }))
      .sort((a, b) => b.points - a.points || b.gd - a.gd || b.gf - a.gf);
    const homeRank = rows.findIndex(row => row.team === "Liverpool FC") + 1;
    const awayRank = rows.findIndex(row => row.team === "Arsenal FC") + 1;
    const liverpoolPoints = seasonStats["Liverpool FC"].points + homeDelta;
    const arsenalPoints = seasonStats["Arsenal FC"].points + awayDelta;
    return "Table sensitivity only (other 379 results fixed): Liverpool " + liverpoolPoints + " pts (#" + homeRank + "); Arsenal " + arsenalPoints + " pts (#" + awayRank + ").";
  }

  function speak(text) {
    if (!speechEnabled || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-GB";
    utterance.rate = .96;
    window.speechSynthesis.speak(utterance);
  }

  function sampleOutcome(list) {
    let roll = Math.random();
    for (const [outcome, probability] of list) {
      roll -= probability;
      if (roll <= 0) return outcome;
    }
    return list[list.length - 1][0];
  }

  function decide(choice) {
    if (completed) return;
    const scenario = scenarios[state.phase];
    const model = scenario.models[choice];
    if (!model) return;
    completed = true;
    choiceButtons.forEach(button => button.disabled = true);
    const target = state.phase === 2 ? "chance-against" : "goal";
    const outcome = sampleOutcome(adjustedOutcomes(model.outcomes, target));
    const result = describeOutcome(state.phase, choice, outcome);
    applyOutcome(outcome);
    state.decisions.push({ phase: state.phase, choice, outcome, label: result.label });
    if (state.phase === 0 && activeBranch === null) {
      activeBranch = { id: branches.length + 1, firstChoice: result.choiceLabel, firstOutcome: result.label, decisions: [] };
      branches.push(activeBranch);
    }
    if (!activeBranch) {
      activeBranch = { id: branches.length + 1, firstChoice: result.choiceLabel, firstOutcome: result.label, decisions: [] };
      branches.push(activeBranch);
    }
    activeBranch.decisions.push({ phase: state.phase, choice: result.choiceLabel, outcome: result.label });
    showResult(result);
    addCommentary(result.commentary, scenario.clock, true);
    updateScore();
    updateMomentum(result.momentumDelta);
    updateImpact(result);
    renderTimelines();
  }

  function describeOutcome(phase, choice, outcome) {
    if (phase === 0) {
      const names = { "through-ball": "Real play: Salah squares to Trent", shoot: "Counterfactual: Salah shoots", switch: "Counterfactual: Salah holds the ball" };
      const result = {
        "historic-bar": { label: "REAL EVENT", tag: "HISTORICAL · CROSSBAR", headline: "Trent’s shot crashes off the bar", body: "This is what happened: after Liverpool broke from an Arsenal corner, Salah squared the ball to Alexander-Arnold. Trent hit the crossbar; the match stayed 1–1.", commentary: "Salah squares it for Trent… he strikes it… off the crossbar! Liverpool come within inches.", momentumDelta: 0, winDelta: 0, ripple: 0 },
        goal: { label: "SIMULATED GOAL", tag: "COUNTERFACTUAL · LIVERPOOL", headline: "Liverpool turn the counter into a goal", body: "In this simulated branch, Liverpool finish the move and take the lead. This did not happen in the historical match.", commentary: "A different finish changes the score in this simulated branch.", momentumDelta: 22, winDelta: 24, ripple: 88 },
        miss: { label: "SIMULATED MISS", tag: "COUNTERFACTUAL · MISSED", headline: "The altered counter ends without a goal", body: "In this simulated branch, Liverpool do not score. The real match moment was Salah’s pass to Trent and the shot against the crossbar.", commentary: "The altered move ends without a goal; the real crossbar moment remains the historical reference.", momentumDelta: -5, winDelta: -4, ripple: 52 },
        saved: { label: "SIMULATED SAVE", tag: "COUNTERFACTUAL · SAVE", headline: "Raya keeps the altered attack out", body: "In this simulated branch, Raya saves the changed attempt. This is not a recorded event from the match.", commentary: "Raya makes the save in this simulated alternative.", momentumDelta: 3, winDelta: 2, ripple: 43 },
        "cut-out": { label: "SIMULATED TURNOVER", tag: "COUNTERFACTUAL · TURNOVER", headline: "Arsenal stop the altered counter", body: "In this simulated branch, Arsenal regain possession. No such turnover is claimed as a historical event.", commentary: "Arsenal stop the altered attack in this simulated branch.", momentumDelta: -8, winDelta: -5, ripple: 33 },
        build: { label: "ATTACK BUILDS", tag: "PRESSURE BUILDS", headline: "Liverpool keep the attack alive", body: "Salah finds the free man on the far side. Liverpool recycle possession and pin Arsenal back around their box.", commentary: "Salah switches it quickly… Liverpool have space on the far side. The pressure builds again.", momentumDelta: 8, winDelta: 3, ripple: 36 }
      }[outcome];
      return { ...result, choiceLabel: names[choice] };
    }
    if (phase === 1) {
      const result = {
        goal: { label: "GOAL", tag: "GOAL · LIVERPOOL", headline: "Van Dijk rises above them all!", body: "Trent's delivery drops perfectly into the six-yard box. Van Dijk powers his header beyond Raya. Liverpool lead 2–1.", commentary: "Trent swings it in… Van Dijk is up… GOOOAL! Liverpool have found the breakthrough!", momentumDelta: 22, winDelta: 24, ripple: 91 },
        saved: { label: "CHANCE SAVED", tag: "BIG SAVE", headline: "Raya keeps the header out", body: "Van Dijk gets a clean connection, but Raya springs across goal to push it away.", commentary: "Van Dijk gets up… strong header… Raya tips it over! What a save.", momentumDelta: 5, winDelta: 2, ripple: 46 },
        clearance: { label: "CORNER CLEARED", tag: "CLEARED", headline: "Arsenal survive the delivery", body: "The cross is met by Gabriel, who gets enough on it to clear the immediate danger.", commentary: "The corner is whipped in… Gabriel gets there first and Arsenal clear.", momentumDelta: -3, winDelta: -1, ripple: 28 },
        build: { label: "PRESSURE BUILDS", tag: "ATTACK CONTINUES", headline: "Liverpool recycle and go again", body: "The short corner draws Arsenal out. Liverpool keep the ball and work another opening around the edge of the area.", commentary: "Cleverly worked short… Liverpool keep possession and Arsenal have to reset.", momentumDelta: 7, winDelta: 2, ripple: 34 },
        "cut-out": { label: "POSSESSION LOST", tag: "TURNOVER", headline: "Arsenal break up the routine", body: "The short option is closed down and Arsenal nick the ball before Liverpool can reset.", commentary: "The short corner goes astray. Arsenal pick it off and look to break.", momentumDelta: -7, winDelta: -3, ripple: 26 }
      }[outcome];
      return { ...result, choiceLabel: choice === "cross" ? "Whip in a cross" : choice === "short" ? "Work a short corner" : "Recycle possession" };
    }
    const result = {
      turnover: { label: "BALL WON", tag: "PRESSURE REWARDED", headline: "Liverpool win it back!", body: "The midfield gets across in time. Saka is forced to check back and Liverpool regain possession before Arsenal can reach the box.", commentary: "Liverpool swarm Saka… they win it back! That could be a crucial tackle.", momentumDelta: 8, winDelta: 2, ripple: 42 },
      defuse: { label: "DANGER DEFUSED", tag: "SAFE DEFENDING", headline: "Liverpool hold their shape", body: "The back line stays compact. Saka runs out of room, and Arsenal are forced to recycle the ball.", commentary: "Liverpool stay patient… Saka has nowhere to go. The danger passes.", momentumDelta: 3, winDelta: 1, ripple: 30 },
      "chance-against": { label: "ARSENAL CHANCE", tag: "DANGER", headline: "Arsenal find a way through", body: "Saka gets a yard on the defender and slides a dangerous ball across the face of goal. Liverpool scramble it away.", commentary: "Saka gets through… across the six-yard box! Liverpool just about survive.", momentumDelta: -10, winDelta: -8, ripple: 65 },
      "goal-against": { label: "ARSENAL GOAL", tag: "GOAL · ARSENAL", headline: "Arsenal punish the space", body: "Saka draws the defender and squares it across the box. Arsenal finish the move and turn the match on its head.", commentary: "Saka drives into the area… squares it… Arsenal score! Liverpool have a mountain to climb.", momentumDelta: -20, winDelta: -18, ripple: 94 },
      yellow: { label: "YELLOW CARD", tag: "BOOKED", headline: "The break is stopped — and the referee reaches for a card", body: "Liverpool halt the counter, but the referee has no hesitation. A yellow card, and Arsenal have a free kick in a dangerous area.", commentary: "The foul stops the break… and there's the yellow. Liverpool have to be careful now.", momentumDelta: -2, winDelta: -2, ripple: 38 },
      red: { label: "RED CARD", tag: "SENT OFF", headline: "Liverpool are down to ten", body: "The referee judges the challenge to have denied a clear goal-scoring opportunity. A red card changes the final minutes completely.", commentary: "The referee goes to his pocket… it's red! Liverpool will finish with ten.", momentumDelta: -14, winDelta: -15, ripple: 92 }
    }[outcome];
    return { ...result, choiceLabel: choice === "press" ? "Press Saka early" : choice === "cover" ? "Protect the box" : "Stop the break" };
  }

  function applyOutcome(outcome) {
    if (outcome === "goal") state.home += 1;
    if (outcome === "goal-against") state.away += 1;
    updateWinProbability();
  }

  function showResult(result) {
    decisionPanel.classList.add("hidden");
    resultPanel.classList.remove("hidden");
    $("#result-tag").textContent = result.tag;
    $("#result-headline").textContent = result.headline;
    $("#result-description").textContent = result.body;
    $("#continue-button").innerHTML = state.phase >= 2 ? "Finish match <span>→</span>" : "Continue match <span>→</span>";
    $("#ripple-score").textContent = result.ripple;
    $("#ripple-caption").textContent = "Illustrative impact of this moment on the match story.";
    $("#win-chance").textContent = state.winChance + "%";
    $("#match-state").textContent = state.home > state.away ? "Liverpool lead" : state.home < state.away ? "Arsenal lead" : "Level";
  }

  function addCommentary(text, time, featured) {
    const item = document.createElement("article");
    item.className = "commentary-entry" + (featured ? " featured" : "");
    const safeTime = document.createElement("time");
    safeTime.textContent = time;
    const sentence = document.createElement("p");
    sentence.textContent = text;
    item.append(safeTime, sentence);
    commentaryFeed.append(item);
    lastCommentary = text;
    speak(text);
    commentaryFeed.scrollTop = commentaryFeed.scrollHeight;
  }

  function updateScore() {
    homeScore.textContent = state.home;
    awayScore.textContent = state.away;
  }

  function updateMomentum(delta) {
    state.momentum = clamp(state.momentum + delta, -45, 45);
    const magnitude = Math.abs(state.momentum);
    const fill = $("#momentum-fill");
    if (state.momentum >= 0) {
      fill.style.left = "50%";
      fill.style.width = Math.min(48, magnitude) + "%";
      fill.style.background = "linear-gradient(90deg,#7baa4b,#d2f176)";
    } else {
      fill.style.left = (50 - Math.min(48, magnitude)) + "%";
      fill.style.width = Math.min(48, magnitude) + "%";
      fill.style.background = "linear-gradient(270deg,#8da7ca,#5f82ad)";
    }
    $("#momentum-value").textContent = (state.momentum > 0 ? "+" : "") + state.momentum;
    $("#momentum-note").textContent = state.momentum > 20 ? "Simulated pressure has swung towards Liverpool after your choice." : state.momentum < -10 ? "Simulated pressure has swung towards Arsenal after your choice." : "Simulated pressure is balanced; this is a scenario meter, not recorded match data.";
  }

  function updateImpact(result) {
    updateWinProbability();
    if (result) {
      const ripple = expectedTableRipple();
      $("#ripple-score").textContent = ripple.score;
      $("#ripple-caption").textContent = "Expected points vs the real 1–1: Liverpool " +
        (ripple.homeDelta >= 0 ? "+" : "") + ripple.homeDelta.toFixed(1) + ", Arsenal " +
        (ripple.awayDelta >= 0 ? "+" : "") + ripple.awayDelta.toFixed(1) + ".";
    } else {
      $("#ripple-score").textContent = "—";
      $("#ripple-caption").textContent = seasonStats
        ? "Real 2023/24 table loaded. Choose an action to estimate its season-point ripple."
        : "Load the included season results to calculate a data-based table ripple.";
    }
  }

  function renderTimelines() {
    $("#branch-count").textContent = branches.length + (branches.length === 1 ? " timeline" : " timelines");
    if (!branches.length) {
      timelineList.innerHTML = "<div class=\"timeline-row\"><span class=\"timeline-index\">0</span><span class=\"timeline-summary\"><strong>Historical trunk · Liverpool 1–1 Arsenal</strong><small>Actual 2023/24 match · 23 Dec 2023</small></span><span class=\"timeline-state\">ACTUAL</span></div><div class=\"timeline-row current\"><span class=\"timeline-index\">1</span><span class=\"timeline-summary\"><strong>Current timeline</strong><small>Waiting for your first decision…</small></span><span class=\"timeline-state\">LIVE</span></div>";
      return;
    }
    timelineList.replaceChildren();
    branches.slice().reverse().forEach(branch => {
      const row = document.createElement("div");
      row.className = "timeline-row" + (branch === activeBranch ? " current" : "");
      const index = document.createElement("span");
      index.className = "timeline-index";
      index.textContent = branch.id;
      const summary = document.createElement("span");
      summary.className = "timeline-summary";
      const title = document.createElement("strong");
      title.textContent = branch.firstChoice + " · " + branch.firstOutcome;
      const sub = document.createElement("small");
      sub.textContent = branch.decisions.length + " decision" + (branch.decisions.length === 1 ? "" : "s") + " explored";
      summary.append(title, sub);
      const status = document.createElement("span");
      status.className = "timeline-state";
      status.textContent = branch === activeBranch ? "ACTIVE" : "SAVED";
      row.append(index, summary, status);
      timelineList.append(row);
    });
  }

  function continueMatch() {
    if (state.phase < 2) {
      state.phase += 1;
      updateClock();
      updateDecision();
      addCommentary("The match moves on. Another decision is waiting to be made.", scenarios[state.phase].clock, false);
      return;
    }
    state.isFinal = true;
    updateWinProbability();
    addCommentary(state.home === state.away ? "The referee brings it to a close. The points are shared." : state.home > state.away ? "Full time at Anfield. Liverpool take all three points." : "Full time. Arsenal leave Anfield with the win.", "90:00", true);
    $("#continue-button").textContent = "Play another timeline";
    completed = true;
    $("#result-headline").textContent = "Full time";
    $("#result-description").textContent = state.home + "–" + state.away + ". Rewind any decision to explore another version of the match.";
    $("#result-tag").textContent = "MATCH COMPLETE";
    $("#ripple-caption").textContent = seasonTableSensitivity();
    $("#ripple-score").textContent = expectedTableRipple().score;
  }

  function rewind() {
    state = { ...originalMatch, phase: 0, decisions: [], isFinal: false };
    activeBranch = null;
    completed = false;
    updateScore();
    updateWinProbability();
    updateClock();
    updateMomentum(0);
    $("#win-chance").textContent = state.winChance + "%";
    $("#match-state").textContent = "Level";
    updateDecision();
    addCommentary("Back to 72:00. Choose a different action to create another timeline.", scenarios[0].clock, false);
  }

  function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }

  choiceButtons.forEach(button => button.addEventListener("click", () => decide(button.dataset.choice)));
  $("#continue-button").addEventListener("click", () => {
    if (state.phase >= 2 && $("#result-tag").textContent === "MATCH COMPLETE") newMatch();
    else continueMatch();
  });
  $("#rewind-button").addEventListener("click", rewind);
  $("#reset-button").addEventListener("click", newMatch);
  const voiceButton = $("#voice-toggle");
  if (!("speechSynthesis" in window)) {
    voiceButton.disabled = true;
    voiceButton.textContent = "Voice unavailable";
  } else {
    voiceButton.addEventListener("click", () => {
      speechEnabled = !speechEnabled;
      voiceButton.setAttribute("aria-pressed", String(speechEnabled));
      voiceButton.textContent = speechEnabled ? "■ Stop voice" : "▶ Listen";
      if (speechEnabled && lastCommentary) speak(lastCommentary);
      else window.speechSynthesis.cancel();
    });
  }

  const archiveSeasonSelect = $("#archive-season");
  const archiveSearch = $("#archive-search");
  const archiveFilter = $("#archive-status-filter");
  const archiveStatus = $("#archive-status");
  const archiveList = $("#archive-list");
  const archiveTotal = $("#archive-total");
  const archivePageLabel = $("#archive-page");
  const archivePrev = $("#archive-prev");
  const archiveNext = $("#archive-next");
  const archiveSelection = $("#archive-selection");
  const ARCHIVE_PAGE_SIZE = 20;
  const ARCHIVE_FILES = [
    ["2026-27", "./data/epl-2026-27-results.json"],
    ["2025-26", "./data/epl-2025-26-results.json"],
    ["2024-25", "./data/epl-2024-25-results.json"],
    ["2023-24", "./data/epl-2023-24-results.json"],
    ["2022-23", "./data/epl-2022-23-results.json"]
  ];
  let archiveData = [];
  let archivePageNumber = 0;
  let archiveVisibleMatches = [];

  function matchHasFinalScore(match) {
    return Array.isArray(match.score?.ft) && match.score.ft.length === 2;
  }

  function matchArchiveState(match) {
    if (matchHasFinalScore(match)) return "completed";
    const today = new Date().toISOString().slice(0, 10);
    return match.date > today ? "upcoming" : match.date === today ? "today" : "missing";
  }

  function formatArchiveDate(value) {
    if (!value) return "Date TBC";
    const date = new Date(value + "T00:00:00");
    return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(date);
  }

  function formatArchiveScore(match) {
    return matchHasFinalScore(match) ? match.score.ft[0] + "–" + match.score.ft[1] : "v";
  }

  function renderMatchArchive() {
    if (!archiveData.length) return;
    const season = archiveData.find(item => item.season === archiveSeasonSelect.value) || archiveData[0];
    const query = archiveSearch.value.trim().toLowerCase();
    const filter = archiveFilter.value;
    archiveVisibleMatches = season.matches.map((match, index) => ({ match, index }))
      .filter(({ match }) => {
        const status = matchArchiveState(match);
        const matchesFilter = filter === "all" || filter === status;
        const searchable = [match.date, match.round, match.team1, match.team2].join(" ").toLowerCase();
        return matchesFilter && (!query || searchable.includes(query));
      })
      .sort((a, b) => (b.match.date || "").localeCompare(a.match.date || "") || (b.match.time || "").localeCompare(a.match.time || ""));
    const pageCount = Math.max(1, Math.ceil(archiveVisibleMatches.length / ARCHIVE_PAGE_SIZE));
    archivePageNumber = Math.min(archivePageNumber, pageCount - 1);
    const pageItems = archiveVisibleMatches.slice(archivePageNumber * ARCHIVE_PAGE_SIZE, (archivePageNumber + 1) * ARCHIVE_PAGE_SIZE);
    const finalCount = season.matches.filter(matchHasFinalScore).length;
    const missingCount = season.matches.length - finalCount;
    archiveTotal.textContent = archiveData.reduce((sum, item) => sum + item.matches.length, 0).toLocaleString("en-GB") + " fixtures · 5 seasons";
    archiveStatus.textContent = season.season.replace("-", "/") + " · " + finalCount + " final scores · " + missingCount + " without a score in this snapshot";
    archivePageLabel.textContent = (archivePageNumber + 1) + " / " + pageCount;
    archivePrev.disabled = archivePageNumber === 0;
    archiveNext.disabled = archivePageNumber >= pageCount - 1;
    archiveList.replaceChildren();
    if (!pageItems.length) {
      archiveList.innerHTML = '<p class="archive-empty">No matches found for this search.</p>';
      return;
    }
    for (const { match, index } of pageItems) {
      const status = matchArchiveState(match);
      const row = document.createElement("button");
      row.type = "button";
      row.className = "archive-row";
      const date = document.createElement("span");
      date.className = "archive-date";
      date.textContent = formatArchiveDate(match.date);
      const teams = document.createElement("span");
      teams.className = "archive-teams";
      const home = document.createElement("strong");
      home.textContent = match.team1;
      const score = document.createElement("b");
      score.textContent = formatArchiveScore(match);
      const away = document.createElement("strong");
      away.textContent = match.team2;
      teams.append(home, score, away);
      const meta = document.createElement("span");
      meta.className = "archive-meta";
      const round = document.createElement("small");
      round.textContent = match.round || "Fixture";
      const badge = document.createElement("i");
      badge.className = "archive-badge " + status;
      badge.textContent = status === "completed" ? "FT" : status === "upcoming" ? "UPCOMING" : status === "today" ? "TODAY · NO SCORE" : "NO SCORE";
      meta.append(round, badge);
      row.append(date, teams, meta);
      row.addEventListener("click", () => showArchiveSelection(season, match, index));
      archiveList.append(row);
    }
  }

  function showArchiveSelection(season, match, index) {
    const score = matchHasFinalScore(match) ? " " + match.score.ft[0] + "–" + match.score.ft[1] + " " : " v ";
    $("#archive-selection-title").textContent = match.team1 + score + match.team2;
    const status = matchArchiveState(match);
    const statusText = status === "completed" ? "Full-time score in the included dataset." : status === "upcoming" ? "Fixture is scheduled; no result is recorded yet." : status === "today" ? "Today’s fixture; no final result is recorded in this snapshot yet." : "This fixture has no score in the current data snapshot.";
    $("#archive-selection-copy").textContent = season.season.replace("-", "/") + " · " + formatArchiveDate(match.date) + " · " + (match.round || "Premier League") + ". " + statusText + " This archive has scores, not a verified event timeline.";
    archiveSelection.classList.remove("hidden");
    document.dispatchEvent(new CustomEvent("fixture:selected", { detail: { season: season.season, matches: season.matches, match, status, hasFinalScore: matchHasFinalScore(match) } }));
    archiveSelection.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  async function loadMatchArchive() {
    try {
      const loaded = await Promise.all(ARCHIVE_FILES.map(async ([season, path]) => {
        const response = await fetch(path);
        if (!response.ok) throw new Error("Could not load " + season);
        const data = await response.json();
        return { season, matches: Array.isArray(data.matches) ? data.matches : [], source: data.source };
      }));
      archiveData = loaded;
      for (const item of archiveData) {
        const option = document.createElement("option");
        option.value = item.season;
        option.textContent = item.season.replace("-", "/") + (item.season === "2026-27" ? " · current" : "");
        archiveSeasonSelect.append(option);
      }
      archiveSeasonSelect.value = "2026-27";
      const total = archiveData.reduce((sum, item) => sum + item.matches.length, 0);
      const finalScores = archiveData.reduce((sum, item) => sum + item.matches.filter(matchHasFinalScore).length, 0);
      archiveTotal.title = total.toLocaleString("en-GB") + " fixtures across five seasons; " + finalScores.toLocaleString("en-GB") + " with full-time scores in the snapshot.";
      archiveSeasonSelect.addEventListener("change", () => { archivePageNumber = 0; archiveSelection.classList.add("hidden"); renderMatchArchive(); });
      archiveSearch.addEventListener("input", () => { archivePageNumber = 0; renderMatchArchive(); });
      archiveFilter.addEventListener("change", () => { archivePageNumber = 0; renderMatchArchive(); });
      archivePrev.addEventListener("click", () => { archivePageNumber--; renderMatchArchive(); });
      archiveNext.addEventListener("click", () => { archivePageNumber++; renderMatchArchive(); });
      renderMatchArchive();
    } catch (error) {
      archiveStatus.textContent = "The match archive could not be loaded. The featured simulation is still available.";
      archiveList.replaceChildren();
    }
  }

  loadSeasonData().then(newMatch);
  loadMatchArchive();
})();
