// ── The eye for beauty: the AI looks at the creatures and grades them ──
// This is the heart of the game: creatures are meant to become lovable, and something has to say what lovable is.
// The game draws the kinds living in the pond onto one sheet, exactly as the player sees them, and the AI LOOKS at the
// picture. For each it gives a grade, says why in a few words, and names one change that would make it nicer. The grade is
// most of a creature's charm, and charm decides who finds a mate and who is passed over, so the pond drifts towards
// creatures worth collecting. The named change becomes a likelier mutation in that kind's children: the judge nudges, the
// genes still have to carry it. New ideas (a shape of body, a kind of part) are looked over the same way before they are let in.
// What the player keeps counts above any grade. It is asked by the clock and within a budget, and every call is costed.
(function () {
  'use strict';
  let busy = false;

  G.cleanJudge = function (raw) {
    const list = raw && Array.isArray(raw.scores) ? raw.scores : null;
    if (!list) return null;
    const out = [], NUD = G.form.NUDGES || [];
    for (let i = 0; i < list.length && i < 8; i++) {
      const q = list[i] || {}; let sc = +q.score;
      if (!isFinite(sc)) continue;
      if (sc > 1) sc /= 10;
      out.push({ id: q.id | 0, score: G.clamp(sc, 0, 1), why: String(q.why || '').replace(/[<>]/g, '').slice(0, 140), fix: NUD.indexOf(q.fix) >= 0 ? q.fix : '' });
    }
    return out.length ? out : null;
  };

  /** the creatures drawn side by side, numbered, as a picture the AI can look at (base64 JPEG), or null where nothing can be drawn */
  G.sheet = function (forms) {
    if (typeof document === 'undefined' || !forms.length) return null;
    const n = forms.length, cols = n <= 2 ? n : n <= 4 ? 2 : 3, rows = Math.ceil(n / cols), CW = 226, CH = 232;
    const cv = document.createElement('canvas'); cv.width = cols * CW; cv.height = rows * CH;
    const ctx = cv.getContext('2d');
    ctx.fillStyle = '#0d2f3d'; ctx.fillRect(0, 0, cv.width, cv.height);
    for (let i = 0; i < n; i++) {
      const x = (i % cols) * CW, y = Math.floor(i / cols) * CH;
      ctx.save(); ctx.translate(x + CW / 2, y + 190 * 0.62 + 6); ctx.scale(0.62, 0.62);
      try { G.form.portrait(ctx, forms[i], 1.3 + i, {}); } catch (e) { console.error(e); }
      ctx.restore();
      ctx.fillStyle = 'rgba(7,18,31,0.85)'; ctx.beginPath(); ctx.arc(x + 22, y + 22, 15, 0, 6.2832); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = '700 19px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(i + 1), x + 22, y + 23);
      if (i % cols) { ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(x, y, 1, CH); }
    }
    try { return cv.toDataURL('image/jpeg', 0.86).split(',')[1] || null; } catch (e) { return null; }
  };
  const live = function () { return G.mode === 'play' && !G.catching && G.ai && G.ai.provider === 'server' && G.ai.available && G.ai.available(); };
  const ask = function (forms, names, extra) {
    const img = G.sheet(forms);
    if (!img) return Promise.resolve(null);
    const W = G.W, input = { image: img, mime: 'image/jpeg', admired: W ? G.form.fashionText(W.fashion) : '', world: W && W.press ? W.press.list.slice(0, 4) : [],
      creatures: forms.map(function (f, i) { return { id: i + 1, name: names[i] || '', kind: G.form.kind(f).full, body: G.form.facts(f).join(', ') }; }) };
    if (extra) for (const k in extra) input[k] = extra[k];
    return G.ai.ask('judge', input).then(G.cleanJudge);
  };

  /** a new idea, drawn on a body or two and looked at before it is let into the pond. Resolves { score, why } or null (not asked) */
  G.lookOver = function (forms, what) {
    if (!live() || !G.ai.allow('check')) return Promise.resolve(null);
    return ask(forms, [], { check: what, kind: 'check' }).then(function (sc) {
      if (!sc) return null;
      let s = 0; for (let i = 0; i < sc.length; i++) s += sc[i].score;
      return { score: s / sc.length, why: sc[0].why };
    }, function () { return null; });
  };

  // once a generation: at most one question, about several kinds on one sheet, and only when the budget allows
  G.judgeTick = function (gen) {
    const W = G.W;
    if (!W || W.title || busy || !live()) return;
    // who needs a grade: established kinds never graded, or ones whose body has changed since
    const kinds = W.species.filter(function (s) { return !s.extinct && s.n >= 4 && s.rep && gen - s.born >= 1; }).sort(function (a, b) { return b.n - a.n; });
    const due = kinds.filter(function (s) { return !s.judge || s.judge.est || (gen - s.judge.gen >= 8 && G.fdist(G.form.features(s.rep.f), s.judge.fv) > 0.9); }).slice(0, 6);
    if (!due.length || !G.ai.allow('judge')) return;
    busy = true;
    const forms = due.map(function (s) { return s.rep.f; });
    ask(forms, due.map(function (s) { return s.name; }), null).then(function (scores) {
      busy = false;
      if (G.W !== W || !scores) return;
      for (let i = 0; i < scores.length; i++) {
        const s = due[scores[i].id - 1];
        if (!s || s.extinct || !s.rep) continue;
        s.judge = { score: scores[i].score, why: scores[i].why, fix: scores[i].fix, gen: W.gen, fv: G.form.features(s.rep.f) };
        G.emit('judged', s);
      }
    }, function () { busy = false; });
  };
  G.on('new-pond', function () { busy = false; });
})();
