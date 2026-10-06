// Marvels: how often they come, and that every one of them works.  node tools/marvel-test.js
const fs = require('fs'), path = require('path'), vm = require('vm');
global.window = globalThis; globalThis.addEventListener = () => {};
const src = path.join(__dirname, '..', 'src');
for (const f of ['10_core.js', '20_genome.js', '21_form.js', '21b_body.js', '21c_taste.js', '30_world.js', '40_words.js', '41_look.js', '43_why.js', '44_pressure.js', '45_organs.js', '45_parts.js', '45_plans.js', '46_events.js', '46b_marvels.js', '47_story.js', '48_judge.js', '49_eras.js']) vm.runInThisContext(fs.readFileSync(path.join(src, f), 'utf8'), { filename: f });
// 1. how many generations until one (by generations only: never within 40 of the last)
function wait() { const out = []; for (let t = 0; t < 4000; t++) { let since = 40; for (;;) { since++; if (Math.random() < G.marvelChance(since)) break; if (since > 5000) break; } out.push(since); } out.sort((x, y) => x - y); return { median: out[2000], p10: out[400], p90: out[3600] }; }
const w = wait();
console.log('a marvel: median ' + w.median + ' generations after the last, 10% by ' + w.p10 + ', 90% by ' + w.p90 + ' (at 64x about 60 generations a minute, at 1x about one a minute)');
// 2. every built-in marvel, granted to a creature in a living pond, for 60 generations
let bad = 0;
for (const mv of G.MARVELS) {
  G.newWorld({ seed: 7 + mv.id }); G.founderPond(); G.mode = 'play';
  G.on('marvel', () => {});
  while (G.W.gen < 30) G.step(0.1);
  const before = G.W.cre.length; G.marvelTick = function () { G.marvelTick = null; G.grantMarvel(mv.id); };      // granted where the game grants it: at the end of autumn
  while (G.marvelTick && G.W.gen < 60) G.step(0.1);
  const holder = G.W.cre.filter((c) => c.g.mv === mv.id)[0];
  if (!holder) { console.log('FAIL: no creature got ' + mv.name); bad++; continue; }
  const rt = G.unpackGenome(G.packGenome(holder.g));
  let sawSay = false, sawFlame = false, burned = 0, healed = 0;
  const hid = holder.id;
  const g0 = G.W.gen; while (G.W.gen < g0 + 60 && !G.W.extinct) { G.step(0.1); const h = G.W.cre.find((c) => c.id === hid); if (h) { if (h.say) sawSay = true; if (h.flame > 0) sawFlame = true; } }
  const kids = G.W.cre.filter((c) => c.g.mv === mv.id).length;
  console.log(String(mv.id) + ' ' + mv.name.padEnd(20) + ' size ' + holder.ph.r.toFixed(1) + ' sense ' + holder.ph.sense.toFixed(0) + ' defense ' + holder.ph.defense.toFixed(2) + ' | saved ' + (rt && rt.mv === mv.id ? 'ok' : 'LOST') + ' | alive with it after 60 gens: ' + kids + (mv.sp === 'voice' ? ' | spoke ' + sawSay : '') + (mv.sp === 'fire' ? ' | flamed ' + sawFlame : '') + (G.W.extinct ? ' EXTINCT' : ''));
  if (!rt || rt.mv !== mv.id) bad++;
}
// 3. an invented marvel
{
  G.newWorld({ seed: 3 }); G.founderPond();
  const id = G.addMarvelDef({ name: 'Thunder Throat', wonder: 'Its voice shakes the water and fills it with fire.', special: 'voice', fx: { glow: 0.5, spike: 2 }, glyph: 'flame', hue: 20, words: ['BOOM', 'rrraa!', 'x<y'] });
  const d = G.marvelOf(id); console.log('invented: ' + JSON.stringify(d).slice(0, 220));
  if (!d || d.fx.spike > 0.9 || !d.words.length) { console.log('FAIL invented'); bad++; }
}
console.log(bad ? bad + ' PROBLEMS' : 'all marvels work');
