// Bodies of free shapes, as chance alone makes them: each one a cell mutated a number of times.  node scripts/free.js [tag] [seed]
const { chromium } = require('../../plaxzy-creator/node_modules/playwright-core');
const path = require('path');
const tag = process.argv[2] || 'a', seed = +process.argv[3] || 7;
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1500, height: 900 } });
  const errs = []; page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 4).join('\n')));
  await page.goto((process.env.BASE || 'http://localhost:8787') + '/dev?user=free' + Date.now() + '&ai=0', { waitUntil: 'load' });
  await page.waitForTimeout(3000);
  const fr = page.frames().find((f) => f !== page.mainFrame());
  await fr.locator('#tBegin').click(); await page.waitForTimeout(800);
  for (let shot = 0; shot < 2; shot++) {
    const info = await fr.evaluate(({ shot, seed }) => {
      G.setSpeed(0.0001);
      if (!window.__F) {
        const W = G.W;
        for (let i = 0; i < 5; i++) { const d = G.offlineDesign(); if (d) G.addDesign(d, true); }
        const rnd = G.rng(seed), keep = G.rand; G.rand = rnd;
        window.__F = [];
        for (let i = 0; i < 28; i++) {
          let f = G.form.cell(rnd() * 360);
          const rounds = 6 + Math.floor(rnd() * 70);
          for (let k = 0; k < rounds; k++) G.form.mutate(f, 0.05, 3, null, function () {});
          window.__F.push(f);
        }
        G.rand = keep;
        const cv = document.createElement('canvas'); cv.id = 'sheet'; cv.width = 1500; cv.height = 900; cv.style.cssText = 'position:fixed;left:0;top:0;z-index:99999';
        document.body.appendChild(cv);
      }
      const ctx = document.getElementById('sheet').getContext('2d'); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#0b2733'; ctx.fillRect(0, 0, 1500, 900);
      const out = [];
      window.__F.forEach((f, i) => {
        const x = 108 + (i % 7) * 214, y = 118 + Math.floor(i / 7) * 222;
        ctx.save(); ctx.translate(x, y); ctx.scale(0.56, 0.56); G.form.portrait(ctx, f, 1.3 + shot * 1.7 + i, {}); ctx.restore();
        ctx.fillStyle = '#cfe8ff'; ctx.font = '11px system-ui'; ctx.textAlign = 'center';
        const k = G.form.kind(f); ctx.fillText(k.full + (G.form.walks('free', f) ? ' · walks' : ''), x, y + 96);
        if (!shot && i < 6) out.push(k.full + ': ' + G.form.facts(f).join('; '));
      });
      return out;
    }, { shot, seed });
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(__dirname, 'free-' + tag + '-' + (shot + 1) + '.png') });
    if (!shot) console.log(info.join('\n'));
  }
  console.log(errs.slice(0, 5).join('\n') || 'no errors');
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
