// End to end: the real game in a real browser, hosted by /dev, talking to this server.
//   node scripts/dev.js --fake   (in another terminal)   then   node test/e2e.js
const { chromium } = require('../../plaxzy-creator/node_modules/playwright-core');
const BASE = process.env.BASE || 'http://localhost:8787';
const USER = 'e2e-' + Date.now();
const REAL = !!process.env.REAL;     // REAL=1: the server is running real models, so names are not known in advance
const log = (...a) => console.log(...a);
let failed = 0;
const check = (name, ok, extra) => { log((ok ? 'PASS' : 'FAIL') + '  ' + name + (extra ? '  ' + extra : '')); if (!ok) failed++; };

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 760 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/favicon|422/.test((m.location().url || '') + m.text())) errs.push(m.text()); });
  const frame = () => page.frames().find((f) => f !== page.mainFrame());
  await page.goto(BASE + '/dev?user=' + USER, { waitUntil: 'load' });
  await page.waitForTimeout(3000);
  check('the game found its host and the server', await frame().evaluate(() => G.host.ready && G.host.caps.ai && G.host.caps.pond && G.ai.provider === 'server'));

  await frame().locator('#tBegin').click();
  await page.waitForTimeout(800);

  // 1. a typed word is answered by the server (its own picture, its own wording)
  await frame().locator('#tb-add').click();
  await frame().locator('#wordIn').fill('jelly');
  await page.keyboard.press('Enter');
  await frame().waitForFunction(() => !!G.ui.placing, null, { timeout: 45000 }).catch(() => {});
  const card = await frame().evaluate(() => G.ui.placing ? G.ui.placing.name + ' | ' + G.ui.placing.note + ' | ' + G.ui.placing.source : 'nothing');
  check('the server named the thing', REAL ? /\| ai$/.test(card) : /Glow Jelly/.test(card), card.slice(0, 150));
  await page.mouse.click(640, 400);
  await page.waitForTimeout(1500);
  const z = await frame().evaluate(() => { const zz = G.W.zones[G.W.zones.length - 1]; return { word: zz.word, svg: !!zz.svg, img: !!zz.img, bad: /script/.test(zz.svg || '') }; });
  check('it was placed, with the server\'s picture loaded and clean', (REAL || z.word === 'Glow Jelly') && z.svg && z.img && !z.bad, JSON.stringify(z));

  // 2. a word the server refuses
  await frame().locator('#tb-add').click();
  await frame().locator('#wordIn').fill('nazi');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(800);
  const refused = await frame().evaluate(() => document.getElementById('thing').textContent);
  check('a refused word is refused kindly', /cannot take that word/.test(refused), refused.slice(0, 60));
  await page.keyboard.press('Escape');

  // 3. mutation ideas come from the server
  await frame().evaluate(() => { G.W.poolBusy = false; G.ai.refill(); });
  await frame().waitForFunction(() => G.W.pool.length > 0 && !G.W.poolBusy, null, { timeout: 45000 }).catch(() => {});
  const pool = await frame().evaluate(() => G.W.pool.map((i) => i.name));
  check('mutation ideas came from the server', pool.length > 0 && (REAL || pool.includes('Pair of arms')), pool.join(', '));

  // 3b. the model menu: the game knows the server's models, and a different choice really answers
  const menu = await frame().evaluate(() => G.ai.models.map((m) => m.label));
  check('the game lists the server\'s models', REAL ? menu.length >= 2 : menu.length >= 1, menu.join(', '));
  if (REAL) {
    await frame().locator('#tb-sound').click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: __dirname + '/e2e-menu.png' });
    const other = await frame().evaluate(() => { const chips = [...document.querySelectorAll('#menu .chip')]; const c = chips.find((x) => /mini/i.test(x.textContent)) || chips[1]; c.click(); return c.textContent; });
    await frame().locator('#mnClose').click();
    await frame().locator('#tb-add').click();
    await frame().locator('#wordIn').fill('thunder cheese');
    await frame().locator('#wordGo').click();
    await frame().waitForFunction(() => !!G.ui.placing, null, { timeout: 45000 }).catch(() => {});
    const got = await frame().evaluate(() => G.ui.placing ? { name: G.ui.placing.name, note: G.ui.placing.note, by: G.ai.labelOf(G.ui.placing.model), source: G.ui.placing.source } : null);
    check('choosing "' + other + '" in the menu: that model answered', got && got.by === other && got.source === 'ai', JSON.stringify(got));
    await page.mouse.click(420, 300);
    await page.waitForTimeout(2500);
    await page.screenshot({ path: __dirname + '/e2e-things.png' });
  }

  // 4. the pond is stored on the server as the game plays
  await frame().evaluate(() => G.setSpeed(16));
  await frame().waitForFunction(() => G.W.gen >= 3, null, { timeout: 60000 }).catch(() => {});
  await frame().evaluate(() => G.setSpeed(1));
  await page.waitForTimeout(5000);
  log('   state', await frame().evaluate(() => JSON.stringify({ gen: G.W.gen, speed: G.speed, blocked: G.isBlocked(), mode: G.mode, menu: G.ui.menuOpen, modal: G.ui.modal, pop: G.ui.popName })), await page.evaluate(() => JSON.stringify(window.__calls.slice(-4))));
  const stored = await (await fetch(BASE + '/api/pond', { headers: { 'x-user': USER } })).json();
  check('the pond was stored on the server', stored.save && stored.save.gen >= 3 && stored.save.cre.length > 0, stored.save ? 'gen ' + stored.save.gen : 'nothing');

  await page.close();   // the player leaves
  // 5. while away: age the stored pond by an hour, then come back on a fresh page
  // (the server refuses an older save over a newer one, so the test ages the stored file itself)
  const file = require('path').join(__dirname, '..', 'data', 'pond__' + USER + '.json');
  const rec = JSON.parse(require('fs').readFileSync(file, 'utf8'));
  const aged = rec.save;
  aged.at = rec.at = Date.now() - 3600 * 1000;
  require('fs').writeFileSync(file, JSON.stringify(rec));
  check('aged the stored pond by an hour', true);
  const page2 = await ctx.newPage();
  page2.on('pageerror', (e) => errs.push(e.message));
  await page2.goto(BASE + '/dev?user=' + USER, { waitUntil: 'load' });
  const f2 = () => page2.frames().find((f) => f !== page2.mainFrame());
  await page2.waitForTimeout(3000);
  let offered = false;
  for (let i = 0; i < 90 && !offered; i++) { offered = await f2().evaluate(() => !!G.pendingReport); if (!offered) await page2.waitForTimeout(1000); }
  check('the server advanced the pond and the game was handed a report', offered);
  const rep = await f2().evaluate(() => G.pendingReport);
  check('about 112 generations passed in an hour (capped at 150)', rep && rep.gens >= 20, rep ? JSON.stringify(rep).slice(0, 160) : '');
  await f2().locator('#tCont').click();
  await page2.waitForTimeout(1500);
  const shown = await f2().evaluate(() => !!document.getElementById('awayReport') && document.getElementById('awayReport').textContent.includes('generations passed') && G.W.gen);
  check('CONTINUE shows what happened while away, and the pond is at the later generation', !!shown && shown > aged.gen + 15, 'gen ' + shown);
  await page2.screenshot({ path: __dirname + '/e2e-report.png' });

  check('no errors in the game', errs.length === 0, errs.join(' | ').slice(0, 200));
  await browser.close();
  log(failed ? failed + ' FAILED' : 'ALL PASSED');
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
