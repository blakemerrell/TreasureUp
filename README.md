# Treasure Up

*"Treasure up in your minds continually the words of life"* (D&C 84:85). Formerly ScriptureTok.

The weekly **Come, Follow Me** lesson as a short Duolingo-style lesson each
day, built so the lesson is understood, not just scrolled past. One page
shows the week: today's lesson, the week's plan, how it's going, and every
reel to look back at.

Live at **https://blakemerrell.github.io/TreasureUp/**

**Loaded:** September 21–27, 2026 · *A Marvellous Work and a Wonder* ·
Isaiah 13–14; 22; 24–30; 35 · 10 reels, then from Monday September 28 ·
*Comfort Ye My People* · Isaiah 40–49 · 11 reels.

---

## How it works

Each reel is one idea from the lesson: a headline, a few plain sentences, the
verse itself, and **one question** answerable from what's on the screen.

| | |
|---|---|
| **Reading first** | Every chapter of the week's reading, a day or two's worth each day Monday to Saturday, in order (about 10–15 minutes a day), and each day's lesson opens with that day's chapters. He reads the chapter itself: in the app (the King James text, verse by verse, from the same pinned data the checker uses, built at deploy by `tools/build-reading.mjs`) or in Gospel Library if he'd rather. **I read it** opens once he's reached the end of the chapter in the app, or has gone to it in Gospel Library. Reading earns no XP (it can't be checked), but a day counts toward the streak only once he reads. Then **Find it in the chapter**: a reel's headline (or its `seek` clue), and the verses around the one it describes; he taps that verse. 10 XP on the first try, once a day; a miss shows the verse and comes back at the end. The reels come after, and explain what he just read. Without the chapter text (say the build step failed), each chapter opens in Gospel Library and there's no Find it. |
| **XP only for understanding** | Reading, tapping and opening the app earn nothing. A right answer on the first try earns 20 XP. |
| **One try** | A wrong answer shows the right one and the words in the verse that settle it. |
| **Daily warm-up** | On a new day, up to 3 earlier questions come back at the start of the day's lesson, missed ones first, with no verse to look at. Remembering one earns 15 XP. |
| **Reading bonus** | Once a reel is answered, its own screen (from Look back) has a bonus question whose answer is only in the chapter (or the lesson page), never in the app's own words (the reels, questions and games; the chapter he reads in the app is the reading itself). One try, 25 XP. The link opens the chapter at the top, not at the answer. |
| **The week's plan** | The app opens on its page, at the top: **Today** (today's reading, what's left from earlier days first, and how much is done) and the week map, which is the reading path: each day's chapters ("Read Isaiah 40", "Read Isaiah 41–42", Monday to Saturday, in order and split so no day is much longer than another, counting its reels and readings too), with the reels about those chapters on the same day; Friday's deep dive, Saturday's puzzle, Sunday for church and a family game. A reel whose verse is outside the reading comes with its section's other reels. It's a suggested pace, not a lock: everything stays open and reading ahead is fine. When today's part is done the card says **✓ Done for today** and what's tomorrow; a day whose reading is done but not the rest says "Isaiah 40: finish up". Sunday's row opens the games. |
| **Today's lesson** | **▶ Start today's lesson** on the Today card plays that part of the plan one screen at a time, Duolingo-style: what's left of the warm-up, then the day's chapters, Find it in the chapter, then for each of the day's reels read it (picture, text, verse), answer its question and fill in a missing word of the verse (never a word the verse repeats, and the wrong words start with the same kind of letter); then match each idea to its verse and Who said it? from that day's chapters, and Go deeper. Friday's lesson is the two deep-dive pieces; Saturday's opens the puzzle. Each row of the week map opens that part's lesson. Each answer is recorded once, the first time, and XP, the streak, the plan and the family's copy all see it. The practice steps (fill in the word, match, who said it) are built from the week's checked text and pay nothing. A picked answer is blue until Check; green only ever means right, and a quick double tap on Check or Continue counts once. A missed step comes back at the end until he gets it right; only the first try counts. Leaving partway keeps what he answered and reopening picks up there; a finished part replays as practice. The last screen shows XP, % right first time (of the questions, not the practice steps), time, the streak, and any new level or reward; a reward unlocked in a lesson he leaves early is announced when he leaves. A reel's clip plays on its Read screen and stops when he moves on. Or `…/#lesson`. |
| **Look back** | Below the plan, every reel and Go-deeper reading of the week by section, ✓ / ✕. One he has answered opens on its own screen as it was: picture, clip, verse and his answer, then its reading bonus and a note. One he hasn't opens its day's lesson. |
| **Your week** | Big numbers on the page: chapters read, reels done, right first time, bonus finds, went deeper, notes, the puzzle, and "A perfect week!" or "You finished the week!" at the end. |
| **Go deeper** | The last step of the day its passage is read (or, for one outside the reading, after its section's reels): a longer reading the lesson points to ("Read Isaiah 14:12–17") with one question only that reading answers. Friday adds two pieces: the children's part of the lesson and that month's Friend, For the Strength of Youth or Liahona. 25 XP each, first try, checked by `tools/verify.mjs` like the bonuses (the answer must be inside the passage it asks him to read). |
| **Scripture links** | Every scripture reference he can read is a link to it in Gospel Library, opening in a new tab: in the text, questions, answers' why lines, verse boxes, the week's reading, notes and the games. "(verse 22)" or "chapter 40" means the chapter of the verse the text belongs to, the same way the content checker reads it. Where a step tests memory (the warm-up, fill in the missing word, put the words in order, Verse Word's hints, Scripture Climb and the TV games before the answer shows), the link appears once he has answered. The app knows every book of the standard works; the checker fails if one is missing or if content names a reference that isn't real. |
| **Pictures and clips** | A picture on each reel it fits (Church Media Library art or public-domain photos, credited and linked), shown whole and undimmed at the top of the reel with the text below it, in the lesson and on the reel's own screen. At most 2 clips a week, only where they show something the words can't. Clips load nothing until tapped, then play just the chosen stretch in YouTube's privacy-mode player. |
| **Streak** | Days in a row that he read. On a day with no reading left to do (Sunday, or all caught up), one question answered counts instead. A **streak freeze** (earned by solving the weekly puzzle) covers one missed day and is used automatically; the count shows next to the streak. |
| **Notes** | On an answered reel's own screen (from Look back), he can write what it means to him in his own words: 10 XP once per reel (12+ words, not filler). "Put it in my scriptures" copies the note and opens that verse in Gospel Library to paste it as a note there. No outside app can read Gospel Library notes, so the XP comes from writing it here. Notes are kept across weeks as a journal on his phone; a parent can read them in the parent screen, and the note box tells him so. |
| **🎮 Games** | Next to the streak, in three groups: **Every day**, **Family night**, and **Book of Mormon**, which opens Title of Liberty (below). **Weekly puzzle**: a Connections-style sort of 16 ideas into the lesson's 4 sections (their headings show as the targets), unlocked once every reel is answered; 4 mistakes a day, repeat guesses are free; solving pays 40 XP and a streak freeze. A lost try shows the section headings but not where the tiles go, since the same puzzle comes back the next day. **Who said it?**: match lines quoted exactly from scripture to their speaker, 5 XP each on the first answer (here or in the warm-up, where one line comes back each day); choices shuffle each round, a reload picks up at the same line, and the end shows this round's score and the first-try count. **Verse Word**: real Wordle rules (six tries, green/yellow/gray letters with a one-line key, and every guess must be a word from the Bible or Book of Mormon, per `scripture-words.js`, rebuilt by `node tools/build-words.mjs`), with hints that unlock: after 2 guesses the chapter, after 4 the verse with a blank; when it's done, one line on what the verse means. 15 XP solved in 1–2, 10 in 3–4, 5 in 5–6. **Scripture Climb**: a Millionaire-style ladder of ten questions (reel questions, then reading bonuses he has already answered, since the climb shows each answer) from 100 to 32,000 points (a miss ends the climb and keeps the highest rung reached), with 50:50, Read it, and Ask a parent lifelines; every answer links its source. It opens once the week's reels are answered. The first climb each day pays 2 XP per right answer as he gives it, and is taken from its first answer on, so leaving and starting over is practice. **Live game**, **Scripture Showdown** and **Babylon Falls**: below. |
| **Babylon Falls** | A Risk-style map game for 2 to 4 players, about the fall of Babylon (Isaiah 45:1; Daniel 5). The map, a painting of the ancient Near East with each land traced along its painted borders (an owned land is washed in its kingdom's color, with a line of that color inside its border and a ring on its badge, so you can see who holds how much; neutral lands stay unpainted), goes on a computer or TV (`…/#babylon`, or the shorter `…/tv` for a TV's own browser, with no menu to scroll); everyone plays on their own phone or tablet with the join code (`…/#babylon-join-1234`, which the QR code beside the code on the TV opens; the lobby's Start sits above its settings, so a TV never has to scroll), picks a kingdom (Persia, Media, Lydia or Egypt), and picks how to play: **📖 Story** or **⚡ Pro** (below; ⋯ switches any time, and everyone plays the same game). Babylonia is neutral, the prize everyone is after: **take it and still hold it when your next turn starts, and you win**. Its gates stay shut in round 1 (round 2 opens them, Isaiah 45:1), and its walls give its guards 3 dice until it first falls; after that it defends like any land, so the others get one turn each to storm it back. Every card then says who holds it and what that means ("👑 Sam holds Babylon. Take it back before Sam's next turn, or Persia wins!"; "You hold Babylon…" on the holder's phone), and 👑 marks the holder. No TV? **Play on this one screen** (`…/#babylon-here`): type a name next to each kingdom that's playing, choose Story or Pro for the screen, and pass the phone, tablet or computer around; a "Pass to Dad" card comes between turns, and the game is kept on the device to continue later. Every screen is the same three things: who's playing (points, whose turn), the map, and one narrator card that says what just happened and what you can do next. The rest is under ⋯: the whole story, how to play, what's happened so far, Story or Pro, and on the big screen the narrator's voice, Skip this turn and End the game now. Each kingdom starts at home with 4 soldiers; the other lands are neutral, held by their guards. A game opens with one line of the story (Isaiah 45:1) and how to win, and each round opens a **chapter** of the story, read out by the narrator ("Chapter 2 of 5: The Gates Open. The Lord promised King Cyrus he would open “the two leaved gates” (Isaiah 45:1). Now anyone can attack Babylon!") and shown across the map on the big screen or the one screen, with the game's chapters ticked off (the whole screen when the map is too small for it, as on a phone; ⋯ and Exit stay reachable): there are 12, a Short game tells 5 of them, a Standard 8 and a Long all 12, always from the kingdoms gathering and the gates opening to Babylon's fall. Each turn: answer a question for soldiers (easy, a reel's own question, 3: about half from this week and half a review from earlier weeks; hard, a **hunt** through a chapter, 5, where the question names only the chapter and its link opens the chapter at the top; a miss 1; plus 1 for every 3 lands), put them on your lands, attack, move once, and end the turn. **📖 Story** is for a young reader: one step at a time (Question, Soldiers, Attack, Done), in plain words, with 🔊 Read to me on every step (the browser reads the narrator and the card aloud, lighting each word) and no timer. One tap on a land puts all the new soldiers there (⭐ a good spot is named and ringed on the map; ↩️ Undo until the first attack). Each land he could attack gets a card, from his strongest land next to it, with its chance (Good chance, Maybe or Hard) and the numbers ("Elam has 2 guards. You have 7 soldiers in Persis."); after attacking, one move is offered if it would help ("Keep Elam safe? Move 1 soldier from Persis to Elam."). **⚡ Pro** is tap, tap, done: a tap on a land puts 1 soldier there (twice quickly: all of them; All on it; ↩️); tap one of your lands and one next to it, or drag between them, and the map shows the odds of each attack from there ("Persis 7 → Elam 2", 93%); 🎲 Roll throws every die at once, and ⚡ Blitz keeps attacking until the land falls or yours is down to 3 (Stop any time); two of yours make the turn's move, with − and + for how many. Pro has a timer (30 seconds, hunts 90; running out counts as a miss), which the setup can turn to Relaxed; Story never has one. **End turn** is one tap, with 3 seconds to undo. The guards roll first (2 dice, or 1 when only 1 is defending; 3 behind Babylon's walls while they stand). On a TV game, a player whose land is attacked rolls its guards: the TV calls out "Mom, roll to defend Media!", her phone shows her dice in a tray (🛡️ Roll 2 dice) to flick up with her thumb (or tap), and after 10 seconds (on the TV's clock) the dice roll by themselves; a neutral land, or a game on one screen, rolls right away. Every screen then shows the battle as duels: the guards' dice across the top, best first (Duel 1, Duel 2, and Duel 3 behind the walls), and the attacker's dice, one for each soldier that can attack, up to 3, each stepping into the duel where it ranks, highest against highest; a die pushed out by a bigger one sits on the bench, and a tie goes to the guards. Every roll is a tray of dice on the phone, flicked up (or tapped): Story rolls one die a flick, and the TV and Story phones tell each die in plain words ("Elam's guards rolled 5 and 2. Your biggest die will fight their 5, and your next biggest will fight their 2. Your smallest die sits on the bench."; "Your 6 is bigger than their 5. You win this duel!"; "Last roll! Get a 3 or more to win duel 2."), with each duel marked ("✓ You win", "✗ Guards win") and the score so far ("Elam lost 1 guard. You lost 1 soldier."); Pro phones get shorter lines ("A 4! It beats your 1, so it takes over duel 2 against their 2, and wins."; "✓ Elam −1"). A Story fight stops as soon as the dice still to come can't change who wins, once every duel has a die (his first two dice already win both duels, or nothing left can beat the guards' 6s): those dice are never rolled, the result says why ("You won every duel, so the last die wasn’t needed."; "The last die couldn’t change who wins, so it wasn’t rolled."), and a land taken still gets as many soldiers as the dice the attack was made with. The next-roll line looks past one die when two are left ("Get two dice of 4 or more to win duel 2."). 🤔 What do I need? explains the roll: each duel, ties, why each side rolls that many dice, and that more soldiers don't roll more dice but let you attack again. The first sweep, or the first attack thrown back, in a turn ends with a verse from Isaiah 40–49, this story's own chapters ("they shall mount up with wings as eagles", Isaiah 40:31; "Fear thou not; for I am with thee", Isaiah 41:10). The battle settles in the same panel, with the last die's sentence and what it cost ("🎉 Elam is yours!" on the attacker's Story phone, "Elam falls!" elsewhere); a Pro card then keeps the last roll in one line. While a battle is fought, an arrow in the attacker's colour runs from its land to the one it attacks, on every map, and the narrator moves on to it ("Persia attacks Elam from Persis."; "Mom rolled 6 and 6 to defend Media. Now Sam rolls."); when a kingdom and a land share a name, it names the player instead ("Mom's soldiers attack Media!"). On the TV, and on the one screen, each battle is played out on the painting itself: the map zooms into the two lands and dims the rest, each side's fighters stand ready (up to 10; the badges keep the real count), each die tumbles in and becomes a glowing shot with its number in a fighter's hands, and a dashed line pairs biggest with biggest (so you can see a new die take over a duel, and the smallest sit on the bench). Once the last die is in, each pair of shots flies across the border: "6 > 5", the smaller shatters, and the bigger knocks down whoever threw the other (a tie goes to the guards); a land taken sees its winners march in and its border turn their colour. Phones say "⚔️ Watch the TV!" (with what's flying: "Biggest against biggest: 6 against 5 and 4 against 2") until it's over, then show the result, and the TV's voice and its "falls" banner wait for that moment too. Blitz stays zoomed in and goes quicker; the one screen has Skip ⏭; with the device's reduced motion setting on, there's no scene and no wait. The story also comes in at the first attack on the walls (Isaiah 45:2), Babylonia's first fall (Daniel 5:28 when the Medes or Persians take it, Isaiah 21:9 otherwise), and a win by holding it (Ezra 1:2 for Persia, Daniel 5:31 for Media, Daniel 2:21 otherwise). The TV shows the big moments in a banner across its map: a player called to defend, a land falling, Babylon's gates opening. While someone else places, attacks or moves, each other phone gets one chance a turn to **fortify**: **Quick**, a reel question (half this week, half review), for 1 soldier, or **Deep**, a hunt in the reading, for 2. A right answer puts the soldiers on that player's lands right away (they pick the land, then 🛡️ Put 1 on it), so a land under attack can be strengthened mid-attack; the answer counts until their own turn starts, and soldiers not put down join that turn. No new chances while a turn's own question is being answered, so everyone reads that one along. The map screen shows a banner ("🛡️ Mom fortifies Media: 5") and the land's badge pulses, and an attacker is told when a land he could attack was just fortified ("🛡️ Mom just fortified Media: 5 guards there now."). With 💡 insight on (a setup option, on by default), a hunt answered right also earns an insight (up to 3). Spent on a turn, it shows the real odds of each attack and the best moves until that turn ends. A phone chimes and flashes in its kingdom's colour when its turn starts (⋯ turns the chime off; phones that can also buzz, not iPhones), and keeps its screen awake during a game. The TV's card text grows with the screen (about 1.5 times a phone's on a 1080p TV). The narrator's voice (the browser's own) starts off; ⋯ on the big screen turns it on to read the narrator's lines and each chapter aloud, and that device remembers. If nobody holds Babylon from one turn to the next, after 5 (the default), 8 or 12 rounds the most land wins, Babylonia counting 3 (when the last round ends before a holder's next turn, points decide). The winner shows across the map on the TV or the one screen: how they won, everyone's points, and whether Babylon fell (just "🏆 Persia wins!" over a phone's small map, with the rest in the card below it); a tie on points goes to more soldiers, and the end says so. The question shows on the map screen too so the family reads along, then the answer and why. The computer runs the game: phones send moves that it checks, so nobody can cheat from a phone (`firestore.rules`, `/risk`). A reload picks the game back up; Exit mid-game needs a second tap. It never changes XP. The board is `content/boards.js`, checked by `tools/verify.mjs`. The join QR code is drawn by `vendor/qrcode.js` (Kazuhiko Arase's QR Code Generator, MIT license), loaded only when a lobby opens. |
| **Live game** | Kahoot-style. A TV or laptop hosts (`…/#host`): it shows a 4-digit code, then each question, and keeps score. Phones and tablets join with the code (`…/#join`, or `…/#join-1234`) and answer on their own screens in real time; the same answers appear in the same colors everywhere. 700 points for a right answer plus up to 300 for speed, 20 seconds a question; after each, the TV shows the answer and why with everyone's score, and each phone shows the answer and why too. A family total at the end, and ties share a place. **Play again** starts clean. A player who misses two questions in a row (say they left) stops holding up the timer; a reloaded TV tab picks its game back up, and Exit on the TV asks twice mid-game. No accounts needed to play; it never changes XP. Runs through Firebase across devices (`FIREBASE_CONFIG` in `index.html`, rules in `firestore.rules`); until that's set, it runs between tabs of one browser, which is also how the tests play it. |
| **👪 Family** | Optional, next to 🎮. 👪 opens the family screen on **People** (add someone, sign out) with **Chat** the other tab; a dot on 👪 means a new message. A parent signs in (Google, or a sign-in link by email) and starts a family. Grown-ups (grandparents, friends, roommates, the other parent) are added by email and sign in with that address; a child is added by first name and joins by opening a one-time link on their own phone or tablet, with no account. Links work once, for 7 days. **People** shows each person's level, XP, streak and this week's right answers, and a family total. Each person's progress is saved to the family, so a new device ("Link another device") or a parent's second phone picks up where the other left off. Progress on a device belongs to one person: if a device already has progress when someone joins or signs in there, it asks whose it is, and someone else's is set aside on the device (it comes back when they sign out) instead of being mixed in. Two devices for the same person stay in step: an idle one catches up by itself, and if both changed while apart (say one was offline) they're merged, keeping every answer and note from both. People shows when this device last saved to the family. Parents see every device joined as a child and can remove one; a child whose devices are all removed is listed under "Taken out", with **Add back** (the saved progress comes too) or **Delete saved progress**. Whoever started the family always stays a parent. Email sign-in links are limited to 5 a day on Firebase's free plan; Google sign-in has no limit. **Chat** is one family chat, text and emoji only: no private messages, links or photos, nobody can delete a message, and a parent can hide one (everyone sees it was hidden; parents can still read it and unhide it). A dot on 👪 means a new message. `firestore.rules` enforces all of it. |
| **Year trail** | The page shows the 52 weeks of Come, Follow Me 2026 with this week marked, and how many chapters he has read this year; each finished week turns green. |
| **Scripture Showdown** | A quiz-show board game for the whole family, built from the week's checked questions. Columns are the lesson's sections; reel questions are the low values, reading-only bonus questions the high ones, one of them a Daily Double. A parent hosts on a laptop hooked to the TV and taps everyone who got each one; scores add up to a family total and a family best for that week. **Play again** shuffles the tiles and the Daily Double; **Change players** asks before clearing a game in progress. Open it from 🎮 (or Sunday's row on the week map), or bookmark `…/TreasureUp/#family`. It never changes his XP. |
| **Family rewards** | A parent sets rewards at XP marks behind a 4-digit PIN ("Pick Friday's movie at 300 XP"). He sees his progress on the page and gets "Reward unlocked, show a parent" when he crosses one (on a lesson's last screen, if it happened there); only the parent can mark it given. The PIN keeps an 11-year-old from editing his own rewards; it isn't security. |
| **Sections match church** | Reels are grouped under the lesson's own section headings (on each reel, and in Look back), so what he reads lines up with class on Sunday, even though the days follow the chapters. |

Progress lives in `localStorage` on that one device: no account, no
analytics, no network calls except the font. It still works with storage
blocked (private browsing); it just won't remember. A device that joins a
family also saves a copy to the family's Firebase project.

---

## Where the content comes from

- **Scripture text:** quoted exactly from the standard works (KJV Bible, Book
  of Mormon, D&C, Pearl of Great Price). The check script compares every quote
  against the public-domain
  [bcbooks/scriptures-json](https://github.com/bcbooks/scriptures-json) data,
  pinned to one commit.
- **The lesson:** the official Come, Follow Me page on
  churchofjesuschrist.org supplies the title, dates, reading block and section
  headings. Reels are written in our own words and link back to it. Don't paste
  the manual's paragraphs in: the site is public, and the Church's terms of use
  cover personal and family use.
- **The magazines:** each month's Friend (its "Come, Follow Me Weekly
  Scripture Fun" has a family idea for every week), For the Strength of Youth
  and the Liahona often tie to the week's chapters. Bonus questions can come
  from them; the check script fetches the page and confirms the answer is on it.
- **Videos:** clips only from the approved channels in `tools/verify.mjs`:
  the Church's own channel, Scripture Central, followHIM Podcast, Don't Miss
  This, and Talking Scripture.
- **History:** a historical claim goes in only when it can be tied to a
  scripture source (for example, Charles Anthon via Joseph Smith—History 1:64–65).

---

## Changing the weekly lesson

All content is **`content/weeks.js`** (see `content/README.md` for every
field). Blake reviews, approves, changes and publishes it from **developer
mode** on the test site (`…/TreasureUp-test/#dev`); new weeks arrive there as
drafts. **Add next week any time before its Monday**: the app opens on the
week whose dates include today, so it switches by itself (and last week turns
green on the year trail). Keep weeks in date order and drop ones older than
last week. One reel, the short version (as JSON in the file):

```js
{
  id: "isa25-refuge",                 // unique and stable
  section: 1,                          // index into the week's `sections`
  hook: "He doesn't promise no storms. He promises shelter.",
  body: "Isaiah calls the Lord “a refuge from the storm, a shadow from the heat.” …",
  verse: { text: "For thou hast been a strength to the poor, …", ref: "Isaiah 25:4" },
  question: {
    q: "What does Isaiah 25:4 promise?",
    right: "A safe place during hard times",
    wrong: ["That hard times will never come", "That storms are a punishment"],
    why: "He is “a refuge from the storm”: a shelter while the storm is still going."
  },
  gradient: "linear-gradient(150deg,#082f49 0%,#0369a1 50%,#38bdf8 100%)",
  blobA: "rgba(125,211,252,.45)", blobB: "rgba(0,0,0,.4)"
}
```

Rules the check script enforces:

- The verse box is the scripture text exactly. Use `…` where words are left out.
- Any scripture quoted in a hook, body, question or answer goes in
  “curly quotes” followed by its reference, like
  `“Thy dead men shall live” (Isaiah 26:19)` or `(verse 6)` for the same
  chapter. A quote with no reference must come from the reel's own verse box.
- Every reference named anywhere must exist.
- The week's `reference` must read as a list of chapters ("Isaiah 13–14; 22; 24–30; 35"): the
  reading path is made from it. A reel whose verse is outside it is a note (it comes with its
  section's other reels, not on the day of its chapter).
- A reel's headline is the clue for Find it in the chapter. When it repeats two or more words of
  its verse ("Peace like a river"), the checker notes it, since he could then match words instead
  of reading; an optional `seek` gives a clue in plain words instead ("Tired? God makes you
  strong again" for Isaiah 40:31).
- Every lesson section needs at least one reel, and at least 3 questions
  (reel questions plus bonuses) so it fills a column on the family board.
- Bodies stay under 75 words and hooks under 60 characters.
- A right answer much longer than both wrong ones is a note: he could pick it without reading.
  Make the wrong answers the same length and shape, using words from the same screen, and
  wrong for a reason (a misreading of the verse, not a silly one).
- A bonus's `find` words must be in its source verse, or on the Gospel
  Library page it cites (lesson, Friend, For the Strength of Youth, Liahona),
  and must not appear anywhere else in the app (the reels, questions and games; the
  chapter he reads is the reading). A reel can have several bonuses;
  each shows after the one before is answered.
- Pictures live in `media/`, under 150 KB, with alt text, a credit, and a
  link to their Media Library or Wikimedia Commons page.
- Clips: under 3 minutes, from a channel on the approved list in
  `tools/verify.mjs` (checked against YouTube's record of who owns the
  video). A clip stays **hidden in the app until a parent watches it** and
  sets `previewed: true`; the private preview shows it, marked "not approved
  yet", so it can be reviewed.

Three more fields feed the games:

- `puzzle.groups`: exactly 4 groups of 4 tiles, one group per lesson
  section. Each tile is `{ text, ref }`; the ref must be inside the week's
  reading.
- `sayings`: at least 6 `{ id, text, ref, speaker, wrong: [two], why }`.
  `text` must be quoted exactly from `ref`.
- `words`: Verse Word, one a day. `{ word, clue, ref }`: a 4–7 letter word in
  capitals, and the verse's own words with `____` where the word goes (shown
  as the last hint). The check puts the word in the blank and matches it
  against the verse, and makes sure the word is in `scripture-words.js` so it
  can be typed as a guess.

Then run:

```bash
node tools/verify.mjs --online   # quotes, references, and every Gospel Library page the week cites
```

and push to `main`. The deploy runs the same check and **refuses to publish**
if anything fails. Then it builds `content/reading.js`, the text of every chapter in each
week's reading (`tools/build-reading.mjs`, from the data the check just downloaded), so a
week added from developer mode gets its chapters with no extra step. The file isn't kept in
git; to try the reader locally, run `node tools/verify.mjs` once, then
`node tools/build-reading.mjs`. The live app's deploy also refuses any week (from October
5, 2026 on) that isn't fully approved in developer mode. (If the Church website itself is down, that's a warning,
not a failure, so an outage can't block a deploy.)

Answer order is shuffled in the app, so always put the right answer in
`right`. Changing a reel's `id` resets that reel's answer.

**Rebuilding the CSS** is only needed if you add new Tailwind classes to the
markup: `sh tools/build-css.sh`.

---

## Title of Liberty (a separate game)

A real-time strategy game in the style of Command & Conquer: Red Alert, from
the Book of Mormon: one player against the computer. Two campaigns so far,
in the Book of Mormon's order: **Captain Moroni** (Alma 43–44) and
**Lachoneus and Gidgiddoni** (3 Nephi 3–4). It lives at
**https://blakemerrell.github.io/TreasureUp/liberty/** (🎮 → Book of Mormon in
the app), apart from the app itself: it never changes XP, the streak or the
family's data.

**Reading opens each mission.** A mission stays locked until its chapters are
read: in the game's own reader (the whole chapter, King James text; *I read
it* opens at the end of the chapter) or in Gospel Library (the same rule as
the app's reading). The second 3 Nephi mission also needs the first won.

| Mission | What happens, and where it comes from |
|---|---|
| **Moroni 1 · At the River Sidon** (Alma 43–44) | Moroni meets Zerahemnah in the borders of Jershon; the Nephites can't march into Antionum (43:18). Make breastplates and shields and train soldiers, and the Lamanites, "exceedingly afraid" of the armor, leave into the wilderness (43:19–22). Send spies after them and messengers to Alma, and the Lord shows where they will come: their route and two hiding places appear on the map (43:23–24, 30). Leave part of the army in Jershon (if you don't, a band comes against it, 43:25), gather the people of Manti's quarter (43:26), and hide one army south of the hill Riplah with Lehi and the rest in the west valley with Moroni; a hidden army holds still until you give the order (43:27–33). As they cross the river Sidon, Lehi falls on their rear, they flee over the river, and Moroni meets them (43:35–41). They "fight like dragons" and your soldiers start to fall back until you remind them of their liberty (43:43–50). Encircle them on both banks and Moroni stops the killing (43:52–54); then Alma 44 plays out: the offer, Zerahemnah's refusal, his broken sword, many making a covenant of peace, the last of the fighting, and Zerahemnah's own covenant. Zerahemnah can't be killed before his part is done. Stars: peace, Jershon kept, and at least a quarter of the Lamanites spared. |
| **1 · Gather to One Place** (3 Nephi 3) | Lachoneus's proclamation: send someone to each of five villages and their people march to Zarahemla with flocks and grain (3:13, 22); a village left too long is taken by raiders. Build walls round about, watchtowers and guards (3:14) before the robbers come down (a 14-minute clock: Giddianhi said he would come "on the morrow month", 3:8). Nobody can go north of the border into the wilderness: "we will wait till they shall come against us" (3:21). Optional: weapons, armor and shields (3:26). |
| **2 · The Robbers Come Down** (3 Nephi 4) | Giddianhi's army attacks (4:7); **Cry unto the Lord** puts everyone on their knees for a moment, then they take less harm for a while (4:8–10). They fall back and can be pursued; Giddianhi is slowed, "weary because of his much fighting" (4:14). Then Zemnarihah's siege round about (4:16): a bar shows the robbers' food running out, since the Nephites have seven years' provisions and the wild game is gone (4:2–4, 18–20). When it runs out it's night, the border opens, and the armies can go to the three passes before the robbers march at dawn (4:24–26); a robber caught by two soldiers gives himself up (4:27). |

**The council**: a button that asks a question from the mission's chapters (13
for Alma 43, 11 for Alma 44, 10 for 3 Nephi 3, 11 for 3 Nephi 4, in `liberty/data.js`). A right answer brings
40 grain and 60 timber; a wrong one shows the verse that answers it. Once a
minute (30 seconds after a miss). Every gold verse reference in the game
opens the verse itself.

**Controls**: tap or click to choose, drag a box (on a touch screen, **Box
select** first), then tap the ground, a robber, trees or a field, or an
unfinished building. Right-click also gives orders. Workers build (walls are
dragged as a line) and mend walls; Zarahemla trains workers and the barracks
guards. Drag or arrow keys to look around, pinch or scroll to zoom, the small
map to jump. Space pauses, H stops, Esc cancels. At a chapter's big moment
(crying unto the Lord, Lehi's attack, remembering their liberty) a gold
button appears at the top. The maps are pictures of each story: where these
places were isn't known, and the game says so.

Progress (chapters read, stars) is kept on the device (`localStorage`,
`liberty.v1`). The code is plain JavaScript with no build step:
`liberty/data.js` (map, units, questions), `liberty/sim.js` (the rules),
`liberty/missions.js` (the story), `liberty/ui.js` (drawing and controls) and
`liberty/scripture.js`, the chapters' text, made by `node
tools/build-liberty-text.mjs` from the same pinned data the checker uses.
`node tools/test-liberty.mjs` plays both missions with a scripted player and
checks every quotation in the game against the verse it cites; the deploy
runs it and won't publish if it fails.

---

## Hosting

Every push to `main` redeploys through `.github/workflows/pages.yml` (about
a minute). Setting it up on a new repo:

1. The repo must be **public** (Pages on a private repo needs a paid plan, and
   the site itself is public either way).
2. **Settings → Pages → Source: GitHub Actions.** The workflow can't switch
   this on by itself.
3. Push to `main`, or re-run the workflow from the Actions tab.

**On his phone:** open the link in Safari → Share → **Add to Home Screen**. On
iOS it launches full-screen like an app. On Android, Chrome's **Add to Home
screen** installs it full-screen too (`manifest.webmanifest` and `icons/`).

**Family setup** (once per Firebase project; both are done for the test
project, `scripturetok-test`):

1. **Authentication → Sign-in method:** turn on **Google**, **Email/Password**
   with **Email link (passwordless sign-in)**, and **Anonymous** (for live-game
   players and children's devices) with **Auto clean-up OFF**, since it
   deletes anonymous accounts 30 days after they're made, which would drop a
   child's device from the family.
2. **Authentication → Settings → Authorized domains:** add
   `blakemerrell.github.io`.
3. **Firestore → Rules:** paste all of `firestore.rules` and publish.
