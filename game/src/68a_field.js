// ── What is drawn on the star for the colony, and what a fight looks and sounds like ──
// TWO COLOURS, everywhere: yours is BLUE, the enemy is RED (the same on the small map and in the bars). Nothing else on the star uses them this way.
//     under a creature     a blue disc under your fighters and guards, and under anyone of yours in a fight; a red disc under every enemy;
//                          a white ring round those you have chosen
//     over its head        the sign of its trade on a blue badge (basket, hammer, blade, shield); a red horned badge over an enemy;
//                          and, in a fight, how much life it has left (a blue bar, a red bar)
//     in its hand          fighters, guards and enemies carry a blade of light in their side's colour (a guard a shield too). It swings when
//                          they strike: an arc of light, sparks where it lands, the number it took off, and the one struck is knocked back.
//     the grounds          the muster ground, guard posts and the builders' yard are marked on the ground in blue, with their names
//     lots                 while you are placing a building, every free lot is marked
//     the BATTLE BAR       while enemies are on the star: yours against theirs, and how the Heart stands. Click it to go to the fight.
// Also here: the lumen crystals, the store beside the Heart, the raiders' ship, and where things are to be built.
(function () {
  'use strict';
  if (typeof document === 'undefined' || !G.cmd) return;
  const C = G.cmd, TEAM = C.TEAM, JOBS = G.JOBS;
  const FX = [], ZAP = [], POP = [], HIT = [], GONE = [], SHARD = [];
  function burst(x, y, col, n) { for (let q = 0; q < n && SHARD.length < 160; q++) { const a = Math.random() * 6.2832, sp = 0.5 + Math.random() * 1.4; SHARD.push({ x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 0.9, a: a, t0: performance.now(), col: col }); } }
  const now = function () { return performance.now(); };
  C.pop = function (x, y, text, colr) { POP.push({ x: x, y: y, t0: now(), text: text, col: colr || '#e8f4ff' }); };
  C.orderFx = function (o, col, from) { FX.push({ x: o.x, y: o.y, t0: now(), col: col, from: from }); };
  const calm = function () { return G.mode === 'play' && G.speed <= 4 && !G.isBlocked(); };
  const P2 = {}; const glyph = function (job) { if (!P2[job] && typeof Path2D !== 'undefined') P2[job] = new Path2D(C.GLYPH[job]); return P2[job]; };
  const mid = function (c) { return c._mid || c.ph.r * 1.6; }, top = function (c) { return c._top || c.ph.r * 3.3; };

  function label(ctx, x, y, inv, a, colr, size) { ctx.save(); ctx.translate(x, y); ctx.scale(inv, inv); ctx.font = '800 ' + (size || 10.5) + 'px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; const w = ctx.measureText(a).width + 12; ctx.fillStyle = 'rgba(7,18,31,0.74)'; ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(-w / 2, -9, w, 18, 9); else ctx.rect(-w / 2, -9, w, 18); ctx.fill(); ctx.fillStyle = colr || '#e8f4ff'; ctx.fillText(a, 0, 0.5); ctx.restore(); }

  // ── lumen: a stand of tall crystals that glows ──
  function crystal(ctx, x, y, h, w, lean, bright) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(lean);
    const g = ctx.createLinearGradient(-w, 0, w, -h); g.addColorStop(0, 'rgba(40,150,200,0.95)'); g.addColorStop(0.5, 'rgba(110,235,255,0.97)'); g.addColorStop(1, 'rgba(235,255,255,1)');
    ctx.fillStyle = g; ctx.strokeStyle = 'rgba(8,40,60,0.9)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-w * 0.7, 0); ctx.lineTo(-w, -h * 0.72); ctx.lineTo(0, -h); ctx.lineTo(w, -h * 0.72); ctx.lineTo(w * 0.7, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,' + (0.35 + 0.3 * bright) + ')'; ctx.beginPath(); ctx.moveTo(-w * 0.7, 0); ctx.lineTo(-w, -h * 0.72); ctx.lineTo(0, -h); ctx.lineTo(-w * 0.15, -h * 0.66); ctx.lineTo(-w * 0.2, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(10,70,110,0.35)'; ctx.beginPath(); ctx.moveTo(w * 0.7, 0); ctx.lineTo(w, -h * 0.72); ctx.lineTo(0, -h); ctx.lineTo(w * 0.3, -h * 0.66); ctx.lineTo(w * 0.3, 0); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  function star4(ctx, x, y, s, a) { ctx.fillStyle = 'rgba(255,255,255,' + a + ')'; ctx.beginPath(); ctx.moveTo(x, y - s); ctx.lineTo(x + s * 0.22, y - s * 0.22); ctx.lineTo(x + s, y); ctx.lineTo(x + s * 0.22, y + s * 0.22); ctx.lineTo(x, y + s); ctx.lineTo(x - s * 0.22, y + s * 0.22); ctx.lineTo(x - s, y); ctx.lineTo(x - s * 0.22, y - s * 0.22); ctx.closePath(); ctx.fill(); }
  /** a stand of lumen: n pieces of n0 (drawn at x, y: its foot). Also used for its card's picture. */
  C.drawLumen = function (ctx, x, y, n, n0, t, i) {
    const full = n0 ? G.clamp(n / n0, 0, 1) : 0, k = n <= 0 ? 0 : Math.min(7, 2 + Math.ceil(n / 4)), pulse = 0.5 + 0.5 * Math.sin(t * 2 + i * 1.7);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    { const R = 86, g = ctx.createRadialGradient(x, y - 22, 4, x, y - 22, R); g.addColorStop(0, 'rgba(110,230,255,' + (n > 0 ? 0.30 + 0.12 * pulse : 0.04) + ')'); g.addColorStop(1, 'rgba(110,230,255,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y - 22, R, 0, 6.2832); ctx.fill(); }
    if (n > 0) for (let q = 0; q < 6; q++) { const a = t * 0.25 + q * 1.047, len = 60 + 16 * Math.sin(t * 1.3 + q); ctx.fillStyle = 'rgba(150,240,255,0.07)'; ctx.beginPath(); ctx.moveTo(x, y - 24); ctx.lineTo(x + Math.cos(a - 0.09) * len, y - 24 + Math.sin(a - 0.09) * len * 0.8); ctx.lineTo(x + Math.cos(a + 0.09) * len, y - 24 + Math.sin(a + 0.09) * len * 0.8); ctx.closePath(); ctx.fill(); }
    ctx.restore();
    ctx.fillStyle = 'rgba(6,18,28,0.6)'; ctx.beginPath(); ctx.ellipse(x, y + 4, 34, 9, 0, 0, 6.2832); ctx.fill();
    ctx.fillStyle = 'rgba(70,90,110,0.9)'; ctx.beginPath(); ctx.ellipse(x - 14, y + 2, 13, 6, 0, 0, 6.2832); ctx.ellipse(x + 15, y + 3, 11, 5, 0, 0, 6.2832); ctx.fill();
    if (!k) { crystal(ctx, x - 4, y + 2, 9, 4, -0.2, 0); crystal(ctx, x + 6, y + 3, 6, 3, 0.3, 0); return; }
    const S = [[0, 0, 52, 9, 0], [-15, 2, 36, 7, -0.28], [15, 3, 40, 7.5, 0.24], [-27, 5, 24, 5.5, -0.5], [27, 5, 26, 5.5, 0.46], [-6, 6, 22, 5, -0.1], [8, 7, 18, 4.5, 0.14]];
    [3, 4, 1, 2, 0, 5, 6].forEach(function (j) { if (j >= k) return; const q = S[j]; crystal(ctx, x + q[0], y + q[1], q[2] * (0.7 + 0.3 * full), q[3], q[4], pulse); });
    for (let q = 0; q < 4; q++) { const u = (t * 0.6 + q * 0.25 + i * 0.13) % 1, a = Math.sin(u * 3.1416); star4(ctx, x + Math.sin(q * 2.4 + i) * 30, y - 12 - ((q * 17 + i * 7) % 44), 2.5 + 3.5 * a, 0.85 * a); }
  };

  // ── what a fighter holds ──
  /** a blade of light in a side's colour, in the hand of c (and a guard's shield); it sweeps when c has just struck */
  function weapon(ctx, c, x, ym, r, col, W, inv, foe) {
    const f = (c.fc === undefined ? Math.cos(c.ang || 0) : c.fc) >= 0 ? 1 : -1, L = Math.max(r * 1.9, 15), age = c.swT === undefined ? 9 : W.t - c.swT; let a, hx, hy;
    if (age >= 0 && age < 0.34) { const u = age / 0.34, e = 1 - (1 - u) * (1 - u), A = c.swAng || 0, s = Math.cos(A) >= 0 ? 1 : -1; a = A - s * 1.5 + s * 2.5 * e; hx = x + Math.cos(A) * r * 0.9; hy = ym + Math.sin(A) * r * 0.6;
      ctx.fillStyle = 'rgba(' + col + ',' + 0.38 * (1 - u) + ')'; ctx.beginPath(); ctx.moveTo(hx, hy); ctx.arc(hx, hy, L * 1.08, s > 0 ? A - 1.5 : a, s > 0 ? a : A + 1.5); ctx.closePath(); ctx.fill(); }
    else { a = -1.5708 + f * (0.55 + 0.06 * Math.sin((G.rt || 0) * 2 + c.id)); hx = x + f * r * 0.95; hy = ym + r * 0.25; }
    const tx = hx + Math.cos(a) * L, ty = hy + Math.sin(a) * L;
    ctx.lineCap = 'round'; ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = 'rgba(' + col + ',0.34)'; ctx.lineWidth = Math.max(8, 8.5 * inv); ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(tx, ty); ctx.stroke(); ctx.strokeStyle = 'rgba(' + col + ',0.5)'; ctx.lineWidth = Math.max(4.5, 5 * inv); ctx.stroke(); ctx.restore();
    ctx.strokeStyle = 'rgba(' + col + ',1)'; ctx.lineWidth = Math.max(2.4, 2.6 * inv); ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(tx, ty); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = Math.max(0.9, inv); ctx.beginPath(); ctx.moveTo(hx + Math.cos(a) * L * 0.12, hy + Math.sin(a) * L * 0.12); ctx.lineTo(tx, ty); ctx.stroke();
    ctx.strokeStyle = '#14202e'; ctx.lineWidth = Math.max(2, 2.2 * inv); ctx.beginPath(); ctx.moveTo(hx - Math.sin(a) * 3.2, hy + Math.cos(a) * 3.2); ctx.lineTo(hx + Math.sin(a) * 3.2, hy - Math.cos(a) * 3.2); ctx.stroke();
    if (foe) { ctx.strokeStyle = 'rgba(' + col + ',1)'; ctx.lineWidth = Math.max(2, 2.2 * inv); ctx.beginPath(); ctx.moveTo(hx + Math.cos(a) * L * 0.7, hy + Math.sin(a) * L * 0.7); ctx.lineTo(hx + Math.cos(a + 0.5) * L * 0.92, hy + Math.sin(a + 0.5) * L * 0.92); ctx.stroke(); }      // (an enemy's blade is hooked)
    if (c.job === 'u' && !foe) { const sx = x - f * r * 0.2 + f * r * 1.15, sy = ym + r * 0.1; ctx.fillStyle = 'rgba(' + col + ',0.42)'; ctx.strokeStyle = 'rgba(' + col + ',1)'; ctx.lineWidth = Math.max(1.6, 1.8 * inv); ctx.beginPath(); ctx.ellipse(sx, sy, r * 0.42, r * 0.95, 0, 0, 6.2832); ctx.fill(); ctx.stroke(); ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.beginPath(); ctx.moveTo(sx, sy - r * 0.6); ctx.lineTo(sx, sy + r * 0.6); ctx.stroke(); }
  }
  function badge(ctx, x, y, inv, job, dim) { const z = Math.max(6.2, 7.4 * inv); ctx.globalAlpha = dim ? 0.5 : 1; ctx.fillStyle = 'rgba(7,18,31,0.9)'; ctx.strokeStyle = TEAM.mineHex; ctx.lineWidth = Math.max(1.3, 1.5 * inv); ctx.beginPath(); ctx.arc(x, y, z, 0, 6.2832); ctx.fill(); ctx.stroke(); const p = glyph(job); if (p) { ctx.save(); ctx.translate(x - z * 0.72, y - z * 0.72); ctx.scale(z * 1.44 / 16, z * 1.44 / 16); ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = TEAM.mineHex; ctx.stroke(p); ctx.restore(); } ctx.globalAlpha = 1; }
  function foeBadge(ctx, x, y, inv, t) { const z = Math.max(6.5, 7.6 * inv), b = 0.85 + 0.15 * Math.sin(t * 7); ctx.fillStyle = 'rgba(' + TEAM.foe + ',' + b + ')'; ctx.strokeStyle = '#14202e'; ctx.lineWidth = Math.max(1.2, 1.4 * inv); ctx.beginPath(); ctx.moveTo(x, y + z); ctx.lineTo(x - z, y - z * 0.1); ctx.lineTo(x - z * 0.95, y - z * 1.1); ctx.lineTo(x - z * 0.35, y - z * 0.45); ctx.lineTo(x, y - z * 0.8); ctx.lineTo(x + z * 0.35, y - z * 0.45); ctx.lineTo(x + z * 0.95, y - z * 1.1); ctx.lineTo(x + z, y - z * 0.1); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#14202e'; ctx.beginPath(); ctx.arc(x - z * 0.34, y + z * 0.05, z * 0.16, 0, 6.2832); ctx.arc(x + z * 0.34, y + z * 0.05, z * 0.16, 0, 6.2832); ctx.fill(); }
  function bar(ctx, x, y, inv, f, col) { const w = Math.max(22, 26 * inv), h = Math.max(3.4, 4 * inv), o = Math.max(1, inv); ctx.fillStyle = 'rgba(7,18,31,0.85)'; ctx.fillRect(x - w / 2 - o, y - o, w + 2 * o, h + 2 * o); ctx.fillStyle = 'rgba(' + col + ',1)'; ctx.fillRect(x - w / 2, y, w * G.clamp(f, 0, 1), h); }

  const SHIPS = {};
  function raidShip(r) { const k = r.seed + ':' + Math.round(r.hue); if (!SHIPS[k]) SHIPS[k] = G.blueprintFrom({ seed: r.seed, type: 'ship', S: 74, hue: r.hue, spiky: 1, brain: 0.8, wet: false }, '22222222222222222222222222222222222222222222222222'); return SHIPS[k]; }
  const IMG = {};

  function draw() {
    const ctx = G.ctx, v = G.view, W = G.W; if (!ctx || !W || !C.live()) return;
    const t = G.rt || 0, T = now(), s = v.scale * v.dpr, inv = 1 / v.scale, col = G.colony(W), chosen = new Set(C.sel);
    const vx0 = -v.ox / v.scale, vy0 = -v.oy / v.scale, vx1 = vx0 + v.w / v.scale, vy1 = vy0 + v.h / v.scale;
    ctx.save(); ctx.setTransform(s, 0, 0, s, v.ox * v.dpr, v.oy * v.dpr); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    // the grounds: where each trade stands
    (W.grounds || []).forEach(function (g) { const gr = ctx.createRadialGradient(g.x, g.y, 4, g.x, g.y, g.w / 2); gr.addColorStop(0, 'rgba(' + TEAM.mine + ',0.20)'); gr.addColorStop(0.7, 'rgba(' + TEAM.mine + ',0.09)'); gr.addColorStop(1, 'rgba(' + TEAM.mine + ',0)'); ctx.save(); ctx.translate(g.x, g.y); ctx.scale(1, g.h / g.w); ctx.translate(-g.x, -g.y); ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(g.x, g.y, g.w / 2, 0, 6.2832); ctx.fill(); ctx.restore();      /* (a soft patch of your colour on the ground: no fence, no lines) */
      if (v.scale > 0.4) label(ctx, g.x, g.y - g.h / 2 - 10 * inv, inv, g.name + ' · ' + g.n, TEAM.mineHex, 9.5); });
    // the places of the star, by name (their ground is drawn with the terrain)
    if (v.scale > 0.36 && G.sitesOf) G.sitesOf(W).forEach(function (q) { if (q.k === 'lumen' || q.x < vx0 - 160 || q.x > vx1 + 160 || q.y < vy0 - 160 || q.y > vy1 + 160) return; label(ctx, q.x, q.y - q.r * 0.8 - 12 * inv, inv, q.name, q.k === 'grove' ? 'rgba(170,255,205,0.9)' : q.k === 'quarry' ? '#d5dbe4' : q.k === 'reeds' ? '#cfe58a' : '#f3d9a8', 9.5); });
    // lumen
    const N = G.lumenNodes(W); for (let i = 0; i < N.length; i++) { const q = N[i]; if (q.x < vx0 - 100 || q.x > vx1 + 100 || q.y < vy0 - 100 || q.y > vy1 + 120) continue; if (!(G.sceneryPainted && G.sceneryPainted(W))) C.drawLumen(ctx, q.x, q.y, q.n, q.n0, t, i);      /* (on a painted star its crystals are painted: 52c_terrain.js) */ if (v.scale > 0.4) label(ctx, q.x, q.y + 20 * inv + 6, inv, q.n > 0 ? 'LUMEN ' + q.n : 'lumen: growing back', q.n > 0 ? '#8ef0ff' : 'rgba(207,232,255,.6)', 10); }
    // the store, beside the Heart: what is in it lies there to be seen
    const st = G.storeAt(W), hp = G.heartOf(W);
    if (st) { for (let k = 0; k < 4; k++) { const n = Math.min(10, Math.ceil(col.stock[k] / (k === 3 ? 2 : 5))); for (let j = 0; j < n; j++) G.matDraw(ctx, { x: st.x - 22 + k * 15 + (j % 2) * 6, y: st.y - 2 - Math.floor(j / 2) * 5, k: k, s: (j * 0.31 + k * 0.17) % 1 }, t); } }
    if (hp) { const c = G.buildCount(hp), y0 = hp.y + hp.bp.S * 0.45 + 12 * inv; if (c[0] < c[2] || hp.ruin || T - (hp.hitAt || 0) < 4000) { const w = 70 * inv, hh = 6 * inv; ctx.fillStyle = 'rgba(7,18,31,0.8)'; ctx.fillRect(hp.x - w / 2 - inv, y0 - inv, w + 2 * inv, hh + 2 * inv); ctx.fillStyle = TEAM.mineHex; ctx.fillRect(hp.x - w / 2, y0, w * c[0] / c[2], hh); if (hp.ruin) label(ctx, hp.x, y0 - 13 * inv, inv, 'rising: your builders raise it', '#ffe9a8', 10); } }
    { const fh = G.foeHeart ? G.foeHeart(W) : null; if (fh) { const c = G.buildCount(fh), y0 = fh.y + fh.bp.S * 0.45 + 12 * inv, w = 70 * inv, hh = 6 * inv; ctx.fillStyle = 'rgba(7,18,31,0.8)'; ctx.fillRect(fh.x - w / 2 - inv, y0 - inv, w + 2 * inv, hh + 2 * inv); ctx.fillStyle = TEAM.foeHex; ctx.fillRect(fh.x - w / 2, y0, w * c[0] / c[2], hh); label(ctx, fh.x, y0 + 17 * inv, inv, 'THEIR HEART', '#ff9db0', 10.5); } }
    // what is waiting to be built; and, while a place is being chosen, the lots and the thing itself
    col.queue.forEach(function (q) { if (q.type === 'ship') return; { const g = ctx.createRadialGradient(q.x, q.y, 4, q.x, q.y, 60); g.addColorStop(0, 'rgba(' + TEAM.mine + ',' + (0.26 + 0.08 * Math.sin(t * 3)) + ')'); g.addColorStop(1, 'rgba(' + TEAM.mine + ',0)'); ctx.save(); ctx.translate(q.x, q.y); ctx.scale(1, 0.45); ctx.translate(-q.x, -q.y); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(q.x, q.y, 60, 0, 6.2832); ctx.fill(); ctx.restore(); }      /* (a soft mark where it will stand: no line round it) */ label(ctx, q.x, q.y + 12 * inv, inv, q.name + ': to be built', '#bfe9ff', 10); });
    if (C.placing) { const tp = C.placing;
      if (tp !== 'port' && tp !== 'ship' && G.lotsIn) G.lotsIn(W, vx0, vy0, vx1, vy1, tp).forEach(function (q) { if (!q.free) return; ctx.fillStyle = 'rgba(' + TEAM.mine + ',0.13)'; ctx.beginPath(); ctx.ellipse(q.x, q.y - 4, 34, 13, 0, 0, 6.2832); ctx.fill(); ctx.fillStyle = 'rgba(' + TEAM.mine + ',0.75)'; ctx.beginPath(); ctx.arc(q.x, q.y - 4, Math.max(2.4, 3 * inv), 0, 6.2832); ctx.fill(); });      /* (each free lot: a soft mark on the ground) */
      if (G.input.ptr.inside) { const p = C.placeAt(G.input.ptr.wx, G.input.ptr.wy), why = G.buildOk(tp, p.x, p.y), okc = why ? TEAM.foe : '110,240,168'; ctx.fillStyle = 'rgba(' + okc + ',0.16)'; ctx.strokeStyle = 'rgba(' + okc + ',0.9)'; ctx.lineWidth = 2 * inv; ctx.beginPath(); ctx.ellipse(p.x, p.y - 34, 56, 46, 0, 0, 6.2832); ctx.fill(); ctx.stroke();
        const u = C.pic(tp); if (u) { if (!IMG[tp] || IMG[tp].src0 !== u) { IMG[tp] = new Image(); IMG[tp].src = u; IMG[tp].src0 = u; } if (IMG[tp].complete && IMG[tp].naturalWidth) { ctx.globalAlpha = 0.78; ctx.drawImage(IMG[tp], p.x - 50, p.y - 93, 100, 100); ctx.globalAlpha = 1; } }
        label(ctx, p.x, p.y + 16 * inv, inv, why || G.BUILDABLE[tp].name + ': click to build here', why ? '#ffb3c0' : '#b9ffd9', 11); } }
    // a raid: the ship it came in
    { const r = col.raid; if (r && r.state !== 'warn') { const bp = raidShip(r), tt = W.t - r.t0, S = bp.S; let off = 0; if (r.state === 'land' && tt < 3) { const u = 1 - tt / 3; off = -720 * u * u; } else if (r.state === 'leave' && tt > 1.5) { const u = (tt - 1.5) / 4; off = -900 * u * u; }
        ctx.fillStyle = 'rgba(4,12,20,' + 0.32 * Math.max(0, 1 + off / 500) + ')'; ctx.beginPath(); ctx.ellipse(r.x, r.y + 4, S * 0.7, 8, 0, 0, 6.2832); ctx.fill();
        if (off < -4 && G.rocketFx) G.rocketFx.feed({ id: 'raid' + r.id, x: r.x, y: r.y + off - 6, ground: r.y + 8, power: 0.9, size: 26 });      /* (its fire, smoke and dust: 59b_rocketfx.js) */
        else if (off < -4) { const g = ctx.createLinearGradient(0, r.y + off, 0, r.y + off + 70); g.addColorStop(0, 'rgba(255,220,140,0.9)'); g.addColorStop(1, 'rgba(255,110,60,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(r.x - 12, r.y + off); ctx.lineTo(r.x + 12, r.y + off); ctx.lineTo(r.x + Math.sin(t * 30) * 4, r.y + off + 50 + Math.sin(t * 23) * 12); ctx.closePath(); ctx.fill(); }
        if (off < -4) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; const near = Math.max(0, 1 + off / 720), g = ctx.createRadialGradient(r.x, r.y + 4, 4, r.x, r.y + 4, 150); g.addColorStop(0, 'rgba(255,170,90,' + 0.5 * near + ')'); g.addColorStop(1, 'rgba(255,120,60,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(r.x, r.y + 4, 150, 60, 0, 0, 6.2832); ctx.fill(); ctx.restore(); }
        if (r.state === 'land' && tt >= 2.6 && tt < 5.2) { const u = (tt - 2.6) / 2.6; ctx.strokeStyle = 'rgba(230,210,190,' + 0.55 * (1 - u) + ')'; ctx.lineWidth = 7 * (1 - u) + 1; ctx.beginPath(); ctx.ellipse(r.x, r.y + 6, 40 + 190 * u, 12 + 48 * u, 0, 0, 6.2832); ctx.stroke(); for (let q = 0; q < 10; q++) { const a = q * 0.628, d = 30 + 170 * u; ctx.fillStyle = 'rgba(200,180,160,' + 0.3 * (1 - u) + ')'; ctx.beginPath(); ctx.arc(r.x + Math.cos(a) * d, r.y + 6 + Math.sin(a) * d * 0.28 - 14 * Math.sin(u * 3.14), 9 + 10 * u, 0, 6.2832); ctx.fill(); } }
        if (r.state === 'on') { const a = 1.5708 + Math.sin(t * 0.7) * 0.9, L0 = 330; ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g = ctx.createLinearGradient(r.x, r.y - S, r.x + Math.cos(a) * L0, r.y - S + Math.sin(a) * L0 * 0.6 + S); g.addColorStop(0, 'rgba(255,90,110,0.30)'); g.addColorStop(1, 'rgba(255,90,110,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(r.x, r.y - S * 1.1); ctx.lineTo(r.x + Math.cos(a - 0.16) * L0, r.y + Math.sin(a - 0.16) * L0 * 0.6); ctx.lineTo(r.x + Math.cos(a + 0.16) * L0, r.y + Math.sin(a + 0.16) * L0 * 0.6); ctx.closePath(); ctx.fill(); ctx.restore(); }
        if (!(G.art && G.art.drawRaid && G.art.drawRaid(ctx, r, r.x, r.y + off, off < -4)) && !(G.art && G.art.draw && G.art.draw(ctx, W, 'ship', 'foe', r.x, r.y + off))) G.drawBlueprint(ctx, { x: r.x, y: r.y + off - S * 0.45, bp: bp }, false);      /* (their ship: painted, in their colour, where this star's buildings are painted) */
        label(ctx, r.x, r.y + off - (bp.top || S * 1.6) - 14 * inv, inv, 'RAIDERS OF ' + String(r.name).toUpperCase(), '#ff9db0', 10.5); } }
    if (!W.deed && G.drawHauls) G.drawHauls(ctx);      // what the gatherers carry (while a plan is on, the plan draws it)
    // the creatures: whose side each is on, what its trade is, what it holds, and how it stands in a fight
    for (let i = 0; i < W.cre.length; i++) { const c = W.cre[i]; if (c.dead || c.inShip || c.team === 2) continue; const x = c.rx === undefined ? c.x : c.rx, y = c.ry === undefined ? c.y : c.ry, r = c.ph.r;
      if (x < vx0 - 60 || x > vx1 + 60 || y < vy0 - 40 || y > vy1 + 90) continue;
      const foe = c.team === 1, soldier = c.job === 'f' || c.job === 'u', hot = (c.hitT !== undefined && W.t - c.hitT < 6) || (c.swT !== undefined && W.t - c.swT < 6), isSel = chosen.has(c), ym = y - mid(c), yt = y - top(c);
      if (!foe && !c.job && !isSel && !hot) continue;
      if (foe || hot || isSel) { const colr = foe ? TEAM.foe : TEAM.mine;      /* (a disc of its side's colour under an enemy, under anyone in a fight, under those you chose: not under every soldier standing at ease) */ ctx.fillStyle = 'rgba(' + colr + ',' + (foe ? 0.3 : 0.22) + ')'; ctx.strokeStyle = 'rgba(' + colr + ',0.95)'; ctx.lineWidth = Math.max(1.6, 1.9 * inv); ctx.beginPath(); ctx.ellipse(x, y + r * 0.1, r * 1.45 + 3, r * 0.55 + 2, 0, 0, 6.2832); ctx.fill(); ctx.stroke(); }
      if (isSel) { ctx.strokeStyle = 'rgba(255,255,255,' + (0.8 + 0.2 * Math.sin(t * 6)) + ')'; ctx.lineWidth = Math.max(2, 2.3 * inv); ctx.beginPath(); ctx.ellipse(x, y + r * 0.1, r * 1.75 + 5, r * 0.7 + 3.5, 0, 0, 6.2832); ctx.stroke(); }
      if ((foe || (soldier && !c.hungry)) && !c.asleep && v.scale > 0.3) weapon(ctx, c, x, ym, r, foe ? TEAM.foe : TEAM.mine, W, inv, foe);
      if (foe) foeBadge(ctx, x, yt - 9 * inv - 4, inv, t); else if (c.job) { if (v.scale > 0.34) badge(ctx, x, yt - 9 * inv - 3, inv, c.job, c.hungry); else { ctx.fillStyle = TEAM.mineHex; ctx.fillRect(x - 2.5 * inv, yt - 6 * inv, 5 * inv, 5 * inv); } }
      if (c.haul === 3) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(120,235,255,0.25)'; ctx.beginPath(); ctx.arc(x, y - r * 2.9, 12, 0, 6.2832); ctx.fill(); ctx.restore(); }
      if (foe || hot) bar(ctx, x, yt - 22 * inv - 6, inv, c.E / c.ph.Emax, foe ? TEAM.foe : TEAM.mine); }
    // a tower's stroke, a blow landing, one who fell, an order just given, and what is said over a place
    for (let i = ZAP.length - 1; i >= 0; i--) { const z = ZAP[i], u = (T - z.t0) / 280; if (u >= 1) { ZAP.splice(i, 1); continue; } ctx.strokeStyle = 'rgba(' + TEAM.mine + ',' + (1 - u) + ')'; ctx.lineWidth = (4.5 - 3 * u) * Math.max(1, inv); ctx.beginPath(); ctx.moveTo(z.x0, z.y0); ctx.lineTo((z.x0 + z.x1) / 2 + Math.sin(i * 7 + z.t0) * 9, (z.y0 + z.y1) / 2 + Math.cos(i * 5 + z.t0) * 9); ctx.lineTo(z.x1, z.y1); ctx.stroke(); ctx.strokeStyle = 'rgba(255,255,255,' + (1 - u) + ')'; ctx.lineWidth = Math.max(1, inv); ctx.stroke(); }
    for (let i = HIT.length - 1; i >= 0; i--) { const h = HIT[i], u = (T - h.t0) / 380; if (u >= 1) { HIT.splice(i, 1); continue; } ctx.strokeStyle = 'rgba(' + h.col + ',' + (1 - u) + ')'; ctx.lineWidth = Math.max(1.6, 2 * inv); ctx.beginPath(); for (let q = 0; q < 8; q++) { const a = q * 0.785 + h.a, r0 = 4 + 16 * u, r1 = 9 + 30 * u; ctx.moveTo(h.x + Math.cos(a) * r0, h.y + Math.sin(a) * r0); ctx.lineTo(h.x + Math.cos(a) * r1, h.y + Math.sin(a) * r1); } ctx.stroke(); ctx.fillStyle = 'rgba(255,255,255,' + 0.8 * (1 - u) + ')'; ctx.beginPath(); ctx.arc(h.x, h.y, 6 * (1 - u) + 1, 0, 6.2832); ctx.fill();
      if (h.n && u < 0.9) { ctx.save(); ctx.translate(h.x + h.dx * (10 + 16 * u), h.y - 16 - 30 * u); ctx.scale(inv, inv); ctx.font = '900 14px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.lineWidth = 3.5; ctx.strokeStyle = 'rgba(7,18,31,0.9)'; ctx.fillStyle = h.mineHurt ? '#ff8a9c' : '#ffffff'; ctx.globalAlpha = Math.min(1, (1 - u) * 2.5); ctx.strokeText('-' + h.n, 0, 0); ctx.fillText('-' + h.n, 0, 0); ctx.restore(); } }
    for (let i = SHARD.length - 1; i >= 0; i--) { const p = SHARD[i], u = (T - p.t0) / 1100; if (u >= 1) { SHARD.splice(i, 1); continue; } const px = p.x + p.vx * u * 46, py = p.y + p.vy * u * 46 + 60 * u * u; ctx.fillStyle = 'rgba(' + p.col + ',' + (1 - u) + ')'; ctx.save(); ctx.translate(px, py); ctx.rotate(p.a + u * 6); ctx.fillRect(-3.2 * (1 - u * 0.5), -1.6, 6.4 * (1 - u * 0.5), 3.2); ctx.restore(); }
    { const Wk = W.works || []; for (let i = 0; i < Wk.length; i++) { const w = Wk[i]; if (!w.tower || !w.bp || w.enemy || (G.buildArt && G.buildArt(w))) continue;      /* (a painted tower's eye is in its painting) */ const ty = w.y + w.bp.S * 0.45 - (w.bp.top || 100), g = 0.6 + 0.4 * Math.sin(t * 3 + i); ctx.save(); ctx.globalCompositeOperation = 'lighter'; const gr = ctx.createRadialGradient(w.x, ty, 1, w.x, ty, 26); gr.addColorStop(0, 'rgba(' + TEAM.mine + ',' + 0.55 * g + ')'); gr.addColorStop(1, 'rgba(' + TEAM.mine + ',0)'); ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(w.x, ty, 26, 0, 6.2832); ctx.fill(); ctx.restore(); ctx.fillStyle = '#e8fbff'; ctx.beginPath(); ctx.arc(w.x, ty, 3, 0, 6.2832); ctx.fill(); } }
    for (let i = GONE.length - 1; i >= 0; i--) { const g = GONE[i], u = (T - g.t0) / 900; if (u >= 1) { GONE.splice(i, 1); continue; } ctx.strokeStyle = 'rgba(' + g.col + ',' + (1 - u) + ')'; ctx.lineWidth = Math.max(2, 3 * inv) * (1 - u) + 1; ctx.beginPath(); ctx.arc(g.x, g.y, 8 + 44 * u, 0, 6.2832); ctx.stroke(); const z = 9 * (1 - u * 0.5); ctx.lineWidth = Math.max(2.4, 3 * inv); ctx.beginPath(); ctx.moveTo(g.x - z, g.y - z); ctx.lineTo(g.x + z, g.y + z); ctx.moveTo(g.x + z, g.y - z); ctx.lineTo(g.x - z, g.y + z); ctx.stroke(); }
    for (let i = FX.length - 1; i >= 0; i--) { const f = FX[i], u = (T - f.t0) / 900; if (u >= 1) { FX.splice(i, 1); continue; } const a = 1 - u;
      if (f.from && u < 0.5) { ctx.strokeStyle = 'rgba(' + f.col + ',' + 0.5 * (1 - u * 2) + ')'; ctx.lineWidth = 1.5 * inv; ctx.beginPath(); for (let k = 0; k < f.from.length && k < 40; k++) { ctx.moveTo(f.from[k].x, f.from[k].y); ctx.lineTo(f.x, f.y); } ctx.stroke(); }
      ctx.strokeStyle = 'rgba(' + f.col + ',' + a + ')'; ctx.lineWidth = 2.5 * inv; ctx.beginPath(); ctx.ellipse(f.x, f.y, (8 + 26 * u) * inv, (4 + 13 * u) * inv, 0, 0, 6.2832); ctx.stroke(); ctx.beginPath(); ctx.ellipse(f.x, f.y, (4 + 12 * u) * inv, (2 + 6 * u) * inv, 0, 0, 6.2832); ctx.stroke(); }
    for (let i = POP.length - 1; i >= 0; i--) { const p = POP[i], u = (T - p.t0) / 1400; if (u >= 1) { POP.splice(i, 1); continue; } ctx.globalAlpha = Math.min(1, (1 - u) * 2); label(ctx, p.x, p.y - (14 + 26 * u) * inv, inv, p.text, p.col, 11); ctx.globalAlpha = 1; }
    ctx.restore();
    // on the screen itself: the box being dragged, and which way the fight is when it is out of sight
    ctx.save(); ctx.setTransform(v.dpr, 0, 0, v.dpr, 0, 0);
    if (battle.n && !(G.foeHeart && G.foeHeart(W))) { const a = 0.13 + 0.07 * Math.sin(t * 3.2), g = ctx.createRadialGradient(v.w / 2, v.h / 2, Math.min(v.w, v.h) * 0.42, v.w / 2, v.h / 2, Math.max(v.w, v.h) * 0.72); g.addColorStop(0, 'rgba(' + TEAM.foe + ',0)'); g.addColorStop(1, 'rgba(' + TEAM.foe + ',' + a + ')'); ctx.fillStyle = g; ctx.fillRect(0, 0, v.w, v.h); }      // (alarm: enemies are on your star)
    const b = G.ui.box; if (b) { ctx.fillStyle = 'rgba(' + TEAM.mine + ',0.12)'; ctx.strokeStyle = 'rgba(' + TEAM.mine + ',0.95)'; ctx.lineWidth = 1.5; const x = Math.min(b.x0, b.x1), y = Math.min(b.y0, b.y1), w = Math.abs(b.x1 - b.x0), h = Math.abs(b.y1 - b.y0); ctx.fillRect(x, y, w, h); ctx.strokeRect(x + 0.5, y + 0.5, w, h); }
    if (battle.n && battle.x !== undefined) { const sx = battle.x * v.scale + v.ox, sy = battle.y * v.scale + v.oy; if (sx < 270 || sx > v.w - 320 || sy < 60 || sy > v.h - 80) { const cx = v.w / 2, cy = v.h / 2, a = Math.atan2(sy - cy, sx - cx), ex = G.clamp(sx, 300, v.w - 350), ey = G.clamp(sy, 150, v.h - 130), bl = 0.6 + 0.4 * Math.sin(t * 7);
        ctx.translate(ex, ey); ctx.fillStyle = 'rgba(' + TEAM.foe + ',' + bl + ')'; ctx.strokeStyle = '#14202e'; ctx.lineWidth = 2; ctx.save(); ctx.rotate(a); ctx.beginPath(); ctx.moveTo(26, 0); ctx.lineTo(4, -13); ctx.lineTo(9, 0); ctx.lineTo(4, 13); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore(); ctx.font = '900 10.5px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(7,18,31,0.9)'; ctx.strokeText('FIGHT', 0, -20); ctx.fillStyle = '#ffb3c0'; ctx.fillText('FIGHT', 0, -20); } }
    ctx.restore();
  }

  // ── the battle bar ──
  const battle = { n: 0 }; let bEl = null, bSig = '';
  function battleBar() {
    const W = G.W; if (!bEl) { const st = document.createElement('style'); st.textContent = '#battle{position:fixed;left:50%;top:58px;transform:translateX(-50%);z-index:3;width:min(560px,calc(100vw - 600px));min-width:340px;padding:7px 12px 8px;border-radius:14px;cursor:pointer;font:800 11px system-ui,sans-serif;letter-spacing:.06em;color:#e8f4ff;border-color:rgba(' + TEAM.foe + ',.7);box-shadow:0 0 22px rgba(' + TEAM.foe + ',.28)}#battle.hide{display:none}' +
        '#battle .bt{display:flex;justify-content:space-between;align-items:center;gap:10px;white-space:nowrap}#battle .bm{color:' + TEAM.mineHex + '}#battle .bf{color:#ff8a9c;overflow:hidden;text-overflow:ellipsis}#battle .bv{color:#ffe9a8;letter-spacing:.2em;flex:none}' +
        '#battle .bb{display:flex;height:9px;margin-top:6px;border-radius:5px;overflow:hidden;background:rgba(7,18,31,.7);border:1px solid rgba(207,232,255,.25)}#battle .bb i{display:block;height:100%}#battle .bh{margin-top:5px;font:700 10px system-ui;letter-spacing:.03em;color:rgba(207,232,255,.75);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}';
      document.head.appendChild(st); bEl = document.createElement('div'); bEl.id = 'battle'; bEl.className = 'glass hide'; bEl.title = 'Go to the fight'; bEl.innerHTML = '<div class="bt"><span class="bm"></span><span class="bv">AGAINST</span><span class="bf"></span></div><div class="bb"><i style="background:' + TEAM.mineHex + '"></i><i style="background:' + TEAM.foeHex + '"></i></div><div class="bh"></div>'; (document.getElementById('ui') || document.body).appendChild(bEl); bEl.addEventListener('click', function () { C.seeFoes(); }); }
    if (!W || !C.live()) { bEl.classList.add('hide'); battle.n = 0; return; }
    let fn = 0, fe = 0, mn = 0, me = 0, x = 0, y = 0; for (let i = 0; i < W.cre.length; i++) { const c = W.cre[i]; if (c.dead || c.inShip) continue; if (c.team === 1) { fn++; fe += Math.max(0, c.E); x += c.x; y += c.y; } else if (!c.team && (c.job === 'f' || c.job === 'u')) { mn++; me += Math.max(0, c.E); } }
    battle.n = fn; if (!fn) { bEl.classList.add('hide'); bSig = ''; return; } battle.x = x / fn; battle.y = y / fn;
    const col = G.colony(W), r = col.raid, their = G.foeHeart ? G.foeHeart(W) : null, hp = G.heartOf(W), who = their ? 'DEFENDERS' : r && r.state !== 'warn' ? 'RAIDERS OF ' + String(r.name).toUpperCase() : 'ENEMIES', tot = Math.max(1, me + fe);
    const hc = their ? G.buildCount(their) : hp ? G.buildCount(hp) : null, n = G.jobCount(W), sg = [fn, mn, Math.round(me / tot * 40), who, hc ? hc[0] : ''].join('|'); const rb = document.getElementById('resbar'); if (rb && rb.offsetHeight) { const tp = Math.round(rb.getBoundingClientRect().bottom + 6) + 'px'; if (bEl.style.top !== tp) bEl.style.top = tp; }
    bEl.classList.remove('hide'); if (sg === bSig) return; bSig = sg;
    bEl.querySelector('.bm').textContent = 'YOURS · ' + n.f + ' FIGHTERS' + (n.u ? ' · ' + n.u + ' GUARDS' : ''); bEl.querySelector('.bf').textContent = fn + ' ' + who;
    const I = bEl.querySelectorAll('.bb i'); I[0].style.width = (me / tot * 100).toFixed(1) + '%'; I[1].style.width = (fe / tot * 100).toFixed(1) + '%';
    bEl.querySelector('.bh').textContent = (their ? 'Their Heart: ' + hc[0] + ' of ' + hc[2] + ' pieces stand. Choose your fighters and click it.' : hc ? 'Your Heart: ' + hc[0] + ' of ' + hc[2] + ' pieces stand.' : '') + (mn ? '' : ' You have no fighters: press + next to Fighters.') + ' Click here to go to the fight.';
  }

  // ── what happens in a fight, shown and heard ──
  const seen = function (x, y) { const v = G.view, sx = x * v.scale + v.ox, sy = y * v.scale + v.oy; return sx > -40 && sx < v.w + 40 && sy > -40 && sy < v.h + 40; };
  G.on('fight', function (a, b, dmg) {
    if (dmg === undefined || G.mode !== 'play') return;      // (a blow of the colony's fights: the wild biting of the star is told elsewhere)
    const colA = a.team === 1 ? TEAM.foe : TEAM.mine, bx = b.x, by = b.y - mid(b); if (HIT.length < 60) HIT.push({ x: bx, y: by, t0: now(), col: colA, a: (a.id % 7) * 0.3, n: Math.max(1, Math.round(dmg)), mineHurt: !b.team, dx: b.x >= a.x ? 1 : -1 });
    if (calm() && G.sfx && seen(bx, by)) { G.sfx('swing', { volume: 0.5 }); if (b.job === 'u') G.sfx('block', { volume: 0.55 }); else G.sfx('clash', { volume: 0.5 }); } });
  G.on('work-hit', function (w, by) { if (G.mode !== 'play' || !by) return; if (w.bp && w.bp.type === 'heart' && G.R && seen(w.x, w.y)) G.R.shake = Math.max(G.R.shake || 0, 0.12); const colA = by.team === 1 ? TEAM.foe : TEAM.mine; if (HIT.length < 60) HIT.push({ x: by.x + (w.x - by.x) * 0.55, y: by.y - mid(by) + (w.y - by.y) * 0.3, t0: now(), col: colA, a: (by.id % 7) * 0.3 }); if (calm() && G.sfx && seen(w.x, w.y)) G.sfx('thud', { volume: 0.45 }); });
  G.on('tower-zap', function (w, c) { ZAP.push({ x0: w.x, y0: w.y + w.bp.S * 0.45 - (w.bp.top || 100), x1: c.x, y1: c.y - mid(c), t0: now() }); c.hitT = G.W.t; if (HIT.length < 60) HIT.push({ x: c.x, y: c.y - mid(c), t0: now(), col: TEAM.mine, a: 0.2, n: 16, dx: 1 }); if (calm() && G.sfx && seen(c.x, c.y)) G.sfx('zap', { volume: 0.4 }); });
  G.on('slain', function (a, b) { if (G.mode !== 'play') return; burst(b.x, b.y - mid(b), b.team === 1 ? TEAM.foe : TEAM.mine, 14); if (G.scorch) G.scorch(b.x, b.y, 30); if (G.R && seen(b.x, b.y)) G.R.shake = Math.max(G.R.shake || 0, 0.18); GONE.push({ x: b.x, y: b.y - mid(b), t0: now(), col: b.team === 1 ? TEAM.foe : TEAM.mine }); C.pop(b.x, b.y - top(b), b.team === 1 ? 'enemy slain' : (b.job ? JOBS[b.job].name.toLowerCase() : 'one of yours') + ' lost', b.team === 1 ? '#bfe9ff' : '#ffb3c0'); });
  G.on('tower-kill', function (w, b) { if (G.mode !== 'play') return; burst(b.x, b.y - mid(b), TEAM.foe, 14); if (G.scorch) G.scorch(b.x, b.y, 30); GONE.push({ x: b.x, y: b.y - mid(b), t0: now(), col: TEAM.foe }); C.pop(b.x, b.y - top(b), 'struck down by the ' + w.name, '#bfe9ff'); });
  G.on('delivered', function (c, k) { if (G.mode !== 'play' || G.speed > 4) return; const st = G.storeAt(G.W); if (st && k === 3) C.pop(st.x, st.y - 10, '+1 lumen', '#8ef0ff'); });
  G.on('raid-land', function () { if (G.sfx && G.mode === 'play') G.sfx('horn', { volume: 0.7 }); });
  G.on('new-pond', function () { FX.length = ZAP.length = POP.length = HIT.length = GONE.length = SHARD.length = 0; });
  G.on('heart-grew', function (h) { if (G.mode !== 'play') return; burst(h.x, h.y - 20, '255,220,140', 26); FX.push({ x: h.x, y: h.y + h.bp.S * 0.45, t0: now(), col: '255,220,140' }); });

  let lastB = 0;
  G.addSystem({ name: 'field', update: function () { const T = now(); if (T - lastB > 300) { lastB = T; try { battleBar(); } catch (e) { console.error(e); } } }, draw: function () { try { draw(); } catch (e) { if (!draw.err) { draw.err = 1; console.error(e); } } } });
})();
