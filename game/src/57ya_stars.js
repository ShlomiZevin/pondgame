// ── The stars: what each is, whose it is, and how one is taken ──
// What used to be "far ponds" are STARS, each with a terrain of its own and one thing it is rich in (stone, reed, shell, or lumen). Some hold a RIVAL
// colony: it has a Heart of its own, defenders who fight for it, and it sends raids against you (57y_raids.js).
//     a FREE star      its people let you be. Land a crew, FOUND AN OUTPOST (a Heart of yours rises there), and the star is yours.
//     a RIVAL star     land a crew of fighters and break its Heart. Its defenders come at whoever comes near it; when one falls another of its people
//                      takes up arms, until its reserve is spent. When the Heart falls the star is yours and its raids are over.
//     a star of YOURS  sends home, every year, some of what it is rich in (it arrives in your store by itself). Lumen stars are the prize.
// Hold every rival star near you and this corner of space is yours.
// Flying costs lumen: 4 to send a ship out (coming home is free).
(function () {
  'use strict';
  const F = G.far, clamp = G.clamp; if (!F) return;
  const TERR = G.TERRAINS = [
    { id: 'reef', name: 'Rust star', res: 2, words: 'red dust, old craters and shell beds' },
    { id: 'crag', name: 'Crag star', res: 0, words: 'grey broken rock and deep craters' },
    { id: 'marsh', name: 'Moss star', res: 1, words: 'moss fields, black pools and reed beds' },
    { id: 'crystal', name: 'Crystal star', res: 3, words: 'violet rock and fields of lumen crystal' },
    { id: 'ember', name: 'Ember star', res: 0, words: 'black glass and glowing vents' },
    { id: 'frost', name: 'Frost star', res: 2, words: 'blue ice, crevasses and snow on the heights' }];
  const FUEL = G.FUEL = 4, TRIBUTE = [5, 5, 4, 2];
  F.owed = [0, 0, 0, 0]; F.won = false;
  const cell0 = F.cell; let fallback = null;
  const rivalAt = function (i, j) { if (F.hash(i, j, 70) < 0.42) return true; if (fallback === null) { fallback = ''; let any = false, best = null, bd = 99; for (let a = -4; a <= 4; a++) for (let b = -4; b <= 4; b++) { const p = cell0(a, b); if (!p || p.free) continue; if (F.hash(a, b, 70) < 0.42) any = true; const d = Math.hypot(a, b); if (d < bd) { bd = d; best = a + ',' + b; } } if (!any && best) fallback = best; } return fallback === i + ',' + j; };
  /** what a star is. p: { i, j } counted from your own star. -> { key, terrain, res, rival (a rival colony holds it now), wasRival, held (yours), strength } */
  G.starOf = function (p) {
    const i = p.i | 0, j = p.j | 0, key = i + ',' + j, rec = F.book[key], t = TERR[(F.hash(i, j, 80) * TERR.length) | 0], rv = rivalAt(i, j), held = !!(rec && rec.held);
    return { key: key, i: i, j: j, terrain: t, res: t.res, rival: rv && !held, wasRival: rv, held: held, strength: 3 + ((F.hash(i, j, 81) * 3) | 0) };
  };
  /** the terrain of the star being shown (your own star has one too, from its seed) */
  G.terrainOf = function (W) { W = W || G.W; if (!W) return TERR[0]; if (W.farOf) { const ij = String(W.farOf).split(',').map(Number); return G.starOf({ i: ij[0], j: ij[1] }).terrain; } return TERR[((W.seed >>> 0) % 9973) % TERR.length]; };
  F.cell = function (i, j) { const p = cell0(i, j); if (p && !p.free) { const s = G.starOf(p); p.terrain = s.terrain.id; p.res = s.res; p.rival = s.rival; p.held = s.held; } return p; };
  const recOf = function (W) { return W && W.farOf ? F.book[W.farOf] : null; };
  G.starHeld = function (W) { const r = recOf(W || G.W); return !!(r && r.held); };

  // ── a rival's Heart, and those who defend it ──
  G.foeHeart = function (W) { W = W || G.W; const Wk = (W && W.works) || []; for (let i = 0; i < Wk.length; i++) if (Wk[i].enemy && Wk[i].bp && Wk[i].bp.type === 'heart') return Wk[i]; return null; };
  function raiseFoeHeart(W, p, s) {
    const sy = G.shoreY(W), S = 74, bp = G.blueprintFrom({ seed: 7 + ((F.hash(p.i, p.j, 82) * 9000) | 0), type: 'heart', S: S, hue: p.hue, spiky: 1, brain: 0.6, wet: true }, '2222222222222222222222222222');
    (W.works = W.works || []).unshift({ name: 'Heart of ' + p.name, looks: 'the middle of the colony of ' + p.name, x: W.ww * 0.5, y: G.heartY ? G.heartY(W, S) : sy + (W.wh - sy) * 0.03 + 6 - S * 0.45, r: 80, until: W.t + 1e7, by: 'colony of ' + p.name, hue: p.hue, sp: 0, field: 0, plan: 'Their Heart', gen: W.gen, bp: bp, enemy: 1 });
    W.def = s.strength; W.defLeft = s.strength * 2;
  }
  const make0 = F.make;
  F.make = function (p) {
    const W = make0(p), s = G.starOf(p);
    W.lumenRich = s.res === 3 ? 2.4 : 0.6;
    W.cre.forEach(function (c) { c.team = 2; });      // its own people: not yours to command; they let you be unless their colony is at war with you
    if (s.rival && G.blueprintFrom) raiseFoeHeart(W, p, s);
    return W;
  };
  /** the defenders of a rival's Heart are kept up to strength from its people, until the reserve is spent */
  function muster(W) {
    const h = G.foeHeart(W); if (!h) return; let n = 0; for (let i = 0; i < W.cre.length; i++) if (W.cre[i].team === 1 && !W.cre[i].dead && !W.cre[i].raid) n++;
    const want = W.def === undefined ? 4 : W.def; if (n >= want) return; if (W.defLeft === undefined) W.defLeft = want * 2; if (W.defOut === undefined) W.defOut = 0;
    if (W.defOut >= want && W.defLeft <= 0) return;      // (the first muster is not from the reserve)
    let best = null, bs = -1e9; for (let i = 0; i < W.cre.length; i++) { const c = W.cre[i]; if (c.dead || c.team !== 2 || c.age < 0) continue; const sc = G.jobFit(c, 'f') - Math.hypot(c.x - h.x, c.y - h.y) / 900; if (sc > bs) { bs = sc; best = c; } }
    if (!best) return; best.team = 1; best.job = 'f'; if (W.defOut >= want) W.defLeft--; W.defOut++; G.emit('defender', best, h);
  }
  // their Heart falls: the star is yours
  G.on('foe-heart-lost', function (w, by) {
    const W = G.W, key = W.farOf; if (!key) return; const rec = F.book[key] || (F.book[key] = { name: (F.visiting && F.visiting.name) || 'A star', hue: w.hue, visits: 1, mine: 0 });
    rec.held = 1; rec.heldGen = W.gen; rec.taken = 1; W.def = 0; W.defLeft = 0; W.cre.forEach(function (c) { if (c.team === 1 && !c.raid) { c.team = 2; c.job = ''; c.foe = null; } });
    const ij = key.split(',').map(Number), s = G.starOf({ i: ij[0], j: ij[1] }), loot = 6 + s.strength * 2; F.owed[3] += loot;
    const h = G.ensureHeart(W); if (h) { h.x = w.x; h.bp.P.forEach(function (p, i) { p.st = i < 2 ? 2 : 0; }); h.ruin = true; h.hitT = W.t; }
    G.emit('star-taken', rec, s, loot); won();
    if (G.markDirty) G.markDirty();
  });
  /** found an outpost on the free star you are on: a Heart of yours rises there, and the star is yours */
  G.foundOutpost = function () {
    const W = G.W, V = F.there(); if (!V || !W.farOf) return 'You are not on a far star.'; const ij = W.farOf.split(',').map(Number), s = G.starOf({ i: ij[0], j: ij[1] });
    if (s.held) return 'This star is yours already.'; if (s.rival) return 'A rival colony holds this star: break its Heart first.';
    if (W.cre.filter(function (c) { return !c.dead && !c.team; }).length < 2) return 'It takes two of yours at least to found an outpost.';
    const rec = F.book[W.farOf] || (F.book[W.farOf] = { name: V.name, hue: V.hue, visits: 1, mine: 0 }); rec.held = 1; rec.heldGen = W.gen;
    const h = G.ensureHeart(W); if (h) { h.bp.P.forEach(function (p, i) { p.st = i < 2 ? 2 : 0; }); h.ruin = true; h.hitT = W.t - 9; }
    const c = G.colony(W); if (c.want.g < 2) c.want.g = 2; if (c.want.b < 1) c.want.b = 1;
    G.emit('outpost', rec, s); if (G.markDirty) G.markDirty(); return '';
  };
  function won() { if (F.won) return; const R = G.rivals(); if (R.length && R.every(function (q) { return F.book[q.key] && F.book[q.key].held; })) { F.won = true; G.emit('victory', R); } }
  /** the stars that are yours: [{ key, name, hue, res, terrain, since }] */
  G.starsHeld = function () { return Object.keys(F.book).filter(function (k) { return F.book[k].held; }).map(function (k) { const ij = k.split(',').map(Number), s = G.starOf({ i: ij[0], j: ij[1] }), r = F.book[k]; return { key: k, name: r.name, hue: r.hue, res: s.res, terrain: s.terrain, since: r.heldGen | 0, taken: !!r.taken }; }); };

  // ── what a held star sends home, every year; and what is owed arrives when your own star is the one being lived on ──
  G.on('scored', function () { if (G.mode !== 'play') return; G.starsHeld().forEach(function (s) { F.owed[s.res] += TRIBUTE[s.res]; }); });
  { const s0 = G.step; let acc = 0; G.step = function (dt) { s0(dt); const W = G.W; if (!W || W.title) return; acc += dt; if (acc < 1.3) return; acc = 0;
      if (W.farOf) { muster(W); return; }
      if (F.owed[0] + F.owed[1] + F.owed[2] + F.owed[3] > 0 && W.col && G.heartOf(W) && !F.visiting) { const got = F.owed.slice(); for (let k = 0; k < 4; k++) { W.col.stock[k] += got[k]; W.col.got[k] += got[k]; } F.owed = [0, 0, 0, 0]; G.emit('tribute', got); }
    }; }
  // a star kept from before there were colonies (an older save): its people are its own, and if a rival holds it, its Heart stands
  function settle(W) { if (!W || !W.farOf) return; W.cre.forEach(function (c) { if (!c.team && !c.line && !c.crew) c.team = 2; }); const ij = String(W.farOf).split(',').map(Number), p = cell0(ij[0], ij[1]); if (!p || p.free) return; const s = G.starOf(p); if (s.rival && !G.foeHeart(W) && G.blueprintFrom) raiseFoeHeart(W, p, s); }
  G.on('arrived', function () { settle(G.W); }); G.on('looked', function (where) { if (where !== 'home') settle(G.W); });
  // a crew that lands on a rival star has come to fight: they are fighters from the moment they step out
  G.on('arrived', function (V, out) { const W = G.W; if (!W || !W.farOf || !out || !out.length) return; const ij = W.farOf.split(',').map(Number), s = G.starOf({ i: ij[0], j: ij[1] }); if (s.rival) { out.forEach(function (c) { G.setJob(c, 'f', true); }); const c = G.colony(W); c.want.f = Math.max(c.want.f, out.length); } });
  // a rival that is yours now raids no more; and flying out burns lumen
  { const sail0 = F.sail; F.sail = function (p, crew, ship) { const W = G.W, c = W && !W.farOf && W.col ? W.col : null, pay = c && c.stock[3] >= FUEL; if (pay) c.stock[3] -= FUEL; const out = sail0(p, crew, ship); if (!out && pay && G.W === W) c.stock[3] += FUEL; return out; }; }

  // ── kept with the save ──
  { const pack0 = F.pack; F.pack = function () { let o = pack0(); const owes = F.owed.some(function (v) { return v > 0; }); if (!o && !owes && !F.won) return o; o = o || { v: 1, book: {} };
      Object.keys(o.book).forEach(function (k) { const r = F.book[k]; if (r && r.held) { o.book[k].held = 1; o.book[k].heldGen = r.heldGen | 0; if (r.taken) o.book[k].taken = 1; } });
      Object.keys(F.book).forEach(function (k) { const r = F.book[k]; if (r.held && !o.book[k]) o.book[k] = { name: r.name, hue: Math.round(r.hue || 0), visits: r.visits | 0, mine: r.mine | 0, gen: r.gen | 0, alive: r.alive | 0, at: r.at || 0, held: 1, heldGen: r.heldGen | 0, taken: r.taken ? 1 : undefined }; });      // (a star of yours is never forgotten)
      o.owed = F.owed.slice(); o.won = F.won ? 1 : undefined; return o; };
    const load0 = G.farLoaded; G.farLoaded = function (d) { load0(d); if (F.swapping) return; F.owed = [0, 0, 0, 0]; F.won = false; const f = d && d.far; if (!f || typeof f !== 'object') return;
      if (Array.isArray(f.owed)) F.owed = [0, 1, 2, 3].map(function (k) { const v = +f.owed[k]; return isFinite(v) ? clamp(Math.floor(v), 0, 1e6) : 0; }); F.won = !!f.won;
      const b = f.book || {}; Object.keys(F.book).forEach(function (k) { const r = b[k]; if (r && r.held) { F.book[k].held = 1; F.book[k].heldGen = clamp(+r.heldGen || 0, 0, 1e7); if (r.taken) F.book[k].taken = 1; } }); }; }
  G.on('new-pond', function (opts) { if (opts && opts.voyage) return; F.owed = [0, 0, 0, 0]; F.won = false; });
})();
