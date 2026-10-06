// What becomes of a marvel in a living pond: how many carry it 5, 15, 30, 60 and 100 generations after it is given.  node tools/marvel-spread.js [ids] [seeds]
const fs = require('fs'), path = require('path'), vm = require('vm');
global.window = globalThis; globalThis.addEventListener = () => {};
const src = path.join(__dirname, '..', 'src');
for (const f of ['10_core.js', '20_genome.js', '21_form.js', '21b_body.js', '21c_taste.js', '30_world.js', '40_words.js', '41_look.js', '43_why.js', '44_pressure.js', '45_organs.js', '45_parts.js', '45_plans.js', '46_events.js', '46b_marvels.js', '47_story.js', '48_judge.js', '49_eras.js']) vm.runInThisContext(fs.readFileSync(path.join(src, f), 'utf8'), { filename: f });
const ids = (process.argv[2] || '1,3,4,6,9').split(',').map(Number), seeds = (process.argv[3] || '5,11,23,57').split(',').map(Number), rows = [], res = { gone: 0, common: 0, some: 0 };
for (const id of ids) for (const seed of seeds) {
  G.newWorld({ seed }); G.founderPond(); G.mode = 'play'; G.on('marvel', () => {});
  while (G.W.gen < 30) G.step(0.1);
  const orig = G.marvelTick; let done = false; G.marvelTick = function (gen) { orig(gen); if (!done) { done = true; G.grantMarvel(id); } };      // given where the game gives it: at the end of autumn
  while (!done && G.W.gen < 60) G.step(0.1);
  const g0 = G.W.gen, out = []; let last = g0, mx = 0, end = 0;
  while (G.W.gen < g0 + 100 && !G.W.extinct) { G.step(0.1); if (G.W.gen !== last) { last = G.W.gen; const d = last - g0, n = G.W.cre.filter((c) => c.g.mv === id).length; mx = Math.max(mx, n / Math.max(1, G.W.cre.length)); end = n; if (d === 5 || d === 15 || d === 30 || d === 60 || d === 100) out.push(n + '/' + G.W.cre.length); } }
  res[end === 0 ? 'gone' : mx > 0.4 ? 'common' : 'some']++;
  rows.push(G.MARVELS[id - 1].name.slice(0, 14).padEnd(14) + ' seed ' + String(seed).padEnd(3) + ' carriers at +5,+15,+30,+60,+100: ' + out.join('  ') + (G.W.extinct ? ' EXTINCT' : ''));
}
console.log(rows.join('\n') + '\nin the end: gone ' + res.gone + ', a few ' + res.some + ', common (more than 40% at some point) ' + res.common);
