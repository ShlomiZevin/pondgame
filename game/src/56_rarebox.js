// ── NOW: everything that matters in the pond at this moment, in one place ──
// A button in the bottom menu (NOW) carries a badge when there is news: a gold number for what is new (a plan, a marvel, a ship, a stranger, a leader),
// red when something dangerous has appeared. It opens one panel, which stays open for as long as you like while the pond goes on:
//     NOW       what is happening this minute, most pressing first      PLANS    the plan under way, what they have built, plans past
//     MARVELS   every marvel alive                                      PEOPLE   each kind's society, strangers, your outposts in far ponds
//     DANGERS   what harms the pond, and how far life has got in beating it
// Other parts of the game put their own rows in it (G.hub.add): voyages (59_voyage.js), society (54g_society.js), dangers (63_versus.js).
// Click any row and the camera goes to it.
(function () {
  'use strict';
  if (typeof document === 'undefined') return;
  let box = null, sig = '', seen = {}, shut = true, tab = 'now', open = '', btn = null;
  const H = G.hub = { parts: [], acts: {},
    /** a part of the game says what it has for the panel: fn(W) -> { sig, now:[html], people:[html], dangers:[html], news:[keys], alarm:[keys] } */
    add: function (fn) { H.parts.push(fn); }, act: function (name, fn) { H.acts[name] = fn; },
    open: function (t) { shut = false; if (t) tab = t; sig = ''; draw(); }, close: function () { shut = true; sig = ''; draw(); }, poke: function () { sig = ''; },
    /** one row, in the panel's own look: { icon, title, tag, bad, sub, extra, act, arg, live } */
    row: function (o) { return '<div class="rrow' + (o.live ? ' live' : '') + (o.act ? '' : ' idle') + '"' + (o.act ? ' data-act="' + o.act + '" data-arg="' + esc(o.arg === undefined ? '' : o.arg) + '"' : '') + '><span class="ric">' + (o.icon || '\u2022') + '</span><span style="flex:1;min-width:0"><span class="rt"><b>' + esc(o.title) + '</b>' + (o.tag ? '<span class="rtag' + (o.bad ? ' no' : '') + '">' + esc(o.tag) + '</span>' : '') + '</span>' + (o.sub ? '<div class="rsub">' + o.sub + '</div>' : '') + (o.extra || '') + '</span></div>'; } };
  const esc = function (s) { return String(s === undefined || s === null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  // what a marvel DOES, said plainly from its own numbers (the AI made the numbers up; this only reads them out)
  const WHO = { hunters: 'its hunters', others: 'other kinds', kin: 'its own kind', all: 'everyone near' };
  G.marvelDoes = function (m) {
    const out = [], P = (m && m.powers) || [];
    for (let i = 0; i < P.length; i++) { const p = P[i], v = [];
      if (p.hurt > 0.05) v.push('hurts'); if (p.strike > 0.05) v.push('strikes'); if (p.slow > 0.05) v.push('slows'); if (p.pull > 0.05) v.push('draws in'); if (p.pull < -0.05) v.push('pushes away'); if (p.heal > 0.05) v.push('heals'); if (p.feed > 0.05) v.push('feeds');
      if (!v.length) continue;
      const what = v.length > 1 ? v.slice(0, -1).join(', ') + ' and ' + v[v.length - 1] : v[0];
      out.push((p.kind === 'pulse' ? 'Every ' + Math.round(p.every) + ' seconds a burst of ' + p.stuff + ' ' : 'A ring of ' + p.stuff + ' is always about it: it ') + what + ' ' + (WHO[p.to] || 'those near') + '.'); }
    if (m && m.words && m.words.length) out.push('It talks: "' + m.words[0] + '"');
    return out;
  };
  G.marvelCard = function (m) {
    const does = G.marvelDoes(m);
    const pic = G.marvelPic ? G.marvelPic(m, 46) : '';
    return '<div class="mh">' + pic + '<div class="mt"><div class="mk">★ MARVEL · RARE</div><span class="mn">' + esc(m.name) + '</span></div></div><div class="mw">' + esc(m.wonder) + '</div>' +
      '<div class="my" style="font-style:normal">' + (G.havenOf && G.havenOf() ? 'There is a Marvel Garden: it is safe while it lives there.' : 'To keep it alive longer: ADD → ★ Marvel Garden.') + '</div>' +
      ((does.length || m.why) ? '<details><summary>What it does</summary>' + (does.length ? '<ul>' + does.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ul>' : '') + (m.why ? '<div class="my">' + esc(m.why) + '</div>' : '') + '</details>' : '');
  };
  function ui() {
    if (box) return box;
    const st = document.createElement('style');
    st.textContent = '#rarebox{position:fixed;left:14px;top:50%;transform:translateY(-50%);width:min(390px,calc(100vw - 28px));padding:10px 12px 12px;border-radius:18px;z-index:2;font:500 12.5px/1.45 system-ui,sans-serif;color:#eaf4ff;max-height:54vh;overflow-y:auto;scrollbar-width:thin}' +
      '#rarebox .hbtn{display:inline-block;margin:7px 6px 0 0;padding:6px 12px;border-radius:999px;cursor:pointer;font:800 10.5px system-ui,sans-serif;letter-spacing:.08em;color:#14202e;background:#f6d365;border:1px solid #f6d365}#rarebox .hbtn.q{background:transparent;color:#eaf4ff;border-color:rgba(207,232,255,.4)}#rarebox .hbtn:hover{filter:brightness(1.12)}' +
      '#tb-now{position:relative}#tb-now.on{border-color:#f6d365;color:#ffe9a8}#tb-now .tbadge{position:absolute;top:-7px;right:-5px;min-width:19px;height:19px;border-radius:10px;background:#f6d365;color:#14202e;font:800 11px/19px system-ui,sans-serif;text-align:center;padding:0 5px;box-shadow:0 0 0 2px rgba(7,18,31,.9);letter-spacing:0}#tb-now .tbadge.bad{background:#ff5d7a;color:#fff}#tb-now .tbadge:empty{display:none}' +
      '#rarebox .rk{display:flex;justify-content:space-between;align-items:center;gap:10px;cursor:pointer;min-height:28px}#rarebox .rk>span:first-child{font:800 10.5px system-ui,sans-serif;letter-spacing:.16em;color:#f6d365;text-transform:uppercase;white-space:nowrap}' +
      '#rarebox{overflow-x:hidden}#rarebox:not(.shut) .rc em{display:none}#rarebox .rc{display:flex;align-items:center;gap:5px;min-width:0}#rarebox .rc em{font:700 10.5px system-ui,sans-serif;font-style:normal;padding:2px 8px;border-radius:999px;background:rgba(246,211,101,.16);border:1px solid rgba(246,211,101,.55);color:#ffe9a8;white-space:nowrap}' +
      '#rarebox .rk u{text-decoration:none;display:flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:50%;background:rgba(255,255,255,.1);color:#fff;font-size:11px}#rarebox .rk:hover u{background:rgba(255,255,255,.22)}' +
      '#rarebox .rh{font:800 9px system-ui,sans-serif;letter-spacing:.16em;color:#8fb2d6;text-transform:uppercase;margin:11px 2px 5px}' +
      '#rarebox .rrow{position:relative;display:flex;gap:10px;align-items:flex-start;padding:9px 26px 10px 9px;margin-top:6px;border-radius:13px;cursor:pointer;background:rgba(7,18,31,.38);border:1px solid rgba(207,232,255,.12);transition:background .15s,border-color .15s}#rarebox .rrow:hover{background:rgba(246,211,101,.1);border-color:rgba(246,211,101,.5)}' +
      '#rarebox .rrow:after{content:"\\203A";position:absolute;right:9px;top:8px;font-size:18px;line-height:1;color:#fff;opacity:.35}#rarebox .rrow:hover:after{opacity:.9}' +
      '#rarebox .rrow.live{background:rgba(246,211,101,.09);border-color:rgba(246,211,101,.55)}#rarebox .rrow.old{padding-top:7px;padding-bottom:7px;background:transparent}' +
      '#rarebox .ric{flex:none;width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:17px;background:rgba(7,18,31,.6);border:1px solid rgba(207,232,255,.18)}#rarebox .ric img{width:28px;height:28px}#rarebox .old .ric{width:24px;height:24px;font-size:12px;opacity:.8}' +
      '#rarebox .rt{display:flex;flex-wrap:wrap;align-items:center;gap:4px 7px}#rarebox b{color:#fff;font-size:14px;line-height:1.25}#rarebox .old b{font-size:12.5px;font-weight:600}' +
      '#rarebox .rsub{font-size:12.5px;color:#dcecff;margin-top:3px}#rarebox .old .rsub{font-size:11.5px;color:#b9cde2;margin-top:1px}' +
      '#rarebox .rtag{display:inline-block;padding:1px 7px;border-radius:999px;background:rgba(51,214,166,.16);border:1px solid rgba(51,214,166,.55);font-size:10px;font-weight:700;color:#dffbf1;white-space:nowrap}#rarebox .rtag.no{background:rgba(255,125,150,.14);border-color:rgba(255,125,150,.5);color:#ffdfe6}' +
      '#rarebox .rl{display:grid;grid-template-columns:38px 1fr;gap:5px 8px;margin-top:7px;font-size:12.5px;color:#eef6ff}#rarebox .rl i{font:800 8.5px system-ui,sans-serif;letter-spacing:.12em;color:#8fb2d6;padding-top:4px;font-style:normal}' +
      '#rarebox .rn{display:inline-block;padding:0 8px;border-radius:999px;font-weight:700;font-size:11.5px;line-height:1.6;color:#fff;border:1px solid rgba(255,255,255,.35);white-space:nowrap}' +
      '#rarebox .rs{display:flex;gap:4px;margin-top:9px}#rarebox .rs span{flex:1;min-width:0;text-align:center;font:700 8.5px system-ui,sans-serif;letter-spacing:.04em;text-transform:uppercase;color:#8fb2d6;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}#rarebox .rs span:before{content:"";display:block;height:5px;border-radius:3px;background:rgba(207,232,255,.18);margin-bottom:3px}#rarebox .rs .dn{color:#bfe9d9}#rarebox .rs .dn:before{background:#33d6a6}#rarebox .rs .on{color:#f6d365}#rarebox .rs .on:before{background:linear-gradient(90deg,#f6d365 var(--p),rgba(207,232,255,.18) var(--p))}' +
      '#rarebox .rnow{margin-top:5px;font-size:12px;color:#dcecff}#rarebox .rnow b{font-size:12.5px;color:#f6d365}' +
      '#rarebox .rrow.idle{cursor:default}#rarebox .rrow.idle:hover{background:rgba(7,18,31,.38);border-color:rgba(207,232,255,.12)}#rarebox .rrow.idle .ric{opacity:.75}#rarebox .rrow.ask .ric{border-color:rgba(246,211,101,.7);color:#f6d365;animation:rpulse 1.2s ease-in-out infinite}#rarebox .rtag.wait{background:rgba(207,232,255,.1);border-color:rgba(207,232,255,.35);color:#dcecff}@keyframes rpulse{50%{opacity:.45}}' +
      '#rarebox .rnone{font-size:12px;color:#b9cde2;margin:8px 2px 0;line-height:1.45}' +
      '#rarebox{scrollbar-color:rgba(207,232,255,.35) transparent}#rarebox::-webkit-scrollbar{width:6px}#rarebox::-webkit-scrollbar-track{background:transparent}#rarebox::-webkit-scrollbar-thumb{background:rgba(207,232,255,.3);border-radius:3px}' +
      '#rarebox .tabs2{display:flex;gap:4px;margin:8px 0 2px}#rarebox .tabs2 span{flex:1;text-align:center;padding:6px 2px;border-radius:10px;cursor:pointer;white-space:nowrap;font:700 10.5px system-ui,sans-serif;color:#b9cde2;background:rgba(7,18,31,.4);border:1px solid rgba(207,232,255,.14)}#rarebox .tabs2 span.on{color:#14202e;background:#f6d365;border-color:#f6d365}#rarebox .tabs2 span i{font-style:normal;opacity:.75;margin-left:3px}#rarebox .tabs2 span.bad:not(.on){border-color:#ff5d7a;color:#ffd3dc}#rarebox .tabs2 span.new:not(.on){border-color:#f6d365;color:#ffe9a8}' +
      '#rarebox .rmore{margin-top:8px;padding-top:8px;border-top:1px solid rgba(207,232,255,.16);font-size:12px;color:#dcecff}#rarebox .rmore img{display:block;width:120px;height:120px;margin:0 auto 6px}#rarebox .rmore ul{margin:4px 0 0;padding:0;list-style:none}#rarebox .rmore li{padding:2px 0 2px 14px;position:relative;color:#ffe9a8;font-weight:600}#rarebox .rmore li:before{content:"\\25C6";position:absolute;left:0;font-size:8px;top:6px}' +
      '#rarebox.flash{animation:rareflash 1.4s ease-out 2}@keyframes rareflash{0%{box-shadow:0 0 0 0 rgba(246,211,101,.9)}100%{box-shadow:0 0 0 22px rgba(246,211,101,0)}}' +
      '@media (max-width:720px){#rarebox{top:auto;bottom:150px;left:7px;transform:none;max-height:30vh}}@media (max-height:560px){#rarebox{display:none}}';
    document.head.appendChild(st);
    box = document.createElement('div'); box.id = 'rarebox'; box.className = 'glass hide';
    (document.getElementById('ui') || document.body).appendChild(box);
    box.addEventListener('click', function (e) {
      { let a = e.target; while (a && a !== box && !(a.dataset && a.dataset.act)) a = a.parentNode; if (a && a !== box) { const fn = H.acts[a.dataset.act]; if (G.sfx) G.sfx('click'); if (fn) { try { fn(a.dataset.arg, a); } catch (er) { console.error(er); } } sig = ''; setTimeout(draw, 0); return; } }
      let n = e.target; while (n && n !== box && !(n.dataset && n.dataset.go)) n = n.parentNode;
      { let k = e.target; while (k && k !== box && !(k.classList && k.classList.contains('rk'))) k = k.parentNode; if (k && k !== box) { shut = !shut; sig = ''; if (G.sfx) G.sfx('click'); draw(); return; } }
      { let k = e.target; while (k && k !== box && !(k.dataset && k.dataset.tab)) k = k.parentNode; if (k && k !== box) { tab = k.dataset.tab; sig = ''; if (G.sfx) G.sfx('click'); draw(); return; } }
      if (!n || n === box) return;
      const W = G.W, go = n.dataset.go;
      open = open === go ? '' : go; sig = ''; setTimeout(draw, 0);
      if (G.sfx) G.sfx('click');
      if (go === 'deed') { if (W.deed) G.focusOn(W.deed.x, W.deed.y, 1.6); return; }
      if (go.charAt(0) === 'w') { const w = (W.works || [])[+go.slice(1)]; if (w) G.focusOn(w.x, w.y, 1.6); return; }
      if (go.charAt(0) === 'p') { const p = (W.deedPast || [])[+go.slice(1)]; if (p) G.focusOn(p.x, p.y, 1.4); return; }
      const id = +go.slice(1), L = W.cre.filter(function (c) { return !c.dead && c.g.mv === id; }).sort(function (a, b) { return G.charmOf(b) - G.charmOf(a); });
      if (L[0]) { if (G.select) G.select(L[0]); G.focusOn(L[0].x, L[0].y, 2.4); }
    });
    return box;
  }
  const SHORT = { gather: 'gather', circle: 'council', line: 'form up', carry: 'fetch', build: 'build', charge: 'charge', guard: 'guard', scatter: 'set off', board: 'board', countdown: 'count', liftoff: 'lift off' };
  const STEP = { gather: 'gathering', circle: 'in council', line: 'forming up', carry: 'fetching and carrying', build: 'building', charge: 'charging', guard: 'standing guard', scatter: 'setting off', board: 'going aboard', countdown: 'counting down', liftoff: 'lifting off' };
  // a kind's name is a made-up word: it is set apart in its own colour, so it is not read as English
  const chip = function (name, hue) { return '<span class="rn" style="background:' + G.hsl(hue === undefined ? 200 : hue, 55, 34, 0.9) + '">' + esc(name) + '</span>'; };
  const names = function (text) { let s = esc(text); const Sp = (G.W.species || []).filter(function (q) { return !q.extinct && q.name; }).sort(function (a, b) { return b.name.length - a.name.length; }); for (let i = 0; i < Sp.length; i++) { const nm = esc(Sp[i].name), last = nm.split(' ').pop(), first = nm.split(' ')[0]; [nm + 's', nm, first + 's', first, last + 's'].some(function (w) { const k = s.indexOf(w); if (w.length < 4 || k < 0 || s.lastIndexOf('<span', k) > s.lastIndexOf('</span>', k)) return false; s = s.slice(0, k) + chip(w, Sp[i].hue) + s.slice(k + w.length); return true; }); } return s; };
  const cap = function (s) { s = String(s || ''); return s.charAt(0).toUpperCase() + s.slice(1).replace(/\.$/, '') + '.'; };
  const plan = function (p, now) { return '<div class="rl"><i>WHO</i><span>' + chip(p.kind, p.hue) + '</span>' + (p.what ? '<i>WHAT</i><span>' + names('They ' + (now ? 'want to ' : 'set out to ') + p.what.replace(/\.$/, '') + '.') + '</span><i>WHY</i><span>' + names(cap(p.why)) + '</span>' : '<i>WHAT</i><span>' + names(p.say) + '</span>') + (now || '') + '</div>'; };
  /** the NOW button in the bottom menu, with its badge */
  function button() {
    if (btn && btn.parentNode) return btn; const tb = document.getElementById('toolbar'); if (!tb) return null;
    btn = document.createElement('button'); btn.id = 'tb-now'; btn.className = 'btn'; btn.setAttribute('aria-label', 'now'); btn.title = 'What is happening in the pond now: plans, marvels, ships, strangers, dangers';
    btn.innerHTML = ((G.ICON && G.ICON.wave) || '') + '<span class="lab">NOW</span><b class="tbadge"></b>'; tb.insertBefore(btn, tb.firstChild);
    btn.onclick = function () { if (G.mode !== 'play') return; if (G.sfx) G.sfx('click'); shut = !shut; sig = ''; draw(); };
    return btn;
  }
  function badge(n, bad) { const b = button(); if (!b) return; const e = b.lastChild, t = n ? String(n) : (bad ? '!' : ''); if (e.textContent !== t) e.textContent = t; e.classList.toggle('bad', !!bad); b.classList.toggle('on', !shut); b.classList.toggle('pulse', !!(n || bad) && shut); }
  function draw() {
    ui();
    const W = G.W, on = G.mode === 'play' && W && !W.title;
    if (!on) { box.classList.add('hide'); sig = ''; if (btn) badge(0, false); return; }
    const by = {}, order = [];
    for (let i = 0; i < W.cre.length; i++) { const c = W.cre[i], mv = c.ph && c.ph.mv; if (!mv || c.dead) continue; if (!by[mv.id]) { by[mv.id] = { d: mv, n: 0 }; order.push(mv.id); } by[mv.id].n++; }
    const d = W.deed, dn = d ? W.cre.filter(function (c) { return c.deedId === d.id && !c.dead; }).length : 0;
    const Wk = W.works || [], Pa = W.deedPast || [];
    const s2 = order.map(function (id) { return id + ':' + by[id].n; }).join(',') + '|' + (d ? d.id + ':' + d.i + ':' + dn + ':' + Math.round(d.progress * 20) + ':' + Math.round((d.steps[d.i].secs - d.t) / 2) : '') + '|' + Wk.map(function (w) { return w.name + (w.fig ? 1 : 0); }).join(',') + '|' + Pa.length + ':' + (Pa.length ? Pa[Pa.length - 1].gen : 0);
    const bo = (G.ai.over ? '' + G.ai.over('deed') + G.ai.over('marvel') : '') + (d ? '' : (G.deedAsking && G.deedAsking() ? 'a' : '') + W.gen + (G.speed > 16 ? 'f' : ''));
    // what the other parts of the game have to say (voyages, society, dangers)
    const parts = H.parts.map(function (f) { try { return f(W) || {}; } catch (e) { console.error(e); return {}; } }), cat = function (k) { let out = []; for (let i = 0; i < parts.length; i++) if (parts[i][k]) out = out.concat(parts[i][k]); return out; };
    const news = cat('news').concat(order.map(function (id) { return 'm' + id; }), d ? ['d' + d.id] : []), alarms = cat('alarm'), fresh0 = news.filter(function (k) { return !seen[k]; }).length, red = alarms.some(function (k) { return !seen[k]; });
    badge(shut ? fresh0 + alarms.filter(function (k) { return !seen[k]; }).length : 0, shut && red);
    if (shut) { box.classList.add('hide'); sig = ''; return; }
    news.concat(alarms).forEach(function (k) { seen[k] = 1; });
    box.classList.remove('hide'); box.classList.remove('shut');
    // it stands above the bottom menu, beside the zoom buttons, and may be as tall as the room up to the season card
    { const tb = document.getElementById('toolbar'), se = document.getElementById('season'), top = se && !se.classList.contains('hide') ? se.getBoundingClientRect().bottom + 10 : 14, bot = tb ? tb.getBoundingClientRect().top - 10 : window.innerHeight - 90;
      if (window.innerWidth > 720) { box.style.top = 'auto'; box.style.bottom = Math.round(window.innerHeight - bot) + 'px'; box.style.left = '78px'; box.style.transform = 'none'; box.style.maxHeight = Math.max(170, Math.round(bot - top)) + 'px'; } else { box.style.top = ''; box.style.bottom = ''; box.style.left = ''; box.style.transform = ''; box.style.maxHeight = ''; } }
    box.style.zIndex = '9';
    const ps = parts.map(function (p) { return p.sig || ''; }).join('~');
    if (s2 + tab + open + bo + ps === sig) return; sig = s2 + tab + open + bo + ps;
    const dang = cat('dangers'), ppl = cat('people');
    let fresh = false, h = '<div class="rk" title="Close"><span>In the pond now</span><span class="rc"><u>\u2715</u></span></div>';
    { const T = [['now', 'Now', ''], ['plans', 'Plans', (d ? 1 : 0) + Wk.length || ''], ['marvels', 'Marvels', order.length || ''], ['people', 'People', ''], ['dangers', 'Dangers', dang.length || '']];
      h += '<div class="tabs2">' + T.map(function (q) { return '<span data-tab="' + q[0] + '" class="' + (tab === q[0] ? 'on' : '') + (q[0] === 'dangers' && dang.length ? ' bad' : '') + '">' + q[1] + (q[2] ? '<i>' + q[2] + '</i>' : '') + '</span>'; }).join('') + '</div>'; }
    const Mv = tab === 'marvels', Nw = tab === 'now';
    const P = tab === 'plans';
    if (Nw) h += cat('alarmRows').join('');
    if (d && (P || Nw)) { const st = d.steps[d.i];
      h += '<div class="rh">Happening now</div><div class="rrow live" data-go="deed"><span class="ric">⚑</span><span style="flex:1;min-width:0"><span class="rt"><b>' + esc(d.title) + '</b><span class="rtag">a plan</span></span>' + plan(d, ' ') +
        '<div class="rs">' + d.steps.map(function (q, i) { return '<span class="' + (i < d.i ? 'dn' : i === d.i ? 'on' : '') + '"' + (i === d.i ? ' style="--p:' + Math.round(100 * Math.min(1, d.t / q.secs)) + '%"' : '') + '>' + (SHORT[q.do] || q.do) + '</span>'; }).join('') + '</div>' +
        '<div class="rnow"><b>' + cap(STEP[st.do] || st.do).slice(0, -1) + (st.do === 'build' ? ' ' + Math.round(d.progress * 100) + '%' : '') + '</b> · ' + dn + ' of them · about ' + Math.max(1, Math.ceil(d.steps.slice(d.i).reduce(function (a, q) { return a + q.secs; }, 0) - d.t)) + ' s to go</div></span></div>'; }
    for (let i = 0; i < order.length; i++) if (!seen['m' + order[i]]) { seen['m' + order[i]] = 1; fresh = true; }
    for (let i = 0; i < order.length && (Mv || Nw); i++) { const q = by[order[i]], m = q.d; if (Nw) { h += H.row({ icon: (G.marvelPic && G.marvelPic(m, 34)) || '\u2605', title: m.name, tag: 'a marvel \u00b7 ' + q.n + (q.n === 1 ? ' carries it' : ' carry it'), sub: esc(m.wonder || ''), act: 'marvel', arg: m.id }); continue; } if (!seen['m' + m.id]) { seen['m' + m.id] = 1; fresh = true; }
      h += '<div class="rrow" data-go="m' + m.id + '"><span class="ric">' + ((G.marvelPic && G.marvelPic(m, 34)) || '★') + '</span><span style="flex:1;min-width:0"><span class="rt"><b>' + esc(m.name) + '</b><span class="rtag">' + q.n + (q.n === 1 ? ' carries it' : ' carry it') + '</span>' + (m.words && m.words.length ? '<span class="rtag">talks</span>' : '') + '</span><div class="rsub">' + esc(m.wonder) + '</div>' + (open === 'm' + m.id ? '<div class="rmore">' + (G.marvelDoes(m).length ? '<ul>' + G.marvelDoes(m).map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' : '') + (m.why ? '<div style="margin-top:5px;font-style:italic;opacity:.8">' + esc(m.why) + '</div>' : '') + '</div>' : '') + '</span></div>'; }
    if (P && !d) {
      const from = G.DEED_FROM || 5, last = W.lastDeedGen, off = G.ai.over && G.ai.provider === 'server' && G.ai.over('deed'), ask = G.deedAsking && G.deedAsking();
      let big, small, cls = 'idle';
      if (ask) { big = 'A kind is making up its mind'; small = 'A new plan is being thought up right now. It starts here in a moment.'; cls = 'ask'; }
      else if (off) { big = 'No new plans'; small = 'The budget for plans in this pond is used up. Raise it in the costs window to get plans again.'; cls = 'off'; }
      else if (W.gen < from) { big = 'No plan yet'; small = 'Plans start at generation ' + from + ' (now ' + W.gen + '). Then a kind of creature may decide to do something together: build, march, meet.'; }
      else if (G.speed > 16) { big = 'No plan under way just now'; small = 'No plan starts while time runs this fast, because it could not be watched. Slow down to get plans.'; }
      else { const od = G.deedOdds ? G.deedOdds() : 0.125; big = 'No plan under way just now'; small = 'One can start when any generation ends: about 1 chance in ' + Math.max(2, Math.round(1 / od)) + ' now. Bigger brains and bodies plan together more often.' + (last !== undefined && Pa.length ? ' The last one began in generation ' + last + ', ' + (W.gen - last) + (W.gen - last === 1 ? ' generation' : ' generations') + ' ago.' : ''); }
      h += '<div class="rnone"' + (cls === 'off' ? ' style="color:#ff9db0"' : '') + '>' + big + '. ' + small + '</div>';
    }
    if (Wk.length && P) h += '<div class="rh">They built · ' + Wk.length + '</div>';
    for (let i = Wk.length - 1; i >= 0 && P; i--) { const w = Wk[i], pic = w.fig && G.figurePic && G.figurePic(w.name), fl = (W.fields || []).filter(function (f) { return f.id === w.field; })[0];
      h += '<div class="rrow" data-go="w' + i + '"><span class="ric">' + (w.fig && G.figurePic && G.figurePic(w.name) ? '<img alt="" src="data:image/svg+xml;charset=utf-8,' + encodeURIComponent(G.figurePic(w.name)) + '">' : '▲') + '</span><span style="flex:1;min-width:0"><span class="rt"><b>' + esc(w.name) + '</b>' + chip(w.by, w.hue) + '</span><div class="rsub">' + esc(cap(w.looks)) + '</div>' + (open === 'w' + i ? '<div class="rmore">' + (pic ? '<img alt="" src="data:image/svg+xml;charset=utf-8,' + encodeURIComponent(pic) + '">' : '<div style="opacity:.7">Its picture is still being drawn.</div>') + '<div class="rl" style="margin-top:0">' + (w.what ? '<i>HOW</i><span>' + names('They set out to ' + String(w.what).replace(/\.$/, '') + '.') + '</span><i>WHY</i><span>' + names(cap(w.why)) + '</span>' : '') + '<i>DOES</i><span>' + esc(fl && G.fieldWords ? (G.fieldWords(fl) || 'It simply stands there.') : 'It simply stands there.') + (fl ? ' It does not harm its builders.' : '') + '</span><i>LASTS</i><span>' + Math.max(0, Math.round(w.until - W.t)) + ' more seconds of pond time' + (w.gen ? ' · built in generation ' + w.gen : '') + '</span></div></div>' : '') + '</span></div>'; }
    if (Pa.length && P) { const dn = Pa.filter(function (p) { return p.how === 'done'; }).length; h += '<div class="rh">Finished plans · ' + dn + ' done' + (Pa.length - dn ? ', ' + (Pa.length - dn) + ' given up' : '') + (Pa.length > 3 ? ' · latest 3' : '') + '</div>'; }
    for (let i = Pa.length - 1; i >= 0 && i >= Pa.length - 3 && P; i--) { const p = Pa[i];
      h += '<div class="rrow old" data-go="p' + i + '"><span class="ric">' + (p.how === 'done' ? '✓' : '✕') + '</span><span style="flex:1;min-width:0"><span class="rt"><b>' + esc(p.title) + '</b><span class="rtag' + (p.how === 'done' ? '' : ' no') + '">' + (p.how === 'done' ? 'done' : 'gave up') + ' · gen ' + p.gen + '</span></span><div class="rsub">' + chip(p.kind, p.hue) + ' ' + (p.what ? names('set out to ' + p.what.replace(/\.$/, '') + '.') : names(p.say)) + '</div></span></div>'; }
    if (G.ai.over && G.ai.provider === 'server') { if (P && G.ai.over('deed') && d) h += '<div class="rnone" style="color:#ff9db0">New plans are OFF: their budget for this pond is used up.</div>'; if (Mv && G.ai.over('marvel')) h += '<div class="rnone" style="color:#ff9db0">New marvels are OFF: their budget for this pond is used up.</div>'; }
    if (Nw) { const N = cat('now'); h += N.join(''); if (!N.length && !d && !order.length && !cat('alarmRows').length) h += '<div class="rnone">The pond is quiet just now: no plan under way, no marvel alive, nothing dangerous in it. What matters will show here as it happens.</div>'; }
    if (tab === 'people') h += ppl.join('') || '<div class="rnone">No kind is settled enough yet to say what its people are like.</div>';
    if (tab === 'dangers') h += dang.length ? '<div class="rnone" style="margin-bottom:2px">Harmful things you or events put in the pond, and how far the creatures have got in beating each one.</div>' + dang.join('') : '<div class="rnone">Nothing harmful is in the pond just now.</div>';
    if (Mv && !order.length) h += '<div class="rnone">No marvel alive just now. Once in many generations a creature is born with a rare gift. It shows here, and a click takes you to it.</div>';
    box.innerHTML = h;
    if (fresh) { box.classList.remove('flash'); void box.offsetWidth; box.classList.add('flash'); }
  }
  setInterval(function () { try { draw(); } catch (e) { console.error(e); } }, 800);
  H.act('marvel', function (id) { const W = G.W, L = W.cre.filter(function (c) { return !c.dead && c.g.mv === +id; }).sort(function (a, b) { return G.charmOf(b) - G.charmOf(a); }); if (L[0]) { if (G.select) G.select(L[0]); G.focusOn(L[0].x, L[0].y, 2.4); } });
  H.act('cre', function (id) { const c = G.W.cre.filter(function (q) { return q.id === +id && !q.dead; })[0]; if (c) { if (G.select) G.select(c); G.focusOn(c.x, c.y, 1.8); } });
  // NOW is one of the menu's buttons: the old way of asking for it goes there too
  setTimeout(function () { if (!G.act) return; const a0 = G.act; G.act = function (name) { if (name === 'now') { if (G.mode !== 'play') return; shut = !shut; sig = ''; draw(); return; } return a0(name); }; }, 0);
  G.on('new-pond', function () { seen = {}; sig = ''; });
  G.on('marvel-icon', function () { sig = ''; });
})();
