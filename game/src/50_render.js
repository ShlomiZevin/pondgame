// ── Drawing: a drop of pond water under a microscope ──
const PAL = G.PAL;
const R = {
  fx: [],                       // short-lived effects (rings, sparkles, motes, links)
  shake: 0, flash: 0, flashCol: '#fff',
  tint: [143, 227, 180, 0.07], tintTo: [143, 227, 180, 0.07],
  far: [], near: [],
  spr: {}, halo: {}, foodHalo: [],
  sel: null, hover: null,
  ghost: null,                  // a thing being placed: { info }
  bars: 0, dim: 0, ext: 0,
  VIS: 1.2,                    // how big a creature is drawn, compared with its true size
};
G.R = R;

function mixHex(a, b, t) {
  const x = parseInt(a.slice(1), 16), y = parseInt(b.slice(1), 16);
  const r = Math.round(((x >> 16) & 255) * (1 - t) + ((y >> 16) & 255) * t);
  const g = Math.round(((x >> 8) & 255) * (1 - t) + ((y >> 8) & 255) * t);
  const bl = Math.round((x & 255) * (1 - t) + (y & 255) * t);
  return [r, g, bl];
}
const SEASON_TINT = [
  mixHex(PAL.rose, PAL.algae, 0.55).concat(0.075),
  mixHex(PAL.algae, PAL.frost, 0.35).concat(0.05),
  mixHex(PAL.gold, PAL.rose, 0.2).concat(0.085),
  mixHex(PAL.frost, PAL.violet, 0.15).concat(0.11),
];
const SEASON_ICON = ['petal', 'sun', 'leaf', 'flake'];

function bodySprite(hue) {
  const b = Math.round(hue / 15) % 24;
  if (R.spr[b]) return R.spr[b];
  const h = b * 15;
  const cv = document.createElement('canvas'); cv.width = cv.height = 256;       // big enough to stay sharp in the tree and the guide
  const c = cv.getContext('2d');
  c.scale(256 / 96, 256 / 96);
  let g = c.createRadialGradient(48, 44, 4, 48, 48, 40);
  g.addColorStop(0, G.hsl(h, 75, 82, 0.78));
  g.addColorStop(0.7, G.hsl(h, 80, 62, 0.66));
  g.addColorStop(0.93, G.hsl(h, 90, 78, 1));
  g.addColorStop(1, G.hsl(h, 85, 66, 0));
  c.fillStyle = g; c.beginPath(); c.arc(48, 48, 40, 0, 6.2832); c.fill();
  // a soft highlight, like light through jelly
  g = c.createRadialGradient(36, 34, 1, 36, 34, 16);
  g.addColorStop(0, 'rgba(255,255,255,0.45)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = g; c.beginPath(); c.arc(36, 34, 16, 0, 6.2832); c.fill();
  R.spr[b] = cv;
  return cv;
}
function haloSprite(hue) {
  const b = Math.round(hue / 30) % 12;
  if (R.halo[b]) return R.halo[b];
  const h = b * 30;
  const cv = document.createElement('canvas'); cv.width = cv.height = 128;
  const c = cv.getContext('2d');
  const g = c.createRadialGradient(64, 64, 8, 64, 64, 64);
  g.addColorStop(0, G.hsl(h, 90, 60, 0.30)); g.addColorStop(1, G.hsl(h, 90, 60, 0));
  c.fillStyle = g; c.fillRect(0, 0, 128, 128);
  R.halo[b] = cv;
  return cv;
}
function foodHaloSprite(tag) {
  if (R.foodHalo[tag]) return R.foodHalo[tag];
  const cv = document.createElement('canvas'); cv.width = cv.height = 48;
  const c = cv.getContext('2d');
  const g = c.createRadialGradient(24, 24, 1, 24, 24, 24);
  g.addColorStop(0, G.hsl(G.TAGHUE[tag], 90, 66, 0.55)); g.addColorStop(1, G.hsl(G.TAGHUE[tag], 90, 66, 0));
  c.fillStyle = g; c.fillRect(0, 0, 48, 48);
  R.foodHalo[tag] = cv;
  return cv;
}

// ── effects ──
function fx(o) { if (R.fx.length < 700) R.fx.push(o); }
function ring(x, y, col, r1, life) { fx({ k: 'ring', x: x, y: y, t: 0, life: life || 0.7, r1: r1 || 30, col: col }); }
function sparkle(x, y, col, n, spd) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * 6.2832, s = (spd || 40) * (0.4 + Math.random());
    fx({ k: 'spark', x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: 0, life: 0.5 + Math.random() * 0.5, col: col, s: 1.5 + Math.random() * 1.5 });
  }
}
function motes(x, y, hue, n) {
  for (let i = 0; i < n; i++) fx({ k: 'mote', x: x + (Math.random() - 0.5) * 14, y: y + (Math.random() - 0.5) * 14, vx: (Math.random() - 0.5) * 14, vy: -6 - Math.random() * 12, t: 0, life: 1.6 + Math.random() * 1.2, hue: hue, s: 2 + Math.random() * 2 });
}
R.ring = ring; R.sparkle = sparkle; R.motes = motes;

function initRender() {
  for (let i = 0; i < 110; i++) R.far.push({ x: Math.random(), y: Math.random(), s: 0.5 + Math.random() * 1.1, a: 0.1 + Math.random() * 0.25, ph: Math.random() * 6.28, sp: 0.01 + Math.random() * 0.02 });
  for (let i = 0; i < 46; i++) R.near.push({ x: Math.random(), y: Math.random(), s: 1.4 + Math.random() * 2.4, a: 0.07 + Math.random() * 0.14, ph: Math.random() * 6.28, sp: 0.02 + Math.random() * 0.03 });
  G.on('birth', function (c, from, mate) {
    if (G.speed > 4) { if (c.muts.length) c.flash = 1; return; }
    const col = c.muts.length ? PAL.rose : PAL.frost;
    ring(c.x, c.y, col, c.ph.r * 3.2, 0.8);
    sparkle(c.x, c.y, col, 4, 40);
    if (from && G.speed <= 4) {
      fx({ k: 'link', x: from.x, y: from.y, c: c, col: PAL.gold, t: 0, life: 1.2 });
      if (mate) fx({ k: 'link', x: mate.x, y: mate.y, c: c, col: PAL.rose, t: 0, life: 1.2 });
    }
    if (c.muts.length) { c.flash = 1; }
  });
  G.on('death', function (c, cause) {
    if (G.speed > 4) return;
    motes(c.x, c.y, c.g.t[2], cause === 'eaten' ? 3 : 5);
    if (cause === 'eaten') ring(c.x, c.y, PAL.rose, c.ph.r * 2.5, 0.5);
    if (cause === 'meteor' || cause === 'plague') sparkle(c.x, c.y, PAL.rose, 3, 60);
  });
  G.on('eat', function (c, o) {
    if (G.speed <= 4 && Math.random() < 0.5) fx({ k: 'puff', x: o.x, y: o.y, t: 0, life: 0.4, col: G.hsl(G.TAGHUE[o.tag], 90, 70, 1) });
  });
  G.on('zone', function (z) {
    ring(z.x, z.y, G.hsl(z.hue, 80, 65, 1), z.r0 * 1.2, 1.4);
    ring(z.x, z.y, G.hsl(z.hue, 80, 65, 1), z.r0 * 0.8, 1.0);
    sparkle(z.x, z.y, G.hsl(z.hue, 90, 70, 1), 14, 70);
  });
  G.on('disaster', function (kind, x, y) {
    R.shake = kind === 'meteor' ? 1 : 0.5;
    R.flash = 1; R.flashCol = kind === 'meteor' ? PAL.gold : kind === 'plague' ? PAL.violet : kind === 'flood' ? PAL.frost : kind === 'bloom' ? PAL.algae : PAL.rose;
    if (kind === 'meteor') { ring(x, y, PAL.gold, 220, 1.2); ring(x, y, PAL.rose, 140, 0.9); sparkle(x, y, PAL.gold, 30, 160); }
  });
  G.on('season', function (s) { R.tintTo = SEASON_TINT[s].slice(); if (s === 3) R.bars = 1; });
  G.on('event', function (ev) { R.shake = ev.shake; R.flash = 0.9; R.flashCol = G.hsl(ev.hue, 85, 62, 1); });
  G.on('scored', function () { R.barsHold = 3.5; });
  G.on('extinct', function () { R.ext = 0.001; });
  G.on('fight', function (a, b) { if (G.speed <= 4) { sparkle((a.x + b.x) / 2, (a.y + b.y) / 2, PAL.rose, 5, 70); ring((a.x + b.x) / 2, (a.y + b.y) / 2, PAL.rose, 22, 0.35); } });
  G.on('birth', function (c, from, mate) { if (mate && G.speed <= 4) fx({ k: 'heart', x: (from.x + mate.x) / 2, y: (from.y + mate.y) / 2, t: 0, life: 1.3 }); });
}

