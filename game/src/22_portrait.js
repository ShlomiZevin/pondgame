// ── The character: the same genes, seen as you would meet the animal in the water ──
// Nothing here is one template. The genes decide the BUILD, and each build is grown from the same genes in its own way:
//   one cell, no legs            → a MICROBE: a see-through blob with a nucleus; growths show as cilia, spines, a flagellum
//   arms all round               → an ORB if it is mostly spines, else a STAR
//   legs, a shell or pincers, a short wide body → a CRAB
//   four legs or more on a longer body          → a BEAST on all fours (with a shell: a turtle)
//   two legs                     → it stands UPRIGHT
//   no legs, a very long body    → a SERPENT
//   no legs, tentacles, no tail  → a JELLY: a bell that trails its tentacles
//   no legs, a tail or fins      → a FISH
//   none of these                → a soft BLOB
// Within a build, the outline is the silhouette genes; the head is its own shape (size, width, boxy or pointed) on a neck as
// deep as the neck gene; legs reach the ground from where they grow; fins stand on the back; spikes run along it; tentacles
// trail; horns and feelers sit on the head; the tail continues the spine; coat, pattern, shell, glow and poison go on top.
(function () {
  'use strict';
  const F = G.form, clamp = G.clamp, TAU = 6.2832, GROUND = 104;
  const lerp = function (a, b, t) { return a + (b - a) * t; };

  /** how a body is built, read off its genes */
  F.build = function (f, cn) {
    // one bare mass with little on it is still a single cell: an amoeba, see-through, with a nucleus (an eyespot once it has an eye)
    if (f.bd) { if (f.bd.m.length === 1 && !f.bd.m[0].lb && f.rules.length <= 2 && f.en <= 1 && !f.coat && !f.rules.some(function (q) { return q.k === 8 || q.k === 0; })) return 'microbe'; return 'free'; }
    cn = cn || F.counts(f);
    const k = cn.k, tent = k[3] > 0, fin = k[1] > 0, tail = f.tk && f.n > 1;
    if (f.sym) return k[2] + k[7] > k[0] + k[3] + k[1] && k[2] + k[7] > 0 ? 'orb' : 'star';
    if (f.pl && f.n >= 2 && G.planOf && G.planOf(f.pl)) return 'plan';
    if (f.n === 1 && cn.legSites < 2) return 'microbe';
    if (cn.legSites >= 4 && (f.shell > 0.25 || cn.pincer) && f.n <= 5) return 'crab';
    if (cn.legSites >= 4 && f.n >= 3) return 'beast';
    if (cn.legSites >= 2) return 'upright';
    if (f.n >= 7) return 'serpent';
    if (tent && !fin && !tail) return 'jelly';
    if (tail || fin) return 'fish';
    return tent ? 'jelly' : 'blob';
  };
  /** does this build walk on the pond floor (it hops and steps), or swim (it glides)? */
  F.walks = function (b, f) { if (b === 'free') return G.body.stands(f); if (b === 'plan') { const p = G.planOf(f.pl); return !!(p && p.stands); } return b === 'beast' || b === 'upright' || b === 'crab'; };

  /** draw the character; the floor is at y = 104; it fits x ±170, y −190..160. o: { lx, ly, sleep, collect } */
  F.portrait = function (ctx, f, t, o) {
    o = o || {};
    // B(speed): how far along a movement of that speed is. In a loop (o.loop) every speed becomes a whole number of beats.
    const B = function (k) { return o.loop ? t * Math.max(1, Math.round(k / 2.6)) : t * k; };
    const col = F._colours(f), INK = F._ink(), cn = F.counts(f), R = f.rules, build = F.build(f, cn);
    const ink = function (fill, lw) { ctx.fillStyle = fill; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = lw || 2.6; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke(); };
    const body = function (k) { const out = []; for (let i = 0; i < R.length; i++) if (R[i].k === k && R[i].on < 0) out.push(R[i]); return out; };
    const kidOf = function (q) { const i = R.indexOf(q); for (let j = i + 1; j < R.length; j++) if (R[j].on === i) return R[j]; return null; };
    const legs = body(0), fins = body(1), spikes = body(2), tents = body(3), feels = body(4), plates = body(5), frills = body(6), horns = body(7);
    const breathe = 1 + Math.sin(B(2.2)) * 0.015, rr = G.rng(f.seed);
    const plump = clamp((f.prof[1] + f.prof[2] + f.prof[3]) / 3, 0.55, 1.6);
    const hsl = function (h, s, l, a) { return 'hsla(' + Math.round(((h % 360) + 360) % 360) + ',' + Math.round(s) + '%,' + Math.round(l) + '%,' + a + ')'; };
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    // every living thing in this water has a soft light of its own colour about it; a glowing one, much more
    const aura = function (x, y, r) { r = Math.max(20, Math.min(r, 158 - y, y + 188, 168 - Math.abs(x))); const g = ctx.createRadialGradient(x, y, r * 0.15, x, y, r); g.addColorStop(0, hsl(f.hue + (f.glow > 0.3 ? 30 : 0), 90, 72, f.glow > 0.3 ? 0.42 : 0.2)); g.addColorStop(1, hsl(f.hue, 90, 70, 0)); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); };
    const lights = function (pts) { if (!(f.glow > 0.3)) return; for (let i = 0; i < pts.length; i++) { const p = pts[i], g = ctx.createRadialGradient(p[0], p[1], 0, p[0], p[1], 9); g.addColorStop(0, 'rgba(255,255,230,0.95)'); g.addColorStop(0.35, hsl(f.hue + f.hue2, 95, 75, 0.7)); g.addColorStop(1, hsl(f.hue + f.hue2, 95, 70, 0)); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p[0], p[1], 9, 0, TAU); ctx.fill(); } };

    // ═══ a free body: whatever masses its genes hold, joined the way they say ═══
    // Growths sit on the masses their rule names. Legs that grow from a mass resting lowest reach the floor; from any other mass
    // they are arms. Facing you, growths come in mirrored pairs; seen from the side, there is a near one and a far one.
    if (build === 'free') {
      const BD = G.body, bd = f.bd, PI = Math.PI, LS = BD.lay(f, null), L0 = BD.lay(f, B), I = L0.I, gnd = BD.ground(LS);
      const xs = Math.pow(plump, 0.4);
      const legOn = {}, armOn = {};
      for (let i = 0; i < legs.length; i++) for (let a = legs[i].a; a <= legs[i].b && a < f.n; a += legs[i].e) { if (gnd[a] && !legOn[a]) legOn[a] = legs[i]; else if (!armOn[a]) armOn[a] = legs[i]; }
      let stands = false, legL = 0; for (const a in legOn) { stands = true; legL = Math.max(legL, 16 + 17 * Math.min(1.6, legOn[a].l)); }
      const hover = stands ? 0 : 30;
      const bw = Math.max(0.6, (LS.x1 - LS.x0) * xs), bh = Math.max(0.6, LS.y1 - LS.y0);
      const Sc = Math.min(50, 222 / bw, (208 - legL - hover) / bh);
      const cxU = (LS.x0 + LS.x1) / 2, bob = stands ? -Math.abs(Math.sin(B(2.6))) * 2 : Math.sin(B(2.6)) * 4, baseY = GROUND - 4 - legL - hover + bob;
      const X = function (u) { return (u - cxU) * Sc * xs; }, Y = function (v) { return baseY + (v - LS.y1) * Sc; };
      const rad = function (o, th) { return BD.rad(o.m, th, o.mir) * o.s * (o.i === bd.e ? 1 : breathe); };
      const P = function (o, th, k) { const q = rad(o, th) * (k === undefined ? 1 : k); return [X(o.x + Math.cos(th) * q), Y(o.y + Math.sin(th) * q)]; };
      const open = function (o, th) { const q = rad(o, th) * 1.12; return !BD.inside(L0, o.x + Math.cos(th) * q, o.y + Math.sin(th) * q, o); };
      const seek = function (o, th) { for (let j = 0; j < 7; j++) { const a = th + (j % 2 ? 1 : -1) * Math.ceil(j / 2) * 0.28; if (open(o, a)) return a; } return null; };
      const of = function (i) { const out = []; for (let k = 0; k < I.length; k++) if (I[k].i === i && !I[k].far) out.push(I[k]); return out; };
      const px = function (o) { return o.s * Sc; };
      const kk = function (o) { return clamp(px(o) / 44, 0.7, 1.2); };
      const sidesOf = function (o) { return o.m.pr && o.par ? [o.x >= o.par.x ? 1 : -1] : [1, -1]; };
      const trace = function (o, k) { const N = 36, pts = []; for (let j = 0; j < N; j++) pts.push(P(o, j / N * TAU, k)); ctx.moveTo((pts[N - 1][0] + pts[0][0]) / 2, (pts[N - 1][1] + pts[0][1]) / 2); for (let j = 0; j < N; j++) { const p = pts[j], q = pts[(j + 1) % N]; ctx.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2); } ctx.closePath(); };
      const near = []; for (let k = 0; k < I.length; k++) if (!I[k].far) near.push(I[k]);
      const fm = of(bd.e)[0] || I[0];
      aura(0, Y((LS.y0 + LS.y1) / 2), Math.max(bw, bh) * Sc * 0.7 + 34);

      // ── behind the body ──
      if (f.tk) { const o = I[0], th = seek(o, bd.v ? PI : PI - 0.95); if (th !== null) { const b = P(o, th, 0.86), sz = 30 * f.ts * kk(o), wag = Math.sin(B(3)) * 0.2;
        ctx.save(); ctx.translate(b[0], b[1]); ctx.rotate(th + wag); ctx.beginPath();
        if (f.tk === 1) { ctx.moveTo(-4, 0); ctx.quadraticCurveTo(sz * 0.6, -sz * 1.15, sz * 1.45, -sz * 0.85); ctx.quadraticCurveTo(sz * 0.95, 0, sz * 1.45, sz * 0.85); ctx.quadraticCurveTo(sz * 0.6, sz * 1.15, -4, 0); }
        else if (f.tk === 2) { ctx.moveTo(-4, 0); ctx.quadraticCurveTo(sz * 0.6, -sz * 0.2, sz * 1.5, -sz * 1.05); ctx.quadraticCurveTo(sz * 1.0, 0, sz * 1.5, sz * 1.05); ctx.quadraticCurveTo(sz * 0.6, sz * 0.2, -4, 0); }
        else if (f.tk === 3) { ctx.moveTo(0, -7); ctx.quadraticCurveTo(sz * 1.2, -sz * 0.2, sz * 2.0, -sz * 1.1); ctx.quadraticCurveTo(sz * 1.3, sz * 0.3, 0, 7); }
        else { ctx.moveTo(0, -6); ctx.lineTo(sz * 0.9, -6); ctx.arc(sz * 1.2, 0, sz * 0.42, -2.3, 2.3); ctx.lineTo(0, 6); }
        ctx.closePath(); ink(f.tk === 4 ? col.dark : col.fin, 2.4);
        if (f.tk <= 2) { ctx.strokeStyle = 'rgba(7,18,31,.25)'; ctx.lineWidth = 1.3; for (let j = -2; j <= 2; j++) { ctx.beginPath(); ctx.moveTo(4, j * 2); ctx.lineTo(sz * 1.25, j * sz * 0.36); ctx.stroke(); } }
        ctx.restore(); } }
      if (f.crest > 0.25) { const o = fm, k = kk(o); for (let j = -2; j <= 2; j++) { const th = -PI / 2 + j * 0.25 - (bd.v ? 0.35 : 0); if (!open(o, th)) continue; const b = P(o, th, 0.94), up = (9 + 16 * f.crest) * k, c = Math.cos(th), sn = Math.sin(th); ctx.beginPath(); ctx.moveTo(b[0] + sn * 6 * k, b[1] - c * 6 * k); ctx.lineTo(b[0] + c * up, b[1] + sn * up); ctx.lineTo(b[0] - sn * 6 * k, b[1] + c * 6 * k); ctx.closePath(); ink(col.frill, 1.8); } }
      for (let ri = 0; ri < R.length; ri++) { const q = R[ri]; if (q.on >= 0) continue; const d = q.k === 8 ? F._dsg(q) : null;
        for (let a = q.a; a <= q.b && a < f.n; a += q.e) { const os = of(a); for (let n = 0; n < os.length; n++) { const o = os[n], k = kk(o), sds = sidesOf(o);
          if (q.k === 1) finOn(o, q, k, sds, ri); else if (q.k === 2) spikesOn(o, q, k); else if (q.k === 3) tentaclesOn(o, q, k, ri); else if (q.k === 6) frillOn(o, q, k, sds); else if (d && d.pts && d.place !== 'head') designOn(o, q, d, k, sds, ri);
        } } }
      limbs(bd.v ? true : false);
      for (let k = 1; k < I.length; k++) { const o = I[k]; if (!o.stalk) continue; const p = o.par, w = Math.max(7, Math.min(px(o), px(p)) * 0.5); strokeLimb(X(p.x), Y(p.y), (X(p.x) + X(o.x)) / 2 + Math.sin(B(2.2) + k) * 3, (Y(p.y) + Y(o.y)) / 2, X(o.x), Y(o.y), w, o.far ? col.dark : col.body); }
      for (let k = 0; k < I.length; k++) if (I[k].far) { ctx.beginPath(); trace(I[k], 1); ink(col.dark, 2.6); }
      if (f.coat >= 2) for (let k = 0; k < near.length; k++) { const o = near[k]; for (let j = 0; j < 26; j++) { const th = j / 26 * TAU; if (!open(o, th)) continue; const p = P(o, th, 1); fringe(p[0], p[1], Math.cos(th), Math.sin(th), j + o.i * 3); } }

      // ── the body: all its masses as one shape, one outline round the lot ──
      const union = function () { ctx.beginPath(); for (let k = 0; k < near.length; k++) trace(near[k], 1); };
      union(); ctx.strokeStyle = INK; ctx.lineWidth = 5.8; ctx.stroke();
      const rest = near.filter(function (o) { return o !== fm; });
      if (near.length > 1 && rest.length && near.indexOf(fm) >= 0) {
        // the head is a ball of its own over a torso of its own: each mass is lit on its own, the head casts a soft shadow under its chin, and its outline shows where it sits
        const bnd = function (o) { const R = px(o) * 1.4; return [X(o.x) - R * xs, Y(o.y) - R, 2 * R * xs, 2 * R]; };
        for (let k = 0; k < rest.length; k++) { const o = rest[k], b = bnd(o); ctx.beginPath(); trace(o, 1); skin(b[0], b[1], b[2], b[3], function () { ctx.beginPath(); }, 0); }
        { const tor = rest.slice().sort(function (a, b) { return px(b) - px(a); })[0];
          if (tor && !tor.m.pr) { ctx.save(); ctx.beginPath(); trace(tor, 1); ctx.clip(); ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.beginPath(); ctx.ellipse(X(tor.x), Y(tor.y) + px(tor) * 0.2, px(tor) * xs * 0.55, px(tor) * 0.62, 0, 0, TAU); ctx.fill(); ctx.restore(); } }
        ctx.save(); ctx.beginPath(); for (let k = 0; k < rest.length; k++) trace(rest[k], 1); ctx.clip(); ctx.translate(0, px(fm) * 0.1); ctx.beginPath(); trace(fm, 1); ctx.fillStyle = 'rgba(7,18,31,0.3)'; ctx.fill(); ctx.restore();
        { const b = bnd(fm); ctx.beginPath(); trace(fm, 1); skin(b[0], b[1], b[2], b[3], function () { ctx.beginPath(); }, 0); ctx.beginPath(); trace(fm, 1); ctx.strokeStyle = INK; ctx.globalAlpha = 0.8; ctx.lineWidth = 3.4; ctx.stroke(); ctx.globalAlpha = 1; }
      } else { union(); skin(-bw * Sc / 2 - 4, baseY - bh * Sc - 4, bw * Sc + 8, bh * Sc + 8, function () { ctx.beginPath(); }, 0); }
      if (near.length > 1) { ctx.save(); union(); ctx.clip(); ctx.globalAlpha = 0.2; ctx.strokeStyle = INK; ctx.lineWidth = 2.4; for (let k = 1; k < near.length; k++) { ctx.beginPath(); trace(near[k], 1); ctx.stroke(); } ctx.restore(); ctx.globalAlpha = 1; }      // where one mass meets the next
      for (let k = 0; k < near.length; k++) { const o = near[k]; if (!o.m.h) continue; ctx.beginPath(); trace(o, 0.5); const g = ctx.createRadialGradient(X(o.x), Y(o.y), 1, X(o.x), Y(o.y), px(o) * 0.6); g.addColorStop(0, hsl(f.hue, f.sat * 0.6, 10, 0.95)); g.addColorStop(1, hsl(f.hue, f.sat, 24, 0.92)); ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 2.4; ctx.stroke(); }      // a ring: you look into the hollow of it
      for (let ri = 0; ri < R.length; ri++) { const q = R[ri]; if (q.on >= 0) continue; const d = q.k === 8 ? F._dsg(q) : null; if (q.k !== 5 && !(d && d.place === 'wrap')) continue;
        for (let a = q.a; a <= q.b && a < f.n; a += q.e) { const os = of(a); for (let n = 0; n < os.length; n++) { if (d) wrapOn(os[n], d); else platesOn(os[n]); } } }
      if (f.shell > 0.25) { const o = I[0], N = 12, C = []; for (let j = 0; j <= N; j++) C.push(P(o, PI + 0.42 + j / N * (PI - 0.84), 1.05 + 0.06 * f.shell)); ctx.beginPath(); ctx.moveTo(C[0][0], C[0][1]); for (let j = 1; j <= N; j++) ctx.lineTo(C[j][0], C[j][1]); ctx.quadraticCurveTo(X(o.x), C[0][1] + px(o) * 0.2, C[0][0], C[0][1]); ctx.closePath(); ink(col.dark, 2.4); ctx.strokeStyle = INK; ctx.globalAlpha = 0.3; ctx.lineWidth = 1.8; for (let j = 2; j < N; j += 2) { ctx.beginPath(); ctx.moveTo(C[j][0], C[j][1]); ctx.lineTo(X(o.x) + (C[j][0] - X(o.x)) * 0.45, C[0][1] + px(o) * 0.06); ctx.stroke(); } ctx.globalAlpha = 1; }      // a shell: a cap over the top of it
      if (f.venom > 0.3) for (let j = -1; j <= 1; j += 2) { const p = P(I[0], PI / 2 + j * 0.7, 0.62); ctx.beginPath(); ctx.arc(p[0], p[1], 4.5, 0, TAU); ink('#b6ff3c', 1.6); }
      { const Lp = []; for (let k = 0; k < near.length; k++) Lp.push([X(near[k].x) - px(near[k]) * 0.3 * xs, Y(near[k].y) + px(near[k]) * 0.38]); lights(Lp); }

      // ── in front of the body ──
      if (bd.v) { limbs(false); for (let i = 0; i < fins.length; i++) { const o = of(fins[i].a)[0]; if (!o) continue; const Lf = (20 * fins[i].l + 6) * kk(o), fl = Math.sin(B(4) + i) * 0.25; ctx.save(); ctx.translate(X(o.x) - px(o) * 0.1, Y(o.y) + px(o) * 0.25); ctx.rotate(2.5 + fl); ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(Lf * 0.6, -Lf * 0.5, Lf * 1.1, 0); ctx.quadraticCurveTo(Lf * 0.6, Lf * 0.4, 0, 0); ctx.closePath(); ink(col.fin, 2); ctx.restore(); } }
      for (let ri = 0; ri < R.length; ri++) { const q = R[ri]; if (q.on >= 0) continue; const d = q.k === 8 ? F._dsg(q) : null; if (q.k !== 7 && q.k !== 4 && !(d && d.pts && d.place === 'head')) continue;
        for (let a = q.a; a <= q.b && a < f.n; a += q.e) { const os = of(a); for (let n = 0; n < os.length; n++) { const o = os[n], k = kk(o); if (!open(o, -PI / 2)) continue; const top = P(o, -PI / 2, 1), cx = X(o.x) + (bd.v ? px(o) * 0.12 : 0);
          if (d) { const mv = Math.sin(B(2) + ri) * 0.05; for (let sd = -1; sd <= 1; sd += 2) F._design(ctx, d, cx + sd * px(o) * xs * 0.45, top[1] + px(o) * 0.3, (sd > 0 ? -1.0 : PI + 1.0) + sd * mv, 44 * q.l * k, q.w, col, sd); continue; }
          ctx.save(); ctx.translate(cx, top[1] + (q.k === 7 ? 9 : 5) * k); ctx.scale(k, k); if (q.k === 7) hornsAt(0, 0, px(o) * xs * 0.42 / k, q); else feelersAt(0, 0, px(o) * xs * 0.3 / k, q, bd.v ? 1 : 0); ctx.restore();
        } } }
      { const Rf = px(fm), hr = Math.min(clamp(Rf * 0.78 * Math.pow(f.hd, 0.5), 13, 54), Rf * 0.96) * Math.min(1, xs + 0.1);
        face(X(fm.x) + (bd.v ? Rf * xs * 0.18 : 0), Y(fm.y) + Rf * (f.shell > 0.25 && fm === I[0] ? 0.26 : 0.13), hr, bd.v, false); }
      return;

      function finOn(o, q, k, sds, ri) {
        const Lf = (30 * q.l + 8) * k, fl = Math.sin(B(3.4) + ri) * 0.14;
        if (!bd.v) { for (let n = 0; n < sds.length; n++) { const sd = sds[n], th = seek(o, sd > 0 ? -0.3 : PI + 0.3); if (th === null) continue; const b = P(o, th, 0.85); ctx.save(); ctx.translate(b[0], b[1]); ctx.scale(sd, 1); ctx.rotate(-0.35 + fl); ctx.beginPath(); ctx.moveTo(0, -10 * k); ctx.quadraticCurveTo(Lf * 0.9, -Lf * 0.75, Lf * 1.25, -Lf * 0.15); ctx.quadraticCurveTo(Lf * 0.75, Lf * 0.3, 0, 13 * k); ctx.closePath(); ink(col.fin, 2.2); ribs(Lf, -Lf * 0.3); ctx.restore(); } }
        else { const th = seek(o, -PI / 2 - 0.3); if (th !== null) { const b = P(o, th, 0.9); ctx.save(); ctx.translate(b[0], b[1]); ctx.rotate(th + PI / 2 + fl); ctx.beginPath(); ctx.moveTo(20 * k, 5); ctx.quadraticCurveTo(Lf * 0.1, -Lf * 1.3, -Lf * 0.8, -Lf * 0.8); ctx.quadraticCurveTo(-Lf * 0.3, -Lf * 0.2, -18 * k, 5); ctx.closePath(); ink(col.fin, 2.2); ribs(-Lf * 0.5, -Lf * 0.85); ctx.restore(); } }
      }
      function spikesOn(o, q, k) { const Ls = (13 * q.l + 4) * k; for (let j = -2; j <= 2; j++) { const th = -PI / 2 + j * 0.44 - (bd.v ? 0.35 : 0); if (!open(o, th)) continue; const b = P(o, th, 0.95), c = Math.cos(th), sn = Math.sin(th); ctx.beginPath(); ctx.moveTo(b[0] + sn * 6 * k, b[1] - c * 6 * k); ctx.lineTo(b[0] + c * Ls * 1.5, b[1] + sn * Ls * 1.5); ctx.lineTo(b[0] - sn * 6 * k, b[1] + c * 6 * k); ctx.closePath(); ink('#f4f7fb', 2); } }
      function tentaclesOn(o, q, k, ri) { const n = bd.v ? 3 : 4, floor = (stands ? GROUND : 156) - 6; for (let j = 0; j < n; j++) { const th = PI / 2 + (j - (n - 1) / 2) * 0.42 + (bd.v ? 0.35 : 0); if (!open(o, th)) continue; const b = P(o, th, 0.88), Lt = Math.min((34 * q.l + 14) * k, floor - b[1]); if (Lt < 12) continue; for (let pass = 0; pass < 2; pass++) { ctx.strokeStyle = pass ? col.limb : INK; ctx.lineWidth = pass ? 4.6 * k : 4.6 * k + 3.8; ctx.beginPath(); ctx.moveTo(b[0], b[1]); for (let i = 1; i <= 8; i++) { const u = i / 8; ctx.lineTo(b[0] + Math.cos(th) * Lt * u * 0.35 + Math.sin(u * 5 + B(2.4) + j * 1.3 + ri) * (3 + 8 * u) * k, b[1] + u * Lt); } ctx.stroke(); } } }
      function frillOn(o, q, k, sds) { const Lf = (22 * q.l + 8) * k, spn = 0.95 + 0.08 * Math.sin(B(3)); for (let n = 0; n < sds.length; n++) { const sd = sds[n], th0 = bd.v ? (sd > 0 ? PI - 0.7 : PI + 0.7) : (sd > 0 ? 0.55 : PI - 0.55); if (!open(o, th0)) continue; const b = P(o, th0, 0.82); ctx.beginPath(); ctx.moveTo(b[0], b[1]); for (let j = 0; j <= 6; j++) { const a = th0 + (j / 6 - 0.5) * 1.7 * spn, q2 = Lf * (j % 2 ? 0.85 : 1.15); ctx.lineTo(b[0] + Math.cos(a) * q2, b[1] + Math.sin(a) * q2); } ctx.closePath(); ink(col.frill, 2.2); } }
      function designOn(o, q, d, k, sds, ri) {
        const mv = Math.sin(B(3) + ri) * (d.motion === 'flap' ? 0.2 : d.motion === 'still' ? 0 : 0.06);
        if (d.place === 'back' || bd.v) { const th = seek(o, d.place === 'back' ? -PI / 2 - (bd.v ? 0.25 : 0) : -PI / 2 - 0.7); if (th === null) return; const b = P(o, th, 0.8); F._design(ctx, d, b[0], b[1], th - (bd.v ? 0.3 : 0) + mv, (d.place === 'back' ? 58 : 54) * q.l * k, q.w, col, 1); }
        else for (let n = 0; n < sds.length; n++) { const sd = sds[n], th = seek(o, sd > 0 ? -0.45 : PI + 0.45); if (th === null) continue; const b = P(o, th, 0.78); F._design(ctx, d, b[0], b[1], (sd > 0 ? -0.55 : PI + 0.55) + sd * mv, 52 * q.l * k, q.w, col, sd); }
      }
      // armour: bands across the mass
      function platesOn(o) { ctx.save(); ctx.beginPath(); trace(o, 1); ctx.clip(); for (let j = 0; j < 3; j++) { ctx.beginPath(); ctx.ellipse(X(o.x), Y(o.y) - px(o) * (0.78 - j * 0.44), px(o) * xs * 1.3, px(o) * 0.2, 0, 0, TAU); ctx.globalAlpha = 0.85; ctx.fillStyle = col.limb; ctx.fill(); ctx.globalAlpha = 0.4; ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.stroke(); } ctx.restore(); ctx.globalAlpha = 1; }
      // something worn: grown like any coat, but shaped like the thing it answers (a sweater, a vest, a hood, a belt)
      function wrapOn(o, d) {
        const Rp = px(o), cy = Y(o.y), y0 = cy + (d.cover[0] * 2 - 1) * Rp * 1.08, y1 = cy + (d.cover[1] * 2 - 1) * Rp * 1.08, x0 = X(o.x) - Rp * xs * 1.7, w = Rp * xs * 3.4;
        const fill = d.colour === 'body' ? col.dark : d.colour === 'pale' ? '#f4f7fb' : d.colour === 'dark' ? hsl(f.hue + f.hue2, 45, 30, 1) : d.colour === 'glow' ? col.glow : col.fin;
        ctx.save(); ctx.beginPath(); trace(o, 1); ctx.clip();
        ctx.fillStyle = fill; ctx.fillRect(x0, y0, w, y1 - y0);
        ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.32;
        if (d.style === 'knit') { for (let yy = y0 + 6, row = 0; yy < y1 - 3; yy += 8, row++) for (let xx = x0 + (row % 2) * 5; xx < x0 + w; xx += 10) { ctx.beginPath(); ctx.moveTo(xx - 3, yy - 3); ctx.lineTo(xx, yy + 2); ctx.lineTo(xx + 3, yy - 3); ctx.stroke(); } }
        else if (d.style === 'plates') { for (let yy = y0, row = 0; yy < y1; yy += 13, row++) { ctx.beginPath(); ctx.moveTo(x0, yy); ctx.lineTo(x0 + w, yy); ctx.stroke(); for (let xx = x0 + (row % 2) * 9; xx < x0 + w; xx += 18) { ctx.beginPath(); ctx.moveTo(xx, yy); ctx.lineTo(xx, yy + 13); ctx.stroke(); } } }
        else if (d.style === 'stripes') { ctx.globalAlpha = 0.85; ctx.fillStyle = col.mark; for (let yy = y0 + 6; yy < y1 - 4; yy += 14) ctx.fillRect(x0, yy, w, 5); }
        else if (d.style === 'fluff') { ctx.globalAlpha = 0.92; ctx.fillStyle = '#fff'; for (let xx = x0; xx < x0 + w; xx += 9) { ctx.beginPath(); ctx.arc(xx, y0 + 2, 6.5, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.arc(xx + 4, y1 - 2, 6.5, 0, TAU); ctx.fill(); } }
        ctx.globalAlpha = 1; ctx.strokeStyle = INK; ctx.lineWidth = 2.2;
        for (let e = 0; e < 2; e++) { const yy = e ? y1 : y0; if (d.trim) { ctx.fillStyle = e ? col.mark : '#f4f7fb'; ctx.fillRect(x0, yy - 4, w, 8); ctx.beginPath(); ctx.moveTo(x0, yy - 4); ctx.lineTo(x0 + w, yy - 4); ctx.moveTo(x0, yy + 4); ctx.lineTo(x0 + w, yy + 4); ctx.stroke(); } else { ctx.beginPath(); ctx.moveTo(x0, yy); ctx.lineTo(x0 + w, yy); ctx.stroke(); } }
        ctx.restore();
      }
      function hand(ex, ey, a, tip, k) {
        if (tip === 2) for (let h = -1; h <= 1; h += 2) { ctx.beginPath(); ctx.moveTo(ex, ey); ctx.quadraticCurveTo(ex + Math.cos(a + h) * 14 * k, ey + Math.sin(a + h) * 14 * k, ex + Math.cos(a + h * 0.2) * 20 * k, ey + Math.sin(a + h * 0.2) * 20 * k); ctx.quadraticCurveTo(ex + Math.cos(a + h * 0.4) * 8 * k, ey + Math.sin(a + h * 0.4) * 8 * k, ex, ey); ink('#ff8a6b', 2.2); }
        else if (tip === 3) { ctx.beginPath(); ctx.ellipse(ex + Math.cos(a) * 7 * k, ey + Math.sin(a) * 7 * k, 13 * k, 8 * k, a, 0, TAU); ink(col.fin, 2.2); }
        else if (tip === 1) { ctx.beginPath(); ctx.arc(ex, ey, 8 * k, 0, TAU); ink(col.limb, 2.2); for (let h = -1; h <= 1; h++) { ctx.beginPath(); ctx.arc(ex + Math.cos(a + h * 0.7) * 9 * k, ey + Math.sin(a + h * 0.7) * 9 * k, 3.6 * k, 0, TAU); ink(col.limb, 1.8); } }
        else { ctx.beginPath(); ctx.arc(ex, ey, 7 * k, 0, TAU); ink(col.limb, 2.2); }
      }
      function legOf(o, q, th, sd, far, idx) {
        const hip = P(o, th, 0.8), w = (12 + 7 * q.w) * kk(o), st = Math.sin(B(5) + idx * 2.2 + (far || sd < 0 ? 3.14 : 0)) * 5, fx = hip[0] + (bd.v ? 0 : sd * 4) + st, fy = GROUND - 5;
        if (far) ctx.globalAlpha = 0.75;
        { const kx = (hip[0] + fx) / 2 + (bd.v ? 7 : sd * 8), ky = (hip[1] + fy) / 2 + 2; limb2(hip[0], hip[1], kx, ky, fx, fy, w, far ? col.dark : col.limb); ctx.beginPath(); ctx.arc(kx, ky, w * 0.6, 0, TAU); ink(far ? col.dark : col.limb, 1.8); } foot(fx, fy + 1, bd.v ? 1 : sd, q.t);
        ctx.globalAlpha = 1;
      }
      function armOf(o, q, th, a, sd, far, idx) {
        const s0 = P(o, th, 0.85), k = kk(o), La = (30 * q.l + 16) * k, wv = Math.sin(B(2.6) + idx + (sd > 0 ? 0 : 1.4)) * 0.18, ang = a + sd * wv, ex = s0[0] + Math.cos(ang) * La, ey = s0[1] + Math.sin(ang) * La, kid = kidOf(q), tip = kid && kid.k === 0 && kid.t ? kid.t : q.t;
        if (far) ctx.globalAlpha = 0.75;
        { const wA = (13 + 5 * q.w) * k, elx = s0[0] + Math.cos(ang - sd * 0.5) * La * 0.55, ely = s0[1] + Math.sin(ang - sd * 0.5) * La * 0.55; limb2(s0[0], s0[1], elx, ely, ex, ey, wA, far ? col.dark : col.limb); ctx.beginPath(); ctx.arc(elx, ely, wA * 0.55, 0, TAU); ink(far ? col.dark : col.limb, 1.8); }
        hand(ex, ey, ang, tip, k * 1.2);
        ctx.globalAlpha = 1;
      }
      function limbs(far) {
        let idx = 0;
        for (const a in legOn) { const os = of(+a), q = legOn[a]; for (let n = 0; n < os.length; n++) { const o = os[n]; idx++;
          if (bd.v) legOf(o, q, PI / 2 + (far ? 0.42 : -0.42), 1, far, idx);
          else { const sds = sidesOf(o); for (let m = 0; m < sds.length; m++) legOf(o, q, PI / 2 - sds[m] * (0.55 + 0.2 * q.g), sds[m], false, idx); } } }
        for (const a in armOn) { const os = of(+a), q = armOn[a]; for (let n = 0; n < os.length; n++) { const o = os[n]; idx++;
          if (bd.v) armOf(o, q, far ? 0.1 : 0.5, 0.5, 1, far, idx);
          else { const sds = sidesOf(o); for (let m = 0; m < sds.length; m++) armOf(o, q, sds[m] > 0 ? 0.25 : PI - 0.25, sds[m] > 0 ? 0.45 : PI - 0.45, sds[m], false, idx); } } }
      }
    }

    // ═══ a microbe: one cell, see-through, with a nucleus ═══
    if (build === 'microbe') {
      const Rm = 46 * Math.pow(plump, 0.5), cy = GROUND - 26 - Rm, lob = 4 + (f.seed % 3), amp = 0.14 + 0.1 * (rr() - 0.5), ph0 = rr() * TAU, oval = 1 + 0.5 * (f.len - 0.6);
      const at = function (a) { const q = Rm * (1 + amp * Math.sin(lob * a + ph0 + Math.sin(B(1.3)) * 0.5) + 0.05 * Math.sin(2 * a + B(1))); return [Math.cos(a) * q * oval, cy + Math.sin(a) * q / Math.sqrt(oval)]; };
      aura(0, cy, Rm * 2.1);
      if (f.tk) { ctx.strokeStyle = hsl(f.hue + f.hue2, 70, 70, 0.9); ctx.lineWidth = 3.4; ctx.beginPath(); const p = at(Math.PI); ctx.moveTo(p[0], p[1]); for (let i = 1; i <= 14; i++) { const u = i / 14; ctx.lineTo(p[0] - u * 78 * f.ts, p[1] + Math.sin(u * 7 - B(6)) * 11 * u); } ctx.stroke(); }      // a flagellum
      const hairs = tents.length + feels.length + frills.length + fins.length + legs.length;
      if (hairs) { ctx.strokeStyle = hsl(f.hue + f.hue2, 70, 78, 0.75); ctx.lineWidth = 1.6; const n = 26 + hairs * 10, len = 9 + 7 * Math.min(2, hairs); for (let i = 0; i < n; i++) { const a = i / n * TAU, p = at(a), w = Math.sin(B(7) + i * 0.8) * 0.3; ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(p[0] + Math.cos(a + w) * len, p[1] + Math.sin(a + w) * len); ctx.stroke(); } }      // cilia
      for (let i = 0; i < spikes.length + horns.length; i++) for (let j = 0; j < 7; j++) { const a = j / 7 * TAU + i * 0.45, p = at(a), Ls = 16 * (spikes[i] || horns[i - spikes.length]).l; ctx.beginPath(); ctx.moveTo(p[0] - Math.sin(a) * 5, p[1] + Math.cos(a) * 5); ctx.lineTo(p[0] + Math.cos(a) * Ls, p[1] + Math.sin(a) * Ls); ctx.lineTo(p[0] + Math.sin(a) * 5, p[1] - Math.cos(a) * 5); ctx.closePath(); ink(hsl(f.hue + f.hue2, 60, 82, 0.95), 1.6); }
      const cell = function () { ctx.beginPath(); for (let i = 0; i <= 72; i++) { const p = at(i / 72 * TAU); if (i) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]); } ctx.closePath(); };
      cell();
      const g = ctx.createRadialGradient(-Rm * 0.25, cy - Rm * 0.3, 3, 0, cy, Rm * 1.35); g.addColorStop(0, hsl(f.hue, f.sat, 86, 0.9)); g.addColorStop(0.6, hsl(f.hue, f.sat, f.lit + 6, 0.72)); g.addColorStop(1, hsl(f.hue, f.sat, f.lit - 12, 0.85));
      ctx.fillStyle = g; ctx.fill();
      ctx.save(); cell(); ctx.clip();
      for (let i = 0; i < 9; i++) { const a = rr() * TAU, d = Math.sqrt(rr()) * Rm * 0.8; ctx.beginPath(); ctx.arc(Math.cos(a) * d, cy + Math.sin(a) * d * 0.9, 2 + rr() * 5, 0, TAU); ctx.fillStyle = hsl(f.hue + f.hue2, 70, 55 + rr() * 25, 0.55); ctx.fill(); }      // what floats inside it
      if (f.pat) { ctx.strokeStyle = hsl(f.hue + f.hue2, 80, 60, 0.4); ctx.lineWidth = 3; for (let i = 1; i <= 2; i++) { ctx.beginPath(); ctx.ellipse(0, cy, Rm * 0.3 * i * oval, Rm * 0.3 * i, 0, 0, TAU); ctx.stroke(); } }
      ctx.restore();
      cell(); ctx.strokeStyle = hsl(f.hue, Math.min(90, f.sat + 10), f.lit - 24, 0.9); ctx.lineWidth = 3; ctx.stroke(); ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1.2; ctx.stroke();
      // the nucleus; with an eye gene it is an eyespot that looks about
      const nx = Rm * 0.12, ny = cy + Rm * 0.02, nr = Rm * (0.3 + 0.12 * f.es);
      if (f.en > 0) eyeAt(nx, ny, nr, true);
      else { const wb = Math.sin(B(1.3)) * 0.08; ctx.beginPath(); ctx.ellipse(nx - Rm * 0.2, ny + Rm * 0.12, nr * 0.95, nr * (0.68 + wb), 0.5, 0, TAU); ctx.fillStyle = hsl(f.hue + f.hue2, 45, 72, 0.4); ctx.fill(); for (let i = 0; i < 5; i++) { const a = i * 1.26 + 0.4; ctx.beginPath(); ctx.arc(nx - Rm * 0.2 + Math.cos(a) * nr * 0.4, ny + Rm * 0.12 + Math.sin(a) * nr * 0.28, 1.8, 0, TAU); ctx.fillStyle = hsl(f.hue + f.hue2, 50, 50, 0.45); ctx.fill(); } }
      lights([[-Rm * 0.5, cy + Rm * 0.3], [Rm * 0.45, cy - Rm * 0.35]]);
      return;
    }

    // ═══ a star, or a spiny orb: arms all round ═══
    if (build === 'star' || build === 'orb') {
      const k = f.sym, orb = build === 'orb', R0 = orb ? 46 + 3 * f.n : 46 + 3 * f.n, arm = orb ? 6 : 28 + 12 * f.prof[2], cy = GROUND - 34 - R0 - arm;
      aura(0, cy, (R0 + arm) * 1.9);
      ctx.save(); ctx.translate(0, cy); ctx.rotate(Math.sin(B(0.8)) * 0.08);
      const at = function (a) { const q = R0 + arm * (0.5 + 0.5 * Math.cos(k * (a + Math.PI / 2))); return [Math.cos(a) * q * breathe, Math.sin(a) * q * breathe]; };
      const nA = orb ? k * 2 + 4 : k;
      for (let j = 0; j < nA; j++) { const a = j / nA * TAU - Math.PI / 2 + Math.sin(B(1.6) + j) * 0.05, p = at(a); for (let i = 0; i < R.length && i < 3; i++) grow(R[i], p[0] * 0.94, p[1] * 0.94, a, orb ? 1.1 : 0.85, j + i); }
      if (f.coat >= 2) for (let i = 0; i < 64; i++) { const a = i / 64 * TAU, p = at(a); fringe(p[0], p[1], Math.cos(a), Math.sin(a), i); }
      const sp = function () { ctx.beginPath(); for (let i = 0; i <= 90; i++) { const p = at(i / 90 * TAU - Math.PI / 2); if (i) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]); } ctx.closePath(); };
      sp(); skin(-R0 - arm, -R0 - arm, (R0 + arm) * 2, (R0 + arm) * 2, sp, 0);
      if (f.shell > 0.25) { ctx.beginPath(); ctx.arc(0, 0, R0 * 0.85, 0, TAU); ctx.globalAlpha = 0.3; ctx.fillStyle = col.dark; ctx.fill(); ctx.globalAlpha = 1; }
      if (orb) { ctx.beginPath(); ctx.moveTo(0, R0 * 0.45); ctx.lineTo(R0 * 0.2, R0 * 0.62); ctx.lineTo(0, R0 * 0.8); ctx.lineTo(-R0 * 0.2, R0 * 0.62); ctx.closePath(); ink(hsl(f.hue + f.hue2, 90, 72, 0.95), 1.6); }      // the jewel at its heart
      const L2 = []; for (let j = 0; j < k; j++) { const p = at(j / k * TAU - Math.PI / 2); L2.push([p[0] * 0.6, p[1] * 0.6]); } lights(L2);
      face(0, -R0 * 0.08, R0 * 0.7, 0, true);
      ctx.restore();
      return;
    }

    // ═══ a jelly or a soft blob: a bell, and what trails from it ═══
    if (build === 'jelly' || build === 'blob') {
      const jelly = build === 'jelly', Bw = (54 + 5 * f.n) * Math.pow(plump, 0.6), Bh = (40 + 6 * f.n) * (jelly ? 1 : 1.25), cy = GROUND - (jelly ? 118 : 34) - Bh * 0.5, pulse = 1 + Math.sin(B(2.6)) * 0.05;
      aura(0, cy + 20, Bw * 2.3);
      const q0 = tents[0], Lt = q0 ? 44 + 50 * q0.l : 0;
      if (jelly) for (let j = 0; j < 7; j++) { const x0 = (j - 3) * Bw * 0.26, far = j % 2; ctx.globalAlpha = far ? 0.55 : 0.9; for (let pass = 0; pass < 2; pass++) { ctx.strokeStyle = pass ? hsl(f.hue + f.hue2, f.sat, f.lit + 10, 0.9) : INK; ctx.lineWidth = pass ? (far ? 3 : 4.6) : (far ? 5 : 7); ctx.beginPath(); ctx.moveTo(x0, cy + Bh * 0.3); for (let i = 1; i <= 10; i++) { const u = i / 10; ctx.lineTo(x0 + Math.sin(u * 5 + B(2.4) + j * 1.3) * (6 + 12 * u) - (far ? 6 : 0) * u, cy + Bh * 0.3 + u * Lt * (far ? 1.15 : 0.9)); } ctx.stroke(); } ctx.globalAlpha = 1; }
      if (frills.length || (jelly && cn.sites > 6)) for (let j = 0; j < 3; j++) { const x0 = (j - 1) * Bw * 0.3; ctx.beginPath(); ctx.moveTo(x0 - 9, cy + Bh * 0.25); for (let i = 1; i <= 8; i++) { const u = i / 8; ctx.lineTo(x0 + (i % 2 ? 11 : -11) * (1 - u * 0.4) + Math.sin(B(2) + j) * 4 * u, cy + Bh * 0.25 + u * (Lt || 60) * 0.55); } ctx.lineTo(x0 + 9, cy + Bh * 0.25); ctx.closePath(); ctx.globalAlpha = 0.85; ink(col.frill, 1.8); ctx.globalAlpha = 1; }      // ruffled arms under the bell
      for (let i = 0; i < fins.length; i++) for (let sd = -1; sd <= 1; sd += 2) { const Lf = 34 * fins[i].l; ctx.beginPath(); ctx.moveTo(sd * Bw * 0.8, cy); ctx.quadraticCurveTo(sd * (Bw + Lf), cy - Lf * 0.5, sd * (Bw + Lf * 0.9), cy + Lf * 0.3); ctx.quadraticCurveTo(sd * Bw, cy + Lf * 0.5, sd * Bw * 0.7, cy + 14); ctx.closePath(); ink(col.fin, 2.2); }
      for (let i = 0; i < spikes.length; i++) for (let j = -2; j <= 2; j++) { const a = -Math.PI / 2 + j * 0.42, bx = Math.cos(a) * Bw * 0.95, by = cy + Math.sin(a) * Bh * 0.95, Ls = 15 * spikes[i].l; ctx.beginPath(); ctx.moveTo(bx - 6, by + 3); ctx.lineTo(bx + Math.cos(a) * Ls, by + Math.sin(a) * Ls * 1.3); ctx.lineTo(bx + 6, by + 3); ctx.closePath(); ink('#f4f7fb', 2); }
      const bell = function () { ctx.beginPath(); ctx.moveTo(-Bw * pulse, cy + Bh * 0.28); ctx.bezierCurveTo(-Bw * 1.12 * pulse, cy - Bh * 0.85, Bw * 1.12 * pulse, cy - Bh * 0.85, Bw * pulse, cy + Bh * 0.28); const sc = jelly ? 7 : 3; for (let i = 0; i < sc; i++) { const x1 = Bw * pulse - (i + 0.5) / sc * 2 * Bw * pulse, x2 = Bw * pulse - (i + 1) / sc * 2 * Bw * pulse; ctx.quadraticCurveTo(x1, cy + Bh * (jelly ? 0.5 : 0.62), x2, cy + Bh * 0.28); } ctx.closePath(); };
      if (f.coat >= 2) for (let i = 0; i <= 26; i++) { const a = Math.PI + i / 26 * Math.PI; fringe(Math.cos(a) * Bw, cy + Math.sin(a) * Bh * 0.72, Math.cos(a), Math.sin(a), i); }
      bell(); ctx.globalAlpha = jelly ? 0.82 : 1; skin(-Bw * 1.1, cy - Bh * 0.75, Bw * 2.2, Bh * 1.4, bell, 0); ctx.globalAlpha = 1;
      if (jelly) { ctx.save(); bell(); ctx.clip(); ctx.beginPath(); ctx.ellipse(0, cy - Bh * 0.02, Bw * 0.55, Bh * 0.36, 0, 0, TAU); ctx.fillStyle = hsl(f.hue + f.hue2, 80, 80, 0.4); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 1.4; for (let j = -2; j <= 2; j++) { ctx.beginPath(); ctx.moveTo(j * 5, cy - Bh * 0.6); ctx.quadraticCurveTo(j * Bw * 0.3, cy - Bh * 0.1, j * Bw * 0.42, cy + Bh * 0.28); ctx.stroke(); } ctx.restore(); }
      if (horns.length) hornsAt(0, cy - Bh * 0.42, Bw * 0.5, horns[0]);
      if (feels.length) feelersAt(0, cy - Bh * 0.5, Bw * 0.3, feels[0], 0);
      const L3 = []; for (let j = -3; j <= 3; j++) L3.push([j * Bw * 0.27, cy + Bh * 0.16]); lights(L3);
      for (let i = 0; i < R.length; i++) { const q = R[i], d = q.k === 8 ? F._dsg(q) : null; if (!d || q.on >= 0) continue; if (d.place === 'back' || d.place === 'head') F._design(ctx, d, 0, cy - Bh * 0.55, -Math.PI / 2, 50 * q.l, q.w, col, 1); else for (let sd = -1; sd <= 1; sd += 2) F._design(ctx, d, sd * Bw * 0.8, cy - 4, sd > 0 ? -0.4 : Math.PI + 0.4, 46 * q.l, q.w, col, sd); }
      face(0, cy - Bh * 0.02, Math.min(Bw, Bh) * 0.6, 0, false);
      return;
    }

    // ═══ a crab: a wide shell on many legs, pincers out in front ═══
    if (build === 'crab') {
      const Cw = (58 + 6 * f.n) * Math.pow(plump, 0.5), Ch = 34 + 3 * f.n, cy = GROUND - 30 - Ch * 0.5, lq = legs[0];
      aura(0, cy, Cw * 1.9);
      const nL = clamp(Math.round(cn.legSites / 2) - 1, 2, 4);
      for (let sd = -1; sd <= 1; sd += 2) for (let j = 0; j < nL; j++) { const x0 = sd * Cw * (0.45 + j * 0.16), st = Math.sin(B(6) + j * 1.7 + (sd > 0 ? 0 : 3.14)) * 5, kx = x0 + sd * (20 + j * 4), ky = cy - 6 - j * 2, fx = kx + sd * (10 + j * 3) + st, fy = GROUND - 4; limb2(x0, cy + 6, kx, ky, fx, fy, 7 + 3 * lq.w, col.limb); }
      // the pincers: big, held out, opening and closing
      for (let sd = -1; sd <= 1; sd += 2) { const big = 1 + (cn.pincer ? 0.25 : 0) + 0.2 * lq.l, sx = sd * Cw * 0.7, sy = cy - 4, ex = sx + sd * 34 * big, ey = cy - 26 * big, op = 0.25 + 0.2 * Math.sin(B(3) + sd); limb2(sx, sy, sx + sd * 24, sy - 2, ex, ey, 11, col.limb);
        for (let h = -1; h <= 1; h += 2) { const a = (sd > 0 ? -0.5 : Math.PI + 0.5) + h * op * sd; ctx.beginPath(); ctx.moveTo(ex, ey); ctx.quadraticCurveTo(ex + Math.cos(a + h * 0.7 * sd) * 20 * big, ey + Math.sin(a + h * 0.7 * sd) * 20 * big, ex + Math.cos(a) * 32 * big, ey + Math.sin(a) * 32 * big); ctx.quadraticCurveTo(ex + Math.cos(a) * 14 * big, ey + Math.sin(a) * 14 * big, ex, ey); ink(hsl(f.hue + f.hue2, f.sat, f.lit + 4, 1), 2.2); } }
      if (f.tk) { ctx.beginPath(); ctx.moveTo(-10, cy + Ch * 0.4); ctx.lineTo(0, cy + Ch * 0.4 + 14 * f.ts); ctx.lineTo(10, cy + Ch * 0.4); ctx.closePath(); ink(col.fin, 2); }
      for (let i = 0; i < spikes.length; i++) for (let j = -3; j <= 3; j++) { const a = -Math.PI / 2 + j * 0.36, bx = Math.cos(a) * Cw * 0.96, by = cy + Math.sin(a) * Ch * 0.9, Ls = 13 * spikes[i].l; ctx.beginPath(); ctx.moveTo(bx - 5, by + 3); ctx.lineTo(bx + Math.cos(a) * Ls, by + Math.sin(a) * Ls * 1.4); ctx.lineTo(bx + 5, by + 3); ctx.closePath(); ink('#f4f7fb', 2); }
      for (let i = 0; i < fins.length; i++) for (let sd = -1; sd <= 1; sd += 2) { const Lf = 26 * fins[i].l; ctx.beginPath(); ctx.moveTo(sd * Cw * 0.5, cy - Ch * 0.5); ctx.quadraticCurveTo(sd * Cw * 0.7, cy - Ch - Lf, sd * Cw * 0.95, cy - Ch * 0.5 - Lf * 0.4); ctx.quadraticCurveTo(sd * Cw * 0.8, cy - Ch * 0.3, sd * Cw * 0.6, cy - Ch * 0.2); ctx.closePath(); ink(col.fin, 2); }
      const shell = function () { ctx.beginPath(); ctx.moveTo(-Cw, cy + 4); ctx.bezierCurveTo(-Cw * 1.05, cy - Ch * 1.25, Cw * 1.05, cy - Ch * 1.25, Cw, cy + 4); ctx.bezierCurveTo(Cw * 0.7, cy + Ch * 0.75, -Cw * 0.7, cy + Ch * 0.75, -Cw, cy + 4); ctx.closePath(); };
      if (f.coat >= 2) for (let i = 0; i <= 24; i++) { const a = Math.PI + i / 24 * Math.PI; fringe(Math.cos(a) * Cw, cy + Math.sin(a) * Ch * 0.9, Math.cos(a), Math.sin(a), i); }
      shell(); skin(-Cw, cy - Ch, Cw * 2, Ch * 1.7, shell, 0);
      ctx.save(); shell(); ctx.clip(); ctx.strokeStyle = INK; ctx.globalAlpha = 0.3; ctx.lineWidth = 2; for (let j = 1; j <= 2; j++) { ctx.beginPath(); ctx.ellipse(0, cy + 4, Cw * (1 - j * 0.24), Ch * (1.05 - j * 0.24), 0, Math.PI, TAU); ctx.stroke(); } for (let j = -2; j <= 2; j++) { ctx.beginPath(); ctx.moveTo(j * Cw * 0.16, cy - Ch * 0.9); ctx.lineTo(j * Cw * 0.36, cy + 4); ctx.stroke(); } ctx.restore();      // the plates of its shell
      if (horns.length) hornsAt(0, cy - Ch * 0.78, Cw * 0.5, horns[0]);
      if (feels.length) feelersAt(0, cy - Ch * 0.7, Cw * 0.2, feels[0], 0);
      for (let i = 0; i < R.length; i++) { const q = R[i], d = q.k === 8 ? F._dsg(q) : null; if (!d || q.on >= 0) continue; if (d.place === 'sides') for (let sd = -1; sd <= 1; sd += 2) F._design(ctx, d, sd * Cw * 0.6, cy - Ch * 0.5, sd > 0 ? -0.9 : Math.PI + 0.9, 44 * q.l, q.w, col, sd); else F._design(ctx, d, 0, cy - Ch * 0.7, -Math.PI / 2, 48 * q.l, q.w, col, 1); }
      lights([[-Cw * 0.5, cy - Ch * 0.3], [Cw * 0.5, cy - Ch * 0.3], [0, cy - Ch * 0.6]]);
      // its eyes stand up on stalks
      const er = clamp(9 + 12 * f.es, 8, 17), ne = Math.max(1, f.en);
      for (let j = 0; j < Math.min(2, ne); j++) { const ex = (ne === 1 ? 0 : (j ? 1 : -1) * Cw * 0.26), eb = cy - Ch * 0.5, et = cy - Ch * 0.75 - 16 - 14 * f.ek; for (let pass = 0; pass < 2; pass++) { ctx.strokeStyle = pass ? col.body : INK; ctx.lineWidth = pass ? 6 : 10; ctx.beginPath(); ctx.moveTo(ex, eb); ctx.lineTo(ex, et); ctx.stroke(); } eyeAt(ex, et, er, false); }
      ctx.strokeStyle = INK; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(-9, cy + Ch * 0.12); ctx.quadraticCurveTo(0, cy + Ch * 0.3, 9, cy + Ch * 0.12); ctx.stroke();
      return;
    }

    // ═══ everything with a spine: a fish, a serpent, a beast on all fours, something that stands up ═══
    const plan = build === 'plan' ? G.planOf(f.pl) : null;
    const upright = build === 'upright', leg0 = legs[0];
    const legLen = legs.length ? 14 + 16 * Math.min(1.6, leg0.l) : 0;
    const Hr = clamp(30 * Math.pow(f.hd, 0.85), 22, 50);                    // the head's half-size
    let Lb = build === 'serpent' ? 150 + 14 * f.n : build === 'beast' ? 80 + 17 * Math.min(f.n, 10) : build === 'fish' ? 66 + 18 * Math.min(f.n, 9) : 42 + 13 * Math.min(f.n, 9);      // the body's length, without the head
    Lb = Math.min(Lb, upright ? GROUND - legLen + 170 - Hr * 2 : 290 - Hr * 2);
    const Wb = (build === 'serpent' ? 19 : build === 'beast' ? 30 : build === 'fish' ? 36 : plan ? 30 * plan.girth : 40) * Math.pow(plump, 0.8) * (1 + 0.012 * f.n);
    const L = Lb + Hr * 2, hs = Hr * 2 / L, M = 36, S = [];
    const neckW = Math.min(Hr * f.hx, Hr) * (build === 'fish' ? 0.95 : 0.82 - 0.75 * (f.n > 1 ? f.nk : 0));
    const hover = build === 'fish' ? 54 : build === 'serpent' ? 30 : plan && !plan.stands ? 40 : 0;
    // a build's spine is a line through its points (x forward, y up from the floor), smoothed and scaled to this body's length
    let PX = null, PY = null, PD = null, unit = 1;
    if (plan) {
      let P = plan.spine.map(function (p) { return [p[0], p[1]]; });
      for (let it = 0; it < 2; it++) { const Q = [P[0]]; for (let i = 0; i < P.length - 1; i++) { Q.push([P[i][0] * 0.75 + P[i + 1][0] * 0.25, P[i][1] * 0.75 + P[i + 1][1] * 0.25], [P[i][0] * 0.25 + P[i + 1][0] * 0.75, P[i][1] * 0.25 + P[i + 1][1] * 0.75]); } Q.push(P[P.length - 1]); P = Q; }
      let len = 0, top = 0, x0 = 1e9, x1 = -1e9; PD = [0]; for (let i = 1; i < P.length; i++) { len += Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]); PD.push(len); } for (let i = 0; i < P.length; i++) { top = Math.max(top, P[i][1]); x0 = Math.min(x0, P[i][0]); x1 = Math.max(x1, P[i][0]); }
      unit = Math.min(L / Math.max(0.2, len), (270 - hover - Hr) / Math.max(0.2, top), 290 / Math.max(0.3, x1 - x0));
      const cx0 = (x0 + x1) / 2; PX = P.map(function (p) { return (p[0] - cx0) * unit; }); PY = P.map(function (p) { return GROUND - hover - 4 - p[1] * unit; }); for (let i = 0; i < PD.length; i++) PD[i] /= len;
    }
    for (let i = 0; i <= M; i++) {
      const u = i / M, d = u * L; let x, y;
      if (plan) { let j = 1; while (j < PD.length - 1 && PD[j] < u) j++; const q = (u - PD[j - 1]) / Math.max(1e-6, PD[j] - PD[j - 1]); x = lerp(PX[j - 1], PX[j], q); y = lerp(PY[j - 1], PY[j], q) + Math.sin(B(2.2) + u * 3) * 1.5; }
      else if (upright) { x = Math.sin(u * 3 + B(1.3)) * 2; y = GROUND - legLen - L + d; }
      else {
        x = L / 2 - d;
        const base = GROUND - hover - legLen - Wb * 0.9, lift = build === 'beast' ? (14 + 75 * f.nk) : build === 'serpent' ? 34 : 4;
        const up = Math.pow(Math.max(0, 1 - u / (hs * 1.9)), 1.5);
        y = base - lift * up + (build === 'serpent' ? Math.sin(u * 7.2 + 0.6 + B(2)) * 22 * Math.min(1, u * 3) : build === 'fish' ? Math.sin(u * 3.1 + B(2.5)) * 6 * u : Math.sin(u * 3.14) * -5);
        x += build === 'beast' ? lift * up * 0.3 : 0;
      }
      let w;
      const hw = u < hs ? Hr * f.hx * Math.pow(Math.max(0, 1 - Math.pow(Math.abs(u / hs * 2 - 1), f.hq)), 1 / f.hq) : 0;
      if (u < hs) w = Math.max(hw, neckW * clamp((u - hs * 0.45) / (hs * 0.55), 0, 1));
      else { const v = (u - hs) / (1 - hs), pf = profB(v) * Wb, e = 1 - Math.pow(v, 3.2); w = lerp(neckW, pf, clamp(v / 0.18, 0, 1)) * (v > 0.6 ? Math.sqrt(Math.max(0, e)) / Math.sqrt(1 - Math.pow(0.6, 3.2)) : 1); w = Math.max(w, v > 0.95 ? 0 : 4); }
      S.push({ u: u, x: x, y: y, w: w * (u >= hs ? breathe : 1) });
    }
    for (let i = 0; i <= M; i++) { const a = S[Math.max(0, i - 1)], b = S[Math.min(M, i + 1)], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1; S[i].dx = dx / d; S[i].dy = dy / d; S[i].nx = -dy / d; S[i].ny = dx / d; }
    const backSign = upright || plan ? 1 : (S[M >> 1].ny < 0 ? 1 : -1);        // which side of the spine is the back
    const station = function (u) { return S[clamp(Math.round(u * M), 0, M)]; };
    const segU = function (a) { return hs + (1 - hs) * clamp((a + 0.5) / f.n, 0.08, 0.92); };
    const hi = Math.round(hs * 0.5 * M), H = S[hi];
    function profB(v) { const x = clamp(v, 0, 0.9999) * 3, i = Math.floor(x); let q = x - i; q = q * q * (3 - 2 * q); return lerp(f.prof[1 + i], f.prof[2 + i], q); }
    const O = []; for (let i = 0; i <= M; i++) O.push([S[i].x + S[i].nx * S[i].w, S[i].y + S[i].ny * S[i].w]); for (let i = M; i >= 0; i--) O.push([S[i].x - S[i].nx * S[i].w, S[i].y - S[i].ny * S[i].w]);
    const tracePath = function () { const m = O.length; ctx.beginPath(); ctx.moveTo((O[m - 1][0] + O[0][0]) / 2, (O[m - 1][1] + O[0][1]) / 2); for (let i = 0; i < m; i++) { const p = O[i], q = O[(i + 1) % m]; ctx.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2); } ctx.closePath(); };
    const mid = station(0.5);
    aura(mid.x, mid.y, Math.max(L * 0.62, 90));

    // behind the body
    if (f.tk && f.n > 1) tail();
    for (let i = 0; i < R.length; i++) { const q = R[i], d = q.k === 8 ? F._dsg(q) : null; if (!d || q.on >= 0) continue;
      if (d.place === 'back') { const p = station(segU((q.a + q.b) / 2)); if (upright) F._design(ctx, d, H.x, H.y - Hr * 0.2, -Math.PI / 2 + Math.sin(B(1.5)) * 0.04, 66 * q.l, q.w, col, 1); else F._design(ctx, d, p.x, p.y + p.ny * p.w * 0.6 * backSign, Math.atan2(p.ny * backSign, p.nx * backSign) - 0.35, 60 * q.l, q.w, col, 1); }
      else if (d.place === 'sides') { const p = station(segU(q.a)); if (upright) for (let sd = -1; sd <= 1; sd += 2) F._design(ctx, d, p.x + sd * p.w * 0.6, p.y, (sd > 0 ? -0.5 : Math.PI + 0.5) + sd * Math.sin(B(3)) * (d.motion === 'flap' ? 0.2 : 0.05), 52 * q.l, q.w, col, sd); else F._design(ctx, d, p.x, p.y + p.ny * p.w * 0.5 * backSign, Math.atan2(p.ny * backSign, p.nx * backSign) - 0.75 + Math.sin(B(3)) * (d.motion === 'flap' ? 0.2 : 0.05), 56 * q.l, q.w, col, 1); }
    }
    for (let i = 0; i < fins.length; i++) { const q = fins[i], p = station(segU(q.a)), Lf = 44 * q.l, fl = Math.sin(B(3.4) + i) * 0.12;
      if (upright) for (let sd = -1; sd <= 1; sd += 2) { ctx.save(); ctx.translate(p.x + sd * p.w * 0.7, p.y); ctx.rotate(sd * (-0.35 + fl)); ctx.beginPath(); ctx.moveTo(0, -12); ctx.quadraticCurveTo(sd * Lf * 0.9, -Lf * 0.75, sd * Lf * 1.2, -Lf * 0.2); ctx.quadraticCurveTo(sd * Lf * 0.8, Lf * 0.25, 0, 20); ctx.closePath(); ink(col.fin, 2.2); ribs(sd * Lf, -Lf * 0.4); ctx.restore(); }
      else {      // a sail of a fin on the back, and a smaller one under the belly
        ctx.save(); ctx.translate(p.x + p.nx * p.w * 0.85 * backSign, p.y + p.ny * p.w * 0.85 * backSign); ctx.rotate(Math.atan2(p.ny * backSign, p.nx * backSign) + Math.PI / 2 + fl); ctx.beginPath(); ctx.moveTo(22, 4); ctx.quadraticCurveTo(Lf * 0.1, -Lf * 1.3, -Lf * 0.8, -Lf * 0.8); ctx.quadraticCurveTo(-Lf * 0.3, -Lf * 0.2, -20, 4); ctx.closePath(); ink(col.fin, 2.2); ribs(-Lf * 0.5, -Lf * 0.85); ctx.restore();
        if (build !== 'beast' && !(plan && plan.stands)) { ctx.save(); ctx.translate(p.x - p.nx * p.w * 0.8 * backSign, p.y - p.ny * p.w * 0.8 * backSign); ctx.rotate(Math.atan2(-p.ny * backSign, -p.nx * backSign) - Math.PI / 2 - fl); ctx.beginPath(); ctx.moveTo(14, -3); ctx.quadraticCurveTo(0, Lf * 0.8, -Lf * 0.55, Lf * 0.55); ctx.quadraticCurveTo(-Lf * 0.2, Lf * 0.1, -12, -3); ctx.closePath(); ink(col.fin, 2); ctx.restore(); }
      }
    }
    for (let i = 0; i < spikes.length; i++) { const q = spikes[i]; for (let a = q.a; a <= q.b && a < f.n; a += q.e) { const p = station(segU(a)), Ls = 15 * q.l; for (let sd = (upright ? -1 : 1); sd <= 1; sd += 2) { const s2 = upright ? sd : backSign, bx = p.x + p.nx * p.w * 0.9 * s2, by = p.y + p.ny * p.w * 0.9 * s2; ctx.beginPath(); ctx.moveTo(bx - p.dx * 7, by - p.dy * 7); ctx.lineTo(bx + p.nx * s2 * Ls * 1.5 + p.dx * Ls * 0.3, by + p.ny * s2 * Ls * 1.5 + p.dy * Ls * 0.3); ctx.lineTo(bx + p.dx * 7, by + p.dy * 7); ctx.closePath(); ink('#f4f7fb', 2); } } }
    if (frills.length) { const q = frills[0], p = S[Math.round(hs * M)], Lf = 30 * q.l; for (let sd = -1; sd <= 1; sd += 2) { const bx = p.x + p.nx * p.w * 0.5 * sd, by = p.y + p.ny * p.w * 0.5 * sd, a0 = Math.atan2(p.ny * sd, p.nx * sd) + (upright ? 0 : 0.5 * sd * backSign), spn = 0.95 + 0.08 * Math.sin(B(3)); ctx.beginPath(); ctx.moveTo(bx, by); for (let j = 0; j <= 6; j++) { const a = a0 + (j / 6 - 0.5) * 1.6 * spn, q2 = Lf * (j % 2 ? 0.85 : 1.1); ctx.lineTo(bx + Math.cos(a) * q2, by + Math.sin(a) * q2); } ctx.closePath(); ink(col.frill, 2.2); } }      // gills that stand out behind the head
    if (f.shell > 0.25 && upright) { ctx.beginPath(); const c0 = station(hs + (1 - hs) * 0.5); ctx.ellipse(c0.x, c0.y + 4, c0.w * (1.18 + 0.12 * f.shell), Lb * 0.56, 0, 0, TAU); ink(col.dark, 2.6); }
    if (build === 'beast') for (let i = 0; i < legs.length; i++) for (let a = legs[i].a; a <= legs[i].b && a < f.n; a += legs[i].e) leg(legs[i], station(segU(a)), a, true);
    if (plan) for (let i = 0; i < plan.legs.length; i++) planLeg(plan.legs[i], i, true);
    if (tents.length && !upright) for (let i = 0; i < 4; i++) { const p = station(0.55 + i * 0.12), q = tents[0], Lt = 30 * q.l + 12, sw = Math.sin(B(2.4) + i * 1.3) * 8, y0 = p.y - p.ny * p.w * 0.7 * backSign; strokeLimb(p.x, y0, p.x - 14 - sw, y0 + Lt * 0.5, p.x - 30 + sw, y0 + Lt, 6, col.limb); }
    if (tents.length && upright) for (let j = 0; j < 4; j++) { const q = tents[0], Lt = 32 * q.l + 14, x0 = (j - 1.5) * Wb * 0.42, sw = Math.sin(B(2.4) + j * 1.3) * 9, yb = S[M].y - 8; strokeLimb(x0, yb, x0 - sw, yb + Lt * 0.5, x0 + sw * 0.6, yb + Lt, 7, col.limb); }
    if (upright) { const q = legs.length > 1 ? legs[legs.length - 1] : leg0; for (let sd = -1; sd <= 1; sd += 2) { const x0 = sd * Math.max(10, station(0.9).w * 0.55 + 4), st = Math.sin(B(5) + (sd > 0 ? 0 : 3.14)) * 3; strokeLimb(x0, S[M].y - 10, x0 + sd * 3, (S[M].y + GROUND) / 2, x0 + sd * 2 + st, GROUND - 6, 11, col.limb); foot(x0 + sd * 2 + st, GROUND - 4, sd, q.t); } }

    // the body
    if (f.coat >= 2) for (let i = 0; i < O.length; i++) { const j = i <= M ? i : 2 * M + 1 - i, sd = i <= M ? 1 : -1, p = S[j]; if (p.w < 4 || (!upright && j < hs * M * 0.8)) continue; fringe(O[i][0], O[i][1], p.nx * sd, p.ny * sd, i); }
    tracePath();
    { let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; for (let i = 0; i < O.length; i++) { x0 = Math.min(x0, O[i][0]); x1 = Math.max(x1, O[i][0]); y0 = Math.min(y0, O[i][1]); y1 = Math.max(y1, O[i][1]); } skin(x0, y0, x1 - x0, y1 - y0, tracePath, 1); }
    if (f.shell > 0.25 && !upright) { const C = [], i0 = Math.round((hs + 0.05) * M), i1 = M - 3; for (let i = i0; i <= i1; i++) { const p = S[i], e = Math.sin((i - i0) / Math.max(1, i1 - i0) * Math.PI); C.push([p.x + p.nx * (p.w + 10 * e * f.shell) * backSign, p.y + p.ny * (p.w + 10 * e * f.shell) * backSign]); } for (let i = i1; i >= i0; i--) { const p = S[i]; C.push([p.x - p.nx * p.w * 0.15 * backSign, p.y - p.ny * p.w * 0.15 * backSign]); } if (C.length > 5) { ctx.beginPath(); ctx.moveTo(C[0][0], C[0][1]); for (let i = 1; i < C.length; i++) ctx.lineTo(C[i][0], C[i][1]); ctx.closePath(); ink(col.dark, 2.4); ctx.strokeStyle = INK; ctx.globalAlpha = 0.3; ctx.lineWidth = 1.8; for (let i = i0 + 3; i < i1; i += 4) { const p = S[i]; ctx.beginPath(); ctx.moveTo(p.x + p.nx * (p.w + 8) * backSign, p.y + p.ny * (p.w + 8) * backSign); ctx.lineTo(p.x, p.y); ctx.stroke(); } ctx.globalAlpha = 1; } }      // a dome of a shell over its back
    if (f.crest > 0.25) for (let i = (upright ? 2 : Math.round(hs * M * 0.5)); i <= Math.round(M * (upright ? hs : 0.85)); i += 2) { const p = S[i], up = 9 + 16 * f.crest, bx = upright ? H.x + (i - hi) * 6 : p.x + p.nx * p.w * backSign, by = upright ? H.y - Hr * Math.sqrt(Math.max(0.05, 1 - Math.pow((i - hi) * 6 / (Hr * f.hx), 2))) : p.y + p.ny * p.w * backSign; if (upright && Math.abs((i - hi) * 6) > Hr * f.hx * 0.8) continue; ctx.beginPath(); ctx.moveTo(bx - 6, by + 2); ctx.lineTo(bx + (upright ? 0 : p.nx * backSign * up - p.dx * up * 0.4), by + (upright ? -up : p.ny * backSign * up)); ctx.lineTo(bx + 6, by + 2); ctx.closePath(); ink(col.frill, 1.8); }
    if (f.venom > 0.3) for (let i = 0; i < 2; i++) { const p = station(0.6 + i * 0.2); ctx.beginPath(); ctx.arc(p.x - p.nx * p.w * 0.5 * backSign, p.y - p.ny * p.w * 0.5 * backSign, 4.5, 0, TAU); ink('#b6ff3c', 1.6); }
    { const P = []; for (let i = 0; i < 5; i++) { const p = station(hs + (1 - hs) * (0.15 + i * 0.17)); P.push([p.x - p.nx * p.w * 0.25 * backSign, p.y - p.ny * p.w * 0.25 * backSign]); } lights(P); }

    // in front of the body
    if (build === 'beast') for (let i = 0; i < legs.length; i++) for (let a = legs[i].a; a <= legs[i].b && a < f.n; a += legs[i].e) leg(legs[i], station(segU(a)), a, false);
    if (plan) for (let i = 0; i < plan.legs.length; i++) planLeg(plan.legs[i], i, false);
    if (upright && legs.length > 1) arms(legs[0]);
    if ((build === 'fish' || build === 'serpent') && fins.length) { const p = station(hs + (1 - hs) * 0.22), Lf = 26 * fins[0].l, fl = Math.sin(B(4)) * 0.25; ctx.save(); ctx.translate(p.x, p.y - p.ny * p.w * 0.25 * backSign); ctx.rotate(2.5 + fl); ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(Lf * 0.6, -Lf * 0.5, Lf * 1.1, 0); ctx.quadraticCurveTo(Lf * 0.6, Lf * 0.4, 0, 0); ctx.closePath(); ink(col.fin, 2); ctx.restore(); }      // the fin on its flank
    if (horns.length) hornsAt(H.x + (upright ? 0 : -4), H.y - Hr * 0.72, upright ? Hr * f.hx * 0.55 : 10, horns[0]);
    if (feels.length) feelersAt(H.x + (upright ? 0 : 8), H.y - Hr * 0.85, Hr * 0.3, feels[0], upright ? 0 : 1);
    for (let i = 0; i < R.length; i++) { const q = R[i], d = q.k === 8 ? F._dsg(q) : null; if (d && d.place === 'head' && q.on < 0) for (let sd = -1; sd <= 1; sd += 2) F._design(ctx, d, H.x + sd * Hr * 0.5, H.y - Hr * 0.6, (sd > 0 ? -1.0 : Math.PI + 1.0) + sd * Math.sin(B(2)) * 0.04, 44 * q.l, q.w, col, sd); }
    face(H.x + (upright ? 0 : Hr * 0.1), H.y + (upright ? Hr * 0.06 : -Hr * 0.05), Hr * Math.min(1, f.hx), upright ? 0 : 1, false);
    return;

    // ── helpers (shared by every build) ──
    function ribs(x, y) { ctx.strokeStyle = 'rgba(7,18,31,.28)'; ctx.lineWidth = 1.4; for (let r = 1; r <= 3; r++) { ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(x * (0.5 + r * 0.17), y * (1.3 - r * 0.3)); ctx.stroke(); } }
    function strokeLimb(x0, y0, cx, cy2, x1, y1, w, fill) { for (let pass = 0; pass < 2; pass++) { ctx.strokeStyle = pass ? fill : INK; ctx.lineWidth = pass ? w : w + 4.4; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(cx, cy2, x1, y1); ctx.stroke(); } }
    function limb2(x0, y0, kx, ky, x1, y1, w, fill) { for (let pass = 0; pass < 3; pass++) { ctx.strokeStyle = pass === 2 ? 'rgba(255,255,255,0.3)' : pass ? fill : INK; ctx.lineWidth = pass === 2 ? w * 0.26 : pass ? w : w + 4.4; const o = pass === 2 ? -w * 0.2 : 0; ctx.beginPath(); ctx.moveTo(x0 + o, y0); ctx.lineTo(kx + o, ky); ctx.lineTo(x1 + o, y1); ctx.stroke(); } }
    function foot(x, y, sd, tip) {
      if (tip === 2) { for (let h = -1; h <= 1; h += 2) { ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + sd * 10, y + h * 10, x + sd * 18, y + h * 3); ctx.quadraticCurveTo(x + sd * 9, y + h * 4, x, y); ink('#ff8a6b', 2); } return; }
      ctx.beginPath(); ctx.ellipse(x + sd * 6, y, tip === 3 ? 19 : 15, tip === 3 ? 7 : 9, 0, 0, TAU); ink(tip === 3 ? col.fin : col.limb, 2.2);
      if (tip !== 1) { ctx.strokeStyle = INK; ctx.globalAlpha = 0.45; ctx.lineWidth = 1.5; for (let j = -1; j <= 1; j += 2) { ctx.beginPath(); ctx.moveTo(x + sd * (tip === 3 ? 12 : 9), y + j * 1.5); ctx.lineTo(x + sd * (tip === 3 ? 17 : 14), y + j * 3.2); ctx.stroke(); } ctx.globalAlpha = 1; }
      if (tip === 1) { ctx.strokeStyle = INK; ctx.globalAlpha = 0.5; ctx.lineWidth = 1.6; for (let j = -1; j <= 1; j++) { ctx.beginPath(); ctx.moveTo(x + sd * (6 + j * 5), y - 4); ctx.lineTo(x + sd * (8 + j * 5), y + 4); ctx.stroke(); } ctx.globalAlpha = 1; }
    }
    // a leg of an invented build: hip on the belly, a knee and a foot where the build puts them; a foot that stands is on the floor
    function planLeg(g2, i, far) {
      const p = station(hs + (1 - hs) * g2.u), hip = GROUND - 5 - (p.y - p.ny * p.w * 0.55), lu = g2.air || !plan.stands ? 30 + 14 * (leg0 ? Math.min(1.6, leg0.l) : 1) : clamp(hip, 22, 150), st = Math.sin(B(5) + i * 2.2 + (far ? 3.14 : 0)) * (g2.air ? 3 : 6);
      const hx0 = p.x - p.nx * p.w * 0.55 + (far ? 8 : -3), hy0 = p.y - p.ny * p.w * 0.55, kx = hx0 + g2.knee[0] * lu + st * 0.3, ky = hy0 - g2.knee[1] * lu;
      const fx = kx + g2.foot[0] * lu + st, fy = g2.air || !plan.stands ? ky - g2.foot[1] * lu : GROUND - 5, w = (8 + 5 * (leg0 ? leg0.w : 0.5)) * g2.thick;
      if (far) ctx.globalAlpha = 0.72;
      limb2(hx0, hy0, kx, ky, fx, fy, w, far ? col.dark : col.limb); foot(fx, fy + 1, 1, leg0 ? leg0.t : 0);
      ctx.globalAlpha = 1;
    }
    function leg(q, p, a, far) {
      const st = Math.sin(B(5) + a * 2.2 + (far ? 3.14 : 0)) * 6, x0 = p.x + (far ? 7 : -4), y0 = p.y - p.ny * p.w * 0.6 * backSign, w = (9 + 6 * q.w) * (p.w > 16 ? 1 : 0.8);
      if (far) ctx.globalAlpha = 0.72;
      strokeLimb(x0, y0, x0 + 5 - st * 0.4, (y0 + GROUND) / 2, x0 + st, GROUND - 5, w, far ? col.dark : col.limb); foot(x0 + st, GROUND - 4, 1, q.t);
      ctx.globalAlpha = 1;
    }
    function arms(q) {
      const p = station(hs + (1 - hs) * 0.3);
      for (let sd = -1; sd <= 1; sd += 2) {
        const La = 26 * q.l + 12, wv = Math.sin(B(2.6) + (sd > 0 ? 0 : 1.4)) * 0.16, sx = p.x + sd * p.w * 0.85, sy = p.y, a = (sd > 0 ? 0.55 : Math.PI - 0.55) + sd * wv, ex = sx + Math.cos(a) * La, ey = sy + Math.sin(a) * La;
        strokeLimb(sx, sy, sx + sd * La * 0.6, sy - 4, ex, ey, 12, col.limb);
        const k2 = kidOf(q), tip = k2 && k2.k === 0 && k2.t ? k2.t : q.t;
        if (tip === 2) for (let h = -1; h <= 1; h += 2) { ctx.beginPath(); ctx.moveTo(ex, ey); ctx.quadraticCurveTo(ex + Math.cos(a + h) * 14, ey + Math.sin(a + h) * 14, ex + Math.cos(a + h * 0.2) * 20, ey + Math.sin(a + h * 0.2) * 20); ctx.quadraticCurveTo(ex + Math.cos(a + h * 0.4) * 8, ey + Math.sin(a + h * 0.4) * 8, ex, ey); ink('#ff8a6b', 2.2); }
        else if (tip === 3) { ctx.beginPath(); ctx.ellipse(ex + Math.cos(a) * 7, ey + Math.sin(a) * 7, 13, 8, a, 0, TAU); ink(col.fin, 2.2); }
        else if (tip === 1 || k2) { ctx.beginPath(); ctx.arc(ex, ey, 9, 0, TAU); ink(col.limb, 2.2); for (let h = -1; h <= 1; h++) { ctx.beginPath(); ctx.arc(ex + Math.cos(a + h * 0.7) * 10, ey + Math.sin(a + h * 0.7) * 10, 4, 0, TAU); ink(col.limb, 1.8); } }
        else { ctx.beginPath(); ctx.arc(ex, ey, 7.5, 0, TAU); ink(col.limb, 2.2); }
      }
    }
    function hornsAt(x, y, half, q) { const Lh = 30 * q.l; for (let sd = -1; sd <= 1; sd += 2) { const bx = x + sd * half; ctx.beginPath(); ctx.moveTo(bx - sd * 9, y + 6); ctx.quadraticCurveTo(bx + sd * Lh * 0.2, y - Lh * 0.9, bx + sd * Lh * (0.6 + q.c * 0.5), y - Lh * 1.15); ctx.quadraticCurveTo(bx + sd * Lh * 0.55, y - Lh * 0.4, bx + sd * 10, y + 8); ctx.closePath(); ink('#ffe9b8', 2.2); } }
    function feelersAt(x, y, half, q, fwd) { const Lf = 34 * q.l; for (let sd = -1; sd <= 1; sd += 2) { const sw = Math.sin(B(2.4) + sd) * 5, bx = x + sd * half, ex = bx + sd * Lf * 0.5 + sw + fwd * Lf * 0.5, ey = y - Lf; for (let pass = 0; pass < 2; pass++) { ctx.strokeStyle = pass ? col.limb : INK; ctx.lineWidth = pass ? 3.2 : 6.4; ctx.beginPath(); ctx.moveTo(bx, y); ctx.quadraticCurveTo(bx + sd * Lf * 0.1, y - Lf * 0.8, ex, ey); ctx.stroke(); } const g = ctx.createRadialGradient(ex, ey, 0, ex, ey, 11); g.addColorStop(0, 'rgba(255,255,235,1)'); g.addColorStop(0.5, 'rgba(255,243,168,0.7)'); g.addColorStop(1, 'rgba(255,243,168,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(ex, ey, 11, 0, TAU); ctx.fill(); } }
    function tail() {
      const s = 34 * f.ts, wag = Math.sin(B(3)) * 0.2, p = S[M - 1];
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate((upright ? 0.35 : Math.atan2(p.dy, p.dx)) + wag); if (upright) ctx.translate(p.w * 0.4 + 6, -8); ctx.beginPath();
      if (f.tk === 1) { ctx.moveTo(-4, 0); ctx.quadraticCurveTo(s * 0.6, -s * 1.15, s * 1.45, -s * 0.85); ctx.quadraticCurveTo(s * 0.95, 0, s * 1.45, s * 0.85); ctx.quadraticCurveTo(s * 0.6, s * 1.15, -4, 0); }
      else if (f.tk === 2) { ctx.moveTo(-4, 0); ctx.quadraticCurveTo(s * 0.6, -s * 0.2, s * 1.5, -s * 1.05); ctx.quadraticCurveTo(s * 1.0, 0, s * 1.5, s * 1.05); ctx.quadraticCurveTo(s * 0.6, s * 0.2, -4, 0); }
      else if (f.tk === 3) { ctx.moveTo(0, -7); ctx.quadraticCurveTo(s * 1.2, -s * 0.2, s * 2.0, -s * 1.1); ctx.quadraticCurveTo(s * 1.3, s * 0.3, 0, 7); }
      else { ctx.moveTo(0, -6); ctx.lineTo(s * 0.9, -6); ctx.arc(s * 1.2, 0, s * 0.42, -2.3, 2.3); ctx.lineTo(0, 6); }
      ctx.closePath(); ink(f.tk === 4 ? col.dark : col.fin, 2.4);
      if (f.tk <= 2) { ctx.strokeStyle = 'rgba(7,18,31,.25)'; ctx.lineWidth = 1.3; for (let j = -2; j <= 2; j++) { ctx.beginPath(); ctx.moveTo(4, j * 2); ctx.lineTo(s * 1.25, j * s * 0.36); ctx.stroke(); } }
      ctx.restore();
    }
    function fringe(x, y, nx, ny, i) {
      if (f.coat === 2) { const ln = 7 + (i % 3) * 2.5; ctx.strokeStyle = col.dark; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x - nx * 3, y - ny * 3); ctx.lineTo(x + nx * ln, y + ny * ln + ln * 0.35); ctx.stroke(); }
      else if (i % 2 === 0) { const tx = -ny, ty = nx; ctx.beginPath(); ctx.moveTo(x - tx * 6, y - ty * 6); ctx.quadraticCurveTo(x + nx * 10 - tx * 6, y + ny * 10 - ty * 6, x + nx * 15, y + ny * 15 + 5); ctx.quadraticCurveTo(x + nx * 8 + tx * 6, y + ny * 8 + ty * 6, x + tx * 6, y + ty * 6); ctx.closePath(); ink(i % 4 ? col.fin : col.frill, 1.6); }
    }
    // fill the current path with lit skin, then its markings inside it, then the outline (again() re-traces the path)
    function skin(x, y, w, h, again, spine) {
      const g = ctx.createRadialGradient(x + w * 0.36, y + h * 0.28, 2, x + w * 0.5, y + h * 0.5, Math.max(w, h) * 0.78);
      g.addColorStop(0, col.light); g.addColorStop(0.5, col.body); g.addColorStop(1, col.dark);
      ctx.fillStyle = g; ctx.fill();
      ctx.save(); ctx.clip();
      ctx.fillStyle = col.mark; ctx.strokeStyle = col.mark;
      const step = 12 + f.psc * 16, along = spine && !upright;      // markings follow the body: across an upright one, along one that lies flat
      if (f.pat === 1) { ctx.globalAlpha = 0.8; if (along) for (let a = 0.5; a < f.n * 2 + 2; a++) { const p = station(hs + (1 - hs) * a / (f.n * 2 + 2)); ctx.beginPath(); ctx.moveTo(p.x + p.nx * p.w * 1.1 * backSign - 4, p.y + p.ny * p.w * 1.1 * backSign); ctx.quadraticCurveTo(p.x - 9, p.y, p.x - p.nx * p.w * 0.2 * backSign - 3, p.y - p.ny * p.w * 0.2 * backSign); ctx.lineTo(p.x - p.nx * p.w * 0.2 * backSign + 4, p.y - p.ny * p.w * 0.2 * backSign); ctx.quadraticCurveTo(p.x, p.y, p.x + p.nx * p.w * 1.1 * backSign + 4, p.y + p.ny * p.w * 1.1 * backSign); ctx.closePath(); ctx.fill(); } else for (let yy = y + (spine ? Hr * 2.1 : step * 0.5); yy < y + h; yy += step) { ctx.beginPath(); ctx.moveTo(x - 4, yy); ctx.quadraticCurveTo(x + w / 2, yy + 9, x + w + 4, yy); ctx.lineTo(x + w + 4, yy + step * 0.42); ctx.quadraticCurveTo(x + w / 2, yy + 9 + step * 0.42, x - 4, yy + step * 0.42); ctx.closePath(); ctx.fill(); } }
      else if (f.pat === 2) { ctx.globalAlpha = 0.8; for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.arc(x + rr() * w, y + rr() * h * (along ? 0.6 : 1), 3 + f.psc * 7 * (0.5 + rr()), 0, TAU); ctx.fill(); } }
      else if (f.pat === 4) { ctx.globalAlpha = 0.75; ctx.lineWidth = 3.4 + f.psc * 3; for (let i = 0; i < 3; i++) { const p = spine ? station(hs + (1 - hs) * (0.22 + i * 0.24)) : { x: x + w * (0.3 + i * 0.2), y: y + h * 0.5, w: h * 0.4 }; ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(6, p.w * 0.5), 0, TAU); ctx.stroke(); ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(2, p.w * 0.18), 0, TAU); ctx.fill(); } }      // eye-spots
      else if (f.pat === 5) { ctx.globalAlpha = 0.85; const p = spine ? station(hs + (1 - hs) * 0.45) : { x: x + w / 2, y: y + h / 2, w: h * 0.4, nx: 0, ny: -1 }; ctx.beginPath(); if (along) ctx.ellipse(p.x + p.nx * p.w * 0.7 * backSign, p.y + p.ny * p.w * 0.7 * backSign, L * (0.16 + f.psc * 0.12), p.w * 0.85, 0, 0, TAU); else ctx.ellipse(p.x, spine ? p.y : y + h * 0.15, spine ? p.w * 1.6 : w * 0.6, spine ? Lb * (0.14 + f.psc * 0.12) : h * 0.3, 0, 0, TAU); ctx.fill(); }
      if (f.pat === 3 || f.coat === 1) { ctx.globalAlpha = 0.5; ctx.fillStyle = '#fff'; ctx.beginPath(); if (along) { const p = station(hs + (1 - hs) * 0.45); ctx.ellipse(p.x, p.y - p.ny * p.w * 0.7 * backSign, Lb * 0.4, p.w * 0.55, 0, 0, TAU); } else ctx.ellipse(x + w / 2, y + h * (spine ? 0.68 : 0.7), w * 0.3, h * (spine ? 0.24 : 0.25), 0, 0, TAU); ctx.fill(); }      // a pale belly
      if (f.coat === 1) { ctx.globalAlpha = 0.18; ctx.strokeStyle = INK; ctx.lineWidth = 1.5; let row = 0; for (let yy = y + 4; yy < y + h; yy += 9, row++) for (let xx = x + (row % 2) * 7; xx < x + w; xx += 14) { if (spine && Math.hypot(xx - H.x, yy - H.y) < Hr * 1.05) continue; ctx.beginPath(); ctx.arc(xx, yy, 7, 0.2, 2.94); ctx.stroke(); } }
      if (spine) for (let i = 0; i < plates.length; i++) { const q = plates[i]; ctx.globalAlpha = 0.9; ctx.fillStyle = col.limb; for (let a = q.a; a <= q.b && a < f.n; a += q.e) { const p = station(segU(a)); ctx.beginPath(); ctx.ellipse(p.x, p.y, along ? (1 - hs) * L / f.n * 0.42 : p.w * 1.05, along ? p.w * 1.05 : (1 - hs) * L / f.n * 0.42, 0, 0, TAU); ctx.fill(); ctx.globalAlpha = 0.45; ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.stroke(); ctx.globalAlpha = 0.9; } }
      if (spine && f.n > 2) { ctx.globalAlpha = 0.12; ctx.strokeStyle = INK; ctx.lineWidth = 2; for (let a = 1; a < Math.min(f.n, 9); a++) { const p = station(hs + (1 - hs) * a / Math.min(f.n, 9)); ctx.beginPath(); ctx.moveTo(p.x + p.nx * p.w, p.y + p.ny * p.w); ctx.quadraticCurveTo(p.x + p.dx * 6, p.y + p.dy * 6, p.x - p.nx * p.w, p.y - p.ny * p.w); ctx.stroke(); } }
      // light falls from above: a sheen along the top, the wet shine of something that lives in water
      const sh = ctx.createLinearGradient(0, y, 0, y + h * 0.5); sh.addColorStop(0, 'rgba(255,255,255,0.36)'); sh.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.globalAlpha = 1; ctx.fillStyle = sh; ctx.fillRect(x - 4, y - 4, w + 8, h * 0.5 + 4);
      ctx.restore();
      again(); ctx.strokeStyle = INK; ctx.lineWidth = 2.8; ctx.stroke();
    }
    // whatever the arms of a star or orb carry
    function grow(q, x, y, a, sc, j) {
      const Lg = 26 * q.l * sc, ex = x + Math.cos(a) * Lg, ey = y + Math.sin(a) * Lg;
      if (q.k === 8) { const d = F._dsg(q); if (d) F._design(ctx, d, x, y, a, 40 * q.l * sc, q.w, col, 1); return; }
      if (q.k === 5 || q.on >= 0) return;
      if (q.k === 2 || q.k === 7) { ctx.beginPath(); ctx.moveTo(x - Math.sin(a) * 7, y + Math.cos(a) * 7); ctx.lineTo(ex + Math.cos(a) * 8, ey + Math.sin(a) * 8); ctx.lineTo(x + Math.sin(a) * 7, y - Math.cos(a) * 7); ctx.closePath(); ink(q.k === 2 ? hsl(f.hue + f.hue2, 55, 84, 1) : '#ffe9b8', 2); return; }
      if (q.k === 1 || q.k === 6) { ctx.beginPath(); ctx.moveTo(x - Math.sin(a) * 9, y + Math.cos(a) * 9); ctx.quadraticCurveTo(x + Math.cos(a) * Lg * 1.2 - Math.sin(a) * 14, y + Math.sin(a) * Lg * 1.2 + Math.cos(a) * 14, ex + Math.cos(a) * 6, ey + Math.sin(a) * 6); ctx.quadraticCurveTo(x + Math.cos(a) * Lg * 1.2 + Math.sin(a) * 14, y + Math.sin(a) * Lg * 1.2 - Math.cos(a) * 14, x + Math.sin(a) * 9, y - Math.cos(a) * 9); ctx.closePath(); ink(q.k === 1 ? col.fin : col.frill, 2); return; }
      const sw = Math.sin(B(2.5) + j) * 7;
      strokeLimb(x, y, x + Math.cos(a) * Lg * 0.5 - Math.sin(a) * sw, y + Math.sin(a) * Lg * 0.5 + Math.cos(a) * sw, ex, ey, 7, col.limb);
      if (q.k === 4) { ctx.beginPath(); ctx.arc(ex, ey, 5.5, 0, TAU); ink(col.glow, 1.8); } else if (q.k === 0) { ctx.beginPath(); ctx.arc(ex, ey, 6.5, 0, TAU); ink(col.limb, 2); }
    }
    // one eye. For the kept picture only the white is painted and its place noted: the pupil is drawn live, on top.
    function eyeAt(ex, ey, r, ring) {
      const lid = o.sleep ? 1 : ((B(0.31) + (f.seed % 13)) % 3.7 < 0.1 ? 1 : 0);
      const lx = o.lx === undefined ? Math.sin(B(0.7)) * 0.5 : o.lx, ly = o.ly === undefined ? 0.15 + Math.cos(B(0.9)) * 0.25 : o.ly;
      if (o.collect) { ctx.beginPath(); ctx.arc(ex, ey, r, 0, TAU); ink(ring ? hsl(f.hue + f.hue2, 90, 62, 1) : '#fff', 2.4); o.collect.push([ex, ey, r]); return; }
      if (lid) { ctx.beginPath(); ctx.arc(ex, ey, r, 0, TAU); ink(col.dark, 2.4); ctx.beginPath(); ctx.moveTo(ex - r * 0.7, ey); ctx.quadraticCurveTo(ex, ey + r * 0.6, ex + r * 0.7, ey); ctx.strokeStyle = INK; ctx.lineWidth = 2.4; ctx.stroke(); return; }
      ctx.beginPath(); ctx.arc(ex, ey, r, 0, TAU); ink(ring ? hsl(f.hue + f.hue2, 90, 62, 1) : '#fff', 2.4);
      F._pupil(ctx, ex, ey, r, lx, ly, hsl(f.hue + f.hue2, 68, 44, 1), INK, f.ep || 0.46);
    }
    // the face. side 0: it looks straight at you. side 1: its head points to the right; you see the eye on this side
    function face(x, y, hr, side, isStar) {
      const ne = f.en, er = clamp(hr * (0.22 + f.es * 0.5), 7, hr * 0.66), gap = Math.max(hr * (f.eg || 0.5), er * 1.08);
      const st = f.ek > 0.25 && !isStar && !side ? hr * (0.5 + f.ek * 0.5) : 0, cx = x + (side ? hr * 0.22 : 0), ey0 = y - hr * (f.ey === undefined ? 0.14 : f.ey);
      const stalk = function (ex, ey) { if (!st) return ey; for (let pass = 0; pass < 2; pass++) { ctx.strokeStyle = pass ? col.body : INK; ctx.lineWidth = pass ? 6 : 10; ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(ex, ey - st); ctx.stroke(); } return ey - st; };
      if (side) { if (ne >= 1) eyeAt(cx, ey0, er * 1.15, false); if (ne >= 3) eyeAt(cx - hr * 0.5, ey0 - hr * 0.35, er * 0.45, false); }
      else if (ne === 1) eyeAt(cx, ey0, er * 1.3, false);
      else if (ne >= 2) { eyeAt(cx - gap, stalk(cx - gap, ey0), er, false); eyeAt(cx + gap, stalk(cx + gap, ey0), er, false); if (ne === 3) eyeAt(cx, y - hr * 0.64, er * 0.42, false);
        if (!st) for (let sd = -1; sd <= 1; sd += 2) { const bx = cx + sd * gap, by = ey0 - er * 1.2; ctx.strokeStyle = INK; ctx.globalAlpha = 0.7; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(bx - sd * er * 0.75, by - er * 0.02); ctx.quadraticCurveTo(bx, by - er * 0.3, bx + sd * er * 0.8, by + er * 0.14); ctx.stroke(); ctx.globalAlpha = 1; } }
      { const bl = f.bl === undefined ? 0.4 : f.bl; ctx.globalAlpha = 0.1 + 0.5 * bl; ctx.fillStyle = '#ff7fa8'; for (let sd = (side ? 1 : -1); sd <= 1; sd += 2) { ctx.beginPath(); ctx.ellipse(cx + sd * hr * (side ? 0.05 : 0.72), y + hr * 0.42, hr * (0.12 + 0.1 * bl), hr * (0.08 + 0.06 * bl), 0, 0, TAU); ctx.fill(); } ctx.globalAlpha = 1; }
      const mx = cx + (side ? hr * 0.5 : 0), my = y + hr * (side ? 0.42 : 0.5), m = hr * (0.16 + f.ms * 0.3);
      ctx.strokeStyle = INK; ctx.lineWidth = 2.6; ctx.fillStyle = INK;
      if (f.mk === 1) { ctx.beginPath(); if (side) { ctx.moveTo(mx - m * 0.2, my - m * 0.8); ctx.lineTo(mx + m * 1.9, my - m * 0.1); ctx.lineTo(mx - m * 0.2, my + m * 0.6); } else { ctx.moveTo(mx - m * 0.8, my - m * 0.3); ctx.lineTo(mx, my + m * 0.9); ctx.lineTo(mx + m * 0.8, my - m * 0.3); ctx.quadraticCurveTo(mx, my - m * 0.7, mx - m * 0.8, my - m * 0.3); } ctx.closePath(); ink('#f6b34a', 2.2); }
      else if (f.mk === 2) { ctx.beginPath(); if (side) { ctx.moveTo(mx - m * 1.6, my - m * 0.1); ctx.quadraticCurveTo(mx - m * 0.2, my + m * 1.1, mx + m * 1.1, my - m * 0.3); } else { ctx.moveTo(mx - m * 1.3, my - m * 0.2); ctx.quadraticCurveTo(mx, my + m * 1.3, mx + m * 1.3, my - m * 0.2); } ctx.closePath(); ctx.fill(); ctx.fillStyle = '#fff'; for (let j = -1; j <= 1; j += 2) { const tx = mx + j * m * (side ? 0.45 : 0.6) - (side ? m * 0.25 : 0); ctx.beginPath(); ctx.moveTo(tx - m * 0.2, my - m * 0.12); ctx.lineTo(tx, my + m * 0.45); ctx.lineTo(tx + m * 0.2, my - m * 0.12); ctx.fill(); } }
      else if (f.mk === 3) { ctx.beginPath(); ctx.arc(mx, my, m * 0.7, 0, TAU); ink('#ff9fc4', 2.2); ctx.beginPath(); ctx.arc(mx, my, m * 0.3, 0, TAU); ctx.fillStyle = INK; ctx.fill(); }
      else if (!side && f.mk === 0 && f.sm > 0.72) { const w = m * (0.9 + 0.5 * (f.sm - 0.72)); ctx.beginPath(); ctx.moveTo(mx - w, my - m * 0.25); ctx.quadraticCurveTo(mx, my + m * 1.7, mx + w, my - m * 0.25); ctx.quadraticCurveTo(mx, my + m * 0.15, mx - w, my - m * 0.25); ctx.closePath(); ctx.fillStyle = hsl(350, 55, 22, 1); ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 2.4; ctx.stroke(); ctx.save(); ctx.clip(); ctx.fillStyle = '#ff8fa6'; ctx.beginPath(); ctx.ellipse(mx, my + m * 1.15, w * 0.5, m * 0.5, 0, 0, TAU); ctx.fill(); ctx.restore(); }
      else { ctx.beginPath(); ctx.moveTo(mx - m, my - m * 0.2); ctx.quadraticCurveTo(mx, my + m * (0.2 + 0.9 * (f.sm === undefined ? 0.5 : f.sm)), mx + m, my - m * 0.2); ctx.stroke(); if (f.mk === 4) { ctx.lineWidth = 1.6; for (let sd = (side ? 1 : -1); sd <= 1; sd += 2) for (let j = -1; j <= 1; j++) { ctx.beginPath(); ctx.moveTo(mx + sd * m * 1.2, my); ctx.lineTo(mx + sd * (m * 1.2 + hr * 0.6), my + j * hr * 0.16); ctx.stroke(); } } }
    }
  };

  /** the living part of an eye: iris, pupil, two lights, and the soft shade of the upper lid */
  F._pupil = function (ctx, ex, ey, r, lx, ly, iris, ink, pup) {
    const px = ex + lx * r * 0.2, py = ey + ly * r * 0.2 + r * 0.04;
    ctx.beginPath(); ctx.arc(px, py, r * 0.82, 0, TAU); ctx.fillStyle = iris; ctx.fill();
    { const gl = ctx.createRadialGradient(px, py + r * 0.45, 0, px, py + r * 0.45, r * 0.6); gl.addColorStop(0, 'rgba(255,255,255,0.4)'); gl.addColorStop(1, 'rgba(255,255,255,0)'); ctx.save(); ctx.beginPath(); ctx.arc(px, py, r * 0.82, 0, TAU); ctx.clip(); ctx.fillStyle = gl; ctx.fillRect(px - r, py - r, r * 2, r * 2); ctx.restore(); }
    ctx.beginPath(); ctx.arc(px, py, r * pup, 0, TAU); ctx.fillStyle = ink; ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(px - r * 0.26, py - r * 0.3, r * 0.24, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.arc(px + r * 0.24, py + r * 0.26, r * 0.1, 0, TAU); ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.arc(ex, ey, r * 0.98, 0, TAU); ctx.clip(); ctx.fillStyle = 'rgba(7,18,31,0.16)'; ctx.beginPath(); ctx.ellipse(ex, ey - r * 0.95, r * 1.25, r * 0.62, 0, 0, TAU); ctx.fill(); ctx.restore();
  };
  // ── the character, kept as a short loop of moving frames: so a whole pond of them moves, every part, and stays cheap ──
  const PW = 170, PT = 190, PB = 160, PPX = 0.46, K = 8;        // the box a character is drawn in, pixels per unit, and frames in its loop
  const kept = {}; let keptN = 0, madeAt = -1, made = 0;
  function frame(f, i) {
    const cv = document.createElement('canvas'); cv.width = Math.ceil(PW * 2 * PPX); cv.height = Math.ceil((PT + PB) * PPX);
    const ctx = cv.getContext('2d'), eyes = [];
    ctx.scale(PPX, PPX); ctx.translate(PW, PT);
    F.portrait(ctx, f, i / K * TAU, { collect: eyes, loop: true });
    return { cv: cv, eyes: eyes };
  }
  F.pSprite = function (f) {
    const key = F.key(f);
    let s = kept[key];
    if (s) { s.used = G.rt || 0; return s; }
    if (keptN > 150) { const now = G.rt || 0; for (const k in kept) if (now - kept[k].used > 3) { delete kept[k]; keptN--; } if (keptN > 230) { for (const k in kept) delete kept[k]; keptN = 0; } }
    s = kept[key] = { fr: [frame(f, 0)], ink: '', dark: '', build: F.build(f), used: G.rt || 0 }; keptN++;
    s.pup = f.ep || 0.46; s.ink = F._ink(); s.dark = F._colours(f).dark; s.iris = 'hsl(' + Math.round((((f.hue + f.hue2) % 360) + 360) % 360) + ',68%,44%)';
    return s;
  };
  /** the kept character at the origin at this point of its loop (phase 0..1), then its eyes, alive. mood: { lx, ly, lid 0..1, wide } */
  F.pDraw = function (ctx, f, mood, phase) {
    const s = F.pSprite(f);
    const pos = (((phase || 0) % 1) + 1) % 1 * K; let i = Math.floor(pos) % K; const mix = pos - Math.floor(pos);
    if (!s.fr[i]) {
      // a few new frames a tick at most, so a pond full of newborns never stalls; until its frame exists, the nearest one is shown
      if (madeAt !== G.rt) { madeAt = G.rt; made = 0; }
      if (made < 3) { made++; s.fr[i] = frame(f, i); } else { let j = i; while (j > 0 && !s.fr[j]) j--; i = j; }
    }
    const fr = s.fr[i], nx = s.fr[(i + 1) % K];
    ctx.drawImage(fr.cv, -PW, -PT, PW * 2, PT + PB);
    if (nx && mix > 0.08) { const ga = ctx.globalAlpha; ctx.globalAlpha = ga * mix; ctx.drawImage(nx.cv, -PW, -PT, PW * 2, PT + PB); ctx.globalAlpha = ga; }
    const lx = mood.lx || 0, ly = mood.ly || 0, pup = mood.wide ? 0.42 : 0.62;
    for (let q = 0; q < fr.eyes.length; q++) {
      const e = fr.eyes[q], r = e[2];
      if (mood.lid >= 1) { ctx.beginPath(); ctx.arc(e[0], e[1], r, 0, TAU); ctx.fillStyle = s.dark; ctx.fill(); ctx.strokeStyle = s.ink; ctx.lineWidth = 2.4; ctx.stroke(); ctx.beginPath(); ctx.moveTo(e[0] - r * 0.7, e[1]); ctx.quadraticCurveTo(e[0], e[1] + r * 0.6, e[0] + r * 0.7, e[1]); ctx.stroke(); continue; }
      F._pupil(ctx, e[0], e[1], r, lx, ly, s.iris, s.ink, mood.wide ? s.pup * 0.65 : s.pup);
      if (mood.lid > 0) { ctx.save(); ctx.beginPath(); ctx.arc(e[0], e[1], r * 1.02, 0, TAU); ctx.clip(); ctx.fillStyle = s.dark; ctx.fillRect(e[0] - r * 1.1, e[1] - r * 1.1, r * 2.2, r * 2.2 * mood.lid * 0.75); ctx.restore(); }      // heavy lids: tired, or sick
    }
    return s;
  };
  const old = F.clearCache; F.clearCache = function () { if (old) old(); for (const k in kept) delete kept[k]; keptN = 0; };
})();
