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

The archive snapshot was assembled on 18 October 2026. It contains 1,538 full-time scores. The 2022/23–2024/25 seasons have full season results in this snapshot. The 2025/26 season has 353 scores recorded, and the in-progress 2026/27 season has 45; the remaining entries have no score in the source snapshot. A fixture with no score is not presented as a completed result. The latest season is a bundled snapshot, not a live feed; refreshes will follow as reliable data becomes available.

Historical fixture/result data: [openfootball/football.json](https://github.com/openfootball/football.json). Its dataset is dedicated to the public domain under [CC0 1.0](https://github.com/openfootball/football.json/blob/master/LICENSE.md). Each bundled season file links to its upstream source.

## Counterfactual match prototype

The featured Liverpool–Arsenal scenario demonstrates the decision → outcome → commentary loop. Its alternate events are simulated. The bundled archive contains fixtures and scores—not player tracking or minute-by-minute event timelines—so it cannot verify details such as a specific penalty, save, or chance. Broader factual event replays need an appropriate event-data source and usage rights.

Win probabilities and season-ripple figures are illustrative prototype estimates, not betting or forecasting advice.

## Match-centre prototype

The Liverpool–Arsenal match centre now separates **verified match events** from the **simulated 68th-minute fork**. It includes the official starting XIs and shirt numbers, the 67th-minute substitutions, an animated illustrative pitch, sourced player portraits for participants, a real-event highlights timeline, and an Eye Test tab that presents a fan-style reading with a counterpoint.

The pitch positions and alternate commentary are simulated; they are not tracking data or a historical play-by-play. The pressure meter and score probabilities are prototype estimates. The Ratings tab lets a fan enter personal ratings locally; it does not fabricate per-player statistical ratings because the bundled results archive has no event feed. A single score can miss off-ball work, role context and positioning. FotMob and Sofascore publish broad descriptions of their rating inputs, but not enough of their exact weighting to reproduce them faithfully. The Eye Test is an evidence-led viewpoint, not a claim of perfect neutrality.

Team sheets and real match moments are checked against the linked Liverpool and Arsenal official reports in the app. Player photos link to their Wikimedia Commons file pages and license/credit information.
