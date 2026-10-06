// The rare box, the marvel panel on the card and a plan watched at x16:  node scripts/rarebox.js
// One marvel and one plan are asked of the AI (about 3 cents together, plus the monument's drawing if they build).
const { chromium } = require('../../plaxzy-creator/node_modules/playwright-core');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 820 } });
  const errs = []; page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message));
  await page.goto((process.env.BASE || 'http://localhost:8788') + '/dev?user=rare' + Date.now(), { waitUntil: 'load' });
  await page.waitForTimeout(3000);
  const fr = page.frames().find((f) => f !== page.mainFrame());
  await fr.locator('#tBegin').click();
  await fr.evaluate(() => { for (const k of ['wishcheck', 'watch', 'plan', 'design', 'organ', 'story', 'wish', 'nature']) G.ai.caps[k] = 0; G.setSpeed(64); });
  await page.waitForTimeout(16000);
  await fr.evaluate(() => G.setSpeed(16));
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(__dirname, 'rarebox-0-empty.png') });
  await fr.evaluate(() => { G.grantMarvel(); G.deedAsk(); });
  let seen = null;
  for (let t = 0; t < 45 && !seen; t++) { await page.waitForTimeout(1500); seen = await fr.evaluate(() => { const c = G.W.cre.find((x) => x.ph.mv && !x.dead); if (!c || !G.W.deed) return null; G.select(c); return G.marvelDoes(c.ph.mv).join(' / ') || '(no powers)'; }); }
  console.log('marvel does: ' + seen);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(__dirname, 'rarebox-1-both.png') });
  console.log('box: ' + (await fr.locator('#rarebox').innerText()).replace(/\n+/g, ' | ').slice(0, 600));
  console.log('card: ' + (await fr.locator('#imarvel').innerText().catch(() => 'no panel')).replace(/\n+/g, ' | ').slice(0, 400));
  const t0 = Date.now(), plan = await fr.evaluate(() => { const d = G.W.deed; return d ? d.steps.reduce((s, q) => s + q.secs, 0) : 0; });
  for (let t = 0; t < 200; t++) { await page.waitForTimeout(1500); if (!(await fr.evaluate(() => !!G.W.deed))) break; }
  console.log('the plan was ' + plan + ' s long; at x16 it took ' + Math.round((Date.now() - t0) / 1000) + ' s to watch · creatures left: ' + await fr.evaluate(() => G.W.cre.length));
  await page.waitForTimeout(6000);
  await page.screenshot({ path: path.join(__dirname, 'rarebox-2-after.png') });
  console.log('box after: ' + (await fr.locator('#rarebox').innerText()).replace(/\n+/g, ' | ').slice(0, 600));
  console.log(errs.slice(0, 5).join('\n') || 'no errors');
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
