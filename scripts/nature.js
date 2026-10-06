// What the pond does by itself, invented by the AI:  node scripts/nature.js [how many]
const { chromium } = require('../../plaxzy-creator/node_modules/playwright-core');
const N = +process.argv[2] || 2;
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errs = []; page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message));
  await page.goto((process.env.BASE || 'http://localhost:8787') + '/dev?user=nature' + Date.now(), { waitUntil: 'load' });
  await page.waitForTimeout(3000);
  const fr = page.frames().find((f) => f !== page.mainFrame());
  await fr.locator('#tBegin').click();
  await fr.evaluate(() => { for (const k of ['wishcheck', 'watch', 'plan', 'design', 'organ', 'story', 'figure', 'marvel', 'wish']) G.ai.caps[k] = 0; G.ai.gaps.nature = 0; G.setSpeed(64); });
  await page.waitForTimeout(16000);
  await fr.evaluate(() => G.setSpeed(1));
  for (let i = 0; i < N; i++) {
    const before = await fr.evaluate(() => (G.W.events || []).length);
    // make nature's turn come now, through the game's own tick (so this tests the real path)
    await fr.evaluate(() => { const W = G.W, r = G.rand; W.natureGen = W.gen - 60; W.natureBusy = false; G.rand = () => 0; try { G.natureTick(W.gen); } finally { G.rand = r; } });
    let got = null;
    for (let t = 0; t < 45 && !got; t++) { await page.waitForTimeout(1500); got = await fr.evaluate((before) => { const W = G.W; if ((W.events || []).length <= before) return null; const e = W.events[W.events.length - 1]; return e.name + ' — ' + e.note + '\n   fields: ' + ((W.fields || []).map((f) => f.name + ' [' + f.stuff + ' ' + f.shape + ': ' + (G.fieldWords(f) || '-') + ']').join(' · ') || 'none') + ' · strikes queued: ' + (W.strikes || []).length + ' · weather: ' + (W.mods || []).map((m) => m.fx || '-').join(','); }, before); }
    console.log((i + 1) + '. ' + (got || 'nothing came'));
    await page.waitForTimeout(3000);
  }
  console.log('cost: ' + await fr.evaluate(() => JSON.stringify(G.ai.count.nature || {})));
  console.log(errs.slice(0, 4).join('\n') || 'no errors');
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
