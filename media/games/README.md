# Game start pictures

The pictures at the top of each game's start screen (Blake, 2026-10-04:
"better start screens with art. Like we have with snake"). Painted by Gemini
(`gemini-3.1-flash-image-preview`) through Blake's n8n workflow **Title of
Liberty — Gemini Art (backup)**, the same way as Wilderness Snake's and Look and
Live's (`arcade/README.md`): each is an edit of a Title of Liberty picture
(`liberty/assets/`), so they share its painted style. Each picture is billed to
the Gemini API key. Ten were drawn for these seven (three tried twice).

Each is 960 × 480, cropped to 2:1 from Gemini's 1456 × 720 JPEG (inside any
white edge Gemini left), JPEG quality 82.

| File | Game | What it shows | Drawn from |
|---|---|---|---|
| `puzzle.jpg` | Weekly puzzle | a grandfather, a boy and his little sister sort clay tablets and scroll pieces into four baskets tied with yellow, green, blue and purple ribbons | `granary.png` |
| `sayings.jpg` | Who said it? | Isaiah speaks on the steps of a gate of Jerusalem to a king, a shepherd, a mother and child, a merchant and a boy | `pavilion.png` |
| `word.jpg` | Verse Word | an old scribe writes on a scroll by lamplight while a boy leans in to watch | `hall.png` (second try: the first had them shirtless) |
| `climb.jpg` | Scripture Climb | families climb a winding path up the mountain to a shining temple (Isaiah 2:2–3) | `temple.png` (second try: the first left the sky white) |
| `live.jpg` | Live game | a family in a lamp-lit courtyard at night, every one raising a hand to answer | `granary.png` (second try: the first, from `muster.png`, kept its spears and war banner) |
| `board.jpg` | Scripture Showdown | game night under lanterns: the mother points to a tile on a big painted board while the family cheers | `stables.png` |
| `babylon.jpg` | Babylon Falls | by night, Cyrus's soldiers walk through Babylon's open bronze gates beside the lowered river (Isaiah 45:1) | `stronghold.png` |

## The prompts

Each began "Turn this game picture into a wide 2:1 storybook scene, in the same
hand-painted game-art style: warm rich colors, soft painted shading, friendly
characters, seen in 3/4 view from slightly above", then the scene above in a few
sentences, and ended "suitable for children. No text, no letters, no logos."
The retries added: "fully dressed in a long brown wool robe … a blue knee-length
tunic with long sleeves"; "No weapons, no spears, no banners, no drums"; and
"fills the whole frame edge to edge … no white or empty background anywhere".

The words on each start screen (a line of scripture, and how to play) are in
`GAME_START` in `index.html`; each scripture line is the KJV's words.
