// ── Rival stars, and their raids ──
// Some of the stars near yours are RIVALS: colonies like your own, that want what is in your store. A rival sends a ship. You are warned a year ahead
// (who is coming, and about how many); the ship comes down on your land in spring, its raiders step out and go for your Heart. They are that star's own
// kinds (57x_far.js: every star has its kinds, grown from the same life as yours, so as your star's creatures grow stronger so do theirs).
//     beaten off     every raider slain: you keep your store, and take the lumen their ship carried
//     the Heart falls   they take what is in the store and go home in their ship (54i_colony.js); your builders raise the Heart again
//     worn out       a raid that is neither beaten nor wins gives up after three years and goes home
// Raids grow with what you have: a rich star with many buildings draws a bigger raid than a poor one. The first comes ten years or so after the colony
// is founded, so there is time to name fighters and guards and build a tower.
(function () {
  'use strict';
  const clamp = G.clamp;
  const col = function (W) { return G.colony(W || G.W); };
  /** the rival stars near home, nearest first: { i, j, key, name, hue, dist } (the same ones every time) */
  G.rivals = function () {
    const F = G.far, out = []; if (!F) return out;
    const o = F.origin || { i: 0, j: 0 };      // (cells are counted from the star you set out from)
    for (let i = -4; i <= 4; i++) for (let j = -4; j <= 4; j++) { const p = F.cell(i, j); if (!p || p.free) continue; const d = Math.hypot(i, j); out.push({ i: i, j: j, key: F.key(p), name: p.name, hue: p.hue, dist: d, p: p, rival: F.hash(i, j, 70) < 0.42 }); }
    out.sort(function (a, b) { return a.dist - b.dist; }); let R = out.filter(function (q) { return q.rival; }); if (!R.length && out.length) { out[0].rival = true; R = [out[0]]; }
    return R.slice(0, 6);
  };
  /** how much there is to take on your star: what draws a raid, and sets its size */
  const wealth = function (W) { const c = col(W); return c.stock[0] + c.stock[1] + c.stock[2] + 5 * c.stock[3] + 6 * (W.works || []).filter(function (w) { return w.bp && w.bp.type !== 'heart' && !w.visitor; }).length; };
  G.raidSize = function (W) { W = W || G.W; const c = col(W); return Math.round(clamp(3 + (c.raidN || 0) * 1.3 + wealth(W) / 55, 3, 14)); };

  /** a raid is announced: it will land next spring. who: one of G.rivals() (the nearest, if none is given) */
  G.raidWarn = function (who, n) {
    const W = G.W, c = col(W); if (c.raid || W.farOf) return null; const R = G.rivals().filter(function (q) { const b = G.far.book[q.key]; return !(b && b.held); }); who = who || R[(c.raidN || 0) % Math.max(1, Math.min(2, R.length))]; if (!who) return null;      // (a rival whose star is yours raids no more)
    c.raid = { id: (c.raidN || 0) + 1, key: who.key, i: who.i, j: who.j, name: who.name, hue: who.hue, n: n || G.raidSize(W), landGen: W.gen + 1, state: 'warn', out: 0, t0: 0, x: 0, y: 0, seed: 1 + ((G.far.hash(who.i, who.j, 71) * 9000) | 0) };
    G.emit('raid-warn', c.raid); return c.raid;
  };
  function land(W, c) {
    const r = c.raid, sy = G.shoreY(W), hp = G.heartOf(W), e = (G.sideEdge ? G.sideEdge(W) : 40) + 110, port = (W.works || []).filter(function (w) { return w.bp && w.bp.type === 'port'; })[0];
    let x = G.rand() < 0.5 ? W.ww * 0.2 : W.ww * 0.8; if (port && Math.abs(port.x - x) < 260) x = W.ww - x; x = clamp(x, e, W.ww - e);
    r.x = x; r.y = Math.max(70, sy - 34); r.state = 'land'; r.t0 = W.t; r.out = 0; r.landed = W.gen; G.emit('raid-land', r, hp);
  }
  function raiders(W, r) { const out = []; for (let i = 0; i < W.cre.length; i++) { const c = W.cre[i]; if (c.team === 1 && c.raid === r.id && !c.dead && !c.gone) out.push(c); } return out; }
  function stepOut(W, r) {
    const F = G.far, kinds = F.kindsOf(r.p || F.cell(r.i, r.j) || { i: r.i, j: r.j, kinds: 2, hue: r.hue }); let pool = kinds.length ? kinds : (W.species || []).filter(function (s) { return s.rep && !s.extinct; }).map(function (s) { return s.rep; }); if (!pool.length) return;
    // of that star's kinds, the ones best made for fighting come; each a little its own
    const best = pool.slice().sort(function (a, b) { const pa = G.derive(a), pb = G.derive(b); return (pb.r * 0.04 + (pb.spike || 0) * 0.5 + (pb.aggro || 0)) - (pa.r * 0.04 + (pa.spike || 0) * 0.5 + (pa.aggro || 0)); });
    const g0 = best[r.out % Math.min(2, best.length)], g = r.out ? G.mutate(G.cloneGenome(g0), 0.4, null).g : G.cloneGenome(g0); g.mv = 0;
    const c = G.foeDrop(g, r.x + (r.out % 2 ? 1 : -1) * (26 + (r.out % 3) * 9), r.y + 16, 1); c.raid = r.id; c.from = { x: r.x, y: r.y + 10 }; c.E = c.ph.Emax * 0.75; c.born = W.gen; c.vy = 30; r.out++; G.emit('raider-out', c, r);
  }
  function over(W, c, how) { const r = c.raid; if (!r || r.state === 'leave') return; r.state = 'leave'; r.t0 = W.t; r.how = how; const f = (c.foes = c.foes || {}), e = f[r.key] || (f[r.key] = { name: r.name, hue: r.hue, raids: 0, beaten: 0, won: 0 }); e.raids++;
    if (how === 'beaten') { e.beaten++; r.loot = 2 + Math.round(r.n / 3); c.stock[3] += r.loot; c.got[3] += r.loot; } else if (how === 'won') e.won++;
    G.emit('raid-over', r, how); }

  // each year: is it time for one?
  G.on('scored', function () {
    const W = G.W; if (!W || W.farOf || W.title || !W.col || G.mode !== 'play') return; const c = W.col; if (c.peace) return;
    if (!c.nextRaid) c.nextRaid = W.gen + 10 + Math.floor(G.rand() * 4);
    if (!c.raid && W.gen + 1 >= c.nextRaid && G.heartOf(W)) G.raidWarn();
  });
  // the raid itself
  { const s0 = G.step; G.step = function (dt) { s0(dt); const W = G.W; if (!W || W.title || !W.col || !W.col.raid) return; const c = W.col, r = c.raid;
      if (r.state === 'warn') { if (W.gen >= r.landGen && W.season === 0 && W.st > 1.5) land(W, c); return; }
      if (!r.bound) { r.bound = 1; W.cre.forEach(function (q) { if (q.team === 1 && !q.raid) { q.raid = r.id; q.from = { x: r.x, y: r.y + 10 }; } }); }      // (a game opened again in the middle of a raid: its raiders are that raid's)
      const t = W.t - r.t0;
      if (r.state === 'land') { if (t > 3 && r.out < r.n) { if (t > 3 + r.out * 0.55) stepOut(W, r); } else if (r.out >= r.n) { r.state = 'on'; r.t0 = W.t; } return; }
      if (r.state === 'on') { const L = raiders(W, r); r.left = L.length; if (!L.length) { over(W, c, c.fellNow === r.id ? 'won' : 'beaten'); return; }
        if (W.gen - r.landed >= 3 && !r.tired) { r.tired = 1; L.forEach(function (q) { q.leave = 1; }); c.fellNow = 0; r.wornOut = 1; }
        if (r.wornOut && L.every(function (q) { return q.leave; }) && L.length === 0) over(W, c, 'worn'); return; }
      if (r.state === 'leave') { if (t > 5.5) { c.raid = null; c.raidN = (c.raidN || 0) + 1; c.nextRaid = W.gen + 7 + Math.floor(G.rand() * 6); c.fellNow = 0; G.emit('raid-gone', r); } }
    }; }
  // when the Heart falls to a raid, the raid has won: its raiders go back to the ship (54i_colony.js marks them as leaving)
  G.on('heart-fell', function () { const W = G.W, c = W && W.col; if (c && c.raid && c.raid.state === 'on') { c.fellNow = c.raid.id; c.raid.won = 1; } });
  G.on('foe-left', function (q) { const W = G.W, c = W && W.col; if (!c || !c.raid || q.raid !== c.raid.id) return; if (raiders(W, c.raid).length === 0) over(W, c, c.raid.wornOut ? 'worn' : 'won'); });
  /** in words: where a raid stands (for the panel and the bar) */
  G.raidText = function (W) { W = W || G.W; const r = W && W.col && W.col.raid; if (!r) return ''; return r.state === 'warn' ? 'A raid from ' + r.name + ' lands next spring: about ' + r.n + ' raiders' : r.state === 'land' ? 'Raiders from ' + r.name + ' are landing' : r.state === 'on' ? (r.left || r.n) + ' raiders from ' + r.name + ' on your star' : r.how === 'beaten' ? 'The raid from ' + r.name + ' is beaten' : 'The raiders from ' + r.name + ' are going home'; };
})();
