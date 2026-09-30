#!/usr/bin/env node
// Records Amigo · Kaibigan's Tagalog in a Filipino voice, once, so it plays
// on every phone (no iPhone has a Tagalog voice of its own): each line of
// amigo/course-tl.js (phrases, the answers in scenes, words, the praise, the
// words from Tatay, the Baybayin reading words) becomes
// amigo/audio/tl/<key>.mp3, and amigo/audio/index.js lists them for the game.
// Only lines without a recording are made; a changed line gets a new key.
//
// Google Cloud Text-to-Speech. The API key is read from ~/keys/google-tts.key
// (or $GOOGLE_TTS_KEY) and never goes in the app or the repo.
//   node tools/amigo-voice.mjs --dry              what it would record, and how many characters
//   node tools/amigo-voice.mjs --samples <dir>    one line in every Filipino voice, to pick one
//   node tools/amigo-voice.mjs [--voice <name>]   record what's missing (fil-PH-Wavenet-A unless named)
//   … --all                                       record every line again (after picking another voice)
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const E = require('../amigo/engine.js');
const TL = require('../amigo/course-tl.js');

const args = process.argv.slice(2), flag = n => args.includes(n), opt = n => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null; };
const DIR = path.join(ROOT, 'amigo', 'audio'), OUT = path.join(DIR, 'tl'), LIST = path.join(DIR, 'index.js');
const API = 'https://texttospeech.googleapis.com/v1';

// Every Tagalog line the game can say.
function lines() {
  const all = [...TL.praise];
  for (const u of TL.units) {
    all.push(u.done, ...u.phrases.map(p => p.t), ...u.words.map(w => w[0]));
    for (const s of u.scenes) all.push(s.right, ...s.wrong);
  }
  all.push(...TL.tatay.words.map(w => w[0]), ...TL.baybayin.words.map(w => w[0]));
  return [...new Set(all.map(t => t.normalize('NFC')))];
}
function key() {
  if (process.env.GOOGLE_TTS_KEY) return process.env.GOOGLE_TTS_KEY.trim();
  const f = path.join(os.homedir(), 'keys', 'google-tts.key');
  if (!fs.existsSync(f)) { console.error(`No key. Save the Google Cloud API key to ${f} (it stays on this computer).`); process.exit(1); }
  return fs.readFileSync(f, 'utf8').trim();
}
async function google(pathPart, body) {
  const res = await fetch(`${API}/${pathPart}${pathPart.includes('?') ? '&' : '?'}key=${encodeURIComponent(key())}`, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {});
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Google Text-to-Speech said ${res.status}: ${(json.error && json.error.message) || res.statusText}`);
  return json;
}
// The line as spoken: no ¿ ¡, and one line only.
const speakable = t => t.replace(/[¿¡]/g, '').trim();
async function record(text, voice, file) {
  const r = await google('text:synthesize', { input: { text: speakable(text) }, voice: { languageCode: 'fil-PH', name: voice }, audioConfig: { audioEncoding: 'MP3', speakingRate: 0.9 } });
  fs.writeFileSync(file, Buffer.from(r.audioContent, 'base64'));
}
function writeList(voice) {
  const have = {};
  for (const t of lines()) if (fs.existsSync(path.join(OUT, E.audioKey(t) + '.mp3'))) have[E.audioKey(t)] = 1;
  fs.writeFileSync(LIST, `// Made by tools/amigo-voice.mjs: which lines have a recording, as\n// amigo/audio/<course>/<key>.mp3 (the key is engine.js audioKey of the text).\n` +
    `window.AMIGO_AUDIO = ${JSON.stringify({ tl: have, voice: { tl: voice } })};\n`);
  return Object.keys(have).length;
}

const todo = lines();
if (flag('--dry')) {
  const missing = todo.filter(t => !fs.existsSync(path.join(OUT, E.audioKey(t) + '.mp3')));
  console.log(`${todo.length} Tagalog lines, ${missing.length} not recorded yet (${missing.reduce((n, t) => n + speakable(t).length, 0)} characters):`);
  for (const t of missing) console.log('  ' + t);
} else if (flag('--samples')) {
  const dir = opt('--samples') || path.join(os.tmpdir(), 'amigo-voice-samples');
  fs.mkdirSync(dir, { recursive: true });
  const { voices = [] } = await google('voices?languageCode=fil-PH');
  const line = 'Kumusta po kayo? Kain tayo! Salamat po sa pagkain.';
  for (const v of voices) {
    await record(line, v.name, path.join(dir, `${v.name}-${(v.ssmlGender || '').toLowerCase()}.mp3`));
    console.log(`  ${v.name} (${(v.ssmlGender || '').toLowerCase()})`);
  }
  console.log(`${voices.length} Filipino voices saying “${line}” in ${dir}`);
} else {
  const voice = opt('--voice') || 'fil-PH-Wavenet-A';
  fs.mkdirSync(OUT, { recursive: true });
  let made = 0;
  for (const t of todo) {
    const file = path.join(OUT, E.audioKey(t) + '.mp3');
    if (fs.existsSync(file) && !flag('--all')) continue;
    await record(t, voice, file);
    made++;
  }
  const n = writeList(voice);
  console.log(`${made} recorded now in ${voice}; ${n} of ${todo.length} Tagalog lines have a recording (amigo/audio/tl/, listed in amigo/audio/index.js)`);
}
