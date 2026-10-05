// ── The judge: what the AI makes of each kind's looks ──
// Bodies are grown from genes and drawn by the game. The AI's part is taste: now and then it is shown the kinds
// living in the pond (as plain facts about their bodies) and says how striking each one is, and why. That verdict
// becomes half of the kind's charm, so the good-looking ones find mates more easily and the pond drifts towards
// creatures worth looking at. It is asked by the clock and within a budget, never once per generation, and
// without a server the pond simply goes by its own taste.
(function () {
  'use strict';
  let busy = false;

  G.cleanJudge = function (raw) {
    const list = raw && Array.isArray(raw.scores) ? raw.scores : null;
    if (!list) return null;
    const out = [];
    for (let i = 0; i < list.length && i < 6; i++) {
      const q = list[i] || {}, sc = +q.score;
      if (!isFinite(sc)) continue;
      out.push({ id: q.id | 0, score: G.clamp(sc, 0, 1), why: String(q.why || '').replace(/[<>]/g, '').slice(0, 140) });
    }
    return out.length ? out : null;
  };

  // once a generation: at most one question, about a few kinds at once, and only when the AI budget allows
  G.judgeTick = function (gen) {
    const W = G.W;
    if (!W || W.title || busy || G.mode !== 'play' || G.catching) return;
    if (!(G.ai && G.ai.provider === 'server' && G.ai.available && G.ai.available())) return;
    // who needs a verdict: established kinds never judged, or ones whose body has changed a lot since
    const live = W.species.filter(function (s) { return !s.extinct && s.n >= 6 && s.rep && gen - s.born >= 2; }).sort(function (a, b) { return b.n - a.n; });
    const due = live.filter(function (s) { return !s.judge || (gen - s.judge.gen >= 15 && G.fdist(G.form.features(s.rep.f), s.judge.fv) > 1.2); }).slice(0, 4);
    if (!due.length || !G.ai.allow('judge')) return;
    const input = { admired: G.form.fashionText(W.fashion), creatures: due.map(function (s) { return { id: s.id, name: s.name, kind: G.form.kind(s.rep.f).full, body: G.form.facts(s.rep.f).join(', ') }; }) };
    busy = true;
    G.ai.ask('judge', input).then(function (res) {
      busy = false;
      const scores = G.cleanJudge(res);
      if (G.W !== W || !scores) return;
      for (let i = 0; i < scores.length; i++) {
        const s = G.speciesById(scores[i].id);
        if (!s || !s.rep) continue;
        s.judge = { score: scores[i].score, why: scores[i].why, gen: W.gen, fv: G.form.features(s.rep.f) };
        G.emit('judged', s);
      }
    }, function () { busy = false; });
  };
})();
