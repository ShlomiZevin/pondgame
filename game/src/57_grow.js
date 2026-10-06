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
    if (G.canvas) G.resize(); else { v.wh = 1400 * g; v.ww = ow * v.wh / oh; }
    W.ww = v.ww; W.wh = v.wh;
    const kx = W.ww / ow, ky = W.wh / oh;
    const mv = function (L, also) { if (!L) return; for (let i = 0; i < L.length; i++) { const o = L[i]; if (!o || typeof o.x !== 'number') continue; o.x *= kx; o.y *= ky; if (also) { if (typeof o.px === 'number') { o.px *= kx; o.py *= ky; } if (typeof o.tx === 'number') { o.tx *= kx; o.ty *= ky; } } } };
    mv(W.cre, true); mv(W.food); mv(W.zones); mv(W.births); mv(W.lights); mv(W.works); mv(W.deedPast); if (W.deed) mv([W.deed]);
    G.cam.x = cx * W.ww; G.cam.y = cy * W.wh; G.applyCam();
    G.emit('pond-grew', g);
  };
  let told = 1;
  G.on('scored', function () {
    const W = G.W, v = G.view; if (!W || W.title) return;
    const g = v.grow || 1, want = G.clamp(g * Math.sqrt(G.pondCover() / ROOM), 1, MAXG);
    if (want > g * 1.02) G.pondGrowTo(Math.min(want, g * 1.1));              // a tenth at a time: it widens over a few generations
    else if (want < g * 0.6) G.pondGrowTo(Math.max(want, g * 0.985));         // and draws in again, slowly, if they turn small
    const now = v.grow || 1;
    if (G.mode === 'play' && now >= told + 0.3) { told = now; if (G.toast) G.toast('The pond has grown: there are more of them, and bigger, so there is more water.'); if (G.log) G.log('disc', 'The pond grew', 'It is now ' + now.toFixed(1) + ' times as wide as it began.'); }
  });
  // a new pond starts small again
  { const new0 = G.newWorld; G.newWorld = function (opts) { const v = G.view; if (v.grow && v.grow !== 1) { v.grow = 1; if (G.canvas) G.resize(); else { v.ww = v.ww * 1400 / v.wh; v.wh = 1400; } } told = 1; return new0(opts); }; }
})();
