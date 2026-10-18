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
  const originalMatch = { home: 1, away: 1, minute: 68, seconds: 14, momentum: 18, winChance: 0 };
  let seasonData = null;
  let seasonStats = null;
  let actualMatch = null;
  let speechEnabled = false;
  let lastCommentary = "";
  const scenarios = [
    {
      minute: 68, clock: "68:14", title: "Salah has space on the right",
      copy: "Núñez is attacking the near channel. The keeper is set, but the back line is scrambling. What should Mo do?",
      callout: "⚡ BREAKING INTO THE BOX", caption: "LIVERPOOL COUNTER-ATTACK",
      options: [["through-ball", "Slip Núñez through", "High reward · Tight angle"], ["shoot", "Take the shot himself", "Good position · Keeper ready"], ["switch", "Switch play to the left", "Keep the ball · Reset the attack"]],
      models: {
        "through-ball": { outcomes: [["goal", .22], ["miss", .50], ["cut-out", .28]] },
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
        press: { outcomes: [["turnover", .44], ["chance-against", .56]] },
        cover: { outcomes: [["defuse", .70], ["chance-against", .30]] },
        foul: { outcomes: [["yellow", .60], ["red", .04], ["chance-against", .36]] }
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
    commentaryFeed.innerHTML = '<article class="commentary-entry"><time>67:42</time><p>Arsenal try to play out, but Liverpool snap into the press. Mac Allister wins it back in midfield.</p></article><article class="commentary-entry"><time>67:55</time><p>Diaz drives forward and finds Salah out on the right. Liverpool have numbers here.</p></article><article class="commentary-entry featured"><time>68:14</time><p><strong>Here comes Salah.</strong> Núñez is making the run through the middle — this is a big moment.</p></article>';
    renderTimelines();
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
    $("#ball").style.left = state.phase === 2 ? "78%" : state.phase === 1 ? "89%" : "64%";
    $("#ball").style.top = state.phase === 2 ? "42%" : state.phase === 1 ? "21%" : "56%";
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
    updateWinProbability();
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
      const names = { "through-ball": "Salah plays Núñez in", shoot: "Salah shoots", switch: "Salah switches play" };
      const result = {
        goal: { label: "GOAL", tag: "GOAL · LIVERPOOL", headline: choice === "through-ball" ? "Núñez gets there… and scores!" : "Salah bends it into the corner!", body: choice === "through-ball" ? "Salah threads the pass between the centre-backs. Núñez takes it in stride and lifts the finish over the keeper. Liverpool lead 2–1." : "Salah shapes to curl it across goal and finds the far corner. The Kop erupts. Liverpool lead 2–1.", commentary: choice === "through-ball" ? "Salah slips Núñez through… he takes it early… GOOOAL! Darwin Núñez gives Liverpool the lead!" : "Salah cuts inside and lets fly… what a finish! Liverpool lead with minutes to play!", momentumDelta: 22, winDelta: 24, ripple: 88 },
        miss: { label: "CHANCE MISSED", tag: "CHANCE MISSED", headline: choice === "through-ball" ? "Salah slips Núñez in…" : "Salah takes it on…", body: choice === "through-ball" ? "Núñez gets the shot away under pressure, but drags it just wide of the far post. A huge chance goes begging." : "He gets it onto his left and curls one towards the far corner. It bends away at the last second — Raya watches it wide.", commentary: choice === "through-ball" ? "Salah slips Núñez in… he opens his body… wide of the far post! That was the moment." : "Salah curls one towards the far corner… and it drifts wide. So close from Liverpool.", momentumDelta: -5, winDelta: -4, ripple: 52 },
        saved: { label: "SAVE", tag: "BIG SAVE", headline: "The keeper keeps Arsenal level", body: "Salah gets the shot away through a crowd of bodies, but Raya reacts sharply and pushes it around the post.", commentary: "Salah shoots through traffic… Raya gets down brilliantly! Arsenal survive, for now.", momentumDelta: 3, winDelta: 2, ripple: 43 },
        "cut-out": { label: "ATTACK BROKEN UP", tag: "TURNOVER", headline: choice === "through-ball" ? "The passing lane is shut" : "Arsenal get a foot in", body: choice === "through-ball" ? "Salah tries to thread the ball into the channel, but Saliba reads it and steps across Núñez. Arsenal clear their lines." : "The shot is charged down and Arsenal recover possession. Liverpool's counter is over.", commentary: choice === "through-ball" ? "Salah looks for Núñez, but Saliba reads it well. Arsenal get bodies back behind the ball." : "Salah winds it up… blocked! Arsenal scramble the ball clear.", momentumDelta: -8, winDelta: -5, ripple: 33 },
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
      yellow: { label: "YELLOW CARD", tag: "BOOKED", headline: "The break is stopped — and the referee reaches for a card", body: "Liverpool halt the counter, but the referee has no hesitation. A yellow card, and Arsenal have a free kick in a dangerous area.", commentary: "The foul stops the break… and there's the yellow. Liverpool have to be careful now.", momentumDelta: -2, winDelta: -2, ripple: 38 },
      red: { label: "RED CARD", tag: "SENT OFF", headline: "Liverpool are down to ten", body: "The referee judges the challenge to have denied a clear goal-scoring opportunity. A red card changes the final minutes completely.", commentary: "The referee goes to his pocket… it's red! Liverpool will finish with ten.", momentumDelta: -14, winDelta: -15, ripple: 92 }
    }[outcome];
    return { ...result, choiceLabel: choice === "press" ? "Press Saka early" : choice === "cover" ? "Protect the box" : "Stop the break" };
  }

  function applyOutcome(outcome) {
    if (outcome === "goal") state.home += 1;
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
    $("#momentum-note").textContent = state.momentum > 20 ? "Liverpool are turning the pressure up. The crowd can feel it." : state.momentum < -10 ? "Arsenal are finding space and shifting the pressure back." : "The match is finely balanced. One moment could swing it either way.";
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
      timelineList.innerHTML = '<div class="timeline-row current"><span class="timeline-index">1</span><span class="timeline-summary"><strong>Current timeline</strong><small>Waiting for your first decision…</small></span><span class="timeline-state">LIVE</span></div>';
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
    state = { ...originalMatch, phase: 0, decisions: [] };
    activeBranch = null;
    completed = false;
    updateScore();
    updateClock();
    updateMomentum(0);
    $("#win-chance").textContent = state.winChance + "%";
    $("#match-state").textContent = "Level";
    updateDecision();
    addCommentary("Back to 68:14. Choose a different action to create another timeline.", scenarios[0].clock, false);
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
  loadSeasonData().then(newMatch);
})();
