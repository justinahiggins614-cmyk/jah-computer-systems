#!/usr/bin/env python3
"""Duplicate-ID audit (TIER 2-8).

Every record carries exactly one canonical JAH-PC-######## ID. Ranges are
partitioned by source (SCHEMA.md / JAH-PC-ID/1.0), so duplicates inside or
across ranges must be zero:
  * seed legacy ids (data/systems.json -> "id")
  * drip ids (data/drip/chunk-*.jsonl -> "id" = pcm-gen-NNNNNN)
  * canonical ids: seed base 90000001+i, seed sig 91000001+i, drip 80000000+n
Exit 0 when no duplicates exist, nonzero naming each collision.
"""
import glob
import json
import os
import re
import sys
from collections import Counter

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATA = os.path.join(ROOT, "data")

fails = []


def check(cond, name, extra=""):
    print(("PASS " if cond else "FAIL ") + name + (f" ({extra})" if extra else ""))
    if not cond:
        fails.append(name)


def dupes(seq):
    return [k for k, v in Counter(seq).items() if v > 1]


seeds = json.load(open(os.path.join(DATA, "systems.json")))
seed_ids = [s["id"] for s in seeds]
check(not dupes(seed_ids), "seed legacy ids unique", f"dupes={dupes(seed_ids)}")

drip_ids = []
for p in sorted(glob.glob(os.path.join(DATA, "drip", "chunk-*.jsonl"))):
    with open(p) as f:
        for line in f:
            line = line.strip()
            if line:
                drip_ids.append(json.loads(line)["id"])
check(not dupes(drip_ids), "drip ids unique", f"dupes={dupes(drip_ids)}")

canonical = []
canonical += [f"JAH-PC-{90000001 + i:08d}" for i in range(len(seeds))]
canonical += [f"JAH-PC-{91000001 + i:08d}" for i in range(len(seeds)) if seeds[i].get("sig")]
for did in drip_ids:
    m = re.fullmatch(r"pcm-gen-(\d+)", did)
    if m:
        canonical.append(f"JAH-PC-{80000000 + int(m.group(1)):08d}")
check(not dupes(canonical), "canonical JAH-PC IDs unique across all ranges",
      f"dupes={dupes(canonical)} total={len(canonical)}")

# legacy ids must also not collide with each other across sources
check(not (set(seed_ids) & set(drip_ids)), "no legacy-id collision seed<->drip")

print(f"\nRESULT: {len(fails)} failures")
sys.exit(1 if fails else 0)
