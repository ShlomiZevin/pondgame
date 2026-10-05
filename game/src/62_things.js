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
    if (z.svg) return '<img alt="" width="64" height="64" style="flex:none;border-radius:14px;background:rgba(7,18,31,.55);padding:4px" src="data:image/svg+xml;charset=utf-8,' + encodeURIComponent(z.svg) + '">';
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
    if (z.p.nut > 0.3) { const u = G.usedBy(z); facts.push('How well the pond uses it: <b>' + Math.round(u.eaten * 100) + '%</b> of its food gets eaten, and <b>' + Math.round(u.can * 100) + '%</b> of creatures can eat it.'); }
    if (G.isBad(z)) {
      const w = G.WEAK[z.weak]; let n = 0; const cre = G.W.cre;
      for (let i = 0; i < cre.length; i++) if (G.weakPower(cre[i], z.weak) > 0.2) n++;
      facts.push('<span style="color:var(--gold)">Its weakness: ' + w.text + '.</span> <b>' + (cre.length ? Math.round(100 * n / cre.length) : 0) + '%</b> of creatures carry them' + (z.hit > 0.02 ? ', and they have worn it down by <b>' + Math.round(Math.min(1, z.hit / 1.2) * 100) + '%</b>.' : '.'));
    }
    if (z.p.poison + z.p.acid + z.p.eats + (z.p.deadly || 0) > 0.25) { const a = G.adaptedTo(z); facts.push('The pond has adapted to it: <b>' + Math.round(a * 100) + '%</b>' + (a > 0.45 ? ' (they have learned to live with it).' : a > 0.2 ? ' (they are learning).' : ' (so far it still hurts).')); }
    if (!facts.length) facts.push('Nothing has happened to it yet.');
    const ev = (z.ev || []).map(function (e) { return '<div><small>g' + e.g + '</small> ' + esc(e.t) + '</div>'; }).join('');
    const lifeTxt = living ? 'Health' : 'Time left';
    card.innerHTML = '<div class="ihead">' + picture(z) + '<div><b>' + esc(z.word) + (living && z.genN > 1 ? ' <small>· generation ' + z.genN + '</small>' : '') + '</b><small>' + esc(z.note || '') + '</small>' + (by ? '<small style="color:var(--gold)">imagined by ' + esc(by) + '</small>' : '') + '</div><button class="x" id="zclose" aria-label="Close">' + G.ICON.close + '</button></div>' +
      '<div class="ilabel">What it does</div>' + (bars || '<small>Very little.</small>') +
      '<div class="ilabel">' + lifeTxt + '</div><div class="meter"><i id="zlife"></i></div>' +
      '<div class="ilabel">Its story</div><div class="log" style="height:auto;max-height:96px" id="zev">' + ev + '</div>' +
      '<div id="zfacts" style="font-size:11.5px;line-height:1.45;margin-top:6px">' + facts.join(' ') + '</div>';
    $('zclose').onclick = function () { G.selectZone(null); };
  }

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
    if (G.isBad(z)) {
      const does = p.deadly > 0.05 ? 'kills at a touch' : p.eats > 0.05 ? 'eats creatures' : p.poison > 0.05 ? 'poisons' : 'burns', taken = (z.deaths || 0) + (p.eats > 0.05 ? (z.ate || 0) : 0);
      return { t: does + (taken ? ' · ' + taken + ' taken' : '') + (z.hurtN ? ' · hurting ' + z.hurtN : '') + (z.atk ? ' · ' + z.atk + ' fighting back' : ' · weak to ' + w), tone: z.atk ? 'fight' : 'bad', bar: z.alive > 0.25 ? G.clamp(z.health, 0, 1) : G.clamp(z.life / (z.life0 || 120), 0, 1) };
    }
    if (p.nut > 0.2) { const u = G.usedBy ? G.usedBy(z) : null; return { t: 'feeds the pond' + (u ? ' · ' + pct(u.can) + ' can eat it' : '') + (z.near ? ' · ' + z.near + ' here' : ''), tone: 'good', bar: null }; }
    const what = Math.abs(p.heat) > 0.3 ? (p.heat > 0 ? 'warms the water' : 'chills the water') : Math.abs(p.light) > 0.3 ? (p.light > 0 ? 'lights the water' : 'darkens the water') : p.sticky > 0.3 ? 'slows what touches it' : p.pull ? (p.pull > 0 ? 'draws creatures in' : 'drives creatures away') : p.hard > 0.3 ? 'blocks the way' : 'drifts';
    return { t: what + (z.near ? ' · ' + z.near + ' here' : ''), tone: 'calm', bar: null };
  };
})();
