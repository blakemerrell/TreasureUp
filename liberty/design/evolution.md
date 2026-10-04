# Title of Liberty: how a skirmish evolves

The foundation for free battle, and for the story missions that will run on it.
Decided with Blake on 3 October 2026 and kept current as the pieces land. Each
section says what is **settled**, what is **proposed** (built as written unless
play says otherwise), and what is **open**.

## 1. The idea, in one breath

Red Alert's feel comes from three things: two mirrored trees, an opponent who
visibly builds a base and an army out of a real economy, and picking a side.
We take all three, with the Book of Mormon's buildings, troops and verses. What
you build opens what you can train and make; so does theirs. Burn their tents
and their next army is smaller; raid their bearers and the camp starves. The
stories (missions) are then scenarios laid over this one engine, on maps we
draw by hand.

## 2. The sides (settled)

The sides are not ethnic. The book itself refuses that: Gidgiddoni's guards were
"both of the Nephites and of the Lamanites" (3 Nephi 3:14), and later "their
righteousness did exceed that of the Nephites" (Helaman 6:1). In Moroni's own
day the division was over liberty and kings (Alma 51:5–7), and we take the names
from there.

| | **Freemen** | **King-men** | *Robbers (reserved)* |
|---|---|---|---|
| Who | "took upon them the name of freemen" (Alma 51:6), "the people of liberty" (Alma 51:7): Moroni's armies and everyone under the title of liberty | "were called king-men" (Alma 51:5): those who followed Amalickiah, who "was desirous to be a king" (Alma 46:4) and became king over "the Lamanites and the Lemuelites and the Ishmaelites, and all the dissenters of the Nephites" (Alma 47:35) | Gadianton's band, bound by "secret oaths and covenants" (Helaman 6:26); Giddianhi and Zemnarihah of 3 Nephi 3–4 |
| Banner | The title of liberty (Alma 46:12) | Amalickiah's crown | Oaths and signs |
| Wins by | Fortification, upgrades, miracles | Numbers, fierce captains, cunning | Stealth, raids, siege (later) |
| Capital | Zarahemla, planted from the standard | The war camp | A hideout in the mountains |
| Workers | Workers build, horse carts haul | Bearers haul and build (Alma 55:34: "new supplies of provisions") | |

Honest note on the King-men name: in the book the king-men were dissenters at
home in Zarahemla (Alma 51:13–17), and the armies that marched on the Nephites
were Lamanite, led by Amalickiah and his Zoramite and Amalekite captains. We put
all who fought for Amalickiah's crown under one banner because they fought for
one end. The side's text says so.

The engine is written for any number of sides. In code the human is always team
`p` and the opponent team `r`; each team carries a `side` key (`freemen` or
`kingmen`, later `robbers`) that selects its tree, pictures and words. Neutral
things (ruins, villages) stay team `n`.

## 3. The economy (settled: the same for both sides)

Three resources, the same for everyone: **grain** from fields, **timber** from
forests, **stone** from rock faces beside open ground. Both sides gather from
the same tiles, so the land between the camps is contested.

| | Freemen | King-men |
|---|---|---|
| Haulers | Horse cart (30 a load, quick) | Bearer (smaller load, also builds) |
| Builders | Worker | Bearer |
| Drop-off | Zarahemla, storehouse | War camp, store tent |
| Food | Farm (8 each; also grows grain) | Tents (8 each): "they pitched their tents round about" (Mosiah 2:6) |
| Storage | Granary, storehouse | Store tent |

The opponent's economy is real and raidable (settled): its bearers walk to the
fields and back, and when they die the camp's income dies with them. Helaman's
Lamanites "began to sally forth, if it were possible to put an end to our
receiving provisions" (Alma 56:29); now you can do that to them.

## 4. The trees (settled shape; costs proposed)

Four tiers on each side, no more. Each tier is a building that **does**
something on its own as well as opening the next: nothing is a bare gate.

| Tier | Freemen | King-men |
|---|---|---|
| 0 | **Zarahemla** (planted from the standard): worker, cart. Farm, granary, storehouse, earthwork, gate. | **War camp**: bearer. Tents, store tent, palisade, gate. |
| 1 | **Barracks**: spearman, slinger, archer. Research: weapons, armor and shields. Opens the watchtower. | **Muster ground**: Lamanite warrior, slinger ("their stones and their slings", Alma 43:20). Opens the lookout. |
| 1 | **Stables** (needs farm): faster carts. | |
| 2 | **Armory** (needs barracks): breastplates and shields, thick clothing, ridges of earth and pickets. | **Shield-makers' tent** (needs muster ground): shields and breastplates, garments of skins (Alma 49:6); Amalekite captain. |
| 2 | **Smithy** (needs barracks): swordsman; swords and cimeters, bows of fine steel. *(built in 5b)* | **Ladder-works** (needs muster ground): ladders, for what they tried at the banks of earth (Alma 49:22). |
| 2 | **Training ground** (needs barracks and farm): spy; every soldier trained anywhere comes out a veteran while it stands ("taught to keep the commandments of God", Alma 53:21). Opens the stripling warrior. *(built in 5b)* | **War-dance ground** (needs muster ground): warriors come out fierce for a while. *(5c)* |
| 3 | **Hall of the captains** (needs armory and smithy): javelin thrower, stripling warrior; ladders and cords (Alma 62:21). | **Chief captain's pavilion** (needs shield-makers' tent): Zoramite captain, the chosen because they were "the most acquainted with the strength of the Nephites" (Alma 48:5); the side's hero. |
| 4 | **Temple** (needs hall): healing near it, double council, miracles. | **King's court** (needs pavilion): Amalickiah's cunning; cheaper warriors ("the greatness of their numbers", Alma 49:6). *(5c)* |

