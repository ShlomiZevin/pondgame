// Copies the game's source into this repo (game/), so the repo holds everything needed to run and to continue the work.
//   node scripts/pull-game.js        (or: npm run pull-game)
// The game is developed inside the Plaxzy Creator checkout (local-games/primordia, which that repo ignores),
// because the Creator's checks and local player run from there. This script brings a copy here before a commit.
// Source: GAME_SRC (default ../plaxzy-creator/local-games/primordia)
const fs = require('fs'), path = require('path');
const from = process.env.GAME_SRC || path.join(__dirname, '..', '..', 'plaxzy-creator', 'local-games', 'primordia');
const to = path.join(__dirname, '..', 'game');
if (!fs.existsSync(path.join(from, 'src'))) { console.error('No game source at ' + from + ' (set GAME_SRC)'); process.exit(1); }
const copyDir = (a, b, keep) => {
  fs.mkdirSync(b, { recursive: true });
  for (const f of fs.readdirSync(b)) if (!fs.existsSync(path.join(a, f)) || !keep(f)) fs.rmSync(path.join(b, f), { recursive: true, force: true });   // what was removed there is removed here
  let n = 0;
  for (const f of fs.readdirSync(a)) { if (!keep(f) || fs.statSync(path.join(a, f)).isDirectory()) continue; fs.copyFileSync(path.join(a, f), path.join(b, f)); n++; }
  return n;
};
const src = copyDir(path.join(from, 'src'), path.join(to, 'src'), (f) => /\.(js|html)$/.test(f));
// the build script and the headless tests; the one-off patch scripts that made past edits are history, not tools
const tools = copyDir(path.join(from, 'tools'), path.join(to, 'tools'), (f) => ['build.js', 'form-test.js', 'long-test.js', 'div-test.js', 'fork-test.js', 'evo-test.js', 'oracle-test.js', 'react-test.js', 'marvel-test.js', 'marvel-spread.js', 'town-test.js', 'colony-test.js', 'society-test.js', 'voyage-test.js', 'design-samples.json'].includes(f));
let extra = 0;
for (const f of ['game.html', 'lab.html', 'idea.txt', 'plan.json', 'visual.json']) if (fs.existsSync(path.join(from, f))) { fs.copyFileSync(path.join(from, f), path.join(to, f)); extra++; }
console.log('game/: ' + src + ' source files, ' + tools + ' tools, ' + extra + ' other files, from ' + from);
