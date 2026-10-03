#!/usr/bin/env python3
"""Stamp a <noscript> static category index into index.html
(Site-9 diagnostic FIX-3) for The Signature PC System Depository.

Core category landing pages are ?cat= query URLs on index.html; lightweight
bots never run the JS that renders the Grand List. This block gives crawlers
pre-rendered static HTML tables per category with direct ?system= deep links.

Category derivation mirrors js/pcui.js tagsFor/matchesFilter (regex port) —
labels derived from each record's own name/tag/description text, never
invented. Top 12 records per category, alphabetical. Refreshed by the 2h drip
(via code/drip/append_models.py) between the STATIC-CATS markers.
"""
import glob
import html
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "data")
BASE = "https://justinahiggins614-cmyk.github.io/jah-computer-systems/"

FILTERS = ["HISTORICAL", "MAINFRAME", "DESKTOP", "LAPTOP", "WORKSTATION",
           "SERVER", "SUPERCOMPUTER", "MOBILE", "EMBEDDED", "PC", "QUANTUM",
           "ANALOG", "MECHANICAL", "EXPERIMENTAL", "SIGNATURE", "PREDICTED",
           "GENERATED"]


def tags_for(rec):
    """Python port of PCUI.tagsFor — categories from the record's own text."""
    t = []
    s = ((rec.get("name") or "") + " " + (rec.get("tag") or "") + " " +
         (rec.get("desc") or "")).lower()

    def has(p):
        return re.search(p, s)

    if has(r"mainframe"):
        t.append("MAINFRAME")
    if has(r"supercomputer|exascale|\bcluster\b"):
        t.append("SUPERCOMPUTER")
    if has(r"workstation"):
        t.append("WORKSTATION")
    if has(r"\bserver\b"):
        t.append("SERVER")
    if has(r"embedded|microcontroller"):
        t.append("EMBEDDED")
    if has(r"experimental|prototype"):
        t.append("EXPERIMENTAL")
    if has(r"laptop|notebook"):
        t.append("LAPTOP")
    if has(r"desktop"):
        t.append("DESKTOP")
    if rec.get("cat") == "quantum" or has(r"quantum"):
        t.append("QUANTUM")
    if has(r"analog"):
        t.append("ANALOG")
    if has(r"mechanical|geared|\bbead\b|abacus|pascaline|difference engine"):
        t.append("MECHANICAL")
    if has(r"smartphone|mobile|handheld|tablet|wearable|phone"):
        t.append("MOBILE")
    if has(r"personal computer|\bpc\b|desktop|laptop"):
        t.append("PC")
    return t


def seed_type(rec):
    if rec.get("cat") == "mixes":
        return "HYBRID"
    return {"historical": "HISTORICAL", "signature": "SIGNATURE_ORIGINAL",
            "predicted": "PREDICTED"}.get(rec.get("kind"), "HISTORICAL")


def drip_tags(rec):
    scm = re.search(r"at ([\w-]*) scale", rec.get("desc") or "")
    sc = scm.group(1) if scm else ""
    if sc == "Rack":
        return ["MAINFRAME"]
    if sc in ("Cluster", "Wafer-Scale"):
        return ["SUPERCOMPUTER"]
    return ["PC"]


def matches(rec, f):
    st = rec["_st"]
    if f == "HISTORICAL":
        return st == "HISTORICAL"
    if f == "SIGNATURE":
        return st == "SIGNATURE_ORIGINAL"
    if f == "PREDICTED":
        return st == "PREDICTED"
    if f == "GENERATED":
        return st == "GENERATED"
    return f in rec["_tags"]


def collect():
    recs = []
    seeds = json.load(open(os.path.join(DATA, "systems.json")))
    for i, r in enumerate(seeds):
        recs.append({"_sid": "JAH-PC-%08d" % (90000001 + i),
                     "_st": seed_type(r), "_tags": tags_for(r),
                     "name": r.get("name") or r.get("id"),
                     "tag": r.get("tag") or ""})
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
                recs.append({"_sid": "JAH-PC-%08d" % (80000000 + n) if n else rid,
                             "_st": "GENERATED", "_tags": drip_tags(r),
                             "name": r.get("name") or rid,
                             "tag": r.get("tag") or ""})
    return recs


def main():
    recs = collect()
    parts = ["<noscript>", '<div class="hud" id="static-cats">',
             "<h2>SYSTEM CATEGORIES — STATIC INDEX</h2>",
             '<p class="kv hist">Static snapshot for crawlers (refreshed by the depository drip every 2 hours); '
             'the live Grand List above updates in your browser.</p>']
    for f in FILTERS:
        cand = sorted((r for r in recs if matches(r, f)),
                      key=lambda r: r["name"].lower())[:12]
        parts.append("<h3>" + f + "</h3>")
        if not cand:
            parts.append('<p class="kv hist">No records in this category yet.</p>')
            continue
        parts.append('<table style="width:100%;border-collapse:collapse;font-size:13px">')
        for r in cand:
            parts.append(
                '<tr><td style="border-bottom:1px solid #16324f;padding:5px 8px;width:62%">'
                '<a href="?system=' + html.escape(r["_sid"]) + '">' +
                html.escape(r["name"]) + '</a></td>'
                '<td style="border-bottom:1px solid #16324f;padding:5px 8px;color:#8fb8d8">'
                + html.escape(r["tag"]) + '</td></tr>')
        parts.append("</table>")
    parts += ["</div>", "</noscript>"]
    block = "\n".join(parts)

    html_path = os.path.join(ROOT, "index.html")
    page = open(html_path, encoding="utf-8").read()
    start_m, end_m = "<!-- STATIC-CATS-START -->", "<!-- STATIC-CATS-END -->"
    if start_m not in page or end_m not in page:
        print("STATIC-CATS: markers not found in index.html — skipped")
        return
    pre = page.split(start_m)[0] + start_m + "\n"
    post = "\n" + end_m + page.split(end_m)[1]
    open(html_path, "w", encoding="utf-8").write(pre + block + post)
    print(f"STATIC-CATS: index.html refreshed ({len(recs)} records indexed)")


if __name__ == "__main__":
    sys.exit(main())
