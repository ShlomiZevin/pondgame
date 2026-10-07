// How regions in the water look (no AI is asked):  node scripts/shapes.js
const { chromium } = require('../../plaxzy-creator/node_modules/playwright-core');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 820 } });
  const errs = []; page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message));
  await page.goto((process.env.BASE || 'http://localhost:8787') + '/dev?user=shape' + Date.now(), { waitUntil: 'load' });
  await page.waitForTimeout(3000);
  const fr = page.frames().find((f) => f !== page.mainFrame());
  await fr.locator('#tBegin').click();
  await fr.evaluate(() => { G.ai.gaps.deed = 1e9; G.ai.gaps.marvel = 1e9; G.ai.gaps.nature = 1e9; G.setSpeed(32); });
  await page.waitForTimeout(6000);
  await fr.evaluate(() => { G.setSpeed(1); G.cam.z = 1; G.applyCam(); const add = (o) => G.addField(G.cleanFields([o])[0]);
    add({ name: 'Ice Wall', stuff: 'ice', shape: 'line', across: 'vertical', at: 0.3, width: 0.06, solid: true, gap: 0.14, gapAt: 0.6, life: 300 });
    add({ name: 'Lava Flow', stuff: 'fire', shape: 'band', across: 'horizontal', at: 0.78, width: 0.12, hurt: 0.5, life: 300 });
    add({ name: 'Kelp Grove', stuff: 'plant', shape: 'circle', x: 0.55, y: 0.42, r: 0.14, feed: 0.6, life: 300 });
    add({ name: 'Stone Ring', stuff: 'rock', shape: 'ring', x: 0.82, y: 0.4, r: 0.12, width: 0.1, solid: true, life: 300 });
    add({ name: 'Murk', stuff: 'toxic', shape: 'half', side: 'left', at: 0.16, slow: 0.4, life: 300 }); });
  await fr.evaluate(() => { G.banner('Evolution invented something', 'First legs! Something can crawl and grab.'); G.banner('A body nobody has seen', 'A tall one with a sail.'); G.banner('★ A MARVEL', 'Creature #12 was born with Sail of Sweet Air. Its fuzzy sail breathes out tiny bubbles that help friends.', 12000); G.banner('The story so far', 'Long text of the story.'); });
  await page.waitForTimeout(4000);
  await page.screenshot({ path: path.join(__dirname, 'shapes.png') });
  await fr.locator('#rarebox .rk').click(); await page.waitForTimeout(1200); await page.screenshot({ path: path.join(__dirname, 'rare-open.png') });
  await fr.locator('#wish').click(); await page.waitForTimeout(700); await page.screenshot({ path: path.join(__dirname, 'wish-open.png'), clip: { x: 440, y: 0, width: 560, height: 470 } });
  console.log(errs.slice(0, 5).join('\n') || 'no errors');
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
