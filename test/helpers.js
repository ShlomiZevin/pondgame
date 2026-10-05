// Test helpers: a real Primordia save made by the real simulation, and a fake model.
'use strict';
const vm = require('vm');
const fs = require('fs');
const path = require('path');
const os = require('os');

function makeSave(gens = 3, seed = 7) {
  let captured = null;
  const ctx = vm.createContext({ console, performance, Date, Math, JSON, Float32Array, Int16Array, Int32Array, Promise, setTimeout, clearTimeout });
  ctx.window = ctx; ctx.addEventListener = () => {};
  ctx.Plaxzy = { save: { set(d) { captured = JSON.parse(JSON.stringify(d)); }, load() {} } };
  for (const f of ['10_core.js', '20_genome.js', '21_form.js', '30_world.js', '40_words.js', '41_look.js', '43_why.js', '44_pressure.js', '45_organs.js', '45_parts.js', '46_events.js', '47_story.js', '48_judge.js', '49_eras.js', '80_save.js']) vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'sim', f), 'utf8'), ctx, { filename: f });
  vm.runInContext('G.hints = {}; G.R = {}; G.mode = "play";', ctx);
  const G = ctx.G;
  G.newWorld({ seed }); G.founderPond();
  while (G.W.gen < gens + 1) G.step(0.1);
  G.saveNow();
  return captured;
}

function tmpDir() { return fs.mkdtempSync(path.join(os.tmpdir(), 'primordia-test-')); }

const GOOD_THING = JSON.stringify({
  name: 'Glow Jelly', props: { nutrition: 0.6, poison: 0, heat: 0.1, light: 0.8, sticky: 0.2, acid: 0, hard: 0, spread: 0.1 },
  tag: 3, hue: 190, shape: 2, radius: 90, life: 130, note: 'A glowing snack that lights up the water.',
  svg: '<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="18" fill="#7cf"/><script>alert(1)</script></svg>',
});
const GOOD_IDEAS = JSON.stringify([
  { name: 'Pair of arms', segs: [{ p: -1, a: 1.3, d: 1.1, s: 0.4, n: 2, m: 1 }] },
  { name: 'Big eye', parts: [{ k: 4, a: 0, s: 1.5, on: -1 }] },
  { name: 'Wild', parts: [{ k: 99, a: 0, s: 9 }], size: 50 },
]);

/** A fake model that answers by the kind of question, and counts its calls. */
function fakeModel() {
  const f = async ({ system }) => { f.calls++; return /JSON array/.test(system) ? GOOD_IDEAS : 'Here you go: ' + GOOD_THING; };
  f.calls = 0;
  return f;
}
module.exports = { makeSave, tmpDir, fakeModel, GOOD_THING };
