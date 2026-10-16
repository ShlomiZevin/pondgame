// What a tower does through a raid: its pieces, its strokes, who has turned on it.   node scripts/tower-probe.js   (no AI: free)
const { chromium } = require('../../plaxzy-creator/node_modules/playwright-core');
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  const errs = []; page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message));
  await page.goto((process.env.BASE || 'http://localhost:8787') + '/dev?user=tp' + Date.now() + '&ai=0', { waitUntil: 'load' }); await page.waitForTimeout(2500);
  const fr = page.frames().find((f) => f !== page.mainFrame());
  await fr.locator('#tBegin').click(); await page.waitForTimeout(1200);
  await fr.evaluate(() => { while (G.W.gen < 30) G.step(0.1); const c = G.colony(); c.peace = true; c.share = {}; Object.assign(c.want, { g: 6, b: 4, f: 0, u: 0 }); c.stock = [60, 60, 60, 12]; for (let t = 0; t < 40; t += 0.1) G.step(0.1); G.setSpeed(1);
    c.peace = false; G.W.cre = G.W.cre.filter((q) => q.team !== 1); c.raid = null; const r = G.raidWarn(null, 7); r.landGen = G.W.gen; for (let t = 0; t < 600 && c.raid && c.raid.state === 'warn'; t += 0.1) G.step(0.1); window._t0 = G.W.t; });
  for (let i = 0; i < 40; i++) {
    const s = await fr.evaluate(() => { for (let t = 0; t < 3; t += 0.1) G.step(0.1); const W = G.W, c = G.colony(), h = G.heartOf(W), R = W.cre.filter((q) => q.team === 1 && !q.dead);
      return Math.round(W.t - window._t0) + ' s ' + (c.raid ? c.raid.state : 'over') + ' · raiders ' + R.length + ' (on a tower ' + R.filter((q) => q.raidAt && q.raidAt.tower).length + ', leaving ' + R.filter((q) => q.leave).length + ') E ' + R.map((q) => Math.round(q.E)).join(',') + ' · Heart ' + G.buildCount(h).join('/') + ' · towers ' + (W.works || []).filter((w) => w.tower).map((w) => G.buildCount(w).join('/') + ' zaps ' + (w.zaps || 0) + ' kills ' + (w.kills || 0) + ' at ' + Math.round(Math.hypot(w.x - h.x, w.y - h.y)) + ' nearest raider ' + Math.round(Math.min.apply(null, R.map((q) => Math.hypot(q.x - w.x, q.y - w.y)).concat([9999])))).join(' | ') + (c.raid && c.raid.took ? ' · took ' + c.raid.took.join(',') : '') + ' · store ' + c.stock.join(','); });
    console.log(s); if (/over/.test(s)) break;
  }
  console.log(errs.slice(0, 6).join('\n') || 'no errors'); await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
