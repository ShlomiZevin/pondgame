// DOES A COLONY LEFT TO ITSELF ARM ITSELF?  node tools/defence-check.js [generations] [seeds]     (no AI, no page: free)
// Stars are left alone with their rivals raiding them: once raiders have come the colony should raise towers (3 lumen each) and, struck often or fallen, a wall.
const fs = require('fs'), path = require('path'), vm = require('vm');
global.window = globalThis; globalThis.addEventListener = () => {};
const src = path.join(__dirname, '..', 'src');
for (const f of ['10_core.js', '20_genome.js', '21_form.js', '21b_body.js', '21c_taste.js', '30_world.js', '40_words.js', '41_look.js', '43_why.js', '44_pressure.js', '45_organs.js', '45_parts.js', '45_plans.js', '46_events.js', '53_fields.js', '47_story.js', '48_judge.js', '49_eras.js', '54_deeds.js', '54c_acts.js', '54d_build.js', '54e_teach.js', '54f_judge.js', '54g_society.js', '54i_colony.js', '54j_order.js', '57x_far.js', '57y_raids.js', '80_save.js'])
  vm.runInThisContext(fs.readFileSync(path.join(src, f), 'utf8'), { filename: f });
G.hints = G.hints || {}; G.saveNow = function () {};
const gens = +process.argv[2] || 60, seeds = (process.argv[3] || '11,23,37').split(',').map(Number);
for (const seed of seeds) { G.newWorld({ seed }); G.founderPond(); G.mode = 'play'; G.speed = 1; const W = G.W, c = G.colony(W); const ev = []; G.on('colony-plans', (o, q) => { if (G.W === W && (o.type === 'tower' || o.type === 'wall')) ev.push('gen ' + W.gen + ': ' + o.name); });
  for (let t = 0; t < 1e6 && !W.extinct && W.gen <= gens; t += 0.1) G.step(0.1);
  const by = {}; (W.works || []).forEach((w) => { if (w.bp) { const k = w.tower ? 'tower' : w.bp.type; by[k] = (by[k] || 0) + 1; } }); const nd = G.colonyNeeds(W);
  console.log('seed ' + seed + (W.extinct ? ' EXTINCT' : '') + ': raids so far ' + (c.raidN | 0) + ', Heart fell ' + (c.fell | 0) + ', lumen ' + c.stock[3] + ' (brought in ' + c.got[3] + '), alive ' + W.cre.filter((q) => !q.dead && !q.team).length + ' · ' + JSON.stringify(by) + ' · wanted: towers ' + nd.list[3].need + ', wall ' + nd.list[4].need + ' · ' + (ev.join('; ') || 'no tower or wall planned')); }
