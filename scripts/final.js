// The last pieces of this stage together: bigger brains, striking back, helping to build, moving a thing, the pond judged as a place.  node scripts/final.js   (one AI look, about a third of a cent)
const { chromium } = require('../../plaxzy-creator/node_modules/playwright-core');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 860 } });
  const errs = []; page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message)); page.on('console', (m) => { if (m.type() === 'error' && !/404|413/.test(m.text())) errs.push('CONSOLE ' + m.text().slice(0, 240)); });
  await page.goto((process.env.BASE || 'http://localhost:8787') + '/dev?user=final' + Date.now(), { waitUntil: 'load' });
  await page.waitForTimeout(3000);
  const fr = page.frames().find((f) => f !== page.mainFrame());
  await fr.locator('#tBegin').click(); await page.waitForTimeout(1500);
  await fr.evaluate(() => { for (const k in G.ai.caps) if (k !== 'judge') G.ai.caps[k] = 0; G.setSpeed(64); });
  await page.waitForTimeout(40000); await fr.evaluate(() => G.setSpeed(1));
  console.log('brains: ' + JSON.stringify(await fr.evaluate(() => { const C = G.W.cre, wired = (i) => C.filter((c) => c.g.w.some((w) => w.f === i)).length, does = (o) => C.filter((c) => c.g.w.some((w) => w.t === 200 + o)).length; return { gen: G.W.gen, alive: C.length, senses: G.NIN, actions: G.NOUT, wiredToArmed: wired(12), wiredToBuilding: wired(13), wiredToVoice: wired(14), wiredToPain: wired(15), canStrike: does(5), canHelp: does(6), mostCells: Math.max.apply(null, C.map((c) => c.g.h)) }; })));
  // two buildings by the same kind, then a knight
  const mk = (name, kind) => fr.evaluate(([name, kind]) => { const W = G.W, sp = W.species.filter((s) => !s.extinct && s.n > 5).sort((a, b) => b.n - a.n)[0]; G.deedStart({ kind: sp.name, title: 'The ' + name, say: 'Up!', what: 'build it', why: 'to live by', share: 0.7, steps: [{ do: 'build', secs: 25, cry: 'Heave!' }], place: { x: 0.45, y: 0.6 }, result: { name: name, looks: 'x', stuff: 'rock', shape: 'circle', size: 0.08, solid: false, feed: kind === 'huts' ? 0.3 : 0, slow: 0, hurt: 0, pull: kind === 'spire' ? 0.3 : 0, life: 200 } }); return !!W.deed; }, [name, kind]);
  await mk('Reed Village', 'huts'); await fr.evaluate(() => G.setSpeed(16)); await page.waitForTimeout(14000);
  await mk('Watch Tower', 'spire'); await page.waitForTimeout(14000); await fr.evaluate(() => G.setSpeed(1));
  console.log('buildings: ' + await fr.evaluate(() => (G.W.works || []).map((w) => w.name + ' at ' + Math.round(w.x) + ' ' + G.buildCount(w).join('/')).join(' | ') + ' · helpers who joined by their own brain: ' + ((G.W.deedPast || []).length ? '' : '') + G.W.cre.filter((c) => c.helper).length));
  console.log('place look asked: ' + await fr.evaluate(() => G.placeLook(true)));
  for (let i = 0; i < 20; i++) { await page.waitForTimeout(1500); if (await fr.evaluate(() => !!G.W.place)) break; }
  console.log('the pond as a place: ' + JSON.stringify(await fr.evaluate(() => G.W.place || null)) + ' · spend ' + JSON.stringify(await fr.evaluate(() => G.ai.life && G.ai.life.judge)));
  // a knight: do they strike back? then move it and remove it from its card
  await fr.evaluate(() => { const W = G.W; window._k = G.addZone(W.ww * 0.5, W.wh * 0.75, G.clampThing({ name: 'Knight', props: { light: 0.1 }, source: 'table', radius: 70, life: 240 })); G.setSpeed(4); });
  await page.waitForTimeout(15000); await fr.evaluate(() => G.setSpeed(1));
  console.log('knight: life ' + await fr.evaluate(() => Math.round(_k.life) + ', struck down ' + (_k.deaths || 0) + ', creatures that struck back ' + G.W.cre.filter((c) => c.struckBack).length));
  await fr.evaluate(() => { G.select(null); G.selectZone(_k); }); await page.waitForTimeout(900);
  const x0 = await fr.evaluate(() => Math.round(_k.x)); await fr.locator('#zmove').click(); await page.waitForTimeout(700);
  await fr.evaluate(() => G.emit('pond-click', { x: G.W.ww * 0.2, y: G.W.wh * 0.5 })); await page.waitForTimeout(700);
  console.log('moved: x ' + x0 + ' -> ' + await fr.evaluate(() => Math.round(_k.x)));
  await page.screenshot({ path: path.join(__dirname, 'final-1.png') });
  await fr.locator('#zgone').click(); await page.waitForTimeout(1500);
  console.log('removed: ' + await fr.evaluate(() => G.W.zones.indexOf(_k) < 0));
  await fr.evaluate(() => { const c = G.W.cre.filter((x) => x.g.h > 0)[0] || G.W.cre[0]; G.select(c); G.openGenes(); }); await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(__dirname, 'final-2-brain.png') });
  console.log(errs.slice(0, 6).join('\n') || 'no errors');
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
