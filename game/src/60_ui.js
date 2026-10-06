// ── The HUD: season bar (the algorithm), Evolution Panel, toolbar, popovers, banners ──
(function () {
  'use strict';
  const PAL = G.PAL, UI = G.ui;
  const SVG = function (p, extra) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"' + (extra || '') + '>' + p + '</svg>'; };
  const ICON = {
    petal: SVG('<path d="M12 21c-4-3-6-6-6-9a6 6 0 0 1 12 0c0 3-2 6-6 9z"/><path d="M12 21V11"/>'),
    sun: SVG('<circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>'),
    leaf: SVG('<path d="M5 19C5 10 10 5 20 4c0 10-5 15-14 15z"/><path d="M5 19c4-5 7-8 11-11"/>'),
    flake: SVG('<path d="M12 2v20M3.5 7l17 10M3.5 17l17-10"/><path d="M9 4l3 2 3-2M9 20l3-2 3 2"/>'),
    plus: SVG('<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>'),
    globe: SVG('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>'),
    play: SVG('<path d="M7 5l12 7-12 7z"/>'),
    pause: SVG('<path d="M8 5v14M16 5v14"/>'),
    book: SVG('<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 19V5M9 7h6"/>'),
    tree: SVG('<path d="M12 21v-8M12 13l-5-4M12 13l5-4M7 9V4M17 9V4"/><circle cx="7" cy="3.5" r="1.5"/><circle cx="17" cy="3.5" r="1.5"/>'),
    drop: SVG('<path d="M12 3c4 5 6 8 6 11a6 6 0 0 1-12 0c0-3 2-6 6-11z"/>'),
    speaker: SVG('<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/>'),
    chev: SVG('<path d="M6 15l6-6 6 6"/>'),
    close: SVG('<path d="M6 6l12 12M18 6L6 18"/>'),
    full: SVG('<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>'),
    meteor: SVG('<circle cx="16" cy="8" r="4"/><path d="M12 12L3 21M10 8L5 13M16 14l-5 5"/>'),
    wave: SVG('<path d="M3 9c3-3 6 3 9 0s6 3 9 0M3 15c3-3 6 3 9 0s6 3 9 0"/>'),
    bloom: SVG('<circle cx="12" cy="12" r="3"/><path d="M12 9V4M12 20v-5M9 12H4M20 12h-5M10 10L6.5 6.5M17.5 17.5L14 14M14 10l3.5-3.5M6.5 17.5L10 14"/>'),
    drought: SVG('<path d="M4 20h16M7 20v-5M12 20V9M17 20v-8M5 12c2-2 3-2 4 0"/>'),
    plague: SVG('<circle cx="12" cy="12" r="5"/><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l3 3M15 15l3 3M18 6l-3 3M9 15l-3 3"/>'),
  };
  G.ICON = ICON; G.SVG = SVG;

  function el(tag, cls, html, host) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    if (host) host.appendChild(e);
    return e;
  }
  G.el = el;
  const $ = function (id) { return document.getElementById(id); };
  G.$ = $;

  const SEASON_INFO = [
    { name: 'SPRING', step: 'Breed · Mutate', title: 'SPRING · BREED + MUTATE', text: 'The fittest parents have children, and mates choose the most charming. Genes are copied, mixed and sometimes changed.' },
    { name: 'SUMMER', step: 'Test', title: 'SUMMER · TEST', text: 'Life is the test: creatures hunt for food, flee and try to stay alive.' },
    { name: 'AUTUMN', step: 'Score', title: 'AUTUMN · SCORE', text: 'Fitness is how nice to the eye and how whole a creature is, once it has eaten well enough. The bars are the scores; the best creatures glow.' },
    { name: 'WINTER', step: 'Select', title: 'WINTER · SELECT', text: 'The lowest scores fade away. Only the fit stay to breed in spring.' },
  ];

  let lastSig = '';
  const refs = {};
  let log = [];

  function buildHud() {
    const ui = $('ui');
    // set CSS colours from PAL so the palette lives in one place
    const rs = document.documentElement.style;
    for (const k in PAL) rs.setProperty('--' + k, PAL[k]);

    // season bar
    const s = el('div', 'glass hide', '', ui); s.id = 'season';
    s.innerHTML = '<div class="gen"><b id="genLabel">GENERATION 1</b><span id="gaStep">random population</span></div>' +
      '<div class="segs">' + SEASON_INFO.map(function (si, i) { return '<div class="seg" data-s="' + i + '">' + ICON[['petal', 'sun', 'leaf', 'flake'][i]] + '<b>' + si.name + '</b><small>' + si.step + '</small></div>'; }).join('') + '</div>' +
      '<div class="cap"><b id="capTitle"></b><span id="capText"></span></div><div class="count" id="capCount"></div><div class="prog"><i id="prog"></i></div>';
    refs.season = s;
    const segs0 = s.querySelectorAll('.seg');
    for (let i = 0; i < segs0.length; i++) { segs0[i].style.cursor = 'pointer'; segs0[i].onclick = function () { G.sfx('click'); seasonHelp(+this.dataset.s); }; }

    // evolution panel
    const p = el('div', 'glass hide', '', ui); p.id = 'panel';
    p.innerHTML = '<button class="phead" id="panelToggle" aria-label="Evolution panel">EVOLUTION<span id="phSum"></span>' + ICON.chev + '</button>' +
      '<div class="pbody"><div id="era" style="margin-bottom:10px"></div><div class="stats"><div><b id="stGen">1</b><small>Gen</small></div><div><b id="stPop">0</b><small>Alive</small></div><div><b id="stSp">1</b><small>Species</small></div><div><b id="stFit">0.00</b><small>Fitness</small></div></div>' +
      '<div class="tabs" id="gtabs"><button data-m="look" class="on">BEAUTY</button><button data-m="whole">WHOLE</button><button data-m="fit">FITNESS</button><button data-m="skill">SKILL</button><button data-m="pop">POP</button><button data-m="genes">GENES</button></div>' +
      '<canvas id="graph" width="560" height="184"></canvas><div class="gnote" id="gnote"></div><button class="gnote" id="aiLine" style="min-height:0;color:var(--gold);background:none;border:0;padding:0;font:inherit;font-size:11px;line-height:1.3;text-align:left;cursor:pointer;text-decoration:underline dotted;display:block" title="See what each kind of AI use cost"></button><div class="ilabel">What changed</div><div class="log" id="mutLog"></div></div>';
    refs.panel = p;
    if (window.innerWidth < 720) p.classList.add('min');
    $('panelToggle').onclick = function () { p.classList.toggle('min'); G.sfx('click'); };
    const tabs = $('gtabs').children;
    for (let i = 0; i < tabs.length; i++) tabs[i].onclick = function () {
      for (let j = 0; j < tabs.length; j++) tabs[j].classList.remove('on');
      this.classList.add('on'); UI.metric = this.dataset.m; drawGraph(true); G.sfx('click');
    };
    UI.metric = 'look';

    // toolbar
    const tb = el('div', 'glass hide', '', ui); tb.id = 'toolbar';
    const btns = [
      ['add', 'plus', 'ADD', 'T'], ['world', 'globe', 'WORLD', ''], ['speed', 'play', '1×', 'Space'], ['guide', 'book', 'BOOK', 'F'],
      ['tree', 'tree', 'TREE', 'G'], ['new', 'drop', 'NEW', 'N'], ['sound', 'speaker', '', 'Esc'],
    ];
    btns.forEach(function (b) {
      const bt = el('button', 'btn' + (b[0] === 'sound' ? ' ic' : ''), ICON[b[1]] + (b[2] ? '<span class="lab">' + b[2] + '</span>' : ''), tb);
      bt.id = 'tb-' + b[0]; bt.setAttribute('aria-label', b[0]);
      bt.onclick = function () { G.sfx('click'); G.act(b[0]); };
    });
    refs.toolbar = tb;

    // banner + hint + placing bar
    refs.banner = el('div', 'glass', '', ui); refs.banner.id = 'banner';
    refs.banner.style.cursor = 'pointer'; refs.banner.title = 'Open the history';
    refs.banner.onclick = function () { if (G.mode === 'play') { UI.guideTab = 'hist'; G.openGuide(); } };
    refs.hint = el('div', 'glass', '', ui); refs.hint.id = 'hint';
    refs.placing = el('div', 'glass hide', '', ui); refs.placing.id = 'placing';
    refs.pop = null;
    // zoom: the pond is bigger than the screen
    const zm = el('div', 'glass hide', '', ui); zm.id = 'zoom';
    [['+', 'Zoom in', function () { G.zoomAt(1.35); }], ['−', 'Zoom out', function () { G.zoomAt(1 / 1.35); }], ['⤢', 'See the whole pond', function () { G.cam.z = 1; G.applyCam(); }]].forEach(function (b) {
      const bt = el('button', 'btn', b[0], zm); bt.setAttribute('aria-label', b[1]); bt.title = b[1]; bt.onclick = function () { G.sfx('click'); b[2](); };
    });
    refs.zoom = zm;
    buildInspector(ui);
  }

  const SEASON_HELP = [
    ['SPRING: breed and mutate', 'Steps 5 and 6 of the genetic algorithm.', 'Every creature that lived through winter may have children: more stored energy means more children (up to three). Mates are chosen for charm and health, and the plainest find none. A child copies its parents\' genes, sometimes mixed from two parents, and a few genes change by chance: that is mutation. Gold rings mark the parents; pink flashes mark a mutated child.'],
    ['SUMMER: the test', 'Step 2 of the genetic algorithm.', 'Nothing is decided by a formula here. Each creature simply lives: it looks for food it can digest, avoids what hurts it, and spends energy on everything it does and everything it carries. Whatever its genes built is put to the test.'],
    ['AUTUMN: the score', 'Step 3 of the genetic algorithm.', 'Each creature is scored by how full its energy tank is: that share, from 0 to 1, is its fitness. The bar above each creature is its score, and the best tenth glow gold. This is the number on the FITNESS graph.'],
    ['WINTER: selection', 'Step 4 of the genetic algorithm.', 'The lowest scores fade away, along with the old and a few unlucky ones, until the pond is back to what it can feed. The dashed ring marks who is about to go. Those left are the parents of the next generation, and the loop starts again.'],
  ];
  function seasonHelp(i) {
    closePop();
    const h = SEASON_HELP[i];
    const pop = el('div', 'glass pop', '<h3>' + h[0] + '</h3><div class="desc" style="color:var(--gold);margin:0 0 8px">' + h[1] + '</div><div style="font-size:13px;line-height:1.5">' + h[2] + '</div><div class="row" style="margin-top:10px"><button class="btn sm" id="shClose">GOT IT</button></div>', $('ui'));
    pop.style.cssText = 'top:' + (refs.season.getBoundingClientRect().bottom + 8) + 'px;bottom:auto;z-index:9';
    refs.pop = pop; UI.popName = 'season';
    $('shClose').onclick = function () { closePop(); };
  }

  // ── actions (keys and buttons call these) ──
  G.act = function (name) {
    if (G.mode !== 'play') return;
    if (name === 'add') togglePop('add');
    else if (name === 'world') togglePop('world');
    else if (name === 'speed') togglePop('speed');
    else if (name === 'sound') G.openMenu();
    else if (name === 'guide') G.openGuide();
    else if (name === 'tree') G.openTree();
    else if (name === 'new') G.confirmNew();
  };

  function closePop() {
    if (refs.pop) { refs.pop.remove(); refs.pop = null; }
    UI.popName = null;
    const bs = document.querySelectorAll('#toolbar .btn.on'); for (let i = 0; i < bs.length; i++) bs[i].classList.remove('on');
  }
  G.closePop = closePop;
  function togglePop(name) {
    if (UI.popName === name) { closePop(); return; }
    closePop();
    UI.popName = name;
    const b = $('tb-' + name); if (b) b.classList.add('on');
    const pop = el('div', 'glass pop', '', $('ui'));
    refs.pop = pop;
    if (name === 'speed') buildSpeed(pop);
    else if (name === 'world') buildWorld(pop);
    else if (name === 'add') buildAdd(pop);
  }

  function buildSpeed(pop) {
    pop.innerHTML = '<h3>TIME</h3><div class="speeds"></div><div class="desc" style="margin-top:8px">Real evolution takes thousands of generations. Fast-forward lets you watch it.</div>';
    const row = pop.querySelector('.speeds');
    const labs = [['pause', ICON.pause, 0], ['1×', '', 1], ['4×', '', 4], ['16×', '', 16], ['64×', '', 64]];
    labs.forEach(function (l) {
      const b = el('button', 'btn' + (G.speed === l[2] ? ' on' : ''), l[1] || l[0], row);
      b.onclick = function () { G.sfx('click'); G.setSpeed(l[2]); closePop(); };
      b.setAttribute('aria-label', l[0]);
    });
  }

  function buildWorld(pop) {
    const W = G.W;
    pop.innerHTML = '<h3>WORLD</h3>';
    const defs = [
      ['temp', 'Temperature', -1, 1, 0.05, 'Hot or cold water: creatures without resistance lose energy.', function (v) { return (v > 0 ? '+' : '') + v.toFixed(2); }],
      ['light', 'Light', 0.2, 2, 0.05, 'Sunlight decides where algae grow.', function (v) { return v.toFixed(2); }],
      ['bloom', 'Food', 0.2, 3, 0.05, 'How much algae the pond grows.', function (v) { return v.toFixed(2) + '×'; }],
      ['mut', 'Mutation', 0.25, 4, 0.05, 'How wild the changes in new children are.', function (v) { return v.toFixed(2) + '×'; }],
    ];
    defs.forEach(function (d) {
      const row = el('div', 'row', '', pop);
      el('label', '', d[1], row);
      const inp = el('input', '', '', row); inp.type = 'range'; inp.min = d[2]; inp.max = d[3]; inp.step = d[4]; inp.value = W.set[d[0]];
      inp.setAttribute('aria-label', d[1]);
      const val = el('span', 'val', d[6](+inp.value), row);
      inp.oninput = function () { W.set[d[0]] = +inp.value; val.textContent = d[6](+inp.value); G.markDirty(); };
      el('div', 'desc', d[5], pop);
    });
    el('h3', '', 'MAKE ANYTHING HAPPEN', pop).style.marginTop = '10px';
    const evIn = el('input', '', '', pop); evIn.type = 'text'; evIn.maxLength = 90; evIn.placeholder = 'an ice age, a jellyfish invasion, aliens…'; evIn.setAttribute('aria-label', 'Describe an event'); evIn.autocomplete = 'off';
    const evMsg = el('div', 'desc', 'Type any event. The pond works out what it means.', pop); evMsg.style.marginTop = '6px';
    const mine = (W.evShelf || []).slice().reverse();
    if (mine.length) {
      el('div', 'ilabel', 'Yours: make it happen again', pop);
      const row = el('div', 'chips evshelf', '', pop); row.style.marginTop = '4px';
      mine.forEach(function (ev) { const c = el('button', 'chip', escapeHtml(ev.name), row); c.title = ev.note || ''; c.onclick = function () { G.sfx('click'); G.runEvent(JSON.parse(JSON.stringify(ev))); closePop(); }; });
    }
    const evGo = function () {
      const t = evIn.value.trim(); if (!t) return;
      G.sfx('click'); evMsg.textContent = 'The pond trembles…';
      G.ai.ask('event', t).then(function (ev) {
        if (ev) {
          G.runEvent(ev);
          const W0 = G.W; W0.evShelf = (W0.evShelf || []).filter(function (e) { return e.name.toLowerCase() !== ev.name.toLowerCase(); }); W0.evShelf.push(JSON.parse(JSON.stringify(ev))); if (W0.evShelf.length > 10) W0.evShelf.shift(); G.markDirty();
        }
        closePop();
      }, function (err) { evMsg.textContent = err && err.refused ? 'The pond will not do that. Try another.' : 'Nothing happened. Try again.'; });
    };
    evIn.onkeydown = function (e) { if (e.key === 'Enter') { e.preventDefault(); evGo(); } else if (e.key === 'Escape') { evIn.blur(); closePop(); } e.stopPropagation(); };
    el('h3', '', 'DISASTERS', pop).style.marginTop = '10px';
    const dis = el('div', 'disasters', '', pop);
    [['meteor', 'meteor', 'Meteor'], ['flood', 'wave', 'Flood'], ['bloom', 'bloom', 'Bloom'], ['drought', 'drought', 'Drought'], ['plague', 'plague', 'Plague']].forEach(function (d) {
      const b = el('button', 'btn rose sm', ICON[d[1]] + d[2], dis);
      b.onclick = function () {
        G.sfx('click');
        if (d[0] === 'meteor') { closePop(); G.armMeteor(); }
        else { G.disaster(d[0]); G.log('sel', d[2] + '!', 'Something shook the pond.'); closePop(); }
      };
    });
  }

  const SUGGEST = ['honey', 'volcano', 'soap', 'ice', 'rose', 'glitter', 'slime', 'dragon', 'banana', 'storm', 'poison', 'moon', 'cheese', 'lightning', 'mud', 'rainbow', 'robot', 'lava', 'cake', 'ghost'];
  function buildAdd(pop) {
    pop.innerHTML = '<h3>ADD ANYTHING</h3><input type="text" id="wordIn" maxlength="80" placeholder="Type a word… volcano, honey, soap" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="go"><div class="chips" id="chips"></div><div id="thing"></div><div class="row" style="margin-top:10px"><button class="btn" id="wordGo">DROP IT IN</button></div>';
    const inp = $('wordIn');
    const chips = $('chips');
    const shelf = (G.W.shelf || []).slice().reverse();
    if (shelf.length) {
      const lab = el('div', 'ilabel', 'Yours: drop again', pop); lab.style.marginTop = '0'; pop.insertBefore(lab, $('wordIn'));
      const row = el('div', 'chips shelf', '', pop); row.style.cssText = 'margin:4px 0 12px'; pop.insertBefore(row, $('wordIn'));
      shelf.forEach(function (t) {
        const fp = G.figurePic ? G.figurePic(t.name) : '', pic = fp || t.svg;
        const c = el('button', 'chip', (pic ? '<img alt="" width="' + (fp ? 30 : 20) + '" height="' + (fp ? 36 : 20) + '" style="vertical-align:middle;margin:' + (fp ? '-6px 6px -6px -4px' : '0 5px 0 0') + '" src="data:image/svg+xml;charset=utf-8,' + encodeURIComponent(pic) + '">' : '') + escapeHtml(t.name), row);
        c.onclick = function () { G.sfx('click'); G.beginPlacing(JSON.parse(JSON.stringify(t))); closePop(); };
      });
    }
    const pool = SUGGEST.slice().sort(function () { return Math.random() - 0.5; }).slice(0, 7);
    pool.forEach(function (w) { const c = el('button', 'chip', w, chips); c.onclick = function () { inp.value = w; submit(); }; });
    const submit = function () {
      const w = inp.value.trim();
      if (!w) return;
      G.sfx('click');
      const open = function () { return UI.popName === 'add' && $('thing'); };
      const dots = '<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--gold);margin-right:8px;animation:wishp 1s ease-in-out infinite"></span>';
      const making = function (text) { let m = $('making'); if (!text) { if (m) m.classList.add('hide'); return; } if (!m) { m = el('div', 'glass', '', $('ui')); m.id = 'making'; m.style.cssText = 'position:fixed;left:50%;transform:translateX(-50%);bottom:124px;z-index:7;padding:8px 14px;border-radius:999px;font-size:12px;pointer-events:none;white-space:nowrap;max-width:calc(100vw - 28px);overflow:hidden;text-overflow:ellipsis'; } m.classList.remove('hide'); m.innerHTML = dots + text; };
      if (open()) $('thing').innerHTML = '<div class="thingcard">' + dots + 'Imagining <b>' + escapeHtml(w) + '</b>…</div>';
      making('Imagining <b>' + escapeHtml(w) + '</b>…');
      G.ai.ask('thing', w).then(function (info) {
        const by = info.source === 'ai' || info.source === 'cache' ? (G.ai.labelOf(info.model) || 'the server') : '';
        const card = function (state) { const pic = (G.figurePic && G.figurePic(info.name)) || info.svg; return '<div class="thingcard">' + (pic ? '<img alt="" width="64" height="72" style="float:right;margin-left:8px" src="data:image/svg+xml;charset=utf-8,' + encodeURIComponent(pic) + '">' : '') + '<b>' + escapeHtml(info.name) + '</b><br>' + escapeHtml(info.note) + (by ? '<br><small>imagined by ' + escapeHtml(by) + '</small>' : '') + (state ? '<br><small style="color:var(--gold)">' + dots + state + '</small>' : '') + '</div>'; };
        // its picture is drawn before it can be placed: what goes into the pond is the real thing, never a stand-in
        if (open()) $('thing').innerHTML = card('Drawing it… this takes up to a minute the first time.');
        making('Drawing <b>' + escapeHtml(info.name) + '</b>… you can close this window, it will be ready in a moment.');
        const fin = function () {
          making('');
          if (open()) { $('thing').innerHTML = card(''); G.beginPlacing(info); closePopSoon(); }
          else { G.beginPlacing(info); if (G.toast) G.toast('<b style="color:var(--gold)">' + escapeHtml(info.name) + ' is ready.</b><br>' + (G.touch ? 'Tap' : 'Click') + ' the pond to drop it.'); G.sfx('discovery'); }
        };
        const wall = info.props && info.props.vault > 0.2;
        (G.figureFor ? G.figureFor({ name: info.name, note: info.note, hue: info.hue, wall: wall }, w) : Promise.resolve(null)).then(fin, fin);
      }, function (err) {
        making('');
        const msg = err && err.refused ? 'The pond cannot take that word. Try another.' : 'The pond could not make sense of that. Try again.';
        if (open()) $('thing').innerHTML = '<div class="thingcard">' + msg + '</div>'; else if (G.toast) G.toast(msg);
      });
    };
    $('wordGo').onclick = submit;
    inp.onkeydown = function (e) {
      if (e.key === 'Enter') { e.preventDefault(); submit(); }
      else if (e.key === 'Escape') { e.preventDefault(); inp.blur(); G.closePop(); }
      e.stopPropagation();
    };
    setTimeout(function () { try { inp.focus(); } catch (e) { /* no focus on some phones */ } }, 60);
  }
  function closePopSoon() { setTimeout(function () { if (UI.popName === 'add') closePop(); }, 700); }
  function escapeHtml(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  G.escapeHtml = escapeHtml;

  // ── placing a thing, aiming a meteor ──
  G.beginPlacing = function (info) {
    UI.placing = info;
    G.R.ghost = info;
    document.getElementById('pond').classList.add('placing');
    const pl = refs.placing;
    pl.classList.remove('hide');
    pl.innerHTML = '<span>' + (G.touch ? 'Tap' : 'Click') + ' the pond to drop <b>' + escapeHtml(info.name) + '</b></span><button class="btn sm" id="plCancel">CANCEL</button>';
    $('plCancel').onclick = function () { G.cancelPlacing(); };
  };
  G.cancelPlacing = function () {
    UI.placing = null; UI.meteor = false; G.R.ghost = null;
    document.getElementById('pond').classList.remove('placing');
    refs.placing.classList.add('hide');
  };
  G.armMeteor = function () {
    G.cancelPlacing();
    UI.meteor = true;
    const pl = refs.placing;
    pl.classList.remove('hide');
    pl.innerHTML = '<span>' + (G.touch ? 'Tap' : 'Click') + ' the pond to aim the meteor</span><button class="btn sm" id="plCancel">CANCEL</button>';
    $('plCancel').onclick = function () { G.cancelPlacing(); };
    document.getElementById('pond').classList.add('placing');
  };

  G.on('pond-click', function (c) {
    if (G.mode !== 'play' || !G.W || G.isBlocked()) return;
    closePop();
    if (UI.placing) {
      const info = UI.placing;
      G.addZone(c.x, c.y, info);
      G.log('sel', info.name + ' added', info.note + (G.ai.labelOf(info.model) ? ' (' + G.ai.labelOf(info.model) + ')' : ''));
      G.emit('placed', info);
      // everything you make goes on a shelf, so it can be dropped again without asking
      const W0 = G.W; W0.shelf = (W0.shelf || []).filter(function (t) { return t.name.toLowerCase() !== info.name.toLowerCase(); }); W0.shelf.push(info); if (W0.shelf.length > 12) W0.shelf.shift(); G.markDirty();
      G.cancelPlacing();
      return;
    }
    if (UI.meteor) {
      G.disaster('meteor', c.x, c.y);
      G.log('sel', 'Meteor!', 'It struck the pond.');
      G.cancelPlacing();
      return;
    }
    // inspect the nearest creature
    let best = null, bd = 1e9;
    const cre = G.W.cre;
    for (let i = 0; i < cre.length; i++) {
      const o = cre[i], x = o.rx === undefined ? o.x : o.rx, y = o.ry === undefined ? o.y : o.ry;
      const dx = x - c.x, dy = y - c.y, d = Math.sqrt(dx * dx + dy * dy) - o.ph.r;
      if (d < bd) { bd = d; best = o; }
    }
    if (best && bd < (c.touch ? 55 : 42)) { G.selectZone(null); G.select(best); }
    else { G.select(null); G.selectZone(G.zoneAt(c.x, c.y)); }
  });

  G.select = function (c) {
    G.R.sel = c;
    UI.selId = c ? c.id : 0;
    G.emit('select', c);
  };

  // ── log ──
  G.log = function (kind, title, text) {
    const W = G.W; if (!W || G.mode !== 'play') return;
    log.unshift({ k: kind, t: title, x: text || '', g: W.gen });
    if (kind !== 'mut' && title !== 'Winter' && title !== 'Spring') {
      W.history = W.history || [];
      const h = W.history, last = h[h.length - 1];
      if (!last || last.x !== (text || '') || last.t !== title) { h.push({ k: kind, t: String(title).slice(0, 60), x: String(text || '').slice(0, 320), g: W.gen }); if (h.length > 240) h.shift(); }
    }
    if (log.length > 60) log.pop();
    UI.logDirty = true;
  };
  G.on('mutation', function (c) {
    if (G.mode !== 'play') return;
    const now = performance.now();
    if (now - (UI.lastMutLog || 0) < 700) return;
    const big = c.muts.filter(function (m) { return m.big; });
    if (!big.length) return;
    UI.lastMutLog = now;
    G.log('mut', '#' + c.id, big[0].text);
  });
  G.on('discovery', function (key, text) {
    if (G.mode !== 'play') return;
    G.log('disc', 'Discovery', text);
    G.banner('Evolution invented something', text);
  });
  G.on('winter', function (n) { if (G.mode === 'play') G.log('sel', 'Winter', n + ' creatures fade: the lowest scores.'); });
  G.on('spring', function (n) { if (G.mode === 'play') G.log('sel', 'Spring', n + ' parents breed.'); });
  G.on('species-new', function (s) { if (G.mode === 'play') G.log('sp', 'New species', s.name); });
  G.on('extinction-species', function (s) { if (G.mode === 'play') G.log('sp', 'Extinct', s.name + ' is gone.'); });
  G.on('new-pond', function () { log = []; UI.logDirty = true; UI.eraSig = ''; });
  G.on('era', function (age, was) {
    if (G.mode !== 'play') return;
    const t = 'The commonest body in the pond is now the ' + age.kind.toLowerCase() + ' (' + Math.round(age.share * 100) + '% of all life). The ' + was.kind.toLowerCase() + 's had led since generation ' + was.gen + '.';
    G.log('disc', age.name.toUpperCase(), t + (age.why ? ' ' + age.why : ''));
    G.banner('A NEW AGE BEGINS', age.name + '. ' + t + (age.why ? ' ' + age.why : ''), 11000);
    G.R.flash = 1; G.R.flashCol = G.PAL.gold; G.R.shake = 0.4;
    G.sfx('discovery');
  });
  G.on('plan-new', function (p) { if (G.mode !== 'play') return; const t = 'A new shape of body was imagined for this pond: the ' + p.name + '. ' + p.note + (p.because ? ' Why: ' + p.because + '.' : '') + (p.seen ? ' Drawn and looked at first: ' + Math.round(p.seen.score * 10) + '/10.' : ''); G.log('disc', 'A new shape of body', t); if (G.speed <= 16) G.banner('A body nobody has seen', t, 7500); });
  G.on('idea-dropped', function (name, v) { if (G.mode !== 'play') return; G.log('disc', 'An idea was turned away', 'The "' + name + '" was imagined for this pond, drawn, and looked at. The eye for beauty gave it ' + Math.round(v.score * 10) + '/10 (' + v.why + '), so it was not let in.'); });
  G.on('design-new', function (d) { if (G.mode !== 'play') return; const t = 'A new kind of body part is now possible in this pond: the ' + d.name + '. ' + d.note + (d.because ? ' Why: ' + d.because + '.' : ''); G.log('disc', 'A new kind of part', t); if (G.speed <= 16) G.banner('Something never seen before', t, 7000); });
  G.on('new-pond', function () { if (G.form.clearCache) G.form.clearCache(); });
  G.on('bred', function (it, c) { if (G.mode !== 'play') return; G.log('disc', 'Bred', it.name + ' and #' + c.id + ' had six children.'); G.banner('A new family', 'Six children of ' + it.name + ' and a creature of this pond were born. Watch what they become.', 5200); G.focusOn(c.x, c.y, 1.8); });
  G.on('released', function (it, x, y) { if (G.mode !== 'play') return; G.log('disc', 'Released', it.name + ' (' + it.kind + ') now lives in this pond.'); G.focusOn(x, y, 1.8); });
  G.on('sickness', function (kind, n, crowd) { if (G.mode !== 'play') return; const t = 'There are so many ' + kind.toLowerCase() + 's (' + Math.round(crowd * 100) + '% of the pond) that a sickness spreads among them. ' + n + ' will not see spring; the rarer kinds are hardly touched.'; G.log('sel', 'A sickness of the many', t); if (G.speed <= 16) G.banner('Too many of one kind', t, 6500); });
  G.on('painted', function (sig, info, source) { if (G.mode !== 'play') return; G.log('sp', 'Painted', (info.name || 'A kind') + ', a ' + String(info.kind || '').toLowerCase() + ', has been painted' + (source === 'library' ? ' (from the library, free).' : '.')); });
  G.on('fashion', function (t) { if (G.mode !== 'play') return; G.log('sp', 'Taste has shifted', t + '. Those who have it will find mates more easily.'); UI.eraSig = ''; });
  G.on('judged', function (s) { if (G.mode !== 'play') return; G.log('sp', 'Beauty ' + Math.round(s.judge.score * 10) + '/10: the ' + s.name, (s.judge.why || 'no comment') + (s.judge.fix ? ' What would make it nicer: ' + s.judge.fix.replace(/_/g, ' ') + ' (its children are now likelier to be born that way).' : '')); });
  G.on('zone-killed', function (z) { if (G.mode !== 'play') return; const t = 'The pond killed ' + z.word + '! Creatures with ' + G.WEAK[z.weak].text + ' wore it down.'; G.log('disc', 'Victory', t); G.banner('Life fought back', t, 6000); });
  G.on('event', function (ev) { if (G.mode !== 'play') return; if (ev.got) ev.note = (ev.note ? ev.note + ' ' : '') + ev.got + ' creatures grew ' + ev.gift.trait + '.'; G.log('sel', (ev.nature ? 'Nature: ' : '') + ev.name, ev.note); G.banner('It happened', ev.name + (ev.note ? ': ' + ev.note : ''), 5200); });
  G.on('story', function (s) { if (G.mode !== 'play') return; G.log('disc', s.title, s.text); if (G.speed <= 16) G.banner('The story so far · ' + s.title, s.text, 9000); });
  G.on('organ-new', function (o) { if (G.mode === 'play') G.log('disc', 'New organ', o.name + (G.ai.labelOf(o.by) ? ' (imagined by ' + G.ai.labelOf(o.by) + ')' : '') + ': ' + o.note); });
  G.on('zone-bud', function (child, z) { if (G.mode === 'play') G.log('sp', z.word + ' spread', 'A new patch grew nearby, a little different.'); });

  let bannerTimer = 0, bannerQ = [];
  G.banner = function (kicker, text, ms) {
    if (bannerQ.length > 4) bannerQ.shift();
    bannerQ.push([kicker, text, ms]);
    if (!bannerTimer) nextBanner();
  };
  function nextBanner() {
    const b = bannerQ.shift();
    if (!b) { bannerTimer = 0; return; }
    refs.banner.innerHTML = '<small>' + escapeHtml(b[0]) + '</small>' + escapeHtml(b[1]);
    refs.banner.classList.add('show');
    G.sfx('discovery');
    bannerTimer = setTimeout(function () {
      refs.banner.classList.remove('show');
      bannerTimer = setTimeout(nextBanner, 700);
    }, b[2] || 3800);
  }
  let hintTimer = 0;
  G.on('hint', function (text, ms) {
    if (G.mode !== 'play') return;
    refs.hint.textContent = text; refs.hint.classList.add('show');
    clearTimeout(hintTimer);
    hintTimer = setTimeout(function () { refs.hint.classList.remove('show'); }, ms);
  });

  // ── graph ──
  const METRICS = {
    whole: { label: 'Whole: how much of a whole, full creature they are, out of 10: from a cell (1), through a ball with a face (3) and a simple critter (5), to a full character with head, body, legs and arms (9). The average; the dashed line is the most whole one alive.', get: function (h) { return (h.whole || 0) * 10; }, fmt: function (v) { return v.toFixed(1); }, min: 0, max: 10 },
    look: { label: 'Beauty: how nice to the eye the creatures of this pond are, out of 10 (the average; the dashed line is the nicest one alive). This is what the pond evolves towards.', get: function (h) { return (h.look || 0) * 10; }, fmt: function (v) { return v.toFixed(1); }, min: 0, max: 10 },
    fit: { label: 'Fitness = how nice to the eye and how whole a creature is, for those that have eaten well enough (half a tank). Higher scores survive winter and have more children.', get: function (h) { return h.avg; }, fmt: function (v) { return v.toFixed(2); }, min: 0, max: 1 },
    skill: { label: 'Skill: food eaten per creature each generation', get: function (h) { return h.intake; }, fmt: function (v) { return v.toFixed(0); }, min: 0 },
    pop: { label: 'How many creatures were alive at autumn', get: function (h) { return h.pop; }, fmt: function (v) { return v.toFixed(0); }, min: 0 },
    genes: { label: 'Genome size: parts, wires and brain cells per creature', get: function (h) { return h.genes; }, fmt: function (v) { return v.toFixed(1); }, min: 0 },
  };
  function drawGraph(force) {
    const W = G.W, cv = $('graph'); if (!cv || !W) return;
    const m = METRICS[UI.metric || 'look'];
    const ctx = cv.getContext('2d');
    const w = cv.width, h = cv.height, hist = W.hist;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, w, h);
    $('gnote').textContent = m.label;
    if (hist.length < 2) {
      ctx.fillStyle = G.rgba(PAL.frost, 0.55); ctx.font = '22px system-ui, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('The first scores arrive in autumn.', w / 2, h / 2 + 6);
      return;
    }
    const vals = hist.map(m.get);
    let lo = m.min === undefined ? Math.min.apply(null, vals) : m.min, hi = m.max === undefined ? Math.max.apply(null, vals) * 1.1 + 0.001 : m.max;
    if (hi - lo < 1e-6) hi = lo + 1;
    const pad = 14, n = hist.length;
    const X = function (i) { return pad + (w - pad * 2) * (n === 1 ? 0 : i / (n - 1)); };
    const Y = function (v) { return h - pad - (h - pad * 2) * ((v - lo) / (hi - lo)); };
    ctx.strokeStyle = G.rgba(PAL.frost, 0.1); ctx.lineWidth = 1;
    for (let i = 0; i < 4; i++) { const y = pad + (h - pad * 2) * i / 3; ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(w - pad, y); ctx.stroke(); }
    if (UI.metric === 'fit' || UI.metric === 'look' || UI.metric === 'whole') {
      ctx.strokeStyle = G.rgba(PAL.gold, 0.45); ctx.lineWidth = 2; ctx.setLineDash([5, 5]);
      ctx.beginPath(); hist.forEach(function (q, i) { const x = X(i), y = Y(UI.metric === 'look' ? (q.lookTop || 0) * 10 : UI.metric === 'whole' ? (q.wholeTop || 0) * 10 : q.best); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }); ctx.stroke(); ctx.setLineDash([]);
    }
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, G.rgba(PAL.algae, 0.38)); g.addColorStop(1, G.rgba(PAL.algae, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(X(0), h - pad);
    vals.forEach(function (v, i) { ctx.lineTo(X(i), Y(v)); });
    ctx.lineTo(X(n - 1), h - pad); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = PAL.algae; ctx.lineWidth = 3; ctx.lineJoin = 'round';
    ctx.beginPath(); vals.forEach(function (v, i) { const x = X(i), y = Y(v); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }); ctx.stroke();
    ctx.fillStyle = PAL.frost; ctx.beginPath(); ctx.arc(X(n - 1), Y(vals[n - 1]), 5, 0, 6.2832); ctx.fill();
    ctx.fillStyle = G.rgba(PAL.frost, 0.7); ctx.font = '19px system-ui, sans-serif'; ctx.textAlign = 'right';
    ctx.fillText(m.fmt(vals[n - 1]), w - pad, Y(vals[n - 1]) - 9 < 20 ? 24 : Y(vals[n - 1]) - 9);
    ctx.textAlign = 'left'; ctx.fillStyle = G.rgba(PAL.frost, 0.45); ctx.font = '16px system-ui, sans-serif';
    ctx.fillText('gen ' + hist[0].gen, pad, h - 2);
    ctx.textAlign = 'right'; ctx.fillText('gen ' + hist[n - 1].gen, w - pad, h - 2);
  }

  // ── per-frame refresh ──
  function refresh(dt) {
    const W = G.W;
    if (!W || G.mode !== 'play') return;
    const s = W.season;
    const info = SEASON_INFO[s];
    const segs = refs.season.querySelectorAll('.seg');
    const sig = W.gen + '|' + s;
    if (sig !== lastSig) {
      lastSig = sig;
      for (let i = 0; i < segs.length; i++) { segs[i].classList.toggle('on', i === s); segs[i].classList.toggle('done', i < s); }
      const first = W.gen === 1 && s === 0;
      $('genLabel').textContent = 'GENERATION ' + W.gen;
      $('gaStep').textContent = first ? 'step 1 · random population' : 'step ' + (s === 0 ? '5 · breed + 6 · mutate' : s === 1 ? '2 · test' : s === 2 ? '3 · score' : '4 · select');
      $('capTitle').textContent = first ? 'GENERATION 1 · RANDOM POPULATION' : info.title;
      $('capText').textContent = first ? 'A pond of blobs, each with different random genes. Nobody designed them; let us see who survives.' : info.text;
    }
    $('prog').style.width = (100 * (W.st / G.PH[s])).toFixed(1) + '%';
    const st = W.stats;
    let count = '';
    if (s === 0) count = (W.gen === 1 ? (W.stats.founders || 0) + ' blobs appearing' : st.born + ' born · ' + st.mutated + ' mutated · ' + st.crossed + ' mixed from two parents' + (st.snubbed ? ' · ' + st.snubbed + ' too plain to find a mate' : ''));
    else if (s === 1) count = W.cre.length + ' alive · ' + st.eaten + ' meals eaten';
    else if (s === 2) { let sum = 0; for (let i = 0; i < W.cre.length; i++) sum += W.cre[i].E / W.cre[i].ph.Emax; count = W.cre.length ? 'average score ' + (sum / W.cre.length).toFixed(2) : ''; }
    else count = (W.frost ? W.frost.n + ' below the line · ' : '') + st.selected + ' faded · ' + st.starved + ' starved';
    if (count !== UI.lastCount) { $('capCount').textContent = count; UI.lastCount = count; }
    // panel numbers
    const last = W.hist[W.hist.length - 1];
    const stats = [W.gen, W.cre.length, G.liveSpeciesCount() || 1, last ? last.avg.toFixed(2) : '–'];
    const ids = ['stGen', 'stPop', 'stSp', 'stFit'];
    for (let i = 0; i < 4; i++) { const e = $(ids[i]); const v = String(stats[i]); if (e.textContent !== v) e.textContent = v; }
    $('phSum').textContent = ' Gen ' + W.gen + ' · ' + W.cre.length + ' alive' + (G.ai.provider === 'server' ? ' · ' + G.ai.money(G.ai.usd) : '');
    if (G.ai.provider === 'server') {
      const t = G.ai.totals();
      const snd = (G.ai.count.sound || {}).fresh || 0;
      const line = 'AI this session: ' + G.ai.money(t.usd) + ' · ' + t.fresh + ' new answer' + (t.fresh === 1 ? '' : 's') + (snd ? ' (' + snd + ' sound' + (snd === 1 ? '' : 's') + ')' : '') + (t.asked > t.fresh ? ' · ' + (t.asked - t.fresh) + ' reused free' : '') + (t.unpriced ? ' · ' + t.unpriced + ' not priced' : '') + (G.ai.fuel !== null ? ' · fuel left: ' + G.ai.fuel + (G.ai.fuel === 0 ? ' (the pond now imagines by itself)' : '') : '') + ' · see the breakdown';
      if (!UI.aiLineBound && $('aiLine')) { UI.aiLineBound = true; $('aiLine').onclick = function () { G.showCosts(); }; }
      if (UI.aiLine !== line) { UI.aiLine = line; $('aiLine').textContent = line; }
    }
    // the age the pond is in, who is out there now, and what is admired here: all measured, none of it scripted
    const ages = W.ages || [], kinds = W.kinds || [], ageNow = G.ageNow(W);
    const esig = ages.length + '|' + kinds.map(function (k) { return k[0] + Math.round(k[1] * 20); }).join(',') + '|' + (W.fashionGen | 0);
    if (esig !== UI.eraSig) {
      UI.eraSig = esig;
      const COL = ['var(--gold)', 'var(--algae)', 'var(--rose)', 'var(--violet)', 'var(--frost)', '#8aa'];
      const past = ages.slice(0, -1).slice(-3).map(function (a) { return a.name.replace(/^The /, '') + ' (gen ' + a.gen + ')'; }).join(' → ');
      $('era').innerHTML = '<div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px"><b style="font-size:12px;letter-spacing:.12em;color:var(--gold)">' + ageNow.name.toUpperCase() + '</b><span style="font-size:10px;color:rgba(207,232,255,.6);white-space:nowrap">since gen ' + ageNow.gen + '</span></div>' +
        '<div style="display:flex;height:12px;border-radius:6px;overflow:hidden;margin:6px 0 4px;background:rgba(7,18,31,.5)">' + kinds.map(function (k, i) { return '<i title="' + k[0] + ': ' + Math.round(k[1] * 100) + '%" style="width:' + (k[1] * 100).toFixed(1) + '%;background:' + COL[i] + ';opacity:.85"></i>'; }).join('') + '</div>' +
        '<div style="font-size:10.5px;line-height:1.35;color:rgba(207,232,255,.85)">' + kinds.slice(0, 4).map(function (k, i) { return '<span style="white-space:nowrap"><i style="display:inline-block;width:7px;height:7px;border-radius:50%;background:' + COL[i] + ';margin-right:3px"></i>' + k[0] + ' ' + Math.round(k[1] * 100) + '%</span>'; }).join(' &nbsp;') + '</div>' +
        '<div style="font-size:10.5px;color:rgba(207,232,255,.7);line-height:1.3;margin-top:4px">This water: <b style="color:#fff">' + G.envText(W) + '</b>.</div>' +
        '<div style="font-size:10.5px;color:rgba(207,232,255,.7);line-height:1.3;margin-top:4px">Admired in this pond: <b style="color:#fff">' + G.form.fashionText(W.fashion) + '</b>.</div>' +
        (past ? '<div style="font-size:10px;color:rgba(207,232,255,.5);line-height:1.3;margin-top:3px">Before: ' + past + '</div>' : '');
    }
    if (W.hist.length !== UI.histLen || UI.gDirty) { UI.histLen = W.hist.length; UI.gDirty = false; drawGraph(); }
    if (UI.logDirty) { UI.logDirty = false; renderLog(); }
    // speed button label
    const sb = $('tb-speed');
    if (sb) {
      const lab = sb.querySelector('.lab');
      const txt = G.speed === 0 ? 'PAUSED' : G.speed + '×';
      if (lab && lab.textContent !== txt) lab.textContent = txt;
      const ic = G.speed === 0 ? ICON.pause : ICON.play;
      if (sb.dataset.ic !== String(G.speed === 0)) { sb.dataset.ic = String(G.speed === 0); sb.querySelector('svg').outerHTML = ic; }
    }
    // teaching hints
    if (W.gen === 1 && s === 1 && W.st > 3) G.hint('inspect', G.touch ? 'Tap a creature to read its genes.' : 'Click a creature to read its genes.');
    if (W.gen === 1 && s === 2) G.hint('score', 'Autumn: the bars are the scores. Fitness is stored energy.', 8000);
    if (W.gen === 1 && s === 3 && W.st > 1) G.hint('winter', 'Winter: the lowest scores fade. That is selection.', 8000);
    if (W.gen === 2 && s === 0 && W.st > 2) G.hint('spring', 'Spring: survivors have children. Their genes are copied, mixed and sometimes mutated.', 9000);
    if (W.gen === 3 && s === 1) G.hint('add', 'Try ADD: type any word and drop it into the pond.', 8000);
    if (W.gen === 2 && s === 1) G.hint('zoom', G.touch ? 'Pinch to zoom, drag to move: the pond is bigger than the screen.' : 'Scroll to zoom, drag to move: the pond is bigger than the screen.', 8000);
    if (W.gen === 5 && s === 1) G.hint('speed', 'Use SPEED to fast-forward: evolution is slow.', 8000);
    if (W.gen === 7 && s === 1) G.hint('world', 'WORLD changes the weather. Stress the pond and see what answers.', 8000);
    if (W.gen === 9 && s === 1) G.hint('guide', 'BOOK is the Book of Life: the history of this pond, every kind that evolved, and what was invented.', 8000);
  }
  function renderLog() {
    const L = $('mutLog'); if (!L) return;
    L.innerHTML = log.slice(0, 40).map(function (e) { return '<div class="' + e.k + '"><small>g' + e.g + '</small><b>' + escapeHtml(e.t) + '</b> ' + escapeHtml(e.x) + '</div>'; }).join('') || '<div><small>Mutations and discoveries will appear here.</small></div>';
  }
  G.on('scored', function () { UI.gDirty = true; });
  G.on('speed', function () { UI.gDirty = false; });
  G.markDirty = function () { G.emit('dirty'); };

  G.showHud = function (on) {
    ['season', 'panel', 'toolbar', 'zoom'].forEach(function (k) { refs[k].classList.toggle('hide', !on); });
    if (!on) $('inspector').classList.add('hide');
  };
  G.on('new-pond', function () { lastSig = ''; UI.histLen = -1; UI.logDirty = true; UI.gDirty = true; renderLog(); closePop(); G.cancelPlacing(); });

  // ── the inspector ──
  function buildInspector(ui) {
    const i = el('div', 'glass hide', '', ui); i.id = 'inspector';
    i.innerHTML = '<div class="ihead"><canvas id="iprev" width="208" height="208"></canvas><div><b id="iname"></b><small id="isub"></small></div><button class="x" id="iclose" aria-label="Close">' + ICON.close + '</button></div>' +
      '<div id="ifit" style="font-size:11.5px;line-height:1.4"></div>' +
      '<div class="irows"><div id="iE"></div><div id="iAge"></div><div id="iPar" style="grid-column:span 2"></div><div class="meter"><i id="iEb"></i></div></div>' +
      '<div class="imut" id="imut"></div>' +
      '<details><summary>Genes and brain</summary><canvas id="istrip" width="560" height="80"></canvas><canvas id="ibrain" width="560" height="184" style="margin-top:6px"></canvas></details>' +
      '<style>#iacts{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px;margin-top:10px}#iacts .btn{display:flex;align-items:center;justify-content:center;gap:5px;min-height:38px;padding:0 4px;font-size:10px;letter-spacing:.06em;white-space:nowrap}#iacts .btn svg{width:14px;height:14px;flex:none;margin:0}#iacts .btn i{font-style:normal;font-size:14px;line-height:1}#iacts #ikeep i{color:var(--gold)}#iacts #ibreed i{color:var(--rose)}</style>' +
      '<div id="iacts"><button class="btn sm" id="ikeep" title="Keep this creature in your collection. It outlives the pond."><i>★</i>KEEP</button><button class="btn sm" id="ibreed" title="Breed this creature with one from your collection."><i>♥</i>BREED</button><button class="btn sm" id="itree" title="Its family tree">' + ICON.tree + 'TREE</button><button class="btn sm" id="iguide" title="Its kind, in the Book of Life">' + ICON.book + 'KIND</button></div>';
    $('iclose').onclick = function () { G.select(null); };
    $('isub').onclick = function () { this.classList.toggle('open'); };
    $('itree').onclick = function () { G.sfx('click'); G.openTree(); };
    $('ibreed').onclick = function () { const c = G.R.sel; if (!c) return; G.sfx('click'); if (!G.collection.length) { G.banner('Nothing to breed it with yet', 'First ★ KEEP a creature you like (from this pond or another). Then choose it here to breed the two.', 5200); return; } UI.breedWith = c.id; UI.guideTab = 'coll'; G.openGuide(); };
    // a short word right where the hand is: it shows at once and fades by itself
    G.toast = function (html) { let t = $('toast'); if (!t) { t = el('div', 'glass', '', ui); t.id = 'toast'; t.style.cssText = 'position:fixed;right:14px;bottom:14px;z-index:7;max-width:min(300px,calc(100vw - 28px));padding:10px 14px;border-radius:14px;font-size:12.5px;line-height:1.35;border:1px solid rgba(246,211,101,.6);pointer-events:none;transition:opacity .4s,transform .4s;opacity:0;transform:translateY(8px)'; } t.innerHTML = html; const i = $('inspector'); t.style.bottom = (i && !i.classList.contains('hide') ? Math.round(i.getBoundingClientRect().height) + 22 : 14) + 'px'; t.style.opacity = '1'; t.style.transform = 'none'; clearTimeout(G.toast._t); G.toast._t = setTimeout(function () { t.style.opacity = '0'; t.style.transform = 'translateY(8px)'; }, 3200); };
    const keptOf = function (c) { const tag = ' #' + c.id; for (let i = 0; i < G.collection.length; i++) { const n = G.collection[i].name; if (n.slice(-tag.length) === tag) return G.collection[i]; } return null; };
    const keepLabel = function () { const c = G.R.sel, b = $('ikeep'); if (!b) return; const k = c && keptOf(c); b.innerHTML = k ? '<i>★</i>KEPT' : '<i>★</i>KEEP'; b.style.borderColor = k ? 'var(--gold)' : ''; b.style.color = k ? 'var(--gold)' : ''; b.title = k ? 'It is in your collection (BOOK, under COLLECTION).' : 'Keep this creature in your collection. It outlives the pond.'; };
    G.on('select', keepLabel); G.on('kept', keepLabel);
    $('ikeep').onclick = function () {
      const c = G.R.sel; if (!c) return;
      if (keptOf(c)) { G.sfx('click'); G.toast('<b style="color:var(--gold)">★ Already in your collection.</b><br>Open BOOK, then COLLECTION, to release or breed it.'); return; }
      const it = G.keep(c);
      if (it) { G.sfx('discovery'); keepLabel(); G.toast('<b style="color:var(--gold)">★ Kept: ' + escapeHtml(it.name) + '</b><br>It is in your collection now (BOOK, then COLLECTION). It outlives this pond.'); G.markDirty(); }
    };
    $('iguide').onclick = function () { G.sfx('click'); UI.guideTab = 'live'; G.openGuide(); };
    G.on('select', function (c) {
      i.classList.toggle('hide', !c || G.mode !== 'play');
      UI.inspDirty = true;
    });
  }

  const BEADCOL = [PAL.gold, '#c9ee7a', PAL.algae, '#8fc7ff', PAL.violet, PAL.rose];
  const PARTCOL = [PAL.rose, PAL.algae, PAL.frost, PAL.gold, '#ffffff', PAL.gold, PAL.algae, PAL.violet, PAL.frost];
  const PARTLET = ['M', 'F', 'S', 'A', 'E', 'L', 'G', 'T', 'C'];
  function drawStrip(c) {
    const cv = $('istrip'), ctx = cv.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height);
    const g = c.g, mutSet = {};
    c.muts.forEach(function (m) { mutSet[m.kind + m.i] = 1; });
    let x = 8; const y = 40, t = G.rt;
    const mark = function (key, cx, rad) {
      if (!mutSet[key]) return;
      ctx.strokeStyle = G.rgba(PAL.rose, 0.7 + 0.3 * Math.sin(t * 6)); ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(cx, y, rad + 5, 0, 6.2832); ctx.stroke();
    };
    // traits: size, speed, colour
    ctx.fillStyle = G.hsl(g.t[2], 80, 62, 1); ctx.beginPath(); ctx.arc(x + 14, y, 13, 0, 6.2832); ctx.fill(); mark('t2', x + 14, 13); x += 36;
    const sz = 5 + (g.t[0] - 5) * 0.55;
    ctx.strokeStyle = PAL.frost; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x + 12, y, sz, 0, 6.2832); ctx.stroke(); mark('t0', x + 12, sz); x += 32;
    ctx.fillStyle = PAL.frost; ctx.fillRect(x, y - 3, 10 + g.t[1] * 22, 6); mark('t1', x + 14, 10); x += 38;
    ctx.fillStyle = G.rgba(PAL.frost, 0.25); ctx.fillRect(x, y - 16, 2, 32); x += 10;
    // diet beads: the opacity is how well it digests that colour of food
    for (let i = 0; i < 6; i++) { ctx.fillStyle = BEADCOL[i]; ctx.globalAlpha = 0.2 + 0.8 * g.c[i]; ctx.beginPath(); ctx.arc(x + 8, y, 7.5, 0, 6.2832); ctx.fill(); ctx.globalAlpha = 1; mark('c' + i, x + 8, 7.5); x += 19; }
    x += 4;
    for (let i = 6; i < 9; i++) { ctx.strokeStyle = [PAL.rose, PAL.frost, PAL.violet][i - 6]; ctx.globalAlpha = 0.25 + 0.75 * g.c[i]; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x + 8, y, 6, 0, 6.2832); ctx.stroke(); ctx.globalAlpha = 1; mark('c' + i, x + 8, 6); x += 19; }
    ctx.fillStyle = G.rgba(PAL.frost, 0.25); ctx.fillRect(x, y - 16, 2, 32); x += 10;
    // the body's rules: segments, then one bead for each thing that grows from it
    ctx.font = '700 13px ui-monospace, Consolas, monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const f = g.f;
    ctx.fillStyle = G.hsl(f.hue, f.sat, f.lit, 1); G.roundRect(ctx, x, y - 11, 30, 22, 7); ctx.fill();
    ctx.fillStyle = PAL.deep; ctx.fillText((f.sym ? '✶' + f.sym : '') + (f.sym ? '' : f.n + 's'), x + 15, y + 1); mark('f0', x + 15, 14); x += 35;
    for (let i = 0; i < f.rules.length && x < 500; i++) {
      ctx.fillStyle = G.hsl(f.hue + f.hue2, f.sat, f.lit, 1); G.roundRect(ctx, x, y - 11, 22, 22, 7); ctx.fill();
      ctx.fillStyle = PAL.deep; ctx.fillText('LFSTAPRH'.charAt(f.rules[i].k), x + 11, y + 1); x += 26;
    }
    for (let i = 0; i < g.p.length && x < 520; i++) {
      const org = G.organOf(g.p[i].k);
      ctx.fillStyle = G.hsl(org ? org.hue : 270, 80, 66, 1); ctx.beginPath(); ctx.arc(x + 11, y, 11, 0, 6.2832); ctx.fill();
      ctx.strokeStyle = PAL.gold; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = PAL.deep; ctx.fillText(org ? org.name.charAt(0) : '?', x + 11, y + 1); mark('p' + i, x + 11, 11); x += 26;
    }
    // brain: one tick per wire
    if (x < 520) {
      ctx.fillStyle = G.rgba(PAL.frost, 0.25); ctx.fillRect(x, y - 16, 2, 32); x += 10;
      for (let i = 0; i < g.w.length && x < 552; i++) {
        const w = g.w[i], hgt = 6 + Math.min(1, Math.abs(w.v)) * 20;
        ctx.fillStyle = w.v >= 0 ? PAL.algae : PAL.rose; ctx.globalAlpha = 0.85;
        ctx.fillRect(x, y - hgt / 2, 4, hgt); ctx.globalAlpha = 1;
        if (mutSet['w' + i]) { ctx.strokeStyle = PAL.rose; ctx.lineWidth = 2; ctx.strokeRect(x - 2, y - 17, 8, 34); }
        x += 7;
      }
    }
  }

  function drawBrain(c) {
    const cv = $('ibrain'), ctx = cv.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height);
    const g = c.g, nh = g.h, W = cv.width, H = cv.height;
    const colX = [34, W / 2, W - 34];
    const pos = function (kind, i) {
      if (kind === 0) return [colX[0], 14 + (H - 28) * i / (G.NIN - 1)];
      if (kind === 1) return [colX[1], 18 + (H - 36) * (nh === 1 ? 0.5 : i / (nh - 1))];
      return [colX[2], 22 + (H - 44) * i / (G.NOUT - 1)];
    };
    const node = function (id) {
      if (id >= 200) return pos(2, id - 200);
      if (id >= 100) return pos(1, id - 100);
      return pos(0, id);
    };
    const used = {};
    for (let i = 0; i < g.w.length; i++) { used[g.w[i].f] = 1; used[g.w[i].t] = 1; }
    for (let i = 0; i < g.w.length; i++) {
      const w = g.w[i], a = node(w.f), b = node(w.t);
      const fv = w.f >= 100 ? c.hv[w.f - 100] : c.inp[w.f];
      ctx.strokeStyle = w.v >= 0 ? G.rgba(PAL.algae, 0.3 + 0.5 * Math.min(1, Math.abs(fv || 0) + 0.2)) : G.rgba(PAL.rose, 0.3 + 0.5 * Math.min(1, Math.abs(fv || 0) + 0.2));
      ctx.lineWidth = 1 + Math.min(4, Math.abs(w.v) * 2.2);
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.bezierCurveTo((a[0] + b[0]) / 2, a[1], (a[0] + b[0]) / 2, b[1], b[0], b[1]); ctx.stroke();
    }
    ctx.font = '15px system-ui, sans-serif'; ctx.textBaseline = 'middle';
    for (let i = 0; i < G.NIN; i++) {
      if (!used[i]) { const p = pos(0, i); ctx.fillStyle = G.rgba(PAL.frost, 0.14); ctx.beginPath(); ctx.arc(p[0], p[1], 3, 0, 6.2832); ctx.fill(); continue; }
      const p = pos(0, i), v = Math.min(1, Math.abs(c.inp[i]));
      ctx.fillStyle = G.rgba(PAL.frost, 0.35 + 0.65 * v); ctx.beginPath(); ctx.arc(p[0], p[1], 5 + v * 2, 0, 6.2832); ctx.fill();
      ctx.fillStyle = G.rgba(PAL.frost, 0.75); ctx.textAlign = 'left'; ctx.fillText(G.INAMES[i], p[0] + 11, p[1]);
    }
    for (let i = 0; i < nh; i++) {
      const p = pos(1, i), v = Math.min(1, Math.abs(c.hv[i]));
      ctx.fillStyle = G.rgba(PAL.violet, 0.45 + 0.55 * v); ctx.beginPath(); ctx.arc(p[0], p[1], 8, 0, 6.2832); ctx.fill();
    }
    for (let i = 0; i < G.NOUT; i++) {
      const p = pos(2, i), v = i === 1 ? Math.abs(c.out[1]) : c.out[i];
      ctx.fillStyle = G.rgba(PAL.gold, 0.35 + 0.65 * v); ctx.beginPath(); ctx.arc(p[0], p[1], 6 + v * 3, 0, 6.2832); ctx.fill();
      ctx.fillStyle = G.rgba(PAL.frost, 0.85); ctx.textAlign = 'right'; ctx.fillText(G.ONAMES[i], p[0] - 12, p[1]);
    }
  }

  let prevT = 0;
  function inspectorFrame() {
    const insp = $('inspector');
    const c = G.R.sel;
    if (!c || c.dead) {
      if (c && c.dead && !insp.classList.contains('hide')) {
        // follow the family: a living child first, else the nearest of its species
        const cre = G.W ? G.W.cre : [];
        let heir = null, kind = '', bd = 1e9;
        for (let i = 0; i < cre.length; i++) { const o = cre[i]; if (o.dad && o.dad.id === c.id) { heir = o; kind = 'child'; break; } }
        if (!heir && c.sp) for (let i = 0; i < cre.length; i++) { const o = cre[i]; if (o.sp === c.sp) { const d = Math.hypot(o.x - c.x, o.y - c.y); if (d < bd) { bd = d; heir = o; kind = 'kin'; } } }
        if (heir) { UI.followed = { from: c.id, kind: kind, cause: c.cause }; G.select(heir); return; }
        $('isub').textContent = 'This creature has died, and none of its kind are left. Click another.';
        if (!UI.deadShown) { UI.deadShown = true; }
      }
      if (!c) { UI.deadShown = false; insp.classList.add('hide'); }
      return;
    }
    UI.deadShown = false;
    if (G.mode !== 'play') return;
    insp.classList.remove('hide');
    const sp = G.speciesById(c.sp);
    if (UI.inspDirty) {
      UI.inspDirty = false;
      $('iname').textContent = (sp ? sp.name : 'Blob') + ' #' + c.id + ' · ' + G.kindOf(c.g).full;
      const mut = c.muts.filter(function (m) { return m.big; }).map(function (m) { return m.text; });
      $('imut').textContent = c.muts.length ? 'Mutated genes (pink): ' + c.muts.map(function (m) { return m.text; }).filter(function (v, i, a) { return a.indexOf(v) === i; }).slice(0, 5).join(', ') : 'An exact copy of its mother cell.';
      let par = 'Born in generation ' + c.born;
      if (c.mate) par += ' · crossed two parents (#' + (c.dad ? c.dad.id : '?') + ' and #' + c.mate.id + ')';
      else if (c.dad) par += ' · child of #' + c.dad.id;
      else par += ' · a founder';
      if (UI.followed) {
        const why = { starved: 'starved', selected: 'faded in winter', eaten: 'was eaten', fought: 'was killed in a fight', slain: 'was killed by a touch', event: 'died in what happened', meteor: 'was hit by the meteor', plague: 'died of the plague' }[UI.followed.cause] || 'died';
        par += ' · You were watching #' + UI.followed.from + ', which ' + why + '. This is its ' + (UI.followed.kind === 'child' ? 'child' : 'nearest kin') + '.';
        UI.followed = null;
      }
      $('iPar').textContent = par;
      $('isub').textContent = sp ? G.describeSpecies(sp) : 'A newborn: its species is sorted out in autumn.';
      G.R.selPrev = G.preview(c.g, c.id);
    }
    const now = performance.now();
    if (now - prevT > 60) {
      prevT = now;
      const f = c.E / c.ph.Emax;
      $('iE').innerHTML = 'Energy <b>' + Math.round(c.E) + '</b> / ' + Math.round(c.ph.Emax) + ' · Protein <b>' + Math.round(c.P || 0) + '</b> (a child takes ' + Math.round(c.ph.Emax * G.K.repro * c.ph.pneed) + ')' + (c.asleep ? ' · <b style="color:var(--frost)">asleep</b>' : c.tired > 0.7 ? ' · tired' : '');
      $('iAge').innerHTML = 'Age <b>' + c.age + '</b> · children <b>' + c.off + '</b>';
      const kids = Math.max(0, Math.min(3, Math.floor((c.E - G.K.keep * c.ph.Emax) / (G.K.repro * c.ph.Emax))));
      {
        const be = c.ph.charm, wh0 = c.g.f.bd ? G.form.whole(c.g.f) : { v: 0.5, has: [], lacks: [] }, wh = { v: c.ph.whole === undefined ? wh0.v : c.ph.whole, has: wh0.has, lacks: wh0.lacks }, bw = c.g.f.bd ? G.form.beautyWhy(c.g.f, G.W.taste) : { up: [], down: [] };
        const row = function (name, v, col) { return '<span>' + name + '</span><span class="bar"><i style="width:' + Math.round(Math.max(0, Math.min(1, v)) * 100) + '%' + (col ? ';background:' + col : '') + '"></i></span><b>' + (v * 10).toFixed(1) + '</b>'; };
        const nice = function (L) { return L.map(function (k) { return k.replace(/([a-z])([A-Z0-9])/g, '$1 $2').toLowerCase(); }).join(', '); };
        $('ifit').innerHTML = '<div class="igrade">' + row('Beauty', be) + row('Whole', wh.v) + row('Fed', Math.max(0, f), 'var(--algae)') + '</div>' +
          '<small>' + (c.real ? '<b style="color:var(--gold)">The watcher looked at it:</b> <i>' + escapeHtml(c.real.why || 'no comment') + '</i>' : G.W.eyeN ? 'Not looked at yet: these marks are its parents\' marks, adjusted for how it differs.' : 'No watcher here: these marks are the pond\'s own guess.') + '</small>' +
          '<small>' + (c.doomed ? '<span style="color:var(--rose)">Its score is too low: it fades this winter.</span> ' : c.snub ? '<span style="color:var(--rose)">Among the plainest: nobody chose it as a mate this spring.</span> ' : kids ? 'It could have <b>' + kids + '</b> ' + (kids === 1 ? 'child' : 'children') + ' in spring. ' : '') +
          (bw.up.length ? 'Nice: ' + nice(bw.up) + '. ' : '') + (bw.down.length ? 'Holds it back: ' + nice(bw.down) + '. ' : '') + '</small>' +
          (wh.lacks.length ? '<small>To be a whole creature it still lacks: ' + wh.lacks.join('; ') + '.</small>' : '') +
          (sp && sp.loved ? '<small>You kept one of its kind: it is loved.</small>' : '') +
          ((c.g.t[4] || 0) > 0.38 ? '<small style="color:var(--rose)">Violent: it attacks other kinds.</small>' : '');
      }
      const bar = $('iEb');
      bar.style.width = (Math.max(0, Math.min(1, f)) * 100).toFixed(0) + '%';
      bar.style.background = f > 0.6 ? PAL.algae : f > 0.3 ? PAL.gold : PAL.rose;
      // preview
      const pv = $('iprev'), ctx = pv.getContext('2d');
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, 208, 208);
      const prev = G.R.selPrev;
      if (prev) {
        prev.ang = -0.5; prev.glow = c.glow || 0.5; prev.look = 0;
        prev.asleep = c.asleep; G.drawFit(ctx, prev, 104, 104, 96, G.rt);
      }
      drawStrip(c);
      drawBrain(c);
    }
  }

  // ── start ──
  G.addSystem({
    name: 'hud',
    init: function () { buildHud(); },
    update: function (dt) {
      if (G.mode !== 'play') return;
      refresh(dt);
      inspectorFrame();
      if (document.body.classList.contains('touch') !== !!G.touch && G.touch) document.body.classList.add('touch');
      if (G.R.ghost && !UI.placing) G.R.ghost = null;
    },
  });
  G.getLog = function () { return log; };
})();
