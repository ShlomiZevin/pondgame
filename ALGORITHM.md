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
