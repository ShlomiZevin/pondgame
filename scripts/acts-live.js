// What the real AI makes of typed things, now that they can act: one question each (well under a cent apiece), then a minute in a pond.  node scripts/acts-live.js [words...]
const { chromium } = require('../../plaxzy-creator/node_modules/playwright-core');
const path = require('path');
const words = process.argv.slice(2).length ? process.argv.slice(2) : ['a knight with a sword', 'a bad-ass gun creature'];
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 860 } });
  const errs = []; page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message));
  await page.goto((process.env.BASE || 'http://localhost:8787') + '/dev?user=actlive' + Date.now(), { waitUntil: 'load' });
  await page.waitForTimeout(3000);
  const fr = page.frames().find((f) => f !== page.mainFrame());
  await fr.locator('#tBegin').click(); await page.waitForTimeout(1500);
  await fr.evaluate(() => { for (const k in G.ai.caps) if (k !== 'thing') G.ai.caps[k] = 0; G.setSpeed(64); });
  await page.waitForTimeout(12000); await fr.evaluate(() => G.setSpeed(1));
  let i = 0;
  for (const w of words) {
    const r = await fr.evaluate(([w, i]) => G.host.call('ai.thing', { word: w, model: G.ai.model || undefined }, 90000).then((r) => { if (!r || !r.thing) return { failed: JSON.stringify(r).slice(0, 200) }; const t = G.clampThing(Object.assign({ source: 'ai', model: r.model }, r.thing)), W = G.W, z = G.addZone(W.ww * (0.3 + 0.4 * i), W.wh * 0.65, t); return { name: t.name, note: t.note, act: z.act ? z.act.way + ' / ' + z.act.side + ' / ' + z.act.acts.map((a) => a.do + ' with ' + a.with + (a.do === 'shoot' ? ' (' + a.shot + ')' : '')).join(', ') : 'none', usd: r.usd, src: r.source }; }, (e) => ({ err: String(e && e.message || e) })), [w, i++]);
    console.log(w + ' -> ' + JSON.stringify(r));
  }
  await fr.evaluate(() => { window._n = {}; G.on('act', (z, q) => { _n[z.word + ' ' + q.do] = (_n[z.word + ' ' + q.do] || 0) + 1; }); G.select(null); G.camHome(); G.setSpeed(4); });
  await page.waitForTimeout(15000); await fr.evaluate(() => G.setSpeed(1)); await page.waitForTimeout(1500);
  console.log('in a minute of pond time: ' + JSON.stringify(await fr.evaluate(() => _n)) + ' · ' + await fr.evaluate(() => G.W.zones.map((z) => z.word + ' struck down ' + (z.deaths || 0)).join(', ')));
  await page.screenshot({ path: path.join(__dirname, 'acts-live.png') });
  console.log(errs.join('\n') || 'no errors');
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
