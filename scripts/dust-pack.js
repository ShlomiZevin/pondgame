// Makes the small grey copy of scripts/dust-raw.jpg that the game carries (game source 57z_dust.js).  node scripts/dust-pack.js
const { chromium } = require('../../plaxzy-creator/node_modules/playwright-core');
const fs = require('fs'), path = require('path');
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage();
  const raw = 'data:image/jpeg;base64,' + fs.readFileSync(path.join(__dirname, 'dust-raw.jpg')).toString('base64');
  const out = await page.evaluate(async (raw) => { const im = new Image(); await new Promise((r, j) => { im.onload = r; im.onerror = j; im.src = raw; }); const S = 448, cv = document.createElement('canvas'); cv.width = cv.height = S; const x = cv.getContext('2d'); x.filter = 'grayscale(1)'; x.drawImage(im, 0, 0, S, S); return cv.toDataURL('image/jpeg', 0.7); }, raw);
  const dst = path.join(__dirname, '..', '..', 'plaxzy-creator', 'local-games', 'primordia', 'src', '57z_dust.js');
  fs.writeFileSync(dst, '// A picture of dust dispersing in the dark (made once with Leonardo, scripts/dust-texture.js; packed small and grey by scripts/dust-pack.js).\n// 58_beyond.js reads how bright it is from place to place to shape the way a pond thins out into space: where the picture has a cloud, the pond reaches\n// further; where it has a mote, a mote of the pond hangs in the dark.\nG.DUST_IMG = \'' + out + '\';\n');
  console.log('wrote 57z_dust.js, ' + Math.round(out.length / 1024) + ' kB');
  await browser.close();
})();
