// Does a pond come back whole? Every living creature must be in the save and back after loading it.  node scripts/save-all.js   (no AI: free)
const { chromium } = require('../../plaxzy-creator/node_modules/playwright-core');
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 860 } });
  const errs = []; page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message));
  await page.goto((process.env.BASE || 'http://localhost:8787') + '/dev?user=saveall' + Date.now() + '&ai=0', { waitUntil: 'load' });
  await page.waitForTimeout(2500);
  const fr = page.frames().find((f) => f !== page.mainFrame());
  await fr.locator('#tBegin').click(); await page.waitForTimeout(1200);
  await fr.evaluate(() => G.setSpeed(64)); await page.waitForTimeout(60000); await fr.evaluate(() => G.setSpeed(0));
  console.log(JSON.stringify(await fr.evaluate(() => {
    const t0 = performance.now(), o = G.collectSave(), ms = Math.round(performance.now() - t0), W0 = G.W, alive = W0.cre.length, unborn = W0.births.length, gen = W0.gen;
    const hues = W0.cre.map((c) => Math.round(c.g.t[0] * 10)).sort().join(',');
    const txt = JSON.stringify(o), back = JSON.parse(txt);
    const ok = G.validSave(back); G.applySave(back);
    const hues2 = G.W.cre.map((c) => Math.round(c.g.t[0] * 10)).sort().join(',');
    return { gen, alive, unborn, inSave: G.saveCre(o).length, packedChars: (o.creZ || '').length, plainChars: JSON.stringify(G.saveCre(o)).length, saveBytes: txt.length, collectMs: ms, valid: ok, aliveAfterLoad: G.W.cre.length, sameSizes: unborn ? 'n/a' : hues === hues2, genAfter: G.W.gen };
  })));
  console.log(errs.join('\n') || 'no errors');
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
