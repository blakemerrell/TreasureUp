// Title of Liberty: what the world is made of. Units, buildings, the map,
// and the questions the council asks. Every quote and question comes from
// the mission's own chapter (liberty/scripture.js).
(function (root) {
  'use strict';

  const TILE = 32;
  const MAP_W = 64, MAP_H = 48;
  // Terrain. Forest and fields hold timber and grain; water, rock and forest block the way.
  const T = { GRASS: 0, FOREST: 1, WATER: 2, FORD: 3, ROCK: 4, FIELD: 5, RUIN: 6 };
  // North of this row is the wilderness, the robbers' own lands (3 Nephi 3:20–21).
  const BORDER_Y = 10;
  // The three ways down out of the mountains, and the river's three crossings.
  const PASSES = [11, 32, 53];
  const FORDS = [9, 31, 51];

  const UNITS = {
    worker:       { name: 'Worker', hp: 40, speed: 56, dmg: 3, range: 18, cd: 1.2, armor: 0, sight: 110, cost: { grain: 40 }, time: 7, builds: true,
                    about: 'Mends what is broken, and hurries along what is being built. Tap a damaged or unfinished building to send him.' },
    spearman:     { name: 'Spearman', hp: 95, speed: 58, dmg: 11, range: 20, cd: 1.0, armor: 2, sight: 170, cost: { grain: 45, timber: 25 }, time: 9, soldier: true, beats: ['armored', 'beast'],
                    about: 'A guard who fights up close. Strong against armored captains.' },
    archer:       { name: 'Archer', hp: 65, speed: 58, dmg: 11, range: 165, cd: 1.3, armor: 0, sight: 200, cost: { grain: 35, timber: 35 }, time: 10, soldier: true, ranged: true, beats: 'light',
                    about: 'Shoots from behind the walls. Strong against those without armor.' },
    gidgiddoni:   { name: 'Gidgiddoni', hp: 300, speed: 64, dmg: 18, range: 22, cd: 0.9, armor: 4, sight: 200, soldier: true, hero: true, aura: 130,
                    about: 'Chief captain, "a great prophet among them" (3 Nephi 3:19). Soldiers near him fight harder.' },
    villager:     { name: 'Villager', hp: 35, speed: 50, dmg: 0, range: 0, cd: 1, armor: 0, sight: 60, about: 'Marching to Zarahemla with the family\'s grain.' },
    flock:        { name: 'Flock', hp: 40, speed: 40, dmg: 0, range: 0, cd: 1, armor: 0, sight: 40, carries: 60, about: 'Flocks and herds, going to the gathering place.' },
    robber:       { name: 'Robber', hp: 70, speed: 60, dmg: 9, range: 20, cd: 1.0, armor: 1, sight: 190, foe: true },
    robberArcher: { name: 'Robber archer', hp: 48, speed: 58, dmg: 7, range: 135, cd: 1.5, armor: 0, sight: 200, foe: true, ranged: true, beats: 'light' },
    giddianhi:    { name: 'Giddianhi', hp: 420, speed: 56, dmg: 18, range: 22, cd: 1.0, armor: 3, sight: 200, foe: true, leader: true },
    zemnarihah:   { name: 'Zemnarihah', hp: 380, speed: 56, dmg: 16, range: 22, cd: 1.0, armor: 3, sight: 200, foe: true, leader: true },
    // Alma 43–44: Moroni's war with Zerahemnah.
    moroni:       { name: 'Moroni', hp: 320, speed: 64, dmg: 18, range: 22, cd: 0.9, armor: 5, sight: 200, soldier: true, hero: true, aura: 140,
                    about: 'Chief captain "only twenty and five years old" (Alma 43:17). Soldiers near him fight harder.' },
    lehi:         { name: 'Lehi', hp: 240, speed: 62, dmg: 15, range: 22, cd: 0.9, armor: 4, sight: 190, soldier: true, hero: true, aura: 110,
                    about: 'Leads the army hidden on the south of the hill Riplah (Alma 43:35).' },
    // The King-men's camp (design/evolution.md): a bearer hauls and builds; the warriors cost what the camp can pay.
    bearer:       { name: 'Bearer', hp: 45, speed: 60, dmg: 2, range: 18, cd: 1.2, armor: 0, sight: 120, cost: { grain: 30 }, time: 6, gathers: true, builds: true, load: 12, side: 'kingmen', tier: true,
                    about: 'Carries the camp\'s provisions on his back and raises its tents: "new supplies of provisions" (Alma 55:34).' },
    lamanite:     { name: 'Lamanite', hp: 72, speed: 60, dmg: 8, range: 20, cd: 1.0, armor: 0, sight: 180, cost: { grain: 30 }, time: 7, foe: true, beats: 'beast', color: '#b45309', band: '#e7c9a0',
                    about: 'No breastplates or shields: "naked, save it were a skin which was girded about their loins" (Alma 43:20).' },
    slinger:      { name: 'Lamanite slinger', hp: 46, speed: 58, dmg: 6, range: 130, cd: 1.5, armor: 0, sight: 190, cost: { grain: 25, timber: 10 }, time: 7, foe: true, ranged: true, beats: 'light', color: '#b45309', band: '#e7c9a0',
                    about: 'Bows and arrows, stones and slings (Alma 43:20).' },
    amalekite:    { name: 'Amalekite captain', hp: 140, speed: 58, dmg: 12, range: 20, cd: 1.0, armor: 2, sight: 190, cost: { grain: 60, timber: 40 }, time: 12, needs: ['pavilion'], foe: true, color: '#7c2d12', band: '#a8a29e',
                    about: 'Zerahemnah made Amalekites and Zoramites his chief captains (Alma 43:6). They were not naked like the others (43:20).' },
    zoramite:     { name: 'Zoramite captain', hp: 140, speed: 58, dmg: 12, range: 20, cd: 1.0, armor: 2, sight: 190, cost: { grain: 60, timber: 40 }, time: 12, needs: ['pavilion'], foe: true, color: '#7c2d12', band: '#a8a29e',
                    about: 'Zerahemnah made Amalekites and Zoramites his chief captains (Alma 43:6). They were not naked like the others (43:20).' },
    zerahemnah:   { name: 'Zerahemnah', hp: 520, speed: 56, dmg: 18, range: 22, cd: 1.0, armor: 3, sight: 200, foe: true, leader: true, aura: 100, color: '#7c2d12', band: '#a8a29e',
                    about: 'Leader of the Lamanite armies (Alma 43:5).' },
    alma:         { name: 'Alma', hp: 1, speed: 0, dmg: 0, range: 0, cd: 1, armor: 0, sight: 0, prophet: true,
                    about: 'Moroni sent to him, "desiring him that he should inquire of the Lord whither the armies of the Nephites should go" (Alma 43:23).' },
    // Free battle: the Red Alert-style tech tree. Units marked `tier` appear only
    // there (W.tech); `needs` names the buildings that must stand first.
    // The captains of free battle (design/evolution.md, section 7): each side's heroes. Helaman's picture is from 006; Teancum's, Amalickiah's and Ammoron's from 016.
    helaman:      { name: 'Helaman', hp: 300, speed: 64, dmg: 16, range: 22, cd: 0.9, armor: 4, sight: 200, soldier: true, hero: true, aura: 130, tier: true,
                    about: 'Led the two thousand stripling warriors, who "had been taught by their mothers" (Alma 56:47). Soldiers near him fight harder.' },
    teancum:      { name: 'Teancum', hp: 280, speed: 66, dmg: 22, range: 95, cd: 1.5, armor: 3, sight: 210, soldier: true, ranged: true, hero: true, aura: 120, tier: true,
                    about: '"Teancum stole privily into the tent of the king, and put a javelin to his heart" (Alma 51:34). Throws javelins; soldiers near him fight harder.' },
    amalickiah:   { name: 'Amalickiah', hp: 320, speed: 60, dmg: 18, range: 22, cd: 1.0, armor: 4, sight: 200, foe: true, leader: true, aura: 100, tier: true, color: '#7c2d12', band: '#fcd34d',
                    about: '"A very subtle man to do evil" (Alma 47:4), who by fraud "obtained the kingdom" (Alma 47:35). Warriors near him fight harder.' },
    ammoron:      { name: 'Ammoron', hp: 300, speed: 60, dmg: 17, range: 22, cd: 1.0, armor: 4, sight: 200, foe: true, leader: true, aura: 100, tier: true, color: '#7c2d12', band: '#fcd34d',
                    about: '"The brother of Amalickiah was appointed king over the people; and his name was Ammoron" (Alma 52:3). Warriors near him fight harder.' },
    standard:     { name: 'Standard of liberty', hp: 220, speed: 42, dmg: 0, range: 0, cd: 1, armor: 3, sight: 160, deploys: true, tier: true,
                    about: 'Moroni "planted the standard of liberty among the Nephites" (Alma 46:36). Choose open ground and plant it: your city grows from there.' },
    swordsman:    { name: 'Swordsman', hp: 115, speed: 58, dmg: 14, range: 20, cd: 1.0, armor: 2, sight: 170, cost: { grain: 55, timber: 35 }, time: 11, soldier: true, tier: true, needs: ['smithy'], beats: 'ranged',
                    about: 'Armed "with swords, and with cimeters" (Alma 43:18). Strong up close, and against slingers and archers.' },
    nslinger:     { name: 'Slinger', hp: 55, speed: 60, dmg: 6, range: 140, cd: 1.3, armor: 0, sight: 180, cost: { grain: 35, timber: 15 }, time: 7, soldier: true, ranged: true, tier: true, beats: 'light',
                    about: 'The Nephites armed themselves "with stones, and with slings" (Alma 2:12). Cheap, strikes from far off, and strong against those without armor.' },
    javelin:      { name: 'Javelin thrower', hp: 75, speed: 60, dmg: 20, range: 95, cd: 1.7, armor: 1, sight: 180, cost: { grain: 50, timber: 40 }, time: 12, soldier: true, ranged: true, tier: true, needs: ['hall'], beats: 'armored',
                    about: '"The dart, and the javelin" (Jarom 1:8). Strong against armored captains. From history, not the verse: ancient Americans threw darts with a spear-thrower called an atlatl.' },
    stripling:    { name: 'Stripling warrior', hp: 190, speed: 64, dmg: 15, range: 20, cd: 0.9, armor: 4, sight: 180, cost: { grain: 90, timber: 60 }, time: 16, soldier: true, tier: true, needs: ['hall', 'training'],
                    about: '"Exceedingly valiant for courage" (Alma 53:20), "taught by their mothers" (Alma 56:47). Very hard to bring down.' },
    spy:          { name: 'Spy', hp: 40, speed: 82, dmg: 0, range: 0, cd: 1, armor: 0, sight: 270, cost: { grain: 30 }, time: 6, tier: true, scout: true, needs: ['training'],
                    about: '"Moroni sent spies into the wilderness to watch their camp" (Alma 43:23). Fast and far-seeing, and no fighter: send him to look, not to fight.' },
    // The great beasts of Ether 9:19, "useful unto man": nobody knows what they looked like, and their use in war is imagined here.
    curelom:      { name: 'Curelom', hp: 560, speed: 32, dmg: 26, range: 26, cd: 1.6, armor: 4, sight: 190, cost: { grain: 180, timber: 100 }, time: 30, soldier: true, beast: true, eats: 3, tier: true, needs: ['stables', 'hall'], side: 'freemen',
                    about: 'A great beast with soldiers on its back: "elephants and cureloms and cumoms; all of which were useful unto man" (Ether 9:19). Slow and very strong; spearmen and Lamanite warriors bring it down. Nobody knows what a curelom looked like, and its use in war is imagined.' },
    cumom:        { name: 'Cumom', hp: 480, speed: 28, dmg: 12, range: 26, cd: 2.0, armor: 3, sight: 180, cost: { grain: 140, timber: 60 }, time: 28, foe: true, beast: true, siege: 5, eats: 3, tier: true, needs: ['pavilion'], side: 'kingmen', color: '#78716c', band: '#e7c9a0',
                    about: 'A great horned beast that butts down walls and buildings: "elephants and cureloms and cumoms; all of which were useful unto man" (Ether 9:19). Slow, clumsy against soldiers; spearmen bring it down. Nobody knows what a cumom looked like, and its use in war is imagined.' },
    cart:         { name: 'Horse cart', hp: 90, speed: 78, dmg: 0, range: 0, cd: 1, armor: 1, sight: 140, cost: { grain: 60, timber: 40 }, time: 12, gathers: true, load: 30, quick: 1.5, needs: ['storehouse'],
                    about: 'Brings in grain and timber on its own, whichever is shorter: it finds the nearest field or forest and hauls the load to a storehouse. With no storehouse it has nowhere to go and waits. Tap it on a field, a forest or a rock face to choose which; stone only comes when you ask. The Nephites had "horses, and their chariots" (3 Nephi 3:22).' },
    prisoner:     { name: 'Prisoner', hp: 1, speed: 45, dmg: 0, range: 0, cd: 1, armor: 0, sight: 0, about: 'Yielded up as a prisoner (3 Nephi 4:27).' }
  };

  const BUILDINGS = {
    stronghold: { name: 'Zarahemla', w: 4, h: 4, hp: 2400, armor: 4, dmg: 8, range: 130, cd: 1.4, dropoff: 'story', builder: true, trains: ['cart', 'worker'], food: 10, store: 300, about: 'The gathering place (3 Nephi 3:23). Its guards shoot at robbers. Lose it and the mission is lost.' },
    storehouse: { name: 'Storehouse', w: 2, h: 2, hp: 450, armor: 2, cost: { timber: 60 }, work: 18, dropoff: true, brings: 'cart', store: 300, about: 'Where the carts bring grain, timber and stone: with none standing they have nowhere to go. Each one built brings a horse cart, like a refinery in Red Alert.' },
    barracks:   { name: 'Barracks', w: 3, h: 3, hp: 650, armor: 2, cost: { timber: 110 }, work: 30, trains: ['spearman', 'nslinger', 'archer'], research: ['armor'], about: 'Trains the guards.' },
    tower:      { name: 'Watchtower', w: 2, h: 2, hp: 520, armor: 3, cost: { timber: 40, stone: 40 }, work: 26, dmg: 9, range: 150, cd: 1.3, needs: ['barracks'], about: 'Guards "watch them … day and night" (3 Nephi 3:14). Shoots at robbers.' },
    wall:       { name: 'Earthwork', w: 1, h: 1, hp: 260, armor: 5, cost: { timber: 6 }, work: 5, wall: true, about: 'Fortifications "round about them" (3 Nephi 3:14). Robbers must break through.' },
    gate:       { name: 'Gate', w: 1, h: 1, hp: 320, armor: 4, cost: { timber: 10, stone: 15 }, work: 8, wall: true, gate: true, about: 'Your people pass through; robbers must break it.' },
    village:    { name: 'Village', w: 3, h: 3, hp: 99999, neutral: true },
    camp:       { name: "Robbers' camp", w: 3, h: 3, hp: 380, armor: 2, food: 8, about: 'Part of the siege round about the city (3 Nephi 4:16).' },
    // Free battle.
    farm:       { name: 'Farm', w: 2, h: 2, hp: 300, armor: 1, cost: { timber: 50 }, work: 14, food: 8, grows: 0.25, tier: true,
                  about: 'Feeds 8 more people, and grows a little grain. "They did raise grain in abundance" (Helaman 6:12).' },
    granary:    { name: 'Granary', w: 2, h: 2, hp: 380, armor: 2, cost: { timber: 45 }, work: 14, store: 500, tier: true,
                  about: 'Holds 500 more of each: grain, timber and stone. The Nephites "reserved for themselves provisions" (3 Nephi 4:4). From history, not the verses: clay granaries like these have held maize in Mexico since long before the Spanish came.' },
    // The Freemen's second tier (design/evolution.md, section 4): the armory keeps the armor; the smithy makes the steel; the training ground makes veterans.
    smithy:     { name: 'Smithy', w: 2, h: 2, hp: 480, armor: 2, cost: { grain: 40, timber: 90, stone: 30 }, work: 22, needs: ['barracks'], trains: ['swordsman'], research: ['cimeters', 'bows'], tier: true,
                  about: 'Nephi "did make tools of the ore" (1 Nephi 17:16) and, after the manner of the sword of Laban, "did make many swords" (2 Nephi 5:14). Arms swordsmen; makes cimeters and bows of fine steel.' },
    training:   { name: 'Training ground', w: 3, h: 2, hp: 400, armor: 1, cost: { grain: 40, timber: 80 }, work: 20, needs: ['barracks', 'farm'], trains: ['spy'], veterans: true, tier: true,
                  about: 'Where new soldiers drill. While it stands, every soldier trained comes out a veteran, like the striplings, "taught to keep the commandments of God" (Alma 53:21). Trains spies.' },
    armory:     { name: 'Armory', w: 3, h: 2, hp: 500, armor: 2, cost: { grain: 40, timber: 120 }, work: 24, needs: ['barracks'], research: ['breastplates', 'clothing', 'pickets', 'stonewalls'], tier: true,
                  about: 'Makes "all manner of weapons of war, of every kind" (Alma 2:12). Opens swordsmen, and makes armor, better weapons and stronger walls.' },
    stables:    { name: 'Stables', w: 2, h: 3, hp: 420, armor: 1, cost: { timber: 100 }, work: 20, needs: ['farm'], trains: ['cart', 'curelom'], fast: 2, tier: true,
                  about: 'Horse carts, twice as fast as the city makes them. They had "horses, and their chariots" (3 Nephi 3:22).' },
    hall:       { name: 'Hall of the captains', w: 3, h: 3, hp: 800, armor: 3, cost: { grain: 100, timber: 150, stone: 80 }, work: 36, needs: ['armory', 'smithy'], trains: ['javelin', 'stripling'], research: ['ladders'], tier: true,
                  about: 'Where the chief captains plan the war. Trains javelin throwers and stripling warriors. From history, not the verses: its stepped platform is like those built in ancient Mesoamerica.' },
    temple:     { name: 'Temple', w: 3, h: 3, hp: 1200, armor: 4, cost: { grain: 100, timber: 120, stone: 200 }, work: 50, needs: ['hall'], heals: 190, miracles: true, powers: 'miracles', tier: true,
                  about: 'Built "after the manner of the temple of Solomon" (2 Nephi 5:16). Your people near it are made whole; the council comes back sooner and gives double, as at King Benjamin\'s tower by the temple (Mosiah 2:7); and miracles are worked from it.' },
    relic:      { name: 'Jaredite ruin', w: 2, h: 2, hp: 99999, armor: 9, neutral: true, untouchable: true, relic: true, tier: true,
                  about: 'The ruins of a people who were before. Limhi\'s men found such a land, "covered with ruins of buildings of every kind" (Mosiah 8:8), and in it plates, breastplates and swords. Send someone to see what this one holds.' },
    // The King-men's camp (design/evolution.md, section 4): tents round the war camp, raised by its bearers.
    tents:      { name: 'Tents', w: 2, h: 2, hp: 260, armor: 1, cost: { timber: 40 }, work: 12, food: 8, side: 'kingmen', tier: true,
                  about: 'Hide tents for the warriors and their families: "they pitched their tents round about" (Mosiah 2:6). Each feeds eight.' },
    storetent:  { name: 'Store tent', w: 2, h: 2, hp: 300, armor: 1, cost: { timber: 50 }, work: 14, dropoff: true, brings: 'bearer', store: 400, side: 'kingmen', tier: true,
                  about: 'Where the bearers bring the camp\'s "new supplies of provisions" (Alma 55:34): with none standing they have nowhere to bring them. Each one pitched brings a bearer. Holds 400 of each.' },
    muster:     { name: 'Muster ground', w: 3, h: 3, hp: 520, armor: 2, cost: { timber: 90 }, work: 24, trains: ['lamanite', 'slinger'], side: 'kingmen', tier: true,
                  about: 'Where the warriors gather, armed with "their stones and their slings" (Alma 43:20).' },
    shieldtent: { name: 'Shield-makers\' tent', w: 2, h: 2, hp: 420, armor: 2, cost: { grain: 40, timber: 100 }, work: 22, needs: ['muster'], research: ['lshields', 'skins', 'hides'], side: 'kingmen', tier: true,
                  about: 'Here they "prepared themselves with shields, and with breastplates" (Alma 49:6). Opens the chief captain\'s pavilion.' },
    ladderworks: { name: 'Ladder-works', w: 2, h: 2, hp: 400, armor: 1, cost: { timber: 110 }, work: 22, needs: ['muster'], research: ['lladders'], side: 'kingmen', tier: true,
                  about: 'Ladders for the banks of earth they could not "dig down" (Alma 49:22).' },
    lookout:    { name: 'Lookout', w: 2, h: 2, hp: 520, armor: 3, cost: { timber: 60 }, work: 26, dmg: 9, range: 150, cd: 1.3, needs: ['muster'], side: 'kingmen', tier: true,
                  about: 'A tower of lashed logs on an earth mound: the Lamanites\' watch over their camp. Shoots at enemies.' },
    wardance:   { name: 'War-dance ground', w: 3, h: 2, hp: 380, armor: 1, cost: { grain: 40, timber: 80 }, work: 20, needs: ['muster', 'tents'], fierce: true, side: 'kingmen', tier: true,
                  about: 'Round the fire the king "stirred them up to anger" (Alma 48:3): while it stands, every warrior trained comes out fierce for a while, faster and harder-hitting.' },
    kingscourt: { name: 'King\'s court', w: 3, h: 3, hp: 1100, armor: 4, cost: { grain: 100, timber: 160 }, work: 48, needs: ['pavilion'], powers: 'cunning', side: 'kingmen', tier: true,
                  about: 'Amalickiah "obtained the kingdom" by fraud and cunning servants (Alma 47:35). Cunning is worked from it, and while it stands warriors cost less.' },
    pavilion:   { name: 'Chief captain\'s pavilion', w: 3, h: 3, hp: 700, armor: 3, cost: { grain: 80, timber: 140 }, work: 32, needs: ['shieldtent'], trains: ['amalekite', 'zoramite', 'cumom'], research: ['campditch'], side: 'kingmen', tier: true,
                  about: 'Zerahemnah "appointed chief captains over the Lamanites, and they were all Amalekites and Zoramites" (Alma 43:6).' },
    warcamp:    { name: 'Lamanite war camp', w: 4, h: 4, hp: 1800, armor: 3, tier: true, dropoff: 'story', builder: true, trains: ['bearer'], food: 40, store: 300, side: 'kingmen',
                  about: 'Where the Lamanite armies gather and the bearers are sent out from. Its provisions go to the store tents. Tear it down to win.' }
  };

  // The temple's miracles: each works at a spot you tap (or on one foe, or on everyone), then waits its time.
  const MIRACLES = {
    fire:  { name: 'Pillar of fire', ref: 'Helaman 5:23–24', wait: 120, aim: 'ground', r: 110, last: 12,
             about: 'A ring of fire round the spot: your people inside take no harm, and the enemies there flee. Nephi and Lehi "were encircled about as if by fire" (Helaman 5:23).',
             done: 'A pillar of fire! Your people within it take no harm, and the enemies flee.' },
    cloud: { name: 'Cloud of darkness', ref: 'Helaman 5:28', wait: 90, aim: 'ground', r: 120, last: 10,
             about: 'A cloud of darkness over the spot: the enemies in it can\'t see to strike, while your archers can.',
             done: 'A cloud of darkness falls: the enemies in it cannot see to strike.' },
    quake: { name: 'Earthquake', ref: 'Alma 14:27', wait: 150, aim: 'ground', r: 130,
             about: 'The earth shakes at the spot: enemy walls there fall, camps take great harm, and everyone there is thrown down for a moment. "The walls of the prison were rent in twain" (Alma 14:27).',
             done: 'The earth shakes! Walls fall and the camps are rent.' },
    sleep: { name: 'Deep sleep', ref: 'Alma 55:16', wait: 90, aim: 'ground', r: 120, last: 10,
             about: 'The enemies at the spot fall into a deep sleep, like the guards of the city of Gid.',
             done: 'A deep sleep falls on the enemies there.' },
    turn:  { name: 'Confusion', ref: 'Judges 7:22', wait: 120, aim: 'ground', r: 120, last: 8,
             about: 'The enemies at the spot turn their weapons on each other, as the Midianites did before Gideon.',
             done: 'Confusion! The enemies there set their swords against each other.' },
    mercy: { name: 'Mercy', ref: 'Alma 2:30', wait: 180, aim: 'none',
             about: '"O Lord, have mercy and spare my life" (Alma 2:30): every one of your people is made whole.',
             done: 'Mercy: every one of your people is made whole.' },
    shock: { name: 'Shock', ref: '1 Nephi 17:54', wait: 45, aim: 'foe',
             about: 'One enemy is shaken and thrown back, as Nephi shook his brothers.',
             done: 'He is shaken and thrown back.' }
  };

  // Artifacts: found among the Jaredite ruins (Mosiah 8:8-11), or brought out by the people when the council is answered well.
  const ARTIFACTS = {
    beast:   { name: 'A tame beast', ref: 'Ether 9:19', from: 'ruin',
               about: '"Elephants and cureloms and cumoms; all of which were useful unto man" (Ether 9:19): a great beast found tame among the ruins follows you.',
               found: 'Among the ruins your people find a great beast, tame and ready: "elephants and cureloms and cumoms; all of which were useful unto man" (Ether 9:19).' },
    sword:   { name: 'The sword of Laban', ref: '1 Nephi 4:9', from: 'ruin',
               about: '"The hilt thereof was of pure gold" (1 Nephi 4:9). Your best soldier bears it: he strikes half again as hard, and those near him fight harder. When he falls it passes on.',
               found: 'Among the ruins your men find a sword: "the hilt thereof was of pure gold, and the workmanship thereof was exceedingly fine" (1 Nephi 4:9). Your best soldier bears it.' },
    liahona: { name: 'The Liahona', ref: '1 Nephi 16:10', from: 'ruin',
               about: '"A round ball of curious workmanship" (1 Nephi 16:10). Your people see half again as far, and a brass pointer at the edge of the view shows the way to the war camp.',
               found: 'Among the ruins your men find "a round ball of curious workmanship; and it was of fine brass" (1 Nephi 16:10). Your people see farther, and it points the way to the war camp.' },
    breastplate: { name: 'Jaredite breastplates', ref: 'Mosiah 8:10', from: 'ruin',
               about: '"Breastplates, which are large, and they are of brass and of copper" (Mosiah 8:10). All your soldiers take less harm.',
               found: 'Among the ruins your men find "breastplates, which are large, and they are of brass and of copper" (Mosiah 8:10). Your soldiers put them on: 2 more armor.' },
    plates:  { name: 'The brass plates', ref: '1 Nephi 5:10', from: 'council', streak: 3,
               about: 'The record Lehi\'s sons brought out of Jerusalem (1 Nephi 5:10). With it the armory makes everything twice as fast.',
               found: 'Three right in a row! The people bring out the brass plates (1 Nephi 5:10): the armory makes everything twice as fast.' },
    interpreters: { name: 'The interpreters', ref: 'Mosiah 8:13', from: 'council', streak: 6,
               about: '"A seer can know of things which are past, and also of things which are to come" (Mosiah 8:17). A minute before each attack, you are told what it brings.',
               found: 'Six right in a row! The people bring out the interpreters (Mosiah 8:13): "a seer can know of things which are past, and also of things which are to come" (Mosiah 8:17). A minute before each attack, you will know what it brings.' }
  };

  const RESEARCH = {
    armor: { name: 'Weapons, armor and shields', cost: { grain: 120, timber: 120 }, time: 30, ref: '3 Nephi 3:26', armor: 2,
             about: 'Gidgiddoni had them make "weapons of war of every kind … strong with armor, and with shields" (3 Nephi 3:26). Soldiers +2 armor.',
             done: 'Weapons, armor and shields are ready: your soldiers are stronger.' },
    cimeters: { name: 'Swords and cimeters', cost: { grain: 80, timber: 120 }, time: 25, ref: 'Alma 43:18', dmg: 3,
             about: 'Moroni\'s people "were armed with swords, and with cimeters, and all manner of weapons of war" (Alma 43:18). Soldiers who fight up close +3 damage.',
             done: 'Swords and cimeters for everyone who fights up close.' },
    pickets: { name: 'Ridges of earth and pickets', cost: { timber: 150 }, time: 25, ref: 'Alma 50:1–3', walls: 2, level: 2,
             about: '"Heaps of earth round about all the cities," with "works of timbers" and "a frame of pickets" on top (Alma 50:1–3). Walls twice as strong.',
             done: 'Your walls have ridges of earth and pickets now: twice as strong.' },
    bows: { name: 'Bows of fine steel', cost: { grain: 80, timber: 60, stone: 40 }, time: 25, ref: '1 Nephi 16:18', bows: true,
             about: 'Nephi\'s bow "was made of fine steel" (1 Nephi 16:18). Archers shoot farther and harder.',
             done: 'Bows of fine steel: your archers shoot farther and harder.' },
    clothing: { name: 'Thick clothing', cost: { grain: 60, timber: 60 }, time: 20, ref: 'Alma 43:19', clothing: true,
             about: 'Moroni\'s people "were dressed with thick clothing" (Alma 43:19). Slingers, archers and javelin throwers take less harm.',
             done: 'Thick clothing: your slingers, archers and javelin throwers take less harm.' },
    ladders: { name: 'Ladders and cords', cost: { timber: 120 }, time: 25, ref: 'Alma 62:21', ladders: true,
             about: 'Moroni\'s men took Nephihah by night with "strong cords and ladders" (Alma 62:21). Your soldiers climb over enemy walls.',
             done: 'Ladders and cords: your soldiers climb over enemy walls.' },
    // The King-men's (made at their tents; design/evolution.md, section 5).
    lshields: { name: 'Shields and breastplates', cost: { grain: 80, timber: 100 }, time: 25, ref: 'Alma 49:6', armor: 2, side: 'kingmen',
                about: 'The Lamanites "prepared themselves with shields, and with breastplates" (Alma 49:6). Warriors +2 armor.',
                done: 'The warriors have shields and breastplates.' },
    skins:    { name: 'Garments of skins', cost: { grain: 60, timber: 60 }, time: 20, ref: 'Alma 49:6', clothing: true, side: 'kingmen',
                about: '"Garments of skins, yea, very thick garments to cover their nakedness" (Alma 49:6). Slingers +2 armor.',
                done: 'The slingers wear thick garments of skins.' },
    // The third level of walls, and the King-men's own two (design/evolution.md, 13b): each changes every wall piece at once.
    stonewalls: { name: 'Ditch and walls of stone', cost: { timber: 120, stone: 160 }, time: 35, ref: 'Alma 48:8', walls: 3, level: 3, after: 'pickets',
                about: 'Moroni had them build "walls of stone to encircle them about" (Alma 48:8), with "the depth of the ditch which had been dug round about" (Alma 49:18). Walls three times as strong; the ditch slows those who come at them; a guard on every fourth piece casts stones down on enemies close below (Alma 49:22).',
                done: 'Ditches dug and walls of stone raised: guards stand ready to cast stones down.' },
    hides:    { name: 'Palisade hung with hides', cost: { grain: 40, timber: 120 }, time: 25, ref: 'Alma 49:6', walls: 2, level: 2, side: 'kingmen',
                about: 'Hides and shields hung along the stakes, as the Lamanites "prepared themselves with shields, and with breastplates" (Alma 49:6). Walls twice as strong.',
                done: 'The palisade is hung with hides and shields.' },
    campditch: { name: 'Ditch, bank and slingers', cost: { grain: 60, timber: 220 }, time: 35, ref: 'Alma 55:33', walls: 3, level: 3, after: 'hides', side: 'kingmen',
                about: 'The Lamanites "fortified the city Morianton until it had become an exceeding stronghold" (Alma 55:33): a ditch, a bank under the stakes, and a slinger on every fourth piece who casts stones down on enemies close below. Walls three times as strong; the ditch slows those who come at them.',
                done: 'The camp is ditched and banked, and slingers stand on the palisade.' },
    lladders: { name: 'Ladders', cost: { timber: 100 }, time: 25, ref: 'Alma 49:22', ladders: true, side: 'kingmen',
                about: 'What they tried at the banks of earth, done right: warriors climb over enemy walls instead of breaking through (Alma 49:22).',
                done: 'The warriors carry ladders: they go over walls now.' },
    breastplates: { name: 'Breastplates and shields', cost: { grain: 100, timber: 100 }, time: 25, ref: 'Alma 43:19', armor: 4,
             about: 'Moroni "prepared his people with breastplates and with arm-shields, yea, and also shields to defend their heads" (Alma 43:19). Soldiers +4 armor.',
             done: 'Your soldiers have breastplates, arm-shields and head-plates, and thick clothing.' }
  };

  // A small seeded random, so the map is the same every time.
  function rng(seed) {
    let s = seed >>> 0;
    return () => { s = Math.imul(s ^ (s >>> 15), 2246822507) >>> 0; s = Math.imul(s ^ (s >>> 13), 3266489909) >>> 0; s ^= s >>> 16; return (s >>> 0) / 4294967296; };
  }

  // The land between the mountains and Zarahemla: rock along the top with
  // three passes, the robbers' wilderness below it, a river with three
  // fords across the middle, groves for timber, and fields around the city.
  function buildMap() {
    const r = rng(1830);
    const tiles = new Uint8Array(MAP_W * MAP_H);
    const amt = new Int16Array(MAP_W * MAP_H);
    const set = (x, y, t, a) => { if (x >= 0 && y >= 0 && x < MAP_W && y < MAP_H) { tiles[y * MAP_W + x] = t; amt[y * MAP_W + x] = a || 0; } };
    const get = (x, y) => tiles[y * MAP_W + x];
    const nearPass = (x, w) => PASSES.some(p => Math.abs(x - p) <= w);
    for (let x = 0; x < MAP_W; x++) {
      const depth = 2 + Math.floor(r() * 3);
      for (let y = 0; y < depth + 1; y++) if (!nearPass(x, 1)) set(x, y, T.ROCK);
      // The wilderness: thick forest, with a path down from each pass.
      for (let y = depth + 1; y < BORDER_Y; y++) if (!nearPass(x, 1 + (y > 6 ? 1 : 0)) && r() < 0.62) set(x, y, T.FOREST, 120);
    }
    // The river, winding west to east, two tiles wide.
    for (let x = 0; x < MAP_W; x++) {
      const cy = Math.round(24 + 2.2 * Math.sin(x / 6.5) + Math.sin(x / 2.7) * 0.6);
      for (let y = cy; y < cy + 2; y++) set(x, y, FORDS.some(f => x >= f - 1 && x <= f + 1) ? T.FORD : T.WATER);
    }
    // Groves for timber.
    const grove = (cx, cy, rad) => {
      for (let y = Math.floor(cy - rad); y <= cy + rad; y++) for (let x = Math.floor(cx - rad); x <= cx + rad; x++) {
        const d = Math.hypot(x - cx, y - cy);
        if (d <= rad - 0.3 + r() * 0.8 && get(x, y) === T.GRASS) set(x, y, T.FOREST, 120);
      }
    };
    [[17, 38, 3], [45, 37, 3], [8, 31, 3], [56, 31, 3], [24, 17, 2], [42, 19, 2], [6, 41, 2], [58, 42, 2], [36, 45, 1.6], [27, 29, 1.5]].forEach(g => grove(g[0], g[1], g[2]));
    // Fields around the city, and a few near the villages.
    const field = (x0, y0, w, h) => { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) if (get(x, y) === T.GRASS) set(x, y, T.FIELD, 300); };
    [[24, 42, 4, 2], [36, 42, 4, 2], [23, 34, 3, 2], [38, 34, 3, 2], [28, 44, 3, 2], [33, 44, 3, 2]].forEach(f => field(f[0], f[1], f[2], f[3]));
    // Rocky outcrops in the land south of the border, for stone: the mountains to the north are out of reach.
    const outcrop = (cx, cy, rad) => {
      for (let y = Math.floor(cy - rad); y <= cy + rad; y++) for (let x = Math.floor(cx - rad); x <= cx + rad; x++) {
        if (Math.hypot(x - cx, y - cy) <= rad - 0.3 + r() * 0.8 && get(x, y) === T.GRASS) set(x, y, T.ROCK);
      }
    };
    [[19, 45, 1.8], [44, 45, 1.6], [10, 20, 1.6]].forEach(o => outcrop(o[0], o[1], o[2]));
    return { tiles, amt };
  }

  // Alma 43: the land between Jershon and Manti. Where these places lay isn't
  // known (the Church has no official map), so this is a picture of the story,
  // not of the land: Jershon to the north-east, the Zoramites' Antionum to the
  // south-east, the river Sidon running north to south, the hill Riplah east
  // of it, and Manti to the south-west.
  const SIDON = {
    JERSHON: { x: 52, y: 0 }, MANTI: { x: 7, y: 38 }, ANTIONUM: { x: 54, y: 37 },
    ALMA: { x: 4, y: 4 }, TRACKS: { x: 55, y: 44 },
    RIPLAH: { x: 43, y: 23, r: 3.4 },
    river: y => Math.round(30 + 1.5 * Math.sin(y / 8)),     // the river's west bank at row y (two tiles wide)
    FORDS: [7, 26, 42],                                      // rows where it can be crossed
    ANTIONUM_LAND: { x0: 49, y0: 32, x1: 63, y1: 47 },
    // The way they came: out of the east wilderness, north of the hill, into the valley and across the river.
    ROUTE: [[62, 18], [50, 18], [43, 18], [37, 20], [34, 25], [29, 26], [24, 28], [16, 33], [11, 37]],
    GATHER: { x: 25, y: 28 },                                // "upon the bank by the river Sidon" (Alma 43:51)
    COVER: [{ name: 'South of the hill Riplah', x0: 37, y0: 28, x1: 47, y1: 35, ref: 'Alma 43:31', side: 'east' },
            { name: 'The west valley', x0: 18, y0: 18, x1: 25, y1: 33, ref: 'Alma 43:32', side: 'west' }],
    VILLAGES: [{ name: 'Zeezrom', x: 14, y: 42 }, { name: 'Cumeni', x: 2, y: 29 }, { name: 'Antiparah', x: 21, y: 40 }]
  };
  function buildSidonMap() {
    const r = rng(74);
    const tiles = new Uint8Array(MAP_W * MAP_H);
    const amt = new Int16Array(MAP_W * MAP_H);
    const inb = (x, y) => x >= 0 && y >= 0 && x < MAP_W && y < MAP_H;
    const set = (x, y, t, a) => { if (inb(x, y)) { tiles[y * MAP_W + x] = t; amt[y * MAP_W + x] = a || 0; } };
    const get = (x, y) => inb(x, y) ? tiles[y * MAP_W + x] : T.ROCK;
    const keepClear = (x, y) => Math.hypot(x - SIDON.TRACKS.x, y - SIDON.TRACKS.y) < 3 || SIDON.ROUTE.some(([rx, ry], i) => {
      const [nx, ny] = SIDON.ROUTE[i + 1] || [rx, ry];
      const steps = Math.max(Math.abs(nx - rx), Math.abs(ny - ry), 1);
      for (let k = 0; k <= steps; k++) if (Math.abs(x - (rx + (nx - rx) * k / steps)) <= 2.5 && Math.abs(y - (ry + (ny - ry) * k / steps)) <= 2.5) return true;
      return false;
    });
    // The wilderness: forest along the east and south edges.
    for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) {
      const wild = x >= 59 || y >= 45 || (x >= 55 && y >= 40);
      if (wild && !keepClear(x, y) && r() < 0.5) set(x, y, T.FOREST, 120);
    }
    // The river Sidon, with three places to cross.
    for (let y = 0; y < MAP_H; y++) {
      const x0 = SIDON.river(y);
      for (let x = x0; x < x0 + 2; x++) set(x, y, SIDON.FORDS.some(f => y >= f && y <= f + 1) ? T.FORD : T.WATER);
    }
    // The hill Riplah.
    const H = SIDON.RIPLAH;
    for (let y = H.y - 4; y <= H.y + 4; y++) for (let x = H.x - 4; x <= H.x + 4; x++) if (Math.hypot(x - H.x, y - H.y) <= H.r + r() * 0.5 - 0.2) set(x, y, T.ROCK);
    // Trees in the valleys where the armies hid, with room to stand among them.
    for (const c of SIDON.COVER) for (let y = c.y0; y <= c.y1; y++) for (let x = c.x0; x <= c.x1; x++) if (get(x, y) === T.GRASS && !keepClear(x, y) && r() < 0.22) set(x, y, T.FOREST, 90);
    // Groves for timber, and fields near the cities and villages.
    const grove = (cx, cy, rad) => { for (let y = Math.floor(cy - rad); y <= cy + rad; y++) for (let x = Math.floor(cx - rad); x <= cx + rad; x++) if (Math.hypot(x - cx, y - cy) <= rad - 0.3 + r() * 0.8 && get(x, y) === T.GRASS && !keepClear(x, y)) set(x, y, T.FOREST, 120); };
    [[43, 6, 2.5], [60, 4, 2], [38, 3, 2], [4, 45, 2], [12, 24, 2]].forEach(g => grove(g[0], g[1], g[2]));
    const field = (x0, y0, w, h) => { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) if (get(x, y) === T.GRASS) set(x, y, T.FIELD, 300); };
    [[46, 6, 3, 2], [57, 6, 3, 2], [5, 43, 3, 2], [12, 41, 3, 2], [2, 35, 3, 2]].forEach(f => field(f[0], f[1], f[2], f[3]));
    return { tiles, amt };
  }

  // Free battle: your standard in the south-west, the Lamanite war camp in the
  // north-east, the river Sidon between, with timber, fields and hills to fight over.
  const FREE = {
    START: { x: 11, y: 37 }, WARCAMP: { x: 50, y: 3 },
    CAMPS: [{ x: 41, y: 5 }, { x: 57, y: 11 }, { x: 47, y: 12 }],
    river: y => Math.round(31 + 2 * Math.sin(y / 9)),
    FORDS: [8, 24, 40]
  };
  function buildFreeMap() {
    const r = rng(46);
    const tiles = new Uint8Array(MAP_W * MAP_H);
    const amt = new Int16Array(MAP_W * MAP_H);
    const inb = (x, y) => x >= 0 && y >= 0 && x < MAP_W && y < MAP_H;
    const set = (x, y, t, a) => { if (inb(x, y)) { tiles[y * MAP_W + x] = t; amt[y * MAP_W + x] = a || 0; } };
    const get = (x, y) => inb(x, y) ? tiles[y * MAP_W + x] : T.ROCK;
    const clear = (x, y) => Math.hypot(x - FREE.START.x - 2, y - FREE.START.y - 2) < 6 || Math.hypot(x - FREE.WARCAMP.x - 2, y - FREE.WARCAMP.y - 2) < 6 ||
      FREE.CAMPS.some(c => Math.hypot(x - c.x - 1, y - c.y - 1) < 3.5);
    for (let y = 0; y < MAP_H; y++) {
      const x0 = FREE.river(y);
      for (let x = x0; x < x0 + 2; x++) set(x, y, FREE.FORDS.some(f => y >= f && y <= f + 1) ? T.FORD : T.WATER);
    }
    const blob = (cx, cy, rad, t, a) => { for (let y = Math.floor(cy - rad - 1); y <= cy + rad + 1; y++) for (let x = Math.floor(cx - rad - 1); x <= cx + rad + 1; x++) if (Math.hypot(x - cx, y - cy) <= rad - 0.3 + r() * 0.8 && get(x, y) === T.GRASS && !clear(x, y)) set(x, y, t, a); };
    [[20, 26, 2.2], [44, 27, 2.6], [24, 6, 1.8], [40, 42, 1.8]].forEach(([x, y, rad]) => blob(x, y, rad, T.ROCK));
    [[4, 30, 2.5], [20, 43, 2.5], [5, 45, 2], [24, 19, 3], [38, 33, 3], [15, 13, 2.5], [49, 40, 3], [59, 22, 2.5], [39, 1, 2], [57, 30, 2], [9, 22, 2]].forEach(([x, y, rad]) => blob(x, y, rad, T.FOREST, 120));
    const field = (x0, y0, w, h) => { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) if (get(x, y) === T.GRASS && !clear(x, y)) set(x, y, T.FIELD, 300); };
    [[17, 34, 3, 2], [8, 43, 3, 2], [25, 33, 3, 2], [36, 14, 3, 2], [54, 16, 3, 2], [14, 28, 3, 2]].forEach(f => field(...f));
    return { tiles, amt };
  }

  // Out of the Wilderness: an open valley with your standard in the middle,
  // and four ways in for raiders: two passes through the mountains on the
  // north, the forest on the west, and the fords of the river on the east.
  const WILD = {
    START: { x: 26, y: 29 },
    WAYS: [
      { name: 'the western pass', x: 14, y: 1 },
      { name: 'the eastern pass', x: 42, y: 1 },
      { name: 'the western wilderness', x: 1, y: 30 },
      { name: 'the river fords', x: 62, y: 24 }
    ],
    river: y => Math.round(51 + 1.5 * Math.sin(y / 7)),
    FORDS: [13, 35]
  };
  function buildWildMap() {
    const r = rng(48);
    const tiles = new Uint8Array(MAP_W * MAP_H);
    const amt = new Int16Array(MAP_W * MAP_H);
    const inb = (x, y) => x >= 0 && y >= 0 && x < MAP_W && y < MAP_H;
    const set = (x, y, t, a) => { if (inb(x, y)) { tiles[y * MAP_W + x] = t; amt[y * MAP_W + x] = a || 0; } };
    const get = (x, y) => inb(x, y) ? tiles[y * MAP_W + x] : T.ROCK;
    const S = WILD.START, P = WILD.WAYS;
    // The ways in, and the trails from them into the valley, stay open.
    const trail = (x, y) => Math.abs(x - (P[0].x + Math.round(2 * Math.sin(y / 3)))) <= 1 && y < 12 ||
      Math.abs(x - (P[1].x + Math.round(2 * Math.sin(y / 4)))) <= 1 && y < 12 ||
      Math.abs(y - P[2].y) <= 1 && x < 9 || Math.abs(y - P[3].y) <= 1 && x > WILD.river(y) + 1 ||
      // and along the far bank of the river, from that trail to both fords
      x >= WILD.river(y) + 2 && x <= WILD.river(y) + 3 && y >= WILD.FORDS[0] - 1 && y <= WILD.FORDS[1] + 2;
    const clear = (x, y) => trail(x, y) || Math.hypot(x - S.x - 2, y - S.y - 2) < 7;
    // Mountains along the top, with the two passes through them.
    for (let x = 0; x < MAP_W; x++) {
      const depth = 2 + Math.round(1.5 + 1.5 * Math.sin(x / 5) + r());
      for (let y = 0; y < depth; y++) if (!trail(x, y)) set(x, y, T.ROCK);
    }
    // The wilderness: thick forest below the mountains and along the west.
    for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) {
      if (get(x, y) !== T.GRASS || clear(x, y)) continue;
      const north = y < 9 + Math.round(2 * Math.sin(x / 6)), west = x < 5 + Math.round(1.5 * Math.sin(y / 5));
      if ((north || west) && r() < 0.6) set(x, y, T.FOREST, 120);
    }
    // The river on the east, with its two fords, and the wild country beyond it.
    for (let y = 0; y < MAP_H; y++) {
      const x0 = WILD.river(y);
      for (let x = x0; x < x0 + 2; x++) if (get(x, y) !== T.ROCK) set(x, y, WILD.FORDS.some(f => y >= f && y <= f + 1) ? T.FORD : T.WATER);
      for (let x = x0 + 2; x < MAP_W; x++) if (get(x, y) === T.GRASS && !clear(x, y) && r() < 0.45) set(x, y, T.FOREST, 120);
    }
    // Hills along the south, and outcrops in the valley.
    for (let x = 0; x < MAP_W; x++) { const d = 1 + Math.round(1 + Math.sin(x / 4 + 2) + r()); for (let y = MAP_H - d; y < MAP_H; y++) if (get(x, y) === T.GRASS) set(x, y, T.ROCK); }
    const blob = (cx, cy, rad, t, a) => { for (let y = Math.floor(cy - rad - 1); y <= cy + rad + 1; y++) for (let x = Math.floor(cx - rad - 1); x <= cx + rad + 1; x++) if (Math.hypot(x - cx, y - cy) <= rad - 0.3 + r() * 0.8 && get(x, y) === T.GRASS && !clear(x, y)) set(x, y, t, a); };
    [[12, 20, 2], [38, 38, 2.4], [44, 16, 1.8], [20, 41, 1.6]].forEach(([x, y, rad]) => blob(x, y, rad, T.ROCK));
    [[17, 33, 2.5], [35, 25, 2.5], [31, 39, 2.2], [11, 38, 2.2], [40, 30, 2], [22, 18, 2.2], [46, 41, 2]].forEach(([x, y, rad]) => blob(x, y, rad, T.FOREST, 120));
    const field = (x0, y0, w, h) => { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) if (get(x, y) === T.GRASS && !clear(x, y)) set(x, y, T.FIELD, 300); };
    [[19, 26, 3, 2], [33, 31, 3, 2], [27, 37, 3, 2], [30, 20, 3, 2], [14, 28, 2, 3]].forEach(f => field(...f));
    return { tiles, amt };
  }

  // Where things stand at the start.
  const CITY = { x: 30, y: 37 };                       // Zarahemla, 4×4
  const VILLAGES = [                                   // cities and lands named in the Book of Mormon
    { name: 'Gideon', x: 6, y: 14, people: 3, flocks: 2 },
    { name: 'Minon', x: 21, y: 12, people: 3, flocks: 2 },
    { name: 'Melek', x: 40, y: 14, people: 4, flocks: 1 },
    { name: 'Manti', x: 56, y: 13, people: 3, flocks: 2 },
    { name: 'Sidom', x: 51, y: 29, people: 3, flocks: 1 }
  ];

  // The council: questions answered from the chapter. Right answers bring a
  // blessing to the city; a wrong one shows the verse that settles it.
  const QUESTIONS = {
    '3 Nephi 3': [
      { ref: '3 Nephi 3:12', q: 'What did Lachoneus do with Giddianhi\'s threatening letter?', right: 'Refused it, and had the people pray', wrong: ['Gave up some land to keep the peace', 'Wrote back to ask for more time'] },
      { ref: '3 Nephi 3:8', q: 'When did Giddianhi say his armies would come down?', right: 'The next month', wrong: ['The next morning', 'In seven years'] },
      { ref: '3 Nephi 3:13', q: 'Where did Lachoneus tell the people to gather?', right: 'Together, in one place', wrong: ['Each family on its own farm', 'Up in the hills, out of sight'] },
      { ref: '3 Nephi 3:13', q: 'What were the people to bring with them?', right: 'Families, flocks, herds and goods', wrong: ['Only their swords and shields', 'Only what fit on their backs'] },
      { ref: '3 Nephi 3:14', q: 'Who guarded the gathered people day and night?', right: 'Armies of Nephites and Lamanites', wrong: ['Hired soldiers from far away', 'The robbers who had joined them'] },
      { ref: '3 Nephi 3:19', q: 'What kind of man did the Nephites choose as chief captain?', right: 'One with the spirit of revelation', wrong: ['The strongest fighter in the land', 'The richest man in Zarahemla'] },
      { ref: '3 Nephi 3:21', q: 'The people wanted to attack the robbers in the mountains. What did Gidgiddoni say?', right: 'Wait for them to come to us', wrong: ['Attack them before they grow', 'Send spies to steal their food'] },
      { ref: '3 Nephi 3:24', q: 'Why did the people gather in the land southward?', right: 'The land northward was under a curse', wrong: ['The land southward had more gold', 'The robbers already lived there'] },
      { ref: '3 Nephi 3:25', q: 'What did the people do while they waited in one land?', right: 'Repented and prayed to the Lord', wrong: ['Hid their food from each other', 'Argued about who would lead'] },
      { ref: '3 Nephi 3:26', q: 'What did Gidgiddoni have the people make?', right: 'Weapons, armor, and shields', wrong: ['Boats to sail far away', 'Gold to pay the robbers'] }
    ],
    '3 Nephi 4': [
      { ref: '3 Nephi 4:3', q: 'Why couldn\'t the robbers find food in the lands the Nephites left?', right: 'The Nephites took all the food with them', wrong: ['A flood washed all the fields away', 'The robbers were too proud to farm'] },
      { ref: '3 Nephi 4:4', q: 'How long could the Nephites live on the food they had stored?', right: 'Seven years', wrong: ['Seven months', 'Seven weeks'] },
      { ref: '3 Nephi 4:7', q: 'How did Giddianhi\'s army look when it came to battle?', right: 'Terrible, with lamb-skins and head-plates', wrong: ['Dressed in Nephite soldiers\' armor', 'Hidden under dark cloaks at night'] },
      { ref: '3 Nephi 4:8', q: 'Why did the Nephite armies fall to the earth?', right: 'To cry to the Lord for help', wrong: ['Because they were afraid', 'To hide from the robbers\' arrows'] },
      { ref: '3 Nephi 4:14', q: 'What happened to Giddianhi after the battle?', right: 'He was overtaken as he fled', wrong: ['He escaped into the mountains', 'He surrendered to Gidgiddoni'] },
      { ref: '3 Nephi 4:16', q: 'What did Zemnarihah\'s robbers do instead of attacking?', right: 'Surrounded them on every side', wrong: ['Made peace with Lachoneus', 'Sailed to the land southward'] },
      { ref: '3 Nephi 4:18', q: 'Why couldn\'t the siege work?', right: 'The robbers ran out of food first', wrong: ['The Nephites ran out of water', 'The robbers forgot their weapons'] },
      { ref: '3 Nephi 4:21', q: 'What were the Nephites doing during the siege?', right: 'Marching out day and night to fight', wrong: ['Hiding inside and waiting quietly', 'Sending food out to the robbers'] },
      { ref: '3 Nephi 4:24', q: 'How did Gidgiddoni stop the robbers\' retreat?', right: 'Sent armies at night to block the way', wrong: ['Built a wall across the whole land', 'Let them go, then followed them'] },
      { ref: '3 Nephi 4:27', q: 'What did many of the robbers do when they were cut off?', right: 'Gave themselves up as prisoners', wrong: ['Escaped into the land northward', 'Became Nephite chief captains'] },
      { ref: '3 Nephi 4:33', q: 'Why did the people know they had been delivered?', right: 'Because of their repentance and humility', wrong: ['Because their army was the biggest', 'Because their walls were the tallest'] }
    ],
    'Alma 43': [
      { ref: 'Alma 43:5', q: 'Who led the Lamanite armies that came into the land of Antionum?', right: 'Zerahemnah', wrong: ['Amalickiah', 'Giddianhi'] },
      { ref: 'Alma 43:6', q: 'Whom did Zerahemnah make chief captains over the Lamanites?', right: 'Amalekites and Zoramites', wrong: ['Lamanite kings and princes', 'Nephites taken as prisoners'] },
      { ref: 'Alma 43:9', q: 'What were the Nephites fighting to protect?', right: 'Their families, lands and liberty', wrong: ['Gold taken in earlier wars', 'Their right to rule the Lamanites'] },
      { ref: 'Alma 43:13', q: 'The people of Ammon had promised not to fight. How did they help?', right: 'They gave substance to support the armies', wrong: ['They went ahead of the army as spies', 'They built the walls around Jershon'] },
      { ref: 'Alma 43:17', q: 'How old was Moroni when he was made chief captain?', right: 'Twenty-five', wrong: ['Eighteen', 'Forty'] },
      { ref: 'Alma 43:19', q: 'What did Moroni prepare his people with?', right: 'Breastplates, arm-shields and head shields', wrong: ['Lamb-skins dyed in blood', 'Only a skin girded about the loins'] },
      { ref: 'Alma 43:21', q: 'Why didn\'t the Lamanites attack the Nephites in the borders of Jershon?', right: 'They were afraid of the Nephites\' armor', wrong: ['The Nephites had more soldiers', 'A flood blocked their way'] },
      { ref: 'Alma 43:23', q: 'Whom did Moroni send to, to ask the Lord where the Lamanites would go?', right: 'Alma', wrong: ['The chief judge', 'Captain Lehi'] },
      { ref: 'Alma 43:25', q: 'Why did Moroni leave part of his army in Jershon?', right: 'So the Lamanites couldn\'t take the city', wrong: ['They were too tired to march', 'To guard prisoners kept there'] },
      { ref: 'Alma 43:30', q: 'Why did Moroni think it was no sin to surprise the Lamanites with a plan?', right: 'He was only defending his people', wrong: ['The Lamanites had tricked them first', 'Alma had told him to trick them'] },
      { ref: 'Alma 43:35', q: 'Who led the army hidden on the south of the hill Riplah?', right: 'Lehi', wrong: ['Moroni', 'Teancum'] },
      { ref: 'Alma 43:48', q: 'When his men were about to flee, what did Moroni fill their hearts with?', right: 'Thoughts of their lands and liberty', wrong: ['Promises of gold and land', 'Fear of what Zerahemnah would do'] },
      { ref: 'Alma 43:54', q: 'What did Moroni do when he saw the Lamanites were terrified?', right: 'Told his men to stop shedding their blood', wrong: ['Told his men to attack even harder', 'Sent to Jershon for more soldiers'] }
    ],
    'Alma 44': [
      { ref: 'Alma 44:1', q: 'What did Moroni tell Zerahemnah the Nephites did not want to be?', right: 'Men of blood', wrong: ['Kings over the Lamanites', 'Men of the wilderness'] },
      { ref: 'Alma 44:3', q: 'Moroni said the Lamanites were in their hands because of what?', right: 'Their religion and faith in Christ', wrong: ['Their breastplates and shields', 'Their greater numbers'] },
      { ref: 'Alma 44:6', q: 'What did Moroni ask the Lamanites to do, to spare their lives?', right: 'Give up their weapons and not come again to war', wrong: ['Join the Nephite armies against the robbers', 'Pay a tribute of gold and silver every year'] },
      { ref: 'Alma 44:8', q: 'Zerahemnah handed over his weapons, but what would he not do?', right: 'Take an oath of peace', wrong: ['Go into the wilderness', 'Speak to Moroni'] },
      { ref: 'Alma 44:9', q: 'What did Zerahemnah say had saved the Nephites?', right: 'Their breastplates and shields', wrong: ['Their faith in God', 'Their greater numbers'] },
      { ref: 'Alma 44:10', q: 'What did Moroni do with the weapons when Zerahemnah refused the oath?', right: 'Gave them back to him', wrong: ['Broke them in pieces', 'Threw them into the river'] },
      { ref: 'Alma 44:12', q: 'What happened when Zerahemnah rushed at Moroni?', right: 'A soldier smote his sword to the earth', wrong: ['Moroni fled across the river', 'His sword broke Moroni\'s shield'] },
      { ref: 'Alma 44:15', q: 'What did many Lamanites do after that?', right: 'Made a covenant of peace and left', wrong: ['Fought harder than before', 'Joined the armies of Moroni'] },
      { ref: 'Alma 44:19', q: 'Why did Zerahemnah finally promise never to come to war again?', right: 'His army was about to be destroyed', wrong: ['Moroni offered him gold', 'His captains made him promise'] },
      { ref: 'Alma 44:20', q: 'What happened to the Lamanites who made the covenant?', right: 'They were allowed to go into the wilderness', wrong: ['They were kept as prisoners in Manti', 'They were made to serve in Moroni\'s army'] },
      { ref: 'Alma 44:23', q: 'Where did Moroni\'s armies go when the war was over?', right: 'Back to their houses and lands', wrong: ['Into the land of Antionum', 'Up into the land northward'] }
    ]
  };

  // The King-men's cunning, worked from the king's court as the Freemen's miracles are from the temple (design/evolution.md, section 6).
  const CUNNING = {
    flattery:   { name: 'Flattery', ref: 'Alma 46:5', wait: 90, aim: 'foe', last: 20,
                  about: 'One enemy is "led by the flatteries of Amalickiah" (Alma 46:5) and turns on his own for a while.',
                  done: 'Flattered, he turns on his own.' },
    dissension: { name: 'Dissension', ref: 'Alma 53:8', wait: 120, aim: 'building', last: 40,
                  about: 'An enemy building stops its work for a while, like the "intrigue amongst the Nephites, which caused dissensions" (Alma 53:8).',
                  done: 'Dissension: their work stops for a while.' },
    stratagem:  { name: 'Stratagem', ref: 'Alma 58:6', wait: 150, aim: 'none', last: 25,
                  about: 'Your warriors go unseen until they strike, "resolving by stratagem" (Alma 58:6).',
                  done: 'By stratagem your warriors go unseen until they strike.' },
    host:       { name: 'The king\'s call', ref: 'Alma 48:3', wait: 180, aim: 'none',
                  about: 'Four warriors gather at once at the muster ground: "a numerous host" stirred up by the king (Alma 48:3).',
                  done: 'A host answers the king\'s call.' }
  };
  const POWERS = { miracles: MIRACLES, cunning: CUNNING };

  // The sides of a skirmish (design/evolution.md, section 2). The human is team 'p' and the opponent team 'r';
  // each team carries a side, which chooses its tree, its pictures and its words.
  const SIDES = {
    // (`bot`: how the camp's mind scales the difficulty table when it holds this side. A Nephite soldier costs about twice a
    // Lamanite warrior and wears armor, so a Freemen camp marches with half the heads and without the Lamanites' fierceness;
    // a horse cart hauls two and a half bearers' worth, and farms grow grain besides, so it keeps far fewer haulers.)
    freemen: { name: 'Freemen', people: 'The Nephites', ref: 'Alma 51:6', capital: 'stronghold', hauler: 'cart', builder: 'worker', foodHint: 'build a farm', store: 'storehouse', powers: 'miracles', house: 'Temple', bot: { march: 0.5, strength: 0.8, haulers: 0.4 },
               build: ['farm', 'granary', 'storehouse', 'barracks', 'wall', 'gate', 'tower', 'armory', 'smithy', 'training', 'stables', 'hall', 'temple'],
               about: 'Those who "took upon them the name of freemen" (Alma 51:6): the people of liberty, under Moroni\'s title. Fortify, upgrade, and work miracles from the temple.' },
    kingmen: { name: 'King-men', people: 'The Lamanites', ref: 'Alma 51:5', capital: 'warcamp', hauler: 'bearer', builder: 'bearer', foodHint: 'pitch tents', store: 'storetent', powers: 'cunning', house: 'Court', bot: { march: 1, strength: 1, haulers: 1 },
               build: ['tents', 'storetent', 'muster', 'wall', 'gate', 'lookout', 'shieldtent', 'ladderworks', 'wardance', 'pavilion', 'kingscourt'],
               about: 'Those who "were called king-men" (Alma 51:5): all who fought for Amalickiah\'s crown, the Lamanite armies and the dissenters with them. Numbers, fierce captains, and cunning from the king\'s court.' }
  };
  // Pick a side, then a captain (design/evolution.md, section 7): each brings a hero and one gift.
  const CAPTAINS = {
    freemen: {
      moroni:  { name: 'Moroni', hero: 'moroni', ref: 'Alma 48:11', bonus: { wallCost: 0.5 }, gift: 'Earthworks and gates cost half',
                 about: '"A man whose soul did joy in the liberty and the freedom of his country" (Alma 48:11).' },
      helaman: { name: 'Helaman', hero: 'helaman', ref: 'Alma 53:21', bonus: { ranks: 2 }, gift: 'The training ground gives two ranks',
                 about: 'His two thousand were "taught to keep the commandments of God" (Alma 53:21).' },
      teancum: { name: 'Teancum', hero: 'teancum', ref: 'Alma 51:34', bonus: { javelin: 30 }, gift: 'Javelin throwers reach farther and strike harder',
                 about: '"Teancum stole privily into the tent of the king" (Alma 51:34).' }
    },
    kingmen: {
      amalickiah: { name: 'Amalickiah', hero: 'amalickiah', ref: 'Alma 47:35', bonus: { powerWait: 0.5 }, gift: 'Cunning waits half as long',
                    about: '"By his fraud, and by the assistance of his cunning servants, he obtained the kingdom" (Alma 47:35).' },
      ammoron:    { name: 'Ammoron', hero: 'ammoron', ref: 'Alma 52:3', bonus: { warriorCost: 0.8 }, gift: 'Warriors cost less',
                    about: '"The brother of Amalickiah was appointed king over the people" (Alma 52:3).' },
      zerahemnah: { name: 'Zerahemnah', hero: 'zerahemnah', ref: 'Alma 43:6', bonus: { captainCost: 0.7 }, gift: 'Captains cost less',
                    about: 'He "appointed chief captains over the Lamanites, and they were all Amalekites and Zoramites" (Alma 43:6).' }
    }
  };

  const DATA = { TILE, MAP_W, MAP_H, T, BORDER_Y, PASSES, FORDS, UNITS, BUILDINGS, RESEARCH, MIRACLES, CUNNING, POWERS, ARTIFACTS, SIDES, CAPTAINS, CITY, VILLAGES, QUESTIONS, SIDON, FREE, WILD, buildMap, buildSidonMap, buildFreeMap, buildWildMap, rng };
  if (typeof module !== 'undefined' && module.exports) module.exports = DATA;
  else root.LIB_DATA = DATA;
})(this);
