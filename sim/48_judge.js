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
  G.sheet = function (forms, o) {
    if (typeof document === 'undefined' || !forms.length) return null;
    o = o || {};
    const rf = o.refs | 0, n = forms.length, cols = o.cols || (n <= 2 ? n : n <= 4 ? 2 : 3), rows = Math.ceil(n / cols), CW = o.cw || 226, CH = o.ch || 232, SC = o.sc || 0.62;
    const cv = document.createElement('canvas'); cv.width = cols * CW; cv.height = rows * CH;
    const ctx = cv.getContext('2d');
    ctx.fillStyle = '#0d2f3d'; ctx.fillRect(0, 0, cv.width, cv.height);
    for (let i = 0; i < n; i++) {
      const x = (i % cols) * CW, y = Math.floor(i / cols) * CH;
      ctx.save(); ctx.translate(x + CW / 2, y + 190 * SC + 6); ctx.scale(SC, SC);
      try { G.form.portrait(ctx, forms[i], 1.3 + i, {}); } catch (e) { console.error(e); }
      ctx.restore();
      ctx.fillStyle = i < rf ? 'rgba(160,120,10,0.95)' : 'rgba(7,18,31,0.85)'; ctx.beginPath(); ctx.arc(x + 22, y + 22, 15, 0, 6.2832); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = '700 19px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(i < rf ? '★' : String(i - rf + 1), x + 22, y + 23);
      if (i < rf) { ctx.strokeStyle = 'rgba(255,205,70,0.55)'; ctx.lineWidth = 3; ctx.strokeRect(x + 2, y + 2, CW - 4, CH - 4); }
      if (i % cols) { ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(x, y, 1, CH); }
    }
    try { return cv.toDataURL('image/jpeg', 0.86).split(',')[1] || null; } catch (e) { return null; }
  };
  /** the look the owner loves, as four hand-set characters: they stand in the first row of every sheet as what a 9 looks like */
  G.referenceForms = function () {
    if (G._refForms) return G._refForms;
    const R1 = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1], leg = { k: 0, a: 0, b: 0, e: 1, l: 0.7, w: 0.6, j: 2, g: 0.2, c: 0, t: 3, p: 0.5, on: -1 }, ear = { k: 7, a: 1, b: 1, e: 1, l: 0.5, w: 0.5, j: 2, g: 0, c: 0, t: 0, p: 0.5, on: -1 };
    const mk = function (hue, hd, es, eg, ey, ep, bl, sm, bs, rules) {
      const f = G.form.cell(hue); f.hue2 = 60; f.en = 2; f.es = es; f.hd = hd; f.eg = eg; f.ey = ey; f.ep = ep; f.bl = bl; f.sm = sm; f.seed = 7 + Math.round(hue);
      f.bd = { v: 0, e: 1, m: [{ r: R1.slice(), s: 1, on: -1, at: 0, d: 1, pr: 0, h: 0, lb: 0, la: 0 }, { r: R1.slice(), s: bs, on: 0, at: -Math.PI / 2, d: 0.85, pr: 0, h: 0, lb: 0, la: 0 }] };
      f.rules = (rules || []).map(function (q) { return Object.assign({}, q); });
      return G.form.fix(f);
    };
    const arm = { k: 0, a: 0, b: 0, e: 1, l: 0.55, w: 0.5, j: 2, g: 0.3, c: 0, t: 1, p: 0.5, on: -1 };
    return (G._refForms = [mk(330, 1.8, 0.7, 0.56, 0.0, 0.64, 0.7, 0.8, 0.7, [leg, arm]), mk(120, 1.8, 0.7, 0.56, 0.0, 0.64, 0.7, 0.8, 0.68, [leg, arm]), mk(260, 1.8, 0.75, 0.56, 0.0, 0.66, 0.8, 0.8, 0.68, [leg, arm, ear]), mk(30, 2.0, 0.8, 0.6, -0.05, 0.7, 0.8, 0.9, 0.7, [leg, arm])]);
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
    if (G.watchTick) return;                    // the watcher grades living creatures one by one instead
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
        if (W.taste && s.rep.f.bd) G.form.learn(W.taste, s.rep.f, scores[i].score, 0.05);
      }
      G.judgeMean();
      if (W.taste) for (let i = 0; i < W.cre.length; i++) if (W.cre[i].g.f.bd) W.cre[i].ph.charm = G.form.beauty(W.cre[i].g.f, W.taste);
    }, function () { busy = false; });
  };
  /** the middle of the grades of the kinds alive now: a grade is weighed against this */
  G.judgeMean = function () { const W = G.W; if (!W) return; let s = 0, n = 0; for (let i = 0; i < W.species.length; i++) { const q = W.species[i]; if (!q.extinct && q.judge && q.n > 0) { s += q.judge.score * q.n; n += q.n; } } W.jMean = n ? s / n : undefined; };
  G.on('scored', function () { G.judgeMean(); });
  // ── the watcher ──
  // Every few seconds it is shown a sheet of living creatures nobody has looked at yet: first those whose marks are oldest guesses, and
  // those the pond believes are its best (a guess must be checked before it is bred from). Its marks become those creatures' own.
  let watching = false;
  G.WATCH_BUDGET = 0.3;          // dollars a session may spend on looking at living creatures before the watcher goes quiet
  const clamp01 = function (v) { return v < 0 ? 0 : v > 1 ? 1 : v; };
  const c01 = function (v) { v = +v; return isFinite(v) ? G.clamp(v, 0, 1) : NaN; };
  G.eyeGrade = function (c, g) { c.real = { b: g.b, w: g.w, why: g.why || '', fix: g.fix || '', gen: G.W.gen }; c.eb = g.b; c.ew = g.w; c.st = 0; c.ph.charm = g.b; c.ph.whole = g.w; };
  G.watchPick = function (max) {
    const W = G.W, L = [], seen = W.eyeSeen || {};
    for (let i = 0; i < W.cre.length; i++) { const c = W.cre[i]; if (c.dead || c.real || !c.g.f.bd) continue; const hit = seen[G.form.key(c.g.f)]; if (hit) { G.eyeGrade(c, hit); continue; } L.push(c); }
    L.sort(function (a, b) { return ((b.st || 0) * 0.5 + 6 * G.charmOf(b)) - ((a.st || 0) * 0.5 + 6 * G.charmOf(a)); });
    // one creature to a species (the one the pond thinks best: it is the one that will breed), and a species is not looked at again for a few generations
    const out = [], kinds = {}, sl = W.spLook = W.spLook || {};
    for (let i = 0; i < L.length && out.length < max; i++) { const c = L[i], k = c.sp ? 's' + c.sp : G.shapeOf(c.g) + '|' + G.hueOf(c.g); if (kinds[k] || (c.sp && W.gen - (sl[c.sp] === undefined ? -99 : sl[c.sp]) < 6)) continue; kinds[k] = 1; out.push(c); }
    // a pond of two or three species still gets a look: the look-alike kinds within them stand in
    if (out.length < 4) { const lk = {}; for (let i = 0; i < L.length && out.length < 5; i++) { const c = L[i], k = G.shapeOf(c.g) + '|' + G.hueOf(c.g); if (lk[k] || out.indexOf(c) >= 0) continue; lk[k] = 1; out.push(c); } }
    return out;
  };
  G.watchTick = function () {
    const W = G.W;
    if (!W || W.title || watching || !live() || W.cre.length < 4) return;
    const picks = G.watchPick(12);
    // the watcher's own spending slows it as it goes, whatever model it is: looking often at first, when the pond is learning what is nice,
    // then rarely. A session's looks cost about 20 to 30 cents in all (WATCH_BUDGET); once spent it looks only now and then.
    { const sp = G.ai.count && G.ai.count.watch ? G.ai.count.watch.usd || 0 : 0, B = G.WATCH_BUDGET; G.ai.gaps.watch = sp < B * 0.35 ? 5000 : sp < B * 0.7 ? 9000 : sp < B ? 16000 : 60000; }
    if (picks.length < 4 || !G.ai.allow('watch')) return;
    const refs = G.referenceForms(), img = G.sheet(refs.concat(picks.map(function (c) { return c.g.f; })), { cw: 176, ch: 182, sc: 0.48, cols: 4, refs: refs.length });
    if (!img) return;
    watching = true;
    G.ai.ask('judge', { image: img, mime: 'image/jpeg', lean: 1, count: picks.length, refs: refs.length, kind: 'watch' }).then(function (res) {
      watching = false;
      if (G.W !== W || !res || !Array.isArray(res.scores)) return;
      if (!W.eyeSeen || (W.eyeKeys || 0) > 700) { W.eyeSeen = {}; W.eyeKeys = 0; }
      let n = 0;
      for (let i = 0; i < res.scores.length; i++) {
        const s = res.scores[i], c = picks[(s.id | 0) - 1], g = { b: c01(s.score), w: c01(s.whole), why: String(s.why || '').replace(/[<>]/g, '').slice(0, 70), fix: (G.form.NUDGES || []).indexOf(s.fix) >= 0 ? s.fix : '' };
        if (!c || isNaN(g.b) || isNaN(g.w)) continue;
        W.eyeSeen[G.form.key(c.g.f)] = g; W.eyeKeys++; n++;
        if (g.fix) { W.advice = (W.advice || []).filter(function (a) { return W.gen - a.gen <= 40; }); W.advice.push({ fix: g.fix, gen: W.gen, fv: c.fv || (c.fv = G.features(c.g)) }); if (W.advice.length > 60) W.advice.shift(); }
        if (!c.dead) G.eyeGrade(c, g);
        // the look is remembered, and every living creature that resembles this one is moved towards what the watcher said of it
        { const fv = c.fv || G.features(c.g); (W.eyeBank = W.eyeBank || []).push({ fv: fv, b: g.b, w: g.w, f: c.g.f.bd ? c.g.f : null, x: c.g.f.bd ? G.form.looks(c.g.f) : null, v0: c.g.f.bd ? G.form.whole(c.g.f).v : 0.3 }); if (W.eyeBank.length > 160) W.eyeBank.shift();
          for (let k = 0; k < W.cre.length; k++) { const x = W.cre[k]; if (x === c || x.real || x.dead || !x.g.f.bd || x.eb === undefined) continue; const d = G.fdist(fv, x.fv || (x.fv = G.features(x.g))), wt = Math.exp(-d * d); if (wt < 0.05) continue; x.eb += 0.8 * wt * (g.b - x.eb); x.ew += 0.8 * wt * (g.w - x.ew); x.st = Math.min(x.st || 0, 1); x.ph.charm = x.eb; x.ph.whole = x.ew; } }
        if (W.taste) G.form.learn(W.taste, c.g.f, g.b, 0.03);          // the pond's own guess is corrected by every look
        const sp = c.sp ? G.speciesById(c.sp) : null;
        if (c.sp) (W.spLook = W.spLook || {})[c.sp] = W.gen;
        // the best the watcher has really seen are kept (a hall of fame): they can be bred again if the pond loses what they had
        if (c.g.f.bd) { const sc = (g.b + g.w) / 2, H = W.hall = W.hall || [], fvh = c.fv || G.features(c.g); let near = -1; for (let h = 0; h < H.length; h++) if (G.fdist(fvh, H[h].fv) < 0.8) { near = h; break; }
          if (near >= 0) { if (sc > H[near].s) H[near] = { g: G.cloneGenome(c.g), fv: fvh, s: sc, gen: W.gen }; } else if (H.length < 8) H.push({ g: G.cloneGenome(c.g), fv: fvh, s: sc, gen: W.gen }); else { let lo = 0; for (let h = 1; h < H.length; h++) if (H[h].s < H[lo].s) lo = h; if (sc > H[lo].s) H[lo] = { g: G.cloneGenome(c.g), fv: fvh, s: sc, gen: W.gen }; } }
        if (sp && (!sp.judge || sp.judge.est || g.b + g.w >= sp.judge.score + (sp.judge.whole || 0) - 0.05 || W.gen - sp.judge.gen > 5)) sp.judge = { score: g.b, whole: g.w, why: g.why, fix: g.fix, gen: W.gen, fv: sp.fv ? sp.fv.slice() : [] };
      }
      W.eyeN = (W.eyeN || 0) + n;
      // the pond's own guess is taught by everything the watcher has really said: a few passes over its recent marks, newest last,
      // so the guess made for the creatures nobody has looked at keeps up with the watcher's taste
      if (W.taste && W.eyeBank && W.eyeBank.length >= 8) {
        for (let ep = 0; ep < 3; ep++) for (let i = 0; i < W.eyeBank.length; i++) { const e = W.eyeBank[i]; if (e.f && e.x) { G.form.learn(W.taste, e.f, e.b, 0.025, e.x); G.form.learnWhole(W.taste, e.x, e.w, 0.03, e.v0); } }
        for (let k = 0; k < W.cre.length; k++) { const x = W.cre[k]; if (x.real || x.dead || !x.g.f.bd) continue; let nb = G.form.beauty(x.g.f, W.taste); const fv = x.fv || (x.fv = G.features(x.g)); let sw = 0, sb = 0; for (let i = 0; i < W.eyeBank.length; i++) { const q = W.eyeBank[i], d = G.fdist(fv, q.fv), wt = Math.exp(-d * d); if (wt < 0.03) continue; sw += wt; sb += wt * q.b; } if (sw > 0.15) nb += Math.min(0.85, sw / (sw + 0.6)) * (sb / sw - nb); x.eb = clamp01(nb); x.ph.charm = x.eb; let nw = G.form.wholeBelief(x.g.f, W.taste); let sw2 = 0, sh2 = 0; for (let i = 0; i < W.eyeBank.length; i++) { const q = W.eyeBank[i], d = G.fdist(fv, q.fv), wt = Math.exp(-d * d); if (wt < 0.03) continue; sw2 += wt; sh2 += wt * q.w; } if (sw2 > 0.15) nw += Math.min(0.85, sw2 / (sw2 + 0.6)) * (sh2 / sw2 - nw); x.ew = clamp01(nw); x.ph.whole = x.ew; }
      }
      G.emit('watched', n);
    }, function () { watching = false; });
  };
  if (typeof document !== 'undefined' && typeof setInterval === 'function') setInterval(function () { try { G.watchTick(); } catch (e) { console.error(e); } }, 2000);
  G.on('new-pond', function () { busy = false; watching = false; });
})();
