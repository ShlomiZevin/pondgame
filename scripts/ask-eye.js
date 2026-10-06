// One free question to the eye, about a picture.  node scripts/ask-eye.js <picture> <model> "<question>"
const fs = require('fs'), path = require('path');
for (const line of fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8').split(/\r?\n/)) { const m = /^([A-Z_]+)=(.*)$/.exec(line.trim()); if (m && !process.env[m[1]]) process.env[m[1]] = m[2]; }
const { anthropicCaller } = require('../lib/ai');
(async () => {
  const file = process.argv[2], model = process.argv[3] || 'claude-sonnet-5-5', q = process.argv[4];
  const call = anthropicCaller(process.env.ANTHROPIC_API_KEY, model);
  const out = await call({ system: 'You are an art director for a creature-collecting game. Answer plainly and concretely.', user: q, image: { mime: file.endsWith('.png') ? 'image/png' : 'image/jpeg', b64: fs.readFileSync(file).toString('base64') }, temperature: 0.4, maxTokens: 900 });
  console.log(out);
})().catch((e) => { console.error(String(e.message || e)); process.exit(1); });
