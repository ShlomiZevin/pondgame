// ── Fields and strikes: what a world event can DO, said freely ──
// A typed event is no longer squeezed into a dozen pond-wide dials. It may lay down FIELDS: regions of the pond, each a
// shape (a line, a band, a circle, a ring, half the pond, all of it) made of some stuff (ice, fire, water, rock, plants,
// poison, light, dark, magic), doing any mix of things to whoever is in it: it can be solid (a wall, a boulder, a cage),
// burn, freeze, poison, slow, push, pull, feed, kill. It can be aimed at some creatures only, drift across the pond, grow,
// and arrive late, so an event unfolds in stages (the ground rumbles; then the lava comes; then ash). It may also call
// STRIKES from above: meteors, lightning, falling rocks, each hitting a spot.
// A wall of ice, a river of lava, a whirlpool, a safe garden, a poison cloud that drifts, a cage round the middle: all are
// the same few parts put together, so the AI can say almost anything and the pond can act it out.
// It works beside the simulation without changing it: after every step it acts on whoever is inside each field.
(function () {
  'use strict';
  const clamp = G.clamp, TAU = 6.2832;
  const SHAPES = ['line', 'band', 'circle', 'ring', 'half', 'all'], STUFF = ['ice', 'fire', 'water', 'rock', 'plant', 'toxic', 'light', 'dark', 'magic'];
  const HUE = { ice: 195, fire: 18, water: 208, rock: 32, plant: 118, toxic: 95, light: 50, dark: 255, magic: 282 };
  const SAT = { rock: 14, dark: 35 }, WEAKS = ['spike', 'toxin', 'bite', 'glow', 'armor'];
  const WHO = ['all', 'biggest', 'smallest', 'fastest', 'slowest', 'blind', 'legless', 'unarmoured', 'bare'];
  const num = function (v, a, b, d) { v = +v; return isFinite(v) ? clamp(v, a, b) : d; };
  const pick = function (v, list, d) { return list.indexOf(v) >= 0 ? v : d; };

  /** whatever was imagined becomes fields the pond can run: at most four */
  G.cleanFields = function (raw, barrier) {
    const out = [], L = Array.isArray(raw) ? raw.slice(0, 4) : [];
    if (barrier && typeof barrier === 'object') L.unshift({ name: barrier.name, shape: 'line', across: barrier.across, at: barrier.at, gap: barrier.gap, stuff: 'rock', hue: barrier.hue, solid: 1, weak: barrier.weak, life: barrier.life });
    for (let i = 0; i < L.length && out.length < 4; i++) {
      const q = L[i]; if (!q || typeof q !== 'object') continue;
      const stuff = pick(String(q.stuff || '').toLowerCase(), STUFF, 'magic'), push = Array.isArray(q.push) ? q.push : [];
      let weak = typeof q.weak === 'number' ? q.weak : WEAKS.indexOf(String(q.weak || '').replace('armour', 'armor'));
      out.push({
        name: String(q.name || 'Something').replace(/[<>"]/g, '').slice(0, 30), stuff: stuff, hue: q.hue === undefined || q.hue === null ? HUE[stuff] : num(q.hue, 0, 360, HUE[stuff]),
        shape: pick(String(q.shape || '').toLowerCase(), SHAPES, 'circle'), across: pick(q.across, ['vertical', 'horizontal', 'diagonal'], 'vertical'), at: num(q.at, 0.08, 0.92, 0.5), width: num(q.width, 0.03, 0.6, 0.12),
        x: num(q.x, 0.05, 0.95, 0.5), y: num(q.y, 0.08, 0.92, 0.5), r: num(q.r, 0.04, 0.45, 0.15), side: pick(q.side, ['left', 'right', 'top', 'bottom'], 'left'), gap: num(q.gap, 0, 0.3, 0),
        solid: q.solid ? 1 : 0, hurt: num(q.hurt, 0, 1, 0), kill: num(q.kill, 0, 1, 0), slow: num(q.slow, 0, 1, 0), pull: num(q.pull, -1, 1, 0), push: [num(push[0], -1, 1, 0), num(push[1], -1, 1, 0)],
        feed: num(q.feed, 0, 1, 0), tag: Math.round(num(q.tag, 0, 5, 2)), who: pick(q.who, WHO, 'all'),
        drift: [num(Array.isArray(q.drift) ? q.drift[0] : 0, -1, 1, 0), num(Array.isArray(q.drift) ? q.drift[1] : 0, -1, 1, 0)], grow: num(q.grow, -1, 1, 0),
        after: num(q.after, 0, 90, 0), life: num(q.life, 15, 400, 90), weak: weak >= 0 && weak < 5 ? weak : -1,
      });
    }
    return out;
  };
  G.cleanStrikes = function (q) {
    if (!q || typeof q !== 'object' || !(+q.count > 0)) return null;
    return { name: String(q.name || 'Strike').replace(/[<>"]/g, '').slice(0, 24), count: Math.round(num(q.count, 1, 40, 6)), over: num(q.over, 1, 90, 12), radius: num(q.radius, 0.02, 0.2, 0.06), kill: num(q.kill, 0, 1, 0.5), feed: Math.round(num(q.feed, 0, 12, 0)), tag: Math.round(num(q.tag, 0, 5, 0)), hue: num(q.hue, 0, 360, 30), stuff: pick(String(q.stuff || '').toLowerCase(), STUFF, 'fire'), after: num(q.after, 0, 90, 0), aim: q.aim === 'creatures' ? 'creatures' : 'anywhere' };
  };

  /** put a field into the pond (from an event, or from a wall dropped in as a thing) */
  G.addField = function (def) {
    const W = G.W; if (!W || !def) return null;
    W.fields = W.fields || [];
    const f = {}; for (const k in def) f[k] = Array.isArray(def[k]) ? def[k].slice() : def[k];
    f.id = (W.nextField = (W.nextField || 0) + 1);
    f.start = W.t + (f.after || 0); f.life0 = f.life; f.atk = 0; f.hits = 0; f.gapAt = 0.3 + G.rand() * 0.4; f.acc = 0;
    if (f.solid && f.weak < 0) f.weak = G.hash ? G.hash(f.name) % 5 : 0;
    W.fields.push(f);
    if (W.fields.length > 6) W.fields.shift();
    G.emit('field', f);
    return f;
  };

  // ── where a field is ──
  // returns null when the point is not in it; else { d: how deep inside (0 at its edge), nx, ny: the way out }
  function locate(f, W, x, y, pad) {
    pad = pad || 0;
    const sh = f.shape, m = Math.min(W.ww, W.wh);
    if (sh === 'all') return { d: 99, nx: 0, ny: -1 };
    if (sh === 'circle' || sh === 'ring') {
      const cx = f.x * W.ww, cy = f.y * W.wh, r = f.r * m, dx = x - cx, dy = y - cy, dist = Math.hypot(dx, dy) || 0.001;
      if (sh === 'circle') return dist < r + pad ? { d: r + pad - dist, nx: dx / dist, ny: dy / dist } : null;
      const half = Math.max(14, f.width * m * 0.25) + pad, off = dist - r;      // a ring: only its rim
      return Math.abs(off) < half ? { d: half - Math.abs(off), nx: (off >= 0 ? 1 : -1) * dx / dist, ny: (off >= 0 ? 1 : -1) * dy / dist, off: off } : null;
    }
    if (sh === 'half') {
      const s = f.side, edge = s === 'left' || s === 'right' ? f.at * W.ww : f.at * W.wh, v = s === 'left' ? edge - x : s === 'right' ? x - edge : s === 'top' ? edge - y : y - edge;
      return v + pad > 0 ? { d: v + pad, nx: s === 'left' ? 1 : s === 'right' ? -1 : 0, ny: s === 'top' ? 1 : s === 'bottom' ? -1 : 0 } : null;
    }
    // a line or a band across the pond
    const g = geom(f, W), t = ((x - g.x1) * g.ux + (y - g.y1) * g.uy) / g.len, off = (x - g.x1) * g.nx + (y - g.y1) * g.ny, half = g.half + pad;
    if (t < 0 || t > 1 || Math.abs(off) >= half) return null;
    if (f.gap > 0 && Math.abs(t - f.gapAt) < f.gap / 2) return null;                 // the way through
    return { d: half - Math.abs(off), nx: (off >= 0 ? 1 : -1) * g.nx, ny: (off >= 0 ? 1 : -1) * g.ny, off: off, g: g };
  }
  function geom(f, W) {
    let x1, y1, x2, y2;
    if (f.across === 'horizontal') { x1 = 0; x2 = W.ww; y1 = y2 = f.at * W.wh; }
    else if (f.across === 'diagonal') { x1 = W.ww * (f.at - 0.22); y1 = 0; x2 = W.ww * (f.at + 0.22); y2 = W.wh; }
    else { x1 = x2 = f.at * W.ww; y1 = 0; y2 = W.wh; }
    const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1;
    return { x1: x1, y1: y1, x2: x2, y2: y2, len: len, ux: dx / len, uy: dy / len, nx: -dy / len, ny: dx / len, half: f.shape === 'line' ? 14 : Math.max(18, f.width * Math.min(W.ww, W.wh) * 0.5) };
  }
  const aimed = function (f, c, W) {
    const w = f.who; if (w === 'all') return true;
    if (w === 'blind') return c.g.f.en === 0; if (w === 'legless') return !c.ph.limbs; if (w === 'unarmoured') return c.ph.defense < 0.15; if (w === 'bare') return !c.g.f.coat;
    const m = W._fieldMed || (W._fieldMed = medians(W));
    return w === 'biggest' ? c.ph.r >= m.r : w === 'smallest' ? c.ph.r < m.r : w === 'fastest' ? c.ph.speed >= m.s : c.ph.speed < m.s;
  };
  function medians(W) { const r = W.cre.map(function (c) { return c.ph.r; }).sort(function (a, b) { return a - b; }), s = W.cre.map(function (c) { return c.ph.speed; }).sort(function (a, b) { return a - b; }); return { r: r[r.length >> 1] || 0, s: s[s.length >> 1] || 0 }; }
  // how little its stuff harms this body: fire by heat-proofing, ice by cold-proofing, poison by poison-proofing, the rest by armour
  const shrug = function (f, c) { const res = c.ph.res || [0, 0, 0]; return clamp(f.stuff === 'fire' ? res[0] : f.stuff === 'ice' ? res[1] : f.stuff === 'toxic' ? res[2] : c.ph.defense || 0, 0, 0.95); };

  function fieldsStep(dt) {
    const W = G.W, L = W.fields, m = Math.min(W.ww, W.wh);
    W._fieldMed = null;
    for (let k = L.length - 1; k >= 0; k--) {
      const f = L[k];
      if (W.t < f.start) continue;                                              // it has not come yet
      if (!f.begun) { f.begun = true; G.emit('field-begin', f); }
      // it may drift across the pond, and swell or shrink
      if (f.drift[0] || f.drift[1]) { f.x += f.drift[0] * dt * 0.02; f.y += f.drift[1] * dt * 0.02; f.at += (f.across === 'horizontal' ? f.drift[1] : f.drift[0]) * dt * 0.02; if (f.x < -0.2 || f.x > 1.2 || f.y < -0.2 || f.y > 1.2 || f.at < -0.1 || f.at > 1.1) f.life = 0; }
      if (f.grow) { f.r = clamp(f.r * (1 + f.grow * dt * 0.03), 0.02, 0.6); f.width = clamp(f.width * (1 + f.grow * dt * 0.03), 0.02, 0.8); }
      let atk = 0, wear = dt;
      for (let i = 0; i < W.cre.length; i++) {
        const c = W.cre[i]; if (c.dead) continue;
        const own = f.spare && c.sp === f.spare, rr = c.ph.r * 0.6, at = locate(f, W, c.x, c.y, f.solid && !own ? rr : 0);
        if (!at) continue;
        if (f.solid && !own) {
          // nothing passes through it: it goes back out on the side it came from
          let nx = at.nx, ny = at.ny;
          if (at.off !== undefined) { const p0 = locate(f, W, c.px === undefined ? c.x : c.px, c.py === undefined ? c.y : c.py, 9999); if (p0 && p0.off !== undefined && (p0.off >= 0) !== (at.off >= 0)) { nx = -nx; ny = -ny; at.d = 2 * (f.shape === 'ring' ? Math.max(14, f.width * m * 0.25) : at.g ? at.g.half : 14) + 2 * rr - at.d; } }
          c.x += nx * at.d; c.y += ny * at.d;
          const vn = c.vx * nx + c.vy * ny; if (vn < 0) { c.vx -= 1.7 * vn * nx; c.vy -= 1.7 * vn * ny; }
          const pw = f.weak >= 0 && G.weakPower ? G.weakPower(c, f.weak) : 0;
          if (pw > 0.5) { wear += dt * pw * 0.5; atk++; }
        }
        if (!aimed(f, c, W)) continue;
        if (own) continue;                                                     // its makers are at home in it (food that grows there is theirs to eat)
        const sh = shrug(f, c);
        if (f.hurt) { c.E -= f.hurt * 0.22 * c.ph.Emax * (1 - sh) * dt; if (f.stuff === 'fire') c.hot = Math.max(c.hot || 0, 0.6); else if (f.stuff === 'ice') c.chill = Math.max(c.chill || 0, 0.6); else if (f.stuff === 'toxic') c.pois = Math.max(c.pois || 0, 0.6); }
        if (f.kill && G.rand() < f.kill * 0.5 * (1 - sh) * dt && G.kill) { G.kill(c, 'event'); continue; }
        if (f.slow) { const k2 = 1 - f.slow * Math.min(1, dt * 5); c.vx *= k2; c.vy *= k2; }
        if (f.push[0] || f.push[1]) { c.vx += f.push[0] * 150 * dt; c.vy += f.push[1] * 150 * dt; }
        if (f.pull && (f.shape === 'circle' || f.shape === 'ring')) { const dx = f.x * W.ww - c.x, dy = f.y * W.wh - c.y, d = Math.hypot(dx, dy) || 1; c.vx += dx / d * f.pull * 170 * dt; c.vy += dy / d * f.pull * 170 * dt; if (f.pull > 0) { c.vx += -dy / d * f.pull * 90 * dt; c.vy += dx / d * f.pull * 90 * dt; } }      // what pulls also turns: a whirlpool
      }
      if (f.feed && G.spawnFood) { f.acc += f.feed * 3 * dt; while (f.acc >= 1) { f.acc -= 1; const p = somewhere(f, W); if (p) G.spawnFood(W, p[0], p[1], f.tag); } }
      f.atk = atk; if (atk) f.hits++;
      f.life -= f.solid ? wear : dt;
      if (f.life <= 0) { L.splice(k, 1); G.emit('field-gone', f, f.solid && f.hits > 40); }
    }
    // strikes from above
    const S = W.strikes;
    if (S) for (let i = S.length - 1; i >= 0; i--) {
      const s = S[i]; if (W.t < s.t) continue;
      S.splice(i, 1);
      const r = s.r * m;
      for (let j = 0; j < W.cre.length; j++) { const c = W.cre[j]; if (c.dead) continue; const d = Math.hypot(c.x - s.x, c.y - s.y); if (d < r) { if (G.rand() < s.kill * (1 - clamp(c.ph.defense || 0, 0, 0.9)) && G.kill) G.kill(c, 'event'); else { const a = Math.atan2(c.y - s.y, c.x - s.x); c.vx += Math.cos(a) * 160; c.vy += Math.sin(a) * 160; c.startle = 1.2; } } }
      if (G.spawnFood) for (let j = 0; j < s.feed; j++) { const a = G.rand() * TAU, d = Math.sqrt(G.rand()) * r; G.spawnFood(W, clamp(s.x + Math.cos(a) * d, 8, W.ww - 8), clamp(s.y + Math.sin(a) * d, 8, W.wh - 8), s.tag); }
      (W.scars = W.scars || []).push({ x: s.x, y: s.y, r: r, t: W.t, hue: s.hue }); if (W.scars.length > 30) W.scars.shift();
      G.emit('strike', s);
    }
  }
  function somewhere(f, W) { for (let t = 0; t < 12; t++) { const x = G.rand() * W.ww, y = G.rand() * W.wh; if (locate(f, W, x, y, 0)) return [x, y]; } return null; }
  // the simulation's step, with the fields acting after it
  { const step0 = G.step; G.step = function (dt) { step0(dt); const W = G.W; if (W && ((W.fields && W.fields.length) || (W.strikes && W.strikes.length))) fieldsStep(dt); }; }

  // ── a typed event lays them down ──
  G.on('event', function (ev) {
    const W = G.W; if (!W || !ev) return;
    if (Array.isArray(ev.fields)) for (let i = 0; i < ev.fields.length; i++) G.addField(ev.fields[i]);
    const s = ev.strikes;
    if (s) { W.strikes = W.strikes || []; for (let i = 0; i < s.count && W.strikes.length < 60; i++) { let x = G.rand() * W.ww, y = G.rand() * W.wh; if (s.aim === 'creatures' && W.cre.length) { const c = W.cre[Math.floor(G.rand() * W.cre.length)]; x = c.x + (G.rand() - 0.5) * 60; y = c.y + (G.rand() - 0.5) * 60; } W.strikes.push({ t: W.t + s.after + 1.2 + G.rand() * s.over, x: x, y: y, r: s.radius, kill: s.kill, feed: s.feed, tag: s.tag, hue: s.hue, stuff: s.stuff, name: s.name }); } }
  });
  // a wall dropped in as a THING becomes a real wall through that spot
  G.on('zone', function (z) {
    const W = G.W; if (!W || !z || !z.p || !(z.p.vault > 0.2)) return;
    const at = W.zones.indexOf(z); if (at >= 0) W.zones.splice(at, 1);
    const low = String(z.word || '').toLowerCase(), stuff = /ice|snow|frost|glacier/.test(low) ? 'ice' : /fire|lava|flame/.test(low) ? 'fire' : /hedge|vine|thorn|plant|wood|tree/.test(low) ? 'plant' : /water|wave|dam/.test(low) ? 'water' : 'rock';
    G.addField(G.cleanFields([{ name: z.word, shape: 'line', across: 'vertical', at: z.x / W.ww, gap: 0.12, stuff: stuff, solid: 1, weak: z.weak, life: 180 }])[0]);
  });

  // ── kept with the pond ──
  G.packFields = function () { const W = G.W; return (W.fields || []).map(function (f) { const o = {}; for (const k in f) if (k !== 'acc' && k !== 'atk' && k !== 'hits' && k !== 'begun' && k !== 'id') o[k] = typeof f[k] === 'number' ? +f[k].toFixed(3) : f[k]; o.left = +(f.start - W.t).toFixed(1); return o; }); };
  G.unpackFields = function (list) {
    const W = G.W; W.fields = []; W.nextField = 0; W.strikes = []; W.scars = [];
    if (!Array.isArray(list)) return;
    const L = G.cleanFields(list.slice(0, 6));
    for (let i = 0; i < L.length; i++) { const f = G.addField(L[i]), q = list[i] || {}; if (!f) continue; f.start = W.t + Math.max(0, +q.left || 0); f.life = num(q.life, 1, 400, f.life); f.life0 = num(q.life0, f.life, 400, f.life); f.gapAt = num(q.gapAt, 0.2, 0.8, f.gapAt); f.x = num(q.x, -0.2, 1.2, f.x); f.y = num(q.y, -0.2, 1.2, f.y); f.at = num(q.at, -0.1, 1.1, f.at); }
  };

  // ── drawn in the pond ──
  const words = function (f) {
    const t = [];
    if (f.solid) t.push('nothing passes'); if (f.kill > 0.05) t.push('kills'); if (f.hurt > 0.05) t.push(f.stuff === 'fire' ? 'burns' : f.stuff === 'ice' ? 'freezes' : f.stuff === 'toxic' ? 'poisons' : 'hurts');
    if (f.slow > 0.1) t.push('slows'); if (f.pull > 0.1) t.push('pulls in'); if (f.pull < -0.1) t.push('drives away'); if (f.push[0] || f.push[1]) t.push('sweeps along'); if (f.feed > 0.05) t.push('feeds');
    if (f.who !== 'all') t.push('only the ' + f.who);
    return t.join(' · ');
  };
  G.fieldWords = words;
  // The outline of a region, as something that GREW or was thrown up, not ruled with a ruler: every edge wanders and breathes a
  // little (each region in its own way, from its id). The effect on creatures keeps the plain shape underneath; the wander is small.
  function path(ctx, f, W) {
    const m = Math.min(W.ww, W.wh), t = G.rt || 0, p0 = (f.id || 1) * 2.399, soft = f.solid ? 0.25 : 1;
    const wob = function (u) { return 0.5 * Math.sin(u * 0.021 + p0) + 0.3 * Math.sin(u * 0.047 + p0 * 1.7 + t * 0.35 * soft) + 0.2 * Math.sin(u * 0.093 + p0 * 2.9 - t * 0.5 * soft); };      // -1..1 along an edge (u in pond units)
    const curve = function (P) { const n = P.length; ctx.moveTo((P[n - 1][0] + P[0][0]) / 2, (P[n - 1][1] + P[0][1]) / 2); for (let i = 0; i < n; i++) { const q = P[(i + 1) % n]; ctx.quadraticCurveTo(P[i][0], P[i][1], (P[i][0] + q[0]) / 2, (P[i][1] + q[1]) / 2); } ctx.closePath(); };      // a closed line through points, rounded: no corners
    const blob = function (cx, cy, R, back) { const N = Math.max(14, Math.min(40, Math.round(R / 16))), A = Math.min(R * 0.1, 26), P = []; for (let i = 0; i < N; i++) { const k = back ? N - 1 - i : i, ang = k / N * TAU, rr = R + A * 0.6 * Math.sin(ang * 2 + p0 + (back ? 2 : 0)) + A * 0.5 * Math.sin(ang * 3 - p0 * 1.3 + t * 0.3 * soft) + A * 0.35 * Math.sin(ang * 5 + p0 * 2.1 - t * 0.4 * soft); P.push([cx + Math.cos(ang) * rr, cy + Math.sin(ang) * rr]); } curve(P); };
    ctx.beginPath();
    if (f.shape === 'all') ctx.rect(0, 0, W.ww, W.wh);
    else if (f.shape === 'circle') blob(f.x * W.ww, f.y * W.wh, f.r * m);
    else if (f.shape === 'ring') { const half = Math.max(14, f.width * m * 0.25); blob(f.x * W.ww, f.y * W.wh, f.r * m + half); blob(f.x * W.ww, f.y * W.wh, Math.max(1, f.r * m - half), true); }
    else if (f.shape === 'half') {
      // its one inner edge is a shoreline, not a cut
      const s = f.side, vert = s === 'left' || s === 'right', L = vert ? W.wh : W.ww, e = f.at * (vert ? W.ww : W.wh), A = Math.min(34, m * 0.03), far = s === 'left' || s === 'top' ? -60 : (vert ? W.ww : W.wh) + 60;
      const P = []; for (let u = -90; u <= L + 90; u += 60) { const o = e + A * wob(u * 0.8); P.push(vert ? [o, u] : [u, o]); }
      P.push(vert ? [far, L + 90] : [L + 90, far]); P.push(vert ? [far, -90] : [-90, far]); curve(P);
    }
    else { const g = geom(f, W), seg = f.gap > 0 ? [[0, f.gapAt - f.gap / 2], [f.gapAt + f.gap / 2, 1]] : [[0, 1]], A = Math.min(g.half * 0.45, 24), B = Math.min(g.half * 0.3, 16);
      for (let q = 0; q < seg.length; q++) { const u0 = g.len * seg[q][0], u1 = g.len * seg[q][1], n = Math.max(2, Math.round((u1 - u0) / 60)), pts = [], P = [];
        for (let i = 0; i <= n; i++) { const u = u0 + (u1 - u0) * i / n, mid = A * wob(u * 0.7), wd = g.half + B * wob(u * 1.1 + 700), end = Math.min(1, Math.min(i, n - i) / 1.5 + 0.35);      // it wanders, swells and thins, and tapers at its ends
          pts.push([g.x1 + g.ux * u + g.nx * mid, g.y1 + g.uy * u + g.ny * mid, wd * end]); }
        for (let i = 0; i <= n; i++) P.push([pts[i][0] + g.nx * pts[i][2], pts[i][1] + g.ny * pts[i][2]]);
        for (let i = n; i >= 0; i--) P.push([pts[i][0] - g.nx * pts[i][2], pts[i][1] - g.ny * pts[i][2]]);
        curve(P); } }
  }
  function centre(f, W) { if (f.shape === 'circle' || f.shape === 'ring') return [f.x * W.ww, f.y * W.wh - (f.shape === 'ring' ? f.r * Math.min(W.ww, W.wh) : 0)]; if (f.shape === 'half') return f.side === 'left' ? [f.at * W.ww * 0.5, W.wh * 0.5] : f.side === 'right' ? [W.ww * (1 + f.at) / 2, W.wh * 0.5] : f.side === 'top' ? [W.ww / 2, f.at * W.wh * 0.5] : [W.ww / 2, W.wh * (1 + f.at) / 2]; if (f.shape === 'all') return [W.ww / 2, W.wh * 0.3]; const g = geom(f, W), t = f.gap > 0 ? clamp(f.gapAt + (f.gapAt > 0.5 ? -0.28 : 0.28), 0.12, 0.88) : 0.5; return [g.x1 + g.ux * g.len * t + g.nx * (g.half + 14), g.y1 + g.uy * g.len * t + g.ny * (g.half + 14)]; }
  G.drawFields = function (ctx) {
    const W = G.W; if (!W) return;
    const F = W.fields || [], SC = W.scars || [], ST = W.strikes || [];
    if (!F.length && !SC.length && !ST.length) return;
    const v = G.view, s = v.scale * v.dpr, t = G.rt || 0, m = Math.min(W.ww, W.wh);
    ctx.save(); ctx.setTransform(s, 0, 0, s, v.ox * v.dpr, v.oy * v.dpr); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    // where strikes have landed, and where the next will
    for (let i = 0; i < SC.length; i++) { const q = SC[i], age = W.t - q.t; if (age > 14) continue; const a = 1 - age / 14; ctx.beginPath(); ctx.arc(q.x, q.y, q.r * 0.8, 0, TAU); ctx.fillStyle = 'rgba(8,10,16,' + 0.35 * a + ')'; ctx.fill(); if (age < 0.7) { ctx.beginPath(); ctx.arc(q.x, q.y, q.r * (0.3 + age * 2.2), 0, TAU); ctx.strokeStyle = G.hsl(q.hue, 95, 75, 1 - age / 0.7); ctx.lineWidth = 9 * (1 - age / 0.7) + 1; ctx.stroke(); ctx.beginPath(); ctx.arc(q.x, q.y, q.r * 0.9, 0, TAU); ctx.fillStyle = G.hsl(q.hue, 100, 85, 0.75 * (1 - age / 0.7)); ctx.fill(); } }
    for (let i = 0; i < ST.length; i++) { const q = ST[i], left = q.t - W.t; if (left > 1.2 || left < 0) continue; const r = q.r * m; ctx.beginPath(); ctx.arc(q.x, q.y, r, 0, TAU); ctx.strokeStyle = G.hsl(q.hue, 95, 70, 0.4 + 0.5 * (1 - left / 1.2)); ctx.lineWidth = 2.5; ctx.setLineDash([8, 7]); ctx.stroke(); ctx.setLineDash([]); ctx.beginPath(); ctx.moveTo(q.x + left * 260, q.y - left * 700); ctx.lineTo(q.x + left * 300, q.y - left * 800); ctx.strokeStyle = G.hsl(q.hue, 100, 80, 0.9); ctx.lineWidth = 5; ctx.stroke(); }
    for (let k = 0; k < F.length; k++) {
      const f = F[k], coming = W.t < f.start, sat = SAT[f.stuff] === undefined ? 78 : SAT[f.stuff], hp = clamp(f.life / f.life0, 0, 1), rr = G.rng ? G.rng(f.id * 977 + 13) : Math.random;
      const body = G.hsl(f.hue, sat, f.stuff === 'dark' ? 10 : 62, 1), light = G.hsl(f.hue, sat, f.stuff === 'dark' ? 30 : 84, 1);
      if (coming) { path(ctx, f, W); ctx.strokeStyle = G.hsl(f.hue, sat, 78, 0.45 + 0.35 * Math.sin(t * 7)); ctx.lineWidth = 3; ctx.setLineDash([10, 9]); ctx.stroke(); ctx.setLineDash([]); }
      else {
        if (f.solid) { ctx.save(); ctx.translate(5, 9); path(ctx, f, W); ctx.fillStyle = 'rgba(4,12,20,0.35)'; ctx.fill(); ctx.restore(); }
        path(ctx, f, W); ctx.fillStyle = G.hsl(f.hue, sat, f.stuff === 'dark' ? 6 : 60, f.solid ? 0.96 : f.shape === 'all' || f.shape === 'half' ? 0.2 : 0.34); ctx.fill('evenodd');
        // what it is made of, moving inside it
        ctx.save(); path(ctx, f, W); ctx.clip('evenodd');
        const box = f.shape === 'circle' || f.shape === 'ring' ? [f.x * W.ww - f.r * m * 1.2, f.y * W.wh - f.r * m * 1.2, f.r * m * 2.4, f.r * m * 2.4] : [0, 0, W.ww, W.wh], N = Math.min(110, Math.round(box[2] * box[3] / 9000) + 14);
        for (let i = 0; i < N; i++) {
          const bx = box[0] + rr() * box[2], by = box[1] + rr() * box[3], ph = rr() * TAU, sz = 2 + rr() * 5;
          if (f.stuff === 'fire') { const yy = by - ((t * 40 + ph * 30) % 60); ctx.beginPath(); ctx.arc(bx + Math.sin(t * 3 + ph) * 5, yy, sz * 1.5, 0, TAU); ctx.fillStyle = 'hsla(' + (f.hue + 20 * Math.sin(ph)) + ',100%,' + (60 + 18 * Math.sin(t * 6 + ph)) + '%,0.55)'; ctx.fill(); }
          else if (f.stuff === 'water') { const dx = (f.push[0] || 0.6) * ((t * 90 + ph * 50) % 120), dy = (f.push[1] || 0) * ((t * 90 + ph * 50) % 120); ctx.beginPath(); ctx.moveTo(bx + dx, by + dy); ctx.lineTo(bx + dx + (f.push[0] || 0.6) * 22, by + dy + (f.push[1] || 0) * 22); ctx.strokeStyle = 'rgba(225,242,255,0.5)'; ctx.lineWidth = 2; ctx.stroke(); }
          else if (f.stuff === 'toxic') { const yy = by - ((t * 22 + ph * 30) % 50); ctx.beginPath(); ctx.arc(bx, yy, sz * 1.4, 0, TAU); ctx.strokeStyle = G.hsl(f.hue, 90, 70, 0.7); ctx.lineWidth = 1.5; ctx.stroke(); }
          else if (f.stuff === 'ice') { ctx.beginPath(); ctx.moveTo(bx - sz * 2, by); ctx.lineTo(bx + sz * 2, by + sz); ctx.strokeStyle = 'rgba(255,255,255,' + (0.35 + 0.3 * Math.sin(t * 2 + ph)) + ')'; ctx.lineWidth = 1.6; ctx.stroke(); }
          else if (f.stuff === 'plant') { ctx.beginPath(); ctx.ellipse(bx, by, sz * 2, sz, ph + Math.sin(t * 1.5 + ph) * 0.3, 0, TAU); ctx.fillStyle = G.hsl(f.hue + 20 * Math.sin(ph), 60, 38 + 14 * Math.sin(ph * 3), 0.75); ctx.fill(); }
          else if (f.stuff === 'rock') { ctx.beginPath(); ctx.ellipse(bx, by, sz * 3.2, sz * 2.2, ph, 0, TAU); ctx.fillStyle = 'rgba(255,255,255,0.10)'; ctx.fill(); ctx.strokeStyle = 'rgba(20,32,46,0.4)'; ctx.lineWidth = 1.6; ctx.stroke(); }
          else if (f.stuff !== 'dark') { const tw = 0.5 + 0.5 * Math.sin(t * 5 + ph * 3); ctx.beginPath(); ctx.arc(bx, by, sz * 0.5 * (0.6 + tw), 0, TAU); ctx.fillStyle = 'rgba(255,255,255,' + 0.75 * tw + ')'; ctx.fill(); }
        }
        if (f.pull > 0.1 && (f.shape === 'circle')) { ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 2.5; for (let a = 0; a < 3; a++) { ctx.beginPath(); for (let u = 0; u <= 1; u += 0.05) { const rad = f.r * m * (1 - u), ang = t * 2.2 + a * TAU / 3 + u * 5; const px = f.x * W.ww + Math.cos(ang) * rad, py = f.y * W.wh + Math.sin(ang) * rad; if (u) ctx.lineTo(px, py); else ctx.moveTo(px, py); } ctx.stroke(); } }      // a whirlpool turns
        if (f.solid) { ctx.strokeStyle = '#14202e'; ctx.lineWidth = 1.6; ctx.globalAlpha = 0.8; const cracks = Math.round((1 - hp) * 26); for (let i = 0; i < cracks; i++) { const bx = box[0] + rr() * box[2], by = box[1] + rr() * box[3]; ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + 9 - rr() * 18, by + 12); ctx.lineTo(bx + 14 - rr() * 28, by + 26); ctx.stroke(); } ctx.globalAlpha = 1; }
        ctx.restore();
        path(ctx, f, W); ctx.strokeStyle = f.solid ? '#14202e' : light; ctx.lineWidth = f.solid ? 4 : 2.2; ctx.globalAlpha = f.solid ? 1 : 0.7; if (f.shape !== 'all') ctx.stroke(); ctx.globalAlpha = 1;
      }
      // its name and what it does
      const c = centre(f, W), inv = 1 / Math.max(0.7, v.scale), does = words(f), line2 = coming ? 'coming in ' + Math.ceil(f.start - W.t) + 's' + (does ? ' · ' + does : '') : (does || 'harmless') + (f.solid ? ' · ' + Math.round((1 - hp) * 100) + '% worn' + (f.atk ? ' · ' + f.atk + ' breaking it' : f.weak >= 0 && G.WEAK ? ' · weak to ' + G.WEAK[f.weak].text : '') : ' · ' + Math.ceil(f.life) + 's');
      ctx.save(); ctx.translate(c[0], c[1]); ctx.scale(inv, inv); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = '700 12px system-ui, sans-serif'; const w1 = ctx.measureText(f.name).width; ctx.font = '600 10.5px system-ui, sans-serif'; const tw = Math.max(w1, ctx.measureText(line2).width) + 20;
      ctx.fillStyle = 'rgba(9,28,40,0.86)'; ctx.beginPath(); ctx.rect(-tw / 2, -20, tw, 40); ctx.fill(); ctx.strokeStyle = G.hsl(f.hue, sat, 70, 0.7); ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.font = '700 12px system-ui, sans-serif'; ctx.fillText(f.name, 0, -8);
      ctx.fillStyle = coming ? '#f6d365' : f.atk ? '#f6d365' : '#cfe8ff'; ctx.font = '600 10.5px system-ui, sans-serif'; ctx.fillText(line2, 0, 8);
      ctx.restore();
    }
    ctx.restore();
  };

  G.on('field-begin', function (f) { if (G.mode !== 'play') return; const d = words(f); if (G.log) G.log('sel', f.name, (f.shape === 'line' || f.shape === 'band' ? 'It lies across the pond' : f.shape === 'half' ? 'It covers the ' + f.side + ' of the pond' : f.shape === 'all' ? 'It is everywhere' : 'It has appeared in the pond') + (d ? ': ' + d : '') + '.'); if (f.after > 2 && G.banner) G.banner('And then', f.name + (d ? ': ' + d : '') + '.', 4200); });
  G.on('field-gone', function (f, broken) { if (G.mode !== 'play' || !f.solid) return; const t = broken ? 'The creatures broke through ' + f.name + '.' : f.name + ' wore away.'; if (G.log) G.log('sel', f.name + ' is gone', t); if (G.banner) G.banner('It fell', t, 5000); });
})();
