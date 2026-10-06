// ── The pond's wish: the goal of the game ──
// The pond dreams of one creature at a time ("a brave little thing with a blade"). The wish is always on screen. The player
// makes it come true with what they already have: dropping things in, causing events, keeping and breeding. Every so often
// the AI is shown a picture of the pond's living kinds and says how close each is to the wish, so the card can say "closest
// so far: 6 of 10, it has the blade but no fur yet". When one is close enough the wish comes true: the creature is kept as
// a LEGEND, the level rises, and the pond dreams a harder one. Wishes, level and legends live on the server, per player.
(function () {
  'use strict';
  const NEED = 8;                 // how close (of 10) a creature must be for the wish to come true
  const S = G.wish = { level: 1, cur: null, best: null, legends: [], busy: false, open: false, lastKeys: '' };
  if (G.ai) { G.ai.gaps.wish = 4000; G.ai.caps.wish = 40; G.ai.gaps.wishcheck = 26000; G.ai.caps.wishcheck = 160; G.ai.LABEL.wish = 'The wishes of the pond'; G.ai.LABEL.wishcheck = 'Checking the creatures against the wish'; }
  const live = function () { return G.mode === 'play' && !G.catching && G.W && !G.W.title && G.host && G.host.ready && G.host.caps && G.host.caps.ai && G.ai.provider === 'server' && G.ai.hasFuel(); };
  const esc = function (s) { return String(s === undefined || s === null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  const brief = function () { try { return G.worldBrief ? G.worldBrief() : {}; } catch (e) { return {}; } };

  // ── the card ──
  let box = null;
  function ui() {
    if (box || typeof document === 'undefined') return box;
    const st = document.createElement('style');
    st.textContent = '#wish{position:fixed;top:14px;left:50%;transform:translateX(-50%);z-index:2;width:min(470px,calc(100vw - 28px));padding:8px 14px;border-radius:18px;cursor:pointer;font:500 12.5px system-ui,sans-serif;color:#cfe8ff;line-height:1.35}' +
      '#wish .wk{font:700 9.5px system-ui,sans-serif;letter-spacing:.2em;color:#f6d365;text-transform:uppercase;display:flex;justify-content:space-between;gap:10px}' +
      '#wish .wt{font:700 15px system-ui,sans-serif;color:#fff;margin:2px 0 1px}' +
      '#wish .wbar{height:7px;border-radius:4px;background:rgba(207,232,255,.14);overflow:hidden;margin:5px 0 3px;position:relative}#wish .wbar i{display:block;height:100%;border-radius:4px;background:linear-gradient(90deg,#33d6a6,#f6d365);transition:width .6s}#wish .wbar b{position:absolute;top:-2px;bottom:-2px;left:' + NEED * 10 + '%;width:2px;background:#fff;opacity:.7}' +
      '#wish .wk{display:flex;justify-content:space-between;gap:10px;white-space:nowrap}#wish .wk span:last-child{letter-spacing:.06em;text-transform:none;font-size:11px;color:#ffe9a8}#wish .wt{font-size:17px !important;line-height:1.25;margin:3px 0 6px}' +
      '#wish .wrow{display:flex;justify-content:space-between;font:600 12px system-ui,sans-serif;color:#dcecff}#wish .wrow b{color:#f6d365;font-size:13px}#wish .wrow span:last-child{color:#b9cde2;font-weight:500}' +
      '#wish .wsub{font:500 12.5px/1.4 system-ui,sans-serif;color:#eaf4ff;white-space:normal !important;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;margin-top:4px}#wish.open .wsub{display:block}#wish .wsub u{text-decoration:none;font:800 9px system-ui,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:#8fb2d6;margin-right:5px}' +
      '#wish .wmore{display:none;margin-top:8px;padding-top:8px;border-top:1px solid rgba(207,232,255,.14)}#wish.open .wmore{display:block}' +
      '#wish .wmore p{margin:0;font-size:12px;line-height:1.45;color:#cfe8ff;opacity:.9}#wish .wsay{font-style:italic;font-size:13px !important;color:#fff !important;opacity:1 !important}' +
      '#wish .wlab{font:700 9px system-ui,sans-serif;letter-spacing:.18em;text-transform:uppercase;color:#f6d365;opacity:.85;margin:9px 0 3px}' +
      '#wish .wneeds{display:flex;flex-wrap:wrap;gap:5px}#wish .wchip{display:inline-flex;align-items:center;height:22px;padding:0 10px;border-radius:11px;background:rgba(51,214,166,.14);border:1px solid rgba(51,214,166,.45);font:600 11.5px system-ui,sans-serif;color:#dffbf1;white-space:nowrap}' +
      '#wish .wfoot{display:flex;justify-content:flex-end;margin-top:10px}' +
      '#wish .wbtn{padding:0 14px;height:32px;border-radius:999px;border:1px solid rgba(207,232,255,.25);background:rgba(7,18,31,.45);color:#cfe8ff;font:700 10px system-ui,sans-serif;letter-spacing:.14em;cursor:pointer}' +
      '#wish small{opacity:.8}#wish .wsub{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}#wish.open{z-index:90;background:rgba(9,28,40,.97)}#wish .wdream{display:flex;align-items:center;gap:9px;font:600 13px system-ui,sans-serif;color:#fff;padding:3px 0}#wish .wdot{width:9px;height:9px;border-radius:50%;background:#f6d365;animation:wishp 1s ease-in-out infinite}@keyframes wishp{0%,100%{opacity:.25;transform:scale(.7)}50%{opacity:1;transform:scale(1.15)}}#wish.open .wsub{white-space:normal}' +
      '@media (min-width:721px){#banner.show{transform:translate(-50%,112px) !important}}' +
      '@media (max-width:720px){#wish{top:auto;bottom:74px;font-size:12px}#wish .wt{font-size:13.5px}}@media (max-height:560px){#wish .wsub{display:none}}';
    document.head.appendChild(st);
    box = document.createElement('div'); box.id = 'wish'; box.className = 'glass hide';
    (document.getElementById('ui') || document.body).appendChild(box);
    box.addEventListener('click', function (e) {
      if (e.target && e.target.id === 'wishAnother') { e.stopPropagation(); another(); return; }
      S.open = !S.open; box.classList.toggle('open', S.open); if (G.sfx) G.sfx('click');
    });
    return box;
  }
  function draw() {
    if (!ui()) return;
    const on = G.mode === 'play' && G.W && !G.W.title && (S.cur || S.busy);
    box.classList.toggle('hide', !on);
    if (!on) return;
    if (S.busy || !S.cur) { box.classList.remove('open'); S.open = false; box.innerHTML = '<div class="wk"><span>✦ The wish of the pond</span></div><div class="wdream"><span class="wdot"></span>' + (S.asked === 'another' ? 'The pond is dreaming of something else…' : S.asked === 'next' ? 'The pond is dreaming its next wish…' : 'The pond is dreaming…') + '</div>'; return; }
    const b = S.best, pct = b ? Math.round(b.close * 10) : 0;
    const here = (G.W && G.W.wishN) || 0;
    box.innerHTML = '<div class="wk"><span>✦ The pond wishes for</span><span>' + (here ? '★ ' + here + ' granted in this pond' : '') + '</span></div>' +
      '<div class="wt">' + esc(S.cur.title) + '</div>' +
      '<div class="wrow"><span>Closest creature: <b>' + (b ? b.close : 0) + ' of 10</b></span><span>comes true at ' + NEED + '</span></div>' +
      '<div class="wbar"><i style="width:' + pct + '%"></i><b></b></div>' +
      '<div class="wsub">' + (b ? '<u>Still missing</u> ' + esc(String(b.why).replace(/\.+$/, '')) + '.' : 'Nobody has been looked at yet. The pond looks once a minute.') + '</div>' +
      '<div class="wmore"><p class="wsay">“' + esc(S.cur.text) + '”</p>' +
      '<div class="wlab">It must have</div><div class="wneeds">' + S.cur.needs.map(function (n) { return '<span class="wchip">' + esc(n) + '</span>'; }).join('') + '</div>' +
      (S.cur.hint ? '<div class="wlab">A thought</div><p>' + esc(S.cur.hint) + '</p>' : '') +
      '<div class="wlab">How</div><p>' + (S.level > 1 ? 'This is wish number ' + S.level + ' for you; each one is a little harder than the last. ' : '') + 'It comes true when a living creature reaches ' + NEED + ' of 10. You steer: ADD things, cause WORLD events, ★ KEEP and ♥ BREED the ones heading the right way.</p>' +
      (S.legends.length ? '<div class="wlab">Wishes you granted before, in any pond</div><p>' + S.legends.slice(-4).reverse().map(function (l) { return esc(l.title) + (l.name ? ' (' + esc(l.name) + ')' : ''); }).join(' · ') + '</p>' : '') +
      '<div class="wfoot"><button class="wbtn" id="wishAnother">A DIFFERENT WISH</button></div></div>';
  }

  // ── asking the server ──
  function take(r) {
    if (!r) return;
    if (typeof r.level === 'number') S.level = r.level;
    if (Array.isArray(r.legends)) S.legends = r.legends;
    if (r.wish && (!S.cur || S.cur.id !== r.wish.id)) { S.cur = r.wish; S.best = null; S.lastKeys = ''; if (G.mode === 'play' && G.banner) G.banner('The pond wishes for', r.wish.title + '. ' + (r.wish.text || ''), 7000); }
    else if (r.wish) S.cur = r.wish;
  }
  function fetchWish(extra) {
    if (S.busy || !live() || !G.ai.allow('wish')) return;
    S.busy = true; S.asked = extra && extra.another ? 'another' : 'first'; draw();
    const p = { op: 'get', pond: brief(), model: G.ai.model || undefined }; if (extra) for (const k in extra) p[k] = extra[k];
    G.host.call('wish', p, 60000).then(function (r) { S.busy = false; G.ai.tally('wish', r && r.source, r && r.usd); take(r); draw(); }, function () { S.busy = false; draw(); });
  }
  function another() { if (!S.cur) return; if (G.sfx) G.sfx('click'); fetchWish({ another: 1 }); }

  // one living creature of each kind of look, the commonest first
  function candidates(max) {
    const W = G.W, by = {}, keys = [];
    for (let i = 0; i < W.cre.length; i++) { const c = W.cre[i]; if (c.dead || !c.g || !c.g.f) continue; const k = (G.shapeOf ? G.shapeOf(c.g) : '') + '|' + (G.hueOf ? G.hueOf(c.g) : 0); if (!by[k]) { by[k] = { n: 0, c: c }; keys.push(k); } by[k].n++; if (G.charmOf && G.charmOf(c) > G.charmOf(by[k].c)) by[k].c = c; }
    keys.sort(function (a, b) { return by[b].n - by[a].n; });
    return keys.slice(0, max).map(function (k) { return by[k].c; });
  }
  function check() {
    const W = G.W;
    if (!S.cur || S.busy || S.checking || !live() || !G.sheet || W.cre.length < 4) return;
    const picks = candidates(8); if (picks.length < 1) return;
    const sig = picks.map(function (c) { return G.form.key(c.g.f); }).join('~');
    if (sig === S.lastKeys) return;                           // nothing new to look at
    if (!G.ai.allow('wishcheck')) return;
    const img = G.sheet(picks.map(function (c) { return c.g.f; }), { cw: 200, ch: 206, sc: 0.55, cols: 4 });
    if (!img) return;
    S.checking = true; S.lastKeys = sig;
    const wishId = S.cur.id;
    G.host.call('wish', { op: 'check', image: img, mime: 'image/jpeg', count: picks.length, model: G.ai.model || undefined }, 90000).then(function (r) {
      S.checking = false;
      G.ai.tally('wishcheck', r && r.source, r && r.usd);
      if (G.W !== W || !S.cur || S.cur.id !== wishId || !r || !Array.isArray(r.marks)) return;
      let top = null;
      for (let i = 0; i < r.marks.length; i++) { const m = r.marks[i], c = picks[m.id - 1]; if (!c) continue; if (!top || m.close > top.close) top = { close: m.close, why: m.why, c: c }; }
      if (!top) return;
      const sp = top.c.sp && G.speciesById ? G.speciesById(top.c.sp) : null;
      if (!S.best || top.close >= S.best.close || W.gen - S.best.gen > 12) S.best = { close: top.close, why: top.why, name: sp ? sp.name : '', gen: W.gen };
      if (top.close >= NEED && !top.c.dead) grant(top.c, top); else draw();
    }, function () { S.checking = false; });
  }

  // ── it came true ──
  function story() {
    const W = G.W, bits = [];
    (W.zones || []).slice(-4).forEach(function (z) { bits.push(z.word + ' (dropped in generation ' + z.born + ')'); });
    (W.events || []).slice(-3).forEach(function (e) { bits.push(e.name + ' (generation ' + e.g + ')'); });
    return 'Born in generation ' + W.gen + (bits.length ? '. In its world: ' + bits.join(', ') : ', in a quiet pond') + '.';
  }
  function grant(c, top) {
    const W = G.W, wish = S.cur, sp = c.sp && G.speciesById ? G.speciesById(c.sp) : null;
    let item = null;
    try { item = G.keep ? G.keep(c) : null; } catch (e) { console.error(e); }
    if (item) item.age = ('Legend · ' + wish.title).slice(0, 70);          // the collection shows this line under its name
    const name = item ? item.name : (sp ? sp.name : 'A creature');
    if (G.sfx) G.sfx('discovery');
    if (G.select) G.select(c); if (G.focusOn) G.focusOn(c.x, c.y, 2.2);
    if (G.banner) G.banner('A wish came true', wish.title + ': ' + name + '. ' + top.why + '. It is a Legend now, kept in your collection (BOOK).', 11000);
    if (G.log) G.log('disc', 'A wish came true: ' + wish.title, name + ' is a Legend. ' + top.why + '. ' + story());
    if (W.discLog) W.discLog.push({ key: 'wish' + wish.id, text: 'A wish came true: ' + wish.title + '. ' + name + ' became a Legend. ' + story(), gen: W.gen });
    if (G.markDirty) G.markDirty();
    S.cur = null; S.best = null; S.busy = true; S.asked = 'next'; draw();
    W.wishN = (W.wishN || 0) + 1;
    G.host.call('wish', { op: 'done', wish: wish.id, name: name, gen: W.gen, why: top.why, story: story(), pond: brief(), model: G.ai.model || undefined }, 60000).then(function (r) { S.busy = false; G.ai.tally('wish', r && r.source, r && r.usd); take(r); draw(); G.emit('wish-done', wish, name); }, function () { S.busy = false; draw(); });
  }

  if (typeof document !== 'undefined' && typeof setInterval === 'function') setInterval(function () {
    try { if (!live()) { draw(); return; } if (!S.cur) fetchWish(); else check(); draw(); } catch (e) { console.error(e); }
  }, 3000);
  G.on('new-pond', function () { S.best = null; S.lastKeys = ''; S.checking = false; });
})();
