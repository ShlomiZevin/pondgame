// ── Running the pond: fixed steps, fast-forward, starting and seeding ponds ──
(function () {
  'use strict';
  let acc = 0;
  G.alpha = 1;
  G.speedSteps = [0, 1, 4, 16, 64];

  G.isBlocked = function () { return !!(G.ui.modal || G.ui.menuOpen); };

  G.setSpeed = function (s) {
    G.speed = s;
    G.paused = s === 0;
    G.emit('speed', s);
  };
  G.togglePause = function () {
    if (G.speed === 0) G.setSpeed(G.lastSpeed || 1);
    else { G.lastSpeed = G.speed; G.setSpeed(0); }
  };

  G.addSystem({
    name: 'sim',
    update: function (dt) {
      const W = G.W;
      if (!W) return;
      if (G.speed === 0 || G.isBlocked() || G.mode === 'boot' || G.catching || (typeof document !== 'undefined' && document.hidden)) { G.alpha = 1; return; }      // a pond nobody is looking at stands still
      const slow = G.mode === 'title';               // the title screen pond just drifts
      const sp = slow ? 0.5 : G.speed;
      const step = sp >= 16 ? 0.1 : G.K.dt;
      acc += dt * sp;
      const t0 = performance.now();
      let n = 0;
      const maxMs = sp >= 16 ? 24 : 14;
      while (acc >= step) {
        G.step(step);
        acc -= step; n++;
        if (n > 4000 || (n % 8 === 0 && performance.now() - t0 > maxMs)) { acc = Math.min(acc, step); break; }
      }
      G.alpha = sp >= 16 ? 1 : acc / step;
      G.simRate = n;
    },
  });

  G.hints = {};
  G.hint = function (key, text, ms) {
    if (G.hints[key]) return;
    G.hints[key] = 1;
    G.emit('hint', text, ms || 7000);
  };

  // a brand new pond: a random population of identical-ish blobs
  G.startPond = function (opts) {
    opts = opts || {};
    G.newWorld({ seed: (Date.now() ^ (Math.random() * 1e9)) >>> 0 });
    const W = G.W;
    if (opts.fossil && opts.fossil.g) {
      // seed from a fossil: a small herd of that species, each a little different
      for (let i = 0; i < 36; i++) {
        const res = G.mutate(G.cloneGenome(opts.fossil.g), 1.6, null);
        const c = G.makeCreature(res.g, null, null, res.muts);
        c.E = c.ph.Emax * 0.4;
        W.births.push({ at: G.rr(0.1, 3.5), c: c, x: W.ww * 0.5 + G.randn() * 170, y: W.wh * 0.5 + G.randn() * 120, from: null });
      }
    } else G.founderPond();
    acc = 0;
    G.cam.z = 1.4; G.cam.x = W.ww / 2; G.cam.y = W.wh / 2; G.applyCam();
    G.hints = {};
    G.R.sel = null;
    G.emit('new-pond', opts);
  };

  G.startTitlePond = function () {
    G.newWorld({ seed: (Date.now() ^ 0x5bd1e995) >>> 0 });
    const W = G.W;
    for (let i = 0; i < 22; i++) {
      const c = G.makeCreature(G.founder(), null, null);
      c.E = c.ph.Emax * 0.7;
      c.x = G.rr(0.15, 0.85) * W.ww; c.y = G.rr(0.15, 0.85) * W.wh; c.px = c.x; c.py = c.y;
      c.snap = G.snapOf(c);
      W.cre.push(c);
    }
    W.title = true;
  };
})();
