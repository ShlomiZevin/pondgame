// ── The portrait: the same genes, seen face to face ──
// In the pond a creature is seen from above, swimming. Its portrait is the character you would keep: standing up,
// looking at you, drawn from exactly the same genes, so every body has one portrait and no two bodies share one.
//   segments → how tall it stands        silhouette → how plump          head, neck → its head and how it is carried
//   eyes, mouth → its face               legs → arms and feet             fins, tentacles, horns, feelers, frills,
//   spikes, plates, shell, crest, tail, coat, pattern, glow, poison and the pond's own kinds of part → all where you
//   would expect them on an animal. Colours are its own two, in harmony.
(function () {
  'use strict';
  const F = G.form, clamp = G.clamp, TAU = 6.2832;

  /** draw the portrait centred on the origin; it fills about 230 units of height and width. o: { lx, ly, sleep } */
  F.portrait = function (ctx, f, t, o) {
    o = o || {};
    const col = F._colours(f), INK = F._ink(), cn = F.counts(f), R = f.rules;
    const ink = function (fill, lw) { ctx.fillStyle = fill; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = lw || 3; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke(); };
    const has = function (k) { for (let i = 0; i < R.length; i++) if (R[i].k === k && R[i].on < 0) return R[i]; return null; };
    const kid = function (q) { const i = R.indexOf(q); for (let j = i + 1; j < R.length; j++) if (R[j].on === i) return R[j]; return null; };
    const fin = has(1), spike = has(2), tent = has(3), feel = has(4), plate = has(5), frill = has(6), horn = has(7), leg = has(0);
    const plump = clamp((f.prof[1] + f.prof[2] + f.prof[3]) / 3, 0.6, 1.5);
    const bob = Math.sin(t * 2.2) * 2.2, breathe = 1 + Math.sin(t * 2.2) * 0.015;
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';

    // a star keeps its own plan: arms all round, the face in the middle
    if (f.sym) {
      const k = f.sym, R0 = 52 + 3 * f.n, arm = 30 + 10 * f.prof[2];
      if (f.glow > 0.3) aura(ctx, 0, 0, R0 + arm + 30);
      for (let j = 0; j < k; j++) { const a = j / k * TAU - Math.PI / 2 + Math.sin(t * 1.6 + j) * 0.06; growthsAt(Math.cos(a) * (R0 + arm * 0.6), Math.sin(a) * (R0 + arm * 0.6), a, 0.75, j); }
      if (f.coat >= 2) coatFringe(function (u) { const a = u * TAU - Math.PI / 2, rr = R0 + arm * (0.5 + 0.5 * Math.cos(k * (a + Math.PI / 2))); return [Math.cos(a) * rr, Math.sin(a) * rr, Math.cos(a), Math.sin(a)]; }, 60);
      const starPath = function () { ctx.beginPath(); for (let i = 0; i <= 80; i++) { const a = i / 80 * TAU - Math.PI / 2, rr = (R0 + arm * (0.5 + 0.5 * Math.cos(k * (a + Math.PI / 2)))) * breathe; if (i) ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); else ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); } ctx.closePath(); };
      starPath();
      skin(-R0, -R0, R0 * 2, R0 * 2, R0 + arm, false, false, starPath);
      if (f.shell > 0.25) { ctx.beginPath(); ctx.arc(0, 4, R0 * 0.82, 0, TAU); ctx.globalAlpha = 0.35; ctx.fillStyle = col.dark; ctx.fill(); ctx.globalAlpha = 1; }
      face(0, 2, R0 * 0.78);
      return;
    }

    const bodyW = 44 * Math.pow(plump, 0.7) * (1 + 0.02 * f.n), bodyH = 62 + Math.min(f.n, 12) * 6.5;
    const headR = clamp(40 * Math.pow(f.hd, 0.8), 32, 58), neck = f.n > 1 ? f.nk * 26 : 0;
    const base = 104, by = base - bodyH / 2 - 8, bodyTop = by - bodyH / 2;
    const hy = bodyTop - neck - headR * 0.55 + bob, hx = 0;
    const armPair = cn.legSites >= 2 || (tent && !leg), feet = cn.legSites >= 4;

    if (f.glow > 0.3) aura(ctx, 0, (hy + by) / 2, 150);
    // ── behind the body ──
    if (f.tk && f.n > 1) tail();
    for (let i = 0; i < R.length; i++) { const q = R[i], d = q.k === 8 ? F._dsg(q) : null; if (d && d.place === 'back') { F._design(ctx, d, 0, hy - headR * 0.2, -Math.PI / 2 + Math.sin(t * 1.5) * 0.04, 70 * q.l, q.w, col, 1); } }
    for (let i = 0; i < R.length; i++) { const q = R[i], d = q.k === 8 ? F._dsg(q) : null; if (d && d.place === 'sides' && q.on < 0) for (let sd = -1; sd <= 1; sd += 2) F._design(ctx, d, sd * bodyW * 0.6, by - bodyH * 0.18, (sd > 0 ? -0.5 : Math.PI + 0.5) + sd * Math.sin(t * 3) * (d.motion === 'flap' ? 0.2 : 0.05), 52 * q.l, q.w, col, sd); }
    if (fin) for (let sd = -1; sd <= 1; sd += 2) { const L = 46 * fin.l, fl = Math.sin(t * 3.4) * 0.14; ctx.save(); ctx.translate(sd * bodyW * 0.7, by - bodyH * 0.12); ctx.rotate(sd * (-0.35 + fl)); ctx.beginPath(); ctx.moveTo(0, -12); ctx.quadraticCurveTo(sd * L * 0.9, -L * 0.75, sd * L * 1.2, -L * 0.2); ctx.quadraticCurveTo(sd * L * 0.8, L * 0.25, 0, 20); ctx.closePath(); ink(col.fin, 2.6); ctx.strokeStyle = 'rgba(7,18,31,.3)'; ctx.lineWidth = 1.5; for (let r = 1; r <= 3; r++) { ctx.beginPath(); ctx.moveTo(0, -8 + r * 6); ctx.lineTo(sd * L * (1.15 - r * 0.12), -L * (0.5 - r * 0.2)); ctx.stroke(); } ctx.restore(); }
    if (f.shell > 0.25) { ctx.beginPath(); ctx.ellipse(0, by + 4, bodyW * (1.16 + 0.12 * f.shell), bodyH * 0.56, 0, 0, TAU); ink(col.dark, 3); ctx.strokeStyle = INK; ctx.globalAlpha = 0.35; ctx.lineWidth = 2; for (let r = 1; r <= 2; r++) { ctx.beginPath(); ctx.ellipse(0, by + 4, bodyW * (1.16 + 0.12 * f.shell) * (1 - r * 0.2), bodyH * 0.56 * (1 - r * 0.2), 0, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); } ctx.globalAlpha = 1; }
    if (spike) for (let sd = -1; sd <= 1; sd += 2) for (let j = 0; j < 3; j++) { const a = -0.55 + j * 0.5, L = 15 * spike.l * (1 - j * 0.12), px = sd * Math.cos(a) * bodyW * 0.95, py = by + Math.sin(a) * bodyH * 0.45; ctx.beginPath(); ctx.moveTo(px - sd * 2, py - 7); ctx.lineTo(px + sd * Math.cos(a) * L * 1.5, py + Math.sin(a) * L * 1.2); ctx.lineTo(px - sd * 2, py + 7); ctx.closePath(); ink('#f4f7fb', 2.2); }
    if (frill) for (let sd = -1; sd <= 1; sd += 2) { const L = 30 * frill.l, cx0 = sd * headR * 0.55, cy0 = hy + headR * 0.55, sp = 0.9 + 0.1 * Math.sin(t * 3); ctx.beginPath(); ctx.moveTo(cx0, cy0); for (let j = 0; j <= 6; j++) { const a = (sd > 0 ? -0.5 : Math.PI + 0.5) + sd * (j / 6 * 1.5 - 0.3) * sp, rr = L * (j % 2 ? 0.85 : 1.08); ctx.lineTo(cx0 + Math.cos(a) * rr, cy0 + Math.sin(a) * rr); } ctx.closePath(); ink(col.frill, 2.4); }
    if (tent && (leg || !armPair)) hang(tent);
    else if (tent && armPair && leg) hang(tent);
    // ── feet ──
    if (feet) for (let sd = -1; sd <= 1; sd += 2) { ctx.beginPath(); ctx.ellipse(sd * bodyW * 0.48, base - 3, 17, 10, 0, 0, TAU); ink(col.limb, 2.8); if (leg.t === 1 || leg.t === 0) { ctx.strokeStyle = INK; ctx.lineWidth = 1.6; ctx.globalAlpha = 0.5; for (let j = -1; j <= 1; j++) { ctx.beginPath(); ctx.moveTo(sd * bodyW * 0.48 + j * 6, base - 6); ctx.lineTo(sd * bodyW * 0.48 + j * 6, base + 3); ctx.stroke(); } ctx.globalAlpha = 1; } }
    // ── the body ──
    const bodyPath = function () { ctx.beginPath(); ctx.ellipse(0, by, bodyW * breathe, bodyH / 2, 0, 0, TAU); };
    if (f.coat >= 2) coatFringe(function (u) { const a = u * TAU; return [Math.cos(a) * bodyW, by + Math.sin(a) * bodyH / 2, Math.cos(a), Math.sin(a)]; }, 46);
    bodyPath(); skin(-bodyW, by - bodyH / 2, bodyW * 2, bodyH, bodyH * 0.7, true, false, bodyPath);
    if (plate) { ctx.save(); bodyPath(); ctx.clip(); ctx.fillStyle = col.limb; ctx.globalAlpha = 0.9; ctx.beginPath(); ctx.ellipse(0, by + bodyH * 0.12, bodyW * 0.62, bodyH * 0.36, 0, 0, TAU); ctx.fill(); ctx.globalAlpha = 0.45; ctx.strokeStyle = INK; ctx.lineWidth = 2; for (let j = -1; j <= 1; j++) { ctx.beginPath(); ctx.moveTo(-bodyW * 0.55, by + bodyH * (0.12 + j * 0.13)); ctx.quadraticCurveTo(0, by + bodyH * (0.17 + j * 0.13), bodyW * 0.55, by + bodyH * (0.12 + j * 0.13)); ctx.stroke(); } ctx.restore(); }
    if (f.venom > 0.3) for (let sd = -1; sd <= 1; sd += 2) { ctx.beginPath(); ctx.arc(sd * bodyW * 0.55, by + bodyH * 0.2, 5, 0, TAU); ink('#b6ff3c', 1.8); }
    if (f.glow > 0.3) for (let sd = -1; sd <= 1; sd += 2) for (let j = 0; j < 2; j++) { ctx.beginPath(); ctx.arc(sd * bodyW * (0.5 - j * 0.14), by - bodyH * 0.08 + j * 16, 4, 0, TAU); ctx.fillStyle = col.glow; ctx.fill(); }
    // ── arms ──
    if (armPair) for (let sd = -1; sd <= 1; sd += 2) {
      const q = leg || tent, L = 30 * q.l + 10, wv = Math.sin(t * 2.6 + (sd > 0 ? 0 : 1.4)) * 0.16, sx = sd * bodyW * 0.86, sy = by - bodyH * 0.14;
      const a = (sd > 0 ? 0.55 : Math.PI - 0.55) + sd * wv, ex = sx + Math.cos(a) * L, ey = sy + Math.sin(a) * L;
      for (let pass = 0; pass < 2; pass++) { ctx.strokeStyle = pass ? col.limb : INK; ctx.lineWidth = pass ? 12 : 17; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo(sx + sd * L * 0.6, sy - 4, ex, ey); ctx.stroke(); }
      const k2 = leg ? kid(leg) : null, tip = leg ? (k2 && k2.k === 0 && k2.t ? k2.t : leg.t) : 0;
      if (tip === 2) for (let h = -1; h <= 1; h += 2) { ctx.beginPath(); ctx.moveTo(ex, ey); ctx.quadraticCurveTo(ex + Math.cos(a + h * 1.0) * 14, ey + Math.sin(a + h * 1.0) * 14, ex + Math.cos(a + h * 0.2) * 20, ey + Math.sin(a + h * 0.2) * 20); ctx.quadraticCurveTo(ex + Math.cos(a + h * 0.4) * 8, ey + Math.sin(a + h * 0.4) * 8, ex, ey); ink('#ff8a6b', 2.2); }
      else if (tip === 3) { ctx.beginPath(); ctx.ellipse(ex + Math.cos(a) * 7, ey + Math.sin(a) * 7, 13, 8, a, 0, TAU); ink(col.fin, 2.4); }
      else if (tip === 1 || k2) { ctx.beginPath(); ctx.arc(ex, ey, 9, 0, TAU); ink(col.limb, 2.4); for (let h = -1; h <= 1; h++) { ctx.beginPath(); ctx.arc(ex + Math.cos(a + h * 0.7) * 10, ey + Math.sin(a + h * 0.7) * 10, 4, 0, TAU); ink(col.limb, 2); } }
      else { ctx.beginPath(); ctx.arc(ex, ey, 7.5, 0, TAU); ink(col.limb, 2.4); }
    }
    // ── the head ──
    if (neck > 3) { for (let pass = 0; pass < 2; pass++) { ctx.strokeStyle = pass ? col.body : INK; ctx.lineWidth = pass ? 24 : 30; ctx.beginPath(); ctx.moveTo(0, bodyTop + 10); ctx.lineTo(0, hy + headR * 0.5); ctx.stroke(); } }
    if (f.crest > 0.25) { ctx.beginPath(); ctx.moveTo(-headR * 0.5, hy - headR * 0.75); for (let j = 0; j <= 6; j++) { const x = -headR * 0.5 + j * headR / 6, up = j % 2 ? 24 * (0.6 + f.crest) : 6; ctx.lineTo(x, hy - headR * 0.8 - up * (1 - Math.abs(j - 3) * 0.14)); } ctx.lineTo(headR * 0.5, hy - headR * 0.75); ctx.closePath(); ink(col.frill, 2.4); }
    for (let i = 0; i < R.length; i++) { const q = R[i], d = q.k === 8 ? F._dsg(q) : null; if (d && d.place === 'head') for (let sd = -1; sd <= 1; sd += 2) F._design(ctx, d, sd * headR * 0.55, hy - headR * 0.6, (sd > 0 ? -1.0 : Math.PI + 1.0) + sd * Math.sin(t * 2) * 0.04, 44 * q.l, q.w, col, sd); }
    if (horn) for (let sd = -1; sd <= 1; sd += 2) { const L = 30 * horn.l, bx = sd * headR * 0.55, byh = hy - headR * 0.72; ctx.beginPath(); ctx.moveTo(bx - sd * 9, byh + 6); ctx.quadraticCurveTo(bx + sd * L * 0.2, byh - L * 0.9, bx + sd * L * (0.6 + horn.c * 0.5), byh - L * 1.15); ctx.quadraticCurveTo(bx + sd * L * 0.55, byh - L * 0.4, bx + sd * 10, byh + 8); ctx.closePath(); ink('#ffe9b8', 2.4); }
    if (feel) for (let sd = -1; sd <= 1; sd += 2) { const L = 34 * feel.l, sw = Math.sin(t * 2.4 + sd) * 5, bx = sd * headR * 0.3, byh = hy - headR * 0.85, ex = bx + sd * L * 0.5 + sw, ey = byh - L; for (let pass = 0; pass < 2; pass++) { ctx.strokeStyle = pass ? col.limb : INK; ctx.lineWidth = pass ? 3.4 : 7; ctx.beginPath(); ctx.moveTo(bx, byh); ctx.quadraticCurveTo(bx + sd * L * 0.1, byh - L * 0.8, ex, ey); ctx.stroke(); } ctx.beginPath(); ctx.arc(ex, ey, 6.5, 0, TAU); ink(col.glow, 2.2); }
    const headPath = function () { ctx.beginPath(); ctx.ellipse(hx, hy, headR * 1.1, headR, 0, 0, TAU); };
    if (f.coat >= 2) coatFringe(function (u) { const a = u * TAU; return [Math.cos(a) * headR * 1.1, hy + Math.sin(a) * headR, Math.cos(a), Math.sin(a)]; }, 40, true);
    headPath(); skin(-headR * 1.1, hy - headR, headR * 2.2, headR * 2, headR * 1.3, false, true, headPath);
    face(hx, hy + headR * 0.08, headR);

    // ── helpers ──
    function aura(c, x, y, r) { const g = c.createRadialGradient(x, y, 10, x, y, r); g.addColorStop(0, 'rgba(255,243,168,0.35)'); g.addColorStop(1, 'rgba(255,243,168,0)'); c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); }
    // fill the current path with shaded skin, then its markings inside it, then the outline
    function skin(x, y, w, h, rad, isBody, isHead, again) {
      const g = ctx.createRadialGradient(x + w * 0.38, y + h * 0.3, 4, x + w * 0.5, y + h * 0.5, rad);
      g.addColorStop(0, col.light); g.addColorStop(0.55, col.body); g.addColorStop(1, col.dark);
      ctx.fillStyle = g; ctx.fill();
      ctx.save(); ctx.clip();
      ctx.fillStyle = col.mark; ctx.strokeStyle = col.mark;
      const step = 12 + f.psc * 16, rr = G.rng(f.seed + (isHead ? 7 : 0));
      if (f.pat === 1) { ctx.globalAlpha = 0.8; for (let yy = y + step * (isHead ? 0.2 : 0.6); yy < y + h * (isHead ? 0.4 : 1); yy += step) { ctx.beginPath(); ctx.moveTo(x - 4, yy); ctx.quadraticCurveTo(x + w / 2, yy + 9, x + w + 4, yy); ctx.lineTo(x + w + 4, yy + step * 0.42); ctx.quadraticCurveTo(x + w / 2, yy + 9 + step * 0.42, x - 4, yy + step * 0.42); ctx.closePath(); ctx.fill(); } }
      else if (f.pat === 2) { ctx.globalAlpha = 0.8; for (let i = 0; i < (isHead ? 6 : 12); i++) { ctx.beginPath(); ctx.arc(x + rr() * w, y + rr() * h * (isHead ? 0.38 : 1), 3 + f.psc * 7 * (0.5 + rr()), 0, TAU); ctx.fill(); } }
      else if (f.pat === 4 && !isHead) { ctx.globalAlpha = 0.7; ctx.lineWidth = 4 + f.psc * 4; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(x + w / 2, y + h * (0.3 + i * 0.22), w * 0.2, 0, TAU); ctx.stroke(); } }
      else if (f.pat === 5 && !isHead) { ctx.globalAlpha = 0.85; ctx.beginPath(); ctx.ellipse(x + w / 2, y + h * 0.1, w * 0.6, h * (0.2 + f.psc * 0.15), 0, 0, TAU); ctx.fill(); }
      if ((isBody && (f.pat === 3 || f.coat === 1)) || (f.sym && f.pat === 3)) { ctx.globalAlpha = 0.6; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(x + w / 2, y + h * 0.62, w * 0.33, h * 0.33, 0, 0, TAU); ctx.fill(); }
      if (f.coat === 1 && !isHead) { ctx.globalAlpha = 0.4; ctx.strokeStyle = INK; ctx.lineWidth = 1.6; let row = 0; for (let yy = y + 4; yy < y + h; yy += 9, row++) for (let xx = x + (row % 2) * 7; xx < x + w; xx += 14) { ctx.beginPath(); ctx.arc(xx, yy, 7, 0.2, 2.94); ctx.stroke(); } }
      if (isBody && f.n > 2) { ctx.globalAlpha = 0.16; ctx.strokeStyle = INK; ctx.lineWidth = 2; for (let i = 1; i < Math.min(f.n, 6); i++) { const yy = y + h * i / Math.min(f.n, 6); ctx.beginPath(); ctx.moveTo(x, yy); ctx.quadraticCurveTo(x + w / 2, yy + 8, x + w, yy); ctx.stroke(); } }
      ctx.globalAlpha = 0.35; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(x + w * 0.32, y + h * 0.2, w * 0.18, h * 0.09, -0.4, 0, TAU); ctx.fill();
      ctx.restore();
      again();                                   // the outline goes on last, over the markings
      ctx.strokeStyle = INK; ctx.lineWidth = 3.2; ctx.stroke();
    }
    // fur is a soft fringe behind the outline; feathers are little leaves
    function coatFringe(at, n, skipTop) {
      for (let i = 0; i < n; i++) {
        const p = at(i / n); if (skipTop && p[3] > 0.3 && Math.abs(p[2]) < 0.75) continue;
        if (f.coat === 2) { const ln = 7 + (i % 3) * 2.5; ctx.strokeStyle = col.dark; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(p[0] - p[2] * 3, p[1] - p[3] * 3); ctx.lineTo(p[0] + p[2] * ln, p[1] + p[3] * ln + ln * 0.4); ctx.stroke(); }
        else if (i % 2 === 0) { const tx = -p[3], ty = p[2]; ctx.beginPath(); ctx.moveTo(p[0] - tx * 6, p[1] - ty * 6); ctx.quadraticCurveTo(p[0] + p[2] * 10 - tx * 6, p[1] + p[3] * 10 - ty * 6, p[0] + p[2] * 15, p[1] + p[3] * 15 + 5); ctx.quadraticCurveTo(p[0] + p[2] * 8 + tx * 6, p[1] + p[3] * 8 + ty * 6, p[0] + tx * 6, p[1] + ty * 6); ctx.closePath(); ink(i % 4 ? col.fin : col.frill, 1.8); }
      }
    }
    function tail() {
      const s = 34 * f.ts, wag = Math.sin(t * 3) * 0.18, x0 = bodyW * 0.7, y0 = by + bodyH * 0.3;
      ctx.save(); ctx.translate(x0, y0); ctx.rotate(-0.35 + wag); ctx.beginPath();
      if (f.tk === 1) { ctx.moveTo(0, 0); ctx.quadraticCurveTo(s * 0.7, -s * 1.0, s * 1.3, -s * 0.6); ctx.quadraticCurveTo(s, 0, s * 1.3, s * 0.6); ctx.quadraticCurveTo(s * 0.7, s * 1.0, 0, 0); }
      else if (f.tk === 2) { ctx.moveTo(0, 0); ctx.quadraticCurveTo(s * 0.6, -s * 0.2, s * 1.4, -s * 0.9); ctx.lineTo(s * 0.8, 0); ctx.lineTo(s * 1.4, s * 0.9); ctx.quadraticCurveTo(s * 0.6, s * 0.2, 0, 0); }
      else if (f.tk === 3) { ctx.moveTo(0, -7); ctx.quadraticCurveTo(s * 1.2, -s * 0.2, s * 1.9, -s * 1.1); ctx.quadraticCurveTo(s * 1.3, s * 0.3, 0, 7); }
      else { ctx.moveTo(0, -6); ctx.lineTo(s * 0.9, -6); ctx.arc(s * 1.2, 0, s * 0.42, -2.3, 2.3); ctx.lineTo(0, 6); }
      ctx.closePath(); ink(f.tk === 4 ? col.dark : col.fin, 2.8); ctx.restore();
    }
    // tentacles hang below, swaying
    function hang(q) {
      const n = 4, L = 34 * q.l + 14;
      for (let j = 0; j < n; j++) { const x0 = (j - (n - 1) / 2) * bodyW * 0.42, sw = Math.sin(t * 2.4 + j * 1.3) * 9; for (let pass = 0; pass < 2; pass++) { ctx.strokeStyle = pass ? col.limb : INK; ctx.lineWidth = pass ? 7 : 12; ctx.beginPath(); ctx.moveTo(x0, base - 22); ctx.bezierCurveTo(x0 - sw, base, x0 + sw, base + L * 0.5, x0 + sw * 0.6, base + L * 0.8 - 14); ctx.stroke(); } }
    }
    // whatever a star's arms carry
    function growthsAt(x, y, a, sc, j) {
      for (let i = 0; i < R.length && i < 3; i++) {
        const q = R[i], L = 26 * q.l * sc, ex = x + Math.cos(a) * L, ey = y + Math.sin(a) * L;
        if (q.k === 8) { const d = F._dsg(q); if (d) F._design(ctx, d, x, y, a, 40 * q.l * sc, q.w, col, 1); continue; }
        if (q.k === 5) continue;
        if (q.k === 2 || q.k === 7) { ctx.beginPath(); ctx.moveTo(x - Math.sin(a) * 7, y + Math.cos(a) * 7); ctx.lineTo(ex + Math.cos(a) * 6, ey + Math.sin(a) * 6); ctx.lineTo(x + Math.sin(a) * 7, y - Math.cos(a) * 7); ctx.closePath(); ink(q.k === 2 ? '#f4f7fb' : '#ffe9b8', 2.2); continue; }
        const sw = Math.sin(t * 2.5 + j + i) * 7;
        for (let pass = 0; pass < 2; pass++) { ctx.strokeStyle = pass ? col.limb : INK; ctx.lineWidth = pass ? 8 : 13; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + Math.cos(a) * L * 0.5 - Math.sin(a) * sw, y + Math.sin(a) * L * 0.5 + Math.cos(a) * sw, ex, ey); ctx.stroke(); }
        if (q.k === 4) { ctx.beginPath(); ctx.arc(ex, ey, 6, 0, TAU); ink(col.glow, 2); } else if (q.k === 0) { ctx.beginPath(); ctx.arc(ex, ey, 7, 0, TAU); ink(col.limb, 2.2); }
      }
    }
    // the face: eyes that look at you, a blush, a mouth of its own kind
    function face(x, y, hr) {
      const ne = f.en, er = clamp(hr * (0.2 + f.es * 0.42), hr * 0.2, hr * 0.44), gap = hr * 0.5;
      const lid = o.sleep ? 1 : ((t * 0.31 + (f.seed % 13)) % 3.7 < 0.1 ? 1 : 0);
      const lx = o.lx === undefined ? Math.sin(t * 0.7) * 0.5 : o.lx, ly = o.ly === undefined ? 0.15 + Math.cos(t * 0.9) * 0.25 : o.ly;
      const one = function (ex, ey, r, stalk) {
        if (stalk) { const sy2 = ey - stalk; for (let pass = 0; pass < 2; pass++) { ctx.strokeStyle = pass ? col.body : INK; ctx.lineWidth = pass ? 6 : 11; ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(ex, sy2); ctx.stroke(); } ey = sy2; }
        if (lid) { ctx.beginPath(); ctx.arc(ex, ey, r, 0, TAU); ink(col.dark, 2.6); ctx.beginPath(); ctx.moveTo(ex - r * 0.7, ey); ctx.quadraticCurveTo(ex, ey + r * 0.6, ex + r * 0.7, ey); ctx.strokeStyle = INK; ctx.lineWidth = 2.6; ctx.stroke(); return; }
        ctx.beginPath(); ctx.arc(ex, ey, r, 0, TAU); ink('#fff', 2.8);
        ctx.beginPath(); ctx.arc(ex + lx * r * 0.28, ey + ly * r * 0.28, r * 0.62, 0, TAU); ctx.fillStyle = INK; ctx.fill();
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ex + lx * r * 0.28 - r * 0.22, ey + ly * r * 0.28 - r * 0.26, r * 0.26, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.arc(ex + lx * r * 0.28 + r * 0.22, ey + ly * r * 0.28 + r * 0.2, r * 0.11, 0, TAU); ctx.fill();
      };
      const st = f.ek > 0.25 && !f.sym ? hr * (0.6 + f.ek * 0.5) : 0, ey0 = y - hr * 0.12 - (st ? hr * 0.55 : 0);
      if (ne === 1) one(x, ey0 + (st ? hr * 0.55 : 0), er * 1.35, 0);
      else if (ne >= 2) { one(x - gap, ey0 + (st ? hr * 0.55 : 0), er, st); one(x + gap, ey0 + (st ? hr * 0.55 : 0), er, st); }
      if (ne === 3 || ne === 5) one(x, y - hr * 0.62, er * 0.42, 0);
      if (ne >= 4) { one(x - gap * 0.62, y - hr * 0.6, er * 0.4, 0); one(x + gap * 0.62, y - hr * 0.6, er * 0.4, 0); }
      // a blush
      ctx.globalAlpha = 0.45; ctx.fillStyle = '#ff7fa8'; for (let sd = -1; sd <= 1; sd += 2) { ctx.beginPath(); ctx.ellipse(x + sd * hr * 0.72, y + hr * 0.3, hr * 0.17, hr * 0.11, 0, 0, TAU); ctx.fill(); } ctx.globalAlpha = 1;
      // the mouth
      const my = y + hr * 0.46, m = hr * (0.16 + f.ms * 0.3);
      ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.fillStyle = INK;
      if (f.mk === 1) { ctx.beginPath(); ctx.moveTo(x - m * 0.8, my - m * 0.3); ctx.lineTo(x, my + m * 0.9); ctx.lineTo(x + m * 0.8, my - m * 0.3); ctx.quadraticCurveTo(x, my - m * 0.7, x - m * 0.8, my - m * 0.3); ctx.closePath(); ink('#f6b34a', 2.6); }
      else if (f.mk === 2) { ctx.beginPath(); ctx.moveTo(x - m * 1.3, my - m * 0.2); ctx.quadraticCurveTo(x, my + m * 1.3, x + m * 1.3, my - m * 0.2); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#fff'; for (let j = -1; j <= 1; j += 2) { ctx.beginPath(); ctx.moveTo(x + j * m * 0.75, my - m * 0.16); ctx.lineTo(x + j * m * 0.55, my + m * 0.45); ctx.lineTo(x + j * m * 0.35, my - m * 0.16); ctx.fill(); } }
      else if (f.mk === 3) { ctx.beginPath(); ctx.arc(x, my, m * 0.7, 0, TAU); ink('#ff9fc4', 2.6); ctx.beginPath(); ctx.arc(x, my, m * 0.3, 0, TAU); ctx.fillStyle = INK; ctx.fill(); }
      else { ctx.beginPath(); ctx.moveTo(x - m, my - m * 0.2); ctx.quadraticCurveTo(x, my + m * 0.8, x + m, my - m * 0.2); ctx.stroke(); if (f.mk === 4) { ctx.lineWidth = 1.8; for (let sd = -1; sd <= 1; sd += 2) for (let j = -1; j <= 1; j++) { ctx.beginPath(); ctx.moveTo(x + sd * m * 1.2, my); ctx.lineTo(x + sd * (m * 1.2 + hr * 0.5), my + j * hr * 0.14); ctx.stroke(); } } }
      if (f.venom > 0.3) { ctx.beginPath(); ctx.ellipse(x + m * 0.9, my + m * 0.9, 3, 5, 0, 0, TAU); ink('#b6ff3c', 1.6); }
    }
  };
})();
