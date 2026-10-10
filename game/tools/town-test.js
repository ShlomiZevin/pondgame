// DO THEY BUILD A NICE POND?  node tools/town-test.js [generations] [seeds]        (no AI, no page: free; exits 1 if a check fails)
// Ponds are run with nobody watching and no AI to ask, for a few hundred generations, and what their creatures have built is measured against what
// "a nicely built pond" means here:
//   1. THEY BUILD        every pond has buildings, more as it grows older
//   2. THEY FINISH       what stands is whole (nearly every piece set and coloured)
//   3. IT STANDS UP      no piece rests on nothing
//   4. ROOM              no building stands on another, and there is a gap between neighbours
//   5. ORDER             neighbours share a ground line: buildings make rows, not a scatter
//   6. IT LASTS          buildings are not lost for no reason (few fall, and only when nobody lives round them)
//  10. THE WATERLINE    nothing is built across it or close to it
//  11. THE SIDES        nobody and nothing is out in the dark at the left and right edges
//  12. THEY GET BETTER  kinds grow practised, and add to what already stands
//   7. THEY WORK TOGETHER  a building goes up in reasonable time, with few hands idle, and by hauling (not by being mended afterwards)
// A second part checks the plain sense applied to free designs (as the AI makes them): given designs with pieces hanging in the air, they are let down
// onto what they rest on, and can then be built in order.
const fs = require('fs'), path = require('path'), vm = require('vm');
global.window = globalThis; globalThis.addEventListener = () => {};
const src = path.join(__dirname, '..', 'src');
for (const f of ['10_core.js', '20_genome.js', '21_form.js', '21b_body.js', '21c_taste.js', '30_world.js', '40_words.js', '41_look.js', '43_why.js', '44_pressure.js', '45_organs.js', '45_parts.js', '45_plans.js', '46_events.js', '53_fields.js', '47_story.js', '48_judge.js', '49_eras.js', '54_deeds.js', '54c_acts.js', '54d_build.js', '54e_teach.js', '54f_judge.js', '54g_society.js'])
  vm.runInThisContext(fs.readFileSync(path.join(src, f), 'utf8'), { filename: f });
const gens = +process.argv[2] || 160, seeds = (process.argv[3] || '11,23,57').split(',').map(Number);
const fails = [], check = (ok, what) => { console.log((ok ? '  ok    ' : '  FAIL  ') + what); if (!ok) fails.push(what); };
const mean = (a) => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;

