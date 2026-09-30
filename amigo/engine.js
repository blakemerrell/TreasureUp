// Amigo · Kaibigan: the lessons. A course (amigo/course-es.js, course-tl.js)
// is units of phrases, words and scenes; each unit is three short lessons.
// A lesson brings in a third of the unit's phrases (listen and pick, build
// it from tiles), its words (match the pairs) and the scenes that use them
// (what would you say?), plus phrases from earlier lessons that are due
// again: a phrase answered right comes back after 1, 2, 4, 8… days, one
// missed comes back the next lesson. Each phone keeps its own progress.
// Tested by tools/test-amigo.mjs.
(function (root) {
  'use strict';

  const LESSONS_PER_UNIT = 3;
  const INTERVALS = [0, 1, 2, 4, 8, 16, 32];          // days until a phrase is due again, by how well it's known
  const REVIEWS = 3;                                    // earlier phrases in a lesson, at most
  const XP_RIGHT = 10;

  // A shuffle that comes out the same for the same seed, so a lesson's
  // choices don't jump around while he's on it.
  function rng(seed) {
    let h = 2166136261;
    for (const ch of String(seed)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
    return () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
  }
  function shuffled(list, seed) {
    const r = rng(seed), out = list.slice();
    for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
    return out;
  }
  // A line's recording is amigo/audio/<course>/<this>.mp3: its text's fingerprint,
  // so a changed line needs a new recording (tools/amigo-voice.mjs makes them).
  function audioKey(text) {
    const s = String(text).normalize('NFC');
    let h = 0x811c9dc5;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
    return (h >>> 0).toString(16).padStart(8, '0');
  }
  // A build-it tile as it's said on its own: without its ¿ ¡ and end marks, so
  // "po" and "po." share one recording (tools/amigo-voice.mjs records these too).
  const sayable = w => String(w).replace(/^[¿¡]+/, '').replace(/[?!.,;:]+$/, '');
  // Today, as a whole number of days, on this phone's clock.
  const dayNum = (d = new Date()) => Math.floor((d.getTime() - d.getTimezoneOffset() * 60000) / 86400000);

  // ------------------------------------------------------------ progress

  const freshSave = () => ({ v: 1, courses: {} });
  function courseSave(save, id) {
    return save.courses[id] || (save.courses[id] = { done: {}, mem: {}, streak: { last: null, count: 0 }, xp: 0 });
  }
  // The lessons of a course, in order. `units` may leave some out (the live
  // app shows a Tagalog unit only once Blake has checked it).
  function path(course, units = course.units) {
    return units.flatMap(u => Array.from({ length: LESSONS_PER_UNIT }, (_, n) => ({ unit: u, n, key: u.id + ':' + (n + 1) })));
  }
  function unlocked(course, cs, key, units) {
    const p = path(course, units), i = p.findIndex(x => x.key === key);
    return i === 0 || (i > 0 && !!cs.done[p[i - 1].key]);
  }
  const nextLesson = (course, cs, units) => path(course, units).find(x => !cs.done[x.key]) || null;
  function streakNow(cs, today = dayNum()) {
    const s = cs.streak;
    return s.last === today || s.last === today - 1 ? s.count : 0;
  }

  // ------------------------------------------------------------ lessons

  const third = (list, n) => { const k = Math.ceil(list.length / LESSONS_PER_UNIT); return list.slice(n * k, (n + 1) * k); };
  const tiles = t => t.split(' ');
  const buildable = p => tiles(p.t).length >= 2;

  function listenStep(course, p, seed) {
    const wrong = p.wrong || shuffled(course.units.flatMap(u => u.phrases).filter(x => x.en !== p.en).map(x => x.en), seed).slice(0, 2);
    return { type: 'listen', id: p.t, phrase: p.t, right: p.en, choices: shuffled([p.en, ...wrong], seed + 'c'), note: p.note };
  }
  // A word without its capitals and marks: a spare tile mustn't be one of the answer's in another form (jugar? for jugar!).
  const bare = w => w.toLowerCase().replace(/[¿¡?!.,]/g, '');
  // Every sentence a course has, for spare tiles (a conversation course has no phrase list).
  const sentences = course => course.units.flatMap(u => [...(u.phrases || []).map(p => p.t), ...(u.builds || []).map(b => b.t), ...(u.says || []).map(x => x.t)]);
  function buildStep(course, p, seed) {
    const answer = tiles(p.t), taken = new Set(answer.map(bare));
    const spare = shuffled([...new Set(sentences(course).flatMap(tiles))].filter(w => !taken.has(bare(w))), seed).slice(0, 2);
    return { type: 'build', id: p.t, prompt: p.en, answer, bank: shuffled([...answer, ...spare], seed + 'b'), note: p.note };
  }
  function sceneStep(s, seed) {
    return { type: 'scene', id: s.right, kind: s.kind || 'What would you say?', prompt: s.prompt, right: s.right, choices: shuffled([s.right, ...s.wrong], seed), note: s.note };
  }
  function pairsStep(words, seed) {
    const pairs = words.slice(0, 5);
    return { type: 'pairs', pairs, left: shuffled(pairs.map(p => p[0]), seed + 'l'), rightSide: shuffled(pairs.map(p => p[1]), seed + 'r') };
  }

  // Lesson n (0, 1 or 2) of a unit, for this learner today.
  function buildLesson(course, unit, n, cs, today = dayNum()) {
    const seed = course.id + ':' + unit.id + ':' + n;
    const fresh = third(unit.phrases, n), freshIds = new Set(fresh.map(p => p.t));
    const byId = new Map(course.units.flatMap(u => u.phrases).map(p => [p.t, p]));
    // Earlier phrases that are due, the least known first.
    const due = Object.entries(cs.mem).filter(([id, m]) => byId.has(id) && !freshIds.has(id) && m.due <= today)
      .sort((a, b) => a[1].box - b[1].box || a[1].due - b[1].due).slice(0, REVIEWS).map(([id]) => byId.get(id));
    const review = due.map((p, i) => ({ ...(i % 2 && buildable(p) ? buildStep(course, p, seed + 'r' + i) : listenStep(course, p, seed + 'r' + i)), review: true }));
    const steps = review.slice(0, 2);
    const words = third(unit.words, n);
    let builds = 0, paired = false;
    fresh.forEach((p, i) => {
      steps.push(listenStep(course, p, seed + 'l' + i));
      if (i === 1 && words.length >= 3) { steps.push(pairsStep(words, seed + 'p')); paired = true; }
      const q = fresh[i - 1];                          // build the one before, so it isn't still on screen
      if (q && buildable(q) && builds < 3) { steps.push(buildStep(course, q, seed + 'b' + i)); builds++; }
    });
    const last = fresh[fresh.length - 1];
    if (last && buildable(last) && builds < 3) steps.push(buildStep(course, last, seed + 'bz'));
    if (!paired && words.length >= 3) steps.push(pairsStep(words, seed + 'p'));
    // The scenes whose answer this lesson brought in.
    unit.scenes.filter(s => freshIds.has(s.right)).forEach((s, i) => steps.push(sceneStep(s, seed + 's' + i)));
    steps.push(...review.slice(2));
    return steps;
  }

  // ------------------------------------------------------------ past the basics
  // A conversation course (kind 'conversation', amigo/course-tl2.js): each unit
  // is a conversation between two people and the grammar it uses, in three
  // lessons. Listen: the whole conversation, questions on it, the missing word
  // in a line, then the transcript. Grammar: the point, picking the right form,
  // building sentences. Say it: say the Tagalog aloud and mark yourself, then
  // what would you say?. Its sentences come back later as reviews.
  const INFO = new Set(['dialog', 'transcript', 'grammar']);     // heard or read, not answered
  const lineSay = line => line.who + '|' + line.t;              // a conversation line is recorded in its speaker's voice
  const filled = f => f.prompt.replace('___', f.right);
  // A line with one word taken out: that whole word, wherever it stands.
  function blanked(t, word) {
    const parts = t.split(/([^\p{L}’-]+)/u), i = parts.indexOf(word);
    return i < 0 ? t : parts.map((p, k) => k === i ? '____' : p).join('');
  }
  const formStep = (f, seed) => ({ type: 'form', id: filled(f), prompt: f.prompt, root: f.root, right: f.right, choices: shuffled([f.right, ...f.wrong], seed), en: f.en, note: f.note, say: filled(f) });
  const sayStep = x => ({ type: 'say', id: x.t, t: x.t, en: x.en, note: x.note, right: 'yes' });
  const questionStep = (q, seed) => ({ type: 'question', q: q.q, right: q.right, choices: shuffled([q.right, ...q.wrong], seed), line: q.line, note: q.note });
  function gapStep(unit, g, seed) {
    const line = unit.dialog.lines[g.line - 1];
    return { type: 'gap', line: g.line, who: line.who, name: unit.dialog.people[line.who], t: line.t, en: line.en, say: lineSay(line), shown: blanked(line.t, g.word),
      right: g.word, choices: shuffled([g.word, ...g.wrong], seed) };
  }
  // Every sentence of a conversation course that can come back as a review, by its id.
  function reviewable(course) {
    const out = new Map();
    for (const u of course.units) {
      for (const f of u.forms || []) out.set(filled(f), seed => formStep(f, seed));
      for (const b of u.builds || []) out.set(b.t, seed => buildStep(course, b, seed));
      for (const x of u.says || []) out.set(x.t, () => sayStep(x));
      for (const sc of u.scenes || []) out.set(sc.right, seed => sceneStep(sc, seed));
    }
    return out;
  }
  function buildConversation(course, unit, n, cs, today = dayNum()) {
    const seed = course.id + ':' + unit.id + ':' + n, look = reviewable(course);
    // This lesson's own sentences aren't reviews in it; a form missed in Grammar comes back in Say it.
    const own = new Set(n === 1 ? [...unit.forms.map(filled), ...unit.builds.map(b => b.t)] : n === 2 ? [...unit.says.map(x => x.t), ...unit.scenes.map(x => x.right)] : []);
    const due = Object.entries(cs.mem).filter(([id, m]) => look.has(id) && !own.has(id) && m.due <= today)
      .sort((a, b) => a[1].box - b[1].box || a[1].due - b[1].due).slice(0, REVIEWS)
      .map(([id], i) => Object.assign(look.get(id)(seed + 'r' + i), { review: true }));
    const d = unit.dialog;
    if (n === 0) {
      return [...due.slice(0, 2), { type: 'dialog', setting: d.setting, people: d.people, lines: d.lines },
        ...unit.questions.map((q, i) => questionStep(q, seed + 'q' + i)), ...unit.gaps.map((g, i) => gapStep(unit, g, seed + 'g' + i)),
        { type: 'transcript', setting: d.setting, people: d.people, lines: d.lines }];
    }
    if (n === 1) {
      return [Object.assign({ type: 'grammar' }, unit.grammar),
        ...unit.forms.map((f, i) => formStep(f, seed + 'f' + i)), ...unit.builds.map((b, i) => buildStep(course, b, seed + 'b' + i)), ...due.slice(0, 2)];
    }
    return [...unit.says.map(sayStep), ...unit.scenes.map((sc, i) => sceneStep(sc, seed + 's' + i)), ...due];
  }
  // Any course's lesson n of a unit.
  const lesson = (course, unit, n, cs, today) => course.kind === 'conversation' ? buildConversation(course, unit, n, cs, today) : buildLesson(course, unit, n, cs, today);
  // Everything a conversation course says, and who says it, for its recordings
  // (tools/amigo-voice.mjs): each conversation line under lineSay, in its
  // speaker's voice; the sentences, a tapped tile's word and every answer in a
  // scene in A's. [{ key, text, who }], the key being what audioKey is taken of.
  function voiceLines(course) {
    const out = new Map(), add = (key, text, who) => { if (!out.has(key)) out.set(key, { key, text, who }); };
    for (const u of course.units) {
      for (const l of u.dialog.lines) add(lineSay(l), l.t, l.who);
      for (const t of [...u.forms.map(filled), ...u.builds.map(b => b.t), ...u.says.map(x => x.t), ...u.scenes.flatMap(s => [s.right, ...s.wrong])]) add(t, t, 'A');
    }
    for (const w of sentences(course).flatMap(tiles).map(sayable)) add(w, w, 'A');     // any of them can be a spare tile
    return [...out.values()];
  }

  // ------------------------------------------------------------ answers

  function check(step, answer) {
    if (step.type === 'build') return Array.isArray(answer) && answer.join(' ') === step.answer.join(' ');
    if (step.type === 'pairs' || INFO.has(step.type)) return true;    // done once every pair is matched; heard or read
    return answer === step.right;                                      // a say step's answer is 'yes' (I said it) or 'no'
  }
  // A phrase answered right waits longer before it comes back; one missed comes back next time.
  function remember(cs, id, right, today = dayNum()) {
    if (!id) return;
    const m = cs.mem[id] || { box: 0, due: today };
    m.box = right ? Math.min(m.box + 1, INTERVALS.length - 1) : 0;
    m.due = today + (right ? INTERVALS[m.box] : 0);
    cs.mem[id] = m;
  }
  // A lesson finished: marked done (the first time), XP added, streak kept.
  function finish(cs, key, xp, today = dayNum()) {
    const first = !cs.done[key];
    if (first) { cs.done[key] = { day: today, xp }; cs.xp += xp; }
    const s = cs.streak;
    if (s.last !== today) { s.count = s.last === today - 1 ? s.count + 1 : 1; s.last = today; }
    return { first, streak: s.count };
  }

  const API = { LESSONS_PER_UNIT, INTERVALS, XP_RIGHT, INFO, audioKey, sayable, lineSay, filled, blanked, rng, shuffled, dayNum, freshSave, courseSave, path, unlocked, nextLesson, streakNow,
    buildLesson, buildConversation, lesson, voiceLines, check, remember, finish, tiles };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.AMIGO_ENGINE = API;
})(this);
