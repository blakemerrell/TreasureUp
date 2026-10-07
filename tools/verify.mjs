#!/usr/bin/env node
// Checks the week's content in index.html before it ships.
//
//   node tools/verify.mjs                       content, scripture and media checks
//   node tools/verify.mjs --online              also checks against the live Gospel Library pages:
//                                               the lesson page, and every magazine or manual page a
//                                               bonus cites (CI runs this). --lesson means the same.
//   (every week in the WEEKS list is checked. A clip nobody has watched yet is a note, not a
//   failure: the app hides it until previewed: true.)
//
// What it checks:
//   - every verse box quotes the scripture text exactly (… marks left-out words)
//   - every “quote” in a hook, body, question or answer is really in the verse it cites
//   - every reference named anywhere exists
//   - every bonus answer is in its chapter, or on the Gospel Library page it cites (the lesson,
//     the Friend, For the Strength of Youth, the Liahona), and NOWHERE in the app, so the
//     only way to get it is to read. A page that won't load is a warning, not a failure, so a
//     Church website outage can't block a deploy; words that aren't on the page are a failure.
//   - every picture has a description, a credit and a source link, and is small enough
//   - every clip comes from an approved channel (asked of YouTube itself), is under
//     3 minutes, and has been watched by a parent (previewed: true)
//   - every lesson section has a reel, every question is well formed, reels stay short
//   - every insight card is about verses of the week's reading, comes from a page on one of
//     the sites Blake chose (INSIGHT_SITES), and (with --online) that page has the words it
//     says the point comes from, and any words it quotes from the page
//
// Scripture text comes from the public-domain bcbooks/scriptures-json data,
// pinned to one commit so a check today gives the same answer as tomorrow.
// It is downloaded once into tools/.scripture-cache/ (or $SCRIPTURE_CACHE).

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { loadOriginal, langOf } from './original.mjs';
import { weekStart, utahToday } from './week-dates.mjs';   // "September 28–October 4, 2026" -> "2026-09-28" (the app's rule; the New Year week too)

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const CACHE = process.env.SCRIPTURE_CACHE || path.join(ROOT, 'tools', '.scripture-cache');
const DATA_COMMIT = '3bda76e40add4582165340ea6b1198dc6ad26ae1';
const DATA_URL = `https://raw.githubusercontent.com/bcbooks/scriptures-json/${DATA_COMMIT}/`;
const VOLUMES = ['old-testament', 'new-testament', 'book-of-mormon', 'doctrine-and-covenants', 'pearl-of-great-price'];

const LIMITS = { bodyWords: 75, hookChars: 60, whyWords: 40, choiceChars: 60, noteWords: 45, tldrWords: 30 };
const MEDIA = {
  // A picture on any reel it fits (Blake, 2026-09-24: "most reels should get
  // a pic"), one per reel. Clips stay few: a lesson, not a video feed.
  maxClipsPerWeek: 2,
  maxImageKB: 150,
  maxClipSeconds: 180,
  maxVideoSeconds: 600,      // a video card in Go further: one a week, 10 minutes at most
  imageHosts: ['www.churchofjesuschrist.org', 'commons.wikimedia.org'],
  // YouTube channels a clip may come from, exactly as YouTube names them.
  // Add one only after deciding it's a source you trust for him.
  // Approved by Blake 2026-09-24: Come, Follow Me series and the Church's own channel.
  channels: [
    'The Church of Jesus Christ of Latter-day Saints',   // @churchofjesuschrist, the official channel (confirmed 2026-09-24)
    'Scripture Central',       // John Hilton III and others
    'followHIM Podcast',       // Hank Smith & John Bytheway
    "Don't Miss This",         // Emily Belle Freeman & David Butler
    'Talking Scripture',
    // Added by Blake 2026-09-24 (names confirmed with YouTube):
    'BibleProject',            // not Latter-day Saint: watch for readings that differ from the lesson
    'Church History Matters Podcast',
    'Gospel For Kids',
    'Latter Day Kids',
    'LDS Come Follow Me',
    'Line Upon Line — for Come Follow Me (Overviews for All Ages)',
    'Thumb Follow Me'          // kids' Bible stories; name confirmed with YouTube 2026-09-24
  ]
};

// Where insight cards come from (Blake, 2026-10-01: "Church manuals,
// Scripture Central, Follow Him, BYU"), and the name each is credited by.
// The Church's pages are credited by their publication (Old Testament
// Student Manual, General Conference, the Liahona…).
const INSIGHT_SITES = {
  'www.churchofjesuschrist.org': { by: null },
  'scripturecentral.org': { by: 'Scripture Central' },
  'rsc.byu.edu': { by: 'BYU Religious Studies Center' },
  'speeches.byu.edu': { by: 'BYU Speeches' },
  'followhim.co': { by: 'followHIM' },
  // Blake, 2026-10-04: "can you add notes to the scripture reading from Joseph
  // Smith papers??? having a directly source to that would be amazing".
  'www.josephsmithpapers.org': { by: 'Joseph Smith Papers' }
};

const args = new Set(process.argv.slice(2));
const failures = [];
const notes = [];
let weekLabel = '';   // "Week 40 · " when checking several weeks
const fail = (where, msg) => failures.push(`${weekLabel}${where}: ${msg}`);
const note = msg => notes.push(`${weekLabel}${msg}`);

// ---------- scripture ----------

