#!/usr/bin/env node
// Makes tools/rv1909.txt.gz and tools/tagalog1905.txt.gz, the Spanish and
// Tagalog Bibles for the reader's ES·TL button (Blake, 2026-10-03: "Using
// the Spanish and Tagalog bible sounds great where we can!"), each verse
// under the KJV verse it translates. Run once by hand; the files are kept in
// the repo like tools/bsb.txt.gz, so the words never change under us, and
// tools/build-reading.mjs builds the app's files from them at deploy.
//
//   node tools/verify.mjs          (once, to download the KJV and STEPBible data)
//   node tools/import-bibles.mjs
//
// Both from seven1m/open-bibles, pinned to one commit, which lists both as
// public domain:
//   - Santa Biblia, Reina-Valera 1909 (spa-rv1909.usfx.xml), the Spanish
//     Bible the Church's own Spanish edition (Reina-Valera 2009) is based on.
//   - Ang Dating Biblia, the Philippine Bible Society's 1905 Tagalog Bible
//     (tgl-tagalog.osis.xml), "This Bible is now Public Domain".
//
// The Tagalog numbers its verses as the KJV does, all 31,102 of them. The
// Spanish numbers a few chapters differently (Jonah 1:17 is its Jonás 2:1;
// Job 41:1 its Job 40:20), and the file squeezes those chapters into the
// KJV's count, running a verse or two together at their ends. So each
// Spanish verse is matched to its KJV verse by its words: the file tags each
// Spanish phrase with its Strong's number, and STEPBible's Hebrew and Greek
// (tools/original.mjs) has the Strong's numbers of every KJV verse. A verse
// stays where it's numbered when they agree; where they don't, it goes to
// the KJV verse its words are; two verses run together are split where the
// second one's words begin; and a KJV verse with no Spanish it can be sure
// of has none (the reader just shows the KJV there). It prints what it moved,
// split and left out.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { loadTestament } from './original.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const CACHE = process.env.SCRIPTURE_CACHE || path.join(ROOT, 'tools', '.scripture-cache');
export const OPEN_BIBLES_COMMIT = 'f257a3559025c3f873b48a75019f53a9354ed7de';   // seven1m/open-bibles, 2026-07-21
const BASE = `https://raw.githubusercontent.com/seven1m/open-bibles/${OPEN_BIBLES_COMMIT}/`;

async function download(name) {
  fs.mkdirSync(CACHE, { recursive: true });
  const file = path.join(CACHE, `open-bibles-${OPEN_BIBLES_COMMIT.slice(0, 7)}-${name}`);
  if (!fs.existsSync(file)) {
    const res = await fetch(BASE + name);
    if (!res.ok) throw new Error(`Could not download ${name}: HTTP ${res.status}`);
    fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  }
  return fs.readFileSync(file, 'utf8');
}

// The KJV, from the same pinned data as tools/verify.mjs: the books in order,
// and each chapter's verses.
const files = fs.existsSync(CACHE) ? fs.readdirSync(CACHE) : [];
const books = [], kjv = new Map();
for (const vol of ['old-testament', 'new-testament']) {
  const f = files.find(x => x.endsWith('-' + vol + '.json'));
  if (!f) throw new Error('Run node tools/verify.mjs once first, to download the scripture data');
  for (const b of JSON.parse(fs.readFileSync(path.join(CACHE, f), 'utf8')).books) {
    books.push(b.book);
    for (const c of b.chapters) kjv.set(b.book + ' ' + c.chapter, c.verses.map(v => v.text));
  }
}
const USFM = 'GEN EXO LEV NUM DEU JOS JDG RUT 1SA 2SA 1KI 2KI 1CH 2CH EZR NEH EST JOB PSA PRO ECC SNG ISA JER LAM EZK DAN HOS JOL AMO OBA JON MIC NAM HAB ZEP HAG ZEC MAL MAT MRK LUK JHN ACT ROM 1CO 2CO GAL EPH PHP COL 1TH 2TH 1TI 2TI TIT PHM HEB JAS 1PE 2PE 1JN 2JN 3JN JUD REV'.split(' ');
const OSIS = 'Gen Exod Lev Num Deut Josh Judg Ruth 1Sam 2Sam 1Kgs 2Kgs 1Chr 2Chr Ezra Neh Esth Job Ps Prov Eccl Song Isa Jer Lam Ezek Dan Hos Joel Amos Obad Jonah Mic Nah Hab Zeph Hag Zech Mal Matt Mark Luke John Acts Rom 1Cor 2Cor Gal Eph Phil Col 1Thess 2Thess 1Tim 2Tim Titus Phlm Heb Jas 1Pet 2Pet 1John 2John 3John Jude Rev'.split(' ');
if (books.length !== 66) throw new Error(`expected the 66 books of the Bible, found ${books.length}`);
const clean = s => s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

