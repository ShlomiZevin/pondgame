const { chromium } = require('../../plaxzy-creator/node_modules/playwright-core');
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 820 } });
  await page.goto('http://localhost:8787/dev?user=bench' + Date.now() + '&ai=0', { waitUntil: 'load' });
  await page.waitForTimeout(3000);
  const fr = page.frames().find((f) => f !== page.mainFrame());
  await fr.locator('#tBegin').click();
  await fr.evaluate(() => G.setSpeed(64));
  await page.waitForTimeout(40000);
  console.log(await fr.evaluate(() => {
    G.setSpeed(0.0001);
    const cv = document.createElement('canvas'); cv.width = 400; cv.height = 400; const ctx = cv.getContext('2d');
    const L = G.W.cre; let t0 = performance.now(), n = 0;
    for (let k = 0; k < 5; k++) for (const c of L) { ctx.save(); ctx.translate(200, 200); G.form.draw(ctx, c.g.f, k * 0.3, { swim: 0.5 }); ctx.restore(); n++; }
    ctx.getImageData(0, 0, 1, 1);
    const live = (performance.now() - t0) / n;
    t0 = performance.now(); n = 0;
    for (let k = 0; k < 5; k++) for (const c of L) { ctx.save(); ctx.translate(200, 200); G.form.drawRig(ctx, c.g.f, k * 0.3, { swim: 0.5 }); ctx.restore(); n++; }
    ctx.getImageData(0, 0, 1, 1);
    const spr = (performance.now() - t0) / n;
    let rules = 0; for (const c of L) rules += c.g.f.rules.length;
    return 'pop ' + L.length + ' | live draw ' + live.toFixed(3) + ' ms each | puppet ' + spr.toFixed(3) + ' ms each | avg growths ' + (rules / L.length).toFixed(1);
  }));
  await browser.close();
})();
