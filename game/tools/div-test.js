// how many different kinds of body share one pond?  node tools/div-test.js [generations] [seed,seed,...]
const fs = require('fs'), path = require('path'), vm = require('vm');
global.window = globalThis; globalThis.addEventListener = () => {};
const src = path.join(__dirname, '..', 'src');
for (const f of ['10_core.js', '20_genome.js', '21_form.js', '21b_body.js', '21c_taste.js', '30_world.js', '40_words.js', '41_look.js', '43_why.js', '44_pressure.js', '45_organs.js', '45_parts.js', '45_plans.js', '46_events.js', '53_fields.js', '47_story.js', '48_judge.js', '49_eras.js']) vm.runInThisContext(fs.readFileSync(path.join(src, f), 'utf8'), { filename: f });
const gens = +process.argv[2] || 200, seeds = (process.argv[3] || '11,23,57,101').split(',').map(Number);
let all = { top: 0, eff: 0, big: 0, n: 0 };
for (const seed of seeds) {
  G.newWorld({ seed }); G.founderPond();
  let top = 0, eff = 0, big = 0, n = 0, minPop = 1e9, hues = 0;
  let last = 0;
  while (G.W.gen <= gens && !G.W.extinct) {
    G.step(0.1);
    if (G.W.gen !== last) { last = G.W.gen;
      if (last > gens * 0.4 && G.W.kinds && G.W.kinds.length) {
        const cnt = {}; for (const c of G.W.cre) { const k = G.shapeOf(c.g); cnt[k] = (cnt[k] || 0) + 1; }
        const N = G.W.cre.length || 1; let s2 = 0, t = 0, b = 0; for (const k in cnt) { const p = cnt[k] / N; s2 += p * p; t = Math.max(t, p); if (p >= 0.1) b++; }
        top += t; eff += 1 / s2; big += b; n++;
      }
      minPop = Math.min(minPop, G.W.cre.length);
    }
  }
  const W = G.W, hs = W.cre.map(c => c.g.f.hue); let spread = 0; { let sx = 0, sy = 0; for (const h of hs) { sx += Math.cos(h * Math.PI / 180); sy += Math.sin(h * Math.PI / 180); } spread = 1 - Math.hypot(sx, sy) / (hs.length || 1); }
  console.log('seed', seed, W.extinct ? 'EXTINCT gen ' + W.gen : 'ok', '| pop', W.cre.length, 'min', minPop, '| biggest silhouette', Math.round(100 * top / n) + '%', '| effective silhouettes', (eff / n).toFixed(1), '| silhouettes over 10%:', (big / n).toFixed(1), '| colour spread', spread.toFixed(2), '| ages', W.ages.length, '|', (W.kinds || []).slice(0, 5).map(k => k[0] + ' ' + Math.round(k[1] * 100) + '%').join(', '));
  all.top += top / n; all.eff += eff / n; all.big += big / n; all.n++;
}
console.log('AVERAGE over', all.n, 'ponds: biggest silhouette', Math.round(100 * all.top / all.n) + '%', '| effective silhouettes', (all.eff / all.n).toFixed(1), '| silhouettes over 10%:', (all.big / all.n).toFixed(1));
