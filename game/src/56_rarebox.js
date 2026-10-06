// ── The rare box: what is special in this pond right now, in one place ──
// A small box on the left that is always there while you play. It lists every MARVEL alive in the pond (its sign, its
// name, how many carry it, what it does, whether it talks) and the PLAN a kind of creature is carrying out, if there is
// one. Click a row and the camera goes to it. When something new arrives the box flashes, so it is not missed.
(function () {
  'use strict';
  if (typeof document === 'undefined') return;
  let box = null, sig = '', seen = {}, shut = false;
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
    return '<div class="mk">★ MARVEL · RARE</div><div class="mn">' + (m.emblem ? '<img alt="" src="data:image/svg+xml;charset=utf-8,' + encodeURIComponent(m.emblem) + '">' : '') + esc(m.name) + '</div><div class="mw">' + esc(m.wonder) + '</div>' +
      (does.length ? '<ul>' + does.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ul>' : '') + (m.why ? '<div class="my">' + esc(m.why) + '</div>' : '');
  };
  function ui() {
    if (box) return box;
    const st = document.createElement('style');
    st.textContent = '#rarebox{position:fixed;left:14px;top:236px;width:min(330px,calc(100vw - 28px));padding:11px 14px;border-radius:16px;z-index:2;font:500 12px system-ui,sans-serif;color:#eaf4ff;max-height:52vh;overflow-y:auto}' +
      '#rarebox .rk{font:800 10.5px system-ui,sans-serif;letter-spacing:.18em;color:#f6d365;text-transform:uppercase;display:flex;justify-content:space-between;align-items:center;gap:8px;cursor:pointer;min-height:26px}#rarebox .rk u{text-decoration:none;font-size:13px;letter-spacing:0;color:#fff;opacity:.8;margin-left:6px}#rarebox.shut{width:auto}' +
      '#rarebox .rrow{display:flex;gap:10px;align-items:flex-start;padding:8px 7px;margin:4px -7px 0;border-radius:11px;cursor:pointer;border:1px solid transparent}#rarebox .rrow:hover{background:rgba(246,211,101,.1);border-color:rgba(246,211,101,.35)}' +
      '#rarebox .ric{flex:none;width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:18px;background:rgba(7,18,31,.5)}#rarebox .ric img{width:30px;height:30px}' +
      '#rarebox b{color:#fff;font-size:14px;line-height:1.25}#rarebox .rsub{font-size:12.5px;color:#dcecff;line-height:1.45;margin-top:3px}' +
      '#rarebox .rtag{display:inline-block;margin-left:5px;padding:0 6px;border-radius:8px;background:rgba(51,214,166,.16);border:1px solid rgba(51,214,166,.55);font-size:10.5px;font-weight:600;color:#dffbf1;white-space:nowrap}' +
      '#rarebox .rl{display:grid;grid-template-columns:42px 1fr;gap:2px 6px;margin-top:5px;font-size:12.5px;line-height:1.4;color:#eef6ff}#rarebox .rl i{font:800 9px system-ui,sans-serif;letter-spacing:.12em;color:#8fb2d6;padding-top:4px;font-style:normal}#rarebox .rn{display:inline-block;padding:0 7px;border-radius:9px;font-weight:700;font-size:11.5px;color:#fff;border:1px solid rgba(255,255,255,.35);white-space:nowrap}#rarebox .rnone{font-size:12px;color:#b9cde2;margin-top:7px;line-height:1.4}' +
      '#rarebox.flash{animation:rareflash 1.4s ease-out 2}@keyframes rareflash{0%{box-shadow:0 0 0 0 rgba(246,211,101,.9)}100%{box-shadow:0 0 0 22px rgba(246,211,101,0)}}' +
      '@media (max-width:720px){#rarebox{top:auto;bottom:150px;left:7px;max-height:26vh}}@media (max-height:560px){#rarebox{display:none}}';
    document.head.appendChild(st);
    box = document.createElement('div'); box.id = 'rarebox'; box.className = 'glass hide';
    (document.getElementById('ui') || document.body).appendChild(box);
    box.addEventListener('click', function (e) {
      let n = e.target; while (n && n !== box && !(n.dataset && n.dataset.go)) n = n.parentNode;
      { let k = e.target; while (k && k !== box && !(k.classList && k.classList.contains('rk'))) k = k.parentNode; if (k && k !== box) { shut = !shut; sig = ''; if (G.sfx) G.sfx('click'); draw(); return; } }
      if (!n || n === box) return;
      const W = G.W, go = n.dataset.go;
      if (G.sfx) G.sfx('click');
      if (go === 'deed') { if (W.deed) G.focusOn(W.deed.x, W.deed.y, 1.6); return; }
      if (go.charAt(0) === 'w') { const w = (W.works || [])[+go.slice(1)]; if (w) G.focusOn(w.x, w.y, 1.6); return; }
      if (go.charAt(0) === 'p') { const p = (W.deedPast || [])[+go.slice(1)]; if (p) G.focusOn(p.x, p.y, 1.4); return; }
      const id = +go.slice(1), L = W.cre.filter(function (c) { return !c.dead && c.g.mv === id; }).sort(function (a, b) { return G.charmOf(b) - G.charmOf(a); });
      if (L[0]) { if (G.select) G.select(L[0]); G.focusOn(L[0].x, L[0].y, 2.4); }
    });
    return box;
  }
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
    if (window.innerWidth > 720) box.style.top = (vs && !vs.classList.contains('hide') ? Math.round(vs.getBoundingClientRect().bottom) + 8 : 236) + 'px'; else box.style.top = '';
    const by = {}, order = [];
    for (let i = 0; i < W.cre.length; i++) { const c = W.cre[i], mv = c.ph && c.ph.mv; if (!mv || c.dead) continue; if (!by[mv.id]) { by[mv.id] = { d: mv, n: 0 }; order.push(mv.id); } by[mv.id].n++; }
    const d = W.deed, dn = d ? W.cre.filter(function (c) { return c.deedId === d.id && !c.dead; }).length : 0;
    const Wk = W.works || [], Pa = W.deedPast || [];
    const s2 = order.map(function (id) { return id + ':' + by[id].n; }).join(',') + '|' + (d ? d.id + ':' + d.i + ':' + dn + ':' + Math.round(d.progress * 20) + ':' + Math.round((d.steps[d.i].secs - d.t) / 2) : '') + '|' + Wk.map(function (w) { return w.name + (w.fig ? 1 : 0); }).join(',') + '|' + Pa.length + ':' + (Pa.length ? Pa[Pa.length - 1].gen : 0);
    if (s2 + shut === sig) return; sig = s2 + shut; box.classList.toggle('shut', shut);
    let fresh = false, h = '<div class="rk"><span>★ Rare in this pond</span><span>' + [order.length ? order.length + (order.length === 1 ? ' marvel' : ' marvels') : '', d ? 'a plan' : '', Wk.length ? Wk.length + ' built' : ''].filter(Boolean).join(' · ') + '<u>' + (shut ? '▸' : '▾') + '</u></span></div>';
    if (shut) { for (let i = 0; i < order.length; i++) if (!seen['m' + order[i]]) { seen['m' + order[i]] = 1; fresh = true; } if (d && !seen['d' + d.id]) { seen['d' + d.id] = 1; fresh = true; } box.innerHTML = h; if (fresh) { box.classList.remove('flash'); void box.offsetWidth; box.classList.add('flash'); } return; }
    if (d) { if (!seen['d' + d.id]) { seen['d' + d.id] = 1; fresh = true; } const st = d.steps[d.i];
      h += '<div class="rrow" data-go="deed"><span class="ric">⚑</span><span><b>' + esc(d.title) + '</b><span class="rtag">a plan</span>' + plan(d, '<i>NOW</i><span><b style="font-size:12.5px;color:#f6d365">' + cap(STEP[st.do] || st.do).slice(0, -1) + (st.do === 'build' ? ' ' + Math.round(d.progress * 100) + '%' : '') + '</b> · ' + dn + ' of them · step ' + (d.i + 1) + ' of ' + d.steps.length + '</span>') + '</span></div>'; }
    for (let i = Wk.length - 1; i >= 0; i--) { const w = Wk[i];
      h += '<div class="rrow" data-go="w' + i + '"><span class="ric">' + (w.fig && G.figurePic && G.figurePic(w.name) ? '<img alt="" src="data:image/svg+xml;charset=utf-8,' + encodeURIComponent(G.figurePic(w.name)) + '">' : '▲') + '</span><span><b>' + esc(w.name) + '</b><span class="rtag">built</span><div class="rl"><i>BY</i><span>' + chip(w.by, w.hue) + '</span><i>IT IS</i><span>' + esc(cap(w.looks)) + '</span></div></span></div>'; }
    for (let i = 0; i < order.length; i++) { const q = by[order[i]], m = q.d; if (!seen['m' + m.id]) { seen['m' + m.id] = 1; fresh = true; }
      h += '<div class="rrow" data-go="m' + m.id + '"><span class="ric">' + (m.emblem ? '<img alt="" src="data:image/svg+xml;charset=utf-8,' + encodeURIComponent(m.emblem) + '">' : '★') + '</span><span><b>' + esc(m.name) + '</b> ×' + q.n + (m.words && m.words.length ? '<span class="rtag">talks</span>' : '') + '<div class="rsub">' + esc(m.wonder) + '</div></span></div>'; }
    for (let i = Pa.length - 1; i >= 0 && i >= Pa.length - 3; i--) { const p = Pa[i];
      h += '<div class="rrow" data-go="p' + i + '" style="opacity:.8"><span class="ric">✓</span><span><b>' + esc(p.title) + '</b><span class="rtag">' + (p.how === 'done' ? 'done' : 'gave up') + ' · gen ' + p.gen + '</span>' + plan(p, '') + '</span></div>'; }
    if (!d && (order.length || Wk.length || Pa.length)) h += '<div class="rnone">No plan under way just now' + (Pa.length ? ' (the last was in generation ' + Pa[Pa.length - 1].gen + ')' : '') + '.</div>';
    if (!d && !order.length && !Wk.length && !Pa.length) h += '<div class="rnone">Nothing rare alive just now. Every few minutes a creature is born with a marvel, or a kind decides to do something together. It will show here, and you can click it to go there.</div>';
    box.innerHTML = h;
    if (fresh) { box.classList.remove('flash'); void box.offsetWidth; box.classList.add('flash'); }
  }
  setInterval(function () { try { draw(); } catch (e) { console.error(e); } }, 800);
  G.on('new-pond', function () { seen = {}; sig = ''; });
})();
