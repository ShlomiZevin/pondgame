// ── Beauty, measured for every creature, every generation ──
// The game's fitness is "nice to the eye". The AI is the eye, but it cannot look at every newborn. So the pond LEARNS the
// eye's taste: a body is described by what can be seen on it (its eyes, its masses, how much there is to look at, its
// growths, coat, markings and colours), and a scoring function turns that into a grade from 0 to 1. The function was fitted
// to grades the AI gave to pictures of many creatures (see scripts/taste.js on the server), and it goes on learning: every
// time the AI grades creatures in this pond, the function is corrected towards what it said. So each pond's taste drifts its
// own way, and every creature has a grade the moment it is born.
(function () {
  'use strict';
  const F = G.form, clamp = G.clamp;
  const NAMES = ['eyes0', 'eyes1', 'eyes2', 'eyes3', 'eyeSize', 'eyeStalk', 'face', 'm2', 'm3', 'pairs', 'hollow', 'lobed', 'stalk', 'side', 'faceAway', 'tall', 'wide', 'plump', 'busy', 'busy2',
    'legs', 'arms', 'fins', 'spikes', 'tentacles', 'feelers', 'plates', 'frills', 'horns', 'designs', 'wrap', 'tail', 'beak', 'jaws', 'sucker', 'whiskers', 'scales', 'fur', 'feathers', 'marked', 'stripes', 'spots',
    'shell', 'crest', 'glow', 'venom', 'sat', 'lit', 'contrast', 'longest', 'nested', 'bare',
    // what makes a face lovable (the baby schema the eye responds to): big wide-set low eyes, big soft pupils, a smile, a big head on a small body, round outlines, stubby limbs, a tidy body, no spikes
    'eyeBig', 'eyeLow', 'eyeSet', 'pupil', 'smile', 'blush', 'headBig', 'round', 'stubby', 'tidy', 'spiky', 'sig', 'limbs', 'pose'];
  F.LOOKS = NAMES;
  /** what can be seen on a body, as numbers (each about 0..1) */
  F.looks = function (f) {
    const c = F.counts(f), bm = G.body.measure(f), busy = G.body.busy(f), has = [0, 0, 0, 0, 0, 0, 0, 0, 0];
    let longest = 0, dsg = 0, wrap = 0;
    for (let i = 0; i < f.rules.length; i++) { const q = f.rules[i]; if (q.on >= 0) continue; has[q.k] = 1; if (q.k !== 5 && q.k !== 8) longest = Math.max(longest, q.l); if (q.k === 8) { dsg++; const d = F._dsg(q); if (d && d.place === 'wrap') wrap = 1; } }
    const stands = G.body.stands(f) ? 1 : 0, plump = clamp((f.prof[1] + f.prof[2] + f.prof[3]) / 3, 0.55, 1.6);
    return [f.en === 0 ? 1 : 0, f.en === 1 ? 1 : 0, f.en === 2 ? 1 : 0, f.en >= 3 ? 1 : 0, (f.es - 0.34) / 0.28, f.ek > 0.25 ? 1 : 0, clamp((f.hd - 0.7) / 1.2, 0, 1), bm.n === 2 ? 1 : 0, bm.n >= 3 ? 1 : 0, Math.min(1, bm.pairs), bm.hollow ? 1 : 0, bm.lobed ? 1 : 0, bm.stalks ? 1 : 0, f.bd.v ? 1 : 0, f.bd.e ? 1 : 0,
      clamp(bm.tall - 1, 0, 1), clamp(bm.asp - 1, 0, 1), (plump - 0.55) / 1.05, busy / 10, busy * busy / 100,
      stands, has[0] && !stands ? 1 : 0, has[1], has[2], has[3], has[4], has[5], has[6], has[7], Math.min(2, dsg) / 2, wrap, f.tk ? 1 : 0, f.mk === 1 ? 1 : 0, f.mk === 2 ? 1 : 0, f.mk === 3 ? 1 : 0, f.mk === 4 ? 1 : 0,
      f.coat === 1 ? 1 : 0, f.coat === 2 ? 1 : 0, f.coat === 3 ? 1 : 0, f.pat ? 1 : 0, f.pat === 1 ? 1 : 0, f.pat === 2 ? 1 : 0, f.shell > 0.25 ? 1 : 0, f.crest > 0.25 ? 1 : 0, f.glow > 0.3 ? 1 : 0, f.venom > 0.3 ? 1 : 0,
      (f.sat - 52) / 36, (f.lit - 52) / 20, Math.abs(f.hue2) / 180, clamp(longest / 2.2, 0, 1), c.nested ? 1 : 0, f.rules.length === 0 && bm.n === 1 ? 1 : 0].concat(F.cuteLooks(f, bm, busy));
  };
  /** the proportions and face of a body as numbers (each 0..1) */
  F.cuteLooks = function (f, bm, busy) {
    const M = f.bd.m, en = Math.min(f.en, 2) / 2, ne = f.en > 0 ? 1 : 0;
    let mm = 0; for (let i = 0; i < M.length; i++) { let lo = 9, hi = 0; for (let j = 0; j < M.length * 0 + M[i].r.length; j++) { lo = Math.min(lo, M[i].r[j]); hi = Math.max(hi, M[i].r[j]); } mm += lo / hi; } mm /= M.length;
    let sq = 0, tot = 0; for (let i = 0; i < M.length; i++) { const a = M[i].s * M[i].s * (M[i].pr ? 2 : 1); tot += a; if (i === f.bd.e) sq = a; }
    let ln = 0, nl = 0, sp = 0; const sg = {}; for (let i = 0; i < f.rules.length; i++) { const q = f.rules[i]; if (q.on >= 0) continue; if (q.k === 0) { ln += q.l; nl++; } if (q.k === 2) sp++; if (q.k === 7 || q.k === 1 || q.k === 3 || q.k === 6 || q.k === 8) sg[q.k] = 1; }
    // signature features: real-animal parts (horns, fins, tentacles, frills, an invented part), a tail, a shell, ears (a pair of masses), a coat, markings. One or two make a character; none is bland, more than three is clutter
    if (f.tk) sg.t = 1; if (f.shell > 0.25) sg.s = 1; if (f.coat) sg.c = 1; if (f.pat) sg.p = 1; if (f.cl) sg.k = 1; if (bm.pairs) sg.e = 1; const ns = Object.keys(sg).length;
    return [clamp((f.es - 0.34) / 0.4, 0, 1) * en, ne * clamp(0.3 + (0.14 - f.ey) / 0.3, 0, 1), f.en === 2 ? 1 - Math.min(1, Math.abs(f.eg - 0.55) / 0.25) : 0, ne * clamp((f.ep - 0.4) / 0.3, 0, 1), clamp(f.sm, 0, 1), clamp(f.bl, 0, 1),
      clamp(((M.length > 1 ? sq / tot : 0.5) - 0.3) / 0.4, 0, 1) * 0.6 + 0.4 * clamp((f.hd - 1) / 1.2, 0, 1), clamp((mm - 0.6) / 0.4, 0, 1) * (bm.lobed ? 0.5 : 1), nl ? 1 - clamp((ln / nl - 0.6) / 1.2, 0, 1) : 0.5,
      busy <= 5.5 ? 1 : Math.max(0, 1 - (busy - 5.5) * 0.3), Math.min(1, (sp + (f.crest > 0.25 ? 1 : 0)) * 0.5), ns === 0 ? 0 : ns <= 2 ? 1 : ns === 3 ? 0.5 : 0,
      nl >= 2 ? clamp(1 - Math.abs(f.ll * f.lw - 1.2) / 0.6, 0, 1) : nl === 1 ? 0.15 : 0, Math.min(1, Math.abs(f.st || 0) / 0.3)];
  };
  // the taste every pond starts with: fitted to the AI's grades of pictures (b: the grade of a body with nothing to see on it)
  F.TASTE0 = { b: 0.2873, w: [0, 0.0049, -0.0083, 0.0033, -0.0273, -0.0226, -0.0825, -0.0151, -0.0389, 0.0131, -0.1379, -0.0141, 0.0624, -0.0415, 0.0307, 0.0259, -0.0108, 0.0604, 0.0325, 0.0211, 0.0569, -0.0014, 0.0695, -0.0342, 0.0021, 0.0547, 0.0282, 0, 0.0411, -0.0144, 0, 0.0459, -0.0337, -0.0617, -0.0081, 0.0229, 0.0106, 0.0234, -0.0046, 0.1216, -0.0289, -0.1043, -0.0193, 0.0673, 0.0252, 0.0303, 0.0212, 0.0287, -0.0097, 0.0386, 0.0068, 0.0427, 0.0899, -0.0541, 0.0169, -0.0288, -0.0187, 0.0047, 0.1863, -0.0773, 0.0375, 0.0359, 0.0165, 0.0006, 0.0031, 0.0184], n: 237, wb: -0.4464, ww: [0, 0.0204, 0.0073, -0.0277, -0.056, -0.0261, -0.0837, -0.0906, -0.0928, 0.0642, -0.0898, -0.0291, 0.0539, -0.0547, 0.0484, -0.017, 0.0095, 0.023, 0.0121, 0.0255, 0.0169, 0.0289, 0.0417, 0.0297, 0.0013, 0.0349, -0.0218, 0, 0.0306, -0.0208, 0, -0.0055, -0.0043, -0.0624, -0.0674, 0.0774, -0.0132, 0.0069, 0.0312, 0.1242, -0.02, -0.1493, -0.0363, 0.0128, 0.0691, -0.0068, -0.0309, -0.0183, -0.0226, -0.0287, -0.0124, -0.0221, 0.0998, -0.0709, -0.0195, -0.0115, -0.0126, -0.0062, 0.1629, -0.0111, 0.0452, -0.0617, 0.0212, 0.0447, 0.035, 0.0091] };      // fitted 2026-10-06 to the AI's marks on 237 random pond creatures (beauty r 0.55 held out; whole is a correction to F.whole, r 0.62)
  F.newTaste = function () { return { b: F.TASTE0.b, w: F.TASTE0.w.slice(), n: 0, wb: F.TASTE0.wb || 0, ww: F.TASTE0.ww ? F.TASTE0.ww.slice() : F.TASTE0.w.map(function () { return 0; }) }; };
  F.fixTaste = function (t) {
    if (!t || !Array.isArray(t.w) || t.w.length !== NAMES.length || !isFinite(+t.b)) return null;
    const ok = Array.isArray(t.ww) && t.ww.length === NAMES.length;
    return { b: clamp(+t.b, -2, 2), w: t.w.map(function (v) { v = +v; return isFinite(v) ? clamp(v, -3, 3) : 0; }), n: Math.max(0, t.n | 0), wb: ok && isFinite(+t.wb) ? clamp(+t.wb, -1, 1) : 0, ww: ok ? t.ww.map(function (v) { v = +v; return isFinite(v) ? clamp(v, -2, 2) : 0; }) : NAMES.map(function () { return 0; }) };
  };
  /** how nice this body is to the eye, 0..1, by a taste (a pond's own, or the one all ponds start with) */
  F.beauty = function (f, T) {
    if (!f.bd) return 0.4;
    T = T || F.TASTE0;
    const x = F.looks(f); let s = T.b;
    for (let i = 0; i < x.length; i++) s += T.w[i] * x[i];
    // a soft ceiling, not a wall: two good bodies stay in order instead of both scoring the top mark
    return s < 0 ? 0 : s < 0.8 ? s : 0.8 + 0.2 * Math.tanh((s - 0.8) / 0.2);
  };
  /** the eye graded this body: the taste is corrected a little towards what it said */
  F.learn = function (T, f, grade, rate, x0) {
    const x = x0 || F.looks(f); let s = T.b;
    for (let i = 0; i < x.length; i++) s += T.w[i] * x[i];
    const err = clamp(grade, 0, 1) - s, k = rate === undefined ? 0.06 : rate;
    T.b += k * err * 0.5;
    for (let i = 0; i < x.length; i++) T.w[i] += k * err * x[i] * 0.5;
    T.n++;
    return err;
  };
  /** the hand-written wholeness, corrected by what the watcher has really said of whole creatures in this pond (a residual learned like the taste) */
  F.wholeBelief = function (f, T, x0, v0) {
    if (!f.bd) return 0.3;
    let s = v0 === undefined ? F.whole(f).v : v0;
    if (T && T.ww) { const x = x0 || F.looks(f); s += T.wb; for (let i = 0; i < x.length; i++) s += T.ww[i] * x[i]; }
    return clamp(s, 0, 1);
  };
  F.learnWhole = function (T, x, grade, rate, v0) {
    if (!T.ww) return 0;
    let s = v0 + T.wb; for (let i = 0; i < x.length; i++) s += T.ww[i] * x[i];
    const err = clamp(grade, 0, 1) - s, k = rate === undefined ? 0.03 : rate;
    T.wb += k * err * 0.5; for (let i = 0; i < x.length; i++) T.ww[i] += k * err * x[i] * 0.5;
    return err;
  };
  /** How WHOLE a creature is, 0..1: does it read as a complete animal, or as a blob with things on it?
   *  A whole creature has a face (two eyes and a mouth), a body, a way of getting about, a pair of arms or wings, something that finishes it
   *  (a tail, ears, a crest, horns), a skin of its own (a coat or markings), and nothing odd left hanging. Returns { v, has: [...], lacks: [...] } */
  F.whole = function (f) {
    if (!f.bd) return { v: 0.3, has: [], lacks: [] };
    // Whole means complete, not any one kind of animal: a face, a way of getting about, the parts that finish a creature of its sort, a body that holds together.
    // Nothing here names a kind: a fish, a worm, a bird or something nobody has named is as whole as a person if it has what it needs.
    const BD = G.body, bm = BD.measure(f), L = BD.lay(f, null), gnd = BD.ground(L), M = f.bd.m, has = [0, 0, 0, 0, 0, 0, 0, 0, 0];
    let legs = 0, arms = 0, sideDsg = 0, organs = 0; const legOn = {}, seen = {};
    for (let i = 0; i < f.rules.length; i++) { const q = f.rules[i]; if (q.on >= 0) continue; has[q.k] = 1; if (q.k === 8) { const d = F._dsg(q); if (d && d.place === 'sides') sideDsg = 1; } if (q.k === 0) for (let m = q.a; m <= q.b && m < f.n; m += q.e) { if (gnd[m] && !legOn[m]) { legOn[m] = 1; legs = 1; } else arms = 1; } }
    // the kinds of organ it has: each counts once, however it is used
    const org = [['legs', legs], ['arms or hands', arms], ['fins or wings', has[1]], ['tentacles', has[3]], ['a tail', f.tk ? 1 : 0], ['a shell', f.shell > 0.25 ? 1 : 0], ['ears, horns or feelers', bm.pairs || has[7] || has[4] || f.crest > 0.25 ? 1 : 0], ['a coat, markings or clothes', f.coat || f.pat || f.cl ? 1 : 0], ['a kind of part this pond invented', has[8] ? 1 : 0]];
    const got = [], lacks = []; for (let i = 0; i < org.length; i++) if (org[i][1]) { organs++; got.push(org[i][0]); }
    const side = f.bd.v ? 1 : 0, face = f.en >= 2 ? 1 : f.en === 1 ? (side ? 1 : 0.6) : 0;
    const mover = legs || has[1] || has[3] || f.tk || (side && M.length >= 3 && bm.cls === 'W') ? 1 : sideDsg ? 0.5 : 0;      // some way of getting about: legs, fins, tentacles, a tail, a long body
    // a body of its own: a head set on a torso, or one body with a clear front and back that holds together
    let torso = 0; for (let i = 0; i < M.length; i++) if (i !== f.bd.e && !M[i].pr) torso = Math.max(torso, M[i].s);
    const head = M.length >= 2 && torso >= M[f.bd.e].s * 0.8 ? 1 : M.length >= 2 && torso > 0 ? 0.6 : side && bm.asp > 1.15 ? 0.8 : 0.2;
    const busy = BD.busy(f), tidy = busy <= 6.5 ? 1 : Math.max(0, 1 - (busy - 6.5) * 0.25);
    const parts = [['a face (eyes)', 0.15, face], ['a mouth of its own', 0.04, f.mk || f.sm > 0.4 ? 1 : 0.3], ['a way of getting about', 0.24, mover], ['the parts that finish a creature of its sort', 0.3, Math.min(1, organs / 3.5)], ['a body of its own', 0.12, head], ['all of it holding together, nothing piled on', 0.05, tidy]];
    let v = 0.1 - (bm.hollow ? 0.04 : 0) - (bm.stalks ? 0.03 : 0);
    for (let i = 0; i < parts.length; i++) { v += parts[i][1] * parts[i][2]; if (parts[i][2] < 0.7) lacks.push(parts[i][0]); }
    return { v: clamp(v, 0, 1), has: got, lacks: lacks };
  };
  /** what counts for most in a grade, in words: the three things that lift this body most and the three that pull it down */
  F.beautyWhy = function (f, T) {
    T = T || F.TASTE0;
    const x = F.looks(f), L = [];
    for (let i = 0; i < x.length; i++) if (Math.abs(T.w[i] * x[i]) > 0.015) L.push([NAMES[i], T.w[i] * x[i]]);
    L.sort(function (a, b) { return b[1] - a[1]; });
    return { up: L.filter(function (q) { return q[1] > 0; }).slice(0, 3).map(function (q) { return q[0]; }), down: L.filter(function (q) { return q[1] < 0; }).slice(-3).reverse().map(function (q) { return q[0]; }) };
  };
})();
