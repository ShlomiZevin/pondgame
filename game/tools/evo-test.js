// THE TEST: from a circle, does beauty rise generation by generation?  node tools/evo-test.js [generations] [seeds]
const fs = require('fs'), path = require('path'), vm = require('vm');
global.window = globalThis; globalThis.addEventListener = () => {};
const src = path.join(__dirname, '..', 'src');
for (const f of ['10_core.js', '20_genome.js', '21_form.js', '21b_body.js', '21c_taste.js', '30_world.js', '40_words.js', '41_look.js', '43_why.js', '44_pressure.js', '45_organs.js', '45_parts.js', '45_plans.js', '46_events.js', '53_fields.js', '47_story.js', '48_judge.js', '49_eras.js']) vm.runInThisContext(fs.readFileSync(path.join(src, f), 'utf8'), { filename: f });
const gens = +process.argv[2] || 300, seeds = (process.argv[3] || '11,23,57').split(',').map(Number), step = Math.max(10, Math.round(gens / 10));
for (const seed of seeds) {
  G.newWorld({ seed }); G.founderPond();
  let last = 0; const line = [];
  while (G.W.gen <= gens && !G.W.extinct) {
    G.step(0.1);
    if (G.W.gen !== last) { last = G.W.gen; if (last === 1 || last % step === 0) { const cre = G.W.cre; let s = 0, t = 0, busy = 0, parts = 0, m = 0, wh = 0, es = 0, hd = 0, sm = 0, sz = 0; for (const c of cre) { es += c.g.f.es; hd += c.g.f.hd; sm += c.g.f.sm; sz += c.ph.r; wh += c.ph.whole; s += c.ph.charm; t = Math.max(t, c.ph.charm); busy += G.body.busy(c.g.f); parts += c.g.f.rules.length; m += c.g.f.bd.m.length; } const n = cre.length || 1; line.push('g' + String(last).padEnd(4) + ' beauty ' + (s / n * 10).toFixed(1) + ' (best ' + (t * 10).toFixed(1) + ') · whole ' + (wh / n * 10).toFixed(1) + ' · to look at ' + (busy / n).toFixed(1) + ' · growths ' + (parts / n).toFixed(1) + ' · masses ' + (m / n).toFixed(1) + ' · kinds ' + G.W.species.filter((q) => !q.extinct).length + ' · eyes ' + (es / n).toFixed(2) + ' head ' + (hd / n).toFixed(2) + ' smile ' + (sm / n).toFixed(2) + ' size ' + (sz / n).toFixed(1) + ' · pop ' + cre.length); } }
  }
  console.log('seed ' + seed + (G.W.extinct ? ' EXTINCT gen ' + G.W.gen : '') + '\n   ' + line.join('\n   '));
  console.log('   now: ' + (G.W.kinds || []).slice(0, 4).map((k) => k[0] + ' ' + Math.round(k[1] * 100) + '%').join(', '));
}