Where a soldier with a ladder comes from, as Blake asked: barracks, then armory
and smithy, then the hall, then the research. Three buildings deep on both
sides. In 5b the swordsman moved from the barracks to the smithy and the spy
to the training ground; a tile wears "New" for a while the first time it can
be used.

Proposed numbers for the King-men's troops, to be tuned in play: a Lamanite
warrior costs 30 grain and trains in 7 s against the spearman's 45 grain and
25 timber in 9 s, with less health and no armor until the shield-makers work.
A captain is a swordsman with a rally: those near him strike harder (as the
Freemen's heroes already do).

## 5. Upgrades (settled list; one at a time per side)

| Freemen | Where | King-men | Where |
|---|---|---|---|
| Weapons, armor and shields (3 Nephi 3:26) | barracks | Shields and breastplates (Alma 49:6) | shield-makers |
| Breastplates and shields (Alma 43:19) | armory | Garments of skins (Alma 49:6) | shield-makers |
| Thick clothing (Alma 43:19) | armory | | |
| Ridges of earth and pickets (Alma 50:1–3) | armory | Stronger palisade | shield-makers |
| Swords and cimeters (Alma 43:18) | smithy | Cimeters (Alma 43:20) | ladder-works |
| Bows of fine steel (1 Nephi 16:18) | smithy | | |
| Ladders and cords (Alma 62:21) | hall | Ladders (Alma 49:22) | ladder-works |

Both sides keep veteran ranks: three foes make a soldier "exceedingly valiant
for courage" (Alma 53:20), eight a veteran twice over.

## 6. Powers (settled kinds; the King-men's list proposed)

**Freemen: miracles from the temple**, as built: pillar of fire, cloud of
darkness, earthquake, deep sleep, confusion, mercy, shock.

**King-men: cunning from the king's court**, after Amalickiah, who was
"obtaining power by fraud and deceit" (Alma 48:7):

- **Flattery**: one enemy soldier is "led by the flatteries of Amalickiah"
  (Alma 46:5) and fights for you for a while.
- **Dissension**: an enemy building stops working for a time, like the
  "intrigue amongst the Nephites, which caused dissensions" (Alma 53:8).
- **Stratagem**: your army is hidden from the enemy's view until it strikes,
  for they came "resolving by stratagem to destroy us" (Alma 58:6).
- **The king's call**: a few warriors appear at the muster ground at once,
  "a numerous host" (Alma 48:3) gathered by anger.

Cunning is not the King-men's alone. The Freemen's hall may later hold a
council of war (Alma 52:19) with the book's own stratagems: Laman's wine, which
left the guards asleep ("Give us of your wine, that we may drink", Alma 55:9),
Moroni's decoy ("decoy the Lamanites out of their strongholds", Alma 52:21),
and Teancum's night, when he "stole privily into the tent of the king"
(Alma 51:34). *Proposed, after 5c.*

## 7. Pick a side, then a captain (settled)

Like Red Alert's countries, each captain brings a hero and one small bonus.
Three per side to begin with.

| Freemen | Bonus | King-men | Bonus |
|---|---|---|---|
| Moroni | Earthworks and gates cost half | Amalickiah | Cunning waits half as long |
| Helaman | The training ground gives two ranks, not one | Ammoron | Warriors cost less still |
| Teancum | Javelin throwers reach farther; the night strike | Zerahemnah | Captains cost less; "all Amalekites and Zoramites" (Alma 43:6) |

The bot picks a captain too, so no two games open the same way.

## 8. The opponent (settled)

The bot does what you do, with the same rules and the same costs:

1. **Economy.** It keeps a number of bearers hauling (by difficulty) from the
   nearest fields, forests and rock faces, dropping at its camp or store tent.
   Kill them and it must train more before it can build.
2. **Build order.** A list of what it wants standing, in order, with the same
   prerequisites you have. When it can pay and a bearer is free, it places the
   tent near its camp and the bearer walks out and raises it. You see every
   tent go up.
3. **Army.** It trains from the muster ground and the pavilion as food and
   grain allow, in a mix that changes with what stands, and marches when the
   army reaches a size (smaller on Easy, larger and sooner on Hard). Guards
   stay home. The forward camps remain as rally points with their own guards.
4. **Rebuilding.** A tent you burn goes back on the list after a few minutes.
   Raiding buys a breather, not a permanent win; starving the camp does more.
5. **Research.** It researches at its tents like you do, one at a time.
6. **Telling.** The interpreters show what the camp can field and how soon.

Timed waves are gone. What comes is what the camp could pay for.

## 9. Difficulty (proposed)

| | Easy | Normal | Hard |
|---|---|---|---|
| Bot bearers | 3 | 5 | 7 |
| Bot start | 150 grain, 150 timber | 250, 250 | 350, 350, 50 stone |
| Marches when the army is | 6, then +1 each march | 8, then +2 | 10, then +3 |
| Rebuilds a lost tent after | 240 s | 180 s | 120 s |
| Bot strength (as now) | 1.1 | 1.25 | 1.35 |
| Armor before the shield-makers work | 0 | 0 | 1 |

Built in 5a as written, with two rules found in play: the camp trains no
more than the next march needs (grain then goes to tents and research),
captains lead from the second march on, and ladders are made only after two
marches have come back from your walls.

## 10. What you see when something evolves (settled)

- A new tile appears in the right card with a small **New** ribbon, and a
  message with the verse it came from.
- The opponent's tents rise on the map as yours do, half-drawn until finished.
- When the opponent first fields something new (captains, ladders, fierce
  warriors), one warning message, once, with its verse.

## 11. Rules of thumb for a phone and an eleven-year-old (settled)

- Four tiers, never five. Each tier is one building, not two.
- The answer to a threat is always one tier below the threat: towers and
  archers (tier 1) answer ladders (tier 2); spearmen (tier 1) answer captains.
- Nothing attacks before five minutes on Normal.
- Every new building changes something you can see within a minute of
  finishing it.

## 12. The stories on this foundation (direction; open)

Each mission becomes a scenario over the same engine: a hand-drawn map, bases
and troops placed for the chapter, which parts of the tree are open, scripted
events and objectives, and which side the bot plays. The Robbers' chapters
(3 Nephi 3–4) use the reserved third side. Hand-drawn maps: paint over the
tile grid at the game's scale, and keep a tile-type mask beside the painting so
paths, fields and rock faces stay true. Pipeline to be designed after 5c.

## 13. Staging (settled)

- **5a. One engine, a living camp.** The simulation goes N-sided with no
  visible change for the Freemen; the King-men bot with a real economy, its
  tents, bearers and rebuilding; timed waves replaced; tests and README.
- **5b. The Freemen deepen.** Smithy and training ground; the hall takes
  ladders and cords; the armory keeps its armor.
- **5c. Pick a side, then a captain.** Playable King-men with their menu,
  pictures, war-dance ground and king's court; the bot plays the Freemen on the
  same engine; captains and bonuses.
- Later: the hall's council of war, the Robbers, the stories migrated onto the
  engine with drawn maps.

## 14. Open questions

- Does the King-men side get a temple-like healer, or is "cheaper warriors" its
  whole answer to mercy? (Lean: no healer. Numbers are the point.)
- Should the bot ever retreat a losing army? (Lean: no, for now. Simpler, and
  the book's armies seldom did.)
- Captains' bonuses need numbers from play before 5c.
- Do story missions keep their own hand-tuned waves where the book names them
  (the robbers' assault in 3 Nephi 4), or does the bot play those too? (Lean:
  the bot, with scripted reinforcements on the book's timeline.)

## 15. Verse index

Alma 2:13 captains and chief captains · Alma 2:21 spies · Alma 43:6 Amalekite and Zoramite captains · Alma 43:18–20 arms and nakedness · Alma 43:23, 43:28, 56:22 spies · Alma 43:30, 58:6 stratagem · Alma 46:4–5 Amalickiah and his flatteries · Alma 46:12–13 the title of liberty · Alma 47:35, 48:7 fraud and deceit · Alma 48:3 a numerous host · Alma 48:5 Zoramite chief captains · Alma 49:6 shields, breastplates, skins, numbers · Alma 49:22 the banks of earth · Alma 50:1–3 ridges and pickets · Alma 51:5–7 king-men, freemen, the people of liberty · Alma 51:13–17 the king-men at home · Alma 51:34 Teancum · Alma 52:19 council of war · Alma 52:21 the decoy · Alma 53:8 intrigue and dissension · Alma 53:20–21 valiant, taught · Alma 55:8–9, 55:34 wine, provisions · Alma 56:29, 56:47 provisions, taught by their mothers · Alma 62:21 cords and ladders · Helaman 6:1 Lamanite righteousness · Helaman 6:26 secret oaths · Mosiah 2:6 tents · 1 Nephi 16:18 steel bow · 3 Nephi 3:14 guards of both peoples · 3 Nephi 3:26 weapons, armor and shields
