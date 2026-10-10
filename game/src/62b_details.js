// ── Everything in the pond can be clicked ──
// Things the player added (and the marvels' garden) already had a card. Here the rest gets one too: what the creatures BUILT, the walls and regions
// that events and plans put in the pond, and a plan while it is being carried out. The card is the same one a thing uses (#zcard), so it looks the same.
// G.thingAt(x, y) finds whatever is drawn under a point: the click handler asks it before it falls back to "the nearest creature".
(function () {
  'use strict';
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const esc = function (s) { return G.escapeHtml(String(s === undefined || s === null ? '' : s)); };
  const cap = function (s) { s = String(s || ''); return s.charAt(0).toUpperCase() + s.slice(1); };
  const dot = function (s) { s = String(s || '').trim(); return s ? (/[.!?]$/.test(s) ? s : s + '.') : ''; };
  const STEP = { gather: 'gathering', circle: 'in council', line: 'forming up', carry: 'fetching and carrying', build: 'building', charge: 'charging', guard: 'standing guard', scatter: 'setting off', board: 'going aboard', countdown: 'counting down', liftoff: 'lifting off' };
  let cur = null, lastSig = '';

  /** what is drawn under this point, other than a creature: { k: 'zone' | 'work' | 'deed' | 'field', o } or null */
  G.thingAt = function (x, y) {
    const W = G.W; if (!W) return null;
    const Wk = W.works || [];
    for (let i = Wk.length - 1; i >= 0; i--) { const w = Wk[i]; if (Math.hypot(w.x - x, w.y - y) < Math.max(46, Math.min(w.r * 1.5, 190) * 0.5)) return { k: 'work', o: w }; }
    const z = G.zoneAt(x, y); if (z) return { k: 'zone', o: z };
    const d = W.deed; if (d) { const R = d.result ? d.result.size * Math.min(W.ww, W.wh) : 60; if (Math.hypot(d.x - x, d.y - y) < R + 12) return { k: 'deed', o: d }; }
    const F = W.fields || [];
    if (G.fieldLocate) for (let i = F.length - 1; i >= 0; i--) { const f = F[i]; if (f.shape === 'all' || W.t < f.start) continue; if (f.shape === 'ring') { const m = Math.min(W.ww, W.wh), dd = Math.hypot(f.x * W.ww - x, f.y * W.wh - y); if (Math.abs(dd - f.r * m) < Math.max(16, f.width * m * 0.3)) return { k: 'field', o: f }; continue; } if (G.fieldLocate(f, W, x, y, 10)) return { k: 'field', o: f }; }
    return null;
  };

  function card() { return document.getElementById('zcard'); }
  G.selectThing = function (hit) {
    if (!hit) { if (cur) { cur = null; lastSig = ''; const c = card(); if (c && !G.R.selZone) c.classList.add('hide'); } return; }
    if (hit.k === 'zone') { cur = null; G.selectZone(hit.o); return; }
    G.selectZone(null);
    cur = hit; lastSig = '';
    if (G.sfx) G.sfx('click');
    draw();
  };
  const head = function (pic, title, note, by) {
    return '<div class="ihead">' + pic + '<div><b>' + esc(title) + '</b><small>' + esc(note) + '</small>' + (by ? '<small style="color:var(--gold)">' + esc(by) + '</small>' : '') + '</div><button class="x" id="zclose" aria-label="Close">' + G.ICON.close + '</button></div>';
  };
  /** what a built thing looks like, for its card: its own picture when it is made of pieces, the coloured ball only when there is nothing else */
  const picOf = function (o) { const u = o.bp && G.buildPic ? G.buildPic(o, 92) : ''; return u ? '<img alt="" width="92" height="92" style="flex:none;border-radius:16px;background:radial-gradient(circle at 50% 70%, rgba(207,232,255,.14), rgba(7,18,31,.55));padding:2px" src="' + u + '">' : blob(o.hue || 50); };
  const blob = function (hue) { return '<div style="flex:none;width:64px;height:64px;border-radius:50%;background:radial-gradient(circle at 40% 35%, ' + G.hsl(hue, 90, 80, 1) + ', ' + G.hsl(hue, 85, 50, 0.5) + ' 60%, transparent 72%)"></div>'; };
  const meter = function (label, f) { f = Math.max(0, Math.min(1, f)); return '<div class="ilabel">' + label + '</div><div class="meter"><i style="width:' + Math.round(f * 100) + '%;background:' + (f > 0.5 ? G.PAL.algae : f > 0.2 ? G.PAL.gold : G.PAL.rose) + '"></i></div>'; };
  const facts = function (L) { return '<div style="font-size:11.5px;line-height:1.5;margin-top:6px">' + L.filter(Boolean).join('<br>') + '</div>'; };
  const fieldOf = function (id) { const F = (G.W && G.W.fields) || []; for (let i = 0; i < F.length; i++) if (F[i].id === id) return F[i]; return null; };

  function draw() {
    const W = G.W, c = card(); if (!c) return;
    if (!cur || !W || G.mode !== 'play') { if (cur) { cur = null; c.classList.add('hide'); } return; }
    const o = cur.o; let h = '', sig = '';
    if (cur.k === 'work') {
      if ((W.works || []).indexOf(o) < 0) { G.selectThing(null); return; }
      const left = Math.max(0, o.until - W.t), f = fieldOf(o.field), does = f && G.fieldWords ? G.fieldWords(f) : '', fp = G.figurePic ? G.figurePic(o.name) : '';
      sig = 'w' + o.name + (o.bp && o.bp.type === 'ship' && G.shipSig ? G.shipSig(o) : '') + (o.bp ? G.buildCount(o).join('.') + (o.fall ? 'f' : '') + (o.ruin ? 'r' : '') : Math.round(left / 2)) + (fp ? 1 : 0);
      if (sig === lastSig) return;
      h = head(fp ? '<img alt="" width="64" height="64" style="flex:none;border-radius:14px;background:rgba(7,18,31,.55);padding:4px" src="data:image/svg+xml;charset=utf-8,' + encodeURIComponent(fp) + '">' : picOf(o), o.name, cap(dot(o.looks)), 'Built by the ' + o.by + ' in generation ' + o.gen) +
        '<div class="ilabel">What it does</div><small>' + (does ? esc(cap(does)) + '. It does not harm those who built it.' : 'It stands as their mark.') + '</small>' +
        (o.bp ? (function () { const n = G.buildCount(o); return meter('How much of it stands', n[0] / n[2]) + '<small>' + n[0] + ' of ' + n[2] + ' pieces stand, ' + n[1] + ' coloured.' + (o.ruin ? ' <span style="color:var(--rose)">Its builders are gone: it is crumbling.</span>' : ' Its builders keep it up for as long as their kind lives.') + '</small>'; })() : meter('Time left', left / Math.max(1, (f && f.life0) || 120))) +
        (o.bp && o.bp.type === 'ship' && G.shipCard ? G.shipCard(o) : '') +
        facts([o.bp && o.bp.type === 'port' ? 'A spaceport: the pad their spaceship is built on and lifts off from.' : '', o.bp && o.bp.type === 'house' ? 'A house: tired ones of its kind come home to it and sleep sheltered. <b>' + (o.inN || 0) + '</b> are in it now.' : '', o.bp && o.bp.about ? '<i>' + esc(o.bp.about) + '</i> ' + (o.bp.designed ? '(Its shape is their own design.)' : '') : '', o.plan ? '<b>The plan:</b> ' + esc(o.plan) + '.' : '', o.hitBy ? '<span style="color:var(--rose)">' + esc(o.hitBy) + ' has been knocking pieces off it.</span>' : '', o.keptBy ? 'It is kept up now by the <b>' + esc(o.keptBy) + '</b>.' : '', o.shun ? '<span style="color:var(--rose)">The watcher found it spoils the star as a place: it is no longer kept up.</span>' : '', W.place ? 'The star as a place, by the watcher: <b>' + (W.place.order * 10).toFixed(0) + ' of 10</b>. <i>' + esc(W.place.why) + '</i>' : '', o.what ? esc(cap(dot(o.what))) : '', o.why ? '<span style="color:var(--gold)">Why:</span> ' + esc(dot(o.why)) : '', o.bp ? '' : 'It stands for about <b>' + Math.round(left) + '</b> more seconds of star time.']) + (o.bp && !o.fall ? '<button class="btn sm" id="zraze" style="width:100%;margin-top:8px">STRIKE IT DOWN</button>' : '');
    } else if (cur.k === 'deed') {
      if (W.deed !== o) { G.selectThing(null); return; }
      const st = o.steps[o.i] || {}, n = W.cre.filter(function (x) { return x.deedId === o.id && !x.dead; }).length, togo = Math.max(1, Math.ceil(o.steps.slice(o.i).reduce(function (a, q) { return a + q.secs; }, 0) - o.t));
      sig = 'd' + o.id + o.i + n + Math.round(togo / 2) + Math.round((o.progress || 0) * 20) + (o.bp ? G.buildCount(o).join('.') + (o.wait || '') : '');
      if (sig === lastSig) return;
      h = head(picOf(o), o.title, o.say ? '“' + o.say + '”' : '', 'A plan of the ' + o.kind + ', begun in generation ' + o.gen) +
        '<div class="ilabel">Now</div><small><b style="color:var(--gold)">' + esc(cap(STEP[st.do] || st.do || '')) + (st.do === 'build' ? ' ' + Math.round((o.progress || 0) * 100) + '%' : '') + '</b> · step ' + (o.i + 1) + ' of ' + o.steps.length + ' · ' + n + ' of them · about ' + togo + ' s to go</small>' +
        meter('How far along', (o.i + Math.min(1, o.t / Math.max(1, st.secs || 1))) / Math.max(1, o.steps.length)) +
        facts([o.bp ? (function () { const n = G.buildCount(o); return '<b>' + n[0] + '</b> of ' + n[2] + ' pieces are in place, <b>' + n[1] + '</b> coloured.' + (o.wait === 'plan' ? ' They are working out what it shall look like.' : o.wait ? ' <span style="color:var(--rose)">They are waiting for ' + o.wait + ': there is none lying about.</span>' : ' Each is fetched from the star (stone from the floor, reed from the land, shell from where something died) and carried here.'); })() : '', o.what ? esc(cap(dot(o.what))) : '', o.why ? '<span style="color:var(--gold)">Why:</span> ' + esc(dot(o.why)) : '', o.result && o.result.name ? 'If they finish, they will have built <b>' + esc(o.result.name) + '</b>.' : '']);
    } else {
      if ((W.fields || []).indexOf(o) < 0) { G.selectThing(null); return; }
      const does = G.fieldWords ? G.fieldWords(o) : '', mine = (W.works || []).filter(function (w) { return w.field === o.id; })[0];
      sig = 'f' + o.id + Math.round(o.life / 2) + (o.atk || 0);
      if (sig === lastSig) return;
      h = head(blob(o.hue === undefined ? 200 : o.hue), o.name, o.solid ? 'A wall across the star.' : 'A part of the star that is different from the rest.', mine ? 'Built by the ' + mine.by : 'It came with an event') +
        '<div class="ilabel">What it does</div><small>' + (does ? esc(cap(does)) + '.' : 'Very little.') + '</small>' +
        meter('Time left', o.life / Math.max(1, o.life0 || o.life || 1)) +
        facts([o.solid && G.WEAK && G.WEAK[o.weak] ? '<span style="color:var(--gold)">Its weakness: ' + esc(G.WEAK[o.weak].text) + '.</span>' : '', o.atk ? '<b>' + o.atk + '</b> creatures are breaking through it now.' : '', 'It lasts about <b>' + Math.round(o.life) + '</b> more seconds of star time.']);
    }
    lastSig = sig; c.innerHTML = h; c.classList.remove('hide');
    const x = document.getElementById('zclose'); if (x) x.onclick = function () { G.selectThing(null); };
    if (G.shipCardWire) G.shipCardWire(o);
    const rz = document.getElementById('zraze'); if (rz) rz.onclick = function () { if (G.sfx) G.sfx('meteor'); G.razeWork(o); lastSig = ''; };
  }
  setInterval(function () { try { if (cur) draw(); } catch (e) { console.error(e); cur = null; } }, 500);
  G.on('select', function (c) { if (c) G.selectThing(null); });
  G.on('new-pond', function () { cur = null; lastSig = ''; });
})();
