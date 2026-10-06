// ── The pond's wish ──
// The goal of the game. The pond dreams of one creature at a time ("a brave little thing with a blade"). The player makes
// it come true with the tools they already have: dropping things in, causing events, keeping and breeding. Now and then the
// game shows the model a picture of living creatures and asks how close each is to the wish. When one is close enough it
// becomes a LEGEND, the player's level goes up, and a harder wish follows. Wishes, level and legends are kept per player.
'use strict';

const WISH_SYSTEM = `You are the dreaming voice of a pond in Primordia, a game where creatures evolve their own bodies and the player is nature. Give the pond ONE wish: a creature it dreams of seeing. The player will try to make it come true by steering evolution, never by drawing: they can drop any thing or being into the pond (a knight, a snowman, a cactus), cause any event (an ice age, a flood of food, darkness), and keep and breed the creatures they like.
What bodies in this pond can become: one to three rounded masses joined together (a head on a body, a pair of ears, a stack), eyes and a mouth, legs and arms, fins, wings, horns, spikes, tentacles, feelers, tails, a shell, a coat of fur, scales or feathers, stripes and spots, any colour, a glow. They also grow parts in answer to what is in the pond: a bone blade if a knight is about, a woolly sweater in an ice age, a parasol in a heat wave. So a wish may ask for such a thing.
The wish must be something a judge can SEE in a picture, and sweet enough that someone would want that creature: "a sleepy mushroom in a scarf", "a brave little thing with a blade", "a twin-eared one that glows".
Its difficulty follows "level": level 1 asks for ONE plain visible trait ("a furry one", "one with horns", "a spotted one"); each level adds a trait or makes it more particular; by level 5 it is a little character with three or four traits, at least one of which needs something dropped in or an event.
You are told about the pond: do not wish for what most of its creatures already have. Never repeat a title from "had".
Reply with ONE JSON object and nothing else:
{"title": at most 7 words, starting with "A" or "An", "text": one warm sentence in the pond's voice, at most 110 characters, "needs": 1 to 4 short visible traits, each at most 5 words, that together make the wish ("carries a blade", "has fur"), "hint": one sentence of at most 110 characters that nudges the player towards what they might add or cause, without giving a recipe}`;

const CHECK_SYSTEM = `You are the judge of a wish in Primordia, a pond where creatures evolve. The pond wished for one particular creature. You are shown ONE picture: living creatures side by side, each with a number in its corner. For each, say how close it is to the wish, from 0 to 10, looking only at the picture.
0-2: nothing of the wish. 3-5: one of the things asked for is there, or a faint likeness. 6-7: most of it is there but something asked for is missing or hard to see. 8-9: every trait asked for is plainly visible and it reads as the wished creature. 10: it is exactly that creature, and charming.
Judge by the list "needs" and nothing else: the wish's title and sentence are only its voice, so words in them that are not in "needs" (small, round, sweet) must not cost a creature anything. Give 8 or more when EVERY trait in "needs" can be plainly pointed at in the picture, and only then. Do not reward a creature for being cute if it is not what was wished for.
Reply with ONE JSON object and nothing else: {"m": [[number in the corner, closeness, "at most 9 words: what it has of the wish and what it lacks"], ...]} with one entry for every creature shown.`;

function extractJson(text) {
  text = String(text || '');
  const a = text.indexOf('{'); if (a < 0) return null;
  for (let b = text.lastIndexOf('}'); b > a; b = text.lastIndexOf('}', b - 1)) { try { return JSON.parse(text.slice(a, b + 1)); } catch { /* try a shorter slice */ } }
  return null;
}
const clean = (v, n) => String(v || '').replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, n);

