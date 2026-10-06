// ── New kinds of body part, invented for this pond ──
// The eight growths every pond knows (legs, fins, spikes...) are only a start. Now and then a pond is given a new
// KIND of part: a wing, a sail, antlers, a lure. It arrives as a shape (an outline, ribs, dots), a way of moving and
// what it is good for. From then on it is ordinary genetics: a mutation may grow it, the genes decide where it sits,
// how big it is and how many there are, and selection decides whether it stays. It is drawn in the animal's own colours.
// The AI invents them when there is a server (by the clock, within a budget); without one the pond imagines its own.
(function () {
  'use strict';
  const clamp = G.clamp;
  const ABIL = ['speed', 'agility', 'reach', 'senses', 'armour', 'attack'];
  const PLACES = ['sides', 'back', 'head', 'wrap'], STYLES = ['knit', 'plates', 'stripes', 'fluff', 'plain'], HITS = ['spike', 'toxin', 'bite', 'glow', 'armor'], MOTIONS = ['flap', 'sway', 'pulse', 'bristle', 'still'], COLOURS = ['accent', 'body', 'pale', 'dark', 'glow'];
  const MAX = 8;

  G.designOf = function (id) {
    const L = G.W ? G.W.designs : null;
    if (L) for (let i = 0; i < L.length; i++) if (L[i].id === id) return L[i];
    const K = G.keptDesigns;                    // kinds of part that came along with a kept creature, from another pond
    for (let i = 0; i < K.length; i++) if (K[i].id === id) return K[i];
    return null;
  };

  // ── the collection: creatures you chose to keep. It outlives ponds, so a favourite can be released into a new one. ──
  G.collection = [];          // [{ name, kind, age, gen, g (packed genome) }]
  G.keptDesigns = [];         // the pond-made kinds of part those creatures carry (ids from 100000 up, so they never clash with a pond's own)
  const MAXKEEP = 16;
  G.keep = function (c) {
    if (!c || !c.g) return null;
    const g = G.cloneGenome(c.g), sp = c.sp ? G.speciesById(c.sp) : null;
    for (let i = 0; i < g.f.rules.length; i++) {
      const q = g.f.rules[i]; if (q.k !== 8 || q.t >= 100000) continue;
      const d = G.designOf(q.t); if (!d) continue;
      const sig = d.name + JSON.stringify(d.pts);
      let k = G.keptDesigns.filter(function (x) { return x.name + JSON.stringify(x.pts) === sig; })[0];
      if (!k) { k = JSON.parse(JSON.stringify(d)); k.id = 100000 + G.keptDesigns.reduce(function (m, x) { return Math.max(m, x.id - 99999); }, 0); G.keptDesigns.push(k); }
      q.t = k.id;
    }
    if (g.f.pl && g.f.pl < 100000) {         // and the build it follows
      const p = G.planOf(g.f.pl);
      if (!p) g.f.pl = 0;
      else { const sig = p.name + JSON.stringify(p.bd); let k = G.keptPlans.filter(function (x) { return x.name + JSON.stringify(x.bd) === sig; })[0]; if (!k) { k = JSON.parse(JSON.stringify(p)); k.id = 100000 + G.keptPlans.reduce(function (m, x) { return Math.max(m, x.id - 99999); }, 0); G.keptPlans.push(k); if (G.keptPlans.length > 16) G.keptPlans.shift(); } g.f.pl = k.id; }
    }
    G.form.fix(g.f);
    if (sp) sp.loved = true;
    const item = { name: (sp ? sp.name : 'Creature') + ' #' + c.id, kind: G.form.kind(g.f).full, age: G.ageNow ? G.ageNow().name : '', gen: G.W.gen, g: G.packGenome(g) };
    if (g.mv && g.mv >= 100) { const md = G.marvelOf(g.mv); if (md) item.mv = JSON.parse(JSON.stringify(md)); }      // an invented marvel travels with it
    G.collection.push(item); if (G.collection.length > MAXKEEP) G.collection.shift();
    G.emit('kept', item);
    return item;
  };
  /** breed a kept creature with one living in this pond: six children of the two, born beside the one in the pond */
  G.breedKept = function (item, c) {
    const W = G.W, g0 = G.unpackGenome(item.g);
    if (!g0 || !W || !c || c.dead) return 0;
    for (let i = 0; i < g0.f.rules.length; i++) { const q = g0.f.rules[i]; if (q.k === 8 && q.t >= 100000 && !W.designs.some(function (x) { return x.id === q.t; })) { const d = G.designOf(q.t); if (d && W.designs.length < 12) W.designs.push(JSON.parse(JSON.stringify(d))); } }
    let n = 0;
    for (let i = 0; i < 6; i++) {
      const res = G.mutate(i % 2 ? G.crossover(g0, c.g) : G.crossover(c.g, g0), 0.5, null);
      const kid = G.makeCreature(res.g, c, null, res.muts);
      kid.sp = c.sp; kid.E = kid.ph.Emax * 0.6; kid.P = kid.ph.Emax * 0.4;
      W.births.push({ at: W.st + 0.1 + G.rand() * 1.2, c: kid, x: c.x + G.randn() * 50, y: c.y + G.randn() * 40, from: c }); n++;
    }
    W.discLog.push({ key: 'bred' + W.gen + c.id, text: 'You bred ' + item.name + ' with a creature of this pond: six children of the two were born.', gen: W.gen });
    G.emit('bred', item, c);
    return n;
  };
  /** set a kept creature free in this pond: a small family of it, each a little different, to breed with what lives here */
  G.release = function (item) {
    const W = G.W;
    if (item.mv && G.addMarvelDef && W) { const nid = G.addMarvelDef(item.mv); if (nid && item.g && Array.isArray(item.g)) { item.g = item.g.slice(); item.g[8] = nid; } }      // its marvel becomes part of this pond
    const g0 = G.unpackGenome(item.g);
    if (!g0 || !W) return 0;
    // the kinds of part it carries become part of this pond, so they can spread by mutation too
    for (let i = 0; i < g0.f.rules.length; i++) { const q = g0.f.rules[i]; if (q.k === 8 && q.t >= 100000 && !W.designs.some(function (x) { return x.id === q.t; })) { const d = G.designOf(q.t); if (d && W.designs.length < 12) W.designs.push(JSON.parse(JSON.stringify(d))); } }
    const x = W.ww * (0.3 + G.rand() * 0.4), y = W.wh * (0.35 + G.rand() * 0.4);
    let n = 0;
    for (let i = 0; i < 8; i++) {
      const res = i ? G.mutate(G.cloneGenome(g0), 0.6, null) : { g: G.cloneGenome(g0), muts: [] };
      const c = G.makeCreature(res.g, null, null, res.muts);
      c.E = c.ph.Emax * 0.6; c.P = c.ph.Emax * 0.4;
      W.births.push({ at: W.st + 0.1 + G.rand() * 1.5, c: c, x: x + G.randn() * 60, y: y + G.randn() * 50, from: null }); n++;
    }
    W.discLog.push({ key: 'rel' + W.gen, text: 'You released ' + item.name + ' (' + item.kind + ') into the pond: eight of its kind, to breed with what lives here.', gen: W.gen });
    G.emit('released', item, x, y);
    return n;
  };

  /** Whatever was imagined becomes a fair, drawable part. */
  G.cleanDesign = function (raw) {
    if (!raw || typeof raw !== 'object') return null;
    const worn = raw.place === 'wrap';
    if (!worn && !Array.isArray(raw.pts)) return null;
    const res3 = function () { const n = function (v) { v = +v; return isFinite(v) ? clamp(v, 0, 0.35) : 0; }, rs = Array.isArray(raw.res) ? raw.res : raw.res && typeof raw.res === 'object' ? [raw.res.heat, raw.res.cold, raw.res.poison] : []; return [n(rs[0]), n(rs[1]), n(rs[2])]; };
    const hitsOf = function () { const h = typeof raw.hits === 'number' ? raw.hits : HITS.indexOf(String(raw.hits || '').toLowerCase().replace('armour', 'armor')); return h >= 0 && h < 5 ? h | 0 : -1; };
    const pts = [];
    if (worn) {
      const fw = raw.fx && typeof raw.fx === 'object' ? raw.fx : {}, fxw = {}; let cost = 0;
      for (let i = 0; i < 6; i++) { let v = +fw[ABIL[i]]; if (!isFinite(v)) v = 0; fxw[ABIL[i]] = clamp(v, -0.3, 0.3); if (v < 0) cost -= v; }
      if (cost < 0.05) fxw.speed = Math.min(fxw.speed, -0.08);                    // something worn always weighs a little
      const cv = Array.isArray(raw.cover) ? raw.cover : [0.45, 1]; let c0 = clamp(+cv[0] || 0, 0, 0.85), c1 = clamp(+cv[1] || 1, 0.15, 1); if (c1 - c0 < 0.14) c1 = Math.min(1, c0 + 0.2);
      const nm = String(raw.name || 'Wrap').replace(/[<>"]/g, '').trim().slice(0, 22) || 'Wrap';
      return { name: nm, adj: (String(raw.adj || '').replace(/[^A-Za-z\-]/g, '').slice(0, 16) || nm.split(' ').pop() + 'ed').replace(/^./, function (ch) { return ch.toUpperCase(); }), note: String(raw.note || '').replace(/[<>]/g, '').slice(0, 110), because: String(raw.because || '').replace(/[<>]/g, '').slice(0, 90),
        place: 'wrap', motion: 'still', colour: COLOURS.indexOf(raw.colour) >= 0 ? raw.colour : 'accent', style: STYLES.indexOf(raw.style) >= 0 ? raw.style : 'knit', cover: [c0, c1], trim: raw.trim ? 1 : 0, ribs: [], dots: [], fx: fxw, res: res3(), hits: hitsOf(), by: String(raw.by || raw.model || '').slice(0, 60) };
    }
    for (let i = 0; i < raw.pts.length && pts.length < 18; i++) { const p = raw.pts[i]; if (Array.isArray(p) && isFinite(+p[0]) && isFinite(+p[1])) pts.push([clamp(+p[0], 0, 1.1), clamp(+p[1], -0.6, 0.6)]); }
    if (pts.length < 3) return null;
    let far = 0, wide = 0; for (let i = 0; i < pts.length; i++) { far = Math.max(far, pts[i][0]); wide = Math.max(wide, Math.abs(pts[i][1])); }
    if (far < 0.35 || wide < 0.04) return null;                       // a dot or a hair is not a body part
    const ribs = [], dots = [];
    if (Array.isArray(raw.ribs)) for (let i = 0; i < raw.ribs.length && ribs.length < 6; i++) { const q = raw.ribs[i]; if (Array.isArray(q) && q.length >= 4 && q.every(function (v) { return isFinite(+v); })) ribs.push([clamp(+q[0], 0, 1.1), clamp(+q[1], -0.6, 0.6), clamp(+q[2], 0, 1.1), clamp(+q[3], -0.6, 0.6)]); }
    if (Array.isArray(raw.dots)) for (let i = 0; i < raw.dots.length && dots.length < 3; i++) { const q = raw.dots[i]; if (Array.isArray(q) && q.length >= 3 && q.every(function (v) { return isFinite(+v); })) dots.push([clamp(+q[0], 0, 1.1), clamp(+q[1], -0.6, 0.6), clamp(+q[2], 0.03, 0.16)]); }
    // nothing is free: what it gives is capped, and it always costs a little somewhere
    const f = raw.fx && typeof raw.fx === 'object' ? raw.fx : {}, fx = {};
    let pos = 0, neg = 0;
    for (let i = 0; i < 6; i++) { let v = +f[ABIL[i]]; if (!isFinite(v)) v = 0; v = clamp(v, -0.3, 0.5); fx[ABIL[i]] = v; if (v > 0) pos += v; else neg -= v; }
    if (pos < 0.1) return null;
    if (pos > 0.8) for (let i = 0; i < 6; i++) if (fx[ABIL[i]] > 0) fx[ABIL[i]] *= 0.8 / pos;
    if (neg < 0.05) { let worst = 0; for (let i = 1; i < 6; i++) if (fx[ABIL[i]] < fx[ABIL[worst]]) worst = i; fx[ABIL[worst]] = -0.08; }
    const name = String(raw.name || 'New part').replace(/[<>"]/g, '').trim().slice(0, 22) || 'New part';
    return {
      name: name, adj: (String(raw.adj || '').replace(/[^A-Za-z\-]/g, '').slice(0, 16) || name.split(' ').pop() + 'ed').replace(/^./, function (ch) { return ch.toUpperCase(); }),
      note: String(raw.note || '').replace(/[<>]/g, '').slice(0, 110), because: String(raw.because || '').replace(/[<>]/g, '').slice(0, 90), res: res3(), hits: hitsOf(),
      place: PLACES.indexOf(raw.place) >= 0 ? raw.place : 'sides', motion: MOTIONS.indexOf(raw.motion) >= 0 ? raw.motion : 'sway', colour: COLOURS.indexOf(raw.colour) >= 0 ? raw.colour : 'accent',
      pts: pts, smooth: raw.smooth !== false, ribs: ribs, dots: dots, fx: fx,
      by: String(raw.by || raw.model || '').slice(0, 60),
    };
  };

  G.addDesign = function (def, quiet) {
    const W = G.W, d = G.cleanDesign(def);
    if (!d) return null;
    if (W.designs.some(function (x) { return x.name.toLowerCase() === d.name.toLowerCase(); })) return null;
    if (W.designs.length >= MAX) {
      // make room: forget the oldest kind of part nobody grows
      const used = {};
      for (let i = 0; i < W.cre.length; i++) { const R = W.cre[i].g.f.rules; for (let j = 0; j < R.length; j++) if (R[j].k === 8) used[R[j].t] = 1; }
      let at = -1;
      for (let i = 0; i < W.designs.length; i++) if (!used[W.designs[i].id]) { at = i; break; }
      if (at < 0) return null;
      W.designs.splice(at, 1);
    }
    d.id = W.nextDesign++;
    d.gen = def.gen || W.gen;
    W.designs.push(d);
    if (!quiet) G.emit('design-new', d);
    return d;
  };

  // ── the pond's own imagination (no server needed): each is a starting shape, pulled about a little every time ──
  const OWN = [
    { name: 'Sweater', adj: 'Sweatered', note: 'A thick knitted coat round its middle: it keeps the cold out.', place: 'wrap', style: 'knit', cover: [0.45, 1], trim: 1, colour: 'accent', fx: { speed: -0.08 }, res: [0, 0.28, 0] },
    { name: 'Plate Vest', adj: 'Vested', note: 'A vest of hard plates over its belly.', place: 'wrap', style: 'plates', cover: [0.4, 0.95], trim: 0, colour: 'dark', fx: { armour: 0.28, speed: -0.12 }, hits: 'armor' },
    { name: 'Wing', adj: 'Winged', note: 'A broad wing: it glides and turns on a breath of current.', place: 'sides', motion: 'flap', colour: 'accent', pts: [[0, -0.12], [0.35, -0.42], [0.8, -0.5], [1, -0.3], [0.75, -0.12], [0.85, 0.05], [0.5, 0.02], [0.45, 0.2], [0, 0.12]], ribs: [[0, 0, 0.8, -0.45], [0, 0, 0.8, -0.1], [0, 0, 0.45, 0.15]], fx: { agility: 0.4, speed: 0.15, armour: -0.1 } },
    { name: 'Sail', adj: 'Sailed', note: 'A tall sail along the back: it rides the current and looks twice the size.', place: 'back', motion: 'sway', colour: 'accent', pts: [[0, -0.05], [0.15, -0.45], [0.4, -0.3], [0.5, -0.5], [0.7, -0.28], [0.85, -0.4], [1, 0], [0.85, 0.4], [0.7, 0.28], [0.5, 0.5], [0.4, 0.3], [0.15, 0.45], [0, 0.05]], smooth: false, ribs: [[0, 0, 1, 0], [0.15, -0.4, 0.15, 0.4], [0.5, -0.45, 0.5, 0.45], [0.85, -0.35, 0.85, 0.35]], fx: { speed: 0.18, armour: 0.08, agility: -0.15 } },
    { name: 'Antler', adj: 'Antlered', note: 'Branching antlers: for shoving rivals and for show.', place: 'head', motion: 'still', colour: 'pale', pts: [[0, -0.07], [0.3, -0.12], [0.4, -0.45], [0.5, -0.42], [0.47, -0.12], [0.7, -0.15], [0.85, -0.42], [0.94, -0.36], [0.82, -0.08], [1, 0], [0.8, 0.07], [0.45, 0.07], [0, 0.07]], smooth: false, fx: { attack: 0.35, armour: 0.1, speed: -0.12 } },
    { name: 'Lure', adj: 'Luring', note: 'A glowing bait on a stalk: food comes to it.', place: 'head', motion: 'sway', colour: 'body', pts: [[0, -0.04], [0.5, -0.1], [0.82, -0.06], [0.82, 0.06], [0.5, 0.02], [0, 0.04]], dots: [[0.92, 0, 0.14]], fx: { reach: 0.35, senses: 0.2, speed: -0.1 } },
    { name: 'Comb', adj: 'Combed', note: 'A comb of fine teeth that strains food out of the water.', place: 'sides', motion: 'pulse', colour: 'pale', pts: [[0, -0.1], [0.9, -0.14], [0.92, -0.04], [0.2, 0], [0.92, 0.04], [0.9, 0.14], [0, 0.1]], smooth: false, ribs: [[0.3, -0.11, 0.3, -0.45], [0.5, -0.12, 0.5, -0.5], [0.7, -0.13, 0.7, -0.45], [0.3, 0.11, 0.3, 0.45], [0.5, 0.12, 0.5, 0.5], [0.7, 0.13, 0.7, 0.45]], fx: { reach: 0.26, agility: -0.12 } },
    { name: 'Club', adj: 'Clubbed', note: 'A heavy knob on an arm: one swing settles an argument.', place: 'sides', motion: 'sway', colour: 'dark', pts: [[0, -0.07], [0.55, -0.08], [0.65, -0.3], [0.9, -0.34], [1.05, -0.1], [1.05, 0.1], [0.9, 0.34], [0.65, 0.3], [0.55, 0.08], [0, 0.07]], dots: [[0.85, -0.14, 0.05], [0.85, 0.14, 0.05]], fx: { attack: 0.45, speed: -0.15 } },
    { name: 'Fan', adj: 'Fanned', note: 'A wide fan it spreads in alarm, and to be admired.', place: 'sides', motion: 'bristle', colour: 'accent', pts: [[0, -0.05], [0.6, -0.55], [0.8, -0.38], [0.95, -0.42], [1, -0.15], [1.08, 0], [1, 0.15], [0.95, 0.42], [0.8, 0.38], [0.6, 0.55], [0, 0.05]], ribs: [[0, 0, 0.7, -0.45], [0, 0, 0.98, -0.25], [0, 0, 1.05, 0], [0, 0, 0.98, 0.25], [0, 0, 0.7, 0.45]], dots: [[0.72, 0, 0.09]], fx: { armour: 0.25, senses: 0.15, speed: -0.12 } },
    { name: 'Hook', adj: 'Hooked', note: 'A curved hook that catches and holds.', place: 'sides', motion: 'sway', colour: 'pale', pts: [[0, -0.09], [0.5, -0.16], [0.9, -0.05], [1, 0.25], [0.8, 0.5], [0.55, 0.42], [0.78, 0.28], [0.76, 0.12], [0.5, 0.04], [0, 0.09]], fx: { reach: 0.2, attack: 0.2, agility: -0.12 } },
    { name: 'Paddle', adj: 'Paddled', note: 'A broad paddle: slow strokes, strong push.', place: 'sides', motion: 'flap', colour: 'accent', pts: [[0, -0.06], [0.4, -0.08], [0.6, -0.34], [0.9, -0.38], [1.05, -0.15], [1.05, 0.15], [0.9, 0.38], [0.6, 0.34], [0.4, 0.08], [0, 0.06]], ribs: [[0.4, 0, 1, 0]], fx: { speed: 0.35, agility: 0.1, senses: -0.1 } },
    { name: 'Eye Stalk', adj: 'Stalk-Eyed', note: 'An extra eye on a long stalk: it sees round corners.', place: 'sides', motion: 'sway', colour: 'body', pts: [[0, -0.05], [0.7, -0.07], [0.7, 0.07], [0, 0.05]], dots: [[0.86, 0, 0.16], [0.9, 0, 0.07]], fx: { senses: 0.45, armour: -0.1 } },
    { name: 'Mane', adj: 'Maned', note: 'A shaggy mane down the back: warm, and it hides the neck from teeth.', place: 'back', motion: 'sway', colour: 'dark', pts: [[0, -0.1], [0.2, -0.5], [0.3, -0.2], [0.45, -0.52], [0.55, -0.2], [0.7, -0.45], [0.8, -0.15], [1, 0], [0.8, 0.15], [0.7, 0.45], [0.55, 0.2], [0.45, 0.52], [0.3, 0.2], [0.2, 0.5], [0, 0.1]], smooth: false, fx: { armour: 0.3, speed: -0.1 } },
    { name: 'Saw', adj: 'Saw-Nosed', note: 'A toothed blade: it slashes through shoals and shells.', place: 'head', motion: 'still', colour: 'pale', pts: [[0, -0.09], [0.2, -0.12], [0.26, -0.27], [0.36, -0.12], [0.46, -0.27], [0.56, -0.11], [0.66, -0.25], [0.76, -0.1], [1.05, 0], [0.76, 0.1], [0.66, 0.25], [0.56, 0.11], [0.46, 0.27], [0.36, 0.12], [0.26, 0.27], [0.2, 0.12], [0, 0.09]], smooth: false, fx: { attack: 0.4, reach: 0.15, agility: -0.15 } },
  ];
  const FIRST = ['', '', '', 'Great ', 'Twin ', 'Long ', 'Ragged ', 'Fine '];
  G.offlineDesign = function () {
    const r = G.rand, W = G.W;
    const have = W ? W.designs.map(function (d) { return d.name; }) : [];
    let pick = null;
    for (let t = 0; t < 8 && !pick; t++) { const c = OWN[Math.floor(r() * OWN.length)]; if (!have.some(function (n) { return n.indexOf(c.name) >= 0; })) pick = c; }
    if (!pick) return null;
    // the same idea never comes out the same twice: stretched, squeezed and nudged
    const sx = 0.85 + r() * 0.3, sy = 0.75 + r() * 0.6;
    const wob = function (p) { return [p[0] * sx + (p[0] > 0.05 ? (r() - 0.5) * 0.06 : 0), p[1] * sy + (p[0] > 0.05 ? (r() - 0.5) * 0.05 : 0)]; };
    const fx = {}; for (const k in pick.fx) fx[k] = pick.fx[k] * (0.75 + r() * 0.5);
    const pre = FIRST[Math.floor(r() * FIRST.length)];
    if (pick.place === 'wrap') return { name: pick.name, adj: pick.adj, note: pick.note, place: 'wrap', style: pick.style, cover: pick.cover.slice(), trim: pick.trim, colour: pick.colour, fx: fx, res: pick.res, hits: pick.hits, by: '' };
    return { name: pre + pick.name, adj: pick.adj, note: pick.note, place: pick.place, motion: pick.motion, colour: r() < 0.25 ? COLOURS[Math.floor(r() * 4)] : pick.colour,
      pts: pick.pts.map(wob), smooth: pick.smooth, ribs: (pick.ribs || []).map(function (q) { return [q[0] * sx, q[1] * sy, q[2] * sx, q[3] * sy]; }), dots: (pick.dots || []).map(function (q) { return [q[0] * sx, q[1] * sy, q[2]]; }), fx: fx, by: '' };
  };

  /** a plain animal wearing one kind of part, to show what it looks like */
  G.designDemo = function (d, hue) {
    const f = G.form.cell(hue === undefined ? 190 : hue);
    f.en = 2; f.es = 0.5; f.hue2 = 120;
    f.rules = [{ k: 8, a: 0, b: 0, e: 1, l: 1.3, w: 0.55, j: 2, g: d.place === 'head' ? -0.7 : 0.1, c: 0, t: d.id, p: 0.5, on: -1 }];
    return G.form.fix(f);
  };

  // every so often the pond is given one new kind of part to try
  let busy = false;
  G.designTick = function (gen) {
    const W = G.W;
    if (!W || W.title || gen < 6 || gen % 7 !== 3) return;
    const live = G.mode === 'play' && !G.catching && G.ai && G.ai.provider === 'server' && G.ai.available && G.ai.available();
    if (!live) { const d = G.offlineDesign(); if (d) G.addDesign(d); return; }
    if (busy || !G.ai.allow('design')) { if (!busy && W.designs.length < 2) { const d = G.offlineDesign(); if (d) G.addDesign(d); } return; }
    busy = true;
    // the AI is shown the pond: what was dropped in, what is killing, who lives here and how they were graded, which ideas caught on
    const info = G.worldBrief();
    info.admired = G.form.fashionText(W.fashion);
    info.have = W.designs.map(function (d) { return d.name; }).concat(['leg', 'fin', 'spike', 'tentacle', 'feeler', 'armour plate', 'frill', 'horn']);
    const own = function () { const o = G.offlineDesign(); if (o) G.addDesign(o); };
    G.ai.ask('design', info).then(function (raw) {
      const d = raw ? G.cleanDesign(raw) : null;
      if (G.W !== W) { busy = false; return; }
      if (!d) { busy = false; own(); return; }
      // it is drawn on the pond's commonest creature and looked at before it is let in
      d.id = 900000 + (gen % 1000); G.keptDesigns.push(d);
      const top = W.species.filter(function (s) { return !s.extinct && s.rep; }).sort(function (a, b) { return b.n - a.n; })[0];
      const demo = [G.designDemo(d, W.hue0)];
      if (top) { const f2 = G.form.clone(top.rep.f); if (f2.rules.length >= G.form.MAXR) f2.rules.pop(); f2.rules.push({ k: 8, a: 0, b: 0, e: 1, l: 1.2, w: 0.55, j: 2, g: 0.1, c: 0, t: d.id, p: 0.5, on: -1 }); demo.push(G.form.fix(f2)); }
      const done = function () { const at = G.keptDesigns.indexOf(d); if (at >= 0) G.keptDesigns.splice(at, 1); busy = false; };
      G.lookOver(demo, 'a new kind of body part called "' + d.name + '": ' + d.note).then(function (v) {
        done();
        if (G.W !== W) return;
        if (v && v.score < 0.42) { G.museNote(d.name, 'never let in: when drawn, the eye for beauty gave it ' + Math.round(v.score * 10) + '/10 (' + v.why + ')'); G.emit('idea-dropped', d.name, v); own(); return; }
        if (!G.addDesign(raw)) own();
      }, function () { done(); if (G.W === W) G.addDesign(raw); });
    }, function () { busy = false; });
  };
})();
