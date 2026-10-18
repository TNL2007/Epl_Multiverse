(() => {
  const $ = (selector) => document.querySelector(selector);
  const panel = $("#fixture-simulator");
  const homeName = $("#fixture-home-name");
  const awayName = $("#fixture-away-name");
  const homeScore = $("#fixture-home-score");
  const awayScore = $("#fixture-away-score");
  const minuteLabel = $("#fixture-sim-minute");
  const commentary = $("#fixture-sim-commentary");
  const log = $("#fixture-sim-log");
  const actions = [...document.querySelectorAll("#fixture-sim-actions button")];
  const relevantSections = [$(".match-heading"), $(".scoreboard"), $(".season-context"), $(".game-grid")].filter(Boolean);
  let selected = null;
  let simState = null;

  function readableName(name) {
    return (name || "Unknown team").replace(/ (FC|AFC)$/, "");
  }

  function isVerifiedLiverpoolArsenalFixture(match) {
    return match.date === "2023-12-23" &&
      match.team1 === "Liverpool FC" && match.team2 === "Arsenal FC";
  }

  function seasonRates(matches, team) {
    const rows = (matches || []).filter(match =>
      match.score && Array.isArray(match.score.ft) && match.score.ft.length === 2);
    const scored = rows.reduce((sum, match) => sum +
      (match.team1 === team ? match.score.ft[0] : match.team2 === team ? match.score.ft[1] : 0), 0);
    const conceded = rows.reduce((sum, match) => sum +
      (match.team1 === team ? match.score.ft[1] : match.team2 === team ? match.score.ft[0] : 0), 0);
    const played = rows.filter(match => match.team1 === team || match.team2 === team).length;
    return played ? { scored: scored / played, conceded: conceded / played } : { scored: 1.35, conceded: 1.35 };
  }

  function resetSimulation() {
    if (!selected) return;
    simState = { home: 0, away: 0, minute: 0, done: false };
    homeScore.textContent = "0";
    awayScore.textContent = "0";
    minuteLabel.textContent = "0′";
    log.replaceChildren();
    commentary.textContent = "Kick-off. Choose a home-team approach to simulate the next ten-minute phase.";
    actions.forEach(button => button.disabled = false);
    $("#fixture-sim-ball").style.left = "25%";
    $("#fixture-sim-ball").style.top = "64%";
  }

  function appendLog(message) {
    const item = document.createElement("p");
    item.textContent = message;
    log.prepend(item);
  }

  function phaseProbabilities(tactic) {
    const home = seasonRates(selected.matches, selected.match.team1);
    const away = seasonRates(selected.matches, selected.match.team2);
    const homeRate = (home.scored + away.conceded) / 2;
    const awayRate = (away.scored + home.conceded) / 2;
    const modifiers = tactic === "press" ? [1.16, 1.10] : tactic === "counter" ? [1.04, 1.14] : [1.0, .88];
    const chance = rate => Math.max(.025, Math.min(.25, 1 - Math.exp(-rate * modifiers[0] / 9)));
    const homeChance = chance(homeRate);
    const awayChance = Math.max(.02, Math.min(.24, 1 - Math.exp(-awayRate * modifiers[1] / 9)));
    return { homeChance, awayChance };
  }

  function simulatePhase(tactic) {
    if (!selected || !simState || simState.done) return;
    const probabilities = phaseProbabilities(tactic);
    const roll = Math.random();
    let event;
    if (roll < probabilities.homeChance) {
      simState.home++;
      event = readableName(selected.match.team1) + " score in this generated simulation.";
      $("#fixture-sim-ball").style.left = "89%";
      $("#fixture-sim-ball").style.top = "48%";
    } else if (roll < probabilities.homeChance + probabilities.awayChance) {
      simState.away++;
      event = readableName(selected.match.team2) + " score in this generated simulation.";
      $("#fixture-sim-ball").style.left = "11%";
      $("#fixture-sim-ball").style.top = "48%";
    } else {
      const phrases = {
        press: "The high press forces a hurried clearance; no goal in this phase.",
        build: "The patient move finds a shooting lane, but the chance goes unfinished.",
        counter: "A quick break opens space at the other end, but the defence recovers."
      };
      event = phrases[tactic];
      $("#fixture-sim-ball").style.left = tactic === "counter" ? "70%" : "61%";
      $("#fixture-sim-ball").style.top = tactic === "press" ? "27%" : "68%";
    }
    simState.minute = Math.min(90, simState.minute + 10);
    homeScore.textContent = simState.home;
    awayScore.textContent = simState.away;
    minuteLabel.textContent = simState.minute + "′";
    commentary.textContent = event + " Score: " + simState.home + "–" + simState.away + ".";
    appendLog(simState.minute + "′ · " + event);
    if (simState.minute >= 90) {
      simState.done = true;
      actions.forEach(button => button.disabled = true);
      commentary.textContent += " Full time in the generated run; this is not the recorded match result.";
      appendLog("90′ · Full time in this generated simulation.");
    }
  }

  function showFixture(detail) {
    selected = detail;
    const match = detail.match;
    if (isVerifiedLiverpoolArsenalFixture(match)) {
      panel.classList.add("hidden");
      relevantSections.forEach(section => section.classList.remove("hidden"));
      $("#reset-button").click();
      return;
    }
    relevantSections.forEach(section => section.classList.add("hidden"));
    panel.classList.remove("hidden");
    homeName.textContent = readableName(match.team1);
    awayName.textContent = readableName(match.team2);
    $("#fixture-sim-title").textContent = readableName(match.team1) + " vs " + readableName(match.team2);
    const reference = detail.hasFinalScore
      ? "Recorded full-time result: " + match.score.ft[0] + "–" + match.score.ft[1] + ". This alternate generated run starts from 0–0; it does not replay or change that historical result."
      : detail.status === "upcoming" || detail.status === "today"
        ? "No final score is recorded for this fixture in the archive snapshot. This generated run starts from 0–0; it is not a forecast."
        : "No verified final score is present in the archive snapshot. This generated run starts from 0–0.";
    $("#fixture-sim-reference").textContent = reference;
    resetSimulation();
    window.setTimeout(() => panel.scrollIntoView({ behavior: "smooth", block: "start" }), 140);
  }

  document.addEventListener("fixture:selected", event => showFixture(event.detail));
  actions.forEach(button => button.addEventListener("click", () => simulatePhase(button.dataset.tactic)));
  $("#fixture-reset").addEventListener("click", resetSimulation);
  $("#reset-button").addEventListener("click", event => {
    if (!selected || isVerifiedLiverpoolArsenalFixture(selected.match)) return;
    event.stopImmediatePropagation();
    resetSimulation();
  }, true);
})();