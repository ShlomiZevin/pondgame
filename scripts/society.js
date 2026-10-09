// Society: a leader and those behind it, a dance, a gift, and the character on the card and in the genes window.  node scripts/society.js   (no AI: free)
const { chromium } = require('../../plaxzy-creator/node_modules/playwright-core');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 860 } });
  const errs = []; page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message)); page.on('console', (m) => { if (m.type() === 'error' && !/404|413/.test(m.text())) errs.push('CONSOLE ' + m.text().slice(0, 240)); });
  await page.goto((process.env.BASE || 'http://localhost:8787') + '/dev?user=soc' + Date.now() + '&ai=0', { waitUntil: 'load' });
  await page.waitForTimeout(2500);
  const fr = page.frames().find((f) => f !== page.mainFrame());
  await fr.locator('#tBegin').click(); await page.waitForTimeout(1200);
  await fr.evaluate(() => { window._n = { share: 0, dance: 0 }; G.on('share', () => _n.share++); G.on('dance', () => _n.dance++); G.setSpeed(64); });
  await page.waitForTimeout(45000);
  await fr.evaluate(() => G.setSpeed(1)); await page.waitForTimeout(4000);
  console.log(await fr.evaluate(() => 'gen ' + G.W.gen + ', alive ' + G.W.cre.length + ', gifts ' + _n.share + ', dances ' + _n.dance + '\n' + G.W.species.filter((s) => !s.extinct && s.n >= 3).map((s) => { const so = G.societyOf(s.id); return '  the ' + s.name + ' (' + s.n + '): ' + (so ? so.text : '-'); }).join('\n')));
  await page.screenshot({ path: path.join(__dirname, 'society-1-pond.png') });
  // the most followed, close up, with its card
  const who = await fr.evaluate(() => { const c = G.W.cre.filter((x) => !x.dead).sort((a, b) => (b.fol || 0) - (a.fol || 0))[0]; G.select(c); G.focusOn(c.x, c.y, 2.2); return '#' + c.id + ' followed by ' + (c.fol || 0) + ': ' + G.characterOf(c) + ' · ' + G.societyText(c) + ' · mean distance of its followers ' + Math.round(G.W.cre.filter((x) => x.leader === c).reduce((t, x, i, a) => t + Math.hypot(x.x - c.x, x.y - c.y) / a.length, 0)); });
  console.log('leader ' + who);
  await page.waitForTimeout(1500); await page.screenshot({ path: path.join(__dirname, 'society-2-leader.png') });
  await fr.evaluate(() => G.openGenes()); await page.waitForTimeout(800); await page.screenshot({ path: path.join(__dirname, 'society-3-genes.png') });
  await fr.evaluate(() => G.openGenes()); await page.waitForTimeout(300);
  // a dancer, caught in the act
  for (let i = 0; i < 40; i++) { const got = await fr.evaluate(() => { const c = G.W.cre.find((x) => !x.dead && x.dance > 1.2); if (!c) return 0; G.select(null); G.focusOn(c.x, c.y, 2.6); return c.id; }); if (got) { await page.waitForTimeout(500); await page.screenshot({ path: path.join(__dirname, 'society-4-dance.png') }); console.log('dancer #' + got); break; } await page.waitForTimeout(500); }
  // a stranger set down among them: the strongest leader gene we can make
  console.log('stranger: ' + await fr.evaluate(() => { const al = G.W.cre.filter((x) => !x.dead), g = G.cloneGenome(al[0].g); g.s[0] = 0.98; g.t[2] = (g.t[2] + 180) % 360; const big = G.W.species.filter((q) => !q.extinct).sort((p, q) => q.n - p.n)[0], mem = al.filter((x) => x.sp === big.id), mx = mem.reduce((t, x) => t + x.x, 0) / mem.length, my = mem.reduce((t, x) => t + x.y, 0) / mem.length; const c = G.dropCreature(g, mx, my); window._str = c; return '#' + c.id + ' kind ' + c.sp; }));
  await fr.evaluate(() => { _str.g.mv = 0; }); for (let i = 0; i < 20; i++) { await page.waitForTimeout(1000); await fr.evaluate(() => { _str.E = _str.ph.Emax * 0.8; }); }
  console.log('after 20 s the stranger is followed by ' + await fr.evaluate(() => { const c = _str; G.select(c); G.focusOn(c.x, c.y, 2); return (c.fol || 0) + (c.dead ? ' (dead)' : '') + ' · ' + G.characterOf(c) + ' · ' + G.societyText(c); }));
  await page.waitForTimeout(1200); await page.screenshot({ path: path.join(__dirname, 'society-5-stranger.png') });
  console.log(errs.slice(0, 6).join('\n') || 'no errors');
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
