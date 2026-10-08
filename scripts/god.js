// The god of the pond at work: a real pond with the AI on, until the watcher has looked a few times.  node scripts/god.js [looks]
// It prints every mark the watcher gave (beauty, whole, body, balance, grandeur), the room to grow it opened, and what it cost. A few cents.
const { chromium } = require('../../plaxzy-creator/node_modules/playwright-core');
const path = require('path');
const want = +process.argv[2] || 2;
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 860 } });
  const errs = []; page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message));
  await page.goto((process.env.BASE || 'http://localhost:8787') + '/dev?user=god' + Date.now(), { waitUntil: 'load' });
  await page.waitForTimeout(3000);
  const fr = page.frames().find((f) => f !== page.mainFrame());
  await fr.locator('#tBegin').click(); await page.waitForTimeout(1200);
  // only the watcher is allowed to spend here
  await fr.evaluate(() => { for (const k of ['wishcheck', 'plan', 'design', 'organ', 'story', 'wish', 'nature', 'deed', 'marvel', 'icon', 'voice', 'paint', 'figure', 'sound', 'ideas']) { G.ai.caps[k] = 0; } G.ai.gaps.watch = 1500; G.setSpeed(64); });
  await page.waitForTimeout(25000);
  await fr.evaluate(() => G.setSpeed(16));
  let seen = 0, last = -1;
  for (let t = 0; t < 120 && seen < want; t++) {
    await page.waitForTimeout(2000);
    const st = await fr.evaluate(() => ({ n: (G.W.eyeBank || []).length, gen: G.W.gen, room: G.W.room || 0, why: G.W.roomWhy || null }));
    if (st.n !== last) { if (last >= 0) { seen++; console.log('look ' + seen + ' at gen ' + st.gen + ': ' + (st.n - last) + ' creatures marked; room to grow ' + st.room + (st.why ? ' (mean body ' + st.why.body.toFixed(2) + ', balance ' + st.why.balance.toFixed(2) + ')' : '')); } last = st.n; }
  }
  await fr.evaluate(() => G.setSpeed(1));
  const rows = await fr.evaluate(() => (G.W.eyeBank || []).slice(-14).map((q) => 'beauty ' + (q.b * 10).toFixed(0) + '  whole ' + (q.w * 10).toFixed(0) + '  ' + G.MARKS_X.map((m) => m.label.toLowerCase() + ' ' + (q.m && q.m[m.id] !== undefined ? (q.m[m.id] * 10).toFixed(0) : '?')).join('  ') + '   appeal ' + (G.appealOfLook(q) * 10).toFixed(1)));
  console.log(rows.join('\n'));
  console.log('watcher spend: ' + JSON.stringify(await fr.evaluate(() => G.ai.life && G.ai.life.watch)));
  await fr.evaluate(() => { const c = G.W.cre.filter((x) => x.real && !x.dead).sort((a, b) => G.charmOf(b) - G.charmOf(a))[0] || G.W.cre[0]; G.select(c); G.focusOn(c.x, c.y, 2); const b = document.querySelector('#gtabs [data-m=mx_grand]'); if (b) b.click(); });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(__dirname, 'god-1.png') });
  console.log(errs.join('\n') || 'no errors');
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
