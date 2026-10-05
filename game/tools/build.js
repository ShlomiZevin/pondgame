// assembles src/* into one self-contained game.html:  node tools/build.js
const fs = require('fs'), path = require('path');
const dir = path.join(__dirname, '..', 'src');
let out = fs.readFileSync(path.join(dir, '00_head.html'), 'utf8');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.js')).sort();
for (const f of files) {
  const id = f.replace(/^\d+_/, '').replace(/\.js$/, '');
  out += `<script data-part="${id}">\n${fs.readFileSync(path.join(dir, f), 'utf8')}\n</script>\n`;
}
out += '</body>\n</html>\n';
fs.writeFileSync(path.join(__dirname, '..', 'game.html'), out);
console.log('game.html', out.length, 'bytes,', files.length, 'parts');
