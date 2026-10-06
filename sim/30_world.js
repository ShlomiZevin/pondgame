// ── The pond: seasons are generations. Life, food, zones, selection, breeding. ──
(function () {
  'use strict';
  const K = G.K, clamp = G.clamp, NIN = G.NIN, NOUT = G.NOUT;
  const PH = [6, 16, 4, 6];                       // spring, summer, autumn, winter (seconds at 1x)
  const SEASON_NAMES = ['Spring', 'Summer', 'Autumn', 'Winter'];
  const SEASON_TEMP = [0.05, 0.22, -0.08, -0.62];
  const SEASON_FOOD = [1.7, 1.0, 0.8, 0.12];
  const PI2 = Math.PI * 2;
  Object.assign(G, { PH, SEASON_NAMES });

  // ── spatial grid (no allocation per step) ──
  function Grid(cs) { this.cs = cs; this.cw = 1; this.ch = 1; this.head = new Int32Array(1); this.next = new Int32Array(1); }
  Grid.prototype.build = function (arr, ww, wh) {
    const cs = this.cs, cw = Math.ceil(ww / cs) + 1, ch = Math.ceil(wh / cs) + 1;
    if (cw * ch !== this.head.length) this.head = new Int32Array(cw * ch);
    this.cw = cw; this.ch = ch;
    this.head.fill(-1);
    if (this.next.length < arr.length) this.next = new Int32Array(arr.length + 256);
    for (let i = 0; i < arr.length; i++) {
      const o = arr[i];
      const cx = clamp((o.x / cs) | 0, 0, cw - 1), cy = clamp((o.y / cs) | 0, 0, ch - 1);
      const k = cy * cw + cx;
      this.next[i] = this.head[k]; this.head[k] = i;
    }
  };

  const foodGrid = new Grid(64), creGrid = new Grid(64);
  let creIdx = new Map();

  /** a bigger pond holds more food */
  function foodCap(W) { return Math.round(K.foodMax * Math.max(1, W.ww * W.wh / 1.6e6)); }
  /** the shore is the top strip of the pond: land. Only what can breathe air may go there. */
  G.shoreY = function (W) { return W.wh * 0.16; };
  G.newWorld = function (opts) {
    opts = opts || {};
    const v = G.view;
    const W = G.W = {
      seed: opts.seed || (Date.now() % 1000000007),
      t: 0, gen: 1, season: 0, st: 0, step: 0,
      ww: v.ww, wh: v.wh,
      cre: [], food: [], zones: [], births: [],
      nextId: 1, nextZone: 1,
      hist: [], species: [], fossils: [], disc: {}, discLog: [],
      set: { temp: 0, light: 1, bloom: 1, mut: 1 },
      drought: 0, flood: null, extinct: false,
      stats: freshStats(),
      lastStats: freshStats(),
      lights: [],
      pool: [],
      frost: null,
      nextSp: 1,
      ticks: 0,
      ages: [], ageCand: null, kinds: [], fashion: null, fashionGen: 0, hue0: 0,
      organs: [], nextOrgan: 1, designs: [], nextDesign: 1, plans: [], nextPlan: 1, shelf: [], evShelf: [], history: [], deepAcc: 0, mods: [], events: [], story: [],
    };
    G.seed(W.seed);
    W.hue0 = G.rand() * 360;                 // every pond's first life has its own colour
    W.fashion = G.form.newFashion();         // and its own idea of beauty
    W.taste = G.form.newTaste();             // which it goes on learning from the eye that watches it
    // and its own water. o2: oxygen; murk: how fast light dies with depth; rich: how much food grows; warm: base temperature;
    // green: how much of the shallows' food is plain green algae; deep: the food that only the deep grows; hue: the colour of the water
    W.env = { mix: [G.rr(0.6, 1.5), G.rr(0.5, 1.5), G.rr(0.8, 1.4), G.rr(0.5, 1.5), G.rr(0.5, 1.5), G.rr(0.5, 1.5)], o2: G.rr(0.6, 1.25), murk: G.rand(), rich: G.rr(0.75, 1.35), warm: G.rr(-0.22, 0.22), green: G.rr(0.55, 0.9), deep: G.ri(3, 5), hue: G.rr(150, 235) };
    for (let i = 0; i < 5; i++) W.lights.push({ x: G.rr(0.1, 0.9), y: G.rr(0.1, 0.9), ph: G.rr(0, 6.28), sp: G.rr(0.02, 0.05), r: G.rr(190, 280), a: G.rr(0.7, 1.0) });
    G.initFood(W);
    return W;
  };

  function freshStats() {
    return { born: 0, mutated: 0, crossed: 0, starved: 0, selected: 0, eaten: 0, eaters: 0, intake: 0, killed: 0, structural: 0, snubbed: 0, fights: 0, gasp: 0, breaths: 0, slept: 0, protShort: 0 };
  }

  G.initFood = function (W) {
    for (let i = 0; i < 150; i++) G.spawnFood(W, null, null, null, true);
  };

  G.founderPond = function () {
    const W = G.W;
    // generation 1: a random population, all arriving in the first moments of Spring
    for (let i = 0; i < 44; i++) {
      const c = G.makeCreature(G.founder(), null, null);
      c.E = c.ph.Emax * 0.40;
      W.births.push({ at: G.rr(0.1, 3.5), c: c, x: W.ww * 0.5 + G.randn() * 160, y: W.wh * 0.5 + G.randn() * 110, from: null });
    }
    W.stats.founders = 44;
  };

  // ── creatures ──
  G.makeCreature = function (genome, parentA, parentB, muts) {
    const W = G.W;
    const ph = G.derive(genome);
    const c = {
      id: W.nextId++, g: genome, ph: ph,
      x: 0, y: 0, px: 0, py: 0, vx: 0, vy: 0, ang: G.rand() * PI2, pang: 0,
      E: ph.Emax * 0.3, fit: 0, age: 0, born: W.gen, off: 0, intake: 0,
      inp: new Float32Array(NIN), hv: new Float32Array(G.MAXH), out: new Float32Array(NOUT),
      dad: parentA ? parentA.snap : null, mate: parentB ? parentB.snap : null,
      muts: muts || [], mutAge: 0, sp: 0,
      tired: 0, asleep: false, P: 30,          // how worn out it is, whether it sleeps, and its store of protein
      flash: 0, eatFlash: 0, birthT: 0, squash: 0, look: 0, lookX: 0, lookY: 0,
      cool: 0, thrust: 0, doomed: false, doomAt: 0, best: false, colony: false, dead: false,
      tagB: ph.tag, glow: 0, mouth: 0, parentFlag: false, depth: 0, zoneHit: 0,
    };
    c.out[0] = 0.5;
    c.snap = null;
    // How nice to the eye and how whole it is. Where a watcher is at work, a newborn is taken to be like its parents as the watcher saw
    // them, moved a little by how its own genes differ from theirs; then the watcher looks at it and its marks are its own.
    if (genome.f.bd) {
      const FM = G.form, T = W.taste, mb = ph.charm, mw = ph.whole, A = parentA && parentA.eb !== undefined && parentA.g ? parentA : null, B = parentB && parentB.eb !== undefined && parentB.g ? parentB : A;
      const hit = W.eyeSeen ? W.eyeSeen[FM.key(genome.f)] : null;
      if (hit) { c.real = { b: hit.b, w: hit.w, why: hit.why || '', gen: W.gen }; c.eb = hit.b; c.ew = hit.w; c.st = 0; }
      else if (A && (W.eyeN || (W.eyeBank && W.eyeBank.length))) { c.eb = clamp((A.eb + B.eb) / 2 + 0.5 * (mb - (FM.beauty(A.g.f, T) + FM.beauty(B.g.f, T)) / 2), 0, 1); c.ew = clamp((A.ew + B.ew) / 2 + 0.5 * (mw - (FM.whole(A.g.f).v + FM.whole(B.g.f).v) / 2), 0, 1); c.st = Math.min(A.st || 0, B.st || 0) + 1; }
      else { c.eb = mb; c.ew = mw; c.st = 3; }
      // and it is held against the creatures the watcher has really looked at: the more it resembles some of them, the more their marks count
      if (!hit && W.eyeBank && W.eyeBank.length) { const fv = c.fv = G.features(genome); let sw = 0, sb = 0, sh = 0; for (let i = 0; i < W.eyeBank.length; i++) { const q = W.eyeBank[i], d = G.fdist(fv, q.fv), wt = Math.exp(-d * d); if (wt < 0.03) continue; sw += wt; sb += wt * q.b; sh += wt * q.w; } if (sw > 0.15) { const k = Math.min(0.85, sw / (sw + 0.6)); c.eb += k * (sb / sw - c.eb); c.ew += k * (sh / sw - c.ew); c.st = Math.min(c.st, 1); } }
      ph.charm = c.eb; ph.whole = c.ew;
    }
    return c;
  };
  G.snapOf = function (c, extra) {
    // light-weight record of a creature for family trees (does not keep the whole lineage alive)
    const d = c.dad ? (c.dad.depth || 0) + 1 : 0;
    let up = c.dad;
    if (d > 10 && up) { up = Object.assign({}, up); up.up = null; up.mate = null; }
    return { id: c.id, gen: c.born, g: c.g, up: up, mate: c.mate ? { id: c.mate.id, gen: c.mate.gen, g: c.mate.g } : null, muts: (c.muts || []).filter(function (m) { return m.big; }).map(function (m) { return m.text; }), depth: d, sp: c.sp };
  };

  G.lightAt = function (x, y) {
    const W = G.W, ww = W.ww, wh = W.wh;
    let s = 0.28;
    for (let i = 0; i < W.lights.length; i++) {
      const L = W.lights[i];
      const lx = (0.5 + 0.42 * Math.sin(W.t * L.sp + L.ph) + (L.x - 0.5) * 0.6) * ww;
      const ly = (0.5 + 0.40 * Math.cos(W.t * L.sp * 0.8 + L.ph * 1.7) + (L.y - 0.5) * 0.5) * wh;
      const dx = x - lx, dy = y - ly;
      const d2 = (dx * dx + dy * dy) / (L.r * L.r);
      if (d2 < 4) s += L.a * Math.exp(-d2 * 1.4);
    }
    for (let i = 0; i < W.zones.length; i++) {
      const z = W.zones[i];
      if (z.p.light) {
        const dx = x - z.x, dy = y - z.y, d = Math.sqrt(dx * dx + dy * dy);
        if (d < z.r * 1.5) s += z.p.light * z.k * Math.max(0, 1 - d / (z.r * 1.5));
      }
    }
    return s * W.set.light * (1.35 - (0.8 + 0.5 * (W.env ? W.env.murk : 0.5)) * clamp(x / ww, 0, 1)) * (W.mods.length ? Math.max(0.1, 1 + G.modSum('light')) : 1);
  };
  /** oxygen in the water here: less in the deep, less when it is hot, plenty in the air of the shore */
  G.o2At = function (x, y) {
    const W = G.W, e = W.env;
    if (y < W.wh * 0.16) return 1.4;
    return (e ? e.o2 : 1) * (1.15 - 0.5 * clamp(x / W.ww, 0, 1)) * (env.temp > 0.35 ? 0.85 : 1);
  };
  G.envText = function (W) {
    const e = (W || G.W).env; if (!e) return '';
    const names = ['', '', '', 'blue', 'violet', 'pink'];
    return [e.o2 < 0.8 ? 'thin on oxygen' : e.o2 > 1.08 ? 'rich in oxygen' : 'fair oxygen', e.murk > 0.66 ? 'murky' : e.murk < 0.33 ? 'clear' : 'hazy', e.rich > 1.15 ? 'fertile' : e.rich < 0.9 ? 'poor' : 'middling food', e.warm > 0.1 ? 'warm' : e.warm < -0.1 ? 'cool' : 'mild', names[e.deep] + ' food in the deep'].join(' · ');
  };
  /** 0 in the bright shallows (left) to 1 in the dark deep (right) */
  G.depthAt = function (x) { return clamp(x / G.W.ww, 0, 1); };
  G.lightPos = function (i) {
    const W = G.W, L = W.lights[i];
    return { x: (0.5 + 0.42 * Math.sin(W.t * L.sp + L.ph) + (L.x - 0.5) * 0.6) * W.ww, y: (0.5 + 0.40 * Math.cos(W.t * L.sp * 0.8 + L.ph * 1.7) + (L.y - 0.5) * 0.5) * W.wh, r: L.r, a: L.a };
  };

  G.tempAt = function (x, y) {
    const W = G.W;
    let t = W.set.temp + (W.env ? W.env.warm : 0) + SEASON_TEMP[W.season] + (W.drought > 0 ? 0.2 : 0) + (y < W.wh * 0.16 ? 0.08 : (y / W.wh - 0.5) * 0.3) + (W.mods.length ? G.modSum('temp') : 0);
    for (let i = 0; i < W.zones.length; i++) {
      const z = W.zones[i];
      if (z.p.heat) {
        const dx = x - z.x, dy = y - z.y, d = Math.sqrt(dx * dx + dy * dy);
        if (d < z.r) t += z.p.heat * z.k * (1 - d / z.r) * 1.6;
      }
    }
    return t;
  };

  G.spawnFood = function (W, x, y, tag, any) {
    if (W.food.length >= foodCap(W)) return null;
    if (x === null || x === undefined) {
      // light-dependent: try a few places and keep a bright one
      let bx = 0, by = 0, bl = -1;
      for (let i = 0; i < 3; i++) {
        const tx = G.rand() * W.ww, ty = G.shoreY(W) + G.rand() * (W.wh - G.shoreY(W)), l = any ? 1 : G.lightAt(tx, ty) * G.rand();
        if (l > bl) { bl = l; bx = tx; by = ty; }
      }
      x = bx; y = by;
    }
    if (tag === null || tag === undefined) {
      const r = G.rand();
      // the shallows grow green algae; the deep gets gold scraps and blue minerals
      // every colour of food grows, each in its own part of the pond and in this pond's own measure; the first cells live on green
      const m = W.env && W.env.mix ? W.env.mix : [1, 1, 1, 1, 1, 1], sh = x < W.ww * 0.55, young = W.gen < 14 ? 3.5 - W.gen * 0.18 : 1;
      const w = [m[0] * (sh ? 0.5 : 1.3), m[1] * (sh ? 1.0 : 0.3), m[2] * (sh ? 1.7 : 0.5) * young, m[3] * (sh ? 0.2 : 1.2), m[4] * (sh ? 0.3 : 1.0), m[5] * (sh ? 0.9 : 0.5)];
      let tot = 0; for (let i = 0; i < 6; i++) tot += w[i];
      let pick = r * tot; tag = 2; for (let i = 0; i < 6; i++) { pick -= w[i]; if (pick <= 0) { tag = i; break; } }
    }
    const f = { x: x, y: y, tag: tag, v: tag === 0 ? G.rr(16, 28) : tag === 2 ? G.rr(10, 20) : G.rr(10, 26), dead: false, ph: G.rand() * 6.28, born: 0 };
    W.food.push(f);
    return f;
  };

  // how much protein each colour of food carries: scraps are rich, plain algae is poor
  const PROT = [1.0, 0.6, 0.5, 0.8, 0.8, 0.8];

  // ── the simulation step ──
  const env = { temp: 0, foodMul: 1 };

  G.step = function (dt) {
    const W = G.W;
    if (!W) return;
    W.t += dt; W.st += dt; W.step++;
    // season changes
    while (W.st >= PH[W.season]) {
      W.st -= PH[W.season];
      endSeason();
    }
    if (W.season === 2 && W.st > 1.2 && (W.step % 20) === 0) markBest();
    spawnLoop(dt);
    foodGrid.build(W.food, W.ww, W.wh);
    creGrid.build(W.cre, W.ww, W.wh);
    zonesStep(dt);
    creaturesStep(dt);
    birthsStep(dt);
    foodStep(dt);
    cleanup();
    if (W.drought > 0) W.drought -= dt;
    if (W.mods.length && W.mods[0].until <= W.t) W.mods = W.mods.filter(function (m) { return m.until > W.t; });
    if (W.flood) { W.flood.t -= dt; if (W.flood.t <= 0) W.flood = null; }
    if (W.cre.length === 0 && W.births.length === 0 && !W.extinct && W.gen > 1) {
      W.extinct = true;
      G.emit('extinct');
    }
  };

  function spawnLoop(dt) {
    const W = G.W;
    const area = (W.ww * W.wh) / 1.6e6;
    let rate = K.foodRate * (W.env ? W.env.rich : 1) * area * SEASON_FOOD[W.season] * W.set.bloom * (W.drought > 0 ? 0.12 : 1) * (W.mods.length ? G.modMul('food') : 1);
    W.foodAcc = (W.foodAcc || 0) + rate * dt;
    const vz = G.vaultOf ? G.vaultOf(W) : null;
    while (W.foodAcc >= 1) {
      W.foodAcc -= 1;
      if (vz && G.rand() < vz.p.vault) { const a = G.rand() * PI2, d = Math.sqrt(G.rand()) * vz.r * 0.62; const f = G.spawnFood(W, vz.x + Math.cos(a) * d, vz.y + Math.sin(a) * d, G.rand() < 0.75 ? 2 : 0); if (f) { f.z = vz.id; f.locked = 1; vz.made++; } }
      else G.spawnFood(W);
    }
    // the deep is fed too, but not by light: scraps sink there from above
    W.deepAcc = (W.deepAcc || 0) + rate * 0.42 * dt;
    while (W.deepAcc >= 1) {
      W.deepAcc -= 1;
      const f = G.spawnFood(W, W.ww * (0.5 + 0.5 * G.rand()), G.shoreY(W) + G.rand() * (W.wh - G.shoreY(W)));
      // big prey of the deep: only jaws can take it
      if (f && W.gen > 12 && G.rand() < 0.3) { f.big = 1; f.v = 60; f.tag = 3; }
    }
    // plants grow on the shore, untouched until something can breathe air
    W.landAcc = (W.landAcc || 0) + K.foodRate * (W.ww * W.wh / 1.6e6) * 0.42 * dt;      // land plants do not care about the pond's seasons much
    while (W.landAcc >= 1) {
      W.landAcc -= 1;
      if ((W.landFood || 0) < 110) { const f = G.spawnFood(W, G.rand() * W.ww, 14 + G.rand() * (G.shoreY(W) - 28), G.rand() < 0.6 ? 1 : 5); if (f) { f.land = 1; f.v = 40 + G.rand() * 16; W.landFood = (W.landFood || 0) + 1; } }
    }
  }

  function foodStep(dt) {
    const W = G.W, f = W.food;
    const drift = 3.2;
    const fl = W.flood;
    for (let i = f.length - 1; i >= 0; i--) {
      const o = f[i];
      if (o.dead) { if (o.land && !o.gone) W.landFood = Math.max(0, (W.landFood || 0) - 1); o.gone = (o.gone || 0) + dt; if (o.gone > 0.35) { f[i] = f[f.length - 1]; f.pop(); } continue; }
      if (o.land) { o.born += dt; continue; }           // a plant stays where it grew
      o.x += Math.sin(W.t * 0.3 + o.ph) * drift * dt;
      o.y += Math.cos(W.t * 0.27 + o.ph * 1.3) * drift * dt;
      if (fl) { o.x += fl.fx * 0.5 * dt; o.y += fl.fy * 0.5 * dt; }
      if (o.x < 0) o.x += W.ww; else if (o.x > W.ww) o.x -= W.ww;
      if (o.y < 0) o.y += W.wh; else if (o.y > W.wh) o.y -= W.wh;
      o.born += dt;
      if (o.born > 75) o.dead = true;          // uneaten food dissolves, so one kind can never clog the pond
    }
  }

  function zonesStep(dt) {
    const W = G.W;
    for (let i = W.zones.length - 1; i >= 0; i--) {
      const z = W.zones[i];
      z.near = z._near | 0; z.hurtN = z._hurt | 0; z.atk = z._atk | 0; z._near = 0; z._hurt = 0; z._atk = 0;
      z.age += dt;
      const living = z.alive > 0.25;
      if (living) {
        // a living thing: it thrives in the light it likes, suffers in harsh water, and is worn down by grazing
        const lit = G.lightAt(z.x, z.y) - (z.p.light > 0.3 ? z.p.light * W.set.light * 0.6 : 0);
        const likes = z.p.light < -0.3 ? 0.9 - lit : lit - 0.5;
        const tmp = Math.abs(W.set.temp + [0.05, 0.22, -0.08, -0.62][W.season]);
        if (G.isBad(z)) z.health = Math.min(z.health + 0.006 * dt, 1.3);      // it mends: a few with the answer only scratch it, a pond full of them brings it down
        else z.health = clamp(z.health + (z.alive * likes * 0.03 - Math.max(0, tmp - 0.55) * 0.02) * dt, 0, 2);
        z.life = z.health > 0.02 ? Math.max(z.life, 30) : 0;
        let eaters = 0; for (let q = 0; q < W.zones.length; q++) if (W.zones[q].p.eats > 0.2 || W.zones[q].p.deadly > 0.2) eaters++;
        const canBud = z.p.eats > 0.2 || z.p.deadly > 0.2 ? eaters < 2 && W.cre.length > 60 : true;
        if (canBud && z.health > 1.5 && z.age > 20 && W.zones.length < 11 && G.rand() < (z.p.eats > 0.2 ? 0.012 : 0.05) * dt) budZone(z);
      } else if (!(z.p.vault > 0.2) && !G.isBad(z)) z.life -= dt;
      const fade = clamp(z.life / 18, 0, 1), grow = clamp(z.age / 3, 0.2, 1);
      z.k = fade * grow * (living ? clamp(0.35 + z.health * 0.65, 0.3, 1) : 1);
      z.r = z.r0 * (0.55 + 0.45 * grow) * (0.7 + 0.3 * fade) * (1 + (z.p.spread || 0) * clamp(z.age / 40, 0, 1) * 0.5) * (living ? 0.55 + 0.35 * z.health : 1);
      if (z.life <= 0) {
        W.zones.splice(i, 1);
        if (z.hit > 0.15) G.emit('zone-killed', z);
        G.emit('zone-gone', z); continue;
      }
      const p = z.p;
      if (z.bite > 0) z.bite -= dt * 2;
      if (z.full > 0) z.full -= dt;
      if (p.moves > 0.05) {
        // it wanders; a hungry one goes after the nearest creature it notices
        z.ma += (G.rand() - 0.5) * 1.4 * dt;
        if (p.eats > 0.2 && W.cre.length) {
          let b = null, bd = 320 * 320;
          for (let k = 0; k < 6; k++) { const o = W.cre[(G.rand() * W.cre.length) | 0]; const dx = o.x - z.x, dy = o.y - z.y, d2 = dx * dx + dy * dy; if (d2 < bd) { bd = d2; b = o; } }
          if (b) { const want = Math.atan2(b.y - z.y, b.x - z.x); let da = want - z.ma; while (da > Math.PI) da -= PI2; while (da < -Math.PI) da += PI2; z.ma += da * Math.min(1, 2 * dt); }
        }
        const sp = p.moves * 18;
        z.x += Math.cos(z.ma) * sp * dt; z.y += Math.sin(z.ma) * sp * dt;
        if (z.x < 50 || z.x > W.ww - 50) { z.ma = Math.PI - z.ma; z.x = clamp(z.x, 50, W.ww - 50); }
        if (z.y < 50 || z.y > W.wh - 50) { z.ma = -z.ma; z.y = clamp(z.y, 50, W.wh - 50); }
      }
      if (p.eats > 0.05) {
        // it swallows the food that drifts into its mouth
        const rr = z.r * 0.5;
        for (let j = 0; j < W.food.length; j++) {
          const o = W.food[j];
          if (o.dead || o.z === z.id) continue;
          const dx = o.x - z.x, dy = o.y - z.y;
          if (dx * dx + dy * dy < rr * rr && G.rand() < p.eats * dt * 1.5) { o.dead = true; z.bite = 1; if (z.alive > 0.25) z.health = Math.min(2, z.health + 0.01); else z.life += 0.4; }
        }
      }
      if (p.nut > 0.02) {
        z.acc += p.nut * 5 * z.k * dt;
        while (z.acc >= 1) {
          z.acc -= 1;
          const a = G.rand() * PI2, d = Math.sqrt(G.rand()) * z.r;
          const f = G.spawnFood(W, z.x + Math.cos(a) * d, z.y + Math.sin(a) * d, z.tag);
          if (f) { f.v *= 1.0 + p.nut * 0.3; f.z = z.id; z.made++; }
        }
      }
      if (p.vault > 0.2) {
        for (let j = 0; j < W.food.length; j++) {
          const o = W.food[j];
          if (o.z !== z.id || o.dead) continue;
          const dx = o.x - z.x, dy = o.y - z.y, d = Math.sqrt(dx * dx + dy * dy), lim = z.r * 0.66;
          if (d > lim) { o.x = z.x + dx / d * lim; o.y = z.y + dy / d * lim; }
        }
      }
      if (p.acid > 0.05 || p.hard > 0.3) {
        for (let j = 0; j < W.food.length; j++) {
          const o = W.food[j];
          const dx = o.x - z.x, dy = o.y - z.y, d2 = dx * dx + dy * dy;
          if (d2 < z.r * z.r) {
            if (p.acid > 0.05 && G.rand() < p.acid * dt * 0.9) o.dead = true;
            else if (p.hard > 0.3 && !(p.vault > 0.2)) { const d = Math.sqrt(d2) + 0.01; o.x = z.x + dx / d * (z.r + 2); o.y = z.y + dy / d * (z.r + 2); }
          }
        }
      }
      if (p.glow || p.light) { /* light is handled by lightAt */ }
    }
  }

  function zoneById(id) { const L = G.W.zones; for (let i = 0; i < L.length; i++) if (L[i].id === id) return L[i]; return null; }
  // a healthy living thing buds a new patch nearby: a copy of itself, a little changed
  function budZone(z) {
    const W = G.W, a = G.rand() * PI2, d = z.r * (1.5 + G.rand() * 0.8);
    const x = clamp(z.x + Math.cos(a) * d, 40, W.ww - 40), y = clamp(z.y + Math.sin(a) * d, 40, W.wh - 40);
    const p = z.p, q = {};
    if (z.p.vault > 0.2) return;
    const map = { nut: 'nutrition', poison: 'poison', heat: 'heat', light: 'light', sticky: 'sticky', acid: 'acid', hard: 'hard', spread: 'spread', eats: 'eats', moves: 'moves', pull: 'pull', deadly: 'deadly' };
    for (const k in map) {
      let v = p[k] || 0;
      if (v !== 0) v += G.randn() * 0.1; else if (G.rand() < 0.06) v = G.rand() * 0.3;
      q[map[k]] = k === 'heat' || k === 'light' || k === 'pull' ? clamp(v, -1, 1) : clamp(v, 0, 1);
    }
    const child = G.addZone(x, y, {
      name: z.word, props: q, tag: G.rand() < 0.06 ? G.ri(0, 5) : z.tag, radius: clamp(z.r0 + G.randn() * 8, 40, 150), life: z.life0 || 120,
      hue: (z.hue + G.randn() * 16 + 360) % 360, shape: z.shape, note: z.note, svg: z.svg, model: z.model,
      alive: clamp(z.alive + G.randn() * 0.05, 0.3, 1), genN: z.genN + 1, from: z.word, weak: z.weak, sig: z.sig,
    });
    child.health = 0.7;
    z.health -= 0.7; z.kids++;
    G.zoneEvent && G.zoneEvent(z, 'Budded a new patch');
    G.emit('zone-bud', child, z);
  }

  // ── creatures ──
  function digestOf(c, tag) { return c.g.c[tag]; }

  function creaturesStep(dt) {
    const W = G.W, cre = W.cre, ww = W.ww, wh = W.wh;
    const food = W.food;
    const season = W.season;
    const baseTemp = W.set.temp + SEASON_TEMP[season] + (W.drought > 0 ? 0.2 : 0);
    const fl = W.flood;
    const dmin = K.foodDigestMin;
    const cg = creGrid, fg = foodGrid;
    for (let ci = 0; ci < cre.length; ci++) {
      const c = cre[ci];
      if (c.dead) continue;
      const ph = c.ph, g = c.g;
      c.px = c.x; c.py = c.y; c.pang = c.ang;
      // doomed by selection
      if (c.doomed && W.st >= c.doomAt && season === 3) { kill(c, 'selected'); continue; }
      // ── senses + brain, every other step ──
      if (((W.step + c.id) & 1) === 0) {
        const range = c.asleep ? ph.sense * 0.4 : ph.sense;      // a sleeper notices little
        const cosA = Math.cos(c.ang), sinA = Math.sin(c.ang);
        let bf = 1e9, bfx = 0, bfy = 0, bp = 1e9, bpx = 0, bpy = 0, bt = 1e9, btx = 0, bty = 0;
        // food
        {
          const cx0 = clamp(((c.x - range) / 64) | 0, 0, fg.cw - 1), cx1 = clamp(((c.x + range) / 64) | 0, 0, fg.cw - 1);
          const cy0 = clamp(((c.y - range) / 64) | 0, 0, fg.ch - 1), cy1 = clamp(((c.y + range) / 64) | 0, 0, fg.ch - 1);
          const dig = ph.dig;
          for (let yy = cy0; yy <= cy1; yy++) for (let xx = cx0; xx <= cx1; xx++) {
            for (let j = fg.head[yy * fg.cw + xx]; j >= 0; j = fg.next[j]) {
              const o = food[j];
              if (o.dead || dig[o.tag] < dmin || (o.big && !ph.jaws) || (o.land && !ph.lungs)) continue;
              const dx = o.x - c.x, dy = o.y - c.y, d2 = dx * dx + dy * dy;
              if (d2 < bf && d2 < range * range) { bf = d2; bfx = dx; bfy = dy; }
            }
          }
        }
        // other creatures: prey, danger, kin
        let kin = 0, kinStick = 0;
        {
          const sr = range, cx0 = clamp(((c.x - sr) / 64) | 0, 0, cg.cw - 1), cx1 = clamp(((c.x + sr) / 64) | 0, 0, cg.cw - 1);
          const cy0 = clamp(((c.y - sr) / 64) | 0, 0, cg.ch - 1), cy1 = clamp(((c.y + sr) / 64) | 0, 0, cg.ch - 1);
          for (let yy = cy0; yy <= cy1; yy++) for (let xx = cx0; xx <= cx1; xx++) {
            for (let j = cg.head[yy * cg.cw + xx]; j >= 0; j = cg.next[j]) {
              const o = cre[j];
              if (o === c || o.dead) continue;
              const dx = o.x - c.x, dy = o.y - c.y, d2 = dx * dx + dy * dy;
              if (d2 > sr * sr) continue;
              if (d2 < 2500) {
                const sim = Math.abs(o.g.t[2] - g.t[2]) < 30 || Math.abs(Math.abs(o.g.t[2] - g.t[2]) - 360) < 30;
                if (sim && Math.abs(o.ph.r - ph.r) < ph.r * 0.35) { kin++; if (o.out[4] > 0.5 && d2 < 1600) kinStick++; }
              }
              if ((ph.r >= o.ph.r * 1.2 && ph.dig[o.ph.tag] >= dmin) || (ph.aggro > 0.38 && c.sp && o.sp && o.sp !== c.sp && ph.r >= o.ph.r * 0.75)) {
                if (d2 < bp) { bp = d2; bpx = dx; bpy = dy; }
              } else if (o.ph.r >= ph.r * 1.2 && o.ph.cnt[0] > 0) {
                if (d2 < bt) { bt = d2; btx = dx; bty = dy; }
              }
            }
          }
        }
        for (let zi = 0; zi < W.zones.length; zi++) {
          const z = W.zones[zi], zp = z.p;
          if (zp.eats < 0.2 && zp.poison < 0.3 && zp.acid < 0.3 && zp.deadly < 0.2) continue;
          const dx = z.x - c.x, dy = z.y - c.y, d = Math.sqrt(dx * dx + dy * dy) - z.r * 0.6;
          if (d < range && d * d < bt) { bt = Math.max(1, d * d); btx = dx; bty = dy; }
        }
        const inp = c.inp;
        inp[0] = 1;
        if (bf < 1e9) { const d = Math.sqrt(bf) + 0.001, pr = 1 - d / range; inp[1] = ((bfx * cosA + bfy * sinA) / d) * pr; inp[2] = ((-bfx * sinA + bfy * cosA) / d) * pr; c.lookX = bfx; c.lookY = bfy; c.look = 1; }
        else { inp[1] = 0; inp[2] = 0; c.look = 0; }
        if (bp < 1e9) { const d = Math.sqrt(bp) + 0.001, pr = 1 - d / range; inp[3] = ((bpx * cosA + bpy * sinA) / d) * pr; inp[4] = ((-bpx * sinA + bpy * cosA) / d) * pr; c.lookX = bpx; c.lookY = bpy; c.look = 2; }
        else { inp[3] = 0; inp[4] = 0; }
        if (bt < 1e9) { const d = Math.sqrt(bt) + 0.001, pr = 1 - d / (range * 0.9); const q = Math.max(pr, 0); inp[5] = ((btx * cosA + bty * sinA) / d) * q; inp[6] = ((-btx * sinA + bty * cosA) / d) * q; if (!c.look) { c.lookX = btx; c.lookY = bty; c.look = 3; } }
        else { inp[5] = 0; inp[6] = 0; }
        inp[7] = c.E / ph.Emax;
        inp[8] = clamp(G.tempAt(c.x, c.y), -1.5, 1.5);
        c.lit = G.lightAt(c.x, c.y);
        c.kin = kin;
        inp[9] = clamp(c.lit / 1.5, 0, 1.2);
        inp[10] = Math.min(kin, 6) / 3;
        inp[11] = Math.sin((W.t * 0.8 + c.id * 0.37) * 3.14159);
        G.think(c);
        c.colony = (c.out[4] > 0.5 && kinStick >= 2);
      }
      const out = c.out;
      // ── movement ──
      let thrust = out[0], sprint = out[2] > 0.6 ? 1 : 0;
      // rest: hard swimming wears a body out; a worn-out one sleeps where it is, eyes shut, until it has recovered.
      // fast bodies tire sooner, and a sprint costs most. A brain that paces itself sleeps less.
      if (c.asleep) { thrust = 0; sprint = 0; c.tired -= 0.085 * dt; if (c.tired <= 0.2) c.asleep = false; }
      else { c.tired = Math.max(0, c.tired + (thrust * (sprint ? 2.4 : 1) * 0.024 * (0.6 + c.g.t[1]) - (thrust < 0.25 ? 0.03 : 0.004)) * dt); if (c.tired >= 1) { c.asleep = true; W.stats.slept++; } }
      c.P *= 1 - 0.03 * dt;                     // protein is used up all the time: what counts is what it has eaten lately
      const turn = c.asleep ? 0 : out[1];
      c.ang += turn * ph.turn * dt;
      let sticky = 1;
      for (let i = 0; i < W.zones.length; i++) {
        const z = W.zones[i];
        if (z.p.sticky) {
          const dx = c.x - z.x, dy = c.y - z.y;
          if (dx * dx + dy * dy < z.r * z.r) sticky += z.p.sticky * 2.2 * z.k * (1 - ph.cnt[8] * 0.08);
        }
      }
      const sp = ph.speed * (sprint ? 1.7 : 1) * thrust / sticky * (c.colony ? 0.85 : 1) * (c.land ? (0.6 + 0.2 * Math.min(ph.limbs, 4)) * (ph.warm ? 1.3 : 1) : 1) * (season === 3 && !ph.warm ? 0.68 : 1);      // winter makes the cold-blooded sluggish
      const tx = Math.cos(c.ang) * sp, ty = Math.sin(c.ang) * sp;
      const k = Math.min(1, 2.6 * dt);
      c.vx += (tx - c.vx) * k; c.vy += (ty - c.vy) * k;
      // a little wobble keeps them alive
      c.vx += Math.sin(W.t * 1.7 + c.id) * 2.2 * dt; c.vy += Math.cos(W.t * 1.3 + c.id * 1.9) * 2.2 * dt;
      if (fl) { c.vx += fl.fx * 0.9 * dt; c.vy += fl.fy * 0.9 * dt; }
      // stick together
      if (c.colony) {
        // gentle pull towards the nearest kin that is also sticking, and energy sharing
        const cx0 = clamp(((c.x - 50) / 64) | 0, 0, cg.cw - 1), cx1 = clamp(((c.x + 50) / 64) | 0, 0, cg.cw - 1);
        const cy0 = clamp(((c.y - 50) / 64) | 0, 0, cg.ch - 1), cy1 = clamp(((c.y + 50) / 64) | 0, 0, cg.ch - 1);
        for (let yy = cy0; yy <= cy1; yy++) for (let xx = cx0; xx <= cx1; xx++) {
          for (let j = cg.head[yy * cg.cw + xx]; j >= 0; j = cg.next[j]) {
            const o = cre[j];
            if (o === c || o.dead || !o.colony) continue;
            const dx = o.x - c.x, dy = o.y - c.y, d2 = dx * dx + dy * dy;
            if (d2 < 2500 && d2 > 1) {
              const d = Math.sqrt(d2), want = (c.ph.r + o.ph.r) * 0.9;
              const pull = (d - want) * 1.2;
              c.vx += dx / d * pull * dt; c.vy += dy / d * pull * dt;
              const share = (o.E / o.ph.Emax - c.E / c.ph.Emax) * 0.6 * dt;
              c.E += share * c.ph.Emax * 0.5; o.E -= share * c.ph.Emax * 0.5;
            }
          }
        }
      }
      c.x += c.vx * dt; c.y += c.vy * dt;
      if (c.x < ph.r) { c.x = ph.r; c.vx = Math.abs(c.vx) * 0.5; c.ang = Math.PI - c.ang; }
      else if (c.x > ww - ph.r) { c.x = ww - ph.r; c.vx = -Math.abs(c.vx) * 0.5; c.ang = Math.PI - c.ang; }
      const top = ph.lungs ? ph.r : G.shoreY(W) + ph.r;
      if (c.y < top) { c.y = top; c.vy = Math.abs(c.vy) * 0.5; c.ang = -c.ang; }
      else if (c.y > wh - ph.r) { c.y = wh - ph.r; c.vy = -Math.abs(c.vy) * 0.5; c.ang = -c.ang; }
      c.land = c.y < G.shoreY(W);
      c.thrust = thrust * (sprint ? 1.7 : 1);
      c.squash = 0.82 * c.squash + 0.18 * clamp(Math.hypot(c.vx, c.vy) / (ph.speed + 1), 0, 1.4);
      c.glow = ph.lamp > 0 ? out[3] * Math.min(ph.lamp, 1.5) : 0;

      // ── energy ──
      const r10 = ph.r / 10;
      const o2need = Math.pow(r10, 1.1) * (0.35 + 0.45 * thrust), o2short = o2need - G.o2At(c.x, c.y) * ph.gill;
      W.stats.breaths++; if (o2short > 0) { c.gasp = o2short; W.stats.gasp++; } else c.gasp = 0;
      let cost = ph.upkeep * (c.asleep ? 0.6 : 1) + (o2short > 0 ? 0.22 * o2short * r10 : 0) + thrust * (sprint ? 1.6 : 0.30) * r10 * (1 - 0.2 * ph.flag) + (ph.lamp > 0 ? out[3] * 0.10 * ph.lamp : 0) + (out[4] > 0.5 ? 0.03 : 0);
      // temperature, zones
      const tmp = G.tempAt(c.x, c.y);
      c.hot = 0; c.chill = 0; c.pois = 0;
      if (c.startle > 0) c.startle -= dt;
      if (tmp > 0.35) { c.hot = Math.max(0, tmp - 0.35 - ph.res[0] * 0.7); cost += 3.2 * c.hot; }
      else if (tmp < -0.35) { c.chill = Math.max(0, -tmp - 0.35 - ph.res[1] * 0.7); cost += 2.6 * c.chill; }
      let zoneHit = 0;
      c.inZone = 0;
      for (let i = 0; i < W.zones.length; i++) {
        const z = W.zones[i], p = z.p;
        const dx = c.x - z.x, dy = c.y - z.y, d2 = dx * dx + dy * dy;
        if (p.pull && d2 > 4 && d2 < z.r * z.r * 3.2) {
          const d = Math.sqrt(d2), f = p.pull * z.k * 24 * dt * (1 - d / (z.r * 1.8));
          c.vx -= dx / d * f; c.vy -= dy / d * f;       // a positive pull draws creatures in; a negative one pushes them away
        }
        if (d2 > z.r * z.r * 1.2) continue;
        if (d2 < z.r * z.r) {
          z.vis += dt; c.inZone = z.id; z._near = (z._near | 0) + 1;
          // a bad thing can be worn down by creatures that carry what it is weak to, and they feed on it
          if (p.poison + p.acid + p.eats + p.deadly > 0.25 || p.vault > 0.2) {
            const pow = G.weakPower(c, z.weak);
            if (pow > 0.08) { const dmg = pow * 0.005 * dt; z.hit += dmg; z.struck = 1; c.strike = 0.5; z._atk = (z._atk | 0) + 1; c.zk = 3; c.zid = z.id; c.zt = W.t; if (z.alive > 0.25) z.health -= dmg; else z.life -= dmg * (p.vault > 0.2 ? 5 : 55); c.E = Math.min(ph.Emax, c.E + dmg * 260); c.intake += dmg * 260; c.P += dmg * 200; }
          }
        }
        if (p.deadly > 0.05 && d2 < z.r * z.r * 0.3 && !(z.full > 0) && cre.length > 20 && G.weakPower(c, z.weak) < 0.45) {
          if (G.rand() < p.deadly * (1 - 0.9 * G.tolOf(g, z)) * (1 - ph.defense * 0.4)) {
            z.full = 0.35; z.bite = 1; z.ate++; z.struckDead = 1;
            if (!z.deaths) G.zoneEvent && G.zoneEvent(z, 'It killed its first creature with a touch');
            z.deaths++;
            if (z.alive > 0.25) z.health = Math.min(2, z.health + 0.12); else z.life += 4;
            kill(c, 'slain');
            break;
          }
          c.flash = 1;       // it was touched and lived: that is tolerance at work
        }
        if (p.eats > 0.05 && d2 < z.r * z.r * 0.36) if (!(z.full > 0)) { const f = p.eats * z.k * 6 * (1 - ph.defense * 0.6) * (1 - 0.85 * G.tolOf(g, z)); cost += f; zoneHit = Math.max(zoneHit, f); z.hurt += f * dt; if (f > 0.12) { z._hurt = (z._hurt | 0) + 1; c.zk = 1; c.zid = z.id; c.zt = W.t; } z.bite = 1; }
        if (p.poison > 0.05 && d2 < z.r * z.r) { const f = p.poison * z.k * 4.5 * (1 - ph.res[2] * 0.8) * (1 - 0.85 * G.tolOf(g, z)); cost += f; c.pois = f; zoneHit = Math.max(zoneHit, f); z.hurt += f * dt; if (f > 0.12) { z._hurt = (z._hurt | 0) + 1; c.zk = 1; c.zid = z.id; c.zt = W.t; } }
        if (p.acid > 0.05 && d2 < z.r * z.r) { const f = p.acid * z.k * 4 * (1 - ph.defense * 0.7) * (1 - 0.85 * G.tolOf(g, z)); cost += f; zoneHit = Math.max(zoneHit, f); z.hurt += f * dt; if (f > 0.12) { z._hurt = (z._hurt | 0) + 1; c.zk = 1; c.zid = z.id; c.zt = W.t; } }
        if (p.hard > 0.3 && !(p.vault > 0.2 && G.weakPower(c, z.weak) > 0.45)) {
          const rr = z.r * 0.8 + ph.r;
          if (d2 < rr * rr) { const d = Math.sqrt(d2) + 0.01; c.x = z.x + dx / d * rr; c.y = z.y + dy / d * rr; c.vx *= 0.5; c.vy *= 0.5; }
        }
      }
      if (c.dead) continue;
      if (W.mods.length) { const gp = G.modSum('poison'); if (gp > 0.02) { const f = gp * 2.6 * (1 - ph.res[2] * 0.9); cost += f; c.pois = Math.max(c.pois, f); zoneHit = Math.max(zoneHit, f); } }
      c.zoneHit = zoneHit;
      c.E -= cost * dt;
      // feeding on light: best alone in a bright place (neighbours shade each other)
      if (ph.photo > 0) { const gain = ph.photo * (c.lit || 0) * 0.62 * r10 / (1 + 0.45 * (c.kin || 0)) * dt; c.E = Math.min(ph.Emax, c.E + gain); c.sun = (c.sun || 0) + gain; }
      if (c.E <= 0) { kill(c, 'starved'); continue; }

      // ── eating ──
      const er = ph.eatR + 3;
      {
        const cx0 = clamp(((c.x - er) / 64) | 0, 0, fg.cw - 1), cx1 = clamp(((c.x + er) / 64) | 0, 0, fg.cw - 1);
        const cy0 = clamp(((c.y - er) / 64) | 0, 0, fg.ch - 1), cy1 = clamp(((c.y + er) / 64) | 0, 0, fg.ch - 1);
        const dig = ph.dig;
        for (let yy = cy0; yy <= cy1; yy++) for (let xx = cx0; xx <= cx1; xx++) {
          for (let j = fg.head[yy * fg.cw + xx]; j >= 0; j = fg.next[j]) {
            const o = food[j];
            if (o.dead || dig[o.tag] < dmin || (o.big && !ph.jaws) || (o.land && !ph.lungs)) continue;
            const dx = o.x - c.x, dy = o.y - c.y;
            if (dx * dx + dy * dy < er * er && c.E < ph.Emax) {
              const gain = o.v * ph.forage[o.tag] * (o.land ? Math.max(0.7, dig[o.tag]) : dig[o.tag]) * (ph.nh >= 4 ? 1 + 0.08 * Math.min(c.kin || 0, 5) : 1) * (o.land ? (ph.warm ? 1.25 : 1) * (ph.hands ? 1.3 : 1) : 1);
              c.E = Math.min(ph.Emax, c.E + gain);
              c.intake += gain;
              c.P = Math.min(ph.Emax, c.P + gain * PROT[o.tag] * (o.big ? 1.5 : 1));
              o.dead = true;
              c.eatFlash = 1;
              W.stats.eaten++;
              if (o.z) { const zz = zoneById(o.z); if (zz) { if (!zz.fed) G.zoneEvent && G.zoneEvent(zz, 'The first creature ate from it'); zz.fed++; if (zz.alive > 0.25) zz.health = Math.max(0, zz.health - 0.006); } }
              G.emit('eat', c, o);
            }
          }
        }
      }
      // ── biting other creatures ──
      c.cool -= dt;
      if (c.cool <= 0 && ph.cnt[0] > 0) {
        const br = ph.eatR + 2;
        const cx0 = clamp(((c.x - br - 20) / 64) | 0, 0, cg.cw - 1), cx1 = clamp(((c.x + br + 20) / 64) | 0, 0, cg.cw - 1);
        const cy0 = clamp(((c.y - br - 20) / 64) | 0, 0, cg.ch - 1), cy1 = clamp(((c.y + br + 20) / 64) | 0, 0, cg.ch - 1);
        let did = false;
        for (let yy = cy0; yy <= cy1 && !did; yy++) for (let xx = cx0; xx <= cx1 && !did; xx++) {
          for (let j = cg.head[yy * cg.cw + xx]; j >= 0; j = cg.next[j]) {
            const o = cre[j];
            if (o === c || o.dead) continue;
            const hunt = ph.r >= o.ph.r * 1.2 && ph.dig[o.ph.tag] >= dmin;
            // a violent kind attacks other kinds, even ones it cannot swallow
            const fight = !hunt && ph.aggro > 0.38 && c.sp && o.sp && o.sp !== c.sp && ph.r >= o.ph.r * 0.75;
            if (!hunt && !fight) continue;
            const dx = o.x - c.x, dy = o.y - c.y, rr = br + o.ph.r * 0.5;
            if (fight && dx * dx + dy * dy < rr * rr) {
              c.cool = 1.4; did = true;
              c.E -= 3 * o.ph.spike;
              const dmg = (6 + 5 * Math.min(2, ph.spike) + 3 * Math.min(2, ph.cnt[0])) * ph.aggro * (1 - Math.min(0.9, o.ph.defense + (o.colony ? 0.15 : 0)) * 0.8) * Math.min(1.6, ph.r / o.ph.r);
              o.E -= dmg; c.E = Math.min(ph.Emax, c.E + dmg * 0.6);
              o.flash = 1; c.strike = 0.7; W.stats.fights++;
              if (c.sp) { const sp = G.speciesById(c.sp); if (sp) sp.attacks = (sp.attacks || 0) + 1; }
              G.emit('fight', c, o);
              if (o.E <= 0) { W.stats.killed++; kill(o, 'fought', c); }
              if (c.E <= 0) kill(c, 'starved');
              break;
            }
            if (dx * dx + dy * dy < rr * rr) {
              c.cool = 1.2; did = true;
              // spikes hurt the biter, armour helps the bitten
              c.E -= 4 * o.ph.spike;
              const def = o.ph.defense + (o.colony ? 0.15 : 0);
              if (G.rand() < 0.85 - def * 0.85) {
                const gain = (o.E * 0.55 + o.ph.r * 1.5) * ph.dig[o.ph.tag];
                c.E = Math.min(ph.Emax, c.E + gain - 9 * o.ph.gland);
                c.intake += gain;
                c.P = Math.min(ph.Emax, c.P + gain * 1.6);      // meat is the richest food there is
                c.eatFlash = 1;
                W.stats.killed++;
                W.stats.eaten++;
                if (c.sp) { const sp = G.speciesById(c.sp); if (sp) sp.kills = (sp.kills || 0) + 1; }
                kill(o, 'eaten', c);
              } else { o.flash = 1; }
              if (c.E <= 0) { kill(c, 'starved'); }
              break;
            }
          }
        }
      }
      // lamps lure algae
      if (c.glow > 0.5 && G.rand() < c.glow * 0.6 * dt && W.food.length < foodCap(W)) {
        const a = G.rand() * PI2, d = ph.r + 8 + G.rand() * 20;
        const f = G.spawnFood(W, c.x + Math.cos(a) * d, c.y + Math.sin(a) * d, 2);
        if (f) { f.v = 8; W.stats.farmed = (W.stats.farmed || 0) + 1; if (!W.disc.farmer && W.stats.farmed > 25) G.discover('farmer', 'Light farming! Glowing creatures grow their own algae.'); }
      }
      // soft contact so they do not stack on top of each other
      if (ph.r > 0 && ((W.step + c.id) & 3) === 0) {
        const cx0 = clamp(((c.x - ph.rc - 14) / 64) | 0, 0, cg.cw - 1), cx1 = clamp(((c.x + ph.rc + 14) / 64) | 0, 0, cg.cw - 1);
        const cy0 = clamp(((c.y - ph.rc - 14) / 64) | 0, 0, cg.ch - 1), cy1 = clamp(((c.y + ph.rc + 14) / 64) | 0, 0, cg.ch - 1);
        for (let yy = cy0; yy <= cy1; yy++) for (let xx = cx0; xx <= cx1; xx++) {
          for (let j = cg.head[yy * cg.cw + xx]; j >= 0; j = cg.next[j]) {
            const o = cre[j];
            if (o === c || o.dead) continue;
            const dx = o.x - c.x, dy = o.y - c.y, d2 = dx * dx + dy * dy, rr = (ph.rc + o.ph.rc) * 0.85;
            if (d2 < rr * rr && d2 > 0.01) {
              const d = Math.sqrt(d2), push = (rr - d) * 0.25;
              c.x -= dx / d * push; c.y -= dy / d * push;
              o.x += dx / d * push; o.y += dy / d * push;
              c.squash = Math.min(1.4, c.squash + 0.05);
            }
          }
        }
      }
      if (c.flash > 0) c.flash -= dt * 1.2;
      if (c.eatFlash > 0) c.eatFlash -= dt * 3;
      if (c.mutAge > 0) c.mutAge -= dt;
    }
  }

  function kill(c, cause, by) {
    if (c.dead) return;
    c.dead = true; c.cause = cause;
    const W = G.W;
    if (cause === 'starved') W.stats.starved++;
    else if (cause === 'selected') W.stats.selected++;
    if (c.inZone && cause === 'starved' && c.zoneHit > 0) { const zz = zoneById(c.inZone); if (zz) { if (!zz.deaths) G.zoneEvent && G.zoneEvent(zz, zz.p.eats > 0.05 ? 'It ate its first creature' : 'The first creature died in it'); zz.deaths++; if (zz.p.eats > 0.05) { zz.ate++; zz.full = 6; if (zz.alive > 0.25) zz.health = Math.min(2, zz.health + 0.22); else zz.life += 8; } } }
    G.emit('death', c, cause, by);
    // the body goes back into the pond as a little food, with its own chemistry tag
    if (cause !== 'eaten' && W.food.length < foodCap(W)) {
      const n = c.ph.r > 12 ? 3 : 2;
      for (let i = 0; i < n; i++) {
        const f = G.spawnFood(W, c.x + G.randn() * 10, c.y + G.randn() * 10, c.ph.tag);
        if (f) f.v = 6 + c.ph.r * 0.5;
      }
    }
  }
  G.kill = kill;

  function cleanup() {
    const W = G.W, cre = W.cre;
    let j = 0;
    for (let i = 0; i < cre.length; i++) {
      if (!cre[i].dead) cre[j++] = cre[i];
    }
    cre.length = j;
  }

  // ── breeding (Spring) ──
  function birthsStep(dt) {
    const W = G.W;
    if (!W.births.length) return;
    for (let i = W.births.length - 1; i >= 0; i--) {
      const b = W.births[i];
      if (W.season === 0 && W.st < b.at) continue;
      W.births.splice(i, 1);
      if (!b.c) continue;
      const c = b.c;
      c.x = b.x; c.y = b.y; c.px = c.x; c.py = c.y;
      c.x = clamp(c.x, 10, W.ww - 10); c.y = clamp(c.y, 10, W.wh - 10);
      const a = G.rand() * PI2;
      c.vx = Math.cos(a) * 16; c.vy = Math.sin(a) * 16; c.ang = a;
      c.birthT = 1; c.mutAge = c.muts.length ? 2.5 : 0;
      c.snap = G.snapOf(c);
      W.cre.push(c);
      W.stats.born++;
      if (c.muts.length) W.stats.mutated++;
      if (c.mate) W.stats.crossed++;
      G.emit('birth', c, b.from, b.mate);
      if (c.muts.some(function (m) { return m.big; })) { W.stats.structural++; G.emit('mutation', c); }
    }
  }

  function startSpring() {
    const W = G.W;
    W.gen++;
    W.lastStats = W.stats;
    W.stats = freshStats();
    W.frost = null;
    const surv = W.cre.slice();
    for (let i = 0; i < surv.length; i++) { surv[i].age++; surv[i].parentFlag = false; surv[i].doomed = false; }
    const cap = capNow();
    const wild = W.set.mut * (W.mods.length ? G.modMul('mutate') : 1);
    const plan = [];
    for (let i = 0; i < surv.length; i++) {
      const p = surv[i], Em = p.ph.Emax;
      const cost = K.repro * Em;
      let n = clamp(Math.floor((p.E - K.keep * Em) / cost), 0, 3);
      // a child is built from protein as well as energy; a parent short of it has fewer, or scrapes one together now and then
      const byP = Math.floor(p.P / (cost * p.ph.pneed));
      if (byP < n) { W.stats.protShort += n - byP; n = byP > 0 ? byP : (G.rand() < 0.25 ? 1 : 0); }
      if (n > 0) plan.push({ p: p, n: n });
    }
    {
      const shapes = {}, hues = [0, 0, 0, 0, 0, 0]; for (let i = 0; i < surv.length; i++) { const c = surv[i]; c.shp = G.shapeOf(c.g); shapes[c.shp] = (shapes[c.shp] || 0) + 1; c.hb = G.hueOf(c.g); hues[c.hb]++; }
      for (let i = 0; i < plan.length; i++) {
        const p = plan[i].p, ss = shapes[p.shp] / surv.length, hs = hues[p.hb] / surv.length;
        // being common costs a child, never the last one: a pond of one kind still breeds, it just does not crowd out what is new
        if (plan[i].n > 1 && ss > 0.3 && G.rand() < (ss - 0.3) * 1.5) plan[i].n--;
        if (plan[i].n > 1 && hs > 0.4 && G.rand() < (hs - 0.4) * 1.3) plan[i].n--;
        if ((ss < 0.1 || hs < 0.1) && plan[i].n > 0 && plan[i].n < 3 && p.E > p.ph.Emax * 0.25) plan[i].n++;
      }
    }
    // nobody wants the ugly ones: a creature much less charming than the rest finds no mate
    const beauty = function (c) { return 0.6 * G.charmOf(c) + 0.4 * clamp(c.E / c.ph.Emax, 0, 1); };
    if (surv.length >= 12) {
      const bs = surv.map(beauty).sort(function (a, b) { return a - b; });
      const median = bs[bs.length >> 1];
      // looks alone decide who is passed over: the whole finished body, all its parts together. The ugliest quarter find no mate and leave no children.
      const looks = surv.map(G.charmOf).sort(function (a, b) { return a - b; });
      const ugly = looks[Math.floor(looks.length * 0.33)], mid = looks[looks.length >> 1], nice = looks[Math.floor(looks.length * 0.67)];
      for (let i = 0; i < plan.length; i++) {
        const bq = beauty(plan[i].p), lk = G.charmOf(plan[i].p);
        if (lk <= ugly && lk < mid * 0.97) { W.stats.snubbed++; plan[i].n = G.rand() < 0.08 ? 1 : 0; plan[i].p.snub = true; }
        else { plan[i].p.snub = false; if (lk >= nice) { if (plan[i].n < 3 && plan[i].p.E > plan[i].p.ph.Emax * 0.3) plan[i].n++; } else if (plan[i].n > 1) plan[i].n = 1; }
      }
    }
    // too many for the pond: only the fittest parents may breed
    let total = surv.length;
    for (let i = 0; i < plan.length; i++) total += plan[i].n;
    const limit = cap * 1.25;
    if (total > limit) {
      plan.sort(function (a, b) { return b.p.fit - a.p.fit; });
      let room = Math.max(0, limit - surv.length);
      for (let i = 0; i < plan.length; i++) {
        const take = Math.min(plan[i].n, room);
        plan[i].n = take; room -= take;
      }
    }
    // idea pool from the AI interface (offline now, a server later)
    const idea = W.pool.length ? W.pool[Math.floor(G.rand() * W.pool.length)] : null;
    for (let i = 0; i < plan.length; i++) {
      const p = plan[i].p;
      if (plan[i].n > 0) { p.parentFlag = true; }
      for (let k = 0; k < plan[i].n; k++) {
        let genome, mate = null;
        // crossover with a close, compatible survivor
        const mateC = findMate(p, surv);
        if (mateC && G.rand() < 0.85) { genome = G.crossover(p.g, mateC.g); mate = mateC; }      // two parents whenever a mate is near; alone, it copies itself
        else genome = G.cloneGenome(p.g);
        { const sp0 = p.sp ? G.speciesById(p.sp) : null; G.form._fix = p.real && p.real.fix ? p.real.fix : sp0 && sp0.judge && sp0.judge.fix ? sp0.judge.fix : null;
          // what the watcher has lately said of the pond's creatures is advice for the whole pond, not only for the ones it happened to see
          if (!G.form._fix && W.advice && W.advice.length && G.rand() < 0.6) { const fvp = p.fv || (p.fv = G.features(p.g)); let best = null, bd = 2.2; for (let q = 0; q < W.advice.length; q++) { const a = W.advice[q]; if (W.gen - a.gen > 40 || !a.fv) continue; const dd = G.fdist(fvp, a.fv); if (dd < bd) { bd = dd; best = a; } } if (best) G.form._fix = best.fix; } }      // what the judge wished for its kind
        const res = G.mutate(genome, wild, idea);
        G.form._fix = null;
        const child = G.makeCreature(res.g, p, mate, res.muts);
        child.sp = p.sp;
        child.E = child.ph.Emax * K.repro * 0.95;
        child.P = child.ph.Emax * 0.12;
        p.P = Math.max(0, p.P - p.ph.Emax * K.repro * p.ph.pneed);
        p.E -= p.ph.Emax * K.repro;
        p.off++;
        child.mate = mate ? mate.snap || G.snapOf(mate) : null;
        if (!p.snap) p.snap = G.snapOf(p);
        child.dad = p.snap;
        const ang = G.rand() * PI2, d = p.ph.r + child.ph.r + 4;
        W.births.push({ at: 0.3 + G.rand() * 3.4, c: child, x: p.x + Math.cos(ang) * d, y: p.y + Math.sin(ang) * d, from: p, mate: mate });
      }
    }
    // the hall of fame: the best the watcher has really seen. A couple of children a spring are one of them crossed with a good survivor, so what once was
    // lovable is not lost to drift, to a sickness of the common kind or to a pressure that favoured something plainer
    if (W.hall && W.hall.length && surv.length >= 8 && W.cre.length < cap * 1.2) {
      const nh = G.rand() < 0.5 ? 2 : 1;
      for (let k = 0; k < nh; k++) {
        const h = W.hall[(G.rand() * W.hall.length) | 0]; let p = null;
        { let bs = -1e9; for (let t = 0; t < 10; t++) { const o = surv[(G.rand() * surv.length) | 0], fo = o.fv || (o.fv = G.features(o.g)), sc = G.charmOf(o) - 0.35 * G.fdist(fo, h.fv); if (sc > bs) { bs = sc; p = o; } } }
        if (!p || !h) continue;
        const res = G.mutate(G.crossover(h.g, p.g), wild * 0.6, null);
        const child = G.makeCreature(res.g, p, null, res.muts);
        child.sp = p.sp; child.E = child.ph.Emax * K.repro * 0.95; child.P = child.ph.Emax * 0.12;
        if (!p.snap) p.snap = G.snapOf(p);
        child.dad = p.snap; child.mate = { id: 0, gen: h.gen, g: h.g };
        const ang = G.rand() * PI2, d = p.ph.r + child.ph.r + 4;
        W.births.push({ at: 0.3 + G.rand() * 3.4, c: child, x: p.x + Math.cos(ang) * d, y: p.y + Math.sin(ang) * d, from: p, mate: null });
      }
    }
    G.emit('spring', plan.length);
  }

  /** how attractive a creature is: its own body's charm, and what the judge made of its kind */
  /** the look of a creature, as a hunter or a mate would tell it apart: its kind of body, its coat and its colour */
  G.shapeOf = function (g) { const f = g.f, set = {}; for (let i = 0; i < f.rules.length; i++) { const q = f.rules[i]; if (q.on < 0) set[q.k === 8 ? 'd' + q.t : q.k] = 1; } return (f.bd ? G.body.measure(f).key : f.sym ? 'star' : f.n >= 6 ? 'long' : f.n >= 3 ? 'mid' : 'short') + ':' + Object.keys(set).sort().join(',') + ':' + f.coat; };
  G.hueOf = function (g) { return Math.floor((((g.f.hue % 360) + 360) % 360) / 60); };      // one of six broad colours
  G.lookOf = function (c) { return G.shapeOf(c.g) + '|' + G.hueOf(c.g); };
  G.charmOf = function (c) {
    const s = c.sp ? G.speciesById(c.sp) : null;
    // the grade the eye for beauty gave its kind is most of it; its own body's fit to the pond's taste is the rest. What the player kept is loved outright.
    // a grade counts for what it is next to the other grades in this pond: so a generous judge and a strict one select alike
    let v = 0.5 * c.ph.charm + 0.5 * (c.ph.whole === undefined ? 0.3 : c.ph.whole);
    // a guess is not a look: where the watcher has really seen creatures, one nobody has looked at is held back towards what the watcher really said of this pond.
    // Selecting the highest guesses every generation would pile up error (the winner's curse); this keeps belief close to the truth.
    const W1 = G.W;
    if (!c.real && W1 && W1.eyeBank && W1.eyeBank.length >= 6) {
      if (W1._emGen !== W1.gen) { let t = 0; for (let i = 0; i < W1.eyeBank.length; i++) t += (W1.eyeBank[i].b + W1.eyeBank[i].w) / 2; W1._em = t / W1.eyeBank.length; W1._emGen = W1.gen; }
      const k = clamp(0.3 + 0.12 * (c.st === undefined ? 3 : c.st), 0.3, 0.75);
      v = W1._em + (v - W1._em) * (1 - k);
    }
    return s && s.loved ? Math.max(v, 0.92) : v;
  };

  function findMate(p, surv) {
    if (surv.length < 2) return null;
    let best = null, bd2 = -1;
    for (let t = 0; t < 8; t++) {
      const o = surv[(G.rand() * surv.length) | 0];
      if (o === p) continue;
      const dx = o.x - p.x, dy = o.y - p.y, d2 = dx * dx + dy * dy;
      if (d2 < 220 * 220) {
        if (!p.fv) p.fv = G.features(p.g);
        if (!o.fv) o.fv = G.features(o.g);
        // of the compatible ones nearby, the most charming and healthy is chosen
        if (G.fdist(p.fv, o.fv) < 1.7) { const b = 2.2 * G.charmOf(o) + 0.3 * clamp(o.E / o.ph.Emax, 0, 1) + (G.kindOf(o.g).kind === G.kindOf(p.g).kind ? 1 : 0) + (Math.abs(((o.g.f.hue - p.g.f.hue + 540) % 360) - 180) < 35 ? 0.6 : 0); if (!best || b > bd2) { best = o; bd2 = b; } }
      }
    }
    return best;
  }

  function capNow() {
    const W = G.W;
    let rc = 0;
    for (let i = 0; i < W.cre.length; i++) rc += W.cre[i].ph.r * (0.55 + 0.45 * W.cre[i].ph.reach);
    const crowd = clamp((W.cre.length ? rc / W.cre.length : 11) / 14, 1, 2.4);
    return clamp(Math.round(K.capBase * (W.ww * W.wh) / 1.6e6 / crowd), 50, 115);
  }
  G.capNow = capNow;

  function markBest() {
    const cre = G.W.cre;
    if (cre.length < 5) return;
    const sorted = cre.slice().sort(function (a, b) { return b.E / b.ph.Emax - a.E / a.ph.Emax; });
    const nb = Math.max(1, Math.round(sorted.length * 0.1));
    for (let i = 0; i < sorted.length; i++) sorted[i].best = i < nb;
  }
  function startAutumn() { G.emit('autumn'); }

  function endAutumn() {
    // the score: how much energy each creature has stored
    const W = G.W, cre = W.cre;
    let sum = 0, best = 0, bestC = null, genes = 0, intake = 0;
    for (let i = 0; i < cre.length; i++) {
      const c = cre[i];
      c.fed = clamp(c.E / c.ph.Emax, 0, 1);
      c.fit = clamp(c.fed / 0.5, 0, 1) * (0.15 + 0.85 * G.charmOf(c));          // fed well enough (half a tank is plenty), times how nice to the eye and how whole it is
      sum += c.fit; genes += c.g.f.n + c.g.f.rules.length + c.g.p.length + c.g.w.length + c.g.h;
      intake += c.intake;
      if (c.fit > best) { best = c.fit; bestC = c; }
      c.best = false;
    }
    const sorted = cre.slice().sort(function (a, b) { return b.fit - a.fit; });
    const nb = Math.max(1, Math.round(sorted.length * 0.1));
    for (let i = 0; i < nb && i < sorted.length; i++) sorted[i].best = true;
    const n = cre.length || 1;
    let looksSum = 0, looksTop = 0, wholeSum = 0, wholeTop = 0; for (let i = 0; i < cre.length; i++) { const v = cre[i].ph.charm, wv = cre[i].ph.whole || 0; looksSum += v; if (v > looksTop) looksTop = v; wholeSum += wv; if (wv > wholeTop) wholeTop = wv; }
    W.hist.push({ gen: W.gen, avg: sum / n, best: best, pop: cre.length, genes: genes / n, intake: intake / n, species: 0, look: looksSum / n, lookTop: looksTop, whole: wholeSum / n, wholeTop: wholeTop });
    if (W.hist.length > 600) W.hist.shift();
    G.updateSpecies();
    G.scanDiscoveries();
    if (G.measurePressures) G.measurePressures();
    if (G.organTick) G.organTick(W.gen);
    if (G.designTick) G.designTick(W.gen);
    if (G.planTick) G.planTick(W.gen);
    if (G.storyTick) G.storyTick(W.gen);
    if (G.eraTick) G.eraTick(W.gen);
    if (G.fashionTick) G.fashionTick(W.gen);
    if (G.natureTick) G.natureTick(W.gen);
    if (G.judgeTick) G.judgeTick(W.gen);
    if (G.paintTick) G.paintTick(W.gen);
    W.hist[W.hist.length - 1].species = W.species.filter(function (s) { return !s.extinct; }).length;
    G.emit('scored', W.hist[W.hist.length - 1]);
  }

  function startWinter() {
    // selection: the weakest fade, and the pond only holds so many
    const W = G.W, cre = W.cre;
    const cap = capNow();
    // what is common is hunted, crowded and sickened first: a rare kind of body has room. So several kinds live side by side.
    const share = {}, shapes = {}, hues = [0, 0, 0, 0, 0, 0];
    for (let i = 0; i < cre.length; i++) { const c = cre[i], k = G.kindOf(c.g).kind; c.kd = k; share[k] = (share[k] || 0) + 1; c.shp = G.shapeOf(c.g); shapes[c.shp] = (shapes[c.shp] || 0) + 1; c.hb = G.hueOf(c.g); hues[c.hb]++; }
    // who lasts the winter: the well fed, the rare, and the good-looking (the pond is kind to what is admired)
    for (let i = 0; i < cre.length; i++) cre[i].sel = cre[i].fit * (1.2 - 0.6 * shapes[cre[i].shp] / cre.length - 0.55 * hues[cre[i].hb] / cre.length) ;
    let topK = '', topN = 0; for (const k in share) if (share[k] > topN) { topN = share[k]; topK = k; }
    const crowd = topN / Math.max(1, cre.length);
    let sick = 0;
    { const ap = cre.map(G.charmOf).sort(function (a, b) { return b - a; }), cut = ap[Math.floor(ap.length * 0.15)] || 1; for (let i = 0; i < cre.length; i++) { cre[i].elite = cre.length >= 12 && G.charmOf(cre[i]) >= cut && cre[i].fed > 0.2; if (cre[i].elite) cre[i].sel += 1; } }
    if (crowd > 0.5 && cre.length > 30) { const pr = (crowd - 0.5) * 0.9; for (let i = 0; i < cre.length; i++) if (cre[i].kd === topK && !cre[i].elite && G.rand() < pr) { cre[i].sel = -1; cre[i].sick = true; sick++; } }
    if (sick > 4 && (W.gen - (W.sickGen || 0)) > 6) { W.sickGen = W.gen; W.discLog.push({ key: 'sick' + W.gen, text: 'A sickness is going round the ' + topK.toLowerCase() + 's: there are so many of them (' + Math.round(crowd * 100) + '% of the pond) that it spreads easily. ' + sick + ' will not see spring. The rarer kinds are hardly touched.', gen: W.gen }); G.emit('sickness', topK, sick, crowd); }
    const sorted = cre.slice().sort(function (a, b) { return a.sel - b.sel; });
    const room = Math.round(cap * 0.8);
    let doom = [];
    for (let i = 0; i < sorted.length; i++) {
      const c = sorted[i];
      let die = c.fit < 0.10 || c.sick === true;
      if (!die && c.age >= K.maxAge) die = G.rand() < 0.45 * (c.age - K.maxAge + 1);
      if (!die && G.rand() < 0.04) die = true;      // bad luck happens
      if (die) doom.push(c);
    }
    let left = sorted.length - doom.length;
    for (let i = 0; i < sorted.length && left > room; i++) {
      const c = sorted[i];
      if (!c.doomed && doom.indexOf(c) < 0) { doom.push(c); left--; }
    }
    doom.sort(function (a, b) { return a.fit - b.fit; });
    for (let i = 0; i < doom.length; i++) {
      doom[i].doomed = true;
      doom[i].doomAt = 0.4 + (i / Math.max(1, doom.length)) * 3.2;
    }
    W.frost = { n: doom.length, cut: doom.length ? doom[doom.length - 1].fit : 0 };
    G.emit('winter', doom.length);
  }

  function endSeason() {
    const W = G.W;
    const s = W.season;
    if (s === 3) {
      // a doomed creature that has not faded yet leaves now
      for (let i = 0; i < W.cre.length; i++) if (W.cre[i].doomed) kill(W.cre[i], 'selected');
      cleanup();
    }
    if (s === 2) endAutumn();
    W.season = (s + 1) & 3;
    if (W.season === 0) startSpring();
    else if (W.season === 2) startAutumn();
    else if (W.season === 3) startWinter();
    G.emit('season', W.season, W.gen);
  }

  // ── discoveries: the first time evolution invents something that actually takes hold ──
  const DISC = {
    grow0: 'First legs! Something can crawl and grab.', grow1: 'First fins! Something learned to paddle.', grow2: 'First spikes! A prickly new defence.', grow3: 'First tentacles! Long arms that reach and feel.',
    grow4: 'First feelers! Glowing tips that sense the water.', grow5: 'First armour plates!', grow6: 'First frills! A fan to show off.', grow7: 'First horns!',
    eye: 'First eye! Something can really see.', eyes3: 'Three eyes or more! Something sees all around.', mouth1: 'First beak!', mouth2: 'First jaws! Teeth, and the big prey of the deep to use them on.', mouth3: 'First sucker mouth!', mouth4: 'First whiskers!',
    tail: 'First tail! A body built to swim.', pair: 'A matching pair! One part of the body doubled, one on each side.', ring: 'A ring! A part of the body opened into a hollow.', lobes: 'Lobes! An outline that swells and dips all the way round.', stalk: 'A stalk! A part of the body held out away from the rest.', sideways: 'Sideways on! A body with a front and a back.', faceaway: 'A head! The face moved onto a part of its own.', seg2: 'More than one part! A second mass budded from the body.', seg5: 'A body of five parts.', seg8: 'A very long body: eight segments.', seg11: 'A giant: a body of eleven segments.', coat1: 'Scales! A coat of small hard plates.', coat2: 'Fur! A warm coat.', coat3: 'Feathers!', neck: 'A neck! A head set apart from the body.', bighead: 'A big head!', nested: 'A part growing on a part! Something like a hand on an arm.', star: 'A new body plan! A star, with arms all around.',
    shell: 'First shell!', crest: 'First crest!', glow: 'First glow! A creature that makes its own light.', venom: 'First poison glands!', pattern: 'First markings! Skin with a pattern.',
    walker: 'Walkers! Two pairs of legs: they can climb onto the shore.', hands: 'Hands! Fingers at the front of the body.', biter: 'A real bite: jaws strong enough for big prey.',
    hidden: 'First thought! A brain grew a hidden cell.', hidden3: 'A bigger brain: three hidden cells.',
    photo: 'Light-eaters! Some creatures now live on sunlight, like plants.',
    giant: 'First giant! A much bigger creature.', tiny: 'First speck! A very tiny creature.',
    diet0: 'A new diet! Something thrives on gold food.', diet1: 'A new diet! Something thrives on lime food.', diet3: 'A new diet! Something thrives on blue food.',
    diet4: 'A new diet! Something thrives on violet food.', diet5: 'A new diet! Something thrives on pink food.',
    heat: 'Heat-proof! A creature that can take the warm.', cold: 'Cold-proof! A creature that shrugs off winter.', tox: 'Poison-proof! A creature that can swim through poison.',
    stick: 'Stickiness! Creatures learned to cling to their kin.', sprint: 'A sprint! Creatures can burst forward.', flee: 'First escape! Creatures learned to turn away from danger.',
  };
  G.discover = function (key, text) {
    const W = G.W;
    if (W.disc[key]) return;
    W.disc[key] = W.gen;
    W.discLog.push({ key: key, text: text, gen: W.gen });
    G.emit('discovery', key, text);
  };
  // run at the end of Autumn: a trait counts as discovered once a few living creatures carry it
  G.scanDiscoveries = function () {
    const W = G.W, cre = W.cre, need = Math.max(5, Math.round(cre.length * 0.08));      // taken hold: carried by a real share of the pond, not by one lucky family
    const cnt = {};
    const inc = function (k) { cnt[k] = (cnt[k] || 0) + 1; };
    for (let i = 0; i < cre.length; i++) {
      const g = cre[i].g, seen = {};
      for (let j = 0; j < g.p.length; j++) { const k = g.p[j].k; if (!seen[k]) { seen[k] = 1; inc('organ' + k); } }
      if (cre[i].ph.photo > 0.3) inc('photo');
      const f = g.f, ph = cre[i].ph;
      for (let j = 0; j < f.rules.length; j++) { const k = f.rules[j].k; if (k === 8) { const dk = 'dsg' + f.rules[j].t; if (!seen[dk]) { seen[dk] = 1; inc(dk); } continue; } if (!seen['r' + k]) { seen['r' + k] = 1; inc('grow' + k); } }
      if (f.en >= 1) inc('eye'); if (f.en >= 3) inc('eyes3'); if (f.mk) inc('mouth' + f.mk); if (f.tk && f.n > 1 && !f.sym) inc('tail');
      if (f.n >= 2) inc('seg2'); if (f.n >= 5) inc('seg5'); if (f.n >= 8) inc('seg8'); if (f.n >= 11) inc('seg11');
      if (f.pl) inc('plan' + f.pl);
      if (f.bd) { const bm = G.body.measure(f); if (bm.pairs) inc('pair'); if (bm.hollow) inc('ring'); if (bm.lobed) inc('lobes'); if (bm.stalks) inc('stalk'); if (f.bd.v) inc('sideways'); if (f.bd.e) inc('faceaway'); }
      if (f.coat) inc('coat' + f.coat); if (f.nk > 0.35 && f.n > 1 && !f.sym) inc('neck'); if (f.hd > 1.45) inc('bighead'); if (f.rules.some(function (q) { return q.on >= 0; })) inc('nested'); if (f.sym) inc('star');
      if (f.shell > 0.25) inc('shell'); if (f.crest > 0.25) inc('crest'); if (f.glow > 0.3) inc('glow'); if (f.venom > 0.3) inc('venom'); if (f.pat) inc('pattern');
      if (ph.lungs) inc('walker'); if (ph.hands) inc('hands'); if (ph.jaws) inc('biter');
      if (g.h >= 1) inc('hidden');
      if (g.h >= 3) inc('hidden3');
      if (g.t[0] >= 15) inc('giant');
      if (g.t[0] <= 6.5) inc('tiny');
      if (g.c[0] >= 0.75) inc('diet0');
      if (g.c[1] >= 0.5) inc('diet1');
      for (let j = 3; j < 6; j++) if (g.c[j] >= 0.5) inc('diet' + j);
      if (g.c[6] >= 0.6) inc('heat');
      if (g.c[7] >= 0.6) inc('cold');
      if (g.c[8] >= 0.6) inc('tox');
      for (let j = 0; j < g.w.length; j++) {
        const w = g.w[j];
        if (w.t === 204 && w.v > 0.5) inc('stick');
        if (w.t === 202 && w.v > 0.5) inc('sprint');
        if ((w.f === 5 || w.f === 6) && w.t === 201 && Math.abs(w.v) > 0.4) inc('flee');
      }
    }
    for (const k in cnt) {
      if (cnt[k] < need) continue;
      if (W.disc[k]) continue;
      const why = G.why ? G.why(k) : '';
      if (DISC[k]) G.discover(k, DISC[k] + (why ? ' ' + why : ''));
      else if (k.indexOf('plan') === 0 && G.planOf) { const p = G.planOf(+k.slice(4)); if (p) G.discover(k, 'A new shape of body took hold: the ' + p.name + '! ' + p.note + (p.because ? ' It was imagined because of this: ' + p.because + '.' : '') + (why ? ' ' + why : '')); }
      else if (k.indexOf('dsg') === 0 && G.designOf) { const d = G.designOf(+k.slice(3)); if (d) G.discover(k, 'A new kind of body part took hold: the ' + d.name + '! ' + d.note + (d.because ? ' It was imagined because of this: ' + d.because + '.' : '') + (why ? ' ' + why : '')); }
      else if (k.indexOf('organ') === 0 && G.organOf) { const o = G.organOf(+k.slice(5)); if (o) G.discover(k, 'A new organ took hold: ' + o.name + '! ' + o.note + (why ? ' ' + why : '')); }
    }
    if (W.stats.killed >= 3) G.discover('predator', 'First predator! Creatures are eating other creatures.');
    if (W.stats.fights >= 12) G.discover('war', 'A violent kind! Some creatures now attack other kinds on sight.');
    for (let i = 0; i < W.zones.length; i++) {
      const z = W.zones[i];
      if (z.p.nut > 0.3 && z.made > 60) { const u = G.usedBy(z); if (u.eaten > 0.75 && u.can > 0.6) G.discover('use' + z.id, 'The pond makes the most of ' + z.word + ': almost all of its food is eaten.'); }
    }
    if (G.versusMilestones) G.versusMilestones();
    // the pond learns to live with what was thrown at it
    for (let i = 0; i < W.zones.length; i++) {
      const z = W.zones[i];
      if (z.p.poison + z.p.acid + z.p.eats + z.p.deadly < 0.25 || z.age < 40) continue;
      const a = G.adaptedTo(z);
      z.adapt = a;
      if (a > 0.45) G.discover('adapt' + z.id, 'The pond has learned to live with ' + z.word + '!');
    }
  };
  G.checkDiscoveries = function () {};
  /** for a food thing: the share of its food that gets eaten, and the share of creatures that can eat it */
  G.usedBy = function (z) {
    const cre = G.W.cre; let n = 0;
    for (let i = 0; i < cre.length; i++) if (cre[i].ph.dig[z.tag] >= 0.2) n++;
    return { eaten: z.made ? Math.min(1, z.fed / z.made) : 0, can: cre.length ? n / cre.length : 0 };
  };
  /** how far the living creatures have evolved tolerance to this thing (0..1) */
  /** how well a creature lives beside a thing (0..1). A living, hunting thing overlooks what is its own colour; the rest is the old slow hardening. */
  G.tolOf = function (g, z) {
    const gene = g.c[9 + z.sig] || 0;
    if (!(z.alive > 0.25 || z.p.eats > 0.05 || z.p.deadly > 0.05)) return gene;
    let d = Math.abs(g.f.hue - z.hue) % 360; if (d > 180) d = 360 - d;
    return Math.min(1, 0.3 * gene + 0.8 * Math.max(0, 1 - d / 42));
  };
  G.adaptedTo = function (z) {
    const cre = G.W.cre; if (!cre.length) return 0;
    let s = 0;
    for (let i = 0; i < cre.length; i++) s += G.tolOf(cre[i].g, z);
    return s / cre.length;
  };

  // ── world actions: things you add, weather and disasters ──
  G.addZone = function (x, y, info) {
    const W = G.W;
    const p = info.props || {};
    const z = {
      id: W.nextZone++, x: x, y: y, word: info.name || 'thing',
      p: { nut: p.nutrition || 0, poison: p.poison || 0, heat: p.heat || 0, light: p.light || 0, sticky: p.sticky || 0, acid: p.acid || 0, hard: p.hard || 0, spread: p.spread || 0, deadly: clamp(+p.deadly || 0, 0, 1), vault: clamp(+p.vault || 0, 0, 0.7), eats: clamp(+p.eats || 0, 0, 1), moves: clamp(+p.moves || 0, 0, 1), pull: clamp(+p.pull || 0, -1, 1) },
      tag: info.tag === undefined ? 2 : info.tag,
      r0: info.radius || 80, r: 40, life: info.life || 120, age: 0, k: 0.2, acc: 0,
      hue: info.hue === undefined ? 200 : info.hue, shape: info.shape || 0, note: info.note || '', svg: info.svg || '',
      sig: info.sig >= 0 && info.sig <= 5 ? info.sig | 0 : G.hash(String(info.name || 'thing').toLowerCase()) % 6,
      weak: info.weak >= 0 && info.weak <= 4 ? info.weak | 0 : (G.hash(String(info.name || 'thing').toLowerCase()) >>> 5) % 5, hit: 0,
      model: info.model || '', alive: clamp(+info.alive || 0, 0, 1), health: 1, genN: info.genN || 1, kids: 0,
      made: 0, fed: 0, hurt: 0, deaths: 0, vis: 0, ate: 0, ev: [], born: W.gen, ma: G.rand() * PI2, bite: 0,
    };
    if (z.p.vault > 0.2) { z.p.hard = 1; z.p.moves = 0; z.alive = 0; z.r0 = Math.max(z.r0, 165); z.life = 420; }    // a wall is big, solid, and only falls when it is broken
    z.look = info.look || (G.beingLook && !(z.p.vault > 0.2) && info.source !== 'ai' ? G.beingLook({ name: z.word, props: { eats: z.p.eats, moves: z.p.moves, deadly: z.p.deadly, poison: z.p.poison, light: z.p.light }, alive: z.alive }) : null);
    z.life0 = z.life;
    z.ev.push({ g: W.gen, t: info.from ? 'Budded from ' + info.from : 'Dropped into the pond' });
    W.zones.push(z);
    if (W.zones.length > 14) W.zones.shift();
    for (let i = 0; i < W.cre.length; i++) { const c = W.cre[i], dx = c.x - x, dy = c.y - y, d = Math.sqrt(dx * dx + dy * dy) + 0.01; if (d < 300) { c.startle = 1.6; c.vx += dx / d * 70; c.vy += dy / d * 70; } }
    G.emit('zone', z);
    return z;
  };

  G.disaster = function (kind, x, y) {
    const W = G.W;
    if (!W) return;
    if (x === undefined) { x = G.rr(0.2, 0.8) * W.ww; y = G.rr(0.2, 0.8) * W.wh; }
    if (kind === 'meteor') {
      const R = 190;
      for (let i = 0; i < W.cre.length; i++) {
        const c = W.cre[i], dx = c.x - x, dy = c.y - y, d = Math.sqrt(dx * dx + dy * dy);
        if (d < R) { if (d < R * 0.55 || G.rand() < 0.6) kill(c, 'meteor'); else c.E *= 0.4; }
        else if (d < R * 2) { c.vx += dx / d * 120; c.vy += dy / d * 120; }
      }
      for (let i = 0; i < W.food.length; i++) { const o = W.food[i], dx = o.x - x, dy = o.y - y; if (dx * dx + dy * dy < R * R) o.dead = true; }
      G.addZone(x, y, { name: 'crater', props: { heat: 0.7, hard: 0.0, nutrition: 0.8 }, tag: 5, radius: 120, life: 70, hue: 20, note: 'a meteor crater' });
    } else if (kind === 'flood') {
      const a = G.rand() * PI2;
      W.flood = { t: 7, fx: Math.cos(a) * 130, fy: Math.sin(a) * 130 };
    } else if (kind === 'bloom') {
      for (let i = 0; i < 170; i++) {
        const r = G.rand();
        G.spawnFood(W, null, null, r < 0.5 ? 2 : r < 0.8 ? 0 : r < 0.92 ? 1 : G.ri(3, 5), false);
      }
    } else if (kind === 'drought') {
      W.drought = 70;
    } else if (kind === 'plague') {
      const counts = {};
      for (let i = 0; i < W.cre.length; i++) counts[W.cre[i].sp] = (counts[W.cre[i].sp] || 0) + 1;
      let top = 0, tn = 0;
      for (const k in counts) if (counts[k] > tn) { tn = counts[k]; top = +k; }
      for (let i = 0; i < W.cre.length; i++) {
        const c = W.cre[i];
        const p = c.sp === top ? 0.55 : 0.08;
        if (G.rand() < p * (1 - c.ph.defense * 0.3)) kill(c, 'plague');
      }
    }
    G.emit('disaster', kind, x, y);
  };

  // ── species ──
  G.speciesById = function (id) {
    const L = G.W.species;
    for (let i = 0; i < L.length; i++) if (L[i].id === id) return L[i];
    return null;
  };

  G.updateSpecies = function () {
    const W = G.W, cre = W.cre, sp = W.species;
    for (let i = 0; i < sp.length; i++) { sp[i].n = 0; sp[i].fitSum = 0; sp[i].repFit *= 0.85; }     // the picture of a species follows its living members
    const TH = K.speciesTH;
    for (let i = 0; i < cre.length; i++) {
      const c = cre[i];
      const f = G.features(c.g);
      c.fv = f;
      let best = null, bd = 1e9;
      for (let j = 0; j < sp.length; j++) {
        if (sp[j].extinct && W.gen - sp[j].lastGen > 3) continue;
        const d = G.fdist(f, sp[j].fv);
        if (d < bd) { bd = d; best = sp[j]; }
      }
      if (!best || bd > TH) {
        const parent = best && bd < TH * 2.2 ? best.id : 0;
        best = {
          id: W.nextSp++, fv: f.slice(), born: W.gen, parent: parent, n: 0, fitSum: 0, kills: 0, peak: 0,
          hist: [], extinct: false, lastGen: W.gen, rep: null, repFit: -1, hue: c.g.t[2],
        };
        best.name = G.speciesName(c.g, best.id);
        { const ps = parent ? G.speciesById(parent) : null; if (ps && ps.judge) best.judge = { score: ps.judge.score, why: ps.judge.why, fix: ps.judge.fix, gen: ps.judge.gen, fv: ps.judge.fv, est: true }; }
        sp.push(best);
        if (sp.length > 3) G.emit('species-new', best);
      }
      c.sp = best.id;
      best.n++; best.fitSum += c.fit;
      best.lastGen = W.gen; best.extinct = false;
      if (c.fit > best.repFit || !best.rep) { best.repFit = c.fit; best.rep = G.cloneGenome(c.g); best.hue = c.g.t[2]; }
      for (let k = 0; k < f.length; k++) best.fv[k] += (f[k] - best.fv[k]) * 0.04;
    }
    for (let i = 0; i < sp.length; i++) {
      const s = sp[i];
      s.peak = Math.max(s.peak, s.n);
      s.hist.push(s.n);
      if (s.hist.length > 80) s.hist.shift();
      if (s.n === 0 && !s.extinct && W.gen - s.lastGen >= 1) {
        s.extinct = true; s.diedGen = W.gen;
        W.fossils.push({ id: s.id, name: s.name, born: s.born, died: W.gen, g: s.rep, peak: s.peak });
        if (W.fossils.length > 40) W.fossils.shift();
        G.emit('extinction-species', s);
      }
    }
    // keep the list bounded
    if (sp.length > 70) {
      for (let i = 0; i < sp.length && sp.length > 70; i++) if (sp[i].extinct && !sp[i].keep) sp.splice(i--, 1);
    }
  };

  const SYL_A = ['Glim', 'Bloop', 'Nim', 'Squi', 'Wob', 'Pip', 'Dorb', 'Fizz', 'Mur', 'Zol', 'Tink', 'Quo', 'Blum', 'Sno', 'Lum', 'Kep', 'Vor', 'Ploo', 'Yel', 'Brisk'];
  const SYL_B = ['ling', 'ox', 'ette', 'ar', 'ibus', 'o', 'ish', 'mop', 'zle', 'ra', 'bee', 'ton', 'kin', 'nub', 'let', 'ee'];
  const NOUN = ['Drifter', 'Gulper', 'Wiggler', 'Nibbler', 'Bobber', 'Glider', 'Lurker', 'Blinker', 'Paddler', 'Roamer'];
  G.speciesName = function (g, id) {
    const r = G.rng(id * 7919 + (g.f.seed | 0) + (g.t[2] | 0));
    const k = G.form.kind(g.f);
    const adj = (g.t[4] || 0) > 0.45 ? 'Fierce ' : G.derive(g).photo > 0.5 ? 'Sun-fed ' : '';
    return adj + SYL_A[Math.floor(r() * SYL_A.length)] + SYL_B[Math.floor(r() * SYL_B.length)] + ' ' + (k.noun === 'Cell' || k.noun === 'Blob' ? NOUN[Math.floor(r() * NOUN.length)] : k.noun);
  };

  G.describeSpecies = function (s) {
    const g = s.rep;
    if (!g) return 'Nothing is known about it yet.';
    const ph = G.derive(g), f = g.f;
    const bits = [];
    const facts = G.form.facts(f);
    bits.push('A ' + G.form.kind(f).full.toLowerCase() + ': ' + facts.slice(0, 5).join(', ') + '.');
    if (s.judge && s.judge.why) bits.push('The pond\'s verdict: ' + s.judge.why);
    const best = [0, 1, 2, 3, 4, 5].sort(function (a, b) { return g.c[b] - g.c[a]; });
    const names = ['gold', 'lime', 'green', 'blue', 'violet', 'pink'];
    if (ph.photo > 0.3) bits.push(ph.speed < 22 ? 'Lives on light and hardly moves, like a plant.' : 'Feeds partly on light.');
    const orgs = [];
    for (let i = 0; i < g.p.length; i++) if (G.organOf) { const o = G.organOf(g.p[i].k); if (o && orgs.indexOf(o.name) < 0) orgs.push(o.name); }
    if (orgs.length) bits.push('Carries: ' + orgs.slice(0, 3).join(', ') + '.');
    if ((g.t[4] || 0) > 0.38) bits.push('Violent: it attacks other kinds' + (s.attacks ? ' (' + s.attacks + ' attacks so far).' : '.'));
    if (s.kills > 3) bits.push('A hunter: it has eaten ' + s.kills + ' other creatures.');
    else if (g.c[best[0]] > 0.6 && g.c[best[1]] > 0.5) bits.push('Eats ' + names[best[0]] + ' and ' + names[best[1]] + ' food.');
    else bits.push('Eats ' + names[best[0]] + ' food.');
    if (ph.lungs) bits.push('Walks: it can climb onto the shore.');
    if (ph.jaws) bits.push('Its bite can take the big prey of the deep.');
    if (g.h >= 2) bits.push('A thinking brain with ' + g.h + ' hidden cells.');
    if (g.c[6] > 0.5) bits.push('Likes it hot.');
    if (g.c[7] > 0.5) bits.push('Shrugs off winter.');
    if (g.c[8] > 0.5) bits.push('Poison-proof.');
    return bits.slice(0, 7).join(' ');
  };

  G.liveSpeciesCount = function () {
    let n = 0; const L = G.W.species;
    for (let i = 0; i < L.length; i++) if (!L[i].extinct && L[i].n > 0) n++;
    return n;
  };

  G.exports = { Grid: Grid };
})();
