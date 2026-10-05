#!/usr/bin/env node
// Brings the weeks written ahead into content/weeks.js as room allows (Blake,
// 2026-10-05: "lets get the rest of the year ... populated with as much
// content as we can"; he approves a week at a time). Developer mode reads and
// writes weeks.js through the GitHub API, which stops at 1 MB, so weeks
// written further ahead wait in content/upcoming/, one file a week
// (<start>.json, plain JSON, like "2026-11-16.json"), and come in oldest
// first while weeks.js stays under BUDGET. tools/archive-weeks.mjs makes the
// room, moving weeks that ended before last week to content/past/. The test
// site's deploy runs both and saves the result back to the repo; a week that
// came in is a draft there, like any other, until Blake approves it.
//
//   node tools/upcoming-weeks.mjs             bring in what fits
//   node tools/upcoming-weeks.mjs --dry-run   say what would come in
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const WEEKS = path.join(ROOT, 'content', 'weeks.js'), UP = path.join(ROOT, 'content', 'upcoming');
const MARK = 'window.TU_WEEKS = ';
const BUDGET = 960 * 1000;   // bytes: under the API's 1 MB, with room for Blake's approvals and edits
const dry = process.argv.includes('--dry-run');

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
function weekStart(dates) {
  const m = /^([A-Z][a-z]+) (\d{1,2})–(?:[A-Z][a-z]+ )?\d{1,2}, (\d{4})$/.exec(dates || '');
  if (!m || MONTHS.indexOf(m[1]) < 0) throw new Error(`Can't read the dates "${dates}"`);
  return m[3] + '-' + String(MONTHS.indexOf(m[1]) + 1).padStart(2, '0') + '-' + m[2].padStart(2, '0');
}

const files = fs.existsSync(UP) ? fs.readdirSync(UP).filter(f => /^\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort() : [];
if (!files.length) { console.log('No weeks waiting in content/upcoming/.'); process.exit(0); }

const src = fs.readFileSync(WEEKS, 'utf8'), cut = src.indexOf(MARK);
const weeks = JSON.parse(src.slice(cut + MARK.length).replace(/;\s*$/, ''));
const text = list => src.slice(0, cut) + MARK + JSON.stringify(list, null, 2) + ';\n';
const came = [];
for (const f of files) {
  const week = JSON.parse(fs.readFileSync(path.join(UP, f), 'utf8'));
  if (weekStart(week.dates) + '.json' !== f) throw new Error(`content/upcoming/${f} holds ${week.dates}: name it ${weekStart(week.dates)}.json`);
  if (weeks.some(w => w.dates === week.dates)) throw new Error(`${week.dates} is in both weeks.js and content/upcoming/${f}: keep it in one`);
  const next = weeks.concat([week]).sort((a, b) => weekStart(a.dates).localeCompare(weekStart(b.dates)));
  const size = Buffer.byteLength(text(next));
  if (size > BUDGET) { console.log(`${week.dates} waits: weeks.js would be ${Math.round(size / 1000)} KB (at most ${BUDGET / 1000}).`); break; }   // in order: none skips ahead
  weeks.splice(0, weeks.length, ...next);
  came.push(f);
  console.log(`${dry ? 'Would bring in' : 'Bringing in'} ${week.dates} · ${week.title} (weeks.js ${Math.round(size / 1000)} KB)`);
}
if (dry || !came.length) process.exit(0);
fs.writeFileSync(WEEKS, text(weeks));
for (const f of came) fs.unlinkSync(path.join(UP, f));
console.log(`weeks.js holds ${weeks.length} weeks; ${files.length - came.length} still waiting in content/upcoming/.`);
