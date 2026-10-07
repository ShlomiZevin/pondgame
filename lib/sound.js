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

  // a line spoken aloud, with Leonardo's speech model (dialogue-v3). It is dear (about $0.13 a line when tried on 2026-10-06), so every
  // line is kept for good and shared by all players: the same words in the same voice are paid for once.
  const VOICE = { sweet: 'pFZP5JQG7iQjIQuC4Bku', bright: 'cgSgspJ2msm6clMCkdW9', cheeky: 'IKne3meq5aSn9XLyUdCD', gruff: 'pqHfZKP75CvOlQylNhV4', wise: 'JBFqnCBsd6RMkjVDRZzb', tiny: 'Xb7hH8MSUJpSbSDYk0k2' };
  async function speakNow(text, tone) {
    const res = await doFetch(API + '/v2/generations', { method: 'POST', headers: headers(), body: JSON.stringify({ model: 'dialogue-v3', public: false, parameters: { prompt: text, voice_id: VOICE[tone] || VOICE.bright, language_code: 'en', prompt_influence: 0.5, quantity: 1 } }) });
    const json = await res.json().catch(() => null);
    const id = json && ((json.generate && json.generate.generationId) || json.generationId);
    if (!res.ok || !id) throw new Error('leonardo rejected the speech (HTTP ' + res.status + ')');
    const usd = parseFloat((json.generate && json.generate.cost && json.generate.cost.amount) || '0') || 0;
    meterUsd('leonardo-dialogue-v3', usd);
    for (let i = 0; i < 30; i++) {
      await sleep(1500);
      const p = await doFetch(API + '/v1/generations/' + id, { headers: headers() });
      const j = await p.json().catch(() => null), gen = j && (j.generations_by_pk || j.generation || j);
      if (gen && gen.status === 'FAILED') throw new Error('leonardo refused this speech');
      const url = findAudioUrl(gen); if (!url) continue;
      const a = await doFetch(encodeURI(url), { headers: { 'user-agent': 'Mozilla/5.0' } });
      if (!a.ok) throw new Error('could not download the speech (HTTP ' + a.status + ')');
      const buf = Buffer.from(await a.arrayBuffer());
      if (buf.length < 512 || buf.length > MAX_BYTES) throw new Error('the speech was empty or too big');
      const ext = (url.split('?')[0].match(/\.(mp3|wav|ogg|m4a)$/i) || [0, 'mp3'])[1].toLowerCase();
      return { mime: ext === 'wav' ? 'audio/wav' : ext === 'ogg' ? 'audio/ogg' : ext === 'm4a' ? 'audio/mp4' : 'audio/mpeg', b64: buf.toString('base64'), usd };
    }
    throw new Error('leonardo took too long');
  }
  return {
    /** { sound, source } or { error }: these words, said in this tone */
    async speak(text, tone, opts) {
      opts = opts || {};
      text = String(text || '').replace(/[^A-Za-z!?', .-]/g, '').trim().slice(0, 40); tone = VOICE[tone] ? tone : 'bright';
      if (text.length < 2) return { error: 'empty' };
      const words = norm(text.replace(/[!?',.]/g, (ch) => ({ '!': ' x', '?': ' q' }[ch] || ''))), k = 'say ' + tone + ' ' + words;
      const hit = store.get('sound', k);
      if (hit && hit.b64) return { sound: hit, source: 'cache' };
      // the repository of spoken lines: the same words already said in another voice will do (the game plays them at the creature's own speed)
      for (const other of Object.keys(VOICE)) { if (other === tone) continue; const h2 = store.get('sound', 'say ' + other + ' ' + words); if (h2 && h2.b64) return { sound: h2, source: 'cache', borrowed: other }; }
      if (opts.libraryOnly) return { error: 'no_line_yet' };      // asked only for what is already kept: nothing is made, nothing is paid
      if (!key) return { error: 'no_sound' };
      if (opts.canGenerate && !opts.canGenerate()) return { error: 'slow_down' };
      if (busy.has(k)) return busy.get(k);
      const job = speakNow(text, tone).then((s) => { const usd = s.usd; delete s.usd; store.set('sound', k, s); return { sound: s, source: 'leonardo', usd }; }, (err) => { if (opts.onError) opts.onError(err); return { error: 'failed' }; });
      busy.set(k, job); job.finally(() => busy.delete(k));
      return job;
    },
    /** up to n lines the repository already holds a real voice for, short ones first (those are the ones the game speaks for real), in random order */
    lines(n) {
      const seen = {}, out = [];
      for (const k of store.keys('sound')) {
        const m = /^say_[a-z]+_(.+)$/.exec(k); if (!m) continue;
        let t = m[1], end = '.'; if (/_x$/.test(t)) { end = '!'; t = t.slice(0, -2); } else if (/_q$/.test(t)) { end = '?'; t = t.slice(0, -2); }
        t = t.replace(/_+/g, ' ').trim(); if (t.length < 2 || seen[t] || / [xq] /.test(' ' + t + ' ') || /(cant|dont|im|its|wont)/.test(t)) continue; seen[t] = 1;      /* lines whose inner marks were lost in the key are left out */
        out.push(t.charAt(0).toUpperCase() + t.slice(1) + end);
      }
      for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)), x = out[i]; out[i] = out[j]; out[j] = x; }
      const short = out.filter((t) => t.length <= 12), rest = out.filter((t) => t.length > 12);
      return short.concat(rest).slice(0, n || 10);
    },
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
