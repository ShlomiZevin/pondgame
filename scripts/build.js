// A kind builds something, piece by piece, from what lies about the pond.  node scripts/build.js [wall|huts|spire|hall]   (no AI: the plan is given here, free)
const { chromium } = require('../../plaxzy-creator/node_modules/playwright-core');
const path = require('path');
const kind = process.argv[2] || 'hall';
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 860 } });
  const errs = []; page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message)); page.on('console', (m) => { if (m.type() === 'error' && !/404|413/.test(m.text())) errs.push('CONSOLE ' + m.text().slice(0, 240)); });
  await page.goto((process.env.BASE || 'http://localhost:8787') + '/dev?user=build' + Date.now() + '&ai=0', { waitUntil: 'load' });
  await page.waitForTimeout(2500);
  const fr = page.frames().find((f) => f !== page.mainFrame());
  await fr.locator('#tBegin').click(); await page.waitForTimeout(1200);
  await fr.evaluate(() => G.setSpeed(64)); await page.waitForTimeout(14000); await fr.evaluate(() => G.setSpeed(1));
  const ok = await fr.evaluate((kind) => {
    const W = G.W, sp = W.species.filter((s) => !s.extinct && s.n > 5).sort((a, b) => b.n - a.n)[0]; if (!sp || !G.deedStart) return 'no deedStart or no kind';
    const res = { name: { wall: 'Shell Wall', huts: 'Reed Village', spire: 'Calling Tower', hall: 'Great Hall' }[kind], looks: 'made by many hands', stuff: 'rock', shape: 'circle', size: 0.085, solid: kind === 'wall', feed: kind === 'huts' ? 0.3 : 0, slow: 0, hurt: 0, pull: kind === 'spire' ? 0.3 : 0, life: 200 };
    G.deedStart({ kind: sp.name, title: 'The ' + res.name, say: 'Together!', what: 'build a ' + res.name.toLowerCase(), why: 'to have a place of their own', share: 0.8, steps: [{ do: 'gather', secs: 5, cry: 'Come!' }, { do: 'build', secs: 30, cry: 'Heave!' }, { do: 'circle', secs: 6, cry: 'Ours!' }], place: { x: 0.5, y: 0.62 }, result: res });
    return W.deed ? 'started: ' + W.deed.title + ' by the ' + W.deed.kind + ', materials lying about: ' + (W.mats || []).length : 'not started';
  }, kind);
  console.log(ok);
  await fr.evaluate(() => { G.select(null); G.camHome(); G.focusOn(G.W.ww / 2, G.W.wh * 0.6, 2.1); G.setSpeed(4); });
  for (let i = 1; i <= 4; i++) {
    await page.waitForTimeout(i === 1 ? 5000 : 7000);
    console.log(JSON.stringify(await fr.evaluate(() => { const d = G.W.deed, w = (G.W.works || []).slice(-1)[0], o = d || w; return o && o.bp ? { step: d ? d.steps[d.i].do : 'done', 'set/coloured/all': G.buildCount(o).join('/'), wait: (d && d.wait) || '', mats: G.W.mats.length, hauling: G.W.cre.filter((c) => c.haul >= 0).length } : { step: d ? d.steps[d.i].do : 'none' }; })));
    await page.screenshot({ path: path.join(__dirname, 'build-' + kind + '-' + i + '.png'), clip: { x: 320, y: 150, width: 800, height: 600 } });
  }
  await fr.evaluate(() => G.setSpeed(16)); await page.waitForTimeout(9000); await fr.evaluate(() => G.setSpeed(1)); await page.waitForTimeout(600);
  console.log('after: ' + JSON.stringify(await fr.evaluate(() => { const w = (G.W.works || []).slice(-1)[0]; return w ? { name: w.name, pieces: w.bp ? G.buildCount(w).join('/') : 'no plan', deed: !!G.W.deed } : { works: 0, deed: !!G.W.deed }; })));
  await page.screenshot({ path: path.join(__dirname, 'build-' + kind + '-5.png'), clip: { x: 320, y: 150, width: 800, height: 600 } });
  console.log(errs.slice(0, 6).join('\n') || 'no errors');
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
