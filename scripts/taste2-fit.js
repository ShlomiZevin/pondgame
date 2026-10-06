// Fits the game's starting taste to what the AI said of a random sample of pond creatures (scripts/taste2-data.json):
// beauty as a linear function of what can be seen, and whole as a correction to the hand-written wholeness. Ridge regression, 5-fold check.
//   node scripts/taste2-fit.js [--write]
const fs = require('fs'), path = require('path');
const D = JSON.parse(fs.readFileSync(path.join(__dirname, 'taste2-data.json'), 'utf8')), names = D.names, rows = D.rows.filter((r) => r.x.length === names.length && r.x.every(Number.isFinite) && isFinite(r.y) && isFinite(r.w));
const n = names.length;
function solve(A, b) { const m = b.length; A = A.map((r) => r.slice()); b = b.slice(); for (let i = 0; i < m; i++) { let p = i; for (let k = i + 1; k < m; k++) if (Math.abs(A[k][i]) > Math.abs(A[p][i])) p = k; [A[i], A[p]] = [A[p], A[i]]; [b[i], b[p]] = [b[p], b[i]]; const d = A[i][i] || 1e-9; for (let k = i + 1; k < m; k++) { const f = A[k][i] / d; for (let j = i; j < m; j++) A[k][j] -= f * A[i][j]; b[k] -= f * b[i]; } } const x = new Array(m).fill(0); for (let i = m - 1; i >= 0; i--) { let s = b[i]; for (let j = i + 1; j < m; j++) s -= A[i][j] * x[j]; x[i] = s / (A[i][i] || 1e-9); } return x; }
function fit(R, lam, yf) { const m = n + 1, A = Array.from({ length: m }, () => new Array(m).fill(0)), v = new Array(m).fill(0); for (const r of R) { const x = [1].concat(r.x), y = yf(r); for (let i = 0; i < m; i++) { v[i] += x[i] * y; for (let j = 0; j < m; j++) A[i][j] += x[i] * x[j]; } } for (let i = 1; i < m; i++) A[i][i] += lam; const w = solve(A, v); return { b: w[0], w: w.slice(1) }; }
const pred = (T, x) => { let s = T.b; for (let i = 0; i < n; i++) s += T.w[i] * x[i]; return s; };
const corr = (a, b) => { const ma = a.reduce((s, v) => s + v, 0) / a.length, mb = b.reduce((s, v) => s + v, 0) / b.length; let sab = 0, sa = 0, sb = 0; for (let i = 0; i < a.length; i++) { sab += (a[i] - ma) * (b[i] - mb); sa += (a[i] - ma) ** 2; sb += (b[i] - mb) ** 2; } return sab / Math.sqrt(sa * sb || 1e-9); };
function pick(yf, label, base) {
  let best = null;
  for (const lam of [0.5, 1, 2, 4, 8, 16, 32]) { const P = [], Y = []; for (let k = 0; k < 5; k++) { const T = fit(rows.filter((_, i) => i % 5 !== k), lam, yf); rows.forEach((r, i) => { if (i % 5 === k) { P.push(base(r) + pred(T, r.x)); Y.push(yf(r) + base(r)); } }); } const c = corr(P, Y); console.log(label + ' lambda ' + String(lam).padEnd(3) + ' held-out correlation ' + c.toFixed(3)); if (!best || c > best.c) best = { lam, c }; }
  return { T: fit(rows, best.lam, yf), c: best.c };
}
const mean = (a) => a.reduce((s, v) => s + v, 0) / a.length;
console.log(rows.length + ' creatures · beauty marks mean ' + (mean(rows.map((r) => r.y)) * 10).toFixed(1) + ' · whole marks mean ' + (mean(rows.map((r) => r.w)) * 10).toFixed(1) + ' · the hand-written wholeness says mean ' + (mean(rows.map((r) => r.v0)) * 10).toFixed(1) + ' (correlation with the AI ' + corr(rows.map((r) => r.v0), rows.map((r) => r.w)).toFixed(2) + ')');
const B = pick((r) => r.y, 'beauty', () => 0), W = pick((r) => r.w - r.v0, 'whole residual', (r) => r.v0);
const order = (T) => names.map((nm, i) => [nm, T.w[i]]).sort((a, b) => b[1] - a[1]);
console.log('\nbeauty lifts: ' + order(B.T).slice(0, 8).map((q) => q[0] + ' +' + (q[1] * 10).toFixed(1)).join(', ') + '\nbeauty pulls down: ' + order(B.T).slice(-8).reverse().map((q) => q[0] + ' ' + (q[1] * 10).toFixed(1)).join(', '));
console.log('whole lifts: ' + order(W.T).slice(0, 6).map((q) => q[0] + ' +' + (q[1] * 10).toFixed(1)).join(', ') + '\nwhole pulls down: ' + order(W.T).slice(-6).reverse().map((q) => q[0] + ' ' + (q[1] * 10).toFixed(1)).join(', '));
if (process.argv.includes('--write')) {
  const file = path.join(__dirname, '..', '..', 'plaxzy-creator', 'local-games', 'primordia', 'src', '21c_taste.js');
  let s = fs.readFileSync(file, 'utf8');
  const a = s.indexOf('  F.TASTE0 = {'), b = s.indexOf('\n', a); if (a < 0) { console.log('TASTE0 not found'); process.exit(1); }
  const r4 = (v) => +v.toFixed(4);
  s = s.slice(0, a) + '  F.TASTE0 = { b: ' + r4(B.T.b) + ', w: [' + B.T.w.map(r4).join(', ') + '], n: ' + rows.length + ', wb: ' + r4(W.T.b) + ', ww: [' + W.T.w.map(r4).join(', ') + '] };      // fitted ' + new Date().toISOString().slice(0, 10) + ' to the AI\'s marks on ' + rows.length + ' random pond creatures (beauty r ' + B.c.toFixed(2) + ' held out; whole is a correction to F.whole, r ' + W.c.toFixed(2) + ')' + s.slice(b);
  fs.writeFileSync(file, s); console.log('written into the game');
}