// world → screen setup
function beginWorld(ctx) {
  const v = G.view;
  const s = v.scale * v.dpr;
  let sx = 0, sy = 0;
  if (R.shake > 0) { sx = (Math.random() - 0.5) * 14 * R.shake; sy = (Math.random() - 0.5) * 14 * R.shake; }
  ctx.setTransform(s, 0, 0, s, (v.ox + sx) * v.dpr, (v.oy + sy) * v.dpr);
}
function screenSpace(ctx) { ctx.setTransform(G.view.dpr, 0, 0, G.view.dpr, 0, 0); }

// ── layer 1: the water ──
function drawWaterDepth() {
  const ctx = G.ctx, v = G.view;
  screenSpace(ctx);
  const g = ctx.createLinearGradient(0, 0, 0, v.h);
  g.addColorStop(0, G.rgba(PAL.teal, 1));
  g.addColorStop(0.5, mixCss(PAL.teal, PAL.deep, 0.45));
  g.addColorStop(1, G.rgba(PAL.deep, 1));
  ctx.fillStyle = g; ctx.fillRect(0, 0, v.w, v.h);
  const m = ctx.createRadialGradient(v.w * 0.5, v.h * 0.48, 10, v.w * 0.5, v.h * 0.48, Math.max(v.w, v.h) * 0.62);
  m.addColorStop(0, 'rgba(60,150,150,0.14)'); m.addColorStop(1, 'rgba(60,150,150,0)');
  ctx.fillStyle = m; ctx.fillRect(0, 0, v.w, v.h);
  // every pond's water has its own colour, and murky water is dimmer
  const E = G.W && G.W.env;
  if (E) { ctx.fillStyle = 'hsla(' + Math.round(E.hue) + ',70%,' + Math.round(46 - 14 * E.murk) + '%,' + (0.2 + 0.1 * E.murk).toFixed(2) + ')'; ctx.fillRect(0, 0, v.w, v.h); }
  // the pond runs from bright shallows (left) to the dark deep (right)
  const d = ctx.createLinearGradient(0, 0, v.w, 0);
  d.addColorStop(0, 'rgba(246,211,101,0.07)'); d.addColorStop(0.45, 'rgba(7,18,31,0)'); d.addColorStop(1, 'rgba(7,18,31,0.55)');
  ctx.fillStyle = d; ctx.fillRect(0, 0, v.w, v.h);
}
function mixCss(a, b, t) { const c = mixHex(a, b, t); return 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')'; }

// ── layer 2: slow light on the water, and the bright patches where algae grow ──
function drawCaustics() {
  const ctx = G.ctx, v = G.view, W = G.W, t = G.rt;
  beginWorld(ctx);
  const ww = W ? W.ww : v.ww, wh = W ? W.wh : v.wh;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 7; i++) {
    const cx = ww * (0.5 + 0.55 * Math.sin(t * 0.045 + i * 1.9)), cy = wh * (0.5 + 0.5 * Math.cos(t * 0.037 + i * 2.7));
    const r = 260 + 90 * Math.sin(t * 0.08 + i);
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, G.rgba(i % 2 ? PAL.algae : PAL.frost, 0.07)); g.addColorStop(1, G.rgba(PAL.frost, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    const n = 5, rot = t * 0.05 + i;
    for (let k = 0; k < n; k++) {
      const a = rot + k / n * 6.2832, rr = r * (0.8 + 0.25 * Math.sin(t * 0.2 + k * 2 + i));
      const px = cx + Math.cos(a) * rr, py = cy + Math.sin(a) * rr;
      if (k) ctx.lineTo(px, py); else ctx.moveTo(px, py);
    }
    ctx.closePath(); ctx.fill();
  }
  if (W) {
    // the bright places where food grows
    for (let i = 0; i < W.lights.length; i++) {
      const L = G.lightPos(i);
      const g = ctx.createRadialGradient(L.x, L.y, 0, L.x, L.y, L.r);
      g.addColorStop(0, G.rgba(PAL.gold, 0.10 * L.a * Math.min(1.4, W.set.light))); g.addColorStop(1, G.rgba(PAL.gold, 0));
      ctx.fillStyle = g; ctx.fillRect(L.x - L.r, L.y - L.r, L.r * 2, L.r * 2);
    }
  }
  ctx.restore();
}

function dust(list, depth, alphaMul) {
  const ctx = G.ctx, v = G.view, t = G.rt, p = G.input.ptr;
  screenSpace(ctx);
  const ox = (p.x - v.w / 2) * -0.012 * depth, oy = (p.y - v.h / 2) * -0.012 * depth;
  ctx.fillStyle = PAL.frost;
  for (let i = 0; i < list.length; i++) {
    const d = list[i];
    const x = ((d.x + t * d.sp * 0.4 * depth) % 1) * v.w + ox, y = ((d.y + Math.sin(t * 0.1 + d.ph) * 0.02 * depth) % 1 + 1) % 1 * v.h + oy;
    ctx.globalAlpha = d.a * alphaMul * (0.6 + 0.4 * Math.sin(t * 0.6 + d.ph));
    ctx.beginPath(); ctx.arc(x, y, d.s * depth * 0.8 + 0.3, 0, 6.2832); ctx.fill();
  }
  ctx.globalAlpha = 1;
}
// the shore: land along the top of the pond
function drawShore() {
  const W = G.W; if (!W) return;
  const ctx = G.ctx, sy = G.shoreY(W);
  beginWorld(ctx);
  ctx.save();
  const g = ctx.createLinearGradient(0, 0, 0, sy + 30);
  g.addColorStop(0, 'rgba(70,96,58,0.96)'); g.addColorStop(0.72, 'rgba(120,128,78,0.9)'); g.addColorStop(0.9, 'rgba(196,180,120,0.7)'); g.addColorStop(1, 'rgba(196,180,120,0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.moveTo(-50, -50); ctx.lineTo(W.ww + 50, -50); ctx.lineTo(W.ww + 50, sy);
  for (let x = W.ww + 50; x >= -50; x -= 40) ctx.lineTo(x, sy + 9 * Math.sin(x * 0.011 + G.rt * 0.5) + 6 * Math.sin(x * 0.031));
  ctx.closePath(); ctx.fill();
  // tufts of grass
  ctx.strokeStyle = 'rgba(140,200,110,0.55)'; ctx.lineWidth = 2;
  for (let i = 0; i < 60; i++) { const x = (i * 0.618034 % 1) * W.ww, y = 10 + ((i * 0.3711) % 1) * (sy - 26), sw = Math.sin(G.rt * 1.4 + i) * 3; ctx.beginPath(); ctx.moveTo(x, y + 8); ctx.lineTo(x + sw, y - 2); ctx.moveTo(x + 4, y + 8); ctx.lineTo(x + 6 + sw, y); ctx.stroke(); }
  // the waterline
  ctx.strokeStyle = 'rgba(207,232,255,0.35)'; ctx.lineWidth = 2; ctx.beginPath();
  for (let x = -50; x <= W.ww + 50; x += 40) { const y = sy + 9 * Math.sin(x * 0.011 + G.rt * 0.5) + 6 * Math.sin(x * 0.031); if (x === -50) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
  ctx.stroke();
  ctx.restore();
}
function drawDustFar() { dust(R.far, 1, 1); }
function drawDustNear() { dust(R.near, 2.2, 1); }

// ── layer 4: zones from the things you add ──
function zoneColor(z, a) { return G.hsl(z.hue, 80, 62, a); }
function drawHazardWashes() {
  const W = G.W; if (!W) return;
  const ctx = G.ctx;
  beginWorld(ctx);
  ctx.save();
  for (let i = 0; i < W.zones.length; i++) {
    const z = W.zones[i], p = z.p;
    const r = z.r * 1.15;
    const g = ctx.createRadialGradient(z.x, z.y, r * 0.1, z.x, z.y, r);
    let col = PAL.violet;
    if (p.heat > 0.3) col = PAL.rose; else if (p.heat < -0.3) col = PAL.frost; else if (p.poison > 0.3) col = PAL.violet; else if (p.light < -0.3) col = PAL.deep; else if (p.acid > 0.3) col = PAL.algae; else if (p.nut > 0.3) col = null;
    if (!col) col = G.hsl(z.hue, 80, 60, 1).replace('hsla', 'hsla');
    const tint = col.charAt(0) === '#' ? G.rgba(col, 0.34 * z.k) : G.hsl(z.hue, 80, 60, 0.3 * z.k);
    const clear = col.charAt(0) === '#' ? G.rgba(col, 0) : G.hsl(z.hue, 80, 60, 0);
    g.addColorStop(0, tint); g.addColorStop(0.75, tint); g.addColorStop(1, clear);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(z.x, z.y, r, 0, 6.2832); ctx.fill();
    if (p.hard > 0.3) {
      ctx.strokeStyle = G.rgba(PAL.frost, 0.5 * z.k); ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(z.x, z.y, z.r * 0.8, 0, 6.2832); ctx.stroke();
    }
    // drifting particles
    ctx.fillStyle = zoneColor(z, 0.5 * z.k);
    for (let k = 0; k < 9; k++) {
      const a = k * 0.7 + G.rt * (0.15 + (k % 3) * 0.05) * (p.heat < 0 ? -1 : 1), d = z.r * (0.25 + 0.7 * ((k * 0.37 + G.rt * 0.08 * (1 + p.heat)) % 1));
      ctx.beginPath(); ctx.arc(z.x + Math.cos(a) * d, z.y + Math.sin(a) * d - (p.heat > 0.3 ? (G.rt * 10 + k * 7) % 30 : 0), 2, 0, 6.2832); ctx.fill();
    }
  }
  if (W.flood) {
    ctx.strokeStyle = G.rgba(PAL.frost, 0.16); ctx.lineWidth = 2;
    const a = Math.atan2(W.flood.fy, W.flood.fx);
    for (let i = 0; i < 16; i++) {
      const x = (G.rt * 220 * Math.cos(a) + i * 211) % (W.ww + 200), y = (G.rt * 220 * Math.sin(a) + i * 137) % (W.wh + 200);
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * 60, y + Math.sin(a) * 60); ctx.stroke();
    }
  }
  ctx.restore();
}

// ── layer 5: food ──
function drawFood() {
  const W = G.W; if (!W) return;
  const ctx = G.ctx, t = G.rt;
  beginWorld(ctx);
  const f = W.food;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < f.length; i++) {
    const o = f[i];
    if (o.dead) continue;
    const tw = 0.75 + 0.25 * Math.sin(t * 2.2 + o.ph);
    const s = 6 + o.v * 0.25;
    ctx.globalAlpha = tw * 0.8;
    ctx.drawImage(foodHaloSprite(o.tag), o.x - s, o.y - s, s * 2, s * 2);
  }
  ctx.globalAlpha = 1;
  ctx.restore();
  for (let i = 0; i < f.length; i++) {
    const o = f[i];
    if (o.dead) {
      // eaten: a little puff of light that fades
      const u = (o.gone || 0) / 0.35;
      ctx.fillStyle = G.hsl(G.TAGHUE[o.tag], 90, 80, 0.8 * (1 - u));
      ctx.beginPath(); ctx.arc(o.x, o.y, 2 + u * 7, 0, 6.2832); ctx.fill();
      continue;
    }
    if (o.land) {
      // a plant on the shore: two leaves
      ctx.fillStyle = G.hsl(G.TAGHUE[o.tag], 70, 62, 0.95);
      ctx.beginPath(); ctx.ellipse(o.x - 4, o.y, 6, 3, -0.6, 0, 6.2832); ctx.ellipse(o.x + 4, o.y, 6, 3, 0.6, 0, 6.2832); ctx.fill();
      continue;
    }
    if (o.big) {
      // big prey: a fat morsel with a ring, for jaws only
      ctx.fillStyle = G.hsl(G.TAGHUE[o.tag], 85, 68, 0.95); ctx.beginPath(); ctx.arc(o.x, o.y, 5.5, 0, 6.2832); ctx.fill();
      ctx.strokeStyle = G.rgba(PAL.frost, 0.6); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(o.x, o.y, 8, 0, 6.2832); ctx.stroke();
      continue;
    }
    const fade = Math.min(1, o.born / 0.8);
    ctx.fillStyle = G.hsl(G.TAGHUE[o.tag], 85, 72, 0.95 * fade);
    ctx.beginPath(); ctx.arc(o.x, o.y, (1.8 + o.v * 0.07) * (0.4 + 0.6 * fade), 0, 6.2832); ctx.fill();
  }
}

