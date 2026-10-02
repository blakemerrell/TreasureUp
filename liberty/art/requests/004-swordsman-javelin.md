# 004 · The Nephite swordsman and javelin thrower

**Status: done.** Both (pull request #55) are in the game:
`liberty/assets/swordsman.png` and `javelin.png`, with their Train buttons
`cameo_swordsman.png` (barracks) and `cameo_javelin.png` (hall of the
captains). Every Nephite soldier now has his own picture.

## What it's for

The last two Nephite soldiers still drawn with the spearman's picture.
**Swordsmen** (trained once there's an armory) fight up close and beat
slingers and archers. **Javelin throwers** (from the hall of the captains)
throw from a short way off and beat armored captains. On the map each is about
44 pixels tall, standing next to spearmen, slingers, archers and workers, so
each needs one thing that reads at a glance.

## What the verses say

Moroni's "people were armed with swords, and with cimeters" (Alma 43:18), and
he "prepared his people with breastplates and with arm-shields, yea, and also
shields to defend their heads, and also they were dressed with thick
clothing" (Alma 43:19). The Nephites made "the dart, and the javelin"
(Jarom 1:8).

## The pictures

Start from `liberty/assets/spearman.png` for both (edit it, don't draw from
scratch), so they keep its size, viewing angle, light from the upper left and
painted look, and his blue. **Turn both toward the viewer's left**, like the
spearman: every unit faces left, and the game flips them as they walk.

1. **`swordsman.png`, the swordsman.** A plain rounded bronze cap (no crest:
   the crest is the spearman's), a brown leather breastplate over the blue
   tunic, leather arm-shields on both forearms. A straight sword **raised high
   in his right hand**, ready to strike, and no big round shield. The raised
   sword is what reads at 44 pixels.
2. **`javelin.png`, the javelin thrower.** Thick quilted cotton armor, pale
   cream, over the blue tunic (the "thick clothing"), a blue headband, no
   helmet. One javelin **drawn back over his shoulder, ready to throw**, and a
   bundle of javelins on his back. The javelin over his shoulder is what reads
   at 44 pixels. (A spear-thrower in his hand is fine: ancient Americans used
   one, called an atlatl; that is history, not the verse.)

Keep both clearly different from the spearman (crested helmet, round shield,
spear held upright), the archer (bow), the slinger (cap and sling) and the
worker (pale tunic, axe).

## Style notes

Round 2's soft painted shading and thin outlines, like `spearman.png` and your
round-3 archer; not round 1's heavy outlines. Flat magenta (#FF00FF)
background, one figure each, nothing cropped, feet fully in the frame (see
GEMINI.md).

## What "done" looks like

At 44 pixels tall, in a row with the spearman, slinger, archer and worker, you
can pick out the swordsman by his raised sword and the javelin thrower by the
javelin over his shoulder, and both face left.

## What came back

Two clean pictures in round 2's soft painted style. The swordsman faces left
with his sword raised. The javelin thrower came back throwing toward the
viewer's right, so Claude mirrored him to face left like every other unit; his
darts are fletched, like the darts ancient Americans threw with an atlatl. At
normal zoom his javelin shaft is too thin to see, so what tells him apart is
the pale quilted vest and the wide throwing stance. Each is cut out, cropped
to the figure, scaled to 150 pixels tall and set by its feet.
