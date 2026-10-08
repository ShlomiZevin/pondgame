// Beyond the pond: zooming out into space, the far ponds, the way home.  node scripts/space.js   (no AI: free)
const { chromium } = require('../../plaxzy-creator/node_modules/playwright-core');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 860 } });
  const errs = []; page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message)); page.on('console', (m) => { if (m.type() === 'error' && !/404/.test(m.text())) errs.push('CONSOLE ' + m.text().slice(0, 200)); });
  await page.goto((process.env.BASE || 'http://localhost:8787') + '/dev?user=space' + Date.now() + '&ai=0', { waitUntil: 'load' });
  await page.waitForTimeout(2500);
  const fr = page.frames().find((f) => f !== page.mainFrame());
  await fr.locator('#tBegin').click(); await page.waitForTimeout(1200);
  await fr.evaluate(() => G.setSpeed(64)); await page.waitForTimeout(12000); await fr.evaluate(() => G.setSpeed(1));
  const shot = (n) => page.screenshot({ path: path.join(__dirname, 'space-' + n + '.png') });
  await fr.evaluate(() => { G.cam.z = 0.6; G.applyCam(); }); await page.waitForTimeout(700); await shot('1-edge');
  await fr.evaluate(() => { G.cam.z = 0.16; G.applyCam(); }); await page.waitForTimeout(700); await shot('2-out');
  await fr.evaluate(() => { G.cam.z = 0.045; G.applyCam(); }); await page.waitForTimeout(700); await shot('3-far');
  // click the nearest far pond, then go home with the button
  const hit = await fr.evaluate(() => { const v = G.view, W = G.W; let best = null; for (let i = -3; i <= 3; i++) for (let j = -3; j <= 3; j++) { const sx = v.w / 2 + i * 60, sy = v.h / 2 + j * 60; } return null; });
  const p = await fr.evaluate(() => { const v = G.view; const cs = Math.max(v.ww, v.wh) * 4.2; return { z: G.cam.z }; });
  await fr.evaluate(() => { G.cam.z = 0.16; G.cam.x = G.view.ww * 3; G.applyCam(); }); await page.waitForTimeout(600);
  console.log('home button shown when away: ' + await fr.evaluate(() => !document.getElementById('gohome').classList.contains('hide')) + ' · ' + (await fr.locator('#gohome').innerText()).replace(/\n+/g, ' '));
  await shot('4-away');
  await fr.locator('#gohome').click(); await page.waitForTimeout(1600);
  console.log('after BACK TO MY POND: ' + JSON.stringify(await fr.evaluate(() => ({ z: +G.cam.z.toFixed(2), atHome: Math.abs(G.cam.x - G.view.ww / 2) < 2, button: !document.getElementById('gohome').classList.contains('hide') }))));
  console.log(errs.slice(0, 6).join('\n') || 'no errors');
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
