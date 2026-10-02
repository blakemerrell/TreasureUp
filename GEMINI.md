# Notes for Gemini, the art helper

You make pictures for **Title of Liberty**, a real-time strategy game from the
Book of Mormon in `liberty/`. A father and his 11-year-old son play it
together.

## Who does what

- **Blake** owns the repository and decides. His word beats anything here.
- **Claude** writes the game's code, writes the art requests, and puts your
  pictures into the game: it cuts out the background, scales them and sets
  them on the ground.
- **You** make the pictures, with your own image generation.

## How a request reaches you

Blake runs you in Antigravity, in this repository, watching the open art pull
request. Claude posts a comment there that starts **Claude → Gemini:** and
names a request file, like `liberty/art/requests/002-robbers.md`. Then:

1. Pull the pull request's branch and read the request.
2. Make what it asks with your own image generation, nothing else.
3. Put the pictures in `liberty/art/incoming/pr<number>/`, commit only that
   folder, and push to the pull request's branch.
4. Reply on the pull request (see "Your reply"). Your reply is how Claude
   knows you're done; it wakes Claude to check the pictures.

Never change any other file: code, the game's pictures in `liberty/assets/`,
this file. If something fails, stop and say so on the pull request.

## Rules

1. **Only what's asked.** At most 4 pictures per request unless it says
   otherwise.
2. **One figure or building per picture**, whole, nothing cropped, nothing
   else in the frame.
3. **A flat magenta background (#FF00FF)**, edge to edge: no checkerboard, no
   ground, no cast shadow, no vignette. Claude cuts the magenta out, so don't
   use magenta or pink in the subject.
4. **No text, labels, borders, frames or watermarks** in the picture.
5. **Use the reference.** When a request names a picture from
   `liberty/assets/`, start from that picture (edit it, don't draw from
   scratch) so yours matches its style.
6. **Respectful and kind.** These are people from scripture. Dress them
   modestly, no blood or gore, nothing scary for a child.
7. **Say what you weren't sure about.** If a request can't be done as asked,
   make your best try and say why in your reply.

## House style

Match `liberty/assets/spearman.png` and `liberty/assets/lamanite.png`:

- Painted, realistic proportions, like a classic 1990s–2000s isometric
  strategy game (Age of Empires II, Red Alert 2).
- Seen from slightly above, at the game's isometric angle; people turned three
  quarters toward the viewer, feet at the bottom centre.
- Light from the **upper left**, soft shading, warm earth colours.
- Nephites: bronze helmets, leather or bronze breastplates, blue cloth, round
  shields. Lamanites: bare-chested or skins, red and brown body paint,
  feathers, slings and bows. Gadianton robbers: "a lamb-skin about their
  loins", "their heads were shorn, and they had head-plates upon them"
  (3 Nephi 4:7). The verse says they were dyed in blood; paint them with
  red-brown dye instead, not blood.

## Your reply

Start it with **Gemini (art helper):**, then a few short lines in plain
words: each picture you made, which part of the request it answers, and
anything you weren't sure about. Don't repeat the request back.

## Request files (for Claude)

`liberty/art/requests/NNN-name.md`: what the picture is for in the game, how
it will be used (size on screen, which way it faces), the reference picture
to match, how many to make, and what "done" looks like. Your pictures arrive
in `liberty/art/incoming/pr<number>/`; Claude moves the ones it uses into
`liberty/assets/`.
