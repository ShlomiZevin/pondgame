// The Book's cards and tabs, the scroll bars, the small messages and the left panels, photographed.  node scripts/polish.js   (no AI: free)
const { chromium } = require('../../plaxzy-creator/node_modules/playwright-core');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 860 } });
  const errs = []; page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message));
  await page.goto((process.env.BASE || 'http://localhost:8787') + '/dev?user=polish' + Date.now() + '&ai=0', { waitUntil: 'load' });
  await page.waitForTimeout(2500);
  const fr = page.frames().find((f) => f !== page.mainFrame());
  await fr.locator('#tBegin').click(); await page.waitForTimeout(1200);
  await fr.evaluate(() => G.setSpeed(64)); await page.waitForTimeout(40000);
  await fr.evaluate(() => { G.setSpeed(1); const W = G.W; G.addZone(W.ww * 0.3, W.wh * 0.5, { name: 'Gleam Swarm', props: { poison: 0.7, eats: 0.3 }, hue: 300, radius: 80, life: 300 }); if (!G.marvelsAlive()) G.grantMarvel(); const c = W.cre.find((x) => x.g.mv); if (c) G.select(c); G.note('Evolution invented something', 'First tentacles! Long arms that reach and feel.'); G.banner('It happened', 'A great cold: the water turns bitter cold.', 6000); });
  await page.waitForTimeout(1800);
  const pos = () => fr.evaluate(() => { const r = document.getElementById('rarebox').getBoundingClientRect(), v = document.getElementById('versus').getBoundingClientRect(), s = document.getElementById('season').getBoundingClientRect(); return { rareBottom: Math.round(r.bottom), rareTop: Math.round(r.top), dangersTop: Math.round(v.top), dangersBottom: Math.round(v.bottom), seasonBottom: Math.round(s.bottom) }; });
  console.log('dangers open   ' + JSON.stringify(await pos()));
  await page.screenshot({ path: path.join(__dirname, 'polish-1-pond.png') });
  await fr.locator('#vsHead').click(); await page.waitForTimeout(1200);
  console.log('dangers folded ' + JSON.stringify(await pos()));
  await fr.locator('#rarebox .rk').click(); await page.waitForTimeout(1200);
  console.log('rare toggled   ' + JSON.stringify(await pos()));
  await fr.evaluate(() => { const b = document.querySelector('#gtabs [data-m=body]'); if (b) b.click(); }); await page.waitForTimeout(600); await page.screenshot({ path: path.join(__dirname, 'polish-3-body.png'), clip: { x: 1100, y: 0, width: 340, height: 420 } });
  await fr.evaluate(() => { G.ui.guideTab = 'live'; G.openGuide(); }); await page.waitForTimeout(700);
  await page.screenshot({ path: path.join(__dirname, 'polish-2-book.png') });
  console.log(errs.join('\n') || 'no errors');
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
