// ── New builds, invented for this pond ──
// A build is how a body is carried: where its spine runs (a frog crouches, a seahorse stands curled, a scorpion arches its
// tail over its back) and how its legs are set. It is the one thing the genes could not reach by themselves, so the pond is
// given builds the way it is given new kinds of part: by the AI when there is a server, from its own stock when there is not.
// A build is then a gene like any other: a mutation may switch a body to it; the silhouette, head, growths, coat and
// colours stay the body's own; what the build gives and costs is measured; selection decides whether it stays.
//
// A build:  spine  3..7 points [x, y] from head to tail. x: forward is positive. y: height above the floor. The body's length
//                  is laid along this line.
//           legs   up to 4, each { u (0 at the shoulders .. 1 at the hips), knee [dx, dy], foot [dx, dy], thick, air }:
//                  knee from the hip, foot from the knee, in leg lengths, y up. `air`: it does not reach the floor (an arm).
//           stands does it stand on the floor (true) or float in the water (false)
//           girth  how thick the body is for its length (0.6 slender .. 1.5 stout)
//           fx     what it gives and costs: speed, agility, reach, senses, armour, attack
(function () {
  'use strict';
  const clamp = G.clamp;
  const ABIL = ['speed', 'agility', 'reach', 'senses', 'armour', 'attack'];
  const MAX = 3;          // few at a time, so the pond's own bodies keep their share; a build nobody follows makes room for the next
  G.keptPlans = [];          // builds that came along with kept creatures (ids from 100000 up)

  G.planOf = function (id) {
    const L = G.W ? G.W.plans : null;
    if (L) for (let i = 0; i < L.length; i++) if (L[i].id === id) return L[i];
    for (let i = 0; i < G.keptPlans.length; i++) if (G.keptPlans[i].id === id) return G.keptPlans[i];
    return null;
  };

  G.cleanPlan = function (raw) {
    if (!raw || typeof raw !== 'object' || !Array.isArray(raw.spine)) return null;
    const n = function (v, a, b, d) { v = +v; return isFinite(v) ? clamp(v, a, b) : d; };
    const spine = [];
    for (let i = 0; i < raw.spine.length && spine.length < 8; i++) { const p = raw.spine[i]; if (Array.isArray(p) && isFinite(+p[0]) && isFinite(+p[1])) spine.push([n(p[0], -1, 1, 0), n(p[1], 0, 1.4, 0.3)]); }
    if (spine.length < 3) return null;
    let len = 0; for (let i = 1; i < spine.length; i++) len += Math.hypot(spine[i][0] - spine[i - 1][0], spine[i][1] - spine[i - 1][1]);
    if (len < 0.35) return null;                                    // a dot is not a body
    const legs = [];
    if (Array.isArray(raw.legs)) for (let i = 0; i < raw.legs.length && legs.length < 4; i++) { const q = raw.legs[i]; if (!q || !Array.isArray(q.knee) || !Array.isArray(q.foot)) continue; legs.push({ u: n(q.u, 0, 1, 0.5), knee: [n(q.knee[0], -1.2, 1.2, 0), n(q.knee[1], -1.2, 1.2, -0.5)], foot: [n(q.foot[0], -1.2, 1.2, 0), n(q.foot[1], -1.4, 1.2, -0.5)], thick: n(q.thick, 0.4, 1.8, 1), air: q.air ? 1 : 0 }); }
    const f = raw.fx && typeof raw.fx === 'object' ? raw.fx : {}, fx = {};
    let pos = 0, neg = 0;
    for (let i = 0; i < 6; i++) { let v = +f[ABIL[i]]; if (!isFinite(v)) v = 0; v = clamp(v, -0.3, 0.45); fx[ABIL[i]] = v; if (v > 0) pos += v; else neg -= v; }
    if (pos > 0.7) for (let i = 0; i < 6; i++) if (fx[ABIL[i]] > 0) fx[ABIL[i]] *= 0.7 / pos;
    if (neg < 0.08) { let worst = 0; for (let i = 1; i < 6; i++) if (fx[ABIL[i]] < fx[ABIL[worst]]) worst = i; fx[ABIL[worst]] = -0.12; neg = 0; for (let i = 0; i < 6; i++) if (fx[ABIL[i]] < 0) neg -= fx[ABIL[i]]; }      // nothing is free
    pos = 0; for (let i = 0; i < 6; i++) if (fx[ABIL[i]] > 0) pos += fx[ABIL[i]];
    if (pos > neg + 0.06) for (let i = 0; i < 6; i++) if (fx[ABIL[i]] > 0) fx[ABIL[i]] *= (neg + 0.06) / pos;
    const name = String(raw.name || 'New build').replace(/[<>"]/g, '').trim().slice(0, 22) || 'New build';
    return { name: name, noun: (String(raw.noun || '').replace(/[^A-Za-z\-]/g, '').slice(0, 14) || name.split(' ').pop()).replace(/^./, function (c) { return c.toUpperCase(); }),
      note: String(raw.note || '').replace(/[<>]/g, '').slice(0, 110), spine: spine, legs: legs, stands: raw.stands !== false, girth: n(raw.girth, 0.6, 1.5, 1), fx: fx, by: String(raw.by || raw.model || '').slice(0, 60) };
  };

  G.addPlan = function (def, quiet) {
    const W = G.W, p = G.cleanPlan(def);
    if (!p) return null;
    if (W.plans.some(function (x) { return x.name.toLowerCase() === p.name.toLowerCase(); })) return null;
    if (W.plans.length >= MAX) {
      const used = {}; for (let i = 0; i < W.cre.length; i++) if (W.cre[i].g.f.pl) used[W.cre[i].g.f.pl] = 1;
      let at = -1; for (let i = 0; i < W.plans.length; i++) if (!used[W.plans[i].id]) { at = i; break; }
      if (at < 0) return null;
      W.plans.splice(at, 1);                                        // forget the oldest build nobody follows
    }
    p.id = W.nextPlan++; p.gen = def.gen || W.gen;
    W.plans.push(p);
    if (!quiet) G.emit('plan-new', p);
    return p;
  };

  // ── the pond's own stock (no server needed) ──
  const OWN = [
    { name: 'Hopper', noun: 'Hopper', note: 'It crouches on big folded hind legs and leaps.', spine: [[0.3, 0.3], [0.12, 0.3], [-0.1, 0.2], [-0.26, 0.09]], legs: [{ u: 0.12, knee: [0.05, -0.5], foot: [0.2, -0.5], thick: 0.8 }, { u: 0.8, knee: [0.9, 0.7], foot: [-0.5, -0.9], thick: 1.6 }], stands: true, girth: 1.25, fx: { agility: 0.3, speed: 0.12, armour: -0.12 } },
    { name: 'Curler', noun: 'Curler', note: 'It hangs upright in the water, its tail curled under it.', spine: [[0.14, 0.95], [0.06, 0.8], [-0.02, 0.55], [0.04, 0.3], [0.13, 0.15], [0.05, 0.04], [-0.06, 0.12]], legs: [], stands: false, girth: 0.85, fx: { agility: 0.2, senses: 0.2, speed: -0.2 } },
    { name: 'Stinger', noun: 'Stinger', note: 'Low on many legs, its tail arched high over its back.', spine: [[0.5, 0.2], [0.1, 0.2], [-0.3, 0.2], [-0.46, 0.34], [-0.46, 0.56], [-0.36, 0.68]], legs: [{ u: 0.08, knee: [0.5, 0.5], foot: [0.4, -0.5], thick: 0.7 }, { u: 0.22, knee: [0.1, 0.6], foot: [0.1, -0.5], thick: 0.7 }, { u: 0.38, knee: [-0.4, 0.5], foot: [-0.3, -0.5], thick: 0.7 }], stands: true, girth: 0.9, fx: { attack: 0.4, speed: -0.15 } },
    { name: 'Slider', noun: 'Slider', note: 'No legs at all: it glides on its belly, head held up.', spine: [[0.4, 0.34], [0.26, 0.2], [0.02, 0.12], [-0.36, 0.1]], legs: [], stands: true, girth: 1.3, fx: { armour: 0.35, speed: -0.25 } },
    { name: 'Strider', noun: 'Strider', note: 'Upright on two long thin legs, head carried high and forward.', spine: [[0.2, 0.94], [0.13, 0.74], [0.0, 0.56], [-0.2, 0.5], [-0.38, 0.54]], legs: [{ u: 0.5, knee: [-0.06, -0.5], foot: [0.12, -0.5], thick: 0.65 }], stands: true, girth: 0.95, fx: { speed: 0.25, senses: 0.15, armour: -0.15 } },
    { name: 'Reacher', noun: 'Reacher', note: 'A very long neck lifts its head far above its body.', spine: [[0.3, 1.02], [0.26, 0.76], [0.2, 0.5], [0.0, 0.42], [-0.3, 0.42]], legs: [{ u: 0.5, knee: [0, -0.5], foot: [0, -0.5], thick: 0.9 }, { u: 0.92, knee: [0, -0.5], foot: [0, -0.5], thick: 0.9 }], stands: true, girth: 0.8, fx: { reach: 0.45, agility: -0.2 } },
    { name: 'Bounder', noun: 'Bounder', note: 'It sits back on a heavy tail and springs off great hind legs.', spine: [[0.1, 0.86], [0.05, 0.62], [-0.08, 0.36], [-0.3, 0.16], [-0.5, 0.1]], legs: [{ u: 0.2, knee: [0.14, -0.1], foot: [0.1, -0.18], thick: 0.5, air: true }, { u: 0.62, knee: [0.26, 0.04], foot: [-0.04, -0.8], thick: 1.5 }], stands: true, girth: 1.1, fx: { speed: 0.3, agility: 0.18, reach: -0.12 } },
    { name: 'Lurker', noun: 'Lurker', note: 'It rears up and holds two folded arms ready to strike.', spine: [[0.25, 0.82], [0.2, 0.62], [0.05, 0.44], [-0.3, 0.36]], legs: [{ u: 0.12, knee: [0.28, 0.22], foot: [0.16, -0.32], thick: 0.85, air: true }, { u: 0.55, knee: [0.06, 0.2], foot: [0.1, -0.5], thick: 0.6 }, { u: 0.8, knee: [-0.04, 0.2], foot: [-0.08, -0.5], thick: 0.6 }], stands: true, girth: 0.75, fx: { attack: 0.35, reach: 0.2, speed: -0.2 } },
  ];
  G.offlinePlan = function () {
    const r = G.rand, W = G.W, have = W ? W.plans.map(function (p) { return p.name; }) : [];
    let pick = null;
    for (let t = 0; t < 8 && !pick; t++) { const c = OWN[Math.floor(r() * OWN.length)]; if (have.indexOf(c.name) < 0) pick = c; }
    if (!pick) return null;
    // the same idea never comes out the same twice
    const sx = 0.88 + r() * 0.24, sy = 0.85 + r() * 0.3, fx = {};
    for (const k in pick.fx) fx[k] = pick.fx[k] * (0.75 + r() * 0.5);
    return { name: pick.name, noun: pick.noun, note: pick.note, spine: pick.spine.map(function (p) { return [p[0] * sx, p[1] * sy]; }), legs: pick.legs.map(function (q) { return { u: q.u, knee: q.knee.slice(), foot: q.foot.slice(), thick: q.thick * (0.85 + r() * 0.3), air: q.air }; }), stands: pick.stands, girth: pick.girth * (0.85 + r() * 0.3), fx: fx, by: '' };
  };

  /** a plain animal that follows this build, to show it */
  G.planDemo = function (p, hue) {
    const f = G.form.cell(hue === undefined ? 190 : hue);
    f.n = 5; f.prof = [0.8, 1.1, 1, 0.8, 0.45]; f.en = 2; f.es = 0.5; f.tk = 1; f.mk = 1; f.hue2 = 120; f.pl = p.id;
    f.rules = p.legs.length ? [{ k: 0, a: 1, b: 3, e: 2, l: 1, w: 0.5, j: 2, g: 0.2, c: 0, t: 0, p: 0.5, on: -1 }] : [];
    return G.form.fix(f);
  };

  // now and then the pond is given one new build to try
  let busy = false;
  G.planTick = function (gen) {
    const W = G.W;
    if (!W || W.title || gen < 20 || gen % 11 !== 5) return;
    const live = G.mode === 'play' && !G.catching && G.ai && G.ai.provider === 'server' && G.ai.available && G.ai.available();
    if (!live) { const p = G.offlinePlan(); if (p) G.addPlan(p); return; }
    if (busy || !G.ai.allow('plan')) { if (!busy && W.plans.length < 2) { const p = G.offlinePlan(); if (p) G.addPlan(p); } return; }
    busy = true;
    const info = { pressures: W.press ? W.press.list.slice(0, 6) : [], water: G.envText ? G.envText(W) : '', commonBodies: (W.kinds || []).slice(0, 3).map(function (k) { return k[0]; }), have: W.plans.map(function (p) { return p.name; }) };
    G.ai.ask('plan', info).then(function (p) { busy = false; if (G.W !== W) return; if (!p || !G.addPlan(p)) { const o = G.offlinePlan(); if (o) G.addPlan(o); } }, function () { busy = false; });
  };
})();
