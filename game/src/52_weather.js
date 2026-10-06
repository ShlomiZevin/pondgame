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
    const W = G.W, o = { temp: 0, light: 0, poison: 0, food: 1, mutate: 1, list: [] };
    if (!W || !W.mods) return o;
    for (let i = 0; i < W.mods.length; i++) {
      const m = W.mods[i], left = m.until - W.t; if (!(left > 0)) continue;
      o.temp += m.temp || 0; o.light += m.light || 0; o.poison += m.poison || 0; o.food *= m.food || 1; o.mutate = Math.max(o.mutate, m.mutate || 1);
      const key = m.name + '|' + Math.round(m.until); if (!seen[key]) seen[key] = left;
      o.list.push({ name: m.name, left: left, of: seen[key], does: words(m) });
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
    const N = on ? now() : { temp: 0, light: 0, poison: 0, food: 1, mutate: 1, list: [] };
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
    // ── what drifts in it ──
    const fa = fl ? Math.atan2(fl.fy, fl.fx) : 0;
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
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
    spawn(kind === 'famine' || kind === 'dark' ? 'wonder' : kind, 70, true);
  });
  setup();
  requestAnimationFrame(frame);
  setInterval(function () { try { drawStrip(); } catch (e) { console.error(e); } }, 500);
})();
