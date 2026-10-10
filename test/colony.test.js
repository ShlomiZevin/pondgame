// Does the colony work? The headless colony test (game/tools/colony-test.js): a star is given orders as a player gives them (so many gatherers,
// builders, fighters and guards; a house to be built), and it is checked that the trades are filled and handed down, that what lies about ends up in
// the store, that the house is raised where it was ordered, that raiders break an undefended Heart and are beaten by a defended one, that good workers
// have more children, that all of it survives saving, and that the star lives as it did before anyone gave it orders.
const test = require('node:test'), assert = require('node:assert/strict');
const { spawnSync } = require('child_process'), path = require('path');
test('colony: trades are filled and handed down, the store fills, an order is built, a raid is fought, and it all keeps', { timeout: 400000 }, () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, '..', 'game', 'tools', 'colony-test.js'), '26', '11,23'], { encoding: 'utf8' });
  assert.equal(r.status, 0, (r.stdout || '').split('\n').filter((l) => /FAIL|CHECK/.test(l)).join('\n') + (r.stderr || '').slice(0, 600));
});
