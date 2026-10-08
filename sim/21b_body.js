// ── The body itself: free shapes, held in genes ──
// A body is not one of a list of animals. It is a few MASSES. Each mass has an outline (ten radii round its centre, and
// perhaps lobes), a size, the mass it grows from, the angle it sits at and how far out it sits (pressed in, or out on a
// stalk); it may be one of a mirrored pair, and it may be hollow. One gene says whether the animal faces you (its two
// sides match) or is seen from the side (it has a front and a back); one says which mass carries the face.
// Everything about it is inherited: a child takes each mass from one parent or a blend of both. Chance reshapes it: an
// outline is pushed out or pressed in, a mass buds or is lost, a single one becomes a pair. What the body can do is
// measured from the shape that results.
(function () {
  'use strict';
  const clamp = G.clamp, PI = Math.PI, TAU = PI * 2, K = 10, MAXM = 6;      // a young pond buds three masses at most (a body is one clear idea, not a heap); an old one up to six (see B.bud)
  const B = G.body = { K: K, MAXM: MAXM };
  const num = function (v, lo, hi, d) { v = +v; return isFinite(v) ? clamp(v, lo, hi) : d; };
  const mass = function (o) { const q = { r: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1], s: 1, on: -1, at: -PI / 2, d: 1, pr: 0, h: 0, lb: 0, la: 0 }; if (o) for (const k in o) q[k] = o[k]; return q; };
  B.mass = mass;
  B.cell = function () { return { v: 0, e: 0, m: [mass()] }; };
  B.clone = function (bd) { return { v: bd.v, e: bd.e, m: bd.m.map(function (q) { return { r: q.r.slice(), s: q.s, on: q.on, at: q.at, d: q.d, pr: q.pr, h: q.h, lb: q.lb, la: q.la }; }) }; };

  /** THE RULES OF GROWTH for a body. Mutation and imagination propose anything; development only builds what holds together:
   *  smooth outlines (no spike of a single radius), matching sides on an animal that faces you, every mass joined to an earlier one. */
  B.fix = function (f) {
    let bd = f.bd;
    if (!bd || typeof bd !== 'object' || !Array.isArray(bd.m) || !bd.m.length) bd = f.bd = B.cell();
    bd.v = bd.v ? 1 : 0;
    bd.m = bd.m.slice(0, MAXM);
    const M = bd.m, kids = [];
    for (let i = 0; i < M.length; i++) {
      const q = M[i] = mass(M[i] && typeof M[i] === 'object' ? M[i] : null);
      let r = Array.isArray(q.r) ? q.r.slice(0, K) : [];
      for (let j = 0; j < K; j++) r[j] = num(r[j], 0.4, 2, 1);
      if (!bd.v) { const s = r.slice(); for (let j = 0; j < K; j++) r[j] = (s[j] + s[(5 - j + K) % K]) / 2; }        // the two sides match
      for (let pass = 0; pass < 2; pass++) { const s = r.slice(); for (let j = 0; j < K; j++) { const av = (s[(j + K - 1) % K] + s[(j + 1) % K]) / 2; r[j] = clamp(s[j], av * 0.74, av * 1.3); } }
      let mean = 0; for (let j = 0; j < K; j++) mean += r[j]; mean /= K;
      for (let j = 0; j < K; j++) r[j] = clamp(r[j] / mean, 0.45, 1.9);
      q.r = r;
      q.s = i ? num(q.s, 0.28, 1.5, 0.7) : 1;
      q.on = i ? clamp(q.on | 0, 0, i - 1) : -1;
      q.pr = i && q.pr ? 1 : 0; q.h = q.h ? 1 : 0;
      q.lb = (q.lb | 0) < 3 ? 0 : clamp(q.lb | 0, 3, 8); q.la = q.lb ? num(q.la, 0.04, 0.26, 0.12) : 0;
      q.d = num(q.d, 0.45, 1.5, 1);
      let at = num(q.at, -1e3, 1e3, -PI / 2); at = Math.atan2(Math.sin(at), Math.cos(at));
      if (!bd.v && i) {
        if (q.pr) { if (Math.abs(at) > PI / 2) at = (at < 0 ? -1 : 1) * (PI - Math.abs(at)); at = clamp(at, -PI / 2 + 0.4, PI / 2 - 0.4); }      // a pair sits out to the sides
        else at = at < 0 ? -PI / 2 : PI / 2;                                                                                              // a single one sits on the midline: above or below
      }
      q.at = at;
      kids[i] = 0; if (i) kids[q.on]++;
    }
    // no more than nine shapes in all, however the pairs multiply
    { const cnt = []; let tot = 0; for (let i = 0; i < M.length; i++) { cnt[i] = (i ? cnt[M[i].on] : 1) * (M[i].pr ? 2 : 1); tot += cnt[i]; if (tot > 5) { M[i].pr = 0; cnt[i] = i ? cnt[M[i].on] : 1; tot -= cnt[i]; } } }
    bd.e = clamp(bd.e | 0, 0, M.length - 1); if (M[bd.e].pr || M[bd.e].s < 0.55) bd.e = 0;
    for (let i = 0; i < M.length; i++) if (kids[i] || i === bd.e) M[i].h = 0;        // only a bare outer part can be a ring
    f.n = M.length; f.sym = 0; f.pl = f.pl | 0;
    delete f._bm; delete f._st; delete f._b;
    return f;
  };

  /** the radius of a mass in a direction (th: the angle on the page; mir: this copy of it is the mirrored one) */
  B.rad = function (q, th, mir) {
    if (mir) th = PI - th;
    const x = (((th / TAU) % 1) + 1) % 1 * K, i = Math.floor(x) % K; let t = x - Math.floor(x); t = t * t * (3 - 2 * t);
    return (q.r[i] * (1 - t) + q.r[(i + 1) % K] * t) * (1 + (q.lb ? q.la * Math.cos(q.lb * (th + PI / 2)) : 0));
  };
  /** where every shape of the body sits, in units of the first mass. T(speed): how far along a movement of that speed is (for a living body) */
  B.lay = function (f, T) {
    const bd = f.bd, M = bd.m, I = [{ i: 0, m: M[0], x: 0, y: 0, s: 1, mir: false, far: false, par: null, a: 0, stalk: false }];
    for (let i = 1; i < M.length; i++) {
      const q = M[i], sway = T ? Math.sin(T(2.2) + i * 1.7) * 0.055 : 0, spring = T ? 1 + Math.sin(T(2.6) + i * 1.3) * 0.022 : 1;
      const n0 = I.length;
      for (let k = 0; k < n0; k++) {
        const p = I[k]; if (p.i !== q.on) continue;
        const put = function (mir, far) {
          if (I.length >= 6) return;
          const a = q.at + sway, ang = mir ? PI - a : a, Rp = B.rad(p.m, ang, p.mir) * p.s, Rc = B.rad(q, ang + PI, mir) * q.s, dist = (Rp + Rc) * (0.35 + 0.55 * q.d) * spring;
          I.push({ i: i, m: q, x: p.x + Math.cos(ang) * dist + (far ? -0.17 : 0), y: p.y + Math.sin(ang) * dist + (far ? -0.1 : 0), s: q.s, mir: mir, far: far || p.far, par: p, a: ang, stalk: dist > (Rp + Rc) * 0.96 });
        };
        if (q.pr && !bd.v) { put(p.mir, false); put(!p.mir, false); }
        else if (q.pr) { put(p.mir, true); put(p.mir, false); }
        else put(p.mir, false);
      }
    }
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    for (let k = 0; k < I.length; k++) { const o = I[k]; for (let j = 0; j < 20; j++) { const th = j / 20 * TAU, R = B.rad(o.m, th, o.mir) * o.s, x = o.x + Math.cos(th) * R, y = o.y + Math.sin(th) * R; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } }
    return { I: I, x0: x0, x1: x1, y0: y0, y1: y1 };
  };
  /** is this point inside any shape of the body other than `not`? */
  B.inside = function (L, x, y, not) {
    for (let k = 0; k < L.I.length; k++) { const o = L.I[k]; if (o === not) continue; const dx = x - o.x, dy = y - o.y, d = Math.hypot(dx, dy); if (d < B.rad(o.m, Math.atan2(dy, dx), o.mir) * o.s * 0.97) return true; }
    return false;
  };
  /** which masses rest lowest, with nothing under them: legs that grow from these reach the floor */
  B.ground = function (L) {
    const out = {}, h = L.y1 - L.y0;
    for (let k = 0; k < L.I.length; k++) { const o = L.I[k], R = B.rad(o.m, PI / 2, o.mir) * o.s, by = o.y + R; if (by >= L.y1 - 0.34 * h - 0.05 && !B.inside(L, o.x, by + 0.06, o)) out[o.i] = 1; }
    return out;
  };
  /** does it stand on legs? (a leg-growing rule on a mass that rests on the floor) */
  B.stands = function (f) {
    if (f._st !== undefined) return f._st;
    const L = B.lay(f, null), g = B.ground(L); let st = false;
    for (let i = 0; i < f.rules.length && !st; i++) { const q = f.rules[i]; if (q.k !== 0 || q.on >= 0) continue; for (let a = q.a; a <= q.b && a < f.n; a += q.e) if (g[a]) { st = true; break; } }
    return (f._st = st);
  };
  /** the body, measured: what its shape is like and what that is worth */
  B.measure = function (f) {
    if (f._bm) return f._bm;
    const bd = f.bd, L = B.lay(f, null), w = L.x1 - L.x0, h = L.y1 - L.y0;
    let bulk = 0, pairs = 0, hollow = 0, lobed = 0, stalks = 0, faceY = 0;
    for (let k = 0; k < L.I.length; k++) { const o = L.I[k]; bulk += o.s * o.s * (o.m.h ? 0.6 : 1); if (o.stalk) stalks++; if (o.i === bd.e && !o.far) faceY = o.y; }
    for (let i = 0; i < bd.m.length; i++) { if (bd.m[i].pr) pairs++; if (bd.m[i].h) hollow++; if (bd.m[i].lb && bd.m[i].la > 0.1) lobed++; }
    const asp = w / Math.max(0.3, h), tall = h / Math.max(0.3, w);
    const cls = tall > 1.3 ? 'T' : asp > 1.3 ? 'W' : 'R';
    return (f._bm = { w: w, h: h, bulk: bulk, pairs: pairs, hollow: hollow, lobed: lobed, stalks: stalks, n: bd.m.length, asp: asp, tall: tall, cls: cls,
      stream: clamp(asp * 0.9, 0.4, 1.8) * (bd.v ? 1.05 : 0.85),
      high: clamp((L.y1 - faceY) / Math.max(0.5, h), 0, 1),          // how high the face is carried
      key: (bd.v ? 's' : 'f') + bd.m.length + (pairs ? 'p' : '') + cls + (lobed ? 'L' : '') + (hollow ? 'O' : '') });
  };
  /** how much there is to look at on this body: its shapes, each kind of growth and where it repeats, its coat and markings. Past about seven it is a muddle. */
  B.busy = function (f) {
    let n = 0; const M = f.bd.m, cnt = [];
    for (let i = 0; i < M.length; i++) { cnt[i] = (i ? cnt[M[i].on] : 1) * (M[i].pr ? 2 : 1); n += i ? (M[i].pr ? 1.5 : 1) : 1; if (M[i].lb && M[i].la > 0.1) n += 0.5; if (M[i].h) n += 0.5; }
    for (let i = 0; i < f.rules.length; i++) { const q = f.rules[i]; n += q.on >= 0 ? 0.6 : q.k === 8 ? 0.6 : 1 + 0.5 * Math.max(0, Math.floor((Math.min(q.b, f.n - 1) - q.a) / q.e)); }
    n += (f.cl ? 0.6 : 0) + (f.pat ? 0.7 : 0) + (f.coat ? 0.7 : 0) + (f.shell > 0.25 ? 1 : 0) + (f.crest > 0.25 ? 0.7 : 0) + (f.tk ? 0.7 : 0) + (f.en >= 3 ? 1 : 0) + (f.ek > 0.25 ? 0.5 : 0) + (f.venom > 0.3 ? 0.3 : 0);
    return n;
  };
  /** the body in a few plain words */
  B.words = function (f) {
    const bd = f.bd, m = B.measure(f), n = bd.m.length, t = [];
    const shape = function (q) { let lo = 9, hi = 0; for (let j = 0; j < K; j++) { lo = Math.min(lo, q.r[j]); hi = Math.max(hi, q.r[j]); } const wide = (q.r[0] + q.r[5]) / 2, high = (q.r[2] + q.r[3] + q.r[7] + q.r[8]) / 4; return q.lb && q.la > 0.1 ? (q.lb >= 5 ? 'star-edged' : 'lobed') : hi / lo < 1.18 ? 'round' : wide > high * 1.15 ? 'wide' : high > wide * 1.15 ? 'tall' : q.r[2] + q.r[3] > q.r[7] + q.r[8] + 0.2 ? 'pear-shaped' : q.r[7] + q.r[8] > q.r[2] + q.r[3] + 0.2 ? 'top-heavy' : 'bean-shaped'; };
    t.push(n === 1 ? 'a single ' + shape(bd.m[0]) + ' body' : 'a body of ' + n + ' joined parts, ' + (m.cls === 'T' ? 'stacked tall' : m.cls === 'W' ? 'spread wide' : 'bunched together') + ' (the main one ' + shape(bd.m[0]) + ')');
    t.push(bd.v ? 'seen from the side, with a front and a back' : 'facing you, its two sides matching');
    if (m.pairs) t.push(m.pairs === 1 ? 'one part doubled as a mirrored pair' : m.pairs + ' parts doubled as mirrored pairs');
    if (m.stalks) t.push('a part held out on a stalk');
    if (m.hollow) t.push('a hollow ring of a part');
    if (bd.e) t.push('its face on a part away from the main body');
    return t;
  };

  // ── chance ──
  B.bud = function (f, note) {
    const r = G.rand, bd = f.bd, M = bd.m;
    if (M.length >= Math.min(MAXM, 3 + Math.round(G.form.room() / 2))) return false;      /* three parts in a young pond, up to six in an old one */
    const D = G.pondDna ? G.pondDna() : null, par = Math.floor(r() * M.length), src = M[par], pr = r() < (D ? D.pair : 0.32) ? 1 : 0;
    const rr = src.r.map(function (v) { return 1 + (v - 1) * (r() < 0.5 ? 1 : 0.3) + (r() - 0.5) * 0.12; });
    M.push(mass({ r: rr, s: 0.42 + r() * 0.55, on: par, at: bd.v ? r() * TAU - PI : pr ? (r() - 0.5) * 2 : (r() < (D ? D.up : 0.35) ? -PI / 2 : PI / 2), d: 0.6 + r() * 0.75, pr: pr, lb: r() < (D ? D.lobe : 0.15) ? 3 + Math.floor(r() * 5) : 0, la: 0.12 }));
    if (note) note(pr ? 'a pair of new parts budded from its body' : 'a new part budded from its body', true);
    return true;
  };
  B.drop = function (f, note) {
    const r = G.rand, bd = f.bd, M = bd.m, leaf = [];
    for (let i = 1; i < M.length; i++) { let kid = false; for (let j = i + 1; j < M.length; j++) if (M[j].on === i) kid = true; if (!kid) leaf.push(i); }
    if (!leaf.length) return false;
    const at = leaf[Math.floor(r() * leaf.length)];
    M.splice(at, 1);
    for (let j = 0; j < M.length; j++) if (M[j].on > at) M[j].on--;
    if (bd.e === at) bd.e = 0; else if (bd.e > at) bd.e--;
    for (let j = 0; j < f.rules.length; j++) { const q = f.rules[j]; if (q.a > at) q.a--; if (q.b >= at && q.b > q.a) q.b--; }
    if (note) note('lost a part of its body', true);
    return true;
  };
  /** chance reshapes a body. m: chance of a nudge per gene; wild: the world's mutation slider */
  B.mutate = function (f, m, wild, note) {
    const r = G.rand, n = G.randn, bd = f.bd, M = bd.m;
    if (r() < 0.07 * wild) {
      const roll = r(), pick = function () { return M.length > 1 ? M[1 + Math.floor(r() * (M.length - 1))] : null; };
      if (roll < 0.34) B.bud(f, note);
      else if (roll < 0.44) B.drop(f, note);
      else if (roll < 0.56) { const q = pick(); if (q) { q.pr = q.pr ? 0 : 1; if (q.pr && !bd.v) q.at = (r() - 0.5) * 2; note(q.pr ? 'one of its parts doubled: a matching pair now' : 'a pair of its parts became one', true); } }
      else if (roll < 0.64) { bd.v = bd.v ? 0 : 1; note(bd.v ? 'a new way of holding itself: sideways on, a front and a back' : 'a new way of holding itself: facing you, two matching sides', true); }
      else if (roll < 0.76) { const q = M[Math.floor(r() * M.length)]; if (!q.lb) { q.lb = 3 + Math.floor(r() * 5); q.la = 0.1 + r() * 0.12; note('its outline grew ' + q.lb + ' lobes', true); } else if (r() < 0.45) { q.lb = 0; note('its lobes smoothed away', true); } else { q.lb = clamp(q.lb + (r() < 0.5 ? 1 : -1), 3, 8); note('changed its number of lobes', true); } }
      else if (roll < 0.82) { const q = pick(); if (q) { q.h = q.h ? 0 : 1; note(q.h ? 'one of its parts opened into a hollow ring' : 'its hollow part closed up', true); } }
      else if (roll < 0.92) { const q = pick(); if (q) { q.at += (r() - 0.5) * 1.8; if (r() < 0.4) q.d = 0.5 + r() * 0.95; note(q.d > 1.1 ? 'one of its parts now stands out on a stalk' : 'one of its parts moved', true); } }
      else { const ok = []; for (let i = 0; i < M.length; i++) if (!M[i].pr && i !== bd.e) ok.push(i); if (ok.length) { bd.e = ok[Math.floor(r() * ok.length)]; note('its face moved to another part of its body', true); } }
    }
    // an outline is pushed out or pressed in at one place, and its neighbours follow
    if (r() < 0.2 * wild) { const q = M[Math.floor(r() * M.length)], i = Math.floor(r() * K), a = (r() < 0.5 ? 1 : -1) * (0.08 + r() * 0.2); q.r[i] += a; q.r[(i + 1) % K] += a * 0.55; q.r[(i + K - 1) % K] += a * 0.55; note('body shape', false); }
    let drift = false;
    for (let i = 0; i < M.length; i++) {
      const q = M[i];
      for (let j = 0; j < K; j++) if (r() < m * 1.5) { q.r[j] *= 1 + n() * 0.07; drift = true; }
      if (r() < m * 2) { q.s *= 1 + n() * 0.09; q.at += n() * 0.1; q.d += n() * 0.08; q.la += n() * 0.02; drift = true; }
    }
    if (drift) note('body shape', false);
  };
  /** a child's body from two: the plan of one parent; each mass that both have is one parent's, the other's, or between them */
  B.cross = function (a, b, keepA) {
    const r = G.rand, sw = keepA || r() < 0.5, g = B.clone(sw ? a : b), o = sw ? b : a;
    for (let i = 0; i < g.m.length; i++) {
      const p = o.m[i]; if (!p || (i && (p.on !== g.m[i].on || p.pr !== g.m[i].pr))) continue;      // only a mass that plays the same part in both bodies is blended
      const q = g.m[i], t = r() < 0.4 ? r() : r() < 0.5 ? 0 : 1;
      for (let j = 0; j < K; j++) q.r[j] = q.r[j] * (1 - t) + p.r[j] * t;
      q.s = q.s * (1 - t) + p.s * t;
      if (t > 0.5 && r() < 0.6) { q.lb = p.lb; q.la = p.la; }
      if (i && r() < 0.25) q.d = p.d;
    }
    if (r() < 0.2) g.v = o.v;
    return g;
  };
  /** a body moves some way towards an imagined one: its masses are reshaped, and it gains the ones it lacks */
  B.adopt = function (f, bd2, t) {
    const g = f.bd, o = B.clone(bd2);
    g.v = o.v;
    for (let i = 0; i < o.m.length; i++) {
      const p = o.m[i];
      if (!g.m[i]) { g.m.push(p); continue; }
      const q = g.m[i];
      for (let j = 0; j < K; j++) q.r[j] = q.r[j] * (1 - t) + p.r[j] * t;
      q.s = q.s * (1 - t) + p.s * t; q.on = p.on; q.at = p.at; q.d = p.d; q.pr = p.pr; q.h = p.h; q.lb = p.lb; q.la = p.la;
    }
    g.m.length = o.m.length;
    g.e = o.e;
  };
  /** how unlike two bodies are (0 the same) */
  B.dist = function (a, b) {
    let d = Math.abs(a.m.length - b.m.length) * 0.7 + (a.v !== b.v ? 0.6 : 0);
    for (let i = 0; i < Math.min(a.m.length, b.m.length); i++) { const p = a.m[i], q = b.m[i]; let s = 0; for (let j = 0; j < K; j++) s += Math.abs(p.r[j] - q.r[j]); d += s / K * 2 + Math.abs(p.s - q.s) * 0.5 + (p.pr !== q.pr ? 0.4 : 0) + (p.on !== q.on ? 0.3 : 0) + Math.min(1, Math.abs(Math.atan2(Math.sin(p.at - q.at), Math.cos(p.at - q.at)))) * 0.3; }
    return d;
  };

  // ── kept and read back ──
  const r2 = function (x) { return Math.round(x * 100) / 100; };
  B.pack = function (bd) { return [bd.v, bd.e, bd.m.map(function (q) { return q.r.map(r2).concat([r2(q.s), q.on, r2(q.at), r2(q.d), q.pr, q.h, q.lb, r2(q.la)]); })]; };
  B.unpack = function (a) {
    if (!Array.isArray(a) || !Array.isArray(a[2]) || !a[2].length) return null;
    return { v: a[0], e: a[1], m: a[2].slice(0, MAXM).map(function (q) { q = Array.isArray(q) ? q : []; return { r: q.slice(0, K), s: q[K], on: q[K + 1], at: q[K + 2], d: q[K + 3], pr: q[K + 4], h: q[K + 5], lb: q[K + 6], la: q[K + 7] }; }) };
  };
  /** whatever was imagined (by the AI, or kept from another pond) becomes a body the rules of growth accept */
  B.clean = function (raw) {
    if (!raw || typeof raw !== 'object' || !Array.isArray(raw.m) || !raw.m.length) return null;
    const m = [];
    for (let i = 0; i < raw.m.length && m.length < MAXM; i++) {
      const q = raw.m[i]; if (!q || typeof q !== 'object') continue;
      let r = Array.isArray(q.r) ? q.r.map(Number).filter(isFinite) : [];
      if (r.length < 4) r = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1];
      if (r.length !== K) { const s = r; r = []; for (let j = 0; j < K; j++) { const x = j / K * s.length, a = Math.floor(x), t = x - a; r.push(s[a % s.length] * (1 - t) + s[(a + 1) % s.length] * t); } }
      // the angle may be given in degrees, as people think of it: 0 right, 90 up, 180 left, 270 down
      let at = +q.at; if (!isFinite(at)) at = 90; at = -at * PI / 180;
      m.push({ r: r, s: q.s, on: m.length ? q.on : -1, at: at, d: q.d, pr: q.pr ? 1 : 0, h: q.h ? 1 : 0, lb: q.lb, la: q.la });
    }
    if (!m.length) return null;
    const f = { bd: { v: raw.v ? 1 : 0, e: raw.e | 0, m: m }, rules: [] };
    B.fix(f);
    return f.bd;
  };
})();
