// CAN THEY FLY TO ANOTHER POND, AND COME HOME?  node tools/voyage-test.js [generations] [seed]        (no AI, no page: free; exits 1 if a check fails)
//   1. A SHIP            a pond left to itself builds one, whole and sound (no piece resting on nothing)
//   2. SPACE             what lies out there is the same every time you look, and ponds differ from each other in their people
//   3. THE CROSSING      the crew leaves home; the far pond is alive with its own kinds; the crew is set down in it as strangers; the ship is there
//   4. AMONG THEM        the far pond lives on, and says what it made of each of the crew
//   5. SAVED WHILE AWAY  what is saved is the pond at home (without the crew), with the far pond beside it
//   6. HOME              the pond at home is as it was left; one creature of theirs came back with the ship; those who stayed are counted as the outpost
//   7. AGAIN             the far pond is as it was left (the outpost lives there), and there is still one ship, not two
//   8. REOPENED          a save made at home brings the far ponds back with it
const fs = require('fs'), path = require('path'), vm = require('vm');
global.window = globalThis; globalThis.addEventListener = () => {};
const src = path.join(__dirname, '..', 'src');
for (const f of ['10_core.js', '20_genome.js', '21_form.js', '21b_body.js', '21c_taste.js', '30_world.js', '40_words.js', '41_look.js', '43_why.js', '44_pressure.js', '45_organs.js', '45_parts.js', '45_plans.js', '46_events.js', '53_fields.js', '47_story.js', '48_judge.js', '49_eras.js', '54_deeds.js', '54c_acts.js', '54d_build.js', '54e_teach.js', '54f_judge.js', '54g_society.js', '57x_far.js', '80_save.js'])
  vm.runInThisContext(fs.readFileSync(path.join(src, f), 'utf8'), { filename: f });
G.hints = G.hints || {};
const gens = +process.argv[2] || 70, seed = +process.argv[3] || 11, F = G.far;
const fails = [], check = (ok, what) => { console.log((ok ? '  ok    ' : '  FAIL  ') + what); if (!ok) fails.push(what); };
const mean = (a) => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
const met = []; G.on('stranger-met', (c, end, text) => met.push({ id: c.id, end, text }));

// ── 1. a ship ──
G.newWorld({ seed }); G.founderPond(); G.mode = 'play'; G.speed = 1;
let shipGen = 0; while (G.W.gen <= gens && !G.W.extinct) { G.step(0.1); if (!shipGen && F.shipOf()) shipGen = G.W.gen; if (shipGen && G.W.gen >= shipGen + 2) break; }
let ship = F.shipOf();
console.log('home: seed ' + seed + ', generation ' + G.W.gen + ', ' + G.W.cre.length + ' alive, ' + (G.W.works || []).filter((w) => w.bp).length + ' buildings' + (ship ? ', the ' + ship.name + ' (' + ship.bp.P.length + ' pieces) stood whole in generation ' + shipGen : ', NO SHIP'));
{ const port = (G.W.works || []).filter((w) => w.bp && w.bp.type === 'port')[0], sy = G.shoreY(G.W); check(!!port && port.y < sy && (port.x < G.W.ww * 0.25 || port.x > G.W.ww * 0.75), '1. a spaceport: built first, on the land at the border of the pond' + (port ? ' (x ' + Math.round(100 * port.x / G.W.ww) + '% across, ' + Math.round(sy - port.y) + ' above the waterline)' : ''));
  if (port && ship) { const dc = G.dockCheck(port, ship); check(dc.pad && dc.blocked === 0, '1. ... the port has a pad, and the middle of it is clear (' + dc.blocked + ' pieces stand in it)'); check(dc.centred && dc.fits && dc.onPad, '1. ... and the ship stands in the middle of the pad, fits it, and its foot is on it'); } }
