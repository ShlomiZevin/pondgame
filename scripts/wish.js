// The wish, live:  node scripts/wish.js [tag] [seconds]
// Starts a pond, waits for the pond's wish, lets it evolve, and reports how close the creatures get and whether it comes true.
const { chromium } = require('../../plaxzy-creator/node_modules/playwright-core');
const path = require('path');
const tag = process.argv[2] || 'a', secs = +process.argv[3] || 240;
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 820 } });
  const errs = []; page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message)); page.on('console', (m) => { if (m.type() === 'error' && !/404/.test(m.text())) errs.push('CONSOLE ' + m.text().slice(0, 200)); });
  await page.goto((process.env.BASE || 'http://localhost:8787') + '/dev?user=' + (process.env.WHO || 'wish' + Date.now()), { waitUntil: 'load' });
  await page.waitForTimeout(3000);
  const fr = page.frames().find((f) => f !== page.mainFrame());
  await fr.locator('#tBegin').click();
  for (let i = 0; i < 20; i++) { await page.waitForTimeout(2000); if (await fr.evaluate(() => !!G.wish.cur)) break; }
  console.log(await fr.evaluate(() => { const w = G.wish.cur; return w ? 'WISH (level ' + G.wish.level + '): ' + w.title + ' — ' + w.text + '\n  needs: ' + w.needs.join(' | ') + '\n  hint: ' + w.hint : 'no wish arrived'; }));
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(__dirname, 'wish-' + tag + '-1.png') });
  await fr.evaluate(() => G.setSpeed(16));
  let shot = false;
  for (let t = 0; t < secs; t += 15) {
    await page.waitForTimeout(15000);
    const s = await fr.evaluate(() => { const S = G.wish; return 'gen ' + G.W.gen + ' · level ' + S.level + ' · ' + (S.cur ? S.cur.title : '(dreaming)') + ' · ' + (S.best ? 'closest ' + S.best.close + '/10: ' + S.best.why : 'not looked yet') + ' · legends ' + S.legends.length + ' · checks ' + ((G.ai.count.wishcheck || {}).fresh || 0); });
    console.log(s);
    if (!shot && / legends [1-9]/.test(s)) { shot = true; await fr.evaluate(() => G.setSpeed(1)); await page.waitForTimeout(800); await page.screenshot({ path: path.join(__dirname, 'wish-' + tag + '-2-true.png') }); await fr.evaluate(() => G.setSpeed(16)); }
    if (errs.length) break;
  }
  await fr.evaluate(() => { G.setSpeed(1); document.getElementById('wish').click(); });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(__dirname, 'wish-' + tag + '-3-open.png') });
  console.log(await fr.evaluate(() => 'LEGENDS: ' + G.wish.legends.map((l) => l.title + ' → ' + l.name + ' (' + l.why + ')').join(' | ') + '\nCOLLECTION: ' + G.collection.map((c) => c.name + ' [' + c.age + ']').join(' | ') + '\nCOST: wish ' + JSON.stringify(G.ai.count.wish || {}) + ' · checks ' + JSON.stringify(G.ai.count.wishcheck || {})));
  console.log(errs.slice(0, 5).join('\n') || 'no errors');
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
