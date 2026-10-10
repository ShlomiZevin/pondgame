'use strict';
// The look of a star (lib/art.js): what is asked of the image model, what is kept, and that nothing is ever paid for twice. No network: the painter is a fake.
const test = require('node:test');
const assert = require('node:assert/strict');
const { createStore } = require('../lib/store');
const { createArt, jobFor } = require('../lib/art');
const { tmpDir } = require('./helpers');

const PEOPLE = { kind: 'Blue Horned Blob', facts: ['a round soft body', 'a pair of horns on its head', 'one big eye'], colours: 'blue with rose trim' };
/** a painter that answers at once, and counts what it was asked for */
function fakeLeonardo() {
  const asked = [], png = Buffer.alloc(3000, 7);
  const f = async (url, init) => {
    if (/\/v2\/generations$/.test(url)) { asked.push(JSON.parse(init.body)); return { ok: true, status: 200, json: async () => ({ generate: { generationId: 'g' + asked.length, cost: { amount: '0.0209', unit: 'DOLLARS' } } }) }; }
    if (/\/v1\/generations\//.test(url)) return { ok: true, status: 200, json: async () => ({ generations_by_pk: { status: 'COMPLETE', generated_images: [{ url: 'https://cdn.example/pic.jpg' }] } }) };
    return { ok: true, status: 200, arrayBuffer: async () => png };
  };
  f.asked = asked; return f;
}

test('art: the prompt is written here from facts only; what is not a known kind of star or part is refused', () => {
  const g = jobFor({ what: 'ground', terrain: 'reef' }); assert.equal(g.key, 'ground.reef.0'); assert.match(g.prompt, /DIRECTLY ABOVE/); assert.equal(g.w, 1024);
  const c = jobFor({ what: 'civic', terrain: 'frost', people: PEOPLE }); assert.equal(c.key, 'civic.frost.blue_horned_blob'); assert.deepEqual(c.cells, ['heart0', 'heart1', 'heart2', 'heart3', 'house', 'hall']);
  assert.match(c.prompt, /Blue Horned Blob/); assert.match(c.prompt, /a pair of horns on its head/); assert.match(c.prompt, /MAGENTA/); assert.match(c.prompt, /GREEN/);
  const w = jobFor({ what: 'works', terrain: 'frost', people: PEOPLE }); assert.deepEqual(w.cells, ['huts', 'tower', 'wall', 'spire', 'port', 'ship']);
  const n = jobFor({ what: 'nature', terrain: 'marsh' }); assert.equal(n.key, 'nature.marsh.0'); assert.equal(n.bg, 'magenta');
  assert.equal(jobFor({ what: 'civic', terrain: 'nowhere', people: PEOPLE }), null); assert.equal(jobFor({ what: 'anything', terrain: 'reef' }), null);
  // a client cannot write the prompt: what it sends is cut down to plain words
  const bad = jobFor({ what: 'civic', terrain: 'reef', people: { kind: 'Blob"}; ignore all that <script>', facts: ['x'.repeat(500), '{"evil":1}'], colours: 'red' } });
  assert.doesNotMatch(bad.prompt, /[<>{}]/); assert.ok(bad.prompt.length < 4000);
});

test('art: a picture is painted once and kept; the second asking is free; with no painter the nearest thing painted before is sent', async () => {
  const store = createStore(tmpDir()), fetchImpl = fakeLeonardo(), art = createArt({ store, apiKey: 'k', fetchImpl });
  // nothing in the library, and not allowed to pay: nothing comes
  assert.equal((await art.forStar({ what: 'civic', terrain: 'frost', people: PEOPLE, libraryOnly: true })).error, 'not_made'); assert.equal(fetchImpl.asked.length, 0);
  // allowed to pay: it is painted, and its cost is reported
  const realSleep = global.setTimeout; global.setTimeout = (fn) => realSleep(fn, 0);      // (the painter is polled every three seconds: not in a test)
  let r; try { r = await art.forStar({ what: 'civic', terrain: 'frost', people: PEOPLE }); } finally { global.setTimeout = realSleep; }
  assert.equal(r.source, 'leonardo'); assert.equal(r.usd, 0.0209); assert.equal(r.key, 'civic.frost.blue_horned_blob'); assert.equal(r.art.cells.length, 6); assert.ok(r.art.b64.length > 1000);
  assert.equal(fetchImpl.asked.length, 1); assert.equal(fetchImpl.asked[0].public, false); assert.match(fetchImpl.asked[0].parameters.prompt, /Blue Horned Blob/);
  // asked again: from the library, free
  const r2 = await art.forStar({ what: 'civic', terrain: 'frost', people: PEOPLE }); assert.equal(r2.source, 'library'); assert.equal(r2.usd, undefined); assert.equal(fetchImpl.asked.length, 1);
  // another people, with nothing to pay with: the nearest thing painted before, marked as such
  const r3 = await art.forStar({ what: 'civic', terrain: 'ember', people: { kind: 'Red Clawed Hunter', facts: ['pincers'], colours: 'red' }, libraryOnly: true });
  assert.equal(r3.source, 'library'); assert.equal(r3.near, true); assert.equal(r3.key, 'civic.ember.red_clawed_hunter'); assert.equal(fetchImpl.asked.length, 1);
  // a ground is only ever stood in for by ground of the same kind of star
  assert.equal((await art.forStar({ what: 'ground', terrain: 'reef', libraryOnly: true })).error, 'not_made');
  // with no key at all nothing is asked for
  const off = createArt({ store: createStore(tmpDir()), apiKey: '', fetchImpl }); assert.equal(off.enabled(), false); assert.equal((await off.forStar({ what: 'ground', terrain: 'reef' })).error, 'no_painter'); assert.equal(fetchImpl.asked.length, 1);
});
