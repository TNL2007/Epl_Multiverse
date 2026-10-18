# EPL Multiverse

A small, playable browser prototype for an alternate football match simulator. Choose what happens next, get event-based broadcast commentary, and rewind to explore another timeline.

## Play it

Open `index.html` in a modern browser. The prototype is plain HTML, CSS, and JavaScript; it needs no build step or package installation.

## What is here

- A 2D tactical match view set during Liverpool vs Arsenal at Anfield.
- Three decision moments: Salah's attack, a Liverpool corner, and an Arsenal counter.
- Probabilistic outcomes that update the score, momentum, and illustrative Liverpool win chance.
- Broadcast-style commentary generated from the selected action and simulated result.
- Replay branches so you can compare different versions of the same match.
- A Ripple Score placeholder for the impact of a moment.

## Files

- `index.html` — match screen and controls.
- `styles.css` — responsive dark broadcast interface and pitch.
- `game.js` — match scenarios, outcome sampling, commentary, and replay state.

## Prototype limits

The match probabilities and win-chance changes are illustrative values, not trained football models. Commentary is selected from authored templates tied to the simulated event; it does not call an LLM or use live match data. Player positions are diagrammatic. The Ripple Score is a placeholder, not a validated measure.

The next useful step is to play several timelines, tune the outcome balance, then separate the match engine from the interface before adding real datasets or generated voice.