// whatever the design: a port drawn with a tower in its middle and no pad, and a ship drawn too wide and off-centre, are put right
{ const mk = (type, pieces, S) => ({ seed: 3, type, S, hue: 40, spiky: 0, brain: 0.5, wet: false, designed: true, P: G.designFrom({ pieces }, S, 30) });
  const pbp = mk('port', [{ s: 'column', x: 0, y: 0, w: 0.3, h: 1.4, m: 'stone', c: 'main' }, { s: 'cone', x: 0, y: 1.4, w: 0.4, h: 0.4, m: 'reed', c: 'second' }, { s: 'block', x: -0.9, y: 0, w: 0.3, h: 0.5, m: 'stone', c: 'main' }, { s: 'lamp', x: 0.9, y: 0, w: 0.15, h: 0.15, m: 'shell', c: 'glow' }, { s: 'flag', x: 0.3, y: 0, w: 0.2, h: 0.3, m: 'reed', c: 'light' }], 100);
  G.portFit(pbp); const port2 = { x: 500, y: 300, bp: pbp }, dk = G.dockOf(port2);
  const sbp = mk('ship', [{ s: 'block', x: 0.6, y: 0, w: 1.6, h: 0.5, m: 'stone', c: 'main' }, { s: 'cone', x: 0.6, y: 0.5, w: 1.0, h: 0.6, m: 'reed', c: 'second' }, { s: 'wing', x: -0.4, y: 0, w: 0.4, h: 0.4, m: 'shell', c: 'light' }, { s: 'wing', x: 1.6, y: 0, w: 0.4, h: 0.4, m: 'shell', c: 'light' }, { s: 'lamp', x: 0.6, y: 1.1, w: 0.15, h: 0.15, m: 'shell', c: 'glow' }], 80);
  G.shipFit(sbp, dk.half); const ship2 = { x: dk.x, y: dk.y - sbp.S * 0.45, bp: sbp }, dc = G.dockCheck(port2, ship2), c1 = G.designCheck(pbp), c2 = G.designCheck(sbp);
  check(dc.pad && dc.blocked === 0 && c1.loose === 0, '1. ... a design with a tower in the middle and no pad is put right: a pad is laid, the middle cleared, nothing left hanging (' + (pbp.cleared || 0) + ' pieces moved aside)');
  check(dc.centred && dc.fits && dc.onPad && c2.loose === 0, '1. ... and a ship designed too wide and off-centre is made to fit and stands in the middle (made ' + Math.round(100 * (sbp.fitted || 1)) + '% of its size)'); }
check(!!ship, '1. a ship: the pond built one by itself' + (ship ? ' (in generation ' + shipGen + ')' : ' within ' + gens + ' generations'));
if (ship) { const c = G.designCheck(ship.bp), hold = F.holdOf(ship); check(c.loose === 0, '1. ... and it is sound: ' + c.loose + ' pieces rest on nothing; it carries ' + hold.crew + ' and ' + hold.adds + ' ADDs'); check((G.W.works || []).filter((w) => w.bp && w.bp.type === 'ship').length === 1, '1. ... one ship to a pond'); }
else { const bp = G.blueprintFrom({ seed: 5, type: 'ship', S: 70, hue: 40, spiky: 0, brain: 0.5 }, '2'.repeat(40)); ship = { name: 'Test Ship', looks: '', x: G.W.ww / 2, y: G.W.wh * 0.45, r: 60, by: 'test', hue: 40, sp: 0, bp }; (G.W.works = G.W.works || []).push(ship); }

// ── 2. space ──
const cells = []; for (let i = -4; i <= 4; i++) for (let j = -4; j <= 4; j++) { const c = F.cell(i, j); if (c) cells.push(c); }
const ponds = cells.filter((c) => !c.free), again = F.cell(ponds[0].i, ponds[0].j);
check(ponds.length >= 10 && cells.some((c) => c.free) && !F.cell(0, 0), '2. space: ' + ponds.length + ' ponds and ' + cells.filter((c) => c.free).length + ' empty places within four cells of home, and none where home is');
check(again.name === ponds[0].name && again.hue === ponds[0].hue && F.moodOf(again).join() === F.moodOf(ponds[0]).join(), '2. ... a far pond is the same every time: ' + ponds[0].name + ', whose people are ' + F.moodWords(ponds[0]));
{ const a = F.moodOf(ponds[0]), b = F.moodOf(ponds[1]); check(Math.max(...a.map((v, i) => Math.abs(v - b[i]))) > 0.15, '2. ... and ponds differ: ' + ponds[1].name + '\'s people are ' + F.moodWords(ponds[1])); }

