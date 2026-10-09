// Do the creatures grow a society? The headless society test (game/tools/society-test.js), in a short form: two ponds, 30 generations.
// It checks that character is in the genes (saved, handed down, varied), that ponds end up different, that leaders are followed, that they share
// and dance, that the clever learn more, and that a stranger with a leader's character is followed in a pond not its own.
// The long form: node game/tools/society-test.js 60 11,23,57
const test = require('node:test'), assert = require('node:assert/strict');
const { spawnSync } = require('child_process'), path = require('path');
test('society: character is inherited, leaders are followed, they share and dance, and a strange leader is taken up', { timeout: 240000 }, () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, '..', 'game', 'tools', 'society-test.js'), '30', '11,23'], { encoding: 'utf8' });
  assert.equal(r.status, 0, (r.stdout || '').split('\n').filter((l) => /FAIL|CHECK|seed/.test(l)).join('\n') + (r.stderr || '').slice(0, 600));
});
