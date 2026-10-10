import http from 'http';
import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer';
import { execSync } from 'child_process';

const ROOT = '/Users/blakemerrell/TreasureUp';
const PORT = 8092;
const ARTIFACT_DIR = '/Users/blakemerrell/.gemini/antigravity/brain/712c72b4-2fe7-4275-a6c2-f8d78eb1924d/game_assets';
const FRAMES_DIR = '/tmp/milestone_frames';

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
  console.log(`Milestone test server running at http://localhost:${PORT}/`);
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      protocolTimeout: 120000,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setViewport({
      width: 1000,
      height: 700,
      deviceScaleFactor: 2
    });

    console.log('Navigating to Liberty...');
    await page.goto(`http://localhost:${PORT}/liberty/index.html`);
    await new Promise(r => setTimeout(r, 1200));

    // 1. Capture War Council Briefing Card (Milestone 5)
    console.log('Testing Milestone 5: War Council Briefing...');
    await page.evaluate(() => {
      const MISSIONS = window.LIB_MISSIONS.MISSIONS;
      const m3 = MISSIONS.find(m => m.id === 'm3');
      window.LIB_UI.briefing(m3);
      const got = document.getElementById('tGot');
      if (got) got.click();
    });
    await new Promise(r => setTimeout(r, 600));
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'milestone5_war_council_briefing.png') });
    console.log('Saved milestone5_war_council_briefing.png');

    // 2. Test Milestone 1: Planting Title of Liberty Standard
    console.log('Testing Milestone 1: Title of Liberty Standard & Planting Effect...');
    await page.evaluate(() => {
      // Start free battle with Freemen where standard starts deployed or ready to plant
      window.LIB_UI.begin('free');
    });
    await new Promise(r => setTimeout(r, 800));

    // Look at standard unit and capture Title of Liberty standard in hand
    const stdPos = await page.evaluate(() => {
      const W = window.LIB_UI.W;
      const std = W.units('p').find(u => u.type === 'standard');
      if (std) {
        window.LIB_UI.lookAt(std.x, std.y);
        return window.LIB_UI.screenOf(std.x, std.y);
      }
      return null;
    });
    await new Promise(r => setTimeout(r, 500));
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'milestone1_title_of_liberty_standard.png') });
    console.log('Saved milestone1_title_of_liberty_standard.png');

    // Trigger planting ceremony
    console.log('Deploying Title of Liberty standard to plant city...');
    await page.evaluate(() => {
      const W = window.LIB_UI.W;
      const std = W.units('p').find(u => u.type === 'standard');
      if (std) {
        window.LIB_UI.setSel([std]);
        const btn = document.querySelector('.act[data-cmd="deploy"]') || document.querySelector('[data-cmd="deploy"]');
        if (btn) btn.click();
      }
    });

    // Record planting animation frames (sacred ripples + ascending golden pillar)
    const oldFrames = fs.readdirSync(FRAMES_DIR);
    for (const f of oldFrames) fs.unlinkSync(path.join(FRAMES_DIR, f));

    console.log('Recording planting animation frames...');
    for (let f = 0; f < 35; f++) {
      const framePath = path.join(FRAMES_DIR, `plant_${String(f).padStart(3, '0')}.png`);
      await page.screenshot({ path: framePath });
      await new Promise(r => setTimeout(r, 33));
    }

    const pythonScript = `
import glob
from PIL import Image

frames = sorted(glob.glob('${FRAMES_DIR}/plant_*.png'))
if frames:
    imgs = [Image.open(f).resize((640, 448)) for f in frames]
    imgs[0].save('${ARTIFACT_DIR}/milestone1_planting_ceremony.webp', save_all=True, append_images=imgs[1:], duration=42, loop=0)
    imgs[0].save('${ARTIFACT_DIR}/milestone1_planting_ceremony.gif', save_all=True, append_images=imgs[1:], duration=42, loop=0)
    print("Successfully generated milestone1_planting_ceremony.webp and gif!")
`;
    fs.writeFileSync('/tmp/make_planting_gif.py', pythonScript);
    execSync('python3 /tmp/make_planting_gif.py', { stdio: 'inherit' });

    // 3. Test Milestone 3: Specialized Industry Building Visuals (Sawmill, Brickworks, Quarry)
    console.log('Testing Milestone 3: Specialized Industry Buildings...');
    await page.evaluate(() => {
      const W = window.LIB_UI.W;
      const sh = W.stronghold();
      const sx = sh ? sh.tx : 20, sy = sh ? sh.ty : 20;
      W.addBuilding('sawmill', 'p', sx + 6, sy, true);
      W.addBuilding('brickworks', 'p', sx + 6, sy + 6, true);
      W.addBuilding('quarry', 'p', sx, sy + 6, true);
      window.LIB_UI.lookAt((sx + 3) * 32, (sy + 3) * 32);
    });
    await new Promise(r => setTimeout(r, 600));
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'milestone3_industry_buildings.png') });
    console.log('Saved milestone3_industry_buildings.png');

    // 4. Test Milestone 2: Defensive Cart Combat & Worker Scythe Defense
    console.log('Testing Milestone 2: Defensive Cart Combat & Worker Scythe Defense...');
    await page.evaluate(() => {
      const W = window.LIB_UI.W;
      const wrk = W.addUnit('worker', 'p', 600, 600);
      const cartGrain = W.addUnit('cart', 'p', 640, 600);
      cartGrain.pref = 'grain';
      const cartTimber = W.addUnit('cart', 'p', 680, 600);
      cartTimber.carry = { type: 'timber', amt: 10 };
      const cartStone = W.addUnit('cart', 'p', 720, 600);
      cartStone.carry = { type: 'stone', amt: 10 };

      const foe1 = W.addUnit('lamanite', 'r', 615, 600);
      const foe2 = W.addUnit('lamanite', 'r', 655, 600);
      const foe3 = W.addUnit('lamanite', 'r', 695, 600);
      const foe4 = W.addUnit('lamanite', 'r', 750, 600);

      window.LIB_UI.lookAt(660, 600);
      // Trigger attacks
      W.damage(wrk, 5, foe1);
      W.damage(cartGrain, 5, foe2);
      W.damage(cartTimber, 5, foe3);
      W.damage(cartStone, 5, foe4);
    });
    await new Promise(r => setTimeout(r, 150));
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'milestone2_defensive_combat.png') });
    console.log('Saved milestone2_defensive_combat.png');

    console.log('All milestone visual validations captured successfully!');
  } catch (err) {
    console.error('Error during milestone visual test:', err);
  } finally {
    if (browser) await browser.close();
    server.close();
  }
});
