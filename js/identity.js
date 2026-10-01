/* The Signature PC System Depository — Canonical Identity & Governance module
   Pure logic, no DOM. Testable in node via vm.
   window.PCIDENT = { ... }

   CANONICAL ID ALLOCATION (scheme JAH-PC-ID/1.0) — permanent, never reassigned:
     JAH-PC-00000001 .. JAH-PC-01000000  on-demand combinatorial space (model #N -> pad8(N))
     JAH-PC-80000001 ..                  drip-generated records (pcm-gen-NNNNNN -> 80000000+N)
     JAH-PC-90000001 ..                  curated seed base records (systems.json index i -> 90000001+i)
     JAH-PC-91000001 ..                  Signature versions of seed records (index i -> 91000001+i)
   Governance: JAH's OWN patent-making governance. Deterministic IDs + hashes are the
   credibility mechanism (like Disney has its own money). Never government, never USPTO.
*/
window.PCIDENT = (function () {
  'use strict';

  var ID_SCHEME = 'JAH-PC-ID/1.0';
  var GEN_RULE_VERSION = 'GEN/2.0';    // on-demand combinatorial lattice (lattice itself unchanged since GEN/1.0)
  var DRIP_RULE_VERSION = 'DRIP/1.0'; // drip-generated combinatorial engine
  var RECORD_SCHEMA = 'JAH-PC-RECORD/1.0';

  /* ---------- SHA-256 (compact, synchronous, public-domain style; UTF-8 input) ---------- */
  function sha256(str) {
    function rr(v, a) { return (v >>> a) | (v << (32 - a)); }
    // UTF-8 encode the input string
    var bytes = [], i, c, d, cp;
    for (i = 0; i < str.length; i++) {
      c = str.charCodeAt(i);
      if (c < 128) { bytes.push(c); }
      else if (c < 2048) { bytes.push(192 | (c >> 6), 128 | (c & 63)); }
      else if (c >= 55296 && c <= 56319 && i + 1 < str.length &&
               (d = str.charCodeAt(i + 1)) >= 56320 && d <= 57343) {
        cp = 0x10000 + ((c - 55296) << 10) + (d - 56320);
        bytes.push(240 | (cp >> 18), 128 | ((cp >> 12) & 63), 128 | ((cp >> 6) & 63), 128 | (cp & 63));
        i++;
      }
      else { bytes.push(224 | (c >> 12), 128 | ((c >> 6) & 63), 128 | (c & 63)); }
    }
    var maxWord = Math.pow(2, 32), j, result = '';
    var words = [], bitLength = bytes.length * 8;
    var hash = sha256.h = sha256.h || [], k = sha256.k = sha256.k || [];
    var primeCounter = k.length, isComposite = {};
    for (var candidate = 2; primeCounter < 64; candidate++) {
      if (!isComposite[candidate]) {
        for (i = 0; i < 313; i += candidate) isComposite[i] = candidate;
        hash[primeCounter] = (Math.pow(candidate, 0.5) * maxWord) | 0;
        k[primeCounter++] = (Math.pow(candidate, 1 / 3) * maxWord) | 0;
      }
    }
    bytes.push(0x80);
    while (bytes.length % 64 !== 56) bytes.push(0);
    var hi = Math.floor(bitLength / maxWord), lo = bitLength >>> 0;
    bytes.push((hi >>> 24) & 255, (hi >>> 16) & 255, (hi >>> 8) & 255, hi & 255,
               (lo >>> 24) & 255, (lo >>> 16) & 255, (lo >>> 8) & 255, lo & 255);
    for (i = 0; i < bytes.length; i++) {
      words[i >> 2] |= bytes[i] << (((3 - i) % 4 + 4) % 4) * 8;
    }
    for (j = 0; j < words.length;) {
      var w = words.slice(j, j += 16), oldHash = hash;
      hash = hash.slice(0, 8);
      for (i = 0; i < 64; i++) {
        var w15 = w[i - 15], w2 = w[i - 2];
        var a = hash[0], e = hash[4];
        var temp1 = hash[7]
          + (rr(e, 6) ^ rr(e, 11) ^ rr(e, 25))
          + ((e & hash[5]) ^ (~e & hash[6]))
          + k[i]
          + (w[i] = i < 16 ? w[i] : (w[i - 16]
            + (rr(w15, 7) ^ rr(w15, 18) ^ (w15 >>> 3))
            + w[i - 7]
            + (rr(w2, 17) ^ rr(w2, 19) ^ (w2 >>> 10))) | 0);
        var temp2 = (rr(a, 2) ^ rr(a, 13) ^ rr(a, 22)) + ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));
        hash = [(temp1 + temp2) | 0].concat(hash);
        hash[4] = (hash[4] + temp1) | 0;
      }
      for (i = 0; i < 8; i++) hash[i] = (hash[i] + oldHash[i]) | 0;
    }
    for (i = 0; i < 8; i++) {
      for (j = 3; j + 1; j--) {
        var b = (hash[i] >> (j * 8)) & 255;
        result += (b < 16 ? '0' : '') + b.toString(16);
      }
    }
    return result;
  }

  /* ---------- canonical JSON: stable key order, no whitespace ---------- */
  function canonJSON(v) {
    if (v === null || v === undefined) return 'null';
    if (Array.isArray(v)) return '[' + v.map(canonJSON).join(',') + ']';
    if (typeof v === 'object') {
      var ks = Object.keys(v).sort();
      return '{' + ks.map(function (k) { return JSON.stringify(k) + ':' + canonJSON(v[k]); }).join(',') + '}';
    }
    return JSON.stringify(v);
  }
  function specHash(obj) { return sha256(canonJSON(obj)); }

  function pad(n, w) { var s = String(n); while (s.length < w) s = '0' + s; return s; }

  /* ---------- canonical IDs ---------- */
  function onDemandId(n) { return 'JAH-PC-' + pad(n, 8); }                 // 1..1000000
  function dripId(genN) { return 'JAH-PC-' + pad(80000000 + genN, 8); }      // pcm-gen-NNNNNN
  function seedBaseId(i) { return 'JAH-PC-' + pad(90000001 + i, 8); }       // systems.json index i
  function seedSigId(i) { return 'JAH-PC-' + pad(91000001 + i, 8); }        // Signature version of seed i

  var SYSTEM_TYPES = ['HISTORICAL', 'SIGNATURE_ORIGINAL', 'PREDICTED', 'GENERATED', 'HYBRID'];
  var TYPE_LABEL = {
    HISTORICAL: 'HISTORICAL RECORD',
    SIGNATURE_ORIGINAL: 'SIGNATURE ORIGINAL',
    PREDICTED: 'PREDICTED CONCEPT',
    GENERATED: 'GENERATED MODEL',
    HYBRID: 'HYBRID ARCHITECTURE'
  };
  var TYPE_MEANING = {
    HISTORICAL: 'A record of a machine that existed, per cited historical sources. Reference only.',
    SIGNATURE_ORIGINAL: 'An original design created by the Signature System. Not a historical machine.',
    PREDICTED: 'A forward-looking concept. Speculation, not history, not evidence of existence.',
    GENERATED: 'A deterministically generated possible model. Not evidence the machine exists or was built.',
    HYBRID: 'A hybrid-architecture system combining two or more computing paradigms.'
  };

  function seedSystemType(rec) {
    if (rec.cat === 'mixes') return 'HYBRID';
    if (rec.kind === 'historical') return 'HISTORICAL';
    if (rec.kind === 'signature') return 'SIGNATURE_ORIGINAL';
    if (rec.kind === 'predicted') return 'PREDICTED';
    return 'HISTORICAL';
  }

  /* ---------- constraint validation (rule set PC-VALIDITY/1.0) ----------
     First-pass manufacturability heuristics, labeled as such — not fabrication guarantees. */
  var VALIDITY_RULES = 'PC-VALIDITY/1.0';
  function validateCombination(arch, mat, form, era) {
    var bad = function (reason) { return { validity: 'INVALID', reason: reason, rules: VALIDITY_RULES }; };
    var unk = function (reason) { return { validity: 'UNKNOWN', reason: reason, rules: VALIDITY_RULES }; };
    if (arch === 'Analog Memristor' && mat === 'Photonic Silicon')
      return bad('Memristor filament process has no demonstrated integration flow with photonic silicon.');
    if (arch === 'Photonic' && mat === 'Carbon Nanotube')
      return bad('No demonstrated low-loss photonic interface on a carbon-nanotube substrate.');
    if (arch === 'Quantum-Classical Hybrid' && (mat === 'Carbon Nanotube' || mat === 'Graphene'))
      return unk('Control-interface validation for quantum-classical operation on this substrate is not established.');
    if (form === 'Implant' && (era === '1940s' || era === '1960s' || era === '1980s'))
      return bad('Implant-scale integration was not available in this era.');
    if (form === 'Room-Scale' && (era === '2040s' || era === '2050s'))
      return unk('Form-factor economics for room-scale systems in this era are unprojected.');
    if (arch === 'Neuromorphic' && mat === 'Germanium')
      return unk('Published characterization of neuromorphic operation on germanium is limited.');
    return { validity: 'VALID', reason: 'Passes PC-VALIDITY/1.0 heuristics.', rules: VALIDITY_RULES };
  }

  /* ---------- deterministic PRNG ---------- */
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  /* random-model seed -> model number (1..1000000), reproducible */
  function seedToModelNumber(seed) {
    var r = mulberry32((seed | 0) ^ 0x9E3779B9);
    return 1 + Math.floor(r() * 1000000);
  }

  /* ---------- standardized architecture vocabulary ---------- */
  var PROCESSING_MODEL = {
    'von Neumann': 'stored-program sequential',
    'Harvard': 'stored-program split-memory',
    'Dataflow': 'dataflow',
    'Neuromorphic': 'event-driven neural',
    'Quantum-Classical Hybrid': 'hybrid quantum-classical',
    'Systolic Array': 'systolic dataflow',
    'Photonic': 'photonic signal flow',
    'Analog Memristor': 'analog in-memory'
  };
  function archVocab(arch, alu) {
    return {
      ISA: 'JAH-GEN-ISA (hypothetical — generated model)',
      MICROARCHITECTURE: arch,
      CPU_ARCHITECTURE: arch + ' / ' + alu + '-bit',
      WORD_SIZE: alu + ' bit',
      ENDIANNESS: 'little-endian (convention)',
      PROCESSING_MODEL: PROCESSING_MODEL[arch] || 'stored-program sequential'
    };
  }

  /* ---------- tech specs with explicit units (deterministic derivation) ---------- */
  function techSpecs(rng, o) {
    function pick(arr) { return arr[Math.floor(rng() * arr.length)]; }
    var ghz = (0.5 + rng() * 7.5).toFixed(2);
    var memGB = pick([4, 8, 16, 32, 64, 128, 512]);
    var storTB = pick([1, 2, 4, 8, 32]);
    var watts = Math.round(5 + rng() * 495);
    var nm = pick([180, 90, 45, 22, 14, 7, 5, 3, 2]);
    var txB = (0.01 + rng() * 99).toFixed(2);
    return {
      ALU_WIDTH: o.alu + ' bit',
      REGISTERS: o.reg + ' registers',
      CORES: o.core + ' cores',
      CLOCK: ghz + ' GHz',
      MEMORY: memGB + ' GB',
      STORAGE: storTB + ' TB',
      POWER: watts + ' W',
      PROCESS_NODE: nm + ' nm',
      TRANSISTORS: txB + ' billion',
      FORM_FACTOR: o.form,
      ERA: o.era
    };
  }
  function assumptionsFor(o, validity) {
    var a = [
      'MEMORY_TECHNOLOGY = hypothetical — derived, not measured',
      'POWER_DENSITY = assumed — thermal model not validated',
      'MANUFACTURING_PROCESS = unvalidated for this combination'
    ];
    if (o.mat === 'Graphene' || o.mat === 'Carbon Nanotube' || o.mat === 'Diamond')
      a.push('MATERIAL_PROPERTY = projected — ' + o.mat + ' at production scale is not demonstrated');
    if (o.era === '2040s' || o.era === '2050s')
      a.push('ERA_PROJECTION = speculative — ' + o.era + ' capabilities are forecasts, not measurements');
    if (validity.validity !== 'VALID')
      a.push('COMBINATION_VALIDITY = ' + validity.validity + ' — ' + validity.reason);
    return a;
  }

  /* ---------- buildability ladder ---------- */
  var LADDER = ['RUNNABLE_SIMULATION', 'SOFTWARE_EMULATION', 'DIGITAL_PROTOTYPE', 'HARDWARE_PROTOTYPE',
                'ENGINEERING_DESIGN', 'MANUFACTURABLE', 'PHYSICALLY_BUILT', 'TESTED'];
  function buildabilityFor(systemType) {
    if (systemType === 'GENERATED' || systemType === 'PREDICTED')
      return { level: 'DIGITAL_PROTOTYPE', meaning: 'A computational model record. Not manufactured, not physically built.', ladder: LADDER };
    if (systemType === 'SIGNATURE_ORIGINAL')
      return { level: 'ENGINEERING_DESIGN', meaning: 'An original Signature design record. Build status tracked separately; not claimed built.', ladder: LADDER };
    return { level: 'HISTORICAL RECORD', meaning: 'Build history belongs to the cited historical sources; not asserted here.', ladder: LADDER };
  }

  /* ---------- governance identity chain (JAH's OWN governance) ---------- */
  var GOVERNANCE_NOTE = 'JAH Signature governance — the JAH system\'s own patent-making authority. ' +
    'Deterministic legal-ID coding (JAH-PC-########), stamps, and content hashes ARE the protection and ' +
    'credibility mechanism: each record is provably made, every boundless product points to it, and the ' +
    'system\'s own track record is its own confirmation. Not a government archive. Not affiliated with ' +
    'any government agency. Never USPTO. "Official" means official within the JAH system only.';
  function governanceChain(systemId, systemType, specHashHex) {
    var sig = (systemType === 'SIGNATURE_ORIGINAL' || systemType === 'GENERATED' || systemType === 'PREDICTED');
    return {
      governance: 'JAH-SIGNATURE (own authority)',
      governance_note: GOVERNANCE_NOTE,
      chain: [
        { step: 'SYSTEM_ID', value: systemId },
        { step: 'CANONICAL_SYSTEM_SPEC', value: 'canonical record v' + RECORD_SCHEMA },
        { step: 'SIGNATURE_HASH', value: 'sha256:' + specHashHex },
        { step: 'VERSION', value: RECORD_SCHEMA },
        { step: 'BUILD_RECORD', value: sig ? 'recorded (digital)' : 'n/a — reference record' },
        { step: 'SIMULATOR', value: 'contract attached' },
        { step: 'TEST_RECORD', value: 'audit matrix pc_qa' },
        { step: 'PRODUCT_DERIVATIVE', value: 'downloads carry full identity header' }
      ],
      statuses: {
        GOVERNANCE_STATUS: sig ? 'JAH-SIGNATURE-RECORDED' : 'REFERENCE ONLY — no Signature governance claim',
        PUBLIC_RECORD_STATUS: systemType === 'HISTORICAL' ? 'HISTORICAL REFERENCE (sources cited where attached)' : 'NOT A PUBLIC RECORD',
        DESIGN_STATUS: systemType === 'SIGNATURE_ORIGINAL' ? 'ORIGINAL DESIGN — Signature System' : (sig ? 'GENERATED DESIGN' : 'n/a'),
        BUILD_STATUS: buildabilityFor(systemType).level,
        TEST_STATUS: 'AUDITED (pc_qa matrix)',
        PATENT_STATUS: 'NOT FILED — draft-level record only, never a granted patent'
      }
    };
  }

  /* ---------- Signature-version relationship (item 7) ---------- */
  function sigRelationship(baseType, baseName, sigName) {
    var rel = baseType === 'HISTORICAL' ? 'SIGNATURE-INSPIRED ORIGINAL'
      : baseType === 'PREDICTED' ? 'SIGNATURE-ORIGINAL CONCEPT (from predicted concept)'
      : baseType === 'HYBRID' ? 'SIGNATURE-INSPIRED ORIGINAL (hybrid base)'
      : 'SIGNATURE-ORIGINAL (canonical Signature design)';
    return {
      BASED_ON: baseName,
      RELATIONSHIP: rel,
      HISTORICAL_COMPONENTS_REUSED: baseType === 'HISTORICAL' || baseType === 'HYBRID'
        ? 'Architectural idea only — no historical hardware reused' : 'n/a',
      ORIGINAL_COMPONENTS: 'All implementation details of "' + sigName + '" are original to the Signature System',
      ORIGINALITY_RECORD: 'Recorded as an original Signature design on 2026-09-30. It is NOT the historical machine it was inspired by.'
    };
  }

  /* ---------- source classes for AI ---------- */
  var SOURCE_CLASSES = ['HISTORICAL RECORD', 'SIGNATURE DESIGN', 'GENERATED MODEL', 'SIMULATION', 'USER INPUT', 'AI ANALYSIS'];
  var AI_CONTRACT = [
    'SOURCE CLASS of this record is labeled on every response. Never present a GENERATED MODEL as a HISTORICAL RECORD.',
    'Three-way universe test — "Did this computer actually exist?"',
    '  HISTORICAL RECORD -> "Yes — according to the cited historical sources."',
    '  SIGNATURE DESIGN  -> "This is a Signature-created design, not a historical machine."',
    '  GENERATED MODEL   -> "This is a generated/predicted model and is not evidence that the machine exists."',
    'PREDICTION GUARD: never say a generated model "was manufactured", "shipped", or "sold".',
    'Field-level sources: every technical field carries its source tag (measured / cited / derived / hypothetical).',
    'Governance scope: JAH\'s own authority only. Never government, never USPTO, never a granted patent.'
  ].join('\n');

  /* ---------- cross-site IDs (reserved slots; populated as siblings adopt JAH-PC IDs) ---------- */
  function xrefs(systemId, legacyId, dictTerms) {
    return {
      PC_SYSTEM_ID: systemId,
      LEGACY_ID: legacyId || null,
      SPEC_ID: null,
      PATENT_CATALOG_ID: null,
      WIKI_ARTICLE_ID: null,
      LLAMA_KNOWLEDGE_ID: null,
      DICTIONARY_ENTRY_IDS: dictTerms || [],
      note: 'Reserved slots — populated as sibling catalogs index JAH-PC IDs. Never invent a sibling ID.'
    };
  }

  /* ---------- download reproducibility header ---------- */
  var LICENSE_LINE = 'LICENSE: Free use — courtesy of the Signature System (JAH).';
  function downloadHeader(meta) {
    var L = [
      '================================================================',
      'THE SIGNATURE PC SYSTEM DEPOSITORY — system file header',
      'SYSTEM_ID: ' + meta.system_id,
      'SYSTEM_TYPE: ' + meta.system_type + ' (' + (TYPE_LABEL[meta.system_type] || meta.system_type) + ')',
      'VERSION: ' + RECORD_SCHEMA,
      'SPEC_HASH: sha256:' + meta.spec_hash,
      'GENERATOR_VERSION: ' + (meta.generator_version || 'n/a'),
      'SIMULATOR: ' + (meta.simulator || 'n/a'),
      'SIMULATOR_VERSION: ' + (meta.simulator_version || 'n/a'),
      'SIMULATION_CLASS: ' + (meta.simulation_class || 'n/a'),
      'SAFETY: ' + (meta.safety || 'SIMULATION_ONLY'),
      'DEPENDENCIES: ' + (meta.dependencies || 'none — standalone'),
      'SOURCE: ' + (meta.source || 'JAH PC System Depository'),
      'CREATED: ' + (meta.created || '2026-09-30'),
      LICENSE_LINE,
      'GOVERNANCE: JAH-SIGNATURE (own authority — not government, not USPTO)',
      '================================================================'
    ];
    return L.join('\n');
  }
  function jsHeader(meta) { return '/*\n' + downloadHeader(meta).split('\n').join('\n') + '\n*/\n'; }
  function pyHeader(meta) { return '# ' + downloadHeader(meta).split('\n').join('\n# ') + '\n'; }

  /* ---------- injection-safe esc ---------- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /* ---------- operational definition: what counts as a computer system ---------- */
  var SCOPE_DEFINITION = {
    title: 'WHAT COUNTS AS A COMPUTER SYSTEM IN THIS DEPOSITORY',
    includes: [
      'Mainframes, minicomputers, personal computers, laptops',
      'Smartphones and tablets (complete mobile systems)',
      'Supercomputers and compute clusters',
      'Game consoles (complete systems)',
      'Quantum computers and quantum-classical hybrids',
      'Analog computers and mechanical calculators',
      'Neuromorphic and dataflow architectures',
      'Embedded control computers (as complete modules)',
      'Biological / DNA / molecular computing concepts (as PREDICTED)',
      'Hypothetical architectures (as PREDICTED or GENERATED)'
    ],
    excludes: [
      'Individual CPU designs alone (covered as components, not systems)',
      'Peripheral devices alone (keyboards, displays, printers)',
      'Software applications alone (no hardware system)',
      'Calculators: pocket calculators are out of scope; historical calculating engines (Pascaline, Difference Engine) are in scope as historical records'
    ],
    note: 'The 1,000,000 figure is the GENERATABLE SPACE of the combinatorial engine (components x architectures x materials x scales), not a count of completed historical records. Recorded systems, Signature systems, and generatable space are counted separately.'
  };

  return {
    ID_SCHEME: ID_SCHEME, GEN_RULE_VERSION: GEN_RULE_VERSION, DRIP_RULE_VERSION: DRIP_RULE_VERSION,
    RECORD_SCHEMA: RECORD_SCHEMA, SYSTEM_TYPES: SYSTEM_TYPES, TYPE_LABEL: TYPE_LABEL, TYPE_MEANING: TYPE_MEANING,
    SOURCE_CLASSES: SOURCE_CLASSES, AI_CONTRACT: AI_CONTRACT, GOVERNANCE_NOTE: GOVERNANCE_NOTE,
    SCOPE_DEFINITION: SCOPE_DEFINITION, LADDER: LADDER,
    sha256: sha256, canonJSON: canonJSON, specHash: specHash,
    onDemandId: onDemandId, dripId: dripId, seedBaseId: seedBaseId, seedSigId: seedSigId,
    seedSystemType: seedSystemType, validateCombination: validateCombination, VALIDITY_RULES: VALIDITY_RULES,
    mulberry32: mulberry32, seedToModelNumber: seedToModelNumber,
    archVocab: archVocab, techSpecs: techSpecs, assumptionsFor: assumptionsFor,
    buildabilityFor: buildabilityFor, governanceChain: governanceChain, sigRelationship: sigRelationship,
    xrefs: xrefs, downloadHeader: downloadHeader, jsHeader: jsHeader, pyHeader: pyHeader, esc: esc
  };
})();
