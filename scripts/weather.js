// World events, seen:  node scripts/weather.js   (no AI: the game's own event table)
const { chromium } = require('../../plaxzy-creator/node_modules/playwright-core');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 820 } });
  const errs = []; page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message));
  await page.goto((process.env.BASE || 'http://localhost:8787') + '/dev?user=wx' + Date.now() + '&ai=0', { waitUntil: 'load' });
  await page.waitForTimeout(3000);
  const fr = page.frames().find((f) => f !== page.mainFrame());
  await fr.locator('#tBegin').click(); await fr.evaluate(() => G.setSpeed(32)); await page.waitForTimeout(6000); await fr.evaluate(() => G.setSpeed(1));
  const list = (process.argv.slice(2).length ? process.argv.slice(2) : ['an ice age', 'a heat wave', 'poison rain', 'darkness']);
  for (let i = 0; i < list.length; i++) {
    const name = await fr.evaluate(async (t) => { G.W.mods = []; const ev = await G.ai.ask('event', t); if (ev) G.runEvent(ev); return ev ? ev.name + ' | ' + ev.note : 'nothing'; }, list[i]);
    console.log(list[i] + ' → ' + name);
    await page.waitForTimeout(700); await page.screenshot({ path: path.join(__dirname, 'weather-' + (i + 1) + 'a.png') });
    await page.waitForTimeout(5200); await page.screenshot({ path: path.join(__dirname, 'weather-' + (i + 1) + 'b.png') });
  }
  console.log(errs.slice(0, 4).join('\n') || 'no errors');
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
