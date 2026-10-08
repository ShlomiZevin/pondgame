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
      { const a = forms[i]._air || 0; if (a >= 0.5) { ctx.fillStyle = '#9cc3d4'; ctx.fillRect(x, y, CW, CH * 0.6); ctx.fillStyle = '#8a7648'; ctx.fillRect(x, y + CH * 0.6, CW, CH * 0.4); } }
      const zk = o.sizes && o.sizes[i] > 0 && o.sizeTop > 0 ? G.clamp(Math.sqrt(o.sizes[i] / o.sizeTop), 0.55, 1) : 1;
      ctx.save(); ctx.translate(x + CW / 2, y + 190 * SC + 6 - (1 - zk) * 40 * SC); ctx.scale(SC * zk, SC * zk);
      try { G.form.portrait(ctx, forms[i], 1.3 + i, {}); } catch (e) { console.error(e); }
      ctx.restore();
      ctx.fillStyle = i < rf ? 'rgba(160,120,10,0.95)' : 'rgba(7,18,31,0.85)'; ctx.beginPath(); ctx.arc(x + 22, y + 22, 15, 0, 6.2832); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = '700 19px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(i < rf ? '★' : String(i - rf + 1), x + 22, y + 23);
      if (i < rf) { ctx.strokeStyle = 'rgba(255,205,70,0.55)'; ctx.lineWidth = 3; ctx.strokeRect(x + 2, y + 2, CW - 4, CH - 4); }
      if (i % cols) { ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(x, y, 1, CH); }
    }
    try { return cv.toDataURL('image/jpeg', 0.86).split(',')[1] || null; } catch (e) { return null; }
  };
  /** the best this pond has made so far (the hall of fame: creatures the watcher really looked at), shown in the first row of a sheet for comparison. Nothing is put there by hand. */
  G.referenceForms = function () {
    const W = G.W, H = W && W.hall ? W.hall.filter(function (h) { return h.s >= 0.55; }).sort(function (x, y) { return y.s - x.s; }).slice(0, 4) : [];
    return H.map(function (h) { return G.form.clone(G.cloneGenome(h.g).f); });
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
  const clamp01 = function (v) { return v < 0 ? 0 : v > 1 ? 1 : v; };
  const c01 = function (v) { v = +v; return isFinite(v) ? G.clamp(v, 0, 1) : NaN; };
  G.eyeGrade = function (c, g) { c.real = { b: g.b, w: g.w, m: g.m || null, why: g.why || '', fix: g.fix || '', gen: G.W.gen }; c.eb = g.b; c.ew = g.w; c.st = 0; c.ph.charm = g.b; c.ph.whole = g.w; if (G.marksSeen) G.marksSeen(c, g.m); };
  G.watchPick = function (max) {
    const W = G.W, L = [], seen = W.eyeSeen || {};
    for (let i = 0; i < W.cre.length; i++) { const c = W.cre[i]; if (c.dead || c.real || !c.g.f.bd) continue; const hit = seen[G.form.key(c.g.f)]; if (hit) { G.eyeGrade(c, hit); continue; } L.push(c); }
    L.sort(function (a, b) { return ((b.st || 0) * 0.5 + 6 * G.charmOf(b)) - ((a.st || 0) * 0.5 + 6 * G.charmOf(a)); });
    // one creature to a species (the one the pond thinks best: it is the one that will breed), and a species is not looked at again for a few generations
    // most of a sheet is the best of each species (the ones that will breed); a few are ordinary creatures picked at random, so what the pond believes is tested
    // on the creatures it actually has and not only on its favourites (a taste taught only on its favourites thinks everyone is one)
    const nRand = Math.min(4, Math.floor(max / 3)), out = [], kinds = {}, sl = W.spLook = W.spLook || {};
    for (let i = 0; i < L.length && out.length < max - nRand; i++) { const c = L[i], k = c.sp ? 's' + c.sp : G.shapeOf(c.g) + '|' + G.hueOf(c.g); if (kinds[k] || (c.sp && W.gen - (sl[c.sp] === undefined ? -99 : sl[c.sp]) < 6)) continue; kinds[k] = 1; out.push(c); }
    { const rest = L.filter(function (c) { return out.indexOf(c) < 0; }), lk = {}; for (let t = 0; t < nRand * 3 && rest.length && out.length < max; t++) { const c = rest.splice((G.rand() * rest.length) | 0, 1)[0], k = G.shapeOf(c.g) + '|' + G.hueOf(c.g); if (lk[k]) continue; lk[k] = 1; out.push(c); } }
    // a pond of two or three species still gets a look: the look-alike kinds within them stand in
    if (out.length < 4) { const lk = {}; for (let i = 0; i < L.length && out.length < 5; i++) { const c = L[i], k = G.shapeOf(c.g) + '|' + G.hueOf(c.g); if (lk[k] || out.indexOf(c) >= 0) continue; lk[k] = 1; out.push(c); } }
    return out;
  };
  // ── what the pond believes of a creature nobody has looked at ──
  // Its own taste says how nice and how whole the body should be (a guess from everything that can be seen on it). The god's real marks then correct that
  // guess: for every creature it really looked at, the pond remembers how far its guess was off (q.rb, q.rw), and a creature that LOOKS like those
  // (G.lookVec: face, proportions, colours, shapes, growths) is corrected by the same amount. So one look at a kind sets the level of the whole kind,
  // while the differences between its members (bigger eyes, a rounder head, sturdier limbs) stay, and selection can still work on them.
  G.LOOK_S = 1.7; G.LOOK_K = 0.5;
  G.lvOf = function (c) { return c.lv || (c.lv = G.lookVec(c.g)); };
  G.believe = function (g, lv) {
    const W = G.W, FM = G.form, T = (g.t[5] || 0) >= 0.5 ? (W.tasteL || W.taste) : W.taste, x = FM.looks(g.f), v0 = FM.whole(g.f).v, B = W.eyeBank;
    let b = FM.beautyX(x, T), w = FM.wholeX(x, T, v0), near = 0;
    if (B && B.length) {
      let sw = 0, rb = 0, rw = 0;
      for (let i = 0; i < B.length; i++) { const q = B[i]; if (q.rb === undefined) continue; const d = G.fdist(lv, q.lv), wt = Math.exp(-d * d / G.LOOK_S); if (wt < 0.03) continue; sw += wt; rb += wt * q.rb; rw += wt * q.rw; }
      if (sw > 0.15) { const k = Math.min(0.9, sw / (sw + G.LOOK_K)); b += k * rb / sw; w += k * rw / sw; near = 1; }
    }
    const b0 = b, w0 = w, C = W.cal;
    if (C) { b = C.mb + C.sb * (b - C.pb); w = C.mw + C.sw * (w - C.pw); }
    return { b: clamp01(b), w: clamp01(w), near: near, b0: b0, w0: w0 };
  };
  G.watchTick = function () {
    const W = G.W;
    if (!W || W.title || watching || !live() || W.cre.length < 4) return;
    // one look every nine seconds, as it has always been (G.ai.gaps.watch), and at most one every two generations: at normal speed a generation lasts about a
    // minute, and the pond has hardly changed between two looks, so looking more often would only cost.
    if (W.lastLookGen !== undefined && W.gen - W.lastLookGen < 2) return;
    const picks = G.watchPick(12);
    if (picks.length < 4 || !G.ai.allow('watch')) return;
    W.lastLookGen = W.gen;
    // each creature is drawn large enough for its face to be read (a picture costs little; it is the words that cost)
    const refs = G.referenceForms(), img = G.sheet(refs.concat(picks.map(function (c) { return c.g.f; })), { cw: 248, ch: 256, sc: 0.68, cols: 4, refs: refs.length, sizeTop: Math.max.apply(null, picks.map(function (c) { return c.ph.r; })), sizes: refs.map(function () { return 0; }).concat(picks.map(function (c) { return c.ph.r; })) });
    if (!img) return;
    watching = true;
    G.ai.ask('judge', { image: img, mime: 'image/jpeg', lean: 1, count: picks.length, refs: refs.length, kind: 'watch' }).then(function (res) {
      watching = false;
      if (G.W !== W || !res || !Array.isArray(res.scores)) return;
      if (!W.eyeSeen || (W.eyeKeys || 0) > 700) { W.eyeSeen = {}; W.eyeKeys = 0; }
      let n = 0; const looks = [], FM = G.form, T = W.taste;
      for (let i = 0; i < res.scores.length; i++) {
        const s = res.scores[i], c = picks[(s.id | 0) - 1], g = { m: (function () { const o = {}, X = G.MARKS_X || []; for (let k = 0; k < X.length; k++) { const v = c01(s.m && s.m[X[k].id]); if (!isNaN(v)) o[X[k].id] = v; } return o; })(), b: c01(s.score), w: c01(s.whole), why: String(s.why || '').replace(/[<>]/g, '').slice(0, 70), fix: '' };
        if (!c || isNaN(g.b) || isNaN(g.w)) continue;
        W.eyeSeen[FM.key(c.g.f)] = g; W.eyeKeys++; n++;
        if (!c.dead) G.eyeGrade(c, g);
        looks.push(g);
        const lv = G.lvOf(c);
        // its further marks (body, balance, grandeur) reach the living creatures that look like it
        if (G.marksToward) for (let k = 0; k < W.cre.length; k++) { const x = W.cre[k]; if (x === c || x.real || x.dead || !x.g.f.bd) continue; const d = G.fdist(lv, G.lvOf(x)), wt = Math.exp(-d * d / G.LOOK_S); if (wt >= 0.05) G.marksToward(x, g.m, wt); }
        // the look is remembered
        if (c.g.f.bd) { (W.eyeBank = W.eyeBank || []).push({ lv: lv, m: g.m, b: g.b, w: g.w, f: c.g.f, x: FM.looks(c.g.f), v0: FM.whole(c.g.f).v, pb: c.b0, pw: c.w0, home: (c.g.t[5] || 0) >= 0.5 ? 1 : 0 }); if (W.eyeBank.length > 240) W.eyeBank.shift(); }
        const sp = c.sp ? G.speciesById(c.sp) : null;
        if (c.sp) (W.spLook = W.spLook || {})[c.sp] = W.gen;
        // the best the watcher has really seen are kept (a hall of fame): they can be bred again if the pond loses what they had
        if (c.g.f.bd) { const sc = G.appealOfLook ? G.appealOfLook(g) : (g.b + g.w) / 2, H = W.hall = W.hall || [], fvh = c.fv || (c.fv = G.features(c.g)); let near = -1; for (let h = 0; h < H.length; h++) if (G.fdist(fvh, H[h].fv) < 0.8) { near = h; break; }
          if (near >= 0) { if (sc > H[near].s) H[near] = { g: G.cloneGenome(c.g), fv: fvh, s: sc, gen: W.gen }; } else if (H.length < 8) H.push({ g: G.cloneGenome(c.g), fv: fvh, s: sc, gen: W.gen }); else { let lo = 0; for (let h = 1; h < H.length; h++) if (H[h].s < H[lo].s) lo = h; if (sc > H[lo].s) H[lo] = { g: G.cloneGenome(c.g), fv: fvh, s: sc, gen: W.gen }; } }
        if (sp && (!sp.judge || sp.judge.est || g.b + g.w >= sp.judge.score + (sp.judge.whole || 0) - 0.05 || W.gen - sp.judge.gen > 5)) sp.judge = { score: g.b, whole: g.w, why: g.why, fix: '', gen: W.gen, fv: sp.fv ? sp.fv.slice() : [] };
      }
      W.eyeN = (W.eyeN || 0) + n;
      if (W.taste && W.eyeBank && W.eyeBank.length) {
        const B = W.eyeBank;
        // the pond's own taste is taught by everything the watcher has really said: a few passes over its recent marks, newest last
        if (B.length >= 8 && FM.fitTaste && !G.FIT_OFF) { const BW = B.filter(function (e) { return !e.home; }), BL = B.filter(function (e) { return e.home; });
          FM.fitTaste(T, BW.length >= 8 ? BW : B);
          if (BL.length >= 8) { W.tasteL = W.tasteL || FM.newTaste(); FM.fitTaste(W.tasteL, BL); } }
        else if (B.length >= 8) for (let ep = 0; ep < 3; ep++) for (let i = 0; i < B.length; i++) { const e = B[i]; FM.learn(T, e.f, e.b, 0.025, e.x); FM.learnWhole(T, e.x, e.w, 0.03, e.v0); }
        // how far that taste is still off for each creature really seen: what the look-alikes are corrected by (see G.believe)
        for (let i = 0; i < B.length; i++) { const e = B[i], Te = e.home && W.tasteL ? W.tasteL : T; e.rb = e.b - FM.beautyX(e.x, Te); e.rw = e.w - FM.wholeX(e.x, Te, e.v0); }
        { const P = B.filter(function (e) { return e.pb !== undefined && e.pw !== undefined; }).slice(-90);
          if (P.length >= 20) { const fit = function (kp, km) { let mp = 0, mm = 0; for (let i = 0; i < P.length; i++) { mp += P[i][kp]; mm += P[i][km]; } mp /= P.length; mm /= P.length; let sxy = 0, sxx = 0; for (let i = 0; i < P.length; i++) { sxy += (P[i][kp] - mp) * (P[i][km] - mm); sxx += (P[i][kp] - mp) * (P[i][kp] - mp); } return [mp, mm, G.clamp(sxx > 1e-6 ? sxy / sxx : 1, 0.3, 1)]; };
            const cb = fit('pb', 'b'), cw = fit('pw', 'w'); W.cal = { pb: cb[0], mb: cb[1], sb: cb[2], pw: cw[0], mw: cw[1], sw: cw[2] }; } }
        for (let k = 0; k < W.cre.length; k++) { const x = W.cre[k]; if (x.real || x.dead || !x.g.f.bd) continue; const bel = G.believe(x.g, G.lvOf(x)); x.eb = bel.b; x.ew = bel.w; x.b0 = bel.b0; x.w0 = bel.w0; x.st = bel.near ? 1 : 3; x.ph.charm = x.eb; x.ph.whole = x.ew; }
      }
      if (G.roomAfterLook) G.roomAfterLook(looks);      // room to grow opens while the god finds the pond's bodies read well, and closes when they do not
      G.emit('watched', n);
    }, function () { watching = false; });
  };
  if (typeof document !== 'undefined' && typeof setInterval === 'function') setInterval(function () { try { G.watchTick(); } catch (e) { console.error(e); } }, 2000);
  G.on('new-pond', function () { busy = false; watching = false; });
})();
