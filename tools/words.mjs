// The word study behind a tap on a Hebrew or Greek word in the reader
// (Blake, 2026-10-02: "connect to strongs and when i click a word ... i get a
// deeper word study"): its root word, what it means, its grammar in plain
// words, and every other verse that uses it. From STEPBible.org's data, from
// work at Tyndale House Cambridge (CC BY 4.0, credited in the app), pinned to
// the same commit as the words themselves (tools/original.mjs): TBESH and
// TBESG, its brief dictionaries keyed by extended Strong's number; TEHMC and
// TEGMC, its keys to the grammar codes. build-reading.mjs writes one small
// file per root word of the reading (content/words/<number>.js), loaded only
// when he taps one, and each chapter's grammar codes with its words.
import fs from 'node:fs';
import path from 'node:path';
import { ORIG_COMMIT, loadTestament } from './original.mjs';

const BASE = `https://raw.githubusercontent.com/STEPBible/STEPBible-Data/${ORIG_COMMIT}/`;
const FILES = {
  lexHe: 'Lexicons/TBESH - Translators Brief lexicon of Extended Strongs for Hebrew - STEPBible.org CC BY.txt',
  lexEl: 'Lexicons/TBESG - Translators Brief lexicon of Extended Strongs for Greek - STEPBible.org CC BY.txt',
  gramHe: 'Morphology codes/TEHMC - Translators Expansion of Hebrew Morphology Codes - STEPBible.org CC BY.txt',
  gramEl: 'Morphology codes/TEGMC - Translators Expansion of Greek Morphhology Codes - STEPBible.org CC BY.txt'
};
async function text(cache, key) {
  fs.mkdirSync(cache, { recursive: true });
  const file = path.join(cache, `stepbible-${ORIG_COMMIT.slice(0, 7)}-${key}.txt`);
  if (!fs.existsSync(file)) {
    const res = await fetch(BASE + FILES[key].split('/').map(encodeURIComponent).join('/'));
    if (!res.ok) throw new Error(`Could not download ${FILES[key]}: HTTP ${res.status}`);
    fs.writeFileSync(file, await res.text());
  }
  return fs.readFileSync(file, 'utf8');
}

// A dictionary entry's meaning, as plain lines: tags out, its numbered senses
// one to a line, cut short (the full entry is a tap away on Blue Letter Bible).
function plainDef(html) {
  const lines = String(html || '').replace(/<br\s*\/?>/gi, '\n').replace(/<ref='[^']*'>([^<]*)<\/ref>/g, '$1').replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').split('\n').map(l => l.replace(/\s+/g, ' ').trim()).filter(Boolean)
    .filter(l => !/^Aramaic equivalent|^see\b|^Also\b/i.test(l));
  const out = [];
  let n = 0;
  for (const l of lines) { if (n + l.length > 320) break; out.push(l); n += l.length; }
  return out.length ? out : lines.slice(0, 1).map(l => l.slice(0, 320));
}

// A Strong's number one way however it's written: no leading zeros (H0430G
// and H430G are one), capitals, and no punctuation tags after it (H5921A\H9014).
export const strongKey = s => String(s || '').split('\\')[0].trim().toUpperCase().replace(/^([HG])0+(\d)/, '$1$2');
// "H6960A" -> { lemma, sound, gloss, def: [lines] }; also under its plain number (H6960).
// A line's first two columns are the numbers the words are tagged with (the
// second, "H0430G = a Name of", as the Hebrew data writes it).
export async function loadLexicon(cache, lang) {
  const out = new Map();
  for (const line of (await text(cache, lang === 'he' ? 'lexHe' : 'lexEl')).split('\n')) {
    const c = line.split('\t');
    if (c.length < 8 || !/^[HG]\d+/.test(c[0] || '')) continue;
    // Greek in its composed letters, as the verses are (ά, not α and an accent); Hebrew as written.
    const e = { lemma: lang === 'el' ? c[3].trim().normalize('NFC') : c[3].trim(), sound: c[4].trim(), gloss: c[6].trim(), def: plainDef(c[7]) };
    for (const key of [strongKey(c[1].split('=')[0]), strongKey(c[0])]) {
      if (key && !out.has(key)) out.set(key, e);
      const plain = key.replace(/[A-Z]$/, '');
      if (plain && !out.has(plain)) out.set(plain, e);
    }
  }
  return out;
}

