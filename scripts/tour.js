// A guided tour of the real game against a running dev server, with screenshots:   node scripts/tour.js [seconds at 64x]
const { chromium } = require('../../plaxzy-creator/node_modules/playwright-core');
const path = require('path');
const BASE = process.env.BASE || 'http://localhost:8787';
const out = (n) => path.join(__dirname, 'tour-' + n + '.png');
const fast = +process.argv[2] || 45;
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 820 } });
  const errs = [];
  page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/favicon|422/.test((m.location().url || '') + m.text())) errs.push(m.text()); });
  await page.goto(BASE + '/dev?user=tour' + Date.now(), { waitUntil: 'load' });
  await page.waitForTimeout(3000);
  const fr = page.frames().find((f) => f !== page.mainFrame());
  await fr.locator('#tBegin').click();
  await page.waitForTimeout(600);
  const state = () => fr.evaluate(() => { const W = G.W; return 'gen ' + W.gen + ' pop ' + W.cre.length + ' species ' + G.liveSpeciesCount() + ' organs ' + W.organs.length + ' [' + W.organs.map((o) => o.name + (o.by ? '*' : '')).join(', ') + '] story ' + (W.story || []).length; });
  // a thing that eats, typed the way a player would
  await fr.locator('#tb-add').click();
  await fr.locator('#wordIn').fill('a plant which eats everything around it');
  await fr.locator('#wordGo').click();
  await fr.waitForFunction(() => !!G.ui.placing, null, { timeout: 45000 }).catch(() => {});
  await page.mouse.click(520, 430);
  await page.waitForTimeout(400);
  await fr.evaluate(() => G.setSpeed(16));
  await page.waitForTimeout(9000);
  await fr.evaluate(() => G.setSpeed(1));
  await page.waitForTimeout(400);
  await fr.evaluate(() => { const z = G.W.zones[0]; if (z) G.selectZone(z); });
  await page.waitForTimeout(900);
  await page.screenshot({ path: out('1-thing') });
  console.log('thing:', await fr.evaluate(() => { const z = G.W.zones[0]; return z ? z.word + ' eats ' + z.p.eats.toFixed(2) + ' alive ' + z.alive + ' ate ' + z.ate + ' health ' + z.health.toFixed(2) : 'none'; }));
  await fr.evaluate(() => G.selectZone(null));
  // a free-text event
  await fr.locator('#tb-world').click();
  await fr.locator('#ui .pop input[type=text]').fill('aliens abduct the biggest ones');
  await page.keyboard.press('Enter');
  await fr.waitForFunction(() => (G.W.events || []).length > 0, null, { timeout: 45000 }).catch(() => {});
  await page.waitForTimeout(700);
  await page.screenshot({ path: out('2-event') });
  console.log('event:', await fr.evaluate(() => JSON.stringify((G.W.events || [])[0] || null)));
  // let it evolve
  await fr.evaluate(() => G.setSpeed(64));
  for (let i = 0; i < Math.ceil(fast / 15); i++) { await page.waitForTimeout(15000); console.log(await state()); }
  await fr.evaluate(() => G.setSpeed(1));
  await page.waitForTimeout(1200);
  await page.screenshot({ path: out('3-evolved') });
  await fr.evaluate(() => { const W = G.W; const c = W.cre.slice().sort((a, b) => b.g.p.length + b.ph.nseg - a.g.p.length - a.ph.nseg)[0]; G.select(c); });
  await page.waitForTimeout(700);
  await page.screenshot({ path: out('4-creature') });
  await fr.evaluate(() => { G.ui.guideTab = 'organ'; G.openGuide(); });
  await page.waitForTimeout(700);
  await page.screenshot({ path: out('5-organs') });
  await fr.evaluate(() => { G.closeModal(); G.ui.guideTab = 'story'; G.openGuide(); });
  await page.waitForTimeout(500);
  await page.screenshot({ path: out('6-story') });
  await fr.evaluate(() => { G.closeModal(); G.ui.guideTab = 'live'; G.openGuide(); });
  await page.waitForTimeout(500);
  await page.screenshot({ path: out('7-species') });
  console.log('lifestyles:', await fr.evaluate(() => JSON.stringify(G.measurePond(G.W))));
  console.log(errs.slice(0, 6).join('\n') || 'no errors');
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
