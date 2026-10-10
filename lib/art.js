// The look of a star, imagined by an image model: its GROUND, and the ARCHITECTURE of the people who live on it.
// OFF unless LEONARDO_API_KEY is set. Nothing here is drawn beforehand: a picture is asked for when a star first needs it, from what
// that star and its people ARE, and then kept for good, so the same star looks the same every time and nobody pays for a picture twice.
// The client sends only FACTS (which kind of ground; what the builders' bodies are like); every prompt is written here, so a client
// cannot ask for anything else.
//   ground   a square of this kind of ground seen from straight above (the game lays it over the whole star, mirrored, so it has no seams)
//   civic    six buildings of this people, in a grid of 3 by 2: the Heart of their colony at its four stages, a house, a hall
//   works    six more: a farm, a defence tower, a ring wall, a beacon tower, a spaceport, a spaceship
//   nature   six things that grow or lie on this kind of star: its lumen crystals, building stone, reeds, shells, a fruit bush, a rock (on flat magenta)
// The buildings stand on flat green (the game lifts them off it); their team-colour parts are flat magenta (the game repaints those
// in the colour of whoever owns the building: yours blue, an enemy's red).
'use strict';
const fs = require('fs');
const path = require('path');
const { meterUsd } = require('./ai');
const API = 'https://cloud.leonardo.ai/api/rest';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const MAX_BYTES = 6 * 1024 * 1024;
const clean = (s, n) => String(s || '').replace(/[^\w\s,.:;'()\-]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n);
const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 60);

const GROUND_STYLE = ' The picture is ONLY ground, filling the whole square from edge to edge, seen from DIRECTLY ABOVE (the camera points straight down: a flat map view, no perspective, no horizon, no sky). ' +
  'It is the terrain texture of a real-time strategy game such as Age of Empires or StarCraft: richly hand-painted, realistic, natural muted colours, soft even daylight from the upper left, gentle contrast. ' +
  'The detail is SMALL and spread evenly over the whole picture (as if seen from thirty metres up): no single large rock, crater, plant or patch that would stand out, nothing that reads as an object. ' +
  'No buildings, no creatures, no roads, no water, no text, no border, no vignette: the edges are as bright as the middle.';
const GROUNDS = {
  reef: 'The dry ground of a rust-red desert planet like Mars: fine red-orange dust and sand, many small scattered pebbles and stones, faint hairline cracks, soft wind ripples.',
  crag: 'The bare ground of an airless grey moon: grey-brown regolith dust, gravel and small angular stones, a few tiny pits, faint cracks.',
  marsh: 'The ground of a mossy alien planet: a soft carpet of deep green and olive moss and lichen over dark damp soil, small patches of bare earth, tiny sprouts and small stones.',
  crystal: 'The ground of a crystal planet: violet and lilac rock dust with fine mineral grains, many small glittering crystal chips and pale mineral veins, small stones.',
  ember: 'The ground of a volcanic planet: dark charcoal basalt and grey ash, cracked into small plates, small stones, a few very thin faintly glowing orange cracks.',
  frost: 'The ground of an ice planet: packed pale blue-white snow and ice, fine wind-carved ripples, small chunks of ice, thin pale blue cracks.',
};
const WORLD = { reef: 'a rust-red desert planet', crag: 'a bare grey moon of rock', marsh: 'a green planet of moss', crystal: 'a violet planet of crystal', ember: 'a dark volcanic planet', frost: 'a planet of ice and snow' };

const SHEET_HEAD = 'A sprite sheet of SIX separate buildings for a futuristic space-colony real-time strategy game (the clarity and charm of Age of Empires and StarCraft buildings). ';
const SHEET_STYLE = 'It is a clean, hopeful NEW SOCIETY on a new world: advanced and well made, of alloy, glass and solar panels, with warm lit windows; nothing medieval, nothing oriental, no pagodas, no thatch, nothing ruined or grim. ' +
  'LAYOUT: the six buildings stand in a neat grid of 3 columns and 2 rows. Each building is centred in its own cell, fills about two thirds of the cell, and has clear empty background all round it: no building touches or overlaps another or the edge of the picture. ' +
  'Every building is seen from the SAME classic isometric three-quarter top-down strategy-game camera (looking down at about 45 degrees, so its roof and two of its sides show), lit by sunlight from the upper left, ' +
  'painted as detailed, realistic, solid game art with real volume, and stands on its own low round concrete foundation pad. ' +
  'TEAM COLOUR: on every building a few clear parts (a roof band, a banner, some panels, a stripe round the pad) are painted flat pure MAGENTA (#FF00FF); magenta or pink appears nowhere else. ' +
  'BACKGROUND: one perfectly flat, solid, pure GREEN (#00FF00) everywhere: no gradient, no ground, no shadows cast on the background, no grid lines, no borders, no text, no labels, no numbers. No bright green anywhere on the buildings. ';
const PARTS = {
  civic: { cells: ['heart0', 'heart1', 'heart2', 'heart3', 'house', 'hall'], list: ['the tiny first shelter of a new colony: one small pod with a hatch, an antenna and a lamp',
    'a small round command centre with a door, windows and one small side module',
    'a larger command centre: a big hall with a glowing core, two side wings and two slim towers',
    'a grand citadel, the heart of a city: a great central hall with a bright glowing energy core, four tall spires, wide wings and terraces',
    'a small cosy family house with a door, a window and a small solar roof',
    'a long assembly hall with stepped terraces, a wide entrance and tall windows'] },
  works: { cells: ['huts', 'tower', 'wall', 'spire', 'port', 'ship'], list: ['a farm: two low glass greenhouses with crop beds inside and a small water tank',
    'a defence tower: a sturdy round turret with a big glowing lens eye at its top',
    'a round fortified ring wall with an open courtyard in its middle and one gate at the front',
    'a slim tall beacon tower with a bright light at its tip and a small base house',
    'a spaceport: a wide, low, flat round landing pad with landing lights at its rim and a small control tower at its RIGHT side (the pad itself is empty and takes up the left two thirds)',
    'a spaceship standing upright on its fins, ready to launch: a sleek rocket with round windows'] },
};

const NATURE_CELLS = ['lumen', 'quarry', 'reeds', 'shells', 'plant', 'rock'];
const natureFor = (terrain) => 'A sprite sheet of SIX separate natural things found on ' + WORLD[terrain] + ', map objects for a real-time strategy game (the clarity and charm of Age of Empires and StarCraft map objects). ' +
  'LAYOUT: the six things stand in a neat grid of 3 columns and 2 rows. Each is centred in its own cell, fills about two thirds of the cell, and has clear empty background all round it: nothing touches or overlaps anything else or the edge of the picture. ' +
  'Every thing is seen from the SAME classic isometric three-quarter top-down strategy-game camera (looking down at about 45 degrees), lit by sunlight from the upper left, painted as detailed, realistic, solid game art with real volume. ' +
  'Each thing is ONLY itself: no patch of ground under it, no base, no pad, no shadow on the background. They plainly belong to this world: their colours and textures are those of ' + WORLD[terrain] + '. ' +
  'BACKGROUND: one perfectly flat, solid, pure MAGENTA (#FF00FF) everywhere: no gradient, no ground, no shadows, no grid lines, no borders, no text, no labels, no numbers. No pink or magenta anywhere on the things themselves. ' +
  'THE SIX THINGS. Top row, left to right: (1) a cluster of tall glowing pale-cyan energy crystals growing straight up out of the ground; (2) an outcrop of good building stone: a tight pile of angular boulders; (3) a clump of tall tough reeds or fibre stalks as they would grow on this world. ' +
  'Bottom row, left to right: (4) a little heap of large spiral shells and shell fragments; (5) a low bush of this world bearing bright glowing edible fruit; (6) a single weathered rock formation typical of this world.';
/** who the builders are, said plainly (only what the client's facts hold) */
function peopleOf(info) {
  const p = info && info.people; if (!p || !clean(p.kind, 40)) return null;
  const facts = (Array.isArray(p.facts) ? p.facts : []).slice(0, 9).map((x) => clean(x, 60)).filter(Boolean);
  return { kind: clean(p.kind, 40), facts, colours: clean(p.colours, 60) };
}
/** the name a picture is kept under, and how to ask for it: { key, kind, prompt, w, h, quality, cells? } or null */
function jobFor(info) {
  const what = String(info && info.what || ''), terrain = String(info && info.terrain || '');
  if (!GROUNDS[terrain]) return null;
  if (what === 'ground') { const v = Math.max(0, Math.min(1, (info.variant | 0))); return { key: 'ground.' + terrain + '.' + v, kind: 'ground', prompt: GROUNDS[terrain] + GROUND_STYLE, w: 1024, h: 1024, quality: 'MEDIUM' }; }
  if (what === 'nature') return { key: 'nature.' + terrain + '.0', kind: 'nature', cells: NATURE_CELLS, bg: 'magenta', prompt: natureFor(terrain), w: 1264, h: 848, quality: 'MEDIUM' };
  const P = PARTS[what]; if (!P) return null;
  const pe = peopleOf(info), L = P.list;
  const who = pe ? 'THE BUILDERS are a people of small creatures living on ' + WORLD[terrain] + '. Each of them is a "' + pe.kind + '": ' + pe.facts.join(', ') + (pe.colours ? '; coloured ' + pe.colours : '') + '. ' +
    'Invent an architecture that is THEIRS and nobody else\'s: let the shapes of their buildings echo their own bodies (their outline, limbs, shells, horns, fins, eyes, whatever they have) and let the wall colours and materials suit them and their world ' +
    '(never pink, magenta or bright green: if that is their colour, use white, cream and grey). All six buildings plainly belong to the same people. No creatures in the picture, only buildings. '
    : 'The walls are white and pale-grey alloy, the shapes rounded and modern. ';
  return { key: what + '.' + terrain + '.' + (pe ? norm(pe.kind) : 'any'), kind: what, cells: P.cells, w: 1264, h: 848, quality: 'MEDIUM',
    prompt: SHEET_HEAD + who + SHEET_STYLE + 'THE SIX BUILDINGS. Top row, left to right: (1) ' + L[0] + '; (2) ' + L[1] + '; (3) ' + L[2] + '. Bottom row, left to right: (4) ' + L[3] + '; (5) ' + L[4] + '; (6) ' + L[5] + '.' };
}

function createArt({ store, apiKey, fetchImpl, model }) {
  const key = apiKey !== undefined ? apiKey : process.env.LEONARDO_API_KEY;
  const doFetch = fetchImpl || fetch;
  const modelId = model || process.env.PRIMORDIA_ARTIST || 'openai/gpt-image-2.5-flare';
  const headers = () => ({ authorization: 'Bearer ' + key, accept: 'application/json', 'content-type': 'application/json' });
  const busy = new Map();

  async function generate(job) {
    const res = await doFetch(API + '/v2/generations', { method: 'POST', headers: headers(), body: JSON.stringify({ public: false, model: modelId, parameters: { prompt: job.prompt, quantity: 1, width: job.w, height: job.h, quality: job.quality, prompt_enhance: 'OFF' } }) });
    const json = await res.json().catch(() => null);
    const id = json && json.generate && json.generate.generationId;
    if (!res.ok || !id) throw new Error('leonardo rejected the picture (HTTP ' + res.status + ')');
    const usd = parseFloat((json.generate.cost && json.generate.cost.amount) || '0') || 0;      // billed when queued; this is the amount it reports
    meterUsd('leonardo-' + modelId, usd);
    for (let i = 0; i < 110; i++) {
      await sleep(3000);
      const p = await doFetch(API + '/v1/generations/' + id, { headers: headers() });
      const j = await p.json().catch(() => null);
      const gen = j && j.generations_by_pk;
      if (gen && gen.status === 'FAILED') throw new Error('leonardo refused this picture');
      if (gen && gen.status === 'COMPLETE') {
        const url = gen.generated_images && gen.generated_images[0] && gen.generated_images[0].url;
        if (!url) throw new Error('leonardo finished but returned no picture');
        const a = await doFetch(encodeURI(url), { headers: { 'user-agent': 'Mozilla/5.0' } });
        if (!a.ok) throw new Error('could not download the picture (HTTP ' + a.status + ')');
        const buf = Buffer.from(await a.arrayBuffer());
        if (buf.length < 2000 || buf.length > MAX_BYTES) throw new Error('the picture was empty or too big');
        return { mime: /\.png(\?|$)/i.test(url) ? 'image/png' : /\.webp(\?|$)/i.test(url) ? 'image/webp' : 'image/jpeg', b64: buf.toString('base64'), by: modelId, usd };
      }
    }
    throw new Error('leonardo took too long');
  }
  /** with no painter to ask: the nearest thing anyone has had painted before (the same part for the same kind of star, else for any) */
  function nearest(job) {
    const all = store.keys('art').filter((k) => k.indexOf(job.kind + '.') === 0), terr = job.key.split('.')[1];
    const pick = all.filter((k) => k.split('.')[1] === terr)[0] || (job.kind === 'ground' ? null : all[0]);      // (ground: only of the same kind of star)
    const hit = pick ? store.get('art', pick) : null;
    return hit && hit.b64 ? hit : null;
  }

  return {
    enabled: () => !!key,
    model: modelId,
    jobFor,
    generate,
    /** { art: { mime, b64, by, cells? }, key, source: 'library' | 'leonardo', usd, near? } or { error }. With libraryOnly nothing is ever paid for. */
    async forStar(info, opts) {
      opts = opts || {};
      const job = jobFor(info);
      if (!job) return { error: 'empty' };
      const out = (p, source, extra) => Object.assign({ art: { mime: p.mime, b64: p.b64, by: p.by, cells: job.cells, bg: job.bg }, key: job.key, source }, extra || {});
      const hit = store.get('art', job.key);
      if (hit && hit.b64) return out(hit, 'library');
      const can = !info.libraryOnly && !!key;
      if (!can || (opts.canGenerate && !opts.canGenerate())) { const n = nearest(job); return n ? out(n, 'library', { near: true }) : { error: info.libraryOnly ? 'not_made' : !key ? 'no_painter' : 'slow_down' }; }
      if (busy.has(job.key)) return busy.get(job.key);
      const run = generate(job).then((p) => { const usd = p.usd; delete p.usd; store.set('art', job.key, p); return out(p, 'leonardo', { usd }); }, (err) => { if (opts.onError) opts.onError(err); const n = nearest(job); return n ? out(n, 'library', { near: true }) : { error: 'failed' }; });
      busy.set(job.key, run);
      run.finally(() => busy.delete(job.key));
      return run;
    },
  };
}
module.exports = { createArt, jobFor };
