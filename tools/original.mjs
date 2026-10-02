// The Hebrew and Greek behind the Bible chapters, word by word, for the
// reader's Hebrew and Greek button: STEPBible.org's data, made from work at
// Tyndale House Cambridge (CC BY 4.0, credited in the app). TAHOT is the Old
// Testament as Bible translators read it (the Qere, as the KJV followed);
// TAGNT the New, of which this keeps the Greek the KJV translated (Scrivener
// 1894, a word marked K or k). Each word with how it sounds and what it
// means in that verse, numbered by the KJV's verses: where the Hebrew
// numbers a verse differently the data says so and follows the KJV
// (Isaiah 9:1 is Hebrew 8:23). Pinned to one commit, so the words never change
// under us, and downloaded once into the scripture cache. tools/verify.mjs
// checks every chapter of the reading has every KJV verse; build-reading.mjs
// writes content/original/<chapter>.js for the app.
import fs from 'node:fs';
import path from 'node:path';

export const ORIG_COMMIT = 'b99716b0cddb648ddb95cc786a197180f2f97d48';   // STEPBible-Data, 2026-09-18
const BASE = `https://raw.githubusercontent.com/STEPBible/STEPBible-Data/${ORIG_COMMIT}/Translators%20Amalgamated%20OT%2BNT/`;

const OT = ['Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy', 'Joshua', 'Judges', 'Ruth', '1 Samuel', '2 Samuel',
  '1 Kings', '2 Kings', '1 Chronicles', '2 Chronicles', 'Ezra', 'Nehemiah', 'Esther', 'Job', 'Psalms', 'Proverbs', 'Ecclesiastes',
  'Song of Solomon', 'Isaiah', 'Jeremiah', 'Lamentations', 'Ezekiel', 'Daniel', 'Hosea', 'Joel', 'Amos', 'Obadiah', 'Jonah', 'Micah',
  'Nahum', 'Habakkuk', 'Zephaniah', 'Haggai', 'Zechariah', 'Malachi'];
const NT = ['Matthew', 'Mark', 'Luke', 'John', 'Acts', 'Romans', '1 Corinthians', '2 Corinthians', 'Galatians', 'Ephesians',
  'Philippians', 'Colossians', '1 Thessalonians', '2 Thessalonians', '1 Timothy', '2 Timothy', 'Titus', 'Philemon', 'Hebrews',
  'James', '1 Peter', '2 Peter', '1 John', '2 John', '3 John', 'Jude', 'Revelation'];
// Each file, and its books in order (its book codes are matched to these by the order they come in).
const FILES = [
  ['he', 'TAHOT Gen-Deu - Translators Amalgamated Hebrew OT - STEPBible.org CC BY.txt', OT.slice(0, 5)],
  ['he', 'TAHOT Jos-Est - Translators Amalgamated Hebrew OT - STEPBible.org CC BY.txt', OT.slice(5, 17)],
  ['he', 'TAHOT Job-Sng - Translators Amalgamated Hebrew OT - STEPBible.org CC BY.txt', OT.slice(17, 22)],
  ['he', 'TAHOT Isa-Mal - Translators Amalgamated Hebrew OT - STEPBible.org CC BY.txt', OT.slice(22)],
  ['el', 'TAGNT Mat-Jhn - Translators Amalgamated Greek NT - STEPBible.org CC-BY.txt', NT.slice(0, 4)],
  ['el', 'TAGNT Act-Rev - Translators Amalgamated Greek NT - STEPBible.org CC-BY.txt', NT.slice(4)],
];
// Names the lessons use that the books here spell another way.
const ALIAS = { 'Psalm': 'Psalms', "Solomon's Song": 'Song of Solomon', 'Solomon’s Song': 'Song of Solomon' };
const split = ch => { const m = /^(.+) (\d+)$/.exec(ch || ''); return m ? { book: ALIAS[m[1]] || m[1], c: Number(m[2]) } : null; };
// 'he' for an Old Testament chapter, 'el' for a New, null for the rest.
export const langOf = ch => { const s = split(ch); return !s ? null : OT.includes(s.book) ? 'he' : NT.includes(s.book) ? 'el' : null; };

