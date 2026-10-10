// The sounds of a star: are they fetched (from the library, free), defined and played?   node scripts/sound-check.js   (no AI: free; nothing can be HEARD here, only that they are there)
const { chromium } = require('../../plaxzy-creator/node_modules/playwright-core');
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  const errs = []; page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message)); page.on('console', (m) => { if (m.type() === 'error' && !/404|413/.test(m.text())) errs.push('CONSOLE ' + m.text().slice(0, 200)); });
  await page.goto((process.env.BASE || 'http://localhost:8787') + '/dev?user=snd' + Date.now() + '&ai=0', { waitUntil: 'load' }); await page.waitForTimeout(2500);
  const fr = page.frames().find((f) => f !== page.mainFrame());
  await fr.evaluate(() => { window._played = []; if (window.PXS) { const p0 = PXS.play, l0 = PXS.loop; PXS.play = function (n, o) { _played.push('play ' + n); return p0.apply(PXS, arguments); }; PXS.loop = function (n, o) { _played.push('loop ' + n); return l0.apply(PXS, arguments); }; } });
  await fr.locator('#tBegin').click(); await page.waitForTimeout(7000);
  console.log('calls: ' + JSON.stringify(await page.evaluate(() => (window.__calls || []).filter((c) => c.op === 'sfx').map((c) => c.status))));
  console.log('terrain ' + await fr.evaluate(() => G.terrainOf(G.W).id) + ' · loops and plays so far: ' + await fr.evaluate(() => _played.filter((p) => /fx:|loop/.test(p)).join(', ')));
  console.log('each moment has its sound: ' + await fr.evaluate(() => ['built', 'liftoff', 'landing', 'raid', 'grew'].map((n) => n + ' ' + (G.fxSound(n, { volume: 0 }) ? 'yes' : 'NO')).join(' · ')));
  await fr.evaluate(() => { G.emit('colony-tier', 1, 0); G.emit('raid-warn', { name: 'Test', n: 3 }); }); await page.waitForTimeout(300);
  console.log('after a tier and a raid warning: ' + await fr.evaluate(() => _played.filter((p) => /fx:(grew|raid)/.test(p)).join(', ')));
  // every sound measured (nobody here can hear them): how long, how loud, silence before it starts, and for the air of a star whether the loop's end meets its beginning
  await fr.evaluate(() => { ['reef', 'crag', 'marsh', 'crystal', 'ember', 'frost'].forEach((t) => G.fxWant('amb.' + t)); }); await page.waitForTimeout(4000);
  const F = await fr.evaluate(() => G.fxFacts());
  Object.keys(F).sort().forEach((k) => { const m = F[k]; console.log('  ' + k.padEnd(12) + (m.unused ? 'NOT USED (' + m.unused + ')' : (m.secs + ' s').padEnd(9) + ('loudness ' + m.rms).padEnd(17) + ('peak ' + m.peak).padEnd(12) + ('starts after ' + m.lead + ' s').padEnd(21) + (k.indexOf('amb.') === 0 ? ('loop seam ' + (m.seam0 === undefined ? m.seam : m.seam0 + ' → joined')).padEnd(26) : ''.padEnd(26)) + 'played at ' + m.gain)); });
  console.log(errs.slice(0, 6).join('\n') || 'no errors'); await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
