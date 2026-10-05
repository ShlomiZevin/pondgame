// ── Painted by the AI: what each kind of creature looks like ──
// The genes decide what a creature IS: its build, what grows on it, its coat, its colours, what its world has done to it.
// The AI then PAINTS that kind, once, from those facts. Nobody can predict the painting; the same facts never have to be
// paid for twice (the server keeps every painting in its library, for every player). Until a kind is painted, and whenever
// there is no server, the game draws it itself from the same genes.
// It is asked by the clock and within a budget, never once per generation; each painting's cost is counted with the rest.
(function () {
  'use strict';
  const F = G.form;
  G.paints = {};            // look → { cv, w, h } when ready, or { asked } / { miss: time }
  let busy = false;

  /** the look of a body, as far as a painting can tell bodies apart: its build, what grows on it, its coat, pattern and colours */
  G.paintSig = function (g) {
    const f = g.f, set = {};
    for (let i = 0; i < f.rules.length; i++) { const q = f.rules[i]; if (q.k === 8) { const d = G.designOf ? G.designOf(q.t) : null; if (d) set[d.name.toLowerCase().replace(/[^a-z]/g, '')] = 1; } else set[F.KINDS[q.k] + (q.k === 0 && q.t ? q.t : '')] = 1; }
    const hb = function (h) { return Math.floor((((h % 360) + 360) % 360) / 30); };
    return [F.build(f), f.n >= 7 ? 'L' : f.n >= 4 ? 'M' : 'S', Object.keys(set).sort().join('-'), 'c' + f.coat, 'p' + f.pat, 'h' + hb(f.hue), 'k' + Math.floor(hb(f.hue + f.hue2) / 2), 'e' + f.en, 'm' + f.mk, 't' + (f.sym || f.n < 2 ? 0 : f.tk),
      (f.shell > 0.25 ? 's' : '') + (f.glow > 0.3 ? 'g' : '') + (f.venom > 0.3 ? 'v' : '') + (f.crest > 0.25 ? 'r' : '') + (f.nk > 0.35 ? 'n' : '') + (f.hd > 1.45 ? 'b' : '') + (f.hq > 3 ? 'q' : f.hq < 1.8 ? 'o' : '')].join('.');
  };
  /** the painting for this genome, if there is one ready */
  G.paintFor = function (g) { const p = G.paints[g._ps || (g._ps = G.paintSig(g))]; return p && p.cv ? p : null; };
  /** the painting a living creature wears: its own look if that has been painted, else the one of its kind */
  G.paintOf = function (c, sp) {
    const own = G.paintFor(c.g);
    if (own) return own;
    if (sp && sp.rep) { const p = G.paintFor(sp.rep); if (p) return p; }
    return null;
  };

  // a painting arrives on black. The black that reaches the edge of the picture is its background and is removed;
  // dark colours inside the creature are kept. Then it is cropped to the creature.
  function lift(img) {
    const N = 300, cv = document.createElement('canvas'); cv.width = cv.height = N;
    const ctx = cv.getContext('2d'); ctx.drawImage(img, 0, 0, N, N);
    const im = ctx.getImageData(0, 0, N, N), d = im.data, bg = new Uint8Array(N * N), st = [];
    const dark = function (i) { return Math.max(d[i * 4], d[i * 4 + 1], d[i * 4 + 2]) < 30; };
    for (let i = 0; i < N; i++) { st.push(i, (N - 1) * N + i, i * N, i * N + N - 1); }
    while (st.length) { const i = st.pop(); if (bg[i] || !dark(i)) continue; bg[i] = 1; const x = i % N; if (x > 0) st.push(i - 1); if (x < N - 1) st.push(i + 1); if (i >= N) st.push(i - N); if (i < N * (N - 1)) st.push(i + N); }
    let x0 = N, x1 = 0, y0 = N, y1 = 0;
    for (let i = 0; i < N * N; i++) {
      if (bg[i]) { d[i * 4 + 3] = 0; continue; }
      const x = i % N, y = (i / N) | 0, edge = (x > 0 && bg[i - 1]) || (x < N - 1 && bg[i + 1]) || (y > 0 && bg[i - N]) || (y < N - 1 && bg[i + N]);
      if (edge) d[i * 4 + 3] = Math.min(255, Math.max(d[i * 4], d[i * 4 + 1], d[i * 4 + 2]) * 3);      // a soft rim, no hard black fringe
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
    if (x1 - x0 < 20 || y1 - y0 < 20) return null;
    ctx.putImageData(im, 0, 0);
    const out = document.createElement('canvas'); out.width = x1 - x0 + 1; out.height = y1 - y0 + 1;
    out.getContext('2d').drawImage(cv, x0, y0, out.width, out.height, 0, 0, out.width, out.height);
    return { cv: out, w: out.width, h: out.height };
  }

  function ask(sig, info, free) {
    busy = true;
    G.paints[sig] = { asked: true };
    G.host.call('ai.paint', Object.assign({ sig: sig, libraryOnly: !!free, model: undefined }, info), 150000).then(function (r) {
      busy = false;
      if (!r || !r.paint || typeof r.paint.b64 !== 'string' || !/^image\/(png|jpeg)$/.test(r.paint.mime) || r.paint.b64.length > 1400000) { G.paints[sig] = { miss: Date.now() }; return; }
      G.ai.tally('paint', r.source, r.usd);
      const img = new Image();
      img.onload = function () { let p = null; try { p = lift(img); } catch (e) { console.error(e); } G.paints[sig] = p || { miss: Date.now() }; if (p) G.emit('painted', sig, info, r.source); };
      img.onerror = function () { G.paints[sig] = { miss: Date.now() }; };
      img.src = 'data:' + r.paint.mime + ';base64,' + r.paint.b64;
    }, function () { busy = false; G.paints[sig] = { miss: Date.now() }; });
  }
  /** what the painter is told about a body: only facts the genes hold, and what its world is like */
  G.paintInfo = function (g, name) {
    const f = g.f, facts = F.facts(f), W = G.W;
    return { name: String(name || '').slice(0, 40), build: F.build(f), kind: F.kind(f).full, facts: facts.slice(0, -1), colours: facts[facts.length - 1], world: W && W.press ? W.press.list.slice(0, 3) : [] };
  };
  /** make sure this look gets its painting: free from the library if it is there, else painted when the budget allows */
  G.wantPaint = function (g, name) {
    if (busy || G.ai.drawn || !(G.host && G.host.ready && G.host.caps.ai && G.ai.paintOn && G.ai.provider === 'server')) return false;
    const sig = g._ps || (g._ps = G.paintSig(g)), st = G.paints[sig];
    if (st && (st.cv || st.asked || (st.miss && Date.now() - st.miss < 90000))) return false;
    ask(sig, G.paintInfo(g, name), !(G.ai.hasFuel() && G.ai.allow('paint')));
    return true;
  };
  // once a generation: the biggest established kind that has no painting yet
  G.paintTick = function (gen) {
    const W = G.W;
    if (!W || W.title || G.mode !== 'play' || G.catching) return;
    const live = W.species.filter(function (s) { return !s.extinct && s.n >= 6 && s.rep && gen - s.born >= 2; }).sort(function (a, b) { return b.n - a.n; });
    for (let i = 0; i < live.length && i < 8; i++) if (G.wantPaint(live[i].rep, live[i].name)) return;
  };
  G.on('new-pond', function () { busy = false; });
})();