async function loadVolume(name) {
  fs.mkdirSync(CACHE, { recursive: true });
  const file = path.join(CACHE, `${DATA_COMMIT.slice(0, 7)}-${name}.json`);
  if (!fs.existsSync(file)) {
    const res = await fetch(DATA_URL + name + '.json');
    if (!res.ok) throw new Error(`Could not download ${name}: HTTP ${res.status}`);
    fs.writeFileSync(file, await res.text());
  }
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

async function loadScripture() {
  const verses = new Map();   // "Isaiah 14:13" -> text
  const books = new Set();
  for (const name of VOLUMES) {
    const data = await loadVolume(name);
    const chapters = data.sections
      ? data.sections                                   // D&C is sections, not books
      : data.books.flatMap(b => b.chapters);
    for (const c of chapters) {
      for (const v of c.verses) {
        verses.set(v.reference, v.text);
        books.add(v.reference.replace(/ \d+:\d+$/, ''));
      }
    }
  }
  return { verses, books: [...books].sort((a, b) => b.length - a.length), names: scriptureNames(verses) };
}

// Names in the scriptures: words capitalized everywhere they appear, and
// somewhere in the middle of a sentence (so not just a verse's first word or
// the start of a quotation). Plain words keep them, so he can match them up.
function scriptureNames(verses) {
  const lower = new Set(), inside = new Set();
  for (const t of verses.values()) {
    for (const m of t.matchAll(/[A-Za-z]+/g)) {
      const w = m[0];
      if (/^[a-z]/.test(w)) { lower.add(w.toLowerCase()); continue; }
      const before = t.slice(0, m.index).trimEnd();
      if (before && /[A-Za-z]$/.test(before)) inside.add(w.toLowerCase());
    }
  }
  return new Set([...inside].filter(w => !lower.has(w) && !['i', 'o'].includes(w)));
}

// The books the app can link (BOOK_PATHS in index.html), so every
// reference he reads can be a link to Gospel Library.
function appBooks() {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const i = html.indexOf('const BOOK_PATHS = {');
  const j = html.indexOf('\n  };\n', i);
  if (i < 0 || j < 0) throw new Error('Could not find BOOK_PATHS in index.html');
  return Object.keys(new Function('return ' + html.slice(html.indexOf('{', i), j) + '}')());
}
// The app's other names for a book, as the scripture data names it.
const BOOK_ALIAS = { 'Psalm': 'Psalms', 'Song of Solomon': "Solomon's Song", 'Solomon’s Song': "Solomon's Song", 'Doctrine and Covenants': 'D&C' };

// ---------- the week ----------

// Every week in index.html, by running its content script with a stand-in
// for the app (which would otherwise pick today's week and start up).
// ---------- approval (developer mode) ----------
// Each piece of a week carries `approved`: a fingerprint of its content
// when Blake approved it in developer mode. Any later change makes the
// fingerprint stop matching. Must match the app's approvalHash exactly.
const canonJson = v => Array.isArray(v) ? '[' + v.map(canonJson).join(',') + ']'
  : v && typeof v === 'object' ? '{' + Object.keys(v).filter(k => v[k] !== undefined).sort().map(k => JSON.stringify(k) + ':' + canonJson(v[k])).join(',') + '}'
  : JSON.stringify(v === undefined ? null : v);
function approvalHash(v) {
  const c = canonJson(v);
  let h = 0x811c9dc5;
  for (let i = 0; i < c.length; i++) { h ^= c.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(16).padStart(8, '0');
}
const withoutApproval = o => { const c = Object.assign({}, o); delete c.approved; return c; };
// The pieces a week is reviewed in, with the fingerprint each should carry.
function reviewItems(week) {
  const items = [{ key: 'week', approved: week.approved, hash: approvalHash({ dates: week.dates, title: week.title, reference: week.reference, lesson: week.lesson, sections: week.sections }) }];
  for (const r of week.reels || []) items.push({ key: 'reel:' + r.id, approved: r.approved, hash: approvalHash(withoutApproval(r)) });
  for (const d of week.deep || []) items.push({ key: 'deep:' + d.id, approved: d.approved, hash: approvalHash(withoutApproval(d)) });
  if (week.puzzle) items.push({ key: 'puzzle', approved: week.puzzle.approved, hash: approvalHash(withoutApproval(week.puzzle)) });
  for (const x of week.sayings || []) items.push({ key: 'say:' + x.id, approved: x.approved, hash: approvalHash(withoutApproval(x)) });
  if (week.words) items.push({ key: 'words', approved: week.wordsApproved, hash: approvalHash(week.words) });
  for (const p of Array.isArray(week.plain) ? week.plain : []) items.push({ key: 'plain:' + p.ch, approved: p.approved, hash: approvalHash(withoutApproval(p)) });
  for (const t of Array.isArray(week.tldr) ? week.tldr : []) items.push({ key: 'tldr:' + t.ch, approved: t.approved, hash: approvalHash(withoutApproval(t)) });
  for (const t of Array.isArray(week.treasure) ? week.treasure : []) items.push({ key: 'treasure:' + t.id, approved: t.approved, hash: approvalHash(withoutApproval(t)) });
  for (const g of Array.isArray(week.guide) ? week.guide : []) items.push({ key: 'guide:' + (g && g.id), approved: g && g.approved, hash: approvalHash(withoutApproval(g || {})) });
  if (week.family) items.push({ key: 'family', approved: week.family.approved, hash: approvalHash(withoutApproval(week.family)) });
  // An insight card's fingerprint leaves out its deep dive and its note in the
  // reader, which have their own (deep.approved, margin.approved).
  for (const x of Array.isArray(week.insights) ? week.insights : []) { const c = withoutApproval(x || {}); delete c.deep; delete c.margin; items.push({ key: 'insight:' + (x && x.id), approved: x && x.approved, hash: approvalHash(c) }); }
  return items;
}
// Weeks from here on can't go live without every piece approved; the two
// weeks before went live before developer mode existed.
const REVIEW_FROM = '2026-10-05';

// content/weeks.js: a comment, then `window.TU_WEEKS = <JSON>;`. The same
// rule developer mode uses to read and write it.
const WEEKS_MARK = 'window.TU_WEEKS = ';
function loadWeeks() {
  const text = fs.readFileSync(path.join(ROOT, 'content', 'weeks.js'), 'utf8');
  const at = text.indexOf(WEEKS_MARK), end = text.lastIndexOf(';');
  if (at < 0 || end < at) throw new Error('content/weeks.js must be a comment, then window.TU_WEEKS = <JSON>;');
  try { return JSON.parse(text.slice(at + WEEKS_MARK.length, end)); }
  catch (e) { throw new Error('content/weeks.js is not valid JSON after window.TU_WEEKS = (' + e.message + ')'); }
}

// The map game's boards (content/boards.js): a map that holds together, and
// a hook and a story that quote scripture exactly.
const BOARDS_MARK = 'window.TU_BOARDS = ';
function loadBoards() {
  const file = path.join(ROOT, 'content', 'boards.js');
  if (!fs.existsSync(file)) return [];
  const text = fs.readFileSync(file, 'utf8');
  const at = text.indexOf(BOARDS_MARK), end = text.lastIndexOf(';');
  if (at < 0 || end < at) throw new Error('content/boards.js must be a comment, then window.TU_BOARDS = <JSON>;');
  try { return JSON.parse(text.slice(at + BOARDS_MARK.length, end)); }
  catch (e) { throw new Error('content/boards.js is not valid JSON after window.TU_BOARDS = (' + e.message + ')'); }
}
// The arcade games' words (content/arcade.js): each “quote” is in the verse
// cited after it, and a reference never stands without its quote.
const ARCADE_MARK = 'window.TU_ARCADE = ';
function loadArcade() {
  const file = path.join(ROOT, 'content', 'arcade.js');
  if (!fs.existsSync(file)) return null;
  const text = fs.readFileSync(file, 'utf8');
  const at = text.indexOf(ARCADE_MARK), end = text.lastIndexOf(';');
  if (at < 0 || end < at) throw new Error('content/arcade.js must be a comment, then window.TU_ARCADE = <JSON>;');
  try { return JSON.parse(text.slice(at + ARCADE_MARK.length, end)); }
  catch (e) { throw new Error('content/arcade.js is not valid JSON after window.TU_ARCADE = (' + e.message + ')'); }
}
function checkArcade(arcade, { verses }) {
  if (!arcade) return;
  const textOf = ref => { const refs = expand(ref); return refs && refs.every(r => verses.has(r)) ? refs.map(r => verses.get(r)).join(' ') : null; };
  const strings = (v, at) => typeof v === 'string' ? [[at, v]] : v && typeof v === 'object' ? Object.entries(v).flatMap(([k, x]) => strings(x, at + '.' + k)) : [];
  for (const game of ['snake', 'look', 'ammon']) if (!arcade[game] || !arcade[game].title || !arcade[game].hook) failures.push(`content/arcade.js: ${game} needs a title and a hook`);
  for (const [at, line] of strings(arcade, 'arcade')) {
    if (/"/.test(line)) failures.push(`content/arcade.js ${at}: uses a straight " quote; use “curly quotes”`);
    for (const m of line.matchAll(/“([^”]+)”[^(“]*\(([^)]+)\)/g)) {
      const src = textOf(m[2]);
      if (src == null) failures.push(`content/arcade.js ${at}: reference "${m[2]}" does not exist`);
      else if (!quoteMatches(m[1], src)) failures.push(`content/arcade.js ${at}: “${m[1]}” is not in ${m[2]}`);
    }
    if ((line.match(/“/g) || []).length !== (line.match(/\(/g) || []).length) failures.push(`content/arcade.js ${at}: every quote needs its reference, and every reference its quote`);
  }
}
// Is a point inside an outline? (even-odd ray casting)
function insideRing([x, y], ring) {
  let c = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c;
  }
  return c;
}
// Two outlines: how far apart they are at their closest (and where), and how
// long a stretch of one runs along the other.
const segPoint = (p, a, c) => {
  const dx = c[0] - a[0], dy = c[1] - a[1], len2 = dx * dx + dy * dy;
  const t = len2 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2)) : 0;
  return [a[0] + t * dx, a[1] + t * dy];
};
function ringGap(A, B) {
  let best = { d: Infinity, p: null, q: null };
  for (const [P, Q] of [[A, B], [B, A]]) for (const p of P) for (let i = 0; i < Q.length; i++) {
    const q = segPoint(p, Q[i], Q[(i + 1) % Q.length]), d = Math.hypot(p[0] - q[0], p[1] - q[1]);
    if (d < best.d) best = { d, p, q };
  }
  return best;
}
function sharedBorder(A, B) {
  let total = 0;
  for (let i = 0; i < A.length; i++) {
    const a = A[i], c = A[(i + 1) % A.length], len = Math.hypot(c[0] - a[0], c[1] - a[1]), n = Math.max(1, Math.ceil(len / 2));
    for (let k = 0; k < n; k++) {
      const t = (k + 0.5) / n, p = [a[0] + (c[0] - a[0]) * t, a[1] + (c[1] - a[1]) * t];
      let near = Infinity;
      for (let j = 0; j < B.length; j++) { const q = segPoint(p, B[j], B[(j + 1) % B.length]); near = Math.min(near, Math.hypot(p[0] - q[0], p[1] - q[1])); }
      if (near < 1.5) total += len / n;
    }
  }
  return total;
}
function checkBoards(boards, { verses }) {
  const textOf = ref => { const refs = expand(ref); return refs && refs.every(r => verses.has(r)) ? refs.map(r => verses.get(r)).join(' ') : null; };
  for (const b of boards) {
    const where = `board ${b.id || '?'}`;
    const ids = new Set((b.lands || []).map(l => l.id));
    if (ids.size !== (b.lands || []).length) failures.push(`${where}: land ids must be unique`);
    for (const l of b.lands || []) {
      if (!l.name || !Array.isArray(l.ring) || l.ring.length < 3) failures.push(`${where}: land ${l.id} needs a name and an outline`);
      if (!Array.isArray(l.label) || l.label[0] < 0 || l.label[1] < 0 || l.label[0] > b.size[0] || l.label[1] > b.size[1]) failures.push(`${where}: land ${l.id}'s label is off the map`);
      else if (Array.isArray(l.ring) && !insideRing(l.label, l.ring)) failures.push(`${where}: land ${l.id}'s label isn't inside its outline`);
    }
    // A painted board: the picture must be in the repo, and small enough
    // that a phone joining a game isn't kept waiting for it.
    if (b.art) {
      const file = path.join(ROOT, b.art);
      if (!/\.(jpe?g|png|webp)$/i.test(b.art) || !fs.existsSync(file)) failures.push(`${where}: art ${b.art} isn't an image in the repo`);
      else if (fs.statSync(file).size > 1024 * 1024) failures.push(`${where}: art ${b.art} is ${(fs.statSync(file).size / 1048576).toFixed(1)} MB; keep it under 1 MB, since every phone in a game loads it`);
    }
    const adj = {};
    for (const [x, y] of b.links || []) {
      if (!ids.has(x) || !ids.has(y) || x === y) { failures.push(`${where}: border ${x}–${y} names a land that isn't on the map`); continue; }
      (adj[x] = adj[x] || new Set()).add(y); (adj[y] = adj[y] || new Set()).add(x);
    }
    const first = [...ids][0], seen = new Set([first]), todo = [first];
    while (todo.length) for (const n of adj[todo.pop()] || []) if (!seen.has(n)) { seen.add(n); todo.push(n); }
    if (seen.size !== ids.size) failures.push(`${where}: every land must be reachable; can't reach ${[...ids].filter(i => !seen.has(i)).join(', ')}`);
    // The outlines must agree with the borders, since players attack what
    // looks next to them: lands in `links` share a stretch of border on the
    // map (or face each other across a narrow sea), and lands that share one
    // are in `links`. A board traced over a picture has to follow the
    // picture's own borders for this to hold.
    const ring = Object.fromEntries((b.lands || []).filter(l => Array.isArray(l.ring)).map(l => [l.id, l.ring]));
    const linked = new Set((b.links || []).map(([x, y]) => [x, y].sort().join('|')));
    const landIds = Object.keys(ring);
    for (let i = 0; i < landIds.length; i++) for (let j = i + 1; j < landIds.length; j++) {
      const x = landIds[i], y = landIds[j], key = [x, y].sort().join('|');
      const shared = Math.min(sharedBorder(ring[x], ring[y]), sharedBorder(ring[y], ring[x]));
      if (linked.has(key) && shared < 8) {
        const g = ringGap(ring[x], ring[y]), mid = [(g.p[0] + g.q[0]) / 2, (g.p[1] + g.q[1]) / 2];
        if (!(g.d <= 60 && (b.seas || []).some(sea => insideRing(mid, sea.ring)))) failures.push(`${where}: ${x} and ${y} are neighbours in links, but on the map they don't share a border (${Math.round(g.d)} apart${g.d <= 60 ? ', not across a sea' : ''})`);
      } else if (!linked.has(key) && shared >= 8) failures.push(`${where}: ${x} and ${y} share a border on the map but aren't in links`);
    }
    const homes = new Set();
    for (const k of b.kingdoms || []) {
      if (!ids.has(k.home)) failures.push(`${where}: kingdom ${k.name}'s home ${k.home} isn't on the map`);
      if (homes.has(k.home)) failures.push(`${where}: two kingdoms share the home ${k.home}`);
      homes.add(k.home);
      if (!/^#[0-9a-f]{6}$/i.test(k.color || '')) failures.push(`${where}: kingdom ${k.name} needs a color like #3b82f6`);
    }
    if ((b.kingdoms || []).length < 2) failures.push(`${where}: needs at least 2 kingdoms`);
    if (b.walls && !ids.has(b.walls)) failures.push(`${where}: walls land ${b.walls} isn't on the map`);
    // The wall stands on the prize's borders with wallSides, bricks thick.
    for (const s of b.wallSides || []) if (!linked.has([s, b.walls].sort().join('|'))) failures.push(`${where}: wallSides ${s} isn't next to ${b.walls}`);
    if ((b.wallSides || []).length && !(Number.isInteger(b.bricks) && b.bricks > 0)) failures.push(`${where}: a wall needs bricks, a whole number above 0`);
    // Regions: real lands, each in one region at most, with a whole-number
    // bonus. Prophecy cards: an id, icon, name, what it does, copies, and a
    // quote (checked with the story lines below).
    const inRegion = new Set();
    for (const r of b.regions || []) {
      if (!r.id || !r.name || !Number.isInteger(r.bonus) || r.bonus < 1) failures.push(`${where}: region ${r.id || '?'} needs an id, a name and a bonus of 1 or more`);
      for (const l of r.lands || []) {
        if (!ids.has(l)) failures.push(`${where}: region ${r.name} names ${l}, which isn't on the map`);
        if (inRegion.has(l)) failures.push(`${where}: ${l} is in two regions`);
        inRegion.add(l);
      }
      if ((r.lands || []).length < 2) failures.push(`${where}: region ${r.name} needs 2 or more lands`);
    }
    // Fair 2-player match-ups: pairs of two different kingdoms on this board.
    const kIds = new Set((b.kingdoms || []).map(k => k.id));
    for (const p of b.fairPairs || []) if (!Array.isArray(p) || p.length !== 2 || p[0] === p[1] || !p.every(k => kIds.has(k))) failures.push(`${where}: fairPairs ${JSON.stringify(p)} needs two different kingdoms`);
    // Mountains: real lands (not a home or the prize), whose guards start at a whole number of 1 or more.
    if (b.mountains) {
      const M = b.mountains, homes = new Set((b.kingdoms || []).map(k => k.home));
      if (!M.name || !Number.isInteger(M.guards) || M.guards < 1 || !(M.lands || []).length) failures.push(`${where}: mountains need a name, lands and guards of 1 or more`);
      for (const l of M.lands || []) if (!ids.has(l) || homes.has(l) || l === b.walls) failures.push(`${where}: mountains name ${l}, which isn't a neutral land on the map`);
    }
    const knownCards = ['lions', 'river', 'gates', 'hand', 'balance'];   // the effects the app knows how to play
    for (const c of b.cards || []) {
      if (!knownCards.includes(c.id)) failures.push(`${where}: card ${c.id} isn't one the app can play (${knownCards.join(', ')})`);
      if (!c.icon || !c.name || !c.does || !c.quote || !Number.isInteger(c.copies) || c.copies < 1) failures.push(`${where}: card ${c.id} needs an icon, name, what it does, a quote and copies`);
    }
    for (const m of (b.intro || '').matchAll(/\(([^)]+ \d+:\d+(?:[–-]\d+)?)\)/g)) if (textOf(m[1]) == null) failures.push(`${where}: intro reference "${m[1]}" does not exist`);
    // The narrator's hook (the game's opening line), story, story moments
    // (lines for the battles at Babylon) and cheers (verses after a sweep or a
    // failed attack): each “quote” must be in the verse cited after it.
    if (!b.hook) failures.push(`${where}: needs a hook, the narrator's opening line`);
    // A chapter opens each round (chapterPlan: which, for each game length):
    // every length's plan names real chapters, one a round, opens with 1,
    // has chapter 2 (Babylon's gates open) as round 2, and ends on the last.
    const chapters = b.chapters || [];
    for (const [rounds, plan] of Object.entries(b.chapterPlan || {})) {
      if (!Array.isArray(plan) || plan.length !== Number(rounds)) failures.push(`${where}: chapterPlan ${rounds} needs one chapter a round`);
      else if (plan.some(n => !chapters[n - 1]) || plan[0] !== 1 || plan[1] !== 2 || plan[plan.length - 1] !== chapters.length) failures.push(`${where}: chapterPlan ${rounds} must name real chapters, start 1, 2 and end on chapter ${chapters.length}`);
    }
    for (const c of chapters) if (!c.title || !c.text) failures.push(`${where}: every chapter needs a title and a text`);
    for (const line of [b.hook || ''].concat(b.story || [], Object.values(b.moments || {}), ...Object.values(b.cheers || {}), chapters.map(c => c.text || ''), (b.cards || []).map(c => c.quote || ''))) {
      for (const m of line.matchAll(/“([^”]+)”[^(“]*\(([^)]+)\)/g)) {
        const src = textOf(m[2]);
        if (src == null) failures.push(`${where}: story reference "${m[2]}" does not exist`);
        else if (!quoteMatches(m[1], src)) failures.push(`${where}: story: “${m[1]}” is not in ${m[2]}`);
      }
      if ((line.match(/“/g) || []).length !== (line.match(/\(/g) || []).length) failures.push(`${where}: story: every quote needs its reference: ${line}`);
    }
    for (const m of (b.intro || '').matchAll(/\b(Daniel|Isaiah|Ezra) (\d+)(?!:)/g)) if (!verses.has(`${m[1]} ${m[2]}:1`)) failures.push(`${where}: intro chapter "${m[0]}" does not exist`);
  }
}


// A Gospel Library page as plain text, or null if it won't load.
// Pages and videos it couldn't reach: notes, and one warning on the deploy, so an outage
// (or a site that blocks GitHub) never fails a deploy but never goes unseen either.
const unreached = [];
async function fetchPageText(url) {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(20000) });
    if (!res.ok) { unreached.push(url); notes.push(`couldn't load ${url} (HTTP ${res.status}); what cites it wasn't checked`); return null; }
    return (await res.text())
      .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&#x([0-9a-f]+);/gi, (m, h) => String.fromCodePoint(parseInt(h, 16)))
      .replace(/&#(\d+);/g, (m, d) => String.fromCodePoint(Number(d)))
      .replace(/&(nbsp|quot|amp|rsquo|lsquo|rdquo|ldquo|mdash|ndash|hellip|apos);/g, (m, n) => ({ nbsp: ' ', quot: '"', amp: '&', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', mdash: '—', ndash: '–', hellip: '…', apos: "'" })[n])
      .replace(/\s+/g, ' ');
  } catch (e) {
    unreached.push(url);
    notes.push(`couldn't reach ${url} (${e.message}); what cites it wasn't checked`);
    return null;
  }
}

// Who owns a YouTube video, so a typo'd id can't slip in another channel's clip. A video
// YouTube says isn't there fails; YouTube being busy or down (429, 5xx, no answer) is a note.
async function checkOwner(where, v) {
  if (!/^[A-Za-z0-9_-]{11}$/.test(v.youtube || '')) return;
  const url = 'https://www.youtube.com/oembed?format=json&url=' + encodeURIComponent('https://www.youtube.com/watch?v=' + v.youtube);
  let res;
  try { res = await fetch(url, { signal: AbortSignal.timeout(20000) }); }
  catch (e) { unreached.push(url); note(`${where}: couldn't ask YouTube about video ${v.youtube} (${e.message}); its channel wasn't checked`); return; }
  if (res.status === 429 || res.status >= 500) { unreached.push(url); note(`${where}: YouTube didn't answer about video ${v.youtube} (HTTP ${res.status}); its channel wasn't checked`); return; }
  if (!res.ok) { fail(where, `YouTube doesn't know video ${v.youtube} (HTTP ${res.status})`); return; }
  const meta = await res.json();
  if (meta.author_name !== v.channel) fail(where, `video ${v.youtube} belongs to "${meta.author_name}", not "${v.channel}"`);
}

const bonusesOf = r => !r.bonus ? [] : Array.isArray(r.bonus) ? r.bonus : [r.bonus];
const GOSPEL_LIBRARY = /^https:\/\/www\.churchofjesuschrist\.org\/study\//;
// "lesson" is short for the week's lesson page.
const webSource = (b, week) => b.source === 'lesson' ? week.lesson : GOSPEL_LIBRARY.test(b.source || '') ? b.source : null;

// ---------- matching ----------

// Lowercased, one kind of apostrophe, no quote marks, single spaces.
const norm = s => s.toLowerCase()
  .replace(/[‘’]/g, "'").replace(/[“”"]/g, '')
  .replace(/\s+/g, ' ').trim();
const trimPunct = s => s.replace(/^[\s.,;:!?'—-]+|[\s.,;:!?'—-]+$/g, '');

// Is every …-separated piece of `quote` in `source`, in order?
function quoteMatches(quote, source) {
  const src = norm(source);
  let from = 0;
  for (const piece of quote.split('…').map(p => trimPunct(norm(p))).filter(Boolean)) {
    const at = src.indexOf(piece, from);
    if (at < 0) return false;
    from = at + piece.length;
  }
  return true;
}

// "Isaiah 14:13–14" -> ["Isaiah 14:13", "Isaiah 14:14"]
function expand(ref) {
  const m = /^(.+) (\d+):(\d+)(?:[–-](\d+))?$/.exec(ref.trim());
  if (!m) return null;
  const [, name, ch, a, b] = m;
  const book = BOOK_ALIAS[name] || name;                  // "Psalm 78:60" is in the data as Psalms
  const out = [];
  for (let v = Number(a); v <= Number(b || a); v++) out.push(`${book} ${ch}:${v}`);
  return out;
}

// The chapters of a week's reading block, the way the app plans the days:
// "Isaiah 13–14; 22; 24–30; 35" -> Isaiah 13, Isaiah 14, Isaiah 22, …;
// a book on its own ("Hosea 1–6; Joel") is every chapter of it.
function blockChapters(reference, verses) {
  const out = [];
  let book = null;
  for (const raw of String(reference || '').split(';')) {
    const part = raw.trim();
    if (/^\d? ?[A-Za-z][^\d]*$/.test(part)) {
      book = part;
      for (let c = 1; verses.has(`${book} ${c}:1`); c++) out.push(book + ' ' + c);
      continue;
    }
    const m = /^(?:(.*?[A-Za-z].*?) )?(\d+)(?::\d+(?:[–-]\d+)?)?(?:[–-](\d+))?$/.exec(part);
    if (!m) return null;
    if (m[1]) book = m[1];
    if (!book) return null;
    const to = /:/.test(part) ? Number(m[2]) : Number(m[3] || m[2]);
    for (let c = Number(m[2]); c <= to; c++) out.push(book + ' ' + c);
  }
  return out;
}
// Words a clue shares with its verse (4+ letters, not the little ones), so
// "Find it in the chapter" can't be solved by matching words.
const CLUE_SKIP = new Set('that this with from they them their there then than what when will shall have hath unto your yours into over upon were been being does doth even also only just like more most very much make made said says saith thee thou thine'.split(' '));
const clueWords = t => new Set((String(t).toLowerCase().match(/[a-z’']+/g) || []).map(w => w.replace(/[’']s$/, '')).filter(w => w.length >= 4 && !CLUE_SKIP.has(w)));

async function main(scripture, week, pages, online) {
  const { verses, books, names } = scripture;
  // A block it can't read is a note: the app then plans a section a day, as before.
  const block = blockChapters(week.reference, verses);
  if (!week.library && (!block || !block.length)) note(`week: reference "${week.reference}" can't be read as a list of chapters (like "Isaiah 13–14; 22; 24–30; 35"), so its reels spread over Monday to Saturday in section order, with no reading path`);

  const textOf = ref => {
    const refs = expand(ref);
    if (!refs || !refs.every(r => verses.has(r))) return null;
    return refs.map(r => verses.get(r)).join(' ');
  };

  // Resolve "(verse 13)" / "(verses 13–14)" against a home reference's chapter.
  const resolve = (ref, homeRef) => {
    const rel = /^verses? (\d+(?:[–-]\d+)?)$/.exec(ref.trim());
    if (rel) {
      const home = /^(.+ \d+):/.exec(homeRef || '');
      return home ? `${home[1]}:${rel[1]}` : null;
    }
    return ref.trim();
  };

  const bookPattern = books.map(b => b.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');

  // Every reference in text he reads is a link in the app (linkRefs in
  // index.html), read the same way: each must be a real verse or chapter,
  // and "verse 12" or "chapter 40" means the chapter of the verse the text
  // belongs to (`home`), so it needs one.
  const linkable = APP_BOOKS.slice().sort((a, b) => b.length - a.length).map(b => b.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const refRe = new RegExp(`(${linkable}) (\\d+)(?::(\\d+)(?:[–-](\\d+))?)?(?:[–-]\\d+)?|\\b([Vv]erses?|[Cc]hapter) (\\d+)(?:[–-](\\d+))?`, 'g');
  const listRe = /^(; ?)(\d+)(?::(\d+)(?:[–-]\d+)?)?(?:[–-]\d+)?(?! ?[A-Za-z])/;
  const exists = (book, ch, v) => verses.has(`${BOOK_ALIAS[book] || book} ${ch}:${v || 1}`);
  function checkRefs(where, field, text, home) {
    if (!text) return;
    const h = /^(.+?) (\d+)/.exec(home || '');
    const hb = h && APP_BOOKS.includes(h[1]) ? h : null;
    let m;
    refRe.lastIndex = 0;
    while ((m = refRe.exec(text))) {
      if (m[1] && m.index > 0 && /[A-Za-z0-9]/.test(text[m.index - 1])) continue;
      if (m[1]) {
        if (!exists(m[1], m[2], m[3]) || (m[4] && !exists(m[1], m[2], m[4]))) fail(where, `${field}: "${m[0]}" is not a real reference`);
        let at = m.index + m[0].length;
        for (let x; (x = listRe.exec(text.slice(at)));) {
          if (!exists(m[1], x[2], x[3])) fail(where, `${field}: "${m[1]} ${x[0].slice(x[1].length)}" is not a real reference`);
          at += x[0].length;
        }
        refRe.lastIndex = at;
      } else if (!hb) {
        fail(where, `${field}: "${m[0]}" has no verse to be read against; write the full reference (like "Isaiah 22:22")`);
      } else if (/^c/i.test(m[5]) ? !exists(hb[1], m[6]) : !exists(hb[1], hb[2], m[6]) || (m[7] && !exists(hb[1], hb[2], m[7]))) {
        fail(where, `${field}: "${m[0]}" is not in ${/^c/i.test(m[5]) ? hb[1] : hb[1] + ' ' + hb[2]}`);
      }
    }
  }
  checkRefs('week', 'reference', week.reference, null);
  const anyRef = new RegExp(`(?:${bookPattern}) \\d+:\\d+(?:[–-]\\d+)?`, 'g');

  // Quotes, references and punctuation in one piece of text he reads.
  // A quote with no reference after it must come from `homeRef`.
  function checkText(where, field, text, homeRef) {
    if (!text) return;
    if (/"/.test(text)) fail(where, `${field} uses a straight " quote; use “curly quotes” so the quote gets checked`);
    if ((text.match(/“/g) || []).length !== (text.match(/”/g) || []).length) fail(where, `${field} has unbalanced “quotes”`);

    for (const m of text.matchAll(/“([^”]+)”(\s*\(([^)]+)\))?/g)) {
      const quote = m[1];
      const cited = m[3] ? resolve(m[3], homeRef) : homeRef;
      const source = cited ? textOf(cited) : null;
      if (source == null) fail(where, `${field}: can't find ${m[3] ? '"' + m[3] + '"' : 'a verse'} to check “${quote}” against`);
      else if (!quoteMatches(quote, source)) fail(where, `${field}: “${quote}” is not in ${cited}`);
    }
    for (const m of text.matchAll(anyRef)) {
      if (textOf(m[0]) == null) fail(where, `${field}: reference "${m[0]}" does not exist`);
    }
    for (const m of text.matchAll(/\(verses? (\d+(?:[–-]\d+)?)\)/g)) {
      const ref = resolve(`verse ${m[1]}`, homeRef);
      if (!ref || textOf(ref) == null) fail(where, `${field}: "(verse ${m[1]})" does not exist in ${(homeRef || '?').replace(/:.*/, '')}`);
    }
  }

  function checkQuestion(where, q, label) {
    if (!q.q || !q.right || !q.why) fail(where, `${label} needs q, right and why`);
    if (!Array.isArray(q.wrong) || q.wrong.length !== 2) fail(where, `${label} needs exactly two wrong answers`);
    const choices = [q.right, ...(q.wrong || [])];
    if (new Set(choices).size !== choices.length) fail(where, `${label}: answer choices must all be different`);
    for (const c of choices) if (c && c.length > LIMITS.choiceChars) fail(where, `${label}: choice "${c}" is over ${LIMITS.choiceChars} characters`);
    // A right answer much longer than both wrong ones can be picked without
    // reading (the review found "pick the longest" right on 16 of 21 reels).
    if (q.right && Array.isArray(q.wrong) && q.wrong.length && q.wrong.every(w => q.right.length > 1.25 * String(w || '').length)) {
      note(`${where}: ${label}: the right answer is much longer than both wrong ones, so it can be picked without reading. Make the wrong ones the same length and shape`);
    }
    const whyWords = (q.why || '').split(/\s+/).filter(Boolean).length;
    if (whyWords > LIMITS.whyWords) fail(where, `${label}: why is ${whyWords} words (max ${LIMITS.whyWords})`);
  }

  // content/plain.js (the chapters no week reads): only its plain words.
  if (week.library) { checkPlain(week.plain, new Set(week.chapters || [])); return; }

  // ----- week-level -----
  for (const k of ['dates', 'title', 'reference', 'lesson']) {
    if (!week[k]) fail('week', `missing ${k}`);
  }
  if (!Array.isArray(week.sections) || !week.sections.length) fail('week', 'no sections');
  if (!Array.isArray(week.reels) || !week.reels.length) fail('week', 'no reels');

  const ids = new Set();
  const used = new Set();
  let clipCount = 0;

  // Everything he can read in the app without opening the reading: the
  // reels and Go deeper…
  const appText = norm(week.reels.map(r => [
    r.hook, r.body, r.verse && r.verse.text,
    r.question && [r.question.q, r.question.right, ...(r.question.wrong || []), r.question.why].join(' '),
    ...bonusesOf(r).map(b => [b.q, ...(b.wrong || [])].join(' '))
  ].join(' ')).join(' ') + ' ' + (week.deep || []).map(d => [d.intro, d.q, ...(d.wrong || [])].join(' ')).join(' ') + ' ' +
    // …and in the games: puzzle tiles, Who said it? lines, and Verse Word clues
    // with their word filled in (which he sees once the game ends).
    ((week.puzzle && week.puzzle.groups) || []).flatMap(g => (g.tiles || []).map(x => x.text)).join(' ') + ' ' +
    (week.sayings || []).map(s => [s.text, s.speaker, ...(s.wrong || []), s.why].join(' ')).join(' ') + ' ' +
    (week.words || []).map(x => String(x.clue || '').replace(/_+/g, x.word || '')).join(' ') + ' ' +
    // …and the insight cards in Go further.
    (Array.isArray(week.insights) ? week.insights : []).map(x => [x && x.title, x && x.text, x && x.quote].join(' ')).join(' '));

  // A question only the reading answers (a bonus, or a Go-deeper item):
  // its answer words are in the verse or Gospel Library page it cites, and
  // nowhere in the app.
  // A whole chapter's text, for the map game's hunts.
  const chapters = new Map();
  const chapterOf = (book, ch) => {
    const key = book + ' ' + ch;
    if (!chapters.has(key)) {
      const out = [];
      for (let v = 1; verses.has(`${key}:${v}`); v++) out.push(verses.get(`${key}:${v}`));
      chapters.set(key, out.length ? out.join(' ') : null);
    }
    return chapters.get(key);
  };
  const countIn = (needle, hay) => { const n = trimPunct(norm(needle)), h = norm(hay); let c = 0; for (let i = h.indexOf(n); i >= 0; i = h.indexOf(n, i + 1)) c++; return c; };

  function checkReading(where, label, b) {
    checkQuestion(where, b, label);
    // The map game's hard questions are hunts through a chapter: its wording
    // (`hunt`) names only the chapter, and the answer is there just once.
    if (b.hunt != null) {
      const src = /^(.+?) (\d+):\d+/.exec(b.source || '');
      if (/\d+:\d+/.test(b.hunt)) fail(where, `${label} hunt must name only the chapter, not a verse: "${b.hunt}"`);
      if (!src) fail(where, `${label} hunt needs a scripture source to hunt in`);
      else if (!b.hunt.includes(src[1] + ' ' + src[2])) fail(where, `${label} hunt must say which chapter to search ("${src[1]} ${src[2]}")`);
      else {
        const text = chapterOf(src[1], src[2]);
        const n = text == null ? 0 : countIn(b.find || '', text);
        if (n !== 1) fail(where, `${label} hunt: "${b.find}" is in ${src[1]} ${src[2]} ${n} times; a hunt's answer must be there once`);
      }
    } else if (/\b\d+:\d+/.test(b.q || '')) {
      note(`${where}: ${label} names a verse, so the map game leaves it out until it has a \`hunt\` wording`);
    }
    const url = webSource(b, week);
    if (!b.source || !b.find) fail(where, `${label} needs source and find`);
    else if (url) {
      if (/[“”]/.test(b.why)) fail(where, `${label} from a web page: don't put its words in “quotes” (only scripture quotes get checked)`);
      if (!online) note(`${where}: ${label} answer from ${url.replace(/\?.*/, '')} not checked (run with --online)`);
      else if (pages.get(url) != null && !norm(pages.get(url)).includes(trimPunct(norm(b.find)))) {
        fail(where, `${label}: "${b.find}" is not on ${url} (check the link and the exact wording; a mistyped link still loads a page)`);
      }
    } else if (/^https?:/.test(b.source)) {
      fail(where, `${label} source must be a verse, "lesson", or a Gospel Library page (churchofjesuschrist.org/study/…)`);
    } else {
      const src = textOf(b.source);
      if (src == null) fail(where, `${label} source "${b.source}" not found`);
      else if (!quoteMatches(b.find, src)) fail(where, `${label}: "${b.find}" is not in ${b.source}`);
      checkText(where, `${label} why`, b.why, b.source);
      checkText(where, `${label} question`, b.q, b.source);
    }
    if (b.find && appText.includes(trimPunct(norm(b.find)))) {
      fail(where, `${label}: "${b.find}" already appears in the app, so he doesn't need the reading to answer it`);
    }
  }

  for (const [n, r] of week.reels.entries()) {
    const where = r.id || `reel ${n + 1}`;

    if (!r.id || !/^[a-z0-9-]+$/.test(r.id)) fail(where, 'id must be lowercase letters, digits and dashes');
    if (ids.has(r.id)) fail(where, 'duplicate id');
    ids.add(r.id);

    if (!Number.isInteger(r.section) || !week.sections[r.section]) fail(where, 'section must be an index into sections');
    used.add(r.section);

    for (const k of ['hook', 'body']) if (!r[k]) fail(where, `missing ${k}`);
    if (r.hook && r.hook.length > LIMITS.hookChars) fail(where, `hook is ${r.hook.length} characters (max ${LIMITS.hookChars})`);

    // Reading first: a reel comes on the day its chapter is read, and its
    // headline (or `seek`) is the clue for "Find it in the chapter".
    if (block && block.length && r.verse && r.verse.ref && !block.includes(r.verse.ref.replace(/:.*/, ''))) {
      note(`${where}: ${r.verse.ref} is outside this week's reading (${week.reference}), so it comes on the day of its section's other reels`);
    }
    if (r.seek != null && (typeof r.seek !== 'string' || !r.seek.trim() || r.seek.length > LIMITS.hookChars + 20)) {
      fail(where, `seek must be a short clue in plain words (max ${LIMITS.hookChars + 20} characters)`);
    }
    if (r.verse && r.verse.text) {
      const v = clueWords(r.verse.text), shared = [...clueWords(r.seek || r.hook || '')].filter(w => v.has(w));
      if (shared.length >= 2) note(`${where}: its ${r.seek ? 'seek clue' : 'headline'} repeats "${shared.join('", "')}" from the verse, so Find it in the chapter can be done by matching words. A \`seek\` in plain words fixes it (e.g. "tired" for "faint")`);
    }
    const words = (r.body || '').split(/\s+/).filter(Boolean).length;
    if (words > LIMITS.bodyWords) fail(where, `body is ${words} words (max ${LIMITS.bodyWords})`);

    // Verse box: must be the scripture text, exactly.
    const boxText = r.verse && r.verse.ref ? textOf(r.verse.ref) : null;
    if (!r.verse || !r.verse.text || !r.verse.ref) fail(where, 'missing verse text or ref');
    else if (boxText == null) fail(where, `verse ref "${r.verse.ref}" not found`);
    else if (!quoteMatches(r.verse.text, boxText)) {
      fail(where, `verse text does not match ${r.verse.ref}\n      app : ${r.verse.text}\n      real: ${boxText}`);
    }

    // The reel's own question.
    const q = r.question || {};
    checkQuestion(where, q, 'question');
    const home = r.verse && r.verse.ref;
    checkText(where, 'hook', r.hook, home);
    checkText(where, 'body', r.body, home);
    checkText(where, 'question', q.q, home);
    checkText(where, 'why', q.why, home);
    checkText(where, 'right answer', q.right, home);
    checkText(where, 'wrong answers', (q.wrong || []).join(' | '), home);
    for (const [f, t] of [['hook', r.hook], ['body', r.body], ['question', q.q], ['why', q.why], ['note prompt', r.note]]) checkRefs(where, f, t, home);
    for (const b of bonusesOf(r)) {
      const bh = b.source && textOf(b.source) != null ? b.source : home;
      checkRefs(where, 'bonus question', b.q, bh);
      checkRefs(where, 'bonus why', b.why, bh);
    }

    // Bonuses: answerable only from the reading.
    for (const [bn, b] of bonusesOf(r).entries()) {
      checkReading(where, bonusesOf(r).length > 1 ? `bonus ${bn + 1}` : 'bonus', b);
    }

    // Media.
    const media = r.media || {};
    if (media.image) {
      const im = media.image;
      if (!im.src || !/^media\/[a-z0-9-]+\.(jpg|jpeg|png|webp)$/.test(im.src)) fail(where, 'image src must be media/<lowercase-name>.jpg|png|webp');
      else {
        const file = path.join(ROOT, im.src);
        if (!fs.existsSync(file)) fail(where, `image file ${im.src} is missing`);
        else {
          const kb = Math.round(fs.statSync(file).size / 1024);
          if (kb > MEDIA.maxImageKB) fail(where, `image ${im.src} is ${kb} KB (max ${MEDIA.maxImageKB})`);
        }
      }
      if (!im.alt || im.alt.length < 20) fail(where, 'image needs an alt description he could picture (20+ characters)');
      // A picture of the Savior never goes on a reel about Satan: next to
      // that headline it reads as a picture of him. (Found by Blake on the
      // Lucifer reel, 2026-09-24.)
      const showsChrist = /\b(Jesus|Christ|Christus|Savior|Saviour|Messiah)\b/i.test((im.alt || '') + ' ' + (im.credit || ''));
      const aboutSatan = /\b(Lucifer|Satan|devil|adversary)\b/i.test([r.hook, r.body, r.verse && r.verse.text].join(' '));
      if (showsChrist && aboutSatan) fail(where, `the picture shows Jesus Christ, but this reel is about Satan; next to "${r.hook}" it reads as a picture of him`);
      if (!im.credit) fail(where, 'image needs a credit');
      let host = null;
      try { host = new URL(im.link).host; } catch (e) {}
      if (!MEDIA.imageHosts.includes(host)) fail(where, `image link must point to its page on ${MEDIA.imageHosts.join(' or ')}`);
    }
    if (media.video) {
      clipCount++;
      const v = media.video;
      if (!/^[A-Za-z0-9_-]{11}$/.test(v.youtube || '')) fail(where, 'video.youtube must be an 11-character YouTube id');
      if (!(Number.isInteger(v.start) && Number.isInteger(v.end) && v.end > v.start)) fail(where, 'video needs whole-second start < end');
      else if (v.end - v.start > MEDIA.maxClipSeconds) fail(where, `clip is ${v.end - v.start}s (max ${MEDIA.maxClipSeconds})`);
      if (!v.title) fail(where, 'video needs a title');
      if (!MEDIA.channels.includes(v.channel)) fail(where, `channel "${v.channel}" isn't on the approved list in tools/verify.mjs`);
      // An unwatched clip is never shown in the app (only in the private
      // preview, marked, so a parent can review it). So it's a note, not a failure.
      if (v.previewed !== true) note(`${where}: clip ${v.youtube} ${v.start}–${v.end}s is hidden until a parent watches it and sets previewed: true`);
      await checkOwner(where, v);
    }
  }

  // Go deeper: a reading per section (the one the lesson points to) and
  // Friday's pieces, each with a question only that reading answers.
  const days = new Set();
  for (const d of week.deep || []) {
    const where = d.id || 'a Go-deeper item';
    if (!d.id || !/^[a-z0-9-]+$/.test(d.id)) fail(where, 'id must be lowercase letters, digits and dashes');
    if (ids.has(d.id)) fail(where, 'duplicate id');
    ids.add(d.id);
    const friday = d.day === 'friday';
    if (!friday && !(Number.isInteger(d.section) && week.sections[d.section])) fail(where, 'needs a section (an index into sections) or day: "friday"');
    if (!friday && days.has(d.section)) fail(where, `section ${d.section} already has a Go-deeper reading (one per section)`);
    days.add(d.section);
    if (friday && !d.title) fail(where, 'a Friday piece needs a title');
    if (!d.intro) fail(where, 'missing intro');
    const introWords = (d.intro || '').split(/\s+/).filter(Boolean).length;
    if (introWords > LIMITS.whyWords + 5) fail(where, `intro is ${introWords} words (max ${LIMITS.whyWords + 5})`);
    // What he's asked to read: a passage, the lesson, or a Gospel Library page.
    const passage = /^https?:|^lesson$/.test(d.read || '') ? null : d.read;
    if (!d.read) fail(where, 'missing read');
    else if (passage) {
      const text = textOf(passage);
      if (text == null) fail(where, `read "${passage}" not found`);
      else if (d.find && !quoteMatches(d.find, text)) fail(where, `the answer "${d.find}" is not in ${passage}, the passage it asks him to read`);
    } else if (!webSource({ source: d.read }, week)) fail(where, 'read must be a passage, "lesson", or a Gospel Library page');
    checkText(where, 'intro', d.intro, passage);
    checkReading(where, 'question', d);
    const dh = d.source && textOf(d.source) != null ? d.source : passage;
    checkRefs(where, 'intro', d.intro, passage);
    checkRefs(where, 'question', d.q, dh);
    checkRefs(where, 'why', d.why, dh);
  }

  if (clipCount > MEDIA.maxClipsPerWeek) fail('week', `${clipCount} clips (max ${MEDIA.maxClipsPerWeek}); keep it a lesson, not a video feed`);
  week.sections.forEach((s, i) => { if (!used.has(i)) fail('week', `section "${s}" has no reel`); });
  // The family board uses each section as a column; it needs at least 3 questions.
  week.sections.forEach((s, i) => {
    const n = week.reels.filter(r => r.section === i).reduce((k, r) => k + 1 + bonusesOf(r).length, 0);
    if (used.has(i) && n < 3) fail('week', `section "${s}" has ${n} question${n === 1 ? '' : 's'}; the family board needs at least 3 per section (add a bonus)`);
  });

  // The main words of a phrase, roughly stemmed ("calls" and "called" match).
  const STOP = new Set('the and of a an to in on by his her him he she it is was be for with from that this them they their thee thou thy ye you your will shall not all one every upon have hath unto who what lord god are were its as at or but'.split(' '));
  const keyWords = s => String(s || '').toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/).filter(x => x.length >= 3 && !STOP.has(x)).map(x => x.length > 4 ? x.replace(/(eth|ed|s)$/, '') : x);
  const readingQs = week.reels.flatMap(r => bonusesOf(r)).concat(week.deep || []).filter(x => x && x.right);

  // Weekly puzzle: 4 groups of 4, one per section, every tile from this week's reading.
  if (week.puzzle) {
    const where = 'puzzle';
    const block = new Set(blockChapters(week.reference, verses) || []);   // "Jeremiah 31–33; 36–39; Lamentations 1; 3": every book's chapters
    const groups = week.puzzle.groups || [];
    if (groups.length !== 4) fail(where, `needs exactly 4 groups (has ${groups.length})`);
    const secs = new Set(), texts = new Set();
    for (const [gi, g] of groups.entries()) {
      if (!week.sections[g.section]) fail(where, `group ${gi + 1}: section must be an index into sections`);
      if (secs.has(g.section)) fail(where, `group ${gi + 1}: two groups use the same section`);
      secs.add(g.section);
      if (!Array.isArray(g.tiles) || g.tiles.length !== 4) fail(where, `group ${gi + 1} needs exactly 4 tiles`);
      for (const t of g.tiles || []) {
        if (!t.text || t.text.length > 24) fail(where, `tile "${t.text}" must be 1–24 characters`);
        if (texts.has(t.text)) fail(where, `tile "${t.text}" appears twice`);
        texts.add(t.text);
        if (/[“”"]/.test(t.text || '')) fail(where, `tile "${t.text}": no quote marks on tiles`);
        if (!t.ref || textOf(t.ref) == null) fail(where, `tile "${t.text}": reference "${t.ref}" does not exist`);
        else if (block.size && !block.has(t.ref.replace(/:.*/, ''))) fail(where, `tile "${t.text}": ${t.ref} is outside this week's reading (${week.reference})`);
        // A tile shouldn't hand over a reading question's answer: the lesson's
        // match step and the puzzle both show it before he's read.
        const tw = keyWords(t.text);
        for (const x of readingQs) {
          const aw = new Set(keyWords(x.right + ' ' + (x.find || '')));
          if (tw.filter(k => aw.has(k)).length >= 2) fail(where, `tile "${t.text}" gives away the answer to "${x.q}" (${x.right})`);
        }
      }
    }
  }

  // Who said it?: every line quoted exactly from its reference.
  if (week.sayings) {
    const ids = new Set();
    if (week.sayings.length < 6) fail('sayings', `needs at least 6 lines (has ${week.sayings.length})`);
    for (const x of week.sayings) {
      const where = x.id || 'saying';
      if (!x.id || ids.has(x.id)) fail(where, 'each saying needs a unique id');
      ids.add(x.id);
      const src = x.ref ? textOf(x.ref) : null;
      if (src == null) fail(where, `reference "${x.ref}" does not exist`);
      else if (!quoteMatches(x.text || '', src)) fail(where, `"${x.text}" is not in ${x.ref}`);
      const choices = [x.speaker, ...(x.wrong || [])];
      if (!x.speaker || !Array.isArray(x.wrong) || x.wrong.length !== 2 || new Set(choices).size !== 3) fail(where, 'needs a speaker and two different wrong speakers');
      if (!x.why) fail(where, 'needs a why');
      else if (x.why.split(/\s+/).length > LIMITS.whyWords) fail(where, `why is over ${LIMITS.whyWords} words`);
      checkText(where, 'why', x.why, x.ref);
      checkRefs(where, 'why', x.why, x.ref);
    }
  }

  // Verse Word: each word, put in its clue's blank, must be the verse's own words,
  // and must be on the guess list (scripture-words.js) so it can be typed.
  if (week.words) {
    const seen = new Set();
    // One a day, Sunday first: the app picks words[day of the week].
    if (week.words.length !== 7) fail('words', `needs 7 words, one a day with Sunday first (has ${week.words.length})`);
    const listFile = path.join(ROOT, 'scripture-words.js');
    const guessable = fs.existsSync(listFile) ? new Set((/"([A-Z ]+)"/.exec(fs.readFileSync(listFile, 'utf8')) || [, ''])[1].split(' ')) : null;
    if (!guessable) fail('words', 'scripture-words.js is missing: run node tools/build-words.mjs');
    for (const w of week.words) {
      const where = 'word ' + (w.word || '?');
      if (!/^[A-Z]{4,7}$/.test(w.word || '')) fail(where, 'word must be 4–7 capital letters');
      if (seen.has(w.word)) fail(where, 'appears twice');
      if (guessable && w.word && !guessable.has(w.word)) fail(where, 'is not in scripture-words.js, so nobody could type it as a guess');
      seen.add(w.word);
      if ((w.clue || '').split('____').length !== 2) fail(where, 'clue needs exactly one ____ where the word goes');
      const src = w.ref ? textOf(w.ref) : null;
      if (src == null) fail(where, `reference "${w.ref}" does not exist`);
      else if (!quoteMatches((w.clue || '').replace('____', w.word || ''), src)) fail(where, `"${(w.clue || '').replace('____', w.word)}" is not in ${w.ref}`);
      // What the verse means, shown when the game ends.
      if (!w.mean) fail(where, 'needs mean: one plain line on what the verse means, shown when the game ends');
      else if (w.mean.split(/\s+/).length > LIMITS.whyWords) fail(where, `mean is over ${LIMITS.whyWords} words`);
      checkText(where, 'mean', w.mean, w.ref);
      checkRefs(where, 'mean', w.mean, w.ref);
      // The day's word shouldn't be sitting in the week's title above it.
      if (w.word && new RegExp('\\b' + w.word + '\\b', 'i').test(week.title)) fail(where, `is in the week's title ("${week.title}"), shown above the game`);
    }
  }

  // Plain words (week.plain): chapters of the reading in plain English, each
  // verse shown under its KJV verse when he turns them on. One line per verse
  // of the chapter, and notes on real verses whose quotes and references
  // check out like everything else he reads. Wording is Blake's call when he
  // approves; what can be counted is counted here: a much longer verse than
  // the KJV's, a name left out, or KJV English left in is a note to look at.
  if (week.plain !== undefined) checkPlain(week.plain, new Set(block || []));
  function checkPlain(list, chapters) {
    const seen = new Set();
    const words = t => (String(t || '').match(/\S+/g) || []).length;
    if (!Array.isArray(list)) fail('plain', 'must be a list of chapters');
    for (const p of Array.isArray(list) ? list : []) {
      const where = 'plain words ' + (p.ch || '?');
      if (!chapters.has(p.ch)) { fail(where, week.library ? `"${p.ch}" isn't a chapter content/plain.js may hold (a chapter of the scriptures that no week reads)` : `"${p.ch}" is not a chapter of this week's reading (${week.reference})`); continue; }
      if (seen.has(p.ch)) fail(where, 'appears twice');
      seen.add(p.ch);
      let n = 0;
      while (verses.has(`${p.ch}:${n + 1}`)) n++;
      if (!Array.isArray(p.verses) || p.verses.length !== n) {
        fail(where, `needs ${n} verses, one line each (has ${Array.isArray(p.verses) ? p.verses.length : 0})`);
        continue;
      }
      p.verses.forEach((t, i) => {
        const kjv = verses.get(`${p.ch}:${i + 1}`);
        if (typeof t !== 'string' || !t.trim()) return fail(where, `verse ${i + 1} is empty`);
        if (/"/.test(t)) fail(where, `verse ${i + 1} uses a straight " quote; use “curly quotes”`);
        if ((t.match(/“/g) || []).length !== (t.match(/”/g) || []).length) fail(where, `verse ${i + 1} has unbalanced “quotes”`);
        if (words(t) > words(kjv) * 1.5 + 8) note(`${where}: verse ${i + 1} is ${words(t)} words to the KJV's ${words(kjv)}; check it adds nothing`);
        const left = [...new Set((kjv.match(/[A-Za-z]+/g) || []).filter(w => names.has(w.toLowerCase())))]
          .filter(w => !new RegExp(`\\b${w}\\b`, 'i').test(t));
        if (left.length) note(`${where}: verse ${i + 1} leaves out ${left.join(', ')}`);
        if (/\b(thee|thou|thy|thine|ye|hath|saith|doth|shalt|unto)\b/i.test(t) || /\bLORD\b/.test(t)) note(`${where}: verse ${i + 1} still has KJV English`);
      });
      for (const x of p.notes || []) {
        const at = `note on verse ${x.v}`, home = `${p.ch}:${x.v}`;
        if (!Number.isInteger(x.v) || x.v < 1 || x.v > n) { fail(where, `a note is on verse ${x.v}, which ${p.ch} doesn't have`); continue; }
        if (!x.text) { fail(where, `${at} is empty`); continue; }
        if (words(x.text) > LIMITS.noteWords) fail(where, `${at} is ${words(x.text)} words (max ${LIMITS.noteWords})`);
        checkText(where, at, x.text, home);
        checkRefs(where, at, x.text, home);
      }
      for (const x of p.review || []) {
        if (!Number.isInteger(x.v) || x.v < 1 || x.v > n || !x.about) fail(where, `each review item needs a verse ${p.ch} has, and what to look at`);
      }
    }
  }

  // The short version (week.tldr): two to four lines at the top of a
  // chapter, each ending with the verses it covers, "(verses 4–5)", which the
  // app makes a jump to them. Written from the Church's chapter heading, the
  // week's lesson and the verses; the wording is Blake's call when he
  // approves. Counted here: the lines, their length, their verses in order,
  // their references, and any quote, which must be the KJV's words in the
  // verses the line names.
  if (week.tldr !== undefined) {
    const chapters = new Set(block || []), seen = new Set();
    const words = t => (String(t || '').match(/\S+/g) || []).length;
    if (!Array.isArray(week.tldr)) fail('short version', 'must be a list of chapters');
    for (const t of Array.isArray(week.tldr) ? week.tldr : []) {
      const where = 'short version ' + (t.ch || '?');
      if (!chapters.has(t.ch)) { fail(where, `"${t.ch}" is not a chapter of this week's reading (${week.reference})`); continue; }
      if (seen.has(t.ch)) fail(where, 'appears twice');
      seen.add(t.ch);
      let n = 0;
      while (verses.has(`${t.ch}:${n + 1}`)) n++;
      const lines = Array.isArray(t.lines) ? t.lines : [];
      if (lines.length < 2 || lines.length > 4) fail(where, `needs 2 to 4 lines (has ${lines.length})`);
      let last = 0;
      lines.forEach((l, i) => {
        const at = `line ${i + 1}`, m = / \((verses?) (\d+)(?:–(\d+))?\)$/.exec(typeof l === 'string' ? l : '');
        if (!m) return fail(where, `${at} must end with its verses, like "(verse 10)" or "(verses 4–5)"`);
        const from = Number(m[2]), to = Number(m[3] || m[2]), body = l.slice(0, m.index);
        if ((m[1] === 'verses') !== !!m[3] || to <= from && !!m[3]) fail(where, `${at}: one verse is "(verse N)", more are "(verses N–M)"`);
        if (from < 1 || to > n) fail(where, `${at}: ${t.ch} has verses 1–${n}`);
        if (from <= last) fail(where, `${at}: its verses overlap or come before the line above's`);
        last = Math.max(last, to);
        if (words(body) > LIMITS.tldrWords) fail(where, `${at} is ${words(body)} words before its verses (max ${LIMITS.tldrWords})`);
        if (/"/.test(body)) fail(where, `${at} uses a straight " quote; use “curly quotes”`);
        if ((body.match(/“/g) || []).length !== (body.match(/”/g) || []).length) fail(where, `${at} has unbalanced “quotes”`);
        if (/\b(thee|thou|thy|thine|ye|hath|saith|doth|shalt|unto)\b/i.test(body.replace(/“[^”]*”/g, ' ')) || /\bLORD\b/.test(body)) fail(where, `${at} has KJV English outside a quote`);
        for (const q of body.match(/“[^”]*”/g) || []) {
          const text = Array.from({ length: Math.max(0, to - from + 1) }, (_, k) => verses.get(`${t.ch}:${from + k}`) || '').join(' ');
          if (!quoteMatches(q.slice(1, -1), text)) fail(where, `${at}: ${q} isn't the KJV's words in verses ${from}–${to}`);
        }
        checkRefs(where, at, body, t.ch + ':' + from);
      });
      // Under the lines: the Book of Mormon copy the chapter heading names ("Compare 2 Nephi 23").
      if (t.also !== undefined) {
        if (typeof t.also !== 'string' || !/\((?:1|2|3|4) Nephi \d+|\(Mosiah \d+|\(Alma \d+|\(Helaman \d+|\(Mormon \d+|\(Ether \d+|\(Moroni \d+/.test(t.also)) fail(where, 'also: one sentence naming the Book of Mormon chapter, like "(2 Nephi 23)"');
        else {
          if (words(t.also) > 16) fail(where, `also is ${words(t.also)} words (max 16)`);
          if (/"/.test(t.also)) fail(where, 'also uses a straight " quote');
          checkRefs(where, 'also', t.also, t.ch + ':1');
        }
      }
      for (const x of t.review || []) {
        if (!Number.isInteger(x.v) || x.v < 1 || x.v > n || !x.about) fail(where, `each review item needs a verse ${t.ch} has, and what to look at`);
      }
    }
  }

  // A short version that says a bonus or Go-deeper answer: he can answer it
  // from the card at the top of the chapter without reading. A note, not a
  // failure (Blake approved the cards that do; 2026-10-01): a new card
  // should say that part another way.
  if (Array.isArray(week.tldr)) {
    const said = norm(week.tldr.map(t => (Array.isArray(t.lines) ? t.lines.join(' ') : '') + ' ' + (t.also || '')).join(' '));
    const asks = [...week.reels.flatMap(r => bonusesOf(r).map(b => [r.id, b])), ...(week.deep || []).map(d => [d.id, d])];
    for (const [id, b] of asks) {
      const give = [b.find, String(b.right || '').length >= 5 ? b.right : ''].filter(Boolean).find(x => said.includes(trimPunct(norm(x))));
      if (give) note(`${id}: a short version says “${give}”, its answer, so it can be answered without reading the chapter`);
    }
  }

  // The lesson, part by part (week.guide), and the week's family night
  // (week.family), both in our own words: the site is public, and the
  // Church's terms cover personal and family use. With --online, each
  // heading must be on the lesson page, and no 8 words in a row (outside a
  // “scripture quote”) may match it. Whether it's faithful to the lesson is
  // Blake's call when he approves.
  const lessonPage = online ? pages.get(week.lesson) : null;
  const wordsOf = t => String(t || '').toLowerCase().replace(/[‘’]/g, "'").match(/[a-z0-9']+/g) || [];
  const pageGrams = lessonPage ? (() => { const w = wordsOf(lessonPage), g = new Set(); for (let i = 0; i + 8 <= w.length; i++) g.add(w.slice(i, i + 8).join(' ')); return g; })() : null;
  function ownWords(where, field, text) {
    if (!pageGrams) return;
    for (const part of String(text || '').split(/“[^”]*”/)) {
      const w = wordsOf(part);
      for (let i = 0; i + 8 <= w.length; i++) {
        const g = w.slice(i, i + 8).join(' ');
        if (pageGrams.has(g)) { fail(where, `${field}: “${g}…” is the lesson's own words; say it in ours`); break; }
      }
    }
  }
  const countWords = t => (String(t || '').match(/\S+/g) || []).length;
  const guideIds = new Set();
  if (week.guide !== undefined) {
    if (!Array.isArray(week.guide)) fail('lesson part by part', 'must be a list of the lesson\'s sections');
    for (const [n, g] of (Array.isArray(week.guide) ? week.guide : []).entries()) {
      const where = 'lesson part ' + (n + 1) + (g && g.h ? ' (' + g.h + ')' : '');
      if (!g || typeof g.h !== 'string' || !g.h.trim()) { fail(where, 'needs h: the section\'s heading, as the lesson has it'); continue; }
      if (typeof g.id !== 'string' || !/^[A-Za-z][\w-]*$/.test(g.id)) fail(where, 'needs id: the heading\'s anchor on the lesson page (like "title3")');
      else if (guideIds.has(g.id)) fail(where, `id "${g.id}" is used twice`);
      guideIds.add(g.id);
      if (typeof g.ref !== 'string' || !g.ref.trim()) fail(where, 'needs ref: the verses it is about (like "Isaiah 50–52")');
      else checkRefs(where, 'ref', g.ref, null);
      if (g.kids !== undefined && typeof g.kids !== 'boolean') fail(where, 'kids must be true or false');
      const lines = Array.isArray(g.lines) ? g.lines : [];
      if (lines.length < 2 || lines.length > 4) fail(where, `needs 2 to 4 lines (has ${lines.length})`);
      lines.forEach((l, i) => {
        if (typeof l !== 'string' || !l.trim()) return fail(where, `line ${i + 1} is empty`);
        if (countWords(l) > 30) fail(where, `line ${i + 1} is ${countWords(l)} words (max 30)`);
        checkText(where, `line ${i + 1}`, l, null); checkRefs(where, `line ${i + 1}`, l, g.ref); ownWords(where, `line ${i + 1}`, l);
      });
      if (typeof g.ask !== 'string' || !g.ask.trim()) fail(where, 'needs ask: one question to talk about');
      else {
        if (countWords(g.ask) > 25) fail(where, `ask is ${countWords(g.ask)} words (max 25)`);
        checkText(where, 'ask', g.ask, null); checkRefs(where, 'ask', g.ask, g.ref); ownWords(where, 'ask', g.ask);
      }
      if (lessonPage && !norm(lessonPage).includes(norm(g.h))) fail(where, `"${g.h}" isn't a heading on the lesson page`);
    }
  }
  if (week.family !== undefined) {
    const f = week.family, where = 'family night';
    if (!f || typeof f !== 'object') fail(where, 'must be { title, minutes, from, steps }');
    else {
      if (typeof f.title !== 'string' || !f.title.trim() || f.title.length > 40) fail(where, 'needs a title, 40 characters at most');
      if (!Number.isInteger(f.minutes) || f.minutes < 10 || f.minutes > 30) fail(where, 'minutes must be 10 to 30');
      if (!Array.isArray(f.from) || !f.from.length) fail(where, 'from needs the ids of the lesson parts it draws on');
      else for (const id of f.from) if (!guideIds.has(id)) fail(where, `from: "${id}" isn't a lesson part's id`);
      const steps = Array.isArray(f.steps) ? f.steps : [];
      if (steps.length < 4 || steps.length > 6) fail(where, `needs 4 to 6 steps (has ${steps.length})`);
      steps.forEach((s, i) => {
        const at = `step ${i + 1}`;
        if (!s || !['open', 'learn', 'do', 'talk', 'close'].includes(s.k)) return fail(where, `${at}: k must be open, learn, do, talk or close`);
        if (typeof s.text !== 'string' || !s.text.trim()) return fail(where, `${at} is empty`);
        if (countWords(s.text) > 50) fail(where, `${at} is ${countWords(s.text)} words (max 50)`);
        if (s.k === 'learn') { if (typeof s.ref !== 'string' || !s.ref.trim()) fail(where, `${at}: a learn step needs ref, the verses to read`); else checkRefs(where, `${at} ref`, s.ref, null); }
        checkText(where, at, s.text, s.ref || null); checkRefs(where, at, s.text, s.ref || null); ownWords(where, at, s.text);
      });
    }
  }

  // Insight cards (week.insights): one point about verses of the reading,
  // from a page on one of INSIGHT_SITES, in our own words. `find` is words
  // on that page where the point is, checked with --online (a page that
  // won't load is a note, not a failure). A quote is either the KJV's words
  // in the card's verses, or the page's own: one, short, checked online.
  // Whether the card is faithful to the page is Blake's call when he approves.
  if (week.insights !== undefined) {
    const chapters = new Set(block || []), seen = new Set();
    const count = t => (String(t || '').match(/\S+/g) || []).length;
    const chText = ch => { const out = []; for (let v = 1; verses.has(`${ch}:${v}`); v++) out.push(verses.get(`${ch}:${v}`)); return out.join(' '); };
    if (!Array.isArray(week.insights)) fail('insights', 'must be a list of cards');
    for (const [n, x] of (Array.isArray(week.insights) ? week.insights : []).entries()) {
      const where = 'insight ' + ((x && x.id) || n + 1);
      if (!x || typeof x !== 'object') { fail(where, 'must be a card'); continue; }
      if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(x.id || '')) fail(where, 'needs an id of lowercase words and dashes, like "isa40-eagles"');
      if (seen.has(x.id)) fail(where, 'its id is used twice in the week');
      seen.add(x.id);
      // Its verses: a chapter of the reading, or verses in one.
      const m = /^(.+? \d+)(?::(\d+)(?:–(\d+))?)?$/.exec(x.ref || '');
      const ch = m && m[1], from = m && m[2] ? Number(m[2]) : 0, to = m && m[3] ? Number(m[3]) : from;
      let home = null;
      if (!m) fail(where, `ref "${x.ref}" must be a chapter or verses, like "Isaiah 53" or "Isaiah 40:28–31"`);
      // A week with no chapters to read (Christmas): any chapter of the scriptures.
      else if (chapters.size ? !chapters.has(ch) : !verses.has(`${ch}:1`)) fail(where, chapters.size ? `${x.ref} is not in this week's reading (${week.reference})` : `${x.ref} does not exist`);
      else if (m[3] && to <= from) fail(where, `${x.ref}: a range goes from the lower verse to the higher`);
      else if (from && !(verses.has(`${ch}:${from}`) && verses.has(`${ch}:${to}`))) fail(where, `${x.ref} does not exist`);
      else home = `${ch}:${from || 1}`;
      const refText = !home ? '' : from ? Array.from({ length: to - from + 1 }, (_, k) => verses.get(`${ch}:${from + k}`)).join(' ') : chText(ch);
      if (x.kind !== undefined && !['quote', 'video'].includes(x.kind)) { fail(where, `kind "${x.kind}": a card is an insight (no kind), a quote, or a video`); continue; }
      if (x.kind !== undefined && x.deep !== undefined) fail(where, 'a deep dive goes under an insight card, not a quote or a video');
      // A video card: a clip of 10 minutes or less on the week's reading, from
      // an approved channel (asked of YouTube itself), shown once watched.
      if (x.kind === 'video') {
        const v = x.video && typeof x.video === 'object' ? x.video : {};
        if (typeof x.title !== 'string' || !x.title.trim() || x.title.length > 50) fail(where, 'needs a title of 50 characters or fewer');
        if (count(x.text) < 15 || count(x.text) > 60) fail(where, `text is ${count(x.text)} words (15 to 60): what it covers, one thing to watch for`);
        if (/"/.test(x.text || '') || /"/.test(x.title || '')) fail(where, 'uses a straight " quote; use “curly quotes”');
        if (!/^[A-Za-z0-9_-]{11}$/.test(v.youtube || '')) fail(where, 'video.youtube must be an 11-character YouTube id');
        if (!(Number.isInteger(v.start) && Number.isInteger(v.end) && v.end > v.start)) fail(where, 'video needs whole-second start < end');
        else if (v.end - v.start > MEDIA.maxVideoSeconds) fail(where, `video is ${v.end - v.start}s (max ${MEDIA.maxVideoSeconds})`);
        if (!v.title) fail(where, 'video needs its title');
        if (!MEDIA.channels.includes(v.channel)) fail(where, `channel "${v.channel}" isn't on the approved list in tools/verify.mjs`);
        if (v.previewed !== true) note(`${where}: video ${v.youtube} ${v.start}–${v.end}s is hidden until a parent watches it (approving the card marks it watched)`);
        await checkOwner(where, v);
        if (home) checkRefs(where, 'text', x.text, home);
        continue;
      }
      // A quote card: a prophet's or apostle's own words on the verses, found
      // word for word on the Church's page or a BYU devotional (--online).
      if (x.kind === 'quote') {
        const s = x.source && typeof x.source === 'object' ? x.source : {};
        let url = null;
        try { url = new URL(s.url); } catch (e) {}
        const host = url && url.protocol === 'https:' ? url.hostname : '';
        if (!(host === 'www.churchofjesuschrist.org' && /^\/study\//.test(url.pathname)) && host !== 'speeches.byu.edu') fail(where, 'a quote comes from a Gospel Library page (churchofjesuschrist.org/study/…) or BYU Speeches');
        else if (host === 'speeches.byu.edu' && s.by !== 'BYU Speeches') fail(where, 'source.by for speeches.byu.edu is "BYU Speeches"');
        if (!s.by || !s.title || !s.who) fail(where, 'source needs by, who (the speaker) and title');
        if (count(x.quote) < 8 || count(x.quote) > 40) fail(where, `the quote is ${count(x.quote)} words (8 to 40)`);
        const qt = String(x.quote || '').trim();
        if (/"/.test(qt) || /^“/.test(qt) || (qt.match(/“/g) || []).length !== (qt.match(/”/g) || []).length) fail(where, 'the quote goes without its own quote marks (the app adds them), and with balanced “curly” ones inside it');
        if (x.text && count(x.text) > 40) fail(where, `text is ${count(x.text)} words (40 at most)`);
        if (/"/.test(x.text || '')) fail(where, 'text uses a straight " quote; use “curly quotes”');
        if (/\b(thee|thou|thy|thine|ye|hath|saith|doth|shalt|unto)\b/i.test(String(x.text || '').replace(/“[^”]*”/g, ' '))) fail(where, 'text has KJV English outside a quote');
        if (url && host) {
          const page = pages.get(s.url);
          if (!online) note(`${where}: ${s.url} not checked (run with --online)`);
          else if (page != null && !quoteMatches(x.quote.replace(/[‘’]/g, "'"), page.replace(/[‘’]/g, "'"))) fail(where, `the quote isn't on ${s.url} word for word`);
        }
        if (home) { checkRefs(where, 'quote', x.quote, home); if (x.text) checkRefs(where, 'text', x.text, home); }
        continue;
      }
      if (typeof x.title !== 'string' || !x.title.trim() || x.title.length > 50) fail(where, 'needs a title of 50 characters or fewer');
      const words = count(x.text);
      if (words < 25 || words > 90) fail(where, `text is ${words} words (25 to 90)`);
      for (const [label, t] of [['title', x.title], ['text', x.text]]) {
        const v = String(t || '');
        if (/"/.test(v)) fail(where, `${label} uses a straight " quote; use “curly quotes”`);
        if ((v.match(/“/g) || []).length !== (v.match(/”/g) || []).length) fail(where, `${label} has unbalanced “quotes”`);
        if (/\b(thee|thou|thy|thine|ye|hath|saith|doth|shalt|unto)\b/i.test(v.replace(/“[^”]*”/g, ' '))) fail(where, `${label} has KJV English outside a quote`);
      }
      // Quotes: the verses' words, or else the page's (one at most, short).
      const own = (String(x.text || '').match(/“[^”]*”/g) || []).map(q => q.slice(1, -1)).filter(q => !(refText && quoteMatches(q, refText)));
      if (own.length > 1) fail(where, `quotes the page ${own.length} times; once at most (a scripture quote must be the KJV's words in ${x.ref})`);
      for (const q of own) if (count(q) > 15) fail(where, `“${q}” is ${count(q)} words; a quote from the page is 15 at most (a scripture quote must be the KJV's words in ${x.ref})`);
      // Its page: on one of the sites Blake chose, credited by its name.
      const s = x.source && typeof x.source === 'object' ? x.source : {};
      let url = null;
      try { url = new URL(s.url); } catch (e) {}
      const site = url && url.protocol === 'https:' ? INSIGHT_SITES[url.hostname] : null;
      if (!site) fail(where, `source.url must be an https page on ${Object.keys(INSIGHT_SITES).join(', ')}`);
      else if (url.hostname === 'www.churchofjesuschrist.org' && !/^\/study\//.test(url.pathname)) fail(where, 'a Church source must be a Gospel Library page (churchofjesuschrist.org/study/…)');
      else if (site.by && s.by !== site.by) fail(where, `source.by for ${url.hostname} is "${site.by}"`);
      if (!s.by || !s.title || String(s.by).length > 40) fail(where, 'source needs by (40 characters or fewer) and title');
      if (s.who != null && typeof s.who !== 'string') fail(where, 'source.who is a name, or empty');
      if (count(x.find) < 4 || count(x.find) > 30) fail(where, 'find: 4 to 30 words copied exactly from the page');
      else if (site) {
        const page = pages.get(s.url);
        if (!online) note(`${where}: ${s.url} not checked (run with --online)`);
        else if (page != null) {
          const text = norm(page);
          if (!text.includes(trimPunct(norm(x.find)))) fail(where, `"${x.find}" is not on ${s.url} (check the link and the exact wording: a wrong link can still load a page)`);
          for (const q of own) if (!text.includes(trimPunct(norm(q)))) fail(where, `“${q}” is not on ${s.url}`);
        }
      }
      if (home) { checkRefs(where, 'title', x.title, home); checkRefs(where, 'text', x.text, home); }
      // A Joseph Smith Papers card's `note`: the same point in a line, shown
      // under the first of its verses in the reader's Notes, with the page.
      // 8 to 45 words; a quote is the KJV's words in its verses, or Joseph's
      // own from the page (one, 15 words or fewer, found there with --online).
      if (x.note !== undefined) {
        const v = String(x.note || ''), w3 = where + ' note';
        if (!url || url.hostname !== 'www.josephsmithpapers.org') fail(w3, 'a note under the verse is for a Joseph Smith Papers card');
        if (count(v) < 8 || count(v) > 45) fail(w3, `${count(v)} words (8 to 45)`);
        if (/"/.test(v)) fail(w3, 'uses a straight " quote; use “curly quotes”');
        if ((v.match(/“/g) || []).length !== (v.match(/”/g) || []).length) fail(w3, 'has unbalanced “quotes”');
        if (/\b(thee|thou|thy|thine|ye|hath|saith|doth|shalt|unto)\b/i.test(v.replace(/“[^”]*”/g, ' '))) fail(w3, 'has KJV English outside a quote');
        const nq = (v.match(/“[^”]*”/g) || []).map(q => q.slice(1, -1)).filter(q => !(refText && quoteMatches(q, refText)));
        if (nq.length > 1) fail(w3, `quotes the page ${nq.length} times; once at most`);
        for (const q of nq) {
          if (count(q) > 15) fail(w3, `“${q}” is ${count(q)} words; 15 at most`);
          const page = online && site ? pages.get(s.url) : null;
          if (page != null && !norm(page).includes(trimPunct(norm(q)))) fail(w3, `“${q}” is not on ${s.url}`);
        }
        if (home) checkRefs(w3, 'note', v, home);
      }
      // Its note in the reader (Blake, 2026-10-07): `glance`, one sentence
      // under its first verse (5 to 24 words); `short`, "In a sentence", what
      // a child or youth reads first (5 to 30 words); `place`, 'note' (it
      // leaves the Study tab) or 'both'. Our own words: a quote is the verses'
      // own, or the card's, or at most one of 12 words or fewer from the page
      // (found there with --online). Shown once approved, on its own.
      if (x.margin !== undefined) {
        const g = x.margin && typeof x.margin === 'object' ? x.margin : {}, w4 = where + ' note in the reader';
        const extra = Object.keys(g).filter(k => !['glance', 'short', 'place', 'approved'].includes(k));
        if (extra.length) fail(w4, `has ${extra.join(', ')}; a note has glance, short and place`);
        if (x.kind === 'video') fail(w4, 'a video card stays a card, with no note');
        if (!['note', 'both'].includes(g.place)) fail(w4, 'place must be "note" (a note only) or "both" (a card too)');
        if (count(g.glance) < 5 || count(g.glance) > 24) fail(w4, `glance is ${count(g.glance)} words (5 to 24)`);
        if (count(g.short) < 5 || count(g.short) > 30) fail(w4, `short is ${count(g.short)} words (5 to 30)`);
        if ((String(g.glance || '').match(/[.?](\s|$)/g) || []).length > 1) fail(w4, 'glance is one sentence');
        const both = [g.glance, g.short].map(t => String(t || '')).join(' ');
        if (/["']/.test(both)) fail(w4, 'uses a straight quote; use “ ” ’');
        if (/!/.test(both)) fail(w4, 'has an exclamation mark');
        if ((both.match(/“/g) || []).length !== (both.match(/”/g) || []).length) fail(w4, 'has unbalanced “quotes”');
        if (/\b(thee|thou|thy|thine|ye|hath|saith|doth|shalt|unto)\b/i.test(both.replace(/“[^”]*”/g, ' '))) fail(w4, 'has KJV English outside a quote');
        const own = [x.text, x.quote, x.note, x.title, ...((x.deep && x.deep.paras) || [])].filter(Boolean).join(' ');
        const nq = [...new Set((both.match(/“[^”]*”/g) || []).map(q => q.slice(1, -1)))].filter(q => !(refText && quoteMatches(q, refText)) && !quoteMatches(q, own));
        if (nq.length > 1) fail(w4, `quotes the page ${nq.length} times; once at most`);
        for (const q of nq) {
          if (count(q) > 12) fail(w4, `“${q}” is ${count(q)} words; 12 at most`);
          const page = online && site ? pages.get(s.url) : null;
          if (page != null && !norm(page).includes(trimPunct(norm(q)))) fail(w4, `“${q}” is not on ${s.url}`);
        }
        if (!g.approved || g.approved !== approvalHash(withoutApproval(g))) note(`${w4}: ${g.approved ? 'changed since it was approved' : 'not approved yet'}; the card shows without it until it is`);
      }
      // Its deep dive (Blake, 2026-10-03: "Longer adult level deep dive would
      // be great!"), folded under the card: the same point at length for a
      // grown-up, from the same page, in our own words. 2 to 6 paragraphs,
      // 80 to 450 words in all. Quotes: the verses' words, or the page's, 3
      // at most and 25 words or fewer each, found on the page with --online,
      // as are its `find` words (where on the page its points are). `listen`,
      // if it has one, is the stretch of the episode it's from: 10 minutes at
      // most, from an approved channel (asked of YouTube), hidden until a
      // parent has watched it, like any clip.
      if (x.deep !== undefined) {
        const d = x.deep && typeof x.deep === 'object' ? x.deep : {}, w2 = where + ' deep dive';
        const paras = Array.isArray(d.paras) ? d.paras : [];
        if (paras.length < 2 || paras.length > 6 || !paras.every(t => typeof t === 'string' && t.trim())) fail(w2, 'paras: 2 to 6 paragraphs');
        const all = paras.join(' '), n = count(all);
        if (n < 80 || n > 450) fail(w2, `${n} words (80 to 450)`);
        paras.forEach((t, k) => { if (count(t) > 130) fail(w2, `paragraph ${k + 1} is ${count(t)} words (130 at most)`); });
        if (/"/.test(all)) fail(w2, 'uses a straight " quote; use “curly quotes”');
        if ((all.match(/“/g) || []).length !== (all.match(/”/g) || []).length) fail(w2, 'has unbalanced “quotes”');
        if (/\b(thee|thou|thy|thine|ye|hath|saith|doth|shalt|unto)\b/i.test(all.replace(/“[^”]*”/g, ' '))) fail(w2, 'has KJV English outside a quote');
        const quotes = (all.match(/“[^”]*”/g) || []).map(q => q.slice(1, -1)).filter(q => !(refText && quoteMatches(q, refText)));
        if (quotes.length > 3) fail(w2, `quotes the page ${quotes.length} times; 3 at most (a scripture quote of ${x.ref} doesn't count)`);
        for (const q of quotes) if (count(q) > 25) fail(w2, `“${q}” is ${count(q)} words; a quote from the page is 25 at most`);
        const finds = [].concat(d.find || []);
        if (!finds.length || finds.length > 6 || finds.some(f => count(f) < 4 || count(f) > 30)) fail(w2, 'find: 1 to 6 passages of 4 to 30 words, each copied exactly from the page');
        else if (site && online) {
          const page = pages.get(s.url);
          if (page != null) {
            const text = norm(page);
            for (const f of finds) if (!text.includes(trimPunct(norm(f)))) fail(w2, `"${f}" is not on ${s.url}`);
            for (const q of quotes) if (!text.includes(trimPunct(norm(q)))) fail(w2, `“${q}” is not on ${s.url}`);
          }
        }
        if (!d.approved || d.approved !== approvalHash(withoutApproval(d))) note(`${w2}: ${d.approved ? 'changed since it was approved' : 'not approved yet'}; the card shows without it until it is`);
        if (d.listen !== undefined) {
          const v = d.listen && typeof d.listen === 'object' ? d.listen : {};
          if (!/^[A-Za-z0-9_-]{11}$/.test(v.youtube || '')) fail(w2, 'listen.youtube must be an 11-character YouTube id');
          if (!(Number.isInteger(v.start) && Number.isInteger(v.end) && v.end > v.start)) fail(w2, 'listen needs whole-second start < end');
          else if (v.end - v.start > MEDIA.maxVideoSeconds) fail(w2, `listen is ${v.end - v.start}s (max ${MEDIA.maxVideoSeconds})`);
          if (!v.title) fail(w2, 'listen needs its title');
          if (!MEDIA.channels.includes(v.channel)) fail(w2, `channel "${v.channel}" isn't on the approved list in tools/verify.mjs`);
          if (v.previewed !== true) note(`${w2}: its clip ${v.youtube} ${v.start}–${v.end}s is hidden until a parent watches it (approving the card marks it watched)`);
          await checkOwner(w2, v);
        }
        if (home) paras.forEach((t, k) => checkRefs(w2, 'paragraph ' + (k + 1), t, home));
      }
    }
  }

  const lessonText = pages.get(week.lesson);
  if (online && lessonText != null) {
    for (const [label, want] of [['title', week.title], ['reference', week.reference], ['dates', week.dates.replace(/, \d{4}$/, '')], ...week.sections.map(s => ['section', s])]) {
      if (!lessonText.includes(want)) fail('lesson', `${label} "${want}" is not on the lesson page`);
    }
  }
}

const scripture = await loadScripture();
const APP_BOOKS = appBooks();
{
  const missing = scripture.books.filter(b => !APP_BOOKS.includes(b));
  if (missing.length) failures.push(`index.html: BOOK_PATHS has no Gospel Library link for ${missing.join(', ')}`);
}
const weeks = loadWeeks();
// content/upcoming/: weeks written ahead, waiting for room in weeks.js
// (tools/upcoming-weeks.mjs brings them in). Checked with the rest, so a
// mistake shows when the week is written, not the day it comes in. Not
// on the live app yet, they needn't be approved yet (--require-approval):
// one waiting week months ahead mustn't hold back every deploy.
const waiting = new Set();
{
  const dir = path.join(ROOT, 'content', 'upcoming');
  for (const f of fs.existsSync(dir) ? fs.readdirSync(dir).filter(x => x.endsWith('.json')).sort() : []) {
    let w;
    try { w = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); }
    catch (e) { failures.push(`content/upcoming/${f}: not valid JSON (${e.message})`); continue; }
    // Published into weeks.js from developer mode: that copy is the one kept.
    if (weeks.some(x => x.dates === w.dates)) notes.push(`content/upcoming/${f}: ${w.dates} is in weeks.js already, so tools/upcoming-weeks.mjs drops this copy`);
    else { weeks.push(w); waiting.add(w); }
  }
}
const boards = loadBoards();
// content/sunday.js: the Sunday classes' study (Blake, 2026-10-03: "We need
// to incorporate sunday lesson study as well.... Javan needs to study YM
// lessons, and Chantel and I the conference talks").
const sunday = (() => {
  const f = path.join(ROOT, 'content', 'sunday.js');
  if (!fs.existsSync(f)) return null;
  const box = {};
  try { new Function('window', fs.readFileSync(f, 'utf8'))(box); } catch (e) { failures.push('content/sunday.js: ' + e.message); return null; }
  if (!box.TU_SUNDAY || typeof box.TU_SUNDAY !== 'object') { failures.push('content/sunday.js must set window.TU_SUNDAY = { youth: [...], conference: [...] }'); return null; }
  return box.TU_SUNDAY;
})();
const sundayUrls = !sunday ? [] : [
  ...(sunday.youth || []).flatMap(m => (m.lessons || []).map(l => l && l.read)),
  ...(sunday.conference || []).flatMap(c => (c.talks || []).map(t => t && t.url))].filter(u => typeof u === 'string' && GOSPEL_LIBRARY.test(u));
checkBoards(boards, scripture);
checkArcade(loadArcade(), scripture);
const online = args.has('--online') || args.has('--lesson');
const pages = new Map();
if (online) {
  const urls = new Set(weeks.flatMap(week => [week.lesson, ...week.reels.flatMap(r => bonusesOf(r).map(b => webSource(b, week)).filter(Boolean)),
    ...(week.deep || []).map(d => webSource(d, week)).filter(Boolean),
    ...(Array.isArray(week.insights) ? week.insights : []).map(x => x && x.source && x.source.url).filter(u => typeof u === 'string' && /^https:\/\//.test(u))]).concat(sundayUrls));
  // A few at a time: some of the insight sites turn away a burst.
  const queue = [...urls];
  await Promise.all(Array.from({ length: 6 }, async () => { while (queue.length) { const u = queue.shift(); pages.set(u, await fetchPageText(u)); } }));
}

// Weeks: parseable dates, in order, one week each, no reel id reused.
const starts = weeks.map(w => weekStart(w.dates));
starts.forEach((d, i) => { if (!d) failures.push(`${weeks[i].title || 'a week'}: dates "${weeks[i].dates}" must read like "September 28–October 4, 2026"`); });
for (let i = 1; i < starts.length; i++) if (starts[i] && starts[i - 1] && starts[i] <= starts[i - 1]) failures.push(`weeks must be in date order: "${weeks[i].title}" comes before "${weeks[i - 1].title}"`);
const seenIds = new Map();
weeks.forEach(w => w.reels.forEach(r => { if (seenIds.has(r.id)) failures.push(`reel id "${r.id}" is used in both "${seenIds.get(r.id)}" and "${w.title}"`); seenIds.set(r.id, w.title); }));
const seenInsights = new Map();
weeks.forEach(w => (Array.isArray(w.insights) ? w.insights : []).forEach(x => {
  if (!x || !x.id) return;
  if (seenInsights.has(x.id) && seenInsights.get(x.id) !== w.title) failures.push(`insight id "${x.id}" is used in both "${seenInsights.get(x.id)}" and "${w.title}"`);
  seenInsights.set(x.id, w.title);
}));

for (const week of weeks) {
  const num = (/\/(\d+)\?/.exec(week.lesson || '') || [])[1];
  weekLabel = weeks.length > 1 ? `Week ${num || '?'} · ` : '';
  // tools/archive-weeks.mjs names a past week's file by this number, and stops the deploy without it.
  if (!num) failures.push(`${week.title} (${week.dates}): its lesson link must end with the lesson's number, like …/come-follow-me-…/41?lang=eng`);
  await main(scripture, week, pages, online);
  // The live app only takes weeks Blake approved in developer mode. Plain
  // words, short versions, insight cards, treasure words, the lesson part by
  // part and family night are the exception: the app shows each only once
  // it's approved, so they never hold a week back.
  if (args.has('--require-approval') && weekStart(week.dates) >= REVIEW_FROM && !waiting.has(week)) {
    for (const it of reviewItems(week).filter(x => !/^(plain|tldr|insight|treasure|guide):/.test(x.key) && x.key !== 'family')) {
      if (!it.approved) failures.push(`${weekLabel}${it.key}: not approved yet (approve it in developer mode, then publish)`);
      else if (it.approved !== it.hash) failures.push(`${weekLabel}${it.key}: changed since it was approved (approve it again in developer mode)`);
    }
  }
}
weekLabel = '';

// content/plain.js: plain words for chapters no week reads (Blake,
// 2026-10-02: "the notes and plain translation for all of Isaiah"), shown in
// the Scriptures tab once approved, checked like a week's.
let libraryPlain = 0;
{
  const f = path.join(ROOT, 'content', 'plain.js');
  if (fs.existsSync(f)) {
    const box = {};
    try { new Function('window', fs.readFileSync(f, 'utf8'))(box); } catch (e) { failures.push('content/plain.js: ' + e.message); }
    const lib = box.TU_PLAIN;
    if (lib && Array.isArray(lib.plain)) {
      const read = new Set(weeks.flatMap(w => blockChapters(w.reference, scripture.verses) || []));
      const pastIdx = path.join(ROOT, 'content', 'past', 'index.js');
      if (fs.existsSync(pastIdx)) { const b2 = {}; new Function('window', fs.readFileSync(pastIdx, 'utf8'))(b2); (b2.TU_PAST_INDEX || []).forEach(x => (blockChapters(x.reference, scripture.verses) || []).forEach(c => read.add(c))); }
      const all = [...new Set([...scripture.verses.keys()].map(k => k.replace(/:\d+$/, '')))];
      weekLabel = 'content/plain.js · ';
      await main(scripture, { library: true, title: lib.title, plain: lib.plain, chapters: all.filter(c => !read.has(c)) }, pages, online);
      weekLabel = '';
      libraryPlain = lib.plain.length;
    } else failures.push('content/plain.js must set window.TU_PLAIN = { title, plain: [...] }');
  }
}

// content/sunday.js (Blake, 2026-10-03: "Javan needs to study YM lessons,
// and Chantel and I the conference talks"; everyone sees all of it). Since
// September 6, 2026 every class meets each Sunday: Aaronic Priesthood
// quorums and Young Women classes learn from For the Strength of Youth: A
// Guide for Making Choices, a chapter a month; elders quorums and Relief
// Societies from the most recent general conference.
//   youth: [{ month, chapter, title, guide, lessons: [{ id, sunday, title,
//     read, intro, cards: [{ id, hook, body, find, q, right, wrong, why }] }] }]
//     A mini-lesson for each Sunday, in our own words from its page (`read`,
//     Gospel Library), each card's point found there (`find`, --online).
//   conference: [{ id, title, from, talks: [{ id, speaker, title, url,
//     session, quick, points, quotes, scriptures, discuss, deep }] }]
//     Every talk, in the order it was given (the talk-a-day plan from `from`):
//     its speaker's own words (`quotes`, found word for word on its page),
//     the scriptures it uses, and in our own words what it teaches and
//     questions to talk over, with a deep dive under it as an insight card's.
// Our own words show once Blake approves them in developer mode (drafts on
// the test site), so none of it ever holds a deploy back.
let sundayCounts = null;
if (sunday) {
  const words = t => (String(t || '').match(/\S+/g) || []).length;
  const isDate = d => /^\d{4}-\d{2}-\d{2}$/.test(d || '') && !isNaN(Date.parse(d + 'T12:00:00Z'));
  const isSunday = d => isDate(d) && new Date(d + 'T12:00:00Z').getUTCDay() === 0;
  const linkable = APP_BOOKS.slice().sort((a, b) => b.length - a.length).map(b => b.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const refRe = new RegExp(`(${linkable}) (\\d+)(?::(\\d+)(?:[–-](\\d+))?)?`, 'g');
  const refExists = (book, ch, v) => scripture.verses.has(`${BOOK_ALIAS[book] || book} ${ch}:${v || 1}`);
  // Our own words: curly quotes, no KJV English outside a quote, every reference a real one.
  // (KJV English is for a youth's cards only: grown-ups' talk study says "come unto Christ".)
  const ownWords = (where, label, t, grownUp) => {
    const v = String(t || '');
    if (/"/.test(v)) fail(where, `${label} uses a straight " quote; use “curly quotes”`);
    if ((v.match(/“/g) || []).length !== (v.match(/”/g) || []).length) fail(where, `${label} has unbalanced “quotes”`);
    if (!grownUp && /\b(thee|thou|thy|thine|ye|hath|saith|doth|shalt|unto)\b/i.test(v.replace(/“[^”]*”/g, ' '))) fail(where, `${label} has KJV English outside a quote`);
    let m;
    refRe.lastIndex = 0;
    while ((m = refRe.exec(v))) if (!refExists(m[1], m[2], m[3]) || (m[4] && !refExists(m[1], m[2], m[4]))) fail(where, `${label}: ${m[0]} doesn't exist`);
  };
  const onPage = (url, text) => { const page = pages.get(url); return page == null ? null : norm(page).includes(trimPunct(norm(text))); };
  const ids = new Set();
  const uniqueId = (where, id) => {
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id || '')) fail(where, 'needs an id of lowercase words and dashes');
    else if (ids.has(id)) fail(where, `id "${id}" is used twice in content/sunday.js`);
    ids.add(id);
  };
  sundayCounts = { lessons: 0, talks: 0 };
  weekLabel = 'content/sunday.js · ';
  if (sunday.youth !== undefined && !Array.isArray(sunday.youth)) fail('youth', 'must be a list of months');
  for (const m of Array.isArray(sunday.youth) ? sunday.youth : []) {
    const where = 'youth ' + ((m && m.month) || '?');
    if (!m || !/^\d{4}-(0[1-9]|1[0-2])$/.test(m.month || '')) { fail(where, 'month must read like "2026-10"'); continue; }
    if (!(Number.isInteger(m.chapter) && m.chapter >= 1 && m.chapter <= 12)) fail(where, 'chapter: 1 to 12, the guide’s chapter for the month');
    if (!m.title || String(m.title).length > 60) fail(where, 'needs the chapter’s title (60 characters or fewer)');
    if (!GOSPEL_LIBRARY.test(m.guide || '')) fail(where, 'guide: the chapter’s Gospel Library page (churchofjesuschrist.org/study/…)');
    for (const l of Array.isArray(m.lessons) ? m.lessons : []) {
      const lw = where + ' · ' + ((l && l.id) || 'lesson');
      if (!l || typeof l !== 'object') { fail(lw, 'must be a lesson'); continue; }
      uniqueId(lw, l.id);
      if (!isSunday(l.sunday) || !String(l.sunday).startsWith(m.month)) fail(lw, `sunday "${l.sunday}" must be a Sunday of ${m.month}, like "2026-10-04"`);
      if (!l.title || String(l.title).length > 60) fail(lw, 'needs a title (60 characters or fewer)');
      if (!GOSPEL_LIBRARY.test(l.read || '')) fail(lw, 'read: the Gospel Library page the lesson is from (the guide’s section, or the magazine’s lesson page)');
      if (words(l.intro) < 10 || words(l.intro) > 60) fail(lw, `intro is ${words(l.intro)} words (10 to 60)`);
      ownWords(lw, 'intro', l.intro);
      const cards = Array.isArray(l.cards) ? l.cards : [];
      if (cards.length < 2 || cards.length > 5) fail(lw, `has ${cards.length} cards (2 to 5)`);
      for (const c of cards) {
        const cw = lw + ' · ' + ((c && c.id) || 'card');
        if (!c || typeof c !== 'object') { fail(cw, 'must be a card'); continue; }
        uniqueId(cw, c.id);
        if (!c.hook || String(c.hook).length > 60) fail(cw, 'needs a hook (60 characters or fewer)');
        if (words(c.body) < 15 || words(c.body) > 75) fail(cw, `body is ${words(c.body)} words (15 to 75), for a youth`);
        const quotes = (String(c.body || '').match(/“[^”]*”/g) || []).map(q => q.slice(1, -1));
        if (quotes.length > 1) fail(cw, 'quotes the page more than once');
        for (const q of quotes) if (words(q) > 15) fail(cw, `“${q}” is ${words(q)} words; a quote is 15 at most`);
        if (words(c.find) < 4 || words(c.find) > 30) fail(cw, 'find: 4 to 30 words copied exactly from the lesson’s page');
        if (typeof c.q !== 'string' || !/\?$/.test(c.q.trim())) fail(cw, 'q: a question, ending with “?”');
        if (!c.right || !Array.isArray(c.wrong) || c.wrong.length < 2 || c.wrong.length > 3 || c.wrong.includes(c.right)) fail(cw, 'needs right and 2 or 3 different wrong answers');
        if (words(c.why) > 40) fail(cw, `why is ${words(c.why)} words (40 at most)`);
        for (const f of ['hook', 'body', 'q', 'right', 'why']) ownWords(cw, f, c[f]);
        if (online && GOSPEL_LIBRARY.test(l.read || '')) {
          if (onPage(l.read, c.find || '') === false) fail(cw, `"${c.find}" is not on ${l.read}`);
          for (const q of quotes) if (onPage(l.read, q) === false) fail(cw, `“${q}” is not on ${l.read}`);
        } else if (!online) note(`${cw}: ${l.read} not checked (run with --online)`);
      }
      sundayCounts.lessons++;
    }
  }
  if (sunday.conference !== undefined && !Array.isArray(sunday.conference)) fail('conference', 'must be a list of conferences');
  for (const conf of Array.isArray(sunday.conference) ? sunday.conference : []) {
    const where = 'conference ' + ((conf && conf.id) || '?');
    if (!conf || !/^\d{4}-(04|10)$/.test(conf.id || '')) { fail(where, 'id must read like "2026-10" (April or October)'); continue; }
    if (!conf.title) fail(where, 'needs a title, like "October 2026 General Conference"');
    if (!isDate(conf.from)) fail(where, 'from: the day the talk-a-day plan starts, like "2026-10-12"');
    const talks = Array.isArray(conf.talks) ? conf.talks : [];
    if (!talks.length) fail(where, 'needs its talks');
    const [y, mo] = conf.id.split('-');
    for (const t of talks) {
      const tw = where + ' · ' + ((t && t.id) || 'talk');
      if (!t || typeof t !== 'object') { fail(tw, 'must be a talk'); continue; }
      uniqueId(tw, t.id);
      if (!t.speaker || !t.title || !t.session) fail(tw, 'needs speaker, title and session');
      if (!new RegExp(`^https://www\\.churchofjesuschrist\\.org/study/general-conference/${y}/${mo}/`).test(t.url || '')) fail(tw, `url: the talk's Gospel Library page (churchofjesuschrist.org/study/general-conference/${y}/${mo}/…)`);
      // The speaker's own words: found on the talk's page word for word.
      const quotes = Array.isArray(t.quotes) ? t.quotes : [];
      if (quotes.length > 4) fail(tw, `has ${quotes.length} quotes (4 at most)`);
      for (const q of quotes) {
        if (words(q) < 8 || words(q) > 40) fail(tw, `the quote “${String(q).slice(0, 40)}…” is ${words(q)} words (8 to 40)`);
        if (/"/.test(q) || /^“/.test(String(q).trim())) fail(tw, 'a quote goes without its own quote marks (the app adds them)');
        if (online && pages.get(t.url) != null && !quoteMatches(String(q).replace(/[‘’]/g, "'"), pages.get(t.url).replace(/[‘’]/g, "'"))) fail(tw, `the quote “${String(q).slice(0, 50)}…” isn't on ${t.url} word for word`);
      }
      if (!online) note(`${tw}: ${t.url} not checked (run with --online)`);
      for (const r of Array.isArray(t.scriptures) ? t.scriptures : []) {
        const m = new RegExp(`^(${linkable}) (\\d+)(?::(\\d+)(?:[–-](\\d+))?)?$`).exec(r || '');
        if (!m || !refExists(m[1], m[2], m[3]) || (m[4] && !refExists(m[1], m[2], m[4]))) fail(tw, `scripture "${r}" isn't a verse or chapter of the standard works`);
      }
      // Our own words, which wait for approval: what it teaches, and questions to talk over.
      if (t.quick !== undefined) { if (words(t.quick) < 25 || words(t.quick) > 90) fail(tw, `quick is ${words(t.quick)} words (25 to 90)`); ownWords(tw, 'quick', t.quick, true); }
      const points = t.points === undefined ? [] : t.points;
      if (!Array.isArray(points) || points.length > 5 || points.some(x => words(x) < 4 || words(x) > 40)) fail(tw, 'points: up to 5, each 4 to 40 words');
      else points.forEach((x, k) => ownWords(tw, `point ${k + 1}`, x, true));
      const discuss = t.discuss === undefined ? [] : t.discuss;
      if (!Array.isArray(discuss) || discuss.length > 3 || discuss.some(x => !/\?$/.test(String(x).trim()) || words(x) > 30)) fail(tw, 'discuss: up to 3 questions, each 30 words or fewer, ending with “?”');
      else discuss.forEach((x, k) => ownWords(tw, `question ${k + 1}`, x, true));
      if (t.deep !== undefined) {
        const d = t.deep && typeof t.deep === 'object' ? t.deep : {}, paras = Array.isArray(d.paras) ? d.paras : [];
        const all = paras.join(' '), n = words(all);
        if (paras.length < 2 || paras.length > 6) fail(tw + ' deep dive', 'paras: 2 to 6 paragraphs');
        if (n < 80 || n > 450) fail(tw + ' deep dive', `${n} words (80 to 450)`);
        ownWords(tw + ' deep dive', 'its text', all, true);
        const own = (all.match(/“[^”]*”/g) || []).map(q => q.slice(1, -1));
        if (own.length > 3) fail(tw + ' deep dive', `quotes ${own.length} times; 3 at most`);
        for (const q of own) {
          if (words(q) > 25) fail(tw + ' deep dive', `“${q}” is ${words(q)} words; 25 at most`);
          if (online && onPage(t.url, q) === false) fail(tw + ' deep dive', `“${q}” is not on ${t.url}`);
        }
      }
      sundayCounts.talks++;
    }
  }
  weekLabel = '';
}

// The BSB button in the reader (tools/build-reading.mjs builds its chapters
// at deploy): tools/bsb.txt.gz must be the BSB's own text file, public-domain
// header and all, with every Bible chapter of every week's reading, verse
// for verse with the KJV. A Book of Mormon chapter has no BSB, and needs none.
let bsbChapters = 0;
{
  const f = path.join(ROOT, 'tools', 'bsb.txt.gz');
  if (!fs.existsSync(f)) failures.push('tools/bsb.txt.gz is missing: the reader’s BSB comes from it');
  else {
    const text = zlib.gunzipSync(fs.readFileSync(f)).toString('utf8'), head = text.slice(0, 400);
    if (!/Berean Standard Bible/.test(head) || !/dedicated to the public domain/.test(head)) failures.push('tools/bsb.txt.gz must be the BSB’s own text file (bereanbible.com/bsb.txt), public-domain header and all');
    const count = new Map(), books = new Set();
    for (const m of text.matchAll(/^(.+) (\d+):\d+\t/gm)) { count.set(m[1] + ' ' + m[2], (count.get(m[1] + ' ' + m[2]) || 0) + 1); books.add(m[1]); }
    const BSB_BOOK = { 'Psalms': 'Psalm', 'Psalm': 'Psalm', "Solomon's Song": 'Song of Solomon', 'Solomon’s Song': 'Song of Solomon' };
    for (const w of weeks) {
      for (const ch of blockChapters(w.reference, scripture.verses) || []) {
        const [, book, c] = /^(.+) (\d+)$/.exec(ch);
        if (!books.has(BSB_BOOK[book] || book)) continue;
        let n = 0;
        while (scripture.verses.has(`${BOOK_ALIAS[book] || book} ${c}:${n + 1}`)) n++;
        const b = count.get((BSB_BOOK[book] || book) + ' ' + c) || 0;
        if (b !== n) failures.push(`${w.title}: the BSB has ${b} verses of ${ch}, the KJV ${n}`);
        else bsbChapters++;
      }
    }
  }
}

// The ES·TL button in the reader (the Spanish Reina-Valera 1909 and the
// Tagalog 1905 Ang Biblia, built by tools/build-reading.mjs at deploy from
// the files tools/import-bibles.mjs made): each says it's public domain,
// every verse is a verse of the KJV, and every Bible chapter of every week's
// reading is there. The Tagalog has every verse; the Spanish leaves out the
// few the import couldn't be sure of (the reader shows the KJV there), which
// is a note for that week, not a failure.
const langChapters = { es: 0, tl: 0 }, langNotes = [];
for (const [key, file, name, pd, whole] of [['es', 'rv1909.txt.gz', 'Reina-Valera 1909', /Reina-Valera 1909\. Public domain\./, false],
  ['tl', 'tagalog1905.txt.gz', 'Ang Biblia 1905', /1905\. Public domain/, true]]) {
  const f = path.join(ROOT, 'tools', file);
  if (!fs.existsSync(f)) { failures.push(`tools/${file} is missing: the reader’s ${name} comes from it (node tools/import-bibles.mjs)`); continue; }
  const text = zlib.gunzipSync(fs.readFileSync(f)).toString('utf8');
  if (!pd.test(text.slice(0, 400))) failures.push(`tools/${file} must start with its public-domain header (node tools/import-bibles.mjs)`);
  const have = new Set();
  for (const m of text.matchAll(/^(.+) (\d+):(\d+)\t/gm)) {
    if (!scripture.verses.has(`${m[1]} ${m[2]}:${m[3]}`)) failures.push(`tools/${file}: ${m[1]} ${m[2]}:${m[3]} isn’t a verse of the KJV`);
    have.add(`${m[1]} ${m[2]}:${m[3]}`);
  }
  for (const w of weeks) {
    for (const ch of blockChapters(w.reference, scripture.verses) || []) {
      if (!langOf(ch)) continue;                      // the Book of Mormon and the rest: the KJV only
      const [, book, c] = /^(.+) (\d+)$/.exec(ch), b = BOOK_ALIAS[book] || book;
      const missing = [];
      for (let v = 1; scripture.verses.has(`${b} ${c}:${v}`); v++) if (!have.has(`${b} ${c}:${v}`)) missing.push(v);
      if (!missing.length) langChapters[key]++;
      else if (whole || missing.length > 3) failures.push(`${w.title}: the ${name} has no ${ch}:${missing.join(', ')}`);
      else { langChapters[key]++; langNotes.push(`${w.title}: the ${name} has no ${ch}:${missing.join(', ')} (the reader shows the KJV there)`); }
    }
  }
}
for (const n of langNotes) console.log('ℹ', n);

// The Hebrew and Greek button in the reader (tools/original.mjs, built by
// tools/build-reading.mjs at deploy): every Bible chapter of every week's
// reading has every one of its KJV verses, word by word.
let origChapters = 0;
{
  const want = [...new Set(weeks.flatMap(w => blockChapters(w.reference, scripture.verses) || []))].filter(langOf);
  let orig = null;
  try { orig = await loadOriginal(CACHE, want); } catch (e) { failures.push('The Hebrew and Greek words: ' + e.message); }
  if (orig) for (const ch of want) {
    const [, book, c] = /^(.+) (\d+)$/.exec(ch);
    let n = 0;
    while (scripture.verses.has(`${BOOK_ALIAS[book] || book} ${c}:${n + 1}`)) n++;
    const o = orig.get(ch), lang = langOf(ch) === 'he' ? 'Hebrew' : 'Greek';
    const missing = o ? Array.from({ length: n }, (_, i) => i + 1).filter(v => !(o.v[v - 1] && o.v[v - 1].length)) : [];
    if (!o) failures.push(`The ${lang} of ${ch} isn't in the STEPBible data`);
    else if (o.v.length !== n || missing.length) failures.push(`The ${lang} of ${ch}: ${o.v.length} verses for the KJV's ${n}${missing.length ? ', none for verse ' + missing.join(', ') : ''}`);
    else origChapters++;
  }
}

// Treasure words (Blake, 2026-10-06, of the Hebrew: "What about super easy to
// understand version"): five to seven Hebrew or Greek words a week, each
// explained for Javan, shown in the reader, as the Word of the Day on Today
// and in Wika's Hebrew and Greek courses (tools/wika-words.mjs). Each is the
// word that verse really has in STEPBible's data, with that Strong's number,
// and the KJV words it's translated by are in the verse; a word is taught in
// one week only. Shown once approved, like plain words.
let treasureCount = 0, treasureWeeks = 0;
{
  const items = weeks.flatMap(w => (Array.isArray(w.treasure) ? w.treasure : []).map(x => ({ w, x })));
  const chOf = r => (/^(.+ \d+):\d+$/.exec(r || '') || [])[1];
  let orig = null;
  if (items.length) try { orig = await loadOriginal(CACHE, [...new Set(items.map(({ x }) => chOf(x.ref)).filter(Boolean))].filter(langOf)); } catch (e) { failures.push('Treasure words: ' + e.message); }
  const ids = new Set(), byStrong = new Map(), clean = t => String(t || '').replace(/[־.,;:·]+$/, '').normalize('NFC');
  const count = t => String(t || '').trim().split(/\s+/).filter(Boolean).length;
  for (const w of weeks) if (Array.isArray(w.treasure) && w.treasure.length) {
    treasureWeeks++;
    if (w.treasure.length < 5 || w.treasure.length > 7) failures.push(`${w.title}: ${w.treasure.length} treasure words (5 to 7 a week)`);
  }
  for (const { w, x } of items) {
    const where = `${w.title}: treasure word ${x.id || '?'}`;
    if (!/^[a-z0-9]+(-[a-z0-9]+)+$/.test(x.id || '')) failures.push(`${where}: id like "jer31-chesed"`);
    else if (ids.has(x.id)) failures.push(`${where}: its id is used twice`);
    ids.add(x.id);
    const m = /^(.+) (\d+):(\d+)$/.exec(x.ref || ''), ch = chOf(x.ref);
    if (!m) { failures.push(`${where}: ref like "Jeremiah 31:3"`); continue; }
    const text = scripture.verses.get(`${BOOK_ALIAS[m[1]] || m[1]} ${m[2]}:${m[3]}`);
    if (!text) { failures.push(`${where}: ${x.ref} doesn't exist`); continue; }
    const block = blockChapters(w.reference, scripture.verses);
    if (block && block.length && !block.includes(ch)) failures.push(`${where}: ${ch} isn't in this week's reading`);
    const o = orig && orig.get(ch), lang = langOf(ch);
    if (!o) { failures.push(`${where}: no Hebrew or Greek for ${ch}`); continue; }
    const hit = (o.v[Number(m[3]) - 1] || []).find(v => clean(v[0]) === clean(x.form));
    const base = String(x.strong || '').replace(/[A-Z]$/, '');
    if (!(lang === 'he' ? /^H\d+[A-Z]?$/ : /^G\d+[A-Z]?$/).test(x.strong || '')) failures.push(`${where}: strong like ${lang === 'he' ? 'H2617A' : 'G4990'}`);
    if (!hit) failures.push(`${where}: "${x.form}" isn't a word of ${x.ref} in the ${lang === 'he' ? 'Hebrew' : 'Greek'}`);
    else if (String(hit[3]).replace(/[A-Z]$/, '') !== base) failures.push(`${where}: "${x.form}" in ${x.ref} is ${hit[3]}, not ${x.strong}`);
    if (byStrong.has(base) && byStrong.get(base) !== w.title) failures.push(`${where}: ${base} is a treasure word in ${byStrong.get(base)} too (one week only)`);
    byStrong.set(base, w.title);
    if (!x.word) failures.push(`${where}: needs word, its dictionary form`);
    if (!/^[A-Za-z]+(-[A-Za-z]+)*$/.test(x.say || '') || !/[A-Z]{2}/.test(x.say || '')) failures.push(`${where}: say like "KHEH-sed"`);
    if (!x.kjv || !text.toLowerCase().includes(String(x.kjv).toLowerCase())) failures.push(`${where}: “${x.kjv}” isn't in the KJV of ${x.ref}`);
    if (count(x.means) < 6 || count(x.means) > 30) failures.push(`${where}: means is ${count(x.means)} words (6 to 30)`);
    if (x.more !== undefined && (count(x.more) < 6 || count(x.more) > 40)) failures.push(`${where}: more is ${count(x.more)} words (6 to 40)`);
    if (/["']/.test([x.means, x.more, x.kjv].join(' '))) failures.push(`${where}: uses a straight quote; use “ ” ’`);
    if (x.short !== undefined && (count(x.short) < 1 || count(x.short) > 4)) failures.push(`${where}: short is ${count(x.short)} words (1 to 4: Wika’s choices)`);
    treasureCount++;
  }
}
if (treasureCount) console.log(`✓ Treasure words: ${treasureCount} in ${treasureWeeks} weeks, each the word its verse has in the Hebrew or Greek`);

// Past weeks (content/past/, written by tools/archive-weeks.mjs): every
// week its index lists has its file, with the same dates and title, so Past
// weeks can open it. And weeks.js holds last week and later: older weeks
// belong in content/past/, which keeps weeks.js small.
{
  const dir = path.join(ROOT, 'content', 'past'), index = [];
  if (fs.existsSync(path.join(dir, 'index.js'))) {
    const w = {};
    try { new Function('window', fs.readFileSync(path.join(dir, 'index.js'), 'utf8'))(w); index.push(...(w.TU_PAST_INDEX || [])); }
    catch (e) { failures.push('content/past/index.js: ' + e.message); }
  }
  for (const p of index) {
    const f = path.join(dir, `week-${p.num}.js`), w = {};
    if (!fs.existsSync(f)) { failures.push(`content/past/index.js lists week ${p.num} (${p.dates}), but content/past/week-${p.num}.js isn't there`); continue; }
    try { new Function('window', fs.readFileSync(f, 'utf8'))(w); } catch (e) { failures.push(`content/past/week-${p.num}.js: ${e.message}`); continue; }
    const week = (w.TU_PAST || {})[p.num];
    if (!week || week.dates !== p.dates || week.title !== p.title) failures.push(`content/past/week-${p.num}.js doesn't hold ${p.title} (${p.dates}) under ${p.num}`);
    if (weeks.some(x => x.dates === p.dates)) failures.push(`${p.dates} is in both content/weeks.js and content/past/: keep it in one`);
  }
  const today = utahToday();
  const started = weeks.map(w => weekStart(w.dates)).filter(s => s && s <= today).sort();
  const old = started.length >= 2 ? started.slice(0, -2).length : 0;
  if (old) note(`content/weeks.js holds ${old} ${old === 1 ? 'week' : 'weeks'} older than last week: node tools/archive-weeks.mjs moves ${old === 1 ? 'it' : 'them'} to content/past/, where Past weeks still opens ${old === 1 ? 'it' : 'them'}`);
}

for (const n of notes) console.log('  · ' + n);
if (unreached.length && process.env.GITHUB_ACTIONS) {
  const hosts = [...new Set(unreached.map(u => new URL(u).host))].join(', ');
  console.log(`::warning title=Online checks::${unreached.length} page${unreached.length === 1 ? '' : 's'} couldn't be reached (${hosts}); what cites ${unreached.length === 1 ? 'it' : 'them'} wasn't checked this time`);
}
if (failures.length) {
  console.error(`✗ ${failures.length} problem${failures.length === 1 ? '' : 's'}:\n`);
  for (const f of failures) console.error('  - ' + f);
  // In GitHub Actions each problem is also an annotation on the commit,
  // which is how developer mode shows Blake what the checker found.
  if (process.env.GITHUB_ACTIONS) {
    const clean = t => t.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
    for (const f of failures.slice(0, 10)) console.log(`::error title=Content check::${clean(f)}`);
  }
  process.exit(1);
}
for (const week of weeks) {
  const quotes = week.reels.reduce((n, r) => n + 1 + [r.hook, r.body, r.question.q, r.question.why, ...bonusesOf(r).map(b => b.why)].join(' ').split('“').length - 1, 0);
  const bonuses = week.reels.reduce((n, r) => n + bonusesOf(r).length, 0);
  const extras = [(week.deep || []).length && `${week.deep.length} Go-deeper readings`, week.puzzle && 'the weekly puzzle', week.sayings && `${week.sayings.length} Who-said-it lines`, week.words && `${week.words.length} Verse Words`,
    (week.plain || []).length && `plain words for ${week.plain.length} ${week.plain.length === 1 ? 'chapter' : 'chapters'}`,
    (week.tldr || []).length && `short versions for ${week.tldr.length} ${week.tldr.length === 1 ? 'chapter' : 'chapters'}`,
    (week.insights || []).length && `${week.insights.length} insight ${week.insights.length === 1 ? 'card' : 'cards'}`].filter(Boolean);
  console.log(`✓ ${week.title} (${week.dates}): ${week.reels.length} reels, ${quotes} quotes and ${bonuses} bonus answers checked` +
    (extras.length ? `, plus ${extras.join(' and ')}` : ''));
}
if (sundayCounts) console.log(`✓ content/sunday.js: ${sundayCounts.lessons} Sunday ${sundayCounts.lessons === 1 ? 'lesson' : 'lessons'} for the youth, ${sundayCounts.talks} conference ${sundayCounts.talks === 1 ? 'talk' : 'talks'}`);
if (libraryPlain) console.log(`✓ content/plain.js: plain words for ${libraryPlain} ${libraryPlain === 1 ? 'chapter' : 'chapters'} no week reads`);
if (bsbChapters) console.log(`✓ BSB: the ${bsbChapters} Bible chapters of the reading, verse for verse with the KJV`);
if (langChapters.es || langChapters.tl) console.log(`✓ ES·TL: the ${langChapters.es} Bible chapters of the reading in Spanish (Reina-Valera 1909), the ${langChapters.tl} in Tagalog (Ang Biblia 1905), each verse under its KJV verse`);
if (origChapters) console.log(`✓ Hebrew and Greek: the ${origChapters} Bible chapters of the reading, every KJV verse word by word (STEPBible.org, Tyndale House)`);
if (boards.length) console.log(`✓ ${boards.map(b => `${b.title}: ${b.lands.length} lands, ${b.links.length} borders, ${b.kingdoms.length} kingdoms`).join('; ')}`);
if (online) {
  const loaded = [...pages.values()].filter(t => t != null).length;
  console.log(`✓ ${loaded} of ${pages.size} pages checked live (Gospel Library, and the insight cards' sources)`);
}
