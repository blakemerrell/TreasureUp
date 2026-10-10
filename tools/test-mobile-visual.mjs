import http from 'http';
import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer';

const ROOT = '/Users/blakemerrell/TreasureUp';
const PORT = 8093;

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
  console.log(`Server listening on http://localhost:${PORT}/`);
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setViewport({
      width: 412,
      height: 860,
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true
    });

    await page.goto(`http://localhost:${PORT}/liberty/index.html`);
    await new Promise(r => setTimeout(r, 1200));

    // Start mission
    await page.evaluate(() => {
      window.LIB_UI.begin('wild');
    });
    await new Promise(r => setTimeout(r, 1500));

    // Plant the standard of liberty
    await page.evaluate(() => {
      const moroni = window.LIB_UI.W.units('p').find(u => u.def.deploys);
      if (moroni) {
        window.LIB_UI.W.deploy(moroni);
        window.LIB_UI.refreshPanel();
      }
    });
    await new Promise(r => setTimeout(r, 1000));

    // Choose to build Storehouse
    await page.evaluate(() => {
      window.LIB_UI.W.res.grain = 500;
      window.LIB_UI.W.res.timber = 500;
      window.LIB_UI.W.res.stone = 500;
      window.LIB_UI.remoteCommand('build', 'storehouse');
    });
    await new Promise(r => setTimeout(r, 600));

    // Simulate touching and dragging on mobile touch screen
    await page.evaluate(() => {
      const cv = document.getElementById('view');
      const downEv = new PointerEvent('pointerdown', {
        clientX: 200,
        clientY: 460,
        pointerId: 1,
        pointerType: 'touch',
        bubbles: true
      });
      cv.dispatchEvent(downEv);

      const moveEv = new PointerEvent('pointermove', {
        clientX: 205,
        clientY: 430,
        pointerId: 1,
        pointerType: 'touch',
        bubbles: true
      });
      cv.dispatchEvent(moveEv);
    });

    await new Promise(r => setTimeout(r, 600));

    const outPath = '/Users/blakemerrell/.gemini/antigravity/brain/712c72b4-2fe7-4275-a6c2-f8d78eb1924d/game_assets/mobile_placement_ghost_live.png';
    await page.screenshot({ path: outPath });
    console.log(`Captured screenshot to ${outPath}`);

    // Now drag over into the trees on the left
    await page.evaluate(() => {
      const cv = document.getElementById('view');
      const moveTreesEv = new PointerEvent('pointermove', {
        clientX: 80,
        clientY: 480,
        pointerId: 1,
        pointerType: 'touch',
        bubbles: true
      });
      cv.dispatchEvent(moveTreesEv);
    });
    await new Promise(r => setTimeout(r, 600));

    const redPath = '/Users/blakemerrell/.gemini/antigravity/brain/712c72b4-2fe7-4275-a6c2-f8d78eb1924d/game_assets/mobile_placement_obstructed_live.png';
    await page.screenshot({ path: redPath });
    console.log(`Captured obstructed screenshot to ${redPath}`);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    if (browser) await browser.close();
    server.close();
    process.exit(0);
  }
});
