// ── The colony: work, orders, and what is gathered ──
// The creatures of your star are a COLONY, and you command it. Nothing about what a creature IS has changed: it has its genes, its brain, its character,
// it eats, tires, breeds and dies as before. What is new is that it can have WORK, and that work is yours to give:
//     GATHERER   fetches what lies about the star (stone, reed, shell, and lumen where there is any) and carries it to the Heart
//     BUILDER    raises what you order built, piece by piece, from what is in the store or lying near
//     FIGHTER    keeps to the rally point you set, goes for any enemy that comes in sight, and attacks what you send it against
//     GUARD      stands by the place you post it at, and does not leave it
//     (free)     lives by its own brain, as all of them used to
// A creature lives a minute or two, so work is a TRADE HANDED DOWN: a child is born into its parent's work, and you say how many of each you want
// (the colony fills the places from those best made for them, and lets the worst go when there are too many). So a squad is a standing thing: its
// members die and are replaced, the squad goes on.
// The order says WHAT to do and WHERE. How well it is done is the creature's own: a fast one with hands gathers more, a big spiked one hits harder, a
// timid one hangs back. And those who do their work well breed more (their fitness is raised by it), so in time you breed gatherers and fighters.
// A hungry worker leaves its work to feed, and comes back: the more who work, the more food the star must grow.
(function () {
  'use strict';
  const clamp = G.clamp;
  const JOBS = G.JOBS = { g: { name: 'Gatherer', many: 'gatherers', doing: 'gathering', hue: 42 }, b: { name: 'Builder', many: 'builders', doing: 'building', hue: 28 }, f: { name: 'Fighter', many: 'fighters', doing: 'fighting', hue: 350 }, u: { name: 'Guard', many: 'guards', doing: 'standing guard', hue: 205 } };
  const RES = G.RES = ['stone', 'reed', 'shell', 'lumen'];
  /** the colony of a star: what is in its store, how many of each trade are wanted, where the fighters rally, what is waiting to be built */
  const colony = G.colony = function (W) { W = W || G.W; return W.col || (W.col = { stock: [0, 0, 0, 0], got: [0, 0, 0, 0], want: W.farOf ? { g: 0, b: 0, f: 0, u: 0 } : { g: 4, b: 2, f: 0, u: 0 }, share: W.farOf ? {} : { g: 10, b: 5 }, rally: null, queue: [], auto: true, nodes: null }); };      // (a colony organises itself a little from the start: one in ten gathers, one in twenty builds; the rest is yours to say)
  // ── how many of each trade: a NUMBER, or a SHARE of the colony ──
  // `col.want[k]` is how many are wanted now. A trade may be set as a share instead (`col.share[k]`, in hundredths of the colony): then its number follows the
  // colony's size by itself, as the colony grows and shrinks (counted gently, so a spring of births does not send everyone changing trades).
  function shares(W, col, n) {
    const S = col.share; if (!S) return; col.nS = col.nS ? col.nS + (n.all - col.nS) * 0.2 : n.all;
    for (const k in S) { if (typeof S[k] !== 'number' || col.want[k] === undefined) continue; let w = S[k] > 0 ? Math.max(1, Math.round(col.nS * S[k] / 100)) : 0; if (k === 'b' && (col.queue.length || (W.deed && W.deed.ordered))) w = Math.max(w, 3); col.want[k] = w; }
  }
  /** is this trade set as a share of the colony? (else as a number) */
  G.tradeShare = function (job) { const S = colony().share; return S && typeof S[job] === 'number' ? S[job] : null; };
  /** set a trade as a share (hundredths of the colony) or, with pct null, as the number it stands at now */
  G.tradeSet = function (job, pct, num) { const W = G.W, col = colony(W), n = G.jobCount(W); col.share = col.share || {}; if (col.want[job] === undefined) return;
    if (pct === null || pct === undefined) { delete col.share[job]; if (typeof num === 'number') col.want[job] = clamp(Math.round(num), 0, Math.max(0, n.all - 2)); }
    else { col.share[job] = clamp(Math.round(pct), 0, 60); shares(W, col, n); } if (G.markDirty) G.markDirty(); };
  const mine = function (c) { return !c.team; };      // of your colony (team 1: an enemy; team 2: the people of another star, who are nobody's enemy)
  const hostile = function (c) { return c.team === 1; };
  const shoreOf = function (W) { return G.shoreY ? G.shoreY(W) : W.wh * 0.25; };
  /** may this creature go to that height of the star? (one of the water stops at the shore; one of the land only paddles in the shallows) */
  const reach = G.canReach = function (W, c, y) { if (G.FLAT) return true; const sy = shoreOf(W); return c.ph.home ? y <= sy + (W.wh - sy) * 0.06 - c.ph.r : y >= sy + c.ph.r; };

  // ── the Heart: the middle of the colony, and its store. It stands in the shallows, where those of the land and those of the water can both come ──
  G.heartOf = function (W) { W = W || G.W; const Wk = W.works || []; for (let i = 0; i < Wk.length; i++) if (Wk[i].bp && Wk[i].bp.type === 'heart' && !Wk[i].enemy) return Wk[i]; return null; };
  const yLo = function (W, c) { return G.FLAT ? 20 + c.ph.r : c.ph.home ? 10 : shoreOf(W) + c.ph.r + 2; }, yHi = function (W, c) { return G.FLAT ? W.wh - 20 - c.ph.r : c.ph.home ? shoreOf(W) + (W.wh - shoreOf(W)) * 0.06 - c.ph.r : W.wh - 10; };      // (how far up and down a creature may go: on a star, anywhere)
  const heartY = G.heartY = function (W, S) { if (G.FLAT) return W.wh / 2 + 30 - S * 0.45; const sy = shoreOf(W); return sy + (W.wh - sy) * 0.03 + 6 - S * 0.45; };      // (the Heart stands in the middle of the star)
  G.ensureHeart = function (W) {
    W = W || G.W; let h = G.heartOf(W); if (h || !G.blueprintFrom || W.title) return h;
    const sp = (W.species || []).filter(function (s) { return !s.extinct; }).sort(function (a, b) { return b.n - a.n; })[0], hue = sp ? sp.hue : 190, S = 74;
    const bp = G.blueprintFrom({ seed: (W.seed >>> 0) % 9973 + 5, type: 'heart', S: S, hue: hue, spiky: 0, brain: 0.6, wet: true }, '2222222222222222222222222222');
    h = { name: 'The Heart', looks: 'the middle of the colony, and its store', x: W.ww * 0.5, y: heartY(W, S), r: 80, until: W.t + 1e7, by: 'whole colony', hue: hue, sp: sp ? sp.id : 0, field: 0, plan: 'The Heart', gen: W.gen, bp: bp, hp: 1 };
    (W.works = W.works || []).unshift(h); colony(W);
    return h;
  };
  // ── how far the colony has come. It shows in its Heart, which grows with it (and never shrinks) ──
  // (The four steps are named for GROWTH, not for what people build: nobody knows what these creatures are, and a word like "village" would say they are us.)
  G.TIERS = ['Founded', 'Growing', 'Thriving', 'Great'];
  function tierOf(W) { let n = 0; const Wk = W.works || []; for (let i = 0; i < Wk.length; i++) { const w = Wk[i]; if (w.bp && w.bp.type !== 'heart' && !w.visitor && !w.enemy && !w.fall && G.buildCount(w)[0] >= G.buildCount(w)[2] * 0.7) n++; } return n >= 9 ? 3 : n >= 5 ? 2 : n >= 2 ? 1 : 0; }
  function grow(W, col) { const h = G.heartOf(W); if (!h) return; const tr = Math.max(col.tier | 0, tierOf(W)); if (tr > (col.tier | 0)) { const was = col.tier | 0; col.tier = tr; G.emit('colony-tier', tr, was); }
    if ((h.tier | 0) === tr || h.ruin) return; const c = G.buildCount(h); if (c[0] < c[2]) return;      // (a Heart that is being mended is not added to)
    const S = 74 + tr * 4; h.bp = G.blueprintFrom({ seed: h.bp.seed, type: 'heart', S: S, hue: h.bp.hue, spiky: 0, brain: 0.6, wet: true, tier: tr }, '22222222222222222222222222222222222222222222222222'); h.tier = tr; h.r = 80 + tr * 22; h.y = heartY(W, S); h.grewT = W.t; G.emit('heart-grew', h, tr); }
  /** where a carrier sets its load down (and a builder takes one up) */
  const dropAt = G.storeAt = function (W) { const h = G.heartOf(W); if (!h) return null; const sy = shoreOf(W); return { x: h.x + (h.bp.hw || 60) + 34, y: G.FLAT ? h.y + h.bp.S * 0.45 - 2 : sy + (W.wh - sy) * 0.03 + 4 }; };

  // ── lumen: the rare thing every star wants. It grows as crystals in a few places; a gatherer breaks a piece off and carries it home ──
  function nodes(W) {
    const col = colony(W); if (col.nodes) return col.nodes; const sy = shoreOf(W), r = G.rng ? G.rng((W.seed >>> 0) + 77) : Math.random, rich = W.lumenRich === undefined ? 1 : W.lumenRich, e = (G.sideEdge ? G.sideEdge(W) : 40) + 60;
    col.nodes = [];
    if (rich > 0 && G.FLAT && G.sitesOf) { G.sitesOf(W).filter(function (s) { return s.k === 'lumen'; }).forEach(function (s, i) { if (i === 1 && rich < 0.9 && r() < 0.35) return; col.nodes.push({ x: s.x, y: s.y + 14, n: Math.round((12 + r() * 10) * rich), n0: 0, k: 3 }); }); }      // (lumen stands where the star's lumen deposits are)
    else if (rich > 0) { col.nodes.push({ x: e + r() * (W.ww - 2 * e), y: W.wh - 80 - r() * 60, n: Math.round((14 + r() * 10) * rich), n0: 0, k: 3 }); if (sy > 150) col.nodes.push({ x: e + r() * (W.ww - 2 * e), y: 60 + r() * Math.max(10, sy - 130), n: Math.round((10 + r() * 8) * rich), n0: 0, k: 3 }); if (rich > 1.5) col.nodes.push({ x: e + r() * (W.ww - 2 * e), y: sy + (W.wh - sy) * (0.3 + 0.4 * r()), n: Math.round(30 * rich), n0: 0, k: 3 }); }
    col.nodes.forEach(function (q) { q.n0 = q.n; });
    return col.nodes;
  }
  G.lumenNodes = nodes;

  // ── moving with a purpose (as those on a plan do): straight there, at its own pace ──
  function go(c, tx, ty, dt, haste) { const dx = tx - c.x, dy = ty - c.y, dist = Math.hypot(dx, dy) || 1, grip = c.haul >= 0 ? (c.ph.hands || c.ph.limbs > 0 ? 0.85 : 0.6) : 1, sp = Math.min(c.ph.speed * (haste || 2) * grip, dist * 2.4), k = Math.min(1, dt * 5); c.vx += (dx / dist * sp - c.vx) * k; c.vy += (dy / dist * sp - c.vy) * k; if (dist > 8) c.ang = Math.atan2(dy, dx); return dist; }

  // ── gathering ──
  /** what a gatherer goes for next: the sort the store is shortest of (each gatherer leaning its own way, so they do not all run to one deposit;
   *  lumen for no more than a quarter of them unless you send them), and the nearest piece of that sort. One you sent for a sort keeps to it. */
  function source(W, c, col) {
    const M = W.mats || [], N = nodes(W), k0 = c.gk === undefined ? -1 : c.gk, ax = c.area ? c.area.x : c.x, ay = c.area ? c.area.y : c.y, d0 = G.storeAt(W) || { x: c.x, y: c.y };
    const near = [null, null, null, null], nd = [1e18, 1e18, 1e18, 1e18];
    for (let i = 0; i < N.length; i++) { const q = N[i]; if (q.n <= 0 || !reach(W, c, q.y)) continue; const dd = (q.x - ax) * (q.x - ax) + (q.y - ay) * (q.y - ay); if (dd < nd[3]) { nd[3] = dd; near[3] = q; } }
    for (let i = 0; i < M.length; i++) { const q = M[i]; if ((q.by && q.by !== c.id && W.t - q.byT < 14) || !reach(W, c, q.y)) continue; if ((q.x - d0.x) * (q.x - d0.x) + (q.y - d0.y) * (q.y - d0.y) < 70 * 70) continue; const dd = (q.x - ax) * (q.x - ax) + (q.y - ay) * (q.y - ay); if (dd < nd[q.k]) { nd[q.k] = dd; near[q.k] = q; } }
    if (k0 >= 0) return near[k0];
    let onL = 0, ng = 0; for (let i = 0; i < W.cre.length; i++) { const o = W.cre[i]; if (o.dead || o.team || o.job !== 'g') continue; ng++; if ((o.gj && o.gj.k === 3) || o.haul === 3) onL++; }
    let best = null, bw = -1; for (let k = 0; k < 4; k++) { if (!near[k]) continue; if (k === 3 && onL >= Math.max(1, Math.round(ng * 0.25))) continue; const lean = 0.6 + 0.8 * (((c.id * 2654435761 + k * 40503) >>> 0) % 1000) / 1000, w = (k === 3 ? 0.5 / (3 + col.stock[3]) : 1 / (4 + col.stock[k])) * lean / (1 + Math.sqrt(nd[k]) / 1500); if (w > bw) { bw = w; best = near[k]; } }
    return best;
  }
  function gather(W, c, col, dt) {
    const drop = G.storeAt(W); if (!drop) return; let j = c.gj;
    if (!j) { c.gT = (c.gT || 0) - dt; if (c.gT > 0) { if (Math.hypot(c.x - drop.x, c.y - drop.y) > 260) go(c, drop.x, drop.y + 30, dt, 1.2); return; } c.gT = 0.6 + G.rand() * 0.6; const s = source(W, c, col); if (!s) return; if (s.k !== 3) { s.by = c.id; s.byT = W.t; } j = c.gj = { ph: 0, s: s, k: s.k, t: 0 }; }
    j.t += dt;
    if (j.ph === 0) { const s = j.s; if ((s.k === 3 ? s.n <= 0 : W.mats.indexOf(s) < 0) || j.t > 40) { c.gj = null; return; } if (s.k !== 3) s.byT = W.t;
      if (go(c, s.x, s.y, dt, 2.2) < c.ph.r + 14) { if (s.k === 3) s.n--; else W.mats.splice(W.mats.indexOf(s), 1); j.ph = 1; j.t = 0; c.haul = j.k; G.emit('picked', c, j.k); } }
    else { if (!reach(W, c, drop.y) && Math.abs(c.y - drop.y) < 60 && Math.abs(c.x - drop.x) < 60) j.t = 99;      /* as near as it can come */
      if (go(c, drop.x, drop.y, dt, 2.2) < 36 || j.t > 45) { if (j.t <= 45 || j.t === 99) { col.stock[j.k]++; col.got[j.k]++; c.E = Math.min(c.ph.Emax, c.E + c.ph.Emax * 0.12);      /* (a load brought home earns a meal at the Heart) */ c.score = (c.score || 0) + (j.k === 3 ? 2 : 1); c.done = (c.done || 0) + 1; if (G.learn) G.learn(c, 0.3); G.emit('delivered', c, j.k); } c.haul = -1; c.gj = null; } }
  }

  // ── fighting ──
  const strike = G.strike = function (W, a, b) {
    const ph = a.ph, dmg = (5 + 4 * Math.min(2, ph.spike || 0) + 2.5 * Math.min(2, ph.cnt ? ph.cnt[0] : 0) + ph.r * 0.25) * (0.55 + (ph.aggro || 0)) * (1 - Math.min(0.9, b.ph.defense || 0) * 0.8) * (a.job === 'f' ? 1.3 : a.job === 'u' ? 1.15 : 1) * (b.job === 'u' ? 0.6 : b.job === 'f' ? 0.72 : 1);      // (trained for it: a fighter hits harder, and it and a guard take a blow better)
    a.cool2 = 1.0; a.strike = 0.7; b.E -= dmg; b.flash = 1; a.E -= 2 * (b.ph.spike || 0); a.score = (a.score || 0) + dmg / 14; a.dealt = (a.dealt || 0) + dmg; W.stats.fights = (W.stats.fights || 0) + 1;
    if (b.team && !a.team) { b.foe = a; if (b.team === 2 && G.foeHeart && G.foeHeart(W)) { b.team = 1; b.job = 'f'; } }      // (one of a rival's people who is struck takes up arms)
    { const kx = b.x - a.x, ky = b.y - a.y, kd = Math.hypot(kx, ky) || 1; b.vx += kx / kd * 46; b.vy += ky / kd * 46; a.swAng = Math.atan2(ky, kx); a.swT = W.t; b.hitT = W.t; }      // (the one struck is knocked back a little)
    G.emit('fight', a, b, dmg);
    if (b.E <= 0) { a.score += 2; a.kills = (a.kills || 0) + 1; G.killCreature(b, 'fought', a); G.emit('slain', a, b); }
    if (a.E <= 0) G.killCreature(a, 'fought', b);
  };
  /** close with an enemy: come at it from your own side, stop at arm's length, and strike when you can */
  function engage(W, c, t, dt, haste) { const dx = c.x - t.x, dy = c.y - t.y, d = Math.hypot(dx, dy) || 1, a = Math.atan2(dy, dx) + ((c.id % 5) - 2) * 0.32 * Math.min(1, d / 70), R = c.ph.r + t.ph.r + 5, sy = shoreOf(W);
    c.tired = Math.min(c.tired || 0, 0.6); c.eHold = undefined; c.atSlot = 0;
    go(c, t.x + Math.cos(a) * R, clamp(t.y + Math.sin(a) * R, yLo(W, c), yHi(W, c)), dt, haste || 2.5);
    if (d < R + 10) { c.ang = Math.atan2(-dy, -dx); if (!(c.cool2 > 0)) strike(W, c, t); } }
  /** the nearest of the other side within R of a point (foes: a list made once a moment) */
  function foeNear(foes, x, y, R) { let best = null, bd = R * R; for (let i = 0; i < foes.length; i++) { const o = foes[i]; if (o.dead || o.inShip) continue; const d = (o.x - x) * (o.x - x) + (o.y - y) * (o.y - y); if (d < bd) { bd = d; best = o; } } return best; }
  function fight(W, c, col, foes, dt, guard) {
    const hp = G.heartOf(W), post = c.slot || c.post || (guard ? null : col.rally) || (hp ? { x: hp.x + (guard ? 0 : 120), y: (G.storeAt(W) || hp).y + (c.ph.home ? -30 : 70) } : { x: c.x, y: c.y });
    let foe = c.foe && !c.foe.dead && W.cre.indexOf(c.foe) >= 0 ? c.foe : null; if (!foe) { c.foe = null; if (foes.length) foe = foeNear(foes, guard ? post.x : c.x, guard ? post.y : c.y, guard ? 230 : c.raze ? 150 : 330) || (guard || c.raze ? null : foeNear(foes, post.x, post.y, 520)); }
    if (c.raze && !(foe && Math.hypot(foe.x - c.x, foe.y - c.y) < 150)) { const w = c.raze; if ((W.works || []).indexOf(w) < 0 || !w.enemy || !w.bp) c.raze = null; else { const sy = shoreOf(W), ty = clamp(w.y + w.bp.S * 0.45, yLo(W, c), yHi(W, c));
        c.tired = Math.min(c.tired || 0, 0.6); if (go(c, w.x + ((c.id % 7) - 3) * 26, ty, dt, 2.2) < 80 && !(c.cool2 > 0)) { c.cool2 = 1.2; c.strike = 0.7; c.ang = Math.atan2(w.y - c.y, w.x - c.x); c.swAng = c.ang; c.swT = W.t; c.score = (c.score || 0) + 0.3; G.damageWork(w, 2.4 + c.ph.r * 0.12 + 1.2 * Math.min(2, c.ph.spike || 0), c); } return; } }      /* (sent against a building of theirs: it is broken piece by piece) */
    if (foe && reach(W, c, foe.y)) { engage(W, c, foe, dt); return; }
    if (G.holdSlot && G.holdSlot(W, c, dt)) { if (guard && c.atSlot) c.score = (c.score || 0) + dt * 0.02; return; }      // (nobody to fight: it stands in its place on the muster ground, or at its post)
    const py = clamp(post.y, yLo(W, c), yHi(W, c)), d = Math.hypot(c.x - post.x, c.y - py), leash = guard ? 70 : 130;
    if (d > leash) go(c, post.x + Math.cos(c.id * 2.4) * leash * 0.6, py + Math.sin(c.id * 2.4) * leash * 0.4, dt, d > 400 ? 2.4 : 1.4); else if (guard) c.score = (c.score || 0) + dt * 0.02;
  }
  /** one of the other side, come to raid: it goes for whoever of yours is near, and otherwise for the Heart, which it breaks piece by piece */
  function raid(W, c, col, yours, dt) {
    const back = c.foe && !c.foe.dead && !c.foe.inShip && Math.hypot(c.foe.x - c.x, c.foe.y - c.y) < 260 ? c.foe : null, near = back || foeNear(yours.filter(function (o) { return o.job === 'f' || o.job === 'u'; }), c.x, c.y, 120), hp = G.heartOf(W);      // (it fights back at whoever struck it, and goes for a fighter or a guard that comes near: it has come for the Heart, not for those who live round it)
    if (near && reach(W, c, near.y)) { engage(W, c, near, dt, 2.4); return; }
    const tgt = c.raidAt && (W.works || []).indexOf(c.raidAt) >= 0 ? c.raidAt : hp; if (!tgt) return; const ty = clamp(tgt.y + tgt.bp.S * 0.45, yLo(W, c), yHi(W, c));
    const rk = (c.raidK === undefined ? c.id : c.raidK) % 14;      // (they come at the Heart in a line, not a heap)
    if (go(c, tgt.x + ((rk % 7) - 3) * 28, ty + (rk >= 7 ? (c.ph.home ? -24 : 24) : 0), dt, 2) < 70 && !(c.cool2 > 0)) { c.ang = Math.atan2(tgt.y - c.y, tgt.x - c.x); c.swAng = c.ang; c.swT = W.t; c.cool2 = 1.2; c.strike = 0.7; G.damageWork(tgt, 2 + c.ph.r * 0.1 + Math.min(2, c.ph.spike || 0), c); }
  }
  /** one of a rival colony at home: it goes for whoever struck it, and for any of yours that comes near its Heart; otherwise it lives as it likes */
  function defend(W, c, h, yours, dt) {
    let tgt = c.foe && !c.foe.dead && !c.foe.inShip && Math.hypot(c.foe.x - c.x, c.foe.y - c.y) < 300 ? c.foe : null; if (!tgt) { c.foe = null; const hy = h.y + h.bp.S * 0.45; if (Math.hypot(c.x - h.x, c.y - hy) < 520) tgt = foeNear(yours, h.x, hy, 270); }
    if (tgt && reach(W, c, tgt.y)) { engage(W, c, tgt, dt, 2.4); return; }
    const hy = h.y + h.bp.S * 0.45, d = Math.hypot(c.x - h.x, c.y - hy); if (d > 240) go(c, h.x + Math.cos(c.id * 2.4) * 120, clamp(hy + Math.sin(c.id * 2.4) * 60, yLo(W, c), yHi(W, c)), dt, 1.4);      /* (it keeps near what it defends) */
  }
  /** a building is struck: so much harm knocks a piece off it; one with no piece left is gone */
  G.damageWork = function (w, dmg, by) {
    const W = G.W; if (!w || !w.bp) return; w.harm = (w.harm || 0) + dmg; w.dmg = 1; w.hitGen = W.gen; w.hitT = W.t; G.emit('work-hit', w, by);
    const tough = w.bp.type === 'heart' ? (w.enemy ? 70 : 110) : w.bp.type === 'wall' ? 90 : 60;      // (how much harm one piece takes)
    while (w.harm >= tough) { w.harm -= tough; const P = w.bp.P; let k = -1; for (let i = P.length - 1; i >= 0; i--) if (P[i].st > 0) { k = i; break; } if (k < 0) break; P[k].st = 0; G.emit('build-fall', w, P[k]); }
    if (G.buildCount && G.buildCount(w)[0] === 0) { const i = (W.works || []).indexOf(w); if (i >= 0) W.works.splice(i, 1); G.emit('work-gone', w, 'razed'); if (w.bp.type === 'heart') G.emit(w.enemy ? 'foe-heart-lost' : 'heart-lost', w, by); }
  };

  G.on('heart-lost', function (w, by) { const W = G.W, col = colony(W); col.fell = (col.fell || 0) + 1; col.taken = col.stock.slice(); col.stock = [0, 0, 0, 0]; const h = G.ensureHeart(W); if (h) { h.bp.P.forEach(function (p, i) { p.st = i < 2 ? 2 : 0; }); h.ruin = true; h.fellGen = W.gen; h.hitT = W.t; }
    W.cre.forEach(function (c) { if (hostile(c) && !c.dead) c.leave = 1; }); G.emit('heart-fell', h, by, col.taken); });
  /** the Heart is mended by the builders, a piece at a time, out of the store (slowly, and from what they can scrape together, when it is empty) */
  function mend(W, col) { const h = G.heartOf(W); if (!h) return; if (W.t - (h.hitT === undefined ? -99 : h.hitT) < 8) { h.mendT = 0; return; } const P = h.bp.P; let k = -1; for (let i = 0; i < P.length; i++) if (P[i].st < 2) { k = i; break; }
    if (k < 0) { if (h.ruin || h.dmg) { h.ruin = false; h.dmg = 0; h.harm = 0; G.emit('heart-whole', h); } return; }
    const nb = G.jobCount(W).b; h.mendT = (h.mendT || 0) + 1.2; if (h.mendT < (nb ? Math.max(2.4, 10 / nb) : 16)) return;
    if (P[k].st === 0) { const m = P[k].m | 0; if (col.stock[m] > 0) col.stock[m]--; else { let any = -1; for (let q = 0; q < 3; q++) if (col.stock[q] > 0) { any = q; break; } if (any >= 0) col.stock[any]--; else if (h.mendT < 22) return; } }
    P[k].st++; P[k].t0 = W.t; h.mendT = 0; G.emit('heart-mended', h, P[k]); }
  /** a finished tower strikes at the nearest raider in reach, every moment and a half */
  function towers(W, dt) { const Wk = W.works || []; for (let i = 0; i < Wk.length; i++) { const w = Wk[i]; if (!w.tower || !w.bp || w.enemy) continue; w.zapT = (w.zapT || 0) - dt; if (w.zapT > 0) continue; w.zapT = 0.5;
      const n = G.buildCount(w); if (n[0] < n[2] * 0.7) continue; let best = null, bd = 300 * 300; for (let k = 0; k < W.cre.length; k++) { const c = W.cre[k]; if (c.team !== 1 || c.dead || c.inShip) continue; const d = (c.x - w.x) * (c.x - w.x) + (c.y - w.y) * (c.y - w.y); if (d < bd) { bd = d; best = c; } }
      if (!best) continue; w.zapT = 1.3; best.E -= 16; best.flash = 1; w.zaps = (w.zaps || 0) + 1; G.emit('tower-zap', w, best); if (best.E <= 0) { w.kills = (w.kills || 0) + 1; G.killCreature(best, 'fought', null); G.emit('tower-kill', w, best); } } }
  G.on('scored', function () { const W = G.W; if (!W || !W.col || !W.col.nodes || W.gen % 2) return; W.col.nodes.forEach(function (q) { if (q.n < q.n0) q.n++; }); });      // (lumen grows back, a piece every other year)
  // raiders are not the star's own: its winter does not choose among them (a raid that is not beaten wears itself out in three years)
  G.on('winter', function () { const W = G.W; if (W && !(G.foeHeart && G.foeHeart(W))) W.cre.forEach(function (c) { if (hostile(c) && W.gen - c.born < 3) c.doomed = false; }); });

  // ── who does what: your quotas are filled from those best made for the work ──
  const APT = { g: function (c) { return c.ph.speed * 0.02 + (c.ph.hands ? 0.6 : 0) + Math.min(4, c.ph.limbs || 0) * 0.1 + (c.g.s ? c.g.s[3] * 0.4 : 0); }, b: function (c) { return (c.ph.hands ? 0.8 : 0) + Math.min(4, c.ph.limbs || 0) * 0.12 + (c.g.s ? c.g.s[3] * 0.6 : 0) + c.ph.speed * 0.008; },
    f: function (c) { return c.ph.r * 0.04 + Math.min(2, c.ph.spike || 0) * 0.5 + (c.ph.aggro || 0) + Math.min(2, c.ph.cnt ? c.ph.cnt[0] : 0) * 0.3 - (c.g.s ? c.g.s[1] * 0.5 : 0); }, u: function (c) { return (c.ph.defense || 0) * 2 + c.ph.r * 0.035 + Math.min(2, c.ph.spike || 0) * 0.3 - (c.g.s ? c.g.s[1] * 0.3 : 0); } };
  G.jobFit = function (c, job) { return APT[job] ? APT[job](c) : 0; };
  /** how many of your colony have each trade (and how many are free) */
  G.jobCount = function (W) { W = W || G.W; const n = { g: 0, b: 0, f: 0, u: 0, free: 0, all: 0 }; for (let i = 0; i < W.cre.length; i++) { const c = W.cre[i]; if (c.dead || !mine(c)) continue; n.all++; if (c.job && n[c.job] !== undefined) n[c.job]++; else n.free++; } return n; };
  const setJob = G.setJob = function (c, job, pinned) { if (c.job === job) { if (pinned) c.pin = true; return; } c.job = job || ''; c.pin = !!pinned && !!job; c.gj = null; c.hungry = false; if (job !== 'f') c.raze = null; if (c.haul >= 0 && !c.deedId) c.haul = -1; c.foe = null; if (!job) { c.post = null; c.area = null; } c.score = 0; G.emit('job', c, job); };
  function staff(W, col) {
    const n = G.jobCount(W), keys = ['f', 'u', 'b', 'g']; if (!W.farOf && (W.t - (col.shT || -9) > 1 || W.t < (col.shT || 0))) { col.shT = W.t; shares(W, col, n); } let room = W.gen < 5 ? 0 : Math.max(0, Math.floor(n.all * 0.6) - 4);      // (no more than six in ten work, and nobody in a star's first years: the rest must live and breed)
    for (let q = 0; q < keys.length; q++) { const k = keys[q], want = W.farOf ? Math.min(col.want[k] | 0, n.all) : Math.min(col.want[k] | 0, room); room -= want;
      if (n[k] < want && (k === 'f' || k === 'u') && W.t - (col.warT || -99) < 2.5 && W.cre.some(function (o) { return o.team === 1 && !o.dead; })) continue;      // (while enemies are on the star the ranks are made up slowly)
      if (n[k] < want) { if (k === 'f' || k === 'u') col.warT = W.t; let best = null, bs = -1e9; for (let i = 0; i < W.cre.length; i++) { const c = W.cre[i]; if (c.dead || !mine(c) || c.job || c.deedId || c.inShip || (c.stranger !== undefined && !W.farOf) || c.age < 0) continue; const s = APT[k](c) + (c.E / c.ph.Emax) * 0.2; if (s > bs) { bs = s; best = c; } } if (best) { setJob(best, k, false); return; } }
      else if (n[k] > want) { let worst = null, ws = 1e9; for (let i = 0; i < W.cre.length; i++) { const c = W.cre[i]; if (c.dead || !mine(c) || c.job !== k || c.pin || c.deedId) continue; const s = (c.score || 0) + APT[k](c) * 0.3; if (s < ws) { ws = s; worst = c; } } if (worst) { setJob(worst, '', false); return; } }
    }
  }
  // a child is born into its parent's trade
  G.on('birth', function (c, a, b) { const p = a && a.job && mine(a) ? a : b && b.job && mine(b) ? b : null; if (p && !c.team) { c.job = p.job; if (p.post) c.post = p.post; if (p.area) c.area = p.area; if (p.gk !== undefined) c.gk = p.gk; if (p.raze) c.raze = p.raze; if (p.pin && p.raze) c.pin = true; } if (a && a.team) c.team = a.team; });
  // a builder who sets a piece has done its work
  G.on('build-piece', function (d, pc, c) { if (c && c.job === 'b') { c.score = (c.score || 0) + 1; c.done = (c.done || 0) + 1; } });

  // ── those who do their work well breed more ──
  G.on('scored', function () {
    const W = G.W; if (!W) return; const by = { g: [], b: [], f: [], u: [] };
    for (let i = 0; i < W.cre.length; i++) { const c = W.cre[i]; c.jobF = 1; if (!c.dead && c.job && by[c.job] && mine(c)) by[c.job].push(c); }
    for (const k in by) { const L = by[k]; if (L.length < 3 || !L.some(function (c) { return (c.score || 0) > 0; })) continue; L.sort(function (a, b) { return (a.score || 0) - (b.score || 0); });
      for (let i = 0; i < L.length; i++) { const c = L[i]; c.jobF = 0.78 + 0.5 * (i / (L.length - 1)); c.fit = clamp((c.fit || 0) * c.jobF, 0, 1); c.score = (c.score || 0) * 0.4; } }
  });

  // ── what is waiting to be built: one thing at a time, by the builders ──
  // (What each is CALLED is the plainest word for what it does, one that would fit any creature: nobody knows what these are, and "house", "hall", "farm" would say they
  //  are us. `short` is what its button says; `does` is said in full the moment the pointer is on the button. The keys are what a building IS in the plans.)
  const KINDS = G.BUILDABLE = {
    house: { name: 'Home', what: 'a home to rest in', res: { house: true, size: 0.04 }, note: 'Tired ones come back to it and sleep safe.', does: 'HOME: where they rest. Tired ones come back to it and sleep safe.' },
    hall: { name: 'Meeting place', short: 'Meeting', what: 'a place to come together', res: { pull: 0.08, size: 0.075 }, note: 'A place of their own: it draws them together.', does: 'MEETING PLACE: where they come together. It keeps your colony close round it.' },
    huts: { name: 'Food garden', short: 'Food', what: 'a garden where food is grown and kept', res: { feed: 0.25, size: 0.075 }, note: 'It feeds those who live round it.', does: 'FOOD GARDEN: food is grown and kept here. It feeds those who live round it.' },
    wall: { name: 'Wall', what: 'a ring wall to live inside', res: { solid: true, size: 0.075 }, note: 'Only your own may pass it.', does: 'WALL: a ring to live inside. Only your own may pass it.' },
    tower: { name: 'Tower', what: 'a tower that strikes at enemies', res: { pull: 0.22, size: 0.07, tower: true }, cost: [0, 0, 0, 3], note: 'It strikes at any enemy that comes near. Its eye is cut from 3 lumen.', does: 'TOWER: it strikes at any enemy that comes near, by itself. Costs 3 lumen.' },
    port: { name: 'Spaceport', what: 'a spaceport, to build a spaceship on', res: { port: true, size: 0.085 }, note: 'The pad a spaceship is built on.', does: 'SPACEPORT: the pad a starship is built on. One to a star.' },
    ship: { name: 'Starship', what: 'a spaceship on the spaceport', res: { ship: true, size: 0.06 }, note: 'It carries a crew to another star. It needs a spaceport.', does: 'STARSHIP: it carries a crew to another star (4 lumen a flight). It needs a spaceport.' } };
  G.MAXPORTS = 4;      // (and so four starships: a fleet)
  const HALF = { house: 62, hall: 107, huts: 100, wall: 115, spire: 54, tower: 56, port: 145 };      // half the width each stands on the star (53_art.js fits its painting to the same)
  /** may this be built there? '' if so, else why not */
  G.buildOk = function (type, x, y) {
    const W = G.W, K = KINDS[type]; if (!W || !K) return 'unknown'; const sy = shoreOf(W), Wk = W.works || [], e = (G.sideEdge ? G.sideEdge(W) : 40) + 70;
    const colq = colony(W).queue || [], dOrd = W.deed && W.deed.ordered && W.deed.result ? W.deed.result : null, cnt = function (t) { return Wk.filter(function (w) { return w.bp && w.bp.type === t && !w.visitor && !w.enemy && !w.fall; }).length + colq.filter(function (q) { return q.type === t; }).length + (dOrd && dOrd[t] ? 1 : 0); };
    if (type === 'ship') { const ports = Wk.filter(function (w) { return w.bp && w.bp.type === 'port' && !w.fall && !w.enemy; }).length; if (!ports) return 'It needs a spaceport first.'; if (cnt('ship') >= ports) return 'Every spaceport has its ship. For another ship, build another spaceport.'; return ''; }
    if (type === 'port') { if (cnt('port') >= G.MAXPORTS) return 'A star holds ' + G.MAXPORTS + ' spaceports at most.'; if (!G.FLAT && y > sy - 30) return 'A spaceport stands on the high ground.'; }
    if (x < e || x > W.ww - e) return 'Too near the edge.';
    if (G.FLAT) { if (y < 150) return 'Too near the edge.'; if (y > W.wh - 60) return 'Too near the edge.'; { const N = colony(W).nodes || []; for (let q = 0; q < N.length; q++) if (Math.abs(N[q].x - x) < 130 && y > N[q].y - 90 && y < N[q].y + 190) return 'Lumen grows there: nothing is built on it.'; } const st = G.siteAt ? G.siteAt(W, x, y - 40, 70) : null; if (st) return 'That is ' + (st.k === 'grove' ? 'a feeding ground' : st.k === 'lumen' ? 'where lumen grows' : 'the ' + st.name.toLowerCase()) + ': nothing is built on it.'; }
    else if (type !== 'port') { if (y > sy) { if (y < sy + 250) return 'Too near the rim: on the low ground, build further down.'; if (y > W.wh - 70) return 'Too near the edge.'; } else { if (y > sy - 46) return 'Too near the rim.'; if (y < 170) return 'Too near the top.'; } }
    { const g = G.onGround ? G.onGround(W, x, y) : null; if (g) return 'That is the ' + g.name.toLowerCase() + ': nothing is built on it.'; }
    if (G.FLAT) {      // (room for each as wide as it really stands on the star: a spaceport is wide, a tower is not)
      const half = function (t, w) { return t === 'heart' ? 96 + 20 * ((w && (w.tier | 0)) || 0) : HALF[t === 'spire' && w && w.tower ? 'tower' : t] || 70; }, a = half(type === 'tower' ? 'tower' : type, null);
      for (let i = 0; i < Wk.length; i++) { const w = Wk[i]; if (!w.bp || w.bp.type === 'ship') continue; const b = half(w.bp.type, w); if (Math.abs(w.x - x) < (a + b) * 0.92 && Math.abs(w.y + w.bp.S * 0.45 - y) < (a + b) * 0.8) return 'Too near the ' + w.name + '.'; }
      if (colq.some(function (q) { if (q.type === 'ship') return false; const b = half(q.type === 'tower' ? 'tower' : q.type, null); return Math.abs(q.x - x) < (a + b) * 0.92 && Math.abs(q.y - y) < (a + b) * 0.8; })) return 'Something is already to be built there.';
      return ''; }
    for (let i = 0; i < Wk.length; i++) { const w = Wk[i]; if (w.bp && Math.abs(w.x - x) < (w.bp.hw || 60) + 90 && Math.abs(w.y - y) < 150) return 'Too near the ' + w.name + '.'; }
    if ((colony(W).queue || []).some(function (q) { return Math.abs(q.x - x) < 170 && Math.abs(q.y - y) < 150; })) return 'Something is already to be built there.';
    return '';
  };
  G.buildOrder = function (type, x, y) {
    const W = G.W, K = KINDS[type]; if (!W || !K) return null; const why = G.buildOk(type, x, y); if (why) return { error: why };
    const col = colony(W); if (K.cost) { for (let q = 0; q < 4; q++) if ((K.cost[q] || 0) > col.stock[q]) return { error: 'It needs ' + K.cost[q] + ' ' + RES[q] + ' (there is ' + col.stock[q] + ' in the store).' }; for (let q = 0; q < 4; q++) col.stock[q] -= K.cost[q] || 0; }
    const n = (W.works || []).filter(function (w) { return w.bp && w.bp.type === type; }).length + col.queue.filter(function (q) { return q.type === type; }).length;
    const o = { id: (col.nextQ = (col.nextQ || 0) + 1), type: type, x: x, y: y, name: K.name + (n ? ' ' + (n + 1) : ''), gen: W.gen }; col.queue.push(o); if (col.want.b < 3) col.want.b = 3; G.emit('build-ordered', o); return o;
  };
  G.buildCancel = function (id) { const col = colony(); const i = col.queue.findIndex(function (q) { return q.id === id; }); if (i >= 0) { const K = KINDS[col.queue[i].type]; if (K && K.cost) for (let q = 0; q < 4; q++) col.stock[q] += K.cost[q] || 0; col.queue.splice(i, 1); G.emit('build-cancelled', id); } };
  function startBuild(W, col) {
    const o = col.queue[0]; if (!o || W.deed || !G.deedStart || (G.missionWaits && G.missionWaits())) return;      /* (a mission that is waiting to begin goes first: the builders do not start something new in front of it) */ const B = W.cre.filter(function (c) { return !c.dead && mine(c) && c.job === 'b' && !c.deedId && !c.hungry; }); if (B.length < 2) return;
    if (o.type === 'ship') { const Wk = W.works || [], ships = Wk.filter(function (w) { return w.bp && w.bp.type === 'ship' && !w.visitor; }), ports = Wk.filter(function (w) { return w.bp && w.bp.type === 'port' && !w.fall && !w.enemy; });
      const free = ports.filter(function (pt) { const dk = G.dockOf(pt); return !ships.some(function (s) { return Math.abs(s.x - dk.x) < 80 && Math.abs(s.y + s.bp.S * 0.45 - dk.y) < 110; }); }), port = free.filter(function (pt) { return G.buildCount(pt)[0] >= G.buildCount(pt)[2]; })[0];      /* (a ship is built on a spaceport that stands whole and empty) */
      if (!port) { if (!ports.length || (!free.length && !ports.some(function (pt) { return G.buildCount(pt)[0] < G.buildCount(pt)[2]; }))) col.queue.shift(); return; } const dk = G.dockOf(port); o.x = dk.x; o.y = dk.y; o.at = { x: dk.x, y: dk.y }; }
    const K = KINDS[o.type], bySp = {}; B.forEach(function (c) { bySp[c.sp] = (bySp[c.sp] || 0) + 1; }); let spId = 0, bn = -1; for (const k in bySp) if (bySp[k] > bn && +k) { bn = bySp[k]; spId = +k; }
    const sp = (spId && G.speciesById(spId)) || W.species.filter(function (s) { return !s.extinct; }).sort(function (a, b) { return b.n - a.n; })[0]; if (!sp) return;
    const res = Object.assign({ name: o.name, looks: o.auto ? 'raised by your builders, as the colony itself decided' : 'ordered by you, raised by your builders', stuff: 'rock', shape: 'circle', size: 0.075, solid: false, feed: 0, slow: 0, hurt: 0, pull: 0, life: 240, type: o.type === 'tower' ? 'spire' : o.type, ordered: true }, K.res);
    if (o.at) res.at = o.at; else if (o.type !== 'ship') res.at = { x: o.x, y: o.y };
    const d = G.deedStart({ kind: sp.name, title: o.name, say: '', what: 'build ' + K.what, why: o.why || 'you ordered it', share: 0.5, own: true, steps: [{ do: 'gather', secs: 3, cry: '' }, { do: 'build', secs: 46, cry: '' }], place: { x: o.x / W.ww, y: o.y / W.wh }, result: res });
    if (!d || d.title !== o.name) return;
    W.cre.forEach(function (c) { if (c.deedId === d.id) c.deedId = 0; }); B.slice(0, 12).forEach(function (c, j) { c.deedId = d.id; c.deedJ = j; }); d.n0 = Math.min(12, B.length); d.ordered = o.id; d.order = o; col.queue.shift(); G.emit('build-started', o, d);
  }
  // an ordered building whose builders fell away (too few of them, for too long) is not forgotten: it waits its turn again, three times at most
  G.on('deed-end', function (d, how) { const W = G.W; if (!W || !d || !d.order || how === 'done' || how === 'off') return; const col = colony(W), o = d.order; if ((o.tries | 0) >= 3) { if (G.log && G.mode === 'play') G.log('sel', o.name + ' was given up', 'Three times its builders were too few to raise it.'); return; } o.tries = (o.tries | 0) + 1; col.queue.unshift(o); G.emit('build-ordered', o); });
  // ── the colony grows by itself ──
  // Left alone, a colony builds what it is SHORT of for its numbers, as one society and not kind by kind. It counts itself and what stands, and orders the thing it
  // lacks most (its builders then raise it, exactly as if you had ordered it; you may cancel it, or order anything yourself):
  //     a HOME           for every nine or so of them
  //     a FOOD GARDEN    for every thirty mouths, and one more while they go hungry
  //     a MEETING PLACE  once there are eighteen of them, another for every sixty
  //     a TOWER          once raiders have come: more, the more often they come (3 lumen each, from the store), set to the north, where raiders land
  //     a WALL           once the Heart has fallen, or raiders have come three times
  //     a SPACEPORT      once the colony has grown and there are thirty of them; then a STARSHIP on it
  // Homes close in round the Heart, a garden goes toward a feeding ground, towers toward where the danger comes from: so the place makes sense to look at.
  // (Hands enough for its numbers: gatherers and builders are a SHARE of the colony from the start, so they grow with it; see `shares` above.)
  // The switch is `col.auto` (the box "it grows by itself" in the colony panel); off, nothing is built but what you order.
  const standing = function (W, col, type) { let n = 0; const Wk = W.works || []; for (let i = 0; i < Wk.length; i++) { const w = Wk[i]; if (!w.bp || w.enemy || w.fall || w.visitor) continue; if ((w.tower ? 'tower' : w.bp.type) === type) n++; }
    n += col.queue.filter(function (q) { return q.type === type; }).length; const d = W.deed, r = d && d.ordered ? d.result : null; if (r && (r.tower ? 'tower' : r.port ? 'port' : r.ship ? 'ship' : r.house ? 'house' : r.type) === type) n++; return n; };
  /** what your colony on this star needs for its numbers, and has: { N, fed, threat, list: [{ t, need, have, why }] } */
  G.colonyNeeds = function (W) {
    W = W || G.W; const col = colony(W); let N = 0, e = 0; for (let i = 0; i < W.cre.length; i++) { const c = W.cre[i]; if (c.dead || !mine(c)) continue; N++; e += c.E / c.ph.Emax; }
    const fed = N ? e / N : 1, raids = col.raidN | 0, threat = raids > 0 || !!col.raid || (col.fell | 0) > 0, port = (W.works || []).filter(function (w) { return w.bp && w.bp.type === 'port' && !w.fall && !w.enemy; })[0], portWhole = !!port && G.buildCount(port)[0] >= G.buildCount(port)[2];
    const L = [
      { t: 'house', need: Math.min(18, Math.ceil(N / 9)), why: 'there are more of them than there are homes' },
      { t: 'huts', need: N >= 14 ? Math.min(6, Math.ceil(N / 30) + (fed < 0.45 ? 1 : 0)) : 0, why: fed < 0.45 ? 'they are going hungry' : 'there are more mouths than the gardens feed' },
      { t: 'hall', need: N >= 18 ? Math.min(3, Math.ceil(N / 60)) : 0, why: 'there are too many of them to have nowhere to come together' },
      { t: 'tower', need: threat ? Math.min(4, 1 + Math.floor(raids / 2)) : 0, why: 'raiders have come, and will come again' },
      { t: 'wall', need: (col.fell | 0) > 0 || raids >= 3 ? 1 : 0, why: 'the Heart has been struck at' },
      { t: 'port', need: (col.tier | 0) >= 1 && W.gen >= 16 && N >= 30 ? 1 : 0, why: 'they have seen the lights of other stars, far off in space' },
      { t: 'ship', need: portWhole ? 1 : 0, why: 'their spaceport stands ready' }];
    L.forEach(function (q) { q.have = standing(W, col, q.t); });
    return { N: N, fed: fed, threat: threat, list: L };
  };
  /** is it the colony (and not each kind for itself) that decides what is built on this star? */
  G.colonyPlans = function (W) { W = W || G.W; return !!(G.FLAT && W && W.col && G.heartOf(W)); };
  function placeFor(W, col, t, k) {
    if (t === 'ship') return { x: 0, y: 0 }; const H = G.heartOf(W); if (!H || !G.lotPick) return null; const hx = H.x, hy = H.y + H.bp.S * 0.45; let tx = hx, ty = hy + 130;
    if (t === 'huts') { const S = (G.sitesOf ? G.sitesOf(W) : []).filter(function (s) { return s.k === 'grove'; }).sort(function (a, b) { return Math.hypot(a.x - hx, a.y - hy) - Math.hypot(b.x - hx, b.y - hy); }), g = S.length ? S[k % S.length] : null; if (g) { tx = hx + (g.x - hx) * 0.55; ty = hy + (g.y - hy) * 0.55; } }
    else if (t === 'tower') { tx = hx + (k % 2 ? 1 : -1) * (240 + 70 * Math.floor(k / 2)); ty = hy - 190; }
    else if (t === 'hall') { tx = hx + (k % 2 ? -1 : 1) * 80; ty = hy + 250; }
    else if (t === 'wall') { tx = hx; ty = hy - 280; }
    else if (t === 'port') { tx = hx + (H.x < W.ww / 2 ? 1 : -1) * 560; ty = hy - 140; }
    const p = G.lotPick(W, tx, ty, t); return p ? { x: p.x, y: p.y } : null;
  }
  let planT = 0;
  function planGrowth(W, col, dt) {
    planT += dt; if (planT < 14) return; planT = 0;
    if (col.auto === false || !G.colonyPlans(W) || W.gen < 10 || G.mode === 'title') return; const h = G.heartOf(W); if (!h || h.ruin) return;
    const nd = G.colonyNeeds(W), N = nd.N;
    if (col.queue.length || W.deed || (W.works || []).length >= 40 || N < 9 || (G.missionWaits && G.missionWaits())) return;
    const L = nd.list.filter(function (q) { return q.need > q.have; }).sort(function (a, b) { return (b.need - b.have) / b.need - (a.need - a.have) / a.need; });      // (what it is shortest of comes first; equal, in the order above)
    for (let i = 0; i < L.length; i++) { const q = L[i], at = placeFor(W, col, q.t, q.have); if (!at) continue; const o = G.buildOrder(q.t, at.x, at.y); if (!o || o.error) continue;
      o.auto = true; o.why = q.why; G.emit('colony-plans', o, q); if (G.log) G.log('disc', 'The colony decided: ' + o.name, 'Why: ' + q.why + '. Its builders will raise it.'); return; }
  }

  // an ordered building is the builders' work, whoever they are: nobody else is called in to make up the numbers
  { const s0 = G.step; G.step = function (dt) { s0(dt); const W = G.W; if (!W || W.title) return; const d = W.deed; if (d && d.ordered) { let n = 0; const used = {};
        for (let i = 0; i < W.cre.length; i++) { const c = W.cre[i]; if (c.deedId !== d.id || c.dead) continue; if (c.job !== 'b' || c.team) { c.deedId = 0; c.bj = null; if (c.haul >= 0) c.haul = -1; continue; } n++; used[c.deedJ] = 1; }
        if (n < 12) for (let i = 0; i < W.cre.length && n < 12; i++) { const c = W.cre[i]; if (c.dead || c.team || c.job !== 'b' || c.deedId || c.inShip || c.asleep || c.E < c.ph.Emax * 0.3) continue; let j = 0; while (used[j]) j++; used[j] = 1; c.deedId = d.id; c.deedJ = j; n++; }      /* (a builder born or named since joins in) */
        d.n0 = Math.max(2, n); } }; }

  // ── the colony's moment: every step ──
  let acc = 0;
  { const s1 = G.step; G.step = function (dt) { s1(dt); const W = G.W; if (!W || W.title || W.extinct) return; const col = colony(W);
      if (!W.farOf || (G.starHeld && G.starHeld(W))) G.ensureHeart(W);
      acc += dt; if (acc >= 1.2) { acc = 0; for (let q = 0; q < 6; q++) staff(W, col); planGrowth(W, col, 1.2); startBuild(W, col); mend(W, col); grow(W, col); const h = G.heartOf(W); if (h) { h.x = clamp(h.x, 200, W.ww - 200); h.y = heartY(W, h.bp.S); } }
      let foes = null, yours = null, gone = false, anyFoe = false; towers(W, dt); for (let i = 0; i < W.cre.length; i++) if (W.cre[i].team === 1 && !W.cre[i].dead) { anyFoe = true; break; }
      const theirs = G.foeHeart ? G.foeHeart(W) : null;
      for (let i = 0; i < W.cre.length; i++) { const c = W.cre[i]; if (c.dead) continue; if (c.cool2 > 0) c.cool2 -= dt;
        if (c.team === 2) continue;      /* (the people of another star: they live as they like) */
        if (c.team && theirs && !c.raid) { if (!yours) yours = W.cre.filter(function (o) { return !o.dead && !o.team && !o.inShip; }); if (!c.asleep) defend(W, c, theirs, yours, dt); continue; }
        if (c.team) { if (c.eKeep !== undefined && c.E < c.eKeep && c.E > 0) c.E += (c.eKeep - c.E) * 0.8;      /* (raiders came provisioned: living costs them little while the raid lasts) */
          if (c.leave) { const fx = c.from ? c.from.x : c.x < W.ww / 2 ? -40 : W.ww + 40, fy = c.from ? c.from.y : c.y; c.leave += dt; if (go(c, clamp(fx, 60, W.ww - 60), clamp(fy, yLo(W, c), yHi(W, c)), dt, 2.2) < 50 || c.leave > 22) { c.gone = 1; gone = true; } continue; }
          if (!yours) yours = W.cre.filter(function (o) { return !o.dead && !o.team && !o.inShip; }); if (!c.inShip && !c.asleep) raid(W, c, col, yours, dt); continue; }
        if (!c.job) continue;
        if (c.deedId || c.asleep || c.inShip || c.goTo) continue;
        const fed = c.E / c.ph.Emax; if (c.slot && c.job !== 'g' && fed > 0.1) c.hungry = false; else if (c.hungry) { if (fed > (c.job === 'f' || c.job === 'u' ? 0.8 : 0.62) || ((c.job === 'f' || c.job === 'u') && (anyFoe || c.raze) && fed > 0.2)) c.hungry = false; else { if (c.job === 'g' && c.haul >= 0 && !c.gj) c.haul = -1; continue; } } else if (!(c.slot && c.job !== 'g') && fed < (c.job === 'f' || c.job === 'u' ? 0.5 : 0.33) && !((c.job === 'f' || c.job === 'u') && (anyFoe || c.raze) && fed > 0.18)) { c.hungry = true; continue; }      /* (fighters and guards keep themselves better fed, to be fit when it comes to it; and nobody leaves a fight to eat) */
        if (c.job === 'g') gather(W, c, col, dt);
        else if (c.job === 'b') { if (G.holdSlot) G.holdSlot(W, c, dt); }      /* (nothing to build: it waits in the builders' yard) */
        else if (c.job === 'f' || c.job === 'u') { if (!foes) foes = W.cre.filter(function (o) { return !o.dead && o.team === 1; }); fight(W, c, col, foes, dt, c.job === 'u'); }
      }
      for (let i = W.cre.length - 1; i >= 0; i--) { const c = W.cre[i]; if (c.team === 1 && !theirs) { c.eKeep = c.E; if (gone && c.gone) { W.cre.splice(i, 1); G.emit('foe-left', c); } } }
    }; }

  // ── your orders ──
  /** send these creatures somewhere, or against something. o: { x, y } and maybe foe (a creature), mat (a thing to gather: its sort is taken), work (a building) */
  G.order = function (list, o) {
    const W = G.W, col = colony(W); let n = 0;
    list.forEach(function (c) { if (!c || c.dead || c.team) return; n++;
      if (o.foe) { if (c.job !== 'f' && c.job !== 'u') setJob(c, 'f', true); c.foe = o.foe; c.raze = null; }
      else if (o.work && o.work.enemy) { if (c.job !== 'f') setJob(c, 'f', true); c.raze = o.work; c.foe = null; c.post = { x: o.work.x, y: o.work.y + o.work.bp.S * 0.45 }; }
      else if (o.mat !== undefined) { if (c.job !== 'g') setJob(c, 'g', true); c.gk = o.mat; c.area = { x: o.x, y: o.y }; c.gj = null; }
      else if (o.work && (c.job === 'u' || c.job === 'f')) { setJob(c, 'u', true); c.post = { x: o.work.x, y: o.work.y + o.work.bp.S * 0.45 + 30 }; }
      else if (c.job === 'f' || c.job === 'u') { c.post = { x: o.x, y: o.y }; c.foe = null; c.raze = null; }
      else if (c.job === 'g') { c.area = { x: o.x, y: o.y }; c.gk = undefined; c.gj = null; }
      else c.goTo = { x: o.x, y: reach(W, c, o.y) ? o.y : c.ph.home ? Math.min(o.y, shoreOf(W) + (W.wh - shoreOf(W)) * 0.06 - c.ph.r) : Math.max(o.y, shoreOf(W) + c.ph.r + 2), until: W.t + 25, order: 1 };      /* (as near as its body lets it come) */
    });
    if (!o.foe && o.mat === undefined && !o.work && list.length && list.every(function (c) { return c.job === 'f'; }) && list.length >= G.jobCount(W).f) { col.rally = { x: o.x, y: o.y }; list.forEach(function (c) { c.post = null; }); }      /* all the fighters at once: that is where fighters rally from now on */
    G.emit('ordered', list, o); return n;
  };
  /** one of another side is set down on your star (team: which side) */
  G.foeDrop = function (genome, x, y, team) { const W = G.W, c = G.makeCreature(G.cloneGenome(genome), null, null, []); c.team = team || 1; c.x = c.px = clamp(x, 30, W.ww - 30); c.y = c.py = clamp(y, 30, W.wh - 30); c.E = c.ph.Emax * 0.9; c.P = c.ph.Emax * 0.4; c.snap = G.snapOf ? G.snapOf(c) : null; W.cre.push(c); G.emit('foe', c); return c; };
  /** give these creatures a trade (or none) */
  G.assign = function (list, job) { const col = colony(); list.forEach(function (c) { if (c && !c.dead && !c.team) setJob(c, job, true); }); const n = G.jobCount(); for (const k in JOBS) if (col.want[k] < n[k]) col.want[k] = n[k]; G.emit('assigned', list, job); };
  /** in words: what this creature's work is, and how it is getting on */
  G.jobText = function (c) { const J = JOBS[c.job]; if (!J) return ''; return J.name + (c.hungry ? ' (gone to feed)' : c.job === 'g' ? (c.done ? ': ' + c.done + ' loads brought in' : '') : c.job === 'b' ? (c.done ? ': ' + c.done + ' pieces set' : '') : (c.kills ? ': ' + c.kills + ' enemies slain' : c.dealt ? ': it has fought' : '')) + '.'; };
})();
