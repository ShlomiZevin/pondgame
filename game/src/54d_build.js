// ── Building, piece by piece ──
// When a kind sets out to build, nothing appears by itself. There are MATERIALS lying about the pond, each where the pond's own nature puts it:
//     stone  on the floor of the pond, where it has sunk          reed  growing on the land and along the waterline          shell  where a creature has died
// and what is to be built is a PLAN OF PIECES (blocks, posts, a roof, a door, a banner), worked out from who is building: what the thing is for decides
// its sort (a walled ring, a cluster of huts, a tall beacon, a hall), the kind's own body decides its style (a spiny kind builds spires, a round one domes)
// and its brain how elaborate it dares to be. Each builder goes and fetches the material the next piece needs, hauls it back (slowly, and slower still
// with nothing to grip it with) and sets it in place, from the ground up; when the frame stands they go round it again and colour it in their own colours.
// So a building is watched being made, by many hands, and a half-built one shows exactly how far they got.
// What they build stays while their kind lives to keep it up; when the kind is gone it crumbles from the top, piece by piece, into a ruin. The player,
// as nature, can strike it down. It is drawn by the game itself, in the pond's own style: no picture is asked of the AI for it.
(function () {
  'use strict';
  const clamp = G.clamp, TAU = 6.2832, INK = '#14202e';
  const MAT = [{ id: 'stone', cap: 44, col: [205, 12, 62] }, { id: 'reed', cap: 40, col: [78, 38, 58] }, { id: 'shell', cap: 26, col: [32, 55, 84] }];
  G.MATS = MAT;
  const hsl = function (h, s, l, a) { return 'hsla(' + ((h % 360) + 360) % 360 + ',' + s + '%,' + l + '%,' + (a === undefined ? 1 : a) + ')'; };

  // ── materials in the pond ──
  function scatter(W, k) {
    const sy = G.shoreY ? G.shoreY(W) : W.wh * 0.2; let x = 30 + G.rand() * (W.ww - 60), y;
    if (k === 0) y = W.wh - 26 - G.rand() * G.rand() * (W.wh - sy) * 0.5;                    // stone: sunk to the floor, thinning upward
    else if (k === 1) y = G.rand() < 0.7 ? 18 + G.rand() * Math.max(10, sy - 30) : sy + G.rand() * 40;      // reed: on the land, some at the waterline
    else return;                                                                           // shell: only where something died
    W.mats.push({ x: x, y: y, k: k, s: G.rand() });
  }
  function matsStep(W, dt) {
    if (!W.mats) { W.mats = []; for (let i = 0; i < 26; i++) scatter(W, 0); for (let i = 0; i < 22; i++) scatter(W, 1); }
    W.matT = (W.matT || 0) - dt; if (W.matT > 0) return; W.matT = 2.5;
    const n = [0, 0, 0], area = Math.sqrt(W.ww * W.wh / 3.3e6); for (let i = 0; i < W.mats.length; i++) n[W.mats[i].k]++;
    for (let k = 0; k < 2; k++) if (n[k] < MAT[k].cap * area) scatter(W, k);
  }
  if (G.on) G.on('death', function (c) { const W = G.W; if (!W || !W.mats || !c || G.rand() > 0.4) return; let n = 0; for (let i = 0; i < W.mats.length; i++) if (W.mats[i].k === 2) n++; if (n < MAT[2].cap * Math.sqrt(W.ww * W.wh / 3.3e6)) W.mats.push({ x: clamp(c.x, 20, W.ww - 20), y: clamp(c.y, 20, W.wh - 20), k: 2, s: G.rand() }); });

  // ── the plan of pieces ──
  // a piece: { s: shape, x, y (the middle of its foot; y grows upward as it goes more negative), w, h, m: material, c: [hue shift, sat, light], st: 0 not there · 1 set · 2 coloured }
  function plan(o) {
    const r = G.rng ? G.rng((o.seed >>> 0) + 17) : Math.random, S = o.S, P = [], sp = o.spiky > 0.5, rich = o.brain;
    const add = function (s, x, y, w, h, m, c) { P.push({ s: s, x: x, y: y, w: w, h: h, m: m, c: c, st: 0 }); };
    const roof = function (x, y, w, h) { if (sp) add('tri', x, y, w, h * 1.5, 1, [20, 60, 52]); else add('dome', x, y, w, h, 2, [20, 62, 58]); };
    if (o.type === 'wall') {
      const N = 10 + Math.round(4 * rich), rx = S * 1.05, ry = S * 0.62, posts = [];
      for (let i = 0; i < N; i++) { const a = -Math.PI / 2 + (i + 0.5) / N * TAU, gate = Math.abs(a - Math.PI / 2) < 0.36; posts.push([Math.cos(a) * rx, Math.sin(a) * ry, gate]); }
      posts.sort(function (p, q) { return p[1] - q[1]; });      // the far side first
      posts.forEach(function (p) { const h = S * (p[2] ? 0.62 : 0.44) * (0.9 + 0.2 * r()), w = S * 0.2; add('rect', p[0], p[1], w, h, 0, [0, 22, 46]); if (sp) add('tri', p[0], p[1] - h, w * 1.1, w * 0.9, 1, [20, 60, 52]); else add('dome', p[0], p[1] - h, w * 1.15, w * 0.6, 2, [20, 62, 60]); });
      add('beam', 0, ry - S * 0.6, S * 0.74, S * 0.08, 1, [35, 65, 58]); add('flag', 0, ry - S * 0.68, S * 0.2, S * 0.3, 1, [0, 85, 60]);
    } else if (o.type === 'huts') {
      const N = 3 + Math.round(2 * rich), huts = [];
      for (let i = 0; i < N; i++) { const a = Math.PI * (0.15 + 0.7 * i / (N - 1)); huts.push([Math.cos(a) * S * 0.95, -Math.sin(a) * S * 0.32 * (i % 2 ? 0.4 : 1)]); }
      huts.sort(function (p, q) { return p[1] - q[1]; });
      huts.forEach(function (p) { const w = S * (0.36 + 0.1 * r()), h = w * 0.62; add('rect', p[0], p[1], w, h, 0, [0, 24, 50]); roof(p[0], p[1] - h, w * 1.25, w * 0.6); add('door', p[0], p[1], w * 0.3, h * 0.62, 1, [0, 30, 16]); });
      add('circ', 0, S * 0.14, S * 0.28, S * 0.28, 2, [40, 75, 62]);      // the store in the middle
      if (rich > 0.5) add('flag', 0, -S * 0.14, S * 0.16, S * 0.26, 1, [0, 85, 60]);
    } else if (o.type === 'spire') {
      const N = 4 + Math.round(3 * rich); let y = 0, w = S * 0.5;
      add('rect', 0, 0, w * 1.5, S * 0.14, 0, [0, 20, 40]); y -= S * 0.14;
      for (let i = 0; i < N; i++) { const h = S * 0.24; add('rect', 0, y, w, h, 0, [0, 24, 48 + 3 * i]); if (i % 2) add('circ', 0, y - h * 0.5, w * 0.24, w * 0.24, 2, [45, 80, 68]); y -= h; w *= 0.88; }
      roof(0, y, w * 1.3, w * 0.7); add('lamp', 0, y - (sp ? w * 1.2 : w * 0.75), S * 0.16, S * 0.16, 2, [50, 95, 72]);
      for (let i = 0; i < 4; i++) add('rect', (i - 1.5) * S * 0.42, S * 0.1, S * 0.14, S * 0.12, 0, [0, 18, 44]);
    } else {      // a hall
      const tiers = 2 + Math.round(2 * rich), bh = S * 0.25, W0 = S * 1.15;
      for (let i = 0; i < tiers; i++) { const n = Math.max(1, 4 - i), tw = W0 * (1 - 0.2 * i), bw = tw / n; for (let k = 0; k < n; k++) add('rect', -tw / 2 + bw * (k + 0.5), -i * bh, bw * 0.96, bh, 0, [0, 24, 46 + 4 * i + 3 * (k % 2)]); }
      add('door', 0, 0, W0 * 0.2, bh * 0.82, 1, [0, 30, 16]);
      for (let i = 1; i < tiers; i++) { const tw = W0 * (1 - 0.2 * i); add('circ', -tw * 0.25, -i * bh - bh * 0.5, bh * 0.3, bh * 0.3, 2, [45, 80, 68]); add('circ', tw * 0.25, -i * bh - bh * 0.5, bh * 0.3, bh * 0.3, 2, [45, 80, 68]); }
      const topW = W0 * (1 - 0.2 * (tiers - 1)); roof(0, -tiers * bh, topW * 1.12, topW * 0.42);
      if (rich > 0.45) [-1, 1].forEach(function (sd) { const x = sd * W0 * 0.62; add('rect', x, 0, S * 0.2, bh * 1.5, 0, [0, 22, 44]); roof(x, -bh * 1.5, S * 0.26, S * 0.16); });
      add('flag', 0, -tiers * bh - (sp ? topW * 0.6 : topW * 0.42), S * 0.18, S * 0.3, 1, [0, 85, 60]);
    }
    return P;
  }
  const count = function (bp) { let a = 0, b = 0; for (let i = 0; i < bp.P.length; i++) { if (bp.P[i].st > 0) a++; if (bp.P[i].st > 1) b++; } return [a, b, bp.P.length]; };
  G.buildCount = function (o) { return o && o.bp ? count(o.bp) : null; };
  /** the plan of what a kind is about to build */
  function blueprint(d) {
    const W = G.W, r = d.result || {}, m = Math.min(W.ww, W.wh), sp = G.speciesById(d.sp), f = sp && sp.rep ? sp.rep.f : null;
    let spiky = 0; if (f) { (f.rules || []).forEach(function (q) { if (q.k === 2 || q.k === 7) spiky = 1; }); if (f.crest > 0.25) spiky = 1; }
    let h = 0, n = 0; for (let i = 0; i < W.cre.length; i++) if (W.cre[i].sp === d.sp) { h += W.cre[i].g.h; n++; }
    const o = { seed: (G.hash ? G.hash(String(d.title) + d.id) : d.id * 7919) >>> 0, type: r.solid ? 'wall' : r.feed > 0.05 ? 'huts' : r.pull > 0.1 ? 'spire' : 'hall', S: clamp((r.size || 0.08) * m, 55, 118), hue: d.hue || 50, spiky: spiky, brain: clamp((n ? h / n : 0) / 7, 0, 1) };
    o.P = plan(o); return o;
  }
  G.blueprintFrom = function (o, states) { const bp = { seed: o.seed, type: o.type, S: o.S, hue: o.hue, spiky: o.spiky, brain: o.brain }; bp.P = plan(bp); if (typeof states === 'string') for (let i = 0; i < bp.P.length; i++) bp.P[i].st = clamp(+states.charAt(i) || 0, 0, 2); return bp; };
  // what the creatures build is drawn by the game, so no picture is asked of the AI for it
  if (G.figureFor) { const f0 = G.figureFor; G.figureFor = function (info, typed) { if (info && /Built by small pond creatures/.test(String(info.note || ''))) return Promise.resolve(null); return f0(info, typed); }; }

  // ── the work of building ──
  const baseOf = function (o) { return [o.x, o.y + (o.bp ? o.bp.S * 0.45 : 30)]; };
  function buildStep(W, d, dt) {
    if (!d.bp) { d.bp = blueprint(d); const mine = (W.works || []).filter(function (w) { return w.bp && w.sp === d.sp && !w.fall; }); if (mine.length) { const w0 = mine[0], k = mine.length, side = k % 2 ? 1 : -1, gap = (w0.bp.S + d.bp.S) * 1.25 * Math.ceil(k / 2); d.x = clamp(w0.x + side * gap, 120, W.ww - 120); d.y = clamp(w0.y + (k % 3 - 1) * 14, 120, W.wh - 90); d.beside = w0.name; } }
    const bp = d.bp, P = bp.P, base = baseOf(d), M = []; for (let i = 0; i < W.cre.length; i++) if (W.cre[i].deedId === d.id && !W.cre[i].dead) M.push(W.cre[i]);
    const busyP = {}, busyM = new Set(); M.forEach(function (c) { const j = c.bj; if (j && j.d === d.id) { if (j.p >= 0) busyP[j.p] = 1; if (j.mat) busyM.add(j.mat); } });
    d.wait = '';
    // any of the kind whose own brain says HELP (action 6) and who is near joins the work
    d.helpT = (d.helpT || 0) - dt; if (d.helpT <= 0 && M.length < 22) { d.helpT = 1; for (let k = 0; k < 8; k++) { const c = W.cre[(G.rand() * W.cre.length) | 0]; if (c.dead || c.deedId || c.sp !== d.sp || !(c.out[6] > 0.55) || Math.hypot(c.x - d.x, c.y - d.y) > 700) continue; c.deedId = d.id; c.deedJ = M.length; c.helper = true; M.push(c); d.helpers = (d.helpers || 0) + 1; } }
    for (let k = 0; k < M.length; k++) {
      const c = M[k]; let j = c.bj && c.bj.d === d.id ? c.bj : null;
      if (j && j.ph === 'fetch' && W.mats.indexOf(j.mat) < 0) j = null;                       // somebody else took it
      if (j && j.p >= 0 && P[j.p].st >= (j.ph === 'paint' ? 2 : 1)) j = null;                   // already done
      if (!j) {
        let pi = -1; for (let i = 0; i < P.length; i++) if (P[i].st === 0 && !busyP[i]) { pi = i; break; }      // from the ground up
        if (pi >= 0) {
          let best = null, bd = 1e12, any = null, ad = 1e12; const sy = G.shoreY ? G.shoreY(W) : 0; for (let i = 0; i < W.mats.length; i++) { const q = W.mats[i]; if (busyM.has(q) || (!c.ph.lungs && q.y < sy + 6)) continue; const dd = (q.x - c.x) * (q.x - c.x) + (q.y - c.y) * (q.y - c.y); if (dd < ad) { ad = dd; any = q; } if (q.k === P[pi].m && dd < bd) { bd = dd; best = q; } }
          const mat = best || any;      // the right stuff if there is any; else they make do with what there is
          if (mat) { j = { d: d.id, ph: 'fetch', p: pi, mat: mat }; busyP[pi] = 1; busyM.add(mat); } else d.wait = MAT[P[pi].m].id;
        } else { for (let i = 0; i < P.length; i++) if (P[i].st === 1 && !busyP[i]) { pi = i; break; } if (pi >= 0) { j = { d: d.id, ph: 'paint', p: pi, t: 0 }; busyP[pi] = 1; } }
        c.bj = j;
      }
      c.carry = false; c.haul = j && j.ph === 'bring' ? j.k : -1;
      if (!j) continue;      // nothing for this one just now: it stands by, as the plan has it
      const pc = P[j.p], tx = j.ph === 'fetch' ? j.mat.x : base[0] + pc.x + (c.id % 2 ? 1 : -1) * (pc.w * 0.5 + c.ph.r + 6), ty = j.ph === 'fetch' ? j.mat.y : base[1] + Math.min(0, pc.y * 0.25) + 4;
      const dx = tx - c.x, dy = ty - c.y, dist = Math.hypot(dx, dy) || 1, grip = c.ph.hands || c.ph.limbs > 0 ? 0.8 : 0.5, sp = Math.min(c.ph.speed * 2.4 * (j.ph === 'bring' ? grip : 1), dist * 2.4)      /* they go about it with a will */, k2 = Math.min(1, dt * 5);
      c.vx += (dx / dist * sp - c.vx) * k2; c.vy += (dy / dist * sp - c.vy) * k2; if (dist > 8) c.ang = Math.atan2(dy, dx);
      if (j.ph === 'fetch' && dist < c.ph.r + 12) { const at = W.mats.indexOf(j.mat); if (at >= 0) W.mats.splice(at, 1); j.k = j.mat.k; j.mat = null; j.ph = 'bring'; }
      else if (j.ph === 'bring' && (dist < 46 || (j.bt = (j.bt || 0) + dt) > 14)) { pc.st = 1; pc.um = j.k; pc.t0 = W.t; c.bj = null; c.haul = -1; d.placed = (d.placed || 0) + 1; if (G.learn) G.learn(c, 0.35); G.emit('build-piece', d, pc, c); }
      else if (j.ph === 'paint' && dist < 50) { j.t += dt; c.vx *= 0.6; c.vy *= 0.6; if (j.t > 0.7) { pc.st = 2; pc.t0 = W.t; c.bj = null; G.emit('build-piece', d, pc, c); } }
    }
    const n = count(bp); d.progress = (n[0] + n[1]) / (2 * n[2]);
    // the plan gives the building so long; they are given as long again and more to finish what they began
    const st = d.steps[d.i]; if (d.progress < 1 && d.t > st.secs - 1 && (d.over = (d.over || 0) + dt) < st.secs * 3 + 60) d.t = st.secs - 1;
  }
  // what stands: kept up while its builders' kind lives, crumbling when it is gone or when nature strikes it down
  function worksStep(W, dt) {
    const Wk = W.works; if (!Wk || !Wk.length) return;
    for (let i = Wk.length - 1; i >= 0; i--) {
      const w = Wk[i]; if (!w.bp) continue;
      w.until = W.t + 9999;      // it does not run out by the clock
      w.upT = (w.upT || 0) - dt; if (w.upT > 0) continue; w.upT = w.fall ? 0.12 : 5;
      let kin = 0; for (let k = 0; k < W.cre.length; k++) if (W.cre[k].sp === w.sp && !W.cre[k].dead) kin++;
      const P = w.bp.P;
      // other kinds: a fierce band of strangers at a building that its own kind is not there to hold knocks it about and takes what they find
      { let foes = 0, mine = 0, who = 0; const S = w.bp.S; for (let k = 0; k < W.cre.length; k++) { const c = W.cre[k]; if (c.dead) continue; const dd = Math.hypot(c.x - w.x, c.y - w.y); if (c.sp === w.sp) { if (dd < S * 2.4) mine++; } else if (dd < S * 1.6 && (c.ph.aggro || 0) > 0.38) { foes++; who = c.sp; c.E = Math.min(c.ph.Emax, c.E + 2); } }
        if (foes >= 3 && foes > mine && !w.fall) { for (let k = P.length - 1; k >= 0; k--) if (P[k].st > 0) { P[k].st = 0; G.emit('build-fall', w, P[k]); break; } const sp = G.speciesById(who); w.hitBy = 'A band of ' + (sp ? sp.name : 'strangers'); w.hitGen = W.gen; w.dmg = 1; if (!w.raided && G.mode === 'play' && G.log) { w.raided = true; G.log('sel', w.name + ' is raided', w.hitBy + ' is knocking it about while its builders are away.'); } continue; } }
      if (w.shun && !w.fall) { w.shunT = (w.shunT || 0) + 1; if (w.shunT % 3 === 0) { for (let k = P.length - 1; k >= 0; k--) if (P[k].st > 0) { P[k].st = 0; G.emit('build-fall', w, P[k]); break; } } if (count(w.bp)[0] === 0) { Wk.splice(i, 1); G.emit('work-gone', w); } continue; }      /* the one the watcher found spoils the place is left to fall */
      w.lone = kin < 3 ? (w.lone || 0) + 1 : 0;      /* (kinds are sorted afresh each autumn: a short gap in the count is not the end of them) */
      if (w.fall || w.lone > 8) { let top = -1; for (let k = P.length - 1; k >= 0; k--) if (P[k].st > 0) { top = k; break; } if (top >= 0) { P[top].st = 0; G.emit('build-fall', w, P[top]); if (!w.fall && !w.ruin) { w.ruin = true; G.emit('work-ruin', w); } } }
      else if (!(w.dmg > 0 && W.gen === w.hitGen)) { for (let k = 0; k < P.length; k++) if (P[k].st < 2) { P[k].st++; P[k].t0 = W.t; break; } }      // its keepers mend and colour it
      const n = count(w.bp);
      if (n[0] === 0) { Wk.splice(i, 1); G.emit('work-gone', w); continue; }
      const F = W.fields || []; for (let k = 0; k < F.length; k++) if (F[k].id === w.field) { if (n[0] >= n[2] * 0.6 && !w.fall) F[k].life = Math.max(F[k].life, 30); else F[k].life = Math.min(F[k].life, 6); }      // it does what it was built for while most of it stands
    }
  }
  /** nature strikes a building down: it falls piece by piece */
  G.razeWork = function (w) { if (w && w.bp) { w.fall = true; w.upT = 0; } };
  if (G.on) {
    G.on('deed-end', function (d, how, made) { if (made && d.bp) { made.bp = d.bp; made.sp = d.sp; made.until = (G.W ? G.W.t : 0) + 9999; } });
    G.on('new-pond', function () { if (G.W) G.W.mats = null; });
  }
  { const step0 = G.step; G.step = function (dt) { step0(dt); const W = G.W; if (!W || W.title) return; matsStep(W, dt); const d = W.deed; if (d && d.result && d.steps[d.i] && d.steps[d.i].do === 'build') buildStep(W, d, dt); worksStep(W, dt); }; }

  // ── seen ──
  if (typeof document === 'undefined') return;
  // ── the pond as a place ──
  // Now and then (every thirty generations, and only once the pond holds two buildings or more) the watcher is shown the whole pond, drawn small, and says
  // how well it hangs together as a place and which building, if any, spoils it. That one is no longer kept up, and falls. So order is not laid down:
  // what looks right is what lasts. One look, about a third of a cent.
  function picture(W) {
    const cw = 720, k = cw / W.ww, ch = Math.round(W.wh * k), cv = document.createElement('canvas'); cv.width = cw; cv.height = ch; const x = cv.getContext('2d'), sy = G.shoreY ? G.shoreY(W) : 0;
    const g = x.createLinearGradient(0, 0, 0, ch); g.addColorStop(0, '#1d5a66'); g.addColorStop(1, '#0c2536'); x.fillStyle = g; x.fillRect(0, 0, cw, ch); x.fillStyle = '#7d8a55'; x.fillRect(0, 0, cw, sy * k);
    x.save(); x.scale(k, k); for (let i = 0; i < W.cre.length; i++) { const c = W.cre[i]; x.fillStyle = hsl(c.g.f ? c.g.f.hue : 200, 80, 68); x.beginPath(); x.arc(c.x, c.y, Math.max(5, c.ph.r * 0.8), 0, TAU); x.fill(); }
    const Wk = (W.works || []).filter(function (w) { return w.bp; }); Wk.forEach(function (w) { G.drawBlueprint(x, w, false); }); x.restore();
    x.font = '700 13px system-ui, sans-serif'; x.textAlign = 'center'; Wk.forEach(function (w) { const tx = w.x * k, ty = (w.y - w.bp.S * 1.4) * k; x.fillStyle = 'rgba(0,0,0,0.6)'; x.fillRect(tx - 60, ty - 12, 120, 17); x.fillStyle = '#fff'; x.fillText(w.name.slice(0, 18), tx, ty + 1); });
    try { return cv.toDataURL('image/jpeg', 0.8).split(',')[1] || null; } catch (e) { return null; }
  }
  let asking = false;
  G.placeLook = function (force) {
    const W = G.W; if (!W || W.title || asking || G.mode !== 'play') return false;
    const Wk = (W.works || []).filter(function (w) { return w.bp && !w.fall; }); if (Wk.length < 2 || (!force && W.gen - (W.placeGen === undefined ? -99 : W.placeGen) < 30)) return false;
    if (!(G.host && G.host.ready && G.host.caps && G.host.caps.ai && G.ai.provider === 'server') || !G.ai.allow('judge')) return false;
    const img = picture(W); if (!img) return false; asking = true; W.placeGen = W.gen;
    G.host.call('ai.judge', { image: img, mime: 'image/jpeg', place: 1, buildings: Wk.map(function (w) { return w.name; }), model: G.ai.model || undefined }, 60000).then(function (r) {
      asking = false; G.ai.tally('judge', r && r.source, r && r.usd); if (G.W !== W || !r || !r.place) return;
      const p = r.place; W.place = { order: clamp(+p.order || 0, 0, 1), why: String(p.why || '').replace(/[<>]/g, '').slice(0, 160), worst: String(p.worst || ''), gen: W.gen };
      const bad = W.place.order < 0.6 && W.place.worst ? Wk.filter(function (w) { return w.name === W.place.worst; })[0] : null; if (bad) bad.shun = true;
      if (G.log) G.log('disc', 'The pond as a place: ' + (W.place.order * 10).toFixed(0) + ' of 10', W.place.why + (bad ? ' ' + bad.name + ' spoils it: it will no longer be kept up.' : ''));
      if (G.note) G.note('The watcher looked at the whole pond', (W.place.order * 10).toFixed(0) + ' of 10 as a place. ' + W.place.why);
    }, function () { asking = false; });
    return true;
  };
  G.on('scored', function () { try { G.placeLook(false); } catch (e) { console.error(e); } });
  function piece(ctx, p, hue, t) {
    const age = t - (p.t0 || -9), pop = age < 0.3 ? 0.6 + 0.4 * (age / 0.3) + 0.15 * Math.sin(age * 10.5) : 1, mc = MAT[p.um === undefined ? p.m : p.um].col;
    const raw = hsl(mc[0], mc[1], mc[2]), fin = p.c[2] < 20 ? hsl(hue, 30, p.c[2]) : hsl(hue + p.c[0], p.c[1], p.c[2]), fill = p.st > 1 ? fin : raw, w = p.w * pop, h = p.h * pop;
    ctx.fillStyle = fill; ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.beginPath();
    if (p.s === 'rect') { G.roundRect(ctx, p.x - w / 2, p.y - h, w, h, Math.min(w, h) * 0.16); }
    else if (p.s === 'tri') { ctx.moveTo(p.x - w / 2, p.y); ctx.lineTo(p.x, p.y - h); ctx.lineTo(p.x + w / 2, p.y); ctx.closePath(); }
    else if (p.s === 'dome') { ctx.moveTo(p.x - w / 2, p.y); ctx.ellipse(p.x, p.y, w / 2, h, 0, Math.PI, TAU); ctx.closePath(); }
    else if (p.s === 'circ') { ctx.arc(p.x, p.y - h / 2, w / 2, 0, TAU); }
    else if (p.s === 'door') { ctx.moveTo(p.x - w / 2, p.y); ctx.lineTo(p.x - w / 2, p.y - h + w / 2); ctx.arc(p.x, p.y - h + w / 2, w / 2, Math.PI, TAU); ctx.lineTo(p.x + w / 2, p.y); ctx.closePath(); }
    else if (p.s === 'beam') { G.roundRect(ctx, p.x - w / 2, p.y - h, w, h, h * 0.4); }
    else if (p.s === 'lamp') { if (p.st > 1) { const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, w * 3); g.addColorStop(0, hsl(hue + 50, 95, 75, 0.5 + 0.2 * Math.sin(t * 3))); g.addColorStop(1, hsl(hue + 50, 95, 75, 0)); ctx.fillStyle = g; ctx.arc(p.x, p.y, w * 3, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.fillStyle = fill; } ctx.arc(p.x, p.y, w / 2, 0, TAU); }
    else if (p.s === 'flag') { ctx.moveTo(p.x, p.y); ctx.lineTo(p.x, p.y - h); ctx.stroke(); ctx.beginPath(); const fl = Math.sin(t * 5 + p.x) * w * 0.12; ctx.moveTo(p.x, p.y - h); ctx.lineTo(p.x + w + fl, p.y - h + w * 0.3); ctx.lineTo(p.x, p.y - h + w * 0.6); ctx.closePath(); }
    ctx.fill(); ctx.stroke();
    if (p.st > 1 && (p.s === 'rect' || p.s === 'dome') && w > 14) { ctx.fillStyle = 'rgba(255,255,255,0.13)'; ctx.beginPath(); if (p.s === 'rect') ctx.rect(p.x - w / 2 + 2.5, p.y - h + 2.5, w * 0.3, h - 5); else ctx.ellipse(p.x - w * 0.16, p.y - h * 0.5, w * 0.12, h * 0.3, 0, 0, TAU); ctx.fill(); }
  }
  /** a building (being raised, or standing): the ground it stands on, and every piece that is there */
  G.drawBlueprint = function (ctx, o, building) {
    const bp = o.bp; if (!bp) return; const b = baseOf(o), t = G.W.t, P = bp.P, S = bp.S;
    ctx.save(); ctx.translate(b[0], b[1]);
    ctx.fillStyle = 'rgba(8,16,26,0.28)'; ctx.beginPath(); ctx.ellipse(0, S * 0.1, S * (bp.type === 'wall' ? 1.25 : 0.95), S * (bp.type === 'wall' ? 0.74 : 0.22), 0, 0, TAU); ctx.fill();
    if (building) { ctx.setLineDash([4, 5]); ctx.lineWidth = 1.2; ctx.strokeStyle = hsl(bp.hue, 70, 78, 0.4); for (let i = 0; i < P.length; i++) if (P[i].st === 0) { const p = P[i]; ctx.beginPath(); if (p.s === 'circ' || p.s === 'lamp') ctx.arc(p.x, p.y - (p.s === 'circ' ? p.h / 2 : 0), p.w / 2, 0, TAU); else ctx.rect(p.x - p.w / 2, p.y - p.h, p.w, p.h); ctx.stroke(); } ctx.setLineDash([]); }      // where the pieces still to come will go
    for (let i = 0; i < P.length; i++) if (P[i].st > 0) piece(ctx, P[i], bp.hue, t);
    ctx.restore();
  };
  function matDraw(ctx, q, t) {
    const c = MAT[q.k].col; ctx.strokeStyle = INK; ctx.lineWidth = 1.3;
    if (q.k === 0) { ctx.fillStyle = hsl(c[0], c[1], c[2] - 8 + 16 * q.s); ctx.beginPath(); ctx.ellipse(q.x, q.y, 6.5 + 2 * q.s, 4.6 + 1.5 * q.s, q.s * 3, 0, TAU); ctx.fill(); ctx.stroke(); }
    else if (q.k === 1) { ctx.strokeStyle = hsl(c[0], c[1] + 10, c[2] - 14); ctx.lineWidth = 2; ctx.lineCap = 'round'; for (let k = -1; k <= 1; k++) { const sw = Math.sin(t * 1.3 + q.s * 9 + k) * 1.8; ctx.beginPath(); ctx.moveTo(q.x + k * 3, q.y + 6); ctx.quadraticCurveTo(q.x + k * 3.5, q.y - 3, q.x + k * 5 + sw, q.y - 10 - 3 * q.s); ctx.stroke(); } }
    else { ctx.fillStyle = hsl(c[0], c[1], c[2]); ctx.beginPath(); ctx.arc(q.x, q.y, 5.5, Math.PI, TAU); ctx.lineTo(q.x - 5.5, q.y); ctx.fill(); ctx.stroke(); ctx.beginPath(); for (let k = -1; k <= 1; k++) { ctx.moveTo(q.x, q.y); ctx.lineTo(q.x + k * 3.4, q.y - 4.6); } ctx.stroke(); }
  }
  // the materials lie under everything else that is drawn in the water; what a builder hauls rides above its head
  { const f0 = G.drawFields; G.drawFields = function (ctx) {
      const W = G.W;
      if (W && !W.title && W.mats && G.mode === 'play') { const v = G.view, s = v.scale * v.dpr; if (v.scale > 0.22) { const x0 = -v.ox / v.scale - 20, y0 = -v.oy / v.scale - 20, x1 = x0 + v.w / v.scale + 40, y1 = y0 + v.h / v.scale + 40, t = G.rt || 0; ctx.save(); ctx.setTransform(s, 0, 0, s, v.ox * v.dpr, v.oy * v.dpr); for (let i = 0; i < W.mats.length; i++) { const q = W.mats[i]; if (q.x > x0 && q.x < x1 && q.y > y0 && q.y < y1) matDraw(ctx, q, t); } ctx.restore(); } }
      if (f0) f0(ctx);
    }; }
  G.drawHauls = function (ctx) { const W = G.W, d = W && W.deed; if (!d) return; const t = G.rt || 0; for (let i = 0; i < W.cre.length; i++) { const c = W.cre[i]; if (c.deedId !== d.id || !(c.haul >= 0) || c.dead) continue; matDraw(ctx, { x: c.x, y: c.y - c.ph.r * 2.9 - 5 + Math.sin(t * 7 + c.id) * 1.2, k: c.haul, s: (c.id % 10) / 10 }, t); } };
})();
