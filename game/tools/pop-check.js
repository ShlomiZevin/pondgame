// HOW MANY LIVE?  node tools/pop-check.js [generations] [seeds]     (no AI, no page: free)
// The same stars are run twice, peacefully: once with the colony planning its own growth (homes, food gardens, the free living by them), once with nothing built.
// What is compared is how many creatures live there, year after year: a colony must not cost its star its life.
const fs = require('fs'), path = require('path'), vm = require('vm');
global.window = globalThis; globalThis.addEventListener = () => {};
const src = path.join(__dirname, '..', 'src');
for (const f of ['10_core.js', '20_genome.js', '21_form.js', '21b_body.js', '21c_taste.js', '30_world.js', '40_words.js', '41_look.js', '43_why.js', '44_pressure.js', '45_organs.js', '45_parts.js', '45_plans.js', '46_events.js', '53_fields.js', '47_story.js', '48_judge.js', '49_eras.js', '54_deeds.js', '54c_acts.js', '54d_build.js', '54e_teach.js', '54f_judge.js', '54g_society.js', '54i_colony.js', '54j_order.js', '57x_far.js', '57y_raids.js', '80_save.js'])
  vm.runInThisContext(fs.readFileSync(path.join(src, f), 'utf8'), { filename: f });
G.hints = G.hints || {}; G.saveNow = function () {};
const gens = +process.argv[2] || 50, seeds = (process.argv[3] || '11,23,37,51').split(',').map(Number);
const rows = [];
for (const seed of seeds) { const r = { seed };
  for (const mode of ['grows', 'bare']) { G.newWorld({ seed }); G.founderPond(); G.mode = 'play'; G.speed = 1; const c = G.colony(G.W); c.peace = true; if (mode === 'bare') { c.auto = false; }
    let last = G.W.gen, sum = 0, n = 0, low = 1e9, peak = 0; for (let t = 0; t < 1e6 && !G.W.extinct && G.W.gen <= gens; t += 0.1) { G.step(0.1); if (G.W.cre.length > peak) peak = G.W.cre.length; if (G.W.gen !== last) { last = G.W.gen; if (last > 20) { const a = G.W.cre.filter((q) => !q.dead && !q.team).length; sum += a; n++; if (a < low) low = a; } } }
    r[mode] = { mean: n ? Math.round(sum / n) : 0, low: low === 1e9 ? 0 : low, peak, extinct: !!G.W.extinct, works: (G.W.works || []).length }; }
  rows.push(r); console.log('seed ' + seed + ': growing by itself ' + JSON.stringify(r.grows) + ' · nothing built ' + JSON.stringify(r.bare)); }
const m = (k) => Math.round(rows.reduce((a, r) => a + r[k].mean, 0) / rows.length);
console.log('mean alive at each new year after year 20: growing ' + m('grows') + ' · bare ' + m('bare') + ' · extinct: ' + rows.filter((r) => r.grows.extinct).length + ' / ' + rows.filter((r) => r.bare.extinct).length);
