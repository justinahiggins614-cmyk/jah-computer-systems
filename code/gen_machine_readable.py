#!/usr/bin/env python3
"""Build the depository's machine-readable files (additive, never rewrites data).

Ground truth comes from the data files, never from page text:
  * data/systems.json           -> seed records (with .sig Signature versions)
  * data/drip/chunk-*.jsonl     -> generated records (each carries a .sig block)
  * data/count.json             -> {"seed": S, "generated": G} (written by the drip)
  * data/last-updated.json      -> drip stamp
  * js/sims.js CONTRACTS        -> simulator inventory (parsed statically)

Outputs (all under data/, all additive):
  counts.json       authoritative single count source (generated_at, dataset_version,
                    schema_version, last_drip_id, recorded_count, seed_count,
                    generated_count, signature_versions_count, historical_count,
                    signature_original_count, predicted_count, possible_model_count,
                    simulator_count, index_rows)
  manifest.json     dataset manifest: files, versions, entry points
  schema.json       JSON Schema for JAH-PC-RECORD/1.0 (canonical record contract)
  categories.json   category taxonomy with live record counts
  generators.json   generator inventory (SEED/1.0, DRIP/1.0, GEN/2.0, DRIP/2.0 policy)
  simulators.json   simulator inventory (SIM/1.0 contracts, SIMULATION ONLY)
  sources.json      source records (honest: JAH curatorial summaries, UNVERIFIED,
                    primary-source attachment pending; nothing invented)
  versions.json     version history of schema/generators/simulators (immutable
                    records: corrections arrive as new versions, never edits)
  hashes.json       sha256 of every data file (canonicalization rules documented
                    in methodology; verify with js/identity.js specHash)
  changelog.json    dated change log (schema + generator milestones)
  api.json          entry-point map for AI agents (records, counts, search, schemas)
  glossary.json     terminology: SYSTEM / SYSTEM RECORD / SEED RECORD /
                    SIGNATURE VERSION / GENERATED MODEL / PREDICTED CONCEPT /
                    SIMULATION / POSSIBLE MODEL / MODEL SPACE / CANONICAL MODEL
  test-vectors.json 10 drip generator test vectors (seed -> expected name);
                    the page's DRIP/1.0 ground truth, checked by code/qa.

Run after every drip (wired into code/drip/append_models.py). Never invents
historical facts or sources; unknowns are marked honestly.
"""
import datetime
import glob
import hashlib
import json
import os
import re
import sys
import zoneinfo

# Display-facing dates use Manon's timezone (America/New_York); the VM runs
# on UTC, which reads as tomorrow's date to him in the evening.
EDT = zoneinfo.ZoneInfo("America/New_York")

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "data")
BASE = "https://justinahiggins614-cmyk.github.io/jah-computer-systems/"
SCHEMA = "JAH-PC-RECORD/1.0"
ID_SCHEME = "JAH-PC-ID/1.0"


def load_json(path):
    with open(path) as f:
        return json.load(f)


