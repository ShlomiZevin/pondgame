// Good and bad: the moments the pond offers, a word given, who heard it, and what the ledger says.  node scripts/teach.js   (no AI: free)
const { chromium } = require('../../plaxzy-creator/node_modules/playwright-core');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 860 } });
  const errs = []; page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message)); page.on('console', (m) => { if (m.type() === 'error' && !/404|413/.test(m.text())) errs.push('CONSOLE ' + m.text().slice(0, 240)); });
  await page.goto((process.env.BASE || 'http://localhost:8787') + '/dev?user=teach' + Date.now() + '&ai=0', { waitUntil: 'load' });
  await page.waitForTimeout(2500);
  const fr = page.frames().find((f) => f !== page.mainFrame());
  await fr.locator('#tBegin').click(); await page.waitForTimeout(1200);
  await fr.evaluate(() => G.setSpeed(64)); await page.waitForTimeout(25000); await fr.evaluate(() => { G.setSpeed(4); window._heard = 0; G.on('judged-by-god', (c, g, soft) => { if (soft) _heard++; }); });
  let n = 0;
  for (let i = 0; i < 40 && n < 3; i++) { await page.waitForTimeout(1500); const chip = fr.locator('#moments .mo').first(); if (await chip.count()) { const txt = (await chip.locator('.tx').innerText()).trim(); if (n === 0) await page.screenshot({ path: path.join(__dirname, 'teach-1.png') }); await chip.locator('.g').click(); n++; console.log('moment: "' + txt + '" -> GOOD'); await page.waitForTimeout(400); if (n === 1) await page.screenshot({ path: path.join(__dirname, 'teach-2.png') }); } }
  console.log('moments judged: ' + n + ' · others of their kind who overheard: ' + await fr.evaluate(() => _heard) + ' · ledger: ' + JSON.stringify(await fr.evaluate(() => G.W.taught || {})));
  await fr.evaluate(() => { const c = G.W.cre.filter((x) => !x.dead)[3]; G.select(c); }); await page.waitForTimeout(1200);
  console.log('card says: ' + (await fr.locator('#idoing').innerText()).replace(/\n+/g, ' '));
  await fr.locator('#ibad').click(); await page.waitForTimeout(400);
  await fr.evaluate(() => G.openTaught()); await page.waitForTimeout(700);
  await page.screenshot({ path: path.join(__dirname, 'teach-3.png') });
  console.log(errs.slice(0, 6).join('\n') || 'no errors');
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
