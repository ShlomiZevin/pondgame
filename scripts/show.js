// The core loop, on the real server: throw a bad thing in, watch the pond answer; AI-drawn species appear.
//   node scripts/show.js [seconds] [speed]
const { chromium } = require('../../plaxzy-creator/node_modules/playwright-core');
const path = require('path');
const BASE = process.env.BASE || 'http://localhost:8787';
const out = (n) => path.join(__dirname, 'show-' + n + '.png');
const secs = +process.argv[2] || 80, speed = +process.argv[3] || 16;
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 820 } });
  const errs = [];
  page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message));
  await page.goto(BASE + '/dev?user=show' + Date.now(), { waitUntil: 'load' });
  await page.waitForTimeout(3000);
  const fr = page.frames().find((f) => f !== page.mainFrame());
  await fr.locator('#tBegin').click();
  await fr.evaluate((s) => G.setSpeed(s), speed);
  await page.waitForTimeout(8000);
  await fr.evaluate(() => G.setSpeed(1));
  await fr.locator('#tb-add').click();
  await fr.locator('#wordIn').fill('alien amoeba that eats creatures');
  await fr.locator('#wordGo').click();
  await fr.waitForFunction(() => !!G.ui.placing, null, { timeout: 45000 }).catch(() => {});
  await page.mouse.click(620, 430);
  await page.waitForTimeout(500);
  console.log('thing:', await fr.evaluate(() => { const z = G.W.zones[0]; return z ? z.word + ' | eats ' + z.p.eats.toFixed(2) + ' moves ' + z.p.moves.toFixed(2) + ' | weak to ' + G.WEAK[z.weak].text : 'none'; }));
  await fr.evaluate((s) => G.setSpeed(s), speed);
  const t0 = Date.now();
  let shot = 0;
  while (Date.now() - t0 < secs * 1000) {
    await page.waitForTimeout(20000);
    console.log(await fr.evaluate(() => { const W = G.W; const z = W.zones.filter(G.isBad)[0]; const v = z ? G.versus(z) : null; return 'gen ' + W.gen + ' pop ' + W.cre.length + ' | looks ' + W.species.filter((s) => s.skin).length + '/' + G.liveSpeciesCount() + (v ? ' | vs ' + z.word + ': carry ' + Math.round(v.carry * 100) + '% bear ' + Math.round(v.adapt * 100) + '% its strength ' + Math.round(v.left * 100) + '%' : ' | no bad thing left') + ' | AI ' + JSON.stringify(G.ai.totals()); }));
    if (++shot === 2) { await fr.evaluate(() => G.setSpeed(1)); await page.waitForTimeout(800); await page.screenshot({ path: out('mid') }); await fr.evaluate((s) => G.setSpeed(s), speed); }
  }
  await fr.evaluate(() => G.setSpeed(1));
  await page.waitForTimeout(1200);
  await page.screenshot({ path: out('end') });
  await fr.evaluate(() => { G.select(null); G.openTree(); });
  await page.waitForTimeout(900);
  await page.screenshot({ path: out('kinds') });
  console.log('discoveries:', (await fr.evaluate(() => G.W.discLog.slice(-6).map((d) => d.text))).join(' | ').slice(0, 500));
  console.log(errs.slice(0, 5).join('\n') || 'no errors');
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
