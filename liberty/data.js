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
    worker:       { name: 'Worker', hp: 40, speed: 56, dmg: 3, range: 18, cd: 1.2, armor: 0, sight: 110, cost: { grain: 40 }, time: 7, gathers: true, builds: true,
                    about: 'Gathers grain and timber, and builds.' },
    spearman:     { name: 'Spearman', hp: 95, speed: 58, dmg: 11, range: 20, cd: 1.0, armor: 2, sight: 170, cost: { grain: 45, timber: 25 }, time: 9, soldier: true,
                    about: 'A guard who fights up close.' },
    archer:       { name: 'Archer', hp: 60, speed: 58, dmg: 8, range: 150, cd: 1.4, armor: 0, sight: 190, cost: { grain: 35, timber: 45 }, time: 10, soldier: true, ranged: true,
                    about: 'Shoots from behind the walls.' },
    gidgiddoni:   { name: 'Gidgiddoni', hp: 300, speed: 64, dmg: 18, range: 22, cd: 0.9, armor: 4, sight: 200, soldier: true, hero: true, aura: 130,
                    about: 'Chief captain, "a great prophet among them" (3 Nephi 3:19). Soldiers near him fight harder.' },
    villager:     { name: 'Villager', hp: 35, speed: 50, dmg: 0, range: 0, cd: 1, armor: 0, sight: 60, about: 'Marching to Zarahemla with the family\'s grain.' },
    flock:        { name: 'Flock', hp: 40, speed: 40, dmg: 0, range: 0, cd: 1, armor: 0, sight: 40, carries: 60, about: 'Flocks and herds, going to the gathering place.' },
    robber:       { name: 'Robber', hp: 70, speed: 60, dmg: 9, range: 20, cd: 1.0, armor: 1, sight: 190, robber: true },
    robberArcher: { name: 'Robber archer', hp: 48, speed: 58, dmg: 7, range: 135, cd: 1.5, armor: 0, sight: 200, robber: true, ranged: true },
    giddianhi:    { name: 'Giddianhi', hp: 420, speed: 56, dmg: 18, range: 22, cd: 1.0, armor: 3, sight: 200, robber: true, leader: true },
    zemnarihah:   { name: 'Zemnarihah', hp: 380, speed: 56, dmg: 16, range: 22, cd: 1.0, armor: 3, sight: 200, robber: true, leader: true },
    prisoner:     { name: 'Prisoner', hp: 1, speed: 45, dmg: 0, range: 0, cd: 1, armor: 0, sight: 0, about: 'Yielded up as a prisoner (3 Nephi 4:27).' }
  };

  const BUILDINGS = {
    stronghold: { name: 'Zarahemla', w: 4, h: 4, hp: 2400, armor: 4, dmg: 8, range: 185, cd: 1.4, dropoff: true, trains: ['worker'], about: 'The gathering place (3 Nephi 3:23). Its guards shoot at robbers. Lose it and the mission is lost.' },
    storehouse: { name: 'Storehouse', w: 2, h: 2, hp: 450, armor: 2, cost: { timber: 60 }, work: 18, dropoff: true, about: 'Workers bring grain and timber here too.' },
    barracks:   { name: 'Barracks', w: 3, h: 3, hp: 650, armor: 2, cost: { timber: 110 }, work: 30, trains: ['spearman', 'archer'], research: ['armor'], about: 'Trains the guards.' },
    tower:      { name: 'Watchtower', w: 2, h: 2, hp: 520, armor: 3, cost: { grain: 20, timber: 60 }, work: 26, dmg: 9, range: 175, cd: 1.3, about: 'Guards "watch them … day and night" (3 Nephi 3:14). Shoots at robbers.' },
    wall:       { name: 'Earthwork', w: 1, h: 1, hp: 260, armor: 5, cost: { timber: 6 }, work: 5, wall: true, about: 'Fortifications "round about them" (3 Nephi 3:14). Robbers must break through.' },
    gate:       { name: 'Gate', w: 1, h: 1, hp: 320, armor: 4, cost: { timber: 20 }, work: 8, wall: true, gate: true, about: 'Your people pass through; robbers must break it.' },
    village:    { name: 'Village', w: 3, h: 3, hp: 99999, neutral: true },
    camp:       { name: "Robbers' camp", w: 3, h: 3, hp: 380, armor: 2, about: 'Part of the siege round about the city (3 Nephi 4:16).' }
  };

  const RESEARCH = {
    armor: { name: 'Weapons, armor and shields', cost: { grain: 120, timber: 120 }, time: 30, ref: '3 Nephi 3:26',
             about: 'Gidgiddoni had them make "weapons of war of every kind … strong with armor, and with shields" (3 Nephi 3:26). Soldiers +2 armor.' }
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
      for (let y = cy - rad; y <= cy + rad; y++) for (let x = cx - rad; x <= cx + rad; x++) {
        const d = Math.hypot(x - cx, y - cy);
        if (d <= rad - 0.3 + r() * 0.8 && get(x, y) === T.GRASS) set(x, y, T.FOREST, 120);
      }
    };
    [[17, 38, 3], [45, 37, 3], [8, 31, 3], [56, 31, 3], [24, 17, 2], [42, 19, 2], [6, 41, 2], [58, 42, 2], [36, 45, 1.6], [27, 29, 1.5]].forEach(g => grove(g[0], g[1], g[2]));
    // Fields around the city, and a few near the villages.
    const field = (x0, y0, w, h) => { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) if (get(x, y) === T.GRASS) set(x, y, T.FIELD, 300); };
    [[24, 42, 4, 2], [36, 42, 4, 2], [23, 34, 3, 2], [38, 34, 3, 2], [28, 44, 3, 2], [33, 44, 3, 2]].forEach(f => field(f[0], f[1], f[2], f[3]));
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
    ]
  };

  const DATA = { TILE, MAP_W, MAP_H, T, BORDER_Y, PASSES, FORDS, UNITS, BUILDINGS, RESEARCH, CITY, VILLAGES, QUESTIONS, buildMap, rng };
  if (typeof module !== 'undefined' && module.exports) module.exports = DATA;
  else root.LIB_DATA = DATA;
})(this);
