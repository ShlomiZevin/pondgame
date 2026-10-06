// ── A creature that talks is heard ──
// When a marvel speaks, its line appears over its head; here it is also SPOKEN. The words go to the server, which has them said by
// a speech model in the tone the marvel was given, and keeps the sound for good, so a line is paid for once. The creature's own
// pace makes the voice its own: quick and high for something small, slow and low for something big. Speech is dear, so only a
// few new lines are made in a session; lines already made are free.
(function () {
  'use strict';
  if (G.ai) { G.ai.gaps.voice = 2500; G.ai.caps.voice = 10; G.ai.LABEL.voice = 'Creatures speaking aloud (Leonardo)'; }
  const made = {};           // line → 'asked' | 'ready' | 'none'
  let lastPlay = 0;
  const now = function () { return typeof performance !== 'undefined' ? performance.now() : Date.now(); };
  G.on('say', function (c, word) {
    if (G.mode !== 'play' || G.speed > 4 || !window.PXS || !G.host || !G.host.ready || !G.host.caps || !G.host.caps.ai || G.ai.sound === false) return;
    const mv = c.ph && c.ph.mv; if (!mv) return;
    const tone = (mv.voice && mv.voice.tone) || 'bright', speed = (mv.voice && mv.voice.speed) || 1.25, key = 'say:' + tone + ':' + String(word).toLowerCase();
    const play = function () { if (now() - lastPlay < 1800) return; lastPlay = now(); try { PXS.play(key, { speed: speed, rate: speed, volume: 0.9 }); } catch (e) { console.error(e); } };
    if (made[key] === 'ready') { play(); return; }
    if (made[key]) return;
    if (!G.ai.allow('voice')) return;
    made[key] = 'asked';
    G.host.call('ai.voice', { text: word, tone: tone }, 60000).then(function (r) {
      G.ai.tally('voice', r && (r.source === 'leonardo' ? 'leonardo' : r.source), r && r.usd);
      if (!r || !r.sound || !/^audio\/(mpeg|wav|ogg|mp4)$/.test(r.sound.mime) || typeof r.sound.b64 !== 'string' || r.sound.b64.length > 600000) { made[key] = 'none'; return; }
      const def = {}; def[key] = 'data:' + r.sound.mime + ';base64,' + r.sound.b64;
      try { PXS.define(def); made[key] = 'ready'; if (c.say && !c.dead) play(); } catch (e) { made[key] = 'none'; console.error(e); }
    }, function () { made[key] = 'none'; });
  });
})();
