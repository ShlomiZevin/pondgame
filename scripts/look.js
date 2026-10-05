// A look at the pond after a fast run: node scripts/look.js [user] [seconds at 64x]
const { chromium } = require('../../plaxzy-creator/node_modules/playwright-core');
const path = require('path');
const BASE = process.env.BASE || 'http://localhost:8787';
const tag = process.argv[2] || 'a', secs = +process.argv[3] || 60;
const out = (n) => path.join(__dirname, 'look-' + tag + '-' + n + '.png');
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 820 } });
  const errs = [];
  page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message));
  await page.goto(BASE + '/dev?user=look' + tag + Date.now() + (process.env.NOAI ? '&ai=0' : ''), { waitUntil: 'load' });
  await page.waitForTimeout(3000);
  const fr = page.frames().find((f) => f !== page.mainFrame());
  await fr.locator('#tBegin').click();
  await fr.evaluate(() => G.setSpeed(64));
  const state = () => fr.evaluate(() => { const W = G.W; return 'gen ' + W.gen + ' pop ' + W.cre.length + ' | ' + G.ageNow(W).name + ' | ' + (W.kinds || []).slice(0, 4).map((k) => k[0] + ' ' + Math.round(k[1] * 100) + '%').join(', ') + ' | judged ' + W.species.filter((s) => s.judge).length + ' | ' + G.ai.money(G.ai.totals().usd); });
  const n = Math.max(1, Math.round(secs / 15));
  for (let i = 0; i < n; i++) { await page.waitForTimeout(15000); console.log(await state()); if (errs.length) break; }
  await fr.evaluate(() => { G.setSpeed(1); G.cam.z = 1.0; G.applyCam(); });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: out('1-pond') });
  // close up on the busiest spot
  await fr.evaluate(() => { const c = G.W.cre[0]; G.focusOn(c.x, c.y, 2.4); });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: out('2-close') });
  await fr.evaluate(() => { document.getElementById('panel').classList.remove('min'); });
  await page.waitForTimeout(400);
  await page.screenshot({ path: out('3-panel'), clip: { x: 1090, y: 0, width: 350, height: 560 } });
  await fr.evaluate(() => G.showCosts());
  await page.waitForTimeout(500);
  await page.screenshot({ path: out('4-costs') });
  console.log(await fr.evaluate(() => 'water: ' + G.envText(G.W) + ' | admired: ' + G.form.fashionText(G.W.fashion) + ' | ages: ' + G.W.ages.map((a) => a.gen + ' ' + a.name).join(' / ')));
  console.log(errs.slice(0, 5).join('\n') || 'no errors');
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
