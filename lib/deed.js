// ── Deeds: what a kind of creature DECIDES to do, together ──
// Now and then one kind in the pond takes something into its head: to build, to march, to hold a council, to raid, to
// explore, to make peace. The model is told who they are and what is going on around them and makes up their plan out of a
// few plain steps the game can act out. Nothing is chosen from a list of plans, and a plan is never kept or handed out again.
'use strict';

const DEED_SYSTEM = `You are the shared will of one kind of small creature in Primordia, a pond where creatures evolve their own bodies. Something has got into them: they are about to DO something together, of their own accord, that shows a will or a plan. You decide what, and why. The player did not ask for it; they will watch it happen and wonder at it.
You are told about the pond: the kinds living in it (with how many, what they look like, how they live), the things the player dropped in, walls and regions in the water, what has happened lately, what is hurting them. Make the deed grow out of THAT: a kind hunted by a knight might raise a fort or march on him; a kind in an ice age might build a great fire-nest or migrate; a proud kind might hold a parade, crown a leader, dance round a monument to the thing the player gave them; two kinds might make war, or peace. Be inventive and specific: never a generic "they gather".
The game can act out a plan made of 2 to 5 STEPS, each one of:
 "gather" (they come together at the place), "circle" (they form a ring round it and turn: a council, a dance, a rite), "line" (they form up in a line and file past), "carry" (they go out, fetch, and bring things back to the place), "build" (they work at the place: the thing rises as they work), "charge" (they rush the target together), "guard" (they ring the place, facing outward, still), "scatter" (they set off to the far corners: exploring, fleeing, spreading word).
Reply with ONE JSON object and nothing else:
WRITE PLAINLY. The player may not be a native English speaker and the kinds have strange made-up names, so use short common words and simple sentences a ten-year-old reads at once; no poetry, no rare words (not "bulwark", "vigil", "procession", "host"). The game shows the name of the kind itself: do NOT put the name of the kind doing it in "what" or "why". If another kind is involved use its exact name, once.
{"title": what it is called, 2-4 plain words ("The Shell Fort", "March on the Knight", "The First Meeting"),
 "what": what they will do, starting with a verb, at most 60 characters, no full stop ("build a wall of bubbles around their babies"),
 "why": the reason, a plain clause, at most 70 characters, no full stop ("the Bloopton keep attacking them"),
 "say": ONE sentence, at most 140 characters, telling the player what they have decided and why, as a storyteller would,
 "kind": the exact name of the kind doing it (from the list you were given), "share": 0.3 to 1 (how many of them join),
 "place": where it happens: {"x": 0..1, "y": 0..1} across the pond, or {"near": the exact name of a thing, wall or kind} or {"near": "self"} (where most of them already are),
 "target": "" or the exact name of a thing, a wall/region or another kind that the charge is aimed at,
 "win": if there is a target, what success does: "break" (a thing or wall is worn down by them) | "drive" (the other kind is hurt and driven off) | "befriend" (nobody is hurt: both kinds are gladdened),
 "steps": [{"do": one of the eight, "secs": 6 to 40, "cry": what they shout or chant while doing it, at most 16 characters}, ...],
 "result": what is left standing when they finish, or null if nothing is (a raid, a dance): {"name": at most 24 characters ("Shell Fort"), "looks": at most 60 characters, plain words, for the artist who will draw it ("a low round fort of shells and pebbles with a flag"), "stuff": "ice"|"fire"|"water"|"rock"|"plant"|"toxic"|"light"|"dark"|"magic", "shape": "circle" (a place) | "ring" (a wall round a place), "solid": true if nothing can pass its wall, "feed": 0..1, "slow": 0..1, "hurt": 0..1 (it harms what comes into it: a trap, a fire), "pull": -1..1, "size": 0.05 to 0.2, "life": 60 to 400 seconds}}`;

function extractJson(text) {
  text = String(text || '');
  const a = text.indexOf('{'); if (a < 0) return null;
  for (let b = text.lastIndexOf('}'); b > a; b = text.lastIndexOf('}', b - 1)) { try { return JSON.parse(text.slice(a, b + 1)); } catch { /* try a shorter slice */ } }
  return null;
}
const str = (v, n) => String(v === undefined || v === null ? '' : v).replace(/[<>"]/g, '').replace(/\s+/g, ' ').trim().slice(0, n);
const num = (v, a, b, d) => { v = Number(v); return Number.isFinite(v) ? Math.max(a, Math.min(b, v)) : d; };
const DO = ['gather', 'circle', 'line', 'carry', 'build', 'charge', 'guard', 'scatter'];

function clean(raw) {
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.steps)) return null;
  const steps = raw.steps.filter((s) => s && DO.includes(s.do)).slice(0, 5).map((s) => ({ do: s.do, secs: num(s.secs, 6, 40, 14), cry: str(s.cry, 22) }));
  if (steps.length < 1 || !str(raw.title, 40) || !str(raw.kind, 40)) return null;
  const p = raw.place && typeof raw.place === 'object' ? raw.place : {};
  const r = raw.result && typeof raw.result === 'object' ? raw.result : null;
  return {
    title: str(raw.title, 40), say: str(raw.say, 160), what: str(raw.what, 80), why: str(raw.why, 90), kind: str(raw.kind, 40), share: num(raw.share, 0.3, 1, 0.7),
    place: p.near ? { near: str(p.near, 40) } : { x: num(p.x, 0.08, 0.92, 0.5), y: num(p.y, 0.12, 0.9, 0.5) },
    target: str(raw.target, 40), win: ['break', 'drive', 'befriend'].includes(raw.win) ? raw.win : 'break', steps,
    result: r && str(r.name, 24) ? { name: str(r.name, 24), looks: str(r.looks, 120), stuff: str(r.stuff, 8), shape: r.shape === 'ring' ? 'ring' : 'circle', solid: !!r.solid, feed: num(r.feed, 0, 1, 0), slow: num(r.slow, 0, 1, 0), hurt: num(r.hurt, 0, 1, 0), pull: num(r.pull, -1, 1, 0), size: num(r.size, 0.05, 0.2, 0.1), life: num(r.life, 60, 400, 200) } : null,
  };
}

function createDeeds({ models, defaultModel, getUsage }) {
  const pick = (id) => { const ids = Object.keys(models || {}); const use = id && models[id] ? id : ids.includes(defaultModel) ? defaultModel : ids[0]; return use ? { id: use, call: models[use].call } : null; };
  const usdOf = (id) => { try { const u = getUsage().allTime.byModel[id]; return u ? u.usd : 0; } catch { return 0; } };
  return {
    /** { deed, source, usd } : what one kind decides to do, made up for this pond now */
    async decide(info, canGenerate) {
      const want = info && info.model, m = pick(!want || /haiku|nano|mini|luna/.test(String(want)) ? (process.env.PRIMORDIA_DEED_MODEL || 'claude-sonnet-5-5') : want) || pick(want);
      if (!m || (canGenerate && !canGenerate())) return { deed: null, source: 'none' };
      const before = usdOf(m.id);
      let d = null;
      try { d = clean(extractJson(await m.call({ system: DEED_SYSTEM, user: 'The pond: ' + JSON.stringify((info && info.pond) || {}).slice(0, 6000), temperature: 1, maxTokens: 900, ms: 50000 }))); }
      catch (err) { console.error('deed failed:', err.message); }
      return d ? { deed: d, source: 'ai', usd: +Math.max(0, usdOf(m.id) - before).toFixed(5) } : { deed: null, source: 'none' };
    },
  };
}
module.exports = { createDeeds, DEED_SYSTEM };
