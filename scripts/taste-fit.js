// Fits the game's measure of beauty to the grades in scripts/taste-data.json, and writes it into the game.
//   node scripts/taste-fit.js [--write]
// Ridge regression: grade ≈ b + w·looks. Prints how well it predicts grades it was not fitted on (5-fold), and what counts most.
const fs = require('fs'), path = require('path');
const D = JSON.parse(fs.readFileSync(path.join(__dirname, 'taste-data.json'), 'utf8')), names = D.names, rows = D.rows.filter((r) => r.x.length === names.length && r.x.every(Number.isFinite));
const n = names.length;
function solve(A, b) {                       // Gaussian elimination with pivoting
  const m = b.length; A = A.map((r) => r.slice()); b = b.slice();
  for (let i = 0; i < m; i++) { let p = i; for (let k = i + 1; k < m; k++) if (Math.abs(A[k][i]) > Math.abs(A[p][i])) p = k; [A[i], A[p]] = [A[p], A[i]]; [b[i], b[p]] = [b[p], b[i]]; const d = A[i][i] || 1e-9; for (let k = i + 1; k < m; k++) { const q = A[k][i] / d; if (!q) continue; for (let j = i; j < m; j++) A[k][j] -= q * A[i][j]; b[k] -= q * b[i]; } }
  const x = new Array(m).fill(0); for (let i = m - 1; i >= 0; i--) { let s = b[i]; for (let j = i + 1; j < m; j++) s -= A[i][j] * x[j]; x[i] = s / (A[i][i] || 1e-9); } return x;
}
function fit(R, lam) {
  const m = n + 1, A = Array.from({ length: m }, () => new Array(m).fill(0)), v = new Array(m).fill(0);
  for (const r of R) { const x = [1].concat(r.x); for (let i = 0; i < m; i++) { v[i] += x[i] * r.y; for (let j = 0; j < m; j++) A[i][j] += x[i] * x[j]; } }
  for (let i = 1; i < m; i++) A[i][i] += lam;
  const w = solve(A, v); return { b: w[0], w: w.slice(1) };
}
const pred = (T, x) => { let s = T.b; for (let i = 0; i < n; i++) s += T.w[i] * x[i]; return Math.max(0, Math.min(1, s)); };
const corr = (a, b) => { const ma = a.reduce((s, v) => s + v, 0) / a.length, mb = b.reduce((s, v) => s + v, 0) / b.length; let sab = 0, sa = 0, sb = 0; for (let i = 0; i < a.length; i++) { sab += (a[i] - ma) * (b[i] - mb); sa += (a[i] - ma) ** 2; sb += (b[i] - mb) ** 2; } return sab / Math.sqrt(sa * sb || 1); };
let best = null;
for (const lam of [0.3, 1, 2, 4, 8, 16]) {
  const P = [], Y = [];
  for (let k = 0; k < 5; k++) { const T = fit(rows.filter((_, i) => i % 5 !== k), lam); rows.forEach((r, i) => { if (i % 5 === k) { P.push(pred(T, r.x)); Y.push(r.y); } }); }
  const c = corr(P, Y), mae = P.reduce((s, p, i) => s + Math.abs(p - Y[i]), 0) / P.length;
  console.log('lambda ' + String(lam).padEnd(4) + ' held-out correlation ' + c.toFixed(3) + ' · mean error ' + (mae * 10).toFixed(2) + ' points out of 10');
  if (!best || c > best.c) best = { lam, c, mae };
}
const T = fit(rows, best.lam), ys = rows.map((r) => r.y);
console.log('\n' + rows.length + ' graded creatures · grades from ' + Math.min(...ys) * 10 + ' to ' + Math.max(...ys) * 10 + ', mean ' + (ys.reduce((s, v) => s + v, 0) / ys.length * 10).toFixed(1) + ' · chosen lambda ' + best.lam);
const order = names.map((nm, i) => [nm, T.w[i]]).sort((a, b) => b[1] - a[1]);
console.log('lifts a grade most:  ' + order.slice(0, 10).map((q) => q[0] + ' +' + (q[1] * 10).toFixed(1)).join(', '));
console.log('pulls it down most:  ' + order.slice(-10).reverse().map((q) => q[0] + ' ' + (q[1] * 10).toFixed(1)).join(', '));
console.log('a body with nothing to see on it: ' + (T.b * 10).toFixed(1));
if (process.argv.includes('--write')) {
  const file = path.join(__dirname, '..', '..', 'plaxzy-creator', 'local-games', 'primordia', 'src', '21c_taste.js');
  let s = fs.readFileSync(file, 'utf8');
  const a = s.indexOf('  F.TASTE0 = {'), b = s.indexOf('\n', a);
  if (a < 0) { console.log('TASTE0 not found'); process.exit(1); }
  s = s.slice(0, a) + '  F.TASTE0 = { b: ' + T.b.toFixed(4) + ', w: [' + T.w.map((v) => +v.toFixed(4)).join(', ') + '], n: ' + rows.length + ' };      // fitted ' + new Date().toISOString().slice(0, 10) + ' to ' + rows.length + ' graded pictures; held-out correlation ' + best.c.toFixed(2) + s.slice(b);
  fs.writeFileSync(file, s); console.log('written into the game: ' + file);
}
