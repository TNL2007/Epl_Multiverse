(() => {
  const $ = selector => document.querySelector(selector);
  const panel = $("#fixture-simulator");
  if (!panel) return;
  const title = $("#fixture-sim-title");
  const reference = $("#fixture-sim-reference");
  const momentPicker = $("#scenario-moment-picker");
  const workspace = $("#scenario-workspace");
  const empty = $("#scenario-empty");
  const reportLink = $("#scenario-report-link");
  const actionsBox = $("#fixture-sim-actions");
  const commentary = $("#fixture-sim-commentary");
  const log = $("#fixture-sim-log");
  const camera = $("#scenario-camera");
  const relevantSections = [$(".match-heading"), $(".scoreboard"), $(".season-context"), $(".game-grid"), $(".match-tabs"), $("#match-insights-panel")].filter(Boolean);
  let selected = null;
  let catalog = null;
  let activeMoment = null;

  const clean = value => (value || "").replace(/ (FC|AFC)$/, "");
  const keyFor = match => [match.date, match.team1, match.team2].join("|");

  fetch("data/report-scenarios.json")
    .then(response => { if (!response.ok) throw new Error("Scenario data unavailable"); return response.json(); })
    .then(data => { catalog = data; })
    .catch(() => { catalog = { matches: {} }; });

  function showFixture(detail) {
    selected = detail;
    activeMoment = null;
    relevantSections.forEach(section => section.classList.add("hidden"));
    panel.classList.remove("hidden");
    const match = detail.match;
    title.textContent = clean(match.team1) + " vs " + clean(match.team2);
    reference.textContent = (detail.hasFinalScore && match.score?.ft
      ? "Recorded result " + match.score.ft[0] + "–" + match.score.ft[1] + " · "
      : "") + "Choose a real moment documented in the match report, then choose what happens differently.";
    momentPicker.replaceChildren();
    workspace.classList.add("hidden");
    log.replaceChildren();
    empty.classList.add("hidden");
    reportLink.replaceChildren();
    renderWhenReady();
    panel.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function renderWhenReady() {
    if (!selected || !catalog) return;
    const match = selected.match;
    const record = catalog.matches[keyFor(match)];
    if (!record) {
      momentPicker.replaceChildren();
      workspace.classList.add("hidden");
      empty.textContent = "No Premier League report moments have been imported for this fixture yet. We’re keeping this match selectable, but won’t invent moments or players.";
      empty.classList.remove("hidden");
      return;
    }
    const sourceLinks = (record.sources || []).map(source => {
      const link = document.createElement("a");
      link.href = source.url; link.target = "_blank"; link.rel = "noreferrer";
      link.textContent = source.label;
      return link;
    });
    sourceLinks.forEach(link => reportLink.append(link));
    momentPicker.replaceChildren(...record.moments.map((moment, index) => {
      const button = document.createElement("button");
      button.type = "button"; button.className = "scenario-moment";
      button.innerHTML = '<span class="scenario-minute"></span><span class="scenario-moment-copy"><strong></strong><small></small></span><span class="scenario-chevron">→</span>';
      button.querySelector(".scenario-minute").textContent = moment.minute;
      button.querySelector("strong").textContent = moment.title;
      button.querySelector("small").textContent = moment.summary;
      button.addEventListener("click", () => selectMoment(record, moment, button));
      if (index === 0 && !activeMoment) queueMicrotask(() => selectMoment(record, moment, button));
      return button;
    }));
  }

  function selectMoment(record, moment, button) {
    activeMoment = moment;
    momentPicker.querySelectorAll(".scenario-moment").forEach(item => item.classList.toggle("active", item === button));
    workspace.classList.remove("hidden");
    empty.classList.add("hidden");
    log.replaceChildren();
    commentary.textContent = moment.minute + " · " + moment.summary;
    const source = record.sources?.[moment.source];
    const sourceText = document.createElement("span");
    sourceText.textContent = "Source: " + (source?.label || "Premier League report");
    const momentSource = document.createElement("a");
    momentSource.href = source?.url || "#"; momentSource.target = "_blank"; momentSource.rel = "noreferrer";
    momentSource.textContent = "Read report";
    log.replaceChildren(sourceText, momentSource);
    renderPlayers(record, moment);
    actionsBox.replaceChildren(...moment.actions.map(action => {
      const actionButton = document.createElement("button");
      actionButton.type = "button";
      actionButton.dataset.action = action.type;
      actionButton.innerHTML = '<span class="action-symbol"></span><span class="action-label"></span><small></small>';
      actionButton.querySelector(".action-symbol").textContent = iconFor(action.type);
      actionButton.querySelector(".action-label").textContent = action.label;
      actionButton.querySelector("small").textContent = action.detail;
      actionButton.addEventListener("click", () => chooseAction(record, moment, action, actionButton));
      return actionButton;
    }));
  }

  function iconFor(type) {
    return ({ cross:"↗", pass:"➜", shoot:"◎", dribble:"↗", recycle:"↶", wide:"⇄", central:"↓" })[type] || "➜";
  }

  function renderPlayers(record, moment) {
    const names = new Set(moment.players || []);
    const participants = (record.players || []).filter(player => names.has(player.name));
    const stage = $("#camera-action");
    stage.replaceChildren(...participants.map((player, index) => {
      const node = document.createElement("span");
      node.className = "camera-player " + (player.team === "Liverpool" ? "home" : "away");
      node.style.setProperty("--player-index", index);
      node.innerHTML = '<b class="shirt-number"></b><span class="player-caption"><strong></strong><small></small></span>';
      node.querySelector(".shirt-number").textContent = String(player.number);
      node.querySelector(".player-caption strong").textContent = player.name;
      node.querySelector(".player-caption small").textContent = player.team + " · #" + player.number;
      return node;
    }));
    $("#camera-ball").className = "camera-ball";
  }

  function chooseAction(record, moment, action, button) {
    actionsBox.querySelectorAll("button").forEach(item => item.classList.toggle("selected", item === button));
    commentary.textContent = action.outcome;
    log.querySelectorAll(".scenario-outcome").forEach(node => node.remove());
    const result = document.createElement("p");
    result.className = "scenario-outcome";
    result.textContent = "Alternate timeline · " + action.label + ". This is a simulated branch from the report’s real moment.";
    log.append(result);
    const ball = $("#camera-ball");
    ball.className = "camera-ball in-flight action-" + action.type;
    camera.classList.remove("action-flash");
    requestAnimationFrame(() => camera.classList.add("action-flash"));
    const players = [...$("#camera-action").querySelectorAll(".camera-player")];
    players.forEach((player, index) => {
      const phase = (index + 1) / Math.max(players.length, 1);
      player.style.setProperty("--move-x", (action.type === "shoot" ? 18 : action.type === "cross" ? 28 : action.type === "dribble" ? 12 : 20) * phase + "px");
      player.style.setProperty("--move-y", (index % 2 ? -12 : 10) + "px");
      player.classList.add("moving");
    });
  }

  document.addEventListener("fixture:selected", event => {
    const detail = event.detail;
    const waitForData = () => catalog ? showFixture(detail) : window.setTimeout(waitForData, 100);
    waitForData();
  });

  $("#fixture-reset")?.addEventListener("click", () => {
    if (!selected) return;
    activeMoment = null;
    workspace.classList.add("hidden");
    log.replaceChildren();
    momentPicker.querySelectorAll(".scenario-moment").forEach(item => item.classList.remove("active"));
    renderWhenReady();
    panel.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  $("#reset-button")?.addEventListener("click", event => {
    if (!selected) return;
    event.stopImmediatePropagation();
    selected = null;
    panel.classList.add("hidden");
    relevantSections.forEach(section => section.classList.remove("hidden"));
  }, true);
})();