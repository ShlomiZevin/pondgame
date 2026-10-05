// The newer AI jobs on real models: organs, free-text events, the story.   node scripts/real-new.js [model id]
'use strict';
const { loadEnv } = require('../server'); loadEnv();
const { createAi, modelsFromEnv } = require('../lib/ai');
const { createStore } = require('../lib/store');
const { createOffline } = require('../lib/offline');
const os = require('os'), fs = require('fs'), path = require('path');
const ai = createAi({ store: createStore(fs.mkdtempSync(path.join(os.tmpdir(), 'pn-'))), models: modelsFromEnv(), offline: createOffline() });
const model = process.argv[2];
const onError = (e) => console.log('   MODEL ERROR:', e.message);
const fx = (o) => Object.entries(o.fx).filter(([, v]) => Math.abs(v) > 0.05).map(([k, v]) => k + ' ' + v.toFixed(2)).join(', ') + (o.digest >= 0 ? ', digest ' + o.digest : '');
(async () => {
  let bad = 0;
  const pond = { gen: 30, species: [{ name: 'Limbed Glimling Drifter', n: 80, about: 'Eats green food. Has an eye to spot food. Walks on 2 limbs.' }, { name: 'Tiny Bloopox Nibbler', n: 35, about: 'Eats gold food. Tiny.' }], things: ['Carnivorous Plant', 'Volcano'], water: { temperature: 0.4, light: 0.6, food: 1 }, have: ['Sun Leaf'] };
  console.log('ORGANS');
  for (let i = 0; i < 3; i++) {
    const r = await ai.organ(pond, { model, onError });
    if (r.source !== 'ai') bad++;
    console.log('  ' + r.source.padEnd(8) + r.organ.name.padEnd(22) + '[' + fx(r.organ) + ']  svg ' + (r.organ.svg || '').length + '\n      "' + r.organ.note + '"');
    if (i === 0 && r.organ.svg) fs.writeFileSync(path.join(os.tmpdir(), 'organ.svg'), r.organ.svg);
  }
  console.log('EVENTS');
  for (const t of ['an ice age', 'aliens abduct the biggest ones', 'a jellyfish invasion', 'everyone gets very sleepy', 'rain of chocolate']) {
    const r = await ai.event(t, { model, onError });
    if (r.source !== 'ai') bad++;
    const e = r.event;
    console.log('  ' + r.source.padEnd(8) + t.padEnd(32) + '→ ' + e.name + ' | kill ' + e.kill.share.toFixed(2) + ' ' + e.kill.who + ' | temp ' + e.temp + ' light ' + e.light + ' food ' + e.food + ' mutate ' + e.mutate + ' | ' + e.duration + 's' + (e.thing ? ' | leaves: ' + e.thing.name : '') + '\n      "' + e.note + '"');
  }
  console.log('STORY');
  const facts = { gen: 42, since: 34, changes: [{ what: '% with eyes', from: 12, to: 61 }, { what: 'food each creature finds', from: 140, to: 260 }, { what: '% living on light', from: 0, to: 18 }], species: pond.species, newOrgans: ['Sun Leaf'], discoveries: ['First eye! Something can really see.'], events: ['A great cold'], things: ['Carnivorous Plant'] };
  const s = await ai.story(facts, { model, onError });
  if (s.source !== 'ai') bad++;
  console.log('  ' + s.source + '  ' + s.story.title + '\n      "' + s.story.text + '"');
  console.log(bad ? bad + ' fell back to offline' : 'ALL FROM THE MODEL');
})();
