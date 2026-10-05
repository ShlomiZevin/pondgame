// A tiny JSON-file store: one file per key, written atomically. Enough for a first version;
// swap these four functions for Firestore (or anything) later without touching the rest.
'use strict';
const fs = require('fs');
const path = require('path');

function safe(key) { return String(key).replace(/[^a-zA-Z0-9_.@-]/g, '_').slice(0, 120); }

function createStore(dir) {
  fs.mkdirSync(dir, { recursive: true });
  const file = (ns, key) => path.join(dir, ns + '__' + safe(key) + '.json');
  return {
    dir,
    get(ns, key) {
      try { return JSON.parse(fs.readFileSync(file(ns, key), 'utf8')); } catch { return null; }
    },
    set(ns, key, value) {
      const f = file(ns, key), tmp = f + '.' + process.pid + '.tmp';
      fs.writeFileSync(tmp, JSON.stringify(value));
      fs.renameSync(tmp, f);
    },
    del(ns, key) { try { fs.unlinkSync(file(ns, key)); } catch { /* not there */ } },
    keys(ns) {
      const pre = ns + '__';
      return fs.readdirSync(dir).filter((f) => f.startsWith(pre) && f.endsWith('.json')).map((f) => f.slice(pre.length, -5));
    },
  };
}
module.exports = { createStore };
