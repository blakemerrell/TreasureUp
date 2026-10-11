#!/usr/bin/env node
// Makes tools/jsp-bom-pages.json, the table behind the reader's Joseph Smith
// Papers button (Blake, 2026-10-10): for each of today's Book of Mormon
// chapters, where it is in the 1830 first edition, the printer's manuscript
// and what survives of the original manuscript, as their pages on
// josephsmithpapers.org. Run by hand, once (never at deploy); the table is
// kept in the repo and build-reading.mjs copies it to content/jsp-bom.js.
//
//   node tools/jsp-bom-pages.mjs [--mit <folder of page-NNN.md>]
//
// The app only links to the Papers' pages: their transcripts, images and
// notes are © Intellectual Reserve and may not be copied (the Church's terms
// of use), so this keeps page numbers, which are facts, and nothing else.
//
//   - 1830 edition: each chapter's first and last printed page, found by
//     looking for its verses' 1830 wording (OpenScripture's 1830 column) in
//     J. Max Wilson's page-by-page transcription of the 1830 edition (MIT;
//     github.com/lds-restoration-documents/1830-grandin-palmyra-book-of-mormon,
//     pinned below), whose PDF page N is printed page N − 4. The Papers show
//     printed page P as image P + 6 (checked against their gallery's labels),
//     and their table of contents' page for each 1830 chapter is checked too.
//   - Printer's manuscript: the Papers' table of contents gives the page each
//     1830 chapter starts on (image = page + 4). Today's chapters inside a long
//     1830 one are placed by how far into it they start, in words: "around".
//   - Original manuscript: only about a quarter survives. Each part in the
//     Papers' table of contents names its verses; a chapter links to the parts
//     with its verses, and, inside a part that runs over several chapters, to
//     the page about as far into it as the chapter is ("around").
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEditions, BOM_BOOKS, COLUMNS } from './editions.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const CACHE = process.env.SCRIPTURE_CACHE || path.join(ROOT, 'tools', '.scripture-cache');
const MIT_COMMIT = '3cbbfba74f6aae913209662da214be44d826bd53';   // 2026-10-08
const MIT_BASE = `https://raw.githubusercontent.com/lds-restoration-documents/1830-grandin-palmyra-book-of-mormon/${MIT_COMMIT}/book-of-mormon-1830-pages/`;
const JSP = 'https://www.josephsmithpapers.org/paper-summary/';
export const DOCS = {
  e1830: 'book-of-mormon-1830',
  pm: 'printers-manuscript-of-the-book-of-mormon-circa-august-1829-circa-january-1830',
  om: 'original-manuscript-of-the-book-of-mormon-circa-12-april-1828-circa-1-july-1829',
};
const arg = (name) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : null; };

// A Papers document's gallery (image -> page label) and table of contents, from its page's __NEXT_DATA__.
async function jspDoc(slug) {
  const res = await fetch(JSP + slug + '/1', { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!res.ok) throw new Error(`${slug}: HTTP ${res.status}`);
  const m = /<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/s.exec(await res.text());
  if (!m) throw new Error(`${slug}: no __NEXT_DATA__`);
  const p = JSON.parse(m[1]).props.pageProps;
  return { gallery: p.gallery.map(g => ({ seq: Number(g.page), label: g.label })), toc: p.tableOfContents.map(t => ({ seq: t.intPageNumber, title: t.pageTitle, page: t.editorialPageNumber })) };
}

// "1 Nephi 10–13:35" -> { book, c1, v1, c2, v2 } (v2 null: to the chapter's end).
function range(s) {
  const m = /^(.+?) (\d+)(?::(\d+))?(?:–(\d+)(?::(\d+))?)?$/.exec(s.trim());
  if (!m) return null;
  const [, book, c, v, x, y] = m;
  if (v && x && !y) return { book, c1: +c, v1: +v, c2: +c, v2: +x };        // 14:11–16
  return { book, c1: +c, v1: v ? +v : 1, c2: x ? +x : +c, v2: y ? +y : (v && !x ? +v : null) };
}
const rangeOf = title => { const m = /\[([^\]]+)\]\s*$/.exec(title); return m ? range(m[1]) : null; };

