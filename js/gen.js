/* Signature PC Systems - Deterministic PC Model Enumerator (vault theme data engine)
   Combinatorial "possible models" space, enumerated on demand. No storage, no network.
   window.PCMODELS = { TOTAL: 1000000, at(i), countByCat() } */
window.PCMODELS = (function () {
  'use strict';

  var TOTAL = 1000000;

  var ARCH = [
    'von Neumann', 'Harvard', 'Dataflow', 'Neuromorphic',
    'Quantum-Classical Hybrid', 'Systolic Array', 'Photonic', 'Analog Memristor'
  ];
  var MAT = [
    'Silicon', 'Germanium', 'Gallium Arsenide', 'Diamond', 'Graphene',
    'Silicon Carbide', 'Photonic Silicon', 'Indium Phosphide', 'Gallium Nitride', 'Carbon Nanotube'
  ];
  var ALU = [4, 8, 12, 16, 24, 32, 64, 128];
  var REG = [4, 8, 16, 24, 32, 48, 64, 128];
  var CORE = [1, 2, 4, 8, 16, 32, 64, 128, 256, 1024];
  var ERA = ['1940s', '1960s', '1980s', '2000s', '2020s', '2030s', '2040s', '2050s'];
  var FORM = [
    'Room-Scale', 'Rack', 'Desktop', 'Laptop', 'Handheld',
    'Wearable', 'Embedded', 'Implant', 'Cloud Node', 'Orbital'
  ];
  // 8 x 10 x 8 x 8 x 10 x 8 x 10 = 40,960,000 combinations; we expose the first 1,000,000.
  var RADIX = [ARCH.length, MAT.length, ALU.length, REG.length, CORE.length, ERA.length, FORM.length];

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function decode(i) {
    var idx = [], n = i;
    for (var d = RADIX.length - 1; d >= 0; d--) {
      idx[d] = n % RADIX[d];
      n = Math.floor(n / RADIX[d]);
    }
    return idx;
  }

  function pad(n, w) { var s = String(n); while (s.length < w) s = '0' + s; return s; }

  var CATS = ['Historic Machines', 'Modern Systems', 'Quantum Systems', 'Materials & Substrates',
              'Mixes', 'Predicted Models', 'Signature-Developed Models'];

  /* simulator class per architecture (representative: illustrates the architecture class) */
  var SIM_FOR_ARCH = {
    'von Neumann': 'cpu4', 'Harvard': 'stored', 'Dataflow': 'gates',
    'Neuromorphic': 'cpu4', 'Quantum-Classical Hybrid': 'quantum',
    'Systolic Array': 'gates', 'Photonic': 'material', 'Analog Memristor': 'material'
  };

  function catFor(arch, era) {
    if (arch === 'Quantum-Classical Hybrid') return 'Quantum Systems';
    if (arch === 'Photonic' || arch === 'Analog Memristor') return 'Materials & Substrates';
    if (era === '1940s' || era === '1960s') return 'Historic Machines';
    if (era === '2040s' || era === '2050s') return 'Predicted Models';
    if (era === '2030s') return 'Signature-Developed Models';
    return 'Modern Systems';
  }

  function at(i) {
    i = Math.floor(i);
    if (i < 0 || i >= TOTAL) throw new RangeError('at(i): i out of range [0,' + TOTAL + ')');
    var d = decode(i);
    var arch = ARCH[d[0]], mat = MAT[d[1]], alu = ALU[d[2]], reg = REG[d[3]],
        core = CORE[d[4]], era = ERA[d[5]], form = FORM[d[6]];
    var rnd = mulberry32(i * 2654435761);
    var series = 100 + Math.floor(rnd() * 900);
    var name = 'Signature ' + arch + ' ' + mat + ' ' + alu + '-bit ' + form + ' ' + series;
    var cat = catFor(arch, era);
    var blurb = 'A ' + era + ' ' + form.toLowerCase() + ' concept pairing a ' + arch.toLowerCase() +
      ' architecture with a ' + mat.toLowerCase() + ' substrate: ' + alu +
      '-bit ALU, ' + reg + ' registers, ' + core + ' core' + (core === 1 ? '' : 's') + '.';
    var n = i + 1;
    var ID = window.PCIDENT;
    var validity = ID.validateCombination(arch, mat, form, era);
    var specRng = ID.mulberry32(i * 40503 + 17);
    var core2 = {
      system_id: ID.onDemandId(n),
      id_scheme: ID.ID_SCHEME,
      system_type: 'GENERATED',
      source_class: 'GENERATED MODEL',
      generator_version: ID.GEN_RULE_VERSION,
      record_schema: ID.RECORD_SCHEMA,
      model_number: n,
      legacy_id: 'pcm-' + pad(n, 6),
      name: name, blurb: blurb, category: cat,
      component_set: { ARCHITECTURE: arch, MATERIAL: mat, ALU_WIDTH_BIT: alu, REGISTERS: reg, CORES: core, ERA: era, FORM_FACTOR: form },
      architecture: ID.archVocab(arch, alu),
      tech_specs: ID.techSpecs(specRng, { alu: alu, reg: reg, core: core, form: form, era: era, mat: mat }),
      validity: validity,
      assumptions: ID.assumptionsFor({ mat: mat, era: era }, validity),
      buildability: ID.buildabilityFor('GENERATED'),
      simulator_key: SIM_FOR_ARCH[arch] || 'gates',
      simulator_note: 'Representative simulator — illustrates the ' + arch + ' architecture class, not this exact model.'
    };
    core2.spec_hash = ID.specHash(core2);
    core2.governance = ID.governanceChain(core2.system_id, 'GENERATED', core2.spec_hash);
    core2.xrefs = ID.xrefs(core2.system_id, core2.legacy_id, []);
    return core2;
  }

  function countByCat() {
    var counts = {}, i;
    for (i = 0; i < CATS.length; i++) counts[CATS[i]] = 0;
    // exact count over the exposed range would be 1M iterations; do a fast analytic pass
    // over the mixed-radix lattice instead: iterate the two slowest dims fully is overkill,
    // so we count by decoding the structure. Simpler + exact: single pass is fine (~1M ops).
    for (i = 0; i < TOTAL; i++) {
      var d = decode(i);
      counts[catFor(ARCH[d[0]], ERA[d[5]])]++;
    }
    return counts;
  }

  return { TOTAL: TOTAL, at: at, countByCat: countByCat };
})();
