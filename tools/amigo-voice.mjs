#!/usr/bin/env node
// Records Amigo · Kaibigan's Tagalog in Filipino voices, and its Spanish in a
// Latin American Spanish voice, once, so they play on every phone (no iPhone
// has a Tagalog voice of its own, and Javan's Kindle has no Spanish one:
// Blake, 2026-10-04, "javan can't hear the spanish on this kindle, but he can
// hear the tagalog"). Each line of
// amigo/course-tl.js (phrases, the answers in scenes, words, the praise, the
// words from Tatay, the Baybayin reading words, and each build-it tile's word,
// said when he taps it) becomes amigo/audio/tl/<key>.mp3, in one man's voice,
// a little slow. Tatay's own course, amigo/course-tl2.js, is two people
// talking at native speed: each conversation line in its speaker's voice (a
// man, a woman), everything else in the man's, as amigo/audio/tl2/<key>.mp3
// (engine.js voiceLines says which). The Spanish course, amigo/course-es.js,
// is recorded like the first Tagalog course, in amigo/audio/es/<key>.mp3, in a
// man's voice, a little slow: Mexican Spanish if Google has it, else its US
// (Latin American) Spanish, Neural2 if it can (the voice it picks is kept in
// amigo/audio/index.js, so later lines are in the same one). amigo/audio/index.js
// lists them for the game. Only lines without a recording are made; a changed
// line gets a new key.
//
// Google Cloud Text-to-Speech, signed in with a service account's JSON key:
// the test repo's secret GOOGLE_TTS_JSON when the deploy runs it (the key
// lives only there), or ~/keys/google-tts.json; or with an API key
// (~/keys/google-tts.key, or $GOOGLE_TTS_KEY). Never in the app or the repo.
//   node tools/amigo-voice.mjs --dry              what it would record, and how many characters
//   node tools/amigo-voice.mjs --samples <dir>    one line in every Filipino voice, to pick one (--course es: every Spanish one)
//   node tools/amigo-voice.mjs [--voice <name>]   record what's missing (the first course in fil-ph-Neural2-D unless named: Blake's pick)
//   … --voice-es <name>                           the Spanish in that voice (es-US-Neural2-B, say) instead of the one kept
//   … --all                                       record every line again (after picking another voice)
//   … --course tl2                                only that course (tl, tl2 or es)
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
const COURSES = { tl: TL, tl2: require('../amigo/course-tl2.js'), es: require('../amigo/course-es.js') };

const args = process.argv.slice(2), flag = n => args.includes(n), opt = n => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null; };
const DIR = path.join(ROOT, 'amigo', 'audio'), LIST = path.join(DIR, 'index.js');
const fileOf = (cid, key) => path.join(DIR, cid, E.audioKey(key) + '.mp3');
const API = process.env.AMIGO_TTS_API || 'https://texttospeech.googleapis.com/v1';   // (the test points it elsewhere)

