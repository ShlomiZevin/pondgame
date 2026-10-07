// Leaving and coming back: after a refresh, and after the tab was hidden for a while, the pond must be the same pond:
// the same number of creatures, the same size of pond, the same generation and things.  node scripts/comeback.js   (no AI: free)
const { chromium } = require('../../plaxzy-creator/node_modules/playwright-core');
const path = require('path');
const BASE = process.env.BASE || 'http://localhost:8787', user = 'comeback' + Date.now();
const state = (fr) => fr.evaluate(() => ({ gen: G.W.gen, alive: G.W.cre.length + G.W.births.length, pond: Math.round(G.W.ww) + 'x' + Math.round(G.W.wh), things: G.W.zones.map((z) => z.word).join(','), kinds: G.W.species.filter((s) => !s.extinct && s.n > 0).length, marvels: G.W.cre.filter((c) => c.g.mv).length }));
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 860 } });
  let page = await ctx.newPage();
  const errs = []; page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message));
  await page.goto(BASE + '/dev?user=' + user + '&ai=0', { waitUntil: 'load' });
  await page.waitForTimeout(2500);
  let fr = page.frames().find((f) => f !== page.mainFrame());
  await fr.locator('#tBegin').click(); await page.waitForTimeout(1200);
  await fr.evaluate(() => G.setSpeed(64)); await page.waitForTimeout(45000);
  await fr.evaluate(() => { G.setSpeed(1); const W = G.W; G.addZone(W.ww * 0.3, W.wh * 0.5, { name: 'Gleam Swarm', props: { poison: 0.7, eats: 0.3 }, hue: 300, radius: 80, life: 300 }); G.addZone(W.ww * 0.7, W.wh * 0.6, JSON.parse(JSON.stringify(G.HAVEN))); if (!G.marvelsAlive()) G.grantMarvel(); });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: path.join(__dirname, 'comeback-1-before.png') });
  // 1. the tab is hidden for a while and shown again (the page is not reloaded)
  const a0 = await state(fr);
  const bg = await ctx.newPage(); await bg.goto('about:blank'); await bg.bringToFront(); await page.waitForTimeout(30000); await page.bringToFront(); await page.waitForTimeout(1500);
  const a1 = await state(fr);
  console.log('before hiding the tab  ' + JSON.stringify(a0)); console.log('after 30 s hidden      ' + JSON.stringify(a1));
  // 2. a refresh
  await fr.evaluate(() => G.setSpeed(0)); const b0 = await state(fr);
  await page.reload({ waitUntil: 'load' }); await page.waitForTimeout(5000);
  fr = page.frames().find((f) => f !== page.mainFrame());
  const btn = fr.locator('#tContinue, #tResume, button:has-text("CONTINUE")').first();
  if (await btn.count()) { await btn.click(); await page.waitForTimeout(1500); }
  await fr.evaluate(() => G.setSpeed(0)); const b1 = await state(fr);
  console.log('before the refresh     ' + JSON.stringify(b0)); console.log('after the refresh      ' + JSON.stringify(b1));
  await page.screenshot({ path: path.join(__dirname, 'comeback-2-after.png') });
  // 3. the page is left (closed) and opened again
  await fr.evaluate(() => G.setSpeed(1)); await page.waitForTimeout(3000); await fr.evaluate(() => G.setSpeed(0)); const c0 = await state(fr);
  await page.close(); await bg.waitForTimeout(3000);
  page = await ctx.newPage(); page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message));
  await page.goto(BASE + '/dev?user=' + user + '&ai=0', { waitUntil: 'load' }); await page.waitForTimeout(5000);
  fr = page.frames().find((f) => f !== page.mainFrame());
  const btn2 = fr.locator('#tContinue, #tResume, button:has-text("CONTINUE")').first();
  if (await btn2.count()) { await btn2.click(); await page.waitForTimeout(1500); }
  await fr.evaluate(() => G.setSpeed(0)); const c1 = await state(fr);
  console.log('before leaving         ' + JSON.stringify(c0)); console.log('after coming back      ' + JSON.stringify(c1));
  console.log(errs.join('\n') || 'no errors');
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
