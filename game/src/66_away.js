// ── The pond keeps living while you are away. You come back as nature. ──
// A page cannot run when it is closed, so on return the pond catches up: the time you were gone is
// simulated (up to a cap) with the same rules, and a short report says what happened.
(function () {
  'use strict';
  const el = G.el, $ = G.$, esc = G.escapeHtml;
  const MAX_AWAY = 32 * 150;          // at most 150 generations of catching up (about 80 minutes of pond time)
  const MIN_AWAY = 25;                // seconds; shorter than this is just looking away
  let job = null, hiddenAt = 0;
  G.catching = false;

  G.startCatchUp = function (seconds, label) {
    const W = G.W;
    if (!W || W.title || W.extinct || !(seconds >= MIN_AWAY)) return false;
    const target = Math.min(seconds, MAX_AWAY);
    job = {
      target: target, done: 0, real: seconds, label: label || 'away',
      gen0: W.gen, sp0: new Set(W.species.map(function (s) { return s.id; })), disc0: W.discLog.length, fos0: W.fossils.length,
      pop0: W.cre.length, fit0: W.hist.length ? W.hist[W.hist.length - 1].avg : 0, t0: performance.now(), skipped: false,
    };
    G.catching = true;
    G.prevMode = G.mode;
    G.mode = 'catchup';
    G.closeMenu && G.closeMenu();
    G.closeModal && G.closeModal();
    const o = el('div', 'overlay', '', $('ui')); o.id = 'catchup'; o.style.zIndex = 20;
    o.innerHTML = '<div class="glass sheet" style="width:min(460px,100%);align-items:center;text-align:center"><h2 style="font-size:18px;letter-spacing:.2em;margin-bottom:8px">THE POND KEPT GOING</h2>' +
      '<small id="cuLine" style="margin-bottom:12px"></small><div class="meter" style="width:100%;height:10px"><i id="cuBar" style="width:0;background:linear-gradient(90deg,#ff7eb6,#f6d365,#33d6a6)"></i></div>' +
      '<div class="ilabel" id="cuGen" style="margin:10px 0 12px">generation ' + W.gen + '</div><button class="btn sm" id="cuSkip">SKIP AHEAD</button></div>';
    job.el = o;
    $('cuLine').textContent = 'You were away ' + fmtTime(seconds) + '. Life went on without you…';
    $('cuSkip').onclick = function () { job.skipped = true; };
    return true;
  };

  function fmtTime(s) {
    s = Math.round(s);
    if (s < 90) return s + ' seconds';
    if (s < 5400) return Math.round(s / 60) + ' minutes';
    if (s < 172800) return (s / 3600).toFixed(1).replace('.0', '') + ' hours';
    return Math.round(s / 86400) + ' days';
  }

  function finish() {
    const W = G.W, j = job;
    job = null;
    G.catching = false;
    G.mode = G.prevMode || 'play';
    if (j.el) j.el.remove();
    const gens = W.gen - j.gen0;
    const last = W.hist.length ? W.hist[W.hist.length - 1] : null;
    if (W.extinct) { G.emit('extinct'); return; }
    if (gens < 1) return;
    G.showAwayReport({
      gens: gens, alive: W.cre.length, fitness: last ? last.avg : 0,
      newSpecies: W.species.filter(function (s) { return !j.sp0.has(s.id); }).length,
      diedOut: W.species.filter(function (s) { return s.extinct && s.diedGen > j.gen0; }).length,
      discoveries: W.discLog.slice(j.disc0).map(function (d) { return d.text; }),
      capped: j.target < j.real, capGens: Math.round(MAX_AWAY / 32),
    });
  }

  // what happened while the player was away (made here, or by the server)
  G.showAwayReport = function (r) {
    const W = G.W;
    const gens = r.gens, newSp = r.newSpecies || 0, died = r.diedOut || 0, found = r.discoveries || [];
    const rows = [
      '<b>' + gens + '</b> generations passed' + (r.capped ? ' <small>(the pond catches up at most ' + (r.capGens || 150) + ' generations)</small>' : ''),
      '<b>' + (r.alive !== undefined ? r.alive : W.cre.length) + '</b> creatures alive' + (r.fitness ? ' · average fitness <b>' + (+r.fitness).toFixed(2) + '</b>' : ''),
      newSp ? '<b>' + newSp + '</b> new species appeared' : 'No new species appeared',
      died ? '<b>' + died + '</b> species died out' : 'No species died out',
    ];
    const disc = found.length ? '<div class="ilabel" style="margin-top:12px">Evolution invented</div>' + found.slice(0, 5).map(function (t) { return '<div style="margin:4px 0;color:var(--gold)">' + esc(t) + '</div>'; }).join('') : '';
    const o = el('div', 'overlay', '', $('ui')); o.id = 'awayReport'; o.style.zIndex = 15;
    o.innerHTML = '<div class="glass sheet" style="width:min(480px,100%);align-items:flex-start"><h2 style="font-size:17px;letter-spacing:.2em;margin-bottom:10px">WHILE YOU WERE AWAY</h2>' + rows.map(function (r) { return '<div style="margin:5px 0;line-height:1.4">' + r + '</div>'; }).join('') + disc +
      '<div style="margin-top:14px;align-self:center"><button class="btn big" id="arGo">SEE THE POND</button></div></div>';
    $('arGo').onclick = function () { o.remove(); G.sfx && G.sfx('click'); G.hint('nature', 'You are nature: change the world and see how life answers.', 6000); };
    G.log && G.log('sel', 'Away', gens + ' generations passed while you were gone.');
    G.emit('catchup-done', gens);
  };

  G.addSystem({
    name: 'away',
    update: function () {
      if (!job) return;
      const W = G.W;
      const t0 = performance.now();
      // spend about 16 ms of every frame catching up
      while (job.done < job.target && !job.skipped && !W.extinct && performance.now() - t0 < 16) {
        for (let i = 0; i < 20 && job.done < job.target; i++) { G.step(0.1); job.done += 0.1; }
      }
      const bar = $('cuBar'), gen = $('cuGen');
      if (bar) bar.style.width = Math.min(100, 100 * job.done / job.target).toFixed(1) + '%';
      if (gen) gen.textContent = 'generation ' + W.gen + ' · ' + W.cre.length + ' alive';
      if (job.done >= job.target || job.skipped || W.extinct) finish();
    },
  });

  // leaving the tab and coming back counts as being away too
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { hiddenAt = Date.now(); if (G.mode === 'play') G.saveNow && G.saveNow(); return; }
    if (hiddenAt && G.mode === 'play' && !G.paused) {
      const s = (Date.now() - hiddenAt) / 1000;
      hiddenAt = 0;
      if (s >= MIN_AWAY) G.startCatchUp(s);
    }
    hiddenAt = 0;
  });
})();
