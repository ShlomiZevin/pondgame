// The marvel panel on the creature card:  node scripts/rarecard.js   (one marvel is asked of the AI, about a cent)
const { chromium } = require('../../plaxzy-creator/node_modules/playwright-core');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 820 } });
  const errs = []; page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message));
  await page.goto((process.env.BASE || 'http://localhost:8788') + '/dev?user=rarec' + Date.now(), { waitUntil: 'load' });
  await page.waitForTimeout(3000);
  const fr = page.frames().find((f) => f !== page.mainFrame());
  await fr.locator('#tBegin').click();
  await fr.evaluate(() => { for (const k of ['wishcheck', 'watch', 'plan', 'design', 'organ', 'story', 'wish', 'nature', 'deed', 'figure']) G.ai.caps[k] = 0; G.setSpeed(64); });
  await page.waitForTimeout(14000);
  await fr.evaluate(() => { G.setSpeed(1); G.grantMarvel(); });
  let seen = null;
  for (let t = 0; t < 40 && !seen; t++) { await page.waitForTimeout(1500); seen = await fr.evaluate(() => { const c = G.W.cre.find((x) => x.ph.mv && !x.dead); if (!c) return null; G.select(c); return G.marvelDoes(c.ph.mv).join(' / ') || '(no powers)'; }); }
  console.log('marvel does: ' + seen);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(__dirname, 'rarecard.png') });
  console.log('card: ' + (await fr.locator('#imarvel').innerText().catch(() => 'no panel')).replace(/\n+/g, ' | ').slice(0, 500));
  console.log('box: ' + (await fr.locator('#rarebox').innerText()).replace(/\n+/g, ' | ').slice(0, 400));
  console.log(errs.slice(0, 5).join('\n') || 'no errors');
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
