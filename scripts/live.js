// The whole loop, live, with the real AI: a pond evolves, a thing is dropped in and an event caused, and the game goes on.
//   node scripts/live.js [tag] [seconds after the drop] [model] [thing] [event]
// Prints what was imagined (and why), what the eye for beauty said, what was turned away, and what every kind of call cost.
const { chromium } = require('../../plaxzy-creator/node_modules/playwright-core');
const path = require('path');
const tag = process.argv[2] || 'a', secs = +process.argv[3] || 150, model = process.argv[4] || '';
const thing = process.argv[5] === undefined ? 'a knight with a sword who attacks the creatures' : process.argv[5], event = process.argv[6] === undefined ? 'an ice age' : process.argv[6];
const out = (n) => path.join(__dirname, 'live-' + tag + '-' + n + '.png');
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 820 } });
  const errs = []; page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message + ' ' + (e.stack || '').split('\n')[1]));
  await page.goto((process.env.BASE || 'http://localhost:8787') + '/dev?user=live' + tag + Date.now(), { waitUntil: 'load' });
  await page.waitForTimeout(3000);
  const fr = page.frames().find((f) => f !== page.mainFrame());
  await fr.locator('#tBegin').click();
  await fr.evaluate((model) => { if (model) G.ai.model = model; G.setSpeed(64); }, model);
  const state = () => fr.evaluate(() => { const W = G.W, js = W.species.filter((s) => !s.extinct && s.judge && !s.judge.est); return 'gen ' + W.gen + ' pop ' + W.cre.length + ' | ' + (W.kinds || []).slice(0, 3).map((k) => k[0] + ' ' + Math.round(k[1] * 100) + '%').join(', ') + ' | graded ' + js.length + (js.length ? ' (avg ' + (js.reduce((a, s) => a + s.judge.score, 0) / js.length * 10).toFixed(1) + '/10)' : '') + ' | shapes ' + W.plans.map((p) => p.name).join(',') + ' | parts ' + W.designs.map((d) => d.name).join(',') + ' | ' + G.ai.money(G.ai.totals().usd); });
  for (let i = 0; i < 3; i++) { await page.waitForTimeout(15000); console.log(await state()); }
  await fr.evaluate(async ({ thing, event }) => {
    const W = G.W;
    if (thing) { const info = await G.ai.ask('thing', thing); G.addZone(W.ww / 2, W.wh / 2, info); }
    if (event) { const ev = await G.ai.ask('event', event); if (ev) G.runEvent(ev); }
  }, { thing, event });
  console.log('— dropped: ' + thing + ' · caused: ' + event + ' —');
  for (let i = 0; i < Math.round(secs / 15) && !errs.length; i++) { await page.waitForTimeout(15000); console.log(await state()); }
  await fr.evaluate(() => { G.setSpeed(1); G.cam.z = 1.0; G.applyCam(); });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: out('1-pond') });
  await fr.evaluate(() => { const W = G.W, top = W.species.filter((s) => !s.extinct).sort((a, b) => b.n - a.n)[0], c = W.cre.find((x) => x.sp === top.id) || W.cre[0]; G.focusOn(c.x, c.y, 2.4); if (G.select) G.select(c); });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: out('2-close') });
  await fr.evaluate(() => G.showCosts());
  await page.waitForTimeout(500);
  await page.screenshot({ path: out('3-costs') });
  const rep = await fr.evaluate(() => {
    const W = G.W, L = [];
    L.push('SHAPES OF BODY: ' + W.plans.map((p) => p.name + ' [' + (p.because || 'whim') + ']' + (p.seen ? ' looked over: ' + Math.round(p.seen.score * 10) + '/10' : '') + ' · ' + W.cre.filter((c) => c.g.f.pl === p.id).length + ' have it').join(' | '));
    L.push('KINDS OF PART: ' + W.designs.map((d) => d.name + ' (' + d.place + (d.hits >= 0 ? ', a weapon/shield' : '') + ') [' + (d.because || 'whim') + '] · ' + W.cre.filter((c) => c.g.f.rules.some((q) => q.k === 8 && q.t === d.id)).length + ' have it').join(' | '));
    L.push('IDEAS THAT WENT: ' + (W.museLog || []).map((m) => m.name + ': ' + m.what).join(' | '));
    L.push('GRADES: ' + W.species.filter((s) => !s.extinct && s.judge).sort((a, b) => b.n - a.n).slice(0, 8).map((s) => s.name + ' ×' + s.n + ' ' + Math.round(s.judge.score * 10) + '/10' + (s.judge.est ? '~' : '') + ' ' + (s.judge.fix || '') + ' "' + s.judge.why + '"').join('\n        '));
    L.push('COST BY KIND: ' + Object.keys(G.ai.count).map((k) => k + ' ' + G.ai.count[k].fresh + ' calls ' + G.ai.money(G.ai.count[k].usd || 0)).join(' · ') + ' · TOTAL ' + G.ai.money(G.ai.totals().usd) + (G.ai.totals().unpriced ? ' · UNPRICED ' + G.ai.totals().unpriced : ''));
    L.push('DISCOVERIES (last): ' + W.discLog.slice(-6).map((d) => d.text.slice(0, 150)).join('\n        '));
    return L.join('\n');
  });
  console.log(rep);
  console.log(errs.slice(0, 5).join('\n') || 'no errors');
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
