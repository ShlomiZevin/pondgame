# Primordia

A pond where life evolves by a real genetic algorithm. There is no goal: the player is nature. You start with single
cells; each season is one step of the algorithm (breed and mutate, test, score, select); you throw things in, cause
world events, and watch what the pond grows in answer. No two ponds come out alike.

This repository holds the whole project:

| folder | what it is |
|---|---|
| `game/` | The game. Source in `game/src/` (one file per part), built into one self-contained `game/game.html`. |
| `server.js`, `lib/` | A small server with no dependencies: the AI calls, what they cost, and ponds that keep living while the player is away. |
| `sim/` | A copy of the game's simulation files, so the server runs exactly the game's rules. |
| `public/dev-host.html` | A page that hosts the game the way a site would. This is how you play it locally. |
| `scripts/` | Running it, and browser checks that take screenshots. |
| `test/` | The server's tests. |

## Run it

You need Node 18 or newer. Nothing to install.

```
npm run dev
```

Then open **http://localhost:8787/dev?user=yourname**.

That is all for a first look: with no API key the game runs fully and imagines things from its own built-in tables.

### With the real AI

Copy `.env.example` to `.env.local` and put in the keys you have (any subset works):

- `ANTHROPIC_API_KEY`: Claude Haiku 4.5 (the default) and Sonnet 5.5
- `OPENAI_API_KEY`: GPT-5.4 mini and nano, GPT-5.6 Terra, GPT-6 Luna
- `LEONARDO_API_KEY`: a sound for each thing the player types

`.env.local` is ignored by git. Never commit a key. Start again with `npm run dev`; the model can be chosen in the
game's menu (the gear).

Useful addresses while it runs:

- `/dev?user=name`: the game. Add `&ai=0` to play without the AI, `&fuel=20` to try a budget of paid answers, `&debug=1` for a message strip.
- `/api/usage`: what has been spent, today and ever, by model, with the prices used.
- `/api/library`: every AI answer kept so far.

### Sound

The game uses Plaxzy's sound library. The dev server serves it from `../../all-games-website/public` (set
`PRIMORDIA_PUBLIC` if yours is elsewhere). Without it the game simply runs silent.

## Change the game

Edit files in `game/src/`, then:

```
npm run build        # game/src/*  →  game/game.html
npm run sync         # copy the simulation files into sim/ (do this whenever the simulation changes)
npm test             # 12 server tests, no API key needed
```

Reload the browser page. The dev server reads `game.html` from disk on every load.

**Where the game is really developed.** On Shlomi's machine the working copy is inside the Plaxzy Creator checkout,
at `plaxzy-creator/local-games/primordia/` (a folder that repo ignores), because the Creator's checks and local
player run from there:

```
node scripts/local/check.js local-games/primordia --fix      # run from the Creator repo; must say CLEAN
```

If that folder sits next to this repo (`../plaxzy-creator/local-games/primordia`), the dev server and `npm run sync`
use it directly, and `npm run pull-game` copies it into `game/` before a commit. If it is not there, everything uses
`game/` in this repo, so a fresh clone works by itself.

### The parts of the game (`game/src/`)

