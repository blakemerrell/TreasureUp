# Arcade pictures

The pictures in Wilderness Snake (`snake.js`) and Look and Live (`looklive.js`).
Blake asked for better art on 2026-10-04, drawn with "your bin tools" (the n8n
workflow that drew Title of Liberty's pictures). They were painted by Gemini (`gemini-3.1-flash-image-preview`) through Blake's n8n
workflow **Title of Liberty — Gemini Art (backup)**. Each one is an edit of a
Title of Liberty picture (`liberty/assets/`), so the arcade matches its painted
style. Each picture is billed to the Gemini API key.

Until a picture loads, each game draws its old shape in its place, so a missing
file never breaks a game.

| File | What it is | Size | Drawn from |
|---|---|---|---|
| `moses.png` | Moses holding the pole with the serpent of brass wound up it (Numbers 21:8–9) | 129 × 220 | `gidgiddoni.png` |
| `tent.png` | a goat-hair tent of Israel, its flap open | 280 × 185 | `warcamp.png` |
| `israelite.png` | you, in Look and Live: an Israelite in a tunic, blue sash and head cloth | 68 × 160 | `worker.png` |
| `manna.png`, `quail.png`, `jar.png`, `rock.png`, `brass.png` | Snake's manna, quail, answer jar (its letter is drawn on it), rock, and the brass serpent to pick up | up to 128 | one picture of all five, from `lamanite_camp.png` |
| `sand.jpg` | the desert floor, a 512 px tile that repeats without a seam | 512 × 512 | `grass_seamless.png` |
| `look.jpg`, `snake.jpg` | the menu pictures: Moses lifting up the serpent over the camp; the camp gathering manna at sunrise | 960 × 480 | `warcamp.png` |

## How they were made

1. **Draw.** Run the workflow from the n8n tools (`execute_workflow`, its
   webhook trigger) with the header `x-art-key` and the body
   `{prompt, reference_path: "liberty/assets/<file>.png", ref: "main"}`.
   This sandbox can't reach the webhook itself, so the picture comes back
   through the run's data: the "Picture as Text" node's `png_base64`. Gemini
   sends a JPEG.
2. **Cut out.** Every sprite was drawn "on a flat, plain magenta (#FF00FF)
   background, nothing cut off at any edge, no text".
   - The magenta is keyed out. A soft edge blended with magenta is un-blended, so no pink fringe is left.
   - Each sprite is cropped to the figure and scaled.
   - The five items were split apart at the empty columns between them.
   - The tent's doorway shadow came back purple and was turned warm brown.
3. **Sand.** The tile is blended with itself shifted half a tile, so its edges meet. Its grass tufts were painted out, since they made a visible grid when repeated.
4. **Menu pictures.**
   - Both are cropped to 2:1.
   - Snake's crop starts below the sky, which cuts out a carved totem pole Gemini put in the distance.

## The prompts

Each prompt begins "Turn this game sprite / picture into …" and asks for the same painted game-art style, the same 3/4 view from slightly above, and the same light as the reference.

- **Moses:** an old man with a long white beard, in a plain off-white wool robe with a brown mantle over one shoulder, and sandals. In one hand, in place of the staff, a tall wooden pole with a short crossbar near its top, and a serpent of shining brass wound around it in three turns, its head raised above the crossbar.
- **Tent:** a low, wide desert tent of dark brown and black woven goat-hair cloth with a few faint lighter stripes, on wooden poles with ropes to pegs. The front flap is open, showing a rug and a clay jar. No fence, no people.
- **Israelite:** a boy of about twelve in a knee-length undyed linen tunic with a blue sash, a striped head cloth held on with a cord, and sandals. Hands empty, walking.
- **Items:** five separate items in one row with wide gaps between them:
  - a small heap of manna, "small round white flakes like coriander seed"
  - a plump brown speckled quail
  - a round clay water jar with a cream band
  - a weathered reddish sandstone boulder
  - a small serpent of shining brass coiled up a short pole with a crossbar
- **Sand:** desert sand from the wilderness of Sinai, straight top-down, with soft low wind ripples and a few tiny pebbles. No large features, so it repeats without seams.
- **Look and Live menu:** the camp of Israel at golden late afternoon. Moses holds up the pole with the serpent of brass, and the people, men, women and children, turn and look. One who was bitten is helped up. A few fiery serpents are at the edges. "Hopeful, not frightening, suitable for children."
- **Wilderness Snake menu:** the camp at sunrise, with manna lying like frost. Families gather it into baskets, a boy holds up a handful, quail flutter low, and a friendly green-and-gold snake winds toward a heap of manna. "Joyful and bright."

## Ammon at Sebus (`ammon.js`, `arcade/ammon/`)

Blake asked for it on 2026-10-04 ("Street fighter style game. Ammon against the
robbers. Protect the sheep."). Drawn the same way, through the same workflow, as
side-view sprite sheets on magenta, then cut out by a script that keys out the
magenta, un-blends the fringe and finds each figure as its own piece. Each
character's poses are scaled together (so a raised sword stands taller than the
body), and `SPR` in `ammon.js` holds each picture's size, the middle of its torso
and the line of its feet, so poses swap without the figure jumping.

| File | What it is | Drawn from |
|---|---|---|
| `ammon-ready`, `-walk1`, `-walk2`, `-strike`, `-sling`, `-block` | Ammon in a blue tunic with a short bronze sword and a sling (Alma 17:36–37), side view; a second sheet: the first had a shepherd's staff, but the scripture says sword | `nslinger.png` |
| `robber-walk`, `-attack`, `-hit`, `-flee` | a robber with a club: walking, swinging, knocked back, running off without it | `robber.png` |
| `chief-ready`, `-charge`, `-smash`, `-flee` | the robbers' leader, in bronze breastplate and crested helmet, with a big club | `robber_chief.png` |
| `sheep-graze`, `sheep-run`, `stone`, `pouch` | a grazing sheep (faces left), a running sheep (faces right), a sling stone, a pouch of stones | `farm.png` |
| `sebus.jpg` | the waters of Sebus: a pool with reeds, a flat field across the bottom, hills and palms, late afternoon, empty | `farm.png` |
| `../ammon.jpg` | the menu picture: Ammon with his sling before the flock, the robbers running, the king's servants watching | `robbers_camp.png` |

Seven pictures were drawn for it (Ammon twice). The menu picture shows a staff as well as the sling;
the game itself follows the scripture's sword.
