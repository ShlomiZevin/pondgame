// ── Beyond the pond: open space, and other ponds in it ──
// The pond is one pool of water in a dark that has no end. Zoom out as far as you like and drag wherever you like: stars, drifting clouds of colour,
// and, here and there, other ponds. For now those are PLACEHOLDERS (a name and a glow, made up from where they lie): one day each will be somebody
// else's living pond, and this is the road by which a player will go and visit it. A click on one flies you to it and says so; a button, always
// there when you have wandered, flies you home.
// Nothing here changes the pond or the camera code itself: this file draws what is outside the pond's edge, and widens how far the camera may
// zoom out and wander while a pond is being played (the title screen keeps the old limits).
(function () {
  'use strict';
  if (typeof document === 'undefined') { G.drawBeyond = function () {}; return; }
  const TAU = 6.2832, clamp = G.clamp, ZMIN = 0.02;
  let pulse = 0;          // 1 just after the pond grew, fading: its rim shines for a moment
  G.on('pond-grew', function () { pulse = 1; });

  // ── the camera may go out there ──
  const apply0 = G.applyCam, zoom0 = G.zoomAt;
  const free = function () { return G.mode === 'play' && G.W && !G.W.title; };
  G.applyCam = function () {
    if (!free()) return apply0();
    const v = G.view, c = G.cam, far = Math.max(v.ww, v.wh) * 400;
    c.z = clamp(c.z, ZMIN, 6);
    v.scale = v.base * c.z;
    c.x = clamp(c.x, -far, far); c.y = clamp(c.y, -far, far);
    const hw = v.w / 2 / v.scale, hh = v.h / 2 / v.scale;
    c.away = Math.abs(c.x - v.ww / 2) > Math.max(hw, v.ww / 2) * 0.6 + 1 || Math.abs(c.y - v.wh / 2) > Math.max(hh, v.wh / 2) * 0.6 + 1;
    v.ox = v.w / 2 - c.x * v.scale; v.oy = v.h / 2 - c.y * v.scale;
  };
  G.zoomAt = function (factor, sx, sy) {
    if (!free()) return zoom0(factor, sx, sy);
    const v = G.view, c = G.cam;
    if (sx === undefined) { sx = v.w / 2; sy = v.h / 2; }
    const wx = (sx - v.ox) / v.scale, wy = (sy - v.oy) / v.scale;
    c.z = clamp(c.z * factor, ZMIN, 6);
    const s = v.base * c.z;
    c.x = wx - (sx - v.w / 2) / s; c.y = wy - (sy - v.h / 2) / s;
    G.applyCam();
  };
  /** fly the camera to a place, smoothly (zoom changes evenly to the eye) */
  let fly = null;
  G.flyTo = function (x, y, z, secs) { const c = G.cam; fly = { x0: c.x, y0: c.y, z0: c.z, x1: x, y1: y, z1: z, t: 0, T: secs || 0.9 }; };
  function flyStep(dt) {
    if (!fly) return;
    fly.t += dt; const u = Math.min(1, fly.t / fly.T), e = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2, c = G.cam;
    c.z = Math.exp(Math.log(fly.z0) + (Math.log(fly.z1) - Math.log(fly.z0)) * e);
    c.x = fly.x0 + (fly.x1 - fly.x0) * e; c.y = fly.y0 + (fly.y1 - fly.y0) * e;
    G.applyCam();
    if (u >= 1) fly = null;
  }
  G.goHome = function () { const v = G.view; G.flyTo(v.ww / 2, v.wh / 2, 1, 1.0); hideCard(); };

  // ── what lies out there: made from where it lies, so it is the same every time you come back, and never runs out ──
  const hash = function (i, j, k) { let h = (i * 374761393 + j * 668265263 + k * 2147483647) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; h ^= h >>> 16; return (h >>> 0) / 4294967296; };
  const A1 = ['Lu', 'Mar', 'Vey', 'Tor', 'Ash', 'Nim', 'Oro', 'Sel', 'Kai', 'Bre', 'Dun', 'Ila', 'Quo', 'Zet', 'Wyn', 'Thal', 'Eri', 'Mo', 'Pell', 'Yar'], A2 = ['a', 'e', 'i', 'o', 'u', 'an', 'el', 'or', 'is', ''], A3 = ['mere', 'pool', 'deep', 'water', 'hollow', 'tarn', 'well', 'glass', 'shallows', 'reach'];
  const nameOf = function (i, j) { return A1[(hash(i, j, 11) * A1.length) | 0] + A2[(hash(i, j, 12) * A2.length) | 0] + ' ' + A3[(hash(i, j, 13) * A3.length) | 0].replace(/^./, function (m) { return m.toUpperCase(); }); };
  /** the far pond of one cell of space, or null (the cell is empty, or it is ours) */
  function farPond(i, j, cs, cx, cy) {
    if (!i && !j) return null;
    if (hash(i, j, 1) > 0.5) return null;
    return { i: i, j: j, x: cx + (i + (hash(i, j, 2) - 0.5) * 0.56) * cs, y: cy + (j + (hash(i, j, 3) - 0.5) * 0.56) * cs, r: cs * (0.085 + 0.07 * hash(i, j, 4)), hue: 150 + hash(i, j, 5) * 130, name: nameOf(i, j) };
  }
  const cellSize = function () { const v = G.view; return Math.max(v.ww, v.wh) * 5; };
  function visiblePonds() {
    const v = G.view, cs = cellSize(), cx = v.ww / 2, cy = v.wh / 2, x0 = -v.ox / v.scale, y0 = -v.oy / v.scale, x1 = x0 + v.w / v.scale, y1 = y0 + v.h / v.scale, out = [];
    const i0 = Math.floor((x0 - cx) / cs - 0.5), i1 = Math.ceil((x1 - cx) / cs + 0.5), j0 = Math.floor((y0 - cy) / cs - 0.5), j1 = Math.ceil((y1 - cy) / cs + 0.5);
    if ((i1 - i0) * (j1 - j0) > 900) return out;
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) { const p = farPond(i, j, cs, cx, cy); if (p) out.push(p); }
    return out;
  }
  const edge = function (ctx, ww, wh, R) { ctx.moveTo(R, 0); ctx.lineTo(ww - R, 0); ctx.quadraticCurveTo(ww, 0, ww, R); ctx.lineTo(ww, wh - R); ctx.quadraticCurveTo(ww, wh, ww - R, wh); ctx.lineTo(R, wh); ctx.quadraticCurveTo(0, wh, 0, wh - R); ctx.lineTo(0, R); ctx.quadraticCurveTo(0, 0, R, 0); ctx.closePath(); };

  // stars: three layers on the screen itself, each sliding a little as you travel (the far ones least)
  const STARS = []; for (let i = 0; i < 190; i++) STARS.push([hash(i, 1, 21), hash(i, 2, 22), i % 3, 0.5 + hash(i, 3, 23) * 1.4, hash(i, 4, 24) * TAU, hash(i, 5, 25)]);

  let lastT = 0;
  G.drawBeyond = function (ctx) {
    const W = G.W; if (!W || W.title) return;
    const v = G.view, s = v.scale * v.dpr, t = G.rt || 0, ww = W.ww, wh = W.wh, m = Math.min(ww, wh), R = m * 0.15, B = m * 0.05;      /* a pool with round corners, not a box */
    flyStep(Math.min(0.1, Math.max(0, t - lastT))); lastT = t;
    const x0 = -v.ox / v.scale, y0 = -v.oy / v.scale, x1 = x0 + v.w / v.scale, y1 = y0 + v.h / v.scale;
    hud(x0, y0, x1, y1);
    if (x0 > B && y0 > B && x1 < ww - B && y1 < wh - B) { pulse = Math.max(0, pulse - 0.01); return; }      // looking at the middle of the pond: nothing of the outside is in view
    ctx.save(); ctx.setTransform(s, 0, 0, s, v.ox * v.dpr, v.oy * v.dpr);
    // the water thins into shadow just inside the pond's edge, so the edge is soft
    for (let k = 0; k < 4; k++) { ctx.strokeStyle = 'rgba(4,12,22,' + (0.1 + 0.07 * k) + ')'; ctx.lineWidth = B * 2 * (1 - k * 0.24); ctx.beginPath(); edge(ctx, ww, wh, R); ctx.stroke(); }
    // everything outside the pond's edge is space
    ctx.beginPath(); ctx.rect(x0 - 20, y0 - 20, x1 - x0 + 40, y1 - y0 + 40); edge(ctx, ww, wh, R); ctx.clip('evenodd');
    ctx.setTransform(v.dpr, 0, 0, v.dpr, 0, 0);
    const bg = ctx.createLinearGradient(0, 0, 0, v.h); bg.addColorStop(0, '#060b1a'); bg.addColorStop(0.55, '#070d1f'); bg.addColorStop(1, '#04070f');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, v.w, v.h);
    // drifting clouds of colour, far off (they lie in space, so they pass by as you travel)
    { const cs = cellSize() * 2.3, cx = ww / 2, cy = wh / 2, i0 = Math.floor((x0 - cx) / cs - 0.7), i1 = Math.ceil((x1 - cx) / cs + 0.7), j0 = Math.floor((y0 - cy) / cs - 0.7), j1 = Math.ceil((y1 - cy) / cs + 0.7);
      if ((i1 - i0) * (j1 - j0) < 400) { ctx.globalCompositeOperation = 'lighter';
        for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) { const nx = (cx + (i + hash(i, j, 31) - 0.5) * cs) * v.scale + v.ox, ny = (cy + (j + hash(i, j, 32) - 0.5) * cs) * v.scale + v.oy, nr = cs * (0.45 + 0.45 * hash(i, j, 33)) * v.scale, hue = 190 + hash(i, j, 34) * 150;
          if (nr < 6 || nx + nr < 0 || ny + nr < 0 || nx - nr > v.w || ny - nr > v.h) continue;
          const g = ctx.createRadialGradient(nx, ny, 0, nx, ny, nr); g.addColorStop(0, 'hsla(' + hue + ',70%,45%,0.16)'); g.addColorStop(0.5, 'hsla(' + (hue + 30) + ',70%,35%,0.07)'); g.addColorStop(1, 'hsla(' + hue + ',70%,30%,0)');
          ctx.fillStyle = g; ctx.fillRect(nx - nr, ny - nr, nr * 2, nr * 2); }
        ctx.globalCompositeOperation = 'source-over'; } }
    // stars
    for (let i = 0; i < STARS.length; i++) { const q = STARS[i], p = [0.015, 0.04, 0.09][q[2]], W2 = v.w + 60, H2 = v.h + 60;
      let sx = (q[0] * W2 - G.cam.x * v.base * p) % W2, sy = (q[1] * H2 - G.cam.y * v.base * p) % H2; if (sx < 0) sx += W2; if (sy < 0) sy += H2;
      const tw = 0.55 + 0.45 * Math.sin(t * (0.5 + q[5] * 1.6) + q[4]);
      ctx.fillStyle = 'rgba(' + (q[5] > 0.8 ? '255,225,190' : q[5] < 0.2 ? '170,205,255' : '235,242,255') + ',' + (0.25 + 0.6 * tw) * (0.5 + 0.25 * q[2]) + ')';
      ctx.beginPath(); ctx.arc(sx - 30, sy - 30, q[3] * (0.5 + 0.3 * q[2]) * (0.8 + 0.3 * tw), 0, TAU); ctx.fill(); }
    // the other ponds
    const P = visiblePonds();
    for (let k = 0; k < P.length; k++) { const p = P[k], px = p.x * v.scale + v.ox, py = p.y * v.scale + v.oy, pr = p.r * v.scale;
      if (px + pr * 3 < 0 || py + pr * 3 < 0 || px - pr * 3 > v.w || py - pr * 3 > v.h) continue;
      if (pr < 1.2) { ctx.fillStyle = 'hsla(' + p.hue + ',85%,72%,0.9)'; ctx.beginPath(); ctx.arc(px, py, 1.6, 0, TAU); ctx.fill(); continue; }
      const halo = ctx.createRadialGradient(px, py, pr * 0.6, px, py, pr * 2.6); halo.addColorStop(0, 'hsla(' + p.hue + ',85%,62%,0.3)'); halo.addColorStop(1, 'hsla(' + p.hue + ',85%,60%,0)');
      ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(px, py, pr * 2.6, 0, TAU); ctx.fill();
      const body = ctx.createRadialGradient(px - pr * 0.3, py - pr * 0.35, pr * 0.1, px, py, pr); body.addColorStop(0, 'hsl(' + p.hue + ',60%,40%)'); body.addColorStop(1, 'hsl(' + (p.hue + 25) + ',65%,16%)');
      ctx.fillStyle = body; ctx.beginPath(); ctx.ellipse(px, py, pr * 1.18, pr * 0.82, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'hsla(' + p.hue + ',90%,78%,0.75)'; ctx.lineWidth = Math.max(1, pr * 0.045); ctx.stroke();
      if (pr > 7) { const n = Math.min(14, Math.floor(pr / 3)); for (let q = 0; q < n; q++) { const a = hash(p.i, p.j, 40 + q) * TAU + t * (0.08 + 0.1 * hash(p.i, p.j, 60 + q)) * (q % 2 ? 1 : -1), d = 0.2 + 0.7 * hash(p.i, p.j, 80 + q); ctx.fillStyle = 'hsla(' + (p.hue + 60 + q * 37) % 360 + ',90%,75%,0.9)'; ctx.beginPath(); ctx.arc(px + Math.cos(a) * pr * 1.05 * d, py + Math.sin(a) * pr * 0.7 * d, Math.max(0.8, pr * 0.035), 0, TAU); ctx.fill(); } }
      if (pr > 20) { ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '700 ' + Math.round(clamp(pr * 0.2, 11, 17)) + 'px system-ui, sans-serif'; ctx.fillStyle = 'rgba(235,245,255,0.95)'; ctx.fillText(p.name, px, py + pr * 0.82 + 16);
        ctx.font = '600 10px system-ui, sans-serif'; ctx.fillStyle = 'rgba(170,200,230,0.8)'; ctx.fillText('A FAR POND', px, py + pr * 0.82 + 32); }
    }
    ctx.restore();
    // our own pond's edge, drawn over everything: a bright rim that shines when the pond has just grown
    ctx.save(); ctx.setTransform(s, 0, 0, s, v.ox * v.dpr, v.oy * v.dpr);
    ctx.strokeStyle = 'rgba(120,225,225,' + (0.16 + 0.25 * pulse) + ')'; ctx.lineWidth = Math.max(10 / v.scale, m * 0.02) * (1 + pulse); ctx.beginPath(); edge(ctx, ww, wh, R); ctx.stroke();
    ctx.strokeStyle = 'rgba(190,245,245,' + (0.7 + 0.3 * pulse) + ')'; ctx.lineWidth = Math.max(1.6 / v.scale, m * 0.003); ctx.beginPath(); edge(ctx, ww, wh, R); ctx.stroke();
    pulse = Math.max(0, pulse - 0.006);
    ctx.restore();
    // seen from afar, it is named
    if (G.cam.z < 0.45) { ctx.save(); ctx.setTransform(v.dpr, 0, 0, v.dpr, 0, 0); const px = ww / 2 * v.scale + v.ox, py = wh * v.scale + v.oy + 18; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = '800 14px system-ui, sans-serif'; ctx.fillStyle = '#f6d365'; ctx.fillText('YOUR POND', px, py); ctx.font = '600 11px system-ui, sans-serif'; ctx.fillStyle = 'rgba(207,232,255,0.85)'; ctx.fillText('generation ' + W.gen + ' · ' + W.cre.length + ' alive', px, py + 17); ctx.restore(); }
  };

  // ── the way home, and a word about a far pond ──
  let home = null, card = null, shown = '';
  function ui() {
    if (home) return;
    const st = document.createElement('style');
    st.textContent = '#gohome{position:fixed;left:50%;top:14px;transform:translateX(-50%);z-index:7;display:flex;align-items:center;gap:9px;padding:9px 18px 9px 12px;border-radius:999px;cursor:pointer;font:800 11px system-ui,sans-serif;letter-spacing:.16em;color:#1a2433;background:#f6d365;border:1px solid #f6d365;box-shadow:0 6px 24px rgba(0,0,0,.5)}#gohome i{display:inline-flex;width:20px;height:20px;align-items:center;justify-content:center;font-style:normal;font-size:15px;transition:transform .2s}#gohome small{font:600 10.5px system-ui,sans-serif;letter-spacing:.04em;opacity:.75;text-transform:none}' +
      '#farcard{position:fixed;left:50%;bottom:96px;transform:translateX(-50%);z-index:8;width:min(420px,calc(100vw - 28px));padding:13px 16px 14px;border-radius:18px;font:500 12.5px/1.45 system-ui,sans-serif;color:#cfe8ff;text-align:center}#farcard b{display:block;font:800 17px system-ui,sans-serif;color:#fff;margin:2px 0 4px}#farcard .k{font:700 9.5px system-ui,sans-serif;letter-spacing:.2em;color:#f6d365;text-transform:uppercase}#farcard .r{display:flex;gap:8px;margin-top:10px}#farcard .r .btn{flex:1;min-height:34px}';
    document.head.appendChild(st);
    const host = document.getElementById('ui') || document.body;
    home = document.createElement('button'); home.id = 'gohome'; home.className = 'hide'; home.innerHTML = '<i>➤</i><span>BACK TO MY POND</span><small></small>'; host.appendChild(home);
    home.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
    home.addEventListener('click', function (e) { e.stopPropagation(); if (G.sfx) G.sfx('click'); G.goHome(); });
    card = document.createElement('div'); card.id = 'farcard'; card.className = 'glass hide'; host.appendChild(card);
    card.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
    card.addEventListener('click', function (e) { const id = e.target && e.target.id; if (id === 'farHome') { if (G.sfx) G.sfx('click'); G.goHome(); } else if (id === 'farClose') hideCard(); });
  }
  function hideCard() { if (card) card.classList.add('hide'); shown = ''; }
  function hud(x0, y0, x1, y1) {
    ui();
    const W = G.W, v = G.view, on = G.mode === 'play' && !(G.ui && G.ui.modal);
    // "home" shows once the pond is small on the screen or has slid mostly out of it
    const cx = W.ww / 2, cy = W.wh / 2, inView = cx > x0 && cx < x1 && cy > y0 && cy < y1, away = on && (G.cam.z < 0.42 || !inView) && !fly;
    home.classList.toggle('hide', !away);
    if (away) { const dx = cx - G.cam.x, dy = cy - G.cam.y, d = Math.hypot(dx, dy) / Math.max(W.ww, W.wh); home.firstChild.style.transform = 'rotate(' + Math.atan2(dy, dx) + 'rad)'; home.lastChild.textContent = inView ? '' : d < 1.5 ? 'near' : Math.round(d) + ' ponds away';
      const top = ['wish', 'wxnow'].reduce(function (y, id) { const e = document.getElementById(id); return e && !e.classList.contains('hide') && e.offsetHeight ? Math.max(y, e.getBoundingClientRect().bottom + 8) : y; }, 14); home.style.top = Math.round(top) + 'px'; }
    if (!on && shown) hideCard();
  }
  G.on('pond-click', function (c) {
    const W = G.W; if (!W || W.title || G.mode !== 'play' || !c) return;
    if (c.x > 0 && c.x < W.ww && c.y > 0 && c.y < W.wh) { if (shown) hideCard(); return; }
    const P = visiblePonds(), v = G.view; let hit = null;
    for (let i = 0; i < P.length; i++) { const p = P[i], reach = Math.max(p.r * 1.3, 16 / v.scale); if (Math.hypot(c.x - p.x, c.y - p.y) < reach) { hit = p; break; } }
    if (!hit) { if (shown) hideCard(); return; }
    ui(); if (G.sfx) G.sfx('click');
    G.flyTo(hit.x, hit.y, clamp(v.h * 0.16 / (hit.r * v.base), ZMIN, 1.2), 1.0);
    shown = hit.name;
    card.innerHTML = '<div class="k">A far pond</div><b>' + G.escapeHtml(hit.name) + '</b>One day this will be somebody else\'s living pond, and you will be able to go in and look around. For now it is only a light on the map: visiting is not open yet.<div class="r"><button class="btn sm" id="farHome">BACK TO MY POND</button><button class="btn sm" id="farClose">CLOSE</button></div>';
    card.classList.remove('hide');
  });
  G.on('new-pond', function () { fly = null; hideCard(); });
})();
