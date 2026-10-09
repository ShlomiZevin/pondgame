// ── Genes and brain: a window of their own ──
// What one creature is made of, in words and bars a person can read, and its brain at work, drawn large. The pond keeps running behind the
// window (it is not a pause screen), so the brain is watched live: signals travel down the wires as the creature senses and acts.
// It follows the chosen creature: choose another and the window shows that one.
(function () {
  'use strict';
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const PAL = G.PAL, el = G.el, $ = G.$, esc = G.escapeHtml;
  const FOOD = ['gold', 'lime', 'green', 'blue', 'violet', 'pink'], FOODCOL = [PAL.gold, '#c9ee7a', PAL.algae, '#8fc7ff', PAL.violet, PAL.rose];
  const SENSE = { 'bias': 'always on', 'kin near': 'family near', 'energy': 'its own energy', 'temperature': 'warmth', 'rhythm': 'inner rhythm' };
  const ACT = { 'stick': 'stay with family' }, DOING = ['swimming', 'turning', 'sprinting', 'glowing', 'staying with its family'];
  const KMANY = ['legs', 'fins', 'spikes', 'tentacles', 'feelers', 'plates', 'frills', 'horns', 'new growths'];
  let win = null, shownId = 0, raf = 0;

  const st = document.createElement('style');
  st.textContent = '#gbwin{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:min(980px,calc(100% - 20px));max-height:calc(100% - 20px);overflow-y:auto;z-index:40;pointer-events:auto;padding:16px 18px 18px;border-radius:18px;background:rgba(9,20,33,.97);border:1px solid rgba(207,232,255,.28);box-shadow:0 18px 60px rgba(0,0,0,.6);scrollbar-width:thin;color:#e8f3ff}' +
    '#gbwin .gtop{display:flex;align-items:center;gap:14px;margin-bottom:6px}#gbwin .gtop canvas{flex:none;width:92px;height:92px}#gbwin .gtop>div{flex:1;min-width:0}#gbwin .gtop b{display:block;font:800 17px/1.25 system-ui,sans-serif;color:#fff}#gbwin .gtop small{display:block;font:500 13px/1.45 system-ui,sans-serif;color:#c4d8ee;margin-top:3px}' +
    '#gbwin .gcols{display:grid;grid-template-columns:minmax(0,340px) minmax(0,1fr);gap:20px}@media (max-width:820px){#gbwin .gcols{grid-template-columns:minmax(0,1fr)}}' +
    '#gbwin h3{font:800 12px system-ui,sans-serif;letter-spacing:.22em;color:#f6d365;margin:12px 0 8px}#gbwin h4{font:800 10.5px system-ui,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:#8fb2d6;margin:13px 0 6px}' +
    '#gbwin .grow{display:grid;grid-template-columns:104px minmax(0,1fr) 84px;align-items:center;gap:9px;font:600 13px system-ui,sans-serif;padding:3px 0}#gbwin .grow .gl{display:flex;align-items:center;gap:7px;color:#e8f3ff}#gbwin .grow .gl i{flex:none;width:11px;height:11px;border-radius:50%}' +
    '#gbwin .gbar{height:9px;border-radius:5px;background:rgba(207,232,255,.13);overflow:hidden}#gbwin .gbar u{display:block;height:100%;border-radius:5px}#gbwin .grow .gv{text-align:right;font:700 12px system-ui,sans-serif;color:#c4d8ee;white-space:nowrap}' +
    '#gbwin .grow.new .gl{color:#ff9ec6}#gbwin .grow.new .gv:after{content:" new";color:#ff7eb6}' +
    '#gbwin .gchips{display:flex;flex-wrap:wrap;gap:6px}#gbwin .gchips span{font:700 12px system-ui,sans-serif;padding:5px 10px;border-radius:999px;background:rgba(207,232,255,.1);border:1px solid rgba(207,232,255,.2);color:#eaf4ff}#gbwin .gchips span.org{border-color:rgba(246,211,101,.7);color:#ffe9a8}' +
    '#gbwin .gnew{font:600 12.5px/1.5 system-ui,sans-serif;color:#ffb3d3;margin:0;padding:0;list-style:none}#gbwin .gnew li{padding-left:14px;position:relative}#gbwin .gnew li:before{content:"";position:absolute;left:0;top:7px;width:7px;height:7px;border-radius:50%;background:#ff7eb6}#gbwin .gnone{font:500 12.5px system-ui,sans-serif;color:#a9bfd6}' +
    '#gbwin #gbbrain{display:block;width:100%;border-radius:14px;background:rgba(4,12,22,.75);border:1px solid rgba(207,232,255,.12)}' +
    '#gbwin .gsay{font:700 14px/1.45 system-ui,sans-serif;color:#fff;margin:10px 2px 6px;min-height:40px}#gbwin .gsay em{font-style:normal;color:#f6d365}' +
    '#gbwin .gleg{display:flex;flex-wrap:wrap;gap:6px 16px;font:500 12px system-ui,sans-serif;color:#b9cde2}#gbwin .gleg span{display:flex;align-items:center;gap:6px}#gbwin .gleg i{display:inline-block;width:22px;height:4px;border-radius:2px}#gbwin .gleg i.d{width:10px;height:10px;border-radius:50%}' +
    '#gbwin.about{width:min(620px,calc(100% - 20px))}#gbwin .arow{display:grid;grid-template-columns:86px minmax(0,1fr) 34px;gap:4px 10px;align-items:center;padding:6px 0;border-bottom:1px solid rgba(207,232,255,.08)}#gbwin .arow b{font:700 13.5px system-ui,sans-serif;color:#fff}#gbwin .arow i{font:800 14px system-ui,sans-serif;font-style:normal;color:#f6d365;text-align:right}#gbwin .arow small{grid-column:1 / -1;font:500 12px/1.45 system-ui,sans-serif;color:#b9cde2}#gbwin .atext p{font:500 13px/1.55 system-ui,sans-serif;color:#dcecff;margin:0 0 6px}#gbwin .atext small{font-size:13px}' +
    '#gbwin .gnote{font:500 12px/1.5 system-ui,sans-serif;color:#a9bfd6;margin:8px 2px 0}';
  document.head.appendChild(st);

  function close() { if (win) { win.remove(); win = null; } shownId = 0; if (raf) { cancelAnimationFrame(raf); raf = 0; } }
  G.closeGenes = close;
  G.openGenes = function () {
    if (win) { close(); return; }
    if (!G.R.sel) return;
    win = el('div', '', '', $('ui')); win.id = 'gbwin';
    win.innerHTML = '<div class="gtop"><canvas id="gbprev" width="184" height="184"></canvas><div><b id="gbname"></b><small id="gbsub"></small></div><button class="btn sm" id="gbclose">' + (G.ICON.close || '') + 'CLOSE</button></div>' +
      '<div class="gcols"><div><h3>GENES · WHAT IT IS MADE OF</h3><div id="gbgenes"></div></div>' +
      '<div><h3>BRAIN · WATCH IT THINK</h3><canvas id="gbbrain" width="1160" height="760"></canvas><div class="gsay" id="gbsay"></div>' +
      '<div class="gleg"><span><i style="background:' + PAL.algae + '"></i>a wire that says "do it"</span><span><i style="background:' + PAL.rose + '"></i>a wire that says "do not"</span><span><i style="background:#fff;height:7px"></i>thicker = stronger</span><span><i class="d" style="background:#fff"></i>moving dots = a signal passing right now</span><span><i style="background:' + PAL.gold + ';height:7px"></i>gold edge = changed by what it learned in its life</span></div>' +
      '<p class="gnote">The wires are genes: a creature is born with them, from both parents, with small changes. During its life it also learns: wires that were in use just before a meal grow stronger, wires in use just before it was hurt or ate what makes it ill grow weaker. What it learned stays its own; its children get the genes, not the lessons.</p></div></div>';
    $('gbclose').onclick = function () { G.sfx('click'); close(); };
    win.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
    win.addEventListener('wheel', function (e) { e.stopPropagation(); }, { passive: true });
    frame();
  };
  window.addEventListener('keydown', function (e) { if (win && e.key === 'Escape') { e.stopPropagation(); close(); } else if (about && e.key === 'Escape') { e.stopPropagation(); closeAbout(); } }, true);
  // ── About this creature: its marks explained, how it is doing, its family, what is new in it. A window like the one above; the card itself stays short. ──
  let about = null, aboutT = 0, aboutSig = '';
  function closeAbout() { if (about) { about.remove(); about = null; } if (aboutT) { clearInterval(aboutT); aboutT = 0; } aboutSig = ''; }
  function fillAbout() {
    const c = G.R.sel; if (!about || !c || G.mode !== 'play') { closeAbout(); return; }
    const sp = G.speciesById(c.sp), txt = function (id) { const e = $(id); return e ? e.innerHTML : ''; }, says = Array.prototype.slice.call(document.querySelectorAll('#ifit small')).map(function (e) { return e.innerHTML; }).filter(Boolean);
    const bar = function (m) { const v = G.markOf(c, m.id); return '<div class="arow"><b>' + m.label + '</b><span class="gbar"><u style="width:' + Math.round(v * 100) + '%;background:#f6d365"></u></span><i>' + (v * 10).toFixed(1) + '</i><small>' + esc(String(m.note).replace(/^[A-Za-z]+: /, '').replace(/, out of 10.?/, '.')) + '</small></div>'; };
    const h = '<div class="gtop"><div><b>' + esc((sp ? sp.name : 'Blob') + ' #' + c.id) + '</b><small>' + esc(G.kindOf(c.g).full) + '</small></div><button class="btn sm" id="abclose">' + (G.ICON.close || '') + 'CLOSE</button></div>' +
      '<h3>ITS MARKS · OUT OF 10</h3>' + (G.MARKS || []).map(bar).join('') + '<div class="arow"><b>Appeal</b><span></span><i>' + (G.charmOf(c) * 10).toFixed(1) + '</i><small>All its marks together. Appeal, with having fed well, is its fitness: who breeds and who fades.</small></div>' +
      '<h3>WHAT IS SAID OF IT</h3><div class="atext">' + says.map(function (t) { return '<p>' + t + '</p>'; }).join('') + '</div>' +
      '<h3>HOW IT IS DOING</h3><div class="atext"><p>' + txt('iE') + '</p><p>' + txt('iAge') + '</p><p>' + txt('iPar') + '</p></div>' +
      '<h3>WHAT IS NEW IN IT</h3><div class="atext"><p>' + txt('imut') + '</p></div>';
    if (h === aboutSig) return; aboutSig = h; const sc = about.scrollTop; about.innerHTML = h; about.scrollTop = sc; $('abclose').onclick = function () { G.sfx('click'); closeAbout(); };
  }
  G.openAbout = function () { if (about) { closeAbout(); return; } if (!G.R.sel) return; about = el('div', '', '', $('ui')); about.id = 'gbwin'; about.classList.add('about'); about.addEventListener('pointerdown', function (e) { e.stopPropagation(); }); about.addEventListener('wheel', function (e) { e.stopPropagation(); }, { passive: true }); fillAbout(); aboutT = setInterval(function () { try { fillAbout(); } catch (e) { console.error(e); closeAbout(); } }, 500); };
  G.on('new-pond', closeAbout);
  G.on('new-pond', close);

  const pct = function (v) { return Math.round(100 * Math.max(0, Math.min(1, v))) + '%'; };
  function row(label, frac, col, value, isNew, dot) {
    return '<div class="grow' + (isNew ? ' new' : '') + '"><span class="gl">' + (dot ? '<i style="background:' + dot + '"></i>' : '') + esc(label) + '</span><span class="gbar"><u style="width:' + pct(frac) + ';background:' + col + '"></u></span><span class="gv">' + esc(value) + '</span></div>';
  }
  function genes(c) {
    const g = c.g, f = g.f, mut = {};
    c.muts.forEach(function (m) { mut[m.kind + m.i] = 1; });
    const word = function (v, a, b, m) { return v < 0.33 ? a : v < 0.66 ? m : b; };
    let h = '<h4>Body</h4>';
    h += row('Size', (g.t[0] - 5) / 59, PAL.frost, String(Math.round(g.t[0])), mut.t0);
    h += row('Speed', g.t[1] / 0.8, PAL.frost, word(g.t[1] / 0.8, 'slow', 'fast', 'medium'), mut.t1);
    h += row('Temper', g.t[4], PAL.rose, word(g.t[4], 'gentle', 'fierce', 'bold'), mut.t4);
    h += '<div class="grow' + (mut.t2 ? ' new' : '') + '"><span class="gl">Colour</span><span class="gbar" style="height:14px"><u style="width:100%;background:' + G.hsl(g.t[2], 80, 60, 1) + '"></u></span><span class="gv"></span></div>';
    h += '<h4>What it can eat (how well it digests each food)</h4>';
    for (let i = 0; i < 6; i++) h += row(FOOD[i] + ' food', g.c[i], FOODCOL[i], c.ph.bane === i ? 'makes it ill' : (c.ph.fav === i && c.ph.love > 0.3 ? '\u2665 ' : '') + pct(g.c[i]), mut['c' + i], FOODCOL[i]);
    if (c.ph.love > 0.3) h += '<div class="gnone" style="margin-top:4px">\u2665 its favourite: it gets ' + Math.round(30 * c.ph.love) + '% more from it.' + (c.ph.bane >= 0 ? ' The opposite colour, ' + FOOD[c.ph.bane] + ', makes it ill until its kind evolves a stomach for it.' : '') + '</div>';
    h += '<h4>What it can stand</h4>';
    h += row('Heat', g.c[6], '#ffb37a', pct(g.c[6]), mut.c6) + row('Cold', g.c[7], '#9fd6ff', pct(g.c[7]), mut.c7) + row('Poison', g.c[8], PAL.violet, pct(g.c[8]), mut.c8);
    // how the body is built: counted in plain words
    const chips = [], cnt = {};
    chips.push(f.sym ? 'star shape, ' + f.sym + ' arms' : f.n + (f.n === 1 ? ' body part' : ' body parts in a row'));
    if (f.en) chips.push(f.en + (f.en === 1 ? ' eye' : ' eyes'));
    (f.rules || []).forEach(function (q) {
      let name = KMANY[q.k] || 'growths';
      if (q.k === 8) { const d = (G.W.designs || []).filter(function (x) { return x.id === q.t; })[0]; name = d ? d.name.toLowerCase() : 'new growths'; }
      cnt[name] = (cnt[name] || 0) + 1;
    });
    Object.keys(cnt).forEach(function (k) { chips.push(k + (cnt[k] > 1 ? ' × ' + cnt[k] + ' sets' : '')); });
    h += '<h4>How its body is built</h4><div class="gchips">' + chips.map(function (x) { return '<span>' + esc(x) + '</span>'; }).join('') +
      g.p.map(function (p) { const o = G.organOf(p.k); return '<span class="org" title="' + esc(o ? o.note : '') + '">' + esc(o ? o.name : 'an organ') + '</span>'; }).join('') + '</div>';
    h += '<h4>Brain</h4><div class="gchips"><span>' + g.h + (g.h === 1 ? ' thinking cell' : ' thinking cells') + '</span><span>' + g.w.length + (g.w.length === 1 ? ' wire' : ' wires') + '</span></div>';
    const news = c.muts.map(function (m) { return m.text; }).filter(function (v, i, a) { return a.indexOf(v) === i; }).slice(0, 8);
    h += '<h4>What is new in it (not in its parents)</h4>' + (news.length ? '<ul class="gnew">' + news.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>' : '<div class="gnone">Nothing: its genes are a plain mix of its parents.</div>');
    return h;
  }

  // the brain, drawn large and live
  function brain(c, t) {
    const cv = $('gbbrain'), ctx = cv.getContext('2d'), W = cv.width, H = cv.height, g = c.g, nh = Math.max(1, g.h);
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, W, H);
    const X = [250, W / 2, W - 250], top = 84, bot = H - 30;
    const pos = function (id) {
      if (id >= 200) return [X[2], top + (bot - top) * (id - 200 + 0.5) / G.NOUT];
      if (id >= 100) return [X[1], top + (bot - top) * (id - 100 + 0.5) / nh];
      return [X[0], top + (bot - top) * (id + 0.5) / G.NIN];
    };
    const val = function (id) { return id >= 200 ? c.out[id - 200] : id >= 100 ? c.hv[id - 100] : c.inp[id]; };
    ctx.font = '800 19px system-ui, sans-serif'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#8fb2d6'; ctx.textAlign = 'center';
    ctx.fillText('WHAT IT SENSES', X[0] - 70, 34); ctx.fillText('THINKING CELLS', X[1], 34); ctx.fillText('WHAT IT DOES', X[2] + 70, 34);
    const used = {};
    for (let i = 0; i < g.w.length; i++) { used[g.w[i].f] = 1; used[g.w[i].t] = 1; }
    // what this one has learned in its life: its own change to each wire (the brain keeps wires grouped by where they end, so they are matched up here)
    const LW = []; if (c.lw) { const nt = g.h + G.NOUT, at = []; for (let i = 0; i < nt; i++) at.push(c.ph.bs[i]); for (let i = 0; i < g.w.length; i++) { const w = g.w[i], ti = w.t >= 200 ? g.h + (w.t - 200) : w.t - 100; if (ti >= 0 && ti < nt) LW[i] = c.lw[at[ti]++] || 0; } }
    // wires, and the signals moving along them
    for (let i = 0; i < g.w.length; i++) {
      const w = g.w[i], a = pos(w.f), b = pos(w.t), mx = (a[0] + b[0]) / 2, lv = LW[i] || 0, wv = w.v + lv, sig = Math.min(1, Math.abs((val(w.f) || 0) * wv)), col = wv >= 0 ? PAL.algae : PAL.rose;
      if (Math.abs(lv) > 0.04) { ctx.strokeStyle = G.rgba(PAL.gold, Math.min(0.75, 0.2 + Math.abs(lv))); ctx.lineWidth = 5.5 + Math.min(7, Math.abs(wv) * 3.6); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.bezierCurveTo(mx, a[1], mx, b[1], b[0], b[1]); ctx.stroke(); }
      ctx.strokeStyle = G.rgba(col, 0.22 + 0.7 * sig); ctx.lineWidth = 1.5 + Math.min(7, Math.abs(wv) * 3.6);
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.bezierCurveTo(mx, a[1], mx, b[1], b[0], b[1]); ctx.stroke();
      if (sig > 0.12) {
        const u = (t * (0.5 + sig * 0.7) + i * 0.37) % 1, v = 1 - u;
        const px = v * v * v * a[0] + 3 * v * v * u * mx + 3 * v * u * u * mx + u * u * u * b[0], py = v * v * v * a[1] + 3 * v * v * u * a[1] + 3 * v * u * u * b[1] + u * u * u * b[1];
        ctx.fillStyle = G.rgba('#ffffff', 0.55 + 0.45 * sig); ctx.beginPath(); ctx.arc(px, py, 3.5 + 3.5 * sig, 0, 6.2832); ctx.fill();
      }
    }
    ctx.font = '600 21px system-ui, sans-serif';
    for (let i = 0; i < G.NIN; i++) {
      const p = pos(i), v = Math.min(1, Math.abs(c.inp[i] || 0)), on = !!used[i], nm = SENSE[G.INAMES[i]] || G.INAMES[i];
      ctx.fillStyle = G.rgba(PAL.frost, on ? 0.3 + 0.7 * v : 0.14); ctx.beginPath(); ctx.arc(p[0], p[1], on ? 9 + v * 6 : 5, 0, 6.2832); ctx.fill();
      ctx.textAlign = 'right'; ctx.fillStyle = on ? G.rgba('#ffffff', 0.6 + 0.4 * v) : G.rgba(PAL.frost, 0.32); ctx.fillText(nm, p[0] - 24, p[1]);
    }
    for (let i = 0; i < g.h; i++) {
      const p = pos(100 + i), v = Math.min(1, Math.abs(c.hv[i] || 0));
      ctx.fillStyle = G.rgba(PAL.violet, 0.35 + 0.65 * v); ctx.beginPath(); ctx.arc(p[0], p[1], 13 + v * 5, 0, 6.2832); ctx.fill();
      ctx.strokeStyle = G.rgba('#ffffff', 0.25 + 0.5 * v); ctx.lineWidth = 2; ctx.stroke();
    }
    if (!g.h) { ctx.textAlign = 'center'; ctx.font = '500 17px system-ui, sans-serif'; ctx.fillStyle = G.rgba(PAL.frost, 0.4); ctx.fillText('none yet: senses are', X[1], H / 2 - 12); ctx.fillText('wired straight to actions', X[1], H / 2 + 12); ctx.font = '600 21px system-ui, sans-serif'; }
    for (let i = 0; i < G.NOUT; i++) {
      const p = pos(200 + i), v = Math.max(0, Math.min(1, i === 1 ? Math.abs(c.out[1]) : c.out[i])), nm = ACT[G.ONAMES[i]] || G.ONAMES[i];
      ctx.fillStyle = G.rgba(PAL.gold, 0.3 + 0.7 * v); ctx.beginPath(); ctx.arc(p[0], p[1], 11 + v * 8, 0, 6.2832); ctx.fill();
      ctx.textAlign = 'left'; ctx.fillStyle = G.rgba('#ffffff', 0.6 + 0.4 * v); ctx.fillText(nm, p[0] + 28, p[1] - 9);
      ctx.fillStyle = 'rgba(207,232,255,.14)'; G.roundRect(ctx, p[0] + 28, p[1] + 9, 150, 8, 4); ctx.fill();
      if (v > 0.02) { ctx.fillStyle = PAL.gold; G.roundRect(ctx, p[0] + 28, p[1] + 9, Math.max(8, 150 * v), 8, 4); ctx.fill(); }
    }
  }
  /** one plain sentence: what it is doing this moment, and which sense is behind it */
  function saying(c) {
    if (c.asleep) return 'Right now it is <em>asleep</em>.';
    let bo = -1, bv = 0.12;
    for (let i = 0; i < G.NOUT; i++) { const v = i === 1 ? Math.abs(c.out[1]) * 0.8 : c.out[i]; if (v > bv) { bv = v; bo = i; } }
    if (bo < 0) return 'Right now it is <em>drifting</em>: nothing it senses is pushing it to act.';
    const g = c.g, val = function (id) { return id >= 100 ? c.hv[id - 100] : c.inp[id]; };
    const src = function (to, sign) { let best = -1, bc = 0.02; for (let i = 0; i < g.w.length; i++) { const w = g.w[i]; if (w.t !== to) continue; const k = (val(w.f) || 0) * w.v * sign; if (k > bc) { bc = k; best = w.f; } } return best; };
    const sign = bo === 1 && c.out[1] < 0 ? -1 : 1;
    let s = src(200 + bo, sign), via = false;
    if (s >= 100) { const h = s, s2 = src(h, c.hv[h - 100] >= 0 ? 1 : -1); via = true; s = s2 >= 0 && s2 < 100 ? s2 : -1; }
    let why = '';
    if (s > 0) why = ', mostly because of <em>' + esc(SENSE[G.INAMES[s]] || G.INAMES[s]) + '</em>' + (via ? ' (passed through a thinking cell)' : '');
    else if (s === 0) why = ': it is wired to do that all the time';
    return 'Right now it is <em>' + DOING[bo] + '</em>' + why + '.';
  }

  let lastSay = 0;
  function frame() {
    raf = 0;
    if (!win) return;
    const c = G.R.sel;
    if (!c || G.mode !== 'play') { close(); return; }
    raf = requestAnimationFrame(frame);
    if (c.dead) return;      // the card moves on to its kin in a moment; this window follows
    if (c.id !== shownId) {
      shownId = c.id;
      const sp = G.speciesById(c.sp);
      $('gbname').textContent = (sp ? sp.name : 'Blob') + ' #' + c.id + ' · ' + G.kindOf(c.g).full;
      $('gbsub').textContent = 'Born in generation ' + c.born + '. ' + (G.lifeText ? G.lifeText(c) : '');
      $('gbgenes').innerHTML = genes(c);
      lastSay = 0;
    }
    try {
      const pv = $('gbprev'), px = pv.getContext('2d'), prev = G.R.selPrev;
      px.setTransform(1, 0, 0, 1, 0, 0); px.clearRect(0, 0, 184, 184);
      if (prev) G.drawFit(px, prev, 92, 92, 84, G.rt);
      brain(c, performance.now() / 1000);
      const now = performance.now();
      if (now - lastSay > 500) { lastSay = now; $('gbsay').innerHTML = saying(c); }
    } catch (e) { console.error(e); close(); }
  }
})();
