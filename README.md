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

The archive snapshot was assembled on 18 October 2026. It contains 1,543 full-time scores. The 2022/23–2024/25 seasons have full season results in this snapshot. The 2025/26 season has 353 scores recorded, and the in-progress 2026/27 season has 50; the remaining entries have no score in the source snapshot. A fixture with no score is not presented as a completed result. The latest season is a bundled snapshot, not a live feed; refreshes will follow as reliable data becomes available. Selecting any archived fixture now opens a generated kickoff simulation using simple season scoring-rate inputs and hand-set tactical modifiers; it is clearly not a replay, forecast, player-tracking model, or calibrated ML system.

Historical fixture/result data: [openfootball/football.json](https://github.com/openfootball/football.json). Its dataset is dedicated to the public domain under [CC0 1.0](https://github.com/openfootball/football.json/blob/master/LICENSE.md). Each bundled season file links to its upstream source.

## Counterfactual match prototype

The featured Liverpool–Arsenal scenario now starts from the verified 72nd-minute counter: Liverpool break after an Arsenal corner, Salah squares for Alexander-Arnold, and Trent hits the crossbar. That is the historical trunk; changed choices and outcomes are clearly counterfactual. The bundled archive contains fixtures and scores—not minute-by-minute event timelines or player tracking—so it cannot support factual replays for every archived fixture. Broader coverage needs an event-data source and appropriate usage rights.

Win probabilities and season-ripple figures are illustrative prototype estimates, not betting or forecasting advice.

## Match-centre prototype

The match centre includes the official starting XIs and shirt numbers, correctly updated 72nd-minute personnel, a coordinated illustrative reenactment of the real counter, larger credited player portraits, a real-event highlights timeline, and an Eye Test tab with a fan-style reading and counterpoint.

Feature 2 now has an event-only Kalman-filter prototype. It updates a latent pressure estimate from three verified high-impact events (two goals and the crossbar chance). Its noise settings are hand-set, its sample is sparse, and it is not calibrated; it has no tracking, pressing-intensity or pitch-control input. The pitch movement likewise illustrates the event sequence rather than reproducing tracking coordinates. The Ratings tab lets a fan enter personal scores locally instead of fabricating player ratings from a results-only dataset. A single event-based score can miss off-ball work, role context and positioning. FotMob and Sofascore publish broad descriptions of rating inputs, but not enough exact weighting to reproduce them faithfully. The Eye Test is an evidence-led viewpoint, not a claim of perfect neutrality.

Team sheets and real match moments are checked against the linked Liverpool and Arsenal official reports in the app. Player photos link to their Wikimedia Commons file pages and license/credit information.
