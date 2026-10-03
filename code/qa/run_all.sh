#!/usr/bin/env bash
# Build gate: every QA checker must pass or the build fails.
# Run after every drip and before every push.
set -u
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
fail=0
for t in check_counts check_dupe_ids check_missing_ids check_links; do
  echo "=== $t ==="
  if ! python3 "$ROOT/code/qa/$t.py"; then fail=1; fi
done
# JS pure-logic suite (node) — identity/gen/ui modules must stay deterministic
if command -v node >/dev/null 2>&1; then
  echo "=== pc_qa.js ==="
  if ! node "$ROOT/code/tests/pc_qa.js"; then fail=1; fi
else
  echo "=== pc_qa.js SKIPPED (no node) ==="
fi
if [ "$fail" -ne 0 ]; then echo "BUILD GATE: FAIL"; exit 1; fi
echo "BUILD GATE: PASS"
