import http from 'http';
import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer';
import { execSync } from 'child_process';

const ROOT = '/Users/blakemerrell/TreasureUp';
const PORT = 8092;
const ARTIFACT_DIR = '/Users/blakemerrell/.gemini/antigravity/brain/712c72b4-2fe7-4275-a6c2-f8d78eb1924d/game_assets';
const FRAMES_DIR = '/tmp/ra2_motion_frames';

if (!fs.existsSync(ARTIFACT_DIR)) fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
if (!fs.existsSync(FRAMES_DIR)) fs.mkdirSync(FRAMES_DIR, { recursive: true });

const MIME = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.json': 'application/json',
};

const server = http.createServer((req, res) => {
  let file = path.join(ROOT, req.url.replace(/\?.*$/, ''));
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  if (!fs.existsSync(file)) {
    res.writeHead(404);
    return res.end('Not found');
  }
  const ext = path.extname(file);
  res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});

server.listen(PORT, async () => {
  console.log(`Test server running at http://localhost:${PORT}/`);
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setViewport({
      width: 800,
      height: 600,
      deviceScaleFactor: 2
    });

    console.log('Navigating to Liberty...');
    await page.goto(`http://localhost:${PORT}/liberty/index.html`);
    await new Promise(r => setTimeout(r, 1200));

    // Start Mission 1 (m3 · At the River Sidon)
    console.log('Starting Mission 1 to test RA2 marching movement...');
    await page.evaluate(() => {
      window.LIB_UI.begin('m3');
    });
    await new Promise(r => setTimeout(r, 1500));

    // Center camera on Moroni and the spearmen formation
    await page.evaluate(() => {
      const W = window.LIB_UI.W;
      const moroni = W.units('p').find(u => u.type === 'moroni' || u.def.hero);
      if (moroni) {
        window.LIB_UI.lookAt(moroni.x, moroni.y);
      }
    });
    await new Promise(r => setTimeout(r, 600));

    // Select all soldiers and order march southwest across the field
    console.log('Selecting soldiers and ordering march across battlefield...');
    await page.evaluate(() => {
      const W = window.LIB_UI.W;
      const soldiers = W.units('p').filter(u => u.def.soldier || u.def.hero);
      window.LIB_UI.setSel(soldiers.map(u => u.id));
      
      const moroni = soldiers.find(u => u.type === 'moroni') || soldiers[0];
      if (moroni) {
        // Order march towards (moroni.x - 140, moroni.y + 120)
        soldiers.forEach((s, idx) => {
          const tx = Math.floor((moroni.x - 160 + (idx % 4) * 24) / 32);
          const ty = Math.floor((moroni.y + 100 + Math.floor(idx / 4) * 24) / 32);
          W.order(s, { type: 'move', tx, ty });
        });
      }
    });

    // Capture screenshot right after selection to see Command Pop
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'ra2_command_pop_live.png') });
    console.log('Saved ra2_command_pop_live.png');

    // Record 30 frames of smooth marching motion
    console.log('Recording marching motion frames...');
    for (let f = 0; f < 30; f++) {
      const framePath = path.join(FRAMES_DIR, `frame_${String(f).padStart(3, '0')}.png`);
      await page.screenshot({ path: framePath });
      await new Promise(r => setTimeout(r, 45));
    }

    console.log('Captured 30 motion frames!');
    // Also save a live screenshot of marching units
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'ra2_marching_units_live.png') });
    console.log('Saved ra2_marching_units_live.png');

    // Compile into animated WebP & GIF using python/pillow
    const pythonScript = `
import glob
from PIL import Image
import os

frames = sorted(glob.glob('${FRAMES_DIR}/frame_*.png'))
if frames:
    imgs = [Image.open(f).resize((500, 375), Image.Resampling.LANCZOS) for f in frames]
    imgs[0].save('${ARTIFACT_DIR}/ra2_movement_live.webp', save_all=True, append_images=imgs[1:], duration=60, loop=0)
    imgs[0].save('${ARTIFACT_DIR}/ra2_movement_live.gif', save_all=True, append_images=imgs[1:], duration=60, loop=0)
    print("Successfully generated ra2_movement_live.webp and gif!")
`;
    fs.writeFileSync('/tmp/make_ra2_gif.py', pythonScript);
    execSync('python3 /tmp/make_ra2_gif.py', { stdio: 'inherit' });

  } catch (err) {
    console.error('Test visual failed:', err);
  } finally {
    if (browser) await browser.close();
    server.close();
    console.log('Test completed.');
  }
});
