// DO THEY GROW A SOCIETY?  node tools/society-test.js [generations] [seeds]        (no AI, no page: free; exits 1 if a check fails)
// Ponds are run with nobody watching, and what their creatures have become to each other is measured:
//   1. CHARACTER IS IN THE GENES   it survives saving, it is handed down (children are like their parents), and it differs from one creature to the next
//   2. PONDS DIFFER                two ponds do not end with the same character
//   3. LEADERS                     some are followed, by three at least
//   4. THEY SHARE AND DANCE        both happen, and more among the kind and the playful than among the rest
//   5. THE CLEVER LEARN MORE       the same lesson moves a clever one further than a simple one
//   6. A LEADER CARRIED ELSEWHERE  the strongest leader of one pond and a nobody of that pond are set down in other ponds, and what happens is told (it is the
//                                  ponds' own affair: nothing is required of it); what IS required: of two strangers alike in all but Leading, the leader is followed more
//   8. CARRIED BY HAND             a creature kept in one pond can be set down alone in another, with its character
//   7. NATURE IS LEFT ALONE        the ponds live (no extinction), as they did before there was any character
const fs = require('fs'), path = require('path'), vm = require('vm');
global.window = globalThis; globalThis.addEventListener = () => {};
const src = path.join(__dirname, '..', 'src');
for (const f of ['10_core.js', '20_genome.js', '21_form.js', '21b_body.js', '21c_taste.js', '30_world.js', '40_words.js', '41_look.js', '43_why.js', '44_pressure.js', '45_organs.js', '45_parts.js', '45_plans.js', '46_events.js', '53_fields.js', '47_story.js', '48_judge.js', '49_eras.js', '54_deeds.js', '54c_acts.js', '54d_build.js', '54e_teach.js', '54f_judge.js', '54g_society.js'])
  vm.runInThisContext(fs.readFileSync(path.join(src, f), 'utf8'), { filename: f });
const gens = +process.argv[2] || 60, seeds = (process.argv[3] || '11,23').split(',').map(Number);
const fails = [], check = (ok, what) => { console.log((ok ? '  ok    ' : '  FAIL  ') + what); if (!ok) fails.push(what); };
const mean = (a) => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0, sd = (a) => { const m = mean(a); return Math.sqrt(mean(a.map((v) => (v - m) * (v - m)))); };
const corr = (a, b) => { const ma = mean(a), mb = mean(b); let n = 0, da = 0, db = 0; for (let i = 0; i < a.length; i++) { n += (a[i] - ma) * (b[i] - mb); da += (a[i] - ma) ** 2; db += (b[i] - mb) ** 2; } return da && db ? n / Math.sqrt(da * db) : 0; };
const N = G.SOC_LABEL;

let shares = 0, dances = 0; const met = [];
G.on('stranger-met', (c, end, text) => met.push({ id: c.id, end, text })); const giver = [], dancer = [], kid = [], par = [];
G.on('share', (c) => { shares++; giver.push(G.soc(c)[2]); });
G.on('dance', (c) => { dances++; dancer.push(G.soc(c)[4]); });
G.on('birth', (c, a, b) => { if (a && b && kid.length < 6000) for (let i = 0; i < 6; i++) { kid.push(c.g.s[i]); par.push((a.g.s[i] + b.g.s[i]) / 2); } });

const ponds = [];
for (const seed of seeds) {
  G.newWorld({ seed }); G.founderPond(); G.mode = 'play'; G.speed = 1;
  let folSum = 0, folN = 0, headsSeen = 0, looks = 0;
  while (G.W.gen <= gens && !G.W.extinct) { G.step(0.1); if ((G.W.step % 100) === 0) { looks++; const led = G.W.cre.filter((c) => !c.dead && (c.fol || 0) >= 3); if (led.length) headsSeen++; led.forEach((c) => { folSum += c.fol; folN++; }); } }
  const W = G.W, alive = W.cre.filter((c) => !c.dead), m = N.map((_, i) => mean(alive.map((c) => c.g.s[i]))), spread = N.map((_, i) => sd(alive.map((c) => c.g.s[i])));
  const top = alive.slice().sort((a, b) => (b.fol || 0) * 0.05 + b.g.s[0] - (a.fol || 0) * 0.05 - a.g.s[0])[0], low = alive.slice().sort((a, b) => a.g.s[0] - b.g.s[0])[0];
  const kinds = W.species.filter((s) => !s.extinct && s.n >= 3).map((s) => ({ name: s.name, n: s.n, so: G.societyOf(s.id) })).filter((k) => k.so);
  console.log('seed ' + seed + (W.extinct ? ' EXTINCT at ' + W.gen : '') + ': generation ' + W.gen + ', ' + alive.length + ' alive');
  console.log('   character on average: ' + N.map((n, i) => n + ' ' + m[i].toFixed(2) + ' (±' + spread[i].toFixed(2) + ')').join(', '));
  kinds.slice(0, 4).forEach((k) => console.log('   the ' + k.name + ' (' + k.n + '): ' + k.so.text));
  console.log('   a leader was to be seen ' + Math.round(100 * headsSeen / Math.max(1, looks)) + '% of the time, with ' + (folN ? (folSum / folN).toFixed(1) : 0) + ' followers on average; most followed now: #' + (top ? top.id + ' with ' + (top.fol || 0) + ' (' + G.characterOf(top) + ')' : 'none'));
  ponds.push({ seed, extinct: W.extinct, n: alive.length, m, spread, headsSeen: headsSeen / Math.max(1, looks), fol: folN ? folSum / folN : 0, top: top ? G.packGenome(top.g) : null, topLead: top ? top.g.s[0] : 0, low: low ? G.packGenome(low.g) : null, lowLead: low ? low.g.s[0] : 0 });
}

