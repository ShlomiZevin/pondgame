# Primordia: the genetic algorithm as it stands (2026-10-06)

Written for whoever reviews the algorithm next. It says what the goal is, how the loop works today, what was measured,
and what does not work yet. The owner's verdict on the current state: **"we are still not there."**

## The goal, in the owner's words

- From a bare circle, generation by generation, the pond should grow **adorable, clean, lovable, collectible creatures**
  ("a sweet snail with a sword", "a vampire cat"), by nothing more than a genetic algorithm: take the nicest with the
  nicest, add some mutation, repeat.
- Fitness is two things the eye judges: **beauty** (nice to the eye) and **wholeness** (a whole, full creature like an
  animal, a person or a monster, as against a small simple thing such as a ball with wings).
- "The universe must have a watcher": something has to look and pick the nicest. Here that is the AI.
- Both numbers should climb towards 9–10. Change should look like real evolution: gradual, with visible lineage.
- Creatures should also answer what happens in their world (an ice age, a knight). That part exists and works; it is not
  the open problem.

## How a body is described (the genome that matters here)

`game/src/21b_body.js`, `21_form.js`. A body is 1–3 **masses**; each has an outline of 10 radii, optional lobes, a size,
the mass it grows from, an angle, a distance (pressed in / on a stalk), may be a mirrored pair, may be a ring. One gene
says whether it faces you or is seen from the side; one says which mass carries the face. On top: up to 4 **growth
rules** (legs, fins, spikes, tentacles, feelers, plates, frills, horns, or an AI-invented part), eyes (0–3, size), mouth,
tail, coat, pattern, colours. Crossover takes each mass from one parent or blends the two. `22_portrait.js` draws it
(the `free` branch).

## The loop today

Per generation (`30_world.js`): spring (breed + mutate) → summer (live, eat) → autumn (score) → winter (select).

1. **Two marks per creature**, each 0..1: `ph.charm` (beauty) and `ph.whole`. `G.charmOf(c)` = their mean ("appeal").
2. **Score** (`endAutumn`): `fit = clamp(fed / 0.5, 0, 1) × (0.15 + 0.85 × appeal)`. Being fed is a bar to clear; among
   the fed, appeal decides.
3. **Breeding** (`startSpring`): children by energy (0–3), then by appeal rank: plainest third get none, middle third at
   most one, nicest third one extra. Mates are chosen mostly for appeal (`findMate`), among compatible creatures nearby.
   Crossover 85% when a mate is found.
4. **Winter** (`startWinter`): ranked by `fit × rarity` (rare silhouettes and colours are favoured, to keep several kinds
   alive); the top 15% by appeal are protected from the sickness that thins an over-common kind.
5. **Mutation** (`F.mutate`, `G.body.mutate`): structural changes are rare (about 7% and 4% of births), most change is
   drift. A body with too much on it (`G.body.busy(f) > 6.5`) tends to shed something.

### Where the two marks come from

- **The watcher** (`48_judge.js`, `G.watchTick`; server `WATCH_SYSTEM` in `lib/ai.js`): every ~9 s the game draws up to
  12 living creatures on one sheet and the model (Sonnet by default) returns beauty, whole and a few words for each.
  About $0.004 a sheet. Those are the creature's real marks (`c.real`).
- **Between looks** a creature carries an estimate (`c.eb`, `c.ew`), set at birth in `G.makeCreature`: its parents' marks,
  moved by half the difference the surrogates see between it and them, then pulled towards the marks of really-judged
  creatures that resemble it (`W.eyeBank`, a kernel on `G.features`). Each new real mark also corrects living look-alikes.
- **The surrogates** (`21c_taste.js`): beauty is a linear function of ~50 visible features, fitted by ridge regression to
  294 pictures graded by Opus and Sonnet (`scripts/taste.js`, `taste-fit.js`); wholeness is a hand-written anatomy score
  (`F.whole`). Without a server these are all there is.

## What was measured

`node scripts/rise.js <tag> claude-sonnet-5-5 1` runs a pond from a cell with the AI live, sets aside the commonest kinds
at several generations, then has a **blind** judge grade all of them shuffled. Single runs, so read them as indications.

