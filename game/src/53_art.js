// ── The look of a star, as an image model imagined it ──
// Nothing here is drawn beforehand. When a star first needs it, the server is asked for a PAINTING made from what that star and its people are:
//     its GROUND         from the kind of star it is (a square seen from straight above; 52c_terrain.js lays it over the whole star)
//     its ARCHITECTURE   from the bodies of the people who live there: what kind they are, what they have (horns, fins, shells, eyes),
//                        their colours, their world. Two sheets of six buildings each: 'civic' (the Heart at its four stages, a house,
//                        a hall) and 'works' (a farm, a defence tower, a ring wall, a beacon tower, a spaceport, a spaceship)
// A painting is kept for good by the server, so the same star looks the same every time and nobody pays for one twice; what it cost is
// written in the books like every other answer (kind 'art'). With no AI to ask, the server sends the nearest thing painted before; with
// nothing painted at all, the game draws its buildings and its ground itself (54h_look.js, 52c_terrain.js), as it always could.
// What is done HERE, by code, to what comes back:
//     a sheet is LIFTED off its flat green ground and cut into its six buildings;
//     the parts painted flat magenta are REPAINTED in the colour of whoever owns the building (yours blue, an enemy's red, others pale);
//     each building gets a grey copy (set but not yet coloured), a shadow, and the line it stands on (the middle of its foundation).
(function () {
  'use strict';
  if (typeof document === 'undefined') return;
  const A = G.art = { n: 0 };
  const GROUND = {}, SHEET = {}, ST = {};      // what has come, and what has been asked for, by the name the server keeps it under
  const mk = function (w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  const norm = function (s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 60); };
  const CIVIC = { heart0: 1, heart1: 1, heart2: 1, heart3: 1, house: 1, hall: 1 };
  /** the colour each owner's parts are repainted in */
  A.TEAM = { mine: [38, 150, 255], foe: [255, 52, 70], other: [226, 230, 236] };
  // (the budget of a star for its look: its ground and two sheets come to about six cents)
  if (G.ai) { G.ai.gaps.art = 2500; G.ai.caps.art = 14; if (G.ai.LABEL) G.ai.LABEL.art = 'The look of the star: its ground and its people’s buildings, painted'; if (G.ai.budget) G.ai.budget.art = 0.30; }

  function ask(key, info, done) {
    const s = ST[key], now = Date.now();
    if (s && (s.v === 'asked' || (s.v === 'have' && !(s.near && G.host && G.host.caps && G.host.caps.ai && now - s.at > 25000)) || (s.v === 'miss' && now - s.at < 90000))) return;
    if (!(G.host && G.host.ready)) return;
    const pay = !!(G.host.caps && G.host.caps.ai && G.ai.provider === 'server' && G.ai.hasFuel() && G.ai.allow('art'));
    if (s && s.v === 'have' && !pay) { s.at = now; return; }      // (it has the nearest thing; its own will be asked for when a new picture may be paid for)
    ST[key] = { v: 'asked', at: now };
    G.host.call('art', Object.assign({ libraryOnly: !pay }, info), 240000).then(function (r) {
      if (!r || !r.art || typeof r.art.b64 !== 'string' || !/^image\/(png|jpeg|webp)$/.test(r.art.mime)) { ST[key] = { v: s && s.v === 'have' ? 'have' : 'miss', at: Date.now(), near: s && s.near }; return; }
      if (G.ai && G.ai.tally) G.ai.tally('art', r.source, r.usd);
      const img = new Image();
      img.onload = function () { try { done(img, r); ST[key] = { v: 'have', at: Date.now(), near: !!r.near }; A.n++; G.emit('art', key, r.source, !!r.near); } catch (e) { console.error(e); ST[key] = { v: 'miss', at: Date.now() }; } };
      img.onerror = function () { ST[key] = { v: 'miss', at: Date.now() }; };
      img.src = 'data:' + r.art.mime + ';base64,' + r.art.b64;
    }, function () { ST[key] = { v: s && s.v === 'have' ? 'have' : 'miss', at: Date.now(), near: s && s.near }; });
  }

  // ── the ground ──
  function groundOf(img) {
    const n = 1024, cv = mk(n, n), x = cv.getContext('2d', { willReadFrequently: true }); x.drawImage(img, 0, 0, n, n);
    const d = x.getImageData(0, 0, n, n).data; let r = 0, g = 0, b = 0; for (let i = 0; i < d.length; i += 4 * 97) { r += d[i]; g += d[i + 1]; b += d[i + 2]; } const m = d.length / (4 * 97);
    // the painting, four times: itself and its three mirrors, so that laid side by side its edges always meet themselves
    const t = mk(n * 2, n * 2), tx = t.getContext('2d'); [[0, 0, 1, 1], [2 * n, 0, -1, 1], [0, 2 * n, 1, -1], [2 * n, 2 * n, -1, -1]].forEach(function (q) { tx.save(); tx.translate(q[0], q[1]); tx.scale(q[2], q[3]); tx.drawImage(cv, 0, 0); tx.restore(); });
    return { n: n, d: d, mean: [r / m, g / m, b / m], tile: t };
  }
  /** the painted ground of this star: { n, d (its pixels), mean (its colour) }, or null until it has come (it is asked for once) */
  A.ground = function (W) {
    W = W || G.W; if (!W || W.title || !G.terrainOf) return null;
    const id = G.terrainOf(W).id, v = ((W.seed >>> 0) >>> 5) % 2, key = 'ground.' + id + '.' + v;
    if (!GROUND[key] || (ST[key] && ST[key].near)) ask(key, { what: 'ground', terrain: id, variant: v }, function (img) { GROUND[key] = groundOf(img); });
    return GROUND[key] || null;
  };

  // ── the people, and their buildings ──
  /** the people whose way of building this star follows: decided once, the first time the star builds, and kept with the star */
  A.people = function (W) {
    W = W || G.W; if (!W || W.title) return null; if (W.arch && W.arch.kind) return W.arch;
    const L = (W.species || []).filter(function (s) { return !s.extinct && s.rep && s.rep.f && s.n > 0; }).sort(function (a, b) { return b.n - a.n; }); if (!L.length || !G.form || !G.form.facts) return null;
    const f = L[0].rep.f; let facts = [], kind = ''; try { facts = G.form.facts(f); kind = G.form.kind(f).full; } catch (e) { return null; } if (!kind) return null;
    W.arch = { kind: String(kind).slice(0, 40), facts: facts.slice(0, -1).slice(0, 8), colours: String(facts[facts.length - 1] || '').slice(0, 60), gen: W.gen | 0 };
    if (G.log) G.log('disc', 'A way of building', 'The buildings of this star follow the ' + W.arch.kind + ', who founded its colony.'); if (G.markDirty) G.markDirty();
    return W.arch;
  };
  /** lift a sheet off its green ground and cut it into its buildings: { name: sprite } */
  function cut(img, cells, key) {
    const w = img.naturalWidth || img.width, h = img.naturalHeight || img.height, cv = mk(w, h), x = cv.getContext('2d', { willReadFrequently: true }); x.drawImage(img, 0, 0);
    const im = x.getImageData(0, 0, w, h), d = im.data, N = w * h, bg = new Uint8Array(N), st = [];
    const mag = key === 'magenta';      // (things that may themselves be green stand on flat magenta instead)
    const green = mag ? function (i) { const o = i * 4, r = d[o], g = d[o + 1], b = d[o + 2]; return r > 150 && b > 150 && g < 120 && (r < b ? r : b) - g > 70; } : function (i) { const o = i * 4, r = d[o], g = d[o + 1], b = d[o + 2]; return g > 150 && r < 130 && b < 130 && g - (r > b ? r : b) > 80; };
    for (let i = 0; i < w; i++) st.push(i, (h - 1) * w + i); for (let j = 0; j < h; j++) st.push(j * w, j * w + w - 1);
    while (st.length) { const i = st.pop(); if (bg[i] || !green(i)) continue; bg[i] = 1; const px = i % w; if (px > 0) st.push(i - 1); if (px < w - 1) st.push(i + 1); if (i >= w) st.push(i - w); if (i < N - w) st.push(i + w); }
    for (let i = 0; i < N; i++) if (!bg[i]) { const o = i * 4; if (mag ? (d[o] > 205 && d[o + 2] > 205 && d[o + 1] < 80) : (d[o + 1] > 200 && d[o] < 90 && d[o + 2] < 90)) bg[i] = 1; }      // (green shut in by a building, a courtyard or the gap under an arch, goes too if it is as pure as the ground)
    // what is left, piece by piece
    const lab = new Int32Array(N), B = [null];
    for (let s0 = 0; s0 < N; s0++) { if (bg[s0] || lab[s0]) continue; const id = B.length, b = { n: 0, x0: w, x1: 0, y0: h, y1: 0, sx: 0, sy: 0 }; lab[s0] = id; st.push(s0);
      while (st.length) { const i = st.pop(), px = i % w, py = (i / w) | 0; b.n++; b.sx += px; b.sy += py; if (px < b.x0) b.x0 = px; if (px > b.x1) b.x1 = px; if (py < b.y0) b.y0 = py; if (py > b.y1) b.y1 = py;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { if (!dx && !dy) continue; const qx = px + dx, qy = py + dy; if (qx < 0 || qy < 0 || qx >= w || qy >= h) continue; const j = qy * w + qx; if (!bg[j] && !lab[j]) { lab[j] = id; st.push(j); } } }
      B.push(b); }
    // each big piece is the building of the cell its middle lies in; small loose bits (a lamp's head, a spark) go with the building nearest them; specks go
    const cellOf = new Int8Array(B.length).fill(-1), big = [];
    for (let i = 1; i < B.length; i++) { const b = B[i]; if (b.n > N * 0.004) { cellOf[i] = Math.min(2, Math.floor(b.sx / b.n / (w / 3))) + (b.sy / b.n < h / 2 ? 0 : 3); big.push(i); } }
    for (let i = 1; i < B.length; i++) { const b = B[i]; if (cellOf[i] >= 0 || b.n < 26) continue; const cx = b.sx / b.n, cy = b.sy / b.n; let bd = 60 * 60, at = -1;
      for (let q = 0; q < big.length; q++) { const g = B[big[q]], ddx = Math.max(g.x0 - cx, 0, cx - g.x1), ddy = Math.max(g.y0 - cy, 0, cy - g.y1), dd = ddx * ddx + ddy * ddy; if (dd < bd) { bd = dd; at = cellOf[big[q]]; } } cellOf[i] = at; }
    // its rim: soft, and with no green in it
    for (let i = 0; i < N; i++) { if (bg[i]) continue; const o = i * 4, px = i % w, py = (i / w) | 0, m = d[o] > d[o + 2] ? d[o] : d[o + 2];
      const e1 = (px > 0 && bg[i - 1]) || (px < w - 1 && bg[i + 1]) || (py > 0 && bg[i - w]) || (py < h - 1 && bg[i + w]);
      if (mag) { if (e1) { const sp = (d[o] < d[o + 2] ? d[o] : d[o + 2]) - d[o + 1]; if (sp > 0) { d[o] -= sp * 0.85; d[o + 2] -= sp * 0.85; } d[o + 3] = 150; } continue; }
      if (e1) { if (d[o + 1] > m) d[o + 1] = m; d[o + 3] = 150; }
      else if (d[o + 1] > m + 30 && ((px > 1 && bg[i - 2]) || (px < w - 2 && bg[i + 2]) || (py > 1 && bg[i - 2 * w]) || (py < h - 2 && bg[i + 2 * w]))) d[o + 1] = m + 10; }
    const out = {};
    for (let c = 0; c < 6; c++) { let x0 = w, x1 = 0, y0 = h, y1 = 0, any = false; for (let i = 1; i < B.length; i++) if (cellOf[i] === c) { const b = B[i]; any = true; if (b.x0 < x0) x0 = b.x0; if (b.x1 > x1) x1 = b.x1; if (b.y0 < y0) y0 = b.y0; if (b.y1 > y1) y1 = b.y1; }
      if (!any || x1 - x0 < 30 || y1 - y0 < 30) continue;
      const sw = x1 - x0 + 1, sh = y1 - y0 + 1, sc = mk(sw, sh), sx = sc.getContext('2d'), si = sx.createImageData(sw, sh), sd = si.data, ext = new Int32Array(sh), mid = new Float32Array(sh);
      for (let yy = 0; yy < sh; yy++) { let a = -1, bq = -1; for (let xx = 0; xx < sw; xx++) { const i = (y0 + yy) * w + x0 + xx; if (bg[i] || cellOf[lab[i]] !== c) continue; const o = i * 4, p = (yy * sw + xx) * 4; sd[p] = d[o]; sd[p + 1] = d[o + 1]; sd[p + 2] = d[o + 2]; sd[p + 3] = d[o + 3]; if (a < 0) a = xx; bq = xx; } ext[yy] = a < 0 ? 0 : bq - a + 1; mid[yy] = a < 0 ? sw / 2 : (a + bq) / 2; }
      sx.putImageData(si, 0, 0);
      // the line it stands on: the middle of its foundation, which is the first of the widest rows of its lower part
      let wm = 0; const from = Math.floor(sh * 0.5); for (let yy = from; yy < sh; yy++) if (ext[yy] > wm) wm = ext[yy]; let ay = Math.floor(sh * 0.8); for (let yy = from; yy < sh; yy++) if (ext[yy] >= wm * 0.985) { ay = yy; break; }
      const nm = cells[c] || ('cell' + c);
      out[nm] = { cv: sc, w: sw, h: sh, ax: nm === 'port' ? sw * 0.4 : mid[ay], ay: ay, t: {}, px: sd }; }      /* (a spaceport stands on the middle of its PAD, which is the left of its picture: a ship comes down there) */
    return out;
  }
  /** the building `name` (heart0..3, house, hall, huts, tower, wall, spire, port, ship) as this star's people build it, or null until it has come */
  A.sprite = function (W, name) {
    W = W || G.W; const pe = A.people(W); if (!pe || !G.terrainOf) return null;
    const part = CIVIC[name] ? 'civic' : 'works', id = G.terrainOf(W).id, key = part + '.' + id + '.' + norm(pe.kind);
    if (!SHEET[key] || (ST[key] && ST[key].near)) ask(key, { what: part, terrain: id, people: { kind: pe.kind, facts: pe.facts, colours: pe.colours } }, function (img, r) { SHEET[key] = cut(img, (r.art && r.art.cells) || []); });
    const s = SHEET[key]; return s ? s[name] || null : null;
  };
  /** what grows and lies on this kind of star, painted (lumen, quarry, reeds, shells, plant, rock), or null until it has come */
  A.nature = function (W, name) {
    W = W || G.W; if (!W || W.title || !G.terrainOf) return null; const id = G.terrainOf(W).id, key = 'nature.' + id + '.0';
    if (!SHEET[key] || (ST[key] && ST[key].near)) ask(key, { what: 'nature', terrain: id }, function (img, r) { SHEET[key] = cut(img, (r.art && r.art.cells) || [], (r.art && r.art.bg) || 'magenta'); });
    const s = SHEET[key]; return s ? s[name] || null : null;
  };
  /** the painted ground of a kind of star, if one is in hand (nothing is asked for): its picture four times, mirrored (for a star seen from space) */
  A.groundTile = function (id) { for (const k in GROUND) if (k.indexOf('ground.' + id + '.') === 0) return GROUND[k].tile; return null; };
  /** a ship in flight: the painting of this star's ship without the stand it was built on, drawn upright with its middle at 0, 0 and `size` tall: true if it could */
  A.shipFlying = function (ctx, W, team, size) { const s = A.sprite(W, 'ship'); if (!s) return false; const cutY = Math.max(10, Math.round(s.ay - s.w * 0.1)), k = size / cutY; ctx.imageSmoothingEnabled = true; ctx.drawImage(A.tinted(s, team), 0, 0, s.w, cutY, -s.ax * k, -size / 2, s.w * k, size); return true; };
  /** is a painting of this star's buildings there (or on its way)? */
  A.on = function (W) { W = W || G.W; const pe = W && W.arch; if (!pe || !G.terrainOf) return false; const id = G.terrainOf(W).id; return !!SHEET['civic.' + id + '.' + norm(pe.kind)]; };

  /** the building in its owner's colour: what was painted magenta is repainted ('mine', 'foe', 'other') */
  A.tinted = function (s, team) {
    if (s.t[team]) return s.t[team]; const T = A.TEAM[team] || A.TEAM.other, c = mk(s.w, s.h), x = c.getContext('2d'), im = x.createImageData(s.w, s.h), o = im.data, d = s.px, tr = T[0] / 255, tg = T[1] / 255, tb = T[2] / 255;
    for (let i = 0; i < d.length; i += 4) { const r = d[i], g = d[i + 1], b = d[i + 2]; o[i + 3] = d[i + 3]; if (!d[i + 3]) continue;
      const lo = r < b ? r : b, hi = r > b ? r : b;
      if (lo > 70 && g < lo * 0.68 && hi - lo < hi * 0.42) { const m = (r + b) / 2, k = m - g; o[i] = g + k * tr; o[i + 1] = g + k * tg; o[i + 2] = g + k * tb; }      // (magenta = white + pure magenta: the white is kept, the magenta becomes the owner's colour)
      else { o[i] = r; o[i + 1] = g; o[i + 2] = b; } }
    x.putImageData(im, 0, 0); return (s.t[team] = c);
  };
  /** the same building set but not yet coloured: grey */
  A.grey = function (s) {
    if (s.g) return s.g; const c = mk(s.w, s.h), x = c.getContext('2d'), im = x.createImageData(s.w, s.h), o = im.data, d = s.px;
    for (let i = 0; i < d.length; i += 4) { const l = d[i] * 0.3 + d[i + 1] * 0.52 + d[i + 2] * 0.18, v = l * 0.82 + 22; o[i] = v + (d[i] - l) * 0.1; o[i + 1] = v + (d[i + 1] - l) * 0.1; o[i + 2] = v + (d[i + 2] - l) * 0.1 + 6; o[i + 3] = d[i + 3]; }
    x.putImageData(im, 0, 0); return (s.g = c);
  };
  /** its outline filled with one colour (its shadow in black; the plan of what is still to be built in its owner's colour) */
  A.flat = function (s, rgb) {
    const k = rgb.join(','); s.f = s.f || {}; if (s.f[k]) return s.f[k]; const pad = 8, c = mk(s.w + pad * 2, s.h + pad * 2), x = c.getContext('2d');
    try { x.filter = 'blur(2.2px)'; } catch (e) { /* no blur: a hard edge */ } x.drawImage(s.cv, pad, pad); x.filter = 'none'; x.globalCompositeOperation = 'source-in'; x.fillStyle = 'rgb(' + k + ')'; x.fillRect(0, 0, c.width, c.height);
    c.pad = pad; return (s.f[k] = c);
  };
  /** how wide each building stands on the star (its picture is fitted to this) */
  A.WIDTH = { heart0: 150, heart1: 190, heart2: 246, heart3: 300, house: 124, hall: 214, huts: 200, tower: 112, wall: 230, spire: 108, port: 290, ship: 112 };
  /** draw a building of this star at a point of the star (x, y: the middle of its foundation), in its owner's colour: true if it could */
  A.draw = function (ctx, W, name, team, x, y, alpha) {
    const s = A.sprite(W, name); if (!s) return false; const k = (A.WIDTH[name] || 150) / s.w;
    ctx.save(); if (alpha !== undefined) ctx.globalAlpha *= alpha; ctx.imageSmoothingEnabled = true; ctx.drawImage(A.tinted(s, team), x - s.ax * k, y - s.ay * k, s.w * k, s.h * k); ctx.restore(); return true;
  };
  G.on('new-pond', function () { for (const k in ST) if (ST[k].v === 'miss') delete ST[k]; });
})();
