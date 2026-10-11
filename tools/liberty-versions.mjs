#!/usr/bin/env node
// Title of Liberty's version numbers: run after changing any file the game asks for with ?v= on its address.
//
// The game's offline copy (liberty/sw.js) keeps a file with a version on its address for good, since a new version gets a
// new address: a device that has sim.js?v=30 never asks for sim.js?v=30 again. So a file changed without a new ?v= never
// reaches a device that has played before, and an old sim.js beside a new ui.js breaks the game ("W.cohortUnits is not a
// function", October 2026). This notes in liberty/versions.json which file (by its SHA-256) each address was published
// with, and refuses to note a changed file under an address it already had: give it a new ?v= and run this again.
// node tools/test-liberty.mjs fails if an address's file has changed or isn't noted yet.
//
//   node tools/liberty-versions.mjs      note the addresses as they are now (or name the ones to bump)
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const LIB = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'liberty');
export const MANIFEST = path.join(LIB, 'versions.json');
// An address in quotes in the game's pages and scripts: "ui.js?v=58", 'assets/temple.png?v=4'. Not one in a comment, and
// not a built one (`assets/${pic}.png?v=5`), which this can't follow.
const REF = /["'`]((?:\.\.\/)?[A-Za-z0-9_./-]+\.(?:js|css|png|jpg|webp|json|gif|mp4|svg|mp3|ogg|wav))\?v=(\d+)/g;
const sha = f => createHash('sha256').update(fs.readFileSync(f)).digest('hex');

// Every versioned address the game asks for, with its file as it is now. A PNG or JPG brings its WebP along: the game asks
// for the WebP at the same version (ui.js's webp()).
export function scan() {
  const now = {}, missing = [];
  for (const name of fs.readdirSync(LIB).filter(n => /\.(html|js)$/.test(n)).sort()) {
    for (const [, p, v] of fs.readFileSync(path.join(LIB, name), 'utf8').matchAll(REF)) {
      const file = path.join(LIB, p);
      if (!fs.existsSync(file)) { missing.push(`${p}?v=${v} (in ${name})`); continue; }
      now[`${p}?v=${v}`] = sha(file);
      const webp = file.replace(/\.(png|jpg)$/, '.webp');
      if (webp !== file && fs.existsSync(webp)) now[`${p.replace(/\.(png|jpg)$/, '.webp')}?v=${v}`] = sha(webp);
    }
  }
  return { now, missing: [...new Set(missing)] };
}

// What the noted addresses say about the files now: changed (same address, different file: needs a new ?v=) and unnoted.
export function check() {
  let noted = {};
  try { noted = JSON.parse(fs.readFileSync(MANIFEST, 'utf8')); } catch (e) { if (e.code !== 'ENOENT') throw e; }
  const { now, missing } = scan();
  const changed = Object.keys(now).filter(k => noted[k] && noted[k] !== now[k]);
  const unnoted = Object.keys(now).filter(k => !noted[k]);
  return { now, noted, missing, changed, unnoted };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { now, missing, changed, unnoted } = check();
  if (missing.length) console.log(`Asked for but not there: ${missing.join(', ')}`);
  if (changed.length) {
    console.log(`Changed without a new version, so a device that has played keeps the old one. Give each a new ?v= and run this again:\n  ${changed.join('\n  ')}`);
    process.exit(1);
  }
  fs.writeFileSync(MANIFEST, JSON.stringify(now, Object.keys(now).sort(), 1) + '\n');
  console.log(`${Object.keys(now).length} addresses noted${unnoted.length ? ', ' + unnoted.length + ' of them new' : ''}.`);
}
