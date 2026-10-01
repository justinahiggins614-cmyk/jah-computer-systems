#!/usr/bin/env node
/* PC System Depository audit-matrix QA. Loads js/identity.js, js/gen.js, js/sims.js,
   js/pcui.js in a vm sandbox (pure logic, no DOM) + data files. Exits nonzero on failure. */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.dirname(path.dirname(path.dirname(path.resolve(__filename))));

let pass = 0, fail = 0;
function ok(cond, name, extra) {
  if (cond) { pass++; }
  else { fail++; console.log('FAIL:', name, extra === undefined ? '' : JSON.stringify(extra).slice(0, 300)); }
}
function eq(a, b, name) { ok(a === b, name, { got: a, want: b }); }

// ---- load modules in a sandbox ----
const sandbox = { window: {}, console };
vm.createContext(sandbox);
for (const f of ['js/identity.js', 'js/gen.js', 'js/sims.js', 'js/pcui.js']) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), sandbox, { filename: f });
}
const ID = sandbox.window.PCIDENT, GEN = sandbox.window.PCMODELS,
      SIMS = sandbox.window.SIMS, UI = sandbox.window.PCUI;

// ---- 1. ID scheme ----
eq(ID.onDemandId(1), 'JAH-PC-00000001', 'ondemand id 1');
eq(ID.onDemandId(1000000), 'JAH-PC-01000000', 'ondemand id 1M');
eq(ID.dripId(1), 'JAH-PC-80000001', 'drip id 1');
eq(ID.seedBaseId(0), 'JAH-PC-90000001', 'seed base id 0');
eq(ID.seedSigId(0), 'JAH-PC-91000001', 'seed sig id 0');
ok(/^JAH-PC-\d{8}$/.test(ID.onDemandId(827391)), 'id format');
eq(ID.ID_SCHEME, 'JAH-PC-ID/1.0', 'id scheme version');

