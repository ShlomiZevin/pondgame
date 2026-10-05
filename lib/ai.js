// The AI: two small jobs with simple prompts.
//   thing(word)   → what a typed word is made of (properties, a look, a note)
//   ideas(info)   → a few plausible mutations for the species that are alive
// The model is injectable (tests use a fake). With no API key the server answers from the game's own
// offline table, so it always works. Same word, a bit different each time: a word keeps a pool of
// variants, and each request gets one of them (a new one until the pool is full), plus a little jitter.
'use strict';
const { sanitizeSvg } = require('./svg');

const MAX_VARIANTS = 8;
const MODEL = process.env.PRIMORDIA_MODEL || 'claude-haiku-4-5-20251001';

// words that are refused outright (the model is also told to keep things friendly)
const BLOCK = /\b(nazi|hitler|rape|rapist|molest|pedo|porn|nigg|fagg|kill (him|her|them|myself)|suicide|self.?harm|cunt|whore|slut)\w*/i;
function refused(word) { return BLOCK.test(word); }

const THING_SYSTEM = `You invent a substance for a tiny, calm, friendly evolution simulation in a pond. The player typed a word. Decide what that thing does to a pond of microscopic creatures.
Reply with ONE JSON object and nothing else:
{"name": short title-case name (max 24 chars),
 "props": {"nutrition":0..1, "poison":0..1, "heat":-1..1, "light":-1..1, "sticky":0..1, "acid":0..1, "hard":0..1, "spread":0..1,
           "eats":0..1 (it devours the creatures and food that touch its middle, and grows from it),
           "moves":0..1 (it wanders around the pond; if it also eats, it chases),
           "pull":-1..1 (positive draws creatures towards it, negative drives them away),
           "deadly":0..1 (it KILLS a creature the instant it touches its middle: use it when the player says one touch, instantly, deadly, lethal),
           "vault":0..0.7 (a wall, cage, shell or dome that LOCKS AWAY that share of the pond's food inside itself: only creatures with its weakness can get in, and they slowly break it)},
 "weak": if it harms creatures, what kind of creature can wear it down and destroy it: "spike" | "toxin" | "bite" | "glow" | "armor" (pick the one that fits: a jellyfish is weak to bite, a shadow to glow, a fungus to toxin),
 "alive": 0..1 (is it a living thing that grows, shrinks and spreads by itself? plants, fungi, moss, coral, germs, animals: high. fire, rocks, objects, ideas: 0),
 "tag": 0..5 (which kind of food it is when nutrition is above 0: 0 gold, 1 lime, 2 green, 3 blue, 4 violet, 5 pink),
 "hue": 0..360 (its colour), "shape": 0..4, "radius": 50..140, "life": 80..200 (seconds it lasts),
 "note": one friendly sentence of at most 110 characters saying what it does to the pond,
 "look": ONLY if the thing is a BEING (a monster, animal, alien, ghost, person, robot, a plant with a face: anything with a body of its own), describe its body so the game can paint it as a character in its own style; otherwise null:
   {"eyes": 0..5, "mouth": "round"|"beak"|"jaws"|"sucker"|"whiskers", "growths": up to 3 of "legs","fins","spikes","tentacles","feelers","plates","frills","horns","hands","claws" (fins also serve as wings; pick what the word suggests: a handshake monster has "hands"),
    "tail": "none"|"fan"|"fork"|"whip"|"club", "coat": "bare"|"scales"|"fur"|"feathers", "pattern": "plain"|"stripes"|"spots"|"belly"|"rings"|"saddle", "segments": 1..8 (how long its body is), "star": 0 or 3..8 (arms all round, like a starfish), "big_head": true|false, "plump": 0.6..1.5, "glow": true|false, "hue2": 0..360 (its second colour)},
 "svg": a bold cartoon STICKER of the thing (used when it is not a being): <svg viewBox="0 0 96 96"> with 5 to 12 big rounded shapes (circle, ellipse, rect with rx, path, polygon) that fill the box, 2 or 3 bright flat colours that go together plus one lighter highlight shape, every shape with stroke="#07121f" stroke-width="3" stroke-linejoin="round", friendly and instantly recognisable when drawn small on dark water. No text, no thin lines, no background rectangle}
Be inventive and a little surprising, but keep it sensible: fire is hot and bright, honey is sweet food and sticky, soap is mildly poisonous. Most things have only 1 to 3 strong properties. Take the player's words seriously: "a plant that eats everything around it" is alive, eats strongly and does not move; "a shark" eats and moves; "a magnet" pulls; "a scarecrow" pushes away; "a steel wall around the food" is a vault of 0.6 with a weakness; "a predator that kills with one touch" is deadly 0.9, moves, and has a weakness. If the word is rude, hateful or about hurting people, turn it into something harmless like soap.`;

const IDEAS_SYSTEM = `You help a tiny evolution simulation. Given the creatures that are alive in a pond, propose 6 plausible small mutations they could get. Reply with ONE JSON array and nothing else. Each item:
{"name": the mutation itself in two or three words, like "Second eye", "Longer tail", "Spiky back", "Pair of arms" (never the creature's name),
 then ONE or at most TWO of these fields (leave the others out):
 "parts": [{"k": 0..8, "a": angle in radians, "s": 0.5..1.5, "on": index into this item's "segs" or -1}],
 "segs": [{"p": -1 or index of an earlier seg in this item, "a": angle, "d": 0.9..1.4, "s": 0.3..0.6, "n": 1..6, "m": 0 or 1}],
 "chem": [9 numbers between -0.2 and 0.2],
 "size": number between -2 and 2}
Part kinds k: 0 mouth, 1 fin, 2 spike, 3 armour, 4 eye, 5 glowing lamp, 6 poison gland, 7 tail, 8 cilia. A seg is a body segment such as an arm, leg, head or tail; n copies them around the body and m=1 with n=2 mirrors them left and right. Each idea is one small change with at most 3 parts or 2 segs. Make the ideas fit what the creatures already are, and different from each other. Compact JSON, no comments, no explanation.`;

