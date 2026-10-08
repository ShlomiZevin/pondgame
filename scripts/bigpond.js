// Does a much bigger pond still feed its creatures? (no AI is asked):  node scripts/bigpond.js [times as wide, default 4] [seconds at x64, default 90]
const { chromium } = require('../../plaxzy-creator/node_modules/playwright-core');
const big = +process.argv[2] || 4, secs = +process.argv[3] || 90;
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 820 } });
  const errs = []; page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message));
  await page.goto((process.env.BASE || 'http://localhost:8787') + '/dev?user=big' + Date.now(), { waitUntil: 'load' });
  await page.waitForTimeout(3000);
  const fr = page.frames().find((f) => f !== page.mainFrame());
  await fr.locator('#tBegin').click();
  await fr.evaluate(() => { for (const k of Object.keys(G.ai.gaps)) G.ai.gaps[k] = 1e9; for (const k of ['deed', 'marvel', 'nature', 'wish', 'wishcheck', 'watch', 'judge']) G.ai.gaps[k] = 1e9; G.setSpeed(64); });
  await page.waitForTimeout(20000);
  const line = () => fr.evaluate(() => { const W = G.W; let fed = 0; W.cre.forEach((c) => { fed += c.E / c.ph.Emax; }); return 'gen ' + W.gen + ' · ' + W.cre.length + ' creatures · food ' + W.food.length + ' · mean energy ' + Math.round(100 * fed / Math.max(1, W.cre.length)) + '% · pond x' + (G.view.grow || 1).toFixed(2) + ' · kinds ' + W.species.filter((s) => !s.extinct && s.n > 0).length; });
  console.log('before: ' + await line());
  await fr.evaluate((big) => G.pondGrowTo(big), big);
  for (let t = 0; t < secs; t += 15) { await page.waitForTimeout(15000); console.log('at x' + big + ': ' + await line()); }
  console.log(errs.slice(0, 5).join('\n') || 'no errors');
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
