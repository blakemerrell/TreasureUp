// Shared by the browser tests: a small web server for the repo, devices
// (each a browser context with its own clock), the day's path done the
// honest way, and PASS/FAIL lines. See tests/README.md.
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
export const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
export const wait = ms => new Promise(r => setTimeout(r, ms));

// ---- results ----
export const results = { pass: 0, fail: 0, lines: [] };
export function note(kind, msg) { const line = `${kind.padEnd(5)} ${msg}`; console.log(line); results.lines.push(line); }
export function check(ok, msg) { if (ok) results.pass++; else results.fail++; note(ok ? 'PASS' : 'FAIL', msg); return ok; }

// ---- the repo over http: / is the live app; /TreasureUp-test/ is the same files as the test site,
// which on localhost talks to Firebase (here the emulators) ----
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.css': 'text/css',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.m4a': 'audio/mp4', '.mp3': 'audio/mpeg', '.webmanifest': 'application/manifest+json' };
export function serve(port) {
  const server = http.createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/TreasureUp-test\//, '/');
    if (p.endsWith('/')) p += 'index.html';
    const file = path.join(ROOT, path.normalize(p));
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise(r => server.listen(port, '127.0.0.1', () => r(server)));
}

// ---- dates: the weeks in content/weeks.js, so every test runs on whatever week is live ----
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export function weekStart(dates) {
  const m = /^([A-Z][a-z]+) (\d{1,2})(?:, (\d{4}))?–(?:([A-Z][a-z]+) )?\d{1,2}, (\d{4})$/.exec(dates || '');
  if (!m || MONTHS.indexOf(m[1]) < 0) return null;
  const mo = MONTHS.indexOf(m[1]), endMo = m[4] ? MONTHS.indexOf(m[4]) : mo;
  const year = m[3] ? +m[3] : +m[5] - (mo > endMo ? 1 : 0);
  return year + '-' + String(mo + 1).padStart(2, '0') + '-' + m[2].padStart(2, '0');
}
export const dayAdd = (k, n) => { const d = new Date(k + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
export function todayKey() { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
export function weeks() {
  const box = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'content', 'weeks.js'), 'utf8'), box);
  return box.window.TU_WEEKS.map(w => ({ title: w.title, dates: w.dates, start: weekStart(w.dates) })).filter(w => w.start).sort((a, b) => (a.start < b.start ? -1 : 1));
}
// The week the app shows today: the latest one that has started (or the first).
export function liveWeek(today = todayKey()) {
  const all = weeks(), started = all.filter(w => w.start <= today);
  return started.length ? started[started.length - 1] : all[0];
}

// ---- browsers and devices ----
let chromium, browser;
export async function launch() {
  process.env.PLAYWRIGHT_BROWSERS_PATH = process.env.PLAYWRIGHT_BROWSERS_PATH || (fs.existsSync('/opt/pw-browsers') ? '/opt/pw-browsers' : '');
  if (!process.env.PLAYWRIGHT_BROWSERS_PATH) delete process.env.PLAYWRIGHT_BROWSERS_PATH;
  ({ chromium } = require('playwright'));
  browser = await chromium.launch();
  return browser;
}
export const closeBrowser = () => browser && browser.close();
const SDK = (() => { try { return path.dirname(require.resolve('firebase/package.json')); } catch (e) { return null; } })();

// A device: a phone-sized browser context on `url`, its Date set to `day`
// (and moving on in real time; window.__skip(ms) jumps it ahead), with
// Firebase pointed at the emulators when `emulators` is set, and `files`
// ({ 'content/weeks.js': text }) served in place of the repo's.
export async function device(name, { url, day = null, emulators = false, files = {} }) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.route('**/*', r => {
    const u = r.request().url();
    const own = Object.keys(files).find(f => new URL(u).pathname.endsWith('/' + f));   // a test's own copy of a file
    if (own) return r.fulfill({ body: files[own], contentType: 'text/javascript' });
    const m = /^https:\/\/www\.gstatic\.com\/firebasejs\/[\d.]+\/(firebase-[a-z-]+\.js)/.exec(u);
    if (m && SDK) return r.fulfill({ path: path.join(SDK, m[1]), contentType: 'text/javascript' });
    return /^http:\/\/(127\.0\.0\.1|localhost):/.test(u) ? r.continue() : r.abort();
  });
  await ctx.addInitScript(([day, emulators]) => {
    if (day && !localStorage.getItem('fakeNow')) localStorage.setItem('fakeNow', day);
    // The page's clock: the day set (it starts there on every load), else the real time; __skip moves it on.
    const t = localStorage.getItem('fakeNow'), D = Date;
    let off = t ? new D(t).getTime() - D.now() : 0;
    window.__skip = ms => { off += ms; };
    class FD extends D { constructor(...a) { if (a.length) super(...a); else super(D.now() + off); } static now() { return D.now() + off; } }
    window.Date = FD;
    if (!emulators) return;
    let fb;
    Object.defineProperty(window, 'firebase', { configurable: true, get() { return fb; }, set(v) {
      fb = v;
      if (v && v.initializeApp && !v.__emu) {
        v.__emu = true; const init = v.initializeApp.bind(v);
        v.initializeApp = (...a) => { const app = init(...a);
          v.auth().useEmulator('http://127.0.0.1:9099', { disableWarnings: true });
          v.firestore().useEmulator('127.0.0.1', 8080);
          return app; };
      }
    } });
  }, [day, emulators]);
  const page = await ctx.newPage();
  page.errors = [];
  page.on('pageerror', e => { page.errors.push(e.message); note('ERR', `[${name}] ${e.message}`); });
  await page.goto(url); await wait(1500);
  return { name, ctx, page };
}
// The app closed and opened again on the same device (its storage kept).
export async function reopen(dev, url, between) {
  await dev.page.close();
  if (between) await between();
  const page = await dev.ctx.newPage();
  page.errors = [];
  page.on('pageerror', e => { page.errors.push(e.message); note('ERR', `[${dev.name}] ${e.message}`); });
  await page.goto(url); await wait(1500);
  dev.page = page;
}
export async function setDay(dev, day) {
  await dev.page.evaluate(d => (d ? localStorage.setItem('fakeNow', d) : localStorage.removeItem('fakeNow')), day);
  await dev.page.reload(); await wait(1800);
}
export const txt = async (page, sel) => (await page.locator(sel).first().innerText().catch(() => '')).replace(/\s*\n+\s*/g, ' | ');
export const state = page => page.evaluate(() => JSON.parse(localStorage.getItem('treasureup-test.v1') || localStorage.getItem('treasureup.v1') || '{}'));

