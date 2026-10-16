// A raid in numbers: how hard each side hits, how much each can take, who falls.   node scripts/fight-numbers.js [fighters] [raiders]   (no AI: free)
const { chromium } = require('../../plaxzy-creator/node_modules/playwright-core');
(async () => {
  const nF = process.argv[2] === undefined ? -1 : +process.argv[2], nR = +process.argv[3] || 7;
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  const errs = []; page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message));
  await page.goto((process.env.BASE || 'http://localhost:8787') + '/dev?user=fn' + Date.now() + '&ai=0', { waitUntil: 'load' }); await page.waitForTimeout(2500);
  const fr = page.frames().find((f) => f !== page.mainFrame());
  await fr.locator('#tBegin').click(); await page.waitForTimeout(1200);
  const out = await fr.evaluate(({ nF, nR }) => { while (G.W.gen < 30) G.step(0.1); const c = G.colony(), W = G.W; c.peace = true; if (nF >= 0) { c.share = {}; Object.assign(c.want, { g: 6, b: 4, f: nF, u: nF ? 3 : 0 }); } c.stock = [60, 60, 60, 12]; for (let t = 0; t < 40; t += 0.1) G.step(0.1);
    c.peace = false; W.cre = W.cre.filter((q) => q.team !== 1); c.raid = null; const r = G.raidWarn(null, nR); r.landGen = W.gen; for (let t = 0; t < 600 && c.raid && c.raid.state === 'warn'; t += 0.1) G.step(0.1);
    const S = { mine: { n: 0, d: 0 }, foe: { n: 0, d: 0 } }, lost = { mine: 0, foe: 0, tower: 0, bystander: 0 }; let how = '', t0 = W.t, first = 0, last = 0;
    G.on('fight', (a, b, d) => { if (a.team !== 1 && b.team !== 1) return; const k = a.team === 1 ? 'foe' : 'mine'; S[k].n++; S[k].d += d; if (!first) first = W.t; last = W.t; });
    G.on('slain', (a, b) => { if (b.team === 1) lost.foe++; else if (b.job === 'f' || b.job === 'u') lost.mine++; else lost.bystander++; }); G.on('tower-kill', () => { lost.tower++; }); G.on('raid-over', (r, h) => { how = h; });
    const n0 = G.jobCount(W), h = G.heartOf(W), hp0 = G.buildCount(h)[0]; let F0 = null, R0 = null;
    for (let t = 0; t < 400 && !how; t += 0.1) { G.step(0.1); if (!R0 && c.raid && c.raid.state === 'on') { const R = W.cre.filter((q) => q.team === 1), F = W.cre.filter((q) => !q.team && (q.job === 'f' || q.job === 'u')); const av = (L, f) => Math.round(L.reduce((a, q) => a + f(q), 0) / (L.length || 1)); R0 = 'raiders ' + R.length + ': E ' + av(R, (q) => q.E) + ' size ' + av(R, (q) => q.ph.r) + ' spike ' + (R.reduce((a, q) => a + (q.ph.spike || 0), 0) / R.length).toFixed(2) + ' aggro ' + (R.reduce((a, q) => a + (q.ph.aggro || 0), 0) / R.length).toFixed(2); F0 = 'yours ' + F.length + ': E ' + av(F, (q) => q.E) + ' of ' + av(F, (q) => q.ph.Emax) + ' size ' + av(F, (q) => q.ph.r) + ' spike ' + (F.reduce((a, q) => a + (q.ph.spike || 0), 0) / (F.length || 1)).toFixed(2) + ' aggro ' + (F.reduce((a, q) => a + (q.ph.aggro || 0), 0) / (F.length || 1)).toFixed(2); } }
    return [n0.all + ' alive, ' + n0.f + ' fighters, ' + n0.u + ' guards, towers ' + (W.works || []).filter((w) => w.tower).length, R0, F0, 'your blows ' + S.mine.n + ' (each ' + (S.mine.d / (S.mine.n || 1)).toFixed(1) + ') · their blows ' + S.foe.n + ' (each ' + (S.foe.d / (S.foe.n || 1)).toFixed(1) + ')', 'fell: raiders to yours ' + lost.foe + ', to towers ' + lost.tower + ' · your fighters and guards ' + lost.mine + ' · others of yours ' + lost.bystander, 'the fighting lasted ' + Math.round(last - first) + ' s · the raid ' + Math.round(W.t - t0) + ' s · ended: ' + how + ' · Heart ' + hp0 + ' → ' + G.buildCount(G.heartOf(W))[0] + (c.raid && c.raid.took ? ' · carried off ' + c.raid.took.join(',') : '')].join('\n'); }, { nF, nR });
  console.log(out); console.log(errs.slice(0, 6).join('\n') || 'no errors'); await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