// A word as shown: the Hebrew with its vowels but not its chanting marks, and
// the parts the data splits a word into (from/ east) put back together.
// The scribes' paragraph marks (פ, ס) after a verse's last word aren't words; and God's
// name as the KJV and the Church's materials give it: "the LORD", not "Yahweh".
const hebrew = s => s.replace(/[\/\\]/g, '').replace(/[֑-ֽ֯׀׃׆]/g, '').replace(/\s+[פס]$/, '').trim();
const meaning = s => s.replace(/<[^>]*>/g, '').replace(/[[\]{}]/g, '').replace(/\//g, ' ').replace(/\s+/g, ' ').trim()
  .replace(/\bO Yahweh\b/g, 'O LORD').replace(/\bYahweh\b/g, 'the LORD');
// A noun's "my", "your", "his"… comes after it in Hebrew (people/ my, the
// data's grammar marking the noun N and the ending Sp); in English, before it:
// my people. So does Aramaic's "the" (king/ the, an ending Ta): the king.
const POSS = new Set(['my', 'your', 'his', 'her', 'its', 'our', 'their']);
function inOrder(gloss, grammar) {
  const parts = gloss.split('/'), g = grammar.split('/'), last = (parts[parts.length - 1] || '').trim().toLowerCase();
  if (parts.length < 2 || parts.length !== g.length || !/^[HA]?N/.test(g[g.length - 2])) return gloss;
  if (!((POSS.has(last) && /^Sp/.test(g[g.length - 1])) || (last === 'the' && /^Ta/.test(g[g.length - 1])))) return gloss;
  parts.splice(parts.length - 2, 0, ' ' + parts.pop().trim());
  return parts.join('/');
}

// One file's chapters: "Isaiah 41" -> { lang, v: [[[word, sound, meaning], …] (verse 1), …], ar: [verses in Aramaic] }.
function parse(lang, text, books) {
  const out = new Map(), codes = [], arCount = new Map();
  const re = lang === 'he'
    ? /^([0-9A-Z][a-z0-9]{1,2})\.(\d+)\.(\d+)(?:\([^)]*\))?#\d+=\S+\t([^\t]*)\t([^\t]*)\t([^\t]*)\t[^\t]*\t([^\t]*)/
    : /^([0-9A-Z][a-z0-9]{1,2})\.(\d+)\.(\d+)(?:\([^)]*\))?#\d+=(\S+)\t([^\t]*?) \(([^)\t]*)\)\t([^\t]*)/;
  for (const line of text.split('\n')) {
    const m = re.exec(line);
    if (!m) continue;
    let [, code, c, v] = m, word, sound, mean;
    if (!codes.includes(code)) codes.push(code);
    const book = books[codes.indexOf(code)];
    if (!book) throw new Error(`${code}: more books in the file than expected (${books.join(', ')})`);
    if (lang === 'he') { word = hebrew(m[4]); sound = m[5].replace(/\//g, ''); mean = meaning(inOrder(m[6], m[7])); }
    else { if (!/k/i.test(m[4])) continue; word = m[5].trim().normalize('NFC'); sound = m[6].trim(); mean = meaning(m[7]); }   // ά, not its look-alike
    if (Number(v) < 1 || !word) continue;      // a psalm's title (verse 0 here) isn't a KJV verse
    const ch = book + ' ' + c;
    if (!out.has(ch)) out.set(ch, { lang, v: [], ar: [] });
    const d = out.get(ch), i = Number(v) - 1;
    (d.v[i] || (d.v[i] = [])).push([word, sound, mean]);
    if (lang === 'he' && /^A/.test(m[7])) arCount.set(ch + ':' + v, (arCount.get(ch + ':' + v) || 0) + 1);
  }
  if (codes.length !== books.length) throw new Error(`found ${codes.length} books, expected ${books.length} (${books.join(', ')})`);
  // A verse mostly in Aramaic (parts of Daniel and Ezra, Jeremiah 10:11) says so.
  for (const [key, n] of arCount) {
    const [ch, v] = key.split(':'), d = out.get(ch);
    if (n * 2 > d.v[Number(v) - 1].length) d.ar.push(Number(v));
  }
  return out;
}

// The chapters asked for (any not in the Bible are left out), downloading
// the files they need into the cache the first time.
export async function loadOriginal(cache, chapters) {
  const want = [...new Set(chapters)].filter(langOf), out = new Map();
  for (const [lang, name, books] of FILES) {
    const here = want.filter(ch => books.includes(split(ch).book));
    if (!here.length) continue;
    fs.mkdirSync(cache, { recursive: true });
    const file = path.join(cache, `stepbible-${ORIG_COMMIT.slice(0, 7)}-${name.slice(0, 13).replace(/\W+/g, '-')}.txt`);
    if (!fs.existsSync(file)) {
      const res = await fetch(BASE + encodeURIComponent(name));
      if (!res.ok) throw new Error(`Could not download ${name}: HTTP ${res.status}`);
      fs.writeFileSync(file, await res.text());
    }
    let all;
    try { all = parse(lang, fs.readFileSync(file, 'utf8'), books); } catch (e) { throw new Error(`${name}: ${e.message}`); }
    for (const ch of here) { const s = split(ch), d = all.get(s.book + ' ' + s.c); if (d) out.set(ch, d); }
  }
  return out;
}
