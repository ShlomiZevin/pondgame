// ── Deeds: a kind of creature decides to do something, together ──
// Now and then one kind in the pond takes something into its head: to build, to hold a council, to march on what hunts it,
// to make war or peace with another kind, to set off exploring. WHAT, and WHY, is made up by the AI from who they are and
// what is going on around them; nothing is picked from a list. The game then acts the plan out, step by step: the members
// really go where the plan sends them (gather, ring, line, carry, build, charge, guard, scatter), shouting their own cries,
// and if they see it through, what they made stays in the pond: a real region that does what it was built to do, drawn by
// the AI from the plan's own words. It works beside the simulation: after every step it steers those who joined.
(function () {
  'use strict';
  const clamp = G.clamp, TAU = 6.2832;
  if (G.ai) { G.ai.gaps.deed = 60000; G.ai.caps.deed = 40; G.ai.LABEL.deed = 'What the creatures decide to do together'; }
  const WORDS = { gather: 'gathering', circle: 'in council', line: 'forming up', carry: 'fetching and carrying', build: 'building', charge: 'charging', guard: 'standing guard', scatter: 'setting off' };
  const live = function () { return G.mode === 'play' && !G.catching && G.W && !G.W.title && G.host && G.host.ready && G.host.caps && G.host.caps.ai && G.ai.provider === 'server' && G.ai.hasFuel(); };
  const spByName = function (name) { const W = G.W, low = String(name || '').toLowerCase(); let best = null; for (let i = 0; i < W.species.length; i++) { const s = W.species[i]; if (s.extinct || !s.n) continue; if (s.name.toLowerCase() === low) return s; if (low && (s.name.toLowerCase().indexOf(low) >= 0 || low.indexOf(s.name.toLowerCase()) >= 0)) best = s; } return best; };
  const members = function (d) { const out = [], C = G.W.cre; for (let i = 0; i < C.length; i++) if (C[i].deedId === d.id && !C[i].dead) out.push(C[i]); return out; };

  // where a name in the plan is, in the pond: a thing, a wall or region, a kind
  function whereIs(name) {
    const W = G.W, low = String(name || '').toLowerCase(); if (!low) return null;
    for (let i = 0; i < W.zones.length; i++) if (String(W.zones[i].word).toLowerCase() === low) return { x: W.zones[i].x, y: W.zones[i].y, zone: W.zones[i] };
    const F = W.fields || []; for (let i = 0; i < F.length; i++) if (String(F[i].name).toLowerCase() === low) { const f = F[i]; return { x: (f.shape === 'circle' || f.shape === 'ring' ? f.x : f.across === 'horizontal' ? 0.5 : f.at) * W.ww, y: (f.shape === 'circle' || f.shape === 'ring' ? f.y : f.across === 'horizontal' ? f.at : 0.5) * W.wh, field: f }; }
    const s = spByName(name); if (s) { let x = 0, y = 0, n = 0; for (let i = 0; i < W.cre.length; i++) if (W.cre[i].sp === s.id) { x += W.cre[i].x; y += W.cre[i].y; n++; } if (n) return { x: x / n, y: y / n, kind: s }; }
    return null;
  }

  /** the pond as the kinds in it would be described to whoever decides for them */
  function brief() {
    const W = G.W, o = G.worldBrief ? G.worldBrief() : {};
    o.kinds = W.species.filter(function (s) { return !s.extinct && s.n >= 5 && s.rep; }).sort(function (a, b) { return b.n - a.n; }).slice(0, 5).map(function (s) { const one = W.cre.filter(function (c) { return c.sp === s.id; })[0]; return { name: s.name, count: s.n, looks: G.form.kind(s.rep.f).full + ': ' + G.form.facts(s.rep.f).slice(0, 5).join('; '), ways: one ? (one.ph.aggro > 0.38 ? 'fierce, attacks other kinds' : 'peaceful') + (one.ph.lungs ? ', can walk the shore' : '') + (one.ph.mv ? ', one of them carries the marvel ' + one.ph.mv.name : '') : '' }; });
    o.walls = (W.fields || []).map(function (f) { return f.name; });
    o.built = (W.works || []).map(function (w) { return w.name; });
    o.doneBefore = (W.deedLog || []).slice(-6);
    return o;
  }

  let asking = false;
  G.deedAsk = function () {
    const W = G.W; if (!W || W.deed || asking || !live()) return false;
    if (!G.ai.allow('deed')) return false;
    asking = true;
    G.host.call('deed', { pond: brief(), model: G.ai.model || undefined }, 70000).then(function (r) {
      asking = false; G.ai.tally('deed', r && r.source, r && r.usd);
      if (G.W !== W || W.deed || !r || !r.deed) return;
      begin(r.deed);
    }, function () { asking = false; });
    return true;
  };
  // once a generation: perhaps somebody takes something into their head
  { let rt0 = -1, idle = 0; setInterval(function () { const W = G.W, rt = G.rt || 0; if (!W || W.title || G.mode !== 'play' || rt === rt0) { rt0 = rt; return; } const d = Math.min(20, Math.max(0, rt - rt0)); rt0 = rt;      // only time really played counts
    if (W.deed || asking) { idle = 0; return; } idle += d;
    if (idle < 100 || W.gen < 5 || W.cre.length < 14) return;
    if (G.rand() < 0.5 && G.deedAsk()) idle = 0; }, 10000); }

  function begin(raw) {
    const W = G.W, sp = spByName(raw.kind) || W.species.filter(function (s) { return !s.extinct && s.n > 0; }).sort(function (a, b) { return b.n - a.n; })[0];
    if (!sp) return;
    const pool = W.cre.filter(function (c) { return c.sp === sp.id && !c.dead && !c.deedId; });
    if (pool.length < 4) return;
    const d = { id: (W.nextDeed = (W.nextDeed || 0) + 1), title: raw.title, say: raw.say, what: raw.what || '', why: raw.why || '', sp: sp.id, kind: sp.name, hue: sp.hue || 50, steps: raw.steps, i: 0, t: 0, cryT: 0, target: raw.target, win: raw.win, result: raw.result, progress: 0, gen: W.gen };
    const n = Math.min(raw.steps.some(function (q) { return q.do === 'build'; }) ? 14 : 22, Math.max(4, Math.round(pool.length * clamp(raw.share, 0.3, 1))));          // a band, not the whole kind: the rest go on living
    pool.sort(function () { return G.rand() - 0.5; }).slice(0, n).forEach(function (c, j) { c.deedId = d.id; c.deedJ = j; });
    d.n0 = Math.min(n, pool.length);
    // where
    let at = raw.place && raw.place.near && raw.place.near !== 'self' ? whereIs(raw.place.near) : null;
    if (!at && raw.place && raw.place.x !== undefined && !raw.place.near) at = { x: raw.place.x * W.ww, y: raw.place.y * W.wh };
    if (!at) { let x = 0, y = 0; const M = members(d); M.forEach(function (c) { x += c.x; y += c.y; }); at = { x: x / M.length, y: y / M.length }; }
    d.x = clamp(at.x + (at.zone || at.field ? 90 : 0), 80, W.ww - 80); d.y = clamp(at.y, 110, W.wh - 80);
    d.buildSecs = d.steps.reduce(function (s, q) { return s + (q.do === 'build' ? q.secs : 0); }, 0);
    W.deed = d;
    G.emit('deed', d);
  }

  function finish(d, how) {
    const W = G.W; if (W.deed !== d) return;
    W.deed = null;
    for (let i = 0; i < W.cre.length; i++) if (W.cre[i].deedId === d.id) { W.cre[i].deedId = 0; W.cre[i].cryT = 0; }
    (W.deedLog = W.deedLog || []).push(d.title); (W.deedPast = W.deedPast || []).push({ title: d.title, kind: d.kind, hue: d.hue, say: d.say, what: d.what, why: d.why, how: how, gen: W.gen, x: d.x, y: d.y }); if (W.deedPast.length > 5) W.deedPast.shift(); if (W.deedLog.length > 12) W.deedLog.shift();
    let made = null;
    if (how === 'done' && d.result && G.addField && G.cleanFields) {
      const r = d.result, m = Math.min(W.ww, W.wh);
      const f = G.addField(G.cleanFields([{ name: r.name, stuff: r.stuff, shape: r.solid ? 'ring' : r.shape, x: d.x / W.ww, y: d.y / W.wh, r: r.size, width: 0.1, solid: r.solid, feed: r.feed, slow: r.slow, hurt: Math.min(r.hurt, 0.5), pull: r.pull, life: r.life }])[0]);
      if (f) f.spare = d.sp;                                                  // it is theirs: it does not harm them
      made = { name: r.name, looks: r.looks, x: d.x, y: d.y, r: Math.min(r.size * m, 150), until: W.t + r.life, by: d.kind, hue: d.hue, field: f ? f.id : 0 };
      (W.works = W.works || []).push(made); if (W.works.length > 6) W.works.shift();
      if (G.figureFor) G.figureFor({ name: r.name, note: r.looks + ' Built by small pond creatures.', hue: d.hue }, r.looks).then(function (fig) { made.fig = fig || null; });
    }
    G.emit('deed-end', d, how, made);
  }

  function deedStep(dt) {
    const W = G.W, d = W.deed, m = Math.min(W.ww, W.wh);
    let M = members(d);
    const rt = dt / Math.max(1, G.speed || 1);                               // the plan keeps the time of whoever is watching, not of the pond: sped up, it is still there to be seen
    d.joinT = (d.joinT || 0) - dt;
    if (M.length < d.n0 && d.joinT <= 0) { d.joinT = 1.5; const used = {}; M.forEach(function (c) { used[c.deedJ] = 1; }); for (let i = 0; i < W.cre.length && M.length < d.n0; i++) { const c = W.cre[i]; if ((c.sp !== d.sp && c.deedKin !== d.id && !(d.thin > 6)) || c.dead || c.deedId) continue; let j = 0; while (used[j]) j++; used[j] = 1; c.deedId = d.id; c.deedJ = j; M.push(c); } }
    const n = M.length;
    if (n < Math.min(d.n0, 6)) { d.thin = (d.thin || 0) + rt; if (n < 2) { if (d.thin > 30) finish(d, 'lost'); return; } } else d.thin = 0;      // too few just now: the plan waits for hands (after a while anyone near will do) before it is dropped
    const st = d.steps[d.i], tg = d.target ? whereIs(d.target) : null;
    d.t += rt; d.cryT -= rt;
    if (d.cryT <= 0 && st.cry) { d.cryT = 1.6 + G.rand() * 1.6; const c = M[(G.rand() * n) | 0]; c.cryT = 1.9; c.cryW = st.cry; }
    let near = 0;
    for (let k = 0; k < n; k++) {
      const c = M[k], j = c.deedJ || k, a = j / Math.max(1, d.n0) * TAU;
      let gx = d.x, gy = d.y; c.carry = false;
      if (st.do === 'gather') { const R = 40 + d.n0 * 3 + (j % 3) * 26; gx += Math.cos(a) * R; gy += Math.sin(a) * R * 0.8; }
      else if (st.do === 'circle') { const R = clamp(46 + d.n0 * 3.2, 60, 170), aa = a + d.t * 0.45; gx += Math.cos(aa) * R; gy += Math.sin(aa) * R * 0.8; }
      else if (st.do === 'line') { gx += (j - d.n0 / 2) * 24 + Math.sin(d.t * 0.5) * 60; gy += Math.sin(j * 0.9 + d.t * 1.2) * 8; }
      else if (st.do === 'carry') { const u = ((d.t + j * 1.7) % 9) / 9; if (u < 0.5) { gx += Math.cos(a) * 230; gy += Math.sin(a) * 190; } else c.carry = true; }
      else if (st.do === 'build') { const R = Math.min(150, (d.result ? d.result.size * m : 60)) + 46, u = ((d.t + j * 2.3) % 12) / 12;      // they stand well back round it and take turns: a third are away fetching, so what rises in the middle can be seen
        if (u < 0.35) { gx += Math.cos(a) * (R + 170); gy += Math.sin(a) * (R + 140); } else { c.carry = u < 0.6; gx += Math.cos(a) * R; gy += Math.sin(a) * R * 0.8; } }
      else if (st.do === 'charge') { if (tg) { gx = tg.x + Math.cos(a) * 30; gy = tg.y + Math.sin(a) * 30; } }
      else if (st.do === 'guard') { gx += Math.cos(a) * 84; gy += Math.sin(a) * 70; }
      else if (st.do === 'scatter') { gx += Math.cos(a) * m * 0.44; gy += Math.sin(a) * m * 0.4; }
      gx = clamp(gx, 20, W.ww - 20); gy = clamp(gy, 30, W.wh - 20);
      const dx = gx - c.x, dy = gy - c.y, dist = Math.hypot(dx, dy) || 1, sp = Math.min(c.ph.speed * (st.do === 'charge' ? 1.5 : 1.2), dist * 2.2), k2 = Math.min(1, dt * 4);
      if (dist > 10) { c.vx += (dx / dist * sp - c.vx) * k2; c.vy += (dy / dist * sp - c.vy) * k2; c.ang = Math.atan2(dy, dx); } else { c.vx *= 0.8; c.vy *= 0.8; if (st.do === 'guard') c.ang = a; }
      if (dist < 60 || (st.do === 'build' && Math.hypot(c.x - d.x, c.y - d.y) < 260)) near++;
      if (c.E < c.ph.Emax * 0.28) c.E = c.ph.Emax * 0.28;                    // a purpose keeps them going
      c.asleep = false; c.tired = Math.min(c.tired || 0, 0.5);
      if (c.cryT > 0) c.cryT -= rt;
    }
    if (st.do === 'build' && d.buildSecs) d.progress = Math.min(1, d.progress + (0.45 + 0.75 * near / n) * rt / d.buildSecs);
    if (st.do === 'charge' && tg && near) {
      if (tg.zone && d.win !== 'befriend') { tg.zone.life -= near * 0.55 * rt; tg.zone.hit = 1; }
      else if (tg.field && d.win !== 'befriend') tg.field.life -= near * 0.6 * rt;
      else if (tg.kind) { for (let i = 0; i < W.cre.length; i++) { const o = W.cre[i]; if (o.sp !== tg.kind.id || o.dead) continue; for (let k = 0; k < n; k += 2) { const c = M[k], dx = o.x - c.x, dy = o.y - c.y, d2 = dx * dx + dy * dy; if (d2 < 70 * 70) { if (d.win === 'befriend') { o.E = Math.min(o.ph.Emax, o.E + 2 * rt); c.E = Math.min(c.ph.Emax, c.E + 2 * rt); o.mend = 1; } else { const q = Math.sqrt(d2) || 1; o.E -= 3.2 * rt * (1 - o.ph.defense * 0.5); o.vx += dx / q * 90 * dt; o.vy += dy / q * 90 * dt; o.flash = 0.6; } break; } } } }
    }
    if (d.t >= st.secs) { d.i++; d.t = 0; if (d.i >= d.steps.length) finish(d, 'done'); else G.emit('deed-step', d); }
  }
  G.on('birth', function (c, from, mate) { const d = G.W && G.W.deed; if (!d || !c) return; if ((from && (from.deedId === d.id || from.deedKin === d.id)) || (mate && (mate.deedId === d.id || mate.deedKin === d.id))) c.deedKin = d.id; });      // the young of those in it are heirs to it
  { const step0 = G.step; G.step = function (dt) { step0(dt); const W = G.W; if (W && W.deed) deedStep(dt); if (W && W.works && W.works.length && W.works[0].until < W.t) W.works.shift(); }; }

  // ── seen ──
  const mound = function (ctx, x, y, r, hue, grow) { for (let i = 0; i < 9; i++) { const a = i * 2.4, q = (0.25 + (i % 3) * 0.2) * r * grow; ctx.beginPath(); ctx.arc(x + Math.cos(a) * q * 0.8, y - (i / 9) * r * 0.9 * grow + Math.sin(a) * q * 0.2, r * (0.3 - i * 0.018) * (0.5 + 0.5 * grow), 0, TAU); ctx.fillStyle = G.hsl(hue + i * 6, 35, 46 + (i % 3) * 8, 1); ctx.fill(); ctx.strokeStyle = '#14202e'; ctx.lineWidth = 2; ctx.stroke(); } };
  G.drawDeeds = function (ctx) {
    const W = G.W; if (!W || (!W.deed && !(W.works && W.works.length))) return;
    const v = G.view, s = v.scale * v.dpr, t = G.rt || 0, inv = 1 / Math.max(0.7, v.scale);
    ctx.save(); ctx.setTransform(s, 0, 0, s, v.ox * v.dpr, v.oy * v.dpr); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    const label = function (x, y, a, b, hue) { ctx.save(); ctx.translate(x, y); ctx.scale(inv, inv); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '700 12.5px system-ui, sans-serif'; const w1 = ctx.measureText(a).width; ctx.font = '600 10.5px system-ui, sans-serif'; const tw = Math.max(w1, ctx.measureText(b).width) + 22; ctx.fillStyle = 'rgba(9,28,40,0.9)'; ctx.beginPath(); ctx.rect(-tw / 2, -21, tw, 42); ctx.fill(); ctx.strokeStyle = G.hsl(hue, 85, 68, 0.9); ctx.lineWidth = 1.5; ctx.stroke(); ctx.fillStyle = '#fff'; ctx.font = '700 12.5px system-ui, sans-serif'; ctx.fillText(a, 0, -8); ctx.fillStyle = '#f6d365'; ctx.font = '600 10.5px system-ui, sans-serif'; ctx.fillText(b, 0, 9); ctx.restore(); };
    // what they have built
    const Wk = W.works || [];
    for (let i = 0; i < Wk.length; i++) { const w = Wk[i], fade = clamp((w.until - W.t) / 12, 0, 1); ctx.globalAlpha = fade; if (w.fig && G.drawFigure) { const mw = Math.min(w.r * 1.5, 190), k = mw / 200; ctx.save(); ctx.translate(w.x, w.y + mw * 0.55); ctx.scale(k, k); G.drawFigure(ctx, w.fig, { p: {}, bite: 0, _fc: 1 }, 0); ctx.restore(); } else mound(ctx, w.x, w.y + w.r * 0.5, w.r, w.hue, 1); ctx.globalAlpha = 1; label(w.x, w.y - Math.min(w.r * 1.5, 190) * 0.7 - 34, w.name, 'built by the ' + w.by, w.hue); }
    const d = W.deed;
    if (d) {
      const st = d.steps[d.i], M = members(d), R = d.result ? d.result.size * Math.min(W.ww, W.wh) : 60;
      ctx.beginPath(); ctx.arc(d.x, d.y, R + 10, 0, TAU); ctx.strokeStyle = G.hsl(d.hue, 85, 70, 0.5 + 0.25 * Math.sin(t * 3)); ctx.lineWidth = 2.5; ctx.setLineDash([9, 8]); ctx.lineDashOffset = -t * 18; ctx.stroke(); ctx.setLineDash([]);
      if (d.progress > 0.02) mound(ctx, d.x, d.y + R * 0.4, R * 0.8, d.hue, d.progress);
      for (let k = 0; k < M.length; k++) {
        const c = M[k], top = c.y - c.ph.r * 3.4;
        ctx.strokeStyle = '#14202e'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(c.x + c.ph.r * 0.9, c.y - c.ph.r * 1.2); ctx.lineTo(c.x + c.ph.r * 0.9, top); ctx.stroke();      // each carries a little flag
        ctx.beginPath(); ctx.moveTo(c.x + c.ph.r * 0.9, top); ctx.lineTo(c.x + c.ph.r * 0.9 + 9 + Math.sin(t * 6 + k) * 1.5, top + 4); ctx.lineTo(c.x + c.ph.r * 0.9, top + 8); ctx.closePath(); ctx.fillStyle = G.hsl(d.hue, 90, 62, 1); ctx.fill(); ctx.stroke();
        if (c.carry) { ctx.beginPath(); ctx.arc(c.x - c.ph.r * 0.8, c.y - c.ph.r * 2.6, 4, 0, TAU); ctx.fillStyle = '#f6d365'; ctx.fill(); ctx.stroke(); }
        if (c.cryT > 0 && G.speed <= 16) { ctx.save(); ctx.translate(c.x, top - 12); ctx.scale(inv, inv); ctx.font = '700 12px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; const tw = ctx.measureText(c.cryW).width + 14; ctx.globalAlpha = Math.min(1, c.cryT / 0.4); ctx.fillStyle = 'rgba(255,255,255,0.96)'; ctx.strokeStyle = 'rgba(8,14,28,0.85)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.rect(-tw / 2, -10, tw, 20); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#16233a'; ctx.fillText(c.cryW, 0, 1); ctx.restore(); }
      }
      let lx = d.x, ly = d.y - R - 36; if (st.do === 'charge' || st.do === 'line' || st.do === 'scatter') { let sx = 0, sy = 1e9; for (let k = 0; k < M.length; k++) { sx += M[k].x; sy = Math.min(sy, M[k].y); } if (M.length) { lx = sx / M.length; ly = sy - 70; } }
      label(lx, ly, d.title, 'the ' + d.kind + ' · ' + (WORDS[st.do] || st.do) + (st.do === 'build' ? ' ' + Math.round(d.progress * 100) + '%' : '') + ' · ' + M.length + ' of them', d.hue);
    }
    ctx.restore();
  };

  G.on('deed', function (d) { if (G.mode !== 'play') return; if (G.sfx) G.sfx('discovery'); if (G.banner) G.banner('The ' + d.kind + ' have decided', d.title + '. ' + (d.what ? 'They will ' + d.what + '. Why: ' + d.why + '.' : d.say), 12000); if (G.log) G.log('disc', 'They decided: ' + d.title, 'The ' + d.kind + '. ' + d.say); });
  G.on('deed-step', function (d) { if (G.mode !== 'play') return; const st = d.steps[d.i]; if (G.log) G.log('sel', d.title, 'Now they are ' + (WORDS[st.do] || st.do) + (st.cry ? ', crying "' + st.cry + '"' : '') + '.'); });
  G.on('deed-end', function (d, how, made) {
    const W = G.W; if (G.mode !== 'play' || !W) return;
    const t = how === 'done' ? (made ? 'The ' + d.kind + ' finished ' + d.title + '. The ' + made.name + ' now stands in the pond.' : 'The ' + d.kind + ' carried out ' + d.title + '.') : 'Too few of the ' + d.kind + ' were left: ' + d.title + ' was abandoned.';
    if (G.banner) G.banner(how === 'done' ? 'They did it' : 'It came to nothing', t, 7000); if (G.log) G.log('disc', d.title, t);
    if (W.discLog) W.discLog.push({ key: 'deed' + d.id + '_' + W.gen, text: d.say + ' ' + t, gen: W.gen });
  });
  G.on('new-pond', function () { asking = false; });
})();
