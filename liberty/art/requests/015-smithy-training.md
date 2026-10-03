# 015 · The Freemen's smithy and training ground

**Status: waiting.** Until these are made, the smithy borrows the armory's
picture (on its smaller plot, with a forge glow drawn by code) and the
training ground is drawn by code: posts at its corners, a straw dummy, a
banner. Their tiles in the city's menu wear drawn signs instead of cameos.
Four pictures through Blake's n8n backup (two buildings, two cameos made
from them with `mkcameo.py whole`), billed to the Merit3D Gemini account;
Blake says when to run them.

## What it's for

The Freemen's second tier (`liberty/design/evolution.md`, section 4). The
armory keeps the armor; the **smithy** arms swordsmen and makes swords and
cimeters and bows of fine steel; the **training ground** trains spies and
sends every soldier out a veteran. Both stand among the Nephite buildings,
so they match `armory.png` and `barracks.png`: the same angle and light,
white plastered walls on a low stone footing, thatch and timber, on magenta.

## The pictures

- **`smithy.png`** (2 × 2): a small open-fronted stone workshop under a
  thatched roof held up on timber posts; inside, a clay forge with a glowing
  fire and a bellows, an anvil stone, a water trough; swords, cimeters and a
  steel bow hung on the back wall; a smith at work would be fine but is not
  needed. Smoke from a vent in the roof. Nephi "did make tools of the ore"
  (1 Nephi 17:16).
- **`training.png`** (3 × 2): a trodden earth yard with a low plastered wall
  along the back; a row of straw dummies on posts, a wooden rack of practice
  spears and shields, a target of bound reeds, and a tall pole with the title
  of liberty's cloth on it. No people.

## Prompt, for each

> A game building for an isometric strategy game set in the Book of Mormon,
> seen from the same angle and with the same light as the reference picture.
> [the description above]. Nephite, Mesoamerican, white plaster, stone,
> timber and thatch, warm light. The whole thing on a flat magenta (#FF00FF)
> background, nothing cut off at the edges, no text.

Reference: `liberty/assets/armory.png` for the smithy; `liberty/assets/barracks.png`
for the training ground.

## Then, in `ui.js`

`SPRITE` anchors for both, `CAMEO_MAP` entries `build:smithy` and
`build:training` (and drop their signs from `SIGN`), and the smithy's forge
glow and the drawn ground can go.
