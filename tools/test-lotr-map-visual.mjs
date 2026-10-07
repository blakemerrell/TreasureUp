import http from 'http';
import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer';

const ROOT = '/Users/blakemerrell/TreasureUp';
const PORT = 8098;
const ARTIFACT_DIR = '/Users/blakemerrell/.gemini/antigravity/brain/712c72b4-2fe7-4275-a6c2-f8d78eb1924d/game_assets';

if (!fs.existsSync(ARTIFACT_DIR)) fs.mkdirSync(ARTIFACT_DIR, { recursive: true });

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
      width: 412,
      height: 860,
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true
    });

    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

    console.log('Navigating to Liberty...');
    await page.goto(`http://localhost:${PORT}/liberty/index.html`);
    await new Promise(r => setTimeout(r, 1500));

    console.log('Opening story missions screen...');
    const clicked = await page.evaluate(() => {
      const tile = document.querySelector('[data-mode="story"]');
      console.log('Found tile?', !!tile);
      if (tile) { tile.click(); return true; }
      return false;
    });
    console.log('Clicked story tile?', clicked);
    await new Promise(r => setTimeout(r, 1500));

    console.log('Capturing campaign map on story screen...');
    const mapEl = await page.$('.campMapWrap');
    console.log('Found .campMapWrap?', !!mapEl);
    if (mapEl) {
      await mapEl.screenshot({ path: path.join(ARTIFACT_DIR, 'lotr_parchment_map_crop_live.png') });
    }
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'story_screen_lotr_map_live.png') });
    console.log('Screenshots saved successfully!');

  } catch (err) {
    console.error('Error running visual test:', err);
  } finally {
    if (browser) await browser.close();
    server.close();
    process.exit(0);
  }
});
