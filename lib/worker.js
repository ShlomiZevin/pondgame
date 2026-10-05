// Runs the real Primordia simulation for a saved pond, in its own thread so a long catch-up never blocks the server.
// Input (workerData): { save, seconds, maxGens }.  Output (postMessage): { save, report } or { error }.
'use strict';
const { parentPort, workerData } = require('worker_threads');
const vm = require('vm');
const fs = require('fs');
const path = require('path');

function load() {
  let captured = null;
  const ctx = vm.createContext({ console, performance, Date, Math, JSON, Float32Array, Int16Array, Int32Array, Array, Object, Map, Set, Promise, setTimeout, clearTimeout });
  ctx.window = ctx;
  ctx.addEventListener = () => {};
  ctx.Plaxzy = { save: { set(d) { captured = JSON.parse(JSON.stringify(d)); }, load() {} } };
  for (const f of ['10_core.js', '20_genome.js', '21_form.js', '30_world.js', '40_words.js', '41_look.js', '43_why.js', '44_pressure.js', '45_organs.js', '45_parts.js', '45_plans.js', '46_events.js', '47_story.js', '48_judge.js', '49_eras.js', '80_save.js']) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'sim', f), 'utf8'), ctx, { filename: f });
  }
  vm.runInContext('G.hints = {}; G.R = {}; G.mode = "play";', ctx);
  return { ctx, take: () => captured };
}

function advance({ save, seconds, maxGens }) {
  const { ctx, take } = load();
  const G = ctx.G;
  if (!G.validSave(save)) return { error: 'bad_save' };
  G.applySave(save);
  const W = G.W;
  const gen0 = W.gen, sp0 = new Set(W.species.map((s) => s.id)), disc0 = W.discLog.length;
  const maxSteps = Math.round(Math.max(0, seconds) / 0.1);
  const stopGen = gen0 + (maxGens || 150);
  let steps = 0;
  while (steps < maxSteps && W.gen < stopGen && !W.extinct) { G.step(0.1); steps++; }
  G.saveNow();
  const out = take();
  if (!out) return { error: 'no_save' };
  const last = W.hist.length ? W.hist[W.hist.length - 1] : null;
  const report = {
    gens: W.gen - gen0, simSeconds: Math.round(steps * 0.1), asked: Math.round(seconds), alive: W.cre.length, extinct: !!W.extinct,
    fitness: last ? +last.avg.toFixed(3) : 0,
    newSpecies: W.species.filter((s) => !sp0.has(s.id)).length,
    diedOut: W.species.filter((s) => s.extinct && s.diedGen > gen0).length,
    discoveries: W.discLog.slice(disc0).map((d) => d.text).slice(0, 8),
  };
  return { save: out, report };
}

try { parentPort.postMessage(advance(workerData)); }
catch (err) { parentPort.postMessage({ error: 'sim_failed: ' + err.message }); }
