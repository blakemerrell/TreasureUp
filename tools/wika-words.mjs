#!/usr/bin/env node
// Wika's Hebrew and Greek courses, made from the weeks' treasure words (Blake,
// 2026-10-06: "Change the name … to … wika", "Add the 2 other languages").
// Every week (content/weeks.js, content/past/*.js, content/upcoming/*.json)
// can have a `treasure` list of five to seven words from its chapters; this
// writes them as amigo/course-he.js (Hebrew: a Strong's number starting with
// H) and amigo/course-el.js (Greek: G), a unit a week in date order, titled
// with the week's reading and dates. engine.js makes the lessons
// (buildWords).
//
// Each word carries `approved: true` only when its fingerprint matches
// (approvalHash(withoutApproval(item)), the function in tools/verify.mjs, the
// same one developer mode uses). The live app shows only those, and a week
// only with enough of them (engine.js liveWords); the test site shows them
// all, marked. Both sites' deploys run this before recording the voices.
//
//   node tools/wika-words.mjs            write the two course files
//   node tools/wika-words.mjs --check    say whether they're up to date (exit 1 if not)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { weekStartOrThrow as weekStart } from './week-dates.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

// approvalHash and withoutApproval, taken from tools/verify.mjs itself so the
// two can never disagree (verify.mjs runs its checks when loaded, so it can't
// be imported).
export const { approvalHash, withoutApproval } = (() => {
  const src = fs.readFileSync(path.join(ROOT, 'tools', 'verify.mjs'), 'utf8');
  const from = src.indexOf('const canonJson ='), to = src.indexOf('\n', src.indexOf('const withoutApproval ='));
  if (from < 0 || to < from) throw new Error("tools/verify.mjs no longer has canonJson … withoutApproval where wika-words.mjs looks for them");
  return new Function(src.slice(from, to) + '\nreturn { approvalHash, withoutApproval };')();
})();
export const isApproved = x => !!x && !!x.approved && x.approved === approvalHash(withoutApproval(x));

// "September 28–October 4, 2026" -> "2026-09-28": the tools' one reader (tools/week-dates.mjs).
export { weekStartOrThrow as weekStart } from './week-dates.mjs';

