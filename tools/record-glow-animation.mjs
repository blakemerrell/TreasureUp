import http from 'http';
import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer';

const ROOT = '/Users/blakemerrell/TreasureUp';
const PORT = 8099;
const FRAME_DIR = '/tmp/map_frames';

if (!fs.existsSync(FRAME_DIR)) {
  fs.mkdirSync(FRAME_DIR, { recursive: true });
} else {
  fs.readdirSync(FRAME_DIR).forEach(f => fs.unlinkSync(path.join(FRAME_DIR, f)));
}

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
  console.log(`Server listening on port ${PORT}`);
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setViewport({
      width: 760,
      height: 600,
      deviceScaleFactor: 1.5
    });

    await page.goto(`http://localhost:${PORT}/liberty/index.html`);
    await new Promise(r => setTimeout(r, 1200));

    // Open Story mode
    await page.evaluate(() => {
      const tile = document.querySelector('[data-mode="story"]');
      if (tile) tile.click();
    });
    await new Promise(r => setTimeout(r, 1000));

    // Switch to World Map tab
    await page.evaluate(() => {
      const tab = document.querySelector('[data-maptab="world"]');
      if (tab) tab.click();
    });
    await new Promise(r => setTimeout(r, 1000));

    console.log('Recording animation frames...');
    const TOTAL_FRAMES = 32;
    const INTERVAL = 120; // ms

    for (let i = 0; i < TOTAL_FRAMES; i++) {
      if (i === 16) {
        // Click Zarahemla to show active state
        await page.evaluate(() => {
          const el = document.querySelector('[data-poi="zarahemla"]');
          if (el) el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
        });
        await new Promise(r => setTimeout(r, 60));
      }
      const mapWrap = await page.$('.campMapWrap');
      if (mapWrap) {
        const framePath = path.join(FRAME_DIR, `frame_${String(i).padStart(3, '0')}.png`);
        await mapWrap.screenshot({ path: framePath });
      }
      await new Promise(r => setTimeout(r, INTERVAL));
    }

    console.log(`Successfully recorded ${TOTAL_FRAMES} frames!`);
  } catch (err) {
    console.error('Error recording:', err);
  } finally {
    if (browser) await browser.close();
    server.close();
    process.exit(0);
  }
});
