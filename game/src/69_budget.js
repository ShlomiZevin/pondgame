// ── A budget for every thing the AI does ──
// Each kind of AI work has its own budget in dollars FOR THIS POND (what a pond has spent is kept in its save, G.ai.life).
// When a kind has used its budget it stops, in this pond, for good: nothing more is asked of the AI for it, the place where
// it shows says so, and it is marked OFF in the costs sheet (the $ chip, top right). A new pond starts with full budgets.
// The numbers are in one table, here. The server's prices decide what a call costs; this only decides when to stop.
(function () {
  'use strict';
  if (!G.ai) return;
  const A = G.ai;
  //                 dollars for one pond            what one call costs, roughly
  A.budget = {
    thing: 0.40,     // things you type in ADD                     1-2 cents
    figure: 0.80,    // the picture of a typed thing or a monument  4-6 cents
    event: 0.40,     // world events you type in WORLD              2 cents
    nature: 0.25,    // events the pond causes by itself            1.7 cents
    deed: 0.40,      // plans the creatures make                    1.2 cents
    marvel: 0.40,    // rare marvels                                1.2 cents
    icon: 0.50,      // a marvel's picture
    voice: 0.30,     // a line spoken aloud                         13 cents
    sound: 0.15,
    wish: 0.10,      // dreaming a wish                             0.4 cents
    wishcheck: 0.30, // looking whether the wish came true          0.35 cents
    watch: 0.50,     // the watcher grading living creatures        0.4 cents
    judge: 0.30, check: 0.10,
    organ: 0.20, design: 0.20, plan: 0.20, paint: 0.15, story: 0.25, ideas: 0.10,
  };
  A.budgetDefault = 0.20;
  const ALIAS = { 'mutation-ideas': 'ideas' };
  const key = function (k) { return ALIAS[k] || k; };
  A.budgetSet = A.budgetSet || {};      // what the PLAYER set, by kind (dollars for this pond; 0 turns that kind off). It is kept in the pond's save and carried into a new pond.
  A.budgetDefaultOf = function (kind) { const b = A.budget[key(kind)]; return typeof b === 'number' ? b : A.budgetDefault; };
  A.budgetOf = function (kind) { const s = A.budgetSet[key(kind)]; return typeof s === 'number' ? s : A.budgetDefaultOf(kind); };
  A.spentOn = function (kind) { const L = A.life[key(kind)]; return L ? L.usd || 0 : 0; };
  /** has this kind used up its budget in this pond? */
  A.over = function (kind) { return A.spentOn(kind) >= A.budgetOf(kind) - 1e-9; };

  // 1. nothing automatic is asked for once its budget is used
  const allow0 = A.allow;
  A.allow = function (kind) { if (A.over(kind)) return false; return allow0(kind); };
  // 2. what the player types (a thing, a world event) is refused with a clear reason, not quietly made up without the AI
  const ask0 = A.ask;
  A.ask = function (task, input, schema) {
    const kind = task === 'event' && input && typeof input === 'object' && input.auto ? 'nature' : task;
    if ((kind === 'thing' || kind === 'event') && A.provider === 'server' && A.over(kind)) { const e = new Error('budget'); e.budget = true; e.kind = kind; return Promise.reject(e); }
    return ask0(task, input, schema);
  };
  // 3. the moment a budget runs out, say so once
  let told = {};
  const tally0 = A.tally;
  A.tally = function (kind, source, usd) {
    tally0(kind, source, usd);
    const k = key(kind);
    if (!told[k] && A.over(k)) { told[k] = 1; const name = A.LABEL[k] || k; if (G.note) G.note('A budget is used up', name + ' has used its ' + A.money(A.budgetOf(k)) + ' for this pond, so it is off now. See the $ chip for all of them.'); if (G.log) G.log('sel', 'Budget used up', name + ': ' + A.money(A.budgetOf(k)) + ' for this pond. It is off now.'); G.emit('budget-out', k); mark(); }
  };
  G.on('new-pond', function () { told = {}; setTimeout(mark, 50); });
  /** the player sets a budget (dollars for this pond; 0 = off; nothing = back to the usual one) */
  A.setBudget = function (kind, v) {
    const k = key(kind);
    if (v === null || v === undefined || v === '' || !isFinite(+v)) delete A.budgetSet[k]; else A.budgetSet[k] = Math.max(0, Math.min(50, Math.round(+v * 100) / 100));
    delete told[k]; if (G.markDirty) G.markDirty(); setTimeout(mark, 20);
  };
  A.resetBudgets = function () { A.budgetSet = {}; told = {}; if (G.markDirty) G.markDirty(); setTimeout(mark, 20); };

  // 4. it shows: ADD and WORLD are dimmed and badged when they can no longer ask
  function mark() {
    if (typeof document === 'undefined') return;
    const B = document.querySelectorAll('#toolbar button'); if (!B.length) return;
    for (let i = 0; i < B.length; i++) { const b = B[i], t = (b.textContent || '').trim().toUpperCase(), kind = t.indexOf('ADD') === 0 ? 'thing' : t.indexOf('WORLD') === 0 ? 'event' : '';
      if (!kind) continue; const off = A.provider === 'server' && A.over(kind);
      b.style.opacity = off ? '0.45' : ''; b.title = off ? 'Off: its budget for this pond is used up' : '';
      let tag = b.querySelector('.boff'); if (off && !tag) { tag = document.createElement('i'); tag.className = 'boff'; tag.textContent = 'OFF'; tag.style.cssText = 'font:800 8.5px system-ui,sans-serif;font-style:normal;letter-spacing:.08em;color:#ff9db0;margin-left:5px'; b.appendChild(tag); } else if (!off && tag) tag.remove(); }
  }
  if (typeof setInterval !== 'undefined' && typeof document !== 'undefined') setInterval(mark, 3000);

  // the pace of the automatic ones (milliseconds of real time between two of a kind)
  const g = A.gaps, c = A.caps;
  g.deed = 8000; c.deed = 40;      // plans and marvels are spaced by GENERATIONS (see 54_deeds.js and 46b_marvels.js); this only stops two being asked for at once
  g.marvel = 8000;
  g.nature = 300000;
  g.wishcheck = 4000;      // the wish is looked at only when the player presses CHECK NOW; this only stops a double press
})();