// ── 3. the crossing ──
const home = { seed: G.W.seed, gen: G.W.gen, n: G.saveCre(G.collectWorld()).length,      /* (those alive, and the children already on their way this spring: they are saved as born) */ works: (G.W.works || []).length }, p = ponds[0], key = F.key(p);
const lead = G.leaderOf(ship.sp), builders = G.W.cre.filter((c) => !c.dead && c.builtShip === ship.name);      // who goes is theirs to decide: their leader, then those who built it
const crew = F.crewFor(ship), crewS = crew.map((c) => c.g.s.slice());
const kept0 = (G.collection || []).length;
const out = F.sail(p, crew, ship);
check(!!out && out.length === crew.length && crew.length >= 2 && (!lead || crew[0] === lead) && builders.slice(0, 1).every((b) => crew.indexOf(b) >= 0), '3. the crossing: ' + crew.length + ' went aboard by their own choice: ' + crew.map((c) => '#' + c.id + ' (' + c.crewWhy + ')').join(', '));
let W2 = G.W; const natives = W2.cre.filter((c) => !c.line);
console.log('far:  ' + p.name + ', generation ' + W2.gen + ', ' + natives.length + ' of its own alive in ' + W2.species.filter((s) => !s.extinct && s.n > 0).length + ' kinds; ' + (out || []).length + ' of ours set down');
check(W2.seed !== home.seed && natives.length >= 25 && !!F.visiting && F.visiting.key === key, '3. ... the far pond is another pond, alive with its own (' + natives.length + ')');
{ const m = F.moodOf(p), got = m.map((_, t) => mean(natives.map((c) => c.g.s[t]))); check(Math.max(...m.map((v, t) => Math.abs(v - got[t]))) < 0.12, '3. ... its people have that pond\'s character (on average ' + got.map((v) => v.toFixed(2)).join(' ') + ')'); }
check((out || []).every((c, k) => c.line && c.stranger !== undefined && c.g.s.every((v, t) => Math.abs(v - crewS[k][t]) < 0.006)), '3. ... the crew are strangers there, with the character they had');
check((W2.works || []).filter((w) => w.bp && w.bp.type === 'ship' && w.visitor).length === 1 && F.shipOf() && (G.collection || []).length === kept0, '3. ... their ship stands there, and your collection is untouched');

// ── 4. among them ──
for (let i = 0; i < 300; i++) G.step(0.1);
check(!W2.extinct && W2.cre.length >= 20, '4. among them: the far pond lives on (' + W2.cre.length + ' alive after 30 s)');
check(met.length >= (out || []).length, '4. ... and said what it made of each of the crew: ' + JSON.stringify(met.reduce((o, m) => { o[m.end] = (o[m.end] || 0) + 1; return o; }, {})));
met.slice(0, 2).forEach((m) => console.log('      ' + m.text));

// ── 5. saved while away ──
{ const d = G.collectSave(), fb = d && d.far && d.far.book && d.far.book[key];
  check(!!d && d.seed === home.seed && d.gen === home.gen && G.saveCre(d).length === home.n - crew.length, '5. saved while away: what is saved is the pond at home, without the crew (' + (d ? G.saveCre(d).length : 0) + ' of ' + home.n + ')');
  check(!!fb && !!fb.blob && G.validSave(fb.blob) && fb.blob.seed === W2.seed && JSON.stringify(d).length < 1000000, '5. ... with the far pond beside it (the save is ' + Math.round(JSON.stringify(d).length / 1000) + ' kB)'); }

