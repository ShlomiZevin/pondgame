// Lift-off, close up and frame by frame: the fire, the smoke and the dust under the ship (59b_rocketfx.js).   node scripts/liftoff.js   (no AI: free)
const { chromium } = require('../../plaxzy-creator/node_modules/playwright-core');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 860 } });
  const errs = []; page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message)); page.on('console', (m) => { if (m.type() === 'error' && !/404|413/.test(m.text())) errs.push('CONSOLE ' + m.text().slice(0, 240)); });
  const shot = (n) => page.screenshot({ path: path.join(__dirname, 'liftoff-' + n + '.png') });
  await page.goto((process.env.BASE || 'http://localhost:8787') + '/dev?user=mis' + Date.now() + '&ai=0', { waitUntil: 'load' });
  await page.waitForTimeout(2500);
  const fr = page.frames().find((f) => f !== page.mainFrame());
  await fr.locator('#tBegin').click(); await page.waitForTimeout(1200);
  if (process.env.TERR) await fr.evaluate((id) => { const T = G.TERRAINS.filter((t) => t.id === id)[0]; if (T) G.terrainOf = function () { return T; }; }, process.env.TERR);
  await fr.evaluate(() => G.setSpeed(64)); await page.waitForTimeout(16000);
  console.log(await fr.evaluate(() => { G.setSpeed(1); const W = G.W; if (W.deed) G.deedStop('off'); window._log = []; G.on('deed-end', (d, how) => _log.push('END ' + d.title + ' ' + how)); G.on('mission-stage', (d, w) => _log.push('stage ' + w + ' at ' + Math.round(W.t)));
    const sp = W.species.filter((s) => !s.extinct).sort((a, b) => b.n - a.n)[0], sy = G.shoreY(W), mk = (type, S, x, base) => { const bp = G.blueprintFrom({ seed: 7, type, S, hue: sp.hue, spiky: 0, brain: 0.6, wet: false }, '2'.repeat(60)); const w = { name: 'Test ' + type, looks: 'made by hand for the test', x, y: base - S * 0.45, r: 80, until: W.t + 1e6, by: sp.name, hue: sp.hue, sp: sp.id, field: 0, plan: 'Test', gen: W.gen, bp }; (W.works = W.works || []).push(w); return w; };
    const port = mk('port', 100, W.ww * 0.13, sy - 10), ship = mk('ship', 70, port.x + 28, G.padTop(port));
    G.focusOn(ship.x, ship.y - 40, 1.1); window._ship = ship;
    return 'gen ' + W.gen + ', kind ' + sp.name + ' (' + sp.n + '), shore y ' + Math.round(sy) + ', ship at ' + Math.round(ship.x) + ',' + Math.round(ship.y) + ', whole ' + !!G.far.shipOf() + ', crew ' + G.far.crewFor(ship).map((c) => '#' + c.id + ' ' + c.crewWhy + ' d' + Math.round(Math.hypot(c.x - ship.x, c.y - ship.y)) + ' air' + c.g.t[5].toFixed(1)).join(', '); }));
  await page.waitForTimeout(1500); await shot('0-port-and-ship');
  await fr.evaluate(() => { G.colony().stock[3] = Math.max(G.colony().stock[3], 12);      /* (lumen to fly on) */ const F = G.far; let p = null; for (let i = -2; i <= 2 && !p; i++) for (let j = -2; j <= 2 && !p; j++) { const c = F.cell(i, j); if (c && !c.free) p = c; } G.voyageGo(p); });
  const seen = {}; const t0 = Date.now();
  while (Date.now() - t0 < 150000) { const st = await fr.evaluate(() => { const d = G.W.deed; return { v: !!G.far.visiting, stage: d && d.voyage ? d.steps[d.i].do : '', t: d ? +d.t.toFixed(1) : 0, secs: d ? d.steps[d.i].secs : 0, inN: G.W.cre.filter((c) => c.inShip).length, M: d ? G.W.cre.filter((c) => c.deedId === d.id).map((c) => Math.round(Math.hypot(c.x - d.x, c.y - d.y))).join('/') : '', log: _log.splice(0).join(' | ') }; });
    if (st.log) console.log('  ' + st.log);
    if (st.v) break;
    const key = st.stage + ':' + Math.floor(st.t / 4); if (st.stage && !seen[key]) { seen[key] = 1; console.log('  ' + st.stage + ' t=' + st.t + '/' + st.secs + ' aboard ' + st.inN + ' dist ' + st.M); }
    if (st.stage === 'countdown' && st.t > 8.6 && !seen.c) { seen.c = 1; await shot('1-engines-coming-up'); }
    if (st.stage === 'liftoff') { for (const [k, at] of [['2-ignition', 0.25], ['3-rising', 1.0], ['4-clear-of-the-pad', 1.8], ['5-away', 2.7]]) if (st.t >= at && !seen[k]) { seen[k] = 1; await shot(k); console.log('  ' + k + ' at ' + st.t + ' · in the air: ' + await fr.evaluate(() => G.rocketFx.count()) + ' puffs and sparks'); break; } }
    if (!st.stage && seen.sliftoff && !seen.cross) { seen.cross = 1; await page.waitForTimeout(2000); await shot('2-crossing'); }
    await page.waitForTimeout(st.stage === 'liftoff' || (st.stage === 'countdown' && st.t > 8) ? 40 : 300); }
  console.log('visiting: ' + await fr.evaluate(() => G.far.visiting ? G.far.visiting.name + ', ' + G.W.cre.filter((c) => c.line).length + ' of ours set down' : 'NO'));
  await page.waitForTimeout(2000); await shot('3-arrived');
  console.log(errs.slice(0, 8).join('\n') || 'no errors');
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
