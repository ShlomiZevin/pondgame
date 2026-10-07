// Everything drawn in the pond can be clicked: a thing, the marvels' garden, something built, a wall, a running plan.  node scripts/click.js   (no AI: free)
const { chromium } = require('../../plaxzy-creator/node_modules/playwright-core');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 860 } });
  const errs = []; page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message)); page.on('console', (m) => { if (m.type() === 'error' && !/404/.test(m.text())) errs.push('CONSOLE ' + m.text().slice(0, 200)); });
  await page.goto((process.env.BASE || 'http://localhost:8787') + '/dev?user=click' + Date.now() + '&ai=0', { waitUntil: 'load' });
  await page.waitForTimeout(2500);
  const fr = page.frames().find((f) => f !== page.mainFrame());
  await fr.locator('#tBegin').click(); await page.waitForTimeout(1200);
  await fr.evaluate(() => G.setSpeed(64)); await page.waitForTimeout(9000); await fr.evaluate(() => G.setSpeed(1));
  // one of each, put where nothing else is
  await fr.evaluate(() => {
    const W = G.W;
    const z = G.addZone(W.ww * 0.3, W.wh * 0.7, JSON.parse(JSON.stringify(G.HAVEN))); z.r = z.r0;
    const f = G.addField(G.cleanFields([{ name: 'Coral Ring', stuff: 'rock', shape: 'ring', x: 0.7, y: 0.7, r: 0.1, width: 0.1, solid: true, life: 200 }])[0]);
    (W.works = W.works || []).push({ name: 'Shell Tower', looks: 'a tall tower of stacked shells', x: W.ww * 0.7, y: W.wh * 0.7, r: 80, until: W.t + 200, by: 'Nimton Paddler', hue: 40, field: f ? f.id : 0, plan: 'The Great Stacking', what: 'they set out to pile shells into a tower', why: 'to have somewhere to hide from the hunters', gen: W.gen });
    window._pts = { garden: [z.x, z.y - 20], work: [W.ww * 0.7, W.wh * 0.7], wall: [W.ww * 0.7 + 0.1 * Math.min(W.ww, W.wh), W.wh * 0.7] };
  });
  await page.waitForTimeout(600);
  for (const k of ['garden', 'work', 'wall']) {
    const got = await fr.evaluate((k) => { const p = _pts[k], hit = G.thingAt(p[0], p[1]); G.select(null); G.selectThing(hit); return hit ? hit.k : 'nothing'; }, k);
    await page.waitForTimeout(900);
    const txt = (await fr.locator('#zcard').innerText()).replace(/\n+/g, ' | ').slice(0, 330);
    console.log(k + ' -> ' + got + ' :: ' + txt);
    if (k === 'work') await page.screenshot({ path: path.join(__dirname, 'click-1-work.png') });
  }
  console.log(errs.join('\n') || 'no errors');
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
