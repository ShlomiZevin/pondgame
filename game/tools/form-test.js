// headless: do bodies grown from genes really diverge, pond by pond?  node tools/form-test.js [generations] [seeds] [dt]
const fs = require('fs'), path = require('path'), vm = require('vm');
global.window = globalThis; globalThis.addEventListener = () => {};
const src = path.join(__dirname, '..', 'src');
for (const f of ['10_core.js', '20_genome.js', '21_form.js', '21b_body.js', '21c_taste.js', '30_world.js', '40_words.js', '43_why.js', '44_pressure.js', '45_organs.js', '45_parts.js', '45_plans.js', '46_events.js', '53_fields.js', '47_story.js', '48_judge.js', '49_eras.js']) vm.runInThisContext(fs.readFileSync(path.join(src, f), 'utf8'), { filename: f });
const gens = +process.argv[2] || 120, seeds = +process.argv[3] || 3, dt = +process.argv[4] || 0.1;
for (let seed = 1; seed <= seeds; seed++) {
  G.newWorld({ seed: seed * 101 }); G.founderPond();
  const t0 = Date.now(); let minPop = 1e9;
  G.off && G.off('scored');
  while (G.W.gen < gens + 1 && !G.W.extinct) { G.step(dt); }
  const W = G.W, cre = W.cre, n = cre.length || 1;
  let segs = 0, rules = 0, eyes = 0, star = 0, size = 0, charm = 0; const kinds = [0, 0, 0, 0, 0, 0, 0, 0];
  for (const c of cre) { const f = c.g.f; segs += f.n; rules += f.rules.length; eyes += f.en; star += f.sym ? 1 : 0; size += c.ph.r; charm += c.ph.charm; const seen = {}; for (const q of f.rules) if (!seen[q.k]) { seen[q.k] = 1; kinds[q.k]++; } }
  for (const h of W.hist) minPop = Math.min(minPop, h.pop);
  console.log('\n=== seed', seed * 101, '| gen', W.gen, 'pop', cre.length, 'min pop', minPop, 'extinct', W.extinct, '|', Date.now() - t0, 'ms');
  console.log('  fashion:', G.form.fashionText(W.fashion), '| water:', G.envText(W), '| gasping', Math.round(100 * (W.lastStats.gasp || 0) / (W.lastStats.breaths || 1)) + '%');
  console.log('  avg segments', (segs / n).toFixed(1), 'growths', (rules / n).toFixed(1), 'eyes', (eyes / n).toFixed(1), 'star', Math.round(100 * star / n) + '%', 'size', (size / n).toFixed(1), 'charm', (charm / n).toFixed(2), 'species alive', W.species.filter(s => !s.extinct).length);
  console.log('  share with: ' + G.form.KMANY.map((k, i) => k + ' ' + Math.round(100 * kinds[i] / n) + '%').join(', '));
  console.log('  kinds now: ' + (W.kinds || []).map(k => k[0] + ' ' + Math.round(k[1] * 100) + '%').join(', '));
  console.log('  ages: ' + (W.ages || []).map(a => 'gen ' + a.gen + ' ' + a.name).join(' | '));
  const top = W.species.filter(s => !s.extinct).sort((a, b) => b.n - a.n).slice(0, 3);
  for (const s of top) console.log('   -', s.name, '(' + s.n + '):', G.form.kind(s.rep.f).full + ';', G.form.facts(s.rep.f).join(', '));
  console.log('  designs: ' + W.designs.map(d => d.name + ' ' + Math.round(100 * cre.filter(c => c.g.f.rules.some(q => q.k === 8 && q.t === d.id)).length / n) + '%').join(', '));
  console.log('  asleep now', cre.filter(c => c.asleep).length, 'slept last gen', W.lastStats.slept, 'children lost to protein', W.lastStats.protShort, '| hunters killed', W.lastStats.killed);
  console.log('  walkers', cre.filter(c => c.ph.lungs).length, 'biters', cre.filter(c => c.ph.jaws).length, 'on shore', cre.filter(c => c.land).length);
}
