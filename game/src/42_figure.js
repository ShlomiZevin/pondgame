// ── A typed thing, drawn as what it is ──
// When the player types "a knight with a sword", the pond should hold a knight with a sword. The body vocabulary the pond's
// own creatures grow from cannot say that, so a typed being is DRAWN by the AI: a small cartoon in separate parts (body,
// head, arms, legs, tail, whatever is on its back; what it holds is part of its near arm), each with the point it turns
// about. The game cuts the drawing into those parts and moves them like a paper puppet: legs step, arms swing (the near arm
// lifts what it holds when the being strikes), the head nods, a tail wags, wings beat. The drawing is made once for a word
// and kept on the server, so the same word is free ever after. Until it arrives, and for anything that is not a being, the
// pond draws the thing the way it always did.
(function () {
  'use strict';
  const IDS = ['back', 'tail', 'leg-far', 'arm-far', 'body', 'leg-near', 'head', 'arm-near'];
  if (G.ai) { G.ai.gaps.figure = 1500; G.ai.caps.figure = 40; G.ai.LABEL.figure = 'Drawing the beings you typed'; }
  const ready = {};          // word → figure, shared by every thing of that word in this session
  // the player's own words for a thing ("a human knight with a sword"), kept beside the short name the pond gave it ("Knight")
  const typed = {};
  if (G.ai && G.ai.ask) { const ask0 = G.ai.ask; G.ai.ask = function (task, input, schema) { const p = ask0.call(G.ai, task, input, schema); if (task === 'thing' && typeof input === 'string') p.then(function (info) { if (info && info.name) typed[String(info.name).toLowerCase()] = input.slice(0, 120); }, function () {}); return p; }; }

  // the drawing, cut into its parts: each becomes a picture of its own
  function build(fig, done) {
    let doc;
    try { doc = new DOMParser().parseFromString(fig.svg, 'image/svg+xml'); } catch (e) { return done(null); }
    const root = doc && doc.documentElement;
    if (!root || root.nodeName.toLowerCase() !== 'svg' || doc.getElementsByTagName('parsererror').length) return done(null);
    const parts = [];
    let defs = '';
    for (let i = 0; i < root.childNodes.length; i++) {
      const n = root.childNodes[i]; if (n.nodeType !== 1) continue;
      const tag = n.nodeName.toLowerCase(), id = n.getAttribute('id') || '';
      if (tag === 'defs') { defs += n.outerHTML; continue; }
      // anything the model left outside a named group is drawn with the body
      parts.push({ id: tag === 'g' && IDS.indexOf(id) >= 0 ? id : 'body', xml: n.outerHTML });
    }
    if (!parts.length) return done(null);
    let left = parts.length, bad = false;
    const out = { parts: [], pivots: fig.pivots || {}, floats: !!fig.floats, svg: fig.svg };
    parts.forEach(function (p, k) {
      const im = new Image();
      im.onload = function () { out.parts[k] = { id: p.id, img: im }; if (--left === 0) done(bad ? null : out); };
      im.onerror = function () { bad = true; if (--left === 0) done(null); };
      im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 240" width="400" height="480">' + defs + p.xml + '</svg>');
    });
  }

  /** the drawing of this thing, if it is a being and its drawing has arrived; asks for it the first time */
  G.figureOf = function (z) {
    if (z._fig !== undefined) return z._fig;
    if (z.p && z.p.vault > 0.2) return (z._fig = null);        // a wall is drawn as a wall
    const key = String(z.word || '').toLowerCase();
    if (ready[key]) return (z._fig = ready[key]);
    if (z._figAsked) return null;
    if (!(G.host && G.host.ready && G.host.caps && G.host.caps.ai && G.ai.provider === 'server')) return null;
    if (!G.ai.allow('figure')) return null;
    z._figAsked = true;
    G.host.call('ai.figure', { word: z.word, typed: typed[key] || z.word, note: z.note || '', hue: Math.round(z.hue) }, 260000).then(function (r) {
      G.ai.tally('figure', r && r.source, r && r.usd);
      if (!r || !r.figure || typeof r.figure.svg !== 'string' || r.figure.svg.length > 46000) { z._fig = null; return; }
      build(r.figure, function (f) { z._fig = f; if (f) { ready[key] = f; z._figSvg = f.svg; G.emit('figure', z); } });
    }, function () { z._figAsked = false; z._figFail = (z._figFail || 0) + 1; if (z._figFail > 1) z._fig = null; });
    return null;
  };

  /** draw the being with its feet at the origin, one unit to a unit of its drawing (it is 240 tall). t: time; z: the thing */
  G.drawFigure = function (ctx, f, z, t) {
    const moves = z.p && z.p.moves > 0.15, walk = moves ? 1 : 0.3, strike = Math.max(0, Math.min(1, z.bite || 0));
    // it faces the way it is going
    const want = moves && Math.cos(z.ma || 0) < 0 ? -1 : 1; z._fc = z._fc === undefined ? want : z._fc + (want - z._fc) * 0.12;
    const bob = f.floats ? Math.sin(t * 1.8) * 5 - 8 : -Math.abs(Math.sin(t * 5)) * 3 * walk;
    const A = { 'leg-near': Math.sin(t * 5) * 0.3 * walk, 'leg-far': -Math.sin(t * 5) * 0.3 * walk, 'arm-near': Math.sin(t * 2.2) * 0.2 - strike * 1.1, 'arm-far': -Math.sin(t * 2.2) * 0.16, head: Math.sin(t * 1.6) * 0.05, tail: Math.sin(t * 3) * 0.24, back: Math.sin(t * 4.2) * 0.12, body: 0 };
    ctx.save();
    ctx.scale((z._fc >= 0 ? 1 : -1) * Math.max(0.3, Math.abs(z._fc)), 1);
    ctx.translate(-100, -228 + bob);
    for (let i = 0; i < f.parts.length; i++) {
      const p = f.parts[i]; if (!p) continue;
      const pv = f.pivots[p.id] || [100, 130], a = A[p.id] || 0;
      ctx.save(); ctx.translate(pv[0], pv[1]);
      if (p.id === 'body') ctx.scale(1, 1 + Math.sin(t * 2.2) * 0.015); else if (p.id === 'head') ctx.translate(0, Math.sin(t * 2.2) * 1.2);
      ctx.rotate(a); ctx.translate(-pv[0], -pv[1]);
      ctx.drawImage(p.img, 0, 0, 200, 240);
      ctx.restore();
    }
    ctx.restore();
  };
  G.on('zone', function (z) { if (G.mode === 'play') G.figureOf(z); });
})();
