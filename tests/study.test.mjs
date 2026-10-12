// Scripture study every day (2026-10-12: "scripture study for each day of the week. including come
// follow me chapters and study, and book of mormon. and general conference talk gem with deep dive
// option"). From the week of October 19 a week's chapters are read Monday to Sunday: next week's
// Sunday has its own chapters in Scripture study and plays them from the green button, and reading
// them keeps the day. A week begun before then keeps its six days: this week's Sunday has the Book of
// Mormon and a look at next week. Every day has the Conference gem: the talk a day as one of its
// lines, a tap paying for it once and opening the talk (its deep dive inside).
import { check, device, state, study, txt, wait, liveWeek, dayAdd } from './lib.mjs';

export default async function studyEveryDay({ port }) {
  const url = `http://127.0.0.1:${port}/index.html`, w = liveWeek();
  const sun = dayAdd(w.start, 6), nextMon = dayAdd(w.start, 7), nextSun = dayAdd(w.start, 13);

  // This week's Sunday (a six-day week): the Book of Mormon and next week, no chapters of its own.
  const a = await device('sun6', { url, day: sun + 'T09:00:00' });
  const p = a.page, studySel = '#home .tsec[data-sec="study"] .tsec-list > *';
  const kinds = await p.$$eval(studySel, els => els.map(e => e.hasAttribute('data-bom-open') ? 'bom' : e.hasAttribute('data-day') ? 'next' : /↩/.test(e.innerText) ? 'catch' : 'other'));
  check(kinds.includes('bom') && kinds.includes('next') && !kinds.includes('other'), 'this week’s Sunday: the Book of Mormon and next week in Scripture study, no chapters of its own: ' + kinds.join(' '));
  check(await p.getAttribute('#home .tsec[data-sec="study"] [data-day]', 'data-day') === nextMon, 'the look at next week opens its Monday');
  // The Conference gem: one of the talk's lines; a tap pays once and opens the talk.
  const gem = p.locator('#home .tsec[data-sec="conference"] [data-path-gc]');
  check(await gem.count() === 1 && /“.+”/.test(await gem.innerText()), 'the Conference gem is a line from the talk a day: ' + (await gem.innerText()).split('\n')[0].slice(0, 70));
  const xp0 = (await state(p)).xp || 0;
  await gem.click(); await wait(600);
  check(!(await p.$eval('#appSheet', e => e.hidden)), 'it opens the talk');
  await p.keyboard.press('Escape').catch(() => {}); await p.evaluate(() => document.querySelector('#appSheet [data-close], #sheetClose') && document.querySelector('#appSheet [data-close], #sheetClose').click()); await wait(400);
  const xp1 = (await state(p)).xp || 0;
  await p.click('#home .tsec[data-sec="conference"] [data-path-gc]').catch(() => {}); await wait(500);
  check(xp1 > xp0 && ((await state(p)).xp || 0) === xp1, `the gem pays once (+${xp1 - xp0}, then nothing)`);
  check(!p.errors.length, 'no page errors on this Sunday' + (p.errors.length ? ': ' + p.errors.join(' | ') : ''));
  await a.ctx.close();

  // A weekday has the gem too, for a child as well (it was a grown-up's only).
  const b = await device('tue', { url, day: dayAdd(w.start, 1) + 'T09:00:00' });
  check(await b.page.locator('#home .tsec[data-sec="conference"] [data-path-gc]').count() === 1, 'a child’s weekday has the Conference gem');
  await b.ctx.close();

  // Next week's Sunday (a seven-day week): its own chapters, played from the button, keep the day.
  const c = await device('sun7', { url, day: nextSun + 'T09:00:00' });
  const parts = await c.page.$$eval(studySel, els => els.filter(e => /^Read |\d+:\d+|Part \d/.test(e.innerText)).length);
  if (!parts) { check(true, 'next week has no chapters to give Sunday (a short week): skipped'); await c.ctx.close(); return; }
  check(parts > 0, `next week’s Sunday has its own chapters in Scripture study (${parts})`);
  check(await c.page.locator('#home .tsec[data-sec="classes"]').count() === 1, 'and Sunday’s classes in their own section');
  const path = await study(c);
  const s = await state(c.page);
  check(path && path.includes('chapter') && path[path.length - 1] === 'end', 'the green button plays Sunday’s reading: ' + (path || []).join(' '));
  check(!!((s.days || {})[nextSun] || (s.filled || {})[nextSun]), 'Sunday’s study keeps Sunday for the streak');
  check(!c.page.errors.length, 'no page errors on next week’s Sunday' + (c.page.errors.length ? ': ' + c.page.errors.join(' | ') : ''));
  await c.ctx.close();
}
