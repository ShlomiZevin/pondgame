// ── A marvel in danger: the player is told, and can save it ──
// A marvel is rare and a player grows fond of it, so its death must not come as a surprise. When one is about to die (it is starving, or winter's
// choice has gone against it, or it is old) an alarm shows with what is wrong and two buttons: SAVE IT and SHOW ME. Saving feeds it, lifts winter's
// sentence and keeps it from harm for a few generations (it counts as blessed, see G.marvelBlessed). Each marvel creature can be saved twice:
// enough to matter, not enough to make it immortal. After that only a Marvel Garden shelters it.
(function () {
  'use strict';
  const SAVES = 2, KEEP = 4;      // saves per marvel creature; generations of protection each one gives
  /** why this marvel is about to die, in a few words, or '' when it is in no danger */
  G.marvelDanger = function (c) {
    const W = G.W; if (!W || !c || c.dead || !c.g.mv) return '';
    const safe = G.marvelBlessed && G.marvelBlessed(c) && (c.graceLeft === undefined || c.graceLeft > 0);
    if (safe) return '';
    if (c.doomed) return c.age >= G.K.maxAge ? 'it is old, and will not see the spring' : c.sick ? 'it is sick, and will not see the spring' : 'winter will take it: it did not do well enough this year';
    // hunger: the alarm starts when it is nearly empty and stays until it has eaten properly, so it does not flicker with every bite
    if (c.E < c.ph.Emax * 0.2) c.hungerAlarm = true; else if (c.E > c.ph.Emax * 0.45) c.hungerAlarm = false;
    if (c.hungerAlarm) return c.asleep ? 'it is starving in its sleep' : 'it is starving';
    return '';
  };
  G.marvelSavesLeft = function (c) { return Math.max(0, SAVES - (c.rescues || 0)); };
  /** the player saves it: fed, spared by winter, and kept from harm for a few generations */
  G.marvelRescue = function (c) {
    const W = G.W; if (!W || !c || c.dead || !c.g.mv || G.marvelSavesLeft(c) <= 0) return false;
    c.rescues = (c.rescues || 0) + 1; c.rescuedGen = W.gen;
    c.E = c.ph.Emax; c.P = Math.max(c.P || 0, c.ph.Emax * 0.5); c.doomed = false; c.sick = false; c.sel = 0; c.graceLeft = 3; c.tired = 0; c.asleep = false; c.flash = 1; c.aura = 1;
    if (G.log) G.log('disc', 'You saved a marvel', 'It is fed and safe for the next ' + KEEP + ' generations.');
    G.emit('marvel-saved', c);
    if (G.markDirty) G.markDirty();
    return true;
  };
  G.MARVEL_KEEP = KEEP;

  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const esc = function (s) { return G.escapeHtml ? G.escapeHtml(String(s)) : String(s); };
  let box = null, shown = 0, snoozed = {}, rang = {};
  function ui() {
    if (box) return box;
    const st = document.createElement('style');
    st.textContent = '#mvalert{position:fixed;left:50%;bottom:96px;transform:translateX(-50%);z-index:8;width:min(520px,calc(100vw - 28px));padding:11px 14px 12px;border-radius:18px;font:500 12.5px/1.4 system-ui,sans-serif;color:#cfe8ff;border-color:rgba(255,126,182,.75) !important;box-shadow:0 0 0 1px rgba(255,126,182,.25),0 10px 34px rgba(0,0,0,.45);animation:mvring 1.6s ease-in-out infinite}' +
      '@keyframes mvring{50%{box-shadow:0 0 0 4px rgba(255,126,182,.28),0 10px 34px rgba(0,0,0,.45)}}' +
      '#mvalert .ak{font:700 9.5px system-ui,sans-serif;letter-spacing:.2em;text-transform:uppercase;color:#ff9ec6;display:flex;justify-content:space-between;align-items:center}#mvalert .ak u{text-decoration:none;cursor:pointer;font-size:14px;color:#cfe8ff;opacity:.7;padding:0 2px}' +
      '#mvalert .ab{display:flex;align-items:center;gap:11px;margin-top:5px}#mvalert .ab .mic{flex:none;width:40px;height:40px;object-fit:contain}#mvalert .at{flex:1;min-width:0}#mvalert .at b{display:block;font:700 15px/1.25 system-ui,sans-serif;color:#fff}#mvalert .at span{display:block;color:#dcecff}' +
      '#mvalert .af{display:flex;gap:8px;margin-top:9px}#mvalert .af .btn{flex:1;min-height:34px}#mvalert .af .go{background:#f6d365;color:#1a2433;border-color:#f6d365;font-weight:800}#mvalert .af .go[disabled]{opacity:.45}' +
      '#mvalert .an{font-size:11.5px;color:#b9cde2;margin-top:6px}';
    document.head.appendChild(st);
    box = document.createElement('div'); box.id = 'mvalert'; box.className = 'glass hide';
    (document.getElementById('ui') || document.body).appendChild(box);
    box.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
    box.addEventListener('click', function (e) {
      const W = G.W, c = W && W.cre.filter(function (x) { return x.id === shown && !x.dead; })[0], id = e.target && e.target.id;
      if (id === 'mvaX') { snoozed[shown] = W ? W.gen : 0; draw(); return; }
      if (!c) { draw(); return; }
      if (id === 'mvaSave') { if (G.marvelRescue(c)) { if (G.sfx) G.sfx('discovery'); G.select(c); G.R.ping = { c: c, t: 0 }; } draw(); return; }
      if (id === 'mvaShow') { if (G.sfx) G.sfx('click'); G.select(c); G.R.ping = { c: c, t: 0 }; G.focusOn(c.x, c.y, 2.2); }
    });
    return box;
  }
  let sig = '';
  function draw() {
    const W = G.W, on = G.mode === 'play' && W && !W.title && !(G.ui && G.ui.modal);
    ui();
    let c = null, why = '';
    if (on) for (let i = 0; i < W.cre.length && !c; i++) { const x = W.cre[i]; if (!x.g.mv || x.dead || snoozed[x.id] === W.gen) continue; const d = G.marvelDanger(x); if (d) { c = x; why = d; } }
    box.classList.toggle('hide', !c);
    if (!c) { shown = 0; sig = ''; return; }
    const mv = c.ph.mv || {}, left = G.marvelSavesLeft(c), s2 = c.id + why + left;
    if (!rang[c.id + ':' + W.gen]) { rang[c.id + ':' + W.gen] = 1; if (G.sfx && G.speed <= 16) G.sfx('squeak'); }
    if (s2 === sig) return; sig = s2; shown = c.id;
    const sp = G.speciesById(c.sp);
    box.innerHTML = '<div class="ak"><span>★ A marvel is in danger</span><u id="mvaX" title="Not now">✕</u></div>' +
      '<div class="ab">' + ((G.marvelPic && G.marvelPic(mv, 40)) || '') + '<div class="at"><b>' + esc(mv.name || 'A marvel') + '</b><span>' + esc((sp ? sp.name : 'Creature') + ' #' + c.id) + ': ' + esc(why) + '.</span></div></div>' +
      '<div class="af"><button class="btn sm go" id="mvaSave"' + (left ? '' : ' disabled') + '>SAVE IT' + (left ? ' · ' + left + ' left' : '') + '</button><button class="btn sm" id="mvaShow">SHOW ME</button></div>' +
      '<div class="an">' + (left ? 'Saving feeds it and keeps it from harm for ' + KEEP + ' generations. Each marvel can be saved ' + SAVES + ' times.' : 'This one has no saves left. A Marvel Garden (ADD) can still shelter it.') + '</div>';
  }
  setInterval(function () { try { draw(); } catch (e) { console.error(e); } }, 600);
  G.on('new-pond', function () { snoozed = {}; rang = {}; sig = ''; });
})();
