// Evolves several ponds with no AI (the game's own taste) and keeps a random sample of the creatures alive at several moments,
// as packed bodies: the kind of creature a real pond holds, not the best of them.  node scripts/taste2-gen.js [ponds] [per moment]
const fs = require('fs'), path = require('path'), vm = require('vm');
global.window = globalThis; globalThis.addEventListener = () => {};
const src = path.join(__dirname, '..', '..', 'plaxzy-creator', 'local-games', 'primordia', 'src');
for (const f of ['10_core.js', '20_genome.js', '21_form.js', '21b_body.js', '21c_taste.js', '30_world.js', '40_words.js', '41_look.js', '43_why.js', '44_pressure.js', '45_organs.js', '45_parts.js', '45_plans.js', '46_events.js', '47_story.js', '48_judge.js', '49_eras.js']) vm.runInThisContext(fs.readFileSync(path.join(src, f), 'utf8'), { filename: f });
const ponds = +process.argv[2] || 8, per = +process.argv[3] || 5, moments = [30, 60, 100, 150, 220];
const out = [];
for (let s = 1; s <= ponds; s++) {
  G.newWorld({ seed: 1000 + s * 17 }); G.founderPond(); let last = 0, mi = 0;
  while (G.W.gen <= moments[moments.length - 1] && !G.W.extinct) {
    G.step(0.1);
    if (G.W.gen !== last) { last = G.W.gen; if (mi < moments.length && last >= moments[mi]) { mi++; const pool = G.W.cre.filter((c) => c.g.f.bd); for (let k = 0; k < per && pool.length; k++) { const c = pool.splice(Math.floor(G.rand() * pool.length), 1)[0]; out.push({ pond: s, gen: last, pack: G.form.pack(c.g.f) }); } } }
  }
  process.stdout.write('pond ' + s + ' ');
}
fs.writeFileSync(path.join(__dirname, 'taste2-packs.json'), JSON.stringify(out));
console.log('\n' + out.length + ' creatures kept in scripts/taste2-packs.json');
