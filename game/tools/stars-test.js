// CAN A STAR BE TAKEN?  node tools/stars-test.js [seed]        (no AI, no page: free; exits 1 if a check fails)
// Your star, with a colony and a ship, among the stars near it:
//   1. THE STARS          each has a terrain and something it is rich in, the same every time; some hold rival colonies
//   2. AN ATTACK          a ship sent against a rival burns lumen and carries your fighters first; the rival's star has a Heart of its own, its
//                         people are not yours to command, and its defenders are mustered
//   3. THE HEART FALLS    your fighters, sent against their Heart, break it: the star is yours, its people lay down their arms, a Heart of your
//                         own rises there, and lumen is taken
//   4. HOME               the ship comes home; what is owed arrives in the store, and the star sends more every year; that rival raids no more
//   5. AN OUTPOST         on a free star a crew founds an outpost: a Heart of yours rises, the star is yours
//   6. IT IS KEPT         whose each star is, and what is owed, survive saving
const fs = require('fs'), path = require('path'), vm = require('vm');
global.window = globalThis; globalThis.addEventListener = () => {};
const src = path.join(__dirname, '..', 'src');
for (const f of ['10_core.js', '20_genome.js', '21_form.js', '21b_body.js', '21c_taste.js', '30_world.js', '40_words.js', '41_look.js', '43_why.js', '44_pressure.js', '45_organs.js', '45_parts.js', '45_plans.js', '46_events.js', '53_fields.js', '47_story.js', '48_judge.js', '49_eras.js', '54_deeds.js', '54c_acts.js', '54d_build.js', '54e_teach.js', '54f_judge.js', '54g_society.js', '54i_colony.js', '54j_order.js', '57x_far.js', '57y_raids.js', '57ya_stars.js', '80_save.js'])
  vm.runInThisContext(fs.readFileSync(path.join(src, f), 'utf8'), { filename: f });
G.hints = G.hints || {}; G.saveNow = function () {};
const seed = +process.argv[2] || 11, F = G.far;
const fails = [], check = (ok, what) => { console.log((ok ? '  ok    ' : '  FAIL  ') + what); if (!ok) fails.push(what); };
const run = (secs, stop) => { for (let t = 0; t < secs; t += 0.1) { G.step(0.1); if (stop && stop()) return t; } return -1; };
const yours = () => G.W.cre.filter((c) => !c.dead && !c.team);
const ev = []; ['star-taken', 'outpost', 'tribute', 'victory', 'raid-warn'].forEach((e) => G.on(e, (a, b, c) => ev.push({ e, a, b, c })));

G.newWorld({ seed }); G.founderPond(); G.mode = 'play'; G.speed = 1; run(1e6, () => G.W.gen > 8);
const H = G.W, col = G.colony(H); col.peace = true;      // (no raids while this is measured)
Object.assign(col.want, { g: 4, b: 2, f: 8, u: 0 }); run(30);
// a ship, standing ready (how one comes to be built is the voyage test's affair)
const sbp = G.blueprintFrom({ seed: 5, type: 'ship', S: 70, hue: 40, spiky: 0, brain: 0.5 }, '2'.repeat(40)); const ship = { name: 'Test Ship', looks: '', x: H.ww * 0.8, y: G.shoreY(H) - 60, r: 60, by: 'test', hue: 40, sp: 0, bp: sbp, until: 1e9 }; (H.works = H.works || []).push(ship);

// 1. the stars
const R = G.rivals(), all = []; for (let i = -4; i <= 4; i++) for (let j = -4; j <= 4; j++) { const p = F.cell(i, j); if (p && !p.free) all.push(p); }
const terr = {}; all.forEach((p) => { terr[p.terrain] = (terr[p.terrain] || 0) + 1; });
console.log('stars near home: ' + all.length + ', of which rivals: ' + R.map((q) => q.name + ' (' + G.starOf(q).terrain.id + ', ' + G.RES[G.starOf(q).res] + ', strength ' + G.starOf(q).strength + ')').join('; '));
console.log('terrains: ' + JSON.stringify(terr) + '; home is a ' + G.terrainOf(H).name);
check(R.length >= 1 && all.every((p) => p.terrain && p.res >= 0 && p.res <= 3) && Object.keys(terr).length >= 3, '1. the stars: ' + all.length + ' near home in ' + Object.keys(terr).length + ' terrains, ' + R.length + ' of them rivals');
check(JSON.stringify(G.starOf(all[0])) === JSON.stringify(G.starOf(F.cell(all[0].i, all[0].j))) && all.filter((p) => p.rival).length === R.length || R.length === 6, '1. ... each the same every time');

