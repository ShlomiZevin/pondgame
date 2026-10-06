// A long run with a stand-in WATCHER: a fixed, hidden Pixar-like taste that looks at 16 living creatures every few generations
// (as the real AI does through the sheet), with noise and advice, so the dynamics of the algorithm can be studied for hundreds of
// generations at no cost. Its taste is deliberately NOT the game's own surrogate.   node tools/oracle-test.js [gens] [seeds] [lookEvery]
const fs = require('fs'), path = require('path'), vm = require('vm');
global.window = globalThis; globalThis.addEventListener = () => {};
const src = path.join(__dirname, '..', 'src');
for (const f of ['10_core.js', '20_genome.js', '21_form.js', '21b_body.js', '21c_taste.js', '30_world.js', '40_words.js', '41_look.js', '43_why.js', '44_pressure.js', '45_organs.js', '45_parts.js', '45_plans.js', '46_events.js', '53_fields.js', '47_story.js', '48_judge.js', '49_eras.js']) vm.runInThisContext(fs.readFileSync(path.join(src, f), 'utf8'), { filename: f });
const gens = +process.argv[2] || 300, seeds = (process.argv[3] || '11,23').split(',').map(Number), every = +process.argv[4] || 4;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
/** the hidden truth: beauty and whole 0..1, and what is most missing */
function truth(f) {
  const F = G.form, bm = G.body.measure(f), busy = G.body.busy(f), M = f.bd.m;
  let tot = 0, sq = 0; for (let i = 0; i < M.length; i++) { const a = M[i].s * M[i].s * (M[i].pr ? 2 : 1); tot += a; if (i === f.bd.e) sq = a; }
  const head = M.length > 1 ? sq / tot : 0.5;
  const eyes = f.en === 2 ? 1 : f.en === 1 ? 0.6 : f.en >= 3 ? 0.4 : 0;
  const eyeSz = Math.exp(-Math.pow((f.es - 0.66) / 0.22, 2)) * eyes;                 // big, but not alien
  const eyeLow = Math.exp(-Math.pow((f.ey - 0.0) / 0.2, 2));
  const hd = Math.exp(-Math.pow((head - 0.55) / 0.25, 2));
  let spikes = 0, wings = 0, legs = 0, limbs = 0, fins = 0, tentacles = 0;
  for (const q of f.rules) { if (q.on >= 0) continue; if (q.k === 2) spikes++; if (q.k === 1) fins++; if (q.k === 3) tentacles++; if (q.k === 0) limbs++; if (q.k === 8) wings++; }
  if (f.crest > 0.25) spikes++;
  const round = bm.lobed ? 0.3 : 1;
  const sigv = F.cuteLooks(f, bm, busy).slice(-1)[0];
  const stand = G.body.stands(f);
  const tidy = busy <= 5 ? 1 : Math.max(0, 1 - (busy - 5) * 0.3);
  const wh = F.whole(f).v, cl = F.cuteLooks(f, bm, busy), limbRead = cl[cl.length - 2], pose = cl[cl.length - 1];
  const face = f.sm > 0.4 ? 1 : 0.6;
  // hidden tastes the pond's own guess (a linear function of visible features) cannot represent: a peaked colour pairing, an interaction, clutter beyond a point, and idiosyncrasy
  const key = F.key(f); let hh = 0; for (let i = 0; i < key.length; i++) hh = (hh * 31 + key.charCodeAt(i)) >>> 0; const idio = ((hh % 1000) / 1000 - 0.5) * 0.14;
  const hidden = process.env.EASY ? 0 : 0.12 * Math.exp(-Math.pow((Math.abs(f.hue2) - 140) / 35, 2)) + 0.05 * Math.exp(-Math.pow((f.sat - 68) / 10, 2)) + 0.14 * Math.min(eyeSz, hd) - 0.05 * Math.max(0, busy - 6) + idio;
  const b = (process.env.EASY ? 0.1 : -0.02) + hidden + 0.26 * eyeSz + 0.07 * eyeLow + 0.22 * hd + 0.08 * round + 0.1 * tidy + 0.07 * face + 0.1 * Math.min(1, limbs / 2) - 0.14 * spikes + 0.12 * sigv + 0.05 * (f.bl > 0.3 ? 1 : 0) + 0.05 * limbRead;
  const w = 0.05 + 0.4 * wh + 0.15 * (stand ? 1 : 0) + 0.1 * (limbs >= 2 ? 1 : 0) + 0.1 * hd + 0.15 * limbRead + 0.05 * pose;
  // what would help most
  const miss = [['eyes_bigger', f.es < 0.55 ? 0.6 - f.es : 0], ['bigger_head', head < 0.45 ? 0.45 - head : 0], ['simpler', spikes * 0.2 + Math.max(0, busy - 5) * 0.1 + wings * 0.1], ['smile', f.sm < 0.5 ? 0.3 : 0], ['legs', limbs === 0 ? 0.35 : 0], ['arms', limbs === 1 ? 0.3 : 0], ['eyes_lower', f.ey > 0.1 ? 0.2 : 0], ['rounder', bm.lobed ? 0.3 : 0]].sort((a, c) => c[1] - a[1])[0];
  return { b: clamp(b, 0, 1), w: clamp(w, 0, 1), fix: miss[1] > 0.05 ? miss[0] : '' };
}
const rnd = (() => { let s = 12345; return () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296; })();
G.sheet = (forms) => { G._sheet = forms; return 'x'; };
G.mode = 'play'; G.catching = false;
G.ai.provider = 'server'; G.ai.available = () => true; G.ai.hasFuel = () => true; G.ai.allow = () => true;
G.ai.ask = (task, input) => { const forms = G._sheet || []; return Promise.resolve({ scores: forms.map((f, i) => { const t = truth(f); return { id: i + 1, score: clamp(t.b * 0.72 + (rnd() - 0.5) * 0.16, 0, 1), whole: clamp(t.w * 0.6 + (rnd() - 0.5) * 0.16, 0, 1), why: 'x', fix: t.fix }; }) }); };
(async () => {
  for (const seed of seeds) {
    G.newWorld({ seed }); G.founderPond();
    let last = 0; const line = []; let looks = 0; const acc = { b: 0, w: 0, d: 0, n: 0 };
    const flush = async () => { for (let i = 0; i < 4; i++) await Promise.resolve(); };
    while (G.W.gen <= gens && !G.W.extinct) {
      G.step(0.1);
      if (process.env.NOADVICE && G.W.advice) G.W.advice = [];
      if (process.env.NOHALL && G.W.hall) G.W.hall = [];
      if (G.W.gen !== last) {
        last = G.W.gen;
        if (last % every === 0) { G.watchTick(); await flush(); looks++; }
        if (last === 1 || last % Math.max(10, Math.round(gens / 15)) === 0) {
          const cre = G.W.cre, n = cre.length || 1; let tb = 0, tw = 0, bb = 0, bel = 0, belw = 0, es = 0, hdv = 0, sz = 0, sp = 0; const kc = {}, hb = [0, 0, 0, 0, 0, 0]; for (const c of cre) { const k = G.shapeOf(c.g) + '|' + G.hueOf(c.g); kc[k] = (kc[k] || 0) + 1; hb[G.hueOf(c.g)]++; } let sq2 = 0; for (const k in kc) sq2 += (kc[k] / n) * (kc[k] / n); const effK = 1 / sq2, hues = hb.filter((v) => v / n >= 0.08).length;
          for (const c of cre) { const t = truth(c.g.f); tb += t.b; tw += t.w; bb = Math.max(bb, t.b); bel += c.ph.charm; belw += c.ph.whole; es += c.g.f.es; sz += c.ph.r; }
          if (last > gens / 2) { acc.b += tb / n; acc.w += tw / n; acc.d += effK; acc.n++; }
          line.push('g' + String(last).padEnd(4) + ' TRUE beauty ' + (tb / n * 10).toFixed(1) + ' (best ' + (bb * 10).toFixed(1) + ') whole ' + (tw / n * 10).toFixed(1) + ' | believed ' + (bel / n * 10).toFixed(1) + '/' + (belw / n * 10).toFixed(1) + ' | eyes ' + (es / n).toFixed(2) + ' size ' + (sz / n).toFixed(1) + ' (grow ' + (G.W.grow || 0).toFixed(1) + ')' + ' DIVERSITY ' + effK.toFixed(1) + ' looks, ' + hues + ' colours; kinds ' + G.W.species.filter((q) => !q.extinct).length + ' pop ' + cre.length);
        }
      }
    }
    console.log('seed ' + seed + (G.W.extinct ? ' EXTINCT gen ' + G.W.gen : '') + ' (looks ' + looks + ')\n   ' + line.join('\n   '));
    console.log('   eyeN ' + (G.W.eyeN||0) + ' bank ' + (G.W.eyeBank||[]).length + ' hall ' + (G.W.hall||[]).length + ' taste n ' + G.W.taste.n + ' real ' + G.W.cre.filter(c=>c.real).length + '/' + G.W.cre.length + ' mean beauty by taste ' + (G.W.cre.reduce((a,c)=>a+G.form.beauty(c.g.f,G.W.taste),0)/G.W.cre.length).toFixed(2) + ' mean charm ' + (G.W.cre.reduce((a,c)=>a+c.ph.charm,0)/G.W.cre.length).toFixed(2));
    { const B=G.W.eyeBank||[]; const mb=B.reduce((a,e)=>a+e.b,0)/B.length, pb=B.reduce((a,e)=>a+G.form.beauty(e.f,G.W.taste),0)/B.length; console.log('   bank mean mark ' + mb.toFixed(2) + ' taste on bank ' + pb.toFixed(2) + ' wb ' + G.W.taste.wb.toFixed(2)); }
    console.log('   SUMMARY second half: true beauty ' + (acc.b / acc.n * 10).toFixed(2) + ' whole ' + (acc.w / acc.n * 10).toFixed(2) + ' diversity ' + (acc.d / acc.n).toFixed(1) + '');
    console.log('   now: ' + (G.W.kinds || []).slice(0, 4).map((k) => k[0] + ' ' + Math.round(k[1] * 100) + '%').join(', '));
  }
})();
