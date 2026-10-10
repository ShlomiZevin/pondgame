// ── Good and bad: how the player teaches ──
// The player never commands. They say GOOD or BAD of something a creature DID, and that goes into its brain as the strongest reward or punishment it knows.
// Four things make that usable:
//   · MOMENTS. The pond points out things worth a word as they happen ("a Wobmop struck back at the Knight", "a Vorra set a piece of the Hall", "a Darter
//     attacked a Glider"), each with SEE, GOOD and BAD beside it. What the creature's brain was doing AT THAT MOMENT is kept with the moment, so the word,
//     when it comes a few seconds later, lands on the right wires. (On a creature's card the same two buttons judge what it is doing right now.)
//   · IT IS SEEN IN THE STAR. When a moment appears, an arrow in the pond runs from the one who did it to what it was done to, with a word on it; SEE takes
//     you there. When you speak, GOOD or BAD rises in big letters over the one you spoke to, and a line says to whom, for what, and who else heard.
//   · IT IS HEARD. Others of its kind who were near hear it too, more faintly. And what is learned is passed on (54e_teach.js): the young pick it up, children
//     are born with half of it. So a word to one creature can become a habit of a kind, or fade if it never pays.
//   · IT IS COUNTED. WHAT YOU HAVE TAUGHT keeps, for each sort of behaviour, how often you called it good and bad, what you said lately, and (for the deeds
//     the pond can count) how common it was when you first spoke and is now. It may not take: a brain weighs your word against hunger, fear and habit.
(function () {
  'use strict';
  const KINDS = { attack: 'attacking other kinds', hunt: 'hunting and eating other creatures', strike: 'striking back at what harms them', build: 'building', help: 'going to help build', feed: 'feeding', flee: 'fleeing from danger', family: 'keeping with their family', rest: 'resting and drifting about' };
  const COUNTED = { attack: 1, hunt: 1, strike: 1, build: 1, help: 1 };      // deeds the pond itself counts, so "then and now" can be shown
  G.JUDGE_KINDS = KINDS;
  const near = function (c, R, fn) { const W = G.W; for (let i = 0; i < W.cre.length; i++) { const o = W.cre[i]; if (o !== c && !o.dead && o.sp === c.sp && Math.hypot(o.x - c.x, o.y - c.y) < R) fn(o); } };
  function teach(c, good, el, k) { if (!c || c.dead || !G.learn || !c.lw) return; const own = c.el; if (el && el.length === c.lw.length) c.el = el; G.learn(c, (good ? 1 : -1) * k); G.learn(c, (good ? 1 : -1) * k); c.el = own; c.godV = (good ? 1 : -1) * Math.min(1, k); }
  /** the player's word on a creature: `m` is the moment it is about (with the brain's state then), or nothing for "what it is doing right now" */
  G.judge = function (c, good, m) {
    const W = G.W; if (!W || !c || c.dead) return;
    teach(c, good, m && m.el, 1); c.judged = (c.judged || 0) + (good ? 1 : -1); if (good) c.goodN = (c.goodN || 0) + 1; else c.badN = (c.badN || 0) + 1; c.flash = 1; if (good) c.mend = 1; else c.startle = Math.max(c.startle || 0, 0.8);
    G.emit('judged-by-god', c, good, false);
    let heard = 0; near(c, 260, function (o) { teach(o, good, null, 0.45); heard++; G.emit('judged-by-god', o, good, true); });
    const key = m ? m.key : G.doingKey(c), what = m ? m.words : (G.doingWords ? G.doingWords(c) : '');
    if (key && KINDS[key]) { const T = W.taught = W.taught || {}, r = T[key] = T[key] || { good: 0, bad: 0, rate0: rateOf(key), gen0: W.gen }; if (good) r.good++; else r.bad++; }
    const sp = G.speciesById ? G.speciesById(c.sp) : null, said = { gen: W.gen, good: !!good, key: key || '', what: what, who: (sp ? sp.name : 'Creature') + ' #' + c.id, heard: heard };
    (W.said = W.said || []).push(said); if (W.said.length > 12) W.said.shift();
    G.emit('you-said', c, good, said);
    if (G.markDirty) G.markDirty();
    return heard;
  };
  /** what a creature is doing right now, as one of the sorts of behaviour, and in words */
  G.doingKey = function (c) {
    if (c.haul >= 0 || (c.bj && c.deedId)) return 'build'; if (c.strikeT > 0.4) return 'strike'; if (c.cool > 0.9) return 'attack'; if (c.asleep) return 'rest'; if (c.eatFlash > 0.4) return 'feed';
    const i = c.inp, o = c.out; if (!i || !o) return 'rest';
    if (Math.max(Math.abs(i[5]), Math.abs(i[6])) > 0.35 && o[2] > 0.6) return 'flee'; if (Math.max(Math.abs(i[3]), Math.abs(i[4])) > 0.35 && o[0] > 0.5) return 'hunt'; if (Math.max(Math.abs(i[1]), Math.abs(i[2])) > 0.35 && o[0] > 0.4) return 'feed';
    if (o[4] > 0.5 && (i[10] || 0) > 0.3) return 'family'; return 'rest';
  };
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

  // ── how common each counted deed is: counted every generation, per hundred creatures ──
  const did = {}; function rateOf(key) { const W = G.W; return W && W.didRate && W.didRate[key] !== undefined ? W.didRate[key] : 0; }
  G.on('scored', function () { const W = G.W; if (!W) return; const n = Math.max(1, W.cre.length), R = W.didRate = W.didRate || {}; for (const k in COUNTED) { R[k] = +(100 * (did[k] || 0) / n).toFixed(1); did[k] = 0; } });
  G.on('new-pond', function () { for (const k in did) did[k] = 0; M.length = 0; MK.length = 0; });

  // ── moments ──
  const M = [], MK = []; const lastOf = {}; let seq = 0;
  /** something worth a word has just been done by this creature (`to`: what it was done to: a creature, a thing, a building, or a place { x, y }) */
  G.didIt = function (c, key, words, to) {
    did[key] = (did[key] || 0) + 1;
    if (typeof document === 'undefined' || G.mode !== 'play' || !c || c.dead || G.speed > 4 || (G.pondAsleep && G.pondAsleep())) return;
    const now = performance.now(); if (now - (lastOf[key] || 0) < 9000 || M.length >= (G.FLAT ? 1 : 2)) return; lastOf[key] = now;
    const sp = G.speciesById(c.sp), tx = to ? to.x : c.x, ty = to ? to.y : c.y, verb = { attack: 'attacks', hunt: 'ate', build: 'sets a piece', strike: 'strikes back', help: 'goes to help' }[key] || '';
    const m = { id: ++seq, c: c, key: key, words: words, who: sp ? sp.name : c.team === 1 ? 'raider' : 'creature', el: c.el ? Float32Array.from(c.el) : null, t0: now, to: to && !to.dead ? to : null, tx: tx, ty: ty, verb: verb };
    M.push(m); if (!G.FLAT) mark(m, 3.4);      // it is shown in the pond as it happens (on a star: only when you press SEE)
    draw();
  };
  /** an arrow in the pond from the one who did it to what it was done to, with a word on it, for a few seconds */
  function mark(m, secs) { for (let i = MK.length - 1; i >= 0; i--) if (MK[i].m === m) MK.splice(i, 1); MK.push({ m: m, t0: performance.now(), T: secs * 1000 }); if (MK.length > 6) MK.shift(); }
  if (G.on) {
    G.on('fight', function (a, b) { if (a && b && a.sp !== b.sp) { const s = G.speciesById(b.sp); G.didIt(a, 'attack', 'attacked a ' + (s ? s.name : 'stranger'), b); } });
    G.on('death', function (c, cause, by) { if (cause === 'eaten' && by && !by.dead) { const s = G.speciesById(c.sp); G.didIt(by, 'hunt', 'ate a ' + (s ? s.name : 'creature'), { x: c.x, y: c.y }); } });
    G.on('build-piece', function (d, pc, c) { if (c && pc.st === 1) G.didIt(c, 'build', 'set a piece of the ' + (d.result ? d.result.name : 'building'), { x: d.x, y: d.y }); });
    G.on('struck-back', function (c, z) { G.didIt(c, 'strike', 'struck back at ' + z.word, z); });
    G.on('joined-build', function (c, d) { G.didIt(c, 'help', 'went to help build the ' + (d.result ? d.result.name : 'building'), { x: d.x, y: d.y }); });
  }
  if (typeof document === 'undefined') return;
  const esc = function (s) { return G.escapeHtml ? G.escapeHtml(String(s)) : String(s); };
  let box = null, win = null, said = null, saidT = 0;
  function ui() {
    if (box) return;
    const st = document.createElement('style');
    st.textContent = '#moments{position:fixed;left:50%;bottom:150px;transform:translateX(-50%);z-index:6;display:flex;flex-direction:column;gap:6px;width:min(620px,calc(100vw - 28px));pointer-events:none}' +
      '#moments .mo{pointer-events:auto;display:flex;align-items:center;gap:8px;padding:8px 10px 8px 14px;border-radius:999px;font:500 12.5px/1.3 system-ui,sans-serif;color:#eaf4ff;animation:moin .3s ease-out}@keyframes moin{from{opacity:0;transform:translateY(8px)}}' +
      '#moments .mo .tx{flex:1;min-width:0;cursor:pointer;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}#moments .mo .tx b{color:#fff}#moments .mo .tx:hover{color:#f6d365}' +
      '#moments .mo button{flex:none;height:30px;padding:0 13px;border-radius:999px;cursor:pointer;font:800 10.5px system-ui,sans-serif;letter-spacing:.1em;background:rgba(7,18,31,.55)}#moments .mo .g{border:1px solid rgba(51,214,166,.75);color:#dffbf1}#moments .mo .b{border:1px solid rgba(255,126,182,.75);color:#ffd3e2}#moments .mo .g:hover{background:rgba(51,214,166,.25)}#moments .mo .b:hover{background:rgba(255,126,182,.25)}' +
      '#moments .mo .s{border:1px solid rgba(246,211,101,.7);color:#ffe9a8}#moments .mo .s:hover{background:rgba(246,211,101,.22)}#moments .mo .q{border:1px solid rgba(207,232,255,.3);color:#cfe8ff;padding:0 10px}' +
      '#saidbar{position:fixed;left:50%;transform:translateX(-50%);z-index:7;max-width:min(640px,calc(100vw - 28px));padding:9px 18px;border-radius:16px;font:500 13px/1.4 system-ui,sans-serif;color:#eaf4ff;text-align:center;cursor:pointer;animation:moin .25s ease-out}#saidbar.g{border:1.5px solid rgba(51,214,166,.9)}#saidbar.b{border:1.5px solid rgba(255,126,182,.9)}#saidbar b{color:#fff}#saidbar .big{font:800 14px system-ui,sans-serif;letter-spacing:.12em;margin-right:8px}#saidbar.g .big{color:#5fe6b8}#saidbar.b .big{color:#ff9ec6}#saidbar small{display:block;font-size:11.5px;color:#b9cde2;margin-top:2px}' +
      '#gbwin .trow{display:grid;grid-template-columns:minmax(0,1fr) 62px 62px;gap:4px 10px;align-items:center;padding:8px 0;border-bottom:1px solid rgba(207,232,255,.1)}#gbwin .trow b{font:700 13.5px system-ui,sans-serif;color:#fff}#gbwin .trow .n{font:800 15px system-ui,sans-serif;text-align:center;padding:3px 0;border-radius:10px}#gbwin .trow .n.g{color:#5fe6b8;background:rgba(51,214,166,.12)}#gbwin .trow .n.b{color:#ff9ec6;background:rgba(255,126,182,.12)}#gbwin .trow .n.z{opacity:.35}#gbwin .trow small{grid-column:1 / -1;font:500 12px/1.45 system-ui,sans-serif;color:#b9cde2}' +
      '#gbwin .thead{display:grid;grid-template-columns:minmax(0,1fr) 62px 62px;gap:10px;font:800 10px system-ui,sans-serif;letter-spacing:.14em;color:#8fb2d6;text-align:center;padding-bottom:2px}#gbwin .thead span:first-child{text-align:left}#gbwin .tlog{font:500 12.5px/1.5 system-ui,sans-serif;color:#dcecff;margin:0;padding:0;list-style:none}#gbwin .tlog li{padding:3px 0}#gbwin .tlog i{font-style:normal;font-weight:800}';
    document.head.appendChild(st);
    box = document.createElement('div'); box.id = 'moments'; (document.getElementById('ui') || document.body).appendChild(box);
    box.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
    box.addEventListener('click', function (e) {
      let n = e.target; while (n && n !== box && !n.dataset.act) n = n.parentNode; if (!n || n === box) return;
      const id = +n.parentNode.dataset.id, m = M.filter(function (q) { return q.id === id; })[0], act = n.dataset.act; if (!m && act !== 'q') return;
      if (act === 'q') { G.openTaught(); return; }
      if (act === 'see') { see(m); return; }
      if (G.sfx) G.sfx('click'); G.judge(m.c, act === 'g', m); M.splice(M.indexOf(m), 1); draw();
    });
    said = document.createElement('div'); said.id = 'saidbar'; said.className = 'glass hide'; said.title = 'Open what you have taught'; (document.getElementById('ui') || document.body).appendChild(said);
    said.addEventListener('pointerdown', function (e) { e.stopPropagation(); }); said.addEventListener('click', function () { G.openTaught(); });
  }
  /** go and look at a moment: the view goes to where it happened, the one who did it is picked, and the arrow shows again, longer */
  function see(m) {
    if (!m || m.c.dead) return; if (G.sfx) G.sfx('click');
    const tx = m.to && !m.to.dead && m.to.x !== undefined ? m.to.x : m.tx, ty = m.to && !m.to.dead && m.to.y !== undefined ? m.to.y : m.ty, d = Math.hypot(tx - m.c.x, ty - m.c.y);
    G.select(m.c); G.R.ping = { c: m.c, t: 0 }; if (G.cam) G.cam.z = G.clamp(520 / Math.max(180, d * 2.2), 1.2, 2.4); G.focusOn((m.c.x + tx) / 2, (m.c.y + ty) / 2, 1.2); mark(m, 7);
    m.t0 = performance.now();      // (looking at it keeps it a while longer)
  }
  let sig = '';
  function draw() {
    ui(); const now = performance.now();
    for (let i = M.length - 1; i >= 0; i--) if (now - M[i].t0 > 9000 || M[i].c.dead) M.splice(i, 1);
    const hide = G.mode !== 'play' || (G.ui && G.ui.modal) || (G.pondAsleep && G.pondAsleep());
    const al = document.getElementById('mvalert'), up = al && !al.classList.contains('hide'), nt = document.getElementById('note'), nup = nt && nt.style.opacity === '1', base = up ? Math.round(window.innerHeight - al.getBoundingClientRect().top + 10) : nup ? Math.max(150, Math.round(window.innerHeight - nt.getBoundingClientRect().top + 10)) : 150;
    if (said && !said.classList.contains('hide')) { if (now - saidT > 5200 || hide) said.classList.add('hide'); else said.style.bottom = (base + box.offsetHeight + (box.offsetHeight ? 8 : 0)) + 'px'; }
    const hb0 = document.getElementById('rarebox'), s = hide ? '' : M.map(function (m) { return m.id; }).join(',') + (hb0 && !hb0.classList.contains('hide') ? 'h' : '') + ':' + base; if (s === sig) return; sig = s;
    box.style.bottom = base + 'px';
    { const hb = document.getElementById('rarebox'), open = hb && !hb.classList.contains('hide') && window.innerWidth > 900, w = Math.min(620, window.innerWidth - 28), x = open ? Math.max(window.innerWidth / 2, hb.getBoundingClientRect().right + 12 + w / 2) : 0; box.style.left = x ? Math.round(x) + 'px' : ''; if (said) said.style.left = x ? Math.round(x) + 'px' : ''; }      /* (beside the NOW panel when that is open, never under it) */
    box.innerHTML = hide ? '' : M.map(function (m) { return '<div class="mo glass" data-id="' + m.id + '"><span class="tx" data-act="see" title="Go and see it">A <b>' + esc(m.who) + '</b> ' + esc(m.words) + '</span><button class="s" data-act="see" title="Go and see it on the star">SEE</button><button class="g" data-act="g" title="Good: it, and those of its kind who saw, will do more of this">♥ GOOD</button><button class="b" data-act="b" title="Bad: they will do less of this">✕ BAD</button><button class="q" data-act="q" title="What you have taught this star">?</button></div>'; }).join('');
  }
  setInterval(function () { try { draw(); } catch (e) { console.error(e); } }, 600);

  // ── your word, said back to you: to whom, for what, who else heard, and the count so far ──
  const JW = [];      // GOOD and BAD rising over those spoken to
  G.on('you-said', function (c, good, s) {
    if (G.mode !== 'play') return; ui(); const W = G.W, r = s.key && W.taught ? W.taught[s.key] : null;
    said.className = 'glass ' + (good ? 'g' : 'b');
    said.innerHTML = '<span class="big">' + (good ? '♥ GOOD' : '✕ BAD') + '</span>to <b>' + esc(s.who) + '</b>' + (s.what ? ' for <b>' + esc(s.what) + '</b>' : '') + '<small>' + (s.heard ? s.heard + ' of its kind nearby heard it too. ' : 'Nobody else of its kind was near enough to hear. ') + (r ? cap(KINDS[s.key]) + ', so far: <b style="color:#5fe6b8">♥ ' + r.good + '</b> · <b style="color:#ff9ec6">✕ ' + r.bad + '</b>' : '') + '</small>';
    saidT = performance.now(); sig = 'x'; draw();
    JW.push({ c: c, good: good, t0: performance.now(), big: true }); if (JW.length > 30) JW.shift();
  });
  G.on('judged-by-god', function (c, good, soft) { if (soft && G.mode === 'play') JW.push({ c: c, good: good, t0: performance.now(), big: false }); });
  const cap = function (s) { s = String(s || ''); return s.charAt(0).toUpperCase() + s.slice(1); };

  // ── drawn in the pond: the arrow of a moment, and GOOD / BAD over those who were spoken to ──
  G.addSystem({ name: 'judge-marks', draw: function () {
    const ctx = G.ctx, v = G.view; if (!ctx || G.mode !== 'play' || (!MK.length && !JW.length) || (G.pondAsleep && G.pondAsleep())) return;
    const now = performance.now(), sx = function (x) { return x * v.scale + v.ox; }, sy = function (y) { return y * v.scale + v.oy; };
    ctx.save(); ctx.setTransform(v.dpr, 0, 0, v.dpr, 0, 0); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (let i = MK.length - 1; i >= 0; i--) { const k = MK[i], m = k.m, u = (now - k.t0) / k.T; if (u >= 1 || m.c.dead) { MK.splice(i, 1); continue; }
      const a = Math.min(1, (1 - u) * 3) * Math.min(1, u * 8), c = m.c, cx = c.rx === undefined ? c.x : c.rx, cy = c.ry === undefined ? c.y : c.ry, T = m.to && !m.to.dead && m.to.x !== undefined ? m.to : null, tx = T ? (T.rx === undefined ? T.x : T.rx) : m.tx, ty = T ? (T.ry === undefined ? T.y : T.ry) : m.ty;
      const ax = sx(cx), ay = sy(cy), bx = sx(tx), by = sy(ty), r1 = (c.ph.r * 2.1 + 6) * v.scale, r2 = ((T && T.ph ? T.ph.r * 2.1 : 26) + 6) * v.scale, L = Math.hypot(bx - ax, by - ay), bad = m.key === 'attack' || m.key === 'hunt', col = bad ? '255,110,140' : '246,211,101';
      // the one who did it, and what it was done to
      ctx.lineWidth = 2.5; ctx.strokeStyle = 'rgba(' + col + ',' + 0.95 * a + ')'; ctx.setLineDash([6, 6]); ctx.lineDashOffset = -now / 40; ctx.beginPath(); ctx.arc(ax, ay, r1, 0, 6.2832); ctx.stroke(); ctx.setLineDash([]);
      if (L > r1 + 8) { ctx.strokeStyle = 'rgba(' + col + ',' + 0.8 * a + ')'; ctx.beginPath(); ctx.arc(bx, by, r2 * (1 + 0.12 * Math.sin(now / 160)), 0, 6.2832); ctx.stroke();
        const ux = (bx - ax) / L, uy = (by - ay) / L, x0 = ax + ux * r1, y0 = ay + uy * r1, x1 = bx - ux * (r2 + 2), y1 = by - uy * (r2 + 2);
        if (L > r1 + r2 + 14) { ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(' + col + ',' + 0.9 * a + ')'; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); ctx.fillStyle = 'rgba(' + col + ',' + a + ')'; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x1 - ux * 12 - uy * 6, y1 - uy * 12 + ux * 6); ctx.lineTo(x1 - ux * 12 + uy * 6, y1 - uy * 12 - ux * 6); ctx.closePath(); ctx.fill(); } }
      // the word for it, by the one who did it
      if (m.verb) { ctx.font = '800 12px system-ui, sans-serif'; const tw = ctx.measureText(m.verb).width + 16, lx = ax, ly = ay - r1 - 15; ctx.fillStyle = 'rgba(9,18,30,' + 0.88 * a + ')'; G.roundRect(ctx, lx - tw / 2, ly - 10, tw, 20, 10); ctx.fill(); ctx.strokeStyle = 'rgba(' + col + ',' + 0.9 * a + ')'; ctx.lineWidth = 1.3; ctx.stroke(); ctx.fillStyle = 'rgba(255,255,255,' + a + ')'; ctx.fillText(m.verb, lx, ly + 0.5); } }
    for (let i = JW.length - 1; i >= 0; i--) { const j = JW[i], T = j.big ? 2400 : 1500, u = (now - j.t0) / T; if (u >= 1 || j.c.dead) { JW.splice(i, 1); continue; }
      const c = j.c, x = sx(c.rx === undefined ? c.x : c.rx), y = sy((c.ry === undefined ? c.y : c.ry) - c.ph.r * 2.4) - 10 - u * (j.big ? 34 : 18), a = Math.min(1, (1 - u) * 2.5), col = j.good ? '95,230,184' : '255,150,190';
      if (j.big) { const R = (c.ph.r * 2.2 + 8 + u * 26) * v.scale; ctx.lineWidth = 3.5 * (1 - u) + 1; ctx.strokeStyle = 'rgba(' + col + ',' + 0.9 * a + ')'; ctx.beginPath(); ctx.arc(sx(c.rx === undefined ? c.x : c.rx), sy(c.ry === undefined ? c.y : c.ry), R, 0, 6.2832); ctx.stroke();
        const txt = j.good ? '♥ GOOD' : '✕ BAD', pop = 1 + 0.3 * Math.max(0, 1 - u * 6); ctx.font = '800 ' + Math.round(22 * pop) + 'px system-ui, sans-serif'; ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(9,18,30,' + 0.85 * a + ')'; ctx.strokeText(txt, x, y); ctx.fillStyle = 'rgba(' + col + ',' + a + ')'; ctx.fillText(txt, x, y); }
      else { ctx.font = '800 14px system-ui, sans-serif'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(9,18,30,' + 0.8 * a + ')'; ctx.strokeText(j.good ? '♥' : '✕', x, y); ctx.fillStyle = 'rgba(' + col + ',' + a + ')'; ctx.fillText(j.good ? '♥' : '✕', x, y); } }
    ctx.restore();
  } });

  // ── what you have taught ──
  function taughtHtml() {
    const W = G.W, T = W.taught || {}, keys = Object.keys(KINDS), spoken = keys.filter(function (k) { return T[k]; }), silent = keys.filter(function (k) { return !T[k]; }), log = (W.said || []).slice().reverse();
    const row = function (k) { const r = T[k], now = rateOf(k); let note = '';
      if (COUNTED[k]) { const d = now - r.rate0, lean = r.good - r.bad; note = 'When you first spoke of it (generation ' + r.gen0 + ') it happened <b>' + r.rate0 + '</b> times a generation for every hundred creatures; now <b>' + now + '</b>.' + (lean === 0 ? ' You have said as much good of it as bad.' : (lean > 0) === (d > 0) && Math.abs(d) >= 0.5 ? ' <span style="color:#5fe6b8">They seem to be listening.</span>' : W.gen - r.gen0 < 4 ? ' It is early to say whether they are listening.' : ' <span style="color:#ff9ec6">So far they are not taking it up: other things weigh more with them.</span>'); }
      else note = 'First spoken of in generation ' + r.gen0 + '. (The star does not count how often this happens, so only your own words are shown.)';
      return '<div class="trow"><b>' + esc(cap(KINDS[k])) + '</b><span class="n g' + (r.good ? '' : ' z') + '">♥ ' + r.good + '</span><span class="n b' + (r.bad ? '' : ' z') + '">✕ ' + r.bad + '</span><small>' + note + '</small></div>'; };
    return '<div class="gtop"><div><b>What you have taught</b><small>You do not command the star. You say <span style="color:#5fe6b8;font-weight:800">GOOD</span> or <span style="color:#ff9ec6;font-weight:800">BAD</span> of what a creature did. It learns from it, and so, more faintly, do those of its kind who were near; the young pick it up and children are born with half of it. Whether it takes hold is up to them.</small></div><button class="btn sm" id="twclose">' + ((G.ICON && G.ICON.close) || '') + 'CLOSE</button></div>' +
      '<h3>YOUR WORDS, BY BEHAVIOUR</h3>' + (spoken.length ? '<div class="thead"><span>BEHAVIOUR</span><span>GOOD</span><span>BAD</span></div>' + spoken.map(row).join('') : '<p class="gnote" style="font-size:13px">You have said nothing yet. Press GOOD or BAD on one of the little notes that appear above the menu when something happens, or on any creature\'s card.</p>') +
      (silent.length && spoken.length ? '<p class="gnote">Not spoken of yet: ' + esc(silent.map(function (k) { return KINDS[k]; }).join(', ')) + '.</p>' : '') +
      (log.length ? '<h3>WHAT YOU SAID LATELY</h3><ul class="tlog">' + log.slice(0, 7).map(function (s) { return '<li><i style="color:' + (s.good ? '#5fe6b8' : '#ff9ec6') + '">' + (s.good ? '♥ GOOD' : '✕ BAD') + '</i> to ' + esc(s.who) + (s.what ? ' for ' + esc(s.what) : '') + ' <span style="opacity:.6">· generation ' + s.gen + (s.heard ? ' · ' + s.heard + ' more heard' : '') + '</span></li>'; }).join('') + '</ul>' : '') +
      '<p class="gnote">Where to say it: on the notes above the menu (they come when the star runs at 1× or 4×; SEE takes you to what happened), or on a creature\'s card, where GOOD and BAD are about what it is doing at that moment.</p>';
  }
  G.openTaught = function () {
    if (win) { win.remove(); win = null; return; }
    if (!G.W) return; ui();
    win = document.createElement('div'); win.id = 'gbwin'; win.className = 'about'; (document.getElementById('ui') || document.body).appendChild(win);
    win.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
    const fill = function () { if (!win) return; const h = taughtHtml(); if (win._h !== h) { win._h = h; win.innerHTML = h; document.getElementById('twclose').onclick = function () { win.remove(); win = null; }; } };
    fill(); const t = setInterval(function () { if (!win) { clearInterval(t); return; } try { fill(); } catch (e) { console.error(e); } }, 900);
  };
  G.on('new-pond', function () { if (win) { win.remove(); win = null; } if (said) said.classList.add('hide'); JW.length = 0; });
})();
