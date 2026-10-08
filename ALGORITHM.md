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

### Round 2d: whole characters, and a corrected test

**A bug in `tools/oracle-test.js` (fixed).** The stand-in watcher returned marks on 0–10 where the game takes 0–1, so every mark clamped to 1.0 and the pond "believed 10/10". The round 2b/2c oracle numbers above were measured with that broken judge and should not be trusted; the live (real AI) runs were not affected. With the fix (marks scaled to the real judge's range, about 0.64) the pond's belief matches the marks (taste 0.61 against marks 0.64). Fair comparison over 260 generations, two seeds: with the advice pool and hall of fame, true beauty stays 7–8.7 and whole 7–8 (one seed 5.0 once); without them, whole falls to 3.2–3.4 in one seed. So they are kept.

**The AI as design critic.** `scripts/crit.js` draws eight hand-set characters and has the watcher grade them blind; `scripts/ask-crit.js <tag> "<question>"` asks the model what it would change, looking at the sheet (about 1.5 cents). Its verdict on "whole": every character was an egg with limbs on its edge: no head set apart from a torso, limbs pinned to the outline, no joints, flat shading. Changes made in `22_portrait.js`: head and torso are separate masses, each lit on its own, with the head's chin shadow and outline over the torso, a belly highlight; limbs are thicker and longer, jointed (elbow, knee), highlighted, with toes and bigger hands; brows over the eyes. Hand-set characters went from beauty 4–6 / whole 2–5 to 6–8 / 4–6 (the chibi with ears reached 8/6).

**Plush shapes come as a kit.** A plush plan carries a face (`face`) and a kit (`kit`: stubby legs, little arms) that a child gets when it adopts the shape. The reference row on the judging sheet is four of the hand-set characters with legs and arms.

**Whole is learned.** The hand-written wholeness (`F.whole`) was giving about 7 where the real judge said 3–4, so selection was working to a false mark. It now has a learned residual (`T.wb`, `T.ww`, `F.wholeBelief`, `F.learnWhole`) taught by the watcher's real whole marks the same way as beauty, and used in `G.derive`, births and the refresh after each look. The watcher's whole rubric now describes anatomy as an animator would (head a ball on its own torso, shoulders and hips, hands and feet you can count, a stance) and caps an egg with limbs on its edge at 5.

**Colour.** New-colour mutation is 2.5 times as common and a common colour is penalised more in winter.

**Live runs (Sonnet watcher, blind Sonnet judge, ~$0.15 each):** best individuals get beauty 7–8 and whole 5 (a horned, big-eyed, standing character); pond averages stay near beauty 5–6, whole 3.5–4.6, noisy from run to run. The pond now holds owl-like, imp-like and bear-like characters side by side. Not solved: the average is still well below the best, and a single character that the judge calls whole 8–9 has not appeared.

### Round 2e: whole characters from the AI, outfits, clutter limit (not committed yet)

(1) The AI plan now designs a WHOLE CHARACTER: body shape plus `face` (eyes, pupils, blush, smile, head), `limbs` (length, thickness, hand size), `stance`, `tail`, `outfit` and `kit` (legs, arms); the stock plush shapes get the same with random variation. (2) New genes: limb length `ll`, thickness `lw`, hand and foot size `hs`, stance `st` (the whole character leans from its feet, the arm on the leaning side rises), outfit `cl` (1 scarf, 2 belt, 3 gloves and boots, 4 hair tuft; drawn in an accent colour, counts as a signature feature). Limits matter: the first version let limbs reach 1.7× and evolution made spidery arms with no torso, so they are capped at 1.4×, the lean at ±0.35, and the taste rewards limbs that are sturdy and ordinary (peak at ll·lw about 1.2). (3) Painter, from the AI critic's second list: a ground shadow, shoulder and hip bulges, tapering limbs. Spikes and crests are drawn as soft rounded nubs, because the pond's hunters and hazards make them useful and the judge hated sharp ones. (4) Clutter: a parent with `busy` above 7.2 almost never breeds, a creature's fitness falls above 6, and shedding starts at 6. (5) Selection weighs whole at 58% against beauty 42%.

Live runs (Sonnet, ~$0.15–0.18 each, blind Sonnet judge) vary a lot from run to run: blind beauty mid-run 4–6, at generation 300 4.5–6.2; whole 2.5–4.8. Individual creatures reach beauty 7 and whole 6 around generation 100 (a big-eared lavender character, a pink standing one), then late-run clutter and long limbs pull the common kinds down. Hand-built characters grade beauty 5–8, whole 4–5, and the grader sees the new outfits (a bow tie, a belt, a mohawk). One server only, on 8787: `primordia-one-server` in the owner's memory.

### Round 2f: generic, and what the stall turned out to be

**Principle (the owner's): nothing is forced.** The algorithm names no kind of animal and prescribes no anatomy. I had slipped three things in and took them out: stock shapes carried a fixed face, legs, arms, tail and outfit and were picked 65% of the time; a row of four hand-set plush biped "reference" characters sat on every judging sheet; and the wholeness score and the judge's rubric assumed a standing, two-handed character. Now: the reference row is the pond's own hall of fame (the best the watcher has really seen, only for comparison, absent until there is one); `F.whole` scores completeness without naming any kind (a face, some way of getting about, the parts that finish a creature of its sort, a body of its own, nothing piled on); the watcher prompt (`WATCH_SYSTEM`) asks two questions in the AI's own understanding, NICE (is this a nice creature: appealing, lovable, with character) and WHOLE (a complete living being of its own sort; no body plan is preferred), says any kind or shape can be both, and gives no checklist. A fish, a worm, a jellyfish or something nobody has named can score 9. The plan prompt lists kinds only as examples to avoid copying.

**The starting taste is the AI's own, fitted offline once.** `scripts/taste2-gen.js` evolves ponds with no AI and keeps a random sample of the creatures alive at several moments (not the best of them); `scripts/taste2.js` has the watcher grade them (237 creatures, Sonnet, $0.14); `scripts/taste2-fit.js --write` fits beauty (held-out r 0.55) and a correction to wholeness (r 0.62) and writes them into `F.TASTE0`. The hand-written wholeness had said 9.5 out of 10 on average where the AI said 3.6 (r 0.36), so the pond believed every creature nearly perfectly whole and selection had no signal on whole. This was the main cause of the stall in whole. The pond goes on learning from every look (the taste and the wholeness correction are replayed over the last 160 real marks).

**What the watcher looks at.** A sheet is one creature per species (the one the pond thinks best) plus up to four ordinary creatures picked at random, so the pond's belief is tested on the creatures it has, not only on its favourites. Looks are every 2.5 s while cheap (a look costs about a quarter of a cent on Sonnet), slowing as the session's looking approaches `G.WATCH_BUDGET` ($0.40).

**Size.** Creatures can grow much bigger (ceiling `22 + 8·(parts − 1)`, storage grows a little faster than upkeep, a small upward drift), limited by food and by the pond. After 150–180 generations the average size reaches 24–28 against 22 before.

**Diversity.** Fitness sharing: a creature in a crowd of look-alikes (distance in `G.features`) counts for less in winter, on top of the older shape and colour terms.

**Experiments that did not help (removed).** With a stand-in watcher given hidden tastes the pond cannot model (colour pairing, an interaction, idiosyncrasy), 3 seeds × 300 generations, second-half true beauty / whole / diversity: plain 8.2 / 6.9 / 12.5; fitness sharing 8.0 / 7.0 / 12.8 (steadier between seeds, kept); a discount on guesses far from anything verified 7.8 / 6.7 / 7.4; looking at random members of a species 7.9 / 6.4 / 9.1; stepping mutation up when progress stalls 6.8 / 5.9 / 18.7; selection more intense 8.6 / 6.4 / 15.0; nicer parents mutate less 8.1 / 6.0 / 10.8. Seed-to-seed variation is about ±0.6, so none of them beat the plain pond. The stand-in judge could not reproduce the live stall (its taste is too easy to model); the live stall was the miscalibrated wholeness belief above.

**Live (Sonnet watcher and blind Sonnet judge, 300 generations, $0.23):** blind beauty 4.3, 6.0, 6.0, 5.3 and whole 3.2, 4.7, 5.3, 4.2 at generations 42, 100, 202, 300; individuals reach beauty 7 and whole 7 (this pond grew a family of big-eyed, winged and eared jellyfish-like creatures, not two-legged ones). Typical creatures are still below the best ones.

### Round 2g: when the pond stops improving, it grows

If the mean appeal of the pond has not gone up over the last ten generations (`W.apHist`), a stall builds (`W.stall`, 0 to 1, rising 0.2 a generation, falling 0.35 as soon as it improves) and the pond turns to growing bigger: size is what there is left to improve. The drive (`W.grow`) is the stall scaled down to nothing when the pond is below 60–90% of its capacity (the big need feeding) and as the average size goes from 26 to 40. While it is on: size mutations lean upward (+0.6), a birth sometimes grows 8% in one step, size costs 20% less to keep, and in winter the bigger last longer (`sel`). A matching brake keeps ponds alive: when numbers fall below 62% of capacity size leans down, and below 50% a birth sometimes shrinks 10% (`W.popR`). The size ceiling is `26 + 9·(parts − 1)` and drifts up a little each mutation. As a last safety net, if fewer than 14 creatures are left a few small survivors turn up in a sheltered corner (`W.arkGen`). Without the brake and the net the first version drove ponds to sizes of 40–45 and some to extinction around generation 100–270. Now, over six seeds and 300 generations with the stand-in watcher, no pond goes extinct and the average size at generation 300 is 24–43 (about 33) against 22–28 before; true beauty stays 7.5–9.3 and whole 6.4–7.8. The player is told in the pond's log when the turn to growing begins.

## Round 4 (2026-10-08): the god's marks, and what growth did to beauty

Hand-over note for whoever works on the algorithm next.

**What exists now**
- The watcher returns, from the same look, five marks per creature: beauty, whole, body, balance, grandeur. The list is `G.MARKS` in `game/src/21c_taste.js` and `WATCH_MARKS` in `lib/ai.js`; a new mark is one entry in each.
- Appeal (`G.appealRaw`): core = 0.45 beauty + 0.55 whole, as before. Marks flagged `extra` (body, balance, grandeur) only add to the core, by weight x (mark - 0.5) x 2, multiplied by the core. Fitness = fed x (0.15 + 0.85 x appeal). The old clutter factor on fitness is gone.
- Further marks for unseen creatures: `G.marksBorn` (parents' marks, moved by the genes' own prior, pulled to the god's marks on look-alikes).
- Room to grow (`W.room`, read by `F.room()`): loosens the clutter limits (shedding in `F.mutate`, the breeding block, `clean`/`tidy` in the two guessers, sets of growths, number of body masses). Set only in `G.roomAfterLook`: +0.15 when the whole pond is as nice as its best and the god's body mark is 6 or more; -0.6 when niceness drops 0.02 below its best or body falls under 5. Ceiling `G.ROOM_MAX = 4`. Without AI it stays 0.

**What was measured** (`tools/oracle-test.js 300 11,23,57`, stand-in watcher, free; second-half mean of TRUE beauty / whole, three ponds)
- commit 730f03f (before any growth work): 8.7 / 6.5
- b556abf (favourite food, learning in one life): 8.8 / 6.9, so those did no harm
- 3d66e72 (limits loosened by generation number): about 6.1 beauty
- 754b412 (five marks averaged, room opened by body mark alone): 4.7 / 7.0, room at its maximum by generation 140
- a229dcd (this state): 7.4 to 8.0 / 6.2 to 6.4. Run-to-run spread is about +-0.7, so the gap to 8.7 is not established.

**Caveats, read before trusting those numbers**
- The stand-in's hidden beauty penalises busy bodies by construction (`tidy`, and -0.05 per part over 6), so in that test more parts is always worse. It cannot tell graceful complexity from clutter. The real watcher and the owner's eyes agreed that today's big bodies were ugly, but the test would say so of any big body.
- The stand-in's extra marks were written to be as lenient about "body" as the real watcher was seen to be (about 6 for anything), and its grandeur rises with the count of parts.
- The real watcher was only run for 7 looks (2.5 cents) to confirm the marks come back; no long real-AI run has been done on this state.

**Open**
- The owner wants open-ended growth into big, complex, lovely creatures. With the present body genes, "more" mostly arrives as more lumps and more sets of growths, which reads as clutter. Growth that reads well probably has to come from size, height, limb length and proportion, or from a body gene that adds structure rather than parts.
- The owner reports that evolution stalls at some point (beauty and whole flat by generation 300) and suspects ranking, mixing or mutation. Not investigated. Suggested: measure the selection differential (parents vs pond) and how much of it reaches the children.
- Owner's notes, not built: creatures that go onto the ground should evolve differently; legs should matter only to those that need them.
- Owner's rule: do not steer mutation or breeding; work only through the marks and the fitness function. No loosening by generation number.

## Round 3 (2026-10-08): honest marks, no pushed mutation, a nature per pond, land

**A bug in the free test, which voids earlier oracle results.** Since the reference row was put on the judging sheet (round 2f), `tools/oracle-test.js` graded the reference creatures too, so every mark landed on the wrong creature (shifted by up to four). With that, the god's marks had a correlation of about 0.1 with the hidden truth and nothing could be learned from them: "experiments that did not help" in 2f were measured on noise. Fixed (`.slice(input.refs)`). With the fix, three seeds reach true beauty 9.7 and whole 9.3 by generation 200. The test now also prints how well the pond's belief ranks the living creatures (`corr`, `corrT`) and the land readings. `DIAG=1` prints where accuracy is lost.

**How the god's marks reach the creatures it did not see (`48_judge.js`, `21c_taste.js`).** Look-alikes were measured with `G.features` (diet, brain wires, size; not the face). They are now measured with `G.lookVec` / `F.lookVec`: everything visible (eyes, pupils, smile, limb proportions, outfit, each mass, both colours). `G.believe(g, lv)` = the pond's taste for that body + the correction the god's real marks imply for bodies that look like it (a kernel on the taste's residuals, so a kind's level is set by one look and the differences inside the kind stay). The taste is refitted after every look by ridge regression on all remembered looks (`F.fitTaste`, leaning on `TASTE0`, recent looks weighted more), with 18 squared measures added so "big, but not too big" can be learned. The shrink of unseen creatures towards the pond's mean is lighter (10–40%).

**Selection (`30_world.js`).** Winter ranks creatures by their place in appeal (the nicest is worth four of the plainest whatever the scale of the marks); rarity of silhouette tilts it (`1.5 / (0.6 + 2·share)`), fitness sharing has a floor of 0.55. A kind kept by the pond's wish no longer has its appeal pinned at 9.2 (`charmOf`). The hard rule that a busy body almost never breeds is gone.

**Nature is not pushed.** The watcher's "fix", the advice pool and the stall-driven size push are no longer applied to mutation, and the prompt (`WATCH_SYSTEM`) no longer asks for a fix (shorter replies). What remains directed: the answers to what the pond is up against (`press`, `life`) and shedding when a body is over the room it has earned.

**Breeding.** `F.cross` takes the body's plan and the growths that sit on it from the same parent (before, legs could land on the other parent's layout); `B.cross` blends a mass only with the mass that plays the same part.

**A nature per pond (`G.pondDna`, from the seed).** Which kinds of growth turn up more often, how readily a part doubles or lobes, the first life's outline, face and colours, how often a colour jumps. Structural change is a little commoner (0.11 and 0.07 a birth), drift now and then takes a leap, colours range wider, and a body may carry six growths if it has earned the room.

**Water and land.** `g.t[5]` is breath, 0 water to 1 land; the first cells start near 0.4 (at home in both). Reach onto the land is `shore·(1 − air/0.5)`; above 0.5 the gills fade and above 0.6 the creature is kept to the land and the shallows. Land food comes mostly in the colours the pond's life eats and is richer inland. Winter keeps separate room for those that live on land, a habitat with less life than it has room for helps survival and gives a child more, and the land (`W.shore`, 16% to 42% of the map) widens with the share of life living on it. Two things that did NOT work and were removed: a pull towards the surface for air-breathers (it dragged them off their food: fed 0.3 against 0.6) and a cost for keeping both ways of breathing. Free ponds at generation 180: 22–27 land kinds, 83–90 at home in both, land 35% of the map.

**Saving.** The save was cut to 100 kB by dropping living creatures once a long game's collection, marvels and charts filled it (a pond came back with about two dozen). The limit is 400 kB (`80_save.js`, `lib/pond.js`).

**Costs.** A look is still about $0.0044 on Haiku with the larger sheet (248×256 a creature). `scripts/evolve-look.js` runs a live pond, saves a sheet of its kinds and prints the spend by kind.

**Open.** The pond's belief still runs ahead of the god early on (8.4/8.8 believed against 6.8/6.7 said at generation 60 in one live pond). Whole bodies appear (a head on a torso with arms and legs) but are not yet the rule. Pond growth (`57_grow.js`) is another session's work.

### Round 3b (same day): why it "changed without evolving", homes that show, niches

**The loop that kept bodies small.** Two rules cancelled growth: a body over about six things was made to shed a part in up to 70% of births (`F.mutate`), and room to grow (`W.room`) never opened in any live run because its test compared the pond's belief with its own best to within 0.006. Shedding is removed (marks and upkeep answer clutter). `G.roomAfterLook` now reads the god's own marks from the look: room opens 0.25 when bodies are clear (body ≥ 5.6, balance ≥ 5) and appeal is within 0.3 of its best, and closes 0.4 when appeal falls 0.6 below it. Live: room reached 2.8 by generation 200.

**Belief is calibrated.** The pond remembers what it believed of each creature just before the god marked it (`pb`, `pw` in the eye bank) and rescales its beliefs to what the god then said (`W.cal`, slope 0.3–1). Live, believed against said: 6.7/6.3 against 6.8/6.4 at generation 100 (was 8.4/8.8 against 6.8/6.7).

**A creature is judged in its home.** `f._air` (set in `G.derive`) puts the home into the taste (`land`, `landLegs`, `landFins`, `landTail`, `landCoat`, `landTent`, `waterLegs`, `waterFins`), into the look-alike measure, and onto the sheet (ground under a sky, a wet bank, or water); the prompt says a creature should look made for where it lives. On land legs carry a body, fins are wings that lift a small one and a swimming tail does nothing; in the water legs drag. A child of a land-liver is likelier to grow legs and lose fins or a swimming tail. The sheet draws the numbered creatures to scale with one another (`sizes`), so the god can see size.

**Niches (`startWinter`).** A creature's place is taken mostly among those built like it (`G.bdist`: looks without colour), and a build that fills the pond counts for less (`crowd`).

**Live, Haiku, 300 generations:** land kinds 109 of 147 at generation 200 and 10 (with 119 at home in both) at 300; they are winged, legged, insect-like on the ground. Marks did not rise: beauty 6.8, 7.0, 6.2 and whole 6.4, 6.8, 6.0 at generations 100, 200, 300, and that pond was one build in many colours by 200 (niches were added after this run and have not been seen live). `scripts/evolve-look.js` does not manage to switch off the other paid features: of $0.45 the watcher was $0.09 and marvel icons $0.23.

### Round 4 (2026-10-08): the painter was the ceiling; limbs and faces drawn from their genes

**Finding.** The free-body painter (`22_portrait.js`) ignored most limb genes: `q.l` (for legs), `q.j`, `q.c` and `q.p` were never read, knees and elbows were fixed, only ONE leg rule and ONE arm rule per mass were drawn (others silently dropped), a limb on a limb only changed the hand, and every eye was the same circle with the same brow. Genes changed and the picture did not, so nothing could be selected.

**Limbs.** New per-rule genes `u` (where the joint sits) and `f` (hand or foot size); the painter now reads `u`, `c` (bend), `j` (1 a peg, 2 a knee or elbow, 3 knee and ankle), `p` (taper) and draws up to three leg pairs and two arm pairs on a mass, and a forearm for a limb grown on a limb (`limbN`, `legOf`, `armOf`, `limbs`). On a mass that rests on the floor, limbs ending in a stump or a paddle are legs, limbs ending in a hand or a pincer are arms. A copied set of limbs may stay on the same mass and then diverges.

**Faces.** New genes `ex` (eye shape), `et` (slant), `el` (lid), `bw`, `ba` (brow weight and slope), `sn` (muzzle), `nz` (nose: none, button, triangle, nostrils), drawn in `eyeAt`, `F._lid`, `face` and in the live eyes of `F.pDraw`. They are in `F.fix`, `F.pack`/`unpack` (41–47; rules 12–13), `F.cross`, `F.lookVec`, the taste (`eyeWide` .. `jointed`) and a pond's nature (`G.pondDna`). Old saves load with defaults.

**A rate of change of its own.** `g.t[6]` scales a line's mutation (0.4–2.2), is inherited and drifts.

**Clutter without pushing.** With shedding gone, a live pond reached 13.7 parts a body (heaps). Now BODY is a core mark (beauty 0.35, whole 0.40, body 0.25), the pond's own count of clutter keeps half its say beside the god's marks for look-alikes, and parts over six cost food (`0.07·over + 0.012·over²`) and protein.

**Water.** Legs drag more in water (9% a site) and a line that lives in the water tends to flatten legs into fins.

**Seen.** `scripts/gallery-new.jpg` (hand-set: biped, six-legged insect, beast with a muzzle, four-armed mantis, fish, imp, cyclops, all from the same genes). Live Haiku, god only, 200 generations, $0.07 (`evo-h-g200.jpg`): tall standing creatures with a head, a torso, jointed legs, long arms with pincers and wings; parts 11.7; the god still says 6.5 / 6.5; one family in many colours; 150 of 157 at home in both, 5 land.
`scripts/evolve-look.js <tag> <gens> [model|offline]` now really spends on the watcher only.

### Round 4b (2026-10-08): two worlds, land food, new models

**Two worlds.** Breath `g.t[5]` now parts creatures: below 0.5 a creature of the water, from 0.5 a creature of the land (`ph.home`). A water creature reaches only the wet edge of the land (a tenth of it at most) and a land creature only the shallows (6% of the water). They do not breed across the shore (`findMate`), are separate kinds (`G.features`), and each side is ranked, passed over and wintered against its own (`TH` in `startSpring`, `rk` and the niche loop in `startWinter`, `c.hab`). The land has its own leaning in which growths chance offers (`kwL` in `G.pondDna`: legs, feelers, horns, plates oftener; tentacles seldomer). First life starts in the water at 0.22. The "at home in both" class and its upkeep cost are gone. Crossing happens by mutation (drift 0.06, a step of 0.18 in 3% of births): at a step rate of 1.2–2% almost no pond reached the land in 220 generations, so 3% is kept, at the price that the land keeps receiving the water's cousins. Free ponds, 220 generations: 38, 57, 9 and 0, 8, 43 land creatures at generations 60, 140, 220, all living on land. In a free pond with no god the two sides still LOOK alike at generation 170 (`evo-k-g170.jpg`): the split in breeding is there, the split in looks is not yet shown.

**Land food.** Land-livers were starving as bodies grew (fed 0.73 falling to 0.51, 45% of their deaths). `W.landRich` (1 to 4, from the mean size of the land's animals) scales how much the land grows and holds. After: 35–49 land-livers a generation against 15–30, children 0.46–0.73 against 0.34–0.43.

**Taller, wider.** Mass outlines 0.45–1.9 (were 0.55–1.5), mass size up to 1.5, limb length 0.6–1.9 and width 0.6–1.8.

**Models.** Added with prices checked 2026-10-08 and one real call each: `claude-haiku-5-5` ($0.10 / $0.50), `claude-fable-5-1`, `gpt-6.1-sol`, `gpt-6-sol`, `gpt-5.6-luna`, `gpt-6-astra`. Sonnet 5.5 cached input corrected to $0.10.

### Round 5 (2026-10-08): an old pond no longer starves; steady growth with no end; land that lasts

**What killed the land in long games.** A 420-generation free pond held 30–45 land creatures for hundreds of generations and lost them at whole-pond crashes (population 135 to about 30 near generations 280 and 380). The crashes were slow starvation: as the world widened and bodies grew, the same food fed less (water's food level 0.65 falling to 0.42). `scripts`-side tool: a free pond that logs, for the land, births, departures, arrivals and causes of death every 20 generations.

**Richness.** `W.richS` builds up by 0.5% each generation the pond thrives (at least 80% peopled, mean fed at least 0.5) and loses 1% when it starves (mean fed under 0.35). Every morsel is worth `W.rich = richS × (world width)^0.8` (`creaturesStep`), so nothing more is simulated. It is saved (`rich`); an old save without it is taken as 3.8.

**Size.** No fixed ceiling. A body is as big as its genes say up to `W.sizeCap = 6 + 17.6·richS^0.49` (`G.sizeCapOf`; about 24 at first). The stall drive is back (`W.grow`: size mutations lean up, upkeep 20% cheaper, the bigger last the winter a little better) with no size at which it stops, and grandeur's prior rewards being bigger than the pond's mean. Oxygen need flattens above twice the first size, and sight widens with size. Measured: mean size 18, 22, 30, 38, 44, 53 at generations 40, 120, 200, 280, 360, 440; richS reaches about 150 by generation 1000, a cap near 210. Three things tried and dropped: food following size at once (size ran away to 474 by generation 400: bigger bodies eat smaller ones), food lagging size (did not brake the water and starved the land), an absolute grandeur prior (growth stopped near 60).

**Land.** Births are capped for land and water apart (`startSpring`: with the pond always full, land parents were losing every place to water parents), the land's winter room and birth room come out of the pond's total, and the land grows more food (rate 0.85, at least 150 or 26% of the food cap). Free pond, 300 generations: 25–58 land creatures throughout.

### Round 5b (2026-10-08): using the whole pond; land that feeds its own

From the owner's screenshots of a late pond: life bunched in one corner and along the top of the water, the widened pond lay empty, and the land was eaten bare.
- **Speed keeps pace with the world.** `ph.speed` no longer falls with size past 24 and is multiplied by (world width)^0.75 and (size/24)^0.25. A big body in a pond three times as wide needed several lifetimes to cross it. Free pond, 320 generations: 43–57% of creatures in the right half, 27–37% in the far right third, 28–49% in the lower half.
- **The land's plants are the land's.** Water creatures no longer reach the shore's edge (`landTop = shoreNow`): they were crowding the top of the water and grazing the land bare.
- **The land breeds as its food allows.** Land births are capped at `12 + 0.45 × land food` (`startSpring`). Land starvation deaths fell from about 16 to 2 a generation; 16–57 land creatures throughout, fed 0.66–0.85.
- **Pace of growth.** Richness builds 0.8% a thriving generation: mean size 18, 32, 42, 55, 63 at generations 40, 120, 200, 280, 320.
- **Clicking a big creature.** The pick radius follows the drawn body (`60_ui.js`), not the circle it is reckoned as.

### Round 5c (2026-10-08): why the land stood bare

Land plants were made through `G.spawnFood`, which refuses when the pond's food is at its limit, and the water's food always fills that limit. So after the first plants were eaten almost none grew again (the owner: "gen 211, no food outside"), and land creatures fed in the shallows. Land plants now have their own allowance (`ownRoom`; the water's limit counts food without the land's): `max(170, 0.24 × food cap) × (shore/0.16)^0.7` standing, growing at rate 1.0. Free pond, 260 generations: 440–900 plants standing, 59–95 land creatures fed 0.87–0.93, 2–9 land starvation deaths a generation (it was 16–28). Autumn population is about 185 against 150 before (the land's life comes on top of the water's).

### Round 6 (2026-10-08): land and water grow apart; things worn, held and caught; leaps

**Why the two sides looked alike, and what was changed.** A line reaches the land with its water parents' body; children kept crossing both ways every generation; with food plentiful an unfit body paid nothing; both sides were bred to one taste. Now: a child born across the shore only makes it if that side has room (`G.mutate`: reverted with probability `1.6 × fullness − 0.1`, so an empty land is colonised at once and a peopled one is left to its own lines); on land a body without legs or wings crawls (`0.2 + 0.32 × leg sites`), and a swimming tail, tentacles and big fins cost upkeep there, as legs do in the water (and drag 14% a site); a line's children lean harder to what suits its side (22% and 16%); each side has its own taste (`W.tasteL`, fitted only to the god's marks on land creatures; `G.believe` picks by home). Free pond, no god, generation 200 (`evo-m-g200.jpg`): water kinds are furred, broad-winged, fan-tailed; land kinds feathered, whip-tailed, squarer-headed, several wingless. Related, but two visibly different lines.

**Things worn, held and caught (nothing from a list).** The design pipeline (`45_parts.js`, `DESIGN_SYSTEM`) has four new places: `top` (one thing on the head), `face` (one under the eyes), `held` (carried: in the first hand, or beside the body) and `skin` (a CONDITION of the whole creature: `tone` shifts its colours, `lid` lowers its eyelids, and its mark is stamped in a few places). They are genes like any invented part. When the pond is stuck (`W.stall ≥ 0.6`) it is asked every third generation and for these in turn (`info.want`: worn, worn, condition); such a request is never answered from the library. The painter draws them after the face (`22_portrait.js`), and `colours()` applies a condition's tone (`F._cond`). The four fixed outfits are no longer handed out. Tried live (Haiku 4.5, 6 calls, $0.03): Pearl Crown, Dewdrop Lens, Bubble Helm, Silk Bow, and the conditions Nacre Sheen and Pearl Flush (`scripts/invent.jpg`).

**Fashion.** Each autumn about 3.5% of creatures take up a worn thing or a condition from the most admired creature near them on their own side (`endAutumn`); it becomes their own and their children's.

**More change.** Mutation chance 0.1 (was 0.08), structural 0.14; a stuck pond mutates 60% more readily, tries the body shapes and parts it has been given up to three times as often, and now and then a child is a leap (three structural rounds at five times the rate).

**Marvel Garden** scales with the mean size of the pond's creatures.

**Open.** Clutter: with food made rich, the upkeep of extra parts no longer bites (a free pond reached 14 parts a body); only the marks hold it back. Worn things are drawn plainly (mostly pale shapes). None of this round has run in a long live pond with the god.

### Round 6b (2026-10-08): worn things drawn properly; clutter has weight; first live run of Round 6

- **Worn and carried things** have a colour of their own (`tint`, from the AI, else from the thing's name), a shine and a shadow (`drawDesign`); before they were pale cut-outs.
- **Clutter has weight.** Each part over six takes 5.5% off speed and 4% off turning (down to half): with food rich, upkeep no longer held bodies back.
- **Live, Haiku 4.5, god and inventions on, 200 generations, $0.08** (`evo-n-g200.jpg`): water 36, near the shore line 63, land 81, land 48% of the map. The two sides are plainly different: water kinds are crab-like with jointed arms and legs in purples and reds; land kinds are broad-hatted, yellow, and nearly all wear the same invented orange cap (fashion spread it). Still open: the land kinds kept fish tails and no legs; the god's marks did not rise (beauty 6.4 then 6.1, whole 5.8 then 5.3); parts 10.4.

### Round 7 (2026-10-08): bodies never outgrow the pond

The owner's pond at about generation 780: bodies 30 times their first size in a pond 5 times its first width, one solid crush in a corner (richness had gone on compounding while the pond had stopped at `MAXG = 5`).
- **Size is bounded by room.** `W.sizeCap = min(what richness carries, fit)`, with `fit = 1.2 × sqrt(0.03 × pond area / (creatures × 11.34))`: bodies at their biggest cover about 4% of the pond, just where the pond stops widening for crowding, so the two do not chase each other. Bodies now grow with the pond (0.6% of its first width a generation), and `MAXG` is 14. Food's worth follows the real size cap. Richness builds 0.5% a generation.
- **Late-pond test** (`late.js` in the session notes: a free pond with every body made a giant): 668% of the pond covered, back to 3.5% six generations later, 4.3–4.4% from then on, population 121–187, land 59–95.
- **The whole pond.** The two ends differ less (every food grows at both, the deep has 77% of the shallows' air where it had 57%), so a pond's life is not shut into one end.
- **No god:** the pond's own guess no longer reaches a ceiling (`F.soft`): at 10 out of 10 for everyone nothing was being chosen.
- **Land:** a land line with no legs grows them even when its body is full (in place of tentacles or fins), a swimming tail slows a body on land, and wings lift bodies that are small for their pond (not small in absolute terms).
