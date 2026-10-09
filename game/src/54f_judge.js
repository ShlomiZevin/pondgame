// ── Good and bad: how the player teaches ──
// The player never commands. They say GOOD or BAD of something a creature DID, and that goes into its brain as the strongest reward or punishment it knows.
// Three things make that usable:
//   · MOMENTS. The pond points out things worth a word as they happen ("a Wobmop struck back at the Knight", "a Vorra set a piece of the Hall", "a Darter
//     attacked a Glider"), each with GOOD and BAD beside it. What the creature's brain was doing AT THAT MOMENT is kept with the moment, so the word, when it
//     comes a few seconds later, lands on the right wires. (On a creature's card the same two buttons judge what it is doing right now, and say what that is.)
//   · IT IS HEARD. Others of its kind who were near hear it too, more faintly. And what is learned is passed on (54e_teach.js): the young pick it up, children
//     are born with half of it. So a word to one creature can become a habit of a kind, or fade if it never pays.
//   · IT IS SHOWN. A heart or a cross rises from whoever heard; and WHAT YOU HAVE TAUGHT keeps count: for each sort of deed, how often you called it good or
//     bad, and how common it was when you first spoke and is now. The player can see whether the pond is listening. It may not be: a brain weighs your word
//     against hunger, fear and habit, and that is the point.
(function () {
  'use strict';
  const KINDS = { strike: 'striking back at what harms them', build: 'building', help: 'going to help build', attack: 'attacking other kinds', hunt: 'eating other creatures' };
  const near = function (c, R, fn) { const W = G.W; for (let i = 0; i < W.cre.length; i++) { const o = W.cre[i]; if (o !== c && !o.dead && o.sp === c.sp && Math.hypot(o.x - c.x, o.y - c.y) < R) fn(o); } };
  function teach(c, good, el, k) { if (!c || c.dead || !G.learn || !c.lw) return; const own = c.el; if (el && el.length === c.lw.length) c.el = el; G.learn(c, (good ? 1 : -1) * k); G.learn(c, (good ? 1 : -1) * k); c.el = own; c.godV = (good ? 1 : -1) * Math.min(1, k); }
  /** the player's word on a creature: `m` is the moment it is about (with the brain's state then), or nothing for "what it is doing right now" */
  G.judge = function (c, good, m) {
    const W = G.W; if (!W || !c || c.dead) return;
    teach(c, good, m && m.el, 1); c.judged = (c.judged || 0) + (good ? 1 : -1); c.flash = 1; if (good) c.mend = 1; else c.startle = Math.max(c.startle || 0, 0.8);
    G.emit('judged-by-god', c, good, false);
    let heard = 0; near(c, 260, function (o) { teach(o, good, null, 0.45); heard++; G.emit('judged-by-god', o, good, true); });
    const key = m ? m.key : G.doingKey(c);
    if (key && KINDS[key]) { const T = W.taught = W.taught || {}, r = T[key] = T[key] || { good: 0, bad: 0, rate0: rateOf(key), gen0: W.gen }; if (good) r.good++; else r.bad++; }
    if (G.markDirty) G.markDirty();
    return heard;
  };
  /** what a creature is doing right now, as one of the sorts of deed (or '' for none of them), and in words */
  G.doingKey = function (c) { return c.haul >= 0 || (c.bj && c.deedId) ? 'build' : c.strikeT > 0.4 ? 'strike' : c.cool > 0.9 ? 'attack' : ''; };
  G.doingWords = function (c) {
    if (!c || c.dead) return '';
    if (c.asleep) return 'sleeping';
    if (c.haul >= 0) return 'carrying a piece to a building'; if (c.bj && c.deedId) return 'working on a building'; if (c.deedId) return 'taking part in its kind\'s plan';
    if (c.strikeT > 0.4) return 'striking back at something armed'; if (c.cool > 0.9) return 'attacking';
    if (c.eatFlash > 0.4) return 'eating';
    const i = c.inp, o = c.out; if (i && Math.max(Math.abs(i[5]), Math.abs(i[6])) > 0.35) return o[2] > 0.6 ? 'fleeing from danger' : 'near danger, and not running';
    if (i && Math.max(Math.abs(i[3]), Math.abs(i[4])) > 0.35 && o[0] > 0.5) return 'chasing prey'; if (i && Math.max(Math.abs(i[1]), Math.abs(i[2])) > 0.35 && o[0] > 0.4) return 'going for food';
    if (o && o[4] > 0.5 && (i[10] || 0) > 0.3) return 'keeping with its family'; return o && o[0] > 0.5 ? 'swimming about' : 'drifting';
  };

  // ── how common each sort of deed is: counted every generation, per hundred creatures ──
  const did = {}; function rateOf(key) { const W = G.W; return W && W.didRate && W.didRate[key] !== undefined ? W.didRate[key] : 0; }
  G.on('scored', function () { const W = G.W; if (!W) return; const n = Math.max(1, W.cre.length), R = W.didRate = W.didRate || {}; for (const k in KINDS) { R[k] = +(100 * (did[k] || 0) / n).toFixed(1); did[k] = 0; } });
  G.on('new-pond', function () { for (const k in did) did[k] = 0; M.length = 0; });

  // ── moments ──
  const M = []; const lastOf = {}; let seq = 0;
  /** something worth a word has just been done by this creature */
  G.didIt = function (c, key, words) {
    did[key] = (did[key] || 0) + 1;
    if (typeof document === 'undefined' || G.mode !== 'play' || !c || c.dead || G.speed > 4 || (G.pondAsleep && G.pondAsleep())) return;
    const now = performance.now(); if (now - (lastOf[key] || 0) < 9000 || M.length >= 2) return; lastOf[key] = now;
    const sp = G.speciesById(c.sp); M.push({ id: ++seq, c: c, key: key, words: words, who: sp ? sp.name : 'A creature', el: c.el ? Float32Array.from(c.el) : null, t0: now });
    draw();
  };
  if (G.on) {
    G.on('fight', function (a, b) { if (a && b && a.sp !== b.sp) { const s = G.speciesById(b.sp); G.didIt(a, 'attack', 'attacked a ' + (s ? s.name : 'stranger')); } });
    G.on('death', function (c, cause, by) { if (cause === 'eaten' && by && !by.dead) { const s = G.speciesById(c.sp); G.didIt(by, 'hunt', 'ate a ' + (s ? s.name : 'creature')); } });
    G.on('build-piece', function (d, pc, c) { if (c && pc.st === 1) G.didIt(c, 'build', 'set a piece of the ' + (d.result ? d.result.name : 'building')); });
    G.on('struck-back', function (c, z) { G.didIt(c, 'strike', 'struck back at ' + z.word); });
    G.on('joined-build', function (c, d) { G.didIt(c, 'help', 'went to help build the ' + (d.result ? d.result.name : 'building')); });
  }
  if (typeof document === 'undefined') return;
  const esc = function (s) { return G.escapeHtml ? G.escapeHtml(String(s)) : String(s); };
  let box = null, win = null;
  function ui() {
    if (box) return;
    const st = document.createElement('style');
    st.textContent = '#moments{position:fixed;left:50%;bottom:150px;transform:translateX(-50%);z-index:6;display:flex;flex-direction:column;gap:6px;width:min(560px,calc(100vw - 28px));pointer-events:none}' +
      '#moments .mo{pointer-events:auto;display:flex;align-items:center;gap:10px;padding:8px 10px 8px 14px;border-radius:999px;font:500 12.5px/1.3 system-ui,sans-serif;color:#eaf4ff;animation:moin .3s ease-out}@keyframes moin{from{opacity:0;transform:translateY(8px)}}' +
      '#moments .mo .tx{flex:1;min-width:0;cursor:pointer;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}#moments .mo .tx b{color:#fff}#moments .mo .tx:hover{color:#f6d365}' +
      '#moments .mo button{flex:none;height:30px;padding:0 13px;border-radius:999px;cursor:pointer;font:800 10.5px system-ui,sans-serif;letter-spacing:.1em;background:rgba(7,18,31,.55)}#moments .mo .g{border:1px solid rgba(51,214,166,.75);color:#dffbf1}#moments .mo .b{border:1px solid rgba(255,126,182,.75);color:#ffd3e2}#moments .mo .g:hover{background:rgba(51,214,166,.25)}#moments .mo .b:hover{background:rgba(255,126,182,.25)}' +
      '#moments .mo .q{border:1px solid rgba(207,232,255,.3);color:#cfe8ff;padding:0 10px}#moments .mo.done{opacity:.0;transition:opacity .5s}';
    document.head.appendChild(st);
    box = document.createElement('div'); box.id = 'moments'; (document.getElementById('ui') || document.body).appendChild(box);
    box.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
    box.addEventListener('click', function (e) {
      let n = e.target; while (n && n !== box && !n.dataset.act) n = n.parentNode; if (!n || n === box) return;
      const id = +n.parentNode.dataset.id, m = M.filter(function (q) { return q.id === id; })[0], act = n.dataset.act; if (!m && act !== 'q') return;
      if (act === 'q') { G.openTaught(); return; }
      if (act === 'see') { if (!m.c.dead) { G.select(m.c); G.R.ping = { c: m.c, t: 0 }; G.focusOn(m.c.x, m.c.y, 2.2); } return; }
      if (G.sfx) G.sfx('click'); G.judge(m.c, act === 'g', m); M.splice(M.indexOf(m), 1); draw();
    });
  }
  let sig = '';
  function draw() {
    ui(); const now = performance.now();
    for (let i = M.length - 1; i >= 0; i--) if (now - M[i].t0 > 9000 || M[i].c.dead) M.splice(i, 1);
    const hide = G.mode !== 'play' || (G.ui && G.ui.modal) || (G.pondAsleep && G.pondAsleep());
    const s = hide ? '' : M.map(function (m) { return m.id; }).join(','); if (s === sig) return; sig = s;
    const al = document.getElementById('mvalert'), up = al && !al.classList.contains('hide'); box.style.bottom = up ? Math.round(window.innerHeight - al.getBoundingClientRect().top + 10) + 'px' : '150px';
    box.innerHTML = hide ? '' : M.map(function (m) { return '<div class="mo glass" data-id="' + m.id + '"><span class="tx" data-act="see" title="Show me">A <b>' + esc(m.who) + '</b> ' + esc(m.words) + '</span><button class="g" data-act="g" title="Good: it, and those of its kind who saw, will do more of this">♥ GOOD</button><button class="b" data-act="b" title="Bad: they will do less of this">✕ BAD</button><button class="q" data-act="q" title="What you have taught this pond">?</button></div>'; }).join('');
  }
  setInterval(function () { try { draw(); } catch (e) { console.error(e); } }, 700);

  // ── what you have taught ──
  G.openTaught = function () {
    if (win) { win.remove(); win = null; return; }
    const W = G.W; if (!W) return; const T = W.taught || {}, keys = Object.keys(KINDS);
    win = document.createElement('div'); win.id = 'gbwin'; win.className = 'about'; (document.getElementById('ui') || document.body).appendChild(win);
    win.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
    const row = function (k) { const r = T[k], now = rateOf(k); if (!r) return '<div class="arow"><b style="grid-column:1 / -1">' + esc(KINDS[k].charAt(0).toUpperCase() + KINDS[k].slice(1)) + '</b><small>You have said nothing of it yet. Now: ' + now + ' times a generation for every hundred creatures.</small></div>';
      const d = now - r.rate0, lean = r.good - r.bad, heard = lean === 0 ? '' : (lean > 0) === (d > 0) && Math.abs(d) >= 0.5 ? ' <span style="color:#33d6a6">They seem to be listening.</span>' : W.gen - r.gen0 < 4 ? ' It is early to say.' : ' <span style="color:#ff9ec6">So far they are not taking it up: other things weigh more with them.</span>';
      return '<div class="arow"><b style="grid-column:1 / -1">' + esc(KINDS[k].charAt(0).toUpperCase() + KINDS[k].slice(1)) + '</b><small>You called it good <b style="color:#33d6a6">' + r.good + '</b> ' + (r.good === 1 ? 'time' : 'times') + ' and bad <b style="color:#ff9ec6">' + r.bad + '</b>. When you first spoke (generation ' + r.gen0 + ') it happened ' + r.rate0 + ' times a generation for every hundred creatures; now ' + now + '.' + heard + '</small></div>'; };
    win.innerHTML = '<div class="gtop"><div><b>What you have taught</b><small>You do not command the pond. You say GOOD or BAD of what a creature did; it, and those of its kind who saw, learn from it, the young pick it up from them, and children are born with half of it. Whether it takes hold is up to them.</small></div><button class="btn sm" id="twclose">' + ((G.ICON && G.ICON.close) || '') + 'CLOSE</button></div><h3>BY SORT OF DEED</h3>' + keys.map(row).join('') +
      '<p class="gnote">Where to say it: on the little notes that appear above the toolbar when something happens (slow the pond to 1× or 4× to get them), or on any creature\'s card, where GOOD and BAD are about what it is doing at that moment.</p>';
    document.getElementById('twclose').onclick = function () { win.remove(); win = null; };
  };
  G.on('new-pond', function () { if (win) { win.remove(); win = null; } });
})();
