/* The Signature PC System Depository — UI logic module (pure, no DOM).
   window.PCUI = { enrichSeed, enrichDrip, badgeHTML, governanceHTML, ... }
   Depends on window.PCIDENT. */
window.PCUI = (function () {
  'use strict';
  var ID = window.PCIDENT;
  var esc = ID.esc;

  /* ---------- filter taxonomy ---------- */
  // Category labels are derived from each record's own name/tag/description text —
  // never assigned by hand, never invented specs. "PC" stays the broad personal-computing tag.
  var FILTERS = ['ALL', 'HISTORICAL', 'MAINFRAME', 'DESKTOP', 'LAPTOP', 'WORKSTATION',
                 'SERVER', 'SUPERCOMPUTER', 'MOBILE', 'EMBEDDED', 'PC', 'QUANTUM',
                 'ANALOG', 'MECHANICAL', 'EXPERIMENTAL', 'SIGNATURE', 'PREDICTED', 'GENERATED'];
  function tagsFor(rec) {
    var t = [];
    var s = ((rec.name || '') + ' ' + (rec.tag || '') + ' ' + (rec.desc || '')).toLowerCase();
    function has(re) { return re.test(s); }
    if (has(/mainframe/)) t.push('MAINFRAME');
    if (has(/supercomputer|exascale|\bcluster\b/)) t.push('SUPERCOMPUTER');
    if (has(/workstation/)) t.push('WORKSTATION');
    if (has(/\bserver\b/)) t.push('SERVER');
    if (has(/embedded|microcontroller/)) t.push('EMBEDDED');
    if (has(/experimental|prototype/)) t.push('EXPERIMENTAL');
    if (has(/laptop|notebook/)) t.push('LAPTOP');
    if (has(/desktop/)) t.push('DESKTOP');
    if (rec.cat === 'quantum' || has(/quantum/)) t.push('QUANTUM');
    if (has(/analog/)) t.push('ANALOG');
    if (has(/mechanical|geared|\bbead\b|abacus|pascaline|difference engine/)) t.push('MECHANICAL');
    if (has(/smartphone|mobile|handheld|tablet|wearable|phone/)) t.push('MOBILE');
    if (has(/personal computer|\bpc\b|desktop|laptop/)) t.push('PC');
    return t;
  }
  function dripTags(rec) {
    // scale -> form tags for generated records
    var sc = rec._scale || '';
    if (sc === 'Rack') return ['MAINFRAME'];
    if (sc === 'Cluster' || sc === 'Wafer-Scale') return ['SUPERCOMPUTER'];
    return ['PC'];
  }
  function matchesFilter(rec, f) {
    if (!f || f === 'ALL') return true;
    var st = rec._system_type;
    if (f === 'HISTORICAL') return st === 'HISTORICAL';
    if (f === 'SIGNATURE') return st === 'SIGNATURE_ORIGINAL';
    if (f === 'PREDICTED') return st === 'PREDICTED';
    if (f === 'GENERATED') return st === 'GENERATED';
    if (st === 'HYBRID' && f === 'HYBRID') return true;
    var tags = rec._tags || [];
    return tags.indexOf(f) >= 0;
  }

  /* ---------- enrichment ---------- */
  function provenanceFor(rec, systemType) {
    if (systemType === 'HISTORICAL' || systemType === 'HYBRID') {
      return {
        SOURCE_TYPE: 'JAH curatorial summary',
        SOURCE_TITLE: 'Depository curatorial record for "' + rec.name + '"',
        SOURCE_URL: null,
        SOURCE_DATE: null,
        RETRIEVAL_DATE: null,
        SOURCE_ID: null,
        CLAIM_SCOPE: 'General description; dates approximate',
        VERIFICATION_STATE: 'UNVERIFIED — primary sources not yet attached',
        note: 'No source is invented here. Primary-source attachment is pending; see the JAH Wiki for sourced articles.'
      };
    }
    if (systemType === 'SIGNATURE_ORIGINAL') {
      return {
        SOURCE_TYPE: 'JAH original design', SOURCE_TITLE: 'Signature System design record',
        SOURCE_URL: null, SOURCE_DATE: '2026-09-30', RETRIEVAL_DATE: null, SOURCE_ID: rec._system_id || null,
        CLAIM_SCOPE: 'Design record only — never a historical claim',
        VERIFICATION_STATE: 'JAH-SIGNATURE-RECORDED', note: 'Original to the Signature System.'
      };
    }
    return {
      SOURCE_TYPE: systemType === 'GENERATED' ? 'deterministic derivation' : 'JAH concept',
      SOURCE_TITLE: 'Depository generation record', SOURCE_URL: null, SOURCE_DATE: '2026-09-30',
      RETRIEVAL_DATE: null, SOURCE_ID: rec._system_id || null,
      CLAIM_SCOPE: 'Possible model — not evidence of existence',
      VERIFICATION_STATE: 'n/a — generated', note: 'Reproducible from its seed and generator version.'
    };
  }

  function enrichSeed(rec, i) {
    var st = ID.seedSystemType(rec);
    rec._idx = i;
    rec._system_id = ID.seedBaseId(i);
    rec._system_type = st;
    rec._type_label = ID.TYPE_LABEL[st];
    rec._tags = tagsFor(rec);
    rec._generator_version = 'SEED/1.0';
    var core = { system_id: rec._system_id, id_scheme: ID.ID_SCHEME, system_type: st,
      name: rec.name, era: rec.era || null, tag: rec.tag || null, desc: rec.desc || null,
      history: rec.history || null, generator_version: 'SEED/1.0', record_schema: ID.RECORD_SCHEMA };
    rec._spec_hash = ID.specHash(core);
    rec._governance = ID.governanceChain(rec._system_id, st, rec._spec_hash);
    rec._provenance = provenanceFor(rec, st);
    rec._buildability = ID.buildabilityFor(st);
    rec._xrefs = ID.xrefs(rec._system_id, rec.id, []);
    // Signature version sub-record
    if (rec.sig) {
      var sid = ID.seedSigId(i);
      var sigCore = { system_id: sid, id_scheme: ID.ID_SCHEME, system_type: 'SIGNATURE_ORIGINAL',
        name: rec.sig.name, based_on: rec.name, generator_version: 'SEED/1.0', record_schema: ID.RECORD_SCHEMA };
      rec.sig._system_id = sid;
      rec.sig._system_type = 'SIGNATURE_ORIGINAL';
      rec.sig._type_label = ID.TYPE_LABEL.SIGNATURE_ORIGINAL;
      rec.sig._spec_hash = ID.specHash(sigCore);
      rec.sig._governance = ID.governanceChain(sid, 'SIGNATURE_ORIGINAL', rec.sig._spec_hash);
      rec.sig._relationship = ID.sigRelationship(st, rec.name, rec.sig.name);
      rec.sig._provenance = provenanceFor(rec.sig, 'SIGNATURE_ORIGINAL');
      rec.sig._buildability = ID.buildabilityFor('SIGNATURE_ORIGINAL');
      rec.sig._xrefs = ID.xrefs(sid, rec.id + '#sig', []);
    }
    return rec;
  }

  function enrichDrip(rec) {
    // id: pcm-gen-NNNNNN ; deterministic seed scheme: random.Random(10_000_000 + i)
    var m = /pcm-gen-(\d+)/.exec(rec.id || '');
    var n = m ? parseInt(m[1], 10) : 0;
    var scM = /at (\w[\w-]*) scale/.exec(rec.desc || '');
    rec._scale = scM ? scM[1] : '';
    rec._idx = n;
    rec._system_id = ID.dripId(n);
    rec._system_type = 'GENERATED';
    rec._type_label = ID.TYPE_LABEL.GENERATED;
    rec._tags = dripTags(rec);
    rec._generator_version = ID.DRIP_RULE_VERSION;
    rec._generation_seed = 10000000 + (n - 1);
    var dM = /(\d+)-bit (.*?) architecture on a (.*?) substrate at (.*?) scale\./.exec(rec.desc || '');
    var width = dM ? parseInt(dM[1], 10) : 32;
    var arch = dM ? dM[2] : 'von Neumann';
    var mat = dM ? dM[3] : 'Silicon';
    var validity = ID.validateCombination(arch, mat, 'Board', '2020s');
    var rng = ID.mulberry32(rec._generation_seed ^ 0x51ab);
    rec._component_set = { ARCHITECTURE: arch, MATERIAL: mat, ALU_WIDTH_BIT: width, SCALE: rec._scale };
    rec._arch_vocab = ID.archVocab(arch, width);
    rec._tech_specs = ID.techSpecs(rng, { alu: width, reg: 32, core: 8, form: rec._scale, era: '2020s', mat: mat });
    rec._validity = validity;
    rec._assumptions = ID.assumptionsFor({ mat: mat, era: '2020s' }, validity);
    var core = { system_id: rec._system_id, id_scheme: ID.ID_SCHEME, system_type: 'GENERATED',
      name: rec.name, desc: rec.desc, generator_version: ID.DRIP_RULE_VERSION,
      generation_seed: rec._generation_seed, component_set: rec._component_set,
      record_schema: ID.RECORD_SCHEMA };
    rec._spec_hash = ID.specHash(core);
    rec._governance = ID.governanceChain(rec._system_id, 'GENERATED', rec._spec_hash);
    rec._provenance = provenanceFor(rec, 'GENERATED');
    rec._buildability = ID.buildabilityFor('GENERATED');
    rec._xrefs = ID.xrefs(rec._system_id, rec.id, []);
    return rec;
  }

  /* ---------- HTML builders (all escaped) ---------- */
  function badgeHTML(systemType) {
    var label = ID.TYPE_LABEL[systemType] || systemType;
    var meaning = ID.TYPE_MEANING[systemType] || '';
    var color = systemType === 'HISTORICAL' ? '#9fd8ff'
      : systemType === 'SIGNATURE_ORIGINAL' ? '#ffd75e'
      : systemType === 'PREDICTED' ? '#d0a6ff'
      : systemType === 'GENERATED' ? '#8affc1' : '#ffb27d';
    return '<div class="systype" style="border:1px solid ' + color + ';border-radius:6px;padding:6px 10px;' +
      'display:inline-block;font-size:12px;letter-spacing:2px;color:' + color + ';margin:6px 0" title="' +
      esc(meaning) + '">▣ ' + esc(label) + '</div>';
  }

  function kvTable(rows) {
    return '<table style="width:100%;border-collapse:collapse;font-size:13px">' +
      rows.map(function (r) {
        return '<tr><td style="border-bottom:1px solid #16324f;padding:5px 8px;color:#8fb8d8;width:38%">' +
          esc(r[0]) + '</td><td style="border-bottom:1px solid #16324f;padding:5px 8px;color:#d7e9f7">' +
          esc(r[1]) + '</td></tr>';
      }).join('') + '</table>';
  }

  function governanceHTML(gov) {
    var h = '<div class="sec"><h3>SIGNATURE GOVERNANCE IDENTITY</h3>';
    h += '<p class="kv">' + esc(gov.governance_note) + '</p>';
    h += '<div class="kv" style="margin:8px 0">' + gov.chain.map(function (c) {
      return '<span style="display:inline-block;border:1px solid #1d3a5f;border-radius:4px;padding:3px 8px;margin:2px;font-size:11px;color:#8fb8d8">' +
        esc(c.step) + '</span>';
    }).join('<span style="color:#35d0ff"> → </span>') + '</div>';
    h += kvTable(gov.chain.map(function (c) { return [c.step, c.value]; }));
    h += '<div style="margin-top:8px">' + kvTable(Object.keys(gov.statuses).map(function (k) { return [k, gov.statuses[k]]; })) + '</div></div>';
    return h;
  }

  function provenanceHTML(p) {
    var rows = ['SOURCE_TYPE', 'SOURCE_TITLE', 'SOURCE_URL', 'SOURCE_DATE', 'RETRIEVAL_DATE',
                'SOURCE_ID', 'CLAIM_SCOPE', 'VERIFICATION_STATE'].map(function (k) {
      return [k, p[k] == null ? '—' : String(p[k])];
    });
    return '<div class="sec"><h3>SOURCE PROVENANCE</h3>' + kvTable(rows) +
      '<p class="kv">' + esc(p.note || '') + '</p></div>';
  }

  function contractHTML(simKey) {
    var c = (window.SIMS && window.SIMS.CONTRACTS && window.SIMS.CONTRACTS[simKey]) || null;
    if (!c) return '<div class="sec"><h3>SIMULATOR CONTRACT</h3><p class="kv">No contract attached.</p></div>';
    var rows = ['SIMULATOR_STATUS', 'SIMULATOR_VERSION', 'SIMULATION_CLASS', 'INPUT_FORMAT',
                'OUTPUT_FORMAT', 'SAFETY'].map(function (k) { return [k, c[k]]; });
    var h = '<div class="sec"><h3>SIMULATOR CONTRACT — ' + esc(simKey) + '</h3>' + kvTable(rows);
    h += '<p class="kv"><b>Supported operations:</b> ' + esc(c.SUPPORTED_OPERATIONS.join('; ')) + '</p>';
    h += '<p class="kv"><b>Known limitations:</b> ' + esc(c.KNOWN_LIMITATIONS.join('; ')) + '</p></div>';
    return h;
  }

  function techSpecsHTML(specs) {
    var h = '<div class="sec"><h3>TECHNICAL SPECIFICATIONS <span class="hist">— UNITS EXPLICIT</span></h3>';
    h += kvTable(Object.keys(specs).map(function (k) { return [k, specs[k] + '  [source: derived — GEN/2.0]']; }));
    return h + '</div>';
  }

  function archVocabHTML(v) {
    return '<div class="sec"><h3>ARCHITECTURE VOCABULARY <span class="hist">— STANDARDIZED</span></h3>' +
      kvTable(Object.keys(v).map(function (k) { return [k, v[k]]; })) + '</div>';
  }

  function validityHTML(v) {
    var col = v.validity === 'VALID' ? '#8affc1' : v.validity === 'INVALID' ? '#ff8a8a' : '#ffd75e';
    return '<div class="sec"><h3>CONSTRAINT VALIDATION</h3><p class="kv">Combination status: <b style="color:' +
      col + '">' + esc(v.validity) + '</b> <span class="hist">(' + esc(v.rules) + ' — heuristic, not a fabrication guarantee)</span></p>' +
      '<p class="kv">' + esc(v.reason) + '</p></div>';
  }

  function assumptionsHTML(list) {
    return '<div class="sec"><h3>ASSUMPTIONS <span class="hist">— EXPOSED, NOT HIDDEN</span></h3><ul style="font-size:13px;color:#d7e9f7">' +
      list.map(function (a) { return '<li>' + esc(a) + '</li>'; }).join('') + '</ul></div>';
  }

  function buildabilityHTML(b) {
    return '<div class="sec"><h3>BUILDABILITY</h3><p class="kv">Level: <b>' + esc(b.level) + '</b></p>' +
      '<p class="kv">' + esc(b.meaning) + '</p>' +
      '<p class="kv hist">Ladder: ' + esc(b.ladder.join(' → ')) + '</p></div>';
  }

  function sigRelHTML(rel) {
    return '<div class="sec"><h3>SIGNATURE RELATIONSHIP <span class="hist">— FORMAL</span></h3>' +
      kvTable([['BASED_ON', rel.BASED_ON], ['RELATIONSHIP', rel.RELATIONSHIP],
               ['HISTORICAL_COMPONENTS_REUSED', rel.HISTORICAL_COMPONENTS_REUSED],
               ['ORIGINAL_COMPONENTS', rel.ORIGINAL_COMPONENTS]]) +
      '<p class="kv">' + esc(rel.ORIGINALITY_RECORD) + '</p></div>';
  }

  function xrefsHTML(x) {
    var rows = Object.keys(x).filter(function (k) { return k !== 'note'; }).map(function (k) {
      var v = x[k];
      return [k, v == null ? '— (reserved)' : (Array.isArray(v) ? v.join(', ') || '—' : String(v))];
    });
    return '<div class="sec"><h3>CROSS-SITE IDS</h3>' + kvTable(rows) +
      '<p class="kv hist">' + esc(x.note) + '</p></div>';
  }

  function aiContractHTML() {
    return '<div class="sec"><h3>FOR AI READERS <span class="hist">— INGESTION CONTRACT</span></h3>' +
      '<pre class="code">' + esc(ID.AI_CONTRACT) + '</pre>' +
      '<p class="kv">Source classes: ' + esc(ID.SOURCE_CLASSES.join(' · ')) + '</p></div>';
  }

  /* ---------- canonical system.json ---------- */
  function recordJSON(o) {
    // Build the canonical machine-readable record from an enriched record
    // (o = result of enrichSeed/enrichDrip). Never invents sibling IDs.
    var sys = {
      system_json: 'JAH-PC-SYSTEM/1.0',
      system_id: o._system_id, id_scheme: ID.ID_SCHEME,
      system_type: o._system_type, type_label: o._type_label,
      name: (o.sig && o.sig.name) || o.name,
      record_schema: ID.RECORD_SCHEMA,
      spec_hash: 'sha256:' + o._spec_hash,
      generator_version: o._generator_version || null,
      generation_seed: o._generation_seed || null,
      provenance: o._provenance, buildability: o._buildability,
      governance: o._governance, xrefs: o._xrefs,
      ai_contract: ID.AI_CONTRACT, source_classes: ID.SOURCE_CLASSES
    };
    if (o._component_set) sys.component_set = o._component_set;
    if (o._arch_vocab) sys.architecture = o._arch_vocab;
    if (o._tech_specs) sys.tech_specs = o._tech_specs;
    if (o._validity) sys.validity = o._validity;
    if (o._assumptions) sys.assumptions = o._assumptions;
    if (o.sig && o.sig._relationship) sys.signature_relationship = o.sig._relationship;
    return sys;
  }
  function jsonLDHTML(rec) {
    var ld = {
      '@context': 'https://schema.org', '@type': 'Product',
      'name': rec.name, 'identifier': rec._system_id,
      'url': 'https://justinahiggins614-cmyk.github.io/jah-computer-systems/?system=' + rec._system_id,
      'description': ((rec.tag ? rec.tag + '. ' : '') + (rec.desc || '')).slice(0, 300),
      'additionalProperty': [
        { 'name': 'system_type', 'value': rec._system_type },
        { 'name': 'type_label', 'value': rec._type_label },
        { 'name': 'spec_hash', 'value': 'sha256:' + rec._spec_hash },
        { 'name': 'generator_version', 'value': rec._generator_version || ID.DRIP_RULE_VERSION },
        { 'name': 'governance', 'value': 'JAH-SIGNATURE (own authority — not government, not USPTO)' }
      ]
    };
    return '<script type="application/ld+json">' + JSON.stringify(ld) + '<\/script>';
  }

  /* ---------- zero-result state ---------- */
  function zeroResultHTML(q) {
    return '<div class="kv" style="padding:18px 6px"><b>NO SYSTEM FOUND</b> for &ldquo;' + esc(q) + '&rdquo;.<br><br>' +
      'Try:<br>· ENIAC · quantum · graphene · 1980s · portable<br><br>' +
      '<span class="hist">The depository holds recorded systems, Signature designs, and a 1,000,000-model generatable space — search matches names, tags, and descriptions.</span></div>';
  }

  /* ---------- pagination (pure) ---------- */
  function paginate(list, page, perPage) {
    var total = list.length;
    var pages = Math.max(1, Math.ceil(total / perPage));
    page = Math.min(pages, Math.max(1, page));
    return { items: list.slice((page - 1) * perPage, page * perPage),
             page: page, pages: pages, total: total, perPage: perPage };
  }

  /* ---------- search ---------- */
  function searchList(list, q) {
    q = (q || '').trim().toLowerCase();
    if (!q) return list;
    // JAH-PC id exact match first
    var idm = list.filter(function (r) { return (r._system_id || '').toLowerCase() === q; });
    if (idm.length) return idm;
    return list.filter(function (r) {
      var s = ((r.sig && r.sig.name) || r.name || '') + ' ' + (r.tag || '') + ' ' + (r.desc || '') +
              ' ' + (r._system_id || '') + ' ' + (r.id || '');
      return s.toLowerCase().indexOf(q) >= 0;
    });
  }

  /* ---------- counts ---------- */
  function splitCounts(seeds, dripCount) {
    var recorded = seeds.length + dripCount;
    var sigCount = seeds.filter(function (r) { return r.sig; }).length + dripCount;
    return { RECORDED_SYSTEMS: recorded, SIGNATURE_SYSTEMS: sigCount, GENERATABLE_SPACE: 1000000 };
  }

  return {
    FILTERS: FILTERS, tagsFor: tagsFor, matchesFilter: matchesFilter,
    enrichSeed: enrichSeed, enrichDrip: enrichDrip, provenanceFor: provenanceFor,
    badgeHTML: badgeHTML, governanceHTML: governanceHTML, provenanceHTML: provenanceHTML,
    contractHTML: contractHTML, techSpecsHTML: techSpecsHTML, archVocabHTML: archVocabHTML,
    validityHTML: validityHTML, assumptionsHTML: assumptionsHTML, buildabilityHTML: buildabilityHTML,
    sigRelHTML: sigRelHTML, xrefsHTML: xrefsHTML, aiContractHTML: aiContractHTML,
    recordJSON: recordJSON, jsonLDHTML: jsonLDHTML, zeroResultHTML: zeroResultHTML,
    paginate: paginate, searchList: searchList, splitCounts: splitCounts
  };
})();