// "HVqi3mp" -> "Function=Verb ; Stem=Qal (…); Form=Imperfect (…); Person=Third; …"
export async function loadGrammar(cache, lang) {
  const out = new Map();
  for (const line of (await text(cache, lang === 'he' ? 'gramHe' : 'gramEl')).split('\n')) {
    const [code, full] = line.split('\t');
    if (code && full && /Function=/.test(full)) out.set(code.trim(), full.trim());
  }
  return out;
}

// The grammar in an 11-year-old's words: what kind of word, who, and when
// ("a verb (an action word) · they · will do it, or do it now").
export function kidGrammar(full) {
  const f = {};
  for (const part of String(full || '').split(';')) {
    const m = /^\s*([A-Za-z ]+)=\s*([^(;]+)/.exec(part);
    if (m) f[m[1].trim().toLowerCase()] = m[2].trim().toLowerCase();
  }
  const fn = f.function || '', out = [];
  const KIND = { verb: 'a verb (an action word)', noun: 'a noun (a person, place or thing)', adjective: 'a describing word', adverb: 'a word about how or when',
    preposition: 'a little word for where or how', conjunction: 'a joining word', particle: 'a small helper word', pronoun: 'a word standing for someone',
    article: '“the”', 'proper noun': 'a name', name: 'a name', interjection: 'a word you say out loud', suffix: 'an ending' };
  const kind = Object.keys(KIND).find(k => fn.startsWith(k));
  out.push(kind ? KIND[kind] : fn ? 'a ' + fn : 'a word');
  const person = f.person || '', num = f.number || '', gen = f.gender || '';
  if (fn.startsWith('verb')) {
    const who = /^(first|1st)/.test(person) ? (num.startsWith('plural') ? 'we' : 'I') : /^(second|2nd)/.test(person) ? 'you'
      : /^(third|3rd)/.test(person) ? (num.startsWith('plural') ? 'they' : gen.startsWith('feminine') ? 'she' : gen.startsWith('masculine') ? 'he' : 'he, she or it') : '';
    if (who) out.push(who);
    const form = f.form || f.mood || '', tense = f.tense || '';
    const when = /imperative/.test(form) ? 'a command: do it!' : /participle/.test(form) ? 'doing it (…ing)' : /infinitive/.test(form) ? 'to do it'
      : /^perfect|^aorist/.test(form + tense) ? 'did it' : /imperfect/.test(form) ? 'will do it, or does it' : /^future/.test(tense) ? 'will do it'
      : /^present/.test(tense) ? 'does it now' : /^perfect/.test(tense) ? 'has done it' : '';
    if (when) out.push(when);
    if (/^participle/.test(form) && num) out.push(num.startsWith('plural') ? 'more than one' : 'one');
  } else if (num) out.push(num.startsWith('plural') ? 'more than one' : num.startsWith('dual') ? 'two' : 'one');
  return out.join(' · ');
}

// Every place each root word is used in the testament: "H6960A" -> [["Isaiah 40:31", "and those who wait for"], …].
export async function loadUses(cache, lang) {
  const uses = new Map();
  for (const [ch, d] of await loadTestament(cache, lang)) {
    d.v.forEach((words, i) => (words || []).forEach(([, , mean, strong]) => {
      if (!strong) return;
      const key = strongKey(strong);
      if (!uses.has(key)) uses.set(key, []);
      const list = uses.get(key), ref = `${ch}:${i + 1}`;
      if (!list.length || list[list.length - 1][0] !== ref) list.push([ref, mean]);
    }));
  }
  return uses;
}

// A file name for a Strong's number: content/words/h6960a.js.
export const wordFile = strong => strongKey(strong).toLowerCase().replace(/[^a-z0-9]/g, '') + '.js';
