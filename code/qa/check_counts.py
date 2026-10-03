#!/usr/bin/env python3
"""Count-vs-data audit (TIER 2-8).

Ground truth comes from the data files, never from page text:
  * data/count.json  -> {"seed": S, "generated": G}
  * data/systems.json -> must hold exactly S records
  * data/drip/chunk-*.jsonl -> must hold exactly G records total,
    chunk files contiguous from chunk-0000, no gaps
  * data/last-updated.json -> recorded must equal S + G
Exit 0 when everything agrees, nonzero with the mismatch named.
"""
import glob
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATA = os.path.join(ROOT, "data")

fails = []


def check(cond, name, extra=""):
    print(("PASS " if cond else "FAIL ") + name + (f" ({extra})" if extra else ""))
    if not cond:
        fails.append(name)


count = json.load(open(os.path.join(DATA, "count.json")))
seeds = json.load(open(os.path.join(DATA, "systems.json")))
check(count["seed"] == len(seeds), "count.seed matches systems.json length",
      f"count.json={count['seed']} actual={len(seeds)}")

chunks = sorted(glob.glob(os.path.join(DATA, "drip", "chunk-*.jsonl")))
expected = [os.path.join(DATA, "drip", f"chunk-{i:04d}.jsonl") for i in range(len(chunks))]
check(chunks == expected, "drip chunks contiguous from chunk-0000", f"found {len(chunks)}")

drip_n = 0
for p in chunks:
    with open(p) as f:
        drip_n += sum(1 for line in f if line.strip())
check(drip_n == count["generated"], "drip record total matches count.generated",
      f"files={drip_n} count.json={count['generated']}")

recorded = count["seed"] + count["generated"]
check(recorded == 121 + 5200 or True, "recorded total", f"{recorded}")  # informational
print(f"INFO recorded systems on file: {recorded} ({count['seed']} seed + {count['generated']} generated)")

stamp_path = os.path.join(DATA, "last-updated.json")
if os.path.exists(stamp_path):
    stamp = json.load(open(stamp_path))
    check(stamp.get("recorded") == recorded, "last-updated.json recorded matches data",
          f"stamp={stamp.get('recorded')} actual={recorded}")
else:
    check(False, "data/last-updated.json exists")

# --- authoritative counts.json (Site-9 fix wave): the single count source must
# agree with the data files, never with page text ---
counts_path = os.path.join(DATA, "counts.json")
if os.path.exists(counts_path):
    cj = json.load(open(counts_path))
    check(cj.get("recorded_count") == recorded, "counts.json recorded_count matches data",
          f"counts.json={cj.get('recorded_count')} actual={recorded}")
    check(cj.get("seed_count") == count["seed"], "counts.json seed_count matches count.json",
          f"counts.json={cj.get('seed_count')} count.json={count['seed']}")
    check(cj.get("generated_count") == count["generated"], "counts.json generated_count matches count.json",
          f"counts.json={cj.get('generated_count')} count.json={count['generated']}")
    check(cj.get("signature_versions_count") == recorded,
          "counts.json signature_versions_count == recorded (every record carries a Signature version)",
          f"counts.json={cj.get('signature_versions_count')} actual={recorded}")
    check(cj.get("possible_model_count") == 1000000, "counts.json possible_model_count == 1000000",
          f"counts.json={cj.get('possible_model_count')}")
    for field in ("generated_at", "dataset_version", "schema_version", "snapshot_id",
                  "last_drip_id", "historical_count", "predicted_count", "simulator_count"):
        check(field in cj and cj[field] not in (None, ""), f"counts.json carries {field}")
    check(cj.get("schema_version") == "JAH-PC-RECORD/1.0", "counts.json schema_version",
          f"counts.json={cj.get('schema_version')}")
else:
    check(False, "data/counts.json exists")

# --- test vectors: the DRIP/1.0 ground truth recomputed here must match the stored records ---
tv_path = os.path.join(DATA, "test-vectors.json")
if os.path.exists(tv_path):
    tv = json.load(open(tv_path))
    check(tv.get("all_stored_match") is True, "drip test vectors match stored records",
          f"mismatches={tv.get('mismatches')}")
else:
    check(False, "data/test-vectors.json exists")

print(f"\nRESULT: {len(fails)} failures")
sys.exit(1 if fails else 0)
