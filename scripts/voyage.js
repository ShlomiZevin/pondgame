// A voyage, as the player makes it: wait for the spaceport and the ship, open NOW, PLAN A VOYAGE, pick a pond, watch the mission (gather, board, countdown,
// lift-off), cross, live there a while, look back at home, bring one of theirs home.  node scripts/voyage.js   (no AI: free)
const { chromium } = require('../../plaxzy-creator/node_modules/playwright-core');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 860 } });
  const errs = []; page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message)); page.on('console', (m) => { if (m.type() === 'error' && !/404|413/.test(m.text())) errs.push('CONSOLE ' + m.text().slice(0, 240)); });
  const shot = (n) => page.screenshot({ path: path.join(__dirname, 'voyage-' + n + '.png') });
  await page.goto((process.env.BASE || 'http://localhost:8787') + '/dev?user=voy' + Date.now() + '&ai=0', { waitUntil: 'load' });
  await page.waitForTimeout(2500);
  const fr = page.frames().find((f) => f !== page.mainFrame());
  await fr.locator('#tBegin').click(); await page.waitForTimeout(1200);
  await fr.evaluate(() => { window._met = []; window._stages = []; G.on('stranger-met', (c, end) => _met.push(end)); G.on('mission-stage', (d, w) => _stages.push(w)); G.setSpeed(16); });
  let ship = null, portSeen = false;
  for (let i = 0; i < 240 && !ship; i++) { await page.waitForTimeout(2000);
    const st = await fr.evaluate(() => { const s = G.far.shipOf(), p = (G.W.works || []).filter((w) => w.bp && w.bp.type === 'port')[0]; return { gen: G.W.gen, port: p ? p.name : '', ship: s ? s.name + ' (' + s.bp.P.length + ' pieces, ' + (s.bp.designed ? 'their own design' : 'the plain shape') + ')' : '' }; });
    if (st.port && !portSeen) { portSeen = true; console.log('port: ' + st.port + ' in generation ' + st.gen); await fr.evaluate(() => { G.setSpeed(1); const p = (G.W.works || []).filter((w) => w.bp && w.bp.type === 'port')[0]; G.focusOn(p.x, p.y, 1.3); }); await page.waitForTimeout(900); await shot('0-port'); await fr.evaluate(() => G.setSpeed(16)); }
    if (st.ship) ship = st.ship + ' in generation ' + st.gen; }
  console.log('ship: ' + ship); if (!ship) { await shot('0-noship'); await browser.close(); process.exit(1); }
  await fr.evaluate(() => { G.setSpeed(1); const s = G.far.shipOf(); G.focusOn(s.x, s.y - 30, 1.3); G.selectThing({ k: 'work', o: s }); window._home = { seed: G.W.seed, gen: G.W.gen, n: G.W.cre.length }; }); await page.waitForTimeout(1500);
  await shot('1-ship-card');
  await fr.evaluate(() => G.selectThing(null));
  console.log('NOW badge: "' + await fr.locator('#tb-now .tbadge').innerText() + '"');
  await fr.locator('#tb-now').click(); await page.waitForTimeout(900); await shot('2-now-panel');
  console.log('NOW says: ' + (await fr.locator('#rarebox').innerText()).replace(/\n+/g, ' / ').slice(0, 420));
  await fr.locator('#rarebox [data-act="voyPick"]').click(); await page.waitForTimeout(1900);
  const pond = await fr.evaluate(() => { const F = G.far, v = G.view, cs = Math.max(v.ww, v.wh) / (v.grow || 1) * 8; let best = null; for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) { const c = F.cell(i, j); if (!c || c.free) continue; const jt = F.jit(i, j), x = G.W.ww / 2 + (i + jt[0]) * cs, y = G.W.wh / 2 + (j + jt[1]) * cs, d = Math.hypot(i + jt[0], j + jt[1]); if (!best || d < best.d) best = { d, x, y, name: c.name }; } G.emit('pond-click', { x: best.x, y: best.y }); return best.name; });
  await page.waitForTimeout(1500); await shot('3-far-card'); console.log('picked: ' + pond + ' · card: ' + (await fr.locator('#farcard').innerText()).replace(/\n+/g, ' / ').slice(0, 300));
  await fr.locator('#farSail').click();
  // the mission, stage by stage
  const seen = {}; let t0 = Date.now();
  while (Date.now() - t0 < 110000) { const st = await fr.evaluate(() => { const d = G.W.deed; return { v: !!G.far.visiting, stage: d && d.voyage ? d.steps[d.i].do : '', t: d ? d.t : 0, inN: d ? G.W.cre.filter((c) => c.inShip).length : 0, n: d ? G.W.cre.filter((c) => c.deedId === d.id).length : 0, wait: d && !d.voyage ? d.title : '' }; });
    if (st.v) break;
    if (st.stage && !seen[st.stage] && (st.stage !== 'countdown' || st.t > 3.2) && (st.stage !== 'gather' || st.t > 3) && (st.stage !== 'board' || st.t > 4) && (st.stage !== 'liftoff' || st.t > 1.3)) { seen[st.stage] = 1; await shot('4-' + st.stage); console.log('  stage ' + st.stage + ': ' + st.inN + ' of ' + st.n + ' aboard · bar: ' + (await fr.locator('#voypick').innerText().catch(() => '')).replace(/\n+/g, ' / ').slice(0, 150)); }
    if (st.wait && !seen.wait) { seen.wait = 1; console.log('  (waiting for another plan to end: ' + st.wait + ')'); }
    if (!st.stage && Object.keys(seen).length > 3 && !seen.cross) { seen.cross = 1; await page.waitForTimeout(1800); await shot('5-crossing'); }
    await page.waitForTimeout(350); }
  console.log('stages seen: ' + await fr.evaluate(() => _stages.join(' > ')));
  console.log('arrived: ' + await fr.evaluate(() => { const V = G.far.visiting; return V ? V.name + ', generation ' + G.W.gen + ', ' + G.W.cre.filter((c) => !c.line).length + ' of theirs, ' + G.W.cre.filter((c) => c.line).length + ' of ours, another pond: ' + (G.W.seed !== _home.seed) + ', bar: ' + document.getElementById('voybar').innerText.replace(/\n+/g, ' / ') : 'NOT VISITING'; }));
  await page.waitForTimeout(1500); await shot('6a-landing'); await page.waitForTimeout(5500); await shot('6b-stepping-out'); await page.waitForTimeout(4000); await shot('6-arrived');
  for (let i = 0; i < 40 && (await fr.evaluate(() => _met.length)) < 2; i++) await page.waitForTimeout(1000);
  console.log('what they made of ours: ' + await fr.evaluate(() => _met.join(', ')));
  // two ponds to watch
  await fr.locator('#voyLookHome').click(); await page.waitForTimeout(1800); await shot('7-watch-home');
  console.log('watching home: ' + await fr.evaluate(() => 'own pond ' + (G.W.seed === _home.seed) + ', ' + G.W.cre.length + ' alive, ship here ' + !!G.far.shipOf() + ', bar: ' + document.getElementById('voybar').innerText.replace(/\n+/g, ' / ')));
  await fr.locator('#voyLookFar').click(); await page.waitForTimeout(1800);
  console.log('back there: ' + await fr.evaluate(() => (G.far.there() ? G.far.there().name : 'NOT THERE') + ', ' + G.W.cre.length + ' alive, ship ' + !!G.far.shipOf()));
  // one of theirs is told to come home with the ship
  await fr.evaluate(() => { const c = G.W.cre.filter((x) => !x.dead && !x.line).sort((a, b) => b.g.s[0] - a.g.s[0])[0]; G.select(c); G.focusOn(c.x, c.y, 1.4); }); await page.waitForTimeout(1300);
  await fr.locator('#iaboard').click(); await page.waitForTimeout(500); await shot('8-bring-home');
  await fr.evaluate(() => G.select(null)); await fr.locator('#voyHome').click();
  { let got = false; for (let i = 0; i < 160; i++) { await page.waitForTimeout(500); const st = await fr.evaluate(() => ({ v: !!G.far.visiting, bar: (document.getElementById('voypick') || {}).innerText || '' })); if (!got && /BOARD|aboard/.test(st.bar) && i > 16) { got = true; await shot('8b-called-back'); console.log('  flight home: ' + st.bar.split(String.fromCharCode(10)).filter(Boolean).join(' / ').slice(0, 160)); } if (!st.v) break; } await page.waitForTimeout(1500); await shot('8c-landing-home'); await page.waitForTimeout(7000); }
  console.log('home: ' + await fr.evaluate(() => 'same pond ' + (G.W.seed === _home.seed) + ', generation ' + G.W.gen + ', ' + G.W.cre.length + ' alive, visiting ' + !!G.far.visiting + ', strangers here ' + G.W.cre.filter((c) => c.stranger !== undefined).map((c) => c.guestName + ' (' + G.characterOf(c) + ')').join('; ') + ', ship here ' + !!G.far.shipOf() + ', book ' + JSON.stringify(Object.keys(G.far.book).map((k) => G.far.book[k].name + ': ' + G.far.book[k].mine + ' of ours'))));
  await page.waitForTimeout(1200); await shot('9-home');
  // the tidied cards
  await fr.evaluate(() => { const c = G.W.cre.filter((x) => !x.dead && x.age > 0).sort((a, b) => (b.lessons || 0) - (a.lessons || 0))[0]; G.select(c); G.focusOn(c.x, c.y, 1.6); }); await page.waitForTimeout(1300); await shot('10-creature-card');
  await fr.evaluate(() => G.openGenes('about')); await page.waitForTimeout(1200); await shot('11a-about'); await fr.evaluate(() => G.openGenes('genes')); await page.waitForTimeout(900); await shot('11-genes'); await fr.evaluate(() => G.openGenes('brain')); await page.waitForTimeout(900); await shot('11b-brain'); console.log('creature window scrolls: ' + await fr.evaluate(() => { const w = document.getElementById('gbwin'); return w ? (w.scrollHeight > w.clientHeight + 2) + ' (' + w.scrollHeight + ' in ' + w.clientHeight + ')' : 'none'; })); await fr.evaluate(() => G.closeGenes());
  await fr.evaluate(() => { G.select(null); const w = (G.W.works || []).filter((q) => q.bp && q.bp.type !== 'ship' && q.bp.type !== 'port')[0]; if (w) { G.selectThing({ k: 'work', o: w }); G.focusOn(w.x, w.y, 1.4); } }); await page.waitForTimeout(1300); await shot('12-building-card');
  await fr.evaluate(() => { G.selectThing(null); G.hub.open('people'); }); await page.waitForTimeout(1100); await shot('13-now-people'); console.log('PEOPLE: ' + (await fr.locator('#rarebox').innerText()).split(String.fromCharCode(10)).filter(Boolean).join(' / ').slice(0, 300));
  await fr.evaluate(() => G.hub.open('space')); await page.waitForTimeout(1100); await shot('14-now-space'); console.log('SPACE: ' + (await fr.locator('#rarebox').innerText()).split(String.fromCharCode(10)).filter(Boolean).join(' / ').slice(0, 420));
  await fr.evaluate(() => { G.hub.close(); const c = G.W.cre.filter((x) => !x.dead)[5]; G.select(c); G.judge(c, true); G.openTaught(); }); await page.waitForTimeout(1200); await shot('15-taught');
  console.log(errs.slice(0, 8).join('\n') || 'no errors');
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
