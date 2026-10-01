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
def system_type_of(r):
    if r.get("cat") == "mixes":
        return "HYBRID"
    return {"historical": "HISTORICAL", "signature": "SIGNATURE_ORIGINAL",
            "predicted": "PREDICTED"}.get(r.get("kind"), "HISTORICAL")

idx = [{"id": r["id"],
        "system_id": "JAH-PC-%08d" % (90000001 + i),   # canonical ID (JAH-PC-ID/1.0)
        "system_type": system_type_of(r),
        "title": (r.get("sig") or {}).get("name") or r["name"],
        "category": CATS.get(r.get("cat"), r.get("cat")),
        "summary": (r.get("tag") or "") + " — " + (r.get("desc") or ""),
        "url": BASE + "?system=" + "JAH-PC-%08d" % (90000001 + i)} for i, r in enumerate(recs)]
os.makedirs(os.path.join(ROOT, "data"), exist_ok=True)
json.dump(idx, open(os.path.join(ROOT, "data", "wiki-index.json"), "w"))
print(f"wiki-index: {len(idx)} rows -> data/wiki-index.json")
