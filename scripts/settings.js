// The settings window, and the star at a glance.   node scripts/settings.js   (no AI: free)
const { chromium } = require('../../plaxzy-creator/node_modules/playwright-core');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1500, height: 950 } });
  const errs = []; page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message));
  await page.goto((process.env.BASE || 'http://localhost:8787') + '/dev?user=set' + Date.now(), { waitUntil: 'load' });
  await page.waitForTimeout(2500);
  const fr = page.frames().find((f) => f !== page.mainFrame());
  await fr.locator('#tBegin').click(); await page.waitForTimeout(1200);
  await fr.evaluate(() => { while (G.W.gen < 20) G.step(0.1); const c = G.colony(); c.peace = true; Object.assign(c.want, { g: 6, b: 3, f: 6, u: 2 }); for (let t = 0; t < 40; t += 0.1) G.step(0.1); G.camHome(); G.select(null); G.setSpeed(1); });
  await page.waitForTimeout(900); await page.screenshot({ path: path.join(__dirname, 'settings-0-star.png') });
  await fr.evaluate(() => G.openMenu()); await page.waitForTimeout(700); await page.screenshot({ path: path.join(__dirname, 'settings-1.png') });
  console.log(errs.join('\n') || 'no errors');
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
