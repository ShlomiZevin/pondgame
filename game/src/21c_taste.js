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
    'eyeBig', 'eyeLow', 'eyeSet', 'pupil', 'smile', 'blush', 'headBig', 'round', 'stubby', 'tidy', 'spiky', 'sig', 'limbs', 'pose',
    'eyeSize2', 'eyeY', 'eyeY2', 'eyeGap', 'eyeGap2', 'pupil2', 'head', 'head2', 'sat2', 'lit2', 'contrast2', 'limbL', 'limbL2', 'limbW', 'limbW2', 'plump2', 'size', 'size2',
    // the same part is not worth the same everywhere: what the god makes of legs, fins, a tail, a coat or tentacles on a creature of the land, and of legs and fins on one of the water
    'land', 'landLegs', 'landFins', 'landTail', 'landCoat', 'landTent', 'waterLegs', 'waterFins',
    // the finer face and limbs
    'eyeWide', 'eyeWide2', 'eyeSlant', 'lidLow', 'browHeavy', 'browFierce', 'browGentle', 'muzzle', 'nose', 'legPairs', 'legPairs2', 'armPairs', 'jointed'];
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
      (f.sat - 52) / 36, (f.lit - 52) / 20, Math.abs(f.hue2) / 180, clamp(longest / 2.2, 0, 1), c.nested ? 1 : 0, f.rules.length === 0 && bm.n === 1 ? 1 : 0].concat(F.cuteLooks(f, bm, busy), F.curveLooks(f, bm), (function () { const L = (f._air || 0) >= 0.5 ? 1 : 0; return [L, L * stands, L * has[1], L * (f.tk ? 1 : 0), L * (f.coat >= 2 ? 1 : 0), L * has[3], (1 - L) * stands, (1 - L) * has[1]]; })(), (function () {
      const ne = f.en > 0 ? 1 : 0, ew = ne * ((f.ex || 1) - 0.7) / 0.7, ba = f.ba === undefined ? 0.1 : f.ba; let lp = 0, ap = 0, jn = 0, nl = 0;
      for (let i = 0; i < f.rules.length; i++) { const q = f.rules[i]; if (q.k !== 0 || q.on >= 0) continue; nl++; jn += q.j; if (q.t === 0 || q.t === 3) lp++; else ap++; }
      return [ew, ew * ew, ne * Math.abs(f.et || 0) / 0.45, ne * (f.el || 0) / 0.55, f.bw === undefined ? 0.35 : f.bw, Math.max(0, -ba) / 0.6, Math.max(0, ba) / 0.6, f.sn || 0, (f.nz | 0) ? 1 : 0, Math.min(3, lp) / 3, Math.min(3, lp) * Math.min(3, lp) / 9, Math.min(2, ap) / 2, nl ? (jn / nl - 1) / 2 : 0];
    })());
  };
  /** measures with a best value somewhere in the middle, each as itself and squared (each about 0..1) */
  F.curveLooks = function (f, bm) {
    const M = f.bd.m, ne = f.en > 0 ? 1 : 0; let sq = 0, tot = 0; for (let i = 0; i < M.length; i++) { const a = M[i].s * M[i].s * (M[i].pr ? 2 : 1); tot += a; if (i === f.bd.e) sq = a; }
    const es = ne * (f.es - 0.34) / 0.56, ey = ne * (f.ey + 0.2) / 0.56, eg = ne * (f.eg - 0.3) / 0.5, ep = ne * (f.ep - 0.36) / 0.42, hd = M.length > 1 ? sq / tot : 0.5, sat = (f.sat - 40) / 54, lit = (f.lit - 46) / 32, ct = Math.abs(f.hue2) / 180;
    const ll = (f.ll - 0.7) / 0.7, lw = (f.lw - 0.85) / 0.55, pl = (clamp((f.prof[1] + f.prof[2] + f.prof[3]) / 3, 0.55, 1.6) - 0.55) / 1.05, sz = clamp(bm.h / 4, 0, 1);
    return [es * es, ey, ey * ey, eg, eg * eg, ep * ep, hd, hd * hd, sat * sat, lit * lit, ct * ct, ll, ll * ll, lw, lw * lw, pl * pl, sz, sz * sz];
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
  while (F.TASTE0.w.length < NAMES.length) { F.TASTE0.w.push(0); F.TASTE0.ww.push(0); }      // the squared measures start at nothing: each pond learns them from its god
  /** a mark from a raw score: itself up to 0.85, then ever more slowly towards 1, never reaching it and never losing the order of two scores */
  F.soft = function (s) { return s < 0 ? 0 : s < 0.85 ? s : 0.85 + 0.15 * (1 - Math.exp(-(s - 0.85) / 0.9)); };
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
    return F.soft(s);
  };
  /** the same two guesses from a body's looks already measured (x = F.looks(f); v0 = F.whole(f).v) */
  F.beautyX = function (x, T) { T = T || F.TASTE0; let s = T.b; for (let i = 0; i < x.length; i++) s += T.w[i] * x[i]; return F.soft(s); };
  F.wholeX = function (x, T, v0) { let s = v0; if (T && T.ww) { s += T.wb; for (let i = 0; i < x.length; i++) s += T.ww[i] * x[i]; } return F.soft(s); };
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
  /** The taste fitted afresh to ALL the god's remembered marks at once (a ridge regression that leans on the taste every pond starts with). Correcting it a
   *  mark at a time was too slow to tell cousins apart; this uses everything the god has said in one go, so the pond's guess for the creatures nobody
   *  has looked at ranks them much as the god would. B: the remembered looks ({ x: F.looks, v0: F.whole, b, w }) */
  F.FIT_LAM = 0.5; F.FIT_AGE = 150;
  F.fitTaste = function (T, B, lam) {
    const n = NAMES.length + 1, T0 = F.TASTE0, A = [], yb = new Float64Array(n), yw = new Float64Array(n);
    lam = lam === undefined ? F.FIT_LAM : lam;
    for (let i = 0; i < n; i++) { A.push(new Float64Array(n)); A[i][i] = i === n - 1 ? 0.01 : lam; }
    for (let k = 0; k < B.length; k++) {
      const e = B[k], x = e.x; if (!x) continue;
      let pb = T0.b, pw = e.v0 + T0.wb; for (let i = 0; i < n - 1; i++) { pb += T0.w[i] * x[i]; pw += T0.ww[i] * x[i]; }
      const rb = e.b - pb, rw = e.w - pw, wt = Math.exp(-(B.length - 1 - k) / F.FIT_AGE);
      for (let i = 0; i < n; i++) { const xi = (i === n - 1 ? 1 : x[i]) * wt; if (!xi) continue; yb[i] += xi * rb; yw[i] += xi * rw; const Ai = A[i]; for (let j = 0; j < n - 1; j++) Ai[j] += xi * x[j]; Ai[n - 1] += xi; }
    }
    const solve = function (y) {
      const M = A.map(function (r) { return Float64Array.from(r); }), v = Float64Array.from(y);
      for (let c = 0; c < n; c++) {
        let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
        if (Math.abs(M[p][c]) < 1e-9) continue;
        if (p !== c) { const t = M[p]; M[p] = M[c]; M[c] = t; const tv = v[p]; v[p] = v[c]; v[c] = tv; }
        for (let r = c + 1; r < n; r++) { const k = M[r][c] / M[c][c]; if (!k) continue; for (let j = c; j < n; j++) M[r][j] -= k * M[c][j]; v[r] -= k * v[c]; }
      }
      const o = new Float64Array(n);
      for (let c = n - 1; c >= 0; c--) { let s = v[c]; for (let j = c + 1; j < n; j++) s -= M[c][j] * o[j]; o[c] = Math.abs(M[c][c]) < 1e-9 ? 0 : s / M[c][c]; }
      return o;
    };
    const db = solve(yb), dw = solve(yw);
    for (let i = 0; i < n - 1; i++) { T.w[i] = clamp(T0.w[i] + db[i], -3, 3); T.ww[i] = clamp(T0.ww[i] + dw[i], -2, 2); }
    T.b = clamp(T0.b + db[n - 1], -2, 2); T.wb = clamp(T0.wb + dw[n - 1], -1, 1); T.n += B.length;
  };
  /** the hand-written wholeness, corrected by what the watcher has really said of whole creatures in this pond (a residual learned like the taste) */
  F.wholeBelief = function (f, T, x0, v0) {
    if (!f.bd) return 0.3;
    let s = v0 === undefined ? F.whole(f).v : v0;
    if (T && T.ww) { const x = x0 || F.looks(f); s += T.wb; for (let i = 0; i < x.length; i++) s += T.ww[i] * x[i]; }
    return F.soft(s);
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
    const org = [['legs', legs], ['arms or hands', arms], ['fins or wings', has[1]], ['tentacles', has[3]], ['a tail', f.tk ? 1 : 0], ['a shell', f.shell > 0.25 ? 1 : 0], ['ears, horns or feelers', bm.pairs || has[7] || has[4] || f.crest > 0.25 ? 1 : 0], ['a coat, markings or clothes', f.coat || f.pat || f.cl ? 1 : 0], ['a kind of part this star invented', has[8] ? 1 : 0]];
    const got = [], lacks = []; for (let i = 0; i < org.length; i++) if (org[i][1]) { organs++; got.push(org[i][0]); }
    const side = f.bd.v ? 1 : 0, face = f.en >= 2 ? 1 : f.en === 1 ? (side ? 1 : 0.6) : 0;
    const mover = legs || has[1] || has[3] || f.tk || (side && M.length >= 3 && bm.cls === 'W') ? 1 : sideDsg ? 0.5 : 0;      // some way of getting about: legs, fins, tentacles, a tail, a long body
    // a body of its own: a head set on a torso, or one body with a clear front and back that holds together
    let torso = 0; for (let i = 0; i < M.length; i++) if (i !== f.bd.e && !M[i].pr) torso = Math.max(torso, M[i].s);
    const head = M.length >= 2 && torso >= M[f.bd.e].s * 0.8 ? 1 : M.length >= 2 && torso > 0 ? 0.6 : side && bm.asp > 1.15 ? 0.8 : 0.2;
    const busy = BD.busy(f), tidy = busy <= 6.5 + F.room() ? 1 : Math.max(0, 1 - (busy - 6.5 - F.room()) * 0.25);
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

// ── The marks: what the god of the pond judges, and how fitness is made of it ──
// The watcher (the AI that looks at the pond) is its god: from one look it gives each creature a mark for every entry in G.MARKS. A creature's APPEAL is
// the weighted mean of its marks, and appeal times how well it fed is its fitness: that is the whole of selection. Nothing here reaches into mutation
// or breeding: nature does its work, the god only says what it likes.
//   To add a mark: add an entry here (id, label, weight w, and `prior`: the pond's own guess for a creature the god has not seen, from its genes) and
//   the same id in WATCH_MARKS on the server (lib/ai.js), where the question put to the god is written. The card, the charts, the save and the
//   fitness all read this list.
// The first two marks (charm, whole) have their own learned guessers (above); the others start from `prior`, are inherited from the parents, and are
// pulled towards what the god said of creatures that look alike.
(function () {
  'use strict';
  const clamp = G.clamp;
  const busyOf = function (g) { return g.f.bd ? G.body.busy(g.f) : g.f.n + g.f.rules.length; };
  const tidy = function (g) { const b = busyOf(g); return b < 2.5 ? 0.45 : b <= 6 ? 1 : Math.max(0, 1 - (b - 6) * 0.22); };      // the pond's own old sense of clutter: strict, and not loosened by anything
  G.MARKS = [
    { id: 'charm', label: 'Beauty', w: 0.35, core: 'charm', note: 'Beauty: how nice to the eye, out of 10.' },
    { id: 'whole', label: 'Whole', w: 0.40, core: 'whole', note: 'Whole: how complete a creature it is, out of 10.' },
    { id: 'body', label: 'Body', w: 0.25, note: 'Body: does it have a real body that reads at a glance (one clear form, every part in its place) and not a heap of parts, out of 10.', prior: function (g) { return 0.25 + 0.4 * tidy(g); } },
    { id: 'balance', label: 'Balance', w: 0.05, extra: 1, note: 'Balance: proportion and poise: do the parts suit one another, out of 10.', prior: function (g) { return 0.4 + 0.25 * tidy(g); } },
    { id: 'grand', label: 'Grandeur', w: 0.10, extra: 1, note: 'Grandeur: how much creature there is (big, tall, developed, elaborate), counting only what reads well, out of 10. This is what rewards growing.', prior: function (g) { const mr = (G.W && G.W.meanR) || 11; return clamp(0.12 + 0.5 * clamp(0.5 + 0.3 * (g.t[0] / mr - 1), 0, 1) + 0.25 * clamp((busyOf(g) - 2) / 8, 0, 1) * tidy(g), 0, 1); } },
  ];
  G.MARKS_X = G.MARKS.filter(function (m) { return !m.core; });      // the marks beyond the first two
  /** the pond's own guess of the further marks, from the genes alone */
  G.markPrior = function (g) { const o = {}; for (let i = 0; i < G.MARKS_X.length; i++) o[G.MARKS_X[i].id] = clamp(G.MARKS_X[i].prior(g), 0, 1); return o; };
  /** one mark of one creature, 0 to 1 */
  G.markOf = function (c, id) {
    if (id === 'charm') return c.ph.charm;
    if (id === 'whole') return c.ph.whole === undefined ? 0.3 : c.ph.whole;
    if (c.mx && c.mx[id] !== undefined) return c.mx[id];
    return (c.mx = c.mx || G.markPrior(c.g))[id];
  };
  // APPEAL. Beauty and whole ARE the creature: their weighted mean is its core, as it was when the pond grew its nicest creatures. The further marks
  // (those with `extra`) cannot make up for a lack of them: each can only ADD to the core, by its weight times how far the mark is above the middle,
  // and only in proportion to the core itself. So an ugly creature gains next to nothing by being big or elaborate, a lovely one gains by being big
  // and well built as well, and between two equally lovely creatures the grander, better-built one wins. Nature is never asked to trade beauty away.
  const mix = function (get) {
    let core = 0, cw = 0, add = 0;
    for (let i = 0; i < G.MARKS.length; i++) { const m = G.MARKS[i], x = get(m.id); if (x === undefined) continue; if (m.extra) add += m.w * (x - 0.5) * 2; else { core += m.w * x; cw += m.w; } }
    core = cw ? core / cw : 0.4;
    return clamp(core * (1 + (G.MARKS_EXTRA_OFF ? 0 : add)), 0, 1);
  };
  /** a creature's appeal, 0 to 1 */
  G.appealRaw = function (c) { return mix(function (id) { return G.markOf(c, id); }); };
  /** the same for a remembered look of the god's ({ b, w, m }) */
  G.appealOfLook = function (q) { return mix(function (id) { return id === 'charm' ? q.b : id === 'whole' ? q.w : q.m ? q.m[id] : undefined; }); };
  /** a newborn's further marks: the god's own if it has seen this very body; else its parents', moved by how the child's genes differ from theirs; then
   *  pulled towards what the god said of creatures that look like it */
  G.marksBorn = function (c, A, B) {
    const W = G.W, pr = G.markPrior(c.g), X = G.MARKS_X;
    const hit = W && W.eyeSeen && c.g.f.bd ? W.eyeSeen[G.form.key(c.g.f)] : null;
    if (hit && hit.m) { c.mx = {}; for (let i = 0; i < X.length; i++) c.mx[X[i].id] = hit.m[X[i].id] === undefined ? pr[X[i].id] : hit.m[X[i].id]; return; }
    A = A && A.mx && A.g ? A : null; B = B && B.mx && B.g ? B : A;
    if (A) { const pa = G.markPrior(A.g), pb = B === A ? pa : G.markPrior(B.g); c.mx = {}; for (let i = 0; i < X.length; i++) { const id = X[i].id; c.mx[id] = clamp((A.mx[id] + B.mx[id]) / 2 + 0.5 * (pr[id] - (pa[id] + pb[id]) / 2), 0, 1); } }
    else c.mx = pr;
    if (W && W.eyeBank && W.eyeBank.length && c.g.f.bd) {
      const fv = G.lvOf(c); let sw = 0; const acc = {};
      for (let i = 0; i < W.eyeBank.length; i++) { const q = W.eyeBank[i]; if (!q.m) continue; const d = G.fdist(fv, q.lv), wt = Math.exp(-d * d / G.LOOK_S); if (wt < 0.03) continue; sw += wt; for (let k = 0; k < X.length; k++) { const id = X[k].id; if (q.m[id] !== undefined) acc[id] = (acc[id] || 0) + wt * q.m[id]; } }
      if (sw > 0.15) { const k = Math.min(0.5, sw / (sw + 0.6)); for (let i = 0; i < X.length; i++) { const id = X[i].id; if (acc[id] !== undefined) c.mx[id] += k * (acc[id] / sw - c.mx[id]); } }
    }
  };
  /** the god has looked at this one: its marks are its own */
  G.marksSeen = function (c, m) { if (!m) return; c.mx = c.mx || G.markPrior(c.g); for (let i = 0; i < G.MARKS_X.length; i++) { const id = G.MARKS_X[i].id; if (m[id] !== undefined) c.mx[id] = m[id]; } };
  /** a creature that resembles one the god just looked at moves towards what the god said (wt: how alike, 0 to 1) */
  G.marksToward = function (x, m, wt) { if (!m) return; x.mx = x.mx || G.markPrior(x.g); for (let i = 0; i < G.MARKS_X.length; i++) { const id = G.MARKS_X[i].id; if (m[id] !== undefined) x.mx[id] += 0.5 * wt * (m[id] - x.mx[id]); } };
  // ── room to grow is earned ──
  // How much a body may carry before the pond counts it as clutter (W.room, see F.room) is not given by the calendar: it opens a little each time the
  // god looks and finds that the pond's bodies read well, and closes again when they stop reading well. So a pond that grows gracefully keeps growing,
  // with no end set in advance, and one that turns to heaps is drawn back, and may try again. Without a god (no AI) it stays shut: the old limits hold.
  G.ROOM_MAX = 4;
  // Growth is a climb with a way back. The pond remembers how nice (beauty and whole together) its creatures have been at their best. While the god
  // finds them as nice as that best, and their bodies clear, a little more room is given. As soon as they are clearly less nice than their best, room is
  // taken back, faster than it was given: the growth that made them worse is undone, and the pond may try another way. So room only stays open for
  // growth that keeps the creatures lovely.
  G.roomAfterLook = function (looks) {
    const W = G.W; if (!W || !looks.length) return;
    // what the god itself said in this look (its own marks, not what the pond believes): how clear the bodies are, and how nice the creatures are all told
    let b = 0, bl = 0, ap = 0, n = 0;
    for (let i = 0; i < looks.length; i++) { const m = looks[i].m; if (!m || m.body === undefined) continue; b += m.body; bl += m.balance === undefined ? 0.5 : m.balance; ap += G.appealOfLook(looks[i]); n++; }
    if (!n) return; b /= n; bl /= n; ap /= n;
    const was = W.room || 0;
    W.nice = W.nice === undefined ? ap : W.nice + 0.3 * (ap - W.nice);
    W.niceBest = Math.max(W.nice, (W.niceBest === undefined ? W.nice : W.niceBest) - 0.002);
    const drop = W.niceBest - W.nice;
    if (G.ROOM_RULE === 'old') { if (b >= 0.58 && bl >= 0.5) W.room = Math.min(10, was + 0.3); else if (b < 0.46) W.room = Math.max(0, was - 1); }
    else if (drop > 0.06 || b < 0.48) W.room = Math.max(0, was - 0.4);                                                      // clearly less nice than at its best, or bodies no longer clear: room is taken back
    else if (drop < 0.03 && b >= 0.56 && bl >= 0.5 && (W.looksN || 0) >= 3) W.room = Math.min(G.ROOM_MAX, was + 0.25);      // about as nice as it has been, and clear bodies: a little more room to grow
    W.looksN = (W.looksN || 0) + 1;
    W.roomWhy = { body: b, balance: bl, nice: W.nice, best: W.niceBest, gen: W.gen, d: (W.room || 0) - was };
    if ((W.room || 0) !== was && G.emit) G.emit('room', W.room, was);
  };
})();
