// The game's own built-in answers (word table, mutation ideas), loaded from the same code the game uses.
// Used when there is no model, or the model fails.
'use strict';
const vm = require('vm');
const fs = require('fs');
const path = require('path');

function createOffline() {
  const ctx = vm.createContext({ console, performance, Date, Math, JSON, Float32Array, Int16Array, Int32Array, Promise, setTimeout, clearTimeout });
  ctx.window = ctx;
  ctx.addEventListener = () => {};
  for (const f of ['10_core.js', '20_genome.js', '21_form.js', '21b_body.js', '30_world.js', '40_words.js', '41_look.js', '43_why.js', '44_pressure.js', '45_organs.js', '45_parts.js', '45_plans.js', '46_events.js', '47_story.js', '48_judge.js', '49_eras.js']) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'sim', f), 'utf8'), ctx, { filename: f });
  }
  const G = ctx.G;
  G.ai.provider = 'offline';
  return function offline(task, input) { return G.ai.ask(task, input).then((v) => JSON.parse(JSON.stringify(v))); };
}
module.exports = { createOffline };
