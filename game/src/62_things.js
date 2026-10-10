// ── The things you add: click one to read what it is, what it does, and its history ──
(function () {
  'use strict';
  const PAL = G.PAL, el = G.el, $ = G.$, esc = G.escapeHtml;
  const PROP = [
    ['nut', 'Food', PAL.algae], ['poison', 'Poison', PAL.violet], ['heat', 'Heat', PAL.rose], ['light', 'Light', PAL.gold],
    ['sticky', 'Sticky', PAL.algae], ['acid', 'Acid', PAL.algae], ['hard', 'Solid', PAL.frost], ['spread', 'Spreads', PAL.frost],
    ['deadly', 'Kills on touch', PAL.rose], ['vault', 'Locks food in', PAL.frost], ['eats', 'Eats', PAL.rose], ['moves', 'Moves', PAL.gold], ['pull', 'Pulls in', PAL.violet],
  ];
  let card = null, last = 0, shownId = 0;

  G.zoneAt = function (x, y) {
    const W = G.W; if (!W) return null;
    let best = null, bd = 1e9;
    for (let i = 0; i < W.zones.length; i++) {
      const z = W.zones[i], d = Math.hypot(z.x - x, z.y - y);
      if (d < Math.max(44, z.r * 0.8) && d < bd) { bd = d; best = z; }
    }
    return best;
  };
  G.selectZone = function (z) {
    if (z && G.cam.z > 1.01) G.focusOn(z.x, z.y);
    if (z && G.thingSound) G.thingSound(z.word);
    G.R.selZone = z || null;
    shownId = 0;
    if (card) card.classList.toggle('hide', !z || G.mode !== 'play');
  };
  G.zoneEvent = function (z, text) {
    if (!z.ev) z.ev = [];
    z.ev.push({ g: G.W.gen, t: text });
    if (z.ev.length > 8) z.ev.splice(1, 1);      // keep the first (when it was dropped) and the latest
  };

  function picture(z) {
    const pic = z._figSvg || z.svg;
    if (pic) return '<img alt="" width="64" height="64" style="flex:none;border-radius:14px;background:rgba(7,18,31,.55);padding:4px" src="data:image/svg+xml;charset=utf-8,' + encodeURIComponent(pic) + '">';
    return '<div style="flex:none;width:64px;height:64px;border-radius:50%;background:radial-gradient(circle at 40% 35%, ' + G.hsl(z.hue, 90, 80, 1) + ', ' + G.hsl(z.hue, 85, 50, 0.5) + ' 60%, transparent 72%)"></div>';
  }

  function render(z) {
    const p = z.p;
    const living = z.alive > 0.25;
    let bars = '';
    PROP.forEach(function (q) {
      const v = p[q[0]] || 0;
      if (Math.abs(v) < 0.06) return;
      const name = q[0] === 'heat' && v < 0 ? 'Cold' : q[0] === 'light' && v < 0 ? 'Darkness' : q[0] === 'pull' && v < 0 ? 'Pushes away' : q[1];
      const col = q[0] === 'heat' && v < 0 ? PAL.frost : q[0] === 'light' && v < 0 ? PAL.violet : q[2];
      bars += '<div style="display:flex;align-items:center;gap:8px;margin:3px 0"><span style="flex:0 0 66px;font-size:11px">' + name + '</span><div class="meter" style="flex:1;margin:0"><i style="width:' + Math.round(Math.abs(v) * 100) + '%;background:' + col + '"></i></div></div>';
    });
    const by = G.ai.labelOf(z.model);
    const facts = [];
    if (z.made) facts.push('It has grown <b>' + z.made + '</b> pieces of food; <b>' + (z.fed || 0) + '</b> were eaten.');
    if (z.hurt > 1) facts.push('It has drained <b>' + Math.round(z.hurt) + '</b> energy from creatures' + (z.deaths ? ', and <b>' + z.deaths + '</b> died in it' : '') + '.');
    else if (z.deaths) facts.push('<b>' + z.deaths + '</b> creatures died in it.');
    if (z.ate) facts.push('It has eaten <b>' + z.ate + '</b> creatures.');
    if (z.vis > 5) facts.push('Creatures have spent <b>' + Math.round(z.vis) + '</b> seconds inside it.');
    if (living) facts.push('It is alive: it grows in the light, shrinks when grazed, and spreads' + (z.kids ? ' (it has budded <b>' + z.kids + '</b> new patches)' : '') + '.');
    if (z.p.nut > 0.3) { const u = G.usedBy(z); facts.push('How well the star uses it: <b>' + Math.round(u.eaten * 100) + '%</b> of its food gets eaten, and <b>' + Math.round(u.can * 100) + '%</b> of creatures can eat it.'); }
    if (G.isBad(z)) {
      const w = G.WEAK[z.weak]; let n = 0; const cre = G.W.cre;
      for (let i = 0; i < cre.length; i++) if (G.weakPower(cre[i], z.weak) > 0.2) n++;
      facts.push('<span style="color:var(--gold)">Its weakness: ' + w.text + '.</span> <b>' + (cre.length ? Math.round(100 * n / cre.length) : 0) + '%</b> of creatures carry them' + (z.hit > 0.02 ? ', and they have worn it down by <b>' + Math.round(Math.min(1, z.hit / 1.2) * 100) + '%</b>.' : '.'));
    }
    if (z.p.poison + z.p.acid + z.p.eats + (z.p.deadly || 0) > 0.25) { const a = G.adaptedTo(z); facts.push('The star has adapted to it: <b>' + Math.round(a * 100) + '%</b>' + (a > 0.45 ? ' (they have learned to live with it).' : a > 0.2 ? ' (they are learning).' : ' (so far it still hurts).')); }
    if (z.haven) { const n = Math.min(G.HAVEN_ROOM || 3, Math.max(z.hvPrev || 0, z.hvNow || 0)); facts.length = 0; facts.push('<b>' + n + ' of ' + (G.HAVEN_ROOM || 3) + '</b> places are taken. Only marvels can enter, and only through the gate at the bottom.', 'Inside, a marvel is fed, kept from harm and does not die of old age. A child born here is a marvel one time in four.', 'It stands for about <b>' + Math.round(z.life) + '</b> more seconds of star time; then you can add another.'); }
    if (z.act && G.actWords) { const aw = G.actWords(z); for (let i = aw.length - 1; i >= 0; i--) facts.unshift(aw[i]); if (z.deaths) facts.push('It has struck down <b>' + z.deaths + '</b> creatures.'); }
    if (!facts.length) facts.push('Nothing has happened to it yet.');
    const ev = (z.ev || []).map(function (e) { return '<div><small>g' + e.g + '</small> ' + esc(e.t) + '</div>'; }).join('');
    const lifeTxt = living ? 'Health' : 'Time left';
    card.innerHTML = '<div class="ihead">' + picture(z) + '<div><b>' + esc(z.word) + (living && z.genN > 1 ? ' <small>· generation ' + z.genN + '</small>' : '') + '</b><small>' + esc(z.note || '') + '</small>' + (by ? '<small style="color:var(--gold)">imagined by ' + esc(by) + '</small>' : '') + '</div><button class="x" id="zclose" aria-label="Close">' + G.ICON.close + '</button></div>' +
      '<div class="ilabel">What it does</div>' + (bars || (z.haven ? '<small>Shelters the marvels of the star.</small>' : z.act ? '' : '<small>Very little.</small>')) +
      '<div class="ilabel">' + lifeTxt + '</div><div class="meter"><i id="zlife"></i></div>' +
      '<div class="ilabel">Its story</div><div class="log" style="height:auto;max-height:96px" id="zev">' + ev + '</div>' +
      '<div id="zfacts" style="font-size:11.5px;line-height:1.45;margin-top:6px">' + facts.join(' ') + '</div>';
    $('zclose').onclick = function () { G.selectZone(null); };
    if (!z.haven || true) { const row = el('div', '', '<button class="btn sm" id="zmove">' + (moving === z ? 'CLICK WHERE…' : 'MOVE IT') + '</button><button class="btn sm" id="zgone">REMOVE IT</button>', card); row.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:8px';
      $('zmove').onclick = function () { G.sfx('click'); moving = moving === z ? null : z; shownId = 0; };
      $('zgone').onclick = function () { G.sfx('click'); z.alive = 0; z.health = 0; z.life = 0; if (z.p.vault > 0.2) z.life = -1; G.selectZone(null); }; }
  }
  // the next click on the pond puts the thing that is being moved there
  let moving = null;
  G.on('pond-click', function (c) { const z = moving; if (!z || !c || !G.W || G.W.zones.indexOf(z) < 0) { moving = null; return; } moving = null; z.x = G.clamp(c.x, 50, G.W.ww - 50); z.y = G.clamp(c.y, 50, G.W.wh - 50); z.hx = z.x; z.hy = z.y; if (G.zoneEvent) G.zoneEvent(z, 'You moved it'); G.select(null); if (G.selectThing) G.selectThing(null); G.selectZone(z); });

  G.addSystem({
    name: 'things',
    init: function () {
      card = el('div', 'glass hide', '', $('ui')); card.id = 'zcard';
      G.on('zone-gone', function (z) { if (G.R.selZone === z) G.selectZone(null); });
      G.on('new-pond', function () { G.selectZone(null); });
      G.on('select', function (c) { if (c) G.selectZone(null); });
    },
    update: function () {
      const z = G.R.selZone;
      if (!z || G.mode !== 'play') return;
      const now = performance.now();
      if (shownId === z.id && now - last < 500) return;
      last = now;
      const sig = z.id;
      if (shownId !== sig) { shownId = sig; }
      render(z);
      const bar = $('zlife');
      const living = z.alive > 0.25;
      const f = living ? G.clamp((z.health || 0) / 1.6, 0, 1) : G.clamp(z.life / (z.life0 || 120), 0, 1);
      bar.style.width = Math.round(f * 100) + '%';
      bar.style.background = f > 0.5 ? PAL.algae : f > 0.2 ? PAL.gold : PAL.rose;
    },
  });

  // ── what a thing is doing right now, in one line: shown under it in the pond ──
  G.thingStatus = function (z) {
    const p = z.p, w = G.WEAK[z.weak].text, pct = function (v) { return Math.round(100 * G.clamp(v, 0, 1)) + '%'; };
    if (p.vault > 0.2) { const broken = 1 - z.life / (z.life0 || 420); return { t: 'locks food inside · ' + pct(broken) + ' broken' + (z.atk ? ' · ' + z.atk + ' breaking in' : ' · only ' + w + ' get through'), tone: 'bad', bar: 1 - broken }; }
    if (z.act) {      // a thing that acts: what it is doing, and how it is faring
      const V = { strike: 'strikes', shoot: 'shoots', blast: 'blasts', heal: 'heals', shield: 'shields', spawn: 'breeds' }, does = z.act.acts.map(function (q) { return V[q.do]; }).filter(function (x, i, L) { return L.indexOf(x) === i; }).join(' and ');
      const side = z.act.side === 'friend' ? 'on their side' : z.act.side === 'wild' ? 'against all' : '';
      return { t: (z.act.way === 'hunts' ? 'hunts · ' : z.act.way === 'guards' ? 'guards · ' : '') + does + (side ? ' · ' + side : '') + (z.deaths ? ' · ' + z.deaths + ' struck down' : '') + (z.foe ? (z.atk ? ' · ' + z.atk + ' fighting back' : ' · weak to ' + w) : ''), tone: z.act.side === 'friend' ? 'good' : z.atk ? 'fight' : 'bad', bar: z.alive > 0.25 ? G.clamp(z.health, 0, 1) : G.clamp(z.life / (z.life0 || 120), 0, 1) };
    }
    if (G.isBad(z)) {
      const does = p.deadly > 0.05 ? 'kills at a touch' : p.eats > 0.05 ? 'eats creatures' : p.poison > 0.05 ? 'poisons' : 'burns', taken = (z.deaths || 0) + (p.eats > 0.05 ? (z.ate || 0) : 0);
      return { t: does + (taken ? ' · ' + taken + ' taken' : '') + (z.hurtN ? ' · hurting ' + z.hurtN : '') + (z.atk ? ' · ' + z.atk + ' fighting back' : ' · weak to ' + w), tone: z.atk ? 'fight' : 'bad', bar: z.alive > 0.25 ? G.clamp(z.health, 0, 1) : G.clamp(z.life / (z.life0 || 120), 0, 1) };
    }
    if (z.haven) { const n = Math.min(G.HAVEN_ROOM || 3, Math.max(z.hvPrev || 0, z.hvNow || 0)); return { t: 'shelters marvels · ' + n + ' of ' + (G.HAVEN_ROOM || 3) + ' places taken', tone: 'good', bar: null }; }
    if (p.nut > 0.2) { const u = G.usedBy ? G.usedBy(z) : null; return { t: 'feeds the star' + (u ? ' · ' + pct(u.can) + ' can eat it' : '') + (z.near ? ' · ' + z.near + ' here' : ''), tone: 'good', bar: null }; }
    const what = Math.abs(p.heat) > 0.3 ? (p.heat > 0 ? 'warms the water' : 'chills the water') : Math.abs(p.light) > 0.3 ? (p.light > 0 ? 'lights the water' : 'darkens the water') : p.sticky > 0.3 ? 'slows what touches it' : p.pull ? (p.pull > 0 ? 'draws creatures in' : 'drives creatures away') : p.hard > 0.3 ? 'blocks the way' : 'drifts';
    return { t: what + (z.near ? ' · ' + z.near + ' here' : ''), tone: 'calm', bar: null };
  };
})();
