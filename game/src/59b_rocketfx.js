// ── Fire, smoke and dust under a ship ──
// Whatever rises or comes down on its engine (your starships, each ship of a fleet, a raiders' ship) is given its exhaust here, so that it looks the same
// and looks like the real thing:
//     the FLAME    three bodies of light one inside the other (a wide orange plume, a yellow body, a white-blue core) with shock diamonds down the core;
//                  it flickers, lengthens with the engine's power, and where it reaches the ground it is cut short and splashes sideways
//     the SMOKE    while the ship is low the blast strikes the ground and is driven out to both sides along it, fast, then slows, swells and rises; once the
//                  ship is up, smoke is left in a column under it. Near the fire it is lit orange from below; it greys as it cools
//     the DUST     the ground's own colour, thrown out low and fast under the smoke, and a ring of it at the moment the engine comes to full power
//     SPARKS       bits of the pad, flung out and bouncing
//     the LIGHT    a pool of orange light on the ground under and round the ship, fading as it climbs
// A caller says only where the engine is and how hard it burns, every frame it burns: G.rocketFx.feed({ id, x, y, ground, power, size }).
// Nothing here changes the star: it only draws.
(function () {
  'use strict';
  if (typeof document === 'undefined') return;
  const TAU = 6.2832, P = [], MAX = 460, FEED = [], LAST = {};
  const rnd = Math.random, clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  const SPR = {};
  /** a soft, lumpy puff of one colour (drawn once): lighter on top, shaded underneath */
  function puff(rgb) {
    if (SPR[rgb]) return SPR[rgb]; const c = document.createElement('canvas'); c.width = c.height = 96; const x = c.getContext('2d');
    for (let i = 0; i < 9; i++) { const a = i * 2.4, d = i ? 13 + (i % 3) * 5 : 0, px = 48 + Math.cos(a) * d, py = 50 + Math.sin(a) * d * 0.8, r = i ? 19 + (i % 4) * 4 : 30, g = x.createRadialGradient(px, py - r * 0.2, r * 0.1, px, py, r); g.addColorStop(0, 'rgba(' + rgb + ',0.62)'); g.addColorStop(0.6, 'rgba(' + rgb + ',0.30)'); g.addColorStop(1, 'rgba(' + rgb + ',0)'); x.fillStyle = g; x.beginPath(); x.arc(px, py, r, 0, TAU); x.fill(); }
    x.globalCompositeOperation = 'source-atop'; const sh = x.createLinearGradient(0, 18, 0, 92); sh.addColorStop(0, 'rgba(255,255,255,0.16)'); sh.addColorStop(0.55, 'rgba(255,255,255,0)'); sh.addColorStop(1, 'rgba(30,34,52,0.42)'); x.fillStyle = sh; x.fillRect(0, 0, 96, 96);
    return (SPR[rgb] = c);
  }
  const dustRgb = function () { const L = G.terrainLook && G.W ? G.terrainLook(G.W) : null, q = L ? L.lite.split(',').map(Number) : [214, 190, 160]; return Math.round(q[0] * 0.62 + 70) + ',' + Math.round(q[1] * 0.62 + 62) + ',' + Math.round(q[2] * 0.62 + 54); };
  const add = function (p) { if (P.length >= MAX) P.splice(0, 12); P.push(p); };

  function emit(f, dt) {
    const pw = f.power, h = Math.max(0, f.ground - f.y), s = f.size, near = clamp(1 - h / 300, 0, 1), was = LAST[f.id] || { pw: 0, acc: [0, 0, 0, 0] }, A = was.acc;
    // full power for the first time: a ring of dust goes out along the ground
    if (pw >= 0.95 && was.pw < 0.95 && near > 0.5) for (let i = 0; i < 26; i++) { const a = i / 26 * TAU, sp = 300 + 180 * rnd(); add({ k: 1, x: f.x + Math.cos(a) * 14, y: f.ground - 2 + Math.sin(a) * 5, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.34, r: 12 + 8 * rnd(), gr: 34 + 20 * rnd(), t: 0, life: 1.5 + 0.9 * rnd(), g: f.ground + 26, rot: rnd() * TAU }); }
    if (near > 0) {      // the blast on the ground: out to both sides
      A[0] += dt * 54 * pw * pw * near; while (A[0] >= 1) { A[0]--; const sd = rnd() < 0.5 ? -1 : 1, sp = (90 + 290 * rnd()) * (0.45 + 0.55 * pw); add({ k: 0, x: f.x + sd * (4 + 18 * rnd()), y: f.ground - 4 - 10 * rnd(), vx: sd * sp, vy: -(4 + 34 * rnd()), r: (10 + 9 * rnd()) * (0.7 + s / 60), gr: 20 + 30 * rnd(), t: 0, life: 2.8 + 2.6 * rnd(), hot: 0.95 * near * pw, g: f.ground + 8 + 14 * rnd(), rot: rnd() * TAU }); }
      A[1] += dt * 24 * pw * near; while (A[1] >= 1) { A[1]--; const sd = rnd() < 0.5 ? -1 : 1; add({ k: 1, x: f.x + sd * 10 * rnd(), y: f.ground - 2, vx: sd * (200 + 300 * rnd()) * (0.4 + 0.6 * pw), vy: -(2 + 16 * rnd()), r: 8 + 7 * rnd(), gr: 26 + 22 * rnd(), t: 0, life: 1.3 + 1.2 * rnd(), g: f.ground + 10 + 16 * rnd(), rot: rnd() * TAU }); }
      if (pw > 0.55 && h < 130) { A[2] += dt * 30 * pw; while (A[2] >= 1) { A[2]--; const sd = rnd() < 0.5 ? -1 : 1; add({ k: 2, x: f.x + sd * 8 * rnd(), y: f.ground - 3, vx: sd * (160 + 420 * rnd()), vy: -(30 + 230 * rnd()), t: 0, life: 0.45 + 0.7 * rnd(), g: f.ground + 12 }); } }
    }
    if (h > 50 && pw > 0.3) {      // up in the air: a column of smoke is left under it
      A[3] += dt * 30 * pw; while (A[3] >= 1) { A[3]--; add({ k: 0, x: f.x + (rnd() - 0.5) * s * 0.4, y: f.y + s * (1.6 + 2.4 * rnd()), vx: (rnd() - 0.5) * 34, vy: 60 + 110 * rnd(), r: s * (0.34 + 0.2 * rnd()), gr: 24 + 22 * rnd(), t: 0, life: 2.2 + 1.8 * rnd(), hot: 0.75, g: f.ground + 10, rot: rnd() * TAU }); }
    }
    LAST[f.id] = { pw: pw, acc: A, at: performance.now() };
  }
  function step(dt) {
    for (let i = P.length - 1; i >= 0; i--) { const p = P[i]; p.t += dt; if (p.t >= p.life) { P.splice(i, 1); continue; }
      if (p.k === 2) { p.vy += 380 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= Math.exp(-1.1 * dt); if (p.y > p.g) { p.y = p.g; p.vy *= -0.38; p.vx *= 0.7; } continue; }
      const drag = Math.exp(-(p.k === 1 ? 2.1 : 1.5) * dt); p.vx *= drag; p.vy *= drag; if (p.t > (p.k === 1 ? 0.5 : 0.35)) p.vy -= (p.k === 1 ? 7 : 20) * dt;      // (it slows, then it rises)
      p.x += p.vx * dt; p.y += p.vy * dt; if (p.y > p.g) { p.y = p.g; if (p.vy > 0) p.vy = 0; } p.r += p.gr * dt; p.rot += dt * 0.25 * (p.vx > 0 ? 1 : -1); }
  }
  function flame(ctx, f, t) {
    const pw = f.power, s = f.size, h = Math.max(0, f.ground - f.y), fl = 0.86 + 0.1 * Math.sin(t * 43 + f.x) + 0.08 * Math.sin(t * 71) + 0.06 * Math.sin(t * 23.7), L0 = s * (1.6 + 5.4 * pw) * fl, L = Math.min(L0, h + s * 0.35), cut = L < L0 - 1, w = s * (0.34 + 0.2 * pw);
    const body = function (len, wd, c0, c1) { if (len < 2) return; const g = ctx.createLinearGradient(0, f.y, 0, f.y + len); g.addColorStop(0, c0); g.addColorStop(1, c1); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(f.x - wd * 0.55, f.y - 2); ctx.bezierCurveTo(f.x - wd * 1.25, f.y + len * 0.28, f.x - wd * 0.5, f.y + len * 0.74, f.x + Math.sin(t * 31 + len) * wd * 0.12, f.y + len); ctx.bezierCurveTo(f.x + wd * 0.5, f.y + len * 0.74, f.x + wd * 1.25, f.y + len * 0.28, f.x + wd * 0.55, f.y - 2); ctx.closePath(); ctx.fill(); };
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    // the light it throws: on the ground, and round its mouth
    { const fall = clamp(1 - h / 460, 0, 1) * pw; if (fall > 0.02) { const rx = (150 + 190 * pw) * (0.6 + 0.4 * fall); ctx.save(); ctx.translate(f.x, f.ground + 6); ctx.scale(1, 0.36); const g = ctx.createRadialGradient(0, 0, 4, 0, 0, rx); g.addColorStop(0, 'rgba(255,196,120,' + 0.38 * fall + ')'); g.addColorStop(0.45, 'rgba(255,140,60,' + 0.17 * fall + ')'); g.addColorStop(1, 'rgba(255,110,40,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, rx, 0, TAU); ctx.fill(); ctx.restore(); }
      const g2 = ctx.createRadialGradient(f.x, f.y + s * 0.4, 1, f.x, f.y + s * 0.4, s * (2 + 2.6 * pw)); g2.addColorStop(0, 'rgba(255,190,110,' + 0.3 * pw + ')'); g2.addColorStop(1, 'rgba(255,120,50,0)'); ctx.fillStyle = g2; ctx.beginPath(); ctx.arc(f.x, f.y + s * 0.4, s * (2 + 2.6 * pw), 0, TAU); ctx.fill(); }
    body(L, w * 1.5, 'rgba(255,170,70,' + 0.62 * pw + ')', 'rgba(255,70,20,0)');
    body(L * 0.74, w * 0.95, 'rgba(255,232,160,' + 0.85 * pw + ')', 'rgba(255,150,50,0)');
    body(L * 0.46, w * 0.5, 'rgba(255,255,255,0.96)', 'rgba(170,215,255,0)');
    // shock diamonds down the core
    for (let i = 0; i < 4; i++) { const d = L0 * (0.1 + 0.105 * i); if (d > L * 0.9) break; const a = (0.55 - 0.12 * i) * pw * (0.8 + 0.2 * Math.sin(t * 50 + i * 2)); ctx.fillStyle = 'rgba(255,250,235,' + a + ')'; ctx.beginPath(); ctx.ellipse(f.x, f.y + d, w * (0.34 - 0.05 * i), w * (0.2 - 0.025 * i), 0, 0, TAU); ctx.fill(); }
    // where it strikes the ground it splashes out to both sides
    if (cut && pw > 0.25) { const gy = f.ground + 2, sp = s * (2.2 + 5 * pw) * fl; for (let sd = -1; sd <= 1; sd += 2) { const g = ctx.createLinearGradient(f.x, 0, f.x + sd * sp, 0); g.addColorStop(0, 'rgba(255,240,200,' + 0.8 * pw + ')'); g.addColorStop(0.4, 'rgba(255,160,60,' + 0.5 * pw + ')'); g.addColorStop(1, 'rgba(255,80,20,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(f.x, gy - s * 0.3); ctx.quadraticCurveTo(f.x + sd * sp * 0.5, gy - s * (0.5 + 0.2 * Math.sin(t * 37 + sd)), f.x + sd * sp, gy - 1); ctx.quadraticCurveTo(f.x + sd * sp * 0.5, gy + s * 0.22, f.x, gy + s * 0.14); ctx.closePath(); ctx.fill(); } }
    ctx.restore();
  }
  function draw() {
    const ctx = G.ctx, v = G.view; if (!ctx) return; const dt = Math.min(0.05, G.frameDt || 0.016), t = (G.rt || 0), now = performance.now();
    if (!FEED.length && !P.length) return;
    if (G.mode !== 'play') { FEED.length = 0; P.length = 0; return; }
    for (let i = 0; i < FEED.length; i++) emit(FEED[i], dt);
    for (const k in LAST) if (now - LAST[k].at > 600) delete LAST[k];
    step(dt);
    const s = v.scale * v.dpr; ctx.save(); ctx.setTransform(s, 0, 0, s, v.ox * v.dpr, v.oy * v.dpr); ctx.imageSmoothingEnabled = true;
    const grey = puff('224,226,234'), dark = puff('122,124,138'), hot = puff('255,170,90'), dust = puff(dustRgb());
    // dust lowest, then smoke (the oldest first), then the fire, then the sparks
    for (let pass = 0; pass < 2; pass++) for (let i = 0; i < P.length; i++) { const p = P[i]; if (p.k === 2 || (p.k === 1) !== (pass === 0)) continue; const u = p.t / p.life, a = Math.min(1, u * 9) * (u < 0.45 ? 1 : (1 - u) / 0.55), d = p.r * 2;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot || 0);
      if (p.k === 1) { ctx.globalAlpha = 0.6 * a; ctx.drawImage(dust, -d / 2, -d * 0.36, d, d * 0.72); }
      else { const hh = (p.hot || 0) * Math.max(0, 1 - p.t / 0.9); ctx.globalAlpha = 0.8 * a; ctx.drawImage(u > 0.5 ? dark : grey, -d / 2, -d / 2, d, d); if (u > 0.3 && u <= 0.5) { ctx.globalAlpha = 0.8 * a * (u - 0.3) / 0.2; ctx.drawImage(dark, -d / 2, -d / 2, d, d); } if (hh > 0.02) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.4 * hh * a; ctx.drawImage(hot, -d / 2, -d / 2, d, d); } }
      ctx.restore(); }
    for (let i = 0; i < FEED.length; i++) flame(ctx, FEED[i], t);
    ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    for (let i = 0; i < P.length; i++) { const p = P[i]; if (p.k !== 2) continue; const u = p.t / p.life; ctx.strokeStyle = 'rgba(255,' + Math.round(230 - 110 * u) + ',' + Math.round(150 - 120 * u) + ',' + (1 - u) + ')'; ctx.lineWidth = 2.2 * (1 - u * 0.5); ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 0.035, p.y - p.vy * 0.035); ctx.stroke(); }
    ctx.restore();
    FEED.length = 0;
  }
  G.rocketFx = {
    /** an engine burns this frame: at x, y (its mouth, in the star's own measure), over ground at `ground`, at `power` 0..1; `size` is how wide the ship's body is */
    feed: function (o) { if (!o || !(o.power > 0.01) || FEED.length > 12) return; FEED.push({ id: String(o.id || 'ship'), x: o.x, y: o.y, ground: o.ground === undefined ? o.y + 4000 : o.ground, power: clamp(o.power, 0, 1), size: o.size || 24 }); },
    /** how much smoke, dust and sparks are in the air (for the tests) */
    count: function () { return P.length; },
  };
  G.on('new-pond', function () { P.length = 0; FEED.length = 0; });
  G.addSystem({ name: 'rocketfx', draw: function () { try { draw(); } catch (e) { if (!draw.err) { draw.err = 1; console.error(e); } FEED.length = 0; } } });
})();