// Every verse in order, with where its words start in the 1830 text (OpenScripture's 1830 column).
const editions = await loadEditions(CACHE);
const E1830 = COLUMNS.indexOf('1830');
const words = s => s.toLowerCase().replace(/[’']/g, '').match(/[a-z]+/g) || [];
const order = [], at = new Map();          // "1 Nephi 1:1" -> index in order
const stream = [];                          // the 1830 words, verse after verse
const chapters = [];                        // ["1 Nephi 1", verse count]
for (const book of BOM_BOOKS) for (let c = 1; editions.has(book + ' ' + c); c++) {
  const vs = editions.get(book + ' ' + c);
  chapters.push([book + ' ' + c, vs.length]);
  vs.forEach((rows, i) => {
    const ref = `${book} ${c}:${i + 1}`;
    at.set(ref, order.length);
    order.push({ ref, start: stream.length });
    stream.push(...words(rows.map(r => r[E1830]).join('')));
  });
}
const wordAt = ref => { const i = at.get(ref); return i == null ? null : order[i].start; };
const lastVerse = (book, c) => (chapters.find(x => x[0] === book + ' ' + c) || [0, 0])[1];
const refStart = r => `${r.book} ${r.c1}:${r.v1}`;
const refEnd = r => `${r.book} ${r.c2}:${r.v2 || lastVerse(r.book, r.c2)}`;

// ---- 1830 edition: each verse's printed page ----
const mitDir = arg('--mit');
const pageText = [];   // [printed page, text]
for (let pdf = 9; pdf <= 593; pdf++) {
  const name = `page-${String(pdf).padStart(3, '0')}.md`;
  let t;
  if (mitDir) t = fs.readFileSync(path.join(mitDir, name), 'utf8');
  else { const res = await fetch(MIT_BASE + name); if (!res.ok) throw new Error(`${name}: HTTP ${res.status}`); t = await res.text(); }
  t = t.replace(/<!--[\s\S]*?-->/g, ' ').split('\n').filter(l => !/^\*\*Header/.test(l)).join('\n');
  pageText.push([pdf - 4, t]);
}
const mit = [], mitPage = [];
pageText.forEach(([page, t], k) => {
  const ws = words(t);
  // A word broken at the foot of a page ("vis-" / "ions") is on the page it starts on.
  if (k && /-\s*$/.test(pageText[k - 1][1]) && ws.length && mit.length) mit[mit.length - 1] += ws.shift();
  for (const w of ws) { mit.push(w); mitPage.push(page); }
});
// Each verse found in the transcription, in order: its first six words (or six a little later in it).
const N = 6, found = new Array(order.length).fill(null);
let p = 0;
const gramAt = new Map();
for (let i = 0; i + N <= mit.length; i++) { const k = mit.slice(i, i + N).join(' '); if (!gramAt.has(k)) gramAt.set(k, []); gramAt.get(k).push(i); }
for (let i = 0; i < order.length; i++) {
  const s = order[i].start, end = i + 1 < order.length ? order[i + 1].start : stream.length;
  for (let off = 0; off + N <= end - s && off < 12; off++) {
    const hits = (gramAt.get(stream.slice(s + off, s + off + N).join(' ')) || []).filter(x => x - off >= p && x - off < p + 4000);
    if (hits.length) { found[i] = hits[0] - off; p = found[i]; break; }
  }
}
let missing = 0;
const pageOfVerse = i => {
  if (found[i] != null) return { page: mitPage[found[i]], exact: true };
  missing++;
  let a = i, b = i;
  while (a > 0 && found[a] == null) a--;
  while (b < order.length - 1 && found[b] == null) b++;
  const fa = found[a] ?? 0, fb = found[b] ?? mit.length - 1;
  const f = (order[i].start - order[a].start) / Math.max(1, order[b].start - order[a].start);
  return { page: mitPage[Math.round(fa + f * (fb - fa))], exact: false };
};
const verseEndPage = i => {                        // the page its last word is on
  const next = i + 1 < order.length && found[i + 1] != null ? found[i + 1] - 1 : null;
  return next != null ? mitPage[Math.max(0, next)] : pageOfVerse(i).page;
};

const [e1830, pm, om] = [await jspDoc(DOCS.e1830), await jspDoc(DOCS.pm), await jspDoc(DOCS.om)];
const labelOf = (doc, seq) => ((doc.gallery.find(g => g.seq === seq) || {}).label || '').replace(/[[\]]/g, '');
const problems = [];
// The rules the app's links use: 1830 image = printed page + 6, printer's manuscript image = page + 4.
for (const g of e1830.gallery) if (/^\[?\d+\]?$/.test(g.label) && +labelOf(e1830, g.seq) > 0 && g.seq !== +labelOf(e1830, g.seq) + 6) problems.push(`1830 image ${g.seq} is labelled ${g.label}`);
for (const g of pm.gallery) if (/^\d+$/.test(g.label) && g.seq !== +g.label + 4) problems.push(`Printer's manuscript image ${g.seq} is labelled ${g.label}`);
// Each 1830 chapter starts on the page the Papers' table of contents says.
for (const t of e1830.toc) {
  const r = rangeOf(t.title), i = r && at.get(refStart(r));
  if (i == null) continue;
  const mine = pageOfVerse(i).page;
  if (String(mine) !== String(t.page).replace(/[[\]]/g, '')) problems.push(`${t.title}: the Papers say p. ${t.page}, the transcription p. ${mine}`);
}

// Printer's manuscript and original manuscript: their parts in order, each from its verse to the next part's.
function parts(doc) {
  const list = doc.toc.map(t => ({ t, r: rangeOf(t.title) })).filter(x => x.r && at.has(refStart(x.r)));
  return list.map((x, k) => ({ ...x, from: at.get(refStart(x.r)), to: at.get(refEnd(x.r)) ?? at.get(refStart(x.r)), seq: x.t.seq,
    nextSeq: k + 1 < list.length ? list[k + 1].t.seq : Math.max(...doc.gallery.map(g => g.seq)) }));
}
const pmParts = parts(pm), omParts = parts(om);
// A part's last page: the one before the next part's (near enough for "around").
const lastSeqOf = x => x.nextSeq > x.seq ? x.nextSeq - 1 : x.seq;
// How far into a part a verse is, as a page: its first page, or about as far in as the verse is in words.
function pageIn(part, i, lastSeq) {
  if (i === part.from) return { seq: part.seq, exact: true };
  const span = (part.to + 1 < order.length ? order[part.to + 1].start : stream.length) - order[part.from].start;
  const f = (order[i].start - order[part.from].start) / Math.max(1, span);
  return { seq: Math.min(lastSeq, part.seq + Math.round(f * (lastSeq - part.seq))), exact: false };
}

const out = {};
for (const [ch, n] of chapters) {
  const [, book, c] = /^(.+) (\d+)$/.exec(ch), first = at.get(`${ch}:1`), last = at.get(`${ch}:${n}`);
  const e = pageOfVerse(first), endPage = verseEndPage(last);
  const row = { e: [e.page, Math.max(e.page, endPage), e.exact ? 1 : 0] };
  // The printer's manuscript part (1830 chapter) it starts in.
  const pp = pmParts.filter(x => x.from <= first).pop();
  if (pp) {
    const where = pageIn(pp, first, lastSeqOf(pp));
    row.p = [where.seq - 4, where.exact ? 1 : 0];
  }
  // Each part of the original manuscript with any of its verses.
  const os = omParts.filter(x => x.from <= last && x.to >= first).map(x => {
    const where = x.from >= first ? { seq: x.seq, exact: true } : pageIn(x, first, lastSeqOf(x));
    const a = Math.max(first, x.from), b = Math.min(last, x.to);
    const v = r => order[r].ref.replace(/^.+ \d+:/, '');
    const verses = a === first && b === last ? '' : v(a) + (b > a ? '–' + v(b) : '');
    return [where.seq, labelOf(om, where.seq), verses, where.exact ? 1 : 0];
  });
  if (os.length) row.o = os.filter((x, k) => os.findIndex(y => y[0] === x[0]) === k);
  out[ch] = row;
}

const file = path.join(ROOT, 'tools', 'jsp-bom-pages.json');
fs.writeFileSync(file, JSON.stringify({
  about: 'Where each Book of Mormon chapter is on josephsmithpapers.org: made by tools/jsp-bom-pages.mjs; page numbers only (links, never their text or images). '
    + 'e: [first, last printed page of the 1830 edition, 1 if found word for word]; p: [printer\'s manuscript page, 1 if exact (else "around")]; '
    + 'o: original manuscript parts: [image, page, verses ("" for the whole chapter), 1 if exact (else "around")].',
  docs: Object.fromEntries(Object.entries(DOCS).map(([k, v]) => [k, JSP + v + '/'])),
  chapters: out,
}, null, 0).replace(/,"(\d? ?[A-Z][^"]* \d+)":/g, ',\n"$1":') + '\n');
console.log(`tools/jsp-bom-pages.json: ${Object.keys(out).length} chapters; ${Object.values(out).filter(x => x.o).length} with part of the original manuscript; ${missing} verse starts placed by estimate`);
for (const x of problems) console.log('⚠', x);
