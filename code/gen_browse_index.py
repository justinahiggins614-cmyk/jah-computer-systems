#!/usr/bin/env python3
"""Build the browse.html lazy-load data files + re-stamp its count block.

Ground truth (never page text):
  * data/systems.json        -> 121 seed records (name/tag/cat/sig)
  * data/drip/chunk-*.jsonl  -> generated models (drip canonical IDs JAH-PC-8xxxxxxx)
  * data/count.json          -> {seed, generated} authoritative counts

Writes (all under data/browse/):
  * seeds_<cat>_<LETTER>.json   tiny per-category letter files: [system_id, name, tag, sig_id, sig_name]
  * gen_<LETTER>_p<N>.json      generated models, lettered by name minus the
                                "Signature " prefix (all names share it), paged at 1000 rows
  * search.json                 compact search index [system_id, name, catkey] for all records
  * manifest.json               letters/pages/counts so browse.html can lazy-load

Also re-stamps the <!-- BROWSE-COUNT-START --> block in browse.html with the
REAL current count (seed + generated, as-of date). Called by
code/drip/append_models.py AFTER the data flush, so the stamp can never be
one run behind. Safe to re-run any time (deterministic output).
"""
import datetime
import glob
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "data")
BROWSE = os.path.join(DATA, "browse")
os.makedirs(BROWSE, exist_ok=True)

CATS = [
    ("historic", "Historic"),
    ("modern", "Modern"),
    ("quantum", "Quantum"),
    ("materials", "Materials & Substrates"),
    ("mixes", "Mixes"),
    ("predicted", "Predicted"),
    ("signature", "Signature-Developed"),
]
CAT_LABEL = dict(CATS)
PAGE_SIZE = 1000


def pad(n, w=8):
    s = str(n)
    return "0" * (w - len(s)) + s


def letter_of(name):
    return (name[0].upper() if name else "#")


def main():
    today = datetime.date.today().isoformat()
    seeds = json.load(open(os.path.join(DATA, "systems.json")))
    count = json.load(open(os.path.join(DATA, "count.json")))
    seed_n = len(seeds)
    gen_n = int(count.get("generated", 0))

    # ---- seeds: per-category letter files ----
    manifest_cats = {}
    search_rows = []
    for cat, label in CATS:
        recs = [r for r in seeds if r.get("cat") == cat]
        by_letter = {}
        for i, r in enumerate(recs):
            # base canonical id: seeds are in file order -> JAH-PC-90000001+i
            gi = seeds.index(r)
            sid = "JAH-PC-" + pad(90000001 + gi)
            sig = r.get("sig") or {}
            sig_id = "JAH-PC-" + pad(91000001 + gi)
            sig_name = sig.get("name") or ""
            if sig_name == r["name"]:
                sig_id, sig_name = None, None  # Signature original: no separate version
            L = letter_of(r["name"])
            by_letter.setdefault(L, []).append(
                [sid, r["name"], r.get("tag") or "", sig_id, sig_name])
            search_rows.append([sid, r["name"], cat])
            if sig_id:
                search_rows.append([sig_id, sig_name, "signature"])
        letters = {}
        for L in sorted(by_letter):
            rows = sorted(by_letter[L], key=lambda x: x[1].lower())
            fp = os.path.join(BROWSE, f"seeds_{cat}_{L}.json")
            json.dump(rows, open(fp, "w"), separators=(",", ":"))
            letters[L] = len(rows)
        manifest_cats[cat] = {"label": label, "letters": letters,
                              "total": sum(letters.values())}

    # ---- generated: letter files by name minus the shared "Signature " prefix ----
    gen_files = sorted(glob.glob(os.path.join(DATA, "drip", "chunk-*.jsonl")))
    gen_by_letter = {}
    for fp in gen_files:
        for line in open(fp):
            line = line.strip()
            if not line:
                continue
            r = json.loads(line)
            n = r.get("id", "")  # pcm-gen-000123
            try:
                k = int(n.rsplit("-", 1)[1])
            except Exception:
                continue
            sid = "JAH-PC-" + pad(80000000 + k)
            name = r.get("name", "")
            key = name[len("Signature "):] if name.startswith("Signature ") else name
            L = letter_of(key)
            gen_by_letter.setdefault(L, []).append([sid, name, r.get("tag") or ""])
            search_rows.append([sid, name, "generated"])
    gen_letters = {}
    for L in sorted(gen_by_letter):
        rows = sorted(gen_by_letter[L], key=lambda x: x[0])  # ID order = drip order
        pages = (len(rows) + PAGE_SIZE - 1) // PAGE_SIZE
        for p in range(pages):
            fp = os.path.join(BROWSE, f"gen_{L}_p{p + 1}.json")
            json.dump(rows[p * PAGE_SIZE:(p + 1) * PAGE_SIZE], open(fp, "w"),
                      separators=(",", ":"))
        gen_letters[L] = {"pages": pages, "total": len(rows)}
    if len(gen_by_letter) and sum(v["total"] for v in gen_letters.values()) != gen_n:
        print(f"WARNING: chunk rows != count.json generated "
              f"({sum(v['total'] for v in gen_letters.values())} vs {gen_n})",
              file=sys.stderr)

    # ---- compact search index (fetched only on first search use) ----
    json.dump(search_rows, open(os.path.join(BROWSE, "search.json"), "w"),
              separators=(",", ":"))

    total = seed_n + gen_n
    manifest = {"asof": today, "seed": seed_n, "generated": gen_n, "total": total,
                "cats": manifest_cats, "gen_letters": gen_letters}
    json.dump(manifest, open(os.path.join(BROWSE, "manifest.json"), "w"), indent=1)

    # ---- re-stamp browse.html count block (AFTER data flush: never one-run-behind) ----
    html_path = os.path.join(ROOT, "browse.html")
    if os.path.exists(html_path):
        html = open(html_path).read()
        block = (
            '<p class="kv" id="browsecount">The catalog below carries '
            f'<b id="bc_total">{total:,}</b> systems on file — '
            f'<b id="bc_seed">{seed_n}</b> seed records + '
            f'<b id="bc_gen">{gen_n:,}</b> generated models '
            f'<span class="hist">(as of {today}; live count refreshes from '
            '<a href="data/counts.json">data/counts.json</a>)</span></p>'
        )
        s_m, e_m = "<!-- BROWSE-COUNT-START -->", "<!-- BROWSE-COUNT-END -->"
        if s_m in html and e_m in html:
            html = (html.split(s_m)[0] + s_m + "\n" + block + "\n"
                    + e_m + html.split(e_m)[1])
            open(html_path, "w").write(html)
            print(f"BROWSE-COUNT: stamped ({total:,} = {seed_n} seed + {gen_n:,} gen, as of {today})")
        else:
            print("BROWSE-COUNT: markers not found in browse.html — skipped")
    else:
        print("BROWSE-COUNT: browse.html not present yet — skipped")

    print(f"BROWSE-INDEX: seed={seed_n} generated_rows="
          f"{sum(v['total'] for v in gen_letters.values())} "
          f"letters={sorted(gen_letters)} search_rows={len(search_rows)}")


if __name__ == "__main__":
    main()
