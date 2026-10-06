// the first minute of a pond: what life looks like when it begins.  node scripts/start.js
const { chromium } = require('../../plaxzy-creator/node_modules/playwright-core');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 820 } });
  const errs = []; page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message));
  await page.goto('http://localhost:8787/dev?user=start' + Date.now() + '&ai=0', { waitUntil: 'load' });
  await page.waitForTimeout(3000);
  const fr = page.frames().find((f) => f !== page.mainFrame());
  await fr.locator('#tBegin').click(); await page.waitForTimeout(2500);
  await fr.evaluate(() => { const c = G.W.cre[0]; G.focusOn(c.x, c.y, 2.2); });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(__dirname, 'start-1.png') });
  await fr.evaluate(() => G.setSpeed(64)); await page.waitForTimeout(9000);
  await fr.evaluate(() => { G.setSpeed(1); const c = G.W.cre[0]; G.focusOn(c.x, c.y, 2.0); });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(__dirname, 'start-2.png') });
  console.log(await fr.evaluate(() => 'gen ' + G.W.gen + ' ' + (G.W.kinds || []).slice(0, 4).map((k) => k[0] + ' ' + Math.round(k[1] * 100) + '%').join(', ')));
  console.log(errs.slice(0, 3).join('\n') || 'no errors');
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
