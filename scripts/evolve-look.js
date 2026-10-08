// A live pond, looked at: only the watcher (the god) may spend. It runs to a few generations, and at each saves a sheet of the pond's commonest kinds
// (water kinds and land kinds apart) and prints the marks, the land, the size of the world and the cost.
//   node scripts/evolve-look.js [tag] [gens, e.g. 40,100,200] [model]
const { chromium } = require('../../plaxzy-creator/node_modules/playwright-core');
const fs = require('fs'), path = require('path');
const tag = process.argv[2] || 'a', MARKS = (process.argv[3] || '40,100,200').split(',').map(Number), model = process.argv[4] || 'claude-haiku-4-5-20251001';
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 860 } });
  const errs = []; page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message));
  await page.goto((process.env.BASE || 'http://localhost:8787') + '/dev?user=evo' + tag + Date.now(), { waitUntil: 'load' });
  await page.waitForTimeout(3000);
  const fr = page.frames().find((f) => f !== page.mainFrame());
  await fr.locator('#tBegin').click(); await page.waitForTimeout(1200);
  await fr.evaluate((model) => { for (const k of ['wishcheck', 'plan', 'design', 'organ', 'story', 'wish', 'nature', 'deed', 'marvel', 'icon', 'voice', 'paint', 'figure', 'sound', 'ideas']) { G.ai.caps[k] = 0; } for (const k in G.ai.caps) if (k !== 'watch') G.ai.caps[k] = 0; if (G.ai.labelOf && G.ai.labelOf(model)) G.ai.model = model; if (model === 'offline') G.ai.provider = 'offline'; { const al = G.ai.allow; G.ai.allow = function (k) { return k === 'watch' && al.call(G.ai, k); }; } G.setSpeed(64); }, model);
  for (const mark of MARKS) {
    for (let t = 0; t < 900; t++) { const g = await fr.evaluate(() => G.W.gen); if (g >= mark || errs.length) break; await page.waitForTimeout(1500); }
    const out = await fr.evaluate(() => {
      const W = G.W, cre = W.cre.filter((c) => !c.dead && c.g.f.bd), n = cre.length || 1, h = W.hist[W.hist.length - 1] || {};
      const kinds = {}; for (const c of cre) { const k = (c.g.t[5] >= 0.5 ? 'L' : 'W') + '|' + G.shapeOf(c.g) + '|' + G.hueOf(c.g); (kinds[k] = kinds[k] || []).push(c); }
      const top = Object.keys(kinds).sort((a, b) => kinds[b].length - kinds[a].length).slice(0, 12).map((k) => kinds[k].sort((a, b) => G.charmOf(b) - G.charmOf(a))[0]);
      { const Lk = Object.keys(kinds).filter((k) => k[0] === 'L').sort((a, b) => kinds[b].length - kinds[a].length).slice(0, 6), Wk = Object.keys(kinds).filter((k) => k[0] === 'W').sort((a, b) => kinds[b].length - kinds[a].length).slice(0, 12 - Lk.length); top.length = 0; Wk.concat(Lk).forEach((k) => top.push(kinds[k].sort((a, b) => G.charmOf(b) - G.charmOf(a))[0])); }
      const real = (W.eyeBank || []).slice(-36);
      return {
        img: G.sheet(top.map((c) => c.g.f), { cw: 248, ch: 256, sc: 0.68, cols: 4 }),
        line: 'gen ' + W.gen + ' · pop ' + cre.length + ' · kinds ' + W.species.filter((s) => !s.extinct).length + ' · pond believes beauty ' + ((h.look || 0) * 10).toFixed(1) + ' whole ' + ((h.whole || 0) * 10).toFixed(1) +
          ' · god lately said beauty ' + (real.length ? (real.reduce((a, q) => a + q.b, 0) / real.length * 10).toFixed(1) : '-') + ' whole ' + (real.length ? (real.reduce((a, q) => a + q.w, 0) / real.length * 10).toFixed(1) : '-') + ' (best ' + (real.length ? Math.max.apply(null, real.map((q) => G.appealOfLook(q))) * 10 : 0).toFixed(1) + ')' +
          ' · parts ' + (h.body || 0).toFixed(1) + ' size ' + (h.size || 0).toFixed(1) + ' room ' + (W.room || 0).toFixed(1) +
          '\n     breath: water ' + cre.filter((c) => (c.g.t[5] || 0) < 0.3).length + ', both ' + cre.filter((c) => c.g.t[5] >= 0.3 && c.g.t[5] <= 0.6).length + ', land ' + cre.filter((c) => c.g.t[5] > 0.6).length + ' · on land now ' + cre.filter((c) => c.land).length + ' · land is ' + Math.round((W.shore || 0.16) * 100) + '% of the map · world ' + ((G.view.grow || 1)).toFixed(2) + 'x' +
          ' · spend by kind ' + JSON.stringify(Object.fromEntries(Object.entries(G.ai.life || {}).filter((e) => e[1].usd > 0).map((e) => [e[0], e[1].asked + ' calls $' + e[1].usd.toFixed(3)]))) + ' · looks ' + ((G.ai.life && G.ai.life.watch && G.ai.life.watch.asked) || 0) + ' $' + (G.ai.totals().usd || 0).toFixed(3) +
          '\n     sheet (water first, land last): ' + top.map((c, i) => (i + 1) + ' ' + (c.g.t[5] >= 0.5 ? 'LAND ' : '') + G.form.kind(c.g.f).full + ' x' + kinds[(c.g.t[5] >= 0.5 ? 'L' : 'W') + '|' + G.shapeOf(c.g) + '|' + G.hueOf(c.g)].length).join(', '),
      };
    });
    console.log(out.line);
    if (out.img) fs.writeFileSync(path.join(__dirname, 'evo-' + tag + '-g' + mark + '.jpg'), Buffer.from(out.img, 'base64'));
  }
  await fr.evaluate(() => { G.setSpeed(1); G.camHome(); });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(__dirname, 'evo-' + tag + '-pond.png') });
  console.log(errs.join('\n') || 'no errors');
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
