// Tries candidate models on the real "thing" prompt: speed, and whether the answer is usable.
//   node scripts/bench.js [model ids...]
'use strict';
const { loadEnv } = require('../server'); loadEnv();
const { anthropicCaller, openaiCaller, cleanThing, extractJson } = require('../lib/ai');
const fs = require('fs'), path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'lib', 'ai.js'), 'utf8');
const SYSTEM = src.match(/const THING_SYSTEM = `([\s\S]*?)`;/)[1];
const ids = process.argv.slice(2);
(async () => {
  for (const id of ids) {
    const call = /^claude/.test(id) ? anthropicCaller(process.env.ANTHROPIC_API_KEY, id) : openaiCaller(process.env.OPENAI_API_KEY, id);
    const times = []; let good = 0, sample = null, err = '';
    for (const w of ['volcano', 'sad clown', 'bitcoin']) {
      const t = Date.now();
      try {
        const text = await call({ system: SYSTEM, user: 'The word: ' + JSON.stringify(w), temperature: 1, maxTokens: 700 });
        const thing = cleanThing(extractJson(text), w);
        if (thing) { good++; if (w === 'sad clown') sample = thing; }
      } catch (e) { err = e.message.slice(0, 90); }
      times.push(Date.now() - t);
    }
    const avg = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
    console.log(id.padEnd(28), (good + '/3').padEnd(5), (avg + ' ms').padEnd(9), err || (sample ? sample.name + ': "' + sample.note.slice(0, 70) + '"' + (sample.svg ? '' : '  (no picture)') : ''));
  }
})();
