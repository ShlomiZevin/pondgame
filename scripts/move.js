// Do the bodies move? Three frames a moment apart, close up, plus how heavy a frame is:  node scripts/move.js [tag] [seconds at 64x]
const { chromium } = require('../../plaxzy-creator/node_modules/playwright-core');
const path = require('path');
const BASE = process.env.BASE || 'http://localhost:8787';
const tag = process.argv[2] || 'm', secs = +process.argv[3] || 45;
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 820 } });
  const errs = [];
  page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message));
  await page.goto(BASE + '/dev?user=move' + tag + Date.now() + '&ai=0', { waitUntil: 'load' });
  await page.waitForTimeout(3000);
  const fr = page.frames().find((f) => f !== page.mainFrame());
  await fr.locator('#tBegin').click();
  await fr.evaluate(() => G.setSpeed(64));
  await page.waitForTimeout(secs * 1000);
  await fr.evaluate(() => { G.setSpeed(1); G.cam.z = 1; G.applyCam(); });
  await page.waitForTimeout(2500);
  console.log(await fr.evaluate(() => 'whole pond: gen ' + G.W.gen + ' pop ' + G.W.cre.length + ' | drawn alive up to ' + Math.round(G.R.liveMax) + ' | frame ' + Math.round((G.frameDt || 0) * 1000) + ' ms | ' + (G.W.kinds || []).slice(0, 4).map((k) => k[0] + ' ' + Math.round(k[1] * 100) + '%').join(', ')));
  await page.screenshot({ path: path.join(__dirname, 'move-' + tag + '-0-pond.png') });
  await fr.evaluate(() => { const L = G.W.cre.slice().sort((a, b) => b.ph.r * b.ph.reach - a.ph.r * a.ph.reach); const c = L[3] || L[0]; G.focusOn(c.x, c.y, 3); });
  await page.waitForTimeout(1500);
  for (let i = 1; i <= 3; i++) { await page.screenshot({ path: path.join(__dirname, 'move-' + tag + '-' + i + '.png'), clip: { x: 320, y: 110, width: 800, height: 600 } }); await page.waitForTimeout(260); }
  console.log(await fr.evaluate(() => 'close up: drawn alive up to ' + Math.round(G.R.liveMax) + ' | frame ' + Math.round((G.frameDt || 0) * 1000) + ' ms'));
  console.log(errs.slice(0, 5).join('\n') || 'no errors');
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
