#!/usr/bin/env node
// Plays Title of Liberty with a finger, on a phone-sized Chrome, and checks the map answers touch the way Red Alert 2
// answers the mouse: a quick drag looks around, a held finger draws a box, a held finger lifted lets go, a flick slides on.
// Run: node tools/test-liberty-touch.mjs   (PUPPETEER_EXECUTABLE_PATH picks a Chrome of your own)
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer';

const ROOT = process.argv[2] || fileURLToPath(new URL('..', import.meta.url));
const PORT = 8094;
const MIME = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.png': 'image/png', '.webp': 'image/webp',
  '.jpg': 'image/jpeg', '.json': 'application/json', '.svg': 'image/svg+xml', '.webmanifest': 'application/json' };
const server = http.createServer((req, res) => {
  let file = path.join(ROOT, decodeURIComponent(req.url.replace(/\?.*$/, '')));
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  if (!fs.existsSync(file)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});

let failed = 0;
const ok = (cond, what) => { console.log((cond ? '  ✓ ' : '  ✗ ') + what); if (!cond) failed++; };
const wait = ms => new Promise(r => setTimeout(r, ms));

await new Promise(r => server.listen(PORT, r));
const browser = await puppeteer.launch({ headless: true, executablePath: process.env.PUPPETEER_EXECUTABLE_PATH, args: ['--no-sandbox'] });
try {
  // A phone held upright: the map is the strip between the top bar and the cohort bar (about y 45 to 455).
  const page = await browser.newPage();
  page.on('pageerror', e => ok(false, 'no page error: ' + e.message));
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  await page.goto(`http://localhost:${PORT}/liberty/index.html`);
  await wait(1200);
  await page.evaluate(() => window.LIB_UI.begin('wild'));
  await wait(1200);

  const T = page.touchscreen;
  const HELD = [200, 400];                             // open ground to hold a finger on
  const fx = x => Math.max(6, Math.min(384, x)), fy = y => Math.max(70, Math.min(440, y));
  const cam = () => page.evaluate(() => ({ x: window.LIB_UI.cam.x, y: window.LIB_UI.cam.y, z: window.LIB_UI.cam.z }));
  const moved = (a, b) => Math.hypot(a.x - b.x, a.y - b.y) > 2;
  const chosen = () => page.evaluate(() => window.LIB_UI.sel.length);
  const fighters = () => page.evaluate(() => window.LIB_UI.selEnts.filter(u => u.def.dmg && !u.def.gathers && !u.def.builds).map(u => u.order.type));
  const idle = () => page.evaluate(() => { const L = window.LIB_UI; for (const u of L.selEnts) L.W.order(u, { type: 'idle' }); });
  const hold = async () => { const t = await T.touchStart(...HELD); await wait(450); await t.end(); await wait(50); };
  const drag = async (t, x0, y0, x1, y1, steps = 8, gap = 16) => {
    for (let i = 1; i <= steps; i++) { await t.move(x0 + (x1 - x0) * i / steps, y0 + (y1 - y0) * i / steps); await wait(gap); }
  };
  // Where our people stand on the screen, as a box round them all.
  const ours = () => page.evaluate(() => {
    const L = window.LIB_UI, pts = L.W.units('p').map(u => L.screenOf(u.x, u.y));
    return { x0: Math.min(...pts.map(p => p.x)), y0: Math.min(...pts.map(p => p.y)), x1: Math.max(...pts.map(p => p.x)), y1: Math.max(...pts.map(p => p.y)) };
  });

  ok(!(await page.$('#bBox')), 'no Box select button: a held finger draws the box');

  console.log('a quick drag looks around');
  const was = await page.evaluate(() => window.LIB_UI.sel.join());    // (a free battle starts with the standard-bearer chosen)
  let c0 = await cam();
  let t = await T.touchStart(200, 420);
  await drag(t, 200, 420, 260, 380);
  await wait(150);                                     // stopped before lifting: no slide
  await t.end();
  let c1 = await cam();
  ok(moved(c0, c1), 'the map moved under the finger');
  ok(await page.evaluate(() => window.LIB_UI.sel.join()) === was, 'who is chosen did not change');
  await wait(300);
  ok(!moved(c1, await cam()), 'a finger that stopped before lifting leaves the map still');

  console.log('a held finger draws a box');
  await page.evaluate(() => {                          // everyone in sight
    const L = window.LIB_UI, us = L.W.units('p');
    L.cam.z = 0.8; L.lookAt(us.reduce((s, u) => s + u.x, 0) / us.length, us.reduce((s, u) => s + u.y, 0) / us.length);
  });
  await wait(100);
  let b = await ours();
  const r = { x0: fx(b.x0 - 30), y0: fy(b.y0 - 40), x1: fx(b.x1 + 30), y1: fy(b.y1 + 30) };
  const inBox = await page.evaluate(r => window.LIB_UI.W.units('p').filter(u => {
    const s = window.LIB_UI.screenOf(u.x, u.y); return s.x >= r.x0 && s.x <= r.x1 && s.y >= r.y0 && s.y <= r.y1;
  }).length, r);
  c0 = await cam();
  t = await T.touchStart(r.x0, r.y0);
  await wait(450);
  await drag(t, r.x0, r.y0, r.x1, r.y1);
  await t.end();
  ok(inBox > 2 && await chosen() === inBox, `the ${inBox} people in the box are chosen (${await chosen()})`);
  ok(!moved(c0, await cam()), 'the map stayed put while the box was drawn');

  console.log('a quick tap with people chosen is still an order');
  await idle();
  b = await ours();
  await T.tap(fx(b.x1 + 60), fy(b.y0 + 10));
  await wait(100);
  ok((await fighters()).some(o => o !== 'idle'), 'they were sent');
  ok(await chosen() === inBox, 'and are still chosen');

  console.log('held and lifted: Red Alert\'s right-click');
  await idle();
  await page.click('#bHunt');
  ok(await page.$eval('#bHunt', e => e.classList.contains('on')), 'Hunt armed');
  await hold();
  ok(!(await page.$eval('#bHunt', e => e.classList.contains('on'))), 'the first hold stops Hunt');
  ok(await chosen() === inBox, 'and keeps who is chosen');
  ok((await fighters()).every(o => o === 'idle'), 'and sends nobody anywhere');
  await hold();
  ok(await chosen() === 0, 'the second hold lets them go');

  console.log('a held finger stops a wall being drawn');
  await page.evaluate(() => {
    const L = window.LIB_UI, W = L.W, m = W.units('p').find(u => u.def.deploys);
    if (m) W.deploy(m);
    W.res.grain = W.res.timber = W.res.stone = 900;
    L.refreshPanel();
  });
  await wait(300);
  await page.evaluate(() => window.LIB_UI.remoteCommand('build', 'wall'));
  ok(await page.$eval('#view', e => e.classList.contains('placing')), 'placing a wall');
  await hold();
  ok(!(await page.$eval('#view', e => e.classList.contains('placing'))), 'held and lifted: no longer placing');

  console.log('pinch, then one finger goes on looking around');
  c0 = await cam();
  const a1 = await T.touchStart(150, 380), a2 = await T.touchStart(250, 380);
  for (let i = 1; i <= 6; i++) { await a2.move(250 + i * 10, 380); await wait(16); }
  const zoomed = await cam();
  ok(Math.abs(zoomed.z - c0.z) > 0.05, `pinching zooms (${c0.z.toFixed(2)} → ${zoomed.z.toFixed(2)})`);
  await a2.end();
  await wait(30);
  for (let i = 1; i <= 6; i++) { await a1.move(150, 380 - i * 12); await wait(16); }
  await wait(150);
  await a1.end();
  ok(moved(zoomed, await cam()), 'the finger left on the glass pans the map');

  console.log('a flick slides on, and a touch stops it');
  await page.evaluate(() => { const L = window.LIB_UI, u = L.W.units('p')[0]; L.cam.z = 1; L.lookAt(u.x, u.y); });
  await wait(100);
  t = await T.touchStart(100, 380);
  await drag(t, 100, 380, 280, 380, 6, 10);
  await t.end();
  c1 = await cam();
  await wait(250);
  ok(moved(c1, await cam()), 'the map kept sliding after the finger lifted');
  t = await T.touchStart(...HELD);
  const c3 = await cam();
  await wait(200);
  ok(!moved(c3, await cam()), 'touching the map stops the slide');
  await t.end();
} catch (e) {
  ok(false, 'ran to the end: ' + (e && e.stack || e));
} finally {
  await browser.close();
  server.close();
}
console.log(failed ? `\n${failed} failed` : '\nall passed');
process.exit(failed ? 1 : 0);
