// World events, composed freely by the AI and acted out:  node scripts/disaster.js "a volcano erupts" "a whirlpool" ...
// For each: prints what the AI built it from, and saves the pond a few seconds in and a while later.
const { chromium } = require('../../plaxzy-creator/node_modules/playwright-core');
const path = require('path');
const list = process.argv.slice(2).length ? process.argv.slice(2) : ['a volcano erupts in the middle', 'a giant whirlpool', 'a meteor shower', 'an ice wall'];
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 820 } });
  const errs = []; page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message));
  await page.goto((process.env.BASE || 'http://localhost:8787') + '/dev?user=dis' + Date.now(), { waitUntil: 'load' });
  await page.waitForTimeout(3000);
  const fr = page.frames().find((f) => f !== page.mainFrame());
  await fr.locator('#tBegin').click(); await fr.evaluate(() => { G.ai.caps.wishcheck = 0; G.ai.caps.watch = 0; G.setSpeed(32); }); await page.waitForTimeout(9000); await fr.evaluate(() => G.setSpeed(1));
  for (let i = 0; i < list.length; i++) {
    const got = await fr.evaluate(async (t) => {
      const W = G.W; W.mods = []; W.fields = []; W.strikes = [];
      const before = W.cre.length, ev = await G.ai.ask('event', t); if (!ev) return 'nothing';
      G.runEvent(ev);
      const dial = ['temp', 'light', 'poison', 'current'].filter((k) => Math.abs(ev[k]) > 0.05).map((k) => k + ' ' + ev[k]).concat(ev.food !== 1 ? ['food ' + ev.food] : [], ev.kill.share > 0.02 ? ['kills ' + ev.kill.share + ' ' + ev.kill.who] : [], ev.fx ? ['weather ' + ev.fx] : []);
      return ev.name + ' — ' + ev.note + '\n   pond-wide: ' + (dial.join(', ') || 'nothing') + (ev.thing ? ' · leaves ' + ev.thing.name : '') +
        '\n   fields: ' + (ev.fields.map((f) => f.name + ' [' + f.stuff + ' ' + f.shape + (f.after ? ', after ' + f.after + 's' : '') + ': ' + (G.fieldWords(f) || 'no effect') + ', ' + f.life + 's]').join('\n           ') || 'none') +
        '\n   strikes: ' + (ev.strikes ? ev.strikes.count + ' × ' + ev.strikes.name + ' over ' + ev.strikes.over + 's, kill ' + ev.strikes.kill + ', food ' + ev.strikes.feed : 'none') + '\n   cost so far: ' + G.ai.money(G.ai.totals().usd) + ' · alive ' + before;
    }, list[i]);
    console.log('“' + list[i] + '” → ' + got);
    await page.waitForTimeout(4000); await page.screenshot({ path: path.join(__dirname, 'disaster-' + (i + 1) + 'a.png') });
    await page.waitForTimeout(14000); await page.screenshot({ path: path.join(__dirname, 'disaster-' + (i + 1) + 'b.png') });
    console.log('   18 s later: alive ' + await fr.evaluate(() => G.W.cre.length + ' · fields in force ' + (G.W.fields || []).filter((f) => G.W.t >= f.start).length));
  }
  console.log(errs.slice(0, 5).join('\n') || 'no errors');
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
