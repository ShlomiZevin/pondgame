// The painted look of a star: its ground and its people's buildings, at several distances.   node scripts/world.js [terrain] [ai]
// With no second word it runs with AI off (free): the server sends what is in its library already (the nearest thing painted before).
const { chromium } = require('../../plaxzy-creator/node_modules/playwright-core');
const path = require('path');
(async () => {
  const terr = process.argv[2] || '', ai = process.argv[3] === 'ai';
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1500, height: 950 } });
  const errs = []; page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message)); page.on('console', (m) => { if (m.type() === 'error' && !/404|413|503/.test(m.text())) errs.push('CONSOLE ' + m.text().slice(0, 240)); });
  await page.goto((process.env.BASE || 'http://localhost:8787') + '/dev?user=world' + Date.now() + (ai ? '' : '&ai=0'), { waitUntil: 'load' });
  await page.waitForTimeout(2500);
  const fr = page.frames().find((f) => f !== page.mainFrame());
  await fr.locator('#tBegin').click(); await page.waitForTimeout(1200);
  const tag = terr || 'home', shot = async (name) => { await page.waitForTimeout(700); await page.screenshot({ path: path.join(__dirname, 'world-' + tag + '-' + name + '.png') }); console.log('shot ' + name); };
  const ff = (secs) => fr.evaluate((s) => { for (let t = 0; t < s; t += 0.1) G.step(0.1); }, secs);
  if (terr) await fr.evaluate((id) => { const T = G.TERRAINS.filter((t) => t.id === id)[0]; if (T) G.terrainOf = function () { return T; }; }, terr);
  if (ai) await fr.evaluate(() => { Object.keys(G.ai.budget).concat(['thing', 'event', 'deed', 'nature', 'marvel', 'icon', 'voice', 'sound', 'wish', 'wishcheck', 'watch', 'judge', 'check', 'organ', 'design', 'plan', 'paint', 'story', 'ideas']).forEach((k) => { if (k !== 'art') G.ai.setBudget(k, 0); }); });      // (only the look of the star is paid for in this run)
  await fr.evaluate(() => { while (G.W.gen < 9) G.step(0.1); const c = G.colony(); c.peace = true; Object.assign(c.want, { g: 6, b: 5, f: 6, u: 3 }); c.stock = [90, 90, 90, 12]; G.setSpeed(1); G.camHome(); G.select(null); });
  await ff(20); await page.waitForTimeout(ai ? 45000 : 5000);      // (the paintings come)
  console.log('people: ' + await fr.evaluate(() => JSON.stringify(G.W.arch || null)) + ' · terrain ' + await fr.evaluate(() => G.terrainOf(G.W).id) + ' · art ' + await fr.evaluate(() => G.art.n) + ' · calls ' + JSON.stringify(await page.evaluate(() => (window.__calls || []).filter((c) => c.op === 'art'))));
  await fr.evaluate(() => { G.camHome(); }); await shot('1-whole');
  await fr.evaluate(() => { const h = G.heartOf(G.W); G.cam.z = 1.6; G.focusOn(h.x, h.y + 40, 1.6); }); await shot('2-heart');
  // order a few buildings on free lots, and let the builders raise them
  const ordered = await fr.evaluate(() => { const W = G.W, h = G.heartOf(W), out = []; ['house', 'house', 'hall', 'huts', 'tower', 'house', 'wall'].forEach((t, i) => { const p = G.lotPick(W, h.x + (i % 2 ? 260 : -260), h.y + 120 + (i > 2 ? 160 : 0), t); if (!p) return; const r = G.buildOrder(t, p.x, p.y); out.push(t + (r && r.error ? ' ✗ ' + r.error : ' ✓')); }); return out.join(', '); });
  console.log('ordered: ' + ordered);
  await ff(40); await fr.evaluate(() => { const d = G.W.deed; if (d) { G.cam.z = 1.6; G.focusOn(d.x, d.y, 1.6); } }); await shot('3-being-built');
  for (let i = 0; i < 14; i++) { await ff(60); if (await fr.evaluate(() => !G.colony().queue.length && !G.W.deed)) break; }
  console.log('standing: ' + await fr.evaluate(() => (G.W.works || []).map((w) => w.name + (w.bp ? ' ' + G.buildCount(w).join('/') : '')).join(', ')) + ' · tier ' + await fr.evaluate(() => G.colony().tier));
  await page.waitForTimeout(ai ? 40000 : 3000);
  if (process.env.QUICK) { await fr.evaluate(() => { G.camHome(); G.select(null); }); await shot('4-colony-whole'); console.log(errs.slice(0, 8).join(' | ') || 'no errors'); await browser.close(); return; }
  // a spaceport, and a starship on it
  console.log('port: ' + await fr.evaluate(() => { const W = G.W, h = G.heartOf(W); if ((W.works || []).some((w) => w.bp && w.bp.type === 'port')) return 'there already'; const p = G.lotPick(W, h.x + 420, h.y - 200, 'port') || { x: h.x + 420, y: h.y - 200 }; const r = G.buildOrder('port', p.x, p.y); return r && r.error ? r.error : 'ordered'; }));
  for (let i = 0; i < 8; i++) { await ff(60); if (await fr.evaluate(() => !G.colony().queue.length && !G.W.deed)) break; }
  console.log('ship: ' + await fr.evaluate(() => { const W = G.W; if ((W.works || []).some((w) => w.bp && w.bp.type === 'ship')) return 'there already'; const r = G.buildOrder('ship', 0, 0); return r && r.error ? r.error : 'ordered'; }));
  for (let i = 0; i < 8; i++) { await ff(60); if (await fr.evaluate(() => !G.colony().queue.length && !G.W.deed)) break; }
  await page.waitForTimeout(2000);
  await fr.evaluate(() => { G.camHome(); G.select(null); }); await shot('4-colony-whole');
  await fr.evaluate(() => { const h = G.heartOf(G.W); G.cam.z = 1.5; G.focusOn(h.x, h.y + 110, 1.5); }); await shot('5-colony-close');
  await fr.evaluate(() => { const w = (G.W.works || []).filter((q) => q.bp && q.bp.type === 'house')[0]; if (w) { G.cam.z = 2.6; G.focusOn(w.x, w.y + 10, 2.6); } }); await shot('6-house-very-close');
  await fr.evaluate(() => { const w = (G.W.works || []).filter((q) => q.bp && (q.bp.type === 'port' || q.bp.type === 'ship'))[0]; if (w) { G.cam.z = 1.7; G.focusOn(w.x, w.y, 1.7); } }); await shot('7-spaceport');
  await fr.evaluate(() => { const s = G.sitesOf(G.W).filter((q) => q.k === 'quarry')[0]; G.cam.z = 1.5; G.focusOn(s.x + 120, s.y, 1.5); }); await shot('8-quarry');
  console.log('art calls: ' + JSON.stringify(await page.evaluate(() => (window.__calls || []).filter((c) => c.op === 'art'))) + ' · spent on art: $' + await fr.evaluate(() => (G.ai.spentOn ? G.ai.spentOn('art') : 0)));
  console.log(errs.slice(0, 8).join('\n') || 'no errors');
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
