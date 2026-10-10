// the sound module against a fake Leonardo (shape per Plaxzy's own client)
const test = require('node:test'), assert = require('node:assert/strict');
const { createSounds, findAudioUrl } = require('../lib/sound');
const { createStore } = require('../lib/store');
const os = require('os'), fs = require('fs'), path = require('path');
test('sound: off without a key; made once per word with one; link found anywhere', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ps-'));
  assert.equal((await createSounds({ store: createStore(dir), apiKey: '' }).forWord('honey')).error, 'no_sound');
  assert.equal(findAudioUrl({ a: [{ b: { url: 'https://cdn.x/abc.mp3?x=1' } }] }), 'https://cdn.x/abc.mp3?x=1');
  let posts = 0;
  const fake = async (url, init) => {
    if (init && init.method === 'POST') { posts++; return { ok: true, status: 200, json: async () => ({ generate: { generationId: 'g1' } }) }; }
    if (/v1\/generations/.test(url)) return { ok: true, json: async () => ({ generations_by_pk: { status: 'COMPLETE', generated_audio: [{ url: 'https://cdn.x/s.mp3' }] } }) };
    return { ok: true, arrayBuffer: async () => new Uint8Array(2048).buffer };
  };
  const s = createSounds({ store: createStore(dir), apiKey: 'k', fetchImpl: fake });
  const a = await s.forWord('Honey', 'sweet');
  assert.equal(a.source, 'leonardo'); assert.equal(a.sound.mime, 'audio/mpeg'); assert.ok(a.sound.b64.length > 100);
  const b = await s.forWord('honey');
  assert.equal(b.source, 'cache'); assert.equal(posts, 1);
});
test('sound: the moments of a star and its air are asked for by name only, made once, and free ever after', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ps-')), bodies = [];
  const fake = async (url, init) => {
    if (init && init.method === 'POST') { bodies.push(JSON.parse(init.body)); return { ok: true, status: 200, json: async () => ({ generate: { generationId: 'g1', cost: { amount: '0.009' } } }) }; }
    if (/v1\/generations/.test(url)) return { ok: true, json: async () => ({ generations_by_pk: { status: 'COMPLETE', generated_audio: [{ url: 'https://cdn.x/s.mp3' }] } }) };
    return { ok: true, arrayBuffer: async () => new Uint8Array(2048).buffer };
  };
  const s = createSounds({ store: createStore(dir), apiKey: 'k', fetchImpl: fake });
  assert.ok(s.fxNames().indexOf('liftoff') >= 0 && s.fxNames().indexOf('amb.frost') >= 0);
  assert.equal((await s.forFx('anything else')).error, 'empty'); assert.equal((await s.forFx('built', { libraryOnly: true })).error, 'not_made'); assert.equal(bodies.length, 0);
  const a = await s.forFx('built'); assert.equal(a.source, 'leonardo'); assert.equal(a.usd, 0.009); assert.equal(a.sound.loop, false); assert.match(bodies[0].parameters.prompt, /finished/); assert.equal(bodies[0].parameters.loop, false);
  const b = await s.forFx('built', { libraryOnly: true }); assert.equal(b.source, 'cache'); assert.equal(bodies.length, 1);
  const c = await s.forFx('amb.frost'); assert.equal(c.sound.loop, true); assert.equal(bodies[1].parameters.loop, true); assert.equal(bodies[1].parameters.duration, 10); assert.match(bodies[1].parameters.prompt, /ice/);
  assert.equal((await createSounds({ store: createStore(dir), apiKey: '' }).forFx('raid')).error, 'no_sound');
});
