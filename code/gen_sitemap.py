#!/usr/bin/env python3
"""Build sitemap-records-1.xml: every recorded system (?system=JAH-PC-######## deep
links) + every category page (?cat=) + the root page.

Ground truth comes from data files, never from page text:
  * data/systems.json -> 121 seed records (legacy id, base canonical, Signature canonical)
  * data/count.json   -> {"seed": S, "generated": G}; drip canonical IDs JAH-PC-(80000000+n)
Every listed URL is a query on index.html, which returns HTTP 200.
Run after every drip so new generated models appear in the sitemap."""
import datetime
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = "https://justinahiggins614-cmyk.github.io/jah-computer-systems/"
today = datetime.date.today().isoformat()


def pad(n, w):
    s = str(n)
    return "0" * (w - len(s)) + s


def seed_ids():
    recs = json.load(open(os.path.join(ROOT, "data", "systems.json")))
    out = []
    for i, r in enumerate(recs):
        out.append(f"{BASE}?system={r['id']}")                    # legacy id (resolves)
        out.append(f"{BASE}?system=JAH-PC-{pad(90000001 + i, 8)}")  # base canonical
        if r.get("sig"):
            out.append(f"{BASE}?system=JAH-PC-{pad(91000001 + i, 8)}")  # Signature canonical
    return out


def drip_ids():
    count = json.load(open(os.path.join(ROOT, "data", "count.json")))
    g = int(count.get("generated", 0))
    return [f"{BASE}?system=JAH-PC-{pad(80000000 + n, 8)}" for n in range(1, g + 1)]


def category_urls():
    # categories mirror PCUI.FILTERS (minus ALL); each is a real link (?cat=)
    cats = ["HISTORICAL", "MAINFRAME", "DESKTOP", "LAPTOP", "WORKSTATION", "SERVER",
            "SUPERCOMPUTER", "MOBILE", "EMBEDDED", "PC", "QUANTUM", "ANALOG",
            "MECHANICAL", "EXPERIMENTAL", "SIGNATURE", "PREDICTED", "GENERATED"]
    return [f"{BASE}?cat={c}" for c in cats]


def main():
    urls = [BASE, BASE + "browse.html"] + category_urls() + seed_ids() + drip_ids()
    lines = ['<?xml version="1.0" encoding="UTF-8"?>',
             '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for u in urls:
        lines.append(f"  <url><loc>{u}</loc><lastmod>{today}</lastmod></url>")
    lines.append("</urlset>")
    out = os.path.join(ROOT, "sitemap-records-1.xml")
    with open(out, "w") as f:
        f.write("\n".join(lines) + "\n")
    print(f"sitemap: {len(urls)} URLs "
          f"(1 root + 1 browse page + {len(category_urls())} categories + {len(seed_ids())} seed + {len(drip_ids())} drip)")


if __name__ == "__main__":
    sys.exit(main())