// ── layer 6: things the player added ──
function shapePath(ctx, x, y, r, shape, rot) {
  ctx.beginPath();
  if (shape === 1) { // ring-ish rounded square
    for (let i = 0; i < 4; i++) { const a = rot + i * 1.5708 + 0.785; ctx.lineTo(x + Math.cos(a) * r * 1.1, y + Math.sin(a) * r * 1.1); }
  } else if (shape === 2) { // star
    for (let i = 0; i < 10; i++) { const a = rot + i * 0.628, rr = i % 2 ? r * 0.55 : r * 1.15; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
  } else if (shape === 3) { // drop
    for (let i = 0; i < 3; i++) { const a = rot + i * 2.094; ctx.lineTo(x + Math.cos(a) * r * 1.15, y + Math.sin(a) * r * 1.15); }
  } else if (shape === 4) { // flower
    for (let i = 0; i < 60; i++) { const a = rot + i / 60 * 6.2832, rr = r * (0.85 + 0.25 * Math.cos(a * 5 - rot * 5)); ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
  } else ctx.arc(x, y, r, 0, 6.2832);
  ctx.closePath();
}
function drawOrb(ctx, z, x, y, r, k, label, ghost, plain) {
  const t = G.rt;
  const pulse = 1 + 0.05 * Math.sin(t * 1.6 + z.id);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(x, y, 2, x, y, r * 1.1 * pulse);
  g.addColorStop(0, G.hsl(z.hue, 90, 72, 0.85 * k)); g.addColorStop(0.5, G.hsl(z.hue, 90, 62, 0.35 * k)); g.addColorStop(1, G.hsl(z.hue, 85, 60, 0));
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 1.1 * pulse, 0, 6.2832); ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.strokeStyle = G.hsl(z.hue, 90, 80, 0.7 * k); ctx.lineWidth = 2; ctx.setLineDash([7, 6]); ctx.lineDashOffset = -t * 14;
  shapePath(ctx, x, y, r * 0.42 * pulse, z.shape, t * 0.2);
  ctx.stroke();
  ctx.setLineDash([]);
  if (!plain) {
    ctx.fillStyle = G.hsl(z.hue, 85, 75, 0.35 * k);
    shapePath(ctx, x, y, r * 0.3 * pulse, z.shape, t * 0.2);
    ctx.fill();
    ctx.fillStyle = G.hsl(z.hue, 90, 88, 0.8 * k);
    shapePath(ctx, x, y, r * 0.14 * pulse, z.shape, t * 0.2);
    ctx.fill();
  }
  if (label) {
    ctx.font = '600 15px system-ui, "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillStyle = G.rgba(PAL.deep, 0.55 * k); ctx.fillText(label, x + 1, y + r * 0.5 + 6);
    ctx.fillStyle = G.rgba(PAL.frost, 0.9 * k); ctx.fillText(label, x, y + r * 0.5 + 5);
  }
  ctx.restore();
}
// a picture from the server (already cleaned), loaded once
function thingImage(o) {
  if (o.svg && !o.img && !o.imgTried) {
    o.imgTried = true;
    const im = new Image();
    im.onload = function () { o.img = im; };
    im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(o.svg);
  }
  return o.img || null;
}
// every thing's name and what it is doing right now, over everything else so it can always be read
function drawThingCaptions() {
  const W = G.W; if (!W || !W.zones.length || !G.thingStatus) return;
  const ctx = G.ctx, inv = 1 / Math.max(0.7, G.view.scale);
  beginWorld(ctx);
  for (let i = 0; i < W.zones.length; i++) {
    const z = W.zones[i]; if (z.k < 0.3) continue;
    const st = G.thingStatus(z), form = G.zoneForm ? G.zoneForm(z) : null;
    ctx.save(); ctx.translate(z.x, z.y + (form ? Math.max(84, z.r * 1.15) * 0.8 : z.r * 0.5) + 14 * inv); ctx.scale(inv, inv);      // the same size on screen at any zoom
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '700 12px system-ui, sans-serif'; const nw = ctx.measureText(z.word).width;
    ctx.font = '600 10.5px system-ui, sans-serif'; const tw = Math.max(nw, ctx.measureText(st.t).width) + 18;
    ctx.fillStyle = G.rgba(PAL.deep, 0.82); roundRect(ctx, -tw / 2, -10, tw, st.bar !== null ? 42 : 34, 9); ctx.fill();
    ctx.strokeStyle = G.hsl(z.hue, 80, 70, 0.6); ctx.lineWidth = 1; ctx.stroke();
    ctx.font = '700 12px system-ui, sans-serif'; ctx.fillStyle = '#fff'; ctx.fillText(z.word, 0, 0);
    ctx.font = '600 10.5px system-ui, sans-serif'; ctx.fillStyle = st.tone === 'bad' ? PAL.rose : st.tone === 'fight' ? PAL.gold : st.tone === 'good' ? PAL.algae : PAL.frost; ctx.fillText(st.t, 0, 14.5);
    if (st.bar !== null) { const bw = tw - 18; ctx.fillStyle = 'rgba(207,232,255,.18)'; roundRect(ctx, -bw / 2, 23.5, bw, 4, 2); ctx.fill(); ctx.fillStyle = st.bar > 0.5 ? PAL.rose : PAL.gold; roundRect(ctx, -bw / 2, 23.5, Math.max(3, bw * st.bar), 4, 2); ctx.fill(); }
    ctx.restore();
  }
}
function drawAddedThings() {
  const W = G.W; if (!W) return;
  const ctx = G.ctx;
  beginWorld(ctx);
  if (W.zones.length && G.speed <= 8) {
    const zm = {}; for (let i = 0; i < W.zones.length; i++) zm[W.zones[i].id] = W.zones[i];
    ctx.save(); ctx.lineWidth = 1.6; ctx.lineCap = 'round';
    for (let i = 0; i < W.cre.length; i++) {
      const c = W.cre[i]; if (c.zt === undefined || W.t - c.zt > 0.45) continue;
      const z = zm[c.zid]; if (!z) continue;
      const x = c.rx === undefined ? c.x : c.rx, y = c.ry === undefined ? c.y : c.ry, hurt = c.zk === 1, a = 0.55 * (1 - (W.t - c.zt) / 0.45);
      ctx.strokeStyle = hurt ? 'rgba(255,107,157,' + a + ')' : 'rgba(246,211,101,' + a + ')'; ctx.setLineDash(hurt ? [2, 5] : []);
      ctx.beginPath(); ctx.moveTo(z.x, z.y); ctx.lineTo(x, y); ctx.stroke();
      ctx.fillStyle = hurt ? 'rgba(255,107,157,' + (a + 0.3) + ')' : 'rgba(246,211,101,' + (a + 0.3) + ')'; ctx.font = '700 12px system-ui'; ctx.textAlign = 'center'; ctx.fillText(hurt ? '−' : '⚔', x, y - c.ph.r * 1.3 - 4);
    }
    ctx.restore();
  }
  for (let i = 0; i < W.zones.length; i++) {
    const z = W.zones[i];
    const form = G.zoneForm ? G.zoneForm(z) : null, im = form ? null : thingImage(z);
    const label = z.alive > 0.25 && z.genN > 1 ? z.word + ' · gen ' + z.genN : z.word;
    drawOrb(ctx, z, z.x, z.y, z.r * 0.8, z.k, '', false, !!im || !!form);
    if (form) {
      const sc = Math.max(84, z.r * 1.15) / 150 * (1 + 0.12 * Math.max(0, z.bite || 0));
      ctx.save(); ctx.globalAlpha = Math.min(1, 0.4 + z.k); ctx.translate(z.x, z.y - z.r * 0.08); ctx.scale(sc, sc);
      G.form.portrait(ctx, form, G.rt + z.id, {}); ctx.restore();
    }
    if (false) {
      const st = null;
      if (st) {
        const ty = 0;
        ctx.save(); ctx.font = '600 10px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        const tw = ctx.measureText(st.t).width + 14;
        ctx.fillStyle = G.rgba(PAL.deep, 0.72); roundRect(ctx, z.x - tw / 2, ty - 8, tw, 16, 8); ctx.fill();
        ctx.fillStyle = st.tone === 'bad' ? PAL.rose : st.tone === 'fight' ? PAL.gold : st.tone === 'good' ? PAL.algae : PAL.frost; ctx.fillText(st.t, z.x, ty + 0.5);
        if (st.bar !== null) { const bw = Math.min(90, tw - 10); ctx.fillStyle = G.rgba(PAL.deep, 0.7); roundRect(ctx, z.x - bw / 2, ty + 11, bw, 5, 2.5); ctx.fill(); ctx.fillStyle = st.bar > 0.5 ? PAL.rose : PAL.gold; roundRect(ctx, z.x - bw / 2, ty + 11, Math.max(3, bw * st.bar), 5, 2.5); ctx.fill(); }
        ctx.restore();
      }
    }
    if (im) {
      // the picture sits on a dark plate so it reads clearly against the glow
      const sz = Math.max(60, z.r * 1.0);
      ctx.save();
      ctx.globalAlpha = Math.min(1, 0.35 + z.k);
      ctx.fillStyle = G.rgba(PAL.deep, 0.72); ctx.beginPath(); ctx.arc(z.x, z.y, sz * 0.62, 0, 6.2832); ctx.fill();
      ctx.strokeStyle = G.hsl(z.hue, 90, 78, 0.8); ctx.lineWidth = 1.5; ctx.stroke();
      ctx.drawImage(im, z.x - sz / 2, z.y - sz / 2, sz, sz);
      ctx.restore();
    }
    if (z.p.vault > 0.2) {
      const wr = z.r * 0.8, broken = 1 - Math.max(0, Math.min(1, z.life / (z.life0 || 420)));
      ctx.save();
      ctx.fillStyle = 'rgba(20,32,48,0.35)'; ctx.beginPath(); ctx.arc(z.x, z.y, wr, 0, 6.2832); ctx.fill();
      ctx.strokeStyle = 'rgba(159,180,200,0.95)'; ctx.lineWidth = 11; ctx.beginPath(); ctx.arc(z.x, z.y, wr, 0, 6.2832); ctx.stroke();
      ctx.strokeStyle = 'rgba(70,90,112,0.9)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(z.x, z.y, wr - 7, 0, 6.2832); ctx.stroke(); ctx.beginPath(); ctx.arc(z.x, z.y, wr + 7, 0, 6.2832); ctx.stroke();
      ctx.fillStyle = 'rgba(225,238,250,0.95)';
      for (let q = 0; q < 20; q++) { const a = q / 20 * 6.2832; ctx.beginPath(); ctx.arc(z.x + Math.cos(a) * wr, z.y + Math.sin(a) * wr, 2.2, 0, 6.2832); ctx.fill(); }
      // cracks spread as it is worn down
      ctx.strokeStyle = 'rgba(7,18,31,0.9)'; ctx.lineWidth = 2.5;
      const cracks = Math.round(broken * 14);
      for (let q = 0; q < cracks; q++) { const a = q * 2.399 + z.id; ctx.beginPath(); ctx.moveTo(z.x + Math.cos(a) * (wr - 8), z.y + Math.sin(a) * (wr - 8)); ctx.lineTo(z.x + Math.cos(a + 0.05) * wr, z.y + Math.sin(a + 0.05) * wr); ctx.lineTo(z.x + Math.cos(a - 0.03) * (wr + 9), z.y + Math.sin(a - 0.03) * (wr + 9)); ctx.stroke(); }
      ctx.restore();
    }
    if (z.struck > 0) {
      z.struck -= 0.05;
      if (G.speed <= 16 && Math.random() < 0.5) { const a = Math.random() * 6.2832; R.sparkle(z.x + Math.cos(a) * z.r * 0.6, z.y + Math.sin(a) * z.r * 0.6, PAL.gold, 1, 50); }
      ctx.save(); ctx.strokeStyle = G.rgba(PAL.gold, 0.5 * Math.max(0, z.struck)); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(z.x, z.y, z.r * 0.72, 0, 6.2832); ctx.stroke(); ctx.restore();
    }
    if (z.p.deadly > 0.05) {
      const beat = 0.5 + 0.5 * Math.sin(G.rt * 6 + z.id), kr = z.r * 0.55;
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const dg = ctx.createRadialGradient(z.x, z.y, kr * 0.2, z.x, z.y, kr);
      dg.addColorStop(0, 'rgba(255,60,90,' + (0.35 + 0.3 * beat) * z.k + ')'); dg.addColorStop(1, 'rgba(255,60,90,0)');
      ctx.fillStyle = dg; ctx.beginPath(); ctx.arc(z.x, z.y, kr, 0, 6.2832); ctx.fill();
      ctx.restore();
      ctx.save(); ctx.strokeStyle = 'rgba(255,90,120,' + (0.6 + 0.4 * beat) * z.k + ')'; ctx.lineWidth = 2.5; ctx.setLineDash([3, 5]); ctx.beginPath(); ctx.arc(z.x, z.y, kr, 0, 6.2832); ctx.stroke(); ctx.restore();
      if (z.struckDead > 0) { z.struckDead -= 0.06; if (G.speed <= 16) R.ring(z.x, z.y, PAL.rose, z.r * 0.9, 0.4); }
    }
    if (z.p.eats > 0.05 && !form) {
      // teeth around the mouth: they snap shut when it bites
      const n = 9, open = 0.5 + 0.5 * Math.sin(G.rt * 3 + z.id) * (1 - Math.max(0, z.bite)), mr = z.r * 0.6;
      ctx.save(); ctx.fillStyle = G.rgba(PAL.frost, 0.85 * z.k);
      for (let q = 0; q < n; q++) {
        const a = q / n * 6.2832 + G.rt * 0.25, tip = mr * (0.42 + 0.4 * open);
        ctx.beginPath();
        ctx.moveTo(z.x + Math.cos(a - 0.16) * mr, z.y + Math.sin(a - 0.16) * mr);
        ctx.lineTo(z.x + Math.cos(a) * tip, z.y + Math.sin(a) * tip);
        ctx.lineTo(z.x + Math.cos(a + 0.16) * mr, z.y + Math.sin(a + 0.16) * mr);
        ctx.closePath(); ctx.fill();
      }
      ctx.strokeStyle = G.rgba(PAL.rose, 0.7 * z.k); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(z.x, z.y, mr, 0, 6.2832); ctx.stroke();
      ctx.restore();
    }
    if (z.p.pull) {
      // rings that travel inward (it pulls) or outward (it pushes)
      ctx.save(); ctx.strokeStyle = G.hsl(z.hue, 90, 80, 0.3 * z.k); ctx.lineWidth = 1.5;
      for (let q = 0; q < 3; q++) {
        let u = ((G.rt * 0.35 * Math.abs(z.p.pull) + q / 3) % 1); if (z.p.pull > 0) u = 1 - u;
        ctx.globalAlpha = Math.sin(u * 3.1416);
        ctx.beginPath(); ctx.arc(z.x, z.y, z.r * (0.5 + 1.2 * u), 0, 6.2832); ctx.stroke();
      }
      ctx.restore();
    }
    if (R.selZone === z) {
      ctx.save(); ctx.strokeStyle = G.rgba(PAL.frost, 0.8); ctx.lineWidth = 2; ctx.setLineDash([6, 5]); ctx.lineDashOffset = -G.rt * 20;
      ctx.beginPath(); ctx.arc(z.x, z.y, z.r + 6, 0, 6.2832); ctx.stroke(); ctx.restore();
    }
    if (z.age < 2) {
      // just placed: ripples spread out
      ctx.strokeStyle = G.hsl(z.hue, 90, 75, 0.7 * (1 - z.age / 2)); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(z.x, z.y, z.r * (0.5 + z.age * 0.5), 0, 6.2832); ctx.stroke();
    }
    if (z.life < 18) {
      // fading: it shrinks and dims
      ctx.strokeStyle = G.rgba(PAL.frost, 0.25 * (z.life / 18)); ctx.setLineDash([3, 6]); ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, 6.2832); ctx.stroke(); ctx.setLineDash([]);
    }
  }
  if (R.ghost && G.input.ptr.inside) {
    const gz = { id: 0, hue: R.ghost.hue, shape: R.ghost.shape };
    const p = G.input.ptr;
    drawOrb(ctx, gz, p.wx, p.wy, R.ghost.radius * 0.8, 0.8, R.ghost.name, true);
    const gi = thingImage(R.ghost);
    if (gi) { ctx.save(); ctx.globalAlpha = 0.9; const sz = R.ghost.radius * 0.76; ctx.drawImage(gi, p.wx - sz / 2, p.wy - sz / 2, sz, sz); ctx.restore(); }
    ctx.save(); ctx.strokeStyle = G.rgba(PAL.frost, 0.25); ctx.setLineDash([4, 6]); ctx.beginPath(); ctx.arc(p.wx, p.wy, R.ghost.radius, 0, 6.2832); ctx.stroke(); ctx.restore();
  }
}

