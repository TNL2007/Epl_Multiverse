# EPL Multiverse: AI roadmap

The product goal is to let a fan choose a real match moment and explore plausible alternatives. The data is evidence about what happened; a counterfactual branch is a simulation, not a recovered historical fact.

## What this dataset supports now

The report catalog contains 1,585 completed matches and 12,680 selected commentary events. Each event has a source match ID/link, commentary text, event type, minute, official player IDs, and lineup-resolved names and shirt numbers. These are useful labels and entities for experiments. They are not tracking coordinates, complete event sequences, shot locations, or ground-truth alternate outcomes.

The current extraction is a deterministic baseline: classify explicit Premier League commentary event types, assign transparent salience weights, and select up to eight distinct moments per match. This favors reproducibility and source traceability over a black-box model. Four action choices are templates; none is presented as the event that really occurred.

## Staged model plan

1. **Classical machine learning — next measurable experiment.** Train a text classifier to predict event classes from commentary, using match-grouped train/validation/test splits so adjacent events from one match cannot leak across splits. Compare TF-IDF plus logistic regression against the deterministic event-type labels. Report macro-F1, per-class recall, calibration, and errors. Because the provider already labels these events, the model earns a place in production only if it improves a real task such as classifying unstructured report paragraphs.
2. **Deep learning — only with a meaningful target.** Compare a pretrained language encoder against the classical baseline for ambiguous narrative passages. Fine-tuning on the same weak labels is not proof of football understanding; evaluation must include manually checked examples, a held-out season, and uncertainty reporting. Do not train a tracking or player-movement network from this commentary-only dataset.
3. **Generative AI — constrained commentary, not fabricated facts.** A language model could narrate a selected alternate branch, but it must receive only verified match context plus the user's choice, preserve names/minutes, distinguish fact from simulation, and never invent a recorded outcome. Require a configured model/API, prompt/version logging, groundedness checks, and a safe deterministic fallback before enabling it in the public app.
4. **Graph models / GNNs — future event relationships.** Player IDs, team IDs, and event order can form a coarse participant graph. It has no spatial edges or distances, so a graph model could study involvement patterns but cannot infer formation shape, pressure, passing lanes, or off-ball runs. Add tracking/event-location data before making those claims.
5. **Reinforcement learning — not trainable from these counterfactuals yet.** RL needs a defined state, legal action set, transition/outcome model, and reward. Historical commentary gives outcomes for the action that happened, not the alternatives. Training an agent against invented transitions would merely reward its own assumptions. First build and calibrate a simulator against held-out real events; then evaluate policies offline, with uncertainty and human review.

## Release gates

- Keep the source moment and alternate simulation visibly separate in the interface and data model.
- Split evaluation by match/season, never by randomly shuffling commentary lines from the same match.
- Store model version, training-data snapshot, metrics, and confidence for any future inference.
- Do not publish player ratings, tracking visualizations, or outcome probabilities unless their inputs and calibration are available and shown.
- Keep a no-model path so match selection and scenarios continue working when an AI service is unavailable.
