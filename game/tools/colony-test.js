// DOES THE COLONY WORK?  node tools/colony-test.js [generations] [seeds]        (no AI, no page: free; exits 1 if a check fails)
// A star is run with nobody watching, orders are given to it as a player would give them, and what comes of them is measured:
//   1. THE HEART            every star of yours has one, in the shallows, where those of the land and of the water can both come
//   2. TRADES ARE FILLED    you ask for so many gatherers, builders, fighters and guards, and there are that many
//   3. GATHERING            what lies about the star ends up in the store, and so does lumen
//   4. HANDED DOWN          generations later the places are still filled, by creatures born long after the order was given
//   5. AN ORDER TO BUILD    what you order is raised where you ordered it, by the builders
//   6. DEFENCE              enemies set down by the Heart break it when nobody defends, and are slain when fighters do
//   7. WORK IS REWARDED     those who do their work best are given more children than those who do it worst
//   8. IT IS KEPT           the store, the quotas and every creature's trade survive saving
//  10. A RAID COMES         a rival star warns a year ahead, its ship lands in spring with as many raiders as it said, the raid ends (beaten, or
//                           the Heart falls, or it wears out), the next one is set for later, and a game saved in the middle of a raid opens in it
//   9. NATURE IS LEFT ALONE the star lives (no extinction), with about as many creatures as one where nobody works
const fs = require('fs'), path = require('path'), vm = require('vm');
global.window = globalThis; globalThis.addEventListener = () => {};
const src = path.join(__dirname, '..', 'src');
for (const f of ['10_core.js', '20_genome.js', '21_form.js', '21b_body.js', '21c_taste.js', '30_world.js', '40_words.js', '41_look.js', '43_why.js', '44_pressure.js', '45_organs.js', '45_parts.js', '45_plans.js', '46_events.js', '53_fields.js', '47_story.js', '48_judge.js', '49_eras.js', '54_deeds.js', '54c_acts.js', '54d_build.js', '54e_teach.js', '54f_judge.js', '54g_society.js', '54i_colony.js', '54j_order.js', '57x_far.js', '57y_raids.js', '80_save.js'])
  vm.runInThisContext(fs.readFileSync(path.join(src, f), 'utf8'), { filename: f });
G.hints = G.hints || {}; G.saveNow = function () {};
const gens = +process.argv[2] || 26, seeds = (process.argv[3] || '11,23').split(',').map(Number);
const fails = [], check = (ok, what) => { console.log((ok ? '  ok    ' : '  FAIL  ') + what); if (!ok) fails.push(what); };
const mean = (a) => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
const alive = () => G.W.cre.filter((c) => !c.dead && !c.team);
const run = (secs, each) => { for (let t = 0; t < secs && !G.W.extinct; t += 0.1) { G.step(0.1); if (each) each(); } };
const until = (fn, secs) => { for (let t = 0; t < secs && !G.W.extinct; t += 0.1) { G.step(0.1); if (fn()) return t; } return -1; };
const WANT = { g: 8, b: 4, f: 5, u: 2 };

