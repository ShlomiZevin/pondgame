// When do things happen for somebody just playing?  node scripts/pace.js [speed, default 1] [minutes, default 7]
// Plays untouched and prints the minute each marvel and each plan arrived. Saves a picture of each plan's steps.
const { chromium } = require('../../plaxzy-creator/node_modules/playwright-core');
const path = require('path');
const speed = +process.argv[2] || 1, mins = +process.argv[3] || 7;
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 820 } });
  const errs = []; page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message));
  await page.goto((process.env.BASE || 'http://localhost:8787') + '/dev?user=pace' + Date.now(), { waitUntil: 'load' });
  await page.waitForTimeout(3000);
  const fr = page.frames().find((f) => f !== page.mainFrame());
  await fr.locator('#tBegin').click();
  await fr.evaluate((speed) => { for (const k of ['wishcheck', 'watch', 'plan', 'design', 'organ', 'story', 'wish', 'nature']) G.ai.caps[k] = 0; G.setSpeed(speed); }, speed);
  const t0 = Date.now(), at = () => ((Date.now() - t0) / 60000).toFixed(1) + ' min';
  let mv = 0, deed = 0, step = -1, shots = 0;
  while (Date.now() - t0 < mins * 60000) {
    await page.waitForTimeout(2000);
    const s = await fr.evaluate(() => { const W = G.W, d = W.deed; return { gen: W.gen, n: W.cre.length, mv: (W.mv && W.mv.n) || 0, mname: (W.cre.find((c) => c.ph.mv) || { ph: { mv: {} } }).ph.mv.name, d: d ? { id: d.id, t: d.title, what: d.what, why: d.why, kind: d.kind, i: d.i, do: d.steps[d.i].do, n: W.cre.filter((c) => c.deedId === d.id).length, x: d.x, y: d.y } : null, past: (W.deedPast || []).map((p) => p.title + ' (' + p.how + ')').join(', ') }; });
    if (s.mv > mv) { mv = s.mv; console.log(at() + ' · gen ' + s.gen + ' · MARVEL ' + mv + ': ' + s.mname); }
    if (s.d && s.d.id !== deed) { deed = s.d.id; step = -1; console.log(at() + ' · gen ' + s.gen + ' · PLAN: ' + s.d.t + ' — ' + s.d.kind + ' · what: ' + s.d.what + ' · why: ' + s.d.why); }
    if (s.d && s.d.i !== step) { step = s.d.i; await fr.evaluate((d) => G.focusOn(d.x, d.y, 1.5), s.d); await page.waitForTimeout(5000); if (shots < 8) await page.screenshot({ path: path.join(__dirname, 'pace-' + (++shots) + '-' + s.d.do + '.png') }); console.log('      ' + s.d.do + ' · ' + s.d.n + ' taking part'); }
  }
  console.log('after ' + mins + ' min at x' + speed + ': ' + await fr.evaluate(() => 'gen ' + G.W.gen + ' · ' + G.W.cre.length + ' creatures · plans: ' + ((G.W.deedPast || []).map((p) => p.title + ' (' + p.how + ')').join(', ') || 'none ended') + ' · cost: marvel ' + JSON.stringify(G.ai.count.marvel || {}) + ' deed ' + JSON.stringify(G.ai.count.deed || {}) + ' figure ' + JSON.stringify(G.ai.count.figure || {})));
  console.log(errs.slice(0, 5).join('\n') || 'no errors');
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
