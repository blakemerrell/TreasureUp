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
| `coach.test.mjs` | Try my own: off at first; turned on in the Parent hub, a Bible chapter opens it with each verse's KJV, its Hebrew word by word and a box; the hints (a name left out, KJV English, a verse much shorter); Save keeps it on the device and out of his progress, through a reload; the chapter marked, Show mine under the verses; a chapter whose words don't load still opens; off again, the reader exactly as before. With its own chapters, so it needs no build. |
| `merge.test.mjs` | Two devices' copies merged by the app's own `mergeProgress`: Be still's minutes add up, the warm-up and Scripture Climb pay once, freezes count once, settings changed on either are kept, two years' week 39 both stay; then start-up files a week once and trims old things. |
| `pro.test.mjs` | Pro Mode in the Season notebook: ✨ Pro on, roles and a mission, a year goal and a 90-day goal, Sunday's plan for next week (rocks on days, one moved), Monday's top 3 from the plan and typed, ticked there and on Today, the month's review; Simple again is the notebook exactly as before, Pro again keeps it all; two devices' Pro data merged by `mergeProgress`. |
| `games.test.mjs` | On the emulators: a live game on a TV and two phones (a phone that reloads is back in and still locked in, the answer and scores are written as one so a TV reload can't count a question twice, Play again doesn't wait on someone who left, an old game's code is refused) and Babylon Falls' map reloaded from the Games tab. |
| `family.test.mjs` | On the Firebase emulators with `firestore.rules`: Dad (Google) starts a family, Sam joins on a phone and a Kindle; the rules refuse 8 things a child mustn't do; both devices agree after a study; a save on the Kindle doesn't restart the phone in the middle of Be still; chat, a prize and a finished goal (1,000 XP, paid once) go end to end. |

## Running them

```
cd tests
npm install                 # once: Playwright, the Firebase SDK, the Firebase tools
npx playwright install chromium
node run.mjs                # smoke, dates, merge, week, coach and pro (about 3 minutes)
node run.mjs week           # one test
npm run test:family         # the family and games tests, under the emulators (needs Java 11 or later)
```

The repo is served at `http://127.0.0.1:8131/` (`TEST_PORT` changes it). The
family test opens it as `http://localhost:8131/TreasureUp-test/`, where the
app uses the test project's Firebase settings, pointed at the emulators
(`firebase.json` at the repo root). A device's clock is set by `fakeNow` in
its storage; `window.__skip(ms)` moves it on (Be still's minutes).

Every pull request runs all of them (`.github/workflows/tests.yml`); the deploy
runs `node run.mjs` (smoke, dates, merge, week, coach and pro) after building the chapters (`pages.yml`).

Two checks read the Scriptures tab's books, which only the deploy builds
(`tools/build-reading.mjs` writes `content/library.js`, not kept in git): the
reading-ahead check and the half-read chapter from the Scriptures tab. Without
the built chapters, as on a pull request, they print a NOTE and are skipped;
the deploy runs them before anything goes live.