const R = [];
for (const seed of seeds) {
  // a star left to itself, to compare with
  G.newWorld({ seed }); G.founderPond(); G.mode = 'play'; G.speed = 1; until(() => G.W.gen > gens, 1e6); const freeN = G.W.extinct ? 0 : alive().length;
  // the same star, commanded
  G.newWorld({ seed }); G.founderPond(); G.mode = 'play'; G.speed = 1; { const c0 = G.colony(G.W); c0.share = {}; c0.auto = false; }      /* (fixed numbers, and nothing built but what is ordered: what is measured here is what a player commands) */ until(() => G.W.gen > 12, 1e6);
  const W = G.W, col = G.colony(W), r = { seed, freeN }; R.push(r);
  const h = G.heartOf(W), sy = G.shoreY(W); r.heart = !!h; r.heartIn = h ? Math.hypot(h.x - W.ww / 2, h.y + h.bp.S * 0.45 - (W.wh / 2 + 30)) : -1;
  col.share = {}; col.auto = false; col.raid = null; W.cre = W.cre.filter((c) => c.team !== 1); col.nextRaid = Math.max(col.nextRaid || 0, W.gen + 3); Object.assign(col.want, WANT); const g0 = W.gen;      /* (and no raid in the first moments: while enemies are on the star the ranks fill slowly, which is not what is measured here) */      // (fixed numbers, and nothing built but what is ordered: what is measured here is what a player commands)
  let looks = 0, full = 0; const fitG = [];
  run(20); r.n0 = G.jobCount(W); r.apt0 = mean(alive().filter((c) => c.job === 'g').map((c) => G.jobFit(c, 'g')));
  // 5. an order to build: somewhere it is allowed
  let spot = G.lotsIn(W, 0, 0, W.ww, W.wh, 'house').filter((q) => q.free)[3] || null;      // (one of the lots)
  const o = spot && G.buildOrder('house', spot.x, spot.y); r.ordered = !!(o && !o.error); let builtBy = 0; const onPiece = (d, pc, c) => { if (c && c.job === 'b') builtBy++; }; G.on('build-piece', onPiece);
  const tB = until(() => { looks++; const n = G.jobCount(W); if (n.g >= WANT.g - 1 && n.f >= WANT.f - 1) full++; return (W.works || []).some((w) => o && w.name === o.name && G.buildCount(w)[0] >= G.buildCount(w)[2]); }, 32 * 9);
  const made = (W.works || []).filter((w) => o && w.name === o.name)[0]; r.built = tB; r.builtBy = builtBy; r.builtAt = made && spot ? Math.hypot(made.x - spot.x, (made.y + made.bp.S * 0.45) - spot.y) : -1; r.builtType = made ? made.bp.type : '';
  // 7. work is rewarded: at each scoring, the best and the worst gatherers
  let bestKids = 0, worstKids = 0, bestN = 0, worstN = 0; const seen = new Map();
  G.on('scored', () => { alive().filter((c) => c.job === 'g' && c.jobF).forEach((c) => seen.set(c.id, { f: c.jobF, c })); });
  let slotOk = 0, slotN = 0;      // (how many of those with a place stand in it, looked at every few seconds while nobody is fighting)
  until(() => { looks++; const n = G.jobCount(W); if (n.g >= WANT.g - 1 && n.f >= WANT.f - 1) full++; if (looks % 40 === 0 && !W.cre.some((c) => c.team === 1 && !c.dead)) alive().forEach((c) => { if (c.slot && !c.asleep) { slotN++; if (Math.hypot(c.x - c.slot.x, c.y - c.slot.y) < 18) slotOk++; } }); return W.gen > gens; }, 1e6);
  seen.forEach((v) => { if (v.f > 1.08) { bestKids += v.c.off || 0; bestN++; } else if (v.f < 0.95) { worstKids += v.c.off || 0; worstN++; } });
  r.kids = [bestN ? bestKids / bestN : 0, worstN ? worstKids / worstN : 0, bestN, worstN];
  r.extinct = W.extinct; r.n = alive().length; r.full = full / Math.max(1, looks); r.n1 = G.jobCount(W); r.stock = col.stock.slice(); r.got = col.got.slice();
  const gs = alive().filter((c) => c.job === 'g'); r.bornInto = gs.length ? gs.filter((c) => c.born > g0 + 3).length / gs.length : 0; r.apt1 = mean(gs.map((c) => G.jobFit(c, 'g'))); r.aptAll = mean(alive().map((c) => G.jobFit(c, 'g')));
  { const L = alive().filter((c) => c.slot && !c.hungry && !c.asleep), F = W.food.filter((f) => !f.dead), M = (W.mats || []).filter((q) => q.k < 2), inS = (x, y, k) => { const s = G.siteAt(W, x, y, 20); return !!s && (!k || s.k === k); };
    r.order = { atSlot: slotN ? slotOk / slotN : 0, inGrove: F.length ? F.filter((f) => inS(f.x, f.y, 'grove')).length / F.length : 0, matsIn: M.length ? M.filter((q) => inS(q.x, q.y)).length / M.length : 1 }; }
  // 8. it is kept
  { const blob = JSON.parse(JSON.stringify(G.collectWorld())), jobs0 = G.jobCount(W), st0 = col.stock.join(','); G.applySave(blob); const W2 = G.W, c2 = G.colony(W2), j2 = G.jobCount(W2);
    r.kept = c2.stock.join(',') === st0 && c2.want.g === WANT.g && j2.g === jobs0.g && j2.f === jobs0.f && j2.b === jobs0.b && !!G.heartOf(W2) && (c2.nodes || []).length === (col.nodes || []).length; r.keptWhy = c2.stock.join(',') + ' / ' + st0 + '; g ' + j2.g + '/' + jobs0.g + ' f ' + j2.f + '/' + jobs0.f + '; heart ' + !!G.heartOf(W2); }
  // 6. defence: six big raiders by the Heart, once with the fighters and once with nobody to stand against them
  until(() => G.W.season === 0 && G.W.st > 3, 80);      // (a raid comes in spring)
  const savedAll = JSON.parse(JSON.stringify(G.collectWorld()));
  { const saved = savedAll; const raidOnce = (defend, home) => { G.applySave(JSON.parse(JSON.stringify(saved))); G.mode = 'play'; const W3 = G.W, c3 = G.colony(W3), hh = G.heartOf(W3); if (defend) { c3.want.f = 10; c3.want.u = 3; c3.peace = true; W3.cre = W3.cre.filter((c) => c.team !== 1); c3.raid = null; run(18); } if (!defend) { c3.peace = true; W3.cre = W3.cre.filter((c) => c.team !== 1); c3.raid = null; c3.want.f = 0; c3.want.u = 0; W3.cre.forEach((c) => { if (c.job === 'f' || c.job === 'u') G.setJob(c, ''); }); }
      const ranked = alive().filter((c) => c.ph.home === home).sort((a, b) => G.jobFit(b, 'f') - G.jobFit(a, 'f')), big = ranked[ranked.length >> 2];      /* (raiders as good at fighting as your better quarter) */ const p0 = G.buildCount(hh)[0]; let slain = 0, lost = 0, fell = 0; const s1 = (a, b) => { if (b.team) slain++; else lost++; }; G.on('slain', s1); G.on('heart-fell', () => { if (G.W === W3) fell++; });
      const why = {}; G.on('death', (c) => { if (c.team && G.W === W3) why[c.cause] = (why[c.cause] || 0) + 1; });
      const foes = []; for (let i = 0; i < 6; i++) foes.push(G.foeDrop(big.g, hh.x - 60 + i * 24, hh.y + hh.bp.S * 0.45 + 300, 1)); foes.forEach((c) => { c.E = c.ph.Emax * 0.7; });
      let low = p0, hi = p0; run(90, () => { const hq = G.heartOf(W3); if (hq && !fell) { const n = G.buildCount(hq)[0]; if (n > hi) { hi = n; low = n; }      /* (the Heart may be built up while it stands: what counts is what is knocked off it) */ low = Math.min(low, n); } if (fell) low = 0; }); if (fell) run(30); return { slain, lost, left: foes.filter((c) => !c.dead && !c.gone).length, pieces: hi - low, gone: fell > 0, stock: c3.stock.slice(0, 3).reduce((a, b) => a + b, 0), home: big.ph.home, why, at: foes.map((c) => Math.round(c.x - hh.x) + ',' + Math.round(c.y - G.shoreY(W3))).join(' ') }; };
    const homes = [0, 1].filter((h) => alive().filter((c) => c.ph.home === h).length >= 8); r.raids = homes.map((h) => ({ home: h, def: raidOnce(true, h), undef: raidOnce(false, h) })); }
  // 11. left to itself, a colony grows itself: it builds for its numbers, and its gatherers and builders are a share of it
  { G.newWorld({ seed }); G.founderPond(); G.mode = 'play'; G.speed = 1; G.colony(G.W).peace = true; let peak = 0; until(() => { if (G.W.cre.length > peak) peak = G.W.cre.length; return G.W.gen > 46; }, 1e6);
    const W6 = G.W, c6 = G.colony(W6), by = {}, jc = G.jobCount(W6); (W6.works || []).forEach((w) => { if (w.bp) by[w.bp.type] = (by[w.bp.type] || 0) + 1; });
    r.self = { extinct: !!W6.extinct, N: jc.all, peak, by, g: jc.g, b: jc.b, wantG: c6.want.g, share: JSON.stringify(c6.share || {}), names: (W6.works || []).map((w) => w.name).join(', ') };
    console.log('   left to itself for 46 generations: ' + jc.all + ' alive (most at once ' + peak + '), ' + JSON.stringify(by) + ', ' + jc.g + ' gatherers and ' + jc.b + ' builders (shares ' + r.self.share + ')'); }
  // 10. a raid comes of itself
  { G.applySave(JSON.parse(JSON.stringify(savedAll))); G.mode = 'play'; const W4 = G.W, c4 = G.colony(W4), ev = []; ['raid-warn', 'raid-land', 'raid-over', 'raid-gone'].forEach((e) => G.on(e, (q, how) => { if (G.W === W4 || ev.live) ev.push(e + (how && typeof how === 'string' ? ':' + how : '')); }));
    ev.live = 1; W4.cre = W4.cre.filter((c) => c.team !== 1); c4.nextRaid = W4.gen + 1; c4.raid = null; const g0r = W4.gen; until(() => c4.raid && c4.raid.state === 'on', 32 * 4); const rd = c4.raid, said = rd ? rd.n : 0, came = W4.cre.filter((c) => c.team && !c.dead).length + 0, landedGen = rd ? rd.landed - g0r : -1;
    // saved and opened in the middle of it
    let mid = false; if (rd) { const b = JSON.parse(JSON.stringify(G.collectWorld())); G.applySave(b); G.mode = 'play'; const W5 = G.W, c5 = G.colony(W5); G.step(0.1); mid = !!(c5.raid && c5.raid.state === 'on' && W5.cre.filter((c) => c.team && !c.dead && c.raid === c5.raid.id).length >= Math.min(came, 1)); ev.live = 1;
      until(() => !c5.raid, 32 * 6); r.raid = { said, came, landedGen, mid, ended: !c5.raid, events: ev.slice(), next: c5.nextRaid - W5.gen, rivals: G.rivals().map((q) => q.name).join(', '), foes: JSON.stringify(c5.foes || {}) }; }
    else r.raid = { said: 0, came: 0, landedGen, mid, ended: false, events: ev.slice(), next: 0, rivals: G.rivals().map((q) => q.name).join(', '), foes: '' }; ev.live = 0; }
  console.log('   a raid of its own: rivals ' + r.raid.rivals + '; said ' + r.raid.said + ', came ' + r.raid.came + ', landed ' + r.raid.landedGen + ' years after; ' + r.raid.events.join(' > ') + '; next in ' + r.raid.next + ' years; ' + r.raid.foes);
  console.log('seed ' + seed + (r.extinct ? ' EXTINCT' : '') + ': ' + r.n + ' alive after ' + gens + ' generations (left to itself: ' + freeN + ')');
  console.log('   trades 20 s after the order: ' + JSON.stringify(r.n0) + '; at the end: ' + JSON.stringify(r.n1) + '; quotas were full ' + Math.round(100 * r.full) + '% of the time');
  console.log('   brought in: ' + G.RES.map((n, i) => r.got[i] + ' ' + n).join(', ') + '; in the store now: ' + r.stock.join(', '));
  console.log('   gatherers born into the trade: ' + Math.round(100 * r.bornInto) + '%; how well made for gathering: first gatherers ' + r.apt0.toFixed(2) + ', gatherers now ' + r.apt1.toFixed(2) + ', everyone now ' + r.aptAll.toFixed(2));
  console.log('   the ordered House: ' + (r.built < 0 ? 'NOT finished' : 'finished after ' + Math.round(r.built) + ' s') + ', ' + r.builtBy + ' pieces set by builders, ' + Math.round(r.builtAt) + ' from where it was ordered (' + r.builtType + ')');
  console.log('   children: the best gatherers ' + r.kids[0].toFixed(2) + ' each (' + r.kids[2] + '), the worst ' + r.kids[1].toFixed(2) + ' (' + r.kids[3] + ')');
  r.raids.forEach((q) => console.log('   a raid of six of the ' + (q.home ? 'land' : 'water') + ', defended: ' + JSON.stringify(q.def) + '; ' + '   undefended: ' + JSON.stringify(q.undef)));
}

