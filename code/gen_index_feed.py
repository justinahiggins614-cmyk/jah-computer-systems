#!/usr/bin/env python3
"""Emit data/systems-index.json — dedicated machine-readable inventory feed
(Site-9 diagnostic FIX-2) for The Signature PC System Depository.

Ground truth from data files, never from page text:
  * data/systems.json   -> 121 seed records (+ Signature sub-records)
  * data/drip/chunk-*.jsonl -> generated models
Each row: id, system_id, name, system_type, category, summary, url.
Called by code/drip/append_models.py after every drip run (same try/except
pattern as the sitemap step), so the feed never goes stale.
"""
import datetime
import glob
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "data")
BASE = "https://justinahiggins614-cmyk.github.io/jah-computer-systems/"


def seed_system_type(rec):
    if rec.get("cat") == "mixes":
        return "HYBRID"
    return {"historical": "HISTORICAL", "signature": "SIGNATURE_ORIGINAL",
            "predicted": "PREDICTED"}.get(rec.get("kind"), "HISTORICAL")


def main():
    seeds = json.load(open(os.path.join(DATA, "systems.json")))
    rows = []
    for i, r in enumerate(seeds):
        sid = "JAH-PC-%08d" % (90000001 + i)
        st = seed_system_type(r)
        rows.append({
            "id": r.get("id"), "system_id": sid,
            "name": r.get("name"), "system_type": st,
            "category": r.get("cat"),
            "summary": ((r.get("tag") or "") + " — " + (r.get("desc") or "")).strip(" —"),
            "url": BASE + "?system=" + sid,
        })
        if r.get("sig"):
            ssid = "JAH-PC-%08d" % (91000001 + i)
            rows.append({
                "id": r.get("id") + "#sig", "system_id": ssid,
                "name": (r["sig"] or {}).get("name") or r.get("name"),
                "system_type": "SIGNATURE_ORIGINAL", "category": "signature",
                "summary": "Signature-made version of " + (r.get("name") or ""),
                "url": BASE + "?system=" + ssid,
            })
    for chunk in sorted(glob.glob(os.path.join(DATA, "drip", "chunk-*.jsonl"))):
        with open(chunk) as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    r = json.loads(line)
                except Exception:
                    continue
                rid = r.get("id") or ""
                n = 0
                if rid.startswith("pcm-gen-"):
                    try:
                        n = int(rid.split("-")[-1])
                    except ValueError:
                        n = 0
                sid = "JAH-PC-%08d" % (80000000 + n) if n else rid
                rows.append({
                    "id": rid, "system_id": sid,
                    "name": r.get("name"), "system_type": "GENERATED",
                    "category": "generated",
                    "summary": (r.get("desc") or "")[:300],
                    "url": BASE + "?system=" + sid,
                })
    feed = {
        "feed": "JAH-PC-SYSTEMS-INDEX/1.0",
        "generated_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "base": BASE,
        "total": len(rows),
        "rows": rows,
    }
    out = os.path.join(DATA, "systems-index.json")
    json.dump(feed, open(out, "w"))
    print(f"index-feed: {len(rows)} rows -> data/systems-index.json")


if __name__ == "__main__":
    sys.exit(main())
