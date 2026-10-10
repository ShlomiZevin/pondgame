// ── Anything can happen: free-text events ("an ice age", "a swarm of jellyfish", "aliens take the biggest") ──
// The AI (or the game itself) turns the sentence into an event made of things the engine really does:
// who dies, heat, light, food, mutation, currents, food rain, and a thing dropped in. Nothing else can happen,
// so whatever is imagined stays fair.
(function () {
  'use strict';
  const clamp = G.clamp;
  const WHO = ['random', 'biggest', 'smallest', 'fastest', 'slowest', 'common', 'rare', 'shallows', 'deep', 'ugliest', 'blind', 'legless', 'unarmoured', 'bare'];
  // what an event may give to (or take from) living bodies, all at once
  const GIFTS = ['legs', 'fins', 'spikes', 'tentacles', 'feelers', 'plates', 'frills', 'horns', 'eyes', 'jaws', 'beak', 'tail', 'shell', 'glow', 'poison', 'scales', 'fur', 'feathers', 'neck', 'big head', 'longer body', 'star body', 'hands'];
  G.GIFTS = GIFTS;
  /** grow one thing on one living creature, there and then */
  G.giveTrait = function (c, trait) {
    const f = c.g.f, F = G.form, i = F.KMANY.indexOf(trait);
    const add = function (k, o) { if (f.rules.some(function (q) { return q.k === k && q.on < 0; })) return; if (f.rules.length >= F.MAXR) f.rules.shift(); f.rules.push(Object.assign({ k: k, a: k === 4 || k === 7 || k === 6 ? 0 : Math.min(1, f.n - 1), b: k === 2 || k === 5 ? f.n - 1 : k === 4 || k === 7 || k === 6 ? 0 : Math.min(1, f.n - 1), e: 1, l: 1.1, w: 0.5, j: 2, g: 0.1, c: 0.4, t: 0, p: 0.5, on: -1 }, o || {})); };
    if (i >= 0 && i < 8) add(i);
    else if (trait === 'hands') add(0, { a: 0, b: 0, t: 1 }); else if (trait === 'eyes') f.en = Math.min(3, Math.max(2, f.en + 1)); else if (trait === 'jaws') f.mk = 2; else if (trait === 'beak') f.mk = 1;
    else if (trait === 'tail') { if (f.n < 2) f.n = 2; if (!f.tk) f.tk = 1 + Math.floor(G.rand() * 4); } else if (trait === 'shell') f.shell = 0.8; else if (trait === 'glow') f.glow = 1; else if (trait === 'poison') f.venom = 1;
    else if (trait === 'scales') f.coat = 1; else if (trait === 'fur') f.coat = 2; else if (trait === 'feathers') f.coat = 3; else if (trait === 'neck') { if (f.n < 2) f.n = 2; f.nk = 0.6; f.sym = 0; } else if (trait === 'big head') f.hd = 1.7;
    else if (trait === 'longer body') f.n = Math.min(F.MAXN, f.n + 2); else if (trait === 'star body') f.sym = 5;
    G.validateGenome(c.g); c.ph = G.derive(c.g); c.fv = null; c.E = Math.min(c.E, c.ph.Emax); c.flash = 1.2; c.mutAge = 2.5;
  };

  G.cleanEvent = function (raw, text) {
    if (!raw || typeof raw !== 'object') return null;
    const n = function (v, a, b, d) { v = +v; return isFinite(v) ? clamp(v, a, b) : d; };
    const k = raw.kill && typeof raw.kill === 'object' ? raw.kill : {};
    const f = raw.feed && typeof raw.feed === 'object' ? raw.feed : {};
    const ev = {
      name: String(raw.name || text || 'Something happened').replace(/[<>"]/g, '').slice(0, 30),
      note: String(raw.note || '').replace(/[<>]/g, '').slice(0, 140),
      hue: n(raw.hue, 0, 360, 200), shake: n(raw.shake, 0, 1, 0.3),
      kill: { share: n(k.share, 0, 0.8, 0), who: WHO.indexOf(k.who) >= 0 ? k.who : 'random' },
      temp: n(raw.temp, -1, 1, 0), light: n(raw.light, -1, 1, 0), food: n(raw.food, 0, 3, 1), mutate: n(raw.mutate, 1, 4, 1),
      poison: n(raw.poison, 0, 1, 0),
      duration: n(raw.duration, 10, 150, 45),
      current: n(raw.current, 0, 1, 0),
      feed: { count: Math.round(n(f.count, 0, 200, 0)), tag: Math.round(n(f.tag, 0, 5, 2)) },
      thing: raw.thing && typeof raw.thing === 'object' && G.clampThing ? G.clampThing(raw.thing) : null,
      things: Math.round(n(raw.things, 1, 5, 1)),
      gift: raw.gift && typeof raw.gift === 'object' && GIFTS.indexOf(String(raw.gift.trait).toLowerCase()) >= 0 ? { trait: String(raw.gift.trait).toLowerCase(), share: n(raw.gift.share, 0.05, 1, 0.5) } : null,
      water: raw.water && typeof raw.water === 'object' ? { oxygen: n(raw.water.oxygen, -1, 1, 0), murk: n(raw.water.murk, -1, 1, 0), rich: n(raw.water.rich, -1, 1, 0), warm: n(raw.water.warm, -1, 1, 0) } : null,
      admire: GIFTS.indexOf(String(raw.admire || '').toLowerCase()) >= 0 ? String(raw.admire).toLowerCase() : '',
      fx: ['snow', 'bubbles', 'embers', 'spores', 'rain', 'stars', 'ash', 'petals', 'leaves', 'sparks', 'fog', 'meteors', 'lightning', 'hail', 'sand', 'feathers'].indexOf(raw.fx) >= 0 ? raw.fx : '',
    };
    ev.food = Math.max(0.3, ev.food);
    // fields (regions of the pond that do things) and strikes from above: see 53_fields.js. A "thing" that is a wall becomes a solid line.
    { let wall = raw.barrier && typeof raw.barrier === 'object' ? raw.barrier : null;
      if (!wall && ev.thing && ev.thing.props && ev.thing.props.vault > 0.2) { wall = { name: ev.thing.name || ev.name, across: 'vertical', at: 0.5, gap: 0.12, hue: ev.thing.hue, weak: ev.thing.weak, life: 160 }; ev.thing = null; }
      ev.fields = G.cleanFields ? G.cleanFields(raw.fields, wall) : [];
      ev.strikes = G.cleanStrikes ? G.cleanStrikes(raw.strikes) : null; }
    if (ev.thing && ev.thing.props && ev.thing.props.vault > 0.2) { ev.kill.share = 0; ev.food = Math.max(1, ev.food); ev.temp = clamp(ev.temp, -0.45, 0.45); ev.light = Math.max(-0.3, ev.light); }      // a wall of ice is cold, a wall of fire is hot: but mildly, since it already locks the food away
    // what fills the water while it lasts, if nobody said
    if (!ev.fx) ev.fx = ev.poison > 0.2 ? 'spores' : ev.temp < -0.3 ? 'snow' : ev.temp > 0.3 ? 'embers' : ev.light < -0.3 ? 'stars' : ev.current > 0.4 ? 'rain' : ev.mutate > 1.5 ? 'stars' : ev.food > 1.5 || ev.feed.count > 60 ? 'spores' : '';
    const does = ev.poison > 0.05 || ev.kill.share > 0.02 || Math.abs(ev.temp) > 0.05 || Math.abs(ev.light) > 0.05 || Math.abs(ev.food - 1) > 0.05 || ev.mutate > 1.05 || ev.current > 0.05 || ev.feed.count > 0 || ev.thing || (ev.fields && ev.fields.length) || ev.strikes || ev.gift || ev.admire || (ev.water && Math.abs(ev.water.oxygen) + Math.abs(ev.water.murk) + Math.abs(ev.water.rich) + Math.abs(ev.water.warm) > 0.05);
    return does ? ev : null;
  };

  // lasting changes: each has an end time; the world asks for their sum
  G.modSum = function (key) {
    const W = G.W; let s = 0;
    if (!W || !W.mods) return 0;
    for (let i = 0; i < W.mods.length; i++) s += W.mods[i][key] || 0;
    return s;
  };
  G.modMul = function (key) {
    const W = G.W; let s = 1;
    if (!W || !W.mods) return 1;
    for (let i = 0; i < W.mods.length; i++) if (W.mods[i][key] !== undefined) s *= W.mods[i][key];
    return s;
  };

  G.runEvent = function (ev) {
    const W = G.W;
    if (!W || !ev) return;
    if (!W.mods) W.mods = [];
    // who dies
    if (ev.kill.share > 0.02 && W.cre.length) {
      const cre = W.cre.slice(), who = ev.kill.who, share = ev.kill.share;
      let doomed = [];
      if (who === 'blind' || who === 'legless' || who === 'unarmoured' || who === 'bare') {
        // it takes those who lack something: the rest are spared
        const lacks = who === 'blind' ? function (c) { return c.g.f.en === 0; } : who === 'legless' ? function (c) { return !c.ph.limbs; } : who === 'unarmoured' ? function (c) { return c.ph.defense < 0.15; } : function (c) { return !c.g.f.coat; };
        for (let i = 0; i < cre.length; i++) if (G.rand() < (lacks(cre[i]) ? Math.min(0.95, share * 1.8) : share * 0.08)) doomed.push(cre[i]);
      } else if (who === 'biggest' || who === 'smallest' || who === 'fastest' || who === 'slowest' || who === 'ugliest') {
        const key = who === 'ugliest' ? function (c) { return -G.charmOf(c); } : who === 'biggest' || who === 'smallest' ? function (c) { return c.ph.r; } : function (c) { return c.ph.speed; };
        cre.sort(function (a, b) { return key(b) - key(a); });
        if (who === 'smallest' || who === 'slowest') cre.reverse();
        doomed = cre.slice(0, Math.round(cre.length * share));
      } else {
        const counts = {}; let top = 0, tn = 0;
        for (let i = 0; i < cre.length; i++) counts[cre[i].sp] = (counts[cre[i].sp] || 0) + 1;
        for (const k in counts) if (counts[k] > tn) { tn = counts[k]; top = +k; }
        for (let i = 0; i < cre.length; i++) {
          const c = cre[i]; let p = share;
          if (who === 'common') p = c.sp === top ? share * 1.6 : share * 0.2;
          else if (who === 'rare') p = c.sp === top ? share * 0.2 : share * 1.6;
          else if (who === 'shallows') p = c.x < W.ww * 0.5 ? share * 1.7 : share * 0.15;
          else if (who === 'deep') p = c.x >= W.ww * 0.5 ? share * 1.7 : share * 0.15;
          if (G.rand() < p) doomed.push(c);
        }
      }
      for (let i = 0; i < doomed.length; i++) G.kill(doomed[i], 'event');
    }
    if (ev.current > 0.05) { const a = G.rand() * 6.2832; W.flood = { t: 4 + ev.current * 6, fx: Math.cos(a) * 160 * ev.current, fy: Math.sin(a) * 160 * ev.current }; }
    for (let i = 0; i < ev.feed.count; i++) G.spawnFood(W, G.rand() * W.ww, G.rand() * W.wh, ev.feed.tag);
    if (Math.abs(ev.temp) > 0.05 || Math.abs(ev.light) > 0.05 || Math.abs(ev.food - 1) > 0.05 || ev.mutate > 1.05 || ev.fx || ev.poison > 0.05) {
      W.mods.push({ until: W.t + ev.duration, name: ev.name, poison: ev.poison, temp: ev.temp, light: ev.light, food: ev.food, mutate: ev.mutate, fx: ev.fx, hue: ev.hue });
      if (W.mods.length > 6) W.mods.shift();
    }
    if (ev.thing) {
      const wall = ev.thing.props && ev.thing.props.vault > 0.2;
      if (wall) { const old = G.vaultOf(W); if (old) old.life = 0; }          // one wall at a time
      for (let q = 0; q < (wall ? 1 : ev.things || 1); q++) G.addZone(wall ? W.ww * 0.36 : W.ww * (0.15 + 0.7 * G.rand()), wall ? W.wh * 0.5 : W.wh * (0.25 + 0.6 * G.rand()), ev.thing);
    }
    // a gift: that share of everything alive grows it at once. Whether it stays is up to selection.
    if (ev.gift) { let got = 0; for (let i = 0; i < W.cre.length; i++) if (G.rand() < ev.gift.share) { G.giveTrait(W.cre[i], ev.gift.trait); got++; } ev.got = got; }
    // the water itself changes, for good
    if (ev.water && W.env) { const e = W.env, w = ev.water; e.o2 = clamp(e.o2 + w.oxygen * 0.35, 0.45, 1.4); e.murk = clamp(e.murk + w.murk * 0.5, 0, 1); e.rich = clamp(e.rich + w.rich * 0.4, 0.55, 1.6); e.warm = clamp(e.warm + w.warm * 0.25, -0.4, 0.4); }
    // taste changes: what the pond admires from now on
    if (ev.admire && W.fashion) { const X = W.fashion, t = ev.admire, i = G.form.KMANY.indexOf(t); if (i >= 0 && i < 8) X.like[i] = 1; else if (t === 'hands') X.like[0] = 1; else if (t === 'eyes') X.eyes = 4; else if (t === 'shell') X.shell = 1; else if (t === 'glow') X.glow = 1; else if (t === 'scales') X.coat = 1; else if (t === 'fur') X.coat = 2; else if (t === 'feathers') X.coat = 3; else if (t === 'star body') X.star = 1; else if (t === 'longer body') X.long = 1; W.fashionGen = W.gen; for (let j = 0; j < W.cre.length; j++) W.cre[j].ph.charm = clamp(G.form.taste(W.cre[j].g.f, X) * 1.15, 0, 1); }
    W.events = W.events || [];
    W.events.push({ g: W.gen, name: ev.name, note: ev.note });
    if (W.events.length > 12) W.events.shift();
    G.emit('event', ev);
  };

  // ── the game's own reading of a sentence (no server needed) ──
  const RULES = [
    [/mud|murk|swamp|stagnant|fog|silt/, { name: 'Murky water', note: 'The water thickens. Light dies quickly and breath comes hard.', hue: 60, shake: 0.2, duration: 30, light: -0.2, water: { oxygen: -0.6, murk: 0.8 } }],
    [/clear water|crystal|fresh/, { name: 'Fresh water', note: 'The water clears and fills with air. Bigger bodies can breathe.', hue: 190, shake: 0.1, fx: 'bubbles', duration: 30, water: { oxygen: 0.8, murk: -0.6 } }],
    [/ice age|freez|frozen|blizzard|snow|winter|cold|frost/, { name: 'A great cold', note: 'The water turns bitter cold. Only the cold-proof are comfortable.', temp: -0.8, light: -0.2, food: 0.5, duration: 80, hue: 205, shake: 0.2 }],
    [/heat|hot|boil|drought|desert|sun burn|scorch|fire|lava|volcan/, { name: 'A great heat', note: 'The water warms and the algae thin out.', temp: 0.8, food: 0.5, duration: 70, hue: 15, shake: 0.4 }],
    [/dark|eclipse|night|shadow|black/, { name: 'The long dark', note: 'The light fades. Light-eaters go hungry; the deep hardly notices.', light: -0.8, food: 0.6, duration: 70, hue: 250, shake: 0.1 }],
    [/bright|sunny|spring|sunshine|rainbow|paradise|feast|bloom|harvest|plenty/, { name: 'A golden season', note: 'Light and food everywhere. Everyone grows fat.', light: 0.5, food: 2.2, duration: 60, hue: 50, shake: 0.1, feed: { count: 120, tag: 2 } }],
    [/meteor|asteroid|comet|bomb|explo|nuke|blast/, { name: 'Impact', note: 'Something huge strikes the star.', kill: { share: 0.45, who: 'random' }, temp: 0.3, duration: 30, hue: 30, shake: 1, current: 0.8 }],
    [/plague|virus|disease|sick|pandemic|infect/, { name: 'A sickness', note: 'It spreads fastest among the most common kind.', kill: { share: 0.5, who: 'common' }, hue: 280, shake: 0.2 }],
    [/giant|whale|shark|monster|predator|kraken|dragon|hunter|eat|alien|abduct/, { name: 'Something hungry', note: 'It takes the biggest ones first.', kill: { share: 0.3, who: 'biggest' }, hue: 340, shake: 0.6, current: 0.4 }],
    [/wall|cage|lock|vault|safe|fence|behind|trapped|sealed|prison|fortress|dome/, { name: 'Locked away', note: 'A wall rises around the food. Only those who can break in will eat.', hue: 210, shake: 0.6, thing: { name: 'Steel Wall', props: { vault: 0.6, hard: 1 }, hue: 210, note: 'A wall around the food. Something will have to learn to get through.', weak: 2 } }],
    [/everyone|every one|all of them|give them|they all|grow |sprout|bless/, { name: 'A strange gift', note: 'Bodies change all at once. Whether it lasts is up to the star.', hue: 290, shake: 0.3, mutate: 1.5, duration: 30, gift: { trait: '?', share: 0.7 } }],
    [/clear water|crystal|fresh water|oxygen|bubbl/, { name: 'Fresh water', note: 'The water clears and fills with air. Bigger bodies can breathe.', hue: 190, shake: 0.1, fx: 'bubbles', duration: 30, water: { oxygen: 0.8, murk: -0.6 } }],
    [/mud|murk|swamp|stagnant|fog|silt/, { name: 'Murky water', note: 'The water thickens. Light dies quickly and breath comes hard.', hue: 60, shake: 0.2, duration: 30, light: -0.2, water: { oxygen: -0.6, murk: 0.8 } }],
    [/fashion|admire|beauty contest|trend|style/, { name: 'A new fashion', note: 'What the star finds beautiful has changed.', hue: 320, shake: 0.1, mutate: 1.2, duration: 20, admire: '?' }],
    [/storm|flood|wave|tsunami|hurricane|tornado|wind|current|whirl/, { name: 'A great storm', note: 'Everything is swept across the star.', current: 1, kill: { share: 0.1, who: 'slowest' }, hue: 200, shake: 0.7 }],
    [/radiat|mutat|magic|wizard|chaos|strange|weird|cosmic/, { name: 'Strange days', note: 'Children are born far stranger than usual.', mutate: 3.5, duration: 90, hue: 300, shake: 0.3 }],
    [/poison|pollut|toxic|acid|oil|sewage|trash|venom|contaminat/, { name: 'Poisoned water', note: 'The whole star turns foul. Only the poison-proof are comfortable.', poison: 0.65, food: 0.8, duration: 110, hue: 95, shake: 0.3, fx: 'spores' }],
    [/rain|food|manna|snack|candy|sugar|cake|pizza/, { name: 'A rain of food', note: 'It falls everywhere at once.', feed: { count: 180, tag: 0 }, food: 1.6, duration: 30, hue: 45, shake: 0.1 }],
  ];
  // ── nature's own surprises: nobody asked for them ──
  const NATURE = ['a cold snap', 'a heat wave', 'the long dark', 'a golden season of plenty', 'a great storm', 'strange days of mutation', 'murky water', 'fresh clear water', 'a sickness', 'a rain of food'];
  G.natureTick = function (gen) {
    const W = G.W;
    if (!W || W.title || gen < 18) return;
    // has the pond stopped changing? the same commonest shape for a long time makes it restless
    const top = W.kinds && W.kinds.length ? W.kinds[0][0] : '';
    if (top !== W.staleKind) { W.staleKind = top; W.staleGen = gen; }
    const stale = gen - (W.staleGen || gen), since = gen - (W.natureGen || 0);
    if (since < 14) return;
    if (G.rand() < 0.045 + (stale > 25 ? 0.12 : 0) + (since > 45 ? 0.2 : 0)) {
      const stock = function () { return G.offlineEvent(NATURE[Math.floor(G.rand() * NATURE.length)]); };
      const run = function (ev) {
      if (!ev) return;
      ev.kill.share = Math.min(ev.kill.share, 0.25);                // nature shakes the pond; it does not empty it
      if (ev.strikes) ev.strikes.kill = Math.min(ev.strikes.kill, 0.5);
      if (ev.fields) for (let i = 0; i < ev.fields.length; i++) { ev.fields[i].kill = Math.min(ev.fields[i].kill, 0.35); if (ev.fields[i].shape === 'all' || ev.fields[i].shape === 'half') { ev.fields[i].kill = Math.min(ev.fields[i].kill, 0.08); ev.fields[i].hurt = Math.min(ev.fields[i].hurt, 0.4); } }
      ev.note = (ev.note ? ev.note + ' ' : '') + 'Nobody caused it: it is the star\'s own weather.';
      ev.nature = true;
      W.natureGen = gen;
      if (stale > 25) { ev.mutate = Math.max(ev.mutate, 2.2); ev.duration = Math.max(ev.duration, 70); W.staleGen = gen; }
      G.runEvent(ev);
      };
      // With an AI to ask, what the pond does to itself is INVENTED: it is told what lives here, what was dropped in, what has
      // happened lately and whether life has gone stale, and makes up what comes next. Nothing is picked from a list.
      const live = G.mode === 'play' && !G.catching && G.ai && G.ai.provider === 'server' && G.ai.available && G.ai.available() && G.host && G.host.ready;
      if (!live) { run(stock()); return; }
      if (W.natureBusy || !G.ai.allow('nature')) return;                // not now: it is tried again next generation
      W.natureBusy = true; W.natureGen = gen;
      const pond = G.worldBrief ? G.worldBrief() : {}; pond.stale = stale > 25 ? 'the same kind has ruled for ' + stale + ' generations: shake things up' : ''; pond.generation = gen; pond.alive = W.cre.length;
      G.host.call('ai.event', { auto: 1, pond: pond, model: G.ai.model || undefined }, 70000).then(function (r) {
        W.natureBusy = false; G.ai.tally('nature', r && r.source, r && r.usd);
        if (G.W !== W) return;
        const ev = r && r.event ? G.cleanEvent(r.event, '') : null;
        if (ev) run(ev); else W.natureGen = gen - 10;
      }, function () { W.natureBusy = false; if (G.W === W) W.natureGen = gen - 10; });
    }
  };
  G.offlineEvent = function (text) {
    const low = String(text || '').toLowerCase();
    // which gift or fashion is meant, if the words name one
    const named = GIFTS.filter(function (g) { return low.indexOf(g.replace(/s$/, '')) >= 0; })[0] || (/wing/.test(low) ? 'fins' : /arm|claw|finger/.test(low) ? 'hands' : /tooth|teeth|bite/.test(low) ? 'jaws' : /light|shine/.test(low) ? 'glow' : /hair/.test(low) ? 'fur' : '');
    for (let i = 0; i < RULES.length; i++) if (RULES[i][0].test(low)) { const e = JSON.parse(JSON.stringify(RULES[i][1])), pick = named || GIFTS[G.hash(low) % GIFTS.length]; if (e.gift) e.gift.trait = pick; if (e.admire) e.admire = pick; if (e.gift) e.note = 'Most of the star grows ' + pick + ' at once. Whether it lasts is up to selection.'; if (e.admire) e.note = 'From now on the star admires ' + pick + '.'; return G.cleanEvent(e, text); }
    // never heard of it: something mild, always the same for the same words
    const r = G.rng(G.hash(low));
    return G.cleanEvent({ name: String(text).slice(0, 30), note: 'Nobody knows quite what that was, but the star felt it.', temp: (r() - 0.5) * 0.8, light: (r() - 0.5) * 0.6, food: 0.6 + r(), mutate: 1 + r() * 1.5, duration: 40 + r() * 40, hue: r() * 360, shake: 0.3, kill: { share: r() * 0.2, who: WHO[Math.floor(r() * WHO.length)] } }, text);
  };
})();
