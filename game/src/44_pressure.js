// ── What the pond is up against right now, measured: so what grows next is relevant to what is happening ──
// Mutation stays random and selection stays real; the pressures only tilt WHICH new parts and organs appear,
// the way a cold pond makes a frost coat a likelier thing to stumble on than a heat skin.
(function () {
  'use strict';
  const clamp = G.clamp;
  // what can hurt a bad thing: a trait creatures can evolve. index → [name, the built-in part that gives it, words]
  const WEAK = [
    { id: 'spike', part: 2, text: 'spikes' }, { id: 'toxin', part: 6, text: 'poison glands' }, { id: 'bite', part: 0, text: 'jaws and beaks' },
    { id: 'glow', part: 5, text: 'glowing lamps' }, { id: 'armor', part: 3, text: 'armour' },
  ];
  G.WEAK = WEAK;
  G.weakIndex = function (id) { for (let i = 0; i < WEAK.length; i++) if (WEAK[i].id === id) return i; return -1; };
  /** is this thing bad for creatures? */
  G.isBad = function (z) { return z.p.poison + z.p.acid + z.p.eats + (z.p.deadly || 0) > 0.25 || z.p.vault > 0.2; };
  /** the wall that is locking food away, if there is one */
  G.vaultOf = function (W) { for (let i = 0; i < W.zones.length; i++) if (W.zones[i].p.vault > 0.2) return W.zones[i]; return null; };
  /** how strongly a creature carries the trait a thing is weak to (0..2) */
  G.weakPower = function (c, w) {
    const ph = c.ph;
    if (w === 0) return Math.min(2, ph.spike);
    if (w === 1) return Math.min(2, ph.gland);
    if (w === 2) return Math.min(2, ph.bite || 0);
    if (w === 3) return Math.min(2, (c.glow || 0) * 1.6);
    return Math.min(2, ph.defense * 2.2);
  };

  /** Measured once a generation. part[k] and fx[name] are extra weights; c[i] tilts a chemistry gene; list is for people (and the AI). */
  G.measurePressures = function () {
    const W = G.W;
    const P = { part: new Array(9).fill(0), fx: {}, c: new Array(15).fill(0), list: [] };
    const fx = function (k, v) { P.fx[k] = (P.fx[k] || 0) + v; };
    const temp = W.set.temp + (W.mods.length ? G.modSum('temp') : 0);
    if (temp < -0.25) { fx('cold', 3); P.c[7] += 1; P.list.push('the water is cold'); }
    if (temp > 0.25) { fx('heat', 3); P.c[6] += 1; P.list.push('the water is hot'); }
    const light = W.set.light * (W.mods.length ? Math.max(0.1, 1 + G.modSum('light')) : 1);
    if (light < 0.7) { fx('glow', 2); fx('sense', 2); P.part[5] += 1.5; P.part[4] += 1; P.list.push('it is dark'); }
    // short of breath: more than a fifth of the pond's breaths last season came up short
    if (W.lastStats && W.cre.length && (W.lastStats.gasp || 0) > W.lastStats.breaths * 0.2) { P.o2 = 2; P.list.push('the water is thin on oxygen (fins and frills breathe better; small bodies need less)'); }
    if (light > 1.2) { fx('photo', 2.5); P.list.push('there is plenty of light'); }
    if (W.mods.length && G.modSum('poison') > 0.1) { fx('poison', 4); P.c[8] += 2; P.list.push('the whole pond is poisoned'); }
    if (W.lastStats && W.lastStats.killed > 5) { fx('armor', 2); fx('spike', 1.5); fx('toxin', 1.5); fx('speed', 1); P.part[3] += 1.5; P.part[2] += 1; P.part[6] += 1; P.list.push('hunters are about'); }
    if (W.lastStats && W.lastStats.fights > 12) { fx('armor', 2); fx('speed', 1.5); fx('spike', 1); P.part[3] += 1.5; P.part[1] += 1; P.list.push('a violent kind is attacking the others'); }
    for (let i = 0; i < W.zones.length; i++) {
      const z = W.zones[i], p = z.p;
      if (G.isBad(z)) {
        const w = WEAK[z.weak];
        P.part[w.part] += 2.5; fx(w.id === 'bite' ? 'eat' : w.id, 2.5);
        P.c[9 + z.sig] += 1;
        P.list.push(z.word + ' is hurting them (it is weak to ' + w.text + ')');
        if (p.poison > 0.2) { fx('poison', 2); P.c[8] += 1; }
        if (p.eats > 0.2 || p.deadly > 0.2) { fx('speed', 1.5); fx('sense', 1); P.part[1] += 1; P.part[7] += 1; P.part[4] += 0.5; }
      }
      if (p.sticky > 0.3) { P.part[8] += 1.5; P.list.push(z.word + ' is sticky'); }
      if (Math.abs(p.heat) > 0.3) { fx(p.heat > 0 ? 'heat' : 'cold', 2); P.c[p.heat > 0 ? 6 : 7] += 1; }
      if (p.nut > 0.3) { P.c[z.tag] += 1.5; P.list.push(z.word + ' is food few can eat yet'); }
    }
    // food lying around that nobody eats is an invitation
    const left = [0, 0, 0, 0, 0, 0];
    for (let i = 0; i < W.food.length; i++) if (!W.food[i].dead) left[W.food[i].tag]++;
    const eaters = [0, 0, 0, 0, 0, 0];
    for (let i = 0; i < W.cre.length; i++) for (let t = 0; t < 6; t++) if (W.cre[i].ph.dig[t] >= 0.2) eaters[t]++;
    const names = ['gold', 'lime', 'green', 'blue', 'violet', 'pink'];
    for (let t = 0; t < 6; t++) {
      if (left[t] > 25 && eaters[t] < W.cre.length * 0.3) { P.c[t] += 1.5; P.digest = t; if (P.list.length < 6) P.list.push('there is ' + names[t] + ' food that few can eat'); }
    }
    if (W.lastStats && W.lastStats.protShort > W.cre.length * 0.3) { P.c[0] += 1.5; P.part[0] += 1; P.list.push('protein is short: elaborate bodies cannot build children on algae alone (scraps and meat are rich)'); }
    if (W.cre.length && W.food.length < 40) { fx('eat', 1.5); fx('sense', 1.5); P.part[4] += 1; P.list.push('food is scarce'); }
    W.press = P;
    return P;
  };
})();
