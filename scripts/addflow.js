// The Add window and a world event, live:  node scripts/addflow.js ["thing to add"] ["event to cause"]
// Types a thing, CLOSES the Add window at once, and checks that it is still imagined, drawn, and offered for placing.
// Then causes a world event that leaves something behind, and checks that it too is drawn as what it is.
const { chromium } = require('../../plaxzy-creator/node_modules/playwright-core');
const path = require('path');
const word = process.argv[2] || 'a snowman with a carrot nose', event = process.argv[3] || 'an ice wall';
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 820 } });
  const errs = []; page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message));
  await page.goto((process.env.BASE || 'http://localhost:8787') + '/dev?user=addflow' + Date.now(), { waitUntil: 'load' });
  await page.waitForTimeout(3000);
  const fr = page.frames().find((f) => f !== page.mainFrame());
  await fr.locator('#tBegin').click(); await fr.evaluate(() => G.setSpeed(16)); await page.waitForTimeout(6000); await fr.evaluate(() => G.setSpeed(1));
  // 1. add a thing, and close the window straight away
  await fr.evaluate(() => document.querySelector('#toolbar button').click()); await page.waitForTimeout(500);
  await fr.locator('#popup input, .pop input').first().fill(word);
  await fr.locator('#wordGo').click(); await page.waitForTimeout(900);
  await page.screenshot({ path: path.join(__dirname, 'addflow-1-imagining.png') });
  await fr.evaluate(() => G.closePop()); await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(__dirname, 'addflow-2-closed.png') });
  let placing = false;
  for (let i = 0; i < 60 && !placing; i++) { await page.waitForTimeout(2500); placing = await fr.evaluate(() => !!G.R.ghost); }
  console.log('after closing the window: ' + (placing ? 'it came back ready to place: ' + await fr.evaluate(() => G.R.ghost.name + ' · drawing ready: ' + !!G.figurePic(G.R.ghost.name)) : 'NOTHING came back'));
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(__dirname, 'addflow-3-ready.png') });
  await page.mouse.click(520, 420); await page.waitForTimeout(1500);
  // 2. a world event that leaves a thing
  const ev = await fr.evaluate(async (t) => { const e = await G.ai.ask('event', t); if (e) G.runEvent(e); return e ? e.name + ' | ' + e.note + ' | temp ' + e.temp + ' | fx ' + e.fx + ' | thing ' + (e.thing ? e.thing.name + (e.thing.props.vault > 0.2 ? ' (a wall)' : '') : 'none') : 'nothing'; }, event);
  console.log('event "' + event + '" → ' + ev);
  await page.waitForTimeout(900); await page.screenshot({ path: path.join(__dirname, 'addflow-4-strike.png') });
  for (let i = 0; i < 60; i++) { await page.waitForTimeout(2500); if (await fr.evaluate(() => G.W.zones.every((z) => z._fig !== undefined))) break; }
  console.log(await fr.evaluate(() => G.W.zones.map((z) => z.word + ': ' + (z._fig ? 'drawn (' + z._fig.parts.length + ' parts)' : z._fig === null ? 'no drawing' : 'waiting')).join(' · ') + ' · cost ' + JSON.stringify(G.ai.count.figure || {})));
  await fr.evaluate(() => { const z = G.W.zones[G.W.zones.length - 1]; G.focusOn(z.x, z.y, 1.6); });
  await page.waitForTimeout(1500); await page.screenshot({ path: path.join(__dirname, 'addflow-5-event-thing.png') });
  console.log(errs.slice(0, 4).join('\n') || 'no errors');
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
