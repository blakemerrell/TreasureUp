// Step 3: simplifies the land and sea polygons together, so each border
// shared by two lands is simplified once and stays identical on both sides.
//   node tools/trace-board/simplify.js <work folder> [weight, 16] [picture width, 1920] [height, 1190]
const fs = require('fs');
const { topology } = require('topojson-server');
const { presimplify, simplify } = require('topojson-simplify');
const { feature } = require('topojson-client');
const WORK = process.argv[2], path = require('path');
const fc = JSON.parse(fs.readFileSync(path.join(WORK, 'regions.geojson'), 'utf8'));
const minWeight = Number(process.argv[3] || 16);
let topo = topology({ regions: fc });
topo = simplify(presimplify(topo), minWeight);
const out = feature(topo, topo.objects.regions);
const SX = 1000 / Number(process.argv[4] || 1920), SY = 620 / Number(process.argv[5] || 1190);
const r1 = v => Math.round(v * 10) / 10;
const lands = {}, seas = {};
for (const f of out.features) {
  const ring = f.geometry.coordinates[0].map(([x, y]) => [r1(x * SX), r1(y * SY)]);
  // drop repeated points that rounding created
  const clean = ring.filter((p, i) => i === 0 || p[0] !== ring[i - 1][0] || p[1] !== ring[i - 1][1]);
  if (f.properties.id) lands[f.properties.id] = clean; else seas[f.properties.sea] = clean;
}
fs.writeFileSync(path.join(WORK, 'rings.json'), JSON.stringify({ lands, seas }));
const n = Object.values(lands).map(r => r.length);
console.log('minWeight', minWeight, '| points per land:', Object.entries(lands).map(([k, r]) => k + ':' + r.length).join(' '), '| total', n.reduce((a, b) => a + b, 0), '| bytes', JSON.stringify(lands).length);