console.log('\nCHECKS over ' + seeds.length + ' ponds of ' + gens + ' generations:');
{ const g = G.founder(); g.s = [0.91, 0.12, 0.5, 0.77, 0.03, 0.4]; const back = G.unpackGenome(JSON.parse(JSON.stringify(G.packGenome(g)))); check(back.s.every((v, i) => Math.abs(v - g.s[i]) < 0.006), '1. character survives saving (' + back.s.map((v) => v.toFixed(2)).join(' ') + ')');
  const old = G.packGenome(g).slice(0, 9), o = G.unpackGenome(old); check(o.s && o.s.length === 6 && o.s.every((v) => v >= 0 && v <= 1), '1. ... and a creature saved before there was character is dealt one'); }
check(corr(kid, par) > 0.6, '1. ... it is handed down: children are like the mean of their parents (correlation ' + corr(kid, par).toFixed(2) + ' over ' + kid.length / 6 + ' births, at least 0.6)');
check(mean(ponds.map((p) => mean(p.spread))) > 0.05, '1. ... and it differs from one creature to the next (spread ' + mean(ponds.map((p) => mean(p.spread))).toFixed(2) + ' on average, at least 0.05)');
if (ponds.length > 1) { const d = Math.max(...N.map((_, i) => Math.abs(ponds[0].m[i] - ponds[1].m[i]))); check(d > 0.05, '2. ponds differ: the furthest-apart trait of the first two ponds differs by ' + d.toFixed(2) + ' (at least 0.05)'); }
check(mean(ponds.map((p) => p.headsSeen)) > 0.3, '3. leaders: one was to be seen ' + Math.round(100 * mean(ponds.map((p) => p.headsSeen))) + '% of the time (at least 30%), with ' + mean(ponds.map((p) => p.fol)).toFixed(1) + ' followers on average');
check(shares > 20 && dances > 20, '4. they share and dance: ' + shares + ' gifts of food, ' + dances + ' dances');
{ const allK = mean(ponds.map((p) => p.m[2])), allP = mean(ponds.map((p) => p.m[4])); check(mean(giver) > allK && mean(dancer) > allP, '4. ... the givers are kinder than most (' + mean(giver).toFixed(2) + ' against ' + allK.toFixed(2) + ') and the dancers more playful (' + mean(dancer).toFixed(2) + ' against ' + allP.toFixed(2) + ')'); }
// 5. the same lesson, a clever one and a simple one
{ G.newWorld({ seed: 5 }); G.founderPond(); for (let i = 0; i < 300; i++) G.step(0.1);
  const base = G.W.cre.filter((c) => !c.dead && c.ph.bv && c.ph.bv.length > 3)[0]; let moved = [0, 0];
  if (base) [0.9, 0.1].forEach((wit, k) => { const g = G.cloneGenome(base.g); g.s[3] = wit; const c = G.dropCreature(g, base.x, base.y); for (let i = 0; i < 40; i++) { c.inp.fill(0.5); G.think(c); G.learn(c, 0.5); } moved[k] = c.lw ? Array.from(c.lw).reduce((a, v) => a + Math.abs(v), 0) : 0; });
  check(moved[0] > moved[1] * 1.5 && moved[1] > 0, '5. the clever learn more: the same 40 lessons moved a clever one ' + moved[0].toFixed(2) + ' and a simple one ' + moved[1].toFixed(2)); }
