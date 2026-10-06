#!/usr/bin/env node
// Brings the weeks written ahead into content/weeks.js as room allows (Blake,
// 2026-10-05: "lets get the rest of the year ... populated with as much
// content as we can"; he approves a week at a time). Developer mode reads and
// writes weeks.js through the GitHub API, which stops at 1 MB, so weeks
// written further ahead wait in content/upcoming/, one file a week
// (<start>.json, plain JSON, like "2026-11-16.json"), and come in oldest
// first while weeks.js stays under BUDGET. tools/archive-weeks.mjs makes the
// room, moving weeks that ended before last week to content/past/. Both
// sites' deploys run both and save the result back to the repo (the live one
// since 2026-10-05, when Blake had the rest of 2026 approved at once: "Get it
// all live"). On the test site a week that came in is a draft, like any other,
// until Blake approves it; the live deploy refuses a week that isn't approved.
// Developer mode publishes a week into the live weeks.js, so a week can be in
// weeks.js and still waiting here: the one in weeks.js is the one developer
// mode wrote, so it stays and the waiting copy goes. (To change a week that's
// in weeks.js, change it there, not here.)
//
//   node tools/upcoming-weeks.mjs             bring in what fits
//   node tools/upcoming-weeks.mjs --dry-run   say what would come in
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const WEEKS = path.join(ROOT, 'content', 'weeks.js'), UP = path.join(ROOT, 'content', 'upcoming');
const MARK = 'window.TU_WEEKS = ';
// Under the API's 1 MB, with room for a week to grow: Blake's approvals and
// edits, and its lesson part by part and family night (Blake, 2026-10-06),
// published from developer mode (about 10 KB a week).
const BUDGET = 900 * 1000;   // bytes
const dry = process.argv.includes('--dry-run');

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
function weekStart(dates) {
  const m = /^([A-Z][a-z]+) (\d{1,2})–(?:[A-Z][a-z]+ )?\d{1,2}, (\d{4})$/.exec(dates || '');
  if (!m || MONTHS.indexOf(m[1]) < 0) throw new Error(`Can't read the dates "${dates}"`);
  return m[3] + '-' + String(MONTHS.indexOf(m[1]) + 1).padStart(2, '0') + '-' + m[2].padStart(2, '0');
}

const files = fs.existsSync(UP) ? fs.readdirSync(UP).filter(f => /^\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort() : [];
if (!files.length) console.log('No weeks waiting in content/upcoming/.');

const src = fs.readFileSync(WEEKS, 'utf8'), cut = src.indexOf(MARK);
const weeks = JSON.parse(src.slice(cut + MARK.length).replace(/;\s*$/, ''));
const text = list => src.slice(0, cut) + MARK + JSON.stringify(list, null, 2) + ';\n';
const came = [], gone = [], waiting = [];
for (const f of files) {
  const week = JSON.parse(fs.readFileSync(path.join(UP, f), 'utf8'));
  if (weekStart(week.dates) + '.json' !== f) throw new Error(`content/upcoming/${f} holds ${week.dates}: name it ${weekStart(week.dates)}.json`);
  if (!weeks.some(w => w.dates === week.dates)) { waiting.push([f, week]); continue; }
  gone.push(f);
  console.log(`${dry ? 'Would drop' : 'Dropping'} content/upcoming/${f}: ${week.dates} is in weeks.js already (published from developer mode), and that copy stays.`);
}
// Room to grow: past BUDGET (a week grew once it was in), the weeks furthest
// ahead go back to waiting, the latest first, until it's under again. This
// week and next always stay. A week goes back exactly as weeks.js had it
// (approvals and all), and comes in again when there's room.
const sent = [];
{
  const keep = new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10);
  while (Buffer.byteLength(text(weeks)) > BUDGET) {
    const later = weeks.filter(w => weekStart(w.dates) > keep).sort((a, b) => weekStart(b.dates).localeCompare(weekStart(a.dates)));
    if (!later.length) break;
    const w = later[0];
    weeks.splice(weeks.indexOf(w), 1);
    sent.push(w);
    console.log(`${dry ? 'Would send' : 'Sending'} ${w.dates} back to content/upcoming/ to make room (weeks.js ${Math.round(Buffer.byteLength(text(weeks)) / 1000)} KB).`);
  }
}
for (const [f, week] of waiting) {
  const next = weeks.concat([week]).sort((a, b) => weekStart(a.dates).localeCompare(weekStart(b.dates)));
  const size = Buffer.byteLength(text(next));
  if (size > BUDGET) { console.log(`${week.dates} waits: weeks.js would be ${Math.round(size / 1000)} KB (at most ${BUDGET / 1000}).`); break; }   // in order: none skips ahead
  weeks.splice(0, weeks.length, ...next);
  came.push(f);
  console.log(`${dry ? 'Would bring in' : 'Bringing in'} ${week.dates} · ${week.title} (weeks.js ${Math.round(size / 1000)} KB)`);
}
if (dry) process.exit(0);
if (sent.length) fs.mkdirSync(UP, { recursive: true });
for (const w of sent) fs.writeFileSync(path.join(UP, weekStart(w.dates) + '.json'), JSON.stringify(w, null, 2) + '\n');
if (came.length || sent.length) fs.writeFileSync(WEEKS, text(weeks));
for (const f of came.concat(gone)) fs.unlinkSync(path.join(UP, f));
if (came.length) console.log(`weeks.js holds ${weeks.length} weeks; ${files.length - came.length - gone.length} still waiting in content/upcoming/.`);
