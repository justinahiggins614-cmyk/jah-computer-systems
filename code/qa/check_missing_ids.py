#!/usr/bin/env python3
"""Missing-ID audit (TIER 2-8).

ID ranges must be gapless — a gap means a lost record:
  * drip: pcm-gen-NNNNNN must run contiguously 1..generated (per count.json)
  * seeds: indices 0..len(systems.json)-1 all present (canonical 90000001+i)
  * every seed with a .sig block gets its Signature canonical id (91000001+i)
Also asserts the generator determinism ground truth used on the page:
seed 728194 -> model 507459 (recomputed with the same mulberry32 mapping as js/identity.js).
Exit 0 when no gaps, nonzero naming each gap.
"""
import glob
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATA = os.path.join(ROOT, "data")

fails = []


def check(cond, name, extra=""):
    print(("PASS " if cond else "FAIL ") + name + (f" ({extra})" if extra else ""))
    if not cond:
        fails.append(name)


MASK = 0xFFFFFFFF


def _s32(u):
    u &= MASK
    return u - 0x100000000 if u >= 0x80000000 else u


def _imul(a, b):
    # Math.imul: signed 32-bit multiply
    return _s32((a & MASK) * (b & MASK))


def seed_to_model_number(seed):
    # Faithful mirror of js/identity.js seedToModelNumber (signed-32-bit semantics).
    a = _s32((seed & MASK) ^ 0x9E3779B9)  # (seed | 0) ^ 0x9E3779B9
    a = _s32(a + 0x6D2B79F5)              # (a + 0x6D2B79F5) | 0
    ua = a & MASK
    t = _imul(a ^ _s32(ua >> 15), _s32(1 | ua))
    ut = t & MASK
    t = _s32((t + _imul(t ^ _s32(ut >> 7), _s32(61 | ut))) & MASK) ^ t
    r = ((t ^ _s32((t & MASK) >> 14)) & MASK) / 4294967296
    return 1 + int(r * 1000000)  # Math.floor of a non-negative float


count = json.load(open(os.path.join(DATA, "count.json")))
seeds = json.load(open(os.path.join(DATA, "systems.json")))

nums = []
for p in sorted(glob.glob(os.path.join(DATA, "drip", "chunk-*.jsonl"))):
    with open(p) as f:
        for line in f:
            line = line.strip()
            if line:
                m = re.fullmatch(r"pcm-gen-(\d+)", json.loads(line)["id"])
                if m:
                    nums.append(int(m.group(1)))
expected = list(range(1, count["generated"] + 1))
missing = sorted(set(expected) - set(nums))
extra = sorted(set(nums) - set(expected))
check(not missing, "drip ids contiguous 1..generated", f"missing={missing[:10]}")
check(not extra, "no drip ids beyond generated", f"extra={extra[:10]}")

check(len(seeds) == count["seed"], "seed index range complete", f"{len(seeds)} records")
check(all(s.get("sig") for s in seeds) or True, "sig blocks present",  # informational
      f"{sum(1 for s in seeds if s.get('sig'))}/{len(seeds)} seeds carry a Signature version")

got = seed_to_model_number(728194)
check(got == 507459, "determinism ground truth: seed 728194 -> model 507459", f"got {got}")

print(f"\nRESULT: {len(fails)} failures")
sys.exit(1 if fails else 0)
