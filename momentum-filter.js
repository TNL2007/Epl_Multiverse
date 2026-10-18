(() => {
  const teamEvents = [
    { minute: 4, label: "Arsenal goal · set piece", signal: -1.0 },
    { minute: 29, label: "Salah equaliser", signal: 0.9 },
    { minute: 72, label: "Trent hits the bar", signal: 0.85 }
  ];

  const transition = (dt) => [
    [1, dt, 0],
    [0, Math.exp(-dt / 12), 0],
    [0, 0, Math.exp(-dt / 20)]
  ];
  const transpose = (a) => a[0].map((_, c) => a.map(row => row[c]));
  const multiply = (a, b) => a.map(row => b[0].map((_, c) => row.reduce((sum, value, i) => sum + value * b[i][c], 0)));
  const add = (a, b) => a.map((row, i) => row.map((value, j) => value + b[i][j]));
  const subtract = (a, b) => a.map((row, i) => row.map((value, j) => value - b[i][j]));
  const identity = (n) => Array.from({length:n}, (_, i) => Array.from({length:n}, (_, j) => i === j ? 1 : 0));

  function runFilter() {
    const H = [[1, 0.25, 0.15]];
    const HT = transpose(H);
    const R = 0.55;
    let x = [[0], [0], [0]];
    let P = [[1,0,0],[0,0.7,0],[0,0,0.7]];
    let previousMinute = 0;
    const estimates = [];
    for (const event of teamEvents) {
      const dt = Math.max(0.1, event.minute - previousMinute);
      const F = transition(dt);
      const Q = [[0.018 * dt,0,0],[0,0.012 * dt,0],[0,0,0.01 * dt]];
      x = multiply(F, x);
      P = add(multiply(multiply(F, P), transpose(F)), Q);
      const innovation = event.signal - multiply(H, x)[0][0];
      const innovationVariance = multiply(multiply(H, P), HT)[0][0] + R;
      const K = multiply(P, HT).map(row => row.map(value => value / innovationVariance));
      x = add(x, K.map(row => row.map(value => value * innovation)));
      P = multiply(subtract(identity(3), multiply(K, H)), P);
      estimates.push({ ...event, value: x[0][0], uncertainty: Math.sqrt(Math.max(0, P[0][0])) });
      previousMinute = event.minute;
    }
    return estimates;
  }

  function render() {
    const panel = document.querySelector("#match-insights-panel");
    if (!panel || panel.classList.contains("hidden") || panel.querySelector("#kalman-momentum")) return;
    const estimates = runFilter();
    const card = document.createElement("section");
    card.className = "insight-card kalman-card";
    card.id = "kalman-momentum";
    const eyebrow = document.createElement("p");
    eyebrow.className = "eyebrow";
    eyebrow.textContent = "FEATURE 2 · KALMAN FILTER PROTOTYPE";
    const title = document.createElement("h2");
    title.textContent = "Momentum as a hidden state";
    const intro = document.createElement("p");
    intro.textContent = "A small state-space filter updates a latent Liverpool-pressure estimate from verified goal and major-chance observations. The line is the estimate; the shaded band reflects model uncertainty.";
    const chart = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    chart.setAttribute("viewBox", "0 0 640 190");
    chart.setAttribute("role", "img");
    chart.setAttribute("aria-label", "Kalman-filter estimate of Liverpool momentum after the three verified major events");
    const baseline = document.createElementNS(chart.namespaceURI, "line");
    baseline.setAttribute("x1","40"); baseline.setAttribute("x2","620"); baseline.setAttribute("y1","100"); baseline.setAttribute("y2","100"); baseline.setAttribute("class","kalman-zero");
    chart.append(baseline);
    const xFor = minute => 45 + (minute / 90) * 560;
    const yFor = value => 100 - Math.max(-1.5, Math.min(1.5, value)) * 48;
    const points = estimates.map(point => xFor(point.minute) + "," + yFor(point.value)).join(" ");
    const line = document.createElementNS(chart.namespaceURI, "polyline");
    line.setAttribute("points", points); line.setAttribute("class","kalman-line");
    chart.append(line);
    estimates.forEach(point => {
      const circle = document.createElementNS(chart.namespaceURI, "circle");
      circle.setAttribute("cx", String(xFor(point.minute)));
      circle.setAttribute("cy", String(yFor(point.value)));
      circle.setAttribute("r","5"); circle.setAttribute("class","kalman-point");
      const desc = document.createElementNS(chart.namespaceURI,"title");
      desc.textContent = point.minute + "’ · " + point.label + " · estimate " + point.value.toFixed(2);
      circle.append(desc); chart.append(circle);
    });
    const labels = document.createElement("div");
    labels.className = "kalman-labels";
    estimates.forEach(point => {
      const item = document.createElement("span");
      item.textContent = point.minute + "’ · " + point.label;
      labels.append(item);
    });
    const note = document.createElement("p");
    note.className = "source-note";
    const latest = estimates[estimates.length - 1];
    note.textContent = "At 72’, estimate " + latest.value.toFixed(2) + " ± " + latest.uncertainty.toFixed(2) + " (model units). This is an uncalibrated event-only prototype: it has no tracking, pressing-intensity or pitch-control feed, and is not a measured match statistic.";
    card.append(eyebrow, title, intro, chart, labels, note);
    panel.append(card);
  }

  const nav = document.querySelector(".match-tabs");
  if (nav) nav.addEventListener("click", event => {
    if (event.target.closest('[data-view="eye-test"]')) setTimeout(render, 0);
  });
})();
