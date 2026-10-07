// Away: the pond's clock stops (no AI is asked):  node scripts/away.js
// Plays a little, leaves the page for 40 s by hiding it, comes back, and reloads: the generation must not have moved on its own.
const { chromium } = require('../../plaxzy-creator/node_modules/playwright-core');
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 820 } });
  const errs = []; page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message));
  const url = (process.env.BASE || 'http://localhost:8787') + '/dev?user=away' + Date.now();
  await page.goto(url, { waitUntil: 'load' }); await page.waitForTimeout(3000);
  let fr = page.frames().find((f) => f !== page.mainFrame());
  await fr.locator('#tBegin').click();
  await fr.evaluate(() => { for (const k of Object.keys(G.ai.gaps)) G.ai.gaps[k] = 1e9; G.setSpeed(16); });
  await page.waitForTimeout(12000);
  const a = await fr.evaluate(() => { G.setSpeed(1); G.saveNow && G.saveNow(); return { gen: G.W.gen, t: Math.round(G.W.t), asked: G.startCatchUp(600) }; });
  console.log('before: gen ' + a.gen + ' · pond time ' + a.t + ' s · asking it to catch up 10 minutes: ' + (a.asked ? 'IT STARTED (wrong)' : 'refused'));
  await page.waitForTimeout(3000);
  await page.goto('about:blank'); await page.waitForTimeout(40000);      // away, the game closed
  await page.goto(url, { waitUntil: 'load' }); await page.waitForTimeout(3000);
  fr = page.frames().find((f) => f !== page.mainFrame());
  await fr.locator('#tCont').click(); await page.waitForTimeout(2500);      // CONTINUE the saved pond
  const b = await fr.evaluate(() => ({ gen: G.W.gen, t: Math.round(G.W.t), mode: G.mode, box: !!document.getElementById('catchup') }));
  console.log('back after 40 s away: gen ' + b.gen + ' · pond time ' + b.t + ' s · catching up: ' + (b.box || b.mode === 'catchup' ? 'YES (wrong)' : 'no'));
  console.log(errs.slice(0, 5).join('\n') || 'no errors');
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
