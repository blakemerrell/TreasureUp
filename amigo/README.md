# Amigo · Kaibigan: how a course is written

Both words mean *friend*. Spanish for his friends at school, and Tagalog,
Blake's mission language (the Philippines, 2002–2004), with Baybayin as a
side quest. Each course is a file: `course-es.js` and `course-tl.js`, and
Blake's own, `course-tl2.js` (Tagalog past the basics, below).
`node tools/test-amigo.mjs` checks every rule below that can be counted, and
runs at every deploy.

## A unit

```js
{ id: 'recreo', title: 'En el recreo', sub: 'At recess',
  blurb: 'Asking to play, tag, and making a new kid welcome.',
  done: '¡Qué padre!', doneNote: '“¡Qué padre!” means “How cool!” in Mexico.',
  phrases: [ … ], words: [ … ], scenes: [ … ] }
```

- Three lessons of about five minutes each. Each lesson brings in the next
  third of `phrases` and `words`, in order, and the `scenes` whose answer it
  brought in. Put the easiest phrases first.
- `done` and `doneNote` show when the unit's last lesson is done.

## Phrases, words and scenes

- A phrase: `{ t, en, wrong, note }`. `t` exactly as it's said; its build-it
  tiles are its words split at the spaces, punctuation staying with its word
  (`¿Puedo`, `ustedes?`). `en` in natural English. `wrong`: two meanings it
  could be mistaken for. `note`: one fact, only where it helps (a word
  that's slang, a custom). At least 9 phrases a unit.
- A word: `[word, meaning]`, for Match the pairs. At least 9 a unit.
- A scene: `{ kind, prompt, right, wrong, note }`. `prompt` is a situation
  in English; `right` is one of the unit's own phrases; `wrong` is two that
  don't fit it (they can be any phrase).
- Curly quotes and apostrophes only (“ ” ’), never straight ones.

## Spanish

The way kids in Mexico say it: *ustedes* for a group, Mexican words
(*resbaladilla*, *¡Aguas!*, *¡Qué padre!*). A second reviewer reads every
line for how kids there really talk.

## Tagalog

*Po* and *opo* with elders, and the way Filipinos really greet each other
and eat together. **Blake checks every Tagalog line.** Until he has, a unit
shows only on the test site, marked "Not checked yet"; its full list is under
**Check the Tagalog** there. Once he says it's right, give the unit
`checked: 'YYYY-MM-DD'` (the date), and it shows on the live app. The same
goes for `tatay` (the words on the home screen) and `baybayin` (the reading
words).

## Tagalog past the basics (`course-tl2.js`)

Blake's own course: rusty mission Tagalog, and he asked for everyday
conversation, listening at native speed, and the grammar that's slipped. It
has `kind: 'conversation'`, and each unit is a real conversation between two
people and the grammar it uses, in three lessons: **Listen** (the whole
conversation with no words on screen, questions on it, the missing word in a
line, then the words), **Grammar** (the point, picking the right form,
building sentences) and **Say it** (say it aloud, look, mark yourself; then
what would you say?). A sentence from Grammar or Say it comes back later as a
review. A unit:

```js
{ id, title, sub, blurb, done, doneNote,
  dialog: { setting, people: { A: 'Ramon', B: 'Liza' }, lines: [{ who: 'A', t, en, note }, …] },
  questions: [{ q, right, wrong: [2], line }],   // line: the one (from 1) that answers it
  gaps: [{ line, word, wrong: [2] }],            // word: a whole word, once in that line
  grammar: { title, points: [ … ], table: [[root, form, meaning], …] },
  forms: [{ prompt: 'Kahapon, ___ ako ng adobo.', root, right, wrong: [2], en }],
  builds: [{ t, en }], says: [{ t, en }], scenes: [{ kind, prompt, right, wrong: [2], note }] }
```

- 8 to 16 lines of conversation, both people talking. **A is a man and B a
  woman**: their lines are recorded in those voices (`speakers`), at native
  speed; everything else in A's. The *Slower* button plays them at 0.75.
- At least 4 questions, 2 missing words, 4 forms, 3 to build, 3 to say and 2
  scenes. A form's two wrong answers are the same root in other forms; a
  missing word's are too. A form's `root` shows before he answers (“From
  luto.”), so a form about a little word (*na*, *pa*, *din*) has none.
- A sentence to pick a form for, build or say, and a scene's answer, is in
  one unit only (a scene may answer with one of its unit's sentences to say).
- It isn't held back for Blake's check: he is the one learning it, and it
  goes live once he has tried it on the test site.

## Voices

A line is said, in this order, by:

1. **Its recording**, if it has one: `amigo/audio/tl/<key>.mp3`, listed in
   `amigo/audio/index.js`, in Google's Filipino voice fil-ph-Neural2-D (a
   man's; Blake's pick). It plays on every phone. Past the basics is in
   `amigo/audio/tl2/`: each conversation line in its speaker's voice
   (fil-ph-Neural2-D, fil-ph-Neural2-A), listed by `engine.js`
   `voiceLines`. **The test site's deploy
   records any new or changed Tagalog line by itself** (the "Record new
   Tagalog" step, `tools/amigo-voice.mjs`) and saves the files back to the
   repo, so pull before the next push. The Google key is the test repo's
   secret `GOOGLE_TTS_JSON` and is on no computer. By hand, with a key in
   `~/keys`: `--dry` lists what isn't recorded, `--samples <dir>` says one
   line in every Filipino voice, `--voice <name>` picks one, `--all`
   records everything again.
   **Spanish** is recorded the same way (Blake, 2026-10-04: "javan can't hear
   the spanish on this kindle, but he can hear the tagalog"): each line of
   `course-es.js` the game can say, as `amigo/audio/es/<key>.mp3`, in a man's
   Latin American Spanish voice, a little slow (Mexican if Google has one,
   else US Spanish; Neural2 if it can). The voice it picks the first time is
   kept in `amigo/audio/index.js`, so every later line is in the same one;
   `--voice-es <name>` picks another, `--samples <dir> --course es` says one
   line in each. The live app doesn't require the Spanish recordings yet (a
   line without one is said by the phone's voice, as before), so the first
   Spanish recordings must come from the test site's deploy.
2. **The phone's own voice** for the language: Spanish in its Mexican voice;
   Tagalog on phones that have one (many Androids: Google's Filipino voice
   data).
3. For Tagalog on a phone without a Tagalog voice (every iPhone): **the
   Spanish voice**, since Tagalog is said much like Spanish, with *h* said as
   *j* (Spanish *h* is silent) and *ng*, *mga* as they're said. A lesson says
   so on a line that isn't recorded.

## Baybayin

`baybayin.js` spells a word the way it sounds: each character a consonant
with *a*; the kudlit above makes it *e/i*, below *o/u*; the krus-kudlit (᜔)
drops the vowel; *r* is written with *da*; *ng* and *mga* the old way (ᜈᜅ,
ᜋᜅ). Its six lessons teach a few characters at a time, and each reading
word appears only once all its characters have been taught.
