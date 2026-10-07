// A week's dates, as the lesson page prints them, to the day it starts: the
// one reader the tools share, and the same rule as the app's weekStart in
// index.html. It reads all three ways a week is printed:
//
//   "September 28–October 4, 2026"        -> 2026-09-28
//   "December 28–January 3, 2027"         -> 2026-12-28 (the year is the end's, less one)
//   "December 28, 2026–January 3, 2027"   -> 2026-12-28
//
// Each tool had its own copy, which read the New Year week as a year late or
// not at all (review, 2026-10-07). `node tools/week-dates.mjs` checks the rule.
import { fileURLToPath } from 'node:url';

export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// The day the week starts ("2026-09-28"), or null when the dates can't be read.
export function weekStart(dates) {
  const m = /^([A-Z][a-z]+) (\d{1,2})(?:, (\d{4}))?–(?:([A-Z][a-z]+) )?\d{1,2}, (\d{4})$/.exec(dates || '');
  if (!m || MONTHS.indexOf(m[1]) < 0 || (m[4] && MONTHS.indexOf(m[4]) < 0)) return null;
  const mo = MONTHS.indexOf(m[1]), endMo = m[4] ? MONTHS.indexOf(m[4]) : mo;
  const year = m[3] ? Number(m[3]) : Number(m[5]) - (endMo < mo ? 1 : 0);
  return year + '-' + String(mo + 1).padStart(2, '0') + '-' + m[2].padStart(2, '0');
}

// The same, for a tool that can't go on without it.
export function weekStartOrThrow(dates) {
  const s = weekStart(dates);
  if (!s) throw new Error(`Can't read the dates "${dates}"`);
  return s;
}

// The day in Utah ("2026-10-11"): a deploy on Sunday evening there is still Sunday, though it's Monday in UTC.
export function utahToday(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Denver', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const cases = [
    ['September 28–October 4, 2026', '2026-09-28'],
    ['October 5–11, 2026', '2026-10-05'],
    ['December 21–27, 2026', '2026-12-21'],
    ['December 28–January 3, 2027', '2026-12-28'],
    ['December 28, 2026–January 3, 2027', '2026-12-28'],
    ['December 29, 2025–January 4, 2026', '2025-12-29'],
    ['January 4–10, 2027', '2027-01-04'],
    ['Smarch 3–9, 2026', null],
    ['October 5-11, 2026', null],
  ];
  let bad = 0;
  for (const [dates, want] of cases) {
    const got = weekStart(dates);
    if (got !== want) { bad++; console.log(`FAIL "${dates}" -> ${got}, want ${want}`); }
  }
  const sunEve = utahToday(new Date('2026-10-12T02:30:00Z'));   // Sunday 8:30 pm in Utah
  if (sunEve !== '2026-10-11') { bad++; console.log(`FAIL utahToday on Sunday evening -> ${sunEve}`); }
  console.log(bad ? `${bad} failed.` : `All ${cases.length + 1} date checks pass.`);
  process.exit(bad ? 1 : 0);
}
