# Content

Every week the app knows lives in **`content/weeks.js`**: a comment, then
`window.TU_WEEKS = <JSON>;`. Everything after the equals sign is plain JSON,
because developer mode reads and writes it as JSON. Keep it that way when
editing by hand.

## Developer mode

`https://blakemerrell.github.io/TreasureUp-test/#dev` (also linked from the
Parents screen on the test site). It is for Blake and the people he adds by
name and email, each signed in with Google; the Firebase rules enforce that.

- Every week the test site has, each piece shown as he'll see it: the week
  itself, each reel (picture, text, verse, question, bonuses, clip), each Go
  deeper, the puzzle, each Who-said-it line, and the Verse Words.
- **Approve** a piece, or **Edit** it (a form, or the raw JSON). Changes
  collect until **Save and check**, which commits `content/weeks.js` to the
  test repo. The deploy runs `tools/verify.mjs`; developer mode shows either
  "Checked, and on the test site" or the checker's own findings.
- A piece's approval is a fingerprint of its content, so editing it after
  approval shows "Changed since approved" until it's approved again.
  Approving a reel with a clip marks the clip watched.
- **Plain words** are a piece per chapter: every KJV verse with its plain
  words and the BSB under it, the notes, and first the verses to look at
  (`review`).
  A chapter's plain words show in the app only once they're approved (the
  test site shows drafts, marked), so they never hold up publishing a week.
- **The short version** is a piece per chapter too: each line of the card
  with the KJV verses it sums up under it, and first anything to look at
  (`review`). Like plain words, a card shows only once it's approved.
- **Insights** are a piece per card: the card, the page it comes from (a
  link to check it says so), the words to find there, and its verses. Like
  plain words, a card shows only once it's approved.
- **Publish to the live app** appears once every piece of a week is approved.
  It copies any pictures the live app lacks, then the week, to the live repo.
  The live deploy runs the check with `--require-approval` (weeks from
  October 5, 2026 on); if it refuses, developer mode puts the live file back.
- The GitHub token Blake connects (Contents: Read and write on TreasureUp and
  TreasureUp-test) is kept in the test Firebase project, readable only by the
  people on the list. Only Blake can change the list or the token.

Developer mode commits straight to the repos, so **before editing content in
git, pull first**: `git fetch test origin` and merge `test/main` (and
`origin/main`) into your branch.

## Fields

Each week is one entry in the list in weeks.js. Add next week after
the last one any time before its Monday; the app opens on the week whose dates
include today, so it switches by itself. Weeks stay in date order.
Keep the file small: once a week is older than last week, move it to
content/past/ with  node tools/archive-weeks.mjs  (the checker notes when
one is due). The app loads weeks.js on every start and developer mode reads
it through the GitHub API, which stops at 1 MB; a moved week stays readable
in Past weeks, which loads its file (content/past/week-<num>.js) only when
he opens it, with its chapters built at deploy like content/reading.js.
Never just delete a week: Past weeks would lose it.

