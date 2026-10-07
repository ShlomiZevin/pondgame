// Bites, kills, meals and deaths drawn so they can be read.  node scripts/fx.js   (no AI: free)
const { chromium } = require('../../plaxzy-creator/node_modules/playwright-core');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 860 } });
  const errs = []; page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message)); page.on('console', (m) => { if (m.type() === 'error' && !/404/.test(m.text())) errs.push('CONSOLE ' + m.text().slice(0, 200)); });
  await page.goto((process.env.BASE || 'http://localhost:8787') + '/dev?user=fx' + Date.now() + '&ai=0', { waitUntil: 'load' });
  await page.waitForTimeout(2500);
  const fr = page.frames().find((f) => f !== page.mainFrame());
  await fr.locator('#tBegin').click(); await page.waitForTimeout(1200);
  await fr.evaluate(() => G.setSpeed(64)); await page.waitForTimeout(20000); await fr.evaluate(() => G.setSpeed(1));
  await page.waitForTimeout(500);
  // stage one of each next to each other, so they can be seen in one picture
  await fr.evaluate(() => {
    const W = G.W, C = W.cre.filter((c) => !c.dead).slice(0, 8), cx = W.ww / 2, cy = W.wh / 2;
    const at = [[-260, -60], [-170, -60], [-40, -60], [50, -60], [200, -60], [-260, 110], [-90, 110], [80, 110]];
    C.forEach((c, i) => { c.x = c.px = cx + at[i][0]; c.y = c.py = cy + at[i][1]; c.vx = c.vy = 0; });
    G.focusOn(cx, cy + 10, 2.1); G.setSpeed(0); window._C = C;
  });
  await page.waitForTimeout(700);
  const shot = async (name, wait) => { await page.waitForTimeout(wait); await page.screenshot({ path: path.join(__dirname, name), clip: { x: 300, y: 170, width: 840, height: 520 } }); };
  await fr.evaluate(() => { const C = _C; G.speed = 1; G.emit('fight', C[0], C[1]); G.emit('death', { x: C[3].x - 60, y: C[3].y, ph: { r: 9 }, g: { f: { hue: 300 }, t: [0, 0, 300] }, age: 1 }, 'eaten', C[3]); G.emit('death', { x: C[4].x + 70, y: C[4].y, ph: { r: 11 }, g: { f: { hue: 200 }, t: [0, 0, 200] }, age: 1 }, 'fought', C[4]); G.emit('death', { x: C[5].x + 70, y: C[5].y, ph: { r: 11 }, g: { f: { hue: 200 }, t: [0, 0, 200] }, age: 1 }, 'starved', null); G.emit('ill', C[6]); G.emit('eat', C[7], { x: C[7].x + 50, y: C[7].y - 10, tag: 0 }); G.speed = 0; });
  await shot('fx-1.png', 230);
  await shot('fx-2.png', 260);
  console.log(errs.join('\n') || 'no errors');
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
