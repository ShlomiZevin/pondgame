// How long does ADD take, from typing a new thing to its being ready to place?  node scripts/addtime.js "a sleepy lantern fish"   (about 2 cents: one new thing, one new drawing)
const { chromium } = require('../../plaxzy-creator/node_modules/playwright-core');
const path = require('path');
const word = process.argv[2] || 'a tiny clockwork crab';
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 860 } });
  const errs = []; page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message));
  await page.goto((process.env.BASE || 'http://localhost:8787') + '/dev?user=addt' + Date.now(), { waitUntil: 'load' });
  await page.waitForTimeout(3000);
  const fr = page.frames().find((f) => f !== page.mainFrame());
  await fr.locator('#tBegin').click(); await page.waitForTimeout(1500);
  await fr.evaluate(() => { for (const k in G.ai.caps) if (k !== 'thing' && k !== 'figure') G.ai.caps[k] = 0; });      // nothing else is asked of the AI in this test
  await fr.locator('#tb-add').click(); await page.waitForTimeout(600);
  await fr.locator('#popup input, .pop input').first().fill(word); const t0 = Date.now(); await fr.locator('#wordGo').click();
  let tImag = 0, tDone = 0;
  for (let i = 0; i < 400 && !tDone; i++) { await page.waitForTimeout(250); const st = await fr.evaluate(() => ({ txt: (document.getElementById('thing') || {}).innerText || '', ghost: !!G.R.ghost })); if (!tImag && /Drawing/.test(st.txt)) tImag = Date.now(); if (st.ghost) tDone = Date.now(); }
  console.log('"' + word + '": imagining ' + (tImag ? ((tImag - t0) / 1000).toFixed(1) : '?') + ' s, drawing ' + (tDone && tImag ? ((tDone - tImag) / 1000).toFixed(1) : '?') + ' s, in all ' + (tDone ? ((tDone - t0) / 1000).toFixed(1) + ' s' : 'NOT READY after 100 s'));
  console.log('ready to place: ' + await fr.evaluate(() => G.R.ghost ? G.R.ghost.name + ' · its drawing is there: ' + !!G.figurePic(G.R.ghost.name) + ' · spent ' + JSON.stringify(G.ai.life) : 'no'));
  await page.screenshot({ path: path.join(__dirname, 'addtime.png') });
  console.log(errs.slice(0, 4).join('\n') || 'no errors');
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
