// What kinds build when the shape is theirs to decide: several kinds each make a home, designed by the AI piece by piece.  node scripts/design.js [how many]   (about a third of a cent each)
const { chromium } = require('../../plaxzy-creator/node_modules/playwright-core');
const path = require('path');
const want = +process.argv[2] || 4;
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 860 } });
  const errs = []; page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message)); page.on('console', (m) => { if (m.type() === 'error' && !/404|413/.test(m.text())) errs.push('CONSOLE ' + m.text().slice(0, 240)); });
  await page.goto((process.env.BASE || 'http://localhost:8787') + '/dev?user=design' + Date.now(), { waitUntil: 'load' });
  await page.waitForTimeout(3000);
  const fr = page.frames().find((f) => f !== page.mainFrame());
  await fr.locator('#tBegin').click(); await page.waitForTimeout(1500);
  await fr.evaluate(() => { for (const k in G.ai.caps) if (k !== 'deed') G.ai.caps[k] = 0; G.ai.gaps.deed = 0; G.deedAsk = function () { return false; }; G.setSpeed(64); });
  await page.waitForTimeout(22000); await fr.evaluate(() => G.setSpeed(16));
  const types = [['hall', {}], ['store', { feed: 0.3 }], ['lookout', { pull: 0.3 }], ['barrier', { solid: true }], ['hall', {}], ['store', { feed: 0.3 }]];
  for (let i = 0; i < want; i++) {
    const started = await fr.evaluate(([i, t]) => { const W = G.W; if (W.deed) return 'busy'; const kinds = W.species.filter((s) => !s.extinct && s.n >= 8).sort((a, b) => b.n - a.n), s = kinds[i % kinds.length]; if (!s) return 'no kind'; let x = 0, y = 0, n = 0; W.cre.forEach((c) => { if (c.sp === s.id) { x += c.x; y += c.y; n++; } });
      const res = Object.assign({ name: '', looks: '', stuff: 'rock', shape: 'circle', size: 0.08, solid: false, feed: 0, slow: 0, hurt: 0, pull: 0, life: 240 }, t[1]); res.name = String(s.name).split(' ').slice(-2, -1)[0] + ' ' + t[0].charAt(0).toUpperCase() + t[0].slice(1);
      G.deedStart({ kind: s.name, title: res.name, say: '', what: 'build a ' + t[0], why: 'they have no place of their own', share: 0.7, own: true, steps: [{ do: 'gather', secs: 3, cry: '' }, { do: 'build', secs: 30, cry: '' }], place: { x: x / n / W.ww, y: Math.max(0.3, y / n / W.wh) }, result: res }); return W.deed ? s.name + ' -> ' + res.name : 'not started'; }, [i, types[i % types.length]]);
    console.log('started: ' + started);
    for (let k = 0; k < 40; k++) { await page.waitForTimeout(2000); if (!(await fr.evaluate(() => !!G.W.deed))) break; }
    console.log('  ' + await fr.evaluate(() => { const w = (G.W.works || []).slice(-1)[0]; return w ? w.name + ': ' + (w.bp.designed ? 'their own design, ' : 'fallback shape, ') + G.buildCount(w).join('/') + ' · ' + (w.bp.about || '') + ' · shapes ' + w.bp.P.map((p) => p.s).filter((v, i, a) => a.indexOf(v) === i).join(',') : 'nothing built'; }));
  }
  console.log('spent on designs: ' + JSON.stringify(await fr.evaluate(() => G.ai.life && G.ai.life.deed)));
  console.log('where they stand: ' + await fr.evaluate(() => (G.W.works || []).map((w) => w.name + ' x' + Math.round(w.x) + ' y' + Math.round(w.y) + ' half-width ' + Math.round(w.bp.hw || 0)).join(' | ')));
  await fr.evaluate(() => { G.setSpeed(1); G.select(null); const Wk = G.W.works || []; let x = 0, y = 0; Wk.forEach((w) => { x += w.x; y += w.y; }); if (Wk.length) G.focusOn(x / Wk.length, y / Wk.length - 30, 1.5); const st = document.createElement('style'); st.textContent = '#ui > *{visibility:hidden}'; document.head.appendChild(st); });
  await page.waitForTimeout(1500); await page.screenshot({ path: path.join(__dirname, 'design-1.png') });
  for (let i = 0; i < Math.min(want, 4); i++) { await fr.evaluate((i) => { const w = (G.W.works || [])[i]; if (w) G.focusOn(w.x, w.y - 30, 3.2); }, i); await page.waitForTimeout(700); await page.screenshot({ path: path.join(__dirname, 'design-b' + i + '.png'), clip: { x: 420, y: 130, width: 600, height: 560 } }); }
  console.log(errs.slice(0, 6).join('\n') || 'no errors');
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
