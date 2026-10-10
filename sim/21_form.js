// ── Form: the body is grown from genes ──
// A handful of growth rules build the whole animal: how many segments, the silhouette from nose to tail, what
// sprouts from which segments, what the face and the tail are, colour and pattern. One mutation changes a rule,
// so the change shows everywhere the rule is used. What the body can DO is measured from its shape (abilities),
// and how good it looks is measured too (taste): a base all life shares, and a fashion that differs in every pond.
(function () {
  'use strict';
  const clamp = G.clamp, TAU = 6.2832, U = 20;
  let INK = '#07121f';                          // the outline colour of the body being drawn: a deep tone of its own colour
  const lerp = function (a, b, t) { return a + (b - a) * t; };
  const KINDS = ['limb', 'fin', 'spike', 'tentacle', 'antenna', 'plate', 'frill', 'horn', 'design'];      // 8 = a kind of part invented for this pond (q.t says which)
  const KMANY = ['legs', 'fins', 'spikes', 'tentacles', 'feelers', 'plates', 'frills', 'horns', 'new growths'];
  const dsgOf = function (q) { return q.k === 8 && G.designOf ? G.designOf(q.t) : null; };
  const backOf = function (q) { if (q.k !== 8) return false; const d = dsgOf(q); return !!d && d.place === 'back'; };
  const CENTRE = [{ x: 0, y: 0, dx: 1, dy: 0, nx: 0, ny: 1 }];
  // where a part that lies along the back sits: on each of its segments, or at the centre of a star
  const backSites = function (q, sk) { if (sk.star) return CENTRE; const out = []; for (let i = q.a; i <= q.b && i < sk.sites.length; i += q.e) out.push(sk.sites[i]); return out; };
  const MOUTHS = ['round', 'beak', 'jaws', 'sucker', 'whiskers'];
  const TAILS = ['none', 'fan', 'fork', 'whip', 'club'];
  const PATTERNS = ['plain', 'stripes', 'spots', 'belly', 'rings', 'saddle'];
  const ABIL = ['speed', 'agility', 'reach', 'senses', 'armour', 'attack'];
  const MAXN = 12, MAXR = 8;                    // generous bounds for drawing's sake; what really limits a body is food, oxygen and protein
  const CHAIN = [1, 0, 0, 1, 1, 0, 0, 0, 0];    // kinds with a tip that something else can grow from: legs, tentacles, feelers
  const COATS = ['bare', 'scales', 'fur', 'feathers'];
  const GLIM = [[-0.55, 0.55], [0.05, 0.85], [-0.3, 0.5], [-1.0, 1.0], [-1.1, -0.25], [-1, 1], [-0.4, 0.6], [-1.0, 0.1], [-0.8, 0.8]];
  const cpRule = function (q) { return { k: q.k, a: q.a, b: q.b, e: q.e, l: q.l, w: q.w, j: q.j, g: q.g, c: q.c, t: q.t, p: q.p, on: q.on === undefined ? -1 : q.on, u: q.u, f: q.f }; };
  // take a growth away; whatever grew from it falls back onto the body
  const dropRule = function (f, i) { f.rules.splice(i, 1); for (let k = 0; k < f.rules.length; k++) { const q = f.rules[k]; if (q.on === i) q.on = -1; else if (q.on > i) q.on--; } };
  const F = G.form = { MAXN: MAXN, MAXR: MAXR, COATS: COATS, KINDS: KINDS, KMANY: KMANY, MOUTHS: MOUTHS, TAILS: TAILS, PATTERNS: PATTERNS, ABIL: ABIL, U: U };

  // f: { sym, n, len, prof[5], bend, rules[{k,a,b,e,l,w,j,g,c,t,p}], en, es, ek, mk, ms, tk, ts, hue, hue2, sat, lit, pat, psc, crest, shell, glow, venom, seed }
  //   sym 0 = two-sided (a head and a tail), 3..8 = a star with that many arms
  //   hd: how big the head is; nk: how deep the neck is pinched; coat: 0 bare, 1 scales, 2 fur, 3 feathers
  //   a rule's `on` is -1 when it grows from the body, or the index of the growth it grows from the tip of (a hand on an arm)
  //   rule: k kind, a..b the segments it grows from, e every e-th, l length, w width, j joints, g angle, c bend, t tip (0 none, 1 fingers, 2 pincer, 3 paddle), p taper
  F.cell = function (hue) {
    const r = G.rand;
    return { bd: G.body.cell(), sym: 0, n: 1, len: 1, prof: [1, 1, 1, 1, 1], bend: 0, rules: [], en: 0, es: 0.4, ek: 0, mk: 0, ms: 0.25, tk: 0, ts: 0.6,
      hue: hue === undefined ? r() * 360 : hue, hue2: (r() < 0.5 ? -1 : 1) * (50 + r() * 110), sat: 62 + r() * 20, lit: 58 + r() * 8, pat: 0, psc: 0.5, crest: 0, shell: 0, glow: 0, venom: 0, hd: 1, nk: 0, coat: 0, eg: 0.5, ey: 0.14, ep: 0.46, bl: 0.4, sm: 0.5, ll: 1, lw: 1, hs: 1, st: 0, cl: 0, hx: 0.85 + r() * 0.4, hq: 1.7 + r() * 1.2, pl: 0, seed: Math.floor(r() * 1e6) };
  };
  F.clone = function (f) {
    const o = {};
    for (const k in f) if (k.charAt(0) !== '_') o[k] = f[k];
    if (f.bd) o.bd = G.body.clone(f.bd);
    o.prof = f.prof.slice();
    o.rules = f.rules.map(cpRule);
    return o;
  };
  const num = function (v, lo, hi, d) { v = +v; return isFinite(v) ? clamp(v, lo, hi) : d; };
  F.fix = function (f) {
    if (f.bd && G.body) G.body.fix(f);            // a body of free shapes: its masses are the body's segments
    f.sym = f.sym ? clamp(f.sym | 0, 3, 8) : 0;
    f.n = clamp(f.n | 0, 1, MAXN); f.len = num(f.len, 0.6, 1.5, 1); f.bend = num(f.bend, -0.3, 0.3, 0);
    if (!Array.isArray(f.prof)) f.prof = [1, 1, 1, 1, 1];
    for (let i = 0; i < 5; i++) f.prof[i] = num(f.prof[i], 0.35, 1.6, 1);
    f.prof.length = 5;
    // THE RULES OF GROWTH. Mutation proposes anything; development only builds bodies that hold together:
    //  · the two sides are mirror images (the spine never kinks to one side)
    //  · the body swells to ONE widest point and tapers smoothly to both ends, never lumpy, never pinched to nothing
    f.bend = 0;
    { const P = f.prof; let mi = 1; for (let i = 0; i < 5; i++) if (P[i] > P[mi]) mi = i; if (mi === 4) mi = 3;
      for (let i = mi - 1; i >= 0; i--) P[i] = clamp(P[i], P[i + 1] * 0.6, P[i + 1]);
      for (let i = mi + 1; i < 5; i++) P[i] = clamp(P[i], P[i - 1] * 0.55, P[i - 1] * 0.97); }
    if (!Array.isArray(f.rules)) f.rules = [];
    f.rules = f.rules.slice(0, MAXR);
    for (let i = 0; i < f.rules.length; i++) {
      const q = f.rules[i];
      q.k = clamp(q.k | 0, 0, 8); q.a = clamp(q.a | 0, 0, f.n - 1); q.b = clamp(q.b | 0, q.a, f.n - 1); q.e = clamp(q.e | 0, 1, 2);
      q.l = num(q.l, 0.4, 2.2, 1); q.w = num(q.w, 0.2, 0.9, 0.5); q.j = clamp(q.j | 0, 1, 3); q.g = num(q.g, -1.2, 1.2, 0); q.c = num(q.c, -1.2, 1.2, 0); q.t = clamp(q.t | 0, 0, q.k === 8 ? 1e6 : 3); q.p = num(q.p, 0.2, 0.9, 0.5); q.u = num(q.u, 0.3, 0.7, 0.5); q.f = num(q.f, 0.6, 1.7, 1);      /* u: where a limb's joint sits along it; f: how big its hand or foot is */
      // a part may grow from the tip of an earlier leg, tentacle or feeler; at most three deep (arm, forearm, hand)
      //  · every kind of growth points the way such things point: fins sweep back, feelers reach forward, legs stand out to the side
      { const lim = q.on >= 0 ? [-0.9, 0.9] : GLIM[q.k]; q.g = clamp(q.g, lim[0], lim[1]); q.c = clamp(q.c, -0.85, 0.85); }
      q.on = q.on === undefined || q.on === null ? -1 : q.on | 0;
      if (q.on >= 0) { const par = q.on < i ? f.rules[q.on] : null; if (!par || !CHAIN[par.k] || q.k === 5 || (par.on >= 0 && f.rules[par.on].on >= 0)) q.on = -1; }
    }
    f.en = clamp(f.en | 0, f.bd && (f.bd.m.length > 1 || f.rules.length > 2) ? 1 : 0, 3); f.es = num(f.es, f.bd ? 0.34 : 0.2, f.bd ? 0.9 : 0.62, 0.4); f.ek = num(f.ek, 0, 1.2, 0);
    f.mk = clamp(f.mk | 0, 0, 4); f.ms = num(f.ms, 0.14, 0.7, 0.25); f.tk = clamp(f.tk | 0, 0, 4); f.ts = num(f.ts, 0.3, 1.5, 0.6);
    f.hue = ((num(f.hue, -1e6, 1e6, 200) % 360) + 360) % 360; f.hue2 = num(f.hue2, -180, 180, 90); if (Math.abs(f.hue2) < 40) f.hue2 = f.hue2 < 0 ? -40 : 40;
    f.sat = num(f.sat, 40, 94, 70); f.lit = num(f.lit, 46, 78, 62); f.pat = clamp(f.pat | 0, 0, 5); f.psc = num(f.psc, 0.15, 1, 0.5);
    f.crest = num(f.crest, 0, 1, 0); f.shell = num(f.shell, 0, 1, 0); f.glow = num(f.glow, 0, 1, 0); f.venom = num(f.venom, 0, 1, 0); f.seed = (f.seed | 0) || 1;
    f.hd = num(f.hd, 0.7, f.bd ? 2.5 : 1.9, 1);
    f.eg = num(f.eg, 0.3, 0.8, 0.5); f.ey = num(f.ey, -0.2, 0.36, 0.14); f.ep = num(f.ep, 0.36, 0.78, 0.46); f.bl = num(f.bl, 0, 1, 0.4); f.sm = num(f.sm, -0.2, 1, 0.5);
    // the face in more detail: ex an eye's shape (tall .. wide), et its slant, el how far the lid comes down, bw how heavy the brows, ba how they slope, sn a muzzle, nz a nose (0 none, 1 button, 2 triangle, 3 nostrils)
    f.ex = num(f.ex, 0.7, 1.4, 1); f.et = num(f.et, -0.45, 0.45, 0); f.el = num(f.el, 0, 0.55, 0); f.bw = num(f.bw, 0, 1, 0.35); f.ba = num(f.ba, -0.6, 0.6, 0.1); f.sn = num(f.sn, 0, 1, 0); f.nz = clamp(f.nz | 0, 0, 3);
    f.ll = num(f.ll, 0.6, 1.9, 1); f.lw = num(f.lw, 0.6, 1.8, 1); f.hs = num(f.hs, 0.8, 1.5, 1); f.st = num(f.st, -0.35, 0.35, 0); f.cl = clamp(f.cl | 0, 0, 4); f.nk = num(f.nk, 0, 0.7, 0); f.coat = clamp(f.coat | 0, 0, 3);
    f.hx = num(f.hx, 0.72, 1.45, 1); f.hq = num(f.hq, 1.5, 4, 2); f.pl = Math.max(0, f.pl | 0);
    if (f.bd) while (f.rules.length > 6) dropRule(f, f.rules.length - 1);      // how many it may GROW is the pond's room (see F.mutate); six is only what a body can be drawn with
    delete f._k; delete f._b;
    return f;
  };
  function newRule(n, k) {
    const r = G.rand, a = Math.floor(r() * n);
    return { k: k === undefined ? Math.floor(r() * 8) : k, a: a, b: clamp(a + Math.floor(r() * 3), a, n - 1), e: 1 + Math.floor(r() * 2), l: 0.7 + r() * 1.0, w: 0.35 + r() * 0.45, j: 2 + Math.floor(r() * 2), g: (r() - 0.5) * 1.4, c: (r() - 0.5) * 1.4, t: Math.floor(r() * 4), p: 0.3 + r() * 0.5, on: -1, u: 0.38 + r() * 0.26, f: 0.8 + r() * 0.5 };
  }
  // sometimes the new growth sprouts from the tip of one that is already there: a hand on an arm, a claw on a tentacle
  const perch = function (f, q) {
    if (q.k === 5 || G.rand() > 0.3) return '';
    const ok = []; for (let i = 0; i < f.rules.length; i++) { const p = f.rules[i]; if (CHAIN[p.k] && !(p.on >= 0 && f.rules[p.on].on >= 0)) ok.push(i); }
    if (!ok.length) return '';
    q.on = ok[Math.floor(G.rand() * ok.length)]; q.l *= 0.75;
    return ' on the tips of its ' + KMANY[f.rules[q.on].k];
  };
  const has = function (f, k) { for (let i = 0; i < f.rules.length; i++) if (f.rules[i].k === k) return true; return false; };

  /** mutate a form in place. m: chance of a nudge per gene; wild: the world's mutation slider; press: what the pond is up against; note(text, big) */
  // ── room to grow ──
  // A young pond keeps its bodies simple: more than about six things on one body counts as clutter, and clutter is shed, snubbed and scored down.
  // That limit loosens only as it is EARNED (W.room, see G.roomAfterLook in 21c_taste.js): each time the pond's god looks and finds that its bodies read
  // well, bodies may carry a little more; when they stop reading well it tightens again. Mutation itself is not pushed either way.
  F.room = function () { const W = G.W; return G.ROOM_OFF ? 0 : G.ROOM_FORCE !== undefined ? G.ROOM_FORCE : (W && W.room) || 0; };
  F.mutate = function (f, m, wild, press, note) {
    const r = G.rand, n = G.randn;
    // (nothing makes a busy body shed its parts: whether much on a body is a muddle or a marvel is for the god to mark, and every part has to be fed)
    // a change of structure: at most one a birth
    if (r() < (f.bd ? 0.14 : 0.16) * wild) {
      const roll = r();
      if (roll < 0.13) { if (f.bd) G.body.bud(f, note); else if (f.n < MAXN) { f.n++; note('body grew to ' + f.n + ' segments', true); } }
      else if (roll < 0.17) { if (f.bd) G.body.drop(f, note); else if (f.n > 1) { f.n--; note('body shrank to ' + f.n + (f.n === 1 ? ' segment' : ' segments'), true); } }
      else if (roll < 0.33) {
        if (f.rules.length < (f.bd ? Math.min(MAXR, 4 + Math.round(F.room() * 0.67)) : MAXR)) {
          // what sprouts next leans towards what the pond is up against
          const w = [1, 1, 1, 1, 1, 1, 1, 1], pp = press ? press.part : null, D0 = G.pondDna ? G.pondDna() : null;
          if (D0) { const KW = (f._air || 0) >= 0.5 && D0.kwL ? D0.kwL : D0.kw; for (let i = 0; i < 8; i++) w[i] = KW[i]; }      // this pond's own leaning: some kinds of growth turn up more often here
          if (press && press.o2) { w[1] += press.o2; w[6] += press.o2 * 1.5; w[3] += press.o2 * 0.5; }
          if (pp) { w[1] += pp[1] + pp[7] * 0.5; w[2] += pp[2]; w[7] += pp[2] * 0.7; w[5] += pp[3]; w[4] += pp[5] + pp[4] * 0.5; w[3] += pp[8]; w[0] += pp[0] * 0.5; }
          let tot = 0; for (let i = 0; i < 8; i++) tot += w[i];
          let x = r() * tot, k = 0; for (let i = 0; i < 8; i++) { x -= w[i]; if (x <= 0) { k = i; break; } }
          // a pond that has been given new kinds of part may grow one of those instead
          const ds = G.W && G.W.designs ? G.W.designs : [];
          if (ds.length && r() < 0.34) { const d = ds[Math.floor(r() * ds.length)], q = newRule(f.n, 8); q.t = d.id; if (d.place === 'head') { q.a = 0; q.b = 0; q.e = 1; } f.rules.push(q); note('grew a ' + d.name.toLowerCase(), true); }
          else { const q = newRule(f.n, k), where = perch(f, q); f.rules.push(q); note('grew ' + KMANY[k] + where, true); }
        }
      }
      else if (roll < 0.38) { if (f.rules.length) { const i = Math.floor(r() * f.rules.length); note('lost its ' + KMANY[f.rules[i].k], true); dropRule(f, i); } }
      else if (roll < 0.46) {
        if (f.rules.length && f.rules.length < (f.bd ? Math.min(MAXR, 4 + Math.round(F.room() * 0.67)) : MAXR)) {
          const src = f.rules[Math.floor(r() * f.rules.length)], c = cpRule(src);
          c.a = src.a + (r() < 0.5 ? 0 : r() < 0.5 ? 1 : -1);
          c.l *= 0.8 + r() * 0.4; c.g = (c.g || 0) + (r() - 0.5) * 0.6; c.u = 0.38 + r() * 0.26; if (r() < 0.4) c.j = 1 + Math.floor(r() * 3);
          c.b = c.a; if (r() < 0.5) c.k = Math.floor(r() * 8);
          f.rules.push(c); note(c.k === src.k ? 'a second set of ' + KMANY[c.k] : 'its ' + KMANY[src.k] + ' were copied and became ' + KMANY[c.k], true);
        }
      }
      else if (roll < 0.52) { if (f.rules.length && f.n > 1) { const q = f.rules[Math.floor(r() * f.rules.length)]; q.b += r() < 0.65 ? 1 : -1; note(KMANY[q.k] + ' spread along the body', true); } }
      else if (roll < 0.56) { const L = f.rules.filter(function (q) { return q.k === 0; }); if (L.length) { const q = L[Math.floor(r() * L.length)]; q.t = Math.floor(r() * 4); note('legs now end in ' + ['stumps', 'fingers', 'pincers', 'paddles'][q.t], true); } }
      else if (roll < 0.65) { const up = r() < 0.7; if (up ? f.en < 3 : f.en > 0) { f.en += up ? 1 : -1; note(up ? 'grew an eye (' + f.en + ' now)' : 'lost an eye', true); } }
      else if (roll < 0.70) { const k = Math.floor(r() * 5); if (k !== f.mk) { f.mk = k; note(['its mouth became a plain opening', 'grew a beak', 'grew jaws', 'its mouth became a sucker', 'grew whiskers'][k], true); } }
      else if (roll < 0.76) { const k = Math.floor(r() * 5); if (k !== f.tk) { f.tk = k; note(['lost its tail', 'grew a fan tail', 'grew a forked tail', 'grew a whip tail', 'grew a club tail'][k], true); } }
      else if (roll < 0.83) { const k = Math.floor(r() * 6); if (k !== f.pat) { f.pat = k; note('skin turned ' + ['plain', 'striped', 'spotted', 'pale-bellied', 'ringed', 'saddled'][k], true); } }
      else if (roll < 0.87) { const up = r() < 0.7; f.crest = clamp(f.crest + (up ? 0.4 : -0.4), 0, 1); note(up ? 'grew a crest' : 'its crest shrank', true); }
      else if (roll < 0.90) { const up = r() < 0.7; f.shell = clamp(f.shell + (up ? 0.4 : -0.4), 0, 1); note(up ? 'grew a shell' : 'its shell thinned', true); }
      else if (roll < 0.93) { const up = r() < 0.7; f.glow = clamp(f.glow + (up ? 0.5 : -0.5), 0, 1); note(up ? 'began to glow' : 'its glow faded', true); }
      else if (roll < 0.955) { const up = r() < 0.7; f.venom = clamp(f.venom + (up ? 0.5 : -0.5), 0, 1); note(up ? 'grew poison glands' : 'its poison weakened', true); }
      else if (roll < 0.975 && !f.bd) { if (f.sym) { if (r() < 0.5) { f.sym = 0; note('a whole new body plan: a head and a tail', true); } else { f.sym += r() < 0.5 ? 1 : -1; note('changed its number of arms', true); } } else { f.sym = 3 + Math.floor(r() * 5); note('a whole new body plan: a star with ' + f.sym + ' arms', true); } }
      else { f.hue += 60 + r() * 240; note('a new colour', true); }
    }
    // a limb grows a joint: a copy of itself sprouts from its own tip (an arm gets a forearm, a forearm a hand)
    if (f.rules.length < (f.bd ? Math.min(MAXR, 4 + Math.round(F.room() * 0.67)) : MAXR) && r() < 0.03 * wild) {
      const ok = []; for (let i = 0; i < f.rules.length; i++) { const p = f.rules[i]; if (CHAIN[p.k] && !(p.on >= 0 && f.rules[p.on].on >= 0) && !f.rules.some(function (x) { return x.on === i; })) ok.push(i); }
      if (ok.length) { const pi = ok[Math.floor(r() * ok.length)], c = cpRule(f.rules[pi]); c.on = pi; c.l *= 0.7; c.w *= 0.85; c.g = (r() - 0.5) * 1.2; if (c.k === 0) c.t = 1 + Math.floor(r() * 3); f.rules.push(c); note('its ' + KMANY[c.k] + ' grew a joint: a part on a part', true); }
    }
    // a child of a new colour: rare, but it is how a pond comes to hold several colours
    if (r() < 0.03 * wild * (G.pondDna && G.pondDna() ? G.pondDna().jump : 1)) { f.hue += 50 + r() * 260; if (r() < 0.5) { f.sat = 40 + r() * 54; f.lit = 46 + r() * 32; } if (r() < 0.5) f.hue2 = (r() < 0.5 ? -1 : 1) * (40 + r() * 140); note('was born a new colour', true); }
    // a whole new way of carrying the body: one of the builds this pond has been given
    // a shape of body imagined for this pond: now and then a child is born some way towards one of them
    if (f.bd) { const pls = G.W && G.W.plans ? G.W.plans : []; if (pls.length && r() < 0.026 * wild * (1 + 2 * ((G.W && G.W.stall) || 0))) { const p = pls[Math.floor(r() * pls.length)]; if (p.id !== f.pl && p.bd) { const tt = 0.65 + r() * 0.35; G.body.adopt(f, p.bd, tt); f.pl = p.id; if (p.face) for (const k in p.face) if (p.face[k] !== undefined) f[k] += (p.face[k] - f[k]) * Math.min(1, tt + 0.1);
      if (p.tail && tt > 0.7) { f.tk = p.tail.tk; f.ts = p.tail.ts; }
      if (p.outfit && tt > 0.7) f.cl = p.outfit;
      if (p.kit && tt > 0.7) for (let ki = 0; ki < p.kit.length; ki++) F.nudge(f, p.kit[ki], null);      /* a plush shape comes with its stubby legs and little arms */ note('its body took a new shape: the ' + p.name.toLowerCase() + (p.because ? ' (' + p.because + ')' : ''), true); } } }
    // a muzzle, a nose
    if (f.bd && r() < 0.025 * wild) { if (f.sn > 0.2) { f.sn = 0; note('its muzzle flattened away', true); } else { f.sn = 0.35 + r() * 0.5; note('grew a muzzle', true); } }
    if (f.bd && r() < 0.025 * wild) { const k = Math.floor(r() * 4); if (k !== (f.nz | 0)) { f.nz = k; note(['lost its nose', 'grew a button nose', 'grew a soft triangle of a nose', 'grew a pair of nostrils'][k], true); } }
    // heads, necks and coats
    if (f.bd && f.cl && r() < 0.02 * wild) { const k = 0; if (k !== f.cl) { f.cl = k; note(['took off its outfit', 'put on a scarf', 'put on a belt', 'put on gloves and boots', 'grew a tuft of hair'][k], true); } }
    if (r() < 0.022 * wild) { const k = Math.floor(r() * 4); if (k !== f.coat) { f.coat = k; note(['lost its coat: bare skin again', 'grew scales', 'grew fur', 'grew feathers'][k], true); } }
    if (f.n > 1 && !f.sym && !f.bd && r() < 0.025 * wild) { const up = r() < 0.65; f.nk = clamp(f.nk + (up ? 0.25 : -0.25), 0, 0.7); note(up ? 'its neck narrowed: a head set apart from the body' : 'its neck thickened', true); }
    if (!f.bd && r() < 0.02 * wild) { f.hx = 0.72 + r() * 0.73; f.hq = 1.5 + r() * 2.5; note(f.hq > 3 ? 'its head grew square' : f.hq < 1.8 ? 'its head grew pointed' : f.hx > 1.2 ? 'its head grew wide' : f.hx < 0.85 ? 'its head grew tall' : 'its head changed shape', true); }
    if (r() < 0.022 * wild) { const up = r() < 0.6; f.hd = clamp(f.hd + (up ? 0.22 : -0.22), 0.7, 1.9); note(f.bd ? (up ? 'its face grew' : 'its face shrank') : (up ? 'its head grew' : 'its head shrank'), true); }
    // a kind of part the pond was given gets its trial: now and then a child grows one, in place of an old growth if the body is full.
    // From there it is graded like everything else: by what it does for the body, by its cost, and by whether mates like the look.
    const dsl = G.W && G.W.designs ? G.W.designs : [];
    if (dsl.length && r() < 0.035 * wild * (1 + 2 * ((G.W && G.W.stall) || 0))) {
      const d = dsl[Math.floor(r() * dsl.length)];
      if (d.place === 'skin') for (let i = f.rules.length - 1; i >= 0; i--) { const dq = dsgOf(f.rules[i]); if (dq && dq.place === 'skin' && f.rules[i].t !== d.id) dropRule(f, i); }      // one condition at a time: the new one takes the old one's place
      if (!f.rules.some(function (q) { return q.k === 8 && q.t === d.id; })) {
        const q = newRule(f.n, 8); q.t = d.id; if (d.place === 'head') { q.a = 0; q.b = 0; q.e = 1; }
        if (f.rules.length < (f.bd ? Math.min(MAXR, 4 + Math.round(F.room() * 0.67)) : MAXR)) f.rules.push(q); else { let at = Math.floor(r() * f.rules.length); for (let t = 0; t < 4 && f.rules[at].k === 8; t++) at = Math.floor(r() * f.rules.length); dropRule(f, at); f.rules.push(q); }
        note('grew a ' + d.name.toLowerCase(), true);
      }
    }
    // the body answers the world it is born into (see the pressures): a coat, a build, eyes, a colour
    const B = press ? press.body : null;
    if (B) {
      if (B.coat >= 0 && f.coat !== B.coat && r() < 0.14 * wild) { f.coat = B.coat; note(B.coat === 2 ? 'grew fur against the cold' : B.coat === 1 ? 'grew scales against the poison' : 'shed its coat in the heat', true); }
      if (B.plump && r() < 0.22 * wild) { const k = 1 + 0.1 * B.plump; f.prof[1] *= k; f.prof[2] *= k; f.prof[3] *= k; note(B.plump > 0 ? 'grew plumper, to hold its warmth' : 'grew slimmer, to shed heat', false); }
      if (B.eyes && r() < 0.14 * wild) { f.es += 0.06; if (f.en < 2 && r() < 0.5) f.en++; note('its eyes grew, for the dark', false); }
      if (B.hue >= 0 && r() < 0.22 * wild) { let d = ((B.hue - f.hue + 540) % 360) - 180; if (Math.abs(d) > 6) { f.hue += Math.sign(d) * Math.min(Math.abs(d), 10 + r() * 22); note('its colour drifted towards ' + (B.like || 'what hunts it'), false); } }
    }
    // how its parent LIVED makes the fitting answer likelier too: what it ate, and where. Each kind of food is gathered by a different ability (see forage in G.derive:
    // gold by reach, lime by agility, blue by senses, violet by attack, pink by speed), and shore, shallows and deep each ask something else of a body.
    // It only tilts what chance offers: the part still has to earn its keep.
    const life = F._life;
    if (life && f.bd) {
      const room = f.rules.length < 4, hitL = function (p) { return r() < p * wild; }, legR = function () { for (let i = 0; i < f.rules.length; i++) if (f.rules[i].k === 0 && f.rules[i].on < 0) return f.rules[i]; return null; };
      if (life.diet === 0 && hitL(0.05)) { if (!has(f, 0) && !has(f, 3) && room) { const q = newRule(f.n, r() < 0.5 ? 0 : 3); f.rules.push(q); note('grew ' + KMANY[q.k] + ', to reach the gold food', true); } else { f.ms += 0.05; note('its mouth grew, for the gold food', false); } }
      else if (life.diet === 1 && hitL(0.05)) { if (!has(f, 1) && room) { f.rules.push(newRule(f.n, 1)); note('grew fins, to turn after the lime food', true); } }
      else if (life.diet === 2 && hitL(0.03)) { if (f.mk !== 3) { f.mk = 3; note('its mouth became a sucker, for grazing the green food', true); } }
      else if (life.diet === 3 && hitL(0.05)) { if (f.en < 2) { f.en++; note('grew an eye, to find the blue food', true); } else if (!has(f, 4) && room && r() < 0.4) { f.rules.push(newRule(f.n, 4)); note('grew feelers, to find the blue food', true); } else { f.es += 0.05; note('its eyes grew, for the blue food', false); } }
      else if (life.diet === 4 && hitL(0.05)) { if (f.mk !== 2) { f.mk = 2; note('grew jaws, for the tough violet food', true); } else if (!has(f, 2) && room) { f.rules.push(newRule(f.n, 2)); note('grew spikes, for the tough violet food', true); } }
      else if (life.diet === 5 && hitL(0.05)) { if (!f.tk) { f.tk = 1 + Math.floor(r() * 2); note('grew a tail, to chase the quick pink food', true); } else if (!has(f, 1) && room) { f.rules.push(newRule(f.n, 1)); note('grew fins, to chase the quick pink food', true); } }
      if ((f._air || 0) >= 0.5 && hitL(0.22)) { const Lg = legR();
        if (!Lg) {      // no legs yet: they come first, in place of tentacles or fins if the body has no room for more
          if (!room) { let at = -1; for (let i = 0; i < f.rules.length; i++) { const q = f.rules[i]; if (q.on < 0 && (q.k === 3 || q.k === 1) && !f.rules.some(function (x) { return x.on === i; })) { at = i; if (q.k === 3) break; } } if (at >= 0) dropRule(f, at); }
          if (f.rules.length < 6) { const q = newRule(f.n, 0); q.t = r() < 0.7 ? 0 : 3; f.rules.push(q); note('grew legs, living on the land', true); } }
        else if (f.tk && r() < 0.5) { f.tk = 0; note('lost its tail, walking in the open air', true); }
        else if (has(f, 1) && r() < 0.2) { for (let i = 0; i < f.rules.length; i++) if (f.rules[i].k === 1 && f.rules[i].on < 0) { dropRule(f, i); break; } note('its fins withered, walking in the open air', true); } else if (f.tk && r() < 0.3) { f.tk = 0; note('lost its tail, walking in the open air', true); } else if (f.coat !== 2) { f.coat = 2; note('grew fur, living in the open air', true); } else if (Lg && Lg.t !== 1) { Lg.t = 1; note('its feet grew fingers, living in the open air', true); } }
      else if (life.shore > 0.3 && life.land < 0.05 && hitL(0.06)) { const Lg = legR(); if (!Lg && room) { f.rules.push(newRule(f.n, 0)); note('grew legs, to walk the ground', true); } else if (Lg && Lg.b < f.n - 1) { Lg.b++; note('grew more legs, to walk the ground', true); } }
      else if (life.deep > 0.5 && hitL(0.05)) { if (f.glow < 0.6) { f.glow = clamp(f.glow + 0.4, 0, 1); note('began to glow, living where it is dark', true); } else { f.es += 0.05; note('its eyes grew, living where it is dark', false); } }
      else if ((f._air || 0) < 0.5 && has(f, 0) && hitL(0.16)) { for (let i = 0; i < f.rules.length; i++) { const q = f.rules[i]; if (q.k === 0 && q.on < 0 && !f.rules.some(function (x) { return x.on === i; })) { q.k = 1; q.t = 0; note('its legs flattened into fins, gliding instead of walking', true); break; } } }
      else if (life.land < 0.02 && life.shore < 0.1 && life.deep < 0.3 && hitL(0.03)) { if (!has(f, 1) && room) { f.rules.push(newRule(f.n, 1)); note('grew fins, to glide over open ground', true); } else if (!f.tk) { f.tk = 1 + Math.floor(r() * 2); note('grew a tail, to glide over open ground', true); } }
    }
    // what the pond is up against makes the fitting answer a likelier thing to stumble on
    const pp = press ? press.part : null;
    if (pp) {
      const hit = function (i) { return pp[i] > 0 && r() < 0.055 * wild * Math.min(2.5, pp[i]); };
      if (hit(2) && !has(f, 2) && !has(f, 7) && f.rules.length < (f.bd ? Math.min(MAXR, 4 + Math.round(F.room() * 0.67)) : MAXR)) { const k = r() < 0.6 ? 2 : 7; f.rules.push(newRule(f.n, k)); note('grew ' + KMANY[k], true); }
      if (hit(3) && f.shell < 1) { f.shell = clamp(f.shell + 0.4, 0, 1); note('grew a shell', true); }
      if (hit(6) && f.venom < 1) { f.venom = clamp(f.venom + 0.5, 0, 1); note('grew poison glands', true); }
      if (hit(5) && f.glow < 1) { f.glow = clamp(f.glow + 0.5, 0, 1); note('began to glow', true); }
      if (hit(4) && f.en < 2) { f.en++; note('grew an eye (' + f.en + ' now)', true); }
      if (hit(0) && f.mk !== 2) { f.mk = 2; note('grew jaws', true); }
      if (hit(1) && !has(f, 1) && f.rules.length < (f.bd ? Math.min(MAXR, 4 + Math.round(F.room() * 0.67)) : MAXR)) { f.rules.push(newRule(f.n, 1)); note('grew fins', true); }
      if (hit(7) && !f.tk && f.n > 1) { f.tk = 1 + Math.floor(r() * 2); note('grew a tail', true); }
      if (hit(8) && !has(f, 3) && f.rules.length < (f.bd ? Math.min(MAXR, 4 + Math.round(F.room() * 0.67)) : MAXR)) { f.rules.push(newRule(f.n, 3)); note('grew tentacles', true); }
    }
    // and a little drift in the numbers
    let drift = false;
    const d = function () { if (r() < m * 2) { drift = true; return n() * (r() < 0.12 ? 3 : 1); } return 0; };      // now and then a leap, not a step
    f.len *= 1 + d() * 0.08;
    for (let i = 0; i < 5; i++) f.prof[i] *= 1 + d() * 0.14;
    f.bend += d() * 0.05; f.hd *= 1 + d() * 0.07; f.nk += d() * 0.04; f.hx *= 1 + d() * 0.08; f.hq *= 1 + d() * 0.1;
    f.hue += d() * 12; f.hue2 += d() * 14; f.sat += d() * 5; f.lit += d() * 4;
    f.es += d() * 0.04; f.eg += d() * 0.03; f.ey += d() * 0.04; f.ep += d() * 0.03; f.bl += d() * 0.08; f.sm += d() * 0.08; f.ll *= 1 + d() * 0.07; f.lw *= 1 + d() * 0.07; f.hs *= 1 + d() * 0.07; f.st += d() * 0.1; f.ek += d() * 0.12; f.ms += d() * 0.05; f.ts += d() * 0.1; f.psc += d() * 0.1; f.ex = (f.ex || 1) * (1 + d() * 0.07); f.et = (f.et || 0) + d() * 0.06; f.el = (f.el || 0) + d() * 0.05; f.bw = (f.bw === undefined ? 0.35 : f.bw) + d() * 0.1; f.ba = (f.ba === undefined ? 0.1 : f.ba) + d() * 0.1; if (f.sn > 0.2) f.sn += d() * 0.08;
    for (let i = 0; i < f.rules.length; i++) { const q = f.rules[i]; q.l *= 1 + d() * 0.12; q.w *= 1 + d() * 0.1; q.g += d() * 0.15; q.c += d() * 0.15; q.u = (q.u === undefined ? 0.5 : q.u) + d() * 0.05; q.f = (q.f || 1) * (1 + d() * 0.1); q.p += d() * 0.08; if (r() < m * 0.25) { q.j = 1 + Math.floor(r() * 3); drift = true; } }
    if (drift) note('body shape', false);
    if (f.bd) {
      G.body.mutate(f, m, wild, note);
      if (f.pl && G.planOf) { const p = G.planOf(f.pl); if (!p || !p.bd || G.body.dist(f.bd, p.bd) > 1.7) f.pl = 0; }      // it has drifted away from the shape it once took
    }
    return F.fix(f);
  };
  /** one change towards better looks, as the judge put it */
  F.NUDGES = ['eyes_bigger', 'two_eyes', 'simpler', 'rounder', 'bolder_colour', 'pattern', 'plain', 'bigger_face', 'shorter_parts', 'longer_parts', 'plumper', 'slimmer', 'face_on', 'more_parts', 'fewer_masses', 'more_masses', 'smile', 'eyes_apart', 'eyes_closer', 'eyes_lower', 'pupils_bigger', 'blush', 'bigger_head', 'smaller_body', 'legs', 'arms', 'longer_limbs', 'thicker_limbs', 'bigger_hands', 'lean', 'dress', 'fins', 'tail'];
  F.nudge = function (f, fix, note) {
    const r = G.rand; let t = '';
    const headBigger = function (k) { const M = f.bd.m, e = f.bd.e; if (e > 0) M[e].s = Math.min(1.25, M[e].s * (1 + 0.12 * k)); else for (let i = 1; i < M.length; i++) M[i].s = Math.max(0.3, M[i].s * (1 - 0.1 * k)); };
    if (fix === 'eyes_bigger') { f.es += 0.07; t = 'its eyes grew'; }
    else if (fix === 'two_eyes') { if (f.en !== 2) { f.en = 2; t = 'it now has two eyes'; } }
    else if (fix === 'simpler') { if (f.rules.length > 1) { const i = f.rules.length - 1; t = 'lost its ' + KMANY[f.rules[i].k]; dropRule(f, i); } }
    else if (fix === 'rounder') { if (f.bd) { for (let i = 0; i < f.bd.m.length; i++) { const q = f.bd.m[i]; for (let j = 0; j < q.r.length; j++) q.r[j] = 1 + (q.r[j] - 1) * 0.7; q.la *= 0.7; } t = 'its outline grew rounder'; } }
    else if (fix === 'bolder_colour') { f.sat += 8; if (Math.abs(f.hue2) < 120) f.hue2 = (f.hue2 < 0 ? -1 : 1) * (120 + r() * 40); t = 'its colours grew bolder'; }
    else if (fix === 'pattern') { if (!f.pat) { f.pat = 1 + Math.floor(r() * 5); t = 'its skin gained markings'; } }
    else if (fix === 'plain') { if (f.pat) { f.pat = 0; t = 'its markings faded to plain skin'; } }
    else if (fix === 'bigger_face') { f.hd += 0.2; f.es += 0.03; t = 'its face grew'; }
    else if (fix === 'shorter_parts') { for (let i = 0; i < f.rules.length; i++) f.rules[i].l *= 0.82; if (f.rules.length) t = 'its growths grew shorter'; }
    else if (fix === 'longer_parts') { for (let i = 0; i < f.rules.length; i++) f.rules[i].l *= 1.16; if (f.rules.length) t = 'its growths grew longer'; }
    else if (fix === 'plumper') { for (let i = 1; i < 4; i++) f.prof[i] *= 1.1; t = 'it grew plumper'; }
    else if (fix === 'slimmer') { for (let i = 1; i < 4; i++) f.prof[i] *= 0.9; t = 'it grew slimmer'; }
    else if (fix === 'face_on') { if (f.bd && f.bd.v) { f.bd.v = 0; t = 'it turned to face you'; } }
    else if (fix === 'more_parts') { if (f.rules.length < 4) { const q = newRule(f.n); f.rules.push(q); t = 'grew ' + KMANY[q.k]; } }
    else if (fix === 'fewer_masses') { if (f.bd && G.body.drop(f, null)) t = 'lost a part of its body'; }
    else if (fix === 'more_masses') { if (f.bd && G.body.bud(f, null)) t = 'a new part budded from its body'; }
    else if (fix === 'smile') { f.mk = 0; f.ms += 0.06; f.sm += 0.2; t = 'its mouth softened into a smile'; }
    else if (fix === 'eyes_apart') { f.eg += 0.06; t = 'its eyes sit wider apart'; }
    else if (fix === 'eyes_closer') { f.eg -= 0.06; t = 'its eyes sit closer together'; }
    else if (fix === 'eyes_lower') { f.ey -= 0.07; t = 'its eyes sit lower on its face'; }
    else if (fix === 'pupils_bigger') { f.ep += 0.05; t = 'its pupils grew, a softer look'; }
    else if (fix === 'blush') { f.bl += 0.25; t = 'its cheeks grew rosier'; }
    else if (fix === 'bigger_head') { if (f.bd && f.bd.m.length > 1) headBigger(1); f.hd += 0.15; t = 'its head grew bigger beside its body'; }
    else if (fix === 'longer_limbs') { f.ll += 0.15; t = 'its arms and legs grew longer'; }
    else if (fix === 'thicker_limbs') { f.lw += 0.14; t = 'its arms and legs grew sturdier'; }
    else if (fix === 'bigger_hands') { f.hs += 0.16; t = 'its hands and feet grew bigger'; }
    else if (fix === 'fins') { if (f.bd && f.rules.length < 4 && !has(f, 1)) { const L = G.body.lay(f, null); let at = 0; for (let i = 1; i < f.bd.m.length; i++) if (f.bd.m[i].s > f.bd.m[at].s && !f.bd.m[i].pr) at = i; f.rules.push({ k: 1, a: at, b: at, e: 1, l: 0.8, w: 0.5, j: 2, g: 0, c: 0, t: 0, p: 0.5, on: -1 }); t = 'it grew fins'; } }
    else if (fix === 'tail') { if (!f.tk) { f.tk = 1 + Math.floor(r() * 4); f.ts = 0.7; t = 'it grew a tail'; } }
    else if (fix === 'dress') { if (!f.cl) { f.cl = 1 + Math.floor(r() * 4); t = ['', 'it put on a scarf', 'it put on a belt', 'it put on gloves and boots', 'it grew a tuft of hair'][f.cl]; } }
    else if (fix === 'lean') { f.st = clamp(f.st + (f.st >= 0 ? 0.1 : -0.1), -0.35, 0.35); if (Math.abs(f.st) < 0.1) f.st = (r() < 0.5 ? -1 : 1) * 0.15; t = 'it took a stance, leaning into it'; }
    else if (fix === 'legs' || fix === 'arms') {
      // stubby limbs on the mass that rests lowest (legs) and a second set on the same mass (the painter draws those as arms)
      if (f.bd && f.rules.length < 4) {
        const L = G.body.lay(f, null), gnd = G.body.ground(L); let at = -1; for (let i = 0; i < f.bd.m.length; i++) if (gnd[i] && (at < 0 || f.bd.m[i].s > f.bd.m[at].s)) at = i;
        if (at >= 0) { const ex = f.rules.filter(function (q) { return q.k === 0 && q.on < 0 && q.a <= at && q.b >= at; }).length;
          if (fix === 'legs' && !ex) { f.rules.push({ k: 0, a: at, b: at, e: 1, l: 0.6, w: 0.6, j: 2, g: 0.2, c: 0, t: 3, p: 0.5, on: -1 }); t = 'it grew two short stubby legs'; }
          else if (fix === 'arms' && ex === 1) { f.rules.push({ k: 0, a: at, b: at, e: 1, l: 0.55, w: 0.5, j: 2, g: 0.3, c: 0, t: 1, p: 0.5, on: -1 }); t = 'it grew two small arms'; } }
      }
    }
    else if (fix === 'smaller_body') { if (f.bd && f.bd.m.length > 1) { headBigger(0.8); t = 'its body shrank beneath its head'; } else { f.hd += 0.2; t = 'its head grew'; } }
    if (t && note) note(t + ' (as the eye for beauty wished)', true);
  };
  /** a child's body from two parents: whole features come from one or the other */
  F.cross = function (a, b) {
    // the plan of the body (which mass grows from which) and the growths that sit on those masses come from the SAME parent, so legs stay on the mass they
    // belong to; the other parent gives shapes, sizes, the face, colours, and perhaps one growth of its own
    const r = G.rand, sw = r() < 0.5, base = sw ? a : b, o = sw ? b : a, g = F.clone(base);
    if (a.bd && b.bd) g.bd = G.body.cross(base.bd, o.bd, true);
    if (r() < 0.5) g.prof = o.prof.slice();
    if (r() < 0.5) { g.en = o.en; g.es = o.es; g.ek = o.ek; g.eg = o.eg; g.ey = o.ey; g.ep = o.ep; g.ex = o.ex; g.et = o.et; g.el = o.el; }
    if (r() < 0.5) { g.bw = o.bw; g.ba = o.ba; }
    if (r() < 0.5) { g.mk = o.mk; g.ms = o.ms; g.sm = o.sm; g.bl = o.bl; g.sn = o.sn; g.nz = o.nz; }
    if (r() < 0.5) { g.ll = o.ll; g.lw = o.lw; g.hs = o.hs; g.st = o.st; }
    if (r() < 0.5) g.cl = o.cl;
    if (r() < 0.5) { g.tk = o.tk; g.ts = o.ts; }
    if (r() < 0.5) { g.pat = o.pat; g.psc = o.psc; }
    if (r() < 0.5) { g.hue = o.hue; g.hue2 = o.hue2; g.sat = o.sat; g.lit = o.lit; }
    if (r() < 0.5) { g.hd = o.hd; g.nk = o.nk; g.hx = o.hx; g.hq = o.hq; } if (r() < 0.5) g.pl = o.pl; if (r() < 0.5) g.coat = o.coat;
    if (r() < 0.5) g.crest = o.crest; if (r() < 0.5) g.shell = o.shell; if (r() < 0.5) g.glow = o.glow; if (r() < 0.5) g.venom = o.venom;
    if (o.rules.length && r() < 0.35 && g.rules.length < MAXR) { const q = o.rules[Math.floor(r() * o.rules.length)]; if (!has(g, q.k)) { const c = cpRule(q); c.on = -1; g.rules.push(c); } }
    return F.fix(g);
  };

  // ── what the form gives: measured from the body ──
  F.counts = function (f) {
    const c = { k: [0, 0, 0, 0, 0, 0, 0, 0, 0], dfx: { speed: 0, agility: 0, reach: 0, senses: 0, armour: 0, attack: 0 }, dAdj: '', sites: 0, legSites: 0, reach: 0, pincer: 0, paddle: 0, fingers: 0, kinds: 0, mass: 0, dres: [0, 0, 0], dwk: [0, 0, 0, 0, 0] };
    const seen = {}, N = [], RL = [], HEAD = [];      // per growth: how many there are, how far its tip is from the body, and whether it is at the front
    c.nested = 0;
    const plan = f.pl && G.planOf ? G.planOf(f.pl) : null;
    c.plan = plan;
    if (plan && plan.fx) for (const ab in c.dfx) c.dfx[ab] += plan.fx[ab] || 0;
    if (plan && plan.res && f.bd) for (let j = 0; j < 3; j++) c.dres[j] += plan.res[j] || 0;
    for (let i = 0; i < f.rules.length; i++) {
      const q = f.rules[i];
      const dsg = dsgOf(q);
      N[i] = 0; RL[i] = 0; HEAD[i] = false;
      if (q.k === 8 && !dsg) continue;                                   // a part this pond has forgotten: it does nothing
      const par = q.on >= 0 && N[q.on] > 0;
      let k = par ? N[q.on] : f.sym ? Math.ceil(f.sym / q.e) : (Math.floor((q.b - q.a) / q.e) + 1) * 2;
      if (par) c.nested++;
      HEAD[i] = par ? HEAD[q.on] : !!(f.sym || q.a === 0);
      if (dsg) { if (dsg.place === 'back' || dsg.place === 'wrap') k = f.sym ? 1 : k / 2; else if (dsg.place === 'top' || dsg.place === 'face' || dsg.place === 'held' || dsg.place === 'skin') k = 1; if (dsg.hits >= 0) c.dwk[dsg.hits] += Math.min(1.5, k / 2 + 0.5) * Math.min(1.3, q.l); const mul = Math.min(2, k / 2 + 0.5) * Math.min(1.3, q.l); for (const ab in c.dfx) c.dfx[ab] += (dsg.fx[ab] || 0) * mul; if (dsg.res) for (let j = 0; j < 3; j++) c.dres[j] += (dsg.res[j] || 0) * Math.min(1.3, mul); if (!c.dAdj) c.dAdj = dsg.adj; }
      N[i] = k; RL[i] = (par ? RL[q.on] + q.l * 0.7 : q.l);
      c.k[q.k] += k * q.l; c.sites += k; c.mass += k * q.l * (0.5 + q.w);
      if (!seen[q.k]) { seen[q.k] = 1; c.kinds++; }
      if (q.k === 0) { if (!par) c.legSites += k; if (q.t === 2) c.pincer += k; if (q.t === 3) c.paddle += k; if (q.t === 1 && HEAD[i]) c.fingers += k; if (HEAD[i]) c.reach = Math.max(c.reach, RL[i]); }
      if (q.k === 3) c.reach = Math.max(c.reach, RL[i] * (HEAD[i] ? 1.2 : 0.6));
      if (par && !HEAD[i]) c.reach = Math.max(c.reach, RL[i] * 0.55);
    }
    if (plan && plan.stands && plan.legs && plan.legs.length >= 2) c.legSites = Math.max(c.legSites, 4);
    return c;
  };
  F.abilities = function (f, c) {
    c = c || F.counts(f);
    const k = c.k, L = 2 + (f.n - 1) * 0.68 * f.len, wide = Math.max.apply(null, f.prof) * (0.74 + 0.05 * f.n);
    const bm = f.bd && G.body ? G.body.measure(f) : null;
    const stream = bm ? bm.stream : f.sym ? 0.35 : clamp(L / (wide * 2.4), 0.4, 1.8) * (f.prof[0] < f.prof[2] ? 1.1 : 0.9);      // long, narrow and pointed slips through the water
    const tail = f.sym || f.n < 2 ? 0 : [0, 0.6, 1, 0.35, 0.05][f.tk] * f.ts;
    const heavy = f.shell + 0.12 * k[5] + 0.05 * k[7];
    const D = {}; for (const ab in c.dfx) D[ab] = clamp(c.dfx[ab], -0.4, 0.55);
    // a neck lets the head reach and turn; a big head carries bigger senses; scales protect; feathers steer
    const neck = f.sym || f.n < 2 || bm ? 0 : f.nk;
    // a free body: tall reaches up, a face carried high sees far, bulk protects and slows, pairs balance, a hollow part is light
    if (bm) { const big = clamp(bm.bulk - 1, 0, 2.5); D.reach += 0.16 * clamp(bm.tall - 1, 0, 1.2) + 0.05 * bm.stalks; D.senses += 0.12 * bm.high; D.armour += 0.07 * big; D.speed -= 0.045 * big; D.agility += 0.06 * bm.pairs + 0.08 * bm.hollow; D.armour -= 0.06 * bm.hollow; }
    D.reach += 0.22 * neck; D.agility += 0.05 * Math.min(3, c.nested); D.speed += 0.02 * Math.min(3, c.nested); D.agility += 0.08 * neck + (f.coat === 3 ? 0.06 : 0); D.senses += 0.14 * (f.hd - 1); D.armour += f.coat === 1 ? 0.12 : 0; D.speed -= f.coat === 1 ? 0.05 : f.coat === 2 ? 0.03 : 0;      // what the pond's own kinds of part add or cost
    return {
      speed: clamp(D.speed + 0.1 + 0.3 * stream + 0.32 * tail + 0.02 * Math.min(k[1], 6) + 0.04 * c.paddle - 0.2 * heavy - 0.015 * k[0] - 0.012 * c.sites, 0, 1),
      agility: clamp(D.agility + 0.15 + 0.05 * k[1] + 0.035 * k[0] + 0.03 * k[3] - 0.05 * f.n + (f.sym ? 0.15 : 0) + (f.tk === 1 && !f.sym ? 0.15 : 0) - 0.1 * heavy, 0, 1),
      reach: clamp(D.reach + 0.05 + 0.3 * c.reach + 0.25 * f.ms + (f.mk === 3 ? 0.15 : 0) + 0.05 * c.pincer, 0, 1),
      senses: clamp(D.senses + 0.05 + (f.sym ? 0.12 : 0) + 0.13 * f.en * (0.5 + f.es) + 0.15 * f.ek * Math.min(1, f.en) + 0.06 * k[4] + 0.03 * k[3] + (f.mk === 4 ? 0.12 : 0), 0, 1),
      armour: clamp(D.armour + (f.sym ? 0.08 : 0) + 0.5 * f.shell + 0.09 * k[5] + 0.04 * k[2] + 0.08 * f.crest + 0.02 * k[6], 0, 1),
      attack: clamp(D.attack + 0.07 * k[2] + 0.09 * k[7] + 0.08 * c.pincer + (f.mk === 2 ? 0.3 + 0.4 * f.ms : f.mk === 1 ? 0.2 : 0) + (f.tk === 4 && !f.sym ? 0.2 * f.ts : 0), 0, 1),
    };
  };

  // ── taste ──
  /** what one pond finds beautiful: arbitrary, and different in every pond */
  F.newFashion = function () {
    const r = G.rand, like = [];
    for (let i = 0; i < 8; i++) like.push(r() < 0.35 ? 1 : r() < 0.5 ? -0.6 : 0);
    if (!like.some(function (v) { return v > 0; })) like[Math.floor(r() * 8)] = 1;
    return { like: like, eyes: 1 + Math.floor(r() * 3), pat: 1 + Math.floor(r() * 5), star: r() < 0.3 ? 1 : 0, crest: r() < 0.3 ? 1 : 0, shell: r() < 0.3 ? 1 : 0, glow: r() < 0.3 ? 1 : 0, long: r() < 0.5 ? 1 : 0, tail: Math.floor(r() * 5), coat: r() < 0.5 ? 1 + Math.floor(r() * 3) : 0 };
  };
  F.fixFashion = function (x) {
    if (!x || typeof x !== 'object' || !Array.isArray(x.like)) return null;
    const like = []; for (let i = 0; i < 8; i++) like.push(num(x.like[i], -1, 1, 0));
    return { like: like, eyes: clamp(x.eyes | 0, 0, 6), pat: clamp(x.pat | 0, 0, 5), star: x.star ? 1 : 0, crest: x.crest ? 1 : 0, shell: x.shell ? 1 : 0, glow: x.glow ? 1 : 0, long: x.long ? 1 : 0, tail: clamp(x.tail | 0, 0, 4), coat: clamp(x.coat | 0, 0, 3) };
  };
  /** the fashion in a few words, for people */
  F.fashionText = function (x) {
    if (!x) return '';
    const out = [];
    for (let i = 0; i < 8; i++) if (x.like[i] > 0.5) out.push(KMANY[i]);
    out.push(['plain skin', 'stripes', 'spots', 'a pale belly', 'rings', 'a saddle'][x.pat]);
    out.push(x.eyes === 1 ? 'one eye' : x.eyes + ' eyes');
    if (x.coat) out.push(COATS[x.coat]); if (x.star) out.push('a star body'); if (x.crest) out.push('a crest'); if (x.shell) out.push('a shell'); if (x.glow) out.push('a glow');
    return out.slice(0, 6).join(', ');
  };
  F.taste = function (f, X, c) {
    c = c || F.counts(f);
    const sat = function (v, k) { return 1 - Math.exp(-v / k); };
    const face = f.en === 0 ? 0 : f.en === 2 ? 1 : f.en <= 4 ? 0.75 : 0.4, big = clamp((f.es - 0.2) / 0.3, 0, 1);
    const lo = Math.min.apply(null, f.prof), hi = Math.max.apply(null, f.prof), shape = f.sym ? 0.8 : sat(hi / lo - 1, 0.5);
    const L = 2 + (f.n - 1) * 0.68 * f.len, asp = f.sym ? 2 : L / (hi * (0.74 + 0.05 * f.n) * 2), prop = asp < 1.1 ? 0.5 : asp < 3.4 ? 1 : Math.max(0, 1 - (asp - 3.4) * 0.5);
    const tidy = c.sites === 0 ? 0.3 : c.sites <= 10 ? 1 : Math.max(0, 1 - (c.sites - 10) * 0.1);
    // the whole body together: a few kinds of growth that suit each other, none of them dwarfing the body they grow from
    let longest = 0; for (let i = 0; i < f.rules.length; i++) if (f.rules[i].k !== 5) longest = Math.max(longest, f.rules[i].l);
    const harmony = (c.kinds <= 3 ? 1 : c.kinds === 4 ? 0.5 : 0.15) * (longest * 1.25 > L * 0.9 + 0.8 ? 0.5 : 1);
    let base = 0.24 * face + 0.1 * big + 0.18 * shape + 0.14 * prop + 0.14 * tidy + 0.14 * harmony + 0.06 * clamp(Math.abs(f.hue2) / 90, 0.4, 1);
    if (f.bd) { const busy = G.body.busy(f), clean = busy < 2.5 ? 0.45 : busy <= 6 + F.room() ? 1 : Math.max(0, 1 - (busy - 6 - F.room()) * 0.22), eyes = f.en === 0 ? 0 : f.en === 2 ? 1 : f.en === 1 ? 0.85 : 0.45; let sig = 0; for (let i = 0; i < f.rules.length; i++) if (f.rules[i].k === 8) sig++; base = 0.2 * eyes + 0.14 * big + 0.42 * clean + 0.08 * (longest > 1.7 ? 0.4 : 1) + 0.08 * clamp(Math.abs(f.hue2) / 90, 0.4, 1) + (sig === 1 || sig === 2 ? 0.08 : 0); }
    if (!X) return base;
    let grow = 0;
    for (let i = 0; i < f.rules.length; i++) grow += f.rules[i].k === 8 ? 0.6 : X.like[f.rules[i].k];      // something never seen before turns heads
    const growths = f.rules.length ? clamp(grow / Math.max(2, f.rules.length), -1, 1) : 0;
    const on = function (v, want) { return (v > 0.25) === !!want ? 1 : 0; };
    const fashion = 0.34 * Math.max(0, growths) + 0.14 * (1 - Math.min(1, Math.abs(f.en - X.eyes) / 2)) + 0.12 * (f.pat === X.pat ? 1 : 0) + 0.12 * (!!f.sym === !!X.star ? 1 : 0)
      + 0.06 * on(f.crest, X.crest) + 0.06 * on(f.shell, X.shell) + 0.06 * on(f.glow, X.glow) + 0.05 * ((f.n >= 5) === !!X.long ? 1 : 0) + 0.05 * (f.sym || f.tk === X.tail ? 1 : 0) + 0.07 * (X.coat && f.coat === X.coat ? 1 : 0);
    return 0.45 * base + 0.55 * fashion;
  };

  // ── names come from what is measured, never from a list of kinds ──
  const HUES = ['Red', 'Amber', 'Golden', 'Lime', 'Green', 'Jade', 'Teal', 'Azure', 'Blue', 'Violet', 'Purple', 'Rose'];
  /** { adj, feat, noun, kind ('Finned Darter'), full ('Striped Finned Darter') } */
  F.kind = function (f) {
    const c = F.counts(f), a = F.abilities(f, c);
    const adj = f.coat ? ['', 'Scaled', 'Furry', 'Feathered'][f.coat] : f.pat ? ['', 'Striped', 'Spotted', 'Pale', 'Ringed', 'Saddled'][f.pat] : f.glow > 0.3 ? 'Glowing' : f.venom > 0.3 ? 'Venomous' : HUES[Math.floor(((f.hue + 15) % 360) / 30)];
    const FE = [c.pincer ? 'Clawed' : c.fingers ? 'Handed' : 'Legged', 'Finned', 'Spiny', 'Tentacled', 'Feelered', 'Plated', 'Frilled', 'Horned', c.dAdj || 'Strange'];
    let feat = '', bv = 1.2;
    for (let i = 0; i < 9; i++) if (c.k[i] > bv) { bv = c.k[i]; feat = FE[i]; }
    if (!feat && f.en >= 3) feat = 'Many-Eyed'; if (!feat && f.shell > 0.25) feat = 'Shelled'; if (!feat && f.crest > 0.25) feat = 'Crested'; if (!feat && f.nk > 0.35 && f.n > 1 && !f.sym) feat = 'Long-Necked'; if (!feat && f.hd > 1.45) feat = 'Big-Headed'; if (!feat && f.n >= 5 && !f.bd) feat = 'Long';
    if (!feat && f.bd) { const bm = G.body.measure(f); feat = bm.hollow ? 'Ringed' : bm.pairs ? 'Twin' : bm.lobed ? 'Lobed' : bm.stalks ? 'Stalked' : bm.cls === 'T' && bm.n > 1 ? 'Tall' : bm.cls === 'W' && bm.n > 1 ? 'Wide' : ''; }
    // what it is best at, compared with what any body gets for free
    const BASE = { speed: 0.42, agility: 0.3, reach: 0.5, senses: 0.35, armour: 0.22, attack: 0.3 };
    let top = 'speed'; for (let i = 0; i < 6; i++) if (a[ABIL[i]] - BASE[ABIL[i]] > a[top] - BASE[top]) top = ABIL[i];
    const noun = f.sym ? (f.sym <= 5 ? 'Star' : 'Bloom') : (f.n === 1 && !f.rules.length) ? 'Cell' : (f.n <= 2 && c.sites <= 2 && !f.en) ? 'Blob' : { speed: 'Darter', agility: 'Dancer', reach: 'Grabber', senses: 'Watcher', armour: 'Shellback', attack: 'Hunter' }[top];
    const kind = (feat ? feat + ' ' : '') + (c.plan && !f.sym ? c.plan.noun : noun);
    return { adj: adj, feat: feat, noun: noun, kind: kind, full: adj + ' ' + kind };
  };
  /** the body in short facts, for the inspector, the story and the judge */
  F.facts = function (f) {
    const c = F.counts(f), t = [];
    if (f.bd) { const w = G.body.words(f); for (let i = 0; i < w.length; i++) t.push(w[i]); }
    else t.push(f.sym ? 'a star-shaped body with ' + f.sym + ' arms' : f.n === 1 ? 'a single round cell' : 'a body of ' + f.n + ' segments');
    const seen = {};
    for (let i = 0; i < f.rules.length; i++) { const q = f.rules[i], sk = q.k === 8 ? 'd' + q.t : q.k; if (seen[sk]) continue; seen[sk] = 1; if (q.k === 8) { const d = dsgOf(q); if (d && d.place === 'wrap') { t.push('wearing a ' + d.name.toLowerCase() + ' it grew'); continue; } if (d) t.push((d.place === 'back' ? 'a ' : 'a pair of ') + d.name.toLowerCase() + (d.place === 'back' ? ' on its back' : d.place === 'head' ? 's on its head' : 's')); continue; } t.push(q.k === 0 && q.t ? 'legs ending in ' + ['', 'fingers', 'pincers', 'paddles'][q.t] : (q.l > 1.4 ? 'long ' : '') + KMANY[q.k]); }
    t.push(f.en === 0 ? 'no eyes' : f.en === 1 ? 'one ' + (f.es > 0.45 ? 'big ' : '') + 'eye' : f.en + (f.ek > 0.25 ? ' eyes on stalks' : f.es > 0.45 ? ' big eyes' : ' eyes'));
    if (f.mk) t.push(['', 'a beak', 'toothed jaws', 'a sucker mouth', 'whiskers'][f.mk]);
    if (f.tk && !f.sym && f.n > 1) t.push(['', 'a fan tail', 'a forked tail', 'a whip tail', 'a club tail'][f.tk]);
    if (c.plan && !f.sym) t.unshift('the shape of the ' + c.plan.name.toLowerCase());
    if (f.nk > 0.35 && f.n > 1 && !f.sym) t.push('a head set on a neck'); if (f.hd > 1.45) t.push('a big head'); if (f.coat) t.push('a coat of ' + COATS[f.coat]);
    if (c.nested) t.push('parts growing on parts');
    if (f.shell > 0.25) t.push('a shell'); if (f.crest > 0.25) t.push('a crest along its back'); if (f.glow > 0.3) t.push('glowing lights'); if (f.venom > 0.3) t.push('poison glands');
    t.push(HUES[Math.floor(((f.hue + 15) % 360) / 30)].toLowerCase() + ' with ' + HUES[Math.floor(((f.hue + f.hue2 + 735) % 360) / 30)].toLowerCase() + (f.pat ? ' ' + PATTERNS[f.pat] : ' trim'));
    return t;
  };
  /** what changed between two bodies, as short lines: [text, isGain] */
  F.diff = function (a, b) {
    const out = [], push = function (t, good) { out.push([t, good]); };
    if (!!a.sym !== !!b.sym) push(b.sym ? 'a new body plan: a star with ' + b.sym + ' arms' : 'a new body plan: a head and a tail', true);
    else if (a.sym !== b.sym) push('arms: ' + a.sym + ' → ' + b.sym, b.sym > a.sym);
    if (a.n !== b.n) push('body: ' + a.n + ' → ' + b.n + (a.bd && b.bd ? ' parts' : ' segments'), b.n > a.n);
    if (a.bd && b.bd) { if (a.bd.v !== b.bd.v) push(b.bd.v ? 'now holds itself sideways on' : 'now faces you, two matching sides', true); const ma = G.body.measure(a), mb = G.body.measure(b); if (ma.pairs !== mb.pairs) push(mb.pairs > ma.pairs ? 'a part doubled into a pair' : 'a pair became one', mb.pairs > ma.pairs); if (ma.hollow !== mb.hollow) push(mb.hollow > ma.hollow ? 'a part opened into a ring' : 'its ring closed', mb.hollow > ma.hollow); if (ma.lobed !== mb.lobed) push(mb.lobed > ma.lobed ? 'its outline grew lobes' : 'its lobes smoothed away', mb.lobed > ma.lobed); if (a.bd.e !== b.bd.e) push('its face moved', true); }
    const ca = F.counts(a).k, cb = F.counts(b).k;
    const dn = function (f) { const o = {}; for (let i = 0; i < f.rules.length; i++) { const d = dsgOf(f.rules[i]); if (d) o[d.name] = 1; } return o; }, da = dn(a), db = dn(b);
    for (const x in db) if (!da[x]) push('grew a new kind of part: ' + x, true);
    for (const x in da) if (!db[x]) push('lost its ' + x.toLowerCase(), false);
    for (let i = 0; i < 8; i++) { if (!ca[i] && cb[i]) push('grew ' + KMANY[i], true); else if (ca[i] && !cb[i]) push('lost its ' + KMANY[i], false); else if (cb[i] > ca[i] * 1.5 + 0.5) push('more and longer ' + KMANY[i], true); }
    if (a.en !== b.en) push('eyes: ' + a.en + ' → ' + b.en, b.en > a.en);
    if (a.mk !== b.mk) push(['its mouth became a plain opening', 'grew a beak', 'grew jaws', 'its mouth became a sucker', 'grew whiskers'][b.mk], b.mk > 0);
    if (a.tk !== b.tk) push(['lost its tail', 'grew a fan tail', 'grew a forked tail', 'grew a whip tail', 'grew a club tail'][b.tk], b.tk > 0);
    if (a.pat !== b.pat) push('skin turned ' + ['plain', 'striped', 'spotted', 'pale-bellied', 'ringed', 'saddled'][b.pat], true);
    if ((a.pl | 0) !== (b.pl | 0)) { const p = b.pl && G.planOf ? G.planOf(b.pl) : null; if (p) push('its body took a new shape: the ' + p.name.toLowerCase(), true); }
    if (a.coat !== b.coat) push(b.coat ? 'grew a coat of ' + COATS[b.coat] : 'lost its coat', !!b.coat);
    if ((a.nk > 0.35) !== (b.nk > 0.35)) push(b.nk > 0.35 ? 'its head is now set on a neck' : 'lost its neck', b.nk > 0.35);
    if ((a.hd > 1.45) !== (b.hd > 1.45)) push(b.hd > 1.45 ? 'grew a big head' : 'its head shrank', b.hd > 1.45);
    const na = F.counts(a).nested, nb = F.counts(b).nested; if (nb > na) push('a part now grows on a part', true);
    const tog = function (k, name) { if ((a[k] > 0.25) !== (b[k] > 0.25)) push(b[k] > 0.25 ? 'grew ' + name : 'lost its ' + name, b[k] > 0.25); };
    tog('shell', 'a shell'); tog('crest', 'a crest'); tog('glow', 'a glow'); tog('venom', 'poison glands');
    let dh = Math.abs(a.hue - b.hue); if (dh > 180) dh = 360 - dh;
    if (dh > 45) push('changed colour', true);
    return out;
  };
  /** numbers that tell bodies apart, for sorting creatures into species */
  F.features = function (f) {
    const v = [f.n * 0.3, f.sym ? 1.6 : 0];
    const cnt = [0, 0, 0, 0, 0, 0, 0, 0, 0];
    for (let i = 0; i < f.rules.length; i++) cnt[f.rules[i].k]++;
    for (let i = 0; i < 9; i++) v.push(Math.min(2, cnt[i]) * (i === 8 ? 0.9 : 0.65));
    v.push(f.en * 0.28);
    for (let i = 1; i < 5; i++) v.push(f.mk === i ? 0.6 : 0);
    for (let i = 1; i < 5; i++) v.push(f.tk === i ? 0.5 : 0);
    for (let i = 1; i < 6; i++) v.push(f.pat === i ? 0.5 : 0);
    const hr = f.hue * Math.PI / 180;
    v.push(Math.cos(hr) * 0.6, Math.sin(hr) * 0.6, f.shell > 0.25 ? 0.6 : 0, f.crest > 0.25 ? 0.5 : 0, f.glow > 0.3 ? 0.6 : 0, f.venom > 0.3 ? 0.6 : 0);
    for (let i = 1; i < 4; i++) v.push(f.coat === i ? 0.7 : 0);
    v.push(f.nk * 0.9, (f.hd - 1) * 0.8, (f.hx - 1) * 0.7, (f.hq - 2) * 0.25, f.pl ? 1.3 : 0, f.pl ? ((f.pl * 37) % 11) / 11 : 0);
    let nest = 0; for (let i = 0; i < f.rules.length; i++) if (f.rules[i].on >= 0) nest++;
    v.push(Math.min(2, nest) * 0.5);
    if (f.bd) { const bm = G.body.measure(f), R = f.bd.m[0].r; v.push(f.bd.v ? 0.9 : 0, Math.min(2, bm.pairs) * 0.55, bm.hollow ? 0.6 : 0, bm.cls === 'T' ? 0.6 : bm.cls === 'W' ? -0.6 : 0, bm.lobed ? 0.5 : 0, (R[0] - 1) * 0.9, (R[2] - 1) * 0.9, (R[4] - 1) * 0.9, (R[6] - 1) * 0.9, (R[8] - 1) * 0.9); }
    return v;
  };
  /** everything the eye can tell two bodies apart by, as numbers: about 1 apart is clearly a different look. It says which creatures LOOK alike when the
   *  god's marks are spread from the ones it saw to the rest (sorting into species is F.features, which also counts what cannot be seen) */
  F.lookVec = function (f) {
    const v = [f.n * 0.3], cnt = [0, 0, 0, 0, 0, 0, 0, 0, 0], len = [0, 0, 0, 0, 0, 0, 0, 0, 0];
    for (let i = 0; i < f.rules.length; i++) { const q = f.rules[i]; cnt[q.k]++; len[q.k] = Math.max(len[q.k], q.l * (0.6 + q.w)); }
    for (let i = 0; i < 9; i++) v.push(Math.min(2, cnt[i]) * 0.6, len[i] * 0.3);
    const ne = f.en ? 1 : 0;
    v.push(f.en * 0.35, ne * (f.es - 0.34) * 2.2, ne * (f.eg - 0.5) * 1.6, ne * (f.ey - 0.1) * 1.6, ne * (f.ep - 0.5) * 1.4, f.ek * 0.5, f.sm * 0.5, f.bl * 0.4, (f.hd - 1) * 0.8);
    for (let i = 1; i < 5; i++) v.push(f.mk === i ? 0.5 : 0);
    for (let i = 1; i < 5; i++) v.push(f.tk === i ? 0.5 : 0);
    for (let i = 1; i < 6; i++) v.push(f.pat === i ? 0.5 : 0);
    for (let i = 1; i < 4; i++) v.push(f.coat === i ? 0.6 : 0);
    for (let i = 1; i < 5; i++) v.push(f.cl === i ? 0.4 : 0);
    const hr = f.hue * Math.PI / 180, h2 = (f.hue + f.hue2) * Math.PI / 180;
    F.LV_COL = v.length;      // the six entries from here are colour
    v.push(Math.cos(hr) * 0.6, Math.sin(hr) * 0.6, Math.cos(h2) * 0.3, Math.sin(h2) * 0.3, (f.sat - 70) / 40, (f.lit - 62) / 25, f.shell > 0.25 ? 0.6 : 0, f.crest > 0.25 ? 0.5 : 0, f.glow > 0.3 ? 0.5 : 0);
    v.push((f.ll - 1) * 1.2, (f.lw - 1) * 1.2, (f.hs - 1) * 0.8, (f.st || 0) * 1.2);
    v.push(ne * ((f.ex || 1) - 1) * 1.6, ne * (f.et || 0) * 1.5, ne * (f.el || 0) * 1.3, (f.bw === undefined ? 0.35 : f.bw) * 0.5, (f.ba === undefined ? 0.1 : f.ba) * 0.7, (f.sn || 0) * 0.9, (f.nz | 0) === 1 ? 0.4 : 0, (f.nz | 0) === 2 ? 0.4 : 0, (f.nz | 0) === 3 ? 0.4 : 0);
    { let jn = 0, un = 0, nl = 0; for (let i = 0; i < f.rules.length; i++) { const q = f.rules[i]; if (q.k !== 0) continue; nl++; jn += q.j; un += (q.c || 0); } v.push(nl ? jn / nl * 0.3 : 0, nl ? un / nl * 0.5 : 0); }
    const M = f.bd ? f.bd.m : [];
    v.push(f.bd && f.bd.v ? 0.9 : 0, f.bd ? f.bd.e * 0.4 : 0, Math.max(0, M.length - 4) * 0.5);
    for (let i = 0; i < 4; i++) { const q = M[i]; if (!q) { v.push(0, 0, 0, 0, 0, 0, 0); continue; } v.push(0.5, q.s * 0.8, q.pr ? 0.5 : 0, q.h ? 0.5 : 0, (q.r[0] + q.r[5] - 2) * 0.6, (q.r[2] + q.r[3] - 2) * 0.6, (q.r[7] + q.r[8] - 2) * 0.6 + (q.lb && q.la > 0.1 ? 0.5 : 0)); }
    return v;
  };
  const r2 = function (x) { return Math.round(x * 100) / 100; };
  F.pack = function (f) {
    return [f.sym, f.n, r2(f.len), f.prof.map(r2), r2(f.bend), f.rules.map(function (q) { return [q.k, q.a, q.b, q.e, r2(q.l), r2(q.w), q.j, r2(q.g), r2(q.c), q.t, r2(q.p), q.on === undefined ? -1 : q.on, r2(q.u === undefined ? 0.5 : q.u), r2(q.f || 1)]; }),
      f.en, r2(f.es), r2(f.ek), f.mk, r2(f.ms), f.tk, r2(f.ts), Math.round(f.hue), Math.round(f.hue2), Math.round(f.sat), Math.round(f.lit), f.pat, r2(f.psc), r2(f.crest), r2(f.shell), r2(f.glow), r2(f.venom), f.seed, r2(f.hd), r2(f.nk), f.coat, r2(f.hx), r2(f.hq), f.pl | 0, f.bd ? G.body.pack(f.bd) : 0, r2(f.eg), r2(f.ey), r2(f.ep), r2(f.bl), r2(f.sm), r2(f.ll), r2(f.lw), r2(f.hs), r2(f.st), f.cl | 0, r2(f.ex || 1), r2(f.et || 0), r2(f.el || 0), r2(f.bw === undefined ? 0.35 : f.bw), r2(f.ba === undefined ? 0.1 : f.ba), r2(f.sn || 0), f.nz | 0];
  };
  F.unpack = function (a) {
    if (!Array.isArray(a) || a.length < 24) return null;
    return F.fix({ sym: a[0], n: a[1], len: a[2], prof: Array.isArray(a[3]) ? a[3].map(Number) : null, bend: a[4],
      rules: (Array.isArray(a[5]) ? a[5] : []).map(function (q) { return { k: q[0], a: q[1], b: q[2], e: q[3], l: q[4], w: q[5], j: q[6], g: q[7], c: q[8], t: q[9], p: q[10], on: q[11] === undefined ? -1 : q[11], u: q[12], f: q[13] }; }),
      en: a[6], es: a[7], ek: a[8], mk: a[9], ms: a[10], tk: a[11], ts: a[12], hue: a[13], hue2: a[14], sat: a[15], lit: a[16], pat: a[17], psc: a[18], crest: a[19], shell: a[20], glow: a[21], venom: a[22], seed: a[23], hd: a[24], nk: a[25], coat: a[26], hx: a[27], hq: a[28], pl: a[29], bd: G.body.unpack(a[30]) || undefined, eg: a[31], ey: a[32], ep: a[33], bl: a[34], sm: a[35], ll: a[36], lw: a[37], hs: a[38], st: a[39], cl: a[40], ex: a[41], et: a[42], el: a[43], bw: a[44], ba: a[45], sn: a[46], nz: a[47] });
  };
  F.key = function (f) { return f._k || (f._k = JSON.stringify(F.pack(f))); };

  // ── growing the body: the spine, its outline, and where things attach ──
  // how much of the body's length is head: less of it as the body grows longer
  const headSpan = function (f) { return clamp(1.6 / (f.n + 1), 0.12, 0.3); };
  function profAt(f, u) {
    const x = clamp(u, 0, 0.9999) * 4, i = Math.floor(x); let t = x - i; t = t * t * (3 - 2 * t);
    let w = lerp(f.prof[i], f.prof[i + 1], t);
    if (!f.sym && f.n > 1) {
      const hs = headSpan(f);
      if (u < hs) { let v = u / hs; v = v * v * (3 - 2 * v); w *= lerp(f.hd * 1.14, 1, v * v); }
      const d = (u - hs - 0.02) / 0.06; w *= 1 - f.nk * Math.exp(-d * d);
    }
    return w;
  }
  // m: how hard it is swimming (0 resting .. 1 flat out)
  F.skeleton = function (f, t, m) {
    const n = f.n;
    m = m || 0;
    if (f.sym) {                                                    // a star: arms around a disc
      const k = f.sym, R0 = U * (1.05 + 0.1 * n) * (0.7 + 0.3 * f.prof[2]), lobe = clamp((f.prof[1] - f.prof[3]) * 0.3, -0.22, 0.22), pulse = m < 0 ? 1 : 1 + Math.sin(t * (2.5 + 2.5 * m)) * (0.03 + 0.05 * m);
      const out = []; for (let i = 0; i < 48; i++) { const th = i / 48 * TAU, rr = R0 * pulse * (1 + lobe * Math.cos(k * th)); out.push({ x: Math.cos(th) * rr, y: Math.sin(th) * rr }); }
      const arms = []; for (let j = 0; j < k; j++) for (let h = 0; h < 2; h++) { const th = (j + h * 0.5) / k * TAU + (m < 0 ? 0 : Math.sin(t * 1.7 + j * 1.3) * 0.07); arms.push({ x: 0, y: 0, nx: Math.cos(th), ny: Math.sin(th), dx: -Math.sin(th), dy: Math.cos(th), r: R0 * (1 + lobe * (h ? -1 : 1)), half: h }); }
      return { star: true, out: out, arms: arms, R0: R0, ext: R0 * 1.2 };
    }
    const L = U * (2 + (n - 1) * 0.68 * f.len), hw = U * (0.74 + 0.05 * n) * F.plump(f), M = 10 + n * 3, S = [];
    for (let i = 0; i <= M; i++) {
      const u = i / M, cap = Math.sqrt(1 - Math.pow(Math.abs(2 * u - 1), 3.2));
      S.push({ u: u, x: L / 2 - u * L, y: f.bend * L * 0.3 * Math.sin(u * Math.PI) + (n > 1 && m >= 0 ? Math.sin(t * (3 + 4 * m) - u * 4) * L * (0.018 + 0.05 * m) * u : 0), r: Math.max(profAt(f, u) * hw, L / 13) * cap });
    }
    for (let i = 0; i <= M; i++) { const a = S[Math.max(0, i - 1)], b = S[Math.min(M, i + 1)]; const dx = a.x - b.x, dy = a.y - b.y, d = Math.hypot(dx, dy) || 1; S[i].dx = dx / d; S[i].dy = dy / d; S[i].nx = -dy / d; S[i].ny = dx / d; }
    const out = []; for (let i = 0; i <= M; i++) out.push({ x: S[i].x + S[i].nx * S[i].r, y: S[i].y + S[i].ny * S[i].r }); for (let i = M - 1; i > 0; i--) out.push({ x: S[i].x - S[i].nx * S[i].r, y: S[i].y - S[i].ny * S[i].r });
    let rmax = 1; for (let i = 0; i <= M; i++) if (S[i].r > rmax) rmax = S[i].r;
    for (let i = 0; i <= M; i++) S[i].gr = clamp(0.35 + 0.65 * S[i].r / rmax, 0.5, 1);
    const sites = []; for (let k = 0; k < n; k++) sites.push(S[Math.round((k + 0.5) / n * M)]);
    return { star: false, out: out, S: S, sites: sites, L: L, hw: hw, M: M, head: S[Math.max(1, Math.round(M * headSpan(f) * 0.55))], nose: S[0], ext: L / 2 + U * 0.4 };
  };
  /** how much a long body is widened so that it never becomes a rod: at least a fifth as wide as it is long */
  F.plump = function (f) { if (f.sym) return 1; const L = 2 + (f.n - 1) * 0.68 * f.len, w = (0.74 + 0.05 * f.n) * Math.max.apply(null, f.prof) * 2; return Math.max(1, L / 4.6 / w); };
  /** how big the body is, in form units: half its length, and how far anything sticks out from the centre */
  F.extent = function (f) {
    let out = 0; const RO = []; for (let i = 0; i < f.rules.length; i++) { const q = f.rules[i]; RO[i] = (q.on >= 0 ? RO[q.on] || 0 : 0) + (q.k === 5 ? 0 : q.l * U * (q.k === 3 ? 1.6 : 1.3)); out = Math.max(out, RO[i]); }
    const half = f.sym ? U * (1.05 + 0.1 * f.n) * (0.7 + 0.3 * f.prof[2]) * 1.2 : U * (2 + (f.n - 1) * 0.68 * f.len) / 2 + U * 0.4;
    const wide = f.sym ? half : U * (0.74 + 0.05 * f.n) * F.plump(f) * Math.max.apply(null, f.prof);
    const tail = !f.sym && f.tk && f.n > 1 ? f.ts * U * (f.tk === 3 ? 2.6 : 1.8) : 0;
    return { half: half, wide: wide, all: Math.max(half + Math.max(tail, f.sym ? out : out * 0.6), wide + out + (f.ek > 0.25 ? f.ek * U : 0)) + 6 };
  };
  /** the area of the body, in square form units */
  F.area = function (f) {
    if (f.sym) { const R0 = U * (1.05 + 0.1 * f.n) * (0.7 + 0.3 * f.prof[2]); return Math.PI * R0 * R0; }
    let avg = 0; for (let i = 0; i < 5; i++) avg += f.prof[i];
    return U * (2 + (f.n - 1) * 0.68 * f.len) * 2 * U * (0.74 + 0.05 * f.n) * F.plump(f) * (avg / 5) * 0.8;
  };

  // ── drawing ──
  function trace(ctx, out) {
    const m = out.length; ctx.beginPath(); ctx.moveTo((out[m - 1].x + out[0].x) / 2, (out[m - 1].y + out[0].y) / 2);
    for (let i = 0; i < m; i++) { const p = out[i], q = out[(i + 1) % m]; ctx.quadraticCurveTo(p.x, p.y, (p.x + q.x) / 2, (p.y + q.y) / 2); }
    ctx.closePath();
  }
  function inked(ctx, fill, lw) { ctx.fillStyle = fill; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = (lw || 2.2) * 0.85; ctx.lineJoin = 'round'; ctx.stroke(); }
  // one rule, drawn wherever it applies
  // m: how hard it swims; alarm: how frightened it is (spikes bristle, frills flare)
  // how a part of the pond's own invention moves
  function dmove(d, t, idx, m, al, off) {
    if (!d) return 0;
    return d.motion === 'flap' ? Math.sin(t * (4 + 6 * m) + idx) * (0.16 + 0.32 * m) : d.motion === 'sway' ? Math.sin(t * 2.2 + idx * 1.7 + off * 0.3) * 0.2 : d.motion === 'bristle' ? -al * 0.35 + Math.sin(t * 3 + idx) * 0.04 : 0;
  }
  // its shape: an outline from where it joins the body (x 0) to its tip (x 1), ribs, and dots; in the animal's own colours
  function drawDesign(ctx, d, bx, by, ang, len, w, col, side) {
    if (!d.pts) return;                          // something worn, not grown outward: the character painter draws those
    const c = Math.cos(ang), s = Math.sin(ang), L = len * 1.05, Wd = len * (0.7 + 0.9 * w) * side;
    const X = function (x, y) { return bx + c * x * L - s * y * Wd; }, Y = function (x, y) { return by + s * x * L + c * y * Wd; };
    const P = [[0, -0.07]].concat(d.pts, [[0, 0.07]]), n = P.length;
    ctx.beginPath();
    if (d.smooth) { ctx.moveTo(X(P[0][0], P[0][1]), Y(P[0][0], P[0][1])); for (let i = 1; i < n - 1; i++) { const p = P[i], q = P[i + 1], mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2; ctx.quadraticCurveTo(X(p[0], p[1]), Y(p[0], p[1]), i === n - 2 ? X(q[0], q[1]) : X(mx, my), i === n - 2 ? Y(q[0], q[1]) : Y(mx, my)); } }
    else { ctx.moveTo(X(P[0][0], P[0][1]), Y(P[0][0], P[0][1])); for (let i = 1; i < n; i++) ctx.lineTo(X(P[i][0], P[i][1]), Y(P[i][0], P[i][1])); }
    ctx.closePath();
    const wornP = d.place === 'top' || d.place === 'face' || d.place === 'held';
    let fill = d.colour === 'body' ? col.body : d.colour === 'pale' ? '#f4f7fb' : d.colour === 'dark' ? col.dark : d.colour === 'glow' ? col.glow : col.fin;
    if (wornP && d.colour !== 'body' && d.colour !== 'glow') { let th = d.tint; if (!(th >= 0)) { th = 0; const nm = String(d.name || ''); for (let i = 0; i < nm.length; i++) th = (th * 31 + nm.charCodeAt(i)) % 360; } fill = 'hsl(' + Math.round(th) + ',' + (d.colour === 'pale' ? 50 : d.colour === 'dark' ? 45 : 74) + '%,' + (d.colour === 'pale' ? 80 : d.colour === 'dark' ? 32 : 58) + '%)'; }
    inked(ctx, fill, wornP ? 2.6 : 2.2);
    if (wornP) { ctx.save(); ctx.clip(); ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.beginPath(); ctx.ellipse(X(0.6, -0.2), Y(0.6, -0.2), Math.abs(len) * 0.36, Math.abs(len) * 0.15, ang, 0, TAU); ctx.fill(); ctx.fillStyle = 'rgba(7,18,31,0.14)'; ctx.beginPath(); ctx.ellipse(X(0.3, 0.3), Y(0.3, 0.3), Math.abs(len) * 0.5, Math.abs(len) * 0.16, ang, 0, TAU); ctx.fill(); ctx.restore(); }
    ctx.strokeStyle = 'rgba(7,18,31,0.4)'; ctx.lineWidth = 1.3;
    for (let i = 0; i < d.ribs.length; i++) { const q = d.ribs[i]; ctx.beginPath(); ctx.moveTo(X(q[0], q[1]), Y(q[0], q[1])); ctx.lineTo(X(q[2], q[3]), Y(q[2], q[3])); ctx.stroke(); }
    for (let i = 0; i < d.dots.length; i++) { const q = d.dots[i], inner = i > 0 && q[2] < d.dots[0][2] * 0.7 && Math.abs(q[0] - d.dots[0][0]) < 0.12; ctx.beginPath(); ctx.arc(X(q[0], q[1]), Y(q[0], q[1]), q[2] * len, 0, TAU); if (inner) { ctx.fillStyle = INK; ctx.fill(); } else inked(ctx, d.colour === 'glow' || d.colour === 'body' ? col.glow : '#fff', 2); }
  }
  function appendage(ctx, q, p, side, col, t, idx, m, alarm) {
    const bx = p.x + p.nx * p.r * 0.8 * side, by = p.y + p.ny * p.r * 0.8 * side;
    const gait = Math.sin(t * (5 + 5 * m) + idx * 3.1416 + (side > 0 ? 0 : 3.1416));      // legs step in turn, left against right
    const move = q.k === 8 ? dmove(dsgOf(q), t, idx, m, alarm, side > 0 ? 0 : 3.1416) * side : q.k === 0 ? gait * (0.12 + 0.4 * m) * side : q.k === 1 ? Math.sin(t * (4 + 6 * m) + idx) * (0.14 + 0.3 * m) * side : q.k === 4 ? Math.sin(t * 2.2 + idx * 1.7) * 0.2 * side
      : (q.k === 2 || q.k === 7) ? -alarm * 0.3 * side * (q.g > 0 ? 1 : -1) : Math.sin(t * 3 + idx) * 0.08 * side;
    const ang = Math.atan2(p.ny * side, p.nx * side) + q.g * side + move;
    const gr = p.gr || 1;
    const len = q.l * U * 1.25 * gr * (q.k === 2 || q.k === 7 ? 1 + 0.3 * alarm : 1), w0 = q.w * U * 0.75 * gr, c = Math.cos(ang), s = Math.sin(ang), px = -s, py = c;
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    if (q.k === 8) { const d = dsgOf(q); if (d) drawDesign(ctx, d, bx, by, ang, len, q.w, col, side); return; }
    if (q.k === 2) { ctx.beginPath(); ctx.moveTo(bx + px * w0 * 0.6, by + py * w0 * 0.6); ctx.lineTo(bx + c * len * 0.75, by + s * len * 0.75); ctx.lineTo(bx - px * w0 * 0.6, by - py * w0 * 0.6); ctx.closePath(); inked(ctx, '#f4f7fb'); return; }
    if (q.k === 7) {                                             // a thick curved horn
      const k = q.c * side * len * 0.5, tx = bx + c * len * 0.9 + px * k, ty = by + s * len * 0.9 + py * k;
      ctx.beginPath(); ctx.moveTo(bx + px * w0 * 0.8, by + py * w0 * 0.8); ctx.quadraticCurveTo(bx + c * len * 0.5 + px * (w0 * 0.5 + k * 0.2), by + s * len * 0.5 + py * (w0 * 0.5 + k * 0.2), tx, ty); ctx.quadraticCurveTo(bx + c * len * 0.45 - px * (w0 * 0.5 - k * 0.2), by + s * len * 0.45 - py * (w0 * 0.5 - k * 0.2), bx - px * w0 * 0.8, by - py * w0 * 0.8); ctx.closePath(); inked(ctx, '#ffe9b8'); return;
    }
    if (q.k === 1) {                                             // a fin: a membrane with rays
      const sweep = 0.5 * side, tx = bx + Math.cos(ang + sweep) * len * 1.1, ty = by + Math.sin(ang + sweep) * len * 1.1, bw = w0 * 1.5;
      ctx.beginPath(); ctx.moveTo(bx + p.dx * bw, by + p.dy * bw); ctx.quadraticCurveTo(bx + c * len * 0.8 + p.dx * bw, by + s * len * 0.8 + p.dy * bw, tx, ty); ctx.quadraticCurveTo(bx + c * len * 0.35 - p.dx * bw * 0.4, by + s * len * 0.35 - p.dy * bw * 0.4, bx - p.dx * bw, by - p.dy * bw); ctx.closePath(); inked(ctx, col.fin);
      ctx.strokeStyle = 'rgba(7,18,31,0.35)'; ctx.lineWidth = 1.2; for (let k = 1; k <= 3; k++) { const f = k / 4; ctx.beginPath(); ctx.moveTo(bx + p.dx * bw * (1 - 2 * f), by + p.dy * bw * (1 - 2 * f)); ctx.lineTo(lerp(bx + c * len * 0.7, tx, f), lerp(by + s * len * 0.7, ty, f)); ctx.stroke(); }
      return;
    }
    if (q.k === 6) {                                             // a frill: a fan
      const spread = (0.5 + q.w * 0.7) * (1 + 0.12 * Math.sin(t * 3 + idx) + 0.35 * alarm); ctx.beginPath(); ctx.moveTo(bx, by);
      for (let k = 0; k <= 8; k++) { const a = ang - spread + k / 8 * spread * 2, rr = len * 0.85 * (k % 2 ? 0.82 : 1); ctx.lineTo(bx + Math.cos(a) * rr, by + Math.sin(a) * rr); }
      ctx.closePath(); inked(ctx, col.frill);
      ctx.strokeStyle = 'rgba(7,18,31,0.4)'; ctx.lineWidth = 1.2; for (let k = 0; k <= 8; k += 2) { const a = ang - spread + k / 8 * spread * 2; ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + Math.cos(a) * len * 0.85, by + Math.sin(a) * len * 0.85); ctx.stroke(); }
      return;
    }
    // legs, tentacles and feelers: jointed, tapering chains
    const joints = q.k === 3 ? 7 : q.k === 4 ? 3 : q.j, seg = len * (q.k === 3 ? 1.3 : 1) / joints;
    const cx = [bx], cy = [by]; let a = ang;
    for (let j = 0; j < joints; j++) {
      a += q.k === 3 ? (q.c * 0.25 + Math.sin(t * (3 + 3 * m) - j * 0.9 + idx) * (0.2 + 0.3 * m)) * side : q.k === 4 ? q.c * side * 0.3 : q.c * (1 + 0.35 * gait) * side * (j % 2 ? -0.9 : 0.9);
      cx.push(cx[j] + Math.cos(a) * seg); cy.push(cy[j] + Math.sin(a) * seg);
    }
    const thick = q.k === 4 ? 2.4 : w0 * (q.k === 3 ? 0.9 : 1.3);
    // one smooth, tapering curve through the joints (no elbows), outlined and then filled
    const sx = [cx[0]], sy = [cy[0]];
    for (let j = 0; j < joints; j++) {
      const ax = j === 0 ? cx[0] : (cx[j - 1] + cx[j]) / 2, ay = j === 0 ? cy[0] : (cy[j - 1] + cy[j]) / 2, bx2 = j === joints - 1 ? cx[joints] : (cx[j] + cx[j + 1]) / 2, by2 = j === joints - 1 ? cy[joints] : (cy[j] + cy[j + 1]) / 2;
      const mx0 = j === 0 ? cx[0] : ax, my0 = j === 0 ? cy[0] : ay;
      for (let u = 1; u <= 5; u++) { const v = u / 5, w1 = (1 - v) * (1 - v), w2 = 2 * (1 - v) * v, w3 = v * v; sx.push(w1 * mx0 + w2 * cx[j] + w3 * bx2); sy.push(w1 * my0 + w2 * cy[j] + w3 * by2); }
    }
    const ns = sx.length - 1;
    for (let pass = 0; pass < 2; pass++) for (let j = 0; j < ns; j++) {
      const u = j / ns, wj = Math.max(1.8, thick * (1 - q.p * u) * (q.k === 3 ? 1 - 0.6 * u : 1));
      ctx.strokeStyle = pass ? col.limb : INK; ctx.lineWidth = pass ? wj : wj + 3.6;
      ctx.beginPath(); ctx.moveTo(sx[j], sy[j]); ctx.lineTo(sx[j + 1], sy[j + 1]); ctx.stroke();
    }
    const ex = cx[joints], ey = cy[joints];
    if (q.k === 4) { ctx.beginPath(); ctx.arc(ex, ey, 4.2, 0, TAU); inked(ctx, col.glow, 2); }
    else if (q.k === 0 && q.t === 1) for (let f = 0; f < 3; f++) { const fa = a + (f - 1) * 0.55; ctx.strokeStyle = INK; ctx.lineWidth = 5.4; ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(ex + Math.cos(fa) * 8, ey + Math.sin(fa) * 8); ctx.stroke(); ctx.strokeStyle = col.limb; ctx.lineWidth = 2.6; ctx.stroke(); }
    else if (q.k === 0 && q.t === 2) for (let f = -1; f <= 1; f += 2) { ctx.beginPath(); ctx.moveTo(ex, ey); ctx.quadraticCurveTo(ex + Math.cos(a + f * 0.9) * 11, ey + Math.sin(a + f * 0.9) * 11, ex + Math.cos(a + f * 0.15) * 15, ey + Math.sin(a + f * 0.15) * 15); ctx.quadraticCurveTo(ex + Math.cos(a + f * 0.4) * 6, ey + Math.sin(a + f * 0.4) * 6, ex, ey); inked(ctx, '#ff8a6b', 2); }
    else if (q.k === 0 && q.t === 3) { ctx.beginPath(); ctx.ellipse(ex + Math.cos(a) * 6, ey + Math.sin(a) * 6, 9, 5.5, a, 0, TAU); inked(ctx, col.fin, 2); }
    return { x: ex, y: ey, a: a };
  }
  // a growth, and everything that grows from its tip
  function limb(ctx, f, qi, p, side, col, t, idx, m, al) {
    const tip = appendage(ctx, f.rules[qi], p, side, col, t, idx, m, al);
    if (!tip) return;
    for (let ci = qi + 1; ci < f.rules.length; ci++) if (f.rules[ci].on === qi) limb(ctx, f, ci, { x: tip.x, y: tip.y, r: 0, nx: Math.cos(tip.a) * side, ny: Math.sin(tip.a) * side, dx: -Math.sin(tip.a), dy: Math.cos(tip.a) }, side, col, t, idx + ci, m, al);
  }
  /** the condition a body is in, if any (a kind of 'part' this pond invented that changes the whole creature: see 45_parts, place 'skin') */
  F._cond = function (f) { for (let i = 0; i < f.rules.length; i++) { const q = f.rules[i]; if (q.k !== 8) continue; const d = dsgOf(q); if (d && d.place === 'skin') return d; } return null; };
  function colours(f) {
    const HARM = [30, 120, 150, 180], ah = Math.abs(f.hue2); let near = HARM[0]; for (let i = 1; i < 4; i++) if (Math.abs(HARM[i] - ah) < Math.abs(near - ah)) near = HARM[i];
    const h2 = (f.hue + (f.hue2 < 0 ? -1 : 1) * (near * 0.8 + ah * 0.2) + 720) % 360, hs = function (h, s, l, a) { return 'hsla(' + Math.round(h) + ',' + Math.round(clamp(s, 0, 100)) + '%,' + Math.round(clamp(l, 0, 100)) + '%,' + (a === undefined ? 1 : a) + ')'; };
    const cd = F._cond(f), T = cd && cd.tone ? cd.tone : [0, 1, 1], hue = f.hue + T[0], sat = f.sat * T[1], lit = f.lit * T[2], hb = h2 + T[0];
    INK = hs(hue, Math.min(60, sat * 0.7), 15);
    return { body: hs(hue, sat, lit), dark: hs(hue, sat, lit - 22), light: hs(hue, sat + 10, Math.min(90, lit + 20)), limb: hs(hb, sat, lit - 2), fin: hs(hb, sat + 8, lit + 8, 0.93), frill: hs(hb + 30, sat + 12, lit + 4), mark: hs(hb, sat + 10, lit - 12), glow: '#fff3a8' };
  }
  function eye(ctx, x, y, es, lx, ly, lid, col) {
    if (lid) { ctx.beginPath(); ctx.arc(x, y, es, 0, TAU); inked(ctx, col.dark, 2.2); ctx.beginPath(); ctx.moveTo(x - es * 0.7, y); ctx.quadraticCurveTo(x, y + es * 0.5, x + es * 0.7, y); ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.stroke(); return; }      // a closed eye: blinking, or asleep
    ctx.beginPath(); ctx.arc(x, y, es, 0, TAU); inked(ctx, '#fff', 2.2);
    ctx.beginPath(); ctx.arc(x + lx * es * 0.3, y + ly * es * 0.3, es * 0.55, 0, TAU); ctx.fillStyle = INK; ctx.fill();
    ctx.beginPath(); ctx.arc(x + lx * es * 0.3 - es * 0.2, y + ly * es * 0.3 - es * 0.24, es * 0.26, 0, TAU); ctx.fillStyle = '#fff'; ctx.fill(); ctx.beginPath(); ctx.arc(x + lx * es * 0.3 + es * 0.2, y + ly * es * 0.3 + es * 0.18, es * 0.1, 0, TAU); ctx.fill();
  }
  function mouth(ctx, f, x, y, ang, m, open) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.fillStyle = INK; ctx.strokeStyle = INK; ctx.lineWidth = 2;
    const o = 1 + 0.5 * (open || 0);
    if (f.mk === 0) { ctx.beginPath(); ctx.ellipse(0, 0, m * 0.5, m * 0.75 * o, 0, 0, TAU); ctx.fill(); }
    else if (f.mk === 1) { ctx.beginPath(); ctx.moveTo(-m * 0.5, -m * 0.8); ctx.lineTo(m * 1.5, 0); ctx.lineTo(-m * 0.5, m * 0.8); ctx.closePath(); inked(ctx, '#f6b34a'); }
    else if (f.mk === 2) { ctx.beginPath(); ctx.moveTo(-m * 1.1, -m * 1.1 * o); ctx.quadraticCurveTo(m * 0.5, 0, -m * 1.1, m * 1.1 * o); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#fff'; for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(-m * 0.85, i * m * 0.36 - 2.4); ctx.lineTo(-m * 0.3, i * m * 0.36); ctx.lineTo(-m * 0.85, i * m * 0.36 + 2.4); ctx.fill(); } }
    else if (f.mk === 3) { ctx.beginPath(); ctx.arc(m * 0.2, 0, m * 0.8, 0, TAU); inked(ctx, '#ff9fc4'); ctx.beginPath(); ctx.arc(m * 0.2, 0, m * 0.35, 0, TAU); ctx.fillStyle = INK; ctx.fill(); }
    else { ctx.beginPath(); ctx.ellipse(0, 0, m * 0.35, m * 0.5, 0, 0, TAU); ctx.fill(); ctx.lineWidth = 1.5; for (let i = -1; i <= 1; i += 2) for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(0, i * m * 0.3); ctx.lineTo(m * 1.5, i * (m * 0.5 + k * 5)); ctx.stroke(); } }
    ctx.restore();
  }
  /** draw a body at the origin, head towards +x, in form units (the caller sets position, turn and scale). o: { open, lx, ly } */
  F.draw = function (ctx, f, t, o) {
    o = o || {};
    const m = o.swim === undefined ? 0.3 : o.swim, al = o.alarm || 0;
    const lid = o.sleep ? 1 : ((t * 0.31 + (f.seed % 13)) % 3.7 < 0.1 ? 1 : 0);
    // o.mode: 'body' draws only the body at rest (and notes where the eyes go), 'tail' only the tail; neither draws what sprouts from the sides
    const mode = o.mode || '';
    const sk = F.skeleton(f, t, mode ? -1 : m), col = colours(f), r = G.rng(f.seed);
    if (f.glow > 0.3 && !mode) { const gl = ctx.createRadialGradient(0, 0, 4, 0, 0, sk.ext * 1.3); gl.addColorStop(0, 'rgba(255,243,168,0.3)'); gl.addColorStop(1, 'rgba(255,243,168,0)'); ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(0, 0, sk.ext * 1.3, 0, TAU); ctx.fill(); }
    // 1. what sprouts from the sides, behind the body
    let idx = 0;
    for (let qi = 0; !mode && qi < f.rules.length; qi++) {
      const q = f.rules[qi];
      if (q.k === 5 || q.on >= 0 || backOf(q, sk)) continue;
      if (sk.star) { for (let j = 0; j < sk.arms.length; j++) { const p = sk.arms[j]; if (p.half !== (qi % 2) || (Math.floor(j / 2) % q.e)) continue; limb(ctx, f, qi, p, 1, col, t, idx++, m, al); } continue; }
      for (let i = q.a; i <= q.b && i < sk.sites.length; i += q.e) { limb(ctx, f, qi, sk.sites[i], 1, col, t, idx, m, al); limb(ctx, f, qi, sk.sites[i], -1, col, t, idx, m, al); idx++; }
    }
    // 2. the tail
    if (!sk.star && f.tk && f.n > 1 && mode !== 'body') {
      const tl = sk.S[sk.M - 1], s = f.ts * U * 1.5;
      ctx.save(); ctx.translate(tl.x, tl.y); ctx.rotate(Math.atan2(-tl.dy, -tl.dx) + (mode ? 0 : Math.sin(t * (4 + 6 * m)) * (0.16 + 0.34 * m))); ctx.beginPath();
      if (f.tk === 1) { ctx.moveTo(0, 0); ctx.quadraticCurveTo(s * 0.6, -s * 0.9, s, -s * 0.55); ctx.quadraticCurveTo(s * 0.75, 0, s, s * 0.55); ctx.quadraticCurveTo(s * 0.6, s * 0.9, 0, 0); }
      else if (f.tk === 2) { ctx.moveTo(0, 0); ctx.quadraticCurveTo(s * 0.5, -s * 0.2, s * 1.15, -s * 0.8); ctx.lineTo(s * 0.6, 0); ctx.lineTo(s * 1.15, s * 0.8); ctx.quadraticCurveTo(s * 0.5, s * 0.2, 0, 0); }
      else if (f.tk === 3) { ctx.moveTo(0, -4); ctx.quadraticCurveTo(s * 0.8, -s * 0.5, s * 1.7, mode ? 0 : Math.sin(t * 5) * 8); ctx.quadraticCurveTo(s * 0.8, s * 0.1, 0, 4); }
      else { ctx.moveTo(0, -3.5); ctx.lineTo(s * 0.7, -3.5); ctx.arc(s * 0.95, 0, s * 0.34, -2.2, 2.2); ctx.lineTo(0, 3.5); }
      ctx.closePath(); inked(ctx, f.tk === 4 ? col.dark : col.fin, 2.5); ctx.restore();
    }
    if (mode === 'tail') return;
    if (f.coat >= 2) {
      const O = sk.out, nO = O.length, front = sk.star ? 1e9 : sk.L / 2 - sk.L * 0.14;
      ctx.lineCap = 'round';
      for (let i = 0; i < nO; i += f.coat === 2 ? 1 : 2) {
        const p = O[i], q2 = O[(i + 1) % nO], o0 = O[(i + nO - 1) % nO];
        if (p.x > front) continue;                                  // the face stays clean
        let tx = q2.x - o0.x, ty = q2.y - o0.y; const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
        let nx = ty, ny = -tx; if ((p.x - (sk.star ? 0 : p.x * 0.85)) * nx + p.y * ny < 0) { nx = -nx; ny = -ny; }
        if (f.coat === 2) { const ln = 5 + (i % 3) * 1.8; ctx.strokeStyle = col.dark; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(p.x - nx * 2, p.y - ny * 2); ctx.lineTo(p.x + nx * ln - (sk.star ? 0 : ln * 0.6), p.y + ny * ln); ctx.stroke(); }
        else { const ex2 = p.x + nx * 10 - (sk.star ? 0 : 7), ey2 = p.y + ny * 10; ctx.beginPath(); ctx.moveTo(p.x - tx * 4, p.y - ty * 4); ctx.quadraticCurveTo(p.x + nx * 7 - tx * 5, p.y + ny * 7 - ty * 5, ex2, ey2); ctx.quadraticCurveTo(p.x + nx * 5 + tx * 5, p.y + ny * 5 + ty * 5, p.x + tx * 4, p.y + ty * 4); ctx.closePath(); inked(ctx, i % 4 ? col.fin : col.frill, 1.4); }
      }
    }
    // 3. the body: one smooth shape, shaded, with its pattern inside it
    trace(ctx, sk.out);
    const gr = ctx.createRadialGradient(-sk.ext * 0.1, -U * 0.5, 2, 0, 0, sk.ext * 1.05); gr.addColorStop(0, col.light); gr.addColorStop(0.5, col.body); gr.addColorStop(1, col.dark);
    ctx.fillStyle = gr; ctx.fill();
    ctx.save(); trace(ctx, sk.out); ctx.clip();
    ctx.fillStyle = col.mark; ctx.globalAlpha *= 0.85;
    const x0 = -sk.ext, x1 = sk.ext, step = 9 + f.psc * 22, ga = ctx.globalAlpha;
    if (f.pat === 1) { if (sk.star) { ctx.lineWidth = step * 0.35; ctx.strokeStyle = col.mark; for (let rr = step * 0.6; rr < sk.ext; rr += step) { ctx.beginPath(); ctx.arc(0, 0, rr, 0, TAU); ctx.stroke(); } } else for (let x = x0; x < x1; x += step) ctx.fillRect(x, -U * 3, step * 0.42, U * 6); }
    else if (f.pat === 2) for (let i = 0; i < 30; i++) { ctx.beginPath(); ctx.arc(lerp(x0, x1, r()), (r() - 0.5) * (sk.star ? sk.ext * 2 : U * 3), 2 + f.psc * 6 * (0.5 + r()), 0, TAU); ctx.fill(); }
    else if (f.pat === 3) { ctx.globalAlpha = ga * 0.65; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(0, 0, sk.ext * 0.8, sk.star ? sk.ext * 0.5 : U * 0.45, 0, 0, TAU); ctx.fill(); }
    else if (f.pat === 4) { ctx.globalAlpha = ga * 0.7; ctx.lineWidth = 2.5 + f.psc * 4; ctx.strokeStyle = col.mark; if (sk.star) for (let i = 0; i < sk.arms.length; i++) { const p = sk.arms[i]; ctx.beginPath(); ctx.arc(p.nx * p.r * 0.6, p.ny * p.r * 0.6, p.r * 0.2, 0, TAU); ctx.stroke(); } else for (let i = 0; i < sk.sites.length; i++) { const p = sk.sites[i]; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 0.5, 0, TAU); ctx.stroke(); } }
    else if (f.pat === 5) { ctx.beginPath(); ctx.ellipse(-sk.ext * 0.15, 0, sk.ext * (0.2 + f.psc * 0.25), U * 3, 0, 0, TAU); ctx.fill(); }
    if (f.coat === 1) { ctx.globalAlpha = ga * 0.45; ctx.strokeStyle = INK; ctx.lineWidth = 1.1; const yy = sk.star ? sk.ext : U * 2.6; let row = 0; for (let y = -yy; y < yy; y += 6, row++) for (let x = x0 + (row % 2) * 4.5; x < x1; x += 9) { ctx.beginPath(); ctx.arc(x, y, 4.5, 0.2, 2.94); ctx.stroke(); } }
    ctx.globalAlpha = ga * 0.33; ctx.fillStyle = '#fff'; ctx.beginPath();
    if (sk.star) ctx.ellipse(-sk.R0 * 0.25, -sk.R0 * 0.4, sk.R0 * 0.4, sk.R0 * 0.18, -0.3, 0, TAU); else ctx.ellipse(sk.head.x - 4, sk.head.y - sk.head.r * 0.5, sk.head.r * 0.6, sk.head.r * 0.22, -0.3, 0, TAU);
    ctx.fill();
    ctx.restore();
    trace(ctx, sk.out); ctx.strokeStyle = INK; ctx.lineWidth = 2.4; ctx.lineJoin = 'round'; ctx.stroke();
    // 4. along the back: a shell, plates, a crest, lights, poison glands
    if (sk.star) {
      if (f.shell > 0.25) { ctx.beginPath(); ctx.arc(0, 0, sk.R0 * (0.55 + 0.2 * f.shell), 0, TAU); inked(ctx, col.dark, 2); }
      for (let qi = 0; !mode && qi < f.rules.length; qi++) { const q = f.rules[qi]; if (backOf(q)) appendage(ctx, q, { x: 0, y: 0, nx: -1, ny: 0, dx: 0, dy: 1, r: 0 }, 1, col, t, qi, m, al); }
      for (let qi = 0; qi < f.rules.length; qi++) { const q = f.rules[qi]; if (q.k !== 5) continue; for (let i = 0; i < sk.arms.length; i++) { const p = sk.arms[i]; if (p.half) continue; ctx.beginPath(); ctx.ellipse(p.nx * p.r * 0.62, p.ny * p.r * 0.62, p.r * 0.2 * (0.6 + q.w), p.r * 0.14, Math.atan2(p.ny, p.nx), 0, TAU); inked(ctx, col.limb, 2); } }
      for (let i = 0; i < sk.arms.length; i++) { const p = sk.arms[i]; if (f.glow > 0.3 && !p.half) { ctx.beginPath(); ctx.arc(p.nx * p.r * 0.8, p.ny * p.r * 0.8, 2.8, 0, TAU); ctx.fillStyle = col.glow; ctx.fill(); } if (f.venom > 0.3 && p.half) { ctx.beginPath(); ctx.arc(p.nx * p.r * 0.72, p.ny * p.r * 0.72, 3.4, 0, TAU); inked(ctx, '#b6ff3c', 1.6); } }
    } else {
      if (f.shell > 0.25) {
        const i0 = Math.round(sk.M * (f.n > 1 ? headSpan(f) + 0.06 : 0.12)), i1 = Math.round(sk.M * 0.93), k = 0.5 + 0.3 * f.shell, C = [];
        for (let i = i0; i <= i1; i++) { const p = sk.S[i], e = Math.sin((i - i0) / Math.max(1, i1 - i0) * Math.PI); C.push({ x: p.x + p.nx * p.r * k * Math.sqrt(e), y: p.y + p.ny * p.r * k * Math.sqrt(e) }); }
        for (let i = i1; i >= i0; i--) { const p = sk.S[i], e = Math.sin((i - i0) / Math.max(1, i1 - i0) * Math.PI); C.push({ x: p.x - p.nx * p.r * k * Math.sqrt(e), y: p.y - p.ny * p.r * k * Math.sqrt(e) }); }
        if (C.length > 5) { trace(ctx, C); inked(ctx, col.dark, 2); ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.globalAlpha *= 0.5; for (let j = 1; j < sk.sites.length; j++) { const p = sk.S[Math.round(j / f.n * sk.M)]; if (p.u * sk.M < i0 + 1 || p.u * sk.M > i1 - 1) continue; ctx.beginPath(); ctx.moveTo(p.x + p.nx * p.r * k * 0.9, p.y + p.ny * p.r * k * 0.9); ctx.quadraticCurveTo(p.x - p.dx * 3, p.y - p.dy * 3, p.x - p.nx * p.r * k * 0.9, p.y - p.ny * p.r * k * 0.9); ctx.stroke(); } ctx.globalAlpha /= 0.5; }
      }
      for (let qi = 0; qi < f.rules.length; qi++) { const q = f.rules[qi]; if (q.k !== 5) continue; for (let i = q.a; i <= q.b && i < sk.sites.length; i += q.e) { const p = sk.sites[i]; ctx.beginPath(); ctx.ellipse(p.x, p.y, sk.L / f.n * 0.36, p.r * (0.45 + 0.4 * q.w), Math.atan2(p.dy, p.dx), 0, TAU); inked(ctx, col.limb, 2); } }
      // parts of the pond's own invention that sit along the back (in the puppet they are separate pieces, so they can move)
      for (let qi = 0; !mode && qi < f.rules.length; qi++) { const q = f.rules[qi]; if (!backOf(q, sk)) continue; for (let i = q.a; i <= q.b && i < sk.sites.length; i += q.e) { const p = sk.sites[i]; appendage(ctx, q, { x: p.x, y: p.y, nx: -p.dx, ny: -p.dy, dx: p.nx, dy: p.ny, r: 0 }, 1, col, t, i, m, al); } }
      if (f.crest > 0.25) for (let i = 3; i < sk.M - 2; i += 3) { const p = sk.S[i], s = p.r * (0.14 + 0.2 * f.crest); ctx.beginPath(); ctx.moveTo(p.x + p.dx * 5, p.y + p.dy * 5); ctx.lineTo(p.x - p.dx * 2 + p.nx * s, p.y - p.dy * 2 + p.ny * s); ctx.lineTo(p.x - p.dx * 6, p.y - p.dy * 6); ctx.lineTo(p.x - p.dx * 2 - p.nx * s, p.y - p.dy * 2 - p.ny * s); ctx.closePath(); inked(ctx, col.frill, 1.8); }
      for (let i = 0; i < sk.sites.length; i++) for (let sd = -1; sd <= 1; sd += 2) { const p = sk.sites[i];
        if (f.glow > 0.3 && i === 0) { ctx.beginPath(); ctx.arc(p.x + p.nx * p.r * 0.5 * sd, p.y + p.ny * p.r * 0.5 * sd, 3, 0, TAU); ctx.fillStyle = col.glow; ctx.fill(); }
        if (f.venom > 0.3 && i === sk.sites.length - 1) { ctx.beginPath(); ctx.arc(p.x - p.dx * 5 + p.nx * p.r * 0.8 * sd, p.y - p.dy * 5 + p.ny * p.r * 0.8 * sd, 3.4, 0, TAU); inked(ctx, '#b6ff3c', 1.6); } }
    }
    // 5. the face
    const ne = f.en, lx = o.lx === undefined ? 1 : o.lx, ly = o.ly || 0;
    if (sk.star) {
      if (mode) o.mouth = [ne ? sk.R0 * 0.32 : 0, 0, 0, f.ms * sk.R0 * 0.5]; else mouth(ctx, f, ne ? sk.R0 * 0.32 : 0, 0, 0, f.ms * sk.R0 * 0.5, o.open);
      for (let e = 0; e < ne; e++) { const es = Math.min(f.es * U * 0.85, sk.R0 * 0.3) * (ne > 3 ? 0.7 : ne > 2 ? 0.85 : 1), spread = ne === 1 ? 0 : (e - (ne - 1) / 2) * es * 2.2; if (mode) o.eyes.push([-sk.R0 * 0.12 - Math.abs(spread) * 0.12, spread, es]); else eye(ctx, -sk.R0 * 0.12 - Math.abs(spread) * 0.12, spread, es, lx, ly, lid, col); }
    } else {
      const ns = sk.nose;
      if (mode) o.mouth = [ns.x - ns.dx * 3, ns.y - ns.dy * 3, Math.atan2(ns.dy, ns.dx), f.ms * U * 0.7]; else mouth(ctx, f, ns.x - ns.dx * 3, ns.y - ns.dy * 3, Math.atan2(ns.dy, ns.dx), f.ms * U * 0.7, o.open);
      for (let e = 0; e < ne; e++) {
        const pair = Math.floor(e / 2), side = e % 2 ? -1 : 1, single = ne % 2 === 1 && e === ne - 1, p = sk.S[Math.min(sk.M, Math.max(1, Math.round(sk.M * headSpan(f) * 0.55) + pair * 3))];
        const es = Math.max(5, Math.min(f.es * U * 1.05, sk.head.r * 0.68)) * (single ? (ne === 1 ? 1.15 : 0.5) : pair ? 0.55 : 1);
        if (!pair && !single && mode !== 'tail') { ctx.save(); ctx.globalAlpha *= 0.4; ctx.fillStyle = '#ff7fa8'; ctx.beginPath(); ctx.ellipse(p.x - p.dx * es * 1.25 + p.nx * p.r * 0.5 * side, p.y - p.dy * es * 1.25 + p.ny * p.r * 0.5 * side, es * 0.55, es * 0.38, Math.atan2(p.dy, p.dx), 0, TAU); ctx.fill(); ctx.restore(); }
        let ex = p.x + (single ? 0 : p.nx * Math.max(p.r * 0.62, es * 0.9) * side), ey = p.y + (single ? 0 : p.ny * Math.max(p.r * 0.62, es * 0.9) * side);
        if (f.ek > 0.25 && !single) { const sx = ex + p.nx * side * f.ek * U * 0.8 + p.dx * 5, sy = ey + p.ny * side * f.ek * U * 0.8 + p.dy * 5; ctx.lineCap = 'round'; ctx.strokeStyle = INK; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(sx, sy); ctx.stroke(); ctx.strokeStyle = col.body; ctx.lineWidth = 3.4; ctx.stroke(); ex = sx; ey = sy; }
        if (mode) o.eyes.push([ex, ey, es]); else eye(ctx, ex, ey, es, lx, ly, lid, col);
      }
    }
  };

  // ── the puppet: a body kept as separate pieces, so every part can move and a whole pond of them stays cheap to draw ──
  const PP = 2.2;                                  // pixels per form unit in the kept pieces
  const REST = { x: 0, y: 0, nx: 0, ny: 1, dx: 1, dy: 0, r: 0 };
  const rigs = {}; let rigN = 0;
  function piece(w, h) { const cv = document.createElement('canvas'); cv.width = Math.ceil(w * 2 * PP); cv.height = Math.ceil(h * 2 * PP); const ctx = cv.getContext('2d'); ctx.translate(cv.width / 2, cv.height / 2); ctx.scale(PP, PP); return { cv: cv, ctx: ctx, w: w, h: h }; }
  F.rig = function (f) {
    const key = F.key(f);
    let g = rigs[key];
    if (g) { g.used = G.rt || 0; return g; }
    if (rigN > 240) { const now = G.rt || 0; for (const k in rigs) if (now - rigs[k].used > 4) { delete rigs[k]; rigN--; } if (rigN > 380) { for (const k in rigs) delete rigs[k]; rigN = 0; } }
    const sk = F.skeleton(f, 0, -1), col = colours(f), ext = F.extent(f);
    const body = piece(ext.half + 26, (sk.star ? ext.half : ext.wide) + f.ek * U + 18), eyes = [];
    const bo = { mode: 'body', eyes: eyes };
    F.draw(body.ctx, f, 0, bo);
    const app = [], att = [], kids = {};
    let idx = 0;
    for (let qi = 0; qi < f.rules.length; qi++) {
      const q = f.rules[qi];
      const dsg = dsgOf(q);
      if (q.k === 5 || (q.k === 8 && !dsg)) { app.push(null); continue; }
      const h = q.l * U * 1.25 * (q.k === 3 ? 1.45 : q.k === 8 ? 1.55 : 1.15) + 24, p = piece(h, h);
      p.tip = appendage(p.ctx, q, REST, 1, col, 0, 0, 0, 0);
      app.push(p);
      if (q.on >= 0) { if (app[q.on]) (kids[q.on] = kids[q.on] || []).push(qi); continue; }
      if (backOf(q)) { const BS = backSites(q, sk); for (let i = 0; i < BS.length; i++) { const s = BS[i]; att.push({ qi: qi, bx: s.x, by: s.y, rot: Math.atan2(-s.dy, -s.dx) - Math.PI / 2, side: 1, idx: idx++, x: s.x, top: true }); } continue; }
      if (sk.star) { for (let j = 0; j < sk.arms.length; j++) { const a = sk.arms[j]; if (a.half !== (qi % 2) || (Math.floor(j / 2) % q.e)) continue; att.push({ qi: qi, bx: a.nx * a.r * 0.8, by: a.ny * a.r * 0.8, rot: Math.atan2(a.ny, a.nx) - Math.PI / 2, side: 1, idx: idx++, x: 0 }); } continue; }
      for (let i = q.a; i <= q.b && i < sk.sites.length; i += q.e) { const s = sk.sites[i]; for (let side = 1; side >= -1; side -= 2) att.push({ gr: s.gr || 1, qi: qi, bx: s.x + s.nx * s.r * 0.8 * side, by: s.y + s.ny * s.r * 0.8 * side, rot: Math.atan2(s.ny * side, s.nx * side) - Math.PI / 2, side: side, idx: idx, x: s.x }); idx++; }
    }
    let tail = null;
    if (!sk.star && f.tk && f.n > 1) { const tl = sk.S[sk.M - 1], h = f.ts * U * 1.5 * 1.85 + 14, p = piece(h, h); p.ctx.translate(-tl.x, -tl.y); F.draw(p.ctx, f, 0, { mode: 'tail' }); tail = { p: p, x: tl.x, y: tl.y }; }
    g = rigs[key] = { kids: kids, ink: INK, mouth: bo.mouth || null, body: body, eyes: eyes, app: app, att: att, tail: tail, star: sk.star, L: sk.L || 0, col: col, used: G.rt || 0 }; rigN++;
    return g;
  };
  /** draw the puppet at the origin, head towards +x, in form units. o: { swim 0..1, alarm 0..1, lx, ly (where it looks), sleep } */
  F.drawRig = function (ctx, f, t, o) {
    o = o || {};
    const g = F.rig(f), m = o.swim === undefined ? 0.3 : o.swim, al = o.alarm || 0, L = g.L, wf = 3 + 4 * m, wa = L * (0.014 + 0.036 * m), bend = !g.star && f.n > 1;
    const wave = function (x) { if (!bend) return 0; const u = (L / 2 - x) / L; return Math.sin(t * wf - u * 4) * wa * u; };      // the swimming ripple that runs down the body
    if (g.star) { const pu = 1 + Math.sin(t * (2.5 + 2.5 * m)) * (0.03 + 0.05 * m); ctx.scale(pu, pu); ctx.rotate(Math.sin(t * 0.9) * 0.12); }
    // what sprouts from the sides: legs step in turn, fins flap, tentacles and feelers sway, spikes bristle at danger
    const kidsOf = function (qi, idx, off) {
      const tip = g.app[qi].tip, K = g.kids[qi];
      if (!tip) return;
      for (let i = 0; i < K.length; i++) {
        const ci = K[i], q = f.rules[ci], sp = g.app[ci]; if (!sp) continue;
        const mv = q.k === 8 ? dmove(dsgOf(q), t, idx + ci, m, al, off) : q.k === 0 ? Math.sin(t * (5 + 5 * m) + idx * 3.1416 + off + 1.2) * (0.2 + 0.45 * m) : q.k === 1 ? Math.sin(t * (4 + 6 * m) + idx + ci) * (0.14 + 0.3 * m) : (q.k === 2 || q.k === 7) ? -al * 0.3 : Math.sin(t * 2.4 + idx * 1.3 + ci + off * 0.6) * (0.18 + 0.2 * m);
        ctx.save(); ctx.translate(tip.x, tip.y); ctx.rotate(tip.a - Math.PI / 2); ctx.rotate(mv);
        ctx.drawImage(sp.cv, -sp.w, -sp.h, sp.w * 2, sp.h * 2);
        if (g.kids[ci]) kidsOf(ci, idx + ci, off);
        ctx.restore();
      }
    };
    const parts = function (top) { for (let i = 0; i < g.att.length; i++) {
      const a = g.att[i]; if (!!a.top !== top) continue;
      const q = f.rules[a.qi], sp = g.app[a.qi], off = a.side > 0 ? 0 : 3.1416, dsg = dsgOf(q);
      const move = q.k === 8 ? dmove(dsg, t, a.idx, m, al, off) : q.k === 0 ? Math.sin(t * (5 + 5 * m) + a.idx * 3.1416 + off) * (0.12 + 0.4 * m) : q.k === 1 ? Math.sin(t * (4 + 6 * m) + a.idx) * (0.14 + 0.3 * m) : q.k === 4 ? Math.sin(t * 2.2 + a.idx * 1.7 + off * 0.3) * 0.2
        : (q.k === 2 || q.k === 7) ? -al * 0.3 * (q.g > 0 ? 1 : -1) : q.k === 3 ? Math.sin(t * (2 + 2 * m) + a.idx * 1.3 + off * 0.6) * (0.18 + 0.22 * m) : Math.sin(t * 3 + a.idx) * (0.08 + 0.3 * al);
      ctx.save(); ctx.translate(a.bx, a.by + wave(a.x)); ctx.rotate(a.rot); if (a.side < 0) ctx.scale(-1, 1); ctx.rotate(move); if (a.gr && a.gr < 0.99) ctx.scale(a.gr, a.gr);
      if (al > 0.05 && (q.k === 2 || q.k === 7 || q.k === 6 || (dsg && dsg.motion === 'bristle'))) ctx.scale(1 + 0.25 * al, 1 + 0.25 * al);
      if (dsg && dsg.motion === 'pulse') { const pu = 1 + 0.12 * Math.sin(t * 3.2 + a.idx); ctx.scale(pu, 2 - pu); }
      ctx.drawImage(sp.cv, -sp.w, -sp.h, sp.w * 2, sp.h * 2);
      if (g.kids[a.qi]) kidsOf(a.qi, a.idx, off);
      ctx.restore();
    } };
    parts(false);
    if (g.tail) { const p = g.tail.p; ctx.save(); ctx.translate(g.tail.x, g.tail.y + wave(g.tail.x)); ctx.rotate(Math.sin(t * (4 + 6 * m)) * (0.18 + 0.36 * m)); ctx.drawImage(p.cv, -p.w, -p.h, p.w * 2, p.h * 2); ctx.restore(); }
    // the body, in strips, so the ripple bends it
    const b = g.body;
    if (!bend) ctx.drawImage(b.cv, -b.w, -b.h, b.w * 2, b.h * 2);
    else { const N = Math.max(14, Math.min(34, Math.round(b.cv.width / 9))), cw = b.cv.width, ch = b.cv.height; for (let i = 0; i < N; i++) { const s0 = Math.round(i * cw / N), s1 = Math.round((i + 1) * cw / N), x0 = -b.w + s0 / PP; ctx.drawImage(b.cv, s0, 0, s1 - s0, ch, x0, -b.h + wave(x0 + (s1 - s0) / PP / 2), (s1 - s0) / PP + 0.6, b.h * 2); } }
    parts(true);
    INK = g.ink;
    if (g.mouth) { const q = g.mouth; mouth(ctx, f, q[0], q[1] + wave(q[0]), q[2], q[3], (o.open || 0) + 0.12 + 0.12 * Math.sin(t * 2.3)); }
    // the eyes are always alive: they follow what it is after, and blink
    const lid = o.sleep ? 1 : ((t * 0.31 + (f.seed % 13)) % 3.7 < 0.1 ? 1 : 0), lx = o.lx === undefined ? 1 : o.lx, ly = o.ly || 0;
    INK = g.ink;
    for (let i = 0; i < g.eyes.length; i++) { const e = g.eyes[i]; eye(ctx, e[0], e[1] + wave(e[0]), e[2], lx, ly, lid, g.col); }
  };

  // for the portrait painter (22_portrait.js): this body's colours, its outline tone, and the pond's own kinds of part
  F._colours = colours; F._ink = function () { return INK; }; F._design = drawDesign; F._dsg = dsgOf;

  /** forget every kept picture (a new pond has its own kinds of part) */
  F.clearCache = function () { for (const k in rigs) delete rigs[k]; rigN = 0; for (const k in cache) delete cache[k]; cacheN = 0; };

  // a body drawn once and kept, so hundreds of creatures can be shown cheaply
  const cache = {}; let cacheN = 0;
  const SPR = 168;
  F.sprite = function (f) {
    const key = F.key(f);
    let s = cache[key];
    if (s) { s.used = G.rt || 0; return s; }
    if (cacheN > 320) { const now = G.rt || 0; for (const k in cache) if (now - cache[k].used > 4) { delete cache[k]; cacheN--; } if (cacheN > 480) { for (const k in cache) delete cache[k]; cacheN = 0; } }
    const cv = document.createElement('canvas'); cv.width = cv.height = SPR;
    const ctx = cv.getContext('2d'), all = F.extent(f).all, sc = (SPR / 2 - 2) / all;
    ctx.translate(SPR / 2, SPR / 2); ctx.scale(sc, sc);
    F.draw(ctx, f, 0.9, {});
    s = cache[key] = { cv: cv, all: all, used: G.rt || 0 }; cacheN++;
    return s;
  };
})();
