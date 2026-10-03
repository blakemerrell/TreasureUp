# Treasure Up

*"Treasure up in your minds continually the words of life"* (D&C 84:85). Formerly ScriptureTok.

The weekly **Come, Follow Me** lesson as a short Duolingo-style lesson each
day, built so the lesson is understood, not just scrolled past. The page
opens on today: the year, a strip of days to scroll back or ahead through,
and the picked day's card with its chapters, its lesson and its reels.

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
| **Reading first** | Every chapter of the week's reading, a day or two's worth each day Monday to Saturday, in order (about 10–15 minutes a day), and each day's lesson opens with that day's chapters. He reads the chapter itself: in the app (the King James text, verse by verse, from the same pinned data the checker uses, built at deploy by `tools/build-reading.mjs`) or in Gospel Library if he'd rather. **I read it** opens once he's reached the end of the chapter in the app, or has gone to it in Gospel Library (and stays open when he comes back, even if the phone closed the app). A chapter pays **50 XP**, the most anything pays (Blake, 2026-09-30), and a day counts toward the streak only once he reads. A clock starts the first time he opens a chapter and keeps running while he reads it in Gospel Library; tapping **I read it** sooner than half the "about N min" (twice the 120 words a minute that estimate uses; 20 seconds for a few verses, 2 minutes for a chapter without its text) asks "That was quick. Did you read all of Isaiah 40?": **Yes, I read every verse** counts it and pays the same (he may have read it with the family), **Not yet** goes back to the chapter. The parent screen shows each chapter's time and every yes. Each day's card has a chip for each of its chapters (✓ once read): a tap opens it in the reader with its buttons, to read again or ahead (Blake, 2026-10-01: getting back to the plain words "wasn't intuitive"); one not read yet starts its reading clock there and offers **Mark it read in its lesson**, which opens that day's lesson on it. Then **Find it in the chapter**: a reel's headline (or its `seek` clue), and the verses around the one it describes; he taps that verse. 10 XP on the first try, once a day; a miss shows the verse and comes back at the end. The reels come after, and explain what he just read. Without the chapter text (say the build step failed), each chapter opens in Gospel Library and there's no Find it. |
| **The short version** | A card at the top of every chapter he reads: two to four lines on what the chapter says, for an 11-year-old, each ending with the verses it covers; tapping them scrolls down to those verses, which light up. Written from the Church's chapter heading in Gospel Library, the week's Come Follow Me lesson and its Scripture Helps, and the verses (`week.tldr`); a chapter's card shows once Blake approves it in developer mode (the test site shows drafts, marked). The rules are in `content/README.md`; `tools/verify.mjs` checks every card. |
| **KJV, plain words, BSB, Spanish or Tagalog, notes, Hebrew or Greek** | Buttons at the top of every chapter he reads in the app (the day's reading and Past weeks): **KJV**, **Plain words**, **BSB**, **ES·TL**, **Notes**, and **Hebrew** on an Old Testament chapter or **Greek** on a New Testament one, each on or off, in any mix, remembered on the device; one of the three texts is always on, and the first one on shows full size with the verse number, the others under it with their colour. **Plain words** are each verse's meaning in plain English, translated from the Hebrew, checked against the Berean Standard Bible and by a second reviewer; a chapter's plain words and **Notes** show only once Blake approves them in developer mode (the test site shows drafts, marked). A note says where the translations read the Hebrew differently, where the Book of Mormon or the Joseph Smith Translation has the verse differently, or where the New Testament or Nephi says who it is about; every reference in it is a link. **BSB** is the Berean Standard Bible word for word (public domain), from `tools/bsb.txt.gz`, the BSB's own text file kept in the repo; the deploy builds each week's chapters from it (`content/bsb.js`, `content/past/bsb-<num>.js`), loaded the first time it's turned on. **ES·TL** (Blake, 2026-10-03: "Using the Spanish and Tagalog bible sounds great where we can!") is a Bible chapter in Spanish, the Reina-Valera 1909 (the Spanish Bible the Church's own Spanish edition is based on), or in Tagalog, the 1905 Ang Biblia, both public domain: a tap turns on the Spanish (**ES**), the next the Tagalog (**TL**), the next neither, and each verse sits under the KJV verse it translates. `tools/import-bibles.mjs` made `tools/rv1909.txt.gz` and `tools/tagalog1905.txt.gz` once from seven1m/open-bibles, pinned to one commit, and they're kept in the repo like the BSB's; the deploy builds each week's chapters from them (`content/es.js`, `content/tl.js`, `content/past/es-<num>.js`, `tl-<num>.js`, and the Scriptures tab's chapters). The Tagalog numbers its verses as the KJV does. The Spanish numbers a few chapters differently (Jonah 1:17 is its Jonás 2:1), so the import matched each Spanish verse to its KJV verse by its words (the file tags each Spanish phrase with its Strong's number, and STEPBible's Hebrew and Greek has every KJV verse's), split the 14 places where the file ran two verses together, and left out the 9 it couldn't be sure of (Job 39:27–30 and 40:2–6), where the reader shows the KJV. The Book of Mormon and the other volumes have no ES·TL: their public-domain Spanish and Tagalog don't exist (or aren't verse for verse). The buttons are one row that always fits (KJV · Plain · BSB · ES·TL · Notes · Hebrew or Greek, a little smaller when all six show; on is the button lit in its own colour) and stay at the top of the screen while he reads, in the day's reading and in a chapter opened from a day's card or Past weeks (under its Back button), so a hard verse can be switched on the spot, and the verse he was reading stays put (Blake, 2026-10-01: "a sticky header … All in one row"). **Hebrew** / **Greek** (Blake, 2026-10-01: "add the Hebrew and the meaning of the Hebrew words … Or for the New Testament the Greek?"; every word) puts under each verse its words in the original, right to left for Hebrew: each word, how it sounds (syllables apart, the stressed one bold) and what it means there, a verse in Aramaic marked so. From STEPBible.org's data, made from work at Tyndale House Cambridge (CC BY 4.0, credited under the chapter): the Hebrew as the KJV's translators read it (the Qere), and the Greek the KJV translated (Scrivener 1894), numbered by the KJV's verses (Isaiah 9:1 is Hebrew 8:23). `tools/original.mjs` downloads it pinned to one commit; the deploy writes one file a chapter (`content/original/<chapter>.js`), loaded when he opens that chapter with the button on. The meanings are the data's, put in English order where Hebrew puts "my", "your" after the noun ("my people"). The KJV is the scripture. The rules are in `content/README.md`; `tools/verify.mjs` checks every plain chapter, that the BSB file has every Bible chapter of the reading, verse for verse, that the Spanish and Tagalog files say they're public domain and have every Bible chapter of the reading (the Spanish may leave out up to three verses of a chapter, a note), and that every Bible chapter of the reading has every KJV verse in Hebrew or Greek.  The words run left to right in the verse's own order (Blake, 2026-10-02: "organized in a way that us english readers read"), each in its letters with what it means under it and how it sounds, small, under that; God's name reads "the LORD". **Tap a word** for its word study ("connect to strongs and when i click a word ... i get a deeper word study"): its root word and Strong's number, what it means, its grammar in plain words ("a verb (an action word) · they · will do it", the full grammar under it), and where else the Old or New Testament uses it, eight of them with the KJV's words and every verse a tap away, with the whole entry on Blue Letter Bible. From STEPBible.org's brief dictionaries (TBESH, TBESG) and grammar keys (TEHMC, TEGMC), CC BY 4.0, pinned with the words; tools/words.mjs, built at deploy into content/words/<number>.js, one per root word of the reading, loaded on a tap. |
| **XP for reading and understanding** | Reading a chapter earns 50 XP (above). Tapping and opening the app earn nothing. A right answer on the first try earns 20 XP. |
| **One try** | A wrong answer shows the right one and the words in the verse that settle it. |
| **Daily warm-up** | On a new day, up to 3 earlier questions come back at the start of the day's lesson, missed ones first, with no verse to look at. Remembering one earns 15 XP. |
| **Go further** | At the foot of each day's card, **More from this day ▾** with what it holds ("2 insights · a video · 4 bonus questions · a note") and a count, ✓ once all done (Blake, 2026-10-01: the extra content shouldn't be "hidden in the same row of a green check mark"); opened, the day's best cards (three at most, Blake, 2026-10-02: one of each kind first), **🔭 Go further**, and the rest in Study. Go further is offered at the end of that day's lesson, and is never part of Today's. It plays like a lesson, with no warm-up: the day's best **insight cards**, then the reading bonus of each of the day's reels he has answered (one not answered yet says it opens after the day's reels), then a note on one of them. An **insight card** (Blake: "where can I get faithful commentary for this app? … Make that into additional insight cards") is one point about verses of the day's reading from a faithful source (the Church's manuals and talks, Scripture Central, BYU's Religious Studies Center and Speeches, followHIM), in our own words, with the page it comes from a tap away. It shows on the test site as a marked draft and on the live app only once approved in developer mode, like the plain words, and never holds a week back. The exception is a quote card from a Gospel Library page (General Conference, a Church talk), which shows without approval, since its words are the speaker's own and the deploy finds them word for word on that page; our own line under it still waits for approval (Blake, 2026-10-02: "Quotes only"). tools/verify.mjs checks each card (below). Two more kinds of card (Blake, 2026-10-02): a **quote card**, a prophet's or apostle's own words on the day's verses with the talk they're from, found word for word on its page; and a **video card**, one short clip a week (10 minutes at most) from an approved channel, which like a reel's clip shows only once a parent has watched it (approving it in developer mode marks it watched). |
| **Reading bonus** | Once a reel is answered, its own screen (a tap on it on its day's card) has a bonus question whose answer is only in the chapter (or the lesson page), never in the app's own words (the reels, questions and games; the chapter he reads in the app is the reading itself). One try, 25 XP. The link opens the chapter at the top, not at the answer. |
| **The week's plan** | The plan is the reading path: each day's chapters ("Read Isaiah 40", "Read Isaiah 41–42", Monday to Saturday, in order and split so no day is much longer than another, counting its reels and readings too), with the reels about those chapters on the same day; Friday's deep dive, Saturday's puzzle, Sunday for church and a family game. A reel whose verse is outside the reading comes with its section's other reels. It's a suggested pace, not a lock: everything stays open and reading ahead is fine. |
| **Today** | The page (Blake, 2026-10-02, "Build it", after the Scripture Central app): the week's title, **Your year** (52 dots, this week lit, each finished week green, how many chapters he has read this year; a tap on a week the app has picks its Monday), then a **strip of days**, every day the app has, from its first week to the last one loaded, each month labelled: kept ✓, today ringed, the rest to come. A missed day isn't marked (Blake: "Hide them"); the streak just restarts, and reading that day's chapters later still mends it. A tap on a day shows its **card**. Today's: its chapters, how much of today is done ("Catching up first · 3 of 15 done today"), **▶ Start today's lesson** or **Keep going** (what's left from earlier days first), **Pick up where you left off** (the chapter of this week he was last partway through, a tap from the verse he stopped at; marking it read forgets it), the day's reels, and More from this day. When today's part is done it says **✓ Done for today**. Another day this week: its chapters and **▶ Read Isaiah 43** (or Read ahead, Practice it again), Friday's deep dive or Saturday's puzzle, its reels (one answered opens as it was, with its bonus and a note; one not yet, the day's lesson). An earlier week's day: its chapters to catch up (read in the reader, marked read at their end, 50 XP), its reels, and the whole week a tap away. A later week's: what it will read and when it opens. Sunday's card opens the games. Under the card, the verse of the day, **Your week** (folded), family rewards and the week's lesson link. At the bottom, **Today | Study | Scriptures** tabs (and 👪 Family on a device in a family). The strip stays where he left it when he taps a day; a day off screen (from its week's dot) comes to the middle. On a Kindle or any screen 760 px or wider, two columns: the year and the days (the strip as a calendar) beside the card. |
| **Family tab** | A fourth tab, 👪 Family, on a device in a family (Blake, 2026-10-02: the cards about a child "need to be in a family dashboard"): **this week's chapters**, everyone ranked by chapters read this week (resets each Monday), 👑 for a clear leader, each 🔥 streak; the **family goal** ("everyone reads all 10 chapters", with who's done and 🎉 when everyone is), which a parent turns on or off right there; for a parent, **Today, for parents**, a card on each child: today's chapters with how long each was open and any "Yes, I read every verse", this week's count, new notes in the child's words, and one thing to ask about (the last reel answered or card read today); and Family chat and People. From the family's summaries (`progress`, with `read`) and each child's saved progress (`backup`, which parents could already read), watched while the device is in a family, and redrawn in place. A family whose `firestore.rules` predate `read` and `goal` keeps syncing without them. |
| **Study** | The second tab, for deep-dive days (Blake: "Those days I really just want to deep dive!"): every card of the week by day, **All · Insights · Quotes · Videos**; a tap opens one from the bottom (its verses, the page it's from, or its clip) and marks it read, ✓. |
| **Scriptures** | The third tab (Blake, 2026-10-02: "add another tab where we can see our version of the scriptures. orgainzed by book, chapter, and verse"): the five volumes and their 87 books (this week's lit, how many of each he has read), **This week** a tap away; a book's chapters (the Doctrine and Covenants' sections), this week's lit, ✓ the ones he has read in any week. This week's chapter opens as from its day (its reading clock, Mark it read). Any other opens in the reader with the buttons it has: the KJV everywhere, and for a Bible chapter the BSB, the Spanish or Tagalog and the Hebrew or Greek with its word study; the plain words, notes and short version where a week has them. Its end goes on to the chapter before or after, across books, and he picks up where he left off. Built at deploy by `tools/build-reading.mjs` from the same pinned data: `content/library.js` (the books), `content/lib/<chapter>.js` (a chapter's KJV, and for a Bible chapter its BSB, Spanish and Tagalog, 1,582 files), and the Hebrew and Greek for all 1,189 Bible chapters with a word study for every root word (`content/original/`, `content/words/`); none kept in git, each loaded only when opened. No XP: reading here is reading. |
| **🔥 and ⚙️** | The header's 🔥 shows the streak (⚡×2 beside it when supercharged, ❄️ freezes); a tap opens the ladder (×1.5 at 3 days to ×3 at 30) and the days to the next step. ⚙️ **Settings**: the Listen voice and the verses' size (Normal, Large, Larger), both kept on the device; Family and sign-in; Parent rewards; Developer mode (Blake, signed in); on the test site, a link to the live app. |
| **Listen along** | Every chapter in a lesson or the reader has **▶ Listen**: the Church's own recording of it, a man's voice or a woman's (he picks; remembered), played from the Church's site while he follows the verses, with a ⏸ button that stays on screen (Blake, 2026-10-02, from the Scripture Central app). tools/build-reading.mjs looks up each chapter's recordings at deploy, in the content Gospel Library itself loads (content/audio.js, not kept in git); a chapter without one has no button. Listening to the end counts as reaching the end of the chapter, so **I read it** opens, and the reading clock counts the time as ever; the parent screen's reading log notes he listened. Moving on, closing the lesson or the reader, stops it. |
| **Verse of the day** | Under the day's card, a verse from today's reading: today's first reel's verse (the one the day is built around), or on a day with none, one of the week's. A tap opens its chapter there, the verse lit. |
| **Today's lesson** | **▶ Start today's lesson** on today's card plays that part of the plan one screen at a time, Duolingo-style: what's left of the warm-up, then the day's chapters, Find it in the chapter, then for each of the day's reels read it (picture, text, verse), answer its question and fill in a missing word of the verse (never a word the verse repeats, and the wrong words start with the same kind of letter); then match each idea to its verse and Who said it? from that day's chapters, and Go deeper. Friday's lesson is the two deep-dive pieces; Saturday's opens the puzzle. Each day's card opens that day's lesson. Each answer is recorded once, the first time, and XP, the streak, the plan and the family's copy all see it. The practice steps (fill in the word, match, who said it) are built from the week's checked text and pay nothing. A picked answer is blue until Check; green only ever means right, and a quick double tap on Check or Continue counts once. A missed step comes back at the end until he gets it right; only the first try counts. Leaving partway keeps what he answered and reopening picks up there; a finished part replays as practice. The last screen shows XP, % right first time (of the questions, not the practice steps), time, the streak, and any new level or reward; a reward unlocked in a lesson he leaves early is announced when he leaves. A reel's clip plays on its Read screen and stops when he moves on. Or `…/#lesson`. |
| **Your week** | Big numbers, folded under the day's card: chapters read, reels done, right first time, bonus finds, went deeper, notes, the puzzle, and "A perfect week!" or "You finished the week!" at the end. |
| **Go deeper** | The last step of the day its passage is read (or, for one outside the reading, after its section's reels): a longer reading the lesson points to ("Read Isaiah 14:12–17") with one question only that reading answers. Friday adds two pieces: the children's part of the lesson and that month's Friend, For the Strength of Youth or Liahona. 25 XP each, first try, checked by `tools/verify.mjs` like the bonuses (the answer must be inside the passage it asks him to read). |
| **Scripture links** | Every scripture reference he can read is a link to it in Gospel Library, opening in a new tab: in the text, questions, answers' why lines, verse boxes, the week's reading, notes and the games. "(verse 22)" or "chapter 40" means the chapter of the verse the text belongs to, the same way the content checker reads it. Where a step tests memory (the warm-up, fill in the missing word, put the words in order, Verse Word's hints, Scripture Climb and the TV games before the answer shows), the link appears once he has answered. The app knows every book of the standard works; the checker fails if one is missing or if content names a reference that isn't real. |
| **Pictures and clips** | A picture on each reel it fits (Church Media Library art or public-domain photos, credited and linked), shown whole and undimmed at the top of the reel with the text below it, in the lesson and on the reel's own screen. At most 2 clips a week, only where they show something the words can't. Clips load nothing until tapped, then play just the chosen stretch in YouTube's privacy-mode player. |
| **Streak** | Days in a row kept (Blake, 2026-10-01). A day is kept when he reads that day (on a day with no reading left to do, Sunday or all caught up, one question answered counts instead, or an answer in the family's live game), **or once the chapters planned for it are all read, then or later**: a missed day is mended by reading its chapters, this week's in its lesson or an earlier week's from its day on the strip, and the streak joins back up ("if it is broken, it can be fixed and restored by simply filling the readings etc for the missed days"). A missed day with no chapters planned (Sunday) needs something done that day (Blake's call), so only a **streak freeze** (earned by solving the weekly puzzle) mends it. Freezes cover missed days automatically once he studies again, and come back if a day one covered is mended by reading. The 🔥 in the header shows its length; missed days aren't listed or marked (Blake, 2026-10-02: "Hide them"). **Supercharge** ("the longer the streaks, the more powerful the power up is"): every XP he earns is ×1.5 at 3 days, ×2 at 7, ×2.5 at 14 and ×3 at 30 (Blake chose this steady climb), shown next to the streak (⚡×2), on each XP pop-up and at the end of a lesson with the days to the next step. Kept as days (`days`, `filled`, `frozen`); the streak before 2026-10-01 became its days. |
| **Notes** | On an answered reel's own screen (a tap on it on its day's card), he can write what it means to him in his own words: 10 XP once per reel (12+ words, not filler). "Put it in my scriptures" copies the note and opens that verse in Gospel Library to paste it as a note there. No outside app can read Gospel Library notes, so the XP comes from writing it here. Notes are kept across weeks as a journal on his phone; a parent can read them in the parent screen, and the note box tells him so. |
| **🎮 Games** | Next to the streak, in four groups: **Every day**, **Family night**, **Book of Mormon**, which opens Title of Liberty (below), and **Languages**, which opens Amigo · Kaibigan (below). **Weekly puzzle**: a Connections-style sort of 16 ideas into the lesson's 4 sections (their headings show as the targets), unlocked once every reel is answered; 4 mistakes a day, repeat guesses are free; solving pays 40 XP and a streak freeze. A lost try shows the section headings but not where the tiles go, since the same puzzle comes back the next day. **Who said it?**: match lines quoted exactly from scripture to their speaker, 5 XP each on the first answer (here or in the warm-up, where one line comes back each day); choices shuffle each round, a reload picks up at the same line, and the end shows this round's score and the first-try count. **Verse Word**: real Wordle rules (six tries, green/yellow/gray letters with a one-line key, and every guess must be a word from the Bible or Book of Mormon, per `scripture-words.js`, rebuilt by `node tools/build-words.mjs`), with hints that unlock: after 2 guesses the chapter, after 4 the verse with a blank; when it's done, one line on what the verse means. 15 XP solved in 1–2, 10 in 3–4, 5 in 5–6. **Scripture Climb**: a Millionaire-style ladder of ten questions (reel questions, then reading bonuses he has already answered, since the climb shows each answer) from 100 to 32,000 points (a miss ends the climb and keeps the highest rung reached), with 50:50, Read it, and Ask a parent lifelines; every answer links its source. It opens once the week's reels are answered. The first climb each day pays 2 XP per right answer as he gives it, and is taken from its first answer on, so leaving and starting over is practice. **Live game**, **Scripture Showdown** and **Babylon Falls**: below. |
| **Babylon Falls** | A Risk-style map game for 2 to 4 players, about the fall of Babylon (Isaiah 45:1; Daniel 5). The map, a painting of the ancient Near East with each land traced along its painted borders (an owned land is washed in its kingdom's color, with a line of that color inside its border and a ring on its badge, so you can see who holds how much; neutral lands stay unpainted), goes on a computer or TV (`…/#babylon`, or the shorter `…/tv` for a TV's own browser, with no menu to scroll); everyone plays on their own phone or tablet with the join code (`…/#babylon-join-1234`, which the QR code beside the code on the TV opens; the lobby's Start sits above its settings, so a TV never has to scroll), picks a kingdom (Persia, Media, Lydia or Egypt; with 2 players, a ⚖️ tip on the TV and the phones names the fairest match-ups, Media vs Lydia and Persia vs Egypt, from the board's `fairPairs`, since the others lean up to 60–40 in simulation, and 🎲 Deal a fair match-up on the TV gives the two players one of them at random), and picks how to play: **📖 Story** or **⚡ Pro** (below; ⋯ switches any time, and everyone plays the same game). Babylonia is neutral, the prize everyone is after: **take it and hold it until every other kingdom has had a turn to take it back, and you win**. Its gates stay shut in round 1 (round 2 opens them, Isaiah 45:1). **Babylon's wall** stands on the sides that face the kingdoms nearest it: its borders with Media, Assyria, Elam and Arabia (the board's `wallSides`), drawn on the map as a line of bricks with 🧱4 by Babylon's badge. An attack from one of those lands hits the wall, not the guards: the wall rolls like guards, one die for each brick left, up to 3 (`wallDice`), each duel won knocks down a brick and each duel lost costs a soldier, and the land isn't taken. Once its 4 bricks (`bricks`) are down, the wall is down for everyone ("Babylon’s wall is down!", with Jeremiah 51:58). Inside waits **Belshazzar's Guard** (the board's `guard`): while nobody holds Babylon, its guards roll up to 3 dice instead of 2, and they gain 1 more at the start of every round ("Belshazzar’s Guard grows: 4 guards in Babylon now."). Only someone who has **read the writing on the wall** this turn can fight them: on your turn, next to Babylon past its wall, 📜 Read the writing on the wall asks a hunt question from the chapter (a quick one in a week without hunts), one try a turn, with the TV and the other phones reading along (Daniel 5:5 the first time; Daniel 5:26 when it's read). Right, and the guard can be attacked for the rest of the turn; wrong (or I don't know), and it waits for your next turn (the wall can still be attacked). Story shows it as the Babylon card; Pro's map marks Babylon's odds 📜 until then. Once someone takes Babylon, it's defended with 2 dice like any land. The sides facing Syria and Armenia, the far kingdoms' way in, have no wall, so every kingdom is 3 steps from an open side, and the wall is Media's (and Persia's and Egypt's) shortcut, paid for in soldiers. Whoever holds Babylon keeps the wall's shelter while it stands, so the others get one turn each to storm it back, through the wall or round it. **Regions** give everyone something else to fight over: hold a whole one and it pays every turn (Anatolia +1: Lydia, Cappadocia, Cilicia; the Levant +2: Phoenicia, Judah, Syria; Media and Persia +2: Media, Elam, Persis; the North Country +1: Armenia, Assyria; Egypt and Arabia +1), so Media and Persia start out fighting over their own plateau and far-off Lydia has Anatolia, worth only +1 since Lydia holds it unopposed (at +2 Lydia won too often). The way into Anatolia is through **the Taurus Mountains** (the board's `mountains`): Cappadocia and Cilicia start with 3 guards instead of 2, marked with a mountain chip by their badges on the map (drawn, not the ⛰️ emoji, which not every TV's browser has), so Lydia can't spread through its corner for free. (In simulation this evened out 4-player games, every kingdom within 3 points of a fair 25%, where Lydia had won 32% and Media 19%.) Each region's name sits faintly on the map and becomes a 👑 chip in its holder's colour; Story's attack cards and its ⭐ good spot point out a land that would complete one ("Take it and you hold all of the Levant: +2 every turn!"), and the narrator calls a region won or broken. The smallest kingdom (fewest points, alone at the bottom) gets 1 more soldier a turn. **Prophecy cards**: take a land in your turn and you earn one at its end (hold up to 3; 📜 in the strip shows how many each player has). Tap one on your turn to read it, then Play it: 🦁 the Lions' Den (Daniel 6:22, a land of yours can't be attacked until your next turn, 🦁 on the map), 🌊 Dry Up the River (Isaiah 44:27, the lands you attack this turn roll 1 die fewer), 🧱 the Gates of Brass (Isaiah 45:2, the wall loses 2 bricks, or Babylon a guard once it's down), ✋ Hold Thine Hand (Isaiah 42:6, 3 soldiers on a land of yours) and ⚖️ Weighed in the Balances (Daniel 5:27, the leader loses 2 from their biggest land). A card that can't be played now says why; the TV shows a banner when one is played. **Exile**: when your last land falls, your cards go to whoever took it and your kingdom is carried away into exile (Jeremiah 29:14); on your next turn it comes back (Isaiah 35:10) onto any land nobody holds, with 4 soldiers, then plays on. That happens once a game: the second time, the kingdom falls. Every card then says who holds it and what that means ("👑 Sam holds Babylon. Mom and Dad still get a turn to take it back, or Persia wins!"; "Take it back this turn, or Persia wins!" for the last of them; "You hold Babylon…" on the holder's phone), and 👑 marks the holder. No TV? **Play on this one screen** (`…/#babylon-here`): type a name next to each kingdom that's playing (with 2 names, 🎲 Deal a fair match-up moves them onto a fair pair), choose Story or Pro for the screen, and pass the phone, tablet or computer around; a "Pass to Dad" card comes between turns, and the game is kept on the device to continue later. Every screen is the same three things: who's playing (points, whose turn), the map, and one narrator card that says what just happened and what you can do next. The rest is under ⋯: the whole story, how to play, what's happened so far, Story or Pro, and on the big screen the narrator's voice, Skip this turn and End the game now. Each kingdom starts at home with 4 soldiers; the other lands are neutral, held by their guards (2 each; 3 in the Taurus Mountains and in Babylon). A game opens with one line of the story (Isaiah 45:1) and how to win, and each round opens a **chapter** of the story, read out by the narrator ("Chapter 2 of 5: The Gates Open. The Lord promised King Cyrus he would open “the two leaved gates” (Isaiah 45:1). Now anyone can attack Babylon!") and shown across the map on the big screen or the one screen, with the game's chapters ticked off (the whole screen when the map is too small for it, as on a phone; ⋯ and Exit stay reachable): there are 12, a Short game tells 5 of them, a Standard 8 and a Long all 12, always from the kingdoms gathering and the gates opening to Babylon's fall. Each round opens with **🎲 the dice for the turn order**: every kingdom still playing rolls one, highest first, and a tie rolls again (`riskRollOrder`; the tests set the dice with `window.TU_ORDER_DICE`). The chapter shows the rolls in order, the strip lists the players in that order with their dice ("Dad 🎲5"), and the narrator reads it out ("🎲 The dice set the order: Dad (5), Sam (3) and Mom (2)."); the last turn of a round says "Next: 🎲 a new round" on its End button, and a kingdom can play last in one round and first in the next. (With the order fixed, whoever went last won about twice as often as whoever went first, since a game that ends on points gives the last mover the last word.) A holder of Babylon wins the moment every other kingdom still playing has had a turn since it was taken, whatever the order. Each turn: answer a question for soldiers (easy, a reel's own question, 3: about half from this week and half a review from earlier weeks; hard, a **hunt** through a chapter, 5, where the question names only the chapter and its link opens the chapter at the top; a miss 1; plus 1 for every 3 lands, each whole region's bonus, and 1 for the smallest kingdom), put them on your lands, attack, move soldiers (as often as you like, from a land to a neighbour of yours; each soldier moves once a turn, so the ones that just moved in stay put), and end the turn. **📖 Story** is for a young reader: one step at a time (Question, Soldiers, Attack, Move), in plain words, with 🔊 Read to me on every step (the browser reads the narrator and the card aloud, lighting each word) and no timer. One tap on a land puts all the new soldiers there (⭐ a good spot is named and ringed on the map; ↩️ Undo until the first attack). Each land he could attack gets a card, from his strongest land next to it, with its chance (Good chance, Maybe or Hard) and the numbers ("Elam has 2 guards. You have 7 soldiers in Persis."); after attacking, moving: tap a glowing land on the map, then one of yours next to it, then how many (− and +, or All), as many times as you like, with each move listed and ↩️ Undo for the last one; a good move is offered too ("⭐ Keep Elam safe? Move 1 soldier from Persis to Elam."). "Not now. I'm done attacking" can be taken back (↩️ Back to attacking) until the first move. **⚡ Pro** is tap, tap, done: a tap on a land puts 1 soldier there (twice quickly: all of them; All on it; ↩️); tap one of your lands and one next to it, or drag between them, and the map shows the odds of each attack from there ("Persis 7 → Elam 2", 93%); 🎲 Roll throws every die at once, and ⚡ Blitz keeps attacking until the land falls or yours is down to 3 (Stop any time); two of yours make a move, with − and + for how many, as many moves as you like (↩️ Undo for the last). Pro has a timer (30 seconds, hunts 90; running out counts as a miss), which the setup can turn to Relaxed; Story never has one. **End turn** is one tap, with 3 seconds to undo. The guards roll first (2 dice, or 1 when only 1 is defending; Babylon's wall, one for each brick left, up to 3; Belshazzar's Guard, up to 3; 1 fewer with 🌊 Dry Up the River). On a TV game, a player whose land is attacked rolls its guards: the TV calls out "Mom, roll to defend Media!", her phone shows her dice in a tray (🛡️ Roll 2 dice) to flick up with her thumb (or tap), and after 10 seconds (on the TV's clock) the dice roll by themselves; a neutral land, or a game on one screen, rolls right away. Every screen then shows the battle as duels: the guards' dice across the top, best first (Duel 1 and Duel 2; "🧱 Babylon’s wall" when it's the wall), and the attacker's dice, one for each soldier that can attack, up to 3, each stepping into the duel where it ranks, highest against highest; a die pushed out by a bigger one sits on the bench, and a tie goes to the guards. Every roll is a tray of dice on the phone, flicked up (or tapped): Story rolls one die a flick, and the TV and Story phones tell each die in plain words ("Elam's guards rolled 5 and 2. Your biggest die will fight their 5, and your next biggest will fight their 2. Your smallest die sits on the bench."; "Your 6 is bigger than their 5. You win this duel!"; "Last roll! Get a 3 or more to win duel 2."), with each duel marked ("✓ You win", "✗ Guards win") and the score so far ("Elam lost 1 guard. You lost 1 soldier."); Pro phones get shorter lines ("A 4! It beats your 1, so it takes over duel 2 against their 2, and wins."; "✓ Elam −1"). A Story fight stops as soon as the dice still to come can't change who wins, once every duel has a die (his first two dice already win both duels, or nothing left can beat the guards' 6s): those dice are never rolled, the result says why ("You won every duel, so the last die wasn’t needed."; "The last die couldn’t change who wins, so it wasn’t rolled."), and a land taken still gets as many soldiers as the dice the attack was made with. The next-roll line looks past one die when two are left ("Get two dice of 4 or more to win duel 2."). 🤔 What do I need? explains the roll: each duel, ties, why each side rolls that many dice, and that more soldiers don't roll more dice but let you attack again. The first sweep, or the first attack thrown back, in a turn ends with a verse from Isaiah 40–49, this story's own chapters ("they shall mount up with wings as eagles", Isaiah 40:31; "Fear thou not; for I am with thee", Isaiah 41:10). The battle settles in the same panel, with the last die's sentence and what it cost ("🎉 Elam is yours!" on the attacker's Story phone, "Elam falls!" elsewhere); a Pro card then keeps the last roll in one line. While a battle is fought, an arrow in the attacker's colour runs from its land to the one it attacks, on every map, and the narrator moves on to it ("Persia attacks Elam from Persis."; "Mom rolled 6 and 6 to defend Media. Now Sam rolls."); when a kingdom and a land share a name, it names the player instead ("Mom's soldiers attack Media!"). On the TV, and on the one screen, each battle is played out on the painting itself: the map zooms into the two lands and dims the rest, each side's fighters stand ready (up to 10; the badges keep the real count), each die tumbles in and becomes a glowing shot with its number in a fighter's hands, and a dashed line pairs biggest with biggest (so you can see a new die take over a duel, and the smallest sit on the bench). Once the last die is in, each pair of shots flies across the border: "6 > 5", the smaller shatters, and the bigger knocks down whoever threw the other (a tie goes to the guards); a land taken sees its winners march in and its border turn their colour. Phones say "⚔️ Watch the TV!" (with what's flying: "Biggest against biggest: 6 against 5 and 4 against 2") until it's over, then show the result, and the TV's voice and its "falls" banner wait for that moment too. Blitz stays zoomed in and goes quicker; the one screen has Skip ⏭; with the device's reduced motion setting on, there's no scene and no wait. The story also comes in at the first attack on the wall (Isaiah 45:2), the wall coming down (Jeremiah 51:58), Babylonia's first fall (Daniel 5:28 when the Medes or Persians take it, Isaiah 21:9 otherwise), and a win by holding it (Ezra 1:2 for Persia, Daniel 5:31 for Media, Daniel 2:21 otherwise). The TV shows the big moments in a banner across its map: a player called to defend, a land falling, Babylon's wall coming down, Babylon's gates opening. **Taps that go too far:** a tap that moves the game on (an answer, an attack, a roll, Done, a move, End turn) waits on a phone until the map screen has answered the last one (a few seconds at most, if it was lost), with the buttons dimmed meanwhile, new buttons fade in and take taps half a second after they appear, and a quick run of taps counts as one (dice still roll a tap each), so tapping again while a screen lags never lands on the next step. While someone else places, attacks or moves, each other phone can **fortify**: **Quick**, a reel question (half this week, half review), for 1 soldier, or **Deep**, a hunt in the reading, for 2. Soldiers earned while waiting, from fortifying and the speed round together, stop at 2 a round (`RISK.waitRound`; the phone shows "This round: 1 of 2"), so the ones waiting can't outgrow the one playing. The first chance comes as that turn gets going and another every 45 seconds, up to 3 a turn (every 60 seconds, up to 2, in a Story player's turn, so a young reader's slower turn doesn't make everyone else much stronger); the map screen counts them on its own clock, and a phone says when the next one comes. A right answer is the player's choice: put the soldiers on their lands right away (they pick the land, then 🛡️ Put 1 on it; never Babylon, which is won on your own turn), so a land under attack can be strengthened mid-attack, or 🤫 save them for their own turn, where they join the soldiers the turn's question raises. The TV announces each right answer ("✅ Sam knew it! +1") and each save ("🤫 Sam saved 1 for later": how many, not where they'll go); saved soldiers don't show in the strip. With 3 or more playing, 30 seconds into each turn comes a **⚡ speed round**: the same question on every waiting phone and on the TV, 20 seconds, the first right answer wins 1 soldier, and a wrong answer is out. A turn that runs long gets a **⏳ nudge**, never a cutoff: after 2 minutes (3 in Story), the narrator and a TV banner say "Mom, time to finish up!" and her phone chimes and flashes. (The tests shrink these clocks with `window.TU_WAIT_SCALE` when there's no Firebase.) No new chances while a turn's own question is being answered, so everyone reads that one along. The map screen shows a banner ("🛡️ Mom fortifies Media: 5") and the land's badge pulses, and an attacker is told when a land he could attack was just fortified ("🛡️ Mom just fortified Media: 5 guards there now."). With 💡 insight on (a setup option, on by default), a hunt answered right also earns an insight (up to 3). Spent on a turn, it shows the real odds of each attack and the best moves until that turn ends. A phone chimes and flashes in its kingdom's colour when its turn starts (⋯ turns the chime off; phones that can also buzz, not iPhones), and keeps its screen awake during a game. The TV's card text grows with the screen (about 1.5 times a phone's on a 1080p TV). The narrator's voice (the browser's own) starts off; ⋯ on the big screen turns it on to read the narrator's lines and each chapter aloud, and that device remembers. If nobody holds Babylon through everyone else's turns, after 5 (the default), 8 or 12 rounds the most land wins, Babylonia counting 3 (when the last round ends first, points decide). The winner shows across the map on the TV or the one screen: how they won, everyone's points, and whether Babylon fell (just "🏆 Persia wins!" over a phone's small map, with the rest in the card below it); a tie on points goes to more soldiers, and the end says so. The question shows on the map screen too so the family reads along, then the answer and why. The computer runs the game: phones send moves that it checks, so nobody can cheat from a phone (`firestore.rules`, `/risk`). A reload picks the game back up; Exit mid-game needs a second tap. It never changes XP. The board is `content/boards.js`, checked by `tools/verify.mjs`. The join QR code is drawn by `vendor/qrcode.js` (Kazuhiko Arase's QR Code Generator, MIT license), loaded only when a lobby opens. |
| **Live game** | Kahoot-style. A TV or laptop hosts (`…/#host`): it shows a 4-digit code, then each question, and keeps score. Phones and tablets join with the code (`…/#join`, or `…/#join-1234`) and answer on their own screens in real time; the same answers appear in the same colors everywhere. 700 points for a right answer plus up to 300 for speed, 20 seconds a question; after each, the TV shows the answer and why with everyone's score, and each phone shows the answer and why too. A family total at the end, and ties share a place. **Play again** starts clean. A player who misses two questions in a row (say they left) stops holding up the timer; a reloaded TV tab picks its game back up, and Exit on the TV asks twice mid-game. No accounts needed to play; it never changes XP. Runs through Firebase across devices (`FIREBASE_CONFIG` in `index.html`, rules in `firestore.rules`); until that's set, it runs between tabs of one browser, which is also how the tests play it. |
| **👪 Family** | Optional, next to 🎮. 👪 opens the family screen on **People** (add someone, sign out) with **Chat** the other tab; a dot on 👪 means a new message. A parent signs in (Google, or a sign-in link by email) and starts a family. Grown-ups (grandparents, friends, roommates, the other parent) are added by email and sign in with that address; a child is added by first name and joins by opening a one-time link on their own phone or tablet, with no account. Links work once, for 7 days. **People** shows each person's level, XP, streak and this week's right answers, and a family total. Each person's progress is saved to the family, so a new device ("Link another device") or a parent's second phone picks up where the other left off. Progress on a device belongs to one person: if a device already has progress when someone joins or signs in there, it asks whose it is, and someone else's is set aside on the device (it comes back when they sign out) instead of being mixed in. Two devices for the same person stay in step: an idle one catches up by itself, and if both changed while apart (say one was offline) they're merged, keeping every answer and note from both. People shows when this device last saved to the family. Adding a child whose name is already in the family asks first ("Sam is already in the family. A new phone or tablet for Sam?"): **Link it to Sam** makes the same link as Link another device, or **No, a different child**. Two children with the same name (a new device that joined as someone new) get a box on People for a parent: **Combine them** (two taps) keeps the one with the most XP, takes the other's devices out, deletes its saved progress only when the one kept already has all of it (otherwise it waits under Taken out), and readies a link for that device, which then asks whether its progress is theirs and adds it (Blake, 2026-10-01: "Make this easier"). Parents see every device joined as a child and can remove one; a child whose devices are all removed is listed under "Taken out", with **Add back** (the saved progress comes too) or **Delete saved progress**. Whoever started the family always stays a parent. Email sign-in links are limited to 5 a day on Firebase's free plan; Google sign-in has no limit. **Chat** is one family chat, text and emoji only: no private messages, links or photos, nobody can delete a message, and a parent can hide one (everyone sees it was hidden; parents can still read it and unhide it). A dot on 👪 means a new message. `firestore.rules` enforces all of it. |
| **Past weeks** | Back along the strip (or a tap on its year dot), each day of an earlier week, with **Open the whole week**, which opens it on its own screen: its chapters (read in the app), then each section's reels and Go-deeper readings, marked ✓ / ✕ with his first try; a reel opens as it was, with its picture, clip, verse, the right answer and his, its bonus questions and his note. A question he didn't answer that week (a reel, a bonus, a Go-deeper reading) he can answer there now: the first try only, paying the XP it pays this week when it's right, kept apart from the week's own record (`late`) and marked with an outlined ✓ / ✕. So can a chapter he didn't read (Blake, 2026-10-01: "I want to catch up with all the reading of even the past weeks"): its end has **I read it**, with the reading clock and the same honest question as a lesson, for the reading XP, an outlined ✓, and the day it was planned for mended if it was that day's last chapter. When a week ends, what he did in it (answers, bonuses, Go deeper, chapters read) is saved with its year-trail entry before the new week clears it. A week that ended before that was saved (up to the morning of September 28, 2026) kept only its totals; where they prove it (every reel answered, every chapter read) its rows are ticked, grey when whether each was right isn't known. Two devices that each kept a week keep the copy with what he did in it. Weeks older than last week move from content/weeks.js to content/past/ (`node tools/archive-weeks.mjs`), one file each, loaded only when opened. |
| **Scripture Showdown** | A quiz-show board game for the whole family, built from the week's checked questions. Columns are the lesson's sections; reel questions are the low values, reading-only bonus questions the high ones, one of them a Daily Double. A parent hosts on a laptop hooked to the TV and taps everyone who got each one; scores add up to a family total and a family best for that week. **Play again** shuffles the tiles and the Daily Double; **Change players** asks before clearing a game in progress. Open it from 🎮 (or Sunday's card), or bookmark `…/TreasureUp/#family`. It never changes his XP. |
| **Family rewards** | A parent sets rewards at XP marks behind a 4-digit PIN ("Pick Friday's movie at 300 XP"). The same screen shows **Reading this week**: how long each chapter was open before “I read it” (time in Gospel Library counts), and each time he said yes to “Did you read all of it?”. He sees his progress on the page and gets "Reward unlocked, show a parent" when he crosses one (on a lesson's last screen, if it happened there); only the parent can mark it given. The PIN keeps an 11-year-old from editing his own rewards; it isn't security. |
| **Sections match church** | Reels are grouped under the lesson's own section headings (on each reel, and in Past weeks), so what he reads lines up with class on Sunday, even though the days follow the chapters. |

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
green on Your year). Keep weeks in date order and drop ones older than
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
**Lachoneus and Gidgiddoni** (3 Nephi 3–4), and two skirmishes. It lives at
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

**Skirmishes** (Red Alert's way of playing, once any mission's chapter is
read): start with the standard of liberty, a few workers and three soldiers,
and plant the standard on open ground to make your city (Alma 46:36). Then
build up and either hold off the raids or tear down the war camp.

- **Out of the Wilderness**: a valley with mountains to the north, wilderness
  to the west and a river to the east. Robbers and Lamanites come down by
  four ways (two mountain passes, the western wilderness, the river fords),
  bigger each time, with an army every third raid and armored captains late
  on. You hear which way about a minute before they come (a red mark on the
  map and the small map), half a minute sooner if a watchtower stands near
  that way. Robbers go for the farms and stores first. Short is 5 raids (about
  15 minutes), Long is 10 (about 30). A band that can't reach you goes home
  after a minute. Hold out to win; lose the city and it's over.
- **Free battle**: the Lamanite war camp in the north-east (below).

The buildings:

| Building | Needs | What it does |
|---|---|---|
| City | the standard | Trains workers; feeds 10, stores 300 |
| Farm | | Feeds 8 more and grows a little grain (Helaman 6:12) |
| Granary, storehouse | | Store 500 / 300 more of each; past that, what's gathered is lost |
| Barracks | | Spearmen, slingers (Alma 2:12); archers and swordsmen once there's an armory |
| Watchtower | barracks | Shoots at enemies |
| Armory | barracks | Breastplates and shields (+4 armor, Alma 43:19), swords and cimeters (+3 up close, Alma 43:18), ridges of earth and pickets (walls ×2, Alma 50:1–3), one at a time |
| Stables | farm | Horse carts: haul 30 at a time and move fast (3 Nephi 3:22) |
| Hall of the captains | armory | Javelin throwers (Jarom 1:8) and stripling warriors (Alma 53:20) |

Nobody can be trained without food for them. Each soldier is strong against
one kind of enemy (×1.5 damage), so a mixed army wins:

| Soldier | Strong against |
|---|---|
| Spearman, javelin thrower | armored men (captains, swordsmen) |
| Swordsman | archers, slingers and javelin throwers |
| Slinger, archer | men without armor |
| Stripling warrior | nobody in particular: costly, but the strongest |

Armor takes off a share of each blow rather than a fixed amount, so it
always helps and never makes anyone untouchable. Mending a wall or building
costs timber. Workers who stop to build go back to the trees or the field
they came from.

The Lamanite war camp in free battle's north-east has guards, watchtowers and
three camps; it sends a bigger attack every couple of minutes, adds guards
while it stands, and grows fiercer over time. These Lamanites have shields
and breastplates of their own (Alma 49:6). Tear down the war camp and the
camps to win. Both skirmishes give Easy ★, Normal ★★, Hard ★★★. A scripted
player wins free battle's Normal in about 9–10 minutes (every seed tried) and
Hard about 2 times in 6; it holds off the raids at every level and length,
and a city left alone falls (Easy by about 15 minutes, Normal by 8). The
council asks about every chapter read so far. Where a description borrows
from history rather than the verses (the atlatl, the stepped platform of the
hall), it says so.

**The council**: a button that asks a question from the mission's chapters (13
for Alma 43, 11 for Alma 44, 10 for 3 Nephi 3, 11 for 3 Nephi 4, in `liberty/data.js`). A right answer brings
40 grain and 60 timber; a wrong one shows the verse that answers it, and that
question comes back later. A new question a minute after a right answer, 30
seconds after a question opens otherwise. Every gold verse reference in the
game opens the verse itself.

**Controls**: tap or click to choose, drag a box (on a touch screen, **Box
select** first), then tap the ground, a robber, trees or a field, or an
unfinished building. Right-click also gives orders. Workers build (walls are
dragged as a line) and mend walls; Zarahemla trains workers and the barracks
guards. On a touch screen a new building shows where it will go on the first
tap and is built on the second, and **Let go** clears the selection. When
something of yours is attacked a message says so and a red ring shows where,
on the map and the small map. Drag or arrow keys to look around, pinch or
scroll to zoom, the small map to jump. Space pauses, H stops, Esc cancels.
At a chapter's big moment
(crying unto the Lord, Lehi's attack, remembering their liberty) a gold
button appears at the top. The maps are pictures of each story: where these
places were isn't known, and the game says so.

Progress (chapters read, stars) is kept on the device (`localStorage`,
`liberty.v1`). The code is plain JavaScript with no build step:
`liberty/data.js` (map, units, questions), `liberty/sim.js` (the rules),
`liberty/missions.js` (the story), `liberty/ui.js` (drawing and controls) and
`liberty/scripture.js`, the chapters' text, made by `node
tools/build-liberty-text.mjs` from the same pinned data the checker uses.
`node tools/test-liberty.mjs` plays the missions and both skirmishes with a
scripted player and
checks every quotation in the game against the verse it cites; the deploy
runs it and won't publish if it fails.

**New art comes from Gemini**, which Blake runs in Antigravity on his Gemini
plan, watching the open art pull request. Claude writes a request in
`liberty/art/requests/` and comments on that pull request ("Claude → Gemini");
Gemini makes the pictures, pushes them to `liberty/art/incoming/pr<number>/`
and replies, which wakes Claude to check them at game size and put the good
ones in the game. `GEMINI.md` is Gemini's brief: who does what, the house
style and the rules. The first picture made this way is the worker
(`liberty/art/requests/001-worker.md`).

---

## Amigo · Kaibigan (a separate game)

Both words mean *friend*: Spanish for his friends at school (the way kids in
Mexico say it) and Tagalog, Blake's mission language, with Baybayin, the
script Filipinos wrote before the Spanish came, as a side quest. It lives at
**https://blakemerrell.github.io/TreasureUp/amigo/** (🎮 → Languages), apart
from the app: progress stays on the phone (localStorage `amigo.v1`) and never
changes Treasure Up's XP or streak.

- **Lessons** of about five minutes: listen and pick, match the pairs, build
  it from tiles, and what would you say?. A missed question comes back at the
  end; a phrase answered right comes back after 1, 2, 4, 8… days, and one
  missed comes back the next lesson (`amigo/engine.js`). A streak and XP of
  its own for each language.
- **Courses**: `amigo/course-es.js` (En el recreo, Fútbol) and
  `amigo/course-tl.js` (Kumustahan, Kain tayo), three lessons a unit. How to
  write one is in `amigo/README.md`.
- **Tagalog · Past the basics** (`amigo/course-tl2.js`), Blake's own: each
  unit a conversation between two people, recorded in two Filipino voices at
  native speed (*Slower* plays it at 0.75), and the grammar it uses, in three
  lessons: **Listen** (no words on screen, questions, the missing word, then
  the words), **Grammar** (pick the right form, build sentences) and **Say
  it** (say it aloud, look, mark yourself). Kumustahan ulit (finished
  actions), Sa palengke, Sa jeep, Handaan, Sa telepono, Kuwentuhan.
- **Voices**: a line's recording first, where it has one (Tagalog in a
  Filipino voice, made once by `tools/amigo-voice.mjs` with Blake's Google
  Cloud key, which stays off the app; plays on every phone). Then the phone's
  own voice: Spanish in a Mexican voice, Tagalog where the phone has one. On a
  phone with no Tagalog voice (every iPhone), the Spanish voice reads the
  Tagalog, h said as j (Blake chose both, 2026-09-30).
- **Blake checks the Tagalog.** A Tagalog unit, the home screen's words from
  Tatay and the Baybayin reading words show on the live app only once they
  have `checked` (the date he did). The test site shows them all, marked, and
  lists every Tagalog line under **Check the Tagalog**.
- **Baybayin**: six short lessons (a few characters at a time, then the
  marks), a writer for names and secret messages, and the chart
  (`amigo/baybayin.js`).
- `tools/test-amigo.mjs` runs at every deploy: the courses follow their
  rules, every lesson builds and can be answered, reviews and streaks work,
  and Baybayin spells words right.

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
