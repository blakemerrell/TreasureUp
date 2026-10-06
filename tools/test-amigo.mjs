#!/usr/bin/env node
// Wika (it was Amigo · Kaibigan) without a screen: every course follows the
// rules in amigo/README.md, every lesson builds and can be answered, reviews
// and streaks work, and Baybayin spells words right. The Hebrew and Greek
// courses too: tools/wika-words.mjs makes them from the weeks (tried here on
// made-up weeks), the live app keeps only approved words, Hebrew is marked
// right to left, the alef-bet and the Greek letters teach every letter, and
// tools/amigo-voice.mjs records them (against a stand-in for Google).
// Run: node tools/test-amigo.mjs
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const E = require('../amigo/engine.js');
const BAY = require('../amigo/baybayin.js');
const ALEF = require('../amigo/alefbet.js');
const GRK = require('../amigo/greek-letters.js');
const COURSES = { es: require('../amigo/course-es.js'), tl: require('../amigo/course-tl.js'), tl2: require('../amigo/course-tl2.js'),
  he: require('../amigo/course-he.js'), el: require('../amigo/course-el.js') };

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
// A words course (Hebrew, Greek): a unit a week, made by tools/wika-words.mjs.
const HEBREW = /[\u0590-\u05FF]/, GREEK = /[\u0370-\u03FF\u1F00-\u1FFF]/;
function wordsRules(C, id) {
  const problems = [];
  if (C.id !== id || C.kind !== 'words' || !C.voices.length || C.praise.length < 2 || !Array.isArray(C.lessonNames) || C.lessonNames.length !== E.LESSONS_PER_UNIT) problems.push('needs its id, kind words, voices, praise and 3 lessonNames');
  if (id === 'he' && C.dir !== 'rtl') problems.push('Hebrew is dir rtl');
  if (!C.units.length && !C.empty && id === 'el') problems.push('an empty course needs its `empty` line');
  const ids = new Set(), starts = [];
  for (const u of C.units) {
    const at = u.id;
    for (const f of ['id', 'title', 'sub', 'blurb', 'done', 'doneNote', 'start']) if (!u[f]) problems.push(`${at}: needs ${f}`);
    if (ids.has(u.id)) problems.push(`two units are ${u.id}`);
    ids.add(u.id); starts.push(u.start);
    if (u.words.length < E.MIN_WORDS || u.words.length > 9) problems.push(`${at}: ${u.words.length} words (${E.MIN_WORDS} to 9)`);
    const glosses = new Set(), words = new Set();
    for (const w of u.words) {
      for (const f of ['id', 'word', 'say', 'gloss', 'means', 'ref', 'kjv']) if (!w[f]) problems.push(`${at}: ${w.id || '?'} needs ${f}`);
      if (typeof w.approved !== 'boolean') problems.push(`${at}: ${w.id} needs approved (true or false)`);
      if (!(id === 'he' ? HEBREW : GREEK).test(w.word || '')) problems.push(`${at}: “${w.word}” isn't ${id === 'he' ? 'Hebrew' : 'Greek'}`);
      if (w.word !== String(w.word).normalize('NFC')) problems.push(`${at}: “${w.word}” isn't NFC`);
      if (glosses.has(w.gloss)) problems.push(`${at}: two words mean “${w.gloss}” (Match the pairs couldn't tell them apart)`);
      if (words.has(w.word)) problems.push(`${at}: “${w.word}” twice`);
      glosses.add(w.gloss); words.add(w.word);
    }
    if (u.approved !== u.words.every(w => w.approved)) problems.push(`${at}: approved is whether all its words are`);
  }
  if (starts.join() !== starts.slice().sort().join()) problems.push('the weeks are in date order');
  const n = C.units.reduce((a, u) => a + u.words.length, 0), ok2 = C.units.reduce((a, u) => a + u.words.filter(w => w.approved).length, 0);
  ok(!problems.length, `${C.units.length} ${C.units.length === 1 ? 'week' : 'weeks'}, ${n} treasure words (${ok2} approved) follow the rules`, problems);
}
for (const [id, C] of Object.entries(COURSES)) {
  console.log(`${C.name}${C.title ? ' · ' + C.title : ''} (course-${id}.js)`);
  if (C.kind === 'conversation') { conversationRules(C, id); continue; }
  if (C.kind === 'words') { wordsRules(C, id); continue; }
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
function lessonChecks(id, C, label) {
  console.log(label || `${C.name}${C.title ? ' · ' + C.title : ''}: the lessons`);
  if (!C.units.length) { console.log('    (no weeks yet: nothing to play)'); return; }
  const words = C.kind === 'words';
  const save = E.freshSave(), cs = E.courseSave(save, id), problems = [], sizes = [];
  let day = 20600, reviewsSeen = 0;
  for (const { unit, n, key } of E.path(C)) {
    if (!E.unlocked(C, cs, key)) problems.push(`${key} is still locked when its turn comes`);
    const steps = E.lesson(C, unit, n, cs, day);
    sizes.push(steps.length);
    if (steps.length < 6 || steps.length > 16) problems.push(`${key}: ${steps.length} steps (6 to 16)`);
    if (words) {
      const types = new Set(steps.map(st => st.type)), want = [['hear', 'card'], ['see', 'pick'], ['hear', 'pick']][n];
      if (!want.every(t => types.has(t))) problems.push(`${key}: lesson ${n + 1} has ${[...types].join(', ')} (wants ${want.join(', ')})`);
      if (types.has('build')) problems.push(`${key}: no building from tiles in ${C.name}`);
      const intro = new Set(steps.filter(st => st.type === 'card').map(st => st.wordId));
      for (const st of steps) if (['hear', 'see', 'pick'].includes(st.type) && !st.review && n === 0 && !intro.has(st.id)) problems.push(`${key}: “${st.word}” asked before its card`);
    }
    const again = E.lesson(C, unit, n, cs, day);
    if (JSON.stringify(again) !== JSON.stringify(steps)) problems.push(`${key}: built twice, it comes out different`);
    let xp = 0;
    for (const st of steps) {
      if (st.review) reviewsSeen++;
      if (['listen', 'scene', 'question', 'gap', 'form', 'hear', 'see', 'pick'].includes(st.type)) {
        if (st.choices.length !== 3 || !st.choices.includes(st.right) || new Set(st.choices).size !== 3) problems.push(`${key}: “${st.id || st.q || st.t}” needs 3 different choices, the right one among them`);
        if (st.type === 'gap' && (st.shown.split('____').length !== 2 || st.shown.replace('____', st.right) !== st.t)) problems.push(`${key}: the line with a missing word (“${st.shown}”) isn't the line with it taken out`);
        if (st.type === 'form' && st.say !== st.prompt.replace('___', st.right)) problems.push(`${key}: “${st.prompt}” says the wrong sentence after`);
      } else if (st.type === 'say') {
        if (!st.t || !st.en || E.check(st, 'no')) problems.push(`${key}: “${st.t}”: to say, with “not quite” not counted right`);
      } else if (E.INFO.has(st.type)) {
        if (st.type === 'card' ? !(st.word && st.gloss && st.means) : st.type !== 'grammar' && !(st.lines && st.lines.length)) problems.push(`${key}: a ${st.type} with nothing in it`);
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
  if (words && C.units.length < 2) console.log('    (one week: its words come back within it; reviews from earlier weeks need two)');
  else ok(reviewsSeen > 0, `earlier ${words ? 'words' : 'phrases'} come back in later lessons (${reviewsSeen} times)`);
  ok(cs.streak.count === lessons && E.streakNow(cs, day - 1) === lessons && E.streakNow(cs, day) === lessons && E.streakNow(cs, day + 1) === 0,
    `the streak counts each day in a row (${cs.streak.count}), lasts through the next day, then ends`);
  ok(Object.keys(cs.done).length === lessons && cs.xp > 0 && !E.nextLesson(C, cs), `every lesson is done and ${cs.xp} XP earned`);
  // A missed phrase comes back the next lesson; one known well waits. (A
  // conversation's first lesson is all listening: miss a form in its second.)
  // (A words course's next lesson asks the same week's words anyway, so it's
  // tried from a week's last lesson to the next week's first.)
  if (words && C.units.length < 2) { console.log('    (one week: a missed word coming back is tried on the made-up weeks below)'); return; }
  const fresh = E.courseSave(E.freshSave(), id), talk = C.kind === 'conversation', [first, second] = E.path(C).slice(talk ? 1 : words ? 2 : 0);
  if (talk) E.finish(fresh, E.path(C)[0].key, 50, 30000);
  const firstSteps = E.lesson(C, first.unit, first.n, fresh, 30000);
  const missed = firstSteps.find(s => s.type === (talk ? 'form' : words ? 'hear' : 'listen')).id;
  for (const st of firstSteps) if (st.id) E.remember(fresh, st.id, st.id !== missed, 30000);
  E.finish(fresh, first.key, 50, 30000);
  const later = E.lesson(C, second.unit, second.n, fresh, 30000);
  ok(later.some(s => s.review && s.id === missed) && later.filter(s => s.review).length === 1, `a missed ${talk ? 'form' : words ? 'word' : 'phrase'} (“${missed}”) comes back in the next lesson, and only it, the same day`);
  E.finish(fresh, second.key, 50, 30002);
  ok(fresh.streak.count === 1, 'a day skipped starts the streak over');
}
for (const [id, C] of Object.entries(COURSES)) lessonChecks(id, C);
lessonChecks('he', E.liveWords(COURSES.he), 'Hebrew as the live app has it: the lessons');

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

  // Spanish, recorded like the first Tagalog course (Blake, 2026-10-04: Javan's
  // Kindle has no Spanish voice). What its lessons can say, for the same two
  // learners, is all in what tools/amigo-voice.mjs records. Not yet required on
  // the live app: its recordings come from the test site's deploy, and until a
  // line has one the phone's own voice says it, as before.
  const ESc = COURSES.es, spokenEs = new Set();
  for (const right of [true, false]) {
    const cs = E.courseSave(E.freshSave(), 'es');
    let day = 40000;
    for (const { unit, n, key } of E.path(ESc)) {
      for (const st of E.buildLesson(ESc, unit, n, cs, day)) { said(st).forEach(t => spokenEs.add(t.normalize('NFC'))); E.remember(cs, st.id, right, day); }
      E.finish(cs, key, 0, day);
      day += 1;
    }
  }
  const madeEs = new Set([...ESc.praise, ...ESc.units.flatMap(u => [u.done, ...u.phrases.map(p => p.t), ...u.words.map(x => x[0]), ...u.scenes.flatMap(x => [x.right, ...x.wrong]),
    ...u.phrases.flatMap(p => E.tiles(p.t)).map(E.sayable)])].map(t => t.normalize('NFC')));
  const uncoveredEs = [...spokenEs].filter(t => !madeEs.has(t));
  ok(!uncoveredEs.length, `Spanish: what's recorded covers all ${spokenEs.size} things its lessons can say`, uncoveredEs.map(t => `not recorded by amigo-voice.mjs: “${t}”`));
  const keyOfEs = new Map(), clashesEs = [];
  for (const t of madeEs) { const k = E.audioKey(t); if (keyOfEs.has(k)) clashesEs.push(`“${t}” and “${keyOfEs.get(k)}” share ${k}`); else keyOfEs.set(k, t); }
  ok(!clashesEs.length, `Spanish: no two of its ${madeEs.size} lines share a recording`, clashesEs);
  const listedEs = Object.keys((w.AMIGO_AUDIO && w.AMIGO_AUDIO.es) || {});
  const missingEs = listedEs.filter(k => !fs.existsSync(path.join(dir, 'es', k + '.mp3')));
  const unrecordedEs = [...spokenEs].filter(t => !listedEs.includes(E.audioKey(t)));
  ok(!missingEs.length, `Spanish: every recording listed is there, and ${spokenEs.size - unrecordedEs.length} of the ${spokenEs.size} have one`, missingEs.map(k => 'no file for es/' + k));
  if (unrecordedEs.length) console.log(`    (not recorded yet, so the phone's voice says them: ${unrecordedEs.slice(0, 4).join(' · ')}${unrecordedEs.length > 4 ? ' …' : ''}. The test site's deploy records them.)`);
}

// ------------------------------------------------------------ Hebrew and Greek: the generator
console.log('The treasure words: tools/wika-words.mjs, on made-up weeks');
{
  const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
  const W = await import('./wika-words.mjs');
  const approve = x => Object.assign(x, { approved: W.approvalHash(W.withoutApproval(x)) });
  const he = (id, word, gloss, say) => ({ id, ref: 'Isaiah 1:1', word, form: word, strong: 'H' + (1000 + id.length), gloss, say, kjv: gloss, means: 'What ' + gloss + ' means, in a sentence for Javan.' });
  const el = (id, word, gloss, say) => Object.assign(he(id, word, gloss, say), { strong: 'G' + (2000 + id.length) });
  const week = (dates, reference, title, treasure) => ({ dates, reference, title, lesson: 'https://example.org/x/1?lang=eng', sections: [], treasure });
  // Week 2 (in weeks.js): all approved. Week 1 (past): one changed since it was approved, one never approved.
  // Week 3 (upcoming, and an older copy of week 2 too): Hebrew and Greek, the Greek all approved.
  const w1 = week('October 5–11, 2026', 'Isaiah 50–57', 'First week', [approve(he('a-shalom', 'שָׁלוֹם', 'our peace', 'sha-LOHM')), approve(he('a-lev', 'לֵב', 'a heart', 'LEV')),
    approve(he('a-yad', 'יָד', 'hand', 'YAD')), he('a-tov', 'טוֹב', 'good', 'TOV'), Object.assign(approve(he('a-or', 'אוֹר', 'light', 'OHR')), { gloss: 'changed light' })]);
  const w2 = week('October 12–18, 2026', 'Isaiah 58–66', 'Second week', [approve(he('b-gan', 'גַּן', 'garden', 'GAHN')), approve(he('b-dag', 'דָּג', 'a fish', 'DAG')),
    approve(he('b-am', 'עַם', 'people', 'AHM')), approve(he('b-mayim', 'מַיִם', 'water', 'MAH-yeem')), approve(he('b-lechem', 'לֶחֶם', 'bread', 'LEH-khem'))]);
  const w3 = week('December 21–27, 2026', 'Christmas', 'Third week', [approve(he('c-pele', 'פֶּלֶא', 'a wonder', 'PEH-leh')), approve(he('c-el', 'אֵל', 'God', 'EL')),
    approve(he('c-gibbor', 'גִּבּוֹר', 'mighty', 'gi-BOHR')), approve(el('c-phatne', 'φάτνη', 'a manger,', 'FAT-nee')), approve(el('c-soter', 'σωτήρ', 'a Savior', 'so-TEER')),
    approve(el('c-aster', 'ἀστήρ', 'star', 'as-TEER')), approve(el('c-angelos', 'ἄγγελος', 'angel', 'AN-ge-los'))]);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wika-words-'));
  fs.mkdirSync(path.join(dir, 'content', 'past'), { recursive: true }); fs.mkdirSync(path.join(dir, 'content', 'upcoming')); fs.mkdirSync(path.join(dir, 'amigo'));
  fs.writeFileSync(path.join(dir, 'content', 'weeks.js'), '// made up\nwindow.TU_WEEKS = ' + JSON.stringify([w2]) + ';\n');
  fs.writeFileSync(path.join(dir, 'content', 'past', 'week-41.js'), '(window.TU_PAST = window.TU_PAST || {})[41] = ' + JSON.stringify(w1) + ';\n');
  fs.writeFileSync(path.join(dir, 'content', 'upcoming', '2026-12-21.json'), JSON.stringify(w3));
  fs.writeFileSync(path.join(dir, 'content', 'upcoming', '2026-10-12.json'), JSON.stringify(week(w2.dates, 'Old copy', 'Old copy', [approve(he('z-old', 'זָקֵן', 'old', 'za-KEN'))])));
  const { courses: out } = W.run({ root: dir, log: () => {} });
  const H = require(path.join(dir, 'amigo', 'course-he.js')), G = require(path.join(dir, 'amigo', 'course-el.js'));
  const problems = [];
  if (JSON.stringify(H) !== JSON.stringify(out.he) || JSON.stringify(G) !== JSON.stringify(out.el)) problems.push('the files written aren\'t the courses it made');
  if (H.units.map(u => u.title).join(' | ') !== 'Isaiah 50–57 | Isaiah 58–66 | Christmas') problems.push(`Hebrew weeks, in date order, by their reading: ${H.units.map(u => u.title).join(' | ')}`);
  if (H.units.map(u => u.sub).join(' | ') !== 'October 5–11 | October 12–18 | December 21–27') problems.push(`with their dates: ${H.units.map(u => u.sub).join(' | ')}`);
  if (H.units.some(u => u.words.some(w => w.id === 'z-old'))) problems.push('weeks.js’s copy of a week wins over the one still waiting in upcoming/');
  if (G.units.length !== 1 || G.units[0].words.map(w => w.word).join(' ') !== 'φάτνη σωτήρ ἀστήρ ἄγγελος' || H.units[2].words.length !== 3) problems.push('a Strong’s number starting with G is Greek, H Hebrew');
  const flags = Object.fromEntries(H.units.flatMap(u => u.words.map(w => [w.id, w.approved])));
  if (!(flags['a-shalom'] && !flags['a-tov'] && !flags['a-or'] && flags['b-gan'])) problems.push(`approved only where the fingerprint matches: ${JSON.stringify(flags)}`);
  if (H.units[0].approved || !H.units[1].approved) problems.push('a week is approved when all its words are');
  if (H.units[0].words[0].gloss !== 'peace' || G.units[0].words[0].gloss !== 'manger' || W.meaningOf({ gloss: '-el', kjv: 'Immanuel' }) !== 'Immanuel'
    || W.meaningOf({ gloss: 'will I ransom? them' }) !== 'ransom' || W.meaningOf({ gloss: 'x', short: 'a wonder' }) !== 'a wonder') problems.push('the meanings the choices use: the gloss without words that fit only its verse, or `short`');
  ok(!problems.length, `made-up weeks in weeks.js, past/ and upcoming/ become ${H.units.length} Hebrew weeks and ${G.units.length} Greek, in date order, marked approved only where the fingerprint matches`, problems);
  // The live app: only approved words; a week with too few is left out.
  const live = E.liveWords(H), liveIds = live.units.flatMap(u => u.words.map(w => w.id));
  ok(live.units.length === 3 && !liveIds.includes('a-tov') && !liveIds.includes('a-or') && liveIds.includes('a-shalom') && H.units[0].words.length === 5,
    `the live app keeps only the approved words (${liveIds.length} of ${H.units.reduce((n, u) => n + u.words.length, 0)}), and the test site all of them, marked`);
  const thin = E.liveWords({ units: [{ id: 'x', words: [{ id: 1, approved: true }, { id: 2, approved: true }, { id: 3, approved: false }] }] });
  ok(!thin.units.length, `a week with fewer than ${E.MIN_WORDS} approved words isn’t on the live app`);
  // The made-up courses play like the real ones (a missed word comes back, across weeks).
  lessonChecks('he', H, 'Made-up Hebrew: the lessons');
  lessonChecks('el', G, 'Made-up Greek: the lessons');
  // No Greek yet: an empty course, with its friendly line.
  const none = W.buildCourses([w2]);
  ok(!none.el.units.length && /next year’s New Testament/.test(none.el.empty) && !E.path(none.el).length, 'with no Greek words yet, the Greek course is empty and says they come with next year’s New Testament');
  // The real files are what it makes from content/ now.
  const real = W.run({ check: true, log: () => {} });
  ok(!real.stale.length, 'amigo/course-he.js and course-el.js are up to date with the weeks (else: node tools/wika-words.mjs)', real.stale);
  fs.rmSync(dir, { recursive: true, force: true });
}

// ------------------------------------------------------------ the alef-bet and the Greek letters
function letterChecks(name, M, all, words, firstReading) {
  console.log(name);
  const problems = [], sizes = [], taught = new Set();
  M.LESSONS.forEach((L, n) => {
    const steps = M.lessonSteps(n, words, 'test'), a = M.allowed(n), reads = steps.filter(s => s.type === 'bread');
    sizes.push(steps.length);
    if (steps.length < 5 || steps.length > 18) problems.push(`${L.id}: ${steps.length} steps (5 to 18)`);
    if (n >= firstReading && reads.length < 2) problems.push(`${L.id}: ${reads.length} words to read (at least 2)`);
    for (const s of steps) {
      if (s.choices.length !== 3 || !s.choices.includes(s.right) || new Set(s.choices).size !== 3) problems.push(`${L.id}: a ${s.type} step’s choices (${s.choices.join(', ')})`);
      if (s.type === 'bsound' || s.type === 'bglyph') taught.add(s.type === 'bsound' ? s.glyph : s.right);
      if (s.type === 'bread' && !M.fits(s.glyph, a)) problems.push(`${L.id}: “${s.glyph}” uses letters not taught yet`);
      if (s.type === 'bread' && !M.letters(s.glyph).every(c => [...a.letters].includes(c))) problems.push(`${L.id}: “${s.glyph}” has a letter not taught`);
    }
  });
  const missing = all.filter(g => !taught.has(g));
  ok(!problems.length && !missing.length, `${M.LESSONS.length} lessons (${sizes.join(' / ')} steps) teach all ${all.length}, and each word to read uses only letters taught by then`,
    [...problems, ...missing.map(g => `${g} is never taught`)]);
}
{
  const heWords = ALEF.readingWords(E.liveWords(COURSES.he).units.flatMap(u => u.words.map(w => ({ word: w.word, say: w.say, en: w.gloss }))));
  letterChecks('The alef-bet (amigo/alefbet.js)', ALEF, [...ALEF.LETTERS.map(l => l.glyph), ...ALEF.FINALS.map(l => l.glyph)], heWords, 1);
  ok(ALEF.LETTERS.length === 22 && ALEF.FINALS.length === 5 && ALEF.LESSONS.some(l => l.vowels) && ALEF.LESSONS.length >= 5 && ALEF.LESSONS.length <= 7, '22 letters, 5 final forms and a lesson on the vowel points, in about 6 lessons');
  const tw = heWords.filter(w => !ALEF.FIXED.some(f => f.word === w.word));
  ok(tw.length > 0 && ALEF.LESSONS.some((_, n) => ALEF.lessonSteps(n, heWords, 'test').some(s => s.type === 'bread' && tw.some(w => w.word === s.glyph))), `the treasure words are read where the letters allow (${tw.length} of them)`);
  const nm = { Javan: 'יָוָן', Blake: 'בְּלֵיק', Bleyk: 'בְּלֵיק', Mom: 'מוֹם' };
  const wrongH = Object.entries(nm).filter(([w, want]) => ALEF.spell(w).text.normalize('NFC') !== want.normalize('NFC')).map(([w, want]) => `${w}: ${ALEF.spell(w).text} (want ${want})`);
  ok(!wrongH.length && /Genesis 10:2/.test(ALEF.spell('Javan').note) && /Greece/.test(ALEF.fact), `the name writer: Javan → ${ALEF.spell('Javan').text} (the Bible’s spelling, Genesis 10:2), Blake → ${ALEF.spell('Blake').text}`, wrongH);
  const grWords = GRK.readingWords(E.liveWords(COURSES.el).units.flatMap(u => u.words.map(w => ({ word: w.word, say: w.say, en: w.gloss }))));
  letterChecks('The Greek letters (amigo/greek-letters.js)', GRK, GRK.LETTERS.map(l => l.glyph), grWords, 2);
  ok(GRK.LETTERS.length === 24 && GRK.LESSONS.length >= 4 && GRK.LESSONS.length <= 6, '24 letters in about 5 lessons');
  const ng = { Javan: 'Ιαβαν', Blake: 'Βλεικ', Bleyk: 'Βλεικ', Mom: 'Μομ' };
  const wrongG = Object.entries(ng).filter(([w, want]) => GRK.spell(w).text !== want).map(([w, want]) => `${w}: ${GRK.spell(w).text} (want ${want})`);
  ok(!wrongG.length && /no j/.test(GRK.spell('Javan').note), `the name writer: Javan → ${GRK.spell('Javan').text}, Blake → ${GRK.spell('Blake').text}`, wrongG);
  // The fixed reading words, each in STEPBible's lexicon with that Strong's number and spelling (accents aside).
  const fs = require('node:fs'), path = require('node:path');
  const lexDir = [process.env.STEP_LEX, '/home/user/drafts/treasure/lex'].find(d => d && fs.existsSync(path.join(d, 'tbesh.txt')));
  if (!lexDir) console.log('    (STEPBible’s lexicons aren’t on this computer, so the fixed words aren’t checked against them here: set STEP_LEX to a folder with tbesh.txt and tbesg.txt)');
  else {
    const accents = /[֑-ֽ֯̀-́̀-́]/g;
    for (const [file, list, label] of [['tbesh.txt', ALEF.FIXED, 'Hebrew'], ['tbesg.txt', GRK.FIXED, 'Greek']]) {
      const rows = fs.readFileSync(path.join(lexDir, file), 'utf8').split('\n').map(l => l.split('\t')).filter(r => /^[HG]\d/.test(r[0] || ''));
      const base = x => x.replace(/[A-Z]$/, '');
      const bad = list.filter(w => !rows.some(r => (base(r[2] || '') === base(w.strong) || base(r[0]) === base(w.strong)) && (r[3] || '').normalize('NFC').trim().replace(accents, '') === w.word.normalize('NFC').replace(accents, '')));
      ok(!bad.length, `the ${list.length} fixed ${label} reading words are in STEPBible’s ${file} with their Strong’s numbers`, bad.map(w => `${w.word} ${w.strong}`));
    }
  }
}

// ------------------------------------------------------------ the page: Hebrew right to left, the approval filter
console.log('The page (amigo/index.html)');
{
  const fs = require('node:fs'), path = require('node:path'), url = require('node:url');
  const html = fs.readFileSync(path.join(path.dirname(url.fileURLToPath(import.meta.url)), '..', 'amigo', 'index.html'), 'utf8');
  const problems = [];
  if (!/\.heb \{[^}]*direction: rtl/.test(html)) problems.push('.heb sets direction: rtl');
  // Every place a Hebrew word is drawn: through native() (a <bdi dir="rtl">), or with dir set from its script.
  const nativeSrc = /const native = [^\n]+/.exec(html), SCRIPT = { he: { cls: 'heb', dir: 'rtl' }, el: { cls: 'grk', dir: 'ltr' } };
  const native = nativeSrc && new Function('SCRIPT', 'esc', nativeSrc[0] + '\nreturn native;')(SCRIPT, s => String(s));
  if (!native || !/^<bdi class="heb[^"]*" dir="rtl" lang="he">שָׁלוֹם<\/bdi>$/.test(native('שָׁלוֹם', 'he', 'bigword'))) problems.push('native() wraps Hebrew in <bdi dir="rtl" lang="he">');
  for (const [what, re] of [['the word in a lesson', /wordBox = \(w, say\) => [^\n]*native\(w, langOf\(C\)/], ['the choices of Pick', /data-pick="\$\{esc\(o\)\}">\$\{native\(o, langOf\(C\)\)\}/],
    ['Match the pairs', /data-left="\$\{esc\(w\)\}" lang="\$\{langOf\(C\)\}" \$\{sc\.dir === 'rtl' \? 'dir="rtl"'/], ['a week’s words', /class="wordrow" \$\{scriptOf\(C\.id\)\.dir === 'rtl' \? 'dir="rtl"'/],
    ['a letter or word in the alef-bet', /qattr = qsc \? `class="glyph-big \$\{qsc\.cls\}" dir="\$\{qsc\.dir\}"/], ['the name writer', /class="bay-out \$\{sc\.cls\}" lang="\$\{Q\.lang\}" dir="\$\{sc\.dir\}"/],
    ['the chart', /class="chart" dir="rtl"/], ['the answer', /answerHtml = st\.type === 'pick' \? native\(/]]) if (!re.test(html)) problems.push(`${what} is marked right to left`);
  if (/data-build[^\n]*heb|type: 'build'[^\n]*words/.test(html)) problems.push('no building from tiles in Hebrew or Greek');
  ok(!problems.length, 'Hebrew is marked right to left (dir="rtl", <bdi>) everywhere it’s drawn, in a font with its vowel points', problems);
  ok(/if \(COURSES\[cid\] && !TEST_SITE\) COURSES\[cid\] = E\.liveWords\(COURSES\[cid\]\)/.test(html) && /notApproved\(u\) \? approvedChip/.test(html),
    'the live app keeps only approved Hebrew and Greek words (E.liveWords); the test site marks the rest “Not approved yet”');
  ok(/<title>Wika<\/title>/.test(html) && /Tagalog for “language\.”/.test(html) && /const KEY = 'amigo\.v1'/.test(html), 'it’s called Wika, says wika is Tagalog for “language,” and keeps the progress in amigo.v1');
}

// ------------------------------------------------------------ Hebrew and Greek recordings, against a stand-in for Google
console.log('Hebrew and Greek recordings (tools/amigo-voice.mjs, AMIGO_TTS_API)');
{
  const fs = require('node:fs'), os = require('node:os'), path = require('node:path'), http = require('node:http'), url = require('node:url'), { spawn } = require('node:child_process');
  const root = path.join(path.dirname(url.fileURLToPath(import.meta.url)), '..');
  // What the Hebrew and Greek lessons and the letters quests can say, for a learner who gets all right and one who gets all wrong.
  const says = st => ['hear', 'see', 'card'].includes(st.type) ? [st.word] : st.type === 'pick' ? st.choices : st.type === 'pairs' ? st.left : st.voice ? [st.voice] : [];
  const recordedBy = cid => {
    const L = cid === 'he' ? ALEF : GRK, names = cid === 'he' ? [...ALEF.LETTERS, ...ALEF.FINALS].map(l => l.he) : GRK.LETTERS.map(l => l.el);
    return new Set([...E.wordLines(COURSES[cid]), ...names, ...L.FIXED.map(w => w.word)].map(t => t.normalize('NFC')));
  };
  for (const [cid, L, label] of [['he', ALEF, 'Hebrew'], ['el', GRK, 'Greek']]) {
    const spoken = new Set(), C = COURSES[cid];
    for (const right of [true, false]) {
      const cs = E.courseSave(E.freshSave(), cid);
      let day = 40000;
      for (const { unit, n, key } of E.path(C)) { for (const st of E.lesson(C, unit, n, cs, day)) { says(st).forEach(t => spoken.add(t.normalize('NFC'))); if (st.id) E.remember(cs, st.id, right, day); } E.finish(cs, key, 0, day); day++; }
    }
    const tw = L.readingWords(C.units.flatMap(u => u.words.map(w => ({ word: w.word, say: w.say, en: w.gloss }))));
    L.LESSONS.forEach((_, n) => L.lessonSteps(n, tw, 'amigo').forEach(st => says(st).forEach(t => spoken.add(t.normalize('NFC')))));
    (cid === 'he' ? [...ALEF.LETTERS, ...ALEF.FINALS].map(l => l.he) : GRK.LETTERS.map(l => l.el)).forEach(t => spoken.add(t.normalize('NFC')));   // the chart
    const made = recordedBy(cid), uncovered = [...spoken].filter(t => !made.has(t));
    const keys = new Map(), clashes = [];
    for (const t of made) { const k = E.audioKey(t); if (keys.has(k)) clashes.push(`“${t}” and “${keys.get(k)}” share ${k}`); keys.set(k, t); }
    ok(!uncovered.length && !clashes.length, `${label}: what’s recorded (${made.size} lines: the treasure words, the letters’ names, the reading words) covers all ${spoken.size} things its lessons and letters can say`, [...uncovered.map(t => `not recorded: “${t}”`), ...clashes]);
  }
  // A stand-in for Google: its voices, and an MP3 for each line asked.
  const asked = [];
  const VOICES = { 'he-IL': [['he-IL-Standard-B', 'MALE'], ['he-IL-Wavenet-A', 'FEMALE'], ['he-IL-Wavenet-B', 'MALE'], ['he-IL-Chirp3-HD-Charon', 'MALE']],
    'el-GR': [['el-GR-Standard-B', 'MALE'], ['el-GR-Wavenet-A', 'FEMALE'], ['el-GR-Chirp3-HD-Charon', 'MALE']] };
  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      const u = new URL(req.url, 'http://x');
      res.setHeader('Content-Type', 'application/json');
      if (u.pathname.endsWith('/voices')) return res.end(JSON.stringify({ voices: (VOICES[u.searchParams.get('languageCode')] || []).map(([name, ssmlGender]) => ({ name, ssmlGender })) }));
      const j = JSON.parse(body || '{}');
      asked.push(j);
      res.end(JSON.stringify({ audioContent: Buffer.from('ID3 ' + j.input.text).toString('base64') }));
    });
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'wika-voice-'));
  const run = args => new Promise(r => {
    const p = spawn(process.execPath, [path.join(root, 'tools', 'amigo-voice.mjs'), ...args], { env: Object.assign({}, process.env, { AMIGO_TTS_API: `http://127.0.0.1:${server.address().port}`, GOOGLE_TTS_KEY: 'test', AMIGO_AUDIO_DIR: out, GOOGLE_TTS_JSON: '' }) });
    let log = ''; p.stdout.on('data', d => log += d); p.stderr.on('data', d => log += d); p.on('close', code => r({ code, log }));
  });
  const he = await run(['--course', 'he']), el = await run(['--course', 'el']);
  server.close();
  const w = {};
  new Function('window', fs.readFileSync(path.join(out, 'index.js'), 'utf8'))(w);
  const A = w.AMIGO_AUDIO || {}, problems = [];
  if (he.code || el.code) problems.push(he.log + el.log);
  if (!A.voice || A.voice.he !== 'he-IL-Wavenet-B' || A.voice.el !== 'el-GR-Chirp3-HD-Charon') problems.push(`the voices picked: ${JSON.stringify(A.voice)} (want a man’s WaveNet for Hebrew, a man’s Chirp for Greek)`);
  for (const cid of ['he', 'el']) {
    const want = recordedBy(cid), files = fs.existsSync(path.join(out, cid)) ? fs.readdirSync(path.join(out, cid)) : [];
    if (Object.keys(A[cid] || {}).length !== want.size || files.length !== want.size) problems.push(`${cid}: ${files.length} files, ${Object.keys(A[cid] || {}).length} listed, of ${want.size}`);
    for (const t of want) if (!(A[cid] || {})[E.audioKey(t)]) { problems.push(`${cid}: no recording listed for “${t}”`); break; }
  }
  if (asked.some(j => !['he-IL', 'el-GR'].includes(j.voice.languageCode) || j.audioConfig.speakingRate !== 0.9)) problems.push('each line asked in he-IL or el-GR, at 0.9');
  if (!asked.some(j => j.input.text === 'שָׁלוֹם') || !asked.some(j => j.input.text === 'φάτνη')) problems.push('the words are sent as written, with their points and accents');
  const again = await new Promise(r => { server.listen(0, '127.0.0.1', () => r()); }).then(() => run(['--course', 'he'])).finally(() => server.close());
  if (!/he: 0 recorded now/.test(again.log)) problems.push('a second run records nothing new: ' + again.log.trim());
  ok(!problems.length, `against a stand-in for Google: ${asked.length} lines recorded as amigo/audio/he/ and el/, in ${A.voice && A.voice.he} and ${A.voice && A.voice.el}, kept in amigo/audio/index.js`, problems);
  fs.rmSync(out, { recursive: true, force: true });
}

console.log(failed ? `\n${failed} failed` : '\nall passed');
process.exit(failed ? 1 : 0);
