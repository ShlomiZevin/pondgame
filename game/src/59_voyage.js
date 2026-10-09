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
  let flight = null, pickEl = null, bar = null, aboardBtn = null, crewNow = [], tick = 0, lastCount = -1;
  const now = function () { return (typeof performance !== 'undefined' ? performance.now() : Date.now()) / 1000; };
  const say = function (k, t, ms) { if (G.banner) G.banner(k, t, ms || 8000); };
  const tip = function (html) { if (G.toast) G.toast(html); };
  const unit = function () { const v = G.view; return Math.max(v.ww, v.wh) / (v.grow || 1); };
  /** where a far pond lies in space, seen from your own pond; and where your own lies, seen from the far pond you are in */
  const spot = function (p) { const W = G.W, jt = F.jit(p.i, p.j), cs = unit() * 8; return { x: W.ww / 2 + (p.i + jt[0]) * cs, y: W.wh / 2 + (p.j + jt[1]) * cs }; };
  const homeAt = function () { const W = G.W, o = F.origin || { i: 0, j: 0 }, jo = F.jit(o.i, o.j), cs = unit() * 8; return { x: W.ww / 2 + (-o.i - jo[0]) * cs, y: W.wh / 2 + (-o.j - jo[1]) * cs }; };
  /** the mission that is under way in this pond, or null */
  const plan = function () { const d = G.W && G.W.deed; return d && d.voyage ? d : null; };
  const members = function (d) { return G.W.cre.filter(function (c) { return c.deedId === d.id && !c.dead; }); };
  const shipOfPlan = function (d) { const Wk = (G.W.works || []); for (let i = 0; i < Wk.length; i++) if (Wk[i].name === d.voyage.ship) return Wk[i]; return null; };

  function els() {
    if (pickEl) return;
    const st = document.createElement('style');
    st.textContent = '#voypick,#voybar{position:fixed;left:50%;transform:translateX(-50%);z-index:7;display:flex;align-items:center;gap:8px 12px;flex-wrap:wrap;justify-content:center;max-width:min(780px,calc(100vw - 28px));padding:9px 14px 10px 16px;border-radius:18px;border:1px solid rgba(246,211,101,.6);font:500 12.5px/1.35 system-ui,sans-serif;color:#eaf4ff;text-align:center}' +
      '#voypick{top:58px}#voybar{top:14px}#voypick b,#voybar b{color:#f6d365;letter-spacing:.1em;font-size:10.5px;font-weight:800}#voypick .btn,#voybar .btn{min-height:30px;padding:0 14px;flex:none}#voybar i{font-style:normal;color:#f6d365}#voypick .crew{margin:0}' +
      '#voypick.mission{flex-direction:column;gap:7px;padding:10px 18px 11px;box-shadow:0 8px 34px rgba(0,0,0,.5)}#voypick .mt{font:800 15px system-ui,sans-serif;letter-spacing:.14em;color:#f6d365}#voypick .mrow{display:flex;align-items:center;gap:12px;flex-wrap:wrap;justify-content:center}' +
      '#voypick .stg{display:flex;gap:5px}#voypick .stg span{padding:4px 11px;border-radius:999px;font:800 10px system-ui,sans-serif;letter-spacing:.1em;color:#8fb2d6;background:rgba(7,18,31,.5);border:1px solid rgba(207,232,255,.16)}#voypick .stg span.dn{color:#9af0d0;border-color:rgba(51,214,166,.5)}#voypick .stg span.on{color:#14202e;background:#f6d365;border-color:#f6d365;animation:pulse 1.2s ease-in-out infinite}' +
      '#iaboard{width:100%;margin-top:6px}.crew{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0 2px;justify-content:center}.crew span{position:relative;display:flex;flex-direction:column;align-items:center;width:58px;padding:3px 2px 5px;border-radius:12px;background:rgba(246,211,101,.08);border:1px solid rgba(246,211,101,.35);cursor:pointer}.crew span:hover{background:rgba(246,211,101,.2)}.crew span.in{background:rgba(51,214,166,.18);border-color:rgba(51,214,166,.7)}.crew img{width:44px;height:44px}.crew b{font:800 10.5px system-ui,sans-serif !important;color:#fff !important;letter-spacing:0 !important}.crew i{font:600 9px system-ui,sans-serif;font-style:normal;color:#f6d365;text-align:center;line-height:1.15}.crew span.in i{color:#9af0d0}#zcard .crew,#rarebox .crew{justify-content:flex-start}';
    document.head.appendChild(st);
    const host = $('ui') || document.body;
    pickEl = document.createElement('div'); pickEl.id = 'voypick'; pickEl.className = 'glass hide'; host.appendChild(pickEl);
    bar = document.createElement('div'); bar.id = 'voybar'; bar.className = 'glass hide'; host.appendChild(bar);
    [pickEl, bar].forEach(function (e) { e.addEventListener('pointerdown', function (ev) { ev.stopPropagation(); }); });
    pickEl.addEventListener('click', function (e) { const id = e.target && e.target.id; if (id === 'voyCancel') { if (G.sfx) G.sfx('click'); cancelPick(); } else if (id === 'voyCancel2') { if (G.sfx) G.sfx('click'); G.voyageOff(); } else crewClick(e); });
    bar.addEventListener('click', function (e) { const id = e.target && e.target.id; if (id === 'voyHome') { if (G.sfx) G.sfx('click'); G.voyageHome(); } else if (id === 'voyLookHome') G.voyageLook('home'); else if (id === 'voyLookFar') G.voyageLook('far'); else if (id === 'voyShip') { const s = F.shipOf(); if (s && G.focusOn) G.focusOn(s.x, s.y, 1.3); } });
  }
  function cancelPick() { picking = null; if (pickEl) pickEl.classList.add('hide'); if (G.farCardHide) G.farCardHide(); if (G.goHome) G.goHome(); }

  // ── the crew, seen ──
  const FACE = {}; let faces = 0;
  const faceOf = function (c) { if (FACE[c.id]) return FACE[c.id]; try { const cv = document.createElement('canvas'); cv.width = cv.height = 96; const x = cv.getContext('2d'); x.translate(48, 53); x.scale(0.24, 0.24); G.form.portrait(x, c.g.f, 1.3, {}); if (++faces > 60) { for (const k in FACE) delete FACE[k]; faces = 0; } return (FACE[c.id] = cv.toDataURL('image/png')); } catch (e) { return ''; } };
  /** the crew as a row of faces: who each is, why it goes, and (while they board) whether it is aboard yet */
  const crewHtml = function (C) { if (!C.length) return '<small>Nobody is near enough to go.</small>'; return '<div class="crew">' + C.map(function (c) { const u = faceOf(c); return '<span data-c="' + c.id + '" class="' + (c.inShip ? 'in' : '') + '" title="' + esc((G.characterOf ? G.characterOf(c) : '') + '. Click to find it in the pond.') + '">' + (u ? '<img alt="" src="' + u + '">' : '') + '<b>#' + c.id + '</b><i>' + esc(c.inShip ? 'aboard' : c.crewWhy || '') + '</i></span>'; }).join('') + '</div>'; };
  function crewClick(e) { let n = e.target; while (n && !(n.dataset && n.dataset.c)) n = n.parentNode; if (!n) return false; const id = +n.dataset.c, c = G.W.cre.filter(function (q) { return q.id === id && !q.dead; })[0]; if (c && !c.inShip && G.focusOn) { if (G.sfx) G.sfx('click'); G.focusOn(c.x, c.y, 1.7); } return true; }
  const crewOf = function (ship) { const d = plan(); return d ? members(d) : F.crewFor(ship); };

  // ── the ship's card (62b_details.js asks for these) ──
  const isWhole = function (o) { const n = G.buildCount ? G.buildCount(o) : [1, 1, 1]; return !o.fall && !o.ruin && n[0] >= n[2]; };
  const stateOf = function () { const d = plan(); return F.visiting ? 'v' + (F.here || '') : d ? 'p' + d.i + members(d).map(function (c) { return c.id + (c.inShip ? 'i' : ''); }).join('.') : want ? 'w' : 'h'; };
  G.shipSig = function (o) { return stateOf() + (isWhole(o) ? crewOf(o).map(function (c) { return c.id; }).join('.') : 'x'); };
  G.shipCard = function (o) {
    const h = F.holdOf(o), d = plan();
    if (!isWhole(o)) return '<div class="ilabel">The spaceship</div><small>It is not whole: it cannot fly until every piece is set.</small>';
    if (F.there()) return '<div class="ilabel">Your spaceship</div><small>It waits to take you home. One creature may come back with it: click any creature here, yours or theirs, and press <b>BRING HOME</b> on its card. The rest of yours stay as your outpost.</small><button class="btn sm pulse" id="zsail" style="width:100%;margin-top:8px">FLY HOME</button>';
    let s = '<div class="ilabel">A spaceship</div><small>It carries <b>' + h.crew + '</b> through space to another pond, and <b>' + h.adds + '</b> ADD' + (h.adds === 1 ? '' : 's') + ' to use where it lands.</small><div class="ilabel">' + (d ? 'The crew' : 'Who would go in it') + '</div>' + crewHtml(crewOf(o));
    if (d) s += '<small>The mission to <b>' + esc(d.voyage.name) + '</b> is under way: ' + esc(STEPW[d.steps[d.i].do] || '') + '.</small>' + (d.steps[d.i].do === 'liftoff' ? '' : '<button class="btn sm" id="zsail" style="width:100%;margin-top:8px">CALL IT OFF</button>');
    else if (want) s += '<small>They will fly to <b>' + esc(want.p.name) + '</b> as soon as they have finished what they are doing.</small><button class="btn sm" id="zsail" style="width:100%;margin-top:8px">CALL IT OFF</button>';
    else s += '<small>That is theirs to decide: their leader, those who built it, then those nearest. Each carries a small gold rocket over its head in the pond.</small><button class="btn sm pulse" id="zsail" style="width:100%;margin-top:8px">PLAN A VOYAGE</button>';
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
    pickEl.classList.remove('mission'); pickEl._t = ''; pickEl.style.top = '58px'; pickEl.innerHTML = '<span><b>⚑ WHERE SHALL THEY GO?</b> Click one of the ponds out there, then FLY HERE.</span><button class="btn sm" id="voyCancel">STAY</button>'; pickEl.classList.remove('hide');
  };
  /** the far pond's card (58_beyond.js asks for it) */
  G.farCardHtml = function (p, pics, n) {
    const rec = p.home ? null : F.book[F.key(p)], ship = !F.visiting && !p.home ? (picking || F.shipOf()) : null, close = '<button class="btn sm" id="farClose">CLOSE</button>';
    if (p.home) { const L = F.homeLook || {}; return '<div class="k">Home</div><b>Your pond</b>It waits for you exactly as you left it' + (L.gen ? ': generation ' + L.gen + ', ' + L.n + ' alive' : '') + '. You can go and watch it while the ship stays here.<div class="r">' + (F.visiting ? '<button class="btn sm" id="farWatchHome">WATCH HOME</button><button class="btn sm pulse" id="farSailHome">FLY HOME</button>' : '') + close + '</div>'; }
    if (F.visiting && F.here === 'home' && F.key(p) === F.visiting.key) { const r0 = F.book[F.visiting.key] || {}; return '<div class="k">Your ship is here</div><b>' + esc(p.name) + '</b>' + (pics ? '<div class="ks">' + pics + '</div>' : '') + (r0.mine | 0) + ' of yours are there, among people who are ' + esc(F.moodWords(p)) + '. It waits as you left it.<div class="r"><button class="btn sm pulse" id="farWatch">GO THERE</button><button class="btn sm" id="farSailHome">FLY HOME</button>' + close + '</div>'; }
    let h = '<div class="k">A far pond</div><b>' + esc(p.name) + '</b>' + (pics ? '<div class="ks">' + pics + '</div>' : '') + n + (n === 1 ? ' kind lives' : ' kinds live') + ' here. Its people are ' + esc(F.moodWords(p)) + '.';
    if (rec) h += '<br><span style="color:#f6d365">You have been here ' + (rec.visits === 1 ? 'once' : rec.visits + ' times') + '. ' + (rec.mine ? rec.mine + ' of your people live here: your outpost.' : 'None of yours live here now.') + '</span>';
    if (F.visiting) h += '<br>Your ship is at ' + esc(F.visiting.name) + ': it must fly home before it can come here.<div class="r">' + close + '</div>';
    else if (plan() || want) h += '<br>A mission is already planned. Call it off first to choose another pond.<div class="r"><button class="btn sm" id="farHome">BACK TO MY POND</button>' + close + '</div>';
    else if (ship) { const hd = F.holdOf(ship); h += '<br>Your ship carries ' + hd.crew + ', and ' + hd.adds + ' ADD' + (hd.adds === 1 ? '' : 's') + ' to use here. Choosing it starts the mission: the crew gathers, goes aboard, and after the countdown the ship lifts off.<div class="r"><button class="btn sm pulse" id="farSail">FLY HERE</button>' + close + '</div>'; }
    else h += '<br>Your creatures can come here once one of your kinds has built a <span style="color:#f6d365;font-weight:700">spaceship</span>. A kind that has made itself a place of its own builds one in time.<div class="r"><button class="btn sm" id="farHome">BACK TO MY POND</button>' + close + '</div>';
    return h;
  };
  /** FLY HERE: the pond is chosen; back to the pond, where the mission is carried out */
  G.voyageGo = function (p) {
    const ship = picking || F.shipOf(); if (!ship || F.visiting || flight || plan() || !p || p.free || p.home) return;
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
    if (d && d.steps[d.i].do !== 'liftoff') { settle(d); if (G.deedStop) G.deedStop('off'); }
    if (G.hub) G.hub.poke();
  };
  /** whoever was in the ship steps out, and the ship stands where it stood */
  function settle(d) { const W = G.W, ship = shipOfPlan(d); if (ship) ship.lifting = false; if (ship && d.voyage.y0 !== undefined) ship.y = d.voyage.y0; d.voyage.lift = 0; W.cre.forEach(function (c) { if (c.inShip) { c.inShip = false; if (ship) { c.x = c.px = ship.x + (G.rand() - 0.5) * 80; c.y = c.py = ship.y + 40 + G.rand() * 30; } } }); }
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
      if (st.do === 'liftoff') { ship.lifting = true; const u = clamp(d.t / st.secs, 0, 1); ship.y = d.voyage.y0 - u * u * 640; d.voyage.lift = u; M.forEach(function (c) { if (!c.inShip) { c.deedId = 0; } }); d.n0 = Math.max(2, M.filter(function (c) { return c.inShip; }).length); }
      for (let i = 0; i < M.length; i++) { const c = M[i]; if (c.inShip) { c.x = c.px = ship.x; c.y = c.py = ship.y - S * 0.3; c.vx = c.vy = 0; c.E = Math.max(c.E, c.ph.Emax * 0.5); } }
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
    const p = d.voyage.p, at = spot(p), y0 = d.voyage.y0; ship.y = y0; ship.lifting = false; d.voyage.lift = 0;
    fly(ship.bp, W.ww / 2, W.wh / 2, at.x, at.y, 4.4, 'CROSSING SPACE TO ' + esc(p.name.toUpperCase()) + ' · ' + crew.length + ' aboard', function () {
      crew.forEach(function (c) { c.inShip = false; });
      const out = F.sail(p, crew, ship); pickEl.classList.add('hide');
      if (!out) { tip('<b>The ship could not make the crossing.</b>'); if (G.goHome) G.goHome(); return; }
      const V = F.visiting; if (G.setSpeed) G.setSpeed(1);
      say('YOU HAVE ARRIVED AT ' + V.name.toUpperCase(), out.length + ' of yours are set down among its people, who are ' + V.mood + '. Watch how they are taken. You have ' + V.adds + ' ADD' + (V.adds === 1 ? '' : 's') + ' here.', 10000);
      if (G.log) G.log('sp', 'Arrived at ' + V.name, out.length + ' of yours went ashore: ' + out.map(function (c) { return '#' + c.id + (G.characterOf ? ' (' + G.characterOf(c) + ')' : ''); }).join(', ') + '.');
      const s = F.shipOf(); if (s && G.focusOn) G.focusOn(s.x, s.y + 40, 1.25);
    });
  });

  // ── 4. the crossing ──
  function fly(bp, x0, y0, x1, y1, T, text, done) {
    els(); const b2 = JSON.parse(JSON.stringify(bp)); b2.P.forEach(function (q) { delete q.t0; q.st = 2; });
    flight = { bp: b2, x0: x0, y0: y0, x1: x1, y1: y1, t0: now(), T: T, done: done };
    G.flyTo((x0 + x1) / 2, (y0 + y1) / 2, clamp(G.view.h * 0.6 / (Math.hypot(x1 - x0, y1 - y0) * G.view.base + 1), 0.02, FAR_Z), 1.1);
    pickEl.classList.remove('mission'); pickEl._t = ''; pickEl.style.top = '58px'; pickEl.innerHTML = '<span><b>⚑ ' + text + '</b></span>'; pickEl.classList.remove('hide');
    if (G.sfx) G.sfx('discovery'); if (G.hub) G.hub.close();
  }
  G.voyageHome = function (quiet) {
    const V = F.visiting; if (!V || flight) return;
    if (F.here === 'home' && !F.look('far')) return;      // the ship is at the far pond: the flight home starts there
    const W = G.W, bring = W.cre.filter(function (c) { return c.aboard && !c.dead; })[0] || null, H = homeAt(), s = F.shipOf(), stay = W.cre.filter(function (c) { return !c.dead && c.line && c !== bring; }).length;
    if (G.selectThing) G.selectThing(null); if (G.select) G.select(null);
    fly(s ? s.bp : V.ship.bp, W.ww / 2, W.wh / 2, H.x, H.y, quiet ? 2.6 : 4.4, 'FLYING HOME FROM ' + esc(V.name.toUpperCase()) + (bring ? ' · #' + bring.id + ' is aboard' : ''), function () {
      const r = F.home(bring); pickEl.classList.add('hide'); if (!r) return; if (G.setSpeed) G.setSpeed(1);
      say('THE SHIP IS HOME', (stay ? stay + ' of yours stayed at ' + V.name + ': they are your outpost there. ' : 'None of yours stayed at ' + V.name + '. ') + (r.brought ? (r.brought.guestName || 'One creature') + ' came back with the ship, a stranger here: see how your own take to it.' : 'Nobody came back with it.'), 10000);
      if (G.log) G.log('sp', 'Home from ' + V.name, (stay ? stay + ' stayed there.' : 'Nobody stayed.') + (r.brought ? ' ' + (r.brought.guestName || 'A creature') + ' came back.' : ''));
      if (r.brought && G.select) { G.select(r.brought); if (G.focusOn) G.focusOn(r.brought.x, r.brought.y, 1.4); }
    });
  };
  /** while the ship is away: go and watch your own pond, or go back to where the ship is */
  G.voyageLook = function (where) {
    const V = F.visiting; if (!V || flight) return; if (G.selectThing) G.selectThing(null); if (G.select) G.select(null);
    if (!F.look(where)) return; if (G.sfx) G.sfx('click'); if (G.setSpeed) G.setSpeed(1);
    if (where === 'home') say('YOUR OWN POND', 'You are watching home. The ship waits at ' + V.name + ', and that pond stands still until you look at it again.', 7000);
    else { say('BACK AT ' + V.name.toUpperCase(), 'You are with the ship again. Your own pond stands still until you look at it again.', 7000); const s = F.shipOf(); if (s && G.focusOn) G.focusOn(s.x, s.y + 40, 1.2); }
  };
  /** the ship in flight: it points where it flies, its engine burning behind it */
  function shipAt(ctx, bp, sx, sy, hd, t, size) {
    const S = bp.S || 70, top = Math.max(40, bp.top || (G.buildTop ? G.buildTop({ bp: bp }) + S * 0.45 : S * 1.6)), k = size / top;
    ctx.save(); ctx.translate(sx, sy); ctx.rotate(hd + Math.sin(t * 1.7) * 0.03);
    const fl = size * (0.45 + 0.2 * Math.sin(t * 31) + 0.11 * Math.sin(t * 17)), w = size * 0.16, fg = ctx.createLinearGradient(0, size * 0.5, 0, size * 0.5 + fl * 1.6); fg.addColorStop(0, 'rgba(255,250,220,0.95)'); fg.addColorStop(0.35, 'rgba(255,190,90,0.85)'); fg.addColorStop(1, 'rgba(255,110,60,0)');
    ctx.fillStyle = fg; ctx.beginPath(); ctx.moveTo(-w, size * 0.46); ctx.quadraticCurveTo(0, size * 0.55 + fl * 1.9, w, size * 0.46); ctx.closePath(); ctx.fill();
    try { ctx.translate(0, size * 0.5); ctx.scale(k, k); G.drawBlueprint(ctx, { x: 0, y: -S * 0.45, bp: bp }, false); } catch (e) { console.error(e); }
    ctx.restore();
  }
  /** smoke and fire under the ship, and the count in great numbers */
  function launchFx(ctx, v, t) {
    const d = plan(); if (!d || (G.pondAsleep && G.pondAsleep())) return; const st = d.steps[d.i]; if (st.do !== 'countdown' && st.do !== 'liftoff') return;
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
      ctx.font = '800 13px system-ui, sans-serif'; ctx.fillStyle = 'rgba(234,244,255,0.95)'; ctx.fillText('MISSION TO ' + d.voyage.name.toUpperCase(), cx, cy + (n ? 84 : 56)); }
    ctx.restore();
  }
  function draw() {
    const ctx = G.ctx, v = G.view; if (!ctx || G.mode !== 'play') return;
    const t = now(); launchFx(ctx, v, t);
    if (!flight) return;
    const f = flight, u0 = clamp((t - f.t0) / f.T, 0, 1), u = u0 * u0 * (3 - 2 * u0), x = f.x0 + (f.x1 - f.x0) * u, y = f.y0 + (f.y1 - f.y0) * u;
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
    if (!crewNow.length || flight || G.mode !== 'play') return; const ctx = G.ctx, v = G.view; if (!ctx || v.scale < 0.3 || (G.pondAsleep && G.pondAsleep())) return;
    const t = now(); ctx.save(); ctx.setTransform(v.dpr, 0, 0, v.dpr, 0, 0); ctx.lineJoin = 'round';
    for (let i = 0; i < crewNow.length; i++) { const c = crewNow[i]; if (c.dead || c.inShip) continue; const x = (c.rx === undefined ? c.x : c.rx) * v.scale + v.ox, y = ((c.ry === undefined ? c.y : c.ry) - c.ph.r * 2.2) * v.scale + v.oy - 12 + Math.sin(t * 3 + c.id) * 2.5, k = clamp(v.scale, 0.75, 1.5);
      if (x < -20 || y < -20 || x > v.w + 20 || y > v.h + 20) continue;
      ctx.save(); ctx.translate(x, y); ctx.scale(k, k); ctx.fillStyle = 'rgba(255,170,80,0.9)'; ctx.beginPath(); ctx.moveTo(-2.5, 6); ctx.lineTo(0, 11 + 2 * Math.sin(t * 20 + i)); ctx.lineTo(2.5, 6); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#f6d365'; ctx.strokeStyle = '#14202e'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(0, -9); ctx.quadraticCurveTo(4.6, -3, 3.4, 6); ctx.lineTo(-3.4, 6); ctx.quadraticCurveTo(-4.6, -3, 0, -9); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-3.4, 2); ctx.lineTo(-7, 7); ctx.lineTo(-3.4, 6); ctx.closePath(); ctx.moveTo(3.4, 2); ctx.lineTo(7, 7); ctx.lineTo(3.4, 6); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#14202e'; ctx.beginPath(); ctx.arc(0, -2, 1.5, 0, TAU); ctx.fill(); ctx.restore(); }
    ctx.restore();
  }
  G.addSystem({ name: 'voyage', draw: function () { marks(); draw(); } });

  // ── in the NOW panel: the ship, the mission with its crew, your outposts ──
  if (G.hub) {
    G.hub.add(function (W) {
      const out = { sig: stateOf(), now: [], people: [], news: [] }, d = plan(), V = F.visiting, ship = F.shipOf();
      if (V && F.here === 'home') { const r0 = F.book[V.key] || {}; out.sig += 'H' + (r0.mine | 0); out.now.push(G.hub.row({ icon: '▲', title: 'Your ship is at ' + V.name, tag: 'away', live: true, sub: (r0.mine | 0) + ' of yours are there. You are watching your own pond; that one stands still until you go back.', extra: '<span class="hbtn" data-act="voyThere">GO THERE</span><span class="hbtn q" data-act="voyHome">FLY HOME</span>' })); }
      else if (V) { const mine = F.lineN(); out.sig += 'V' + mine + V.adds; out.now.push(G.hub.row({ icon: '⚑', title: 'You are at ' + V.name, tag: 'visiting', live: true, sub: 'Its people are ' + esc(V.mood) + '. ' + mine + ' of yours live here · ' + V.adds + ' of ' + V.adds0 + ' ADD' + (V.adds0 === 1 ? '' : 's') + ' left.', extra: '<span class="hbtn" data-act="voyHome">FLY HOME</span><span class="hbtn q" data-act="voyWatchHome">WATCH HOME</span><span class="hbtn q" data-act="voyShip">THE SHIP</span>' })); }
      else if (d) { const M = members(d), inN = M.filter(function (c) { return c.inShip; }).length, st = d.steps[d.i]; out.sig += inN + ':' + Math.round(d.t);
        out.now.push(G.hub.row({ icon: '▲', title: 'The crew', tag: inN + ' of ' + M.length + ' aboard', live: true, sub: 'For the mission to ' + esc(d.voyage.name) + '. Each carries a gold rocket over its head.', extra: crewHtml(M) + (st.do === 'liftoff' ? '' : '<span class="hbtn q" data-act="voyOff">CALL IT OFF</span>') })); }
      else if (want) out.now.push(G.hub.row({ icon: '▲', title: 'Mission to ' + want.p.name, tag: 'waiting', live: true, sub: W.deed ? 'They will go as soon as they have finished ' + esc(W.deed.title) + '.' : 'The crew is making ready.', extra: '<span class="hbtn q" data-act="voyOff">CALL IT OFF</span>' }));
      else if (ship) { const C = F.crewFor(ship), h = F.holdOf(ship); out.sig += C.map(function (c) { return c.id; }).join('.'); out.news.push('ship' + ship.name);
        out.now.push(G.hub.row({ icon: '▲', title: ship.name, tag: 'ready to fly', sub: 'A spaceship of the ' + esc(ship.by) + '. It carries ' + h.crew + ' to another pond, and ' + h.adds + ' ADD' + (h.adds === 1 ? '' : 's') + '. Who would go:', extra: crewHtml(C) + '<span class="hbtn" data-act="voyPick">PLAN A VOYAGE</span><span class="hbtn q" data-act="voyShip">SHOW IT</span>' })); }
      const keys = Object.keys(F.book).filter(function (k) { return !F.there() || k !== V.key; });
      keys.forEach(function (k) { const r = F.book[k]; out.sig += k + r.mine + '|'; out.people.push(G.hub.row({ icon: '⚑', title: r.name, tag: r.mine ? 'your outpost: ' + r.mine : 'visited', sub: 'A far pond. You have been there ' + (r.visits === 1 ? 'once' : r.visits + ' times') + (r.mine ? '; ' + r.mine + ' of your people live there.' : '; none of yours live there now.') })); });
      return out;
    });
    G.hub.act('voyPick', function () { G.voyagePick(); });
    G.hub.act('voyOff', function () { G.voyageOff(); });
    G.hub.act('voyHome', function () { G.voyageHome(); });
    G.hub.act('voyThere', function () { G.voyageLook('far'); });
    G.hub.act('voyWatchHome', function () { G.voyageLook('home'); });
    G.hub.act('voyShip', function () { const s = F.shipOf(); if (s) { if (G.focusOn) G.focusOn(s.x, s.y, 1.3); if (G.selectThing) G.selectThing({ k: 'work', o: s }); } });
  }
  document.addEventListener('click', function (e) { let n = e.target, inBox = false; for (let q = n; q; q = q.parentNode) if (q.id === 'rarebox') inBox = true; if (inBox && !(function () { for (let q = n; q; q = q.parentNode) if (q.dataset && q.dataset.act && q.classList && q.classList.contains('hbtn')) return true; return false; })()) { for (let q = n; q; q = q.parentNode) if (q.dataset && q.dataset.c) { e.stopPropagation(); crewClick(e); return; } } }, true);

  // ── where you are, and what you may still do there ──
  setInterval(function () {
    try {
      els(); { const se = $('season'), pn = $('panel'), a = se && !se.classList.contains('hide') && se.offsetWidth ? se.getBoundingClientRect().right + 10 : 14, b = pn && !pn.classList.contains('hide') && pn.offsetWidth ? pn.getBoundingClientRect().left - 10 : window.innerWidth - 14, wide = window.innerWidth > 900 && b - a > 360; [pickEl, bar].forEach(function (e) { if (wide && e.style.top !== '58px') { e.style.left = Math.round((a + b) / 2) + 'px'; e.style.maxWidth = Math.round(b - a) + 'px'; } else { e.style.left = ''; e.style.maxWidth = ''; } }); }
      const V = F.visiting, T = F.there(), W = G.W, on = !!(V && W && G.mode === 'play' && !W.title && !flight), d = W && !W.title && G.mode === 'play' ? plan() : null;
      if (want && W && !W.deed && G.mode === 'play') start();
      const gh = $('gohome'); if (gh) { const sp = gh.querySelector('span'), t = T ? 'BACK TO ' + T.name.toUpperCase() : 'BACK TO MY POND'; if (sp && sp.textContent !== t) sp.textContent = t; }
      if (!on) { if (!bar.classList.contains('hide')) bar.classList.add('hide'); }
      else { const mine = F.lineN(), wish = $('wish'), top = wish && !wish.classList.contains('hide') && wish.offsetHeight && window.innerWidth > 720 ? Math.round(wish.getBoundingClientRect().bottom + 8) : 14;
        const r0 = F.book[V.key] || {}, t = T ? '<span><b>⚑ VISITING ' + esc(V.name.toUpperCase()) + '</b> · its people are ' + esc(V.mood) + '<br><i>' + mine + '</i> of yours live here · <i>' + V.adds + '</i> of ' + V.adds0 + ' ADD' + (V.adds0 === 1 ? '' : 's') + ' left</span><button class="btn sm" id="voyShip">THE SHIP</button><button class="btn sm" id="voyLookHome">WATCH HOME</button><button class="btn sm" id="voyHome">FLY HOME</button>'
          : '<span><b>▲ YOUR SHIP IS AT ' + esc(V.name.toUpperCase()) + '</b><br><i>' + (r0.mine | 0) + '</i> of yours are there · you are watching your own pond</span><button class="btn sm" id="voyLookFar">GO THERE</button><button class="btn sm" id="voyHome">FLY HOME</button>';
        if (bar._t !== t) { bar._t = t; bar.innerHTML = t; } bar.style.top = top + 'px'; bar.classList.remove('hide'); }
      // the mission bar, at the top of the pond: its stages, what they are doing now, and who is aboard
      if (d && !flight && !picking && !(G.pondAsleep && G.pondAsleep())) { const M = members(d), st = d.steps[d.i], inN = M.filter(function (c) { return c.inShip; }).length;
        const t = '<div class="mt">▲ MISSION TO ' + esc(d.voyage.name.toUpperCase()) + '</div><div class="stg">' + STAGES.map(function (q, i) { return '<span class="' + (i < d.i ? 'dn' : i === d.i ? 'on' : '') + '">' + q[1] + '</span>'; }).join('') + '</div>' +
          '<div class="mrow"><span>' + esc((STEPW[st.do] || '').replace(/^./, function (m) { return m.toUpperCase(); })) + ' · <b style="font-size:12px;letter-spacing:0">' + inN + ' of ' + M.length + ' aboard</b></span>' + crewHtml(M) + (st.do === 'liftoff' ? '' : '<button class="btn sm" id="voyCancel2">' + (st.do === 'countdown' ? 'ABORT' : 'CALL IT OFF') + '</button>') + '</div>';
        if (pickEl._t !== t) { pickEl._t = t; pickEl.innerHTML = t; }
        pickEl.classList.add('mission'); pickEl.style.top = '14px'; pickEl.classList.remove('hide'); }
      else if (!flight && !picking && !pickEl.classList.contains('hide')) { pickEl.classList.add('hide'); pickEl.classList.remove('mission'); pickEl._t = ''; }
      // BRING HOME on a creature's card, in a far pond
      const at = $('idoing'), c = G.R && G.R.sel;
      if (at && !aboardBtn) { aboardBtn = document.createElement('button'); aboardBtn.id = 'iaboard'; aboardBtn.className = 'btn sm'; at.parentNode.insertBefore(aboardBtn, at);
        aboardBtn.onclick = function () { const q = G.R && G.R.sel; if (!q || !F.there()) return; if (G.sfx) G.sfx('click'); const was = !!q.aboard; G.W.cre.forEach(function (o) { o.aboard = false; }); q.aboard = !was; aboardBtn._t = ''; }; }
      if (aboardBtn) { const show = !!(T && c && !c.dead && c.g && !flight && F.shipOf()); aboardBtn.style.display = show ? '' : 'none';
        if (show) { const t = c.aboard ? '⚑ COMING HOME WITH THE SHIP (undo)' : '⚑ BRING HOME with the ship'; if (aboardBtn._t !== t) { aboardBtn._t = t; aboardBtn.textContent = t; aboardBtn.style.borderColor = c.aboard ? 'var(--gold)' : ''; aboardBtn.title = 'One creature of this pond, yours or theirs, may come back with the ship when it flies home.'; } } }
      // who would go: marked in the pond
      if (++tick % 2 === 0) { const s2 = !V && !flight && G.mode === 'play' && W && !W.title ? F.shipOf() : null; crewNow = d ? members(d) : s2 ? F.crewFor(s2) : []; }
    } catch (e) { console.error(e); }
  }, 450);
  // the ship carries only so many ADDs
  setTimeout(function () { if (!G.act) return; const a0 = G.act; G.act = function (name) { const V = F.there(); if (name === 'add' && V && V.adds <= 0 && G.mode === 'play') { tip('<b style="color:var(--gold)">The ship carried ' + V.adds0 + ' ADD' + (V.adds0 === 1 ? '' : 's') + ', and ' + (V.adds0 === 1 ? 'it is' : 'they are') + ' used.</b><br>A bigger ship carries more. Fly home and come again.'); return; } return a0(name); }; }, 0);
  // news
  G.on('deed-end', function (d, how, made) { if (G.mode === 'play' && made && made.bp && made.bp.type === 'ship' && !F.visiting) setTimeout(function () { if (G.note) G.note('They have a spaceship', 'Open NOW (bottom left) or click the ' + made.name + ', and PLAN A VOYAGE to another pond.'); if (G.log) G.log('sp', 'A spaceship', 'The ' + made.by + ' built the ' + made.name + '. It can fly to another pond.'); }, 5000); });
  G.on('extinct', function () { const V = F.there(); if (!V || G.mode !== 'play') return; setTimeout(function () { if (F.visiting !== V) return; say('NOTHING LIVES AT ' + V.name.toUpperCase() + ' NOW', 'The pond has fallen still. The ship turns for home.', 8000); G.voyageHome(true); }, 1500); });
  G.on('new-pond', function (opts) { if (opts && opts.voyage) return; picking = null; flight = null; want = null; crewNow = []; if (pickEl) pickEl.classList.add('hide'); if (bar) bar.classList.add('hide'); });
})();
