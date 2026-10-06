#!/usr/bin/env node
// Be still's Verse by verse (Blake, 2026-10-06: build it on Old Testament
// chant: "map the ancient punctuation marks (cantillation/Te'amim) to
// breathing ... The Etnachta Breath ... The Sof Pasuq Rest"). The Hebrew Bible
// was chanted, and its te'amim (chanting marks) tell the reader where words
// join and where to pause; the etnachta (U+0591) halves a verse and the sof
// pasuq ends it. This finds each verse's etnachta in STEPBible's Hebrew (the
// marks the reader's Hebrew button leaves out), and splits the KJV verse at
// the matching place: the colon or semicolon nearest the same share of the
// verse (the KJV's translators often put one there), else a comma, else the
// nearest word. It writes content/still.js; tools/verify.mjs checks each
// verse's halves are the KJV's words and the Hebrew's, whole and in order.
//   node tools/build-still.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadOriginal } from './original.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const CACHE = process.env.SCRIPTURE_CACHE || path.join(ROOT, 'tools', '.scripture-cache');
// Calm passages, each a run of verses in one chapter.
export const PASSAGES = [
  { id: 'ps23', title: 'The Lord is my shepherd', ch: 'Psalms 23', from: 1, to: 6 },
  { id: 'ps46', title: 'Be still, and know', ch: 'Psalms 46', from: 1, to: 3, more: [10, 11] },
  { id: 'ps121', title: 'I will lift up mine eyes', ch: 'Psalms 121', from: 1, to: 8 },
  { id: 'isa40', title: 'They that wait upon the Lord', ch: 'Isaiah 40', from: 28, to: 31 },
  { id: 'lam3', title: 'New every morning', ch: 'Lamentations 3', from: 22, to: 26 },
  { id: 'prov3', title: 'Trust in the Lord', ch: 'Proverbs 3', from: 5, to: 6 },
  { id: 'isa26', title: 'Perfect peace', ch: 'Isaiah 26', from: 3, to: 4 },
  { id: 'ps1', title: 'Like a tree by the rivers', ch: 'Psalms 1', from: 1, to: 3 }
];
const RAW = { Psalms: 'Job-Sng', Proverbs: 'Job-Sng', Isaiah: 'Isa-Mal', Lamentations: 'Isa-Mal' };
const CODE = { Psalms: 'Psa', Proverbs: 'Pro', Isaiah: 'Isa', Lamentations: 'Lam' };
// The marks that divide a verse, strongest first. In the prose books the
// etnachta (U+0591) halves it; a short verse may have none, and then the next
// strongest does: segol, zaqef, tipcha. Psalms, Proverbs and Job are chanted
// another way, where oleh ve-yored (ole U+05AB over the word, merkha under)
// divides a long verse before the etnachta, and a short one may divide at revia (U+0597).
const POETIC = new Set(['Psalms', 'Proverbs', 'Job']);
const MAIN = {
  prose: [/\u0591/, /\u0592/, /[\u0594\u0595]/, /\u0596/, /\u0597/],
  poetic: [/\u05AB/, /\u0591/, /\u0597/, /\u059D/]
};

function kjvVerses() {
  const v = new Map();
  for (const f of ['3bda76e-old-testament.json']) {
    for (const b of JSON.parse(fs.readFileSync(path.join(CACHE, f), 'utf8')).books)
      for (const c of b.chapters) for (const x of c.verses) v.set(x.reference, x.text);
  }
  return v;
}
// Each word of a verse in the raw data, in order, with whether it carries the etnachta.
function rawWords(book, c, v) {
  const file = fs.readdirSync(CACHE).find(f => f.startsWith('stepbible-') && f.includes('TAHOT-' + RAW[book].split('-')[0]));
  const re = new RegExp(`^${CODE[book]}\\.${c}\\.${v}(?:\\([^)]*\\))?#\\d+=\\S+\\t([^\\t]*)`);
  return fs.readFileSync(path.join(CACHE, file), 'utf8').split('\n').map(l => re.exec(l)).filter(Boolean).map(m => m[1]);
}
// The KJV split at the place nearest `share` of its words: a colon or semicolon
// near it, else the nearest comma; each half at least three words. English word
// order isn't the Hebrew's, so a verse with no such place is read whole.
function splitKjv(text, share) {
  const words = text.split(' '), n = words.length, best = (re, within) => {
    let at = -1, d = Infinity;
    for (let i = 3; i <= n - 3; i++) if (re.test(words[i - 1]) && Math.abs(i / n - share) < d) { d = Math.abs(i / n - share); at = i; }
    return d <= within ? at : -1;
  };
  let at = best(/[:;]$/, 0.3);
  if (at < 0) at = best(/,$/, 1);
  return at < 0 ? [text, ''] : [words.slice(0, at).join(' '), words.slice(at).join(' ')];
}

export async function buildStill() {
  const kjv = kjvVerses(), orig = await loadOriginal(CACHE, PASSAGES.map(p => p.ch));
  return PASSAGES.map(p => {
    const book = p.ch.replace(/ \d+$/, ''), c = Number(p.ch.match(/\d+$/)[0]), name = book === 'Psalms' ? 'Psalm' : book;
    const nums = [...Array.from({ length: p.to - p.from + 1 }, (_, i) => p.from + i), ...(p.more || [])];
    const verses = nums.map(v => {
      const ref = `${p.ch}:${v}`, text = kjv.get(ref), he = orig.get(p.ch).v[v - 1].map(w => w[0]);
      if (!text || !he) throw new Error(`${ref}: no KJV or Hebrew`);
      const raw = rawWords(book, c, v);
      // A line of the data is a word, as the reader shows them. The verse halves after the word
      // carrying its strongest pausing mark short of the end (MAIN).
      if (raw.length !== he.length) throw new Error(`${ref}: ${raw.length} words in the data, ${he.length} shown`);
      const marks = MAIN[POETIC.has(book) ? 'poetic' : 'prose'];
      let cut = -1;
      for (const mk of marks) { const at = raw.findIndex((w, i) => i < raw.length - 1 && mk.test(w)); if (at >= 0) { cut = at + 1; break; } }
      const halves = cut > 0 && cut < he.length ? splitKjv(text, cut / he.length) : [text, ''];
      return { ref: `${name} ${c}:${v}`, en: halves[1] ? halves : [text], he: halves[1] ? [he.slice(0, cut).join(' '), he.slice(cut).join(' ')] : [he.join(' ')] };
    });
    return { id: p.id, title: p.title, ref: `${name} ${c}:${p.from}–${p.to}${p.more ? ', ' + p.more.join('–') : ''}`, verses };
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const passages = await buildStill();
  const out = path.join(ROOT, 'content', 'still.js');
  fs.writeFileSync(out, `// Made by tools/build-still.mjs: Be still's Verse by verse, each verse of the KJV split where the\n// Hebrew's etnachta halves it (STEPBible.org's Hebrew, from Tyndale House, Cambridge, CC BY 4.0).\nwindow.TU_STILL = ${JSON.stringify({ passages }, null, 1)};\n`);
  for (const p of passages) {
    console.log(`${p.ref}: ${p.title}`);
    for (const v of p.verses) console.log(`  ${v.ref}  ${v.en[0]}${v.en[1] ? '  ‖  ' + v.en[1] : '   (read whole)'}`);
  }
}
