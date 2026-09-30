# Amigo · Kaibigan: how a course is written

Both words mean *friend*. Spanish for his friends at school, and Tagalog,
Blake's mission language (the Philippines, 2002–2004), with Baybayin as a
side quest. Each course is a file: `course-es.js` and `course-tl.js`.
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

## Voices

A line is said, in this order, by:

1. **Its recording**, if it has one: `amigo/audio/tl/<key>.mp3`, listed in
   `amigo/audio/index.js`, made once in a Filipino voice by
   `node tools/amigo-voice.mjs` (Google Cloud Text-to-Speech; the API key
   stays in `~/keys/google-tts.key` and never goes in the app). It plays on
   every phone. `--dry` lists what isn't recorded yet, `--samples <dir>`
   says one line in every Filipino voice to pick from, `--voice <name>`
   picks one, `--all` records everything again. Run it after adding or
   changing Tagalog, and commit the new files.
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
