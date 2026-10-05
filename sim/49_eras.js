// ── Ages: discovered, never scripted ──
// There is no ladder and no list of what life "should" become. Once a generation the pond is measured: which
// kind of body is the most common, and how common. When a different kind takes over and holds, a new age begins,
// named after what is actually swimming there ("The Age of Finned Darters"). No two ponds share a history.
// What the pond finds beautiful (its fashion) also drifts over time, so the same pond never stands still.
(function () {
  'use strict';
  const plural = function (kind) { return /s$/.test(kind) ? kind : kind + 's'; };
  const ORD = ['', 'Second ', 'Third ', 'Fourth ', 'Fifth ', 'Sixth '];

  /** the kind of body a genome grows, worked out once per body */
  G.kindOf = function (g) {
    const f = g.f;
    const key = G.form.key(f);
    if (f._kind && f._kindKey === key) return f._kind;
    f._kindKey = key; f._kind = G.form.kind(f);
    return f._kind;
  };
  G.ageNow = function (W) { W = W || G.W; return W && W.ages && W.ages.length ? W.ages[W.ages.length - 1] : { name: 'The Age of Cells', kind: 'Cell', gen: 1 }; };

  G.eraTick = function (gen) {
    const W = G.W, cre = W.cre, n = cre.length;
    if (!n) return;
    if (!W.ages) W.ages = [];
    // who is out there: every kind of body, counted
    const cnt = {}, adj = {}, rep = {};
    for (let i = 0; i < n; i++) {
      const k = G.kindOf(cre[i].g);
      cnt[k.kind] = (cnt[k.kind] || 0) + 1;
      (adj[k.kind] = adj[k.kind] || {})[k.adj] = (adj[k.kind][k.adj] || 0) + 1;
      if (!rep[k.kind] || cre[i].fit > rep[k.kind].fit) rep[k.kind] = cre[i];
    }
    const kinds = Object.keys(cnt).sort(function (a, b) { return cnt[b] - cnt[a]; });
    W.kinds = kinds.slice(0, 6).map(function (k) { return [k, cnt[k] / n]; });
    const top = kinds[0], share = cnt[top] / n;
    if (!W.ages.length) { W.ages.push({ name: 'The Age of ' + plural(top), kind: top, gen: gen, share: share, g: G.packGenome(rep[top].g) }); W.ageCand = null; return; }
    const now = W.ages[W.ages.length - 1];
    if (top === now.kind) { W.ageCand = null; now.share = share; return; }
    // a different kind leads: it must hold its lead for a few generations before the age is its own
    if (!W.ageCand || W.ageCand.kind !== top) { W.ageCand = { kind: top, since: gen }; return; }
    if (share < 0.28 || gen - W.ageCand.since < 4 || gen - now.gen < 8) return;
    // if most of them share a look, the age carries it ("Striped Finned Darters")
    let a = '', an = 0; for (const x in adj[top]) if (adj[top][x] > an) { an = adj[top][x]; a = x; }
    const seenBefore = W.ages.filter(function (q) { return q.kind === top; }).length;
    const name = 'The ' + (seenBefore < ORD.length ? ORD[seenBefore] : 'Next ') + 'Age of ' + (an / cnt[top] >= 0.6 ? a + ' ' : '') + plural(top);
    // why them: what this body is best at, and how it scored against everything else
    const AB = G.form.abilities(rep[top].g.f), best = Object.keys(AB).sort(function (x, y) { return AB[y] - AB[x]; })[0];
    const edge = G.edge ? G.edge(function (c) { return G.kindOf(c.g).kind === top; }).replace('Those that have it', 'They').replace('It does not pay yet', 'They do not out-score the rest') : '';
    const why = 'Why: their body is strongest in ' + best + '.' + (edge ? ' ' + edge : '');
    const age = { name: name, kind: top, gen: gen, share: share, why: why, g: G.packGenome(rep[top].g) };
    W.ages.push(age); if (W.ages.length > 60) W.ages.splice(1, 1);
    W.ageCand = null;
    W.discLog.push({ key: 'age' + gen, text: 'A new age begins: ' + name + '. They took over from the ' + plural(now.kind) + '. ' + why, gen: gen });
    G.emit('era', age, now);
  };

  // what the pond admires changes now and then, the way fashions do: one thing at a time
  G.fashionTick = function (gen) {
    const W = G.W;
    if (!W.fashion || gen - (W.fashionGen || 0) < 22 || G.rand() > 0.3) return;
    const X = W.fashion, r = G.rand, F = G.form;
    const roll = r();
    let text;
    if (roll < 0.4) { const i = Math.floor(r() * 8); const was = X.like[i]; X.like[i] = was > 0.5 ? (r() < 0.5 ? 0 : -0.6) : 1; text = X.like[i] > 0.5 ? F.KMANY[i] + ' are now admired' : F.KMANY[i] + ' have gone out of fashion'; }
    else if (roll < 0.6) { X.pat = 1 + Math.floor(r() * 5); text = ['', 'stripes', 'spots', 'a pale belly', 'rings', 'a saddle'][X.pat] + ' are now admired'; }
    else if (roll < 0.75) { X.eyes = 1 + Math.floor(r() * 4); text = (X.eyes === 1 ? 'a single eye is' : X.eyes + ' eyes are') + ' now admired'; }
    else { const k = ['crest', 'shell', 'glow', 'star', 'long'][Math.floor(r() * 5)]; X[k] = X[k] ? 0 : 1; text = { crest: 'a crest', shell: 'a shell', glow: 'a glow', star: 'a star-shaped body', long: 'a long body' }[k] + (X[k] ? ' is now admired' : ' has gone out of fashion'); }
    W.fashionGen = gen;
    W.discLog.push({ key: 'fashion' + gen, text: 'Taste has shifted: ' + text + '.', gen: gen });
    G.emit('fashion', text);
    // charm is worked out at birth; the living are judged by the new taste at once
    for (let i = 0; i < W.cre.length; i++) W.cre[i].ph.charm = G.clamp(F.taste(W.cre[i].g.f, X) * 1.15, 0, 1);
  };
})();
