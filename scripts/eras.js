// The ladder of life on the real server: run fast, watch the ages arrive, then two typed requests.
const { chromium } = require('../../plaxzy-creator/node_modules/playwright-core');
const path = require('path');
const BASE = process.env.BASE || 'http://localhost:8787';
const out = (n) => path.join(__dirname, 'eras-' + n + '.png');
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 820 } });
  const errs = [];
  page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message));
  await page.goto(BASE + '/dev?user=eras' + Date.now(), { waitUntil: 'load' });
  await page.waitForTimeout(3000);
  const fr = page.frames().find((f) => f !== page.mainFrame());
  await fr.locator('#tBegin').click();
  await fr.evaluate(() => G.setSpeed(64));
  const state = () => fr.evaluate(() => { const W = G.W; return 'gen ' + W.gen + ' pop ' + W.cre.length + ' | ' + G.GRADES[W.era].age + ' | ' + W.gradeFrac.map((v) => Math.round(v * 100)).join('/') + ' | drawn ' + W.species.filter((s) => s.skin).length + ' | ' + G.ai.money(G.ai.usd); });
  for (let i = 0; i < 4; i++) { await page.waitForTimeout(16000); console.log(await state()); }
  await fr.evaluate(() => { G.setSpeed(1); G.cam.z = 1.25; G.applyCam(); });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: out('1-pond') });
  // the player's two sentences
  await fr.locator('#tb-add').click();
  await fr.locator('#wordIn').fill('predator killing creatures with one touch');
  await fr.locator('#wordGo').click();
  await fr.waitForFunction(() => !!G.ui.placing, null, { timeout: 45000 }).catch(() => {});
  console.log('thing:', await fr.evaluate(() => { const p = G.ui.placing; return p ? p.name + ' | deadly ' + p.props.deadly.toFixed(2) + ' eats ' + p.props.eats.toFixed(2) + ' moves ' + p.props.moves.toFixed(2) + ' | ' + p.note : 'none'; }));
  await page.mouse.click(700, 450);
  await page.waitForTimeout(6000);
  console.log('after 6 s: killed by a touch', await fr.evaluate(() => G.W.zones.reduce((a, z) => a + (z.ate || 0), 0)));
  await fr.locator('#tb-world').click();
  await fr.locator('#ui .pop input[type=text]').fill('poisoned pond');
  const n = await fr.evaluate(() => (G.W.events || []).length);
  await page.keyboard.press('Enter');
  await fr.waitForFunction((k) => (G.W.events || []).length > k, n, { timeout: 45000 }).catch(() => {});
  await page.waitForTimeout(3000);
  console.log('event:', await fr.evaluate(() => { const e = G.W.events[G.W.events.length - 1]; const m = G.W.mods[G.W.mods.length - 1] || {}; return e ? e.name + ' | pond-wide poison ' + (m.poison || 0) + ' for the whole pond | things left behind: ' + G.W.zones.filter((z) => z.born === G.W.gen && z.word !== 'x').map((z) => z.word).join(', ') : 'none'; }));
  await page.screenshot({ path: out('2-poison') });
  await fr.evaluate(() => { document.getElementById('panel').classList.remove('min'); });
  await page.waitForTimeout(500);
  await page.screenshot({ path: out('3-panel'), clip: { x: 1100, y: 0, width: 340, height: 520 } });
  console.log(errs.slice(0, 5).join('\n') || 'no errors');
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
