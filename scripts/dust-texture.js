// One picture of cosmic dust from Leonardo, to shape how a pond's edge dissolves into space (about two cents, once).  node scripts/dust-texture.js
// It writes scripts/dust-raw.jpg. The game uses a small grey copy of it (game/src/57z_dust.js), made by scripts/dust-pack.js.
'use strict';
const fs = require('fs'), path = require('path');
for (const line of fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8').split(/\r?\n/)) { const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ''); }
const key = process.env.LEONARDO_API_KEY, API = 'https://cloud.leonardo.ai/api/rest/v1', H = { authorization: 'Bearer ' + key, accept: 'application/json', 'content-type': 'application/json' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  if (!key) throw new Error('no LEONARDO_API_KEY');
  const prompt = 'Macro photograph of fine glowing dust and mist dispersing in pure black space: millions of tiny soft particles in drifting wisps and thin veils, dense soft clouds in some places thinning to scattered single motes in others, smooth natural falloff, volumetric, no hard edges, no objects, no stars, no planets, no text. Monochrome pale light on black, even coverage across the whole frame, abstract texture.';
  const r = await fetch(API + '/generations', { method: 'POST', headers: H, body: JSON.stringify({ modelId: 'de7d3faf-762f-48e0-b3b7-9d0ac3a3fcf3', prompt, num_images: 1, width: 1024, height: 1024, alchemy: false, public: false }) });
  const j = await r.json(); const id = j && j.sdGenerationJob && j.sdGenerationJob.generationId;
  if (!r.ok || !id) throw new Error('rejected: ' + JSON.stringify(j).slice(0, 300));
  console.log('cost $' + ((j.sdGenerationJob.cost && j.sdGenerationJob.cost.amount) || '?'));
  for (let i = 0; i < 40; i++) { await sleep(2500); const p = await (await fetch(API + '/generations/' + id, { headers: H })).json(); const g = p && p.generations_by_pk; if (g && g.status === 'FAILED') throw new Error('failed'); if (g && g.status === 'COMPLETE' && g.generated_images && g.generated_images[0]) { const a = await fetch(g.generated_images[0].url); fs.writeFileSync(path.join(__dirname, 'dust-raw.jpg'), Buffer.from(await a.arrayBuffer())); console.log('saved scripts/dust-raw.jpg'); return; } }
  throw new Error('took too long');
})().catch((e) => { console.error(e.message); process.exit(1); });