const ORGAN_SYSTEM = `You invent ONE new body part (an organ) for the creatures of a small evolving pond. It joins the pond's gene pool: mutation may grow it, it costs energy, and natural selection decides whether it spreads.
Reply with ONE JSON object and nothing else:
{"name": two or three words, like "Suction Mouth" or "Sun Leaf" (not a name in "have"),
 "note": at most 100 characters: what it does for its owner,
 "fx": {"speed": -1..1, "sense": 0..1, "eat": 0..1, "armor": 0..1, "spike": 0..1, "toxin": 0..1, "photo": 0..1, "glow": 0..1, "heat": 0..1, "cold": 0..1, "poison": 0..1},
 "digest": -1, or 0..5 if it lets its owner eat a new kind of food (0 gold, 1 lime, 2 green, 3 blue, 4 violet, 5 pink),
 "hue": 0..360,
 "svg": a bold little icon of the organ as it sticks out of a round body: <svg viewBox="0 0 32 32">, attached at the LEFT edge and pointing RIGHT, 2 to 5 big simple shapes, bright flat colours, every shape with stroke="#07121f" stroke-width="2", no text}
What the effects mean: speed (negative = slower), sense = notices food and danger from further, eat = reaches food from further, armor = harder to bite, spike = hurts whoever bites it, toxin = tastes terrible, photo = feeds on light like a plant (and makes its owner slow), glow = makes light, heat/cold/poison = resists that.
Use only 1 to 3 effects and leave the rest at 0; a trade-off is welcome (armor with negative speed). Make it an answer to what is happening in this pond, above all to the "pressures" listed (what is hurting the creatures, what food nobody can eat yet, cold, dark, hunters): the organ should help with one of them. Be inventive and a little surprising.`;

const EVENT_SYSTEM = `A player of a small, friendly evolution simulation typed something they want to HAPPEN to their pond of microscopic creatures. Turn it into an event the simulation can run.
Reply with ONE JSON object and nothing else:
{"name": short title (max 28 chars), "note": one sentence, at most 120 characters, saying what happens,
 "hue": 0..360 (the colour of the flash), "shake": 0..1,
 "kill": {"share": 0..0.8, "who": "random"|"biggest"|"smallest"|"fastest"|"slowest"|"common"|"rare"|"shallows"|"deep"|"ugliest"|"blind" (those with no eyes)|"legless"|"unarmoured"|"bare" (those with no fur, feathers or scales)},
 "gift": optional {"trait": one of "legs","fins","spikes","tentacles","feelers","plates","frills","horns","hands","eyes","jaws","beak","tail","shell","glow","poison","scales","fur","feathers","neck","big head","longer body","star body", "share": 0.05..1} (that share of all living creatures grows it AT ONCE: use it for "everyone grows wings" (fins), "give them hands", "they all get fur"),
 "water": optional {"oxygen": -1..1, "murk": -1..1, "rich": -1..1, "warm": -1..1} (changes the pond's water FOR GOOD: fresher or stale, clearer or muddier, more or less fertile, warmer or cooler),
 "admire": optional, one of the gift traits (from now on the pond finds it beautiful, so mates prefer it),
 "things": 1..5 (how many copies of "thing" appear, for a swarm, a shower, an invasion),
 "poison": 0..1 (the WHOLE pond's water is poisoned: every creature that is not poison-proof loses energy everywhere),
 "temp": -1..1 (colder or hotter water), "light": -1..1 (darker or brighter), "food": 0..3 (how much food grows; 1 = unchanged), "mutate": 1..4 (how wild new children are),
 "duration": 10..150 (seconds the temp/light/food/mutate change lasts),
 "current": 0..1 (a current that sweeps everything along),
 "feed": {"count": 0..200, "tag": 0..5} (food that rains down at once),
 "fx": what fills the water while it lasts: "snow" | "bubbles" | "embers" | "spores" | "rain" | "stars" | "" (an ice age snows, a heat wave has embers, a magic night has stars),
 "thing": optional: something left behind in the water, {"name", "props": {"nutrition","poison","heat","light","sticky","acid","hard","spread","eats","moves","pull","vault"}, "alive": 0..1, "weak": "spike"|"toxin"|"bite"|"glow"|"armor", "hue", "note"}}
Use only what fits; leave the rest at 0 (food and mutate at 1). IMPORTANT: when the words are about the WHOLE pond or world ("poisoned pond", "ice age", "the lights go out", "a drought"), use the pond-wide fields (poison, temp, light, food, mutate, current) with a long duration, and do NOT leave a "thing": a thing sits in one place. Leave a "thing" only when the words describe an object, a creature or a place. Take the words seriously and be inventive: "aliens take the biggest" kills the biggest; "an ice age" is long and cold and dark with little food; "a jellyfish invasion" leaves a moving, eating thing behind. If the player describes an OBSTACLE or a challenge for the creatures ("all the food is behind a steel wall", "the food is frozen in ice", "a cage around the algae"), do not kill anyone: leave a thing with "vault" 0.5 to 0.7 and a fitting "weak", so the pond has to evolve a way in. However absurd the words, find what they would do. Life should usually survive: kill more than half only for a true catastrophe. If the words are rude or hateful, make it a harmless rain of food.`;

const STORY_SYSTEM = `You are the narrator of a small evolving pond, speaking to a curious player. You get measured facts: what changed between two points in time, which creatures live there now, new organs, discoveries, events and things the player added.
Reply with ONE JSON object and nothing else: {"title": at most 5 words, "text": two short sentences, at most 230 characters in all}
Say WHAT changed and WHY it helps those creatures survive here (or why something is dying out), in plain, lively words. Use the real names and numbers you were given; never invent a fact. If the player added something or caused an event, say how life answered it. No greetings, no questions.`;

const DESIGN_SYSTEM = `You invent ONE new KIND of body part for the animals of a small evolving pond, seen from above. The pond already knows legs, fins, spikes, tentacles, feelers, armour plates, frills and horns; yours must be something else with a bold, recognisable silhouette (a wing, a sail, antlers, a lure, a claw-club, a comb, a hook, a paddle, a drill, a parasol, a net, a rattle... or stranger). The game draws it in each animal's own colours and the genes decide where it sits and how big it is.
Reply with ONE JSON object and nothing else:
{"name": 1-2 words, a noun ("Sail"), "adj": one word for an animal that has it ("Sailed"), "note": what it does for its owner, at most 90 characters,
 "place": "sides" (a mirrored pair) | "back" (one, lying along the back) | "head" (a pair at the head),
 "motion": "flap" | "sway" | "pulse" | "bristle" (it flares when the animal is frightened) | "still",
 "colour": "accent" | "body" | "pale" | "dark" | "glow",
 "pts": the outline, 5 to 16 points [x, y]. x runs from 0 (where it joins the body) to 1 (its tip); y from -0.5 to 0.5 across it. Go round once: start near [0, -0.08], out along one edge to the tip, back along the other edge, end near [0, 0.08]. Make the shape say what it is.
 "smooth": true for soft curved parts, false for hard angular ones,
 "ribs": up to 5 inner lines [x1, y1, x2, y2] (veins, struts, teeth), "dots": up to 3 [x, y, r] with r 0.04..0.15 (a bulb, an eye-spot, a knob),
 "fx": what it changes, each from -0.3 to 0.5: "speed", "agility", "reach", "senses", "armour", "attack". One or two are positive and at least one is negative: nothing is free.}
You are told what the pond is up against, its water, its commonest bodies and what is admired there: invent something that fits. Never repeat a name from "have".`;

