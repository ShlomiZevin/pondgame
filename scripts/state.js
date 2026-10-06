// Run a pond fast for a while and report what the watcher has done.  node scripts/state.js [seconds]
const { chromium } = require('../../plaxzy-creator/node_modules/playwright-core');
const secs = +process.argv[2] || 60;
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
  const logs = []; page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') logs.push(m.type() + ': ' + m.text().slice(0, 200)); }); page.on('pageerror', (e) => logs.push('PAGEERROR ' + e.message));
  await page.goto((process.env.BASE || 'http://localhost:8787') + '/dev?user=state' + Date.now(), { waitUntil: 'load' });
  await page.waitForTimeout(2500);
  const fr = page.frames().find((f) => f !== page.mainFrame());
  await fr.locator('#tBegin').click(); await fr.evaluate(() => G.setSpeed(64));
  for (let t = 0; t < secs; t += 15) {
    await page.waitForTimeout(15000);
    console.log(await fr.evaluate(() => { const W = G.W, B = W.eyeBank || []; const m = (f) => (B.length ? B.reduce((a, e) => a + f(e), 0) / B.length : 0); const live = W.cre.length ? W.cre.reduce((a, c) => a + c.ph.whole, 0) / W.cre.length : 0; return 'gen ' + W.gen + ' eyeN ' + (W.eyeN || 0) + ' bank ' + B.length + ' hall ' + (W.hall || []).length + ' bank marks beauty ' + m((e) => e.b).toFixed(2) + ' whole ' + m((e) => e.w).toFixed(2) + ' | belief whole ' + live.toFixed(2) + ' wb ' + W.taste.wb.toFixed(2) + ' | watch asked ' + ((G.ai.count.watch || {}).asked || 0) + ' $' + ((G.ai.count.watch || {}).usd || 0).toFixed(3); }));
  }
  console.log(logs.slice(0, 8).join('\n') || 'no console errors');
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
