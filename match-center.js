(() => {
  const app = document.querySelector(".app-shell");
  const game = document.querySelector(".game-grid");
  const archive = document.querySelector("#match-archive");
  const pitch = document.querySelector("#pitch");
  if (!app || !game || !archive || !pitch) return;

  const teams = {
    liverpool: {
      name: "Liverpool", formation: "4–3–3", className: "red",
      starters: [
        [1, "Alisson Becker", "GK", 5, 50], [66, "Trent Alexander-Arnold", "RB", 26, 17],
        [5, "Ibrahima Konaté", "CB", 19, 39], [4, "Virgil van Dijk", "CB", 19, 61],
        [21, "Kostas Tsimikas", "LB", 26, 83], [3, "Wataru Endo", "DM", 39, 50],
        [8, "Dominik Szoboszlai", "CM", 49, 31], [17, "Curtis Jones", "CM", 49, 69],
        [11, "Mohamed Salah", "RW", 69, 25], [18, "Cody Gakpo", "CF", 68, 50],
        [7, "Luis Díaz", "LW", 59, 77]
      ],
      bench: [[62,"Caoimhín Kelleher"],[2,"Joe Gomez"],[9,"Darwin Núñez"],[19,"Harvey Elliott"],[38,"Ryan Gravenberch"],[42,"Bobby Clark"],[53,"James McConnell"],[78,"Jarell Quansah"],[84,"Conor Bradley"]]
    },
    arsenal: {
      name: "Arsenal", formation: "4–3–3", className: "white",
      starters: [
        [22, "David Raya", "GK", 95, 50], [4, "Ben White", "RB", 77, 17],
        [2, "William Saliba", "CB", 82, 38], [6, "Gabriel Magalhães", "CB", 82, 62],
        [35, "Oleksandr Zinchenko", "LB", 77, 83], [41, "Declan Rice", "DM", 67, 50],
        [8, "Martin Ødegaard", "CM", 59, 35], [29, "Kai Havertz", "CM", 59, 66],
        [7, "Bukayo Saka", "RW", 47, 22], [9, "Gabriel Jesus", "CF", 47, 50],
        [11, "Gabriel Martinelli", "LW", 47, 78]
      ],
      bench: [[1,"Aaron Ramsdale"],[17,"Cédric Soares"],[15,"Jakub Kiwior"],[20,"Jorginho"],[25,"Mohamed Elneny"],[10,"Emile Smith Rowe"],[24,"Reiss Nelson"],[19,"Leandro Trossard"],[14,"Eddie Nketiah"]]
    }
  };

  const photos = {
    "Mohamed Salah": ["https://commons.wikimedia.org/wiki/Special:FilePath/Mo_Salah.jpg?width=320", "https://commons.wikimedia.org/wiki/File:Mo_Salah.jpg", "Eric The Fish · CC BY 2.0"],
    "Darwin Núñez": ["https://commons.wikimedia.org/wiki/Special:FilePath/Darwin_N%C3%BA%C3%B1ez_(cropped).jpg?width=320", "https://commons.wikimedia.org/wiki/File:Darwin_N%C3%BA%C3%B1ez_(cropped).jpg", "Steffen Prößdorf · CC BY-SA 4.0"],
    "Virgil van Dijk": ["https://commons.wikimedia.org/wiki/Special:FilePath/Virgil_van_Dijk_2019.jpg?width=320", "https://commons.wikimedia.org/wiki/File:Virgil_van_Dijk_2019.jpg", "Fleets · CC BY-SA 2.0"],
    "Trent Alexander-Arnold": ["https://commons.wikimedia.org/wiki/Special:FilePath/Trent_Alexander-Arnold_2018_(cropped).jpg?width=320", "https://commons.wikimedia.org/wiki/File:Trent_Alexander-Arnold_2018_(cropped).jpg", "Anton Zaitsev · via soccer.ru · CC BY-SA 3.0"],
    "Bukayo Saka": ["https://commons.wikimedia.org/wiki/Special:FilePath/RC_Lens_-_Arsenal_FC_(03-10-2023)_16_(cropped).jpg?width=320", "https://commons.wikimedia.org/wiki/File:RC_Lens_-_Arsenal_FC_(03-10-2023)_16_(cropped).jpg", "Supporterhéninois · CC0"],
    "William Saliba": ["https://commons.wikimedia.org/wiki/Special:FilePath/1_william_saliba_arsenal_2025_(cropped).jpg?width=320", "https://commons.wikimedia.org/wiki/File:1_william_saliba_arsenal_2025_(cropped).jpg", "Chensiyuan · CC BY-SA 4.0"],
    "David Raya": ["https://commons.wikimedia.org/wiki/Special:FilePath/David_Raya,_Brentford_F.C._footballer,_July_2021.jpg?width=320", "https://commons.wikimedia.org/wiki/File:David_Raya,_Brentford_F.C._footballer,_July_2021.jpg", "Ardfern · CC BY-SA 4.0"]
  };

  const startersAt68 = {
    liverpool: teams.liverpool.starters.filter(player => !["Cody Gakpo", "Luis Díaz", "Curtis Jones", "Kostas Tsimikas"].includes(player[1]))
      .concat([[2, "Joe Gomez", "LB", 26, 83], [9, "Darwin Núñez", "CF", 80, 49], [19, "Harvey Elliott", "CM", 58, 69], [38, "Ryan Gravenberch", "CM", 55, 31]]),
    arsenal: teams.arsenal.starters
  };
  const events = [
    { minute: "04’", tag: "ARSENAL GOAL", title: "Gabriel heads Arsenal in front", text: "Martin Ødegaard’s free-kick finds Gabriel, who directs a header into the net. Arsenal strike early from a set piece.", side: "ARSENAL" },
    { minute: "29’", tag: "LIVERPOOL GOAL", title: "Salah levels it", text: "Trent Alexander-Arnold’s long pass releases Salah on the right. Salah beats Zinchenko and finishes. Liverpool 1–1 Arsenal.", side: "LIVERPOOL" },
    { minute: "35’", tag: "SUBSTITUTION", title: "Gomez replaces the injured Tsimikas", text: "Joe Gomez comes on at left-back after Kostas Tsimikas is forced off.", side: "LIVERPOOL" },
    { minute: "67’", tag: "THREE CHANGES", title: "Núñez, Elliott and Gravenberch enter", text: "Darwin Núñez replaces Cody Gakpo; Harvey Elliott replaces Luis Díaz; Ryan Gravenberch replaces Curtis Jones.", side: "LIVERPOOL" },
    { minute: "72’", tag: "WOODWORK", title: "Alexander-Arnold hits the bar", text: "Liverpool break after an Arsenal corner. Salah squares for Alexander-Arnold, whose 12-yard strike crashes against the crossbar.", side: "LIVERPOOL" },
    { minute: "FULL TIME", tag: "1–1", title: "Points shared at Anfield", text: "Liverpool have the stronger second-half chances, but Arsenal hold on for a point.", side: "MATCH" }
  ];

  const nav = document.createElement("nav");
  nav.className = "match-tabs";
  nav.setAttribute("aria-label", "Match sections");
  const matchPanel = game;
  matchPanel.id = "match-view-panel";
  const insightPanel = document.createElement("section");
  insightPanel.className = "match-insights hidden";
  insightPanel.id = "match-insights-panel";
  insightPanel.setAttribute("aria-live", "polite");
  const tabs = [
    ["match", "Match view"], ["highlights", "Highlights"], ["lineups", "Lineups"], ["ratings", "Ratings"], ["eye-test", "Eye Test"]
  ];
  for (const [id, label] of tabs) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "match-tab" + (id === "match" ? " active" : "");
    button.dataset.view = id;
    button.setAttribute("aria-pressed", String(id === "match"));
    button.textContent = label;
    nav.append(button);
  }
  game.before(nav);
  game.after(insightPanel);

  const currentPlayers = { ...startersAt68 };
  function playerNode(player, teamKey, dynamic = false) {
    const [number, name, role, x, y] = player;
    const node = document.createElement("div");
    node.className = "player " + teams[teamKey].className + " match-player" + (dynamic ? " is-dynamic" : "");
    node.dataset.name = name;
    node.dataset.team = teamKey;
    node.dataset.x = x;
    node.dataset.y = y;
    node.style.left = x + "%";
    node.style.top = y + "%";
    node.setAttribute("role", "img");
    node.setAttribute("aria-label", number + " · " + name + " · " + teams[teamKey].name + " · " + role);
    node.tabIndex = 0;
    node.title = number + " · " + name + " (" + role + ")";
    const shirt = document.createElement("span");
    shirt.textContent = number;
    const label = document.createElement("small");
    label.textContent = name.split(" ").slice(-1)[0].toUpperCase();
    node.append(shirt, label);
    return node;
  }
  function installPitchPlayers() {
    pitch.querySelectorAll(".player").forEach(node => node.remove());
    for (const teamKey of ["liverpool", "arsenal"]) {
      currentPlayers[teamKey].forEach(player => pitch.append(playerNode(player, teamKey, true)));
    }
    const context = document.createElement("div");
    context.className = "play-context";
    context.innerHTML = '<span class="play-context-label">REAL MOMENT · 72’</span><div class="play-participants" id="play-participants"></div>';
    pitch.after(context);
    const disclaimer = document.createElement("span");
    disclaimer.className = "pitch-simulation-note";
    disclaimer.textContent = "REAL 72’ event · player positions are illustrative, not tracking data";
    pitch.append(disclaimer);
    document.querySelector(".legend-hint").textContent = "REAL 72’ PERSONNEL · ILLUSTRATIVE POSITIONS";
    drawParticipants(["Mohamed Salah", "Trent Alexander-Arnold"]);
  }
  function photoCard(name, detail) {
    const card = document.createElement("span");
    card.className = "play-person";
    const source = photos[name];
    if (source) {
      const image = document.createElement("img");
      image.src = source[0];
      image.alt = "Photo of " + name;
      image.loading = "lazy";
      image.referrerPolicy = "no-referrer";
      image.onerror = () => { image.remove(); card.classList.add("photo-fallback"); card.insertBefore(document.createTextNode(name.split(" ").map(word => word[0]).join("")), card.firstChild); };
      card.append(image);
    } else {
      card.classList.add("photo-fallback");
      const initials = document.createElement("b"); initials.textContent = name.split(" ").map(word => word[0]).join(""); card.append(initials);
    }
    const label = document.createElement("span");
    label.innerHTML = "<strong></strong><small></small>";
    label.querySelector("strong").textContent = name;
    label.querySelector("small").textContent = detail;
    card.append(label);
    if (source) {
      const credit = document.createElement("a");
      credit.className = "photo-credit";
      credit.href = source[1];
      credit.target = "_blank";
      credit.rel = "noreferrer";
      credit.textContent = source[2];
      label.append(credit);
    }
    return card;
  }
  function drawParticipants(names) {
    const strip = document.querySelector("#play-participants");
    if (!strip) return;
    strip.replaceChildren();
    const details = { "Mohamed Salah": "#11 · on the ball", "Darwin Núñez": "#9 · runner", "Trent Alexander-Arnold": "#66 · delivery", "Bukayo Saka": "#7 · carrier", "William Saliba": "#2 · covering", "David Raya": "#22 · goalkeeper", "Gabriel Magalhães": "#6 · defender", "Luis Díaz": "#7 · left option", "Dominik Szoboszlai": "#8 · support" };
    names.forEach(name => strip.append(photoCard(name, details[name] || "involved in this phase")));
  }

  function panelCard(title, eyebrow, body) {
    const section = document.createElement("section");
    section.className = "insight-card";
    section.innerHTML = '<p class="eyebrow"></p><h2></h2>';
    section.querySelector(".eyebrow").textContent = eyebrow;
    section.querySelector("h2").textContent = title;
    if (body) { const p = document.createElement("p"); p.textContent = body; section.append(p); }
    return section;
  }

  function playVerifiedCounter() {
    const label = document.querySelector(".play-context-label");
    const note = document.querySelector(".pitch-simulation-note");
    if (label) label.textContent = "REAL HIGHLIGHT · 72’ · POSITIONS ILLUSTRATIVE";
    if (note) note.textContent = "REAL EVENT · exact player tracking is unavailable";
    drawParticipants(["Mohamed Salah", "Trent Alexander-Arnold"]);
    const move = (name, x, y) => movePlayer(name, x, y);
    // Reenact the sourced sequence, not exact tracking coordinates:
    // Arsenal corner -> Liverpool counter -> Salah squares -> Trent hits the bar.
    setBall(7, 18);
    setTimeout(() => {
      setBall(34, 39);
      move("Mohamed Salah", 34, 39);
      move("Trent Alexander-Arnold", 42, 47);
      move("Dominik Szoboszlai", 40, 30);
      move("Darwin Núñez", 48, 43);
      move("Harvey Elliott", 43, 66);
      move("Ryan Gravenberch", 38, 55);
      move("Declan Rice", 56, 47);
      move("Ben White", 65, 38);
      move("William Saliba", 72, 48);
      move("David Raya", 94, 50);
    }, 180);
    setTimeout(() => {
      setBall(75, 43);
      move("Mohamed Salah", 73, 42);
      move("Trent Alexander-Arnold", 83, 45);
      move("Dominik Szoboszlai", 69, 31);
      move("Darwin Núñez", 78, 39);
      move("Harvey Elliott", 71, 59);
      move("Ryan Gravenberch", 67, 52);
      move("Declan Rice", 79, 47);
      move("Ben White", 85, 38);
      move("William Saliba", 88, 51);
    }, 900);
    setTimeout(() => {
      setBall(96, 25);
      move("Trent Alexander-Arnold", 93, 43);
      move("David Raya", 96, 50);
    }, 1650);
  }

  function renderHighlights() {
    insightPanel.replaceChildren();
    const intro = panelCard("The real match, in six moments", "VERIFIED MATCH HIGHLIGHTS", "Liverpool 1–1 Arsenal · Anfield · 23 December 2023. These events are from the real match; the playable branch remains simulated.");
    const list = document.createElement("ol"); list.className = "highlight-list";
    events.forEach((event, index) => {
      const item = document.createElement("li");
      item.className = "highlight-item";
      const time = document.createElement("time"); time.textContent = event.minute;
      const copy = document.createElement("div"); copy.innerHTML = '<span class="highlight-tag"></span><h3></h3><p></p>';
      copy.querySelector(".highlight-tag").textContent = event.tag;
      copy.querySelector("h3").textContent = event.title;
      copy.querySelector("p").textContent = event.text;
      const button = document.createElement("button"); button.type = "button"; button.className = "moment-play"; button.textContent = "Show moment";
      button.addEventListener("click", () => {
        nav.querySelector('[data-view="match"]').click();
        const targets = index === 1 || index === 4 ? ["Trent Alexander-Arnold", "Mohamed Salah"] : index === 3 ? ["Darwin Núñez", "Mohamed Salah"] : ["Gabriel Magalhães", "David Raya"];
        if (index === 4) playVerifiedCounter();
        else drawParticipants(targets);
        pitch.scrollIntoView({ behavior: "smooth", block: "center" });
      });
      item.append(time, copy, button); list.append(item);
    });
    intro.append(list);
    const source = document.createElement("p"); source.className = "source-note";
    source.innerHTML = 'Match chronology checked against <a href="https://www.liverpoolfc.com/news/mohamed-salah-strikes-anfield-draw-arsenal" target="_blank" rel="noreferrer">Liverpool FC’s match report</a> and official team sheets from <a href="https://www.liverpoolfc.com/news/confirmed-liverpool-line-v-arsenal-5?amp=1" target="_blank" rel="noreferrer">Liverpool</a> and <a href="https://www.arsenal.com/news/team-news-arteta-sticks-same-lineup" target="_blank" rel="noreferrer">Arsenal</a>.';
    intro.append(source); insightPanel.append(intro);
  }

  function renderLineups() {
    insightPanel.replaceChildren();
    const card = panelCard("The teams at Anfield", "CONFIRMED STARTING XIs", "Starting lineups and shirt numbers from the matchday team sheets. Darwin Núñez, Harvey Elliott and Ryan Gravenberch were substitutes; all three entered in the 67th minute.");
    const columns = document.createElement("div"); columns.className = "lineup-columns";
    for (const teamKey of ["liverpool", "arsenal"]) {
      const team = teams[teamKey];
      const column = document.createElement("section"); column.className = "lineup-team " + teamKey;
      const heading = document.createElement("h3"); heading.textContent = team.name + " · " + team.formation;
      const list = document.createElement("ol"); list.className = "lineup-list";
      team.starters.forEach(player => {
        const row = document.createElement("li");
        const number = document.createElement("b"); number.textContent = player[0];
        const name = document.createElement("span"); name.textContent = player[1];
        const role = document.createElement("small"); role.textContent = player[2];
        row.append(number, name, role); list.append(row);
      });
      const bench = document.createElement("p"); bench.className = "bench-list";
      bench.innerHTML = "<strong>Bench</strong><br>" + team.bench.map(([number, name]) => number + " " + name).join(" · ");
      column.append(heading, list, bench); columns.append(column);
    }
    card.append(columns);
    const credits = document.createElement("p"); credits.className = "source-note";
    credits.innerHTML = 'Player portraits are open-licensed Wikimedia Commons photos, shown only for players involved in the animated phase. <a href="https://commons.wikimedia.org/wiki/Category:Liverpool_F.C._players" target="_blank" rel="noreferrer">Photo credits and licenses</a>.';
    card.append(credits); insightPanel.append(card);
  }

  function renderRatings() {
    insightPanel.replaceChildren();
    const card = panelCard("Your ratings, your call", "FAN RATINGS · NOT A PROPRIETARY ALGORITHM", "The open archive has no per-player event feed for this match. Rate each starter yourself; your scores stay in this browser. We won’t invent official ratings from a result-only dataset.");
    const columns = document.createElement("div"); columns.className = "rating-columns";
    for (const teamKey of ["liverpool", "arsenal"]) {
      const list = document.createElement("section"); list.className = "rating-team";
      const heading = document.createElement("h3"); heading.textContent = teams[teamKey].name;
      list.append(heading);
      teams[teamKey].starters.forEach(player => {
        const row = document.createElement("label"); row.className = "rating-row";
        const name = document.createElement("span"); name.innerHTML = "<b></b><small></small>";
        name.querySelector("b").textContent = player[1]; name.querySelector("small").textContent = "#" + player[0];
        const select = document.createElement("select"); select.setAttribute("aria-label", "Your rating for " + player[1]);
        const empty = document.createElement("option"); empty.value = ""; empty.textContent = "—"; select.append(empty);
        for (let n=1;n<=10;n++) { const option = document.createElement("option"); option.value = String(n); option.textContent = n + "/10"; select.append(option); }
        const key = "eplmultiverse-rating-20231223-" + player[0] + "-" + player[1].replace(/[^a-z0-9]/gi, "").toLowerCase();
        select.value = localStorage.getItem(key) || "";
        select.addEventListener("change", () => { if (select.value) localStorage.setItem(key, select.value); else localStorage.removeItem(key); });
        row.append(name, select); list.append(row);
      });
      columns.append(list);
    }
    card.append(columns);
    const evidence = document.createElement("p"); evidence.className = "rating-evidence";
    evidence.innerHTML = '<strong>Known reference:</strong> Liverpool’s post-match fan poll named Mohamed Salah its Player of the Match. That is a fan vote, not a numeric rating. <a href="https://www.liverpoolfc.com/news/who-was-liverpools-player-match-v-arsenal" target="_blank" rel="noreferrer">See the poll result</a>.';
    card.append(evidence); insightPanel.append(card);
    const methods = panelCard("What the popular ratings do—and don’t tell us", "ALGORITHM CHECK", "Both products turn event data into a fast summary, but their exact weights are not public enough for us to reproduce or audit.");
    const methodList = document.createElement("ul"); methodList.className = "method-list";
    methodList.replaceChildren(...methodListItems([
      "FotMob says its player score uses 300+ data points and a bespoke algorithm; its live match stats are powered by Opta. It does not publish the full rating formula.",
      "Sofascore says ratings start at 6.5 and event categories can move them up or down (for example goals, chances, saves, cards and errors). The category weights are not published.",
      "A sensible limitation of both event-led approaches: what is not recorded as an event—cover shadows, decoy runs, disciplined positioning—can be undervalued. Ratings also compress role and context into one number."
    ]));
    methods.append(methodList);
    const links = document.createElement("p"); links.className = "source-note";
    links.innerHTML = '<a href="https://www.fotmob.com/topnews/27924-fotmob-joins-soccer-aid-for-unicefas-official-live-score-partner" target="_blank" rel="noreferrer">FotMob on its ratings and Opta data</a> · <a href="https://corporate.sofascore.com/about/rating" target="_blank" rel="noreferrer">Sofascore Rating methodology overview</a> · <a href="https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0269604" target="_blank" rel="noreferrer">Research on how football momentum is operationalised</a>.';
    methods.append(links); insightPanel.append(methods);
  }

  function methodListItems(items) {
    return items.map(text => { const li = document.createElement("li"); li.textContent = text; return li; });
  }

  function renderEyeTest() {
    insightPanel.replaceChildren();
    const card = panelCard("A fan’s eye test", "EVIDENCE FIRST · NOT AN ‘OBJECTIVE’ SCORE", "No algorithm gets the final word here. Start with what happened, then keep the counterpoint in view.");
    const notes = [
      ["What I saw", "Arsenal’s early set-piece goal put Liverpool on the back foot. Liverpool grew into it, equalised through Salah, and created the clearest late opening when Alexander-Arnold hit the bar."],
      ["Why it felt like Liverpool were pushing", "The 72nd-minute counter and the pressure around it gave Anfield the sense that a winner was there. That feeling is real; ‘momentum’ is still an interpretation, not a directly measured force."],
      ["The other side", "Arsenal threatened early, scored first, and defended the late spell well enough to leave with a point. A Liverpool-favouring read should not erase those parts of the match."],
      ["What a score misses", "Positioning that prevents a pass, covering runs, decoy movement and pressure can matter without becoming a tackle, shot or assist. A single match rating cannot fully capture those contributions."]
    ];
    const grid = document.createElement("div"); grid.className = "eye-test-grid";
    notes.forEach(([title, body]) => { const note = document.createElement("article"); note.innerHTML = "<h3></h3><p></p>"; note.querySelector("h3").textContent = title; note.querySelector("p").textContent = body; grid.append(note); });
    card.append(grid);
    const explain = document.createElement("p"); explain.className = "source-note";
    explain.innerHTML = 'Our “momentum” label is descriptive, not proof of a psychological force. Research on football momentum uses specific operational definitions, and evidence does not support treating every pressure spell as a measurable streak. <a href="https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0269604" target="_blank" rel="noreferrer">Read the open-access study</a>.';
    card.append(explain); insightPanel.append(card);
  }

  function setView(view) {
    const match = view === "match";
    matchPanel.classList.toggle("hidden", !match);
    insightPanel.classList.toggle("hidden", match);
    nav.querySelectorAll(".match-tab").forEach(button => {
      const active = button.dataset.view === view;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    if (!match) {
      if (view === "highlights") renderHighlights();
      if (view === "lineups") renderLineups();
      if (view === "ratings") renderRatings();
      if (view === "eye-test") renderEyeTest();
    }
  }
  nav.addEventListener("click", event => {
    const button = event.target.closest(".match-tab");
    if (button) setView(button.dataset.view);
  });

  function setBall(x, y) {
    const ball = document.querySelector("#ball");
    ball.style.left = x + "%"; ball.style.top = y + "%";
    ball.classList.remove("ball-in-flight");
    requestAnimationFrame(() => ball.classList.add("ball-in-flight"));
  }
  function movePlayer(name, x, y) {
    const node = [...pitch.querySelectorAll(".match-player")].find(player => player.dataset.name === name);
    if (!node) return;
    node.style.left = x + "%"; node.style.top = y + "%";
    node.classList.add("involved");
    setTimeout(() => node.classList.remove("involved"), 1300);
  }
  let phase = 0;
  const scenes = [
    { through: ["Trent Alexander-Arnold", 88, 44, ["Mohamed Salah","Trent Alexander-Arnold"]], shoot: ["David Raya", 95, 50, ["Mohamed Salah","David Raya"]], switch: ["Luis Díaz", 58, 77, ["Mohamed Salah","Luis Díaz"]] },
    { cross: ["Virgil van Dijk", 92, 46, ["Trent Alexander-Arnold","Virgil van Dijk","David Raya"]], short: ["Dominik Szoboszlai", 53, 40, ["Trent Alexander-Arnold","Dominik Szoboszlai"]], recycle: ["Wataru Endo", 42, 53, ["Trent Alexander-Arnold","Wataru Endo"]] },
    { press: ["Bukayo Saka", 54, 21, ["Bukayo Saka","Virgil van Dijk"]], cover: ["Bukayo Saka", 54, 21, ["Bukayo Saka","Virgil van Dijk"]], foul: ["Bukayo Saka", 54, 21, ["Bukayo Saka","Virgil van Dijk"]] }
  ];
  function animateChoice(choice) {
    const scene = scenes[Math.min(phase, 2)][choice];
    if (!scene) return;
    const [receiver, x, y, participants] = scene;
    const ball = document.querySelector("#ball");
    ball.classList.add("ball-in-flight");
    setBall(x, y);
    movePlayer(receiver, x, y);
    if (phase === 0) {
      if (choice === "through-ball") {
        movePlayer("Mohamed Salah", 72, 43);
        movePlayer("Trent Alexander-Arnold", 84, 45);
        movePlayer("Darwin Núñez", 78, 39);
        movePlayer("Dominik Szoboszlai", 69, 31);
        movePlayer("Harvey Elliott", 71, 59);
        movePlayer("Ryan Gravenberch", 67, 52);
        movePlayer("Declan Rice", 79, 47);
        movePlayer("Ben White", 85, 38);
        movePlayer("William Saliba", 88, 51);
        movePlayer("David Raya", 96, 50);
      } else {
        movePlayer("Mohamed Salah", 75, 44);
        movePlayer("Trent Alexander-Arnold", 72, 40);
        movePlayer("Darwin Núñez", 81, 37);
        movePlayer("Dominik Szoboszlai", 67, 30);
        movePlayer("Declan Rice", 77, 47);
        movePlayer("William Saliba", 88, 50);
      }
    }
    drawParticipants(participants);
    pitch.querySelectorAll(".match-player").forEach(player => player.classList.toggle("involved", participants.includes(player.dataset.name)));
    document.querySelector(".play-context-label").textContent = phase === 0 && choice === "through-ball" ? "REAL EVENT · 72’ · POSITIONS ILLUSTRATIVE" : "COUNTERFACTUAL FORK · " + ["72:00", "75:02", "82:31"][phase];
  }
  game.addEventListener("click", event => {
    const choice = event.target.closest(".choice");
    if (choice) animateChoice(choice.dataset.choice);
    if (event.target.closest("#continue-button")) {
      if (phase < 2) phase++;
      document.querySelector(".play-context-label").textContent = "COUNTERFACTUAL FORK · " + ["72:00", "75:02", "82:31"][phase];
    }
    if (event.target.closest("#rewind-button, #reset-button")) {
      phase = 0; setBall(69, 25); drawParticipants(["Mohamed Salah", "Trent Alexander-Arnold"]);
      pitch.querySelectorAll(".match-player").forEach(player => player.classList.toggle("involved", ["Mohamed Salah", "Trent Alexander-Arnold"].includes(player.dataset.name)));
      document.querySelector(".play-context-label").textContent = "REAL MOMENT · 72’";
    }
  }, true);

  installPitchPlayers();
  const commentary = document.querySelector("#commentary-feed");
  commentary.innerHTML = '<article class="commentary-entry"><time>REAL</time><p>Liverpool are level at 1–1. At 72’, their counter from an Arsenal corner ends with Trent Alexander-Arnold hitting the crossbar.</p></article><article class="commentary-entry featured"><time>72:00</time><p><strong>Real match moment.</strong> Replay Salah’s pass to Trent, or explore a clearly labelled counterfactual.</p></article>';
  document.querySelector(".commentary-footer").textContent = "SIMULATED COMMENTARY · HISTORICAL EVENTS IN HIGHLIGHTS";
  document.querySelector(".momentum-card .eyebrow").textContent = "SIMULATION METER";
  document.querySelector(".momentum-card h2").textContent = "Scenario pressure";
  document.querySelector("#momentum-note").textContent = "Illustrative starting value; later swings follow your choices, not a tracking feed.";
  const pressureNote = document.createElement("small");
  pressureNote.className = "metric-disclaimer";
  pressureNote.textContent = "Descriptive pressure meter · not live or historical Opta data";
  document.querySelector(".momentum-card").append(pressureNote);
  document.querySelector(".impact-card .info-icon").title = "Prototype Poisson estimate from season goal rates; not a calibrated live model.";
  document.querySelector(".impact-card #ripple-caption").textContent = "Illustrative season-rate estimate; the model does not use live xG, shots or event tracking.";
  const originalDecideNote = document.querySelector("#momentum-note");
  game.addEventListener("click", event => {
    if (event.target.closest(".choice")) setTimeout(() => { originalDecideNote.textContent = "Simulated pressure shift from your choice—not a measured match statistic."; }, 0);
  }, true);
})();

