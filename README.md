# EPL Multiverse

A browser-based football match simulator with a searchable Premier League archive and counterfactual match prototype.

## Play

**[Open EPL Multiverse](https://tnl2007.github.io/Epl_Multiverse/)**

The site is published with GitHub Pages. To run it locally, serve the repository folder so its bundled JSON files can load:

```sh
python -m http.server 8000
```

Then visit [http://localhost:8000](http://localhost:8000).

## Match archive

Browse 1,900 Premier League fixtures across 2022/23–2026/27, search by team or matchday, and filter completed results, upcoming fixtures, or fixtures without a score in the bundled snapshot.

The archive snapshot was assembled on 18 October 2026. It contains 1,538 full-time scores. The 2022/23–2025/26 seasons have full season results in the source snapshot; the in-progress 2026/27 season contains the results currently available from that source and scheduled fixtures. A fixture with no score is not presented as a completed result. The latest season is a bundled snapshot, not a live feed; refreshes will follow as reliable data becomes available.

Historical fixture/result data: [openfootball/football.json](https://github.com/openfootball/football.json). Its dataset is dedicated to the public domain under [CC0 1.0](https://github.com/openfootball/football.json/blob/master/LICENSE.md). Each bundled season file links to its upstream source.

## Counterfactual match prototype

The featured Liverpool–Arsenal scenario demonstrates the decision → outcome → commentary loop. Its alternate events are simulated. The bundled archive contains fixtures and scores—not player tracking or minute-by-minute event timelines—so it cannot verify details such as a specific penalty, save, or chance. Broader factual event replays need an appropriate event-data source and usage rights.

Win probabilities and season-ripple figures are illustrative prototype estimates, not betting or forecasting advice.
