// Copies the simulation out of the game, so the server runs the very same rules:  npm run sync
// Source: SIM_SRC, else the Creator checkout next to this repo if it is there, else this repo's own game/src
const fs = require('fs'), path = require('path');
const live = path.join(__dirname, '..', '..', 'plaxzy-creator', 'local-games', 'primordia', 'src');
const src = process.env.SIM_SRC || (fs.existsSync(live) ? live : path.join(__dirname, '..', 'game', 'src'));
const files = ['10_core.js', '20_genome.js', '21_form.js', '21b_body.js', '21c_taste.js', '30_world.js', '40_words.js', '41_look.js', '43_why.js', '44_pressure.js', '45_organs.js', '45_parts.js', '45_plans.js', '46_events.js', '46b_marvels.js', '53_fields.js', '47_story.js', '48_judge.js', '49_eras.js', '80_save.js'];
for (const f of files) {
  fs.copyFileSync(path.join(src, f), path.join(__dirname, '..', 'sim', f));
  console.log('copied', f);
}
