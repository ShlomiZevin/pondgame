// Ask the sound model for the sound of a moment on a star, or of a star's air, exactly as the game would, and keep it in the server's library (data/),
// so the game finds it there and never pays for it again. A copy is saved in scripts/art/ to listen to.
//   node scripts/sfx-try.js built,liftoff        node scripts/sfx-try.js list
// Every new sound costs money: what the API reports is added to scripts/art/ledger.json (shared with art-try.js), and nothing is asked for past the CAP.
const fs = require('fs'), path = require('path');
require('../server').loadEnv && require('../server').loadEnv();
const { createStore } = require('../lib/store'), { createSounds } = require('../lib/sound');
const DIR = path.join(__dirname, 'art'), CAP = 0.95; fs.mkdirSync(DIR, { recursive: true });
const store = createStore(process.env.PRIMORDIA_DATA || path.join(__dirname, '..', 'data')), sounds = createSounds({ store });
const ledgerFile = path.join(DIR, 'ledger.json'), ledger = () => { try { return JSON.parse(fs.readFileSync(ledgerFile, 'utf8')); } catch (e) { return { usd: 0, items: [] }; } };
(async () => {
  const arg = process.argv[2] || 'list';
  if (arg === 'list') { console.log('can be asked for: ' + sounds.fxNames().join(' ')); console.log('kept: ' + store.keys('sound').filter((k) => k.indexOf('fx_') === 0).join(' ')); console.log('ledger $' + ledger().usd.toFixed(3)); return; }
  for (const name of arg.split(',')) {
    const L = ledger(); if (L.usd >= CAP) { console.log('STOP: the ledger is at $' + L.usd.toFixed(3) + ' (cap $' + CAP + ')'); return; }
    const t0 = Date.now(), r = await sounds.forFx(name, { onError: (e) => console.error('failed:', e.message) });
    if (r.error) { console.log(name + ': ' + r.error); continue; }
    if (r.usd) { L.usd += r.usd; L.items.push({ key: 'fx ' + name, usd: r.usd, at: new Date().toISOString() }); fs.writeFileSync(ledgerFile, JSON.stringify(L, null, 1)); }
    const out = path.join(DIR, 'fx-' + name.replace(/[^a-z0-9]+/gi, '-') + '.' + (r.sound.mime === 'audio/wav' ? 'wav' : 'mp3')); fs.writeFileSync(out, Buffer.from(r.sound.b64, 'base64'));
    console.log(name, '| ' + r.source, '| $' + (r.usd || 0), '|', Math.round((Date.now() - t0) / 1000) + 's |', Math.round(r.sound.b64.length * 0.75 / 1024) + ' kB | ledger $' + L.usd.toFixed(3), '→', out);
  }
})().catch((e) => { console.error(e); process.exit(1); });
