// ── The terrain of a star ──
// A star is ground, seen from above and lit from the north-west: a RELIEF MAP painted once for each star from its own seed (so a star looks the
// same every time you come to it), and drawn under everything that lives. It has heights (plains, terraces, ridges), craters, and what its own
// terrain adds: rivers of lava on an ember star, blue crevasses on a frost star, black pools on a moss star, veins of light on a crystal star.
// The middle of the star, where the colony stands, is a plain; the deposits and feeding grounds (54j_order.js) are tinted into the ground.
// On top of the map: a few standing things (rocks, spires, vents, shards), the scenery of each place, old beacons at the corners, and the
// slow shadows of clouds. It is scenery only: nothing here is touched, eaten or built with.
//     rust (id reef)   red dust, old craters, wind streaks: the nearest to Mars
//     crag             grey broken rock, many craters, sharp terraces
//     moss (id marsh)  dark moss country with black pools
//     crystal          violet rock veined with light
//     ember            black glass with rivers of lava
//     frost            blue ice with deep crevasses and snow on the heights
(function () {
  'use strict';
  if (typeof document === 'undefined') return;
  const LOOK = {
    reef: { ramp: [[34, 14, 10], [70, 30, 18], [110, 50, 28], [150, 78, 42], [190, 116, 68]], basin: ['#55291a', '#391a11', '#200e0a'], dark: '30,10,6', lite: '255,190,140', cliff: '58,24,14', glow: '#ffb080', craters: 16, ridge: 0.22, terrace: 0.55 },
    crag: { ramp: [[18, 20, 26], [38, 42, 50], [62, 66, 76], [92, 96, 108], [132, 136, 148]], basin: ['#2f343d', '#1f232b', '#13161b'], dark: '8,10,14', lite: '210,216,228', cliff: '30,33,40', glow: '#c9d3dc', craters: 30, ridge: 0.4, terrace: 0.8 },
    marsh: { ramp: [[8, 22, 22], [16, 42, 30], [32, 66, 40], [56, 92, 50], [92, 124, 66]], basin: ['#1d3f29', '#122b1c', '#0a1b12'], dark: '4,14,8', lite: '170,230,130', cliff: '18,44,26', glow: '#b9f27a', craters: 4, ridge: 0.1, terrace: 0.35 },
    crystal: { ramp: [[18, 10, 42], [38, 22, 76], [64, 40, 114], [96, 64, 150], [142, 106, 194]], basin: ['#2d1c54', '#1d113a', '#110a26'], dark: '10,4,24', lite: '190,160,255', cliff: '30,16,60', glow: '#8ef0ff', craters: 6, ridge: 0.3, terrace: 0.9 },
    ember: { ramp: [[10, 5, 5], [26, 13, 11], [44, 25, 21], [64, 39, 33], [92, 58, 48]], basin: ['#2c1311', '#1b0b0a', '#0e0505'], dark: '6,2,2', lite: '255,150,80', cliff: '18,6,5', glow: '#ff9a4c', craters: 8, ridge: 0.35, terrace: 0.6 },
    frost: { ramp: [[20, 44, 70], [38, 78, 112], [72, 120, 156], [128, 170, 198], [196, 220, 236]], basin: ['#2f6184', '#1e4463', '#132c44'], dark: '10,30,52', lite: '220,240,255', cliff: '70,112,146', glow: '#dff4ff', craters: 5, ridge: 0.25, terrace: 0.5 } };
  const idOf = function (W) { return G.terrainOf ? G.terrainOf(W).id : 'reef'; };
  /** the colours of the star being shown */
  G.terrainLook = function (W) { return LOOK[idOf(W || G.W)] || LOOK.reef; };
  const fr = function (v) { return v - Math.floor(v); };
  function rnd(seed, i, k) { return fr(Math.sin(i * 127.1 + k * 311.7 + (seed % 9973) * 0.731) * 43758.5453); }
  function hash2(ix, iy, s) { let h = (Math.imul(ix, 374761393) + Math.imul(iy, 668265263) + Math.imul(s, 1274126177)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
  function vnoise(x, y, s) { const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy), a = hash2(ix, iy, s), b = hash2(ix + 1, iy, s), c = hash2(ix, iy + 1, s), d = hash2(ix + 1, iy + 1, s); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; }
  function fbm(x, y, s, oct) { let sum = 0, a = 0.5, f = 1, n = 0; for (let o = 0; o < oct; o++) { sum += a * vnoise(x * f, y * f, s + o * 17); n += a; a *= 0.5; f *= 2.03; } return sum / n; }
  const sstep = function (a, b, x) { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

  // ── painting the map ──
  const MARGIN = 170;
  /** begin painting the relief map of W at k pixels to a world unit; it is finished a few rows at a time (job.run) */
  function startJob(W, k) {
    const id = idOf(W), L = LOOK[id] || LOOK.reef, seed = (W.seed >>> 0) % 100000, w = Math.ceil((W.ww + 2 * MARGIN) * k), h = Math.ceil((W.wh + 2 * MARGIN) * k), cx = W.ww / 2, cy = W.wh / 2;
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const em = (id === 'ember' || id === 'crystal') ? document.createElement('canvas') : null; if (em) { em.width = w; em.height = h; }
    const H = new Float32Array(w * h), R = new Float32Array(w * h), sites = G.sitesOf ? G.sitesOf(W) : [], cen = G.centreOf ? G.centreOf(W) : { x: cx, y: cy };
    const job = { k: k, w: w, h: h, cv: cv, em: em, row: 0, phase: 0, done: false, id: id };
    const wx = function (px) { return px / k - MARGIN; }, wy = function (py) { return py / k - MARGIN; };
    job.run = function (ms) {
      const t0 = performance.now();
      while (!job.done && performance.now() - t0 < ms) {
        if (job.phase === 0) {      // heights: broad country, ridges, fine grain; the middle of the star is a plain
          const y = job.row, Y = wy(y) - cy; for (let x = 0; x < w; x++) { const X = wx(x) - cx, rg = 1 - Math.abs(2 * vnoise(X / 250 + 31, Y / 250 + 7, seed + 5) - 1), rg2 = 1 - Math.abs(2 * vnoise(X / 90 + 3, Y / 90 + 11, seed + 9) - 1);
            let v = fbm(X / 430, Y / 430, seed, 4) * (1 - L.ridge) + rg * rg * L.ridge + (fbm(X / 70, Y / 70, seed + 40, 2) - 0.5) * 0.14;
            const dc = Math.hypot(X - (cen.x - cx), (Y - (cen.y - cy)) * 1.35), flat = sstep(560, 250, dc); v = v + (0.5 - v) * flat * 0.9;
            H[y * w + x] = v; R[y * w + x] = rg * 0.7 + rg2 * 0.3; }
          if (++job.row >= h) { job.row = 0; job.phase = 1; }
        } else if (job.phase === 1) {      // craters are stamped in (a bowl and a raised rim); then the country is cut into terraces
          const n = L.craters; for (let i = 0; i < n; i++) { const X = (rnd(seed, i, 51) - 0.5) * (W.ww + 200), Y = (rnd(seed, i, 52) - 0.5) * (W.wh + 200), r = (26 + rnd(seed, i, 53) * rnd(seed, i, 54) * 110), dep = 0.10 + rnd(seed, i, 55) * 0.12; if (Math.hypot(X - (cen.x - cx), Y - (cen.y - cy)) < 330 + r) continue;
            const px0 = Math.max(0, Math.floor((X + cx + MARGIN - r * 1.4) * k)), px1 = Math.min(w - 1, Math.ceil((X + cx + MARGIN + r * 1.4) * k)), py0 = Math.max(0, Math.floor((Y + cy + MARGIN - r * 1.4) * k)), py1 = Math.min(h - 1, Math.ceil((Y + cy + MARGIN + r * 1.4) * k));
            for (let y = py0; y <= py1; y++) for (let x = px0; x <= px1; x++) { const d = Math.hypot(wx(x) - cx - X, (wy(y) - cy - Y) * 1.25) / r; if (d < 1.4) H[y * w + x] += d < 1 ? -dep * (1 - d * d) + dep * 0.35 * d * d * d * d : dep * 0.35 * (1 - (d - 1) / 0.4); } }
          for (let i = 0; i < H.length; i++) { const v = Math.max(0, Math.min(0.999, H[i])), t = v * 5, fl = Math.floor(t), s = (fl + sstep(0.32, 0.68, t - fl)) / 5; H[i] = v + (s - v) * L.terrace; }
          job.phase = 2;
        } else {      // colour: by height, lit from the north-west, with what this terrain adds; the places of the star tinted in
          const y = job.row, img = job.img || (job.img = cv.getContext('2d').createImageData(w, 1)), D = img.data, E = em ? (job.eimg || (job.eimg = em.getContext('2d').createImageData(w, 1))) : null, ED = E ? E.data : null, Yw = wy(y), ramp = L.ramp;
          for (let x = 0; x < w; x++) { const i = y * w + x, v = H[i], rg = R[i], Xw = wx(x);
            const a = H[Math.max(0, y - 1) * w + Math.max(0, x - 1)], b = H[Math.min(h - 1, y + 1) * w + Math.min(w - 1, x + 1)]; let light = 1 + (a - b) * 11 * Math.min(1.6, 0.75 / k); light = Math.max(0.5, Math.min(1.55, light));
            const t = Math.max(0, Math.min(3.999, v * 4)), q = Math.floor(t), f = t - q, c0 = ramp[q], c1 = ramp[q + 1]; let r = c0[0] + (c1[0] - c0[0]) * f, g = c0[1] + (c1[1] - c0[1]) * f, bl = c0[2] + (c1[2] - c0[2]) * f, e = 0;
            if (id === 'ember') { const lv = sstep(0.83, 0.93, rg) * sstep(0.62, 0.45, v); if (lv > 0) { r += (255 - r) * lv; g += (120 - g) * lv; bl += (30 - bl) * lv; e = lv; light = 1 + (light - 1) * (1 - lv); } }
            else if (id === 'frost') { const cvs = sstep(0.88, 0.96, rg); r += (14 - r) * cvs * 0.85; g += (52 - g) * cvs * 0.85; bl += (104 - bl) * cvs * 0.85; }
            else if (id === 'marsh') { const pl = sstep(0.36, 0.27, v); if (pl > 0) { r += (6 - r) * pl; g += (18 - g) * pl; bl += (30 - bl) * pl; light = 1 + (light - 1) * (1 - pl) + pl * 0.25 * sstep(0.6, 0.9, vnoise(Xw / 14, Yw / 5, seed + 77)); } }
            else if (id === 'crystal') { const vn = sstep(0.9, 0.97, rg); r += (150 - r) * vn * 0.5; g += (225 - g) * vn * 0.5; bl += (255 - bl) * vn * 0.5; e = vn * 0.6; if (hash2(x, y, seed + 3) > 0.9988) e = 1; }
            else if (id === 'reef') { light += (vnoise(Xw / 520, Yw / 34, seed + 61) - 0.5) * 0.16; }
            for (let s = 0; s < sites.length; s++) { const S = sites[s], d = Math.hypot(Xw - S.x, (Yw - S.y) / 0.8) / S.r; if (d > 1.25) continue; const m = sstep(1.25, 0.7, d) * (0.75 + 0.5 * vnoise(Xw / 26, Yw / 26, seed + 90));
              if (S.k === 'grove') { r += (26 - r) * m * 0.6; g += (112 - g) * m * 0.6; bl += (70 - bl) * m * 0.6; } else if (S.k === 'quarry') { r += (104 - r) * m * 0.55; g += (110 - g) * m * 0.55; bl += (122 - bl) * m * 0.55; light = 1 + (light - 1) * (1 + m); } else if (S.k === 'reeds') { r += (96 - r) * m * 0.5; g += (124 - g) * m * 0.5; bl += (52 - bl) * m * 0.5; } else if (S.k === 'shells') { r += (190 - r) * m * 0.42; g += (172 - g) * m * 0.42; bl += (136 - bl) * m * 0.42; } }
            { const dc = Math.hypot(Xw - cen.x, (Yw - cen.y + 10) * 1.6), m = sstep(330, 120, dc) * 0.16; r += (ramp[3][0] - r) * m; g += (ramp[3][1] - g) * m; bl += (ramp[3][2] - bl) * m; }      // (the trodden ground of the colony)
            const gr = (hash2(x, y, seed + 1) - 0.5) * 12, o = x * 4; D[o] = r * light + gr; D[o + 1] = g * light + gr; D[o + 2] = bl * light + gr; D[o + 3] = 255;
            if (ED) { if (id === 'ember') { ED[o] = 255; ED[o + 1] = 150; ED[o + 2] = 50; } else { ED[o] = 170; ED[o + 1] = 235; ED[o + 2] = 255; } ED[o + 3] = e * 255; } }
          cv.getContext('2d').putImageData(img, 0, y); if (E) em.getContext('2d').putImageData(E, 0, y);
          if (++job.row >= h) job.done = true;
        }
      }
      return job.done;
    };
    return job;
  }
  let MAP = null;      // { key, lo, hi, job }
  function mapFor(W) {
    const key = (W.seed >>> 0) + ':' + idOf(W) + ':' + Math.round(W.ww) + ':' + Math.round(W.wh);
    if (!MAP || MAP.key !== key) { const lo = startJob(W, 0.22); lo.run(400); MAP = { key: key, lo: lo, hi: null, job: startJob(W, 0.8) }; }
    if (MAP.job) { if (MAP.job.run(7)) { MAP.hi = MAP.job; MAP.job = null; } }
    return MAP;
  }
  let TILE = null;
  function grainTile() { if (TILE) return TILE; const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'), im = x.createImageData(128, 128); for (let i = 0; i < 128 * 128; i++) { const v = 128 + (hash2(i % 128, (i / 128) | 0, 7) - 0.5) * 120 + (hash2((i % 128) >> 1, ((i / 128) | 0) >> 1, 9) - 0.5) * 60; im.data[i * 4] = im.data[i * 4 + 1] = im.data[i * 4 + 2] = v; im.data[i * 4 + 3] = 255; } x.putImageData(im, 0, 0); return (TILE = c); }

  // ── the standing things ──
  function rock(ctx, L, x, y, s, v) { ctx.fillStyle = 'rgba(0,0,0,0.38)'; ctx.beginPath(); ctx.ellipse(x + s * 0.5, y + s * 0.42, s * 1.3, s * 0.26, 0, 0, 6.2832); ctx.fill(); ctx.fillStyle = 'rgba(' + L.cliff + ',1)'; ctx.beginPath(); ctx.moveTo(x - s, y + s * 0.4); ctx.lineTo(x - s * 0.7, y - s * 0.3); ctx.lineTo(x - s * 0.1, y - s * (0.55 + v * 0.5)); ctx.lineTo(x + s * 0.6, y - s * 0.35); ctx.lineTo(x + s, y + s * 0.4); ctx.closePath(); ctx.fill(); ctx.fillStyle = 'rgba(' + L.lite + ',0.34)'; ctx.beginPath(); ctx.moveTo(x - s * 0.7, y - s * 0.3); ctx.lineTo(x - s * 0.1, y - s * (0.55 + v * 0.5)); ctx.lineTo(x - s * 0.02, y - s * 0.05); ctx.lineTo(x - s * 0.5, y + s * 0.4); ctx.lineTo(x - s, y + s * 0.4); ctx.closePath(); ctx.fill(); }
  function spires(ctx, L, x, y, s, v, t, i) { const g = 0.6 + 0.4 * Math.sin(t * 1.5 + i); ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(140,240,255,' + (0.10 + 0.08 * g) + ')'; ctx.beginPath(); ctx.arc(x, y - s * 0.5, s * 1.5, 0, 6.2832); ctx.fill(); ctx.restore(); ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(x + s * 0.3, y + s * 0.3, s * 0.9, s * 0.2, 0, 0, 6.2832); ctx.fill(); for (let b = -1; b <= 1; b++) { const hx = x + b * s * 0.42, hh = s * (1.5 - Math.abs(b) * 0.6 + v * 0.4), w = s * 0.24; ctx.fillStyle = b ? 'rgba(170,130,240,0.95)' : 'rgba(150,230,255,0.96)'; ctx.beginPath(); ctx.moveTo(hx, y - hh); ctx.lineTo(hx + w, y - hh * 0.25); ctx.lineTo(hx + w * 0.6, y + s * 0.3); ctx.lineTo(hx - w * 0.6, y + s * 0.3); ctx.lineTo(hx - w, y - hh * 0.25); ctx.closePath(); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,0.42)'; ctx.beginPath(); ctx.moveTo(hx, y - hh); ctx.lineTo(hx - w, y - hh * 0.25); ctx.lineTo(hx - w * 0.2, y - hh * 0.2); ctx.closePath(); ctx.fill(); } }
  function vent(ctx, L, x, y, s, t, i) { const g = 0.55 + 0.45 * Math.sin(t * 2 + i * 1.3); ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(255,120,40,' + (0.12 + 0.12 * g) + ')'; ctx.beginPath(); ctx.arc(x, y - s * 0.4, s * 1.5, 0, 6.2832); ctx.fill(); ctx.restore(); ctx.fillStyle = 'rgba(22,14,14,1)'; ctx.beginPath(); ctx.moveTo(x - s * 0.9, y + s * 0.4); ctx.lineTo(x - s * 0.3, y - s * 0.5); ctx.lineTo(x + s * 0.3, y - s * 0.5); ctx.lineTo(x + s * 0.9, y + s * 0.4); ctx.closePath(); ctx.fill(); ctx.fillStyle = 'rgba(255,' + Math.round(150 + 80 * g) + ',70,0.95)'; ctx.beginPath(); ctx.ellipse(x, y - s * 0.5, s * 0.3, s * 0.1, 0, 0, 6.2832); ctx.fill(); for (let b = 0; b < 3; b++) { const u = fr(t * 0.22 + b / 3 + i * 0.37); ctx.fillStyle = 'rgba(120,110,110,' + 0.26 * (1 - u) + ')'; ctx.beginPath(); ctx.arc(x + Math.sin(u * 5 + i) * 6, y - s * 0.6 - u * 46, 4 + u * 9, 0, 6.2832); ctx.fill(); } }
  function shards(ctx, L, x, y, s, v) { ctx.fillStyle = 'rgba(0,10,30,0.3)'; ctx.beginPath(); ctx.ellipse(x + s * 0.4, y + s * 0.3, s, s * 0.2, 0, 0, 6.2832); ctx.fill(); for (let b = -1; b <= 1; b++) { const hx = x + b * s * 0.5, hh = s * (1.3 - Math.abs(b) * 0.5 + v * 0.3); ctx.fillStyle = b ? 'rgba(176,214,240,0.95)' : 'rgba(232,246,255,0.98)'; ctx.beginPath(); ctx.moveTo(hx, y - hh); ctx.lineTo(hx + s * 0.3, y + s * 0.3); ctx.lineTo(hx - s * 0.3, y + s * 0.3); ctx.closePath(); ctx.fill(); ctx.fillStyle = 'rgba(90,140,190,0.5)'; ctx.beginPath(); ctx.moveTo(hx, y - hh); ctx.lineTo(hx + s * 0.3, y + s * 0.3); ctx.lineTo(hx + s * 0.04, y + s * 0.3); ctx.closePath(); ctx.fill(); } }
  function clump(ctx, L, x, y, s, t, i) { ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(x + s * 0.2, y + s * 0.2, s, s * 0.22, 0, 0, 6.2832); ctx.fill(); for (let b = -2; b <= 2; b++) { const sw = Math.sin(t * 1.1 + i + b) * 2.5, hh = s * (1.1 - Math.abs(b) * 0.18); ctx.strokeStyle = b % 2 ? 'rgba(90,170,80,0.95)' : 'rgba(140,210,96,0.95)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x + b * s * 0.2, y + s * 0.15); ctx.quadraticCurveTo(x + b * s * 0.3, y - hh * 0.5, x + b * s * 0.42 + sw, y - hh); ctx.stroke(); } }
  function prop(ctx, id, L, x, y, s, v, t, i) { if (id === 'crystal') { if (v < 0.6) spires(ctx, L, x, y, s * 0.85, v, t, i); else rock(ctx, L, x, y, s * 0.7, v); } else if (id === 'ember') { if (v < 0.4) vent(ctx, L, x, y, s * 0.8, t, i); else rock(ctx, L, x, y, s * 0.8, v); } else if (id === 'frost') { if (v < 0.6) shards(ctx, L, x, y, s * 0.85, v); else rock(ctx, L, x, y, s * 0.7, v); } else if (id === 'marsh') { if (v < 0.7) clump(ctx, L, x, y, s * 0.8, t, i); else rock(ctx, L, x, y, s * 0.6, v); } else rock(ctx, L, x, y, s * (0.6 + v * 0.5), v); }

  /** the ground of the star: its relief map, what stands on it, and the scenery of its places (world space; under everything that lives) */
  G.drawBasin = function (ctx, W) {
    const id = idOf(W), L = LOOK[id] || LOOK.reef, seed = W.seed >>> 0, t = G.rt || 0, e = (G.sideEdge ? G.sideEdge(W) : 40) + 10, span = W.ww - 2 * e, top = 40, bot = W.wh - 26, v = G.view, mid0 = G.centreOf ? G.centreOf(W) : { x: W.ww / 2, y: W.wh / 2 };
    const x0 = -v.ox / v.scale - 120, x1 = x0 + v.w / v.scale + 240, y0 = -v.oy / v.scale - 120, y1 = y0 + v.h / v.scale + 240;
    ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    const M = mapFor(W), mp = M.hi || M.lo;
    if (mp && mp.cv) { ctx.imageSmoothingEnabled = true; ctx.drawImage(mp.cv, -MARGIN, -MARGIN, W.ww + 2 * MARGIN, W.wh + 2 * MARGIN);
      if (mp.em && mp.done) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.55 + 0.3 * Math.sin(t * 1.3); ctx.drawImage(mp.em, -MARGIN, -MARGIN, W.ww + 2 * MARGIN, W.wh + 2 * MARGIN); ctx.restore(); }
      if (v.scale > 0.95) { const pat = ctx.createPattern(grainTile(), 'repeat'); if (pat) { ctx.save(); ctx.globalCompositeOperation = 'soft-light'; ctx.globalAlpha = Math.min(0.5, (v.scale - 0.95) * 0.5); ctx.scale(0.6, 0.6); ctx.fillStyle = pat; ctx.fillRect(x0 / 0.6, y0 / 0.6, (x1 - x0) / 0.6, (y1 - y0) / 0.6); ctx.restore(); } } }
    // the slow shadows of clouds
    for (let i = 0; i < 4; i++) { const r = 300 + 160 * rnd(seed, i, 41), x = ((rnd(seed, i, 42) * (W.ww + 2 * r) + t * (5 + 3 * i)) % (W.ww + 2 * r)) - r, y = rnd(seed, i, 43) * W.wh + Math.sin(t * 0.03 + i) * 60; if (x + r < x0 || x - r > x1 || y + r < y0 || y - r > y1) continue; const g = ctx.createRadialGradient(x, y, r * 0.2, x, y, r); g.addColorStop(0, 'rgba(0,0,0,0.20)'); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.6, 0, 0, 6.2832); ctx.fill(); }
    if (G.drawSociety) { try { G.drawSociety(ctx, W, L); } catch (er) { if (!G.drawBasin.err) { G.drawBasin.err = 1; console.error(er); } } }      // what the colony has made of the ground: its territory, its paths, its plaza (68d_ground.js)
    // the standing things, far ones first
    const n = Math.round(14 + span * (bot - top) / 150000), P = [];
    for (let i = 0; i < n; i++) { const x = e + rnd(seed, i, 21) * span, y = top + rnd(seed, i, 22) * (bot - top), s = 12 + rnd(seed, i, 23) * 20; if (x + s * 3 < x0 || x - s * 3 > x1 || y + s * 2 < y0 || y - s * 3 > y1) continue; if (Math.hypot(x - mid0.x, (y - mid0.y) * 1.4) < 380 || (G.siteAt && G.siteAt(W, x, y, 40))) continue; P.push([x, y, s, rnd(seed, i, 24), i]); }
    P.sort(function (a, b) { return a[1] - b[1]; }).forEach(function (q) { prop(ctx, id, L, q[0], q[1], q[2], q[3], t, q[4]); });
    sites(ctx, W, L, id, seed, t, x0, y0, x1, y1); beacons(ctx, W, L, seed, t);
    ctx.restore();
  };

  // ── the places of the star: the scenery of its deposits and feeding grounds (where they are is said by 54j_order.js; their ground is tinted into the map) ──
  function sites(ctx, W, L, id, seed, t, x0, y0, x1, y1) {
    const S = G.sitesOf ? G.sitesOf(W) : [];
    for (let i = 0; i < S.length; i++) { const s = S[i]; if (s.x + s.r < x0 || s.x - s.r > x1 || s.y + s.r < y0 || s.y - s.r > y1) continue; const ry = s.r * 0.8;
      if (s.k === 'grove') { ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(s.x, s.y, s.r * 0.1, s.x, s.y, s.r * 1.05); g.addColorStop(0, 'rgba(60,220,150,' + (0.13 + 0.03 * Math.sin(t * 0.8 + i)) + ')'); g.addColorStop(1, 'rgba(60,220,150,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(s.x, s.y, s.r * 1.05, ry * 1.05, 0, 0, 6.2832); ctx.fill(); ctx.restore();
        for (let q = 0; q < 18; q++) { const a = q * 0.349 + rnd(seed, i * 31 + q, 71), d = (0.84 + 0.22 * rnd(seed, i * 31 + q, 72)), px = s.x + Math.cos(a) * s.r * d, py = s.y + Math.sin(a) * ry * d, h = 18 + 18 * rnd(seed, i * 31 + q, 73), sw = Math.sin(t * 1.2 + q + i) * 3; ctx.fillStyle = 'rgba(0,0,0,0.28)'; ctx.beginPath(); ctx.ellipse(px + 4, py + 1, 7, 2.2, 0, 0, 6.2832); ctx.fill(); ctx.strokeStyle = 'rgba(40,130,96,1)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(px, py); ctx.quadraticCurveTo(px + sw * 0.4, py - h * 0.6, px + sw, py - h); ctx.stroke(); ctx.fillStyle = 'rgba(120,255,190,' + (0.75 + 0.25 * Math.sin(t * 2 + q)) + ')'; ctx.beginPath(); ctx.arc(px + sw, py - h, 4, 0, 6.2832); ctx.fill(); ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(120,255,190,0.16)'; ctx.beginPath(); ctx.arc(px + sw, py - h, 10, 0, 6.2832); ctx.fill(); ctx.restore(); } }
      else if (s.k === 'quarry') { for (let q = 0; q < 11; q++) { const a = q * 0.571 + 0.3, px = s.x + Math.cos(a) * s.r * 0.95, py = s.y + Math.sin(a) * ry * 0.95, z = 14 + 14 * rnd(seed, q, 81); ctx.fillStyle = 'rgba(0,0,0,0.38)'; ctx.beginPath(); ctx.ellipse(px + z * 0.5, py + z * 0.4, z * 1.2, z * 0.26, 0, 0, 6.2832); ctx.fill(); ctx.fillStyle = 'rgba(92,100,114,1)'; ctx.beginPath(); ctx.moveTo(px - z, py + z * 0.4); ctx.lineTo(px - z * 0.6, py - z * 0.5); ctx.lineTo(px, py - z * (0.8 + 0.4 * rnd(seed, q, 82))); ctx.lineTo(px + z * 0.7, py - z * 0.4); ctx.lineTo(px + z, py + z * 0.4); ctx.closePath(); ctx.fill(); ctx.fillStyle = 'rgba(206,214,226,0.42)'; ctx.beginPath(); ctx.moveTo(px - z * 0.6, py - z * 0.5); ctx.lineTo(px, py - z * (0.8 + 0.4 * rnd(seed, q, 82))); ctx.lineTo(px, py); ctx.lineTo(px - z * 0.5, py + z * 0.4); ctx.lineTo(px - z, py + z * 0.4); ctx.closePath(); ctx.fill(); } }
      else if (s.k === 'reeds') { ctx.lineWidth = 2.2; for (let q = 0; q < 40; q++) { const a = rnd(seed, q, 91) * 6.2832, d = Math.sqrt(rnd(seed, q, 92)) * 0.95, px = s.x + Math.cos(a) * s.r * d, py = s.y + Math.sin(a) * ry * d, h = 16 + 14 * rnd(seed, q, 93), sw = Math.sin(t * 1.3 + q) * 2.5; ctx.strokeStyle = q % 3 ? 'rgba(176,206,96,0.9)' : 'rgba(120,160,70,0.9)'; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + sw, py - h); ctx.moveTo(px + 4, py); ctx.lineTo(px + 5 + sw, py - h * 0.8); ctx.stroke(); } }
      else if (s.k === 'shells') { ctx.strokeStyle = 'rgba(255,240,210,0.5)'; ctx.lineWidth = 1.8; for (let q = 0; q < 14; q++) { const a = rnd(seed, q, 95) * 6.2832, d = Math.sqrt(rnd(seed, q, 96)) * 0.9, px = s.x + Math.cos(a) * s.r * d, py = s.y + Math.sin(a) * ry * d; ctx.beginPath(); ctx.arc(px, py, 7, 3.1416, 0); ctx.stroke(); } }
    }
  }
  function beacons(ctx, W, L, seed, t) { const e = (G.sideEdge ? G.sideEdge(W) : 40) + 40; [[e + 30, 70], [W.ww - e - 30, 80], [e + 40, W.wh - 60], [W.ww - e - 40, W.wh - 70]].forEach(function (q, i) { const x = q[0], y = q[1], on = Math.sin(t * 2.4 + i * 2.1) > 0.2;
      ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.beginPath(); ctx.ellipse(x + 5, y + 1, 11, 2.8, 0, 0, 6.2832); ctx.fill(); ctx.strokeStyle = 'rgba(16,24,36,0.95)'; ctx.lineWidth = 3.4; ctx.beginPath(); ctx.moveTo(x - 5, y); ctx.lineTo(x, y - 30); ctx.lineTo(x + 5, y); ctx.moveTo(x - 3.2, y - 11); ctx.lineTo(x + 3.2, y - 11); ctx.stroke(); ctx.strokeStyle = 'rgba(170,190,210,0.9)'; ctx.lineWidth = 1.3; ctx.stroke();
      if (on) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = L.glow; ctx.globalAlpha = 0.3; ctx.beginPath(); ctx.arc(x, y - 32, 11, 0, 6.2832); ctx.fill(); ctx.restore(); } ctx.fillStyle = on ? L.glow : 'rgba(60,70,84,1)'; ctx.beginPath(); ctx.arc(x, y - 32, 2.6, 0, 6.2832); ctx.fill(); }); }
})();
