// ── A picture for each marvel ──
// The server makes each marvel a transparent icon with an image model (Leonardo) and keeps it for good, one per marvel name, so the same name is
// never paid for twice. Here it is fetched once, shrunk to a small picture and kept in memory, and used wherever the marvel is shown: floating beside
// its creature, on its card, in the rare box. First the server's library is asked (free); only if the icon does not exist yet is one made, and that
// is a rare, small cost (about two cents) for something rare. Where there is no icon (no image model, or not yet), the drawn sign stands in.
(function () {
  'use strict';
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (G.ai) { G.ai.gaps.icon = 4000; G.ai.caps.icon = 40; G.ai.LABEL.icon = 'Marvel icons (Leonardo, once per marvel)'; }
  const C = {};          // marvel name → { st: 'asked' | 'ready' | 'none', url, img }
  const key = function (m) { return String(m && m.name || '').toLowerCase(); };
  const live = function () { return G.mode === 'play' && G.host && G.host.ready && G.host.caps && G.host.caps.ai && G.ai && G.ai.provider === 'server' && G.ai.hasFuel(); };
  function take(m, r, e) {
    if (!r || !r.icon || typeof r.icon.b64 !== 'string' || !/^image\/png$/.test(r.icon.mime) || r.icon.b64.length > 900000) { e.st = 'none'; return false; }
    G.ai.tally('icon', r.source, r.usd);
    const im = new Image();
    im.onload = function () {
      const S = 160, cv = document.createElement('canvas'); cv.width = cv.height = S; const x = cv.getContext('2d'), k = Math.min(S / im.width, S / im.height);
      x.drawImage(im, (S - im.width * k) / 2, (S - im.height * k) / 2, im.width * k, im.height * k);
      e.url = cv.toDataURL('image/png'); e.img = cv; e.st = 'ready'; G.emit('marvel-icon', m);
    };
    im.onerror = function () { e.st = 'none'; };
    im.src = 'data:image/png;base64,' + r.icon.b64;
    return true;
  }
  function ask(m) {
    const k = key(m); if (!k) return null;
    let e = C[k];
    if (e && (e.st !== 'none' || Date.now() - e.at < 120000)) return e;
    if (!live()) { if (!e) e = C[k] = { st: 'none', at: Date.now() }; else e.at = Date.now(); return e; }
    e = C[k] = { st: 'asked', at: Date.now() };
    const info = { name: m.name, wonder: m.wonder, icon: m.iconText || '', hue: Math.round(m.hue || 0) };
    // the library first: free. Only if there is no icon yet is one made (and then only while the session's allowance for icons lasts).
    G.host.call('ai.icon', Object.assign({ libraryOnly: true }, info), 30000).then(function (r) {
      if (take(m, r, e)) return;
      if (!G.ai.allow('icon')) { e.st = 'none'; return; }
      G.host.call('ai.icon', info, 150000).then(function (r2) { if (!take(m, r2, e)) e.st = 'none'; }, function () { e.st = 'none'; });
    }, function () {
      if (!G.ai.allow('icon')) { e.st = 'none'; return; }
      G.host.call('ai.icon', info, 150000).then(function (r2) { if (!take(m, r2, e)) e.st = 'none'; }, function () { e.st = 'none'; });
    });
    return e;
  }
  /** the loaded icon as a canvas (for drawing in the pond), or null while there is none */
  G.marvelIconImg = function (m) { const e = ask(m); return e && e.st === 'ready' ? e.img : null; };
  /** the icon as a picture address (for the card and the rare box), or '' */
  G.marvelIconUrl = function (m) { const e = ask(m); return e && e.st === 'ready' ? e.url : ''; };
  /** the little picture for a marvel as HTML: its icon if it has one, else the sign the AI drew, else nothing */
  G.marvelPic = function (m, px) {
    const u = G.marvelIconUrl(m);
    if (u) return '<img class="mic" alt="" width="' + px + '" height="' + px + '" src="' + u + '">';
    if (m && m.emblem) return '<img class="mic" alt="" width="' + px + '" height="' + px + '" src="data:image/svg+xml;charset=utf-8,' + encodeURIComponent(m.emblem) + '">';
    return '';
  };
  // an icon is wanted the moment a marvel is born
  G.on('marvel', function (c, def) { if (G.mode === 'play') ask(def); });
  // and the card's and the box's pictures are drawn again when it arrives
  G.on('marvel-icon', function () { const mb = document.getElementById('imarvel'); if (mb) mb._k = ''; });
  // the compact, readable look of the marvel panel on a creature's card
  const st = document.createElement('style');
  st.textContent = '#inspector #imarvel{margin:8px 0 8px;padding:10px 11px 9px;border-radius:13px;background:rgba(14,26,40,.97);border:1.5px solid rgba(246,211,101,.75);box-shadow:0 0 0 1px rgba(0,0,0,.35)}' +
    '#imarvel .mh{display:flex;align-items:center;gap:10px}#imarvel .mh .mic{flex:none;width:46px;height:46px;object-fit:contain;filter:drop-shadow(0 2px 5px rgba(0,0,0,.5))}#imarvel .mt{min-width:0}' +
    '#imarvel .mk{font:800 9.5px system-ui,sans-serif;letter-spacing:.2em;color:#f6d365;margin:0}#imarvel .mn{display:block;font:800 16px/1.2 system-ui,sans-serif;color:#fff;margin:2px 0 0}' +
    '#imarvel .mw{font:600 13px/1.45 system-ui,sans-serif;color:#f1f6ff;margin:8px 0 0}' +
    '#imarvel details{margin:7px 0 0;border-top:1px solid rgba(246,211,101,.25);padding-top:6px}#imarvel summary{cursor:pointer;font:700 11.5px system-ui,sans-serif;color:#f6d365;list-style:none}#imarvel summary::-webkit-details-marker{display:none}#imarvel summary:before{content:"\\25B8  "}#imarvel details[open] summary:before{content:"\\25BE  "}' +
    '#imarvel ul{margin:6px 0 0;padding:0;list-style:none}#imarvel li{font:600 12px/1.4 system-ui,sans-serif;color:#ffe9a8;padding:2px 0 2px 15px;position:relative}#imarvel li:before{content:"\\25C6";position:absolute;left:0;font-size:8px;top:5px}' +
    '#imarvel .my{font:italic 500 11.5px/1.4 system-ui,sans-serif;color:#c9d9ee;margin:6px 0 0}';
  document.head.appendChild(st);
})();
