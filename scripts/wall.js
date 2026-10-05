// The player's own example, on the real server: "all food got behind steel wall", then an ice age.
const { chromium } = require('../../plaxzy-creator/node_modules/playwright-core');
const path = require('path');
const BASE = process.env.BASE || 'http://localhost:8787';
const out = (n) => path.join(__dirname, 'wall-' + n + '.png');
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 820 } });
  const errs = [];
  page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message));
  await page.goto(BASE + '/dev?user=wall' + Date.now(), { waitUntil: 'load' });
  await page.waitForTimeout(3000);
  const fr = page.frames().find((f) => f !== page.mainFrame());
  await fr.locator('#tBegin').click();
  await fr.evaluate(() => G.setSpeed(16));
  await page.waitForTimeout(9000);
  await fr.evaluate(() => G.setSpeed(1));
  const typeEvent = async (text) => {
    await fr.locator('#tb-world').click();
    await fr.locator('#ui .pop input[type=text]').fill(text);
    const n = await fr.evaluate(() => (G.W.events || []).length);
    await page.keyboard.press('Enter');
    await fr.waitForFunction((k) => (G.W.events || []).length > k, n, { timeout: 45000 }).catch(() => {});
    await page.waitForTimeout(600);
  };
  await typeEvent('all food got behind steel wall');
  console.log('event:', await fr.evaluate(() => { const e = G.W.events[G.W.events.length - 1]; const z = G.vaultOf(G.W); return e.name + ' | ' + e.note + ' | wall: ' + (z ? z.word + ', locks ' + Math.round(z.p.vault * 100) + '% of new food, weak to ' + G.WEAK[z.weak].text : 'NONE'); }));
  await page.waitForTimeout(2500);
  await page.screenshot({ path: out('1-up') });
  await fr.evaluate(() => G.setSpeed(16));
  for (let i = 0; i < 3; i++) {
    await page.waitForTimeout(14000);
    console.log(await fr.evaluate(() => { const W = G.W, z = G.vaultOf(W); const v = z ? G.versus(z) : null; return 'gen ' + W.gen + ' pop ' + W.cre.length + (v ? ' | can get in ' + Math.round(v.carry * 100) + '% | wall ' + Math.round(v.left * 100) + '%' : ' | THE WALL IS GONE') + ' | cost ' + G.ai.money(G.ai.usd); }));
    if (i === 0) { await fr.evaluate(() => G.setSpeed(1)); await page.waitForTimeout(700); await page.screenshot({ path: out('2-learning') }); await fr.evaluate(() => G.setSpeed(16)); }
  }
  await fr.evaluate(() => G.setSpeed(1));
  await typeEvent('an ice age');
  await page.waitForTimeout(3500);
  await page.screenshot({ path: out('3-iceage') });
  console.log('ice age:', await fr.evaluate(() => { const e = G.W.events[G.W.events.length - 1]; return e.name + ' | fx ' + (G.W.mods[G.W.mods.length - 1] || {}).fx + ' | shelf: ' + G.W.evShelf.map((x) => x.name).join(', '); }));
  await fr.evaluate(() => { G.ui.guideTab = 'hist'; G.openGuide(); });
  await page.waitForTimeout(700);
  await page.screenshot({ path: out('4-history') });
  console.log('panel:', await fr.evaluate(() => document.getElementById('phSum').textContent + ' || ' + document.getElementById('aiLine').textContent));
  console.log(errs.slice(0, 5).join('\n') || 'no errors');
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
