// Does a pond fill with what its creatures built, and does it stay?  node scripts/town.js   (no AI: free)
const { chromium } = require('../../plaxzy-creator/node_modules/playwright-core');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 860 } });
  const errs = []; page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message));
  await page.goto((process.env.BASE || 'http://localhost:8787') + '/dev?user=town' + Date.now() + '&ai=0', { waitUntil: 'load' });
  await page.waitForTimeout(2500);
  const fr = page.frames().find((f) => f !== page.mainFrame());
  await fr.locator('#tBegin').click(); await page.waitForTimeout(1200);
  await fr.evaluate(() => { window._gone = 0; G.on('work-gone', () => _gone++); G.setSpeed(16); });      // (plans are not started above x16, as in play)
  for (let i = 0; i < 7; i++) { await page.waitForTimeout(40000); console.log(await fr.evaluate(() => 'gen ' + G.W.gen + ', alive ' + G.W.cre.length + ', kinds ' + G.W.species.filter((s) => !s.extinct && s.n > 0).length + ' · standing: ' + ((G.W.works || []).map((w) => w.name + ' ' + G.buildCount(w).join('/') + (w.ruin ? ' (ruin)' : '') + (w.keptBy ? ' [kept by ' + w.keptBy + ']' : '')).join(', ') || 'nothing') + ' · fallen ' + _gone + (G.W.deed ? ' · now: ' + G.W.deed.title : ''))); }
  await fr.evaluate(() => { G.setSpeed(1); G.select(null); G.camHome(); }); await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(__dirname, 'town.png') });
  console.log(errs.slice(0, 6).join('\n') || 'no errors');
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
