// ── Order at the top of the screen ──
// Too many things spoke at once in the middle of the screen. Now there are two voices:
//  · the BANNER (top, centre) is only for the few big moments: a marvel, a plan the creatures made and how it ended, a wish
//    come true, a new age, an event in the world. One at a time, never more than two waiting, and never long.
//  · everything smaller (evolution invented something, a new body, the story so far...) is a NOTE: one quiet line at a time
//    at the bottom, in the middle. All of it is still in the log.
(function () {
  'use strict';
  if (typeof document === 'undefined' || !G.banner) return;
  const BIG = /marvel|decided|did it|came to nothing|wish came true|new age|it happened|stranger|arrived|is home/i;
  const short = function (s, n) { s = String(s || ''); if (s.length <= n) return s; const cut = s.slice(0, n), dot = cut.lastIndexOf('. '); return dot > n * 0.5 ? cut.slice(0, dot + 1) : cut.replace(/\s+\S*$/, '') + '…'; };
  const esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  // notes: one line at a time, bottom right
  let box = null, Q = [], busy = 0;
  function show() {
    const n = Q.shift(); if (!n) { busy = 0; return; }
    if (!box) { box = document.createElement('div'); box.id = 'note'; box.className = 'glass'; box.style.cssText = 'position:fixed;left:50%;bottom:86px;z-index:6;width:max-content;max-width:min(460px,calc(100vw - 28px));text-align:center;padding:9px 13px;border-radius:14px;font:500 12.5px/1.4 system-ui,sans-serif;color:#eaf4ff;pointer-events:none;transition:opacity .4s,transform .4s;opacity:0;transform:translate(-50%,8px)'; (document.getElementById('ui') || document.body).appendChild(box); }
    box.innerHTML = '<div style="font:800 9.5px system-ui,sans-serif;letter-spacing:.16em;color:#f6d365;text-transform:uppercase;margin-bottom:2px">' + esc(n[0]) + '</div>' + esc(short(n[1], 150));
    { const al = document.getElementById('mvalert'), up = al && !al.classList.contains('hide'); const hi = document.getElementById('hint'), hup = hi && hi.classList.contains('show'); box.style.bottom = up ? Math.round(window.innerHeight - al.getBoundingClientRect().top + 10) + 'px' : hup ? Math.round(window.innerHeight - hi.getBoundingClientRect().top + 10) + 'px' : '86px'; }      /* above the marvel alarm when that is showing */
    box.style.opacity = '1'; box.style.transform = 'translate(-50%,0)';
    busy = setTimeout(function () { box.style.opacity = '0'; box.style.transform = 'translate(-50%,8px)'; busy = setTimeout(show, 500); }, Q.length ? 3800 : 5500);
  }
  G.on('new-pond', function () { Q.length = 0; });      // what was waiting to be said was about the pond you have left
  G.note = function (kicker, text) { if (Q.length >= 3) Q.shift(); Q.push([kicker, text]); if (!busy) show(); };
  // the banner: big moments only
  const banner0 = G.banner; let last = '';
  G.banner = function (kicker, text, ms) {
    if (!BIG.test(kicker)) { G.note(kicker, text); return; }
    const key = kicker + '|' + text; if (key === last) return; last = key;
    banner0(kicker, short(text, 190), Math.min(ms || 5000, 8000));
  };
})();
