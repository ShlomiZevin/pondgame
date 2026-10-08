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
  const TAU = 6.2832, clamp = G.clamp, ZMIN = 0.02, SPACE = '5,7,16';
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
        const x = cv.getContext('2d'); x.translate(60, 66); x.scale(0.3, 0.3); G.form.portrait(x, f, 1.3 + k, {}); out.push(cv); } catch (e) { console.error(e); }
    }
    if (Object.keys(KIND).length > 80) for (const q in KIND) { delete KIND[q]; break; }
    return (KIND[key] = out);
  }

  // ── things drawn once and kept: the frame stays light however far you look ──
  const STARS = []; for (let i = 0; i < 230; i++) STARS.push([hash(i, 1, 21), hash(i, 2, 22), i % 3, 0.5 + hash(i, 3, 23) * 1.4, hash(i, 4, 24) * TAU, hash(i, 5, 25)]);
  const SP = SPACE.split(',').map(Number), sm = function (a, b, x) { x = clamp((x - a) / (b - a), 0, 1); return x * x * (3 - 2 * x); };
  let rs = 987654321; const rnd = function () { rs = (rs * 1664525 + 1013904223) >>> 0; return rs / 4294967296; };
  /** how a pond ends: not at a line. Its water thins into grains, the grains scatter, and the last of them drift off into the dark. This is the picture of
   *  that ending for a pond of one shape (wide w, tall h, with margin mg round it and corners of radius R): space-coloured, see-through where the pond is. */
  let EDGE = null;
  function edgeMask(w, h, mg, R, fadeIn) {
    const key = Math.round(w / h * 200) + ':' + Math.round(mg / h * 200); if (EDGE && EDGE.key === key) return EDGE.cv;
    EDGE = { key: key, cv: buildMask(w, h, mg, R, fadeIn, 720) }; return EDGE.cv;
  }
  function buildMask(w, h, mg, R, fadeIn, TW) {
    const k = TW / (w + 2 * mg), TH = Math.max(8, Math.round((h + 2 * mg) * k)), cv = document.createElement('canvas'); cv.width = TW; cv.height = TH;
    const x = cv.getContext('2d'), im = x.createImageData(TW, TH), D = im.data, hw = w / 2, hh = h / 2;
    for (let py = 0; py < TH; py++) for (let px = 0; px < TW; px++) {
      const wx = px / k - mg - hw, wy = py / k - mg - hh, qx = Math.abs(wx) - (hw - R), qy = Math.abs(wy) - (hh - R);
      const d = Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - R;      // how far outside the pond's edge this point is (inside: below zero)
      const p = sm(-fadeIn, mg * 0.3, d), g = rnd(), o = (py * TW + px) * 4;
      let a = clamp(p + (g - 0.5) * 1.5 * Math.sin(3.1416 * p), 0, 1), r = SP[0], gg = SP[1], b = SP[2];
      if (p > 0.03 && p < 0.97) { if (g < p * p) a = 1; else if (g > 0.5 + p * 0.5) a = Math.min(a, 0.25); }      // grains: whole specks of dark among the water, whole specks of water among the dark
      if (d > 0) { const far = clamp(1 - d / (mg * 0.95), 0, 1); if (rnd() < 0.05 * far * far) { const l = 0.5 + rnd() * 0.5; r = 30 * l; gg = 120 * l + 30; b = 130 * l + 30; a = 1; } }      // the last atoms of it, loose in space
      D[o] = r; D[o + 1] = gg; D[o + 2] = b; D[o + 3] = Math.round(a * 255);
    }
    x.putImageData(im, 0, 0);
    return cv;
  }
  /** the same ending for a round pond: a ring that eats the rim of whatever disc it is laid on */
  let RING = null;
  function ringMask() {
    if (RING) return RING;
    const S = 192, cv = document.createElement('canvas'); cv.width = cv.height = S; const x = cv.getContext('2d'), im = x.createImageData(S, S), D = im.data;
    for (let py = 0; py < S; py++) for (let px = 0; px < S; px++) { const r = Math.hypot(px - S / 2 + 0.5, py - S / 2 + 0.5) / (S / 2), o = (py * S + px) * 4, p = sm(0.62, 0.99, r), g = rnd(); let a = r > 1 ? 0 : clamp(p + (g - 0.5) * 1.5 * Math.sin(3.1416 * p), 0, 1); if (r <= 1 && p > 0.03) { if (g < p * p) a = 1; else if (g > 0.5 + p * 0.5) a = Math.min(a, 0.25); } D[o] = SP[0]; D[o + 1] = SP[1]; D[o + 2] = SP[2]; D[o + 3] = Math.round(a * 255); }
    x.putImageData(im, 0, 0); return (RING = cv);
  }
  const NEB = {};
  function nebula(hb) { if (NEB[hb]) return NEB[hb]; const S = 160, cv = document.createElement('canvas'); cv.width = cv.height = S; const x = cv.getContext('2d'), hue = 190 + hb * 28, g = x.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2); g.addColorStop(0, 'hsla(' + hue + ',70%,45%,0.17)'); g.addColorStop(0.5, 'hsla(' + (hue + 30) + ',70%,35%,0.07)'); g.addColorStop(1, 'hsla(' + hue + ',70%,30%,0)'); x.fillStyle = g; x.fillRect(0, 0, S, S); return (NEB[hb] = cv); }
  /** a far pond, painted once. It is a pond like ours, seen from too far to make out who lives in it: the same shape, a shore along the top, water below,
   *  soft lights where its life is, and the same ending, its rim breaking up into grains that drift off into space. */
  const BODY = {}, FW = 400, FH = 240, FM = 120;      // the pond in its picture: wide, tall, and the margin round it
  let FMASK = null;
  function bodyOf(p) {
    const key = p.i + ',' + p.j; if (BODY[key]) return BODY[key];
    const SW = FW + 2 * FM, SH = FH + 2 * FM, cv = document.createElement('canvas'); cv.width = SW; cv.height = SH; const x = cv.getContext('2d'), h = p.hue, col = function (dh, s, l, a) { return 'hsla(' + ((h + dh + 360) % 360) + ',' + s + '%,' + l + '%,' + a + ')'; };
    // its light in the dark
    x.save(); x.translate(SW / 2, SH / 2); x.scale(1, SH / SW); const halo = x.createRadialGradient(0, 0, FW * 0.25, 0, 0, SW / 2); halo.addColorStop(0, col(0, 85, 58, 0.3)); halo.addColorStop(0.55, col(25, 85, 50, 0.1)); halo.addColorStop(1, col(0, 85, 50, 0)); x.fillStyle = halo; x.fillRect(-SW / 2, -SW / 2, SW, SW); x.restore();
    // the pond itself, on a sheet of its own so that its rim can be eaten away
    const pc = document.createElement('canvas'); pc.width = SW; pc.height = SH; const d = pc.getContext('2d'), shore = FH * (0.2 + 0.1 * hash(p.i, p.j, 210));
    d.save(); d.beginPath(); d.rect(FM, FM, FW, FH); d.clip();
    const wg = d.createLinearGradient(0, FM, 0, FM + FH); wg.addColorStop(0, col(0, 55, 34, 1)); wg.addColorStop(0.5, col(8, 60, 24, 1)); wg.addColorStop(1, col(18, 65, 12, 1)); d.fillStyle = wg; d.fillRect(FM, FM, FW, FH);
    try { d.filter = 'blur(4.5px)'; } catch (e) { /* no blur here: the lights are simply sharper */ }
    // what lives in it, too far to make out: soft lights of many colours
    for (let k = 0; k < 46; k++) { const lx = FM + hash(p.i + k, p.j, 211) * FW, ly = FM + shore + hash(p.i, p.j + k, 212) * (FH - shore), big = hash(p.i - k, p.j, 213) < 0.2; d.fillStyle = 'hsla(' + ((h + 60 + k * 53) % 360) + ',90%,' + (big ? 70 : 76) + '%,' + (big ? 0.55 : 0.85) + ')'; d.beginPath(); d.arc(lx, ly, big ? 9 : 3 + 2.4 * hash(k, p.i, 214), 0, TAU); d.fill(); }
    // the shore along the top, with its uneven waterline
    d.fillStyle = col(-115 + 30 * hash(p.i, p.j, 215), 38, 58, 1); d.beginPath(); d.moveTo(FM, FM); d.lineTo(FM + FW, FM); d.lineTo(FM + FW, FM + shore);
    for (let q = 24; q >= 0; q--) d.lineTo(FM + FW * q / 24, FM + shore + Math.sin(q * 1.3 + p.i) * 3.2 + Math.sin(q * 0.5 + p.j) * 2.8); d.closePath(); d.fill();
    for (let k = 0; k < 16; k++) { d.fillStyle = 'hsla(' + ((h + 100 + k * 71) % 360) + ',75%,68%,0.8)'; d.beginPath(); d.arc(FM + hash(k, p.j, 216) * FW, FM + hash(p.i, k, 217) * shore * 0.9, 2.8, 0, TAU); d.fill(); }
    d.filter = 'none'; d.restore();
    if (!FMASK) FMASK = buildMask(FW, FH, FM, FH * 0.2, FH * 0.16, SW);
    d.globalCompositeOperation = 'destination-out'; d.drawImage(FMASK, 0, 0, SW, SH); d.globalCompositeOperation = 'source-over';      // the water itself is eaten away at the rim, so its glow and the stars show through
    x.drawImage(pc, 0, 0);
    // and its last grains, loose in space
    for (let k = 0; k < 150; k++) { const a = hash(p.i * 7 + k, p.j, 201) * TAU, u = hash(p.i, p.j * 5 + k, 202), ca = Math.cos(a), sa = Math.sin(a), k0 = 1 / Math.max(Math.abs(ca) / (FW / 2), Math.abs(sa) / (FH / 2)), kk = k0 * 0.92 + FM * 0.85 * u * u; x.fillStyle = col(20 * (k % 3), 80, 68, 0.8 * (1 - u)); x.fillRect(SW / 2 + ca * kk, SH / 2 + sa * kk, 2.6, 2.6); }
    if (Object.keys(BODY).length > 24) for (const q in BODY) { delete BODY[q]; break; }      /* only the ponds lately in view are kept: far space costs no memory */
    return (BODY[key] = cv);
  }

  function farPondDraw(ctx, p, px, py, pr, t) {
    const h = p.hue, col = function (dh, s, l, a) { return 'hsla(' + ((h + dh + 360) % 360) + ',' + s + '%,' + l + '%,' + a + ')'; };
    // p.r is half the pond's height; the picture carries the pond and its margin
    const k = pr * 2 / FH, w = (FW + 2 * FM) * k, hh = (FH + 2 * FM) * k, hw2 = FW * k / 2, hh2 = FH * k / 2;
    ctx.drawImage(bodyOf(p), px - w / 2, py - hh / 2, w, hh);
    if (pr > 9) {
      // a few of its lights wander, and grains of it drift slowly off into space
      const n = Math.min(9, Math.floor(pr / 4)); for (let q = 0; q < n; q++) { const a = hash(p.i, p.j, 40 + q) * TAU + t * (0.09 + 0.12 * hash(p.i, p.j, 60 + q)) * (q % 2 ? 1 : -1), d = 0.15 + 0.6 * hash(p.i, p.j, 80 + q); ctx.fillStyle = 'hsla(' + (h + 70 + q * 47) % 360 + ',95%,80%,0.55)'; ctx.beginPath(); ctx.arc(px + Math.cos(a) * hw2 * 0.8 * d, py + hh2 * 0.22 + Math.sin(a) * hh2 * 0.6 * d, Math.max(1, pr * 0.045), 0, TAU); ctx.fill(); }
      for (let q = 0; q < 18; q++) { const a = hash(p.i, p.j, 140 + q) * TAU, u = (t * (0.015 + 0.02 * hash(p.i, p.j, 160 + q)) + hash(p.i, p.j, 180 + q)) % 1, ca = Math.cos(a), sa = Math.sin(a), k0 = 1 / Math.max(Math.abs(ca) / hw2, Math.abs(sa) / hh2), kk = k0 * 0.95 + FM * k * 0.9 * u, sz = Math.max(1, pr * 0.03) * (1.2 - u * 0.6); ctx.fillStyle = col(15, 85, 72, 0.75 * (1 - u)); ctx.fillRect(px + ca * kk - sz / 2, py + sa * kk - sz / 2, sz, sz); }
    }
    if (pr > 16) {
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; const fs = Math.round(clamp(pr * 0.24, 12, 18)); ctx.font = '800 ' + fs + 'px system-ui, sans-serif';
      const tw = ctx.measureText(p.name).width + 26, ty = py + hh2 + FM * k * 0.55 + 14; ctx.fillStyle = 'rgba(9,20,33,0.85)'; G.roundRect(ctx, px - tw / 2, ty - fs * 0.85, tw, fs * 1.7, fs * 0.85); ctx.fill(); ctx.strokeStyle = col(20, 90, 75, 0.7); ctx.lineWidth = 1.2; ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.fillText(p.name, px, ty + 0.5);
      ctx.font = '700 10px system-ui, sans-serif'; ctx.fillStyle = col(20, 80, 80, 0.9); ctx.fillText(p.kinds + (p.kinds === 1 ? ' KIND LIVES HERE' : ' KINDS LIVE HERE'), px, ty + fs * 1.5);
    }
  }

  function draw() {
    const W = G.W, ctx = G.ctx; if (!W || W.title || !ctx || G.mode !== 'play') { if (home) home.classList.add('hide'); return; }
    const v = G.view, s = v.scale * v.dpr, t = G.rt || 0, ww = W.ww, wh = W.wh, m = Math.min(ww, wh), R = m * 0.2, IN = m * 0.16, MG = m * 0.3;
    const x0 = -v.ox / v.scale, y0 = -v.oy / v.scale, x1 = x0 + v.w / v.scale, y1 = y0 + v.h / v.scale;
    hud(x0, y0, x1, y1);
    { const wx = document.getElementById('wxfx'); if (wx) { const q = function (n) { return Math.round(Math.max(0, n) / 6) * 6; }, l = q(v.ox), tp = q(v.oy), r = q(v.w - (ww * v.scale + v.ox)), bt = q(v.h - (wh * v.scale + v.oy)), cp = (l || tp || r || bt) ? 'inset(' + tp + 'px ' + r + 'px ' + bt + 'px ' + l + 'px round ' + Math.round(R * v.scale) + 'px)' : ''; if (wx._cp !== cp) { wx._cp = cp; wx.style.clipPath = cp; } } }      // the pond's weather (snow, bubbles, embers) falls in the pond, not in space
    if (x0 > IN && y0 > IN && x1 < ww - IN && y1 < wh - IN) return;      // looking at the middle of the pond: nothing of the outside is in view
    ctx.save(); ctx.setTransform(s, 0, 0, s, v.ox * v.dpr, v.oy * v.dpr);
    // 1. the pond's ending, laid over its edges; and plain dark beyond that picture
    ctx.imageSmoothingEnabled = true; ctx.drawImage(edgeMask(ww, wh, MG, R, IN), -MG, -MG, ww + 2 * MG, wh + 2 * MG);
    ctx.fillStyle = 'rgb(' + SPACE + ')';
    { const ov = 3 / v.scale;      /* the plain dark overlaps the picture's own dark border by a few pixels, so no seam shows between them */
      if (x0 < -MG + ov) ctx.fillRect(x0 - 9, y0 - 9, -MG + ov - x0 + 9, y1 - y0 + 18);
      if (x1 > ww + MG - ov) ctx.fillRect(ww + MG - ov, y0 - 9, x1 - ww - MG + ov + 9, y1 - y0 + 18);
      if (y0 < -MG + ov) ctx.fillRect(x0 - 9, y0 - 9, x1 - x0 + 18, -MG + ov - y0 + 9);
      if (y1 > wh + MG - ov) ctx.fillRect(x0 - 9, wh + MG - ov, x1 - x0 + 18, y1 - wh - MG + ov + 9); }
    // 2. everything of space is drawn outside the pond (a little way in over its fading rim, so stars show through where the water has thinned)
    ctx.beginPath(); ctx.rect(x0 - 20, y0 - 20, x1 - x0 + 40, y1 - y0 + 40);
    { const q = IN * 0.45, rr = Math.max(1, R - q); ctx.moveTo(q + rr, q); ctx.lineTo(ww - q - rr, q); ctx.quadraticCurveTo(ww - q, q, ww - q, q + rr); ctx.lineTo(ww - q, wh - q - rr); ctx.quadraticCurveTo(ww - q, wh - q, ww - q - rr, wh - q); ctx.lineTo(q + rr, wh - q); ctx.quadraticCurveTo(q, wh - q, q, wh - q - rr); ctx.lineTo(q, q + rr); ctx.quadraticCurveTo(q, q, q + rr, q); ctx.closePath(); }
    ctx.clip('evenodd');
    // grains of our own water, drifting slowly off into space; brighter for a moment when the pond has just grown
    { const hw = ww / 2, hh = wh / 2; for (let i = 0; i < 110; i++) { const a = hash(i, 9, 301) * TAU, u = (t * (0.012 + 0.016 * hash(i, 9, 302)) + hash(i, 9, 303)) % 1, ca = Math.cos(a), sa = Math.sin(a), k0 = 1 / Math.max(Math.abs(ca) / hw, Math.abs(sa) / hh), kk = k0 * 0.96 + MG * (u * 1.05 - 0.12), sz = m * 0.0045 * (1.3 - u) * (0.6 + hash(i, 9, 304));
        ctx.fillStyle = 'rgba(' + (i % 4 ? '95,205,200' : '200,240,235') + ',' + (0.8 * (1 - u) * (0.6 + 0.4 * pulse) + 0.25 * pulse * (1 - u)) + ')'; ctx.fillRect(hw + ca * kk - sz / 2, hh + sa * kk - sz / 2, sz, sz); } pulse = Math.max(0, pulse - 0.006); }
    ctx.setTransform(v.dpr, 0, 0, v.dpr, 0, 0);
    // drifting clouds of colour, far off
    { const cs = cellSize() * 1.6, cx = ww / 2, cy = wh / 2, i0 = Math.floor((x0 - cx) / cs - 0.7), i1 = Math.ceil((x1 - cx) / cs + 0.7), j0 = Math.floor((y0 - cy) / cs - 0.7), j1 = Math.ceil((y1 - cy) / cs + 0.7);
      if ((i1 - i0) * (j1 - j0) < 300) { ctx.globalCompositeOperation = 'lighter';
        for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) { const nx = (cx + (i + hash(i, j, 31) - 0.5) * cs) * v.scale + v.ox, ny = (cy + (j + hash(i, j, 32) - 0.5) * cs) * v.scale + v.oy, nr = cs * (0.45 + 0.45 * hash(i, j, 33)) * v.scale;
          if (nr < 6 || nx + nr < 0 || ny + nr < 0 || nx - nr > v.w || ny - nr > v.h) continue;
          ctx.drawImage(nebula((hash(i, j, 34) * 6) | 0), nx - nr, ny - nr, nr * 2, nr * 2); }
        ctx.globalCompositeOperation = 'source-over'; } }
    // stars (a few of the brightest have rays)
    for (let i = 0; i < STARS.length; i++) { const q = STARS[i], p = [0.015, 0.04, 0.09][q[2]], W2 = v.w + 60, H2 = v.h + 60;
      let sx = (q[0] * W2 - G.cam.x * v.base * p) % W2, sy = (q[1] * H2 - G.cam.y * v.base * p) % H2; if (sx < 0) sx += W2; if (sy < 0) sy += H2; sx -= 30; sy -= 30;
      const tw = 0.55 + 0.45 * Math.sin(t * (0.5 + q[5] * 1.6) + q[4]), sz = q[3] * (0.9 + 0.5 * q[2]) * (0.8 + 0.3 * tw);
      ctx.fillStyle = 'rgba(' + (q[5] > 0.8 ? '255,225,190' : q[5] < 0.2 ? '170,205,255' : '235,242,255') + ',' + (0.25 + 0.6 * tw) * (0.5 + 0.25 * q[2]) + ')';
      ctx.fillRect(sx - sz / 2, sy - sz / 2, sz, sz);
      if (i < 9) { const L = 5 + 7 * tw; ctx.fillRect(sx - L, sy - 0.5, L * 2, 1); ctx.fillRect(sx - 0.5, sy - L, 1, L * 2); } }
    // far galaxies: faint tilted whorls, very far (they hardly move as you travel)
    for (let i = 0; i < 5; i++) { const W2 = v.w + 400, H2 = v.h + 400; let gx = (hash(i, 6, 401) * W2 - G.cam.x * v.base * 0.006) % W2, gy = (hash(i, 6, 402) * H2 - G.cam.y * v.base * 0.006) % H2; if (gx < 0) gx += W2; if (gy < 0) gy += H2; gx -= 200; gy -= 200;
      const gr = 26 + 30 * hash(i, 6, 403); ctx.save(); ctx.translate(gx, gy); ctx.rotate(hash(i, 6, 404) * 3.14); ctx.scale(1, 0.42); ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(nebula((i * 2) % 6), -gr * 2, -gr * 2, gr * 4, gr * 4); ctx.drawImage(nebula((i * 2 + 3) % 6), -gr, -gr, gr * 2, gr * 2); ctx.fillStyle = 'rgba(255,245,225,0.5)'; ctx.fillRect(-1.5, -1.5, 3, 3); ctx.restore(); }
    // rocks adrift: they tumble slowly, each in its own place
    { const cs = unit() * 1.7, cx = ww / 2, cy = wh / 2, i0 = Math.floor((x0 - cx) / cs), i1 = Math.ceil((x1 - cx) / cs), j0 = Math.floor((y0 - cy) / cs), j1 = Math.ceil((y1 - cy) / cs);
      if ((i1 - i0) * (j1 - j0) < 500 && unit() * 0.03 * v.scale > 1.6) for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) { if (hash(i, j, 501) > 0.42 || (Math.abs(i) < 1 && Math.abs(j) < 1)) continue;
        const ax = (cx + (i + hash(i, j, 502)) * cs + Math.sin(t * 0.02 + i) * cs * 0.05) * v.scale + v.ox, ay = (cy + (j + hash(i, j, 503)) * cs) * v.scale + v.oy, ar = unit() * (0.012 + 0.03 * hash(i, j, 504)) * v.scale;
        if (ar < 1.2 || ax + ar < 0 || ay + ar < 0 || ax - ar > v.w || ay - ar > v.h) continue;
        const rot = t * (0.05 + 0.1 * hash(i, j, 505)) * (hash(i, j, 506) < 0.5 ? 1 : -1), sh = 55 + 40 * hash(i, j, 507);
        ctx.beginPath(); for (let q = 0; q < 8; q++) { const an = rot + q * TAU / 8, rr = ar * (0.7 + 0.45 * hash(i * 3 + q, j, 508)); ctx.lineTo(ax + Math.cos(an) * rr, ay + Math.sin(an) * rr); } ctx.closePath();
        ctx.fillStyle = 'rgb(' + Math.round(sh * 0.95) + ',' + Math.round(sh * 0.9) + ',' + Math.round(sh * 1.05) + ')'; ctx.fill(); if (ar > 4) { ctx.strokeStyle = 'rgba(190,200,225,0.35)'; ctx.lineWidth = 1; ctx.stroke(); ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.arc(ax + ar * 0.2, ay + ar * 0.15, ar * 0.28, 0, TAU); ctx.fill(); } } }
    // the other ponds, and the lanes between neighbours: a map of where one could travel
    const P = visiblePonds();
    { const byCell = {}; for (let k = 0; k < P.length; k++) byCell[P[k].i + ',' + P[k].j] = P[k]; byCell['0,0'] = { i: 0, j: 0, x: ww / 2, y: wh / 2, r: wh * 0.5 };
      ctx.lineCap = 'round'; ctx.setLineDash([2, 9]); ctx.lineDashOffset = -t * 6; ctx.lineWidth = 1.3;
      for (const key in byCell) { const a = byCell[key]; for (let d = 0; d < 4; d++) { const b = byCell[(a.i + [1, 0, 1, 1][d]) + ',' + (a.j + [0, 1, 1, -1][d])]; if (!b) continue; const ax = a.x * v.scale + v.ox, ay = a.y * v.scale + v.oy, bx = b.x * v.scale + v.ox, by = b.y * v.scale + v.oy, len = Math.hypot(bx - ax, by - ay); if (len < 60) continue; const ux = (bx - ax) / len, uy = (by - ay) / len, ra = a.r * v.scale * 2.3 + 8, rb = b.r * v.scale * 2.3 + 8; if (len < ra + rb + 10) continue;
        const mine = (!a.i && !a.j) || (!b.i && !b.j); ctx.strokeStyle = mine ? 'rgba(246,211,101,0.42)' : 'rgba(150,190,235,0.2)'; ctx.beginPath(); ctx.moveTo(ax + ux * ra, ay + uy * ra); ctx.lineTo(bx - ux * rb, by - uy * rb); ctx.stroke(); } }
      ctx.setLineDash([]); }
    for (let k = 0; k < P.length; k++) { const p = P[k], px = p.x * v.scale + v.ox, py = p.y * v.scale + v.oy, pr = p.r * v.scale;
      if (px + pr * 4 < 0 || py + pr * 4 < 0 || px - pr * 4 > v.w || py - pr * 5 > v.h) continue;
      if (pr < 1.4) { ctx.fillStyle = 'hsla(' + p.hue + ',85%,72%,0.9)'; ctx.fillRect(px - 1.2, py - 1.2, 2.4, 2.4); continue; }
      farPondDraw(ctx, p, px, py, pr, t); }
    // falling stars, often; and now and then a comet taking its time across the sky
    for (let lane = 0; lane < 2; lane++) { const T = lane ? 4.3 : 2.9, n = Math.floor(t / T), u = (t - n * T) / 0.8; if (u < 1 && hash(n, lane, 77) < 0.8) { const sx = hash(n, lane, 71) * v.w, sy = hash(n, lane, 72) * v.h * 0.75, an = 0.45 + hash(n, lane, 73) * 0.7, L = 120 + 190 * hash(n, lane, 74), hx = sx + Math.cos(an) * L * u * 2.2, hy = sy + Math.sin(an) * L * u * 2.2, g = ctx.createLinearGradient(hx, hy, hx - Math.cos(an) * L, hy - Math.sin(an) * L); g.addColorStop(0, 'rgba(255,255,255,' + 0.95 * (1 - u) + ')'); g.addColorStop(1, 'rgba(160,210,255,0)'); ctx.strokeStyle = g; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx - Math.cos(an) * L, hy - Math.sin(an) * L); ctx.stroke(); } }
    { const T = 23, n = Math.floor(t / T), u = (t - n * T) / 9; if (u < 1) { const fromL = hash(n, 8, 81) < 0.5, an = (fromL ? 0.25 : 2.9) + (hash(n, 8, 82) - 0.5) * 0.5, sx = fromL ? -80 : v.w + 80, sy = hash(n, 8, 83) * v.h * 0.6, D = Math.hypot(v.w, v.h) * 1.2, hx = sx + Math.cos(an) * D * u, hy = sy + Math.sin(an) * D * u, L = 260, fade = Math.sin(3.1416 * u);
        const g = ctx.createLinearGradient(hx, hy, hx - Math.cos(an) * L, hy - Math.sin(an) * L); g.addColorStop(0, 'rgba(190,240,255,' + 0.8 * fade + ')'); g.addColorStop(1, 'rgba(120,200,255,0)'); ctx.strokeStyle = g; ctx.lineCap = 'round'; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx - Math.cos(an) * L, hy - Math.sin(an) * L); ctx.stroke();
        ctx.fillStyle = 'rgba(240,252,255,' + fade + ')'; ctx.beginPath(); ctx.arc(hx, hy, 4.5, 0, TAU); ctx.fill(); } }
    ctx.restore();
    // seen from afar, our own is named
    if (G.cam.z < 0.45) { ctx.save(); ctx.setTransform(v.dpr, 0, 0, v.dpr, 0, 0); const px = ww / 2 * v.scale + v.ox, py = (wh + MG * 0.75) * v.scale + v.oy + 14; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = '800 14px system-ui, sans-serif'; ctx.fillStyle = '#f6d365'; ctx.fillText('YOUR POND', px, py); ctx.font = '600 11px system-ui, sans-serif'; ctx.fillStyle = 'rgba(207,232,255,0.85)'; ctx.fillText('generation ' + W.gen + ' · ' + W.cre.length + ' alive', px, py + 17); ctx.restore(); }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }
  // the camera's flight is stepped BEFORE the pond is drawn, so the pond and the space round it are always drawn from the same place
  G.addSystem({ name: 'beyond', update: function (dt) { flyStep(Math.min(0.1, dt || 0.016)); }, draw: function () { draw(); } });      // and space is painted last, after the pond's own renderer

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
    for (let i = 0; i < P.length; i++) { const p = P[i], pad = Math.max(p.r * 0.25, 14 / v.scale); if (Math.abs(c.x - p.x) < p.r * 1.67 + pad && Math.abs(c.y - p.y) < p.r + pad) { hit = p; break; } }
    if (!hit) { if (shown) hideCard(); return; }
    ui(); if (G.sfx) G.sfx('click');
    G.flyTo(hit.x, hit.y + hit.r * 0.7, clamp(v.h * 0.17 / (hit.r * v.base), ZMIN, 1.2), 1.0);
    shown = hit.name;
    const K = kindsOf(hit); let pics = ''; for (let k = 0; k < K.length; k++) { try { pics += '<img alt="" src="' + K[k].toDataURL('image/png') + '">'; } catch (e) { /* no picture */ } }
    card.innerHTML = '<div class="k">A far pond</div><b>' + G.escapeHtml(hit.name) + '</b>' + (pics ? '<div class="ks">' + pics + '</div>' : '') + K.length + (K.length === 1 ? ' kind lives' : ' kinds live') + ' here. One day this will be somebody else\'s living pond, and you will be able to go in, look around and meet them. For now it is only a place on the map: visiting is not open yet.<div class="r"><button class="btn sm" id="farHome">BACK TO MY POND</button><button class="btn sm" id="farClose">CLOSE</button></div>';
    card.classList.remove('hide');
  });
  G.on('new-pond', function () { fly = null; hideCard(); for (const q in KIND) delete KIND[q]; });
})();
