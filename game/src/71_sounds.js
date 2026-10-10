// ── What a star sounds like ──
// The moments of a colony (a building finished, a ship lifting off or coming down, a raid, the colony growing) and the AIR of each kind of star are sounds made
// by a sound model, asked of the server by NAME (the server writes what is asked of the model), made once and kept for good. Until one has come, and wherever
// there is no model to ask, the game's own plain sounds play as before (70_audio.js): nothing here is needed for the game to be heard.
(function () {
  'use strict';
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const ST = {}, MOMENTS = ['built', 'liftoff', 'landing', 'raid', 'grew'];
  let air = null, airName = '';
  function ask(name) {
    const s = ST[name], now = Date.now(); if (s && (s.v === 'asked' || s.v === 'ready' || (s.v === 'none' && now - s.at < 120000))) return;
    if (!(G.host && G.host.ready) || !window.PXS) return;
    const pay = !!(G.host.caps && G.host.caps.ai && G.ai.provider === 'server' && G.ai.sound !== false && G.ai.hasFuel() && G.ai.allow('sound'));
    ST[name] = { v: 'asked', at: now };
    G.host.call('sfx', { name: name, libraryOnly: !pay }, 120000).then(function (r) {
      if (!r || !r.sound || !/^audio\/(mpeg|wav|ogg|mp4)$/.test(r.sound.mime) || typeof r.sound.b64 !== 'string' || r.sound.b64.length > 700000) { ST[name] = { v: 'none', at: Date.now() }; return; }
      if (G.ai && G.ai.tally) G.ai.tally('sound', r.source === 'leonardo' ? 'leonardo' : 'library', r.usd);
      const def = {}; def['fx:' + name] = 'data:' + r.sound.mime + ';base64,' + r.sound.b64;
      try { PXS.define(def); ST[name] = { v: 'ready', at: Date.now() }; G.emit('fx-ready', name); } catch (e) { ST[name] = { v: 'none', at: Date.now() }; console.error(e); }
    }, function () { ST[name] = { v: 'none', at: Date.now() }; });
  }
  /** play the sound of a moment: true if it has one of its own (if not, it is asked for, and the caller's plain sound will do this time) */
  G.fxSound = function (name, opts) { const s = ST[name]; if (s && s.v === 'ready' && window.PXS) { try { PXS.play('fx:' + name, opts || { volume: 0.85 }); } catch (e) { console.error(e); } return true; } ask(name); return false; };
  const quiet = function () { return G.mode !== 'play' || (G.isBlocked && G.isBlocked()); };
  // the air of the star you are on: it takes the place of the sound of water
  function airFor() {
    if (!window.PXS || !G.FLAT || !G.W || G.W.title || !G.terrainOf) return; const name = 'amb.' + G.terrainOf(G.W).id, s = ST[name];
    if (!s || s.v !== 'ready') { ask(name); return; } if (airName === name && air) return;
    try { if (air && air.stop) air.stop(); if (G.hushWater) G.hushWater(); air = PXS.loop('fx:' + name, { volume: 0.5 }); airName = name; } catch (e) { console.error(e); }
  }
  G.on('fx-ready', function (name) { if (name.indexOf('amb.') === 0) airFor(); });
  G.on('begin', function () { setTimeout(function () { airFor(); MOMENTS.forEach(function (m, i) { setTimeout(function () { ask(m); }, 1500 + i * 400); }); }, 1200); });
  G.on('arrived', function () { setTimeout(airFor, 800); });
  G.on('new-pond', function () { try { if (air && air.stop) air.stop(); } catch (e) { /* gone already */ } air = null; airName = ''; setTimeout(airFor, 1500); });
  // the moments
  G.on('deed-end', function (d, how) { if (quiet() || !d || !d.bp || how !== 'done' || G.speed > 16) return; G.fxSound('built', { volume: 0.8 }); });
  G.on('mission-stage', function (d, what) { if (quiet()) return; if (what === 'liftoff') G.fxSound('liftoff', { volume: 0.9 }); });
  G.on('ship-landing', function () { if (!quiet()) G.fxSound('landing', { volume: 0.9 }); });
  G.on('raid-warn', function () { if (!quiet()) G.fxSound('raid', { volume: 0.85 }); });
  G.on('colony-tier', function () { if (!quiet()) G.fxSound('grew', { volume: 0.85 }); });
})();