const all = { across: 0, dark: 0, grown: 0, craft: [], abandoned: 0, houses: [], atHome: [], count: [], whole: [], loose: 0, overlaps: 0, rowed: [], fallen: 0, secs: [], idle: [], hauledShare: [], early: [], late: [] };
for (const seed of seeds) {
  G.newWorld({ seed }); G.founderPond(); G.mode = 'play'; G.speed = 1;
  let last = 0, gone = 0, at60 = 0; const builds = [];
  const why = {}; G.on('work-gone', (w, cause) => { gone++; why[cause || '?'] = (why[cause || '?'] || 0) + 1; if (cause === 'abandoned') all.abandoned++; });
  G.on('deed-end', (d, how, made) => { if (made && d.built) builds.push(Object.assign({ pieces: made.bp.P.length, placed: d.placed || 0 }, d.built)); });
  while (G.W.gen <= gens && !G.W.extinct) { G.step(0.1); if (G.W.gen !== last) { last = G.W.gen; if (last === Math.round(gens * 0.4)) at60 = (G.W.works || []).filter((w) => w.bp).length; } }
  const W = G.W, Wk = (W.works || []).filter((w) => w.bp);
  let overlaps = 0, rowed = 0, withNb = 0, loose = 0; const whole = [];
  Wk.forEach((w, i) => {
    const n = G.buildCount(w), c = G.designCheck(w.bp); whole.push((n[0] + n[1]) / (2 * n[2])); loose += c.loose;
    let nb = false, row = false;
    Wk.forEach((o, j) => { if (i === j) return; if ((o.bp.type === 'ship' && w.bp.type === 'port') || (o.bp.type === 'port' && w.bp.type === 'ship')) return;      /* (a spaceship stands on its port: that is where it belongs) */ const gap = Math.abs(o.x - w.x) - (o.bp.hw + w.bp.hw), dy = Math.abs(o.y - w.y); if (gap < 0 && dy < 120) overlaps++; if (Math.hypot(o.x - w.x, o.y - w.y) < 700 && !/ship|port/.test(o.bp.type + w.bp.type)) { nb = true; if (dy < 10) row = true; } });      /* (a port stands at the border of the pond and its ship upon it: they have their own place, not a place in a row) */
    if (nb) { withNb++; if (row) rowed++; }
  });
  console.log('seed ' + seed + (W.extinct ? ' EXTINCT at ' + W.gen : '') + ': generation ' + W.gen + ', ' + W.cre.length + ' alive, ' + Wk.length + ' buildings standing (' + at60 + ' at generation ' + Math.round(gens * 0.4) + '), ' + gone + ' fallen');
  console.log('   ' + Wk.map((w) => w.name + ' [' + w.bp.type + ', ' + G.buildCount(w).join('/') + ', x' + Math.round(w.x) + ' y' + Math.round(w.y) + ']').join('  '));
  console.log('   built: ' + builds.map((b) => b.pieces + ' pieces in ' + b.secs + ' s by ' + b.hands + ' hands, idle ' + Math.round(b.idle * 100) + '%, hauled ' + b.hauled).join(' · '));
  { const hs = Wk.filter((w) => w.bp.type === 'house'), asleep = W.cre.filter((c) => c.asleep), home = asleep.filter((c) => c.atHome); all.houses.push(hs.length); if (hs.length && asleep.length) all.atHome.push(home.length / asleep.length); console.log('   houses ' + hs.length + ' · asleep now ' + asleep.length + ', of them at a house ' + home.length + ' · slept at home so far ' + (W.stats.sleptHome || 0) + ' · lost: ' + (JSON.stringify(why) === '{}' ? 'none' : JSON.stringify(why))); }
  { const sy = G.shoreY(W), e = G.sideEdge(W); Wk.forEach((w) => { if (G.FLAT || w.bp.type === 'ship' || w.bp.type === 'heart') return;      /* (a star has no waterline) */ const foot = w.y + w.bp.S * 0.45, top = foot - (w.bp.top || 60); if (w.bp.wet === false || w.bp.type === 'port' ? foot > sy - 12 : top < sy + 12) all.across++; if (w.x - (w.bp.hw || 40) < e || w.x + (w.bp.hw || 40) > W.ww - e) all.dark++; all.grown += w.grown || 0; }); W.cre.forEach((c) => { if (c.x < e || c.x > W.ww - e) all.dark++; }); W.species.forEach((sp) => { if (!sp.extinct && sp.n >= 8) all.craft.push(G.craftOf(sp.id)); }); }
  all.count.push(Wk.length); all.early.push(at60); all.late.push(Wk.length); all.whole.push(...whole); all.loose += loose; all.overlaps += overlaps / 2; if (withNb) all.rowed.push(rowed / withNb); all.fallen += gone;
  builds.forEach((b) => { all.secs.push(b.secs); all.idle.push(b.idle); all.hauledShare.push(Math.min(1, b.placed / b.pieces)); });
}
console.log('\nCHECKS over ' + seeds.length + ' ponds of ' + gens + ' generations:');
check(Math.min(...all.count) >= 2, '1. they build: every pond has at least 2 buildings (fewest: ' + Math.min(...all.count) + ', mean ' + mean(all.count).toFixed(1) + ')');
check(mean(all.late) >= mean(all.early), '1. ... and more as the pond grows older (' + mean(all.early).toFixed(1) + ' at 40% of the run, ' + mean(all.late).toFixed(1) + ' at the end)');
check(mean(all.whole) >= 0.9, '2. they finish: what stands is ' + Math.round(mean(all.whole) * 100) + '% set and coloured on average (at least 90%)');
check(all.loose === 0, '3. it stands up: ' + all.loose + ' pieces rest on nothing (must be 0)');
check(all.overlaps === 0, '4. room: ' + all.overlaps + ' pairs of buildings stand on each other (must be 0)');
check(mean(all.rowed) >= 0.6, '5. order: ' + Math.round(mean(all.rowed) * 100) + '% of buildings with a neighbour share its ground line (at least 60%)');
check(all.abandoned <= seeds.length, '6. it lasts: ' + all.abandoned + ' buildings were lost by being abandoned (at most one a pond); ' + (all.fallen - all.abandoned) + ' more fell to attack');
check(all.across === 0, '10. the waterline: ' + all.across + ' buildings stand across it or within a step of it (must be 0): what is under water is under it, what is on land is on it');
check(all.dark === 0, '11. the sides: ' + all.dark + ' creatures or buildings are out in the dark at the sides of the pond (must be 0)');
check(Math.max(0, ...all.craft) >= 2, '12. they get better: the most practised kind has raised ' + Math.max(0, ...all.craft) + ' buildings (at least 2); ' + all.grown + ' things were added to buildings already standing');
check(mean(all.houses) >= 2, '9. houses: ' + mean(all.houses).toFixed(1) + ' houses a pond on average (at least 2)');
check(all.secs.length > 0 && mean(all.secs) <= 150, '7. together: a building takes ' + Math.round(mean(all.secs)) + ' s of pond time on average (at most 150)');
check(mean(all.idle) <= 0.4, '7. ... with ' + Math.round(mean(all.idle) * 100) + '% of the builders\' time spent idle (at most 40%)');
check(mean(all.hauledShare) >= 0.9, '7. ... and ' + Math.round(mean(all.hauledShare) * 100) + '% of the pieces set by hauling during the work (at least 90%)');