// Every week the repo has. A week in more than one place (weeks.js and still
// waiting in upcoming/) counts once: weeks.js first, then past/, then upcoming/.
export function loadWeeks(root = ROOT) {
  const out = new Map(), add = w => { if (w && w.dates && !out.has(w.dates)) out.set(w.dates, w); };
  const read = f => fs.readFileSync(f, 'utf8');
  const weeksFile = path.join(root, 'content', 'weeks.js');
  if (fs.existsSync(weeksFile)) { const win = {}; new Function('window', read(weeksFile))(win); (win.TU_WEEKS || []).forEach(add); }
  const past = path.join(root, 'content', 'past');
  if (fs.existsSync(past)) {
    const win = {};
    for (const f of fs.readdirSync(past).filter(f => /^week-\d+\.js$/.test(f)).sort()) new Function('window', read(path.join(past, f)))(win);
    Object.values(win.TU_PAST || {}).forEach(add);
  }
  const up = path.join(root, 'content', 'upcoming');
  if (fs.existsSync(up)) for (const f of fs.readdirSync(up).filter(f => /^\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort()) add(JSON.parse(read(path.join(up, f))));
  return [...out.values()];
}

// The meaning the game's choices use: the item's own `short`, if it has one,
// else its gloss without the words that fit only its verse ("of the holy one
// of" → "holy one", "and your tent pegs" → "tent pegs", "will I ransom? them"
// → "ransom"); a gloss that leaves nothing ("-el") gives way to the KJV's word.
const LEAD = new Set('a an the our his her my your their its and like with into for by of to as so let us will shall i he she they we you have has had am about are is was it be been in on o'.split(' '));
const TRAIL = new Set('of you them me him her us it through'.split(' '));
export function meaningOf(x) {
  return meaning(x).replace(/'/g, '’');
}
function meaning(x) {
  if (x.short) return String(x.short).trim();
  const words = String(x.gloss || '').replace(/[?!.,;:]/g, ' ').split(/\s+/).filter(Boolean);
  while (words.length > 1 && LEAD.has(words[0].toLowerCase())) words.shift();
  while (words.length > 1 && TRAIL.has(words[words.length - 1].toLowerCase())) words.pop();
  const m = words.join(' ');
  return /^\p{L}{2}/u.test(m) ? m : String(x.kjv || x.gloss || '').trim();
}

// Which course a treasure word is in: its Strong's number, else its letters.
export const langOfItem = x => /^G/i.test(x.strong || '') ? 'el' : /^H/i.test(x.strong || '') ? 'he' : /[Ͱ-Ͽἀ-῿]/.test(x.word || '') ? 'el' : 'he';

const COURSE_INFO = {
  he: {
    id: 'he', lang: 'he', kind: 'words', dir: 'rtl', name: 'Hebrew', native: 'עִבְרִית', who: 'Treasure words · the Old Testament’s own',
    voices: ['he-IL', 'he', 'iw-IL', 'iw'], lessonNames: ['Hear', 'See', 'Pick'],
    praise: ['Tov me’od! Very good!', 'Yafeh! Nice!', 'Kol hakavod! Well done!'],
    done: 'Kol hakavod!', doneNote: '“Kol hakavod” is how you say “well done” in Hebrew today: “all the honor.”',
  },
  el: {
    id: 'el', lang: 'el', kind: 'words', dir: 'ltr', name: 'Greek', native: 'Ἑλληνικά', who: 'Treasure words · the New Testament’s own',
    voices: ['el-GR', 'el'], lessonNames: ['Hear', 'See', 'Pick'],
    praise: ['Bravo!', 'Kalá! Good!', 'Polý kalá! Very good!'],
    done: 'Bravo!', doneNote: '“Bravo” is what Greeks say today too.',
    empty: 'The Greek words come with next year’s New Testament. Learn the letters now, and you’ll be ready.',
  },
};

// The two courses, from the weeks. Each word keeps what the lessons show.
export function buildCourses(weeks) {
  const units = { he: [], el: [] };
  const sorted = weeks.filter(w => Array.isArray(w.treasure) && w.treasure.length).sort((a, b) => weekStart(a.dates).localeCompare(weekStart(b.dates)));
  for (const w of sorted) {
    const start = weekStart(w.dates);
    for (const cid of ['he', 'el']) {
      const items = w.treasure.filter(x => langOfItem(x) === cid);
      if (!items.length) continue;
      const words = items.map(x => {
        const o = { id: x.id, word: String(x.word).normalize('NFC'), say: x.say, gloss: meaningOf(x), kjv: x.kjv, means: x.means, ref: x.ref, strong: x.strong };
        if (x.more) o.more = x.more;
        o.approved = isApproved(x);
        return o;
      });
      // Two words with one meaning would make Match the pairs (and the choices) ambiguous: the KJV's word tells them apart.
      for (const o of words) if (words.some(p => p !== o && p.gloss === o.gloss)) o.gloss = `${o.gloss} (${o.kjv})`;
      units[cid].push({ id: 'w' + start, start, title: w.reference || w.title, sub: w.dates.replace(/, \d{4}$/, ''), dates: w.dates, blurb: w.title,
        done: COURSE_INFO[cid].done, doneNote: COURSE_INFO[cid].doneNote, approved: words.every(o => o.approved), words });
    }
  }
  const out = {};
  for (const cid of ['he', 'el']) {
    const info = Object.assign({}, COURSE_INFO[cid]);
    delete info.done; delete info.doneNote;
    out[cid] = Object.assign(info, { units: units[cid] });
  }
  return out;
}

// A course as its file: plain JSON in the same wrapper as the other courses.
export function courseFile(C) {
  const lang = C.id === 'he' ? 'Hebrew' : 'Greek';
  return `// Wika: ${lang}, the weeks' treasure words (${C.units.length} ${C.units.length === 1 ? 'week' : 'weeks'}, ${C.units.reduce((n, u) => n + u.words.length, 0)} words).\n` +
    `// Made by tools/wika-words.mjs from content/; don't edit it by hand: change the\n` +
    `// week's treasure words and run it again (both deploys run it). A word shows on\n` +
    `// the live app only once approved (approved: true here, its fingerprint matching).\n` +
    `(function (root) {\n  'use strict';\n  const COURSE = ${JSON.stringify(C, null, 2).replace(/\n/g, '\n  ')};\n\n` +
    `  if (typeof module !== 'undefined' && module.exports) module.exports = COURSE;\n  else (root.AMIGO_COURSES = root.AMIGO_COURSES || {}).${C.id} = COURSE;\n})(this);\n`;
}

export function run({ root = ROOT, check = false, log = console.log } = {}) {
  const courses = buildCourses(loadWeeks(root)), stale = [];
  for (const C of Object.values(courses)) {
    const file = path.join(root, 'amigo', `course-${C.id}.js`), text = courseFile(C);
    const now = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
    const words = C.units.reduce((n, u) => n + u.words.length, 0), ok = C.units.reduce((n, u) => n + u.words.filter(w => w.approved).length, 0);
    if (now === text) { log(`amigo/course-${C.id}.js: up to date (${C.units.length} weeks, ${ok} of ${words} words approved)`); continue; }
    stale.push(file);
    if (check) { log(`amigo/course-${C.id}.js: out of date; run node tools/wika-words.mjs`); continue; }
    fs.writeFileSync(file, text);
    log(`amigo/course-${C.id}.js: ${C.units.length} weeks, ${words} words (${ok} approved)`);
  }
  return { courses, stale };
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const { stale } = run({ check: process.argv.includes('--check') });
  if (process.argv.includes('--check') && stale.length) process.exit(1);
}
