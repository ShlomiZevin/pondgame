// What the things they build look like: every shape in every material, raw and coloured, and the plain buildings under water and on land.
// node scripts/build-look.js   (no AI: free)
const { chromium } = require('../../plaxzy-creator/node_modules/playwright-core');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1500, height: 1000 } });
  const errs = []; page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message)); page.on('console', (m) => { if (m.type() === 'error' && !/404|413/.test(m.text())) errs.push('CONSOLE ' + m.text().slice(0, 240)); });
  await page.goto((process.env.BASE || 'http://localhost:8787') + '/dev?user=blook' + Date.now() + '&ai=0', { waitUntil: 'load' });
  await page.waitForTimeout(2500);
  const fr = page.frames().find((f) => f !== page.mainFrame());
  await fr.locator('#tBegin').click(); await page.waitForTimeout(1200);
  const n = await fr.evaluate(() => {
    G.setSpeed(0);
    const box = document.createElement('div'); box.style.cssText = 'position:fixed;inset:0;z-index:99999;background:linear-gradient(#b9a777 0,#b9a777 34%,#1d5a6b 34%,#12303f 100%);display:flex;flex-wrap:wrap;align-content:flex-start;gap:4px;padding:8px;font:11px system-ui;color:#fff;overflow:hidden'; document.body.appendChild(box);
    const cell = (url, label, wpx) => { const d = document.createElement('div'); d.style.cssText = 'text-align:center;width:' + wpx + 'px'; d.innerHTML = '<img src="' + url + '" width="' + wpx + '" height="' + wpx + '"><div style="margin-top:-4px;text-shadow:0 1px 2px #000">' + label + '</div>'; box.appendChild(d); };
    // 1. every shape, in stone, reed and shell, coloured; then raw stone
    const SH = G.LOOK_SHAPES; let k = 0;
    [[0, 2], [1, 2], [2, 2], [0, 1]].forEach(([m, st]) => SH.forEach((s) => { const tall = /tri|onion|bell|drop|vase|door|window|frond|flag|span/.test(s), w = s === 'lamp' ? 16 : s === 'beam' ? 64 : s === 'flag' ? 22 : 56, h = s === 'lamp' ? 16 : s === 'beam' ? 12 : s === 'stairs' ? 30 : tall ? 66 : s === 'dome' || s === 'cap' || s === 'scallop' ? 36 : 56;
      const bp = { seed: 1, type: 'x', S: 60, hue: 190, designed: true, P: [{ s, x: 0, y: s === 'lamp' ? -10 : 0, w, h, m, c: s === 'door' ? [0, 30, 16] : [0, 55, 55], st }] };
      cell(G.buildPic({ bp }, 70), s + (st === 1 ? ' (raw)' : ''), 70); k++; }));
    // 2. the plain buildings: under water and on land, three seeds each
    ['hall', 'house', 'huts', 'spire', 'wall'].forEach((type) => [true, false].forEach((wet) => [11, 22, 37].forEach((seed, i) => { const bp = G.blueprintFrom({ seed: seed * 8 + i * 8 + (wet ? 0 : 3), type, S: type === 'house' ? 50 : 84, hue: [190, 320, 40][i], spiky: 0, brain: [0.3, 0.7, 1][i], wet }, '2'.repeat(60)); cell(G.buildPic({ bp }, 140), type + (wet ? ' · under water' : ' · on land'), 140); k++; })));
    return k;
  });
  await page.waitForTimeout(600); await page.screenshot({ path: path.join(__dirname, 'build-look.png') });
  console.log(n + ' pictures · ' + (errs.slice(0, 6).join('\n') || 'no errors'));
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
