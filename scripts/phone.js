// The game on a phone and a tablet: upright and on its side, with touch. Does everything fit, and can the colony be run by touch?   node scripts/phone.js   (no AI: free)
const { chromium } = require('../../plaxzy-creator/node_modules/playwright-core');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  for (const [name, vw, vh] of [['phone-upright', 390, 844], ['phone-side', 844, 390], ['tablet', 1024, 768]]) {
    const ctx = await browser.newContext({ viewport: { width: vw, height: vh }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
    const page = await ctx.newPage(); const errs = []; page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message));
    await page.goto((process.env.BASE || 'http://localhost:8787') + '/dev?user=ph' + Date.now() + '&ai=0', { waitUntil: 'load' }); await page.waitForTimeout(2500);
    const fr = page.frames().find((f) => f !== page.mainFrame());
    const tapOn = async (loc) => { try { await loc.tap({ timeout: 2500 }); } catch (e) { await loc.evaluate((el) => el.click()); } };      // (a finger on it; where the emulated phone will not let a finger through an inner frame, the same press is made from inside)
    await fr.locator('#tBegin').tap(); await page.waitForTimeout(1200);
    await fr.evaluate(() => { while (G.W.gen < 11 && !G.W.extinct) G.step(0.1); const c = G.colony(); c.peace = true; c.stock = [60, 60, 60, 9]; for (let t = 0; t < 20; t += 0.1) G.step(0.1); G.setSpeed(1); G.camHome(); G.select(null); });
    await page.waitForTimeout(2500);
    // what is on the screen, how much of it the panels cover, and what lies on what
    const report = (label) => fr.evaluate((label) => { const out = [], R = []; ['season', 'cmd', 'panel', 'toolbar', 'zoom', 'resbar'].forEach((id) => { const e = document.getElementById(id); if (!e) return; const s = getComputedStyle(e), b = e.getBoundingClientRect(); if (s.display === 'none' || e.classList.contains('hide') || b.width < 4) { out.push(id + ' hidden'); return; } R.push([id, b]); out.push(id + ' ' + Math.round(b.left) + ',' + Math.round(b.top) + ' ' + Math.round(b.width) + 'x' + Math.round(b.height) + (b.right > innerWidth + 1 || b.bottom > innerHeight + 1 || b.left < -1 || b.top < -1 ? ' OFF-SCREEN' : '')); });
      let cover = 0; R.forEach((q) => { cover += q[1].width * q[1].height; }); for (let i = 0; i < R.length; i++) for (let j = i + 1; j < R.length; j++) { const a = R[i][1], b = R[j][1], ox = Math.min(a.right, b.right) - Math.max(a.left, b.left), oy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top); if (ox > 4 && oy > 4) out.push('OVERLAP ' + R[i][0] + '/' + R[j][0] + ' ' + Math.round(ox) + 'x' + Math.round(oy)); }
      return '  ' + label + ': ' + out.join(' · ') + ' · panels cover ' + Math.round(100 * cover / (innerWidth * innerHeight)) + '%'; }, label);
    console.log(name + ' ' + vw + 'x' + vh + ' · the star ' + await fr.evaluate(() => Math.round(G.W.ww) + 'x' + Math.round(G.W.wh) + ', ' + G.W.cre.filter((c) => !c.dead).length + ' alive' + (G.W.extinct ? ' EXTINCT' : '')));
    console.log(await report('as it opens')); await page.screenshot({ path: path.join(__dirname, name + '-1.png') });
    // by touch: open the colony panel if it is folded; ask for a fighter; order a home
    const head = fr.locator('#cmdHead'); if (await fr.evaluate(() => document.getElementById('cmd').classList.contains('fold'))) { await tapOn(head); await page.waitForTimeout(400); }
    console.log(await report('colony panel open')); await page.screenshot({ path: path.join(__dirname, name + '-2-open.png') });
    const f0 = await fr.evaluate(() => G.colony().want.f); await tapOn(fr.locator('#cmd [data-want="f"][data-d="1"]')); await page.waitForTimeout(200);
    await tapOn(fr.locator('#cmd [data-build="house"]')); await page.waitForTimeout(300); const placing = await fr.evaluate(() => !!G.cmd.placing);
    console.log('  by touch: fighters wanted ' + f0 + ' → ' + await fr.evaluate(() => G.colony().want.f) + ' · Home button starts placing: ' + placing + ' · touch button shown: ' + await fr.evaluate(() => { const e = document.getElementById('cmdPick'); return !!e && getComputedStyle(e).display !== 'none'; }));
    console.log('  ' + (errs.slice(0, 4).join(' | ') || 'no errors')); await ctx.close();
  }
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
