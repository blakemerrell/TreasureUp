# TreasureUp — Home PC Handoff & Phase 1–3 Roadmap (2026-10-17)

## ✅ Phase 1: Completed & Merged to `main` (PR #169, commit `ae3976f`)
All Phase 1 items are live on `main` and verified across all 261 Playwright tests:
1. **Core Daily Walk Progress & Celebration Banner (`pathDayHtml`)**:
   - Shows the `.core-walk-banner` progress bar (`n/total steps`) on Today and turns into a guilt-free **"🎉 Today’s Core Walk Complete!"** banner once the core path is finished, leaving **Go Further** below as optional bonus explorer XP.
2. **Swipeable Horizontal Story Decks (`openCard`, `creamItemsOf`, `creamPlayerHtml`)**:
   - Upgraded insight cards (`openCard`) into multi-slide horizontal CSS scroll-snap Story Decks (`.ins-deck-track`) with `1. Hook & Verse` (with Plain/KJV toggle), `2. Deep Dive` (real scholar `deep.paras` + timestamped video clips), and `3. Sources & Takeaway` (with 1-tap **`✍️ Save Takeaway to My Notes`**).
   - Replaced generic boilerplate in `creamPlayerHtml` with real scholar `deep.paras`, timestamped video clips, and Hebrew word roots/audio.
3. **Clean, Non-Redundant Scripture Chapter Notes (`openInsNote` & `versesHtml`)**:
   - Deduplicated `plain.notes` on verses already covered by a rich `margin` or `jsp` note, and removed the repeated KJV verse block and duplicate *"In a sentence:"* summary inside `openInsNote`.
4. **Updated 9-Tier Rewards Shop (`STARTER_PRIZES` & `shopHtml`)**:
   - Removed screen-time and movie prizes and replaced them with the 9-tier lineup (`treat` 1,200 XP, `chore` 1,500 XP, `coldstone` 2,500 XP, `pizza` 3,000 XP, `credits` 4,500 XP, `cash5` 5,000 XP, `restaurant` 7,500 XP, `game10` 9,000 XP, `party` 12,000 XP) grouped into **Weekly Favorites**, **Mid-Tier Rewards**, and **Epic Milestone Rewards**.

---

## 🚀 Phase 2: Best Self / Values Card Sort & Youth Quest Board (Next Up)
 Interactive prototypes and implementation plans are saved in `docs/handoff/` on this branch:
- `docs/handoff/best_self_and_values_deck_implementation_plan.md` — Full architecture & `mergeProgress` sync plan.
- `docs/handoff/new_user_best_self_onboarding_mockup.html` — Interactive 36-Card Values Sort (Miller et al. funnel: *Very Important / Somewhat / Not Important* → Top 5 → The ONE Anchor Value) + CliftonStrengths / Buckingham SIGN Finder + Hesed/Agape Covenant Anchor (`"God's love isn't a scoreboard — He is already in your corner. Your daily practice is how you team up with Him to grow."`).
- `docs/handoff/javan_retro_quest_mockup.html` — Retro RPG Youth Quest Board for the `🌱 Season` tab (4 Luke 2:52 stat bars: Spiritual, Social, Physical, Intellectual; 3-step Boss Quests; Weekly Calibration).

---

## 🎬 Phase 3: Family Social Feed ("Family Gram") & Google Veo Cartoon Hub
Planned architecture for the ad-free, algorithm-free family media & social space:
1. **Top Shelf — "Family TV & Cartoons" (Home YouTube)**:
   - Horizontal episode shelf featuring **✨ Our Family Cartoons (Made with Google Veo)** alongside this week's curated *Come, Follow Me* videos (*Latter Day Kids*, *Scripture Central*, *BibleProject*, *followHIM* timestamps).
   - Respects the repo's 5 MB file rule by supporting Unlisted YouTube / cloud links with custom start/end timestamps or lightweight `<3 MB` `.webp`/`.webm` loops.
2. **Main Feed — "Family Gram" Visual Scripture Cards & Reels**:
   - Square (`1:1`) and portrait (`4:5`) swipeable visual scripture/quote cards with artwork, Plain English verse slide, and 1-tap family reactions (`❤️ Love`, `🔥 Fire`, `🙏 Amen`, `⭐ Save`) synced via `families/{fid}` in Firestore.
   - **1-Tap "Turn into a Family Card"** button from Morning Gratitude, Evening Return & Report, or any highlighted verse in the scripture reader.
