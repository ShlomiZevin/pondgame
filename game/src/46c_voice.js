// ── A creature that talks is heard ──
// When a marvel speaks, its line appears over its head, and here it is also HEARD, for nothing: the words are turned into a short
// babble made on the spot (a tiny voice synth: syllables follow the word, a vowel colours each one, the pitch follows the creature's size,
// the tone follows the voice the marvel was given), kept as a sound and played through Plaxzy Sound, so mute and volume work as for
// everything else. A real spoken line from a speech model is the dear part (about thirteen cents a line), so there are two chances, one after the other:
//   1. the chance that a short line is spoken for real at all (G.VOICE_ODDS). The server's repository of lines already spoken is asked first, and that
//      is free: the same words said before, by anyone, in any voice, are simply reused. The repository grows with every line ever made.
//   2. only when the repository has no such line: the chance that a NEW one is made and paid for (G.VOICE_NEW_ODDS), at most one every five minutes
//      of play and within the pond's voice budget. It then joins the repository for good.
(function () {
  'use strict';
  if (typeof window === 'undefined') return;
  G.VOICE_REAL = true;
  G.VOICE_ODDS = 0.5;          // a short line is spoken for real this often, when the repository has it (free)
  G.VOICE_NEW_ODDS = 0.15;     // and this often a line the repository lacks is made new (paid)
  if (G.ai) { G.ai.gaps.voice = 300000; G.ai.caps.voice = 12; G.ai.LABEL.voice = 'Creatures speaking aloud (Leonardo: rare and short)'; G.ai.lastAt.voice = Date.now(); }      // the first real line waits its five minutes too
  const made = {};           // key → 'ready' | 'none' | 'asked'
  let lastPlay = 0;
  const now = function () { return typeof performance !== 'undefined' ? performance.now() : Date.now(); };
  const SR = 16000, VOW = { a: 800, e: 560, i: 330, o: 480, u: 340 }, TONE = { sweet: 1.15, bright: 1.3, cheeky: 1.5, gruff: 0.62, wise: 0.85, tiny: 1.9 };
  /** a word as a short wave file (base64): a few syllables, each a buzz with a vowel's formant, gliding up for "!" and "?" */
  function babble(word, toneF, sizeF) {
    const letters = String(word).toLowerCase().replace(/[^a-z]/g, '') || 'la', nsyl = Math.max(1, Math.min(6, Math.round(letters.length / 2.3)));
    const N = Math.floor(SR * Math.min(0.9, 0.1 * nsyl + 0.12)), buf = new Float32Array(N), last = String(word).slice(-1), base = 300 * toneF * sizeF;
    let ph = 0;
    for (let s = 0; s < nsyl; s++) {
      const i0 = Math.floor(s * N / nsyl), i1 = Math.floor((s + 1) * N / nsyl), ch = letters.charCodeAt((s * 2) % letters.length), v = letters.charAt((s * 2 + 1) % letters.length);
      const formant = VOW[VOW[v] ? v : 'aeiou'.charAt(ch % 5)], f0 = base * (0.8 + ((ch * 7 + s * 13) % 10) / 16), f1 = f0 * (last === '!' ? 1.18 : last === '?' ? 1.28 : 0.92);
      for (let i = i0; i < i1; i++) {
        const u = (i - i0) / Math.max(1, i1 - i0), f = f0 + (f1 - f0) * u + 5 * Math.sin(i / SR * 44);
        ph += 6.2832 * f / SR; let x = 0;
        for (let k = 1; k <= 8; k++) { const w = Math.exp(-Math.pow((k * f - formant * 1.4) / (formant * 0.9), 2)); x += w * Math.sin(k * ph) / k; }
        buf[i] += x * Math.min(1, u * 12) * Math.min(1, (1 - u) * 6);
      }
    }
    let pk = 0; for (let i = 0; i < N; i++) pk = Math.max(pk, Math.abs(buf[i]));
    const bytes = new Uint8Array(44 + N * 2), dv = new DataView(bytes.buffer), W = function (o, s) { for (let i = 0; i < s.length; i++) bytes[o + i] = s.charCodeAt(i); };
    W(0, 'RIFF'); dv.setUint32(4, 36 + N * 2, true); W(8, 'WAVEfmt '); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true); dv.setUint32(24, SR, true); dv.setUint32(28, SR * 2, true); dv.setUint16(32, 2, true); dv.setUint16(34, 16, true); W(36, 'data'); dv.setUint32(40, N * 2, true);
    for (let i = 0; i < N; i++) dv.setInt16(44 + i * 2, Math.max(-1, Math.min(1, buf[i] / (pk || 1) * 0.8)) * 32767, true);
    let bin = ''; for (let i = 0; i < bytes.length; i += 4096) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 4096));
    return btoa(bin);
  }
  G.on('say', function (c, word) {
    if (G.mode !== 'play' || G.speed > 4 || !window.PXS) return;
    const mv = c.ph && c.ph.mv; if (!mv) return;
    const t = (mv.voice && mv.voice.tone) || 'bright', toneF = TONE[t] || 1.3, size = c.ph.r || 12, sizeF = Math.max(0.5, Math.min(2, Math.pow(12 / Math.max(6, size), 0.55)));
    const key = 'bab:' + t + ':' + Math.round(sizeF * 6) + ':' + String(word).toLowerCase().slice(0, 24);
    const t0 = now(); if (t0 - lastPlay < 900) return;
    const pan = G.W ? Math.max(-1, Math.min(1, (c.x / G.W.ww - 0.5) * 1.6)) : 0;
    if (made[key] !== 'ready') {
      try { const d = {}; d[key] = 'data:audio/wav;base64,' + babble(word, toneF, sizeF); PXS.define(d); made[key] = 'ready'; } catch (e) { made[key] = 'none'; console.error(e); return; }
    }
    lastPlay = t0;
    try { PXS.play(key, { volume: 0.5, pan: pan }); } catch (e) { console.error(e); }
    if (G.VOICE_REAL && G.host && G.host.ready && G.host.caps && G.host.caps.ai && G.ai.sound !== false && String(word).length <= 12 && Math.random() < G.VOICE_ODDS) realLine(c, word, mv, key);
  });
  // the real thing: rare and short (see above); G.ai.gaps.voice keeps it to one new line every five minutes at most
  function realLine(c, word, mv, babbleKey) {
    const tone = (mv.voice && mv.voice.tone) || 'bright', speed = (mv.voice && mv.voice.speed) || 1.25, key = 'say:' + tone + ':' + String(word).toLowerCase();
    if (made[key] === 'ready') { try { PXS.play(key, { speed: speed, rate: speed, volume: 0.9 }); } catch (e) { console.error(e); } return; }
    if (made[key] === 'asked' || made[key] === 'none') return;
    const take = function (r) {
      if (!r || !r.sound || !/^audio\/(mpeg|wav|ogg|mp4)$/.test(r.sound.mime) || typeof r.sound.b64 !== 'string' || r.sound.b64.length > 600000) return false;
      const def = {}; def[key] = 'data:' + r.sound.mime + ';base64,' + r.sound.b64;
      try { PXS.define(def); made[key] = 'ready'; if (c.say && !c.dead && c.say.w === word) PXS.play(key, { speed: speed, rate: speed, volume: 0.9 }); return true; } catch (e) { console.error(e); return false; }
    };
    // a new line, made and paid for: only some of the time, and within the gap and the budget
    const fresh = function () {
      if (Math.random() >= G.VOICE_NEW_ODDS || !G.ai.allow('voice')) { made[key] = 'missing'; return; }
      made[key] = 'asked';
      G.host.call('ai.voice', { text: word, tone: tone }, 60000).then(function (r) { G.ai.tally('voice', r && (r.source === 'leonardo' ? 'leonardo' : r.source), r && r.usd); if (!take(r)) made[key] = 'none'; }, function () { made[key] = 'none'; });
    };
    if (made[key] === 'missing') { fresh(); return; }      // the repository was asked before and had nothing
    made[key] = 'asked';
    G.host.call('ai.voice', { text: word, tone: tone, libraryOnly: true }, 30000).then(function (r) { if (take(r)) { G.voiceReused = (G.voiceReused || 0) + 1; return; } fresh(); }, function () { fresh(); });
  }
})();
