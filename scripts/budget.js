// Budgets per kind of AI work, shown and enforced (no AI is asked):  node scripts/budget.js
// Pretends this pond has already spent some budgets, then checks that those kinds refuse and are shown as OFF.
const { chromium } = require('../../plaxzy-creator/node_modules/playwright-core');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 820 } });
  const errs = []; page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message));
  await page.goto((process.env.BASE || 'http://localhost:8787') + '/dev?user=budget' + Date.now(), { waitUntil: 'load' });
  await page.waitForTimeout(3000);
  const fr = page.frames().find((f) => f !== page.mainFrame());
  await fr.locator('#tBegin').click();
  await fr.evaluate(() => { for (const k of ['deed', 'marvel', 'nature', 'wishcheck', 'watch', 'wish']) G.ai.gaps[k] = 1e9; G.setSpeed(16); });
  await page.waitForTimeout(5000);
  console.log(await fr.evaluate(async () => {
    const A = G.ai, out = [];
    out.push('before: deed allowed ' + !A.over('deed') + ' · thing allowed ' + !A.over('thing'));
    for (const k of ['deed', 'thing', 'wishcheck']) A.life[k] = { asked: 30, fresh: 30, usd: A.budgetOf(k) };
    A.life.marvel = { asked: 9, fresh: 9, usd: A.budgetOf('marvel') - 0.005 };
    A.gaps.deed = 0; A.gaps.marvel = 0;
    out.push('after: allow(deed) ' + A.allow('deed') + ' · deedAsk ' + G.deedAsk() + ' · allow(wishcheck) ' + A.allow('wishcheck') + ' · allow(marvel, one call left) ' + A.allow('marvel'));
    out.push('typed thing: ' + await A.ask('thing', 'a cat').then(() => 'ANSWERED (wrong)', (e) => e.budget ? 'refused: budget' : 'other error'));
    out.push('typed event (budget not used): ' + (A.over('event') ? 'off (wrong)' : 'still on'));
    A.tally('marvel', 'ai', 0.012);              // the last cent: it should announce and switch off
    out.push('marvel after its last call: over ' + A.over('marvel') + ' · allow ' + A.allow('marvel'));
    return out.join('\n');
  }));
  await page.waitForTimeout(3500);
  await fr.evaluate(() => { G.setSpeed(1); document.querySelector('#rarebox .rk').click(); });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(__dirname, 'budget-1-pond.png') });
  console.log('toolbar: ' + (await fr.locator('#toolbar').innerText()).replace(/\n+/g, ' | '));
  await fr.evaluate(() => G.showCosts());
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(__dirname, 'budget-2-sheet.png') });
  console.log(errs.slice(0, 5).join('\n') || 'no errors');
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