const JUDGE_SYSTEM = `You are the judge of looks in a small evolving pond. Creatures there grow their bodies from genes; you are told, in plain facts, what each kind's body is like, and what this pond currently admires.
Reply with ONE JSON object and nothing else: {"scores": [{"id": the creature's id, "score": 0..1, "why": at most 12 words}]}
Score how STRIKING and memorable each one would be to look at: a clear face, a bold silhouette, parts that go together, contrast, something surprising. Dull, featureless or cluttered bodies score low. Use the whole range from 0.1 to 0.95 and do not give two creatures the same score. Lean a little towards what this pond admires, but your own eye decides. "why" is your verdict in lively plain words, about that creature's actual features.`;

const SKIN_SYSTEM = `You are the artist of a small evolution game. Draw ONE creature: a kind of tiny pond animal that has just evolved. You get its real traits; the drawing must show them, so the player can see what it has become.
Reply with ONE JSON object and nothing else:
{"look": one sentence, at most 120 characters, describing how it looks,
 "svg": the creature: <svg viewBox="0 0 96 96">, seen from above, its head at the TOP and its tail (or back end) at the BOTTOM, left and right sides mirrored, centred, filling most of the box}
Rules for the drawing: 8 to 18 bold, simple shapes (circle, ellipse, path, polygon, line); bright flat colours built around the given main colour; every shape with stroke="#07121f" stroke-width="2"; big friendly eyes with white and a dark pupil (exactly as many as the traits say); no text, no background, nothing outside the creature. Make it charming, strange and clearly an animal: every listed trait must be visible (limbs, tail, spikes, armour, lamp, leaves...). MOST IMPORTANT: "stage" says what kind of animal this is. Draw THAT kind of animal, unmistakably: a microbe is one simple round cell; a many-celled animal is a soft cluster or worm; a FISH has a streamlined body, a tail fin and side fins; an AMPHIBIAN has four legs with feet and a tail, like a newt; a LAND ANIMAL has sturdy legs, a clear head and neck, fur or scales; a THINKER stands upright with a big head, two arms and hands. "has" lists its great inventions (backbone, jaws, lungs, warm blood, hands): show them. If "cameFrom" describes the kind it evolved from, keep a family resemblance but make the new traits obvious. If "isNewForm" is true, it is the same kind grown more elaborate.`;

function extractJson(text) {
  text = String(text || '');
  const a = text.indexOf('{'), b = text.indexOf('['), start = a >= 0 && (b < 0 || a < b) ? a : b;
  if (start < 0) return null;
  const open = text[start], close = open === '{' ? '}' : ']';
  const end = text.lastIndexOf(close);
  if (end > start) { try { return JSON.parse(text.slice(start, end + 1)); } catch { /* maybe cut off: try to save what is whole */ } }
  if (open !== '[') return null;
  // a list that was cut off mid-way: keep the items that are complete
  let cut = text.lastIndexOf('}');
  for (let tries = 0; cut > start && tries < 40; tries++) {
    try { return JSON.parse(text.slice(start, cut + 1) + ']'); } catch { cut = text.lastIndexOf('}', cut - 1); }
  }
  return null;
}

const num = (v, a, b, d) => { v = +v; return isFinite(v) ? Math.max(a, Math.min(b, v)) : d; };

