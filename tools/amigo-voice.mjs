#!/usr/bin/env node
// Records Amigo · Kaibigan's Tagalog in a Filipino voice, once, so it plays
// on every phone (no iPhone has a Tagalog voice of its own): each line of
// amigo/course-tl.js (phrases, the answers in scenes, words, the praise, the
// words from Tatay, the Baybayin reading words, and each build-it tile's word,
// said when he taps it) becomes
// amigo/audio/tl/<key>.mp3, and amigo/audio/index.js lists them for the game.
// Only lines without a recording are made; a changed line gets a new key.
//
// Google Cloud Text-to-Speech, signed in with a service account's JSON key:
// the test repo's secret GOOGLE_TTS_JSON when the deploy runs it (the key
// lives only there), or ~/keys/google-tts.json; or with an API key
// (~/keys/google-tts.key, or $GOOGLE_TTS_KEY). Never in the app or the repo.
//   node tools/amigo-voice.mjs --dry              what it would record, and how many characters
//   node tools/amigo-voice.mjs --samples <dir>    one line in every Filipino voice, to pick one
//   node tools/amigo-voice.mjs [--voice <name>]   record what's missing (fil-ph-Neural2-D unless named: Blake's pick)
//   … --all                                       record every line again (after picking another voice)
import fs from 'node:fs';
import crypto from 'node:crypto';
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
const API = process.env.AMIGO_TTS_API || 'https://texttospeech.googleapis.com/v1';   // (the test points it elsewhere)

// Every Tagalog line the game can say.
function lines() {
  const all = [...TL.praise];
  for (const u of TL.units) {
    all.push(u.done, ...u.phrases.map(p => p.t), ...u.words.map(w => w[0]));
    for (const s of u.scenes) all.push(s.right, ...s.wrong);
  }
  all.push(...TL.tatay.words.map(w => w[0]), ...TL.baybayin.words.map(w => w[0]));
  all.push(...TL.units.flatMap(u => u.phrases).flatMap(p => E.tiles(p.t)).map(E.sayable));   // a tapped tile says its word
  return [...new Set(all.map(t => t.normalize('NFC')))];
}
// Signing in: a service account's key trades a signed note (a JWT) for an
// hour-long token; an API key goes along with each call.
const KEYS = path.join(os.homedir(), 'keys');
let token = null;
async function auth() {
  if (process.env.GOOGLE_TTS_KEY) return { key: process.env.GOOGLE_TTS_KEY.trim() };
  const account = path.join(KEYS, 'google-tts.json'), apiKey = path.join(KEYS, 'google-tts.key');
  if (process.env.GOOGLE_TTS_JSON || fs.existsSync(account)) {
    const now = Math.floor(Date.now() / 1000);
    if (token && token.until > now + 60) return { bearer: token.value };
    const cred = JSON.parse(process.env.GOOGLE_TTS_JSON || fs.readFileSync(account, 'utf8'));
    const part = o => Buffer.from(JSON.stringify(o)).toString('base64url');
    const unsigned = part({ alg: 'RS256', typ: 'JWT' }) + '.' + part({ iss: cred.client_email, scope: 'https://www.googleapis.com/auth/cloud-platform', aud: cred.token_uri, iat: now, exp: now + 3600 });
    const jwt = unsigned + '.' + crypto.createSign('RSA-SHA256').update(unsigned).sign(cred.private_key).toString('base64url');
    const res = await fetch(cred.token_uri, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt }) });
    const j = await res.json().catch(() => ({}));
    if (!res.ok || !j.access_token) throw new Error(`Google didn't accept the service account (${res.status}): ${j.error_description || j.error || res.statusText}`);
    token = { value: j.access_token, until: now + (j.expires_in || 3600) };
    return { bearer: token.value };
  }
  if (fs.existsSync(apiKey)) return { key: fs.readFileSync(apiKey, 'utf8').trim() };
  console.error(`No sign-in for Google: save the service account's JSON key as ${account}, or an API key as ${apiKey}. It stays on this computer.`);
  process.exit(1);
}
async function google(pathPart, body) {
  const a = await auth();
  const url = `${API}/${pathPart}` + (a.key ? `${pathPart.includes('?') ? '&' : '?'}key=${encodeURIComponent(a.key)}` : '');
  const headers = Object.assign(body ? { 'Content-Type': 'application/json' } : {}, a.bearer ? { Authorization: 'Bearer ' + a.bearer } : {});
  const res = await fetch(url, body ? { method: 'POST', headers, body: JSON.stringify(body) } : { headers });
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
  const voice = opt('--voice') || 'fil-ph-Neural2-D';                 // a man's voice, Blake's pick (2026-09-30)
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