// ── layer 7: creatures ──
// c: a creature, or anything shaped like one (g, ph, ang, id, glow, look...). a = interpolation, t = time.
G.R.SIDE = 70;        // how many portrait units make one body radius: sets how big a character stands in the pond
// In the pond a creature is its character: it stands, hops as it swims, leans into its speed, turns to face where it is going,
// and its face shows how it is doing. c: a creature; x, y: where its feet are.
// A painting is one picture, so it is moved the only way one picture can be: by bending it, in the way its build moves.
//   what swims: a ripple runs from head to tail, strongest at the tail, so the body and tail fin beat
//   bells, blobs, orbs, stars: it pulses, and what hangs below sways
//   what walks: the body bobs, and the legs under it step one after another
// x0..x0+w, y0..y0+h is where the whole picture goes. sp: how hard it is moving (0..1).
function drawPaintMoving(ctx, p, build, x0, y0, w, h, t, id, sp, still) {
  const cv = p.cv, pw = p.w, ph = p.h;
  if (still) { ctx.drawImage(cv, x0, y0, w, h); return; }
  if (build === 'fish' || build === 'serpent' || build === 'microbe') {
    const N = 16, amp = h * (build === 'serpent' ? 0.1 : 0.075) * (0.3 + 0.7 * sp), f = 5 + 5 * sp;
    for (let i = 0; i < N; i++) { const s0 = Math.round(i * pw / N), s1 = Math.round((i + 1) * pw / N), u = (i + 0.5) / N, off = Math.sin(t * f + (1 - u) * 3.4 + id) * amp * Math.pow(1 - u, 1.4); ctx.drawImage(cv, s0, 0, s1 - s0, ph, x0 + s0 / pw * w, y0 + off, (s1 - s0) / pw * w + 0.6, h); }
  } else if (build === 'jelly' || build === 'blob' || build === 'orb' || build === 'star') {
    const N = 14, soft = build === 'jelly' ? 1.6 : build === 'blob' ? 1 : 0.5;
    for (let j = 0; j < N; j++) { const s0 = Math.round(j * ph / N), s1 = Math.round((j + 1) * ph / N), v = (j + 0.5) / N, sx = 1 + 0.05 * soft * Math.sin(t * 3 - v * 3 + id), xo = Math.sin(t * 2.2 + v * 4 + id) * w * 0.045 * soft * v * v; ctx.drawImage(cv, 0, s0, pw, s1 - s0, x0 + w / 2 - w * sx / 2 + xo, y0 + s0 / ph * h, w * sx, (s1 - s0) / ph * h + 0.6); }
  } else {
    const cut = Math.round(ph * 0.62), N = 9, f = 7 + 6 * sp, lift = h * 0.06 * (0.25 + sp);
    for (let i = 0; i < N; i++) { const s0 = Math.round(i * pw / N), s1 = Math.round((i + 1) * pw / N), up = Math.max(0, Math.sin(t * f + i * 2.1 + id)) * lift; ctx.drawImage(cv, s0, cut, s1 - s0, ph - cut, x0 + s0 / pw * w, y0 + cut / ph * h - up, (s1 - s0) / pw * w + 0.6, (ph - cut) / ph * h); }      // the legs, stepping
    ctx.drawImage(cv, 0, 0, pw, cut + 1, x0, y0 + Math.sin(t * f * 0.5 + id) * h * 0.012, w, (cut + 1) / ph * h);
  }
}
function drawCharacter(ctx, c, x, y, scale, t, opt) {
  const ph = c.ph, g = c.g, f = g.f, r = ph.r * scale * R.VIS, id = c.id || 1;
  const alpha = opt.alpha === undefined ? 1 : opt.alpha; if (alpha <= 0.02) return;
  const pop = c.birthT > 0 ? 1 - c.birthT * c.birthT : 1, sp = Math.min(1, (c.squash || 0) / 1.1), weak = c.E !== undefined && c.E < ph.Emax * 0.15;
  const vx = Math.cos(c.ang || 0);
  c.fc = c.fc === undefined ? (vx >= 0 ? 1 : -1) : c.fc + ((vx > 0.2 ? 1 : vx < -0.2 ? -1 : c.fc > 0 ? 1 : -1) - c.fc) * 0.18;      // turning round takes a moment
  const spc = c.sp ? spOf(G.W, c.sp) : null, paint = G.ai.drawn ? null : (G.paintOf ? G.paintOf(c, spc) : null);
  const walks = G.form.walks(c.g.f._b || (c.g.f._b = G.form.build(c.g.f)), c.g.f);
  const still = c.asleep, dtv = c._vt === undefined ? 0 : Math.max(0, Math.min(0.1, t - c._vt)); c._vt = t;
  c._sp = c._sp === undefined ? sp : c._sp + (sp - c._sp) * Math.min(1, dtv * 3);
  const sp2 = c._sp;
  c._hop = (c._hop === undefined ? id : c._hop) + dtv * (2.6 + 3 * sp2); c._lp = (c._lp === undefined ? id * 0.37 : c._lp) + dtv * (0.4 + 0.45 * sp2);
  const hopT = c._hop, step = 0.5 - 0.5 * Math.cos(hopT * 2), hop = still ? 0 : walks ? step * Math.min(r * (0.05 + 0.2 * sp2), 9 + 6 * sp2) : (0.5 + 0.5 * Math.sin(t * 1.7 + id)) * Math.min(r * 0.5, 14);
  const land = still ? 1 : walks ? 1 - step : 0;          // 1 at the moment a walker touches down: it squashes there
  const shiver = c.chill > 0.05 ? Math.sin(t * 38 + id) * r * 0.035 : 0;
  const s = r / R.SIDE * (0.3 + 0.7 * pop) * (weak ? 0.92 : 1);
  ctx.save(); ctx.translate(x + shiver, y); ctx.globalAlpha = alpha * (weak ? 0.8 : 1);
  // its shadow on the pond floor: smaller when it is up in a hop
  ctx.fillStyle = 'rgba(4,12,20,0.3)'; ctx.beginPath(); ctx.ellipse(0, r * 0.1, r * (0.85 - 0.25 * hop / (r * 0.4 + 1)), r * 0.24, 0, 0, 6.2832); ctx.fill();
  if (ph.lamp > 0.3 || c.eatFlash > 0.2) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha *= (0.25 * Math.min(1, ph.lamp) * (0.5 + 0.5 * (c.glow || 0)) + 0.25 * Math.max(0, c.eatFlash || 0)) * (opt.crowd || 1); const hs = r * 3; ctx.drawImage(haloSprite(ph.hue), -hs, -hs - r * 1.2, hs * 2, hs * 2); ctx.restore(); }
  ctx.translate(0, -hop);
  const sq = still ? 0.06 : 0.06 * Math.pow(land, 3) * (0.4 + sp2), turn = Math.max(0.5, Math.abs(c.fc)) * (c.fc >= 0 ? 1 : -1);
  ctx.scale(turn * (1 + sq), 1 - sq);
  ctx.rotate(still ? (walks ? 0.9 : 0.25) : walks ? 0.03 + 0.12 * sp2 + Math.sin(hopT) * 0.02 : G.clamp(Math.sin(c.ang || 0) * 0.45, -0.45, 0.45) * (0.3 + 0.7 * sp2) + Math.sin(t * 2.3 + id) * 0.04);      // a walker leans into its speed; a swimmer points where it is going; asleep, it droops
  ctx.scale(s, s); ctx.translate(0, -104);                                       // its feet are at 104 in portrait units
  // where it looks: at what it is after, else it glances about
  let lx = Math.cos(t * 0.7 + id) * 0.6, ly = 0.15 + Math.sin(t * 0.9 + id * 1.3) * 0.4;
  if (c.look) { const ll = Math.hypot(c.lookX, c.lookY) || 1; lx = c.lookX / ll * (c.fc >= 0 ? 1 : -1); ly = c.lookY / ll; }
  const scared = (c.startle > 0) || (!!c.inp && Math.max(Math.abs(c.inp[5]), Math.abs(c.inp[6])) > 0.45);
  const blink = (t * 0.31 + (f.seed % 13) + id * 0.7) % 3.7 < 0.1;
  const lid = still || blink ? 1 : c.pois > 0.3 || c.gasp > 0.3 || weak ? 0.55 : c.tired > 0.75 ? 0.4 : 0;
  if (paint) { const k = 250 / Math.max(paint.w, paint.h), bottom = walks ? 108 : 86; drawPaintMoving(ctx, paint, c.g.f._b, -paint.w * k / 2, bottom - paint.h * k, paint.w * k, paint.h * k, t, id, sp, still); }      // the AI's painting of its kind, moving the way its build moves
  else if (opt.live) G.form.portrait(ctx, f, t + id * 0.37, { lx: lx, ly: ly, sleep: still });
  else G.form.pDraw(ctx, f, { lx: lx, ly: ly, lid: lid, wide: scared }, still ? id * 0.37 : c._lp);
  ctx.restore();
  // what it is going through, said with one small sign over its head
  if (G.speed <= 8 && alpha > 0.5 && !opt.noSigns) {
    const hy = y - hop - r * 254 / R.SIDE * 0.92, sign = scared ? '!' : c.pois > 0.3 ? 'x_x' : c.chill > 0.05 ? '*brr*' : c.hot > 0.05 ? '~phew~' : c.gasp > 0.7 && id % 4 === 0 ? 'o O' : still ? 'z z' : '';
    if (sign) { ctx.save(); ctx.font = '700 ' + Math.round(Math.max(9, r * (sign.length > 2 ? 0.36 : 0.55))) + 'px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(7,18,31,0.8)'; ctx.fillStyle = scared ? PAL.gold : c.pois > 0.3 ? PAL.algae : c.chill > 0.05 ? PAL.frost : c.hot > 0.05 ? PAL.rose : PAL.frost; const by2 = hy - 4 * Math.sin(t * 3 + id); ctx.strokeText(sign, x + r * 0.5, by2); ctx.fillText(sign, x + r * 0.5, by2); ctx.restore(); }
  }
  if (c.flash > 0 && c.mutAge > 0) { ctx.save(); ctx.strokeStyle = G.rgba(PAL.rose, Math.min(1, c.flash)); ctx.lineWidth = 2.5; ctx.beginPath(); ctx.ellipse(x, y - r * 1.5, r * 1.3, r * 2.1, 0, 0, 6.2832); ctx.stroke(); ctx.restore(); }
}
function drawCreatureBody(ctx, c, x, y, scale, t, opt) {
  opt = opt || {};
  const ph = c.ph, g = c.g, r = ph.r * scale * R.VIS;
  const id = c.id || 1;
  const breathe = 1 + 0.045 * Math.sin(t * 2.1 + id);
  const pop = c.birthT > 0 ? 1 - c.birthT * c.birthT : 1;
  const sq = c.squash || 0;
  const ang = c.ang || 0;
  const hue = ph.hue === undefined ? g.t[2] : ph.hue;
  const alpha = opt.alpha === undefined ? 1 : opt.alpha;
  if (alpha <= 0.02) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  const sc = breathe * (0.25 + 0.75 * pop) * (c.E !== undefined && c.E < c.ph.Emax * 0.15 ? 0.88 : 1);
  ctx.scale(sc * (1 + sq * 0.10), sc * (1 - sq * 0.09));
  ctx.globalAlpha = alpha * (c.E !== undefined && c.E < c.ph.Emax * 0.15 ? 0.7 : 1);

  // glow
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const hs = r * (1.8 + ph.reach);
  ctx.globalAlpha *= (0.06 + 0.3 * (c.eatFlash || 0) + 0.2 * (c.flash > 0 ? c.flash : 0) + 0.1 * (ph.charm || 0) + 0.2 * Math.min(1, ph.lamp)) * (opt.crowd || 1);
  ctx.drawImage(haloSprite(hue), -hs, -hs, hs * 2, hs * 2);
  ctx.restore();

  // the body, grown from its genes. In the pond it is drawn once and kept (hundreds wear the same picture cheaply);
  // up close (a card, the chosen creature) it is drawn live, so it swims and looks about.
  const f = g.f, S = ph.ds * scale * R.VIS;
  if (c.preview || opt.live || opt.rig) {
    // eyes follow what it is after; with nothing in sight they wander
    let lx = Math.cos(t * 0.7 + id) * 0.7, ly = Math.sin(t * 0.9 + id * 1.3) * 0.7;
    if (c.look) { const la = Math.atan2(c.lookY, c.lookX) - ang; lx = Math.cos(la); ly = Math.sin(la); }
    const alarm = c.inp ? Math.min(1, Math.max(Math.abs(c.inp[5]), Math.abs(c.inp[6])) * 1.6) : 0;
    const mo = { open: c.eatFlash || 0, lx: lx, ly: ly, swim: c.preview ? 0.35 : Math.min(1, sq / 1.1), alarm: alarm, sleep: !!c.asleep };
    ctx.save(); ctx.scale(S, S);
    if (c.preview || opt.live) G.form.draw(ctx, f, t + id * 0.37, mo); else G.form.drawRig(ctx, f, t + id * 0.37, mo);
    ctx.restore();
  } else {
    const sp = G.form.sprite(f), h = sp.all * S;
    ctx.rotate(Math.sin(t * (3 + 3 * sq) + id) * (0.045 + 0.09 * sq));        // a swimming wiggle
    ctx.drawImage(sp.cv, -h, -h, h * 2, h * 2);
  }
  // organs invented for this pond show as neat badges along its back
  for (let i = 0; (c === R.sel) && i < g.p.length && i < 3; i++) {      // shown on the creature you are looking at; the pond stays clean
    const o = G.organOf ? G.organOf(g.p[i].k) : null;
    if (!o) continue;
    const br = Math.max(2.5, r * 0.13 * Math.min(1.3, g.p[i].s)), ox = f.sym ? Math.cos(i * 1.57 + 0.8) * r * 0.42 : r * (0.2 - 0.48 * i), oy = f.sym ? Math.sin(i * 1.57 + 0.8) * r * 0.42 : 0;
    ctx.beginPath(); ctx.arc(ox, oy, br, 0, 6.2832); ctx.fillStyle = G.hsl(o.hue, 75, 64, 1); ctx.fill(); ctx.strokeStyle = PAL.deep; ctx.lineWidth = Math.max(1, br * 0.22); ctx.stroke();
    const im = thingImage(o); if (im && br > 5) ctx.drawImage(im, ox - br * 0.72, oy - br * 0.72, br * 1.44, br * 1.44);
  }
  // a rose flash on a mutated child
  if (c.flash > 0 && c.mutAge > 0) {
    ctx.strokeStyle = G.rgba(PAL.rose, Math.min(1, c.flash)); ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(0, 0, r * (0.9 + 0.5 * ph.reach), 0, 6.2832); ctx.stroke();
  }
  ctx.restore();
}
G.drawCreatureBody = drawCreatureBody;
// draw a creature so that all of it (parts included) fits in a circle of boxR pixels
G.drawFit = function (ctx, pv, x, y, boxR, t) {
  // on every card a creature is shown as its character: the AI's painting of that look if there is one, else the game's own drawing
  const pt = G.paintFor && !G.ai.drawn ? G.paintFor(pv.g) : null;
  if (pt) { const k = boxR * 1.9 / Math.max(pt.w, pt.h); ctx.drawImage(pt.cv, x - pt.w * k / 2, y - pt.h * k / 2, pt.w * k, pt.h * k); if (G.wantPaint) G.wantPaint(pv.g, ''); return; }
  if (G.wantPaint && G.mode === 'play') G.wantPaint(pv.g, '');
  const sc = boxR / 150;
  ctx.save(); ctx.translate(x, y + boxR * 0.06); ctx.scale(sc, sc);
  G.form.portrait(ctx, pv.g.f, (t === undefined ? G.rt : t) + (pv.id || 0) * 0.37, { sleep: !!pv.asleep });
  ctx.restore();
};

