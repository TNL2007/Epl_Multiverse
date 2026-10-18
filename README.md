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

The archive contains 1,585 official full-time scores through the 18 October 2026 snapshot. The 2022/23–2024/25 seasons have full results; missing 2025/26 and 2026/27 scorelines were filled from the official Premier League match feed. A fixture without a score is not presented as completed. This remains a bundled snapshot, not a live feed. Selecting any archived fixture opens a generated kickoff simulation using simple season scoring-rate inputs and hand-set tactical modifiers; it is clearly not a replay, forecast, player-tracking model, or calibrated ML system.

Historical fixture/result data: [openfootball/football.json](https://github.com/openfootball/football.json). Its dataset is dedicated to the public domain under [CC0 1.0](https://github.com/openfootball/football.json/blob/master/LICENSE.md). Each bundled season file links to its upstream source.

## Report-based scenarios

The catalog currently covers 1,585 completed fixtures from 2022/23 through the 2026/27 snapshot, with up to eight sourced moments per match. Each moment links back to its Premier League match centre; player names and shirt numbers are taken from that match's historical lineups. A fixture with no imported commentary is left empty rather than given invented events. The camera animation only illustrates the named participants: the source does not provide tracking coordinates.

To refresh or rebuild the dataset, run `python scripts/import_pl_scenarios.py`. The importer paginates the official Premier League match/commentary feeds, joins each match to the fixture archive, records the historical squad and lineups, and selects up to eight high-salience events. It saves recoverable progress every 20 matches; `--append` resumes only missing fixtures, `--refresh-scores` fills missing final scores from the official feed, and `--shard-size` controls app-loaded shard sizes. `--limit N` is available for a small smoke test; omit it for a full run. The generated `data/report-scenarios.json` is a small index; the app fetches only the selected fixture's scenario shard. Run `python scripts/validate_scenarios.py` to check index coverage, player names/numbers and the four choices per moment.

The current AI/data method is deliberately auditable: event-type classification and salience ranking are deterministic rules over the official feed, and the alternate choices are templates clearly marked as hypothetical. This is a useful, testable baseline—not a trained deep-learning model, generated commentary, graph neural network, or reinforcement-learning policy. Those require separate labeled data, a defined simulator/reward, model evaluation, and (for hosted generative models) credentials. We should add them only as measured upgrades; using every AI technique indiscriminately would make the results less trustworthy.

The staged machine-learning, deep-learning, generative-AI, graph-model and reinforcement-learning plan—and the data each would require—is documented in [AI_ROADMAP.md](AI_ROADMAP.md).

Win probabilities and season-ripple figures are illustrative prototype estimates, not betting or forecasting advice.

## Match-centre prototype

The match centre includes the official starting XIs and shirt numbers, correctly updated 72nd-minute personnel, a coordinated illustrative reenactment of the real counter, larger credited player portraits, a real-event highlights timeline, and an Eye Test tab with a fan-style reading and counterpoint.

Feature 2 now has an event-only Kalman-filter prototype. It updates a latent pressure estimate from three verified high-impact events (two goals and the crossbar chance). Its noise settings are hand-set, its sample is sparse, and it is not calibrated; it has no tracking, pressing-intensity or pitch-control input. The pitch movement likewise illustrates the event sequence rather than reproducing tracking coordinates. The Ratings tab lets a fan enter personal scores locally instead of fabricating player ratings from a results-only dataset. A single event-based score can miss off-ball work, role context and positioning. FotMob and Sofascore publish broad descriptions of rating inputs, but not enough exact weighting to reproduce them faithfully. The Eye Test is an evidence-led viewpoint, not a claim of perfect neutrality.

Team sheets and real match moments are checked against the linked Liverpool and Arsenal official reports in the app. Player photos link to their Wikimedia Commons file pages and license/credit information.
