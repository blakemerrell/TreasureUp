# 010 · The horse cart: a driver, a picture per load, and loading

**Status: done.** Five pictures made with Gemini through Blake's n8n backup,
5 billed to the Merit3D Gemini account, all usable on the first try.

## What it's for

After the Red Alert rules (pull request #68) the carts are the harvesters:
they find a field or a forest on their own, fill up and haul the load home.
Blake, after a round on his Pixel, asked for new cart art, with a driver who
"drives the cart and gets out and gathers". The old `cart.png` was a small
horse and hay cart with nobody on it, and it looked the same empty or full.

## The pictures

All five are the same brown horse and two-wheeled railed cart, going toward
the viewer's lower left, light from the upper left, with a Nephite driver in
a cream tunic and blue sash. The first was edited from the old `cart.png`;
the other four were edited from the first (pushed to the branch as a padded
magenta PNG under `liberty/art/incoming/`, which the n8n workflow fetches,
and removed again before the pull request).

- **`cart.png`**: the driver on the front board with the reins, the bed
  empty. Also the Build button (`cameo_cart.png`).
- **`cart_grain.png`**: the bed heaped with sheaves of grain and baskets of
  yellow maize.
- **`cart_timber.png`**: a roped stack of cut logs and split timbers.
- **`cart_stone.png`**: grey-white quarried limestone blocks and rubble, for
  the stone that comes next.
- **`cart_loading.png`**: the cart standing, the driver on the ground at the
  back lifting a sack into the bed. Shown while a cart is working at a field,
  forest or (later) rock face.

Gemini returned the four edits at 1257 × 832 for a 1420 × 940 reference, so
they are scaled by 1420 ⁄ 1257 more than the first to keep the cart one size.
All are kept at three times their size on screen (about 180 px wide) and the
game draws them at a third, anchored at the bottom centre. On screen the cart
is now about 60 px long, up from 47, a little under a horse-and-cart's real
length next to a 40 px worker.

## In the game

`drawUnit` picks the picture: the loading pose while the cart's gather order
is in its `work` phase, else the laden picture that matches what it carries,
else the empty cart. If a picture hasn't loaded yet it falls back to the
empty cart.
