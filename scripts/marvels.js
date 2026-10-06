// Gives marvels to creatures of a fast-grown pond and photographs them.  node scripts/marvels.js [tag]
const { chromium } = require('../../plaxzy-creator/node_modules/playwright-core');
const path = require('path'); const tag = process.argv[2] || 'a';
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1300, height: 760 } });
  const errs = []; page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message));
  await page.goto((process.env.BASE || 'http://localhost:8787') + '/dev?user=marvels' + Date.now() + (process.env.AI ? '' : '&ai=0'), { waitUntil: 'load' });
  await page.waitForTimeout(2500);
  const fr = page.frames().find((f) => f !== page.mainFrame());
  await fr.locator('#tBegin').click(); await fr.evaluate(() => G.setSpeed(64)); await page.waitForTimeout(25000);
  const IDS = (process.env.IDS || '4,6').split(',').map(Number);
  await fr.evaluate((ids) => { document.querySelectorAll('.glass').forEach((e) => { if (e.id !== 'panel') e.style.visibility = e.id === 'iCard' ? '' : e.style.visibility; }); G.setSpeed(1); const W = G.W; window.__C = []; for (const id of ids) { const before = W.cre.filter((c) => c.g.mv).length; G.grantMarvel(id); } }, IDS);
  await page.waitForTimeout(500);
  const info = await fr.evaluate(() => { const c = G.W.cre.filter((x) => x.g.mv); return c.map((x) => x.id + ':' + x.ph.mv.name).join(', ') + ' | collection ' + G.collection.length + ' | banners shown'; });
  console.log(info);
  const pick = (sp) => "(() => { const c = G.W.cre.filter((x) => x.g.mv && x.ph.mvsp === '" + sp + "')[0]; return c; })()";
  for (const [shot, sp] of [[1, 'heal'], [2, 'voice'], [3, '']]) {
    await fr.evaluate(({ sp }) => { let c = G.W.cre.filter((x) => x.g.mv && (!sp || x.ph.mvsp === sp))[0]; if (!c) c = G.W.cre.filter((x) => x.g.mv)[0]; if (c) { G.select(c); G.focusOn(c.x, c.y, 2.4); window.__T = c; } }, { sp });
    console.log(sp + ' ' + await fr.evaluate(() => { const c = window.__T; return c ? 'carrier #' + c.id + ' ' + c.ph.mv.name + ' dead=' + c.dead + ' at ' + Math.round(c.x) + ',' + Math.round(c.y) + ' cam ' + JSON.stringify(G.cam && { x: Math.round(G.cam.x), y: Math.round(G.cam.y), z: +G.cam.z.toFixed(2), tx: G.cam.tx && Math.round(G.cam.tx) }) : 'none'; }));
    if (sp === 'voice') { for (let i = 0; i < 40; i++) { const talking = await fr.evaluate(() => window.__T && window.__T.say); if (talking) break; await page.waitForTimeout(500); } } else await page.waitForTimeout(4500);
    await page.screenshot({ path: path.join(__dirname, 'marvel-' + tag + '-' + shot + '.png'), ...(process.env.FULL ? {} : { clip: { x: 300, y: 130, width: 700, height: 500 } }) });
  }
  console.log(errs.slice(0, 5).join('\n') || 'no errors');
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
