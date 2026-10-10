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
      protocolTimeout: 120000,
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
    await new Promise(r => setTimeout(r, 1200));

    // Wait until timber cart reaches the resource and begins work phase
    console.log('Waiting for timber cart to park and begin harvesting...');
    await page.waitForFunction(() => {
      const W = window.LIB_UI.W;
      if (!W) return false;
      const c = W.units('p').find(u => u.type === 'cart' && u.order && u.order.res === 'timber' && u.phase === 'work');
      return !!c;
    }, { timeout: 10000 });

    // Focus on the harvesting cart and worker
    console.log('Focusing camera on harvesting cart...');
    const targetPos = await page.evaluate(() => {
      const W = window.LIB_UI.W;
      const c = W.units('p').find(u => u.type === 'cart' && u.order && u.order.res === 'timber' && u.phase === 'work') ||
                W.units('p').find(u => u.type === 'cart' && u.phase === 'work');
      if (c) {
        window.LIB_UI.lookAt(c.x, c.y);
        return window.LIB_UI.screenOf(c.x, c.y);
      }
      return { x: 450, y: 325 };
    });
    console.log('Target cart screen position:', targetPos);
    await new Promise(r => setTimeout(r, 400));

    // Clean frames dir
    const oldFrames = fs.readdirSync(FRAMES_DIR);
    for (const f of oldFrames) fs.unlinkSync(path.join(FRAMES_DIR, f));

    // Record 84 frames at real-time 30 FPS (~2.8s exact full logistics loop)
    console.log('Recording 84 real-time frames at 30 FPS (~2.8s full logistics loop)...');
    const framesData = await page.evaluate(async (targetPos) => {
      const cv = document.getElementById('view');
      const frames = [];
      const z = window.devicePixelRatio || 2;
      const cropW = 420, cropH = 320;
      const sx = Math.max(0, Math.round(targetPos.x * z - 70));
      const sy = Math.max(0, Math.round(targetPos.y * z - 110));
      const off = document.createElement('canvas');
      off.width = cropW; off.height = cropH;
      const octx = off.getContext('2d');

      return new Promise(resolve => {
        let count = 0;
        const maxFrames = 84; // 2.8s at 30 FPS
        let lastT = 0;
        function cap(now) {
          try {
            if (!lastT || now - lastT >= 32) {
              lastT = now;
              octx.drawImage(cv, sx, sy, cropW, cropH, 0, 0, cropW, cropH);
              frames.push(off.toDataURL('image/jpeg', 0.85));
              count++;
            }
            if (count >= maxFrames) resolve(frames);
            else requestAnimationFrame(cap);
          } catch (e) {
            resolve(frames);
          }
        }
        requestAnimationFrame(cap);
      });
    }, targetPos);

    console.log(`Captured ${framesData.length} frames! Writing to disk...`);
    for (let i = 0; i < framesData.length; i++) {
      const base64Data = framesData[i].replace(/^data:image\/jpeg;base64,/, '');
      fs.writeFileSync(path.join(FRAMES_DIR, `frame_${String(i).padStart(3, '0')}.jpg`), base64Data, 'base64');
    }
    fs.copyFileSync(path.join(FRAMES_DIR, 'frame_000.jpg'), path.join(ARTIFACT_DIR, 'living_world_harvesting_live.png'));
    console.log('Saved living_world_harvesting_live.png');

    // Compile into animated WebP & GIF using python/pillow at true 30fps (33ms)
    const pythonScript = `
import glob
from PIL import Image

frames = sorted(glob.glob('${FRAMES_DIR}/frame_*.jpg'))
if frames:
    imgs = [Image.open(f) for f in frames]
    imgs[0].save('${ARTIFACT_DIR}/living_world_harvesting_live.webp', save_all=True, append_images=imgs[1:], duration=33, loop=0)
    imgs[0].save('${ARTIFACT_DIR}/living_world_harvesting_live.gif', save_all=True, append_images=imgs[1:], duration=33, loop=0)
    print("Successfully generated focused living_world_harvesting_live.webp and gif at true 30fps!")
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
