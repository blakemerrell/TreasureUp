# 006 · The Lamanites: slinger, captain and Zerahemnah, and Helaman

**Status: done.** All four (pull request #57) were made with Gemini through
Blake's n8n backup, since Gemini in Antigravity hadn't answered after an
hour. In the game: `liberty/assets/lamanite_slinger.png` (the Lamanite
slinger), `lamanite_captain.png` (the Amalekite and Zoramite captains) and
`zerahemnah.png`. `helaman.png` is ready for the war chapters.

## What it's for

Every Lamanite in the game is drawn with one picture (`lamanite.png`): the
warriors, the slingers, the Amalekite and Zoramite captains and Zerahemnah
himself. In the Moroni mission and in free battle you can't tell a slinger
from a captain, or find Zerahemnah in the crowd. On the map each is about
44 pixels tall (Zerahemnah 48), so each needs one thing that reads at a
glance. The warrior keeps `lamanite.png`.

## What the verses say

"A man by the name of Zerahemnah was their leader" (Alma 43:5). "Zerahemnah
appointed chief captains over the Lamanites, and they were all Amalekites and
Zoramites" (Alma 43:6). "They had only their swords and their cimeters, their
bows and their arrows, their stones and their slings; and they were naked,
save it were a skin which was girded about their loins; yea, all were naked,
save it were the Zoramites and the Amalekites" (Alma 43:20). "But they were
not armed with breastplates, nor shields" (Alma 43:21).

So: warriors and slingers bare but for the skin; captains and Zerahemnah
**clothed but not armored**: no breastplate, no shield, no metal helmet.

## The pictures

Start from `liberty/assets/lamanite.png` for all three (edit it, don't draw
from scratch), so they keep his size, viewing angle, light from the upper
left and painted look. **Turn each toward the viewer's left, like him.**

1. **`lamanite_slinger.png`, the slinger.** The Lamanite warrior as he is
   (bare, a skin about the loins, red and brown paint, feathers), but with a
   **sling** swinging out from his hand and a bag of stones at his hip
   instead of the club.
2. **`lamanite_captain.png`, a captain** (used for both the Amalekite and
   the Zoramite captains). Clothed: a knee-length **dark red tunic** with a
   leather belt and a short dark red cloak, a band of feathers on his brow, a
   curved sword (a cimeter). No breastplate, no shield, no metal. The dark
   red clothing is what reads at 44 pixels, among bare warriors.
3. **`zerahemnah.png`, Zerahemnah.** The leader, grander than his captains:
   a tall **crest of feathers**, a long dark red cloak, gold armbands and a
   gold collar, a large cimeter. Still no breastplate or shield. Commanding,
   not scary for a child.

Keep them apart from the Gadianton robbers (shaved heads with head-plates,
white lamb-skins) and the robber chief (bronze breastplate, dark cloak): the
Lamanites have **feathers and hair**, no metal armor.

## And Helaman (carried over from 005)

4. **`helaman.png`, Helaman**, as `liberty/art/requests/005-heroes.md`
   describes: a grown man in **gold** armor like `stripling.png`'s (gold
   breastplate, round gold shield, white tunic), a short **green** cloak, his
   sword raised to lead his young soldiers forward, facing left. Start from
   `liberty/assets/moroni.png` for him, as 005 says. He isn't in a mission
   yet; his picture will be ready for the war chapters.

## Style notes

Soft painted shading and thin outlines, like `lamanite.png` and your round-5
Lehi. Flat magenta (#FF00FF) background, one figure each, nothing cropped,
feet fully in the frame (see GEMINI.md). Check each faces the viewer's left
before you reply.

## What "done" looks like

At 44 pixels tall, next to a Lamanite warrior and a robber, you can pick out
the slinger (sling), the captain (dark red clothes) and Zerahemnah (feather
crest, long red cloak, gold), and all face left.

## What came back

Four clean pictures, all facing left. The two from `lamanite.png` (slinger,
captain) came back in its pixel-painted look; Zerahemnah and Helaman in a
softer painted style. Gemini through n8n sends JPEGs, and Zerahemnah's
background was a lighter magenta (250, 48, 251), so the cut-out now measures
each picture's own background before removing it. Each is cropped to the
figure, scaled to 150 pixels tall and set by its feet.
