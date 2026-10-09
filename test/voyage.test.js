// Can they fly to another pond and come home? The headless voyage test (game/tools/voyage-test.js): a pond builds a spaceport on the shore and a
// spaceship on it; the crew crosses to a far pond, which is alive with its own kinds; the save made while away is the pond at home; you can watch either
// pond while the ship is away; the ship comes home with one of theirs; the far pond waits as it was left; and a reopened save brings the far ponds back.
const test = require('node:test'), assert = require('node:assert/strict');
const { spawnSync } = require('child_process'), path = require('path');
test('voyage: a port and a ship are built, a crew crosses to a far pond and comes home, and both ponds keep', { timeout: 300000 }, () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, '..', 'game', 'tools', 'voyage-test.js'), '90', '11'], { encoding: 'utf8' });
  assert.equal(r.status, 0, (r.stdout || '').split('\n').filter((l) => /FAIL|CHECK|home:|far:/.test(l)).join('\n') + (r.stderr || '').slice(0, 600));
});
