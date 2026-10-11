#!/usr/bin/env node
// The family's first names stay out of the public code (2026-10-11: "my family
// names can come out of the public code"). The names to look for are never in
// the repo: they come from the NAMES_PATTERN secret (repo Settings › Secrets
// and variables › Actions), a regex such as "Name1|Name2". Without it this
// says so and passes, so a fork's pull request isn't held up.
//
// A hit prints only the file and line, never the text, because the Actions
// log of a public repo is public too. A line that is the Bible's (Genesis 10,
// Ezekiel 27, the Hebrew for Greece…) is allowed: a name there is scripture.
//
//   NAMES_PATTERN='Name1|Name2' node tools/check-names.mjs
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const pattern = (process.env.NAMES_PATTERN || '').trim();
if (!pattern) {
  console.log('Names check skipped: no NAMES_PATTERN secret here (forks and local runs).');
  process.exit(0);
}
let names;
try { names = new RegExp(`\\b(?:${pattern})\\b`, 'i'); }
catch (e) { console.error('NAMES_PATTERN is not a valid regex: ' + e.message); process.exit(1); }
// Scripture's own uses of a name (a Bible place or person, not a family member).
const BIBLE = /Genesis 10|Ezekiel 27|Isaiah 66|1 Chronicles 1|Joel 3:6|Zechariah 9|Daniel (8|10|11)|Gomer|Tubal|Meshech|Elishah|Tarshish|Uzal|Greece|Grecians|יָוָן|Noah|ya-VAHN|Bible name/i;

const files = execFileSync('git', ['ls-files', '-z'], { cwd: ROOT, encoding: 'utf8' }).split('\0')
  .filter(f => f && !f.startsWith('vendor/') && !/\.(png|jpe?g|gif|webp|mp3|m4a|ogg|wav|woff2?|ttf|ico|pdf|zip)$/i.test(f));
const hits = [];
for (const f of files) {
  let text;
  try { text = fs.readFileSync(path.join(ROOT, f), 'utf8'); } catch { continue; }
  if (text.includes('\0')) continue;   // binary
  // A verse in content/ (a bare quoted string in a chapter's list of verses) is scripture's text.
  const verse = line => f.startsWith('content/') && /^\s*"[^"]*",?\s*$/.test(line);
  text.split('\n').forEach((line, i) => { if (names.test(line) && !BIBLE.test(line) && !verse(line)) hits.push(`${f}:${i + 1}`); });
}
if (hits.length) {
  console.error(`A family name is in ${hits.length} line${hits.length > 1 ? 's' : ''} (the text isn't printed, the log is public):`);
  for (const h of hits.slice(0, 50)) console.error('  ' + h);
  if (hits.length > 50) console.error(`  … and ${hits.length - 50} more`);
  console.error('Use "the owner", "a parent", "Mom", "Dad" or "the kids" instead (README, Family names).');
  process.exit(1);
}
console.log(`No family names in ${files.length} files.`);
