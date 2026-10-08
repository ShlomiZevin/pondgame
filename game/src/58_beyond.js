// ── Beyond the pond: open space, and other ponds in it ──
// The pond is one pool of water in a dark that has no end. Zoom out as far as you like and drag wherever you like: stars, drifting clouds of colour,
// and, here and there, other ponds. For now those are PLACEHOLDERS (a name, a look and a few kinds of creature, made up from where they lie): one
// day each will be somebody else's living pond, and this is the road by which a player will go and visit it. A click on one flies you to it and
// says so; a button, there whenever your own pond is out of sight, flies you home.
// Your pond has its fixed place in that space: when it grows it grows where it is, and nothing else moves.
// Nothing here changes the pond or the camera code itself: this file paints what is outside the pond's edge, LAST of all (so the pond's own weather,
// tints and bubbles stay in the pond), and widens how far the camera may zoom out and wander while a pond is played (the title screen keeps the old limits).
(function () {
  'use strict';
  G.drawBeyond = function () {};          // (the pond's renderer still calls this, before the creatures: there is nothing to draw at that point any more)
  if (typeof document === 'undefined') return;
  const TAU = 6.2832, clamp = G.clamp, ZMIN = 0.02, SPACE = '5,8,18';
  let pulse = 0;          // 1 just after the pond grew, fading: its edge glows for a moment
  G.on('pond-grew', function () { pulse = 1; });

  // ── the camera may go out there ──
  const apply0 = G.applyCam, zoom0 = G.zoomAt;
  const free = function () { return G.mode === 'play' && G.W && !G.W.title; };
  G.applyCam = function () {
    if (!free()) return apply0();
    const v = G.view, c = G.cam, far = Math.max(v.ww, v.wh) * 400;
    c.z = clamp(c.z, ZMIN, 6);
    v.scale = v.base * c.z;
    c.x = clamp(c.x, -far, far); c.y = clamp(c.y, -far, far);
    const hw = v.w / 2 / v.scale, hh = v.h / 2 / v.scale;
    c.away = Math.abs(c.x - v.ww / 2) > Math.max(hw, v.ww / 2) * 0.6 + 1 || Math.abs(c.y - v.wh / 2) > Math.max(hh, v.wh / 2) * 0.6 + 1;
    v.ox = v.w / 2 - c.x * v.scale; v.oy = v.h / 2 - c.y * v.scale;
  };
  G.zoomAt = function (factor, sx, sy) {
    if (!free()) return zoom0(factor, sx, sy);
    const v = G.view, c = G.cam;
    if (sx === undefined) { sx = v.w / 2; sy = v.h / 2; }
    const wx = (sx - v.ox) / v.scale, wy = (sy - v.oy) / v.scale;
    c.z = clamp(c.z * factor, ZMIN, 6);
    const s = v.base * c.z;
    c.x = wx - (sx - v.w / 2) / s; c.y = wy - (sy - v.h / 2) / s;
    G.applyCam();
  };
  /** fly the camera to a place, smoothly (zoom changes evenly to the eye) */
  let fly = null;
  G.flyTo = function (x, y, z, secs) { const c = G.cam; fly = { x0: c.x, y0: c.y, z0: c.z, x1: x, y1: y, z1: z, t: 0, T: secs || 0.9 }; };
  function flyStep(dt) {
    if (!fly) return;
    fly.t += dt; const u = Math.min(1, fly.t / fly.T), e = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2, c = G.cam;
    c.z = Math.exp(Math.log(fly.z0) + (Math.log(fly.z1) - Math.log(fly.z0)) * e);
    c.x = fly.x0 + (fly.x1 - fly.x0) * e; c.y = fly.y0 + (fly.y1 - fly.y0) * e;
    G.applyCam();
    if (u >= 1) fly = null;
  }
  G.goHome = function () { const v = G.view; G.flyTo(v.ww / 2, v.wh / 2, 1, 1.0); hideCard(); };

  // ── what lies out there: made from where it lies, so it is the same every time you come back, and never runs out ──
  const hash = function (i, j, k) { let h = (i * 374761393 + j * 668265263 + k * 2147483647) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; h ^= h >>> 16; return (h >>> 0) / 4294967296; };
  const A1 = ['Lu', 'Mar', 'Vey', 'Tor', 'Ash', 'Nim', 'Oro', 'Sel', 'Kai', 'Bre', 'Dun', 'Ila', 'Quo', 'Zet', 'Wyn', 'Thal', 'Eri', 'Mo', 'Pell', 'Yar'], A2 = ['a', 'e', 'i', 'o', 'u', 'an', 'el', 'or', 'is', ''], A3 = ['mere', 'pool', 'deep', 'water', 'hollow', 'tarn', 'well', 'glass', 'shallows', 'reach'];
  const nameOf = function (i, j) { return A1[(hash(i, j, 11) * A1.length) | 0] + A2[(hash(i, j, 12) * A2.length) | 0] + ' ' + A3[(hash(i, j, 13) * A3.length) | 0].replace(/^./, function (m) { return m.toUpperCase(); }); };
  /** the pond's place does not depend on how big it has grown: space is measured in ponds as they are at the start */
  const unit = function () { const v = G.view; return Math.max(v.ww, v.wh) / (v.grow || 1); };
  const cellSize = function () { return unit() * 8; };
  /** the far pond of one cell of space, or null (the cell is empty, or it is ours) */
  function farPond(i, j, cs, cx, cy) {
    if (!i && !j) return null;
    if (hash(i, j, 1) > 0.5) return null;
    return { i: i, j: j, x: cx + (i + (hash(i, j, 2) - 0.5) * 0.5) * cs, y: cy + (j + (hash(i, j, 3) - 0.5) * 0.5) * cs, r: cs * (0.07 + 0.05 * hash(i, j, 4)), hue: (150 + hash(i, j, 5) * 170) % 360, name: nameOf(i, j), kinds: 2 + ((hash(i, j, 6) * 3) | 0), rings: hash(i, j, 7) < 0.45, moons: (hash(i, j, 8) * 3) | 0 };
  }
  function visiblePonds() {
    const v = G.view, cs = cellSize(), cx = v.ww / 2, cy = v.wh / 2, x0 = -v.ox / v.scale, y0 = -v.oy / v.scale, x1 = x0 + v.w / v.scale, y1 = y0 + v.h / v.scale, out = [];
    const i0 = Math.floor((x0 - cx) / cs - 0.5), i1 = Math.ceil((x1 - cx) / cs + 0.5), j0 = Math.floor((y0 - cy) / cs - 0.5), j1 = Math.ceil((y1 - cy) / cs + 0.5);
    if ((i1 - i0) * (j1 - j0) > 900) return out;
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) { const p = farPond(i, j, cs, cx, cy); if (p) out.push(p); }
    return out;
  }
  const edge = function (ctx, ww, wh, R) { ctx.moveTo(R, 0); ctx.lineTo(ww - R, 0); ctx.quadraticCurveTo(ww, 0, ww, R); ctx.lineTo(ww, wh - R); ctx.quadraticCurveTo(ww, wh, ww - R, wh); ctx.lineTo(R, wh); ctx.quadraticCurveTo(0, wh, 0, wh - R); ctx.lineTo(0, R); ctx.quadraticCurveTo(0, 0, R, 0); ctx.closePath(); };

  // the kinds that live in a far pond: stand-ins, drawn once each from bodies this pond has grown, in that pond's own colours
  const KIND = {};
  function kindsOf(p) {
    const key = p.i + ',' + p.j; if (KIND[key]) return KIND[key];
    const W = G.W, pool = (W.species || []).filter(function (s) { return s.rep && s.rep.f && s.rep.f.bd; }).map(function (s) { return s.rep; }).concat((W.cre || []).filter(function (c) { return c.g.f.bd; }).slice(0, 12).map(function (c) { return c.g; }));
    if (!pool.length) return [];
    const out = [];
    for (let k = 0; k < p.kinds; k++) {
      const g = pool[(hash(p.i, p.j, 100 + k) * pool.length) | 0], cv = document.createElement('canvas'); cv.width = cv.height = 120;
      try { const f = G.form.clone(g.f); f.hue = (p.hue + 140 * k + 360 * hash(p.i, p.j, 110 + k) * 0.3) % 360; if (f.hue2 !== undefined) f.hue2 = (hash(p.i, p.j, 120 + k) - 0.5) * 240;
        const x = cv.getContext('2d'); x.translate(60, 104); x.scale(0.33, 0.33); G.form.portrait(x, f, 1.3 + k, {}); out.push(cv); } catch (e) { console.error(e); }
    }
    if (Object.keys(KIND).length > 80) for (const q in KIND) { delete KIND[q]; break; }
    return (KIND[key] = out);
  }

  // stars: three layers on the screen itself, each sliding a little as you travel (the far ones least)
  const STARS = []; for (let i = 0; i < 210; i++) STARS.push([hash(i, 1, 21), hash(i, 2, 22), i % 3, 0.5 + hash(i, 3, 23) * 1.4, hash(i, 4, 24) * TAU, hash(i, 5, 25)]);

  function farPondDraw(ctx, p, px, py, pr, t) {
    const h = p.hue, col = function (dh, s, l, a) { return 'hsla(' + ((h + dh + 360) % 360) + ',' + s + '%,' + l + '%,' + a + ')'; };
    // its light in the dark
    const halo = ctx.createRadialGradient(px, py, pr * 0.7, px, py, pr * 3.2); halo.addColorStop(0, col(0, 90, 62, 0.34)); halo.addColorStop(0.4, col(30, 90, 55, 0.12)); halo.addColorStop(1, col(0, 90, 50, 0));
    ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(px, py, pr * 3.2, 0, TAU); ctx.fill();
    // a ring of light round some of them, seen at a slant
    if (p.rings && pr > 6) { ctx.save(); ctx.translate(px, py); ctx.rotate(-0.35); ctx.strokeStyle = col(40, 95, 78, 0.55); ctx.lineWidth = Math.max(1, pr * 0.05); ctx.beginPath(); ctx.ellipse(0, 0, pr * 1.75, pr * 0.5, 0, 0.08 * TAU, 0.42 * TAU); ctx.stroke(); ctx.restore(); }
    // the pool itself: a round world of water, lit from the upper left
    const body = ctx.createRadialGradient(px - pr * 0.35, py - pr * 0.4, pr * 0.05, px, py, pr); body.addColorStop(0, col(-10, 75, 62, 1)); body.addColorStop(0.55, col(10, 70, 34, 1)); body.addColorStop(1, col(35, 70, 12, 1));
    ctx.fillStyle = body; ctx.beginPath(); ctx.arc(px, py, pr, 0, TAU); ctx.fill();
    if (pr > 9) { ctx.save(); ctx.beginPath(); ctx.arc(px, py, pr, 0, TAU); ctx.clip();
      // a shore, and slow currents turning in the water
      ctx.fillStyle = col(-110, 45, 62, 0.75); ctx.beginPath(); ctx.ellipse(px, py - pr * 0.98, pr * 1.1, pr * 0.34, 0, 0, TAU); ctx.fill();
      ctx.lineCap = 'round'; for (let k = 0; k < 4; k++) { const a0 = t * (0.05 + 0.02 * k) * (k % 2 ? 1 : -1) + k * 1.7 + p.i, rr = pr * (0.3 + 0.16 * k); ctx.strokeStyle = col(20, 90, 80, 0.16); ctx.lineWidth = Math.max(1, pr * 0.05); ctx.beginPath(); ctx.arc(px, py + pr * 0.12, rr, a0, a0 + 1.5); ctx.stroke(); }
      // life in it: lights moving about
      const n = Math.min(16, Math.floor(pr / 2.5)); for (let q = 0; q < n; q++) { const a = hash(p.i, p.j, 40 + q) * TAU + t * (0.1 + 0.14 * hash(p.i, p.j, 60 + q)) * (q % 2 ? 1 : -1), d = 0.15 + 0.7 * hash(p.i, p.j, 80 + q); ctx.fillStyle = 'hsla(' + (h + 70 + q * 47) % 360 + ',95%,78%,0.95)'; ctx.beginPath(); ctx.arc(px + Math.cos(a) * pr * d, py + pr * 0.15 + Math.sin(a) * pr * 0.7 * d, Math.max(0.8, pr * 0.04), 0, TAU); ctx.fill(); }
      // the shine of the water
      const sh = ctx.createRadialGradient(px - pr * 0.4, py - pr * 0.45, 0, px - pr * 0.4, py - pr * 0.45, pr * 0.9); sh.addColorStop(0, 'rgba(255,255,255,0.3)'); sh.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = sh; ctx.fillRect(px - pr, py - pr, pr * 2, pr * 2);
      ctx.restore(); }
    ctx.strokeStyle = col(20, 95, 82, 0.85); ctx.lineWidth = Math.max(1, pr * 0.035); ctx.beginPath(); ctx.arc(px, py, pr, 0, TAU); ctx.stroke();
    if (p.rings && pr > 6) { ctx.save(); ctx.translate(px, py); ctx.rotate(-0.35); ctx.strokeStyle = col(40, 95, 82, 0.8); ctx.lineWidth = Math.max(1, pr * 0.05); ctx.beginPath(); ctx.ellipse(0, 0, pr * 1.75, pr * 0.5, 0, 0.58 * TAU, 0.92 * TAU); ctx.stroke(); ctx.restore(); }
    // small lights circling it
    for (let k = 0; k < p.moons && pr > 8; k++) { const a = t * (0.25 + 0.1 * k) + k * 2.4 + p.j, d = pr * (1.45 + 0.35 * k); ctx.fillStyle = col(60 * k + 40, 95, 80, 0.95); ctx.beginPath(); ctx.arc(px + Math.cos(a) * d, py + Math.sin(a) * d * 0.45, Math.max(1.2, pr * 0.07), 0, TAU); ctx.fill(); }
    if (pr > 22) {
      // who lives there: a few of its kinds, above it
      const K = kindsOf(p), sz = clamp(pr * 0.95, 34, 96), gap = sz * 0.82, x0 = px - (K.length - 1) * gap / 2;
      for (let k = 0; k < K.length; k++) { const bob = Math.sin(t * 1.3 + k * 2 + p.i) * sz * 0.05; ctx.drawImage(K[k], x0 + k * gap - sz / 2, py - pr - sz * 0.92 + bob, sz, sz); }
      // its name
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; const fs = Math.round(clamp(pr * 0.2, 12, 18)); ctx.font = '800 ' + fs + 'px system-ui, sans-serif';
      const tw = ctx.measureText(p.name).width + 26, ty = py + pr + 20; ctx.fillStyle = 'rgba(9,20,33,0.85)'; G.roundRect(ctx, px - tw / 2, ty - fs * 0.85, tw, fs * 1.7, fs * 0.85); ctx.fill(); ctx.strokeStyle = col(20, 90, 75, 0.7); ctx.lineWidth = 1.2; ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.fillText(p.name, px, ty + 0.5);
      ctx.font = '700 10px system-ui, sans-serif'; ctx.fillStyle = col(20, 80, 80, 0.9); ctx.fillText(K.length + (K.length === 1 ? ' KIND LIVES HERE' : ' KINDS LIVE HERE'), px, ty + fs * 1.5);
    }
  }

  let lastT = 0;
  function draw() {
    const W = G.W, ctx = G.ctx; if (!W || W.title || !ctx || G.mode !== 'play') { if (home) home.classList.add('hide'); return; }
    const v = G.view, s = v.scale * v.dpr, t = G.rt || 0, ww = W.ww, wh = W.wh, m = Math.min(ww, wh), R = m * 0.16, B = m * 0.11;
    flyStep(Math.min(0.1, Math.max(0, t - lastT))); lastT = t;
    const x0 = -v.ox / v.scale, y0 = -v.oy / v.scale, x1 = x0 + v.w / v.scale, y1 = y0 + v.h / v.scale;
    hud(x0, y0, x1, y1);
    { const wx = document.getElementById('wxfx'); if (wx) { const l = Math.max(0, v.ox), tp = Math.max(0, v.oy), r = Math.max(0, v.w - (ww * v.scale + v.ox)), bt = Math.max(0, v.h - (wh * v.scale + v.oy)), cp = (l || tp || r || bt) ? 'inset(' + Math.round(tp) + 'px ' + Math.round(r) + 'px ' + Math.round(bt) + 'px ' + Math.round(l) + 'px round ' + Math.round(R * v.scale) + 'px)' : ''; if (wx._cp !== cp) { wx._cp = cp; wx.style.clipPath = cp; } } }      /* weather (snow, bubbles, embers) falls in the pond, not in space */
    if (x0 > B && y0 > B && x1 < ww - B && y1 < wh - B) { pulse = Math.max(0, pulse - 0.01); return; }      // looking at the middle of the pond: nothing of the outside is in view
    ctx.save(); ctx.setTransform(s, 0, 0, s, v.ox * v.dpr, v.oy * v.dpr);
    // the pond fades into the dark: its water thins away over a wide band inside its edge (drawn over the pond, so nothing of the pond shows hard against space)
    { ctx.save(); ctx.beginPath(); edge(ctx, ww, wh, R); ctx.clip(); const N = 26; for (let k = 0; k < N; k++) { const u = k / (N - 1); ctx.strokeStyle = 'rgba(' + SPACE + ',' + (0.035 + 0.13 * u * u) + ')'; ctx.lineWidth = B * 2.6 * (1 - u * 0.96); ctx.beginPath(); edge(ctx, ww, wh, R); ctx.stroke(); } ctx.restore(); }
    // everything outside the pond's edge is space
    ctx.beginPath(); ctx.rect(x0 - 20, y0 - 20, x1 - x0 + 40, y1 - y0 + 40); edge(ctx, ww, wh, R); ctx.clip('evenodd');
    ctx.setTransform(v.dpr, 0, 0, v.dpr, 0, 0);
    const bg = ctx.createLinearGradient(0, 0, 0, v.h); bg.addColorStop(0, 'rgb(6,9,22)'); bg.addColorStop(0.55, 'rgb(' + SPACE + ')'); bg.addColorStop(1, 'rgb(3,5,12)');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, v.w, v.h);
    // drifting clouds of colour, far off (they lie in space, so they pass by as you travel)
    { const cs = cellSize() * 1.6, cx = ww / 2, cy = wh / 2, i0 = Math.floor((x0 - cx) / cs - 0.7), i1 = Math.ceil((x1 - cx) / cs + 0.7), j0 = Math.floor((y0 - cy) / cs - 0.7), j1 = Math.ceil((y1 - cy) / cs + 0.7);
      if ((i1 - i0) * (j1 - j0) < 400) { ctx.globalCompositeOperation = 'lighter';
        for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) { const nx = (cx + (i + hash(i, j, 31) - 0.5) * cs) * v.scale + v.ox, ny = (cy + (j + hash(i, j, 32) - 0.5) * cs) * v.scale + v.oy, nr = cs * (0.45 + 0.45 * hash(i, j, 33)) * v.scale, hue = 190 + hash(i, j, 34) * 150;
          if (nr < 6 || nx + nr < 0 || ny + nr < 0 || nx - nr > v.w || ny - nr > v.h) continue;
          const g = ctx.createRadialGradient(nx, ny, 0, nx, ny, nr); g.addColorStop(0, 'hsla(' + hue + ',70%,45%,0.15)'); g.addColorStop(0.5, 'hsla(' + (hue + 30) + ',70%,35%,0.06)'); g.addColorStop(1, 'hsla(' + hue + ',70%,30%,0)');
          ctx.fillStyle = g; ctx.fillRect(nx - nr, ny - nr, nr * 2, nr * 2); }
        ctx.globalCompositeOperation = 'source-over'; } }
    // stars
    for (let i = 0; i < STARS.length; i++) { const q = STARS[i], p = [0.015, 0.04, 0.09][q[2]], W2 = v.w + 60, H2 = v.h + 60;
      let sx = (q[0] * W2 - G.cam.x * v.base * p) % W2, sy = (q[1] * H2 - G.cam.y * v.base * p) % H2; if (sx < 0) sx += W2; if (sy < 0) sy += H2;
      const tw = 0.55 + 0.45 * Math.sin(t * (0.5 + q[5] * 1.6) + q[4]);
      ctx.fillStyle = 'rgba(' + (q[5] > 0.8 ? '255,225,190' : q[5] < 0.2 ? '170,205,255' : '235,242,255') + ',' + (0.25 + 0.6 * tw) * (0.5 + 0.25 * q[2]) + ')';
      ctx.beginPath(); ctx.arc(sx - 30, sy - 30, q[3] * (0.5 + 0.3 * q[2]) * (0.8 + 0.3 * tw), 0, TAU); ctx.fill(); }
    // the water's own light, leaking a little way out into the dark round our pond
    { ctx.save(); ctx.setTransform(s, 0, 0, s, v.ox * v.dpr, v.oy * v.dpr); ctx.globalCompositeOperation = 'lighter'; const N = 24; for (let k = 0; k < N; k++) { const u = k / (N - 1); ctx.strokeStyle = 'rgba(60,170,175,' + (0.006 + 0.012 * u + 0.016 * pulse) + ')'; ctx.lineWidth = B * 3 * (1 - u * 0.9); ctx.beginPath(); edge(ctx, ww, wh, R); ctx.stroke(); } ctx.restore(); pulse = Math.max(0, pulse - 0.006); }
    // the other ponds, and the lanes between neighbours: a map of where one could travel
    const P = visiblePonds();
    { const byCell = {}; for (let k = 0; k < P.length; k++) byCell[P[k].i + ',' + P[k].j] = P[k]; byCell['0,0'] = { i: 0, j: 0, x: ww / 2, y: wh / 2, r: unit() * 0.5 };
      ctx.lineCap = 'round'; ctx.setLineDash([2, 9]); ctx.lineDashOffset = -t * 6; ctx.lineWidth = 1.3;
      for (const key in byCell) { const a = byCell[key]; [[1, 0], [0, 1], [1, 1], [1, -1]].forEach(function (d) { const b = byCell[(a.i + d[0]) + ',' + (a.j + d[1])]; if (!b) return; const ax = a.x * v.scale + v.ox, ay = a.y * v.scale + v.oy, bx = b.x * v.scale + v.ox, by = b.y * v.scale + v.oy, len = Math.hypot(bx - ax, by - ay); if (len < 60) return; const ux = (bx - ax) / len, uy = (by - ay) / len, ra = a.r * v.scale * 1.5 + 8, rb = b.r * v.scale * 1.5 + 8; if (len < ra + rb + 10) return;
        const mine = (!a.i && !a.j) || (!b.i && !b.j); ctx.strokeStyle = mine ? 'rgba(246,211,101,0.42)' : 'rgba(150,190,235,0.2)'; ctx.beginPath(); ctx.moveTo(ax + ux * ra, ay + uy * ra); ctx.lineTo(bx - ux * rb, by - uy * rb); ctx.stroke(); }); }
      ctx.setLineDash([]); }
    // now and then, a shooting star
    { const T = 7, n = Math.floor(t / T), u = (t - n * T) / 0.9; if (u < 1 && hash(n, 3, 77) < 0.75) { const sx = hash(n, 1, 71) * v.w, sy = hash(n, 2, 72) * v.h * 0.7, an = 0.5 + hash(n, 4, 73) * 0.6, L = 150 + 160 * hash(n, 5, 74), hx = sx + Math.cos(an) * L * u * 2.2, hy = sy + Math.sin(an) * L * u * 2.2, g = ctx.createLinearGradient(hx, hy, hx - Math.cos(an) * L, hy - Math.sin(an) * L); g.addColorStop(0, 'rgba(255,255,255,' + 0.95 * (1 - u) + ')'); g.addColorStop(1, 'rgba(160,210,255,0)'); ctx.strokeStyle = g; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx - Math.cos(an) * L, hy - Math.sin(an) * L); ctx.stroke(); } }
    for (let k = 0; k < P.length; k++) { const p = P[k], px = p.x * v.scale + v.ox, py = p.y * v.scale + v.oy, pr = p.r * v.scale;
      if (px + pr * 4 < 0 || py + pr * 4 < 0 || px - pr * 4 > v.w || py - pr * 5 > v.h) continue;
      if (pr < 1.4) { ctx.fillStyle = 'hsla(' + p.hue + ',85%,72%,0.9)'; ctx.beginPath(); ctx.arc(px, py, 1.7, 0, TAU); ctx.fill(); continue; }
      farPondDraw(ctx, p, px, py, pr, t); }
    ctx.restore();
    // seen from afar, our own is named
    if (G.cam.z < 0.45) { ctx.save(); ctx.setTransform(v.dpr, 0, 0, v.dpr, 0, 0); const px = ww / 2 * v.scale + v.ox, py = wh * v.scale + v.oy + 20; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = '800 14px system-ui, sans-serif'; ctx.fillStyle = '#f6d365'; ctx.fillText('YOUR POND', px, py); ctx.font = '600 11px system-ui, sans-serif'; ctx.fillStyle = 'rgba(207,232,255,0.85)'; ctx.fillText('generation ' + W.gen + ' · ' + W.cre.length + ' alive', px, py + 17); ctx.restore(); }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }
  G.addSystem({ name: 'beyond', draw: function () { draw(); } });      // after the pond's own renderer: space is painted last

  // ── the way home, and a word about a far pond ──
  let home = null, card = null, shown = '';
  function ui() {
    if (home) return;
    const st = document.createElement('style');
    st.textContent = '#gohome{position:fixed;left:50%;top:14px;transform:translateX(-50%);z-index:7;display:flex;align-items:center;gap:9px;padding:9px 18px 9px 12px;border-radius:999px;cursor:pointer;font:800 11px system-ui,sans-serif;letter-spacing:.16em;color:#1a2433;background:#f6d365;border:1px solid #f6d365;box-shadow:0 6px 24px rgba(0,0,0,.5)}#gohome i{display:inline-flex;width:20px;height:20px;align-items:center;justify-content:center;font-style:normal;font-size:15px;transition:transform .2s}#gohome small{font:700 11px system-ui,sans-serif;letter-spacing:.02em;color:#1a2433;opacity:.8;text-transform:none;white-space:nowrap}#gohome small:empty{display:none}#gohome small:before{content:"· "}' +
      '#farcard{position:fixed;left:50%;bottom:96px;transform:translateX(-50%);z-index:8;width:min(440px,calc(100vw - 28px));padding:13px 16px 14px;border-radius:18px;font:500 12.5px/1.45 system-ui,sans-serif;color:#cfe8ff;text-align:center}#farcard b{display:block;font:800 18px system-ui,sans-serif;color:#fff;margin:2px 0 4px}#farcard .k{font:700 9.5px system-ui,sans-serif;letter-spacing:.2em;color:#f6d365;text-transform:uppercase}#farcard .ks{display:flex;justify-content:center;gap:6px;margin:4px 0 6px}#farcard .ks img{width:76px;height:76px}#farcard .r{display:flex;gap:8px;margin-top:10px}#farcard .r .btn{flex:1;min-height:34px}';
    document.head.appendChild(st);
    const host = document.getElementById('ui') || document.body;
    home = document.createElement('button'); home.id = 'gohome'; home.className = 'hide'; home.innerHTML = '<i>➤</i><span>BACK TO MY POND</span><small></small>'; host.appendChild(home);
    home.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
    home.addEventListener('click', function (e) { e.stopPropagation(); if (G.sfx) G.sfx('click'); G.goHome(); });
    card = document.createElement('div'); card.id = 'farcard'; card.className = 'glass hide'; host.appendChild(card);
    card.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
    card.addEventListener('click', function (e) { const id = e.target && e.target.id; if (id === 'farHome') { if (G.sfx) G.sfx('click'); G.goHome(); } else if (id === 'farClose') hideCard(); });
  }
  function hideCard() { if (card) card.classList.add('hide'); shown = ''; }
  function hud(x0, y0, x1, y1) {
    ui();
    const W = G.W, v = G.view, on = G.mode === 'play' && !(G.ui && G.ui.modal);
    // "home" shows only when the pond is out of sight, or so small on the screen that it is hard to find
    const seen = x1 > 0 && x0 < W.ww && y1 > 0 && y0 < W.wh, small = W.wh * v.scale < v.h * 0.16, away = on && (!seen || small) && !fly;
    home.classList.toggle('hide', !away);
    if (away) { const cx = W.ww / 2, cy = W.wh / 2, dx = cx - G.cam.x, dy = cy - G.cam.y, d = Math.hypot(dx, dy) / unit(); home.firstChild.style.transform = seen ? 'rotate(-90deg)' : 'rotate(' + Math.atan2(dy, dx) + 'rad)'; home.lastChild.textContent = seen ? '' : Math.max(1, Math.round(d)) + (Math.round(d) <= 1 ? ' pond away' : ' ponds away');
      const top = ['wish', 'wxnow'].reduce(function (y, id) { const e = document.getElementById(id); return e && !e.classList.contains('hide') && e.offsetHeight ? Math.max(y, e.getBoundingClientRect().bottom + 8) : y; }, 14); home.style.top = Math.round(top) + 'px'; }
    if (!on && shown) hideCard();
  }
  G.on('pond-click', function (c) {
    const W = G.W; if (!W || W.title || G.mode !== 'play' || !c) return;
    if (c.x > 0 && c.x < W.ww && c.y > 0 && c.y < W.wh) { if (shown) hideCard(); return; }
    const P = visiblePonds(), v = G.view; let hit = null;
    for (let i = 0; i < P.length; i++) { const p = P[i], reach = Math.max(p.r * 1.3, 16 / v.scale); if (Math.hypot(c.x - p.x, c.y - p.y) < reach) { hit = p; break; } }
    if (!hit) { if (shown) hideCard(); return; }
    ui(); if (G.sfx) G.sfx('click');
    G.flyTo(hit.x, hit.y - hit.r * 0.5, clamp(v.h * 0.15 / (hit.r * v.base), ZMIN, 1.2), 1.0);
    shown = hit.name;
    const K = kindsOf(hit); let pics = ''; for (let k = 0; k < K.length; k++) { try { pics += '<img alt="" src="' + K[k].toDataURL('image/png') + '">'; } catch (e) { /* no picture */ } }
    card.innerHTML = '<div class="k">A far pond</div><b>' + G.escapeHtml(hit.name) + '</b>' + (pics ? '<div class="ks">' + pics + '</div>' : '') + K.length + (K.length === 1 ? ' kind lives' : ' kinds live') + ' here. One day this will be somebody else\'s living pond, and you will be able to go in, look around and meet them. For now it is only a place on the map: visiting is not open yet.<div class="r"><button class="btn sm" id="farHome">BACK TO MY POND</button><button class="btn sm" id="farClose">CLOSE</button></div>';
    card.classList.remove('hide');
  });
  G.on('new-pond', function () { fly = null; hideCard(); for (const q in KIND) delete KIND[q]; });
})();
