// ── How a marvel looks in the pond: an aura, circling sparks, its sign over the head, and what it is doing right now ──
(function () {
  'use strict';
  const TAU = 6.2832;
  const hsl = function (h, s, l, a) { return 'hsla(' + Math.round(((h % 360) + 360) % 360) + ',' + s + '%,' + l + '%,' + a + ')'; };
  const spark = function (ctx, x, y, s) { ctx.beginPath(); ctx.moveTo(x, y - s); ctx.quadraticCurveTo(x, y, x + s, y); ctx.quadraticCurveTo(x, y, x, y + s); ctx.quadraticCurveTo(x, y, x - s, y); ctx.quadraticCurveTo(x, y, x, y - s); ctx.closePath(); ctx.fill(); };

  /** a small drawn sign for each kind of marvel (s: half its size) */
  G.glyph = function (ctx, name, x, y, s, hue, t) {
    ctx.save(); ctx.translate(x, y); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    const fill = hsl(hue, 90, 62, 1), ink = 'rgba(8,14,28,0.9)', lw = Math.max(1.4, s * 0.16);
    const done = function (f) { ctx.fillStyle = f || fill; ctx.fill(); ctx.strokeStyle = ink; ctx.lineWidth = lw; ctx.stroke(); };
    ctx.beginPath();
    if (name === 'gem') { ctx.moveTo(-s, -s * 0.2); ctx.lineTo(-s * 0.55, -s * 0.8); ctx.lineTo(s * 0.55, -s * 0.8); ctx.lineTo(s, -s * 0.2); ctx.lineTo(0, s); ctx.closePath(); done(hsl(hue, 80, 75, 1)); ctx.beginPath(); ctx.moveTo(-s, -s * 0.2); ctx.lineTo(s, -s * 0.2); ctx.moveTo(-s * 0.3, -s * 0.2); ctx.lineTo(0, s); ctx.moveTo(s * 0.3, -s * 0.2); ctx.lineTo(0, s); ctx.stroke(); }
    else if (name === 'flame') { ctx.moveTo(0, -s); ctx.quadraticCurveTo(s * 0.9, -s * 0.1, s * 0.5, s * 0.6); ctx.quadraticCurveTo(0, s * 1.05, -s * 0.5, s * 0.6); ctx.quadraticCurveTo(-s * 0.9, -s * 0.1, -s * 0.2, -s * 0.5); ctx.quadraticCurveTo(-s * 0.1, -s * 0.2, 0, -s); ctx.closePath(); done(hsl(24, 100, 58, 1)); ctx.beginPath(); ctx.moveTo(0, -s * 0.1); ctx.quadraticCurveTo(s * 0.4, s * 0.3, 0, s * 0.7); ctx.quadraticCurveTo(-s * 0.4, s * 0.3, 0, -s * 0.1); ctx.fillStyle = hsl(50, 100, 70, 1); ctx.fill(); }
    else if (name === 'brain') { ctx.arc(-s * 0.4, 0, s * 0.55, 0, TAU); ctx.arc(s * 0.4, 0, s * 0.55, 0, TAU); ctx.arc(0, -s * 0.35, s * 0.5, 0, TAU); ctx.arc(0, s * 0.3, s * 0.5, 0, TAU); done(hsl(hue, 70, 78, 1)); ctx.beginPath(); ctx.moveTo(0, -s * 0.8); ctx.quadraticCurveTo(-s * 0.2, 0, 0, s * 0.7); ctx.stroke(); ctx.fillStyle = '#fff'; spark(ctx, s * 0.7 + Math.sin((t || 0) * 5) * s * 0.1, -s * 0.8, s * 0.3); }
    else if (name === 'note') { ctx.ellipse(-s * 0.3, s * 0.6, s * 0.38, s * 0.28, -0.4, 0, TAU); done(); ctx.beginPath(); ctx.moveTo(s * 0.02, s * 0.5); ctx.lineTo(s * 0.02, -s * 0.9); ctx.quadraticCurveTo(s * 0.7, -s * 0.7, s * 0.6, -s * 0.1); ctx.stroke(); }
    else if (name === 'heart') { ctx.moveTo(0, s * 0.9); ctx.bezierCurveTo(-s * 1.3, -s * 0.1, -s * 0.5, -s * 1, 0, -s * 0.3); ctx.bezierCurveTo(s * 0.5, -s * 1, s * 1.3, -s * 0.1, 0, s * 0.9); ctx.closePath(); done(hsl(350, 85, 66, 1)); }
    else if (name === 'rainbow') { const cols = [0, 40, 120, 210, 280]; for (let i = 0; i < cols.length; i++) { ctx.beginPath(); ctx.arc(0, s * 0.5, s * (1 - i * 0.16), Math.PI, 0); ctx.strokeStyle = hsl(cols[i], 90, 60, 1); ctx.lineWidth = s * 0.18; ctx.stroke(); } }
    else if (name === 'clover') { for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4; ctx.beginPath(); ctx.arc(Math.cos(a) * s * 0.42, Math.sin(a) * s * 0.42, s * 0.42, 0, TAU); done(hsl(120, 70, 52, 1)); } }
    else if (name === 'sun') { for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; ctx.moveTo(Math.cos(a) * s * 0.65, Math.sin(a) * s * 0.65); ctx.lineTo(Math.cos(a) * s, Math.sin(a) * s); } ctx.strokeStyle = ink; ctx.lineWidth = lw * 1.8; ctx.stroke(); ctx.strokeStyle = hsl(48, 100, 62, 1); ctx.lineWidth = lw; ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, s * 0.55, 0, TAU); done(hsl(48, 100, 62, 1)); }
    else if (name === 'moon') { ctx.arc(0, 0, s, -1.2, 1.2 + Math.PI, false); ctx.arc(s * 0.45, 0, s * 0.8, Math.PI + 0.9, -0.9, true); ctx.closePath(); done(hsl(52, 90, 78, 1)); }
    else if (name === 'crown') { ctx.moveTo(-s, s * 0.7); ctx.lineTo(-s, -s * 0.5); ctx.lineTo(-s * 0.5, s * 0.1); ctx.lineTo(0, -s * 0.8); ctx.lineTo(s * 0.5, s * 0.1); ctx.lineTo(s, -s * 0.5); ctx.lineTo(s, s * 0.7); ctx.closePath(); done(hsl(46, 95, 60, 1)); }
    else if (name === 'wing') { ctx.moveTo(-s, s * 0.7); ctx.quadraticCurveTo(-s * 0.6, -s, s * 0.8, -s * 0.8); ctx.quadraticCurveTo(s * 0.3, -s * 0.2, s * 0.6, s * 0.1); ctx.quadraticCurveTo(0, s * 0.1, s * 0.2, s * 0.6); ctx.quadraticCurveTo(-s * 0.4, s * 0.4, -s, s * 0.7); ctx.closePath(); done(hsl(hue, 30, 94, 1)); }
    else { for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, q = i % 2 ? s * 0.45 : s; ctx[i ? 'lineTo' : 'moveTo'](Math.cos(a) * q, Math.sin(a) * q); } ctx.closePath(); done(); }
    ctx.restore();
  };

  /** drawn after the creature itself: (x, y) is where it stands, r its radius on screen */
  G.drawMarvel = function (ctx, c, x, y, r, t, alpha) {
    const mv = c.ph.mv; if (!mv) return;
    const id = c.id || 1, top = y - r * 2.6, cy = y - r * 1.25, hue = mv.hue;      // a character stands about two and a half radii tall
    const born = c.aura > 0.4 ? 1 + (c.aura - 0.4) * 1.2 : 1;            // a new marvel shines extra bright for a while
    ctx.save(); ctx.globalAlpha = alpha;
    // the aura, soft light in the marvel's colour
    ctx.globalCompositeOperation = 'lighter';
    const ar = r * 3.1 * born, g = ctx.createRadialGradient(x, cy, r * 0.2, x, cy, ar);
    g.addColorStop(0, hsl(hue, 95, 62, 0.34 * (0.7 + 0.3 * Math.sin(t * 2.3 + id)))); g.addColorStop(1, hsl(hue, 95, 62, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, cy, ar, 0, TAU); ctx.fill();
    // circling sparks
    for (let i = 0; i < 4; i++) { const a = t * (i % 2 ? -0.7 : 0.7) + i * TAU / 4 + id, k = 1 + 0.06 * Math.sin(t * 3 + i); ctx.fillStyle = hsl(hue + 30, 100, 84, 0.8); spark(ctx, x + Math.cos(a) * r * 1.5 * k, cy + Math.sin(a) * r * 1.7 * k, r * (0.085 + 0.04 * Math.sin(t * 6 + i * 2))); }
    ctx.globalCompositeOperation = 'source-over';
    // what it is doing
    if (c.flame > 0) {
      const a = c.flameAng || 0, L = 130 * (r / Math.max(6, c.ph.r)), p = c.flame / 0.8;
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 12; i++) { const u = i / 11, px = x + Math.cos(a) * (r * 0.8 + L * u), py = y - r * 1.9 + Math.sin(a) * (r * 0.8 + L * u) + Math.sin(t * 25 + i) * r * 0.1, rad = r * (0.22 + 0.55 * u) * (0.75 + 0.25 * Math.sin(t * 31 + i * 1.7)); ctx.fillStyle = hsl(52 - 44 * u, 100, 58 - 14 * u, 0.55 * p * (1 - u * 0.55)); ctx.beginPath(); ctx.arc(px, py, rad, 0, TAU); ctx.fill(); }
      ctx.globalCompositeOperation = 'source-over';
    }
    if (c.healPulse > 0) { const p = c.healPulse / 0.9; ctx.strokeStyle = hsl(130, 85, 70, 0.7 * p); ctx.lineWidth = Math.max(2, r * 0.12); ctx.beginPath(); ctx.arc(x, cy, r * (1.2 + (1 - p) * 3.8), 0, TAU); ctx.stroke(); }
    // its sign floats beside the head, clear of the face, with a little halo
    { const bob = Math.sin(t * 2.2 + id) * r * 0.07, gx = x + r * 1.0, gy = top + r * 0.2 + bob, gs = r * (c.luckT > 0 ? 0.5 : 0.32);
      ctx.globalCompositeOperation = 'lighter'; const hg = ctx.createRadialGradient(gx, gy, gs * 0.2, gx, gy, gs * 2.2); hg.addColorStop(0, hsl(hue, 95, 70, 0.45)); hg.addColorStop(1, hsl(hue, 95, 70, 0)); ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(gx, gy, gs * 2.2, 0, TAU); ctx.fill(); ctx.globalCompositeOperation = 'source-over';
      G.glyph(ctx, c.luckT > 0 ? 'clover' : mv.glyph, gx, gy, gs, hue, t); }
    // speech: only when it can be read
    if (c.say && G.speed <= 16) {
      const fs = Math.max(11, Math.min(20, r * 0.5)); ctx.font = '700 ' + Math.round(fs) + 'px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const w = ctx.measureText(c.say.w).width + fs * 0.9, h = fs * 1.5, bx = x - w / 2, by = top - r * 0.2 - h, p = Math.min(1, c.say.t / 0.4);
      ctx.globalAlpha = alpha * p; ctx.fillStyle = 'rgba(255,255,255,0.96)'; ctx.strokeStyle = 'rgba(8,14,28,0.85)'; ctx.lineWidth = 2;
      ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(bx, by, w, h, h / 2); else ctx.rect(bx, by, w, h); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x - fs * 0.25, by + h - 1); ctx.lineTo(x, by + h + fs * 0.45); ctx.lineTo(x + fs * 0.25, by + h - 1); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#16233a'; ctx.fillText(c.say.w, x, by + h / 2 + 1);
    }
    ctx.restore();
  };
})();
