// Checks that a budget can be SET in the costs sheet, is enforced, and is kept with the pond.  node scripts/budget-set.js
const { chromium } = require('../../plaxzy-creator/node_modules/playwright-core');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1300, height: 820 } });
  const errs = []; page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message));
  await page.goto((process.env.BASE || 'http://localhost:8787') + '/dev?user=budset' + Date.now() + '&ai=0', { waitUntil: 'load' });
  await page.waitForTimeout(2500);
  const fr = page.frames().find((f) => f !== page.mainFrame());
  await fr.locator('#tBegin').click(); await page.waitForTimeout(800);
  await fr.evaluate(() => G.showCosts()); await page.waitForTimeout(400);
  const before = await fr.evaluate(() => ({ watch: G.ai.budgetOf('watch'), voice: G.ai.budgetOf('voice'), inputs: document.querySelectorAll('input[data-bud]').length }));
  await fr.locator('input[data-bud="watch"]').fill('0.05'); await fr.locator('input[data-bud="watch"]').dispatchEvent('change'); await page.waitForTimeout(300);
  await fr.locator('input[data-bud="voice"]').fill('0'); await fr.locator('input[data-bud="voice"]').dispatchEvent('change'); await page.waitForTimeout(300);
  const after = await fr.evaluate(() => { G.ai.life.watch = { asked: 3, fresh: 3, usd: 0.06 }; return { watch: G.ai.budgetOf('watch'), voice: G.ai.budgetOf('voice'), watchOver: G.ai.over('watch'), voiceOff: G.ai.over('voice'), allowWatch: G.ai.allow('watch'), allowVoice: G.ai.allow('voice'), planOver: G.ai.over('plan'), set: JSON.stringify(G.ai.budgetSet) }; });
  await fr.evaluate(() => G.showCosts()); await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(__dirname, 'budget-set.png') });
  const saved = await fr.evaluate(() => { let cap = null; const had = window.Plaxzy, P = window.Plaxzy = window.Plaxzy || {}; const s0 = P.save; P.save = { set: function (d) { cap = d; }, load: function () {} }; try { G.saveNow(); } finally { if (s0) P.save = s0; else if (!had) delete window.Plaxzy; } return cap ? JSON.stringify(cap.budgets) : 'no save'; });
  await fr.locator('#budReset').click(); await page.waitForTimeout(300);
  const reset = await fr.evaluate(() => ({ watch: G.ai.budgetOf('watch'), voice: G.ai.budgetOf('voice'), set: JSON.stringify(G.ai.budgetSet) }));
  console.log('before', JSON.stringify(before)); console.log('after ', JSON.stringify(after)); console.log('saved ', saved); console.log('reset ', JSON.stringify(reset));
  console.log(errs.slice(0, 5).join('\n') || 'no errors');
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
