// does the pond visibly answer what is done to it, and how fast?  node tools/react-test.js [seed]
const fs = require('fs'), path = require('path'), vm = require('vm');
global.window = globalThis; globalThis.addEventListener = () => {};
const src = path.join(__dirname, '..', 'src');
for (const f of ['10_core.js', '20_genome.js', '21_form.js', '21b_body.js', '21c_taste.js', '30_world.js', '40_words.js', '41_look.js', '43_why.js', '44_pressure.js', '45_organs.js', '45_parts.js', '45_plans.js', '46_events.js', '53_fields.js', '47_story.js', '48_judge.js', '49_eras.js']) vm.runInThisContext(fs.readFileSync(path.join(src, f), 'utf8'), { filename: f });
const seed = +process.argv[2] || 11;
const pct = (f) => Math.round(100 * G.W.cre.filter(f).length / (G.W.cre.length || 1)) + '%';
const avg = (f) => (G.W.cre.reduce((a, c) => a + f(c), 0) / (G.W.cre.length || 1));
const hd = (a, b) => { let d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; };
const CASES = [
  ['a lasting cold', (W) => { W.set.temp = -0.8; }, () => 'fur or feathers ' + pct(c => c.g.f.coat >= 2) + ' · plumpness ' + avg(c => c.ph.plump).toFixed(2) + ' · still freezing ' + pct(c => c.chill > 0.05)],
  ['a lasting heat', (W) => { W.set.temp = 0.8; }, () => 'bare skin ' + pct(c => c.g.f.coat === 0) + ' · plumpness ' + avg(c => c.ph.plump).toFixed(2) + ' · still too hot ' + pct(c => c.hot > 0.05)],
  ['a lasting dark', (W) => { W.set.light = 0.35; }, () => 'eye size ' + avg(c => c.g.f.es).toFixed(2) + ' · with eyes ' + pct(c => c.g.f.en > 0) + ' · glowing ' + pct(c => c.g.f.glow > 0.3)],
  ['three green hunters (eat creatures)', (W) => { for (let i = 0; i < 3; i++) G.addZone(W.ww * (0.25 + 0.25 * i), W.wh * 0.55, { name: 'Green Hunter', props: { eats: 0.7, moves: 0.5 }, alive: 0.9, hue: 120, radius: 90, life: 200, weak: 4, source: 'table' }); }, () => 'colour distance from the hunter ' + Math.round(avg(c => hd(c.g.f.hue, 120))) + '° · looks like it (within 40°) ' + pct(c => hd(c.g.f.hue, 120) < 40) + ' · armoured ' + pct(c => c.ph.defense > 0.3) + ' · size ' + avg(c => c.ph.r).toFixed(1) + ' · hunters left ' + G.W.zones.length],
  ['a poisoned pond', (W) => { W.mods.push({ until: W.t + 1e6, name: 'poison', poison: 0.5, temp: 0, light: 0, food: 1, mutate: 1, fx: '', hue: 95 }); }, () => 'scales ' + pct(c => c.g.f.coat === 1) + ' · shell ' + pct(c => c.g.f.shell > 0.25) + ' · poison-proof ' + pct(c => c.ph.res[2] > 0.5) + ' · still sick ' + pct(c => c.pois > 0.3)],
];
for (const [name, apply, read] of CASES) {
  G.newWorld({ seed }); G.founderPond();
  G.natureTick = null;                                  // only the thing being tested happens
  while (G.W.gen < 50 && !G.W.extinct) G.step(0.1);
  console.log('\n' + name.toUpperCase());
  console.log('  before        pop ' + String(G.W.cre.length).padStart(3) + ' | ' + read());
  apply(G.W);
  for (const at of [8, 20, 45]) { const until = 50 + at; while (G.W.gen < until && !G.W.extinct) G.step(0.1); console.log('  +' + String(at).padStart(2) + ' generations pop ' + String(G.W.cre.length).padStart(3) + ' | ' + read() + (G.W.extinct ? '  EXTINCT' : '')); if (G.W.extinct) break; }
}
