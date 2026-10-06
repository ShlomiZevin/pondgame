// ── What is happening to the pond, made visible ──
// A world event used to be a line of text and a flash. Now it is SEEN and it stays seen for as long as it lasts:
//   · when it strikes: its name across the middle of the pond, a ring bursting outwards, a burst of its own weather
//   · while it lasts: the water is tinted and filled with what it is (snow and frost at the edges for cold, embers and a
//     shimmer for heat, darkness closing in, green murk and bubbles for poison, drifting motes when mutations run wild,
//     streaks when a current sweeps through), and a strip under the wish card names it, says what it does, and counts it down.
// It draws on a layer of its own over the pond and under the buttons, and only reads the world; it changes nothing in it.
(function () {
  'use strict';
  if (typeof document === 'undefined') return;
  let cv = null, ctx = null, strip = null, W_ = 0, H_ = 0, last = 0, splash = null, parts = [], cleared = true;
  const seen = {};           // an event's first-seen length, so its countdown bar knows the whole
  const TAU = 6.2832;

  function setup() {
    if (cv) return;
    const st = document.createElement('style');
    st.textContent = '#wxfx{position:fixed;inset:0;width:100%;height:100%;pointer-events:none}' +
      '#wxnow{position:fixed;left:50%;transform:translateX(-50%);top:14px;z-index:2;display:flex;flex-wrap:wrap;justify-content:center;gap:6px;width:min(560px,calc(100vw - 28px));pointer-events:none}' +
      '#wxnow .wx{display:flex;align-items:center;gap:8px;padding:5px 12px 6px;border-radius:14px;background:rgba(9,28,40,.86);border:1px solid rgba(246,211,101,.45);font:600 11.5px system-ui,sans-serif;color:#cfe8ff;box-shadow:0 4px 18px rgba(0,0,0,.35)}' +
      '#wxnow .wx b{color:#fff;font-weight:700}#wxnow .wx i{font-style:normal;color:#f6d365}#wxnow .wx .bar{width:46px;height:5px;border-radius:3px;background:rgba(207,232,255,.18);overflow:hidden}#wxnow .wx .bar u{display:block;height:100%;background:#f6d365}' +
      '@keyframes wishp{0%,100%{opacity:.25;transform:scale(.7)}50%{opacity:1;transform:scale(1.15)}}' +
      '@media (min-width:721px){body.wxon #banner.show{transform:translate(-50%,150px) !important}}' +
      '@media (max-width:720px){#wxnow{top:auto;bottom:160px}}@media (max-height:560px){#wxnow{display:none}}';
    document.head.appendChild(st);
    cv = document.createElement('canvas'); cv.id = 'wxfx';
    const pond = document.getElementById('pond');
    if (pond && pond.parentNode) pond.parentNode.insertBefore(cv, pond.nextSibling); else document.body.appendChild(cv);
    ctx = cv.getContext('2d');
    strip = document.createElement('div'); strip.id = 'wxnow';
    (document.getElementById('ui') || document.body).appendChild(strip);
    size(); window.addEventListener('resize', size);
  }
  function size() { W_ = cv.width = Math.max(320, window.innerWidth); H_ = cv.height = Math.max(240, window.innerHeight); }

  // what is in force right now, added up
  function now() {
    const W = G.W, o = { temp: 0, light: 0, poison: 0, food: 1, mutate: 1, list: [], fx: {} };
    if (!W || !W.mods) return o;
    for (let i = 0; i < W.mods.length; i++) {
      const m = W.mods[i], left = m.until - W.t; if (!(left > 0)) continue;
      if (m.fx) o.fx[m.fx] = 1;
      o.temp += m.temp || 0; o.light += m.light || 0; o.poison += m.poison || 0; o.food *= m.food || 1; o.mutate = Math.max(o.mutate, m.mutate || 1);
      const key = m.name + '|' + Math.round(m.until); if (!seen[key]) seen[key] = left;
      o.list.push({ name: m.name, left: left, of: seen[key], does: [words(m), m.fx || ''].filter(Boolean).join(' · ') });
    }
    return o;
  }
  function words(m) {
    const t = [];
    if (m.temp < -0.05) t.push('freezing'); else if (m.temp > 0.05) t.push('scorching');
    if (m.light < -0.05) t.push('dark'); else if (m.light > 0.05) t.push('bright');
    if (m.poison > 0.05) t.push('poisoned');
    if (m.food < 0.95) t.push('food is scarce'); else if (m.food > 1.05) t.push('food is plenty');
    if (m.mutate > 1.05) t.push('mutations run wild');
    return t.join(' · ');
  }
  function kindOf(ev) {
    if (ev.temp < -0.05) return 'cold'; if (ev.temp > 0.05) return 'heat'; if (ev.poison > 0.05) return 'poison';
    if (ev.light < -0.05) return 'dark'; if (ev.kill && ev.kill.share > 0.02) return 'death'; if (ev.current > 0.05) return 'flood';
    if (ev.mutate > 1.05) return 'mutate'; if (ev.food > 1.05 || (ev.feed && ev.feed.count > 0)) return 'feast'; if (ev.food < 0.95) return 'famine';
    return 'wonder';
  }
  const COL = { cold: [170, 215, 255], heat: [255, 140, 60], poison: [110, 220, 70], dark: [20, 20, 45], death: [255, 80, 100], flood: [90, 170, 255], mutate: [200, 110, 255], feast: [120, 240, 150], famine: [150, 150, 150], wonder: [246, 211, 101] };
  const rgba = function (c, a) { return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; };

  const FX = {
    snow: [[255, 255, 255], 'top', 40, 110, 1.5, 4.5, 'dot', 60], hail: [[225, 240, 255], 'top', 420, 620, 2.5, 4.5, 'dot', 55], rain: [[170, 210, 255], 'top', 720, 980, 14, 26, 'streak', 110],
    ash: [[165, 160, 155], 'top', 18, 55, 1.5, 3.5, 'dot', 45], petals: [[255, 165, 205], 'top', 30, 75, 3, 5.5, 'leaf', 26], leaves: [[235, 160, 60], 'top', 40, 95, 3.5, 6, 'leaf', 22], feathers: [[245, 245, 235], 'top', 20, 50, 4, 7, 'leaf', 16],
    embers: [[255, 150, 60], 'bottom', 50, 140, 1.5, 3.5, 'dot', 45], bubbles: [[170, 225, 255], 'bottom', 30, 85, 3, 9, 'ring', 26], spores: [[150, 235, 120], 'any', 6, 22, 1.5, 3.5, 'dot', 30],
    sparks: [[255, 230, 90], 'any', 60, 200, 1, 2.5, 'dot', 60], stars: [[255, 240, 180], 'any', 0, 4, 1, 3, 'twinkle', 26], sand: [[225, 195, 130], 'side', 300, 520, 1, 2.5, 'dot', 120],
    fog: [[220, 230, 240], 'side', 12, 34, 70, 150, 'cloud', 2.2], meteors: [[255, 205, 130], 'top', 520, 760, 26, 46, 'streak', 5], lightning: [[240, 245, 255], 'any', 0, 0, 0, 0, 'bolt', 0.35],
  };
  function spawnFx(name, n) {
    const d = FX[name]; if (!d) return;
    for (let i = 0; i < n && parts.length < 240; i++) {
      const sp = d[2] + Math.random() * (d[3] - d[2]), p = { k: 'fx', fx: name, c: d[0], draw: d[6], x: Math.random() * W_, y: Math.random() * H_, vx: 0, vy: 0, r: d[4] + Math.random() * (d[5] - d[4]), life: 1, a: Math.random() * TAU };
      if (d[1] === 'top') { p.y = -20; p.vy = sp; p.vx = name === 'meteors' ? -sp * 0.6 : name === 'rain' || name === 'hail' ? -sp * 0.12 : 0; if (name === 'meteors') p.x = Math.random() * W_ * 1.4; }
      else if (d[1] === 'bottom') { p.y = H_ + 12; p.vy = -sp; }
      else if (d[1] === 'side') { p.x = -p.r - 10; p.vx = sp; p.vy = (Math.random() - 0.5) * sp * 0.12; }
      else { const a = Math.random() * TAU; p.vx = Math.cos(a) * sp; p.vy = Math.sin(a) * sp; p.life = name === 'sparks' ? 0.5 : 1.6 + Math.random() * 1.5; }
      if (d[6] === 'bolt') { p.life = 0.22; p.pts = [[p.x, 0]]; let x = p.x, y = 0; while (y < H_ * (0.5 + Math.random() * 0.4)) { x += (Math.random() - 0.5) * 90; y += 30 + Math.random() * 50; p.pts.push([x, y]); } }
      parts.push(p);
    }
  }
  function spawn(kind, n, burst) {
    for (let i = 0; i < n && parts.length < 190; i++) {
      const p = { k: kind, x: Math.random() * W_, y: 0, vx: 0, vy: 0, r: 2, life: 1, a: Math.random() * TAU };
      if (kind === 'cold') { p.y = burst ? Math.random() * H_ : -8; p.vy = 40 + Math.random() * 70; p.vx = -20 + Math.random() * 40; p.r = 1.5 + Math.random() * 3; }
      else if (kind === 'heat') { p.y = burst ? Math.random() * H_ : H_ + 8; p.vy = -(50 + Math.random() * 90); p.vx = -15 + Math.random() * 30; p.r = 1.5 + Math.random() * 2.5; }
      else if (kind === 'poison') { p.y = burst ? Math.random() * H_ : H_ + 10; p.vy = -(25 + Math.random() * 50); p.r = 3 + Math.random() * 7; }
      else if (kind === 'mutate') { p.y = Math.random() * H_; p.vy = -10 + Math.random() * 20; p.vx = -10 + Math.random() * 20; p.r = 1.5 + Math.random() * 2.5; p.life = 0.6 + Math.random() * 0.8; }
      else if (kind === 'feast') { p.y = burst ? Math.random() * H_ : -8; p.vy = 30 + Math.random() * 50; p.r = 2 + Math.random() * 3; }
      else if (kind === 'flood') { p.y = Math.random() * H_; p.r = 30 + Math.random() * 70; p.life = 0.5 + Math.random() * 0.5; }
      else { p.y = Math.random() * H_; p.vy = -20 + Math.random() * 40; p.vx = -20 + Math.random() * 40; p.r = 2 + Math.random() * 3; p.life = 0.8; }
      parts.push(p);
    }
  }

  function frame(ts) {
    requestAnimationFrame(frame);
    if (!cv) return;
    const dt = Math.min(0.05, (ts - last) / 1000 || 0.016); last = ts;
    const on = G.mode === 'play' && G.W && !G.W.title;
    const N = on ? now() : { temp: 0, light: 0, poison: 0, food: 1, mutate: 1, list: [], fx: {} };
    const fl = on && G.W.flood && G.W.flood.t > 0 ? G.W.flood : null;
    const active = on && (N.list.length || fl || splash || parts.length);
    if (!active) { if (!cleared) { ctx.clearRect(0, 0, W_, H_); cleared = true; } return; }
    cleared = false;
    ctx.clearRect(0, 0, W_, H_);
    const t = ts / 1000;
    // ── the water itself ──
    if (N.temp < -0.05) { const k = Math.min(1, -N.temp); ctx.fillStyle = rgba(COL.cold, 0.06 + 0.1 * k); ctx.fillRect(0, 0, W_, H_);
      const g = ctx.createRadialGradient(W_ / 2, H_ / 2, Math.min(W_, H_) * 0.34, W_ / 2, H_ / 2, Math.max(W_, H_) * 0.72); g.addColorStop(0, 'rgba(235,246,255,0)'); g.addColorStop(1, 'rgba(235,246,255,' + (0.22 + 0.26 * k) + ')'); ctx.fillStyle = g; ctx.fillRect(0, 0, W_, H_);      // frost closing in from the edges
      if (Math.random() < dt * (30 + 60 * k)) spawn('cold', 1); }
    if (N.temp > 0.05) { const k = Math.min(1, N.temp); ctx.fillStyle = rgba(COL.heat, 0.08 + 0.13 * k + 0.02 * Math.sin(t * 3)); ctx.fillRect(0, 0, W_, H_);
      const g = ctx.createLinearGradient(0, H_, 0, H_ * 0.45); g.addColorStop(0, 'rgba(255,90,30,' + (0.28 + 0.2 * k) + ')'); g.addColorStop(1, 'rgba(255,90,30,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W_, H_);
      if (Math.random() < dt * (25 + 50 * k)) spawn('heat', 1); }
    if (N.light < -0.05) { const k = Math.min(1, -N.light); const g = ctx.createRadialGradient(W_ / 2, H_ / 2, Math.min(W_, H_) * (0.42 - 0.2 * k), W_ / 2, H_ / 2, Math.max(W_, H_) * 0.7); g.addColorStop(0, 'rgba(3,4,14,' + 0.12 * k + ')'); g.addColorStop(1, 'rgba(3,4,14,' + (0.55 + 0.35 * k) + ')'); ctx.fillStyle = g; ctx.fillRect(0, 0, W_, H_); }
    if (N.light > 0.05) { ctx.fillStyle = 'rgba(255,250,205,' + (0.06 + 0.1 * Math.min(1, N.light)) + ')'; ctx.fillRect(0, 0, W_, H_); }
    if (N.poison > 0.05) { const k = Math.min(1, N.poison * 2); ctx.fillStyle = rgba(COL.poison, 0.1 + 0.14 * k + 0.02 * Math.sin(t * 2)); ctx.fillRect(0, 0, W_, H_); if (Math.random() < dt * (10 + 22 * k)) spawn('poison', 1); }
    if (N.food < 0.95) { ctx.fillStyle = 'rgba(120,120,125,' + (0.1 + 0.25 * (1 - N.food)) + ')'; ctx.fillRect(0, 0, W_, H_); }
    if (N.food > 1.05 && Math.random() < dt * 14) spawn('feast', 1);
    if (N.mutate > 1.05) { ctx.fillStyle = rgba(COL.mutate, 0.05 + 0.03 * Math.sin(t * 2.4)); ctx.fillRect(0, 0, W_, H_); if (Math.random() < dt * 22) spawn('mutate', 1); }
    if (fl && Math.random() < dt * 60) spawn('flood', 1);
    for (const name in N.fx) { const d = FX[name]; if (d && Math.random() < dt * d[7]) spawnFx(name, 1); }
    // ── what drifts in it ──
    const fa = fl ? Math.atan2(fl.fy, fl.fx) : 0;
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      if (p.k === 'fx') {
        p.x += (p.vx + (p.draw === 'leaf' || p.fx === 'snow' || p.fx === 'ash' ? Math.sin(t * 1.6 + p.a) * 26 : 0)) * dt; p.y += p.vy * dt;
        if (p.draw === 'twinkle' || p.draw === 'bolt' || p.fx === 'sparks' || p.fx === 'spores') p.life -= dt * (p.draw === 'bolt' ? 1 : 0.6);
        const al = Math.max(0, Math.min(1, p.life));
        if (p.draw === 'streak') { const m = Math.hypot(p.vx, p.vy) || 1; ctx.strokeStyle = rgba(p.c, p.fx === 'meteors' ? 0.9 : 0.5); ctx.lineWidth = p.fx === 'meteors' ? 3 : 1.6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx / m * p.r, p.y - p.vy / m * p.r); ctx.stroke(); if (p.fx === 'meteors') { ctx.fillStyle = 'rgba(255,255,240,.95)'; ctx.beginPath(); ctx.arc(p.x, p.y, 3.2, 0, TAU); ctx.fill(); } }
        else if (p.draw === 'ring') { ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, TAU); ctx.strokeStyle = rgba(p.c, 0.7); ctx.lineWidth = 1.5; ctx.stroke(); ctx.fillStyle = rgba(p.c, 0.12); ctx.fill(); }
        else if (p.draw === 'leaf') { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(Math.sin(t * 2 + p.a) * 1.1 + p.a); ctx.beginPath(); ctx.ellipse(0, 0, p.r, p.r * 0.45, 0, 0, TAU); ctx.fillStyle = rgba(p.c, 0.85); ctx.fill(); ctx.restore(); }
        else if (p.draw === 'twinkle') { const tw = 0.5 + 0.5 * Math.sin(t * 5 + p.a * 3); ctx.fillStyle = rgba(p.c, al * tw); ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (0.6 + tw), 0, TAU); ctx.fill(); }
        else if (p.draw === 'cloud') { const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r); g.addColorStop(0, rgba(p.c, 0.16)); g.addColorStop(1, rgba(p.c, 0)); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, TAU); ctx.fill(); }
        else if (p.draw === 'bolt') { ctx.fillStyle = 'rgba(235,240,255,' + al * 0.5 + ')'; ctx.fillRect(0, 0, W_, H_); ctx.strokeStyle = 'rgba(255,255,255,' + Math.min(1, al * 4) + ')'; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.shadowColor = '#bcd4ff'; ctx.shadowBlur = 18; ctx.beginPath(); for (let q = 0; q < p.pts.length; q++) { if (q) ctx.lineTo(p.pts[q][0], p.pts[q][1]); else ctx.moveTo(p.pts[q][0], p.pts[q][1]); } ctx.stroke(); ctx.shadowBlur = 0; }
        else { ctx.fillStyle = rgba(p.c, al * 0.9); ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, TAU); ctx.fill(); }
        if (p.life <= 0 || p.y < -160 || p.y > H_ + 160 || p.x < -260 || p.x > W_ + 260) parts.splice(i, 1);
        continue;
      }
      if (p.k === 'flood') { p.x += Math.cos(fa) * 900 * dt; p.y += Math.sin(fa) * 900 * dt; p.life -= dt * 1.4; ctx.strokeStyle = 'rgba(200,230,255,' + Math.max(0, p.life) * 0.5 + ')'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - Math.cos(fa) * p.r, p.y - Math.sin(fa) * p.r); ctx.stroke(); }
      else {
        p.x += (p.vx + Math.sin(t * 1.5 + p.a) * 14) * dt; p.y += p.vy * dt; if (p.k === 'mutate' || p.k === 'wonder' || p.k === 'death') p.life -= dt * 0.7;
        const c = COL[p.k] || COL.wonder, al = Math.min(1, p.life) * (p.k === 'poison' ? 0.4 : 0.85);
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, TAU);
        if (p.k === 'poison') { ctx.strokeStyle = rgba(c, al + 0.25); ctx.lineWidth = 1.5; ctx.stroke(); ctx.fillStyle = rgba(c, al * 0.4); ctx.fill(); }
        else { ctx.fillStyle = p.k === 'cold' ? 'rgba(255,255,255,' + al + ')' : rgba(c, al); ctx.fill(); }
      }
      if (p.life <= 0 || p.y < -90 || p.y > H_ + 90 || p.x < -120 || p.x > W_ + 120) parts.splice(i, 1);
    }
    // ── the moment it strikes ──
    if (splash) {
      const u = Math.max(0, (ts - splash.t0) / 3400);
      if (u >= 1) splash = null;
      else {
        const c = COL[splash.kind] || COL.wonder, lit = splash.kind === 'dark' ? [190, 195, 255] : c.map(function (v) { return Math.round(v + (255 - v) * 0.45); }), a = u < 0.12 ? u / 0.12 : u > 0.7 ? (1 - u) / 0.3 : 1;
        ctx.fillStyle = rgba(c, 0.3 * Math.max(0, 1 - u * 3)); ctx.fillRect(0, 0, W_, H_);
        ctx.strokeStyle = rgba(lit, 0.8 * (1 - u)); ctx.lineWidth = 10 * (1 - u) + 2; ctx.beginPath(); ctx.arc(W_ / 2, H_ / 2, u * Math.max(W_, H_) * 0.75, 0, TAU); ctx.stroke();
        const fs = Math.max(26, Math.min(64, W_ / Math.max(10, splash.name.length * 0.62)));
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '800 ' + fs + 'px system-ui, sans-serif';
        ctx.shadowColor = rgba(lit, 0.95 * a); ctx.shadowBlur = 34; ctx.lineWidth = 7; ctx.lineJoin = 'round'; ctx.strokeStyle = 'rgba(4,10,18,' + 0.95 * a + ')'; ctx.strokeText(splash.name.toUpperCase(), W_ / 2, H_ * 0.42);
        ctx.fillStyle = 'rgba(255,255,255,' + a + ')'; ctx.fillText(splash.name.toUpperCase(), W_ / 2, H_ * 0.42); ctx.shadowBlur = 0;
        if (splash.does) { ctx.font = '700 ' + Math.round(fs * 0.34) + 'px system-ui, sans-serif'; ctx.lineWidth = 5; ctx.fillStyle = rgba(lit, a); ctx.strokeText(splash.does, W_ / 2, H_ * 0.42 + fs * 0.85); ctx.fillText(splash.does, W_ / 2, H_ * 0.42 + fs * 0.85); }
      }
    }
  }

  // the strip: what is in force, what it does, how long is left
  let stripSig = '';
  function drawStrip() {
    if (!strip) return;
    const on = G.mode === 'play' && G.W && !G.W.title, L = on ? now().list : [];
    if (on && G.W.fields) for (let i = 0; i < G.W.fields.length; i++) { const f = G.W.fields[i], coming = G.W.t < f.start; L.push({ name: f.name, left: coming ? f.start - G.W.t : f.life, of: coming ? Math.max(1, f.after) : f.life0, does: coming ? 'coming' : (G.fieldWords ? G.fieldWords(f) : '') }); }
    document.body.classList.toggle('wxon', L.length > 0);
    const wish = document.getElementById('wish'), below = wish && !wish.classList.contains('hide') && window.innerWidth > 720 ? Math.round(wish.getBoundingClientRect().bottom) + 6 : 14;
    if (window.innerWidth > 720) strip.style.top = below + 'px'; else strip.style.top = '';
    const sig = L.map(function (q) { return q.name + Math.ceil(q.left / 2); }).join('|');
    if (sig === stripSig) return; stripSig = sig;
    strip.innerHTML = L.map(function (q) { return '<span class="wx"><b>' + String(q.name).replace(/[&<>]/g, '') + '</b>' + (q.does ? '<i>' + q.does + '</i>' : '') + '<span class="bar"><u style="width:' + Math.round(100 * Math.max(0, Math.min(1, q.left / q.of))) + '%"></u></span><span>' + Math.ceil(q.left) + 's</span></span>'; }).join('');
  }

  G.on('event', function (ev) {
    if (G.mode !== 'play') return;
    setup();
    const kind = kindOf(ev);
    splash = { name: String(ev.name || 'Something happened'), does: words(ev) || (ev.kill && ev.kill.share > 0.02 ? 'many are taken' : ev.gift ? 'bodies change at once' : ev.admire ? 'taste changes' : ev.thing ? 'something arrives' : ''), kind: kind, t0: performance.now() };
    if (ev.fx && FX[ev.fx]) { for (let i = 0; i < 60; i++) { spawnFx(ev.fx, 1); const p = parts[parts.length - 1]; if (p && p.draw !== 'bolt') { p.x = Math.random() * W_; p.y = Math.random() * H_; } } }
    else spawn(kind === 'famine' || kind === 'dark' ? 'wonder' : kind, 70, true);
  });
  setup();
  requestAnimationFrame(frame);
  setInterval(function () { try { drawStrip(); } catch (e) { console.error(e); } }, 500);
})();
