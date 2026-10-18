#!/usr/bin/env python3
"""Replace Arabic-localized scenario summaries with conservative English event descriptions."""

import json
from pathlib import Path

from import_pl_scenarios import contains_arabic, english_event_summary


ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
manifest = json.loads((DATA / "report-scenarios.json").read_text(encoding="utf-8"))
updated = 0

for shard_name in sorted(set(manifest.get("matchIndex", {}).values())):
    shard_path = DATA / shard_name
    shard = json.loads(shard_path.read_text(encoding="utf-8"))
    for record in shard.get("matches", {}).values():
        for moment in record.get("moments", []):
            if not contains_arabic(moment.get("summary", "")):
                continue
            event_type = moment.get("event", {}).get("type", "")
            moment["summary"] = english_event_summary(
                event_type,
                moment.get("players", []),
                moment.get("title", "Match event").split("—")[-1].strip(),
            )
            updated += 1
    shard_path.write_text(json.dumps(shard, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

print(f"Updated {updated} Arabic-localized summaries across {len(set(manifest.get('matchIndex', {}).values()))} shards.")
