# Implementation Plan: Blake's "Best Self PRO" System

## Goal Description
Implement Blake's personal Adult / Best Self PRO system in TreasureUp:
1. **Fix Custom Interests & Area Tagging**: Resolve the bug where custom interests didn't render or save; add executive defaults (`Business / Building`, `Writing / Creating`, `Financial Stewardship`); allow assigning custom interests to Luke 2:52 areas.
2. **Core Values & StrengthsFinder Engine**: Introduce Blake's Core Values triad (**FAITH**, **ADVENTURE**, **INTEGRITY** with their sub-values) and Gallup CliftonStrengths signature talent picker.
3. **Morning Planning & The ONE Thing**:
   * Grounded, clean tone: *"Here is how your Core Values board actively anchors your daily planning"*.
   * In the spirit of the book *The ONE Thing*: *"The single most important thing that will make everything else easier or better if you get it done today."*
   * Subtle touchstone banner reflecting his Core Values.
4. **Data Persistence**: Ensure all values, strengths, custom interests, and weekly big rocks persist in his profile and private Firestore partition (`journals/{uid}/...`).

---

## Aligned Decisions & Tone Guidelines
* **Grounded Tone**: Avoid overly repetitive or forced spiritual phrases; keep the daily planning crisp, practical, and grounded.
* **The ONE Thing Focusing Question**: *"What is the single most important thing that will make everything else easier or better if you get it done today?"*
* **Core Values Triad**:
  * **FAITH**: Jesus Christ, Kindness, Spiritual, Family, Humility, Ethics, Hope, Friendship.
  * **ADVENTURE**: Awe, Wonder, Fun, Learning, Risk Taking, Independence, Overcome Obstacles.
  * **INTEGRITY**: Honesty, Loyal, Truth, Authentic, Trustworthy, Free of Deception, Open, Leadership, Accountable.
* **Custom Interests**: Add visible chips with `✕` remove buttons; provide 4-quadrant area selector (`Spiritual`, `Physical`, `Intellectual`, `Social`) when creating a custom interest.
* **Adult Default Interests**: Add `💼 Business / Building`, `✍️ Writing / Creating`, `💰 Financial Stewardship`.

---

## Proposed Changes in `index.html`

1. **`DEFAULT_ADULT_INTERESTS`**:
   Add `'Business / Building'`, `'Writing / Creating'`, `'Financial Stewardship'`.
2. **`profileOf()` & Core Values Defaults**:
   Initialize adult profile with `values: ['FAITH', 'ADVENTURE', 'INTEGRITY']` and CliftonStrengths defaults.
3. **`coachWalkthroughSheetHtml()`**:
   * Step 2: Render standard `available` chips + any custom interests with their assigned area icon and `✕` remove button; provide 4-quadrant area selector above `#coachCustomInt`.
   * Step 3: Display Blake's Core Values Triad (**FAITH · ADVENTURE · INTEGRITY**) with expandable sub-values, plus CliftonStrengths theme picker (`Strategic`, `Futuristic`, `Relator`, `Maximizer`, `Achiever`, `Ideation`, `Focus`, etc.).
4. **`coachSuggestedIdeas(area)`**:
   * Add high-leverage suggestions for `Business / Building`, `Writing / Creating`, `Financial Stewardship`.
   * Suggest custom interests in their assigned quadrant in Discover!
5. **`blueprintSheetHtml()` (Morning Planning)**:
   * Header touchstone banner:
     `<div class="bp-values-banner">✨ Living My Core Values: <b>FAITH</b> · <b>ADVENTURE</b> · <b>INTEGRITY</b></div>`
   * Refined prompt in the spirit of *The ONE Thing*:
     *Title*: `🎯 Today’s ONE Thing`
     *Subtitle / Placeholder*: `The single most important thing that will make everything else easier or better if you get it done today…`

---

## Verification Plan
* Run `node tools/check-parse.mjs` (ensure 100% script parse integrity).
* Run `node tools/verify.mjs` (ensure zero test regressions).
* Manual browser testing at `http://localhost:8080/`.
