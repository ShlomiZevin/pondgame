// Typed things and world events with the real AI, and how they read on screen:  node scripts/things.js
const { chromium } = require('../../plaxzy-creator/node_modules/playwright-core');
const path = require('path');
const BASE = process.env.BASE || 'http://localhost:8787';
const shot = (page, n) => page.screenshot({ path: path.join(__dirname, 'things-' + n + '.png') });
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 820 } });
  const errs = []; page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message));
  await page.goto(BASE + '/dev?user=things' + Date.now() + (process.env.NOAI ? '&ai=0' : ''), { waitUntil: 'load' });
  await page.waitForTimeout(3000);
  const fr = page.frames().find((f) => f !== page.mainFrame());
  await fr.locator('#tBegin').click();
  await fr.evaluate(() => G.setSpeed(64));
  await page.waitForTimeout(35000);
  await fr.evaluate(() => { G.setSpeed(1); G.cam.z = 1.7; G.cam.x = G.W.ww * 0.5; G.cam.y = G.W.wh * 0.55; G.applyCam(); });
  const words = ['handshake monster', 'a plant that eats creatures', 'cloud of poison', 'friendly glowing jellyfish'];
  for (let i = 0; i < words.length; i++) {
    const r = await fr.evaluate(([w, i]) => G.ai.ask('thing', w).then((t) => { const W = G.W, z = G.addZone(W.ww * (0.36 + 0.095 * i), W.wh * (0.45 + 0.2 * (i % 2)), t); return z.word + ' | being: ' + (z.look ? 'yes ' + JSON.stringify(z.look.grow) + ' eyes ' + z.look.eyes : 'no') + ' | ' + (t.source || '') + ' | ' + t.note; }, (e) => 'failed ' + (e && e.message)), [words[i], i]);
    console.log(r);
  }
  await page.waitForTimeout(9000);
  await shot(page, '1-added');
  console.log(await fr.evaluate(() => G.W.zones.map((z) => z.word + ': ' + G.thingStatus(z).t).join('\n')));
  await fr.evaluate(() => G.setSpeed(8)); await page.waitForTimeout(12000); await fr.evaluate(() => G.setSpeed(1)); await page.waitForTimeout(1500);
  await shot(page, '2-later');
  console.log(await fr.evaluate(() => G.W.zones.map((z) => z.word + ': ' + G.thingStatus(z).t).join('\n')));
  for (const text of ['everyone grows wings', 'the water turns to thick mud', 'a plague takes the blind']) {
    const r = await fr.evaluate((text) => { const n0 = G.W.cre.length, e0 = JSON.stringify(G.W.env); return G.ai.ask('event', text).then((ev) => { G.runEvent(ev); return ev.name + ' | ' + ev.note + ' | gift ' + JSON.stringify(ev.gift || null) + ' got ' + (ev.got || 0) + ' | water ' + JSON.stringify(ev.water || null) + ' | kill ' + JSON.stringify(ev.kill) + ' | died ' + (n0 - G.W.cre.length) + ' | things ' + (ev.things || 1); }, (e) => 'failed ' + (e && e.message)); }, text);
    console.log(text, '→', r);
    await page.waitForTimeout(2500);
  }
  await fr.evaluate(() => { G.cam.z = 1.3; G.applyCam(); }); await page.waitForTimeout(1500);
  await shot(page, '3-events');
  console.log(await fr.evaluate(() => 'water now: ' + G.envText(G.W) + ' | cost ' + G.ai.money(G.ai.totals().usd)));
  console.log(errs.slice(0, 5).join('\n') || 'no errors');
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
