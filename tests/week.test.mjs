// A week on one device, whatever week content/weeks.js has live: each day
// Monday to Saturday through Today's study (Be still first, then the path),
// XP up and the day kept; Sunday kept by one family game even when behind;
// and a chapter split over two days opens its unread part's day from the
// reader ("Mark it read in its lesson").
import { check, note, device, setDay, state, study, txt, wait, liveWeek, weeks, dayAdd, built } from './lib.mjs';

// The chapters under Today's button: "🕊️ Be still, then Isaiah 59:9–21; 60:1–18 · Come Follow Me · …"
function refsOf(small) {
  const list = small.replace(/^.*?then /, '').split(' · ')[0];
  let book = '';
  const out = [];
  for (const tok of list.split('; ')) {
    const m = /^(?:(.+?) )?(\d+)(?::(\d+)–(\d+))?(?:–(\d+))?$/.exec(tok.trim());
    if (!m) continue;
    if (m[1]) book = m[1];
    if (m[3]) out.push({ ch: book + ' ' + m[2], part: true });
    else for (let c = +m[2]; c <= +(m[5] || m[2]); c++) out.push({ ch: book + ' ' + c, part: false });
  }
  return out;
}

export default async function week({ port }) {
  const url = `http://127.0.0.1:${port}/index.html`;
  const w = liveWeek(), days = [0, 1, 2, 3, 4, 5].map(i => dayAdd(w.start, i)), sunday = dayAdd(w.start, 6);
  note('INFO', `the live week: ${w.title} (${w.dates})`);

  const dev = await device('phone', { url, day: days[0] + 'T16:30:00' });
  let xp = 0;
  for (const [i, d] of days.entries()) {
    await setDay(dev, d + 'T16:30:00');
    const steps = await study(dev);
    const s = await state(dev.page);
    if (steps === null) { note('NOTE', `${d}: no study button (${await txt(dev.page, '#home .fl-date')})`); continue; }
    check(steps.length > 1 && steps[steps.length - 1] === 'end' && s.xp > xp && (s.days || {})[d] === 1,
      `day ${i + 1} (${d}): ${steps.length} steps (${[...new Set(steps)].join(' ')}), XP ${xp} → ${s.xp}, kept`);
    xp = s.xp || 0;
  }
  await setDay(dev, sunday + 'T19:00:00');
  check(/SUNDAY/i.test(await txt(dev.page, '#home .fl-date')), 'Sunday opens: ' + (await txt(dev.page, '#home .fl-date')));
  check(!dev.page.errors.length, 'no page errors all week' + (dev.page.errors.length ? ': ' + dev.page.errors.join(' | ') : ''));
  await dev.ctx.close();

  // Sunday, behind on the week's reading: a family game still keeps the day (README: Sunday, one answer counts).
  const behind = await device('behind', { url, day: sunday + 'T19:00:00' });
  const game = behind.page.locator(`#home [data-played="${sunday}"]`);
  if (await game.count()) {
    await game.click(); await wait(600);
    check(((await state(behind.page)).days || {})[sunday] === 1, 'Sunday with nothing read: “We played!” keeps the day');
  } else note('NOTE', 'Sunday has no family game row to tap: skipped');
  await behind.ctx.close();

  // Reading ahead keeps only the day it's read (Blake, 2026-10-07: "No, only on the day"): the whole week read on Monday.
  if (!built) note('NOTE', 'the chapters aren’t built here (the deploy builds them): the reading-ahead check is skipped');
  else {
  const ahead = await device('ahead', { url, day: days[0] + 'T16:30:00' });
  await ahead.page.click('#tabs [data-tab="scriptures"]'); await wait(400);
  if (await ahead.page.locator('#home [data-lib-book=""]').count()) await ahead.page.click('#home [data-lib-book=""]');
  await ahead.page.click('#home .lib-week').catch(() => {}); await wait(400);
  const refs = await ahead.page.$$eval('#home [data-lib-ch]', els => [...new Set(els.map(e => e.dataset.libCh))]);
  await ahead.page.evaluate(([refs, d]) => {
    const S = JSON.parse(localStorage.getItem('treasureup.v1'));
    S.read = Object.fromEntries(refs.map(r => [r, d]));
    localStorage.setItem('treasureup.v1', JSON.stringify(S));
  }, [refs, days[0]]);
  await ahead.page.reload(); await wait(1500);
  let f = (await state(ahead.page)).filled || {};
  check(refs.length > 2 && f[days[0]] === 1 && !f[days[1]] && !f[days[5]], `the week's ${refs.length} chapters read on Monday: Monday is kept, Tuesday to Saturday aren't yet (${Object.keys(f).sort().join(', ') || 'none'})`);
  await setDay(ahead, days[1] + 'T16:30:00');
  f = (await state(ahead.page)).filled || {};
  check(!f[days[1]], 'and Tuesday, when it comes, isn’t kept by Monday’s reading');
  await ahead.ctx.close();
  }

  // A chapter split over two days: after the first day, the reader's "Mark it read in its lesson" opens the second day.
  let split = null;
  const scan = await device('scan', { url, day: w.start + 'T08:00:00' });
  for (const wk of weeks().filter(x => x.start >= w.start)) {
    let prev = [];
    for (let i = 0; i < 6 && !split; i++) {
      await setDay(scan, dayAdd(wk.start, i) + 'T08:00:00');
      const refs = refsOf(await txt(scan.page, '#home .fl-next small'));
      const both = refs.find(r => r.part && prev.some(p => p.part && p.ch === r.ch));
      if (both) split = { ch: both.ch, first: dayAdd(wk.start, i - 1), second: dayAdd(wk.start, i), d: i };
      prev = refs;
    }
    if (split) break;
  }
  await scan.ctx.close();
  if (!split) { note('NOTE', 'no chapter split over two days in the weeks ahead: the Mark it read check is skipped'); return; }
  const r = await device('reader', { url, day: split.first + 'T16:30:00' });
  await study(r);
  await setDay(r, split.second + 'T16:30:00');
  await r.page.click('#tabs [data-tab="scriptures"]'); await wait(400);
  if (await r.page.locator('#home [data-lib-book=""]').count()) await r.page.click('#home [data-lib-book=""]');
  await r.page.click('#home .lib-week').catch(() => {}); await wait(400);
  await r.page.click(`#home [data-lib-ch="${split.ch}"]`).catch(() => {}); await wait(1000);
  const key = await r.page.getAttribute('[data-mark-lesson]', 'data-mark-lesson').catch(() => null);
  check(key && key.startsWith(split.d + '.'), `${split.ch}, split over ${split.first} and ${split.second}: “Mark it read in its lesson” opens the second day (lesson ${key}, want ${split.d}.x)`);
  await r.ctx.close();
}