/** Whatever came back becomes a safe, in-range thing. Returns null when it is not usable. */
function cleanThing(raw, word) {
  if (!raw || typeof raw !== 'object') return null;
  const p = raw.props && typeof raw.props === 'object' ? raw.props : {};
  const props = {
    nutrition: num(p.nutrition, 0, 1, 0), poison: num(p.poison, 0, 1, 0), heat: num(p.heat, -1, 1, 0), light: num(p.light, -1, 1, 0),
    sticky: num(p.sticky, 0, 1, 0), acid: num(p.acid, 0, 1, 0), hard: num(p.hard, 0, 1, 0), spread: num(p.spread, 0, 1, 0),
    eats: num(p.eats, 0, 1, 0), moves: num(p.moves, 0, 1, 0), pull: num(p.pull, -1, 1, 0), vault: num(p.vault, 0, 0.7, 0), deadly: num(p.deadly, 0, 1, 0),
  };
  const sum = Object.values(props).reduce((a, b) => a + Math.abs(b), 0);
  if (sum < 0.15) return null;   // it does nothing: not a usable answer
  return {
    name: String(raw.name || word || 'Thing').replace(/[<>"]/g, '').slice(0, 28),
    props,
    tag: Math.round(num(raw.tag, 0, 5, 2)),
    hue: num(raw.hue, 0, 360, 200), shape: Math.round(num(raw.shape, 0, 4, 0)),
    radius: num(raw.radius, 40, 150, 80), life: num(raw.life, 60, 240, 120),
    note: String(raw.note || '').replace(/[<>]/g, '').slice(0, 140),
    svg: raw.svg ? sanitizeSvg(raw.svg) : '',
    alive: num(raw.alive, 0, 1, 0),
    look: raw.look && typeof raw.look === 'object' ? JSON.parse(JSON.stringify(raw.look).slice(0, 600).replace(/[<>]/g, '') || 'null') : null,
    weak: ['spike', 'toxin', 'bite', 'glow', 'armor'].includes(raw.weak) ? raw.weak : '',
  };
}

/** A little wobble so the same thing is never exactly the same. */
function jitter(t, rand) {
  const j = (v, lo, hi, amt) => Math.max(lo, Math.min(hi, v + (rand() - 0.5) * 2 * amt));
  const o = JSON.parse(JSON.stringify(t));
  for (const k of Object.keys(o.props)) if (o.props[k] !== 0) o.props[k] = j(o.props[k], k === 'heat' || k === 'light' || k === 'pull' ? -1 : 0, 1, 0.07);
  o.hue = (o.hue + (rand() - 0.5) * 24 + 360) % 360;
  o.radius = j(o.radius, 40, 150, 8); o.life = j(o.life, 60, 240, 12);
  return o;
}

/** parts/segs/chem of an idea, in range */
function cleanIdea(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const idea = { name: String(raw.name || raw.title || raw.mutation || '').replace(/[<>"]/g, '').trim().slice(0, 28) };
  if (Array.isArray(raw.segs)) {
    idea.segs = raw.segs.slice(0, 3).map((q, i) => ({
      p: Math.round(num(q.p, -1, i - 1, -1)), a: num(q.a, -6.3, 6.3, 0), d: num(q.d, 0.9, 1.4, 1.1), s: num(q.s, 0.3, 0.6, 0.4),
      n: Math.round(num(q.n, 1, 6, 1)), m: q.m ? 1 : 0,
    }));
  }
  if (Array.isArray(raw.parts)) {
    const ns = (idea.segs || []).length;
    idea.parts = raw.parts.slice(0, 4).map((q) => ({
      k: Math.round(num(q.k, 0, 8, 1)), a: num(q.a, -6.3, 6.3, 0), s: num(q.s, 0.4, 1.8, 1),
      on: ns && Math.round(num(q.on, -1, ns - 1, -1)) >= 0 ? Math.round(num(q.on, -1, ns - 1, -1)) : -1,
    }));
  }
  if (Array.isArray(raw.chem)) idea.chem = raw.chem.slice(0, 9).map((v) => num(v, -0.2, 0.2, 0));
  if (raw.size !== undefined) idea.size = num(raw.size, -2, 2, 0);
  if (!idea.segs && !idea.parts && !idea.chem && !idea.size) return null;
  // a model sometimes forgets the name: say what the idea is
  if (!idea.name) {
    const PART = ['mouth', 'fin', 'spike', 'armour', 'eye', 'lamp', 'gland', 'tail', 'cilia'];
    idea.name = idea.segs ? (idea.segs[0].n >= 3 ? 'New tentacles' : idea.segs[0].m ? 'New limbs' : 'New body part')
      : idea.parts && idea.parts.length ? 'New ' + PART[idea.parts[0].k]
      : idea.chem ? 'New taste' : idea.size > 0 ? 'Bigger body' : 'Smaller body';
  }
  return idea;
}

// models: { id: { label, call } }. A single callModel (tests, simple setups) becomes the one model "default".
const FX = ['speed', 'sense', 'eat', 'armor', 'spike', 'toxin', 'photo', 'glow', 'heat', 'cold', 'poison'];
function cleanOrgan(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const f = raw.fx && typeof raw.fx === 'object' ? raw.fx : {};
  const fx = {}; let sum = 0;
  for (const k of FX) { fx[k] = k === 'speed' ? num(f[k], -1, 1, 0) : num(f[k], 0, 1, 0); sum += Math.abs(fx[k]); }
  let digest = Math.round(num(raw.digest, -1, 5, -1));
  if (sum < 0.15 && digest < 0) return null;
  return { name: String(raw.name || 'New organ').replace(/[<>"]/g, '').slice(0, 26), note: String(raw.note || '').replace(/[<>]/g, '').slice(0, 120), fx, digest, hue: num(raw.hue, 0, 360, 200), svg: raw.svg ? sanitizeSvg(raw.svg) : '' };
}
const WHO = ['random', 'biggest', 'smallest', 'fastest', 'slowest', 'common', 'rare', 'shallows', 'deep', 'ugliest', 'blind', 'legless', 'unarmoured', 'bare'];
const GIFTS = ['legs', 'fins', 'spikes', 'tentacles', 'feelers', 'plates', 'frills', 'horns', 'eyes', 'jaws', 'beak', 'tail', 'shell', 'glow', 'poison', 'scales', 'fur', 'feathers', 'neck', 'big head', 'longer body', 'star body', 'hands'];
function cleanEvent(raw, text) {
  if (!raw || typeof raw !== 'object') return null;
  const k = raw.kill && typeof raw.kill === 'object' ? raw.kill : {}, f = raw.feed && typeof raw.feed === 'object' ? raw.feed : {};
  const ev = {
    name: String(raw.name || text || 'Something happened').replace(/[<>"]/g, '').slice(0, 30), note: String(raw.note || '').replace(/[<>]/g, '').slice(0, 140),
    hue: num(raw.hue, 0, 360, 200), shake: num(raw.shake, 0, 1, 0.3),
    kill: { share: num(k.share, 0, 0.8, 0), who: WHO.includes(k.who) ? k.who : 'random' },
    temp: num(raw.temp, -1, 1, 0), light: num(raw.light, -1, 1, 0), food: num(raw.food, 0, 3, 1), mutate: num(raw.mutate, 1, 4, 1),
    poison: num(raw.poison, 0, 1, 0),
    duration: num(raw.duration, 10, 150, 45), current: num(raw.current, 0, 1, 0),
    feed: { count: Math.round(num(f.count, 0, 200, 0)), tag: Math.round(num(f.tag, 0, 5, 2)) },
    fx: ['snow', 'bubbles', 'embers', 'spores', 'rain', 'stars'].includes(raw.fx) ? raw.fx : '',
  };
  if (raw.gift && typeof raw.gift === 'object' && GIFTS.includes(String(raw.gift.trait).toLowerCase())) ev.gift = { trait: String(raw.gift.trait).toLowerCase(), share: num(raw.gift.share, 0.05, 1, 0.5) };
  if (raw.water && typeof raw.water === 'object') ev.water = { oxygen: num(raw.water.oxygen, -1, 1, 0), murk: num(raw.water.murk, -1, 1, 0), rich: num(raw.water.rich, -1, 1, 0), warm: num(raw.water.warm, -1, 1, 0) };
  if (GIFTS.includes(String(raw.admire || '').toLowerCase())) ev.admire = String(raw.admire).toLowerCase();
  ev.things = Math.round(num(raw.things, 1, 5, 1));
  if (raw.thing && typeof raw.thing === 'object') { const t = cleanThing(raw.thing, raw.thing.name || text); if (t) ev.thing = t; }
  // an obstacle is a challenge, never a death sentence
  ev.food = Math.max(0.3, ev.food);
  if (ev.thing && ev.thing.props.vault > 0.2) { ev.kill.share = 0; ev.food = Math.max(1, ev.food); ev.temp = 0; ev.light = Math.max(0, ev.light); }
  return ev;
}
function cleanSkin(raw) {
  if (!raw || typeof raw !== 'object' || !raw.svg) return null;
  const svg = sanitizeSvg(raw.svg);
  if (!svg || svg.length < 150) return null;
  return { svg, look: String(raw.look || '').replace(/[<>]/g, '').slice(0, 160) };
}
function cleanDesign(raw) {
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.pts)) return null;
  const n = (v, lo, hi) => Math.max(lo, Math.min(hi, Number(v)));
  const pts = raw.pts.filter((p) => Array.isArray(p) && Number.isFinite(Number(p[0])) && Number.isFinite(Number(p[1]))).slice(0, 18).map((p) => [+n(p[0], 0, 1.1).toFixed(3), +n(p[1], -0.6, 0.6).toFixed(3)]);
  if (pts.length < 3) return null;
  const four = (q, k) => Array.isArray(q) && q.length >= k && q.slice(0, k).every((v) => Number.isFinite(Number(v)));
  const fx = {}; let pos = 0;
  for (const k of ['speed', 'agility', 'reach', 'senses', 'armour', 'attack']) { const v = Number(raw.fx && raw.fx[k]); fx[k] = Number.isFinite(v) ? +n(v, -0.3, 0.5).toFixed(2) : 0; if (fx[k] > 0) pos += fx[k]; }
  if (pos < 0.1) return null;
  const pick = (v, list, d) => (list.includes(v) ? v : d);
  return {
    name: String(raw.name || '').replace(/[<>"]/g, '').trim().slice(0, 22) || 'New part', adj: String(raw.adj || '').replace(/[^A-Za-z\-]/g, '').slice(0, 16), note: String(raw.note || '').replace(/[<>]/g, '').slice(0, 110),
    place: pick(raw.place, ['sides', 'back', 'head'], 'sides'), motion: pick(raw.motion, ['flap', 'sway', 'pulse', 'bristle', 'still'], 'sway'), colour: pick(raw.colour, ['accent', 'body', 'pale', 'dark', 'glow'], 'accent'),
    pts, smooth: raw.smooth !== false,
    ribs: (Array.isArray(raw.ribs) ? raw.ribs : []).filter((q) => four(q, 4)).slice(0, 6).map((q) => [+n(q[0], 0, 1.1).toFixed(3), +n(q[1], -0.6, 0.6).toFixed(3), +n(q[2], 0, 1.1).toFixed(3), +n(q[3], -0.6, 0.6).toFixed(3)]),
    dots: (Array.isArray(raw.dots) ? raw.dots : []).filter((q) => four(q, 3)).slice(0, 3).map((q) => [+n(q[0], 0, 1.1).toFixed(3), +n(q[1], -0.6, 0.6).toFixed(3), +n(q[2], 0.03, 0.16).toFixed(3)]),
    fx,
  };
}

function cleanJudge(raw, ids) {
  const list = raw && Array.isArray(raw.scores) ? raw.scores : [];
  const out = [];
  for (const q of list.slice(0, 6)) {
    const id = Number(q && q.id), score = Number(q && q.score);
    if (!Number.isFinite(id) || !Number.isFinite(score) || (ids && !ids.includes(id))) continue;
    out.push({ id, score: Math.max(0, Math.min(1, score)), why: String(q.why || '').replace(/[<>]/g, '').slice(0, 140) });
  }
  return out.length ? out : null;
}

function cleanStory(raw) {
  if (!raw || typeof raw !== 'object' || !raw.text) return null;
  const whole = function (t, max) { t = String(t).replace(/[<>]/g, '').trim(); if (t.length <= max) return t; const cut = t.slice(0, max); const at = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '), cut.lastIndexOf('.')); return at > max * 0.5 ? cut.slice(0, at + 1) : cut.replace(/\s+\S*$/, '') + '…'; };
  return { title: String(raw.title || '').replace(/[<>]/g, '').slice(0, 44), text: whole(raw.text, 300) };
}

function createAi({ store, callModel, models, defaultModel, offline, rand }) {
  rand = rand || Math.random;
  models = models || (callModel ? { default: { label: 'Default', call: callModel } } : {});
  const ids = Object.keys(models);
  defaultModel = defaultModel && models[defaultModel] ? defaultModel : ids[0] || null;
  /** The model that was asked for, if this server has it; otherwise the default one. */
  // over the daily cap nobody is picked, so every job quietly answers from the built-in table instead
  const pick = (id) => { if (!underDailyCap()) return null; const use = id && models[id] ? id : defaultModel; return use ? { id: use, call: models[use].call } : null; };
  const norm = (w) => String(w || '').toLowerCase().replace(/[^a-z0-9 \-]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80);

  async function generateThing(word, m) {
    const text = await m.call({ system: THING_SYSTEM, user: 'The word: ' + JSON.stringify(word), temperature: 1.0, maxTokens: 900 });
    return cleanThing(extractJson(text), word);
  }

  // ── the library: every decision the AI makes is kept, and most requests are answered from it ──
  // Once there is enough to choose from, a request only sometimes makes something new (REUSE of the time it does not).
  const REUSE = Math.max(0, Math.min(0.95, Number(process.env.PRIMORDIA_REUSE) || 0.7));
  const lib = (kind) => store.get('lib', kind) || { items: [] };
  const keep = (kind, item, cap) => { const L = lib(kind); L.items.push(item); if (L.items.length > cap) L.items.shift(); store.set('lib', kind, L); };
  const any = (arr) => arr[Math.floor(rand() * arr.length)];

  return {
    refused,
    /** what the library holds: for browsing, and for seeing how much is reused */
    library() {
      const words = store.keys('word');
      return { things: { words: words.length, sample: words.slice(0, 60) }, organs: lib('organs').items, skins: lib('skins').items.length, ideas: lib('ideas').items.length, events: lib('events').items.slice(-60), reuse: REUSE };
    },
    models: () => ids.map((id) => ({ id, label: models[id].label })),
    defaultModel,
    async thing(rawWord, opts) {
      opts = opts || {};
      const word = String(rawWord || '').trim().slice(0, 80);
      if (!word) return { error: 'empty' };
      if (refused(word)) return { error: 'refused' };
      const m = pick(opts.model);
      // each model keeps its own variants of a word, so choosing another model really changes the pond
      const key = (m ? m.id : 'none') + '|' + (norm(word) || 'thing');
      const rec = store.get('word', key) || { variants: [] };
      let source = 'cache';
      let t = null;
      if ((rec.variants.length < MAX_VARIANTS || rand() < 0.1) && m && (!opts.canGenerate || opts.canGenerate())) {
        try { t = await generateThing(word, m); } catch (err) { t = null; if (opts.onError) opts.onError(err); }
        if (t) { source = 'ai'; rec.variants.push(t); if (rec.variants.length > MAX_VARIANTS + 2) rec.variants.shift(); store.set('word', key, rec); }
      }
      if (!t && rec.variants.length) t = rec.variants[Math.floor(rand() * rec.variants.length)];
      if (!t) {
        // no model, no variants: the game's own table answers, with its own wobble
        const o = offline ? await offline('thing', word) : null;
        if (!o) return { error: 'unavailable' };
        return { thing: Object.assign(jitter(o, rand), { name: word.charAt(0).toUpperCase() + word.slice(1), source: 'offline' }) };
      }
      const out = jitter(t, rand);
      out.name = t.name; out.source = source; out.model = m ? m.id : '';
      return { thing: out, usd: source === 'ai' ? spent() : 0 };
    },
    /** A new kind of body part for a pond. Kept in the library; a pond is often handed one invented earlier that it does not have yet. */
    async design(info, opts) {
      opts = opts || {};
      const have = Array.isArray(info && info.have) ? info.have.map((x) => String(x).toLowerCase()) : [];
      const known = lib('designs').items.filter((x) => !have.includes(x.name.toLowerCase()));
      if (known.length >= 6 && rand() < REUSE) return { design: any(known), source: 'library' };
      const m = pick(opts.model);
      let d = null;
      if (m && (!opts.canGenerate || opts.canGenerate())) {
        try { d = cleanDesign(extractJson(await m.call({ system: DESIGN_SYSTEM, user: JSON.stringify(info || {}).slice(0, 1500), temperature: 1.0, maxTokens: 700 }))); }
        catch (err) { d = null; if (opts.onError) opts.onError(err); }
      }
      if (d && !have.includes(d.name.toLowerCase())) { d.by = m.id; keep('designs', d, 400); return { design: d, source: 'ai', usd: spent() }; }
      if (known.length) return { design: any(known), source: 'library' };
      return { design: null, source: 'none' };
    },
    /** How striking each kind of creature looks: a verdict that becomes part of its charm. A body already judged is not judged again. */
    async judge(info, opts) {
      opts = opts || {};
      const list = (Array.isArray(info && info.creatures) ? info.creatures : []).slice(0, 4).map((c) => ({ id: Number(c && c.id), name: String((c && c.name) || '').slice(0, 40), kind: String((c && c.kind) || '').slice(0, 60), body: String((c && c.body) || '').slice(0, 300) })).filter((c) => Number.isFinite(c.id) && c.body);
      if (!list.length) return { judge: null, source: 'none' };
      const keyOf = (c) => norm(c.kind + ' ' + c.body).slice(0, 200);
      const known = list.map((c) => store.get('judge', keyOf(c)));
      if (known.every(Boolean)) return { judge: { scores: list.map((c, i) => ({ id: c.id, score: known[i].score, why: known[i].why })) }, source: 'library' };
      const m = pick(opts.model);
      let scores = null;
      if (m && (!opts.canGenerate || opts.canGenerate())) {
        try { scores = cleanJudge(extractJson(await m.call({ system: JUDGE_SYSTEM, user: JSON.stringify({ admired: String((info && info.admired) || '').slice(0, 200), creatures: list }), temperature: 0.9, maxTokens: 400 })), list.map((c) => c.id)); }
        catch (err) { scores = null; if (opts.onError) opts.onError(err); }
      }
      if (!scores) return { judge: null, source: 'none' };
      for (const s of scores) { const c = list.find((x) => x.id === s.id); if (c) store.set('judge', keyOf(c), { score: s.score, why: s.why, by: m.id }); }
      return { judge: { scores }, source: 'ai', usd: spent() };
    },
    /** How a species looks: drawn from its real traits. */
    async skin(info, opts) {
      opts = opts || {};
      const kept = lib('skins').items;
      // an old drawing is only reused when there are many, and then only sometimes: a new kind deserves its own face
      if (kept.length >= 30 && rand() < REUSE * 0.35) return { skin: any(kept), source: 'library' };
      const artist = process.env.PRIMORDIA_ARTIST || 'claude-sonnet-5-5';
      const m = pick(models[artist] ? artist : opts.model);
      let s = null;
      if (m && (!opts.canGenerate || opts.canGenerate())) {
        try { s = cleanSkin(extractJson(await m.call({ system: SKIN_SYSTEM, user: JSON.stringify(info || {}).slice(0, 1600), temperature: 1.0, maxTokens: 2200 }))); }
        catch (err) { s = null; if (opts.onError) opts.onError(err); }
      }
      if (s) { s.by = m.id; keep('skins', s, 300); return { skin: s, source: 'ai', usd: spent() }; }
      return { skin: null, source: 'none' };
    },
    /** A new organ for this pond. */
    async organ(info, opts) {
      opts = opts || {};
      const have = Array.isArray(info && info.have) ? info.have.map((x) => String(x).toLowerCase()) : [];
      const known = lib('organs').items.filter((x) => !have.includes(x.name.toLowerCase()));
      if (known.length >= 8 && rand() < REUSE) return { organ: any(known), source: 'library' };
      const m = pick(opts.model);
      let o = null;
      if (m && (!opts.canGenerate || opts.canGenerate())) {
        try { o = cleanOrgan(extractJson(await m.call({ system: ORGAN_SYSTEM, user: 'The pond now: ' + JSON.stringify(info || {}).slice(0, 1800), temperature: 1.0, maxTokens: 900 }))); }
        catch (err) { o = null; if (opts.onError) opts.onError(err); }
      }
      if (o) { o.by = m.id; keep('organs', o, 400); return { organ: o, source: 'ai', usd: spent() }; }
      if (known.length) return { organ: any(known), source: 'library' };
      const off = offline ? await offline('organ', info) : null;
      return off ? { organ: off, source: 'offline' } : { error: 'unavailable' };
    },
    /** Free text → something that happens to the pond. */
    async event(text, opts) {
      opts = opts || {};
      text = String(text || '').trim().slice(0, 90);
      if (!text) return { error: 'empty' };
      if (refused(text)) return { error: 'refused' };
      const ekey = 'ev:' + text.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
      const seen = store.get('word', ekey) || { variants: [] };
      if (seen.variants.length >= 4 || (seen.variants.length && rand() < REUSE * 0.6)) return { event: any(seen.variants), source: 'library' };
      const m = pick(opts.model);
      let ev = null;
      if (m && (!opts.canGenerate || opts.canGenerate())) {
        try { ev = cleanEvent(extractJson(await m.call({ system: EVENT_SYSTEM, user: 'The player typed: ' + JSON.stringify(text), temperature: 1.0, maxTokens: 900 })), text); }
        catch (err) { ev = null; if (opts.onError) opts.onError(err); }
      }
      if (ev) { seen.variants.push(ev); store.set('word', ekey, seen); keep('events', { text, name: ev.name, note: ev.note }, 300); return { event: ev, source: 'ai', model: m.id, usd: spent() }; }
      if (seen.variants.length) return { event: any(seen.variants), source: 'library' };
      const off = offline ? await offline('event', text) : null;
      return off ? { event: off, source: 'offline' } : { error: 'unavailable' };
    },
    /** The measured facts, told as a short story. */
    async story(info, opts) {
      opts = opts || {};
      const m = pick(opts.model);
      let s = null;
      if (m && (!opts.canGenerate || opts.canGenerate())) {
        try { s = cleanStory(extractJson(await m.call({ system: STORY_SYSTEM, user: JSON.stringify(info || {}).slice(0, 2600), temperature: 0.8, maxTokens: 500 }))); }
        catch (err) { s = null; if (opts.onError) opts.onError(err); }
      }
      if (s) { s.by = m.id; return { story: s, source: 'ai', usd: spent() }; }
      const off = offline ? await offline('story', info) : null;
      return off ? { story: off, source: 'offline' } : { error: 'unavailable' };
    },
    async ideas(info, opts) {
      opts = opts || {};
      let list = [];
      const sets = lib('ideas').items;
      if (sets.length >= 6 && rand() < REUSE) return { ideas: any(sets), source: 'library' };
      const m = pick(opts.model);
      if (m && (!opts.canGenerate || opts.canGenerate())) {
        try {
          const species = Array.isArray(info && info.species) ? info.species.slice(0, 8).map((s) => ({ name: String(s.name || '').slice(0, 40), n: num(s.n, 0, 9999, 0) })) : [];
          const text = await m.call({ system: IDEAS_SYSTEM, user: 'Creatures alive now (generation ' + num(info && info.gen, 0, 1e6, 0) + '): ' + JSON.stringify(species), temperature: 1.0, maxTokens: 1800 });
          const arr = extractJson(text);
          if (Array.isArray(arr)) list = arr.map(cleanIdea).filter(Boolean).slice(0, 8);
        } catch (err) { list = []; if (opts.onError) opts.onError(err); }
      }
      let source = 'ai';
      if (list.length) keep('ideas', list, 120);
      else if (sets.length) return { ideas: any(sets), source: 'library' };
      if (!list.length && offline) { list = (await offline('mutation-ideas', info)) || []; source = 'offline'; }
      return { ideas: list, source, usd: source === 'ai' ? spent() : 0 };
    },
  };
}

// ── the meter: every real model call is counted, with the tokens the provider says it used ──
const usage = { day: '', calls: 0, byModel: {} };
function today() { return new Date().toISOString().slice(0, 10); }
let lastUsd = null;
// ── the books ──
// US dollars per million tokens: [input, output, cached input]. Checked on 2026-10-05 against the providers' own pages:
//   https://platform.claude.com/docs/en/about-claude/pricing   and   https://developers.openai.com/api/docs/pricing
// Add or correct a price without touching code: PRIMORDIA_PRICES='{"model-id":[in,out,cachedIn]}'.
// A model with no price is counted in tokens and reported as unpriced; its cost is never guessed.
const PRICES_CHECKED = '2026-10-05';
const PRICES = Object.assign({
  'claude-haiku-4-5-20251001': [1, 5, 0.1],
  'claude-sonnet-5-5': [2, 10, 0.2],
  'gpt-5.4-mini': [0.75, 4.5, 0.075],
  'gpt-5.4-nano': [0.2, 1.25, 0.02],
  'gpt-5.6-terra': [2, 12, 0.2],
  'gpt-6-luna': [0.1, 0.5, 0.01],
}, (() => { try { return JSON.parse(process.env.PRIMORDIA_PRICES || '{}'); } catch { return {}; } })());
// every call is written into books that outlive the server: all time, by model and by day
let books = { since: today(), byModel: {}, byDay: {} }, bookStore = null;
function attachBooks(store) {
  bookStore = store;
  const b = store.get('books', 'all');
  if (b && b.byModel && b.byDay) books = b;
}
function book(model, usd, inTok, outTok, cached) {
  const m = books.byModel[model] || (books.byModel[model] = { calls: 0, input: 0, output: 0, cached: 0, usd: 0, unpricedCalls: 0 });
  m.calls++; m.input += inTok || 0; m.output += outTok || 0; m.cached += cached || 0;
  if (usd === null) m.unpricedCalls++; else m.usd = +(m.usd + usd).toFixed(6);
  const d = books.byDay[today()] || (books.byDay[today()] = { calls: 0, usd: 0 });
  d.calls++; if (usd !== null) d.usd = +(d.usd + usd).toFixed(6);
  const days = Object.keys(books.byDay).sort(); while (days.length > 120) delete books.byDay[days.shift()];
  if (bookStore) { try { bookStore.set('books', 'all', books); } catch { /* the books are best effort; the call itself must not fail */ } }
}
/** a model call: tokens in (of which `cached` were read from the provider's cache, at the cheaper rate) and out */
function meter(model, inTok, outTok, cached) {
  if (usage.day !== today()) { usage.day = today(); usage.calls = 0; usage.byModel = {}; }
  usage.calls++;
  inTok = inTok || 0; outTok = outTok || 0; cached = Math.min(cached || 0, inTok);
  const m = usage.byModel[model] || (usage.byModel[model] = { calls: 0, input: 0, output: 0, cached: 0, usd: 0, unpricedCalls: 0 });
  m.calls++; m.input += inTok; m.output += outTok; m.cached += cached;
  const p = PRICES[model];
  lastUsd = p ? ((inTok - cached) * p[0] + cached * (p[2] === undefined ? p[0] * 0.1 : p[2]) + outTok * p[1]) / 1e6 : null;      // null = this model has no price set
  if (lastUsd === null) m.unpricedCalls++; else m.usd = +(m.usd + lastUsd).toFixed(6);
  book(model, lastUsd, inTok, outTok, cached);
}
/** a call that is billed in dollars directly (a sound: the amount is the one the provider reports for that call) */
function meterUsd(model, usd) {
  if (usage.day !== today()) { usage.day = today(); usage.calls = 0; usage.byModel = {}; }
  usage.calls++;
  const m = usage.byModel[model] || (usage.byModel[model] = { calls: 0, input: 0, output: 0, cached: 0, usd: 0, unpricedCalls: 0 });
  m.calls++; m.usd = +(m.usd + (usd || 0)).toFixed(6);
  book(model, usd || 0, 0, 0, 0);
}
/** the cost of the model call that has just returned (read it straight after the await) */
function spent() { const v = lastUsd; lastUsd = null; return v === null ? null : +v.toFixed(5); }
/** today, all time, and the price table the sums were made with */
function getUsage() {
  if (usage.day !== today()) { usage.day = today(); usage.calls = 0; usage.byModel = {}; }
  const out = JSON.parse(JSON.stringify(usage));
  let usd = 0; const unpriced = [];
  for (const id of Object.keys(out.byModel)) { usd += out.byModel[id].usd || 0; if (out.byModel[id].unpricedCalls) unpriced.push(id); }
  out.usd = +usd.toFixed(4);
  if (unpriced.length) out.unpriced = unpriced;      // these models' tokens are counted above but not in "usd"
  let all = 0, calls = 0; for (const id of Object.keys(books.byModel)) { all += books.byModel[id].usd || 0; calls += books.byModel[id].calls; }
  out.allTime = { since: books.since, calls, usd: +all.toFixed(4), byModel: books.byModel, byDay: books.byDay };
  out.prices = { checked: PRICES_CHECKED, perMillionTokens: PRICES, sound: 'the amount Leonardo reports for each sound' };
  return out;
}
/** true while today's calls are under the cap (PRIMORDIA_DAILY_CALLS, default 1500) */
function underDailyCap() { return getUsage().calls < (Number(process.env.PRIMORDIA_DAILY_CALLS) || 1500); }

async function postJson(url, headers, body, ms) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), ms || 20000);
  try {
    const res = await fetch(url, { method: 'POST', signal: ctl.signal, headers: Object.assign({ 'content-type': 'application/json' }, headers), body: JSON.stringify(body) });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) { const e = new Error('model ' + res.status + ' ' + String((j.error && (j.error.message || j.error.type)) || '').slice(0, 160)); e.status = res.status; throw e; }
    return j;
  } finally { clearTimeout(timer); }
}

/** Anthropic's Messages API. Returns the text of the answer. */
function anthropicCaller(apiKey, model) {
  model = model || MODEL;
  return async function callModel({ system, user, temperature, maxTokens }) {
    const body = { model, max_tokens: maxTokens || 800, temperature: temperature === undefined ? 1 : temperature, system, messages: [{ role: 'user', content: user }] };
    const headers = { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' };
    let j;
    try { j = await postJson('https://api.anthropic.com/v1/messages', headers, body); }
    catch (e) { if (e.status !== 400) throw e; delete body.temperature; j = await postJson('https://api.anthropic.com/v1/messages', headers, body); }   // some models choose their own temperature
    // Anthropic reports cache reads and writes apart from input_tokens; this server sends no cache markers, so they are normally 0, but they are counted if present
    const u = j.usage || {}, cr = u.cache_read_input_tokens || 0, cw = u.cache_creation_input_tokens || 0;
    meter(model, (u.input_tokens || 0) + cr + Math.round(cw * 1.25), u.output_tokens, cr);
    return (j.content || []).map((c) => c.text || '').join('');
  };
}

/** OpenAI's Chat Completions API. Returns the text of the answer. */
function openaiCaller(apiKey, model) {
  const thinks = /^(gpt-5|o\d)/.test(model);     // these reason first: no temperature, and they need room to think
  return async function callModel({ system, user, temperature, maxTokens }) {
    const body = { model, messages: [{ role: 'system', content: system }, { role: 'user', content: user }], max_completion_tokens: (maxTokens || 800) + (thinks ? 2500 : 0) };
    if (thinks) body.reasoning_effort = 'minimal'; else body.temperature = temperature === undefined ? 1 : temperature;
    const headers = { authorization: 'Bearer ' + apiKey };
    let j;
    try { j = await postJson('https://api.openai.com/v1/chat/completions', headers, body, 40000); }
    catch (e) { if (e.status !== 400) throw e; delete body.temperature; delete body.reasoning_effort; j = await postJson('https://api.openai.com/v1/chat/completions', headers, body, 40000); }
    // completion_tokens already includes the model's hidden reasoning; cached prompt tokens are billed at the cheaper rate
    meter(model, j.usage && j.usage.prompt_tokens, j.usage && j.usage.completion_tokens, j.usage && j.usage.prompt_tokens_details && j.usage.prompt_tokens_details.cached_tokens);
    return String((j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || '');
  };
}

// The models a player may choose between. Small and quick first; the first one a key exists for is the default.
const CATALOG = [
  { id: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5', provider: 'anthropic' },
  { id: 'gpt-5.4-mini', label: 'GPT-5.4 mini', provider: 'openai' },
  { id: 'gpt-5.4-nano', label: 'GPT-5.4 nano', provider: 'openai' },
  { id: 'gpt-5.6-terra', label: 'GPT-5.6 Terra', provider: 'openai' },
  { id: 'gpt-6-luna', label: 'GPT-6 Luna', provider: 'openai' },
  { id: 'claude-sonnet-5-5', label: 'Claude Sonnet 5.5', provider: 'anthropic' },
];
/** { id: { label, call } } for every catalogue model whose provider has a key. */
function modelsFromEnv(env) {
  env = env || process.env;
  const out = {};
  const only = env.PRIMORDIA_MODELS ? env.PRIMORDIA_MODELS.split(',').map((x) => x.trim()) : null;
  for (const m of CATALOG) {
    if (only && !only.includes(m.id)) continue;
    if (m.provider === 'anthropic' && env.ANTHROPIC_API_KEY) out[m.id] = { label: m.label, call: anthropicCaller(env.ANTHROPIC_API_KEY, m.id) };
    if (m.provider === 'openai' && env.OPENAI_API_KEY) out[m.id] = { label: m.label, call: openaiCaller(env.OPENAI_API_KEY, m.id) };
  }
  return out;
}

module.exports = { attachBooks, PRICES, meterUsd, getUsage, underDailyCap, createAi, anthropicCaller, openaiCaller, modelsFromEnv, CATALOG, cleanThing, cleanIdea, cleanOrgan, cleanEvent, cleanStory, cleanSkin, cleanJudge, cleanDesign, extractJson, refused, jitter, MAX_VARIANTS };
