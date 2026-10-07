// A player's pond: stored as the game's own save (JSON, under 100 kB), and advanced to "now" by the real
// simulation when it is asked for. So the pond really lives while the player is away, on any device.
'use strict';
const { Worker } = require('worker_threads');
const path = require('path');

const MAX_SAVE_BYTES = 100000;
const DEFAULT_MAX_GENS = Number(process.env.PRIMORDIA_MAX_GENS) || 150;   // one generation is 32 s of pond time
const STALE_MS = 14 * 24 * 3600 * 1000;                                   // ponds untouched for two weeks stop advancing

function runWorker(job, timeoutMs) {
  return new Promise((resolve, reject) => {
    const w = new Worker(path.join(__dirname, 'worker.js'), { workerData: job });
    const timer = setTimeout(() => { w.terminate(); reject(new Error('timeout')); }, timeoutMs || 180000);
    w.once('message', (m) => { clearTimeout(timer); resolve(m); w.terminate(); });
    w.once('error', (e) => { clearTimeout(timer); reject(e); });
  });
}

function createPonds({ store, now, away }) {
  now = now || Date.now;
  // While a player is away the pond STOPS: it comes back exactly as it was left. (It cannot honestly be lived without them: most of
  // what happens in it is imagined by the AI while they watch.) away: true, or PRIMORDIA_AWAY=1, turns the old catching-up back on.
  const lives = away !== undefined ? !!away : process.env.PRIMORDIA_AWAY === '1';
  const locks = new Map();               // one advance at a time per player
  const once = (user, fn) => {
    const prev = locks.get(user) || Promise.resolve();
    const next = prev.catch(() => {}).then(fn);
    locks.set(user, next);
    next.finally(() => { if (locks.get(user) === next) locks.delete(user); }).catch(() => {});
    return next;
  };

  async function advanceStored(user, maxGens) {
    const rec = store.get('pond', user);
    if (!rec || !rec.save) return null;
    const t = now();
    const seconds = Math.max(0, (t - (rec.save.at || t)) / 1000);
    if (!lives || seconds < 20 || rec.save.v !== 1) return { save: rec.save, report: null, at: rec.save.at };
    const res = await runWorker({ save: rec.save, seconds, maxGens: maxGens || DEFAULT_MAX_GENS });
    if (res.error) return { save: rec.save, report: null, at: rec.save.at, error: res.error };
    // the pond is stamped "now": a very long absence is capped (the report says how much was really simulated)
    res.save.at = t;
    store.set('pond', user, { save: res.save, at: res.save.at, touched: t });
    return { save: res.save, report: res.report, at: res.save.at };
  }

  return {
    /** The pond as it is now, with a report of what happened while the player was away. */
    get(user) { return once(user, () => advanceStored(user)); },
    /** The player's game saved its pond. The newer one wins. */
    put(user, save) {
      return once(user, async () => {
        if (!save || typeof save !== 'object' || save.v !== 1 || !Array.isArray(save.cre)) return { error: 'bad_save', status: 400 };
        if (JSON.stringify(save).length > MAX_SAVE_BYTES) return { error: 'too_big', status: 413 };
        const rec = store.get('pond', user);
        const at = Number(save.at) > 0 ? Number(save.at) : now();
        if (rec && rec.save && rec.save.at > at + 1000) return { error: 'newer_on_server', status: 409, save: rec.save, at: rec.save.at };
        save.at = at;
        store.set('pond', user, { save, at, touched: now() });
        return { ok: true, at };
      });
    },
    del(user) { store.del('pond', user); },
    /** For a scheduler: advance every pond that has been left alone for a while. */
    async tick({ minIdleMs = 10 * 60 * 1000, maxGens = 60, limit = 50 } = {}) {
      const t = now();
      const out = { advanced: 0, skipped: 0, failed: 0 };
      if (!lives) return out;
      for (const user of store.keys('pond')) {
        if (out.advanced >= limit) break;
        const rec = store.get('pond', user);
        const idle = t - (rec && rec.at || 0);
        if (!rec || idle < minIdleMs || idle > STALE_MS) { out.skipped++; continue; }
        try { const r = await once(user, () => advanceStored(user, maxGens)); if (r && !r.error) out.advanced++; else out.failed++; } catch { out.failed++; }
      }
      return out;
    },
  };
}
module.exports = { createPonds, MAX_SAVE_BYTES };
