import fs from 'fs';
import os from 'os';
import path from 'path';

let content = fs.readFileSync('liberty/mockup.html', 'utf8');

content = content.replace(
  `    } else {
      const pt = toIso(32 * TILE, 22 * TILE);
      cam.x = pt.ix - (vw / cam.z) / 2;
      cam.y = pt.iy - (vh / cam.z) / 2;
    }`,
  `    } else {
      cam.z = 0.68;
      const pt = toIso(24 * TILE, 16 * TILE);
      cam.x = pt.ix - (vw / cam.z) / 2;
      cam.y = pt.iy - (vh / cam.z) / 2;
    }`
);

fs.writeFileSync('liberty/mockup.html', content);
const ARTIFACT_DIR = process.env.ARTIFACT_DIR || path.join(os.tmpdir(), 'treasureup-artifacts');
fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
fs.writeFileSync(path.join(ARTIFACT_DIR, 'terrain_mockup.html'), content);
console.log('Updated camera in mockup.html');
