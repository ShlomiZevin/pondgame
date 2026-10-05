// Every build of the pond's own stock, each on three different bodies, at two moments:  node scripts/builds.js
const { chromium } = require('../../plaxzy-creator/node_modules/playwright-core');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1500, height: 900 } });
  const errs = []; page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message));
  await page.goto((process.env.BASE || 'http://localhost:8787') + '/dev?user=builds' + Date.now() + '&ai=0', { waitUntil: 'load' });
  await page.waitForTimeout(3000);
  const fr = page.frames().find((f) => f !== page.mainFrame());
  await fr.locator('#tBegin').click(); await page.waitForTimeout(800);
  for (let shot = 0; shot < 2; shot++) {
    const names = await fr.evaluate((shot) => {
      G.setSpeed(0.0001);
      if (!window.__P) {
        const seen = {}; window.__P = [];
        for (let i = 0; i < 400 && window.__P.length < 8; i++) { const raw = G.offlinePlan(); if (!raw || seen[raw.name]) continue; seen[raw.name] = 1; const p = G.cleanPlan(raw); p.id = 100000 + window.__P.length; G.keptPlans.push(p); window.__P.push(p); }
        const cv = document.createElement('canvas'); cv.id = 'sheet'; cv.width = 1500; cv.height = 900; cv.style.cssText = 'position:fixed;left:0;top:0;z-index:99999';
        document.body.appendChild(cv);
      }
      const R = (k, a, b, o) => Object.assign({ k, a, b, e: 1, l: 1, w: 0.5, j: 2, g: 0, c: 0.4, t: 0, p: 0.5, on: -1 }, o || {});
      const base = (o) => G.form.fix(Object.assign(G.form.cell(200), o));
      const ctx = document.getElementById('sheet').getContext('2d'); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#0b2733'; ctx.fillRect(0, 0, 1500, 900);
      window.__P.forEach((p, i) => {
        const bodies = [
          G.planDemo(p, (i * 47) % 360),
          base({ n: 4, prof: [1, 1.3, 1.2, 0.9, 0.5], hd: 1.5, nk: 0.3, coat: 2, en: 2, es: 0.5, mk: 2, tk: 4, hue: (30 + i * 60) % 360, hue2: -50, pl: p.id, rules: [R(0, 1, 2, { l: 0.9, t: 3 }), R(7, 0, 0, { l: 0.9, g: -0.8, c: 0.6 }), R(2, 1, 3, { l: 0.9 })] }),
          base({ n: 8, prof: [0.7, 1, 1.1, 0.8, 0.4], hd: 1, nk: 0.5, coat: 1, en: 3, es: 0.4, mk: 4, tk: 2, ts: 1.3, pat: 2, glow: 1, hue: (200 + i * 40) % 360, hue2: 140, pl: p.id, rules: [R(1, 2, 2, { l: 1.4 }), R(4, 0, 0, { l: 1.3, g: -0.9 }), R(0, 2, 5, { l: 1, t: 1, e: 3 })] }),
        ];
        const x0 = 20 + (i % 2) * 750, y0 = 20 + Math.floor(i / 2) * 220;
        bodies.forEach((f, j) => { ctx.save(); ctx.translate(x0 + 130 + j * 240, y0 + 105); ctx.scale(0.5, 0.5); G.form.portrait(ctx, f, 1.3 + shot * 1.4 + j, {}); ctx.restore(); });
        const f = bodies[1], k = G.form.kind(f), a = G.form.abilities(f);
        ctx.fillStyle = '#f6d365'; ctx.font = '700 14px system-ui'; ctx.textAlign = 'left'; ctx.fillText(p.name.toUpperCase() + ' — ' + p.note, x0 + 8, y0 + 16);
        ctx.fillStyle = '#cfe8ff'; ctx.font = '12px system-ui'; ctx.fillText(k.full + '  ·  ' + Object.keys(a).map((q) => q.slice(0, 3) + ' ' + a[q].toFixed(2)).join(' ') + '  ·  walks: ' + G.form.walks(G.form.build(f), f), x0 + 8, y0 + 212);
      });
      return window.__P.map((p) => p.name);
    }, shot);
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(__dirname, 'builds-' + (shot + 1) + '.png') });
    if (!shot) console.log(names.join(', '));
  }
  console.log(errs.slice(0, 5).join('\n') || 'no errors');
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