// Counts real page loads while fn runs (the app restarting itself), not its back-button history.
export async function loadsDuring(dev, fn) {
  let n = 0; const h = () => n++;
  dev.page.on('load', h);
  try { return { value: await fn(), loads: () => n }; } finally { dev.page.off('load', h); }
}

// ---- the day's path, done the honest way: read each part to its end, answer right, finish each step ----
export async function runLesson(page, opts = {}) {
  const foot = a => page.locator(`#lessonFoot [data-ls="${a}"]:not([disabled])`);
  const stepKind = () => page.evaluate(() => { const b = document.getElementById('lessonBody'); return b && !document.getElementById('lesson').hidden ? b.dataset.step : null; });
  const answer = async kind => {
    const q = (await page.locator('#lessonBody .ls-prompt').first().innerText().catch(() => '')).trim();
    const right = await page.evaluate(([kind, q]) => {
      for (const w of window.TU_WEEKS) for (const r of w.reels) {
        if (kind === 'find' ? (r.seek || r.hook) === q : r.question.q === q) return kind === 'find' ? String(Number(/:(\d+)/.exec(r.verse.ref)[1])) : r.question.right;
      }
      return null;
    }, [kind, q]);
    const opt = right != null ? page.locator(`#lessonBody [data-ls="pick"][data-v="${right}"]`).first() : page.locator('#lessonBody [data-ls="pick"]').first();
    if (await opt.count()) await opt.click(); else await page.locator('#lessonBody [data-ls="pick"]').first().click();
    await wait(120);
    await foot('check').click(); await wait(480);
  };
  const seen = [];
  for (let i = 0; i < 60; i++) {
    const k = await stepKind();
    if (!k) break;
    seen.push(k);
    if (k === 'end') { await foot('close').click().catch(() => {}); await wait(500); break; }
    if (k === 'chapter') {
      await page.evaluate(() => { const b = document.getElementById('lessonBody'); b.scrollTop = b.scrollHeight; b.dispatchEvent(new Event('scroll')); }); await wait(250);
      await foot('readdone').click(); await wait(480);
      if (await foot('readyes').count()) { await foot('readyes').click(); await wait(480); }
      await foot('next').click(); await wait(480);
    } else if (k === 'reel' || k === 'recall' || k === 'find') { await answer(k); await foot('next').click().catch(() => {}); await wait(480); }
    else if (k === 'read' || k === 'insight') { await foot('next').click(); await wait(480); }
    else if (k === 'cfm') { await foot('cfmdone').click(); await wait(480); }
    else if (k === 'gc') { await foot('gcdone').click(); await wait(480); }
    else if (k === 'goals') { await foot('goalsdone').click(); await wait(480); }
    else if (k === 'thanks') { await page.fill('#lsGr0', opts.thanks || 'My family'); await foot('thanks').click(); await wait(480); }
    else { note('NOTE', 'lesson: a step this test doesn’t know: ' + k); await page.click('#lessonExit').catch(() => {}); break; }
  }
  return seen;
}
// Today's study: the green button (through Be still, which opens first), then the path.
export async function study(dev) {
  const btn = dev.page.locator('#home .fl-next');
  if (!(await btn.count())) return null;
  await btn.click(); await wait(900);
  if (await dev.page.locator('#stillLayer:not([hidden]) [data-still-onward]').count()) { await dev.page.click('#stillLayer [data-still-onward]'); await wait(900); }
  return runLesson(dev.page);
}
