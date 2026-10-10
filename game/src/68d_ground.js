// ── What a colony makes of the ground it lives on ──
// Drawn on the relief map of the star, under everything that stands or lives (52c_terrain.js calls G.drawSociety). A society shows on its ground:
//     its TERRITORY     a soft field of its colour round everything it has built, with a brighter edge: it spreads as the colony builds
//                       (yours blue; a rival's, on its own star, red)
//     its PATHS         nobody lays a road. Where creatures walk again and again the ground wears pale, so paths appear by themselves between
//                       the Heart, the deposits and the feeding grounds, and fade again where nobody goes any more
//     its PLAZA         the ground round the Heart is paved, wider with each step the colony takes (founded, growing, thriving, great), and lit
//                       at night-coloured hours by lamps round it
//     its BATTLEFIELDS  where a fight was, the ground stays scorched for a while
// Nothing here is kept in the save: the paths wear in again within a minute or two of play.
(function () {
  'use strict';
  if (typeof document === 'undefined') return;
  const MINE = [70, 200, 255], FOE = [255, 64, 88], CELL = 16;
  const fr = function (v) { return v - Math.floor(v); }, rnd = function (i, k) { return fr(Math.sin(i * 127.1 + k * 311.7) * 43758.5453); };
  const sstep = function (a, b, x) { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  let S = null;      // { key, gw, gh, foot, terr (canvas), path (canvas), tT, pT }
  const SCORCH = [];
  function state(W) { const key = (W.seed >>> 0) + ':' + Math.round(W.ww) + ':' + Math.round(W.wh) + ':' + (W.farOf || ''); if (S && S.key === key) return S;
    const gw = Math.ceil(W.ww / CELL), gh = Math.ceil(W.wh / CELL), mk = function () { const c = document.createElement('canvas'); c.width = gw; c.height = gh; return c; };
    return (S = { key: key, gw: gw, gh: gh, foot: new Float32Array(gw * gh), terr: mk(), path: mk(), tT: -9, pT: -9, acc: 0, dec: 0 }); }
  const reach = function (w) { const t = w.bp.type; return t === 'heart' ? 300 + 55 * (w.tier | 0) : w.tower ? 250 : t === 'port' ? 230 : t === 'ship' ? 0 : t === 'house' ? 150 : t === 'wall' ? 170 : 195; };

  // ── footfalls: where they walk, the ground wears ──
  { const s0 = G.step; G.step = function (dt) { s0(dt); const W = G.W; if (!W || W.title || G.mode !== 'play') return; const st = state(W); st.acc += dt; st.dec += dt;
      if (st.acc >= 0.3) { st.acc = 0; const F = st.foot, gw = st.gw, gh = st.gh; for (let i = 0; i < W.cre.length; i++) { const c = W.cre[i]; if (c.dead || c.inShip || c.asleep || c.atSlot) continue; const sp = Math.abs(c.vx) + Math.abs(c.vy); if (sp < 14) continue; const w = c.team === 1 ? 0 : c.job ? 1.6 : c.feedGo ? 1 : 0.45; if (!w) continue; const gx = (c.x / CELL) | 0, gy = (c.y / CELL) | 0; if (gx < 1 || gy < 1 || gx >= gw - 1 || gy >= gh - 1) continue; const o = gy * gw + gx; F[o] += w; F[o - 1] += w * 0.4; F[o + 1] += w * 0.4; F[o - gw] += w * 0.4; F[o + gw] += w * 0.4; } }
      if (st.dec >= 2) { st.dec = 0; const F = st.foot; for (let i = 0; i < F.length; i++) F[i] *= 0.975; } }; }
  function paintPaths(W, st, L) { const x = st.path.getContext('2d'), im = x.createImageData(st.gw, st.gh), D = im.data, F = st.foot, c = L.lite.split(',').map(Number); for (let i = 0; i < F.length; i++) { const a = Math.max(0, Math.min(1, (F[i] - 2.2) / 16)); D[i * 4] = c[0]; D[i * 4 + 1] = c[1]; D[i * 4 + 2] = c[2]; D[i * 4 + 3] = a * 150; } x.putImageData(im, 0, 0); }

  // ── territory: the reach of what has been built ──
  function paintTerritory(W, st) {
    const Wk = (W.works || []).filter(function (w) { return w.bp && !w.visitor && !w.away && !w.fall && reach(w) > 0; }), x = st.terr.getContext('2d'), im = x.createImageData(st.gw, st.gh), D = im.data, gw = st.gw, gh = st.gh;
    const B = Wk.map(function (w) { return { x: w.x, y: w.y + w.bp.S * 0.45 - 20, r: reach(w), foe: !!w.enemy }; });
    if (B.length) for (let gy = 0; gy < gh; gy++) { const wy = (gy + 0.5) * CELL; for (let gx = 0; gx < gw; gx++) { const wx = (gx + 0.5) * CELL; let fm = 0, ff = 0; for (let i = 0; i < B.length; i++) { const b = B[i], dy = (wy - b.y) * 1.3, dx = wx - b.x; if (dx > b.r || dx < -b.r || dy > b.r || dy < -b.r) continue; const f = 1 - Math.sqrt(dx * dx + dy * dy) / b.r; if (b.foe) { if (f > ff) ff = f; } else if (f > fm) fm = f; }
        const f = Math.max(fm, ff); if (f <= 0) continue; const c = ff > fm ? FOE : MINE, o = (gy * gw + gx) * 4, edge = Math.max(0, 1 - Math.abs(f - 0.07) / 0.07); D[o] = c[0]; D[o + 1] = c[1]; D[o + 2] = c[2]; D[o + 3] = (0.05 * sstep(0, 0.14, f) + 0.15 * edge * edge) * 255; } }
    x.putImageData(im, 0, 0);
  }

  // ── the plaza round the Heart ──
  function plaza(ctx, W, L, h, t) {
    const tier = h.tier | 0, x = h.x, y = h.y + h.bp.S * 0.45, R = 95 + 48 * tier, v = G.view;
    { const g = ctx.createRadialGradient(x, y, R * 0.2, x, y, R * 1.6); g.addColorStop(0, 'rgba(' + L.lite + ',0.20)'); g.addColorStop(0.7, 'rgba(' + L.lite + ',0.08)'); g.addColorStop(1, 'rgba(' + L.lite + ',0)'); ctx.save(); ctx.translate(x, y); ctx.scale(1.6, 0.86); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, R, 0, 6.2832); ctx.fill(); ctx.restore(); }
    if (tier >= 1 && v.scale > 0.4 && !(G.art && G.art.ground && G.art.ground(W))) { const n = Math.round(R * R / 330);      /* (flagstones are drawn only on a drawn ground: on a painted one the Heart's own painted base is its paving) */ for (let i = 1; i < n; i++) { const rr = R * Math.sqrt(i / n), a = i * 2.39996, px = x + Math.cos(a) * rr * 1.55, py = y + Math.sin(a) * rr * 0.82, s = 9 + 6 * rnd(i, 3), sq = 0.55; if (Math.abs(px - x) < h.bp.hw * 0.7 && py < y && py > y - 30) continue;
        ctx.fillStyle = 'rgba(' + L.lite + ',' + (0.10 + 0.10 * rnd(i, 5)) + ')'; ctx.strokeStyle = 'rgba(' + L.dark + ',0.35)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(px, py, s, s * sq, rnd(i, 7) * 0.6 - 0.3, 0, 6.2832); ctx.fill(); ctx.stroke(); } }
    if (tier >= 1) { const n = 4 + tier * 3; for (let i = 0; i < n; i++) { const a = (i + 0.5) / n * 6.2832 + 0.2, px = x + Math.cos(a) * R * 1.62, py = y + Math.sin(a) * R * 0.88, fl = 0.8 + 0.2 * Math.sin(t * 5 + i * 1.7);
        ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(px + 4, py + 1, 7, 2, 0, 0, 6.2832); ctx.fill(); ctx.strokeStyle = '#16202e'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, py - 20); ctx.stroke(); ctx.strokeStyle = '#9fb3c6'; ctx.lineWidth = 1.2; ctx.stroke();
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(px, py - 22, 1, px, py - 22, 36); g.addColorStop(0, 'rgba(255,216,140,' + 0.34 * fl + ')'); g.addColorStop(1, 'rgba(255,216,140,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(px, py - 22, 36, 0, 6.2832); ctx.fill(); ctx.restore(); ctx.fillStyle = '#ffe9b0'; ctx.beginPath(); ctx.arc(px, py - 22, 3, 0, 6.2832); ctx.fill(); } }
  }

  /** scorch the ground here (a fight was fought) */
  G.scorch = function (x, y, r) { if (SCORCH.length > 40) SCORCH.shift(); SCORCH.push({ x: x, y: y, r: r || 26, t0: performance.now(), a: Math.random() * 6 }); };

  G.drawSociety = function (ctx, W, L) {
    if (G.mode !== 'play' || W.title) return; const st = state(W), t = G.rt || 0, T = performance.now();
    if (t - st.tT > 1.3 || t < st.tT) { st.tT = t; paintTerritory(W, st); }
    if (t - st.pT > 1.1 || t < st.pT) { st.pT = t; paintPaths(W, st, L); }
    ctx.save(); ctx.imageSmoothingEnabled = true;
    ctx.globalAlpha = 0.9; ctx.drawImage(st.path, 0, 0, st.gw * CELL, st.gh * CELL);
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.85 + 0.15 * Math.sin(t * 1.4); ctx.drawImage(st.terr, 0, 0, st.gw * CELL, st.gh * CELL);
    ctx.restore();
    const h = G.heartOf ? G.heartOf(W) : null; if (h) plaza(ctx, W, L, h, t);
    for (let i = SCORCH.length - 1; i >= 0; i--) { const s = SCORCH[i], u = (T - s.t0) / 90000; if (u >= 1) { SCORCH.splice(i, 1); continue; } const a = (1 - u) * 0.5, g = ctx.createRadialGradient(s.x, s.y, 2, s.x, s.y, s.r); g.addColorStop(0, 'rgba(0,0,0,' + a + ')'); g.addColorStop(0.6, 'rgba(10,6,4,' + a * 0.6 + ')'); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(s.x, s.y, s.r * 1.3, s.r * 0.7, 0, 0, 6.2832); ctx.fill();
      if (u < 0.12) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; for (let q = 0; q < 5; q++) { const an = s.a + q * 1.3, d = s.r * (0.2 + 0.5 * rnd(q, i + 3)); ctx.fillStyle = 'rgba(255,150,60,' + 0.7 * (1 - u / 0.12) * (0.5 + 0.5 * Math.sin(t * 9 + q)) + ')'; ctx.beginPath(); ctx.arc(s.x + Math.cos(an) * d * 1.3, s.y + Math.sin(an) * d * 0.7, 1.8, 0, 6.2832); ctx.fill(); } ctx.restore(); } }
  };
  G.on('new-pond', function () { SCORCH.length = 0; });
})();
