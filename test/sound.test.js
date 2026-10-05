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
