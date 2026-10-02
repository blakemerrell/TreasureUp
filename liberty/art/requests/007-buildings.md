# 007 · The buildings: the hall of the captains, the granary and the stables

**Status: open.** 3 pictures.

## What it's for

In free battle you build ten kinds of building. Three of them have no picture
of their own:

- The **hall of the captains** borrows the barracks' picture.
- The **granary** and the **stables** both borrow the storehouse's.

So a base with all of them looks like two barracks and three storehouses. On
the map a building is drawn as wide as the ground it stands on, so each needs
a shape and a colour that read at a glance:

- the granary: about 128 pixels across (2 × 2 squares, like the storehouse);
- the stables: about 160 pixels across (3 squares long, 2 deep);
- the hall: about 192 pixels across (3 × 3 squares, like the barracks).

## What the verses say

- **Granary:** the Nephites "reserved for themselves provisions" for seven
  years (3 Nephi 4:4). In the game it holds 500 more grain and timber.
- **Stables:** they had "horses, and their chariots" (3 Nephi 3:22). In the
  game it trains horse carts that haul three times as much.
- **Hall of the captains:** where the chief captains plan the war; it trains
  javelin throwers and stripling warriors. The verses don't describe it. The
  game says, as history: "its stepped platform is like those built in ancient
  Mesoamerica."

## The pictures

Draw each at the game's isometric angle, seen from above at the front
corner, like `storehouse.png` and `barracks.png`. Its ground is a diamond:
twice as wide as it is tall, with the front corner at the bottom centre. Edit
the named picture rather than drawing from scratch, so the angle, light from
the upper left and painted look match.

1. **`granary.png`, the granary.** Start from `liberty/assets/storehouse.png`
   (same 2 × 2 square base). On a low stone platform, **two tall rounded clay
   granaries**, shaped like big jars, each with a pointed thatched cap and a
   small square door high up. Add a wooden ladder and a few baskets of yellow
   maize at the foot. The clay jars are what read at 128 pixels: orange-brown
   rounded shapes, unlike the storehouse's white walls and the farm's low
   round huts. (This is history, not the verse: granaries like these held
   maize in ancient Mexico.)
2. **`stables.png`, the stables.** Start from `liberty/assets/storehouse.png`.
   The base is **3 squares long and 2 deep**: the longer side faces the
   viewer's **lower left**, the shorter side the lower right. A long, low
   timber stable, open along the front, under a thatched roof, with **two or
   three horses** in their stalls looking out, and a two-wheeled wooden cart
   beside it. The horses are what read at 160 pixels. Brown and chestnut
   horses, gentle and calm.
3. **`hall.png`, the hall of the captains.** Start from
   `liberty/assets/barracks.png` (same 3 × 3 square base). A **broad stepped
   stone platform**, two or three low wide steps with a wide stair up the
   front, and on top a long hall with a row of square pillars along the front
   and a flat roof with **gold-yellow trim**. Make it pale cream stone, so it
   doesn't look like Zarahemla's tall red pyramid (`stronghold.png`), and
   grander than the plain white barracks. No flags or banners: the game adds
   a waving gold banner.

## Style notes

Painted and realistic, like `storehouse.png` and `barracks.png`, with soft
shading and light from the upper left. One whole building per picture, with a
little magenta all round. Flat magenta (#FF00FF) background, no ground under
the building, no cast shadow, no people (see GEMINI.md).

## What "done" looks like

At normal zoom, in a base with a storehouse, a barracks, a farm and
Zarahemla, you can tell at a glance:

- the granary by its clay jars;
- the stables by their horses;
- the hall by its stepped platform and pillars.

Each sits on its ground at the game's angle.