function createWish({ store, models, defaultModel, getUsage }) {
  const pick = (id) => { const ids = Object.keys(models || {}); const use = id && models[id] ? id : ids.includes(defaultModel) ? defaultModel : ids[0]; return use ? { id: use, call: models[use].call } : null; };
  const usdOf = (id) => { try { const u = getUsage().allTime.byModel[id]; return u ? u.usd : 0; } catch { return 0; } };
  const state = (who) => store.get('wish', who) || { level: 1, cur: null, had: [], legends: [] };

  async function make(st, pond, modelId) {
    const m = pick(modelId || process.env.PRIMORDIA_WISH_MODEL || 'claude-sonnet-5-5');
    if (!m) return { wish: null, usd: 0 };
    const before = usdOf(m.id);
    let w = null;
    try {
      const raw = extractJson(await m.call({ system: WISH_SYSTEM, user: JSON.stringify({ level: st.level, had: st.had.slice(-12), pond: pond || {} }).slice(0, 4500), temperature: 1, maxTokens: 400 }));
      const needs = raw && Array.isArray(raw.needs) ? raw.needs.map((x) => clean(x, 40)).filter(Boolean).slice(0, 4) : [];
      if (raw && clean(raw.title, 60) && needs.length) w = { id: Date.now().toString(36), title: clean(raw.title, 60), text: clean(raw.text, 130), needs, hint: clean(raw.hint, 130), level: st.level, by: m.id };
    } catch (err) { console.error('wish failed:', err.message); }
    return { wish: w, usd: Math.max(0, usdOf(m.id) - before) };
  }

  return {
    /** the player's wish as it stands; a first one (or the next one) is dreamt up when there is none */
    async get(who, info, canGenerate) {
      const st = state(who);
      if (st.cur && !(info && info.another)) return { wish: st.cur, level: st.level, legends: st.legends.slice(-24), source: 'library' };
      if (canGenerate && !canGenerate()) return { wish: st.cur, level: st.level, legends: st.legends.slice(-24), source: 'none' };
      if (st.cur && info && info.another) st.had.push(st.cur.title);          // the player asked for a different one
      const r = await make(st, info && info.pond, info && info.model);
      if (!r.wish) return { wish: st.cur, level: st.level, legends: st.legends.slice(-24), source: 'none' };
      st.cur = r.wish; store.set('wish', who, st);
      return { wish: st.cur, level: st.level, legends: st.legends.slice(-24), source: 'ai', usd: +r.usd.toFixed(5) };
    },
    /** how close each creature on the sheet is to the wish */
    async check(who, info, canGenerate) {
      const st = state(who);
      const img = info && typeof info.image === 'string' && info.image.length > 2000 && info.image.length < 900000 && /^image\/(png|jpeg)$/.test(String(info.mime)) ? { mime: info.mime, b64: info.image } : null;
      if (!st.cur || !img) return { marks: null, source: 'none' };
      const m = pick((info && info.model) || process.env.PRIMORDIA_WISH_MODEL || 'claude-sonnet-5-5');
      if (!m || (canGenerate && !canGenerate())) return { marks: null, source: 'none' };
      const n = Math.max(1, Math.min(12, Number(info.count) || 8)), before = usdOf(m.id);
      let marks = null;
      try {
        const raw = extractJson(await m.call({ system: CHECK_SYSTEM, user: JSON.stringify({ wish: st.cur.title, says: st.cur.text, needs: st.cur.needs, creatures: n }), image: img, temperature: 0.2, maxTokens: 120 + n * 50 }));
        const L = raw && Array.isArray(raw.m) ? raw.m : [];
        marks = L.filter((q) => Array.isArray(q) && Number.isFinite(Number(q[0])) && Number.isFinite(Number(q[1])) && q[0] >= 1 && q[0] <= n).slice(0, n).map((q) => ({ id: Number(q[0]), close: Math.max(0, Math.min(10, Number(q[1]))), why: clean(q[2], 80) }));
      } catch (err) { console.error('wish check failed:', err.message); }
      if (!marks || !marks.length) return { marks: null, source: 'none' };
      return { marks, wish: st.cur.id, source: 'ai', usd: +Math.max(0, usdOf(m.id) - before).toFixed(5) };
    },
    /** the wish came true: the creature is written into the legends, the level rises, and the next wish is dreamt */
    async done(who, info) {
      const st = state(who);
      if (!st.cur || !info || info.wish !== st.cur.id) return { error: 'no_such_wish' };
      st.legends.push({ title: st.cur.title, name: clean(info.name, 44), level: st.cur.level, gen: Math.max(0, Math.round(Number(info.gen) || 0)), why: clean(info.why, 90), story: clean(info.story, 240), at: Date.now() });
      if (st.legends.length > 60) st.legends.shift();
      st.had.push(st.cur.title); if (st.had.length > 40) st.had.shift();
      st.level = Math.min(99, st.level + 1); st.cur = null;
      const r = await make(st, info.pond, info.model);
      st.cur = r.wish; store.set('wish', who, st);
      return { wish: st.cur, level: st.level, legends: st.legends.slice(-24), source: r.wish ? 'ai' : 'none', usd: +r.usd.toFixed(5) };
    },
  };
}
module.exports = { createWish, WISH_SYSTEM, CHECK_SYSTEM };