function write(file, head, text) {
  const lines = [...head, 'Verse\tText'];
  let n = 0;
  for (const [ch, verses] of kjv) verses.forEach((_, i) => { const t = (text.get(ch) || [])[i]; if (t) { lines.push(`${ch}:${i + 1}\t${t}`); n++; } });
  fs.writeFileSync(path.join(ROOT, 'tools', file), zlib.gzipSync(lines.join('\n') + '\n', { level: 9 }));
  return n;
}

// ── Tagalog: verse for verse already ────────────────────────────────────────
{
  const x = await download('tgl-tagalog.osis.xml');
  if (!/This Bible is now Public Domain/.test(x)) throw new Error('tgl-tagalog.osis.xml: its header no longer says it is public domain');
  const text = new Map();
  for (const m of x.matchAll(/<verse osisID='([^']+)'>([\s\S]*?)<\/verse>/g)) {
    const [b, c, v] = m[1].split('.'), book = books[OSIS.indexOf(b)];
    if (!book) throw new Error(`tgl-tagalog.osis.xml: unknown book ${b}`);
    const key = book + ' ' + c;
    if (!text.has(key)) text.set(key, []);
    text.get(key)[Number(v) - 1] = clean(m[2]);
  }
  const missing = [];
  for (const [ch, verses] of kjv) verses.forEach((_, i) => { if (!(text.get(ch) || [])[i]) missing.push(ch + ':' + (i + 1)); });
  for (const [ch, verses] of text) if (!kjv.has(ch) || verses.length > kjv.get(ch).length) throw new Error(`Tagalog: ${ch} has verses the KJV doesn't`);
  const n = write('tagalog1905.txt.gz', [
    'Ang Biblia (Ang Dating Biblia), Philippine Bible Society, 1905. Public domain ("This Bible is now Public Domain").',
    `From seven1m/open-bibles, tgl-tagalog.osis.xml, commit ${OPEN_BIBLES_COMMIT}, by tools/import-bibles.mjs. Its verses are the KJV's.`,
  ], text);
  console.log(`tools/tagalog1905.txt.gz: ${n} verses` + (missing.length ? `; none for ${missing.join(', ')}` : ', every verse of the KJV'));
}

// ── Spanish: matched to the KJV by its words ────────────────────────────────
const norm = s => s.replace(/^([HG])0*(\d+)[A-Za-z]?$/, '$1$2');            // H0430 -> H430, H6960A -> H6960
// A Spanish verse: its words, each with the Strong's numbers it translates
// (none for words the translators added), and where each starts in its text.
function cell(raw) {
  const toks = [];
  let text = '';
  for (const m of raw.replace(/<\/?add>/g, '').matchAll(/<w s="([^"]*)">([\s\S]*?)<\/w>|([^<]+)|<[^>]*>/g)) {
    const t = m[2] !== undefined ? m[2] : m[3];
    if (t === undefined) continue;
    const add = t.replace(/\s+/g, ' ');
    toks.push({ at: text.length, t: add, s: m[1] ? m[1].split(/[\s,]+/).filter(Boolean).map(norm) : [] });
    text += add;
  }
  return trim({ toks, text });
}
function trim(c) {
  const lead = c.text.length - c.text.trimStart().length;
  const text = c.text.trim().replace(/\s+/g, ' ');
  return { toks: c.toks.map(k => ({ ...k, at: Math.max(0, k.at - lead) })), text };
}
// The part of a verse from character `from` to `to`.
function slice(c, from, to = c.text.length) {
  const text = c.text.slice(from, to);
  return trim({ toks: c.toks.filter(k => k.at >= from && k.at < to).map(k => ({ ...k, at: k.at - from })), text });
}
const strongs = c => new Set(c.toks.flatMap(k => k.s));

