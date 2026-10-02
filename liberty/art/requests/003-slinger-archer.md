# 003 · The Nephite slinger and archer

**Status: done.** Both (pull request #54) are in the game:
`liberty/assets/nslinger.png` (named for the game's Nephite slinger, apart
from the Lamanite slinger) and `archer.png`, with their Train buttons
`cameo_nslinger.png` and `cameo_archer.png`.

## What it's for

The barracks trains slingers and archers, and both are drawn today with the
spearman's picture, so you can't tell your shooters from your spearmen. They
fight differently (they shoot from behind the walls and are strong against men
without armor), so the player needs to spot them at a glance. On the map each
is about 44 pixels tall, standing next to spearmen, workers and the enemy.

## What the verse says

The Nephites "did arm themselves with swords, and with cimeters, and with
bows, and with arrows, and with stones, and with slings" (Alma 2:12).

## The pictures

Start from `liberty/assets/spearman.png` for both (edit it, don't draw from
scratch), so they keep its size, pose, viewing angle (three quarters, turned
toward the viewer's left), light from the upper left and painted look. They
are Nephites like him, in his blue, but they wear **no armor** (no bronze
helmet, no breastplate, no shield): they are light troops.

1. **`slinger.png`, the slinger.** A blue knee-length tunic with a leather
   belt, a simple leather cap, sandals. A sling in his right hand, its cord
   swinging out to the side with a stone in the pouch, and a small bag of
   stones at his hip. The swinging sling is what should read at 44 pixels.
2. **`archer.png`, the archer.** A blue tunic under a plain leather jerkin, a
   blue headband, sandals. A long bow held out in front, and a quiver of
   arrows on his back. The bow is what should read at 44 pixels.

Keep both clearly different from the worker (`worker.png`: pale undyed tunic
and an axe) and from the spearman (bronze helmet, round shield, spear).

## Style notes

Round 2 was just right: soft painted shading and thin outlines, like
`lamanite.png` and `spearman.png`. Flat magenta (#FF00FF) background, one
figure each, nothing cropped, feet fully in the frame (see GEMINI.md).

## What "done" looks like

At 44 pixels tall, standing in a row with a spearman, a worker and a
Lamanite, you can tell which one carries the sling and which the bow, and
neither looks like a spearman or a worker.

## What came back

Two clean pictures. The archer is in round 2's soft painted style; the slinger
came back closer to round 1's heavier outlines, which doesn't show at 44
pixels. The archer was turned to face the viewer's right, so Claude mirrored
him to face left like every other unit (the game flips them as they walk).
The slinger's sling hangs from his hand rather than swinging out; it still
reads as a sling loop at game size. Each is cut out, cropped to the figure,
scaled to 150 pixels tall and set by its feet.
