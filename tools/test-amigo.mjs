#!/usr/bin/env node
// Amigo · Kaibigan without a screen: every course follows the rules in
// amigo/README.md, every lesson builds and can be answered, reviews and
// streaks work, and Baybayin spells words right. Run: node tools/test-amigo.mjs
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const E = require('../amigo/engine.js');
const BAY = require('../amigo/baybayin.js');
const COURSES = { es: require('../amigo/course-es.js'), tl: require('../amigo/course-tl.js') };

let failed = 0;
const ok = (cond, what, problems = []) => {
  console.log((cond ? '  ✓ ' : '  ✗ ') + what + (problems.length ? ':\n      ' + problems.slice(0, 12).join('\n      ') : ''));
  if (!cond) failed++;
};
const STRAIGHT = /['"]/;
const pairOk = w => Array.isArray(w) && w.length === 2 && typeof w[0] === 'string' && typeof w[1] === 'string' && w[0] && w[1];

// ------------------------------------------------------------ the courses
for (const [id, C] of Object.entries(COURSES)) {
  console.log(`${C.name} (course-${id}.js)`);
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
  console.log(`${C.name}: the lessons`);
  const save = E.freshSave(), cs = E.courseSave(save, id), problems = [], sizes = [];
  let day = 20600, reviewsSeen = 0;
  for (const { unit, n, key } of E.path(C)) {
    if (!E.unlocked(C, cs, key)) problems.push(`${key} is still locked when its turn comes`);
    const steps = E.buildLesson(C, unit, n, cs, day);
    sizes.push(steps.length);
    if (steps.length < 6 || steps.length > 16) problems.push(`${key}: ${steps.length} steps (6 to 16)`);
    const again = E.buildLesson(C, unit, n, cs, day);
    if (JSON.stringify(again) !== JSON.stringify(steps)) problems.push(`${key}: built twice, it comes out different`);
    let xp = 0;
    for (const st of steps) {
      if (st.review) reviewsSeen++;
      if (st.type === 'listen' || st.type === 'scene') {
        if (st.choices.length !== 3 || !st.choices.includes(st.right) || new Set(st.choices).size !== 3) problems.push(`${key}: “${st.id}” needs 3 different choices, the right one among them`);
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
      if (!E.check(st, right)) problems.push(`${key}: the right answer to “${st.id}” doesn't check`);
      if (st.type === 'listen' && E.check(st, st.choices.find(c => c !== st.right))) problems.push(`${key}: a wrong answer checks`);
      if (st.type === 'build' && st.answer.length > 1 && E.check(st, st.answer.slice().reverse())) problems.push(`${key}: “${st.id}” backwards checks`);
      E.remember(cs, st.id, true, day);
      xp += E.XP_RIGHT;
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
  // A missed phrase comes back the next lesson; one known well waits.
  const fresh = E.courseSave(E.freshSave(), id), [first, second] = E.path(C);
  const firstSteps = E.buildLesson(C, first.unit, first.n, fresh, 30000);
  const missed = firstSteps.find(s => s.type === 'listen').id;
  for (const st of firstSteps) E.remember(fresh, st.id, st.id !== missed, 30000);
  E.finish(fresh, first.key, 50, 30000);
  const later = E.buildLesson(C, second.unit, second.n, fresh, 30000);
  ok(later.some(s => s.review && s.id === missed) && later.filter(s => s.review).length === 1, `a missed phrase (“${missed}”) comes back in the next lesson, and only it, the same day`);
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

console.log(failed ? `\n${failed} failed` : '\nall passed');
process.exit(failed ? 1 : 0);
