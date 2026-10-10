// ── Cards for what the colony lives on ──
// Click a stand of lumen, a stone, reed or shell lying about, or one of the four numbers in the store bar, and its card opens (bottom right, where
// every card opens): a picture of it, how much there is here and in the store, where it is found, what it is for, who is gathering it now, and a
// button to send gatherers for it. A creature's own card also says which side it is on and what its trade is (G.unitTags).
(function () {
  'use strict';
  if (typeof document === 'undefined' || !G.cmd) return;
  const C = G.cmd, RES = G.RES, $ = function (id) { return document.getElementById(id); };
  const esc = function (s) { return String(s === undefined || s === null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  const WHAT = [
    { name: 'Stone', sub: 'what most things are built of', where: 'In the QUARRY. More turns up there by itself.', use: 'Building: every piece of a building is one stone, reed or shell. Mending the Heart.' },
    { name: 'Reed', sub: 'the light stuff of roofs and flags', where: 'In the REED BED. It grows back.', use: 'Building: every piece of a building is one stone, reed or shell. Mending the Heart.' },
    { name: 'Shell', sub: 'what is left when something dies', where: 'In the SHELL BED, and wherever something of the star died.', use: 'Building: every piece of a building is one stone, reed or shell. Mending the Heart.' },
    { name: 'Lumen', sub: 'the rare thing every star wants', where: 'It grows as crystals in a few places on the star. A piece grows back every other year.', use: 'A Tower: 3. Sending a starship out: 4. Rivals raid you for it; beating a raid wins some.' }];
  let el = null, cur = null, sig = '', pic = null;
  function build() {
    if (el) return; const st = document.createElement('style');
    st.textContent = '#rescard{position:fixed;right:14px;bottom:14px;width:306px;height:356px;box-sizing:border-box;padding:12px;z-index:5;font:12px system-ui,sans-serif;color:#dcecf8;display:flex;flex-direction:column}#rescard.hide{display:none}' +
      '#rescard .rh{display:flex;gap:10px;align-items:center;height:92px;flex:none}#rescard .rh canvas{width:92px;height:92px;flex:none;border-radius:12px;background:rgba(7,18,31,.5);border:1px solid rgba(207,232,255,.18)}#rescard .rh b{display:block;font-size:15px;color:#fff}#rescard .rh small{display:block;font-size:11px;line-height:1.3;color:rgba(207,232,255,.75)}#rescard .rh .big{font:800 22px system-ui;color:#8ef0ff;margin-top:4px}' +
      '#rescard .x{margin-left:auto;align-self:flex-start;background:none;border:0;color:#cfe8ff;cursor:pointer;font:700 18px system-ui;width:30px;height:30px;flex:none}' +
      '#rescard .rr{flex:1;min-height:0;overflow:hidden;margin-top:8px}#rescard .rr div{display:flex;gap:8px;padding:4px 0;border-top:1px solid rgba(207,232,255,.1);font-size:11.5px;line-height:1.3}#rescard .rr div span:first-child{flex:none;width:62px;font:700 9.5px system-ui;letter-spacing:.1em;color:rgba(207,232,255,.55);text-transform:uppercase;padding-top:2px}' +
      '#rescard .rb{display:flex;gap:6px;flex-wrap:wrap;flex:none;margin-top:8px}#rescard .rb button{appearance:none;border:1px solid rgba(207,232,255,.3);background:rgba(7,18,31,.5);color:#e8f4ff;border-radius:999px;padding:6px 11px;font:800 10.5px system-ui;letter-spacing:.07em;cursor:pointer}#rescard .rb button:hover{border-color:#33d6a6}#rescard .rb button.go{border-color:' + C.TEAM.mineHex + ';color:#bfe9ff}';
    document.head.appendChild(st);
    el = document.createElement('div'); el.id = 'rescard'; el.className = 'glass hide';
    el.innerHTML = '<div class="rh"><canvas id="rcPic" width="184" height="184"></canvas><div style="min-width:0"><b id="rcName"></b><small id="rcSub"></small><div class="big" id="rcBig"></div></div><button class="x" id="rcX" aria-label="close">✕</button></div><div class="rr" id="rcRows"></div><div class="rb" id="rcBtns"></div>';
    (document.getElementById('ui') || document.body).appendChild(el); pic = $('rcPic');
    el.addEventListener('click', function (e) { const b = e.target.closest ? e.target.closest('button') : null; if (!b) return; if (b.id === 'rcX') { C.cardClose(); return; } const a = b.dataset.act; if (a === 'send') send(); else if (a === 'show') show(+b.dataset.i); if (G.sfx) G.sfx('click'); });
  }
  const kOf = function (o) { return o.k === 'node' ? 3 : o.k === 'mat' ? o.mat.k : o.res; };
  /** who is out for this resource now */
  function busy(W, k) { let n = 0; for (let i = 0; i < W.cre.length; i++) { const c = W.cre[i]; if (c.dead || c.team || c.job !== 'g') continue; if ((c.gj && c.gj.k === k) || c.haul === k) n++; } return n; }
  function send() {
    const W = G.W, o = cur; if (!o || !W) return; const k = kOf(o); let at = o.k === 'node' ? o.node : o.k === 'mat' ? o.mat : null;
    if (!at) { if (k === 3) at = G.lumenNodes(W).filter(function (q) { return q.n > 0; })[0]; else at = (W.mats || []).filter(function (q) { return q.k === k; })[0]; }
    if (!at) { C.say('There is no ' + RES[k] + ' to be had on this star just now.', 5); return; }
    let L = C.sel.filter(C.mine);
    if (!L.length) { L = W.cre.filter(function (c) { return C.mine(c) && c.job === 'g' && !c.hungry && G.canReach(W, c, at.y); }).sort(function (a, b) { return Math.hypot(a.x - at.x, a.y - at.y) - Math.hypot(b.x - at.x, b.y - at.y); }).slice(0, 3); if (!L.length) { C.say('No gatherer can go there. Press + next to Gatherers' + (W.cre.some(function (c) { return C.mine(c) && c.job === 'g'; }) ? '.' : '.'), 6); return; } }
    G.order(L, { x: at.x, y: at.y, mat: k }); if (C.orderFx) C.orderFx({ x: at.x, y: at.y }, k === 3 ? '120,235,255' : '242,193,78', L.map(C.pos)); C.say((L.length === 1 ? 'One gatherer is' : L.length + ' gatherers are') + ' to bring in ' + RES[k] + ' from here. Their children will too.', 6); sig = '';
  }
  function show(i) { const W = G.W, N = G.lumenNodes(W), q = cur && cur.k === 'node' ? cur.node : N[i] || N[0]; if (q) G.focusOn(q.x, q.y - 20, 1.5); }
  function paint(o, t) {
    const x = pic.getContext('2d'), k = kOf(o); x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, 184, 184);
    if (k === 3) { x.translate(92, 150); x.scale(1.9, 1.9); const q = o.k === 'node' ? o.node : { n: 12, n0: 12 }; C.drawLumen(x, 0, 0, q.n, q.n0 || q.n, t, 1); }
    else { x.translate(92, 100); x.scale(7, 7); x.lineJoin = 'round'; for (let j = 0; j < 3; j++) G.matDraw(x, { x: (j - 1) * 7, y: j === 1 ? -3 : 2, k: k, s: 0.2 + j * 0.3 }, t); }
  }
  function render() {
    const W = G.W, o = cur; if (!o || !W || !C.live()) { if (cur) C.cardClose(); return; } const k = kOf(o), col = G.colony(W), K = WHAT[k], lying = k === 3 ? G.lumenNodes(W).reduce(function (a, q) { return a + Math.max(0, q.n); }, 0) : (W.mats || []).filter(function (q) { return q.k === k; }).length;
    if (o.k === 'mat' && (W.mats || []).indexOf(o.mat) < 0) { cur = { k: 'res', res: k }; }      // (somebody picked it up: the card goes on as the card of its sort)
    const here = o.k === 'node' ? o.node.n + ' of ' + (o.node.n0 || o.node.n) + ' pieces in this stand' : lying + (k === 3 ? ' pieces in ' + G.lumenNodes(W).filter(function (q) { return q.n > 0; }).length + ' stands' : ' lying about on the star'), out = busy(W, k), n = G.jobCount(W);
    paint(cur, G.rt || 0);
    const s = [cur.k, k, here, col.stock[k], col.got[k], out, n.g, C.sel.length].join('|'); if (s === sig) return; sig = s;
    $('rcName').textContent = o.k === 'node' ? 'Lumen crystals' : K.name; $('rcSub').textContent = K.sub; $('rcBig').innerHTML = col.stock[k] + ' <span style="font:700 10px system-ui;letter-spacing:.1em;color:rgba(207,232,255,.6)">IN THE STORE</span>'; $('rcBig').style.color = k === 3 ? '#8ef0ff' : '#ffe9a8';
    $('rcRows').innerHTML = '<div><span>Here</span><span>' + esc(here) + '.</span></div><div><span>Where</span><span>' + esc(K.where) + '</span></div><div><span>For</span><span>' + esc(K.use) + '</span></div><div><span>Now</span><span>' + (out ? out + (out === 1 ? ' gatherer is' : ' gatherers are') + ' out for it' : 'Nobody is out for it') + ' (you have ' + n.g + (n.g === 1 ? ' gatherer' : ' gatherers') + '). ' + col.got[k] + ' brought in so far.</span></div>';
    $('rcBtns').innerHTML = '<button class="go" data-act="send">' + (C.sel.length ? 'SEND THE ' + C.sel.length + ' CHOSEN FOR IT' : 'SEND 3 GATHERERS FOR IT') + '</button>' + (k === 3 ? '<button data-act="show" data-i="0">SHOW IT</button>' : '');
  }
  C.cardShown = function () { return !!cur; };
  C.cardClose = function () { if (!cur) return false; cur = null; sig = ''; if (el) el.classList.add('hide'); if (C.poke) C.poke(); return true; };
  C.cardOpen = function (o) { build(); cur = o; sig = ''; if (G.select) G.select(null); if (G.selectThing) G.selectThing(null); if (G.selectZone) G.selectZone(null); el.classList.remove('hide'); render(); if (C.poke) C.poke(); };
  /** a click on the star with nobody chosen: is it on a stand of lumen, or on something lying about? */
  C.cardClick = function (p) {
    const W = G.W; if (!W) return false; if (C.under(p, null, 2 / G.view.scale)) { C.cardClose(); return false; }      // (a creature is under the pointer: its own card)
    const N = G.lumenNodes(W); for (let i = 0; i < N.length; i++) { const q = N[i]; if (Math.abs(p.x - q.x) < 40 && p.y > q.y - 60 && p.y < q.y + 22) { C.cardOpen({ k: 'node', node: q }); return true; } }
    const R = Math.max(13, 15 / G.view.scale), M = W.mats || []; let best = null, bd = R * R; for (let i = 0; i < M.length; i++) { const d = (M[i].x - p.x) * (M[i].x - p.x) + (M[i].y - p.y) * (M[i].y - p.y); if (d < bd) { bd = d; best = M[i]; } }
    if (best) { C.cardOpen({ k: 'mat', mat: best }); return true; }
    const st = G.storeAt(W); if (st && Math.abs(p.x - st.x) < 36 && Math.abs(p.y - st.y + 12) < 30) { let k = 0; for (let q = 1; q < 4; q++) if (G.colony(W).stock[q] > G.colony(W).stock[k]) k = q; C.cardOpen({ k: 'res', res: k }); return true; }
    C.cardClose(); return false;
  };
  G.on('new-pond', function () { cur = null; if (el) el.classList.add('hide'); });
  // which side a creature is on, and its trade, said on its own card
  G.unitTags = function (c, add) {
    if (c.team === 1) add('ENEMY', (c.raid ? 'A raider from another star: it has come for your Heart.' : 'It fights for a rival colony.') + ' Choose your fighters and click it to attack.', 'r');
    else if (c.team === 2) add('of this star', 'One of this star\'s own people: not yours to command, and nobody\'s enemy.');
    else if (c.job && G.JOBS[c.job]) add(G.JOBS[c.job].name.toLowerCase() + (c.hungry ? ' (feeding)' : ''), G.jobText ? G.jobText(c) + ' Born into the trade, or named to it by you.' : '', 'g');
  };
  let last = 0;
  G.addSystem({ name: 'cards', update: function () { if (!cur) return; const T = performance.now(); if (T - last > 300) { last = T; try { if (G.R && G.R.sel) { C.cardClose(); return; } render(); } catch (e) { console.error(e); } } } });
})();