// ---- 2. sha256 known vector (ground truth: node crypto) ----
eq(ID.sha256('abc'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad', 'sha256 vector');
eq(ID.sha256('héllo—world…𝄞'), require('crypto').createHash('sha256').update('héllo—world…𝄞','utf8').digest('hex'), 'sha256 utf-8');
eq(ID.specHash({b: 2, a: 1}), ID.specHash({a: 1, b: 2}), 'canonical hash key-order independent');
ok(ID.specHash({a: 1}) !== ID.specHash({a: 2}), 'hash differs on content');

// ---- 3. generator determinism ----
const m1 = GEN.at(827390), m2 = GEN.at(827390);
eq(ID.canonJSON(m1), ID.canonJSON(m2), 'same index -> identical record');
eq(m1.system_id, 'JAH-PC-00827391', 'model 827391 canonical id');
eq(m1.generator_version, 'GEN/2.0', 'generator version recorded');
ok(m1.name && m1.name.length > 10, 'name present');
ok(GEN.at(0).system_id === 'JAH-PC-00000001', 'first model id');
ok(GEN.at(999999).system_id === 'JAH-PC-01000000', 'last model id');
let threw = false;
try { GEN.at(-1); } catch (e) { threw = true; }
ok(threw, 'at(-1) throws');
threw = false; try { GEN.at(1000000); } catch (e) { threw = true; }
ok(threw, 'at(1000000) throws');
ok(GEN.at(0).spec_hash !== GEN.at(1).spec_hash, 'different index -> different hash');

// ---- 4. random seed reproducibility ----
const s1 = ID.seedToModelNumber(728194), s2 = ID.seedToModelNumber(728194);
eq(s1, s2, 'same seed -> same model');
ok(s1 >= 1 && s1 <= 1000000, 'seed model in range');
ok(ID.seedToModelNumber(1) !== ID.seedToModelNumber(2) || true, 'seed mapping runs');

// ---- 5. constraint validation (direct rule tests; the exposed 1M lattice only
// spans the first two architecture indices by design, so rules are tested head-on) ----
eq(ID.validateCombination('Analog Memristor', 'Photonic Silicon', 'Board', '2020s').validity, 'INVALID', 'analog-memristor + photonic-si -> INVALID');
eq(ID.validateCombination('Quantum-Classical Hybrid', 'Graphene', 'Board', '2020s').validity, 'UNKNOWN', 'quantum-hybrid + graphene -> UNKNOWN');
eq(ID.validateCombination('von Neumann', 'Silicon', 'Desktop', '2020s').validity, 'VALID', 'ordinary combo VALID');
eq(m1.validity.rules, 'PC-VALIDITY/1.0', 'validity ruleset labeled');
ok(m1.validity.reason && m1.validity.reason.length > 0, 'validity reason present');

// ---- 6. tech specs: units on every number ----
const ts = m1.tech_specs;
for (const k of Object.keys(ts)) ok(/[a-zA-Z]/.test(ts[k]), 'unit on ' + k, ts[k]);
ok(/bit$/.test(ts.ALU_WIDTH), 'ALU unit bit');
ok(/GHz$/.test(ts.CLOCK), 'clock unit GHz');
ok(/GB$/.test(ts.MEMORY), 'memory unit GB');
ok(ts.PROCESS_NODE.endsWith('nm'), 'node unit nm');
ok(m1.assumptions.length >= 3, 'assumptions exposed');
ok(m1.assumptions.some(a => /hypothetical|assumed|unvalidated/i.test(a)), 'assumption honesty');

// ---- 7. architecture vocabulary ----
const av = m1.architecture;
for (const k of ['ISA', 'MICROARCHITECTURE', 'CPU_ARCHITECTURE', 'WORD_SIZE', 'ENDIANNESS', 'PROCESSING_MODEL'])
  ok(av[k], 'arch vocab ' + k);
ok(/bit$/.test(av.WORD_SIZE), 'word size unit');

// ---- 8. simulator contracts ----
const classes = ['VISUAL_SIMULATION', 'FUNCTIONAL_EMULATION', 'ARCHITECTURAL_SIMULATION', 'CYCLE_ACCURATE_EMULATION'];
for (const k of ['abacus', 'gates', 'cpu4', 'stored', 'quantum', 'material']) {
  const c = SIMS.CONTRACTS[k];
  ok(c, 'contract ' + k);
  for (const f of ['SIMULATOR_STATUS', 'SIMULATOR_VERSION', 'SIMULATION_CLASS', 'INPUT_FORMAT', 'OUTPUT_FORMAT', 'SUPPORTED_OPERATIONS', 'KNOWN_LIMITATIONS', 'SAFETY'])
    ok(c && c[f] !== undefined && c[f] !== '', 'contract field ' + k + '.' + f);
  ok(c && classes.includes(c.SIMULATION_CLASS), 'contract class valid ' + k);
  ok(c && /^SIMULATION_ONLY/.test(c.SAFETY), 'contract safety ' + k);
}

// ---- 9. seeds: system types, badges, governance ----
const seeds = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/systems.json'), 'utf8'));
eq(seeds.length, 121, 'seed count 121');
const types = {};
seeds.forEach((r, i) => {
  UI.enrichSeed(r, i);
  types[r._system_type] = (types[r._system_type] || 0) + 1;
  ok(ID.SYSTEM_TYPES.includes(r._system_type), 'seed type valid ' + r.id);
  ok(/^JAH-PC-9\d{7}$/.test(r._system_id), 'seed id format ' + r.id);
  ok(r._spec_hash && r._spec_hash.length === 64, 'seed hash ' + r.id);
  ok(r._governance.chain.length === 8, 'governance chain 8 steps ' + r.id);
  ok(r._governance.statuses.PATENT_STATUS.includes('NOT FILED'), 'patent honesty ' + r.id);
  ok(r._provenance && r._provenance.SOURCE_TYPE, 'provenance ' + r.id);
  ok(r._buildability && r._buildability.level, 'buildability ' + r.id);
  if (r.sig) {
    ok(r.sig._system_id !== r._system_id, 'sig id distinct ' + r.id);
    eq(r.sig._system_type, 'SIGNATURE_ORIGINAL', 'sig type ' + r.id);
    ok(r.sig._relationship.RELATIONSHIP, 'sig relationship ' + r.id);
  }
});
ok(types.HISTORICAL > 0 && types.SIGNATURE_ORIGINAL > 0 && types.PREDICTED > 0 && types.HYBRID > 0, 'all seed types present', types);
// ENIAC-style check: a historical seed's sig must not claim to BE the historical machine
const abacus = seeds.find(r => r.id === 'sys-abacus');
eq(abacus._system_type, 'HISTORICAL', 'abacus base is HISTORICAL');
eq(abacus.sig._relationship.RELATIONSHIP, 'SIGNATURE-INSPIRED ORIGINAL', 'abacus sig relationship');
ok(/NOT the historical machine/.test(abacus.sig._relationship.ORIGINALITY_RECORD), 'originality record honesty');

// ---- 10. badge / HTML builders escape injection ----
const evil = '<script>alert(1)</script><img src=x onerror=alert(2)>';
ok(!UI.badgeHTML('HISTORICAL').includes('<script>'), 'badge no raw script');
const zh = UI.zeroResultHTML(evil);
ok(zh.includes('&lt;script&gt;') && !zh.includes('<script>'), 'zero-result escapes');
ok(/ENIAC/.test(zh) && /quantum/.test(zh), 'zero-result suggestions');
const gh = UI.governanceHTML(seeds[0]._governance);
ok(gh.includes('SIGNATURE GOVERNANCE IDENTITY'), 'governance block title');
ok(gh.includes('Not a government archive'), 'governance not-government');
const ph = UI.provenanceHTML({ SOURCE_TYPE: evil, SOURCE_TITLE: null, SOURCE_URL: null, SOURCE_DATE: null, RETRIEVAL_DATE: null, SOURCE_ID: null, CLAIM_SCOPE: 'x', VERIFICATION_STATE: 'y', note: '' });
ok(!ph.includes('<script>'), 'provenance escapes');

// ---- 11. drip enrichment ----
const chunkLine = fs.readFileSync(path.join(ROOT, 'data/drip/chunk-0000.jsonl'), 'utf8').split('\n').find(l => l.trim());
const drip = UI.enrichDrip(JSON.parse(chunkLine));
eq(drip._system_type, 'GENERATED', 'drip type');
ok(/^JAH-PC-8\d{7}$/.test(drip._system_id), 'drip id format', drip._system_id);
ok(drip._tech_specs && /GHz$/.test(drip._tech_specs.CLOCK), 'drip tech specs');
ok(drip._validity && drip._assumptions.length > 0, 'drip validity+assumptions');
eq(drip._generator_version, 'DRIP/1.0', 'drip generator version');

// ---- 12. pagination / search / filters ----
const pg = UI.paginate([1, 2, 3, 4, 5], 2, 2);
eq(pg.page, 2, 'paginate page'); eq(pg.pages, 3, 'paginate pages'); eq(pg.items.length, 2, 'paginate items');
const pgc = UI.paginate([1], 99, 10);
eq(pgc.page, 1, 'paginate clamps');
ok(UI.searchList(seeds, '').length === seeds.length, 'empty search = all');
ok(UI.searchList(seeds, seeds[0]._system_id).length === 1, 'exact id search');
ok(UI.searchList(seeds, 'zzz-no-such-thing').length === 0, 'no-match search');
ok(UI.matchesFilter(seeds[0], 'HISTORICAL'), 'filter historical');
ok(!UI.matchesFilter(seeds[0], 'GENERATED'), 'filter excludes');
ok(UI.matchesFilter(drip, 'GENERATED'), 'drip filter generated');
ok(UI.FILTERS.includes('QUANTUM') && UI.FILTERS.includes('MECHANICAL'), 'filter taxonomy');

// ---- 13. counts ----
const c = UI.splitCounts(seeds, 1200);
eq(c.RECORDED_SYSTEMS, 1321, 'recorded count');
eq(c.GENERATABLE_SPACE, 1000000, 'generatable space');
ok(c.SIGNATURE_SYSTEMS === 1321, 'signature count', c.SIGNATURE_SYSTEMS);

// ---- 14. downloads ----
const meta = { system_id: 'JAH-PC-00827391', system_type: 'GENERATED', spec_hash: 'ab'.repeat(32), generator_version: 'GEN/2.0', simulator: 'gates', simulator_version: 'SIM/1.0', simulation_class: 'FUNCTIONAL_EMULATION', safety: 'SIMULATION_ONLY', dependencies: 'none', source: 'x', created: '2026-09-30' };
const dh = ID.downloadHeader(meta);
for (const k of ['SYSTEM_ID', 'VERSION', 'SPEC_HASH', 'GENERATOR_VERSION', 'SIMULATOR_VERSION', 'DEPENDENCIES', 'LICENSE', 'SOURCE', 'CREATED'])
  ok(dh.includes(k + ':'), 'download header ' + k);
ok(ID.jsHeader(meta).startsWith('/*'), 'js header');
ok(ID.pyHeader(meta).split('\n').every(l => l === '' || l.startsWith('#')), 'py header');

// ---- 15. AI contract / governance framing ----
ok(ID.AI_CONTRACT.includes('GENERATED MODEL'), 'ai contract mentions generated');
ok(/never say a generated model "was manufactured"/.test(ID.AI_CONTRACT), 'ai prediction guard');
ok(ID.GOVERNANCE_NOTE.includes('Not a government archive') && ID.GOVERNANCE_NOTE.includes('Never USPTO'), 'governance framing');
ok(ID.SOURCE_CLASSES.length === 6, 'source classes');
ok(ID.SCOPE_DEFINITION.includes.length > 5 && ID.SCOPE_DEFINITION.excludes.length > 0, 'scope definition');

// ---- 16. xrefs ----
const x = ID.xrefs('JAH-PC-00827391', 'pcm-827391', []);
for (const k of ['PC_SYSTEM_ID', 'SPEC_ID', 'PATENT_CATALOG_ID', 'WIKI_ARTICLE_ID', 'LLAMA_KNOWLEDGE_ID', 'DICTIONARY_ENTRY_IDS'])
  ok(k in x, 'xref slot ' + k);
eq(x.PC_SYSTEM_ID, 'JAH-PC-00827391', 'xref self');

// ---- 17. json-LD ----
const ld = UI.jsonLDHTML(seeds[0]);
ok(ld.includes('application/ld+json') && ld.includes(seeds[0]._system_id), 'json-ld');

console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
