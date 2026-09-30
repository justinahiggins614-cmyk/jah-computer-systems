# The Signature PC System Depository

Manon's 9th website — every computer system from the most original machines to every possible model, marching to 1,000,000.

- `index.html` — the whole site (vault theme). `SITE_NAME` constant at the top of the inline script + `<title>` are the rename points.
- `data/systems.json` — ~120 hand-authored seed records (real history; predictions & Signature-developed clearly marked).
- `data/drip/` — combinatorial drip chunks (generated possible models).
- `data/count.json` — `{"seed": N, "generated": M}` counter source.
- `js/sims.js` — working simulators (abacus, gates, cpu4, stored, quantum, material) + per-record .js/.py code.
- `js/gen.js` — deterministic 1,000,000-model combinatorial space (`window.PCMODELS`).
- `code/drip/append_models.py` — 2h drip: appends a deterministic batch, updates count.json.

Every record ships: Signature version (the star — original design), working in-browser simulator to sample, copy/download .js + .py, "give this file to an AI and it will use it as a persona" notice, historical record as reference, patent link or honest "no linked patent" note. Quantum entries ship both a quantum simulator AND a classical replacement model.