// Each verse as the Spanish numbers it, in the file's order.
const usfx = await download('spa-rv1909.usfx.xml');
const spanish = [];                    // { book, c, v, cell }
{
  let book = null, c = null, cur = null, buf = '', last = 0, m;
  const flush = () => { if (cur) spanish.push({ book, c, v: cur, cell: cell(buf) }); cur = null; buf = ''; };
  const re = /<book id="(\w+)"|<c id="(\d+)" \/>|<v id="(\d+)" \/>|<ve \/>|<p sfm="mt">[\s\S]*?<\/p>|<h>[\s\S]*?<\/h>|<toc[^>]*>[\s\S]*?<\/toc>|<id [^>]*>[\s\S]*?<\/id>/g;
  while ((m = re.exec(usfx))) {
    if (cur) buf += usfx.slice(last, m.index);
    last = re.lastIndex;
    if (m[1]) { flush(); book = books[USFM.indexOf(m[1])]; if (!book) throw new Error(`spa-rv1909.usfx.xml: unknown book ${m[1]}`); }
    else if (m[2]) { flush(); c = Number(m[2]); }
    else if (m[3]) { flush(); cur = Number(m[3]); }
    else if (m[0] === '<ve />') flush();
  }
  flush();
}
// What the KJV leaves out of its verses, the Spanish leaves out too: a
// psalm's title (the KJV prints it above verse 1, the Spanish inside it,
// before the verse's first word in capitals: "Salmo de David… ¡OH Jehová"),
// Psalm 119's Hebrew letters ("ALEPH."), which the KJV prints as headings,
// and the line at the end of an epistle on where it was written ("Fué
// escrita de Corinto…"), which the KJV prints under the letter. And the
// first word of a chapter, printed in capitals ("JEHOVÁ es mi pastor"), is
// in ordinary letters, as the KJV's is.
const LETTER = /[A-ZÁÉÍÓÚÑÜ]/, NOT_LETTER = '(?![A-Za-zÁÉÍÓÚÑÜáéíóúñü])';
const EPISTLES = new Set(books.slice(books.indexOf('Romans'), books.indexOf('Hebrews') + 1));
const lastVerse = new Map();
for (const s of spanish) if (s.cell.text) lastVerse.set(s.book, s);
for (const s of spanish) {
  if (s.book === 'Psalms' && s.v === 1) {
    const m = new RegExp('^(.*?(?:Salmo|Músico|Masquil|Mictam|Cántico|Canción|Oración|Sigaión|Coré|Asaph|David|Salomón|Moisés|Hemán|Ethán|Jeduthún|graduaciones)[^]*?[.:;,!?])\\s+(?=[¡¿]?[A-ZÁÉÍÓÚÑ]{2,}' + NOT_LETTER + ')').exec(s.cell.text);
    if (m) s.cell = slice(s.cell, m[0].length);
  }
  const letter = s.book === 'Psalms' && s.c === 119 && s.v % 8 === 1 && /^[A-Z]+\.?\s+/.exec(s.cell.text);
  if (letter) s.cell = slice(s.cell, letter[0].length);
  if (s.v === 1 || letter || /^(?!JAH\b)[A-ZÁÉÍÓÚÑ]{3,} [a-záéíóúñ]/.test(s.cell.text)) {
    s.cell.text = s.cell.text.replace(new RegExp('^([¡¿]?(?:[A-Z] )?)(' + LETTER.source + ')(' + LETTER.source + '+)' + NOT_LETTER),
      (_, before, a, rest) => before + (/[A-Z] $/.test(before) ? a.toLowerCase() : a) + rest.toLowerCase());
  }
  if (EPISTLES.has(s.book) && lastVerse.get(s.book) === s) {
    const at = s.cell.text.lastIndexOf('Amén.');
    if (at >= 0 && /escrit|enviad|Epístola/i.test(s.cell.text.slice(at))) s.cell = slice(s.cell, 0, at + 'Amén.'.length);
  }
}

const orig = new Map([...await loadTestament(CACHE, 'he'), ...await loadTestament(CACHE, 'el')]);
const ORIG_NAME = { "Solomon's Song": 'Song of Solomon' };
const origSets = ch => {
  const [, b, c] = /^(.+) (\d+)$/.exec(ch), d = orig.get((ORIG_NAME[b] || b) + ' ' + c);
  return d ? d.v.map(ws => new Set((ws || []).map(w => norm(w[3] || '')).filter(Boolean))) : [];
};
// How much a Spanish verse and a KJV verse share: their Strong's numbers
// in common, out of both (1 the same words, 0 none).
const f1 = (a, b) => { if (!a || !b || !a.size || !b.size) return 0; let n = 0; for (const z of a) if (b.has(z)) n++; return 2 * n / (a.size + b.size); };

