// THE TEST, checked by the eye: a pond starts from a circle and breeds the nicest with the nicest. Does it get nicer?
//   node scripts/rise.js [tag] [judge model] [live: 1 = the AI also grades during the run and the taste learns from it]
// At a few generations it sets aside the commonest kinds. At the end the judge (looking at pictures, knowing nothing of
// which generation is which) grades them all. It prints, per generation, the game's own beauty grade and the judge's, and
// saves one picture: a row of creatures per generation.
const { chromium } = require('../../plaxzy-creator/node_modules/playwright-core');
const path = require('path');
const tag = process.argv[2] || 'a', model = process.argv[3] || 'claude-sonnet-5-5', live = process.argv[4] === '1';
const MARKS = (process.env.MARKS || '2,25,60,120,200,300').split(',').map(Number);
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1500, height: 1000 } });
  const errs = []; page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message));
  await page.goto((process.env.BASE || 'http://localhost:8787') + '/dev?user=rise' + Date.now(), { waitUntil: 'load' });
  await page.waitForTimeout(3000);
  const fr = page.frames().find((f) => f !== page.mainFrame());
  await fr.locator('#tBegin').click(); await page.waitForTimeout(600);
  await fr.evaluate((live) => { window.__prov = G.ai.provider; if (!live) G.ai.provider = 'offline'; window.__S = []; G.setSpeed(64); }, live);
  for (const mark of MARKS) {
    for (;;) { const g = await fr.evaluate(() => G.W.gen); if (g >= mark || errs.length) break; await page.waitForTimeout(1500); }
    const line = await fr.evaluate((mark) => {
      const W = G.W, top = W.species.filter((s) => !s.extinct && s.rep && s.n > 0).sort((a, b) => b.n - a.n).slice(0, 6);
      // the kinds as they are, by a living member of each (not a remembered one)
      const forms = top.map((s) => { const c = W.cre.find((x) => x.sp === s.id); return G.form.clone((c ? c.g : s.rep).f); });
      let sum = 0, sw = 0, seen = 0; for (const c of W.cre) { sum += c.ph.charm; sw += c.ph.whole || 0; if (c.real) seen++; }
      window.__S.push({ gen: W.gen, forms, own: forms.map((f) => G.form.beauty(f, W.taste)), pond: sum / Math.max(1, W.cre.length), pondW: sw / Math.max(1, W.cre.length), seen: seen + '/' + W.cre.length });
      return 'gen ' + W.gen + ' · pop ' + W.cre.length + ' · the pond\'s own beauty grade ' + (sum / Math.max(1, W.cre.length) * 10).toFixed(1) + ' · ' + (W.kinds || []).slice(0, 3).map((k) => k[0] + ' ' + Math.round(k[1] * 100) + '%').join(', ');
    }, mark);
    console.log(line);
  }
  const spentLive = await fr.evaluate(() => G.ai.totals().usd);
  // the judge sees every sheet shuffled, so it cannot tell early from late
  const res = await fr.evaluate(async (model) => {
    G.setSpeed(0.0001); G.ai.provider = window.__prov;
    const all = []; window.__S.forEach((s, si) => s.forms.forEach((f, fi) => all.push({ si, fi, f })));
    for (let i = all.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = all[i]; all[i] = all[j]; all[j] = t; }
    let usd = 0;
    for (let at = 0; at < all.length; at += 12) {
      const part = all.slice(at, at + 12), forms = part.map((q) => q.f);
      const r = await G.host.call('ai.judge', { image: G.sheet(forms, { cw: 176, ch: 182, sc: 0.48, cols: 4 }), mime: 'image/jpeg', model, lean: 1, count: forms.length }, 120000).catch((e) => ({ err: String(e) }));
      usd += r.usd || 0; if (r.err || !r.judge) (window.__errs = window.__errs || []).push(r.err || ('no grades: ' + r.source));
      ((r.judge && r.judge.scores) || []).forEach((sc) => { const q = part[sc.id - 1]; if (q) { q.y = sc.score; q.w = sc.whole; q.why = sc.why; } });
    }
    window.__S.forEach((s, si) => { s.eye = s.forms.map((f, fi) => { const q = all.find((x) => x.si === si && x.fi === fi); return q && q.y !== undefined ? q.y : null; }); s.wh = s.forms.map((f, fi) => { const q = all.find((x) => x.si === si && x.fi === fi); return q && q.w !== undefined ? q.w : null; }); s.why = s.forms.map((f, fi) => { const q = all.find((x) => x.si === si && x.fi === fi); return q ? q.why || '' : ''; }); });
    return { usd, errs: window.__errs || [], rows: window.__S.map((s) => ({ gen: s.gen, own: s.own, eye: s.eye, wh: s.wh, why: s.why, pond: s.pond, pondW: s.pondW, seen: s.seen })) };
  }, model);
  const avg = (a) => { const v = a.filter((x) => x !== null && x !== undefined); return v.length ? v.reduce((s, x) => s + x, 0) / v.length : NaN; };
  console.log('\n            what the pond believed (all alive)     what a blind judge saw in the commonest kinds (' + model + ')');
  console.log('            beauty  whole  looked-at               beauty  whole');
  for (const r of res.rows) console.log(('  gen ' + r.gen).padEnd(12) + (r.pond * 10).toFixed(1).padEnd(8) + (r.pondW * 10).toFixed(1).padEnd(7) + String(r.seen).padEnd(24) + (avg(r.eye) * 10).toFixed(1).padEnd(8) + (avg(r.wh) * 10).toFixed(1).padEnd(6) + ' b[' + r.eye.map((v) => v === null ? '-' : Math.round(v * 10)).join(' ') + '] w[' + r.wh.map((v) => v === null ? '-' : Math.round(v * 10)).join(' ') + ']  ' + (r.why[r.eye.indexOf(Math.max(...r.eye.map((v) => v || 0)))] || ''));
  if (res.errs.length) console.log('grading calls that failed: ' + res.errs.join(' | ').slice(0, 300));
  console.log('judging cost $' + res.usd.toFixed(3) + (live ? ' · AI used during the run $' + spentLive.toFixed(3) : ''));
  await fr.evaluate(() => {
    const S = window.__S, cv = document.createElement('canvas'); cv.width = 1500; cv.height = S.length * 165 + 10; cv.style.cssText = 'position:fixed;left:0;top:0;z-index:99999'; document.body.appendChild(cv);
    const ctx = cv.getContext('2d'); ctx.fillStyle = '#0b2733'; ctx.fillRect(0, 0, cv.width, cv.height);
    S.forEach((s, i) => {
      const y = 85 + i * 165;
      ctx.fillStyle = '#f6d365'; ctx.font = '700 17px system-ui'; ctx.textAlign = 'left'; ctx.fillText('GEN ' + s.gen, 14, y - 14);
      const e = s.eye.filter((v) => v !== null); ctx.fillStyle = '#cfe8ff'; ctx.font = '13px system-ui'; const wv = s.wh.filter((v) => v !== null); ctx.fillText('beauty ' + (e.length ? (e.reduce((a, b) => a + b, 0) / e.length * 10).toFixed(1) : '-'), 14, y + 8); ctx.fillText('whole ' + (wv.length ? (wv.reduce((a, b) => a + b, 0) / wv.length * 10).toFixed(1) : '-'), 14, y + 26);
      s.forms.forEach((f, k) => { const x = 230 + k * 215; ctx.save(); ctx.translate(x, y); ctx.scale(0.42, 0.42); try { G.form.portrait(ctx, f, 1.3 + k, {}); } catch (err) { /* skip */ } ctx.restore(); ctx.fillStyle = '#cfe8ff'; ctx.font = '12px system-ui'; ctx.textAlign = 'center'; ctx.fillText(s.eye[k] === null ? '' : 'beauty ' + Math.round(s.eye[k] * 10) + ' · whole ' + Math.round((s.wh[k] || 0) * 10), x, y + 74); ctx.textAlign = 'left'; });
    });
  });
  await page.setViewportSize({ width: 1500, height: MARKS.length * 165 + 10 });
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(__dirname, 'rise-' + tag + '.png') });
  console.log(errs.slice(0, 5).join('\n') || 'no errors');
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
