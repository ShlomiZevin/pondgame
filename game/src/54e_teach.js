// ── What is learned outlives the learner ──
// A creature learns in its own life (G.learn: meals, pain, and the player's GOOD and BAD strengthen or weaken the wires that were in use). By itself that
// would be lost at every death. Two things carry it on:
//   · a child is born half-knowing: wire for wire, it starts with half of what its parents had learned (where it has the same wire as they do);
//   · the young learn from the old: a creature living near an older one of its own kind slowly takes on what that one has learned.
// So a lesson that keeps being useful settles into a kind over the generations, one that stops being useful fades (each passing-on halves it), and a
// kind whose elders all die at once loses what only they knew. It touches no gene: this is a second inheritance beside the genes.
(function () {
  'use strict';
  const BIRTH = 0.5, TEACH = 0.06;
  /** the name of every wire of a brain, in the order the brain keeps them (grouped by where they end; see G.derive) */
  function keys(g) { const nt = g.h + G.NOUT, groups = []; for (let i = 0; i < nt; i++) groups.push([]); for (let i = 0; i < g.w.length; i++) { const w = g.w[i], ti = w.t >= 200 ? g.h + (w.t - 200) : w.t - 100; if (ti >= 0 && ti < nt) groups[ti].push(w.f + '>' + w.t); } return [].concat.apply([], groups); }
  function learned(c) { if (!c || !c.lw || !c.g) return null; const K = c._wk || (c._wk = keys(c.g)); if (K.length !== c.lw.length) return null; const o = {}; let any = false; for (let i = 0; i < K.length; i++) if (c.lw[i]) { o[K[i]] = c.lw[i]; any = true; } return any ? o : null; }
  function ensure(c) { const n = c.ph.bv.length; if (!c.lw || c.lw.length !== n) { c.lw = new Float32Array(n); c.el = new Float32Array(n); c.learned = 0; } return c._wk || (c._wk = keys(c.g)); }
  G.on('birth', function (c, a, b) {
    if (!c || !c.ph || !c.ph.bv) return;
    const A = learned(a), B = learned(b); if (!A && !B) return;
    const K = ensure(c); if (K.length !== c.lw.length) return; let sum = 0;
    for (let i = 0; i < K.length; i++) { const x = A && A[K[i]], y = B && B[K[i]]; if (x === undefined && y === undefined) continue; c.lw[i] = BIRTH * ((x || 0) + (y || 0)) / ((x !== undefined && x !== 0 ? 1 : 0) + (y !== undefined && y !== 0 ? 1 : 0) || 1); sum += Math.abs(c.lw[i]); }
    c.learned = sum; c.bornKnowing = sum;
  });
  /** one creature takes on a little of what another has learned (used by the witty, who go to their elders for it: 54g_society.js) */
  G.teachFrom = function (c, e) { const E = learned(e); if (!E || !c.ph || !c.ph.bv) return false; const K = ensure(c); if (K.length !== c.lw.length) return false; let sum = 0; for (let i = 0; i < K.length; i++) { const v = E[K[i]]; if (v !== undefined) c.lw[i] += (v - c.lw[i]) * TEACH; sum += Math.abs(c.lw[i]); } c.learned = sum; c.taught = (c.taught || 0) + 1; return true; };
  // the young learn from the old: a few pairs are looked at each moment, so it costs next to nothing
  let acc = 0;
  { const step0 = G.step; G.step = function (dt) { step0(dt); const W = G.W; if (!W || W.title || W.cre.length < 4) return; acc += dt; if (acc < 0.5) return; acc = 0;
      for (let k = 0; k < 6; k++) { const c = W.cre[(G.rand() * W.cre.length) | 0], e = W.cre[(G.rand() * W.cre.length) | 0]; if (c === e || c.dead || e.dead || !c.sp || c.sp !== e.sp || e.age <= c.age) continue; const dx = c.x - e.x, dy = c.y - e.y; if (dx * dx + dy * dy > 160 * 160) continue; const E = learned(e); if (!E) continue; const K = ensure(c); if (K.length !== c.lw.length) continue; let sum = 0; for (let i = 0; i < K.length; i++) { const v = E[K[i]]; if (v !== undefined) c.lw[i] += (v - c.lw[i]) * TEACH; sum += Math.abs(c.lw[i]); } c.learned = sum; c.taught = (c.taught || 0) + 1; }
    }; }
})();
