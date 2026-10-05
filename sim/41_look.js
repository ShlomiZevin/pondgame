// ── What a typed BEING looks like ──
// A word can be a substance (acid, a rock, a wall) or a being (a handshake monster, a hungry plant, a ghost).
// A being is drawn as a character, with the very same painter that draws the pond's own creatures, so whatever is
// imagined arrives looking like it belongs here. Its look is a short description in the body's own vocabulary:
// the AI writes it when there is a server; without one the game reads it off what the thing does.
(function () {
  'use strict';
  const clamp = G.clamp;
  const GROW = ['legs', 'fins', 'spikes', 'tentacles', 'feelers', 'plates', 'frills', 'horns', 'hands', 'claws'];
  const MOUTH = ['round', 'beak', 'jaws', 'sucker', 'whiskers'], TAIL = ['none', 'fan', 'fork', 'whip', 'club'], COAT = ['bare', 'scales', 'fur', 'feathers'], PAT = ['plain', 'stripes', 'spots', 'belly', 'rings', 'saddle'];

  G.cleanLook = function (raw) {
    if (!raw || typeof raw !== 'object') return null;
    const n = function (v, a, b, d) { v = +v; return isFinite(v) ? clamp(v, a, b) : d; };
    const idx = function (v, list) { const i = typeof v === 'number' ? v : list.indexOf(String(v || '').toLowerCase()); return i >= 0 && i < list.length ? i | 0 : 0; };
    const grow = [];
    if (Array.isArray(raw.growths)) for (let i = 0; i < raw.growths.length && grow.length < 3; i++) { const g = GROW.indexOf(String(raw.growths[i]).toLowerCase()); if (g >= 0 && grow.indexOf(g) < 0) grow.push(g); }
    return { eyes: Math.round(n(raw.eyes, 1, 3, 2)), mouth: idx(raw.mouth, MOUTH), grow: grow, tail: idx(raw.tail, TAIL), coat: idx(raw.coat, COAT), pat: idx(raw.pattern === undefined ? raw.pat : raw.pattern, PAT),
      n: Math.round(n(raw.segments === undefined ? raw.n : raw.segments, 1, 8, 3)), sym: raw.star >= 3 ? Math.round(n(raw.star, 3, 8, 5)) : 0, big: raw.big_head || raw.big ? 1 : 0, hue2: n(raw.hue2, 0, 360, -1), glow: raw.glow ? 1 : 0, plump: n(raw.plump, 0.6, 1.5, 1) };
  };
  /** no description came with it: read one off what the thing does, the same every time for the same word */
  G.beingLook = function (info) {
    const p = info.props || {}, being = (p.eats || 0) > 0.15 || (p.moves || 0) > 0.15 || ((p.deadly || 0) > 0.15 && (info.alive || 0) > 0.2) || /monster|creature|beast|animal|alien|ghost|dragon|fish|bird|bug|worm|cat|dog|frog|robot|giant|fairy|demon|snake|spider|crab|octopus|shark|whale|bear|wolf|rat|bee|ant|troll|goblin|elf|zombie|vampire|witch|king|queen|man|woman|boy|girl|baby|friend|pet/i.test(info.name || '');
    if (!being) return null;
    const r = G.rng(G.hash(String(info.name || 'thing').toLowerCase()) + 17), grow = [];
    if ((p.eats || 0) > 0.15) grow.push(r() < 0.5 ? 8 : 9);                 // it grabs: hands or claws
    if ((p.deadly || 0) > 0.15) grow.push(7);                              // deadly: horns
    if ((p.moves || 0) > 0.15 && grow.length < 3) grow.push(r() < 0.5 ? 1 : 0);
    if ((p.poison || 0) > 0.2 && grow.length < 3) grow.push(2);
    if (!grow.length) grow.push([0, 1, 3, 4, 6, 8][Math.floor(r() * 6)]);
    if (grow.length < 2 && r() < 0.6) { const g2 = [3, 4, 6, 7][Math.floor(r() * 4)]; if (grow.indexOf(g2) < 0) grow.push(g2); }
    return { eyes: r() < 0.7 ? 2 : r() < 0.5 ? 1 : 3, mouth: (p.eats || 0) > 0.15 || (p.deadly || 0) > 0.15 ? 2 : Math.floor(r() * 5), grow: grow, tail: Math.floor(r() * 5), coat: Math.floor(r() * 4), pat: Math.floor(r() * 6),
      n: 2 + Math.floor(r() * 4), sym: r() < 0.1 ? 5 : 0, big: r() < 0.6 ? 1 : 0, hue2: -1, glow: (p.light || 0) > 0.3 ? 1 : 0, plump: 0.8 + r() * 0.6 };
  };
  /** the body a look describes: an ordinary form, so the ordinary painter can draw it */
  G.lookForm = function (look, hue, seed, props) {
    const n = look.sym ? 2 : look.n, R = function (k, a, b, o) { return Object.assign({ k: k, a: a, b: b, e: 1, l: 1.1, w: 0.55, j: 2, g: 0.1, c: 0.4, t: 0, p: 0.5, on: -1 }, o || {}); }, rules = [];
    for (let i = 0; i < look.grow.length; i++) {
      const g = look.grow[i];
      if (g === 8) rules.push(R(0, 0, 0, { t: 1, l: 1.2 })); else if (g === 9) rules.push(R(0, 0, 0, { t: 2, l: 1.2 }));
      else if (g === 0) rules.push(R(0, Math.min(1, n - 1), n - 1, { t: 3 })); else if (g === 1) rules.push(R(1, Math.min(1, n - 1), Math.min(1, n - 1), { l: 1.5, g: 0.3 }));
      else if (g === 2) rules.push(R(2, 0, n - 1)); else if (g === 3) rules.push(R(3, n - 1, n - 1, { l: 1.3 })); else if (g === 4) rules.push(R(4, 0, 0, { g: -0.7, l: 1.2 }));
      else if (g === 5) rules.push(R(5, 0, n - 1)); else if (g === 6) rules.push(R(6, 0, 0)); else if (g === 7) rules.push(R(7, 0, 0, { g: -0.7 }));
    }
    const p = props || {};
    return G.form.fix({ sym: look.sym, n: n, len: 1, prof: [0.9 * look.plump, 1.2 * look.plump, 1.1 * look.plump, 0.85 * look.plump, 0.5], bend: 0, rules: rules, en: look.eyes, es: 0.48, ek: 0, mk: look.mouth, ms: 0.4, tk: look.tail, ts: 0.9,
      hue: hue, hue2: look.hue2 >= 0 ? ((look.hue2 - hue + 540) % 360) - 180 : 150, sat: 74, lit: 62, pat: look.pat, psc: 0.5, crest: 0, shell: (p.hard || 0) > 0.4 ? 0.8 : 0, glow: look.glow ? 1 : 0, venom: (p.poison || 0) > 0.3 ? 1 : 0, hd: look.big ? 1.5 : 1.1, nk: 0.2, hx: 1, hq: 2, pl: 0, coat: look.coat, seed: (seed | 0) || 7 });
  };
  /** the form of a thing in the pond, if it is a being (worked out once) */
  G.zoneForm = function (z) {
    if (z._form !== undefined) return z._form;
    z._form = z.look ? G.lookForm(z.look, z.hue, z.id * 131 + 7, { hard: z.p.hard, poison: z.p.poison }) : null;
    return z._form;
  };
})();
