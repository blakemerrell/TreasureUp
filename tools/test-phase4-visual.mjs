import http from 'http';
import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer';

const ROOT = '/Users/blakemerrell/TreasureUp';
const PORT = 8097;
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

    console.log('Navigating to Liberty...');
    await page.goto(`http://localhost:${PORT}/liberty/index.html`);
    await new Promise(r => setTimeout(r, 1200));

    // 1. Open Story missions screen
    console.log('Opening story missions screen...');
    await page.evaluate(() => {
      const tile = document.querySelector('[data-mode="story"]');
      if (tile) tile.click();
    });
    await new Promise(r => setTimeout(r, 1000));

    // Screenshot 1: 6-Node Parchment Campaign Map
    const mapShotPath = path.join(ARTIFACT_DIR, 'parchment_campaign_map_6_nodes_live.png');
    await page.screenshot({ path: mapShotPath });
    console.log(`Saved: ${mapShotPath}`);

    // 2. Open Perks Drawer and give some test stars
    console.log('Opening Relics & Blessings Drawer...');
    await page.evaluate(() => {
      const d = document.querySelector('.perksDrawer');
      if (d) d.open = true;
    });
    await new Promise(r => setTimeout(r, 600));

    // Screenshot 2: Relics & Blessings Drawer
    const perksShotPath = path.join(ARTIFACT_DIR, 'relics_blessings_perks_drawer_live.png');
    await page.screenshot({ path: perksShotPath });
    console.log(`Saved: ${perksShotPath}`);

    // 3. Launch Mission 4: The Standard Raised
    console.log('Launching Mission 4 (The Standard Raised)...');
    await page.evaluate(() => {
      window.LIB_UI.begin('m4');
    });
    await new Promise(r => setTimeout(r, 1500));
    const m4ShotPath = path.join(ARTIFACT_DIR, 'mission4_standard_raised_live.png');
    await page.screenshot({ path: m4ShotPath });
    console.log(`Saved: ${m4ShotPath}`);

    // 4. Launch Mission 5: The Fortifications of Noah
    console.log('Launching Mission 5 (The Fortifications of Noah)...');
    await page.evaluate(() => {
      window.LIB_UI.begin('m5');
    });
    await new Promise(r => setTimeout(r, 1500));
    const m5ShotPath = path.join(ARTIFACT_DIR, 'mission5_noah_fortifications_live.png');
    await page.screenshot({ path: m5ShotPath });
    console.log(`Saved: ${m5ShotPath}`);

    // 5. Launch Mission 6: The Two Thousand Stripling Warriors
    console.log('Launching Mission 6 (The Two Thousand Stripling Warriors)...');
    await page.evaluate(() => {
      window.LIB_UI.begin('m6');
    });
    await new Promise(r => setTimeout(r, 1500));
    const m6ShotPath = path.join(ARTIFACT_DIR, 'mission6_stripling_warriors_live.png');
    await page.screenshot({ path: m6ShotPath });
    console.log(`Saved: ${m6ShotPath}`);

    console.log('All visual verification screenshots captured successfully!');
  } catch (err) {
    console.error('Puppeteer visual verification failed:', err);
  } finally {
    if (browser) await browser.close();
    server.close();
  }
});
