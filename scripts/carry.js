// Carrying a leader from one pond to another, by hand: KEEP it, start a new pond, BOOK > COLLECTION > SET DOWN ALONE, and see what they make of it.
// node scripts/carry.js   (no AI: free)
const { chromium } = require('../../plaxzy-creator/node_modules/playwright-core');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 860 } });
  const errs = []; page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message)); page.on('console', (m) => { if (m.type() === 'error' && !/404|413/.test(m.text())) errs.push('CONSOLE ' + m.text().slice(0, 240)); });
  await page.goto((process.env.BASE || 'http://localhost:8787') + '/dev?user=carry' + Date.now() + '&ai=0', { waitUntil: 'load' });
  await page.waitForTimeout(2500);
  const fr = page.frames().find((f) => f !== page.mainFrame());
  await fr.locator('#tBegin').click(); await page.waitForTimeout(1200);
  await fr.evaluate(() => { window._met = []; G.on('stranger-met', (c, end, text) => _met.push(end + ': ' + text)); G.setSpeed(64); });
  await page.waitForTimeout(35000); await fr.evaluate(() => G.setSpeed(1)); await page.waitForTimeout(2500);
  // the strongest leader of this pond is kept, with the card's own button
  console.log('pond 1: ' + await fr.evaluate(() => { const c = G.W.cre.filter((x) => !x.dead).sort((a, b) => (b.fol || 0) * 0.05 + b.g.s[0] - (a.fol || 0) * 0.05 - a.g.s[0])[0]; G.select(c); window._seed1 = G.W.seed; window._kid = c.id; return 'gen ' + G.W.gen + ', keeping #' + c.id + ' (' + G.characterOf(c) + '), Leading ' + c.g.s[0].toFixed(2) + ', followed by ' + (c.fol || 0); }));
  await page.waitForTimeout(700); await fr.locator('#ikeep').click(); await page.waitForTimeout(600);
  // a new pond
  await fr.evaluate(() => { G.select(null); G.newPond({}); }); await page.waitForTimeout(1500);
  if (await fr.locator('#tBegin').isVisible().catch(() => false)) { await fr.locator('#tBegin').click(); await page.waitForTimeout(1200); }
  await fr.evaluate(() => G.setSpeed(64)); await page.waitForTimeout(22000); await fr.evaluate(() => G.setSpeed(1)); await page.waitForTimeout(2000);
  console.log('pond 2: ' + await fr.evaluate(() => 'gen ' + G.W.gen + ', ' + G.W.cre.length + ' alive, another pond: ' + (G.W.seed !== _seed1) + ', collection ' + G.collection.length + (G.collection[0] ? ' (' + G.collection[0].name + ', pond ' + (G.collection[0].pond === _seed1 ? 'remembered' : 'NOT remembered') + ')' : '')));
  // BOOK > COLLECTION > SET DOWN ALONE
  await fr.locator("#tb-guide").click(); await page.waitForTimeout(700);
  await fr.locator('[data-t="coll"]').first().click(); await page.waitForTimeout(700);
  await page.screenshot({ path: path.join(__dirname, 'carry-1-collection.png') });
  await fr.locator('.kcard', { hasText: '#' + await fr.evaluate(() => _kid) }).locator('button:has-text("SET DOWN ALONE")').click(); await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(__dirname, 'carry-2-arrived.png') });
  await page.waitForTimeout(9000); await fr.evaluate(() => { const g = (G.W.guests || [])[0]; if (g) G.focusOn(g.c.x, g.c.y, 1.6); }); await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(__dirname, 'carry-3-looking.png') }); console.log('strip while looking: ' + await fr.evaluate(() => { const e = document.getElementById('guestbar'); return e && e.style.display !== 'none' ? e.innerText.split(String.fromCharCode(10)).join(' / ') : 'NOT SHOWN'; }));
  console.log('after 10 s: ' + await fr.evaluate(() => { const g = (G.W.guests || [])[0]; if (!g) return 'no guest'; const S = g.c; return '#' + S.id + (S.dead ? ' DEAD ' + S.cause : '') + ', within 150 of it ' + G.W.cre.filter((c) => c !== S && !c.dead && Math.hypot(c.x - S.x, c.y - S.y) < 150).length + ', came to look so far ' + (g.looked || 0) + ', followed by ' + (S.fol || 0); }));
  const seen = []; for (let i = 0; i < 40; i++) { const b = await fr.evaluate(() => { const e = document.getElementById('banner'), n = document.getElementById('note'); return (e && e.classList.contains('show') ? e.innerText : n && n.style.opacity === '1' ? 'NOTE ' + n.innerText : '').split(String.fromCharCode(10)).join(' ').slice(0, 70); }); if (b && seen.indexOf(b) < 0) { seen.push(b); if (/STRANGER/i.test(b) && !/HAS COME/i.test(b)) { await page.screenshot({ path: path.join(__dirname, 'carry-5-banner.png') }); break; } } await page.waitForTimeout(700); }
  console.log('banners seen: ' + seen.join(' | '));
  for (let i = 0; i < 30 && !(await fr.evaluate(() => _met.length)); i++) await page.waitForTimeout(1000);
  await page.waitForTimeout(900); console.log('strip: ' + await fr.evaluate(() => { const e = document.getElementById('guestbar'); return e && e.style.display !== 'none' ? e.innerText.split(String.fromCharCode(10)).join(' / ') : 'NOT SHOWN'; }));
  await page.waitForTimeout(800); await fr.evaluate(() => { const c = G.W.cre.find((x) => x.stranger !== undefined && !x.dead); if (c) { G.select(c); G.focusOn(c.x, c.y, 1.6); } }); await page.waitForTimeout(900);
  await page.screenshot({ path: path.join(__dirname, 'carry-4-verdict.png') });
  console.log('verdict: ' + (await fr.evaluate(() => _met.join(' | ')) || 'none'));
  console.log(errs.slice(0, 6).join('\n') || 'no errors');
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
