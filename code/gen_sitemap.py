#!/usr/bin/env python3
"""Build sitemap-records-1.xml from data/systems.json (?system= deep links)."""
import json, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = "https://justinahiggins614-cmyk.github.io/jah-computer-systems/"
recs = json.load(open(os.path.join(ROOT, "data", "systems.json")))
urls = [f"  <url><loc>{BASE}?system={r['id']}</loc></url>" for r in recs]
xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + "\n".join(urls) + "\n</urlset>\n"
open(os.path.join(ROOT, "sitemap-records-1.xml"), "w").write(xml)
print(f"sitemap: {len(urls)} record URLs")
