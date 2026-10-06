'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { sanitizeSvg } = require('../lib/svg');
const { createAi, cleanThing, cleanIdea, extractJson, MAX_VARIANTS } = require('../lib/ai');
const { createStore } = require('../lib/store');
const { createOffline } = require('../lib/offline');
const { createApp } = require('../server');
const { makeSave, tmpDir, fakeModel } = require('./helpers');

const offline = createOffline();

test('svg: scripts, links and event handlers are removed; shapes stay', () => {
  const out = sanitizeSvg('<svg viewBox="0 0 64 64" onload="x()"><script>alert(1)</script><circle cx="32" cy="32" r="20" fill="#f00" onclick="y()"/><image href="http://e.com/a.png"/><g><rect x="1" y="1" width="5" height="5" fill="url(http://x)"/></g></svg>');
  assert.match(out, /<circle cx="32"/);
  assert.doesNotMatch(out.replace('http://www.w3.org/2000/svg', ''), /script|onload|onclick|image|http/);
  assert.match(out, /viewBox/);
  assert.equal(sanitizeSvg('hello'), '');
  assert.equal(sanitizeSvg('<svg>' + 'x'.repeat(7000) + '</svg>'), '');
});

test('json is found inside chatty answers; junk is not usable', () => {
  assert.deepEqual(extractJson('Sure! {"a":1} done'), { a: 1 });
  assert.deepEqual(extractJson('[1,2]'), [1, 2]);
  assert.equal(extractJson('no json here'), null);
  assert.equal(cleanThing({ name: 'x', props: {} }, 'x'), null);          // does nothing: not usable
  const t = cleanThing({ name: 'Big', props: { heat: 9, nutrition: -3, light: 'a' }, radius: 9999, hue: 400 }, 'big');
  assert.equal(t.props.heat, 1); assert.equal(t.props.nutrition, 0); assert.equal(t.radius, 150);
  const idea = cleanIdea({ name: 'x', parts: [{ k: 99, a: 0, s: 9 }], size: 50 });
  assert.equal(idea.parts[0].k, 8); assert.equal(idea.parts[0].s, 1.8); assert.equal(idea.size, 2);
  assert.equal(cleanIdea({ parts: [{ k: 4, a: 0, s: 1 }] }).name, 'New eye');                 // a forgotten name is filled in
  assert.equal(cleanIdea({ segs: [{ p: -1, a: 1, d: 1, s: 0.4, n: 2, m: 1 }] }).name, 'New limbs');
  assert.deepEqual(extractJson('[{"name":"a","size":1},{"name":"b","par'), [{ name: 'a', size: 1 }]);   // a cut-off list keeps what is whole
});

test('ai.thing: a word keeps a pool of variants and each answer wobbles', async () => {
  const dir = tmpDir(), store = createStore(dir), model = fakeModel();
  const ai = createAi({ store, callModel: model, offline });
  const seen = new Set();
  for (let i = 0; i < MAX_VARIANTS + 6; i++) {
    const r = await ai.thing('Jelly');
    assert.equal(r.thing.name, 'Glow Jelly');
    assert.doesNotMatch(r.thing.svg, /script/);
    seen.add(JSON.stringify(r.thing.props));
  }
  assert.ok(seen.size > 6, 'answers should differ');
  assert.ok(model.calls >= MAX_VARIANTS && model.calls < MAX_VARIANTS + 6, 'the model is only asked until the pool is full (a few extra now and then)');
  assert.ok(store.get('word', 'default|jelly').variants.length >= MAX_VARIANTS);
});

test('ai.thing: refused words, empty words, no model, rate limit', async () => {
  const store = createStore(tmpDir());
  const ai = createAi({ store, callModel: fakeModel(), offline });
  assert.equal((await ai.thing('nazi')).error, 'refused');
  assert.equal((await ai.thing('  ')).error, 'empty');
  // no model: the built-in table answers
  const plain = createAi({ store: createStore(tmpDir()), callModel: null, offline });
  const r = await plain.thing('volcano');
  assert.equal(r.thing.source, 'offline'); assert.ok(r.thing.props.heat > 0.5);
  // not allowed another model call: it must not call the model
  const model = fakeModel();
  const limited = createAi({ store: createStore(tmpDir()), callModel: model, offline });
  const r2 = await limited.thing('honey', { canGenerate: () => false });
  assert.equal(model.calls, 0); assert.equal(r2.thing.source, 'offline');
});

test('ai.thing: a model that fails or answers nonsense falls back, never throws', async () => {
  const store = createStore(tmpDir());
  const bad = createAi({ store, callModel: async () => { throw new Error('down'); }, offline });
  assert.equal((await bad.thing('honey')).thing.source, 'offline');
  const junk = createAi({ store: createStore(tmpDir()), callModel: async () => 'I cannot do that', offline });
  assert.equal((await junk.thing('honey')).thing.source, 'offline');
});