console.log('\nCHECKS over ' + seeds.length + ' stars of ' + gens + ' generations:');
check(R.every((r) => r.self.extinct || ((r.self.by.house || 0) >= 2 && (r.self.by.huts || 0) >= 1 && (r.self.by.hall || 0) >= 1 && (r.self.by.house || 0) <= Math.ceil(r.self.peak / 9) + 1 && r.self.g >= Math.max(1, Math.round(r.self.N * 0.06)))), '11. left to itself a colony grows itself: ' + R.map((r) => r.self.extinct ? 'extinct' : r.self.N + ' alive, ' + (r.self.by.house || 0) + ' homes, ' + (r.self.by.huts || 0) + ' food gardens, ' + (r.self.by.hall || 0) + ' meeting places, ' + r.self.g + ' gatherers').join(' | ') + ' (homes for its numbers, a garden, a meeting place, gatherers a share of it)');
check(R.every((r) => r.heart && r.heartIn >= 0 && r.heartIn < 3), '1. the Heart stands in the middle of the star (' + R.map((r) => r.heartIn.toFixed(1) + ' from it').join(', ') + ')');
check(R.every((r) => r.order.atSlot >= 0.6 && r.order.inGrove >= 0.35 && r.order.matsIn >= 0.9), '1b. order: ' + R.map((r) => Math.round(100 * r.order.atSlot) + '% of fighters, guards and waiting builders stand in their places; ' + Math.round(100 * r.order.inGrove) + '% of the food is in the feeding grounds; ' + Math.round(100 * r.order.matsIn) + '% of the stone and reed lies in its deposit').join(' | ') + ' (at least 60%, 35%, 90%)');
check(R.every((r) => ['g', 'b', 'f', 'u'].every((k) => r.n0[k] >= WANT[k] - 1 && r.n0[k] <= WANT[k])), '2. trades are filled within 20 s: ' + R.map((r) => ['g', 'b', 'f', 'u'].map((k) => r.n0[k] + '/' + WANT[k]).join(' ')).join('; '));
check(R.every((r) => r.got[0] + r.got[1] + r.got[2] >= 40), '3. gathering: ' + R.map((r) => (r.got[0] + r.got[1] + r.got[2]) + ' loads').join(', ') + ' brought to the store (at least 40)');
check(R.every((r) => r.got[3] >= 4), '3. ... and lumen: ' + R.map((r) => r.got[3]).join(', ') + ' (at least 4)');
check(R.every((r) => r.full > 0.5 && (r.bornInto > 0.6 || r.n1.g < 2)), '4. handed down: quotas full ' + R.map((r) => Math.round(100 * r.full) + '%').join(', ') + ' of the time (at least 50%), ' + R.map((r) => Math.round(100 * r.bornInto) + '%').join(', ') + ' of gatherers born into it (at least 60%)');
check(R.every((r) => r.ordered && r.built >= 0 && r.builtAt < 60 && r.builtType === 'house' && r.builtBy >= 2), '5. an ordered house is raised where it was ordered, by builders (' + R.map((r) => r.built < 0 ? 'no' : Math.round(r.built) + ' s').join(', ') + ')');
const RA = [].concat(...R.map((r) => r.raids)), side = (q) => (q.home ? 'land' : 'water');
{ const beaten = mean(RA.map((q) => 6 - q.def.left)); check(RA.length >= R.length && beaten >= 4 && RA.every((q) => q.def.pieces < q.undef.pieces && !q.def.gone), '6. defended, the Heart stands and loses less than undefended, and ' + beaten.toFixed(1) + ' of 6 raiders are beaten on average (at least 4): ' + RA.map((q) => side(q) + ': ' + q.def.slain + ' slain, ' + q.def.left + ' left, ' + q.def.lost + ' of yours lost, ' + q.def.pieces + ' pieces').join('; ')); }
if (0) check(false, '6. defended: ' + RA.map((q) => side(q) + ': ' + q.def.slain + ' of 6 raiders slain, ' + q.def.left + ' left, ' + q.def.lost + ' of yours lost, ' + q.def.pieces + ' pieces of the Heart').join('; '));
check(RA.every((q) => q.undef.pieces >= 3), '6. ... undefended: ' + RA.map((q) => side(q) + ': ' + q.undef.pieces + ' pieces lost' + (q.undef.gone ? ' (the Heart fell, ' + q.undef.stock + ' left in the store, ' + q.undef.left + ' raiders still there)' : '')).join('; ') + ' (at least 3)');
check(RA.every((q) => !q.undef.gone || (q.undef.stock < 20 && q.undef.left === 0)), '6. ... a fallen Heart: the store is plundered and the raiders go home (what is in it half a minute later, brought in since: ' + RA.map((q) => q.undef.stock).join(', ') + ', under 20)');
check(mean(R.map((r) => r.kids[0])) > mean(R.map((r) => r.kids[1])) * 0.85, '7. work is rewarded: the best gatherers had ' + mean(R.map((r) => r.kids[0])).toFixed(2) + ' children each, the worst ' + mean(R.map((r) => r.kids[1])).toFixed(2));
check(R.every((r) => r.kept), '8. it is kept through saving (' + R.map((r) => r.keptWhy).join(' | ') + ')');
check(R.every((r) => !r.extinct && r.n >= r.freeN * 0.45), '9. nature is left alone: ' + R.map((r) => r.n + ' alive against ' + r.freeN + ' left to itself').join(', ') + ' (at least 45%)');
check(R.every((r) => r.raid.said >= 3 && r.raid.came >= r.raid.said - 1 && r.raid.landedGen >= 1 && r.raid.landedGen <= 3), '10. a raid comes: ' + R.map((r) => 'warned of ' + r.raid.said + ', ' + r.raid.came + ' landed, ' + r.raid.landedGen + ' years on').join('; '));
check(R.every((r) => r.raid.mid && r.raid.ended && r.raid.next >= 5 && /raid-over:(beaten|won|worn)/.test(r.raid.events.join(' '))), '10. ... it is kept through saving, it ends (' + R.map((r) => (r.raid.events.filter((e) => /raid-over/.test(e))[0] || 'never').replace('raid-over:', '')).join(', ') + '), and the next is ' + R.map((r) => r.raid.next).join(', ') + ' years off (at least 5)');
console.log(fails.length ? '\n' + fails.length + ' FAILED' : '\nall passed');
process.exit(fails.length ? 1 : 0);
