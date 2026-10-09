// The buildings as they stand in a living pond, and what drawing them costs.  node scripts/build-pond.js   (no AI: free)
const { chromium } = require('../../plaxzy-creator/node_modules/playwright-core');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 860 } });
  const errs = []; page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message)); page.on('console', (m) => { if (m.type() === 'error' && !/404|413/.test(m.text())) errs.push('CONSOLE ' + m.text().slice(0, 240)); });
  await page.goto((process.env.BASE || 'http://localhost:8787') + '/dev?user=bpond' + Date.now() + '&ai=0', { waitUntil: 'load' });
  await page.waitForTimeout(2500);
  const fr = page.frames().find((f) => f !== page.mainFrame());
  await fr.locator('#tBegin').click(); await page.waitForTimeout(1200);
  await fr.evaluate(() => G.setSpeed(16));
  for (let i = 0; i < 12; i++) { await page.waitForTimeout(15000); const n = await fr.evaluate(() => (G.W.works || []).filter((w) => w.bp).length); if (n >= 7) break; }
  // a building going up, if one is: the pieces are still set one by one
  const going = await fr.evaluate(() => { const d = G.W.deed; if (d && d.bp) { G.setSpeed(1); G.focusOn(d.x, d.y - 20, 2.2); return d.title + ' ' + G.buildCount(d).join('/'); } return ''; });
  if (going) { await page.waitForTimeout(1500); await page.screenshot({ path: path.join(__dirname, 'build-pond-0-going-up.png') }); console.log('going up: ' + going); }
  console.log(await fr.evaluate(() => { G.setSpeed(1); G.select(null); const Wk = (G.W.works || []).filter((w) => w.bp); let x = 0, y = 0; Wk.forEach((w) => { x += w.x; y += w.y; }); if (Wk.length) G.focusOn(x / Wk.length, y / Wk.length - 30, 1.25); return 'gen ' + G.W.gen + ', ' + Wk.length + ' buildings: ' + Wk.map((w) => w.name + ' [' + w.bp.type + (w.bp.wet === false ? ', land' : ', water') + ', ' + G.buildCount(w).join('/') + ']').join(' · '); }));
  await page.waitForTimeout(1500); await page.screenshot({ path: path.join(__dirname, 'build-pond-1.png') });
  for (let i = 0; i < 3; i++) { const ok = await fr.evaluate((i) => { const Wk = (G.W.works || []).filter((w) => w.bp).sort((a, b) => b.bp.P.length - a.bp.P.length), w = Wk[i]; if (!w) return false; G.focusOn(w.x, w.y - 30, 2.6); return true; }, i); if (!ok) break; await page.waitForTimeout(900); await page.screenshot({ path: path.join(__dirname, 'build-pond-b' + i + '.png'), clip: { x: 320, y: 110, width: 800, height: 600 } }); }
  // what a frame costs with them all in view
  const ms = await fr.evaluate(() => new Promise((res) => { G.camHome(); let n = 0, t0 = performance.now(), worst = 0, last = t0; const f = () => { const now = performance.now(); worst = Math.max(worst, now - last); last = now; if (++n < 90) requestAnimationFrame(f); else res(((now - t0) / n).toFixed(1) + ' ms a frame on average, worst ' + worst.toFixed(0) + ' ms, kept pictures ' + (G.W.works || []).filter((w) => w.bp && w.bp._cv).length); }; requestAnimationFrame(f); }));
  console.log('drawing: ' + ms);
  const meas = () => fr.evaluate(() => new Promise((res) => { let n = 0, t0 = performance.now(); const f = () => { if (++n < 60) requestAnimationFrame(f); else res(((performance.now() - t0) / n).toFixed(1)); }; requestAnimationFrame(f); }));
  console.log('  again, same view: ' + await meas() + ' ms');
  await fr.evaluate(() => { window._wk = G.W.works; G.W.works = []; }); console.log('  with no buildings at all: ' + await meas() + ' ms'); await fr.evaluate(() => { G.W.works = _wk; });
  await fr.evaluate(() => { window._pd = G.pieceDraw; G.W.works.forEach((w) => { if (w.bp) { w.bp._cv = null; w.bp._sig = ''; } }); const d0 = G.drawBlueprint; window._d0 = d0; G.drawBlueprint = function (ctx, o, b) { return d0(ctx, o, true); }; }); console.log('  drawn piece by piece every frame (no kept pictures): ' + await meas() + ' ms'); await fr.evaluate(() => { G.drawBlueprint = _d0; });
  await fr.evaluate(() => { G.setSpeed(0); }); console.log('  paused, buildings kept: ' + await meas() + ' ms');
  console.log(errs.slice(0, 6).join('\n') || 'no errors');
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
