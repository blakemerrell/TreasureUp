import http from 'http';
import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer';
import { execSync } from 'child_process';

const ROOT = '/Users/blakemerrell/TreasureUp';
const PORT = 8091;
const ARTIFACT_DIR = '/Users/blakemerrell/.gemini/antigravity/brain/712c72b4-2fe7-4275-a6c2-f8d78eb1924d/game_assets';
const FRAMES_DIR = '/tmp/living_world_frames';

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
      width: 900,
      height: 650,
      deviceScaleFactor: 2
    });

    console.log('Navigating to Liberty...');
    await page.goto(`http://localhost:${PORT}/liberty/index.html`);
    await new Promise(r => setTimeout(r, 1200));

    // Start Mission 1 (m3)
    console.log('Starting Mission 1...');
    await page.evaluate(() => {
      window.LIB_UI.begin('m3');
    });
    await new Promise(r => setTimeout(r, 1500));

    // Focus on the workers and carts gathering timber and grain
    console.log('Focusing on workers and carts at forest and grain fields...');
    await page.evaluate(() => {
      const W = window.LIB_UI.W;
      const worker = W.units('p').find(u => u.type === 'worker');
      const cart = W.units('p').find(u => u.type === 'cart');
      if (worker) {
        window.LIB_UI.lookAt(worker.x, worker.y);
      }
    });
    await new Promise(r => setTimeout(r, 800));

    // Record 32 frames of harvesting with flying wood chips and chaff
    console.log('Recording harvesting frames...');
    for (let f = 0; f < 32; f++) {
      const framePath = path.join(FRAMES_DIR, `frame_${String(f).padStart(3, '0')}.png`);
      await page.screenshot({ path: framePath });
      await new Promise(r => setTimeout(r, 50));
    }

    console.log('Captured 32 harvesting frames!');
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'living_world_harvesting_live.png') });
    console.log('Saved living_world_harvesting_live.png');

    // Compile into animated WebP & GIF using python/pillow
    const pythonScript = `
import glob
from PIL import Image

frames = sorted(glob.glob('${FRAMES_DIR}/frame_*.png'))
if frames:
    imgs = [Image.open(f).resize((500, 360), Image.Resampling.LANCZOS) for f in frames]
    imgs[0].save('${ARTIFACT_DIR}/living_world_harvesting_live.webp', save_all=True, append_images=imgs[1:], duration=60, loop=0)
    imgs[0].save('${ARTIFACT_DIR}/living_world_harvesting_live.gif', save_all=True, append_images=imgs[1:], duration=60, loop=0)
    print("Successfully generated living_world_harvesting_live.webp and gif!")
`;
    fs.writeFileSync('/tmp/make_living_world_gif.py', pythonScript);
    execSync('python3 /tmp/make_living_world_gif.py', { stdio: 'inherit' });

  } catch (err) {
    console.error('Test visual failed:', err);
  } finally {
    if (browser) await browser.close();
    server.close();
    console.log('Test completed.');
  }
});
