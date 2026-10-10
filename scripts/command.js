// The strategy screen: the resource bar, the trades, selecting and ordering, building, and a raid.   node scripts/command.js   (no AI: free)
const { chromium } = require('../../plaxzy-creator/node_modules/playwright-core');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1500, height: 950 } });
  const errs = []; page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message)); page.on('console', (m) => { if (m.type() === 'error' && !/404|413/.test(m.text())) errs.push('CONSOLE ' + m.text().slice(0, 240)); });
  await page.goto((process.env.BASE || 'http://localhost:8787') + '/dev?user=cmd' + Date.now() + '&ai=0', { waitUntil: 'load' });
  await page.waitForTimeout(2500);
  const fr = page.frames().find((f) => f !== page.mainFrame());
  await fr.locator('#tBegin').click(); await page.waitForTimeout(1200);
  const shot = async (name) => { await page.waitForTimeout(500); await page.screenshot({ path: path.join(__dirname, 'command-' + name + '.png') }); console.log('shot ' + name); };
  const ff = (secs) => fr.evaluate((s) => { for (let t = 0; t < s; t += 0.1) G.step(0.1); }, secs);
  await fr.evaluate(() => { while (G.W.gen < 8) G.step(0.1); });
  await shot('0-start');
  // the whole star in view
  await fr.evaluate(() => { G.camHome(); G.setSpeed(1); });
  // 1. ask for trades with the + buttons of the colony panel
  for (const [k, n] of [['g', 8], ['b', 4], ['f', 5], ['u', 2]]) for (let i = 0; i < n; i++) await fr.locator('#cmd [data-want="' + k + '"][data-d="1"]').click();
  await ff(40); await shot('1-working');
  // 2. drag a box round the middle of the star: those in it are chosen
  await fr.evaluate(() => { G.select(null); G.camHome(); });
  const vp = page.viewportSize(); await page.mouse.move(vp.width * 0.42, vp.height * 0.35); await page.mouse.down(); await page.mouse.move(vp.width * 0.62, vp.height * 0.62, { steps: 6 }); await page.screenshot({ path: path.join(__dirname, 'command-2a-box.png') }); await page.mouse.up();
  await shot('2-chosen'); console.log('chosen: ' + await fr.evaluate(() => G.cmd.sel.length) + ' · ' + await fr.locator('#selWhat').textContent());
  // 3. make them gatherers, then send them to a lumen crystal with a right click
  await fr.locator('#selbar button[data-job="g"]').click();
  const node = await fr.evaluate(() => { const q = G.lumenNodes(G.W).filter((n) => n.n > 0)[0], v = G.view; return q ? { x: q.x * v.scale + v.ox, y: q.y * v.scale + v.oy } : null; });
  if (node) { await page.mouse.click(node.x, node.y, { button: 'right' }); await page.waitForTimeout(300); await shot('3-ordered'); console.log('tip: ' + await fr.locator('#cmdTip').textContent()); }
  // 4. choose all fighters by the name of their trade; right-click a place: their rally point
  await fr.locator('#cmd [data-all="f"]').click(); await page.mouse.click(vp.width * 0.7, vp.height * 0.45, { button: 'right' }); await ff(12); await shot('4-rally'); console.log('tip: ' + await fr.locator('#cmdTip').textContent());
  // 5. build: a house, placed with a click
  await fr.evaluate(() => { G.select(null); G.cmd.clear(); G.camHome(); }); await page.waitForTimeout(200);
  await fr.locator('#cmd [data-build="house"]').click(); await page.mouse.move(vp.width * 0.5, vp.height * 0.72); await page.waitForTimeout(200); await shot('5-placing');
  const spot = await fr.evaluate(() => { const W = G.W, v = G.view, sy = G.shoreY(W); for (let k = 0; k < 600; k++) { const x = 260 + Math.random() * (W.ww - 520), y = sy + 270 + Math.random() * (W.wh - sy - 380); if (!G.buildOk('house', x, y)) return { x: x * v.scale + v.ox, y: y * v.scale + v.oy }; } return null; });
  if (spot) { await page.mouse.move(spot.x, spot.y); await page.waitForTimeout(150); await page.mouse.click(spot.x, spot.y); await page.waitForTimeout(300); await shot('5b-ordered'); await ff(45); await shot('6-built'); }
  // 6. a raid, as the game sends it: the warning, the ship coming down, the raiders at the Heart, and how it ends
  await fr.evaluate(() => { G.select(null); G.cmd.clear(); G.camHome(); const r = G.colony().raid || G.raidWarn(null, 6); if (r.state === 'warn') r.landGen = G.W.gen; }); await page.waitForTimeout(900); await shot('7-warned');
  await fr.evaluate(() => { for (let t = 0; t < 400 && G.colony().raid.state === 'warn'; t += 0.1) G.step(0.1); for (let t = 0; t < 2.2; t += 0.1) G.step(0.1); const r = G.colony().raid; G.focusOn(r.x, r.y - 60, 1.5); }); await page.waitForTimeout(700); await shot('8-landing');
  await fr.evaluate(() => { for (let t = 0; t < 5; t += 0.1) G.step(0.1); }); await page.waitForTimeout(600); await shot('9-stepping-out');
  await fr.evaluate(() => { for (let t = 0; t < 14; t += 0.1) G.step(0.1); G.cmd.seeFoes(); }); await page.waitForTimeout(700); await shot('10-at-the-heart');
  await fr.locator('#tb-now').click(); await page.waitForTimeout(400); await shot('11-now-panel'); await fr.locator('#tb-now').click();
  const end = await fr.evaluate(() => { let how = ''; G.on('raid-over', (r, h) => { how = h; }); for (let t = 0; t < 200 && G.colony().raid; t += 0.1) G.step(0.1); return how + ' · fell ' + (G.colony().fell || 0) + ' · stock ' + G.colony().stock.join(','); });
  console.log('the raid: ' + end); await page.waitForTimeout(800); await shot('12-after');
  console.log(JSON.stringify(await fr.evaluate(() => ({ gen: G.W.gen, jobs: G.jobCount(), stock: G.colony().stock, heart: !!G.heartOf() }))));
  console.log(errs.slice(0, 8).join('\n') || 'no errors');
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
