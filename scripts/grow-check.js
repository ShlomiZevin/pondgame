// Do they build for the size of their colony, by themselves? A star is left to itself (no orders, no raids) and what stands on it is counted as its numbers grow.
// Also pictured: the build buttons, and what one says when the pointer is on it.   node scripts/grow-check.js   (no AI: free)
const { chromium } = require('../../plaxzy-creator/node_modules/playwright-core');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  const errs = []; page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message)); page.on('console', (m) => { if (m.type() === 'error' && !/404|413/.test(m.text())) errs.push('CONSOLE ' + m.text().slice(0, 200)); });
  await page.goto((process.env.BASE || 'http://localhost:8787') + '/dev?user=grow' + Date.now() + '&ai=0', { waitUntil: 'load' }); await page.waitForTimeout(2500);
  const fr = page.frames().find((f) => f !== page.mainFrame());
  await fr.locator('#tBegin').click(); await page.waitForTimeout(1200);
  await fr.evaluate(() => { while (G.W.gen < 9) G.step(0.1); const c = G.colony(); c.peace = true; Object.assign(c.want, { g: 6, b: 5, f: 2, u: 1 }); G.setSpeed(1); G.camHome(); });
  await page.waitForTimeout(2500);
  // the buttons, and one of them under the pointer
  await fr.locator('#cmd [data-build="huts"]').hover(); await page.waitForTimeout(700);
  console.log('buttons: ' + await fr.evaluate(() => Array.from(document.querySelectorAll('#cmd [data-build] span')).map((e) => e.textContent).join(' · ')) + ' | under the pointer: ' + await fr.locator('#cmdTip').textContent());
  await page.screenshot({ path: path.join(__dirname, 'grow-0-buttons.png'), clip: { x: 0, y: 150, width: 420, height: 520 } });
  await page.mouse.move(700, 400);
  for (const upTo of [20, 35, 50]) {
    const r = await fr.evaluate((g) => { let guard = 0; while (G.W.gen < g && guard++ < 400000) G.step(0.1); const W = G.W, by = {}; (W.works || []).forEach((w) => { if (!w.bp) return; const k = w.tower ? 'tower' : w.bp.type; by[k] = (by[k] || 0) + 1; });
      return 'gen ' + W.gen + ' · alive ' + W.cre.filter((c) => !c.dead && !c.team).length + ' · buildings ' + (W.works || []).length + ' ' + JSON.stringify(by) + ' · kinds of 10 or more: ' + W.species.filter((s) => !s.extinct && s.n >= 10).length; }, upTo);
    console.log(r);
  }
  // where the free are, over a minute: by their home, at the meeting place, feeding, on the way, or nowhere in particular
  console.log('the free, over a minute: ' + await fr.evaluate(() => { const W = G.W, T = { home: 0, meeting: 0, garden: 0, feeding: 0, moving: 0, adrift: 0, asleep: 0 }; let n = 0; for (let k = 0; k < 30; k++) { for (let t = 0; t < 2; t += 0.1) G.step(0.1); const halls = (W.works || []).filter((w) => w.bp && w.bp.type === 'hall');
      W.cre.forEach((c) => { if (c.dead || c.team || c.job || c.inShip) return; n++; const hm = G.homeOf(W, c); if (c.asleep) T.asleep++; else if (hm && Math.hypot(c.x - hm.x, c.y - hm.y - 30) < 125) T.home++; else if (halls.some((h) => Math.hypot(c.x - h.x, c.y - h.y - h.bp.S * 0.45 - 40) < 170)) T.meeting++; else if (G.feedPlaces(W).some((g) => g.k === 'garden' && Math.hypot(c.x - g.x, (c.y - g.y) / 0.8) < g.r + 20)) T.garden++; else if (G.siteAt(W, c.x, c.y, 20)) T.feeding++; else if (Math.hypot(c.vx, c.vy) > 18) T.moving++; else T.adrift++; }); }
    return Object.keys(T).map((k) => k + ' ' + Math.round(100 * T[k] / Math.max(1, n)) + '%').join(' · '); }));
  console.log('names: ' + await fr.evaluate(() => (G.W.works || []).map((w) => w.name).join(', ')));
  await fr.evaluate(() => { G.camHome(); G.select(null); }); await page.waitForTimeout(2500); await page.screenshot({ path: path.join(__dirname, 'grow-1-star.png') });
  console.log(errs.slice(0, 6).join('\n') || 'no errors'); await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