// ── free designs: the plain sense applied to them ──
console.log('\nFREE DESIGNS (as the AI makes them), checked and let down:');
const samples = path.join(__dirname, 'design-samples.json'), given = fs.existsSync(samples) ? JSON.parse(fs.readFileSync(samples, 'utf8')) : [];
const made = given.concat([
  { about: 'a test: a roof hanging in the air over two posts', pieces: [{ s: 'column', x: -0.5, y: 0, w: 0.2, h: 0.8, m: 'stone', c: 'main' }, { s: 'column', x: 0.5, y: 0, w: 0.2, h: 0.8, m: 'stone', c: 'main' }, { s: 'slab', x: 0, y: 1.3, w: 1.4, h: 0.15, m: 'reed', c: 'second' }, { s: 'dome', x: 0, y: 2.0, w: 0.8, h: 0.4, m: 'shell', c: 'light' }, { s: 'lamp', x: 0, y: 2.7, w: 0.15, h: 0.15, m: 'shell', c: 'glow' }] },
  { about: 'a test: a sound little hut', pieces: [{ s: 'block', x: 0, y: 0, w: 1.0, h: 0.6, m: 'stone', c: 'main' }, { s: 'arch', x: 0, y: 0, w: 0.3, h: 0.45, m: 'reed', c: 'dark' }, { s: 'dome', x: 0, y: 0.6, w: 1.2, h: 0.5, m: 'shell', c: 'second' }, { s: 'flag', x: 0, y: 1.1, w: 0.2, h: 0.3, m: 'reed', c: 'light' }] },
]);
let badAfter = 0, balance = [];
made.forEach((raw, i) => {
  const P = G.designFrom(raw, 80, 44); if (!P) { console.log('   design ' + (i + 1) + ': not usable (too few pieces)'); return; }
  const before = G.designCheck({ S: 80, P: P.map((p) => Object.assign({}, p)) }), bp = G.designSettle({ S: 80, P: P }), after = G.designCheck(Object.assign(bp, { dep: null }));
  // can it be built in order? set pieces whenever what they rest on is set, until nothing more can be
  const st = P.map(() => 0); let progress = true; while (progress) { progress = false; P.forEach((p, k) => { if (!st[k] && bp.dep[k].every((q) => st[q])) { st[k] = 1; progress = true; } }); }
  const stuck = st.filter((v) => !v).length; badAfter += after.loose + stuck; balance.push(after.balance);
  console.log('   ' + String(raw.about || 'design ' + (i + 1)).slice(0, 70).padEnd(70) + ' ' + after.pieces + ' pieces, ' + before.loose + ' hung in the air -> ' + after.loose + ', balance ' + after.balance + ', ' + after.width + ' wide x ' + after.height + ' high' + (stuck ? ', ' + stuck + ' CANNOT BE SET' : ''));
});
check(badAfter === 0, '8. free designs: after being let down, none has a piece resting on nothing or one that cannot be set (' + badAfter + ')');
check(mean(balance) >= 0.5, '8. ... and they are balanced left and right: ' + mean(balance).toFixed(2) + ' on average (at least 0.5)');

console.log(fails.length ? '\n' + fails.length + ' CHECK(S) FAILED' : '\nALL CHECKS PASSED');
process.exit(fails.length ? 1 : 0);