// a stand-alone creature for the inspector, the guide and the tree
G.preview = function (genome, id) {
  const ph = G.derive(genome);
  return { preview: true, g: genome, ph: ph, id: id || 7, ang: 0, squash: 0, glow: 0.7, look: 0, E: ph.Emax, eatFlash: 0, flash: 0, mutAge: 0, birthT: 0 };
};

function drawCreatures() {
  const W = G.W; if (!W) return;
  const ctx = G.ctx, t = G.rt, a = G.alpha === undefined ? 1 : G.alpha;
  beginWorld(ctx);
  const cre = W.cre.slice().sort(function (p, q) { return p.y - q.y; });      // back to front: the nearer ones stand in front
  const season = W.season;
  const showBars = season === 2 || (season === 3 && W.st < 3.5);
  const crowd = clamp01(130 / (cre.length + 1));
  const vw = G.view, vx0 = -vw.ox / vw.scale, vy0 = -vw.oy / vw.scale, vx1 = vx0 + vw.w / vw.scale, vy1 = vy0 + vw.h / vw.scale;
  const fdt = G.frameDt || 0.016;
  R.liveMax = G.clamp(R.liveMax === undefined ? 200 : R.liveMax + (fdt > 0.05 ? -6 : fdt < 0.03 ? 4 : 0), 40, 240);
  let liveLeft = Math.round(R.liveMax);
  // parents glow in Spring while their children are on their way
  for (let i = 0; i < cre.length; i++) {
    const c = cre[i];
    let x = c.px + (c.x - c.px) * a, y = c.py + (c.y - c.py) * a;
    c.rx = x; c.ry = y;
    let alpha = 1;
    if (c.doomed && season === 3) {
      const left = c.doomAt - W.st;
      alpha = left < 0.9 ? Math.max(0.15, left / 0.9) : 1;
    }
    if (c.birthT > 0) c.birthT = Math.max(0, c.birthT - 0.016 * 1.6 * (G.speed > 1 ? 4 : 1));
    // gold ring on parents
    if (c.parentFlag && season === 0 && W.births.length) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = G.rgba(PAL.gold, 0.35 + 0.25 * Math.sin(t * 5 + c.id));
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x, y, c.ph.r * 1.55 + 2 * Math.sin(t * 4), 0, 6.2832); ctx.stroke();
      ctx.restore();
    }
    // the best of the generation wears a soft crown glow
    if (c.best && (season === 2 || season === 3)) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const rg = ctx.createRadialGradient(x, y, c.ph.r * 0.6, x, y, c.ph.r * 3);
      rg.addColorStop(0, G.rgba(PAL.gold, 0.45 + 0.15 * Math.sin(t * 3))); rg.addColorStop(1, G.rgba(PAL.gold, 0));
      ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(x, y, c.ph.r * 3, 0, 6.2832); ctx.fill();
      ctx.restore();
    }
    // zone damage tint
    c.crowd = crowd;
    // what is on the screen is drawn alive, part by part; if the frame gets heavy, the furthest down the list wear a still picture
    const ext = c.ph.r * R.VIS * 4.6 + 10;
    if (x + ext < vx0 || x - ext > vx1 || y + ext < vy0 || y - ext > vy1) continue;
    drawCharacter(ctx, c, x, y, 1, t, { alpha: alpha, crowd: crowd, live: c === R.sel });
    if (false) { ctx.fillStyle = G.rgba(PAL.frost, 0.55 + 0.3 * Math.sin(t * 2 + c.id)); ctx.font = '700 ' + Math.round(9 + c.ph.r * 0.5) + 'px system-ui'; ctx.fillText('z', x + c.ph.r * 0.9, y - c.ph.r * 1.1 - 3 * Math.sin(t * 1.5 + c.id)); }
    if (c.strike > 0) {
      c.strike -= 0.03;
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = G.rgba(PAL.gold, Math.max(0, c.strike)); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, c.ph.r * 1.5, 0, 6.2832); ctx.stroke(); ctx.restore();
    }
    if (c.doomed && season === 3) {
      ctx.save();
      ctx.strokeStyle = G.rgba(PAL.frost, 0.6 * alpha); ctx.setLineDash([3, 4]); ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(x, y, c.ph.r * 1.45, 0, 6.2832); ctx.stroke();
      ctx.restore();
    }
    if (c.colony) {
      ctx.save(); ctx.strokeStyle = G.rgba(PAL.rose, 0.16); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(x, y, c.ph.r * 1.3, 0, 6.2832); ctx.stroke(); ctx.restore();
    }
  }
  // energy bars: the score
  if (showBars) {
    for (let i = 0; i < cre.length; i++) {
      const c = cre[i];
      const f = clamp01(c.E / c.ph.Emax);
      const w = Math.max(14, c.ph.r * 2.2), x = c.rx - w / 2, y = c.ry - c.ph.r * R.VIS * 3.75 - 8;
      ctx.fillStyle = G.rgba(PAL.deep, 0.65); roundRect(ctx, x - 1, y - 1, w + 2, 6, 3); ctx.fill();
      ctx.fillStyle = f > 0.6 ? PAL.algae : f > 0.3 ? PAL.gold : PAL.rose;
      roundRect(ctx, x, y, Math.max(2, w * f), 4, 2); ctx.fill();
    }
  }
  if (R.ping) {
    const p = R.ping, c = p.c;
    p.t += G.frameDt || 0.016;
    if (p.t > 4 || c.dead) R.ping = null;
    else {
      const x = c.rx === undefined ? c.x : c.rx, y = c.ry === undefined ? c.y : c.ry, base = c.ph.r * (1.2 + 0.8 * c.ph.reach);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let q = 0; q < 3; q++) {
        const u = ((p.t * 0.9 + q / 3) % 1);                       // each ring shrinks onto the creature
        ctx.strokeStyle = G.rgba(PAL.gold, 0.85 * u * Math.min(1, 4 - p.t)); ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(x, y, base + (1 - u) * 110, 0, 6.2832); ctx.stroke();
      }
      const bob = Math.sin(p.t * 7) * 6, ay = y - base - 26 + bob;
      ctx.fillStyle = G.rgba(PAL.gold, Math.min(1, 4 - p.t));
      ctx.beginPath(); ctx.moveTo(x, ay + 14); ctx.lineTo(x - 11, ay - 6); ctx.lineTo(x + 11, ay - 6); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
  }
  // selection ring
  const s = R.sel;
  if (s && !s.dead) {
    ctx.save();
    ctx.strokeStyle = G.rgba(PAL.frost, 0.8); ctx.lineWidth = 2; ctx.setLineDash([6, 5]); ctx.lineDashOffset = -t * 20;
    { const rr = s.ph.r * R.VIS; ctx.beginPath(); ctx.arc(s.rx || s.x, (s.ry || s.y) - rr * 1.25, rr * 2.1 + 2 * Math.sin(t * 4), 0, 6.2832); ctx.stroke(); }
    ctx.restore();
  }
}
// species by id, looked up through a small map that is rebuilt when the list changes
let spMapFor = null, spMapN = -1, spMap = {};
function spOf(W, id) {
  if (spMapFor !== W || spMapN !== W.species.length) { spMap = {}; for (let i = 0; i < W.species.length; i++) spMap[W.species[i].id] = W.species[i]; spMapFor = W; spMapN = W.species.length; }
  return spMap[id] || null;
}
function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.arc(x + w - r, y + r, r, -1.5708, 0); ctx.lineTo(x + w, y + h - r); ctx.arc(x + w - r, y + h - r, r, 0, 1.5708);
  ctx.lineTo(x + r, y + h); ctx.arc(x + r, y + h - r, r, 1.5708, 3.1416); ctx.lineTo(x, y + r); ctx.arc(x + r, y + r, r, 3.1416, 4.7124); ctx.closePath();
}
G.roundRect = roundRect;

