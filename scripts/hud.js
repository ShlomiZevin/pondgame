// The panels of the screen, at several window sizes and with each other panel open: does anything lie on top of anything?   node scripts/hud.js   (no AI: free)
const { chromium } = require('../../plaxzy-creator/node_modules/playwright-core');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  for (const [vw, vh] of [[1366, 768], [1536, 864], [1920, 1080]]) {
    const page = await browser.newPage({ viewport: { width: vw, height: vh } });
    const errs = []; page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message));
    await page.goto((process.env.BASE || 'http://localhost:8787') + '/dev?user=hud' + Date.now() + '&ai=0', { waitUntil: 'load' });
    await page.waitForTimeout(2500);
    const fr = page.frames().find((f) => f !== page.mainFrame());
    await fr.locator('#tBegin').click(); await page.waitForTimeout(1200);
    const shot = async (name) => { await page.waitForTimeout(500); await page.screenshot({ path: path.join(__dirname, 'hud-' + vw + '-' + name + '.png') }); };
    await fr.evaluate(() => { while (G.W.gen < 10) G.step(0.1); const c = G.colony(); c.peace = true; Object.assign(c.want, { g: 6, b: 4, f: 5, u: 2 }); c.stock = [60, 60, 60, 9]; for (let t = 0; t < 30; t += 0.1) G.step(0.1); G.setSpeed(1); G.camHome(); G.select(null); });
    await page.waitForTimeout(1500);
    // every panel on the screen, and which of them overlap the colony panel
    const report = async (label) => console.log(vw + 'x' + vh + ' ' + label + ': ' + await fr.evaluate(() => { const c = document.getElementById('cmd'); if (!c) return 'no #cmd'; const a = c.getBoundingClientRect(), out = ['cmd ' + Math.round(a.left) + ',' + Math.round(a.top) + ' ' + Math.round(a.width) + 'x' + Math.round(a.height) + (a.bottom > innerHeight ? ' OFF-SCREEN by ' + Math.round(a.bottom - innerHeight) : '') + (c.scrollHeight > c.clientHeight + 2 ? ' SCROLLS' : '')];
      document.querySelectorAll('body *').forEach((e) => { if (e === c || c.contains(e) || e.contains(c)) return; const s = getComputedStyle(e); if (s.position !== 'fixed' && s.position !== 'absolute') return; if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity < 0.05 || s.pointerEvents === 'none' && !e.id) return; const b = e.getBoundingClientRect(); if (b.width < 20 || b.height < 14 || b.width > innerWidth * 0.95) return; const ox = Math.min(a.right, b.right) - Math.max(a.left, b.left), oy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top); if (ox > 3 && oy > 3) out.push('OVERLAPS #' + (e.id || e.className || e.tagName) + ' by ' + Math.round(ox) + 'x' + Math.round(oy)); });
      return out.join(' · '); }));
    await report('plain'); await shot('1-plain');
    for (const id of ['NOW', 'ADD', 'WORLD', 'BOOK', 'TREE', '1×']) { const b = fr.locator('button:has-text("' + id + '")').first(); if (await b.count()) { await b.click().catch(() => {}); await page.waitForTimeout(500); await report(id); await shot('2-' + id); await page.keyboard.press('Escape'); await page.waitForTimeout(250); await fr.evaluate(() => { const k = document.querySelector('#rarebox .rk'); if (k && !document.getElementById('rarebox').classList.contains('hide')) k.click(); }); if (await b.count()) await fr.evaluate(() => { if (G.ui && G.ui.closeAll) G.ui.closeAll(); }); } }
    await fr.locator('#cmdHead').click(); await page.waitForTimeout(400); await report('folded'); await shot('5-folded'); await fr.locator('#cmdHead').click(); await page.waitForTimeout(400); await report('open again');
    const c1 = await fr.evaluate(() => { const c = G.W.cre.filter((q) => !q.dead && q.job)[0]; G.focusOn(c.x, c.y, 1); G.select(c); return c.id; }); await report('creature card'); await shot('3-card');
    await fr.evaluate(() => { G.select(null); }); await fr.locator('#res3').click().catch(() => {}); await report('resource card'); await shot('4-rescard');
    console.log(errs.slice(0, 5).join('\n') || 'no errors'); await page.close();
  }
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
