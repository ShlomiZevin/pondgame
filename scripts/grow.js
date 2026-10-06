// The pond grows as its creatures do:  node scripts/grow.js [seconds at x64, default 150]
// Prints, as it goes: generation, creatures, how much of the water bodies cover, how many times its first size the pond is.
const { chromium } = require('../../plaxzy-creator/node_modules/playwright-core');
const path = require('path');
const secs = +process.argv[2] || 150;
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 820 } });
  const errs = []; page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message));
  await page.goto((process.env.BASE || 'http://localhost:8787') + '/dev?user=grow' + Date.now(), { waitUntil: 'load' });
  await page.waitForTimeout(3000);
  const fr = page.frames().find((f) => f !== page.mainFrame());
  await fr.locator('#tBegin').click();
  await fr.evaluate(() => { for (const k of Object.keys(G.ai.caps)) G.ai.caps[k] = 0; G.ai.gaps.deed = 1e9; G.ai.gaps.marvel = 1e9; G.setSpeed(64); });
  for (let t = 0; t < secs; t += 15) {
    await page.waitForTimeout(15000);
    console.log(await fr.evaluate(() => { const W = G.W; let r = 0; W.cre.forEach((c) => { r += c.ph.r; }); return 'gen ' + W.gen + ' · ' + W.cre.length + ' creatures · mean r ' + (r / Math.max(1, W.cre.length)).toFixed(1) + ' · food ' + W.food.length + ' · cover ' + (G.pondCover() * 100).toFixed(1) + '% · pond x' + (G.view.grow || 1).toFixed(2) + ' (' + Math.round(W.ww) + ' by ' + Math.round(W.wh) + ')'; }));
    if (t === 0 || t + 15 >= secs) { await fr.evaluate(() => { G.setSpeed(1); G.cam.z = 1; G.applyCam(); }); await page.waitForTimeout(1500); await page.screenshot({ path: path.join(__dirname, 'grow-' + (t === 0 ? 'start' : 'end') + '.png') }); await fr.evaluate(() => G.setSpeed(64)); }
  }
  console.log(errs.slice(0, 5).join('\n') || 'no errors');
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
