// Typed beings, drawn by the AI as puppets:  node scripts/figures.js [tag] "a knight with a sword" "a cat" ...
// Drops each word into a pond, waits for its drawing, and saves the pond and a sheet of the drawings at two moments of their movement.
const { chromium } = require('../../plaxzy-creator/node_modules/playwright-core');
const path = require('path');
const tag = process.argv[2] || 'a', words = process.argv.slice(3).length ? process.argv.slice(3) : ['a human knight with a sword', 'a cat', 'a dragon'];
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 820 } });
  const errs = []; page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message));
  await page.goto((process.env.BASE || 'http://localhost:8787') + '/dev?user=fig' + Date.now(), { waitUntil: 'load' });
  await page.waitForTimeout(3000);
  const fr = page.frames().find((f) => f !== page.mainFrame());
  await fr.locator('#tBegin').click(); await page.waitForTimeout(1500);
  const made = await fr.evaluate(async (words) => {
    const W = G.W, out = [];
    for (let i = 0; i < words.length; i++) {
      const info = await G.ai.ask('thing', words[i]);
      const z = G.addZone(W.ww * (0.3 + 0.2 * i), W.wh * 0.5, info);
      out.push(z.word + (z.look ? ' (a being)' : ' (NOT a being: ' + (info.note || '') + ')'));
    }
    return out;
  }, words);
  console.log('dropped: ' + made.join(' · '));
  for (let i = 0; i < 70; i++) { await page.waitForTimeout(3000); const left = await fr.evaluate(() => G.W.zones.filter((z) => z.look && z._fig === undefined).length); if (!left) break; }
  console.log(await fr.evaluate(() => G.W.zones.map((z) => z.word + ': ' + (z._fig ? z._fig.parts.map((p) => p.id).join(',') + (z._fig.floats ? ' · floats' : '') : z._fig === null ? 'no drawing' : 'still waiting')).join('\n') + '\ncost: ' + JSON.stringify(G.ai.count.figure || {}) + ' thing ' + JSON.stringify(G.ai.count.thing || {})));
  await fr.evaluate(() => { const z = G.W.zones[Math.floor(G.W.zones.length / 2)]; G.focusOn(z.x, z.y, 1.5); });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(__dirname, 'figures-' + tag + '-pond.png') });
  for (let shot = 0; shot < 2; shot++) {
    await fr.evaluate((shot) => {
      let cv = document.getElementById('sheet'); if (!cv) { cv = document.createElement('canvas'); cv.id = 'sheet'; cv.width = 1440; cv.height = 820; cv.style.cssText = 'position:fixed;left:0;top:0;z-index:99999'; document.body.appendChild(cv); }
      const ctx = cv.getContext('2d'); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#0b2733'; ctx.fillRect(0, 0, 1440, 820);
      const Z = G.W.zones.filter((z) => z._fig);
      Z.forEach((z, i) => { const x = 240 + (i % 3) * 480, y = 380 + Math.floor(i / 3) * 400; ctx.save(); ctx.translate(x, y); ctx.scale(1.4, 1.4); G.drawFigure(ctx, z._fig, shot ? Object.assign({}, z, { bite: 1 }) : z, 0.4 + shot * 0.9); ctx.restore(); ctx.fillStyle = '#f6d365'; ctx.font = '700 16px system-ui'; ctx.textAlign = 'center'; ctx.fillText(z.word + (shot ? ' (striking)' : ''), x, y + 34); });
    }, shot);
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(__dirname, 'figures-' + tag + '-' + (shot + 1) + '.png') });
  }
  console.log(errs.slice(0, 5).join('\n') || 'no errors');
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