def sha256_file(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def drip_records():
    recs = []
    for p in sorted(glob.glob(os.path.join(DATA, "drip", "chunk-*.jsonl"))):
        with open(p) as f:
            for line in f:
                line = line.strip()
                if line:
                    recs.append(json.loads(line))
    return recs


def main():
    today = datetime.datetime.now(EDT).date().isoformat()
    now = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    seeds = load_json(os.path.join(DATA, "systems.json"))
    count = load_json(os.path.join(DATA, "count.json"))
    drips = drip_records()
    stamp = load_json(os.path.join(DATA, "last-updated.json")) if os.path.exists(
        os.path.join(DATA, "last-updated.json")) else {}

    seed_n = count.get("seed", len(seeds))
    gen_n = count.get("generated", len(drips))
    recorded = seed_n + gen_n
    kinds = {}
    for r in seeds:
        kinds[r.get("kind", "historical")] = kinds.get(r.get("kind", "historical"), 0) + 1
    sig_seed_n = sum(1 for r in seeds if r.get("sig"))
    sig_versions = sig_seed_n + gen_n  # every record carries a Signature-made version

    # simulator inventory: parse CONTRACTS block statically from js/sims.js
    sims_js = open(os.path.join(ROOT, "js", "sims.js")).read()
    sim_keys = sorted(set(re.findall(r"^\s{6}(\w+):\s*\{", sims_js, re.M)))
    contract_names = sorted(set(re.findall(r"(\w+):\s*\{\s*SIMULATOR_STATUS", sims_js)))

    # ---------------- counts.json ----------------
    counts = {
        "feed": "counts",
        "generated_at": now,
        "snapshot_id": f"JAH-PC-COUNT-{today.replace('-', '')}-{recorded:08d}",
        "dataset_version": today,
        "schema_version": SCHEMA,
        "id_scheme": ID_SCHEME,
        "last_drip_id": stamp.get("source", "PC depository drip (code/drip/append_models.py)"),
        "records_added_last_drip": None,  # drip sets this when it runs
        "recorded_count": recorded,
        "seed_count": seed_n,
        "generated_count": gen_n,
        "signature_versions_count": sig_versions,
        "historical_count": kinds.get("historical", 0),
        "signature_original_count": kinds.get("signature", 0),
        "predicted_count": kinds.get("predicted", 0) + gen_n,
        "possible_model_count": 1000000,
        "simulator_count": len(contract_names) or len(sim_keys),
        "note": "recorded_count counts RECORDS on file (seed records + generated records). "
                "signature_versions_count counts the Signature-made VERSION of each record "
                "(121 seed Signature versions + 12,400 generated Signature versions). "
                "possible_model_count is the generatable model space, computed on demand, "
                "never stored. historical/signature_original/predicted split applies to the "
                "seed records only; all generated records are predicted concepts.",
    }
    json.dump(counts, open(os.path.join(DATA, "counts.json"), "w"), indent=1)
    print(f"counts.json: recorded={recorded} (seed={seed_n} generated={gen_n}) sig_versions={sig_versions}")

    # ---------------- manifest.json ----------------
    data_files = []
    for rel in ["systems.json", "count.json", "counts.json", "last-updated.json",
                "systems-index.json", "wiki-index.json"]:
        p = os.path.join(DATA, rel)
        if os.path.exists(p):
            data_files.append({"path": f"data/{rel}", "sha256": sha256_file(p),
                               "bytes": os.path.getsize(p)})
    chunk_files = sorted(glob.glob(os.path.join(DATA, "drip", "chunk-*.jsonl")))
    data_files.append({"path": "data/drip/chunk-*.jsonl", "chunks": len(chunk_files),
                       "records": gen_n,
                       "sha256_first_chunk": sha256_file(chunk_files[0]) if chunk_files else None})
    manifest = {
        "feed": "manifest",
        "generated_at": now,
        "dataset": "THE SIGNATURE PC SYSTEM DEPOSITORY",
        "base": BASE,
        "id_scheme": ID_SCHEME,
        "record_schema": SCHEMA,
        "governance": "JAH-SIGNATURE (own authority — not government, not USPTO, never a granted patent)",
        "entry_points": {
            "human": BASE,
            "counts": BASE + "data/counts.json",
            "manifest": BASE + "data/manifest.json",
            "schema": BASE + "data/schema.json",
            "api": BASE + "data/api.json",
            "llms": BASE + "llms.txt",
            "sitemap": BASE + "sitemap.xml",
        },
        "data_files": data_files,
        "machine_readable": ["counts.json", "schema.json", "categories.json", "generators.json",
                             "simulators.json", "sources.json", "versions.json", "hashes.json",
                             "changelog.json", "api.json", "glossary.json", "test-vectors.json"],
    }
    json.dump(manifest, open(os.path.join(DATA, "manifest.json"), "w"), indent=1)

    # ---------------- schema.json (JAH-PC-RECORD/1.0) ----------------
    schema = {
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "$id": BASE + "data/schema.json",
        "title": "JAH-PC-RECORD/1.0",
        "description": "Canonical record contract for The Signature PC System Depository. "
                       "Every system record carries exactly one canonical JAH-PC-######## ID. "
                       "Records are immutable: corrections arrive as new versions, never edits.",
        "type": "object",
        "required": ["system_id", "id_scheme", "system_type", "name", "record_schema"],
        "properties": {
            "system_id": {"type": "string", "pattern": "^JAH-PC-\\d{8}$",
                          "description": "Canonical permanent ID. Ranges: 00000001-01000000 on-demand "
                                         "possible models; 80000001+ drip-generated; 90000001+ seed base "
                                         "records; 91000001+ Signature versions of seeds. Never reassigned."},
            "id_scheme": {"type": "string", "const": "JAH-PC-ID/1.0"},
            "record_schema": {"type": "string", "const": "JAH-PC-RECORD/1.0"},
            "system_type": {"type": "string",
                            "enum": ["HISTORICAL", "SIGNATURE_ORIGINAL", "PREDICTED", "GENERATED", "HYBRID"],
                            "description": "HISTORICAL = record of a machine that existed (reference only). "
                                           "SIGNATURE_ORIGINAL = original Signature System design. "
                                           "PREDICTED = forward-looking concept (speculation). "
                                           "GENERATED = deterministically generated possible model. "
                                           "HYBRID = hybrid-architecture system."},
            "name": {"type": "string", "description": "Display name (Signature name where a Signature version exists)."},
            "original_name": {"type": ["string", "null"],
                              "description": "Historical system's own name (historical records only); "
                                             "null where there is no historical original."},
            "signature_name": {"type": ["string", "null"],
                               "description": "The Signature-made version's name; null where no Signature version exists."},
            "era": {"type": ["string", "null"]},
            "tag": {"type": ["string", "null"]},
            "desc": {"type": ["string", "null"]},
            "history": {"type": ["string", "null"],
                        "description": "Curatorial summary. Never a reworded copy of another's patent text."},
            "generator_version": {"type": ["string", "null"],
                                  "description": "SEED/1.0 (curated seeds), DRIP/1.0 (drip-generated), "
                                                 "GEN/2.0 (on-demand lattice). Versioned algorithm: a rule "
                                                 "change ships a new version, never a silent edit."},
            "generation_seed": {"type": ["integer", "null"],
                                "description": "Deterministic seed; same seed + generator version = same record."},
            "spec_hash": {"type": "string", "pattern": "^sha256:[0-9a-f]{64}$",
                          "description": "SHA-256 over canonical JSON (sorted keys, no whitespace, UTF-8). "
                                         "Verify with js/identity.js PCIDENT.specHash."},
            "provenance": {"type": "object",
                           "description": "SOURCE_TYPE / SOURCE_TITLE / CLAIM_SCOPE / VERIFICATION_STATE. "
                                          "Historical records: UNVERIFIED until primary sources attach; "
                                          "no source is ever invented."},
            "buildability": {"type": "object"},
            "governance": {"type": "object",
                           "description": "JAH-SIGNATURE identity chain. Never government, never USPTO."},
            "simulator": {"type": ["string", "null"],
                          "description": "Simulator key rendering this record. Every simulator is "
                                         "SIMULATION ONLY (SIM/1.0) — a representative model, never "
                                         "a claim the hardware exists."},
            "xrefs": {"type": "object",
                      "description": "Cross-site ID slots. Reserved slots stay null until a sibling "
                                     "catalog indexes the ID; sibling IDs are never invented."},
        },
    }
    json.dump(schema, open(os.path.join(DATA, "schema.json"), "w"), indent=1)

    # ---------------- categories.json ----------------
    cat_counts = {}
    for r in seeds:
        c = (r.get("cat") or "uncategorized").lower()
        cat_counts[c] = cat_counts.get(c, 0) + 1
    categories = {
        "feed": "categories",
        "generated_at": now,
        "note": "Category labels are derived from each record's own name/tag/description text — "
                "never assigned by hand, never invented specs. Counts cover seed records; "
                "generated records carry scale-derived form tags (Rack->MAINFRAME, "
                "Cluster/Wafer-Scale->SUPERCOMPUTER, else PC).",
        "categories": [{"name": k.upper(), "seed_records": v} for k, v in sorted(cat_counts.items())],
        "generated_record_tags": {"MAINFRAME": "Rack scale", "SUPERCOMPUTER": "Cluster / Wafer-Scale",
                                  "PC": "Board / Chiplet"},
    }
    json.dump(categories, open(os.path.join(DATA, "categories.json"), "w"), indent=1)

    # ---------------- generators.json ----------------
    generators = {
        "feed": "generators",
        "generated_at": now,
        "note": "Deterministic reproduction package: generator version + seed are stored per "
                "record. A rule change ships a new version (DRIP/2.0 on change), never a silent edit.",
        "generators": [
            {"version": "SEED/1.0", "role": "curated seed records",
             "impl": "data/systems.json (hand-curated by the depository)",
             "deterministic": True, "records": seed_n},
            {"version": "DRIP/1.0", "role": "drip-generated combinatorial models",
             "impl": "code/drip/append_models.py",
             "seed_scheme": "random.Random(10_000_000 + i) for model i (0-based); "
                            "ARCH/MATS/WIDTHS/SCALES choice order fixed",
             "deterministic": True, "records": gen_n,
             "id_range": "JAH-PC-80000001 and up (pcm-gen-NNNNNN -> 80000000+N)"},
            {"version": "GEN/2.0", "role": "on-demand combinatorial lattice",
             "impl": "js/gen.js (mixed-radix decode over 8x10x8x8x10x8x10 lattice)",
             "seed_scheme": "model number N (1..1000000) is the input; "
                            "random seeds map via PCIDENT.seedToModelNumber (mulberry32)",
             "deterministic": True, "records": 0, "stored": 0,
             "note": "Computed on demand in the browser. Nothing stored, nothing slow.",
             "id_range": "JAH-PC-00000001 .. JAH-PC-01000000"},
        ],
        "reference_implementation": "code/drip/append_models.py (DRIP/1.0), js/gen.js + js/identity.js (GEN/2.0)",
        "test_vectors": BASE + "data/test-vectors.json",
    }
    json.dump(generators, open(os.path.join(DATA, "generators.json"), "w"), indent=1)

    # ---------------- simulators.json ----------------
    simulators = {
        "feed": "simulators",
        "generated_at": now,
        "version": "SIM/1.0",
        "safety": "SIMULATION ONLY — every simulator is a representative model illustrating "
                  "an architecture class, never a claim the hardware exists or an accurate "
                  "emulation of a historical machine.",
        "simulators": [{"key": k, "contract": BASE + "data/simulators.json#" + k} for k in contract_names] or
                      [{"key": k} for k in sim_keys],
        "impl": "js/sims.js",
        "coverage": "every system on file ships a working in-browser simulator",
    }
    json.dump(simulators, open(os.path.join(DATA, "simulators.json"), "w"), indent=1)

    # ---------------- sources.json ----------------
    sources = {
        "feed": "sources",
        "generated_at": now,
        "note": "Honest source ledger. No source is ever invented: primary sources not yet "
                "attached are marked UNVERIFIED with PRIMARY_SOURCE_AVAILABLE=false. "
                "Historical records remain reference-only curatorial summaries until then.",
        "sources": [
            {"source_id": "JAH-PC-SOURCE-000001",
             "source_type": "JAH curatorial summary",
             "title": "Depository curatorial records (data/systems.json)",
             "covers": f"{seed_n} seed records",
             "claim_scope": "General description; dates approximate",
             "verification_state": "UNVERIFIED — primary sources not yet attached",
             "primary_source_available": False},
            {"source_id": "JAH-PC-SOURCE-000002",
             "source_type": "deterministic derivation",
             "title": "Depository combinatorial engine (code/drip/append_models.py, DRIP/1.0)",
             "covers": f"{gen_n} generated records",
             "claim_scope": "Possible models — not evidence of existence",
             "verification_state": "n/a — generated; reproducible from seed + generator version",
             "primary_source_available": False},
            {"source_id": "JAH-PC-SOURCE-000003",
             "source_type": "JAH original design",
             "title": "Signature System design records (.sig blocks)",
             "covers": f"{sig_versions} Signature versions",
             "claim_scope": "Design record only — never a historical claim",
             "verification_state": "JAH-SIGNATURE-RECORDED",
             "primary_source_available": True,
             "note": "The Signature System's own design authority; recorded 2026-09-30."},
        ],
    }
    json.dump(sources, open(os.path.join(DATA, "sources.json"), "w"), indent=1)

    # ---------------- versions.json ----------------
    versions = {
        "feed": "versions",
        "generated_at": now,
        "note": "Records are immutable: corrections arrive as NEW versions, never edits. "
                "No record has needed a corrected version yet; the ledger stands ready.",
        "record_schema": [{"version": "JAH-PC-RECORD/1.0", "since": "2026-09-30", "status": "current"}],
        "id_scheme": [{"version": "JAH-PC-ID/1.0", "since": "2026-09-30", "status": "current"}],
        "generators": [{"version": "SEED/1.0", "since": "2026-09-30", "status": "current"},
                       {"version": "DRIP/1.0", "since": "2026-09-30", "status": "current"},
                       {"version": "GEN/2.0", "since": "2026-09-30", "status": "current",
                        "note": "lattice unchanged since GEN/1.0; version bumped for the governance wrapper"}],
        "simulators": [{"version": "SIM/1.0", "since": "2026-09-30", "status": "current"}],
        "validity_rules": [{"version": "PC-VALIDITY/1.0", "since": "2026-09-30", "status": "current",
                            "note": "first-pass manufacturability heuristics, not fabrication guarantees"}],
    }
    json.dump(versions, open(os.path.join(DATA, "versions.json"), "w"), indent=1)

    # ---------------- hashes.json ----------------
    hashes = {"feed": "hashes", "generated_at": now,
              "algorithm": "sha256",
              "canonicalization": "files are hashed as stored bytes; record spec_hash uses canonical "
                                  "JSON (sorted keys, no whitespace, UTF-8) per js/identity.js canonJSON. "
                                  "Verify a record's hash in the browser with VERIFY HASH on its file page.",
              "files": {}}
    for rel in ["systems.json", "count.json", "counts.json", "last-updated.json",
                "systems-index.json", "wiki-index.json", "schema.json", "categories.json",
                "generators.json", "simulators.json", "sources.json", "versions.json",
                "changelog.json", "api.json", "glossary.json", "test-vectors.json"]:
        p = os.path.join(DATA, rel)
        if os.path.exists(p):
            hashes["files"][f"data/{rel}"] = "sha256:" + sha256_file(p)
    if chunk_files:
        hashes["files"]["data/drip/chunk-0000.jsonl (first)"] = "sha256:" + sha256_file(chunk_files[0])
        hashes["files"]["data/drip/chunk-%04d.jsonl (last)" % (len(chunk_files) - 1)
                        ] = "sha256:" + sha256_file(chunk_files[-1])
    json.dump(hashes, open(os.path.join(DATA, "hashes.json"), "w"), indent=1)

    # ---------------- changelog.json ----------------
    changelog_path = os.path.join(DATA, "changelog.json")
    if os.path.exists(changelog_path):
        changelog = load_json(changelog_path)
    else:
        changelog = {"feed": "changelog", "entries": [
            {"date": "2026-09-30", "event": "Depository opened: 121 curated seed records, "
             "JAH-PC-RECORD/1.0, JAH-PC-ID/1.0, DRIP/1.0, GEN/2.0, SIM/1.0"},
            {"date": "2026-10-03", "event": "Authoritative counts.json + full machine-readable "
             "suite (manifest/schema/api/llms.txt) published; count snapshot, data version, "
             "and last/next drip shown on page"},
        ]}
    changelog["generated_at"] = now
    json.dump(changelog, open(changelog_path, "w"), indent=1)

    # ---------------- api.json ----------------
    api = {
        "feed": "api",
        "generated_at": now,
        "name": "THE SIGNATURE PC SYSTEM DEPOSITORY — machine entry points",
        "routes": [
            {"path": "/", "method": "GET", "desc": "Human home page; every record opens via ?system=JAH-PC-########"},
            {"path": "/?system={id}", "method": "GET",
             "desc": "Record page. id = JAH-PC-######## (canonical), legacy sys-* / pcm-gen-NNNNNN also resolve."},
            {"path": "/?seed={n}", "method": "GET", "desc": "Shareable random-model link; seed n re-opens the same model."},
            {"path": "/?model={n}", "method": "GET", "desc": "On-demand possible model #n (1..1000000)."},
            {"path": "/?cat={FILTER}", "method": "GET", "desc": "Category browse (see data/categories.json)."},
            {"path": "/?q={query}", "method": "GET", "desc": "Search (names, tags, descriptions, IDs)."},
            {"path": "/data/counts.json", "method": "GET", "desc": "Authoritative counts (single source of truth)."},
            {"path": "/data/schema.json", "method": "GET", "desc": "JAH-PC-RECORD/1.0 JSON Schema."},
            {"path": "/data/manifest.json", "method": "GET", "desc": "Dataset manifest."},
            {"path": "/data/api.json", "method": "GET", "desc": "This file."},
        ],
        "record_contract": BASE + "data/schema.json",
        "counts": BASE + "data/counts.json",
        "note": "No API keys. No write endpoints. Records are immutable; corrections arrive as new versions.",
    }
    json.dump(api, open(os.path.join(DATA, "api.json"), "w"), indent=1)

    # ---------------- glossary.json ----------------
    glossary = {
        "feed": "glossary",
        "generated_at": now,
        "terms": {
            "SYSTEM": "A complete computer system (machine), as defined by the depository scope.",
            "SYSTEM RECORD": "The canonical JAH-PC-RECORD/1.0 entry for one system: exactly one "
                             "canonical JAH-PC-######## ID, one system_type, one spec_hash.",
            "SEED RECORD": "One of the 121 curated base records in data/systems.json — the "
                           "depository's recorded file for a system.",
            "SIGNATURE VERSION": "The Signature-made version of a record (.sig block): an original "
                                 "Signature System design inspired by (never claiming to be) the base "
                                 "system. Every record on file carries one.",
            "GENERATED MODEL": "A deterministically generated possible model from the combinatorial "
                               "space (DRIP/1.0 records or GEN/2.0 on-demand). Not evidence the machine "
                               "exists or was built.",
            "PREDICTED CONCEPT": "A forward-looking concept record. Speculation, not history, not "
                                 "evidence of existence.",
            "HISTORICAL RECORD": "A record of a machine that existed, per cited curatorial summaries. "
                                 "Reference only; primary-source attachment pending.",
            "SIMULATION": "The working in-browser model attached to a record (SIM/1.0, SIMULATION ONLY). "
                          "Sampling it never claims the hardware exists.",
            "POSSIBLE MODEL": "One of the 1,000,000 models addressable in the on-demand lattice "
                              "(JAH-PC-00000001 .. JAH-PC-01000000).",
            "MODEL SPACE": "The full 1,000,000-model generatable space: components x architectures x "
                           "materials x scales, computed on demand, never stored.",
            "CANONICAL MODEL": "The one deterministic record that an ID always resolves to — opening "
                               "the same ID yields the identical record, forever.",
            "RECORDED": f"Systems on file: {recorded:,} records ({seed_n} seed + {gen_n:,} generated).",
            "ORIGINAL_NAME": "A historical system's own name (e.g. Apple I) — kept separate from the "
                             "Signature version's name on every historical record.",
            "SIGNATURE_NAME": "The Signature-made version's name (e.g. Signature Garage Board).",
        },
    }
    json.dump(glossary, open(os.path.join(DATA, "glossary.json"), "w"), indent=1)

    # ---------------- test-vectors.json ----------------
    import random as pyrandom
    ARCH = ["von Neumann", "Harvard", "Dataflow", "Neuromorphic", "Systolic Array",
            "Quantum-Classical Hybrid", "Analog-Digital", "Photonic Mesh"]
    MATS = ["Silicon", "Germanium", "GaAs", "Graphene", "Diamond", "SiC", "Photonic SiN", "Memristor"]
    WIDTHS = [4, 8, 16, 32, 64, 128]
    SCALES = ["Board", "Rack", "Cluster", "Wafer-Scale", "Chiplet"]
    vectors = []
    for i in range(10):
        rng = pyrandom.Random(10_000_000 + i)
        arch = rng.choice(ARCH); mat = rng.choice(MATS)
        w = rng.choice(WIDTHS); sc = rng.choice(SCALES)
        vectors.append({
            "drip_index": i,
            "drip_seed": 10_000_000 + i,
            "record_id": f"pcm-gen-{i + 1:06d}",
            "canonical_id": f"JAH-PC-{80000000 + i + 1:08d}",
            "expected_name": f"Signature {mat} {arch} {w}-bit {sc} Unit {i + 1:06d}",
            "generator_version": "DRIP/1.0",
        })
    # verify against the actual stored records (ground truth, not page text)
    mismatches = []
    by_id = {r["id"]: r for r in drips}
    for v in vectors:
        actual = by_id.get(v["record_id"], {}).get("name")
        v["stored_name_matches"] = (actual == v["expected_name"])
        if not v["stored_name_matches"]:
            mismatches.append(v["record_id"])
    test_vectors = {
        "feed": "test-vectors",
        "generated_at": now,
        "generator_version": "DRIP/1.0",
        "rule": "model i uses random.Random(10_000_000 + i); choices drawn in order ARCH, MATS, WIDTHS, SCALES",
        "vectors": vectors,
        "all_stored_match": not mismatches,
        "mismatches": mismatches,
    }
    json.dump(test_vectors, open(os.path.join(DATA, "test-vectors.json"), "w"), indent=1)
    print(f"test-vectors: 10 vectors, stored match={not mismatches} {mismatches}")

    print("machine-readable suite written.")


if __name__ == "__main__":
    main()
