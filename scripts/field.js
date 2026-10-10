// The star as a place with order: grounds, formations, lots, the two colours, a fight with weapons, the cards.   node scripts/field.js   (no AI: free)
const { chromium } = require('../../plaxzy-creator/node_modules/playwright-core');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1500, height: 950 } });
  const errs = []; page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message)); page.on('console', (m) => { if (m.type() === 'error' && !/404|413/.test(m.text())) errs.push('CONSOLE ' + m.text().slice(0, 240)); });
  await page.goto((process.env.BASE || 'http://localhost:8787') + '/dev?user=field' + Date.now() + '&ai=0', { waitUntil: 'load' });
  await page.waitForTimeout(2500);
  const fr = page.frames().find((f) => f !== page.mainFrame());
  await fr.locator('#tBegin').click(); await page.waitForTimeout(1200);
  const shot = async (name) => { await page.waitForTimeout(600); await page.screenshot({ path: path.join(__dirname, 'field-' + name + '.png') }); console.log('shot ' + name); };
  const ff = (secs) => fr.evaluate((s) => { for (let t = 0; t < s; t += 0.1) G.step(0.1); }, secs);
  const sxy = (x, y) => fr.evaluate(([x, y]) => { const v = G.view; return { x: x * v.scale + v.ox, y: y * v.scale + v.oy }; }, [x, y]);
  await fr.evaluate(() => { while (G.W.gen < 8) G.step(0.1); const c = G.colony(); c.peace = true; Object.assign(c.want, { g: 6, b: 4, f: 8, u: 3 }); c.stock = [30, 30, 30, 8]; G.setSpeed(1); G.camHome(); G.select(null); });
  await ff(45); await fr.evaluate(() => { G.camHome(); G.select(null); }); await shot('1-whole-star');
  await fr.evaluate(() => { const h = G.heartOf(G.W); G.focusOn(h.x + 120, h.y + 150, 1.5); G.cam.z = 1.5; G.applyCam(); }); await shot('2-base-close');
  console.log('grounds: ' + await fr.evaluate(() => JSON.stringify((G.W.grounds || []).map((g) => g.name + ' ' + g.n + (g.z ? ' high' : ' low')))) + ' · at their place: ' + await fr.evaluate(() => { const L = G.W.cre.filter((c) => !c.dead && !c.team && c.slot); return L.filter((c) => Math.hypot(c.x - c.slot.x, c.y - c.slot.y) < 14).length + ' of ' + L.length; }));
  // choosing with the right button: one, then a box; a left click sends them
  const f1 = await fr.evaluate(() => { const c = G.W.cre.filter((q) => !q.dead && !q.team && q.job === 'f')[0], p = G.cmd.pos(c), v = G.view; return { x: p.x * v.scale + v.ox, y: p.y * v.scale + v.oy }; });
  await page.mouse.click(f1.x, f1.y, { button: 'right' }); await page.waitForTimeout(300); console.log('right-click chose: ' + await fr.evaluate(() => G.cmd.sel.length));
  const vp = page.viewportSize(); await page.mouse.move(vp.width * 0.35, vp.height * 0.3); await page.mouse.down({ button: 'right' }); await page.mouse.move(vp.width * 0.8, vp.height * 0.75, { steps: 6 }); await page.screenshot({ path: path.join(__dirname, 'field-3a-box.png') }); await page.mouse.up({ button: 'right' }); await page.waitForTimeout(300);
  console.log('right-drag chose: ' + await fr.evaluate(() => G.cmd.sel.length) + ' · ' + await fr.locator('#selWhat').textContent());
  await fr.locator('#cmd [data-all="f"]').click(); await page.mouse.click(vp.width * 0.72, vp.height * 0.7); await page.waitForTimeout(300); console.log('left-click sent: ' + await fr.locator('#cmdTip').textContent());
  await ff(14); await shot('3-moved-muster');
  await page.mouse.move(vp.width * 0.5, vp.height * 0.5); await page.mouse.down(); await page.mouse.move(vp.width * 0.4, vp.height * 0.45, { steps: 4 }); await page.mouse.up(); console.log('left-drag moved the view: cam ' + await fr.evaluate(() => Math.round(G.cam.x) + ',' + Math.round(G.cam.y)));
  await page.mouse.click(vp.width * 0.6, vp.height * 0.3, { button: 'right' }); await page.waitForTimeout(200); console.log('right-click on bare ground: chosen ' + await fr.evaluate(() => G.cmd.sel.length));
  // lots
  await fr.evaluate(() => { G.camHome(); }); await fr.locator('#cmd [data-build="house"]').click(); await page.mouse.move(vp.width * 0.55, vp.height * 0.62); await shot('4-lots');
  for (const [fx, fy] of [[0.55, 0.62], [0.66, 0.62], [0.44, 0.62]]) { await fr.locator('#cmd [data-build="house"]').click().catch(() => {}); if (!(await fr.evaluate(() => G.cmd.placing))) await fr.locator('#cmd [data-build="house"]').click(); await page.mouse.move(vp.width * fx, vp.height * fy); await page.mouse.click(vp.width * fx, vp.height * fy); await page.waitForTimeout(200); }
  console.log('ordered: ' + await fr.evaluate(() => JSON.stringify(G.colony().queue.map((q) => q.name + '@' + Math.round(q.x) + ',' + Math.round(q.y))) + ' deed ' + (G.W.deed ? G.W.deed.title : '-')));
  await ff(150); await fr.evaluate(() => { G.camHome(); }); await shot('5-houses-in-a-row');
  // cards
  const nd = await fr.evaluate(() => { const q = G.lumenNodes(G.W).filter((n) => n.n > 0)[0]; G.focusOn(q.x, q.y - 40, 1.6); const v = G.view; return { x: q.x * v.scale + v.ox, y: (q.y - 20) * v.scale + v.oy }; });
  await page.waitForTimeout(300); await page.mouse.click(nd.x, nd.y); await shot('6-lumen-card');
  await fr.locator('#rescard [data-act="send"]').click(); await page.waitForTimeout(200); console.log('card send: ' + await fr.locator('#cmdTip').textContent());
  await fr.locator('#res0').click(); await shot('6b-stone-card');
  await fr.evaluate(() => G.cmd.cardClose());
  // a raid: the fight
  await fr.evaluate(() => { G.camHome(); const c = G.colony(); c.rally = null; c.peace = false; const r = G.raidWarn(null, 7); r.landGen = G.W.gen; for (let t = 0; t < 400 && c.raid.state === 'warn'; t += 0.1) G.step(0.1); });
  await fr.evaluate(() => { const c = G.colony(); for (let t = 0; t < 60 && c.raid && c.raid.state === 'land'; t += 0.1) G.step(0.1); for (let t = 0; t < 4; t += 0.1) G.step(0.1); G.camHome(); }); await shot('7-raid-whole-star');
  let n = 0; for (let k = 0; k < 40 && n < 2; k++) { await ff(0.5); const hot = await fr.evaluate(() => { const L = G.W.cre.filter((c) => !c.dead && c.swT !== undefined && G.W.t - c.swT < 0.25); if (!L.length) return 0; let x = 0, y = 0; G.W.cre.filter((c) => c.team === 1 && !c.dead).forEach((c, i, A) => { x += c.x / A.length; y += c.y / A.length; }); G.cam.z = 2.1; G.focusOn(x, y - 20, 2.1); return L.length; }); if (hot) { n++; await page.waitForTimeout(80); await page.screenshot({ path: path.join(__dirname, 'field-8-fight-' + n + '.png') }); console.log('shot fight ' + n + ' (' + hot + ' swinging)'); } }
  await fr.evaluate(() => { G.cam.x += 900; G.applyCam(); }); await shot('9-fight-out-of-sight');
  await fr.evaluate(() => { const e = G.W.cre.filter((c) => c.team === 1 && !c.dead)[0]; if (e) { G.cmd.clear(); G.focusOn(e.x, e.y, 1.8); G.select(e); } }); await shot('10-enemy-card');
  console.log(errs.slice(0, 8).join('\n') || 'no errors');
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
