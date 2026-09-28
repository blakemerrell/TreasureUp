#!/usr/bin/env node
// Moves the weeks that ended before last week out of content/weeks.js into
// content/past/: each week to its own file (week-<num>.js, the lesson's
// number), listed in content/past/index.js. weeks.js stays small, since the
// app loads it on every start and developer mode reads it through the
// GitHub API (which stops at 1 MB), and Past weeks can still open every
// week: it loads a week's file only when he opens that week. Its chapters'
// text is built at deploy (tools/build-reading.mjs), like content/reading.js.
//
//   node tools/archive-weeks.mjs                   the date today decides
//   node tools/archive-weeks.mjs --today 2026-10-13
//   node tools/archive-weeks.mjs --dry-run         say what it would move
//
// Last week stays in weeks.js: the warm-up and Babylon Falls still ask its
// reel questions as review.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const WEEKS = path.join(ROOT, 'content', 'weeks.js'), PAST = path.join(ROOT, 'content', 'past');
const MARK = 'window.TU_WEEKS = ';
const args = process.argv.slice(2);
const dry = args.includes('--dry-run');
const at = args.indexOf('--today');
const d = new Date();
const today = at >= 0 ? args[at + 1] : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
if (!/^\d{4}-\d{2}-\d{2}$/.test(today || '')) throw new Error('--today takes a date like 2026-10-13');

// "September 28–October 4, 2026" -> "2026-09-28" (the app's rule).
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
function weekStart(dates) {
  const m = /^([A-Z][a-z]+) (\d{1,2})–(?:[A-Z][a-z]+ )?\d{1,2}, (\d{4})$/.exec(dates || '');
  if (!m || MONTHS.indexOf(m[1]) < 0) throw new Error(`Can't read the dates "${dates}"`);
  return m[3] + '-' + String(MONTHS.indexOf(m[1]) + 1).padStart(2, '0') + '-' + m[2].padStart(2, '0');
}
const numOf = w => {
  const n = Number((/\/(\d+)\?/.exec(w.lesson || '') || [])[1]);
  if (!n) throw new Error(`${w.dates}: its lesson link has no number to name its file by`);
  return n;
};

const src = fs.readFileSync(WEEKS, 'utf8'), cut = src.indexOf(MARK);
const weeks = JSON.parse(src.slice(cut + MARK.length).replace(/;\s*$/, ''));
const started = weeks.filter(w => weekStart(w.dates) <= today).sort((a, b) => weekStart(a.dates).localeCompare(weekStart(b.dates)));
const last = started.length >= 2 ? started[started.length - 2] : null;
const moving = last ? weeks.filter(w => weekStart(w.dates) < weekStart(last.dates)) : [];
if (!moving.length) { console.log(`Nothing to move on ${today}: weeks.js holds last week and later.`); process.exit(0); }

const indexFile = path.join(PAST, 'index.js');
const index = (() => {
  if (!fs.existsSync(indexFile)) return [];
  const w = {};
  new Function('window', fs.readFileSync(indexFile, 'utf8'))(w);
  return w.TU_PAST_INDEX || [];
})();

for (const w of moving) {
  const num = numOf(w), file = path.join(PAST, `week-${num}.js`);
  if (fs.existsSync(file)) throw new Error(`content/past/week-${num}.js is already there; weeks.js shouldn't still hold ${w.dates}`);
  console.log(`${dry ? 'Would move' : 'Moving'} ${w.dates} · ${w.title} → content/past/week-${num}.js`);
  if (dry) continue;
  fs.mkdirSync(PAST, { recursive: true });
  fs.writeFileSync(file,
    `// ${w.title} (${w.dates}), moved out of content/weeks.js by tools/archive-weeks.mjs.\n` +
    `// Past weeks loads this file when he opens the week. Plain JSON after the equals sign.\n` +
    `(window.TU_PAST = window.TU_PAST || {})[${num}] = ${JSON.stringify(w, null, 2)};\n`);
  index.push({ num, dates: w.dates, title: w.title, reference: w.reference });
}
if (dry) process.exit(0);

index.sort((a, b) => weekStart(a.dates).localeCompare(weekStart(b.dates)));
fs.writeFileSync(indexFile,
  '// Treasure Up\'s past weeks: the weeks tools/archive-weeks.mjs moved out of\n' +
  '// content/weeks.js, oldest first. Each week is in content/past/week-<num>.js,\n' +
  '// which the app loads when Past weeks opens it. Written by that tool.\n' +
  'window.TU_PAST_INDEX = ' + JSON.stringify(index, null, 2) + ';\n');
const kept = weeks.filter(w => !moving.includes(w));
fs.writeFileSync(WEEKS, src.slice(0, cut) + MARK + JSON.stringify(kept, null, 2) + ';\n');
console.log(`weeks.js keeps ${kept.length} ${kept.length === 1 ? 'week' : 'weeks'} (${kept.map(w => w.dates).join(' · ')}); content/past/ has ${index.length}.`);
