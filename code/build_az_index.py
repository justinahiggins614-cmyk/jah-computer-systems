#!/usr/bin/env python3
"""Build the A-Z systems archive index for index.html's "THE FULL SYSTEMS
ARCHIVE" section.

Ground truth (never page text):
  * data/systems-index.json -> rows {system_id, name, category, url}

Writes (under data/index/az/):
  * <L>.json        one compact JSON array per letter: [system_id, name, category]
                    sorted by name (then id), lazy-loaded by the page on <details>
                    toggle so phones never pull the whole catalog at once
  * manifest.json   {total, built, counts} so the page can stamp per-letter
                    counts without loading any letter file

Called by code/drip/append_models.py AFTER gen_index_feed.py regenerates the
feed (A-Z-ARCHIVE step) — never one run behind. Safe to re-run any time.
"""
import datetime
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
AZ = os.path.join(ROOT, "data", "index", "az")


def letter_of(name):
    # generated models all start with the shared "Signature " prefix — letter
    # them by the distinguishing word, same as code/gen_browse_index.py
    key = name[len("Signature "):] if (name or "").startswith("Signature ") else (name or "")
    m = re.search(r"[A-Za-z]", key)
    return m.group(0).upper() if m else "#"


def main():
    feed = json.load(open(os.path.join(ROOT, "data", "systems-index.json")))
    buckets = {}
    for r in feed.get("rows", []):
        sid = r.get("system_id") or ""
        name = r.get("name") or ""
        if not sid:
            continue
        buckets.setdefault(letter_of(name), []).append(
            [sid, name, r.get("category") or ""])
    os.makedirs(AZ, exist_ok=True)
    counts = {}
    for L in sorted(buckets):
        rows = sorted(buckets[L], key=lambda x: (x[1].lower(), x[0]))
        with open(os.path.join(AZ, L + ".json"), "w", encoding="utf-8") as f:
            json.dump(rows, f, ensure_ascii=False, separators=(",", ":"))
        counts[L] = len(rows)
    total = sum(counts.values())
    manifest = {"total": total,
                "built": datetime.date.today().isoformat(),
                "counts": counts}
    with open(os.path.join(AZ, "manifest.json"), "w", encoding="utf-8") as f:
        json.dump(manifest, f, separators=(",", ":"))
    print("A-Z-ARCHIVE: %d rows -> data/index/az/ (%d letter files)"
          % (total, len(counts)))
    return 0


if __name__ == "__main__":
    sys.exit(main())
