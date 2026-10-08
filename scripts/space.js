// Beyond the pond: zooming out into space, the far ponds, the way home.  node scripts/space.js   (no AI: free)
const { chromium } = require('../../plaxzy-creator/node_modules/playwright-core');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 860 } });
  const errs = []; page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message)); page.on('console', (m) => { if (m.type() === 'error' && !/404/.test(m.text())) errs.push('CONSOLE ' + m.text().slice(0, 200)); });
  await page.goto((process.env.BASE || 'http://localhost:8787') + '/dev?user=space' + Date.now() + '&ai=0', { waitUntil: 'load' });
  await page.waitForTimeout(2500);
  const fr = page.frames().find((f) => f !== page.mainFrame());
  await fr.locator('#tBegin').click(); await page.waitForTimeout(1200);
  await fr.evaluate(() => G.setSpeed(64)); await page.waitForTimeout(25000); await fr.evaluate(() => G.setSpeed(1));
  const shot = (n) => page.screenshot({ path: path.join(__dirname, 'space-' + n + '.png') });
  const btn = () => fr.evaluate(() => !document.getElementById('gohome').classList.contains('hide'));
  await fr.evaluate(() => { G.select(null); G.cam.z = 0.6; G.applyCam(); }); await page.waitForTimeout(700); await shot('1-edge');
  console.log('home button, pond filling half the screen: ' + await btn());
  await fr.evaluate(() => { G.cam.z = 2.5; G.cam.x = G.view.ww * 0.1; G.cam.y = G.view.wh * 0.2; G.applyCam(); }); await page.waitForTimeout(500);
  console.log('home button, zoomed in on a corner of my pond: ' + await btn());
  await fr.evaluate(() => { G.cam.z = 0.09; G.cam.x = G.view.ww / 2; G.cam.y = G.view.wh / 2; G.applyCam(); }); await page.waitForTimeout(700); await shot('2-out');
  // where the far ponds are, before and after the pond grows
  const where = () => fr.evaluate(() => { const v = G.view, cs = Math.max(v.ww, v.wh) / (v.grow || 1) * 8; return { pond: Math.round(v.ww) + 'x' + Math.round(v.wh), cell: Math.round(cs), centre: Math.round(v.ww / 2) + ',' + Math.round(v.wh / 2) }; });
  const a = await where(); await fr.evaluate(() => G.pondGrowTo((G.view.grow || 1) * 1.5)); await page.waitForTimeout(400); const b = await where();
  console.log('before growing ' + JSON.stringify(a) + ' · after ' + JSON.stringify(b) + ' · spacing of far ponds unchanged: ' + (a.cell === b.cell));
  // fly to a far pond by clicking it
  const tgt = await fr.evaluate(() => { const v = G.view; G.cam.z = 0.09; G.cam.x = v.ww / 2; G.cam.y = v.wh / 2; G.applyCam(); const cs = Math.max(v.ww, v.wh) / (v.grow || 1) * 8; for (let r = 1; r < 4; r++) for (let i = -r; i <= r; i++) for (let j = -r; j <= r; j++) { const sx = v.w / 2 + i * cs * v.scale, sy = v.h / 2 + j * cs * v.scale; } return null; });
  await fr.evaluate(() => { let n = 0; G.on('pond-click', () => n++); const v = G.view, W = G.W; const step = 30; for (let sx = 0; sx < v.w && !document.getElementById('farcard').offsetHeight; sx += step) for (let sy = 0; sy < v.h; sy += step) { const wx = (sx - v.ox) / v.scale, wy = (sy - v.oy) / v.scale; if (wx > 0 && wx < W.ww && wy > 0 && wy < W.wh) continue; G.emit('pond-click', { x: wx, y: wy }); if (!document.getElementById('farcard').classList.contains('hide')) return; } });
  await page.waitForTimeout(1700); await shot('3-farpond');
  console.log('far pond card: ' + (await fr.locator('#farcard').innerText()).replace(/\n+/g, ' | ').slice(0, 200));
  console.log('home button at a far pond: ' + await btn() + ' · ' + (await fr.locator('#gohome').innerText()).replace(/\n+/g, ' '));
  await fr.locator('#gohome').click(); await page.waitForTimeout(1600);
  console.log('after BACK TO MY POND: ' + JSON.stringify(await fr.evaluate(() => ({ z: +G.cam.z.toFixed(2), atHome: Math.abs(G.cam.x - G.view.ww / 2) < 2, button: !document.getElementById('gohome').classList.contains('hide') }))));
  console.log(errs.slice(0, 6).join('\n') || 'no errors');
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
