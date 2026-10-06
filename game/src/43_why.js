// ── Why: a feature that takes hold comes with its reason ──
// Mutation is blind; what spreads is not. When something new takes hold, the pond says why, from what it can measure:
//   what the feature is for, what the pond is up against right now that it answers, whether it is admired here,
//   and the plain numbers: how those who have it scored this year against those who do not.
// If the numbers say it does not pay, that is said too.
(function () {
  'use strict';
  // key → [what it is for, which of the pond's troubles it answers (matched against the measured pressures)]
  const FOR = {
    grow0: ['legs grab food and can carry a body onto the shore', /scarce|few can eat/],
    grow1: ['fins add speed and turning, and breathe like gills', /oxygen|hunters|attacking|eats|deadly/],
    grow2: ['spikes hurt whatever bites', /hunters|attacking|weak to spikes/],
    grow3: ['tentacles reach food from further off', /scarce|sticky/],
    grow4: ['feelers sense food and danger sooner', /dark|scarce|hunters/],
    grow5: ['plates turn a bite aside', /hunters|attacking|weak to armour/],
    grow6: ['frills breathe well and catch the eye', /oxygen/],
    grow7: ['horns wound an attacker', /hunters|attacking|weak to spikes/],
    eye: ['an eye finds food before bumping into it', /scarce|dark|hunters/], eyes3: ['more eyes see further and all around', /scarce|dark|hunters/],
    mouth1: ['a beak bites harder than a plain mouth', /protein|jaws and beaks/], mouth2: ['jaws open up the big prey of the deep, rich in protein', /protein|jaws and beaks/],
    mouth3: ['a sucker reaches food a plain mouth misses', /scarce/], mouth4: ['whiskers feel for food where eyes fail', /dark|scarce/],
    tail: ['a tail is the cheapest speed there is', /hunters|attacking|scarce/],
    seg11: ['a giant is too big for most mouths, if it can feed itself', /hunters|attacking/], coat1: ['scales turn small bites aside', /hunters|attacking/], coat2: ['fur keeps a body working in the cold', /cold/], coat3: ['feathers keep out the cold and help it steer', /cold/],
    neck: ['a neck lets the head reach and turn without moving the body', /scarce/], bighead: ['a big head carries bigger senses', /dark|scarce|hunters/], nested: ['a part on a part reaches further and does more: an arm with a hand', /scarce/],
    seg2: ['a longer body can grow bigger and carry more', null], seg5: ['a long body is streamlined and has room for more growths', null], seg8: ['a very long body can be very big', null],
    star: ['a star turns on the spot and senses all around', null],
    shell: ['a shell turns bites, at the price of speed', /hunters|attacking|weak to armour/], crest: ['a crest protects a little and is for show', /hunters/],
    glow: ['its own light draws food and grows algae', /dark|glowing/], venom: ['poison makes it a bad meal', /hunters|attacking|weak to poison/],
    pattern: ['markings cost nothing and are there for mates to see', null],
    walker: ['food on the shore lies untouched by anything that cannot walk', null], hands: ['fingers pick the shore\'s food faster', null], biter: ['a strong bite takes the big prey of the deep', /protein/],
  };
  // key → does this creature have it?
  const HAS = {
    eye: function (c) { return c.g.f.en >= 1; }, eyes3: function (c) { return c.g.f.en >= 3; }, tail: function (c) { const f = c.g.f; return f.tk && f.n > 1 && !f.sym; },
    seg2: function (c) { return c.g.f.n >= 2; }, seg5: function (c) { return c.g.f.n >= 5; }, seg8: function (c) { return c.g.f.n >= 8; }, seg11: function (c) { return c.g.f.n >= 11; }, coat1: function (c) { return c.g.f.coat === 1; }, coat2: function (c) { return c.g.f.coat === 2; }, coat3: function (c) { return c.g.f.coat === 3; },
    neck: function (c) { const f = c.g.f; return f.nk > 0.35 && f.n > 1 && !f.sym; }, bighead: function (c) { return c.g.f.hd > 1.45; }, nested: function (c) { return c.g.f.rules.some(function (q) { return q.on >= 0; }); }, star: function (c) { return !!c.g.f.sym; },
    shell: function (c) { return c.g.f.shell > 0.25; }, crest: function (c) { return c.g.f.crest > 0.25; }, glow: function (c) { return c.g.f.glow > 0.3; }, venom: function (c) { return c.g.f.venom > 0.3; },
    pattern: function (c) { return c.g.f.pat > 0; }, walker: function (c) { return c.ph.lungs; }, hands: function (c) { return c.ph.hands; }, biter: function (c) { return c.ph.jaws; },
  };
  const hasFn = function (key) {
    if (HAS[key]) return HAS[key];
    if (key.indexOf('grow') === 0) { const k = +key.slice(4); return function (c) { return c.g.f.rules.some(function (q) { return q.k === k; }); }; }
    if (key.indexOf('mouth') === 0) { const k = +key.slice(5); return function (c) { return c.g.f.mk === k; }; }
    if (key.indexOf('plan') === 0) { const id = +key.slice(4); return function (c) { return c.g.f.pl === id; }; }
    if (key.indexOf('dsg') === 0) { const id = +key.slice(3); return function (c) { return c.g.f.rules.some(function (q) { return q.k === 8 && q.t === id; }); }; }
    if (key.indexOf('organ') === 0) { const id = +key.slice(5); return function (c) { return c.g.p.some(function (p) { return p.k === id; }); }; }
    return null;
  };
  const admired = function (key) {
    const X = G.W && G.W.fashion; if (!X) return false;
    if (key.indexOf('grow') === 0) return X.like[+key.slice(4)] > 0.5;
    return (key === 'pattern' && X.pat > 0) || (key === 'shell' && X.shell) || (key === 'crest' && X.crest) || (key === 'glow' && X.glow) || (key === 'star' && X.star) || (key === 'eyes3' && X.eyes >= 3) || (key === 'seg5' && X.long);
  };

  /** which body gathers each colour of food best */
  G.FOODFOR = ['gold scraps lie in cracks: long reach gathers them', 'lime food darts about: agile bodies catch it', 'green algae is there for anyone', 'blue minerals hide in the dark: sharp senses find them', 'violet food has a hard shell: jaws, beaks and claws open it', 'pink food drifts fast: fast swimmers catch it'];
  /** what a feature is for, and what the pond is up against that it answers (no numbers): for the family tree */
  G.forWhat = function (key) {
    const e = FOR[key]; if (!e) return '';
    let t = e[0];
    const P = G.W && G.W.press ? G.W.press.list : [];
    if (e[1]) for (let i = 0; i < P.length; i++) if (e[1].test(P[i])) { t += '; and ' + P[i].replace(/ \(.*$/, ''); break; }
    return t;
  };
  /** the measured edge of any group of creatures over the rest, in words; '' when there are too few to say */
  G.edge = function (has) {
    const cre = G.W.cre; let a = 0, an = 0, b = 0, bn = 0;
    for (let i = 0; i < cre.length; i++) { if (has(cre[i])) { a += cre[i].fit || 0; an++; } else { b += cre[i].fit || 0; bn++; } }
    if (an < 3) return '';
    if (bn < 3) return 'Nearly all of the pond has it now.';
    a /= an; b /= bn;
    if (a > b + 0.03) return 'Those that have it scored ' + a.toFixed(2) + ' this year; the rest ' + b.toFixed(2) + '.';
    if (a < b - 0.03) return 'It does not pay yet: ' + a.toFixed(2) + ' against ' + b.toFixed(2) + ' for the rest. It spread through mates, kin or luck, and may not last.';
    return 'It scores the same as the rest (' + a.toFixed(2) + '): it has not proved itself yet.';
  };
  /** the full reason for a feature that has just taken hold */
  G.why = function (key, extra) {
    const out = [];
    const f = G.forWhat(key);
    if (f) out.push(f.charAt(0).toUpperCase() + f.slice(1) + '.'); else if (extra) out.push(extra);
    if (admired(key)) out.push('It is admired in this pond, so its owners are chosen as mates.');
    const has = hasFn(key);
    if (has) { const e = G.edge(has); if (e) out.push(e); }
    return out.length ? 'Why: ' + out.join(' ') : '';
  };
  /** which feature a line of the family tree is about (from its words) */
  const WORDS = [[/legs|fingers|pincers|paddles/, 'grow0'], [/fins/, 'grow1'], [/spikes/, 'grow2'], [/tentacles/, 'grow3'], [/feelers/, 'grow4'], [/plates/, 'grow5'], [/frills/, 'grow6'], [/horns/, 'grow7'], [/^eyes:/, 'eye'], [/beak/, 'mouth1'], [/jaws/, 'mouth2'], [/sucker/, 'mouth3'], [/whiskers/, 'mouth4'], [/tail/, 'tail'], [/segments/, 'seg2'], [/star/, 'star'], [/shell/, 'shell'], [/crest/, 'crest'], [/glow/, 'glow'], [/poison/, 'venom'], [/skin turned/, 'pattern'], [/scales/, 'coat1'], [/fur/, 'coat2'], [/feathers/, 'coat3'], [/neck/, 'neck'], [/big head/, 'bighead'], [/part now grows on a part/, 'nested']];
  G.whyLine = function (text) { for (let i = 0; i < WORDS.length; i++) if (WORDS[i][0].test(text)) return G.forWhat(WORDS[i][1]); return ''; };
})();
