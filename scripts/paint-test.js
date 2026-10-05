// Ask the image model to paint creatures from a description, on black, and save what comes back.
//   node scripts/paint-test.js [model]        (each image costs a few cents; the cost is printed)
const fs = require('fs'), path = require('path');
require('../server').loadEnv && require('../server').loadEnv();
const KEY = process.env.LEONARDO_API_KEY, API = 'https://cloud.leonardo.ai/api/rest';
const model = process.argv[2] || 'flux-pro-2.0';
const STYLE = 'Single creature only, whole body in frame, centered, side view facing right, large expressive eye. Painterly digital illustration of a small otherworldly pond creature, luminous, slightly translucent with glowing edges and soft inner light, rich colour, charming like a character from an animated film, collectible creature art. PURE BLACK background (#000000), nothing else in the picture: no ground, no plants, no bubbles, no text, no frame.';
const CASES = [
  ['fish', 'A fish-like creature with a plump blue body with rose stripes, a tall sail fin on its back, a forked tail, feathery gills behind its head, a beak-like mouth, small glowing spots along its side.'],
  ['crab', 'A crab-like creature: a wide domed red shell with golden spots, two big pincers held out in front, six pointed legs, two eyes on tall stalks, spines along the rim of the shell.'],
];
const H = { authorization: 'Bearer ' + KEY, accept: 'application/json', 'content-type': 'application/json' };
(async () => {
  if (!KEY) { console.log('no LEONARDO_API_KEY'); return; }
  for (const [name, what] of CASES) {
    const t0 = Date.now();
    const res = await fetch(API + '/v2/generations', { method: 'POST', headers: H, body: JSON.stringify({ public: false, model, parameters: { prompt: what + ' ' + STYLE, quantity: 1, width: 1024, height: 1024, prompt_enhance: 'OFF' } }) });
    const q = await res.json();
    if (!q.generate) { console.log(name, 'refused:', JSON.stringify(q).slice(0, 300)); continue; }
    const id = q.generate.generationId, cost = Number((q.generate.cost && q.generate.cost.amount) || 0);
    let url = null;
    for (let i = 0; i < 70 && !url; i++) { await new Promise((r) => setTimeout(r, 2500)); const g = (await (await fetch(API + '/v1/generations/' + id, { headers: H })).json()).generations_by_pk; if (g && g.status === 'COMPLETE') url = g.generated_images[0] && g.generated_images[0].url; else if (g && g.status === 'FAILED') break; }
    if (!url) { console.log(name, 'failed'); continue; }
    const buf = Buffer.from(await (await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0' } })).arrayBuffer());
    const ext = /\.png/i.test(url) ? 'png' : 'jpg';
    fs.writeFileSync(path.join(__dirname, 'paint-' + name + '.' + ext), buf);
    console.log(name, '| $' + cost, '|', Math.round((Date.now() - t0) / 1000) + 's |', Math.round(buf.length / 1024) + ' kB', ext);
  }
})().catch((e) => { console.error(e); process.exit(1); });
