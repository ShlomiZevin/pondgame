// Primordia server: a few small APIs, no dependencies.
//
//   POST /api/ai/thing   { word }            → { thing }       what a typed word is made of
//   POST /api/ai/ideas   { gen, species }    → { ideas }       mutation ideas for the living species
//   POST /api/ai/organ   { the pond now }    → { organ }       a new body part invented for this pond
//   POST /api/ai/icon    { name, wonder, hue } → { icon }       a transparent icon for a marvel (kept for good per name; only with LEONARDO_API_KEY)
//   POST /api/ai/marvel  { pond, creature }  → { marvel }      a super-rare gift for one lucky creature (name, wonder, a special, effects)
//   POST /api/deed       { pond } → { deed }               a plan a kind of creature takes into its head (build, march, council...), acted out by the game
//   POST /api/wish       { op: 'get' | 'check' | 'done', ... } → the pond's wish (kept per player), marks for a sheet of creatures, the next wish
//   POST /api/ai/figure  { word, note, hue } → { figure: { svg, pivots, floats } }   a typed being, DRAWN by the model as a puppet of parts (kept per word)
//   POST /api/ai/plan    { the pond, have } → { plan }         a new SHAPE OF BODY (a few masses and how they join), answering what is happening in the pond
//   POST /api/ai/design  { pressures, have... } → { design }   a new KIND of body part: a shape, how it moves, what it gives
//   POST /api/ai/judge   { image, mime, creatures, check? } → { judge }   the model LOOKS at the creatures and grades each: score, why, one fix
//   POST /api/ai/skin    { traits, colour }  → { skin }        how a species looks, drawn from its real traits
//   POST /api/ai/event   { text }            → { event }       free text → something that happens
//   POST /api/ai/story   { measured facts }  → { story }       what changed and why, in plain words
//   POST /api/ai/paint   { sig, build, facts, colours, world } → { paint }  a painting of a kind of creature (only with LEONARDO_API_KEY)
//   POST /api/ai/voice   { text, tone }      → { sound }       a line spoken aloud for a creature that talks (Leonardo dialogue-v3, kept per line)
//   POST /api/ai/sound   { word, note }      → { sound }       a sound for a thing (only with LEONARDO_API_KEY)
//   GET  /api/pond                           → { save, report } the player's pond, advanced to now
//   PUT  /api/pond       { save }            → { ok }          store the player's pond
//   POST /api/tick       (admin)             → counts          advance idle ponds (for a scheduler)
//   GET  /api/library                        every AI decision kept so far (things, organs, events, ideas)
//   GET  /api/usage                          today's model calls and tokens (the cost meter)
//   GET  /healthz
//   GET  /dev                                a page that hosts the game the way a site would (for testing)
//
// Who is asking: the `x-user` header (a stable id your site decides). Put your own sign-in in `whoIs`.
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const { createStore } = require('./lib/store');
const { createAi, modelsFromEnv, getUsage, attachBooks } = require('./lib/ai');
const { createWish } = require('./lib/wish');
const { createDeeds } = require('./lib/deed');
const { createPonds } = require('./lib/pond');
const { createIcons } = require('./lib/icon');
const { createOffline } = require('./lib/offline');
const { createSounds } = require('./lib/sound');
const { createPainter } = require('./lib/paint');

