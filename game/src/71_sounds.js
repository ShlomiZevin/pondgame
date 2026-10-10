// ── What a star sounds like ──
// The moments of a colony (a building finished, a ship lifting off or coming down, a raid, the colony growing) and the AIR of each kind of star are sounds made
// by a sound model, asked of the server by NAME (the server writes what is asked of the model), made once and kept for good. Until one has come, and wherever
// there is no model to ask, the game's own plain sounds play as before (70_audio.js): nothing here is needed for the game to be heard.
(function () {
  'use strict';
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const ST = {}, MOMENTS = ['built', 'liftoff', 'landing', 'raid', 'grew'];
  let air = null, airName = '';
  // every sound is MEASURED when it comes (nobody listens to it first): how long, how loud, how much silence before it starts and, for a loop, whether its end meets
  // its beginning. So all of them play at one loudness, the air of a star quieter than what happens on it, and one that came out silent is left unused.
  /** a loop whose end runs into its beginning: the last part of the sound is faded out over its first part faded in, and it begins after that part (as a WAV) */
  function seamless(d, sr) { const X = Math.round(sr * 0.8), M = d.length - X, out = new Int16Array(M); for (let i = 0; i < M; i++) { let v = d[i + X]; const k = i - (M - X); if (k >= 0) { const t = k / X; v = v * Math.cos(t * 1.5708) + d[k] * Math.sin(t * 1.5708); } out[i] = Math.max(-32767, Math.min(32767, Math.round(v * 32767))); }
    return wav(out, sr); }
  /** a sound that begins with a silence, cut to where it begins */
  function trimmed(d, sr, from) { const M = d.length - from, out = new Int16Array(M); for (let i = 0; i < M; i++) out[i] = Math.max(-32767, Math.min(32767, Math.round(d[i + from] * 32767 * Math.min(1, i / 200)))); return wav(out, sr); }
  function wav(out, sr) { const M = out.length;
    const hd = new DataView(new ArrayBuffer(44)), W = function (o, t) { for (let i = 0; i < t.length; i++) hd.setUint8(o + i, t.charCodeAt(i)); }; W(0, 'RIFF'); hd.setUint32(4, 36 + M * 2, true); W(8, 'WAVEfmt '); hd.setUint32(16, 16, true); hd.setUint16(20, 1, true); hd.setUint16(22, 1, true); hd.setUint32(24, sr, true); hd.setUint32(28, sr * 2, true); hd.setUint16(32, 2, true); hd.setUint16(34, 16, true); W(36, 'data'); hd.setUint32(40, M * 2, true);
    const all = new Uint8Array(44 + M * 2); all.set(new Uint8Array(hd.buffer), 0); all.set(new Uint8Array(out.buffer), 44); let bin = ''; for (let i = 0; i < all.length; i += 32768) bin += String.fromCharCode.apply(null, all.subarray(i, i + 32768)); return 'data:audio/wav;base64,' + btoa(bin); }
  function measure(b64, loop) {
    return new Promise(function (res, rej) { try { const bin = atob(b64), buf = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i); const AC = window.OfflineAudioContext || window.webkitOfflineAudioContext; if (!AC) return rej();
      const done = function (a) { try { const d = a.getChannelData(0), n = d.length, sr = a.sampleRate; let sum = 0, peak = 0, lead = n; for (let i = 0; i < n; i++) { const v = d[i] < 0 ? -d[i] : d[i]; sum += v * v; if (v > peak) peak = v; if (lead === n && v > 0.02) lead = i; }
          const w = Math.min(n >> 2, Math.round(sr * 0.25)), e = function (o0) { let q = 0; for (let i = 0; i < w; i++) q += d[o0 + i] * d[o0 + i]; return Math.sqrt(q / Math.max(1, w)); }, e0 = e(0), e1 = e(n - w);
          const m = { secs: +(n / sr).toFixed(2), rms: +Math.sqrt(sum / Math.max(1, n)).toFixed(4), peak: +peak.toFixed(3), lead: +(lead / sr).toFixed(2), seam: +(Math.abs(e0 - e1) / Math.max(0.0001, e0 + e1)).toFixed(2) };
          if (loop && n > sr * 3) { try { m.url = seamless(d, sr); m.seam0 = m.seam; m.seam = 0; } catch (e2) { /* it loops as it came */ } }
          else if (!loop && lead > sr * 0.12 && lead < n - sr * 0.5) { try { m.url = trimmed(d, sr, Math.max(0, lead - Math.round(sr * 0.02))); m.lead0 = m.lead; m.lead = 0.02; } catch (e2) { /* it plays as it came */ } }      /* (a moment's sound must come AT its moment) */
          res(m); } catch (er) { rej(er); } };
      const pr = new AC(1, 44100, 44100).decodeAudioData(buf.buffer, done, rej); if (pr && pr.then) pr.then(done, rej); } catch (e) { rej(e); } });
  }
  function ask(name) {
    const s = ST[name], now = Date.now(); if (s && (s.v === 'asked' || s.v === 'ready' || (s.v === 'none' && now - s.at < 120000))) return;
    if (!(G.host && G.host.ready) || !window.PXS) return;
    const pay = !!(G.host.caps && G.host.caps.ai && G.ai.provider === 'server' && G.ai.sound !== false && G.ai.hasFuel() && G.ai.allow('sound'));
    ST[name] = { v: 'asked', at: now };
    G.host.call('sfx', { name: name, libraryOnly: !pay }, 120000).then(function (r) {
      if (!r || !r.sound || !/^audio\/(mpeg|wav|ogg|mp4)$/.test(r.sound.mime) || typeof r.sound.b64 !== 'string' || r.sound.b64.length > 700000) { ST[name] = { v: 'none', at: Date.now() }; return; }
      if (G.ai && G.ai.tally) G.ai.tally('sound', r.source === 'leonardo' ? 'leonardo' : 'library', r.usd);
      const def = {}; def['fx:' + name] = 'data:' + r.sound.mime + ';base64,' + r.sound.b64;
      const ready = function (m) { if (m && (m.secs < 0.3 || m.rms < 0.004)) { ST[name] = { v: 'none', at: Date.now(), why: 'silent' }; return; }      /* (a sound that came out empty is not used: the game's own plain sound plays instead) */
        if (m && m.url) { def['fx:' + name] = m.url; delete m.url; }      /* (the air of a star: made to loop without a seam) */
        try { PXS.define(def); ST[name] = { v: 'ready', at: Date.now(), m: m || null, gain: m ? Math.max(0.25, Math.min(1, (name.indexOf('amb.') === 0 ? 0.05 : 0.11) / m.rms)) : (name.indexOf('amb.') === 0 ? 0.5 : 0.85) }; G.emit('fx-ready', name); } catch (e) { ST[name] = { v: 'none', at: Date.now() }; console.error(e); } };
      measure(r.sound.b64, name.indexOf('amb.') === 0).then(ready, function () { ready(null); });
    }, function () { ST[name] = { v: 'none', at: Date.now() }; });
  }
  /** play the sound of a moment: true if it has one of its own (if not, it is asked for, and the caller's plain sound will do this time) */
  G.fxSound = function (name, opts) { const s = ST[name]; if (s && s.v === 'ready' && window.PXS) { try { PXS.play('fx:' + name, { volume: (opts && opts.volume !== undefined ? opts.volume : 1) * s.gain }); } catch (e) { console.error(e); } return true; } ask(name); return false; };
  /** what is known of each sound that has come: { name: { secs, rms, peak, lead (silence before it starts, s), seam (for a loop: how unlike its end is to its beginning, 0 the same), gain } } (for the tests: nobody here can hear) */
  G.fxFacts = function () { const o = {}; for (const k in ST) if (ST[k].v === 'ready') o[k] = Object.assign({ gain: +ST[k].gain.toFixed(2) }, ST[k].m || {}); else if (ST[k].why) o[k] = { unused: ST[k].why }; return o; };
  /** ask for a sound by name before it is wanted (so it is there when its moment comes) */
  G.fxWant = ask;
  const quiet = function () { return G.mode !== 'play' || (G.isBlocked && G.isBlocked()); };
  // the air of the star you are on: it takes the place of the sound of water
  function airFor() {
    if (!window.PXS || !G.FLAT || !G.W || G.W.title || !G.terrainOf) return; const name = 'amb.' + G.terrainOf(G.W).id, s = ST[name];
    if (!s || s.v !== 'ready') { ask(name); return; } if (airName === name && air) return;
    try { if (air && air.stop) air.stop(); if (G.hushWater) G.hushWater(); air = PXS.loop('fx:' + name, { volume: s.gain }); airName = name; } catch (e) { console.error(e); }
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
