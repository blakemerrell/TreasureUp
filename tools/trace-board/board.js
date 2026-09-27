// Step 5: writes the traced board into content/boards.js. The borders (links)
// come from the outlines: two lands sharing 8 or more units of border are
// neighbours, plus the sea crossings listed here. Badges and sea names sit at
// the spots in labels.json (badges.py suggests some). Everything else in the
// board (kingdoms, story, how to play) is kept as it is.
//   node tools/trace-board/board.js <work folder>
const fs = require('fs'), path = require('path');
const WORK = process.argv[2], HERE = __dirname, FILE = path.join(HERE, '../../content/boards.js');
const CROSSINGS = [['arabia', 'egypt']];                     // across the Red Sea
const { lands, seas } = JSON.parse(fs.readFileSync(path.join(WORK, 'rings.json'), 'utf8'));
const labels = JSON.parse(fs.readFileSync(path.join(HERE, 'labels.json'), 'utf8'));
const segPoint = (p, a, c) => { const dx = c[0] - a[0], dy = c[1] - a[1], L = dx * dx + dy * dy; const t = L ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L)) : 0; return [a[0] + t * dx, a[1] + t * dy]; };
const near = (p, R) => { let m = Infinity; for (let i = 0; i < R.length; i++) { const q = segPoint(p, R[i], R[(i + 1) % R.length]); m = Math.min(m, Math.hypot(p[0] - q[0], p[1] - q[1])); } return m; };
const shared = (A, B) => { let s = 0; for (let i = 0; i < A.length; i++) { const a = A[i], c = A[(i + 1) % A.length], len = Math.hypot(c[0] - a[0], c[1] - a[1]), n = Math.max(1, Math.ceil(len / 2)); for (let k = 0; k < n; k++) { const t = (k + .5) / n; if (near([a[0] + (c[0] - a[0]) * t, a[1] + (c[1] - a[1]) * t], B) < 1.5) s += len / n; } } return s; };
const ids = Object.keys(lands), links = CROSSINGS.map(l => l.slice().sort());
for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++)
  if (Math.min(shared(lands[ids[i]], lands[ids[j]]), shared(lands[ids[j]], lands[ids[i]])) >= 8) links.push([ids[i], ids[j]].sort());
links.sort((x, y) => (x[0] + x[1]).localeCompare(y[0] + y[1]));
const src = fs.readFileSync(FILE, 'utf8'), at = src.indexOf('window.TU_BOARDS = ');
const boards = JSON.parse(src.slice(at + 'window.TU_BOARDS = '.length).replace(/;\s*$/, '')), b = boards[0];
const key = l => l.join('|'), was = new Set(b.links.map(l => key(l.slice().sort()))), now = new Set(links.map(key));
b.lands = b.lands.map(l => ({ id: l.id, name: l.name, ring: lands[l.id], label: labels.lands[l.id] }));
b.links = links;
b.seas = Object.entries(seas).map(([name, ring]) => ({ name, ring, label: labels.seas[name] }));
fs.writeFileSync(FILE, src.slice(0, at) + 'window.TU_BOARDS = ' + JSON.stringify(boards) + ';\n');
console.log(`${links.length} borders; new: ${[...now].filter(k => !was.has(k)).join(', ') || 'none'}; gone: ${[...was].filter(k => !now.has(k)).join(', ') || 'none'}`);