// 2. an attack
const rv = R[0], key = rv.key; col.stock[3] = 10; F.warTo = key;
const crew = F.crewFor(ship), fightersAboard = crew.filter((c) => c.job === 'f' || c.job === 'u').length;
const out = F.sail(rv.p, crew, ship);
check(!!out && out.length >= 2 && fightersAboard >= Math.min(crew.length, G.jobCount(H).f) - 1, '2. an attack: ' + crew.length + ' aboard, ' + fightersAboard + ' of them fighters (' + crew.map((c) => c.crewWhy).join(', ') + ')');
check(F.homeBlob && F.homeBlob.colony && F.homeBlob.colony.stock[3] === 10 - G.FUEL, '2. ... flying out burnt ' + G.FUEL + ' lumen (' + (F.homeBlob && F.homeBlob.colony ? F.homeBlob.colony.stock[3] : '?') + ' left at home)');
const W2 = G.W, fh = G.foeHeart(W2);
check(!!fh && !G.heartOf(W2) && W2.cre.filter((c) => !c.dead && c.team === 2).length >= 20 && yours().length === out.length, '2. ... the rival star has a Heart of its own, ' + W2.cre.filter((c) => c.team === 2).length + ' people who are not yours, and ' + yours().length + ' of yours');
run(12);
const defenders = W2.cre.filter((c) => !c.dead && c.team === 1).length;
check(defenders === G.starOf(rv).strength && out.every((c) => c.dead || c.job === 'f'), '2. ... ' + defenders + ' defenders are mustered (its strength is ' + G.starOf(rv).strength + '), and your crew are fighters');

// 3. the Heart falls (the crew alone may not be enough: more of yours are landed, as a second ship would bring them)
{ const best = yours().slice().sort((a, b) => G.jobFit(b, 'f') - G.jobFit(a, 'f'))[0] || out[0]; for (let i = 0; i < 8; i++) { const c = G.dropCreature(best.g, fh.x + 300 + i * 14, fh.y + 120); c.line = 1; } G.assign(yours(), 'f'); }
const p0 = G.buildCount(fh)[0]; G.order(yours(), { x: fh.x, y: fh.y, work: fh });
const tFall = run(600, () => ev.some((q) => q.e === 'star-taken') || yours().length === 0), taken = ev.filter((q) => q.e === 'star-taken')[0];
console.log('   their Heart: ' + p0 + ' pieces; ' + (taken ? 'fell after ' + Math.round(tFall) + ' s' : 'still ' + (G.foeHeart(W2) ? G.buildCount(G.foeHeart(W2))[0] : 0) + ' standing') + '; ' + yours().length + ' of yours left; defenders left ' + W2.cre.filter((c) => !c.dead && c.team === 1).length);
check(!!taken, '3. the Heart falls to your fighters' + (taken ? ' (' + Math.round(tFall) + ' s; ' + taken.c + ' lumen taken)' : ''));
check(!!taken && F.book[key].held && !G.foeHeart(W2) && W2.cre.filter((c) => !c.dead && c.team === 1).length === 0 && G.starOf(rv).held && !G.starOf(rv).rival, '3. ... the star is yours and its people lay down their arms');
run(3); check(!!G.heartOf(W2) && G.heartOf(W2).ruin === true, '3. ... a Heart of your own rises in its place');
run(120); { const h = G.heartOf(W2), c = h ? G.buildCount(h) : [0, 0, 1]; check(c[0] >= 4, '3. ... and is raised by those of yours who are there (' + c[0] + ' of ' + c[2] + ' pieces after two minutes)'); }

