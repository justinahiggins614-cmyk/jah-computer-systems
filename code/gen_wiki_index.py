#!/usr/bin/env python3
"""Emit data/wiki-index.json — machine-readable index for JAH Wiki listings/search.
Each row: id, title, category, summary, url. Regenerated on every drip + build."""
import json, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = "https://justinahiggins614-cmyk.github.io/jah-computer-systems/"
recs = json.load(open(os.path.join(ROOT, "data", "systems.json")))
CATS = {"historic": "Historic Machines", "modern": "Modern Systems",
        "quantum": "Quantum Systems", "materials": "Materials & Substrates",
        "mixes": "Mixes", "predicted": "Predicted Models",
        "signature": "Signature-Developed"}
idx = [{"id": r["id"],
        "title": (r.get("sig") or {}).get("name") or r["name"],
        "category": CATS.get(r.get("cat"), r.get("cat")),
        "summary": (r.get("tag") or "") + " — " + (r.get("desc") or ""),
        "url": BASE + "?system=" + r["id"]} for r in recs]
os.makedirs(os.path.join(ROOT, "data"), exist_ok=True)
json.dump(idx, open(os.path.join(ROOT, "data", "wiki-index.json"), "w"))
print(f"wiki-index: {len(idx)} rows -> data/wiki-index.json")
