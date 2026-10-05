// Every screen, opened and photographed, plus a reload:  node scripts/screens.js [seconds at 64x]   (SOUND=1 also asks for one sound)
const { chromium } = require('../../plaxzy-creator/node_modules/playwright-core');
const path = require('path');
const BASE = process.env.BASE || 'http://localhost:8787';
const secs = +process.argv[2] || 70, user = 'screens' + Date.now();
const shot = (page, n) => page.screenshot({ path: path.join(__dirname, 'screen-' + n + '.png') });
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 820 } });
  const errs = [];
  page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message));
  await page.goto(BASE + '/dev?user=' + user + (process.env.NOAI ? '&ai=0' : ''), { waitUntil: 'load' });
  await page.waitForTimeout(3000);
  let fr = page.frames().find((f) => f !== page.mainFrame());
  await fr.locator('#tBegin').click();
  await fr.evaluate(() => G.setSpeed(64));
  await page.waitForTimeout(secs * 1000);
  await fr.evaluate(() => { G.setSpeed(1); G.cam.z = 1.6; G.applyCam(); });
  await page.waitForTimeout(1200);
  // the inspector: click the most elaborate creature
  await fr.evaluate(() => { const L = G.W.cre.slice().sort((a, b) => b.g.f.rules.length + b.g.p.length - a.g.f.rules.length - a.g.p.length); const c = L[0]; G.focusOn(c.x, c.y, 2.2); G.select(c); });
  await page.waitForTimeout(1200);
  await shot(page, '1-inspector');
  // the family tree
  await fr.evaluate(() => G.openTree()); await page.waitForTimeout(1500); await shot(page, '2-tree');
  await fr.evaluate(() => G.closeModal());
  await page.waitForTimeout(400);
  // the Book of Life: every tab
  await fr.evaluate(() => G.openGuide()); await page.waitForTimeout(900);
  await fr.evaluate(() => { const L = G.W.species.filter((s) => !s.extinct && s.n > 0).sort((a, b) => b.n - a.n).slice(0, 5); for (const s of L) { const c = G.W.cre.find((x) => x.sp === s.id); if (c) G.keep(c); } });
  for (const t of ['hist', 'live', 'coll', 'disc', 'organ', 'story']) { const b = fr.locator('#gdTabs button[data-t="' + t + '"]'); if (await b.count()) { await b.click(); await page.waitForTimeout(700); await shot(page, '3-book-' + t); } }
  await fr.evaluate(() => G.closeModal());
  await page.waitForTimeout(300);
  if (process.env.SOUND) { await fr.evaluate(() => G.emit('placed', { name: 'bubbling spring', note: 'a soft spring of bubbles' })); await page.waitForTimeout(16000); console.log('sound:', await fr.evaluate(() => JSON.stringify(G.ai.count.sound || 'not asked'))); }
  await fr.evaluate(() => G.showCosts()); await page.waitForTimeout(500); await shot(page, '4-costs');
  const before = await fr.evaluate(() => { if (G.saveNow) G.saveNow(); const W = G.W; return { gen: W.gen, pop: W.cre.length, ages: W.ages.length, designs: W.designs.map((d) => d.name).join(','), kinds: (W.kinds || []).slice(0, 2).map((k) => k[0]).join(','), life: JSON.stringify(G.ai.life).length, segs: W.cre.reduce((a, c) => a + c.g.f.n, 0) / W.cre.length }; });
  console.log('before reload', JSON.stringify(before));
  await page.waitForTimeout(4000);
  // come back as the same player
  await page.goto(BASE + '/dev?user=' + user + (process.env.NOAI ? '&ai=0' : ''), { waitUntil: 'load' });
  await page.waitForTimeout(5000);
  fr = page.frames().find((f) => f !== page.mainFrame());
  await shot(page, '5-reloaded-title');
  const btn = (await fr.locator('#tCont:not(.hide)').count()) ? fr.locator('#tCont') : fr.locator('#tBegin'); console.log('title button:', await btn.textContent()); await btn.click(); await page.waitForTimeout(2500);
  const after = await fr.evaluate(() => { const W = G.W; return { gen: W.gen, pop: W.cre.length, ages: W.ages.length, designs: W.designs.map((d) => d.name).join(','), kinds: (W.kinds || []).slice(0, 2).map((k) => k[0]).join(','), life: JSON.stringify(G.ai.life).length, segs: W.cre.length ? W.cre.reduce((a, c) => a + c.g.f.n, 0) / W.cre.length : 0 }; });
  console.log('after reload ', JSON.stringify(after));
  await fr.evaluate(() => { const b = document.querySelector('.overlay button'); if (b && /close|ok|continue/i.test(b.textContent)) b.click(); });
  await page.waitForTimeout(800); await shot(page, '6-reloaded-pond');
  console.log(errs.slice(0, 6).join('\n') || 'no errors');
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
