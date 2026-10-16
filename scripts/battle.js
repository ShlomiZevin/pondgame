// A raid watched from the landing to the end: a picture every few seconds, and what is going on in numbers (where the two sides are, who is fighting whom,
// how long it takes, who is left). For judging whether a fight can be READ and makes sense.   node scripts/battle.js [fighters] [raiders] [name]   (no AI: free)
const { chromium } = require('../../plaxzy-creator/node_modules/playwright-core');
const path = require('path');
(async () => {
  const nF = process.argv[2] === undefined ? 8 : +process.argv[2], nR = +process.argv[3] || 7, tag = process.argv[4] || 'battle';
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1500, height: 950 } });
  const errs = []; page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message)); page.on('console', (m) => { if (m.type() === 'error' && !/404|413/.test(m.text())) errs.push('CONSOLE ' + m.text().slice(0, 200)); });
  await page.goto((process.env.BASE || 'http://localhost:8787') + '/dev?user=bt' + Date.now() + '&ai=0', { waitUntil: 'load' }); await page.waitForTimeout(2500);
  const fr = page.frames().find((f) => f !== page.mainFrame());
  await fr.locator('#tBegin').click(); await page.waitForTimeout(1200); await fr.evaluate((z) => { window._Z = z; }, +process.env.ZOOM || 1.25);
  await fr.evaluate((nF) => { while (G.W.gen < 30) G.step(0.1); const c = G.colony(); c.peace = true; if (nF >= 0) { c.share = {}; Object.assign(c.want, { g: 6, b: 4, f: nF, u: nF ? 3 : 0 }); } c.stock = [60, 60, 60, 12]; for (let t = 0; t < 40; t += 0.1) G.step(0.1); G.setSpeed(1); G.select(null); }, nF);
  console.log('before: ' + await fr.evaluate(() => { const W = G.W, n = G.jobCount(W); return n.all + ' alive, ' + n.f + ' fighters, ' + n.u + ' guards · buildings ' + (W.works || []).map((w) => w.name).join(', '); }));
  await fr.evaluate((nR) => { const W = G.W, c = G.colony(); c.peace = false; W.cre = W.cre.filter((q) => q.team !== 1); c.raid = null; const r = G.raidWarn(null, nR); r.landGen = W.gen; for (let t = 0; t < 600 && c.raid && c.raid.state === 'warn'; t += 0.1) G.step(0.1); window._ev = []; ['slain', 'heart-fell', 'raid-over', 'tower-kill', 'work-gone'].forEach((e) => G.on(e, (a, b) => _ev.push(e + (typeof b === 'string' ? ':' + b : '')))); window._t0 = W.t; window._hit = {}; G.on('work-hit', (w) => { _hit[w.name] = (_hit[w.name] || 0) + 1; }); }, nR);
  let k = 0;
  for (let i = 0; i < 60; i++) {
    const s = await fr.evaluate(() => { for (let t = 0; t < 2.5; t += 0.1) G.step(0.1); const W = G.W, c = G.colony(), h = G.heartOf(W), hx = h.x, hy = h.y + h.bp.S * 0.45, R = W.cre.filter((q) => q.team === 1 && !q.dead), F = W.cre.filter((q) => !q.team && !q.dead && (q.job === 'f' || q.job === 'u'));
      const mean = (L, f) => L.length ? L.reduce((a, q) => a + f(q), 0) / L.length : 0, cx = mean(R, (q) => q.x), cy = mean(R, (q) => q.y), spread = Math.sqrt(mean(R, (q) => (q.x - cx) * (q.x - cx) + (q.y - cy) * (q.y - cy)));
      const eng = R.filter((q) => q.swT !== undefined && W.t - q.swT < 1.6).length, engF = F.filter((q) => q.swT !== undefined && W.t - q.swT < 1.6).length, atHeart = R.filter((q) => Math.hypot(q.x - hx, q.y - hy) < 110).length, fNear = F.filter((q) => R.some((r) => Math.hypot(q.x - r.x, q.y - r.y) < 90)).length;
      if (R.length) { const fx = (cx + hx) / 2, fy = (cy + hy) / 2; const Z = window._Z || 1.25; if (Z > 1.5) G.focusOn(cx, cy - 10, Z); else G.focusOn(fx, fy - 20, Z); G.cam.z = Z; }
      return { t: Math.round(W.t - window._t0), state: c.raid ? c.raid.state : 'over', R: R.length, F: F.length, rdist: Math.round(mean(R, (q) => Math.hypot(q.x - hx, q.y - hy))), spread: Math.round(spread), eng: eng, engF: engF, atHeart: atHeart, fNear: fNear, heart: G.buildCount(h).join('/'), ev: window._ev.splice(0).join(' '), hits: JSON.stringify(window._hit) }; });
    console.log('  t+' + String(s.t).padStart(3) + ' s  ' + s.state.padEnd(6) + ' raiders ' + s.R + ' (from the Heart ' + s.rdist + ', spread ' + s.spread + ', striking ' + s.eng + ', at the Heart ' + s.atHeart + ')  yours ' + s.F + ' (striking ' + s.engF + ', near a raider ' + s.fNear + ')  Heart ' + s.heart + (s.ev ? '  · ' + s.ev : ''));
    if (s.R && (i % 2 === 0) && k < 12) { await page.waitForTimeout(350); await page.screenshot({ path: path.join(__dirname, tag + '-' + String(++k).padStart(2, '0') + '.png') }); }
    if (s.state === 'over' || (!s.R && i > 4)) { console.log('  struck: ' + s.hits); break; }
  }
  console.log(errs.slice(0, 6).join('\n') || 'no errors'); await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
