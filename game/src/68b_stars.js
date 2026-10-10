// ── The stars, as you see them: on the map of space, on a star's card, in the colony panel, and in what you are told ──
// (what a star IS, and how one is taken, is in 57ya_stars.js)
(function () {
  'use strict';
  if (typeof document === 'undefined' || !G.starOf || !G.far) return;
  const F = G.far, RES = G.RES, YEARLY = [5, 5, 4, 2];
  const esc = function (s) { return String(s === undefined || s === null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  const RCOL = ['#c9d3dc', '#b9d67a', '#f3d9a8', '#8ef0ff'];
  const raidsBy = function (key) { const W = G.W, f = W && W.col && W.col.foes && W.col.foes[key]; return f ? f.raids | 0 : 0; };

  /** a star's card on the map of space: its heading and what is said of it */
  G.starLine = function (p) {
    const s = G.starOf(p), t = s.terrain, rich = '<b style="color:' + RCOL[s.res] + '">' + RES[s.res] + '</b>';
    let html = '<span style="color:rgba(207,232,255,.9)">' + esc(t.name) + ': ' + esc(t.words) + '. Rich in ' + rich + '.</span><br>';
    if (s.held) html += '<span style="color:#9dffcf">It is yours. It sends you ' + YEARLY[s.res] + ' ' + RES[s.res] + ' every year.</span>';
    else if (s.rival) { const n = raidsBy(s.key); html += '<span style="color:#ff9db0">A rival colony holds it' + (n ? ', and has raided you ' + (n === 1 ? 'once' : n + ' times') : ', and will raid you') + '. Land fighters there and break its Heart: the star, and its ' + RES[s.res] + ', are yours.</span>'; }
    else html += '<span style="color:#ffe9a8">Nobody holds it. Land a crew and found an outpost: it will send you ' + YEARLY[s.res] + ' ' + RES[s.res] + ' every year.</span>';
    return { k: s.held ? 'A star of yours' : s.rival ? 'A rival colony' : 'A free star', html: html, rival: s.rival, held: s.held };
  };
  /** on the map of space: a ring round a rival's star and round one of yours, and what each star is rich in */
  G.starMark = function (ctx, p, px, py, pr, t) {
    if (p.free || p.home || pr < 5) return; const s = G.starOf(p);
    ctx.save(); ctx.lineWidth = Math.max(1.5, pr * 0.045);
    if (s.rival || s.held) { ctx.strokeStyle = s.rival ? 'rgba(255,80,110,' + (0.7 + 0.25 * Math.sin(t * 3 + p.i)) + ')' : 'rgba(110,240,168,0.85)'; ctx.setLineDash(s.rival ? [pr * 0.22, pr * 0.16] : []); ctx.lineDashOffset = -t * 10; ctx.beginPath(); ctx.ellipse(px, py, pr * 1.55, pr * 1.2, 0, 0, 6.2832); ctx.stroke(); ctx.setLineDash([]); }
    if (pr > 16) { const txt = (s.held ? 'YOURS' : s.rival ? 'RIVAL' : 'FREE') + ' · ' + RES[s.res]; ctx.font = '800 ' + Math.round(Math.max(9, Math.min(12, pr * 0.2))) + 'px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; const w = ctx.measureText(txt).width + 14, y = py + pr * 1.2 + 15;
      ctx.fillStyle = 'rgba(7,18,31,0.78)'; ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(px - w / 2, y - 9, w, 18, 9); else ctx.rect(px - w / 2, y - 9, w, 18); ctx.fill(); ctx.fillStyle = s.held ? '#9dffcf' : s.rival ? '#ff9db0' : RCOL[s.res]; ctx.fillText(txt, px, y + 0.5); }
    ctx.restore();
  };
  /** in the colony panel: where you are, and what is to be done here */
  G.starPanel = function (W) {
    if (!W) return ''; const t = G.terrainOf(W), line = function (k, a, b, colr) { return '<div style="margin:6px 0 2px;padding:6px 8px;border-radius:9px;background:rgba(7,18,31,.45);border:1px solid ' + (colr || 'rgba(207,232,255,.18)') + ';font-size:11px;line-height:1.35"><b style="letter-spacing:.1em;font-size:10px;color:' + (colr || '#f6d365') + '">' + k + '</b><br>' + a + (b || '') + '</div>'; };
    if (!W.farOf) return line(esc(t.name).toUpperCase(), 'Your own star. Rich in <b style="color:' + RCOL[t.res] + '">' + RES[t.res] + '</b>.', (function () { const H = G.starsHeld(), R = G.rivals().filter(function (q) { return !(F.book[q.key] && F.book[q.key].held); }); return (H.length ? ' You hold ' + H.length + ' more.' : '') + (R.length ? ' <span style="color:#ff9db0">' + R.length + ' rival' + (R.length === 1 ? '' : 's') + ' near.</span>' : F.won ? ' <span style="color:#9dffcf">No rival is left.</span>' : ''); })());
    const ij = String(W.farOf).split(',').map(Number), s = G.starOf({ i: ij[0], j: ij[1] }), name = esc((F.visiting && F.visiting.name) || 'this star'), yours = W.cre.filter(function (c) { return !c.dead && !c.team; }).length;
    if (s.held) return line(name.toUpperCase() + ' · YOURS', esc(t.name) + '. ' + yours + ' of yours live here. It sends home ' + YEARLY[s.res] + ' ' + RES[s.res] + ' a year.', '', '#6ef0a8');
    if (s.rival) { const h = G.foeHeart(W), c = h ? G.buildCount(h) : [0, 0, 1], d = W.cre.filter(function (q) { return q.team === 1 && !q.dead; }).length; return line(name.toUpperCase() + ' · RIVAL', 'Their Heart has <b>' + c[0] + ' of ' + c[2] + '</b> pieces; ' + d + ' defend it' + (W.defLeft > 0 ? ' (' + W.defLeft + ' more can take up arms)' : '') + '. ', (yours ? 'Choose your fighters (' + yours + ' of yours are here) and <b>right-click their Heart</b>.' : '<span style="color:#ffe9a8">None of yours are left here. Fly home and send another crew: what they broke stays broken.</span>') + (h ? '<br><a data-seeheart="1" style="color:#ffe9a8;cursor:pointer;font-weight:800">SHOW THEIR HEART</a>' : ''), '#ff5d73'); }
    return line(name.toUpperCase() + ' · FREE', esc(t.name) + ', rich in <b style="color:' + RCOL[s.res] + '">' + RES[s.res] + '</b>. ' + yours + ' of yours are here. ', '<button data-found="1" style="margin-top:5px;appearance:none;border:1px solid #f6d365;background:rgba(246,211,101,.12);color:#ffe9a8;border-radius:999px;padding:5px 10px;font:800 10.5px system-ui;letter-spacing:.08em;cursor:pointer">FOUND AN OUTPOST</button>');
  };

  // ── what happens, told ──
  G.on('arrived', function (V, out) { const W = G.W; if (G.mode !== 'play' || !W || !W.farOf || !out || !out.length) return; const ij = W.farOf.split(',').map(Number), s = G.starOf({ i: ij[0], j: ij[1] });
    setTimeout(function () { if (s.rival) G.banner('Enemy star', 'You have landed on ' + V.name + ', a rival colony. Your crew are fighters now: choose them and right-click their Heart to break it. Its defenders will come at whoever comes near.', 11000); else if (!s.held) G.banner('A free star', V.name + ' is nobody\'s. FOUND AN OUTPOST (in the colony panel) and it is yours: a Heart of your own rises here, and it sends home ' + YEARLY[s.res] + ' ' + RES[s.res] + ' a year.', 10000); }, 5200); });
  G.on('star-taken', function (rec, s, loot) { if (G.mode !== 'play') return; G.banner('The star is yours', 'Their Heart has fallen. ' + rec.name + ' is yours: its people lay down their arms, a Heart of your own rises in its place, and it will send home ' + YEARLY[s.res] + ' ' + RES[s.res] + ' a year. You took ' + loot + ' lumen. It raids you no more.', 12000); if (G.log) G.log('disc', rec.name + ' is yours', 'Their Heart fell to your fighters. ' + loot + ' lumen taken; ' + YEARLY[s.res] + ' ' + RES[s.res] + ' a year from now on.'); if (G.sfx) G.sfx('discovery'); if (G.hub) G.hub.poke(); });
  G.on('outpost', function (rec, s) { if (G.mode !== 'play') return; G.banner('An outpost is founded', rec.name + ' is yours. A Heart of your own is rising here: your builders raise it, your gatherers fill it. It will send home ' + YEARLY[s.res] + ' ' + RES[s.res] + ' a year.', 10000); if (G.log) G.log('disc', 'Outpost on ' + rec.name, 'The star is yours: ' + YEARLY[s.res] + ' ' + RES[s.res] + ' a year.'); if (G.hub) G.hub.poke(); });
  G.on('tribute', function (got) { if (G.mode !== 'play') return; const txt = got.map(function (n, k) { return n ? n + ' ' + RES[k] : ''; }).filter(Boolean).join(', '); if (G.note) G.note('From your stars', txt + ' arrived in the store.'); });
  G.on('victory', function (R) { if (G.mode !== 'play') return; G.banner('Victory: this corner of space is yours', 'Every rival colony near you has fallen: ' + R.map(function (q) { return q.name; }).join(', ') + '. No more raids will come. Your stars keep sending what they are rich in; the game goes on for as long as you like.', 16000); if (G.log) G.log('disc', 'Victory', 'Every rival star near you is yours.'); });
  G.on('defender', function (c) { if (G.mode === 'play' && G.cmd && G.cmd.pop) G.cmd.pop(c.x, c.y, 'takes up arms', '#ff9db0'); });

  // ── NOW > SPACE: the stars near you, whose they are ──
  if (G.hub) {
    G.hub.add(function (W) {
      const R = G.rivals(), H = G.starsHeld(), out = { sig: 'st', space: [], spaceN: [] }; if (!R.length && !H.length) return null;
      const dot = function (colr) { return '<span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:' + colr + ';border:2px solid #14202e"></span>'; };
      H.forEach(function (s) { out.sig += 'h' + s.key; out.space.push(G.hub.row({ icon: dot('#6ef0a8'), title: s.name, tag: 'yours', sub: esc(s.terrain.name) + (s.taken ? ', taken from a rival' : ', your outpost') + '. Sends home <b>' + YEARLY[s.res] + ' ' + RES[s.res] + '</b> a year.', act: F.book[s.key] && F.book[s.key].blob && !F.visiting && !W.farOf ? 'voyPeek' : '', arg: s.key })); });
      R.forEach(function (q) { const b = F.book[q.key]; if (b && b.held) return; const s = G.starOf(q), n = raidsBy(q.key); out.sig += 'r' + q.key + n; out.space.push(G.hub.row({ icon: dot('#ff5d73'), title: q.name, tag: 'rival', bad: true, sub: esc(s.terrain.name) + ', rich in <b>' + RES[s.res] + '</b>. ' + (n ? 'Has raided you ' + (n === 1 ? 'once' : n + ' times') + '. ' : '') + 'Break its Heart with a crew of fighters and it is yours.' })); });
      if (F.won) out.space.unshift('<div class="rnone"><b style="color:#9dffcf">Every rival star near you is yours.</b></div>');
      return out;
    });
  }
})();
