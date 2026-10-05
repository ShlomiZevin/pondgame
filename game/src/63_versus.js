// ── The pond versus the things you throw at it: you can SEE life learn to beat them ──
// Everything shown here is measured from the simulation: how many creatures carry the answer, how far they have
// evolved tolerance, how much of the thing is left. Nothing is staged.
(function () {
  'use strict';
  const PAL = G.PAL, el = G.el, $ = G.$, esc = G.escapeHtml;
  let box = null, last = 0, sig = '';

  /** the numbers for one bad thing */
  G.versus = function (z) {
    const cre = G.W.cre, w = z.weak;
    let carry = 0;
    for (let i = 0; i < cre.length; i++) if (G.weakPower(cre[i], w) > 0.2) carry++;
    const living = z.alive > 0.25;
    return {
      carry: cre.length ? carry / cre.length : 0,
      adapt: G.adaptedTo(z),
      left: living ? G.clamp(z.health / 1.6, 0, 1) : G.clamp(z.life / (z.life0 || 120), 0, 1),
      weak: G.WEAK[w].text,
    };
  };

  function bar(label, v, col) {
    return '<div style="display:flex;align-items:center;gap:6px;margin:3px 0"><span style="flex:0 0 108px;font-size:10.5px;color:rgba(207,232,255,.8)">' + label + '</span><div class="meter" style="flex:1;margin:0;height:6px"><i style="width:' + Math.round(v * 100) + '%;background:' + col + '"></i></div><b style="flex:0 0 30px;text-align:right;font-size:10.5px">' + Math.round(v * 100) + '%</b></div>';
  }

  function render() {
    const W = G.W;
    const bad = W.zones.filter(G.isBad).sort(function (a, b) { return a.born - b.born; });
    // one row per kind of thing (a spreading thing counts once, with all its patches)
    const kinds = {}; const order = [];
    bad.forEach(function (z) { const k = z.word.toLowerCase(); if (!kinds[k]) { kinds[k] = { z: z, n: 0, left: 0, ate: 0 }; order.push(k); } const v = G.versus(z); kinds[k].n++; kinds[k].left = Math.max(kinds[k].left, v.left); kinds[k].ate += (z.ate || 0) + (z.deaths || 0); });
    const s = order.join('|');
    if (!order.length) { if (!box.classList.contains('hide')) box.classList.add('hide'); sig = ''; return; }
    box.classList.remove('hide');
    let html = '<div class="ilabel" style="margin:0 0 4px;color:var(--gold)">THE POND VERSUS</div>';
    order.slice(0, 2).forEach(function (k) {
      const q = kinds[k], z = q.z, v = G.versus(z);
      const lock = z.p.vault > 0.2 ? 'It locks the food away. ' : z.p.deadly > 0.3 ? 'It kills with one touch. ' : '';
      const mood = lock + (v.carry > 0.5 ? 'They have the answer: <b>' + v.weak + '</b>.' : v.carry > 0.15 ? 'They are learning: <b>' + v.weak + '</b> hurt it.' : 'It is weak to <b>' + v.weak + '</b>. Few have them yet.');
      html += '<div data-z="' + z.id + '" style="cursor:pointer;padding:6px 0 4px;border-top:1px solid rgba(207,232,255,.12)"><div style="display:flex;justify-content:space-between;align-items:baseline"><b style="font-size:12.5px">' + esc(z.word) + (q.n > 1 ? ' <small>×' + q.n + '</small>' : '') + '</b><small>' + (q.ate ? 'it has killed ' + q.ate : 'since gen ' + z.born) + '</small></div>' +
        '<div style="font-size:11px;margin:2px 0 3px;color:rgba(207,232,255,.85)">' + mood + '</div>' +
        bar('carry ' + v.weak, v.carry, PAL.algae) + (z.p.vault > 0.2 ? '' : bar('learned to bear it', v.adapt, PAL.gold)) + bar('its strength', q.left, PAL.rose) + '</div>';
    });
    box.innerHTML = html;
    const rows = box.querySelectorAll('[data-z]');
    for (let i = 0; i < rows.length; i++) rows[i].onclick = function () { const id = +this.dataset.z; const z = G.W.zones.filter(function (q) { return q.id === id; })[0]; if (z) { G.select(null); G.selectZone(z); } };
    sig = s;
  }

  // milestones: the moments worth shouting about
  G.versusMilestones = function () {
    const W = G.W;
    for (let i = 0; i < W.zones.length; i++) {
      const z = W.zones[i];
      if (!G.isBad(z) || z.age < 30) continue;
      const v = G.versus(z), k = z.word.toLowerCase();
      if (v.carry > 0.25) G.discover('vs25' + k, 'They are learning! A quarter of the pond now carries ' + v.weak + ', the weakness of ' + z.word + '.');
      if (v.carry > 0.55) G.discover('vs55' + k, 'Most of the pond now carries ' + v.weak + '. ' + z.word + ' is in trouble.');
    }
  };

  G.addSystem({
    name: 'versus',
    init: function () {
      box = el('div', 'glass hide', '', $('ui')); box.id = 'versus';
      G.on('zone-killed', function (z) {
        if (G.mode !== 'play') return;
        G.R.shake = 0.5; G.R.flash = 0.8; G.R.flashCol = PAL.gold;
        G.R.ring(z.x, z.y, PAL.gold, z.r0 * 2.2, 1.6); G.R.ring(z.x, z.y, PAL.algae, z.r0 * 1.5, 1.2); G.R.sparkle(z.x, z.y, PAL.gold, 40, 160);
        G.sfx('discovery');
      });
      G.on('zone', function (z) { if (G.mode === 'play' && G.isBad(z) && !z.genNote && z.genN === 1) G.hint('vs' + z.id, z.word + ' is dangerous. Watch THE POND VERSUS (left): life will look for its weakness.', 9000); });
    },
    update: function () {
      if (G.mode !== 'play' || !G.W) return;
      const now = performance.now();
      if (now - last < 600) return;
      last = now;
      render();
    },
  });
})();
