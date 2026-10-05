// Tries the REAL models with the REAL prompts and says honestly how it went:   npm run real
// Needs ANTHROPIC_API_KEY and/or OPENAI_API_KEY (in the environment, or in primordia-server/.env.local).
'use strict';
const path = require('path');
const fs = require('fs');
const os = require('os');
const { loadEnv } = require('../server');
loadEnv();
const { createAi, modelsFromEnv } = require('../lib/ai');
const { createStore } = require('../lib/store');
const { createOffline } = require('../lib/offline');

const real = modelsFromEnv();
if (!Object.keys(real).length) { console.error('No API key. Put ANTHROPIC_API_KEY=... and/or OPENAI_API_KEY=... in primordia-server/.env.local or the environment.'); process.exit(2); }

const WORDS = ['volcano', 'honey', 'soap', 'sad clown', 'moon', 'grandma', 'bitcoin', 'banana', 'black hole', 'glitter', 'zxqwv', 'shalom'];
let calls = 0, ms = 0;
const errors = [];
const models = {};
for (const id of Object.keys(real)) {
  models[id] = { label: real[id].label, call: async (q) => { const t = Date.now(); calls++; try { return await real[id].call(q); } finally { ms += Date.now() - t; } } };
}
const ai = createAi({ store: createStore(fs.mkdtempSync(path.join(os.tmpdir(), 'primordia-real-'))), models, defaultModel: process.env.PRIMORDIA_MODEL, offline: createOffline() });
const short = (p) => Object.entries(p).filter(([, v]) => Math.abs(v) > 0.05).map(([k, v]) => k + ' ' + v.toFixed(2)).join(', ');
const onError = (e) => errors.push(e.message);

(async () => {
  let bad = 0;
  console.log('models:', ai.models().map((m) => m.label).join(', '), '\ndefault:', ai.defaultModel, '\n');
  for (const w of WORDS) {
    const r = await ai.thing(w, { onError });
    const t = r.thing;
    if (!t) { bad++; console.log('FAIL', w, JSON.stringify(r)); continue; }
    const fromModel = t.source === 'ai';
    if (!fromModel) bad++;
    console.log((fromModel ? 'ok  ' : 'FELL BACK ') + w.padEnd(11) + '→ ' + t.name.padEnd(24) + ' [' + short(t.props) + ']  svg ' + (t.svg ? t.svg.length + ' chars' : 'NONE') + '\n      "' + t.note + '"');
  }
  // the same word twice should not be identical
  const a = await ai.thing('honey', { onError }), b = await ai.thing('honey', { onError });
  const differ = JSON.stringify(a.thing.props) !== JSON.stringify(b.thing.props);
  console.log('\nsame word twice differs:', differ ? 'yes  (' + a.thing.name + ' / ' + b.thing.name + ')' : 'NO'); if (!differ) bad++;
  const refused = await ai.thing('nazi');
  console.log('unfriendly word refused:', refused.error === 'refused' ? 'yes' : 'NO'); if (refused.error !== 'refused') bad++;
  const ideas = await ai.ideas({ gen: 40, species: [{ name: 'Limbed Glimling Drifter', n: 80 }, { name: 'Tiny Bloopox Nibbler', n: 35 }] }, { onError });
  console.log('\nmutation ideas (' + ideas.source + '): ' + ideas.ideas.map((i) => i.name + (i.segs ? ' [body]' : '') + (i.parts ? ' [parts]' : '') + (i.chem ? ' [chem]' : '')).join(' · '));
  if (ideas.source !== 'ai' || ideas.ideas.length < 3) bad++;
  // every model on the menu must really answer, for both jobs
  console.log('\neach model on the menu, the same word ("jellyfish") and mutation ideas:');
  for (const m of ai.models()) {
    const r = await ai.thing('jellyfish', { model: m.id, onError });
    const ok = r.thing && r.thing.source === 'ai' && r.thing.model === m.id;
    const id = await ai.ideas({ gen: 12, species: [{ name: 'Glowing Nimlet Wiggler', n: 60 }] }, { model: m.id, onError });
    const ok2 = id.source === 'ai' && id.ideas.length >= 3;
    if (!ok || !ok2) bad++;
    console.log('  ' + (ok && ok2 ? 'ok   ' : 'FAIL ') + m.label.padEnd(18) + (r.thing ? r.thing.name.padEnd(22) + ' [' + short(r.thing.props) + ']' : JSON.stringify(r)) + '  · ideas: ' + id.ideas.length + ' (' + id.source + ')');
  }
  console.log('\n' + calls + ' model calls, average ' + Math.round(ms / Math.max(1, calls)) + ' ms');
  if (errors.length) console.log('model errors:', [...new Set(errors)].join(' | '));
  console.log(bad ? bad + ' PROBLEM(S)' : 'ALL GOOD');
  process.exit(bad ? 1 : 0);
})().catch((e) => { console.error('FAILED:', e.message); process.exit(1); });
