// Do the creatures build a nice pond? The headless town test (game/tools/town-test.js), in a short form: one pond, 60 generations.
// It checks that they build, finish what they build, that it stands up, that buildings do not stand on each other and share ground lines,
// that they work together, and that free designs are let down onto what they rest on. The long form: node game/tools/town-test.js 160 11,23,57
const test = require('node:test'), assert = require('node:assert/strict');
const { spawnSync } = require('child_process'), path = require('path');
test('town: a pond left to itself builds, in order, and what it builds stands', { timeout: 240000 }, () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, '..', 'game', 'tools', 'town-test.js'), '60', '11'], { encoding: 'utf8' });
  assert.equal(r.status, 0, (r.stdout || '').split('\n').filter((l) => /FAIL|CHECK|seed/.test(l)).join('\n') + (r.stderr || '').slice(0, 600));
});
