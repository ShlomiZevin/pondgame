// One real call to each model, then the cost window and the server's books:  node scripts/costs.js
// (six short calls: a few tenths of a cent in all)
const { chromium } = require('../../plaxzy-creator/node_modules/playwright-core');
const path = require('path');
const BASE = process.env.BASE || 'http://localhost:8787';
(async () => {
  const models = (await (await fetch(BASE + '/api/ai/models', { headers: { 'x-user': 'costcheck' } })).json()).models || [];
  for (const m of models) {
    const r = await (await fetch(BASE + '/api/ai/event', { method: 'POST', headers: { 'x-user': 'costcheck', 'content-type': 'application/json' }, body: JSON.stringify({ text: 'a warm rain ' + Math.random().toString(36).slice(2, 7), model: m.id }) })).json();
    console.log(m.id.padEnd(28), 'source', String(r.source).padEnd(8), 'cost', r.usd === null ? 'NO PRICE' : r.usd === undefined ? '-' : '$' + r.usd);
  }
  const u = await (await fetch(BASE + '/api/usage')).json();
  console.log('today $' + u.usd, '| all time $' + u.allTime.usd, 'in', u.allTime.calls, 'calls | unpriced:', JSON.stringify(u.unpriced || 'none'));
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 820 } });
  await page.goto(BASE + '/dev?user=costs' + Date.now(), { waitUntil: 'load' });
  await page.waitForTimeout(3000);
  const fr = page.frames().find((f) => f !== page.mainFrame());
  await fr.locator('#tBegin').click(); await page.waitForTimeout(1500);
  await fr.evaluate(() => G.showCosts()); await page.waitForTimeout(2500);
  await page.screenshot({ path: path.join(__dirname, 'costs.png') });
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
