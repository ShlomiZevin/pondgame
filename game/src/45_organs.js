// ── Organs: new body parts invented for THIS pond (by the AI when there is one, by the game otherwise) ──
// An organ is a part gene like any other: mutation can grow it, it costs energy, and selection decides if it
// spreads. What it does comes from a fixed vocabulary of effects, so whatever is imagined stays fair.
(function () {
  'use strict';
  const clamp = G.clamp;
  // effect → how the engine reads it (all clamped):
  //   speed -1..1, sense 0..1, eat 0..1, armor 0..1, spike 0..1, toxin 0..1, photo 0..1 (feeds on light),
  //   glow 0..1, heat/cold/poison 0..1 (resistance), digest: -1 or a food kind 0..5
  const FX = ['speed', 'sense', 'eat', 'armor', 'spike', 'toxin', 'photo', 'glow', 'heat', 'cold', 'poison'];
  G.FX = FX;
  const MAX_ORGANS = 12;

  G.organOf = function (k) {
    const W = G.W;
    if (!W || !W.organs) return null;
    for (let i = 0; i < W.organs.length; i++) if (W.organs[i].id === k - 100) return W.organs[i];
    return null;
  };
  G.partName = function (k) { if (k < 100) return G.PT[k] || 'part'; const o = G.organOf(k); return o ? o.name.toLowerCase() : 'organ'; };

  /** Whatever was imagined becomes a fair, in-range organ. */
  G.cleanOrgan = function (raw) {
    if (!raw || typeof raw !== 'object') return null;
    const f = raw.fx && typeof raw.fx === 'object' ? raw.fx : {};
    const fx = {};
    let sum = 0;
    for (let i = 0; i < FX.length; i++) {
      const k = FX[i];
      let v = +f[k]; if (!isFinite(v)) v = 0;
      fx[k] = k === 'speed' ? clamp(v, -1, 1) : clamp(v, 0, 1);
      sum += Math.abs(fx[k]);
    }
    let digest = Math.round(+raw.digest); if (!(digest >= 0 && digest <= 5)) digest = -1;
    if (sum < 0.15 && digest < 0) return null;
    // an organ may not be good at everything: the strongest effects are kept, the total is capped
    if (sum > 1.8) for (let i = 0; i < FX.length; i++) fx[FX[i]] *= 1.8 / sum;
    return {
      name: String(raw.name || 'New organ').replace(/[<>"]/g, '').slice(0, 26),
      note: String(raw.note || '').replace(/[<>]/g, '').slice(0, 120),
      svg: raw.svg ? G.safeSvg(raw.svg) : '',
      fx: fx, digest: digest,
      hue: ((+raw.hue || 0) % 360 + 360) % 360,
      by: String(raw.by || raw.model || '').slice(0, 60),
    };
  };

  G.addOrgan = function (def, quiet) {
    const W = G.W;
    const o = G.cleanOrgan(def);
    if (!o) return null;
    if (W.organs.some(function (x) { return x.name.toLowerCase() === o.name.toLowerCase(); })) return null;
    if (W.organs.length >= MAX_ORGANS) {
      // make room: drop the oldest organ nobody carries
      const used = {};
      for (let i = 0; i < W.cre.length; i++) for (let j = 0; j < W.cre[i].g.p.length; j++) used[W.cre[i].g.p[j].k] = 1;
      let at = -1;
      for (let i = 0; i < W.organs.length; i++) if (!used[100 + W.organs[i].id]) { at = i; break; }
      if (at < 0) return null;
      W.organs.splice(at, 1);
    }
    o.id = W.nextOrgan++;
    o.gen = def.gen || W.gen;
    W.organs.push(o);
    if (!quiet) G.emit('organ-new', o);
    return o;
  };

  // ── the game's own imagination (no server needed) ──
  const KINDS = [
    { fx: { photo: 0.8 }, names: ['Sun Leaf', 'Light Sail', 'Green Frond', 'Algae Coat'], note: 'Feeds on light, so its owner can rest in the bright open.', shape: 'leaf', hue: 120 },
    { fx: { sense: 0.8 }, names: ['Feeler', 'Whisker Stalk', 'Scent Horn', 'Ripple Ear'], note: 'Senses food and danger from much further away.', shape: 'antenna', hue: 50 },
    { fx: { speed: 0.8 }, names: ['Jet Sac', 'Water Screw', 'Kick Fin', 'Paddle Tail'], note: 'A burst of speed.', shape: 'jet', hue: 195 },
    { fx: { armor: 0.8, speed: -0.3 }, names: ['Shell Plate', 'Stone Hide', 'Bone Shield'], note: 'Hard to bite, but slow.', shape: 'shell', hue: 40 },
    { fx: { eat: 0.9 }, names: ['Suction Mouth', 'Gulper Tube', 'Reaching Tongue', 'Net Mouth'], note: 'Reaches food from further away.', shape: 'tube', hue: 340 },
    { fx: { spike: 0.8 }, names: ['Thorn', 'Barb Horn', 'Needle Crown'], note: 'Anything that bites it gets hurt.', shape: 'thorn', hue: 280 },
    { fx: { toxin: 0.8 }, names: ['Bitter Gland', 'Stinger', 'Venom Sac'], note: 'It tastes terrible, and eating it costs dearly.', shape: 'bulb', hue: 100 },
    { fx: { glow: 0.7, sense: 0.3 }, names: ['Glow Bulb', 'Lantern Eye', 'Star Spot'], note: 'A light of its own, in the dark.', shape: 'bulb', hue: 55 },
    { fx: { heat: 0.8 }, names: ['Heat Skin', 'Ember Coat'], note: 'Shrugs off heat.', shape: 'shell', hue: 15 },
    { fx: { cold: 0.8 }, names: ['Frost Coat', 'Winter Fur', 'Ice Fat'], note: 'Shrugs off the cold.', shape: 'fur', hue: 205 },
    { fx: { poison: 0.8 }, names: ['Filter Liver', 'Clean Gut'], note: 'Goes through poison unharmed.', shape: 'bulb', hue: 265 },
    { fx: { photo: 0.5, armor: 0.4, speed: -0.4 }, names: ['Reef Crust', 'Moss Shell'], note: 'A living crust: it feeds on light and protects, and barely moves.', shape: 'shell', hue: 140 },
    { fx: { eat: 0.4 }, digest: true, names: ['Grinder Gut', 'Second Stomach', 'Sifter'], note: 'Digests a food its owner could not eat before.', shape: 'tube', hue: 25 },
    { fx: { speed: 0.5, sense: 0.4 }, names: ['Hunter Fin', 'Chase Whisker'], note: 'Fast and alert: made for the chase.', shape: 'jet', hue: 350 },
  ];
  const SHAPES = {
    leaf: function (c) { return '<path d="M2 16 C10 2 26 4 30 16 C26 28 10 30 2 16 Z" fill="' + c + '" stroke="#07121f" stroke-width="2"/><path d="M4 16 L28 16" stroke="#07121f" stroke-width="1.5"/>'; },
    antenna: function (c) { return '<path d="M2 16 Q14 6 24 8" fill="none" stroke="' + c + '" stroke-width="4" stroke-linecap="round"/><circle cx="26" cy="8" r="5" fill="' + c + '" stroke="#07121f" stroke-width="2"/>'; },
    jet: function (c) { return '<polygon points="2,10 20,4 30,16 20,28 2,22" fill="' + c + '" stroke="#07121f" stroke-width="2"/><path d="M22 12 L30 16 L22 20" fill="none" stroke="#07121f" stroke-width="1.5"/>'; },
    shell: function (c) { return '<path d="M4 4 Q22 16 4 28 Z" fill="' + c + '" stroke="#07121f" stroke-width="2"/><path d="M6 10 Q13 16 6 22" fill="none" stroke="#07121f" stroke-width="1.5"/>'; },
    tube: function (c) { return '<rect x="2" y="11" width="20" height="10" rx="4" fill="' + c + '" stroke="#07121f" stroke-width="2"/><circle cx="24" cy="16" r="7" fill="#07121f" stroke="' + c + '" stroke-width="3"/>'; },
    thorn: function (c) { return '<polygon points="2,9 30,16 2,23" fill="' + c + '" stroke="#07121f" stroke-width="2"/>'; },
    bulb: function (c) { return '<path d="M2 16 L12 16" stroke="' + c + '" stroke-width="4"/><circle cx="20" cy="16" r="9" fill="' + c + '" stroke="#07121f" stroke-width="2"/><circle cx="17" cy="13" r="3" fill="#ffffff" opacity="0.7"/>'; },
    fur: function (c) { return '<path d="M3 6 L16 10 M3 12 L20 14 M3 18 L20 18 M3 24 L16 22" stroke="' + c + '" stroke-width="3.5" stroke-linecap="round"/>'; },
  };
  const ADJ = ['', '', 'Twin ', 'Great ', 'Fine ', 'Old ', 'Bright ', 'Deep '];

  G.offlineOrgan = function () {
    const r = G.rand;
    // most of the time, something that answers a pressure the pond is under right now
    let kind = KINDS[Math.floor(r() * KINDS.length)];
    const press = G.W && G.W.press ? G.W.press : null;
    if (press && r() < 0.75) {
      let tot = 0; const w = KINDS.map(function (k) { let s = 0.15; for (const f in k.fx) if (k.fx[f] > 0) s += (press.fx[f] || 0) * k.fx[f]; if (k.digest && press.digest !== undefined) s += 2; tot += s; return s; });
      let x = r() * tot;
      for (let i = 0; i < KINDS.length; i++) { x -= w[i]; if (x <= 0) { kind = KINDS[i]; break; } }
    }
    const fx = {};
    for (const k in kind.fx) fx[k] = kind.fx[k] * (0.7 + r() * 0.5);
    const hue = (kind.hue + (r() - 0.5) * 50 + 360) % 360;
    const col = G.hsl(hue, 80, 62, 1);
    return {
      name: ADJ[Math.floor(r() * ADJ.length)] + kind.names[Math.floor(r() * kind.names.length)],
      note: kind.note, fx: fx, digest: kind.digest ? (press && press.digest !== undefined ? press.digest : Math.floor(r() * 6)) : -1, hue: hue,
      svg: '<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">' + SHAPES[kind.shape](col) + '</svg>',
      by: '',
    };
  };

  // every few generations the pond gets one new organ to try
  let busy = false;
  G.organTick = function (gen) {
    const W = G.W;
    if (!W || W.title || gen % 4 !== 2) return;
    const live = G.mode === 'play' && !G.catching && G.ai && G.ai.provider === 'server' && G.ai.available && G.ai.available();
    if (!live) { G.addOrgan(G.offlineOrgan()); return; }
    // the AI invents an organ now and then; in between, the game's own imagination fills in
    if (busy || !G.ai.allow('organ')) return;          // not now: with an AI, nothing is taken from the stock
    busy = true;
    const info = {
      gen: gen,
      species: W.species.filter(function (s) { return !s.extinct && s.n > 0; }).sort(function (a, b) { return b.n - a.n; }).slice(0, 5).map(function (s) { return { name: s.name, n: s.n, about: G.describeSpecies(s) }; }),
      things: W.zones.map(function (z) { return z.word; }).slice(0, 8),
      pressures: W.press ? W.press.list.slice(0, 6) : [],
      water: { temperature: W.set.temp, light: W.set.light, food: W.set.bloom },
      have: W.organs.map(function (o) { return o.name; }),
    };
    G.ai.ask('organ', info).then(function (o) { busy = false; if (G.W === W && o) G.addOrgan(o); }, function () { busy = false; });
  };
})();