| file | what it holds |
|---|---|
| `00_head.html` | The page and all CSS. |
| `10_core.js` | The global `G`, the loop, input, the camera. |
| `20_genome.js` | The genome and `G.derive` (genes → what a body can do), mutation, crossover. |
| `21_form.js` | The form genome: growths (legs, fins, horns…), eyes, mouth, coat, colours; mutation and crossover; abilities measured from the body; names. Also the old top-down drawing, no longer used in the pond. |
| `21b_body.js` | **The body itself: free shapes held in genes.** A body is 1 to 5 masses, each an outline of ten radii (and perhaps lobes), joined at an angle, pressed in or out on a stalk, single or a mirrored pair, solid or a ring. Facing you or side on. A child takes each mass from one parent or a blend of both; chance reshapes them. There are no preset animal types. |
| `22_portrait.js` | **How creatures are drawn, in the pond and on every card.** The `free` branch draws a body of free shapes as one cartoon silhouette with its growths, every part moving; a bare single cell is drawn as an amoeba. Each look is kept as a 6-frame loop. The older fixed builds (fish, crab…) remain only for typed beings and old saves. |
| `30_world.js` | The simulation: seasons, food, creatures, things, breeding, selection, species. |
| `40_words.js` | Typed words, the offline word table, and `G.ai` (the one door to the server, with limits and the cost ledger). |
| `41_look.js` | How a typed being is turned into a body so it is drawn as a character. |
| `43_why.js` | The reason shown when a feature takes hold. |
| `44_pressure.js` | What the pond is up against right now (it tilts which mutations appear). |
| `45_organs.js`, `45_parts.js` | Organs and new kinds of body part invented for a pond; the collection. |
| `46b_marvels.js`, `50b_marveldraw.js` | **Rare marvels.** Now and then one lucky creature is born with something super rare (a mind that thinks, a voice that talks, breath of fire, a diamond heart, a rainbow coat, a healing light, a lucky star, a heart of spring, a titan's heart, or one the AI invents for this pond). See the section below. |
| `45_plans.js` | **Shapes of body imagined for a pond**, by the AI looking at the pond (`G.worldBrief`: things dropped in, events, dangers, who lives there and their beauty grades, what the player kept, what became of earlier ideas), or from a stock of fourteen. At most three at a time; a mutation may bear a child towards one. |
| `48_paint.js` | AI paintings of creatures. Switched off (`G.ai.drawn = true`): paintings cannot move. |
| `46_events.js` | Free-text world events. |
| `48_judge.js` | **The eye for beauty.** Draws the pond's kinds on one sheet and sends the picture to the AI, which grades each (0–10), says why, and names one fix. The grade is 70% of charm; charm decides mates, children and who lasts the winter; the fix becomes a likelier mutation. New ideas are drawn and looked over the same way before they are let in (`G.lookOver`). |
| `47_story.js`, `49_eras.js` | The narrator, and ages named from what actually dominates. |
| `50_render.js` | Drawing the pond. |
| `55_sim.js` … `67_tree.js` | Running the sim, the HUD, the thing card, the Book of Life, the family tree, the away report. |
| `70_audio.js`, `80_save.js`, `85_host.js`, `99_boot.js` | Sound, saving, the bridge to the hosting page, start-up. |

Headless checks of the evolution itself, with no browser (run from `game/`):

```
node tools/div-test.js 200 11,23,57      # how many different bodies share one pond
node tools/long-test.js 350 11,23        # do bodies keep advancing over a long run
node tools/fork-test.js 11               # the same pond with different things thrown in
node tools/form-test.js 120 3            # a general look at what evolved
node tools/evo-test.js 150 11,23         # does beauty rise, no AI (the game's own taste)
node tools/oracle-test.js 340 11,23 4    # a long run with a stand-in watcher: does quality hold, how varied is the pond
node tools/react-test.js 11              # does the pond answer cold, heat, dark, hunters, poison
```

Browser checks that save screenshots into `scripts/` (the dev server must be running; needs Chrome and the
Creator repo's `playwright-core` next to this repo):

```
node scripts/look.js a 90        # run a pond fast, then photograph it
node scripts/screens.js 80       # every screen, plus save and reload
node scripts/things.js           # typed things and world events with the real AI
node scripts/costs.js            # one real call to each model, then the cost window
node scripts/forms.js            # a gallery of hand-set bodies, top-down and as portraits
```

## How the server and the game talk

The game is one HTML file in a sandboxed frame. It never reaches the network itself. It posts messages to the page
that hosts it, and that page calls the server. `public/dev-host.html` is a complete, small example of such a host.

- game → host: `{ __primordia: 1, id, op, payload }`
- host → game: `{ __primordia: 1, id, ok, data, error }`
- host announces itself: `{ __primordia: 1, op: 'host', caps: { ai, pond }, fuel }`

| op | server call | what for |
|---|---|---|
| `ai.thing` | `POST /api/ai/thing` | A typed word → what it does, how it looks. |
| `ai.plan` | `POST /api/ai/plan` | A new shape of body, answering what is happening in the pond. |
| `ai.judge` | `POST /api/ai/judge` | The picture of the creatures (base64 JPEG, about 50 kB) → a grade, a reason and a fix for each. |
| `ai.event` | `POST /api/ai/event` | A typed sentence → a world event. |
| `ai.organ`, `ai.design` | `POST /api/ai/organ`, `/design` | A new organ, a new kind of body part. |
| `ai.marvel` | `POST /api/ai/marvel` | A marvel for one lucky creature: a name, a story, one special gift and a few effects, kept fair by the server. |
| `ai.judge` | `POST /api/ai/judge` | How striking each kind of creature looks. |
| `ai.story`, `ai.ideas` | `POST /api/ai/story`, `/ideas` | The narrator; mutation ideas. |
| `ai.sound` | `POST /api/ai/sound` | A sound for a typed thing. |
| `ai.models`, `ai.usage` | `GET /api/ai/models`, `/api/usage` | The models on offer; the cost books. |
| `pond.get`, `pond.put`, `pond.del` | `/api/pond` | The player's pond. `GET` advances it by the time away and returns a report. |
| `fuel`, `fuel.spent` | none | The host sets how many paid answers are left; the game reports each one spent. |

Every `/api/*` call carries `x-user: <a stable id>`.

## Rare marvels

A pond now and then gives one creature a **marvel**: something super rare that players gasp at and tell a friend about. It is rare by chance but never left to chance alone: the chance for each generation is `1 − exp(−(0.0004 + 0.00003 × generations since the last + (0.004 + 0.006 × minutes since the last) × minutes since the last check))`, so it comes about every 3 minutes at 64× and every 15 minutes at 1× (`node tools/marvel-test.js` prints the waits), and a player is never without one for long.

- **What:** nine are built in (`G.MARVELS`): Bright Mind (senses, speed, a sharper brain), The Gift of Words (it talks in speech bubbles; its kin hear it and mates prefer it), Dragon Breath (burns what hunts it), Diamond Heart (armour and light), Rainbow Coat (resists heat, cold and poison), Healing Light (mends creatures near it), Lucky Star (danger sometimes misses it), Heart of Spring (an extra child each spring), Titan's Heart (35% bigger). About half the time, when the AI is on, it invents the pond's marvel instead (name, one-sentence wonder, a sign, effects from the organ vocabulary capped in total, at most one special gift, the words a voice says): about a tenth of a cent each, at most eight a session.
- **A moment:** a banner, a sound, the camera goes to the creature, it is kept in the player's collection as "Marvel · name" (an invented one travels with it), and in the pond it has an aura, circling sparks and a small sign floating beside its head.
- **In the genes (`g.mv`):** children can inherit it (usually), it can fade (rarely at first, and much more as it becomes common, so it stays something special), the carrier is spared once and looked after for twenty generations while the marvel is still rare. `node tools/marvel-spread.js` shows what becomes of one: it usually reaches a tenth to a quarter of the pond for 15 to 60 generations and then fades, unless it helps.
- **Saved and kept:** the marvel is in the genome (packed at index 8), the pond saves its invented marvels and the clock, and a kept creature carries its marvel into any pond.

## Putting it on Plaxzy

What has to change, and nothing else should:

1. **Who is asking.** `whoIs` in `server.js` trusts a plain `x-user` header. Replace it with the real sign-in.
2. **Storage.** `lib/store.js` keeps JSON files under `data/`. Swap it for the site's database; the rest of the code only calls `get`, `set` and `del`.
3. **The host page.** Port `public/dev-host.html`: it maps each op above to a server call and relays the answer.
4. **Plax as fuel.** The host passes `fuel` (paid answers left) and receives `fuel.spent`. At zero the game stops asking and imagines things itself. Costs are counted in dollars today; `lib/ai.js` holds the price table.
5. **The scheduler.** Call `POST /api/tick` (with `x-admin`) now and then so idle ponds keep living.
6. **The game file** is already in Plaxzy's format: one self-contained HTML file, saved through `Plaxzy.save`, sound through Plaxzy Sound.

## What the AI costs, and how it is kept small

- The pond asks by the clock and within a per-session budget, never once per generation, so running at 64× costs the same as 1×.
- Every answer is kept in a library and reused; a reused answer is free.
- Per-player and per-day caps (`PRIMORDIA_AI_PER_HOUR`, `PRIMORDIA_DAILY_CALLS`).
- Every call is priced when it is made and written to `data/books`, by model and by day. Prices are list prices, checked on 2026-10-05; correct them in `lib/ai.js` or with `PRIMORDIA_PRICES`.
- A two-and-a-half-minute session at 64× has cost about 2 cents with Claude Haiku 4.5.

## What the AI calls cost (measured 2026-10-06, one real call each)

| model | a shape of body | a kind of part | grading 6 creatures from the picture |
|---|---|---|---|
| Claude Haiku 4.5 (default) | $0.0045 | $0.0038 | $0.0037 |
| Claude Sonnet 5.5 | $0.0086 | about $0.008 | $0.0079 |
| Claude Opus 5.5 | $0.027 | $0.030 | $0.016 |
| GPT-5.6 Sol | $0.022–0.029 | $0.022 | $0.016 |

A live pond on Haiku, four minutes at 64× (about 260 generations) with a knight dropped in and an ice age: **$0.076** in all (6 gradings, 6 look-overs of new ideas, 4 shapes, 4 parts, 4 story chapters, 1 thing). The calls are made by the clock, not by the generation, so an hour of play on Haiku is roughly a dollar; on Opus or Sol about five times that. `node scripts/eye.js` repeats the comparison and prints the cost of every call; `node scripts/live.js` runs the whole loop. Sol's price is promotional (OpenAI says at least through 2026-11-21): check the table in `lib/ai.js` again then.

## Known problems

- Haiku is a generous judge (most kinds get 7–9); Opus and Sol use more of the range. A stricter judge selects harder.
- Kinds of part can spread to nearly every creature, which makes the pond busier to look at than the judge would like.
- A pond evolved without the AI (tests, the server's catch-up while you were away) has no grades: it goes by the built-in taste only, which does not punish clutter enough.
- Saves from before the free bodies still load and are drawn the old way; they do not turn into free bodies.
- An AI-invented build is only checked for being a usable line; a strange one (head low, tail high) is drawn as given.
- `POST /api/ai/paint` and `lib/paint.js` (AI paintings) work but the game does not use them. The top-down drawing in `21_form.js` (`F.draw`, `F.rig`) is no longer used in the pond.
- A whole pond tends to end up wearing the same coat, and kinds in one pond often share their main body part.
- An hour away takes about a minute for the server to catch up.
- The old route `POST /api/ai/skin` (AI drawings of species) is no longer used by the game.
- Not tried on a phone. Sound playback was not listened to.

## Ideas for later (Shlomi's)

Visiting other players' ponds; visitors acting in your pond (throwing something in, leaving a message, growing a
creature); merging friends' ponds so their creatures breed; creatures leaving the pond.

## The genetic algorithm: where it stands

See [ALGORITHM.md](ALGORITHM.md): the goal, how the loop works today, what was measured with a blind judge, what does
not work yet, and ideas not tried. Read it before changing fitness, breeding or the watcher.

## Added on 2026-10-06 and 07: the goal, things drawn as what they are, free world events, invented marvels

| file | what it holds |
|---|---|
| `game/src/64_wish.js`, `lib/wish.js` | **The goal of the game.** The pond wishes for one creature at a time; the AI writes the wish, judges from a picture how close the living kinds are, and on fulfilment records a Legend and dreams a harder one. `POST /api/wish` (`op: get / check / done`), kept per player. |
| `game/src/42_figure.js` | A typed thing is **drawn by the AI as what it is** (an SVG in named parts with pivots) and moved as a puppet. `POST /api/ai/figure`, kept per word. The drawing is made during "imagining", before the thing can be placed. |
| `game/src/53_fields.js` | **World events said freely**: regions (line, band, circle, ring, half, all) of some stuff (ice, fire, water, rock, plant, toxic, light, dark, magic) that are solid, hurt, kill, slow, pull, push or feed, aimed, drifting, arriving in stages; and strikes from above. Wraps `G.step`; does not edit the simulation. |
| `game/src/52_weather.js` | Events are **seen**: the strike splash, lasting weather (sixteen kinds), and a strip naming what is in force. |
| `game/src/46b_marvels.js`, `50b_marveldraw.js` | **Marvels** (a super-rare gift on one creature). With an AI they are always invented for that creature and pond: free powers (an aura or a pulse of some stuff doing things to someone), a sign the AI draws, lines it says. The nine built-in ones are only for when no AI can be asked. |
| `game/src/46c_voice.js` | A marvel that talks is **heard**: `POST /api/ai/voice` has its line spoken by Leonardo `dialogue-v3` and keeps it per line. |

Costs measured (one real call each unless said): a figure about $0.04–0.06 (Sonnet); a wish $0.004 and a wish check $0.0035 (Sonnet); a staged event about $0.02 (Sonnet); a marvel $0.012 (Sonnet); **a spoken line $0.13** (`dialogue-v3`; Leonardo's other speech model `seed-audio-1.0` was $0.48 a line). The game allows ten new spoken lines a session; a line already made is free for everyone.

Scripts: `wish.js`, `figures.js`, `addflow.js`, `disaster.js`, `weather.js`, `keep.js`, `marvel-live.js` (each drives the real game and saves screenshots).

Not verified: the spoken lines were generated and returned as audio but nobody has listened to them; whether the game's sound player honours the playback speed that gives each creature its own pitch is untested.

## Added 2026-10-07: deeds, and nothing from stock lists

- `game/src/54_deeds.js`, `lib/deed.js`, `POST /api/deed`: now and then one kind of creature **decides to do something together**. The AI makes up the plan from who they are and what is going on (a march on what hunts them, a fort, a council, a feast table, a peace offering), as 2–5 plain steps the game acts out (gather, circle, line, carry, build, charge, guard, scatter). What they build stays in the pond as a field that spares its builders, with an AI drawing. At most 28 take part; if members die, others of the kind take their places. About $0.01 a plan, plus about $0.06 for the drawing of what is built; one plan every 200 seconds at most.
- The pond's own events (`G.natureTick`) are invented by the AI from the state of the pond (`POST /api/ai/event` with `auto`), about $0.017 each, one every two minutes at most.
- While an AI can be asked, parts, shapes, organs and marvels are never taken from the built-in lists; those lists remain only for when no server answers.
- `scripts/deeds.js` and `scripts/nature.js` drive these live.

## The rare box

A box on the left of the pond (`src/56_rarebox.js`) lists what is special right now: every marvel alive (its sign, how many carry it, what it does), the plan a kind is carrying out (step, how many take part), what they built, and the last plans with how they ended. A click moves the camera there. The creature card shows a marvel in its own gold panel, with each power read out in plain words (`G.marvelDoes`). A plan keeps the watcher's time: its steps last the seconds the AI gave them at any speed, and the young of those in it take it up. Test: `node scripts/rarebox.js`, `node scripts/rarecard.js`.

## Pace, and a pond that grows

Marvels and plans keep the player's clock, not the pond's (`G.rt`): a first plan after about two minutes of play and one every two or three after it; a first marvel after about three minutes and one every three or four. The bearer of a marvel is chosen when the AI has answered. A plan says WHAT and WHY in plain words (`what`, `why` from `lib/deed.js`), and the rare box sets each kind's name apart in a coloured chip; the box folds away with a click on its heading. Builders stand back round what they build and take turns fetching.

The pond grows when bodies cover more than about a twelfth of the water (`src/57_grow.js`, up to 2.6 times across); everything moves apart with it and the food stays what it was. Tests: `node scripts/pace.js`, `node scripts/grow.js`.

## Order at the top

`src/61_notes.js`: the banner is only for big moments (a marvel, a plan and how it ended, a wish come true, a new age, a world event), one at a time, at most two waiting, at most 8 seconds and 190 characters. Everything smaller is a note: one quiet line at a time in the bottom right corner (`G.note`). The strip of what is in force shows two; more than two fold into one pill that opens with a click.

## Beyond the pond, the box in two tabs, and the budget

`src/58_beyond.js`: the pond has no wall; at its sides and floor the water goes on into a mist with far lights and, now and then, something large passing. When the pond grows (`57_grow.js`, now eased over seconds) the mist draws back. The rare box has two tabs, Plans and Marvels; a click on a row goes there and opens its details (a built thing: its picture, how and why it was built, what it does, how long it lasts). `src/69_budget.js` holds the limits for the AI calls that happen by themselves (plans, marvels, the pond's own events, wish checks): about a dollar and a quarter at most in a sitting.
