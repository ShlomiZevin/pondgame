// Things that act: a knight that strikes, a cannon that shoots, a dragon that hunts, a healer.  node scripts/acts.js   (no AI: the plain-word fallback, free)
const { chromium } = require('../../plaxzy-creator/node_modules/playwright-core');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 860 } });
  const errs = []; page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message)); page.on('console', (m) => { if (m.type() === 'error' && !/404|413/.test(m.text())) errs.push('CONSOLE ' + m.text().slice(0, 240)); });
  await page.goto((process.env.BASE || 'http://localhost:8787') + '/dev?user=acts' + Date.now() + '&ai=0', { waitUntil: 'load' });
  await page.waitForTimeout(2500);
  const fr = page.frames().find((f) => f !== page.mainFrame());
  await fr.locator('#tBegin').click(); await page.waitForTimeout(1200);
  await fr.evaluate(() => G.setSpeed(64)); await page.waitForTimeout(12000); await fr.evaluate(() => G.setSpeed(1));
  // through the game's own ADD (typed words): what the pond makes of each
  const made = await fr.evaluate(() => { const W = G.W, out = [], n = {}; G.on('act', (z, q) => { n[z.word + ' ' + q.do] = (n[z.word + ' ' + q.do] || 0) + 1; }); window._n = n;
    [['knight', 0.3, 0.6], ['cannon', 0.7, 0.6], ['dragon', 0.5, 0.8], ['healer', 0.5, 0.45]].forEach((q) => { const t = G.clampThing({ name: q[0].charAt(0).toUpperCase() + q[0].slice(1), props: { light: 0.1 }, source: 'table', radius: 70, life: 220, hue: 20 + 80 * out.length }); const z = G.addZone(W.ww * q[1], W.wh * q[2], t); out.push(q[0] + ' -> ' + (z.act ? z.act.way + ', ' + z.act.side + ', ' + z.act.acts.map((a) => a.do).join('+') : 'does nothing of its own')); });
    return out; });
  console.log(made.join(' | '));
  const before = await fr.evaluate(() => G.W.cre.length);
  await fr.evaluate(() => { G.select(null); G.camHome(); }); await page.waitForTimeout(6000);
  await page.screenshot({ path: path.join(__dirname, 'acts-1.png') });
  await fr.evaluate(() => G.setSpeed(4)); await page.waitForTimeout(20000); await fr.evaluate(() => G.setSpeed(1));
  console.log('what they did: ' + JSON.stringify(await fr.evaluate(() => _n)));
  console.log('creatures ' + before + ' -> ' + await fr.evaluate(() => G.W.cre.length) + ' · things: ' + await fr.evaluate(() => G.W.zones.map((z) => z.word + (z.act ? ' (struck down ' + (z.deaths || 0) + ', life ' + Math.round(z.life) + ')' : '')).join(', ')));
  await fr.evaluate(() => { const z = G.W.zones.find((q) => q.act && q.act.acts[0].do === 'strike'); if (z) { G.selectZone(z); G.focusOn(z.x, z.y, 2); } }); await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(__dirname, 'acts-2.png') });
  console.log('card: ' + (await fr.locator('#zcard').innerText()).replace(/\n+/g, ' | ').slice(0, 520));
  console.log(errs.slice(0, 6).join('\n') || 'no errors');
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
