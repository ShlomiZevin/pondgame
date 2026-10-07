// The Book of Life's living and organ cards, the genes-and-brain window, and the rare box when nothing is running.  node scripts/book.js
// No AI is used (ai=0), so it costs nothing.
const { chromium } = require('../../plaxzy-creator/node_modules/playwright-core');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 860 } });
  const errs = []; page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message)); page.on('console', (m) => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text().slice(0, 200)); });
  await page.goto((process.env.BASE || 'http://localhost:8787') + '/dev?user=book' + Date.now() + '&ai=0', { waitUntil: 'load' });
  await page.waitForTimeout(2500);
  const fr = page.frames().find((f) => f !== page.mainFrame());
  await fr.locator('#tBegin').click(); await page.waitForTimeout(1500);
  // generation 1: nothing is sorted into a kind yet
  await fr.evaluate(() => { G.ui.guideTab = 'live'; G.openGuide(); }); await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(__dirname, 'book-1-live-early.png') });
  console.log('early living: ' + (await fr.locator('#gdBody').innerText()).replace(/\n+/g, ' | ').slice(0, 400));
  await fr.evaluate(() => { G.closeModal(); G.setSpeed(64); });
  await page.waitForTimeout(45000);
  await fr.evaluate(() => G.setSpeed(1));
  console.log('generation ' + await fr.evaluate(() => G.W.gen) + ', creatures ' + await fr.evaluate(() => G.W.cre.length));
  await page.screenshot({ path: path.join(__dirname, 'book-2-pond.png') });
  await fr.evaluate(() => { G.ui.guideTab = 'live'; G.openGuide(); }); await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(__dirname, 'book-3-live.png') });
  // the button goes to the very creature in the picture
  const same = await fr.evaluate(() => { const b = document.querySelector('#gdBody .card .btn'); b.click(); const c = G.R.sel; return c ? 'selected #' + c.id + ' of kind ' + c.sp : 'nothing selected'; });
  console.log('show me this one: ' + same);
  await page.waitForTimeout(900);
  await fr.evaluate(() => G.openGenes()); await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(__dirname, 'book-4-genes.png') });
  console.log('brain says: ' + await fr.locator('#gbsay').innerText());
  await fr.evaluate(() => G.closeGenes());
  await fr.evaluate(() => { G.ui.guideTab = 'organ'; G.openGuide(); }); await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(__dirname, 'book-5-organs.png') });
  console.log('organs: ' + (await fr.locator('#gdBody').innerText()).replace(/\n+/g, ' | ').slice(0, 300));
  await fr.evaluate(() => G.closeModal()); await page.waitForTimeout(1500);
  console.log('rare box: ' + (await fr.locator('#rarebox').innerText().catch(() => 'no box')).replace(/\n+/g, ' | ').slice(0, 500));
  console.log(errs.slice(0, 8).join('\n') || 'no errors');
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
