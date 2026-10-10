import fs from 'fs';

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
fs.writeFileSync('/Users/blakemerrell/.gemini/antigravity/brain/712c72b4-2fe7-4275-a6c2-f8d78eb1924d/terrain_mockup.html', content);
console.log('Updated camera in mockup.html');
