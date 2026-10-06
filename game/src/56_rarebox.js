// ── The rare box: what is special in this pond right now, in one place ──
// A small box on the left that is always there while you play. It lists every MARVEL alive in the pond (its sign, its
// name, how many carry it, what it does, whether it talks) and the PLAN a kind of creature is carrying out, if there is
// one. Click a row and the camera goes to it. When something new arrives the box flashes, so it is not missed.
(function () {
  'use strict';
  if (typeof document === 'undefined') return;
  let box = null, sig = '', seen = {}, shut = false, tab = 'plans', open = '';
  const esc = function (s) { return String(s === undefined || s === null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  // what a marvel DOES, said plainly from its own numbers (the AI made the numbers up; this only reads them out)
  const WHO = { hunters: 'its hunters', others: 'other kinds', kin: 'its own kind', all: 'everyone near' };
  G.marvelDoes = function (m) {
    const out = [], P = (m && m.powers) || [];
    for (let i = 0; i < P.length; i++) { const p = P[i], v = [];
      if (p.hurt > 0.05) v.push('hurts'); if (p.strike > 0.05) v.push('strikes'); if (p.slow > 0.05) v.push('slows'); if (p.pull > 0.05) v.push('draws in'); if (p.pull < -0.05) v.push('pushes away'); if (p.heal > 0.05) v.push('heals'); if (p.feed > 0.05) v.push('feeds');
      if (!v.length) continue;
      const what = v.length > 1 ? v.slice(0, -1).join(', ') + ' and ' + v[v.length - 1] : v[0];
      out.push((p.kind === 'pulse' ? 'Every ' + Math.round(p.every) + ' seconds a burst of ' + p.stuff + ' ' : 'A ring of ' + p.stuff + ' is always about it: it ') + what + ' ' + (WHO[p.to] || 'those near') + '.'); }
    if (m && m.words && m.words.length) out.push('It talks: "' + m.words[0] + '"');
    return out;
  };
  G.marvelCard = function (m) {
    const does = G.marvelDoes(m);
    const pic = G.marvelPic ? G.marvelPic(m, 46) : '';
    return '<div class="mh">' + pic + '<div class="mt"><div class="mk">★ MARVEL · RARE</div><span class="mn">' + esc(m.name) + '</span></div></div><div class="mw">' + esc(m.wonder) + '</div>' +
      ((does.length || m.why) ? '<details><summary>What it does</summary>' + (does.length ? '<ul>' + does.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ul>' : '') + (m.why ? '<div class="my">' + esc(m.why) + '</div>' : '') + '</details>' : '');
  };
  function ui() {
    if (box) return box;
    const st = document.createElement('style');
    st.textContent = '#rarebox{position:fixed;left:14px;top:236px;width:min(340px,calc(100vw - 28px));padding:10px 12px 12px;border-radius:18px;z-index:2;font:500 12.5px/1.45 system-ui,sans-serif;color:#eaf4ff;max-height:54vh;overflow-y:auto;scrollbar-width:thin}' +
      '#rarebox.shut{width:auto;padding:7px 10px 7px 12px;border-radius:999px}' +
      '#rarebox .rk{display:flex;justify-content:space-between;align-items:center;gap:10px;cursor:pointer;min-height:28px}#rarebox .rk>span:first-child{font:800 10.5px system-ui,sans-serif;letter-spacing:.16em;color:#f6d365;text-transform:uppercase;white-space:nowrap}' +
      '#rarebox .rc{display:flex;align-items:center;gap:5px}#rarebox .rc em{font:700 10.5px system-ui,sans-serif;font-style:normal;padding:2px 8px;border-radius:999px;background:rgba(246,211,101,.16);border:1px solid rgba(246,211,101,.55);color:#ffe9a8;white-space:nowrap}' +
      '#rarebox .rk u{text-decoration:none;display:flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:50%;background:rgba(255,255,255,.1);color:#fff;font-size:11px}#rarebox .rk:hover u{background:rgba(255,255,255,.22)}' +
      '#rarebox .rh{font:800 9px system-ui,sans-serif;letter-spacing:.16em;color:#8fb2d6;text-transform:uppercase;margin:11px 2px 5px}' +
      '#rarebox .rrow{position:relative;display:flex;gap:10px;align-items:flex-start;padding:9px 26px 10px 9px;margin-top:6px;border-radius:13px;cursor:pointer;background:rgba(7,18,31,.38);border:1px solid rgba(207,232,255,.12);transition:background .15s,border-color .15s}#rarebox .rrow:hover{background:rgba(246,211,101,.1);border-color:rgba(246,211,101,.5)}' +
      '#rarebox .rrow:after{content:"\\203A";position:absolute;right:9px;top:8px;font-size:18px;line-height:1;color:#fff;opacity:.35}#rarebox .rrow:hover:after{opacity:.9}' +
      '#rarebox .rrow.live{background:rgba(246,211,101,.09);border-color:rgba(246,211,101,.55)}#rarebox .rrow.old{padding-top:7px;padding-bottom:7px;background:transparent}' +
      '#rarebox .ric{flex:none;width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:17px;background:rgba(7,18,31,.6);border:1px solid rgba(207,232,255,.18)}#rarebox .ric img{width:28px;height:28px}#rarebox .old .ric{width:24px;height:24px;font-size:12px;opacity:.8}' +
      '#rarebox .rt{display:flex;flex-wrap:wrap;align-items:center;gap:4px 7px}#rarebox b{color:#fff;font-size:14px;line-height:1.25}#rarebox .old b{font-size:12.5px;font-weight:600}' +
      '#rarebox .rsub{font-size:12.5px;color:#dcecff;margin-top:3px}#rarebox .old .rsub{font-size:11.5px;color:#b9cde2;margin-top:1px}' +
      '#rarebox .rtag{display:inline-block;padding:1px 7px;border-radius:999px;background:rgba(51,214,166,.16);border:1px solid rgba(51,214,166,.55);font-size:10px;font-weight:700;color:#dffbf1;white-space:nowrap}#rarebox .rtag.no{background:rgba(255,125,150,.14);border-color:rgba(255,125,150,.5);color:#ffdfe6}' +
      '#rarebox .rl{display:grid;grid-template-columns:38px 1fr;gap:5px 8px;margin-top:7px;font-size:12.5px;color:#eef6ff}#rarebox .rl i{font:800 8.5px system-ui,sans-serif;letter-spacing:.12em;color:#8fb2d6;padding-top:4px;font-style:normal}' +
      '#rarebox .rn{display:inline-block;padding:0 8px;border-radius:999px;font-weight:700;font-size:11.5px;line-height:1.6;color:#fff;border:1px solid rgba(255,255,255,.35);white-space:nowrap}' +
      '#rarebox .rs{display:flex;gap:4px;margin-top:9px}#rarebox .rs span{flex:1;min-width:0;text-align:center;font:700 8.5px system-ui,sans-serif;letter-spacing:.04em;text-transform:uppercase;color:#8fb2d6;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}#rarebox .rs span:before{content:"";display:block;height:5px;border-radius:3px;background:rgba(207,232,255,.18);margin-bottom:3px}#rarebox .rs .dn{color:#bfe9d9}#rarebox .rs .dn:before{background:#33d6a6}#rarebox .rs .on{color:#f6d365}#rarebox .rs .on:before{background:linear-gradient(90deg,#f6d365 var(--p),rgba(207,232,255,.18) var(--p))}' +
      '#rarebox .rnow{margin-top:5px;font-size:12px;color:#dcecff}#rarebox .rnow b{font-size:12.5px;color:#f6d365}' +
      '#rarebox .rnone{font-size:12px;color:#b9cde2;margin:8px 2px 0;line-height:1.45}' +
      '#rarebox{scrollbar-color:rgba(207,232,255,.35) transparent}#rarebox::-webkit-scrollbar{width:6px}#rarebox::-webkit-scrollbar-track{background:transparent}#rarebox::-webkit-scrollbar-thumb{background:rgba(207,232,255,.3);border-radius:3px}' +
      '#rarebox .tabs2{display:flex;gap:6px;margin:8px 0 2px}#rarebox .tabs2 span{flex:1;text-align:center;padding:6px 4px;border-radius:10px;cursor:pointer;font:700 11.5px system-ui,sans-serif;color:#b9cde2;background:rgba(7,18,31,.4);border:1px solid rgba(207,232,255,.14)}#rarebox .tabs2 span.on{color:#14202e;background:#f6d365;border-color:#f6d365}#rarebox .tabs2 span i{font-style:normal;opacity:.75;margin-left:4px}#rarebox .tabs2 span.new:not(.on){border-color:#f6d365;color:#ffe9a8}' +
      '#rarebox .rmore{margin-top:8px;padding-top:8px;border-top:1px solid rgba(207,232,255,.16);font-size:12px;color:#dcecff}#rarebox .rmore img{display:block;width:120px;height:120px;margin:0 auto 6px}#rarebox .rmore ul{margin:4px 0 0;padding:0;list-style:none}#rarebox .rmore li{padding:2px 0 2px 14px;position:relative;color:#ffe9a8;font-weight:600}#rarebox .rmore li:before{content:"\\25C6";position:absolute;left:0;font-size:8px;top:6px}' +
      '#rarebox.flash{animation:rareflash 1.4s ease-out 2}@keyframes rareflash{0%{box-shadow:0 0 0 0 rgba(246,211,101,.9)}100%{box-shadow:0 0 0 22px rgba(246,211,101,0)}}' +
      '@media (max-width:720px){#rarebox{top:auto;bottom:150px;left:7px;max-height:30vh}}@media (max-height:560px){#rarebox{display:none}}';
    document.head.appendChild(st);
    box = document.createElement('div'); box.id = 'rarebox'; box.className = 'glass hide';
    (document.getElementById('ui') || document.body).appendChild(box);
    box.addEventListener('click', function (e) {
      let n = e.target; while (n && n !== box && !(n.dataset && n.dataset.go)) n = n.parentNode;
      { let k = e.target; while (k && k !== box && !(k.classList && k.classList.contains('rk'))) k = k.parentNode; if (k && k !== box) { shut = !shut; sig = ''; if (G.sfx) G.sfx('click'); draw(); return; } }
      { let k = e.target; while (k && k !== box && !(k.dataset && k.dataset.tab)) k = k.parentNode; if (k && k !== box) { tab = k.dataset.tab; sig = ''; if (G.sfx) G.sfx('click'); draw(); return; } }
      if (!n || n === box) return;
      const W = G.W, go = n.dataset.go;
      open = open === go ? '' : go; sig = ''; setTimeout(draw, 0);
      if (G.sfx) G.sfx('click');
      if (go === 'deed') { if (W.deed) G.focusOn(W.deed.x, W.deed.y, 1.6); return; }
      if (go.charAt(0) === 'w') { const w = (W.works || [])[+go.slice(1)]; if (w) G.focusOn(w.x, w.y, 1.6); return; }
      if (go.charAt(0) === 'p') { const p = (W.deedPast || [])[+go.slice(1)]; if (p) G.focusOn(p.x, p.y, 1.4); return; }
      const id = +go.slice(1), L = W.cre.filter(function (c) { return !c.dead && c.g.mv === id; }).sort(function (a, b) { return G.charmOf(b) - G.charmOf(a); });
      if (L[0]) { if (G.select) G.select(L[0]); G.focusOn(L[0].x, L[0].y, 2.4); }
    });
    return box;
  }
  const SHORT = { gather: 'gather', circle: 'council', line: 'form up', carry: 'fetch', build: 'build', charge: 'charge', guard: 'guard', scatter: 'set off' };
  const STEP = { gather: 'gathering', circle: 'in council', line: 'forming up', carry: 'fetching and carrying', build: 'building', charge: 'charging', guard: 'standing guard', scatter: 'setting off' };
  // a kind's name is a made-up word: it is set apart in its own colour, so it is not read as English
  const chip = function (name, hue) { return '<span class="rn" style="background:' + G.hsl(hue === undefined ? 200 : hue, 55, 34, 0.9) + '">' + esc(name) + '</span>'; };
  const names = function (text) { let s = esc(text); const Sp = (G.W.species || []).filter(function (q) { return !q.extinct && q.name; }).sort(function (a, b) { return b.name.length - a.name.length; }); for (let i = 0; i < Sp.length; i++) { const nm = esc(Sp[i].name), last = nm.split(' ').pop(), first = nm.split(' ')[0]; [nm + 's', nm, first + 's', first, last + 's'].some(function (w) { const k = s.indexOf(w); if (w.length < 4 || k < 0 || s.lastIndexOf('<span', k) > s.lastIndexOf('</span>', k)) return false; s = s.slice(0, k) + chip(w, Sp[i].hue) + s.slice(k + w.length); return true; }); } return s; };
  const cap = function (s) { s = String(s || ''); return s.charAt(0).toUpperCase() + s.slice(1).replace(/\.$/, '') + '.'; };
  const plan = function (p, now) { return '<div class="rl"><i>WHO</i><span>' + chip(p.kind, p.hue) + '</span>' + (p.what ? '<i>WHAT</i><span>' + names('They ' + (now ? 'want to ' : 'set out to ') + p.what.replace(/\.$/, '') + '.') + '</span><i>WHY</i><span>' + names(cap(p.why)) + '</span>' : '<i>WHAT</i><span>' + names(p.say) + '</span>') + (now || '') + '</div>'; };
  function draw() {
    ui();
    const W = G.W, on = G.mode === 'play' && W && !W.title;
    box.classList.toggle('hide', !on);
    if (!on) { sig = ''; return; }
    // it sits under the "pond versus" card when that is showing
    const vs = document.getElementById('versus');
    const se = document.getElementById('season'); let under = se && !se.classList.contains('hide') ? Math.round(se.getBoundingClientRect().bottom) : 224;      // under the season card, however tall its text has made it
    if (vs && !vs.classList.contains('hide')) under = Math.max(under, Math.round(vs.getBoundingClientRect().bottom));
    if (window.innerWidth > 720) box.style.top = (under + 12) + 'px'; else box.style.top = '';
    const by = {}, order = [];
    for (let i = 0; i < W.cre.length; i++) { const c = W.cre[i], mv = c.ph && c.ph.mv; if (!mv || c.dead) continue; if (!by[mv.id]) { by[mv.id] = { d: mv, n: 0 }; order.push(mv.id); } by[mv.id].n++; }
    const d = W.deed, dn = d ? W.cre.filter(function (c) { return c.deedId === d.id && !c.dead; }).length : 0;
    const Wk = W.works || [], Pa = W.deedPast || [];
    const s2 = order.map(function (id) { return id + ':' + by[id].n; }).join(',') + '|' + (d ? d.id + ':' + d.i + ':' + dn + ':' + Math.round(d.progress * 20) + ':' + Math.round((d.steps[d.i].secs - d.t) / 2) : '') + '|' + Wk.map(function (w) { return w.name + (w.fig ? 1 : 0); }).join(',') + '|' + Pa.length + ':' + (Pa.length ? Pa[Pa.length - 1].gen : 0);
    if (s2 + shut + tab + open === sig) return; sig = s2 + shut + tab + open; box.classList.toggle('shut', shut);
    const chips = [order.length ? order.length + (order.length === 1 ? ' marvel' : ' marvels') : '', d ? 'a plan' : '', Wk.length ? Wk.length + ' built' : ''].filter(Boolean);
    let fresh = false, h = '<div class="rk" title="' + (shut ? 'Open' : 'Fold away') + '"><span>★ Rare' + (shut ? '' : ' in this pond') + '</span><span class="rc">' + chips.map(function (c) { return '<em>' + c + '</em>'; }).join('') + '<u>' + (shut ? '▸' : '▾') + '</u></span></div>';
    if (shut) { for (let i = 0; i < order.length; i++) if (!seen['m' + order[i]]) { seen['m' + order[i]] = 1; fresh = true; } if (d && !seen['d' + d.id]) { seen['d' + d.id] = 1; fresh = true; } box.innerHTML = h; if (fresh) { box.classList.remove('flash'); void box.offsetWidth; box.classList.add('flash'); } return; }
    const newM = order.some(function (id) { return !seen['m' + id]; }), newD = !!(d && !seen['d' + d.id]);
    if (newD) tab = 'plans'; else if (newM && !d) tab = 'marvels';
    h += '<div class="tabs2"><span data-tab="plans" class="' + (tab === 'plans' ? 'on' : '') + (d ? ' new' : '') + '">⚑ Plans<i>' + ((d ? 1 : 0) + Wk.length + Pa.length || '') + '</i></span><span data-tab="marvels" class="' + (tab === 'marvels' ? 'on' : '') + (order.length ? ' new' : '') + '">★ Marvels<i>' + (order.length || '') + '</i></span></div>';
    const P = tab === 'plans';
    if (d && !P && !seen['d' + d.id]) { seen['d' + d.id] = 1; fresh = true; }
    if (d && P) { if (!seen['d' + d.id]) { seen['d' + d.id] = 1; fresh = true; } const st = d.steps[d.i];
      h += '<div class="rh">Happening now</div><div class="rrow live" data-go="deed"><span class="ric">⚑</span><span style="flex:1;min-width:0"><span class="rt"><b>' + esc(d.title) + '</b><span class="rtag">a plan</span></span>' + plan(d, ' ') +
        '<div class="rs">' + d.steps.map(function (q, i) { return '<span class="' + (i < d.i ? 'dn' : i === d.i ? 'on' : '') + '"' + (i === d.i ? ' style="--p:' + Math.round(100 * Math.min(1, d.t / q.secs)) + '%"' : '') + '>' + (SHORT[q.do] || q.do) + '</span>'; }).join('') + '</div>' +
        '<div class="rnow"><b>' + cap(STEP[st.do] || st.do).slice(0, -1) + (st.do === 'build' ? ' ' + Math.round(d.progress * 100) + '%' : '') + '</b> · ' + dn + ' of them · about ' + Math.max(1, Math.ceil(d.steps.slice(d.i).reduce(function (a, q) { return a + q.secs; }, 0) - d.t)) + ' s to go</div></span></div>'; }
    for (let i = 0; i < order.length; i++) if (!seen['m' + order[i]]) { seen['m' + order[i]] = 1; fresh = true; }
    for (let i = 0; i < order.length && !P; i++) { const q = by[order[i]], m = q.d; if (!seen['m' + m.id]) { seen['m' + m.id] = 1; fresh = true; }
      h += '<div class="rrow" data-go="m' + m.id + '"><span class="ric">' + ((G.marvelPic && G.marvelPic(m, 34)) || '★') + '</span><span style="flex:1;min-width:0"><span class="rt"><b>' + esc(m.name) + '</b><span class="rtag">' + q.n + (q.n === 1 ? ' carries it' : ' carry it') + '</span>' + (m.words && m.words.length ? '<span class="rtag">talks</span>' : '') + '</span><div class="rsub">' + esc(m.wonder) + '</div>' + (open === 'm' + m.id ? '<div class="rmore">' + (G.marvelDoes(m).length ? '<ul>' + G.marvelDoes(m).map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' : '') + (m.why ? '<div style="margin-top:5px;font-style:italic;opacity:.8">' + esc(m.why) + '</div>' : '') + '</div>' : '') + '</span></div>'; }
    if (Wk.length && P) h += '<div class="rh">They built</div>';
    for (let i = Wk.length - 1; i >= 0 && P; i--) { const w = Wk[i], pic = w.fig && G.figurePic && G.figurePic(w.name), fl = (W.fields || []).filter(function (f) { return f.id === w.field; })[0];
      h += '<div class="rrow" data-go="w' + i + '"><span class="ric">' + (w.fig && G.figurePic && G.figurePic(w.name) ? '<img alt="" src="data:image/svg+xml;charset=utf-8,' + encodeURIComponent(G.figurePic(w.name)) + '">' : '▲') + '</span><span style="flex:1;min-width:0"><span class="rt"><b>' + esc(w.name) + '</b>' + chip(w.by, w.hue) + '</span><div class="rsub">' + esc(cap(w.looks)) + '</div>' + (open === 'w' + i ? '<div class="rmore">' + (pic ? '<img alt="" src="data:image/svg+xml;charset=utf-8,' + encodeURIComponent(pic) + '">' : '<div style="opacity:.7">Its picture is still being drawn.</div>') + '<div class="rl" style="margin-top:0">' + (w.what ? '<i>HOW</i><span>' + names('They set out to ' + String(w.what).replace(/\.$/, '') + '.') + '</span><i>WHY</i><span>' + names(cap(w.why)) + '</span>' : '') + '<i>DOES</i><span>' + esc(fl && G.fieldWords ? (G.fieldWords(fl) || 'It simply stands there.') : 'It simply stands there.') + (fl ? ' It does not harm its builders.' : '') + '</span><i>LASTS</i><span>' + Math.max(0, Math.round(w.until - W.t)) + ' more seconds of pond time' + (w.gen ? ' · built in generation ' + w.gen : '') + '</span></div></div>' : '') + '</span></div>'; }
    if (Pa.length && P) h += '<div class="rh">Earlier plans</div>';
    for (let i = Pa.length - 1; i >= 0 && i >= Pa.length - 3 && P; i--) { const p = Pa[i];
      h += '<div class="rrow old" data-go="p' + i + '"><span class="ric">' + (p.how === 'done' ? '✓' : '✕') + '</span><span style="flex:1;min-width:0"><span class="rt"><b>' + esc(p.title) + '</b><span class="rtag' + (p.how === 'done' ? '' : ' no') + '">' + (p.how === 'done' ? 'done' : 'gave up') + ' · gen ' + p.gen + '</span></span><div class="rsub">' + chip(p.kind, p.hue) + ' ' + (p.what ? names('set out to ' + p.what.replace(/\.$/, '') + '.') : names(p.say)) + '</div></span></div>'; }
    if (P && !d) h += '<div class="rnone">' + (Wk.length || Pa.length ? 'No plan under way just now.' : 'No plan yet. Every few minutes a kind of creature decides to do something together: build, march, meet. It shows here.') + '</div>';
    if (!P && !order.length) h += '<div class="rnone">No marvel alive just now. Every few minutes a creature is born with a rare gift. It shows here, and a click takes you to it.</div>';
    box.innerHTML = h;
    if (fresh) { box.classList.remove('flash'); void box.offsetWidth; box.classList.add('flash'); }
  }
  setInterval(function () { try { draw(); } catch (e) { console.error(e); } }, 800);
  G.on('new-pond', function () { seen = {}; sig = ''; });
  G.on('marvel-icon', function () { sig = ''; });
})();
