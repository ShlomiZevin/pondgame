// ── The command screen: how you run your colony ──
// The engine of the colony is in 54i_colony.js. This is what you see and touch:
//     the STORE BAR (top)       what is in the store: stone, reed, shell, lumen; and how many live on your star
//     the COLONY PANEL (left)   the trades (how many of each you have, and how many you want: − and +), and what can be built
//     CHOOSING                  click one, or drag a box round many; click a trade's name to choose everyone of that trade
//     ORDERS                    right-click the star: those you chose go there. On an enemy: attack it. On something lying about, or on lumen:
//                               gather it. On a building: guard it. (No right button? SEND, then click.)
//     the CHOSEN BAR (bottom)   who you have chosen, and the trades you can give them
//     on the star itself        rings under the chosen, a small mark of its trade over every worker, what the gatherers carry, the lumen, the
//                               store beside the Heart, where things are to be built, where the fighters rally, and red rings under enemies
// The view: the left button now chooses, so the view is moved with the right (or middle) button, or with W A S D and the arrow keys.
(function () {
  'use strict';
  if (typeof document === 'undefined' || !G.JOBS) return;
  const $ = function (id) { return document.getElementById(id); };
  const esc = function (s) { return String(s === undefined || s === null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  const JOBS = G.JOBS, ORDER = ['g', 'b', 'f', 'u'], COL = { g: '#f2c14e', b: '#ff9a4c', f: '#ff5d73', u: '#5db8ff', '': '#9fb6c6' }, RGB = { g: '242,193,78', b: '255,154,76', f: '255,93,115', u: '93,184,255', move: '120,240,190' };
  const BUILD = ['house', 'hall', 'huts', 'wall', 'tower', 'port', 'ship'];
  const C = G.cmd = { sel: [], placing: null, send: false };
  const FX = [], ZAP = [], POP = [];
  let sig = '', lastT = 0, tip = '', tipUntil = 0, folded = false, lastClick = { id: 0, t: 0 };
  try { folded = localStorage.getItem('primordia.cmdFold') === '1'; } catch (e) { /* no storage: it stays open */ }

  const now = function () { return performance.now(); };
  /** is there a colony to command on what is being shown? (your own star, in play, not out in space) */
  const live = function () { const W = G.W; return !!(W && G.mode === 'play' && !W.title && !W.extinct && !W.farOf && !(G.far && G.far.there && G.far.there()) && !(G.pondAsleep && G.pondAsleep())); };
  const mine = function (c) { return c && !c.dead && !c.team && !c.inShip && G.W.cre.indexOf(c) >= 0; };
  const pos = function (c) { return { x: c.rx === undefined ? c.x : c.rx, y: c.ry === undefined ? c.y : c.ry }; };
  const say = function (s, secs) { tip = s; tipUntil = now() + (secs || 5) * 1000; sig = ''; };

  /** is the player in the middle of commanding? (then nothing else takes the view or the card from them) */
  let lastAct = 0;
  C.busy = function () { const W = G.W; return live() && (C.sel.length > 0 || !!C.placing || C.send || !!G.ui.box || now() - lastAct < 25000 || !!(W.col && W.col.raid && W.col.raid.state !== 'warn')); };
  const acted = function () { lastAct = now(); };

  // ── choosing ──
  C.boxOk = function () { return live() && !G.isBlocked() && !C.placing; };
  C.set = function (list, add) { acted(); const s = add ? C.sel.filter(mine) : []; (list || []).forEach(function (c) { if (mine(c) && s.indexOf(c) < 0) s.push(c); }); C.sel = s; sig = ''; };
  C.clear = function () { C.sel = []; C.send = false; sig = ''; };
  C.all = function (job) { const W = G.W; if (!W) return; C.set(W.cre.filter(function (c) { return mine(c) && (job === '' ? !c.job : c.job === job); })); if (C.sel.length !== 1) G.select(null); if (!C.sel.length) say('Nobody has that trade yet. Press + to ask for some.'); };
  C.escape = function () { if (C.placing) { C.placing = null; sig = ''; return true; } if (C.send) { C.send = false; sig = ''; return true; } if (C.sel.length > 1 || (C.sel.length === 1 && !G.R.sel)) { C.clear(); return true; } return false; };
  G.on('box-select', function (b, add) {
    if (!live()) return; const W = G.W, got = [];
    for (let i = 0; i < W.cre.length; i++) { const c = W.cre[i]; if (!mine(c)) continue; const p = pos(c); if (p.x >= b.x0 && p.x <= b.x1 && p.y >= b.y0 && p.y <= b.y1) got.push(c); }
    C.set(got, add); if (G.selectThing) G.selectThing(null); G.selectZone(null); G.select(C.sel.length === 1 ? C.sel[0] : null);
  });
  // a click that chose one creature chooses it for orders too (twice quickly: everyone in sight of the same trade)
  G.on('pond-click', function (c) {
    if (!live() || G.isBlocked()) return; const s = G.R.sel, t = now();
    if (s && mine(s)) { if (lastClick.id === s.id && t - lastClick.t < 420) { const v = G.view, x0 = -v.ox / v.scale, y0 = -v.oy / v.scale, x1 = x0 + v.w / v.scale, y1 = y0 + v.h / v.scale; C.set(G.W.cre.filter(function (o) { return mine(o) && (o.job || '') === (s.job || '') && o.x >= x0 && o.x <= x1 && o.y >= y0 && o.y <= y1; })); if (C.sel.length > 1) G.select(null); }
      else C.set([s], c.shift); lastClick = { id: s.id, t: t }; }
    else if (!c.shift) C.clear();
  });
  G.on('new-pond', function () { C.sel = []; C.placing = null; C.send = false; FX.length = 0; sig = ''; });

  // ── orders ──
  function near(list, x, y, R, ok) { let best = null, bd = R * R; for (let i = 0; i < list.length; i++) { const o = list[i]; if (ok && !ok(o)) continue; const d = (o.x - x) * (o.x - x) + (o.y - y) * (o.y - y); if (d < bd) { bd = d; best = o; } } return best; }
  function orderAt(p) {
    const W = G.W; C.sel = C.sel.filter(mine); if (!C.sel.length) return false;
    const R = Math.max(20, 22 / G.view.scale), foe = near(W.cre, p.x, p.y, R + 14, function (o) { return o.team && !o.dead && !o.inShip; }), node = near(G.lumenNodes(W), p.x, p.y, 50, function (q) { return q.n > 0; }), mat = near(W.mats || [], p.x, p.y, R),
      hit = G.thingAt ? G.thingAt(p.x, p.y) : null, work = hit && hit.k === 'work' && hit.o.bp ? hit.o : null, n = C.sel.length, who = n === 1 ? 'It' : 'All ' + n, soldiers = C.sel.some(function (c) { return c.job === 'f' || c.job === 'u'; });
    let o, col, words;
    if (foe) { o = { x: foe.x, y: foe.y, foe: foe }; col = RGB.f; words = who + (n === 1 ? ' goes' : ' go') + ' for the enemy.'; }
    else if (node) { o = { x: node.x, y: node.y, mat: 3 }; col = '120,235,255'; words = who + (n === 1 ? ' is' : ' are') + ' to gather lumen here.'; }
    else if (mat) { o = { x: mat.x, y: mat.y, mat: mat.k }; col = RGB.g; words = who + (n === 1 ? ' is' : ' are') + ' to gather ' + G.RES[mat.k] + ' round here.'; }
    else if (work && soldiers) { o = { x: work.x, y: work.y, work: work }; col = RGB.u; words = 'The fighters and guards among them are to guard the ' + work.name + '.'; }
    else { o = { x: p.x, y: p.y }; col = soldiers ? RGB.f : RGB.move; words = C.sel.every(function (c) { return c.job === 'f'; }) ? (n === 1 ? 'Its' : 'Their') + ' post is here now.' : C.sel.every(function (c) { return c.job === 'g'; }) ? 'They gather round here now.' : who + (n === 1 ? ' goes' : ' go') + ' there.'; }
    const cant = C.sel.filter(function (c) { return !G.canReach(W, c, o.y); }).length;
    acted(); G.order(C.sel, o); FX.push({ x: o.x, y: o.y, t0: now(), col: col, from: C.sel.map(pos) });
    say(words + (cant ? ' (' + (cant === n ? (n === 1 ? 'It is' : 'They are') : cant === 1 ? 'One of them is' : cant + ' of them are') + ' of the ' + (C.sel.filter(function (c) { return !G.canReach(W, c, o.y); })[0].ph.home ? 'land' : 'water') + ': as near as ' + (cant === 1 ? 'it' : 'they') + ' can come.)' : ''), 6);
    if (G.sfx) G.sfx('click'); return true;
  }
  G.on('pond-order', function (p) { if (!live() || G.isBlocked()) return; if (C.placing) { C.placing = null; sig = ''; return; } if (!orderAt(p)) say('Choose some of your creatures first: click one, or drag a box round several.'); });
  /** a left click that is not a choice: a place for what is being built, or (after SEND) where the chosen are to go */
  C.takeClick = function (p) {
    if (!live()) return false;
    if (C.placing) { const r = G.buildOrder(C.placing, p.x, p.y); if (r && r.error) { say(r.error, 5); return true; } say(r ? r.name + ' is ordered. Your builders will raise it' + (G.jobCount().b < 2 ? ' (you need two builders at least: they are being named now)' : '') + '.' : '', 6); if (!p.shift) C.placing = null; sig = ''; return true; }
    if (C.send) { C.send = false; sig = ''; orderAt(p); return true; }
    return false;
  };
  C.job = function (job) { C.sel = C.sel.filter(mine); if (!C.sel.length) return; G.assign(C.sel, job); say(C.sel.length === 1 ? 'It is ' + (job ? 'a ' + JOBS[job].name.toLowerCase() : 'free') + ' now.' : 'All ' + C.sel.length + ' are ' + (job ? JOBS[job].many : 'free') + ' now.' + (job ? ' Their children will be too.' : ''), 5); sig = ''; if (G.R.sel && G.refreshCard) G.refreshCard(); };
  C.want = function (job, d) { const W = G.W; if (!W) return; acted(); const col = G.colony(W), n = G.jobCount(W); col.want[job] = G.clamp((col.want[job] | 0) + d, 0, Math.max(0, n.all - 2)); if (d < 0) W.cre.forEach(function (c) { if (c.job === job) c.pin = false; }); sig = ''; if (G.markDirty) G.markDirty(); };
  C.build = function (type) {
    const K = G.BUILDABLE[type]; if (!K || !live()) return; acted();
    if (type === 'ship') { const r = G.buildOrder('ship', 0, 0); say(r && r.error ? r.error : 'A starship is ordered. Your builders will raise it on the spaceport.', 6); sig = ''; return; }
    C.placing = C.placing === type ? null : type; C.send = false; sig = ''; if (C.placing) say(K.name + ': click the place for it' + (type === 'port' ? ' (on land).' : '. Under water or on land.') + ' Right-click to let it be.', 9);
  };

  // ── the look of it ──
  const css = '#resbar{position:fixed;left:50%;top:14px;transform:translateX(-50%);display:flex;gap:4px;align-items:center;padding:5px 12px;border-radius:999px;z-index:3;white-space:nowrap;font:700 13px system-ui,sans-serif;color:#e8f4ff}' +
    '#resbar .r{display:flex;align-items:center;gap:5px;padding:2px 8px;border-radius:999px}#resbar .r img{width:20px;height:20px}#resbar .r small{font:600 10px system-ui;letter-spacing:.08em;color:rgba(207,232,255,.6);text-transform:uppercase}#resbar .r.lum{color:#8ef0ff}#resbar .r.up b{color:#9dffcf}#resbar .sep{width:1px;height:18px;background:rgba(207,232,255,.2);margin:0 4px}' +
    '#resbar .r.bad{color:#ff9db0;animation:cmdPulse 1s ease-in-out infinite}@keyframes cmdPulse{50%{opacity:.55}}' +
    '#cmd{position:fixed;left:14px;top:218px;width:236px;padding:9px 10px 10px;z-index:2;font:12px system-ui,sans-serif;color:#dcecf8;user-select:none}' +
    '#cmd .ch{display:flex;align-items:center;justify-content:space-between;cursor:pointer}#cmd .ch b{font-size:12px;letter-spacing:.2em;color:#f6d365;text-shadow:0 0 10px rgba(246,211,101,.5)}#cmd .ch span{font-size:16px;line-height:14px;color:rgba(207,232,255,.7);padding:0 4px}' +
    '#cmd.fold .cb{display:none}#cmd.fold{width:auto}' +
    '#cmd .csec{margin:9px 0 4px;font:700 10px system-ui;letter-spacing:.16em;color:rgba(207,232,255,.6);display:flex;justify-content:space-between;align-items:center}#cmd .csec small{font:600 9.5px system-ui;letter-spacing:.04em;text-transform:none;color:rgba(207,232,255,.5)}' +
    '#cmd .crow{display:flex;align-items:center;gap:6px;height:28px;border-radius:8px;padding:0 4px}#cmd .crow:hover{background:rgba(207,232,255,.07)}#cmd .crow i{width:10px;height:10px;border-radius:50%;flex:none;border:1.5px solid #14202e}' +
    '#cmd .crow .nm{flex:1;font-weight:700;cursor:pointer;white-space:nowrap}#cmd .crow .nm:hover{text-decoration:underline}#cmd .crow .cn{width:26px;text-align:right;font-weight:800;font-size:13px}#cmd .crow .cw{width:22px;text-align:center;color:rgba(207,232,255,.75);font-weight:700}#cmd .crow .cn.low{color:#ffb86b}' +
    '#cmd .crow button{appearance:none;width:24px;height:24px;border-radius:7px;border:1px solid rgba(207,232,255,.28);background:rgba(7,18,31,.5);color:#e8f4ff;font:800 14px system-ui;line-height:1;cursor:pointer;padding:0}#cmd .crow button:hover{border-color:#33d6a6;box-shadow:inset 0 0 10px rgba(51,214,166,.35)}' +
    '#cmd .cgrid{display:grid;grid-template-columns:repeat(4,1fr);gap:5px}#cmd .cgrid button{appearance:none;border:1px solid rgba(207,232,255,.24);background:rgba(7,18,31,.45);border-radius:9px;padding:3px 0 4px;cursor:pointer;color:#dcecf8;font:700 9.5px system-ui;letter-spacing:.03em;display:flex;flex-direction:column;align-items:center;gap:1px;min-width:0}' +
    '#cmd .cgrid button img{width:38px;height:38px;display:block}#cmd .cgrid button:hover{border-color:#33d6a6;box-shadow:inset 0 0 12px rgba(51,214,166,.3)}#cmd .cgrid button.on{border-color:#f6d365;box-shadow:inset 0 0 14px rgba(246,211,101,.4)}#cmd .cgrid button.no{opacity:.42}' +
    '#cmd .cq{margin-top:6px;height:40px;overflow:hidden;font-size:11px;line-height:1.35;color:rgba(207,232,255,.85)}#cmd .cq div{display:flex;justify-content:space-between;gap:6px;white-space:nowrap}#cmd .cq div span{overflow:hidden;text-overflow:ellipsis}#cmd .cq a{color:#ff9db0;cursor:pointer;font-weight:800;padding:0 4px}' +
    '#cmd .ctip{margin-top:6px;height:44px;overflow:hidden;font-size:11px;line-height:1.3;color:#ffe9a8}#cmd .ctip.dim{color:rgba(207,232,255,.55)}' +
    '#cmd label{display:flex;align-items:center;gap:4px;cursor:pointer;font:600 9.5px system-ui;letter-spacing:.02em;text-transform:none;color:rgba(207,232,255,.7)}#cmd label input{margin:0;accent-color:#33d6a6}' +
    'body.cmdOpen #zoom{left:262px}@media (min-width:1100px){body.cmdOpen #rarebox{left:262px}}' +
    '#selbar{position:fixed;bottom:14px;left:660px;z-index:4;padding:8px 12px;border-radius:16px;display:flex;flex-direction:column;gap:5px;max-width:calc(100vw - 690px);font:12px system-ui,sans-serif;color:#dcecf8}#selbar.hide{display:none}' +
    '#selbar .s1{display:flex;align-items:center;gap:6px;flex-wrap:wrap;white-space:nowrap}#selbar .s1 b{font-size:12px;letter-spacing:.14em;color:#9dffcf}#selbar .s1 .what{color:rgba(207,232,255,.85);overflow:hidden;text-overflow:ellipsis;max-width:260px}' +
    '#selbar button{appearance:none;border:1px solid rgba(207,232,255,.28);background:rgba(7,18,31,.5);color:#e8f4ff;border-radius:999px;padding:5px 10px;font:800 10.5px system-ui;letter-spacing:.08em;cursor:pointer;display:flex;align-items:center;gap:5px}#selbar button i{width:8px;height:8px;border-radius:50%;display:inline-block}#selbar button:hover{border-color:#33d6a6}#selbar button.on{border-color:#f6d365;color:#ffe9a8}#selbar button.x{padding:5px 8px}' +
    '#selbar .s2{font-size:10.5px;color:rgba(207,232,255,.6);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
    '@media (max-width:1180px){#selbar{left:14px;bottom:76px;max-width:calc(100vw - 28px)}}@media (max-width:720px){#resbar{top:auto;bottom:70px;font-size:11px;padding:3px 8px}#resbar .r small{display:none}#cmd{top:auto;bottom:112px;left:7px}}';
  const PICS = {}, ICON = {};
  function icon(k) { if (ICON[k]) return ICON[k]; try { const cv = document.createElement('canvas'); cv.width = cv.height = 44; const x = cv.getContext('2d'); x.translate(22, 24); x.scale(2.1, 2.1); x.lineJoin = 'round'; G.matDraw(x, { x: 0, y: 0, k: k, s: 0.37 }, 0); ICON[k] = cv.toDataURL('image/png'); } catch (e) { ICON[k] = ''; } return ICON[k]; }
  function pic(type) { if (PICS[type] !== undefined) return PICS[type]; let url = ''; try { const t = type === 'tower' ? 'spire' : type, W = G.W, sp = W && (W.species || []).filter(function (s) { return !s.extinct; }).sort(function (a, b) { return b.n - a.n; })[0];
      const bp = G.blueprintFrom({ seed: 91 + BUILD.indexOf(type) * 8, type: t, S: t === 'house' ? 50 : t === 'ship' ? 70 : 84, hue: sp ? sp.hue : 190, spiky: 0, brain: 0.7, wet: false }, '22222222222222222222222222222222222222222222222222'); url = G.buildPic({ bp: bp }, 44); } catch (e) { url = ''; } return (PICS[type] = url); }
  G.on('new-pond', function () { for (const k in PICS) delete PICS[k]; });
  let ui = null;
  function build() {
    if (ui) return ui; const root = $('ui') || document.body;
    const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    const res = document.createElement('div'); res.id = 'resbar'; res.className = 'glass';
    res.innerHTML = [0, 1, 2, 3].map(function (k) { return '<span class="r' + (k === 3 ? ' lum' : '') + '" id="res' + k + '" title="' + (k === 3 ? 'Lumen: the rare thing every star wants. It grows as crystals in a few places; gatherers bring it home.' : G.RES[k].charAt(0).toUpperCase() + G.RES[k].slice(1) + ' in the store. Builders build with it; gatherers bring it in.') + '"><img alt="" src="' + icon(k) + '"><b>0</b><small>' + G.RES[k] + '</small></span>'; }).join('') +
      '<span class="sep"></span><span class="r" id="resPop" title="How many live on your star (and how many of them work)"><b>0</b><small>alive</small></span><span class="r bad" id="resFoe" style="display:none;cursor:pointer" title="Enemies on your star: click to see them"><b>0</b><small>enemies</small></span><span class="r warn" id="resRaid" style="display:none"><small style="color:#ffd0a8"></small></span>';
    root.appendChild(res); res.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('#resFoe')) C.seeFoes(); });
    const cmd = document.createElement('div'); cmd.id = 'cmd'; cmd.className = 'glass' + (folded ? ' fold' : '');
    cmd.innerHTML = '<div class="ch" id="cmdHead" title="Fold or unfold"><b>YOUR COLONY</b><span id="cmdFoldMark">' + (folded ? '+' : '–') + '</span></div><div class="cb">' +
      '<div class="csec"><span>TRADES</span><small>have · want</small></div>' +
      ORDER.map(function (k) { return '<div class="crow" data-job="' + k + '" title="' + esc(TIPS[k]) + '"><i style="background:' + COL[k] + '"></i><span class="nm" data-all="' + k + '">' + JOBS[k].name + 's</span><span class="cn" id="cn' + k + '">0</span><button data-want="' + k + '" data-d="-1" aria-label="fewer ' + JOBS[k].many + '">−</button><span class="cw" id="cw' + k + '">0</span><button data-want="' + k + '" data-d="1" aria-label="more ' + JOBS[k].many + '">+</button></div>'; }).join('') +
      '<div class="crow" title="Those with no trade: they live by their own brains, as all of them used to."><i style="background:' + COL[''] + '"></i><span class="nm" data-all="">Free</span><span class="cn" id="cnfree">0</span><span style="width:78px;font-size:10px;color:rgba(207,232,255,.5);text-align:right">no orders</span></div>' +
      '<div class="csec"><span>BUILD</span><label title="When it is on, the kinds of your star also build what they themselves decide on, as they always did."><input type="checkbox" id="cmdAuto">they build too</label></div>' +
      '<div class="cgrid">' + BUILD.map(function (t) { return '<button data-build="' + t + '" title="' + esc(G.BUILDABLE[t].name + ': ' + G.BUILDABLE[t].note) + '"><img alt="" data-pic="' + t + '"><span>' + esc(G.BUILDABLE[t].name) + '</span></button>'; }).join('') + '</div>' +
      '<div class="cq" id="cmdQ"></div><div class="ctip dim" id="cmdTip"></div></div>';
    root.appendChild(cmd);
    cmd.addEventListener('click', function (e) {
      const t = e.target, b = t.closest ? t.closest('[data-want],[data-all],[data-build],[data-cancel],#cmdHead') : null; if (!b) return;
      if (b.id === 'cmdHead') { folded = !folded; cmd.classList.toggle('fold', folded); $('cmdFoldMark').textContent = folded ? '+' : '–'; try { localStorage.setItem('primordia.cmdFold', folded ? '1' : '0'); } catch (e2) { /* not kept */ } sig = ''; return; }
      if (b.dataset.want !== undefined) C.want(b.dataset.want, (+b.dataset.d) * (e.shiftKey ? 5 : 1));
      else if (b.dataset.all !== undefined) C.all(b.dataset.all);
      else if (b.dataset.build) C.build(b.dataset.build);
      else if (b.dataset.cancel) { G.buildCancel(+b.dataset.cancel); sig = ''; }
    });
    cmd.addEventListener('change', function (e) { if (e.target && e.target.id === 'cmdAuto') { G.colony().auto = !!e.target.checked; say(e.target.checked ? 'The kinds of your star build what they decide on too.' : 'Nothing is built now but what you order.', 5); if (G.markDirty) G.markDirty(); } });
    const sel = document.createElement('div'); sel.id = 'selbar'; sel.className = 'glass hide';
    sel.innerHTML = '<div class="s1"><b id="selN"></b><span class="what" id="selWhat"></span>' + ORDER.map(function (k) { return '<button data-job="' + k + '" title="' + esc(TIPS[k]) + '"><i style="background:' + COL[k] + '"></i>' + JOBS[k].name.toUpperCase() + '</button>'; }).join('') + '<button data-job="" title="No trade: it lives by its own brain">FREE</button><button id="selSend" title="Then click the star: they go there (the same as a right-click)">SEND ▸</button><button class="x" id="selX" title="Let them go (Esc)">✕</button></div><div class="s2" id="selHint"></div>';
    root.appendChild(sel);
    sel.addEventListener('click', function (e) { const b = e.target.closest ? e.target.closest('button') : null; if (!b) return; if (b.id === 'selX') { C.clear(); G.select(null); } else if (b.id === 'selSend') { C.send = !C.send; C.placing = null; sig = ''; } else if (b.dataset.job !== undefined) C.job(b.dataset.job); });
    return (ui = { res: res, cmd: cmd, sel: sel });
  }
  const TIPS = { g: 'Gatherers fetch what lies about the star (stone, reed, shell) and lumen, and carry it to the Heart. Click the name to choose them all.', b: 'Builders raise what you order built, from the store and from what lies near. Click the name to choose them all.', f: 'Fighters keep to their rally point, go for any enemy in sight, and attack what you send them against. Click the name to choose them all.', u: 'Guards stand by the place you post them at and do not leave it. Click the name to choose them all.' };

  function refresh() {
    const W = G.W, on = live(); build(); document.body.classList.toggle('cmdOpen', on && !folded);
    ui.res.style.display = on ? '' : 'none'; ui.cmd.style.display = on ? '' : 'none'; if (!on) { ui.sel.classList.add('hide'); return; }
    C.sel = C.sel.filter(mine);
    const col = G.colony(W), n = G.jobCount(W), foes = W.cre.filter(function (c) { return c.team && !c.dead; }).length, hp = G.heartOf(W), hc = hp ? G.buildCount(hp) : [0, 0, 1];
    const selSig = C.sel.length + ':' + C.sel.map(function (c) { return c.job || '-'; }).join('');
    const s = [col.stock.join(','), JSON.stringify(n), JSON.stringify(col.want), foes, col.queue.map(function (q) { return q.id; }).join('.'), W.deed && W.deed.ordered ? W.deed.title + (W.deed.wait || '') + (W.deed.placed || 0) : '', C.placing, C.send, selSig, tip && now() < tipUntil ? tip : '', col.auto, folded, hc.join('/'), col.raid ? col.raid.state + col.raid.id : ''].join('|');
    { const se = $('season'); if (se && se.offsetHeight) { const top = Math.round(se.getBoundingClientRect().bottom + 10); if (window.innerWidth > 720 && ui.cmd.style.top !== top + 'px') ui.cmd.style.top = top + 'px'; } }
    if (s === sig) return; sig = s;
    for (let k = 0; k < 4; k++) { const e = $('res' + k); e.querySelector('b').textContent = col.stock[k]; }
    $('resPop').querySelector('b').textContent = n.all; $('resPop').title = n.all + ' live on your star: ' + (n.all - n.free) + ' work, ' + n.free + ' are free.';
    { const f = $('resFoe'); f.style.display = foes ? '' : 'none'; f.querySelector('b').textContent = foes; const w = $('resRaid'), r = col.raid; w.style.display = r && r.state === 'warn' ? '' : 'none'; if (r && r.state === 'warn') { w.querySelector('small').textContent = 'raid next spring: ~' + r.n; w.title = G.raidText(W) + '.'; } }
    ORDER.forEach(function (k) { const a = $('cn' + k); a.textContent = n[k]; a.classList.toggle('low', n[k] < (col.want[k] | 0)); $('cw' + k).textContent = col.want[k] | 0; });
    $('cnfree').textContent = n.free; $('cmdAuto').checked = col.auto !== false;
    const imgs = ui.cmd.querySelectorAll('img[data-pic]'); for (let i = 0; i < imgs.length; i++) { const u = pic(imgs[i].dataset.pic); if (u && imgs[i].getAttribute('src') !== u) imgs[i].src = u; }
    const bs = ui.cmd.querySelectorAll('[data-build]'); for (let i = 0; i < bs.length; i++) { const t = bs[i].dataset.build, K = G.BUILDABLE[t]; bs[i].classList.toggle('on', C.placing === t); bs[i].classList.toggle('no', !!(K.cost && K.cost.some(function (v, q) { return v > col.stock[q]; })) || (t === 'ship' && !!G.buildOk('ship', 0, 0))); }
    { const d = W.deed && W.deed.ordered ? W.deed : null, rows = []; if (d) { const c = d.bp ? G.buildCount(d) : null; rows.push('<div><span><b>' + esc(d.title) + '</b> ' + (c ? c[0] + ' of ' + c[2] + ' pieces' : 'being laid out') + (d.wait ? ' · waiting for ' + esc(d.wait) : '') + '</span></div>'); }
      col.queue.slice(0, d ? 1 : 2).forEach(function (q, i) { rows.push('<div><span>' + esc(q.name) + ' · ' + (n.b < 2 ? 'needs 2 builders' : !d && i === 0 && W.deed ? 'after the ' + esc(W.deed.title || 'plan') : 'waiting') + '</span><a data-cancel="' + q.id + '" title="Do not build it">✕</a></div>'); });
      if (col.queue.length > (d ? 1 : 2)) rows[rows.length - 1] = rows[rows.length - 1].replace('</span>', ' (+' + (col.queue.length - (d ? 1 : 2)) + ' more)</span>');
      $('cmdQ').innerHTML = rows.join(''); }
    { const t = $('cmdTip'), live2 = tip && now() < tipUntil; t.textContent = live2 ? tip : C.placing ? 'Click the place for the ' + G.BUILDABLE[C.placing].name + '. Right-click to let it be.' : 'Drag a box to choose creatures. Right-click sends them. Move the view with the right button, or W A S D.'; t.classList.toggle('dim', !live2 && !C.placing); }
    // those you have chosen
    const m = C.sel.length; ui.sel.classList.toggle('hide', !m);
    if (m) { const by = {}; let land = 0; C.sel.forEach(function (c) { by[c.job || ''] = (by[c.job || ''] || 0) + 1; if (c.ph.home) land++; });
      $('selN').textContent = m === 1 ? '1 CHOSEN' : m + ' CHOSEN'; $('selWhat').textContent = ORDER.concat(['']).filter(function (k) { return by[k]; }).map(function (k) { return by[k] + ' ' + (k ? (by[k] === 1 ? JOBS[k].name.toLowerCase() : JOBS[k].many) : 'free'); }).join(', ');
      const bb = ui.sel.querySelectorAll('button[data-job]'); for (let i = 0; i < bb.length; i++) bb[i].classList.toggle('on', Object.keys(by).length === 1 && by[bb[i].dataset.job] === m);
      $('selSend').classList.toggle('on', C.send);
      $('selHint').textContent = C.send ? 'Now click the star: where they are to go, an enemy to attack, or something to gather.' : (land && land < m ? land + ' of the land, ' + (m - land) + ' of the water. ' : land ? 'Of the land. ' : 'Of the water. ') + 'Right-click the star to send them; an enemy to attack; a thing lying about to gather it.';
      const tb = $('toolbar'), ins = $('inspector'); if (tb && window.innerWidth > 1180) { ui.sel.style.left = Math.round(tb.getBoundingClientRect().right + 12) + 'px'; const insOpen = ins && !ins.classList.contains('hide') && ins.offsetHeight; ui.sel.style.maxWidth = 'calc(100vw - ' + Math.round(tb.getBoundingClientRect().right + 26 + (insOpen ? 322 : 0)) + 'px)'; $('selHint').style.display = insOpen ? 'none' : ''; } else { ui.sel.style.left = ''; ui.sel.style.maxWidth = ''; } }
  }

  // ── what is drawn on the star ──
  function label(ctx, x, y, inv, a, colr, size) { ctx.save(); ctx.translate(x, y); ctx.scale(inv, inv); ctx.font = '800 ' + (size || 10.5) + 'px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; const w = ctx.measureText(a).width + 12; ctx.fillStyle = 'rgba(7,18,31,0.72)'; ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(-w / 2, -9, w, 18, 9); else ctx.rect(-w / 2, -9, w, 18); ctx.fill(); ctx.fillStyle = colr || '#e8f4ff'; ctx.fillText(a, 0, 0.5); ctx.restore(); }
  function flag(ctx, x, y, inv, colr, t) { ctx.save(); ctx.translate(x, y); ctx.scale(inv, inv); ctx.strokeStyle = '#14202e'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -26); ctx.stroke(); ctx.fillStyle = colr; ctx.beginPath(); ctx.moveTo(0, -26); ctx.lineTo(15 + Math.sin(t * 5) * 1.5, -21); ctx.lineTo(0, -16); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.ellipse(0, 0, 6, 2.5, 0, 0, 6.2832); ctx.fillStyle = 'rgba(7,18,31,0.5)'; ctx.fill(); ctx.restore(); }
  function draw() {
    const ctx = G.ctx, v = G.view, W = G.W; if (!ctx || !W || !live()) return;
    const t = G.rt || 0, T = now(), s = v.scale * v.dpr, inv = 1 / v.scale, col = G.colony(W), chosen = new Set(C.sel);
    ctx.save(); ctx.setTransform(s, 0, 0, s, v.ox * v.dpr, v.oy * v.dpr); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    // lumen: crystals where it grows
    const N = G.lumenNodes(W);
    for (let i = 0; i < N.length; i++) { const q = N[i], k = Math.min(9, q.n <= 0 ? 0 : 2 + Math.ceil(q.n / 4));
      const g = ctx.createRadialGradient(q.x, q.y - 6, 2, q.x, q.y - 6, 46); g.addColorStop(0, 'rgba(120,235,255,' + (q.n > 0 ? 0.30 + 0.08 * Math.sin(t * 2 + i) : 0.05) + ')'); g.addColorStop(1, 'rgba(120,235,255,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(q.x, q.y - 6, 46, 0, 6.2832); ctx.fill();
      ctx.fillStyle = 'rgba(20,32,46,0.55)'; ctx.beginPath(); ctx.ellipse(q.x, q.y + 6, 24, 7, 0, 0, 6.2832); ctx.fill();
      for (let j = 0; j < k; j++) { const a = j * 2.4, r = j === 0 ? 0 : 7 + (j % 3) * 5; ctx.save(); ctx.translate(q.x + Math.cos(a) * r, q.y + 2 - Math.abs(Math.sin(a)) * r * 0.5 - (j === 0 ? 4 : 0)); const z = j === 0 ? 2.1 : 1.3 + (j % 2) * 0.3; ctx.scale(z, z); G.matDraw(ctx, { x: 0, y: 0, k: 3, s: j * 0.37 + i }, t); ctx.restore(); }
      if (v.scale > 0.45) label(ctx, q.x, q.y + 22, inv, q.n > 0 ? 'LUMEN ' + q.n : 'lumen: growing back', q.n > 0 ? '#8ef0ff' : 'rgba(207,232,255,.6)', 10); }
    // the store, beside the Heart: what is in it lies there to be seen
    const st = G.storeAt(W), hp = G.heartOf(W);
    if (st) { for (let k = 0; k < 4; k++) { const n = Math.min(10, Math.ceil(col.stock[k] / (k === 3 ? 2 : 5))); for (let j = 0; j < n; j++) G.matDraw(ctx, { x: st.x - 22 + k * 15 + (j % 2) * 6, y: st.y - 2 - Math.floor(j / 2) * 5, k: k, s: (j * 0.31 + k * 0.17) % 1 }, t); } }
    if (hp) { const c = G.buildCount(hp), top = hp.y + hp.bp.S * 0.45 + 12 * inv; if (c[0] < c[2] || hp.ruin || T - (hp.hitAt || 0) < 4000) { const w = 70 * inv, hh = 6 * inv; ctx.fillStyle = 'rgba(7,18,31,0.75)'; ctx.fillRect(hp.x - w / 2, top, w, hh); ctx.fillStyle = c[0] / c[2] > 0.5 ? '#6ef0a8' : c[0] / c[2] > 0.25 ? '#f6d365' : '#ff5d73'; ctx.fillRect(hp.x - w / 2, top, w * c[0] / c[2], hh); if (hp.ruin) label(ctx, hp.x, top - 13 * inv, inv, 'being raised again', '#ffe9a8', 10); } }
    // what is waiting to be built, and the place being chosen for something
    col.queue.forEach(function (q) { if (q.type === 'ship') return; ctx.strokeStyle = 'rgba(255,154,76,' + (0.55 + 0.2 * Math.sin(t * 3)) + ')'; ctx.lineWidth = 2 * inv; ctx.setLineDash([8 * inv, 7 * inv]); ctx.beginPath(); ctx.ellipse(q.x, q.y - 34, 52, 44, 0, 0, 6.2832); ctx.stroke(); ctx.setLineDash([]); label(ctx, q.x, q.y + 12 * inv, inv, q.name + ': to be built', '#ffd0a8', 10); });
    if (C.placing && G.input.ptr.inside) { const p = G.input.ptr, why = G.buildOk(C.placing, p.wx, p.wy), okc = why ? '255,93,115' : '110,240,168'; ctx.fillStyle = 'rgba(' + okc + ',0.16)'; ctx.strokeStyle = 'rgba(' + okc + ',0.9)'; ctx.lineWidth = 2 * inv; ctx.beginPath(); ctx.ellipse(p.wx, p.wy - 34, 56, 46, 0, 0, 6.2832); ctx.fill(); ctx.stroke();
      const u = pic(C.placing); if (u) { let im = draw.img || (draw.img = {}); if (!im[C.placing]) { im[C.placing] = new Image(); im[C.placing].src = u; } if (im[C.placing].complete && im[C.placing].naturalWidth) { ctx.globalAlpha = 0.75; ctx.drawImage(im[C.placing], p.wx - 50, p.wy - 93, 100, 100); ctx.globalAlpha = 1; } }
      label(ctx, p.wx, p.wy + 16 * inv, inv, why || G.BUILDABLE[C.placing].name + ': click to build here', why ? '#ffb3c0' : '#b9ffd9', 11); }
    // a raid: the ship it came in
    { const r = col.raid; if (r && r.state !== 'warn') { const bp = raidShip(r), tt = W.t - r.t0, S = bp.S; let off = 0; if (r.state === 'land' && tt < 3) { const u = 1 - tt / 3; off = -720 * u * u; } else if (r.state === 'leave' && tt > 1.5) { const u = (tt - 1.5) / 4; off = -900 * u * u; }
        ctx.fillStyle = 'rgba(4,12,20,' + 0.32 * Math.max(0, 1 + off / 500) + ')'; ctx.beginPath(); ctx.ellipse(r.x, r.y + 4, S * 0.7, 8, 0, 0, 6.2832); ctx.fill();
        if (off < -4) { const g = ctx.createLinearGradient(0, r.y + off, 0, r.y + off + 70); g.addColorStop(0, 'rgba(255,220,140,0.9)'); g.addColorStop(1, 'rgba(255,110,60,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(r.x - 12, r.y + off); ctx.lineTo(r.x + 12, r.y + off); ctx.lineTo(r.x + Math.sin(t * 30) * 4, r.y + off + 50 + Math.sin(t * 23) * 12); ctx.closePath(); ctx.fill(); }
        G.drawBlueprint(ctx, { x: r.x, y: r.y + off - S * 0.45, bp: bp }, false);
        label(ctx, r.x, r.y + off - (bp.top || S * 1.6) - 14 * inv, inv, 'RAIDERS OF ' + String(r.name).toUpperCase(), '#ff9db0', 10.5); } }
    // where the fighters rally, and where guards are posted
    if (col.rally && G.jobCount(W).f) { flag(ctx, col.rally.x, col.rally.y, inv, COL.f, t); if (v.scale > 0.5) label(ctx, col.rally.x, col.rally.y + 12 * inv, inv, 'rally', '#ffc0ca', 9.5); }
    { const seen = {}; for (let i = 0; i < W.cre.length; i++) { const c = W.cre[i]; if (c.dead || c.team || !c.post || (c.job !== 'u' && c.job !== 'f') || (c.job === 'f' && col.rally && c.post === col.rally)) continue; const key = Math.round(c.post.x / 20) + ',' + Math.round(c.post.y / 20); if (seen[key]) continue; seen[key] = 1; flag(ctx, c.post.x, c.post.y, inv, COL[c.job], t); } }
    if (!W.deed && G.drawHauls) G.drawHauls(ctx);      // what the gatherers carry (while a plan is on, the plan draws it)
    // the creatures: a ring under the chosen and under enemies, a mark of its trade over every worker, and how hurt those in a fight are
    for (let i = 0; i < W.cre.length; i++) { const c = W.cre[i]; if (c.dead || c.inShip) continue; const x = c.rx === undefined ? c.x : c.rx, y = c.ry === undefined ? c.y : c.ry, r = c.ph.r;
      if (c.team) { ctx.strokeStyle = 'rgba(255,60,90,' + (0.75 + 0.2 * Math.sin(t * 6 + i)) + ')'; ctx.lineWidth = Math.max(2, 2 * inv); ctx.beginPath(); ctx.ellipse(x, y + r * 0.1, r * 1.35 + 2, r * 0.5 + 1.5, 0, 0, 6.2832); ctx.stroke(); ctx.fillStyle = '#ff3c5a'; ctx.beginPath(); const yy = y - r * 2.2 - 6 * inv, z = Math.max(4, 4.5 * inv); ctx.moveTo(x, yy + z); ctx.lineTo(x - z, yy - z * 0.6); ctx.lineTo(x + z, yy - z * 0.6); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#14202e'; ctx.lineWidth = inv; ctx.stroke(); }
      else { if (chosen.has(c)) { ctx.strokeStyle = 'rgba(120,255,190,0.95)'; ctx.lineWidth = Math.max(1.6, 2 * inv); ctx.beginPath(); ctx.ellipse(x, y + r * 0.1, r * 1.35 + 2, r * 0.5 + 1.5, 0, 0, 6.2832); ctx.stroke(); }
        if (c.job && COL[c.job]) { const z = Math.max(2.6, 3.4 * inv), yy = y - r * 1.9 - 5 * inv; ctx.fillStyle = COL[c.job]; ctx.strokeStyle = '#14202e'; ctx.lineWidth = Math.max(0.8, inv); ctx.beginPath(); if (c.job === 'f') { ctx.moveTo(x, yy - z * 1.2); ctx.lineTo(x + z, yy + z * 0.8); ctx.lineTo(x - z, yy + z * 0.8); ctx.closePath(); } else if (c.job === 'u') ctx.rect(x - z * 0.85, yy - z * 0.85, z * 1.7, z * 1.7); else if (c.job === 'b') { ctx.moveTo(x, yy - z); ctx.lineTo(x + z, yy); ctx.lineTo(x, yy + z); ctx.lineTo(x - z, yy); ctx.closePath(); } else ctx.arc(x, yy, z * 0.9, 0, 6.2832); ctx.fill(); ctx.stroke(); if (c.hungry) { ctx.fillStyle = 'rgba(7,18,31,0.6)'; ctx.beginPath(); ctx.arc(x, yy, z * 0.45, 0, 6.2832); ctx.fill(); } } }
      if (c.hpT && T - c.hpT < 4500) { const w = 24 * inv, hh = 3.5 * inv, yy = y - r * 2.6 - 12 * inv, f = G.clamp(c.E / c.ph.Emax, 0, 1); ctx.fillStyle = 'rgba(7,18,31,0.8)'; ctx.fillRect(x - w / 2 - inv, yy - inv, w + 2 * inv, hh + 2 * inv); ctx.fillStyle = c.team ? '#ff5d73' : '#6ef0a8'; ctx.fillRect(x - w / 2, yy, w * f, hh); } }
    // a tower's stroke, an order just given, and what was just lost or won
    for (let i = ZAP.length - 1; i >= 0; i--) { const z = ZAP[i], u = (T - z.t0) / 260; if (u >= 1) { ZAP.splice(i, 1); continue; } ctx.strokeStyle = 'rgba(140,240,255,' + (1 - u) + ')'; ctx.lineWidth = (3.5 - 2 * u) * Math.max(1, inv); ctx.beginPath(); ctx.moveTo(z.x0, z.y0); ctx.lineTo((z.x0 + z.x1) / 2 + Math.sin(i * 7 + z.t0) * 8, (z.y0 + z.y1) / 2 + Math.cos(i * 5 + z.t0) * 8); ctx.lineTo(z.x1, z.y1); ctx.stroke(); }
    for (let i = FX.length - 1; i >= 0; i--) { const f = FX[i], u = (T - f.t0) / 900; if (u >= 1) { FX.splice(i, 1); continue; } const a = 1 - u;
      if (f.from && u < 0.5) { ctx.strokeStyle = 'rgba(' + f.col + ',' + 0.5 * (1 - u * 2) + ')'; ctx.lineWidth = 1.5 * inv; ctx.beginPath(); for (let k = 0; k < f.from.length && k < 40; k++) { ctx.moveTo(f.from[k].x, f.from[k].y); ctx.lineTo(f.x, f.y); } ctx.stroke(); }
      ctx.strokeStyle = 'rgba(' + f.col + ',' + a + ')'; ctx.lineWidth = 2.5 * inv; ctx.beginPath(); ctx.ellipse(f.x, f.y, (8 + 26 * u) * inv, (4 + 13 * u) * inv, 0, 0, 6.2832); ctx.stroke(); ctx.beginPath(); ctx.ellipse(f.x, f.y, (4 + 12 * u) * inv, (2 + 6 * u) * inv, 0, 0, 6.2832); ctx.stroke(); }
    for (let i = POP.length - 1; i >= 0; i--) { const p = POP[i], u = (T - p.t0) / 1400; if (u >= 1) { POP.splice(i, 1); continue; } ctx.globalAlpha = Math.min(1, (1 - u) * 2); label(ctx, p.x, p.y - (14 + 26 * u) * inv, inv, p.text, p.col, 11); ctx.globalAlpha = 1; }
    ctx.restore();
    // the box being dragged
    const b = G.ui.box; if (b) { ctx.save(); ctx.setTransform(v.dpr, 0, 0, v.dpr, 0, 0); ctx.fillStyle = 'rgba(120,255,190,0.10)'; ctx.strokeStyle = 'rgba(120,255,190,0.9)'; ctx.lineWidth = 1.5; const x = Math.min(b.x0, b.x1), y = Math.min(b.y0, b.y1), w = Math.abs(b.x1 - b.x0), h = Math.abs(b.y1 - b.y0); ctx.fillRect(x, y, w, h); ctx.strokeRect(x + 0.5, y + 0.5, w, h); ctx.restore(); }
  }

  const SHIPS = {};
  function raidShip(r) { const k = r.seed + ':' + Math.round(r.hue); if (!SHIPS[k]) SHIPS[k] = G.blueprintFrom({ seed: r.seed, type: 'ship', S: 74, hue: r.hue, spiky: 1, brain: 0.8, wet: false }, '22222222222222222222222222222222222222222222222222'); return SHIPS[k]; }
  /** take the view to where the enemy is (their raiders, or the ship they came in) */
  C.seeFoes = function () { const W = G.W; if (!W) return; const L = W.cre.filter(function (c) { return c.team && !c.dead; }), r = G.colony(W).raid; let x = 0, y = 0; if (L.length) { L.forEach(function (c) { x += c.x; y += c.y; }); x /= L.length; y /= L.length; } else if (r && r.state !== 'warn') { x = r.x; y = r.y; } else return; G.select(null); G.focusOn(x, y, 1.5); };
  G.on('raid-warn', function (r) { if (G.mode !== 'play') return; G.banner('A raid is coming', 'The colony of ' + r.name + ' is sending a ship: about ' + r.n + ' raiders will land next spring, and go for your Heart. Name fighters and guards and keep them near it.', 9000); if (G.log) G.log('sel', 'A raid is coming', 'From ' + r.name + ': about ' + r.n + ' raiders, next spring. If the Heart falls they take what is in the store.'); if (G.hub) G.hub.poke(); sig = ''; });
  G.on('raid-land', function (r) { if (G.mode !== 'play') return; if (G.speed > 4) G.setSpeed(1); G.banner('Raid', 'The raiders of ' + r.name + ' are landing on your star! ' + (G.jobCount().f + G.jobCount().u ? 'Your fighters and guards will meet them.' : 'You have no fighters: name some, quickly.'), 8000); if (G.sfx) G.sfx('discovery'); sig = ''; });
  G.on('raid-over', function (r, how) { if (G.mode !== 'play') return; if (how === 'beaten') { G.banner('The raid is beaten', 'Every raider of ' + r.name + ' is slain. You took ' + r.loot + ' lumen from their ship.', 8000); if (G.log) G.log('sel', 'Raid beaten', 'The raiders of ' + r.name + ' are all slain: ' + r.loot + ' lumen taken from their ship.'); } else if (how === 'worn') { if (G.note) G.note('The raid', 'The raiders of ' + r.name + ' have given up and are going home.'); } if (G.hub) G.hub.poke(); sig = ''; });
  if (G.hub) { G.hub.add(function (W) { const col = W.col, r = col && col.raid; if (!r || W.farOf) return null; const txt = G.raidText(W), hp = G.heartOf(W), hc = hp ? G.buildCount(hp) : [0, 0, 1], n = G.jobCount(W);
      const row = G.hub.row({ icon: '!', title: r.state === 'warn' ? 'A raid is coming' : 'Raid', tag: r.state === 'warn' ? 'next spring' : r.state === 'on' ? (r.left || r.n) + ' raiders' : '', bad: true, sub: esc(txt) + '. You have <b>' + n.f + ' fighters</b> and <b>' + n.u + ' guards</b>; the Heart has ' + hc[0] + ' of ' + hc[2] + ' pieces.', act: r.state === 'warn' ? '' : 'foes', live: r.state !== 'warn' });
      return { sig: 'raid' + r.id + r.state + (r.left || 0) + hc[0] + n.f + n.u, dangers: [row], alarm: ['raid' + r.id + r.state], alarmRows: [row] }; }); G.hub.act('foes', function () { C.seeFoes(); }); }

  // ── what happens, told ──
  G.on('fight', function (a, b) { const T = now(); a.hpT = T; b.hpT = T; });
  G.on('tower-zap', function (w, c) { ZAP.push({ x0: w.x, y0: w.y + w.bp.S * 0.45 - (w.bp.top || 100), x1: c.x, y1: c.y, t0: now() }); c.hpT = now(); });
  G.on('slain', function (a, b) { if (G.mode !== 'play') return; POP.push({ x: b.x, y: b.y, t0: now(), text: b.team ? 'enemy slain' : (b.job ? JOBS[b.job].name.toLowerCase() : 'one of yours') + ' lost', col: b.team ? '#b9ffd9' : '#ffb3c0' }); });
  G.on('tower-kill', function (w, b) { if (G.mode === 'play') POP.push({ x: b.x, y: b.y, t0: now(), text: 'struck down by the ' + w.name, col: '#b9ffd9' }); });
  G.on('delivered', function (c, k) { if (G.mode !== 'play' || G.speed > 4) return; const st = G.storeAt(G.W); if (st && k === 3) POP.push({ x: st.x, y: st.y - 10, t0: now(), text: '+1 lumen', col: '#8ef0ff' }); });
  let hitSaid = 0;
  G.on('work-hit', function (w, by) { if (G.mode !== 'play' || !w.bp) return; w.hitAt = now(); if (w.bp.type === 'heart' && by && by.team && now() - hitSaid > 25000) { hitSaid = now(); G.banner('Raid', 'Your Heart is under attack! Send your fighters: choose them (click FIGHTERS in the colony panel) and right-click the enemy.', 7000); if (G.log) G.log('sel', 'The Heart is under attack', 'Raiders are breaking it piece by piece. If it falls they take everything in the store.'); } });
  G.on('heart-fell', function (h, by, taken) { if (G.mode !== 'play') return; const got = (taken || []).map(function (n, k) { return n ? n + ' ' + G.RES[k] : ''; }).filter(Boolean).join(', '); G.banner('The Heart has fallen', 'The raiders broke your Heart' + (got ? ' and took what was in the store: ' + got : '') + '. They are going home. Your builders will raise it again.', 8000); if (G.log) G.log('sel', 'The Heart has fallen', (got ? 'Taken from the store: ' + got + '. ' : '') + 'Your builders will raise it again, piece by piece.'); });
  G.on('heart-whole', function () { if (G.mode === 'play' && G.note) G.note('The Heart', 'The Heart is whole again.'); });
  G.on('build-started', function (o) { if (G.mode === 'play') say('Your builders have started on the ' + o.name + '.', 6); });
  G.on('deed-end', function (d, how) { if (G.mode === 'play' && d && d.ordered) { say(how === 'done' ? 'The ' + d.title + ' is finished.' : 'The ' + d.title + ' was given up: too few builders came to it.', 8); sig = ''; } });

  // ── keeping it all going ──
  G.addSystem({ name: 'command',
    update: function (dt) {
      const T = now(); if (T - lastT > 250) { lastT = T; try { refresh(); } catch (e) { console.error(e); } }
      // the view is moved with W A S D or the arrow keys
      if (G.mode === 'play' && G.W && !G.isBlocked() && !(document.activeElement && /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName))) { const K = G.input.keys, dx = (K.d || K.ArrowRight ? 1 : 0) - (K.a || K.ArrowLeft ? 1 : 0), dy = (K.s || K.ArrowDown ? 1 : 0) - (K.w || K.ArrowUp ? 1 : 0); if (dx || dy) { const sp = 620 / G.view.scale * Math.min(0.05, dt || 0.016); G.cam.x += dx * sp; G.cam.y += dy * sp; G.applyCam(); } }
    },
    draw: function () { try { draw(); } catch (e) { if (!draw.err) { draw.err = 1; console.error(e); } } } });
})();