// ── 5b. two ponds to watch ──
{ const farN = G.W.cre.length, farSeed = G.W.seed, okHome = F.look('home'), hN = G.W.cre.length, hSeed = G.W.seed, shipHere = !!F.shipOf(); for (let i = 0; i < 60; i++) G.step(0.1);
  const okFar = F.look('far');
  check(okHome && hSeed === home.seed && !shipHere && !!F.visiting, '5b. two ponds: while the ship is away you can watch your own pond (' + hN + ' alive there; the ship is not there)');
  check(okFar && G.W.seed === farSeed && G.W.cre.length === farN && !!F.shipOf() && F.here === 'far', '5b. ... and go back to the far pond, which waited as it was (' + G.W.cre.length + ' alive, the ship there)'); }
// ── 6. home ──
W2 = G.W;      // (the far pond was put away and brought back: it is the same pond, held anew)
const theirs = W2.cre.filter((c) => !c.line && !c.dead).sort((a, b) => b.g.s[0] - a.g.s[0])[0]; theirs.aboard = true; const theirS = theirs.g.s.slice();
const stay = W2.cre.filter((c) => !c.dead && c.line).length, farGen = W2.gen, farN = W2.cre.length;
const r = F.home(theirs);
const H = G.W;
check(!!r && H.seed === home.seed && !F.visiting && !F.origin, '6. home: the pond at home is your own (generation ' + H.gen + ')');
check(H.cre.length >= 20 && !!r.brought && r.brought.line && r.brought.stranger !== undefined && r.brought.g.s.every((v, t) => Math.abs(v - theirS[t]) < 0.006), '6. ... ' + H.cre.length + ' alive: those who did not sail, and one of THEIRS who came back with the ship, a stranger here');
check(F.book[key].mine === stay && !!F.book[key].blob && (H.works || []).filter((w) => w.bp && w.bp.type === 'ship').length === 1, '6. ... ' + stay + ' of ours stayed there (the outpost), and the ship is home');

// ── 7. again ──
{ const s2 = F.shipOf(), c2 = F.crewFor(s2).slice(0, 2), o2 = F.sail(p, c2, s2), W3 = G.W;
  check(!!o2 && W3.seed === W2.seed && W3.gen === farGen && W3.cre.filter((c) => c.line).length === stay + o2.length && Math.abs(W3.cre.length - (farN - 1 + o2.length)) <= 0, '7. again: the far pond is as it was left (generation ' + W3.gen + ', ' + (W3.cre.length - o2.length) + ' alive, the ' + stay + ' of ours still there)');
  check((W3.works || []).filter((w) => w.bp && w.bp.type === 'ship').length === 1 && F.book[key].visits === 2, '7. ... with one ship in it, not two; it is the second visit');
  F.home(null);
  check(G.W.seed === home.seed && F.book[key].mine === stay + o2.length, '7. ... and home again, with ' + F.book[key].mine + ' of ours left there'); }

// ── 8. reopened ──
{ const d = JSON.parse(JSON.stringify(G.collectSave())), n = G.W.cre.length; F.book = {}; G.applySave(d);
  check(G.W.seed === home.seed && G.W.cre.length === n && F.book[key] && F.book[key].mine >= stay && !!F.book[key].blob && F.book[key].name === p.name, '8. reopened: a save made at home brings the far ponds back (' + p.name + ': ' + (F.book[key] ? F.book[key].mine : 0) + ' of ours, visited ' + (F.book[key] ? F.book[key].visits : 0) + ' times)');
  check((G.W.works || []).some((w) => w.bp && w.bp.type === 'ship') && G.W.cre.some((c) => c.line), '8. ... and the ship, and the one who came from over there, are still at home'); }

console.log(fails.length ? '\n' + fails.length + ' CHECK(S) FAILED' : '\nALL CHECKS PASSED');
process.exit(fails.length ? 1 : 0);
