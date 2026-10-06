# Wika: how a course is written

*Wika* is Tagalog for "language" (Blake, 2026-10-06: "Change the name … to …
wika", "Add the 2 other languages"). It was Amigo · Kaibigan, and keeps that
game's address (`amigo/`) and progress (localStorage `amigo.v1`), so Javan's
lessons and streaks carry on and old links still work.

Spanish for his friends at school; Tagalog, Blake's mission language (the
Philippines, 2002–2004); and the Bible's own Hebrew and Greek, from the
weeks' treasure words. Each course is a file: `course-es.js` and
`course-tl.js`, Blake's own `course-tl2.js` (Tagalog past the basics, below),
and `course-he.js` and `course-el.js` (Hebrew and Greek, made by a tool,
below). Three scripts are side quests: Baybayin, the alef-bet and the Greek
letters. `node tools/test-amigo.mjs` checks every rule below that can be
counted, and runs at every deploy.

A link can open a course or a quest straight away: `amigo/?course=he` (or
`es`, `tl`, `tl2`, `el`), `amigo/?quest=alef` (or `greek`, `bay`).

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

## Hebrew and Greek: the treasure words (`course-he.js`, `course-el.js`)

Each week in `content/weeks.js`, `content/past/` and `content/upcoming/` has a
`treasure` list: five to seven words from its chapters, in Hebrew (a Strong's
number starting with H) or Greek (G), each with `word` (the dictionary form,
with its vowel points or accents), `say` (how it's said today), `gloss`,
`kjv`, `means`, `more` and `approved` (see `content/README.md`).
**Don't edit the course files**: `node tools/wika-words.mjs` writes them from
the weeks, and both deploys run it before the recording step. It makes:

- **A unit a week**, in date order, titled with the week's reading
  ("Jeremiah 31–33; 36–39; Lamentations 1; 3") and dates, Hebrew words in
  the Hebrew course and Greek in the Greek one (Christmas week has both).
- **Each word marked `approved: true` only when its fingerprint matches**
  (`approvalHash(withoutApproval(item))`, the function in `tools/verify.mjs`,
  which the tool reads from that file). **The live app shows only those**,
  and a week only with at least 3 of them (`engine.js` `liveWords`). The test
  site shows every word, and marks a week or a word "Not approved yet".
- **The meaning the choices use**: the gloss without the words that fit only
  its verse ("of the holy one of" → "holy one"; a gloss that leaves nothing
  gives way to the KJV's word). A word can carry `short` to say it instead.
  Two words of a week with one meaning get their KJV word added.

`kind: 'words'`: three lessons a week (`engine.js` `buildWords`), with no
building from tiles. **Hear**: the first half of the words, each heard (the
word hidden until he answers, if it can be heard) and its meaning picked,
then its card (the word, how it's said, the meaning, `means`, the verse and
the KJV's word, and `more`). **See**: the rest, each seen and its meaning
picked, then its card; the first half the other way round, the meaning → pick
the word. **Pick**: every word heard again, the meaning → pick the word. Match
the pairs in each. A week of 3 or 4 words (Christmas) meets them all in Hear.
A word answered right comes back later as a review, like a phrase. **Hebrew
reads right to left**: every Hebrew word is drawn in a `<bdi dir="rtl">` (or
with `dir="rtl"`), big, in Noto Serif Hebrew, which has the vowel points, with
`say` under it. A course with no weeks yet says so (Greek: "The Greek words
come with next year's New Testament"), and its letters quest still works.

## The alef-bet and the Greek letters

Side quests like Baybayin, each with Learn, Your name and Chart:

- **The alef-bet** (`alefbet.js`): six lessons: Alef to Vav; the vowel points
  (on bet: a, e, i, o, u, the sheva, the dot that makes ב a b); Zayin to
  Lamed; Mem to Tsadi; Qof to Tav; the five final forms (ך ם ן ף ץ). Each
  letter by sight and by name; the chart is right to left, and a tap says its
  name. The fun fact: Javan's name is Hebrew, יָוָן (Genesis 10:2), and it's
  the Old Testament's name for Greece.
- **The Greek letters** (`greek-letters.js`): all 24 in five lessons (Alpha to
  Epsilon, Zeta to Kappa, Lambda to Omicron, Pi to Upsilon, Phi to Omega,
  with the breathing marks), capital and small.
- **Words to read** end each lesson once its letters allow: the language's
  treasure words (the approved ones on the live app), else a few well-known
  Bible words (`FIXED`: שָׁלוֹם, אָמֵן, יָוָן…; ἀγάπη, φῶς…). Each fixed word is
  in STEPBible's lexicon (TBESH, TBESG) under its Strong's number with that
  spelling; the test checks it where it has the files (`STEP_LEX`, or
  `/home/user/drafts/treasure/lex`). A word appears only once every letter
  (and, in Hebrew, its vowel points) has been taught.
- **Write your name**: by its sound, an approximation, and the screen says
  so. Hebrew: a letter with its vowel point (Blake → בְּלֵיק), and a Bible name
  the Bible's way (Javan → יָוָן). Greek: Blake → Βλεικ, and a J name starts
  with Iota, like Ἰησοῦς (Javan → Ιαβαν).

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
   **Hebrew and Greek** (`amigo/audio/he/`, `amigo/audio/el/`) are recorded
   the same way, by the same step: each treasure word, each letter's name (in
   Hebrew, אָלֶף; in Greek, άλφα) and each fixed reading word, in Google's
   Israeli Hebrew (he-IL) and Greek (el-GR) voices, a little slow (0.9). The
   voice is picked the first time like the Spanish one (a man's, among its
   Neural2, WaveNet or Chirp voices if it has any) and kept in
   `amigo/audio/index.js`; `--voice-he`, `--voice-el` pick another,
   `--samples <dir> --course he` says a line in each. **They're modern
   pronunciation**, the way Israelis and Greeks talk today, not a
   reconstruction of Bible times: β is said v, and the treasure words' `say`
   is written the same way. The test tries the recording against a stand-in
   for Google (`AMIGO_TTS_API`, `AMIGO_AUDIO_DIR`).
2. **The phone's own voice** for the language: Spanish in its Mexican voice;
   Tagalog on phones that have one (many Androids: Google's Filipino voice
   data); Hebrew (he-IL) and Greek (el-GR) where the phone has them. Until
   the recordings exist, a phone with neither shows the word and how it's
   said, and says on screen that it has no Hebrew (or Greek) voice yet.
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
