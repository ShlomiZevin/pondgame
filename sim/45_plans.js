// ── Shapes of body, imagined for this pond ──
// Chance alone reshapes bodies a little at a time. Now and then the pond is also handed a whole SHAPE of body to try: a
// few masses and how they join. The AI imagines it, and it does so looking at the pond: what was dropped in, what is
// killing, what the water is like, what lives here now and how the eye for beauty graded it, which earlier ideas caught on
// and which the player chose to keep. It is told plainly what the game is for: creatures somebody would love to collect.
// What it offers is only an offer. It is drawn and looked at before it is let in (see the judge), a mutation may then bear a
// child some way towards it, and from there it is ordinary genetics: it spreads if it helps or is admired, and dies out if not.
(function () {
  'use strict';
  const clamp = G.clamp;
  const MAX = 3;             // few at a time: a shape nobody follows makes room for the next
  G.keptPlans = [];          // shapes that came along with kept creatures (ids from 100000 up)

  G.planOf = function (id) {
    const L = G.W ? G.W.plans : null;
    if (L) for (let i = 0; i < L.length; i++) if (L[i].id === id) return L[i];
    for (let i = 0; i < G.keptPlans.length; i++) if (G.keptPlans[i].id === id) return G.keptPlans[i];
    return null;
  };
  G.cleanPlan = function (raw) {
    if (!raw || typeof raw !== 'object') return null;
    // a body as it is kept (angles in radians) or as it was imagined (angles in degrees, as people think of them)
    let bd = null;
    if (raw.bd && Array.isArray(raw.bd.m)) { const f = { bd: JSON.parse(JSON.stringify(raw.bd)), rules: [] }; G.body.fix(f); bd = f.bd; }
    else bd = G.body.clean(raw.body || raw);
    if (!bd) return null;
    const n = function (v) { v = +v; return isFinite(v) ? clamp(v, 0, 0.3) : 0; };
    const rs = Array.isArray(raw.res) ? raw.res : raw.res && typeof raw.res === 'object' ? [raw.res.heat, raw.res.cold, raw.res.poison] : [];
    const name = String(raw.name || 'New shape').replace(/[<>"]/g, '').trim().slice(0, 22) || 'New shape';
    let face = null; if (raw.face && typeof raw.face === 'object') { const q = function (v, a, b) { v = +v; return isFinite(v) ? clamp(v, a, b) : undefined; }; face = { es: q(raw.face.es, 0.34, 0.9), ep: q(raw.face.ep, 0.36, 0.78), ey: q(raw.face.ey, -0.2, 0.36), eg: q(raw.face.eg, 0.3, 0.8), bl: q(raw.face.bl, 0, 1), sm: q(raw.face.sm, -0.2, 1), hd: q(raw.face.hd, 0.7, 2.5) }; }
    const kit = Array.isArray(raw.kit) ? raw.kit.filter(function (k) { return k === 'legs' || k === 'arms'; }).slice(0, 2) : null;
    return { face: face, kit: kit && kit.length ? kit : null, name: name, noun: (String(raw.noun || '').replace(/[^A-Za-z\-]/g, '').slice(0, 14) || name.split(' ').pop()).replace(/^./, function (c) { return c.toUpperCase(); }),
      note: String(raw.note || '').replace(/[<>]/g, '').slice(0, 120), because: String(raw.because || '').replace(/[<>]/g, '').slice(0, 90),
      bd: bd, res: [n(rs[0]), n(rs[1]), n(rs[2])], by: String(raw.by || raw.model || '').slice(0, 60) };
  };
  G.addPlan = function (def, quiet) {
    const W = G.W, p = G.cleanPlan(def);
    if (!p) return null;
    if (W.plans.some(function (x) { return x.name.toLowerCase() === p.name.toLowerCase(); })) return null;
    if (W.plans.length >= MAX) {
      const used = {}; for (let i = 0; i < W.cre.length; i++) if (W.cre[i].g.f.pl) used[W.cre[i].g.f.pl] = (used[W.cre[i].g.f.pl] || 0) + 1;
      let at = -1, few = 1e9; for (let i = 0; i < W.plans.length; i++) { const u = used[W.plans[i].id] || 0; if (u < few && u < W.cre.length * 0.08) { few = u; at = i; } }
      if (at < 0) return null;
      G.museNote(W.plans[at].name, few ? 'only ' + few + ' followed it' : 'nobody followed it');
      W.plans.splice(at, 1);
    }
    p.id = W.nextPlan++; p.gen = def.gen || W.gen;
    W.plans.push(p);
    if (!quiet) G.emit('plan-new', p);
    return p;
  };
  /** what became of an idea: told to the AI the next time it is asked, so it learns this pond */
  G.museNote = function (name, what) { const W = G.W; if (!W) return; W.museLog = W.museLog || []; W.museLog.push({ g: W.gen, name: String(name).slice(0, 30), what: String(what).slice(0, 90) }); if (W.museLog.length > 10) W.museLog.shift(); };

  /** the pond as the AI is told of it: what was added, what happened, what kills, who lives here and how they are liked */
  G.worldBrief = function () {
    const W = G.W, out = { goal: 'creatures a person would love to collect: cute, clean, characterful, like a Pixar character; beauty is graded and decides who breeds' };
    out.things = W.zones.slice(-6).map(function (z) { const bad = G.isBad && G.isBad(z); return { name: z.word, what: (z.note || '').slice(0, 80), harmful: !!bad, alive: z.alive > 0.25, weakTo: bad && G.WEAK ? G.WEAK[z.weak].id : undefined, killed: z.deaths || 0 }; });
    out.events = (W.events || []).slice(-4).map(function (e) { return e.name + (e.note ? ': ' + String(e.note).slice(0, 70) : ''); });
    out.pressures = W.press ? W.press.list.slice(0, 6) : [];
    out.water = G.envText ? G.envText(W) : '';
    const live = W.species.filter(function (s) { return !s.extinct && s.rep && s.n >= 3; }).sort(function (a, b) { return b.n - a.n; }).slice(0, 4);
    out.creatures = live.map(function (s) { return { kind: G.form.kind(s.rep.f).full, share: Math.round(100 * s.n / Math.max(1, W.cre.length)) + '%', body: G.form.facts(s.rep.f).slice(0, 8).join('; '), beauty: s.judge ? Math.round(s.judge.score * 10) + '/10 (' + s.judge.why + ')' : 'not graded yet' }; });
    out.keptByPlayer = (G.collection || []).slice(-3).map(function (it) { return it.kind; });
    const tried = [];
    const share = function (test) { let n = 0; for (let i = 0; i < W.cre.length; i++) if (test(W.cre[i].g.f)) n++; return Math.round(100 * n / Math.max(1, W.cre.length)) + '% of the pond has it'; };
    (W.plans || []).forEach(function (p) { tried.push({ idea: p.name + ' (a shape of body)', now: share(function (f) { return f.pl === p.id; }) }); });
    (W.designs || []).forEach(function (d) { tried.push({ idea: d.name + ' (a part)', now: share(function (f) { return f.rules.some(function (q) { return q.k === 8 && q.t === d.id; }); }) }); });
    (W.museLog || []).slice(-5).forEach(function (m) { tried.push({ idea: m.name, now: 'gone: ' + m.what }); });
    out.earlierIdeas = tried.slice(-10);
    return out;
  };

  // ── the pond's own stock, for when the AI is not asked (angles in degrees: 0 right, 90 up, 180 left, 270 down) ──
  // radii go clockwise from the right: right, lower right, bottom right, bottom left, lower left, left, upper left, top left, top right, upper right
  const ROUND = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1];
  const PLUSH_FACE = { es: 0.72, ep: 0.62, ey: 0.0, eg: 0.56, bl: 0.7, sm: 0.85, hd: 1.7 };
  const OWN = [
    { plush: true, name: 'Snowball', noun: 'Snowball', note: 'A round body with a smaller round head set on top.', body: { v: 0, e: 1, m: [{ r: ROUND }, { r: ROUND, s: 0.72, on: 0, at: 90, d: 0.85 }] } },
    { name: 'Toadstool', noun: 'Toadstool', note: 'A wide cap over a narrow stem, the face on the stem.', body: { v: 0, e: 0, m: [{ r: [0.8, 0.9, 1.2, 1.2, 0.9, 0.8, 0.85, 1.1, 1.1, 0.85] }, { r: [1.5, 1.1, 0.7, 0.7, 1.1, 1.5, 1.2, 0.9, 0.9, 1.2], s: 1.2, on: 0, at: 90, d: 0.62 }] } },
    { plush: true, name: 'Eared One', noun: 'Earling', note: 'One round body with a pair of big round ears.', body: { v: 0, e: 0, m: [{ r: ROUND }, { r: ROUND, s: 0.5, on: 0, at: 52, d: 0.9, pr: 1 }] } },
    { name: 'Periscope', noun: 'Peeper', note: 'A low wide body, and the face held high on a stalk.', body: { v: 0, e: 1, m: [{ r: [1.4, 1.1, 0.8, 0.8, 1.1, 1.4, 1.1, 0.8, 0.8, 1.1] }, { r: ROUND, s: 0.6, on: 0, at: 90, d: 1.45 }] } },
    { name: 'Bead String', noun: 'Beadling', note: 'Three beads in a row, the biggest in front.', body: { v: 1, e: 0, m: [{ r: ROUND }, { r: ROUND, s: 0.82, on: 0, at: 180, d: 0.9 }, { r: ROUND, s: 0.62, on: 1, at: 180, d: 0.9 }] } },
    { name: 'Twin Bells', noun: 'Twin', note: 'A small middle with a big round body out on each side.', body: { v: 0, e: 0, m: [{ r: ROUND }, { r: ROUND, s: 0.95, on: 0, at: -8, d: 1.0, pr: 1 }] } },
    { name: 'Bell', noun: 'Bell', note: 'A dome, wide and full above, cut short below.', body: { v: 0, e: 0, m: [{ r: [1.3, 1.0, 0.65, 0.65, 1.0, 1.3, 1.25, 1.15, 1.15, 1.25] }] } },
    { name: 'Nodder', noun: 'Nodder', note: 'A round body, the head carried forward on a neck, a small rump behind.', body: { v: 1, e: 1, m: [{ r: ROUND }, { r: ROUND, s: 0.62, on: 0, at: 48, d: 1.3 }, { r: ROUND, s: 0.5, on: 0, at: 190, d: 0.8 }] } },
    { name: 'Pear', noun: 'Pearling', note: 'Narrow above and full below, like a ripe pear.', body: { v: 0, e: 0, m: [{ r: [1.1, 1.25, 1.2, 1.2, 1.25, 1.1, 0.85, 0.8, 0.8, 0.85] }] } },
    { name: 'Clover', noun: 'Clover', note: 'A body of three soft lobes.', body: { v: 0, e: 0, m: [{ r: ROUND, lb: 3, la: 0.2 }] } },
    // the proportions of a loved character: a big head with a big face, a small body beneath it
    { plush: true, name: 'Bean Baby', noun: 'Beanling', note: 'A big round head on a small round body.', body: { v: 0, e: 0, m: [{ r: ROUND }, { r: ROUND, s: 0.66, on: 0, at: 270, d: 0.82 }] } },
    { plush: true, name: 'Plush Cub', noun: 'Cub', note: 'A big head with two round ears and a small body.', body: { v: 0, e: 0, m: [{ r: ROUND }, { r: ROUND, s: 0.68, on: 0, at: 270, d: 0.8 }, { r: ROUND, s: 0.34, on: 0, at: 55, d: 0.95, pr: 1 }] } },
    { plush: true, name: 'Little Hero', noun: 'Hero', note: 'A big head, a small pear body and two round mitts.', body: { v: 0, e: 0, m: [{ r: ROUND }, { r: [1, 1.1, 1.15, 1.15, 1.1, 1, 0.92, 0.9, 0.9, 0.92], s: 0.74, on: 0, at: 270, d: 0.8 }, { r: ROUND, s: 0.3, on: 1, at: 345, d: 0.95, pr: 1 }] } },
    { plush: true, name: 'Pudgy', noun: 'Pudge', note: 'A fat round body with a face almost as big as itself.', body: { v: 0, e: 1, m: [{ r: [1, 1.1, 1.15, 1.15, 1.1, 1, 0.95, 0.92, 0.92, 0.95] }, { r: ROUND, s: 0.86, on: 0, at: 90, d: 0.7 }] } },
    { plush: true, name: 'Sleepy Bun', noun: 'Bun', note: 'A wide soft bun of a head over a tiny body.', body: { v: 0, e: 0, m: [{ r: [1.2, 1.05, 0.95, 0.95, 1.05, 1.2, 1.05, 0.95, 0.95, 1.05] }, { r: ROUND, s: 0.55, on: 0, at: 270, d: 0.78 }] } },
  ];
  G.offlinePlan = function () {
    const r = G.rand, W = G.W, have = W ? W.plans.map(function (p) { return p.name; }) : [];
    let pick = null;
    // the stock leans to the plush ones: a big face over a small soft body, with the face settings that go with it
    const pool = r() < 0.65 ? OWN.filter(function (c) { return c.plush; }) : OWN;
    for (let t = 0; t < 12 && !pick; t++) { const c = pool[Math.floor(r() * pool.length)]; if (have.indexOf(c.name) < 0) pick = c; }
    for (let t = 0; t < 10 && !pick; t++) { const c = OWN[Math.floor(r() * OWN.length)]; if (have.indexOf(c.name) < 0) pick = c; }
    if (!pick) return null;
    // the same idea never comes out the same twice
    const b = JSON.parse(JSON.stringify(pick.body));
    for (let i = 0; i < b.m.length; i++) { const q = b.m[i]; q.r = q.r.map(function (v) { return v * (0.93 + r() * 0.14); }); if (i) { q.s *= 0.88 + r() * 0.24; q.d = (q.d || 1) * (0.92 + r() * 0.16); } }
    return { name: pick.name, noun: pick.noun, note: pick.note, because: '', body: b, by: '', face: pick.plush ? PLUSH_FACE : null, kit: pick.plush ? ['legs', 'arms'] : null };
  };
  /** a plain animal of this shape, to show it */
  G.planDemo = function (p, hue) {
    const f = G.form.cell(hue === undefined ? 190 : hue);
    f.bd = G.body.clone(p.bd); f.en = 2; f.es = 0.5; f.hue2 = 120; f.pl = p.id || 0;
    return G.form.fix(f);
  };

  // now and then the pond is handed one new shape of body to try
  let busy = false;
  G.planTick = function (gen) {
    const W = G.W;
    if (!W || W.title || gen < 4 || gen % 9 !== 4) return;
    const live = G.mode === 'play' && !G.catching && G.ai && G.ai.provider === 'server' && G.ai.available && G.ai.available();
    if (!live) { const p = G.offlinePlan(); if (p) G.addPlan(p); return; }
    if (busy || !G.ai.allow('plan')) { if (!busy && W.plans.length < 2) { const p = G.offlinePlan(); if (p) G.addPlan(p); } return; }
    busy = true;
    const info = G.worldBrief(); info.have = W.plans.map(function (p) { return p.name; });
    const own = function () { const o = G.offlinePlan(); if (o) G.addPlan(o); };
    G.ai.ask('plan', info).then(function (raw) {
      const p = raw ? G.cleanPlan(raw) : null;
      if (G.W !== W) { busy = false; return; }
      if (!p) { busy = false; own(); return; }
      // it is drawn and looked at before it is let in
      const demo = [G.planDemo(p, W.hue0)];
      const top = W.species.filter(function (s) { return !s.extinct && s.rep; }).sort(function (a, b) { return b.n - a.n; })[0];
      if (top) { const f2 = G.form.clone(top.rep.f); G.body.adopt(f2, p.bd, 1); demo.push(G.form.fix(f2)); }
      G.lookOver(demo, 'a new shape of body called "' + p.name + '": ' + p.note).then(function (v) {
        busy = false;
        if (G.W !== W) return;
        if (v && v.score < 0.42) { G.museNote(p.name, 'never let in: when drawn, the eye for beauty gave it ' + Math.round(v.score * 10) + '/10 (' + v.why + ')'); G.emit('idea-dropped', p.name, v); own(); return; }
        const made = G.addPlan(raw);
        if (made && v) made.seen = { score: v.score, why: v.why };
        if (!made) own();
      }, function () { busy = false; G.addPlan(raw); });
    }, function () { busy = false; });
  };
})();
