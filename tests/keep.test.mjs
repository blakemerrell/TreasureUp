// Keep going (Blake, 2026-10-10: "the option to continue in the flow", and on
// coming back, "guide me through all open suggested study cards… until I am
// done or exit"): after today's path, the 🎉 screen asks once; yes plays the
// day's extras (its Go further, the Friday deep dive, the puzzle) one after
// another. Stopped part-way, Today's button picks it up again.
import { check, note, device, state, study, runLesson, txt, wait, liveWeek } from './lib.mjs';

export default async function keep({ port }) {
  const url = `http://127.0.0.1:${port}/index.html`, w = liveWeek(), monday = w.start;
  const open = page => page.evaluate(() => { const b = document.getElementById('lessonBody'); return b && !document.getElementById('lesson').hidden ? b.dataset.step : null; });
  const extrasLeft = page => page.evaluate(() => [...document.querySelectorAll('#home .more-list [data-lesson], #home .more-list [data-card]')].filter(b => !b.closest('.on, .done') && !b.matches('.on, .done')).length);

  // 1. The whole way: today's path, then "Keep going", to the end.
  const a = await device('keep', { url, day: monday + 'T16:30:00' });
  const more = /(\d+)\/(\d+)/.exec(await txt(a.page, '#home details.more .more-n')), openExtras = more ? +more[2] - +more[1] : 0;   // Keep going ›'s "0/4"
  const path = await study(a, { stayAtEnd: true });
  if (!path || path[path.length - 1] !== 'end') { note('NOTE', 'today has no path to finish: Keep going is skipped'); await a.ctx.close(); return; }
  const ask = a.page.locator('#lessonFoot [data-ls="keep"]');
  if (!openExtras) { note('NOTE', 'this day has no extras to keep going with: skipped'); await a.ctx.close(); return; }
  if (!check(await ask.count() === 1, `today’s path done (${path.length} steps: ${[...new Set(path)].join(' ')}) with ${openExtras} extras open: the 🎉 screen offers Keep going`)) { await a.ctx.close(); return; }
  check(/Keep going · \d+ more · about \d+ min/i.test(await ask.innerText()) && (await a.page.locator('#lessonFoot [data-ls="close"]').count()) === 1,
    'today’s path done: the 🎉 screen asks once: ' + (await ask.innerText()) + ' / Done for now');
  await ask.click(); await wait(900);
  const extras = await runLesson(a.page, { stayAtEnd: true });
  const kinds = [...new Set(extras)];
  check(extras.length > 1 && extras[extras.length - 1] === 'end' && kinds.some(k => /insight|deep|bonus|say|note/.test(k)),
    `Keep going plays the day’s extras without asking again: ${extras.length} steps (${kinds.join(' ')})`);
  check(/Everything for today is done/.test(await txt(a.page, '#lessonBody')), 'and ends: ' + (await txt(a.page, '#lessonBody .ls-news')));
  await a.page.click('#lessonFoot [data-ls="close"], #lessonFoot [data-ls="nextlesson"] ~ [data-ls="close"]').catch(() => {}); await wait(800);
  if (await open(a.page)) { await a.page.click('#lessonExit').catch(() => {}); await wait(600); }
  check(!(await a.page.locator('#home [data-keep-going]').count()) && /done/i.test(await txt(a.page, '#home .fl-done')), 'Today then says done: ' + (await txt(a.page, '#home .fl-done')));
  check(!a.page.errors.length, 'no page errors' + (a.page.errors.length ? ': ' + a.page.errors.join(' | ') : ''));
  await a.ctx.close();

  // 2. Stopped part-way, then the app opened again later: Today's button goes on through what's left.
  const b = await device('keep-later', { url, day: monday + 'T16:30:00' });
  await study(b, { stayAtEnd: true });
  if (await b.page.locator('#lessonFoot [data-ls="keep"]').count()) {
    await b.page.click('#lessonFoot [data-ls="keep"]'); await wait(900);
    const first = await open(b.page);
    await b.page.click('#lessonExit').catch(() => {}); await wait(600);
    await b.page.reload(); await wait(1800);
    const btn = b.page.locator('#home [data-keep-going]');
    check(await btn.count() === 1, `stopped at its first step (${first}), opened again: Today’s button is ` + (await txt(b.page, '#home .fl-next')));
    if (await btn.count()) {
      await btn.click(); await wait(900);
      const rest = await runLesson(b.page);
      check(rest.length > 0 && rest[rest.length - 1] === 'end' && !(await b.page.locator('#home [data-keep-going]').count()), `and it goes on to the end: ${rest.length} steps, then Today says done`);
    }
  }
  check(!b.page.errors.length, 'no page errors coming back' + (b.page.errors.length ? ': ' + b.page.errors.join(' | ') : ''));
  await b.ctx.close();
}
