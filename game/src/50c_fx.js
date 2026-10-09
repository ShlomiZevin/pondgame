// ── What is happening between them, made plain ──
// A bite, a kill, a meal, a death: each is drawn so that it can be READ at a glance, with who did it to whom.
//   an attack    a red arrow leaps from the attacker to the one it struck, a burst where it lands, and the word "bites"
//   eaten        the victim is pulled, shrinking, into the eater's mouth; the eater is ringed in gold and says "gulp!"
//   killed       a burst and a cross where it fell, "killed" over it, and a ring round the one that did it
//   other deaths a grey puff and the cause in a word: starved, winter, old age, sickness
//   a meal       the food flies into the mouth in its own colour, with a small ring where it is swallowed
//   bad food     a green swirl and "yuck!"
// Nothing here changes the pond: it only listens and draws. At great speed there is too much to read, so it is shown up to x16 (words up to x4).
(function () {
  'use strict';
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const TAU = 6.2832, FX = [], MAX = 90;
  const RED = '#ff5d7a', GOLD = '#f6d365', INK = '#14202e';
  const px = function (c) { return c.rx === undefined ? c.x : c.rx; }, py = function (c) { return c.ry === undefined ? c.y : c.ry; };
  const on = function () { return G.mode === 'play' && G.speed > 0 && G.speed <= 16; };
  const words = function () { return G.speed <= 4 && G.view.scale >= 0.55; };      // and only when the creatures are large enough on the screen for a word to belong to one
  const add = function (e) { e.t0 = G.rt || 0; if (FX.length >= MAX) FX.shift(); FX.push(e); return e; };
  const CAUSE = { starved: 'starved', selected: 'winter took it', plague: 'sickness', fought: 'killed', eaten: 'eaten', zone: 'poisoned', old: 'old age' };

  G.on('fight', function (a, b) { if (!on()) return; add({ k: 'hit', a: a, b: b, T: 1.0, txt: words() ? 'bites' : '' }); });
  G.on('death', function (c, cause, by) {
    if (!on()) return;
    const x = px(c), y = py(c), r = c.ph.r, hue = c.g.f ? c.g.f.hue : c.g.t[2];
    if (cause === 'eaten' && by && !by.dead) add({ k: 'gulp', a: by, x: x, y: y, r: r, hue: hue, T: 1.1, txt: words() ? 'gulp!' : '' });
    else if (cause === 'fought') add({ k: 'fall', a: by && !by.dead ? by : null, x: x, y: y, r: r, T: 1.1, txt: words() ? 'killed' : '' });
    else if (cause !== 'selected' || G.speed <= 4) add({ k: 'puff', x: x, y: y, r: r, T: 1.2, txt: words() ? (CAUSE[cause] || (c.age >= G.K.maxAge ? 'old age' : String(cause || ''))) : '' });
  });
  G.on('eat', function (c, o) { if (!on() || G.speed > 4) return; add({ k: 'nom', a: c, x: o.x, y: o.y, hue: G.TAGHUE ? G.TAGHUE[o.tag] : 120, T: 0.32, big: !!o.big }); });
  G.on('ill', function (c) { if (!on()) return; add({ k: 'ill', a: c, T: 1.2, txt: words() ? 'yuck!' : '' }); });
  // things that act (54c_acts.js): a swing where a blow lands, a ring where a blast or a healing goes out; what is shot is drawn as it flies (below)
  G.on('act', function (z, q, o, R) { if (!on()) return; if (q.do === 'strike' && o) add({ k: 'swing', z: z, o: o, T: 0.45, hue: q.hue, txt: words() ? (q.with || 'strikes') : '' }); else if (q.do === 'blast') add({ k: 'ringout', x: z.x, y: z.y, R: R, T: 0.7, col: 'hsla(' + q.hue + ',95%,65%,' }); else if (q.do === 'heal') add({ k: 'ringout', x: z.x, y: z.y, R: R, T: 0.9, col: 'hsla(130,85%,70%,' }); });
  G.on('act-hit', function (z, o) { if (!on() || !o) return; add({ k: 'spark', x: o.x, y: o.ph ? o.y - o.ph.r : o.y, r: o.ph ? o.ph.r : 14, T: 0.35 }); });
  const SHOT = { arrow: function (ctx, L) { ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(-L, 0); ctx.lineTo(L * 0.4, 0); ctx.stroke(); ctx.beginPath(); ctx.moveTo(L * 0.9, 0); ctx.lineTo(L * 0.2, -L * 0.3); ctx.lineTo(L * 0.2, L * 0.3); ctx.closePath(); ctx.fill(); },
    bullet: function (ctx, L) { ctx.beginPath(); ctx.ellipse(0, 0, L * 0.55, L * 0.26, 0, 0, TAU); ctx.fill(); }, rock: function (ctx, L) { ctx.beginPath(); ctx.arc(0, 0, L * 0.5, 0, TAU); ctx.fill(); ctx.stroke(); },
    beam: function (ctx, L) { ctx.lineWidth = L * 0.35; ctx.beginPath(); ctx.moveTo(-L * 2.2, 0); ctx.lineTo(L, 0); ctx.stroke(); }, web: function (ctx, L) { ctx.lineWidth = 1.4; for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(k * 1.57 + 0.6) * L, Math.sin(k * 1.57 + 0.6) * L); ctx.stroke(); } ctx.beginPath(); ctx.arc(0, 0, L * 0.6, 0, TAU); ctx.stroke(); },
    bubble: function (ctx, L) { ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(0, 0, L * 0.6, 0, TAU); ctx.stroke(); } };
  function shots(ctx) {
    const S = G.W.shots; if (!S || !S.length || G.speed > 16) return;
    for (let i = 0; i < S.length; i++) { const s = S[i], q = s.q, L = 9, glow = q.shot === 'fire' || q.shot === 'spark' || q.shot === 'ice' || q.shot === 'bolt';
      ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.a);
      if (glow) { const g = ctx.createLinearGradient(-L * 3, 0, L, 0), h = q.shot === 'ice' ? 195 : q.shot === 'fire' ? 22 : q.hue; g.addColorStop(0, 'hsla(' + h + ',100%,60%,0)'); g.addColorStop(1, 'hsla(' + h + ',100%,70%,0.95)'); ctx.strokeStyle = g; ctx.lineCap = 'round'; ctx.lineWidth = L * 0.7; ctx.beginPath(); ctx.moveTo(-L * 3, 0); ctx.lineTo(L * 0.6, 0); ctx.stroke(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(L * 0.6, 0, L * 0.3, 0, TAU); ctx.fill(); }
      else { ctx.fillStyle = 'hsl(' + q.hue + ',70%,78%)'; ctx.strokeStyle = q.shot === 'web' || q.shot === 'bubble' || q.shot === 'beam' ? 'hsla(' + q.hue + ',85%,82%,0.95)' : INK; ctx.lineWidth = 1.4; ctx.lineCap = 'round'; (SHOT[q.shot] || SHOT.bullet)(ctx, L); }
      ctx.restore(); }
  }
  // the player's word: a heart or a cross rises from whoever heard it (smaller from those who only overheard)
  // society (54g_society.js): a dancer gives off notes, a gift is seen passing, and a leader carries a pennant
  G.on('dance', function (c) { if (G.mode !== 'play' || G.speed > 16) return; add({ k: 'god', a: c, T: 2.4, good: true, soft: true, ch: '\u266B' }); });
  G.on('share', function (a, b) { if (!on()) return; add({ k: 'gift', a: a, b: b, T: 0.7 }); });
  G.on('glad', function (c) { if (G.mode !== 'play' || G.speed > 16) return; add({ k: 'god', a: c, T: 2.2, good: true, soft: true, ch: '\u266A' }); });      // a note rises from a creature that is glad
  G.on('judged-by-god', function (c, good, soft) { if (G.mode !== 'play') return; add({ k: 'god', a: c, T: soft ? 1.1 : 1.6, good: good, soft: soft }); });
  G.on('new-pond', function () { FX.length = 0; });

  function label(ctx, x, y, txt, col, a, inv) {
    if (!txt) return;
    ctx.save(); ctx.translate(x, y); ctx.scale(inv, inv); ctx.globalAlpha = a;
    ctx.font = '800 11.5px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const w = ctx.measureText(txt).width + 14;
    ctx.fillStyle = 'rgba(9,20,33,0.88)'; G.roundRect(ctx, -w / 2, -10, w, 20, 10); ctx.fill(); ctx.strokeStyle = col; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.fillText(txt, 0, 0.5); ctx.restore();
  }
  function burst(ctx, x, y, r, col, a) {
    ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = col; ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1, r * 0.09); ctx.beginPath();
    for (let i = 0; i < 16; i++) { const an = i * TAU / 16, rr = i % 2 ? r * 0.45 : r; ctx.lineTo(x + Math.cos(an) * rr, y + Math.sin(an) * rr); }
    ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
  }
  function ringOn(ctx, c, col, a, t) {
    if (!c || c.dead) return;
    const x = px(c), y = py(c) - c.ph.r * 0.9, r = c.ph.r * 1.9;
    ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = col; ctx.lineWidth = Math.max(1.5, c.ph.r * 0.14); ctx.setLineDash([r * 0.5, r * 0.3]); ctx.lineDashOffset = -t * 40;
    ctx.beginPath(); ctx.ellipse(x, y, r, r * 1.15, 0, 0, TAU); ctx.stroke(); ctx.restore();
  }

  G.drawFx = function (ctx) {
    if (!G.W) return;
    const v = G.view, s = v.scale * v.dpr, now = G.rt || 0, inv = 1 / Math.max(0.7, v.scale);
    ctx.save(); ctx.setTransform(s, 0, 0, s, v.ox * v.dpr, v.oy * v.dpr); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    try { shots(ctx); } catch (er) { console.error(er); }
    if (G.speed <= 16 && v.scale > 0.3) for (let i = 0; i < G.W.cre.length; i++) { const c = G.W.cre[i]; if (c.dead || (c.fol || 0) < 3) continue; const x = px(c) + c.ph.r * 0.2, y = py(c) - c.ph.r * 2.9, h = c.ph.r * 0.9 + 8 + Math.min(12, c.fol), fl = Math.sin(now * 5 + c.id) * h * 0.08;      // a leader's pennant, longer the more that follow
      ctx.strokeStyle = INK; ctx.lineWidth = 1.5 * inv + 0.4; ctx.beginPath(); ctx.moveTo(x, y + h * 0.3); ctx.lineTo(x, y - h); ctx.stroke(); ctx.fillStyle = GOLD; ctx.lineWidth = 1 * inv + 0.2; ctx.beginPath(); ctx.moveTo(x, y - h); ctx.lineTo(x + h * 0.75 + fl, y - h * 0.78); ctx.lineTo(x, y - h * 0.56); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    for (let i = FX.length - 1; i >= 0; i--) {
      const e = FX[i], u = (now - e.t0) / e.T;
      if (u >= 1 || u < 0) { FX.splice(i, 1); continue; }
      const fade = u < 0.7 ? 1 : (1 - u) / 0.3;
      if (e.k === 'gift') {
        const a = e.a, b = e.b; if (!a || !b || b.dead) continue; const ax = px(a), ay = py(a) - a.ph.r, bx = px(b), by = py(b) - b.ph.r, x = ax + (bx - ax) * u, y = ay + (by - ay) * u - Math.sin(u * 3.1416) * 18;
        ctx.fillStyle = '#5fe6b8'; ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(x, y, 3.6 * (1 - 0.3 * u) + 1, 0, TAU); ctx.fill(); ctx.stroke();
      } else if (e.k === 'god') {
        const a = e.a; if (!a || a.dead) continue; const x = px(a), y = py(a) - a.ph.r * 2.6 - u * 34 * inv, sz = (e.soft ? 13 : 22) * inv;
        ctx.save(); ctx.globalAlpha = fade * (e.soft ? 0.75 : 1); ctx.font = '800 ' + sz + 'px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineWidth = 3 * inv; ctx.strokeStyle = INK; ctx.fillStyle = e.good ? '#5fe6b8' : '#ff8fbd';
        { const ch = e.ch || (e.good ? '\u2665' : '\u2715'), sway = e.ch ? Math.sin(u * 9 + a.id) * 6 * inv : 0; if (e.ch) { ctx.fillStyle = '#f6d365'; ctx.font = '800 ' + (18 * inv) + 'px system-ui, sans-serif'; } ctx.strokeText(ch, x + sway, y); ctx.fillText(ch, x + sway, y); } ctx.restore();
        if (!e.soft) { ctx.strokeStyle = e.good ? 'rgba(95,230,184,' + (0.7 * (1 - u)) + ')' : 'rgba(255,143,189,' + (0.7 * (1 - u)) + ')'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(px(a), py(a) - a.ph.r, a.ph.r * (1.4 + 4 * u), 0, TAU); ctx.stroke(); }
      } else if (e.k === 'swing') {
        const z = e.z, o = e.o; if (!z || !o) continue; const a0 = Math.atan2((o.ph ? o.y - o.ph.r : o.y) - z.y, o.x - z.x), rr = Math.hypot(o.x - z.x, o.y - z.y) * 0.85 + 14;
        ctx.globalAlpha = fade; ctx.strokeStyle = INK; ctx.lineWidth = 9; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(z.x, z.y, rr, a0 - 0.9 + u * 1.2, a0 - 0.2 + u * 1.2); ctx.stroke();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 5; ctx.stroke(); ctx.globalAlpha = 1;
        label(ctx, z.x, z.y - (z.r || 40) * 0.9 - 26 * inv, e.txt, RED, fade, inv);
      } else if (e.k === 'ringout') {
        ctx.strokeStyle = e.col + (0.8 * (1 - u)) + ')'; ctx.lineWidth = 6 * (1 - u) + 2; ctx.beginPath(); ctx.arc(e.x, e.y, e.R * (0.15 + 0.85 * u), 0, TAU); ctx.stroke(); ctx.fillStyle = e.col + (0.12 * (1 - u)) + ')'; ctx.fill();
      } else if (e.k === 'spark') {
        burst(ctx, e.x, e.y, e.r * (0.5 + 0.8 * u), '#fff3c4', fade * (1 - u * 0.6));
      } else if (e.k === 'hit') {
        const a = e.a, b = e.b; if (!a || !b) continue;
        const ax = px(a), ay = py(a) - a.ph.r * 0.9, bx = px(b), by = py(b) - b.ph.r * 0.9, dx = bx - ax, dy = by - ay, d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d;
        const reach = Math.min(1, u / 0.22), sx = ax + ux * a.ph.r * 0.8, sy = ay + uy * a.ph.r * 0.8, ex = sx + (bx - ux * b.ph.r * 0.7 - sx) * reach, ey = sy + (by - uy * b.ph.r * 0.7 - sy) * reach, wd = Math.max(2.5, a.ph.r * 0.28);
        // the arrow: from the one that strikes to the one that is struck
        ctx.globalAlpha = fade; ctx.strokeStyle = INK; ctx.lineWidth = wd + 2.5; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke();
        ctx.strokeStyle = RED; ctx.lineWidth = wd; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke();
        const hs = wd * 2.6; ctx.fillStyle = RED; ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(ex + ux * hs, ey + uy * hs); ctx.lineTo(ex - uy * hs * 0.8, ey + ux * hs * 0.8); ctx.lineTo(ex + uy * hs * 0.8, ey - ux * hs * 0.8); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.globalAlpha = 1;
        if (u > 0.18) { const k = Math.min(1, (u - 0.18) / 0.2); burst(ctx, bx, by, b.ph.r * (0.6 + 0.7 * k), '#ffd3dc', fade * (1 - k * 0.5)); ringOn(ctx, b, RED, fade * 0.9, now); }
        label(ctx, (ax + bx) / 2, Math.min(ay, by) - Math.max(a.ph.r, b.ph.r) * 1.6 - 6 * inv, e.txt, RED, fade, inv);
      } else if (e.k === 'gulp') {
        const a = e.a; if (!a) continue;
        const mx = px(a), my = py(a) - a.ph.r * 0.9, k = Math.min(1, u / 0.55), ee = k * k, x = e.x + (mx - e.x) * ee, y = e.y - e.r * 0.9 + (my - (e.y - e.r * 0.9)) * ee, r = e.r * (1 - 0.85 * ee);
        if (k < 1) { ctx.globalAlpha = 0.9; ctx.fillStyle = G.hsl(e.hue, 75, 62, 1); ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1.2, r * 0.14); ctx.beginPath(); ctx.arc(x, y, Math.max(1, r), 0, TAU); ctx.fill(); ctx.stroke();
          ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 1.2; for (let j = 0; j < 3; j++) { const an = Math.atan2(my - e.y, mx - e.x) + 3.1416 + (j - 1) * 0.5; ctx.beginPath(); ctx.moveTo(x + Math.cos(an) * r * 1.3, y + Math.sin(an) * r * 1.3); ctx.lineTo(x + Math.cos(an) * r * 2.3, y + Math.sin(an) * r * 2.3); ctx.stroke(); }
          ctx.globalAlpha = 1; }
        ringOn(ctx, a, GOLD, fade, now);
        if (u > 0.45) label(ctx, mx, my - a.ph.r * 1.9 - 8 * inv, e.txt, GOLD, fade, inv);
      } else if (e.k === 'fall') {
        const k = Math.min(1, u / 0.25), y = e.y - e.r * 0.9;
        burst(ctx, e.x, y, e.r * (0.7 + 0.9 * k), '#ffd3dc', fade * (1 - 0.6 * k));
        const cs = e.r * 0.75; ctx.globalAlpha = fade; ctx.strokeStyle = INK; ctx.lineWidth = Math.max(4, e.r * 0.34); ctx.beginPath(); ctx.moveTo(e.x - cs, y - cs); ctx.lineTo(e.x + cs, y + cs); ctx.moveTo(e.x + cs, y - cs); ctx.lineTo(e.x - cs, y + cs); ctx.stroke();
        ctx.strokeStyle = RED; ctx.lineWidth = Math.max(2.2, e.r * 0.2); ctx.stroke(); ctx.globalAlpha = 1;
        ringOn(ctx, e.a, RED, fade, now);
        label(ctx, e.x, y - e.r * 1.5 - 10 * inv - u * 8, e.txt, RED, fade, inv);
      } else if (e.k === 'puff') {
        const y = e.y - e.r * 0.9 - u * e.r * 1.2;
        ctx.globalAlpha = fade * 0.55; ctx.fillStyle = '#cfe8ff';
        for (let j = 0; j < 5; j++) { const an = j * 1.2566 + 0.4, rr = e.r * (0.5 + u * 1.1); ctx.beginPath(); ctx.arc(e.x + Math.cos(an) * rr, y + Math.sin(an) * rr * 0.7, e.r * 0.34 * (1 - u * 0.5), 0, TAU); ctx.fill(); }
        ctx.globalAlpha = 1;
        label(ctx, e.x, y - e.r * 0.9 - 8 * inv, e.txt, '#8fb2d6', fade * 0.95, inv);
      } else if (e.k === 'nom') {
        const a = e.a; if (!a || a.dead) continue;
        const mx = px(a), my = py(a) - a.ph.r * 0.75, k = u * u, x = e.x + (mx - e.x) * k, y = e.y + (my - e.y) * k, col = G.hsl(e.hue, 90, 66, 1);
        ctx.fillStyle = col; ctx.strokeStyle = INK; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, y, (e.big ? 5 : 3.2) * (1 - 0.5 * u), 0, TAU); ctx.fill(); ctx.stroke();
        if (u > 0.6) { const q = (u - 0.6) / 0.4; ctx.globalAlpha = 1 - q; ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(mx, my, a.ph.r * (0.5 + 0.8 * q), 0, TAU); ctx.stroke(); ctx.globalAlpha = 1; }
      } else if (e.k === 'ill') {
        const a = e.a; if (!a || a.dead) continue;
        const x = px(a), y = py(a) - a.ph.r * 2.1;
        ctx.globalAlpha = fade; ctx.strokeStyle = '#8fe06a'; ctx.lineWidth = Math.max(2, a.ph.r * 0.16); ctx.beginPath();
        for (let j = 0; j <= 24; j++) { const an = j * 0.5 + now * 5, rr = a.ph.r * 0.08 * j * 0.5; ctx.lineTo(x + Math.cos(an) * rr, y + Math.sin(an) * rr * 0.8); }
        ctx.stroke(); ctx.globalAlpha = 1;
        label(ctx, x, y - a.ph.r * 1.1 - 8 * inv, e.txt, '#8fe06a', fade, inv);
      }
    }
    ctx.restore();
  };
})();