| what was running | blind beauty, gen 4 → ~320 | blind whole | note |
|---|---|---|---|
| surrogate only, no AI in the loop (run a) | 1.0 → 4.2 → 4.7 → 5.8 → 6.0 → 6.5 | not graded | a clean rise; an 8 appeared at the end |
| Haiku grading kinds live (run c) | about 5, falling to 2 | not graded | Haiku marks nearly everything 7–9: harmful as a judge |
| Sonnet grading kinds live (run d) | 2 → 7 → 5.5 → 3 → 4.6 | not graded | no rise |
| watcher, grades not reaching anyone (run e) | 2.0 → 4.4 → 5.8 → 5.7 → 7.0 → 7.3 | 1.0 → 2.2 → 3.6 → 4.2 → 4.0 → 5.0 | best result; effectively surrogate + strict wholeness |
| watcher + look-alike correction (run f, current code) | 2.0 → 5.7 → 5.8 → 5.0 → 5.7 → 5.3 | 1.0 → 3.3 → 3.0 → 3.4 → 3.7 → 3.7 | **the pond believed 8.2 / 8.5 while the judge saw 5.3 / 3.7** |

## What is wrong, as far as I can tell

1. **The pond's belief runs ahead of the truth.** Selecting the highest *estimates* every generation accumulates upward
   error (the winner's curse). At fast-forward a generation takes under a second and the watcher looks every 9 s, so most
   creatures are never really seen (`looked-at 0/133` in every fast run). The last change (look-alike correction) was meant
   to fix that and, in the one run made, did not.
2. **The surrogate for beauty is weak**: held-out correlation with the judge is 0.59 (a boosted-tree model was no better,
   so it is the features, or the judge's own noise). It was never shown anything above 8.
3. **Wholeness is capped by the drawing vocabulary.** The judge gives 4–5 ("a simple critter") to the best bodies. A
   "full character" needs a torso with legs *and* arms, a neck, proportions; the painter only recently learnt that a
   second pair of limbs on a standing mass is arms. Nothing yet evolves towards a human-like or beast-like build.
4. **Speed versus honesty.** At 1× the watcher can see most newborns and its marks are the fitness; at 64× it cannot.
   Nothing ties the pace of evolution to the pace of looking.
5. **Diversity mechanisms pull against convergence** (rarity bonus, sickness of the common kind), and species turn over
   every few generations, so a lineage rarely holds its gains.
6. Typed beings (a "knight") are still drawn by the old painter from a tiny vocabulary: they cannot look human or hold a sword.

## Ideas not tried

- Evolve only as fast as the watcher can look (generations gated by grading), or run selection in tournaments the
  watcher judges directly.
- Have the watcher compare pairs ("which is nicer?") instead of giving absolute marks; rank-based selection from that.
- Shrink every estimate towards the pond's real average each generation, so belief cannot inflate.
- A richer body vocabulary aimed at whole characters (torso, neck, shoulders, hips; limb pairs with joints) so that
  "whole" has somewhere to go.
- Let the AI propose the next generation's variants of a chosen parent and grade its own proposals.

## Costs seen

Watcher sheet (12 creatures, Sonnet): about $0.004. A live fast run of ~320 generations: $0.06–0.11 in all. Training
the surrogate: $0.40 (Opus, 162 pictures) + $0.17 (Sonnet, 132 pictures). Opus is expensive; the owner asked to go easy on it.

## Files

`game/src/21b_body.js` bodies · `21c_taste.js` surrogates · `21_form.js` growths, mutation, crossover · `22_portrait.js`
drawing · `30_world.js` the loop (`makeCreature`, `startSpring`, `endAutumn`, `startWinter`, `charmOf`) · `48_judge.js`
watcher · `lib/ai.js` prompts (`WATCH_SYSTEM`, `JUDGE_SYSTEM`, `PLAN_SYSTEM`, `DESIGN_SYSTEM`) · `scripts/rise.js` the
test · `scripts/taste.js`, `taste-fit.js` the training · `game/tools/evo-test.js` the same test without a browser or AI.
The game's working copy is `plaxzy-creator/local-games/primordia/`; `npm run pull-game` copies it here.

## Round 2 (2026-10-06): towards Pixar-like creatures

What changed, and what was measured. The owner's goal: lovable, whole, Pixar-like creatures, by the genetic algorithm, with the AI as the watcher at a cost of cents to tens of cents at 64×.

**Genes (21_form.js, 21b_body.js).** New face and proportion genes on the form: `eg` eye gap, `ey` eye height, `ep` pupil, `bl` blush, `sm` smile. Eye size (`es`) can now reach 0.9 and head size (`hd`) 2.5. They mutate, cross over with the eyes and mouth groups, are packed after the body (old saves load with defaults) and are drawn in `22_portrait.js` (`face()`, `F._pupil`). A new mass now buds below the face more often than above it (a body under a head, not a hat).

**Taste (21c_taste.js).** 11 features appended to the beauty surrogate (`eyeBig, eyeLow, eyeSet, pupil, smile, blush, headBig, round, stubby, tidy, spiky`) with hand-set priors. The surrogate now has 63 weights; `scripts/taste-fit.js` and `taste-data.json` still hold the old 52 columns, so refitting needs the new features added to the data first.

**The watcher (48_judge.js, lib/ai.js `WATCH_SYSTEM`).** Beauty is now explicitly "how Pixar-like" (big head, small body, big glossy wide-set low eyes, small mouth, soft shapes, bold silhouette, stubby limbs, few colours, one touch of character). It also names ONE gene change per creature from a fixed list (`F.NUDGES`, now 26 entries including `eyes_apart`, `eyes_lower`, `pupils_bigger`, `blush`, `bigger_head`, `smaller_body`, `legs`, `arms`). The advice goes three ways: to the creature's own children, to its species, and into a pond-wide pool (`W.advice`, last 40 generations) that any child may draw from, so one look steers the whole pond. Sheets hold up to 16 creatures.

**Honest selection (30_world.js `charmOf`, 48_judge.js).** A creature nobody has looked at is held back towards the pond's average of what the watcher really said (the more guesses stand between it and a look, the more), which removes the winner's curse. After every look the pond's taste is replayed over the last 160 real marks (3 passes), so its guesses keep up with the watcher.

**Cost control.** The watcher looks every 5 s while it is cheap, then 9 s, 16 s, 60 s as its own spending passes 35%, 70% and 100% of `G.WATCH_BUDGET` ($0.30 a session). This holds for any model: on Terra the first version of this round (fixed 5 s) cost $0.70–0.80 by generation 300.

**Size and response (44_pressure.js, 20_genome.js).** `W.press.size`: danger (kills, fights, things that eat creatures) favours bigger bodies, scarce food, thin air and heat smaller ones; mutation leans that way and says why ("grew bigger, to be too big to bite"). In `tools/react-test.js` three hunters took mean size from 13.7 to 22 in 45 generations, with colour camouflage and armour as before. Size only changes between generations (no growth within a life).

**Stock shapes (45_plans.js).** Added Bean Baby, Plush Cub, Little Hero, Pudgy, Sleepy Bun (big face mass, small body below). Removed Tuft Bearer, Star Body, Halo and Totem.

**Measured** (`scripts/rise.js`, live Sonnet watcher, blind Sonnet judge, one run each so read as indications; 'beauty' is now the Pixar-aware mark):

| run | blind beauty gen 4 → ~25 → ~60 → ~120 → ~200 | blind whole at ~200 | AI cost |
|---|---|---|---|
| cute1 (genes + prompt) | 1.0 → 4.5 → 6.2 → 4.5 → 4.3 | 2.8 | $0.14 |
| cute2 (+ replay, faster looks) | 1.0 → 5.2 → 4.3 → 5.2 → 4.8 | 2.8 | $0.10 |
| cute3 (+ pond-wide advice, legs/arms, 16 per sheet) | 1.0 → 5.0 → 4.7 → 5.3 → 5.8 | 3.6 | $0.14 |
| cute4 (+ bud below, stock shapes) | 1.0 → 3.0 → 5.7 → 4.0 → 4.7 | 3.7 | $0.13 |

Earlier runs of the same test (table above, older prompt) read 5.3–7.3 beauty and 3.7–5.0 whole at the end; this round did not beat those numbers, but the judge is also stricter now (it asks for Pixar-likeness), so they are not directly comparable. This round is therefore not proven better by the numbers alone; the pictures are clearly different. What is visible: big-eyed, round, small creatures with ears, wings and stubby feet; the pond answers hunters and cold.

**Still not there.** Wholeness stays near 3–4 (the judge wants head, torso, arms and legs reading as one standing person or animal; the painter and the three-mass body only just allow that). Spikes and wings from pond pressures (a swordfish, say) cost beauty and still win some ponds. At 64× the watcher sees only a few percent of the creatures, so the advice pool and the replayed taste do most of the work. Ideas not tried: a standing-character body (torso with neck, shoulders, hips and limbs with joints) as a body vocabulary; softer drawing of spikes; evolution paced by looking (generations gated on marks).

### Round 2b (same day): holding the gains over a long run

The owner's pond (Terra) peaked, then beauty and whole fell and it collapsed into one finned look by generation 338. `tools/oracle-test.js` reproduces this without paying: a stand-in watcher with a hidden Pixar-like taste marks 16 creatures every few generations. Baseline: true beauty 9.0 at gen 69 down to 4.6 at gen 345 (seed 23), while the pond "believed" 10/10 throughout. Cause: the pond's belief hit the 10/10 ceiling, so selection could not tell good from better and drifted. Fixes: (1) `F.beauty` has a soft ceiling instead of a clamp (order among the best is kept); (2) a hall of fame (`W.hall`, 8 distinct best creatures the watcher really saw) from which 1–2 children a spring are born, crossed with a good survivor; (3) the prompt and priors punish added parts (fins, wings, horns, spikes) harder: the owner prefers a plain round plush with a huge face (`scripts/cute.js` gallery); (4) the watcher now looks at ONE creature per species (the one the pond thinks best), skips a species looked at in the last 6 generations, and makes no call when fewer than four kinds are due. Oracle run after: 7.7 → 8.6 (seed 11), 7.1 → 9.0 → 6.8 (seed 23, wobbles but does not collapse). Live blind judge (Sonnet, 300 generations): beauty 4.2, 4.5, 3.8, 5.0, then 6.4 at gen 300 ("huge glossy eyes, pink plush, simple"), whole 4.0; the AI spent $0.17 in all.

Costs from `data/books__all.json` (all kinds of call, all time): Haiku $0.0027 a call, Terra $0.0067, Sonnet $0.0084. The watcher is the only call made repeatedly; it is limited by the clock (5, 9, 16 then 60 s as it spends) and by `G.WATCH_BUDGET` ($0.30 a session).

### Round 2c: variety, and steering towards the owner's favourite look

The owner's Haiku pond at gen 304 was lovable (big-eyed frogs) but all one green kind, and he prefers the plain plush look of `scripts/cute.js` (round head over round body, huge glossy eyes, stubby feet). Changes: (1) advice from the watcher now goes only to look-alikes (nearest advice in feature space), not the whole pond, and heirlooms from the hall of fame are crossed with the survivor nearest to them, so lineages are refreshed rather than blended into one; (2) a `sig` taste feature and a rewritten prompt reward ONE or TWO real-animal signature features (horns, fins, ears, shell, tail, coat, markings), call bare blobs bland and more than three clutter, and ask for variety; (3) the judging sheet now starts with a row of four starred REFERENCE characters (`G.referenceForms`, the hand-set plush look) that stand for a 9, and the prompt asks how close each numbered creature comes to being as lovable as the stars, in its own way (about 30% more image per call); (4) the stock plush shapes carry face settings (`face` on a plan: big eyes, rosy cheeks, smile, big head) that come with them when a child adopts the shape, and the stock leans 65% to them. `tools/oracle-test.js` now reports diversity (effective number of look-alike kinds and colours). Live run (Sonnet watcher, blind Sonnet judge, 300 generations, $0.16): beauty 5.0, 4.2, 4.5, then 6.5 at gen 301, whole 4.3, with horned, eared, winged and tendrilled kinds side by side.
