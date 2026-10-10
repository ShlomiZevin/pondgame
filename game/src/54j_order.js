// ── Order on the star: where everything is ──
// A star is ONE ground (no shore, no high and low): a map you can read at a glance, laid out round the colony in its middle.
//     the HEART            in the middle of the star, with the store beside it
//     DEPOSITS             what is gathered lies in its own places, the same every time: the QUARRY (stone), the REED BED, the SHELL BED,
//                          and the stands of LUMEN. Gatherers go between a deposit and the Heart, so their roads can be seen.
//     FEEDING GROUNDS      food grows in a few groves, not all over the star: that is where those with no work are, feeding
//     the MUSTER GROUND    where the fighters stand when there is nobody to fight: in ranks, facing out (it is where you last sent them all,
//                          or beside the Heart)
//     a GUARD POST         where guards stand, in a line: by the Heart, or by whatever you posted them at
//     the BUILDERS' YARD   where builders wait, in rows, when nothing is being built
//     LOTS                 buildings stand in rows, on a grid of lots north and south of the Heart (a tower or a wall may stand between lots)
// One who stands at its post is fed by the colony, so a rank stays a rank instead of wandering off to feed.
// Everything here is worked out from the star's seed and size and from who has which trade: nothing of it is kept in the save.
(function () {
  'use strict';
  const clamp = G.clamp;
  const edge = function (W) { return (G.sideEdge ? G.sideEdge(W) : 40) + 60; };
  const fr = function (v) { return v - Math.floor(v); }, rnd = function (seed, k) { return fr(Math.sin(k * 127.1 + (seed % 9973) * 0.731) * 43758.5453); };
  /** the nearest height a creature can stand at (the whole star is one ground: only its edges stop it) */
  const levelY = G.levelY = function (W, home, y, r) { return clamp(y, 24 + (r || 10), W.wh - 24 - (r || 10)); };
  /** the middle of the colony: where the Heart's foot is (or would be) */
  const centre = G.centreOf = function (W) { return { x: W.ww / 2, y: W.wh / 2 + 30 }; };
  function hub(W) { const h = G.heartOf ? G.heartOf(W) : null; if (h) return { x: h.x, y: h.y + h.bp.S * 0.45 }; const fh = G.foeHeart ? G.foeHeart(W) : null; if (!fh && !W.farOf) return centre(W);
    const Wk = W.works || []; for (let i = 0; i < Wk.length; i++) if (Wk[i].visitor && Wk[i].bp && Wk[i].bp.type === 'ship') return { x: clamp(Wk[i].x - 300, 300, W.ww - 300), y: clamp(Wk[i].y + 160, 200, W.wh - 200), camp: 1 }; return W.farOf ? null : centre(W); }

  // ── the places of the star ──
  /** the deposits and feeding grounds of this star: [{ k: 'grove' | 'quarry' | 'reeds' | 'shells' | 'lumen', x, y, r, name }] (the same every time) */
  G.sitesOf = function (W) {
    W = W || G.W; if (!W) return []; const key = (W.seed >>> 0) + ':' + Math.round(W.ww) + ':' + Math.round(W.wh); if (W._sites && W._sites.key === key) return W._sites.L;
    const seed = W.seed >>> 0, c = { x: W.ww / 2, y: W.wh / 2 }, e = edge(W), rx = W.ww / 2 - e - 130, ry = W.wh / 2 - 150, a0 = (rnd(seed, 3) - 0.5) * 0.36, flip = rnd(seed, 4) < 0.5 ? -1 : 1, L = [];
    const at = function (deg, f) { const a = deg * Math.PI / 180 + a0; return { x: c.x + flip * Math.cos(a) * rx * f, y: c.y + Math.sin(a) * ry * f }; };
    const add = function (k, deg, f, r, name) { const p = at(deg, f); L.push({ k: k, x: clamp(p.x, e + r * 0.6, W.ww - e - r * 0.6), y: clamp(p.y, 70 + r * 0.5, W.wh - 60 - r * 0.5), r: r, name: name }); };
    add('reeds', 0, 0.95, 105, 'REED BED'); add('grove', 48, 0.78, 150, 'FEEDING GROUND'); add('lumen', 96, 0.93, 60, 'LUMEN'); add('grove', 138, 0.78, 150, 'FEEDING GROUND');
    add('quarry', 180, 0.95, 105, 'QUARRY'); add('grove', 228, 0.8, 150, 'FEEDING GROUND'); add('lumen', 270, 0.9, 60, 'LUMEN'); add('shells', 318, 0.82, 95, 'SHELL BED');
    W._sites = { key: key, L: L }; return L;
  };
  const inDisc = function (s, k) { const a = G.rand() * 6.2832, d = Math.sqrt(G.rand()) * s.r * (k || 0.92); return { x: s.x + Math.cos(a) * d, y: s.y + Math.sin(a) * d * 0.8 }; };
  /** how much of the star's food comes up in the feeding grounds (none on a young star, whose first life cannot travel; most of it later) */
  G.groveShare = function (W) { return 0.86; };
  /** where a star's first life begins: in the feeding ground nearest its middle */
  G.firstGrove = function (W) { const S = G.sitesOf(W).filter(function (s) { return s.k === 'grove'; }), c = centre(W); const L = S.filter(function (q) { return q.x < W.ww * 0.5; }), T = L.length ? L : S;      /* (on the side of the star where the green food its first cells live on comes up) */ T.sort(function (a, b) { return Math.hypot(a.x - c.x, a.y - c.y) - Math.hypot(b.x - c.x, b.y - c.y); }); return T[0] || null; };
  /** where a piece of food comes up: in one of the feeding grounds (now and then anywhere) */
  G.foodSpot = function (W) { const S = G.sitesOf(W).filter(function (s) { return s.k === 'grove'; }); if (!S.length || G.rand() > G.groveShare(W)) return { x: W.ww * (0.14 + 0.72 * G.rand()), y: W.wh * (0.14 + 0.72 * G.rand()) };      // (a little comes up over the middle of the star)
    // it comes up where it has been eaten: the feeding ground with the least on it is filled first (so food does not pile up where nobody is while those who feed go short)
    let gf = W._gf; if (!gf || W.t - gf.t > 0.5 || gf.n.length !== S.length) { gf = W._gf = { t: W.t, n: S.map(function () { return 0; }) }; const F = W.food; for (let i = 0; i < F.length; i++) { const f = F[i]; if (f.dead) continue; for (let q = 0; q < S.length; q++) if (Math.abs(f.x - S[q].x) < S[q].r && Math.abs(f.y - S[q].y) < S[q].r) { gf.n[q]++; break; } } }
    let b = 0; for (let q = 1; q < S.length; q++) if (gf.n[q] + G.rand() * 6 < gf.n[b] + G.rand() * 6) b = q; gf.n[b]++; return inDisc(S[b]); };
  /** where a stone (0), a reed (1) or a shell (2) turns up: in its deposit */
  G.matSpot = function (W, k) { const want = k === 0 ? 'quarry' : k === 1 ? 'reeds' : 'shells', S = G.sitesOf(W).filter(function (s) { return s.k === want; }); return S.length ? inDisc(S[0]) : null; };
  /** the deposit or feeding ground a point lies in (nothing is built there) */
  G.siteAt = function (W, x, y, pad) { const S = G.sitesOf(W || G.W); for (let i = 0; i < S.length; i++) { const s = S[i]; if (Math.hypot(x - s.x, (y - s.y) / 0.8) < s.r + (pad || 0)) return s; } return null; };

  // ── the grounds: where each trade stands ──
  function spot(W, kind) { const H = hub(W); if (!H) return null; const e = edge(W) + 120; return kind === 'yard' ? { x: clamp(H.x - 310, e, W.ww - e), y: H.y - 10 } : { x: clamp(H.x + 310, e, W.ww - e), y: H.y - 10 }; }
  G.musterAt = function (W) { const r = W.col && W.col.rally; return r ? { x: r.x, y: levelY(W, 0, r.y, 12), set: 1 } : spot(W, 'muster'); };
  /** everyone with a trade and nothing to do is given its place: c.slot = { x, y, face }. Also says what grounds there are (W.grounds) for the screen. */
  G.formUp = function (W) {
    W = W || G.W; if (!W || !W.cre) return []; const H = hub(W), G0 = [], by = {};
    for (let i = 0; i < W.cre.length; i++) { const c = W.cre[i]; c.slot = null; if (c.dead || c.team || !c.job || c.inShip || !H) continue; let k = '';
      const pk = c.post ? '@' + Math.round(c.post.x / 30) + ',' + Math.round(c.post.y / 30) : '';
      if (c.job === 'f') k = 'f' + pk; else if (c.job === 'u') k = 'u' + pk; else if (c.job === 'b' && !c.deedId) k = 'b'; else continue;
      (by[k] || (by[k] = [])).push(c); }
    for (const k in by) { const L = by[k], job = k.charAt(0), n = L.length, p = L[0].post;
      let at, name;
      if (job === 'f') { at = p ? { x: p.x, y: levelY(W, 0, p.y, 12), set: 1 } : G.musterAt(W); name = p ? 'FIGHTERS’ POST' : 'MUSTER GROUND'; }
      else if (job === 'b') { at = spot(W, 'yard'); name = 'BUILDERS’ YARD'; }
      else { at = p ? { x: p.x, y: levelY(W, 0, p.y, 12) } : { x: H.x, y: H.y + 124 }; name = 'GUARD POST'; }
      if (!at) continue; const face = at.x >= H.x ? 0 : Math.PI, e = edge(W) + 40;
      // each keeps the place it has (so the group does not shuffle whenever one of them dies); a newcomer takes the first empty one
      const used = {}; let top = 0; L.forEach(function (c) { if (c.slotG === k && c.slotI >= 0 && !used[c.slotI] && c.slotI < n + 2) { used[c.slotI] = 1; } else { c.slotG = k; c.slotI = -1; } });
      L.forEach(function (c) { if (c.slotI < 0) { let q = 0; while (used[q]) q++; used[q] = 1; c.slotI = q; } if (c.slotI > top) top = c.slotI; });
      at.x = clamp(at.x, e, W.ww - e); const R = 24 * Math.sqrt(top + 1) + 26;
      for (let i = 0; i < n; i++) { const c = L[i], q = c.slotI; let sx, sy;
        if (job === 'u') { const side = q % 2 ? 1 : -1, st = Math.ceil(q / 2), a = 1.5708 + side * st * 0.42, rr = 64 + Math.floor(st / 4) * 30; sx = at.x + Math.cos(a) * rr * 1.25; sy = at.y - 40 + Math.sin(a) * rr * 0.8; }      /* (guards: an arc before what they guard) */
        else { const rr = 24 * Math.sqrt(q + 0.5), a = q * 2.39996 + 0.6; sx = at.x + Math.cos(a) * rr * 1.15; sy = at.y + Math.sin(a) * rr * 0.82; }      /* (a loose round cluster, each a little apart from the next) */
        c.slot = { x: sx, y: levelY(W, 0, sy, c.ph.r), face: job === 'u' ? Math.atan2(sy - (at.y - 40), sx - at.x) : face, g: k }; }
      G0.push({ id: k, job: job, name: name, x: at.x, y: levelY(W, 0, at.y, 12), w: job === 'u' ? 190 : R * 2.3, h: job === 'u' ? 90 : R * 1.64, n: n, set: !!at.set }); }
    W.grounds = G0; return G0;
  };
  /** hold your place: go to it, and once there stand and face out. true if it has a place. One who stands at its post is fed by the colony. */
  G.holdSlot = function (W, c, dt) {
    const s = c.slot; if (!s) { c.atSlot = 0; return false; }
    const dx = s.x - c.x, dy = s.y - c.y, d = Math.hypot(dx, dy);
    if (d > 10) { const sp = Math.min(c.ph.speed * (d > 320 ? 2.2 : 1.4), d * 2.4), k = Math.min(1, dt * 5); c.vx += (dx / d * sp - c.vx) * k; c.vy += (dy / d * sp - c.vy) * k; c.ang = Math.atan2(dy, dx); c.atSlot = 0; if (d < 120 && c.E < c.ph.Emax * 0.4) c.E += c.ph.Emax * 0.02 * dt; return true; }
    const k = Math.min(1, dt * 6); c.vx += (dx * 2 - c.vx) * k; c.vy += (dy * 2 - c.vy) * k; c.ang = s.face; c.atSlot = 1;
    if (c.E < c.ph.Emax * 0.78) c.E += c.ph.Emax * 0.03 * dt;      // (at its post it is fed)
    c.tired = Math.min(c.tired || 0, 0.7); return true;
  };
  // ── habits: the hungry go to a feeding ground, and those who have fed come back to the colony ──
  // What a creature DOES is still its own brain's affair (what it eats, what it flees, whom it follows). But it has two habits, as it has the habit
  // of going home to sleep: hungry, it makes for the nearest feeding ground; fed, and with no work, it drifts back to the COMMONS round the Heart.
  // So the life of a star has a shape that can be followed: out along the roads to feed, and home again.
  function steer(c, tx, ty, dt, haste, pull) { const dx = tx - c.x, dy = ty - c.y, d = Math.hypot(dx, dy) || 1, sp = Math.min(c.ph.speed * haste, d * 2), k = Math.min(1, dt * pull); c.vx += (dx / d * sp - c.vx) * k; c.vy += (dy / d * sp - c.vy) * k; if (d > 20) c.ang += (Math.atan2(dy, dx) - c.ang) * Math.min(1, dt * 2) * (Math.abs(Math.atan2(dy, dx) - c.ang) > 3.1416 ? 0 : 1); return d; }
  // ── where the free belong ──
  // One with no role is not left to drift. Once the colony has homes, each of them HAS one (the nearest with room: eight to a home, and it keeps it while the home
  // stands): fed, it comes back to its own place before that home's door; and by turns, each in its own rhythm, it goes to the meeting place and stands with the
  // others before it. So the free are seen in households round their homes, in a gathering before the meeting place, and on the ways between those and the feeding
  // grounds, which wear into paths. (Before there are homes they keep to the commons round the Heart, as they did.)
  function places(W) { const P0 = W._places; if (P0 && W.t >= P0.t && W.t - P0.t < 2) return P0; const homes = [], halls = [], by = {}, Wk = W.works || [];
    for (let i = 0; i < Wk.length; i++) { const w = Wk[i]; if (!w.bp || w.enemy || w.fall || w.visitor || (w.bp.type !== 'house' && w.bp.type !== 'hall')) continue; const n = G.buildCount ? G.buildCount(w) : [1, 1, 1]; if (n[0] < n[2] * 0.6) continue; const o = { name: w.name, x: w.x, y: w.y + w.bp.S * 0.45, n: 0 }; if (w.bp.type === 'house') { homes.push(o); by[w.name] = o; } else halls.push(o); }
    if (homes.length) for (let i = 0; i < W.cre.length; i++) { const c = W.cre[i]; if (c.dead || c.team || !c.homeW) continue; if (by[c.homeW]) by[c.homeW].n++; else c.homeW = ''; }
    return (W._places = { t: W.t, homes: homes, halls: halls, by: by }); }
  /** the home a creature of yours belongs to: { name, x, y (its door) } or null (no homes yet, or no room in any) */
  G.homeOf = function (W, c) { const P = places(W); if (!P.homes.length || c.team) return null; let hm = c.homeW ? P.by[c.homeW] : null; if (hm) return hm; let bd = 1e18; for (let i = 0; i < P.homes.length; i++) { const q = P.homes[i]; if (q.n >= 8) continue; const d = (q.x - c.x) * (q.x - c.x) + (q.y - c.y) * (q.y - c.y); if (d < bd) { bd = d; hm = q; } } if (!hm) return null; hm.n++; c.homeW = hm.name; return hm; };
  /** where a free creature idles: before its own home, by turns before the meeting place; with no home, its own spot on the commons round the Heart */
  G.commonsSpot = function (W, c) { const H = hub(W); if (!H) return null; const hm = G.homeOf(W, c);
    if (hm) { const P = places(W), k = fr(c.id * 0.4142135), aa = 0.32 + fr(c.id * 0.3137) * 2.5, turn = fr(W.t / 52 + fr(c.id * 0.7548777));      /* (a place in the half-ring before a door; about a third of its time at the meeting place) */
      if (P.halls.length && turn < 0.34) { let m = P.halls[0], bd = 1e18; for (let i = 0; i < P.halls.length; i++) { const q = P.halls[i], d = Math.hypot(q.x - hm.x, q.y - hm.y); if (d < bd) { bd = d; m = q; } } const r = 56 + 62 * k; return { x: clamp(m.x + Math.cos(aa) * r * 1.5, 60, W.ww - 60), y: clamp(m.y + 30 + Math.sin(aa) * r * 0.62, 40, W.wh - 40), at: 'meeting' }; }
      const r = 40 + 36 * k; return { x: clamp(hm.x + Math.cos(aa) * r * 1.45, 60, W.ww - 60), y: clamp(hm.y + 22 + Math.sin(aa) * r * 0.6, 40, W.wh - 40), at: 'home' }; }
    const a = fr(c.id * 0.6180339) * 6.2832, r = 120 + fr(c.id * 0.4142135) * 150; return { x: clamp(H.x + Math.cos(a) * r * 1.5, 60, W.ww - 60), y: clamp(H.y - 20 + Math.sin(a) * r * 0.85, 40, W.wh - 40) }; };
  function habits(W, dt) {
    if (!G.FLAT) return; const S = G.sitesOf(W).filter(function (s) { return s.k === 'grove'; }); if (!S.length) return; const str = 1, H = W.gen < 5 ? null : hub(W);      // (a young star's first life stays where it began; later, those who have fed drift home to the colony)
    const crowd = S.map(function () { return 0; }); for (let i = 0; i < W.cre.length; i++) { const c = W.cre[i]; if (c.dead) continue; for (let q = 0; q < S.length; q++) if (Math.hypot(c.x - S[q].x, (c.y - S[q].y) / 0.8) < S[q].r) { crowd[q]++; break; } }      // (a full feeding ground sends the hungry on to the next)      // (the habits come with the feeding grounds: while food still comes up everywhere, everyone forages where it is)
    for (let i = 0; i < W.cre.length; i++) { const c = W.cre[i]; if (c.dead || c.inShip || c.asleep || c.goTo || c.deedId || c.team === 1 || c.outAt !== undefined) continue; if (c.job && !c.hungry) { c.feedGo = 0; continue; }
      const fed = c.E / c.ph.Emax; if (c.feedGo) { if (fed > (c.homeW && !c.job ? 0.66 : 0.74)) c.feedGo = 0; }      /* (one with a home to go back to leaves the feeding ground a little sooner) */ else if (fed < (W.gen < 5 ? 0.7 : 0.44) || c.hungry) c.feedGo = 1;      /* (a young star's first life keeps to where the food is) */
      if (c.feedGo) { let g = S[0], bd = 1e18; for (let q = 0; q < S.length; q++) { const d = Math.hypot(S[q].x - c.x, S[q].y - c.y) * (1 + Math.max(0, crowd[q] - 14) / 16) * (c.grove === q ? 0.7 : 1); if (d < bd) { bd = d; g = S[q]; c.groveN = q; } } c.grove = c.groveN; if (Math.hypot(c.x - g.x, (c.y - g.y) / 0.8) > g.r * 0.78) steer(c, g.x + Math.cos(c.id) * g.r * 0.4, g.y + Math.sin(c.id) * g.r * 0.3, dt, 1.6, 3.2 * str); }
      else if (!c.job && !c.team && H && c.stranger === undefined) { const p = G.commonsSpot(W, c); if (p && Math.hypot(c.x - p.x, c.y - p.y) > (p.at ? 40 : 70)) steer(c, p.x, p.y, dt, 1.15, 1.8 * str); } }
  }
  { const s0 = G.step; let acc = 9; G.step = function (dt) { s0(dt); const W = G.W; if (!W || W.title) return; habits(W, dt); if (!W.col) return; acc += dt; if (acc >= 1) { acc = 0; G.formUp(W); } }; }

  // ── lots: where buildings stand ──
  const LOTC = 104, GOLD = 2.39996;
  /** the lots of this star: places round the Heart, evenly spread and in no rows (as seeds sit in a sunflower): [{ x, y }] */
  function lots(W) { const H = hub(W) || centre(W), key = Math.round(H.x) + ':' + Math.round(H.y) + ':' + Math.round(W.ww) + ':' + Math.round(W.wh); if (W._lots && W._lots.key === key) return W._lots.L;
    const e = edge(W) + 70, L = []; for (let i = 5; i < 150; i++) { const r = LOTC * Math.sqrt(i), a = i * GOLD + 0.4, x = H.x + Math.cos(a) * r * 1.12, y = H.y + 30 + Math.sin(a) * r * 0.86; if (x < e || x > W.ww - e || y < 190 || y > W.wh - 84) continue; if (Math.abs(x - H.x) < 150 && y > H.y - 40 && y < H.y + 170) continue; L.push({ x: x, y: y }); }
    W._lots = { key: key, L: L }; return L; }
  /** the lot nearest a point: { x, y } (the foot of a building standing on it). fine: a tower or a wall stands where you say */
  G.lotSnap = function (W, x, y, fine) { W = W || G.W; if (fine) return { x: x, y: y }; const L = lots(W); let b = null, bd = 1e18; for (let i = 0; i < L.length; i++) { const d = (L[i].x - x) * (L[i].x - x) + (L[i].y - y) * (L[i].y - y); if (d < bd) { bd = d; b = L[i]; } } return b ? { x: b.x, y: b.y } : { x: x, y: y }; };
  /** the lots in a stretch of the star: [{ x, y, free }] (for showing where one may build) */
  G.lotsIn = function (W, x0, y0, x1, y1, type) { W = W || G.W; const L = lots(W), out = []; for (let i = 0; i < L.length; i++) { const q = L[i]; if (q.x < x0 - 80 || q.x > x1 + 80 || q.y < y0 - 40 || q.y > y1 + 140) continue; out.push({ x: q.x, y: q.y, free: !G.buildOk || !G.buildOk(type || 'house', q.x, q.y) }); } return out; };
  /** the free lot nearest a point (what a kind building by its own wish is given): { x, y } or null */
  G.lotPick = function (W, x, y, type, ok) {
    W = W || G.W; const L = G.lotsIn(W, 0, 0, W.ww, W.wh, G.BUILDABLE && G.BUILDABLE[type] && type !== 'port' && type !== 'ship' ? type : 'hall'); let best = null, bd = 1e18;      /* (whatever sort of thing it is, it stands on a lot) */
    for (let i = 0; i < L.length; i++) { const q = L[i]; if (!q.free || (ok && !ok(q.x, q.y))) continue; const d = (q.x - x) * (q.x - x) + (q.y - y) * (q.y - y) * 1.6; if (d < bd) { bd = d; best = q; } }
    return best;
  };
  /** is this point on a ground where your creatures stand? (nothing is built there) */
  G.onGround = function (W, x, y) { const L = (W || G.W).grounds || []; for (let i = 0; i < L.length; i++) { const g = L[i]; if (Math.abs(x - g.x) < g.w / 2 + 40 && y > g.y - g.h / 2 - 10 && y - 100 < g.y + g.h / 2) return g; } return null; };
})();
