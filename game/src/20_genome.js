// ── Genome: an open-ended recipe (traits, chemistry, a body grown from rules, organs, a growing brain) ──
(function () {
  'use strict';
  const clamp = G.clamp;
  const NIN = 12, NOUT = 5, MAXH = 16, MAXP = 6;
  // the nine things the pond can press for; the body answers each in its own way (see form)
  const PT = ['mouth', 'fin', 'spike', 'armor', 'eye', 'lamp', 'gland', 'tail', 'tentacle'];
  const TAGHUE = [45, 100, 160, 210, 260, 330];
  const INAMES = ['bias', 'food ahead', 'food beside', 'prey ahead', 'prey beside', 'danger ahead', 'danger beside', 'energy', 'temperature', 'light', 'kin near', 'rhythm'];
  const ONAMES = ['swim', 'turn', 'sprint', 'glow', 'stick'];
  Object.assign(G, { NIN, NOUT, MAXH, MAXP, PT, TAGHUE, INAMES, ONAMES });

  G.K = Object.assign(G.K, {
    mut: 0.08,            // per-gene mutation chance (times the world slider)
    dt: 1 / 30,
    foodRate: 12,        // food drops per second in a 1600x1000 pond at light 1
    foodMax: 380,
    repro: 0.30,          // child costs this fraction of the parent's max energy
    keep: 0.12,           // parent keeps at least this much after breeding
    capBase: 150,
    speciesTH: 1.65,
    maxAge: 3,
    foodDigestMin: 0.2,
  });

  G.tagOfHue = function (h) {
    h = ((h % 360) + 360) % 360;
    let best = 0, bd = 999;
    for (let i = 0; i < 6; i++) {
      let d = Math.abs(h - TAGHUE[i]); if (d > 180) d = 360 - d;
      if (d < bd) { bd = d; best = i; }
    }
    return best;
  };

  // gene shapes:
  // t: [size, speed, colour (follows the body), unused, temper]
  // c: [digest x6, resist heat, resist cold, resist poison, tolerance x6]
  // f: the form, the rules the body is grown from (see 21_form.js)
  // p: [{k, a, s}] organs invented for this pond (k = organ id + 100)
  // h: number of hidden brain cells
  // w: [{f, t, v}] brain wires. f: 0..11 inputs or 100+n hidden. t: 200+o outputs or 100+n hidden.
  function W(f, t, v) { return { f: f, t: t, v: v }; }

  /** the first life of a pond: single cells, in this pond's own colour */
  G.founder = function () {
    const r = G.rand, n = G.randn;
    const hue = (G.W && G.W.hue0 !== undefined ? G.W.hue0 : 220) + n() * 9;
    const g = {
      t: [clamp(10 + n() * 0.9, 7, 14), clamp(0.35 + n() * 0.07, 0.1, 0.8), hue, 0.3, clamp(0.16 + n() * 0.11, 0, 1)],
      c: [0.35, 0.1, 0.9, 0.05, 0.05, 0.05, 0.1, 0.1, 0.1, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05],   // diet x6, resist heat/cold/poison, tolerance x6
      f: G.form.cell(hue),
      p: [],
      h: 0,
      w: [],
    };
    g.w.push(W(0, 200, 0.1 + n() * 0.15));
    g.w.push(W(1, 200, 0.35 + n() * 0.2));
    g.w.push(W(2, 201, 0.55 + n() * 0.3));
    g.w.push(W(0, 201, n() * 0.25));
    if (r() < 0.5) g.w.push(W(11, 201, n() * 0.5));
    if (r() < 0.4) g.w.push(W(7, 200, n() * 0.4));
    if (r() < 0.3) g.w.push(W(9, 200, n() * 0.4));
    return G.validateGenome(g);
  };

  G.cloneGenome = function (g) {
    return {
      t: g.t.slice(), c: g.c.slice(),
      f: G.form.clone(g.f),
      p: g.p.map(function (p) { return { k: p.k, a: p.a, s: p.s }; }),
      h: g.h,
      w: g.w.map(function (w) { return { f: w.f, t: w.t, v: w.v }; }),
      mv: g.mv | 0,
    };
  };

  function validWire(w, h) {
    const f = w.f, t = w.t;
    if (f < 0 || (f >= NIN && f < 100) || f >= 100 + h) return false;
    if (t < 100 || (t >= 100 + h && t < 200) || t >= 200 + NOUT) return false;
    if (f >= 100 && t >= 100 && t < 200 && f >= t) return false; // hidden cells only look backwards
    return true;
  }
  G.validateGenome = function (g) {
    g.t[0] = clamp(g.t[0], 5, 64);
    g.t[1] = clamp(g.t[1], 0.05, 1);
    g.t[3] = 0.3;
    g.t[4] = clamp(g.t[4] === undefined || !isFinite(g.t[4]) ? 0.12 : +g.t[4], 0, 1);
    g.t.length = 5;
    if (!g.f || typeof g.f !== 'object') g.f = G.form.cell(isFinite(g.t[2]) ? g.t[2] : undefined); else G.form.fix(g.f);
    g.t[2] = g.f.hue;
    for (let i = 0; i < 6; i++) g.c[i] = clamp(g.c[i], 0, 1);
    while (g.c.length < 15) g.c.push(0.05);
    g.c.length = 15;
    for (let i = 6; i < 15; i++) g.c[i] = clamp(+g.c[i] || 0, 0, 1);
    g.h = clamp(g.h | 0, 0, MAXH);
    g.mv = g.mv && G.marvelOf && G.marvelOf(g.mv) ? g.mv | 0 : 0;      // a marvel the pond does not know is lost
    // organs: one of each
    const seen = {};
    g.p = (g.p || []).filter(function (p) { if (!(p.k >= 100 && p.k < 1e6) || seen[p.k]) return false; seen[p.k] = 1; return true; }).slice(0, MAXP);
    for (let i = 0; i < g.p.length; i++) { g.p[i].s = clamp(+g.p[i].s || 1, 0.4, 1.8); g.p[i].a = +g.p[i].a || 0; }
    g.w = g.w.filter(function (w) { return validWire(w, g.h); }).slice(0, 70);
    for (let i = 0; i < g.w.length; i++) g.w[i].v = clamp(g.w[i].v, -4, 4);
    return g;
  };

  // ── phenotype: everything the simulation needs, worked out once at birth ──
  // nothing here is assigned by a table of kinds: speed, senses, reach, armour and attack are measured from the body.
  G.derive = function (g) {
    const t = g.t, c = g.c, f = g.f, FM = G.form, U = FM.U;
    const cn = FM.counts(f), A = FM.abilities(f, cn), ext = FM.extent(f), k = cn.k;
    const mvd = g.mv && G.marvelOf ? G.marvelOf(g.mv) : null;
    const stall = G.W && G.W.grow ? G.W.grow : 0;
    const r = Math.min(t[0], 26 + 9 * (f.n - 1)) * (mvd && mvd.sp === 'titan' ? 1.35 : 1);          // a body of more parts can be a bigger one; the ceiling is high, so size is limited by food and by the pond, not by a rule
    const FX = { speed: 0, sense: 0, eat: 0, armor: 0, spike: 0, toxin: 0, photo: 0, glow: 0, heat: 0, cold: 0, poison: 0 };
    const dig = [c[0], c[1], c[2], c[3], c[4], c[5]];
    let orgCost = 0;
    for (let i = 0; i < g.p.length; i++) {
      // an organ invented for this pond: its effects, scaled by its size
      const q = g.p[i], o = G.organOf ? G.organOf(q.k) : null;
      if (!o) continue;
      let tot = 0;
      for (const x in FX) { FX[x] += (o.fx[x] || 0) * q.s; tot += Math.abs(o.fx[x] || 0); }
      if (o.digest >= 0) dig[o.digest] = Math.min(1, dig[o.digest] + 0.4 * q.s);
      orgCost += (0.03 + 0.065 * tot) * q.s;
    }
    if (mvd) { for (const x in FX) FX[x] += mvd.fx[x] || 0; orgCost += 0.05; }      // a marvel's effects, like an organ's
    const tail = !f.sym && f.tk && f.n > 1;
    const plump = clamp(((f.prof[1] + f.prof[2] + f.prof[3]) / 3 - 0.7) / 0.5, 0, 1);      // 0 slim .. 1 round
    const bite = Math.min(2, (f.mk === 2 ? 0.8 + 1.6 * f.ms : f.mk === 1 ? 0.6 : 0) + 0.25 * cn.pincer);
    const ds = r / U * Math.sqrt(Math.PI * U * U / FM.area(f));    // drawn so the body covers what a circle of radius r would
    const ph = {
      r: r, ds: ds, A: A,
      cnt: [1 + f.ms, Math.min(3, k[1] * 0.5), Math.min(3, (k[2] + k[7]) * 0.5), 4 * A.armour, f.en, f.glow > 0.3 ? 2 * f.glow : 0, 2 * f.venom, tail ? 1 : 0, Math.min(3, k[3] * 0.5)],
      eyes: Math.min(f.en, 3),
      sense: 38 + 185 * A.senses,
      speed: (26 + 52 * t[1]) * (0.72 + 0.95 * A.speed) / (0.7 + 0.3 * r / 10),
      turn: 2.2 + 3.4 * A.agility,
      eatR: r + 3 + 22 * A.reach,
      defense: 0.85 * A.armour,
      spike: Math.min(3, (k[2] + k[7]) * 0.5),
      gland: f.venom > 0.3 ? 2 * f.venom : 0,
      lamp: Math.min(2, (f.glow > 0.3 ? 2 * f.glow : 0) + 0.15 * k[4]),
      flag: tail ? Math.min(2, f.ts * 1.3) : 0,
      bite: bite,
      gill: Math.min(2.2, 1 + 0.1 * k[1] + 0.16 * k[6] + 0.05 * k[3]),      // the surface it breathes through
      Emax: 90 * Math.pow(r / 10, 1.62),
      tag: G.tagOfHue(f.hue),
      nseg: f.n - 1, limbs: cn.legSites, segs: [],
      reach: clamp(ext.all * ds / r, 1, 3.6),
      dig: dig, res: [
        clamp(cn.dres[0] + 0.3 * c[6] + FX.heat * 0.6 + (f.coat === 0 ? 0.28 : f.coat === 1 ? 0.12 : -0.12) + 0.3 * (1 - plump) + 0.05 * Math.min(4, k[1] + k[6]), 0, 1),
        clamp(cn.dres[1] + 0.3 * c[7] + FX.cold * 0.6 + (f.coat >= 2 ? 0.42 : 0) + 0.3 * plump, 0, 1),
        clamp(cn.dres[2] + 0.35 * c[8] + FX.poison * 0.6 + (f.coat === 1 ? 0.25 : 0) + 0.28 * f.shell + 0.22 * f.venom, 0, 1)],
      photo: Math.min(2, FX.photo),
      hue: f.hue,
    };
    // a part made to answer something in the pond works as the weapon or the shield it is
    ph.spike += 1.2 * cn.dwk[0]; ph.gland += 1.2 * cn.dwk[1]; ph.bite += cn.dwk[2]; ph.lamp = Math.min(2, ph.lamp + cn.dwk[3]); if (cn.dwk[4]) ph.defense = 1 - (1 - ph.defense) * Math.pow(0.8, cn.dwk[4]);
    // organs change what the body can do; feeding on light means sitting still
    ph.speed *= Math.max(0.25, (1 + 0.28 * clamp(FX.speed, -2, 2)) * (1 - 0.2 * Math.min(2, FX.photo)));
    ph.sense += 55 * Math.min(2, FX.sense);
    ph.eatR += 7 * Math.min(2, FX.eat);
    ph.defense = 1 - (1 - ph.defense) * Math.pow(0.72, Math.min(3, FX.armor));
    ph.spike += 1.4 * FX.spike; ph.gland += 1.4 * FX.toxin;
    ph.lamp = Math.min(2, ph.lamp + FX.glow);
    // what the body opens up: nothing is unlocked by a list, each follows from the shape
    ph.jaws = bite >= 0.8;                       // can eat the big prey of the deep
    ph.lungs = cn.legSites >= 4;                 // two pairs of legs carry it onto the shore
    ph.hands = cn.fingers >= 2;                  // fingers at the front pick the shore's food faster
    ph.warm = ph.res[1] >= 0.55;
    ph.plump = plump;                 // cold-proof life does not slow down in winter
    // charm: how well the body fits what all life finds pleasing, and what THIS pond admires
    // how nice it is to the eye: by this pond's learned taste (a free body), or the old measure (anything else)
    ph.charm = f.bd && FM.beauty ? FM.beauty(f, G.W ? G.W.taste : null) : clamp(FM.taste(f, G.W ? G.W.fashion : null, cn) * 1.15, 0, 1);
    ph.whole = f.bd && FM.whole ? (FM.wholeBelief ? FM.wholeBelief(f, G.W ? G.W.taste : null) : FM.whole(f).v) : 0.5;      // how whole a creature it is
    ph.rc = r * (1 + 0.22 * Math.max(0, Math.max(ext.half, ext.wide) * ds / r - 1));
    ph.aggro = t[4] || 0;
    ph.forage = [0.5 + 1.0 * A.reach, 0.5 + 1.0 * A.agility, 0.85, 0.5 + 1.0 * A.senses, 0.45 + 1.1 * A.attack, 0.5 + 1.0 * A.speed];      // how well this body gathers each colour of food
    ph.pneed = 0.55 + 0.03 * cn.mass + 0.04 * (f.n - 1) + 0.1 * Math.max(0, f.hd - 1) + (f.coat ? 0.04 : 0);      // protein a child takes, per unit of its energy cost: elaborate bodies are dear to build
    const r10 = r / 10;
    let up = 0.22 * Math.pow(r10, 2.05) + r10 * (0.026 * cn.mass + 0.02 * (f.n - 1) + 0.07 * f.shell + 0.02 * f.crest + 0.04 * f.glow + 0.05 * f.venom + 0.012 * f.en * (0.5 + f.es) + (f.mk === 2 ? 0.03 : 0) + (f.coat ? 0.09 : 0) + 0.035 * Math.pow(Math.max(0, f.rules.length - 3), 2) + 0.03 * Math.max(0, f.hd - 1));
    up += orgCost + 0.02 * ph.aggro * r10;      // being angry is not free
    let digSum = 0; for (let i = 0; i < 6; i++) digSum += c[i];
    let tolSum = 0; for (let i = 9; i < 15; i++) tolSum += c[i] || 0;
    up += 0.035 * digSum + 0.02 * (c[6] + c[7] + c[8]) + 0.022 * tolSum + 0.0035 * g.w.length + 0.012 * g.h;
    if (f.bd) up += r10 * 0.05 * Math.max(0, G.body.busy(f) - 6);
    ph.upkeep = up;
    // compile the brain: wires grouped by target (hidden 0..h-1, then outputs)
    const nt = g.h + NOUT;
    const groups = [];
    for (let i = 0; i < nt; i++) groups.push([]);
    for (let i = 0; i < g.w.length; i++) {
      const w = g.w[i];
      const ti = w.t >= 200 ? g.h + (w.t - 200) : (w.t - 100);
      if (ti >= 0 && ti < nt) groups[ti].push(w);
    }
    const bf = [], bv = [], bs = [0];
    for (let i = 0; i < nt; i++) {
      for (let j = 0; j < groups[i].length; j++) {
        const w = groups[i][j];
        bf.push(w.f >= 100 ? NIN + (w.f - 100) : w.f);
        bv.push(w.v);
      }
      bs.push(bf.length);
    }
    ph.bf = Int16Array.from(bf); ph.bv = Float32Array.from(bv); ph.bs = Int32Array.from(bs);
    ph.nh = g.h;
    // Its favourite food is the one its gut is best at. The more its gut is made for that one food (and not spread over all of them), the more it
    // gets from it, and the worse the opposite colour sits with it: a food it cannot digest at all then makes it ill. A creature that evolves a
    // little digestion for that food loses the illness; one that digests everything a little has neither the bonus nor the illness.
    { const dg = ph.dig; let fav = 0, sum = 0; for (let i = 0; i < 6; i++) { sum += Math.max(0, dg[i]); if (dg[i] > dg[fav]) fav = i; }
      const love = clamp((dg[fav] / Math.max(0.01, sum) - 0.22) / 0.3, 0, 1), opp = (fav + 3) % 6, ill = love * clamp(1 - dg[opp] / G.K.foodDigestMin, 0, 1);
      ph.fav = fav; ph.love = love; ph.bane = ill > 0.15 ? opp : -1; ph.baneS = ill; }
    if (mvd) { ph.mv = mvd; ph.mvsp = mvd.sp; if (mvd.sp === 'mind') { ph.turn *= 1.25; ph.speed *= 1.08; } }
    return ph;
  };

  const tanh = Math.tanh;
  // run the brain: reads c.inp (12), fills c.out (5)
  G.think = function (c) {
    const ph = c.ph, inp = c.inp, hv = c.hv, out = c.out, bf = ph.bf, bv = ph.bv, bs = ph.bs, nh = ph.nh;
    if (!c.lw || c.lw.length !== bv.length) { c.lw = new Float32Array(bv.length); c.el = new Float32Array(bv.length); c.learned = 0; }
    const lw = c.lw, el = c.el;
    for (let n = 0; n < nh; n++) {
      let s = 0;
      for (let j = bs[n]; j < bs[n + 1]; j++) {
        const f = bf[j];
        s += (f < NIN ? inp[f] : hv[f - NIN]) * (bv[j] + lw[j]);
      }
      hv[n] = tanh(s);
      for (let j = bs[n]; j < bs[n + 1]; j++) { const f = bf[j]; el[j] = el[j] * 0.92 + (f < NIN ? inp[f] : hv[f - NIN]) * hv[n] * 0.08; }
    }
    for (let o = 0; o < NOUT; o++) {
      let s = 0;
      const idx = nh + o;
      for (let j = bs[idx]; j < bs[idx + 1]; j++) {
        const f = bf[j];
        s += (f < NIN ? inp[f] : hv[f - NIN]) * (bv[j] + lw[j]);
      }
      out[o] = o === 1 ? tanh(s) : (tanh(s) + 1) * 0.5;
      { const post = o === 1 ? out[1] : out[o] * 2 - 1; for (let j = bs[idx]; j < bs[idx + 1]; j++) { const f = bf[j]; el[j] = el[j] * 0.92 + (f < NIN ? inp[f] : hv[f - NIN]) * post * 0.08; } }
    }
  };

  // ── learning in one life ──
  // Every wire remembers how much it has just been in use (which sense was firing while which action was being taken). When something good happens
  // (a meal) the wires that were in use grow a little stronger; when something bad happens (it is hurt, it eats what makes it ill) they grow
  // weaker. So a creature gets better at what fed it and shyer of what hurt it, within its own life. What it learned is its own: its children
  // are born with the genes, not the lessons. But a brain that learns well finds more food, so brains that are good at learning are the ones passed on.
  G.LEARN = 0.15;
  G.learn = function (c, reward) {
    const lw = c.lw, el = c.el; if (!lw || !G.LEARN) return;
    const k = G.LEARN * clamp(reward, -1, 1); let sum = 0;
    for (let j = 0; j < lw.length; j++) { const v = lw[j] + k * el[j]; lw[j] = v > 0.9 ? 0.9 : v < -0.9 ? -0.9 : v; sum += Math.abs(lw[j]); }
    c.learned = sum; c.lessons = (c.lessons || 0) + 1;
  };

  // ── mutation ──
  // returns { g, muts: [{kind, i, text, big}] }
  G.mutate = function (parent, wild, idea) {
    const r = G.rand, n = G.randn;
    const m = G.K.mut * wild;
    const g = G.cloneGenome(parent);
    const muts = [];
    const note = function (kind, i, text, big) { muts.push({ kind: kind, i: i, text: text, big: !!big }); };
    const press = G.W && G.W.press ? G.W.press : null;
    // nudge traits
    // size answers the pond: danger favours bigger bodies, hunger and thin air smaller ones; chance does the rest
    if (r() < m * 2) { g.t[0] += n() * 1.1 - 1.5 * clamp((0.62 - (G.W && G.W.popR !== undefined ? G.W.popR : 1)) / 0.3, 0, 1) + (press && press.size ? 0.5 * press.size : 0); note('t', 0, 'size', false); }
    { const pr = G.W && G.W.popR !== undefined ? G.W.popR : 1; if (pr < 0.5 && r() < 0.1 * wild) { g.t[0] = Math.max(6, g.t[0] * 0.9); note('t', 0, 'grew smaller: there were too few of them', true); } }
    if (press && Math.abs(press.size) > 0.2 && r() < 0.06 * Math.abs(press.size) * wild) { const up = press.size > 0; g.t[0] = Math.max(5, g.t[0] * (up ? 1.12 : 0.9)); note('t', 0, (up ? 'grew bigger, ' : 'grew smaller, ') + (press.sizeWhy || 'to suit the pond'), true); }
    if (r() < m * 2) { g.t[1] += n() * 0.07; note('t', 1, 'speed', false); }
    if (r() < m * 2.5) { g.t[4] = (g.t[4] || 0.12) + n() * 0.14; note('t', 4, 'temper', false); }
    for (let i = 0; i < 15; i++) {
      if (r() < m * 1.2) { g.c[i] += n() * 0.17 + (press ? press.c[i] * 0.06 : 0); note('c', i, i < 6 ? 'diet' : i < 9 ? 'resistance' : 'tolerance', i < 6); }
    }
    // the body: its rules change, and the whole animal changes with them
    G.form.mutate(g.f, m, wild, press, function (text, big) { note('f', 0, text, big); });
    // organs invented for this pond can be picked up, resized and lost
    for (let i = 0; i < g.p.length; i++) if (r() < m) { g.p[i].s += n() * 0.2; note('p', i, 'organ size', false); }
    const orgs = G.W && G.W.organs ? G.W.organs : [];
    if (orgs.length && r() < 0.05 * wild && g.p.length < MAXP) {
      const k = 100 + orgs[Math.floor(r() * orgs.length)].id;
      if (!g.p.some(function (p) { return p.k === k; })) { g.p.push({ k: k, a: (r() - 0.5) * 6.28, s: 0.8 + r() * 0.5 }); note('p', g.p.length - 1, 'grew a ' + (G.partName ? G.partName(k) : 'new organ'), true); }
    }
    if (g.p.length && r() < 0.03 * wild) {
      const i = G.ri(0, g.p.length - 1);
      note('p', i, 'lost a ' + (G.partName ? G.partName(g.p[i].k) : 'organ'), true);
      g.p.splice(i, 1);
    }
    // the brain
    for (let i = 0; i < g.w.length; i++) {
      if (r() < m * 1.5) { g.w[i].v += n() * 0.35; note('w', i, 'brain wire', false); }
      else if (r() < m * 0.15) { g.w[i].v = n() * 1.0; note('w', i, 'brain rewired', false); }
    }
    if (r() < 0.22 * wild) {
      const f = r() < 0.7 ? G.ri(0, NIN - 1) : (g.h > 0 ? 100 + G.ri(0, g.h - 1) : G.ri(0, NIN - 1));
      let t = r() < 0.7 || g.h === 0 ? 200 + G.ri(0, NOUT - 1) : 100 + G.ri(0, g.h - 1);
      const w = W(f, t, n() * 0.9);
      if (validWire(w, g.h) && !g.w.some(function (x) { return x.f === f && x.t === t; })) {
        g.w.push(w); note('w', g.w.length - 1, 'new brain wire ' + INAMES[f < NIN ? f : 0] + '→' + ONAMES[t >= 200 ? t - 200 : 0], true);
      }
    }
    if (r() < 0.07 * wild && g.w.length > 4) {
      const i = G.ri(0, g.w.length - 1);
      note('w', i, 'brain wire cut', false);
      g.w.splice(i, 1);
    }
    if (r() < 0.045 * wild && g.h < MAXH && g.w.length) {
      // split a wire with a new brain cell
      const i = G.ri(0, g.w.length - 1), w = g.w[i];
      if (w.t >= 200) {
        // the new cell goes last in order and sits between the wire's source and its output
        const nh = g.h, old = w.t, ov = w.v;
        g.h++;
        g.w.splice(i, 1);
        g.w.push(W(w.f, 100 + nh, 1 + n() * 0.3));
        g.w.push(W(100 + nh, old, ov));
        note('h', nh, 'a new brain cell', true);
      }
    }
    // an idea from the mutation pool (offline or from the server)
    if (idea && r() < 0.18 * wild) applyIdea(g, idea, note);
    // a marvel is rare, and so is passing it on: most children of a carrier are born without it (see G.marvelInherits)
    if (g.mv && G.marvelInherits && !G.marvelInherits(g.mv)) g.mv = 0;
    G.validateGenome(g);
    return { g: g, muts: muts };
  };

  // an idea is written in the pond's nine pressures; the body answers each in its own way
  function applyIdea(g, idea, note) {
    if (!idea) return;
    const f = g.f, add = function (k) { if (f.rules.length < G.form.MAXR) f.rules.push({ on: -1, k: k, a: Math.floor(G.rand() * f.n), b: f.n - 1, e: 1 + Math.floor(G.rand() * 2), l: 0.8 + G.rand() * 0.8, w: 0.4 + G.rand() * 0.3, j: 2, g: (G.rand() - 0.5), c: (G.rand() - 0.5), t: Math.floor(G.rand() * 4), p: 0.5 }); };
    const parts = Array.isArray(idea.parts) ? idea.parts : [];
    for (let i = 0; i < parts.length && i < 3; i++) {
      const k = parts[i].k | 0;
      if (k === 1) add(1); else if (k === 2) add(G.rand() < 0.5 ? 2 : 7); else if (k === 3) f.shell = Math.min(1, f.shell + 0.4); else if (k === 4) f.en = Math.min(6, f.en + 1);
      else if (k === 5) f.glow = Math.min(1, f.glow + 0.5); else if (k === 6) f.venom = Math.min(1, f.venom + 0.5); else if (k === 7) { if (!f.tk) f.tk = 1 + Math.floor(G.rand() * 4); } else if (k === 8) add(3); else if (k === 0) f.mk = 2;
    }
    const segs = Array.isArray(idea.segs) ? idea.segs : [];
    for (let i = 0; i < segs.length && i < 2; i++) { const nn = segs[i].n | 0; if (nn >= 3) add(3); else if (nn === 2) add(0); else if (f.n < G.form.MAXN) f.n++; }
    if (idea.chem) for (let i = 0; i < idea.chem.length && i < 9; i++) if (idea.chem[i]) g.c[i] += +idea.chem[i];
    if (idea.size) g.t[0] += +idea.size;
    note('f', 0, 'idea: ' + (idea.name || 'a new design'), true);
  }

  // ── breeding: one-point crossover inside each block of genes; whole body features come from one parent or the other ──
  G.crossover = function (a, b) {
    const r = G.rand;
    const c = G.cloneGenome(a);
    let cut = G.ri(1, 2);
    for (let i = cut; i < 5; i++) c.t[i] = b.t[i];
    cut = G.ri(1, 14);
    for (let i = cut; i < 15; i++) c.c[i] = b.c[i];
    c.f = G.form.cross(a.f, b.f);
    const pa = Math.floor(a.p.length * r()), pb = Math.floor(b.p.length * r());
    c.p = a.p.slice(0, pa).map(function (p) { return { k: p.k, a: p.a, s: p.s }; })
      .concat(b.p.slice(pb).map(function (p) { return { k: p.k, a: p.a, s: p.s }; }));
    c.h = r() < 0.5 ? a.h : b.h;
    c.mv = a.mv && b.mv ? (r() < 0.5 ? a.mv : b.mv) : (a.mv || b.mv) ? (r() < 0.92 ? (a.mv || b.mv) : 0) : 0;      // a marvel is usually handed down, but not always
    const wa = Math.floor(a.w.length * r()), wb = Math.floor(b.w.length * r());
    c.w = a.w.slice(0, wa).map(function (w) { return { f: w.f, t: w.t, v: w.v }; })
      .concat(b.w.slice(wb).map(function (w) { return { f: w.f, t: w.t, v: w.v }; }));
    // remove duplicate wires (same from/to): the later one wins
    const seen = {};
    for (let i = c.w.length - 1; i >= 0; i--) {
      const key = c.w[i].f + '_' + c.w[i].t;
      if (seen[key]) c.w.splice(i, 1); else seen[key] = 1;
    }
    return G.validateGenome(c);
  };

  // ── distance between genomes, used to sort creatures into species: the body counts most ──
  G.features = function (g) {
    const v = G.form.features(g.f);
    v.push((g.t[0] - 10) / 6, (g.t[1] - 0.35) * 2);
    const org = [0, 0, 0, 0, 0];
    for (let i = 0; i < g.p.length; i++) org[g.p[i].k % 5] += 1;
    for (let i = 0; i < 5; i++) v.push(org[i] * 0.6);
    for (let i = 0; i < 6; i++) v.push(g.c[i] * 0.8);
    for (let i = 6; i < 15; i++) v.push((g.c[i] || 0) * 0.4);
    v.push(g.w.length * 0.04, g.h * 0.25, (g.t[4] || 0) * 1.0);
    return v;
  };
  /** what a creature looks like, as numbers (its body's looks and its size): see F.lookVec */
  G.lookVec = function (g) { const v = G.form.lookVec(g.f); v.push((g.t[0] - 10) / 10); return v; };
  G.fdist = function (a, b) {
    let s = 0;
    for (let i = 0; i < a.length; i++) { const d = a[i] - b[i]; s += d * d; }
    return Math.sqrt(s);
  };

  // compact save/restore of a genome (numbers rounded)
  G.packGenome = function (g) {
    const r2 = function (x) { return Math.round(x * 100) / 100; };
    const flat = []; for (let i = 0; i < g.w.length; i++) flat.push(g.w[i].f, g.w[i].t, Math.round(g.w[i].v * 100));
    return [g.t.map(r2), g.c.map(function (v) { return Math.round(v * 100); }), g.p.map(function (p) { return [p.k, r2(p.a), r2(p.s)]; }), g.h, flat, 2, 0, G.form.pack(g.f), g.mv | 0];
  };
  G.unpackGenome = function (a) {
    if (!Array.isArray(a) || a.length < 5) return null;
    try {
      const compact = a[5] === 2, wires = [];
      if (compact) { for (let i = 0; i + 2 < (a[4] || []).length; i += 3) wires.push({ f: a[4][i] | 0, t: a[4][i + 1] | 0, v: (+a[4][i + 2] || 0) / 100 }); }
      const g = {
        t: (a[0] || []).map(Number), c: (a[1] || []).map(function (v) { return compact ? v / 100 : +v; }),
        p: (a[2] || []).map(function (p) { return { k: p[0] | 0, a: +p[1] || 0, s: +p[2] || 1 }; }),
        h: a[3] | 0,
        w: compact ? wires : (a[4] || []).map(function (w) { return { f: w[0] | 0, t: w[1] | 0, v: +w[2] || 0 }; }),
        mv: a[8] | 0,
        f: a[7] ? G.form.unpack(a[7]) : null,      // a pond saved before bodies were grown from genes starts again from cells
      };
      if (g.t.length < 3 || g.c.length < 9) return null;
      for (let i = 0; i < 3; i++) if (!isFinite(g.t[i])) return null;
      for (let i = 0; i < 9; i++) if (!isFinite(g.c[i])) return null;
      return G.validateGenome(g);
    } catch (e) { return null; }
  };
})();
