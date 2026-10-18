#!/usr/bin/env python3
"""Validate the report-scenario index, shards, participants and choices."""

import json
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
manifest = json.loads((DATA / "report-scenarios.json").read_text(encoding="utf-8"))
if manifest.get("schemaVersion") != 3:
    raise SystemExit("Expected scenario index schema version 3")

records = {}
for shard_name in sorted(set(manifest.get("matchIndex", {}).values())):
    shard_path = DATA / shard_name
    shard = json.loads(shard_path.read_text(encoding="utf-8"))
    records.update(shard.get("matches", {}))

problems = []
if len(records) != manifest.get("matchCount"):
    problems.append(f"index says {manifest.get('matchCount')} records, shards contain {len(records)}")
if set(records) != set(manifest.get("matchIndex", {})):
    problems.append("index keys and shard keys differ")

for key, record in records.items():
    if record.get("season") not in {"2022-23", "2023-24", "2024-25", "2025-26", "2026-27"}:
        problems.append(f"{key}: invalid or missing season")
    players = record.get("players", [])
    names = {player.get("name") for player in players}
    if len(players) < 22 or any(player.get("number") is None for player in players):
        problems.append(f"{key}: incomplete historical squad")
    if len(record.get("moments", [])) < 3:
        problems.append(f"{key}: fewer than three sourced moments")
    if not record.get("sources"):
        problems.append(f"{key}: no source link")
    for moment in record.get("moments", []):
        if any("\u0600" <= char <= "\u06ff" for char in moment.get("summary", "")):
            problems.append(f"{key}/{moment.get('id')}: summary contains Arabic text")
        if len(moment.get("actions", [])) != 4:
            problems.append(f"{key}/{moment.get('id')}: expected four choices")
        for player_name in moment.get("players", []):
            if player_name not in names:
                problems.append(f"{key}/{moment.get('id')}: participant not in lineup: {player_name}")

if problems:
    for problem in problems[:30]:
        print("FAIL", problem, file=sys.stderr)
    raise SystemExit(f"Scenario validation failed with {len(problems)} issue(s)")

moment_count = sum(len(record["moments"]) for record in records.values())
print(f"OK: {len(records)} matches, {moment_count} moments, four choices per moment, lineups and participants verified.")
