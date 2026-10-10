// ── How what they build LOOKS ──
// A building is still raised exactly as before: piece by piece, each one fetched and set by a creature, then coloured (54d_build.js). This file is only
// about how a piece is DRAWN once it is there, so that what stands in the pond looks made, not stamped. The look is of a NEW WORLD: alloy, composite and
// glass, domes with masts, wedge canopies, saucers, drums, strips of light (the pieces keep their old names: see path()):
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
    // (The names are the old ones, so every plan and every design ever made still stands; what each LOOKS like is of a new world:
    //  onion = a geodesic dome with a mast · bell = a flat wedge canopy · cap = a saucer · vase = a reactor drum · drop = a pod ·
    //  scallop = a dish · frond = a light pylon · spiral = a ring · tri = a cut-off spire · door = a hatch · window = a light strip · wing = a swept panel)
    const x = p.x, y = p.y, s = p.s;
    if (s === 'rect') G.roundRect(ctx, x - w / 2, y - h, w, h, Math.min(w, h) * Math.min(p.rr || 0.1, 0.3));
    else if (s === 'beam') G.roundRect(ctx, x - w / 2, y - h, w, h, Math.min(w, h) * 0.3);
    else if (s === 'tri') { ctx.moveTo(x - w / 2, y); ctx.lineTo(x - w * 0.1, y - h * 0.88); ctx.lineTo(x + w * 0.1, y - h * 0.88); ctx.lineTo(x + w / 2, y); ctx.closePath(); }
    else if (s === 'dome') { ctx.moveTo(x - w / 2, y); ctx.ellipse(x, y, w / 2, h, 0, PI, TAU); ctx.closePath(); }
    else if (s === 'circ' || s === 'spiral') ctx.arc(x, y - h / 2, w / 2, 0, TAU);
    else if (s === 'door') G.roundRect(ctx, x - w / 2, y - h, w, h, Math.min(w, h) * 0.2);
    else if (s === 'window') G.roundRect(ctx, x - w / 2, y - h, w, h, Math.min(w, h) * 0.28);
    else if (s === 'wing') { const d = x < 0 ? -1 : 1; ctx.moveTo(x - d * w / 2, y); ctx.lineTo(x + d * w / 2, y - h * 0.34); ctx.lineTo(x + d * w / 2, y - h * 0.5); ctx.lineTo(x - d * w / 2, y - h); ctx.closePath(); }
    else if (s === 'onion') { ctx.moveTo(x - w / 2, y); ctx.ellipse(x, y, w / 2, h * 0.56, 0, PI, TAU); ctx.closePath(); ctx.rect(x - Math.max(1.2, w * 0.022), y - h * 0.96, Math.max(2.4, w * 0.044), h * 0.42); ctx.moveTo(x + Math.max(2.4, w * 0.05), y - h * 0.97); ctx.arc(x, y - h * 0.97, Math.max(2.4, w * 0.05), 0, TAU); }
    else if (s === 'bell') { ctx.moveTo(x - w / 2, y - h * 0.1); ctx.lineTo(x - w * 0.4, y); ctx.lineTo(x + w * 0.4, y); ctx.lineTo(x + w / 2, y - h * 0.1); ctx.lineTo(x + w * 0.2, y - h * 0.52); ctx.lineTo(x - w * 0.2, y - h * 0.52); ctx.closePath(); }
    else if (s === 'cap') { ctx.moveTo(x - w / 2, y - h * 0.3); ctx.bezierCurveTo(x - w * 0.34, y - h * 0.86, x + w * 0.34, y - h * 0.86, x + w / 2, y - h * 0.3); ctx.bezierCurveTo(x + w * 0.3, y + h * 0.02, x - w * 0.3, y + h * 0.02, x - w / 2, y - h * 0.3); ctx.closePath(); }
    else if (s === 'vase') { ctx.moveTo(x - w * 0.42, y); ctx.lineTo(x - w * 0.5, y - h * 0.18); ctx.lineTo(x - w * 0.5, y - h * 0.82); ctx.lineTo(x - w * 0.4, y - h); ctx.lineTo(x + w * 0.4, y - h); ctx.lineTo(x + w * 0.5, y - h * 0.82); ctx.lineTo(x + w * 0.5, y - h * 0.18); ctx.lineTo(x + w * 0.42, y); ctx.closePath(); }
    else if (s === 'drop') { ctx.moveTo(x, y - h); ctx.lineTo(x + w / 2, y - h * 0.56); ctx.lineTo(x + w * 0.3, y); ctx.lineTo(x - w * 0.3, y); ctx.lineTo(x - w / 2, y - h * 0.56); ctx.closePath(); }
    else if (s === 'stairs') { const d = x < 0 ? 1 : -1, x0 = x - d * w / 2; ctx.moveTo(x0, y); ctx.lineTo(x0 + d * w, y - h); ctx.lineTo(x0 + d * w, y); ctx.closePath(); }      // (a ramp, rising toward the middle of the building)
    else if (s === 'span') { const th = Math.max(4, Math.min(w, h) * 0.2); ctx.moveTo(x - w / 2, y); ctx.lineTo(x - w * 0.34, y - h); ctx.lineTo(x + w * 0.34, y - h); ctx.lineTo(x + w / 2, y); ctx.lineTo(x + w / 2 - th, y); ctx.lineTo(x + w * 0.34 - th * 0.7, y - h + th); ctx.lineTo(x - w * 0.34 + th * 0.7, y - h + th); ctx.lineTo(x - w / 2 + th, y); ctx.closePath(); }      // (a gantry: two legs and a bar across)
    else if (s === 'scallop') { ctx.ellipse(x, y - h * 0.62, w * 0.5, h * 0.3, -0.45, 0, TAU); ctx.rect(x - Math.max(1.5, w * 0.04), y - h * 0.5, Math.max(3, w * 0.08), h * 0.5); }
    else if (s === 'frond') { const sw = Math.sin(t * 1.5 + x * 0.05) * w * 0.08, b0 = Math.max(2.5, w * 0.16), t0 = Math.max(1.4, w * 0.07); ctx.moveTo(x - b0, y); ctx.lineTo(x - t0 + sw, y - h); ctx.lineTo(x + t0 + sw, y - h); ctx.lineTo(x + b0, y); ctx.closePath(); }
    else G.roundRect(ctx, x - w / 2, y - h, w, h, Math.min(w, h) * 0.12);
  }
  /** what it is made of, drawn inside its outline (the caller has clipped to it) */
  function texture(ctx, p, w, h, m, done, seed) {
    const x = p.x, y = p.y, roof = p.s === 'tri' || p.s === 'bell' || p.s === 'cap' || p.s === 'onion', round = p.s === 'dome' || p.s === 'circ' || p.s === 'drop' || p.s === 'vase' || p.s === 'spiral', k = done ? 0.75 : 1;
    ctx.lineCap = 'round';
    if (m === 0) {      // stone, worked: alloy plates with seams and a few bolts; on a round thing the seams follow the curve
      const ch = clamp(h / Math.max(1, Math.round(h / 17)), 10, 24), bw = ch * 1.9; ctx.lineWidth = 1.1;
      for (let r = 1, yy = y - ch; yy > y - h * 1.02; r++, yy -= ch) { const bow = round || roof ? ch * 0.3 : 0;
        ctx.strokeStyle = 'rgba(6,14,30,' + 0.22 * k + ')'; ctx.beginPath(); ctx.moveTo(x - w * 0.7, yy); ctx.quadraticCurveTo(x, yy + bow, x + w * 0.7, yy); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,' + 0.16 * k + ')'; ctx.beginPath(); ctx.moveTo(x - w * 0.7, yy + 1.3); ctx.quadraticCurveTo(x, yy + bow + 1.3, x + w * 0.7, yy + 1.3); ctx.stroke();
        if (w > 24) { ctx.strokeStyle = 'rgba(6,14,30,' + 0.16 * k + ')'; ctx.beginPath(); for (let xx = x - w * 0.7 + (r % 2) * bw * 0.5; xx < x + w * 0.7; xx += bw) { ctx.moveTo(xx, yy + bow * 0.6); ctx.lineTo(xx, yy + ch); } ctx.stroke(); ctx.fillStyle = 'rgba(255,255,255,' + 0.22 * k + ')'; for (let xx = x - w * 0.7 + (r % 2) * bw * 0.5 + 3; xx < x + w * 0.7; xx += bw) ctx.fillRect(xx, yy + 3, 1.3, 1.3); } }
    } else if (m === 1) {      // reed, worked: a ribbed composite; on a roof, panels that drink the light
      if (roof) { ctx.fillStyle = 'rgba(20,60,120,' + 0.20 * k + ')'; ctx.fillRect(x - w, y - h * 1.1, w * 2, h * 1.2); const cw = clamp(w / Math.max(3, Math.round(w / 11)), 7, 14); ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(190,230,255,' + 0.22 * k + ')'; ctx.beginPath(); for (let xx = x - w * 0.7; xx < x + w * 0.7; xx += cw) { ctx.moveTo(xx, y - h * 1.05); ctx.lineTo(xx, y + 2); } for (let yy = y - cw; yy > y - h * 1.05; yy -= cw) { ctx.moveTo(x - w * 0.7, yy); ctx.lineTo(x + w * 0.7, yy); } ctx.stroke(); }
      else { const sw = clamp(w / Math.max(3, Math.round(w / 6)), 4, 8); ctx.lineWidth = 1; for (let i = 0, xx = x - w * 0.7; xx < x + w * 0.7; i++, xx += sw) { ctx.strokeStyle = i % 2 ? 'rgba(6,14,30,' + 0.2 * k + ')' : 'rgba(255,255,255,' + 0.14 * k + ')'; ctx.beginPath(); ctx.moveTo(xx, y - h * 1.05); ctx.lineTo(xx, y + 2); ctx.stroke(); } }
      { const g = ctx.createLinearGradient(x - w * 0.5, y - h, x + w * 0.4, y); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.42, 'rgba(255,255,255,' + 0.16 * k + ')'); g.addColorStop(0.56, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.fillRect(x - w, y - h * 1.3, w * 2, h * 1.6); }
    } else {      // shell, worked: glass, with the sky in it
      const g = ctx.createLinearGradient(x - w * 0.5, y - h, x + w * 0.35, y); g.addColorStop(0, 'rgba(255,255,255,' + 0.30 * k + ')'); g.addColorStop(0.22, 'rgba(255,255,255,' + 0.05 * k + ')'); g.addColorStop(0.4, 'rgba(210,240,255,' + 0.22 * k + ')'); g.addColorStop(0.52, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(10,30,70,' + 0.16 * k + ')'); ctx.fillStyle = g; ctx.fillRect(x - w, y - h * 1.3, w * 2, h * 1.6);
    }
    // where it sits on what is under it, it is a little darker; along its upper left edge, lighter
    { const g = ctx.createLinearGradient(0, y - Math.min(h, 12), 0, y + 1); g.addColorStop(0, 'rgba(6,12,30,0)'); g.addColorStop(1, 'rgba(6,12,30,0.22)'); ctx.fillStyle = g; ctx.fillRect(x - w, y - Math.min(h, 12), w * 2, Math.min(h, 12) + 2); }
    if (w > 16 && h > 12 && (p.s === 'rect' || round)) { ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.beginPath(); if (p.s === 'rect') G.roundRect(ctx, x - w / 2 + 3, y - h + 3, Math.max(3, w * 0.14), Math.max(4, h - 7), 3); else ctx.ellipse(x - w * 0.2, y - (p.s === 'dome' ? h * 0.55 : h * 0.66), w * 0.1, h * 0.2, -0.5, 0, TAU); ctx.fill(); }
  }
  /** the small things that say what a piece is: the pane of a window, the leaves of a door, the spots of a cap, the turns of a spiral */
  function details(ctx, p, w, h, hue, t, done, seed) {
    const x = p.x, y = p.y, s = p.s, GL = 'rgba(120,235,255,', glow = function (gx, gy, r, a) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, r); g.addColorStop(0, GL + a + ')'); g.addColorStop(1, GL + '0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(gx, gy, r, 0, TAU); ctx.fill(); ctx.restore(); };
    if (s === 'window') { const in0 = Math.max(1.6, Math.min(w, h) * 0.16), pw = w - in0 * 2, ph = h - in0 * 2; if (pw > 2 && ph > 2) { if (done) glow(x, y - h / 2, Math.max(w, h) * 0.95, 0.34);
        ctx.beginPath(); G.roundRect(ctx, x - pw / 2, y - h + in0, pw, ph, Math.min(pw, ph) * 0.25); const g = ctx.createLinearGradient(x, y - h, x, y); if (done) { g.addColorStop(0, '#eaffff'); g.addColorStop(1, '#5fd6ff'); } else { g.addColorStop(0, 'rgba(16,26,44,0.95)'); g.addColorStop(1, 'rgba(30,44,66,0.95)'); } ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = 1.2; ctx.strokeStyle = INK; ctx.stroke();
        if (ph > 9) { ctx.strokeStyle = 'rgba(10,30,60,0.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x - pw / 2, y - h + in0 + ph * 0.5); ctx.lineTo(x + pw / 2, y - h + in0 + ph * 0.5); ctx.stroke(); } } }
    else if (s === 'door') { if (w > 7) { ctx.strokeStyle = 'rgba(255,255,255,0.16)'; ctx.lineWidth = 1.3; ctx.beginPath(); G.roundRect(ctx, x - w / 2 + 2.5, y - h + 2.5, w - 5, h - 3.5, 2); ctx.stroke(); ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.beginPath(); ctx.moveTo(x, y - 1); ctx.lineTo(x, y - h + 3); ctx.stroke(); if (done) { ctx.fillStyle = '#9af0ff'; ctx.fillRect(x - w * 0.28, y - h + Math.max(3, h * 0.12), w * 0.56, Math.max(1.6, h * 0.05)); glow(x, y - h + h * 0.14, w * 0.7, 0.3); } } }
    else if (s === 'tri') { ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y - h * 0.88); ctx.lineTo(x, y - h * 1.06); ctx.stroke(); ctx.fillStyle = done ? '#9af0ff' : '#3a4a5e'; ctx.beginPath(); ctx.arc(x, y - h * 1.08, 2.2, 0, TAU); ctx.fill(); if (done) glow(x, y - h * 1.08, 8, 0.4); ctx.strokeStyle = 'rgba(8,14,30,0.25)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x - w * 0.3, y - h * 0.4); ctx.lineTo(x + w * 0.3, y - h * 0.4); ctx.stroke(); }
    else if (s === 'bell') { ctx.strokeStyle = 'rgba(8,14,30,0.3)'; ctx.lineWidth = 1.1; ctx.beginPath(); ctx.moveTo(x - w * 0.44, y - h * 0.1); ctx.lineTo(x + w * 0.44, y - h * 0.1); ctx.stroke(); if (done) { ctx.fillStyle = '#9af0ff'; ctx.fillRect(x - w * 0.36, y - h * 0.075, w * 0.72, Math.max(1.4, h * 0.035)); } ctx.strokeStyle = INK; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(x, y - h * 0.52); ctx.lineTo(x, y - h * 0.86); ctx.stroke(); ctx.fillStyle = done ? '#9af0ff' : '#3a4a5e'; ctx.beginPath(); ctx.arc(x, y - h * 0.88, 2.2, 0, TAU); ctx.fill(); }
    else if (s === 'cap') { const n = clamp(Math.round(w / 12), 3, 9); for (let i = 0; i < n; i++) { const u = (i + 0.5) / n - 0.5; ctx.fillStyle = done ? 'rgba(154,240,255,0.95)' : 'rgba(60,76,96,0.9)'; ctx.beginPath(); ctx.arc(x + u * w * 0.82, y - h * (0.3 - 0.06 * Math.cos(u * PI)), Math.max(1.2, w * 0.018), 0, TAU); ctx.fill(); } ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(x - w * 0.1, y - h * 0.58, w * 0.2, h * 0.08, -0.15, 0, TAU); ctx.stroke(); }
    else if (s === 'onion' || s === 'dome') { const hh = s === 'onion' ? h * 0.56 : h; if (w > 18) { ctx.strokeStyle = 'rgba(8,14,30,0.2)'; ctx.lineWidth = 1; [-0.56, 0, 0.56].forEach(function (u) { ctx.beginPath(); ctx.ellipse(x, y, Math.abs(u) * w / 2 + 0.01, hh, 0, PI, TAU); ctx.stroke(); }); ctx.beginPath(); ctx.ellipse(x, y - hh * 0.5, w * 0.435, hh * 0.1, 0, PI, TAU); ctx.stroke(); ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.ellipse(x - w * 0.14, y - hh * 0.6, w * 0.16, hh * 0.16, -0.6, 0, TAU); ctx.stroke(); } if (s === 'onion' && done) glow(x, y - h * 0.97, Math.max(7, w * 0.14), 0.45); }
    else if (s === 'vase') { ctx.fillStyle = 'rgba(8,14,30,0.22)'; [0.16, 0.8].forEach(function (u) { ctx.fillRect(x - w * 0.5, y - h * u - 1.5, w, 3); }); if (done && h > 16) { ctx.fillStyle = 'rgba(154,240,255,0.85)'; ctx.fillRect(x - w * 0.5, y - h * 0.5 - 1.6, w, 3.2); ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = GL + '0.18)'; ctx.fillRect(x - w * 0.5, y - h * 0.5 - 6, w, 12); ctx.restore(); } }
    else if (s === 'drop') { ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1.1; ctx.beginPath(); ctx.moveTo(x, y - h); ctx.lineTo(x, y); ctx.moveTo(x - w / 2, y - h * 0.56); ctx.lineTo(x + w / 2, y - h * 0.56); ctx.stroke(); if (done) glow(x, y - h * 0.56, Math.max(w, h) * 0.7, 0.3); }
    else if (s === 'spiral') { ctx.strokeStyle = INK; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(x, y - h / 2, w * 0.3, 0, TAU); ctx.stroke(); if (done) { ctx.fillStyle = 'rgba(154,240,255,0.9)'; ctx.beginPath(); ctx.arc(x, y - h / 2, w * 0.27, 0, TAU); ctx.fill(); glow(x, y - h / 2, w * 0.8, 0.4); } }
    else if (s === 'scallop') { ctx.strokeStyle = 'rgba(8,14,30,0.3)'; ctx.lineWidth = 1.1; ctx.beginPath(); ctx.ellipse(x, y - h * 0.62, w * 0.34, h * 0.18, -0.45, 0, TAU); ctx.stroke(); ctx.strokeStyle = INK; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(x, y - h * 0.62); ctx.lineTo(x - w * 0.22, y - h * 0.98); ctx.stroke(); ctx.fillStyle = done ? '#9af0ff' : '#3a4a5e'; ctx.beginPath(); ctx.arc(x - w * 0.22, y - h, 2, 0, TAU); ctx.fill(); }
    else if (s === 'frond') { const sw = Math.sin(t * 1.5 + x * 0.05) * w * 0.08; ctx.fillStyle = done ? '#9af0ff' : '#3a4a5e'; ctx.beginPath(); ctx.arc(x + sw, y - h, Math.max(2.4, w * 0.12), 0, TAU); ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.stroke(); if (done) glow(x + sw, y - h, Math.max(9, w * 0.45), 0.4 + 0.15 * Math.sin(t * 3 + x)); }
    else if (s === 'rect' && done && w > 26 && h > 34 && h > w * 1.3) { ctx.fillStyle = 'rgba(154,240,255,0.75)'; ctx.fillRect(x - 1, y - h * 0.92, 2, h * 0.5); }      // (a tall tower has a line of light up it)
  }
  /** one piece, as it stands now (it pops into place when it has just been set; raw until it is coloured) */
  G.pieceDraw = function (ctx, p, hue, t) {
    const age0 = t - (p.t0 || -9), age = age0 < 0 ? 9 : age0, pop = age < 0.3 ? 0.6 + 0.4 * (age / 0.3) + 0.15 * Math.sin(age * 10.5) : 1;
    const mi = clamp((p.um === undefined ? p.m : p.um) | 0, 0, 2), mc = MAT[mi].col, done = p.st > 1, col = done ? (p.c[2] < 20 ? [hue, 30, p.c[2]] : [hue + p.c[0], p.c[1], p.c[2]]) : mc;
    if (done && p.s !== 'flag' && p.s !== 'lamp' && p.s !== 'circ' && p.s !== 'door') { const rf = p.s === 'bell' || p.s === 'onion' || p.s === 'cap' || p.s === 'tri' || p.s === 'dome'; col[1] = col[1] * (rf ? 0.62 : 0.4); col[2] = rf ? clamp(col[2] * 0.92 + 4, 30, 70) : clamp(col[2] * 0.85 + 16, 44, 82); }      // (a roof keeps more of the colour; walls are pale alloy tinted with it)
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
  const KEPT = new WeakMap();      // the kept picture of each building, by its plan (kept beside the plan, not in it: a plan is copied and saved, a picture is not)
  if (draw0) G.drawBlueprint = function (ctx, o, building) {
    const bp = o.bp; if (!bp || building || !bp.P || !bp.P.length) return draw0(ctx, o, building);
    const P = bp.P, t = G.W ? G.W.t : 0; let sig = '' + Math.round(bp.hue || 0), moving = false;
    for (let i = 0; i < P.length; i++) { const p = P[i]; sig += p.st + (p.um === undefined ? '' : 'm' + p.um); if (p.st > 0 && p.t0 !== undefined && t - p.t0 >= 0 && t - p.t0 < 0.45) moving = true; }
    if (moving) return draw0(ctx, o, building);
    let K = KEPT.get(bp), cv = K ? K.cv : null;
    if (!cv || K.sig !== sig) {
      if (G.rt !== frame) { frame = G.rt; made = 0; } if (made >= 2 && cv) sig = K.sig; else {      /* (two new pictures a frame at most: a pond coming back from a save fills in over a few frames) */
        made++; let hw = 30, top = 20; for (let i = 0; i < P.length; i++) { const p = P[i]; hw = Math.max(hw, Math.abs(p.x) + p.w * 0.72); top = Math.max(top, -p.y + p.h * 1.12 + (p.s === 'lamp' ? p.w : 0)); }
        const pad = 10, Wc = hw * 2 + pad * 2, Hc = top + pad * 2 + 6, k = Math.min(2, Math.sqrt(900000 / (Wc * Hc)));
        cv = cv && cv.width === Math.ceil(Wc * k) && cv.height === Math.ceil(Hc * k) ? cv : document.createElement('canvas'); cv.width = Math.ceil(Wc * k); cv.height = Math.ceil(Hc * k);
        const c2 = cv.getContext('2d'); c2.setTransform(k, 0, 0, k, (hw + pad) * k, (top + pad) * k);
        for (let i = 0; i < P.length; i++) if (P[i].st > 0 && !LIVE[P[i].s]) { try { G.pieceDraw(c2, P[i], bp.hue, t); } catch (e) { console.error(e); } }
        K = { cv: cv, sig: sig, box: [hw + pad, top + pad, Wc, Hc] }; KEPT.set(bp, K); } }
    const b = baseOf(o), S = bp.S, box = K.box;
    ctx.save(); ctx.translate(b[0], b[1]);
    { const hw = bp.hw || 60, ring = bp.type === 'wall' && !bp.designed; ctx.fillStyle = 'rgba(8,16,26,0.28)'; ctx.beginPath(); ctx.ellipse(0, S * 0.1, ring ? S * 1.25 : hw * 1.12, ring ? S * 0.74 : Math.max(10, hw * 0.2), 0, 0, TAU); ctx.fill(); }
    ctx.imageSmoothingEnabled = true; ctx.drawImage(cv, -box[0], -box[1], box[2], box[3]);
    for (let i = 0; i < P.length; i++) if (P[i].st > 0 && LIVE[P[i].s]) G.pieceDraw(ctx, P[i], bp.hue, t);
    ctx.restore();
  };

  // ── a building as it stands on the star ──
  // (Only what is drawn on the star itself: a building's picture on a card stays plain.) A building is drawn in two goes:
  //   · what lies on the GROUND under it, drawn with the ground: the earth round it worn pale by coming and going, and its SHADOW, thrown to
  //     the south-east like every shadow on the star;
  //   · the building ITSELF, drawn among the creatures, each thing in its turn from the back of the star to the front: so a creature that
  //     walks behind a building is hidden by it, and one that walks before it is not (50_render.js asks for them, creature by creature).
  // If this star's people have had their way of building PAINTED (53_art.js), the building is its painting: it rises from the ground up as
  // its pieces are set (grey until they are coloured, the part still to come shown as a plan of light), and the parts painted in the team
  // colour are its owner's (yours blue, an enemy's red). If not, it is drawn from its pieces as before, on a platform edged with its owner's colour.
  G.holoPieces = true;
  const TEAMC = { mine: '70,200,255', foe: '255,64,88', other: '214,224,236' };
  const ownerOf = function (o) { const W = G.W; return o.enemy ? 'foe' : (!W.farOf || (G.starHeld && G.starHeld(W)) || o.visitor) ? 'mine' : 'other'; };
  function shadowOf(K) { if (K.sh) return K.sh; const c = document.createElement('canvas'); c.width = K.cv.width; c.height = K.cv.height; const x = c.getContext('2d'); x.drawImage(K.cv, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = '#000'; x.fillRect(0, 0, c.width, c.height); return (K.sh = c); }
  const drawK = G.drawBlueprint, SHOWN = new WeakMap(), fr = function (v) { return v - Math.floor(v); };
  /** the painting this building is shown by, if its star's people have theirs: { s, name, k (star units to a pixel of it) } */
  const artName = function (o) { const bp = o.bp, t = bp.type; return t === 'heart' ? (o.enemy ? 'heart2' : 'heart' + Math.min(3, Math.max(o.tier | 0, bp.tier | 0))) : t === 'spire' ? (o.tower || (o.result && o.result.tower) ? 'tower' : 'spire') : t; };
  function artOf(o) { const A = G.art, bp = o.bp; if (!A || !A.sprite || !bp) return null; const name = artName(o); if (!A.WIDTH[name]) return null; const s = A.sprite(G.W, name); return s ? { s: s, name: name, k: A.WIDTH[name] / s.w } : null; }
  /** while its painting is on its way a building stands as a shape of light in its owner's colour (so it is never seen drawn one way and then another) */
  function lightUp(ctx, o) { const bp = o.bp, b = baseOf(o), t = G.rt || 0, col = TEAMC[ownerOf(o)], P = bp.P, hw = bp.hw || 60, top = bp.top || bp.S * 1.4; ctx.save(); ctx.translate(b[0], b[1]);
    for (let i = 0; i < P.length; i++) { const p = P[i]; if (p.s === 'flag' || p.s === 'lamp') continue; ctx.beginPath(); path(ctx, p, p.w, p.h, t); ctx.fillStyle = 'rgba(' + col + ',' + (0.10 + 0.04 * Math.sin(t * 2.4 + i)) + ')'; ctx.fill(); ctx.strokeStyle = 'rgba(' + col + ',0.42)'; ctx.lineWidth = 1.1; ctx.stroke(); }
    ctx.globalCompositeOperation = 'lighter'; const sy = -top * ((t * 0.5) % 1), g = ctx.createLinearGradient(0, sy - 12, 0, sy + 12); g.addColorStop(0, 'rgba(' + col + ',0)'); g.addColorStop(0.5, 'rgba(' + col + ',0.2)'); g.addColorStop(1, 'rgba(' + col + ',0)'); ctx.fillStyle = g; ctx.fillRect(-hw - 10, sy - 12, hw * 2 + 20, 24); ctx.restore(); }
  G.buildArt = artOf;
  const prog = function (bp) { let a = 0, c = 0; const P = bp.P; for (let i = 0; i < P.length; i++) { if (P[i].st > 0) a++; if (P[i].st > 1) c++; } return [a / Math.max(1, P.length), c / Math.max(1, P.length)]; };
  // a building's small picture (on its card): its painting, where it has one
  { const pic0 = G.buildPic; if (pic0) G.buildPic = function (o, px) { let a = null; try { a = o && o.bp && G.W && !G.W.title && (o.name !== undefined || o.title !== undefined) ? artOf(o) : null; } catch (e) { a = null; } if (!a) return pic0(o, px);
      const pr = prog(o.bp), team = ownerOf(o), sig = 'art:' + a.name + ':' + team + ':' + Math.round(pr[0] * 24) + ':' + Math.round(pr[1] * 24); if (o._pic && o._pic.sig === sig) return o._pic.url;
      try { const N = (px || 96) * 2, cv = document.createElement('canvas'); cv.width = cv.height = N; const x = cv.getContext('2d'), s = a.s, k = Math.min(N * 0.94 / s.w, N * 0.92 / s.h), x0 = (N - s.w * k) / 2, y0 = N * 0.96 - s.h * k, yF = Math.round(s.h * (1 - pr[0])), yC = Math.round(s.h * (1 - Math.min(pr[0], pr[1]))); x.imageSmoothingEnabled = true;
        const part = function (img, ya, yb, al) { if (yb - ya < 1) return; x.globalAlpha = al; x.drawImage(img, 0, ya, s.w, yb - ya, x0, y0 + ya * k, s.w * k, (yb - ya) * k); }; part(G.art.grey(s), 0, yF, 0.22); part(G.art.grey(s), yF, yC, 1); part(G.art.tinted(s, team), yC, s.h, 1);
        o._pic = { sig: sig, url: cv.toDataURL('image/png') }; return o._pic.url; } catch (e) { return pic0(o, px); } }; }
  { const bt0 = G.buildTop; if (bt0) G.buildTop = function (o) { let a = null; try { a = o && o.bp && G.W && !G.W.title && (o.name !== undefined || o.title !== undefined) ? artOf(o) : null; } catch (e) { a = null; } return a ? a.s.ay * a.k - o.bp.S * 0.45 + 6 : bt0(o); }; }
  function groundPart(ctx, o, building, art) {
    const W = G.W, bp = o.bp, t = G.rt || 0, b = baseOf(o), S = bp.S, hw = bp.hw || 60, top = bp.top || S * 1.4, col = TEAMC[ownerOf(o)], P = bp.P, ring = bp.type === 'wall' && !bp.designed, pad = bp.type !== 'ship' && bp.type !== 'port' && !ring, TL = G.terrainLook ? G.terrainLook(W) : null;
    if (art) { const sp = art.s, k = art.k, half = sp.w * k / 2, pr = prog(bp), f = building ? pr[0] : Math.max(pr[0], 0.1), a0 = ctx.globalAlpha;
      if (TL && bp.type !== 'ship') { const rx = half * 1.5, ry = rx * 0.5; ctx.save(); ctx.translate(b[0], b[1] + sp.h * k * 0.03); ctx.scale(1, ry / rx); const g = ctx.createRadialGradient(0, 0, rx * 0.4, 0, 0, rx); g.addColorStop(0, 'rgba(' + TL.lite + ',0.24)'); g.addColorStop(0.7, 'rgba(' + TL.lite + ',0.10)'); g.addColorStop(1, 'rgba(' + TL.lite + ',0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, rx, 0, TAU); ctx.fill(); ctx.restore(); }
      if (!o.lifting && f > 0.02) { const sh = G.art.flat(sp, [0, 0, 0]), pd = sh.pad, cutY = Math.floor(sp.h * (1 - f)); ctx.save(); ctx.translate(b[0], b[1]); ctx.transform(1, 0, -0.62, -0.2, 0, 0); ctx.globalAlpha = a0 * 0.4; ctx.drawImage(sh, 0, pd + cutY, sh.width, sp.h - cutY + pd, (-sp.ax - pd) * k, (cutY - sp.ay) * k, sh.width * k, (sp.h - cutY + pd) * k); ctx.restore(); }
      return; }
      // its shadow
      const K = !building ? KEPT.get(bp) : null; if (K && K.cv && !o.lifting) { ctx.save(); ctx.translate(b[0], b[1]); ctx.transform(1, 0, -0.62, -0.24, 0, 0); ctx.globalAlpha = 0.3; ctx.drawImage(shadowOf(K), -K.box[0], -K.box[1], K.box[2], K.box[3]); ctx.restore(); }
      // its platform
      if (pad) { const rx = hw * 1.16 + 10, ry = Math.max(10, hw * 0.25 + 3), big = bp.type === 'heart' ? 1.5 : 1; ctx.save(); ctx.translate(b[0], b[1] + 2);
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; const gl = ctx.createRadialGradient(0, 0, rx * 0.5, 0, 0, rx * 1.5); gl.addColorStop(0, 'rgba(' + col + ',' + (0.20 + 0.05 * Math.sin(t * 2 + b[0])) * big + ')'); gl.addColorStop(1, 'rgba(' + col + ',0)'); ctx.scale(1, ry / rx); ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(0, 0, rx * 1.5, 0, TAU); ctx.fill(); ctx.restore();
        ctx.fillStyle = 'rgba(6,10,16,0.55)'; ctx.beginPath(); ctx.ellipse(0, 5, rx, ry, 0, 0, TAU); ctx.fill();
        const g = ctx.createLinearGradient(0, -ry, 0, ry); g.addColorStop(0, '#3a4a5e'); g.addColorStop(0.5, '#1c2634'); g.addColorStop(1, '#0c121b'); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, TAU); ctx.fill();
        ctx.strokeStyle = 'rgba(' + col + ',0.9)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, TAU); ctx.stroke(); ctx.strokeStyle = 'rgba(255,255,255,0.22)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(0, -1.5, rx * 0.86, ry * 0.8, 0, PI * 1.05, PI * 1.95); ctx.stroke();
        for (let q = 0; q < 6; q++) { const a = q * 1.0472 + t * 0.35, lx = Math.cos(a) * rx, ly = Math.sin(a) * ry; if (ly < -ry * 0.2) continue; ctx.fillStyle = 'rgba(' + col + ',' + (0.6 + 0.4 * Math.sin(t * 4 + q)) + ')'; ctx.beginPath(); ctx.arc(lx, ly, 1.8, 0, TAU); ctx.fill(); }
        ctx.restore(); }
      // while it is going up: what is still to come, as a hologram
      if (building) { ctx.save(); ctx.translate(b[0], b[1]); const scan = (t * 0.6) % 1; for (let i = 0; i < P.length; i++) { const p = P[i]; if (p.st !== 0) continue; ctx.beginPath(); if (p.s === 'lamp') ctx.arc(p.x, p.y, p.w / 2, 0, TAU); else if (p.s === 'flag') ctx.rect(p.x - 1, p.y - p.h, p.w, p.h); else path(ctx, p, p.w, p.h, t);
            ctx.fillStyle = 'rgba(' + col + ',' + (0.07 + 0.04 * Math.sin(t * 3 + i)) + ')'; ctx.fill(); ctx.strokeStyle = 'rgba(' + col + ',0.5)'; ctx.lineWidth = 1.1; ctx.stroke(); }
          ctx.save(); ctx.globalCompositeOperation = 'lighter'; const sy = -top * scan, g = ctx.createLinearGradient(0, sy - 10, 0, sy + 10); g.addColorStop(0, 'rgba(' + col + ',0)'); g.addColorStop(0.5, 'rgba(' + col + ',0.22)'); g.addColorStop(1, 'rgba(' + col + ',0)'); ctx.fillStyle = g; ctx.fillRect(-hw - 10, sy - 10, hw * 2 + 20, 20); ctx.restore(); ctx.restore(); }
  }
  function artUp(ctx, o, building, art) {
    const W = G.W, bp = o.bp, t = G.rt || 0, b = baseOf(o), team = ownerOf(o), col = TEAMC[team], sp = art.s, k = art.k, pr = prog(bp), A0 = ctx.globalAlpha, P = bp.P;
    let sh = SHOWN.get(bp); if (!sh) { sh = { f: building ? 0 : pr[0], c: building ? 0 : pr[1] }; SHOWN.set(bp, sh); } const dt = Math.min(0.1, G.frameDt || 0.016); sh.f += (pr[0] - sh.f) * Math.min(1, dt * 3); sh.c += (pr[1] - sh.c) * Math.min(1, dt * 3);
    const f = Math.abs(pr[0] - sh.f) < 0.004 ? pr[0] : sh.f, c = Math.min(f, Math.abs(pr[1] - sh.c) < 0.004 ? pr[1] : sh.c);
    const x0 = b[0] - sp.ax * k, y0 = b[1] - sp.ay * k, yF = Math.round(sp.h * (1 - f)), yC = Math.round(sp.h * (1 - c)), lineY = y0 + yF * k, wide = sp.w * k;
    const part = function (img, ya, yb, a, off) { if (yb - ya < 1) return; ctx.globalAlpha = A0 * a; const o2 = off || 0; ctx.drawImage(img, 0, ya + o2, img.width, yb - ya, x0 - o2 * k, y0 + ya * k, img.width * k, (yb - ya) * k); };
    ctx.save(); ctx.imageSmoothingEnabled = true;
    if (yF > 0) {
      if (building) { const fl = G.art.flat(sp, col.split(',').map(Number)); part(fl, 0, yF, 0.2 + 0.05 * Math.sin(t * 3), fl.pad); part(G.art.grey(sp), 0, yF, 0.2); }      /* (what is still to come: its plan, in its owner's light) */
      else { part(G.art.flat(sp, [20, 18, 18]), 0, yF, 0.34, 8); part(G.art.grey(sp), 0, yF, 0.3); } }      /* (what has been knocked down: a burnt shell) */
    part(G.art.grey(sp), yF, yC, 1); part(G.art.tinted(sp, team), yC, o.lifting ? Math.max(yC, Math.round(sp.ay - sp.w * 0.1)) : sp.h, 1); ctx.globalAlpha = A0;      /* (a ship in the air has left the stand it was built on) */
    if (building && yF > 0 && f > 0) { ctx.globalCompositeOperation = 'lighter'; const g = ctx.createLinearGradient(0, lineY - 7, 0, lineY + 7); g.addColorStop(0, 'rgba(' + col + ',0)'); g.addColorStop(0.5, 'rgba(' + col + ',0.5)'); g.addColorStop(1, 'rgba(' + col + ',0)'); ctx.fillStyle = g; ctx.fillRect(x0, lineY - 7, wide, 14);
      for (let i = 0; i < P.length; i++) { const p = P[i], age = p.t0 === undefined ? 9 : W.t - p.t0; if (p.st > 0 && age >= 0 && age < 0.9) { const u = age / 0.9, px = x0 + wide * (0.2 + 0.6 * fr(i * 0.618 + 0.3)); ctx.strokeStyle = 'rgba(255,230,170,' + (1 - u) + ')'; ctx.lineWidth = 1.6; ctx.beginPath(); for (let q = 0; q < 7; q++) { const an = q * 0.9 + i, r0 = 3 + 10 * u, r1 = 8 + 24 * u; ctx.moveTo(px + Math.cos(an) * r0, lineY + Math.sin(an) * r0); ctx.lineTo(px + Math.cos(an) * r1, lineY + Math.sin(an) * r1 + 10 * u * u); } ctx.stroke(); ctx.fillStyle = 'rgba(255,255,255,' + (1 - u) + ')'; ctx.beginPath(); ctx.arc(px, lineY, 5 * (1 - u), 0, TAU); ctx.fill(); } }
      ctx.globalCompositeOperation = 'source-over'; }
    if (!building && yF > 0 && (o.dmg || o.hitT !== undefined || o.ruin || o.fall)) { const hot = o.hitT !== undefined && W.t - o.hitT < 25;
      for (let m = 0; m < 3; m++) { const px = x0 + wide * (0.25 + 0.25 * m), py = Math.min(lineY + 10, b[1] - 8); for (let q = 0; q < 4; q++) { const u = ((t * 0.28 + q / 4 + m * 0.37) % 1); ctx.fillStyle = 'rgba(40,40,46,' + 0.4 * (1 - u) + ')'; ctx.beginPath(); ctx.arc(px + Math.sin(u * 4 + q + m) * 9, py - u * 80, 7 + u * 15, 0, TAU); ctx.fill(); }
        if (hot) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; for (let q = 0; q < 3; q++) { const fl = 0.6 + 0.4 * Math.sin(t * 13 + q * 2 + m), fx = px + (q - 1) * 7; ctx.fillStyle = 'rgba(255,' + Math.round(120 + 80 * fl) + ',40,' + 0.75 * fl + ')'; ctx.beginPath(); ctx.moveTo(fx - 6, py); ctx.quadraticCurveTo(fx + Math.sin(t * 9 + q) * 4, py - 24 * fl, fx + 6, py); ctx.closePath(); ctx.fill(); } ctx.restore(); } } }
    if (building && o.pile && G.matDraw) { const px = clamp(b[0] + wide / 2 + 26, 30, W.ww - 30), py = b[1] + 8; let n = 0; for (let q = 0; q < 3; q++) for (let j = 0; j < Math.min(6, o.pile[q]); j++) { G.matDraw(ctx, { x: px + ((n % 4) - 1.5) * 9, y: py - Math.floor(n / 4) * 7, k: q, s: (n * 0.37) % 1 }, 0); n++; } }
    ctx.restore();
  }
  function plainUp(ctx, o, building) {
    const W = G.W, bp = o.bp, t = G.rt || 0, b = baseOf(o), S = bp.S, hw = bp.hw || 60, top = bp.top || S * 1.4, col = TEAMC[ownerOf(o)], P = bp.P, ring = bp.type === 'wall' && !bp.designed, pad = bp.type !== 'ship' && bp.type !== 'port' && !ring;
    drawK(ctx, o, building);
      ctx.save(); ctx.translate(b[0], b[1]);
      if (building) { for (let i = 0; i < P.length; i++) { const p = P[i], age = p.t0 === undefined ? 9 : W.t - p.t0; if (p.st > 0 && age >= 0 && age < 0.9) { const u = age / 0.9; ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = 'rgba(255,230,170,' + (1 - u) + ')'; ctx.lineWidth = 1.6; ctx.beginPath(); for (let q = 0; q < 7; q++) { const a = q * 0.9 + i, r0 = 3 + 10 * u, r1 = 8 + 24 * u; ctx.moveTo(p.x + Math.cos(a) * r0, p.y - p.h * 0.5 + Math.sin(a) * r0); ctx.lineTo(p.x + Math.cos(a) * r1, p.y - p.h * 0.5 + Math.sin(a) * r1 + 10 * u * u); } ctx.stroke(); ctx.fillStyle = 'rgba(255,255,255,' + (1 - u) + ')'; ctx.beginPath(); ctx.arc(p.x, p.y - p.h * 0.5, 5 * (1 - u), 0, TAU); ctx.fill(); ctx.restore(); } } }
      else { let have = 0; for (let i = 0; i < P.length; i++) if (P[i].st > 0) have++;
        if (have >= P.length && pad && bp.type !== 'heart') { const on = Math.sin(t * 3 + b[0] * 0.05) > 0.1; ctx.strokeStyle = '#16202e'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, -top + 4); ctx.lineTo(0, -top - 9); ctx.stroke(); if (on) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(' + col + ',0.4)'; ctx.beginPath(); ctx.arc(0, -top - 10, 9, 0, TAU); ctx.fill(); ctx.restore(); } ctx.fillStyle = on ? 'rgba(' + col + ',1)' : '#2a3848'; ctx.beginPath(); ctx.arc(0, -top - 10, 2.6, 0, TAU); ctx.fill(); }
        if (have < P.length && (o.dmg || o.hitT !== undefined || o.ruin || o.fall)) { const hot = o.hitT !== undefined && W.t - o.hitT < 25, miss = P.filter(function (p) { return p.st === 0; }).slice(0, 3);
          miss.forEach(function (p, k) { for (let q = 0; q < 4; q++) { const u = ((t * 0.28 + q / 4 + k * 0.37) % 1), px = p.x + Math.sin(u * 4 + q + k) * 9, py = p.y - p.h * 0.4 - u * 70; ctx.fillStyle = 'rgba(40,40,46,' + 0.38 * (1 - u) + ')'; ctx.beginPath(); ctx.arc(px, py, 6 + u * 13, 0, TAU); ctx.fill(); }
            if (hot) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; for (let q = 0; q < 3; q++) { const fl = 0.6 + 0.4 * Math.sin(t * 13 + q * 2 + k), fx = p.x + (q - 1) * 6; ctx.fillStyle = 'rgba(255,' + Math.round(120 + 80 * fl) + ',40,' + 0.75 * fl + ')'; ctx.beginPath(); ctx.moveTo(fx - 5, p.y - p.h * 0.3); ctx.quadraticCurveTo(fx + Math.sin(t * 9 + q) * 4, p.y - p.h * 0.3 - 20 * fl, fx + 5, p.y - p.h * 0.3); ctx.closePath(); ctx.fill(); } ctx.restore(); } }); } }
      ctx.restore();
  }
  const UP = [];      // the buildings waiting for their turn among the creatures, this frame: back ones first
  G.drawBlueprint = function (ctx, o, building) {
    const bp = o && o.bp; if (!bp || !G.W || ctx !== G.ctx || (o.name === undefined && o.title === undefined)) return drawK(ctx, o, building);
    let art = null, wait = false; try { art = artOf(o); wait = !art && !!(G.art && G.art.waiting && G.art.waiting(G.W, artName(o))); if (!wait) groundPart(ctx, o, building, art); else { const b = baseOf(o), hw = bp.hw || 60; ctx.fillStyle = 'rgba(0,0,0,0.16)'; ctx.beginPath(); ctx.ellipse(b[0], b[1] + 4, hw * 1.1, hw * 0.3, 0, 0, TAU); ctx.fill(); } } catch (e) { if (!G.drawBlueprint.err) { G.drawBlueprint.err = 1; console.error(e); } }
    const u = { o: o, b: building, a: ctx.globalAlpha, y: baseOf(o)[1] + (bp.type === 'ship' ? (o.lifting ? 1e6 : 90) : 0), art: art, wait: wait };      /* (a ship stands ON its port, so it is drawn after it; in the air, after everything) */ let i = UP.length; while (i > 0 && UP[i - 1].y > u.y) i--; UP.splice(i, 0, u);
    if (UP.length > 700) G.drawUprights(ctx, 1e9);
  };
  /** anything else that stands up from the ground takes its turn among the creatures and the buildings too: fn(ctx, arg) is called when it comes */
  G.upright = function (y, fn, arg) { const u = { y: y, fn: fn, arg: arg, a: 1 }; let lo = 0, hi = UP.length; while (lo < hi) { const m = (lo + hi) >> 1; if (UP[m].y > y) hi = m; else lo = m + 1; } UP.splice(lo, 0, u); if (UP.length > 700) G.drawUprights(G.ctx, 1e9); };
  /** draw the buildings that stand behind the line y (50_render.js: before each creature, and once more after the last) */
  G.drawUprights = function (ctx, y) {
    while (UP.length && UP[0].y <= y) { const u = UP.shift(); ctx.save(); ctx.globalAlpha = u.a; try { if (u.fn) u.fn(ctx, u.arg); else if (u.art) artUp(ctx, u.o, u.b, u.art); else if (u.wait) lightUp(ctx, u.o); else plainUp(ctx, u.o, u.b); } catch (e) { if (!G.drawBlueprint.err2) { G.drawBlueprint.err2 = 1; console.error(e); } } ctx.restore(); }
  };
})();
