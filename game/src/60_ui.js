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
      '<div class="tabs" id="gtabs"><button data-m="look" class="on">BEAUTY</button><button data-m="whole">WHOLE</button>' + (G.MARKS_X || []).map(function (m) { return '<button data-m="mx_' + m.id + '">' + m.label.toUpperCase() + '</button>'; }).join('') + '<button data-m="fit">FITNESS</button><button data-m="room">ROOM</button><button data-m="body">PARTS</button><button data-m="size">SIZE</button><button data-m="skill">SKILL</button><button data-m="pop">POP</button><button data-m="genes">GENES</button></div>' +
      '<canvas id="graph" width="560" height="184"></canvas><div class="gnote" id="gnote"></div><button class="gnote" id="aiLine" style="min-height:0;color:var(--gold);background:none;border:0;padding:0;font:inherit;font-size:11px;line-height:1.3;text-align:left;cursor:pointer;text-decoration:underline dotted;display:block" title="See what each kind of AI use cost"></button><div class="ilabel">What changed</div><div class="log" id="mutLog"></div></div>';
    refs.panel = p;
    if (window.innerWidth < 720 || window.innerHeight <= 520) p.classList.add('min');      // (on a small screen it starts folded)
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
      ['tree', 'tree', 'TREE', 'G'], ['sound', 'speaker', '', 'Esc'],
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
    [['+', 'Zoom in', function () { G.zoomAt(1.35); }], ['−', 'Zoom out', function () { G.zoomAt(1 / 1.35); }], ['⤢', 'Back to the middle of the star, all of it in view', function () { G.camHome(); }]].forEach(function (b) {
      const bt = el('button', 'btn', b[0], zm); bt.setAttribute('aria-label', b[1]); bt.title = b[1]; bt.onclick = function () { G.sfx('click'); b[2](); };
    });
    refs.zoom = zm;
    buildInspector(ui);
  }

  const SEASON_HELP = [
    ['SPRING: breed and mutate', 'Steps 5 and 6 of the genetic algorithm.', 'Every creature that lived through winter may have children: more stored energy means more children (up to three). Mates are chosen for charm and health, and the plainest find none. A child copies its parents\' genes, sometimes mixed from two parents, and a few genes change by chance: that is mutation. Gold rings mark the parents; pink flashes mark a mutated child.'],
    ['SUMMER: the test', 'Step 2 of the genetic algorithm.', 'Nothing is decided by a formula here. Each creature simply lives: it looks for food it can digest, avoids what hurts it, and spends energy on everything it does and everything it carries. Whatever its genes built is put to the test.'],
    ['AUTUMN: the score', 'Step 3 of the genetic algorithm.', 'Each creature is scored by how full its energy tank is: that share, from 0 to 1, is its fitness. The bar above each creature is its score, and the best tenth glow gold. This is the number on the FITNESS graph.'],
    ['WINTER: selection', 'Step 4 of the genetic algorithm.', 'The lowest scores fade away, along with the old and a few unlucky ones, until the star is back to what it can feed. The dashed ring marks who is about to go. Those left are the parents of the next generation, and the loop starts again.'],
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
      ['bloom', 'Food', 0.2, 3, 0.05, 'How much algae the star grows.', function (v) { return v.toFixed(2) + '×'; }],
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
    const evMsg = el('div', 'desc', 'Type any event. The star works out what it means.', pop); evMsg.style.marginTop = '6px';
    const mine = (W.evShelf || []).slice().reverse();
    if (mine.length) {
      el('div', 'ilabel', 'Yours: make it happen again', pop);
      const row = el('div', 'chips evshelf', '', pop); row.style.marginTop = '4px';
      mine.forEach(function (ev) { const c = el('button', 'chip', escapeHtml(ev.name), row); c.title = ev.note || ''; c.onclick = function () { G.sfx('click'); G.runEvent(JSON.parse(JSON.stringify(ev))); closePop(); }; });
    }
    const evGo = function () {
      const t = evIn.value.trim(); if (!t) return;
      G.sfx('click'); evMsg.textContent = 'The star trembles…';
      G.ai.ask('event', t).then(function (ev) {
        if (ev) {
          G.runEvent(ev);
          const W0 = G.W; W0.evShelf = (W0.evShelf || []).filter(function (e) { return e.name.toLowerCase() !== ev.name.toLowerCase(); }); W0.evShelf.push(JSON.parse(JSON.stringify(ev))); if (W0.evShelf.length > 10) W0.evShelf.shift(); G.markDirty();
        }
        closePop();
      }, function (err) { evMsg.textContent = err && err.budget ? 'World events have used their budget for this star, so they are off. A new star starts with a full budget.' : err && err.refused ? 'The star will not do that. Try another.' : 'Nothing happened. Try again.'; });
    };
    evIn.onkeydown = function (e) { if (e.key === 'Enter') { e.preventDefault(); evGo(); } else if (e.key === 'Escape') { evIn.blur(); closePop(); } e.stopPropagation(); };
    el('h3', '', 'DISASTERS', pop).style.marginTop = '10px';
    const dis = el('div', 'disasters', '', pop);
    [['meteor', 'meteor', 'Meteor'], ['flood', 'wave', 'Flood'], ['bloom', 'bloom', 'Bloom'], ['drought', 'drought', 'Drought'], ['plague', 'plague', 'Plague']].forEach(function (d) {
      const b = el('button', 'btn rose sm', ICON[d[1]] + d[2], dis);
      b.onclick = function () {
        G.sfx('click');
        if (d[0] === 'meteor') { closePop(); G.armMeteor(); }
        else { G.disaster(d[0]); G.log('sel', d[2] + '!', 'Something shook the star.'); closePop(); }
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
    // a safe garden for the marvels, offered while there is a marvel to save and no garden yet
    if (G.marvelsAlive && G.marvelsAlive() > 0 && G.HAVEN) {
      const hb = el('button', 'chip', '★ Marvel Garden', chips); hb.title = G.HAVEN.note; hb.style.cssText = 'border-color:rgba(246,211,101,.8);color:#ffe9a8;background:rgba(246,211,101,.12)';
      hb.onclick = function () { G.sfx('click'); G.beginPlacing(JSON.parse(JSON.stringify(G.HAVEN))); closePop(); };
      el('div', '', 'You have a marvel. Add a <b style="color:#f6d365">Marvel Garden</b> to keep it alive longer: it is free, it shelters up to 3 marvels at a time, and keeps the marvel rare: never more than 3 alive carry it. Typing garden, sanctuary or nest makes one as well.', chips).style.cssText = 'flex-basis:100%;font-size:11.5px;line-height:1.4;color:#dcecff;margin:2px 2px 4px';
    }
    const pool = SUGGEST.slice().sort(function () { return Math.random() - 0.5; }).slice(0, 7);
    pool.forEach(function (w) { const c = el('button', 'chip', w, chips); c.onclick = function () { inp.value = w; submit(); }; });
    const submit = function () {
      const w = inp.value.trim();
      if (!w) return;
      G.sfx('click');
      { const hv = G.havenWord ? G.havenWord(w) : null; if (hv) { G.beginPlacing(hv); closePop(); return; } }      // a garden, a sanctuary, a nest: a safe place for the marvels
      const open = function () { return UI.popName === 'add' && $('thing'); };
      const dots = '<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--gold);margin-right:8px;animation:wishp 1s ease-in-out infinite"></span>';
      const making = function (text) { let m = $('making'); if (!text) { if (m) m.classList.add('hide'); return; } if (!m) { m = el('div', 'glass', '', $('ui')); m.id = 'making'; m.style.cssText = 'position:fixed;left:50%;transform:translateX(-50%);bottom:124px;z-index:7;padding:8px 14px;border-radius:999px;font-size:12px;pointer-events:none;white-space:nowrap;max-width:calc(100vw - 28px);overflow:hidden;text-overflow:ellipsis'; } m.classList.remove('hide'); m.innerHTML = dots + text; };
      if (open()) $('thing').innerHTML = '<div class="thingcard">' + dots + 'Imagining <b>' + escapeHtml(w) + '</b>…</div>';
      making('Imagining <b>' + escapeHtml(w) + '</b>…');
      if (G.figurePre) G.figurePre(w);      // its picture is begun at once, while it is being imagined
      G.ai.ask('thing', w).then(function (info) {
        const by = info.source === 'ai' || info.source === 'cache' ? (G.ai.labelOf(info.model) || 'the server') : '';
        const card = function (state) { const pic = (G.figurePic && G.figurePic(info.name)) || info.svg; return '<div class="thingcard">' + (pic ? '<img alt="" width="64" height="72" style="float:right;margin-left:8px" src="data:image/svg+xml;charset=utf-8,' + encodeURIComponent(pic) + '">' : '') + '<b>' + escapeHtml(info.name) + '</b><br>' + escapeHtml(info.note) + (by ? '<br><small>imagined by ' + escapeHtml(by) + '</small>' : '') + (state ? '<br><small style="color:var(--gold)">' + dots + state + '</small>' : '') + '</div>'; };
        // its picture is drawn before it can be placed: what goes into the pond is the real thing, never a stand-in
        if (open()) $('thing').innerHTML = card('Drawing it… a few seconds more the first time; at once after that.');
        making('Drawing <b>' + escapeHtml(info.name) + '</b>… you can close this window, it will be ready in a moment.');
        const fin = function () {
          making('');
          if (open()) { $('thing').innerHTML = card(''); G.beginPlacing(info); closePopSoon(); }
          else { G.beginPlacing(info); if (G.toast) G.toast('<b style="color:var(--gold)">' + escapeHtml(info.name) + ' is ready.</b><br>' + (G.touch ? 'Tap' : 'Click') + ' the star to drop it.'); G.sfx('discovery'); }
        };
        const wall = info.props && info.props.vault > 0.2;
        (G.figureFor ? G.figureFor({ name: info.name, note: info.note, hue: info.hue, wall: wall }, w) : Promise.resolve(null)).then(fin, fin);
      }, function (err) {
        making('');
        const msg = err && err.budget ? 'Adding things has used its budget for this star, so it is off. A new star starts with a full budget.' : err && err.refused ? 'The star cannot take that word. Try another.' : 'The star could not make sense of that. Try again.';
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
    pl.innerHTML = '<span>' + (G.touch ? 'Tap' : 'Click') + ' the star to drop <b>' + escapeHtml(info.name) + '</b></span><button class="btn sm" id="plCancel">CANCEL</button>';
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
    pl.innerHTML = '<span>' + (G.touch ? 'Tap' : 'Click') + ' the star to aim the meteor</span><button class="btn sm" id="plCancel">CANCEL</button>';
    $('plCancel').onclick = function () { G.cancelPlacing(); };
    document.getElementById('pond').classList.add('placing');
  };

  G.on('pond-click', function (c) {
    if (G.mode !== 'play' || !G.W || G.isBlocked()) return;
    closePop();
    if (G.cmd && G.cmd.takeClick && G.cmd.takeClick(c)) return;      // (a place for something to be built, or where those you chose are sent)
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
      G.log('sel', 'Meteor!', 'It struck the star.');
      G.cancelPlacing();
      return;
    }
    // inspect the nearest creature
    let best = null, bd = 1e9;
    const cre = G.W.cre;
    for (let i = 0; i < cre.length; i++) {
      const o = cre[i], x = o.rx === undefined ? o.x : o.rx, y = o.ry === undefined ? o.y : o.ry;
      const dx = x - c.x, dy = y - c.y, d = Math.sqrt(dx * dx + dy * dy) - Math.max(o.ph.r, (o.ph.rc || o.ph.r) * 1.25, o.ph.r * 1.7);
      if (d < bd) { bd = d; best = o; }
    }
    // a creature that was clicked ON wins; then whatever else is drawn under the click (a thing, something built, a wall, a plan); then the nearest creature
    const hit = G.thingAt ? G.thingAt(c.x, c.y) : null, onIt = best && bd < (c.touch ? 26 : 10);
    if (best && (onIt || (!hit && bd < (c.touch ? 55 : 42)))) { G.selectZone(null); if (G.selectThing) G.selectThing(null); G.select(best); }
    else if (hit && G.selectThing) { G.select(null); G.selectThing(hit); }
    else { G.select(null); if (G.selectThing) G.selectThing(null); G.selectZone(G.zoneAt(c.x, c.y)); }
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
    const t = 'The commonest body on the star is now the ' + age.kind.toLowerCase() + ' (' + Math.round(age.share * 100) + '% of all life). The ' + was.kind.toLowerCase() + 's had led since generation ' + was.gen + '.';
    G.log('disc', age.name.toUpperCase(), t + (age.why ? ' ' + age.why : ''));
    G.banner('A NEW AGE BEGINS', age.name + '. ' + t + (age.why ? ' ' + age.why : ''), 11000);
    G.R.flash = 1; G.R.flashCol = G.PAL.gold; G.R.shake = 0.4;
    G.sfx('discovery');
  });
  G.on('marvel', function (c, def) {
    if (G.mode !== 'play') return;
    let item = null; try { item = G.keep ? G.keep(c) : null; } catch (e) { console.error(e); }
    if (item) item.age = ('Marvel · ' + def.name).slice(0, 70);
    if (G.sfx) G.sfx('discovery');
    if (!(G.cmd && G.cmd.busy && G.cmd.busy())) { if (G.select) G.select(c); if (G.focusOn) G.focusOn(c.x, c.y, 2.4); }      // (the view is not taken from someone in the middle of giving orders: the banner tells, and NOW has it)
    if (G.banner) G.banner('★ A MARVEL', 'Creature #' + c.id + ' was born with ' + def.name + '. ' + def.wonder + (def.why ? ' (' + def.why + ')' : '') + (item ? ' It is kept in your collection (BOOK).' : ''), 12000);
    if (G.log) G.log('disc', 'A marvel: ' + def.name, 'Creature #' + c.id + '. ' + def.wonder);
    if (G.markDirty) G.markDirty();
  });
  G.on('plan-new', function (p) { if (G.mode !== 'play') return; const t = 'A new shape of body was imagined for this star: the ' + p.name + '. ' + p.note + (p.because ? ' Why: ' + p.because + '.' : '') + (p.seen ? ' Drawn and looked at first: ' + Math.round(p.seen.score * 10) + '/10.' : ''); G.log('disc', 'A new shape of body', t); if (G.speed <= 16) G.banner('A body nobody has seen', t, 7500); });
  G.on('idea-dropped', function (name, v) { if (G.mode !== 'play') return; G.log('disc', 'An idea was turned away', 'The "' + name + '" was imagined for this star, drawn, and looked at. The eye for beauty gave it ' + Math.round(v.score * 10) + '/10 (' + v.why + '), so it was not let in.'); });
  G.on('design-new', function (d) { if (G.mode !== 'play') return; const t = 'A new kind of body part is now possible on this star: the ' + d.name + '. ' + d.note + (d.because ? ' Why: ' + d.because + '.' : ''); G.log('disc', 'A new kind of part', t); if (G.speed <= 16) G.banner('Something never seen before', t, 7000); });
  G.on('new-pond', function () { if (G.form.clearCache) G.form.clearCache(); });
  G.on('bred', function (it, c) { if (G.mode !== 'play') return; G.log('disc', 'Bred', it.name + ' and #' + c.id + ' had six children.'); G.banner('A new family', 'Six children of ' + it.name + ' and a creature of this star were born. Watch what they become.', 5200); G.focusOn(c.x, c.y, 1.8); });
  G.on('released', function (it, x, y) { if (G.mode !== 'play') return; G.log('disc', 'Released', it.name + ' (' + it.kind + ') now lives on this star.'); G.focusOn(x, y, 1.8); });
  G.on('sickness', function (kind, n, crowd) { if (G.mode !== 'play') return; const t = 'There are so many ' + kind.toLowerCase() + 's (' + Math.round(crowd * 100) + '% of the star) that a sickness spreads among them. ' + n + ' will not see spring; the rarer kinds are hardly touched.'; G.log('sel', 'A sickness of the many', t); if (G.speed <= 16) G.banner('Too many of one kind', t, 6500); });
  G.on('painted', function (sig, info, source) { if (G.mode !== 'play') return; G.log('sp', 'Painted', (info.name || 'A kind') + ', a ' + String(info.kind || '').toLowerCase() + ', has been painted' + (source === 'library' ? ' (from the library, free).' : '.')); });
  G.on('fashion', function (t) { if (G.mode !== 'play') return; G.log('sp', 'Taste has shifted', t + '. Those who have it will find mates more easily.'); UI.eraSig = ''; });
  G.on('judged', function (s) { if (G.mode !== 'play') return; G.log('sp', 'Beauty ' + Math.round(s.judge.score * 10) + '/10: the ' + s.name, (s.judge.why || 'no comment') + (s.judge.fix ? ' What would make it nicer: ' + s.judge.fix.replace(/_/g, ' ') + ' (its children are now likelier to be born that way).' : '')); });
  G.on('zone-killed', function (z) { if (G.mode !== 'play') return; const t = 'The star killed ' + z.word + '! Creatures with ' + G.WEAK[z.weak].text + ' wore it down.'; G.log('disc', 'Victory', t); G.banner('Life fought back', t, 6000); });
  G.on('event', function (ev) { if (G.mode !== 'play') return; if (ev.got) ev.note = (ev.note ? ev.note + ' ' : '') + ev.got + ' creatures grew ' + ev.gift.trait + '.'; G.log('sel', (ev.nature ? 'Nature: ' : '') + ev.name, ev.note); G.banner('It happened', ev.name + (ev.note ? ': ' + ev.note : ''), 5200); });
  G.on('story', function (s) { if (G.mode !== 'play') return; G.log('disc', s.title, s.text); if (G.speed <= 16) G.banner('The story so far · ' + s.title, s.text, 9000); });
  G.on('organ-new', function (o) { if (G.mode === 'play') G.log('disc', 'New organ', o.name + (G.ai.labelOf(o.by) ? ' (imagined by ' + G.ai.labelOf(o.by) + ')' : '') + ': ' + o.note); });
  G.on('zone-bud', function (child, z) { if (G.mode === 'play') G.log('sp', z.word + ' spread', 'A new patch grew nearby, a little different.'); });

  let bannerTimer = 0, bannerQ = [];
  G.on('new-pond', function () { bannerQ.length = 0; });      // what was waiting to be said was about the pond you have left
  G.banner = function (kicker, text, ms) {
    if (bannerQ.length > 1) bannerQ.shift();
    bannerQ.push([kicker, text, ms]);
    if (!bannerTimer) nextBanner();
  };
  function nextBanner() {
    const b = bannerQ.shift();
    if (!b) { bannerTimer = 0; return; }
    refs.banner.innerHTML = '<small>' + escapeHtml(b[0]) + '</small>' + escapeHtml(b[1]);
    { let y = 78; ['wish', 'wxnow', 'voybar', 'voypick', 'resbar', 'battle'].forEach(function (id) { const e = document.getElementById(id); if (e && !e.classList.contains('hide') && e.offsetHeight && window.innerWidth > 720) y = Math.max(y, e.getBoundingClientRect().bottom + 10 - 14); });
      refs.banner.style.setProperty('transform', 'translate(-50%,' + Math.round(y) + 'px)', 'important'); }      /* just below the wish and the weather, never on them */
    refs.banner.classList.add('show');
    G.sfx('discovery');
    bannerTimer = setTimeout(function () {
      refs.banner.classList.remove('show'); refs.banner.style.removeProperty('transform');
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
    look: { label: 'Beauty: how nice to the eye the creatures of this star are, out of 10 (the average; the dashed line is the nicest one alive). This is what the star evolves towards.', get: function (h) { return (h.look || 0) * 10; }, fmt: function (v) { return v.toFixed(1); }, min: 0, max: 10 },
    fit: { label: 'Fitness = how nice to the eye and how whole a creature is, for those that have eaten well enough (half a tank). Higher scores survive winter and have more children.', get: function (h) { return h.avg; }, fmt: function (v) { return v.toFixed(2); }, min: 0, max: 1 },
    room: { label: 'Room to grow: how much more a body may carry than at the start before the star counts it as clutter. It is earned: it opens a little each time the watcher looks and finds the bodies read well, and closes when they do not. 0 means the first, simple limits.', get: function (h) { return h.room || 0; }, fmt: function (v) { return v.toFixed(1); }, min: 0 },
    body: { label: 'Parts: a plain COUNT of what is on a body (its joined parts and everything that grows on it). Not a mark: more is not better. The average; the dashed line is the busiest body alive.', get: function (h) { return h.body || 0; }, top: function (h) { return h.bodyTop || 0; }, fmt: function (v) { return v.toFixed(1); }, min: 0 },
    size: { label: 'Size: how big the creatures are (the first cells are about 10; the most a creature can reach is 64). The average; the dashed line is the biggest one alive. An old star drifts bigger for as long as there is food for it.', get: function (h) { return h.size || 0; }, top: function (h) { return h.sizeTop || 0; }, fmt: function (v) { return v.toFixed(1); }, min: 0 },
    skill: { label: 'Skill: food eaten per creature each generation', get: function (h) { return h.intake; }, fmt: function (v) { return v.toFixed(0); }, min: 0 },
    pop: { label: 'How many creatures were alive at autumn', get: function (h) { return h.pop; }, fmt: function (v) { return v.toFixed(0); }, min: 0 },
    genes: { label: 'Genome size: parts, wires and brain cells per creature', get: function (h) { return h.genes; }, fmt: function (v) { return v.toFixed(1); }, min: 0 },
  };
  (G.MARKS_X || []).forEach(function (m) { METRICS['mx_' + m.id] = { label: m.note + ' The average; the dashed line is the highest alive. Where the watcher has not looked, it is the star\'s own guess.', get: function (h) { return h.mx && h.mx[m.id] ? h.mx[m.id][0] * 10 : 0; }, top: function (h) { return h.mx && h.mx[m.id] ? h.mx[m.id][1] * 10 : 0; }, fmt: function (v) { return v.toFixed(1); }, min: 0, max: 10 }; });
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
    let lo = m.min === undefined ? Math.min.apply(null, vals) : m.min, hi = m.max === undefined ? Math.max.apply(null, m.top ? hist.map(m.top).concat(vals) : vals) * 1.1 + 0.001 : m.max;
    if (hi - lo < 1e-6) hi = lo + 1;
    const pad = 14, n = hist.length;
    const X = function (i) { return pad + (w - pad * 2) * (n === 1 ? 0 : i / (n - 1)); };
    const Y = function (v) { return h - pad - (h - pad * 2) * ((v - lo) / (hi - lo)); };
    ctx.strokeStyle = G.rgba(PAL.frost, 0.1); ctx.lineWidth = 1;
    for (let i = 0; i < 4; i++) { const y = pad + (h - pad * 2) * i / 3; ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(w - pad, y); ctx.stroke(); }
    if (m.top) {
      ctx.strokeStyle = G.rgba(PAL.gold, 0.45); ctx.lineWidth = 2; ctx.setLineDash([5, 5]);
      ctx.beginPath(); hist.forEach(function (q, i) { const x = X(i), y = Y(m.top(q)); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }); ctx.stroke(); ctx.setLineDash([]);
    } else if (UI.metric === 'fit' || UI.metric === 'look' || UI.metric === 'whole') {
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
      $('capText').textContent = first ? 'A star of blobs, each with different random genes. Nobody designed them; let us see who survives.' : info.text;
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
      const line = 'AI this session: ' + G.ai.money(t.usd) + ' · ' + t.fresh + ' new answer' + (t.fresh === 1 ? '' : 's') + (snd ? ' (' + snd + ' sound' + (snd === 1 ? '' : 's') + ')' : '') + (t.asked > t.fresh ? ' · ' + (t.asked - t.fresh) + ' reused free' : '') + (t.unpriced ? ' · ' + t.unpriced + ' not priced' : '') + (G.ai.fuel !== null ? ' · fuel left: ' + G.ai.fuel + (G.ai.fuel === 0 ? ' (the star now imagines by itself)' : '') : '') + ' · see the breakdown';
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
        '<div style="font-size:10.5px;color:rgba(207,232,255,.7);line-height:1.3;margin-top:4px">This star: <b style="color:#fff">' + G.envText(W) + '</b>.</div>' +
        '<div style="font-size:10.5px;color:rgba(207,232,255,.7);line-height:1.3;margin-top:4px">Admired on this star: <b style="color:#fff">' + G.form.fashionText(W.fashion) + '</b>.</div>' +
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
    if (W.gen === 3 && s === 1) G.hint('add', 'Try ADD: type any word and drop it onto the star.', 8000);
    if (W.gen === 2 && s === 1) G.hint('zoom', G.touch ? 'Pinch to zoom, drag to move: the star is bigger than the screen.' : 'Scroll to zoom, drag to move: the star is bigger than the screen.', 8000);
    if (W.gen === 5 && s === 1) G.hint('speed', 'Use SPEED to fast-forward: evolution is slow.', 8000);
    if (W.gen === 7 && s === 1) G.hint('world', 'WORLD changes the weather. Stress the star and see what answers.', 8000);
    if (W.gen === 9 && s === 1) G.hint('guide', 'BOOK is the Book of Life: the history of this star, every kind that evolved, and what was invented.', 8000);
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
      '<div id="imarvel" class="hide"></div>' +
      '<div id="ifit" style="font-size:11.5px;line-height:1.4"></div>' +
      '<div class="irows"><div id="iE"></div><div id="iAge"></div><div id="iPar" style="grid-column:span 2"></div><div class="meter"><i id="iEb"></i></div></div>' +
      '<div class="imut" id="imut"></div>' +
      '<button class="btn sm" id="iwhy" style="width:100%;margin-top:8px" title="Everything about it in one window: its marks and its life, what it is made of, and its brain at work">ABOUT IT · GENES · BRAIN</button>' +
      '<button class="btn sm" id="igenes" style="display:none">GENES AND BRAIN</button>' +
      '<style>#inspector .ihead{flex-direction:column;align-items:center;text-align:center;position:relative;gap:0}#inspector .ihead canvas{width:150px;height:150px;margin:-14px 0 -10px}#inspector .ihead>div{width:100%}#inspector .ihead b{font-size:15px}#inspector .x{position:absolute;top:-6px;right:-6px;margin:0}#isub{text-align:left;margin-top:5px}#iacts{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px;margin-top:10px}#iacts .btn{display:flex;align-items:center;justify-content:center;gap:5px;min-height:38px;padding:0 4px;font-size:10px;letter-spacing:.06em;white-space:nowrap}#iacts .btn svg{width:14px;height:14px;flex:none;margin:0}#iacts .btn i{font-style:normal;font-size:14px;line-height:1}#iacts #ikeep i{color:var(--gold)}#iacts #ibreed i{color:var(--rose)}#imarvel{margin:8px 0 6px;padding:9px 11px;border-radius:12px;background:rgba(246,211,101,.12);border:1.5px solid rgba(246,211,101,.7);text-align:left}#imarvel .mk{font:800 9.5px system-ui,sans-serif;letter-spacing:.2em;color:#f6d365}#imarvel .mn{display:flex;align-items:center;gap:8px;font:800 16px system-ui,sans-serif;color:#fff;margin:2px 0 3px}#imarvel .mn img{width:30px;height:30px;flex:none}#imarvel .mw{font:600 12.5px/1.4 system-ui,sans-serif;color:#fff}#imarvel ul{margin:6px 0 0;padding:0;list-style:none}#imarvel li{font:600 11.5px/1.35 system-ui,sans-serif;color:#ffe9a8;padding:3px 0 3px 16px;position:relative}#imarvel li:before{content:"\\25C6";position:absolute;left:0;font-size:9px;top:5px}#imarvel .my{font-size:10.5px;opacity:.75;margin-top:5px;font-style:italic}</style>' +
      '<div id="iacts"><button class="btn sm" id="ikeep" title="Keep this creature in your collection. It outlives the star."><i>★</i>KEEP</button><button class="btn sm" id="ibreed" title="Breed this creature with one from your collection."><i>♥</i>BREED</button><button class="btn sm" id="itree" title="Its family tree">' + ICON.tree + 'TREE</button><button class="btn sm" id="iguide" title="Its kind, in the Book of Life">' + ICON.book + 'KIND</button></div>';
    $('iclose').onclick = function () { G.select(null); };
    $('iwhy').onclick = function () { G.sfx('click'); if (G.openAbout) G.openAbout(); };
    $('igenes').onclick = function () { G.sfx('click'); if (G.openGenes) G.openGenes(); };
    $('isub').onclick = function () { this.classList.toggle('open'); };
    $('itree').onclick = function () { G.sfx('click'); G.openTree(); };
    $('ibreed').onclick = function () { const c = G.R.sel; if (!c) return; G.sfx('click'); if (!G.collection.length) { G.banner('Nothing to breed it with yet', 'First ★ KEEP a creature you like (from this star or another). Then choose it here to breed the two.', 5200); return; } UI.breedWith = c.id; UI.guideTab = 'coll'; G.openGuide(); };
    // a short word right where the hand is: it shows at once and fades by itself
    G.toast = function (html) { let t = $('toast'); if (!t) { t = el('div', 'glass', '', ui); t.id = 'toast'; t.style.cssText = 'position:fixed;right:14px;bottom:14px;z-index:7;max-width:min(300px,calc(100vw - 28px));padding:10px 14px;border-radius:14px;font-size:12.5px;line-height:1.35;border:1px solid rgba(246,211,101,.6);pointer-events:none;transition:opacity .4s,transform .4s;opacity:0;transform:translateY(8px)'; } t.innerHTML = html; const i = $('inspector'); t.style.bottom = (i && !i.classList.contains('hide') ? Math.round(i.getBoundingClientRect().height) + 22 : 14) + 'px'; t.style.opacity = '1'; t.style.transform = 'none'; clearTimeout(G.toast._t); G.toast._t = setTimeout(function () { t.style.opacity = '0'; t.style.transform = 'translateY(8px)'; }, 3200); };
    const keptOf = function (c) { const tag = ' #' + c.id; for (let i = 0; i < G.collection.length; i++) { const n = G.collection[i].name; if (n.slice(-tag.length) === tag) return G.collection[i]; } return null; };
    const keepLabel = function () { const c = G.R.sel, b = $('ikeep'); if (!b) return; const k = c && keptOf(c); b.innerHTML = k ? '<i>★</i>KEPT' : '<i>★</i>KEEP'; b.style.borderColor = k ? 'var(--gold)' : ''; b.style.color = k ? 'var(--gold)' : ''; b.title = k ? 'It is in your collection (BOOK, under COLLECTION).' : 'Keep this creature in your collection. It outlives the star.'; };
    G.on('select', keepLabel); G.on('kept', keepLabel);
    $('ikeep').onclick = function () {
      const c = G.R.sel; if (!c) return;
      if (keptOf(c)) { G.sfx('click'); G.toast('<b style="color:var(--gold)">★ Already in your collection.</b><br>Open BOOK, then COLLECTION, to release or breed it.'); return; }
      const it = G.keep(c);
      if (it) { G.sfx('discovery'); keepLabel(); G.toast('<b style="color:var(--gold)">★ Kept: ' + escapeHtml(it.name) + '</b><br>It is in your collection now (BOOK, then COLLECTION). It outlives this star.'); G.markDirty(); }
    };
    $('iguide').onclick = function () { G.sfx('click'); UI.guideTab = 'live'; G.openGuide(); };
    G.on('select', function (c) {
      i.classList.toggle('hide', !c || G.mode !== 'play');
      UI.inspDirty = true;
    });
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
      // one line of what it is, and its life as a row of short tags (G.cardTags, 60b_genes.js); the whole of it in words is in ABOUT THIS CREATURE
      $('isub').textContent = G.cardLine ? G.cardLine(c, sp) : (sp ? G.describeSpecies(sp) : 'A newborn: its species is sorted out in autumn.');
      if (G.cardTags) G.cardTags(c);
      { const mb = $('imarvel'), mv = c.ph.mv, key = mv ? 'm' + mv.id : ''; if (mb && mb._k !== key) { mb._k = key; mb.classList.toggle('hide', !mv); mb.innerHTML = mv && G.marvelCard ? G.marvelCard(mv) : ''; } }
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
        const cell = function (name, v, col, tip) { return '<span class="mcell" title="' + escapeHtml(tip || '') + '"><span>' + name + '</span><span class="bar"><i style="width:' + Math.round(Math.max(0, Math.min(1, v)) * 100) + '%' + (col ? ';background:' + col : '') + '"></i></span><b>' + (v * 10).toFixed(1) + '</b></span>'; };
        $('ifit').innerHTML = '<div class="imarks">' + (G.MARKS || []).map(function (m) { return cell(m.label, G.markOf(c, m.id), '', m.note); }).join('') + cell('Fed', Math.max(0, f), 'var(--algae)', 'How full it is: a creature must have fed to breed.') + '</div>' +
          '<div class="iappeal">Appeal <b>' + (G.charmOf(c) * 10).toFixed(1) + '</b> <i>' + 'all its marks together: this, with being fed, is its fitness' + '</i></div>' +
          '<small>' + (c.real ? '<b style="color:var(--gold)">The watcher looked at it:</b> <i>' + escapeHtml(c.real.why || 'no comment') + '</i>' : G.W.eyeN ? 'Not looked at yet: these marks are its parents\' marks, adjusted for how it differs.' : 'No watcher here: these marks are the star\'s own guess.') + '</small>' +
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
        const mv = c.ph && c.ph.mv, em = mv && G.marvelEmblem ? G.marvelEmblem(mv) : null;
        if (mv) {
          const gx = 168, gy = 44 + Math.sin(G.rt * 2.2) * 4, gs = 23;
          ctx.save(); ctx.globalCompositeOperation = 'lighter';
          const hg = ctx.createRadialGradient(gx, gy, 3, gx, gy, gs * 1.7); hg.addColorStop(0, G.hsl(mv.hue, 95, 70, 0.5)); hg.addColorStop(1, G.hsl(mv.hue, 95, 70, 0)); ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(gx, gy, gs * 1.7, 0, 6.2832); ctx.fill();
          ctx.globalCompositeOperation = 'source-over';
          if (em) ctx.drawImage(em, gx - gs, gy - gs, gs * 2, gs * 2); else if (G.glyph) G.glyph(ctx, mv.glyph, gx, gy, gs * 0.6, mv.hue, G.rt);
          ctx.restore();
        }
      }
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
