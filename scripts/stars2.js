// More of the strategy game, seen: the title, a rival's card on the map of space, a tower striking raiders, and founding an outpost.
// node scripts/stars2.js   (no AI: free)
const { chromium } = require('../../plaxzy-creator/node_modules/playwright-core');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1500, height: 950 } });
  const errs = []; page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message)); page.on('console', (m) => { if (m.type() === 'error' && !/404|413/.test(m.text())) errs.push('CONSOLE ' + m.text().slice(0, 240)); });
  await page.goto((process.env.BASE || 'http://localhost:8787') + '/dev?user=stars2' + Date.now() + '&ai=0', { waitUntil: 'load' });
  await page.waitForTimeout(2500);
  const fr = page.frames().find((f) => f !== page.mainFrame());
  const shot = async (name) => { await page.waitForTimeout(600); await page.screenshot({ path: path.join(__dirname, 'stars2-' + name + '.png') }); console.log('shot ' + name); };
  const ff = (secs) => fr.evaluate((s) => { for (let t = 0; t < s; t += 0.1) G.step(0.1); }, secs);
  await shot('0-title');
  await fr.locator('#tBegin').click(); await page.waitForTimeout(1200);
  await fr.evaluate(() => { while (G.W.gen < 8) G.step(0.1); const c = G.colony(); c.peace = true; Object.assign(c.want, { g: 6, b: 3, f: 5, u: 0 }); c.stock[3] = 12; G.setSpeed(1); G.camHome(); });
  await ff(30);
  await fr.evaluate(() => { const H = G.W, bp = G.blueprintFrom({ seed: 5, type: 'ship', S: 70, hue: 40, spiky: 0, brain: 0.5, wet: false }, '2'.repeat(40)); H.works.push({ name: 'Test Ship', looks: '', x: H.ww * 0.8, y: G.shoreY(H) - 60, r: 60, by: 'test', hue: 40, sp: 0, bp, until: 1e9, field: 0, gen: H.gen, plan: '' }); });
  // 1. a rival's card
  await fr.evaluate(() => { G.voyagePick(); }); await page.waitForTimeout(2600);
  await page.mouse.click(261, 525); await page.waitForTimeout(700); await shot('1-rival-card');
  console.log('card: ' + (await fr.locator('#farcard').textContent()).replace(/\s+/g, ' ').slice(0, 420));
  await fr.evaluate(() => { const b = document.getElementById('farClose'); if (b) b.click(); const c = document.getElementById('voyCancel'); if (c) c.click(); if (G.goHome) G.goHome(); }); await page.waitForTimeout(1800);
  // 2. a tower by the Heart, and raiders
  await fr.evaluate(() => { const W = G.W, h = G.heartOf(W), bp = G.blueprintFrom({ seed: 31, type: 'spire', S: 80, hue: 200, spiky: 0, brain: 0.7, wet: true }, '2'.repeat(40)); W.works.push({ name: 'Tower', looks: 'a watchtower', x: h.x + 190, y: h.y + 150, r: 70, by: 'your builders', hue: 200, sp: W.species[0].id, bp, until: 1e9, field: 0, gen: W.gen, plan: 'Tower', tower: 1 });
    const al = W.cre.filter((c) => !c.dead && !c.team), big = al.slice().sort((a, b) => G.jobFit(b, 'f') - G.jobFit(a, 'f'))[al.length >> 2]; for (let i = 0; i < 5; i++) { const c = G.foeDrop(big.g, h.x + 330 + i * 20, h.y + 190, 1); c.E = c.ph.Emax * 0.7; } G.focusOn(h.x + 150, h.y + 130, 1.7); G.select(null); });
  await page.waitForTimeout(1500); await fr.evaluate(() => { const h = G.heartOf(G.W); G.cam.z = 1.7; G.focusOn(h.x + 150, h.y + 130, 1.7); });
  let z = 0; for (let k = 0; k < 14 && !z; k++) { await ff(0.4); z = await fr.evaluate(() => (G.W.works.filter((w) => w.tower)[0].zaps || 0)); if (z) { await page.waitForTimeout(60); await page.screenshot({ path: path.join(__dirname, 'stars2-2-tower.png') }); } }
  await ff(12); console.log('tower: ' + await fr.evaluate(() => { const t = G.W.works.filter((w) => w.tower)[0]; return (t.zaps || 0) + ' strokes, ' + (t.kills || 0) + ' struck down; enemies left ' + G.W.cre.filter((c) => c.team === 1 && !c.dead).length; })); await shot('2b-tower-later');
  // 3. an outpost on a free star
  const free = await fr.evaluate(() => { const F = G.far; for (let i = -3; i <= 3; i++) for (let j = -3; j <= 3; j++) { const p = F.cell(i, j); if (p && !p.free && !p.rival) return { i, j, name: p.name }; } return null; });
  await fr.evaluate((free) => { G.W.cre = G.W.cre.filter((c) => c.team !== 1); G.camHome(); const F = G.far, ship = F.shipOf(), p = F.cell(free.i, free.j); F.sail(p, F.crewFor(ship), ship); }, free);
  await page.waitForTimeout(1500); await ff(12); await shot('3-free-star');
  await fr.locator('#cmd [data-found]').click(); await page.waitForTimeout(500); await ff(40);
  await fr.evaluate(() => { const h = G.heartOf(G.W); if (h) G.focusOn(h.x, h.y + 60, 1.2); }); await shot('4-outpost');
  console.log('outpost: ' + await fr.evaluate(() => JSON.stringify({ held: G.starsHeld().map((s) => s.name), heart: G.heartOf(G.W) ? G.buildCount(G.heartOf(G.W)).join('/') : 'none', jobs: G.jobCount(G.W) })));
  console.log(errs.slice(0, 8).join('\n') || 'no errors');
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