test('ai.ideas: cleaned, clamped, and offline when the model is not there', async () => {
  const ai = createAi({ store: createStore(tmpDir()), callModel: fakeModel(), offline });
  const r = await ai.ideas({ gen: 12, species: [{ name: 'Blobling', n: 40 }] });
  assert.equal(r.source, 'ai'); assert.ok(r.ideas.length >= 2);
  assert.ok(r.ideas.every((i) => !i.size || Math.abs(i.size) <= 2));
  const off = await createAi({ store: createStore(tmpDir()), callModel: null, offline }).ideas({ gen: 3 });
  assert.equal(off.source, 'offline'); assert.ok(off.ideas.length > 0);
});

// ── over HTTP ──
async function withApp(opts, fn) {
  const app = createApp(Object.assign({ dataDir: tmpDir(), offline }, opts));
  await new Promise((r) => app.server.listen(0, r));
  const base = 'http://127.0.0.1:' + app.server.address().port;
  const call = (method, path, body, headers) => fetch(base + path, { method, headers: Object.assign({ 'x-user': 'alice', 'content-type': 'application/json' }, headers), body: body === undefined ? undefined : JSON.stringify(body) });
  try { await fn({ call, app, base }); } finally { app.server.close(); }
}

test('http: who is asking is required; words, refusals, ideas', async () => {
  await withApp({ callModel: fakeModel(), rand: Math.random }, async ({ call }) => {
    assert.equal((await call('POST', '/api/ai/thing', { word: 'honey' }, { 'x-user': '' })).status, 401);
    const ok = await call('POST', '/api/ai/thing', { word: 'honey' });
    assert.equal(ok.status, 200);
    const j = await ok.json();
    assert.equal(j.thing.name, 'Glow Jelly'); assert.ok(j.thing.props.light > 0.5);
    assert.equal((await call('POST', '/api/ai/thing', { word: 'nazi' })).status, 422);
    assert.equal((await call('POST', '/api/ai/thing', { word: '' })).status, 400);
    const ideas = await (await call('POST', '/api/ai/ideas', { gen: 5, species: [] })).json();
    assert.ok(ideas.ideas.length > 0);
    assert.equal((await call('GET', '/nope')).status, 404);
    assert.equal((await call('GET', '/healthz')).status, 200);
  });
});

test('http: the model is only called as often as the limit allows', async () => {
  const model = fakeModel();
  await withApp({ callModel: model, perHour: 2 }, async ({ call }) => {
    for (const w of ['a1', 'b2', 'c3', 'd4', 'e5']) assert.equal((await call('POST', '/api/ai/thing', { word: w })).status, 200);
    assert.equal(model.calls, 2);
  });
});

test('http: a pond is stored, and lives while the player is away', async () => {
  const save = makeSave(3);
  assert.equal(save.v, 1);
  let clock = save.at;
  await withApp({ callModel: null, now: () => clock }, async ({ call }) => {
    assert.deepEqual(await (await call('GET', '/api/pond')).json(), { save: null, report: null });
    assert.equal((await call('PUT', '/api/pond', { save: { v: 2 } })).status, 400);
    assert.equal((await call('PUT', '/api/pond', { save })).status, 200);
    // an hour later
    clock = save.at + 3600 * 1000;
    const got = await (await call('GET', '/api/pond')).json();
    assert.ok(got.report.gens >= 20, 'about 112 generations should pass in an hour, got ' + got.report.gens);
    assert.ok(got.save.gen > save.gen + 20);
    assert.equal(got.save.at, clock);
    assert.ok(Array.isArray(got.report.discoveries));
    // an older save from a sleepy browser does not overwrite the newer pond
    const old = await call('PUT', '/api/pond', { save: Object.assign({}, save, { at: save.at + 1000 }) });
    assert.equal(old.status, 409);
    assert.equal((await call('DELETE', '/api/pond')).status, 200);
    assert.deepEqual(await (await call('GET', '/api/pond')).json(), { save: null, report: null });
  });
});

test('http: tick advances idle ponds, and only for the admin', async () => {
  const save = makeSave(2, 11);
  let clock = save.at;
  await withApp({ callModel: null, now: () => clock, adminKey: 'sekret' }, async ({ call, app }) => {
    await call('PUT', '/api/pond', { save });
    clock = save.at + 30 * 60 * 1000;
    assert.equal((await call('POST', '/api/tick', {})).status, 403);
    const r = await (await call('POST', '/api/tick', {}, { 'x-admin': 'sekret' })).json();
    assert.equal(r.advanced, 1);
    assert.ok(app.store.get('pond', 'alice').save.gen > save.gen);
  });
});

