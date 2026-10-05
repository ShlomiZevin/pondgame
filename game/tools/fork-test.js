// the same pond, three futures: left alone, a poison swamp thrown in, a one-touch predator thrown in.  node tools/fork-test.js [seed]
const fs = require('fs'), path = require('path'), vm = require('vm');
global.window = globalThis; globalThis.addEventListener = () => {};
const src = path.join(__dirname, '..', 'src');
for (const f of ['10_core.js', '20_genome.js', '21_form.js', '30_world.js', '40_words.js', '41_look.js', '43_why.js', '44_pressure.js', '45_organs.js', '45_parts.js', '46_events.js', '47_story.js', '48_judge.js', '49_eras.js']) vm.runInThisContext(fs.readFileSync(path.join(src, f), 'utf8'), { filename: f });
const seed = +process.argv[2] || 11;
(async () => {
  for (const what of [null, 'poison swamp', 'predator killing creatures with one touch', 'everyone grows horns']) {
    G.newWorld({ seed }); G.founderPond();
    let done = false;
    while (G.W.gen <= 160 && !G.W.extinct) {
      G.step(0.1);
      if (what && !done && G.W.gen === 40) { done = true; if (/everyone/.test(what)) G.runEvent(G.offlineEvent(what)); else { const t = await G.ai.ask('thing', what); for (let i = 0; i < 3; i++) G.addZone(G.W.ww * (0.25 + 0.25 * i), G.W.wh * 0.55, t); } }
    }
    const W = G.W, n = W.cre.length || 1, cnt = {};
    for (const c of W.cre) { const k = G.kindOf(c.g).full; cnt[k] = (cnt[k] || 0) + 1; }
    const top = Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a]).slice(0, 4).map(k => k + ' ' + Math.round(100 * cnt[k] / n) + '%');
    const tr = f => Math.round(100 * W.cre.filter(f).length / n) + '%';
    console.log((what || 'left alone').padEnd(42), '| pop', String(W.cre.length).padStart(3), '|', top.join(', '));
    console.log(' '.repeat(42), '| shell', tr(c => c.g.f.shell > 0.25), 'spikes/horns', tr(c => c.ph.spike >= 1), 'poison-proof', tr(c => c.ph.res[2] > 0.5), 'glow', tr(c => c.g.f.glow > 0.3), 'jaws', tr(c => c.ph.jaws), '| things alive', W.zones.length);
  }
})();
