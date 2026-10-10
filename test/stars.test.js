// Can a star be taken? The headless stars test (game/tools/stars-test.js): every star near home has a terrain and something it is rich in; a ship
// sent against a rival burns lumen and carries the fighters; the rival's Heart is defended, and falls to fighters sent against it; the star is then
// yours, sends home what it is rich in every year and raids no more; an outpost can be founded on a free star; and all of it survives saving.
const test = require('node:test'), assert = require('node:assert/strict');
const { spawnSync } = require('child_process'), path = require('path');
test('stars: a rival star is attacked and taken, an outpost is founded, tribute comes home, and it all keeps', { timeout: 300000 }, () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, '..', 'game', 'tools', 'stars-test.js'), '11'], { encoding: 'utf8' });
  assert.equal(r.status, 0, (r.stdout || '').split('\n').filter((l) => /FAIL|CHECK/.test(l)).join('\n') + (r.stderr || '').slice(0, 600));
});
