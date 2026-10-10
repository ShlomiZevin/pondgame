// ── Primordia core: the shared object G, random numbers, events, loop, input ──
(function () {
  'use strict';
  const PAL = {
    deep: '#07121f',
    teal: '#0f3b4a',
    algae: '#33d6a6',
    gold: '#f6d365',
    rose: '#ff7eb6',
    violet: '#a78bfa',
    frost: '#cfe8ff',
  };
  const root = typeof window !== 'undefined' ? window : globalThis;
  const G = root.G = {
    PAL,
    systems: [],
    _on: {},
    mode: 'boot',        // boot | title | play
    paused: false,
    speed: 1,            // 0 pause, 1, 4, 16, 64
    view: { w: 800, h: 600, dpr: 1, scale: 1, base: 1, ww: 2240, wh: 1400, ox: 0, oy: 0 },
    cam: { z: 1.4, x: 1120, y: 700, set: false },
    input: { keys: {}, pressed: {}, ptr: { x: 0, y: 0, down: false, inside: false, wx: 0, wy: 0 }, clicks: [] },
    ui: {},
    ai: {},
    K: {},
  };

  G.on = function (name, fn) { (G._on[name] || (G._on[name] = [])).push(fn); };
  G.emit = function (name, a, b, c) {
    const l = G._on[name];
    if (!l) return;
    for (let i = 0; i < l.length; i++) l[i](a, b, c);
  };

  // ── numbers ──
  G.clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  G.lerp = function (a, b, t) { return a + (b - a) * t; };
  G.seed = function (s) {
    let a = (s >>> 0) || 1;
    G.seedValue = a;
    G.rand = function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  };
  G.seed(12345);
  G.randn = function () { return (G.rand() + G.rand() + G.rand() + G.rand() - 2) * 1.732; };
  G.rr = function (a, b) { return a + (b - a) * G.rand(); };
  G.ri = function (a, b) { return Math.floor(G.rr(a, b + 1)); };
  G.pick = function (arr) { return arr[Math.floor(G.rand() * arr.length)]; };
  G.hash = function (str) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    return h >>> 0;
  };
  // a tiny stable random generator for a given string/number (does not touch G.rand)
  G.rng = function (seed) {
    let a = (seed >>> 0) || 7;
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  };

  // ── colours ──
  G.hsl = function (h, s, l, a) {
    return 'hsla(' + (Math.round(h * 10) / 10) + ',' + Math.round(s) + '%,' + Math.round(l) + '%,' + (a === undefined ? 1 : Math.round(a * 1000) / 1000) + ')';
  };
  G.rgba = function (hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return 'rgba(' + (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  };

  // ── systems ──
  G.addSystem = function (sys) { G.systems.push(sys); return sys; };
  const failed = {};
  function runSystem(sys, fn, a) {
    if (!sys[fn]) return;
    try { sys[fn](a); }
    catch (err) {
      const key = sys.name + '.' + fn;
      if (!failed[key]) { failed[key] = 1; console.error('[' + key + ']', err); }
    }
  }
  G.runSystems = function (fn, a) {
    for (let i = 0; i < G.systems.length; i++) runSystem(G.systems[i], fn, a);
  };

  // ── view: the pond is always as tall as 1000 units; width follows the window ──
  G.resize = function () {
    const v = G.view;
    const cv = G.canvas;
    if (!cv) return;
    const W = Math.max(200, window.innerWidth), H = Math.max(200, window.innerHeight);
    const dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, Math.sqrt(2600000 / (W * H))));
    v.w = W; v.h = H; v.dpr = dpr;
    cv.width = Math.floor(W * dpr); cv.height = Math.floor(H * dpr);
    cv.style.width = W + 'px'; cv.style.height = H + 'px';
    // the pond is 1400 units tall and as wide as the window makes it at full zoom-out
    const gr = v.grow || 1;                  // the pond grows when it is crowded (57_grow): it is then taller than 1400, and still all of it fits the window
    v.base = H / (1400 * gr);
    v.wh = 1400 * gr;
    v.ww = G.clamp(W / v.base, 840 * gr, 3360 * gr);
    if (!G.cam.set) { G.cam.x = v.ww / 2; G.cam.y = v.wh / 2; G.cam.set = true; }
    G.applyCam();
    G.emit('resize');
  };

  // ── the camera: zoom 1 shows the whole pond; zoom in to watch them closely, drag to move ──
  G.applyCam = function () {
    const v = G.view, c = G.cam;
    c.z = G.clamp(c.z, 0.5, 6);
    v.scale = v.base * c.z;
    const hw = v.w / 2 / v.scale, hh = v.h / 2 / v.scale;
    // the view may be dragged past every edge, out over the emptiness round the pond, at any zoom: only a sliver of the pond has to stay in sight
    // (G.camHome brings it back to the middle)
    c.x = G.clamp(c.x, -hw * 0.8, v.ww + hw * 0.8);
    c.y = G.clamp(c.y, -hh * 0.8, v.wh + hh * 0.8);
    c.away = Math.abs(c.x - v.ww / 2) > Math.max(hw, v.ww / 2) * 0.6 + 1 || Math.abs(c.y - v.wh / 2) > Math.max(hh, v.wh / 2) * 0.6 + 1;
    v.ox = v.w / 2 - c.x * v.scale; v.oy = v.h / 2 - c.y * v.scale;
  };
  /** zoom by a factor, keeping the point under (sx, sy) where it is */
  G.zoomAt = function (factor, sx, sy) {
    const v = G.view, c = G.cam;
    if (sx === undefined) { sx = v.w / 2; sy = v.h / 2; }
    const wx = (sx - v.ox) / v.scale, wy = (sy - v.oy) / v.scale;
    c.z = G.clamp(c.z * factor, 0.5, 6);
    const s = v.base * c.z;
    c.x = wx - (sx - v.w / 2) / s; c.y = wy - (sy - v.h / 2) / s;
    G.applyCam();
  };
  /** back to the middle of the pond, all of it in view */
  G.camHome = function () { const v = G.view; G.cam.z = 1; G.cam.x = v.ww / 2; G.cam.y = v.wh / 2; G.applyCam(); };
  G.focusOn = function (x, y, z) { G.cam.x = x; G.cam.y = y; if (z) G.cam.z = Math.max(G.cam.z, z); G.applyCam(); };

  // ── input ──
  function toWorld(e) {
    const v = G.view, p = G.input.ptr;
    p.x = e.clientX; p.y = e.clientY;
    p.wx = (e.clientX - v.ox) / v.scale;
    p.wy = (e.clientY - v.oy) / v.scale;
  }
  function typing() {
    const a = document.activeElement;
    return a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.tagName === 'SELECT');
  }
  G.initInput = function () {
    const cv = G.canvas, inp = G.input;
    window.addEventListener('keydown', function (e) {
      if (typing()) { if (e.key === 'Escape') G.emit('escape'); return; }
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (!inp.keys[k]) inp.pressed[k] = true;
      inp.keys[k] = true;
      G.emit('key', k, e);
      if (k === ' ' || k === 'ArrowUp' || k === 'ArrowDown') e.preventDefault();
    });
    window.addEventListener('keyup', function (e) {
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      inp.keys[k] = false;
    });
    const touches = new Map();
    let drag = null, pinch = 0;
    cv.addEventListener('pointermove', function (e) {
      if (touches.has(e.pointerId)) touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (touches.size === 2) {
        // two fingers: pinch to zoom
        const p = Array.from(touches.values()), d = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
        if (pinch > 0 && d > 0) G.zoomAt(d / pinch, (p[0].x + p[1].x) / 2, (p[0].y + p[1].y) / 2);
        pinch = d; if (drag) drag.moved = true;
      } else if (drag && inp.ptr.down) {
        const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
        if (!drag.moved && Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) > 7) drag.moved = true;
        if (drag.moved && !G.ui.placing && !G.ui.meteor) {
          // one button drags a box round creatures to choose them (where there is a colony to command: the right one, unless the buttons are swapped); any other moves the view
          if (!drag.touch && drag.btn === (G.cmd && G.cmd.boxBtn ? G.cmd.boxBtn() : 0) && (drag.box || (G.cmd && G.cmd.boxOk && G.cmd.boxOk()))) { drag.box = true; G.ui.box = { x0: drag.x0, y0: drag.y0, x1: e.clientX, y1: e.clientY }; }
          else { G.cam.x -= dx / G.view.scale; G.cam.y -= dy / G.view.scale; G.applyCam(); } }
        drag.x = e.clientX; drag.y = e.clientY;
      }
      toWorld(e); inp.ptr.inside = true;
    });
    cv.addEventListener('wheel', function (e) { e.preventDefault(); if (G.mode === 'play') G.zoomAt(Math.exp(-e.deltaY * 0.0016), e.clientX, e.clientY); }, { passive: false });
    cv.addEventListener('pointerleave', function () { inp.ptr.inside = false; });
    cv.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    cv.addEventListener('pointerdown', function (e) {
      toWorld(e); inp.ptr.down = true; inp.ptr.inside = true;
      if (e.pointerType === 'touch') G.touch = true;
      touches.set(e.pointerId, { x: e.clientX, y: e.clientY }); pinch = 0;
      drag = { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, moved: touches.size > 1, touch: e.pointerType === 'touch', btn: e.button | 0 };
    });
    cv.addEventListener('pointerup', function (e) {
      toWorld(e);
      // a press that did not move is a click on the pond
      if (drag && drag.box) { const b = G.ui.box, v = G.view; G.ui.box = null; if (b) G.emit('box-select', { x0: (Math.min(b.x0, b.x1) - v.ox) / v.scale, y0: (Math.min(b.y0, b.y1) - v.oy) / v.scale, x1: (Math.max(b.x0, b.x1) - v.ox) / v.scale, y1: (Math.max(b.y0, b.y1) - v.oy) / v.scale }, e.shiftKey); }
      else if (drag && !drag.moved && touches.size <= 1) {
        const c = { x: inp.ptr.wx, y: inp.ptr.wy, sx: e.clientX, sy: e.clientY, touch: drag.touch, shift: e.shiftKey };
        if (drag.btn === 2) G.emit('pond-order', c);      // the second button: it chooses (68_command.js)
        else { inp.clicks.push(c); G.emit('pond-click', c); }
      }
    });
    const lift = function (e) { inp.ptr.down = false; touches.delete(e.pointerId); pinch = 0; if (!touches.size) drag = null; };
    window.addEventListener('pointerup', lift);
    window.addEventListener('pointercancel', lift);
    window.addEventListener('touchstart', function () { G.touch = true; document.body.classList.add('touch'); }, { passive: true });
    window.addEventListener('resize', G.resize);
  };

  // ── the loop ──
  let last = 0, running = false;
  G.frame = function (ts) {
    requestAnimationFrame(G.frame);
    const now = ts / 1000;
    let dt = now - last; last = now;
    if (!(dt > 0)) dt = 0.016;
    dt = Math.min(dt, 0.1);
    G.rt = (G.rt || 0) + dt;
    G.runSystems('update', dt);
    G.runSystems('draw', dt);
    G.input.pressed = {};
    G.input.clicks.length = 0;
  };
  G.boot = function () {
    if (running) return;
    running = true;
    G.canvas = document.getElementById('pond');
    G.ctx = G.canvas.getContext('2d');
    G.resize();
    G.initInput();
    G.runSystems('init');
    G.mode = 'title';
    G.emit('boot');
    requestAnimationFrame(function (ts) { last = ts / 1000; G.frame(ts); });
  };
  window.addEventListener('load', function () { G.boot(); });
})();