Weeks written further ahead wait in **content/upcoming/**, one file a week
named for its Monday (`2026-11-16.json`, the week's plain JSON), because
weeks.js has to stay under the 1 MB developer mode can read. Every deploy
runs  node tools/archive-weeks.mjs  (on both sites), and on the test site
node tools/upcoming-weeks.mjs, which brings the waiting weeks in, oldest
first, while weeks.js stays under 960 KB; the deploy saves the result back
to the repo, and runs every Monday too, so about three weeks ahead are always
in weeks.js for Blake to approve. tools/verify.mjs checks the waiting weeks
like the others, so a mistake shows when a week is written, not the day it
comes in.

Run  node tools/verify.mjs  after every edit. It checks every quote
word for word against the scripture text, checks every reference
exists, and fails the deploy if anything doesn't match.

Week:
  dates, title, reference   exactly as the lesson page prints them
  lesson                    link to the lesson page
  sections                  the lesson's section headings, in order

deep (Go deeper): one per section, plus Friday's pieces.
  id, section (index) or day: "friday" with a title
  read      what he reads: a passage ("Isaiah 14:12–17", the one the
            lesson points to), "lesson", or a Gospel Library page
  intro     a sentence or two on why it's worth reading
  q, right, wrong, why, source, find   as for a bonus: answerable only
            from the reading, and `find` must be inside `read`
  A Go deeper comes on the day its passage is read. The page plans
  the week from `reference`: its chapters a day or two at a time,
  Monday to Saturday, each day's reels after its reading; Friday's
  deep dive, Saturday's puzzle, Sunday's family game. A week whose
  `reference` names no chapters ("Christmas") has no reading path: its
  reels spread over Monday to Saturday in section order, each insight
  card comes with a reel from its chapter (or the cards spread over the
  week), and its cards and reels may use any chapter of the scriptures.

Each reel:
  id        unique and stable. Changing it resets that reel's answer.
  section   index into `sections`
  hook      the headline. Short. It is also the clue for Find it in
            the chapter (he taps the verse it describes), so say it
            in plain words, not the verse's own.
  seek      optional: a Find-it clue in plain words, for when the
            headline repeats the verse's words ("Tired? God makes you
            strong again" for "they that wait upon the LORD shall
            renew their strength"). The checker notes a headline that
            repeats two or more of its verse's words.
  body      plain words an 11-year-old reads easily. 75 words max.
            Scripture quoted here goes in “curly quotes” followed by
            its reference, e.g. “Thy dead men shall live” (Isaiah 26:19).
            A quote with no reference must come from this reel's verse.
            Every reference he reads becomes a link to it in Gospel
            Library: "Isaiah 28:16", "Isaiah 22", "1 Peter 2:6", and
            "(verse 22)" or "chapter 40", which mean this reel's own
            chapter (a Go-deeper reading's passage, a saying's verse).
            The checker fails a reference that isn't real, or a "verse 4"
            with no verse of its own to be read against.
  verse     { text, ref }: quoted from the scripture text exactly.
            Use … where words are left out.
  question  { q, right, wrong: [two wrong answers], why }
            Must be answerable from this reel. `why` shows after he
            answers and points to the words that settle it.
  bonus     optional { q, right, wrong, why, source, find }, or a list
            of them (they show one after another). Answerable ONLY from
            the reading. `source` is a verse ("Isaiah 22:15"), "lesson",
            or a Gospel Library page: the Friend, For the Strength of
            Youth, the Liahona or the manual (a churchofjesuschrist.org
            /study/… link). `find` is the exact words that settle it:
            they must be in the source and nowhere in the app. For a web
            page, write `why` in your own words, no “quotes”.
  hunt      optional, on a bonus or Go deeper whose question names a verse:
            the same question naming only the chapter, for the map game's
            chapter hunts ("In Isaiah 14, what do people ask…"). The answer
            (`find`) must be in that chapter just once; the checker says so.
            A question that names a verse and has no hunt stays out of the
            map game.
  media     optional. A picture on any reel it truly fits (a picture of
            Jesus Christ never goes on a reel about Satan); at most 2
            clips a week, only where they show something the words can't.
            image: { src: "media/….jpg", alt, credit, link }
                   link = its Media Library or Wikimedia Commons page
            video: { youtube, start, end, title, channel, previewed }
                   seconds; 3 minutes max; channel must be approved
                   in tools/verify.mjs; set previewed: true only after
                   a parent has watched the clip. Deploys refuse
                   clips that aren't previewed.
  gradient, blobA, blobB   colours

## The games' fields

- `puzzle.groups`: exactly 4 groups of 4 tiles, one group per lesson
  section. Each tile is `{ text, ref }`; the ref must be inside the week's
  reading. A tile must not hand over a reading question's answer (the
  checker flags a tile sharing two main words with one).
- `sayings`: at least 6 `{ id, text, ref, speaker, wrong: [two], why }`.
  `text` must be quoted exactly from `ref`, and be one speaker's words only.
  Keep the three choices alike in length and form, so the right one can't
  be picked out by its shape.
- `words`: Verse Word, seven, one a day, Sunday first. `{ word, clue, ref, mean }`:
  a 4–7 letter word in capitals, and the verse's own words with `____` where
  the word goes. The word must be in `scripture-words.js` so it can be typed
  as a guess, and not be in the week's title. `mean`: one plain line on what
  the verse means, shown when the game ends.
- Nothing in the puzzle, the sayings or the Verse Word clues may give away
  a reading question's answer: the checker looks there too.
- `approved` (and `wordsApproved` for the Verse Words): written by developer
  mode. Don't write these by hand.

## Plain words (`plain`)

Every week gets plain words for its whole reading (Blake, 2026-09-29: "and
onward"). A week's `plain` is a list of chapters from its reading, each
`{ ch, verses, notes, review }`. In a chapter he picks what he reads with
buttons: **KJV**, **Plain words**, **BSB**, **Notes**, and **Hebrew** (Old
Testament) or **Greek** (New), any mix. The KJV stays the scripture; the
plain words and notes help him understand it. The BSB comes from
`tools/bsb.txt.gz` at deploy, word for word, and needs no approval; leave
that file as the BSB published it. The Hebrew and Greek, every word with how
it sounds and what it means, come from STEPBible.org (Tyndale House
Cambridge, CC BY 4.0) through `tools/original.mjs`, pinned to one commit;
nothing in them is written by hand, so they need no approval either.

- `ch`: a chapter of the week's reading ("Isaiah 40"). `verses`: one plain
  line for every verse of that chapter, in order.
- Translate each verse from the Hebrew (the Masoretic text, the one the KJV
  translated), checked against a modern translation made from it by scholars
  (the Berean Standard Bible is public domain). Nothing added, nothing left
  out; a few words may say what a name or an ancient thing is. Plain English
  a 15-year-old reads easily, "you" for "thee". Keep the names as the KJV
  spells them, and the words he hears at church: Redeemer, Holy One of Israel,
  Lord of Hosts, covenant, Zion, salvation, Gentiles. "the LORD" is "the
  Lord"; He, His and Him are capitalized for God.
- `notes`: `{ v, text }`, one fact under a verse, only where the translations
  read the Hebrew differently in a way he'd notice next to the KJV, where the
  Book of Mormon or the Joseph Smith Translation has the verse differently,
  or where the New Testament or Nephi says who or what it is about. Scripture
  quoted in a note goes in “curly quotes” with its reference, and is checked
  like any quote; another translation's wording goes in ‘single quotes’.
  45 words max.
- `review`: `{ v, about }`, the verses Blake should look at first in
  developer mode, and why. Not shown in the app.
- Every chapter is read against the Hebrew by a second reviewer before it
  goes in. The checker counts what can be counted: a verse per verse, notes
  on real verses, quotes and references that check out; and it notes a plain
  verse much longer than the KJV's, a name left out, or KJV English left in.

## Plain words beyond the weeks (`content/plain.js`)

Chapters no week reads can have plain words and notes too (Blake,
2026-10-02: "the notes and plain translation for all of Isaiah"), for the
Scriptures tab. `content/plain.js` sets `window.TU_PLAIN = { title, plain }`,
where `plain` is a list of chapters exactly like a week's (`{ ch, verses,
notes, review, approved }`), written and reviewed by the same rules above.
A chapter here must be one no week (or past week) reads; a week's own plain
words win where both could. In developer mode it is one more entry after the
weeks ("Isaiah, the rest of the book"), with Approve, Approve all, Save and
Publish to the live app; the app shows a chapter once it's approved (the test
site shows drafts, marked). `tools/verify.mjs` checks it like a week's.

## The short version (`tldr`)

A card at the top of every chapter he reads (the day's reading and Past
weeks), above the KJV / Plain words / BSB / Notes buttons: "The short
version", two to four lines on what the chapter says, each ending with the
verses it covers. Tapping those verses takes him down to them. Every week
gets them for its whole reading, with its plain words (Blake, 2026-09-29:
"Yeah. Go ahead."). A week's `tldr` is a list of chapters from its reading,
each `{ ch, lines, review }`.

- `lines`: 2 to 4, in order, each ending with its verses: "(verse 10)" or
  "(verses 4–5)". 30 words max before the verses; aim for 15–22.
- Written from, in this order: the Church's chapter heading in Gospel
  Library (every part of it shows up in some line, and it says who a
  passage is about); the week's Come Follow Me lesson, whose "Ideas for
  Teaching Children" decide what leads; the lesson's Scripture Helps; and
  the verses themselves (KJV, plain words, BSB), which every line must be
  true to. Other scripture only where those use it (Mosiah 14 for Isaiah
  53). In our own words, not the Church's sentences.
- For an 11-year-old: short sentences, everyday words, and the words he
  hears at church (foreordained, Restoration, Second Coming…), with a few
  plain words where one may be new. He, His, Him for God and the Savior.
  Say what the chapter says: no lessons or applications, which the reels
  do. No quotes, unless the KJV's own words from the verses the line names.
- `also`: where the chapter heading names a Book of Mormon copy ("Compare
  2 Nephi 23"), one sentence under the lines saying who quotes it there:
  "Nephi quotes this chapter in the Book of Mormon (2 Nephi 23)." The lines
  themselves stay on the chapter.
- `review`: `{ v, about }`, what Blake should look at first in developer
  mode. Not shown in the app.
- Each week's cards are read against the verses, the heading and the lesson
  by a second reviewer before they go in. The checker counts the lines,
  their length and verses, their references, and checks any quote.

## Insight cards (`insights`)

A day's best insight cards (three at most: one of each kind first) show
under More from this day on its card and start its Go further; all of them
are in the Study tab (Blake, 2026-10-01: "where can I get faithful commentary for this
app? Follow him, scripture Central, gospel living? Byu? Make that into
additional insight cards"; "As many as are good"). A week's `insights` is a
list of cards, each `{ id, ref, title, text, source: { by, who, title, url }, find }`.

- `ref`: the verses it's about, or a whole chapter, in the week's reading
  ("Isaiah 40:28–31", "Isaiah 53"). The card comes on the day they're read.
- `text`: one point from the page, in our own words, for an 11-year-old,
  25 to 90 words (aim for 35–80). It says only what the page says. A quote
  is either the KJV's own words in `ref`, or the page's own: once at most,
  15 words or fewer, saying who said it.
- `source`: a page on one of the sites Blake chose (`INSIGHT_SITES` in
  tools/verify.mjs): the Church's Gospel Library pages (manuals, general
  conference, the magazines), Scripture Central, BYU's Religious Studies
  Center and Speeches, followHIM, the Joseph Smith Papers (below). `by` is the site's name, or for a Church
  page its publication ("Old Testament Student Manual", "General
  Conference"); `who` the speaker or author, if it has one.
- `find`: words copied exactly from the page, where the card's point is.
  With `--online` the checker loads the page and finds them there (and any
  quote from the page); a page that won't load is a note, not a failure.
- Nothing contested or speculative: no multiple-Isaiah or late-dating
  theories, nothing that undercuts the Book of Mormon's use of Isaiah. No
  bonus or Go-deeper answer words (the checker fails a bonus whose answer
  is anywhere in the app, cards included).
- Writers draft each week's cards from pages they've read; a second
  reviewer opens every page and checks each card against it before they go
  in; Blake approves each in developer mode.

An insight card can also carry a **deep dive** (Blake, 2026-10-03: "Longer
adult level deep dive would be great! … the quick learn, or the deep dive …
With the expand"), `deep: { paras, find, listen }`: the card stays the quick
learn, for him, and under it, folded (🤿 Deep dive ▾, in its sheet, in Go
further and in the Study tab, whose **Deep dives** filter lists the cards that
have one), the same point at length for a grown-up. No setting by age:
whoever wants more opens it.

- `paras`: 2 to 6 paragraphs, 80 to 450 words in all (130 at most each),
  in our own words from the card's page (followHIM's episode transcripts are
  the first ones). Quotes: the KJV's words in `ref`, or the page's own, 3 at
  most and 25 words or fewer each, saying who said it; the checker finds them
  on the page with `--online`. A transcript is the hosts' and guests' own
  words: paraphrase, quote a little, link the page, never paste it in.
- `find`: 1 to 6 passages of 4 to 30 words copied exactly from the page,
  where the deep dive's points are, checked with `--online`.
- `listen`, optional: the stretch of the episode it comes from,
  `{ youtube, start, end, title, channel, previewed }` like a video card's
  clip: 10 minutes at most, from an approved channel (asked of YouTube), and
  shown only once a parent has watched it (approving the card marks it
  watched).
- It's part of the card: Blake approves the two together in developer mode,
  which shows the deep dive under the card. It carries its own approval mark
  (`deep.approved`), and the card's fingerprint leaves the deep dive out, so a
  deep dive added to a card already approved waits for Blake while the card
  stays in the app (developer mode lists the card again, "its new deep
  dive"); off the test site an unapproved deep dive is left off the card.

**Joseph Smith Papers cards** (Blake, 2026-10-04: "can you add notes to the
scripture reading from Joseph Smith papers??? having a directly source to
that would be amazing"; both kinds, under the verse and as a card, the
coming weeks first) are insight cards whose `source` is a page on
josephsmithpapers.org (`by: 'Joseph Smith Papers'`), of two kinds: how
Joseph's Bible revision (the Joseph Smith Translation) changes the verse, from
its manuscript (Old Testament Revision 2, …), or where Joseph quoted or
explained it (a revelation's earliest manuscript, a discourse as reported, a
letter, his history). Its `find` and any quote of Joseph's words are copied
from the page's transcript, spelling and all. Such a card can carry a `note`:
the same point in a line (8 to 45 words; a quote is the KJV's words in `ref`,
or Joseph's own from the page, once, 15 words or fewer), shown in the reader's
**Notes** under the first of its verses as "📜 Joseph Smith Papers", with a
link to the page, once the card shows. Study has a **Joseph Smith** filter. A
note adds the original source; it doesn't repeat what the chapter's own notes
already say. Where Joseph's wording differs from the KJV the KJV stays the
scripture, and the note says plainly that the change is Joseph's.

Two more kinds go in the same list (Blake, 2026-10-02, from the Scripture
Central app):

- **A quote card**, `{ id, kind: 'quote', ref, quote, text, source: { by, who, title, url } }`:
  a prophet's or apostle's own words on the day's verses, 8 to 40 words,
  copied exactly (no quote marks around it; the app adds them). From a
  Gospel Library page (general conference, the magazines, a manual quoting
  them) or BYU Speeches (`by: "BYU Speeches"`); `who` is the speaker. With
  `--online` the checker finds the quote on the page word for word (…
  marks left-out words). `text`, optional, 40 words at most: which verse
  it's about and what to notice. One from a Gospel Library page shows
  without approval (Blake, 2026-10-02: "Quotes only"), its `text` hidden
  until Blake approves the card; one from BYU Speeches waits for approval
  like the rest.
- **A video card**, `{ id, kind: 'video', ref, title, text, video: { youtube, start, end, title, channel, previewed } }`:
  one a week, 10 minutes at most (`start`/`end` in seconds), from a channel
  on the approved list (asked of YouTube itself, like a reel's clip); `text`
  15 to 60 words, what it covers and one thing to watch for. It shows only
  once `previewed` is true: approving it in developer mode marks it watched.

## The map game's board (content/boards.js)

Babylon Falls plays on the first board in `window.TU_BOARDS`. It isn't tied
to a week: the questions come from the weeks in weeks.js.

- `art`: the painted map everything is drawn over (a JPEG under 1 MB in
  media/). An owned land is washed in its kingdom's color, with a line of
  that color just inside its border and a ring on its badge; neutral lands
  stay unpainted.
- `lands`: `{ id, name, ring, label }`: the outline as `[x, y]` points on a
  `size` map, traced along the painting's own borders, and where the name
  and soldiers sit (inside the land, clear of its landmark).
- `links`: the borders, each pair once. Every land must be reachable.
- `kingdoms`: `{ id, name, home, color }`, 2 to 5, each with its own home land.
- `walls`: Babylonia, the land the game is won with: take it and still hold
  it when your next turn starts. Its gates stay shut in round 1, and its
  walls (3 dice for its guards) stand until it first falls.
- `intro`: the line on the first screen; its references must be real.
- `hook`: the narrator's opening line when a game starts, read aloud with
  `goal`. Each “quote” in it must be the exact words of the verse cited
  after it, in brackets.
- `story`: the whole story, a tap away (⋯ → The story), quoted the same way.
- `chapters`: the story told a round at a time, `{ title, text }`, each
  text quoted the same way. The narrator opens each round with one
  ("Chapter 2 of 5: The Gates Open. …"), and the map screen shows it across
  the map.
- `chapterPlan`: which chapters a game of each length tells, one a round:
  `{ "5": [...], "8": [...], "12": [...] }`, numbered from 1. Each starts
  with chapters 1 and 2 (the kingdoms gather; round 2 opens the gates) and
  ends with the last (Babylon's fall); tools/verify.mjs checks this.
- `moments`: story lines the narrator adds at big moments, quoted the same
  way: `walls` at the first attack on the walls; the first time the walls
  land falls, `fallsMedesPersians` if Media or Persia took it, `falls`
  otherwise; and when a kingdom wins by holding it, `winPersia`, `winMedia`
  or `win` for the others.
- `cheers`: `{ win, hold }`: verses the narrator adds after the first sweep
  (`win`) or the first attack thrown back (`hold`) in a turn, taking turns
  through each list; quoted the same way.
- `seas`: `{ name, ring, label }`: each sea's outline and where its name
  sits, on the water.
- `goal`, `turn` and `dice`: how to win, each step of a turn, and how the
  dice work (⋯ → How to play).

The outlines were traced from the painting by the scripts in
tools/trace-board, in order:

1. `regions.py <picture> <work folder>` floods each land outward from its
   seed points (seeds.json) until it meets the painted borders. Where the
   painting has no border, a cut in cuts.json draws one: Assyria from
   Media, Syria from Babylonia along the Euphrates, Judah from Egypt, and
   the plain's south-east tip given to Elam so Persis doesn't border
   Babylonia (Persia moves first). Check `regions.png` in the work folder.
2. `polygons.py <picture> <work folder>` turns the regions into outlines.
3. `node simplify.js <work folder>` smooths them, each shared border once,
   so neighbours stay exactly matched.
4. `badges.py <work folder>` suggests badge spots; the chosen ones, and the
   sea names', are in labels.json.
5. `node board.js <work folder>` writes the lands, seas and `links` (worked
   out from the outlines, plus the Red Sea crossing) into boards.js.

They need Python 3 with numpy, scipy, scikit-image, shapely, rasterio and
Pillow, and node with topojson-server, topojson-simplify and
topojson-client. tools/verify.mjs checks all of this, including that the outlines agree with
the borders, since players attack what looks next to them: each label sits
inside its land's outline, two lands in `links` share a stretch of border
on the map (or face each other across a narrow sea, like Egypt and Arabia
across the Red Sea), and two lands that share a border are in `links`. A
new map drawn over a picture has to trace the picture's own borders, so
neighbouring outlines meet, with no gaps or overlaps.

## Sunday classes (`content/sunday.js`)

Blake, 2026-10-03: "We need to incorporate sunday lesson study as well....
Javan needs to study YM lessons, and Chantel and I the conference talks."
Since September 6, 2026 every class meets each Sunday (25 minutes): Sunday
School keeps Come, Follow Me (the rest of the app); Aaronic Priesthood
quorums and Young Women classes learn from *For the Strength of Youth: A
Guide for Making Choices*, a chapter a month, with lesson pages in that
month's magazine; elders quorums and Relief Societies from the most recent
general conference, the talks their presidencies choose. Everyone sees all
of it (Blake's choice): no setting for who's in which class.

`window.TU_SUNDAY = { youth: [...], conference: [...] }`.

**`youth`**, a month each: `{ month: "2026-10", chapter: 10, title, guide,
lessons }`, `guide` the chapter's Gospel Library page. Each lesson is the
mini-lesson for one Sunday, played like a day's lesson (a card, its
question, the next):

- `id`, `sunday` (`"2026-10-04"`, a Sunday of the month), `title` (60
  characters at most), `read` (the Gospel Library page it's from: the
  guide's section, or the magazine's lesson page), `intro` (10 to 60 words:
  what this Sunday's class is about and what to read).
- `cards`, 2 to 5, each `{ id, hook, body, find, q, right, wrong, why }`:
  `body` 15 to 75 words in our own words, for a youth; one quote from the
  page at most, 15 words or fewer; `find` 4 to 30 words copied exactly from
  `read`, where the card's point is (checked with `--online`, as the quote
  is); `q` a question its body answers, with `right` and 2 or 3 `wrong`;
  `why` 40 words at most.

**`conference`**, a conference each: `{ id: "2026-10", title, from, talks }`.
`talks` in the order they were given, which is the talk-a-day plan's order,
a talk a day from `from`. Each talk:

- `id`, `speaker`, `title`, `session`, `url` (its Gospel Library page,
  churchofjesuschrist.org/study/general-conference/2026/10/…).
- `quotes`: up to 4 of the speaker's own words, 8 to 40 words each, no quote
  marks around them, found on the talk's page word for word (`--online`).
  These and the talk itself show without approval, like a Gospel Library
  quote card: they're the speaker's.
- `scriptures`: the verses or chapters the talk uses (`"Moroni 10:32"`),
  each a tap from the reader.
- In our own words, shown once Blake approves the talk in developer mode
  (drafts on the test site): `quick` (25 to 90 words, what it teaches),
  `points` (up to 5, 4 to 40 words each), `discuss` (up to 3 questions to
  talk over, 30 words at most each) and `deep`, a deep dive as an insight
  card's (`paras`, `find`), its quotes found on the talk's page.

Which talk each Sunday's class does is picked in the app by anyone in the
family (Blake, 2026-10-03: "You pick it"), one for elders quorum and one for
Relief Society, kept with the family; until it's picked the app suggests the
next talk in the plan. tools/verify.mjs checks all of the above.
