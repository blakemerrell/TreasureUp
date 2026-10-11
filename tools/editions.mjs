// How the Book of Mormon's wording changed from the first edition to today's,
// for the reader's Changes button (Blake, 2026-10-10): BYU Office of Digital
// Humanities' OpenScripture data (github.com/BYU-ODH/OpenScripture), which
// lines up the 1830, 1837, 1840, 1841, 1879, 1920, 1981 and 2013 editions
// word by word under today's chapters and verses. One file a book, a row a
// word, a space or a punctuation mark, a column an edition (∅: not in that
// edition; ⌴: a space). Pinned to one commit, so the data never changes under
// us, and downloaded once into the scripture cache. Credited in the app
// wherever changes show. tools/verify.mjs checks its 2013 column is our text;
// build-reading.mjs writes content/changes/<chapter>.js for the app.
//
// The editions compared, each with the one before it: 1830 → 1837 → 1840 →
// 1879 → 1920 → 1981 → 2013. The 1841 British edition was set from the 1837
// one, so it's left out. The data has no 1849, 1852, 1874, 1888, 1902 or 1911
// edition, so a change it first shows in 1879 or 1920 may have been made in
// one of those: the app says "by 1879", "by 1920" (BY_EDITIONS).
//
// Each change is classified by these rules, with no one reading them yet
// (the "why" notes for single verses come later, for Blake to approve):
//   s  spelling or punctuation: the same letters, or a spelling of the same
//      word (honour → honor, a name spelled another way)
//   t  a typo fixed (or made): a word found nowhere else, a letter or two from the other
//   g  grammar: which → who, saith → said, was → were, a → an, "it came to
//      pass" or a small word like "that" or "the" added or taken out
//   w  wording: everything else, the changes the app shows by default
import fs from 'node:fs';
import path from 'node:path';

export const EDITIONS_COMMIT = 'b1cad8239c0909ee1afe4a1e010ce93a271a6a18';   // BYU-ODH/OpenScripture, 2022-08-10
const BASE = `https://raw.githubusercontent.com/BYU-ODH/OpenScripture/${EDITIONS_COMMIT}/book-of-mormon/`;
export const BOM_BOOKS = ['1 Nephi', '2 Nephi', 'Jacob', 'Enos', 'Jarom', 'Omni', 'Words of Mormon', 'Mosiah', 'Alma',
  'Helaman', '3 Nephi', '4 Nephi', 'Mormon', 'Ether', 'Moroni'];
export const COLUMNS = ['1830', '1837', '1840', '1841', '1879', '1920', '1981', '2013'];
export const MAIN_LINE = ['1830', '1837', '1840', '1879', '1920', '1981', '2013'];
export const BY_EDITIONS = ['1879', '1920'];

async function fileOf(cache, book) {
  fs.mkdirSync(cache, { recursive: true });
  const file = path.join(cache, `openscripture-${EDITIONS_COMMIT.slice(0, 7)}-${book.replace(/\W+/g, '-')}.tsv`);
  if (!fs.existsSync(file)) {
    const res = await fetch(BASE + encodeURIComponent(book) + '.tsv');
    if (!res.ok) throw new Error(`Could not download OpenScripture's ${book}: HTTP ${res.status}`);
    const text = await res.text();
    if (!text.startsWith('Citation\twID\t' + COLUMNS.join('\t'))) throw new Error(`OpenScripture's ${book}: not the columns expected`);
    fs.writeFileSync(file, text);
  }
  return file;
}

// Every verse of the books asked for (all of them by default):
// Map "1 Nephi 11" -> [verse 1's rows, …], a row being one cell per column
// ('' where that edition doesn't have it, ' ' a space).
export async function loadEditions(cache, books = BOM_BOOKS) {
  const out = new Map();
  for (const book of books) {
    const text = fs.readFileSync(await fileOf(cache, book), 'utf8');
    for (const line of text.split('\n').slice(1)) {
      if (!line.trim()) continue;
      const cells = line.split('\t');
      const m = /^(.+) (\d+):(\d+)$/.exec(cells[0]);
      if (!m || cells.length < 2 + COLUMNS.length) throw new Error(`OpenScripture's ${book}: can't read the row "${line.slice(0, 60)}"`);
      const ch = m[1] + ' ' + m[2], v = Number(m[3]) - 1;
      if (!out.has(ch)) out.set(ch, []);
      const vs = out.get(ch);
      (vs[v] || (vs[v] = [])).push(cells.slice(2, 2 + COLUMNS.length).map(c => c === '∅' ? '' : c === '⌴' ? ' ' : c));
    }
  }
  return out;
}
// A verse in one edition, as text.
export const textOf = (rows, ed) => rows.map(r => r[COLUMNS.indexOf(ed)]).join('').replace(/\s+/g, ' ').trim();

