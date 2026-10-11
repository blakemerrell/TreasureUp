#!/usr/bin/env node
// Adds drafts to content/questions.js (Questions friends ask), checked first.
//
//   node tools/add-questions.mjs drafts.json [more.json …]     add or replace by id, then write the file
//   node tools/add-questions.mjs --check drafts.json            only check them; the file stays as it is
//
// Each file holds one question, a list of them, or { questions: [...] }, in
// the shape content/README.md describes. A draft whose id is in the file
// already replaces it (and needs approving again if its words changed); any `approved` a draft
// brings is dropped, since only developer mode approves. Nothing is written
// unless every question in the result keeps the rules in tools/questions.mjs.
// Then commit content/questions.js to the test site, where developer mode
// shows the drafts for review (see content/README.md).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkQuestions, qaHash, QA_MARK } from './questions.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const FILE = path.join(ROOT, 'content', 'questions.js');
const args = process.argv.slice(2), checkOnly = args.includes('--check'), inputs = args.filter(a => a !== '--check');
if (!inputs.length) { console.error('Usage: node tools/add-questions.mjs [--check] drafts.json [more.json …]'); process.exit(2); }

const text = fs.readFileSync(FILE, 'utf8'), at = text.indexOf(QA_MARK);
if (at < 0) { console.error(`content/questions.js has no "${QA_MARK}"`); process.exit(1); }
const head = text.slice(0, at), data = JSON.parse(text.slice(at + QA_MARK.length, text.lastIndexOf(';')));
const list = Array.isArray(data.questions) ? data.questions : (data.questions = []);

let added = 0, replaced = 0;
for (const f of inputs) {
  let v;
  try { v = JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { console.error(`${f}: not valid JSON (${e.message})`); process.exit(1); }
  const drafts = Array.isArray(v) ? v : Array.isArray(v && v.questions) ? v.questions : [v];
  for (const d of drafts) {
    const q = Object.assign({}, d);
    delete q.approved;
    const i = list.findIndex(x => x && x.id === q.id);
    if (i >= 0 && list[i].approved && list[i].approved === qaHash(q)) q.approved = list[i].approved;   // the same words: still approved
    if (i >= 0) { list[i] = q; replaced++; } else { list.push(q); added++; }
  }
}

const r = checkQuestions(data);
for (const n of r.notes) console.log('  · ' + n);
if (r.failures.length) {
  console.error(`✗ ${r.failures.length} problem${r.failures.length === 1 ? '' : 's'}${checkOnly ? '' : ', so content/questions.js wasn\'t changed'}:\n`);
  for (const x of r.failures) console.error('  - ' + x);
  process.exit(1);
}
if (checkOnly) { console.log(`✓ ${added + replaced} ${added + replaced === 1 ? 'draft keeps' : 'drafts keep'} the rules (nothing written)`); process.exit(0); }
fs.writeFileSync(FILE, head + QA_MARK + JSON.stringify(data, null, 2) + ';\n');
console.log(`✓ content/questions.js: ${added} added, ${replaced} replaced, ${list.length} in all (${r.approved} approved)`);
