// Marvels, invented live:  node scripts/marvels.js [how many] [speak: 1 = also have one line spoken aloud (costs about $0.13)]
// Lets a pond evolve, drops a thing and causes an event so there is something to answer, then asks for marvels and prints
// what the AI made each one of. Saves a close-up of each.
const { chromium } = require('../../plaxzy-creator/node_modules/playwright-core');
const path = require('path');
const N = +process.argv[2] || 3, speak = process.argv[3] === '1';
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errs = []; page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message));
  await page.goto((process.env.BASE || 'http://localhost:8787') + '/dev?user=marvel' + Date.now(), { waitUntil: 'load' });
  await page.waitForTimeout(3000);
  const fr = page.frames().find((f) => f !== page.mainFrame());
  await fr.locator('#tBegin').click();
  await fr.evaluate(() => { G.ai.caps.wishcheck = 0; G.ai.caps.watch = 0; G.ai.caps.plan = 0; G.ai.caps.design = 0; G.ai.caps.organ = 0; G.ai.caps.story = 0; G.ai.caps.figure = 0; G.setSpeed(64); });
  await page.waitForTimeout(14000);
  await fr.evaluate(async () => { G.setSpeed(1); const ev = await G.ai.ask('event', 'a long ice age'); if (ev) G.runEvent(ev); });
  for (let i = 0; i < N; i++) {
    const before = await fr.evaluate(() => (G.W.mv && G.W.mv.n) || 0);
    await fr.evaluate(() => G.grantMarvel());
    let got = null;
    for (let t = 0; t < 40 && !got; t++) { await page.waitForTimeout(1500); got = await fr.evaluate((before) => { const W = G.W; if (((W.mv && W.mv.n) || 0) <= before) return null; const c = W.cre.filter((x) => x.g.mv).sort((a, b) => (b.marvelBorn || 0) - (a.marvelBorn || 0) || b.id - a.id)[0]; if (!c) return 'given, but its bearer is gone'; const d = c.ph.mv; G.select(c); G.focusOn(c.x, c.y, 2.6);
      return d.name + (d.by ? '' : '  [BUILT-IN: the AI was not used]') + '\n   ' + d.wonder + '\n   why: ' + (d.why || '-') + '\n   powers: ' + ((d.powers || []).map((p) => p.kind + ' of ' + p.stuff + ' on ' + p.to + ' (' + ['hurt', 'strike', 'slow', 'pull', 'heal', 'feed'].filter((k) => Math.abs(p[k]) > 0.05).map((k) => k + ' ' + p[k]).join(', ') + (p.kind === 'pulse' ? ', every ' + p.every + 's' : '') + ')').join(' · ') || 'none') + (d.sp ? ' · special: ' + d.sp : '') +
        '\n   says: ' + ((d.words || []).join(' | ') || 'nothing') + (d.words && d.words.length ? '  [voice: ' + d.voice.tone + ', speed ' + d.voice.speed + ']' : '') + '\n   sign: ' + (d.emblem ? 'drawn by the AI (' + d.emblem.length + ' chars)' : 'a stock sign (' + d.glyph + ')') + '\n   on: ' + G.form.kind(c.g.f).full; }, before); }
    console.log((i + 1) + '. ' + (got || 'nothing came'));
    await page.waitForTimeout(2500);
    await page.screenshot({ path: path.join(__dirname, 'marvel-live-' + (i + 1) + '.png') });
  }
  if (speak) console.log('spoken line: ' + await fr.evaluate(async () => { const c = G.W.cre.find((x) => x.ph.mv && x.ph.mv.words && x.ph.mv.words.length); if (!c) return 'no talking marvel alive'; const d = c.ph.mv; const r = await G.host.call('ai.voice', { text: d.words[0], tone: d.voice.tone }, 60000).catch((e) => ({ error: String(e) })); return '"' + d.words[0] + '" (' + d.voice.tone + ') → ' + (r.sound ? r.sound.mime + ', ' + Math.round(r.sound.b64.length * 0.75 / 1024) + ' kB, ' + r.source + (r.usd ? ', $' + r.usd : '') : 'failed: ' + JSON.stringify(r).slice(0, 120)); }));
  console.log('cost: ' + await fr.evaluate(() => JSON.stringify(G.ai.count.marvel || {})));
  console.log(errs.slice(0, 5).join('\n') || 'no errors');
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
