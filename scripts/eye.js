// The imagining and the eye for beauty, tried with each model on the same pond, and what each call cost.
//   node scripts/eye.js [tag] [model,model,...] [thing] [event]
// It lets a pond evolve for a while, drops a thing in and causes an event, then asks every model for: a shape of body, a kind
// of part, and a grade (by looking at the picture) of the pond's six commonest kinds. It prints the answers and the cost of
// each call, and saves two pictures: what each model imagined, drawn; and the graded creatures with each model's marks.
const { chromium } = require('../../plaxzy-creator/node_modules/playwright-core');
const path = require('path');
const tag = process.argv[2] || 'a';
const models = (process.argv[3] || 'claude-haiku-4-5-20251001,claude-sonnet-5-5,claude-opus-5-5,gpt-5.6-sol').split(',');
const thing = process.argv[4] === undefined ? 'knight' : process.argv[4], event = process.argv[5] === undefined ? 'an ice age' : process.argv[5];
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1500, height: 940 } });
  const errs = []; page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message));
  await page.goto((process.env.BASE || 'http://localhost:8787') + '/dev?user=eye' + Date.now(), { waitUntil: 'load' });
  await page.waitForTimeout(3000);
  const fr = page.frames().find((f) => f !== page.mainFrame());
  await fr.locator('#tBegin').click(); await page.waitForTimeout(800);
  // let it evolve quietly first (no automatic AI: only the calls below are made and counted)
  await fr.evaluate(() => { window.__prov = G.ai.provider; G.ai.provider = 'offline'; G.setSpeed(64); });
  await page.waitForTimeout(+process.env.EVOLVE || 45000);
  await fr.evaluate(() => { G.setSpeed(0.0001); G.ai.provider = window.__prov; });
  const world = await fr.evaluate(async ({ thing, event }) => {
    const W = G.W;
    if (thing) { const info = await G.ai.ask('thing', thing); G.addZone(W.ww / 2, W.wh / 2, info); }
    if (event) { const ev = await G.ai.ask('event', event); if (ev) G.runEvent(ev); }
    G.measurePressures();
    return JSON.stringify(G.worldBrief()).slice(0, 1800);
  }, { thing, event });
  console.log('THE POND AS THE AI IS TOLD OF IT:\n' + world + '\n');
  const res = await fr.evaluate(async (models) => {
    const W = G.W, out = {}, top = W.species.filter((s) => !s.extinct && s.rep).sort((a, b) => b.n - a.n);
    const forms = top.slice(0, 6).map((s) => s.rep.f);
    const img = G.sheet(forms), creatures = forms.map((f, i) => ({ id: i + 1, name: top[i].name, kind: G.form.kind(f).full, body: G.form.facts(f).join(', ') }));
    window.__forms = forms; window.__ideas = {};
    for (const model of models) {
      const o = out[model] = {}, brief = G.worldBrief();
      const call = async (op, payload) => { const t0 = Date.now(); try { const r = await G.host.call(op, Object.assign({ model }, payload), 120000); return { r, s: ((Date.now() - t0) / 1000).toFixed(1) }; } catch (e) { return { r: { error: String(e && e.message || e) }, s: ((Date.now() - t0) / 1000).toFixed(1) }; } };
      const a = await call('ai.plan', Object.assign({ have: [] }, brief)); o.plan = { usd: a.r.usd, s: a.s, src: a.r.source, v: a.r.plan, err: a.r.error };
      const b = await call('ai.design', Object.assign({ have: ['leg', 'fin', 'spike', 'tentacle', 'feeler', 'armour plate', 'frill', 'horn'] }, brief)); o.design = { usd: b.r.usd, s: b.s, src: b.r.source, v: b.r.design, err: b.r.error };
      const c = await call('ai.judge', { image: img, mime: 'image/jpeg', creatures, world: W.press.list.slice(0, 4) }); o.judge = { usd: c.r.usd, s: c.s, src: c.r.source, v: c.r.judge && c.r.judge.scores, err: c.r.error };
      window.__ideas[model] = { plan: a.r.plan ? G.cleanPlan(a.r.plan) : null, design: b.r.design ? G.cleanDesign(b.r.design) : null };
    }
    return { out, kb: Math.round(img.length / 1024) };
  }, models);
  let total = 0;
  for (const m of models) {
    const o = res.out[m]; console.log('══ ' + m + ' ══');
    for (const k of ['plan', 'design', 'judge']) {
      const q = o[k]; if (typeof q.usd === 'number') total += q.usd;
      console.log('  ' + k.padEnd(7) + (typeof q.usd === 'number' ? '$' + q.usd.toFixed(4) : String(q.src || 'no price')).padEnd(10) + (q.s + 's').padEnd(7) + (q.err ? 'ERROR ' + q.err : k === 'judge' ? (q.v || []).map((x) => '#' + x.id + ' ' + Math.round(x.score * 10) + '/10 ' + x.fix + ' — ' + x.why).join('\n' + ' '.repeat(26)) : q.v ? q.v.name + (q.v.place ? ' [' + q.v.place + (q.v.style ? ' ' + q.v.style : '') + (q.v.hits ? ', hits ' + q.v.hits : '') + ']' : ' [' + q.v.body.m.length + ' masses, ' + (q.v.body.v ? 'side' : 'front') + ']') + ' — ' + q.v.note + ' | because: ' + (q.v.because || '(whim)') : 'nothing usable came back'));
    }
  }
  console.log('\npicture sent to the judge: ' + res.kb + ' kB · all of the above cost $' + total.toFixed(4));
  // picture 1: what each model imagined, drawn
  await fr.evaluate((models) => {
    const cv = document.createElement('canvas'); cv.id = 'sheet'; cv.width = 1500; cv.height = 940; cv.style.cssText = 'position:fixed;left:0;top:0;z-index:99999'; document.body.appendChild(cv);
    const ctx = cv.getContext('2d'); ctx.fillStyle = '#0b2733'; ctx.fillRect(0, 0, 1500, 940);
    const W = G.W, top = W.species.filter((s) => !s.extinct && s.rep).sort((a, b) => b.n - a.n)[0];
    const draw = (f, x, y) => { ctx.save(); ctx.translate(x, y); ctx.scale(0.55, 0.55); try { G.form.portrait(ctx, f, 1.3, {}); } catch (e) { ctx.restore(); ctx.fillStyle = '#f66'; ctx.fillText(String(e.message).slice(0, 40), x, y); return; } ctx.restore(); };
    models.forEach((m, i) => {
      const y = 120 + i * 232, id = window.__ideas[m];
      ctx.fillStyle = '#f6d365'; ctx.font = '700 15px system-ui'; ctx.textAlign = 'left'; ctx.fillText(m, 14, y - 96);
      ctx.fillStyle = '#cfe8ff'; ctx.font = '12px system-ui';
      if (id.plan) { const p = id.plan; p.id = 100500 + i; G.keptPlans.push(p); draw(G.planDemo(p, (W.hue0 + i * 60) % 360), 130, y); if (top) { const f2 = G.form.clone(top.rep.f); G.body.adopt(f2, p.bd, 1); draw(G.form.fix(f2), 360, y); } ctx.fillText('SHAPE: ' + p.name + ' — ' + p.note.slice(0, 70), 14, y + 104); ctx.fillText('because: ' + (p.because || '(whim)'), 14, y + 120); }
      if (id.design) { const d = id.design; d.id = 910000 + i; G.keptDesigns.push(d); draw(G.designDemo(d, (W.hue0 + 120 + i * 60) % 360), 880, y); if (top) { const f2 = G.form.clone(top.rep.f); if (f2.rules.length >= G.form.MAXR) f2.rules.pop(); f2.rules.push({ k: 8, a: 0, b: 0, e: 1, l: 1.2, w: 0.55, j: 2, g: 0.1, c: 0, t: d.id, p: 0.5, on: -1 }); draw(G.form.fix(f2), 1110, y); } ctx.fillText('PART: ' + d.name + ' [' + d.place + '] — ' + d.note.slice(0, 70), 760, y + 104); ctx.fillText('because: ' + (d.because || '(whim)'), 760, y + 120); }
    });
  }, models);
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(__dirname, 'eye-' + tag + '-1-imagined.png') });
  // picture 2: the creatures that were graded, with every model's mark
  await fr.evaluate(({ models, out }) => {
    const ctx = document.getElementById('sheet').getContext('2d'); ctx.fillStyle = '#0b2733'; ctx.fillRect(0, 0, 1500, 940);
    window.__forms.forEach((f, i) => {
      const x = 130 + (i % 3) * 500, y = 130 + Math.floor(i / 3) * 460;
      ctx.save(); ctx.translate(x, y); ctx.scale(0.62, 0.62); G.form.portrait(ctx, f, 1.3 + i, {}); ctx.restore();
      ctx.fillStyle = '#f6d365'; ctx.font = '700 16px system-ui'; ctx.textAlign = 'left'; ctx.fillText('#' + (i + 1), x - 110, y - 100);
      ctx.font = '12px system-ui';
      models.forEach((m, k) => { const sc = (out[m].judge.v || []).find((q) => q.id === i + 1); ctx.fillStyle = '#cfe8ff'; ctx.fillText(m.replace('claude-', '').replace('-20251001', '') + ': ' + (sc ? Math.round(sc.score * 10) + '/10 · ' + sc.fix + ' · ' + sc.why.slice(0, 62) : '—'), x - 110, y + 130 + k * 17); });
    });
  }, { models, out: res.out });
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(__dirname, 'eye-' + tag + '-2-graded.png') });
  console.log(errs.slice(0, 5).join('\n') || 'no errors');
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
