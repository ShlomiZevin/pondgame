// ── Marvels: now and then, one creature is born with something super rare ──
// A marvel is a gift out of the ordinary: a mind that thinks, a voice that talks, breath of fire, a diamond heart. It is
// rare by chance, but it is never left to chance alone: the longer a pond goes without one, the likelier the next becomes
// (by generations and by minutes of play), so every player meets one from time to time. It is a gene like any other: the
// creature's children can inherit it, it can fade, and what it is worth is decided by the pond. Nine are built in; the AI,
// when there is one, can invent others for this pond out of the same safe effects, with a name, a story and the words it says.
(function () {
  'use strict';
  const clamp = G.clamp;
  const SPECIALS = ['voice', 'fire', 'heal', 'luck', 'fertile', 'titan', 'mind'];
  const GLYPHS = ['star', 'gem', 'flame', 'brain', 'note', 'heart', 'rainbow', 'clover', 'sun', 'moon', 'crown', 'wing'];
  const WORDS = ['hello', 'look!', 'yum', 'friend', 'mine', 'hey', 'la la', 'home', 'wow', 'come'];
  const BUILT = [
    { id: 1, name: 'Bright Mind', wonder: 'It thinks. It finds food sooner, slips away from danger, and seems to know what is coming.', sp: 'mind', glyph: 'brain', hue: 285, fx: { sense: 0.7, eat: 0.3, speed: 0.12 } },
    { id: 2, name: 'The Gift of Words', wonder: 'It has learned to talk. It calls out to what it sees, and its kin are glad to hear it.', sp: 'voice', glyph: 'note', hue: 48, fx: { sense: 0.25 }, words: WORDS },
    { id: 3, name: 'Dragon Breath', wonder: 'It can breathe fire. What hunts it gets burned.', sp: 'fire', glyph: 'flame', hue: 18, fx: { glow: 0.5, heat: 0.5 } },
    { id: 4, name: 'Diamond Heart', wonder: 'A diamond grew in its chest. Almost nothing bites through it, and it shines.', sp: '', glyph: 'gem', hue: 190, fx: { armor: 0.8, glow: 0.5 } },
    { id: 5, name: 'Rainbow Coat', wonder: 'Its coat shimmers through every colour, and neither heat nor cold nor poison troubles it much.', sp: '', glyph: 'rainbow', hue: 320, fx: { glow: 0.4, heat: 0.4, cold: 0.4, poison: 0.3 } },
    { id: 6, name: 'Healing Light', wonder: 'Its glow mends whatever swims near it.', sp: 'heal', glyph: 'heart', hue: 130, fx: { glow: 0.4 } },
    { id: 7, name: 'Lucky Star', wonder: 'Fortune follows it: danger has a way of missing.', sp: 'luck', glyph: 'clover', hue: 105, fx: { speed: 0.1 } },
    { id: 8, name: 'Heart of Spring', wonder: 'Every spring it has more children than anyone.', sp: 'fertile', glyph: 'sun', hue: 58, fx: { eat: 0.2 } },
    { id: 9, name: "Titan's Heart", wonder: 'It grew far bigger than its kind has ever been.', sp: 'titan', glyph: 'crown', hue: 30, fx: { armor: 0.3, eat: 0.2 } },
  ];
  G.MARVELS = BUILT;      // only for when no AI can be asked (a test, the server's catch-up): in play every marvel is invented
  const STUFF = ['ice', 'fire', 'water', 'rock', 'plant', 'toxic', 'light', 'dark', 'magic'], PHUE = { ice: 195, fire: 18, water: 208, rock: 32, plant: 118, toxic: 95, light: 50, dark: 255, magic: 282 };
  const VOICES = ['sweet', 'bright', 'cheeky', 'gruff', 'wise', 'tiny'];
  /** a power: an AURA that is always about it, or a PULSE it lets off every so often; of some stuff; doing things to someone */
  const cleanPower = function (q) {
    if (!q || typeof q !== 'object') return null;
    const n = function (v, a, b) { v = +v; return isFinite(v) ? clamp(v, a, b) : 0; };
    const p = { kind: q.kind === 'pulse' ? 'pulse' : 'aura', stuff: STUFF.indexOf(q.stuff) >= 0 ? q.stuff : 'magic', reach: n(q.reach, 0.2, 1) || 0.5, to: ['hunters', 'others', 'kin', 'all'].indexOf(q.to) >= 0 ? q.to : 'hunters', every: n(q.every, 2, 30) || 8,
      hurt: n(q.hurt, 0, 1), slow: n(q.slow, 0, 1), pull: n(q.pull, -1, 1), heal: n(q.heal, 0, 1), feed: n(q.feed, 0, 1), tag: Math.round(n(q.tag, 0, 5)), strike: n(q.strike, 0, 1) };
    if (p.to === 'kin' || p.to === 'all') { p.hurt = p.to === 'kin' ? 0 : Math.min(p.hurt, 0.4); p.strike = p.to === 'kin' ? 0 : p.strike; }      // it does not turn on its own
    return p.hurt + p.slow + Math.abs(p.pull) + p.heal + p.feed + p.strike > 0.05 ? p : null;
  };

  G.marvelOf = function (id) {
    id = id | 0; if (!id) return null;
    if (id >= 1 && id <= BUILT.length) return BUILT[id - 1];
    const L = G.W && G.W.marvelX;
    if (L) for (let i = 0; i < L.length; i++) if (L[i].id === id) return L[i];
    return null;
  };

  /** a sentence cut where a sentence or a word ends, never in the middle of one */
  G.cutText = function (s, n) { s = String(s || '').replace(/[<>]/g, '').trim(); if (s.length <= n) return s; const c = s.slice(0, n), p = Math.max(c.lastIndexOf('. '), c.lastIndexOf('! '), c.lastIndexOf('? ')); if (p > n * 0.5) return c.slice(0, p + 1); const sp = c.lastIndexOf(' '); return (sp > n * 0.5 ? c.slice(0, sp) : c).replace(/[,;:-]+$/, '') + '…'; };
  /** whatever was imagined becomes a fair marvel: a name, a story, a sign, a few effects from the fixed vocabulary, at most one special gift */
  G.cleanMarvel = function (raw) {
    if (!raw || typeof raw !== 'object') return null;
    const name = String(raw.name || '').replace(/[<>"]/g, '').trim().slice(0, 26), wonder = G.cutText(raw.wonder, 170);
    if (!name || !wonder) return null;
    const sp = SPECIALS.indexOf(raw.sp || raw.special) >= 0 ? (raw.sp || raw.special) : '';
    const f = raw.fx && typeof raw.fx === 'object' ? raw.fx : {}, fx = {}; let sum = 0;
    for (let i = 0; i < G.FX.length; i++) { const k = G.FX[i]; let v = +f[k]; if (!isFinite(v)) v = 0; fx[k] = k === 'speed' ? clamp(v, -0.5, 0.6) : clamp(v, 0, 0.9); sum += Math.abs(fx[k]); }
    if (sum > 1.4) for (let i = 0; i < G.FX.length; i++) fx[G.FX[i]] *= 1.4 / sum;
    const words = Array.isArray(raw.words) ? raw.words.map(function (w) { return String(w).replace(/[^A-Za-z!?', .\-]/g, '').trim().slice(0, 30); }).filter(Boolean).slice(0, 6) : [];
    const powers = []; if (Array.isArray(raw.powers)) for (let i = 0; i < raw.powers.length && powers.length < 3; i++) { const p = cleanPower(raw.powers[i]); if (p) powers.push(p); }
    const v = raw.voice && typeof raw.voice === 'object' ? raw.voice : {}, emblem = typeof raw.emblem === 'string' && raw.emblem.length < 6200 && /^<svg[\s>]/.test(raw.emblem) && !/<script|javascript:|onload|href/i.test(raw.emblem) ? raw.emblem : '';
    if (sum < 0.1 && !sp && !powers.length && !words.length) fx.glow = 0.4;
    return { name: name, wonder: wonder, sp: sp, glyph: GLYPHS.indexOf(raw.glyph) >= 0 ? raw.glyph : 'star', hue: (((+raw.hue || 50) % 360) + 360) % 360, fx: fx, powers: powers, words: words.length ? words : sp === 'voice' ? WORDS : [],
      voice: { tone: VOICES.indexOf(v.tone) >= 0 ? v.tone : 'bright', speed: isFinite(+v.speed) ? clamp(+v.speed, 0.7, 1.7) : 1.25 }, emblem: emblem, why: G.cutText(raw.why, 170), iconText: String(raw.icon || raw.iconText || '').replace(/[<>"]/g, '').trim().slice(0, 100), by: String(raw.by || raw.model || '').slice(0, 60) };
  };
  /** an invented marvel becomes part of this pond (so its creatures can pass it on); returns its id */
  G.addMarvelDef = function (raw) {
    const W = G.W, d = G.cleanMarvel(raw); if (!W || !d) return 0;
    W.marvelX = W.marvelX || [];
    const same = W.marvelX.filter(function (x) { return x.name.toLowerCase() === d.name.toLowerCase(); })[0]; if (same) return same.id;
    W.nextMarvel = W.nextMarvel || 100; d.id = W.nextMarvel++; d.gen = W.gen;
    W.marvelX.push(d); if (W.marvelX.length > 14) W.marvelX.shift();
    return d.id;
  };

  // ── when ──
  // Two things make one likelier, and both grow the longer there has been none: the generations that have passed (a fast pond lives many in a minute) and the
  // real minutes of play (a slow pond lives few). Chance for this generation = 1 - exp(-(hazard per generation + hazard per minute x minutes since the last check)).
  // About one every 3 minutes at 64x, and every 15 minutes at 1x, and never none for long.
  G.marvelChance = function (since) { return 0.125; };      // each generation: one chance in eight (a marvel about every 8 generations)
  let busy = false;
  G.marvelTick = function (gen) {
    const W = G.W; if (!W || W.title) return;
    const M = W.mv = W.mv || { gen0: 0, n: 0 };      // minutes of play since the last check (a pause or a closed tab does not count)
    // how common each marvel is now: a marvel that has taken over the pond fades (see mutation), so it stays something special
    { const sh = W.mvShare = {}, cn = W.mvCount = {}, n = Math.max(1, W.cre.length); W.mvPend = {}; for (let i = 0; i < W.cre.length; i++) { const k = W.cre[i].g.mv; if (k) { sh[k] = (sh[k] || 0) + 1 / n; cn[k] = (cn[k] || 0) + 1; } } }
    if (gen < 6 || W.cre.length < 16 || busy || gen - M.gen0 < 2) return;
    const p = G.marvelChance(gen - M.gen0);
    if (G.rand() >= p && !(G.marvelForce)) return;
    G.grantMarvel();
  };
  /** who: a living, young creature without one, with a leaning to the nicer ones (a marvel is a prize, but luck picks) */
  function chooseCreature() {
    const W = G.W; let pool = W.cre.filter(function (c) { return !c.dead && !c.g.mv && c.age <= 1 && c.g.f.bd && c.E > c.ph.Emax * 0.3; });      // a young creature in good health
    if (!pool.length) pool = W.cre.filter(function (c) { return !c.dead && !c.g.mv && c.g.f.bd; });
    if (!pool.length) return null;
    let tot = 0; const wt = pool.map(function (c) { const w = 0.4 + G.charmOf(c); tot += w; return w; });
    let x = G.rand() * tot; for (let i = 0; i < pool.length; i++) { x -= wt[i]; if (x <= 0) return pool[i]; }
    return pool[pool.length - 1];
  }
  G.grantMarvel = function (forceId) {
    const W = G.W; let c = chooseCreature(); if (!c) return;
    const M = W.mv = W.mv || { gen0: 0, n: 0 };
    M.gen0 = W.gen;           // the count starts again whatever comes of the asking
    const live = G.mode === 'play' && !G.catching && G.ai && G.ai.provider === 'server' && G.ai.available && G.ai.available();
    // with an AI to ask, a marvel is always invented: if it cannot be just now, none comes yet (it is tried again soon), never a stock one
    const give = function (def) { if (c.dead || c.g.mv) c = chooseCreature(); if (!c) return; if (!def) { if (live) { M.gen0 = W.gen - 25; return; } def = BUILT[Math.floor(G.rand() * BUILT.length)]; } finish(c, def); };
    if (forceId) { give(G.marvelOf(forceId)); return; }
    // about half the time, when there is an AI, it invents this pond's marvel; otherwise one of the built-in ones, not one seen lately
    if (live && G.ai.allow('marvel')) {
      busy = true;
      const info = G.worldBrief ? G.worldBrief() : {}; info.creature = G.form.facts(c.g.f).slice(0, 8).join('; '); info.have = BUILT.map(function (b) { return b.name; }).concat((W.marvelX || []).map(function (x) { return x.name; })); info.kind = G.form.kind(c.g.f).full;
      G.ai.ask('marvel', info).then(function (raw) {
        busy = false; if (G.W !== W) return;
        const id = raw ? G.addMarvelDef(raw) : 0; give(id ? G.marvelOf(id) : null);
      }, function () { busy = false; if (G.W === W) give(null); });
      return;
    }
    if (live) { M.gen0 = W.gen - 25; return; }
    const recent = W.marvelRecent = W.marvelRecent || []; let def = null;
    for (let t = 0; t < 8 && !def; t++) { const d = BUILT[Math.floor(G.rand() * BUILT.length)]; if (recent.indexOf(d.id) < 0) def = d; }
    give(def || BUILT[0]);
  };
  function finish(c, def) {
    const W = G.W; if (!W || c.dead) return;
    c.g.mv = def.id; c.ph = G.derive(c.g); c.fv = null; c.marvelBorn = W.gen; c.aura = 1;
    c.E = Math.max(c.E, c.ph.Emax * 0.7); c.P = Math.max(c.P || 0, c.ph.Emax * 0.35); c.tired = 0;      // it comes with vigour
    const M = W.mv; M.n = (M.n || 0) + 1; M.blessId = def.id; M.bless = W.gen + 20;      // for twenty generations the line is looked after, so a new marvel can take hold
    (W.marvelRecent = W.marvelRecent || []).push(def.id); if (W.marvelRecent.length > 4) W.marvelRecent.shift();
    W.discLog.push({ key: 'marvel' + W.gen + '_' + c.id, text: 'A MARVEL! Creature #' + c.id + ' was born with ' + def.name + ': ' + def.wonder, gen: W.gen });
    G.emit('marvel', c, def);
  }

  // ── what it does, each simulation step (only for creatures that carry one) ──
  const DT = { voice: 0, fire: 0, heal: 0 };
  /** cg: the step's grid of creatures (cg.head, cg.next, cg.cw, cg.ch) */
  G.marvelStep = function (c, dt, cg) {
    const ph = c.ph, sp = ph.mvsp, W = G.W;
    if (c.flame > 0) c.flame -= dt; if (c.healPulse > 0) c.healPulse -= dt; if (c.luckT > 0) c.luckT -= dt; if (c.aura > 0.4) c.aura -= dt * 0.04;
    if (c.say) { c.say.t -= dt; if (c.say.t <= 0) c.say = null; }
    const near = function (rad, fn) {
      const cx0 = clamp(((c.x - rad) / 64) | 0, 0, cg.cw - 1), cx1 = clamp(((c.x + rad) / 64) | 0, 0, cg.cw - 1), cy0 = clamp(((c.y - rad) / 64) | 0, 0, cg.ch - 1), cy1 = clamp(((c.y + rad) / 64) | 0, 0, cg.ch - 1);
      for (let yy = cy0; yy <= cy1; yy++) for (let xx = cx0; xx <= cx1; xx++) for (let j = cg.head[yy * cg.cw + xx]; j >= 0; j = cg.next[j]) { const o = W.cre[j]; if (!o || o === c || o.dead) continue; const dx = o.x - c.x, dy = o.y - c.y; if (dx * dx + dy * dy < rad * rad && fn(o, dx, dy) === false) return; }
    };
    if (sp === 'fire') {
      c.fireCool = (c.fireCool || 0) - dt;
      if (c.fireCool <= 0 && c.E > ph.Emax * 0.2) {
        let tgt = null, td = 1e9;
        near(105, function (o, dx, dy) { const d2 = dx * dx + dy * dy, hunter = o.ph.r >= ph.r * 1.15 && o.ph.dig[ph.tag] >= 0.2, brawler = o.ph.aggro > 0.38 && o.sp !== c.sp; if ((hunter || brawler) && d2 < td) { td = d2; tgt = o; } });
        if (tgt) {
          c.fireCool = 3.5; c.E -= 4; c.flame = 0.8; c.flameAng = Math.atan2(tgt.y - c.y, tgt.x - c.x);
          tgt.E -= 18 * (1 - tgt.ph.defense * 0.5); tgt.flash = 1; tgt.burn = 1;
          near(60, function (o) { if (o !== tgt && o.sp !== c.sp && (o.ph.r >= ph.r * 1.15 || o.ph.aggro > 0.38)) { o.E -= 8 * (1 - o.ph.defense * 0.5); o.flash = 1; } });
          G.emit('fire', c, tgt);
          if (tgt.E <= 0 && G.killCreature) { W.stats.killed++; G.killCreature(tgt, 'fought', c); }
        }
      }
    } else if (sp === 'heal') {
      c.healCool = (c.healCool || 0) - dt;
      if (c.healCool <= 0) { c.healCool = 1.3; c.healPulse = 0.9; near(95, function (o) { if (o.E < o.ph.Emax) { o.E = Math.min(o.ph.Emax, o.E + 3 + 0.02 * o.ph.Emax); o.mend = 1; } }); }
    }
    if (ph.mv.words && ph.mv.words.length) {
      c.sayCool = (c.sayCool || 2 + G.rand() * 4) - dt;
      if (c.sayCool <= 0 && W.lastSay !== undefined && W.t - W.lastSay < 1.6) c.sayCool = 0.6 + G.rand();      // one voice at a time: the others wait a moment
      if (c.sayCool <= 0) {
        c.sayCool = 9 + G.rand() * 12; W.lastSay = W.t;
        const w = ph.mv.words, inp = c.inp;
        let word = w[(G.rand() * w.length) | 0];
        if (inp && Math.max(inp[5], inp[6]) > 0.45 && G.rand() < 0.5) word = 'Run!'; else if (inp && Math.max(inp[1], inp[2]) > 0.5 && G.rand() < 0.25) word = 'Food!';
        c.say = { w: word, t: 3 };
        G.emit('say', c, word);
      }
    }
    const P = ph.mv.powers;
    if (c.pulse) { c.pulse.t -= dt; if (c.pulse.t <= 0) c.pulse = null; }
    if (P && P.length) {
      c.pwAcc = (c.pwAcc || 0) + dt;
      if (c.pwAcc >= 0.3) {
        const da = c.pwAcc; c.pwAcc = 0; c.pwCool = c.pwCool || [];
        for (let i = 0; i < P.length; i++) {
          const p = P[i], R = 50 + 120 * p.reach;
          const hit = function (o) { return p.to === 'all' || (p.to === 'kin' ? o.sp === c.sp : p.to === 'others' ? o.sp !== c.sp : (o.ph.r >= ph.r * 1.15 && o.ph.dig[ph.tag] >= 0.2) || (o.ph.aggro > 0.38 && o.sp !== c.sp)); };
          if (p.kind === 'aura') {
            near(R, function (o, dx, dy) { if (!hit(o)) return; if (p.hurt) o.E -= p.hurt * 10 * da * (1 - o.ph.defense * 0.5); if (p.heal && o.E < o.ph.Emax) { o.E = Math.min(o.ph.Emax, o.E + p.heal * 7 * da); o.mend = 1; } if (p.slow) { const k = 1 - p.slow * 0.5; o.vx *= k; o.vy *= k; } if (p.pull) { const d = Math.sqrt(dx * dx + dy * dy) || 1; o.vx -= dx / d * p.pull * 60 * da; o.vy -= dy / d * p.pull * 60 * da; } });
            if (p.feed && G.spawnFood && G.rand() < p.feed * 0.25 * da) { const a = G.rand() * 6.2832, d = G.rand() * R * 0.7; G.spawnFood(W, clamp(c.x + Math.cos(a) * d, 8, W.ww - 8), clamp(c.y + Math.sin(a) * d, 8, W.wh - 8), p.tag); }
          } else {
            c.pwCool[i] = (c.pwCool[i] === undefined ? p.every * G.rand() : c.pwCool[i]) - da;
            if (c.pwCool[i] > 0) continue;
            let any = !!p.feed, tgt = null, td = 1e9;
            near(R, function (o, dx, dy) { if (!hit(o)) return; any = true; const d2 = dx * dx + dy * dy; if (d2 < td) { td = d2; tgt = o; } });
            if (!any) { c.pwCool[i] = 1; continue; }                      // nobody it is meant for is near: it waits
            c.pwCool[i] = p.every; c.pulse = { t: 0.9, R: R, hue: PHUE[p.stuff] };
            near(R, function (o, dx, dy) { if (!hit(o)) return; if (p.hurt) { o.E -= p.hurt * 22 * (1 - o.ph.defense * 0.5); o.flash = 1; } if (p.heal && o.E < o.ph.Emax) { o.E = Math.min(o.ph.Emax, o.E + p.heal * 24); o.mend = 1; } if (p.pull) { const d = Math.sqrt(dx * dx + dy * dy) || 1; o.vx -= dx / d * p.pull * 150; o.vy -= dy / d * p.pull * 150; } if (p.slow) { o.vx *= 1 - p.slow; o.vy *= 1 - p.slow; } });
            if (p.strike && tgt) { tgt.E -= 34 * p.strike * (1 - tgt.ph.defense * 0.5); tgt.flash = 1; c.zap = { x: tgt.x, y: tgt.y, t: 0.45, hue: PHUE[p.stuff] }; if (tgt.E <= 0 && G.killCreature) { W.stats.killed++; G.killCreature(tgt, 'fought', c); } }
            if (p.feed && G.spawnFood) for (let k = 0; k < Math.round(1 + p.feed * 4); k++) { const a = G.rand() * 6.2832, d = G.rand() * R * 0.6; G.spawnFood(W, clamp(c.x + Math.cos(a) * d, 8, W.ww - 8), clamp(c.y + Math.sin(a) * d, 8, W.wh - 8), p.tag); }
          }
        }
      }
    }
    if (c.zap) { c.zap.t -= dt; if (c.zap.t <= 0) c.zap = null; }
  };
  /** luck: danger sometimes misses (called as a creature is about to die) */
  /** is this the creature that was born with the marvel, in the first generations of its life (looked after so that it can be a parent, and it does not die of old age for a while)? Its children are not looked after: a marvel is rare, and stays rare. */
  G.marvelBlessed = function (c) { const W = G.W; return !!(c.g.mv && W && ((c.marvelBorn !== undefined && W.gen <= c.marvelBorn + 30) || (c.havenGen !== undefined && W.gen - c.havenGen <= 1))); };      // new, or living in a safe garden
  /** the safe garden a player can add for the pond's marvels (nothing is asked of the AI: it costs nothing) */
  G.HAVEN = { name: 'Marvel Garden', haven: true, props: { nutrition: 0.55, light: 0.35 }, tag: 2, hue: 48, radius: 150, life: 600, source: 'local', note: 'A safe garden. It has room for 3 marvels at a time. Marvels are drawn to it. Inside they are fed and kept from harm, they do not die of old age, and a child born there is a little likelier to be a marvel too (never more than 3 alive with the same marvel).' };
  G.HAVEN_ROOM = 3;      // how many marvels one garden shelters at a time
  /** a typed word that means a safe place for the marvels: it becomes a garden under that name, with no AI call */
  G.havenWord = function (w) { const low = String(w || '').toLowerCase(); if (!/\b(garden|sanctuary|haven|refuge|shelter|nursery|nest|safe (place|home|house|zone|spot|garden)|marvel (home|house|place))\b/.test(low)) return null; const t = JSON.parse(JSON.stringify(G.HAVEN)); t.name = String(w).trim().slice(0, 28).replace(/\b[a-z]/g, function (m) { return m.toUpperCase(); }); return t; };
  G.havenOf = function () { const W = G.W; if (!W) return null; for (let i = 0; i < W.zones.length; i++) if (W.zones[i].haven) return W.zones[i]; return null; };
  G.marvelsAlive = function () { const W = G.W; let n = 0; if (W) for (let i = 0; i < W.cre.length; i++) if (W.cre[i].g.mv && !W.cre[i].dead) n++; return n; };
  /** does a child of a carrier get the marvel? Seldom: it comes with the creature that was given it, not with its line. About one child in eight, and never past a few carriers in a pond. */
  G.marvelInherits = function (id) {
    const W = G.W; if (!W) return false;
    const cnt = (W.mvCount && W.mvCount[id]) || 0, pend = W.mvPend = W.mvPend || {}, hv = !!G._mvHaven, cap = hv ? 3 : 2;      /* a marvel stays rare: at most two alive carry the same one, three when a garden shelters them */
    if (cnt + (pend[id] || 0) >= cap || G.rand() >= (hv ? 0.25 : 0.125)) return false;      // one in eight; one in four when born in a safe garden
    pend[id] = (pend[id] || 0) + 1; return true;
  };
  G.marvelSave = function (c, cause) {
    if (!c.ph || c.ph.mvsp !== 'luck' || c.luckUsed || cause === 'starved' || G.rand() > 0.6) return false;
    c.luckUsed = true; c.E = Math.max(c.E, c.ph.Emax * 0.45); c.doomed = false; c.flash = 1; c.luckT = 1.4;
    return true;
  };
})();
