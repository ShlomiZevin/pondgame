// A LOOK at what they build when the shape is theirs: a pond with the AI designing each building, run for a while, then photographed whole and close up.
// The designs the AI gave are saved to the game's tools/design-samples.json, so the free town test can check them again.   node scripts/town-look.js [minutes]   (a cent or two)
const { chromium } = require('../../plaxzy-creator/node_modules/playwright-core');
const fs = require('fs'), path = require('path');
const mins = +process.argv[2] || 4;
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  const errs = []; page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message)); page.on('console', (m) => { if (m.type() === 'error' && !/404|413/.test(m.text())) errs.push('CONSOLE ' + m.text().slice(0, 240)); });
  await page.goto((process.env.BASE || 'http://localhost:8787') + '/dev?user=townlook' + Date.now(), { waitUntil: 'load' });
  await page.waitForTimeout(3000);
  const fr = page.frames().find((f) => f !== page.mainFrame());
  await fr.locator('#tBegin').click(); await page.waitForTimeout(1500);
  await fr.evaluate(() => { for (const k in G.ai.caps) if (k !== 'deed' && k !== 'judge') G.ai.caps[k] = 0; G.ai.gaps.deed = 0; G.deedAsk = function () { return false; }; window._raw = []; const d0 = G.designFrom; G.designFrom = function (raw, S, n) { const P = d0(raw, S, n); if (P && raw && raw.about) _raw.push(raw); return P; }; G.setSpeed(16); });
  for (let i = 0; i < mins * 2; i++) { await page.waitForTimeout(30000); console.log(await fr.evaluate(() => 'gen ' + G.W.gen + ', ' + G.W.cre.length + ' alive · ' + (G.W.works || []).filter((w) => w.bp).map((w) => w.name + (w.bp.designed ? '*' : '') + ' ' + G.buildCount(w).join('/')).join(', ') + (G.W.deed ? ' · now: ' + G.W.deed.title + (G.W.deed.wait ? ' (' + G.W.deed.wait + ')' : '') : ''))); }
  await fr.evaluate(() => G.setSpeed(1));
  const info = await fr.evaluate(() => ({ raw: _raw, works: (G.W.works || []).filter((w) => w.bp).map((w) => Object.assign({ name: w.name, by: w.by, own: !!w.bp.designed, about: w.bp.about || '', built: w.built }, G.designCheck(w.bp))), spend: G.ai.life && G.ai.life.deed }));
  info.works.forEach((w) => console.log('  ' + w.name + (w.own ? ' (their own design)' : ' (fallback)') + ': ' + w.pieces + ' pieces, let down ' + w.letDown + ', balance ' + w.balance + ', ' + w.width + ' x ' + w.height + (w.built ? ', built in ' + w.built.secs + ' s by ' + w.built.hands + ' hands' : '') + ' · ' + w.about));
  console.log('spent on designs: ' + JSON.stringify(info.spend));
  if (info.raw.length) { const out = path.join(__dirname, '..', '..', 'plaxzy-creator', 'local-games', 'primordia', 'tools', 'design-samples.json'); let old = []; try { old = JSON.parse(fs.readFileSync(out, 'utf8')); } catch (e) { /* first time */ } fs.writeFileSync(out, JSON.stringify(old.concat(info.raw).slice(-24))); console.log('saved ' + info.raw.length + ' designs to tools/design-samples.json'); }
  console.log('place look: ' + await fr.evaluate(() => G.placeLook(true)));
  for (let i = 0; i < 14; i++) { await page.waitForTimeout(1500); if (await fr.evaluate(() => !!G.W.place)) break; }
  console.log('the watcher on the pond as a place: ' + JSON.stringify(await fr.evaluate(() => G.W.place || null)));
  await fr.evaluate(() => { G.select(null); G.camHome(); const st = document.createElement('style'); st.textContent = '#ui > *{visibility:hidden}'; document.head.appendChild(st); });
  await page.waitForTimeout(1500); await page.screenshot({ path: path.join(__dirname, 'look-town-all.png') });
  const groups = await fr.evaluate(() => { const Wk = (G.W.works || []).filter((w) => w.bp), rows = {}; Wk.forEach((w) => { const k = Math.round(w.y / 40); (rows[k] = rows[k] || []).push(w); }); return Object.values(rows).sort((a, b) => b.length - a.length).slice(0, 3).map((r) => ({ x: r.reduce((s, w) => s + w.x, 0) / r.length, y: r[0].y, span: Math.max(...r.map((w) => w.x + w.bp.hw)) - Math.min(...r.map((w) => w.x - w.bp.hw)) })); });
  for (let i = 0; i < groups.length; i++) { await fr.evaluate((g) => { G.cam.z = Math.max(0.9, Math.min(3, 1500 / (g.span + 300) / (G.view.base * 1))); G.cam.x = g.x; G.cam.y = g.y - 40; G.applyCam(); }, groups[i]); await page.waitForTimeout(900); await page.screenshot({ path: path.join(__dirname, 'look-town-' + (i + 1) + '.png') }); }
  console.log(errs.slice(0, 6).join('\n') || 'no errors');
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
