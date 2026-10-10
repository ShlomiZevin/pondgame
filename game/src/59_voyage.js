// ── Voyages, as you see them ──
// (what a voyage IS lives in 57x_far.js; here is how one is begun, watched and ended)
// A voyage is a MISSION: a plan of theirs, like their plans to build, but the biggest thing a pond does. It is announced, it has stages you watch, a
// countdown, and it can be called off until the engines light.
//   1. A kind builds a spaceship (54d_build.js). Its card, and the NOW panel, then offer PLAN A VOYAGE.
//   2. You choose where: the view draws back into space, you click a far pond and press FLY HERE.
//   3. The mission runs in the pond, with a mission bar at the top showing its four stages:
//        GATHER      the crew comes to the ship (who goes is theirs to decide: their leader, those who built the ship, then those nearest)
//        BOARD       they go aboard one by one
//        COUNTDOWN   ten, nine, eight ... in great numbers on the screen, smoke gathering under the ship
//        LIFT-OFF    fire, and the ship rises out of the pond
//      You see who the crew are the whole time: their faces in the mission bar, in the NOW panel and on the ship's card, and a small gold rocket over each
//      of them in the pond. CALL IT OFF stops the mission at any moment before lift-off.
//   4. The ship is seen crossing space; on arriving you are IN that pond, the crew set down as strangers among its people.
//   5. While visiting, a bar at the top says where you are, how many of yours live there and how many ADDs the ship still carries, with FLY HOME.
//      One creature of that pond, yours or theirs, may be marked BRING HOME on its card; the rest of yours stay as your outpost.
(function () {
  'use strict';
  if (typeof document === 'undefined' || !G.far) return;
  const F = G.far, clamp = G.clamp, TAU = 6.2832, $ = function (id) { return document.getElementById(id); }, esc = function (s) { return G.escapeHtml ? G.escapeHtml(String(s)) : String(s).replace(/[<>&]/g, ''); };
  const FAR_Z = 0.055;      // how far the view draws back to show the ponds round about
  const STAGES = [['gather', 'GATHER', 8], ['board', 'BOARD', 8], ['countdown', 'COUNTDOWN', 10], ['liftoff', 'LIFT-OFF', 3.6]];
  const STEPW = { gather: 'the crew is gathering at the ship', board: 'they are going aboard', countdown: 'all aboard: counting down', liftoff: 'lift-off' };
  let picking = null;       // the ship a destination is being chosen for (you are out in space, choosing)
  let want = null;          // { p, ship }: a voyage that is decided on and waits for the kind to be free of another plan
  let flight = null, pickEl = null, bar = null, aboardBtn = null, crewNow = [], mineNow = [], tick = 0, lastCount = -1;
  const now = function () { return (typeof performance !== 'undefined' ? performance.now() : Date.now()) / 1000; };
  const say = function (k, t, ms) { if (G.banner) G.banner(k, t, ms || 8000); };
  const tip = function (html) { if (G.toast) G.toast(html); };
  const unit = function () { const v = G.view; return Math.max(v.ww, v.wh) / (v.grow || 1); };
  /** where a far pond lies in space, seen from your own pond; and where your own lies, seen from the far pond you are in */
  const spot = function (p) { const W = G.W, jt = F.jit(p.i, p.j), cs = unit() * 8; return { x: W.ww / 2 + (p.i + jt[0]) * cs, y: W.wh / 2 + (p.j + jt[1]) * cs }; };
  const homeAt = function () { const W = G.W, o = F.origin || { i: 0, j: 0 }, jo = F.jit(o.i, o.j), cs = unit() * 8; return { x: W.ww / 2 + (-o.i - jo[0]) * cs, y: W.wh / 2 + (-o.j - jo[1]) * cs }; };
  /** the mission that is under way in this pond, or null */
  const plan = function () { const d = G.W && G.W.deed; return d && d.voyage ? d : null; };
  let R = null;             // the flight home being made ready at a far pond: the same stages, run here (the crew are strangers there, with no kind of their own to plan with)
  const cur = function () { return plan() || (R && F.there() ? R : null); };
  const members = function (d) { return d === R ? R.crew.filter(function (c) { return !c.dead && G.W.cre.indexOf(c) >= 0; }) : G.W.cre.filter(function (c) { return c.deedId === d.id && !c.dead; }); };
  const shipOfPlan = function (d) { const Wk = (G.W.works || []); for (let i = 0; i < Wk.length; i++) if (Wk[i].name === d.voyage.ship) return Wk[i]; return null; };

  function els() {
    if (pickEl) return;
    const st = document.createElement('style');
    st.textContent = '#voypick,#voybar{position:fixed;left:50%;transform:translateX(-50%);z-index:7;display:flex;align-items:center;gap:8px 12px;flex-wrap:wrap;justify-content:center;max-width:min(780px,calc(100vw - 28px));padding:9px 14px 10px 16px;border-radius:18px;border:1px solid rgba(246,211,101,.6);font:500 12.5px/1.35 system-ui,sans-serif;color:#eaf4ff;text-align:center}' +
      '#voypick{top:58px}#voybar{top:14px}#voypick b,#voybar b{color:#f6d365;letter-spacing:.1em;font-size:10.5px;font-weight:800}#voypick .btn,#voybar .btn{min-height:30px;padding:0 14px;flex:none}#voybar i{font-style:normal;color:#f6d365}#voypick .crew{margin:0}' +
      '#voypick.mission{flex-direction:column;gap:7px;padding:10px 18px 11px;box-shadow:0 8px 34px rgba(0,0,0,.5)}#voypick .mt{font:800 15px system-ui,sans-serif;letter-spacing:.14em;color:#f6d365}#voypick .mrow{display:flex;align-items:center;gap:12px;flex-wrap:wrap;justify-content:center}' +
      '#voypick .stg{display:flex;gap:5px}#voypick .stg span{padding:4px 11px;border-radius:999px;font:800 10px system-ui,sans-serif;letter-spacing:.1em;color:#8fb2d6;background:rgba(7,18,31,.5);border:1px solid rgba(207,232,255,.16)}#voypick .stg span.dn{color:#9af0d0;border-color:rgba(51,214,166,.5)}#voypick .stg span.on{color:#14202e;background:#f6d365;border-color:#f6d365;animation:pulse 1.2s ease-in-out infinite}' +
      '#iaboard{width:100%;margin-top:6px}.crew{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0 2px;justify-content:center}.crew span{position:relative;display:flex;flex-direction:column;align-items:center;width:58px;padding:3px 2px 5px;border-radius:12px;background:rgba(246,211,101,.08);border:1px solid rgba(246,211,101,.35);cursor:pointer}.crew span:hover{background:rgba(246,211,101,.2)}.crew span.in{background:rgba(51,214,166,.18);border-color:rgba(51,214,166,.7)}.crew img{width:44px;height:44px}.crew b{font:800 10.5px system-ui,sans-serif !important;color:#fff !important;letter-spacing:0 !important}.crew i{font:600 9px system-ui,sans-serif;font-style:normal;color:#f6d365;text-align:center;line-height:1.15}.crew span.in i{color:#9af0d0}.crew u{position:absolute;top:-6px;right:-6px;width:17px;height:17px;border-radius:50%;background:#14202e;border:1px solid rgba(255,126,182,.8);color:#ff9ec6;font:800 9px/15px system-ui,sans-serif;text-align:center;text-decoration:none;cursor:pointer}.crew u:hover{background:#ff7eb6;color:#14202e}#zcard .crew,#rarebox .crew{justify-content:flex-start}.crew.many{gap:4px}.crew.many span{width:40px;padding:2px 1px 3px;border-radius:9px}.crew.many img{width:32px;height:32px}.crew.many i{display:none}.crew.many b{font-size:9px !important}';
    document.head.appendChild(st);
    const host = $('ui') || document.body;
    pickEl = document.createElement('div'); pickEl.id = 'voypick'; pickEl.className = 'glass hide'; host.appendChild(pickEl);
    bar = document.createElement('div'); bar.id = 'voybar'; bar.className = 'glass hide'; host.appendChild(bar);
    [pickEl, bar].forEach(function (e) { e.addEventListener('pointerdown', function (ev) { ev.stopPropagation(); }); });
    pickEl.addEventListener('click', function (e) { const id = e.target && e.target.id; if (id === 'voyCancel') { if (G.sfx) G.sfx('click'); cancelPick(); } else if (id === 'voyCancel2') { if (G.sfx) G.sfx('click'); G.voyageOff(); } else crewClick(e); });
    bar.addEventListener('click', function (e) { const id = e.target && e.target.id; if (id === 'voyHome') { if (G.sfx) G.sfx('click'); G.voyageHome('crew'); } else if (id === 'voyAlone') { if (G.sfx) G.sfx('click'); G.voyageHome('alone'); } else if (id === 'voyLookHome') G.voyageLook('home'); else if (id === 'voyLookFar') G.voyageLook('far'); else if (id === 'voyShip') { const s = F.shipOf(); if (s && G.focusOn) G.focusOn(s.x, s.y, 1.3); } });
  }
  function cancelPick() { picking = null; if (pickEl) pickEl.classList.add('hide'); if (G.farCardHide) G.farCardHide(); if (G.goHome) G.goHome(); }

  // ── the crew, seen ──
  const FACE = {}; let faces = 0;
  const faceOf = function (c) { if (FACE[c.id]) return FACE[c.id]; try { const cv = document.createElement('canvas'); cv.width = cv.height = 96; const x = cv.getContext('2d'); x.translate(48, 53); x.scale(0.24, 0.24); G.form.portrait(x, c.g.f, 1.3, {}); if (++faces > 60) { for (const k in FACE) delete FACE[k]; faces = 0; } return (FACE[c.id] = cv.toDataURL('image/png')); } catch (e) { return ''; } };
  /** the crew as a row of faces: who each is, why it goes, and (while they board) whether it is aboard yet */
  const editable = function () { return !F.visiting && !plan() && !want && !flight; };
  const crewHtml = function (C, edit) { if (!C.length) return '<small>Nobody is near enough to go.</small>'; return '<div class="crew' + (C.length > 7 ? ' many' : '') + '">' + C.map(function (c) { const u = faceOf(c); return '<span data-c="' + c.id + '" class="' + (c.inShip ? 'in' : '') + '" title="' + esc((G.characterOf ? G.characterOf(c) : '') + '. Click to find it on the star.') + '">' + (edit ? '<u data-drop="' + c.id + '" title="Take it out of the crew: another goes instead">✕</u>' : '') + (u ? '<img alt="" src="' + u + '">' : '') + '<b>#' + c.id + '</b><i>' + esc(c.inShip ? 'aboard' : c.crewWhy || '') + '</i></span>'; }).join('') + '</div>' + (edit ? '<small style="display:block;opacity:.75">To change who goes: the cross takes one out; to put one in, click it on the star and press PUT IN THE CREW on its card.</small>' : ''); };
  function crewClick(e) { let n = e.target; if (n && n.dataset && n.dataset.drop) { const id0 = +n.dataset.drop, c0 = G.W.cre.filter(function (q) { return q.id === id0; })[0]; if (c0 && editable()) { c0.crewPick = -1; if (G.sfx) G.sfx('click'); if (G.hub) G.hub.poke(); } if (e.stopPropagation) e.stopPropagation(); return true; }
    while (n && !(n.dataset && n.dataset.c)) n = n.parentNode; if (!n) return false; const id = +n.dataset.c, c = G.W.cre.filter(function (q) { return q.id === id && !q.dead; })[0]; if (c && !c.inShip && G.focusOn) { if (G.sfx) G.sfx('click'); G.focusOn(c.x, c.y, 1.7); } return true; }
  const crewOf = function (ship) { const d = cur(); return d ? members(d) : F.crewFor(ship); };

  // ── the ship's card (62b_details.js asks for these) ──
  const isWhole = function (o) { const n = G.buildCount ? G.buildCount(o) : [1, 1, 1]; return !o.fall && !o.ruin && n[0] >= n[2]; };
  const stateOf = function () { const d = cur(); return (R ? 'R' + R.i + members(R).map(function (c) { return c.id + (c.inShip ? 'i' : ''); }).join('.') : '') + (F.visiting ? 'v' + (F.here || '') + (F.visiting.peek ? 'k' : '') : d ? 'p' + d.i + members(d).map(function (c) { return c.id + (c.inShip ? 'i' : ''); }).join('.') : want ? 'w' : 'h'); };
  G.shipSig = function (o) { return stateOf() + (isWhole(o) ? crewOf(o).map(function (c) { return c.id; }).join('.') : 'x'); };
  G.shipCard = function (o) {
    const h = F.holdOf(o), d = plan();
    if (!isWhole(o)) return '<div class="ilabel">The spaceship</div><small>It is not whole: it cannot fly until every piece is set.</small>';
    if (F.there()) return '<div class="ilabel">Your spaceship</div><small>It waits to take you home. One creature may come back with it: click any creature here, yours or theirs, and press <b>BRING HOME</b> on its card. The rest of yours stay as your outpost.</small><button class="btn sm pulse" id="zsail" style="width:100%;margin-top:8px">FLY HOME</button>';
    let s = '<div class="ilabel">A spaceship</div><small>' + (h.ships > 1 ? 'With the ' + (h.ships - 1) + ' other' + (h.ships > 2 ? 's' : '') + ' that stand ready, it carries <b>' : 'It carries <b>') + h.crew + '</b> through space to another star, and <b>' + h.adds + '</b> ADD' + (h.adds === 1 ? '' : 's') + ' to use where it lands.</small><div class="ilabel">' + (d ? 'The crew' : 'Who would go in it') + '</div>' + crewHtml(crewOf(o), editable());
    if (d) s += '<small>The mission to <b>' + esc(d.voyage.name) + '</b> is under way: ' + esc(STEPW[d.steps[d.i].do] || '') + '.</small>' + (d.steps[d.i].do === 'liftoff' ? '' : '<button class="btn sm" id="zsail" style="width:100%;margin-top:8px">CALL IT OFF</button>');
    else if (want) s += '<small>They will fly to <b>' + esc(want.p.name) + '</b> as soon as they have finished what they are doing.</small><button class="btn sm" id="zsail" style="width:100%;margin-top:8px">CALL IT OFF</button>';
    else s += '<small>That is theirs to decide: their leader, those who built it, then those nearest. Each carries a small gold rocket over its head on the star.</small><button class="btn sm pulse" id="zsail" style="width:100%;margin-top:8px">PLAN A VOYAGE</button>';
    return s;
  };
  G.shipCardWire = function (o) {
    Array.prototype.forEach.call(document.querySelectorAll('#zcard .crew span'), function (e) { e.onclick = crewClick; });
    const b = $('zsail'); if (b) b.onclick = function () { if (G.sfx) G.sfx('click'); if (F.there()) G.voyageHome(); else if (plan() || want) G.voyageOff(); else G.voyagePick(o); };
  };

  // ── 2. choosing where ──
  G.voyagePick = function (ship) {
    ship = ship || F.shipOf(); if (!ship || F.visiting || flight || plan() || G.mode !== 'play') return;
    if (F.crewFor(ship).length < 2) { tip('<b>Too few are near the ship.</b><br>It takes two at least to fly it.'); return; }
    els(); picking = ship; if (G.selectThing) G.selectThing(null); if (G.select) G.select(null); if (G.hub) G.hub.close();
    const W = G.W; G.flyTo(W.ww / 2, W.wh / 2, FAR_Z, 1.3);
    pickEl.classList.remove('mission'); pickEl._t = ''; pickEl.style.top = '58px'; pickEl.innerHTML = '<span><b>⚑ WHERE SHALL THEY GO?</b> Click one of the stars out there, then FLY HERE.</span><button class="btn sm" id="voyCancel">STAY</button>'; pickEl.classList.remove('hide');
  };
  /** the far pond's card (58_beyond.js asks for it) */
  G.farCardHtml = function (p, pics, n) {
    const rec = p.home ? null : F.book[F.key(p)], ship = !F.visiting && !p.home ? (picking || F.shipOf()) : null, close = '<button class="btn sm" id="farClose">CLOSE</button>';
    if (p.home) { const L = F.homeLook || {}; return '<div class="k">Home</div><b>Your star</b>It waits for you exactly as you left it' + (L.gen ? ': generation ' + L.gen + ', ' + L.n + ' alive' : '') + '. You can go and watch it while the ship stays here.<div class="r">' + (F.visiting ? '<button class="btn sm" id="farWatchHome">WATCH HOME</button><button class="btn sm pulse" id="farSailHome">FLY HOME</button>' : '') + close + '</div>'; }
    if (F.visiting && F.here === 'home' && F.key(p) === F.visiting.key) { const r0 = F.book[F.visiting.key] || {}; return '<div class="k">Your ship is here</div><b>' + esc(p.name) + '</b>' + (pics ? '<div class="ks">' + pics + '</div>' : '') + (r0.mine | 0) + ' of yours are there, among people who are ' + esc(F.moodWords(p)) + '. It waits as you left it.<div class="r"><button class="btn sm pulse" id="farWatch">GO THERE</button><button class="btn sm" id="farSailHome">FLY HOME</button>' + close + '</div>'; }
    const SL = G.starLine ? G.starLine(p) : null, fuel = G.FUEL && G.colony && G.W && !G.W.farOf ? G.colony().stock[3] : 99;
    let h = '<div class="k">' + (SL ? SL.k : 'A far star') + '</div><b>' + esc(p.name) + '</b>' + (pics ? '<div class="ks">' + pics + '</div>' : '') + (SL ? SL.html + '<br>' : '') + n + (n === 1 ? ' kind lives' : ' kinds live') + ' here. Its people are ' + esc(F.moodWords(p)) + '.';
    if (rec) h += '<br><span style="color:#f6d365">You have been here ' + (rec.visits === 1 ? 'once' : rec.visits + ' times') + '. ' + (rec.mine ? rec.mine + ' of your people live here: your outpost.' : 'None of yours live here now.') + '</span>';
    if (F.visiting) h += '<br>Your ship is at ' + esc(F.visiting.name) + ': it must fly home before it can come here.<div class="r">' + close + '</div>';
    else if (plan() || want) h += '<br>A mission is already planned. Call it off first to choose another star.<div class="r"><button class="btn sm" id="farHome">BACK TO MY STAR</button>' + close + '</div>';
    else if (ship) { const hd = F.holdOf(ship); h += '<br>' + (hd.ships > 1 ? 'Your <b>' + hd.ships + ' ships</b> fly together and carry ' : 'Your ship carries ') + hd.crew + ', and ' + hd.adds + ' ADD' + (hd.adds === 1 ? '' : 's') + ' to use here. Choosing it starts the mission: the crew gathers, goes aboard, and after the countdown the ship lifts off.' + (G.FUEL ? ' <span style="color:' + (fuel >= G.FUEL ? '#8ef0ff' : '#ff9db0') + '">Flying out burns ' + G.FUEL * (hd.ships || 1) + ' lumen (there is ' + fuel + ' in the store).</span>' : '') + (SL && SL.rival ? ' <span style="color:#ff9db0">Your fighters go first: name some before you send it.</span>' : '') + '<div class="r"><button class="btn sm pulse" id="farSail">' + (SL && SL.rival ? 'ATTACK IT' : 'FLY HERE') + '</button>' + close + '</div>'; }
    else h += '<br>Your creatures can come here once one of your kinds has built a <span style="color:#f6d365;font-weight:700">spaceship</span>. A kind that has made itself a place of its own builds one in time.<div class="r"><button class="btn sm" id="farHome">BACK TO MY STAR</button>' + close + '</div>';
    return h;
  };
  /** FLY HERE: the pond is chosen; back to the pond, where the mission is carried out */
  G.voyageGo = function (p) {
    const ship = picking || F.shipOf(); if (!ship || F.visiting || flight || plan() || !p || p.free || p.home) return;
    if (G.FUEL && G.colony && !G.W.farOf && G.colony().stock[3] < G.FUEL) { tip('<b>The ship needs ' + G.FUEL + ' lumen to fly out.</b><br>There is ' + G.colony().stock[3] + ' in the store. Gatherers bring lumen in from the crystals: choose some and right-click a crystal.'); return; }
    F.warTo = G.starOf && G.starOf(p).rival ? F.key(p) : null;      // (a flight against a rival: the fighters go first)
    picking = null; if (pickEl) pickEl.classList.add('hide');
    want = { p: { i: p.i, j: p.j, name: p.name, hue: p.hue, kinds: p.kinds }, ship: ship.name };
    if (G.goHome) G.goHome(); setTimeout(function () { const s = F.shipOf(); if (s && G.focusOn && !flight) G.focusOn(s.x, s.y - 20, 1.1); }, 1300);
    if (G.W.deed) say('A MISSION IS DECIDED', 'They will fly to ' + p.name + ' as soon as they have finished ' + G.W.deed.title + '.', 7000);
    start();
  };
  // ── 3. the mission ──
  function start() {
    const W = G.W; if (!want || W.deed || F.visiting || flight || G.mode !== 'play') return false;
    const ship = (W.works || []).filter(function (w) { return w.name === want.ship && w.bp && w.bp.type === 'ship' && isWhole(w); })[0] || F.shipOf();
    if (!ship) { want = null; tip('<b>The ship is gone.</b><br>There is nothing to fly in.'); return false; }
    const crew = F.crewFor(ship); if (crew.length < 2) return false;      // it waits for hands
    const sp = (ship.sp && G.speciesById(ship.sp)) || (crew[0].sp && G.speciesById(crew[0].sp)), p = want.p, title = 'Mission to ' + p.name;
    const d = G.deedStart({ kind: sp ? sp.name : '', title: title, say: '', what: 'fly to ' + p.name + ' in the ' + ship.name + ', ' + crew.length + ' of them', why: 'you showed them the way', share: 0.3, own: true,
      steps: STAGES.map(function (q) { return { do: q[0], secs: q[2], cry: '' }; }), place: { x: ship.x / W.ww, y: (ship.y + 30) / W.wh } });
    if (!d || d.title !== title) return false;      // (their kind is too few just now: it waits)
    // the crew is the crew they chose, not whoever the plan would have picked
    W.cre.forEach(function (c) { if (c.deedId === d.id) { c.deedId = 0; } }); crew.forEach(function (c, j) { c.deedId = d.id; c.deedJ = j; }); d.n0 = crew.length;
    d.voyage = { name: p.name, p: p, ship: ship.name, y0: ship.y, stage: -1 }; d.x = ship.x; d.y = ship.y + 30; want = null; lastCount = -1;
    if (G.setSpeed) G.setSpeed(1);      // a mission is watched at the pond's own pace
    if (G.hub) G.hub.poke();
    return true;
  }
  G.voyageOff = function () {
    const d = plan(); if (want) { want = null; tip('<b>The mission is called off.</b>'); }
    if (R && R.steps[R.i].do !== 'liftoff') { const sh = shipOfPlan(R); if (sh) { sh.lifting = false; if (R.voyage.y0 !== undefined) sh.y = R.voyage.y0; } R.crew.forEach(function (c) { c.inShip = false; c.goTo = null; }); R = null; tip('<b>The flight home is called off.</b><br>They stay where they are.'); }
    if (d && d.steps[d.i].do !== 'liftoff') { settle(d); if (G.deedStop) G.deedStop('off'); }
    if (G.hub) G.hub.poke();
  };
  // the mates of the ship that leads rise with it, a breath behind each other, and stand again when it does
  function matesUp(ship, u) { if (!F.mates) return; F.mates(ship).forEach(function (m, k) { if (m.y0v === undefined) m.y0v = m.y; const uu = clamp(u * 1.15 - 0.08 * (k + 1), 0, 1); m.lifting = uu > 0; m.y = m.y0v - uu * uu * 640; }); }
  function matesDown() { ((G.W && G.W.works) || []).forEach(function (w) { if (w.y0v !== undefined) { w.y = w.y0v; w.lifting = false; delete w.y0v; } }); }
  /** whoever was in the ship steps out, and the ship stands where it stood */
  function settle(d) { matesDown(); const W = G.W, ship = shipOfPlan(d); if (ship) ship.lifting = false; if (ship && d.voyage.y0 !== undefined) ship.y = d.voyage.y0; d.voyage.lift = 0; W.cre.forEach(function (c) { if (c.inShip) { c.inShip = false; if (ship) { c.x = c.px = ship.x + (G.rand() - 0.5) * 80; c.y = c.py = ship.y + 40 + G.rand() * 30; } } }); }
  // the mission's own stages (the plan engine walks the crew to the ship; here they go aboard, the count runs down, and the ship rises)
  { const s0 = G.step; G.step = function (dt) { s0(dt); const W = G.W, d = W && W.deed; if (!d || !d.voyage) return;
      const ship = shipOfPlan(d); if (!ship || !isWhole(ship)) { settle(d); if (G.deedStop) G.deedStop('lost'); return; }
      const st = d.steps[d.i], M = members(d), S = ship.bp.S || 70, late = st.do === 'countdown' || st.do === 'liftoff';
      if (d.voyage.stage !== d.i) { d.voyage.stage = d.i; G.emit('mission-stage', d, st.do, ship); }
      // the crew is the crew: nobody is swapped in for it from across the pond, and for as long as the mission lasts winter does not take them (they are spoken for)
      d.n0 = Math.max(2, M.length); for (let i = 0; i < M.length; i++) { M[i].doomed = false; M[i].sick = false; }
      // the crew WALKS to the ship, over land if need be, at a steady pace of its own (a water creature is slow on land, and the port is on the shore)
      if (st.do !== 'liftoff') for (let i = 0; i < M.length; i++) { const c = M[i]; if (c.inShip) continue; const tx = ship.x + (st.do === 'gather' ? Math.cos(i * 2.4) * (50 + 12 * (i % 3)) : 0), ty = d.voyage.y0 + 24 + (st.do === 'gather' ? Math.abs(Math.sin(i * 2.4)) * 44 : 0), dx = tx - c.x, dy = ty - c.y, dist = Math.hypot(dx, dy); if (dist > 14) { const stp = Math.min(dist, Math.max(70, c.ph.speed * 1.4) * dt); c.x += dx / dist * stp; c.y += dy / dist * stp; c.vx = dx / dist * 20; c.vy = dy / dist * 20; c.ang = Math.atan2(dy, dx); } else { c.vx *= 0.6; c.vy *= 0.6; } }
      // the gathering lasts until they are all there (or long enough): nobody is left behind for being slow
      if (st.do === 'gather' && d.t > st.secs - 0.5 && d.t < 40) { let far = 0; M.forEach(function (c) { if (Math.hypot(c.x - ship.x, c.y - (d.voyage.y0 + 24)) > 150) far++; }); if (far) { st.secs = Math.min(40, d.t + 2); } }
      if (st.do === 'board' || late) for (let i = 0; i < M.length; i++) { const c = M[i]; if (!c.inShip && Math.hypot(c.x - ship.x, c.y - (d.voyage.y0 + 20)) < (late ? 170 : 52) && (late || d.t > i * 1.1)) { c.inShip = true; G.emit('went-aboard', c, ship); } }
      if (st.do !== 'liftoff') d.voyage.y0 = ship.y;      // (where it stands now: it is kept on its pad until the engines light)
      if (st.do === 'liftoff') { ship.lifting = true; const u = clamp(d.t / st.secs, 0, 1); ship.y = d.voyage.y0 - u * u * 640; d.voyage.lift = u; matesUp(ship, u); M.forEach(function (c) { if (!c.inShip) { c.deedId = 0; } }); d.n0 = Math.max(2, M.filter(function (c) { return c.inShip; }).length); }
      for (let i = 0; i < M.length; i++) { const c = M[i]; if (c.inShip) { c.x = c.px = ship.x; c.y = c.py = ship.y - S * 0.3; c.vx = c.vy = 0; c.E = Math.max(c.E, c.ph.Emax * 0.5); } }
    }; }
  { const s1 = G.step; G.step = function (dt) { s1(dt); if (!R) return; const W = G.W; if (!W || !F.there()) { R = null; return; }
      const ship = shipOfPlan(R); if (!ship) { R = null; return; } const st = R.steps[R.i], M = members(R), S = ship.bp.S || 70, late = st.do === 'countdown' || st.do === 'liftoff'; R.t += dt;
      if (R.voyage.stage !== R.i) { R.voyage.stage = R.i; G.emit('mission-stage', R, st.do, ship); }
      if (st.do !== 'liftoff') R.voyage.y0 = ship.y;
      for (let i = 0; i < M.length; i++) { const c = M[i]; c.doomed = false; if (c.inShip) continue; const g = st.do === 'gather';
        if (st.do !== 'liftoff') c.goTo = { x: ship.x + (g ? Math.cos(i * 2.4) * (52 + 12 * (i % 3)) : 0), y: R.voyage.y0 + 24 + (g ? Math.abs(Math.sin(i * 2.4)) * 44 : 0), until: W.t + 2 };
        if (!g && Math.hypot(c.x - ship.x, c.y - (R.voyage.y0 + 20)) < (late ? 170 : 56) && (late || R.t > i * 1.0)) { c.inShip = true; c.goTo = null; G.emit('went-aboard', c, ship); } }
      if (st.do === 'gather' && R.t > st.secs - 0.5 && R.t < 30 && M.some(function (c) { return Math.hypot(c.x - ship.x, c.y - (R.voyage.y0 + 24)) > 150; })) st.secs = Math.min(30, R.t + 2);      // nobody is left behind for being slow
      if (st.do === 'liftoff') { ship.lifting = true; const u = clamp(R.t / st.secs, 0, 1); ship.y = R.voyage.y0 - u * u * 640; R.voyage.lift = u; }
      for (let i = 0; i < M.length; i++) { const c = M[i]; if (c.inShip) { c.x = c.px = ship.x; c.y = c.py = ship.y - S * 0.3; c.vx = c.vy = 0; c.E = Math.max(c.E, c.ph.Emax * 0.5); } }
      if (R.t >= st.secs) { R.i++; R.t = 0; if (R.i >= R.steps.length) { const aboard = M.filter(function (c) { return c.inShip; }), bring = R.bring && aboard.indexOf(R.bring) >= 0 ? R.bring : null, y0 = R.voyage.y0; ship.y = y0; ship.lifting = false; R = null; depart(ship, aboard, bring, false); } }
    }; }
  G.on('mission-stage', function (d, what, ship) {
    if (G.mode !== 'play') return;
    if (what === 'countdown') { if (G.setSpeed) G.setSpeed(1); if (G.select) G.select(null); if (G.selectThing) G.selectThing(null); if (G.hub) G.hub.close(); if (G.focusOn) { G.cam.z = 1.05; G.focusOn(ship.x, d.voyage.y0 - 120, 1.05); } lastCount = -1; }
    if (what === 'liftoff') { if (G.sfx) G.sfx('meteor'); if (G.R) { G.R.shake = 0.9; G.R.flash = 0.5; G.R.flashCol = '#ffd98a'; } }
  });
  G.on('deed-end', function (d, how) {
    if (!d || !d.voyage) return; const W = G.W, ship = shipOfPlan(d), crew = W.cre.filter(function (c) { return c.inShip && !c.dead; });
    if (how !== 'done' || !ship || crew.length < 1 || G.mode !== 'play') { settle(d); return; }
    // lift-off is done: the ship is away
    const p = d.voyage.p, at = spot(p), y0 = d.voyage.y0; ship.y = y0; ship.lifting = false; d.voyage.lift = 0; matesDown();
    fly(ship.bp, ship.x, y0 - 640, at.x, at.y, 7, 'CROSSING SPACE TO ' + esc(p.name.toUpperCase()) + ' · ' + crew.length + ' aboard', function () {
      crew.forEach(function (c) { c.inShip = false; }); W.cre.forEach(function (c) { c.crewPick = 0; });
      const out = F.sail(p, crew, ship); pickEl.classList.add('hide');
      if (!out) { tip('<b>The ship could not make the crossing.</b>'); if (G.goHome) G.goHome(); return; }
      const V = F.visiting; if (G.setSpeed) G.setSpeed(1);
      say('YOU HAVE ARRIVED AT ' + V.name.toUpperCase(), out.length + ' of yours are set down among its people, who are ' + V.mood + '. Watch how they are taken. You have ' + V.adds + ' ADD' + (V.adds === 1 ? '' : 's') + ' here.', 10000);
      if (G.log) G.log('sp', 'Arrived at ' + V.name, out.length + ' of yours went ashore: ' + out.map(function (c) { return '#' + c.id + (G.characterOf ? ' (' + G.characterOf(c) + ')' : ''); }).join(', ') + '.');
      land(F.shipOf());
    });
  });

  // ── 4. the crossing ──
  function fly(bp, x0, y0, x1, y1, T, text, done) {
    els(); const b2 = JSON.parse(JSON.stringify(bp)); b2.P.forEach(function (q) { delete q.t0; q.st = 2; });
    flight = { bp: b2, x0: x0, y0: y0, x1: x1, y1: y1, t0: now(), T: T, done: done };
    flight.z0 = G.cam.z; flight.zFar = clamp(G.view.h * 0.6 / (Math.hypot(x1 - x0, y1 - y0) * G.view.base + 1), 0.02, FAR_Z);
    pickEl.classList.remove('mission'); pickEl._t = ''; pickEl.style.top = '58px'; pickEl.innerHTML = '<span><b>⚑ ' + text + '</b></span>'; pickEl.classList.remove('hide');
    if (G.sfx) G.sfx('discovery'); if (G.hub) G.hub.close();
  }
  /** FLY HOME. how: 'crew' (the crew is called back to the ship first: they gather, go aboard, and it lifts off), 'alone' (the ship goes back by itself: those
   *  of yours who are here stay as your outpost), or true (at once, no ceremony: the pond has fallen still). One creature marked BRING HOME goes too. */
  G.voyageHome = function (how) {
    const V = F.visiting; if (!V || flight || R) return;
    if (V.peek) { const nm = V.name, n0 = F.lineN(); if (G.selectThing) G.selectThing(null); if (G.select) G.select(null); if (F.home(null)) { say('BACK AT YOUR OWN STAR', 'You were looking in on ' + nm + ', where ' + n0 + ' of yours live. It waits as you left it.', 6000); if (G.setSpeed) G.setSpeed(1); } return; }
    if (F.here === 'home' && !F.look('far')) return;      // the ship is at the far pond: the flight home starts there
    const W = G.W, s = F.shipOf(), bring = W.cre.filter(function (c) { return c.aboard && !c.dead; })[0] || null;
    if (G.selectThing) G.selectThing(null); if (G.select) G.select(null);
    if (how === true || !s) { depart(s, [], bring, true); return; }
    const crew = how === 'alone' ? [] : W.cre.filter(function (c) { return c.crew && !c.dead; }); if (bring && crew.indexOf(bring) < 0) crew.push(bring);
    R = { voyage: { name: V.name, ship: s.name, y0: s.y, stage: -1, home: true, lift: 0 }, steps: crew.length ? [{ do: 'gather', secs: 8 }, { do: 'board', secs: 7 }, { do: 'countdown', secs: 6 }, { do: 'liftoff', secs: 3.6 }] : [{ do: 'countdown', secs: 5 }, { do: 'liftoff', secs: 3.6 }], i: 0, t: 0, crew: crew, bring: bring };
    lastCount = -1; if (G.setSpeed) G.setSpeed(1); if (G.focusOn) G.focusOn(s.x, s.y - 40, 1.1); if (G.hub) G.hub.poke();
  };
  /** the ship leaves the far pond for home, with whoever is aboard */
  function depart(s, aboard, bring, quick) {
    const V = F.visiting, W = G.W, H = homeAt(), back = aboard.filter(function (c) { return c !== bring; }), stay = W.cre.filter(function (c) { return !c.dead && c.line && aboard.indexOf(c) < 0 && c !== bring; }).length;
    fly(s ? s.bp : V.ship.bp, s ? s.x : W.ww / 2, s ? s.y - 640 : W.wh / 2, H.x, H.y, quick ? 3 : 7, 'FLYING HOME FROM ' + esc(V.name.toUpperCase()) + ' · ' + (aboard.length + (bring && aboard.indexOf(bring) < 0 ? 1 : 0)) + ' aboard', function () {
      aboard.forEach(function (c) { c.inShip = false; c.goTo = null; });
      const r = F.home(bring, back); pickEl.classList.add('hide'); if (!r) return; if (G.setSpeed) G.setSpeed(1);
      const nb = (r.crew || []).length;
      say('THE SHIP IS HOME', (nb ? nb + ' of the crew came home in it. ' : 'It came home alone. ') + (stay ? stay + ' of yours stayed at ' + V.name + ': they are your outpost there (SPACE, then LOOK IN, to see them). ' : '') + (r.brought ? (r.brought.guestName || 'One creature') + ' came with it, a stranger here: see how your own take to it.' : ''), 10000);
      if (G.log) G.log('sp', 'Home from ' + V.name, (nb ? nb + ' of the crew came home. ' : 'The ship came home alone. ') + (stay ? stay + ' stayed there.' : 'Nobody stayed.') + (r.brought ? ' ' + (r.brought.guestName || 'A creature') + ' came back with it.' : ''));
      land(F.shipOf()); if (r.brought) setTimeout(function () { if (!r.brought.dead && !F.visiting && G.select) G.select(r.brought); }, 5200);
    });
  };
  /** while the ship is away: go and watch your own pond, or go back to where the ship is */
  G.voyageLook = function (where) {
    const V = F.visiting; if (!V || flight) return; if (G.selectThing) G.selectThing(null); if (G.select) G.select(null);
    if (!F.look(where)) return; if (G.sfx) G.sfx('click'); if (G.setSpeed) G.setSpeed(1);
    if (where === 'home') say('YOUR OWN STAR', 'You are watching home. The ship waits at ' + V.name + ', and that star stands still until you look at it again.', 7000);
    else { say('BACK AT ' + V.name.toUpperCase(), 'You are with the ship again. Your own star stands still until you look at it again.', 7000); const s = F.shipOf(); if (s && G.focusOn) G.focusOn(s.x, s.y + 40, 1.2); }
  };
  /** the ship in flight: it points where it flies, its engine burning behind it */
  /** the ship comes down where it is to stand: the view goes to it, it descends on its fire, and those aboard step out after (57x_far.js lets them out one by one) */
  let landing = null; const FXB = [];
  function land(ship) { if (!ship) return; const W = G.W; landing = { ship: ship, y0: ship.y, t0: W.t, T: 2.8 }; G.emit('ship-landing', ship); ship.lifting = true; ship.y = landing.y0 - 640; if (G.cam) { G.cam.z = 0.3; G.cam.x = ship.x; G.cam.y = landing.y0 - 200; if (G.applyCam) G.applyCam(); } if (G.flyTo) G.flyTo(ship.x, landing.y0 - 70, 1.12, 1.9); }
  { const s2 = G.step; G.step = function (dt) { s2(dt); if (!landing) return; const W = G.W, k = landing, sh = k.ship; if (!W || (W.works || []).indexOf(sh) < 0) { landing = null; return; }
      const u = clamp((W.t - k.t0) / k.T, 0, 1); sh.lifting = true; sh.y = k.y0 - (1 - u) * (1 - u) * 640; k.u = u; if (u >= 1) { sh.y = k.y0; sh.lifting = false; landing = null; if (G.R) G.R.shake = 0.35; if (G.sfx) G.sfx('meteor'); } }; }
  G.on('went-aboard', function (c, ship) { if (G.mode === 'play') { FXB.push({ x: c.x, y: c.y, ship: ship, t0: now(), id: c.id, in: true }); if (G.sfx) G.sfx('click'); } });
  G.on('stepped-out', function (c) { const sh = F.shipOf(); if (G.mode === 'play' && sh) { FXB.push({ x: c.goTo ? sh.x + (c.goTo.x - sh.x) * 0.25 : sh.x + 40, y: sh.y + 50, ship: sh, t0: now(), id: c.id, in: false }); if (G.sfx) G.sfx('click'); } });
  /** boarding and stepping out, made plain: a ramp at the ship while they board, a call over it, and each one seen going in (or coming out) as a spark with its number */
  function boardFx() {
    const ctx = G.ctx, v = G.view; if (!ctx || G.mode !== 'play' || (G.pondAsleep && G.pondAsleep())) return; const t = now(), d = cur(), sx = function (x) { return x * v.scale + v.ox; }, sy = function (y) { return y * v.scale + v.oy; };
    ctx.save(); ctx.setTransform(v.dpr, 0, 0, v.dpr, 0, 0); ctx.lineCap = 'round'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (d && !flight) { const st = d.steps[d.i], ship = shipOfPlan(d); if (ship && (st.do === 'gather' || st.do === 'board')) { const S = ship.bp.S || 70, bx = sx(ship.x), by = sy(ship.y + S * 0.45), M = members(d), inN = M.filter(function (c) { return c.inShip; }).length;
        // the ramp, and the ring that says: here
        if (!G.FLAT) { ctx.strokeStyle = 'rgba(246,211,101,' + (0.55 + 0.3 * Math.sin(t * 4)) + ')'; ctx.lineWidth = 2.5; ctx.setLineDash([7, 7]); ctx.lineDashOffset = -t * 26; ctx.beginPath(); ctx.ellipse(bx, by, (S * 1.25) * v.scale, (S * 0.5) * v.scale, 0, 0, TAU); ctx.stroke(); ctx.setLineDash([]); }
        else { ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(bx, by, 4, bx, by, S * 1.5 * v.scale); g.addColorStop(0, 'rgba(246,211,101,' + (0.30 + 0.12 * Math.sin(t * 4)) + ')'); g.addColorStop(1, 'rgba(246,211,101,0)'); ctx.translate(bx, by); ctx.scale(1, 0.42); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, S * 1.5 * v.scale, 0, TAU); ctx.fill(); ctx.restore(); }      /* (on a star: a pool of light under the ship, no ring) */
        if (!(G.buildArt && G.buildArt(ship))) { ctx.strokeStyle = '#14202e'; ctx.lineWidth = 7 * v.scale + 2; ctx.beginPath(); ctx.moveTo(bx + S * 0.2 * v.scale, by - S * 0.34 * v.scale); ctx.lineTo(bx + S * 0.95 * v.scale, by + 4); ctx.stroke(); ctx.strokeStyle = '#f6d365'; ctx.lineWidth = 4 * v.scale + 1; ctx.stroke(); }
        // the call, over the ship
        const top = sy(ship.y + S * 0.45 - (ship.bp.top || S * 1.6)) - 42, txt = st.do === 'gather' ? 'CREW TO THE SHIP' : 'BOARDING  ' + inN + ' / ' + M.length; ctx.font = '800 13px system-ui, sans-serif'; const tw = ctx.measureText(txt).width + 26; ctx.fillStyle = 'rgba(9,18,30,0.9)'; G.roundRect(ctx, bx - tw / 2, top - 13, tw, 26, 13); ctx.fill(); ctx.strokeStyle = '#f6d365'; ctx.lineWidth = 1.5; ctx.stroke(); ctx.fillStyle = '#f6d365'; ctx.fillText(txt, bx, top + 0.5);
        // a line from each of them to the ship, so it is seen where they are going
        ctx.lineWidth = 1.6; ctx.setLineDash([3, 8]); ctx.lineDashOffset = -t * 30; for (let i = 0; i < M.length && !G.FLAT; i++) { const c = M[i]; if (c.inShip) continue; const cx = sx(c.rx === undefined ? c.x : c.rx), cy = sy(c.ry === undefined ? c.y : c.ry); if (Math.hypot(cx - bx, cy - by) < 40) continue; ctx.strokeStyle = 'rgba(246,211,101,0.6)'; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(bx, by - S * 0.2 * v.scale); ctx.stroke(); } ctx.setLineDash([]); } }
    for (let i = FXB.length - 1; i >= 0; i--) { const k = FXB[i], u = (t - k.t0) / 1.25; if (u >= 1) { FXB.splice(i, 1); continue; } const S = k.ship.bp.S || 70, hx = sx(k.ship.x), hy = sy(k.ship.y + S * 0.1), ax = sx(k.x), ay = sy(k.y), q = Math.min(1, u / 0.55), e = k.in ? q : 1 - q, px = ax + (hx - ax) * e, py = ay + (hy - ay) * e - Math.sin(e * 3.1416) * 34;
      if (u < 0.6) { const g = ctx.createRadialGradient(px, py, 0, px, py, 16); g.addColorStop(0, 'rgba(255,245,200,0.95)'); g.addColorStop(1, 'rgba(246,211,101,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(px, py, 16, 0, TAU); ctx.fill(); ctx.fillStyle = '#fff3c8'; ctx.beginPath(); ctx.arc(px, py, 4, 0, TAU); ctx.fill(); }
      const a = Math.min(1, (1 - u) * 3), ty = (k.in ? hy : ay) - 34 - u * 22, txt = '#' + k.id + (k.in ? '  aboard ✓' : '  steps out'); ctx.font = '800 12px system-ui, sans-serif'; const tw = ctx.measureText(txt).width + 18, tx = k.in ? hx : ax; ctx.fillStyle = 'rgba(9,18,30,' + 0.88 * a + ')'; G.roundRect(ctx, tx - tw / 2, ty - 11, tw, 22, 11); ctx.fill(); ctx.fillStyle = 'rgba(' + (k.in ? '154,240,208' : '246,211,101') + ',' + a + ')'; ctx.fillText(txt, tx, ty + 0.5); }
    // coming down: its fire under it
    if (landing && (G.W.works || []).indexOf(landing.ship) >= 0) { const sh = landing.ship, S = sh.bp.S || 70, x = sx(sh.x), y = sy(sh.y + S * 0.5), Lf = (70 + 150 * (1 - (landing.u || 0))) * v.scale * (0.8 + 0.25 * Math.sin(t * 29)), w = S * 0.28 * v.scale, fg = ctx.createLinearGradient(0, y, 0, y + Lf); fg.addColorStop(0, 'rgba(255,250,220,0.95)'); fg.addColorStop(0.3, 'rgba(255,190,90,0.85)'); fg.addColorStop(1, 'rgba(255,110,60,0)'); ctx.fillStyle = fg; ctx.beginPath(); ctx.moveTo(x - w, y - 4); ctx.quadraticCurveTo(x, y + Lf * 1.5, x + w, y - 4); ctx.closePath(); ctx.fill();
      const gy = sy(landing.y0 + S * 0.55); for (let i = 0; i < 12; i++) { const q = (t * 0.9 + i / 12) % 1, side = i % 2 ? 1 : -1; ctx.fillStyle = 'rgba(232,238,248,' + 0.3 * (1 - q) * (landing.u || 0) + ')'; ctx.beginPath(); ctx.arc(x + side * (10 + 120 * q) * v.scale, gy - q * 14 * v.scale, (12 + 30 * q) * v.scale, 0, TAU); ctx.fill(); } }
    ctx.restore();
  }
  function shipAt(ctx, bp, sx, sy, hd, t, size) {
    const S = bp.S || 70, top = Math.max(40, bp.top || (G.buildTop ? G.buildTop({ bp: bp }) + S * 0.45 : S * 1.6)), k = size / top;
    ctx.save(); ctx.translate(sx, sy); ctx.rotate(hd + Math.sin(t * 1.7) * 0.03);
    const fl = size * (0.45 + 0.2 * Math.sin(t * 31) + 0.11 * Math.sin(t * 17)), w = size * 0.16, fg = ctx.createLinearGradient(0, size * 0.5, 0, size * 0.5 + fl * 1.6); fg.addColorStop(0, 'rgba(255,250,220,0.95)'); fg.addColorStop(0.35, 'rgba(255,190,90,0.85)'); fg.addColorStop(1, 'rgba(255,110,60,0)');
    ctx.fillStyle = fg; ctx.beginPath(); ctx.moveTo(-w, size * 0.46); ctx.quadraticCurveTo(0, size * 0.55 + fl * 1.9, w, size * 0.46); ctx.closePath(); ctx.fill();
    try { if (!(G.art && G.art.shipFlying && G.art.shipFlying(ctx, G.W, 'mine', size))) { ctx.translate(0, size * 0.5); ctx.scale(k, k); G.drawBlueprint(ctx, { x: 0, y: -S * 0.45, bp: bp }, false); } } catch (e) { console.error(e); }      /* (the ship as this star's people paint it, where they do: 53_art.js) */
    ctx.restore();
  }
  /** smoke and fire under the ship, and the count in great numbers */
  function launchFx(ctx, v, t) {
    const d = cur(); if (!d || (G.pondAsleep && G.pondAsleep())) return; const st = d.steps[d.i]; if (st.do !== 'countdown' && st.do !== 'liftoff') return;
    const ship = shipOfPlan(d); if (!ship) return; const S = ship.bp.S || 70, lift = d.voyage.lift || 0, left = st.do === 'countdown' ? st.secs - d.t : 0, heat = st.do === 'liftoff' ? 1 : clamp(1 - left / 4, 0, 1);
    const sx = ship.x * v.scale + v.ox, sy = (ship.y + S * 0.5) * v.scale + v.oy, gy = (d.voyage.y0 + S * 0.55) * v.scale + v.oy;
    ctx.save(); ctx.setTransform(v.dpr, 0, 0, v.dpr, 0, 0);
    // smoke rolling out along the ground, more as the count runs down
    { const n = st.do === 'liftoff' ? 16 : Math.round(4 + 10 * clamp(1 - left / st.secs, 0, 1)); for (let i = 0; i < n; i++) { const q = (t * 0.9 + i / n) % 1, side = i % 2 ? 1 : -1, r = (12 + 34 * q) * v.scale * (st.do === 'liftoff' ? 1.4 : 1); ctx.fillStyle = 'rgba(232,238,248,' + 0.34 * (1 - q) + ')'; ctx.beginPath(); ctx.arc(sx + side * (10 + (60 + 80 * heat) * q + Math.sin(i * 12.9) * 14) * v.scale, gy - q * 16 * v.scale + Math.sin(i * 3.1) * 6, r, 0, TAU); ctx.fill(); } }
    // the engine's fire
    if (heat > 0) { const L = ((st.do === 'liftoff' ? 90 + 190 * lift : 34 * heat)) * v.scale * (0.8 + 0.25 * Math.sin(t * 29)), w = S * 0.3 * v.scale * (0.5 + 0.5 * heat), fg = ctx.createLinearGradient(0, sy, 0, sy + L); fg.addColorStop(0, 'rgba(255,250,220,0.95)'); fg.addColorStop(0.3, 'rgba(255,190,90,0.85)'); fg.addColorStop(1, 'rgba(255,110,60,0)'); ctx.fillStyle = fg; ctx.beginPath(); ctx.moveTo(sx - w, sy - 4); ctx.quadraticCurveTo(sx, sy + L * 1.5, sx + w, sy - 4); ctx.closePath(); ctx.fill(); }
    // T minus ...
    { const n = st.do === 'countdown' ? Math.max(1, Math.ceil(left)) : 0, txt = n ? String(n) : 'LIFT-OFF!', frac = st.do === 'countdown' ? left - Math.floor(left - 1e-6) : 1 - lift, pop = 1 + 0.25 * Math.max(0, frac - 0.75) * 4, cx = v.w / 2, cy = Math.max(262, v.h * 0.34);
      if (n !== lastCount) { lastCount = n; if (G.sfx) G.sfx(n ? 'click' : 'discovery'); }
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = '800 13px system-ui, sans-serif'; ctx.fillStyle = 'rgba(246,211,101,0.95)'; if (n) ctx.fillText('T  M I N U S', cx, cy - 78);
      ctx.font = '800 ' + Math.round((n ? 132 : 76) * pop) + 'px system-ui, sans-serif'; ctx.lineWidth = 10; ctx.strokeStyle = 'rgba(9,16,26,0.75)'; ctx.lineJoin = 'round'; ctx.strokeText(txt, cx, cy); ctx.shadowColor = 'rgba(246,211,101,0.9)'; ctx.shadowBlur = 34; ctx.fillStyle = n && n <= 3 ? '#ffd0a0' : '#fff3c8'; ctx.fillText(txt, cx, cy); ctx.shadowBlur = 0;
      ctx.font = '800 13px system-ui, sans-serif'; ctx.fillStyle = 'rgba(234,244,255,0.95)'; ctx.fillText((d.voyage.home ? 'HOME FROM ' : 'MISSION TO ') + d.voyage.name.toUpperCase(), cx, cy + (n ? 84 : 56)); }
    ctx.restore();
  }
  function draw() {
    const ctx = G.ctx, v = G.view; if (!ctx || G.mode !== 'play') return;
    const t = now(); launchFx(ctx, v, t);
    if (!flight) return;
    const ease = function (q) { return q < 0.5 ? 2 * q * q : 1 - 2 * (1 - q) * (1 - q); };
    const f = flight, u0 = clamp((t - f.t0) / f.T, 0, 1), u = ease(u0), x = f.x0 + (f.x1 - f.x0) * u, y = f.y0 + (f.y1 - f.y0) * u;
    { const sx = x * v.scale + v.ox, sy = y * v.scale + v.oy, ax = f.x0 * v.scale + v.ox, ay = f.y0 * v.scale + v.oy, dx = f.x1 - f.x0, dy = f.y1 - f.y0, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L;
      ctx.save(); ctx.setTransform(v.dpr, 0, 0, v.dpr, 0, 0);
      const g = ctx.createLinearGradient(ax, ay, sx, sy); g.addColorStop(0, 'rgba(246,211,101,0)'); g.addColorStop(1, 'rgba(246,211,101,0.75)'); ctx.strokeStyle = g; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.setLineDash([3, 9]); ctx.lineDashOffset = -t * 30; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(sx, sy); ctx.stroke(); ctx.setLineDash([]);
      const gl = ctx.createRadialGradient(sx, sy, 0, sx, sy, 60); gl.addColorStop(0, 'rgba(246,211,101,0.35)'); gl.addColorStop(1, 'rgba(246,211,101,0)'); ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(sx, sy, 60, 0, TAU); ctx.fill();
      for (let i = 0; i < 9; i++) { const q = (t * 1.6 + i / 9) % 1; ctx.fillStyle = 'rgba(255,' + Math.round(230 - 120 * q) + ',' + Math.round(170 - 130 * q) + ',' + 0.7 * (1 - q) + ')'; ctx.beginPath(); ctx.arc(sx - ux * (30 + 70 * q) + Math.sin(i * 7.3) * 5 * q, sy - uy * (30 + 70 * q) + Math.cos(i * 5.1) * 5 * q, 2.6 * (1 - q) + 0.6, 0, TAU); ctx.fill(); }
      shipAt(ctx, f.bp, sx, sy, Math.atan2(dy, dx) + Math.PI / 2, t, 46);
      ctx.restore(); }
    if (u0 >= 1) { const dn = f.done; flight = null; try { dn(); } catch (e) { console.error(e); if (pickEl) pickEl.classList.add('hide'); } }
  }
  // those who go (or would go) in the ship carry a small gold rocket over their heads, so you can see who they are
  function marks() {
    if ((!crewNow.length && !mineNow.length) || flight || G.mode !== 'play') return; const ctx = G.ctx, v = G.view; if (!ctx || v.scale < 0.3 || (G.pondAsleep && G.pondAsleep())) return;
    const t = now(); ctx.save(); ctx.setTransform(v.dpr, 0, 0, v.dpr, 0, 0); ctx.lineJoin = 'round';
    for (let i = 0; i < mineNow.length; i++) { const c = mineNow[i]; if (c.dead) continue; const x = (c.rx === undefined ? c.x : c.rx) * v.scale + v.ox + c.ph.r * 0.5 * v.scale, y = ((c.ry === undefined ? c.y : c.ry) - c.ph.r * 2.1) * v.scale + v.oy - 4; if (x < -20 || y < -20 || x > v.w + 20 || y > v.h + 20) continue;      /* those born there of your people: a small gold pennant */
      ctx.strokeStyle = '#14202e'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x, y + 9); ctx.lineTo(x, y - 7); ctx.stroke(); ctx.fillStyle = '#f6d365'; ctx.beginPath(); ctx.moveTo(x, y - 7); ctx.lineTo(x + 9 + Math.sin(t * 5 + c.id), y - 3.5); ctx.lineTo(x, y); ctx.closePath(); ctx.fill(); ctx.lineWidth = 1; ctx.stroke(); }
    for (let i = 0; i < crewNow.length; i++) { const c = crewNow[i]; if (c.dead || c.inShip) continue; const x = (c.rx === undefined ? c.x : c.rx) * v.scale + v.ox, y = ((c.ry === undefined ? c.y : c.ry) - c.ph.r * 2.2) * v.scale + v.oy - 12 + Math.sin(t * 3 + c.id) * 2.5, k = clamp(v.scale, 0.75, 1.5);
      if (x < -20 || y < -20 || x > v.w + 20 || y > v.h + 20) continue;
      ctx.save(); ctx.translate(x, y); ctx.scale(k, k); ctx.fillStyle = 'rgba(255,170,80,0.9)'; ctx.beginPath(); ctx.moveTo(-2.5, 6); ctx.lineTo(0, 11 + 2 * Math.sin(t * 20 + i)); ctx.lineTo(2.5, 6); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#f6d365'; ctx.strokeStyle = '#14202e'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(0, -9); ctx.quadraticCurveTo(4.6, -3, 3.4, 6); ctx.lineTo(-3.4, 6); ctx.quadraticCurveTo(-4.6, -3, 0, -9); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-3.4, 2); ctx.lineTo(-7, 7); ctx.lineTo(-3.4, 6); ctx.closePath(); ctx.moveTo(3.4, 2); ctx.lineTo(7, 7); ctx.lineTo(3.4, 6); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#14202e'; ctx.beginPath(); ctx.arc(0, -2, 1.5, 0, TAU); ctx.fill(); ctx.restore(); }
    ctx.restore();
  }
  function flightCam() {
    const f = flight; if (!f || G.mode !== 'play') return; const u0 = clamp((now() - f.t0) / f.T, 0, 1), sm = function (q) { q = clamp(q, 0, 1); return q * q * (3 - 2 * q); }, e = u0 < 0.5 ? 2 * u0 * u0 : 1 - 2 * (1 - u0) * (1 - u0);
    const zEnd = 0.26, z = u0 < 0.34 ? f.z0 * Math.pow(f.zFar / f.z0, sm(u0 / 0.34)) : u0 < 0.76 ? f.zFar : f.zFar * Math.pow(zEnd / f.zFar, sm((u0 - 0.76) / 0.24));
    G.cam.z = z; G.cam.x = f.x0 + (f.x1 - f.x0) * e; G.cam.y = f.y0 + (f.y1 - f.y0) * e; if (G.applyCam) G.applyCam();
  }
  G.addSystem({ name: 'voyage', update: function () { flightCam(); }, draw: function () { marks(); boardFx(); draw(); } });

  // ── in the NOW panel: the ship, the mission with its crew, your outposts ──
  if (G.hub) {
    G.hub.add(function (W) {
      const out = { sig: stateOf(), now: [], space: [], spaceN: [], news: [] }, d = plan(), V = F.visiting, ship = F.shipOf(), Wk = W.works || [];
      const port = Wk.filter(function (w) { return w.bp && w.bp.type === 'port' && !w.fall; })[0], anyShip = Wk.filter(function (w) { return w.bp && w.bp.type === 'ship' && !w.visitor; })[0], dd = W.deed, making = dd && dd.result && (dd.result.port || dd.result.ship) ? dd : null;
      const both = function (row) { out.now.push(row); out.space.push(row); };
      const pic = function (w, sign) { const u = w && w.bp && G.buildPic ? G.buildPic(w, 34) : ''; return u ? '<img alt="" src="' + u + '" style="width:30px;height:30px">' : sign; };
      // 1. what is happening with the ship right now
      if (V && V.peek) { const mine0 = F.lineN(); out.sig += 'K' + mine0; both(G.hub.row({ icon: '⚑', title: 'Looking in on ' + V.name, tag: 'your outpost', live: true, sub: mine0 + ' of yours live here, among people who are ' + esc(V.mood) + '. Your ship is at home.', extra: '<span class="hbtn" data-act="voyHome">BACK TO MY STAR</span>' })); } else if (V && F.here === 'home') { const r0 = F.book[V.key] || {}; out.sig += 'H' + (r0.mine | 0); both(G.hub.row({ icon: '▲', title: 'Your ship is at ' + V.name, tag: 'away', live: true, sub: (r0.mine | 0) + ' of yours are there. You are watching your own star; that one stands still until you go back.', extra: '<span class="hbtn" data-act="voyThere">GO THERE</span><span class="hbtn q" data-act="voyHome">FLY HOME</span>' })); }
      else if (V) { const mine = F.lineN(); out.sig += 'V' + mine + V.adds; both(G.hub.row({ icon: '⚑', title: 'You are at ' + V.name, tag: 'visiting', live: true, sub: 'Its people are ' + esc(V.mood) + '. ' + mine + ' of yours live here · ' + V.adds + ' of ' + V.adds0 + ' ADD' + (V.adds0 === 1 ? '' : 's') + ' left.', extra: '<span class="hbtn" data-act="voyHome">FLY HOME</span><span class="hbtn q" data-act="voyWatchHome">WATCH HOME</span><span class="hbtn q" data-act="voyShip">THE SHIP</span>' })); }
      else if (d) { const M = members(d), inN = M.filter(function (c) { return c.inShip; }).length, st = d.steps[d.i]; out.sig += inN + ':' + Math.round(d.t);
        both(G.hub.row({ icon: '▲', title: 'Mission to ' + d.voyage.name, tag: (STEPW[st.do] || '').replace(/^the crew is |^they are |^all aboard: /, ''), live: true, sub: inN + ' of ' + M.length + ' aboard. Each of the crew carries a gold rocket over its head.', extra: crewHtml(M) + (st.do === 'liftoff' ? '' : '<span class="hbtn q" data-act="voyOff">CALL IT OFF</span>') })); }
      else if (want) both(G.hub.row({ icon: '▲', title: 'Mission to ' + want.p.name, tag: 'waiting', live: true, sub: W.deed ? 'They will go as soon as they have finished ' + esc(W.deed.title) + '.' : 'The crew is making ready.', extra: '<span class="hbtn q" data-act="voyOff">CALL IT OFF</span>' }));
      else if (ship) { const C = F.crewFor(ship), h = F.holdOf(ship); out.sig += C.map(function (c) { return c.id; }).join('.'); out.news.push('ship' + ship.name);
        both(G.hub.row({ icon: pic(ship, '▲'), title: ship.name, tag: 'ready to fly', sub: 'A spaceship of the ' + esc(ship.by) + ', standing on its port. It carries ' + h.crew + ' to another star, and ' + h.adds + ' ADD' + (h.adds === 1 ? '' : 's') + '. Who would go:', extra: crewHtml(C, true) + '<span class="hbtn" data-act="voyPick">PLAN A VOYAGE</span><span class="hbtn q" data-act="voyShip">SHOW IT</span>' })); }
      // 2. the port and the ship, always (SPACE): what stands, what is being built, what is still to come
      const pc = function (w) { const n = w && w.bp ? G.buildCount(w) : null; return n ? n[0] + ' of ' + n[2] + ' pieces' : 'no pieces yet'; };
      if (!V || F.here === 'home') {
        if (making) { out.sig += 'mk' + (making.bp ? G.buildCount(making).join('.') : 'plan'); const row = G.hub.row({ icon: pic(making, '⚒'), title: making.title, tag: 'being built', live: true, sub: 'The ' + esc(making.kind) + ' are building ' + (making.result.port ? 'a spaceport on the shore: the pad a spaceship will stand on.' : 'their spaceship on the port.') + (making.bp ? ' ' + pc(making) + ' set.' : ' They are working out its shape.'), act: 'voyDeed' }); out.space.push(row); out.now.push(row); out.news.push('mk' + making.title); }
        if (port) { out.sig += 'p' + G.buildCount(port).join('.'); out.spaceN.push(1); out.news.push('port' + port.name); out.space.push(G.hub.row({ icon: pic(port, '▭'), title: port.name, tag: 'the spaceport', sub: 'Built by the ' + esc(port.by) + ' in generation ' + port.gen + ', on the land at the edge of the star. ' + pc(port) + ' stand.' + (anyShip || (making && making.result.ship) ? '' : ' A spaceship will be built on it next.'), act: 'voyPort' })); }
        else if (!making) out.space.push('<div class="rnone"><b style="color:#f6d365">No spaceport yet.</b> A kind that has made itself a place of its own will, in time, build a spaceport on the land at the edge of the star, and then a spaceship standing on it. Both will show here, and the ship can then be sent to another star.</div>');
        if (anyShip && !ship && !d) { out.sig += 's' + G.buildCount(anyShip).join('.') + (anyShip.away ? 'a' : ''); if (!anyShip.away) out.space.push(G.hub.row({ icon: pic(anyShip, '▲'), title: anyShip.name, tag: 'not whole', bad: true, sub: pc(anyShip) + ' stand. Its keepers are mending it: it cannot fly until every piece is set.', act: 'voyShip2' })); }
        if (anyShip) out.spaceN.push(1);
      }
      // 3. the far ponds you have been to
      const keys = Object.keys(F.book).filter(function (k) { return !F.there() || k !== V.key; });
      if (keys.length) out.space.push('<div class="rh">Far stars you have been to</div>');
      keys.forEach(function (k) { const r = F.book[k]; out.sig += k + r.mine + '|'; out.space.push(G.hub.row({ icon: '⚑', title: r.name, tag: r.mine ? 'your outpost: ' + r.mine : 'visited', sub: 'You have been there ' + (r.visits === 1 ? 'once' : r.visits + ' times') + (r.mine ? '; ' + r.mine + ' of your people live there.' : '; none of yours live there now.'), extra: !V && r.blob ? '<span class="hbtn' + (r.mine ? '' : ' q') + '" data-act="voyPeek" data-arg="' + k + '">LOOK IN</span>' : '' })); });
      return out;
    });
    const goWork = function (w) { if (w) { if (G.select) G.select(null); if (G.focusOn) G.focusOn(w.x, w.y - 20, 1.4); if (G.selectThing) G.selectThing({ k: 'work', o: w }); } };
    G.hub.act('voyPort', function () { goWork((G.W.works || []).filter(function (w) { return w.bp && w.bp.type === 'port'; })[0]); });
    G.hub.act('voyShip2', function () { goWork((G.W.works || []).filter(function (w) { return w.bp && w.bp.type === 'ship'; })[0]); });
    G.hub.act('voyDeed', function () { const dd = G.W.deed; if (dd && G.focusOn) G.focusOn(dd.x, dd.y - 20, 1.4); });
    G.hub.act('voyPick', function () { G.voyagePick(); });
    G.hub.act('voyOff', function () { G.voyageOff(); });
    G.hub.act('voyHome', function () { G.voyageHome('crew'); });
    G.hub.act('voyPeek', function (key) { if (F.visiting || flight || plan()) return; if (G.selectThing) G.selectThing(null); if (G.select) G.select(null); if (F.peek(key)) { const V = F.visiting; if (G.hub) G.hub.close(); if (G.setSpeed) G.setSpeed(1); say('LOOKING IN ON ' + V.name.toUpperCase(), F.lineN() + ' of yours live here: each carries a gold pennant. Your own star waits as you left it.', 8000); } else tip('<b>That star cannot be looked in on just now.</b>'); });
    G.hub.act('voyThere', function () { G.voyageLook('far'); });
    G.hub.act('voyWatchHome', function () { G.voyageLook('home'); });
    G.hub.act('voyShip', function () { const s = F.shipOf(); if (s) { if (G.focusOn) G.focusOn(s.x, s.y, 1.3); if (G.selectThing) G.selectThing({ k: 'work', o: s }); } });
  }
  document.addEventListener('click', function (e) { let n = e.target, inBox = false; for (let q = n; q; q = q.parentNode) if (q.id === 'rarebox') inBox = true; if (inBox && !(function () { for (let q = n; q; q = q.parentNode) if (q.dataset && q.dataset.act && q.classList && q.classList.contains('hbtn')) return true; return false; })()) { for (let q = n; q; q = q.parentNode) if (q.dataset && q.dataset.c) { e.stopPropagation(); crewClick(e); return; } } }, true);

  // ── where you are, and what you may still do there ──
  setInterval(function () {
    try {
      els(); { const se = $('season'), pn = $('panel'), a = se && !se.classList.contains('hide') && se.offsetWidth ? se.getBoundingClientRect().right + 10 : 14, b = pn && !pn.classList.contains('hide') && pn.offsetWidth ? pn.getBoundingClientRect().left - 10 : window.innerWidth - 14, wide = window.innerWidth > 900 && b - a > 360; [pickEl, bar].forEach(function (e) { if (wide && e.style.top !== '58px') { e.style.left = Math.round((a + b) / 2) + 'px'; e.style.maxWidth = Math.round(b - a) + 'px'; } else { e.style.left = ''; e.style.maxWidth = ''; } }); }
      const V = F.visiting, T = F.there(), W = G.W, on = !!(V && W && G.mode === 'play' && !W.title && !flight), d = W && !W.title && G.mode === 'play' ? cur() : null;
      if (want && W && !W.deed && G.mode === 'play') start();
      const gh = $('gohome'); if (gh) { const sp = gh.querySelector('span'), t = T ? 'BACK TO ' + T.name.toUpperCase() : 'BACK TO MY STAR'; if (sp && sp.textContent !== t) sp.textContent = t; }
      if (!on || (R && T)) { if (!bar.classList.contains('hide')) bar.classList.add('hide'); }
      else { const mine = F.lineN(), wish = $('wish'), top = wish && !wish.classList.contains('hide') && wish.offsetHeight && window.innerWidth > 720 ? Math.round(wish.getBoundingClientRect().bottom + 8) : 14;
        const r0 = F.book[V.key] || {}, crewN = T ? W.cre.filter(function (q) { return q.crew && !q.dead; }).length : 0, marked = T ? W.cre.filter(function (q) { return q.aboard && !q.dead; })[0] : null;
        const t = V.peek ? '<span><b>⚑ LOOKING IN ON ' + esc(V.name.toUpperCase()) + '</b> · its people are ' + esc(V.mood) + '<br><i>' + mine + '</i> of yours live here' + (mine ? ': each carries a gold pennant' : ' now') + '</span><button class="btn sm" id="voyHome">BACK TO MY STAR</button>'
          : T ? '<span><b>⚑ VISITING ' + esc(V.name.toUpperCase()) + '</b> · its people are ' + esc(V.mood) + '<br><i>' + mine + '</i> of yours live here (the crew carry gold rockets) · <i>' + V.adds + '</i> of ' + V.adds0 + ' ADD' + (V.adds0 === 1 ? '' : 's') + ' left' + (marked ? ' · #' + marked.id + ' is to come home' : '') + '</span><button class="btn sm" id="voyShip">THE SHIP</button><button class="btn sm" id="voyLookHome">WATCH HOME</button><button class="btn sm" id="voyHome">' + (crewN ? 'CREW HOME (' + crewN + ')' : 'FLY HOME') + '</button>' + (crewN ? '<button class="btn sm" id="voyAlone">SHIP ALONE</button>' : '')
          : '<span><b>▲ YOUR SHIP IS AT ' + esc(V.name.toUpperCase()) + '</b><br><i>' + (r0.mine | 0) + '</i> of yours are there · you are watching your own star</span><button class="btn sm" id="voyLookFar">GO THERE</button><button class="btn sm" id="voyHome">FLY HOME</button>';
        if (bar._t !== t) { bar._t = t; bar.innerHTML = t; } bar.style.top = top + 'px'; bar.classList.remove('hide'); }
      // the mission bar, at the top of the pond: its stages, what they are doing now, and who is aboard
      if (d && !flight && !picking && !(G.pondAsleep && G.pondAsleep())) { const M = members(d), st = d.steps[d.i], inN = M.filter(function (c) { return c.inShip; }).length;
        const t = '<div class="mt">▲ ' + (d.voyage.home ? 'THE FLIGHT HOME FROM ' : 'MISSION TO ') + esc(d.voyage.name.toUpperCase()) + '</div><div class="stg">' + STAGES.filter(function (q) { return d.steps.some(function (s) { return s.do === q[0]; }); }).map(function (q, i) { return '<span class="' + (i < d.i ? 'dn' : i === d.i ? 'on' : '') + '">' + q[1] + '</span>'; }).join('') + '</div>' +
          '<div class="mrow"><span>' + esc((STEPW[st.do] || '').replace(/^./, function (m) { return m.toUpperCase(); })) + ' · <b style="font-size:12px;letter-spacing:0">' + inN + ' of ' + M.length + ' aboard</b></span>' + crewHtml(M) + (st.do === 'liftoff' ? '' : '<button class="btn sm" id="voyCancel2">' + (st.do === 'countdown' ? 'ABORT' : 'CALL IT OFF') + '</button>') + '</div>';
        if (pickEl._t !== t) { pickEl._t = t; pickEl.innerHTML = t; }
        pickEl.classList.add('mission'); pickEl.style.top = '14px'; pickEl.classList.remove('hide'); }
      else if (!flight && !picking && !pickEl.classList.contains('hide')) { pickEl.classList.add('hide'); pickEl.classList.remove('mission'); pickEl._t = ''; }
      // BRING HOME on a creature's card, in a far pond
      const at = $('idoing'), c = G.R && G.R.sel;
      if (at && !aboardBtn) { aboardBtn = document.createElement('button'); aboardBtn.id = 'iaboard'; aboardBtn.className = 'btn sm'; at.parentNode.insertBefore(aboardBtn, at);
        aboardBtn.onclick = function () { const q = G.R && G.R.sel; if (!q) return; if (G.sfx) G.sfx('click'); if (F.there()) { const was = !!q.aboard; G.W.cre.forEach(function (o) { o.aboard = false; }); q.aboard = !was; } else if (editable()) { const s3 = F.shipOf(), inIt = s3 && F.crewFor(s3).indexOf(q) >= 0; q.crewPick = inIt ? -1 : 1; if (G.hub) G.hub.poke(); } aboardBtn._t = ''; }; }
      if (aboardBtn) { const s3 = c && !c.dead && c.g && !flight ? F.shipOf() : null, far = !!(T && !V.peek && s3 && !R), home = !!(!V && s3 && editable() && !c.deedId), show = far || home; aboardBtn.style.display = show ? '' : 'none';
        if (show) { const inIt = home && F.crewFor(s3).indexOf(c) >= 0, t = far ? (c.aboard ? '⚑ COMING HOME WITH THE SHIP (undo)' : c.crew ? '⚑ One of the crew: it comes home when they are called' : '⚑ BRING HOME with the ship') : inIt ? '▲ IN THE CREW · take it out' : '▲ PUT IN THE CREW of the ' + s3.name;
          if (aboardBtn._t !== t) { aboardBtn._t = t; aboardBtn.textContent = t; aboardBtn.style.borderColor = c.aboard || inIt ? 'var(--gold)' : ''; aboardBtn.title = far ? 'One creature of this star, yours or theirs, may come back with the ship when it flies home.' : 'Who flies is theirs to decide, and yours to change: anyone you put in goes first.'; } } }
      { const tb = $('toolbar'), Wk2 = (W && W.works) || [], has = !!(W && !W.title && G.mode === 'play' && (V || Object.keys(F.book).length || Wk2.some(function (w) { return w.bp && (w.bp.type === 'port' || w.bp.type === 'ship'); }))); let sb = $('tb-space');
        if (tb && has && !sb) { sb = document.createElement('button'); sb.id = 'tb-space'; sb.className = 'btn'; sb.title = 'The spaceport, the spaceship and your missions to other stars'; sb.innerHTML = '<span style="color:#f6d365;font-size:13px;margin-right:6px">▲</span><span class="lab">SPACE</span>'; sb.style.borderColor = 'rgba(246,211,101,.6)'; const nb = $('tb-now'); tb.insertBefore(sb, nb ? nb.nextSibling : tb.firstChild); sb.onclick = function () { if (G.mode !== 'play') return; if (G.sfx) G.sfx('click'); if (G.hub) { if (G.hub.tab() === 'space') G.hub.close(); else { if (G.closePop) G.closePop(); G.hub.open('space'); } } }; }
        if (sb) { sb.style.display = has ? '' : 'none'; const ready = !!(W && !V && !d && !want && F.shipOf()); sb.classList.toggle('pulse', ready); } }
      // who would go: marked in the pond
      if (++tick % 2 === 0) { const s2 = !V && !flight && G.mode === 'play' && W && !W.title ? F.shipOf() : null; crewNow = d ? members(d) : T ? W.cre.filter(function (q) { return q.crew && !q.dead; }) : s2 ? F.crewFor(s2) : []; mineNow = T ? W.cre.filter(function (q) { return q.line && !q.crew && !q.dead; }) : []; }
    } catch (e) { console.error(e); }
  }, 450);
  // the ship carries only so many ADDs
  setTimeout(function () { if (!G.act) return; const a0 = G.act; G.act = function (name) { const V = F.there(); if (name === 'add' && V && V.adds <= 0 && G.mode === 'play') { tip('<b style="color:var(--gold)">The ship carried ' + V.adds0 + ' ADD' + (V.adds0 === 1 ? '' : 's') + ', and ' + (V.adds0 === 1 ? 'it is' : 'they are') + ' used.</b><br>A bigger ship carries more. Fly home and come again.'); return; } return a0(name); }; }, 0);
  // news
  G.on('deed-end', function (d, how, made) { if (G.mode === 'play' && made && made.bp && made.bp.type === 'ship' && !F.visiting) setTimeout(function () { if (G.note) G.note('They have a spaceship', 'Open NOW (bottom left) or click the ' + made.name + ', and PLAN A VOYAGE to another star.'); if (G.log) G.log('sp', 'A spaceship', 'The ' + made.by + ' built the ' + made.name + '. It can fly to another star.'); }, 5000); });
  G.on('extinct', function () { const V = F.there(); if (!V || G.mode !== 'play') return; setTimeout(function () { if (F.visiting !== V) return; say('NOTHING LIVES AT ' + V.name.toUpperCase() + ' NOW', 'The star has fallen still. The ship turns for home.', 8000); G.voyageHome(true); }, 1500); });
  G.on('new-pond', function (opts) { if (opts && opts.voyage) return; picking = null; flight = null; want = null; R = null; crewNow = []; mineNow = []; if (pickEl) pickEl.classList.add('hide'); if (bar) bar.classList.add('hide'); });
})();
