// A sound of its own for each thing a player adds, made with Leonardo's sound-effects model.
// OFF unless LEONARDO_API_KEY is set. One sound per word, kept for good, so each word is paid for once.
// The call follows Plaxzy's own Leonardo code: queue on v2, poll v1 until COMPLETE, download with a browser user-agent.
'use strict';
const { meterUsd } = require('./ai');
const API = 'https://cloud.leonardo.ai/api/rest';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const MAX_BYTES = 400 * 1024;

/** the first audio link anywhere in a response whose exact shape is not documented */
function findAudioUrl(o, depth) {
  if (!o || (depth || 0) > 6) return null;
  if (typeof o === 'string') return /^https?:\/\/\S+\.(mp3|wav|ogg|m4a)(\?\S*)?$/i.test(o) ? o : null;
  if (typeof o !== 'object') return null;
  for (const k of Object.keys(o)) { const u = findAudioUrl(o[k], (depth || 0) + 1); if (u) return u; }
  return null;
}

function createSounds({ store, apiKey, fetchImpl }) {
  const key = apiKey !== undefined ? apiKey : process.env.LEONARDO_API_KEY;
  const doFetch = fetchImpl || fetch;
  const headers = () => ({ authorization: 'Bearer ' + key, accept: 'application/json', 'content-type': 'application/json' });
  const norm = (w) => String(w || '').toLowerCase().replace(/[^a-z0-9 \-]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 40);
  const busy = new Map();

  async function generate(name, note) {
    const prompt = 'A short, soft, cute game sound effect for "' + name + '" dropping into a pond of tiny creatures. ' + String(note || '').slice(0, 120) + ' Underwater feel. No voice, no music.';
    const res = await doFetch(API + '/v2/generations', { method: 'POST', headers: headers(), body: JSON.stringify({ model: 'sound-effects-v2', public: false, parameters: { prompt, duration: 3, prompt_influence: 0.7, loop: false, quantity: 1 } }) });
    const json = await res.json().catch(() => null);
    const id = json && ((json.generate && json.generate.generationId) || json.generationId || (json.sdGenerationJob && json.sdGenerationJob.generationId));
    if (!res.ok || !id) throw new Error('leonardo rejected the request (HTTP ' + res.status + ')');
    // Leonardo bills when the job is queued, and says the price
    const usd = parseFloat((json.generate && json.generate.cost && json.generate.cost.amount) || '0') || 0;
    meterUsd('leonardo-sound-effects-v2', usd);
    for (let i = 0; i < 30; i++) {
      await sleep(2000);
      const p = await doFetch(API + '/v1/generations/' + id, { headers: headers() });
      const j = await p.json().catch(() => null);
      const gen = j && (j.generations_by_pk || j.generation || j);
      const status = gen && gen.status;
      if (status === 'FAILED') throw new Error('leonardo refused this sound');
      if (status === 'COMPLETE' || findAudioUrl(gen)) {
        const url = findAudioUrl(gen);
        if (!url) throw new Error('leonardo finished but returned no audio');
        const a = await doFetch(encodeURI(url), { headers: { 'user-agent': 'Mozilla/5.0' } });
        if (!a.ok) throw new Error('could not download the sound (HTTP ' + a.status + ')');
        const buf = Buffer.from(await a.arrayBuffer());
        if (buf.length < 512 || buf.length > MAX_BYTES) throw new Error('the sound was empty or too big');
        const ext = (url.split('?')[0].match(/\.(mp3|wav|ogg|m4a)$/i) || [0, 'mp3'])[1].toLowerCase();
        return { mime: ext === 'wav' ? 'audio/wav' : ext === 'ogg' ? 'audio/ogg' : ext === 'm4a' ? 'audio/mp4' : 'audio/mpeg', b64: buf.toString('base64'), usd };
      }
    }
    throw new Error('leonardo took too long');
  }

  return {
    enabled: () => !!key,
    /** { sound: { mime, b64 }, source } or { error } */
    async forWord(name, note, opts) {
      opts = opts || {};
      const k = norm(name);
      if (!k) return { error: 'empty' };
      const hit = store.get('sound', k);
      if (hit && hit.b64) return { sound: hit, source: 'cache' };
      if (!key) return { error: 'no_sound' };
      if (opts.canGenerate && !opts.canGenerate()) return { error: 'slow_down' };
      if (busy.has(k)) return busy.get(k);
      const job = generate(name, note).then((s) => { const usd = s.usd; delete s.usd; store.set('sound', k, s); return { sound: s, source: 'leonardo', usd }; }, (err) => { if (opts.onError) opts.onError(err); return { error: 'failed' }; });
      busy.set(k, job);
      job.finally(() => busy.delete(k));
      return job;
    },
  };
}
module.exports = { createSounds, findAudioUrl };