const text = new Map(), moved = [], split = [], left = [];
for (const book of books) {
  const K = [], S = spanish.filter(s => s.book === book && s.cell.text).map(s => ({ ...s, set: strongs(s.cell) }));
  for (let c = 1; kjv.has(book + ' ' + c); c++) {
    const sets = origSets(book + ' ' + c);
    kjv.get(book + ' ' + c).forEach((_, i) => K.push({ c, v: i + 1, set: sets[i] }));
  }
  // The best way through both lists in order: each KJV verse matched to one
  // Spanish verse or none, a verse kept where it's numbered when it can be.
  const n = K.length, m = S.length, GAP = 0.35;
  const same = (i, j) => K[i].c === S[j].c && K[i].v === S[j].v;
  const score = (i, j) => f1(K[i].set, S[j].set) - 0.3 + (same(i, j) ? 0.15 : 0);
  const D = Array.from({ length: n + 1 }, () => new Float64Array(m + 1)), P = Array.from({ length: n + 1 }, () => new Uint8Array(m + 1));
  for (let i = 1; i <= n; i++) { D[i][0] = -GAP * i; P[i][0] = 1; }
  for (let j = 1; j <= m; j++) { D[0][j] = -GAP * j; P[0][j] = 2; }
  for (let i = 1; i <= n; i++) for (let j = 1; j <= m; j++) {
    const a = D[i - 1][j - 1] + score(i - 1, j - 1), b = D[i - 1][j] - GAP, c = D[i][j - 1] - GAP;
    if (a >= b && a >= c) { D[i][j] = a; P[i][j] = 0; } else if (b >= c) { D[i][j] = b; P[i][j] = 1; } else { D[i][j] = c; P[i][j] = 2; }
  }
  const match = new Array(n).fill(-1);
  for (let i = n, j = m; i > 0 || j > 0;) {
    if (i > 0 && j > 0 && P[i][j] === 0) { match[--i] = --j; }
    else if (i > 0 && (j === 0 || P[i][j] === 1)) i--;
    else j--;
  }
  const out = K.map((k, i) => {
    const j = match[i];
    if (j < 0) return null;
    const sc = f1(k.set, S[j].set), noOrig = !k.set || !k.set.size;
    // Where it's numbered: unless its words are plainly another verse's.
    // Moved: only when its words are plainly this verse's.
    return (same(i, j) ? sc >= 0.2 || noOrig : sc >= 0.5) ? { cell: S[j].cell, from: S[j] } : null;
  });
  // Two verses run together: a KJV verse with none, next to one whose
  // Spanish is both. Split it where the second one's words begin (after a
  // stop or a comma), if both halves are plainly their verses.
  const cuts = c => c.toks.map(k => k.at).filter(at => at > 0 && /[.:;,!?]\s*$/.test(c.text.slice(0, at)));
  for (let i = 0; i < n; i++) {
    if (out[i] || !K[i].set || !K[i].set.size) continue;
    let best = null;
    for (const [a, b] of [[i - 1, i], [i, i + 1]]) {
      const whole = out[a === i ? b : a];
      if (a < 0 || b >= n || !whole || !K[a].set || !K[b].set) continue;
      for (const at of cuts(whole.cell)) {
        const x = slice(whole.cell, 0, at), y = slice(whole.cell, at), fx = f1(K[a].set, strongs(x)), fy = f1(K[b].set, strongs(y));
        if (fx >= 0.45 && fy >= 0.45 && (!best || fx + fy > best.score)) best = { a, b, x, y, score: fx + fy, from: whole.from };
      }
    }
    if (best) {
      out[best.a] = { cell: best.x, from: best.from };
      out[best.b] = { cell: best.y, from: best.from };
      split.push(`${book} ${K[best.a].c}:${K[best.a].v}–${K[best.b].c}:${K[best.b].v} (its ${best.from.c}:${best.from.v})`);
    }
  }
  K.forEach((k, i) => {
    const ch = book + ' ' + k.c, o = out[i], en = kjv.get(ch)[k.v - 1];
    if (!text.has(ch)) text.set(ch, []);
    // Still two verses in one, by its length: left out.
    if (o && o.cell.text.length > 1.9 * en.length + 25) { left.push(`${ch}:${k.v} (its ${o.from.c}:${o.from.v} is longer than one verse)`); return; }
    if (!o) { left.push(`${ch}:${k.v}`); return; }
    text.get(ch)[k.v - 1] = o.cell.text;
    if (o.from.c !== k.c || o.from.v !== k.v) moved.push(`${ch}:${k.v} ← its ${o.from.c}:${o.from.v}`);
  });
}
const n = write('rv1909.txt.gz', [
  'Santa Biblia, Reina-Valera 1909. Public domain.',
  `From seven1m/open-bibles, spa-rv1909.usfx.xml, commit ${OPEN_BIBLES_COMMIT}, by tools/import-bibles.mjs: each verse under the KJV verse it translates.`,
  'As the KJV\'s verses, without the psalms\' titles, Psalm 119\'s Hebrew letters or the epistles\' closing lines, and a chapter\'s first word not in capitals.',
], text);
const byChapter = list => [...new Set(list.map(x => x.replace(/:\d+\b.*$/, '')))].join(', ');
console.log(`tools/rv1909.txt.gz: ${n} of ${[...kjv.values()].reduce((a, v) => a + v.length, 0)} verses`);
console.log(`  numbered differently from the KJV (${moved.length}): ${byChapter(moved)}`);
console.log(`  two verses split apart (${split.length}): ${split.join('; ')}`);
console.log(`  left out (${left.length}): ${left.join(', ')}`);
