// do bodies keep advancing over a long run?  node tools/long-test.js [generations] [seed,seed...] [every]
const fs = require('fs'), path = require('path'), vm = require('vm');
global.window = globalThis; globalThis.addEventListener = () => {};
const src = path.join(__dirname, '..', 'src');
for (const f of ['10_core.js', '20_genome.js', '21_form.js', '21b_body.js', '21c_taste.js', '30_world.js', '40_words.js', '43_why.js', '44_pressure.js', '45_organs.js', '45_parts.js', '45_plans.js', '46_events.js', '47_story.js', '48_judge.js', '49_eras.js']) vm.runInThisContext(fs.readFileSync(path.join(src, f), 'utf8'), { filename: f });
const gens = +process.argv[2] || 420, seeds = (process.argv[3] || '11,23').split(',').map(Number), every = +process.argv[4] || 70;
for (const seed of seeds) {
  G.newWorld({ seed }); G.founderPond(); let next = every; const t0 = Date.now();
  while (G.W.gen <= gens && !G.W.extinct) {
    G.step(0.1);
    if (G.W.gen >= next) {
      const c = G.W.cre, n = c.length || 1; let s = 0, r = 0, z = 0, b = 0, nest = 0, coat = 0, neck = 0, mx = 0, cx = 0;
      for (const x of c) { const f = x.g.f; s += f.n; mx = Math.max(mx, f.n); r += f.rules.length; z += x.ph.r; b += x.g.h; nest += f.rules.some(q => q.on >= 0) ? 1 : 0; coat += f.coat ? 1 : 0; neck += f.nk > 0.35 && f.n > 1 && !f.sym ? 1 : 0; cx += f.n + f.rules.length + f.rules.filter(q => q.on >= 0).length + (f.coat ? 1 : 0) + (f.nk > 0.35 ? 1 : 0) + f.en * 0.5; }
      const p = v => Math.round(100 * v / n) + '%';
      console.log('seed', seed, 'gen', String(G.W.gen).padStart(3), 'pop', String(c.length).padStart(3), '| segs', (s / n).toFixed(1), 'max', mx, '| growths', (r / n).toFixed(1), '| size', (z / n).toFixed(0), '| brain', (b / n).toFixed(1), '| part-on-part', p(nest), 'coat', p(coat), 'neck', p(neck), '| complexity', (cx / n).toFixed(1), '| ages', G.W.ages.length, '|', (G.W.kinds || []).slice(0, 3).map(k => k[0] + ' ' + Math.round(k[1] * 100) + '%').join(', '));
      next += every;
    }
  }
  console.log('  seed', seed, G.W.extinct ? 'EXTINCT at gen ' + G.W.gen : 'alive', Math.round((Date.now() - t0) / 1000) + 's', '| parts:', G.W.designs.map(d => d.name).join(', '));
}
