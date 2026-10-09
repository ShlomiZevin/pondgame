// ── How what they build LOOKS ──
// A building is still raised exactly as before: piece by piece, each one fetched and set by a creature, then coloured (54d_build.js). This file is only
// about how a piece is DRAWN once it is there, so that what stands in the pond looks made, not stamped:
//   · every piece is lit from the upper left and shaded toward its foot, so it has a body;
//   · what it is made of shows: stone is laid in courses, reed is bound stalks (thatch on a roof), shell is ribbed and pearly;
//   · there are more shapes to build with, most of them rounded: an onion dome, a bell roof, a mushroom cap, a vase, a drop, a window with a pane that
//     glows, steps, an open arch, a fan shell, a frond that sways, a snail's spiral (the designer may use any of them: see BUILD_SYSTEM on the server);
//   · a finished building is drawn once and kept as a picture (only its flags, fronds and lamps go on moving), so a pond full of buildings costs no more
//     to draw than before.
(function () {
  'use strict';
  if (typeof document === 'undefined') return;
  const TAU = 6.2832, PI = Math.PI, INK = '#14202e', clamp = G.clamp, MAT = G.MATS || [{ col: [205, 12, 62] }, { col: [78, 38, 58] }, { col: [32, 55, 84] }];
  const hsl = function (h, s, l, a) { return 'hsla(' + ((h % 360) + 360) % 360 + ',' + clamp(s, 0, 100) + '%,' + clamp(l, 0, 100) + '%,' + (a === undefined ? 1 : a) + ')'; };
  const rnd = function (i) { const v = Math.sin(i * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };
  const LIVE = { flag: 1, frond: 1, lamp: 1 };      // these move: they are never part of a kept picture
  const BODY = { rect: 1, dome: 1, tri: 1, circ: 1, onion: 1, bell: 1, cap: 1, vase: 1, drop: 1, scallop: 1, spiral: 1, stairs: 1, span: 1, wing: 1 };      // these show what they are made of

  /** the outline of a piece (its foot at p.y, standing w wide and h high; a ball and a spiral are centred half-way up) */
  function path(ctx, p, w, h, t) {
    const x = p.x, y = p.y, s = p.s;
    if (s === 'rect') G.roundRect(ctx, x - w / 2, y - h, w, h, Math.min(w, h) * (p.rr || 0.2));
    else if (s === 'beam') G.roundRect(ctx, x - w / 2, y - h, w, h, Math.min(w, h) * 0.45);
    else if (s === 'tri') { ctx.moveTo(x - w / 2, y); ctx.lineTo(x - w * 0.05, y - h * 0.93); ctx.quadraticCurveTo(x, y - h * 1.02, x + w * 0.05, y - h * 0.93); ctx.lineTo(x + w / 2, y); ctx.closePath(); }
    else if (s === 'dome') { ctx.moveTo(x - w / 2, y); ctx.ellipse(x, y, w / 2, h, 0, PI, TAU); ctx.closePath(); }
    else if (s === 'circ' || s === 'spiral') ctx.arc(x, y - h / 2, w / 2, 0, TAU);
    else if (s === 'door' || s === 'window') { const r = Math.min(w / 2, h); ctx.moveTo(x - w / 2, y); ctx.lineTo(x - w / 2, y - h + r); ctx.ellipse(x, y - h + r, w / 2, r, 0, PI, TAU); ctx.lineTo(x + w / 2, y); ctx.closePath(); }
    else if (s === 'wing') { const d = x < 0 ? -1 : 1; ctx.moveTo(x - d * w / 2, y); ctx.quadraticCurveTo(x + d * w * 0.1, y - h * 0.02, x + d * w / 2, y - h * 0.22); ctx.quadraticCurveTo(x + d * w * 0.05, y - h * 0.5, x - d * w / 2, y - h); ctx.closePath(); }
    else if (s === 'onion') { ctx.moveTo(x - w * 0.3, y); ctx.bezierCurveTo(x - w * 0.64, y - h * 0.1, x - w * 0.52, y - h * 0.56, x - w * 0.1, y - h * 0.72); ctx.quadraticCurveTo(x - w * 0.02, y - h * 0.84, x, y - h); ctx.quadraticCurveTo(x + w * 0.02, y - h * 0.84, x + w * 0.1, y - h * 0.72); ctx.bezierCurveTo(x + w * 0.52, y - h * 0.56, x + w * 0.64, y - h * 0.1, x + w * 0.3, y); ctx.closePath(); }
    else if (s === 'bell') { ctx.moveTo(x - w / 2, y - h * 0.07); ctx.quadraticCurveTo(x - w * 0.42, y, x - w * 0.34, y); ctx.lineTo(x + w * 0.34, y); ctx.quadraticCurveTo(x + w * 0.42, y, x + w / 2, y - h * 0.07); ctx.quadraticCurveTo(x + w * 0.16, y - h * 0.22, x + w * 0.07, y - h * 0.88); ctx.quadraticCurveTo(x, y - h * 1.04, x - w * 0.07, y - h * 0.88); ctx.quadraticCurveTo(x - w * 0.16, y - h * 0.22, x - w / 2, y - h * 0.07); ctx.closePath(); }
    else if (s === 'cap') { ctx.moveTo(x - w / 2, y - h * 0.2); ctx.bezierCurveTo(x - w * 0.5, y - h * 0.82, x - w * 0.26, y - h, x, y - h); ctx.bezierCurveTo(x + w * 0.26, y - h, x + w * 0.5, y - h * 0.82, x + w / 2, y - h * 0.2); ctx.quadraticCurveTo(x + w * 0.46, y, x + w * 0.3, y - h * 0.02); ctx.quadraticCurveTo(x, y - h * 0.12, x - w * 0.3, y - h * 0.02); ctx.quadraticCurveTo(x - w * 0.46, y, x - w / 2, y - h * 0.2); ctx.closePath(); }
    else if (s === 'vase') { ctx.moveTo(x - w * 0.3, y); ctx.bezierCurveTo(x - w * 0.64, y - h * 0.28, x - w * 0.62, y - h * 0.74, x - w * 0.32, y - h); ctx.lineTo(x + w * 0.32, y - h); ctx.bezierCurveTo(x + w * 0.62, y - h * 0.74, x + w * 0.64, y - h * 0.28, x + w * 0.3, y); ctx.closePath(); }
    else if (s === 'drop') { ctx.moveTo(x, y - h); ctx.bezierCurveTo(x + w * 0.12, y - h * 0.62, x + w * 0.6, y - h * 0.5, x + w * 0.5, y - h * 0.24); ctx.bezierCurveTo(x + w * 0.42, y + h * 0.02, x - w * 0.42, y + h * 0.02, x - w * 0.5, y - h * 0.24); ctx.bezierCurveTo(x - w * 0.6, y - h * 0.5, x - w * 0.12, y - h * 0.62, x, y - h); ctx.closePath(); }
    else if (s === 'stairs') { const n = clamp(Math.round(h / 9), 2, 5), d = x < 0 ? 1 : -1, x0 = x - d * w / 2; ctx.moveTo(x0, y); for (let i = 0; i < n; i++) { ctx.lineTo(x0 + d * w * i / n, y - h * (i + 1) / n); ctx.lineTo(x0 + d * w * (i + 1) / n, y - h * (i + 1) / n); } ctx.lineTo(x0 + d * w, y); ctx.closePath(); }      // (they rise toward the middle of the building)
    else if (s === 'span') { const th = Math.max(4, Math.min(w, h) * 0.24); ctx.moveTo(x - w / 2, y); ctx.ellipse(x, y, w / 2, h, 0, PI, TAU); ctx.lineTo(x + w / 2 - th, y); ctx.ellipse(x, y, Math.max(1, w / 2 - th), Math.max(1, h - th), 0, TAU, PI, true); ctx.closePath(); }
    else if (s === 'scallop') { const n = 5; ctx.moveTo(x - w * 0.12, y); for (let i = 0; i < n; i++) { const a0 = PI + (i / n) * PI, a1 = PI + ((i + 1) / n) * PI, am = (a0 + a1) / 2; if (!i) ctx.lineTo(x + Math.cos(a0) * w / 2, y + Math.sin(a0) * h * 0.9); ctx.quadraticCurveTo(x + Math.cos(am) * w * 0.62, y + Math.sin(am) * h * 1.16, x + Math.cos(a1) * w / 2, y + Math.sin(a1) * h * 0.9); } ctx.lineTo(x + w * 0.12, y); ctx.closePath(); }
    else if (s === 'frond') { const sw = Math.sin(t * 1.5 + x * 0.05) * w * 0.3, d = x < 0 ? -1 : 1, tx = x + d * w * 0.22 + sw; ctx.moveTo(x - w * 0.16, y); ctx.bezierCurveTo(x - w * 0.62, y - h * 0.4, tx - w * 0.3, y - h * 0.8, tx, y - h); ctx.bezierCurveTo(tx + w * 0.34, y - h * 0.7, x + w * 0.62, y - h * 0.35, x + w * 0.16, y); ctx.closePath(); }
    else G.roundRect(ctx, x - w / 2, y - h, w, h, Math.min(w, h) * 0.2);
  }
  /** what it is made of, drawn inside its outline (the caller has clipped to it) */
  function texture(ctx, p, w, h, m, done, seed) {
    const x = p.x, y = p.y, roof = p.s === 'tri' || p.s === 'bell' || p.s === 'cap' || p.s === 'onion', round = p.s === 'dome' || p.s === 'circ' || p.s === 'drop' || p.s === 'vase' || p.s === 'spiral', k = done ? 0.75 : 1;
    ctx.lineCap = 'round';
    if (m === 0) {      // stone: laid in courses, joints staggered; on a round thing the courses follow the curve
      const ch = clamp(h / Math.max(1, Math.round(h / 12)), 7, 17), bw = ch * 2.1; ctx.lineWidth = 1.1;
      for (let r = 1, yy = y - ch; yy > y - h * 1.02; r++, yy -= ch) {
        const bow = round || roof ? ch * 0.35 : 0;
        ctx.strokeStyle = 'rgba(10,20,40,' + 0.17 * k + ')'; ctx.beginPath(); ctx.moveTo(x - w * 0.7, yy); ctx.quadraticCurveTo(x, yy + bow, x + w * 0.7, yy); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,' + 0.1 * k + ')'; ctx.beginPath(); ctx.moveTo(x - w * 0.7, yy + 1.4); ctx.quadraticCurveTo(x, yy + bow + 1.4, x + w * 0.7, yy + 1.4); ctx.stroke();
        if (w > 20) { ctx.strokeStyle = 'rgba(10,20,40,' + 0.14 * k + ')'; ctx.beginPath(); for (let xx = x - w * 0.7 + (r % 2) * bw * 0.5 + rnd(seed + r) * 3; xx < x + w * 0.7; xx += bw) { ctx.moveTo(xx, yy + bow * 0.6); ctx.lineTo(xx, yy + ch); } ctx.stroke(); }
      }
      if (w > 26 && h > 18) for (let i = 0; i < 4; i++) { ctx.fillStyle = 'rgba(255,255,255,' + 0.07 * k + ')'; ctx.beginPath(); ctx.arc(x + (rnd(seed + i * 3) - 0.5) * w * 0.8, y - rnd(seed + i * 5 + 1) * h * 0.9, 1.4 + rnd(seed + i) * 2.2, 0, TAU); ctx.fill(); }      // a few pale flecks
    } else if (m === 1) {      // reed: bound stalks; on a roof, thatch falling from the top
      const sw = clamp(w / Math.max(3, Math.round(w / 5)), 3.5, 7); ctx.lineWidth = 1;
      for (let i = 0, xx = x - w * 0.7; xx < x + w * 0.7; i++, xx += sw) { ctx.strokeStyle = i % 2 ? 'rgba(40,34,6,' + 0.2 * k + ')' : 'rgba(255,250,210,' + 0.14 * k + ')'; ctx.beginPath(); if (roof) { ctx.moveTo(x + (xx - x) * 0.12, y - h * 1.02); ctx.quadraticCurveTo(x + (xx - x) * 0.7, y - h * 0.4, xx, y + 2); } else { ctx.moveTo(xx + (rnd(seed + i) - 0.5) * 1.5, y - h * 1.05); ctx.lineTo(xx + (rnd(seed + i + 9) - 0.5) * 1.5, y + 2); } ctx.stroke(); }
      if (roof) { ctx.strokeStyle = 'rgba(50,38,8,' + 0.26 * k + ')'; ctx.lineWidth = 1.6; for (let j = 1; j <= 2; j++) { const yy = y - h * (0.26 * j + 0.04); ctx.beginPath(); ctx.moveTo(x - w * 0.7, yy); ctx.quadraticCurveTo(x, yy + h * 0.06, x + w * 0.7, yy); ctx.stroke(); } }
      else if (h > 22) { ctx.fillStyle = 'rgba(60,44,10,' + 0.3 * k + ')'; [0.28, 0.72].forEach(function (u) { ctx.fillRect(x - w * 0.7, y - h * u - 1.5, w * 1.4, 3); }); ctx.fillStyle = 'rgba(255,245,200,' + 0.18 * k + ')'; [0.28, 0.72].forEach(function (u) { ctx.fillRect(x - w * 0.7, y - h * u - 2.6, w * 1.4, 1); }); }      // the bindings
    } else {      // shell: ribs fanning from its foot, growth lines across them, and a pearly sheen
      ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(120,70,50,' + 0.15 * k + ')'; ctx.beginPath(); for (let i = 0; i <= 8; i++) { const a = PI + (i / 8) * PI; ctx.moveTo(x, y + h * 0.05); ctx.lineTo(x + Math.cos(a) * w * 0.9, y + Math.sin(a) * h * 1.25); } ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,' + 0.26 * k + ')'; ctx.lineWidth = 1.3; [0.42, 0.7, 0.96].forEach(function (u) { ctx.beginPath(); ctx.ellipse(x, y + h * 0.05, w * 0.62 * u, h * 1.1 * u, 0, PI, TAU); ctx.stroke(); });
      const g = ctx.createLinearGradient(x - w * 0.5, y - h, x + w * 0.3, y); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.35, 'rgba(255,240,250,' + 0.22 * k + ')'); g.addColorStop(0.5, 'rgba(210,240,255,' + 0.14 * k + ')'); g.addColorStop(0.7, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.fillRect(x - w, y - h * 1.3, w * 2, h * 1.6);
    }
    // where it sits on what is under it, it is a little darker; along its upper left edge, lighter
    { const g = ctx.createLinearGradient(0, y - Math.min(h, 12), 0, y + 1); g.addColorStop(0, 'rgba(6,12,30,0)'); g.addColorStop(1, 'rgba(6,12,30,0.22)'); ctx.fillStyle = g; ctx.fillRect(x - w, y - Math.min(h, 12), w * 2, Math.min(h, 12) + 2); }
    if (w > 16 && h > 12 && (p.s === 'rect' || round)) { ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.beginPath(); if (p.s === 'rect') G.roundRect(ctx, x - w / 2 + 3, y - h + 3, Math.max(3, w * 0.14), Math.max(4, h - 7), 3); else ctx.ellipse(x - w * 0.2, y - (p.s === 'dome' ? h * 0.55 : h * 0.66), w * 0.1, h * 0.2, -0.5, 0, TAU); ctx.fill(); }
  }
  /** the small things that say what a piece is: the pane of a window, the leaves of a door, the spots of a cap, the turns of a spiral */
  function details(ctx, p, w, h, hue, t, done, seed) {
    const x = p.x, y = p.y, s = p.s;
    if (s === 'window') { const in0 = Math.max(2, w * 0.17), pw = w - in0 * 2, ph = h - in0 * 1.7, r = Math.min(pw / 2, ph); if (pw > 2 && ph > 2) {
        ctx.beginPath(); ctx.moveTo(x - pw / 2, y - in0 * 0.8); ctx.lineTo(x - pw / 2, y - in0 * 0.8 - ph + r); ctx.ellipse(x, y - in0 * 0.8 - ph + r, pw / 2, r, 0, PI, TAU); ctx.lineTo(x + pw / 2, y - in0 * 0.8); ctx.closePath();
        const g = ctx.createLinearGradient(x, y - h, x, y); if (done) { g.addColorStop(0, hsl(hue + 44, 95, 86)); g.addColorStop(1, hsl(hue + 30, 90, 64)); } else { g.addColorStop(0, 'rgba(16,26,44,0.95)'); g.addColorStop(1, 'rgba(30,44,66,0.95)'); }
        ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = 1.3; ctx.strokeStyle = INK; ctx.stroke();
        if (pw > 9) { ctx.beginPath(); ctx.moveTo(x, y - in0 * 0.8); ctx.lineTo(x, y - in0 * 0.8 - ph); ctx.moveTo(x - pw / 2, y - in0 * 0.8 - ph * 0.5); ctx.lineTo(x + pw / 2, y - in0 * 0.8 - ph * 0.5); ctx.stroke(); }
        if (done) { ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.beginPath(); ctx.ellipse(x - pw * 0.2, y - in0 * 0.8 - ph * 0.68, pw * 0.1, ph * 0.12, -0.5, 0, TAU); ctx.fill(); } } }
    else if (s === 'door') { if (w > 9) { ctx.strokeStyle = 'rgba(255,255,255,0.17)'; ctx.lineWidth = 1.5; const r = Math.min(w / 2, h) - 3; if (r > 1) { ctx.beginPath(); ctx.moveTo(x - w / 2 + 3, y - 1); ctx.lineTo(x - w / 2 + 3, y - h + r + 3); ctx.ellipse(x, y - h + r + 3, w / 2 - 3, r, 0, PI, TAU); ctx.lineTo(x + w / 2 - 3, y - 1); ctx.stroke(); } ctx.strokeStyle = 'rgba(255,255,255,0.09)'; ctx.beginPath(); ctx.moveTo(x, y - 1); ctx.lineTo(x, y - h + 4); ctx.stroke(); } }
    else if (s === 'cap') { for (let i = 0; i < 5; i++) { const u = (i + 0.5) / 5 - 0.5 + (rnd(seed + i) - 0.5) * 0.08, v = 0.42 + rnd(seed + i * 7) * 0.38 - Math.abs(u) * 0.5, r = w * (0.035 + 0.035 * rnd(seed + i * 3)); if (r < 1.2) continue; ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.beginPath(); ctx.ellipse(x + u * w * 0.8, y - h * v, r, r * 0.8, 0, 0, TAU); ctx.fill(); }
      ctx.strokeStyle = 'rgba(8,14,30,0.3)'; ctx.lineWidth = 1; ctx.beginPath(); for (let i = -3; i <= 3; i++) { ctx.moveTo(x + i * w * 0.09, y - h * 0.1); ctx.lineTo(x + i * w * 0.11, y - h * 0.02); } ctx.stroke(); }      // spots above, gills beneath
    else if (s === 'onion') { ctx.strokeStyle = 'rgba(8,14,30,0.2)'; ctx.lineWidth = 1.1; [-1, 1].forEach(function (d) { ctx.beginPath(); ctx.moveTo(x + d * w * 0.1, y); ctx.bezierCurveTo(x + d * w * 0.3, y - h * 0.2, x + d * w * 0.24, y - h * 0.6, x, y - h * 0.96); ctx.stroke(); }); }
    else if (s === 'vase') { ctx.strokeStyle = 'rgba(8,14,30,0.22)'; ctx.lineWidth = 1.4; [0.24, 0.8].forEach(function (u) { ctx.beginPath(); ctx.moveTo(x - w * 0.56, y - h * u); ctx.quadraticCurveTo(x, y - h * u + h * 0.05, x + w * 0.56, y - h * u); ctx.stroke(); }); }
    else if (s === 'spiral') { ctx.strokeStyle = 'rgba(8,14,30,0.5)'; ctx.lineWidth = Math.max(1.2, w * 0.06); ctx.beginPath(); const cx = x, cy = y - h / 2; for (let i = 0; i <= 44; i++) { const a = i / 44 * TAU * 2.4, r = w * 0.44 * (1 - i / 50); const px = cx + Math.cos(a) * r, py = cy + Math.sin(a) * r; if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py); } ctx.stroke(); }
    else if (s === 'scallop') { ctx.strokeStyle = 'rgba(8,14,30,0.24)'; ctx.lineWidth = 1.1; ctx.beginPath(); for (let i = 1; i < 5; i++) { const a = PI + (i / 5) * PI; ctx.moveTo(x, y - 1); ctx.lineTo(x + Math.cos(a) * w * 0.47, y + Math.sin(a) * h * 0.86); } ctx.stroke(); }
    else if (s === 'frond') { ctx.strokeStyle = 'rgba(8,14,30,0.25)'; ctx.lineWidth = 1; const sw = Math.sin(t * 1.5 + x * 0.05) * w * 0.3, d = x < 0 ? -1 : 1; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x - d * w * 0.06, y - h * 0.5, x + d * w * 0.2 + sw, y - h * 0.94); ctx.stroke(); }
    else if (s === 'stairs') { /* its steps are its outline */ }
  }
  /** one piece, as it stands now (it pops into place when it has just been set; raw until it is coloured) */
  G.pieceDraw = function (ctx, p, hue, t) {
    const age0 = t - (p.t0 || -9), age = age0 < 0 ? 9 : age0, pop = age < 0.3 ? 0.6 + 0.4 * (age / 0.3) + 0.15 * Math.sin(age * 10.5) : 1;
    const mi = clamp((p.um === undefined ? p.m : p.um) | 0, 0, 2), mc = MAT[mi].col, done = p.st > 1, col = done ? (p.c[2] < 20 ? [hue, 30, p.c[2]] : [hue + p.c[0], p.c[1], p.c[2]]) : mc;
    const w = p.w * pop, h = p.h * pop, x = p.x, y = p.y, seed = Math.round(x * 3.1 + y * 7.3 + p.w * 1.7);
    ctx.lineJoin = 'round'; ctx.strokeStyle = INK; ctx.lineWidth = 2;
    if (p.s === 'flag') { ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - h); ctx.stroke(); const fl = Math.sin(t * 5 + x) * w * 0.14, fl2 = Math.cos(t * 5 + x) * w * 0.07;
      ctx.beginPath(); ctx.moveTo(x, y - h); ctx.quadraticCurveTo(x + w * 0.5, y - h - w * 0.12 + fl2, x + w + fl, y - h + w * 0.28); ctx.quadraticCurveTo(x + w * 0.5, y - h + w * 0.42 - fl2, x, y - h + w * 0.6); ctx.closePath();
      ctx.fillStyle = hsl(col[0], col[1], col[2]); ctx.lineWidth = 1.8; ctx.fill(); ctx.stroke(); ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(x, y - h, 2, 0, TAU); ctx.fill(); return; }
    if (p.s === 'lamp') { if (done) { const g = ctx.createRadialGradient(x, y, 0, x, y, w * 3.2); g.addColorStop(0, hsl(hue + 50, 95, 76, 0.5 + 0.2 * Math.sin(t * 3 + x))); g.addColorStop(1, hsl(hue + 50, 95, 76, 0)); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, w * 3.2, 0, TAU); ctx.fill(); }
      const g2 = ctx.createRadialGradient(x - w * 0.15, y - w * 0.15, 0, x, y, w / 2); g2.addColorStop(0, done ? '#fffbe6' : hsl(col[0], col[1], col[2] + 8)); g2.addColorStop(1, hsl(col[0], col[1], col[2])); ctx.fillStyle = g2; ctx.beginPath(); ctx.arc(x, y, w / 2, 0, TAU); ctx.fill(); ctx.lineWidth = 1.8; ctx.stroke(); return; }
    ctx.beginPath(); path(ctx, p, w, h, t);
    if (p.s === 'door') ctx.fillStyle = done ? hsl(col[0], col[1], col[2]) : 'rgba(22,30,46,0.92)';
    else { const g = ctx.createLinearGradient(x - w / 2, y - h, x + w * 0.4, y); g.addColorStop(0, hsl(col[0], col[1] - 4, col[2] + 10)); g.addColorStop(0.5, hsl(col[0], col[1], col[2])); g.addColorStop(1, hsl(col[0] - 6, col[1] + 4, col[2] - 13)); ctx.fillStyle = g; }
    ctx.fill();
    if (BODY[p.s] && w > 8 && h > 6) { ctx.save(); ctx.clip(); texture(ctx, p, w, h, mi, done, seed); ctx.restore(); ctx.beginPath(); path(ctx, p, w, h, t); }
    ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.stroke();
    details(ctx, p, w, h, hue, t, done, seed);
  };

  // ── a finished building is drawn once and kept ──
  // (everything about it that does not move: the picture is made again whenever a piece is set, coloured or lost)
  const baseOf = function (o) { return [o.x, o.y + (o.bp ? o.bp.S * 0.45 : 30)]; };
  const draw0 = G.drawBlueprint; let made = 0, frame = 0;
  if (draw0) G.drawBlueprint = function (ctx, o, building) {
    const bp = o.bp; if (!bp || building || !bp.P || !bp.P.length) return draw0(ctx, o, building);
    const P = bp.P, t = G.W ? G.W.t : 0; let sig = '' + Math.round(bp.hue || 0), moving = false;
    for (let i = 0; i < P.length; i++) { const p = P[i]; sig += p.st + (p.um === undefined ? '' : 'm' + p.um); if (p.st > 0 && p.t0 !== undefined && t - p.t0 >= 0 && t - p.t0 < 0.45) moving = true; }
    if (moving) return draw0(ctx, o, building);
    let cv = bp._cv;
    if (!cv || bp._sig !== sig) {
      if (G.rt !== frame) { frame = G.rt; made = 0; } if (made >= 2 && cv) sig = bp._sig; else {      /* (two new pictures a frame at most: a pond coming back from a save fills in over a few frames) */
        made++; let hw = 30, top = 20; for (let i = 0; i < P.length; i++) { const p = P[i]; hw = Math.max(hw, Math.abs(p.x) + p.w * 0.72); top = Math.max(top, -p.y + p.h * 1.12 + (p.s === 'lamp' ? p.w : 0)); }
        const pad = 10, Wc = hw * 2 + pad * 2, Hc = top + pad * 2 + 6, k = Math.min(2, Math.sqrt(900000 / (Wc * Hc)));
        cv = bp._cv && bp._cv.width === Math.ceil(Wc * k) && bp._cv.height === Math.ceil(Hc * k) ? bp._cv : document.createElement('canvas'); cv.width = Math.ceil(Wc * k); cv.height = Math.ceil(Hc * k);
        const c2 = cv.getContext('2d'); c2.setTransform(k, 0, 0, k, (hw + pad) * k, (top + pad) * k);
        for (let i = 0; i < P.length; i++) if (P[i].st > 0 && !LIVE[P[i].s]) { try { G.pieceDraw(c2, P[i], bp.hue, t); } catch (e) { console.error(e); } }
        bp._cv = cv; bp._sig = sig; bp._box = [hw + pad, top + pad, Wc, Hc]; } }
    const b = baseOf(o), S = bp.S, box = bp._box;
    ctx.save(); ctx.translate(b[0], b[1]);
    { const hw = bp.hw || 60, ring = bp.type === 'wall' && !bp.designed; ctx.fillStyle = 'rgba(8,16,26,0.28)'; ctx.beginPath(); ctx.ellipse(0, S * 0.1, ring ? S * 1.25 : hw * 1.12, ring ? S * 0.74 : Math.max(10, hw * 0.2), 0, 0, TAU); ctx.fill(); }
    ctx.imageSmoothingEnabled = true; ctx.drawImage(cv, -box[0], -box[1], box[2], box[3]);
    for (let i = 0; i < P.length; i++) if (P[i].st > 0 && LIVE[P[i].s]) G.pieceDraw(ctx, P[i], bp.hue, t);
    ctx.restore();
  };
})();
