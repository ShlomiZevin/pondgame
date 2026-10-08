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
 "fx": what the player SEES filling the pond while it lasts, always choose one that fits: "snow" | "hail" | "rain" | "fog" | "lightning" | "embers" | "ash" | "sparks" | "meteors" | "bubbles" | "spores" | "petals" | "leaves" | "feathers" | "sand" | "stars" | "" (an ice age snows, a volcano rains ash, a storm has lightning, spring has petals, a magic night has stars),
 "thing": optional: something left behind in the water, {"name", "props": {"nutrition","poison","heat","light","sticky","acid","hard","spread","eats","moves","pull","vault"}, "alive": 0..1, "weak": "spike"|"toxin"|"bite"|"glow"|"armor", "hue", "note"}}
"fields": up to 4 REGIONS of the pond that DO something. This is your freest tool: build the scene the player described out of them. Each is {
   "name": what it is ("Ice Wall", "Lava River", "Whirlpool", "Safe Garden"),
   "stuff": what it is made of, which decides how it looks and what protects a creature from it: "ice" | "fire" | "water" | "rock" | "plant" | "toxic" | "light" | "dark" | "magic",
   "shape": "line" (a thin wall across the pond) | "band" (a wide stripe across it: a river, a rift, a road) | "circle" (a patch) | "ring" (only the rim of a circle: a cage, a crater wall) | "half" (one side of the pond) | "all",
   for a line or band: "across": "vertical"|"horizontal"|"diagonal", "at": 0.1..0.9 (where), "width": 0.03..0.6 (bands), "gap": 0..0.3 (an opening to pass through);
   for a circle or ring: "x", "y": 0..1 (its centre), "r": 0.04..0.45; for a half: "side": "left"|"right"|"top"|"bottom", "at": 0.1..0.9 (how far it reaches);
   what it does to whoever is in it, any mix: "solid": true (nothing can pass or enter: a wall, a boulder, a cage), "hurt": 0..1 (drains them), "kill": 0..1 (deadly), "slow": 0..1, "pull": -1..1 (towards its middle, or away; a whirlpool pulls), "push": [x, y] each -1..1 (sweeps them that way: a river, a wind), "feed": 0..1 (food grows there) with "tag": 0..5,
   "who": "all" | "biggest" | "smallest" | "fastest" | "slowest" | "blind" | "legless" | "unarmoured" | "bare" (it only touches those),
   "drift": [x, y] each -1..1 (it travels across the pond: a cloud, a wave), "grow": -1..1 (it spreads or shrinks),
   "after": 0..90 seconds before it arrives (use this to make the event UNFOLD: first a warning, then the worst, then what is left), "life": 15..400 seconds it lasts,
   "weak": for a solid one, what breaks it down: "spike"|"toxin"|"bite"|"glow"|"armor"}
 "strikes": optional: things that FALL and hit spots, {"name" ("Meteor"), "count": 1..40, "over": 1..90 seconds, "radius": 0.02..0.2, "kill": 0..1, "feed": 0..12 (food each one leaves) with "tag", "hue", "stuff", "after": seconds, "aim": "anywhere"|"creatures"},