// ── layer 8: effects ──
function drawEffects() {
  const ctx = G.ctx, t = G.rt;
  beginWorld(ctx);
  const dt = G.frameDt || 0.016;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const L = R.fx;
  for (let i = L.length - 1; i >= 0; i--) {
    const e = L[i];
    e.t += dt;
    if (e.t >= e.life) { L[i] = L[L.length - 1]; L.pop(); continue; }
    const u = e.t / e.life;
    if (e.k === 'ring') {
      ctx.strokeStyle = e.col; ctx.globalAlpha = (1 - u) * 0.8; ctx.lineWidth = 2.5 * (1 - u) + 0.5;
      ctx.beginPath(); ctx.arc(e.x, e.y, e.r1 * (0.2 + 0.8 * Math.sqrt(u)), 0, 6.2832); ctx.stroke();
    } else if (e.k === 'spark') {
      e.x += e.vx * dt; e.y += e.vy * dt; e.vx *= 0.96; e.vy *= 0.96;
      ctx.globalAlpha = (1 - u); ctx.fillStyle = e.col;
      ctx.beginPath(); ctx.arc(e.x, e.y, e.s * (1 - u * 0.5), 0, 6.2832); ctx.fill();
    } else if (e.k === 'mote') {
      e.x += e.vx * dt; e.y += e.vy * dt;
      ctx.globalAlpha = (1 - u) * 0.8; ctx.fillStyle = G.hsl(e.hue, 80, 75, 1);
      ctx.beginPath(); ctx.arc(e.x, e.y, e.s * (1 - u * 0.4), 0, 6.2832); ctx.fill();
    } else if (e.k === 'puff') {
      ctx.globalAlpha = (1 - u) * 0.7; ctx.fillStyle = e.col;
      ctx.beginPath(); ctx.arc(e.x, e.y, 3 + u * 9, 0, 6.2832); ctx.fill();
    } else if (e.k === 'heart') {
      const yy = e.y - u * 22, s = 5 + 3 * Math.sin(u * 3.14);
      ctx.globalAlpha = (1 - u) * 0.9; ctx.fillStyle = PAL.rose;
      ctx.beginPath(); ctx.moveTo(e.x, yy + s); ctx.bezierCurveTo(e.x - s * 1.6, yy - s * 0.4, e.x - s * 0.5, yy - s * 1.4, e.x, yy - s * 0.4); ctx.bezierCurveTo(e.x + s * 0.5, yy - s * 1.4, e.x + s * 1.6, yy - s * 0.4, e.x, yy + s); ctx.fill();
    } else if (e.k === 'link') {
      const c = e.c;
      if (c && !c.dead && Math.abs(c.x - e.x) < 160 && Math.abs(c.y - e.y) < 160) {
        ctx.globalAlpha = (1 - u) * 0.55; ctx.strokeStyle = e.col; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.lineTo((c.rx === undefined ? c.x : c.rx), (c.ry === undefined ? c.y : c.ry)); ctx.stroke();
      }
    }
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}

// ── layer 10: the season washes the water; a flash for disasters ──
// the weather of the world, drawn: cold frosts the water, heat reddens it, darkness falls, and events fill it with their own particles
const AMB = { cold: 0, hot: 0, dark: 0, fx: '', fxA: 0, hue: 200 };
function ambParticles(ctx, v, kind, alpha, hue, t) {
  const n = kind === 'rain' ? 70 : kind === 'stars' ? 60 : 46;
  ctx.save();
  for (let i = 0; i < n; i++) {
    const a = (i * 0.618034) % 1, b = (i * 0.754877) % 1;
    let x, y, s = 1.4 + (i % 4) * 0.6;
    if (kind === 'snow') { x = (a + Math.sin(t * 0.5 + i) * 0.012) * v.w; y = ((b + t * (0.022 + (i % 5) * 0.004)) % 1) * v.h; ctx.fillStyle = 'rgba(240,248,255,' + (0.75 * alpha) + ')'; }
    else if (kind === 'bubbles' || kind === 'embers') { x = (a + Math.sin(t * 0.8 + i) * 0.01) * v.w; y = (1 - ((b + t * (0.03 + (i % 5) * 0.006)) % 1)) * v.h; ctx.fillStyle = kind === 'embers' ? 'rgba(255,' + (140 + (i % 5) * 20) + ',70,' + (0.8 * alpha) + ')' : G.hsl(hue, 80, 80, 0.45 * alpha); if (kind === 'bubbles') s *= 1.6; }
    else if (kind === 'rain') { x = ((a + t * 0.05) % 1) * v.w; y = ((b + t * (0.5 + (i % 4) * 0.08)) % 1) * v.h; ctx.strokeStyle = 'rgba(207,232,255,' + (0.4 * alpha) + ')'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 5, y + 16); ctx.stroke(); continue; }
    else if (kind === 'spores') { x = ((a + Math.sin(t * 0.2 + i) * 0.02 + t * 0.006) % 1) * v.w; y = ((b + Math.cos(t * 0.17 + i * 2) * 0.02) % 1) * v.h; ctx.fillStyle = G.hsl(hue, 85, 70, 0.6 * alpha); }
    else { x = a * v.w; y = b * v.h; ctx.fillStyle = G.hsl(hue, 90, 85, (0.35 + 0.5 * Math.abs(Math.sin(t * 1.5 + i))) * alpha); s *= 0.9; }
    ctx.beginPath(); ctx.arc(x, y, s, 0, 6.2832); ctx.fill();
  }
  ctx.restore();
}
function drawAmbient(ctx, v, dt) {
  const W = G.W;
  let cold = 0, hot = 0, dark = 0, fx = '', hue = 200, pois = 0;
  if (W && W.mods && !W.title) {
    const temp = W.set.temp + (W.mods.length ? G.modSum('temp') : 0);
    const light = W.set.light * (W.mods.length ? Math.max(0.1, 1 + G.modSum('light')) : 1);
    pois = clamp01(W.mods.length ? G.modSum('poison') : 0);
    cold = clamp01((-temp - 0.2) / 0.7); hot = clamp01((temp - 0.2) / 0.7); dark = clamp01((0.8 - light) / 0.65);
    for (let i = W.mods.length - 1; i >= 0; i--) if (W.mods[i].fx) { fx = W.mods[i].fx; hue = W.mods[i].hue || 200; break; }
    if (!fx) fx = cold > 0.35 ? 'snow' : hot > 0.35 ? 'embers' : '';
  }
  const k = Math.min(1, dt * 1.2);
  AMB.pois = (AMB.pois || 0) + (pois - (AMB.pois || 0)) * k;
  if (AMB.pois > 0.02) {
    // sick green water, thickest at the edges
    ctx.fillStyle = 'rgba(120,190,40,' + (0.2 * AMB.pois).toFixed(3) + ')'; ctx.fillRect(0, 0, v.w, v.h);
    const pg = ctx.createRadialGradient(v.w / 2, v.h / 2, Math.min(v.w, v.h) * 0.25, v.w / 2, v.h / 2, Math.max(v.w, v.h) * 0.75);
    pg.addColorStop(0, 'rgba(90,40,130,0)'); pg.addColorStop(1, 'rgba(90,40,130,' + (0.4 * AMB.pois).toFixed(3) + ')');
    ctx.fillStyle = pg; ctx.fillRect(0, 0, v.w, v.h);
  }
  AMB.cold += (cold - AMB.cold) * k; AMB.hot += (hot - AMB.hot) * k; AMB.dark += (dark - AMB.dark) * k;
  if (fx) { AMB.fx = fx; AMB.hue = hue; }
  AMB.fxA += ((fx ? 1 : 0) - AMB.fxA) * k;
  if (AMB.dark > 0.02) { ctx.fillStyle = G.rgba(PAL.deep, 0.5 * AMB.dark); ctx.fillRect(0, 0, v.w, v.h); }
  if (AMB.hot > 0.02) { ctx.fillStyle = 'rgba(255,110,60,' + (0.16 * AMB.hot).toFixed(3) + ')'; ctx.fillRect(0, 0, v.w, v.h); }
  if (AMB.cold > 0.02) {
    ctx.fillStyle = 'rgba(200,230,255,' + (0.16 * AMB.cold).toFixed(3) + ')'; ctx.fillRect(0, 0, v.w, v.h);
    // frost creeping in from the edges
    const g = ctx.createRadialGradient(v.w / 2, v.h / 2, Math.min(v.w, v.h) * 0.3, v.w / 2, v.h / 2, Math.max(v.w, v.h) * 0.72);
    g.addColorStop(0, 'rgba(235,246,255,0)'); g.addColorStop(1, 'rgba(235,246,255,' + (0.5 * AMB.cold).toFixed(3) + ')');
    ctx.fillStyle = g; ctx.fillRect(0, 0, v.w, v.h);
  }
  if (AMB.fxA > 0.03 && AMB.fx) ambParticles(ctx, v, AMB.fx, AMB.fxA, AMB.hue, G.rt);
}
function drawSeasonTint() {
  const ctx = G.ctx, v = G.view, dt = G.frameDt || 0.016;
  screenSpace(ctx);
  drawAmbient(ctx, v, dt);
  const a = R.tint, b = R.tintTo, k = Math.min(1, dt * 0.9);
  for (let i = 0; i < 4; i++) a[i] += (b[i] - a[i]) * k;
  ctx.fillStyle = 'rgba(' + (a[0] | 0) + ',' + (a[1] | 0) + ',' + (a[2] | 0) + ',' + a[3].toFixed(3) + ')';
  ctx.fillRect(0, 0, v.w, v.h);
  if (R.flash > 0.01) {
    ctx.globalAlpha = R.flash * 0.35; ctx.fillStyle = R.flashCol; ctx.fillRect(0, 0, v.w, v.h); ctx.globalAlpha = 1;
    R.flash *= 0.9;
  }
  if (R.shake > 0.01) R.shake *= 0.92; else R.shake = 0;
  // the pond goes quiet when everything has died
  if (G.W && G.W.extinct) {
    R.ext = Math.min(1, R.ext + dt * 0.4);
    ctx.fillStyle = G.rgba(PAL.deep, 0.5 * R.ext); ctx.fillRect(0, 0, v.w, v.h);
  } else R.ext = 0;
}
function drawVignette() {
  const ctx = G.ctx, v = G.view;
  screenSpace(ctx);
  const g = ctx.createRadialGradient(v.w / 2, v.h / 2, Math.min(v.w, v.h) * 0.42, v.w / 2, v.h / 2, Math.max(v.w, v.h) * 0.75);
  g.addColorStop(0, 'rgba(7,18,31,0)'); g.addColorStop(1, 'rgba(7,18,31,0.72)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, v.w, v.h);
}

G.addSystem({
  name: 'render',
  init: initRender,
  draw: function (dt) {
    G.frameDt = dt;
    const ctx = G.ctx; if (!ctx) return;
    drawWaterDepth();
    drawCaustics();
    drawDustFar();
    drawShore();
    drawHazardWashes();
    drawFood();
    drawAddedThings();
    drawCreatures();
    drawThingCaptions();
    drawEffects();
    drawDustNear();
    drawSeasonTint();
    drawVignette();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  },
});
