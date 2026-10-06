// Collects what the eye for beauty thinks of many creatures, so the game's own measure of beauty can be fitted to it.
//   node scripts/taste.js [how many creatures] [model] [seed]      → scripts/taste-data.json (added to what is there)
// Each creature is a cell mutated a number of times (few and many), drawn, and graded from the picture, six to a sheet.
// Then run:  node scripts/taste-fit.js
const { chromium } = require('../../plaxzy-creator/node_modules/playwright-core');
const fs = require('fs'), path = require('path');
const N = +process.argv[2] || 180, model = process.argv[3] || 'claude-opus-5-5', seed = +process.argv[4] || 101;
const FILE = path.join(__dirname, 'taste-data.json');
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
  const errs = []; page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message));
  await page.goto((process.env.BASE || 'http://localhost:8787') + '/dev?user=taste' + Date.now(), { waitUntil: 'load' });
  await page.waitForTimeout(3000);
  const fr = page.frames().find((f) => f !== page.mainFrame());
  await fr.locator('#tBegin').click(); await page.waitForTimeout(800);
  await fr.evaluate(({ N, seed, process_climb }) => {
    G.setSpeed(0.0001); G.ai.provider = 'server';
    for (let i = 0; i < 6; i++) { const d = G.offlineDesign(); if (d) G.addDesign(d, true); }
    for (let i = 0; i < 3; i++) { const p = G.offlinePlan(); if (p) G.addPlan(p, true); }
    const rnd = G.rng(seed), keep = G.rand; G.rand = rnd;
    window.__T = [];
    for (let i = 0; i < N; i++) {
      const f = G.form.cell(rnd() * 360), kind = rnd();
      // few changes, many changes, and changes made gently or wildly: the whole range evolution passes through
      const rounds = kind < 0.45 ? 2 + Math.floor(rnd() * 14) : kind < 0.8 ? 14 + Math.floor(rnd() * 30) : 40 + Math.floor(rnd() * 50), wild = kind < 0.3 ? 1.5 : 3;
      for (let k = 0; k < rounds; k++) G.form.mutate(f, 0.05, wild, null, function () {});
      if (f.en === 0 && rnd() < 0.8) { f.en = 1 + Math.floor(rnd() * 2); G.form.fix(f); }
      let g = f;
      if (process_climb && rnd() < 0.7) { const steps = 5 + Math.floor(rnd() * 120), score = function (q) { return 0.7 * G.form.beauty(q, null) + 0.3 * G.form.whole(q).v; }; let best = score(g); for (let k = 0; k < steps; k++) { const c = G.form.clone(g); G.form.mutate(c, 0.08, 2, null, function () {}); const v = score(c); if (v >= best - 0.01 * rnd()) { g = c; best = v; } } }
      window.__T.push(g);
    }
    G.rand = keep;
  }, { N, seed, process_climb: !!process.env.CLIMB });
  const old = fs.existsSync(FILE) ? JSON.parse(fs.readFileSync(FILE, 'utf8')) : { names: null, rows: [] };
  let usd = 0, got = 0;
  for (let at = 0; at < N && !errs.length; at += 6) {
    const r = await fr.evaluate(async ({ at, model }) => {
      const forms = window.__T.slice(at, at + 6), img = G.sheet(forms);
      const creatures = forms.map((f, i) => ({ id: i + 1, name: '', kind: G.form.kind(f).full, body: G.form.facts(f).join(', ') }));
      let res; try { res = await G.host.call('ai.judge', { image: img, mime: 'image/jpeg', creatures, model }, 120000); } catch (e) { return { err: String(e && e.message || e) }; }
      const sc = (res.judge && res.judge.scores) || [];
      return { usd: res.usd || 0, names: G.form.LOOKS, rows: sc.map((s) => { const f = forms[s.id - 1]; return f ? { x: G.form.looks(f), y: s.score, why: s.why, fix: s.fix, f: G.form.pack(f) } : null; }).filter(Boolean) };
    }, { at, model });
    if (r.err) { console.log('batch ' + at + ' failed: ' + r.err); continue; }
    usd += r.usd; got += r.rows.length; old.names = r.names; for (const q of r.rows) { q.by = model; old.rows.push(q); }
    fs.writeFileSync(FILE, JSON.stringify(old));
    process.stdout.write('\r' + got + ' graded · $' + usd.toFixed(3) + '   ');
  }
  console.log('\n' + old.rows.length + ' rows in ' + FILE + ' · this run cost $' + usd.toFixed(3) + ' (' + model + ')');
  console.log(errs.slice(0, 3).join('\n') || 'no errors');
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
