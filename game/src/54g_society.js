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
  const HIGH = ['a leader', 'shy', 'kind', 'clever', 'playful', 'a talker'], LOW = ['a follower', 'bold', 'selfish', 'simple', 'earnest', 'quiet'];
  const soc = G.soc = function (c) { const g = c.g || c; return g.s || (g.s = [0.3, 0.3, 0.3, 0.3, 0.3, 0.3]); };
  /** a creature's character in a few words */
  G.characterOf = function (c) {
    const s = soc(c), hi = [], lo = []; s.forEach(function (v, i) { if (v > 0.62) hi.push([v, HIGH[i]]); else if (v < 0.16) lo.push([v, LOW[i]]); });
    hi.sort(function (a, b) { return b[0] - a[0]; }); lo.sort(function (a, b) { return a[0] - b[0]; });
    const w = hi.slice(0, 2).map(function (q) { return q[1]; }).concat(lo.slice(0, hi.length ? 1 : 2).map(function (q) { return q[1]; }));
    return w.length ? w.join(', ') : 'of no marked character';
  };
  // the witty learn more from the same lesson, the simple less
  { const l0 = G.learn; if (l0) G.learn = function (c, reward) { const s = c && c.g && c.g.s, k = G.LEARN; if (s) G.LEARN = k * (0.5 + 1.25 * s[3]); try { return l0(c, reward); } finally { G.LEARN = k; } }; }

  let acc = 0;
  /** what one creature sees of those round it, and what it does about it (looked at a few times a second) */
  function look(W, c) {
    const s = soc(c), R2 = 270 * 270; let best = null, bs = s[0] + 0.15, n = 0, cx = 0, cy = 0, needy = null, nd = 0.28, elder = null, talked = null, ts = s[5] + 0.2;
    const mine = c.E / c.ph.Emax;
    for (let i = 0; i < W.cre.length; i++) { const o = W.cre[i]; if (o === c || o.dead) continue; const dx = o.x - c.x, dy = o.y - c.y, d2 = dx * dx + dy * dy; if (d2 > R2) continue;
      const same = c.sp && o.sp === c.sp, os = soc(o), pull = os[0] * (same ? 1 : 0.85 - 0.6 * s[1]) * (1 + 0.05 * Math.min(8, o.fol || 0));      // the shy will not follow a stranger; the bold will, nearly as readily as one of their own
      if (pull > bs) { bs = pull; best = o; }
      if (!same) continue;
      n++; cx += o.x; cy += o.y;
      const need = mine - o.E / o.ph.Emax + 0.04 * Math.min(4, o.liked || 0) + (o === c.leader ? 0.15 : 0); if (need > nd && o.E < o.ph.Emax * 0.5) { nd = need; needy = o; }      // those who have given are given to first, and a leader before anyone
      if (o.age > c.age && (o.learned || 0) > (elder ? elder.learned || 0 : 0.2)) elder = o;
      if (os[5] > ts && o.leader && o.leader !== c && !o.leader.dead) { ts = os[5]; talked = o; }
    }
    c.leader = talked ? talked.leader : best; c.swayed = talked ? talked.id : 0; c.crowd = n; if (n) { c.cx = cx / n; c.cy = cy / n; } c.elder = elder;
    // kind: it gives of its own to one that is short
    if (needy && s[2] > 0.3 && mine > 0.55 && W.t > (c.giveT || 0) && G.rand() < s[2]) { const amt = 0.14 * c.ph.Emax * s[2]; c.giveT = W.t + 7; c.E -= amt; needy.E = Math.min(needy.ph.Emax, needy.E + amt * 0.9); c.gave = (c.gave || 0) + 1; c.liked = (c.liked || 0) + 1; W.stats.shared = (W.stats.shared || 0) + 1; G.emit('share', c, needy); }
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
    if (acc >= 1) { acc = 0; for (let i = 0; i < W.cre.length; i++) W.cre[i].fol = 0; for (let i = 0; i < W.cre.length; i++) { const c = W.cre[i], L = c.leader; if (L && !L.dead && !c.dead) L.fol = (L.fol || 0) + 1; } }
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
  G.dropCreature = function (genome, x, y) { const W = G.W, c = G.makeCreature(G.cloneGenome(genome), null, null, []); c.x = c.px = clamp(x, 20, W.ww - 20); c.y = c.py = clamp(y, 20, W.wh - 20); c.E = c.ph.Emax * 0.8; c.stranger = W.gen; c.snap = G.snapOf ? G.snapOf(c) : null; W.cre.push(c); return c; };
  /** whom it follows or who follows it, what it has given and danced, and what its people are like */
  G.societyText = function (c) { const L = c.leader && !c.leader.dead ? c.leader : null, so = c.sp ? G.societyOf(c.sp) : null;
    return ((c.fol || 0) >= 3 ? c.fol + ' follow it. ' : L ? 'It follows #' + L.id + (L.sp !== c.sp ? ', a stranger' : '') + (c.swayed ? ' (talked into it by #' + c.swayed + ')' : '') + '. ' : 'It follows nobody. ') + (c.gave ? 'It has shared its food ' + c.gave + (c.gave === 1 ? ' time. ' : ' times. ') : '') + (c.danced ? 'It has danced ' + c.danced + (c.danced === 1 ? ' time. ' : ' times. ') : '') + (so ? 'Its people: ' + so.text : ''); };
  if (G.lifeText) { const t0 = G.lifeText; G.lifeText = function (c) { return t0(c) + ' Character: ' + G.characterOf(c) + '.' + (c.stranger !== undefined ? ' It came here from another pond.' : ''); }; }
  // on its card, a line of its own: its character, and whom it follows or who follows it (click it for the genes)
  if (typeof document !== 'undefined') setInterval(function () {
    const at = document.getElementById('idoing'); if (!at) return; let el = document.getElementById('isoc');
    if (!el) { el = document.createElement('div'); el.id = 'isoc'; el.style.cssText = 'font-size:11.5px;line-height:1.45;margin-top:8px;padding:6px 9px;border-radius:10px;background:rgba(246,211,101,.08);border:1px solid rgba(246,211,101,.25);color:rgba(207,232,255,.9);cursor:pointer'; el.title = 'Its character is in its genes, and its children inherit it. Click for its genes.'; el.onclick = function () { if (G.openGenes) G.openGenes(); }; at.parentNode.insertBefore(el, at); }
    const c = G.R && G.R.sel; if (!c || c.dead || !c.g) return; const L = c.leader && !c.leader.dead ? c.leader : null;
    const t = '<b style="color:#f6d365;letter-spacing:.06em;font-size:10.5px">CHARACTER</b> ' + G.characterOf(c) + '<br>' + ((c.fol || 0) >= 3 ? '\u2691 A leader: ' + c.fol + ' follow it' : L ? 'Follows #' + L.id + (L.sp !== c.sp ? ', a stranger' : '') : 'Follows nobody') + (c.stranger !== undefined ? ' \u00b7 from another pond' : '');
    if (el._t !== t) { el._t = t; el.innerHTML = t; }
  }, 500);
})();
