// ── The terrain of a star ──
// A star is ground, not a pond: there is no water and no shore to see. Every star has its own ground (57ya_stars.js says which terrain it has), in two
// levels: the HIGH GROUND (a plateau along the top) and the LOW GROUND (the wide basin below it), with a rim between them. Those made for the high
// ground live up there, those made for the low ground down here, as before; only what it looks like has changed. It is scenery: nothing here is
// touched, eaten or built with, and it lies under everything that lives. Each star's scenery is laid out from its own seed, so a star looks the same
// every time you come to it. A few old BEACONS stand on every star: thin pylons with a light, left by whoever came before.
//     rust (id reef)   red dust, old craters, wind ripples: the nearest to Mars
//     crag             grey broken rock, deep craters, boulders
//     moss (id marsh)  dark moss fields with black pools
//     crystal          violet rock with crystal spires and a glow
//     ember            black glass with glowing cracks and vents
//     frost            blue ice with crevasses and ice blocks, snow on the high ground
(function () {
  'use strict';
  if (typeof document === 'undefined') return;
  const LOOK = {
    reef: { basin: ['#55291a', '#391a11', '#200e0a'], high: ['#b4673c', '#93492a', '#733721'], rim: 'rgba(240,176,120,0.85)', cliff: '58,24,14', dark: '30,10,6', lite: '255,190,140', glow: '#ffb080', tuft: null },
    crag: { basin: ['#2f343d', '#1f232b', '#13161b'], high: ['#80858f', '#646973', '#4e535c'], rim: 'rgba(214,220,230,0.8)', cliff: '30,33,40', dark: '8,10,14', lite: '210,216,228', glow: '#c9d3dc', tuft: null },
    marsh: { basin: ['#1d3f29', '#122b1c', '#0a1b12'], high: ['#5c8040', '#476831', '#375426'], rim: 'rgba(184,224,134,0.8)', cliff: '18,44,26', dark: '4,14,8', lite: '170,230,130', glow: '#b9f27a', tuft: 'rgba(170,214,96,0.6)' },
    crystal: { basin: ['#2d1c54', '#1d113a', '#110a26'], high: ['#7350a8', '#5a3c88', '#452d6c'], rim: 'rgba(214,184,255,0.85)', cliff: '30,16,60', dark: '10,4,24', lite: '190,160,255', glow: '#8ef0ff', tuft: null },
    ember: { basin: ['#2c1311', '#1b0b0a', '#0e0505'], high: ['#40302e', '#2f2221', '#221817'], rim: 'rgba(255,146,70,0.9)', cliff: '18,6,5', dark: '6,2,2', lite: '255,150,80', glow: '#ff9a4c', tuft: null },
    frost: { basin: ['#2f6184', '#1e4463', '#132c44'], high: ['#e0ebf4', '#c5d8e7', '#a9c4d9'], rim: 'rgba(255,255,255,0.95)', cliff: '70,112,146', dark: '10,30,52', lite: '220,240,255', glow: '#dff4ff', tuft: null } };
  const idOf = function (W) { return G.terrainOf ? G.terrainOf(W).id : 'reef'; };
  /** the colours of the star being shown (50_render.js paints the ground with them) */
  G.terrainLook = function (W) { return LOOK[idOf(W || G.W)] || LOOK.reef; };
  const fr = function (v) { return v - Math.floor(v); };
  function rnd(seed, i, k) { return fr(Math.sin(i * 127.1 + k * 311.7 + (seed % 9973) * 0.731) * 43758.5453); }
  const rimY = function (x, sy) { return sy + 9 * Math.sin(x * 0.011) + 6 * Math.sin(x * 0.031); };      // (rock does not move)

  // ── the pieces of scenery ──
  function crater(ctx, L, x, y, s) { ctx.fillStyle = 'rgba(' + L.dark + ',0.34)'; ctx.beginPath(); ctx.ellipse(x, y, s * 1.5, s * 0.62, 0, 0, 6.2832); ctx.fill(); ctx.strokeStyle = 'rgba(' + L.lite + ',0.22)'; ctx.lineWidth = Math.max(1.5, s * 0.12); ctx.beginPath(); ctx.ellipse(x, y, s * 1.5, s * 0.62, 0, 3.3, 6.1); ctx.stroke(); ctx.strokeStyle = 'rgba(' + L.dark + ',0.4)'; ctx.beginPath(); ctx.ellipse(x, y, s * 1.5, s * 0.62, 0, 0.2, 2.9); ctx.stroke(); }
  function rock(ctx, L, x, y, s, v) { ctx.fillStyle = 'rgba(' + L.dark + ',0.4)'; ctx.beginPath(); ctx.ellipse(x + s * 0.25, y + s * 0.4, s * 1.1, s * 0.24, 0, 0, 6.2832); ctx.fill(); ctx.fillStyle = 'rgba(' + L.cliff + ',0.95)'; ctx.beginPath(); ctx.moveTo(x - s, y + s * 0.4); ctx.lineTo(x - s * 0.7, y - s * 0.3); ctx.lineTo(x - s * 0.1, y - s * (0.55 + v * 0.5)); ctx.lineTo(x + s * 0.6, y - s * 0.35); ctx.lineTo(x + s, y + s * 0.4); ctx.closePath(); ctx.fill(); ctx.fillStyle = 'rgba(' + L.lite + ',0.3)'; ctx.beginPath(); ctx.moveTo(x - s * 0.7, y - s * 0.3); ctx.lineTo(x - s * 0.1, y - s * (0.55 + v * 0.5)); ctx.lineTo(x - s * 0.02, y - s * 0.05); ctx.closePath(); ctx.fill(); }
  function ripples(ctx, L, x, y, s) { ctx.strokeStyle = 'rgba(' + L.lite + ',0.13)'; ctx.lineWidth = 2; for (let b = 0; b < 4; b++) { ctx.beginPath(); ctx.moveTo(x - s * 2.6, y + b * s * 0.36); ctx.quadraticCurveTo(x, y + b * s * 0.36 - s * 0.5, x + s * 2.6, y + b * s * 0.36 + s * 0.1); ctx.stroke(); } }
  function pool(ctx, L, x, y, s) { ctx.fillStyle = 'rgba(' + L.dark + ',0.62)'; ctx.strokeStyle = 'rgba(' + L.lite + ',0.3)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.ellipse(x, y, s * 1.9, s * 0.6, 0, 0, 6.2832); ctx.fill(); ctx.stroke(); ctx.fillStyle = 'rgba(' + L.lite + ',0.12)'; ctx.beginPath(); ctx.ellipse(x - s * 0.5, y - s * 0.14, s * 0.7, s * 0.14, 0, 0, 6.2832); ctx.fill(); }
  function clump(ctx, L, x, y, s) { ctx.fillStyle = 'rgba(' + L.lite + ',0.2)'; for (let b = -1; b <= 1; b++) { ctx.beginPath(); ctx.arc(x + b * s * 0.6, y - Math.abs(b) * -s * 0.1, s * (0.6 - Math.abs(b) * 0.12), 3.1416, 0); ctx.fill(); } }
  function spires(ctx, L, x, y, s, v, t, i) { const g = 0.6 + 0.4 * Math.sin(t * 1.5 + i); ctx.fillStyle = 'rgba(140,240,255,' + (0.09 + 0.07 * g) + ')'; ctx.beginPath(); ctx.arc(x, y - s * 0.5, s * 1.4, 0, 6.2832); ctx.fill(); for (let b = -1; b <= 1; b++) { const hx = x + b * s * 0.42, hh = s * (1.5 - Math.abs(b) * 0.6 + v * 0.4), w = s * 0.24; ctx.fillStyle = b ? 'rgba(170,130,240,0.9)' : 'rgba(150,230,255,0.92)'; ctx.beginPath(); ctx.moveTo(hx, y - hh); ctx.lineTo(hx + w, y - hh * 0.25); ctx.lineTo(hx + w * 0.6, y + s * 0.3); ctx.lineTo(hx - w * 0.6, y + s * 0.3); ctx.lineTo(hx - w, y - hh * 0.25); ctx.closePath(); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.beginPath(); ctx.moveTo(hx, y - hh); ctx.lineTo(hx - w, y - hh * 0.25); ctx.lineTo(hx - w * 0.2, y - hh * 0.2); ctx.closePath(); ctx.fill(); } }
  function crack(ctx, L, seed, x, y, s, t, i, hot) { const g = 0.55 + 0.45 * Math.sin(t * 2.2 + i * 1.7); ctx.strokeStyle = hot ? 'rgba(255,' + Math.round(120 + 70 * g) + ',50,' + (0.45 + 0.4 * g) + ')' : 'rgba(' + L.dark + ',0.7)'; ctx.lineWidth = hot ? 2.4 : 3; ctx.beginPath(); ctx.moveTo(x - s * 1.8, y); for (let b = 1; b <= 6; b++) ctx.lineTo(x - s * 1.8 + b * s * 0.6, y + (rnd(seed, i * 7 + b, 5) - 0.5) * s * 0.9); ctx.stroke(); ctx.strokeStyle = hot ? 'rgba(255,225,160,' + 0.5 * g + ')' : 'rgba(' + L.lite + ',0.35)'; ctx.lineWidth = 0.9; ctx.stroke(); }
  function vent(ctx, L, x, y, s, t, i) { const g = 0.55 + 0.45 * Math.sin(t * 2 + i * 1.3); ctx.fillStyle = 'rgba(255,130,50,' + (0.10 + 0.10 * g) + ')'; ctx.beginPath(); ctx.arc(x, y - s * 0.4, s * 1.2, 0, 6.2832); ctx.fill(); ctx.fillStyle = 'rgba(26,18,20,0.95)'; ctx.beginPath(); ctx.moveTo(x - s * 0.9, y + s * 0.4); ctx.lineTo(x - s * 0.3, y - s * 0.5); ctx.lineTo(x + s * 0.3, y - s * 0.5); ctx.lineTo(x + s * 0.9, y + s * 0.4); ctx.closePath(); ctx.fill(); ctx.fillStyle = 'rgba(255,' + Math.round(150 + 80 * g) + ',70,0.95)'; ctx.beginPath(); ctx.ellipse(x, y - s * 0.5, s * 0.3, s * 0.1, 0, 0, 6.2832); ctx.fill(); for (let b = 0; b < 3; b++) { const u = fr(t * 0.22 + b / 3 + i * 0.37); ctx.fillStyle = 'rgba(120,110,110,' + 0.26 * (1 - u) + ')'; ctx.beginPath(); ctx.arc(x + Math.sin(u * 5 + i) * 6, y - s * 0.6 - u * 46, 4 + u * 9, 0, 6.2832); ctx.fill(); } }
  function shards(ctx, L, x, y, s, v) { for (let b = -1; b <= 1; b++) { const hx = x + b * s * 0.5, hh = s * (1.3 - Math.abs(b) * 0.5 + v * 0.3); ctx.fillStyle = b ? 'rgba(176,214,240,0.9)' : 'rgba(232,246,255,0.95)'; ctx.beginPath(); ctx.moveTo(hx, y - hh); ctx.lineTo(hx + s * 0.3, y + s * 0.3); ctx.lineTo(hx - s * 0.3, y + s * 0.3); ctx.closePath(); ctx.fill(); ctx.fillStyle = 'rgba(90,140,190,0.45)'; ctx.beginPath(); ctx.moveTo(hx, y - hh); ctx.lineTo(hx + s * 0.3, y + s * 0.3); ctx.lineTo(hx + s * 0.04, y + s * 0.3); ctx.closePath(); ctx.fill(); } }
  /** one piece of scenery of this terrain, chosen by v (0..1): the commonest first */
  function piece(ctx, id, L, seed, x, y, s, v, t, i) {
    if (id === 'reef') { if (v < 0.4) crater(ctx, L, x, y, s); else if (v < 0.75) ripples(ctx, L, x, y, s); else rock(ctx, L, x, y, s * 0.7, v); }
    else if (id === 'crag') { if (v < 0.5) crater(ctx, L, x, y, s * 1.1); else if (v < 0.9) rock(ctx, L, x, y, s * 0.85, v); else crack(ctx, L, seed, x, y, s, t, i, false); }
    else if (id === 'marsh') { if (v < 0.4) pool(ctx, L, x, y, s); else if (v < 0.85) clump(ctx, L, x, y, s); else rock(ctx, L, x, y, s * 0.6, v); }
    else if (id === 'crystal') { if (v < 0.35) spires(ctx, L, x, y, s * 0.8, v, t, i); else if (v < 0.7) crater(ctx, L, x, y, s); else crack(ctx, L, seed, x, y, s, t, i, false); }
    else if (id === 'ember') { if (v < 0.55) crack(ctx, L, seed, x, y, s, t, i, true); else if (v < 0.8) vent(ctx, L, x, y, s * 0.8, t, i); else crater(ctx, L, x, y, s); }
    else { if (v < 0.4) crack(ctx, L, seed, x, y, s, t, i, false); else if (v < 0.75) shards(ctx, L, x, y, s * 0.8, v); else crater(ctx, L, x, y, s); }
  }

  /** the low ground: its scenery, all over the basin (world space; under everything that lives) */
  G.drawBasin = function (ctx, W) {
    const id = idOf(W), L = LOOK[id] || LOOK.reef, seed = W.seed >>> 0, t = G.rt || 0, sy = G.shoreY ? G.shoreY(W) : W.wh * 0.25, e = (G.sideEdge ? G.sideEdge(W) : 40) + 10, span = W.ww - 2 * e, top = G.FLAT ? 34 : sy + 46, bot = W.wh - 22, v = G.view, mid0 = G.centreOf ? G.centreOf(W) : { x: W.ww / 2, y: W.wh / 2 };
    const x0 = -v.ox / v.scale - 120, x1 = x0 + v.w / v.scale + 240, y0 = -v.oy / v.scale - 120, y1 = y0 + v.h / v.scale + 240;
    ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    // wide soft patches of lighter and darker ground
    for (let i = 0; i < 9; i++) { const x = e + rnd(seed, i, 61) * span, y = top + rnd(seed, i, 62) * (bot - top), r = 150 + rnd(seed, i, 63) * 190; if (x + r < x0 || x - r > x1 || y + r < y0 || y - r > y1) continue; const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, 'rgba(' + (i % 2 ? L.lite : L.dark) + ',' + (i % 2 ? 0.07 : 0.2) + ')'); g.addColorStop(1, 'rgba(' + (i % 2 ? L.lite : L.dark) + ',0)'); ctx.fillStyle = g; ctx.fillRect(x - r, y - r * 0.6, r * 2, r * 1.2); }
    const n = Math.round(26 + span * (bot - top) / 52000);
    for (let i = 0; i < n; i++) { const x = e + rnd(seed, i, 21) * span, y = top + rnd(seed, i, 22) * (bot - top), s = 12 + rnd(seed, i, 23) * 24; if (x + s * 3 < x0 || x - s * 3 > x1 || y + s * 2 < y0 || y - s * 3 > y1) continue; if (G.FLAT && (Math.hypot(x - mid0.x, (y - mid0.y) * 1.4) < 250 || (G.siteAt && G.siteAt(W, x, y, 30)))) continue;      /* (the middle, where the colony stands, and the deposits are kept clear) */ piece(ctx, id, L, seed, x, y, s, rnd(seed, i, 24), t, i); }
    if (G.FLAT) { sites(ctx, W, L, id, seed, t, x0, y0, x1, y1); beacons(ctx, W, L, seed, t); }
    ctx.restore();
  };

  // ── the places of the star: its roads, its deposits and its feeding grounds (where they are is said by 54j_order.js) ──
  function sites(ctx, W, L, id, seed, t, x0, y0, x1, y1) {
    const S = G.sitesOf ? G.sitesOf(W) : [], c = G.centreOf(W);
    // the trodden ground of the colony itself
    { const g = ctx.createRadialGradient(c.x, c.y - 10, 30, c.x, c.y - 10, 250); g.addColorStop(0, 'rgba(' + L.lite + ',0.13)'); g.addColorStop(1, 'rgba(' + L.lite + ',0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(c.x, c.y - 10, 420, 210, 0, 0, 6.2832); ctx.fill(); }
    for (let i = 0; i < S.length; i++) { const s = S[i]; if (s.x + s.r < x0 || s.x - s.r > x1 || s.y + s.r < y0 || s.y - s.r > y1) continue; const ry = s.r * 0.8;
      if (s.k === 'grove') { const g = ctx.createRadialGradient(s.x, s.y, s.r * 0.15, s.x, s.y, s.r * 1.05); g.addColorStop(0, 'rgba(80,220,140,0.22)'); g.addColorStop(0.75, 'rgba(80,220,140,0.10)'); g.addColorStop(1, 'rgba(80,220,140,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(s.x, s.y, s.r * 1.05, ry * 1.05, 0, 0, 6.2832); ctx.fill();
        for (let q = 0; q < 16; q++) { const a = q * 0.3927 + rnd(seed, i * 31 + q, 71), d = (0.82 + 0.2 * rnd(seed, i * 31 + q, 72)), px = s.x + Math.cos(a) * s.r * d, py = s.y + Math.sin(a) * ry * d, h = 16 + 14 * rnd(seed, i * 31 + q, 73), sw = Math.sin(t * 1.2 + q + i) * 3; ctx.strokeStyle = 'rgba(70,170,110,0.75)'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(px, py); ctx.quadraticCurveTo(px + sw * 0.4, py - h * 0.6, px + sw, py - h); ctx.stroke(); ctx.fillStyle = 'rgba(150,255,190,' + (0.55 + 0.25 * Math.sin(t * 2 + q)) + ')'; ctx.beginPath(); ctx.arc(px + sw, py - h, 3.2, 0, 6.2832); ctx.fill(); } }
      else if (s.k === 'quarry') { ctx.fillStyle = 'rgba(' + L.dark + ',0.5)'; ctx.beginPath(); ctx.ellipse(s.x, s.y, s.r, ry, 0, 0, 6.2832); ctx.fill(); ctx.strokeStyle = 'rgba(' + L.lite + ',0.25)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(s.x, s.y, s.r, ry, 0, 3.3, 6.1); ctx.stroke();
        for (let q = 0; q < 9; q++) { const a = q * 0.698 + 0.3, px = s.x + Math.cos(a) * s.r * 0.95, py = s.y + Math.sin(a) * ry * 0.95, z = 13 + 12 * rnd(seed, q, 81); ctx.fillStyle = 'rgba(96,104,116,0.95)'; ctx.beginPath(); ctx.moveTo(px - z, py + z * 0.4); ctx.lineTo(px - z * 0.6, py - z * 0.5); ctx.lineTo(px, py - z * (0.8 + 0.4 * rnd(seed, q, 82))); ctx.lineTo(px + z * 0.7, py - z * 0.4); ctx.lineTo(px + z, py + z * 0.4); ctx.closePath(); ctx.fill(); ctx.fillStyle = 'rgba(200,208,220,0.35)'; ctx.beginPath(); ctx.moveTo(px - z * 0.6, py - z * 0.5); ctx.lineTo(px, py - z * (0.8 + 0.4 * rnd(seed, q, 82))); ctx.lineTo(px, py); ctx.closePath(); ctx.fill(); } }
      else if (s.k === 'reeds') { ctx.fillStyle = 'rgba(60,110,50,0.3)'; ctx.beginPath(); ctx.ellipse(s.x, s.y, s.r, ry, 0, 0, 6.2832); ctx.fill();
        ctx.strokeStyle = 'rgba(176,206,96,0.6)'; ctx.lineWidth = 2; for (let q = 0; q < 34; q++) { const a = rnd(seed, q, 91) * 6.2832, d = Math.sqrt(rnd(seed, q, 92)) * 0.95, px = s.x + Math.cos(a) * s.r * d, py = s.y + Math.sin(a) * ry * d, h = 14 + 12 * rnd(seed, q, 93), sw = Math.sin(t * 1.3 + q) * 2.5; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + sw, py - h); ctx.moveTo(px + 4, py); ctx.lineTo(px + 5 + sw, py - h * 0.8); ctx.stroke(); } }
      else if (s.k === 'shells') { ctx.fillStyle = 'rgba(230,214,170,0.22)'; ctx.beginPath(); ctx.ellipse(s.x, s.y, s.r, ry, 0, 0, 6.2832); ctx.fill(); ctx.strokeStyle = 'rgba(255,240,210,0.35)'; ctx.lineWidth = 1.6; for (let q = 0; q < 12; q++) { const a = rnd(seed, q, 95) * 6.2832, d = Math.sqrt(rnd(seed, q, 96)) * 0.9, px = s.x + Math.cos(a) * s.r * d, py = s.y + Math.sin(a) * ry * d; ctx.beginPath(); ctx.arc(px, py, 7, 3.1416, 0); ctx.stroke(); } }
    }
  }
  function beacons(ctx, W, L, seed, t) { const e = (G.sideEdge ? G.sideEdge(W) : 40) + 40; [[e + 30, 70], [W.ww - e - 30, 80], [e + 40, W.wh - 60], [W.ww - e - 40, W.wh - 70]].forEach(function (q, i) { const x = q[0], y = q[1], on = Math.sin(t * 2.4 + i * 2.1) > 0.2;
      ctx.fillStyle = 'rgba(8,14,24,0.45)'; ctx.beginPath(); ctx.ellipse(x, y + 1, 9, 2.6, 0, 0, 6.2832); ctx.fill(); ctx.strokeStyle = 'rgba(16,24,36,0.95)'; ctx.lineWidth = 3.4; ctx.beginPath(); ctx.moveTo(x - 5, y); ctx.lineTo(x, y - 30); ctx.lineTo(x + 5, y); ctx.moveTo(x - 3.2, y - 11); ctx.lineTo(x + 3.2, y - 11); ctx.stroke(); ctx.strokeStyle = 'rgba(170,190,210,0.9)'; ctx.lineWidth = 1.3; ctx.stroke();
      if (on) { ctx.fillStyle = L.glow; ctx.globalAlpha = 0.28; ctx.beginPath(); ctx.arc(x, y - 32, 9, 0, 6.2832); ctx.fill(); ctx.globalAlpha = 1; } ctx.fillStyle = on ? L.glow : 'rgba(60,70,84,1)'; ctx.beginPath(); ctx.arc(x, y - 32, 2.6, 0, 6.2832); ctx.fill(); }); }

  /** the high ground: the plateau, its rim and the drop below it, and what stands on it (world space) */
  G.drawHeights = function (ctx, W, sy) {
    const id = idOf(W), L = LOOK[id] || LOOK.reef, seed = W.seed >>> 0, t = G.rt || 0, e = (G.sideEdge ? G.sideEdge(W) : 40) + 30, span = W.ww - 2 * e, top = 26, bot = Math.max(top + 20, sy - 54);
    ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    // the shadow the plateau throws on the low ground, then the plateau itself
    { const g = ctx.createLinearGradient(0, sy - 6, 0, sy + 44); g.addColorStop(0, 'rgba(' + L.dark + ',0.75)'); g.addColorStop(0.35, 'rgba(' + L.cliff + ',0.6)'); g.addColorStop(1, 'rgba(' + L.dark + ',0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-50, sy - 20); for (let x = -50; x <= W.ww + 50; x += 40) ctx.lineTo(x, rimY(x, sy, t) - 2); ctx.lineTo(W.ww + 50, sy + 46); ctx.lineTo(-50, sy + 46); ctx.closePath(); ctx.fill(); }
    { const g = ctx.createLinearGradient(0, 0, 0, sy + 10); g.addColorStop(0, L.high[2]); g.addColorStop(0.55, L.high[1]); g.addColorStop(1, L.high[0]); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-50, -50); ctx.lineTo(W.ww + 50, -50); for (let x = W.ww + 50; x >= -50; x -= 40) ctx.lineTo(x, rimY(x, sy, t)); ctx.closePath(); ctx.fill(); }
    // the face of the drop: a darker band under the rim, with a few streaks
    ctx.fillStyle = 'rgba(' + L.cliff + ',0.9)'; ctx.beginPath(); for (let x = -50; x <= W.ww + 50; x += 40) { const y = rimY(x, sy, t); if (x === -50) ctx.moveTo(x, y); else ctx.lineTo(x, y); } for (let x = W.ww + 50; x >= -50; x -= 40) ctx.lineTo(x, rimY(x, sy, t) + 11 + 3 * Math.sin(x * 0.05)); ctx.closePath(); ctx.fill();
    if (L.tuft) { ctx.strokeStyle = L.tuft; ctx.lineWidth = 2; for (let i = 0; i < 46; i++) { const x = (i * 0.618034 % 1) * W.ww, y = 10 + ((i * 0.3711) % 1) * (sy - 26), sw = Math.sin(t * 1.4 + i) * 3; ctx.beginPath(); ctx.moveTo(x, y + 8); ctx.lineTo(x + sw, y - 2); ctx.moveTo(x + 4, y + 8); ctx.lineTo(x + 6 + sw, y); ctx.stroke(); } }
    const n = Math.round(9 + span / 210);
    for (let i = 0; i < n; i++) { const x = e + rnd(seed, i, 1) * span, y = top + rnd(seed, i, 2) * (bot - top), s = 12 + rnd(seed, i, 3) * 22; piece(ctx, id, L, seed, x, y, s, rnd(seed, i, 4), t, i + 100); }
    if (id === 'frost') { ctx.fillStyle = 'rgba(255,255,255,0.4)'; for (let i = 0; i < 7; i++) { const x = e + rnd(seed, i, 31) * span, y = top + rnd(seed, i, 32) * (bot - top); ctx.beginPath(); ctx.ellipse(x, y, 40 + rnd(seed, i, 33) * 50, 9, 0, 0, 6.2832); ctx.fill(); } }
    // the old beacons: thin pylons with a light, the same on every star
    for (let i = 0; i < 3; i++) { const x = e + (0.14 + 0.36 * i + rnd(seed, i, 9) * 0.1) * span, y = top + 14 + rnd(seed, i, 10) * Math.max(10, bot - top - 30), on = Math.sin(t * 2.4 + i * 2.1) > 0.2;
      ctx.fillStyle = 'rgba(8,14,24,0.45)'; ctx.beginPath(); ctx.ellipse(x, y + 1, 9, 2.6, 0, 0, 6.2832); ctx.fill();
      ctx.strokeStyle = 'rgba(16,24,36,0.95)'; ctx.lineWidth = 3.4; ctx.beginPath(); ctx.moveTo(x - 5, y); ctx.lineTo(x, y - 30); ctx.lineTo(x + 5, y); ctx.moveTo(x - 3.2, y - 11); ctx.lineTo(x + 3.2, y - 11); ctx.stroke();
      ctx.strokeStyle = 'rgba(170,190,210,0.9)'; ctx.lineWidth = 1.3; ctx.stroke();
      if (on) { ctx.fillStyle = L.glow; ctx.globalAlpha = 0.28; ctx.beginPath(); ctx.arc(x, y - 32, 9, 0, 6.2832); ctx.fill(); ctx.globalAlpha = 1; } ctx.fillStyle = on ? L.glow : 'rgba(60,70,84,1)'; ctx.beginPath(); ctx.arc(x, y - 32, 2.6, 0, 6.2832); ctx.fill(); }
    // the rim, catching the light
    ctx.strokeStyle = L.rim; ctx.lineWidth = 2.2; ctx.beginPath(); for (let x = -50; x <= W.ww + 50; x += 40) { const y = rimY(x, sy, t); if (x === -50) ctx.moveTo(x, y); else ctx.lineTo(x, y); } ctx.stroke();
    ctx.restore();
  };
})();
