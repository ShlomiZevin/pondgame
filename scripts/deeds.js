// A kind of creature decides to do something together, live:  node scripts/deeds.js [tag] ["thing to drop first"]
// Prints the plan the AI made up, follows it step by step, and saves pictures along the way.
const { chromium } = require('../../plaxzy-creator/node_modules/playwright-core');
const path = require('path');
const tag = process.argv[2] || 'a', thing = process.argv[3] === undefined ? 'a knight with a sword who attacks the creatures' : process.argv[3];
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 820 } });
  const errs = []; page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message));
  await page.goto((process.env.BASE || 'http://localhost:8787') + '/dev?user=deed' + Date.now(), { waitUntil: 'load' });
  await page.waitForTimeout(3000);
  const fr = page.frames().find((f) => f !== page.mainFrame());
  await fr.locator('#tBegin').click();
  await fr.evaluate(() => { for (const k of ['wishcheck', 'watch', 'plan', 'design', 'organ', 'story', 'marvel', 'wish', 'nature']) G.ai.caps[k] = 0; G.ai.gaps.deed = 0; G.setSpeed(64); });
  await page.waitForTimeout(18000);
  await fr.evaluate(async (thing) => { G.setSpeed(2); if (thing) { const info = await G.ai.ask('thing', thing); G.addZone(G.W.ww * 0.62, G.W.wh * 0.5, info); } }, thing);
  await page.waitForTimeout(1500);
  await fr.evaluate(() => G.deedAsk());
  let plan = null;
  for (let t = 0; t < 45 && !plan; t++) { await page.waitForTimeout(1500); plan = await fr.evaluate(() => { const d = G.W.deed; return d ? d.title + ' — the ' + d.kind + ' (' + d.n0 + ' of them)\n   ' + d.say + '\n   steps: ' + d.steps.map((s) => s.do + ' ' + s.secs + 's "' + s.cry + '"').join(' → ') + '\n   target: ' + (d.target || '-') + (d.target ? ' (' + d.win + ')' : '') + '\n   leaves: ' + (d.result ? d.result.name + ' [' + d.result.stuff + ' ' + d.result.shape + (d.result.solid ? ', solid' : '') + '] ' + d.result.looks : 'nothing') : null; }); }
  console.log(plan || 'no plan came');
  if (plan) {
    await fr.evaluate(() => { const d = G.W.deed; G.focusOn(d.x, d.y, 1.5); });
    let shot = 0, lastStep = -1;
    for (let t = 0; t < 110; t++) {
      await page.waitForTimeout(1500);
      const s = await fr.evaluate(() => { const d = G.W.deed; return d ? { i: d.i, do: d.steps[d.i].do, n: G.W.cre.filter((c) => c.deedId === d.id).length, p: Math.round(d.progress * 100) } : null; });
      if (!s) break;
      if (s.i !== lastStep) { lastStep = s.i; await page.waitForTimeout(3500); await page.screenshot({ path: path.join(__dirname, 'deed-' + tag + '-' + (++shot) + '-' + s.do + '.png') }); console.log('   step ' + (s.i + 1) + ': ' + s.do + ' · ' + s.n + ' taking part' + (s.p ? ' · built ' + s.p + '%' : '')); }
    }
    for (let t = 0; t < 40; t++) { await page.waitForTimeout(2000); if (await fr.evaluate(() => !G.W.works || !G.W.works.length || G.W.works[G.W.works.length - 1].fig !== undefined)) break; }
    await page.waitForTimeout(1200);
    await page.screenshot({ path: path.join(__dirname, 'deed-' + tag + '-end.png') });
    console.log(await fr.evaluate(() => 'after: ' + (G.W.deedLog || []).join(', ') + ' · standing: ' + ((G.W.works || []).map((w) => w.name + (w.fig ? ' (drawn by the AI)' : ' (not drawn yet)')).join(', ') || 'nothing') + ' · cost: deed ' + JSON.stringify(G.ai.count.deed || {}) + ' figure ' + JSON.stringify(G.ai.count.figure || {})));
  }
  console.log(errs.slice(0, 5).join('\n') || 'no errors');
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
