# EPL Multiverse

A playable, browser-based alternate-timeline football match prototype. Replay Liverpool 1–1 Arsenal at Anfield (23 December 2023), make a decision at a key moment, and follow a simulated branch with event-based commentary and match/season context.

## Play

**[Open EPL Multiverse](https://tnl2007.github.io/Epl_Multiverse/)**

If the link is not live yet, enable GitHub Pages once: open **Settings → Pages**, set **Build and deployment → Source** to **GitHub Actions**, then push to `main` or run **Publish EPL Multiverse** under the repository’s Actions tab. The workflow publishes the static site automatically.

To run it locally, serve the repository folder (the game fetches its bundled JSON data, so opening the HTML file directly may not work):

```sh
python -m http.server 8000
```

Then visit [http://localhost:8000](http://localhost:8000).

## What is in this prototype

- A playable decision-and-rewind loop with alternate match timelines.
- Event-driven text commentary and optional speech using a voice available in your browser.
- A tactical pitch view, match momentum, and illustrative win-probability/ripple indicators.
- Historical 2023/24 Premier League results bundled locally in `data/epl-2023-24-results.json`. The game derives season scoring rates and the final table from those match results.

The match is a simulation, not a live-data product or a licensed 3D football game. The included public dataset contains historical match results and scores, not player tracking or ball-by-ball events. Specific in-match actions and alternate outcomes are illustrative. Probability and season-ripple figures are prototype estimates, not betting or forecasting advice.

## Data and attribution

Historical results: [openfootball/football.json — 2023/24 English Premier League](https://github.com/openfootball/football.json/blob/master/2023-24/en.1.json). The source project dedicates its data to the public domain under [CC0 1.0](https://github.com/openfootball/football.json/blob/master/LICENSE.md). This project includes a compact, derived copy of the season’s match results in `data/epl-2023-24-results.json`.

## Deployment

GitHub Actions publishes the static site to GitHub Pages on pushes to `main`. If Pages is not configured for this repository yet, choose **GitHub Actions** as the Pages build source in repository Settings → Pages. The expected site address is [tnl2007.github.io/Epl_Multiverse](https://tnl2007.github.io/Epl_Multiverse/).