// 4. home
const owed = F.owed.slice(), back = yours().filter((c) => c.crew).slice(0, 3); const res = F.home(null, back);
check(!!res && G.W.seed === H.seed && !F.visiting, '4. home: the ship is home with ' + (res ? res.crew.length : 0) + ' of the crew');
const cH = G.colony(G.W), l0 = cH.stock[3]; run(4);
check(cH.stock[3] === l0 + owed[3] && owed[3] >= 6 && ev.some((q) => q.e === 'tribute'), '4. ... what was owed arrives in the store: ' + owed[3] + ' lumen (' + l0 + ' -> ' + cH.stock[3] + ')');
{ const k = G.starOf(rv).res, s0 = cH.got[k], g0 = G.W.gen; run(1e6, () => G.W.gen >= g0 + 3); run(3); const got = cH.got[k] - s0; console.log('   three years on: ' + got + ' more ' + G.RES[k] + ' brought in in all (gathered and sent)'); check(ev.filter((q) => q.e === 'tribute').length >= 3, '4. ... and the star sends ' + G.RES[k] + ' home every year (' + ev.filter((q) => q.e === 'tribute').length + ' deliveries)'); }
{ cH.peace = false; cH.raid = null; const picks = []; for (let i = 0; i < 6; i++) { cH.raidN = i; const r = G.raidWarn(); if (r) picks.push(r.key); cH.raid = null; } cH.peace = true; check(picks.indexOf(key) < 0 && (picks.length > 0 || R.length === 1), '4. ... a star that is yours raids no more (raids would come from: ' + (picks.filter((v, i) => picks.indexOf(v) === i).join(' ; ') || 'nobody') + ')'); }

// 5. an outpost on a free star
{ const free = all.filter((p) => !p.rival && !G.starOf(p).held)[0], W0 = G.W; W0.works.forEach((w) => { if (w.name === 'Test Ship') w.away = 0; });
  const sh = F.shipOf() || ship, crew2 = F.crewFor(sh); cH.stock[3] = Math.max(cH.stock[3], G.FUEL); const out2 = F.sail(free, crew2, sh);
  check(!!out2 && out2.length >= 2 && !G.foeHeart(G.W) && !G.heartOf(G.W), '5. an outpost: ' + (out2 ? out2.length : 0) + ' land on ' + free.name + ', a free ' + G.starOf(free).terrain.name + ' (no Heart on it)');
  run(10); const why = G.foundOutpost(); run(5); const hp = G.heartOf(G.W);
  check(why === '' && !!hp && G.starOf(free).held && ev.some((q) => q.e === 'outpost'), '5. ... founded' + (why ? ': ' + why : '') + ': a Heart of yours rises, the star is yours');
  run(150); const c = G.heartOf(G.W) ? G.buildCount(G.heartOf(G.W)) : [0, 0, 1], st = G.colony(G.W).got.reduce((a, b) => a + b, 0), jobs = G.jobCount(G.W);
  console.log('   after 150 s there: Heart ' + c[0] + ' of ' + c[2] + ' pieces; ' + JSON.stringify(jobs) + '; ' + st + ' loads brought in');
  check(c[0] >= 3, '5. ... and it rises (' + c[0] + ' of ' + c[2] + ' pieces after 150 s; ' + yours().length + ' of yours alive there)');
  // 6. kept
  const d = JSON.parse(JSON.stringify(G.collectSave())), fb = d.far && d.far.book; const heldKeys = Object.keys(F.book).filter((k) => F.book[k].held).sort().join(' ; ');
  F.owed[1] = 7; const d2 = JSON.parse(JSON.stringify(G.collectSave())); G.applySave(d2); if (G.farLoaded) G.farLoaded(d2);
  const heldAfter = Object.keys(F.book).filter((k) => F.book[k].held).sort().join(' ; ');
  check(!!fb && heldAfter === heldKeys && heldKeys.split(' ; ').length === 2 && F.owed[1] === 7, '6. it is kept: yours are ' + heldAfter + ' after opening the save, and what is owed (' + F.owed.join(',') + ')');
  check(G.starsHeld().length === 2 && G.starsHeld().every((s) => s.name && s.terrain), '6. ... ' + G.starsHeld().map((s) => s.name + ' (' + s.terrain.id + (s.taken ? ', taken' : ', outpost') + ')').join(', '));
}
console.log(fails.length ? '\n' + fails.length + ' FAILED' : '\nall passed');
process.exit(fails.length ? 1 : 0);
