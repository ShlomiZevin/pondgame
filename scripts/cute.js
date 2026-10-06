// A gallery of hand-set lovable bodies, to check how the face and proportion genes draw.  node scripts/cute.js [tag]
const { chromium } = require('../../plaxzy-creator/node_modules/playwright-core');
const path = require('path');
const tag = process.argv[2] || 'a';
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1500, height: 760 } });
  const errs = []; page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 4).join('\n')));
  await page.goto((process.env.BASE || 'http://localhost:8788') + '/dev?user=cute' + Date.now() + '&ai=0', { waitUntil: 'load' });
  await page.waitForTimeout(2500);
  const fr = page.frames().find((f) => f !== page.mainFrame());
  await fr.locator('#tBegin').click(); await page.waitForTimeout(800);
  await fr.evaluate(() => {
    G.setSpeed(0.0001);
    const R1 = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1];
    const mk = (hue, hd, es, eg, ey, ep, bl, sm, bodyS, extra) => {
      let f = G.form.cell(hue); f.hue2 = 60; f.en = 2; f.es = es; f.hd = hd; f.eg = eg; f.ey = ey; f.ep = ep; f.bl = bl; f.sm = sm;
      f.bd = { v: 0, e: 1, m: [{ r: R1, s: 1 }, { r: R1, s: bodyS, on: 0, at: -Math.PI / 2, d: 0.9 }] };
      f.bd.m = [{ r: R1.slice(), s: 1, on: -1, at: 0, d: 1, pr: 0, h: 0, lb: 0, la: 0 }, { r: R1.slice(), s: bodyS, on: 0, at: -Math.PI / 2, d: 0.85, pr: 0, h: 0, lb: 0, la: 0 }];
      f.rules = extra || [];
      return G.form.fix(f);
    };
    const leg = { k: 0, a: 0, b: 0, e: 1, l: 0.7, w: 0.6, j: 2, g: 0.2, c: 0, t: 3, p: 0.5, on: -1 };
    const ear = { k: 7, a: 1, b: 1, e: 1, l: 0.5, w: 0.5, j: 2, g: 0, c: 0, t: 0, p: 0.5, on: -1 };
    window.__F = [
      mk(200, 1, 0.4, 0.5, 0.14, 0.46, 0.4, 0.5, 0.72), mk(200, 1.4, 0.6, 0.55, 0.05, 0.6, 0.6, 0.6, 0.72), mk(30, 2.0, 0.8, 0.6, -0.05, 0.7, 0.8, 0.9, 0.7),
      mk(330, 2.2, 0.85, 0.58, -0.1, 0.72, 0.9, 0.95, 0.6, [leg]), mk(120, 1.8, 0.75, 0.55, 0.0, 0.66, 0.7, 0.8, 0.7, [leg, ear]), mk(260, 2.4, 0.9, 0.62, -0.12, 0.75, 1, 1, 0.55, [leg]),
    ];
    const cv = document.createElement('canvas'); cv.id = 'sheet'; cv.width = 1500; cv.height = 760; cv.style.cssText = 'position:fixed;left:0;top:0;z-index:99999';
    document.body.appendChild(cv);
    const ctx = cv.getContext('2d'); ctx.fillStyle = '#0b2733'; ctx.fillRect(0, 0, 1500, 760);
    window.__F.forEach((f, i) => { const x = 130 + (i % 3) * 400, y = 210 + Math.floor(i / 3) * 360; ctx.save(); ctx.translate(x + 60, y); ctx.scale(1.0, 1.0); G.form.portrait(ctx, f, 1.3 + i, {}); ctx.restore(); });
  });
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(__dirname, 'cute-' + tag + '.png') });
  console.log(errs.slice(0, 5).join('\n') || 'no errors');
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