// A local key file, never committed: primordia-server/.env.local  (KEY=value lines). The real environment always wins.
function loadEnv() {
  try {
    for (const line of fs.readFileSync(path.join(__dirname, '.env.local'), 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  } catch { /* no local file */ }
}
loadEnv();

const PORT = Number(process.env.PORT) || 8787;

/** Who is calling. Replace with a real check (Firebase ID token, a session...). */
function defaultWhoIs(req) {
  const id = String(req.headers['x-user'] || '').trim();
  return /^[A-Za-z0-9_.@-]{3,80}$/.test(id) ? id : null;
}

// A small rate limit per caller: so a loop cannot run up the model bill. Cache hits are free; only model calls count.
function createLimiter(perHour) {
  const hits = new Map();
  return {
    take(who) {
      const t = Date.now(), list = (hits.get(who) || []).filter((x) => t - x < 3600_000);
      if (list.length >= perHour) { hits.set(who, list); return false; }
      list.push(t); hits.set(who, list);
      return true;
    },
  };
}

function createApp(opts = {}) {
  const store = opts.store || createStore(opts.dataDir || process.env.PRIMORDIA_DATA || path.join(__dirname, 'data'));
  // tests pass one fake callModel; a real server takes every model it has a key for
  const models = opts.models || (opts.callModel !== undefined ? (opts.callModel ? { default: { label: 'Default', call: opts.callModel } } : {}) : modelsFromEnv());
  const offline = opts.offline || createOffline();
  attachBooks(store);
  const ai = createAi({ store, models, defaultModel: opts.defaultModel || process.env.PRIMORDIA_MODEL, offline, rand: opts.rand });
  const logErr = (err) => console.error('model failed:', err.message);
  const deeds = createDeeds({ models, defaultModel: opts.defaultModel || process.env.PRIMORDIA_MODEL, getUsage });
  const wish = createWish({ store, models, defaultModel: opts.defaultModel || process.env.PRIMORDIA_MODEL, getUsage });
  const sounds = opts.sounds || createSounds({ store, apiKey: opts.leonardoKey });
  const painter = opts.painter || createPainter({ store, apiKey: opts.leonardoKey });
  const paintLimiter = createLimiter(Number(process.env.PRIMORDIA_PAINTS_PER_HOUR) || 30);
  const icons = opts.icons || createIcons({ store, apiKey: opts.leonardoKey });
  const iconLimiter = createLimiter(Number(process.env.PRIMORDIA_ICONS_PER_HOUR) || 12);
  const soundLimiter = createLimiter(opts.soundsPerHour || Number(process.env.PRIMORDIA_SOUNDS_PER_HOUR) || 20);
  const ponds = createPonds({ store, now: opts.now, away: opts.away });
  const whoIs = opts.whoIs || defaultWhoIs;
  const limiter = createLimiter(opts.perHour || Number(process.env.PRIMORDIA_AI_PER_HOUR) || 240);
  const adminKey = opts.adminKey !== undefined ? opts.adminKey : process.env.PRIMORDIA_ADMIN;
  // the game being worked on in the Creator checkout if it is there (so an edit shows at once), otherwise the copy kept in this repo
  const liveGame = path.join(__dirname, '..', 'plaxzy-creator', 'local-games', 'primordia', 'game.html');
  const gameFile = opts.gameFile || process.env.PRIMORDIA_GAME || (fs.existsSync(liveGame) ? liveGame : path.join(__dirname, 'game', 'game.html'));
  const publicDir = path.resolve(opts.publicDir || process.env.PRIMORDIA_PUBLIC || path.join(__dirname, '..', '..', 'all-games-website', 'public'));
  const origin = opts.origin !== undefined ? opts.origin : process.env.PRIMORDIA_ORIGIN || '*';

  const send = (res, status, body, type) => {
    const data = typeof body === 'string' ? body : JSON.stringify(body);
    res.writeHead(status, {
      'content-type': type || 'application/json; charset=utf-8', 'cache-control': 'no-store',
      'access-control-allow-origin': origin, 'access-control-allow-headers': 'content-type,x-user,x-admin', 'access-control-allow-methods': 'GET,POST,PUT,OPTIONS',
    });
    res.end(data);
  };
  const readJson = (req, max) => new Promise((resolve, reject) => {
    let n = 0; const chunks = [];
    req.on('data', (c) => { n += c.length; if (n > max) { reject(Object.assign(new Error('too big'), { status: 413 })); req.destroy(); } else chunks.push(c); });
    req.on('end', () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')); } catch { reject(Object.assign(new Error('bad json'), { status: 400 })); } });
    req.on('error', reject);
  });

  async function handle(req, res) {
    const url = new URL(req.url, 'http://x');
    const route = req.method + ' ' + url.pathname;
    if (req.method === 'OPTIONS') return send(res, 204, '');
    if (route === 'GET /healthz') return send(res, 200, 'ok', 'text/plain');
    if (route === 'GET /dev' || route === 'GET /dev/game') {
      if (route === 'GET /dev') return send(res, 200, fs.readFileSync(path.join(__dirname, 'public', 'dev-host.html'), 'utf8'), 'text/html; charset=utf-8');
      try { return send(res, 200, fs.readFileSync(gameFile, 'utf8'), 'text/html; charset=utf-8'); } catch { return send(res, 404, { error: 'game_not_found' }); }
    }
    // the dev page also serves the site's own libraries and sounds, when they are on this machine (so /dev has sound)
    if (req.method === 'GET' && url.pathname.startsWith('/public/')) {
      const rel = path.normalize(decodeURIComponent(url.pathname.slice('/public/'.length)));
      const file = path.join(publicDir, rel);
      if (!rel.startsWith('..') && file.startsWith(publicDir) && fs.existsSync(file) && fs.statSync(file).isFile()) {
        const types = { '.js': 'application/javascript', '.json': 'application/json', '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg' };
        res.writeHead(200, { 'content-type': types[path.extname(file)] || 'application/octet-stream', 'access-control-allow-origin': '*', 'cache-control': 'max-age=3600' });
        return fs.createReadStream(file).pipe(res);
      }
      if (url.pathname.endsWith('.js')) return send(res, 200, '/* not on this machine */', 'application/javascript');
      return send(res, 404, { error: 'not_found' });
    }

    // how much AI has been used today: calls and tokens per model (admin key if one is set)
    if (route === 'GET /api/usage') {
      if (adminKey && req.headers['x-admin'] !== adminKey) return send(res, 403, { error: 'forbidden' });
      return send(res, 200, Object.assign(getUsage(), { dailyCap: Number(process.env.PRIMORDIA_DAILY_CALLS) || 1500 }));
    }
    // the repository of every AI decision so far (shared by all players)
    if (route === 'GET /api/library') {
      if (adminKey && req.headers['x-admin'] !== adminKey) return send(res, 403, { error: 'forbidden' });
      return send(res, 200, ai.library());
    }
    if (route === 'POST /api/tick') {
      if (!adminKey || req.headers['x-admin'] !== adminKey) return send(res, 403, { error: 'forbidden' });
      return send(res, 200, await ponds.tick());
    }

    const who = whoIs(req);
    if (url.pathname.startsWith('/api/') && !who) return send(res, 401, { error: 'signin_required' });

    if (route === 'GET /api/ai/models') return send(res, 200, { models: ai.models(), default: ai.defaultModel, sound: sounds.enabled(), paint: painter.enabled(), icon: icons.enabled() });
    // a sound for a thing: made once per word (Leonardo), then served from the store
    if (route === 'POST /api/ai/icon') {      // a transparent icon for a marvel (kept for good per name; only with LEONARDO_API_KEY)
      const body = await readJson(req, 2000);
      const r = await icons.forMarvel(body, { canGenerate: () => iconLimiter.take(who), onError: (e) => console.error('icon failed:', e.message) });
      return send(res, r.error ? (r.error === 'no_icon_yet' || r.error === 'no_painter' ? 404 : r.error === 'empty' ? 400 : 503) : 200, r);
    }
    if (route === 'POST /api/ai/paint') {
      const body = await readJson(req, 4000);
      const r = await painter.forLook(body, { canGenerate: () => paintLimiter.take(who), onError: (e) => console.error('paint failed:', e.message) });
      return send(res, r.error ? (r.error === 'not_painted' || r.error === 'no_painter' ? 404 : r.error === 'empty' ? 400 : 503) : 200, r);
    }
    if (route === 'POST /api/ai/sound') {
      const body = await readJson(req, 2000);
      const word = String(body.word || '').trim().slice(0, 40);
      if (!word) return send(res, 400, { error: 'empty' });
      if (ai.refused(word)) return send(res, 422, { error: 'refused' });
      const r = await sounds.forWord(word, body.note, { canGenerate: () => soundLimiter.take(who), onError: (e) => console.error('sound failed:', e.message) });
      return send(res, r.error ? (r.error === 'no_sound' ? 404 : 503) : 200, r);
    }
    if (route === 'POST /api/ai/voice') {      // a creature that talks: its line, spoken aloud
      const body = await readJson(req, 2000);
      const text = String(body.text || '').trim().slice(0, 40);
      if (!text) return send(res, 400, { error: 'empty' });
      if (ai.refused(text)) return send(res, 422, { error: 'refused' });
      const r = await sounds.speak(text, String(body.tone || ''), { libraryOnly: !!body.libraryOnly, canGenerate: () => soundLimiter.take(who), onError: (e) => console.error('speech failed:', e.message) });
      return send(res, r.error ? (r.error === 'no_sound' || r.error === 'no_line_yet' ? 404 : 503) : 200, r);
    }
    if (route === 'POST /api/ai/thing') {
      const body = await readJson(req, 5000);
      const word = String(body.word || '').trim().slice(0, 80);
      if (!word) return send(res, 400, { error: 'empty' });
      if (ai.refused(word)) return send(res, 422, { error: 'refused' });
      // only a real model call costs, so only a real model call is counted against the caller
      const r = await ai.thing(word, { model: body.model, things: body.pond && Array.isArray(body.pond.things) ? body.pond.things : null, canGenerate: () => limiter.take(who), onError: logErr });
      if (r.error === 'refused') return send(res, 422, r);
      if (r.error) return send(res, 503, r);
      return send(res, 200, r);
    }
    if (route === 'POST /api/ai/ideas') {
      const body = await readJson(req, 4000);
      return send(res, 200, await ai.ideas(body, { model: body.model, canGenerate: () => limiter.take(who), onError: logErr }));
    }
    if (route === 'POST /api/ai/marvel') {
      const body = await readJson(req, 8000);
      body.recorded = sounds.lines(10);      // lines that already have a real recorded voice: a talking marvel may reuse some (see MARVEL_SYSTEM)
      const r = await ai.marvel(body, { model: body.model, canGenerate: () => limiter.take(who), onError: logErr });
      return send(res, 200, r);
    }
    if (route === 'POST /api/ai/organ') {
      const body = await readJson(req, 6000);
      const r = await ai.organ(body, { model: body.model, canGenerate: () => limiter.take(who), onError: logErr });
      return send(res, r.error ? 503 : 200, r);
    }
    if (route === 'POST /api/ai/design') {
      const body = await readJson(req, 12000);
      return send(res, 200, await ai.design(body, { model: body.model, canGenerate: () => limiter.take(who), onError: logErr }));
    }
    if (route === 'POST /api/deed') {      // what one kind of creature decides to do, together: made up for this pond now
      const body = await readJson(req, 14000);
      return send(res, 200, await deeds.decide(body, () => limiter.take(who)));
    }
    if (route === 'POST /api/wish') {      // the goal of the game: the pond's wish, how close the living creatures are to it, and its coming true
      const body = await readJson(req, 1000000);
      const take = () => limiter.take(who);
      if (body.op === 'check') return send(res, 200, await wish.check(who, body, take));
      if (body.op === 'done') { const r = await wish.done(who, body); return send(res, r.error ? 400 : 200, r); }
      return send(res, 200, await wish.get(who, body, take));
    }
    if (route === 'POST /api/ai/figure') {
      const body = await readJson(req, 2000);
      const r = await ai.figure(body, { model: body.model, canGenerate: () => limiter.take(who), onError: logErr });
      return send(res, r.error === 'refused' ? 422 : r.error ? 400 : 200, r);
    }
    if (route === 'POST /api/ai/plan') {
      const body = await readJson(req, 12000);
      return send(res, 200, await ai.plan(body, { model: body.model, canGenerate: () => limiter.take(who), onError: logErr }));
    }
    if (route === 'POST /api/ai/judge') {
      const body = await readJson(req, 1000000);      // it carries the picture
      return send(res, 200, await ai.judge(body, { model: body.model, canGenerate: () => limiter.take(who), onError: logErr }));
    }
    if (route === 'POST /api/ai/skin') {
      const body = await readJson(req, 4000);
      return send(res, 200, await ai.skin(body, { model: body.model, canGenerate: () => limiter.take(who), onError: logErr }));
    }
    if (route === 'POST /api/ai/event') {
      const body = await readJson(req, 12000);
      const r = await ai.event(body.auto ? '' : body.text, { model: body.model, auto: !!body.auto, pond: body.pond, canGenerate: () => limiter.take(who), onError: logErr });
      return send(res, r.error === 'refused' ? 422 : r.error === 'empty' ? 400 : r.error ? 503 : 200, r);
    }
    if (route === 'POST /api/ai/story') {
      const body = await readJson(req, 8000);
      const r = await ai.story(body, { model: body.model, canGenerate: () => limiter.take(who), onError: logErr });
      return send(res, r.error ? 503 : 200, r);
    }
    if (route === 'GET /api/pond') {
      const r = await ponds.get(who);
      return send(res, 200, r || { save: null, report: null });
    }
    if (route === 'PUT /api/pond') {
      const body = await readJson(req, 1300000);      // a whole pond, every creature in it (lib/pond.js holds the real limit)
      const r = await ponds.put(who, body.save);
      return send(res, r.status || 200, r);
    }
    if (route === 'DELETE /api/pond') { ponds.del(who); return send(res, 200, { ok: true }); }
    return send(res, 404, { error: 'not_found' });
  }

  const server = http.createServer((req, res) => {
    handle(req, res).catch((err) => {
      if (!res.headersSent) send(res, err.status || 500, { error: err.status ? err.message : 'server_error' });
      if (!err.status) console.error(err);
    });
  });
  return { server, store, ai, ponds, limiter };
}

module.exports = { createApp, defaultWhoIs, loadEnv };

if (require.main === module) {
  const app = createApp();
  app.server.listen(PORT, () => {
    console.log('Primordia server on http://localhost:' + PORT + '  models: ' + (app.ai.models().map((m) => m.label).join(', ') || 'none (answers come from the built-in table)'));
  });
}
