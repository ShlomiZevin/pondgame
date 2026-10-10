// The stars: the map of space with rivals and free stars marked, a star's card, an attack on a rival (landing, their Heart, breaking it), and an outpost.
// node scripts/stars.js   (no AI: free)
const { chromium } = require('../../plaxzy-creator/node_modules/playwright-core');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1500, height: 950 } });
  const errs = []; page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message)); page.on('console', (m) => { if (m.type() === 'error' && !/404|413/.test(m.text())) errs.push('CONSOLE ' + m.text().slice(0, 240)); });
  await page.goto((process.env.BASE || 'http://localhost:8787') + '/dev?user=stars' + Date.now() + '&ai=0', { waitUntil: 'load' });
  await page.waitForTimeout(2500);
  const fr = page.frames().find((f) => f !== page.mainFrame());
  await fr.locator('#tBegin').click(); await page.waitForTimeout(1200);
  const shot = async (name) => { await page.waitForTimeout(600); await page.screenshot({ path: path.join(__dirname, 'stars-' + name + '.png') }); console.log('shot ' + name); };
  const ff = (secs) => fr.evaluate((s) => { for (let t = 0; t < s; t += 0.1) G.step(0.1); }, secs);
  await fr.evaluate(() => { while (G.W.gen < 8) G.step(0.1); const c = G.colony(); c.peace = true; Object.assign(c.want, { g: 6, b: 3, f: 8, u: 0 }); c.stock[3] = 12; G.setSpeed(1); G.camHome(); });
  await ff(30);
  // a ship standing ready on the land (how one is built is shown by scripts/voyage.js)
  await fr.evaluate(() => { const H = G.W, bp = G.blueprintFrom({ seed: 5, type: 'ship', S: 70, hue: 40, spiky: 0, brain: 0.5, wet: false }, '2'.repeat(40)); H.works.push({ name: 'Test Ship', looks: '', x: H.ww * 0.8, y: G.shoreY(H) - 60, r: 60, by: 'test', hue: 40, sp: 0, bp, until: 1e9, field: 0, gen: H.gen, plan: '' }); });
  await shot('0-home');
  // 1. out into space: the stars, marked
  await fr.evaluate(() => { G.voyagePick(); }); await page.waitForTimeout(2600); await shot('1-space');
  { const at = await fr.evaluate(() => { const r = G.rivals()[0], v = G.view, W = G.W, F = G.far, jt = F.jit(r.i, r.j), cs = (W.wh) * 3.2; return { z: G.cam.z }; }); console.log('space zoom ' + at.z.toFixed(3)); }
  await fr.evaluate(() => { G.voyageOff && G.voyageOff(); const b = document.getElementById('voyCancel'); if (b) b.click(); });
  // 2. a rival's card
  const rv = await fr.evaluate(() => { const r = G.rivals()[0]; return { i: r.i, j: r.j, name: r.name, key: r.key }; });
  console.log('rival: ' + JSON.stringify(rv) + ' · ' + await fr.evaluate(() => JSON.stringify(G.rivals().map((q) => q.name + ':' + G.starOf(q).terrain.id))));
  // 3. the attack: sent as the mission would send it
  await fr.evaluate((rv) => { G.camHome(); const F = G.far, ship = F.shipOf(), p = F.cell(rv.i, rv.j); F.warTo = rv.key; const crew = F.crewFor(ship); F.sail(p, crew, ship); }, rv);
  await page.waitForTimeout(1500); await ff(12); await shot('2-landed-on-rival');
  await fr.evaluate(() => { const h = G.foeHeart(G.W); G.focusOn(h.x, h.y + 40, 1.3); }); await page.waitForTimeout(500); await shot('3-their-heart');
  // more of yours, as a second ship would bring; then: choose all fighters, right-click their Heart
  await fr.evaluate(() => { const W = G.W, h = G.foeHeart(W), mine = W.cre.filter((c) => !c.dead && !c.team), best = mine.slice().sort((a, b) => G.jobFit(b, 'f') - G.jobFit(a, 'f'))[0]; for (let i = 0; i < 6; i++) { const c = G.dropCreature(best.g, h.x + 260 + i * 16, h.y + 110); c.line = 1; } G.assign(W.cre.filter((c) => !c.dead && !c.team), 'f'); });
  await fr.locator('#cmd [data-all="f"]').click(); await page.waitForTimeout(300);
  const hp = await fr.evaluate(() => { const h = G.foeHeart(G.W), v = G.view; return { x: h.x * v.scale + v.ox, y: h.y * v.scale + v.oy }; });
  await page.mouse.click(hp.x, hp.y, { button: 'right' }); await page.waitForTimeout(400); console.log('tip: ' + await fr.locator('#cmdTip').textContent());
  await ff(10); await shot('4-breaking-it');
  const took = await fr.evaluate(() => { let t = 0; for (; t < 300 && G.foeHeart(G.W); t += 0.1) G.step(0.1); return Math.round(t) + ' s more · held ' + JSON.stringify(G.starsHeld().map((s) => s.name)) + ' · owed ' + G.far.owed.join(','); });
  console.log('their Heart: ' + took); await page.waitForTimeout(900); await shot('5-taken');
  await ff(40); await fr.evaluate(() => { const h = G.heartOf(G.W); if (h) G.focusOn(h.x, h.y + 40, 1.2); }); await shot('6-your-heart-rising');
  await fr.locator('#tb-now').click(); await page.waitForTimeout(300); const sp = fr.locator('#rarebox [data-tab="space"]'); if (await sp.count()) await sp.first().click(); await shot('7-now-space');
  console.log(errs.slice(0, 8).join('\n') || 'no errors');
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
