/* The Signature PC System Depository — GRAND LIST (js/grandlist.js).
   Moved off the front door (index.html) onto the 1 Million Archive tab
   (browse.html) on 2026-10-05 per the standing architecture rule: the
   million-file A–Z list lives ONLY on the archive tab, never on the first
   page. Same components, no redesign.

   Adaptations vs the front-door original (kept minimal):
   - record cards deep-link to the record view on index.html (?system=),
     which still hosts the detail view; the grid itself no longer opens
     records in-page.
   - state and data loading are self-contained here (data/systems.json +
     data/drip/chunk-*.jsonl); index.html keeps its own copies for its
     detail view and counters.

   Requires js/identity.js (window.PCIDENT) and js/pcui.js (window.PCUI)
   loaded BEFORE this file. No-ops when the #grandlist element is absent.
   Inline onclick handlers below need these globals (no IIFE). */
var GLPCID = window.PCIDENT, GLPCUI = window.PCUI;
var GLSYSTEMS = [], GLDRIP = [], GLDRIP_N = 0;
var fCat = "ALL", fAz = "", fQ = "", fPage = 1;
var GL_PER_PAGE = 48;
function esc(s){return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}
function glAllRecords(){return GLSYSTEMS.concat(GLDRIP)}
function glFilteredList(){
  var list = glAllRecords().filter(function(r){return GLPCUI.matchesFilter(r, fCat)});
  if (fAz) list = list.filter(function(r){return (((r.sig&&r.sig.name)||r.name||"").toUpperCase().indexOf(fAz)===0)});
  list = GLPCUI.searchList(list, fQ);
  return list;
}
function renderPills(){
  var list = glAllRecords();
  // Category pills are real <a> links (?cat=) so categories are crawlable and
  // reachable without the search box; the click handler keeps in-page behavior.
  var h = GLPCUI.FILTERS.map(function(f){
    var n = f==="ALL" ? list.length : list.filter(function(r){return GLPCUI.matchesFilter(r, f)}).length;
    return '<a class="pill'+(fCat===f?" on":"")+'" data-c="'+f+'" href="?cat='+f+'">'+f+' <b>'+n+'</b></a>';
  }).join("");
  document.getElementById("pills").innerHTML = h;
  var ps = document.querySelectorAll("#pills .pill");
  for (var i=0;i<ps.length;i++){ (function(p){ p.onclick = function(e){ e.preventDefault(); fCat = p.getAttribute("data-c"); fPage = 1; renderPills(); renderGrid(); }; })(ps[i]); }
}
function renderAZ(){
  var h = '<span class="'+(fAz===""?"on":"")+'" data-a="">&bull;</span>';
  for (var i=65;i<=90;i++){var a=String.fromCharCode(i);h+='<span class="'+(fAz===a?"on":"")+'" data-a="'+a+'">'+a+'</span>'}
  document.getElementById("az").innerHTML = h;
  var ss = document.querySelectorAll("#az span");
  for (var j=0;j<ss.length;j++){ (function(s){ s.onclick = function(){ fAz = s.getAttribute("data-a"); fPage = 1; renderAZ(); renderGrid(); }; })(ss[j]); }
}
function glTypeDot(st){
  var c = st==="HISTORICAL"?"#9fd8ff":st==="SIGNATURE_ORIGINAL"?"#ffd75e":st==="PREDICTED"?"#d0a6ff":st==="GENERATED"?"#8affc1":"#ffb27d";
  return '<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:'+c+';margin-right:6px" title="'+esc(GLPCID.TYPE_LABEL[st]||st)+'"></span>';
}
function renderGrid(){
  var g = document.getElementById("grid");
  if(!g) return;
  var list = glFilteredList();
  var pg = GLPCUI.paginate(list, fPage, GL_PER_PAGE);
  fPage = pg.page;
  var rc = document.getElementById("rescount");
  function setCount(){ if(rc) rc.textContent = pg.total.toLocaleString()+" SYSTEMS"+(fQ?' MATCH "'+fQ+'"':"")+(fCat&&fCat!=="ALL"?" · "+fCat:""); }
  if (!pg.total){ g.innerHTML = GLPCUI.zeroResultHTML(fQ || fCat); setCount(); return; }
  setCount();
  g.innerHTML = pg.items.map(function(r){
    var nm = (r.sig && r.sig.name) || r.name;
    var sid = esc(r._system_id);
    return '<a class="card" style="text-decoration:none;color:inherit;display:block" href="index.html?system='+sid+'" aria-label="Open '+esc(nm)+'"><div class="cat">'+glTypeDot(r._system_type)+esc(r._type_label)+'</div><h3>'+esc(nm)+'</h3><div class="tag">'+esc(r.tag||"")+'</div><div class="kv hist">'+sid+'</div></a>';
  }).join("") + '<div style="grid-column:1/-1;display:flex;gap:8px;align-items:center;justify-content:center;margin-top:6px;flex-wrap:wrap">' +
    (pg.page>1?'<button onclick="fPage--;renderGrid()">&larr; PREV</button>':"") +
    '<span class="kv">PAGE '+pg.page+' / '+pg.pages+' · '+pg.total.toLocaleString()+' SYSTEMS</span>' +
    (pg.page<pg.pages?'<button onclick="fPage++;renderGrid()">NEXT &rarr;</button>':"") + '</div>';
}
/* ================= SYSTEM FINDER (additive): deterministic keyword finder over the depository's own search index ================= */
var Finder={};
Finder.STOP={a:1,an:1,the:1,and:1,or:1,but:1,if:1,then:1,of:1,to:1,in:1,on:1,for:1,with:1,by:1,from:1,at:1,as:1,is:1,are:1,was:1,were:1,be:1,been:1,it:1,its:1,this:1,that:1,these:1,those:1,what:1,when:1,where:1,which:1,who:1,whom:1,how:1,why:1,does:1,do:1,did:1,can:1,could:1,would:1,should:1,will:1,about:1,into:1,over:1,under:1,again:1,there:1,their:1,them:1,they:1,you:1,your:1,tell:1,me:1,please:1,find:1,looking:1,look:1,show:1,want:1,need:1,get:1,some:1,any:1,all:1,both:1,more:1,most:1,very:1,just:1,like:1,such:1,than:1,kind:1,type:1,thing:1,model:1,machine:1,system:1,systems:1,computer:1,computers:1,pc:1,one:1,that:1};
Finder.keywords=function(q){
  return String(q||"").toLowerCase().replace(/[^a-z0-9]+/g," ").split(" ")
    .filter(function(w){return w.length>=3&&!Finder.STOP[w]});
};
/* same haystack rule as PCUI.searchList — reuses the site's own search, no second index */
Finder.hay=function(r){
  return (((r.sig&&r.sig.name)||r.name||"")+" "+(r.tag||"")+" "+(r.desc||"")+" "+(r._system_id||"")+" "+(r.id||"")).toLowerCase();
};
Finder.ask=function(){
  var box=document.getElementById("fresults"); if(!box) return;
  var kws=Finder.keywords(document.getElementById("fq").value);
  if(!kws.length){box.innerHTML='<p class="kv">Describe what you want — a use, an era, a material, a name — and I will match the depository&apos;s own records.</p>';return}
  var scored=glAllRecords().map(function(r){
    var hay=Finder.hay(r),sc=0,hit=[];
    kws.forEach(function(k){if(hay.indexOf(k)>=0){sc++;hit.push(k)}});
    return {r:r,sc:sc,hit:hit};
  }).filter(function(x){return x.sc>0});
  scored.sort(function(a,b){return b.sc-a.sc});
  var top=scored.slice(0,5);
  if(!top.length){box.innerHTML='<p class="kv"><b>Nothing matched.</b> Try fewer, simpler words — e.g. &ldquo;quantum&rdquo;, &ldquo;portable&rdquo;, &ldquo;wood&rdquo;.</p>';return}
  box.innerHTML='<p class="kv">'+top.length+' of '+scored.length+' matches for &ldquo;'+esc(kws.join(" "))+'&rdquo;:</p>'+
    '<div class="fcards">'+top.map(function(x){
      var r=x.r,nm=(r.sig&&r.sig.name)||r.name;
      var sid=esc(r._system_id);
      var deep="index.html?system="+encodeURIComponent(r._system_id);
      return '<a class="fcard" style="text-decoration:none;color:inherit;display:block" href="'+deep+'" aria-label="Open '+esc(nm)+'"><div class="kv hist">'+sid+'</div><h4>'+esc(nm)+'</h4><div class="tag">'+esc(r.tag||"")+'</div><div class="hist" style="margin-top:4px">matched: '+esc(x.hit.join(", "))+'</div><p class="kv"><span class="go">Take me there &rarr;</span></p></a>';
    }).join("")+'</div>';
};
function glLoadDripChunks(){
  // probe chunk-0000, chunk-0001, ... until 404 (drip appends over time; never hardcode)
  var i = 0;
  function next(){
    if (i > 400) return done();
    var name = "data/drip/chunk-"+String(i).padStart(4,"0")+".jsonl";
    fetch(name).then(function(r){
      if (!r.ok) return done();
      return r.text().then(function(t){
        t.split("\n").forEach(function(line){
          line = line.trim(); if(!line) return;
          try { GLDRIP.push(GLPCUI.enrichDrip(JSON.parse(line))); } catch(e){}
        });
        i++; next();
      });
    }).catch(done);
  }
  function done(){
    GLDRIP_N = GLDRIP.length;
    renderPills(); renderAZ(); renderGrid();
  }
  next();
}
function glBoot(){
  if(!document.getElementById("grandlist")) return;
  if(!GLPCID || !GLPCUI){
    document.getElementById("grid").innerHTML = '<div class="kv">The archive engine failed to load. <button onclick="location.reload()">RETRY</button></div>';
    return;
  }
  var q = document.getElementById("q");
  if(q) q.addEventListener("input", function(){ fQ = q.value.trim(); fPage = 1; renderGrid(); });
  var fq = document.getElementById("fq");
  if(fq) fq.addEventListener("keydown", function(e){ if(e.key==="Enter") Finder.ask(); });
  fetch("data/systems.json").then(function(r){ if(!r.ok) throw 0; return r.json(); }).then(function(s){
    GLSYSTEMS = s.map(function(r,i){ return GLPCUI.enrichSeed(r,i); });
    // category (?cat=) and search (?q=) deep links — categories and search as real links
    var qs0 = location.search;
    var cm = /[?&]cat=([A-Z_]*)/.exec(qs0);
    if (cm && GLPCUI.FILTERS.indexOf(cm[1]) >= 0) fCat = cm[1];
    var qm = /[?&]q=([^&]+)/.exec(qs0);
    if (qm){ fQ = decodeURIComponent(qm[1]); var qi=document.getElementById("q"); if(qi) qi.value = fQ; }
    renderPills(); renderAZ(); renderGrid();
    glLoadDripChunks();
  }).catch(function(){ document.getElementById("grid").innerHTML = '<div class="kv">Unable to load the archive. <button onclick="location.reload()">RETRY</button></div>'; });
}
glBoot();
