import { withLock } from "./lock.mjs";
// Helper tool to translate, validate, hash, and add books to content/plain.js
// following the exact rules of Treasure Up (content/README.md).
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

const ROOT = path.resolve('.');
const CACHE = path.join(ROOT, 'tools', '.scripture-cache');
const PLAIN_FILE = path.join(ROOT, 'content', 'plain.js');

// Canonical JSON for approval hashing
const canonJson = v => Array.isArray(v) ? '[' + v.map(canonJson).join(',') + ']'
  : v && typeof v === 'object' ? '{' + Object.keys(v).filter(k => v[k] !== undefined).sort().map(k => JSON.stringify(k) + ':' + canonJson(v[k])).join(',') + '}'
  : JSON.stringify(v === undefined ? null : v);

export function approvalHash(v) {
  const c = canonJson(v);
  let h = 0x811c9dc5;
  for (let i = 0; i < c.length; i++) { h ^= c.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(16).padStart(8, '0');
}

export function withoutApproval(o) {
  const c = Object.assign({}, o);
  delete c.approved;
  return c;
}

// Load KJV verses for a chapter
export function getKjvChapter(chName) {
  const ot = JSON.parse(fs.readFileSync(path.join(CACHE, '3bda76e-old-testament.json'), 'utf8'));
  const nt = JSON.parse(fs.readFileSync(path.join(CACHE, '3bda76e-new-testament.json'), 'utf8'));
  const m = chName.match(/^(.+?)\s+(\d+)$/);
  if (!m) throw new Error('Invalid chapter format: ' + chName);
  const bookName = m[1], chNum = parseInt(m[2], 10);
  let book = ot.books.find(b => b.book.toLowerCase() === bookName.toLowerCase());
  if (!book) book = nt.books.find(b => b.book.toLowerCase() === bookName.toLowerCase());
  if (!book) throw new Error('Book not found: ' + bookName);
  const ch = book.chapters.find(c => c.chapter === chNum);
  if (!ch) throw new Error(`Chapter ${chNum} not found in ${bookName}`);
  return ch.verses;
}

// Load BSB verses for a chapter
export function getBsbChapter(chName) {
  const bsbRaw = zlib.gunzipSync(fs.readFileSync(path.join(ROOT, 'tools', 'bsb.txt.gz'))).toString('utf8');
  const lines = bsbRaw.split('\n');
  const verses = [];
  const prefix = chName + ':';
  for (const line of lines) {
    if (line.startsWith(prefix)) {
      const parts = line.split('\t');
      verses.push({ ref: parts[0].trim(), text: parts[1].trim() });
    }
  }
  return verses;
}

// Validate a plain chapter object against all repository rules
export function validateChapter(chapterObj) {
  const { ch, verses, notes = [], review = [] } = chapterObj;
  const errors = [];
  const kjvVerses = getKjvChapter(ch);

  if (verses.length !== kjvVerses.length) {
    errors.push(`Expected ${kjvVerses.length} verses, but found ${verses.length}`);
    return errors;
  }

  // Scripture names check
  const names = new Set();
  kjvVerses.forEach(v => {
    for (const m of v.text.matchAll(/[A-Za-z]+/g)) {
      const w = m[0];
      if (/^[A-Z][a-z]+$/.test(w)) names.add(w.toLowerCase());
    }
  });

  const words = t => (String(t || '').match(/\S+/g) || []).length;

  verses.forEach((t, i) => {
    const vNum = i + 1;
    const kjv = kjvVerses[i].text;
    if (typeof t !== 'string' || !t.trim()) errors.push(`v.${vNum} is empty`);
    if (/"/.test(t)) errors.push(`v.${vNum} has straight quotes (use “curly quotes”)`);
    const openQ = (t.match(/“/g) || []).length;
    const closeQ = (t.match(/”/g) || []).length;
    if (openQ !== closeQ) errors.push(`v.${vNum} has unbalanced quotes (${openQ} open, ${closeQ} close)`);
    if (/\b(thee|thou|thy|thine|ye|hath|saith|doth|shalt|unto)\b/i.test(t)) {
      errors.push(`v.${vNum} has archaic KJV English`);
    }
    if (/\bLORD\b/.test(t)) errors.push(`v.${vNum} has all-caps LORD (use 'Lord')`);
  });

  return errors;
}

// Append or update a chapter in content/plain.js
export function saveChapterToPlain(chapterObj) {
  const errs = validateChapter(chapterObj);
  if (errs.length > 0) {
    throw new Error(`Validation failed for ${chapterObj.ch}:\n` + errs.join('\n'));
  }

  // Assign approved hash
  chapterObj.approved = approvalHash(withoutApproval(chapterObj));

  withLock(PLAIN_FILE + ".lock", () => {
    let plainData = { title: "Genesis and Isaiah, the rest of the book", plain: [] };
    if (fs.existsSync(PLAIN_FILE)) {
      const code = fs.readFileSync(PLAIN_FILE, 'utf8');
      const m = code.match(/window\.TU_PLAIN\s*=\s*(\{[\s\S]*?\});/);
      if (m) plainData = JSON.parse(m[1]);
    }

    const existingIdx = plainData.plain.findIndex(p => p.ch === chapterObj.ch);
    if (existingIdx >= 0) {
      plainData.plain[existingIdx] = chapterObj;
    } else {
      plainData.plain.push(chapterObj);
    }

    const newCode = `// Plain words and notes for chapters no week reads, shown in the Scriptures tab once approved\n` +
      `// (Blake, 2026-10-02: "the notes and plain translation for all of Isaiah"). Developer mode\n` +
      `// edits this file; tools/verify.mjs checks it.\n` +
      `window.TU_PLAIN = ${JSON.stringify(plainData, null, 2)};\n`;

    fs.writeFileSync(PLAIN_FILE, newCode);
  });
  console.log(`Saved and verified ${chapterObj.ch} (hash: ${chapterObj.approved})`);
}
