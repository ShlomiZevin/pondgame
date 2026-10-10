// What each star's terrain looks like: the same living star shown with each of the six terrains.   node scripts/terrain.js   (no AI: free)
const { chromium } = require('../../plaxzy-creator/node_modules/playwright-core');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1500, height: 950 } });
  const errs = []; page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message)); page.on('console', (m) => { if (m.type() === 'error' && !/404|413/.test(m.text())) errs.push('CONSOLE ' + m.text().slice(0, 240)); });
  await page.goto((process.env.BASE || 'http://localhost:8787') + '/dev?user=terr' + Date.now() + '&ai=0', { waitUntil: 'load' });
  await page.waitForTimeout(2500);
  const fr = page.frames().find((f) => f !== page.mainFrame());
  await fr.locator('#tBegin').click(); await page.waitForTimeout(1200);
  await fr.evaluate(() => { while (G.W.gen < 9) G.step(0.1); const c = G.colony(); c.peace = true; Object.assign(c.want, { g: 6, b: 3, f: 4, u: 1 }); for (let t = 0; t < 30; t += 0.1) G.step(0.1); G.setSpeed(1); G.camHome(); G.select(null); });
  const ids = await fr.evaluate(() => G.TERRAINS.map((t) => t.id));
  for (const id of ids) {
    await fr.evaluate((id) => { const T = G.TERRAINS.filter((t) => t.id === id)[0]; G.terrainOf = function () { return T; }; G.camHome(); G.select(null); }, id);
    await page.waitForTimeout(700); await page.screenshot({ path: path.join(__dirname, 'terrain-' + id + '.png') }); console.log('shot ' + id);
  }
  await fr.evaluate(() => { const h = G.heartOf(G.W); G.focusOn(h.x, h.y - 60, 2); }); await page.waitForTimeout(600); await page.screenshot({ path: path.join(__dirname, 'terrain-close.png') });
  console.log(errs.slice(0, 8).join('\n') || 'no errors');
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
