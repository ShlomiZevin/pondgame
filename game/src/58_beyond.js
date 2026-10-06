// ── Beyond the pond ──
// The pond has no wall round it. At its sides and its floor the water simply goes on, into a mist nobody has been through:
// far lights wink in it. When the pond grows (57_grow) it is this mist that
// draws back, and what was hidden becomes water to live in. Drawn over the pond, in the pond's own measure.
(function () {
  'use strict';
  const TAU = 6.2832;
  let pulse = 0;          // 1 just after the mist drew back, fading: the rim glows for a moment
  G.on('pond-grew', function () { pulse = 1; });
  G.drawBeyond = function (ctx) {
    const W = G.W; if (!W || W.title) return;
    const v = G.view, s = v.scale * v.dpr, t = G.rt || 0, ww = W.ww, wh = W.wh, B = Math.min(ww, wh) * 0.14, top = G.shoreY ? G.shoreY(W) : 0;
    // nothing of it is on screen when you are zoomed in on the middle
    const x0 = -v.ox / v.scale, y0 = -v.oy / v.scale, x1 = x0 + v.w / v.scale, y1 = y0 + v.h / v.scale;
    if (x0 > B && x1 < ww - B && y1 < wh - B) { pulse = Math.max(0, pulse - 0.01); return; }
    ctx.save(); ctx.setTransform(s, 0, 0, s, v.ox * v.dpr, v.oy * v.dpr);
    const mist = function (a) { return 'rgba(5,16,27,' + a + ')'; };
    const band = function (gx0, gy0, gx1, gy1, rx, ry, rw, rh) { const g = ctx.createLinearGradient(gx0, gy0, gx1, gy1); g.addColorStop(0, mist(0.96)); g.addColorStop(0.45, mist(0.55)); g.addColorStop(1, mist(0)); ctx.fillStyle = g; ctx.fillRect(rx, ry, rw, rh); };
    band(0, 0, B, 0, -400, top, B + 400, wh - top + 400);                       // left
    band(ww, 0, ww - B, 0, ww - B, top, B + 400, wh - top + 400);               // right
    band(0, wh, 0, wh - B, -400, wh - B, ww + 800, B + 400);                    // the floor
    // the mist moves: slow banks of it drifting along the edges
    for (let i = 0; i < 26; i++) {
      const side = i % 3, u = ((i * 0.381966 + t * (0.004 + (i % 5) * 0.0012)) % 1), in_ = (0.25 + 0.55 * ((i * 0.7548) % 1)) * B, r = B * (0.5 + ((i * 0.5698) % 1) * 0.6);
      const x = side === 0 ? in_ : side === 1 ? ww - in_ : u * ww, y = side === 2 ? wh - in_ : top + u * (wh - top);
      const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, 'rgba(130,185,215,' + (0.17 + 0.07 * Math.sin(t * 0.4 + i)) + ')'); g.addColorStop(1, 'rgba(120,170,200,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    }
    // far lights in it: somebody else's ponds, or eyes
    for (let i = 0; i < 46; i++) {
      const side = i % 3, u = (i * 0.618034) % 1, in_ = (0.08 + 0.5 * ((i * 0.3247) % 1)) * B, tw = 0.5 + 0.5 * Math.sin(t * (0.6 + (i % 7) * 0.13) + i * 2.1);
      const x = side === 0 ? in_ : side === 1 ? ww - in_ : u * ww, y = side === 2 ? wh - in_ : top + u * (wh - top);
      ctx.beginPath(); ctx.arc(x, y, 2.2 + 3.2 * tw, 0, TAU); ctx.fillStyle = 'hsla(' + (170 + (i * 47) % 120) + ',80%,78%,' + (0.2 + 0.6 * tw) + ')'; ctx.fill();
    }
    // the mist has just drawn back: its edge shines for a moment
    if (pulse > 0.01) { ctx.strokeStyle = 'rgba(190,235,255,' + 0.55 * pulse + ')'; ctx.lineWidth = 6 + 26 * (1 - pulse); ctx.beginPath(); ctx.moveTo(B, top); ctx.lineTo(B, wh - B); ctx.lineTo(ww - B, wh - B); ctx.lineTo(ww - B, top); ctx.stroke(); pulse = Math.max(0, pulse - 0.006); }
    ctx.restore();
  };
})();
