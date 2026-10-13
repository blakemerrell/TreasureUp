# TreasureUp Project Notes

## How to Run & Verify

### Running the App
TreasureUp is a vanilla HTML/JS/CSS offline-first web application.
- Open `index.html` directly in a browser, or run a local static server:
  ```bash
  python -m http.server 8000
  ```
- Browse to `http://localhost:8000/index.html`.

### Verification Suite
- **Syntax & Parse Check**:
  ```bash
  node tools/check-parse.mjs
  ```
- **Content & Integrity Verification** (checks all weeks, quotes, references, and approval hashes):
  ```bash
  node tools/verify.mjs
  ```
- **RTS Engine & Game Tests**:
  ```bash
  node tools/test-liberty.mjs
  node tools/test-liberty-touch.mjs
  ```

---

## Key Architectural Decisions

1. **Vanilla JS & Offline-First**:
   - Zero framework dependencies.
   - All assets, scripture chapters, and reading cards are local or lazily cached for offline operation.

2. **Per-Device vs. Family Sync State**:
   - Family sync (`mergeProgress`) handles shared study progress (XP, streaks, history, impressions, marks).
   - Local device UI settings that should not bleed across users (such as `preferredTrans`) are stored strictly in `localStorage` under `NS + 'trans'` and excised from `mergeProgress`.

3. **Come Follow Me Lesson Chunking**:
   - Long scripture passages are broken into 2–4 bite-sized cards per guide section.
   - Constraints: 2 to 4 lines per card, max 30 words per line, max 25 words for reflection asks.
   - Quotes must match the KJV source verbatim with parenthetical citations immediately adjacent to the closing quotation mark so `tools/verify.mjs` validates them.
   - Section integrity is verified via canonical FNV-1a approval hashes.

4. **Media Scoping**:
   - Embedded videos and lesson media in `CFM_MEDIA` are scoped by `${week.dates}:${sectionId}` to prevent media leaking into other weeks sharing the same section anchor.

5. **Title of Liberty RTS Engine (`liberty/`)**:
   - Isometric canvas rendering with touch grammar (Red Alert 2 touch model).
   - Any modified game asset requires incrementing the `?v=` cache buster in `liberty/index.html`.

---

## Current Status (October 2026)
- **Active Branch**: `gemini/cfm-lesson-fixes`
- **Latest Work**:
  - Implemented 3-way scripture translation toggle (`Plain English`, `KJV`, `BSB`) with single-flight network retry and fallback protection.
  - Chunked and verified Week 42 (October 12–18, 2026) family lesson cards with interactive activities.
  - Fully green on `tools/check-parse.mjs` and `tools/verify.mjs`.
