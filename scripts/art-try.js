// Ask the image model for a star's ground or a people's buildings, exactly as the game would, and keep what comes back in the server's
// library (data/), so the game finds it there and never pays for it again. A copy is saved in scripts/art/ to look at.
//   node scripts/art-try.js '{"what":"ground","terrain":"reef"}'
//   node scripts/art-try.js '{"what":"civic","terrain":"frost","people":{"kind":"Blue Horned Blob","facts":["a round body","a pair of horns","one big eye"],"colours":"blue with rose trim"}}'
//   node scripts/art-try.js keep        put the trial pictures already in scripts/art/ into the library (free)
//   node scripts/art-try.js list        what the library holds (free)
// Every new picture costs money: the cost the API reports is added to scripts/art/ledger.json, and nothing is asked for once that passes the CAP.
const fs = require('fs'), path = require('path');
require('../server').loadEnv && require('../server').loadEnv();
const { createStore } = require('../lib/store'), { createArt } = require('../lib/art');
const DIR = path.join(__dirname, 'art'), CAP = 0.95; fs.mkdirSync(DIR, { recursive: true });
const store = createStore(process.env.PRIMORDIA_DATA || path.join(__dirname, '..', 'data')), art = createArt({ store });
const ledgerFile = path.join(DIR, 'ledger.json'), ledger = () => { try { return JSON.parse(fs.readFileSync(ledgerFile, 'utf8')); } catch (e) { return { usd: 0, items: [] }; } };
(async () => {
  const arg = process.argv[2] || 'list';
  if (arg === 'list') { console.log(store.keys('art').join('\n') || '(the library is empty)'); console.log('ledger $' + ledger().usd.toFixed(3)); return; }
  if (arg === 'keep') {
    const put = (file, key) => { const f = path.join(DIR, file); if (!fs.existsSync(f)) return; if (store.get('art', key)) { console.log('have ' + key); return; } store.set('art', key, { mime: 'image/jpeg', b64: fs.readFileSync(f).toString('base64'), by: 'trial' }); console.log('kept ' + file + ' as ' + key); };
    ['reef', 'crag', 'marsh', 'crystal', 'ember', 'frost'].forEach((t) => put('ground-' + t + '.jpg', 'ground.' + t + '.0'));
    put('sheet-a.jpg', 'civic.reef.any'); put('sheet-b.jpg', 'works.reef.any'); return;
  }
  const info = JSON.parse(arg), job = art.jobFor(info); if (!job) { console.log('nothing to ask for: ' + arg); return; }
  if (process.argv[3] === 'prompt') { console.log(job.key + '\n' + job.prompt); return; }
  const L = ledger(); if (L.usd >= CAP) { console.log('STOP: the ledger is at $' + L.usd.toFixed(3) + ' (cap $' + CAP + ')'); return; }
  const t0 = Date.now(), r = await art.forStar(info, { onError: (e) => console.error('failed:', e.message) });
  if (r.error) { console.log('error: ' + r.error); return; }
  if (r.usd) { L.usd += r.usd; L.items.push({ key: r.key, usd: r.usd, at: new Date().toISOString() }); fs.writeFileSync(ledgerFile, JSON.stringify(L, null, 1)); }
  const out = path.join(DIR, r.key + '.' + (r.art.mime === 'image/png' ? 'png' : 'jpg')); fs.writeFileSync(out, Buffer.from(r.art.b64, 'base64'));
  console.log(r.key, '| ' + r.source + (r.near ? ' (nearest)' : ''), '| $' + (r.usd || 0), '|', Math.round((Date.now() - t0) / 1000) + 's | ledger $' + L.usd.toFixed(3), '→', out);
})().catch((e) => { console.error(e); process.exit(1); });
