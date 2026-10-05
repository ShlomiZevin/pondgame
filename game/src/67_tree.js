// ── The family tree, made to be read: cards with pictures and plain words instead of a diagram ──
(function () {
  'use strict';
  const PAL = G.PAL, el = G.el, $ = G.$, esc = G.escapeHtml, UI = G.ui;
  const FOOD = ['gold', 'lime', 'green', 'blue', 'violet', 'pink'];
  const PARTS = ['mouth', 'fin', 'spike', 'armour plate', 'eye', 'lamp', 'poison gland', 'tail', 'cilia fringe'];

  function plural(n, w) { return n + ' ' + (n === 1 ? w : /s$|x$/.test(w) ? w + 'es' : /y$/.test(w) ? w.slice(0, -1) + 'ies' : w + 's'); }

  /** What is different in body b compared with body a, in plain words (most important first). */
  G.genomeDiff = function (a, b) {
    const pa = G.derive(a), pb = G.derive(b), out = [];
    const push = function (t, good) { out.push({ t: t, good: good !== false }); };
    // the body first: what grew, what was lost, what it turned into
    const ka = G.form.kind(a.f), kb = G.form.kind(b.f);
    if (ka.kind !== kb.kind) push('became a ' + kb.kind.toLowerCase() + ' (was a ' + ka.kind.toLowerCase() + ')');
    const fd = G.form.diff(a.f, b.f);
    for (let i = 0; i < fd.length; i++) push(fd[i][0], fd[i][1]);
    // organs
    const orgs = function (g) { const o = {}; for (let i = 0; i < g.p.length; i++) o[g.p[i].k] = 1; return o; };
    const oa = orgs(a), ob = orgs(b);
    for (const k in ob) if (!oa[k]) { const o = G.organOf(+k); if (o) push('new organ: ' + o.name); }
    for (const k in oa) if (!ob[k]) { const o = G.organOf(+k); if (o) push('lost its ' + o.name, false); }
    // size, speed
    if (Math.abs(pb.r - pa.r) / pa.r > 0.12) push((pb.r > pa.r ? 'bigger: ' : 'smaller: ') + pa.r.toFixed(0) + ' → ' + pb.r.toFixed(0), true);
    if (Math.abs(pb.speed - pa.speed) / pa.speed > 0.15) push((pb.speed > pa.speed ? 'faster: ' : 'slower: ') + pa.speed.toFixed(0) + ' → ' + pb.speed.toFixed(0), pb.speed > pa.speed);
    // way of life
    if (pb.photo > 0.3 && pa.photo <= 0.3) push('now feeds on light');
    for (let i = 0; i < 6; i++) {
      if (pb.dig[i] >= 0.5 && pa.dig[i] < 0.5) push('can now eat ' + FOOD[i] + ' food');
      else if (pb.dig[i] < 0.2 && pa.dig[i] >= 0.2) push('can no longer eat ' + FOOD[i] + ' food', false);
    }
    const RES = ['heat', 'cold', 'poison'];
    for (let i = 0; i < 3; i++) if (pb.res[i] >= 0.5 && pa.res[i] < 0.5) push(RES[i] + '-proof');
    // brain
    if (b.h !== a.h) push(b.h > a.h ? 'brain grew: ' + plural(b.h, 'thinking cell') : 'a simpler brain', b.h > a.h);
    else if (Math.abs(b.w.length - a.w.length) >= 3) push('brain rewired: ' + a.w.length + ' → ' + b.w.length + ' wires', b.w.length > a.w.length);
    let dh = Math.abs(pb.hue - pa.hue); if (dh > 180) dh = 360 - dh;
    if (dh > 45) push('changed colour');
    return out.slice(0, 5);
  };

  function picture(parent, genome, id, px, skin) {
    const cv = el('canvas', '', '', parent);
    cv.width = cv.height = px * 2; cv.style.cssText = 'width:' + px + 'px;height:' + px + 'px;display:block;margin:0 auto';
    const pv = G.preview(genome, id || 3); pv.ang = -0.35; pv.glow = 0.7;
    G.drawFit(cv.getContext('2d'), pv, px, px, px * 0.88, 1.2);
    return cv;
  }
  function card(row, genome, id, title, sub, diffs, mark, skin) {
    const c = el('div', '', '', row);
    c.style.cssText = 'flex:0 0 172px;padding:10px;border-radius:14px;background:rgba(7,18,31,.5);border:1px solid ' + (mark ? 'var(--gold)' : 'rgba(207,232,255,.14)') + ';' + (mark ? 'box-shadow:0 0 16px rgba(246,211,101,.25)' : '');
    picture(c, genome, id, 104, skin);
    el('div', '', '<b style="font-size:13px">' + esc(title) + '</b>', c).style.cssText = 'text-align:center;margin-top:4px;line-height:1.25';
    el('div', '', esc(sub), c).style.cssText = 'text-align:center;font-size:11px;color:rgba(207,232,255,.65);margin-bottom:6px';
    if (diffs === null) el('div', '', 'where this line begins', c).style.cssText = 'font-size:12px;color:rgba(207,232,255,.6);text-align:center';
    else if (!diffs.length) el('div', '', 'only small changes', c).style.cssText = 'font-size:12px;color:rgba(207,232,255,.6);text-align:center';
    else diffs.forEach(function (d) { const w = d.good && G.whyLine ? G.whyLine(d.t) : ''; el('div', '', (d.good ? '+ ' : '− ') + esc(d.t) + (w ? '<div style="font-size:10.5px;line-height:1.25;color:rgba(207,232,255,.6);margin:0 0 3px 10px">' + esc(w) + '</div>' : ''), c).style.cssText = 'font-size:12.5px;line-height:1.35;color:' + (d.good ? 'var(--algae)' : 'var(--rose)'); });
    return c;
  }
  function arrow(row) { el('div', '', '→', row).style.cssText = 'flex:none;align-self:center;font-size:22px;color:rgba(207,232,255,.45)'; }
  function heading(root, title, text) {
    el('h3', '', title, root).style.cssText = 'font-size:13px;letter-spacing:.16em;color:var(--gold);margin:6px 0 2px';
    el('div', '', text, root).style.cssText = 'font-size:12.5px;color:rgba(207,232,255,.75);margin-bottom:8px';
  }
  function strip(root) { const r = el('div', '', '', root); r.style.cssText = 'display:flex;gap:8px;overflow-x:auto;padding-bottom:10px;margin-bottom:10px;align-items:stretch'; return r; }

  function renderAncestry(root) {
    root.innerHTML = '';
    const c = G.R.sel;
    if (!c) { el('div', 'empty', 'Click a creature in the pond first, then open the tree to see where it came from.', root); return; }
    // the deep past: species by species (this is remembered even after closing the game)
    const chainS = [];
    let s = G.speciesById(c.sp), guard = 0;
    if (!s) { const fv = G.features(c.g); let bd = 1e9; G.W.species.forEach(function (q) { if (q.extinct || !q.rep) return; const d = G.fdist(fv, q.fv); if (d < bd) { bd = d; s = q; } }); }
    while (s && s.rep && guard++ < 8) { chainS.push(s); s = s.parent ? G.speciesById(s.parent) : null; }
    chainS.reverse();
    if (chainS.length) {
      heading(root, 'ITS DEEP PAST, SPECIES BY SPECIES', chainS.length > 1 ? 'From the oldest kind this creature descends from, to its own kind today. Green is gained, pink is lost.' : 'Its kind has not split from another yet.');
      const row = strip(root);
      chainS.forEach(function (sp, i) {
        if (i) arrow(row);
        card(row, sp.rep, sp.id, sp.name, 'appeared in generation ' + sp.born + (sp.extinct ? ' · died out' : ' · ' + sp.n + ' alive'), i === 0 ? null : G.genomeDiff(chainS[i - 1].rep, sp.rep), i === chainS.length - 1, sp.skin);
      });
    }
    // the recent family: birth by birth
    const chain = [{ g: c.g, gen: c.born, id: c.id, mate: c.mate }];
    let p = c.dad;
    while (p && chain.length < 8) { chain.push({ g: p.g, gen: p.gen, id: p.id, mate: p.mate }); p = p.up; }
    chain.reverse();
    heading(root, 'ITS RECENT FAMILY, BIRTH BY BIRTH', chain.length > 1 ? 'Each card is one birth: a child, and how it differs from its mother.' : 'This creature has no recorded parents (a founder, or the pond was reloaded since).');
    const row2 = strip(root);
    chain.forEach(function (a, i) {
      if (i) arrow(row2);
      card(row2, a.g, a.id, '#' + a.id + (i === chain.length - 1 ? ' (chosen)' : ''), 'born in generation ' + a.gen + (a.mate && a.mate.id ? ' · two parents' : ''), i === 0 ? null : G.genomeDiff(chain[i - 1].g, a.g), i === chain.length - 1);
    });
    // then and now, at a glance
    const first = chainS.length > 1 ? chainS[0].rep : chain.length > 1 ? chain[0].g : null;
    if (first) {
      const all = G.genomeDiff(first, c.g);
      heading(root, 'THEN AND NOW', all.length ? 'Everything that separates this creature from the start of its line:' : 'It is still very like the start of its line.');
      if (all.length) el('div', '', all.map(function (d) { return '<span style="display:inline-block;margin:0 8px 6px 0;padding:5px 10px;border-radius:999px;font-size:12.5px;border:1px solid ' + (d.good ? 'rgba(51,214,166,.6)' : 'rgba(255,126,182,.6)') + '">' + (d.good ? '+ ' : '− ') + esc(d.t) + '</span>'; }).join(''), root);
    }
  }

  function renderSpecies(root) {
    root.innerHTML = '';
    const W = G.W;
    const all = W.species.filter(function (s) { return s.rep; });
    if (all.length < 2) { el('div', 'empty', 'The tree grows as kinds split apart. Give it a few generations.', root); return; }
    const byId = {}; all.forEach(function (s) { byId[s.id] = s; });
    const kids = {}; const roots = [];
    all.forEach(function (s) { if (s.parent && byId[s.parent]) (kids[s.parent] || (kids[s.parent] = [])).push(s); else roots.push(s); });
    const alive = function (s) { return !s.extinct && s.n > 0; };
    // a kind is shown if it is alive, or if a living kind descends from it
    const keep = {};
    const mark = function (s) { let k = alive(s); (kids[s.id] || []).forEach(function (ch) { if (mark(ch)) k = true; }); keep[s.id] = k; return k; };
    roots.forEach(mark);
    const showDead = !!UI.treeDead;
    const gone = all.filter(function (s) { return !keep[s.id]; }).length;
    const g1 = Math.max(W.gen, 2);
    heading(root, 'THE KINDS ALIVE NOW, AND WHERE THEY CAME FROM', 'Each row is a kind of creature. A row set in under another descends from it. The bar shows when it lived, from generation 1 to ' + g1 + '.');
    const list = el('div', '', '', root);
    const rowOf = function (s, depth) {
      if (!keep[s.id] && !showDead) return;
      const r = el('div', '', '', list);
      const live = alive(s);
      r.style.cssText = 'display:flex;align-items:center;gap:10px;padding:5px 6px;margin-left:' + Math.min(depth, 7) * 22 + 'px;border-left:' + (depth ? '2px solid rgba(207,232,255,.18)' : '0') + ';' + (live ? '' : 'opacity:.55');
      const pic = el('div', '', '', r); pic.style.cssText = 'flex:none;width:46px';
      picture(pic, s.rep, s.id, 46, s.skin);
      const txt = el('div', '', '<b style="font-size:13px">' + esc(s.name) + '</b><div style="font-size:11px;color:rgba(207,232,255,.65)">' + (live ? '<b style="color:var(--algae)">' + s.n + ' alive</b> · since generation ' + s.born : 'lived generation ' + s.born + ' to ' + (s.diedGen || s.lastGen) + ' · most ever ' + s.peak) + '</div>', r);
      txt.style.cssText = 'flex:0 0 230px;min-width:0';
      const lane = el('div', '', '', r); lane.style.cssText = 'flex:1;height:12px;border-radius:6px;background:rgba(7,18,31,.55);position:relative;min-width:60px';
      const end = live ? g1 : (s.diedGen || s.lastGen);
      const bar = el('div', '', '', lane);
      bar.style.cssText = 'position:absolute;top:0;bottom:0;border-radius:6px;left:' + (100 * (s.born - 1) / (g1 - 1)).toFixed(1) + '%;width:' + Math.max(1.5, 100 * (end - s.born) / (g1 - 1)).toFixed(1) + '%;background:' + G.hsl(G.derive(s.rep).hue, 75, live ? 60 : 45, 1);
      (kids[s.id] || []).slice().sort(function (a, b) { return a.born - b.born; }).forEach(function (ch) { rowOf(ch, depth + 1); });
    };
    roots.sort(function (a, b) { return a.born - b.born; }).forEach(function (s) { rowOf(s, 0); });
    if (gone) {
      const b = el('button', 'btn sm', showDead ? 'HIDE THE KINDS THAT DIED OUT' : 'SHOW THE ' + gone + ' THAT DIED OUT WITHOUT DESCENDANTS', root);
      b.style.marginTop = '10px';
      b.onclick = function () { UI.treeDead = !showDead; G.sfx('click'); renderSpecies(root); };
    }
  }

  G.openTree = function () {
    const W = G.W; if (!W) return;
    let tab = G.R.sel && !G.R.sel.dead ? 'anc' : 'sp';
    G.closeModal(true);
    const o = el('div', 'overlay', '', $('ui')); o.id = 'ov-tree';
    o.innerHTML = '<div class="glass sheet" style="width:min(1040px,100%)"><div class="top"><h2>FAMILY TREE</h2><div class="tabs" style="min-width:min(360px,100%)" id="trTabs"><button data-t="anc">THIS CREATURE</button><button data-t="sp">ALL KINDS</button></div><button class="btn sm" id="trClose">' + G.ICON.close + 'CLOSE</button></div><div class="body" id="trBody"></div></div>';
    o.addEventListener('pointerdown', function (e) { if (e.target === o) G.closeModal(); });
    UI.modal = 'tree'; UI.modalEl = o;
    G.closePop();
    if (window.PXS && PXS.pause) { try { PXS.pause({ music: false }); } catch (e) { console.error(e); } }
    const draw = function () {
      const tabs = $('trTabs').children;
      for (let i = 0; i < tabs.length; i++) tabs[i].classList.toggle('on', tabs[i].dataset.t === tab);
      if (tab === 'anc') renderAncestry($('trBody')); else renderSpecies($('trBody'));
    };
    $('trClose').onclick = function () { G.closeModal(); };
    const tabs = $('trTabs').children;
    for (let i = 0; i < tabs.length; i++) tabs[i].onclick = function () { tab = this.dataset.t; G.sfx('click'); draw(); };
    draw();
    G.sfx('click');
  };
})();
