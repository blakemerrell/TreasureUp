# 014 · The King-men's camp: a bearer and six tents

**Status: waiting.** The code draws the tents by hand (the same flat hide
tents the camps had before 009) and the bearer with the warrior's picture
until these are made. Seven pictures through Blake's n8n backup, each billed
to the Merit3D Gemini account; the session that wrote this could not read the
request key, so Blake says when to run them.

## What it's for

In free battle the Lamanite war camp now lives by the player's rules
(`liberty/camp.js`, after `liberty/design/evolution.md`): bearers haul grain
and timber, raise tents round the camp in order, and the army trains from
the tents. Each tent is a real building the player can burn, so each needs
to be told apart at a glance, in the style of `lamanite_camp.png` and
`warcamp.png` (hide tents, lashed poles, feathers, racks, the same angle and
light), drawn on magenta.

## The pictures

- **`bearer.png`** (a unit, like `lamanite.png`): a Lamanite camp servant,
  bare-chested, a loincloth of skins, no weapon, bent a little under a big
  bundle of provisions on his back held by a strap across his forehead; his
  face turned to the viewer. Facing right, as the units do.
- **`tents.png`** (2 × 2): two small hide tents side by side with a cooking
  fire and a drying rack between them: the warriors' families. "They pitched
  their tents round about" (Mosiah 2:6).
- **`storetent.png`** (2 × 2): one long low hide tent with its front open,
  showing baskets of grain and stacked timber inside, with sacks and jars at
  the door. "New supplies of provisions" (Alma 55:34).
- **`muster.png`** (3 × 3): a trodden ground ringed with spears stuck in the
  earth and a tall pole with feathers and a painted hide banner; a rack of
  slings and bows; a war drum. No tent.
- **`shieldtent.png`** (2 × 2): a workshop tent with its side rolled up: a
  hide stretched on a frame, round shields leaning on a rack, a breastplate
  of copper on a stand, tools. "Shields, and with breastplates" (Alma 49:6).
- **`ladderworks.png`** (2 × 2): a pile of trimmed poles, two lashed ladders
  leaning against a frame, coils of cord, a man-sized sawhorse. No tent.
- **`pavilion.png`** (3 × 3): a tall painted chieftain's tent with a feathered
  crest, a canopy over its door, two spears crossed at the entrance and a
  captain's shield hung on each side: the chief captain's pavilion
  (Alma 43:6).

## Prompt, for each

> A game building for an isometric strategy game set in the Book of Mormon,
> seen from the same angle and with the same light as the reference picture.
> [the description above]. Lamanite, Mesoamerican, hides and lashed poles,
> feathers, warm earth colours. The whole thing on a flat magenta (#FF00FF)
> background, nothing cut off at the edges, no text, no people [except the
> bearer].

Reference: `liberty/assets/lamanite_camp.png` for the tents, the muster
ground and the ladder-works; `liberty/assets/warcamp.png` for the pavilion;
`liberty/assets/lamanite.png` for the bearer.

## Then, in `ui.js`

`SPRITE` anchors for the six (`cx`, `by`, `span` from the cut-out, as for
the hall), and the bearer's size in the unit drawing (`uw`, `uh`, `uox`,
`uoy`), plus a laden pose if Gemini gives one.
