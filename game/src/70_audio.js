// ── Sound: soft plops, bubbles and chimes, all from Plaxzy's sound library ──
(function () {
  'use strict';
  const SND = {
    click: 'ui/click',
    birth: 'toon/pop',
    mutation: 'magic/sparkle',
    death: 'water/bubbles',
    season: 'arcade/tone',
    drip: 'water/drip',
    discovery: 'magic/heal',
    squeak: 'animal/creature_cute',
    predator: 'animal/creature_monster',
    meteor: 'fight/explosion',
    extinct: 'music/happy_and_sad_tuba_fanfare',
    swing: 'fight/sword_swing', clash: 'fight/sword_clash', block: 'fight/shield_block', zap: 'fight/blaster', thud: 'fight/punch', horn: 'fight/whoosh',      // a fight: a blade swung, a blade met, a shield taking it, a tower's stroke, a wall struck, a ship coming down
  };
  // quiet things must not turn into noise: each sound has its own breathing space (ms)
  const GAP = { swing: 150, clash: 230, block: 260, zap: 300, thud: 240, horn: 2000, click: 40, birth: 130, mutation: 400, death: 260, season: 800, drip: 200, discovery: 600, squeak: 900, predator: 2500, meteor: 600, extinct: 3000 };
  const last = {};
  let ambient = null, started = false;
  G.sfx = function (name, opts) {
    if (!window.PXS || !SND[name]) return null;
    const now = performance.now();
    if (now - (last[name] || 0) < (GAP[name] || 0)) return null;
    last[name] = now;
    try { return PXS.play(name, opts); } catch (e) { console.error(e); return null; }
  };
  function pan(x) { return G.W ? G.clamp((x / G.W.ww - 0.5) * 1.6, -1, 1) : 0; }
  // the soundtrack starts on the first tap of BEGIN, not before
  G.startSound = function () {
    if (started || !window.PXS) return;
    started = true;
    try {
      PXS.music('music/drifting');
      ambient = PXS.loop('loop/underwater', { speed: 0.2 });
    } catch (e) { console.error(e); }
  };
  G.stopSound = function () {
    started = false;
    try { if (ambient) ambient.stop(); ambient = null; PXS.stopMusic(); PXS.stopSfx(); } catch (e) { console.error(e); }
  };

  G.addSystem({
    name: 'audio',
    init: function () {
      if (window.PXS) { try { PXS.define(SND); } catch (e) { console.error(e); } }
      const calm = function () { return G.mode === 'play' && G.speed <= 4 && !G.isBlocked(); };
      G.on('begin', G.startSound);
      G.on('birth', function (c) { if (calm()) { G.sfx('birth', { volume: 0.7, pan: pan(c.x) }); if (Math.random() < 0.12 && G.utter) G.utter(c, 'peep'); } });      /* its own peep, made from itself (46c_voice.js), not a recording */
      G.on('mutation', function (c) { if (calm()) G.sfx('mutation', { volume: 0.7, pan: pan(c.x) }); });
      G.on('death', function (c, cause) { if (calm() && cause !== 'starved') G.sfx('death', { volume: 0.55, pan: pan(c.x) }); });
      G.on('season', function () { if (G.mode === 'play' && G.speed <= 16) G.sfx('season', { volume: 0.6 }); });
      G.on('placed', function () { G.sfx('drip', { volume: 0.9 }); });
      G.on('zone', function () { G.sfx('drip', { volume: 0.9 }); });
      G.on('disaster', function (kind) { if (kind === 'meteor') G.sfx('meteor', { volume: 0.8 }); else G.sfx('mutation', { volume: 0.9 }); });
      G.on('discovery', function () { /* the banner plays its own chime */ });
      G.on('eat', function () { /* eating is silent: there are hundreds of meals a season */ });
      G.on('death', function (c, cause, by) { if (cause === 'eaten' && by && calm() && Math.random() < 0.25 && G.utter) G.utter(by, 'growl'); });      /* the eater's own growl, made from itself */
      G.on('new-pond', function () { if (window.PXS) { try { PXS.stopSfx(); } catch (e) { console.error(e); } } });
      // the pond hushes when time is fast
      G.on('speed', function (s) { if (ambient && ambient.set) { try { ambient.set({ speed: s === 0 ? 0 : s >= 16 ? 0.7 : 0.2 }); } catch (e) { console.error(e); } } });
    },
  });
})();
