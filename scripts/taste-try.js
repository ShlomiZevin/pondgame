// does a model that can bend (boosted small trees) predict the grades better than the straight-line one? 5-fold check.
const D = require('./taste-data.json'), names = D.names, rows = D.rows.filter((r) => r.x.length === names.length);
const n = names.length;
const corr = (a, b) => { const ma = a.reduce((s, v) => s + v, 0) / a.length, mb = b.reduce((s, v) => s + v, 0) / b.length; let sab = 0, sa = 0, sb = 0; for (let i = 0; i < a.length; i++) { sab += (a[i] - ma) * (b[i] - mb); sa += (a[i] - ma) ** 2; sb += (b[i] - mb) ** 2; } return sab / Math.sqrt(sa * sb || 1); };
function tree(R, res, depth, minLeaf) {
  const idx = R.map((_, i) => i);
  const build = (ids, d) => {
    const mean = ids.reduce((s, i) => s + res[i], 0) / ids.length;
    if (d === 0 || ids.length < minLeaf * 2) return { v: mean };
    let best = null;
    for (let f = 0; f < n; f++) {
      const vals = [...new Set(ids.map((i) => R[i].x[f]))].sort((a, b) => a - b); if (vals.length < 2) continue;
      const cand = vals.length > 12 ? Array.from({ length: 11 }, (_, k) => vals[Math.floor((k + 1) * vals.length / 12)]) : vals.slice(1);
      for (const t of cand) { let sl = 0, nl = 0, sr = 0, nr = 0; for (const i of ids) { if (R[i].x[f] < t) { sl += res[i]; nl++; } else { sr += res[i]; nr++; } } if (nl < minLeaf || nr < minLeaf) continue; const gain = sl * sl / nl + sr * sr / nr; if (!best || gain > best.gain) best = { gain, f, t }; }
    }
    if (!best) return { v: mean };
    return { f: best.f, t: best.t, l: build(ids.filter((i) => R[i].x[best.f] < best.t), d - 1), r: build(ids.filter((i) => R[i].x[best.f] >= best.t), d - 1) };
  };
  return build(idx, depth);
}
const evalT = (t, x) => { while (t.f !== undefined) t = x[t.f] < t.t ? t.l : t.r; return t.v; };
function boost(R, rounds, depth, lr, minLeaf) { const b = R.reduce((s, r) => s + r.y, 0) / R.length, res = R.map((r) => r.y - b), T = []; for (let k = 0; k < rounds; k++) { const t = tree(R, res, depth, minLeaf); T.push(t); for (let i = 0; i < R.length; i++) res[i] -= lr * evalT(t, R[i].x); } return { b, T, lr }; }
const predict = (M, x) => { let s = M.b; for (const t of M.T) s += M.lr * evalT(t, x); return Math.max(0, Math.min(1, s)); };
for (const [rounds, depth, lr, ml] of [[60, 1, 0.1, 8], [150, 1, 0.08, 8], [80, 2, 0.08, 8], [150, 2, 0.05, 10], [100, 3, 0.05, 10]]) {
  const P = [], Y = [];
  for (let k = 0; k < 5; k++) { const M = boost(rows.filter((_, i) => i % 5 !== k), rounds, depth, lr, ml); rows.forEach((r, i) => { if (i % 5 === k) { P.push(predict(M, r.x)); Y.push(r.y); } }); }
  console.log('trees ' + rounds + ' depth ' + depth + ' rate ' + lr + ': held-out correlation ' + corr(P, Y).toFixed(3) + ' · mean error ' + (P.reduce((s, p, i) => s + Math.abs(p - Y[i]), 0) / P.length * 10).toFixed(2));
}
