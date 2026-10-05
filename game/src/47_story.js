// ── The story of the pond: every few generations, what changed and why it matters, in plain words ──
// The facts are measured by the game (below). The AI only puts them into words; without it a simple
// narrator does the same from the same facts.
(function () {
  'use strict';
  let busy = false, lastAsk = 0;

  function measure(W) {
    const cre = W.cre, n = cre.length || 1;
    let size = 0, speed = 0, eyes = 0, limbs = 0, sun = 0, brain = 0, parts = 0, deep = 0, hunters = 0, armor = 0, segs = 0;
    for (let i = 0; i < cre.length; i++) {
      const c = cre[i], ph = c.ph;
      size += ph.r; speed += ph.speed; eyes += ph.eyes > 0 ? 1 : 0; limbs += ph.nseg > 0 ? 1 : 0; sun += ph.photo > 0.3 ? 1 : 0;
      brain += c.g.w.length + c.g.h * 2; parts += c.g.f.rules.length + c.g.p.length; segs += c.g.f.n; deep += c.x > W.ww * 0.5 ? 1 : 0; armor += ph.defense > 0.2 ? 1 : 0;
    }
    for (let i = 0; i < W.species.length; i++) if (!W.species[i].extinct && W.species[i].kills > 3) hunters += W.species[i].n;
    const h = W.hist[W.hist.length - 1] || {};
    const pct = function (v) { return Math.round(100 * v / n); };
    return {
      gen: W.gen, alive: cre.length, fitness: +(h.avg || 0).toFixed(2), foodPerCreature: Math.round(h.intake || 0),
      size: +(size / n).toFixed(1), speed: Math.round(speed / n), brain: +(brain / n).toFixed(1), parts: +(parts / n).toFixed(1),
      bodySegments: +(segs / n).toFixed(1), walkers: pct(cre.filter(function (c) { return c.ph.lungs; }).length), starBodies: pct(cre.filter(function (c) { return c.g.f.sym; }).length), biters: pct(cre.filter(function (c) { return c.ph.jaws; }).length), onTheShore: pct(cre.filter(function (c) { return c.land; }).length),
      withEyes: pct(eyes), withLimbs: pct(limbs), lightEaters: pct(sun), inTheDeep: pct(deep), hunters: pct(hunters), armoured: pct(armor),
    };
  }
  G.measurePond = measure;

  const LABEL = { alive: 'creatures alive', foodPerCreature: 'food each creature finds', size: 'body size', speed: 'speed', brain: 'brain size', parts: 'things growing on the body',
    bodySegments: 'body segments', walkers: '% that can walk', starBodies: '% with a star-shaped body', biters: '% with a real bite', onTheShore: '% living on the shore', withEyes: '% with eyes', withLimbs: '% with limbs', lightEaters: '% living on light', inTheDeep: '% living in the deep', hunters: '% hunters', armoured: '% armoured', fitness: 'average fitness' };

  /** the biggest changes between two measurements, as plain facts */
  function changes(a, b) {
    const out = [];
    for (const k in LABEL) {
      const x = a[k], y = b[k];
      if (x === undefined || y === undefined) continue;
      const pctKey = k === 'fish' || k === 'amphibians' || k === 'landAnimals' || k === 'thinkers' || k === 'onTheShore' || k.indexOf('with') === 0 || k === 'lightEaters' || k === 'inTheDeep' || k === 'hunters' || k === 'armoured';
      const rel = pctKey ? (y - x) / 25 : (y - x) / Math.max(1e-6, Math.abs(x));
      if (Math.abs(rel) > 0.12) out.push({ what: LABEL[k], from: x, to: y, weight: Math.abs(rel) });
    }
    out.sort(function (p, q) { return q.weight - p.weight; });
    return out.slice(0, 5).map(function (c) { return { what: c.what, from: c.from, to: c.to }; });
  }

  G.offlineStory = function (info) {
    const ch = info.changes || [];
    const top = info.species && info.species[0];
    let text;
    if (!ch.length) text = 'A quiet stretch. ' + (top ? 'The ' + top.name + ' still rules the pond: ' + top.about : 'Life holds steady.');
    else {
      const c = ch[0], up = c.to > c.from;
      const why = /food/.test(c.what) ? (up ? 'they have become better at finding food' : 'food has become harder to find')
        : /eyes/.test(c.what) ? 'seeing food from afar pays off' : /limbs/.test(c.what) ? 'limbs help them swim and reach' : /light/.test(c.what) ? 'living on sunlight means never having to chase a meal'
        : /deep/.test(c.what) ? 'the deep has food nobody else was eating' : /hunters/.test(c.what) ? 'other creatures have become a meal' : /size/.test(c.what) ? (up ? 'a bigger body stores more energy for winter' : 'a small body is cheap to run')
        : /speed/.test(c.what) ? (up ? 'the fast reach food first' : 'moving less saves energy') : /brain/.test(c.what) ? 'smarter steering finds more food' : /armour/.test(c.what) ? 'armour keeps hunters off' : 'it helps them survive';
      text = 'In these generations, ' + c.what + ' went from ' + c.from + ' to ' + c.to + ': ' + why + '.' + (ch[1] ? ' Also, ' + ch[1].what + ' went from ' + ch[1].from + ' to ' + ch[1].to + '.' : '');
    }
    if (info.newOrgans && info.newOrgans.length) text += ' New in the gene pool: ' + info.newOrgans.join(', ') + '.';
    return { title: 'Generation ' + info.gen, text: text.slice(0, 320) };
  };

  G.cleanStory = function (raw, info) {
    if (!raw || typeof raw !== 'object' || !raw.text) return null;
    const whole = function (t, max) { t = String(t).replace(/[<>]/g, '').trim(); if (t.length <= max) return t; const cut = t.slice(0, max); const at = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '), cut.lastIndexOf('.')); return at > max * 0.5 ? cut.slice(0, at + 1) : cut.replace(/\s+\S*$/, '') + '…'; };
    return { title: String(raw.title || 'Generation ' + info.gen).replace(/[<>]/g, '').slice(0, 44), text: whole(raw.text, 300), by: String(raw.by || raw.model || '').slice(0, 60) };
  };

  function add(W, story, gen) {
    story.gen = gen;
    W.story = W.story || [];
    W.story.push(story);
    if (W.story.length > 30) W.story.shift();
    G.emit('story', story);
  }

  G.storyTick = function (gen) {
    const W = G.W;
    if (!W || W.title) return;
    if (!W.storyBase) { W.storyBase = measure(W); W.storyOrgans = W.organs.length; return; }
    if (gen - W.storyBase.gen < 6) return;
    const live = G.mode === 'play' && !G.catching;
    if (live && (busy || Date.now() - lastAsk < 20000)) return;           // when time runs fast, a chapter covers more generations
    const now = measure(W);
    const info = {
      gen: gen, since: W.storyBase.gen, changes: changes(W.storyBase, now), now: now,
      species: W.species.filter(function (s) { return !s.extinct && s.n > 0; }).sort(function (a, b) { return b.n - a.n; }).slice(0, 4).map(function (s) { return { name: s.name, n: s.n, about: G.describeSpecies(s) }; }),
      newOrgans: W.organs.slice(W.storyOrgans || 0).map(function (o) { return o.name; }).slice(-4),
      discoveries: W.discLog.filter(function (d) { return d.gen > W.storyBase.gen; }).map(function (d) { return d.text; }).slice(-4),
      events: (W.events || []).filter(function (e) { return e.g > W.storyBase.gen; }).map(function (e) { return e.name; }),
      things: W.zones.map(function (z) { return z.word; }).slice(0, 6),
    };
    W.storyBase = now; W.storyOrgans = W.organs.length;
    // told by the AI at most every 45 seconds and within a session budget; otherwise the game tells it itself
    const useAi = live && G.ai && G.ai.provider === 'server' && G.ai.available && G.ai.available() && G.ai.allow('story');
    if (!useAi) { lastAsk = Date.now(); add(W, G.offlineStory(info), gen); return; }
    busy = true; lastAsk = Date.now();
    G.ai.ask('story', info).then(function (s) { busy = false; if (G.W === W) add(W, s || G.offlineStory(info), gen); }, function () { busy = false; if (G.W === W) add(W, G.offlineStory(info), gen); });
  };
})();