test('library: once enough is kept, most requests are answered without the model', async () => {
  const store = createStore(tmpDir());
  let n = 0;
  const call = async ({ system }) => { n++; return /new body part/.test(system) ? JSON.stringify({ name: 'Organ ' + n, note: 'x', fx: { sense: 0.8 }, digest: -1, hue: 10, svg: '' }) : /JSON array/.test(system) ? JSON.stringify([{ name: 'Idea ' + n, size: 1 }]) : JSON.stringify({ name: 'Ev ' + n, note: 'x', temp: -0.5, duration: 30 }); };
  const ai = createAi({ store, callModel: call, offline });
  for (let i = 0; i < 40; i++) await ai.organ({ have: [] });
  assert.ok(n < 25, 'organs: the model was asked ' + n + ' times for 40 organs');
  assert.ok(ai.library().organs.length >= 8);
  const before = n;
  for (let i = 0; i < 12; i++) await ai.event('an ice age');
  assert.ok(n - before <= 4, 'the same event text is made at most 4 times');
  const b2 = n;
  for (let i = 0; i < 40; i++) await ai.ideas({ gen: 3 });
  assert.ok(n - b2 < 25, 'idea sets are reused');
  assert.ok(ai.library().ideas >= 6);
});

test('marvels: the model invents one, and the server keeps it fair', async () => {
  const store = createStore(tmpDir());
  const wild = JSON.stringify({ name: 'Thunder Throat <b>', wonder: 'Its voice shakes the water and fills it with fire.', special: 'voice', fx: { glow: 0.9, spike: 5, speed: 9 }, glyph: 'nonsense', hue: 400, words: ['BOOM', 'rrraa!', 'x<y>z', 'a very long word indeed that goes on'] });
  const ai = createAi({ store, callModel: async () => wild, offline });
  const r = await ai.marvel({ have: [] });
  assert.equal(r.source, 'ai');
  const m = r.marvel;
  assert.ok(m.name.indexOf('<') < 0 && m.sp === 'voice' && m.glyph === 'star');
  const sum = Object.values(m.fx).reduce((s, v) => s + Math.abs(v), 0);
  assert.ok(sum <= 1.41 && m.fx.speed <= 0.6, 'effects are capped: ' + sum);
  assert.ok(m.words.every((w) => w.length <= 30 && w.indexOf('<') < 0) && m.words.length <= 8);
  assert.ok(m.hue >= 0 && m.hue < 360);
  const none = await createAi({ store: createStore(tmpDir()), callModel: null, offline }).marvel({ have: [] });
  assert.equal(none.marvel, null);
});

test('marvels: a pond with an invented marvel saves, and comes back with the marvel still on its creature', () => {
  const vm = require('vm'), fs = require('fs'), path = require('path');
  const mk = () => { const ctx = vm.createContext({ console, performance, Date, Math, JSON, Float32Array, Int16Array, Int32Array, Promise, setTimeout, clearTimeout }); ctx.window = ctx; ctx.addEventListener = () => {}; let cap = null; ctx.Plaxzy = { save: { set(d) { cap = JSON.parse(JSON.stringify(d)); }, load() {} } };
    for (const f of ['10_core.js', '20_genome.js', '21_form.js', '21b_body.js', '21c_taste.js', '30_world.js', '40_words.js', '41_look.js', '43_why.js', '44_pressure.js', '45_organs.js', '45_parts.js', '45_plans.js', '46_events.js', '46b_marvels.js', '47_story.js', '48_judge.js', '49_eras.js', '80_save.js']) { const p = path.join(__dirname, '..', 'sim', f); if (fs.existsSync(p)) vm.runInContext(fs.readFileSync(p, 'utf8'), ctx, { filename: f }); }
    vm.runInContext('G.hints = {}; G.R = {}; G.mode = "play";', ctx); return { G: ctx.G, cap: () => cap }; };
  const a = mk(); a.G.newWorld({ seed: 7 }); a.G.founderPond(); while (a.G.W.gen < 4) a.G.step(0.1);
  const id = a.G.addMarvelDef({ name: 'Moonlit Memory', wonder: 'It remembers every place it has been.', special: 'mind', fx: { sense: 0.6 }, glyph: 'moon', hue: 230 });
  assert.ok(id >= 100);
  const c = a.G.W.cre.filter((x) => !x.dead && x.g.f.bd)[0]; c.g.mv = id; c.ph = a.G.derive(c.g);
  a.G.saveNow(); const save = a.cap();
  assert.ok(save.marvelX && save.marvelX.length === 1);
  const b = mk(); assert.ok(b.G.validSave(save)); b.G.applySave(save);
  const back = b.G.W.cre.filter((x) => x.g.mv === id);
  assert.ok(back.length >= 1, 'the creature kept its marvel');
  assert.equal(b.G.marvelOf(id).name, 'Moonlit Memory');
  assert.equal(back[0].ph.mvsp, 'mind');
});
