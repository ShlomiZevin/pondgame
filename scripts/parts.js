// What new kinds of body part did this pond get, and how do they look on an animal?  node scripts/parts.js [tag] [seconds at 64x]
const { chromium } = require('../../plaxzy-creator/node_modules/playwright-core');
const path = require('path');
const BASE = process.env.BASE || 'http://localhost:8787';
const tag = process.argv[2] || 'd', secs = +process.argv[3] || 120;
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 820 } });
  const errs = [];
  page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message));
  await page.goto(BASE + '/dev?user=parts' + tag + Date.now() + (process.env.NOAI ? '&ai=0' : ''), { waitUntil: 'load' });
  await page.waitForTimeout(3000);
  const fr = page.frames().find((f) => f !== page.mainFrame());
  await fr.locator('#tBegin').click();
  await fr.evaluate(() => G.setSpeed(64));
  for (let i = 0; i < Math.round(secs / 30); i++) {
    await page.waitForTimeout(30000);
    console.log(await fr.evaluate(() => 'gen ' + G.W.gen + ' pop ' + G.W.cre.length + ' | parts: ' + G.W.designs.map((d) => d.name + (d.by ? ' [AI]' : '')).join(', ') + ' | ' + G.ai.money(G.ai.totals().usd)));
    if (errs.length) break;
  }
  await fr.evaluate(() => { G.setSpeed(1); G.cam.z = 1; G.applyCam(); });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(__dirname, 'parts-' + tag + '-pond.png') });
  // a gallery: every kind of part this pond has, grown on the same plain animal
  const info = await fr.evaluate(() => {
    const W = G.W, n = W.designs.length, cv = document.createElement('canvas');
    cv.width = 1440; cv.height = 820; cv.style.cssText = 'position:fixed;left:0;top:0;z-index:99999;background:#0b2733';
    document.body.appendChild(cv);
    const ctx = cv.getContext('2d'); ctx.fillStyle = '#0b2733'; ctx.fillRect(0, 0, 1440, 820);
    const out = [];
    W.designs.forEach((d, i) => {
      const g = G.founder(); const f = g.f;
      f.n = 4; f.len = 1; f.prof = [0.8, 1.15, 1, 0.8, 0.5]; f.en = 2; f.es = 0.45; f.tk = 2; f.mk = 1; f.hue = (i * 47 + 150) % 360; f.hue2 = 120; f.pat = 0;
      f.rules = [{ k: 8, a: d.place === 'head' ? 0 : 1, b: d.place === 'head' ? 0 : d.place === 'back' ? 2 : 1, e: 1, l: 1.5, w: 0.55, j: 2, g: d.place === 'head' ? -0.7 : 0.1, c: 0, t: d.id, p: 0.5 }];
      G.form.fix(f);
      const x = 190 + (i % 4) * 350, y = 200 + Math.floor(i / 4) * 390;
      ctx.save(); ctx.translate(x, y); ctx.scale(2.1, 2.1); G.form.drawRig(ctx, f, 1.3, { swim: 0.4 }); ctx.restore();
      ctx.fillStyle = '#f6d365'; ctx.font = '700 17px system-ui'; ctx.textAlign = 'center'; ctx.fillText(d.name.toUpperCase() + (d.by ? '  ·  AI' : '  ·  pond'), x, y + 150);
      ctx.fillStyle = '#cfe8ff'; ctx.font = '12px system-ui'; ctx.fillText(d.note.slice(0, 58), x, y + 170);
      const fx = Object.keys(d.fx).filter((k) => Math.abs(d.fx[k]) > 0.04).map((k) => k + ' ' + (d.fx[k] > 0 ? '+' : '') + d.fx[k].toFixed(2)).join('  ');
      ctx.fillStyle = 'rgba(207,232,255,.6)'; ctx.fillText(d.place + ' · ' + d.motion + ' · ' + fx, x, y + 187);
      const carried = W.cre.filter((c) => c.g.f.rules.some((q) => q.k === 8 && q.t === d.id)).length;
      out.push(d.name + (d.by ? ' [AI ' + d.by + ']' : ' [pond]') + ' ' + d.place + '/' + d.motion + ' carried by ' + carried + ': ' + d.note);
    });
    return out;
  });
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(__dirname, 'parts-' + tag + '-gallery.png') });
  console.log(info.join('\n'));
  console.log(errs.slice(0, 5).join('\n') || 'no errors');
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
