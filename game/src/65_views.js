// ── Screens: title, field guide, family tree, menu, confirmations, the still pond ──
(function () {
  'use strict';
  const PAL = G.PAL, UI = G.ui, el = G.el, $ = G.$, ICON = G.ICON, esc = G.escapeHtml;

  function touchy() { return !!G.touch || (window.matchMedia && window.matchMedia('(pointer: coarse)').matches); }

  function openOverlay(name, html, cls) {
    closeModal(true);
    const o = el('div', 'overlay', '', $('ui'));
    o.id = 'ov-' + name;
    o.innerHTML = html;
    o.addEventListener('pointerdown', function (e) { if (e.target === o && name !== 'still') closeModal(); });
    UI.modal = name; UI.modalEl = o;
    G.closePop();
    PXSpause(true);
    return o;
  }
  function closeModal(silent) {
    if (UI.modalEl) { UI.modalEl.remove(); UI.modalEl = null; }
    const was = UI.modal;
    UI.modal = null;
    if (!silent && was) PXSpause(false);
  }
  G.closeModal = closeModal;
  function PXSpause(on) {
    if (!window.PXS) return;
    try { if (on) { if (PXS.pause) PXS.pause({ music: false }); } else if (PXS.resume) PXS.resume(); } catch (e) { console.error(e); }
  }

  function cardCanvas(parent, genome, id) {
    const cv = el('canvas', '', '', parent); cv.width = cv.height = 224;
    const ctx = cv.getContext('2d');
    const pv = G.preview(genome, id || 3);
    const spk = id && G.W ? G.speciesById(id) : null;
    pv.ang = -0.4; pv.glow = 0.7;
    G.drawFit(ctx, pv, 112, 112, 104, 1.2);
    return cv;
  }

  /** a small picture of one living creature, as it is (a card in the Book that stands for something alive in the pond) */
  function livePic(parent, c, px) {
    const cv = el('canvas', '', '', parent); cv.width = cv.height = 192; cv.style.cssText = 'flex:none;width:' + px + 'px;height:' + px + 'px;background:rgba(7,18,31,.5);border-radius:12px';
    const pv = G.preview(c.g, c.id); pv.ang = -0.4; pv.glow = 0.7;
    G.drawFit(cv.getContext('2d'), pv, 96, 96, 88, 1.2);
    return cv;
  }
  /** a button that closes the Book and goes to that creature (or, if it has died meanwhile, to another that fits) */
  function findBtn(parent, c, again, label) {
    const b = el('button', 'btn sm', label || 'SHOW ME THIS ONE', parent);
    b.onclick = function () {
      let t = c && !c.dead && G.W.cre.indexOf(c) >= 0 ? c : null;
      if (!t && again) t = again();
      closeModal();
      if (t) { G.select(t); G.R.ping = { c: t, t: 0 }; G.focusOn(t.x, t.y, 2.2); }
    };
    return b;
  }

  // ── field guide ──
  G.openGuide = function () {
    const W = G.W; if (!W) return;
    const o = openOverlay('guide', '<div class="glass sheet"><div class="top"><h2>BOOK OF LIFE</h2><div class="tabs" style="min-width:min(520px,100%)" id="gdTabs"><button data-t="hist">HISTORY</button><button data-t="live" class="on">LIVING</button><button data-t="coll">COLLECTION</button><button data-t="fossil">FOSSILS</button><button data-t="disc">DISCOVERIES</button><button data-t="story">STORY</button><button data-t="organ">ORGANS &amp; PARTS</button></div><button class="btn sm" id="gdClose">' + ICON.close + 'CLOSE</button></div><div class="body" id="gdBody"></div></div>');
    let tab = UI.guideTab || 'hist';
    const render = function () {
      const body = $('gdBody'); body.innerHTML = '';
      const tabs = $('gdTabs').children;
      for (let i = 0; i < tabs.length; i++) tabs[i].classList.toggle('on', tabs[i].dataset.t === tab);
      if (tab === 'hist') {
        const H = (W.history || []).slice().reverse();
        if (!H.length) { body.innerHTML = '<div class="empty">Everything that happens in this pond is written down here: what you added, what life invented, who fought, who won.</div>'; return; }
        const COL = { disc: 'var(--gold)', sp: 'var(--violet)', sel: 'var(--frost)' };
        const d = el('div', '', '', body);
        let lastGen = -1;
        H.forEach(function (e) {
          if (e.g !== lastGen) { lastGen = e.g; el('div', 'ilabel', 'Generation ' + e.g, d).style.cssText = 'margin:10px 0 2px;color:var(--gold)'; }
          el('div', '', '<b style="color:' + (COL[e.k] || 'var(--frost)') + '">' + esc(e.t) + '</b> ' + esc(e.x), d).style.cssText = 'font-size:13.5px;line-height:1.45;padding:4px 0;border-bottom:1px solid rgba(207,232,255,.07)';
        });
        return;
      }
      if (tab === 'live') {
        const list = W.species.filter(function (s) { return !s.extinct && s.n > 0; }).sort(function (a, b) { return b.n - a.n; });
        const known = {}; list.forEach(function (s) { known[s.id] = 1; });
        const loose = W.cre.filter(function (c) { return !c.dead && !known[c.sp]; });
        const alive = W.cre.filter(function (c) { return !c.dead; }).length;
        if (!alive) { body.innerHTML = '<div class="empty">Nothing is alive in the pond right now.</div>'; return; }
        el('div', '', '<b>' + alive + '</b> creatures are alive now' + (list.length ? ', in <b>' + list.length + '</b> ' + (list.length === 1 ? 'kind' : 'kinds') : '') + '. Each card is one kind, not one creature: creatures that are alike count as the same kind. The picture is a living member of it, and the button takes you to that very one. Kinds are sorted out at the end of each autumn.', body).style.cssText = 'font-size:12.5px;line-height:1.45;margin:0 0 10px;color:rgba(207,232,255,.86)';
        const cards = el('div', 'cards', '', body);
        list.forEach(function (s) { speciesCard(cards, s, false); });
        if (loose.length) {
          const c0 = loose[0], card = el('div', 'card', '', cards);
          cardCanvas(card, c0.g, c0.id);
          const tx = el('div', '', '<b>Not sorted into a kind yet</b><p>' + (list.length ? 'Born since the last sorting.' : 'The first life of this pond.') + ' They get their kind, and a name, at the end of this autumn.</p><small>' + loose.length + ' alive now</small>', card);
          findBtn(tx, c0, function () { return G.W.cre.find(function (x) { return !x.dead && !G.speciesById(x.sp); }); });
        }
      } else if (tab === 'story') {
        const L = (W.story || []).slice().reverse();
        if (!L.length) { body.innerHTML = '<div class="empty">The story is written every few generations: what changed, and why it helped.</div>'; return; }
        const d = el('div', '', '', body);
        L.forEach(function (s) { el('div', 'card', '<div><b>' + esc(s.title) + '</b><p>' + esc(s.text) + '</p><small>Generation ' + s.gen + (G.ai.labelOf(s.by) ? ' · told by ' + esc(G.ai.labelOf(s.by)) : '') + '</small></div>', d).style.marginBottom = '8px'; });
      } else if (tab === 'organ') {
        const L = (W.organs || []).slice().reverse();
        const DS = (W.designs || []).slice().reverse();
        const PS = (W.plans || []).slice().reverse();
        if (!L.length && !DS.length && !PS.length) { body.innerHTML = '<div class="empty">New organs and new kinds of body part are invented for this pond every few generations. Evolution decides which ones catch on.</div>'; return; }
        const cards = el('div', 'cards', '', body);
        L.forEach(function (o) {
          let n = 0; for (let i = 0; i < W.cre.length; i++) if (W.cre[i].g.p.some(function (p) { return p.k === 100 + o.id; })) n++;
          const fx = Object.keys(o.fx).filter(function (k) { return Math.abs(o.fx[k]) > 0.15; }).map(function (k) { return ({ photo: 'feeds on light', sense: 'senses further', eat: 'longer reach', armor: 'armour', spike: 'spikes', toxin: 'tastes bad', glow: 'glows', heat: 'heat-proof', cold: 'cold-proof', poison: 'poison-proof', speed: o.fx.speed > 0 ? 'faster' : 'slower' })[k]; });
          if (o.digest >= 0) fx.push('a new diet');
          const has = function (c) { return !c.dead && c.g.p.some(function (p) { return p.k === 100 + o.id; }); };
          const who = n ? W.cre.find(has) : null;
          const card = el('div', 'card' + (n ? '' : ' dead'), '', cards);
          if (who) livePic(card, who, 96);
          else if (o.svg) el('div', '', '<img alt="" width="52" height="52" style="display:block;opacity:.75" src="data:image/svg+xml;charset=utf-8,' + encodeURIComponent(o.svg) + '">', card).style.cssText = 'flex:none;width:96px;height:96px;display:flex;align-items:center;justify-content:center;background:rgba(7,18,31,.5);border-radius:12px';
          const tx = el('div', '', '<b>' + esc(o.name) + '</b><p>' + esc(o.note) + '</p><small>' + esc(fx.join(' · ')) + '</small><small>Invented in gen ' + o.gen + (G.ai.labelOf(o.by) ? ' by ' + esc(G.ai.labelOf(o.by)) : '') + ' · ' + (n ? 'carried by ' + n + (n === 1 ? ' creature: this one' : ' creatures; this is one of them') : 'nobody alive carries it now') + '</small>', card);
          if (who) findBtn(tx, who, function () { return G.W.cre.find(has); });
        });
        // the builds this pond was given: whole ways of carrying a body
        if (PS.length) {
          el('h3', '', 'SHAPES OF BODY', body).style.cssText = 'font-size:12px;letter-spacing:.2em;margin:16px 0 8px;color:var(--gold)';
          const pc = el('div', 'cards', '', body);
          PS.forEach(function (p, i) {
            let n = 0, live = null, who = null; for (let k = 0; k < W.cre.length; k++) { const ff = W.cre[k].g.f; if (ff.pl === p.id) { n++; live = live || ff; who = who || W.cre[k]; } }
            const fx = [G.body.words({ bd: p.bd, rules: [] })[0]];
            const card = el('div', 'card' + (n ? '' : ' dead'), '<canvas width="192" height="192" style="flex:none;width:96px;height:96px;background:rgba(7,18,31,.5);border-radius:12px"></canvas><div><b>' + esc(p.name) + '</b><p>' + esc(p.note) + '</p><small>' + esc(fx.join(' · ')) + ' · ' + (p.because ? 'why: ' + esc(p.because) + ' · ' : '') + (n ? n + ' alive have it' : 'nobody has it yet') + (G.ai.labelOf(p.by) ? ' · imagined by ' + esc(G.ai.labelOf(p.by)) : '') + '</small></div>', pc);
            const cx = card.querySelector('canvas').getContext('2d'), f = live || G.planDemo(p, (W.hue0 + i * 70) % 360);
            cx.translate(96, 106); cx.scale(0.5, 0.5); G.form.portrait(cx, f, 1.2, {});
            if (who) findBtn(card.lastElementChild, who, function () { return G.W.cre.find(function (x) { return !x.dead && x.g.f.pl === p.id; }); });
          });
        }
        // the kinds of body part this pond was given, each shown on a plain animal
        if (DS.length) {
          el('h3', '', 'KINDS OF BODY PART', body).style.cssText = 'font-size:12px;letter-spacing:.2em;margin:16px 0 8px;color:var(--gold)';
          const dc = el('div', 'cards', '', body);
          DS.forEach(function (d, i) {
            const grows = function (c) { return !c.dead && c.g.f.rules.some(function (q) { return q.k === 8 && q.t === d.id; }); };
            let n = 0, who = null; for (let k = 0; k < W.cre.length; k++) if (grows(W.cre[k])) { n++; who = who || W.cre[k]; }
            const fx = Object.keys(d.fx).filter(function (k) { return Math.abs(d.fx[k]) > 0.04; }).map(function (k) { return k + ' ' + (d.fx[k] > 0 ? '+' : '−') + Math.abs(d.fx[k]).toFixed(2); });
            const card = el('div', 'card' + (n ? '' : ' dead'), '<canvas width="192" height="152" style="flex:none;width:96px;height:76px;background:rgba(7,18,31,.5);border-radius:12px"></canvas><div><b>' + esc(d.name) + '</b><p>' + esc(d.note) + '</p><small>' + esc(fx.join(' · ')) + ' · sits on the ' + esc(d.place) + '</small><small>Invented in gen ' + d.gen + (G.ai.labelOf(d.by) ? ' by ' + esc(G.ai.labelOf(d.by)) : ' by the pond') + ' · ' + (n ? n + ' creatures grow it now' : 'nobody grows it now') + '</small></div>', dc);
            const cx = card.querySelector('canvas').getContext('2d'), f = who ? who.g.f : G.designDemo(d, (W.hue0 + i * 50) % 360);
            if (who) findBtn(card.lastElementChild, who, function () { return G.W.cre.find(grows); });
            cx.translate(96, 84); cx.scale(0.42, 0.42); G.form.portrait(cx, f, 1.2, {});
          });
        }
      } else if (tab === 'coll') {
        const list = G.collection.slice().reverse();
        if (!list.length) { body.innerHTML = '<div class="empty">Your collection is empty. Click a creature you like and press ★ KEEP. What you keep outlives the pond: you can release it into any pond, to breed with what lives there.</div>'; return; }
        if (!$('collCss')) { const st = document.createElement('style'); st.id = 'collCss'; st.textContent = '.kcards{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:10px}.kcard{position:relative;display:flex;flex-direction:column;gap:8px;padding:10px;border-radius:16px;background:rgba(7,18,31,.45);border:1px solid rgba(207,232,255,.14)}.kcard.pick{cursor:pointer;border-color:rgba(255,107,157,.5)}.kcard.pick:hover{border-color:var(--rose);background:rgba(255,107,157,.08)}.kcard .ktop{display:flex;gap:10px;align-items:center}.kcard canvas{flex:none;width:86px;height:86px;margin:-6px 0 -6px -6px}.kcard b{display:block;font-size:13.5px;line-height:1.25}.kcard .kkind{font-size:11.5px;opacity:.85;margin-top:1px}.kcard .kfacts{font-size:11px;opacity:.7;line-height:1.35;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.kcard .kmeta{font-size:10.5px;opacity:.65}.kcard .kleg{display:inline-block;padding:1px 8px;border-radius:9px;background:rgba(246,211,101,.16);border:1px solid rgba(246,211,101,.55);color:var(--gold);font:700 10px system-ui,sans-serif;letter-spacing:.06em;margin-top:3px}.kcard .kact{display:flex;gap:6px;margin-top:auto}.kcard .kact .btn{flex:1;min-height:36px;padding:0 8px;font-size:10.5px;white-space:nowrap}.kcard .kx{position:absolute;top:6px;right:6px;width:28px;height:28px;border-radius:50%;border:0;background:rgba(207,232,255,.08);color:var(--frost);cursor:pointer;font-size:13px;line-height:1;opacity:.6}.kcard .kx:hover{opacity:1;background:rgba(255,107,157,.25)}.khead{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:9px 12px;margin-bottom:10px;border-radius:14px;background:rgba(255,107,157,.12);border:1px solid rgba(255,107,157,.45);font-size:12.5px}'; document.head.appendChild(st); }
        const mateC = UI.breedWith ? G.W.cre.filter(function (q) { return q.id === UI.breedWith && !q.dead; })[0] : null;
        if (UI.breedWith && !mateC) UI.breedWith = 0;
        if (mateC) { const sp0 = G.speciesById(mateC.sp), hd = el('div', 'khead', '<span><b style="color:var(--rose)">♥ Choose a mate for ' + esc((sp0 ? sp0.name : 'Creature') + ' #' + mateC.id) + '.</b> Click one of your kept creatures: six children of the two are born in the pond.</span>', body); const cx = el('button', 'btn sm', 'CANCEL', hd); cx.onclick = function () { UI.breedWith = 0; UI.guideTab = 'coll'; G.openGuide(); }; }
        else el('div', 'desc', 'What you keep outlives the pond. RELEASE A FAMILY sets eight of its kind free here; SET DOWN ALONE sets down just the one, a stranger among those who live here; to breed one with a living creature, click that creature in the pond and press ♥ BREED.', body).style.margin = '0 0 10px';
        const cards = el('div', 'kcards', '', body);
        list.forEach(function (it) {
          const g = G.unpackGenome(it.g); if (!g) return;
          const self = mateC && it.name.slice(-(' #' + mateC.id).length) === ' #' + mateC.id, legend = /^Legend/.test(it.age || '');
          const card = el('div', 'kcard' + (mateC && !self ? ' pick' : ''), '', cards);
          const top = el('div', 'ktop', '', card);
          cardCanvas(top, g, 5);
          el('div', '', '<b>' + esc(it.name) + '</b><div class="kkind">' + esc(it.kind) + '</div>' + (legend ? '<span class="kleg">★ ' + esc(it.age) + '</span>' : '') + (G.characterOf && g.s ? '<div class="kkind" style="opacity:.85">' + esc(G.characterOf({ g: g })) + (it.led ? ' · led ' + (it.led | 0) + ' in its pond' : '') + '</div>' : ''), top);
          el('div', 'kfacts', esc(G.form.facts(g.f).slice(0, 4).join(', ')), card);
          el('div', 'kmeta', 'Kept in generation ' + it.gen + (it.age && !legend ? ' · ' + esc(it.age) : ''), card);
          const row = el('div', 'kact', '', card);
          const breed = function () { closeModal(); G.sfx('discovery'); UI.breedWith = 0; G.breedKept(it, mateC); };
          if (mateC) {
            if (self) el('div', 'kmeta', 'This is the one you chose: pick another to be its mate.', row);
            else { const h = el('button', 'btn sm pulse', '♥ BREED THESE TWO', row); h.onclick = function (e) { e.stopPropagation(); breed(); }; card.onclick = breed; }
          } else {
            const b = el('button', 'btn sm', 'RELEASE INTO THE POND', row); b.title = 'Eight of its kind are set free here, to breed with what lives in this pond.';
            b.onclick = function () { closeModal(); G.sfx('click'); G.release(it); };
            if (G.setDown) { b.textContent = 'RELEASE A FAMILY'; const one = el('button', 'btn sm', 'SET DOWN ALONE', row); one.title = 'Only this one creature is set down, a stranger among those who live here. It keeps its character: see whether they follow it, look and leave it, or keep away.'; one.onclick = function () { closeModal(); G.sfx('discovery'); G.setDown(it); }; }
            const x = el('button', 'kx', '✕', card); x.title = 'Let it go: remove it from your collection'; x.setAttribute('aria-label', 'Remove from collection');
            x.onclick = function () { G.confirm('Remove ' + it.name + ' from your collection?', 'REMOVE', function () { const i = G.collection.indexOf(it); if (i >= 0) G.collection.splice(i, 1); G.markDirty(); UI.guideTab = 'coll'; G.openGuide(); }); };
          }
        });
      } else if (tab === 'fossil') {
        const list = W.fossils.slice().reverse();
        if (!list.length) { body.innerHTML = '<div class="empty">No fossils yet. When a species dies out it leaves a fossil here, and you can seed a new pond from it.</div>'; return; }
        const cards = el('div', 'cards', '', body);
        list.forEach(function (f) { fossilCard(cards, f); });
      } else {
        const L = W.discLog;
        if (!L.length) { body.innerHTML = '<div class="empty">Nothing invented yet. Watch for the first eye, the first predator, the first thought.</div>'; return; }
        const d = el('div', '', '', body);
        L.slice().reverse().forEach(function (e) { el('div', 'card', '<div><b>' + esc(e.text) + '</b><small>Generation ' + e.gen + '</small></div>', d).style.marginBottom = '8px'; });
      }
    };
    $('gdClose').onclick = function () { closeModal(); };
    const tabs = $('gdTabs').children;
    for (let i = 0; i < tabs.length; i++) tabs[i].onclick = function () { tab = this.dataset.t; UI.guideTab = tab; G.sfx('click'); render(); };
    render();
    G.sfx('click');
  };

  function speciesCard(parent, s, dead) {
    const card = el('div', 'card' + (dead ? ' dead' : ''), '', parent);
    const one = dead ? null : G.W.cre.find(function (x) { return x.sp === s.id && !x.dead; });
    if (one) cardCanvas(card, one.g, one.id); else if (s.rep) cardCanvas(card, s.rep, s.id);
    const tx = el('div', '', '', card);
    tx.innerHTML = '<b>' + esc(s.name) + '</b><p>' + esc(G.describeSpecies(s)) + '</p><small>Appeared in gen ' + s.born + ' · most ever ' + s.peak + ' · now ' + s.n + '</small>';
    const sp = el('canvas', '', '', tx); sp.width = 220; sp.height = 36; sp.style.cssText = 'width:110px;height:18px;margin-top:4px';
    spark(sp, s.hist);
    findBtn(tx, one, function () { return G.W.cre.find(function (x) { return x.sp === s.id && !x.dead; }); });
  }
  function fossilCard(parent, f) {
    const card = el('div', 'card dead', '', parent);
    if (f.g) cardCanvas(card, f.g, f.id);
    const tx = el('div', '', '', card);
    tx.innerHTML = '<b>' + esc(f.name) + '</b><small>Lived gen ' + f.born + ' to ' + f.died + ' · most ever ' + f.peak + '</small>';
    const b = el('button', 'btn sm', 'SEED A POND', tx);
    b.onclick = function () { G.confirm('Start a new pond from ' + f.name + '?', 'SEED POND', function () { G.newPond({ fossil: f }); }); };
  }
  function spark(cv, hist) {
    const ctx = cv.getContext('2d'); const w = cv.width, h = cv.height;
    ctx.clearRect(0, 0, w, h);
    if (!hist || hist.length < 2) return;
    const mx = Math.max.apply(null, hist) || 1;
    ctx.strokeStyle = PAL.algae; ctx.lineWidth = 2; ctx.beginPath();
    hist.forEach(function (v, i) { const x = 3 + (w - 6) * i / (hist.length - 1), y = h - 3 - (h - 6) * v / mx; if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); });
    ctx.stroke();
  }

  // ── family tree ──
  G.openTree = function () {
    const W = G.W; if (!W) return;
    const o = openOverlay('tree', '<div class="glass sheet"><div class="top"><h2>FAMILY TREE</h2><div class="tabs" style="min-width:240px" id="trTabs"><button data-t="anc">ANCESTRY</button><button data-t="sp" class="on">SPECIES</button></div><button class="btn sm" id="trClose">' + ICON.close + 'CLOSE</button></div><div class="body"><canvas id="treeCanvas" width="1100" height="680"></canvas><div class="empty" id="trNote" style="padding:10px"></div></div></div>');
    let tab = G.R.sel && !G.R.sel.dead ? 'anc' : 'sp';
    const draw = function () {
      const tabs = $('trTabs').children;
      for (let i = 0; i < tabs.length; i++) tabs[i].classList.toggle('on', tabs[i].dataset.t === tab);
      if (tab === 'anc') drawAncestry($('treeCanvas'), $('trNote')); else drawSpeciesTree($('treeCanvas'), $('trNote'));
    };
    $('trClose').onclick = function () { closeModal(); };
    const tabs = $('trTabs').children;
    for (let i = 0; i < tabs.length; i++) tabs[i].onclick = function () { tab = this.dataset.t; G.sfx('click'); draw(); };
    draw();
    G.sfx('click');
  };

  function drawAncestry(cv, note) {
    const ctx = cv.getContext('2d'), w = cv.width, h = cv.height;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, w, h);
    const c = G.R.sel;
    if (!c) { note.textContent = 'Click a creature in the pond first, then open the tree to see its ancestors.'; return; }
    const chain = [{ g: c.g, gen: c.born, id: c.id, muts: c.muts.filter(function (m) { return m.big; }).map(function (m) { return m.text; }), mate: c.mate }];
    let s = c.dad;
    while (s && chain.length < 9) { chain.push({ g: s.g, gen: s.gen, id: s.id, muts: s.muts || [], mate: s.mate }); s = s.up; }
    chain.reverse();
    const n = chain.length, gap = Math.min(220, (w - 160) / Math.max(1, n - 1));
    const y = h / 2, x0 = n === 1 ? w / 2 : (w - gap * (n - 1)) / 2;
    ctx.strokeStyle = G.rgba(PAL.frost, 0.3); ctx.lineWidth = 3;
    for (let i = 0; i < n - 1; i++) { ctx.beginPath(); ctx.moveTo(x0 + i * gap + 46, y); ctx.lineTo(x0 + (i + 1) * gap - 46, y); ctx.stroke(); }
    ctx.textAlign = 'center';
    for (let i = 0; i < n; i++) {
      const a = chain[i], x = x0 + i * gap;
      const pv = G.preview(a.g, a.id); pv.ang = 0;
      G.drawFit(ctx, pv, x, y, 62, 1.2);
      ctx.fillStyle = G.rgba(PAL.frost, 0.9); ctx.font = '700 22px system-ui, sans-serif';
      ctx.fillText(i === n - 1 ? '#' + a.id + ' (chosen)' : '#' + a.id, x, y + 92);
      ctx.fillStyle = G.rgba(PAL.frost, 0.55); ctx.font = '18px system-ui, sans-serif';
      ctx.fillText('gen ' + a.gen, x, y + 116);
      if (a.muts && a.muts.length) { ctx.fillStyle = PAL.rose; ctx.font = '17px system-ui, sans-serif'; const t = a.muts.slice(0, 2).join(', '); ctx.fillText(t.length > 26 ? t.slice(0, 25) + '…' : t, x, y + 140); }
      if (a.mate && a.mate.g) {
        const mp = G.preview(a.mate.g, a.mate.id); mp.ang = 0;
        ctx.save(); ctx.globalAlpha = 0.65;
        G.drawFit(ctx, mp, x, y - 170, 42, 1.2);
        ctx.restore();
        ctx.strokeStyle = G.rgba(PAL.rose, 0.5); ctx.setLineDash([6, 5]); ctx.beginPath(); ctx.moveTo(x, y - 124); ctx.lineTo(x, y - 66); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = G.rgba(PAL.rose, 0.8); ctx.font = '16px system-ui, sans-serif'; ctx.fillText('mixed with #' + a.mate.id, x, y - 218);
      }
    }
    note.style.textAlign = 'left';
    note.innerHTML = (n === 1 ? '<div>A founder: it has no recorded ancestors.</div>' : '<div style="margin-bottom:6px">From the oldest known ancestor to the creature you chose. Each line is one birth and what changed in it:</div>') +
      chain.map(function (a, i) { return '<div style="padding:3px 0;border-bottom:1px solid rgba(207,232,255,.08);font-size:13px"><b>#' + a.id + '</b> <small>gen ' + a.gen + '</small> · ' + (i === 0 && n > 1 ? 'oldest known ancestor' : a.muts && a.muts.length ? '<span style="color:var(--rose)">' + esc(a.muts.join(', ')) + '</span>' : 'a copy of its mother, with only small changes') + (a.mate && a.mate.id ? ' <small>· mixed with #' + a.mate.id + '</small>' : '') + (i === n - 1 ? ' <b style="color:var(--gold)">← chosen</b>' : '') + '</div>'; }).join('');
  }

  function drawSpeciesTree(cv, note) {
    const W = G.W, ctx = cv.getContext('2d'), w = cv.width, h = cv.height;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, w, h);
    const list = W.species.slice().sort(function (a, b) { return a.born - b.born || a.id - b.id; });
    if (list.length < 2) { note.textContent = 'The tree grows as species split apart. Give it a few generations.'; return; }
    const g0 = 1, g1 = Math.max(W.gen, 2), pad = 40;
    const X = function (g) { return pad + (w - pad * 2) * (g - g0) / (g1 - g0); };
    const lane = {};
    list.forEach(function (s, i) { lane[s.id] = i; });
    const lh = Math.min(26, (h - pad * 2) / list.length);
    const Y = function (id) { return pad + lh * lane[id] + lh / 2; };
    list.forEach(function (s) {
      const col = G.hsl(s.hue, 75, 65, 1);
      const end = s.extinct ? s.diedGen : g1;
      const y = Y(s.id);
      if (s.parent && lane[s.parent] !== undefined) {
        ctx.strokeStyle = G.rgba(PAL.frost, 0.25); ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(X(s.born), Y(s.parent)); ctx.bezierCurveTo(X(s.born), y, X(s.born) + 8, y, X(s.born) + 14, y); ctx.stroke();
      }
      ctx.strokeStyle = col; ctx.globalAlpha = s.extinct ? 0.5 : 0.95; ctx.lineCap = 'round';
      const hist = s.hist || [];
      for (let k = 0; k < hist.length; k++) {
        const gen = Math.max(s.born, g1 - hist.length + 1 + k), gx = X(gen);
        ctx.lineWidth = Math.max(2, Math.min(lh * 0.8, Math.sqrt(hist[k]) * 1.2));
        ctx.beginPath(); ctx.moveTo(gx, y); ctx.lineTo(X(Math.min(g1, gen + 1)), y); ctx.stroke();
      }
      ctx.globalAlpha = 1;
      if (s.extinct) { ctx.fillStyle = G.rgba(PAL.rose, 0.8); ctx.beginPath(); ctx.arc(X(end), y, 4, 0, 6.2832); ctx.fill(); }
      if (lh >= 14) { ctx.fillStyle = G.rgba(PAL.frost, 0.85); ctx.font = '14px system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.fillText(s.name, X(s.born) + 16, y - lh * 0.3 - 1); }
    });
    ctx.fillStyle = G.rgba(PAL.frost, 0.5); ctx.font = '16px system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.fillText('gen 1', 6, h - 8);
    ctx.textAlign = 'right'; ctx.fillText('gen ' + g1, w - 6, h - 8);
    note.textContent = 'Every line is a species through time. Thicker means more creatures. A pink dot is where it died out.';
  }

  // ── confirm / new pond ──
  G.confirm = function (text, yes, cb) {
    const o = openOverlay('confirm', '<div class="glass sheet" style="width:min(420px,100%);align-items:center;text-align:center"><h3 style="margin-bottom:12px">' + esc(text) + '</h3><div class="actions" style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center"><button class="btn rose" id="cfYes">' + esc(yes) + '</button><button class="btn" id="cfNo">CANCEL</button></div></div>');
    $('cfYes').onclick = function () { closeModal(); G.sfx('click'); cb(); };
    $('cfNo').onclick = function () { closeModal(); };
  };
  G.confirmNew = function () {
    const W = G.W;
    const hasF = W && W.fossils.length;
    const o = openOverlay('new', '<div class="glass sheet" style="width:min(440px,100%);align-items:center;text-align:center"><h3 style="margin-bottom:6px">A NEW POND?</h3><small style="margin-bottom:14px">This pond will end. Its species become fossils.</small><div class="actions" style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center"><button class="btn rose" id="nwRand">' + ICON.drop + 'RANDOM POND</button>' + (hasF ? '<button class="btn" id="nwFos">' + ICON.book + 'SEED FROM FOSSIL</button>' : '') + '<button class="btn" id="nwNo">CANCEL</button></div></div>');
    $('nwRand').onclick = function () { closeModal(); G.sfx('click'); G.newPond({}); };
    if (hasF) $('nwFos').onclick = function () { closeModal(); UI.guideTab = 'fossil'; G.openGuide(); };
    $('nwNo').onclick = function () { closeModal(); };
  };

  // ── what the AI cost: every kind of call, this session and for this pond since it began ──
  G.showCosts = function () {
    const A = G.ai, kinds = Object.keys(A.LABEL).concat(Object.keys(A.life).filter(function (k) { return !A.LABEL[k]; }));
    const m = function (v) { return v ? '$' + v.toFixed(v < 1 ? 4 : 2) : '$0'; };
    let rows = '', sA = 0, sF = 0, sU = 0, lF = 0, lU = 0, sB = 0;
    for (let i = 0; i < kinds.length; i++) {
      const k = kinds[i], c = A.count[k] || { asked: 0, fresh: 0, usd: 0 }, L = A.life[k] || { asked: 0, fresh: 0, usd: 0 };
      sA += c.asked; sF += c.fresh; sU += c.usd || 0; lF += L.fresh; lU += L.usd;
      const bud = A.budgetOf ? A.budgetOf(k) : 0, out = A.over && A.over(k), part = bud ? Math.min(1, L.usd / bud) : 0; sB += bud;
      rows += '<tr' + (out ? ' style="opacity:.55"' : '') + '><td style="text-align:left">' + esc(A.LABEL[k] || k) + (out ? ' <b style="color:var(--rose);font-size:10px;letter-spacing:.08em">OFF</b>' : '') + '</td><td>' + c.fresh + '</td><td>' + (c.asked - c.fresh) + '</td><td><b>' + m(c.usd) + '</b></td><td style="color:rgba(207,232,255,.7)">' + L.fresh + '</td><td style="color:rgba(207,232,255,.7)">' + m(L.usd) + '</td><td style="white-space:nowrap"><span style="display:inline-block;vertical-align:middle;width:46px;height:5px;border-radius:3px;background:rgba(207,232,255,.18);overflow:hidden;margin-right:6px"><i style="display:block;height:100%;width:' + Math.round(part * 100) + '%;background:' + (out ? 'var(--rose)' : part > 0.75 ? 'var(--gold)' : '#33d6a6') + '"></i></span>$<input data-bud="' + esc(k) + '" type="number" min="0" max="50" step="0.05" value="' + bud.toFixed(2) + '" title="What this kind may spend in this pond, in dollars. 0 turns it off." style="width:62px;padding:3px 5px;border-radius:7px;border:1px solid ' + (A.budgetSet && typeof A.budgetSet[k] === 'number' ? 'var(--gold)' : 'rgba(207,232,255,.3)') + ';background:rgba(7,18,31,.7);color:#fff;font:600 12px system-ui,sans-serif;text-align:right"></td></tr>';
    }
    rows += '<tr style="border-top:1px solid rgba(207,232,255,.25)"><td style="text-align:left;color:var(--gold)"><b>TOTAL</b></td><td>' + sF + '</td><td>' + (sA - sF) + '</td><td><b style="color:var(--gold)">' + m(sU) + '</b></td><td>' + lF + '</td><td><b style="color:var(--gold)">' + m(lU) + '</b></td><td style="white-space:nowrap"><b style="color:var(--gold)">$' + sB.toFixed(2) + '</b></td></tr>' +
      '<tr><td colspan="7" style="text-align:right;font-size:12px;padding-top:4px">You have given this pond <b style="color:var(--gold)">$' + sB.toFixed(2) + '</b> in all. It has used <b>' + m(lU) + '</b>; <b>$' + Math.max(0, sB - lU).toFixed(2) + '</b> is left.</td></tr>';
    const last = A.ledger.filter(function (e) { return e.paid; }).slice(-10).reverse().map(function (e) { const d = new Date(e.at); return '<div style="display:flex;justify-content:space-between;font-size:11.5px;padding:1px 0"><span>' + ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2) + ' · gen ' + e.gen + ' · ' + esc(A.LABEL[e.kind] || e.kind) + '</span><b>' + (e.usd === null ? 'no price set' : m(e.usd)) + '</b></div>'; }).join('');
    openOverlay('costs', '<div class="glass sheet" style="width:min(760px,100%);max-height:92vh;overflow:auto"><h3 style="margin-bottom:4px">WHAT THE AI COST</h3><small style="margin-bottom:10px;display:block">Every paid answer is counted here, in dollars for now. "Paid" means a model really ran; "free" came from the library of earlier answers, or from the pond itself.</small>' +
      '<table style="width:100%;border-collapse:collapse;font-size:12.5px;text-align:right"><tr style="font-size:10px;letter-spacing:.08em;color:rgba(207,232,255,.6)"><th style="text-align:left;font-weight:600">WHAT FOR</th><th style="font-weight:600">PAID</th><th style="font-weight:600">FREE</th><th style="font-weight:600">THIS SESSION</th><th style="font-weight:600">PAID, THIS POND</th><th style="font-weight:600">THIS POND</th><th style="font-weight:600">BUDGET, THIS POND</th></tr>' + rows + '</table>' +
      '<small style="display:block;margin-top:6px">Each kind of AI work has its own budget for one pond, and <b>you set it</b>: type the dollars in the last column (0 turns that kind off). When a budget is used up that kind is OFF in this pond. Your budgets are kept with the pond and carried into a new one. <a href="#" id="budReset" style="color:var(--gold)">Back to the usual budgets</a></small>' +
      (A.unpriced ? '<small style="display:block;margin-top:6px;color:var(--rose)">' + A.unpriced + ' paid answer' + (A.unpriced === 1 ? '' : 's') + ' came from a model with no price set, so the total is too low by that much.</small>' : '') +
      (A.fuel !== null ? '<small style="display:block;margin-top:6px">Fuel left: <b>' + A.fuel + '</b> paid answers.</small>' : '') +
      '<h3 style="font-size:11px;letter-spacing:.16em;margin:12px 0 4px;color:var(--gold)">LATEST PAID ANSWERS</h3>' + (last || '<small>None yet this session.</small>') +
      '<h3 style="font-size:11px;letter-spacing:.16em;margin:12px 0 4px;color:var(--gold)">THE SERVER’S OWN BOOKS</h3><div id="costBooks"><small>Asking the server…</small></div>' +
      '<small style="display:block;margin-top:10px">Plans and marvels come by the generation, so a faster pond asks for them sooner; each kind stops at its budget.</small>' +
      '<div class="actions" style="display:flex;justify-content:flex-end;margin-top:12px"><button class="btn" id="costClose">CLOSE</button></div></div>');
    $('costClose').onclick = function () { closeModal(); };
    // the budgets are the player's to set
    { const ins = document.querySelectorAll('input[data-bud]'), again = function () { const sh = document.querySelector('.sheet'), y = sh ? sh.scrollTop : 0; G.showCosts(); const s2 = document.querySelector('.sheet'); if (s2) s2.scrollTop = y; };
      for (let i = 0; i < ins.length; i++) ins[i].onchange = function () { const el = this; if (A.setBudget) A.setBudget(el.getAttribute('data-bud'), el.value); setTimeout(function () { if (document.body.contains(el)) again(); }, 0); };
      const rs = $('budReset'); if (rs) rs.onclick = function (e) { e.preventDefault(); if (A.resetBudgets) A.resetBudgets(); again(); }; }
    // the server keeps its own account of every call it made, for every player, with the prices it used: shown as it is
    const box = $('costBooks');
    if (!(G.host && G.host.ready && G.host.caps.ai)) { box.innerHTML = '<small>No server is connected: nothing has been paid for.</small>'; return; }
    G.host.call('ai.usage', {}, 15000).then(function (u) {
      if (!$('costBooks') || !u || !u.allTime) { if ($('costBooks')) box.innerHTML = '<small>The server did not send its books.</small>'; return; }
      const P = (u.prices && u.prices.perMillionTokens) || {}, ids = Object.keys(u.allTime.byModel);
      const k = function (n) { return n >= 1e6 ? (n / 1e6).toFixed(2) + 'M' : n >= 1000 ? (n / 1000).toFixed(1) + 'k' : String(n || 0); };
      let rows = '';
      ids.sort(function (x, y) { return (u.allTime.byModel[y].usd || 0) - (u.allTime.byModel[x].usd || 0); }).forEach(function (id) {
        const b = u.allTime.byModel[id], t = (u.byModel && u.byModel[id]) || { calls: 0, usd: 0 }, pr = P[id];
        rows += '<tr><td style="text-align:left">' + esc(G.ai.labelOf(id) || id) + '<div style="font-size:10px;color:rgba(207,232,255,.55)">' + (pr ? '$' + pr[0] + ' in · $' + pr[1] + ' out, per million tokens' : /leonardo/.test(id) ? 'billed per sound, as Leonardo reports it' : '<span style="color:var(--rose)">no price set</span>') + '</div></td><td>' + t.calls + '</td><td><b>' + m(t.usd) + '</b></td><td>' + b.calls + '</td><td>' + k(b.input) + ' / ' + k(b.output) + '</td><td><b style="color:var(--gold)">' + m(b.usd) + '</b>' + (b.unpricedCalls ? '<div style="font-size:10px;color:var(--rose)">+' + b.unpricedCalls + ' unpriced</div>' : '') + '</td></tr>';
      });
      box.innerHTML = (rows ? '<table style="width:100%;border-collapse:collapse;font-size:12px;text-align:right"><tr style="font-size:10px;letter-spacing:.06em;color:rgba(207,232,255,.6)"><th style="text-align:left;font-weight:600">MODEL</th><th style="font-weight:600">CALLS TODAY</th><th style="font-weight:600">TODAY</th><th style="font-weight:600">CALLS EVER</th><th style="font-weight:600">TOKENS IN / OUT</th><th style="font-weight:600">EVER</th></tr>' + rows +
        '<tr style="border-top:1px solid rgba(207,232,255,.25)"><td style="text-align:left;color:var(--gold)"><b>ALL MODELS</b></td><td>' + (u.calls || 0) + '</td><td><b>' + m(u.usd) + '</b></td><td>' + u.allTime.calls + '</td><td></td><td><b style="color:var(--gold)">' + m(u.allTime.usd) + '</b></td></tr></table>' : '<small>No paid call has been made yet.</small>') +
        '<small style="display:block;margin-top:6px">For every player of this server, since ' + esc(u.allTime.since) + '. Prices are the providers’ list prices, checked ' + esc((u.prices && u.prices.checked) || '?') + '; each call is priced when it is made.</small>';
    }, function () { if ($('costBooks')) box.innerHTML = '<small>The server’s books could not be read.</small>'; });
  };

  // fossils outlive ponds
  G.newPond = function (opts) {
    const old = G.W;
    let keep = [];
    if (old) {
      keep = old.fossils.slice();
      old.species.forEach(function (s) { if (!s.extinct && s.n > 0 && s.rep) keep.push({ id: s.id, name: s.name, born: s.born, died: old.gen, g: s.rep, peak: s.peak }); });
    }
    const shelf = old && old.shelf ? old.shelf.slice() : [];
    const evShelf = old && old.evShelf ? old.evShelf.slice() : [];
    G.startPond(opts);
    G.W.fossils = keep.slice(-40);
    G.W.shelf = shelf;
    G.W.evShelf = evShelf;
    G.closeModal();
    G.setSpeed(1);
    G.markDirty();
  };

  // ── the still pond (extinction) ──
  G.on('extinct', function () {
    if (G.mode !== 'play') return;
    if (G.far && G.far.there && G.far.there()) return;      // a far pond fell still while you were there: the ship takes you home (59_voyage.js)
    const W = G.W;
    G.sfx('extinct');
    const best = W.fossils.slice().sort(function (a, b) { return b.peak - a.peak; })[0];
    const o = openOverlay('still', '<div class="glass sheet" style="width:min(560px,100%);text-align:center;align-items:center"><h2 style="font-size:24px;letter-spacing:.3em;margin-bottom:8px">THE POND IS STILL</h2><small style="margin-bottom:12px">Everything died out in generation ' + W.gen + '. Evolution is not kind. Nothing was lost, though: the species left fossils.</small><div class="body cards" id="stCards" style="width:100%;margin-bottom:12px"></div><div class="actions" style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center"><button class="btn rose big" id="stNew">NEW POND</button>' + (best ? '<button class="btn big" id="stSeed">SEED FROM FOSSIL</button>' : '') + '</div></div>');
    const cards = $('stCards');
    W.fossils.slice(-4).reverse().forEach(function (f) { const card = el('div', 'card dead', '', cards); if (f.g) cardCanvas(card, f.g, f.id); el('div', '', '<b>' + esc(f.name) + '</b><small>gen ' + f.born + '–' + f.died + '</small>', card); });
    $('stNew').onclick = function () { closeModal(); G.newPond({}); };
    if (best) $('stSeed').onclick = function () { closeModal(); G.newPond({ fossil: best }); };
  });

  // ── menu: sound, full screen, start over ──
  G.openMenu = function () {
    if (UI.menuOpen) { G.closeMenu(); return; }
    G.closePop();
    UI.menuOpen = true;
    PXSpause(true);
    const m = el('div', 'overlay', '', $('ui')); m.id = 'menu';
    m.innerHTML = '<div class="glass sheet" style="width:min(400px,100%)"><div class="top"><h2>SETTINGS</h2><button class="btn sm" id="mnClose">' + ICON.close + 'CLOSE</button></div><div class="body" id="mnBody"></div></div>';
    m.addEventListener('pointerdown', function (e) { if (e.target === m) G.closeMenu(); });
    UI.menuEl = m;
    buildSoundControls($('mnBody'), true);
    $('mnClose').onclick = function () { G.closeMenu(); };
  };
  G.closeMenu = function () {
    if (UI.menuEl) { UI.menuEl.remove(); UI.menuEl = null; }
    UI.menuOpen = false;
    if (!UI.modal) PXSpause(false);
  };

  function buildSoundControls(root, withStart) {
    const has = !!window.PXS;
    const mk = function (label, isMusic) {
      const row = el('div', 'tog', '', root);
      const b = el('button', 'btn sm', '', row);
      const inp = el('input', '', '', row); inp.type = 'range'; inp.min = 0; inp.max = 1; inp.step = 0.01;
      inp.setAttribute('aria-label', label + ' volume');
      const upd = function () {
        if (!has) return;
        const on = isMusic ? PXS.musicOn : PXS.sfxOn;
        b.innerHTML = ICON.speaker + label + ' ' + (on ? 'ON' : 'OFF'); b.classList.toggle('on', !!on);
        inp.value = isMusic ? PXS.musicLevel : PXS.sfxLevel;
      };
      b.onclick = function () { if (!has) return; if (isMusic) PXS.toggleMusic(); else PXS.toggleSfx(); upd(); };
      inp.oninput = function () { if (!has) return; if (isMusic) PXS.musicVolume(+inp.value); else PXS.sfxVolume(+inp.value); };
      upd();
      if (has && PXS.onChange) PXS.onChange(upd);
    };
    if (has) { mk('MUSIC', true); mk('EFFECTS', false); }
    if (window.Plaxzy && Plaxzy.fullscreen) {
      const fs = el('button', 'btn sm', '', root); fs.style.marginTop = '8px';
      const upd = function () { fs.innerHTML = ICON.full + (Plaxzy.fullscreen.on ? 'EXIT FULL SCREEN' : 'FULL SCREEN'); };
      fs.onclick = function () { Plaxzy.fullscreen.toggle(); };
      upd();
      if (Plaxzy.fullscreen.onChange) Plaxzy.fullscreen.onChange(upd);
    }
    if (has && !touchy()) el('div', 'desc', 'Press M to mute everything.', root).style.marginTop = '10px';
    if (G.ai.models.length > 1 && G.ai.provider === 'server') {
      const t = G.ai.totals(), cnt = G.ai.count, used = G.ai.used, caps = G.ai.caps;
      const one = function (k, label) { const c = cnt[k] || { asked: 0, fresh: 0 }; return '<div style="display:flex;justify-content:space-between;font-size:12px;padding:2px 0"><span>' + label + '</span><span>' + (c.usd ? G.ai.money(c.usd) + ' · ' : '') + '<b>' + c.fresh + '</b> new' + (c.asked > c.fresh ? ' · ' + (c.asked - c.fresh) + ' reused' : '') + '</span></div>'; };
      el('h3', '', 'AI USED THIS SESSION', root).style.cssText = 'font-size:12px;letter-spacing:.2em;margin:14px 0 4px;color:var(--gold)';
      el('div', '', one('thing', 'Words you added') + one('event', 'Events you typed') + one('organ', 'New organs (at most ' + caps.organ + ', one per 40 s)') + one('story', 'Story chapters (at most ' + caps.story + ', one per 45 s)') + one('ideas', 'Mutation ideas (at most ' + caps['mutation-ideas'] + ', one per 2 min)') + (G.ai.sound ? one('sound', 'Sounds (one per new word, at most ' + caps.sound + ')') : '') +
        one('judge', 'The eye for beauty: grading creatures (at most ' + caps.judge + ')') + one('check', 'The eye for beauty: looking over new ideas (at most ' + caps.check + ')') + one('plan', 'New shapes of body (at most ' + caps.plan + ')') + one('design', 'New kinds of body part (at most ' + caps.design + ')') +
        '<div style="display:flex;justify-content:space-between;font-size:12px;padding:4px 0 0;margin-top:4px;border-top:1px solid rgba(207,232,255,.15)"><span>Total</span><span><b style="color:var(--gold)">' + G.ai.money(t.usd) + '</b> · <b>' + t.fresh + '</b> new answers · ' + (t.asked - t.fresh) + ' reused for free' + (t.unpriced ? ' · ' + t.unpriced + ' with no price set' : '') + '</span></div>', root);
      el('div', 'desc', 'Breeding and selection never ask the AI: they run every generation on their own, using the learned guess the pond keeps of what the watcher likes. The watcher looks by the clock (so at fast-forward more generations pass between looks); plans and marvels come by the generation (so a faster pond asks for those sooner). Each kind has a budget you can set in the costs sheet.', root).style.marginTop = '6px';
      el('h3', '', 'WHO IMAGINES', root).style.cssText = 'font-size:12px;letter-spacing:.2em;margin:14px 0 4px;color:var(--gold)';
      el('div', 'desc', 'The AI that decides what your words become, and suggests mutations. Each one imagines differently.', root);
      const row = el('div', 'chips', '', root);
      const cur = G.ai.model || (G.ai.models[0] && G.ai.models[0].id);
      G.ai.models.forEach(function (m) {
        const b = el('button', 'chip', esc(m.label), row);
        if (m.id === cur) b.style.cssText = 'border-color:var(--gold);box-shadow:0 0 12px rgba(246,211,101,.35)';
        b.onclick = function () { G.ai.model = m.id; G.sfx('click'); G.markDirty(); const kids = row.children; for (let i = 0; i < kids.length; i++) kids[i].style.cssText = ''; b.style.cssText = 'border-color:var(--gold);box-shadow:0 0 12px rgba(246,211,101,.35)'; if (G.W) { G.W.pool = []; G.W.poolBusy = false; G.ai.refill(); } };
      });
    }
    if (withStart && G.mode === 'play') {
      const st = el('button', 'btn sm rose', 'START OVER', root); st.style.marginTop = '14px';
      st.onclick = function () { G.confirm('Erase the saved pond, guide and fossils?', 'ERASE', function () { G.closeMenu(); G.eraseSave(); G.W.fossils = []; G.newPond({}); }); };
    }
  }

  // ── title screen ──
  G.buildTitle = function () {
    const t = el('div', 'overlay', '', $('ui')); t.id = 'title';
    const tc = touchy();
    const keys = [
      ['T', 'ADD', 'Add a thing'], ['', 'WORLD', 'Weather and disasters'], ['1 2 3 4', 'SPEED', 'Fast-forward'], ['Space', 'PAUSE', 'Pause time'],
      ['F', 'BOOK', 'Book of Life'], ['G', 'TREE', 'Family tree'], ['Click', 'TAP', 'Inspect a creature'], ['N', 'NEW', 'A new pond'],
    ];
    t.innerHTML = '<h1>PRIMORDIA</h1><div class="tag">Be nature. Watch life invent itself.</div>' +
      '<div class="actions"><button class="btn big pulse" id="tBegin">BEGIN</button><button class="btn big hide" id="tCont">CONTINUE</button></div>' +
      '<div class="nature">you are nature · nothing here is scripted</div>' +
      '<div class="glass keys">' + keys.map(function (k) { return '<div>' + (tc ? '<span class="kc">' + k[1] + '</span>' : '<span class="kc">' + (k[0] || k[1]) + '</span>') + '<span>' + k[2] + '</span></div>'; }).join('') + '</div>' +
      '<div class="sound-row"><button class="btn sm" id="tSound">' + ICON.speaker + 'SOUND</button></div>';
    $('tBegin').onclick = function () { G.sfx('click'); G.beginGame(); };
    $('tSound').onclick = function () { G.sfx('click'); G.openMenu(); };
    $('tCont').onclick = function () { G.sfx('click'); G.beginGame(true); };
    UI.titleEl = t;
  };
  G.showContinue = function (on) { const c = $('tCont'); if (c) c.classList.toggle('hide', !on); const b = $('tBegin'); if (b && on) b.textContent = 'NEW POND'; };

  G.beginGame = function (cont) {
    if (G.mode === 'play') return;
    const sv = cont ? G.pendingSave : null;
    if (sv) { G.applySave(sv); }
    else { G.startPond({}); }
    G.mode = 'play';
    G.setSpeed(1);
    G.showHud(true);
    UI.titleEl.classList.add('out');
    setTimeout(function () { if (UI.titleEl) UI.titleEl.classList.add('hide'); }, 950);
    G.emit('begin');
    // the pond went on living while the game was closed
    if (sv && sv.at) G.startCatchUp((Date.now() - sv.at) / 1000);
    // the server already lived the time for us: show what it found
    if (sv && G.pendingReport) { const r = G.pendingReport; G.pendingReport = null; setTimeout(function () { G.showAwayReport(r); }, 400); }
  };

  // ── keys ──
  G.on('key', function (k, e) {
    if (G.mode === 'title') {
      if (k === 'Enter' || k === ' ') { if (!UI.menuOpen) G.beginGame(); }
      if (k === 'm') { if (window.PXS && PXS.toggleMute) PXS.toggleMute(); }
      if (k === 'Escape' && UI.menuOpen) G.closeMenu();
      return;
    }
    if (G.mode !== 'play') return;
    if (k === 'm') { if (window.PXS && PXS.toggleMute) PXS.toggleMute(); return; }
    if (k === 'Escape') {
      if (UI.menuOpen) G.closeMenu();
      else if (UI.modal && UI.modal !== 'still') closeModal();
      else if (UI.placing || UI.meteor) G.cancelPlacing();
      else if (UI.popName) G.closePop();
      else if (G.R.sel) G.select(null);
      else G.openMenu();
      return;
    }
    if (UI.menuOpen || (UI.modal && UI.modal !== 'still')) {
      if ((k === 'f' && UI.modal === 'guide') || (k === 'g' && UI.modal === 'tree')) closeModal();
      return;
    }
    if (UI.modal) return;
    if (k === ' ') G.togglePause();
    else if (k === '1') G.setSpeed(1);
    else if (k === '2') G.setSpeed(4);
    else if (k === '3') G.setSpeed(16);
    else if (k === '4') G.setSpeed(64);
    else if (k === '=' || k === '+') G.zoomAt(1.35);
    else if (k === '-') G.zoomAt(1 / 1.35);
    else if (k === '0') { G.camHome(); }
    else if (k === 't') G.act('add');
    else if (k === 'f') G.act('guide');
    else if (k === 'g') G.act('tree');
    else if (k === 'n') G.act('new');
  });
  G.on('escape', function () { if (G.mode === 'play' && UI.popName) G.closePop(); });
  G.on('speed', function () { if (UI.popName === 'speed') G.closePop(); });
})();
