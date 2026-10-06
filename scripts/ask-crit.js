// Ask the model, looking at a sheet (scripts/crit-<tag>.jpg), what it would change.  node scripts/ask-crit.js <tag> "<question>"
const fs = require('fs'), path = require('path');
const env = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8'); const key = (env.match(/ANTHROPIC_API_KEY=(.+)/) || [])[1].trim();
const img = fs.readFileSync(path.join(__dirname, 'crit-' + (process.argv[2] || 'a') + '.jpg')).toString('base64');
(async () => {
  const r = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model: process.env.MODEL || 'claude-sonnet-5-5', max_tokens: 4000, thinking: { type: 'between_tools' }, messages: [{ role: 'user', content: [{ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: img } }, { type: 'text', text: process.argv[3] }] }] }) });
  const j = await r.json();
  const text = (j.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('\n');
  console.log(text || JSON.stringify(j).slice(0, 600));
  if (j.usage) console.log('\n[tokens in/out ' + j.usage.input_tokens + '/' + j.usage.output_tokens + ']');
})();
