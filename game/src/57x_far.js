// ── The far ponds, and going to them ──
// Space is full of other ponds (58_beyond.js draws them). Each is made from where it lies, so it is the same every time you look: its name, its colour, how
// many kinds live in it, and what its people are like (every pond has a character of its own: one is shy, one is led, one is merry).
// A pond's creatures may build a SHIP (54d_build.js). A ship carries a few of them across the dark to a far pond. On arriving, that pond is a real pond:
// its kinds are alive in it, your crew is set down among them as strangers (54g_society.js: they are looked at, followed, left alone or driven off), and
// for as long as you stay you play there as you do at home, with as many ADDs as the ship could carry. When the ship sails home, those of yours who stay
// are your OUTPOST there, and one creature may come back with the ship: one of your own, or one of theirs.
// While you are away your own pond waits exactly as you left it (it is kept as a save and brought back: the same road a pond takes when the game is closed
// and opened again), and a far pond you have visited waits the same way for your next visit.
(function () {
  'use strict';
  const clamp = G.clamp;
  const F = G.far = { origin: null, visiting: null, book: {}, swapping: false, homeBlob: null, _kinds: {}, _pool: null, _defs: null };
  const hash = F.hash = function (i, j, k) { let h = (i * 374761393 + j * 668265263 + k * 2147483647) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; h ^= h >>> 16; return (h >>> 0) / 4294967296; };
  const A1 = ['Lu', 'Mar', 'Vey', 'Tor', 'Ash', 'Nim', 'Oro', 'Sel', 'Kai', 'Bre', 'Dun', 'Ila', 'Quo', 'Zet', 'Wyn', 'Thal', 'Eri', 'Mo', 'Pell', 'Yar'], A2 = ['a', 'e', 'i', 'o', 'u', 'an', 'el', 'or', 'is', ''], A3 = ['mere', 'pool', 'deep', 'water', 'hollow', 'tarn', 'well', 'glass', 'shallows', 'reach'];
  F.nameOf = function (i, j) { return A1[(hash(i, j, 11) * A1.length) | 0] + A2[(hash(i, j, 12) * A2.length) | 0] + ' ' + A3[(hash(i, j, 13) * A3.length) | 0].replace(/^./, function (m) { return m.toUpperCase(); }); };
  F.key = function (p) { return p.i + ',' + p.j; };
  /** what lies in one cell of space (cells are counted from your own pond, which is 0,0): a far pond, an empty place, or nothing */
  F.cell = function (i, j) {
    if (!i && !j) return null;
    const roll = hash(i, j, 1); if (roll > 0.64) return null;
    if (roll > 0.5) return { free: true, i: i, j: j, hue: 48, name: 'An empty place', kinds: 0, size: 1 };
    return { i: i, j: j, hue: (150 + hash(i, j, 5) * 170) % 360, name: F.nameOf(i, j), kinds: 2 + ((hash(i, j, 6) * 3) | 0), rings: hash(i, j, 7) < 0.45, moons: (hash(i, j, 8) * 3) | 0, size: 0.85 + 0.55 * hash(i, j, 4) };
  };
  /** how far a cell's pond sits from the middle of its cell, in cells */
  F.jit = function (i, j) { return (!i && !j) ? [0, 0] : [(hash(i, j, 2) - 0.5) * 0.5, (hash(i, j, 3) - 0.5) * 0.5]; };
  /** what a far pond's people are like: each of the six traits of character has its own level there */
  F.moodOf = function (p) { const m = []; for (let t = 0; t < 6; t++) m.push(0.08 + 0.78 * hash(p.i, p.j, 200 + t)); return m; };
  F.moodWords = function (p) { const m = F.moodOf(p), W = [[m[0], 'used to being led'], [m[1], 'shy of strangers'], [m[2], 'kindly'], [m[3], 'clever'], [m[4], 'merry'], [m[5], 'great talkers']].sort(function (a, b) { return b[0] - a[0]; }); return W[0][1] + ' and ' + W[1][1] + (m[1] < 0.3 ? ', and bold with strangers' : ''); };

  // the bodies far kinds are made from: bodies your own pond has grown (so they are of this world), each in the far pond's own colours
  const clone = function (o) { return JSON.parse(JSON.stringify(o)); };
  F.pool = function () {
    if (F._pool && (F.visiting || F._poolFor === G.W)) return F._pool;
    if (F.visiting) return F._pool || [];
    const W = G.W, pool = (W.species || []).filter(function (s) { return s.rep && s.rep.f && s.rep.f.bd && !s.extinct; }).map(function (s) { return s.rep; }).concat((W.cre || []).filter(function (c) { return c.g.f.bd; }).slice(0, 12).map(function (c) { return c.g; }));
    F._pool = pool.map(G.cloneGenome); F._poolFor = W; F._kinds = {};
    F._defs = { organs: clone(W.organs || []), designs: clone(W.designs || []), plans: clone(W.plans || []), nextOrgan: W.nextOrgan || 1, nextDesign: W.nextDesign || 1, nextPlan: W.nextPlan || 1 };
    return F._pool;
  };
  /** the kinds of a far pond, as genomes (the same ones every time, for as long as this pond is being played) */
  F.kindsOf = function (p) {
    const key = F.key(p); if (F._kinds[key]) return F._kinds[key];
    const pool = F.pool(), out = []; if (!pool.length || !p.kinds) return out;
    for (let k = 0; k < p.kinds; k++) { const g = G.cloneGenome(pool[(hash(p.i, p.j, 100 + k) * pool.length) | 0]), hue = (p.hue + 140 * k + 360 * hash(p.i, p.j, 110 + k) * 0.3) % 360;
      g.f.hue = hue; if (g.f.hue2 !== undefined) g.f.hue2 = (hash(p.i, p.j, 120 + k) - 0.5) * 240; g.t[2] = hue; g.mv = 0; out.push(g); }
    { const keys = Object.keys(F._kinds); if (keys.length > 80) delete F._kinds[keys[0]]; }
    return (F._kinds[key] = out);
  };
  /** a far pond comes alive: a new world, with that pond's kinds living in it and its people's own character */
  F.make = function (p) {
    const kinds = F.kindsOf(p), mood = F.moodOf(p), defs = F._defs;
    G.newWorld({ seed: 1 + ((hash(p.i, p.j, 31) * 4e9) >>> 0) });
    const W = G.W; W.gen = 20 + ((hash(p.i, p.j, 32) * 60) | 0);
    if (defs) { W.organs = clone(defs.organs); W.designs = clone(defs.designs); W.plans = clone(defs.plans); W.nextOrgan = defs.nextOrgan + 500; W.nextDesign = defs.nextDesign + 500; W.nextPlan = defs.nextPlan + 500; }      // (what is invented there is numbered apart from what is invented at home)
    kinds.forEach(function (g0, k) {
      const n = 14 + ((hash(p.i, p.j, 40 + k) * 9) | 0), cx = W.ww * (0.22 + 0.56 * hash(p.i, p.j, 50 + k)), cy = W.wh * (0.42 + 0.4 * hash(p.i, p.j, 60 + k));
      for (let i = 0; i < n; i++) {
        const g = i ? G.mutate(G.cloneGenome(g0), 0.5, null).g : G.cloneGenome(g0); g.mv = 0; g.s = mood.map(function (m) { return clamp(m + G.randn() * 0.12, 0, 1); });
        const c = G.makeCreature(g, null, null, []); c.x = c.px = clamp(cx + G.randn() * 130, 30, W.ww - 30); c.y = c.py = clamp(cy + G.randn() * 100, 30, W.wh - 30); c.E = c.ph.Emax * 0.7; c.P = c.ph.Emax * 0.4; c.age = (G.rand() * 3) | 0; c.snap = G.snapOf ? G.snapOf(c) : null; W.cre.push(c);
      }
    });
    if (G.updateSpecies) G.updateSpecies();
    return W;
  };

  // ── the ship ──
  const whole = function (w) { if (!w || !w.bp || w.fall || w.ruin) return false; const n = G.buildCount ? G.buildCount(w) : [1, 1, 1]; return n[0] >= n[2]; };
  /** a ship standing whole in the pond you are in, or null */
  F.shipOf = function () { const Wk = (G.W && G.W.works) || []; for (let i = Wk.length - 1; i >= 0; i--) if (Wk[i].bp && Wk[i].bp.type === 'ship' && !Wk[i].away && whole(Wk[i])) return Wk[i]; return null; };
  /** the far pond you are IN right now (null at home, and null while you are watching your own pond with the ship away) */
  F.there = function () { return F.visiting && F.here !== 'home' ? F.visiting : null; };
  /** how many a ship carries, and how many times you may ADD where it lands: a bigger ship, more of both */
  F.holdOf = function (ship) { const n = ship && ship.bp ? ship.bp.P.length : 6; return { crew: clamp(2 + Math.floor(n / 4), 2, 6), adds: clamp(1 + Math.floor(n / 6), 1, 4) }; };
  /** who goes aboard is theirs to decide: the leader of the ship's builders, then those who built it with their own hands, then those of their kind nearest it.
   *  Each comes back as the creature, with `c.crewWhy` saying why it goes ('their leader', 'built it', 'of their kind'). */
  F.crewFor = function (ship) {
    const W = G.W, cap = F.holdOf(ship).crew, out = [], ok = function (c) { return c && !c.dead && !c.deedId && out.indexOf(c) < 0; }, dist = function (a, b) { return Math.hypot(a.x - ship.x, a.y - ship.y) - Math.hypot(b.x - ship.x, b.y - ship.y); };
    const L = G.leaderOf ? G.leaderOf(ship.sp) : null; if (ok(L)) { L.crewWhy = 'their leader'; out.push(L); }
    W.cre.filter(function (c) { return ok(c) && c.builtShip === ship.name; }).sort(dist).forEach(function (c) { if (out.length < cap) { c.crewWhy = 'built it'; out.push(c); } });
    W.cre.filter(function (c) { return ok(c) && ship.sp && c.sp === ship.sp; }).sort(dist).forEach(function (c) { if (out.length < cap) { c.crewWhy = 'of their kind'; out.push(c); } });
    if (out.length < 2) W.cre.filter(ok).sort(dist).forEach(function (c) { if (out.length < cap) { c.crewWhy = 'was near'; out.push(c); } });
    return out;
  };
  // those who set a piece of a ship with their own hands are its builders: they are the first to go in it
  G.on('build-piece', function (d, pc, c) { if (c && d && d.result && d.result.ship) c.builtShip = d.result.name; });
  const nameOfCre = function (c) { const sp = c.sp && G.speciesById ? G.speciesById(c.sp) : null; return (sp ? sp.name : 'Creature') + ' #' + c.id; };
  const lineN = function () { let n = 0; const C = G.W.cre; for (let i = 0; i < C.length; i++) if (!C[i].dead && C[i].line) n++; return n; };
  F.lineN = lineN;
  // those descended from one who came from elsewhere are of its line (your people in a far pond; a stranger's children at home)
  G.on('birth', function (c, a, b) { if ((a && a.line) || (b && b.line)) c.line = 1; });

  // ── changing ponds ──
  // What belongs to you and not to a pond (your collection, what you have spent, your budgets, the hints you have seen) stays as it is across the change.
  function swap(fn) {
    const keep = { col: G.collection, colD: G.keptDesigns, colP: G.keptPlans, life: G.ai ? G.ai.life : null, hints: G.hints };
    F.swapping = true; try { fn(); } finally { F.swapping = false; }
    G.collection = keep.col; G.keptDesigns = keep.colD; G.keptPlans = keep.colP; if (G.ai && keep.life) G.ai.life = keep.life; if (keep.hints) G.hints = keep.hints;
    if (G.R) G.R.sel = null;
    G.emit('new-pond', { voyage: true });
    if (G.ai && keep.life) G.ai.life = keep.life;      // (a new pond starts a new account: a voyage does not)
    if (G.cam && G.W) { G.cam.z = 1; G.cam.x = G.W.ww / 2; G.cam.y = G.W.wh / 2; if (G.applyCam) G.applyCam(); }
  }
  const shipPack = function (w) { const bp = clone(w.bp); bp.P.forEach(function (q) { delete q.t0; q.st = 2; }); return { name: w.name, looks: w.looks, by: w.by, hue: w.hue, sp: w.sp || 0, r: w.r, gen: w.gen, plan: w.plan, bp: bp }; };      /* (the moment each piece was set belongs to the pond it was set in) */
  function landShip(pk, mark) {
    const W = G.W, sy = G.shoreY ? G.shoreY(W) : W.wh * 0.25; W.works = W.works || [];
    let w = null; for (let i = 0; i < W.works.length; i++) if (W.works[i].bp && W.works[i].bp.type === 'ship' && W.works[i].name === pk.name) w = W.works[i];
    if (!w) { w = { name: pk.name, looks: pk.looks, x: W.ww * 0.84, y: Math.max(90, sy - 70),      /* it comes down on the land, at the border of the pond, in plain sight */ r: pk.r || 60, until: W.t + 1e7, by: pk.by, hue: pk.hue, sp: 0, field: 0, plan: pk.plan, gen: W.gen, bp: clone(pk.bp) }; w.bp.P.forEach(function (q) { q.st = 2; }); W.works.push(w); }
    if (mark) w.visitor = 1;
    return w;
  }
  /** a ship with its crew leaves the pond you are in for the far pond p; returns the crew as they are there */
  F.sail = function (p, crew, ship) {
    if (F.visiting || !p || p.free || !ship || !G.collectWorld) return null;
    const W = G.W; F.pool(); F.kindsOf(p);
    const packs = crew.filter(function (c) { return c && !c.dead; }).map(function (c) { return { g: G.packGenome(c.g), name: nameOfCre(c), led: (c.fol || 0) >= 3 ? c.fol : 0 }; });
    if (!packs.length) return null;
    crew.forEach(function (c) { const i = W.cre.indexOf(c); if (i >= 0) W.cre.splice(i, 1); });      // they are gone from here: they are aboard
    const pk = shipPack(ship), hold = F.holdOf(ship), hues = W.species.filter(function (s) { return !s.extinct && s.n > 0; }).sort(function (a, b) { return b.n - a.n; });
    F.homeLook = { hue: hues.length ? hues[0].hue : 190, kinds: Math.max(1, Math.min(4, hues.length)), gen: W.gen, n: W.cre.length };
    F.homeBlob = G.collectWorld(); if (!F.homeBlob) return null;
    const key = F.key(p), rec = F.book[key] || (F.book[key] = { name: p.name, hue: p.hue, visits: 0, mine: 0 });
    swap(function () { if (rec.blob && G.validSave(rec.blob)) G.applySave(rec.blob); else F.make(p); });
    rec.visits = (rec.visits || 0) + 1; rec.name = p.name; rec.hue = p.hue;
    F.here = 'far'; F.origin = { i: p.i, j: p.j }; F.visiting = { key: key, i: p.i, j: p.j, name: p.name, hue: p.hue, adds: hold.adds, adds0: hold.adds, ship: pk, crew0: packs.length, mood: F.moodWords(p) };
    const W2 = G.W, sh = landShip(pk, true), out = [];
    // they leave the ship and swim out to where the people of the pond are (most of the way: the meeting is left to both sides)
    const meet = (function () { const sy2 = G.shoreY ? G.shoreY(W2) : sh.y + 70; let x = 0, y = 0, n = 0; W2.cre.forEach(function (c) { if (!c.dead) { x += c.x; y += c.y; n++; } }); if (!n) return { x: sh.x - 140, y: sy2 + 70 }; return { x: sh.x + (x / n - sh.x) * 0.7, y: Math.max(sy2 + 60, sy2 + 60 + (y / n - sy2 - 60) * 0.7) }; })();
    packs.forEach(function (m, k) { const g = G.unpackGenome(m.g); if (!g) return; const c = G.dropCreature(g, meet.x + (k - (packs.length - 1) / 2) * 56, meet.y + (k % 2) * 34); c.guestName = m.name; c.fromPond = 1; c.line = 1; c.crew = 1; c.E = c.ph.Emax; out.push(c); });
    W2.farOf = key; rec.mine = lineN();
    G.emit('arrived', F.visiting, out);
    if (G.markDirty) G.markDirty();
    return out;
  };
  /** While the ship is away there are two ponds to watch: the far one it is at, and your own. You look at one at a time; the other waits as it was left.
   *  F.look('home') takes you to your own pond (the ship is not there: it is away); F.look('far') takes you back to where the ship is. */
  F.look = function (where) {
    const V = F.visiting; if (!V || !G.collectWorld || !F.homeBlob) return false; const here = F.here === 'home' ? 'home' : 'far'; if (where === here) return true;
    const rec = F.book[V.key] || (F.book[V.key] = { name: V.name, hue: V.hue, visits: 1 });
    if (where === 'home') {
      const W = G.W, all = W.works; W.works = (all || []).filter(function (w) { return !w.visitor; }); rec.mine = lineN(); rec.gen = W.gen; rec.alive = W.cre.length; rec.at = Date.now(); rec.blob = slim(G.collectWorld()); W.works = all;
      if (!rec.blob) return false; const home = F.homeBlob;
      swap(function () { G.applySave(home); }); F.origin = null; F.here = 'home';
      (G.W.works || []).forEach(function (w) { if (w.bp && w.bp.type === 'ship' && w.name === V.ship.name) w.away = 1; });      // its place at home stands empty: it is away
    } else {
      const blob = G.collectWorld(); if (!blob || !rec.blob) return false; F.homeBlob = blob;
      swap(function () { G.applySave(rec.blob); }); F.origin = { i: V.i, j: V.j }; F.here = 'far'; landShip(V.ship, true); G.W.farOf = V.key;
    }
    G.emit('looked', where, V); if (G.markDirty) G.markDirty();
    return true;
  };
  /** the ship sails home. `bring` (optional) is one creature of the far pond, yours or theirs, that comes back with it; the rest of yours stay as your outpost */
  F.home = function (bring) {
    const V = F.visiting; if (!V || !F.homeBlob || !G.collectWorld) return null;
    if (F.here === 'home' && !F.look('far')) return null;      // (the ship is at the far pond: that is where it leaves from)
    const W = G.W, rec = F.book[V.key] || (F.book[V.key] = { name: V.name, hue: V.hue, visits: 1 });
    let pk = null;
    if (bring && !bring.dead && W.cre.indexOf(bring) >= 0) { pk = { g: G.packGenome(bring.g), name: nameOfCre(bring), theirs: !bring.line, defs: { organs: clone(W.organs || []), designs: clone(W.designs || []), plans: clone(W.plans || []) } }; W.cre.splice(W.cre.indexOf(bring), 1); }
    W.works = (W.works || []).filter(function (w) { return !w.visitor; });      // the ship leaves
    rec.mine = lineN(); rec.gen = W.gen; rec.alive = W.cre.length; rec.at = Date.now(); rec.blob = slim(G.collectWorld());
    const home = F.homeBlob;
    swap(function () { G.applySave(home); });
    F.origin = null; F.visiting = null; F.homeBlob = null; F.here = null;
    let c = null;
    if (pk) { const H = G.W, sh = F.shipOf() || { x: H.ww / 2, y: H.wh * 0.5 };
      ['organs', 'designs', 'plans'].forEach(function (k) { (pk.defs[k] || []).forEach(function (d) { if (d && d.id >= 500 && !(H[k] || []).some(function (x) { return x.id === d.id; }) && (H[k] = H[k] || []).length < 14) H[k].push(d); }); });      // what was invented over there and it carries comes with it
      const g = G.unpackGenome(pk.g); if (g) { c = G.dropCreature(g, sh.x + 60, sh.y + 60); c.guestName = pk.name; c.fromPond = 1; c.line = 1; c.E = c.ph.Emax; } }
    G.emit('came-home', rec, c, V);
    if (G.markDirty) G.markDirty();
    return { rec: rec, brought: c };
  };

  // ── kept with the save ──
  /** a far pond as it is kept between visits: its life and what was built, without the long records */
  function slim(d) { if (!d) return null; const o = Object.assign({}, d); ['col', 'colD', 'colP', 'history', 'shelf', 'evShelf', 'story', 'events', 'museLog', 'hints', 'budgets', 'spend', 'far', 'ages'].forEach(function (k) { delete o[k]; }); o.fossils = []; o.discLog = (d.discLog || []).slice(-6); o.hist = (d.hist || []).slice(-12); return o; }
  F.pack = function () {
    const keys = Object.keys(F.book); if (!keys.length) return undefined;
    const recent = keys.filter(function (k) { return F.book[k].blob; }).sort(function (a, b) { return (F.book[b].at || 0) - (F.book[a].at || 0); }).slice(0, 2), out = {};
    keys.slice(-24).forEach(function (k) { const r = F.book[k]; out[k] = { name: r.name, hue: Math.round(r.hue || 0), visits: r.visits | 0, mine: r.mine | 0, gen: r.gen | 0, alive: r.alive | 0, at: r.at || 0 }; if (recent.indexOf(k) >= 0) { let s = ''; try { s = JSON.stringify(r.blob); } catch (e) { s = ''; } if (s && s.length < 330000) out[k].blob = r.blob; } });
    return { v: 1, book: out };
  };
  /** what is saved: at home, the pond with the far ponds beside it; away, the pond AT HOME as it was left, with the far pond as it is now beside it */
  G.voyCollect = function (d) {
    if (F.swapping || !d) return d;
    const V = F.visiting;
    if (!V || !F.homeBlob || F.here === 'home') { d.far = F.pack(); return d; }
    const rec = F.book[V.key]; if (rec) { rec.mine = lineN(); rec.gen = G.W.gen; rec.alive = G.W.cre.length; rec.at = Date.now(); const keepShip = G.W.works; G.W.works = (keepShip || []).filter(function (w) { return !w.visitor; }); rec.blob = slim(G.collectWorld()); G.W.works = keepShip; }
    const h = Object.assign({}, F.homeBlob, { at: Date.now(), col: d.col, colD: d.colD, colP: d.colP, spend: d.spend, budgets: d.budgets, hints: d.hints, ai: d.ai, drawn: d.drawn });
    h.far = F.pack();
    return h;
  };
  /** a save was opened: the far ponds that came with it (you are at home; whoever was away is now your outpost there) */
  G.farLoaded = function (d) {
    if (F.swapping) return;
    F.book = {}; F.origin = null; F.visiting = null; F.homeBlob = null; F.here = null; F._kinds = {}; F._pool = null;
    const b = d && d.far && d.far.book; if (!b || typeof b !== 'object') return;
    Object.keys(b).slice(0, 24).forEach(function (k) { const r = b[k]; if (!r || !/^-?\d{1,6},-?\d{1,6}$/.test(k)) return; const n = function (v, hi) { v = +v; return isFinite(v) ? clamp(v, 0, hi) : 0; };
      F.book[k] = { name: String(r.name || 'A far pond').replace(/[<>&]/g, '').slice(0, 40), hue: n(r.hue, 360), visits: n(r.visits, 1e6), mine: n(r.mine, 1e4), gen: n(r.gen, 1e6), alive: n(r.alive, 1e4), at: n(r.at, 1e14) }; if (r.blob && G.validSave && G.validSave(r.blob)) F.book[k].blob = r.blob; });
  };
  G.on('new-pond', function (opts) { if (opts && opts.voyage) return; F.book = {}; F.origin = null; F.visiting = null; F.homeBlob = null; F.here = null; F._kinds = {}; F._pool = null; });      // a new pond of your own: a new sky
  // each ADD in a far pond is one of the few the ship could carry
  G.on('placed', function () { const V = F.there(); if (V && V.adds > 0) { V.adds--; G.emit('voyage-add', V); } });
})();
