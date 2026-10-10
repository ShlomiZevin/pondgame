// Arriving on a star whose paintings are slow to come: the answer to every request for a picture is held back six seconds, and the star is pictured while it waits
// and after. A building must never be seen drawn the old way and then swapped: it stands as a shape of light until its painting comes.   node scripts/arrival.js   (no AI: free)
const { chromium } = require('../../plaxzy-creator/node_modules/playwright-core');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  const errs = []; page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message)); page.on('console', (m) => { if (m.type() === 'error' && !/404|413/.test(m.text())) errs.push('CONSOLE ' + m.text().slice(0, 200)); });
  let held = 0; await page.route('**/api/art', async (route) => { held++; await new Promise((r) => setTimeout(r, 6000)); route.continue(); });
  await page.goto((process.env.BASE || 'http://localhost:8787') + '/dev?user=arr' + Date.now() + '&ai=0', { waitUntil: 'load' }); await page.waitForTimeout(2500);
  const fr = page.frames().find((f) => f !== page.mainFrame());
  await fr.locator('#tBegin').click(); await page.waitForTimeout(600);
  await fr.evaluate(() => { while (G.W.gen < 10) G.step(0.1); const c = G.colony(); c.peace = true; G.setSpeed(1); const h = G.heartOf(G.W); G.cam.z = 1.5; G.focusOn(h.x, h.y + 40, 1.5); G.select(null); });
  const state = () => fr.evaluate(() => { const h = G.heartOf(G.W); return 'ground painted ' + !!G.art.ground(G.W) + ' · Heart: ' + (G.buildArt(h) ? 'its painting' : G.art.waiting(G.W, 'heart0') ? 'waiting as a shape of light' : 'DRAWN THE OLD WAY'); });
  await page.waitForTimeout(2200); console.log('2 s in: ' + await state()); await page.screenshot({ path: path.join(__dirname, 'arrival-1-waiting.png') });
  await page.waitForTimeout(9000); console.log('11 s in: ' + await state() + ' · pictures held back: ' + held); await page.screenshot({ path: path.join(__dirname, 'arrival-2-painted.png') });
  console.log(errs.slice(0, 6).join('\n') || 'no errors'); await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
