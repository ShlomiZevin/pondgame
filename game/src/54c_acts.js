// ── Things that act ──
// What the player adds to the pond is not only a patch of something that poisons or feeds: a knight should swing his sword, a cannon should fire, a
// dragon should hunt, a healer should mend. Nothing of the kind is written here by name. There is one small set of ABILITIES the pond knows how to play
// out, and whatever is typed is given (by the AI that imagines it) a WAY of carrying itself, a SIDE, and up to three abilities with their strength,
// pace and reach:
//     way    hunts (goes after its targets) · guards (keeps to its place and goes for whatever comes near) · wanders · stays
//     side   foe (against the pond's creatures) · friend (against whatever harms them: fierce creatures, and things that are foes) · wild (against all)
//     do     strike (hits what is next to it) · shoot (sends something flying at a target) · blast (hits everything round it)
//            heal (mends those near it) · shield (those near it take less harm) · spawn (makes smaller ones of itself)
// The same abilities will serve what the creatures build, and ships. The pond answers an acting thing as it answers any danger: its creatures flee it,
// learn from being hit, evolve what wears it down (its weakness) and gang up on it; and acting things go for each other.
// It works beside the simulation: after every step it moves and plays out the acting things. (Offline, with no AI to imagine a thing, a few plain
// words are read for what they obviously do: only a fallback.)
(function () {
  'use strict';
  const clamp = G.clamp, TAU = 6.2832;
  const WAYS = ['hunts', 'guards', 'wanders', 'stays'], SIDES = ['foe', 'friend', 'wild'], DOS = ['strike', 'shoot', 'blast', 'heal', 'shield', 'spawn'];
  const SHOTS = ['bolt', 'arrow', 'bullet', 'fire', 'ice', 'spark', 'rock', 'web', 'beam', 'bubble'];
  G.ACT_DOS = DOS;
  const num = function (v, a, b, d) { v = +v; return isFinite(v) ? clamp(v, a, b) : d; };

  /** what a thing does, checked and clamped, from whatever described it ({ way, side, acts: [...] }), or null when it does nothing of its own */
  G.cleanActs = function (t) {
    const src = t && (t.act && typeof t.act === 'object' ? t.act : t); if (!src || !Array.isArray(src.acts)) return null;
    const acts = [];
    for (let i = 0; i < src.acts.length && acts.length < 3; i++) {
      const q = src.acts[i] || {}; if (DOS.indexOf(q.do) < 0) continue;
      acts.push({ do: q.do, power: num(q.power, 0.05, 1, 0.5), every: num(q.every, 0.4, 12, q.do === 'spawn' ? 9 : 2), reach: num(q.reach, 0.05, 1, 0.4), with: String(q.with || '').replace(/[<>"]/g, '').slice(0, 24), shot: SHOTS.indexOf(q.shot) >= 0 ? q.shot : 'bolt', hue: num(q.hue, 0, 360, 40) });
    }
    if (!acts.length) return null;
    return { way: WAYS.indexOf(src.way) >= 0 ? src.way : 'guards', side: SIDES.indexOf(src.side) >= 0 ? src.side : 'foe', acts: acts, prey: typeof src.prey === 'string' && src.prey ? src.prey.replace(/[<>"]/g, '').slice(0, 28) : '' };
  };
  /** with no AI to ask, the plainest words are read for what they do (a fallback only) */
  const WORDS = [
    [/\b(knight|warrior|samurai|soldier|guard|gladiator|viking|paladin|swordsman|ninja)\b/, { way: 'guards', side: 'foe', acts: [{ do: 'strike', power: 0.75, every: 1.3, reach: 0.3, with: 'a sword' }] }],
    [/\b(gun|cannon|turret|archer|sniper|tank|laser|robot|bow|crossbow|catapult|soldier with a gun|gunner|shooter)\b/, { way: 'guards', side: 'foe', acts: [{ do: 'shoot', power: 0.6, every: 1.1, reach: 0.8, with: 'shots', shot: 'bullet' }] }],
    [/\b(dragon)\b/, { way: 'hunts', side: 'wild', acts: [{ do: 'shoot', power: 0.7, every: 2.2, reach: 0.6, with: 'fire', shot: 'fire', hue: 20 }, { do: 'strike', power: 0.6, every: 1.6, reach: 0.3, with: 'its claws' }] }],
    [/\b(wolf|shark|tiger|lion|bear|monster|beast|hunter|predator|zombie|spider|crocodile|snake|eagle|hawk)\b/, { way: 'hunts', side: 'foe', acts: [{ do: 'strike', power: 0.65, every: 1.4, reach: 0.3, with: 'its teeth' }] }],
    [/\b(bomb|dynamite|mine|grenade|volcano|geyser|earthquake)\b/, { way: 'stays', side: 'wild', acts: [{ do: 'blast', power: 0.8, every: 5, reach: 0.7, with: 'a blast', hue: 25 }] }],
    [/\b(healer|doctor|nurse|angel|fairy|medic|shaman|unicorn|hospital)\b/, { way: 'wanders', side: 'friend', acts: [{ do: 'heal', power: 0.7, every: 1.6, reach: 0.6, with: 'its light', hue: 130 }] }],
    [/\b(guardian|protector|bodyguard|sheriff|police|hero|shepherd)\b/, { way: 'guards', side: 'friend', acts: [{ do: 'strike', power: 0.7, every: 1.3, reach: 0.35, with: 'its staff' }, { do: 'shield', power: 0.6, every: 1.5, reach: 0.6, with: 'its watch', hue: 200 }] }],
    [/\b(wizard|witch|mage|sorcerer|sorceress)\b/, { way: 'wanders', side: 'wild', acts: [{ do: 'shoot', power: 0.6, every: 1.8, reach: 0.7, with: 'spells', shot: 'spark', hue: 280 }] }],
    [/\b(queen|hive|nest|egg|mother|factory|swarm)\b/, { way: 'stays', side: 'foe', acts: [{ do: 'spawn', power: 0.5, every: 10, reach: 0.4, with: 'its young' }, { do: 'strike', power: 0.4, every: 1.6, reach: 0.25, with: 'its sting' }] }],
  ];
  G.actsFromWord = function (word) { const low = String(word || '').toLowerCase(); for (let i = 0; i < WORDS.length; i++) if (WORDS[i][0].test(low)) return G.cleanActs(JSON.parse(JSON.stringify(WORDS[i][1]))); return null; };
  /** what already stands in the pond, for whoever imagines the next thing: so that "a knight killer" can be made to go for the knight that is there */
  G.thingsBrief = function () { const W = G.W; if (!W) return undefined; const L = W.zones.filter(function (z) { return !z.haven; }).slice(-6).map(function (z) { return { name: z.word, does: z.act ? z.act.way + ', ' + (z.act.side === 'foe' ? 'against the creatures' : z.act.side === 'friend' ? 'defends the creatures' : 'against all') + ': ' + z.act.acts.map(function (q) { return q.do + (q.with ? ' with ' + q.with : ''); }).join(', ') : String(z.note || '').slice(0, 70) }; }); return L.length ? { things: L } : undefined; };
  const VERB = { strike: 'strikes', shoot: 'shoots', blast: 'blasts everything round it', heal: 'heals those near it', shield: 'shields those near it', spawn: 'makes more of itself' };
  /** what it does, in plain words, for its card */
  G.actWords = function (z) {
    const a = z && z.act; if (!a) return [];
    const who = a.side === 'friend' ? 'On the creatures\' side: it goes for whatever attacks them.' : a.side === 'wild' ? 'On nobody\'s side: it goes for creatures and for other things alike.' : 'Against the creatures of the star.';
    const prey = a.prey ? ' It is after <b>' + G.escapeHtml(a.prey) + '</b> above all.' : '';
    const how = prey + ' ' + (a.way === 'hunts' ? 'It hunts: it goes after them.' : a.way === 'guards' ? 'It guards its place and goes for whatever comes near.' : a.way === 'wanders' ? 'It wanders.' : 'It stays where it is.');
    const L = a.acts.map(function (q) { return 'It <b>' + VERB[q.do] + '</b>' + (q.with && (q.do === 'strike' || q.do === 'shoot' || q.do === 'blast') ? ' with ' + G.escapeHtml(q.with) : '') + ' (' + (q.power > 0.66 ? 'hard' : q.power > 0.33 ? 'firmly' : 'lightly') + ', every ' + q.every.toFixed(1) + ' s' + (z.actN && z.actN[q.do] ? '; ' + z.actN[q.do] + ' times so far' : '') + ').'; });
    return [who + ' ' + how].concat(L);
  };

  // a thing dropped in the pond keeps what it does; and one that is against the creatures counts as a danger, which is what makes the pond answer it
  { const add0 = G.addZone; G.addZone = function (x, y, info) { const z = add0(x, y, info); const a = z && info ? (G.cleanActs(info) || null) : null; if (z && a && !z.haven && !(z.p.vault > 0.2)) { z.act = a; z.hx = z.x; z.hy = z.y; z.actT = a.acts.map(function (q, i) { return 0.8 + i * 0.5; }); z.actN = {}; z.p.moves = 0; z.foe = a.side !== 'friend'; } return z; }; }
  { const bad0 = G.isBad; G.isBad = function (z) { return bad0(z) || !!(z && z.foe && z.act); }; }

  const dist = function (a, b) { return Math.hypot(a.x - b.x, a.y - b.y); };
  // ── what a creature's own brain is told, and what it may choose ──
  // Senses 12 to 15: something armed is near · its own kind is building, or has built, near · the player's voice (GOOD above zero, BAD below, fading) ·
  // it has just been hurt. Actions 5 and 6: strike (hit back at an armed thing within reach) · help build (join its kind's building work).
  // Nothing is wired in: a newborn's brain has no wire to any of these. Mutation grows the wires, and living (and the player's voice) teaches their use.
  G.senseMore = function (c, inp, range) {
    const W = G.W; let arm = 0, bld = 0;
    for (let i = 0; i < W.zones.length; i++) { const z = W.zones[i]; if (!z.act || !z.foe) continue; const p = 1 - (dist(z, c) - z.r * 0.5) / (range * 1.6 + 60); if (p > arm) arm = p; }
    const d = W.deed; if (d && d.sp === c.sp && d.bp) bld = Math.max(bld, 1 - dist(d, c) / 600);
    if (W.works) for (let i = 0; i < W.works.length; i++) { const w = W.works[i]; if (w.bp && w.sp === c.sp) bld = Math.max(bld, 1 - dist(w, c) / 500); }
    c.godV = (c.godV || 0) * 0.985;
    inp[12] = clamp(arm, 0, 1); inp[13] = clamp(bld, 0, 1); inp[14] = c.godV; inp[15] = Math.min(1, Math.max(0, c.startle || 0));
  };
  /** creatures whose brains say STRIKE hit the armed thing they are next to: it costs them, it wears the thing down, and it is a lesson that it worked */
  function strikeBack(W, dt) {
    const Z = W.zones.filter(function (z) { return z.act && z.foe; }); if (!Z.length) return;
    for (let i = 0; i < W.cre.length; i++) { const c = W.cre[i]; if (c.strikeT > 0) { c.strikeT -= dt; continue; } if (c.dead || !(c.out[5] > 0.6)) continue;
      for (let k = 0; k < Z.length; k++) { const z = Z[k]; if (dist(z, c) > c.ph.r + z.r * 0.5 + 30) continue;
        const pow = 2.5 + 4 * Math.min(2, c.ph.spike || 0) + 3 * Math.min(2, c.ph.bite || 0) + 0.12 * c.ph.r;
        if (z.alive > 0.25) z.health = Math.max(0, (z.health || 0) - pow * 0.004); else z.life -= pow * 0.35;
        z.struck = 1; z.hit = (z.hit || 0) + pow * 0.002; z._atk = (z._atk | 0) + 1; c.strikeT = 1; c.strike = 0.6; c.E -= 1.2; c.struckBack = (c.struckBack || 0) + 1;
        if (G.learn) G.learn(c, 0.4); G.emit('act-hit', c, z, null); G.emit('struck-back', c, z); break; } }
  }
  /** whom this thing goes for: the nearest it may attack within `far` */
  function target(z, far) {
    const W = G.W, a = z.act; let best = null, bd = far;
    if (a.prey) { const low = a.prey.toLowerCase(); for (let i = 0; i < W.zones.length; i++) { const o = W.zones[i]; if (o !== z && String(o.word).toLowerCase() === low) return o; } if (a.only) return null; }      /* the one it came for, wherever it is */
    if (a.side !== 'friend' || true) for (let i = 0; i < W.cre.length; i++) { const c = W.cre[i]; if (c.dead) continue; if (a.side === 'friend' && !((c.ph.aggro || 0) > 0.38 || c.cool > 0.6)) continue; const d = dist(c, z) - c.ph.r; if (d < bd) { bd = d; best = c; } }
    if (a.side !== 'foe') for (let i = 0; i < W.zones.length; i++) { const o = W.zones[i]; if (o === z || o.haven) continue; if (a.side === 'friend' ? !G.isBad(o) : !o.act) continue; const d = dist(o, z) - o.r * 0.5; if (d < bd) { bd = d; best = o; } }
    if (a.side !== 'friend' && W.works) for (let i = 0; i < W.works.length; i++) { const w = W.works[i]; if (!w.bp || w.fall) continue; const d = dist(w, z) - w.bp.S * 0.6; if (d < bd * 0.5) { bd = d * 2; best = w; } }      /* what the creatures built, when it is close by */
    return best;
  }
  /** harm done to a creature or to another thing */
  function hurt(z, o, dmg, why) {
    const W = G.W;
    if (o.ph) {      // a creature
      if (o.dead) return;
      const ward = o.wardT > 0 ? 0.45 : 1;
      o.E -= dmg * ward * (1 - Math.min(0.85, (o.ph.defense || 0)) * 0.75); o.flash = 1; o.startle = Math.max(o.startle || 0, 1.2);
      const dx = o.x - z.x, dy = o.y - z.y, d = Math.hypot(dx, dy) + 0.01; o.vx += dx / d * 60; o.vy += dy / d * 60;
      if (G.learn) G.learn(o, -0.7);                       // it learns what was near when it was hit
      z.hurt = (z.hurt || 0) + dmg;
      if (o.E <= 0) { z.deaths = (z.deaths || 0) + 1; W.stats.killed = (W.stats.killed || 0) + 1; if (G.zoneEvent && z.deaths === 1) G.zoneEvent(z, 'It struck down its first creature'); G.killCreature(o, 'fought', null); }
    } else if (o.bp) {   // something the creatures built: a piece is knocked off
      o.dmg = (o.dmg || 0) + dmg; if (o.dmg > 110) { o.dmg = 0; const P = o.bp.P; for (let k = P.length - 1; k >= 0; k--) if (P[k].st > 0) { P[k].st = 0; G.emit('build-fall', o, P[k]); break; } o.hitBy = z.word; o.hitGen = W.gen; }
    } else {         // another thing
      if (o.alive > 0.25) o.health = Math.max(0, (o.health || 0) - dmg * 0.006); else o.life -= dmg * 0.14;      /* a thing takes many blows: a fight between two of them is something to watch */
      if ((o.alive > 0.25 ? o.health <= 0 : o.life <= 0) && !o.felled) { o.felled = z.word; if (G.zoneEvent) G.zoneEvent(z, 'It brought down ' + o.word); if (G.mode === 'play' && G.log) G.log('disc', z.word + ' brought down ' + o.word, 'One thing you added has destroyed another.'); if (G.note) G.note('It happened on the star', z.word + ' brought down ' + o.word + '.'); }
      o.struck = 1; o.bite = 1;
    }
    G.emit('act-hit', z, o, why);
  }
  function act(z, q, i, dt) {
    const W = G.W, m = Math.min(W.ww, W.wh);
    z.actT[i] -= dt; if (z.actT[i] > 0) return;
    const count = function () { z.actN[q.do] = (z.actN[q.do] || 0) + 1; z.actT[i] = q.every * (0.85 + 0.3 * G.rand()); };
    if (q.do === 'strike') { const R = z.r * 0.55 + 40 + 90 * q.reach, o = target(z, R); if (!o) { z.actT[i] = 0.25; return; } count(); z.bite = 1; z.aim = Math.atan2(o.y - z.y, o.x - z.x); hurt(z, o, 10 + 26 * q.power, q); G.emit('act', z, q, o); }
    else if (q.do === 'shoot') { const R = 160 + 620 * q.reach, o = target(z, R); if (!o) { z.actT[i] = 0.3; return; } count(); z.aim = Math.atan2(o.y - z.y, o.x - z.x); (W.shots = W.shots || []).push({ x: z.x, y: z.y - z.r * 0.3, o: o, z: z, q: q, t: 0, a: z.aim }); if (W.shots.length > 60) W.shots.shift(); G.emit('act', z, q, o); }
    else if (q.do === 'blast') { const R = 90 + 360 * q.reach; let any = false; for (let k = 0; k < W.cre.length; k++) { const c = W.cre[k]; if (c.dead || (z.act.side === 'friend' && !((c.ph.aggro || 0) > 0.38))) continue; const d = dist(c, z); if (d < R) { any = true; break; } } if (!any && z.act.side !== 'wild') { z.actT[i] = 0.5; return; } count();
      for (let k = W.cre.length - 1; k >= 0; k--) { const c = W.cre[k]; if (c.dead || (z.act.side === 'friend' && !((c.ph.aggro || 0) > 0.38))) continue; const d = dist(c, z); if (d < R) hurt(z, c, (10 + 30 * q.power) * (1 - 0.6 * d / R), q); }
      if (z.act.side !== 'foe') for (let k = 0; k < W.zones.length; k++) { const o = W.zones[k]; if (o !== z && o.act && dist(o, z) < R) hurt(z, o, 10 + 30 * q.power, q); }
      G.emit('act', z, q, null, R); }
    else if (q.do === 'heal') { const R = 80 + 300 * q.reach; let n = 0; for (let k = 0; k < W.cre.length; k++) { const c = W.cre[k]; if (c.dead || c.E >= c.ph.Emax * 0.98 || dist(c, z) > R) continue; c.E = Math.min(c.ph.Emax, c.E + (4 + 12 * q.power) + 0.03 * c.ph.Emax); c.mend = 1; n++; } if (!n) { z.actT[i] = 0.5; return; } count(); z.fedN = (z.fedN || 0) + n; G.emit('act', z, q, null, R); }
    else if (q.do === 'shield') { const R = 80 + 300 * q.reach; let n = 0; for (let k = 0; k < W.cre.length; k++) { const c = W.cre[k]; if (!c.dead && dist(c, z) < R) { c.wardT = q.every + 0.4; n++; } } z.wardR = R; if (n) count(); else z.actT[i] = 0.6; }
    else if (q.do === 'spawn') { if ((z.kids || 0) >= 2 || W.zones.length >= 11 || z.small) { z.actT[i] = 4; return; } count(); z.kids = (z.kids || 0) + 1; const an = G.rand() * TAU, d = z.r + 60;
      const kid = G.addZone(clamp(z.x + Math.cos(an) * d, 60, W.ww - 60), clamp(z.y + Math.sin(an) * d, 60, W.wh - 60), { name: z.word, props: { poison: z.p.poison, acid: z.p.acid, eats: z.p.eats * 0.5, deadly: 0, nutrition: z.p.nut }, hue: z.hue, radius: Math.max(40, z.r0 * 0.6), life: 70, look: z.look || null, weak: z.weak, note: 'One of the young of ' + z.word + '.', from: z.word, source: 'ai',
        act: { way: 'hunts', side: z.act.side, acts: z.act.acts.filter(function (x) { return x.do !== 'spawn'; }).map(function (x) { return { do: x.do, power: x.power * 0.55, every: x.every * 1.2, reach: x.reach * 0.8, with: x.with, shot: x.shot, hue: x.hue }; }) } });
      if (kid) { kid.small = true; kid._fig = z._fig; kid._figSvg = z._figSvg; kid._figAsked = true; } G.emit('act', z, q, kid); }
    void m;
  }
  function stepActs(dt) {
    const W = G.W;
    for (let k = 0; k < W.zones.length; k++) {
      const z = W.zones[k], a = z.act; if (!a) continue;
      // how it carries itself
      const sp = 26 + 30 * (z.small ? 1.3 : 1), far = a.prey || a.way === 'hunts' ? 1e5 : a.way === 'guards' ? 150 + z.r0 * 2.2 : 0;
      const o = far ? target(z, far) : null; let tx = z.x, ty = z.y, go = 0;
      const near = function (q) { return q.do === 'strike' ? z.r * 0.4 + 30 : q.do === 'shoot' ? 140 + 400 * q.reach : 60; };
      if (o) { const want = Math.min.apply(null, a.acts.filter(function (q) { return q.do === 'strike' || q.do === 'shoot' || q.do === 'blast'; }).map(near).concat([400])), d = dist(o, z); if (d > want) { tx = o.x; ty = o.y; go = 1; } if (a.way === 'guards' && !a.prey && Math.hypot(z.x - z.hx, z.y - z.hy) > 200 + z.r0 * 2.5) { tx = z.hx; ty = z.hy; go = 1; } }
      else if (a.way === 'guards') { if (Math.hypot(z.x - z.hx, z.y - z.hy) > 30) { tx = z.hx; ty = z.hy; go = 0.6; } }
      else if (a.way === 'wanders' || a.way === 'hunts') { z.ma = (z.ma || 0) + (G.rand() - 0.5) * 1.2 * dt; tx = z.x + Math.cos(z.ma) * 100; ty = z.y + Math.sin(z.ma) * 100; go = 0.45; }
      if (go) { const dx = tx - z.x, dy = ty - z.y, d = Math.hypot(dx, dy) + 0.01; z.x = clamp(z.x + dx / d * sp * go * dt, 50, W.ww - 50); z.y = clamp(z.y + dy / d * sp * go * dt, 50, W.wh - 50); if (z.x <= 50 || z.x >= W.ww - 50 || z.y <= 50 || z.y >= W.wh - 50) z.ma = (z.ma || 0) + 2; z.face = dx < 0 ? -1 : 1; }
      for (let i = 0; i < a.acts.length; i++) act(z, a.acts[i], i, dt);
    }
    // what was shot flies, follows its target a little, and lands or is lost
    const S = W.shots; if (S && S.length) for (let i = S.length - 1; i >= 0; i--) {
      const s = S[i], o = s.o; s.t += dt;
      if (s.t > 2.6 || !o || o.dead || (!o.ph && W.zones.indexOf(o) < 0)) { S.splice(i, 1); continue; }
      const dx = o.x - s.x, dy = (o.ph ? o.y - o.ph.r : o.y) - s.y, d = Math.hypot(dx, dy) + 0.01, want = Math.atan2(dy, dx); let da = want - s.a; while (da > Math.PI) da -= TAU; while (da < -Math.PI) da += TAU;
      s.a += da * Math.min(1, 5 * dt); const v = 430; s.x += Math.cos(s.a) * v * dt; s.y += Math.sin(s.a) * v * dt;
      if (d < (o.ph ? o.ph.r + 10 : o.r * 0.5 + 10)) { hurt(s.z, o, 8 + 20 * s.q.power, s.q); S.splice(i, 1); }
    }
    for (let i = 0; i < W.cre.length; i++) { const c = W.cre[i]; if (c.wardT > 0) c.wardT -= dt; }
  }
  { const step0 = G.step; G.step = function (dt) { step0(dt); const W = G.W; if (W && !W.title && W.zones && W.zones.length) { let any = W.shots && W.shots.length; for (let i = 0; i < W.zones.length && !any; i++) if (W.zones[i].act) any = true; if (any) { stepActs(dt); strikeBack(W, dt); } } }; }
  if (G.on) G.on('new-pond', function () { if (G.W) G.W.shots = []; });
})();
