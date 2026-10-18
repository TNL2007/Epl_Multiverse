#!/usr/bin/env python3
"""Build the Premier League report-moment dataset used by the static app.

Uses the official Premier League match, commentary and lineup JSON endpoints.
The extraction is deliberately deterministic and auditable; it is not a
trained generative model or a claim about tracking coordinates.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
BASE = "https://sdp-prem-prod.premier-league-prod.pulselive.com/api"
SEASONS = {"2022-23": "2022", "2023-24": "2023", "2024-25": "2024", "2025-26": "2025", "2026-27": "2026"}
ALIASES = {
    "afc bournemouth": "bournemouth", "brighton and hove albion": "brighton & hove albion",
    "manchester utd": "manchester united", "man utd": "manchester united",
    "spurs": "tottenham hotspur", "wolves": "wolverhampton wanderers",
    "west ham": "west ham united", "newcastle": "newcastle united",
    "nottingham forest": "nottingham forest", "leicester": "leicester city",
    "leeds": "leeds united", "sheffield utd": "sheffield united",
}


def normalized_team(value: str) -> str:
    value = re.sub(r"\b(FC|AFC)\b", "", value, flags=re.I)
    value = " ".join(value.lower().replace("&amp;", "&").split())
    return ALIASES.get(value, value)


def request_json(url: str, attempts: int = 5):
    req = urllib.request.Request(url, headers={"User-Agent": "EplMultiverse/1.0 (scenario dataset importer)", "Accept": "application/json"})
    for attempt in range(attempts):
        try:
            with urllib.request.urlopen(req, timeout=30) as response:
                return json.load(response)
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as exc:
            if attempt + 1 == attempts:
                raise RuntimeError(f"Request failed: {url}: {exc}") from exc
            time.sleep(min(2 ** attempt, 20))


def paged_matches(season_id: str):
    cursor = None
    while True:
        params = {"competition": "8", "season": season_id, "_limit": "100"}
        if cursor:
            params["_next"] = cursor
        payload = request_json(BASE + "/v2/matches?" + urllib.parse.urlencode(params))
        yield from payload.get("data", [])
        cursor = (payload.get("pagination") or {}).get("_next")
        if not cursor:
            break


def paged_commentary(match_id: str, delay: float):
    cursor = None
    rows = []
    while True:
        params = {"_limit": "100", "_sort": "timestamp:asc"}
        if cursor:
            params["_next"] = cursor
        payload = request_json(BASE + f"/v1/matches/{match_id}/commentary?" + urllib.parse.urlencode(params))
        rows.extend(payload.get("data", []))
        cursor = (payload.get("pagination") or {}).get("_next")
        if not cursor:
            return rows
        time.sleep(delay)


def player_name(player):
    return player.get("knownName") or " ".join(part for part in (player.get("firstName"), player.get("lastName")) if part).strip()


def lineup_payload(match_id: str):
    payload = request_json(BASE + f"/v3/matches/{match_id}/lineups")
    players = []
    by_id = {}
    for side_key, team in (("home_team", "home"), ("away_team", "away")):
        side = payload.get(side_key) or {}
        for player in side.get("players", []):
            name = player_name(player)
            number = player.get("shirtNum")
            if not name or number is None:
                continue
            item = {"id": str(player.get("id", "")), "name": name, "number": int(number), "team": team, "role": player.get("subPosition") or player.get("position", "")}
            players.append(item)
            by_id[item["id"]] = item
    return players, by_id


EVENTS = {
    "goal": (10, "Goal"), "penalty scored": (10, "Penalty scored"), "own goal": (10, "Own goal"),
    "penalty missed": (9, "Penalty missed"), "penalty saved": (9, "Penalty saved"),
    "attempt saved": (8, "Big chance saved"), "attempt post": (8, "Attempt hits the woodwork"),
    "attempt off target": (7, "Big chance missed"), "red card": (8, "Red card"),
    "second yellow": (8, "Second yellow card"), "attempt blocked": (5, "Shot blocked"),
    "substitution": (3, "Substitution"),
}


def minute_text(row):
    value = str(row.get("time") or "").strip()
    return value.replace("'", "′") if value else "—"


def action_set(kind, actors):
    passer = actors[0] if actors else "the ball carrier"
    if "penalty" in kind:
        return [
            {"type": "shoot", "label": "Place it to the corner", "detail": "Prioritise accuracy", "outcome": f"{passer} aims for the corner. Alternate outcome is illustrative, not historical."},
            {"type": "shoot", "label": "Hit it with power", "detail": "Test the goalkeeper's reactions", "outcome": f"{passer} chooses power. Alternate outcome is illustrative, not historical."},
            {"type": "central", "label": "Go down the middle", "detail": "Commit to the central finish", "outcome": f"{passer} goes centrally. Alternate outcome is illustrative, not historical."},
            {"type": "dribble", "label": "Delay the strike", "detail": "Try to read the goalkeeper", "outcome": f"{passer} delays before striking. Alternate outcome is illustrative, not historical."},
        ]
    if kind in ("goal", "own goal"):
        return [
            {"type": "shoot", "label": "Shoot first time", "detail": "Take the earliest finish", "outcome": "The attacker shoots immediately; this is a hypothetical branch."},
            {"type": "dribble", "label": "Carry into space", "detail": "Improve the angle before shooting", "outcome": "The attacker carries the ball; this is a hypothetical branch."},
            {"type": "pass", "label": "Square to a teammate", "detail": "Choose the pass instead", "outcome": "A teammate receives the square ball; this is a hypothetical branch."},
            {"type": "recycle", "label": "Keep possession", "detail": "Reset the attack", "outcome": "The attack is recycled; this is a hypothetical branch."},
        ]
    return [
        {"type": "shoot", "label": "Shoot", "detail": "Take the attempt", "outcome": "The attempt is taken. Hypothetical branch; no outcome is presented as fact."},
        {"type": "pass", "label": "Pass to a teammate", "detail": "Choose a pass instead", "outcome": "Possession is played to a teammate. Hypothetical branch."},
        {"type": "dribble", "label": "Carry the ball", "detail": "Try to improve the angle", "outcome": "The carrier tries to beat the next defender. Hypothetical branch."},
        {"type": "recycle", "label": "Recycle possession", "detail": "Keep the move alive", "outcome": "The attack is reset. Hypothetical branch."},
    ]


def scenario_rows(commentary, by_id):
    candidates = []
    for index, row in enumerate(commentary):
        kind = str(row.get("type", "")).lower()
        if kind not in EVENTS:
            continue
        score, label = EVENTS[kind]
        comment = str(row.get("comment", "")).strip()
        if not comment:
            continue
        ids = []
        for field in ("player1", "player2", "player3"):
            player_id = str(row.get(field, ""))
            if player_id and player_id in by_id and player_id not in ids:
                ids.append(player_id)
        actors = [by_id[player_id]["name"] for player_id in ids]
        candidates.append((score, index, row, kind, label, actors, ids, comment))

    # Keep memorable moments across the whole match, avoid a list of repeated routine shots.
    candidates.sort(key=lambda item: (-item[0], item[1]))
    selected = []
    seen = set()
    for item in candidates:
        signature = (item[3], minute_text(item[2]))
        if signature in seen:
            continue
        selected.append(item)
        seen.add(signature)
        if len(selected) >= 8:
            break
    selected.sort(key=lambda item: item[1])
    result = []
    for n, (_, _, row, kind, label, actors, ids, comment) in enumerate(selected, 1):
        lead = actors[0] if actors else ""
        # The official play-by-play text is retained as evidence; UI copy stays compact.
        summary = comment[:240].rstrip()
        if len(comment) > 240:
            summary = summary.rsplit(" ", 1)[0] + "…"
        title = f"{lead} — {label}" if lead else label
        result.append({
            "id": f"moment-{n}", "minute": minute_text(row), "title": title,
            "summary": summary, "source": 0,
            "players": actors,
            "event": {"type": kind, "playerIds": ids, "teamId": str(row.get("team1", "")), "evidence": comment},
            "actions": action_set(kind, actors),
        })
    return result


def archive_matches():
    fixtures = {}
    for path in sorted(DATA.glob("epl-*-results.json")):
        original_text = path.read_text(encoding="utf-8")
        payload = json.loads(original_text)
        for match in payload.get("matches", []):
            key = (match.get("date"), normalized_team(match.get("team1", "")), normalized_team(match.get("team2", "")))
            season = payload.get("season") or path.stem.removeprefix("epl-").removesuffix("-results")
            fixtures[key] = (match, season)
    return fixtures


def save_checkpoint(catalog, output):
    output.parent.mkdir(parents=True, exist_ok=True)
    checkpoint = output.with_name(output.stem + "-progress.json")
    temp = checkpoint.with_suffix(checkpoint.suffix + ".tmp")
    temp.write_text(json.dumps(catalog, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    temp.replace(checkpoint)


def load_catalog(output):
    catalog = json.loads(output.read_text(encoding="utf-8"))
    if "matchIndex" in catalog:
        matches = {}
        for shard_name in sorted(set(catalog["matchIndex"].values())):
            shard = json.loads((output.parent / shard_name).read_text(encoding="utf-8"))
            matches.update(shard.get("matches", {}))
        catalog["matches"] = matches
        catalog.pop("matchIndex", None)
    return catalog


def save_catalog(catalog, output, shard_size=30):
    output.parent.mkdir(parents=True, exist_ok=True)
    old_shards = set()
    if output.exists():
        try:
            previous = json.loads(output.read_text(encoding="utf-8"))
            old_shards = set(previous.get("matchIndex", {}).values())
        except (json.JSONDecodeError, OSError):
            pass
    match_index = {}
    ordered = sorted(catalog["matches"].items(), key=lambda pair: (pair[1].get("season", ""), pair[1].get("date", ""), pair[0]))
    groups = {}
    for key, record in ordered:
        groups.setdefault(record.get("season", "unknown"), []).append((key, record))
    for season, entries in sorted(groups.items()):
        for start in range(0, len(entries), shard_size):
            shard_name = f"{output.stem}-{season}-{start // shard_size + 1:02d}.json"
            shard_path = output.parent / shard_name
            shard_payload = {"schemaVersion": 2, "matches": dict(entries[start:start + shard_size])}
            shard_path.write_text(json.dumps(shard_payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
            for key, _ in entries[start:start + shard_size]:
                match_index[key] = shard_name
    manifest = {key: value for key, value in catalog.items() if key != "matches"}
    manifest["schemaVersion"] = 3
    manifest["matchCount"] = len(match_index)
    manifest["matchIndex"] = match_index
    temp = output.with_suffix(output.suffix + ".tmp")
    temp.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    temp.replace(output)
    for stale in old_shards - set(match_index.values()):
        if Path(stale).name == stale and stale.startswith(output.stem + "-") and stale.endswith(".json"):
            stale_path = output.parent / stale
            if stale_path.is_file():
                stale_path.unlink()
    progress = output.with_name(output.stem + "-progress.json")
    if progress.exists():
        progress.unlink()


def refresh_missing_scores(fixtures, delay):
    """Fill scorelines absent from the bundled archive using finished PL results."""
    updated = {}
    scores = {}
    for season, season_id in SEASONS.items():
        for api_match in paged_matches(season_id):
            if api_match.get("period") != "FullTime":
                continue
            home, away = api_match.get("homeTeam", {}), api_match.get("awayTeam", {})
            key = (api_match.get("kickoff", "")[:10], normalized_team(home.get("name", "")), normalized_team(away.get("name", "")))
            fixture = fixtures.get(key)
            if not fixture:
                continue
            match, archived_season = fixture
            if match.get("score", {}).get("ft"):
                continue
            scores[key] = {"ht": [home.get("halfTimeScore", 0), away.get("halfTimeScore", 0)],
                            "ft": [home.get("score", 0), away.get("score", 0)]}
            updated.setdefault(archived_season, 0)
            updated[archived_season] += 1
            time.sleep(delay)

    if not updated:
        return updated
    for path in sorted(DATA.glob("epl-*-results.json")):
        original_text = path.read_text(encoding="utf-8")
        payload = json.loads(original_text)
        season = payload.get("season") or path.stem.removeprefix("epl-").removesuffix("-results")
        if season in updated:
            for match in payload.get("matches", []):
                key = (match.get("date"), normalized_team(match.get("team1", "")), normalized_team(match.get("team2", "")))
                if key in scores and not match.get("score", {}).get("ft"):
                    match["score"] = scores[key]
            payload["snapshotDate"] = time.strftime("%Y-%m-%d", time.gmtime())
            temp = path.with_suffix(path.suffix + ".tmp")
            serialized = json.dumps(payload, ensure_ascii=False, indent=2) if "\n" in original_text else json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
            temp.write_text(serialized + "\n", encoding="utf-8")
            temp.replace(path)
    return updated


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--limit", type=int, default=0, help="process only this many completed matches (smoke testing)")
    parser.add_argument("--delay", type=float, default=0.08, help="seconds between requests to the Premier League service")
    parser.add_argument("--output", type=Path, default=DATA / "report-scenarios.json")
    parser.add_argument("--checkpoint", type=int, default=20, help="save progress every N matches")
    parser.add_argument("--append", action="store_true", help="resume by preserving existing records and importing only missing fixtures")
    parser.add_argument("--refresh-scores", action="store_true", help="fill missing full-time scorelines from the official match feed")
    parser.add_argument("--shard-size", type=int, default=30, help="fixtures stored in each app-loaded scenario shard")
    args = parser.parse_args()
    if args.shard_size < 1:
        parser.error("--shard-size must be at least 1")

    fixtures = archive_matches()
    if args.refresh_scores:
        updates = refresh_missing_scores(fixtures, args.delay)
        print("Filled missing official scorelines: " + (", ".join(f"{season}: {count}" for season, count in sorted(updates.items())) or "none"), flush=True)
    catalog = load_catalog(args.output) if args.append and args.output.exists() else {
        "schemaVersion": 2, "generatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "source": "Premier League match centre API", "method": "deterministic event classification and salience ranking; alternate actions are hypothetical",
        "coverageNote": "Only moments recorded in official match-centre commentary are offered. Shirt numbers come from the historical match lineups. Unavailable report/lineup data is not inferred.", "matches": {}, "importFailures": []}
    processed = 0
    completed_seen = 0
    for season, season_id in SEASONS.items():
        for api_match in paged_matches(season_id):
            if api_match.get("period") != "FullTime":
                continue
            home = api_match.get("homeTeam", {})
            away = api_match.get("awayTeam", {})
            kickoff = api_match.get("kickoff", "")
            date = kickoff[:10]
            fixture = fixtures.get((date, normalized_team(home.get("name", "")), normalized_team(away.get("name", ""))))
            if fixture is None:
                continue
            archived_match, archived_season = fixture
            key = "|".join((archived_match["date"], archived_match["team1"], archived_match["team2"]))
            if key in catalog["matches"]:
                continue
            completed_seen += 1
            if args.limit and processed >= args.limit:
                break
            match_id = str(api_match.get("matchId", ""))
            if not match_id:
                continue
            try:
                commentary = paged_commentary(match_id, args.delay)
                time.sleep(args.delay)
                players, by_id = lineup_payload(match_id)
                moments = scenario_rows(commentary, by_id)
            except Exception as exc:  # preserve fixture coverage status and continue
                print(f"WARN {date} {home.get('name')}–{away.get('name')} [{match_id}]: {exc}", file=sys.stderr, flush=True)
                catalog.setdefault("importFailures", []).append({"date": date, "home": archived_match["team1"], "away": archived_match["team2"], "matchId": match_id, "error": str(exc)})
                time.sleep(max(args.delay, 0.25))
                continue
            catalog["matches"][key] = {
                "date": date, "home": archived_match["team1"], "away": archived_match["team2"],
                "score": f"{home.get('score', 0)}–{away.get('score', 0)}", "season": archived_season,
                "players": [{**{k: v for k, v in player.items() if k not in ("id", "team")},
                             "team": archived_match["team1"] if player["team"] == "home" else archived_match["team2"]}
                            for player in players],
                "sources": [{"label": "Premier League match commentary and lineups", "url": f"https://www.premierleague.com/en/match/{match_id}"}],
                "moments": moments,
            }
            processed += 1
            if processed % args.checkpoint == 0:
                catalog["generatedAt"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
                save_checkpoint(catalog, args.output)
                print(f"Imported {processed} completed matches; {sum(bool(m['moments']) for m in catalog['matches'].values())} have selectable moments.", flush=True)
            time.sleep(args.delay)
        if args.limit and processed >= args.limit:
            break
    # Some upstream season files omit their explicit season property; normalize
    # every record from the filename-derived archive mapping before writing.
    for match, season in fixtures.values():
        key = "|".join((match["date"], match["team1"], match["team2"]))
        if key in catalog["matches"]:
            catalog["matches"][key]["season"] = season
    catalog["generatedAt"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    save_catalog(catalog, args.output, args.shard_size)
    print(f"Done: {processed} completed matches imported, {sum(bool(m['moments']) for m in catalog['matches'].values())} with moments; dataset={args.output}")


if __name__ == "__main__":
    main()
