#!/usr/bin/env node
// Every script the site ships parses: each inline <script> in the pages
// (index.html, tv/, amigo/, liberty/) and every .js and .mjs file in the
// repo. index.html is over a megabyte and changes many times a day; one
// stray brace would ship a blank app with the deploy still green (review,
// 2026-10-07). Nothing here runs the code: it is only compiled.
//
//   node tools/check-parse.mjs
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const tracked = execFileSync('git', ['ls-files', '*.html', '*.js', '*.mjs'], { cwd: ROOT, encoding: 'utf8' }).split('\n').filter(Boolean);
const bad = [];
let n = 0;

// A classic script compiles as one; a module (import/export) checks with `node --check`.
function compile(code, name, module) {
  n++;
  if (module) {
    const tmp = path.join(fs.mkdtempSync(path.join(process.env.RUNNER_TEMP || '/tmp', 'parse-')), 'x.mjs');
    fs.writeFileSync(tmp, code);
    try { execFileSync(process.execPath, ['--check', tmp], { stdio: 'pipe' }); }
    catch (e) { bad.push(name + ': ' + String(e.stderr || e.message).split('\n').filter(l => /Error/.test(l))[0]); }
    return;
  }
  try { new vm.Script(code, { filename: name }); }
  catch (e) {
    const at = /:(\d+)/.exec(e.stack || '');
    bad.push(`${name}${at ? ':' + at[1] : ''}: ${e.message}`);
  }
}

for (const f of tracked) {
  const text = fs.readFileSync(path.join(ROOT, f), 'utf8');
  if (f.endsWith('.mjs')) { compile(text, f, true); continue; }
  if (f.endsWith('.js')) { compile(text, f, /^\s*(import|export)\s/m.test(text)); continue; }
  // Inline scripts, kept at their line in the page so an error points at it.
  const re = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(text))) {
    const attrs = m[1], type = (/\btype\s*=\s*["']?([^"'\s>]+)/i.exec(attrs) || [])[1] || '';
    if (/\bsrc\s*=/i.test(attrs) || !m[2].trim()) continue;
    if (type && !/^(text\/javascript|module)$/i.test(type)) continue;   // JSON, templates
    const line = text.slice(0, m.index + m[0].indexOf('>') + 1).split('\n').length;
    compile('\n'.repeat(line - 1) + m[2], f, type === 'module');
  }
}

if (bad.length) {
  for (const b of bad) console.log('::error::' + b);
  console.log(`${bad.length} of ${n} scripts don't parse.`);
  process.exit(1);
}
console.log(`All ${n} scripts parse.`);
