# Browser tests

The app in Chromium (Playwright), the way he uses it: Today's study through
Be still, every step of the day's path done the honest way (each part read to
its end, each question answered right), a week of days, and a family across
three devices. Each test reads the week from `content/weeks.js`, so none needs
changing when the week does.

| Test | What it checks |
|---|---|
| `smoke.test.mjs` | The app opens on today's date with no errors; every tab, Be still and the settings sheet open; the TV page, Wika and Title of Liberty load. |
| `dates.test.mjs` | The week that crosses New Year opens on its Monday and runs to Sunday, both ways its dates can be printed (with a test copy of `content/weeks.js`). `tools/week-dates.mjs` checks the tools' copy of the rule. |
| `week.test.mjs` | The live week on one device: Monday to Saturday each through Today's study, XP up and the day kept; Sunday opens; Sunday with nothing read is still kept by “We played!”; a chapter split over two days opens its second day from the reader's “Mark it read in its lesson”. |
| `sunday.test.mjs` | Sunday's Today opens with Be still and the Morning Council at the top of its own list, like every other day: the Council opens, saves and pays 15 XP once (saved again, still once), its to-dos in Goal Achievements and Return & Report under the list; neither keeps the day nor holds it back (a family game still keeps it); a youth's and a grown-up's titles; neither in Family Study or on Sunday seen from Saturday; `mergeProgress` keeps a Sunday Council. |
| `talks.test.mjs` | A conference talk as cards, with the test's own `content/sunday.js`: without its own cards, the title, a card a point, the speaker's words and the questions; to the end, studied for 20 XP once (played again, nothing); with its own cards approved, Grown-ups and Kids on the first card, the talk's quote with the card it goes with, Back, the question (25 XP right the first time), the kids' cards, and the whole talk on one page from the last card; a grown-up's Today's study plays the day's talk as its cards and question, then the talk is studied and the day's conference step done. |
| `coach.test.mjs` | Try my own: off at first; turned on in the Parent hub, a Bible chapter opens it with each verse's KJV, its Hebrew word by word and a box; the hints (a name left out, KJV English, a verse much shorter); Save keeps it on the device and out of his progress, through a reload; the chapter marked, Show mine under the verses; a chapter whose words don't load still opens; off again, the reader exactly as before. With its own chapters, so it needs no build. |
| `growth.test.mjs` | The Growth Coach: a birthday, not an age (April 2015 in October 2026 is 11, Primary until January 2027, with the turning-12 note); no interests picked for him; one typed in and his superpower become Season ideas, and the turning-12 ones; in January 2027 the youth ideas, with nothing changed by hand. |
| `reader.test.mjs` | The reader's buttons: a Book of Mormon chapter has no KJV button, keeps Notes and has Changes, 1830 and JS Papers (in that order), in one row that fits, a 320px phone too; Changes on shows 1 Nephi 11:18's 1837 change, marked and credited; 1830 on shows 11:18's 1830 line with “which” pink and ‸ before “God”, “whom” and “the Son of” underlined in today's text, and its p. 25 link to the Joseph Smith Papers, and turned off leaves the chapter exactly as before; JS Papers links to the Joseph Smith Papers in a new tab (the data checks run when the deploy's files are built; stand-ins otherwise); a Bible chapter keeps its KJV and has none of them; the Doctrine and Covenants has Notes and no KJV. |
| `questions.test.mjs` | Questions friends ask, with the test's own `content/questions.js` (never the committed one): no shelf in the Scriptures tab with none approved, or with only a draft; with approved ones, the card under the Standard Works (counting only those), the four areas in order with each question's where-icon and no draft, a question's title and short answer, Go deeper folded until tapped, Learn more from Scripture Central after it (each row's kind icon and label, a podcast opening in a new tab, no section when `more` is empty or missing), its sources as links to a new tab, Talk with Mom or Dad above the answer when `parent` is true, and the back gesture a step at a time; the test site lists the draft, marked; developer mode (a stand-in for GitHub) shows a draft's notes to look at, shows its Learn more links, approves and saves it with the fingerprint `tools/verify.mjs` checks (which covers `more`), and publishes the file to the live app. |
| `merge.test.mjs` | Two devices' copies merged by the app's own `mergeProgress`: Be still's minutes add up, the warm-up and Scripture Climb pay once, freezes count once, settings changed on either are kept, two years' week 39 both stay; then start-up files a week once and trims old things. |
| `pro.test.mjs` | Pro Mode in the Season notebook: ✨ Pro on, roles and a mission, a year goal and a 90-day goal, Sunday's plan for next week (rocks on days, one moved), Monday's top 3 from the plan and typed, ticked there and on Today, the month's review; Simple again is the notebook exactly as before, Pro again keeps it all; two devices' Pro data merged by `mergeProgress`. |
| `games.test.mjs` | On the emulators: a live game on a TV and two phones (a phone that reloads is back in and still locked in, the answer and scores are written as one so a TV reload can't count a question twice, Play again doesn't wait on someone who left, an old game's code is refused) and Babylon Falls' map reloaded from the Games tab. |
| `keep.test.mjs` | Today's path from the one button (the Book of Mormon micro-read and a youth's FSY card included), then the 🎉 screen's Keep going · N more: the day's extras play to “Everything for today is done”; stopped at the first one and opened again, Today's ▶ Keep going goes on to the end. |
| `offline.test.mjs` | The app opened once with a connection, then with no Wi-Fi: it opens, Today's study runs with the chapter, coming back to it offline doesn't reload it (the app's self-update finds the same page), a family device starts with no errors, and the live app and the test site (one address on github.io) keep separate copies (`sw.js`). |
| `family.test.mjs` | On the Firebase emulators with `firestore.rules`: Dad (Google) starts a family, Sam joins on a phone and a Kindle; the rules refuse 8 things a child mustn't do; both devices agree after a study; a save on the Kindle doesn't restart the phone in the middle of Be still; chat, a prize and a finished goal (1,000 XP, paid once) go end to end. |

## Running them

```
cd tests
npm install                 # once: Playwright, the Firebase SDK, the Firebase tools
npx playwright install chromium
node run.mjs                # smoke, dates, merge, week, sunday, talks, keep, coach, growth, pro, reader, questions and offline (about 10 minutes)
node run.mjs week           # one test
npm run test:family         # the family and games tests, under the emulators (needs Java 11 or later)
```

The repo is served at `http://127.0.0.1:8131/` (`TEST_PORT` changes it). The
family test opens it as `http://localhost:8131/TreasureUp-test/`, where the
app uses the test project's Firebase settings, pointed at the emulators
(`firebase.json` at the repo root). A device's clock is set by `fakeNow` in
its storage; `window.__skip(ms)` moves it on (Be still's minutes).

Every pull request runs all of them (`.github/workflows/tests.yml`); the deploy
runs `node run.mjs` (smoke, dates, merge, week, sunday, talks, keep, coach, growth, pro, reader, questions and offline) after building the chapters (`pages.yml`).

Some checks read the chapters, which only the deploy builds
(`tools/build-reading.mjs` writes `content/reading.js` and `content/library.js`,
not kept in git): the reading-ahead check, the half-read chapter from the
Scriptures tab, and the chapter in Today's study offline. Without
the built chapters, as on a pull request, they print a NOTE and are skipped;
the deploy runs them before anything goes live.