// ---- the kinds of change ----
const lettersOf = s => s.toLowerCase().replace(/&c\./g, 'and so forth').replace(/&/g, 'and').replace(/[^a-z]/g, '');
const wordsOf = s => (s.toLowerCase().replace(/’/g, "'").match(/[a-z]+(?:'[a-z]+)?/g) || []);
function lev(a, b) {
  if (Math.abs(a.length - b.length) > 3) return 9;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[b.length];
}
// Words grammar trades for each other: either way round.
const GRAMMAR_PAIRS = [
  ['which', 'who'], ['which', 'whom'], ['which', 'that'], ['who', 'whom'], ['that', 'who'], ['that', 'whom'], ['who', 'whose'],
  ['saith', 'said'], ['is', 'are'], ['was', 'were'], ['is', 'was'], ['are', 'were'], ['hath', 'have'], ['hath', 'has'], ['has', 'have'],
  ['doth', 'does'], ['doth', 'do'], ['does', 'do'], ['had', 'have'], ['had', 'has'], ['did', 'do'], ['done', 'did'], ['a', 'an'],
  ['them', 'those'], ['this', 'these'], ['that', 'those'], ['these', 'those'], ['exceeding', 'exceedingly'], ['ye', 'you'],
  ['thee', 'you'], ['thou', 'you'], ['thy', 'your'], ['art', 'are'], ['wast', 'were'], ['shalt', 'shall'], ['wilt', 'will'],
  ['knowed', 'knew'], ['began', 'begun'], ['arose', 'arisen'], ['wrote', 'written'], ['took', 'taken'], ['rode', 'ridden'],
  ['drank', 'drunk'], ['sat', 'sit'], ['sat', 'set'], ['set', 'sit'], ['lay', 'lie'], ['laid', 'lain'], ['lay', 'lain'], ['spake', 'spoke'], ['spake', 'spoken'],
  ['spoke', 'spoken'], ['came', 'come'], ['become', 'became'], ['run', 'ran'], ['gave', 'given'], ['give', 'gave'],
  ['brake', 'broke'], ['broke', 'broken'], ['fell', 'fallen'], ['smote', 'smitten'], ['slew', 'slain'], ['drove', 'driven'],
  ['beheld', 'behold'], ['bare', 'bore'], ['bore', 'born'], ['bore', 'borne'], ['bare', 'borne'], ['go', 'went'], ['gone', 'went'],
  ['shew', 'shewn'], ['save', 'saved'], ['in', 'into'], ['on', 'upon'], ['unto', 'to'], ['upon', 'on'], ['amongst', 'among'],
  ['whomsoever', 'whosoever'], ['whatsoever', 'whatever'], ['was', 'be'], ['were', 'be'], ['is', 'be'], ['am', 'be'],
  ['saith', 'say'], ['hath', 'had'], ['they', 'them'], ['nor', 'or'], ['shall', 'should'], ['will', 'would'], ['sayeth', 'said'], ['sayeth', 'saith'], ['they', 'those'], ['might', 'may'], ['be', 'are'], ['having', 'had'], ['seeing', 'saw'],
  ['an', 'the'], ['a', 'the'], ['less', 'fewer'], ['more', 'most'], ['much', 'many'], ['each', 'every'], ['their', 'there'],
].map(p => p.slice().sort().join('|'));
const grammarPair = (a, b) => GRAMMAR_PAIRS.includes([a, b].sort().join('|'));
// The same word with another ending: rejoice / rejoiceth / rejoiced.
const stem = w => w.length < 4 ? w : w.replace(/(eth|est|edst|ed|en|es|ing|ly|(?<!s)s)$/, '').replace(/e$/, '');
const sameStem = (a, b) => a.length >= 3 && b.length >= 3 && stem(a) === stem(b) && stem(a).length >= 3;
// Small words grammar adds and takes away ("it came to pass that", "a preparing").
const SMALL = new Set(['that', 'a', 'an', 'the', 'and', 'it', 'to', 'did', 'do', 'does', 'doth', 'had', 'have', 'has', 'hath', 'was', 'were',
  'is', 'are', 'which', 'who', 'whom', 'being', 'been', 'be', 'of', 'there']);
const CAME_TO_PASS = /\b(and )?(it )?came to pass( that)?\b/g;
// The same spelling, the British way or the American, one l or two (travelled, traveled).
// shew → show, judgement → judgment, toward → towards.
const spelled = w => (w.length >= 6 ? w.replace(/our(?=(s|ed|ing|ite|able|er|ers)?$)/, 'or') : w).replace(/^shew/, 'show').replace(/dgement/, 'dgment')
  .replace(/wards$/, 'ward').replace(/^nought$/, 'naught').replace(/^enquir/, 'inquir').replace(/eable$/, 'able').replace(/eyed$/, 'ied').replace(/ntion/, 'nsion').replace(/^oh$/, 'o').replace(/([a-z])\1/g, '$1').replace(/ise(d|s|th)?$/, 'ize$1').replace(/ence$/, 'ense').replace(/([^aeiou])re$/, '$1er');

// A word found nowhere else, near enough the other to be it misspelled.
const typo = (x, y, vocab) => (!vocab.has(x) || !vocab.has(y)) && lev(x, y) <= Math.max(2, Math.floor(Math.min(x.length, y.length) / 3));
// What kind of change one from-to is: 's', 't', 'g' or 'w'. `vocab` is every
// word one edition uses in at least four verses, or today's edition uses at all (vocabOf).
export function kindOf(from, to, vocab) {
  if (lettersOf(from) === lettersOf(to)) return 's';
  const a = wordsOf(from), b = wordsOf(to);
  // A word broken by a stray space or mark ("m ght" → "might"), or misspelled.
  if ([...a, ...b].some(w => !vocab.has(w)) && lev(lettersOf(from), lettersOf(to)) <= 2) return 't';
  if (a.length === b.length) {
    const diff = a.map((x, i) => [x, b[i]]).filter(([x, y]) => x !== y);
    if (diff.every(([x, y]) => typo(x, y, vocab))) return 't';
    if (diff.every(([x, y]) => spelled(x) === spelled(y) || (lev(x, y) <= 2 && x.length >= 5 && /^[A-Z]/.test(from.replace(/^\W+/, '')) && /^[A-Z]/.test(to.replace(/^\W+/, '')) && x.slice(0, 2) === y.slice(0, 2)))) return 's';
    if (diff.every(([x, y]) => grammarPair(x, y) || sameStem(x, y) || spelled(x) === spelled(y) || ((!vocab.has(x) || !vocab.has(y)) && lev(x, y) <= 2))) return 'g';
  }
  // Words added or taken out (and maybe one traded), all of them small ones.
  const strip = ws => ws.join(' ').replace(CAME_TO_PASS, ' ').trim().split(/\s+/).filter(Boolean);
  const [short, long] = a.length <= b.length ? [strip(a), strip(b)] : [strip(b), strip(a)];
  const left = long.slice();
  for (const w of short) {
    let k = left.indexOf(w);
    if (k < 0) { k = left.findIndex(x => sameStem(x, w) || grammarPair(x, w) || spelled(x) === spelled(w)); }
    if (k < 0) return left.length && !vocab.has(w) && left.some(x => typo(w, x, vocab)) ? 't' : 'w';
    left.splice(k, 1);
  }
  if (left.length && left.every(w => !vocab.has(w))) return 't';            // a stray word taken out ("and berak brake")
  if (left.every(w => SMALL.has(w))) return 'g';                             // "did pass" → "passed", "that" added
  return 'w';
}
// Every word today's edition uses, or one edition uses in at least four verses
// (a spelling of its day, like "shew"; a slip of the type is rarely made four times).
export function vocabOf(all) {
  const seen = new Map(), out = new Set();
  for (const verses of all.values()) for (const rows of verses) {
    if (!rows) continue;
    const here = new Set();
    for (const r of rows) r.forEach((cell, i) => { for (const w of wordsOf(cell)) { here.add(COLUMNS[i] + ' ' + w); if (COLUMNS[i] === '2013') out.add(w); } });
    for (const k of here) seen.set(k, (seen.get(k) || 0) + 1);
  }
  for (const [k, n] of seen) if (n >= 4) out.add(k.slice(5));
  return out;
}

// One verse's changes, edition by edition along the main line: [[edition,
// from, to, kind], …]. A word added or taken out, or a mark changed, carries
// the words either side of it, so it reads in place ("mother of God" →
// "mother of the Son of God").
const hasWord = s => /[A-Za-z]/.test(s);
export function verseChanges(rows, vocab) {
  const out = [];
  for (let e = 1; e < MAIN_LINE.length; e++) {
    const A = COLUMNS.indexOf(MAIN_LINE[e - 1]), B = COLUMNS.indexOf(MAIN_LINE[e]);
    let i = 0;
    while (i < rows.length) {
      if (rows[i][A] === rows[i][B]) { i++; continue; }
      // The rows that differ, with only spaces between them: one change ("judgment seat," → "judgment-seat").
      let j = i;
      for (;;) {
        while (j < rows.length && rows[j][A] !== rows[j][B]) j++;
        let k = j;
        while (k < rows.length && rows[k][A] === rows[k][B] && !rows[k][A].trim()) k++;
        if (k > j && k < rows.length && rows[k][A] !== rows[k][B]) j = k; else break;
      }
      let from = i, to = j;                          // the rows that differ: [from, to)
      const side = (k, lo, hi) => rows.slice(lo, hi).map(r => r[k]).join('').replace(/\s+/g, ' ').trim();
      let a = side(A, from, to), b = side(B, from, to);
      if (!hasWord(a) || !hasWord(b)) {              // added, taken out, or only a mark: a word either side
        while (from > 0 && !(hasWord(rows[from - 1][A]) && rows[from - 1][A] === rows[from - 1][B])) from--;
        if (from > 0) from--;
        while (to < rows.length && !(hasWord(rows[to][A]) && rows[to][A] === rows[to][B])) to++;
        if (to < rows.length) to++;
        a = side(A, from, to); b = side(B, from, to);
      }
      out.push([MAIN_LINE[e], a, b, kindOf(side(A, i, j), side(B, i, j), vocab)]);
      i = j;
    }
  }
  return out;
}

// ---- the 1830 button (Blake, 2026-10-11, mockup A) ----
// A verse's words for comparing: letters and digits, apostrophes kept inside a
// word, compared lowercased without them ("father’s" = "fathers"). The app
// splits its own text the same way (TOKEN_1830 in index.html).
export const TOKEN = /[A-Za-z0-9]+(?:['’][A-Za-z0-9]+)*/g;
const tokensOf = s => [...String(s).matchAll(TOKEN)].map(m => ({ w: m[0].toLowerCase().replace(/['’]/g, ''), at: m.index, end: m.index + m[0].length }));
// The longest common subsequence of two word lists, each word matched as early
// as it can be ("mother of God" / "mother of the Son of God": the words added
// are "the Son of", before "God"): [[i, j], …].
function lcs(a, b) {
  const n = a.length, m = b.length, dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const out = [];
  for (let i = 0, j = 0; i < n && j < m;) {
    if (a[i] === b[j]) { out.push([i, j]); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) i++; else j++;
  }
  return out;
}
// A verse's 1830 line, and what to underline in today's: { t, u }.
//   t: the 1830 text in pieces: a string as it is, [word] a word today's
//      edition doesn't have (pink), 0 where today's has words added (‸).
//   u: the words of `app` (our text) that weren't in 1830, by their number
//      among its words; null when our text isn't the data's 2013 word for word.
export function line1830(rows, app) {
  const old = textOf(rows, '1830'), now = textOf(rows, '2013');
  if (!old) return null;
  const a = tokensOf(old), b = tokensOf(now), pairs = lcs(a.map(x => x.w), b.map(x => x.w));
  const keptA = new Set(pairs.map(p => p[0])), keptB = new Set(pairs.map(p => p[1]));
  const caretAt = new Set();                       // a's word numbers that have words added before them (a.length: at the end)
  let pi = -1, pj = -1;
  for (const [i, j] of [...pairs, [a.length, b.length]]) {
    if (i - pi === 1 && j - pj > 1) caretAt.add(i);
    pi = i; pj = j;
  }
  const t = [];
  let from = 0;
  const text = s => { if (!s) return; if (typeof t[t.length - 1] === 'string') t[t.length - 1] += s; else t.push(s); };
  a.forEach((x, i) => {
    text(old.slice(from, x.at));
    if (caretAt.has(i)) t.push(0);
    if (keptA.has(i)) text(old.slice(x.at, x.end)); else t.push([old.slice(x.at, x.end)]);
    from = x.end;
  });
  if (caretAt.has(a.length)) { const last = a.length ? a[a.length - 1].end : 0; text(old.slice(from, last)); t.push(0); from = Math.max(from, last); }
  text(old.slice(from));
  const mine = tokensOf(app || '').map(x => x.w);
  const same = mine.length === b.length && mine.every((w, k) => w === b[k].w);
  return { t, u: same ? b.map((x, k) => k).filter(k => !keptB.has(k)) : null };
}
