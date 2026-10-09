// What a spaceport and a spaceship look like when the shape is theirs to decide: one kind builds a port, then a ship on it, both designed by the AI.
// node scripts/ship-design.js   (about a cent)
const { chromium } = require('../../plaxzy-creator/node_modules/playwright-core');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 860 } });
  const errs = []; page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message)); page.on('console', (m) => { if (m.type() === 'error' && !/404|413/.test(m.text())) errs.push('CONSOLE ' + m.text().slice(0, 240)); });
  await page.goto((process.env.BASE || 'http://localhost:8787') + '/dev?user=shipd' + Date.now(), { waitUntil: 'load' });
  await page.waitForTimeout(3000);
  const fr = page.frames().find((f) => f !== page.mainFrame());
  await fr.locator('#tBegin').click(); await page.waitForTimeout(1500);
  await fr.evaluate(() => { for (const k in G.ai.caps) if (k !== 'deed') G.ai.caps[k] = 0; G.ai.gaps.deed = 0; G.deedAsk = function () { return false; }; G.setSpeed(64); });
  await page.waitForTimeout(20000); await fr.evaluate(() => G.setSpeed(16));
  for (const type of ['port', 'ship']) {
    const started = await fr.evaluate((type) => { const W = G.W; if (type === 'ship' && ((W.works || []).some((w) => w.bp && w.bp.type === 'ship') || (W.deed && W.deed.result && W.deed.result.ship))) return 'they are building it themselves'; if (W.deed) G.deedStop('off'); const s = W.species.filter((q) => !q.extinct && q.n >= 8).sort((a, b) => b.n - a.n)[0]; if (!s) return 'no kind'; const sy = G.shoreY(W), port = (W.works || []).filter((w) => w.bp && w.bp.type === 'port')[0];
      const first = String(s.name).split(' ').slice(-2, -1)[0] || s.name, name = first + (type === 'port' ? ' Spaceport' : ' Starship');
      const at = type === 'port' ? { x: W.ww * 0.13, y: sy - 10 } : { x: G.dockOf(port).x, y: G.dockOf(port).y };
      G.deedStart({ kind: s.name, title: name, say: '', what: type === 'port' ? 'build a spaceport on the shore, to build a spaceship on' : 'build a spaceship on their spaceport, to fly to another pond', why: 'they have seen the lights of other ponds, far off in space', share: 0.7, own: true, steps: [{ do: 'gather', secs: 3, cry: '' }, { do: 'build', secs: 30, cry: '' }], place: { x: at.x / W.ww, y: at.y / W.wh },
        result: { name, looks: 'made of what lay about the pond', stuff: 'rock', shape: 'circle', size: type === 'port' ? 0.085 : 0.06, ship: type === 'ship', port: type === 'port', at, solid: false, feed: 0, slow: 0, hurt: 0, pull: 0, life: 240 } });
      return W.deed ? s.name + ' -> ' + name : 'not started'; }, type);
    console.log('started: ' + started);
    for (let k = 0; k < 60; k++) { await page.waitForTimeout(2000); if (!(await fr.evaluate(() => !!G.W.deed))) break; }
    console.log('  ' + await fr.evaluate((type) => { const w = (G.W.works || []).filter((q) => q.bp && q.bp.type === type)[0]; return w ? w.name + ': ' + (w.bp.designed ? 'their own design, ' : 'the plain shape, ') + G.buildCount(w).join('/') + ' · ' + (w.bp.about || '') + ' · shapes ' + w.bp.P.map((p) => p.s).filter((v, i, a) => a.indexOf(v) === i).join(',') + ' · loose ' + G.designCheck(w.bp).loose : 'nothing built'; }, type));
  }
  console.log('spent on designs: ' + JSON.stringify(await fr.evaluate(() => G.ai.life && G.ai.life.deed)));
  await fr.evaluate(() => { G.setSpeed(1); G.select(null); const w = (G.W.works || []).filter((q) => q.bp && q.bp.type === 'ship')[0] || (G.W.works || [])[0]; if (w) G.focusOn(w.x, w.y - 30, 2.2); window._dc = (function () { const port = (G.W.works || []).filter((q) => q.bp && q.bp.type === 'port')[0]; return port && w ? JSON.stringify(G.dockCheck(port, w)) + ' port moved aside ' + (port.bp.cleared || 0) + ', pad laid ' + (port.bp.padAdded || 0) + ', ship made ' + Math.round(100 * (w.bp.fitted || 1)) + '%' : ''; })(); const st = document.createElement('style'); st.textContent = '#ui > *{visibility:hidden}'; document.head.appendChild(st); });
  await page.waitForTimeout(1500); await page.screenshot({ path: path.join(__dirname, 'shipd-1.png'), clip: { x: 320, y: 60, width: 800, height: 740 } });
  console.log('dock: ' + await fr.evaluate(() => window._dc)); console.log(errs.slice(0, 6).join('\n') || 'no errors');
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
