// ── The command screen: how you run your colony ──
// The engine of the colony is in 54i_colony.js and 54j_order.js. This is what you touch:
//     the STORE BAR (top)       what is in the store: stone, reed, shell, lumen; click one to see all about it
//     the COLONY PANEL (left)   always in the same place and of the same size: where you are, a small map of the star (click it to go there), the
//                               trades (how many of each you have and how many you want: − and +), and what can be built
//     CHOOSING                  the RIGHT button: click one of yours, or drag a box round many. Click a trade's name to choose everyone of that
//                               trade. Right-click on bare ground lets them go.
//     ORDERS                    the LEFT button, while some are chosen: click where they are to go. On an enemy: attack it. On something lying
//                               about, or on lumen: gather it. On a building: guard it (an enemy's: break it).
//     LOOKING                   the LEFT button with nobody chosen: click anything to see its card, as always. Left-drag moves the view.
//     the CHOSEN BAR (bottom)   who you have chosen, and the trades you can give them
// (The buttons can be swapped back in the panel: "swap".) What is drawn on the star itself is in 68a_field.js.
(function () {
  'use strict';
  if (typeof document === 'undefined' || !G.JOBS) return;
  const $ = function (id) { return document.getElementById(id); };
  const esc = function (s) { return String(s === undefined || s === null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  const JOBS = G.JOBS, ORDER = ['g', 'b', 'f', 'u'];
  const BUILD = ['house', 'hall', 'huts', 'wall', 'tower', 'port', 'ship'];
  const C = G.cmd = { sel: [], placing: null, pick: false, rightChooses: true, ghost: null };
  // your side has one colour and the enemy another, everywhere: on the star, on the small map, in the bars
  C.TEAM = { mine: '70,200,255', foe: '255,64,88', mineHex: '#46c8ff', foeHex: '#ff4058' };
  // the sign of each trade (drawn in your colour): a basket, a hammer, a blade, a shield
  C.GLYPH = { g: 'M3 7h10l-1.5 6h-7zM5 7c0-4.5 6-4.5 6 0', b: 'M3.5 3h7v3.2h-7zM7 6.2v8', f: 'M13 2.5L6 9.5M4 7.5l4.5 4.5M2.8 13.2l2.6-2.6', u: 'M8 2l5 2v4c0 3-2.5 5-5 6.2C5.5 13 3 11 3 8V4z' };
  const svg = function (job, colr) { return '<svg viewBox="0 0 16 16" width="15" height="15" style="flex:none"><path d="' + (C.GLYPH[job] || 'M8 4a4 4 0 100 8 4 4 0 000-8z') + '" fill="none" stroke="' + (colr || C.TEAM.mineHex) + '" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>'; };
  let sig = '', lastT = 0, tip = '', tipUntil = 0, folded = false, lastPick = { id: 0, t: 0 };
  try { folded = localStorage.getItem('primordia.cmdFold') === '1'; C.rightChooses = localStorage.getItem('primordia.mouse') !== 'L'; } catch (e) { /* no storage: it stays open */ }

  const now = function () { return performance.now(); };
  /** is there a colony to command on what is being shown? */
  const live = C.live = function () { const W = G.W; return !!(W && G.mode === 'play' && !W.title && !W.extinct && !(G.pondAsleep && G.pondAsleep())); };
  const mine = C.mine = function (c) { return c && !c.dead && !c.team && !c.inShip && G.W.cre.indexOf(c) >= 0; };
  /** where a creature is SEEN (its body is drawn above the point it stands on) */
  const pos = C.pos = function (c) { return { x: c.rx === undefined ? c.x : c.rx, y: (c.ry === undefined ? c.y : c.ry) - (c._mid || c.ph.r) }; };
  const say = C.say = function (s, secs) { tip = s; tipUntil = now() + (secs || 5) * 1000; sig = ''; };
  const lvl = function (c) { return c.ph.home ? 'high ground' : 'low ground'; }, FLAT = function () { return !!G.FLAT; };

  /** is the player in the middle of commanding? (then nothing else takes the view or the card from them) */
  let lastAct = 0;
  C.busy = function () { const W = G.W; return live() && (C.sel.length > 0 || !!C.placing || C.pick || !!G.ui.box || now() - lastAct < 25000 || !!(W.col && W.col.raid && W.col.raid.state !== 'warn')); };
  const acted = function () { lastAct = now(); };

  // ── choosing ──
  C.boxOk = function () { return live() && !G.isBlocked() && !C.placing; };
  C.boxBtn = function () { return C.rightChooses ? 2 : 0; };
  C.set = function (list, add) { acted(); const s = add ? C.sel.filter(mine) : []; (list || []).forEach(function (c) { if (mine(c) && s.indexOf(c) < 0) s.push(c); }); C.sel = s; sig = ''; };
  C.clear = function () { C.sel = []; C.pick = false; sig = ''; };
  C.all = function (job) { const W = G.W; if (!W) return; C.set(W.cre.filter(function (c) { return mine(c) && (job === '' ? !c.job : c.job === job); })); G.select(null); if (G.selectThing) G.selectThing(null); if (C.cardClose) C.cardClose(); if (!C.sel.length) say('Nobody has that trade yet. Press + to ask for some.'); };
  C.escape = function () { if (C.placing) { C.placing = null; sig = ''; return true; } if (C.pick) { C.pick = false; sig = ''; return true; } if (C.cardClose && C.cardClose()) return true; if (C.sel.length) { C.clear(); return true; } return false; };
  G.on('box-select', function (b, add) {
    if (!live()) return; const W = G.W, got = [];
    for (let i = 0; i < W.cre.length; i++) { const c = W.cre[i]; if (!mine(c)) continue; const p = pos(c); if (p.x >= b.x0 && p.x <= b.x1 && p.y >= b.y0 && p.y <= b.y1) got.push(c); }
    C.set(got, add); if (G.selectThing) G.selectThing(null); G.selectZone(null); G.select(null); if (C.cardClose) C.cardClose();
    if (!got.length && !add) say('Nobody of yours is in that box.', 3);
  });
  function near(list, x, y, R, ok) { let best = null, bd = R * R; for (let i = 0; i < list.length; i++) { const o = list[i]; if (ok && !ok(o)) continue; const d = (o.x - x) * (o.x - x) + (o.y - y) * (o.y - y); if (d < bd) { bd = d; best = o; } } return best; }
  /** the creature whose body is under this point (ok says which count) */
  const under = C.under = function (p, ok, slack) { const W = G.W; let best = null, bd = 1e9; for (let i = 0; i < W.cre.length; i++) { const c = W.cre[i]; if (c.dead || c.inShip || (ok && !ok(c))) continue; const q = pos(c), d = Math.hypot(q.x - p.x, q.y - p.y) - Math.max(c.ph.r * 1.5, 13 / G.view.scale) - (slack || 0); if (d < bd) { bd = d; best = c; } } return bd < 0 ? best : null; };
  /** choose the one of yours under the pointer (again, quickly: everyone in sight of its trade); on bare ground, let them go */
  function choose(p) {
    const c = under(p, mine, 6 / G.view.scale), t = now();
    if (!c) { if (!p.shift) { if (C.sel.length) say('Let go.', 2); C.clear(); } return; }
    if (lastPick.id === c.id && t - lastPick.t < 450) { const v = G.view, x0 = -v.ox / v.scale, y0 = -v.oy / v.scale, x1 = x0 + v.w / v.scale, y1 = y0 + v.h / v.scale; C.set(G.W.cre.filter(function (o) { return mine(o) && (o.job || '') === (c.job || '') && o.x >= x0 && o.x <= x1 && o.y >= y0 && o.y <= y1; })); }
    else C.set([c], p.shift);
    lastPick = { id: c.id, t: t }; G.select(null); if (G.selectThing) G.selectThing(null); if (C.cardClose) C.cardClose(); if (G.sfx) G.sfx('click');
  }
  G.on('new-pond', function () { C.sel = []; C.placing = null; C.pick = false; sig = ''; });

  // ── orders ──
  function orderAt(p) {
    const W = G.W; C.sel = C.sel.filter(mine); if (!C.sel.length) return false;
    const R = Math.max(20, 22 / G.view.scale), foe = under(p, function (o) { return o.team === 1; }, 10 / G.view.scale), node = near(G.lumenNodes(W), p.x, p.y + 14, 54, function (q) { return q.n > 0; }), mat = near(W.mats || [], p.x, p.y, R),
      hit = G.thingAt ? G.thingAt(p.x, p.y) : null, work = hit && hit.k === 'work' && hit.o.bp ? hit.o : null, n = C.sel.length, who = n === 1 ? 'It' : 'All ' + n, soldiers = C.sel.some(function (c) { return c.job === 'f' || c.job === 'u'; });
    let o, col, words;
    if (work && work.enemy && !foe) { o = { x: work.x, y: work.y, work: work }; col = C.TEAM.foe; words = who + (n === 1 ? ' goes' : ' go') + ' to break the ' + work.name + '.'; }
    else if (foe) { o = { x: foe.x, y: foe.y, foe: foe }; col = C.TEAM.foe; words = who + (n === 1 ? ' goes' : ' go') + ' for the enemy.'; }
    else if (node) { o = { x: node.x, y: node.y, mat: 3 }; col = '120,235,255'; words = who + (n === 1 ? ' is' : ' are') + ' to gather lumen here.'; }
    else if (mat) { o = { x: mat.x, y: mat.y, mat: mat.k }; col = '242,193,78'; words = who + (n === 1 ? ' is' : ' are') + ' to gather ' + G.RES[mat.k] + ' round here.'; }
    else if (work && !work.enemy && soldiers) { o = { x: work.x, y: work.y, work: work }; col = C.TEAM.mine; words = 'The fighters and guards among them are to guard the ' + work.name + '.'; }
    else { o = { x: p.x, y: p.y }; col = C.TEAM.mine; const allF = C.sel.every(function (c) { return c.job === 'f'; }); words = allF && n >= G.jobCount(W).f ? 'The muster ground is here now: they form up on it.' : allF ? (n === 1 ? 'Its' : 'Their') + ' post is here now.' : C.sel.every(function (c) { return c.job === 'u'; }) ? 'They stand guard here now.' : C.sel.every(function (c) { return c.job === 'g'; }) ? 'They gather round here now.' : who + (n === 1 ? ' goes' : ' go') + ' there.'; }
    const off = o.work ? [] : C.sel.filter(function (c) { return !G.canReach(W, c, o.y); }), cant = off.length;
    acted(); G.order(C.sel, o); if (C.orderFx) C.orderFx(o, col, C.sel.map(pos));
    say(words + (cant ? ' (' + (cant === n ? (n === 1 ? 'It is' : 'They are') : cant === 1 ? 'One of them is' : cant + ' of them are') + ' of the ' + lvl(off[0]) + ': as near as ' + (cant === 1 ? 'it' : 'they') + ' can come.)' : ''), 6);
    if (G.sfx) G.sfx('click'); return true;
  }
  C.orderAt = orderAt;
  /** the second button: choosing (or, with the buttons swapped back, an order) */
  G.on('pond-order', function (p) { if (!live() || G.isBlocked()) return; if (C.placing) { C.placing = null; sig = ''; return; } if (C.rightChooses) choose(p); else if (!orderAt(p)) say('Choose some of your creatures first.'); });
  /** where the thing being placed would stand: on the nearest lot (a spaceport stands where you say) */
  C.placeAt = function (x, y) { const t = C.placing; if (!t || t === 'port' || !G.lotSnap) return { x: x, y: y }; return G.lotSnap(G.W, x, y, t === 'tower' || t === 'wall'); };
  /** the first button on the star, before anything else is done with it: a place for what is being built; an order to those chosen; a card */
  C.takeClick = function (p) {
    if (!live()) return false;
    if (C.placing) { const at = C.placeAt(p.x, p.y), r = G.buildOrder(C.placing, at.x, at.y); if (r && r.error) { say(r.error, 5); return true; } say(r ? r.name + ' is ordered. Your builders will raise it' + (G.jobCount().b < 2 ? ' (you need two builders at least: they are being named now)' : '') + '.' : '', 6); if (!p.shift) C.placing = null; sig = ''; return true; }
    if (C.pick) { choose(p); return true; }      // (no second button, as on a phone: CHOOSE, then touch)
    if (C.rightChooses && C.sel.length) { orderAt(p); return true; }
    if (C.cardClick && C.cardClick(p)) return true;
    return false;
  };
  // with the buttons swapped back: a click that chose one creature chooses it for orders too
  G.on('pond-click', function (c) { if (!live() || G.isBlocked() || C.rightChooses) return; const s = G.R.sel; if (s && mine(s)) C.set([s], c.shift); else if (!c.shift) C.clear(); });
  C.job = function (job) { C.sel = C.sel.filter(mine); if (!C.sel.length) return; G.assign(C.sel, job); say(C.sel.length === 1 ? 'It is ' + (job ? 'a ' + JOBS[job].name.toLowerCase() : 'free') + ' now.' : 'All ' + C.sel.length + ' are ' + (job ? JOBS[job].many : 'free') + ' now.' + (job ? ' Their children will be too.' : ''), 5); sig = ''; };
  C.want = function (job, d) { const W = G.W; if (!W) return; acted(); const col = G.colony(W), n = G.jobCount(W); col.want[job] = G.clamp((col.want[job] | 0) + d, 0, Math.max(0, n.all - 2)); if (d < 0) W.cre.forEach(function (c) { if (c.job === job) c.pin = false; }); sig = ''; if (G.markDirty) G.markDirty(); };
  C.build = function (type) {
    const K = G.BUILDABLE[type]; if (!K || !live()) return; acted();
    if (type === 'ship') { const r = G.buildOrder('ship', 0, 0); say(r && r.error ? r.error : 'A starship is ordered. Your builders will raise it on the spaceport.', 6); sig = ''; return; }
    C.placing = C.placing === type ? null : type; C.pick = false; sig = ''; if (C.placing) say(K.name + ': ' + (type === 'port' ? 'click the place for it.' : 'the lots are marked on the star. Click one.') + ' Right-click to let it be.', 9);
  };

  // ── the look of it ──
  const css = '#resbar{position:fixed;left:50%;top:14px;transform:translateX(-50%);display:flex;gap:2px;align-items:center;padding:5px 10px;border-radius:999px;z-index:3;white-space:nowrap;font:700 13px system-ui,sans-serif;color:#e8f4ff}' +
    '#resbar .r{display:flex;align-items:center;gap:5px;padding:2px 8px;border-radius:999px;cursor:pointer}#resbar .r:hover{background:rgba(207,232,255,.1)}#resbar .r img{width:20px;height:20px}#resbar .r b{display:inline-block;min-width:22px;text-align:right}#resbar .r small{font:600 10px system-ui;letter-spacing:.08em;color:rgba(207,232,255,.6);text-transform:uppercase}#resbar .r.lum{color:#8ef0ff}#resbar .sep{width:1px;height:18px;background:rgba(207,232,255,.2);margin:0 4px}' +
    '#resbar .r.warn{cursor:default}@keyframes cmdPulse{50%{opacity:.55}}' +
    '#cmd{position:fixed;left:14px;top:160px;width:250px;box-sizing:border-box;padding:9px 10px 10px;z-index:2;font:12px system-ui,sans-serif;color:#dcecf8;user-select:none}' +
    '#cmd .ch{display:flex;align-items:center;justify-content:space-between;cursor:pointer;height:16px}#cmd .ch b{font-size:12px;letter-spacing:.2em;color:#f6d365;text-shadow:0 0 10px rgba(246,211,101,.5)}#cmd .ch span{font-size:16px;line-height:14px;color:rgba(207,232,255,.7);padding:0 4px}#cmd .ch small{flex:1;margin-left:8px;font:700 10px system-ui;letter-spacing:.1em;text-transform:uppercase;color:#9dffcf;white-space:nowrap}#cmd.fold .ch small{display:none}#cmd.fold .ch b{margin-right:10px}' +
    '#cmd.fold .cb{display:none}#cmd.fold{width:auto}' +
    '#cmdStar{height:62px;overflow:hidden;margin-top:6px}#cmdMap{display:block;width:230px;height:104px;margin-top:6px;border-radius:9px;border:1px solid rgba(207,232,255,.22);cursor:pointer;background:#0b1622}' +
    '#cmd .csec{margin:8px 0 3px;height:13px;font:700 10px system-ui;letter-spacing:.16em;color:rgba(207,232,255,.6);display:flex;justify-content:space-between;align-items:center}#cmd .csec small{font:600 9.5px system-ui;letter-spacing:.04em;text-transform:none;color:rgba(207,232,255,.5)}' +
    '#cmd .crow{display:flex;align-items:center;gap:6px;height:26px;border-radius:8px;padding:0 4px}#cmd .crow:hover{background:rgba(207,232,255,.07)}' +
    '#cmd .crow .nm{flex:1;font-weight:700;cursor:pointer;white-space:nowrap}#cmd .crow .nm:hover{text-decoration:underline}#cmd .crow .cn{width:28px;text-align:right;font-weight:800;font-size:13px;font-variant-numeric:tabular-nums}#cmd .crow .cw{width:24px;text-align:center;color:rgba(207,232,255,.75);font-weight:700;font-variant-numeric:tabular-nums}#cmd .crow .cn.low{color:#ffb86b}' +
    '#cmd .crow button{appearance:none;width:23px;height:23px;border-radius:7px;border:1px solid rgba(207,232,255,.28);background:rgba(7,18,31,.5);color:#e8f4ff;font:800 14px system-ui;line-height:1;cursor:pointer;padding:0;flex:none}#cmd .crow button:hover{border-color:#33d6a6;box-shadow:inset 0 0 10px rgba(51,214,166,.35)}' +
    '#cmd .cgrid{display:grid;grid-template-columns:repeat(4,1fr);gap:5px}#cmd .cgrid button{appearance:none;height:54px;border:1px solid rgba(207,232,255,.24);background:rgba(7,18,31,.45);border-radius:9px;padding:2px 0 3px;cursor:pointer;color:#dcecf8;font:700 9.5px system-ui;letter-spacing:.03em;display:flex;flex-direction:column;align-items:center;gap:0;min-width:0;overflow:hidden}' +
    '#cmd .cgrid button img{width:36px;height:36px;display:block}#cmd .cgrid button:hover{border-color:#33d6a6;box-shadow:inset 0 0 12px rgba(51,214,166,.3)}#cmd .cgrid button.on{border-color:#f6d365;box-shadow:inset 0 0 14px rgba(246,211,101,.4)}#cmd .cgrid button.no{opacity:.42}' +
    '#cmd .cq{margin-top:6px;height:32px;overflow:hidden;font-size:11px;line-height:16px;color:rgba(207,232,255,.85)}#cmd .cq div{display:flex;justify-content:space-between;gap:6px;white-space:nowrap}#cmd .cq div span{overflow:hidden;text-overflow:ellipsis}#cmd .cq a{color:#ff9db0;cursor:pointer;font-weight:800;padding:0 4px}' +
    '#cmd .ctip{margin-top:6px;height:57px;overflow:hidden;font-size:11px;line-height:1.3;color:#ffe9a8}#cmd .ctip.dim{color:rgba(207,232,255,.55)}#cmd .ctip.goal{color:#9dffcf}' +
    '#cmd .ckeys{margin-top:5px;height:26px;overflow:hidden;font-size:9.5px;line-height:13px;color:rgba(207,232,255,.5)}#cmd .ckeys a{color:#ffe9a8;cursor:pointer;text-decoration:underline}' +
    '#cmd label{display:flex;align-items:center;gap:4px;cursor:pointer;font:600 9.5px system-ui;letter-spacing:.02em;text-transform:none;color:rgba(207,232,255,.7)}#cmd label input{margin:0;accent-color:#33d6a6}' +
    '#cmdPick{display:none;appearance:none;width:100%;margin-top:6px;height:26px;border:1px solid rgba(207,232,255,.24);background:rgba(7,18,31,.45);border-radius:9px;color:#dcecf8;font:700 11px system-ui;letter-spacing:.04em;cursor:pointer}#cmdPick.on{border-color:#f6d365;color:#ffe9a8}@media (pointer:coarse){#cmdPick{display:block}}' +
    '#cmd.short #cmdMap{display:none}#cmd.tiny .ckeys{display:none}#cmd.tiny .ctip{height:43px}#cmd.mini #cmdStar{display:none}#cmd.mini .cgrid button{height:46px}#cmd.mini .cgrid button img{width:28px;height:28px}' +
    '@media (min-width:721px){body.cmdLive #season{height:138px;box-sizing:border-box;overflow:hidden}body.cmdLive #season .cap{display:none}body.cmdLive #season .count{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:8px}' +
    'body.cmdLive #zoom{left:276px}body.cmdLive .pop{left:340px}}' +
    '#selbar{position:fixed;bottom:14px;left:660px;z-index:4;padding:8px 12px;border-radius:16px;display:flex;flex-direction:column;gap:5px;max-width:calc(100vw - 690px);font:12px system-ui,sans-serif;color:#dcecf8;border-color:rgba(' + C.TEAM.mine + ',.6)}#selbar.hide{display:none}' +
    '#selbar .s1{display:flex;align-items:center;gap:6px;flex-wrap:wrap;white-space:nowrap}#selbar .s1 b{font-size:12px;letter-spacing:.14em;color:' + C.TEAM.mineHex + '}#selbar .s1 .what{color:rgba(207,232,255,.85);overflow:hidden;text-overflow:ellipsis;max-width:260px}' +
    '#selbar button{appearance:none;border:1px solid rgba(207,232,255,.28);background:rgba(7,18,31,.5);color:#e8f4ff;border-radius:999px;padding:4px 10px;font:800 10.5px system-ui;letter-spacing:.08em;cursor:pointer;display:flex;align-items:center;gap:5px}#selbar button:hover{border-color:#33d6a6}#selbar button.on{border-color:#f6d365;color:#ffe9a8}#selbar button.x{padding:5px 8px}' +
    '#selbar .s2{font-size:10.5px;color:rgba(207,232,255,.6);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
    '@media (max-width:1180px){#selbar{left:14px;bottom:76px;max-width:calc(100vw - 28px)}}@media (max-width:720px){#resbar{top:auto;bottom:70px;font-size:11px;padding:3px 8px}#resbar .r small{display:none}#cmd{top:auto;bottom:112px;left:7px}}';
  const PICS = {}, ICON = {};
  const icon = C.icon = function (k) { if (ICON[k]) return ICON[k]; try { const cv = document.createElement('canvas'); cv.width = cv.height = 44; const x = cv.getContext('2d'); x.translate(22, 24); x.scale(2.1, 2.1); x.lineJoin = 'round'; G.matDraw(x, { x: 0, y: 0, k: k, s: 0.37 }, 0); ICON[k] = cv.toDataURL('image/png'); } catch (e) { ICON[k] = ''; } return ICON[k]; };
  const pic = C.pic = function (type) { if (PICS[type] !== undefined) return PICS[type]; let url = '';
    try { const A = G.art, s = A && A.sprite ? A.sprite(G.W, type === 'tower' ? 'tower' : type) : null; if (s) { const cv = document.createElement('canvas'); cv.width = cv.height = 88; const x = cv.getContext('2d'), k = Math.min(84 / s.w, 84 / s.h); x.imageSmoothingEnabled = true; x.drawImage(A.tinted(s, 'mine'), 44 - s.w * k / 2, 86 - s.h * k, s.w * k, s.h * k); return (PICS[type] = cv.toDataURL('image/png')); } } catch (e) { /* drawn the old way */ }      /* (as this star's people build it, if theirs is painted) */
    try { const t = type === 'tower' ? 'spire' : type, W = G.W, sp = W && (W.species || []).filter(function (s) { return !s.extinct; }).sort(function (a, b) { return b.n - a.n; })[0];
      const bp = G.blueprintFrom({ seed: 91 + BUILD.indexOf(type) * 8, type: t, S: t === 'house' ? 50 : t === 'ship' ? 70 : 84, hue: sp ? sp.hue : 190, spiky: 0, brain: 0.7, wet: false }, '22222222222222222222222222222222222222222222222222'); url = G.buildPic({ bp: bp }, 44); } catch (e) { url = ''; } return (PICS[type] = url); };
  G.on('new-pond', function () { for (const k in PICS) delete PICS[k]; }); G.on('art', function () { for (const k in PICS) delete PICS[k]; });
  const TIPS = { g: 'Gatherers fetch what lies about the star (stone, reed, shell) and lumen, and carry it to the Heart. Click the name to choose them all.', b: 'Builders raise what you order built, from the store and from what lies near; with nothing to build they wait in their yard. Click the name to choose them all.', f: 'Fighters stand in ranks on the muster ground, go for any enemy in sight, and attack what you send them against. Click the name to choose them all.', u: 'Guards stand at the post you give them and do not leave it. Click the name to choose them all.' };
  const mouseWords = function () { return C.rightChooses ? 'Right button: choose (click or drag). Left click: send them. Left-drag or W A S D: move the view.' : 'Left button: choose (click or drag). Right click: send them. Right-drag or W A S D: move the view.'; };
  let ui = null, fitKey = '';
  function build() {
    if (ui) return ui; const root = $('ui') || document.body;
    const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    const res = document.createElement('div'); res.id = 'resbar'; res.className = 'glass';
    res.innerHTML = [0, 1, 2, 3].map(function (k) { return '<span class="r' + (k === 3 ? ' lum' : '') + '" id="res' + k + '" data-res="' + k + '" title="' + (k === 3 ? 'Lumen: the rare thing every star wants. Click to see all about it.' : G.RES[k].charAt(0).toUpperCase() + G.RES[k].slice(1) + ' in the store. Click to see all about it.') + '"><img alt="" src="' + icon(k) + '"><b>0</b><small>' + G.RES[k] + '</small></span>'; }).join('') +
      '<span class="sep"></span><span class="r" id="resPop" style="cursor:default" title="How many live on your star (and how many of them work)"><b>0</b><small>alive</small></span><span class="r warn" id="resRaid" style="display:none"><small style="color:#ffd0a8"></small></span>';
    root.appendChild(res); res.addEventListener('click', function (e) { const r = e.target.closest ? e.target.closest('[data-res]') : null; if (r && C.cardOpen) C.cardOpen({ k: 'res', res: +r.dataset.res }); });
    const cmd = document.createElement('div'); cmd.id = 'cmd'; cmd.className = 'glass' + (folded ? ' fold' : '');
    cmd.innerHTML = '<div class="ch" id="cmdHead" title="Fold or unfold"><b id="cmdTitle">YOUR COLONY</b><small id="cmdStage" title="How far your colony has come: founded, growing, thriving, great. It grows as you build."></small><span id="cmdFoldMark">' + (folded ? '+' : '–') + '</span></div><div class="cb"><div id="cmdStar"></div><canvas id="cmdMap" width="460" height="208" title="The whole star. Yours are blue, enemies red. Click to go there."></canvas>' +
      '<div class="csec"><span>TRADES</span><small>have · want</small></div>' +
      ORDER.map(function (k) { return '<div class="crow" data-job="' + k + '" title="' + esc(TIPS[k]) + '">' + svg(k) + '<span class="nm" data-all="' + k + '">' + JOBS[k].name + 's</span><span class="cn" id="cn' + k + '">0</span><button data-want="' + k + '" data-d="-1" aria-label="fewer ' + JOBS[k].many + '">−</button><span class="cw" id="cw' + k + '">0</span><button data-want="' + k + '" data-d="1" aria-label="more ' + JOBS[k].many + '">+</button></div>'; }).join('') +
      '<div class="crow" title="Those with no trade: they live by their own brains, as all of them used to.">' + svg('', '#9fb6c6') + '<span class="nm" data-all="">Free</span><span class="cn" id="cnfree">0</span><span style="width:82px;font-size:10px;color:rgba(207,232,255,.5);text-align:right;flex:none">no orders</span></div>' +
      '<div class="csec"><span>BUILD</span><label title="When it is on, the kinds of your star also build what they themselves decide on, as they always did."><input type="checkbox" id="cmdAuto">they build too</label></div>' +
      '<div class="cgrid">' + BUILD.map(function (t) { return '<button data-build="' + t + '" title="' + esc(G.BUILDABLE[t].name + ': ' + G.BUILDABLE[t].note) + '"><img alt="" data-pic="' + t + '"><span>' + esc(G.BUILDABLE[t].name) + '</span></button>'; }).join('') + '</div><button id="cmdPick" title="For a screen with no second button: press, then touch one of yours to choose it">Choose by touch</button>' +
      '<div class="cq" id="cmdQ"></div><div class="ctip dim" id="cmdTip"></div><div class="ckeys"><span id="cmdKeys"></span> <a id="cmdSwap" title="Swap what the two mouse buttons do">swap</a></div></div>';
    root.appendChild(cmd);
    cmd.addEventListener('click', function (e) {
      const t = e.target, b = t.closest ? t.closest('[data-want],[data-all],[data-build],[data-cancel],[data-found],[data-seeheart],#cmdHead,#cmdSwap,#cmdPick,#cmdMap') : null; if (!b) return;
      if (b.id === 'cmdMap') { mapGo(e); return; }
      if (b.id === 'cmdSwap') { C.rightChooses = !C.rightChooses; try { localStorage.setItem('primordia.mouse', C.rightChooses ? 'R' : 'L'); } catch (e2) { /* not kept */ } say('Swapped. ' + mouseWords(), 8); sig = ''; return; }
      if (b.id === 'cmdPick') { C.pick = !C.pick; C.placing = null; say(C.pick ? 'Now touch one of yours on the star to choose it.' : '', 6); sig = ''; return; }
      if (b.dataset.found) { const why = G.foundOutpost(); if (why) say(why, 6); sig = ''; return; }
      if (b.dataset.seeheart) { const h = G.foeHeart(G.W); if (h) { G.select(null); G.focusOn(h.x, h.y, 1.4); } return; }
      if (b.id === 'cmdHead') { folded = !folded; cmd.classList.toggle('fold', folded); $('cmdFoldMark').textContent = folded ? '+' : '–'; try { localStorage.setItem('primordia.cmdFold', folded ? '1' : '0'); } catch (e2) { /* not kept */ } sig = ''; return; }
      if (b.dataset.want !== undefined) C.want(b.dataset.want, (+b.dataset.d) * (e.shiftKey ? 5 : 1));
      else if (b.dataset.all !== undefined) C.all(b.dataset.all);
      else if (b.dataset.build) C.build(b.dataset.build);
      else if (b.dataset.cancel) { G.buildCancel(+b.dataset.cancel); sig = ''; }
    });
    cmd.addEventListener('change', function (e) { if (e.target && e.target.id === 'cmdAuto') { G.colony().auto = !!e.target.checked; say(e.target.checked ? 'The kinds of your star build what they decide on too.' : 'Nothing is built now but what you order.', 5); if (G.markDirty) G.markDirty(); } });
    const sel = document.createElement('div'); sel.id = 'selbar'; sel.className = 'glass hide';
    sel.innerHTML = '<div class="s1"><b id="selN"></b><span class="what" id="selWhat"></span>' + ORDER.map(function (k) { return '<button data-job="' + k + '" title="' + esc(TIPS[k]) + '">' + svg(k) + JOBS[k].name.toUpperCase() + '</button>'; }).join('') + '<button data-job="" title="No trade: it lives by its own brain">FREE</button><button class="x" id="selX" title="Let them go (Esc, or right-click on bare ground)">✕</button></div><div class="s2" id="selHint"></div>';
    root.appendChild(sel);
    sel.addEventListener('click', function (e) { const b = e.target.closest ? e.target.closest('button') : null; if (!b) return; if (b.id === 'selX') { C.clear(); G.select(null); } else if (b.dataset.job !== undefined) C.job(b.dataset.job); });
    return (ui = { res: res, cmd: cmd, sel: sel });
  }

  // ── the small map: the whole star at a glance ──
  function mapGo(e) { const W = G.W, cv = $('cmdMap'); if (!W || !cv) return; const r = cv.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * W.ww, y = (e.clientY - r.top) / r.height * W.wh; G.cam.x = x; G.cam.y = y; if (G.cam.z < 1) G.cam.z = 1; G.applyCam(); }
  function drawMap() {
    const cv = $('cmdMap'), W = G.W; if (!cv || !W || cv.offsetParent === null) return; const x = cv.getContext('2d'), w = cv.width, h = cv.height, kx = w / W.ww, ky = h / W.wh, sy = G.shoreY(W), TL = G.terrainLook ? G.terrainLook(W) : null, t = now();
    const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, TL ? TL.basin[0] : '#16405a'); g.addColorStop(1, TL ? TL.basin[2] : '#0a1c2c'); x.fillStyle = g; x.fillRect(0, 0, w, h);
    if (!G.FLAT) { x.fillStyle = TL ? TL.high[1] : '#6a8050'; x.fillRect(0, 0, w, sy * ky); x.fillStyle = TL ? TL.rim : 'rgba(255,255,255,.5)'; x.fillRect(0, sy * ky - 1, w, 2); }
    if (G.sitesOf) G.sitesOf(W).forEach(function (q) { if (q.k === 'lumen') return; x.fillStyle = q.k === 'grove' ? 'rgba(90,220,150,0.34)' : q.k === 'quarry' ? 'rgba(170,180,195,0.5)' : q.k === 'reeds' ? 'rgba(180,210,100,0.42)' : 'rgba(240,220,180,0.42)'; x.beginPath(); x.ellipse(q.x * kx, q.y * ky, q.r * kx, q.r * 0.8 * ky, 0, 0, 6.2832); x.fill(); });
    (W.grounds || []).forEach(function (q) { x.strokeStyle = 'rgba(' + C.TEAM.mine + ',0.75)'; x.lineWidth = 2; x.beginPath(); x.ellipse(q.x * kx, q.y * ky, q.w / 2 * kx, q.h / 2 * ky, 0, 0, 6.2832); x.stroke(); });
    (G.lumenNodes(W) || []).forEach(function (q) { if (q.n <= 0) return; x.fillStyle = '#8ef0ff'; x.beginPath(); x.moveTo(q.x * kx, q.y * ky - 7); x.lineTo(q.x * kx + 5, q.y * ky); x.lineTo(q.x * kx, q.y * ky + 7); x.lineTo(q.x * kx - 5, q.y * ky); x.closePath(); x.fill(); });
    (W.works || []).forEach(function (wk) { if (!wk.bp || wk.away) return; const hx = wk.x * kx, hy = (wk.y + wk.bp.S * 0.45) * ky, s = wk.bp.type === 'heart' ? 9 : 6; x.fillStyle = wk.enemy ? C.TEAM.foeHex : wk.bp.type === 'heart' ? '#f6d365' : 'rgba(225,238,250,0.9)'; x.fillRect(hx - s / 2, hy - s, s, s); x.strokeStyle = '#0b1622'; x.lineWidth = 1; x.strokeRect(hx - s / 2, hy - s, s, s); });
    const blink = Math.sin(t / 130) > 0;
    for (let i = 0; i < W.cre.length; i++) { const c = W.cre[i]; if (c.dead || c.inShip) continue; const px = c.x * kx, py = c.y * ky;
      if (c.team === 1) { x.fillStyle = blink ? '#fff' : C.TEAM.foeHex; x.fillRect(px - 3, py - 3, 6, 6); }
      else if (!c.team && c.job) { x.fillStyle = C.TEAM.mineHex; x.fillRect(px - 2, py - 2, 4, 4); }
      else { x.fillStyle = c.team ? 'rgba(200,200,200,0.35)' : 'rgba(' + C.TEAM.mine + ',0.4)'; x.fillRect(px - 1, py - 1, 2, 2); } }
    C.sel.forEach(function (c) { x.strokeStyle = '#fff'; x.lineWidth = 1.5; x.strokeRect(c.x * kx - 4, c.y * ky - 4, 8, 8); });
    { const r = W.col && W.col.raid; if (r && r.state !== 'warn') { x.fillStyle = C.TEAM.foeHex; x.beginPath(); x.moveTo(r.x * kx, r.y * ky - 12); x.lineTo(r.x * kx + 7, r.y * ky); x.lineTo(r.x * kx - 7, r.y * ky); x.closePath(); x.fill(); } }
    const v = G.view; x.strokeStyle = 'rgba(255,255,255,0.9)'; x.lineWidth = 2; x.strokeRect(Math.max(1, -v.ox / v.scale * kx), Math.max(1, -v.oy / v.scale * ky), Math.min(w - 2, v.w / v.scale * kx), Math.min(h - 2, v.h / v.scale * ky));
  }

  /** what there is to do next: the first thing on the road from a handful of creatures to a star that holds its own (said in the panel) */
  function goal(W, col, n) {
    if (W.farOf) return ''; const Wk = W.works || [], has = function (t) { return Wk.some(function (w) { return w.bp && w.bp.type === t && !w.visitor && !w.enemy; }); }, tower = Wk.some(function (w) { return w.tower; }), r = col.raid;
    if (r && r.state === 'warn' && n.f + n.u < Math.max(3, r.n - 2)) return 'NEXT: a raid of about ' + r.n + ' lands next spring. Press + next to Fighters until you have ' + Math.max(3, r.n - 1) + ' or more.';
    if (n.g < 3) return 'NEXT: press + next to Gatherers. They fill the store, and the store is what everything is built from.';
    if (n.b < 2) return 'NEXT: press + next to Builders (two at least). Then pick something under BUILD and click a lot for it.';
    if (!Wk.some(function (w) { return w.bp && w.bp.type !== 'heart' && !w.visitor; }) && !col.queue.length && !(W.deed && W.deed.ordered)) return 'NEXT: order a House: click House under BUILD, then click one of the lots marked on the star.';
    if (n.f + n.u < 4) return 'NEXT: rival stars will raid you' + (col.nextRaid ? ' (about year ' + (col.nextRaid + 1) + ')' : '') + '. Press + next to Fighters: four or more. They form up on the muster ground.';
    if (!tower && col.stock[3] < 3) return 'NEXT: lumen. Choose some gatherers (click the word Gatherers) and click a crystal (LUMEN on the star). 3 lumen builds a Tower.';
    if (!tower && !col.queue.some(function (q) { return q.type === 'tower'; })) return 'NEXT: build a Tower near the Heart (3 lumen). It strikes at raiders by itself.';
    if (!has('port')) return 'NEXT: a Spaceport. A starship is built on it.';
    if (!has('ship')) return 'NEXT: a Starship (it is built on the spaceport). It carries a crew to other stars.';
    if (!G.starsHeld || !G.starsHeld().length) return 'NEXT: open SPACE and send the ship out (4 lumen). Found an outpost on a free star, or break a rival\'s Heart: the star is yours.';
    if (G.far && !G.far.won) return 'NEXT: take every rival star near you, and this corner of space is yours.';
    return 'Every rival near you has fallen. The stars are yours.';
  }
  function refresh() {
    const W = G.W, on = live(); build(); document.body.classList.toggle('cmdOpen', on && !folded); document.body.classList.toggle('cmdLive', on);
    ui.res.style.display = on && G.heartOf(W) ? '' : 'none'; ui.cmd.style.display = on ? '' : 'none'; if (!on) { ui.sel.classList.add('hide'); return; }
    if (window.innerWidth > 720) { let y = 14; ['wish', 'wxnow', 'voybar', 'voypick'].forEach(function (id) { const e = $(id); if (e && !e.classList.contains('hide') && e.offsetHeight) { const r = e.getBoundingClientRect(); if (r.top < 140 && Math.abs((r.left + r.right) / 2 - window.innerWidth / 2) < 260) y = Math.max(y, r.bottom + 8); } }); if (ui.res.style.top !== y + 'px') ui.res.style.top = y + 'px'; }
    if (!folded && window.innerWidth > 720) { const tb = $('toolbar'), tbTop = tb && !tb.classList.contains('hide') && tb.offsetHeight ? tb.getBoundingClientRect().top : window.innerHeight - 70, key = window.innerHeight + ':' + Math.round(tbTop);
      if (key !== fitKey) { fitKey = key; const avail = tbTop - 8 - ui.cmd.getBoundingClientRect().top, V = [[0, 0, 0], [0, 1, 0], [1, 0, 0], [1, 1, 0], [1, 1, 1]];      /* (the fullest lay-out that fits: first without the keys, then without the small map, then smaller still) */
        for (let i = 0; i < V.length; i++) { ui.cmd.classList.toggle('short', !!V[i][0]); ui.cmd.classList.toggle('tiny', !!V[i][1]); ui.cmd.classList.toggle('mini', !!V[i][2]); if (ui.cmd.offsetHeight <= avail) break; } }
      const se = $('season'), ct = $('capTitle'), cx = $('capText'); if (se && ct && cx) { const tt = ct.textContent + ': ' + cx.textContent; if (se.title !== tt) se.title = tt; } }      /* (what the season is about, now said when the pointer rests on its card) */
    else { const se = $('season'), ct = $('capTitle'), cx = $('capText'); if (se && ct && cx) { const tt = ct.textContent + ': ' + cx.textContent; if (se.title !== tt) se.title = tt; } }
    C.sel = C.sel.filter(mine); if (!folded) drawMap();
    const col = G.colony(W), n = G.jobCount(W), hp = G.heartOf(W), hc = hp ? G.buildCount(hp) : [0, 0, 1];
    const selSig = C.sel.length + ':' + C.sel.map(function (c) { return c.job || '-'; }).join('');
    const s = [col.stock.join(','), JSON.stringify(n), JSON.stringify(col.want), col.queue.map(function (q) { return q.id; }).join('.'), W.deed && W.deed.ordered ? W.deed.title + (W.deed.wait || '') + (W.deed.placed || 0) : '', C.placing, C.pick, C.rightChooses, selSig, tip && now() < tipUntil ? tip : '', col.auto, folded, hc.join('/'), col.tier | 0, col.raid ? col.raid.state + col.raid.id : '', (W.works || []).length, G.starsHeld ? G.starsHeld().length : 0, G.starPanel ? G.starPanel(W) : ''].join('|');
    if (s === sig) return; sig = s;
    for (let k = 0; k < 4; k++) { const e = $('res' + k); e.querySelector('b').textContent = col.stock[k]; }
    { const sh = G.starPanel ? G.starPanel(W) : '', se = $('cmdStar'); if (se._h !== sh) { se._h = sh; se.innerHTML = sh; } }
    $('resPop').querySelector('b').textContent = n.all; $('resPop').title = n.all + ' live on your star: ' + (n.all - n.free) + ' work, ' + n.free + ' are free.';
    { const w = $('resRaid'), r = col.raid; w.style.display = r && r.state === 'warn' ? '' : 'none'; if (r && r.state === 'warn') { w.querySelector('small').textContent = 'raid next spring: ~' + r.n; w.title = G.raidText(W) + '.'; } }
    ORDER.forEach(function (k) { const a = $('cn' + k); a.textContent = n[k]; a.classList.toggle('low', n[k] < (col.want[k] | 0)); $('cw' + k).textContent = col.want[k] | 0; });
    { const tn = G.TIERS && !W.farOf ? G.TIERS[col.tier | 0] : '', e = $('cmdStage'); if (e && e.textContent !== tn) e.textContent = tn; }
    $('cnfree').textContent = n.free; $('cmdAuto').checked = col.auto !== false; $('cmdKeys').textContent = mouseWords(); $('cmdPick').classList.toggle('on', C.pick);
    const imgs = ui.cmd.querySelectorAll('img[data-pic]'); for (let i = 0; i < imgs.length; i++) { const u = pic(imgs[i].dataset.pic); if (u && imgs[i].getAttribute('src') !== u) imgs[i].src = u; }
    const bs = ui.cmd.querySelectorAll('[data-build]'); for (let i = 0; i < bs.length; i++) { const t = bs[i].dataset.build, K = G.BUILDABLE[t]; bs[i].classList.toggle('on', C.placing === t); bs[i].classList.toggle('no', !!(K.cost && K.cost.some(function (v, q) { return v > col.stock[q]; })) || (t === 'ship' && !!G.buildOk('ship', 0, 0))); }
    { const d = W.deed && W.deed.ordered ? W.deed : null, rows = []; if (d) { const c = d.bp ? G.buildCount(d) : null; rows.push('<div><span><b>' + esc(d.title) + '</b> ' + (c ? c[0] + ' of ' + c[2] + ' pieces' : 'being laid out') + (d.wait ? ' · waiting for ' + esc(d.wait) : '') + '</span></div>'); }
      col.queue.slice(0, d ? 1 : 2).forEach(function (q, i) { rows.push('<div><span>' + esc(q.name) + ' · ' + (n.b < 2 ? 'needs 2 builders' : !d && i === 0 && W.deed ? 'after the ' + esc(W.deed.title || 'plan') : 'waiting') + '</span><a data-cancel="' + q.id + '" title="Do not build it">✕</a></div>'); });
      if (col.queue.length > (d ? 1 : 2)) rows[rows.length - 1] = rows[rows.length - 1].replace('</span>', ' (+' + (col.queue.length - (d ? 1 : 2)) + ' more)</span>');
      $('cmdQ').innerHTML = rows.join(''); }
    { const t = $('cmdTip'), live2 = tip && now() < tipUntil; const gl = !live2 && !C.placing ? goal(W, col, n) : ''; t.textContent = live2 ? tip : C.placing ? 'Click a lot for the ' + G.BUILDABLE[C.placing].name + '. Right-click to let it be.' : gl || mouseWords(); t.classList.toggle('dim', !live2 && !C.placing && !gl); t.classList.toggle('goal', !!gl); }
    // those you have chosen
    const m = C.sel.length; ui.sel.classList.toggle('hide', !m);
    if (m) { const by = {}; let high = 0; C.sel.forEach(function (c) { by[c.job || ''] = (by[c.job || ''] || 0) + 1; if (c.ph.home) high++; });
      $('selN').textContent = m === 1 ? '1 CHOSEN' : m + ' CHOSEN'; $('selWhat').textContent = ORDER.concat(['']).filter(function (k) { return by[k]; }).map(function (k) { return by[k] + ' ' + (k ? (by[k] === 1 ? JOBS[k].name.toLowerCase() : JOBS[k].many) : 'free'); }).join(', ');
      const bb = ui.sel.querySelectorAll('button[data-job]'); for (let i = 0; i < bb.length; i++) bb[i].classList.toggle('on', Object.keys(by).length === 1 && by[bb[i].dataset.job] === m);
      $('selHint').textContent = (FLAT() ? '' : high && high < m ? high + ' of the high ground, ' + (m - high) + ' of the low. ' : high ? 'Of the high ground. ' : 'Of the low ground. ') + (C.rightChooses ? 'Left-click the star: they go there. On an enemy: attack. On a crystal or a thing lying about: gather it.' : 'Right-click the star: they go there. On an enemy: attack. On a crystal or a thing lying about: gather it.');
      const tb = $('toolbar'), ins = $('inspector'); if (tb && window.innerWidth > 1180) { ui.sel.style.left = Math.round(tb.getBoundingClientRect().right + 12) + 'px'; const insOpen = (ins && !ins.classList.contains('hide') && ins.offsetHeight) || (C.cardShown && C.cardShown()); ui.sel.style.maxWidth = 'calc(100vw - ' + Math.round(tb.getBoundingClientRect().right + 26 + (insOpen ? 322 : 0)) + 'px)'; $('selHint').style.display = insOpen ? 'none' : ''; } else { ui.sel.style.left = ''; ui.sel.style.maxWidth = ''; } }
  }
  C.poke = function () { sig = ''; };

  /** take the view to where the enemy is (their raiders, or the ship they came in) */
  C.seeFoes = function () { const W = G.W; if (!W) return; const L = W.cre.filter(function (c) { return c.team === 1 && !c.dead; }), r = G.colony(W).raid; let x = 0, y = 0; if (L.length) { L.forEach(function (c) { x += c.x; y += c.y; }); x /= L.length; y /= L.length; } else if (r && r.state !== 'warn') { x = r.x; y = r.y; } else return; G.select(null); G.focusOn(x, y, 1.5); };
  G.on('raid-warn', function (r) { if (G.mode !== 'play') return; G.banner('A raid is coming', 'The colony of ' + r.name + ' is sending a ship: about ' + r.n + ' raiders will land next spring, and go for your Heart. Name fighters and guards: they form up by it.', 9000); if (G.log) G.log('sel', 'A raid is coming', 'From ' + r.name + ': about ' + r.n + ' raiders, next spring. If the Heart falls they take what is in the store.'); if (G.hub) G.hub.poke(); sig = ''; });
  G.on('raid-land', function (r) { if (G.mode !== 'play') return; if (G.speed > 4) G.setSpeed(1); G.banner('Raid', 'The raiders of ' + r.name + ' are landing on your star! ' + (G.jobCount().f + G.jobCount().u ? 'Your fighters and guards will meet them.' : 'You have no fighters: name some, quickly.'), 8000); sig = ''; });
  G.on('raid-over', function (r, how) { if (G.mode !== 'play') return; if (how === 'beaten') { G.banner('The raid is beaten', 'Every raider of ' + r.name + ' is slain. You took ' + r.loot + ' lumen from their ship.', 8000); if (G.log) G.log('sel', 'Raid beaten', 'The raiders of ' + r.name + ' are all slain: ' + r.loot + ' lumen taken from their ship.'); } else if (how === 'worn') { if (G.note) G.note('The raid', 'The raiders of ' + r.name + ' have given up and are going home.'); } if (G.hub) G.hub.poke(); sig = ''; });
  if (G.hub) { G.hub.add(function (W) { const col = W.col, r = col && col.raid; if (!r || W.farOf) return null; const txt = G.raidText(W), hp = G.heartOf(W), hc = hp ? G.buildCount(hp) : [0, 0, 1], n = G.jobCount(W);
      const row = G.hub.row({ icon: '!', title: r.state === 'warn' ? 'A raid is coming' : 'Raid', tag: r.state === 'warn' ? 'next spring' : r.state === 'on' ? (r.left || r.n) + ' raiders' : '', bad: true, sub: esc(txt) + '. You have <b>' + n.f + ' fighters</b> and <b>' + n.u + ' guards</b>; the Heart has ' + hc[0] + ' of ' + hc[2] + ' pieces.', act: r.state === 'warn' ? '' : 'foes', live: r.state !== 'warn' });
      return { sig: 'raid' + r.id + r.state + (r.left || 0) + hc[0] + n.f + n.u, dangers: [row], alarm: ['raid' + r.id + r.state], alarmRows: [row] }; }); G.hub.act('foes', function () { C.seeFoes(); }); }
  let hitSaid = 0;
  G.on('work-hit', function (w, by) { if (G.mode !== 'play' || !w.bp) return; w.hitAt = now(); if (w.bp.type === 'heart' && !w.enemy && by && by.team && now() - hitSaid > 25000) { hitSaid = now(); G.banner('Raid', 'Your Heart is under attack! Choose your fighters (click the word Fighters in the colony panel) and click the enemy.', 7000); if (G.log) G.log('sel', 'The Heart is under attack', 'Raiders are breaking it piece by piece. If it falls they take everything in the store.'); } });
  G.on('heart-fell', function (h, by, taken) { if (G.mode !== 'play') return; const got = (taken || []).map(function (n, k) { return n ? n + ' ' + G.RES[k] : ''; }).filter(Boolean).join(', '); G.banner('The Heart has fallen', 'The raiders broke your Heart' + (got ? ' and took what was in the store: ' + got : '') + '. They are going home. Your builders will raise it again.', 8000); if (G.log) G.log('sel', 'The Heart has fallen', (got ? 'Taken from the store: ' + got + '. ' : '') + 'Your builders will raise it again, piece by piece.'); });
  G.on('colony-tier', function (tr, was) { if (G.mode !== 'play' || !G.TIERS) return; G.banner('Your colony grows', 'Your colony was ' + G.TIERS[was].toLowerCase() + ': it is ' + G.TIERS[tr].toLowerCase() + ' now. The Heart is built up to match, its ground is paved wider, and its reach grows.', 9000); if (G.log) G.log('disc', 'A ' + G.TIERS[tr].toLowerCase(), 'What was a ' + G.TIERS[was].toLowerCase() + ' has become a ' + G.TIERS[tr].toLowerCase() + '.'); sig = ''; });
  G.on('heart-whole', function () { if (G.mode === 'play' && G.note) G.note('The Heart', 'The Heart is whole again.'); });
  G.on('build-started', function (o) { if (G.mode === 'play') say('Your builders have started on the ' + o.name + '.', 6); });
  G.on('deed-end', function (d, how) { if (G.mode === 'play' && d && d.ordered) { say(how === 'done' ? 'The ' + d.title + ' is finished.' : 'The ' + d.title + ' was given up: too few builders came to it.', 8); sig = ''; } });

  // the first time a colony is shown: how the mouse works
  let told = false; try { told = localStorage.getItem('primordia.cmdTold3') === '1'; } catch (e) { told = false; }
  function tellOnce() { if (told || !live() || G.W.farOf || G.W.gen < 2) return; told = true; try { localStorage.setItem('primordia.cmdTold3', '1'); } catch (e) { /* not kept */ }
    G.banner('You command this star', 'Its creatures are your colony. Give them trades in the panel on the left (+ and −). RIGHT button: choose (click one of yours, or drag a box). LEFT click: send those you chose. Left-drag moves the view, as always.', 14000); }

  // ── keeping it all going ──
  G.addSystem({ name: 'command',
    update: function (dt) {
      const T = now(); if (T - lastT > 250) { lastT = T; try { refresh(); tellOnce(); } catch (e) { console.error(e); } }
      // the view is moved with W A S D or the arrow keys
      if (G.mode === 'play' && G.W && !G.isBlocked() && !(document.activeElement && /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName))) { const K = G.input.keys, dx = (K.d || K.ArrowRight ? 1 : 0) - (K.a || K.ArrowLeft ? 1 : 0), dy = (K.s || K.ArrowDown ? 1 : 0) - (K.w || K.ArrowUp ? 1 : 0); if (dx || dy) { const sp = 620 / G.view.scale * Math.min(0.05, dt || 0.016); G.cam.x += dx * sp; G.cam.y += dy * sp; G.applyCam(); } }
    } });
})();
