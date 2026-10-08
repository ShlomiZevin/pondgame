// ── Saving: the pond, the field guide, the fossils (Plaxzy.save, small and checked) ──
(function () {
  'use strict';
  const clamp = G.clamp;
  const hasSave = function () { return !!(window.Plaxzy && Plaxzy.save && typeof Plaxzy.save.set === 'function'); };
  let dirty = false, timer = 0;

  function collect() {
    const W = G.W;
    if (!W || W.title) return null;
    const out = {
      v: 1, at: Date.now(), room: +(W.room || 0).toFixed(1), shore: +(W.shore || G.SHORE0).toFixed(3), seed: W.seed, ww: Math.round(W.ww), wh: Math.round(W.wh), gen: W.gen, season: W.season, st: Math.round(W.st * 10) / 10, t: Math.round(W.t),
      set: W.set, disc: W.disc, nextSp: W.nextSp, ai: G.ai && G.ai.model ? G.ai.model : '', drawn: G.ai && G.ai.drawn ? 1 : 0, spend: G.ai ? G.ai.life : {},
      hist: W.hist.slice(-120).map(function (h) { return [h.gen, +h.avg.toFixed(3), +h.best.toFixed(2), h.pop, +h.genes.toFixed(1), +h.intake.toFixed(0), h.species, +(h.look || 0).toFixed(3), +(h.lookTop || 0).toFixed(2), +(h.whole || 0).toFixed(3), +(h.wholeTop || 0).toFixed(2), +(h.body || 0).toFixed(1), +(h.bodyTop || 0).toFixed(1), +(h.size || 0).toFixed(1), +(h.sizeTop || 0).toFixed(1), (G.MARKS_X || []).map(function (m) { const q = h.mx && h.mx[m.id]; return q ? [+q[0].toFixed(3), +q[1].toFixed(2)] : 0; }), +(h.room || 0).toFixed(1)]; }),
      discLog: W.discLog.slice(-40),
      hints: Object.keys(G.hints),
      cre: [], species: [], fossils: [],
      organs: (W.organs || []).map(function (o) { return { id: o.id, name: o.name, note: o.note, svg: o.svg && o.svg.length < 1500 ? o.svg : '', fx: o.fx, digest: o.digest, hue: Math.round(o.hue), by: o.by, gen: o.gen }; }),
      nextOrgan: W.nextOrgan || 1,
      budgets: (G.ai && G.ai.budgetSet) || {},
      marvelX: (W.marvelX || []).map(function (m) { return { id: m.id, name: m.name, wonder: m.wonder, sp: m.sp, glyph: m.glyph, hue: Math.round(m.hue), fx: m.fx, words: m.words, powers: m.powers || [], voice: m.voice, emblem: m.emblem && m.emblem.length < 3500 ? m.emblem : '', why: m.why || '', by: m.by, gen: m.gen }; }),
      nextMarvel: W.nextMarvel || 100, marvelRecent: (W.marvelRecent || []).slice(-4), mvState: W.mv ? { gen0: W.mv.gen0 | 0, n: W.mv.n | 0 } : null,
      designs: (W.designs || []).map(function (d) { return { id: d.id, name: d.name, adj: d.adj, note: d.note, place: d.place, motion: d.motion, colour: d.colour, pts: d.pts, smooth: d.smooth, ribs: d.ribs, dots: d.dots, fx: d.fx, by: d.by, gen: d.gen }; }), nextDesign: W.nextDesign || 1,
      col: G.collection, colD: G.keptDesigns, colP: G.keptPlans, fields: G.packFields ? G.packFields() : [], plans: W.plans || [], nextPlan: W.nextPlan || 1, museLog: W.museLog || [],
      env: W.env, ages: (W.ages || []).slice(-24), hue0: Math.round(W.hue0 || 0), fashion: W.fashion, fashionGen: W.fashionGen | 0, taste: W.taste,
      story: (W.story || []).slice(-12), events: (W.events || []).slice(-12),
      history: (W.history || []).slice(-90), evShelf: (W.evShelf || []).slice(-10).map(function (e) { const c = JSON.parse(JSON.stringify(e)); if (c.thing) c.thing.svg = ''; return c; }),
      shelf: (W.shelf || []).slice(-12).map(function (t) { return Object.assign({}, t, { svg: t.svg && t.svg.length < 1500 ? t.svg : '' }); }),
      zones: W.zones.map(function (z) {
        return { hv: z.haven ? 1 : 0, x: Math.round(z.x), y: Math.round(z.y), w: z.word, p: z.p, tag: z.tag, r0: Math.round(z.r0), life: Math.round(z.life), life0: Math.round(z.life0 || 120), age: Math.round(z.age), hue: Math.round(z.hue), shape: z.shape, note: z.note, svg: z.svg && z.svg.length < 1500 ? z.svg : '', look: z.look || null, model: z.model, alive: +(z.alive || 0).toFixed(2), health: +(z.health || 0).toFixed(2), genN: z.genN, kids: z.kids, made: z.made, fed: z.fed, hurt: Math.round(z.hurt), deaths: z.deaths, vis: Math.round(z.vis), sig: z.sig, weak: z.weak, hit: +(z.hit || 0).toFixed(2), ate: z.ate || 0, ev: (z.ev || []).slice(-8), born: z.born };
      }),
    };
    // the most successful creatures, up to a budget
    const sorted = W.cre.slice().sort(function (a, b) { return (b.E / b.ph.Emax) - (a.E / a.ph.Emax); });
    const maxC = Math.min(sorted.length, 220);
    for (let i = 0; i < maxC; i++) {
      const c = sorted[i];
      out.cre.push([G.packGenome(c.g), Math.round(c.x), Math.round(c.y), Math.round(c.E), c.age, c.sp, c.born, c.eb === undefined ? -1 : +c.eb.toFixed(2), c.ew === undefined ? -1 : +c.ew.toFixed(2), c.real ? 1 : 0, c.real ? c.real.why : '', (G.MARKS_X || []).map(function (m) { return c.mx && c.mx[m.id] !== undefined ? +c.mx[m.id].toFixed(2) : -1; })]);
    }
    // children already on their way (spring's births come a few at a time) are saved as born, so a save in spring does not lose them
    (W.births || []).slice(0, 60).forEach(function (b) { const c = b && b.c; if (!c || !c.g || out.cre.length >= 240) return; out.cre.push([G.packGenome(c.g), Math.round(b.x), Math.round(b.y), Math.round(c.E), c.age || 0, c.sp || 0, c.born === undefined ? W.gen : c.born, -1, -1, 0, '']); });
    const all = out.cre;
    const packCre = function () { const raw = JSON.stringify(all); let z = null; try { z = G.lzPack(raw); if (z && G.lzUnpack(z) !== raw) z = null; } catch (e) { console.error(e); z = null; } if (z) { out.creZ = z; out.cre = []; } else { delete out.creZ; out.cre = all; } };
    packCre();
    const sp = W.species.filter(function (s) { return s.rep; }).sort(function (a, b) { return (b.extinct ? 0 : 1) - (a.extinct ? 0 : 1) || b.peak - a.peak; }).slice(0, 26);
    sp.forEach(function (s) { out.species.push([s.id, s.name, s.born, s.parent, s.extinct ? s.diedGen || 1 : 0, s.peak, s.kills || 0, Math.round(s.hue), G.packGenome(s.rep), s.hist.slice(-40), s.judge && !s.extinct ? { score: +s.judge.score.toFixed(2), why: s.judge.why, gen: s.judge.gen, fix: s.judge.fix || '', loved: s.loved ? 1 : 0 } : s.loved ? { loved: 1 } : null]); });
    W.fossils.slice(-12).forEach(function (f) { if (f.g) out.fossils.push([f.id, f.name, f.born, f.died, f.peak, G.packGenome(f.g)]); });
    // keep it under the server's limit (400 kB). It used to be 100 kB, and a long game's collection, marvels and charts filled that: the living creatures were
    // then the first thing cut, so a pond came back with a couple of dozen of them. Creatures are the last thing to go now, and there is room for all of them.
    let s = JSON.stringify(out);
    if (s.length > 360000) { out.zones.forEach(function (z) { z.svg = ''; }); s = JSON.stringify(out); }
    if (s.length > 360000) { out.history = out.history.slice(-30); s = JSON.stringify(out); }
    for (let i = out.species.length - 1; i >= 0 && s.length > 360000; i--) { if (out.species[i][10]) { out.species[i][10] = null; s = JSON.stringify(out); } }
    if (s.length > 360000 && out.discLog && out.discLog.length > 20) { out.discLog = out.discLog.slice(-20); s = JSON.stringify(out); }
    while (s.length > 360000 && (all.length > 10 || out.species.length > 8 || out.fossils.length > 4)) {
      if (out.fossils.length > 4) out.fossils.length = Math.max(4, out.fossils.length - 4);
      else if (out.species.length > 16) out.species.length = 16;
      else if (out.species.length > 12) out.species.length = Math.max(12, out.species.length - 4);
      else if (all.length > 10) { all.length = Math.max(10, all.length - 6); packCre(); }
      else out.species.length = Math.max(8, out.species.length - 2);
      s = JSON.stringify(out);
    }
    return out;
  }

  G.collectSave = collect;
  G.saveNow = function () {
    dirty = false;
    const d = collect();
    if (!d) return;
    mirror(d);
    if (hasSave()) { try { Plaxzy.save.set(d); } catch (e) { console.error(e); } }
    G.emit('saved');
  };
  G.eraseSave = function () {
    G.pendingSave = null;
    try { localStorage.removeItem(MIRROR); } catch (e) { /* no storage here */ }
    G.emit('save-erased');
    if (hasSave()) { try { Plaxzy.save.set(null); } catch (e) { try { Plaxzy.save.set({ v: 0 }); } catch (e2) { console.error(e2); } } }
  };
  function later() {
    dirty = true;
    if (timer) return;
    timer = setTimeout(function () { timer = 0; if (dirty) G.saveNow(); }, 1500);
  }
  G.on('dirty', later);
  G.on('scored', function () { if (G.mode === 'play') G.saveNow(); });
  G.on('discovery', function () { if (G.mode === 'play') later(); });
  G.on('new-pond', function () { if (G.mode === 'play') later(); });
  window.addEventListener('pagehide', function () { if (G.mode === 'play') G.saveNow(); });
  // ── the pond you left is the pond you come back to ──
  // The save that goes to the host travels as a message and then over the network, and a page that is closing or being refreshed often does not get
  // it out in time: the pond then came back as it was at its last autumn, a generation and a few dozen creatures behind. So every save is also
  // written, at once and on the spot, into this browser's own storage, and so is the pond every few seconds while it is being played. On coming back,
  // the newer of the two is used: but only when it is the SAME pond (the same seed) as the one the host holds, so nobody is handed another's pond.
  const MIRROR = 'primordia.pond.v1';
  function mirror(d) { try { localStorage.setItem(MIRROR, JSON.stringify(d)); } catch (e) { /* no storage here (a sandboxed frame), or it is full: the host's save still stands */ } }
  G.newerSave = function (d) {
    try { const raw = localStorage.getItem(MIRROR); if (!raw) return d; const m = JSON.parse(raw); if (G.validSave(m) && m.seed === d.seed && Number(m.at) > Number(d.at || 0)) return m; } catch (e) { /* unreadable: use the host's */ }
    return d;
  };
  if (typeof document !== 'undefined') setInterval(function () { try { if (G.mode === 'play' && G.W && !G.W.title && !document.hidden && G.speed > 0 && !G.isBlocked()) { const d = collect(); if (d) mirror(d); } } catch (e) { console.error(e); } }, 6000);
  if (typeof document !== 'undefined') document.addEventListener('visibilitychange', function () { if (document.hidden && G.mode === 'play') { try { const d = collect(); if (d) mirror(d); } catch (e) { console.error(e); } } });

  // ── every creature fits ──
  // A save has to stay under 100 kB, and written out plainly a creature takes about 700 characters: only some 50 of a pond's 130 fitted, so a pond
  // came back from a reload with most of its creatures gone. The list of creatures is therefore packed (LZW over its JSON, written in base64 letters,
  // about a quarter of the size) and kept in `creZ`; `cre` stays in the save as an empty list for readers that only check that it is there.
  // The packing is checked by unpacking it again before it is trusted; if that ever fails the plain list is saved as before.
  const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_', MAXCODE = 65535;
  const widthAt = function (i) { let v = Math.min(256 + i, MAXCODE), w = 0; while (v > 0) { w++; v >>= 1; } return w; };      // the i-th code is this many bits wide: both sides count alike
  G.lzPack = function (str) {
    const dict = new Map(); let next = 256, w = '', acc = 0, nb = 0, out = '', i = 0;
    const emit = function (code) { const wd = widthAt(i++); for (let b = wd - 1; b >= 0; b--) { acc = (acc << 1) | ((code >> b) & 1); if (++nb === 6) { out += B64.charAt(acc); acc = 0; nb = 0; } } };
    const codeOf = function (x) { return x.length === 1 ? x.charCodeAt(0) : dict.get(x); };
    for (let k = 0; k < str.length; k++) {
      const ch = str.charAt(k); if (ch.charCodeAt(0) > 255) return null;      /* plain text only */
      const wc = w + ch;
      if (wc.length === 1 || dict.has(wc)) w = wc;
      else { emit(codeOf(w)); if (next <= MAXCODE) dict.set(wc, next++); w = ch; }
    }
    if (w) emit(codeOf(w));
    if (nb) out += B64.charAt(acc << (6 - nb));
    return out;
  };
  G.lzUnpack = function (z) {
    const dict = []; let next = 256, pos = 0, i = 0, prev = null, out = [];
    const total = z.length * 6;
    const read = function (wd) { let v = 0; for (let b = 0; b < wd; b++) { const ci = B64.indexOf(z.charAt(Math.floor(pos / 6))); if (ci < 0) throw new Error('bad letter'); v = (v << 1) | ((ci >> (5 - pos % 6)) & 1); pos++; } return v; };
    while (true) {
      const wd = widthAt(i); if (pos + wd > total) break; i++;
      const code = read(wd); let cur;
      if (code < 256) cur = String.fromCharCode(code);
      else if (code < next) cur = dict[code - 256];
      else if (code === next && prev !== null) cur = prev + prev.charAt(0);
      else throw new Error('bad code');
      out.push(cur);
      if (prev !== null && next <= MAXCODE) { dict.push(prev + cur.charAt(0)); next++; }
      prev = cur;
    }
    return out.join('');
  };
  /** the creatures of a save, whichever way they were written */
  G.saveCre = function (d) {
    if (d && typeof d.creZ === 'string' && d.creZ.length < 400000 && !(Array.isArray(d.cre) && d.cre.length)) { try { const a = JSON.parse(G.lzUnpack(d.creZ)); if (Array.isArray(a)) return a.slice(0, 260); } catch (e) { console.error(e); } }
    return Array.isArray(d && d.cre) ? d.cre : [];
  };

  // a save is never trusted: every field is checked and clamped
  function num(v, a, b, d) { v = +v; return isFinite(v) ? clamp(v, a, b) : d; }
  G.validSave = function (d) {
    if (!d || typeof d !== 'object' || d.v !== 1 || !Array.isArray(d.cre)) return false;
    let ok = 0;
    const cre = G.saveCre(d);
    for (let i = 0; i < cre.length; i++) { if (Array.isArray(cre[i]) && G.unpackGenome(cre[i][0])) ok++; }
    return ok > 0 || (Array.isArray(d.fossils) && d.fossils.length > 0) || num(d.gen, 1, 1e6, 1) > 1;
  };

  G.applySave = function (d) {
    if (!G.validSave(d)) { G.startPond({}); return; }
    G.newWorld({ seed: num(d.seed, 1, 4e9, 1) });
    const W = G.W;
    W.gen = Math.floor(num(d.gen, 1, 1e6, 1));
    W.room = num(d.room, 0, G.ROOM_MAX || 10, 0);
    W.shore = num(d.shore, G.SHORE0, 0.5, G.SHORE0);      // a pond saved when the land began smaller comes back with the bigger land
    W.season = Math.floor(num(d.season, 0, 3, 0));
    W.st = num(d.st, 0, G.PH[W.season] - 0.01, 0);
    W.t = num(d.t, 0, 1e7, 0);
    if (d.ww) W.ww = num(d.ww, 600, 9000, W.ww);
    W.wh = num(d.wh, 600, 3700, 1000);
    if (W.wh > 1400.5) { G.view.grow = G.clamp(W.wh / 1400, 1, 2.6); if (G.canvas) { G.resize(); W.ww = G.view.ww; W.wh = G.view.wh; } }      // a pond that had grown comes back grown            // a pond saved before the pond grew was 1000 tall
    if (d.set && typeof d.set === 'object') {
      W.set.temp = num(d.set.temp, -1, 1, 0); W.set.light = num(d.set.light, 0.2, 2, 1);
      W.set.bloom = num(d.set.bloom, 0.2, 3, 1); W.set.mut = num(d.set.mut, 0.25, 4, 1);
    }
    W.nextSp = Math.floor(num(d.nextSp, 1, 1e6, 1));
    if (d.env && typeof d.env === 'object') W.env = { mix: Array.isArray(d.env.mix) && d.env.mix.length === 6 ? d.env.mix.map(function (v) { return num(v, 0.2, 2, 1); }) : [1, 1, 1, 1, 1, 1], o2: num(d.env.o2, 0.4, 1.5, 1), murk: num(d.env.murk, 0, 1, 0.5), rich: num(d.env.rich, 0.5, 1.6, 1), warm: num(d.env.warm, -0.4, 0.4, 0), green: num(d.env.green, 0.4, 0.95, 0.82), deep: Math.floor(num(d.env.deep, 3, 5, 3)), hue: num(d.env.hue, 0, 360, 190) };
    G.keptPlans = [];
    if (Array.isArray(d.colP)) d.colP.slice(0, 16).forEach(function (q) { const o = G.cleanPlan(q); if (!o) return; o.id = Math.floor(num(q.id, 100000, 999999, 100000)); G.keptPlans.push(o); });
    W.plans = [];
    if (Array.isArray(d.plans)) d.plans.slice(0, 8).forEach(function (q) { const o = G.cleanPlan(q); if (!o) return; o.id = Math.floor(num(q.id, 1, 1e6, 1)); o.gen = num(q.gen, 0, 1e6, 0); if (!W.plans.some(function (x) { return x.id === o.id; })) W.plans.push(o); });
    W.museLog = Array.isArray(d.museLog) ? d.museLog.slice(-10).map(function (m) { return { g: num(m && m.g, 0, 1e6, 0), name: String(m && m.name || '').replace(/[<>]/g, '').slice(0, 30), what: String(m && m.what || '').replace(/[<>]/g, '').slice(0, 90) }; }) : [];
    if (G.unpackFields) G.unpackFields(d.fields);
    W.nextPlan = Math.max(Math.floor(num(d.nextPlan, 1, 1e6, 1)), W.plans.reduce(function (m, o) { return Math.max(m, o.id + 1); }, 1));
    // what the player has kept comes first of all: its kinds of part are needed to rebuild anything that carries them
    G.keptDesigns = [];
    if (Array.isArray(d.colD)) d.colD.slice(0, 24).forEach(function (q) { const o = G.cleanDesign(q); if (!o) return; o.id = Math.floor(num(q.id, 100000, 999999, 100000)); if (!G.keptDesigns.some(function (x) { return x.id === o.id; })) G.keptDesigns.push(o); });
    G.collection = [];
    if (Array.isArray(d.col)) d.col.slice(-16).forEach(function (q) { if (!q || !Array.isArray(q.g) || !G.unpackGenome(q.g)) return; G.collection.push({ name: String(q.name || 'Creature').replace(/[<>]/g, '').slice(0, 44), kind: String(q.kind || '').replace(/[<>]/g, '').slice(0, 50), age: String(q.age || '').replace(/[<>]/g, '').slice(0, 70), gen: num(q.gen, 0, 1e6, 0), g: q.g, mv: q.mv && typeof q.mv === 'object' ? q.mv : undefined }); });
    // the pond's own kinds of part first: every body is measured and drawn with them
    W.designs = [];
    if (Array.isArray(d.designs)) d.designs.slice(0, 8).forEach(function (q) { const o = G.cleanDesign(q); if (!o) return; o.id = Math.floor(num(q.id, 1, 1e6, 1)); o.gen = num(q.gen, 0, 1e6, 0); if (!W.designs.some(function (x) { return x.id === o.id; })) W.designs.push(o); });
    W.nextDesign = Math.max(Math.floor(num(d.nextDesign, 1, 1e6, 1)), W.designs.reduce(function (m, o) { return Math.max(m, o.id + 1); }, 1));
    if (G.form.clearCache && typeof document !== 'undefined') G.form.clearCache();
    W.hue0 = num(d.hue0, 0, 360, W.hue0); W.fashionGen = Math.floor(num(d.fashionGen, 0, 1e6, 0));
    W.taste = G.form.fixTaste(d.taste) || G.form.newTaste();
    W.fashion = G.form.fixFashion(d.fashion) || W.fashion;       // before any creature is rebuilt: charm is judged by this pond's taste
    W.ages = (Array.isArray(d.ages) ? d.ages : []).filter(function (a) { return a && typeof a.name === 'string' && typeof a.kind === 'string'; }).slice(-24).map(function (a) { return { name: a.name.replace(/[<>]/g, '').slice(0, 70), kind: a.kind.replace(/[<>]/g, '').slice(0, 40), gen: num(a.gen, 0, 1e6, 1), share: num(a.share, 0, 1, 0), why: String(a.why || '').replace(/[<>]/g, '').slice(0, 240), g: Array.isArray(a.g) ? a.g : null }; });
    if (G.ai) { G.ai.life = {}; if (d.spend && typeof d.spend === 'object') for (const k in d.spend) if (k.length < 20 && d.spend[k]) G.ai.life[k] = { asked: Math.floor(num(d.spend[k].asked, 0, 1e7, 0)), fresh: Math.floor(num(d.spend[k].fresh, 0, 1e7, 0)), usd: num(d.spend[k].usd, 0, 1e6, 0) }; }
    if (typeof d.ai === 'string' && d.ai && G.ai && (!G.ai.models.length || G.ai.labelOf(d.ai))) G.ai.model = d.ai.slice(0, 60);
    if (d.disc && typeof d.disc === 'object') { for (const k in d.disc) if (typeof k === 'string' && k.length < 20) W.disc[k] = num(d.disc[k], 0, 1e6, 0); }
    if (Array.isArray(d.discLog)) W.discLog = d.discLog.filter(function (e) { return e && typeof e.text === 'string'; }).slice(-40).map(function (e) { return { key: String(e.key).slice(0, 20), text: String(e.text).slice(0, 420), gen: num(e.gen, 0, 1e6, 0) }; });
    if (Array.isArray(d.hist)) d.hist.forEach(function (h) { if (Array.isArray(h) && h.length >= 7) W.hist.push({ gen: num(h[0], 0, 1e6, 0), avg: num(h[1], 0, 1, 0), best: num(h[2], 0, 1, 0), pop: num(h[3], 0, 1e4, 0), genes: num(h[4], 0, 1e3, 0), intake: num(h[5], 0, 1e5, 0), species: num(h[6], 0, 1e3, 0), look: num(h[7], 0, 1, 0), lookTop: num(h[8], 0, 1, 0), whole: num(h[9], 0, 1, 0), wholeTop: num(h[10], 0, 1, 0), body: num(h[11], 0, 99, 0), bodyTop: num(h[12], 0, 99, 0), size: num(h[13], 0, 99, 0), sizeTop: num(h[14], 0, 99, 0), room: num(h[16], 0, 99, 0), mx: (function () { const o = {}; if (Array.isArray(h[15]) && G.MARKS_X) G.MARKS_X.forEach(function (m, k) { const q = h[15][k]; if (Array.isArray(q)) o[m.id] = [num(q[0], 0, 1, 0), num(q[1], 0, 1, 0)]; }); return o; })() }); });
    if (Array.isArray(d.hints)) d.hints.forEach(function (k) { if (typeof k === 'string') G.hints[k.slice(0, 20)] = 1; });
    if (Array.isArray(d.species)) d.species.forEach(function (s) {
      if (!Array.isArray(s) || s.length < 10) return;
      const g = G.unpackGenome(s[8]); if (!g) return;
      const sp = { id: num(s[0], 1, 1e6, 1), name: String(s[1]).slice(0, 40), born: num(s[2], 0, 1e6, 0), parent: num(s[3], 0, 1e6, 0), extinct: !!s[4], diedGen: num(s[4], 0, 1e6, 0), peak: num(s[5], 0, 1e5, 0), kills: num(s[6], 0, 1e6, 0), hue: num(s[7], 0, 360, 0), rep: g, repFit: 0, fv: G.features(g), n: 0, fitSum: 0, hist: Array.isArray(s[9]) ? s[9].map(Number).filter(isFinite).slice(-80) : [], lastGen: W.gen, keep: true };
      if (sp.extinct) sp.lastGen = sp.diedGen;
      if (s[10] && s[10].loved) sp.loved = true;
      if (s[10] && s[10].score !== undefined && isFinite(+s[10].score)) sp.judge = { score: num(s[10].score, 0, 1, 0.5), why: String(s[10].why || '').replace(/[<>]/g, '').slice(0, 140), gen: num(s[10].gen, 0, 1e6, 0), fv: G.form.features(g.f), fix: G.form.NUDGES.indexOf(s[10].fix) >= 0 ? s[10].fix : '' };
      W.species.push(sp);
    });
    if (Array.isArray(d.fossils)) d.fossils.forEach(function (f) {
      if (!Array.isArray(f) || f.length < 6) return;
      const g = G.unpackGenome(f[5]); if (!g) return;
      W.fossils.push({ id: num(f[0], 0, 1e6, 0), name: String(f[1]).slice(0, 40), born: num(f[2], 0, 1e6, 0), died: num(f[3], 0, 1e6, 0), peak: num(f[4], 0, 1e5, 0), g: g });
    });
    // organs first: creatures are rebuilt with them
    if (Array.isArray(d.organs)) d.organs.slice(0, 12).forEach(function (q) {
      const o = G.cleanOrgan ? G.cleanOrgan(q) : null;
      if (!o) return;
      o.id = Math.floor(num(q.id, 1, 1e6, 1)); o.gen = Math.floor(num(q.gen, 0, 1e6, 0));
      if (!W.organs.some(function (x) { return x.id === o.id; })) W.organs.push(o);
    });
    if (Array.isArray(d.marvelX) && G.cleanMarvel) { W.marvelX = []; d.marvelX.slice(0, 14).forEach(function (q) { const m = G.cleanMarvel(q); if (!m) return; m.id = Math.floor(num(q.id, 100, 1e6, 100)); m.gen = Math.floor(num(q.gen, 0, 1e6, 0)); if (!W.marvelX.some(function (x) { return x.id === m.id; })) W.marvelX.push(m); }); }
    W.nextMarvel = Math.max(Math.floor(num(d.nextMarvel, 100, 1e6, 100)), (W.marvelX || []).reduce(function (m, o) { return Math.max(m, o.id + 1); }, 100));
    if (Array.isArray(d.marvelRecent)) W.marvelRecent = d.marvelRecent.slice(-4).map(Number).filter(isFinite);
    if (d.mvState && typeof d.mvState === 'object') W.mv = { gen0: Math.floor(num(d.mvState.gen0, 0, 1e7, 0)), rt0: G.rt || 0, n: Math.floor(num(d.mvState.n, 0, 1e5, 0)) };
    if (G.ai && d.budgets && typeof d.budgets === 'object') { G.ai.budgetSet = {}; for (const k in d.budgets) { const v = +d.budgets[k]; if (isFinite(v) && /^[a-z-]{2,20}$/.test(k)) G.ai.budgetSet[k] = Math.max(0, Math.min(50, v)); } }
    W.nextOrgan = Math.max(Math.floor(num(d.nextOrgan, 1, 1e6, 1)), W.organs.reduce(function (m, o) { return Math.max(m, o.id + 1); }, 1));
    if (Array.isArray(d.story)) W.story = d.story.filter(function (s) { return s && typeof s.text === 'string'; }).slice(-12).map(function (s) { return { title: String(s.title || '').slice(0, 44), text: s.text.slice(0, 340), by: String(s.by || '').slice(0, 60), gen: num(s.gen, 0, 1e6, 0) }; });
    if (Array.isArray(d.events)) W.events = d.events.filter(function (e) { return e && typeof e.name === 'string'; }).slice(-12).map(function (e) { return { g: num(e.g, 0, 1e6, 0), name: e.name.slice(0, 30), note: String(e.note || '').slice(0, 140) }; });
    if (Array.isArray(d.history)) W.history = d.history.filter(function (e) { return e && typeof e.t === 'string'; }).slice(-90).map(function (e) { return { k: String(e.k || 'sel').slice(0, 6), t: e.t.slice(0, 60), x: String(e.x || '').slice(0, 320), g: num(e.g, 0, 1e6, 0) }; });
    if (Array.isArray(d.evShelf) && G.cleanEvent) W.evShelf = d.evShelf.slice(-10).map(function (e) { return G.cleanEvent(e, e && e.name); }).filter(Boolean);
    if (Array.isArray(d.shelf)) W.shelf = d.shelf.slice(-12).map(function (t) { return G.clampThing(t); });
    if (Array.isArray(d.zones)) d.zones.slice(0, 14).forEach(function (q) {
      if (!q || typeof q !== 'object' || !q.p || typeof q.p !== 'object') return;
      const pr = q.p;
      const z = G.addZone(num(q.x, 0, W.ww, W.ww / 2), num(q.y, 0, W.wh, W.wh / 2), {
        name: String(q.w || 'thing').slice(0, 28), haven: !!q.hv, look: G.cleanLook ? G.cleanLook(q.look) : null,
        props: { nutrition: num(pr.nut, 0, 1, 0), poison: num(pr.poison, 0, 1, 0), heat: num(pr.heat, -1, 1, 0), light: num(pr.light, -1, 1, 0), sticky: num(pr.sticky, 0, 1, 0), acid: num(pr.acid, 0, 1, 0), hard: num(pr.hard, 0, 1, 0), spread: num(pr.spread, 0, 1, 0), eats: num(pr.eats, 0, 1, 0), moves: num(pr.moves, 0, 1, 0), pull: num(pr.pull, -1, 1, 0), vault: num(pr.vault, 0, 0.7, 0), deadly: num(pr.deadly, 0, 1, 0) },
        tag: Math.floor(num(q.tag, 0, 5, 2)), radius: num(q.r0, 40, 150, 80), life: num(q.life, 1, 400, 60), hue: num(q.hue, 0, 360, 200), shape: Math.floor(num(q.shape, 0, 4, 0)),
        note: String(q.note || '').slice(0, 160), svg: typeof q.svg === 'string' ? G.safeSvg(q.svg) : '', model: String(q.model || '').slice(0, 60),
        alive: num(q.alive, 0, 1, 0), genN: Math.floor(num(q.genN, 1, 999, 1)), sig: Math.floor(num(q.sig, 0, 5, 0)), weak: Math.floor(num(q.weak, 0, 4, 0)),
      });
      z.life0 = num(q.life0, 30, 400, 120); z.age = num(q.age, 0, 1e6, 10); z.health = num(q.health, 0, 2, 1); z.kids = num(q.kids, 0, 999, 0);
      z.made = num(q.made, 0, 1e7, 0); z.fed = num(q.fed, 0, 1e7, 0); z.hurt = num(q.hurt, 0, 1e9, 0); z.deaths = num(q.deaths, 0, 1e6, 0); z.vis = num(q.vis, 0, 1e9, 0); z.ate = num(q.ate, 0, 1e6, 0); z.hit = num(q.hit, 0, 100, 0); z.born = num(q.born, 0, 1e6, W.gen);
      if (Array.isArray(q.ev)) z.ev = q.ev.filter(function (e) { return e && typeof e.t === 'string'; }).slice(-8).map(function (e) { return { g: num(e.g, 0, 1e6, 0), t: e.t.slice(0, 60) }; });
    });
    G.saveCre(d).forEach(function (r) {
      if (!Array.isArray(r) || r.length < 7) return;
      const g = G.unpackGenome(r[0]); if (!g) return;
      const c = G.makeCreature(g, null, null, []);
      c.x = num(r[1], 5, W.ww - 5, W.ww / 2); c.y = num(r[2], 5, W.wh - 5, W.wh / 2); c.px = c.x; c.py = c.y;
      c.E = num(r[3], 1, c.ph.Emax, c.ph.Emax * 0.5); c.age = Math.floor(num(r[4], 0, 20, 0)); c.sp = Math.floor(num(r[5], 0, 1e6, 0)); c.born = Math.floor(num(r[6], 0, 1e6, 1));
      if (r[7] >= 0 && r[8] >= 0) { c.eb = num(r[7], 0, 1, 0.3); c.ew = num(r[8], 0, 1, 0.3); c.st = r[9] ? 0 : 2; if (r[9]) c.real = { b: c.eb, w: c.ew, why: String(r[10] || '').replace(/[<>]/g, '').slice(0, 70), gen: c.born }; c.ph.charm = c.eb; c.ph.whole = c.ew; W.eyeN = (W.eyeN || 0) + (r[9] ? 1 : 0); }
      if (Array.isArray(r[11]) && G.MARKS_X) { c.mx = c.mx || G.markPrior(c.g); G.MARKS_X.forEach(function (m, k) { if (r[11][k] >= 0) c.mx[m.id] = num(r[11][k], 0, 1, c.mx[m.id]); }); }
      c.snap = G.snapOf(c);
      W.cre.push(c);
    });
    // the species counts are rebuilt at the next autumn; until then count the survivors
    W.species.forEach(function (s) { s.n = W.cre.filter(function (c) { return c.sp === s.id; }).length; if (s.n > 0) s.extinct = false; });
    if (!W.cre.length && !W.fossils.length) G.startPond({});
  };

  // ask for the save as soon as the page is up; the title screen shows at once
  G.addSystem({
    name: 'save',
    init: function () {
      if (!hasSave() || typeof Plaxzy.save.load !== 'function') return;
      try {
        Plaxzy.save.load(function (d) {
          try {
            if (G.validSave(d)) { G.pendingSave = G.newerSave(d); if (G.showContinue) G.showContinue(true); }
          } catch (e) { console.error(e); }
        });
      } catch (e) { console.error(e); }
    },
  });
})();
