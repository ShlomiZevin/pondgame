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
| `21_form.js` | **The body.** Growth-rule genes, the rules of development, abilities measured from shape, taste, and the top-down drawing (puppets). |
| `22_portrait.js` | **How creatures are drawn, in the pond and on every card**: side-view characters grown from the genes (microbe, orb, star, jelly, blob, crab, beast, upright, serpent, fish, or an invented build), every part moving. Each look is kept as a 6-frame loop. |
| `30_world.js` | The simulation: seasons, food, creatures, things, breeding, selection, species. |
| `40_words.js` | Typed words, the offline word table, and `G.ai` (the one door to the server, with limits and the cost ledger). |
| `41_look.js` | How a typed being is turned into a body so it is drawn as a character. |
| `43_why.js` | The reason shown when a feature takes hold. |
| `44_pressure.js` | What the pond is up against right now (it tilts which mutations appear). |
| `45_organs.js`, `45_parts.js` | Organs and new kinds of body part invented for a pond; the collection. |
| `45_plans.js` | **Builds** invented for a pond: a whole way of carrying a body (a spine line and how the legs are set), by the AI or from the game's own stock of eight. A build is a gene (`f.pl`); at most three live in a pond at a time. |
| `48_paint.js` | AI paintings of creatures. Switched off (`G.ai.drawn = true`): paintings cannot move. |
| `46_events.js` | Free-text world events. |
| `47_story.js`, `48_judge.js`, `49_eras.js` | The narrator, the AI judge of looks, and ages named from what actually dominates. |
| `50_render.js` | Drawing the pond. |
| `55_sim.js` … `67_tree.js` | Running the sim, the HUD, the thing card, the Book of Life, the family tree, the away report. |
| `70_audio.js`, `80_save.js`, `85_host.js`, `99_boot.js` | Sound, saving, the bridge to the hosting page, start-up. |

Headless checks of the evolution itself, with no browser (run from `game/`):

```
node tools/div-test.js 200 11,23,57      # how many different bodies share one pond
node tools/long-test.js 350 11,23        # do bodies keep advancing over a long run
node tools/fork-test.js 11               # the same pond with different things thrown in
node tools/form-test.js 120 3            # a general look at what evolved
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
| `ai.plan` | `POST /api/ai/plan` | A new build (body plan) for a pond. About $0.003 with Haiku. |
| `ai.event` | `POST /api/ai/event` | A typed sentence → a world event. |
| `ai.organ`, `ai.design` | `POST /api/ai/organ`, `/design` | A new organ, a new kind of body part. |
| `ai.judge` | `POST /api/ai/judge` | How striking each kind of creature looks. |
| `ai.story`, `ai.ideas` | `POST /api/ai/story`, `/ideas` | The narrator; mutation ideas. |
| `ai.sound` | `POST /api/ai/sound` | A sound for a typed thing. |
| `ai.models`, `ai.usage` | `GET /api/ai/models`, `/api/usage` | The models on offer; the cost books. |
| `pond.get`, `pond.put`, `pond.del` | `/api/pond` | The player's pond. `GET` advances it by the time away and returns a report. |
| `fuel`, `fuel.spent` | none | The host sets how many paid answers are left; the game reports each one spent. |

Every `/api/*` call carries `x-user: <a stable id>`.

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

## Known problems

- **Evolution slows down.** After a while a pond settles and its creatures stay more or less the same. This is the main open problem.
- An AI-invented build is only checked for being a usable line; a strange one (head low, tail high) is drawn as given.
- `POST /api/ai/paint` and `lib/paint.js` (AI paintings) work but the game does not use them. The top-down drawing in `21_form.js` (`F.draw`, `F.rig`) is no longer used in the pond.
- A whole pond tends to end up wearing the same coat, and kinds in one pond often share their main body part.
- An hour away takes about a minute for the server to catch up.
- The old route `POST /api/ai/skin` (AI drawings of species) is no longer used by the game.
- Not tried on a phone. Sound playback was not listened to.

## Ideas for later (Shlomi's)

Visiting other players' ponds; visitors acting in your pond (throwing something in, leaving a message, growing a
creature); merging friends' ponds so their creatures breed; creatures leaving the pond.
