// The week that crosses New Year opens on its Monday, whichever way the lesson
// page prints its dates ("December 28–January 3, 2027" read as 2027 would show it a
// year late; "December 28, 2026–January 3, 2027" didn't read at all). The app's
// copy of the rule; tools/week-dates.mjs checks the tools' (review, 2026-10-07).
import fs from 'node:fs';
import path from 'node:path';
import { check, device, state, ROOT } from './lib.mjs';

export default async function dates({ port }) {
  const url = `http://127.0.0.1:${port}/index.html`;
  const src = fs.readFileSync(path.join(ROOT, 'content', 'weeks.js'), 'utf8'), MARK = 'window.TU_WEEKS = ', cut = src.indexOf(MARK);
  const weeks = JSON.parse(src.slice(cut + MARK.length).replace(/;\s*$/, ''));
  for (const dates of ['December 28–January 3, 2027', 'December 28, 2026–January 3, 2027']) {
    const w = Object.assign(JSON.parse(JSON.stringify(weeks[weeks.length - 1])), { dates, title: 'The New Year week' });
    w.reels.forEach((r, i) => { r.id = 'ny' + i; });   // its own reel ids
    const text = src.slice(0, cut) + MARK + JSON.stringify(weeks.concat([w])) + ';\n';
    for (const [day, want] of [['2026-12-30T10:00:00', 'The New Year week'], ['2027-01-03T10:00:00', 'The New Year week'], ['2026-12-27T10:00:00', null]]) {
      const d = await device('ny', { url, day, files: { 'content/weeks.js': text } });
      const title = (await state(d.page)).weekTitle;
      check(want ? title === want : title !== 'The New Year week', `“${dates}” on ${day.slice(0, 10)}: the app is on ${want ? 'the New Year week' : 'the week before'} (${title})`);
      check(!d.page.errors.length, '  with no page errors' + (d.page.errors.length ? ': ' + d.page.errors.join(' | ') : ''));
      await d.ctx.close();
    }
  }
}
