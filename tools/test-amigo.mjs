#!/usr/bin/env node
// Amigo · Kaibigan without a screen: every course follows the rules in
// amigo/README.md, every lesson builds and can be answered, reviews and
// streaks work, and Baybayin spells words right. Run: node tools/test-amigo.mjs
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const E = require('../amigo/engine.js');
const BAY = require('../amigo/baybayin.js');
const COURSES = { es: require('../amigo/course-es.js'), tl: require('../amigo/course-tl.js'), tl2: require('../amigo/course-tl2.js') };

let failed = 0;
const ok = (cond, what, problems = []) => {
  console.log((cond ? '  ✓ ' : '  ✗ ') + what + (problems.length ? ':\n      ' + problems.slice(0, 12).join('\n      ') : ''));
  if (!cond) failed++;
};
const STRAIGHT = /['"]/;
const pairOk = w => Array.isArray(w) && w.length === 2 && typeof w[0] === 'string' && typeof w[1] === 'string' && w[0] && w[1];

// ------------------------------------------------------------ the courses
// A conversation course (past the basics): each unit a conversation, questions
// on it, words to find in it, its grammar, forms to pick, sentences to build
// and to say, and scenes.
function conversationRules(C, id) {
  const problems = [], texts = [C.name, C.title, C.who, ...C.praise], seen = new Map();
  if (C.id !== id || !C.voices.length || C.praise.length < 2 || !C.title) problems.push('needs its id, title, voices and praise');
  if (!C.speakers || !C.speakers.A || !C.speakers.B) problems.push('needs speakers A and B (the recordings’ voices)');
  if (!Array.isArray(C.lessonNames) || C.lessonNames.length !== E.LESSONS_PER_UNIT) problems.push(`needs ${E.LESSONS_PER_UNIT} lessonNames`);
  const unitIds = new Set(), three = (x, right, at, what) => {
    if (!Array.isArray(x.wrong) || x.wrong.length !== 2 || x.wrong.includes(right) || x.wrong[0] === x.wrong[1] || x.wrong.some(w => !w)) problems.push(`${at}: ${what} needs two different wrong answers`);
  };
  const once = (t, at) => { if (seen.has(t)) problems.push(`“${t}” is in both ${seen.get(t)} and ${at}`); seen.set(t, at); };
  for (const u of C.units) {
    const at = u.id;
    if (unitIds.has(u.id)) problems.push(`two units are "${u.id}"`);
    unitIds.add(u.id);
    for (const f of ['title', 'sub', 'blurb', 'done', 'doneNote', 'dialog', 'questions', 'gaps', 'grammar', 'forms', 'builds', 'says', 'scenes']) if (!u[f]) problems.push(`${at}: needs ${f}`);
    if (problems.length) continue;
    texts.push(u.title, u.sub, u.blurb, u.done, u.doneNote);
    const d = u.dialog, lines = d.lines || [];
    if (!d.setting || !d.people || !d.people.A || !d.people.B || d.people.A === d.people.B) problems.push(`${at}: the conversation needs its setting and two people`);
    if (lines.length < 8 || lines.length > 16) problems.push(`${at}: ${lines.length} lines in the conversation (8 to 16)`);
    if (!['A', 'B'].every(w => lines.some(l => l.who === w))) problems.push(`${at}: both people talk`);
    for (const [i, l] of lines.entries()) {
      if (!['A', 'B'].includes(l.who) || !l.t || !l.en) problems.push(`${at}: line ${i + 1} needs who (A or B), t and en`);
      else if (l.t !== l.t.trim() || /\s{2}/.test(l.t)) problems.push(`${at}: line ${i + 1} has extra spaces`);
      texts.push(l.t, l.en, l.note || '');
    }
    texts.push(d.setting, d.people.A, d.people.B);
    if (u.questions.length < 4) problems.push(`${at}: ${u.questions.length} questions on the conversation (at least 4)`);
    for (const q of u.questions) {
      if (!q.q || !q.right || !Number.isInteger(q.line) || q.line < 1 || q.line > lines.length) problems.push(`${at}: “${q.q}” needs q, right, and the line (1 to ${lines.length}) that answers it`);
      three(q, q.right, at, `“${q.q}”`);
      texts.push(q.q, q.right, ...(q.wrong || []), q.note || '');
    }
    if (u.gaps.length < 2) problems.push(`${at}: ${u.gaps.length} missing words (at least 2)`);
    for (const g of u.gaps) {
      const l = lines[g.line - 1];
      if (!l) { problems.push(`${at}: a missing word in line ${g.line}, which isn't there`); continue; }
      const shown = E.blanked(l.t, g.word);
      if (shown === l.t || shown.split('____').length !== 2 || shown.replace('____', g.word) !== l.t) problems.push(`${at}: “${g.word}” isn't a whole word of line ${g.line} (“${l.t}”)`);
      if ((l.t.split(/[^\p{L}’-]+/u).filter(w => w === g.word)).length !== 1) problems.push(`${at}: “${g.word}” is in line ${g.line} more than once`);
      three(g, g.word, at, `the missing “${g.word}”`);
      texts.push(...(g.wrong || []));
    }
    const G = u.grammar;
    if (!G.title || !Array.isArray(G.points) || G.points.length < 2 || G.points.some(x => !x)) problems.push(`${at}: the grammar needs a title and at least 2 points`);
    if (G.table && (!Array.isArray(G.table) || G.table.some(r => !Array.isArray(r) || r.length !== 3 || r.some(c => !c)))) problems.push(`${at}: a grammar table row is [root, form, meaning]`);
    texts.push(G.title, ...(G.points || []), ...(G.table || []).flat());
    if (u.forms.length < 4) problems.push(`${at}: ${u.forms.length} forms to pick (at least 4)`);
    for (const f of u.forms) {
      if (!f.prompt || f.prompt.split('___').length !== 2 || /____/.test(f.prompt) || !f.right || !f.en) { problems.push(`${at}: “${f.prompt}” needs one ___, right and en`); continue; }
      three(f, f.right, at, `“${f.prompt}”`);
      once(E.filled(f), at);
      texts.push(f.prompt, f.root || '', f.right, ...(f.wrong || []), f.en, f.note || '');
    }
    if (u.builds.length < 3) problems.push(`${at}: ${u.builds.length} sentences to build (at least 3)`);
    for (const b of u.builds) {
      if (!b.t || !b.en || E.tiles(b.t).length < 2) problems.push(`${at}: “${b.t}” to build needs t (two words or more) and en`);
      else if (b.t !== b.t.trim() || /\s{2}/.test(b.t)) problems.push(`“${b.t}”: extra spaces break its tiles`);
      once(b.t, at);
      texts.push(b.t, b.en, b.note || '');
    }
    if (u.says.length < 3) problems.push(`${at}: ${u.says.length} sentences to say (at least 3)`);
    for (const x of u.says) {
      if (!x.t || !x.en) problems.push(`${at}: a sentence to say needs t and en`);
      once(x.t, at);
      texts.push(x.t, x.en, x.note || '');
    }
    if (u.scenes.length < 2) problems.push(`${at}: ${u.scenes.length} scenes (at least 2)`);
    for (const sc of u.scenes) {
      if (!sc.prompt || !sc.right) problems.push(`${at}: a scene needs its prompt and right answer`);
      three(sc, sc.right, at, `“${sc.prompt}”`);
      if (!u.says.some(x => x.t === sc.right)) once(sc.right, at);        // a scene may answer with one of the unit's sentences to say
      texts.push(sc.kind || '', sc.prompt, sc.right, ...(sc.wrong || []), sc.note || '');
    }
  }
  for (const t of texts) if (STRAIGHT.test(t)) problems.push(`a straight quote in “${t}” (use ’ “ ”)`);
  const n = k => C.units.reduce((a, u) => a + (u[k] || []).length, 0);
  ok(!problems.length, `${C.units.length} units: ${C.units.reduce((a, u) => a + ((u.dialog && u.dialog.lines) || []).length, 0)} lines of conversation, ${n('questions')} questions, ${n('gaps')} missing words, ${n('forms')} forms, ${n('builds')} to build, ${n('says')} to say and ${n('scenes')} scenes follow the rules`, problems);
}
for (const [id, C] of Object.entries(COURSES)) {
  console.log(`${C.name}${C.title ? ' · ' + C.title : ''} (course-${id}.js)`);
  if (C.kind === 'conversation') { conversationRules(C, id); continue; }
  const problems = [], texts = [C.name, C.who, ...C.praise], seen = new Map();
  if (C.id !== id || !C.voices.length || C.praise.length < 2) problems.push('needs its id, voices and praise');
  const unitIds = new Set();
  for (const u of C.units) {
    const at = u.id;
    if (unitIds.has(u.id)) problems.push(`two units are "${u.id}"`);
    unitIds.add(u.id);
    for (const f of ['title', 'sub', 'blurb', 'done', 'doneNote']) if (!u[f]) problems.push(`${at}: needs ${f}`);
    texts.push(u.title, u.sub, u.blurb, u.done, u.doneNote);
    if (u.phrases.length < 9) problems.push(`${at}: ${u.phrases.length} phrases (at least 9, three a lesson)`);
    if (u.words.length < 9) problems.push(`${at}: ${u.words.length} words (at least 9)`);
    for (const p of u.phrases) {
      if (!p.t || !p.en) { problems.push(`${at}: a phrase needs t and en`); continue; }
      if (seen.has(p.t)) problems.push(`"${p.t}" is in both ${seen.get(p.t)} and ${at}`);
      seen.set(p.t, at);
      if (p.t !== p.t.trim() || /\s{2}/.test(p.t)) problems.push(`"${p.t}": extra spaces break its tiles`);
      if (p.wrong && (p.wrong.length !== 2 || p.wrong.includes(p.en) || p.wrong[0] === p.wrong[1])) problems.push(`"${p.t}": needs two different wrong meanings`);
      texts.push(p.t, p.en, ...(p.wrong || []), p.note || '');
    }
    const words = new Set();
    for (const w of u.words) {
      if (!pairOk(w)) { problems.push(`${at}: a word is [word, meaning]`); continue; }
      if (words.has(w[0])) problems.push(`${at}: "${w[0]}" twice`);
      words.add(w[0]); texts.push(...w);
    }
    for (const s of u.scenes) {
      if (!u.phrases.some(p => p.t === s.right)) problems.push(`${at}: the scene "${s.prompt}" answers "${s.right}", not a phrase of this unit`);
      if (!Array.isArray(s.wrong) || s.wrong.length !== 2 || s.wrong.includes(s.right) || s.wrong[0] === s.wrong[1]) problems.push(`${at}: "${s.prompt}" needs two different wrong answers`);
      texts.push(s.kind || '', s.prompt, s.right, ...(s.wrong || []), s.note || '');
    }
  }
  if (C.tatay) for (const w of C.tatay.words) { if (!pairOk(w)) problems.push('tatay: a word is [word, meaning]'); else texts.push(...w); }
  if (C.baybayin) for (const w of C.baybayin.words) { if (!pairOk(w)) problems.push('baybayin: a word is [word, meaning]'); else texts.push(...w); }
  for (const t of texts) if (STRAIGHT.test(t)) problems.push(`a straight quote in “${t}” (use ’ “ ”)`);
  const n = k => C.units.reduce((a, u) => a + u[k].length, 0);
  ok(!problems.length, `${C.units.length} units: ${n('phrases')} phrases, ${n('words')} words and ${n('scenes')} scenes follow the rules`, problems);
  if (id === 'tl') {
    const checked = C.units.filter(u => u.checked).length;
    console.log(`    (${checked} of ${C.units.length} units checked by Blake${C.tatay.checked ? ', the home words checked' : ''}${C.baybayin.checked ? ', the Baybayin words checked' : ''}; the live app shows only those)`);
  }
}

// ------------------------------------------------------------ lessons
for (const [id, C] of Object.entries(COURSES)) {
  console.log(`${C.name}${C.title ? ' · ' + C.title : ''}: the lessons`);
  const save = E.freshSave(), cs = E.courseSave(save, id), problems = [], sizes = [];
  let day = 20600, reviewsSeen = 0;
  for (const { unit, n, key } of E.path(C)) {
    if (!E.unlocked(C, cs, key)) problems.push(`${key} is still locked when its turn comes`);
    const steps = E.lesson(C, unit, n, cs, day);
    sizes.push(steps.length);
    if (steps.length < 6 || steps.length > 16) problems.push(`${key}: ${steps.length} steps (6 to 16)`);
    const again = E.lesson(C, unit, n, cs, day);
    if (JSON.stringify(again) !== JSON.stringify(steps)) problems.push(`${key}: built twice, it comes out different`);
    let xp = 0;
    for (const st of steps) {
      if (st.review) reviewsSeen++;
      if (['listen', 'scene', 'question', 'gap', 'form'].includes(st.type)) {
        if (st.choices.length !== 3 || !st.choices.includes(st.right) || new Set(st.choices).size !== 3) problems.push(`${key}: “${st.id || st.q || st.t}” needs 3 different choices, the right one among them`);
        if (st.type === 'gap' && (st.shown.split('____').length !== 2 || st.shown.replace('____', st.right) !== st.t)) problems.push(`${key}: the line with a missing word (“${st.shown}”) isn't the line with it taken out`);
        if (st.type === 'form' && st.say !== st.prompt.replace('___', st.right)) problems.push(`${key}: “${st.prompt}” says the wrong sentence after`);
      } else if (st.type === 'say') {
        if (!st.t || !st.en || E.check(st, 'no')) problems.push(`${key}: “${st.t}”: to say, with “not quite” not counted right`);
      } else if (E.INFO.has(st.type)) {
        if (st.type !== 'grammar' && !(st.lines && st.lines.length)) problems.push(`${key}: a ${st.type} with no lines`);
      } else if (st.type === 'build') {
        const bank = st.bank.slice();
        for (const w of st.answer) { const i = bank.indexOf(w); if (i < 0) problems.push(`${key}: “${st.id}” has no “${w}” tile`); else bank.splice(i, 1); }
        if (bank.length !== 2) problems.push(`${key}: “${st.id}” needs 2 spare tiles`);
        const bare = w => w.toLowerCase().replace(/[¿¡?!.,]/g, '');
        if (bank.some(w => st.answer.map(bare).includes(bare(w)))) problems.push(`${key}: “${st.id}” has a spare tile that is a right one in another form (${bank.join(', ')})`);
      } else if (st.type === 'pairs') {
        if (st.pairs.length < 3 || st.left.length !== st.pairs.length || st.rightSide.length !== st.pairs.length) problems.push(`${key}: pairs need 3 to 5, both sides`);
        const base = m => m.replace(/\s*\(.*\)$/, '');
        for (const [w, m] of st.pairs) for (const [w2, m2] of st.pairs) if (w !== w2 && (m === m2 || m === base(m2))) problems.push(`${key}: in Match the pairs, “${m}” (${w}) could also be ${w2} (“${m2}”)`);
      } else problems.push(`${key}: a step of type ${st.type}`);
      const right = st.type === 'build' ? st.answer : st.right;
      if (!E.check(st, right)) problems.push(`${key}: the right answer to “${st.id || st.type}” doesn't check`);
      if (st.choices && E.check(st, st.choices.find(c => c !== st.right))) problems.push(`${key}: a wrong answer checks (“${st.id || st.q || st.t}”)`);
      if (st.type === 'build' && st.answer.length > 1 && E.check(st, st.answer.slice().reverse())) problems.push(`${key}: “${st.id}” backwards checks`);
      if (st.id) E.remember(cs, st.id, true, day);
      if (!E.INFO.has(st.type)) xp += E.XP_RIGHT;
    }
    E.finish(cs, key, xp, day);
    day += 1;
  }
  const lessons = E.path(C).length;
  ok(!problems.length, `a learner doing a lesson a day finishes all ${lessons}: ${sizes.join(' / ')} steps, each answerable`, problems);
  ok(reviewsSeen > 0, `earlier phrases come back in later lessons (${reviewsSeen} times)`);
  ok(cs.streak.count === lessons && E.streakNow(cs, day - 1) === lessons && E.streakNow(cs, day) === lessons && E.streakNow(cs, day + 1) === 0,
    `the streak counts each day in a row (${cs.streak.count}), lasts through the next day, then ends`);
  ok(Object.keys(cs.done).length === lessons && cs.xp > 0 && !E.nextLesson(C, cs), `every lesson is done and ${cs.xp} XP earned`);
  // A missed phrase comes back the next lesson; one known well waits. (A
  // conversation's first lesson is all listening: miss a form in its second.)
  const fresh = E.courseSave(E.freshSave(), id), talk = C.kind === 'conversation', [first, second] = E.path(C).slice(talk ? 1 : 0);
  if (talk) E.finish(fresh, E.path(C)[0].key, 50, 30000);
  const firstSteps = E.lesson(C, first.unit, first.n, fresh, 30000);
  const missed = firstSteps.find(s => s.type === (talk ? 'form' : 'listen')).id;
  for (const st of firstSteps) if (st.id) E.remember(fresh, st.id, st.id !== missed, 30000);
  E.finish(fresh, first.key, 50, 30000);
  const later = E.lesson(C, second.unit, second.n, fresh, 30000);
  ok(later.some(s => s.review && s.id === missed) && later.filter(s => s.review).length === 1, `a missed ${talk ? 'form' : 'phrase'} (“${missed}”) comes back in the next lesson, and only it, the same day`);
  E.finish(fresh, second.key, 50, 30002);
  ok(fresh.streak.count === 1, 'a day skipped starts the streak over');
}

// ------------------------------------------------------------ Baybayin
console.log('Baybayin');
{
  const SPELL = { Tatay: 'ᜆᜆᜌ᜔', Nanay: 'ᜈᜈᜌ᜔', Kaibigan: 'ᜃᜁᜊᜒᜄᜈ᜔', Mabuhay: 'ᜋᜊᜓᜑᜌ᜔', Salamat: 'ᜐᜎᜋᜆ᜔', anak: 'ᜀᜈᜃ᜔', araw: 'ᜀᜇᜏ᜔',
    Pilipinas: 'ᜉᜒᜎᜒᜉᜒᜈᜐ᜔', Bleyk: 'ᜊ᜔ᜎᜒᜌ᜔ᜃ᜔', mga: 'ᜋᜅ', ng: 'ᜈᜅ', 'mahal kita': 'ᜋᜑᜎ᜔ ᜃᜒᜆ', ngayon: 'ᜅᜌᜓᜈ᜔', Juan: 'ᜑᜓᜀᜈ᜔' };
  const wrong = Object.entries(SPELL).filter(([w, want]) => BAY.spell(w).text !== want).map(([w, want]) => `${w}: ${BAY.spell(w).text} (want ${want})`);
  ok(!wrong.length, `${Object.keys(SPELL).length} words spelled right (Kaibigan → ${BAY.spell('Kaibigan').text}, Bleyk → ${BAY.spell('Bleyk').text})`, wrong);
  const words = COURSES.tl.baybayin.words, problems = [], sizes = [];
  const never = words.filter(([w]) => BAY.firstLesson(w) < 0).map(([w]) => w);
  if (never.length) problems.push(`never readable: ${never.join(', ')}`);
  BAY.LESSONS.forEach((L, n) => {
    const steps = BAY.lessonSteps(n, words, 'test');
    sizes.push(steps.length);
    const reads = steps.filter(s => s.type === 'bread');
    if (steps.length < 5) problems.push(`${L.id}: ${steps.length} steps`);
    if (reads.length < 2) problems.push(`${L.id}: ${reads.length} words to read`);
    for (const s of steps) {
      if (s.choices.length !== 3 || !s.choices.includes(s.right) || new Set(s.choices).size !== 3) problems.push(`${L.id}: a ${s.type} step's choices`);
      if (s.type === 'bread' && !BAY.fits(s.right, BAY.allowed(n))) problems.push(`${L.id}: “${s.right}” uses characters not taught yet`);
      if (s.type === 'bread' && BAY.spell(s.right).text !== s.glyph) problems.push(`${L.id}: “${s.right}” shows the wrong glyphs`);
    }
  });
  ok(!problems.length, `${BAY.LESSONS.length} lessons build (${sizes.join(' / ')} steps), each word read only once its characters are taught`, problems);
}

// ------------------------------------------------------------ recordings
console.log('Recordings (amigo/audio/, made by tools/amigo-voice.mjs)');
{
  const fs = require('node:fs'), path = require('node:path'), url = require('node:url');
  const dir = path.join(path.dirname(url.fileURLToPath(import.meta.url)), '..', 'amigo', 'audio');
  const w = {};
  new Function('window', fs.readFileSync(path.join(dir, 'index.js'), 'utf8'))(w);
  const strict = process.argv.includes('--require-recordings');
  const listed = Object.keys((w.AMIGO_AUDIO && w.AMIGO_AUDIO.tl) || {});
  const missing = listed.filter(k => !fs.existsSync(path.join(dir, 'tl', k + '.mp3')));
  // What the lessons can say in Tagalog, the way the page says it (listen,
  // the 🔊 on each scene choice, a matched pair, a tapped tile, a finished
  // build), for a learner who gets everything right and one who misses
  // everything (the reviews and retries), plus the words from Tatay.
  const TLc = COURSES.tl, spoken = new Set(TLc.tatay.words.map(x => x[0]));
  const said = st => st.type === 'listen' ? [st.phrase] : st.type === 'scene' ? st.choices : st.type === 'pairs' ? st.left
    : st.type === 'build' ? [...st.bank.map(E.sayable), st.answer.join(' ')] : [];
  for (const right of [true, false]) {
    const cs = E.courseSave(E.freshSave(), 'tl');
    let day = 40000;
    for (const { unit, n, key } of E.path(TLc)) {
      for (const st of E.buildLesson(TLc, unit, n, cs, day)) { said(st).forEach(t => spoken.add(t)); E.remember(cs, st.id, right, day); }
      E.finish(cs, key, 0, day);
      day += 1;
    }
  }
  // Every line recorded, so no two may share a recording's name.
  const everything = new Set([...spoken, ...TLc.praise, ...TLc.units.flatMap(u => [u.done, ...u.phrases.map(p => p.t), ...u.words.map(x => x[0]), ...u.scenes.flatMap(x => [x.right, ...x.wrong])]),
    ...TLc.baybayin.words.map(x => x[0])].map(t => t.normalize('NFC')));
  const keyOf = new Map(), clashes = [];
  for (const t of everything) { const k = E.audioKey(t); if (keyOf.has(k)) clashes.push(`“${t}” and “${keyOf.get(k)}” share ${k}`); else keyOf.set(k, t); }
  ok(!clashes.length, `no two of the ${everything.size} lines share a recording`, clashes);
  const unrecorded = [...spoken].filter(t => !listed.includes(E.audioKey(t)));
  ok(!missing.length && (!strict || !unrecorded.length),
    `every recording listed is there, and ${spoken.size - unrecorded.length} of the ${spoken.size} things the lessons can say in Tagalog have one` + (strict ? ' (the live app needs all)' : ''),
    [...missing.map(k => 'no file for ' + k), ...(strict ? unrecorded.map(t => `no recording of “${t}”`) : [])]);
  if (!strict && unrecorded.length) console.log(`    (not recorded yet, so the phone's voice says them: ${unrecorded.slice(0, 6).join(' · ')}${unrecorded.length > 6 ? ' …' : ''}. The test site's deploy records them.)`);

  // Past the basics: what its lessons say, the way the page says it (each
  // conversation line under E.lineSay, in its speaker's voice; the whole
  // conversation again from a question), for the same two learners.
  const C2 = COURSES.tl2, spoken2 = new Set();
  const lineKeys = lines => lines.map(E.lineSay);
  const says = (st, unit) => ['dialog', 'transcript'].includes(st.type) ? lineKeys(st.lines) : st.type === 'question' ? lineKeys(unit.dialog.lines)
    : st.type === 'gap' || st.type === 'form' ? [st.say] : st.type === 'say' ? [st.t] : st.type === 'scene' ? st.choices
    : st.type === 'build' ? [...st.bank.map(E.sayable), st.answer.join(' ')] : [];
  for (const right of [true, false]) {
    const cs = E.courseSave(E.freshSave(), 'tl2');
    let day = 40000;
    for (const { unit, n, key } of E.path(C2)) {
      for (const st of E.lesson(C2, unit, n, cs, day)) { says(st, unit).forEach(t => spoken2.add(t.normalize('NFC'))); if (st.id) E.remember(cs, st.id, right, day); }
      E.finish(cs, key, 0, day);
      day += 1;
    }
  }
  const made = new Set(E.voiceLines(C2).map(x => x.key.normalize('NFC')));
  const uncovered = [...spoken2].filter(t => !made.has(t));
  ok(!uncovered.length, `Past the basics: engine.js voiceLines, which the recordings are made from, has all ${spoken2.size} things its lessons can say`, uncovered.map(t => `not in voiceLines: “${t}”`));
  const keyOf2 = new Map(), clashes2 = [];
  for (const t of made) { const k = E.audioKey(t); if (keyOf2.has(k)) clashes2.push(`“${t}” and “${keyOf2.get(k)}” share ${k}`); else keyOf2.set(k, t); }
  ok(!clashes2.length, `Past the basics: no two of its ${made.size} lines share a recording`, clashes2);
  const listed2 = Object.keys((w.AMIGO_AUDIO && w.AMIGO_AUDIO.tl2) || {});
  const missing2 = listed2.filter(k => !fs.existsSync(path.join(dir, 'tl2', k + '.mp3')));
  const unrecorded2 = [...spoken2].filter(t => !listed2.includes(E.audioKey(t)));
  ok(!missing2.length && (!strict || !unrecorded2.length),
    `Past the basics: every recording listed is there, and ${spoken2.size - unrecorded2.length} of the ${spoken2.size} have one` + (strict ? ' (the live app needs all)' : ''),
    [...missing2.map(k => 'no file for tl2/' + k), ...(strict ? unrecorded2.map(t => `no recording of “${t}”`) : [])]);
  if (!strict && unrecorded2.length) console.log(`    (not recorded yet: ${unrecorded2.slice(0, 4).join(' · ')}${unrecorded2.length > 4 ? ' …' : ''}. The test site's deploy records them.)`);
}

console.log(failed ? `\n${failed} failed` : '\nall passed');
process.exit(failed ? 1 : 0);
