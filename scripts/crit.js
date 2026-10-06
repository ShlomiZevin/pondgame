// The AI as design critic: hand-set characters, graded blind by the watcher's own prompt, with what it says.  node scripts/crit.js [tag] [model]
const { chromium } = require('../../plaxzy-creator/node_modules/playwright-core');
const path = require('path'), fs = require('fs');
const tag = process.argv[2] || 'a', model = process.argv[3] || 'claude-sonnet-5-5';
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1000, height: 800 } });
  const errs = []; page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message));
  await page.goto((process.env.BASE || 'http://localhost:8787') + '/dev?user=crit' + Date.now(), { waitUntil: 'load' });
  await page.waitForTimeout(2500);
  const fr = page.frames().find((f) => f !== page.mainFrame());
  await fr.locator('#tBegin').click(); await page.waitForTimeout(600);
  await fr.evaluate(() => {
    const R1 = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1];
    const M = (r, o) => Object.assign({ r: (r || R1).slice(), s: 1, on: -1, at: 0, d: 1, pr: 0, h: 0, lb: 0, la: 0 }, o || {});
    const rule = (k, a, o) => Object.assign({ k: k, a: a, b: a, e: 1, l: 0.7, w: 0.6, j: 2, g: 0.2, c: 0, t: 3, p: 0.5, on: -1 }, o || {});
    const mk = (hue, masses, e, rules, g, v) => { const f = G.form.cell(hue); f.hue2 = 60; f.en = 2; f.es = 0.7; f.hd = 1.8; f.eg = 0.56; f.ey = 0.0; f.ep = 0.64; f.bl = 0.7; f.sm = 0.8; Object.assign(f, g || {}); f.bd = { v: v || 0, e: e, m: masses }; f.rules = rules || []; f.seed = 11 + hue; return G.form.fix(f); };
    const UP = -Math.PI / 2, DN = Math.PI / 2;
    const body = (s, o) => M([1, 1.1, 1.15, 1.15, 1.1, 1, 0.92, 0.9, 0.9, 0.92], Object.assign({ s: s, on: 0, at: DN, d: 0.8 }, o));
    G.critForms = () => [
      { name: 'A head+body, no limbs', f: mk(200, [M(), M(null, { s: 0.7, on: 0, at: UP, d: 0.85 })], 1) },
      { name: 'B +legs', f: mk(30, [M(), M(null, { s: 0.7, on: 0, at: UP, d: 0.85 })], 1, [rule(0, 0)]) },
      { name: 'C +legs+arms', f: mk(330, [M(), M(null, { s: 0.7, on: 0, at: UP, d: 0.85 })], 1, [rule(0, 0), rule(0, 0, { l: 0.55, t: 1 })]) },
      { name: 'D chibi: big head, small pear body, legs, arms', f: mk(120, [M(), body(0.68)], 0, [rule(0, 1), rule(0, 1, { l: 0.5, t: 1 })]) },
      { name: 'E same + ears + tail', f: mk(260, [M(), body(0.68), M(null, { s: 0.32, on: 0, at: -0.95, d: 0.95, pr: 1 })], 0, [rule(0, 1), rule(0, 1, { l: 0.5, t: 1 })], { tk: 1, ts: 0.7 }) },
      { name: 'F torso bigger than head, legs, arms', f: mk(15, [M(null, { s: 0.75 }), body(1.0, { at: DN, d: 0.8 })], 0, [rule(0, 1), rule(0, 1, { l: 0.6, t: 1 })]) },
      { name: 'G four-masses: head, torso, two hips', f: mk(180, [M(), body(0.7), M(null, { s: 0.3, on: 1, at: 1.0, d: 0.9, pr: 1 })], 0, [rule(0, 1), rule(0, 1, { l: 0.5, t: 1 })]) },
      { name: 'H side view standing', f: mk(300, [M(), body(0.7)], 0, [rule(0, 1), rule(0, 1, { l: 0.5, t: 1 })], { tk: 1 }, 1) },
    ];
  });
  const res = await fr.evaluate(async (model) => {
    G.setSpeed(0.0001);
    const spec = window.__SPEC;
    const forms = G.critForms();
    const img = G.sheet(forms.map((x) => x.f), { cw: 176, ch: 182, sc: 0.48, cols: 4 });
    const r = await G.host.call('ai.judge', { image: img, mime: 'image/jpeg', model, lean: 1, count: forms.length }, 120000);
    const cv = document.createElement('canvas'); cv.width = 704; cv.height = 182 * Math.ceil(forms.length / 4); cv.id = 'sheet'; cv.style.cssText = 'position:fixed;left:0;top:0;z-index:99999';
    const ctx = cv.getContext('2d'); const im = new Image(); await new Promise((ok) => { im.onload = ok; im.src = 'data:image/jpeg;base64,' + img; }); ctx.drawImage(im, 0, 0); document.body.appendChild(cv);
    return { img: img, names: forms.map((x) => x.name), scores: r.judge ? r.judge.scores : null, usd: r.usd };
  }, model).catch((e) => ({ err: String(e) }));
  console.log(res.err || (res.scores || []).map((q) => (res.names[q.id - 1] + ': beauty ' + Math.round(q.score * 10) + ' whole ' + Math.round(q.whole * 10) + ' - ' + q.why)).join(String.fromCharCode(10)) + String.fromCharCode(10) + '$' + res.usd);
  if (res.img) fs.writeFileSync(path.join(__dirname, 'crit-' + tag + '.jpg'), Buffer.from(res.img, 'base64'));
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
