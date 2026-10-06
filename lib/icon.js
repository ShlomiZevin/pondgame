// An icon for each marvel: a cute, glossy, transparent picture made by an image model.
// OFF unless LEONARDO_API_KEY is set. One icon per marvel NAME, kept for good: the same name is never paid for twice, by anyone.
// Two steps, both on Leonardo: a picture on a plain white ground (Phoenix, 512 px, about 1.4 cents), then its background taken
// away (about 0.75 cents), which leaves a PNG with real transparency (Phoenix cannot make one directly). The client sends only a
// name and a few words; the prompt is written here, so a client cannot ask for anything else.
'use strict';
const { meterUsd } = require('./ai');
const API = 'https://cloud.leonardo.ai/api/rest/v1';
const PHOENIX = 'de7d3faf-762f-48e0-b3b7-9d0ac3a3fcf3';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const MAX_BYTES = 700 * 1024;
const clean = (s, n) => String(s || '').replace(/[^\w\s,.:;'()\-]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n);
const COLOURS = [[20, 'orange and gold'], [50, 'golden yellow'], [90, 'lime green'], [140, 'emerald green'], [190, 'turquoise'], [230, 'sapphire blue'], [275, 'violet and purple'], [320, 'pink and magenta'], [360, 'ruby red']];
const colourOf = (hue) => { hue = ((Number(hue) || 0) % 360 + 360) % 360; let best = COLOURS[0], bd = 999; for (const c of COLOURS) { const d = Math.min(Math.abs(c[0] - hue), 360 - Math.abs(c[0] - hue)); if (d < bd) { bd = d; best = c; } } return best[1]; };
// the one picture every icon must be: a lone object, cute and glossy, on plain white so the background can be lifted off
const STYLE = 'A single game collectible icon, like a magical charm or badge from a children\'s animated film: a bold simple shape, cute and glossy, rich saturated colours, ' +
  'soft inner glow and a few sparkles, smooth rounded shading, centered with a wide margin all round. The object only: no creature, no hands, no text, no letters, no frame, no shadow. Plain solid white background.';

function promptFor(info) {
  const name = clean(info.name, 40), wonder = clean(info.wonder, 140), what = clean(info.icon, 100);
  return 'An emblem that stands for "' + name + '"' + (what ? ': ' + what : '') + '. (' + wonder + ') Main colours: ' + colourOf(info.hue) + '. ' + STYLE;
}

function createIcons({ store, apiKey, fetchImpl }) {
  const key = apiKey !== undefined ? apiKey : process.env.LEONARDO_API_KEY;
  const doFetch = fetchImpl || fetch;
  const headers = () => ({ authorization: 'Bearer ' + key, accept: 'application/json', 'content-type': 'application/json' });
  const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 60);
  const busy = new Map();

  async function generate(info) {
    let usd = 0;
    const r = await doFetch(API + '/generations', { method: 'POST', headers: headers(), body: JSON.stringify({ modelId: PHOENIX, prompt: promptFor(info), num_images: 1, width: 512, height: 512, alchemy: false, public: false }) });
    const j = await r.json().catch(() => null);
    const id = j && j.sdGenerationJob && j.sdGenerationJob.generationId;
    if (!r.ok || !id) throw new Error('leonardo rejected the icon (HTTP ' + r.status + ')');
    const c1 = parseFloat((j.sdGenerationJob.cost && j.sdGenerationJob.cost.amount) || '0') || 0; usd += c1; meterUsd('leonardo-phoenix-icon', c1);
    let imageId = null;
    for (let i = 0; i < 40 && !imageId; i++) {
      await sleep(2500);
      const p = await (await doFetch(API + '/generations/' + id, { headers: headers() })).json().catch(() => null);
      const g = p && p.generations_by_pk;
      if (g && g.status === 'FAILED') throw new Error('leonardo refused this icon');
      if (g && g.status === 'COMPLETE' && g.generated_images && g.generated_images[0]) imageId = g.generated_images[0].id;
    }
    if (!imageId) throw new Error('leonardo took too long');
    const n = await doFetch(API + '/variations/nobg', { method: 'POST', headers: headers(), body: JSON.stringify({ id: imageId, isVariation: false }) });
    const nj = await n.json().catch(() => null);
    const vid = nj && nj.sdNobgJob && nj.sdNobgJob.id;
    if (!n.ok || !vid) throw new Error('leonardo could not take the background off (HTTP ' + n.status + ')');
    const c2 = parseFloat((nj.sdNobgJob.cost && nj.sdNobgJob.cost.amount) || '0') || 0; usd += c2; meterUsd('leonardo-nobg', c2);
    for (let i = 0; i < 40; i++) {
      await sleep(2000);
      const p = await (await doFetch(API + '/variations/' + vid, { headers: headers() })).json().catch(() => null);
      const v = p && p.generated_image_variation_generic && p.generated_image_variation_generic[0];
      if (v && v.status === 'FAILED') throw new Error('leonardo failed to cut the icon out');
      if (v && v.status === 'COMPLETE' && v.url) {
        const a = await doFetch(encodeURI(v.url), { headers: { 'user-agent': 'Mozilla/5.0' } });
        if (!a.ok) throw new Error('could not download the icon (HTTP ' + a.status + ')');
        const buf = Buffer.from(await a.arrayBuffer());
        if (buf.length < 1500 || buf.length > MAX_BYTES) throw new Error('the icon was empty or too big');
        return { mime: 'image/png', b64: buf.toString('base64'), by: 'phoenix+nobg', usd };
      }
    }
    throw new Error('leonardo took too long to cut the icon out');
  }

  return {
    enabled: () => !!key,
    promptFor,
    /** { icon: { mime, b64 }, source: 'library' | 'leonardo', usd } or { error }. With libraryOnly nothing is ever paid for. */
    async forMarvel(info, opts) {
      opts = opts || {};
      const k = norm(info && info.name);
      if (!k || k.length < 3) return { error: 'empty' };
      const hit = store.get('icon', k);
      if (hit && hit.b64) return { icon: { mime: hit.mime, b64: hit.b64 }, source: 'library' };
      if (info.libraryOnly) return { error: 'no_icon_yet' };
      if (!key) return { error: 'no_painter' };
      if (opts.canGenerate && !opts.canGenerate()) return { error: 'slow_down' };
      if (busy.has(k)) return busy.get(k);
      const job = generate(info).then((p) => { const usd = p.usd; delete p.usd; store.set('icon', k, p); return { icon: { mime: p.mime, b64: p.b64 }, source: 'leonardo', usd }; }, (err) => { if (opts.onError) opts.onError(err); return { error: 'failed' }; });
      busy.set(k, job);
      job.finally(() => busy.delete(k));
      return job;
    },
  };
}
module.exports = { createIcons, promptFor };
