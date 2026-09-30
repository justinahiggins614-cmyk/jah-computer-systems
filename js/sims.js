/* Signature PC Systems - Interactive Demo Engine (vault theme)
   High-tech corporate vault: dark metallic backgrounds, electric-blue accents,
   sleek HUD-style panels. Dependency-free browser JS. */
window.SIMS = (function () {
  'use strict';

  /* ---- shared vault-styled helpers ---- */
  function hud(el, title) {
    el.style.cssText = 'background:linear-gradient(145deg,#0b0e14 0%,#11151d 50%,#0b0e14 100%);' +
      'border:1px solid #1e90ff;border-radius:10px;padding:14px;color:#cfe6ff;' +
      'font-family:"Courier New",ui-monospace,monospace;box-shadow:0 0 18px rgba(30,144,255,.18),inset 0 0 40px rgba(30,144,255,.05);' +
      'max-width:640px;';
    el.innerHTML = '';
    var h = document.createElement('div');
    h.textContent = '▚ ' + title;
    h.style.cssText = 'color:#38bdf8;font-weight:bold;letter-spacing:2px;border-bottom:1px solid #1e90ff;' +
      'padding-bottom:8px;margin-bottom:12px;font-size:14px;text-shadow:0 0 8px #1e90ff;';
    el.appendChild(h);
    return el;
  }
  function btn(label) {
    var b = document.createElement('button');
    b.textContent = label;
    b.style.cssText = 'background:linear-gradient(180deg,#1a2333,#0e1522);color:#7dd3fc;border:1px solid #38bdf8;' +
      'border-radius:6px;padding:6px 12px;margin:3px;cursor:pointer;font-family:inherit;font-size:12px;' +
      'letter-spacing:1px;';
    b.onmouseover = function () { b.style.boxShadow = '0 0 10px #38bdf8'; };
    b.onmouseout = function () { b.style.boxShadow = 'none'; };
    return b;
  }
  function lamp(on, label) {
    var s = document.createElement('span');
    s.textContent = '● ' + (label || '');
    s.style.cssText = 'color:' + (on ? '#00ffcc' : '#274b63') + ';font-weight:bold;margin:2px 8px;' +
      (on ? 'text-shadow:0 0 10px #00ffcc;' : '');
    return s;
  }
  function hex(n, d) { var s = n.toString(16).toUpperCase(); while (s.length < d) s = '0' + s; return s; }

  /* ================= ABACUS ================= */
  var abacus = {
    title: 'Vault Abacus — Bead Arithmetic Console',
    blurb: 'Click beads to add or subtract. The vault ledger keeps the running total.',
    render: function (el, rec) {
      hud(el, 'ABACUS LEDGER CONSOLE');
      var rows = [0, 0, 0, 0, 0], ROWS = 5;
      function total() { var t = 0; for (var i = 0; i < ROWS; i++) t += rows[i]; return t; }
      var totalLine = document.createElement('div');
      totalLine.style.cssText = 'font-size:22px;color:#38bdf8;margin:8px 0;text-shadow:0 0 12px #1e90ff;';
      var grid = document.createElement('div');
      function draw() {
        var t = total();
        totalLine.innerHTML = 'VAULT TOTAL&nbsp; ' + t + ' &nbsp;(' + hex(t < 0 ? 0 : t, 4) + 'h)';
        grid.innerHTML = '';
        for (var r = 0; r < ROWS; r++) {
          var row = document.createElement('div');
          row.style.cssText = 'display:flex;align-items:center;margin:6px 0;';
          var lab = document.createElement('span');
          lab.textContent = 'x' + (r + 1) + '  ';
          lab.style.cssText = 'color:#5b7a99;width:44px;font-size:12px;';
          row.appendChild(lab);
          [-(r + 1), (r + 1)].forEach(function (v) {
            var b = btn((v > 0 ? '+' : '') + v);
            b.onclick = (function (rv, vv) { return function () { rows[rv] += vv; draw(); }; })(r, v);
            row.appendChild(b);
          });
          var reset = btn('row→0');
          reset.onclick = (function (rv) { return function () { rows[rv] = 0; draw(); }; })(r);
          row.appendChild(reset);
          grid.appendChild(row);
        }
      }
      var clearAll = btn('⟲ CLEAR LEDGER');
      clearAll.onclick = function () { rows = [0, 0, 0, 0, 0]; draw(); };
      el.appendChild(totalLine); el.appendChild(grid); el.appendChild(clearAll);
      draw();
    },
    codeJS: function (rec) {
      return '// ' + recName(rec) + ' — Vault Abacus (JS, runs in browser or node)\n' +
        'let total = 0;\n' +
        'const ROWS = 5;\n' +
        'function add(v) { total += v; show(); }\n' +
        'function clear() { total = 0; show(); }\n' +
        'function show() { console.log("VAULT TOTAL " + total + " (" + total.toString(16).toUpperCase() + "h)"); }\n' +
        'function pressRow(r, dir) { add(dir * r); } // dir = +1 add, -1 subtract\n' +
        'function demo() {\n' +
        '  for (let r = 1; r <= ROWS; r++) pressRow(r, +1);\n' +
        '  pressRow(2, -1); pressRow(2, -1); // subtract 2+2 via row 2\n' +
        '  add(-3);\n' +
        '  show();\n' +
        '}\n' +
        'if (typeof process !== "undefined" && process.argv[2]) {\n' +
        '  // node abacus.js "+3 -1 +5" -> applies bead presses from CLI\n' +
        '  for (const t of process.argv.slice(2)) add(parseInt(t, 10) || 0);\n' +
        '  show();\n' +
        '} else {\n' +
        '  demo();\n' +
        '}\n';
    },
    codePY: function (rec) {
      return '# ' + recName(rec) + ' — Vault Abacus (Python)\n' +
        'total = 0\n' +
        'ROWS = 5\n' +
        'def add(v):\n' +
        '    global total\n' +
        '    total += v\n' +
        '    show()\n' +
        'def clear():\n' +
        '    global total\n' +
        '    total = 0\n' +
        '    show()\n' +
        'def show():\n' +
        '    print("VAULT TOTAL %d (%Xh)" % (total, total & 0xFFFF))\n' +
        'if __name__ == "__main__":\n' +
        '    for r in range(1, ROWS + 1):\n' +
        '        add(r)\n' +
        '    add(-3)\n' +
        '    show()\n';
    }
  };

  /* ================= LOGIC GATES ================= */
  var gates = {
    title: 'Gate Bay — Logic Gate Playground',
    blurb: 'Toggle inputs, pick a gate, watch the output lamp. Includes a half-adder preset.',
    render: function (el, rec) {
      hud(el, 'GATE BAY // LOGIC PLAYGROUND');
      var A = 0, B = 0, gate = 'AND';
      var FNS = { AND: function (a, b) { return a & b; }, OR: function (a, b) { return a | b; }, NAND: function (a, b) { return (a & b) ^ 1; }, NOR: function (a, b) { return (a | b) ^ 1; }, XOR: function (a, b) { return a ^ b; }, NOT: function (a) { return a ^ 1; } };
      var out = document.createElement('div');
      out.style.cssText = 'margin:12px 0;font-size:16px;';
      function draw() {
        out.innerHTML = '';
        var a = lamp(A, 'A'); var b = lamp(B, 'B');
        out.appendChild(a); out.appendChild(b);
        var o = gate === 'NOT' ? FNS.NOT(A) : FNS[gate](A, B);
        out.appendChild(lamp(o, 'OUT ← ' + gate));
        var eq = document.createElement('div');
        eq.style.cssText = 'color:#5b7a99;font-size:12px;margin-top:8px;';
        eq.textContent = gate === 'NOT' ? ('NOT A = ' + o) : ('A=' + A + '  ' + gate + '  B=' + B + '  →  ' + o);
        out.appendChild(eq);
      }
      var row1 = document.createElement('div');
      var tA = btn('TOGGLE A'), tB = btn('TOGGLE B');
      tA.onclick = function () { A ^= 1; draw(); };
      tB.onclick = function () { B ^= 1; draw(); };
      row1.appendChild(tA); row1.appendChild(tB);
      var row2 = document.createElement('div');
      Object.keys(FNS).forEach(function (g) {
        var b = btn(g);
        b.onclick = function () { gate = g; draw(); };
        row2.appendChild(b);
      });
      var row3 = document.createElement('div');
      var ha = btn('⚙ HALF-ADDER PRESET');
      ha.onclick = function () {
        out.innerHTML = '';
        var t = document.createElement('div');
        t.style.cssText = 'color:#38bdf8;font-size:13px;line-height:1.9;';
        var html = 'HALF-ADDER TRUTH TABLE (SUM = A⊕B, CARRY = A·B)<br>';
        for (var a = 0; a < 2; a++) for (var b = 0; b < 2; b++)
          html += 'A=' + a + ' B=' + b + ' → SUM=' + (a ^ b) + ' CARRY=' + (a & b) + '<br>';
        t.innerHTML = html;
        out.appendChild(t);
      };
      row3.appendChild(ha);
      el.appendChild(row1); el.appendChild(row2); el.appendChild(row3); el.appendChild(out);
      draw();
    },
    codeJS: function (rec) {
      return '// ' + recName(rec) + ' — Gate Bay (JS)\n' +
        'const G = {\n' +
        '  AND:(a,b)=>a&b, OR:(a,b)=>a|b, NAND:(a,b)=>(a&b)^1,\n' +
        '  NOR:(a,b)=>(a|b)^1, XOR:(a,b)=>a^b, NOT:(a)=>a^1\n' +
        '};\n' +
        'function halfAdder(a,b){ return {sum:a^b, carry:a&b}; }\n' +
        'function fullAdder(a,b,cin){\n' +
        '  const s1=halfAdder(a,b), s2=halfAdder(s1.sum,cin);\n' +
        '  return {sum:s2.sum, carry:s1.carry|s2.carry};\n' +
        '}\n' +
        'for (const name of Object.keys(G)) {\n' +
        '  let line = name + ": ";\n' +
        '  for (let a=0;a<2;a++) for (let b=0;b<2;b++)\n' +
        '    line += name==="NOT" ? "" : `(${a},${b})->${name==="NOT"?G.NOT(a):G[name](a,b)} `;\n' +
        '  console.log(line);\n' +
        '}\n' +
        'console.log("half-adder(1,1) =", JSON.stringify(halfAdder(1,1)));\n' +
        'console.log("full-adder(1,1,1) =", JSON.stringify(fullAdder(1,1,1)));\n';
    },
    codePY: function (rec) {
      return '# ' + recName(rec) + ' — Gate Bay (Python)\n' +
        'def AND(a,b): return a & b\n' +
        'def OR(a,b): return a | b\n' +
        'def NAND(a,b): return (a & b) ^ 1\n' +
        'def NOR(a,b): return (a | b) ^ 1\n' +
        'def XOR(a,b): return a ^ b\n' +
        'def NOT(a): return a ^ 1\n' +
        'def half_adder(a, b):\n' +
        '    return {"sum": a ^ b, "carry": a & b}\n' +
        'if __name__ == "__main__":\n' +
        '    for name, fn in [("AND",AND),("OR",OR),("XOR",XOR),("NAND",NAND),("NOR",NOR)]:\n' +
        '        print(name, [(a,b,fn(a,b)) for a in (0,1) for b in (0,1)])\n' +
        '    print("NOT", [(a, NOT(a)) for a in (0,1)])\n' +
        '    print("half-adder(1,1) =", half_adder(1,1))\n';
    }
  };

  /* ================= 4-BIT CPU ================= */
  var cpu4 = {
    title: 'CPU-4 Core — 4-Bit CPU Emulator',
    blurb: 'A real 4-bit CPU: 16 bytes of RAM, 5 instructions, step and run controls.',
    render: function (el, rec) {
      hud(el, 'CPU-4 CORE // 4-BIT EMULATOR');
      var ram = new Array(16).fill(0), acc = 0, pc = 0, running = false, timer = null;
      // LDA a | ADD a | STA a | OUT | HLT  -- opcode: high nibble op, low nibble addr
      var prog = document.createElement('textarea');
      prog.value = 'LDA 14\nADD 15\nOUT\nHLT';
      prog.style.cssText = 'width:96%;height:90px;background:#05080d;color:#7dd3fc;border:1px solid #1e90ff;' +
        'border-radius:6px;font-family:inherit;font-size:13px;padding:8px;';
      var disp = document.createElement('div');
      disp.style.cssText = 'margin:10px 0;font-size:13px;line-height:1.8;';
      function assemble(src) {
        var out = new Array(16).fill(0);
        src.toUpperCase().split('\n').forEach(function (ln, i) {
          if (i >= 16) return;
          var p = ln.trim().split(/\s+/);
          var op = p[0], arg = parseInt(p[1] || '0', 10) & 15;
          var code = { LDA: 1, ADD: 2, STA: 3, OUT: 4, HLT: 5 }[op] || 0;
          out[i] = (code << 4) | arg;
        });
        return out;
      }
      function draw(extra) {
        var s = 'ACC=' + acc + ' (0x' + hex(acc, 1) + ') &nbsp; PC=' + pc + '<br>RAM: ';
        for (var i = 0; i < 16; i++) s += '[' + i + ']=' + hex(ram[i], 2) + ' ';
        disp.innerHTML = s + (extra ? '<br><span style="color:#00ffcc">' + extra + '</span>' : '');
      }
      function step() {
        if (pc < 0 || pc > 15) { stop(); draw('HALT: PC out of range'); return; }
        var ins = ram[pc], op = (ins >> 4) & 15, arg = ins & 15;
        pc++;
        if (op === 1) acc = ram[arg];
        else if (op === 2) acc = (acc + ram[arg]) & 15;
        else if (op === 3) ram[arg] = acc;
        else if (op === 4) draw('◉ OUTPUT → ' + acc + ' (0x' + hex(acc, 1) + ')');
        else if (op === 5) { stop(); draw('■ HALTED'); return; }
        acc &= 15;
        if (op !== 4) draw();
      }
      function stop() { running = false; if (timer) clearInterval(timer); timer = null; runB.textContent = '▶ RUN'; }
      function load() { ram = assemble(prog.value); ram[14] = 7; ram[15] = 5; acc = 0; pc = 0; stop(); draw('program loaded — RAM[14]=7, RAM[15]=5 preset'); }
      var loadB = btn('⤓ LOAD PROGRAM'), stepB = btn('⏭ STEP'), runB = btn('▶ RUN'), rstB = btn('⟲ RESET');
      loadB.onclick = load;
      stepB.onclick = function () { stop(); step(); };
      runB.onclick = function () {
        if (running) { stop(); return; }
        running = true; runB.textContent = '⏸ PAUSE';
        timer = setInterval(function () { step(); if (!running) return; if (pc > 15) stop(); }, 350);
      };
      rstB.onclick = load;
      var note = document.createElement('div');
      note.style.cssText = 'color:#5b7a99;font-size:11px;margin-top:8px;';
      note.textContent = 'ISA: LDA a · ADD a · STA a · OUT · HLT — edit the program, LOAD, then STEP or RUN.';
      var row = document.createElement('div');
      [loadB, stepB, runB, rstB].forEach(function (b) { row.appendChild(b); });
      el.appendChild(prog); el.appendChild(row); el.appendChild(disp); el.appendChild(note);
      load();
    },
    codeJS: function (rec) {
      return '// ' + recName(rec) + ' — CPU-4 Emulator (JS)\n' +
        'const OP = { LDA:1, ADD:2, STA:3, OUT:4, HLT:5 };\n' +
        'function assemble(src){\n' +
        '  const ram = new Array(16).fill(0);\n' +
        '  src.toUpperCase().split("\\n").forEach((ln,i)=>{\n' +
        '    if(i>=16) return;\n' +
        '    const [op,a]=ln.trim().split(/\\s+/);\n' +
        '    ram[i]=((OP[op]||0)<<4)|(parseInt(a||"0",10)&15);\n' +
        '  });\n' +
        '  return ram;\n' +
        '}\n' +
        'function run(src){\n' +
        '  const ram=assemble(src); ram[14]=7; ram[15]=5;\n' +
        '  let acc=0, pc=0;\n' +
        '  for(let n=0;n<64;n++){\n' +
        '    const ins=ram[pc], op=(ins>>4)&15, arg=ins&15; pc++;\n' +
        '    if(op===1) acc=ram[arg];\n' +
        '    else if(op===2) acc=(acc+ram[arg])&15;\n' +
        '    else if(op===3) ram[arg]=acc;\n' +
        '    else if(op===4) console.log("OUT ->",acc);\n' +
        '    else if(op===5){ console.log("HALT"); break; }\n' +
        '  }\n' +
        '}\n' +
        'run("LDA 14\\nADD 15\\nOUT\\nHLT");\n';
    },
    codePY: function (rec) {
      return '# ' + recName(rec) + ' — CPU-4 Emulator (Python)\n' +
        'OP = {"LDA":1,"ADD":2,"STA":3,"OUT":4,"HLT":5}\n' +
        'def assemble(src):\n' +
        '    ram = [0]*16\n' +
        '    for i, ln in enumerate(src.upper().splitlines()):\n' +
        '        if i >= 16: break\n' +
        '        p = ln.split()\n' +
        '        op = OP.get(p[0], 0)\n' +
        '        arg = int(p[1]) & 15 if len(p) > 1 else 0\n' +
        '        ram[i] = (op << 4) | arg\n' +
        '    return ram\n' +
        'def run(src):\n' +
        '    ram = assemble(src); ram[14] = 7; ram[15] = 5\n' +
        '    acc, pc = 0, 0\n' +
        '    for _ in range(64):\n' +
        '        ins = ram[pc]; op, arg = (ins >> 4) & 15, ins & 15; pc += 1\n' +
        '        if op == 1: acc = ram[arg]\n' +
        '        elif op == 2: acc = (acc + ram[arg]) & 15\n' +
        '        elif op == 3: ram[arg] = acc\n' +
        '        elif op == 4: print("OUT ->", acc)\n' +
        '        elif op == 5: print("HALT"); break\n' +
        'if __name__ == "__main__":\n' +
        '    run("LDA 14\\nADD 15\\nOUT\\nHLT")\n';
    }
  };

  /* ================= STORED PROGRAM ================= */
  var stored = {
    title: 'Stored-Program Vault — Line-by-Line Interpreter',
    blurb: 'Type simple commands (PRINT, ADD, MUL, SET). The vault executes them in order.',
    render: function (el, rec) {
      hud(el, 'STORED-PROGRAM VAULT');
      var src = document.createElement('textarea');
      src.value = 'SET x 6\nSET y 7\nMUL x y\nPRINT result\nADD x 100\nPRINT result';
      src.style.cssText = 'width:96%;height:100px;background:#05080d;color:#7dd3fc;border:1px solid #1e90ff;' +
        'border-radius:6px;font-family:inherit;font-size:13px;padding:8px;';
      var out = document.createElement('div');
      out.style.cssText = 'background:#05080d;border:1px solid #1e90ff;border-radius:6px;min-height:90px;' +
        'margin-top:10px;padding:10px;font-size:13px;color:#a5e8ff;white-space:pre-wrap;';
      function exec() {
        out.innerHTML = '';
        var vars = {};
        var lines = src.value.split('\n');
        var i = 0;
        function val(t) { return /^-?\\d+$/.test(t) ? parseInt(t, 10) : (vars[t] || 0); }
        function next() {
          if (i >= lines.length) { log('— end of program —'); return; }
          var p = lines[i].trim().split(/\s+/); i++;
          if (!p[0]) { next(); return; }
          var op = p[0].toUpperCase();
          if (op === 'SET') vars[p[1]] = val(p[2]);
          else if (op === 'ADD') vars.result = val(p[1]) + val(p[2]);
          else if (op === 'SUB') vars.result = val(p[1]) - val(p[2]);
          else if (op === 'MUL') vars.result = val(p[1]) * val(p[2]);
          else if (op === 'DIV') vars.result = Math.floor(val(p[1]) / (val(p[2]) || 1));
          else if (op === 'PRINT') log('▸ ' + (p.slice(1).join(' ') in vars || /^[-\d]+$/.test(p[1]) ? val(p[1]) : p.slice(1).join(' ')));
          else log('? unknown: ' + op);
          logLine(op, p);
          setTimeout(next, 450);
        }
        function log(t) { out.innerHTML += t + '\n'; out.scrollTop = 1e6; }
        function logLine() {}
        next();
      }
      var b = btn('▶ EXECUTE LINE BY LINE');
      b.onclick = exec;
      var note = document.createElement('div');
      note.style.cssText = 'color:#5b7a99;font-size:11px;margin-top:8px;';
      note.textContent = 'Commands: SET x 5 · ADD x y → result · SUB · MUL · DIV · PRINT x';
      el.appendChild(src); el.appendChild(b); el.appendChild(out); el.appendChild(note);
    },
    codeJS: function (rec) {
      return '// ' + recName(rec) + ' — Stored-Program Interpreter (JS)\n' +
        'function exec(src){\n' +
        '  const vars={};\n' +
        '  const val=t=>/^-?\\d+$/.test(t)?parseInt(t,10):(vars[t]||0);\n' +
        '  for(const ln of src.split("\\n")){\n' +
        '    const p=ln.trim().split(/\\s+/); if(!p[0]) continue;\n' +
        '    const op=p[0].toUpperCase();\n' +
        '    if(op==="SET") vars[p[1]]=val(p[2]);\n' +
        '    else if(op==="ADD") vars.result=val(p[1])+val(p[2]);\n' +
        '    else if(op==="SUB") vars.result=val(p[1])-val(p[2]);\n' +
        '    else if(op==="MUL") vars.result=val(p[1])*val(p[2]);\n' +
        '    else if(op==="DIV") vars.result=Math.floor(val(p[1])/(val(p[2])||1));\n' +
        '    else if(op==="PRINT") console.log(">",val(p[1]));\n' +
        '  }\n' +
        '  return vars;\n' +
        '}\n' +
        'console.log(exec("SET x 6\\nSET y 7\\nMUL x y\\nPRINT result"));\n';
    },
    codePY: function (rec) {
      return '# ' + recName(rec) + ' — Stored-Program Interpreter (Python)\n' +
        'import re\n' +
        'def exec_prog(src):\n' +
        '    vars = {}\n' +
        '    def val(t):\n' +
        '        return int(t) if re.match(r"^-?\\d+$", t) else vars.get(t, 0)\n' +
        '    for ln in src.splitlines():\n' +
        '        p = ln.split()\n' +
        '        if not p: continue\n' +
        '        op = p[0].upper()\n' +
        '        if op == "SET": vars[p[1]] = val(p[2])\n' +
        '        elif op == "ADD": vars["result"] = val(p[1]) + val(p[2])\n' +
        '        elif op == "SUB": vars["result"] = val(p[1]) - val(p[2])\n' +
        '        elif op == "MUL": vars["result"] = val(p[1]) * val(p[2])\n' +
        '        elif op == "DIV": vars["result"] = val(p[1]) // (val(p[2]) or 1)\n' +
        '        elif op == "PRINT": print(">", val(p[1]))\n' +
        '    return vars\n' +
        'if __name__ == "__main__":\n' +
        '    print(exec_prog("SET x 6\\nSET y 7\\nMUL x y\\nPRINT result"))\n';
    }
  };

  /* ================= QUANTUM ================= */
  var quantum = {
    title: 'Q-Vault — 2-Qubit State-Vector Simulator',
    blurb: 'Real complex-number quantum math. Apply H, X, CNOT, then sample 100 shots.',
    render: function (el, rec) {
      hud(el, 'Q-VAULT // 2-QUBIT SIMULATOR');
      var SQ = 1 / Math.sqrt(2);
      var st = [{ re: 1, im: 0 }, { re: 0, im: 0 }, { re: 0, im: 0 }, { re: 0, im: 0 }];
      function cadd(a, b) { return { re: a.re + b.re, im: a.im + b.im }; }
      function cmul(a, b) { return { re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re }; }
      function apply1(U, q) { // U 2x2 on qubit q (0 = left/most-sig)
        var n = [0, 0, 0, 0].map(function () { return { re: 0, im: 0 }; });
        for (var i = 0; i < 4; i++)
          for (var j = 0; j < 4; j++) {
            var bi = (i >> (1 - q)) & 1, bj = (j >> (1 - q)) & 1;
            // the OTHER qubit's bit (position q) must match for a single-qubit gate
            if (((i >> q) & 1) !== ((j >> q) & 1)) continue;
            n[i] = cadd(n[i], cmul(U[bi][bj], st[j]));
          }
        st = n;
      }
      function applyCNOT() {
        var n = [st[0], st[1], st[3], st[2]];
        st = n;
      }
      var H = [[{ re: SQ, im: 0 }, { re: SQ, im: 0 }], [{ re: SQ, im: 0 }, { re: -SQ, im: 0 }]];
      var X = [[{ re: 0, im: 0 }, { re: 1, im: 0 }], [{ re: 1, im: 0 }, { re: 0, im: 0 }]];
      var sv = document.createElement('div');
      sv.style.cssText = 'font-size:13px;line-height:1.9;margin:10px 0;';
      function fmt(c) {
        var r = Math.round(c.re * 1000) / 1000, im = Math.round(c.im * 1000) / 1000;
        return r + (im >= 0 ? '+' : '') + im + 'i';
      }
      function draw() {
        var names = ['|00⟩', '|01⟩', '|10⟩', '|11⟩'];
        var h = 'STATE VECTOR<br>';
        for (var i = 0; i < 4; i++) {
          var p = st[i].re * st[i].re + st[i].im * st[i].im;
          var bar = '';
          for (var k = 0; k < Math.round(p * 24); k++) bar += '█';
          h += '<span style="color:#38bdf8">' + names[i] + '</span> ' + fmt(st[i]) +
            ' &nbsp;<span style="color:#00ffcc">' + bar + '</span> ' + Math.round(p * 100) + '%<br>';
        }
        sv.innerHTML = h;
      }
      var hist = document.createElement('div');
      hist.style.cssText = 'font-size:13px;line-height:1.8;margin-top:10px;';
      function sample() {
        var counts = [0, 0, 0, 0];
        for (var s = 0; s < 100; s++) {
          var r = Math.random(), acc = 0, pick = 3;
          for (var i = 0; i < 4; i++) { acc += st[i].re * st[i].re + st[i].im * st[i].im; if (r < acc) { pick = i; break; } }
          counts[pick]++;
        }
        var names = ['|00⟩', '|01⟩', '|10⟩', '|11⟩'];
        var h = '100 SHOTS<br>';
        for (var i = 0; i < 4; i++) {
          var bar = '';
          for (var k = 0; k < counts[i]; k++) bar += '▓';
          h += '<span style="color:#38bdf8">' + names[i] + '</span> <span style="color:#00ffcc">' + bar + '</span> ' + counts[i] + '<br>';
        }
        hist.innerHTML = h;
      }
      var rst = btn('⟲ |00⟩ RESET');
      rst.onclick = function () { st = [{ re: 1, im: 0 }, { re: 0, im: 0 }, { re: 0, im: 0 }, { re: 0, im: 0 }]; hist.innerHTML = ''; draw(); };
      var row = document.createElement('div');
      [['H q0', function () { apply1(H, 0); }], ['H q1', function () { apply1(H, 1); }],
       ['X q0', function () { apply1(X, 0); }], ['X q1', function () { apply1(X, 1); }]].forEach(function (pair) {
        var b = btn(pair[0]);
        b.onclick = function () { pair[1](); draw(); };
        row.appendChild(b);
      });
      var cnot = btn('CNOT (q0→q1)'); cnot.onclick = function () { applyCNOT(); draw(); }; row.appendChild(cnot);
      var bell = btn('✦ BELL PAIR'); bell.onclick = function () { apply1(H, 0); applyCNOT(); draw(); }; row.appendChild(bell);
      var smp = btn('◉ SAMPLE 100 SHOTS'); smp.onclick = sample;
      el.appendChild(row); el.appendChild(rst); el.appendChild(smp); el.appendChild(sv); el.appendChild(hist);
      var note = document.createElement('div');
      note.style.cssText = 'color:#5b7a99;font-size:11px;margin-top:8px;';
      note.textContent = 'Tip: H q0 then CNOT makes the Bell state (|00⟩+|11⟩)/√2 — sampling shows ~50/50.';
      el.appendChild(note);
      draw();
    },
    codeJS: function (rec) {
      return '// ' + recName(rec) + ' — 2-Qubit State-Vector Simulator (JS)\n' +
        'const SQ = 1/Math.sqrt(2);\n' +
        'const add=(a,b)=>({re:a.re+b.re, im:a.im+b.im});\n' +
        'const mul=(a,b)=>({re:a.re*b.re-a.im*b.im, im:a.re*b.im+a.im*b.re});\n' +
        'const Z={re:0,im:0}, O={re:1,im:0};\n' +
        'const H=[[ {re:SQ,im:0},{re:SQ,im:0} ],[ {re:SQ,im:0},{re:-SQ,im:0} ]];\n' +
        'const X=[[Z,O],[O,Z]];\n' +
        'let st=[O,Z,Z,Z];\n' +
        'function apply1(U,q){\n' +
        '  const n=[Z,Z,Z,Z].map(c=>({...c}));\n' +
        '  for(let i=0;i<4;i++) for(let j=0;j<4;j++){\n' +
        '    if(((i>>q)&1)!==((j>>q)&1)) continue; // other qubit must match\n' +
        '    n[i]=add(n[i], mul(U[(i>>(1-q))&1][(j>>(1-q))&1], st[j]));\n' +
        '  }\n' +
        '  st=n;\n' +
        '}\n' +
        'function cnot(){ st=[st[0],st[1],st[3],st[2]]; }\n' +
        'function probs(){ return st.map(c=>c.re*c.re+c.im*c.im); }\n' +
        'function sample(n){\n' +
        '  const p=probs(), counts=[0,0,0,0];\n' +
        '  for(let s=0;s<n;s++){ let r=Math.random(),a=0;\n' +
        '    for(let i=0;i<4;i++){ a+=p[i]; if(r<a){ counts[i]++; break; } } }\n' +
        '  return counts;\n' +
        '}\n' +
        'apply1(H,0); cnot(); // Bell pair\n' +
        'console.log("probs:", probs().map(x=>x.toFixed(3)));\n' +
        'console.log("100 shots:", sample(100));\n';
    },
    codePY: function (rec) {
      return '# ' + recName(rec) + ' — 2-Qubit State-Vector Simulator (Python)\n' +
        'import math, random\n' +
        'SQ = 1 / math.sqrt(2)\n' +
        'H = [[SQ, SQ], [SQ, -SQ]]\n' +
        'X = [[0, 1], [1, 0]]\n' +
        'st = [1+0j, 0j, 0j, 0j]\n' +
        'def apply1(U, q):\n' +
        '    global st\n' +
        '    n = [0j]*4\n' +
        '    for i in range(4):\n' +
        '        for j in range(4):\n' +
        '            if ((i >> q) & 1) != ((j >> q) & 1): continue  # other qubit must match\n' +
        '            n[i] += U[(i >> (1-q)) & 1][(j >> (1-q)) & 1] * st[j]\n' +
        '    st = n\n' +
        'def cnot():\n' +
        '    global st\n' +
        '    st = [st[0], st[1], st[3], st[2]]\n' +
        'def probs():\n' +
        '    return [abs(c)**2 for c in st]\n' +
        'def sample(n):\n' +
        '    p, counts = probs(), [0,0,0,0]\n' +
        '    for _ in range(n):\n' +
        '        r, a = random.random(), 0.0\n' +
        '        for i in range(4):\n' +
        '            a += p[i]\n' +
        '            if r < a: counts[i] += 1; break\n' +
        '    return counts\n' +
        'if __name__ == "__main__":\n' +
        '    apply1(H, 0); cnot()  # Bell pair\n' +
        '    print("probs:", [round(x,3) for x in probs()])\n' +
        '    print("100 shots:", sample(100))\n';
    }
  };

  /* ================= MATERIAL ================= */
  var material = {
    title: 'Material Vault — Substrate Property Explorer',
    blurb: 'Real substrate data: band gaps, mobility, and a conductivity-vs-temperature curve.',
    render: function (el, rec) {
      hud(el, 'MATERIAL VAULT // SUBSTRATE EXPLORER');
      var MATS = [
        { name: 'Silicon (Si)', eg: 1.12, mu: 1400, debye: 645, note: 'The workhorse of the vault.' },
        { name: 'Germanium (Ge)', eg: 0.66, mu: 3900, debye: 374, note: 'Fast but leaky at heat.' },
        { name: 'Gallium Arsenide (GaAs)', eg: 1.42, mu: 8500, debye: 360, note: 'High-speed RF/optics.' },
        { name: 'Diamond (C)', eg: 5.5, mu: 2200, debye: 2230, note: 'Ultimate thermal armor.' },
        { name: 'Graphene', eg: 0, mu: 200000, debye: 2100, note: 'Zero-gap ballistic wonder.' },
        { name: 'Silicon Carbide (SiC)', eg: 3.26, mu: 900, debye: 1200, note: 'Power-electronics vault-grade.' }
      ];
      var sel = document.createElement('select');
      sel.style.cssText = 'background:#0e1522;color:#7dd3fc;border:1px solid #38bdf8;border-radius:6px;' +
        'padding:6px;font-family:inherit;font-size:13px;margin:6px 0;';
      MATS.forEach(function (m, i) { var o = document.createElement('option'); o.value = i; o.textContent = m.name; sel.appendChild(o); });
      var info = document.createElement('div');
      info.style.cssText = 'font-size:13px;line-height:1.9;margin:8px 0;';
      var cv = document.createElement('canvas');
      cv.width = 560; cv.height = 220;
      cv.style.cssText = 'width:100%;max-width:560px;border:1px solid #1e90ff;border-radius:6px;background:#05080d;margin-top:8px;';
      function sigma(T, m) { // simple model: sigma ~ mu * exp(-Eg / 2kT), normalized
        var k = 8.617333e-5;
        return m.mu * Math.exp(-m.eg / (2 * k * T)) / 1e5;
      }
      function draw() {
        var m = MATS[+sel.value];
        info.innerHTML = '<span style="color:#38bdf8;font-weight:bold">' + m.name + '</span><br>' +
          'Band gap: <b style="color:#00ffcc">' + m.eg + ' eV</b><br>' +
          'Electron mobility: <b style="color:#00ffcc">' + m.mu.toLocaleString() + ' cm²/V·s</b><br>' +
          'Debye temp: ' + m.debye + ' K<br>' +
          '<span style="color:#5b7a99">' + m.note + '</span>';
        var ctx = cv.getContext('2d');
        ctx.clearRect(0, 0, cv.width, cv.height);
        ctx.strokeStyle = '#1e3a5f';
        for (var g = 0; g <= 4; g++) { ctx.beginPath(); ctx.moveTo(40, 10 + g * 50); ctx.lineTo(550, 10 + g * 50); ctx.stroke(); }
        ctx.fillStyle = '#5b7a99'; ctx.font = '11px monospace';
        ctx.fillText('σ vs T (arb. units)', 44, 24);
        ctx.fillText('200K', 40, 215); ctx.fillText('800K', 520, 215);
        var pts = [];
        for (var T = 200; T <= 800; T += 10) pts.push([T, sigma(T, m)]);
        var mx = Math.max.apply(null, pts.map(function (p) { return p[1]; })) || 1;
        ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 2; ctx.shadowColor = '#1e90ff'; ctx.shadowBlur = 8;
        ctx.beginPath();
        pts.forEach(function (p, i) {
          var x = 40 + (p[0] - 200) / 600 * 510;
          var y = 200 - p[1] / mx * 175;
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        });
        ctx.stroke(); ctx.shadowBlur = 0; ctx.lineWidth = 1;
      }
      sel.onchange = draw;
      el.appendChild(sel); el.appendChild(info); el.appendChild(cv);
      var tbl = document.createElement('div');
      tbl.style.cssText = 'font-size:11px;color:#5b7a99;margin-top:10px;line-height:1.8;';
      tbl.innerHTML = 'VAULT LEDGER — Eg(eV) / μ(cm²/V·s): ' + MATS.map(function (m) { return m.name.split(' ')[0] + ' ' + m.eg + '/' + m.mu; }).join(' · ');
      el.appendChild(tbl);
      draw();
    },
    codeJS: function (rec) {
      return '// ' + recName(rec) + ' — Material Explorer (JS)\n' +
        'const MATS = [\n' +
        '  {name:"Si", eg:1.12, mu:1400},\n' +
        '  {name:"Ge", eg:0.66, mu:3900},\n' +
        '  {name:"GaAs", eg:1.42, mu:8500},\n' +
        '  {name:"diamond", eg:5.5, mu:2200},\n' +
        '  {name:"graphene", eg:0, mu:200000},\n' +
        '  {name:"SiC", eg:3.26, mu:900}\n' +
        '];\n' +
        'const k = 8.617333e-5; // eV/K\n' +
        'const sigma = (T,m) => m.mu*Math.exp(-m.eg/(2*k*T))/1e5;\n' +
        'for (const m of MATS) {\n' +
        '  const curve = [];\n' +
        '  for (let T=200; T<=800; T+=100) curve.push(sigma(T,m).toExponential(2));\n' +
        '  console.log(m.name, "Eg="+m.eg+"eV mu="+m.mu, curve.join(" "));\n' +
        '}\n';
    },
    codePY: function (rec) {
      return '# ' + recName(rec) + ' — Material Explorer (Python)\n' +
        'import math\n' +
        'MATS = [\n' +
        '    {"name":"Si","eg":1.12,"mu":1400},\n' +
        '    {"name":"Ge","eg":0.66,"mu":3900},\n' +
        '    {"name":"GaAs","eg":1.42,"mu":8500},\n' +
        '    {"name":"diamond","eg":5.5,"mu":2200},\n' +
        '    {"name":"graphene","eg":0,"mu":200000},\n' +
        '    {"name":"SiC","eg":3.26,"mu":900},\n' +
        ']\n' +
        'K = 8.617333e-5  # eV/K\n' +
        'def sigma(T, m):\n' +
        '    return m["mu"] * math.exp(-m["eg"] / (2 * K * T)) / 1e5\n' +
        'if __name__ == "__main__":\n' +
        '    for m in MATS:\n' +
        '        curve = [sigma(T, m) for T in range(200, 801, 100)]\n' +
        '        print(m["name"], "Eg=%s eV mu=%s" % (m["eg"], m["mu"]))\n' +
        '        print("  sigma:", " ".join("%.2e" % v for v in curve))\n';
    }
  };

  function recName(rec) {
    var n = (rec && (rec.sigName || rec.name || rec.title)) || 'Signature PC';
    return String(n).replace(/[\r\n]+/g, ' ');
  }

  return { abacus: abacus, gates: gates, cpu4: cpu4, stored: stored, quantum: quantum, material: material };
})();
