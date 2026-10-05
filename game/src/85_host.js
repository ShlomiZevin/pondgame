// ── Talking to the page around the game (and through it, to the Primordia server) ──
// The game runs in a sandbox with no network, so it asks the host page with postMessage:
//   game → host   { __primordia: 1, id, op, payload }      op: hello | ai.thing | ai.ideas | pond.get | pond.put | pond.del
//   host → game   { __primordia: 1, id, ok, data, error }  the answer to one request
//   host → game   { __primordia: 1, op: 'host', caps: { ai: true, pond: true } }   "I can do these"
// With no host (a plain file, or a site that does not know this) nothing happens and the game plays alone.
(function () {
  'use strict';
  const H = G.host = { ready: false, caps: {}, pending: {}, nextId: 1 };

  H.call = function (op, payload, ms) {
    return new Promise(function (resolve, reject) {
      if (!window.parent || window.parent === window) { reject(new Error('no host')); return; }
      const id = H.nextId++;
      const timer = setTimeout(function () { delete H.pending[id]; reject(new Error('timeout')); }, ms || 20000);
      H.pending[id] = { resolve: resolve, reject: reject, timer: timer };
      try { window.parent.postMessage({ __primordia: 1, id: id, op: op, payload: payload }, '*'); }
      catch (e) { clearTimeout(timer); delete H.pending[id]; reject(e); }
    });
  };

  window.addEventListener('message', function (e) {
    const d = e.data;
    if (!d || d.__primordia !== 1 || e.source !== window.parent) return;
    if (d.op === 'host') {
      if (typeof d.fuel === 'number') G.ai.fuel = Math.max(0, Math.floor(d.fuel));
      const first = !H.ready;            // a host may announce itself more than once
      H.ready = true; H.caps = d.caps || {};
      if (H.caps.ai) G.ai.provider = 'server';
      if (first) {
        G.emit('host-ready', H.caps);
        if (H.caps.ai) H.call('ai.models', {}).then(function (r) {
          if (!r || !Array.isArray(r.models)) return;
          G.ai.models = r.models.filter(function (m) { return m && typeof m.id === 'string'; }).slice(0, 12).map(function (m) { return { id: m.id.slice(0, 60), label: String(m.label || m.id).slice(0, 40) }; });
          if (!G.ai.labelOf(G.ai.model)) G.ai.model = typeof r.default === 'string' && G.ai.labelOf(r.default) ? r.default : '';
          G.ai.sound = !!r.sound;
          G.ai.paintOn = !!r.paint;
        }).catch(function () { /* an older host: one model, no choice */ });
      }
      return;
    }
    if (d.op === 'fuel') { G.ai.fuel = typeof d.fuel === 'number' ? Math.max(0, Math.floor(d.fuel)) : null; return; }     // the host topped it up (or lifted the limit)
    const p = H.pending[d.id];
    if (!p) return;
    clearTimeout(p.timer); delete H.pending[d.id];
    if (d.ok) p.resolve(d.data); else { const er = new Error(d.error || 'failed'); er.refused = d.error === 'refused'; er.code = d.error; p.reject(er); }
  });

  // ── the pond lives on the server too ──
  let pushTimer = 0;
  function push() {
    pushTimer = 0;
    if (!H.ready || !H.caps.pond || G.mode !== 'play' || !G.collectSave) return;
    const save = G.collectSave();
    if (save) H.call('pond.put', { save: save }).catch(function () { /* the local save still has it */ });
  }
  G.on('saved', function () {
    if (!H.ready || !H.caps.pond || pushTimer) return;
    pushTimer = setTimeout(push, 3000);     // a burst of saves is one request
  });
  // tell the host each time fuel is spent, so it can charge for it
  G.on('fuel', function (left, kind) { try { window.parent.postMessage({ __primordia: 1, op: 'fuel.spent', kind: kind, left: left }, '*'); } catch (e) { /* no host */ } });
  G.on('save-erased', function () { if (H.ready && H.caps.pond) H.call('pond.del', {}).catch(function () {}); });

  G.on('host-ready', function (caps) {
    if (!caps.pond) return;
    // ask for the pond as it is now; if the server's is newer than this browser's, carry on from that one
    H.call('pond.get', {}, 45000).then(function (res) {
      if (!res || !res.save || G.mode === 'play' || G.mode === 'catchup') return;
      const local = G.pendingSave;
      if (!G.validSave(res.save)) return;
      if (local && (+local.at || 0) > (+res.save.at || 0) + 1000) return;
      G.pendingSave = res.save;
      G.pendingReport = res.report && res.report.gens > 0 ? res.report : null;
      if (G.showContinue) G.showContinue(true);
    }).catch(function () { /* offline: the browser's own save is used */ });
  });

  // a sound of its own for each thing: asked for once, kept, and played through Plaxzy Sound
  const SND = {};
  G.thingSound = function (name) {
    const k = String(name || '').toLowerCase();
    if (SND[k] === 'ready' && window.PXS) { try { PXS.play('thing:' + k, { volume: 0.9 }); } catch (e) { console.error(e); } return true; }
    return false;
  };
  G.on('placed', function (info) {
    const k = String(info.name || '').toLowerCase();
    if (G.thingSound(k) || SND[k] || !H.ready || !G.ai.sound || !window.PXS || !G.ai.allow('sound')) return;
    SND[k] = 'asked';
    H.call('ai.sound', { word: info.name, note: info.note }, 90000).then(function (r) {
      G.ai.tally('sound', r && r.source, r && r.usd);
      if (!r || !r.sound || !/^audio\/(mpeg|wav|ogg|mp4)$/.test(r.sound.mime) || typeof r.sound.b64 !== 'string' || r.sound.b64.length > 600000) { SND[k] = 'none'; return; }
      const def = {}; def['thing:' + k] = 'data:' + r.sound.mime + ';base64,' + r.sound.b64;
      try { PXS.define(def); SND[k] = 'ready'; G.thingSound(k); } catch (e) { SND[k] = 'none'; console.error(e); }
    }, function () { SND[k] = 'none'; });
  });

  G.addSystem({
    name: 'host',
    init: function () {
      if (window.parent && window.parent !== window) {
        const hello = function (n) {
          if (H.ready || n > 4) return;
          try { window.parent.postMessage({ __primordia: 1, op: 'hello' }, '*'); } catch (e) { /* no host */ }
          setTimeout(function () { hello(n + 1); }, 1200);
        };
        hello(0);
      }
    },
  });
})();
