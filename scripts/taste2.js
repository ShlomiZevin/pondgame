// Has the AI grade the sampled creatures (beauty and whole, from the picture, twelve to a sheet, no reference row),
// for fitting the game's starting taste.  node scripts/taste2.js [model]  →  scripts/taste2-data.json
const { chromium } = require('../../plaxzy-creator/node_modules/playwright-core');
const fs = require('fs'), path = require('path');
const model = process.argv[2] || 'claude-sonnet-5-5';
const packs = JSON.parse(fs.readFileSync(path.join(__dirname, 'taste2-packs.json'), 'utf8'));
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
  await page.goto((process.env.BASE || 'http://localhost:8787') + '/dev?user=taste2' + Date.now(), { waitUntil: 'load' });
  await page.waitForTimeout(2500);
  const fr = page.frames().find((f) => f !== page.mainFrame());
  await fr.locator('#tBegin').click(); await page.waitForTimeout(600);
  const rows = []; let usd = 0;
  for (let at = 0; at < packs.length; at += 12) {
    const part = packs.slice(at, at + 12).map((q) => q.pack);
    const r = await fr.evaluate(async ({ part, model }) => {
      G.setSpeed(0.0001);
      const forms = part.map((p) => G.form.unpack(p)), img = G.sheet(forms, { cw: 176, ch: 182, sc: 0.48, cols: 4 });
      let res; try { res = await G.host.call('ai.judge', { image: img, mime: 'image/jpeg', model, lean: 1, count: forms.length }, 120000); } catch (e) { return { err: String(e && e.message || e) }; }
      const sc = (res.judge && res.judge.scores) || [];
      return { usd: res.usd || 0, names: G.form.LOOKS, rows: sc.map((s) => { const f = forms[s.id - 1]; return f ? { x: G.form.looks(f), y: s.score, w: s.whole, v0: G.form.whole(f).v, why: s.why } : null; }).filter(Boolean) };
    }, { part, model });
    if (r.err) { console.log('batch ' + at + ' failed: ' + r.err); continue; }
    usd += r.usd; rows.push(...r.rows); process.stdout.write('\r' + rows.length + ' graded · $' + usd.toFixed(3) + '   ');
    fs.writeFileSync(path.join(__dirname, 'taste2-data.json'), JSON.stringify({ names: r.names, model, rows }));
  }
  console.log('\n' + rows.length + ' rows · $' + usd.toFixed(3));
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