// Every line a first course can say: the Tagalog one (with Tatay's words and
// the Baybayin reading words), or the Spanish one, made the same way.
function lines(C) {
  const all = [...C.praise];
  for (const u of C.units) {
    all.push(u.done, ...u.phrases.map(p => p.t), ...u.words.map(w => w[0]));
    for (const s of u.scenes) all.push(s.right, ...s.wrong);
  }
  if (C.tatay) all.push(...C.tatay.words.map(w => w[0]));
  if (C.baybayin) all.push(...C.baybayin.words.map(w => w[0]));
  all.push(...C.units.flatMap(u => u.phrases).flatMap(p => E.tiles(p.t)).map(E.sayable));   // a tapped tile says its word
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
// A voice's language is the start of its name ("es-US-Neural2-B": es-US).
const langOfVoice = v => v.split('-').slice(0, 2).map((x, i) => i ? x.toUpperCase() : x.toLowerCase()).join('-');
async function record(text, voice, file, rate = 0.9) {
  const r = await google('text:synthesize', { input: { text: speakable(text) }, voice: { languageCode: langOfVoice(voice), name: voice }, audioConfig: { audioEncoding: 'MP3', speakingRate: rate } });
  fs.writeFileSync(file, Buffer.from(r.audioContent, 'base64'));
}
// What each course says: [{ key (what audioKey is taken of), text, voice }].
const tlVoice = opt('--voice') || 'fil-ph-Neural2-D';                 // a man's voice, Blake's pick (2026-09-30)
// The Spanish voice: the one named, else the one its recordings are already
// in (amigo/audio/index.js), else picked from Google's list when first needed.
const before = (() => { try { const w = {}; new Function('window', fs.readFileSync(LIST, 'utf8'))(w); return w.AMIGO_AUDIO || {}; } catch (e) { return {}; } })();
let esVoice = opt('--voice-es') || (before.voice && before.voice.es) || null;
// Mexican Spanish first (the game's own preference), then US Spanish; a man's
// voice, like the Tagalog; Neural2, then WaveNet, then the rest.
async function pickSpanish() {
  const { voices = [] } = await google('voices?languageCode=es');
  const where = v => ['es-MX', 'es-US'].indexOf(langOfVoice(v.name)), kind = v => [/Neural2/, /Wavenet/].findIndex(re => re.test(v.name));
  const score = v => where(v) * 100 + (v.ssmlGender === 'MALE' ? 0 : 10) + (kind(v) < 0 ? 9 : kind(v));
  const ok = voices.filter(v => where(v) >= 0 && !/Polyglot|News/.test(v.name)).sort((a, b) => score(a) - score(b) || a.name.localeCompare(b.name));
  if (!ok.length) throw new Error("Google offers no Mexican or US Spanish voice");
  return ok[0].name;
}
function todo(cid) {
  if (cid === 'tl') return lines(TL).map(t => ({ key: t, text: t, voice: tlVoice }));
  if (cid === 'es') return lines(COURSES.es).map(t => ({ key: t, text: t, voice: esVoice }));
  const C = COURSES[cid];
  return E.voiceLines(C).map(x => ({ key: x.key.normalize('NFC'), text: x.text, voice: C.speakers[x.who] }));
}
const rateOf = cid => COURSES[cid].rate || 0.9;
function writeList() {
  const list = { voice: Object.assign({ tl: tlVoice, tl2: COURSES.tl2.speakers }, esVoice ? { es: esVoice } : {}) };
  for (const cid of Object.keys(COURSES)) {
    list[cid] = {};
    for (const x of todo(cid)) if (fs.existsSync(fileOf(cid, x.key))) list[cid][E.audioKey(x.key)] = 1;
  }
  fs.writeFileSync(LIST, `// Made by tools/amigo-voice.mjs: which lines have a recording, as\n// amigo/audio/<course>/<key>.mp3 (the key is engine.js audioKey of the text).\n` +
    `window.AMIGO_AUDIO = ${JSON.stringify(Object.assign({ tl: list.tl, tl2: list.tl2, es: list.es }, { voice: list.voice }))};\n`);
  return list;
}

const which = opt('--course') ? [opt('--course')] : Object.keys(COURSES);
if (which.some(cid => !COURSES[cid])) { console.error(`No course ${which.join(', ')}: ${Object.keys(COURSES).join(' or ')}`); process.exit(1); }
if (flag('--dry')) {
  for (const cid of which) {
    const all = todo(cid), missing = all.filter(x => !fs.existsSync(fileOf(cid, x.key)));
    console.log(`${cid}: ${all.length} ${cid === 'es' ? 'Spanish' : 'Tagalog'} lines, ${missing.length} not recorded yet (${missing.reduce((n, x) => n + speakable(x.text).length, 0)} characters):`);
    for (const x of missing) console.log(`  ${x.text}${x.voice && x.voice !== tlVoice ? '  (' + x.voice + ')' : ''}`);
  }
} else if (flag('--samples')) {
  const dir = opt('--samples') || path.join(os.tmpdir(), 'amigo-voice-samples');
  fs.mkdirSync(dir, { recursive: true });
  const es = which.includes('es') && which.length === 1;
  const { voices = [] } = await google(es ? 'voices?languageCode=es' : 'voices?languageCode=fil-PH');
  const line = es ? '¡Hola! ¿Cómo estás? Me llamo Javan. ¿Quieres jugar conmigo?' : 'Kumusta po kayo? Kain tayo! Salamat po sa pagkain.';
  const these = es ? voices.filter(v => /^es-(MX|US)$/i.test(langOfVoice(v.name))) : voices;
  for (const v of these) {
    await record(line, v.name, path.join(dir, `${v.name}-${(v.ssmlGender || '').toLowerCase()}.mp3`));
    console.log(`  ${v.name} (${(v.ssmlGender || '').toLowerCase()})`);
  }
  console.log(`${these.length} ${es ? 'Spanish' : 'Filipino'} voices saying “${line}” in ${dir}`);
} else {
  const made = {};
  if (which.includes('es') && !esVoice) { esVoice = await pickSpanish(); console.log(`Spanish: recording in ${esVoice}`); }
  for (const cid of which) {
    fs.mkdirSync(path.join(DIR, cid), { recursive: true });
    made[cid] = 0;
    for (const x of todo(cid)) {
      const file = fileOf(cid, x.key);
      if (fs.existsSync(file) && !flag('--all')) continue;
      await record(x.text, x.voice, file, rateOf(cid));
      made[cid]++;
    }
  }
  const list = writeList();
  for (const cid of which) {
    console.log(`${cid}: ${made[cid]} recorded now; ${Object.keys(list[cid]).length} of ${todo(cid).length} lines have a recording (amigo/audio/${cid}/, listed in amigo/audio/index.js)`);
  }
}
