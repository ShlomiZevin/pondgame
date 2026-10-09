// ── Building, piece by piece ──
// When a kind sets out to build, nothing appears by itself. There are MATERIALS lying about the pond, each where the pond's own nature puts it:
//     stone  on the floor of the pond, where it has sunk          reed  growing on the land and along the waterline          shell  where a creature has died
// and what is to be built is a PLAN OF PIECES (blocks, posts, a roof, a door, a banner), worked out from who is building: what the thing is for decides
// its sort (a walled ring, a cluster of huts, a tall beacon, a hall), the kind's own body decides its style (a spiny kind builds spires, a round one domes)
// and its brain how elaborate it dares to be. That is only the fallback, though: where there is an AI to ask, the SHAPE IS THEIRS TO DECIDE. The kind's
// shared mind is asked to design the thing, piece by piece, in any shape it likes, knowing who they are, why they build and what already stands near
// (G.designFrom): so no two ponds build alike, and nothing here says what a building looks like. Each builder goes and fetches the material the next piece needs, hauls it back (slowly, and slower still
// with nothing to grip it with) and sets it in place, from the ground up; when the frame stands they go round it again and colour it in their own colours.
// So a building is watched being made, by many hands, and a half-built one shows exactly how far they got.
// What they build stays while their kind lives to keep it up; when the kind is gone it crumbles from the top, piece by piece, into a ruin. The player,
// as nature, can strike it down. It is drawn by the game itself, in the pond's own style: no picture is asked of the AI for it.
(function () {
  'use strict';
  const clamp = G.clamp, TAU = 6.2832, INK = '#14202e';
  const MAT = [{ id: 'stone', cap: 44, col: [205, 12, 62] }, { id: 'reed', cap: 40, col: [78, 38, 58] }, { id: 'shell', cap: 26, col: [32, 55, 84] }];
  G.MATS = MAT;
  const hsl = function (h, s, l, a) { return 'hsla(' + ((h % 360) + 360) % 360 + ',' + s + '%,' + l + '%,' + (a === undefined ? 1 : a) + ')'; };

  // ── materials in the pond ──
  function scatter(W, k) {
    const sy = G.shoreY ? G.shoreY(W) : W.wh * 0.2; let x = 30 + G.rand() * (W.ww - 60), y;
    if (k === 0) y = W.wh - 26 - G.rand() * G.rand() * (W.wh - sy) * 0.5;                    // stone: sunk to the floor, thinning upward
    else if (k === 1) y = G.rand() < 0.7 ? 18 + G.rand() * Math.max(10, sy - 30) : sy + G.rand() * 40;      // reed: on the land, some at the waterline
    else return;                                                                           // shell: only where something died
    W.mats.push({ x: x, y: y, k: k, s: G.rand() });
  }
  function matsStep(W, dt) {
    if (!W.mats) { W.mats = []; for (let i = 0; i < 26; i++) scatter(W, 0); for (let i = 0; i < 22; i++) scatter(W, 1); }
    W.matT = (W.matT || 0) - dt; if (W.matT > 0) return; W.matT = 2.5;
    const n = [0, 0, 0], area = Math.sqrt(W.ww * W.wh / 3.3e6); for (let i = 0; i < W.mats.length; i++) n[W.mats[i].k]++;
    for (let k = 0; k < 2; k++) if (n[k] < MAT[k].cap * area) scatter(W, k);
  }
  if (G.on) G.on('death', function (c) { const W = G.W; if (!W || !W.mats || !c || G.rand() > 0.4) return; let n = 0; for (let i = 0; i < W.mats.length; i++) if (W.mats[i].k === 2) n++; if (n < MAT[2].cap * Math.sqrt(W.ww * W.wh / 3.3e6)) W.mats.push({ x: clamp(c.x, 20, W.ww - 20), y: clamp(c.y, 20, W.wh - 20), k: 2, s: G.rand() }); });

  // ── the plan of pieces ──
  // a piece: { s: shape, x, y (the middle of its foot; y grows upward as it goes more negative), w, h, m: material, c: [hue shift, sat, light], st: 0 not there · 1 set · 2 coloured }
  function plan(o) {
    const r = G.rng ? G.rng((o.seed >>> 0) + 17) : Math.random, S = o.S, P = [], sp = o.spiky > 0.5, rich = o.brain;
    const add = function (s, x, y, w, h, m, c) { P.push({ s: s, x: x, y: y, w: w, h: h, m: m, c: c, st: 0 }); };
    const roof = function (x, y, w, h) { if (sp) add('tri', x, y, w, h * 1.5, 1, [20, 60, 52]); else add('dome', x, y, w, h, 2, [20, 62, 58]); };
    if (o.type === 'wall') {
      const N = 10 + Math.round(4 * rich), rx = S * 1.05, ry = S * 0.62, posts = [];
      for (let i = 0; i < N; i++) { const a = -Math.PI / 2 + (i + 0.5) / N * TAU, gate = Math.abs(a - Math.PI / 2) < 0.36; posts.push([Math.cos(a) * rx, Math.sin(a) * ry, gate]); }
      posts.sort(function (p, q) { return p[1] - q[1]; });      // the far side first
      posts.forEach(function (p) { const h = S * (p[2] ? 0.62 : 0.44) * (0.9 + 0.2 * r()), w = S * 0.2; add('rect', p[0], p[1], w, h, 0, [0, 22, 46]); if (sp) add('tri', p[0], p[1] - h, w * 1.1, w * 0.9, 1, [20, 60, 52]); else add('dome', p[0], p[1] - h, w * 1.15, w * 0.6, 2, [20, 62, 60]); });
      add('beam', 0, ry - S * 0.6, S * 0.74, S * 0.08, 1, [35, 65, 58]); add('flag', 0, ry - S * 0.68, S * 0.2, S * 0.3, 1, [0, 85, 60]);
    } else if (o.type === 'huts') {
      const N = 3 + Math.round(2 * rich), huts = [];
      for (let i = 0; i < N; i++) { const a = Math.PI * (0.15 + 0.7 * i / (N - 1)); huts.push([Math.cos(a) * S * 0.95, -Math.sin(a) * S * 0.32 * (i % 2 ? 0.4 : 1)]); }
      huts.sort(function (p, q) { return p[1] - q[1]; });
      huts.forEach(function (p) { const w = S * (0.36 + 0.1 * r()), h = w * 0.62; add('rect', p[0], p[1], w, h, 0, [0, 24, 50]); roof(p[0], p[1] - h, w * 1.25, w * 0.6); add('door', p[0], p[1], w * 0.3, h * 0.62, 1, [0, 30, 16]); });
      add('circ', 0, S * 0.14, S * 0.28, S * 0.28, 2, [40, 75, 62]);      // the store in the middle
      if (rich > 0.5) add('flag', 0, -S * 0.14, S * 0.16, S * 0.26, 1, [0, 85, 60]);
    } else if (o.type === 'spire') {
      const N = 4 + Math.round(3 * rich); let y = 0, w = S * 0.5;
      add('rect', 0, 0, w * 1.5, S * 0.14, 0, [0, 20, 40]); y -= S * 0.14;
      for (let i = 0; i < N; i++) { const h = S * 0.24; add('rect', 0, y, w, h, 0, [0, 24, 48 + 3 * i]); if (i % 2) add('circ', 0, y - h * 0.5, w * 0.24, w * 0.24, 2, [45, 80, 68]); y -= h; w *= 0.88; }
      roof(0, y, w * 1.3, w * 0.7); add('lamp', 0, y - (sp ? w * 1.2 : w * 0.75), S * 0.16, S * 0.16, 2, [50, 95, 72]);
      for (let i = 0; i < 4; i++) add('rect', (i - 1.5) * S * 0.42, S * 0.1, S * 0.14, S * 0.12, 0, [0, 18, 44]);
    } else if (o.type === 'house') {      // a small house: walls, a door, a roof, and, for the cleverer, a window and a smoke-hole
      const w = S * (1.2 + 0.3 * r()), h = S * 0.62; add('rect', 0, 0, w, h, 0, [0, 24, 50]); add('door', -w * 0.18, 0, w * 0.24, h * 0.7, 1, [0, 30, 16]); if (rich > 0.3) add('circ', w * 0.24, -h * 0.3, w * 0.18, w * 0.18, 2, [45, 80, 68]); roof(0, -h, w * 1.2, w * 0.42); if (rich > 0.6) add('rect', w * 0.3, -h - w * 0.1, w * 0.12, w * 0.3, 0, [0, 20, 40]);
    } else {      // a hall
      const tiers = 2 + Math.round(2 * rich), bh = S * 0.25, W0 = S * 1.15;
      for (let i = 0; i < tiers; i++) { const n = Math.max(1, 4 - i), tw = W0 * (1 - 0.2 * i), bw = tw / n; for (let k = 0; k < n; k++) add('rect', -tw / 2 + bw * (k + 0.5), -i * bh, bw * 0.96, bh, 0, [0, 24, 46 + 4 * i + 3 * (k % 2)]); }
      add('door', 0, 0, W0 * 0.2, bh * 0.82, 1, [0, 30, 16]);
      for (let i = 1; i < tiers; i++) { const tw = W0 * (1 - 0.2 * i); add('circ', -tw * 0.25, -i * bh - bh * 0.5, bh * 0.3, bh * 0.3, 2, [45, 80, 68]); add('circ', tw * 0.25, -i * bh - bh * 0.5, bh * 0.3, bh * 0.3, 2, [45, 80, 68]); }
      const topW = W0 * (1 - 0.2 * (tiers - 1)); roof(0, -tiers * bh, topW * 1.12, topW * 0.42);
      if (rich > 0.45) [-1, 1].forEach(function (sd) { const x = sd * W0 * 0.62; add('rect', x, 0, S * 0.2, bh * 1.5, 0, [0, 22, 44]); roof(x, -bh * 1.5, S * 0.26, S * 0.16); });
      add('flag', 0, -tiers * bh - (sp ? topW * 0.6 : topW * 0.42), S * 0.18, S * 0.3, 1, [0, 85, 60]);
    }
    return P;
  }
  const count = function (bp) { let a = 0, b = 0; for (let i = 0; i < bp.P.length; i++) { if (bp.P[i].st > 0) a++; if (bp.P[i].st > 1) b++; } return [a, b, bp.P.length]; };
  G.buildCount = function (o) { return o && o.bp ? count(o.bp) : null; };
  const halfW = function (bp) { let m = 0, top = 0; for (let i = 0; i < bp.P.length; i++) { const p = bp.P[i]; m = Math.max(m, Math.abs(p.x) + p.w / 2); top = Math.max(top, -p.y + (p.s === 'lamp' ? p.w / 2 : p.h)); } bp.top = top; return Math.max(30, m); };
  /** how far above its place on the map a building's top is (for its label) */
  G.buildTop = function (o) { const bp = o.bp; if (!bp) return 60; if (bp.top === undefined) bp.hw = halfW(bp); return bp.top - bp.S * 0.45; };
  /** where it will stand. Their common sense about a place: build beside what your own kind has built; stand on the same ground line as your neighbours, so
   *  that buildings make a row and not a scatter; leave a gap; never build on top of another. */
  function site(W, d) {
    const bp = d.bp, hw = bp.hw = halfW(bp), Wk = (W.works || []).filter(function (w) { return w.bp && !w.fall; }), sy = G.shoreY ? G.shoreY(W) : 0, onLand = d.y < sy;
    let x = d.x, y = d.y; const mine = Wk.filter(function (w) { return w.sp === d.sp; });
    if (mine.length) { x = mine[mine.length - 1].x; y = mine[0].y; d.beside = mine[0].name; }
    else { let nb = null, nd = 460; Wk.forEach(function (w) { const dd = Math.hypot(w.x - x, w.y - y); if (dd < nd && (w.y < sy) === onLand) { nd = dd; nb = w; } }); if (nb) y = nb.y; }
    const free = function (px) { for (let i = 0; i < Wk.length; i++) { const w = Wk[i], gap = (w.bp.hw || halfW(w.bp)) + hw + 26; if (Math.abs(w.x - px) < gap && Math.abs(w.y - y) < 150) return false; } return px > hw + 40 && px < W.ww - hw - 40; };
    const step = hw * 0.8 + 40, y0 = y, x0 = x, lo = onLand ? 70 : sy + 110, hi = onLand ? Math.max(80, sy - 40) : W.wh - 90; let ok = false;
    for (let row = 0; row < 7 && !ok; row++) { y = y0 + (row % 2 ? 1 : -1) * Math.ceil(row / 2) * 190; if (row && (y < lo || y > hi)) continue; y = clamp(y, lo, hi); x = x0; ok = free(x); for (let k = 1; k < 40 && !ok; k++) { const px = x0 + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * step; if (free(px)) { x = px; ok = true; } } }      /* when a row is full, a new one is begun behind it: a second street */
    if (!ok) { d.noRoom = true; y = y0; x = x0; }
    d.x = clamp(x, hw + 40, W.ww - hw - 40); d.y = clamp(y, lo, hi);
  }
  // ── the shape is theirs to decide ──
  const SHAPE = { block: 'rect', column: 'rect', slab: 'rect', dome: 'dome', cone: 'tri', ball: 'circ', arch: 'door', beam: 'beam', wing: 'wing', lamp: 'lamp', flag: 'flag' };
  const COL = { main: [0, 55, 55], second: [38, 50, 62], light: [14, 34, 82], dark: [0, 30, 16], glow: [50, 95, 72] };      // their own colour, a neighbour of it, a pale of it: colours that sit together
  /** the pieces of a design, checked: any shape is allowed, but every piece is one the pond knows how to draw, of a sane size, and they go up from the ground */
  G.designFrom = function (raw, S, maxN) {
    const L = raw && Array.isArray(raw.pieces) ? raw.pieces : null; if (!L) return null; const P = [];
    for (let i = 0; i < L.length && P.length < maxN; i++) { const q = L[i] || {}, s = SHAPE[q.s]; if (!s) continue; const x = +q.x, y = +q.y, w = +q.w, h = +q.h; if (![x, y, w, h].every(isFinite)) continue;
      const c = (COL[q.c] || COL.main).slice(); if (q.s === 'slab') c[2] -= 8;
      P.push({ s: s, x: clamp(x, -1.4, 1.4) * S, y: -clamp(y, 0, 2.8) * S, w: clamp(w, 0.05, 1.8) * S, h: clamp(h, 0.04, 1.4) * S, m: Math.max(0, ['stone', 'reed', 'shell'].indexOf(q.m)), c: c, st: 0, rr: q.s === 'column' ? 0.4 : q.s === 'slab' ? 0.1 : 0 }); }
    if (P.length < 4) return null;
    P.forEach(function (p, i) { p._i = i; }); P.sort(function (a, b) { return (b.y - a.y) || (a._i - b._i); }); P.forEach(function (p) { delete p._i; });      // from the ground up
    return P;
  };
  const live = function () { return G.mode === 'play' && G.host && G.host.ready && G.host.caps && G.host.caps.ai && G.ai && G.ai.provider === 'server' && G.ai.hasFuel(); };
  /** the design a kind's houses follow: its own if it has one, else that of the kind it came from */
  function houseStyle(W, spId) { const H = W.houseStyle || {}; let id = spId; for (let k = 0; k < 6 && id; k++) { if (H[id]) return H[id]; const s = G.speciesById(id); id = s ? s.parent : 0; } return null; }
  function askDesign(W, d) {
    if (d.result && d.result.house) { const st = houseStyle(W, d.sp); if (st) { const base = blueprint(d), P = G.designFrom(st, base.S, 14); if (P) { base.P = P; base.designed = true; base.about = st.about || ''; settle(base, true); d.design = base; return; } } }      /* (a village: every house of a kind is the same house) */
    if (typeof document === 'undefined' || !live() || !G.ai.allow('deed')) { d.design = false; return; }
    const base = blueprint(d), sp = G.speciesById(d.sp), f = sp && sp.rep ? sp.rep.f : null, r = d.result || {}, house = !!(r.house), maxN = house ? Math.round(6 + 5 * base.brain) : Math.round(12 + 26 * base.brain);
    const near = (W.works || []).filter(function (w) { return w.bp && !w.fall && Math.hypot(w.x - d.x, w.y - d.y) < 900; }).slice(-5).map(function (w) { return { name: w.name, by: w.by, what: w.bp.about || w.looks || '' }; });
    const info = { builders: d.kind, body: f && G.form.kind ? G.form.kind(f).full + (G.form.facts ? ': ' + G.form.facts(f).slice(0, 6).join('; ') : '') : '', name: r.name || '', looks: r.looks || '', why: d.why || '', what: d.what || '', purpose: house ? 'a small house for one family of them to sleep in and raise their young: every house of this kind will be built to this same design, side by side, so keep it simple and their own' : r.solid ? 'it shuts others out: only they may pass' : r.feed > 0.05 ? 'it feeds them' : r.pull > 0.1 ? 'it draws them together' : r.hurt > 0.05 ? 'it harms what comes near' : 'a place of their own', where: d.y < (G.shoreY ? G.shoreY(W) : 0) ? 'on the land' : 'under water, on the pond floor', pieces: [Math.round(maxN * 0.55), maxN], near: near, model: G.ai.model || undefined };
    d.design = null;
    G.host.call('ai.build', info, 60000).then(function (res) { G.ai.tally('deed', res && res.source, res && res.usd); if (G.W !== W || W.deed !== d || d.bp) return; const P = res && res.build ? G.designFrom(res.build, base.S, maxN) : null; if (!P) { d.design = false; return; } if (house) { (W.houseStyle = W.houseStyle || {})[d.sp] = { about: String(res.build.about || '').slice(0, 120), pieces: res.build.pieces.slice(0, 14) }; } base.P = P; base.designed = true; settle(base, true); base.about = String(res.build.about || '').replace(/[<>]/g, '').slice(0, 120); d.design = base; }, function () { if (W.deed === d) d.design = false; });
  }
  /** the plan of what a kind is about to build */
  function blueprint(d) {
    const W = G.W, r = d.result || {}, m = Math.min(W.ww, W.wh), sp = G.speciesById(d.sp), f = sp && sp.rep ? sp.rep.f : null;
    let spiky = 0; if (f) { (f.rules || []).forEach(function (q) { if (q.k === 2 || q.k === 7) spiky = 1; }); if (f.crest > 0.25) spiky = 1; }
    let h = 0, n = 0; for (let i = 0; i < W.cre.length; i++) if (W.cre[i].sp === d.sp) { h += W.cre[i].g.h; n++; }
    const o = { seed: (G.hash ? G.hash(String(d.title) + d.id) : d.id * 7919) >>> 0, type: r.house ? 'house' : r.solid ? 'wall' : r.feed > 0.05 ? 'huts' : r.pull > 0.15 ? 'spire' : 'hall', S: r.house ? clamp((r.size || 0.04) * m, 36, 58) : clamp((r.size || 0.08) * m, 55, 118), hue: d.hue || 50, spiky: spiky, brain: clamp((n ? h / n : 0) / 7, 0, 1) };
    o.P = plan(o); settle(o, true); return o;      // (the fallback shape: used when the kind's own design cannot be had)
  }
  G.blueprintPack = function (bp) { return bp.designed ? { about: bp.about || '', P: bp.P.map(function (p) { return [p.s, Math.round(p.x), Math.round(p.y), Math.round(p.w), Math.round(p.h), p.m, p.c[0], p.c[1], p.c[2], p.rr || 0]; }) } : null; };
  G.blueprintUnpack = function (bp, pk, states) { if (!pk || !Array.isArray(pk.P)) return bp; const ok = ['rect', 'tri', 'dome', 'circ', 'door', 'beam', 'wing', 'lamp', 'flag']; const P = pk.P.slice(0, 60).filter(function (q) { return Array.isArray(q) && ok.indexOf(q[0]) >= 0; }).map(function (q, i) { return { s: q[0], x: clamp(+q[1] || 0, -400, 400), y: clamp(+q[2] || 0, -600, 0), w: clamp(+q[3] || 10, 2, 500), h: clamp(+q[4] || 10, 2, 400), m: clamp(q[5] | 0, 0, 2), c: [+q[6] || 0, clamp(+q[7] || 50, 0, 100), clamp(+q[8] || 50, 0, 100)], rr: +q[9] || 0, st: clamp(+String(states || '').charAt(i) || 0, 0, 2) }; }); if (P.length >= 4) { bp.P = P; bp.dep = null; bp.designed = true; bp.about = String(pk.about || '').replace(/[<>]/g, '').slice(0, 120); } return bp; };
  G.blueprintFrom = function (o, states) { const bp = { seed: o.seed, type: o.type, S: o.S, hue: o.hue, spiky: o.spiky, brain: o.brain }; bp.P = plan(bp); settle(bp, true); if (typeof states === 'string') for (let i = 0; i < bp.P.length; i++) bp.P[i].st = clamp(+states.charAt(i) || 0, 0, 2); return bp; };
  // what the creatures build is drawn by the game, so no picture is asked of the AI for it
  if (G.figureFor) { const f0 = G.figureFor; G.figureFor = function (info, typed) { if (info && /Built by small pond creatures/.test(String(info.note || ''))) return Promise.resolve(null); return f0(info, typed); }; }

  // ── the work of building ──
  const baseOf = function (o) { return [o.x, o.y + (o.bp ? o.bp.S * 0.45 : 30)]; };
  function buildStep(W, d, dt) {
    if (!d.bp) {
      if (d.design === undefined) askDesign(W, d);
      if (d.design === null && Date.now() - (d.designAt || (d.designAt = Date.now())) < 30000) {      /* (by the clock on the wall: the answer takes a few seconds however fast the pond runs) */ d.t = Math.min(d.t, 0.5); d.wait = 'plan'; d.progress = 0; return; }      /* they are working out what it shall look like */
      d.bp = d.design || blueprint(d); site(W, d);
      if (d.noRoom) { d.bp = null; d.design = false; d.result = null; d.t = d.steps[d.i].secs; return; }      /* nowhere left to build without standing on another: they give it up */
    }
    const bp = d.bp, P = bp.P, base = baseOf(d), M = []; for (let i = 0; i < W.cre.length; i++) if (W.cre[i].deedId === d.id && !W.cre[i].dead) M.push(W.cre[i]);
    if (!bp.dep) settle(bp, false);
    if (!d.pile) { d.pile = [0, 0, 0]; d.t0 = W.t; d.idle = 0; d.work = 0; d.hauled = 0; }
    const hw = bp.hw || (bp.hw = halfW(bp)), pileAt = [clamp(base[0] + hw + 44, 30, W.ww - 30), base[1] + 6], sy = G.shoreY ? G.shoreY(W) : 0;
    d.wait = '';
    // any of the kind whose own brain says HELP (action 6) and who is near joins the work
    d.helpT = (d.helpT || 0) - dt; if (d.helpT <= 0 && M.length < 22) { d.helpT = 1; for (let k = 0; k < 8; k++) { const c = W.cre[(G.rand() * W.cre.length) | 0]; if (c.dead || c.deedId || c.sp !== d.sp || !(c.out[6] > 0.55) || Math.hypot(c.x - d.x, c.y - d.y) > 700) continue; c.deedId = d.id; c.deedJ = M.length; c.helper = true; M.push(c); d.helpers = (d.helpers || 0) + 1; G.emit('joined-build', c, d); } }
    // HOW THE WORK IS SHARED. Nobody is told what to do; each free builder looks at how the work stands and takes what is most wanted:
    //   · HAULERS go out for material and bring it to a pile beside the site (the nearest of a sort still wanted, and only what they can reach);
    //   · SETTERS take from the pile and set the pieces, and a piece can only be set once what it rests on is in place, so it rises in order;
    //   · when every piece is set, all hands colour it.
    // There are never more setters than there is material and room for (about a third of the band); the rest haul. No more is fetched than is still needed.
    const busyP = {}, busyM = new Set(), transit = [0, 0, 0]; let setters = 0, held = 0;
    M.forEach(function (c) { const j = c.bj && c.bj.d === d.id ? c.bj : null; if (!j) return; if (j.ph === 'fetch') { if (W.mats.indexOf(j.mat) < 0) { c.bj = null; return; } busyM.add(j.mat); transit[j.mat.k]++; } else if (j.ph === 'carry') transit[j.k]++; else if (j.ph === 'take' || j.ph === 'bring') { if (P[j.p].st > 0) { if (j.ph === 'bring') d.pile[j.k]++; c.bj = null; return; } busyP[j.p] = 1; setters++; if (j.ph === 'take') held++; } else if (j.ph === 'paint') { if (P[j.p].st > 1) { c.bj = null; return; } busyP[j.p] = 1; } });
    const unset = [0, 0, 0]; let nUnset = 0; for (let i = 0; i < P.length; i++) if (P[i].st === 0) { unset[P[i].m]++; nUnset++; }
    let inPile = d.pile[0] + d.pile[1] + d.pile[2] - held; const maxSet = Math.max(2, Math.ceil(M.length / 3));
    d.sizeT = (d.sizeT || 0) - dt; if (d.sizeT <= 0) { d.sizeT = 1.5; let toPaint = 0; for (let i = 0; i < P.length; i++) if (P[i].st < 2) toPaint++; const want = clamp(Math.ceil((nUnset * 1.6 + toPaint * 0.5) / 2) + 1, 2, P.length <= 4 ? 2 : 14);      /* (a little house of three or four pieces goes up one piece on another: two hands are all it can use) */ for (let k = M.length - 1; k >= 0 && M.length > Math.max(P.length < 9 ? 2 : 5, want); k--) { const c = M[k]; if (c.bj || !(c.idleT > (P.length < 9 ? 2.5 : 7))) continue; c.deedId = 0; c.idleT = 0; c.haul = -1; M.splice(k, 1); d.sent = (d.sent || 0) + 1; } d.n0 = Math.max(2, Math.min(d.n0, Math.max(want, M.length))); }      /* no more hands than the work needs: the others go back to feeding */
    const ready = function (i) { const dp = bp.dep[i]; for (let q = 0; q < dp.length; q++) if (P[dp[q]].st === 0) return false; return true; };
    for (let k = 0; k < M.length; k++) {
      const c = M[k]; let j = c.bj && c.bj.d === d.id ? c.bj : null;
      if (!j) {
        if (nUnset > 0) {
          if (inPile > 0 && setters < maxSet) { let pi = -1, alt = -1; for (let i = 0; i < P.length; i++) { if (P[i].st !== 0 || busyP[i] || !ready(i)) continue; if (d.pile[P[i].m] > 0) { pi = i; break; } if (alt < 0) alt = i; } if (pi < 0) pi = alt; if (pi >= 0) { j = { d: d.id, ph: 'take', p: pi }; busyP[pi] = 1; setters++; inPile--; } }
          if (!j && nUnset - (d.pile[0] + d.pile[1] + d.pile[2]) - (transit[0] + transit[1] + transit[2]) > 0) {
            let best = null, bd = 1e12, any = null, ad = 1e12; for (let i = 0; i < W.mats.length; i++) { const q = W.mats[i]; if (busyM.has(q) || (!c.ph.lungs && q.y < sy + 6)) continue; const dd = (q.x - c.x) * (q.x - c.x) + (q.y - c.y) * (q.y - c.y) + (q.x - pileAt[0]) * (q.x - pileAt[0]) + (q.y - pileAt[1]) * (q.y - pileAt[1]); if (dd < ad) { ad = dd; any = q; } if (unset[q.k] - d.pile[q.k] - transit[q.k] > 0 && dd < bd) { bd = dd; best = q; } }      /* the shortest whole trip: there and back to the pile */
            const mat = best || any; if (mat) { j = { d: d.id, ph: 'fetch', mat: mat }; busyM.add(mat); transit[mat.k]++; } else d.wait = MAT[unset[0] ? 0 : unset[1] ? 1 : 2].id;
          }
        } else { let pi = -1; for (let i = 0; i < P.length; i++) if (P[i].st === 1 && !busyP[i]) { pi = i; break; } if (pi >= 0) { j = { d: d.id, ph: 'paint', p: pi, t: 0 }; busyP[pi] = 1; } }
        c.bj = j;
      }
      c.carry = false; c.haul = j && (j.ph === 'carry' || j.ph === 'bring') ? j.k : -1;
      if (j) c.idleT = 0; else c.idleT = (c.idleT || 0) + dt;
      if (!j) { d.idle += dt; const dx = pileAt[0] - 60 - (k % 5) * 16 - c.x, dy = pileAt[1] + 40 + (k % 3) * 14 - c.y, dist = Math.hypot(dx, dy) || 1, sp = Math.min(c.ph.speed, dist), k2 = Math.min(1, dt * 4); c.vx += (dx / dist * sp - c.vx) * k2; c.vy += (dy / dist * sp - c.vy) * k2; continue; }      // nothing for it just now: it waits by the pile
      d.work += dt;
      const pc = j.p >= 0 ? P[j.p] : null;
      const tx = j.ph === 'fetch' ? j.mat.x : j.ph === 'carry' || j.ph === 'take' ? pileAt[0] : base[0] + pc.x + (c.id % 2 ? 1 : -1) * (pc.w * 0.5 + c.ph.r + 6), ty = j.ph === 'fetch' ? j.mat.y : j.ph === 'carry' || j.ph === 'take' ? pileAt[1] : base[1] + Math.min(0, pc.y * 0.25) + 4;
      const dx = tx - c.x, dy = ty - c.y, dist = Math.hypot(dx, dy) || 1, grip = c.ph.hands || c.ph.limbs > 0 ? 0.8 : 0.5, sp = Math.min(c.ph.speed * 2.4 * (c.haul >= 0 ? grip : 1), dist * 2.4), k2 = Math.min(1, dt * 5);
      c.vx += (dx / dist * sp - c.vx) * k2; c.vy += (dy / dist * sp - c.vy) * k2; if (dist > 8) c.ang = Math.atan2(dy, dx);
      if (j.ph === 'fetch' && dist < c.ph.r + 12) { const q = W.mats.indexOf(j.mat); if (q >= 0) W.mats.splice(q, 1); j.k = j.mat.k; j.mat = null; j.ph = 'carry'; }
      else if (j.ph === 'carry' && (dist < 34 || (j.bt = (j.bt || 0) + dt) > 20)) { d.hauled++; if (G.learn) G.learn(c, 0.2);
        let pi = -1; if (setters < maxSet) for (let i = 0; i < P.length; i++) { if (P[i].st !== 0 || busyP[i] || !ready(i)) continue; if (P[i].m === j.k) { pi = i; break; } if (pi < 0) pi = i; }
        if (pi >= 0) { j.ph = 'bring'; j.p = pi; j.bt = 0; busyP[pi] = 1; setters++; }      /* a piece is waiting for just this: it goes straight up, without being put down */
        else { d.pile[j.k]++; c.bj = null; c.haul = -1; G.emit('build-drop', d, c); } }
      else if (j.ph === 'take' && dist < 34) { const k0 = d.pile[pc.m] > 0 ? pc.m : d.pile[0] > 0 ? 0 : d.pile[1] > 0 ? 1 : d.pile[2] > 0 ? 2 : -1; if (k0 < 0) { c.bj = null; } else { d.pile[k0]--; j.k = k0; j.ph = 'bring'; } }
      else if (j.ph === 'bring' && (dist < 46 || (j.bt = (j.bt || 0) + dt) > 14)) { pc.st = 1; pc.um = j.k; pc.t0 = W.t; c.bj = null; c.haul = -1; d.placed = (d.placed || 0) + 1; if (G.learn) G.learn(c, 0.35); G.emit('build-piece', d, pc, c); }
      else if (j.ph === 'paint' && dist < 50) { j.t += dt; c.vx *= 0.6; c.vy *= 0.6; if (j.t > 0.7) { pc.st = 2; pc.t0 = W.t; c.bj = null; G.emit('build-piece', d, pc, c); } }
    }
    const n = count(bp); d.progress = (n[0] + n[1]) / (2 * n[2]);
    // the plan gives the building so long; they are given as long again and more to finish what they began; and when it is done, it is done
    const st = d.steps[d.i];
    if (d.progress >= 1) { d.t = Math.max(d.t, st.secs); d.built = { secs: Math.round(W.t - d.t0), idle: +(d.idle / Math.max(1, d.idle + d.work)).toFixed(2), hauled: d.hauled, hands: M.length }; for (let k = 0; k < 3; k++) for (let q = 0; q < d.pile[k]; q++) W.mats.push({ x: pileAt[0] + (G.rand() - 0.5) * 60, y: pileAt[1] + (G.rand() - 0.5) * 30, k: k, s: G.rand() }); d.pile = [0, 0, 0]; }
    else if (d.t > st.secs - 1 && (d.over = (d.over || 0) + dt) < st.secs * 3 + 60) d.t = st.secs - 1;
  }
  /** What rests on what. A piece stands on the ground, or on a piece under it, or is fixed to the face of a piece it lies within (a door, a window). With
   *  `fix`, a piece that rests on nothing is let down until it does: a builder's plain sense, applied to a design that forgot it. */
  function settle(bp, fix) {
    if (bp.type === 'wall' && !bp.designed) { bp.dep = bp.P.map(function () { return []; }); bp.loose = 0; bp.hw = halfW(bp); return bp; }      /* (the ring of posts is drawn in depth, far side first: its pieces all stand on the ground) */
    const P = bp.P, S = bp.S, tol = S * 0.09, foot = function (p) { return p.s === 'lamp' ? -p.y - p.w / 2 : -p.y; }, top = function (p) { return p.s === 'lamp' ? -p.y + p.w / 2 : -p.y + p.h; };
    const over = function (a, b) { return Math.min(a.x + a.w / 2, b.x + b.w / 2) - Math.max(a.x - a.w / 2, b.x - b.w / 2); };
    const order = P.map(function (p, i) { return i; }).sort(function (a, b) { return foot(P[a]) - foot(P[b]) || a - b; }), done = []; bp.dep = P.map(function () { return []; }); let moved = 0, loose = 0;
    for (let q = 0; q < order.length; q++) { const i = order[q], p = P[i], fy = foot(p); let dep = [];
      if (fy > tol) {
        for (let k = 0; k < done.length; k++) { const j = done[k], o = P[j]; if (Math.abs(top(o) - fy) <= tol && over(p, o) > Math.min(p.w, o.w) * 0.15) dep.push(j); }
        if (!dep.length) for (let k = 0; k < done.length; k++) { const j = done[k], o = P[j]; if (Math.abs(p.x - o.x) < o.w / 2 && fy >= foot(o) - tol && fy < top(o) && (o.s === 'rect' || o.s === 'dome')) { dep.push(j); break; } }      /* fixed to the face of the piece it lies within */
        if (!dep.length) { loose++; if (fix) { let best = -1, bt = 0; for (let k = 0; k < done.length; k++) { const j = done[k], o = P[j]; if (over(p, o) > Math.min(p.w, o.w) * 0.15 && top(o) <= fy + tol && top(o) > bt) { bt = top(o); best = j; } } const drop = fy - bt; p.y += drop; moved++; if (best >= 0) dep.push(best); } }
      }
      bp.dep[i] = dep; done.push(i); }
    bp.loose = fix ? 0 : loose; bp.letDown = moved; bp.top = undefined; bp.hw = halfW(bp);
    return bp;
  }
  /** how a design measures up, for the tests and for anyone curious: pieces resting on nothing, left-right balance (0 to 1), width and height in building units */
  G.designCheck = function (bp) {
    if (!bp.dep) settle(bp, false); const P = bp.P, S = bp.S; let area = 0, matched = 0;
    for (let i = 0; i < P.length; i++) { const p = P[i], a = p.w * p.h; area += a; if (Math.abs(p.x) < p.w * 0.25 + S * 0.04) { matched += a; continue; } for (let j = 0; j < P.length; j++) { const o = P[j]; if (j !== i && o.s === p.s && Math.abs(o.x + p.x) < S * 0.12 && Math.abs(o.y - p.y) < S * 0.12 && Math.abs(o.w - p.w) < S * 0.12) { matched += a; break; } } }
    return { pieces: P.length, loose: bp.loose || 0, letDown: bp.letDown || 0, balance: area ? +(matched / area).toFixed(2) : 0, width: +(2 * (bp.hw || halfW(bp)) / S).toFixed(2), height: +((bp.top === undefined ? (halfW(bp), bp.top) : bp.top) / S).toFixed(2) };
  };
  G.designSettle = function (bp) { return settle(bp, true); };
  // what stands: kept up while its builders' kind lives, crumbling when it is gone or when nature strikes it down
  function worksStep(W, dt) {
    const Wk = W.works; if (!Wk || !Wk.length) return;
    for (let i = Wk.length - 1; i >= 0; i--) {
      const w = Wk[i]; if (!w.bp) continue;
      w.until = W.t + 9999;      // it does not run out by the clock
      w.upT = (w.upT || 0) - dt; if (w.upT > 0) continue; w.upT = w.fall ? 0.12 : 5;
      let kin = 0; for (let k = 0; k < W.cre.length; k++) if (W.cre[k].sp === w.sp && !W.cre[k].dead) kin++;
      const P = w.bp.P;
      // other kinds: a fierce band of strangers at a building that its own kind is not there to hold knocks it about and takes what they find
      { let foes = 0, mine = 0, who = 0; const S = w.bp.S; for (let k = 0; k < W.cre.length; k++) { const c = W.cre[k]; if (c.dead) continue; const dd = Math.hypot(c.x - w.x, c.y - w.y); if (c.sp === w.sp) { if (dd < S * 2.4) mine++; } else if (dd < S * 1.6 && (c.ph.aggro || 0) > 0.38) { foes++; who = c.sp; c.E = Math.min(c.ph.Emax, c.E + 2); } }
        if (foes >= 4 && foes > mine + 1 && !w.fall && (w.raidT = (w.raidT || 0) + 1) % 2 === 0) { for (let k = P.length - 1; k >= 0; k--) if (P[k].st > 0) { P[k].st = 0; G.emit('build-fall', w, P[k]); break; } const sp = G.speciesById(who); w.hitBy = 'A band of ' + (sp ? sp.name : 'strangers'); w.hitGen = W.gen; w.dmg = 1; if (!w.raided && G.mode === 'play' && G.log) { w.raided = true; G.log('sel', w.name + ' is raided', w.hitBy + ' is knocking it about while its builders are away.'); } continue; } }
      if (w.shun && !w.fall) { w.shunT = (w.shunT || 0) + 1; if (w.shunT % 3 === 0) { for (let k = P.length - 1; k >= 0; k--) if (P[k].st > 0) { P[k].st = 0; G.emit('build-fall', w, P[k]); break; } } if (count(w.bp)[0] === 0) { Wk.splice(i, 1); G.emit('work-gone', w, 'shunned'); } continue; }      /* the one the watcher found spoils the place is left to fall */
      if (kin < 3) { let heir = null; for (let k = 0; k < W.species.length; k++) { const s = W.species[k]; if (!s.extinct && s.n >= 3 && s.parent === w.sp && (!heir || s.n > heir.n)) heir = s; }      /* the builders' kind has changed or gone: their descendants keep it; failing them, whoever lives round it */
        if (!heir) { const near = {}; for (let k = 0; k < W.cre.length; k++) { const c = W.cre[k]; if (!c.dead && c.sp && Math.hypot(c.x - w.x, c.y - w.y) < w.bp.S * 3.2) near[c.sp] = (near[c.sp] || 0) + 1; } let b = 0; for (const id in near) if (near[id] >= 3 && near[id] > b) { b = near[id]; heir = G.speciesById(+id); } }
        if (heir) { w.sp = heir.id; w.keptBy = heir.name; kin = heir.n; } }
      w.lone = kin < 3 ? (w.lone || 0) + 1 : 0;      /* (kinds are sorted afresh each autumn: a short gap in the count is not the end of them) */
      if (w.fall || (w.lone > 24 && w.lone % 3 === 0)) { let top = -1; for (let k = P.length - 1; k >= 0; k--) if (P[k].st > 0) { top = k; break; } if (top >= 0) { P[top].st = 0; G.emit('build-fall', w, P[top]); if (!w.fall && !w.ruin) { w.ruin = true; G.emit('work-ruin', w); } } }
      else if (!(w.dmg > 0 && W.gen === w.hitGen)) { for (let k = 0; k < P.length; k++) if (P[k].st < 2) { P[k].st++; P[k].t0 = W.t; break; } }      // its keepers mend and colour it
      const n = count(w.bp);
      if (n[0] === 0) { Wk.splice(i, 1); G.emit('work-gone', w, w.fall ? 'struck down' : w.hitBy ? 'attacked' : 'abandoned'); continue; }
      const F = W.fields || []; for (let k = 0; k < F.length; k++) if (F[k].id === w.field || (!w.field && F[k].name === w.name)) { w.field = F[k].id; F[k].hidden = true; if (n[0] >= n[2] * 0.6 && !w.fall) F[k].life = Math.max(F[k].life, 30); else F[k].life = Math.min(F[k].life, 6); }      // it does what it was built for while most of it stands
    }
  }
  // ── home ──
  // A house is lived in. A creature that is growing tired, with a house of its own kind not far off, goes to it; asleep at its door it is sheltered: it
  // rests twice as fast and, being out of the open, keeps a little more of its strength. So a kind with houses is seen coming home, and the houses matter.
  function homeStep(W, dt) {
    const H = []; for (let i = 0; i < W.works.length; i++) { const w = W.works[i]; if (w.bp && w.bp.type === 'house' && !w.fall) { w.inN = 0; H.push(w); } } if (!H.length) return;
    for (let i = 0; i < W.cre.length; i++) { const c = W.cre[i]; if (c.dead || c.deedId || !(c.asleep || c.tired > 0.4)) { c.atHome = 0; continue; }
      let best = null, bd = 800; for (let k = 0; k < H.length; k++) { const w = H[k]; if (w.sp !== c.sp || w.inN >= 5) continue; const dd = Math.hypot(w.x - c.x, w.y - c.y); if (dd < bd) { bd = dd; best = w; } } if (!best) { c.atHome = 0; continue; }
      const hw = best.bp.hw || 40, bx = best.x + ((c.id % 5) - 2) * hw * 0.3, by = best.y + best.bp.S * 0.45 + 6, dx = bx - c.x, dy = by - c.y, dist = Math.hypot(dx, dy) || 1;
      if (dist < hw + 26) { best.inN++; c.atHome = best.sp; if (c.asleep) { c.tired -= 0.085 * dt; c.E = Math.min(c.ph.Emax, c.E + 0.05 * dt); c.vx *= 0.8; c.vy *= 0.8; } else if (c.tired > 0.5) { c.asleep = true; W.stats.sleptHome = (W.stats.sleptHome || 0) + 1; } }
      else if (!c.asleep) { c.tired = Math.min(c.tired, 0.92); const sp = Math.min(c.ph.speed * 1.5, dist), k2 = Math.min(1, dt * 3); c.vx += (dx / dist * sp - c.vx) * k2; c.vy += (dy / dist * sp - c.vy) * k2; c.atHome = 0; }
    }
  }
  /** nature strikes a building down: it falls piece by piece */
  G.razeWork = function (w) { if (w && w.bp) { w.fall = true; w.upT = 0; } };
  if (G.on) {
    // when it stands, those of the kind who are near are glad: they are fed a little by it, it is a lesson worth keeping, and it shows
    G.on('deed-end', function (d, how, made) { const W = G.W; if (W && made && d.bp && how === 'done') for (let i = 0; i < W.cre.length; i++) { const c = W.cre[i]; if (c.dead || c.sp !== d.sp || Math.hypot(c.x - d.x, c.y - d.y) > 420) continue; c.E = Math.min(c.ph.Emax, c.E + 0.12 * c.ph.Emax); c.mend = 1; c.glad = 6; c.vy -= 60; if (G.learn) G.learn(c, 0.6); G.emit('glad', c); } });
    G.on('deed-end', function (d, how, made) { if (made && d.bp) { made.bp = d.bp; made.sp = d.sp; made.built = d.built || null; { const F = (G.W && G.W.fields) || []; for (let k = 0; k < F.length; k++) if (F[k].id === made.field) F[k].hidden = true; } made.until = (G.W ? G.W.t : 0) + 9999; } });
    G.on('new-pond', function () { if (G.W) G.W.mats = null; });
  }
  { const step0 = G.step; G.step = function (dt) { step0(dt); const W = G.W; if (!W || W.title) return; matsStep(W, dt); const d = W.deed; if (d && d.result && d.steps[d.i] && d.steps[d.i].do === 'build') buildStep(W, d, dt); worksStep(W, dt); if (W.works && W.works.length) homeStep(W, dt); }; }

  // ── a kind makes itself a home ──
  // Besides what a kind may take into its head (the plans the AI imagines for it), an established kind builds for itself, with nobody asked: the first thing is
  // a place of its own, and what it builds follows from how it is faring: hungry, it builds huts round a store; among fierce strangers or armed things, a
  // wall; otherwise a hall, and later a tower beside it. One more for every forty generations the kind has lasted, up to four. So a pond fills, slowly, with
  // what its creatures made, and each kind's quarter is its own. (It costs nothing: the plan of pieces is worked out by the game.)
  G.on('scored', function () {
    const W = G.W; if (!W || W.title || W.deed || G.mode !== 'play' || W.gen < 12 || (W.works || []).length >= 22 || G.rand() > 0.45) return;
    const kinds = W.species.filter(function (s) { return !s.extinct && s.n >= 10 && W.gen - s.born >= 6; }); if (!kinds.length) return;
    let fierce = 0, armed = 0; for (let i = 0; i < W.cre.length; i++) if ((W.cre[i].ph.aggro || 0) > 0.38) fierce++; for (let i = 0; i < W.zones.length; i++) if (W.zones[i].act && W.zones[i].foe) armed++;
    for (let k = 0; k < kinds.length; k++) { const s = kinds[(k + W.gen) % kinds.length], all = (W.works || []).filter(function (w) { return w.bp && w.sp === s.id; }), mine = all.filter(function (w) { return w.bp.type !== 'house'; }), houses = all.length - mine.length, may = Math.min(4, 1 + Math.floor((W.gen - s.born) / 40));
      const allH = (W.works || []).filter(function (w) { return w.bp && w.bp.type === 'house'; }).length, wantH = mine.length && allH < 8 ? Math.min(3, Math.floor(s.n / 9)) : 0;      /* a house for every nine or so of them, three at most to a kind, eight in the pond */ if (mine.length >= may && houses >= wantH) continue;
      let e = 0, n = 0, x = 0, y = 0, own = 0; for (let i = 0; i < W.cre.length; i++) { const c = W.cre[i]; if (c.sp !== s.id) continue; e += c.E / c.ph.Emax; x += c.x; y += c.y; n++; if ((c.ph.aggro || 0) > 0.38) own++; } if (n < 8) continue;
      const has = function (t) { return mine.some(function (w) { return w.bp.type === t; }); }, threatened = armed > 0 || fierce - own > W.cre.length * 0.3, hungry = e / n < 0.5;
      const type = houses < wantH && (mine.length >= may || houses < mine.length * 2) ? 'house' : !mine.length ? (hungry ? 'huts' : 'hall') : threatened && !has('wall') ? 'wall' : hungry && !has('huts') ? 'huts' : !has('spire') ? 'spire' : !has('huts') ? 'huts' : !has('hall') ? 'hall' : 'wall', nw = String(s.name).split(' '), first = nw.length >= 3 ? nw[nw.length - 2] : nw[0];      /* first a place of their own; then what they are short of */
      const name = first + ' ' + { wall: 'Ring', huts: 'Huts', hall: 'Hall', spire: 'Tower', house: 'House' }[type] + (type === 'house' && houses ? ' ' + (houses + 1) : ''), why = type === 'house' ? 'there are more of them than there are roofs' : type === 'wall' ? (armed ? 'something armed is loose in the pond' : 'fierce strangers are all about them') : type === 'huts' ? 'they are going hungry' : mine.length ? 'their place has room for more' : 'they have no place of their own';
      G.deedStart({ kind: s.name, title: name, say: '', what: 'build ' + (type === 'house' ? 'a house for a family, beside the others' : type === 'wall' ? 'a ring of posts to live inside' : type === 'huts' ? 'huts round a store of food' : type === 'hall' ? 'a hall to gather in' : 'a tower to be seen from afar'), why: why, share: 0.6, own: true,
        steps: [{ do: 'gather', secs: 5, cry: '' }, { do: 'build', secs: 34, cry: '' }], place: (function () { const L = G.leaderOf ? G.leaderOf(s.id) : null; return L ? { x: clamp(L.x / W.ww, 0.12, 0.88), y: clamp(L.y / W.wh, 0.3, 0.85) } : { x: clamp(x / n / W.ww, 0.12, 0.88), y: clamp(y / n / W.wh, 0.3, 0.85) }; })(),      /* where their leader is, if they have one; else in the midst of them */
        result: { name: name, looks: 'made of what lay about the pond', stuff: 'rock', shape: 'circle', size: type === 'house' ? 0.04 : 0.075, house: type === 'house', solid: type === 'wall', feed: type === 'huts' ? 0.25 : 0, slow: 0, hurt: 0, pull: type === 'spire' ? 0.22 : type === 'hall' ? 0.08 : 0, life: 240 } });
      return; }
  });
  // ── seen ──
  if (typeof document === 'undefined') return;
  // ── the pond as a place ──
  // Now and then (every thirty generations, and only once the pond holds two buildings or more) the watcher is shown the whole pond, drawn small, and says
  // how well it hangs together as a place and which building, if any, spoils it. That one is no longer kept up, and falls. So order is not laid down:
  // what looks right is what lasts. One look, about a third of a cent.
  function picture(W) {
    const cw = 720, k = cw / W.ww, ch = Math.round(W.wh * k), cv = document.createElement('canvas'); cv.width = cw; cv.height = ch; const x = cv.getContext('2d'), sy = G.shoreY ? G.shoreY(W) : 0;
    const g = x.createLinearGradient(0, 0, 0, ch); g.addColorStop(0, '#1d5a66'); g.addColorStop(1, '#0c2536'); x.fillStyle = g; x.fillRect(0, 0, cw, ch); x.fillStyle = '#7d8a55'; x.fillRect(0, 0, cw, sy * k);
    x.save(); x.scale(k, k); for (let i = 0; i < W.cre.length; i++) { const c = W.cre[i]; x.fillStyle = hsl(c.g.f ? c.g.f.hue : 200, 80, 68); x.beginPath(); x.arc(c.x, c.y, Math.max(5, c.ph.r * 0.8), 0, TAU); x.fill(); }
    const Wk = (W.works || []).filter(function (w) { return w.bp; }); Wk.forEach(function (w) { G.drawBlueprint(x, w, false); }); x.restore();
    x.font = '700 13px system-ui, sans-serif'; x.textAlign = 'center'; Wk.forEach(function (w, i) { const tx = w.x * k, ty = (w.y + w.bp.S * 0.45) * k + 12; x.fillStyle = 'rgba(0,0,0,0.7)'; x.beginPath(); x.arc(tx, ty, 9, 0, TAU); x.fill(); x.fillStyle = '#fff'; x.textBaseline = 'middle'; x.fillText(String(i + 1), tx, ty + 0.5); });      /* a small number under each: names would crowd the picture */
    try { return cv.toDataURL('image/jpeg', 0.8).split(',')[1] || null; } catch (e) { return null; }
  }
  let asking = false;
  G.placeLook = function (force) {
    const W = G.W; if (!W || W.title || asking || G.mode !== 'play') return false;
    const Wk = (W.works || []).filter(function (w) { return w.bp && !w.fall; }); if (Wk.length < 2 || (!force && W.gen - (W.placeGen === undefined ? -99 : W.placeGen) < 30)) return false;
    if (!(G.host && G.host.ready && G.host.caps && G.host.caps.ai && G.ai.provider === 'server') || !G.ai.allow('judge')) return false;
    const img = picture(W); if (!img) return false; asking = true; W.placeGen = W.gen;
    G.host.call('ai.judge', { image: img, mime: 'image/jpeg', place: 1, buildings: Wk.map(function (w, i) { return (i + 1) + ': ' + w.name; }), model: G.ai.model || undefined }, 60000).then(function (r) {
      asking = false; G.ai.tally('judge', r && r.source, r && r.usd); if (G.W !== W || !r || !r.place) return;
      const p = r.place; W.place = { order: clamp(+p.order || 0, 0, 1), why: String(p.why || '').replace(/[<>]/g, '').slice(0, 160), worst: String(p.worst || ''), gen: W.gen };
      const bad = W.place.order < 0.6 && W.place.worst ? Wk.filter(function (w, i) { return (i + 1) + ': ' + w.name === W.place.worst; })[0] : null; if (W.place.worst) W.place.worst = W.place.worst.replace(/^d+: /, ''); if (bad) bad.shun = true;
      if (G.log) G.log('disc', 'The pond as a place: ' + (W.place.order * 10).toFixed(0) + ' of 10', W.place.why + (bad ? ' ' + bad.name + ' spoils it: it will no longer be kept up.' : ''));
      if (G.note) G.note('The watcher looked at the whole pond', (W.place.order * 10).toFixed(0) + ' of 10 as a place. ' + W.place.why);
    }, function () { asking = false; });
    return true;
  };
  G.on('scored', function () { try { G.placeLook(false); } catch (e) { console.error(e); } });
  function piece(ctx, p, hue, t) {
    const age = t - (p.t0 || -9), pop = age < 0.3 ? 0.6 + 0.4 * (age / 0.3) + 0.15 * Math.sin(age * 10.5) : 1, mc = MAT[p.um === undefined ? p.m : p.um].col;
    const raw = hsl(mc[0], mc[1], mc[2]), fin = p.c[2] < 20 ? hsl(hue, 30, p.c[2]) : hsl(hue + p.c[0], p.c[1], p.c[2]), fill = p.st > 1 ? fin : raw, w = p.w * pop, h = p.h * pop;
    ctx.fillStyle = fill; ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.beginPath();
    if (p.s === 'rect') { G.roundRect(ctx, p.x - w / 2, p.y - h, w, h, Math.min(w, h) * (p.rr || 0.16)); }
    else if (p.s === 'tri') { ctx.moveTo(p.x - w / 2, p.y); ctx.lineTo(p.x, p.y - h); ctx.lineTo(p.x + w / 2, p.y); ctx.closePath(); }
    else if (p.s === 'dome') { ctx.moveTo(p.x - w / 2, p.y); ctx.ellipse(p.x, p.y, w / 2, h, 0, Math.PI, TAU); ctx.closePath(); }
    else if (p.s === 'circ') { ctx.arc(p.x, p.y - h / 2, w / 2, 0, TAU); }
    else if (p.s === 'door') { ctx.moveTo(p.x - w / 2, p.y); ctx.lineTo(p.x - w / 2, p.y - h + w / 2); ctx.arc(p.x, p.y - h + w / 2, w / 2, Math.PI, TAU); ctx.lineTo(p.x + w / 2, p.y); ctx.closePath(); }
    else if (p.s === 'beam') { G.roundRect(ctx, p.x - w / 2, p.y - h, w, h, Math.min(w, h) * 0.4); }
    else if (p.s === 'lamp') { if (p.st > 1) { const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, w * 3); g.addColorStop(0, hsl(hue + 50, 95, 75, 0.5 + 0.2 * Math.sin(t * 3))); g.addColorStop(1, hsl(hue + 50, 95, 75, 0)); ctx.fillStyle = g; ctx.arc(p.x, p.y, w * 3, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.fillStyle = fill; } ctx.arc(p.x, p.y, w / 2, 0, TAU); }
    else if (p.s === 'wing') { const dd = p.x < 0 ? -1 : 1; ctx.moveTo(p.x - dd * w / 2, p.y); ctx.lineTo(p.x + dd * w / 2, p.y - h * 0.25); ctx.lineTo(p.x - dd * w / 2, p.y - h); ctx.closePath(); }
    else if (p.s === 'flag') { ctx.moveTo(p.x, p.y); ctx.lineTo(p.x, p.y - h); ctx.stroke(); ctx.beginPath(); const fl = Math.sin(t * 5 + p.x) * w * 0.12; ctx.moveTo(p.x, p.y - h); ctx.lineTo(p.x + w + fl, p.y - h + w * 0.3); ctx.lineTo(p.x, p.y - h + w * 0.6); ctx.closePath(); }
    ctx.fill(); ctx.stroke();
    if (p.st > 1 && (p.s === 'rect' || p.s === 'dome') && w > 14) { ctx.fillStyle = 'rgba(255,255,255,0.13)'; ctx.beginPath(); if (p.s === 'rect') ctx.rect(p.x - w / 2 + 2.5, p.y - h + 2.5, w * 0.3, h - 5); else ctx.ellipse(p.x - w * 0.16, p.y - h * 0.5, w * 0.12, h * 0.3, 0, 0, TAU); ctx.fill(); }
  }
  /** a building (being raised, or standing): the ground it stands on, and every piece that is there */
  G.drawBlueprint = function (ctx, o, building) {
    const bp = o.bp; if (!bp) return; const b = baseOf(o), t = G.W.t, P = bp.P, S = bp.S;
    ctx.save(); ctx.translate(b[0], b[1]);
    { const hw = bp.hw || (bp.hw = halfW(bp)), ring = bp.type === 'wall' && !bp.designed; ctx.fillStyle = 'rgba(8,16,26,0.28)'; ctx.beginPath(); ctx.ellipse(0, S * 0.1, ring ? S * 1.25 : hw * 1.12, ring ? S * 0.74 : Math.max(10, hw * 0.2), 0, 0, TAU); ctx.fill(); }
    if (building) { ctx.setLineDash([4, 5]); ctx.lineWidth = 1.2; ctx.strokeStyle = hsl(bp.hue, 70, 78, 0.4); for (let i = 0; i < P.length; i++) if (P[i].st === 0) { const p = P[i]; ctx.beginPath(); if (p.s === 'circ' || p.s === 'lamp') ctx.arc(p.x, p.y - (p.s === 'circ' ? p.h / 2 : 0), p.w / 2, 0, TAU); else ctx.rect(p.x - p.w / 2, p.y - p.h, p.w, p.h); ctx.stroke(); } ctx.setLineDash([]); }      // where the pieces still to come will go
    for (let i = 0; i < P.length; i++) if (P[i].st > 0) piece(ctx, P[i], bp.hue, t);
    ctx.restore();
    if (building && o.pile) { const hw = bp.hw || 60, px = clamp(b[0] + hw + 44, 30, G.W.ww - 30), py = b[1] + 6; let n = 0; for (let k = 0; k < 3; k++) for (let q = 0; q < Math.min(6, o.pile[k]); q++) { matDraw(ctx, { x: px + ((n % 4) - 1.5) * 9, y: py - Math.floor(n / 4) * 7, k: k, s: (n * 0.37) % 1 }, 0); n++; } }      // what has been brought, waiting to be set
  };
  function matDraw(ctx, q, t) {
    const c = MAT[q.k].col; ctx.strokeStyle = INK; ctx.lineWidth = 1.3;
    if (q.k === 0) { ctx.fillStyle = hsl(c[0], c[1], c[2] - 8 + 16 * q.s); ctx.beginPath(); ctx.ellipse(q.x, q.y, 6.5 + 2 * q.s, 4.6 + 1.5 * q.s, q.s * 3, 0, TAU); ctx.fill(); ctx.stroke(); }
    else if (q.k === 1) { ctx.strokeStyle = hsl(c[0], c[1] + 10, c[2] - 14); ctx.lineWidth = 2; ctx.lineCap = 'round'; for (let k = -1; k <= 1; k++) { const sw = Math.sin(t * 1.3 + q.s * 9 + k) * 1.8; ctx.beginPath(); ctx.moveTo(q.x + k * 3, q.y + 6); ctx.quadraticCurveTo(q.x + k * 3.5, q.y - 3, q.x + k * 5 + sw, q.y - 10 - 3 * q.s); ctx.stroke(); } }
    else { ctx.fillStyle = hsl(c[0], c[1], c[2]); ctx.beginPath(); ctx.arc(q.x, q.y, 5.5, Math.PI, TAU); ctx.lineTo(q.x - 5.5, q.y); ctx.fill(); ctx.stroke(); ctx.beginPath(); for (let k = -1; k <= 1; k++) { ctx.moveTo(q.x, q.y); ctx.lineTo(q.x + k * 3.4, q.y - 4.6); } ctx.stroke(); }
  }
  // the materials lie under everything else that is drawn in the water; what a builder hauls rides above its head
  { const f0 = G.drawFields; G.drawFields = function (ctx) {
      const W = G.W;
      if (W && W.works && W.fields) for (let i = 0; i < W.works.length; i++) { const w = W.works[i]; if (!w.bp) continue; for (let k = 0; k < W.fields.length; k++) if (W.fields[k].id === w.field || W.fields[k].name === w.name) W.fields[k].hidden = true; }      /* a building is drawn as itself: the patch of water that carries what it does is not drawn as well */
      if (W && !W.title && W.mats && G.mode === 'play') { const v = G.view, s = v.scale * v.dpr; if (v.scale > 0.22) { const x0 = -v.ox / v.scale - 20, y0 = -v.oy / v.scale - 20, x1 = x0 + v.w / v.scale + 40, y1 = y0 + v.h / v.scale + 40, t = G.rt || 0; ctx.save(); ctx.setTransform(s, 0, 0, s, v.ox * v.dpr, v.oy * v.dpr); for (let i = 0; i < W.mats.length; i++) { const q = W.mats[i]; if (q.x > x0 && q.x < x1 && q.y > y0 && q.y < y1) matDraw(ctx, q, t); } ctx.restore(); } }
      if (f0) f0(ctx);
    }; }
  G.drawHauls = function (ctx) { const W = G.W, d = W && W.deed; if (!d) return; const t = G.rt || 0; for (let i = 0; i < W.cre.length; i++) { const c = W.cre[i]; if (c.deedId !== d.id || !(c.haul >= 0) || c.dead) continue; matDraw(ctx, { x: c.x, y: c.y - c.ph.r * 2.9 - 5 + Math.sin(t * 7 + c.id) * 1.2, k: c.haul, s: (c.id % 10) / 10 }, t); } };
})();
