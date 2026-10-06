// ── The pond grows ──
// A pond of tiny cells is roomy; the same pond full of big creatures is a crush where nothing can be made out. So the pond
// itself widens as its creatures take up more of it: each generation it looks at how much of the water is covered by bodies
// and, when that is too much, grows a little (up to about two and a half times across). Everything in it moves apart with
// it, and the food stays what it was, so there is more room, not more mouths. The whole pond still fits the screen.
(function () {
  'use strict';
  const MAXG = 2.6, ROOM = 0.085;          // bodies may cover about a twelfth of the water
  /** how much of the pond is covered by bodies (0..1) */
  G.pondCover = function () { const W = G.W; if (!W || !W.cre.length) return 0; let a = 0; for (let i = 0; i < W.cre.length; i++) { const r = (W.cre[i].ph.r || 8) * 1.9; a += 3.1416 * r * r; } return a / (W.ww * W.wh); };
  /** make the pond g times its first size, moving everything in it apart */
  G.pondGrowTo = function (g) {
    const W = G.W, v = G.view; if (!W) return;
    g = G.clamp(g, 1, MAXG); if (Math.abs(g - (v.grow || 1)) < 0.001) return;
    const ow = W.ww, oh = W.wh, cx = G.cam.x / ow, cy = G.cam.y / oh;
    v.grow = g;
    v.wh = 1400 * g; if (G.canvas && v.h) { v.base = v.h / v.wh; v.ww = G.clamp(v.w / v.base, 840 * g, 3360 * g); } else v.ww = ow * v.wh / oh;      // (the same sum as G.resize, without rebuilding the canvas)
    W.ww = v.ww; W.wh = v.wh;
    const kx = W.ww / ow, ky = W.wh / oh;
    const mv = function (L, also) { if (!L) return; for (let i = 0; i < L.length; i++) { const o = L[i]; if (!o || typeof o.x !== 'number') continue; o.x *= kx; o.y *= ky; if (also) { if (typeof o.px === 'number') { o.px *= kx; o.py *= ky; } if (typeof o.tx === 'number') { o.tx *= kx; o.ty *= ky; } } } };
    mv(W.cre, true); mv(W.food); mv(W.zones); mv(W.births); mv(W.lights); mv(W.works); mv(W.deedPast); if (W.deed) mv([W.deed]);
    G.cam.x = cx * W.ww; G.cam.y = cy * W.wh; G.applyCam();
  };
  let told = 1, aim = 0;
  if (typeof setInterval !== 'undefined' && typeof document !== 'undefined') setInterval(function () { const W = G.W, v = G.view; if (!W || W.title || !aim || G.mode !== 'play') return; const g = v.grow || 1; if (Math.abs(aim - g) < 0.002) { aim = 0; return; } G.pondGrowTo(g + G.clamp(aim - g, -0.004, 0.006)); }, 50);
  G.on('scored', function () {
    const W = G.W, v = G.view; if (!W || W.title) return;
    const g = v.grow || 1, want = G.clamp(g * Math.sqrt(G.pondCover() / ROOM), 1, MAXG);
    let to = 0;
    if (want > g * 1.02) to = Math.min(want, g * 1.12);                      // an eighth at a time: it widens over a few generations
    else if (want < g * 0.6) to = Math.max(want, g * 0.985);                 // and draws in again, slowly, if they turn small
    if (to) { if (typeof document === 'undefined' || G.mode !== 'play') G.pondGrowTo(to); else { if (to > g) G.emit('pond-grew', to); aim = to; } }
    const now = v.grow || 1;
    if (G.mode === 'play' && now >= told + 0.3) { told = now; if (G.toast) G.toast('The mist drew back: the pond is wider now, because its creatures needed the room.'); if (G.log) G.log('disc', 'The pond grew', 'It is now ' + now.toFixed(1) + ' times as wide as it began.'); }
  });
  // a new pond starts small again
  { const new0 = G.newWorld; G.newWorld = function (opts) { const v = G.view; if (v.grow && v.grow !== 1) { v.grow = 1; if (G.canvas) G.resize(); else { v.ww = v.ww * 1400 / v.wh; v.wh = 1400; } } told = 1; return new0(opts); }; }
})();
