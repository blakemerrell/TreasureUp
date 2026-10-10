import http from 'http';
import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer';

const ROOT = '/Users/blakemerrell/TreasureUp';
const PORT = 8094;
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

    // Screenshot 1: Mesoamerican Parchment Campaign Map
    const mapShotPath = path.join(ARTIFACT_DIR, 'parchment_campaign_map_live.png');
    await page.screenshot({ path: mapShotPath });
    console.log(`Saved: ${mapShotPath}`);

    // 2. Click on Node 1 (River Sidon)
    console.log('Clicking Node 1 on Campaign Map...');
    await page.evaluate(() => {
      const node = document.querySelector('[data-node="m3"]');
      if (node) node.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await new Promise(r => setTimeout(r, 800));

    // Screenshot 2: Node Selected & Card Highlighted
    const nodeShotPath = path.join(ARTIFACT_DIR, 'parchment_map_node_selected_live.png');
    await page.screenshot({ path: nodeShotPath });
    console.log(`Saved: ${nodeShotPath}`);

    // 3. Launch River Sidon mission (m3)
    console.log('Launching River Sidon mission (m3)...');
    await page.evaluate(() => {
      window.LIB_UI.begin('m3');
    });
    await new Promise(r => setTimeout(r, 1500));

    // Screenshot 3: HUD with Audio Button
    const hudShotPath = path.join(ARTIFACT_DIR, 'in_game_audio_hud_live.png');
    await page.screenshot({ path: hudShotPath });
    console.log(`Saved: ${hudShotPath}`);

    // 4. Test Army Selection and Sub-Filters ([Frontline] vs [Ranged])
    console.log('Testing Army Selection and Sub-Filters...');
    await page.evaluate(() => {
      const armyBtn = document.getElementById('bArmy');
      if (armyBtn) armyBtn.click();
    });
    await new Promise(r => setTimeout(r, 600));

    // Screenshot 4: Army selected showing Frontline & Ranged micro chips
    const armyShotPath = path.join(ARTIFACT_DIR, 'mobile_army_subfilters_live.png');
    await page.screenshot({ path: armyShotPath });
    console.log(`Saved: ${armyShotPath}`);

    // 5. Test River Sidon Fords with moving units
    console.log('Testing River Sidon Fords ripple rendering...');
    await page.evaluate(() => {
      const units = window.LIB_UI.W.units('p');
      let fx = 0, fy = 0;
      for (let y = 15; y < 45; y++) {
        for (let x = 10; x < 50; x++) {
          if (window.LIB_UI.W.tile(x, y) === window.LIB_DATA.T.FORD) {
            fx = x; fy = y; break;
          }
        }
        if (fx) break;
      }
      window.LIB_UI.lookAt(fx * 32, fy * 32);
      if (units.length) {
        units[0].x = fx * 32 + 16;
        units[0].y = fy * 32 + 16;
        if (units[1]) {
          units[1].x = fx * 32 + 16;
          units[1].y = (fy + 1) * 32 + 16;
          units[1].path = [[fx, fy]];
        }
      }
    });
    await new Promise(r => setTimeout(r, 600));

    // Screenshot 5: River Ford ripples
    const fordShotPath = path.join(ARTIFACT_DIR, 'tactical_river_ford_ripples_live.png');
    await page.screenshot({ path: fordShotPath });
    console.log(`Saved: ${fordShotPath}`);

    console.log('All visual verification screenshots captured successfully!');
  } catch (err) {
    console.error('Visual test failed:', err);
  } finally {
    if (browser) await browser.close();
    server.close();
  }
});
