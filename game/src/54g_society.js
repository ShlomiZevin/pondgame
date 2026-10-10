// ── Society: character, and what comes of it ──
// Every creature has a CHARACTER, in its genes (g.s, six numbers from 0 to 1), handed down from both parents and open to change like everything else:
//     lead     others gather to it                     shy     it keeps out of a crowd, and bolts from what is armed
//     kind     it gives of its own to one that is short wit     it learns faster, and seeks out its elders to learn from them
//     play     it dances (the simple more readily than the clever), and those near are the gladder
//     sway     it talks others round to the one IT follows
// Nothing says what a kind's society is like. Each creature only does what its own character has it do, and a society is what that adds up to: a kind
// with one strong leader moves as one, feeds it when it is short, and takes after what it has learned; a kind of rival leaders splits; a kindly kind keeps its weak alive; a merry one dances and tires less; a shy one
// lives thin and scattered. Each trait has its price (the kind give their food away, the playful spend theirs, the followers go where they are led), so
// what suits a pond is for that pond to find out.
// A creature may also follow one that is not of its kind, if that one's lead is strong enough: so a leader carried into another pond (G.dropCreature) may
// be taken up there, or be ignored, or be driven out by a fierce people. That is for the ships to come.
(function () {
  'use strict';
  const clamp = G.clamp, NAMES = ['lead', 'shy', 'kind', 'wit', 'play', 'sway'];
  G.SOC = NAMES;
  G.SOC_LABEL = ['Leading', 'Shyness', 'Kindness', 'Wit', 'Playfulness', 'Persuasion'];
  const HIGH = ['commanding', 'shy', 'kind', 'clever', 'playful', 'persuasive'], LOW = ['meek', 'bold', 'selfish', 'simple', 'earnest', 'quiet'];
  /** how much others are drawn to it: its Leading, less for the shy (one that keeps out of crowds does not command them) */
  const sway0 = G.leadOf = function (c) { const s = soc(c); return s[0] * (1 - 0.6 * s[1]); };
  const soc = G.soc = function (c) { const g = c.g || c; return g.s || (g.s = [0.3, 0.3, 0.3, 0.3, 0.3, 0.3]); };
  /** a creature's character in a few words */
  G.characterOf = function (c) {
    const s0 = soc(c), s = s0.slice(), hi = [], lo = []; s[0] = sway0(c) / 0.82; s.forEach(function (v, i) { if (v > 0.62) hi.push([v, HIGH[i]]); else if (v < 0.16 && !(i === 0 && s0[0] >= 0.16)) lo.push([v, LOW[i]]); });      /* (a shy one is never called commanding, however strong its Leading gene) */
    hi.sort(function (a, b) { return b[0] - a[0]; }); lo.sort(function (a, b) { return a[0] - b[0]; });
    const w = hi.slice(0, 2).map(function (q) { return q[1]; }).concat(lo.slice(0, hi.length ? 1 : 2).map(function (q) { return q[1]; }));
    return w.length ? w.join(', ') : 'of no marked character';
  };
  // the witty learn more from the same lesson, the simple less
  { const l0 = G.learn; if (l0) G.learn = function (c, reward) { const s = c && c.g && c.g.s, k = G.LEARN; if (s) G.LEARN = k * (0.5 + 1.25 * s[3]); try { return l0(c, reward); } finally { G.LEARN = k; } }; }

  let acc = 0;
  /** what one creature sees of those round it, and what it does about it (looked at a few times a second) */
  function look(W, c) {
    const s = soc(c), R2 = 270 * 270; let best = null, bs = sway0(c) + 0.15, n = 0, cx = 0, cy = 0, needy = null, nd = 0.28, elder = null, talked = null, ts = s[5] + 0.2;
    const mine = c.E / c.ph.Emax;
    for (let i = 0; i < W.cre.length; i++) { const o = W.cre[i]; if (o === c || o.dead) continue; const dx = o.x - c.x, dy = o.y - c.y, d2 = dx * dx + dy * dy; if (d2 > R2) continue;
      const same = c.sp && o.sp === c.sp, os = soc(o), pull = sway0(o) * (same ? 1 : 0.85 - 0.6 * s[1]) * (1 + 0.05 * Math.min(8, o.fol || 0));      // the shy will not follow a stranger; the bold will, nearly as readily as one of their own
      if (pull > bs) { bs = pull; best = o; }
      if (!same) continue;
      n++; cx += o.x; cy += o.y;
      const need = mine - o.E / o.ph.Emax + 0.04 * Math.min(4, o.liked || 0) + (o === c.leader ? 0.15 : 0); if (need > nd && o.E < o.ph.Emax * 0.36) { nd = need; needy = o; }      // those who have given are given to first, and a leader before anyone
      if (o.age > c.age && (o.learned || 0) > (elder ? elder.learned || 0 : 0.2)) elder = o;
      if (os[5] > ts && o.leader && o.leader !== c && !o.leader.dead) { ts = os[5]; talked = o; }
    }
    c.leader = talked ? talked.leader : best; c.swayed = talked ? talked.id : 0; c.crowd = n; if (n) { c.cx = cx / n; c.cy = cy / n; } c.elder = elder;
    // kind: it gives of its own to one that is short
    if (needy && s[2] > 0.3 && mine > 0.55 && W.t > (c.giveT || 0) && G.rand() < s[2]) { const amt = 0.14 * c.ph.Emax * s[2]; c.giveT = W.t + 22; c.E -= amt; needy.E = Math.min(needy.ph.Emax, needy.E + amt * 0.9); c.gave = (c.gave || 0) + 1; c.liked = (c.liked || 0) + 1; W.stats.shared = (W.stats.shared || 0) + 1; G.emit('share', c, needy); }
    // a following takes after its leader: what the leader has learned (from its own life, or from your GOOD and BAD) passes to those behind it
    if (best && c.leader === best && c.sp === best.sp && G.teachFrom && G.rand() < 0.2) { if (G.teachFrom(c, best)) c.ledBy = best.id; }
    // wit: it goes to its elders to learn
    if (elder && G.teachFrom && G.rand() < 0.35 * s[3]) G.teachFrom(c, elder);
    // play: fed and in company, it dances; those who watch are the gladder for it
    if (!c.dance && s[4] > 0.35 && n >= 1 && mine > 0.6 && !c.asleep && !c.deedId && G.rand() < 0.07 * s[4] * (1.3 - s[3])) { c.dance = 2.6; c.E -= 0.02 * c.ph.Emax; c.danced = (c.danced || 0) + 1; c.liked = (c.liked || 0) + 1; W.stats.dances = (W.stats.dances || 0) + 1;
      for (let i = 0; i < W.cre.length; i++) { const o = W.cre[i]; if (o !== c && !o.dead && o.sp === c.sp && Math.hypot(o.x - c.x, o.y - c.y) < 150) { o.tired = Math.max(0, (o.tired || 0) - 0.12); o.gladT = 2; } }
      G.emit('dance', c); }
  }
  function step(W, dt) {
    acc += dt; const tick = W.step | 0;
    for (let i = 0; i < W.cre.length; i++) { const c = W.cre[i]; if (c.dead) continue;
      if (((tick + c.id * 7) % 12) === 0) look(W, c);
      if (c.liked > 0) c.liked -= 0.01 * dt;
      if (c.dance > 0) { c.dance -= dt; c.ang += 9 * dt; c.vx *= 0.9; c.vy = c.vy * 0.9 + Math.sin(W.t * 14 + c.id) * 26 * dt * 10; continue; }
      if (c.deedId || c.asleep) continue;
      const s = soc(c), L = c.leader;
      if (L && !L.dead) { const dx = L.x - c.x, dy = L.y - c.y, d = Math.hypot(dx, dy) || 1; if (d > 60 && d < 700) { const fed = clamp(c.E / c.ph.Emax, 0, 1), p = (1 - s[0]) * (1 - 0.6 * s[1]) * (0.3 + 0.7 * fed) * Math.min(1, (d - 60) / 90) * 62 * dt; c.vx += dx / d * p; c.vy += dy / d * p; } }      /* the hungry look to themselves first */ else c.leader = null;
      if (c.crowd >= 3 && s[1] > 0.45) { const dx = c.x - c.cx, dy = c.y - c.cy, d = Math.hypot(dx, dy) || 1; if (d < 170) { const p = (s[1] - 0.35) * 34 * dt; c.vx += dx / d * p; c.vy += dy / d * p; } }
      if (s[1] > 0.5 && (c.inp[12] || 0) > 0.35) { c.tired = Math.max(0, (c.tired || 0) - 0.02 * dt); c.vx *= 1 + 0.6 * s[1] * dt; c.vy *= 1 + 0.6 * s[1] * dt; }      // the shy are off at the first sight of anything armed
      if (c.elder && !c.elder.dead && s[3] > 0.55 && c.age < 1) { const dx = c.elder.x - c.x, dy = c.elder.y - c.y, d = Math.hypot(dx, dy) || 1; if (d > 50) { c.vx += dx / d * 10 * s[3] * dt; c.vy += dy / d * 10 * s[3] * dt; } }
    }
    guests(W, dt);
    if (acc >= 1) { acc = 0; for (let i = 0; i < W.cre.length; i++) W.cre[i].fol = 0; for (let i = 0; i < W.cre.length; i++) { const c = W.cre[i], L = c.leader; if (L && !L.dead && !c.dead) L.fol = (L.fol || 0) + 1; } }
  }
  // A stranger is news. For its first while the bold of the pond come up to look at it and the shy keep off; then the pond has made up its mind, and says so:
  // it is followed, or it was looked at and left alone, or it was kept away from, or it did not last.
  const LOOK = 13, VERDICT = 19;      // (a year of the pond is about half a minute: the pond has made up its mind well within the stranger's first year)
  function guests(W, dt) {
    const Gs = W.guests; if (!Gs || !Gs.length) return;
    for (let k = Gs.length - 1; k >= 0; k--) { const g = Gs[k], S = g.c, age = W.t - g.t;
      if (!S || S.dead) { if (!g.told && age < 600) tell(W, g, 'gone'); else if (S && G.mode === 'play' && G.log) G.log('sp', 'The stranger is gone', '#' + S.id + ' (' + G.characterOf(S) + ') has died here' + (S.off ? ', leaving ' + S.off + (S.off === 1 ? ' child' : ' children') + ' with its character among them.' : ', and left no children.')); if (S) { W.stats.guestKids = S.off | 0; G.emit('stranger-gone', S, S.off | 0); } (W.guestsPast = W.guestsPast || []).push(g); if (W.guestsPast.length > 4) W.guestsPast.shift(); Gs.splice(k, 1); continue; }
      if (age > 5 && !g.told) { g.fs = (g.fs || 0) + (S.fol || 0) * dt; g.ft = (g.ft || 0) + dt; }      // how many were behind it, over the whole of its welcome (not at one moment)
      if (age < LOOK) { let near = 0;
        for (let i = 0; i < W.cre.length; i++) { const c = W.cre[i]; if (c === S || c.dead || c.stranger !== undefined || c.deedId || c.asleep) continue; const dx = S.x - c.x, dy = S.y - c.y, d = Math.hypot(dx, dy) || 1; if (d > 380) continue; const sh = soc(c)[1];
          if (d < 150) near++;
          if (sh < 0.42 && d > 85) { const p = (0.42 - sh) * 150 * dt; c.vx += dx / d * p; c.vy += dy / d * p; c.eyeing = S.id; }      // the bold come to look
          else if (sh > 0.5 && d < 240) { const p = (sh - 0.4) * 110 * dt; c.vx -= dx / d * p; c.vy -= dy / d * p; g.fled = (g.fled || 0) + dt; } }      // the shy keep off
        if (near > (g.looked || 0)) g.looked = near; }
      else if (!g.told && age > VERDICT) tell(W, g, 'stay');
      else if (g.told) { g.chk = (g.chk || 0) + dt; if (g.chk >= 5) { g.chk = 0; again(W, g); } }      /* its standing may change: a following gathers, or leaves */
    }
  }
  function again(W, g) {
    const S = g.c, fol = S.fol || 0, cur = fol >= 3 ? 'led' : fol >= 1 ? 'few' : 'alone', was = g.end === 'led' ? 'led' : g.end === 'few' ? 'few' : 'alone';
    if (cur === was || (cur === 'few' && was === 'led') || (cur === 'alone' && was === 'few' && g.end !== 'few')) { g.diff = 0; if (cur === 'few' && was === 'alone') { g.end = 'few'; S.met = 'few'; } return; }
    if ((g.diff = (g.diff || 0) + 1) < 3) return; g.diff = 0;      // (it has to last a while before it is news)
    const id = '#' + S.id, who = G.characterOf(S); let kicker = '', text = '';
    if (cur === 'led') { kicker = 'THE STRANGER NOW LEADS'; text = id + ' (' + who + ') is followed by ' + fol + ' now.'; g.end = 'led'; S.met = 'led'; }
    else if (cur === 'alone') { kicker = 'THE STRANGER HAS LOST ITS FOLLOWING'; text = 'Nobody follows ' + id + ' (' + who + ') any more.'; g.end = 'left'; S.met = 'left'; }
    else { g.end = 'few'; S.met = 'few'; return; }
    g.kicker = kicker; g.text = text; g.toldAt = Date.now(); G.emit('stranger-met', S, g.end, text);
    if (G.mode === 'play') { if (G.log) G.log('sp', kicker.charAt(0) + kicker.slice(1).toLowerCase(), text); if (G.note) G.note(kicker, text); }
  }
  function tell(W, g, how) {
    g.told = 1; const S = g.c, id = '#' + S.id, who = G.characterOf(S), fol = Math.max(g.ft ? Math.round(g.fs / g.ft) : 0, how === 'gone' ? 0 : S.fol || 0); let kicker, text;
    const kinds = {}; for (let i = 0; i < W.cre.length; i++) { const c = W.cre[i]; if (!c.dead && c.leader === S && c.sp) kinds[c.sp] = (kinds[c.sp] || 0) + 1; }
    const names = Object.keys(kinds).sort(function (a, b) { return kinds[b] - kinds[a]; }).slice(0, 2).map(function (k) { const sp = G.speciesById(+k); return sp ? 'the ' + sp.name : ''; }).filter(Boolean).join(' and ');
    if (how === 'gone') { kicker = 'THE STRANGER DID NOT LAST'; text = id + ' (' + who + ') is dead: ' + ({ starved: 'it starved here', eaten: 'it was eaten', fought: 'it was killed in a fight', selected: 'it faded in its first winter' }[S.cause] || 'this star was too hard for it') + '.'; g.end = 'dead'; }
    else if (fol >= 3) { kicker = 'THEY TOOK TO THE STRANGER'; text = id + ' (' + who + ') is followed by ' + fol + (names ? ' of ' + names : '') + '. What it has learned will pass to them, and they will build where it is.'; g.end = 'led'; }
    else if (fol >= 1) { kicker = 'A FEW TOOK TO THE STRANGER'; text = fol + (names ? ' of ' + names : '') + (fol === 1 ? ' follows ' : ' follow ') + id + ' (' + who + '). The rest keep to their own.'; g.end = 'few'; }
    else if ((g.looked || 0) >= 2) { kicker = 'THEY LOOKED, AND WENT BACK TO THEIR OWN'; text = (g.looked) + ' came up to look at ' + id + ' (' + who + '), and none follows it: ' + (sway0(S) < 0.4 ? 'it is no leader.' : 'they would sooner follow their own.'); g.end = 'looked'; }
    else { kicker = 'THEY KEPT AWAY FROM THE STRANGER'; text = 'Nobody went near ' + id + ' (' + who + ')' + ((g.fled || 0) > 3 ? ': a shy people, they drew back from it.' : ': there was nobody about to meet it.'); g.end = 'shunned'; }
    S.met = g.end; W.stats.guest = g.end; G.emit('stranger-met', S, g.end, text);
    if (G.mode === 'play') { if (G.log) G.log('sp', kicker.charAt(0) + kicker.slice(1).toLowerCase(), text); if (G.banner) G.banner(kicker, text, 9000); }
    g.kicker = kicker; g.text = text; g.toldAt = Date.now();
  }
  { const s0 = G.step; G.step = function (dt) { s0(dt); const W = G.W; if (W && !W.title && W.cre.length > 2) step(W, dt); }; }

  /** the one a kind follows (the one with most followers, three at least), or null */
  G.leaderOf = function (spId) { const W = G.W; let b = null; for (let i = 0; i < W.cre.length; i++) { const c = W.cre[i]; if (!c.dead && c.sp === spId && (c.fol || 0) >= 3 && (!b || c.fol > b.fol)) b = c; } return b; };
  /** what a kind's society is like, in a sentence */
  G.societyOf = function (spId) {
    const W = G.W, m = [0, 0, 0, 0, 0, 0]; let n = 0, heads = 0, top = null;
    for (let i = 0; i < W.cre.length; i++) { const c = W.cre[i]; if (c.dead || c.sp !== spId) continue; const s = soc(c); for (let k = 0; k < 6; k++) m[k] += s[k]; n++; if ((c.fol || 0) >= 3) { heads++; if (!top || c.fol > top.fol) top = c; } }
    if (n < 3) return null; for (let k = 0; k < 6; k++) m[k] /= n;
    const mood = [[m[1], 'a shy people'], [m[2], 'a kindly people'], [m[3], 'a clever people'], [m[4], 'a merry people'], [m[5], 'a people of talkers']].sort(function (a, b) { return b[0] - a[0]; })[0];
    const rule = heads === 0 ? 'Nobody leads them: each goes its own way' : heads === 1 ? 'They follow one leader (#' + top.id + ', with ' + top.fol + ' behind it)' : 'They are split between ' + heads + ' leaders (the strongest is #' + top.id + ', with ' + top.fol + ')';
    return { n: n, mean: m, heads: heads, top: top, text: rule + (mood[0] > 0.42 ? '; ' + mood[1] + '.' : '.') };
  };
  // the story of who leads is told when it changes
  G.on('scored', function () {
    const W = G.W; if (!W || G.mode !== 'play') return; const L = W.leaders = W.leaders || {};
    W.species.forEach(function (sp) { if (sp.extinct || sp.n < 6) return; const b = G.leaderOf(sp.id); if (b && b.fol >= 5 && L[sp.id] !== b.id) { L[sp.id] = b.id; if (G.log) G.log('sp', 'The ' + sp.name + ' have a leader', '#' + b.id + ' (' + G.characterOf(b) + ') is followed by ' + b.fol + ' of them.'); } });
  });
  /** a creature set down in this pond from somewhere else (a ship's passenger, a test): it keeps its genes and its character, and is a stranger here */
  G.dropCreature = function (genome, x, y) { const W = G.W, c = G.makeCreature(G.cloneGenome(genome), null, null, []); c.x = c.px = clamp(x, 20, W.ww - 20); c.y = c.py = clamp(y, 20, W.wh - 20); c.E = c.ph.Emax * 0.8; c.P = c.ph.Emax * 0.4; c.stranger = W.gen; c.snap = G.snapOf ? G.snapOf(c) : null; W.cre.push(c); (W.guests = W.guests || []).push({ c: c, t: W.t }); G.emit('stranger', c); return c; };
  G.on('scored', function () { const W = G.W; if (!W || G.mode !== 'play') return; let n = 0; for (let i = 0; i < W.cre.length; i++) if (!W.cre[i].dead && W.cre[i].line) n++;
    const away = G.far && G.far.visiting, who = away ? 'Your people at ' + away.name : 'The line of those who came from another star';
    if (n >= 8 && !W.lineHeld) { W.lineHeld = 1; if (G.log) G.log('sp', away ? 'Your people have taken hold' : "The line of the strangers has taken hold", who + ' now number' + (away ? ' ' : 's ') + n + '.'); if (G.note) G.note(away ? 'Your people have taken hold' : "The line of the strangers has taken hold", who + ' now number' + (away ? ' ' : 's ') + n + '.'); }
    if (n > 0) W.lineSeen = 1; else if (W.lineSeen) { W.lineSeen = 0; W.lineHeld = 0; if (G.log) G.log('sp', away ? 'None of yours are left here' : "The line of the strangers has ended", who + ' has died out.'); if (G.note) G.note(away ? 'None of yours are left here' : "The line of the strangers has ended", who + ' has died out.'); } });
  // A guest that came this year has not been through the year's test, so its first winter does not judge it; from the next one it is judged like anyone.
  G.on('winter', function () { const W = G.W; if (!W) return; for (let i = 0; i < W.cre.length; i++) { const c = W.cre[i]; if (c.stranger === W.gen && c.doomed && !c.dead) { c.doomed = false; c.spared = 1; } } });
  // 1. carrying one creature from a pond to another: what you KEEP remembers its pond, and can be set down ALONE in any pond (BOOK, then COLLECTION)
  if (G.keep) { const k0 = G.keep; G.keep = function (c) { const it = k0(c); if (it && G.W) { it.pond = G.W.seed; if ((c.fol || 0) >= 3) it.led = c.fol; } return it; }; }
  /** one kept creature, alone, set down among the biggest people of this pond (or where you say): a stranger here, unless this is the pond it was kept in */
  G.setDown = function (item, x, y) {
    const W = G.W; if (!W || !item) return null;
    if (item.mv && G.addMarvelDef) { const nid = G.addMarvelDef(item.mv); if (nid && Array.isArray(item.g)) { item.g = item.g.slice(); item.g[8] = nid; } }
    const g0 = G.unpackGenome(item.g); if (!g0) return null;
    for (let i = 0; i < g0.f.rules.length; i++) { const q = g0.f.rules[i]; if (q.k === 8 && q.t >= 100000 && !W.designs.some(function (d) { return d.id === q.t; })) { const d = G.designOf(q.t); if (d && W.designs.length < 12) W.designs.push(JSON.parse(JSON.stringify(d))); } }
    if (x === undefined) { const big = W.species.filter(function (s) { return !s.extinct; }).sort(function (a, b) { return b.n - a.n; })[0], mem = big ? W.cre.filter(function (c) { return !c.dead && c.sp === big.id; }) : []; const all = mem.length >= 3 ? mem : W.cre.filter(function (c) { return !c.dead; });
      if (all.length) { x = 0; y = 0; all.forEach(function (c) { x += c.x / all.length; y += c.y / all.length; }); { let nb = all[0], nd = 1e18; all.forEach(function (c) { const near = all.filter(function (o) { return Math.hypot(o.x - c.x, o.y - c.y) < 260; }).length, d = Math.hypot(c.x - x, c.y - y) - near * 60; if (d < nd) { nd = d; nb = c; } }); x = nb.x; y = nb.y; }      /* (beside one of them who has others round it: where they are, not the empty middle between their grounds) */ x += 70; } else { x = W.ww / 2; y = W.wh * 0.6; } }
    const c = G.dropCreature(g0, x, y); c.E = c.ph.Emax; c.P = c.ph.Emax * 0.4; c.fromPond = item.pond && item.pond !== W.seed ? 1 : 0; c.guestName = item.name;
    if (W.discLog) W.discLog.push({ key: 'guest' + c.id, text: 'You set ' + item.name + ' (' + G.characterOf(c) + ') down alone' + (c.fromPond ? ', a stranger from another star.' : ' among them.'), gen: W.gen });
    G.emit('set-down', item, c); return c;
  };
  if (typeof document !== 'undefined') G.on('set-down', function (it, c) { if (G.mode !== 'play') return; if (G.select) G.select(c); if (G.focusOn) G.focusOn(c.x, c.y, 1.6); if (G.banner) G.banner('A STRANGER HAS COME', it.name + ' (' + G.characterOf(c) + ') is set down alone among them. Watch how they take to it: the bold come to look, the shy keep off.', 8000); });
  /** whom it follows or who follows it, what it has given and danced, and what its people are like */
  G.societyText = function (c) { const L = c.leader && !c.leader.dead ? c.leader : null, so = c.sp ? G.societyOf(c.sp) : null;
    return ((c.fol || 0) >= 3 ? c.fol + ' follow it. ' : L ? 'It follows #' + L.id + (L.sp !== c.sp ? ', one of another kind' : '') + (c.swayed ? ' (talked into it by #' + c.swayed + ')' : '') + '. ' : 'It follows nobody. ') + (c.gave ? 'It has shared its food ' + c.gave + (c.gave === 1 ? ' time. ' : ' times. ') : '') + (c.danced ? 'It has danced ' + c.danced + (c.danced === 1 ? ' time. ' : ' times. ') : '') + (so ? 'Its people: ' + so.text : ''); };
  if (G.lifeText) { const t0 = G.lifeText; G.lifeText = function (c) { return t0(c) + ' Character: ' + G.characterOf(c) + '.' + (c.beenTo ? ' It flew to ' + c.beenTo + ' and came home.' : '') + (c.stranger !== undefined ? (c.fromPond === 0 ? ' You set it down here yourself.' : ' It came here from another star.') + ({ led: ' They follow it.', few: ' A few follow it.', looked: ' They looked at it and went back to their own.', shunned: ' They kept away from it.', left: ' Its following has left it.' }[c.met] || '') : c.line ? ' It is descended from one who came here from another star.' : ''); }; }
  // The stranger's own strip, above the moments: who came, how many are looking and following right now, and then what the pond made of it. It stays on
  // screen for a while after the verdict (banners are often busy with other news), and a click on it goes to the stranger.
  if (typeof document !== 'undefined') setInterval(function () {
    const W = G.W, ui = document.getElementById('ui'); if (!ui) return; let el = document.getElementById('guestbar');
    const all = W && G.mode === 'play' && !W.title ? (W.guests || []).concat(W.guestsPast || []) : [], now = Date.now(); let g = null;
    for (let i = all.length - 1; i >= 0; i--) { const q = all[i]; if (!q.told || now - q.toldAt < 26000) { g = q; break; } }
    if (!g) { if (el) el.style.display = 'none'; return; }
    if (!el) { el = document.createElement('div'); el.id = 'guestbar'; el.className = 'glass'; el.style.cssText = 'position:fixed;left:50%;transform:translateX(-50%);z-index:6;width:max-content;max-width:min(560px,calc(100vw - 28px));padding:8px 16px;border-radius:18px;border:1px solid rgba(246,211,101,.55);font:500 12.5px/1.35 system-ui,sans-serif;color:#eaf4ff;cursor:pointer;text-align:center'; el.title = 'Go to the stranger'; ui.appendChild(el);
      el.onclick = function () { const c = el._c; if (c && !c.dead) { if (G.select) G.select(c); if (G.focusOn) G.focusOn(c.x, c.y, 1.6); } }; }
    const S = g.c, mo = document.getElementById('moments'); el._c = S; el.style.display = ''; el.style.bottom = (150 + (mo ? mo.offsetHeight + (mo.offsetHeight ? 8 : 0) : 0)) + 'px';
    const K = '<b style="color:#f6d365;letter-spacing:.1em;font-size:10.5px">', nm = (S.guestName ? S.guestName + ' (now #' + S.id + ')' : '#' + S.id);
    let near = 0; if (!g.told) for (let i = 0; i < W.cre.length; i++) { const c = W.cre[i]; if (c !== S && !c.dead && Math.hypot(c.x - S.x, c.y - S.y) < 150) near++; }
    const t = g.told ? K + '⚑ ' + g.kicker + '</b><br>' + g.text.replace(/[<>&]/g, '') : K + '⚑ A STRANGER AMONG THEM</b> ' + nm.replace(/[<>&]/g, '') + ', ' + G.characterOf(S) + '<br>' + near + ' near it now · ' + (g.looked || 0) + ' came to look · ' + (S.fol || 0) + ' follow it · they are making up their minds';
    if (el._t !== t) { el._t = t; el.innerHTML = t; }
  }, 400);
  // ── in the NOW panel: strangers and how they stand; under PEOPLE, what each kind's society is like ──
  setTimeout(function () { if (!G.hub) return;      /* (the panel is made after this file is read) */
    G.hub.add(function (W) {
      const out = { sig: '', now: [], people: [], news: [] }, Gs = (W.guests || []).filter(function (g) { return g.c && !g.c.dead; });
      const WORD = { led: 'they follow it', few: 'a few follow it', looked: 'looked at, and left be', shunned: 'kept away from', left: 'its following has left it' };
      Gs.slice(-4).forEach(function (g) { const S = g.c, nm = S.guestName ? S.guestName + ' (now #' + S.id + ')' : 'Stranger #' + S.id;
        const row = G.hub.row({ icon: '\u2691', title: nm, tag: g.told ? WORD[g.end] || 'a stranger' : 'they are making up their minds', sub: G.characterOf(S) + ' \u00b7 ' + (S.fol || 0) + ' follow it' + (g.told ? '' : ' \u00b7 ' + (g.looked || 0) + ' came to look'), act: 'cre', arg: S.id, live: !g.told });
        out.sig += S.id + ':' + (g.end || '') + ':' + (S.fol || 0) + ':' + (g.looked || 0) + '|'; out.people.push(row); if (!g.told || Date.now() - (g.toldAt || 0) < 90000) out.now.push(row); out.news.push('g' + S.id + (g.end || '')); });
      let line = 0; for (let i = 0; i < W.cre.length; i++) if (!W.cre[i].dead && W.cre[i].line && W.cre[i].stranger === undefined) line++;
      if (line) { out.sig += 'ln' + line; out.people.push(G.hub.row({ icon: '\u2691', title: (G.far && G.far.visiting ? 'Born here of your people' : 'Born of strangers') + ': ' + line, sub: 'Descended from those who came from another star. They carry their character on.' })); }
      W.species.filter(function (s) { return !s.extinct && s.n >= 3; }).sort(function (a, b) { return b.n - a.n; }).slice(0, 7).forEach(function (s) { const so = G.societyOf(s.id); if (!so) return; const top = so.top;
        out.sig += s.id + ':' + so.heads + ':' + (top ? top.id + '.' + top.fol : '') + '|';
        const cr = G.craftOf ? G.craftOf(s.id) : 0; out.sig += 'c' + cr; out.people.push(G.hub.row({ icon: so.heads ? '\u2691' : '\u2022', title: 'The ' + s.name, tag: so.n + ' alive', sub: so.text + (cr ? ' <span style="color:#f6d365">Builders: ' + cr + (cr === 1 ? ' building raised' : ' buildings raised') + (cr >= 5 ? ' (masters of it)' : cr >= 2 ? ' (practised)' : '') + '.</span>' : ''), act: top ? 'cre' : 'kind', arg: top ? top.id : s.id }));
        if (top && top.fol >= 5) out.news.push('L' + s.id + ':' + top.id); });
      return out;
    });
    G.hub.act('kind', function (id) { const W = G.W; let x = 0, y = 0, n = 0; W.cre.forEach(function (c) { if (!c.dead && c.sp === +id) { x += c.x; y += c.y; n++; } }); if (n && G.focusOn) G.focusOn(x / n, y / n, 1.3); });
  }, 0);
  // on its card, a line of its own: its character, and whom it follows or who follows it (click it for the genes)
  if (typeof document !== 'undefined') setInterval(function () {
    const at = document.getElementById('idoing'); if (!at) return; let el = document.getElementById('isoc');
    if (!el) { el = document.createElement('div'); el.id = 'isoc'; el.style.cssText = 'font-size:11.5px;line-height:1.45;margin-top:8px;padding:6px 9px;border-radius:10px;background:rgba(246,211,101,.08);border:1px solid rgba(246,211,101,.25);color:rgba(207,232,255,.9);cursor:pointer'; el.title = 'Its character is in its genes, and its children inherit it. Click for its genes.'; el.onclick = function () { if (G.openGenes) G.openGenes(); }; at.parentNode.insertBefore(el, at); }
    const c = G.R && G.R.sel; if (!c || c.dead || !c.g) return; const L = c.leader && !c.leader.dead ? c.leader : null;
    const t = '<b style="color:#f6d365;letter-spacing:.06em;font-size:10.5px">CHARACTER</b> ' + G.characterOf(c) + '<br>' + ((c.fol || 0) >= 3 ? '\u2691 A leader: ' + c.fol + ' follow it' : L ? 'Follows #' + L.id + (L.sp !== c.sp ? ', one of another kind' : '') : 'Follows nobody') + (c.stranger !== undefined ? '<br>A stranger here' + ({ led: ': they follow it', few: ': a few follow it', looked: ': they looked, and left it be', shunned: ': they keep away from it', left: ': its following has left it' }[c.met] || ': they are making up their minds') : c.line ? '<br>Descended from one who came from another star' : '');
    if (el._t !== t) { el._t = t; el.innerHTML = t; }
  }, 500);
})();
