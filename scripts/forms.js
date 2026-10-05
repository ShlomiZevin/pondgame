// A gallery of hand-set bodies, to check that the new genes draw well:  node scripts/forms.js
const { chromium } = require('../../plaxzy-creator/node_modules/playwright-core');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 820 } });
  const errs = []; page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message));
  await page.goto((process.env.BASE || 'http://localhost:8787') + '/dev?user=forms' + Date.now() + '&ai=0', { waitUntil: 'load' });
  await page.waitForTimeout(3000);
  const fr = page.frames().find((f) => f !== page.mainFrame());
  await fr.locator('#tBegin').click(); await page.waitForTimeout(800);
  await fr.evaluate(() => {
    G.setSpeed(0.0001);
    const R = (k, a, b, o) => Object.assign({ k, a, b, e: 1, l: 1, w: 0.5, j: 2, g: 0, c: 0.4, t: 0, p: 0.5, on: -1 }, o || {});
    const base = (o) => G.form.fix(Object.assign(G.form.cell(200), o));
    const L = [
      ['LIZARD: neck, scales, two pairs of legs with fingers', base({ n: 5, prof: [0.8, 1.1, 1.05, 0.7, 0.4], hd: 1.25, nk: 0.5, coat: 1, en: 2, es: 0.4, mk: 2, tk: 3, ts: 1.2, hue: 110, hue2: 60, rules: [R(0, 1, 1, { l: 1.1, t: 1, g: -0.3 }), R(0, 3, 3, { l: 1.1, t: 1, g: 0.4 })] })],
      ['BEAST: fur, big head, legs, horns', base({ n: 4, prof: [1, 1.3, 1.2, 0.9, 0.5], hd: 1.6, nk: 0.35, coat: 2, en: 2, es: 0.5, mk: 2, tk: 4, hue: 28, hue2: -50, rules: [R(0, 1, 2, { l: 0.9, t: 3 }), R(7, 0, 0, { l: 0.9, g: -0.8, c: 0.6 })] })],
      ['BIRD-LIKE: feathers, beak, fan tail, fins as wings', base({ n: 3, prof: [0.8, 1.2, 1, 0.7, 0.4], hd: 1.2, nk: 0.45, coat: 3, en: 2, es: 0.45, mk: 1, tk: 1, ts: 1.2, hue: 205, hue2: 150, pat: 3, rules: [R(1, 1, 1, { l: 2, w: 0.8, g: 0.2 })] })],
      ['ARMS: an arm, a forearm on it, a pincer hand on that', base({ n: 4, prof: [0.9, 1.2, 1, 0.8, 0.5], hd: 1.3, nk: 0.3, en: 2, es: 0.42, mk: 2, tk: 2, hue: 330, hue2: 100, rules: [R(0, 0, 0, { l: 1.0, g: -0.5, c: 0.2 }), R(0, 0, 0, { l: 0.9, on: 0, g: -0.7, c: 0.2 }), R(0, 0, 0, { l: 0.5, on: 1, t: 2, g: 0.3 }), R(0, 2, 3, { l: 0.9, t: 3 })] })],
      ['SQUID: tentacles with frills at their tips', base({ n: 3, prof: [1.2, 1.1, 0.9, 0.7, 0.5], hd: 1.4, en: 2, es: 0.55, mk: 3, tk: 1, hue: 280, hue2: 80, pat: 2, glow: 1, rules: [R(3, 0, 0, { l: 1.6, g: -0.9 }), R(6, 0, 0, { l: 0.6, on: 0 }), R(3, 0, 0, { l: 1.3, g: -0.4 })] })],
      ['GIANT: twelve segments, many legs, a shell', base({ n: 12, len: 1, prof: [0.9, 1.2, 1.2, 1, 0.5], hd: 1.1, nk: 0.2, en: 4, es: 0.36, mk: 2, tk: 2, shell: 0.8, hue: 15, hue2: 170, pat: 1, rules: [R(0, 1, 10, { l: 0.8, e: 1 }), R(4, 0, 0, { l: 1.4, g: -0.9 })] })],
      ['STAR with hands on its arms', base({ sym: 5, n: 3, en: 3, es: 0.42, coat: 2, hue: 50, hue2: -120, pat: 4, rules: [R(0, 0, 0, { l: 1.3 }), R(0, 0, 0, { l: 0.5, on: 0, t: 1, g: 0.5 }), R(2, 0, 0, { l: 0.8 })] })],
      ['MICROBE: one cell with cilia and a flagellum', base({ n: 1, en: 0, tk: 3, ts: 1, hue: 140, hue2: 60, rules: [R(3, 0, 0)] })],
      ['MICROBE with an eyespot and spines', base({ n: 1, en: 1, es: 0.4, hue: 190, hue2: -120, pat: 4, rules: [R(2, 0, 0)] })],
      ['JELLY: tentacles, no tail', base({ n: 2, prof: [1, 1.3, 1.2, 1, 0.6], en: 2, es: 0.4, glow: 1, hue: 265, hue2: 60, rules: [R(3, 1, 1, { l: 1.6 }), R(6, 0, 0)] })],
      ['CRAB: shell, legs, pincers', base({ n: 3, prof: [1, 1.4, 1.3, 1, 0.6], en: 2, es: 0.4, ek: 0.8, shell: 0.8, hue: 8, hue2: 30, pat: 2, rules: [R(0, 0, 2, { l: 1.1, t: 2 })] })],
      ['ORB: a star of spines', base({ sym: 6, n: 2, en: 1, es: 0.45, glow: 1, hue: 275, hue2: -90, rules: [R(2, 0, 0, { l: 1.3 }), R(7, 0, 0, { l: 0.8 })] })],
      ['FISH: fins and a fork tail', base({ n: 4, prof: [0.9, 1.3, 1.1, 0.8, 0.4], en: 2, es: 0.5, tk: 2, ts: 1.2, hue: 200, hue2: 150, pat: 1, glow: 1, rules: [R(1, 1, 1, { l: 1.4 }), R(6, 0, 0, { l: 0.8 })] })],
      ['LONG-NECK: small head on a deep neck', base({ n: 7, prof: [0.6, 0.7, 1.4, 1.1, 0.4], hd: 0.9, nk: 0.7, coat: 1, en: 2, es: 0.34, mk: 4, tk: 3, ts: 1.4, hue: 170, hue2: 60, pat: 5, rules: [R(0, 3, 4, { l: 1.0, t: 3 })] })],
    ];
    window.__L = L;
    const cv = document.createElement('canvas'); cv.width = 1440; cv.height = 820; cv.style.cssText = 'position:fixed;left:0;top:0;z-index:99999';
    document.body.appendChild(cv);
    const ctx = cv.getContext('2d'); ctx.fillStyle = '#0b2733'; ctx.fillRect(0, 0, 1440, 820);
    L.forEach((it, i) => {
      const f = it[1], x = 185 + (i % 5) * 285, y = 150 + Math.floor(i / 5) * 265, ext = G.form.extent(f).all, sc = Math.min(2.2, 165 / ext);
      ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc); G.form.drawRig(ctx, f, 1.1 + i, { swim: 0.5 }); ctx.restore();
      ctx.fillStyle = '#f6d365'; ctx.font = '700 13px system-ui'; ctx.textAlign = 'center'; ctx.fillText(it[0], x, y + 178);
      const k = G.form.kind(f), a = G.form.abilities(f);
      ctx.fillStyle = '#cfe8ff'; ctx.font = '12px system-ui'; ctx.fillText(k.full + '  ·  ' + Object.keys(a).map((q) => q.slice(0, 3) + ' ' + a[q].toFixed(2)).join(' '), x, y + 196);
    });
  });
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(__dirname, 'forms.png') });
  // the same bodies as portraits
  await fr.evaluate(() => { const cv = document.querySelectorAll('canvas'); const c = cv[cv.length - 1], ctx = c.getContext('2d'); ctx.fillStyle = '#0b2733'; ctx.fillRect(0, 0, 1440, 820); window.__L.forEach((it, i) => { const x = 150 + (i % 5) * 285, y = 150 + Math.floor(i / 5) * 265; ctx.save(); ctx.translate(x, y); ctx.scale(0.72, 0.72); G.form.portrait(ctx, it[1], 1.3 + i, {}); ctx.restore(); ctx.fillStyle = '#f6d365'; ctx.font = '700 13px system-ui'; ctx.textAlign = 'center'; ctx.fillText(it[0].split(':')[0] + ' · ' + G.form.kind(it[1]).full, x, y + 125); }); });
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(__dirname, 'forms-portraits.png') });
  console.log(errs.slice(0, 5).join('\n') || 'no errors');
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
