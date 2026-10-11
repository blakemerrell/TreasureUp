// The app opens with no Wi-Fi (Blake, 2026-10-07: "Yes, add it"): once it has
// been open with a connection, sw.js keeps a copy, so it starts offline, Today's
// study runs with the week's chapters, and a family device starts too.
import { check, note, device, loadsDuring, study, txt, wait, built } from './lib.mjs';

const controlled = async page => {
  const ready = await page.evaluate(() => Promise.race([navigator.serviceWorker.ready.then(() => true), new Promise(r => setTimeout(() => r(false), 8000))]));
  if (!ready) return false;
  if (!(await page.evaluate(() => !!navigator.serviceWorker.controller))) { await page.reload(); await wait(1500); }
  return page.evaluate(() => !!navigator.serviceWorker.controller);
};

export default async function offline({ port }) {
  const d = await device('kindle', { url: `http://127.0.0.1:${port}/index.html`, sw: true });
  check(await controlled(d.page), 'opened once with a connection, the app keeps a copy (its service worker is on)');
  await d.ctx.setOffline(true);
  await d.page.reload(); await wait(2000);
  check(/\w/.test(await txt(d.page, '#home .fl-date')), 'with no Wi-Fi it opens: ' + (await txt(d.page, '#home .fl-date')));
  const steps = await study(d);
  // The chapter step needs the built chapters (content/reading.js, built by the deploy; tests/README.md).
  check(steps && (steps.includes('chapter') || !built) && steps[steps.length - 1] === 'end', `and Today's study runs${built ? ', with the chapter' : ''}: ${steps ? steps.length + ' steps (' + [...new Set(steps)].join(' ') + ')' : 'no button'}`);
  if (!built) note('NOTE', 'the chapters aren’t built here (the deploy builds them): the chapter step offline isn’t checked');
  // Coming back to the app (it asks for its own page then, to update itself): offline, the copy is the page it has, so no reload.
  const back = await loadsDuring(d, async () => {
    await d.page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
    await wait(4000);
  });
  check(back.loads() === 0, `coming back to it with no Wi-Fi, it doesn't reload itself (${back.loads()} reloads)`);
  check(!d.page.errors.length, 'no page errors offline' + (d.page.errors.length ? ': ' + d.page.errors.join(' | ') : ''));
  await d.ctx.setOffline(false);
  await d.ctx.close();

  // A family device (the test site's address, a family on it) starting with no Wi-Fi: no errors, Today shows.
  const url = `http://localhost:${port}/TreasureUp-test/index.html`;
  const f = await device('family-kindle', { url, sw: true });
  await f.page.evaluate(() => localStorage.setItem('treasureup-test.family', JSON.stringify({ fid: 'F'.repeat(20), uid: 'u1', pid: 'p'.repeat(16), name: 'Sam', role: 'kid', family: 'Test Family', project: 'scripturetok-test' })));
  check(await controlled(f.page), 'a family device keeps a copy too');
  // The live app at the same address (on github.io the two share storage): each keeps its own copy.
  const live = await f.ctx.newPage();
  await live.goto(`http://localhost:${port}/index.html`); await wait(1500);
  await controlled(live);
  const keys = await f.page.evaluate(() => caches.keys());
  check(keys.some(k => k.includes('/TreasureUp-test/')) && keys.some(k => k.startsWith('treasureup-/-')), 'the live app and the test site keep separate copies: ' + keys.join(', '));
  await live.close();
  await f.ctx.setOffline(true);
  await f.page.reload(); await wait(3000);
  check(/\w/.test(await txt(f.page, '#home .fl-date')) && !f.page.errors.length, 'a family device with no Wi-Fi opens, with no errors' + (f.page.errors.length ? ': ' + f.page.errors.join(' | ') : ''));
  await f.ctx.close();
}
