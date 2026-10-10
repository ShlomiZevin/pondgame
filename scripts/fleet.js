// A fleet: two spaceports and two starships are ordered and built, then a mission takes both ships and a double crew to a rival star.   node scripts/fleet.js   (no AI: free)
const { chromium } = require('../../plaxzy-creator/node_modules/playwright-core');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 860 } });
  const errs = []; page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message)); page.on('console', (m) => { if (m.type() === 'error' && !/404|413/.test(m.text())) errs.push('CONSOLE ' + m.text().slice(0, 240)); });
  const shot = async (n) => { await page.waitForTimeout(500); await page.screenshot({ path: path.join(__dirname, 'fleet-' + n + '.png') }); console.log('shot ' + n); };
  await page.goto((process.env.BASE || 'http://localhost:8787') + '/dev?user=fleet' + Date.now() + '&ai=0', { waitUntil: 'load' }); await page.waitForTimeout(2500);
  const fr = page.frames().find((f) => f !== page.mainFrame());
  await fr.locator('#tBegin').click(); await page.waitForTimeout(1200);
  const ff = (secs) => fr.evaluate((s) => { for (let t = 0; t < s; t += 0.1) G.step(0.1); }, secs);
  await fr.evaluate(() => { while (G.W.gen < 11) G.step(0.1); const c = G.colony(); c.peace = true; c.auto = false; c.share = {}; Object.assign(c.want, { g: 6, b: 6, f: 12, u: 0 }); c.stock = [120, 120, 120, 30]; G.setSpeed(1); G.camHome(); G.select(null); });
  // what may be ordered, and what may not
  const say = await fr.evaluate(() => { const W = G.W, h = G.heartOf(W), out = [], spots = [[430, -160], [-430, -160], [430, 240], [-430, 240], [0, 380]];
    out.push('a ship with no port: ' + (G.buildOk('ship', 0, 0) || 'ALLOWED'));
    spots.forEach((s, i) => { const p = G.lotPick(W, h.x + s[0], h.y + s[1], 'port'), r = p ? G.buildOrder('port', p.x, p.y) : { error: 'no lot' }; out.push('port ' + (i + 1) + ': ' + (r && r.error ? r.error : 'ordered')); });
    return out.join(' | '); });
  console.log(say);
  for (let i = 0; i < 20; i++) { await ff(60); if (await fr.evaluate(() => !G.colony().queue.length && !G.W.deed)) break; }
  console.log('ports standing: ' + await fr.evaluate(() => (G.W.works || []).filter((w) => w.bp && w.bp.type === 'port').map((w) => w.name + ' ' + G.buildCount(w).join('/')).join(', ')));
  console.log(await fr.evaluate(() => { const out = []; for (let i = 0; i < 5; i++) { const r = G.buildOrder('ship', 0, 0); out.push('ship ' + (i + 1) + ': ' + (r && r.error ? r.error : 'ordered')); } return out.join(' | '); }));
  for (let i = 0; i < 24; i++) { await ff(60); if (await fr.evaluate(() => !G.colony().queue.length && !G.W.deed)) break; }
  console.log('ships standing: ' + await fr.evaluate(() => (G.W.works || []).filter((w) => w.bp && w.bp.type === 'ship').map((w) => w.name + ' ' + G.buildCount(w).join('/') + ' at ' + Math.round(w.x) + ',' + Math.round(w.y)).join(', ') + ' · ready to fly: ' + G.far.fleet().length + ' · lumen ' + G.colony().stock[3]));
  await fr.evaluate(() => { G.camHome(); G.select(null); }); await shot('1-four-ports');
  // the mission: against a rival, with every ship
  const plan = await fr.evaluate(() => { const F = G.far, ship = F.shipOf(), hd = F.holdOf(ship), crew = F.crewFor(ship); let p = null; for (let i = -3; i <= 3 && !p; i++) for (let j = -3; j <= 3 && !p; j++) { const c = F.cell(i, j); if (c && !c.free && !c.home && G.starOf(c).rival) p = c; } if (!p) for (let i = -2; i <= 2 && !p; i++) for (let j = -2; j <= 2 && !p; j++) { const c = F.cell(i, j); if (c && !c.free && !c.home) p = c; }
    window._lum0 = G.colony().stock[3]; G.voyageGo(p); return 'ships ' + hd.ships + ', carry ' + hd.crew + ', crew chosen before the war call ' + crew.length + ', to ' + p.name + (G.starOf(p).rival ? ' (a rival)' : ''); });
  console.log(plan);
  const seen = {}; const t0 = Date.now();
  while (Date.now() - t0 < 170000) { const st = await fr.evaluate(() => { const d = G.W.deed; return { v: !!G.far.visiting, stage: d && d.voyage ? d.steps[d.i].do : '', t: d ? +d.t.toFixed(1) : 0, inN: G.W.cre.filter((c) => c.inShip).length, M: d ? G.W.cre.filter((c) => c.deedId === d.id).length : 0, up: (G.W.works || []).filter((w) => w.lifting).length }; });
    if (st.v) break;
    if (st.stage && !seen[st.stage] && (st.stage !== 'liftoff' || st.t > 1.6) && (st.stage !== 'board' || st.t > 5)) { seen[st.stage] = 1; console.log('  ' + st.stage + ': crew ' + st.M + ', aboard ' + st.inN + ', ships in the air ' + st.up); if (st.stage === 'liftoff' || st.stage === 'board') await shot('2-' + st.stage); }
    await page.waitForTimeout(300); }
  await page.waitForTimeout(2500);
  console.log('there: ' + await fr.evaluate(() => { const V = G.far.visiting; if (!V) return 'NOT ARRIVED'; const W = G.W; return V.name + ' · ships landed ' + (W.works || []).filter((w) => w.visitor).length + ' (fleet of ' + V.fleetN + ') · of ours set down ' + W.cre.filter((c) => c.line && !c.dead).length + ' · ADDs ' + V.adds; }));
  await fr.evaluate(() => { const s = (G.W.works || []).filter((w) => w.visitor)[0]; if (s) { G.cam.z = 1.3; G.focusOn(s.x - 120, s.y + 40, 1.3); } }); await page.waitForTimeout(6000); await shot('3-landed');
  console.log('home meanwhile: ' + await fr.evaluate(() => { G.far.look('home'); const W = G.W; const r = 'ships away ' + (W.works || []).filter((w) => w.bp && w.bp.type === 'ship' && w.away).length + ' of ' + (W.works || []).filter((w) => w.bp && w.bp.type === 'ship').length + ' · lumen ' + G.colony().stock[3] + ' (was ' + window._lum0 + ')'; G.far.look('far'); return r; }));
  // home again: every ship that flew comes down on its own pad
  await fr.evaluate(() => { G.voyageHome(true); });
  let seenUp = 0, shotDone = false; const t1 = Date.now();
  while (Date.now() - t1 < 60000) { const st = await fr.evaluate(() => ({ v: !!G.far.visiting, up: (G.W.works || []).filter((w) => w.lifting).length })); if (!st.v && st.up > seenUp) seenUp = st.up; if (!st.v && st.up >= 2 && !shotDone) { shotDone = true; await page.waitForTimeout(900); await shot('4-coming-home'); } if (!st.v && seenUp && !st.up) break; await page.waitForTimeout(120); }
  console.log('home: ' + await fr.evaluate(() => { const W = G.W, S = (W.works || []).filter((w) => w.bp && w.bp.type === 'ship'), P = (W.works || []).filter((w) => w.bp && w.bp.type === 'port'); return 'ships standing ' + S.filter((w) => !w.lifting && !w.away).length + ' of ' + S.length + ' · each on a pad: ' + S.every((s) => P.some((p) => { const d = G.dockOf(p); return Math.abs(d.x - s.x) < 6 && Math.abs(d.y - s.bp.S * 0.45 - s.y) < 6; })); }) + ' · most in the air at once ' + seenUp);
  console.log(errs.slice(0, 8).join('\n') || 'no errors');
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