// 6. a leader carried elsewhere: the strongest leader of pond A (by its genes and its following), and a nobody of pond A, set down among the people of pond B
{ const A = ponds[0], Bseed = seeds[1] || seeds[0] + 1; let lead = 0, nobody = 0, trials = 0; const nat = [0, 0, 0];
  if (A.top && A.low) for (let t = 0; t < 4; t++) {
    G.newWorld({ seed: Bseed + t * 101 }); G.founderPond(); G.mode = 'play'; while (G.W.gen <= 12 && !G.W.extinct) G.step(0.1);
    const W = G.W, al = W.cre.filter((c) => !c.dead); if (al.length < 12) continue; const cx = mean(al.map((c) => c.x)), cy = mean(al.map((c) => c.y));
    const gl = G.unpackGenome(A.top), go = G.unpackGenome(t < 2 ? A.low : A.top); if (t >= 2) { gl.s[0] = 0.95; go.s[0] = 0.05; }      // two ponds as nature made them, two with strangers alike in all but Leading
    const L = G.dropCreature(gl, cx - 60, cy), O = G.dropCreature(go, cx + 60, cy); let l = 0, o = 0, n = 0;
    for (let i = 0; i < 400; i++) { L.E = L.ph.Emax * 0.8; O.E = O.ph.Emax * 0.8; G.step(0.1); if (L.dead || O.dead) break; if (i > 50 && i % 10 === 0) { l += L.fol || 0; o += O.fol || 0; n++; } }
    if (n) { if (t < 2) { nat[0] += l / n; nat[1] += o / n; nat[2]++; } else { lead += l / n; nobody += o / n; trials++; } }
  }
  console.log('   as nature made them: the strongest leader of the first pond (Leading ' + A.topLead.toFixed(2) + ') was followed in ' + nat[2] + ' strange ponds by ' + (nat[0] / Math.max(1, nat[2])).toFixed(1) + ' on average, a nobody of its pond (Leading ' + A.lowLead.toFixed(2) + ') by ' + (nat[1] / Math.max(1, nat[2])).toFixed(1));
  check(trials > 0 && lead > nobody && lead / trials >= 2, '6. of two strangers alike in all but Leading (0.95 and 0.05), the leader is followed in a strange pond (by ' + (lead / Math.max(1, trials)).toFixed(1) + ' on average) and the other is not (' + (nobody / Math.max(1, trials)).toFixed(1) + ')'); }
{ const said = {}; met.forEach((m) => { said[m.end] = (said[m.end] || 0) + 1; }); console.log('   what the ponds made of their strangers: ' + JSON.stringify(said)); met.slice(0, 3).forEach((m) => console.log('      ' + m.text));
  check(met.length >= 4 && met.every((m) => ['led', 'few', 'looked', 'shunned', 'dead'].indexOf(m.end) >= 0), '6. ... and every pond says what it made of its stranger (' + met.length + ' verdicts)'); }
// 8. carried by hand: a creature KEPT in one pond is SET DOWN ALONE in another, with its character, as a stranger
{ G.newWorld({ seed: 77 }); G.founderPond(); G.mode = 'play'; while (G.W.gen <= 6 && !G.W.extinct) G.step(0.1);
  const src = G.W.cre.filter((c) => !c.dead)[0], it = G.keep(src), sA = src.g.s.slice(), n0 = G.collection.length;
  G.newWorld({ seed: 78 }); G.founderPond(); G.mode = 'play'; while (G.W.gen <= 6 && !G.W.extinct) G.step(0.1);
  const before = G.W.cre.length, c = G.setDown(it);
  check(!!c && G.W.cre.length === before + 1 && c.fromPond === 1 && c.stranger !== undefined && c.g.s.every((v, i) => Math.abs(v - sA[i]) < 0.006) && G.collection.length === n0, '8. carried by hand: one kept creature is set down alone in another pond, a stranger with the character it had (' + (c ? G.characterOf(c) : '-') + ')');
  const d = G.W.cre.filter((o) => o !== c && !o.dead).map((o) => Math.hypot(o.x - c.x, o.y - c.y)).sort((a, b) => a - b); check(d.length > 3 && d[3] < 400, '8. ... and it is set down among those who live there (the 4th nearest is ' + Math.round(d[3] || 0) + ' away)'); }
check(ponds.every((p) => !p.extinct && p.n >= 20), '7. nature is left alone: every pond lives (' + ponds.map((p) => p.n).join(', ') + ' alive)');

console.log(fails.length ? '\n' + fails.length + ' CHECK(S) FAILED' : '\nALL CHECKS PASSED');
process.exit(fails.length ? 1 : 0);
