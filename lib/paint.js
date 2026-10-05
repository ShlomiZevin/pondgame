// A painting of each kind of creature, made by an image model from what the creature's genes really are.
// OFF unless LEONARDO_API_KEY is set. One painting per look, kept for good: the same look is never paid for twice,
// by anyone. The client sends plain facts about the body; the prompt is written here, so a client cannot ask for anything else.
// The call follows the sound module: queue on v2, poll v1 until COMPLETE, download with a browser user-agent.
'use strict';
const { meterUsd } = require('./ai');
const API = 'https://cloud.leonardo.ai/api/rest';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const MAX_BYTES = 900 * 1024;
// the one picture every painting must be: a lone creature on black, so the game can lift it off its background
const STYLE = 'Single creature only, whole body in frame, centered with a margin all round, seen from the side and facing right, a large expressive eye. ' +
  'Painterly digital illustration of a small otherworldly pond creature: luminous, slightly translucent, glowing edges and a soft inner light, rich colour, ' +
  'charming like a character from an animated film, collectible creature art, not a known earth animal. ' +
  'PURE BLACK background (#000000) and nothing else in the picture: no ground, no shadow on the ground, no plants, no bubbles, no text, no frame.';
const BUILD = {
  microbe: 'A single-celled microbe: a soft see-through blob with a visible nucleus inside it',
  orb: 'A round orb of a creature covered in spines radiating all round, with a jewel-like core',
  star: 'A star-shaped creature with arms all round its body and its face in the middle',
  jelly: 'A jellyfish-like creature: a domed translucent bell trailing long tentacles',
  blob: 'A soft, round, gel-like floating creature',
  crab: 'A crab-like creature: a wide domed shell on pointed legs, pincers held out in front, eyes on stalks',
  beast: 'A four-legged creature walking on all fours',
  upright: 'A creature that stands upright on two legs',
  serpent: 'A long serpent-like creature swimming in an S-shaped curve',
  fish: 'A fish-like swimming creature',
};
const clean = (s, n) => String(s || '').replace(/[^\w\s,.:;'()\-]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n);

function promptFor(info) {
  const build = BUILD[info.build] || BUILD.blob;
  const facts = (Array.isArray(info.facts) ? info.facts : []).slice(0, 12).map((x) => clean(x, 60)).filter(Boolean).join(', ');
  const world = (Array.isArray(info.world) ? info.world : []).slice(0, 3).map((x) => clean(x, 90)).filter(Boolean).join('; ');
  return build + '. It has: ' + facts + '. ' + (clean(info.colours, 80) ? 'Its colours: ' + clean(info.colours, 80) + '. ' : '') +
    (world ? 'It has adapted to its world, and it shows: ' + world + '. ' : '') + STYLE;
}

function createPainter({ store, apiKey, fetchImpl, model }) {
  const key = apiKey !== undefined ? apiKey : process.env.LEONARDO_API_KEY;
  const doFetch = fetchImpl || fetch;
  const modelId = model || process.env.PRIMORDIA_PAINTER || 'flux-pro-2.0';
  const headers = () => ({ authorization: 'Bearer ' + key, accept: 'application/json', 'content-type': 'application/json' });
  const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9|:,.\-]+/g, '_').slice(0, 140);
  const busy = new Map();

  async function generate(info) {
    const res = await doFetch(API + '/v2/generations', { method: 'POST', headers: headers(), body: JSON.stringify({ public: false, model: modelId, parameters: { prompt: promptFor(info), quantity: 1, width: 1024, height: 1024, prompt_enhance: 'OFF' } }) });
    const json = await res.json().catch(() => null);
    const id = json && json.generate && json.generate.generationId;
    if (!res.ok || !id) throw new Error('leonardo rejected the painting (HTTP ' + res.status + ')');
    const usd = parseFloat((json.generate.cost && json.generate.cost.amount) || '0') || 0;      // billed when queued; this is the amount it reports
    meterUsd('leonardo-' + modelId, usd);
    for (let i = 0; i < 60; i++) {
      await sleep(2500);
      const p = await doFetch(API + '/v1/generations/' + id, { headers: headers() });
      const j = await p.json().catch(() => null);
      const gen = j && j.generations_by_pk;
      if (gen && gen.status === 'FAILED') throw new Error('leonardo refused this painting');
      if (gen && gen.status === 'COMPLETE') {
        const url = gen.generated_images && gen.generated_images[0] && gen.generated_images[0].url;
        if (!url) throw new Error('leonardo finished but returned no picture');
        const a = await doFetch(encodeURI(url), { headers: { 'user-agent': 'Mozilla/5.0' } });
        if (!a.ok) throw new Error('could not download the painting (HTTP ' + a.status + ')');
        const buf = Buffer.from(await a.arrayBuffer());
        if (buf.length < 2000 || buf.length > MAX_BYTES) throw new Error('the painting was empty or too big');
        return { mime: /\.png(\?|$)/i.test(url) ? 'image/png' : 'image/jpeg', b64: buf.toString('base64'), by: modelId, usd };
      }
    }
    throw new Error('leonardo took too long');
  }

  return {
    enabled: () => !!key,
    model: modelId,
    promptFor,
    /** { paint: { mime, b64, by }, source: 'library' | 'leonardo', usd } or { error }. With libraryOnly nothing is ever paid for. */
    async forLook(info, opts) {
      opts = opts || {};
      const k = norm(info && info.sig);
      if (!k || k.length < 4) return { error: 'empty' };
      const hit = store.get('paint', k);
      if (hit && hit.b64) return { paint: hit, source: 'library' };
      if (info.libraryOnly) return { error: 'not_painted' };
      if (!key) return { error: 'no_painter' };
      if (opts.canGenerate && !opts.canGenerate()) return { error: 'slow_down' };
      if (busy.has(k)) return busy.get(k);
      const job = generate(info).then((p) => { const usd = p.usd; delete p.usd; store.set('paint', k, p); return { paint: p, source: 'leonardo', usd }; }, (err) => { if (opts.onError) opts.onError(err); return { error: 'failed' }; });
      busy.set(k, job);
      job.finally(() => busy.delete(k));
      return job;
    },
  };
}
module.exports = { createPainter, promptFor };
