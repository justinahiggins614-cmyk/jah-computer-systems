#!/usr/bin/env python3
"""Build sitemap-records-1.xml from data/systems.json (?system= deep links)."""
import json, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = "https://justinahiggins614-cmyk.github.io/jah-computer-systems/"
recs = json.load(open(os.path.join(ROOT, "data", "systems.json")))
def pad(n, w):
    s = str(n)
    return "0" * (w - len(s)) + s
# legacy IDs + canonical permanent IDs (JAH-PC-90000001 base, JAH-PC-91000001 Signature)
urls = []
for i, r in enumerate(recs):
    urls.append(f"  <url><loc>{BASE}?system={r['id']}</loc></url>")
    urls.append(f"  <url><loc>{BASE}?system=JAH-PC-{pad(90000001 + i, 8)}</loc></url>")
    if r.get("sig"):
        urls.append(f"  <url><loc>{BASE}?system=JAH-PC-{pad(91000001 + i, 8)}</loc></url>")
xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + "\n".join(urls) + "\n</urlset>\n"
open(os.path.join(ROOT, "sitemap-records-1.xml"), "w").write(xml)
print(f"sitemap: {len(urls)} record URLs (legacy + canonical)")