Use only what fits; leave the rest at 0 (food and mutate at 1). Do not flatten what the player said into a change of weather: STAGE it. Think of where in the pond it happens, what it is made of, what it does to whom, and in what order, then build that from fields, strikes, the pond-wide dials and a thing or two. Examples of the range: a wall of ice is a solid ice "line" with a small gap, a cold "temp" and "snow". A volcano is a fire "circle" that kills, a fire "band" of lava arriving 8 seconds later, ash, heat and a few strikes. A whirlpool is a water "circle" that pulls. A flood is a water "half" that pushes and grows. A meteor shower is strikes that leave rich food. A safe garden is a plant "circle" that feeds and slows. A plague that takes the unarmoured is a toxic "all" with "who": "unarmoured". A cage is a solid rock "ring". A storm front is a dark "band" that drifts across with lightning strikes aimed at creatures. Anything that DIVIDES or BLOCKS is a solid field: never use a "thing" with "vault" for it. When you leave a "thing", name it exactly as what it is ("Ice Wall", "Lava Vent"): the game draws it from that name. IMPORTANT: when the words are about the WHOLE pond or world ("poisoned pond", "ice age", "the lights go out", "a drought"), use the pond-wide fields (poison, temp, light, food, mutate, current) with a long duration, and do NOT leave a "thing": a thing sits in one place. Leave a "thing" only when the words describe an object, a creature or a place. Take the words seriously and be inventive: "aliens take the biggest" kills the biggest; "an ice age" is long and cold and dark with little food; "a jellyfish invasion" leaves a moving, eating thing behind. If the player describes an OBSTACLE or a challenge for the creatures ("all the food is behind a steel wall", "the food is frozen in ice", "a cage around the algae"), do not kill anyone: leave a thing with "vault" 0.5 to 0.7 and a fitting "weak", so the pond has to evolve a way in. However absurd the words, find what they would do. Life should usually survive: kill more than half only for a true catastrophe. If the words are rude or hateful, make it a harmless rain of food.`;

const MARVEL_SYSTEM = `You invent ONE marvel for a pond in Primordia, a game where creatures evolve their own bodies: a super-rare gift that one lucky creature is born with, the kind of thing a player gasps at and tells a friend about. It is passed on by its genes, so its children may have it too.
Nothing here comes from a list. Every marvel is new, made for THIS creature in THIS pond: you are told what the creature looks like, what lives around it, what the player dropped in, what has happened and what is killing them. Let the marvel grow out of that, or delight by contrast. A creature that survived an ice age beside a knight might be born a Frost Squire; one in a starving pond, a Gardener whose steps leave food. Surprise us: if you have seen the idea before, do not use it.
Reply with ONE JSON object and nothing else:
{\"name\": 2-4 words, evocative, \"wonder\": ONE vivid sentence, at most 120 characters, saying what it is and what it does, in plain words a child would love,
 \"why\": at most 90 characters: what about this creature or this pond it came from,
 \"hue\": 0 to 360, the colour of its light,
 \"powers\": 1 to 3 things it DOES. Build them freely; each is {
    \"kind\": \"aura\" (always about it) | \"pulse\" (it lets it off every so often),
    \"stuff\": what it is made of: \"ice\" | \"fire\" | \"water\" | \"rock\" | \"plant\" | \"toxic\" | \"light\" | \"dark\" | \"magic\",
    \"reach\": 0.2 to 1 (how far it carries), \"every\": 2 to 30 seconds (for a pulse),
    \"to\": who it touches: \"hunters\" (what hunts or attacks it) | \"others\" (other kinds) | \"kin\" (its own kind) | \"all\",
    and any mix of: \"hurt\": 0..1, \"strike\": 0..1 (a pulse hits the nearest one hard), \"slow\": 0..1, \"pull\": -1..1 (draws them in, or drives them off), \"heal\": 0..1, \"feed\": 0..1 (food appears around it) with \"tag\": 0..5},
 \"fx\": what its body gains, 0 to 3 of: {\"speed\": -0.5..0.6, \"sense\": 0..0.9, \"eat\": 0..0.9, \"armor\": 0..0.9, \"spike\": 0..0.9, \"toxin\": 0..0.9, \"photo\": 0..0.9, \"glow\": 0..0.9, \"heat\": 0..0.9, \"cold\": 0..0.9, \"poison\": 0..0.9},
 \"special\": usually \"\"; only if it truly fits, one of \"luck\" (danger sometimes misses it), \"fertile\" (more children), \"titan\" (it grows huge), \"mind\" (quick wits), \"fire\" (it breathes fire at what hunts it), \"heal\" (its light mends those near),
 \"words\": if it can TALK (about one marvel in three should), 3 to 6 short lines it says ALOUD, each at most 28 characters, in its own character and about its own pond and life (\"Mind the knight!\", \"Brr. Scarf weather.\"). If the pond's data has "recorded", those lines already have a real recorded voice: when it talks, take ONE or TWO of them word for word if they suit its character (so it can be heard for real at once), and always invent the others new, so new voices keep being made. Otherwise [],
 \"voice\": if it talks: {\"tone\": \"sweet\" | \"bright\" | \"cheeky\" | \"gruff\" | \"wise\" | \"tiny\", \"speed\": 0.8 (slow and big) to 1.6 (quick and small)},
 \"icon\": the picture of its SIGN, as a short phrase for an image model to draw (at most 12 words, one single object, no creature, no text): for example \"a golden sail with sparkling champagne bubbles\" or \"a glowing blue crystal heart\". It floats beside the creature's head.}
Keep it wonderful and fair: strong enough to matter, never so strong that nothing else can live. Never repeat a name from \"have\".`;
const STORY_SYSTEM = `You are the narrator of a small evolving pond, speaking to a curious player. You get measured facts: what changed between two points in time, which creatures live there now, new organs, discoveries, events and things the player added.
Reply with ONE JSON object and nothing else: {"title": at most 5 words, "text": two short sentences, at most 230 characters in all}
Say WHAT changed and WHY it helps those creatures survive here (or why something is dying out), in plain, lively words. Use the real names and numbers you were given; never invent a fact. If the player added something or caused an event, say how life answered it. No greetings, no questions.`;

const DESIGN_SYSTEM = `You imagine ONE new KIND OF BODY PART for the creatures of Primordia. Primordia is a pond game where creatures evolve their own bodies and the player collects the ones they love. The whole point is that a pond should come to hold creatures a person would want to keep: cute, clean and full of character, like the cast of a Pixar film. Good-looking does not mean harmless: a fierce or eerie creature can be beautiful too.
Every part you offer is drawn on a creature and graded for beauty before it is let in, and ugly ones are turned away. So: one bold, readable shape that says what it is, never fiddly. The pond already knows legs, fins, spikes, tentacles, feelers, armour plates, frills and horns; yours must be something else. It is drawn in each animal's own colours on a cartoon character seen from the front or the side; the genes decide which part of the body it sits on and how big it is.
There are three sorts of part. Choose the one that fits, and reply with ONE JSON object and nothing else. If the input has "want": "worn", the pond's bodies have stopped changing and it is time for what they wear and carry: invent a thing WORN OR HELD (sort A with "place" "top", "face" or "held"). If it has "want": "condition", invent a CONDITION (sort C). Either way let it echo what has happened in this pond (what was dropped in, what hunts, what the creatures have become): nothing from a stock list, something this pond would come to.
A) Something GROWN OUTWARD (a wing, a sail, antlers, a lure, a blade, a shield, a parasol, a lantern...):
{"name": 1-2 words, a noun ("Sail"), "adj": one word for an animal that has it ("Sailed"), "note": what it does for its owner, at most 90 characters,
 "because": what in this pond made you think of it, at most 80 characters (name the thing, the event or the danger); "" if it is pure whim,
 "place": "sides" (a mirrored pair) | "back" (one, standing on the top or the back) | "head" (a pair on top of the head) | "top" (ONE thing worn on top of the head: a hat, a crown, a helmet, a flower, a tuft; x runs UP from the head) | "face" (ONE thing worn on the face under the eyes: a moustache, a beard, a mask, a bib; x runs DOWN from under the eyes) | "held" (ONE thing carried in a hand, or beside the body if it has no hands: a tool, a stick, a shell, a lantern, a toy; x runs from the grip to its far end). For "top", "face" and "held" the "fx" may be all zeros: it need do nothing but be worn; and give "tint": the hue (0 to 360) of the thing itself (a red cap is 0, a golden crown 45, a green leaf 120, a blue lens 210), with "colour": "accent" for a strong colour, "pale" for a light one, "dark" for a deep one,
 "motion": "flap" | "sway" | "pulse" | "bristle" (it flares when the animal is frightened) | "still",
 "colour": "accent" | "body" | "pale" | "dark" | "glow",
 "pts": the outline, 5 to 16 points [x, y]. x runs from 0 (where it joins the body) to 1 (its tip); y from -0.5 to 0.5 across it. Go round once: start near [0, -0.08], out along one edge to the tip, back along the other edge, end near [0, 0.08]. Make the shape say what it is.
 "smooth": true for soft curved parts, false for hard angular ones,
 "ribs": up to 5 inner lines [x1, y1, x2, y2] (veins, struts, teeth), "dots": up to 3 [x, y, r] with r 0.04..0.15 (a bulb, an eye-spot, a knob),
 "fx", "res", "hits": see below}
C) A CONDITION: not a part but a state of the whole creature that its children inherit (a walking corpse, a ghost, a thing of crystal, rusted metal, overgrown with moss, frostbitten, sun-scorched... whatever this pond would come to):
{"name" 1-2 words ("Moss Rot"), "adj" one word ("Mossy"), "note", "because" as above, "place": "skin",
 "tone": [hue shift in degrees -180..180, saturation x 0.2..1.6, lightness x 0.55..1.35]: how it changes the creature's own colours (a corpse might be [40, 0.4, 0.8], a ghost [0, 0.25, 1.3]),
 "lid": 0 to 0.5: how far its eyelids hang (0 wide awake, 0.5 half shut),
 "pts": the outline of ONE small mark that appears in several places on its body (a stitch, a crack, a crystal, a leaf, a drip), in the same form as for sort A, "smooth", "ribs", "dots" as for sort A, "colour": "accent" | "pale" | "dark" | "glow",
 "fx", "res", "hits": see below (a condition may give a little and cost a little)}
B) Something WORN: grown like a coat, but in the shape of a garment (a sweater, a parka, a hood, a scarf, a vest of plates, a belt, a cape collar):
{"name", "adj", "note", "because" as above, "place": "wrap",
 "style": "knit" | "plates" | "stripes" | "fluff" | "plain",
 "cover": [top, bottom]: the band of the body it covers, 0 = the very top, 1 = the very bottom. A sweater is [0.45, 1], a scarf [0.3, 0.5], a hood [0, 0.3], a belt [0.6, 0.75]. The eyes are near the middle: do not cover 0.3 to 0.55 unless it is a scarf under them,
 "trim": true for a thick hem at its edges, "colour": "accent" | "body" | "pale" | "dark" | "glow",
 "fx", "res", "hits": see below}
"fx": what it changes, each from -0.3 to 0.5: "speed", "agility", "reach", "senses", "armour", "attack". One or two are positive and at least one is negative: nothing is free.
"res": {"heat": 0 to 0.3, "cold": 0 to 0.3, "poison": 0 to 0.3}: real protection, only where the part gives it (wool against cold, a parasol against heat).
"hits": "" or what sort of weapon or shield it is against a harmful thing: "spike" (it stabs or cuts: a blade, a lance), "toxin" (it poisons), "bite" (it bites or crushes), "glow" (it dazzles), "armor" (it shields). Each harmful thing in the pond says what it is "weakTo": creatures carrying a part with that "hits" wear it down.
You are told about this pond: the things the player dropped in and the events they caused, what is hurting the creatures, the water, who lives there now with the beauty grade each kind got and why, what the player chose to keep, and what became of earlier ideas. Use it. Let the part ANSWER what is happening, in a way the player will see and smile at: the player dropped a knight, so a creature grows a bone blade, a shield or a visor; an ice age came, so a woolly sweater, a parka hood, mittens; a fire, so a parasol or a water sac; a singer, so a trumpet. It is always GROWN from the body (bone, horn, wool, skin), never manufactured, but drawn so the likeness is plain. You may copy what the thing has, or make what defends against it. Learn from the grades: move towards what scored high and what the player kept, away from what was turned away or died out. If nothing much is happening, follow a whim. Never repeat a name from "have".`;

const PLAN_SYSTEM = `You imagine ONE new SHAPE OF BODY for the creatures of Primordia. Primordia is a pond game where creatures evolve their own bodies and the player collects the ones they love. The whole point is that a pond should come to hold creatures a person would want to keep: cute, clean and full of character, like the cast of a Pixar film. Good-looking does not mean harmless: a fierce or eerie creature can be beautiful too.
Every shape you offer is drawn and graded for beauty before it is let in, and ugly ones are turned away. So: a bold simple silhouette, a clear place for a big face, pleasing proportions, and at most 3 masses (often 1 or 2 is best). Within that, surprise: these are animals of another world, not fish and lizards.
A body is 1 to 3 MASSES (blobs). The game draws them joined as one smooth cartoon shape with a single outline, adds the creature's own eyes, mouth, colours, coat and growths (legs, fins, horns...), and animates it.
You are designing a WHOLE CHARACTER of some kind of animal, not a bare blob: the body shape below, plus the face it wears and the parts of its kind. It may be any kind of animal (for example a fish, a worm, a bird, a dog, a snail, a jellyfish, a little person, a monster) or something you invent: do not copy those, surprise us. Think of one animated-film character and design it so that it reads as that kind of animal and is lovable: its face, its parts, its proportions are yours to choose. Do not make everything a two-legged person or a copy of the examples: variety of kinds is the point.
Reply with ONE JSON object and nothing else:
{"name": 1-2 words for the shape ("Toadstool"), "noun": one word for an animal of this shape, "note": what it looks like, at most 100 characters,
 "because": what in this pond made you think of it, at most 80 characters (name the thing, the event or the danger); "" if it is pure whim,
 "body": {"v": 0 if the animal FACES the viewer (left and right match: the cutest choice, use it mostly) or 1 if it is seen from the SIDE (it faces right),
   "e": the index of the mass that carries the face (make it a big one),
   "m": [mass, ...] the first is the main mass. Each mass is {
     "r": its outline: 10 radii round its centre, each 0.6 to 1.45, going CLOCKWISE from the RIGHT: right, lower-right, bottom-right, bottom-left, lower-left, left, upper-left, top-left, top-right, upper-right. All 1 is a circle. Neighbours must not differ by much (the outline is smoothed). For v 0 make it the same left and right.
     "lb": 0, or 3 to 8 lobes all the way round (5 makes a star, 3 a clover), "la": how deep the lobes are, 0.08 to 0.25,
     "s": its size beside the main mass (the main mass is 1; the others 0.35 to 1.2),
     "on": the index of the earlier mass it grows from (the main mass has none),
     "at": the direction it sits in from that mass, in degrees: 0 right, 90 up, 180 left, 270 down. For v 0 a single mass must sit at 90 or 270; a pair may sit anywhere on the right (-60 to 60) and is mirrored on the left,
     "d": how far out it sits: 0.5 pressed well into its parent, 1 just touching, 1.4 held out on a stalk,
     "pr": 1 if it is a mirrored PAIR (ears, twin bodies, shoulders), else 0,
     "h": 1 if it is a hollow ring (only an outer mass that does not carry the face), else 0}]},
 "face": {"es": eye size 0.5 to 0.9 (big and glossy is lovable), "ep": pupil 0.5 to 0.72, "ey": eye height on the face -0.1 to 0.15 (low is baby-like), "eg": eye spacing 0.5 to 0.62, "bl": blush 0 to 1, "sm": smile 0.4 to 1, "hd": head scale 1.2 to 2.2},
 "limbs": {"ll": limb length 0.8 to 1.5, "lw": limb thickness 0.9 to 1.4, "hs": hand and foot size 0.9 to 1.5},
 "stance": how it leans, -0.4 to 0.4 (0 stands straight; a little lean gives it attitude),
 "outfit": 0 none, 1 scarf, 2 belt, 3 gloves and boots, 4 tuft of hair (one thing that makes it somebody; 0 is fine),
 "kit": which of "legs", "arms", "fins", "tail" its kind has (a fish: ["fins", "tail"]; a dog: ["legs", "tail"]; a person: ["legs", "arms"]; a worm: []),
 "tail": {"tk": 0 none, 1 fan, 2 fork, 3 whip, 4 club; "ts": size 0.4 to 1.0} or null,
 "res": {"heat": 0 to 0.3, "cold": 0 to 0.3, "poison": 0 to 0.3}: only if the shape itself protects (a compact round body keeps its warmth), else all 0}
You are told about this pond: the things the player dropped in and the events they caused, what is hurting the creatures, the water, who lives there now with the beauty grade each kind got and why, what the player chose to keep, and what became of earlier ideas. Use it. Let the shape ANSWER what is happening (an ice age: something compact and huddled; a hunter: something low, or tall and watchful; a knight: something helmeted or shield-shaped; a flood of food: something wide and greedy). Learn from the grades: move towards what scored high and what the player kept, away from what was turned away or died out. If nothing much is happening, follow a whim. Never repeat a name from "have".`;

const SPECIALS = ['voice', 'fire', 'heal', 'luck', 'fertile', 'titan', 'mind'], GLYPHS = ['star', 'gem', 'flame', 'brain', 'note', 'heart', 'rainbow', 'clover', 'sun', 'moon', 'crown', 'wing'], FXK = ['speed', 'sense', 'eat', 'armor', 'spike', 'toxin', 'photo', 'glow', 'heat', 'cold', 'poison'];
// a sentence cut where a sentence or a word ends, never in the middle of one
function cutText(s, n) { s = String(s || '').replace(/[<>]/g, '').trim(); if (s.length <= n) return s; const c = s.slice(0, n), p = Math.max(c.lastIndexOf('. '), c.lastIndexOf('! '), c.lastIndexOf('? ')); if (p > n * 0.5) return c.slice(0, p + 1); const sp = c.lastIndexOf(' '); return (sp > n * 0.5 ? c.slice(0, sp) : c).replace(/[,;:-]+$/, '') + '…'; }
function cleanMarvel(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const name = String(raw.name || '').replace(/[<>"]/g, '').trim().slice(0, 26), wonder = cutText(raw.wonder, 170);
  if (!name || !wonder) return null;
  const sp = SPECIALS.includes(raw.special || raw.sp) ? (raw.special || raw.sp) : '';
  const f = raw.fx && typeof raw.fx === 'object' ? raw.fx : {}, fx = {}; let sum = 0;
  for (const k of FXK) { let v = Number(f[k]); if (!Number.isFinite(v)) v = 0; fx[k] = k === 'speed' ? Math.max(-0.5, Math.min(0.6, v)) : Math.max(0, Math.min(0.9, v)); sum += Math.abs(fx[k]); }
  if (sum > 1.4) for (const k of FXK) fx[k] = +(fx[k] * 1.4 / sum).toFixed(3);
  const words = Array.isArray(raw.words) ? raw.words.map((w) => String(w).replace(/[^A-Za-z!?' .-]/g, '').trim().slice(0, 14)).filter(Boolean).slice(0, 8) : [];
  const num = (v, a, b) => { v = Number(v); return Number.isFinite(v) ? Math.max(a, Math.min(b, v)) : 0; };
  const powers = (Array.isArray(raw.powers) ? raw.powers : []).filter((p) => p && typeof p === 'object').slice(0, 3).map((p) => ({ kind: p.kind === 'pulse' ? 'pulse' : 'aura', stuff: String(p.stuff || '').slice(0, 8), reach: num(p.reach, 0.2, 1), every: num(p.every, 2, 30), to: String(p.to || '').slice(0, 8), hurt: num(p.hurt, 0, 1), strike: num(p.strike, 0, 1), slow: num(p.slow, 0, 1), pull: num(p.pull, -1, 1), heal: num(p.heal, 0, 1), feed: num(p.feed, 0, 1), tag: Math.round(num(p.tag, 0, 5)) }));
  const lines = Array.isArray(raw.words) ? raw.words.map((w) => String(w).replace(/[^A-Za-z!?', .-]/g, '').trim().slice(0, 30)).filter(Boolean).slice(0, 6) : [];
  const v = raw.voice && typeof raw.voice === 'object' ? raw.voice : {};
  const iconText = String(raw.icon || '').replace(/[<>"]/g, '').trim().slice(0, 100);
  return { iconText, name, wonder, sp, glyph: GLYPHS.includes(raw.glyph) ? raw.glyph : 'star', hue: Math.round(((Number(raw.hue) || 50) % 360 + 360) % 360), fx, powers, words: lines, voice: { tone: String(v.tone || 'bright').replace(/[^a-z]/g, '').slice(0, 8), speed: num(v.speed || 1.25, 0.7, 1.7) }, emblem: raw.emblem ? sanitizeSvg(raw.emblem) : '', why: cutText(raw.why, 170) };
}
function cleanPlan(raw) {
  const body = raw && (raw.body || raw);
  if (!raw || typeof raw !== 'object' || !body || !Array.isArray(body.m) || !body.m.length) return null;
  const n = (v, lo, hi, d) => { v = Number(v); return Number.isFinite(v) ? +Math.max(lo, Math.min(hi, v)).toFixed(3) : d; };
  const m = body.m.filter((q) => q && typeof q === 'object').slice(0, 5).map((q, i) => ({ r: (Array.isArray(q.r) ? q.r : []).slice(0, 12).map((v) => n(v, 0.4, 1.7, 1)), lb: n(q.lb, 0, 8, 0), la: n(q.la, 0, 0.3, 0), s: i ? n(q.s, 0.3, 1.3, 0.7) : 1, on: i ? Math.round(n(q.on, 0, i - 1, 0)) : -1, at: n(q.at, -720, 720, 90), d: n(q.d, 0.4, 1.6, 1), pr: q.pr ? 1 : 0, h: q.h ? 1 : 0 }));
  if (!m.length) return null;
  const name = String(raw.name || '').replace(/[<>"]/g, '').trim().slice(0, 22);
  if (!name) return null;
  const rs = raw.res && typeof raw.res === 'object' ? raw.res : {};
  const fc = raw.face && typeof raw.face === 'object' ? raw.face : null, lb = raw.limbs && typeof raw.limbs === 'object' ? raw.limbs : null, tl = raw.tail && typeof raw.tail === 'object' ? raw.tail : null;
  const face = fc || lb || raw.stance !== undefined ? { es: n(fc && fc.es, 0.34, 0.9, undefined), ep: n(fc && fc.ep, 0.36, 0.78, undefined), ey: n(fc && fc.ey, -0.2, 0.36, undefined), eg: n(fc && fc.eg, 0.3, 0.8, undefined), bl: n(fc && fc.bl, 0, 1, undefined), sm: n(fc && fc.sm, -0.2, 1, undefined), hd: n(fc && fc.hd, 0.7, 2.5, undefined), ll: n(lb && lb.ll, 0.65, 1.7, undefined), lw: n(lb && lb.lw, 0.65, 1.5, undefined), hs: n(lb && lb.hs, 0.75, 1.7, undefined), st: n(raw.stance, -0.6, 0.6, undefined) } : null;
  const outfit = Math.round(Number(raw.outfit));
  const kit = Array.isArray(raw.kit) ? raw.kit.filter((k) => ['legs', 'arms', 'fins', 'tail'].includes(k)).slice(0, 3) : null;
  return { face, outfit: outfit >= 1 && outfit <= 4 ? outfit : 0, kit: kit && kit.length ? kit : null, tail: tl ? { tk: Math.round(n(tl.tk, 0, 4, 0)), ts: n(tl.ts, 0.3, 1.2, 0.6) } : null, name, noun: String(raw.noun || '').replace(/[^A-Za-z\-]/g, '').slice(0, 14), note: String(raw.note || '').replace(/[<>]/g, '').slice(0, 120), because: String(raw.because || '').replace(/[<>]/g, '').slice(0, 90),
    body: { v: body.v ? 1 : 0, e: Math.round(n(body.e, 0, m.length - 1, 0)), m }, res: { heat: n(rs.heat, 0, 0.3, 0), cold: n(rs.cold, 0, 0.3, 0), poison: n(rs.poison, 0, 0.3, 0) } };
}
const FIGURE_SYSTEM = `You draw ONE character for a pond game, as an SVG: exactly the being the player typed, so that anyone would name it at a glance. A knight is a person in armour with a helmet and a sword; a cat has ears, whiskers and a tail; a robot is boxy with an antenna. The game animates your drawing as a paper puppet, so you draw it in PARTS.\nReply with ONE JSON object and nothing else: {\"svg\": \"<svg ...>...</svg>\", \"pivots\": {...}, \"floats\": true or false}\nTHE SVG: <svg viewBox=\"0 0 200 240\" xmlns=\"http://www.w3.org/2000/svg\">. The character stands with its feet on the line y=228, centred on x=100, facing the viewer or turned a little to the RIGHT, and fills most of the height (a flying or swimming thing floats with its middle near y=120).\nThe top-level children of the svg are ONLY <g id=\"...\"> groups, in drawing order from back to front, using these ids and only the ones the being needs: \"back\" (wings, a cape, a shell, a fin on its back), \"tail\", \"leg-far\", \"arm-far\", \"body\", \"leg-near\", \"head\" (with its whole face, hat, helmet, ears, horns), \"arm-near\". Whatever it HOLDS (a sword, a staff, a lantern) is drawn inside the \"arm-near\" group, in its hand, so it swings with the arm. A being with no limbs (a ghost, a slime, a plant) may use just body, head and perhaps back or tail. Each part must overlap its neighbour a little at the joint so no gap opens when it moves.\nSTYLE: a friendly cartoon toy. Thick dark outlines on every shape (stroke=\"#14202e\" stroke-width=\"4\" stroke-linejoin=\"round\" stroke-linecap=\"round\"), flat bright fills, a second darker or lighter tone for a little shading, big round eyes (white, a dark pupil, a small white highlight), a simple mouth. Toy proportions: a big head (about a third of its height), a compact body, short sturdy limbs. Give it the details that make it unmistakable, and draw them properly: a knight has a helmet with a visor slit and a plume, a breastplate, shoulder plates, a belt, boots, a shield on its far arm, and a real sword as long as its arm with a blade, a crossguard and a pommel. Whatever the player's words mention (a sword, a hat, wings, a colour) MUST be there and easy to see. 40 to 90 shapes in all. Use ONLY circle, ellipse, rect, path, polygon, polyline, line and g, with plain attributes. No text, no images, no filters, no gradients, no style attribute, no classes, no transforms.\nPIVOTS: for every group id you used, the point [x, y] that part turns about: the shoulder for an arm, the hip for a leg, the neck for the head, the root for a tail, where it joins the body for \"back\", the middle of the body for \"body\".\n\"floats\": true if it flies, swims or hovers instead of standing.\nYou are given the player's own words (\"typed\"), the short name the game gave it, what the game decided it does, and its colour as a hue (0-360): use that hue as its main colour unless the thing has an obvious colour of its own.
It need not be alive: a single object with a shape of its own (a rock, a tree, a sword, a boat, a mushroom) is drawn the same way, usually as just a \"body\" group, with a face only if it is alive. But if what was typed has no shape of its own (a liquid, a gas, weather, light, a feeling, an idea, a wall), reply {\"svg\": \"\"} and nothing else.`;

const NUDGES = ['eyes_bigger', 'two_eyes', 'simpler', 'rounder', 'bolder_colour', 'pattern', 'plain', 'bigger_face', 'shorter_parts', 'longer_parts', 'plumper', 'slimmer', 'face_on', 'more_parts', 'fewer_masses', 'more_masses', 'smile', 'eyes_apart', 'eyes_closer', 'eyes_lower', 'pupils_bigger', 'blush', 'bigger_head', 'smaller_body', 'legs', 'arms', 'longer_limbs', 'thicker_limbs', 'bigger_hands', 'lean', 'dress', 'fins', 'tail'];
const NUDGE_LIST = NUDGES.join(', ');
// The further things the watcher marks, beside NICE and WHOLE, from the same look. One entry each: to add a mark, add it here and to G.MARKS in the game
// (21c_taste.js) under the same id. Each is asked for 0 to 10 and comes back as scores[i].m[id], 0 to 1.
const WATCH_MARKS = [
  { id: 'body', name: 'BODY', ask: 'does it have a real body that reads at a glance: one clear form with a structure you can follow (what is its middle, what is its head or front, what grows from what), as against a heap of lumps, a pile of parts, or bits floating round a ball. Size and the number of parts do not matter here, only whether the body is clear. 1-2 a heap or a blob with clutter; 3-4 a shape you have to puzzle out; 5-6 a plain but clear body; 7-8 a well-built body, every part in its place; 9-10 a body designed like a character model sheet.' },
  { id: 'balance', name: 'BALANCE', ask: 'proportion and poise: do its parts suit one another in size, is it symmetrical where it should be, does it look as if it could stand, swim or fly without toppling. 1-2 lopsided, parts wildly out of scale; 5-6 fair; 9-10 perfectly proportioned and poised.' },
  { id: 'grand', name: 'GRANDEUR', ask: 'how much creature there is: how big, tall, developed and elaborate it has become, COUNTING ONLY what reads well. A tiny simple thing is low however sweet it is; a large, tall, richly built creature with limbs, features and detail that all belong is high; a big heap of clutter is low, because clutter is not grandeur. 1-2 a speck or a bare ball; 3-4 a small simple critter; 5-6 a creature of some substance; 7-8 an impressive, developed being; 9-10 a magnificent one.' },
];
const WATCH_SYSTEM = `You are the watcher of Primordia, a pond where creatures evolve their own bodies. Nature in this pond has an eye, and it is yours: what you find nice and whole breeds, and the rest fades. The aim is for the pond to grow, generation by generation, from a bare cell into creatures that people find lovable and would want to keep, the kind that could live in an animated film.
You are shown ONE picture: living creatures side by side, each with a number in its corner. Grade every one on ${2 + WATCH_MARKS.length} things, each from 0 to 10, by your own understanding. Look only at the picture. The numbered creatures are drawn to scale with one another: one drawn bigger IS a bigger creature. The background of each creature shows where it lives: dark water for a creature of the water, a strip of sandy bank under the water for one at home in both, and ground under a pale sky for a creature of the land. A creature should look made for its home, in whatever way you find convincing: a body that plainly belongs to the wrong place (a land animal that could only swim, a water animal that could only walk) is less whole and less nice than one that suits where it lives.
NICE: is this a nice creature, in the full sense of the words: appealing, lovable, charming; something you would smile at and want to keep; it has character and feels like somebody, not a specimen, a diagram or a mess. Use your own sense of what makes a creature appealing, the understanding that the makers of beloved animated characters, animals and toys work from: a clear idea, harmony, expressiveness, personality, craft. Nothing in particular is required. It may be any kind of creature in any shape, plain or elaborate, sweet or fierce or funny or strange, as long as it is truly nice; do not apply a checklist. A creature that fights itself (parts that clash, clutter, a lost face, muddy colours) or that is merely odd is not nice; one that is simply and clearly appealing is. 1-2 a mess or a faceless blob; 3-4 plain, awkward or merely odd; 5-6 pleasant, but not yet somebody; 7-8 charming, you would keep it; 9-10 irresistible, a finished character people would love.
WHOLE: is it a whole creature: a complete living being of its own sort that you could believe in, as against a fragment, a blob with things stuck on it, or a mix of parts that do not belong together. Any kind of creature can be whole, and no anatomy is preferred: whatever it is, it should look like it could live its life, with a way of seeing, a way of getting about and the parts its sort of creature needs, all fitting together as one being. Do not reward any particular body plan (legs, fins, wings, none of them) for its own sake, and judge it as the kind of thing it seems to be. 1 a cell or a blob; 2-3 a ball with a face and a few bits stuck on; 4-5 a simple critter; 6-7 a clear creature of some kind you could name; 8-9 a complete, well-formed creature, as if drawn for a film; 10 as complete as the hero of one. Do not be generous: most young creatures are 2 to 4.
${WATCH_MARKS.map((m) => m.name + ': ' + m.ask).join('\n')}
The marks are separate things: a small simple creature can be very NICE and low in GRANDEUR; a large elaborate one can be high in GRANDEUR and low in NICE if it is ugly. Mark each on its own.
Reply with ONE JSON object and nothing else: {\"g\": [[number in the corner, nice, whole, \"at most 6 words on its look\", ${WATCH_MARKS.map((m) => m.name.toLowerCase()).join(', ')}], ...]} with one entry for every creature shown. Use whole numbers. Mark strictly and spread your marks: creatures on one sheet are often cousins, so look for what sets them apart, and give more to a creature with a clear character of its own than to one more of the same. Two creatures that differ only a little (eyes a little bigger, a rounder head, sturdier limbs, a happier face) should still get different marks if one of them is the nicer: those small differences are exactly what the pond breeds from.`;

const JUDGE_SYSTEM = `You are the eye for beauty in Primordia. Primordia is a pond game where creatures evolve their own bodies and the player collects the ones they love. The whole point is that a pond should come to hold creatures a person would want to keep: cute, clean and full of character, like the cast of a Pixar film. Good-looking does not mean harmless: a fierce or eerie creature can be beautiful too.
You are shown ONE picture: creatures side by side, each with a number in its corner. You also get a line of facts about each, which only helps you read the picture. Grade what you SEE.
Reply with ONE JSON object and nothing else: {"scores": [{"id": the number in the corner, "score": 0 to 10, "why": at most 14 words, lively, about that creature's actual look, "fix": the ONE change that would improve it most}]}
What scores high: a bold, simple silhouette you would know from its shadow; big, clear, expressive eyes and a face you can read; parts that belong together and are in proportion; pleasing colours with contrast; symmetry or a clear pose; one surprising feature that gives it character. What scores low: clutter (too many parts fighting each other), parts that hide the face or one another, a lumpy or shapeless body, small or lost eyes, muddy colours, nothing to remember it by. The best creatures can be said in a few words that make someone want one: \"a sweet snail with a sword\", \"a vampire cat\", \"a sleepy mushroom in a scarf\". One clear body idea, one or two signature features, a face you love. If you cannot sum a creature up like that, it is not there yet. Mark strictly and use the whole range: most creatures deserve 3 to 6. Clutter is the commonest fault: a creature with more than three kinds of growth, or lumps you cannot count at a glance, or a face lost among its parts, cannot score above 4. A plain blob is about 3, a mess is 1 or 2, and only a creature you would want as a toy on your desk gets 8 or more. Do not give two creatures the same score.
"fix" must be exactly one of: eyes_bigger, two_eyes, simpler (lose a growth), rounder, bolder_colour, pattern (add markings), plain (lose its markings), bigger_face, shorter_parts, longer_parts, plumper, slimmer, face_on (turn to face the viewer), more_parts (it is too bare), fewer_masses (its body has too many lumps), more_masses (its body is too plain), smile.
If the message has a "check" field, the creatures are try-outs of ONE new idea (named there) before it is let into the pond: grade them the same way, as honestly.`;

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
    fx: ['snow', 'bubbles', 'embers', 'spores', 'rain', 'stars', 'ash', 'petals', 'leaves', 'sparks', 'fog', 'meteors', 'lightning', 'hail', 'sand', 'feathers'].includes(raw.fx) ? raw.fx : '',
  };
  if (raw.gift && typeof raw.gift === 'object' && GIFTS.includes(String(raw.gift.trait).toLowerCase())) ev.gift = { trait: String(raw.gift.trait).toLowerCase(), share: num(raw.gift.share, 0.05, 1, 0.5) };
  if (raw.water && typeof raw.water === 'object') ev.water = { oxygen: num(raw.water.oxygen, -1, 1, 0), murk: num(raw.water.murk, -1, 1, 0), rich: num(raw.water.rich, -1, 1, 0), warm: num(raw.water.warm, -1, 1, 0) };
  if (GIFTS.includes(String(raw.admire || '').toLowerCase())) ev.admire = String(raw.admire).toLowerCase();
  ev.things = Math.round(num(raw.things, 1, 5, 1));
  { const tidy = (v, depth) => typeof v === 'number' ? (Number.isFinite(v) ? v : 0) : typeof v === 'boolean' ? v : typeof v === 'string' ? v.replace(/[<>"]/g, '').slice(0, 40) : Array.isArray(v) ? (depth > 2 ? [] : v.slice(0, 4).map((x) => tidy(x, depth + 1))) : v && typeof v === 'object' && depth <= 2 ? Object.fromEntries(Object.keys(v).slice(0, 26).map((k) => [String(k).slice(0, 12), tidy(v[k], depth + 1)])) : null;
    if (Array.isArray(raw.fields)) ev.fields = raw.fields.slice(0, 4).map((f) => tidy(f, 1)).filter(Boolean);
    if (raw.strikes && typeof raw.strikes === 'object') ev.strikes = tidy(raw.strikes, 1);
    if (raw.barrier && typeof raw.barrier === 'object') ev.barrier = tidy(raw.barrier, 1); }
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
  if (!raw || typeof raw !== 'object') return null;
  const n = (v, lo, hi) => Math.max(lo, Math.min(hi, Number(v)));
  const r3 = (v) => { v = Number(v); return Number.isFinite(v) ? +n(v, 0, 0.35).toFixed(2) : 0; }, rs = raw.res && typeof raw.res === 'object' ? raw.res : {};
  const more = { because: String(raw.because || '').replace(/[<>]/g, '').slice(0, 90), res: [r3(rs.heat), r3(rs.cold), r3(rs.poison)], hits: ['spike', 'toxin', 'bite', 'glow', 'armor'].includes(String(raw.hits || '').replace('armour', 'armor')) ? String(raw.hits).replace('armour', 'armor') : '' };
  if (raw.place === 'wrap') {
    const fxw = {}; for (const k of ['speed', 'agility', 'reach', 'senses', 'armour', 'attack']) { const v = Number(raw.fx && raw.fx[k]); fxw[k] = Number.isFinite(v) ? +n(v, -0.3, 0.3).toFixed(2) : 0; }
    const cv = Array.isArray(raw.cover) ? raw.cover : [0.45, 1], nm = String(raw.name || '').replace(/[<>"]/g, '').trim().slice(0, 22);
    if (!nm) return null;
    return Object.assign({ name: nm, adj: String(raw.adj || '').replace(/[^A-Za-z\-]/g, '').slice(0, 16), note: String(raw.note || '').replace(/[<>]/g, '').slice(0, 110), place: 'wrap', style: ['knit', 'plates', 'stripes', 'fluff', 'plain'].includes(raw.style) ? raw.style : 'knit', cover: [+n(Number(cv[0]) || 0, 0, 0.85).toFixed(2), +n(Number(cv[1]) || 1, 0.15, 1).toFixed(2)], trim: raw.trim ? 1 : 0, colour: ['accent', 'body', 'pale', 'dark', 'glow'].includes(raw.colour) ? raw.colour : 'accent', fx: fxw }, more);
  }
  if (!Array.isArray(raw.pts)) return null;
  const pts = raw.pts.filter((p) => Array.isArray(p) && Number.isFinite(Number(p[0])) && Number.isFinite(Number(p[1]))).slice(0, 18).map((p) => [+n(p[0], 0, 1.1).toFixed(3), +n(p[1], -0.6, 0.6).toFixed(3)]);
  if (pts.length < 3) return null;
  const four = (q, k) => Array.isArray(q) && q.length >= k && q.slice(0, k).every((v) => Number.isFinite(Number(v)));
  const fx = {}; let pos = 0;
  for (const k of ['speed', 'agility', 'reach', 'senses', 'armour', 'attack']) { const v = Number(raw.fx && raw.fx[k]); fx[k] = Number.isFinite(v) ? +n(v, -0.3, 0.5).toFixed(2) : 0; if (fx[k] > 0) pos += fx[k]; }
  const worn = ['top', 'face', 'held', 'skin'].includes(raw.place);
  if (pos < 0.1 && !worn) return null;
  const pick = (v, list, d) => (list.includes(v) ? v : d);
  const tn = Array.isArray(raw.tone) ? raw.tone : [0, 1, 1];
  return {
    name: String(raw.name || '').replace(/[<>"]/g, '').trim().slice(0, 22) || 'New part', adj: String(raw.adj || '').replace(/[^A-Za-z\-]/g, '').slice(0, 16), note: String(raw.note || '').replace(/[<>]/g, '').slice(0, 110),
    place: pick(raw.place, ['sides', 'back', 'head', 'top', 'face', 'held', 'skin'], 'sides'), tint: Number.isFinite(Number(raw.tint)) && raw.tint !== null && raw.tint !== '' ? ((Number(raw.tint) % 360) + 360) % 360 : undefined, tone: raw.place === 'skin' ? [+n(Number(tn[0]) || 0, -180, 180).toFixed(0), +n(Number(tn[1]) || 1, 0.2, 1.6).toFixed(2), +n(Number(tn[2]) || 1, 0.55, 1.35).toFixed(2)] : undefined, lid: raw.place === 'skin' ? +n(Number(raw.lid) || 0, 0, 0.5).toFixed(2) : undefined, motion: pick(raw.motion, ['flap', 'sway', 'pulse', 'bristle', 'still'], 'sway'), colour: pick(raw.colour, ['accent', 'body', 'pale', 'dark', 'glow'], 'accent'),
    pts, smooth: raw.smooth !== false,
    ribs: (Array.isArray(raw.ribs) ? raw.ribs : []).filter((q) => four(q, 4)).slice(0, 6).map((q) => [+n(q[0], 0, 1.1).toFixed(3), +n(q[1], -0.6, 0.6).toFixed(3), +n(q[2], 0, 1.1).toFixed(3), +n(q[3], -0.6, 0.6).toFixed(3)]),
    dots: (Array.isArray(raw.dots) ? raw.dots : []).filter((q) => four(q, 3)).slice(0, 3).map((q) => [+n(q[0], 0, 1.1).toFixed(3), +n(q[1], -0.6, 0.6).toFixed(3), +n(q[2], 0.03, 0.16).toFixed(3)]),
    fx, because: more.because, res: more.res, hits: more.hits,
  };
}

function cleanJudge(raw, ids) {
  const list = raw && Array.isArray(raw.scores) ? raw.scores : [];
  const out = [];
  for (const q of list.slice(0, 6)) {
    const id = Number(q && q.id), score = Number(q && q.score);
    if (!Number.isFinite(id) || !Number.isFinite(score) || (ids && !ids.includes(id))) continue;
    out.push({ id, score: Math.max(0, Math.min(1, score / 10)), why: String(q.why || '').replace(/[<>]/g, '').slice(0, 140), fix: String(q.fix || '').replace(/[^a-z_]/g, '').slice(0, 20) });
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
    /** A typed being, drawn by the model as a puppet of parts. Drawn once for a word and kept: the same word is free ever after. */
    async figure(info, opts) {
      opts = opts || {};
      const word = String((info && info.word) || '').trim().slice(0, 80);
      if (!word) return { error: 'empty' };
      if (refused(word)) return { error: 'refused' };
      const key = norm(word) || 'thing', kept = store.get('figure', key);
      if (kept && !(info && info.again)) return { figure: kept.svg ? kept : null, source: 'library' };
      const m = pick(opts.model || process.env.PRIMORDIA_FIGURE_MODEL || 'claude-sonnet-5-5');
      if (!m || (opts.canGenerate && !opts.canGenerate())) return { figure: kept || null, source: kept ? 'library' : 'none' };
      let fig = null;
      for (let attempt = 0; attempt < 2 && !fig; attempt++) try {      // a drawing that came back broken or too big is asked for once more
        const raw = extractJson(await m.call({ system: FIGURE_SYSTEM, user: JSON.stringify({ kind: info && info.kind === 'wall' ? 'This is a WALL or enclosure that holds food inside it: draw it as one "body" group only, a wide round wall, dome or ring of that material seen a little from above, centred on x=100 y=120 and filling the whole width, with no face unless it is alive.' : undefined, typed: String((info && info.typed) || word).slice(0, 120), name: word, does: String((info && info.note) || '').slice(0, 160), hue: Number(info && info.hue) || 200 }), temperature: 0.8, maxTokens: 8000, ms: 120000 }));
        if (raw && raw.svg === '') { store.set('figure', key, { svg: '', by: m.id }); return { figure: null, source: 'ai', usd: spent() }; }      // it has no shape of its own: remembered, so it is not asked again
        const svg = raw ? sanitizeSvg(raw.svg, { maxLen: 44000, maxNodes: 260 }) : '';
        if (svg && /<g[\s>]/.test(svg)) {
          const pivots = {}, IDS = ['back', 'tail', 'leg-far', 'arm-far', 'body', 'leg-near', 'head', 'arm-near'];
          for (const id of IDS) { const p = raw.pivots && raw.pivots[id]; if (Array.isArray(p) && Number.isFinite(Number(p[0])) && Number.isFinite(Number(p[1]))) pivots[id] = [Math.max(0, Math.min(200, Number(p[0]))), Math.max(0, Math.min(240, Number(p[1])))]; }
          fig = { svg, pivots, floats: !!raw.floats, by: m.id };
        }
      } catch (err) { fig = null; if (opts.onError) opts.onError(err); }
      if (!fig) return { figure: kept || null, source: kept ? 'library' : 'none' };
      store.set('figure', key, fig);
      return { figure: fig, source: 'ai', usd: spent() };
    },
    /** A new build (a whole way of carrying a body) for a pond. Kept in the library; a pond is often handed one invented earlier that it does not have yet. */
    async plan(info, opts) {
      opts = opts || {};
      const have = Array.isArray(info && info.have) ? info.have.map((x) => String(x).toLowerCase()) : [];
      const known = lib('plans').items.filter((x) => x.body && !x.because && !have.includes(x.name.toLowerCase()));
      const quiet = !(info && ((Array.isArray(info.things) && info.things.length) || (Array.isArray(info.events) && info.events.length)));
      if (quiet && known.length >= 12 && rand() < REUSE * 0.5) return { plan: any(known), source: 'library' };
      const m = pick(opts.model);
      let d = null;
      if (m && (!opts.canGenerate || opts.canGenerate())) {
        try { d = cleanPlan(extractJson(await m.call({ system: PLAN_SYSTEM, user: JSON.stringify(info || {}).slice(0, 5000), temperature: 1.0, maxTokens: 900 }))); }
        catch (err) { d = null; if (opts.onError) opts.onError(err); }
      }
      if (d && !have.includes(d.name.toLowerCase())) { d.by = m.id; keep('plans', d, 400); return { plan: d, source: 'ai', usd: spent() }; }
      if (known.length) return { plan: any(known), source: 'library' };
      return { plan: null, source: 'none' };
    },
    /** A new kind of body part for a pond. Kept in the library; a pond is often handed one invented earlier that it does not have yet. */
    async design(info, opts) {
      opts = opts || {};
      const have = Array.isArray(info && info.have) ? info.have.map((x) => String(x).toLowerCase()) : [];
      const known = lib('designs').items.filter((x) => !x.because && !have.includes(x.name.toLowerCase()));
      const quiet = !(info && ((Array.isArray(info.things) && info.things.length) || (Array.isArray(info.events) && info.events.length)));
      const want = info && (info.want === 'worn' || info.want === 'condition') ? info.want : '';      // asked for something worn or a condition: always invented afresh for this pond
      if (!want && quiet && known.length >= 12 && rand() < REUSE * 0.5) return { design: any(known), source: 'library' };
      const m = pick(opts.model);
      let d = null;
      if (m && (!opts.canGenerate || opts.canGenerate())) {
        const lead = want === 'worn' ? 'THIS TIME invent a thing WORN or HELD (sort A): its "place" MUST be exactly one of "top" (on top of the head), "face" (on the face, under the eyes) or "held" (carried). Not "sides", not "back", not "head", not "wrap". ' : want === 'condition' ? 'THIS TIME invent a CONDITION (sort C): its "place" MUST be "skin", with "tone" and "lid". ' : '';
        try { d = cleanDesign(extractJson(await m.call({ system: DESIGN_SYSTEM, user: lead + JSON.stringify(info || {}).slice(0, 5000), temperature: 1.0, maxTokens: 900 }))); }
        catch (err) { d = null; if (opts.onError) opts.onError(err); }
      }
      if (d && !have.includes(d.name.toLowerCase())) { d.by = m.id; keep('designs', d, 400); return { design: d, source: 'ai', usd: spent() }; }
      if (known.length) return { design: any(known), source: 'library' };
      return { design: null, source: 'none' };
    },
    /** How striking each kind of creature looks: a verdict that becomes part of its charm. A body already judged is not judged again. */
    async judge(info, opts) {
      opts = opts || {};
      const img = info && typeof info.image === 'string' && info.image.length > 2000 && info.image.length < 900000 && /^image\/(png|jpeg)$/.test(String(info.mime)) ? { mime: info.mime, b64: info.image } : null;
      const list = (Array.isArray(info && info.creatures) ? info.creatures : []).slice(0, img ? 6 : 4).map((c) => ({ id: Number(c && c.id), name: String((c && c.name) || '').slice(0, 40), kind: String((c && c.kind) || '').slice(0, 60), body: String((c && c.body) || '').slice(0, 300) })).filter((c) => Number.isFinite(c.id) && c.body);
      if (img && info.lean) {
        const n = Math.max(1, Math.min(16, Number(info.count) || 12)), refs = Math.max(0, Math.min(8, Number(info.refs) || 0));
        const wm = pick(opts.model || process.env.PRIMORDIA_WATCH_MODEL || process.env.PRIMORDIA_JUDGE_MODEL || 'claude-sonnet-5-5');
        if (!wm || (opts.canGenerate && !opts.canGenerate())) return { judge: null, source: 'none' };
        let out = null;
        try {
          const raw = extractJson(await wm.call({ system: WATCH_SYSTEM, user: 'There are ' + n + ' creatures on the sheet, numbered 1 to ' + n + '.' + (refs ? ' The first row holds ' + refs + ' reference characters, each marked with a gold star instead of a number: they are the best this pond has made so far, shown only so you can compare. Do not grade them. Grade only the numbered creatures, by the same standard as always; a numbered creature that is clearly lovelier than the stars deserves a higher mark than they would get, and one that is clearly less lovely a lower one. Different kinds of creature, features and colours are welcome.' : ''), image: img, temperature: 0.3, maxTokens: 160 + n * (50 + 8 * WATCH_MARKS.length) }));
          const g = raw && Array.isArray(raw.g) ? raw.g : [];
          out = g.filter((q) => Array.isArray(q) && Number.isFinite(Number(q[0])) && Number.isFinite(Number(q[1])) && Number.isFinite(Number(q[2])) && q[0] >= 1 && q[0] <= n).slice(0, n).map((q) => ({ id: Number(q[0]), score: Math.max(0, Math.min(1, Number(q[1]) / 10)), whole: Math.max(0, Math.min(1, Number(q[2]) / 10)), why: String(q[3] || '').replace(/[<>]/g, '').slice(0, 70), fix: '', m: WATCH_MARKS.reduce((o, mk, k) => { const v = Number(q[(typeof q[4] === 'string' ? 5 : 4) + k]); if (Number.isFinite(v)) o[mk.id] = Math.max(0, Math.min(1, v / 10)); return o; }, {}) }));
        } catch (err) { out = null; if (opts.onError) opts.onError(err); }
        if (!out || !out.length) return { judge: null, source: 'none' };
        return { judge: { scores: out }, source: 'ai', usd: spent(), model: wm.id };
      }
      if (!list.length) return { judge: null, source: 'none' };
      const keyOf = (c) => norm(c.kind + ' ' + c.body).slice(0, 200);
      const known = img ? [null] : list.map((c) => store.get('judge', keyOf(c)));
      const judgeModel = opts.model || process.env.PRIMORDIA_JUDGE_MODEL || 'claude-sonnet-5-5';      // a picture is graded afresh: no two are alike
      if (known.every(Boolean)) return { judge: { scores: list.map((c, i) => ({ id: c.id, score: known[i].score, why: known[i].why })) }, source: 'library' };
      const m = pick(judgeModel) || pick(opts.model);
      let scores = null;
      if (m && (!opts.canGenerate || opts.canGenerate())) {
        try { scores = cleanJudge(extractJson(await m.call({ system: JUDGE_SYSTEM, user: JSON.stringify({ check: info && info.check ? String(info.check).slice(0, 240) : undefined, world: Array.isArray(info && info.world) ? info.world.slice(0, 4).map((x) => String(x).slice(0, 120)) : undefined, creatures: list }), image: img, temperature: 0.5, maxTokens: 1200 })), list.map((c) => c.id)); }
        catch (err) { scores = null; if (opts.onError) opts.onError(err); }
      }
      if (!scores) return { judge: null, source: 'none' };
      if (!img) for (const s of scores) { const c = list.find((x) => x.id === s.id); if (c) store.set('judge', keyOf(c), { score: s.score, why: s.why, by: m.id }); }
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
    /** A marvel for one lucky creature of this pond. */
    async marvel(info, opts) {
      opts = opts || {};
      const have = Array.isArray(info && info.have) ? info.have.map((x) => String(x).toLowerCase()) : [];
      const known = lib('marvels').items.filter((x) => !have.includes(String(x.name).toLowerCase()));
      const m = pick(opts.model || process.env.PRIMORDIA_MARVEL_MODEL);
      let o = null;
      if (m && (!opts.canGenerate || opts.canGenerate())) {
        try { o = cleanMarvel(extractJson(await m.call({ system: MARVEL_SYSTEM, user: 'The pond and the creature: ' + JSON.stringify(info || {}).slice(0, 5000), temperature: 1.0, maxTokens: 1600, ms: 60000 }))); }
        catch (err) { o = null; if (opts.onError) opts.onError(err); }
      }
      if (o) { o.by = m.id; keep('marvels', o, 300); return { marvel: o, source: 'ai', usd: spent() }; }
      return { marvel: null, source: 'none' };
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
      if (opts.auto) {
        // nobody typed anything: the pond does something to itself, made up from what is going on in it. Never kept, never repeated.
        const am = pick(opts.model || process.env.PRIMORDIA_EVENT_MODEL);
        if (!am || (opts.canGenerate && !opts.canGenerate())) return { event: null, source: 'none' };
        let av = null;
        try { av = cleanEvent(extractJson(await am.call({ system: EVENT_SYSTEM, user: 'Nobody typed anything. YOU decide what happens to this pond now, by itself: its own weather, a visitor, an upheaval, a windfall, a wonder, a danger. Make it grow out of what is going on in the pond (told below), or break in on it from outside; let it be something that will push its creatures to change. Do not repeat anything in its recent events, and do not fall back on plain cold, heat or dark: invent. Keep it survivable: it should shake the pond, not empty it. The pond: ' + JSON.stringify(opts.pond || {}).slice(0, 5000), temperature: 1.0, maxTokens: 1800, ms: 60000 })), ''); }
        catch (err) { av = null; if (opts.onError) opts.onError(err); }
        return av ? { event: av, source: 'ai', model: am.id, usd: spent() } : { event: null, source: 'none' };
      }
      if (!text) return { error: 'empty' };
      if (refused(text)) return { error: 'refused' };
      const ekey = 'ev2:' + text.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
      const seen = store.get('word', ekey) || { variants: [] };
      if (seen.variants.length >= 4 || (seen.variants.length && rand() < REUSE * 0.6)) return { event: any(seen.variants), source: 'library' };
      // staging an event out of regions, strikes and timing takes a model that can plan: the small ones flatten it into weather
      const m = pick(opts.model || process.env.PRIMORDIA_EVENT_MODEL);
      let ev = null;
      if (m && (!opts.canGenerate || opts.canGenerate())) {
        try { ev = cleanEvent(extractJson(await m.call({ system: EVENT_SYSTEM, user: 'The player typed: ' + JSON.stringify(text), temperature: 1.0, maxTokens: 1800, ms: 60000 })), text); }
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
// US dollars per million tokens: [input, output, cached input]. Checked on 2026-10-08 against the providers' own pages:
//   https://platform.claude.com/docs/en/about-claude/pricing   and   https://developers.openai.com/api/docs/pricing
// Add or correct a price without touching code: PRIMORDIA_PRICES='{"model-id":[in,out,cachedIn]}'.
// A model with no price is counted in tokens and reported as unpriced; its cost is never guessed.
const PRICES_CHECKED = '2026-10-08';
const PRICES = Object.assign({
  'claude-haiku-5-5': [0.1, 0.5, 0.01],      // for prompts up to 100,000 tokens (ours are a few thousand); above that it is five times as much
  'claude-haiku-4-5-20251001': [1, 5, 0.1],
  'claude-sonnet-5-5': [2, 10, 0.1],
  'claude-opus-5-5': [4, 20, 0.2],
  'claude-fable-5-1': [10, 50, 0.25],
  'gpt-6.1-sol': [2, 10, 0.1],
  'gpt-6-sol': [2, 10, 0.2],
  'gpt-6-astra': [10, 50, 1],
  'gpt-5.6-luna': [0.2, 1.2, 0.02],
  'gpt-5.6-sol': [4, 20, 0.4],            // OpenAI calls this promotional pricing, good at least through 2026-11-21: check it again then
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
  return async function callModel({ system, user, temperature, maxTokens, image, ms }) {
    const body = { model, max_tokens: maxTokens || 800, temperature: temperature === undefined ? 1 : temperature, system, messages: [{ role: 'user', content: image ? [{ type: 'image', source: { type: 'base64', media_type: image.mime, data: image.b64 } }, { type: 'text', text: user }] : user }] };
    const headers = { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' };
    let j;
    try { j = await postJson('https://api.anthropic.com/v1/messages', headers, body, ms || (image ? 50000 : 30000)); }
    catch (e) { if (e.status !== 400) throw e; delete body.temperature; j = await postJson('https://api.anthropic.com/v1/messages', headers, body, ms || (image ? 50000 : 30000)); }   // some models choose their own temperature
    // Anthropic reports cache reads and writes apart from input_tokens; this server sends no cache markers, so they are normally 0, but they are counted if present
    const u = j.usage || {}, cr = u.cache_read_input_tokens || 0, cw = u.cache_creation_input_tokens || 0;
    meter(model, (u.input_tokens || 0) + cr + Math.round(cw * 1.25), u.output_tokens, cr);
    return (j.content || []).map((c) => c.text || '').join('');
  };
}

/** OpenAI's Chat Completions API. Returns the text of the answer. */
function openaiCaller(apiKey, model) {
  const thinks = /^(gpt-5|o\d)/.test(model);     // these reason first: no temperature, and they need room to think
  return async function callModel({ system, user, temperature, maxTokens, image, ms }) {
    const body = { model, messages: [{ role: 'system', content: system }, { role: 'user', content: image ? [{ type: 'text', text: user }, { type: 'image_url', image_url: { url: 'data:' + image.mime + ';base64,' + image.b64 } }] : user }], max_completion_tokens: (maxTokens || 800) + (thinks ? 2500 : 0) };
    if (thinks) body.reasoning_effort = 'minimal'; else body.temperature = temperature === undefined ? 1 : temperature;
    const headers = { authorization: 'Bearer ' + apiKey };
    let j;
    try { j = await postJson('https://api.openai.com/v1/chat/completions', headers, body, ms || 40000); }
    catch (e) { if (e.status !== 400) throw e; delete body.temperature; delete body.reasoning_effort; j = await postJson('https://api.openai.com/v1/chat/completions', headers, body, ms || 40000); }
    // completion_tokens already includes the model's hidden reasoning; cached prompt tokens are billed at the cheaper rate
    meter(model, j.usage && j.usage.prompt_tokens, j.usage && j.usage.completion_tokens, j.usage && j.usage.prompt_tokens_details && j.usage.prompt_tokens_details.cached_tokens);
    return String((j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || '');
  };
}

// The models a player may choose between. Small and quick first; the first one a key exists for is the default.
const CATALOG = [
  { id: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5', provider: 'anthropic' },
  { id: 'claude-haiku-5-5', label: 'Claude Haiku 5.5', provider: 'anthropic' },
  { id: 'gpt-5.4-mini', label: 'GPT-5.4 mini', provider: 'openai' },
  { id: 'gpt-5.4-nano', label: 'GPT-5.4 nano', provider: 'openai' },
  { id: 'gpt-5.6-terra', label: 'GPT-5.6 Terra', provider: 'openai' },
  { id: 'gpt-6-luna', label: 'GPT-6 Luna', provider: 'openai' },
  { id: 'gpt-5.6-luna', label: 'GPT-5.6 Luna', provider: 'openai' },
  { id: 'claude-sonnet-5-5', label: 'Claude Sonnet 5.5', provider: 'anthropic' },
  { id: 'gpt-6.1-sol', label: 'GPT-6.1 Sol', provider: 'openai' },
  { id: 'gpt-6-sol', label: 'GPT-6 Sol', provider: 'openai' },
  { id: 'gpt-5.6-sol', label: 'GPT-5.6 Sol', provider: 'openai' },
  { id: 'claude-opus-5-5', label: 'Claude Opus 5.5', provider: 'anthropic' },
  { id: 'claude-fable-5-1', label: 'Claude Fable 5.1', provider: 'anthropic' },
  { id: 'gpt-6-astra', label: 'GPT-6 Astra', provider: 'openai' },
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

module.exports = { attachBooks, PRICES, meterUsd, getUsage, underDailyCap, createAi, anthropicCaller, openaiCaller, modelsFromEnv, CATALOG, cleanPlan, cleanThing, cleanIdea, cleanOrgan, cleanEvent, cleanStory, cleanSkin, cleanJudge, cleanDesign, extractJson, refused, jitter, MAX_VARIANTS };
