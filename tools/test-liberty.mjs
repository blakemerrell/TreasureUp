#!/usr/bin/env node
// Plays Title of Liberty's missions without a screen, with a simple
// scripted player, and checks the story unfolds the way 3 Nephi 3–4 tells
// it. Run: node tools/test-liberty.mjs
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const D = require('../liberty/data.js');
globalThis.LIB_DATA = D;
const S = require('../liberty/sim.js');
globalThis.LIB_SIM = S;
const { MISSIONS } = require('../liberty/missions.js');

let failed = 0;
const ok = (cond, what) => { console.log((cond ? '  ✓ ' : '  ✗ ') + what); if (!cond) failed++; };
const tileOf = S.tileOf;
// A simple player's stone: while it's short, one cart is sent to a rock face; with plenty, it goes back to grain and timber.
// It quarries at the face nearest the city, never one with enemies about, and comes home if struck: a far quarry is as
// dangerous as an ore field in Red Alert.
const quarry = (W, cs) => {
  const q = cs.find(u => u.order.type === 'gather' && u.order.res === 'stone'), home = W.stronghold();
  if (q && (W.res.stone >= 300 || (q.hitAt && W.t - q.hitAt < 2))) { q.pref = null; W.order(q, { type: 'idle' }); return; }
  if (W.res.stone < 150 && !q && cs.length && home) {
    const c = cs[0], f = W.nearestResource(home.tx, home.ty, 'stone', c);
    if (f && !W.enemiesNear({ x: f[0] * 32 + 16, y: f[1] * 32 + 16 }, 'p', 260, true)) { c.pref = 'stone'; W.gatherAt(c, f[0], f[1]); }
  }
};

function start(id) {
  const W = new S.World(undefined, MISSIONS.find(m => m.id === id).map);
  W.mission = MISSIONS.find(m => m.id === id);
  W.mission.setup(W);
  return W;
}
function run(W, seconds, every, fn, until) {
  const dt = 1 / 20;
  let next = 0, ms = 0;
  for (let t = 0; t < seconds && !W.over && !(until && until(W)); t += dt) {
    const a = Date.now();
    W.step(dt);
    ms = Math.max(ms, Date.now() - a);
    if (fn && W.t >= next) { next = W.t + every; fn(W); }
  }
  return ms;
}

// ------------------------------------------------------------ mission 1
console.log('Mission 1 · Gather to One Place (3 Nephi 3)');
{
  const W = start('m1');
  const M = W.mission;
  ok(W.stronghold() && W.units('p').length === 8, 'starts with Zarahemla, 2 carts, 2 workers, 3 guards and Gidgiddoni');
  ok(M.villages.length === 5, 'five villages wait for the proclamation');
  ok(W.nearestResource(W.stronghold().tx, W.stronghold().ty, 'stone'), 'a rock face to quarry lies within reach of Zarahemla');
  // The border: a soldier ordered into the mountains stops at the edge of the wilderness.
  const g = W.units('p').find(u => u.def.hero);
  W.moveTo(g, 32, 3);
  ok(g.order.ty === D.BORDER_Y && W.msgs.some(m => m.ref === '3 Nephi 3:21'), 'Gidgiddoni won\'t march into the wilderness (3 Nephi 3:21)');

  // A simple player: soldiers visit the villages; the carts haul on their own; the city places
  // a barracks, four towers and the wall round about, the way mission 2 starts, and workers hurry them.
  const soldiers = W.soldiers();
  const plan = D.VILLAGES.map(v => [v.x + 1, v.y + 4]);
  soldiers.forEach((s, i) => W.moveTo(s, ...plan[i % plan.length]));
  const ring = [];
  for (let x = 21; x <= 42; x++) ring.push([x, 31]);
  for (let y = 32; y <= 46; y++) ring.push([21, y], [42, y]);
  for (let x = 22; x <= 41; x++) ring.push([x, 46]);
  const todo = [['barracks', 25, 38], ['tower', 23, 32], ['tower', 39, 32], ['tower', 23, 43], ['tower', 39, 43]].concat(ring.map(([x, y]) => ['wall', x, y]));
  let wonAt = null;
  const ms = run(W, 14 * 60 + 5, 1, W => {
    // Send someone to any village still waiting.
    for (const v of M.villages.filter(v => v.state === 'waiting')) {
      const s = W.soldiers().find(s => s.order.type === 'idle');
      if (s) W.moveTo(s, tileOf(v.x), tileOf(v.y) + 3);
    }
    // Stone for the towers: one cart quarries while it's short.
    quarry(W, W.units('p').filter(u => u.type === 'cart'));
    const all = W.units('p').filter(u => u.type === 'worker');
    const unbuilt = W.buildings('p').filter(b => !b.built);
    // Place the next thing when it can be paid for, with two builders on it.
    while (todo.length && unbuilt.length < 3) {
      const [type, x, y] = todo[0];
      if (!W.canPlace(type, x, y)) { todo.shift(); continue; }
      const cost = D.BUILDINGS[type].cost;
      if (!W.canAfford(cost)) break;
      const b = W.place(type, x, y, []);
      todo.shift();
      if (b) unbuilt.push(b);
    }
    for (const b of unbuilt) {
      const on = all.filter(u => u.order.type === 'build' && u.order.target === b.id).length;
      const free = all.filter(u => u.order.type !== 'build').sort((a, c) => S.dist(a, b) - S.dist(c, b)).slice(0, Math.max(0, 2 - on));
      for (const u of free) W.order(u, { type: 'build', target: b.id });
    }
    const barracks = W.buildings('p', 'barracks').find(b => b.built >= 1);
    if (barracks && barracks.queue.length < 2 && W.soldiers().filter(u => !u.def.hero).length + barracks.queue.length < 11) W.train(barracks, W.soldiers().length % 2 ? 'archer' : 'spearman');
    const s = W.stronghold();
    if (s && s.queue.length < 1 && W.units('p').filter(u => u.type === 'cart').length < 5) W.train(s, 'cart');
  });
  const obj = M.objectives(W);
  console.log('    ' + obj.map(o => `${o.text}: ${o.have}/${o.need}`).join(' · '));
  console.log(`    at ${Math.round(W.t)}s · grain ${Math.round(W.res.grain)} timber ${Math.round(W.res.timber)} · robbers defeated ${W.stats.defeated} · slowest step ${ms}ms`);
  ok(M.gathered() >= 4, 'the villages gathered to Zarahemla (3 Nephi 3:22)');
  ok(W.stats.defeated > 0, 'raiders came out of the hills and were beaten back');
  ok(W.over && W.over.won, 'the mission can be won: ' + (W.over ? W.over.title : 'not over'));
  ok(ms < 40, 'a step stays fast enough for 20 steps a second');
}

// ------------------------------------------------------------ mission 2
console.log('Mission 2 · The Robbers Come Down (3 Nephi 4)');
{
  const W = start('m2');
  const M = W.mission;
  ok(W.buildings('p').filter(b => b.def.wall).length > 60, 'Zarahemla starts fortified round about');
  run(W, 112);
  ok(M.phase === 'giddianhi' && M.wave.length === 23, 'in the nineteenth year Giddianhi comes up to battle with his armies');
  M.cry(W);
  ok(W.units('p').every(u => u.kneelUntil) && W.buffUntil > W.t, 'the Nephites fall to the earth and cry to the Lord (3 Nephi 4:8–10)');
  let ms = run(W, 400, 1, W => {
    if (M.phase === 'pursuit') for (const s of W.soldiers().filter(s => s.order.type === 'idle')) { const g = M.giddianhi; if (g && !g.dead) W.order(s, { type: 'attack', target: g.id }); }
  }, () => M.phase === 'interlude');
  ok(M.phase === 'interlude', 'the robbers fall back and the city holds (3 Nephi 4:12–15): ' + M.phase);
  console.log(`    at ${Math.round(W.t)}s · Giddianhi overtaken: ${M.giddianhiDown} · Zarahemla ${Math.round(W.stronghold().hp)} hp · fallen ${W.stats.fallen}`);
  ms = Math.max(ms, run(W, 80, 0, null, () => M.phase === 'siege'));
  ok(M.phase === 'siege' && M.camps.length === 4 && W.prov === 100, 'Zemnarihah lays siege round about (3 Nephi 4:16)');
  ok(W.soldiers().every(s => s.order.type !== 'idle' || (S.tileOf(s.y) > 31 && S.tileOf(s.x) > 21 && S.tileOf(s.x) < 42)), 'the armies are back inside the walls (3 Nephi 4:15)');
  const band = W.units('r').length, siegeAt = W.t;
  // Sit tight: the robbers' food runs out (3 Nephi 4:18–20).
  let low = 100;
  ms = Math.max(ms, run(W, 600, 1, W => { if (W.prov != null) low = Math.min(low, W.prov); }, () => M.phase !== 'siege'));
  ok(M.phase === 'night' || W.over, 'the robbers run out of food and give up the siege (3 Nephi 4:20–23): ' + M.phase);
  console.log(`    the siege lasted ${Math.round(W.t - siegeAt)}s · robbers ${band} → ${W.units('r').length}`);
  ok(W.units('r').length >= band / 2, 'most of the robbers are still there to cut off, when you wait them out');
  ok(W.borderOpen && W.night, 'night falls, and now the armies may go north (3 Nephi 4:24)');
  // In the night, put the armies in the way of their retreat: a few at each pass.
  W.soldiers().forEach((s, i) => W.moveTo(s, D.PASSES[i % 3] + (i % 2), 5 + ((i / 3) | 0) % 3));
  ms = Math.max(ms, run(W, 400, 2, W => {
    for (const s of W.soldiers().filter(s => s.order.type === 'idle')) {
      const r = W.units('r').sort((a, b) => S.dist(a, s) - S.dist(b, s))[0];
      if (r && S.dist(r, s) < 160) W.order(s, { type: 'attack', target: r.id });
    }
  }));
  console.log(`    prisoners ${W.stats.prisoners} · escaped ${W.stats.escaped} · of ${M.retreatTotal} · Zemnarihah taken: ${M.zemDown} · slowest step ${ms}ms`);
  ok(W.over && W.over.won, 'the mission ends in victory: ' + (W.over ? W.over.title + ' ★' + W.over.stars : 'not over'));
  ok(W.stats.prisoners > 0, 'robbers who are cut off give themselves up (3 Nephi 4:27)');
}

// ------------------------------------------------------------ mission 3
console.log('Mission 3 · At the River Sidon (Alma 43–44)');
{
  let W = start('m3');
  const M = W.mission, SD = D.SIDON;
  const put = (u, x, y) => { const [fx, fy] = W.freeTileNear(x, y, 'p'); W.moveTo(u, fx, fy); };
  ok(W.stronghold().name === 'Jershon' && M.host.length === M.hostTotal && W.border == null, 'Moroni meets them in Jershon; Zerahemnah\'s armies wait in Antionum');
  const s0 = W.soldiers().find(u => !u.def.hero);
  W.moveTo(s0, SD.ANTIONUM.x, SD.ANTIONUM.y);
  ok(W.msgs.some(m => m.ref === 'Alma 43:18') && !W.passable(SD.ANTIONUM.x, SD.ANTIONUM.y, 'p'), 'the Nephites don\'t march into Antionum');
  W.order(s0, { type: 'idle' });

  // Arm them and train more (43:18–19).
  const barracks = W.buildings('p', 'barracks')[0];
  W.research(barracks, 'breastplates');
  let ms = run(W, 400, 1, W => {
    if (barracks.queue.length < 2) W.train(barracks, barracks.queue.length % 2 ? 'archer' : 'spearman');
  }, () => M.phase !== 'arm');
  ok(M.phase === 'seek' && W.armor === 4, 'with breastplates and shields, the Lamanites are afraid and go into the wilderness (43:19–22) at ' + Math.round(W.t) + 's');

  // Spies after them, messengers to Alma (43:23–24).
  const troops = () => W.soldiers().filter(u => !u.def.hero);
  put(troops()[0], SD.TRACKS.x - 2, SD.TRACKS.y - 2);
  put(troops()[1], SD.ALMA.x + 2, SD.ALMA.y + 1);
  ms = Math.max(ms, run(W, 200, 1, null, () => M.phase !== 'seek'));
  ok(M.phase === 'ready' && W.route && W.cover.length === 2, 'the Lord shows Alma where they will come, and the spies find their course (43:24, 30)');

  // Leave guards in Jershon, gather Manti's quarter, hide the armies (43:25–32).
  const lehi = W.units('p').find(u => u.type === 'lehi'), moroni = W.units('p').find(u => u.type === 'moroni');
  const east = SD.COVER[0], west = SD.COVER[1];
  const spot = (c, i) => [c.x0 + 1 + (i % 4) * 2, c.y0 + 2 + Math.floor(i / 4) * 2];
  const list = troops();
  list.slice(0, 4).forEach((u, i) => put(u, SD.JERSHON.x + i, SD.JERSHON.y + 6));
  list.slice(4, 5).forEach(u => put(u, SD.VILLAGES[0].x + 1, SD.VILLAGES[0].y + 3));
  list.slice(5, 6).forEach(u => put(u, SD.VILLAGES[1].x + 1, SD.VILLAGES[1].y + 3));
  list.slice(6, 7).forEach(u => put(u, SD.VILLAGES[2].x + 1, SD.VILLAGES[2].y + 3));
  const eastArmy = [lehi, ...list.slice(7, 17)], westArmy = [moroni, ...list.slice(17)];
  eastArmy.forEach((u, i) => put(u, ...spot(east, i)));
  westArmy.forEach((u, i) => put(u, ...spot(west, i)));
  ms = Math.max(ms, run(W, 120, 2, W => {
    // The militia from the villages joins Moroni in the west valley.
    for (const u of troops().filter(u => u.order.type === 'idle' && !eastArmy.includes(u) && !westArmy.includes(u) && S.dist(u, W.stronghold()) > 10 * 32)) { westArmy.push(u); put(u, ...spot(west, westArmy.length)); }
  }, () => M.power(W) && M.power(W).id === 'come' && M.villages.every(v => v.state !== 'waiting')));
  ok(M.hiddenReady(W) && W.soldiers().some(u => W.hidden(u)), `armies hidden south of the hill Riplah (${M.inCover(W, 'east')}) and in the west valley (${M.inCover(W, 'west')}) (43:31–32)`);
  ok(M.villages.every(v => v.state !== 'waiting'), 'the people of that quarter gather to battle (43:26)');
  M.usePower(W, 'come');

  // They come past the hill, into the valley, and begin to cross: then Lehi (43:34–35).
  ms = Math.max(ms, run(W, 200, 0.5, null, () => M.power(W) && M.power(W).id === 'lehi'));
  const unseen = W.stats.fallen;
  ok(M.flags.crossing && !M.flags.raided, 'they pass the hidden armies and begin to cross the river Sidon; Jershon is guarded (43:25, 35)');
  M.usePower(W, 'lehi');
  ms = Math.max(ms, run(W, 200, 0.5, W => { if (M.power(W) && M.power(W).id === 'moroni') M.usePower(W, 'moroni'); }, () => M.phase === 'dragons' && M.flags.shrink));
  console.log(`    at ${Math.round(W.t)}s · Lamanites fallen ${W.stats.defeated} · Nephites fallen ${W.stats.fallen}`);
  ok(M.flags.moroni && M.phase === 'dragons', 'driven over the river, they meet Moroni, and fight like dragons (43:40–44): ' + M.phase);
  ok(M.power(W) && M.power(W).id === 'liberty', 'Moroni\'s men are about to shrink and flee (43:48)');
  M.usePower(W, 'liberty');
  ok(M.phase === 'flee' && W.boost.p > 1, 'they cry unto the Lord for their liberty, and the Lamanites flee to the waters (43:49–50)');

  // Encircle them on both sides of the river (43:52).
  ms = Math.max(ms, run(W, 30, 1));
  const g = SD.GATHER, rx = SD.river(g.y);
  W.soldiers().filter(u => S.tileOf(u.x) < rx).slice(0, 8).forEach((u, i) => put(u, g.x - 4 + (i % 4), g.y - 3 + Math.floor(i / 4) * 6));
  W.soldiers().filter(u => S.tileOf(u.x) > rx + 1).slice(0, 8).forEach((u, i) => put(u, rx + 3 + (i % 2), g.y - 2 + Math.floor(i / 2)));
  ms = Math.max(ms, run(W, 120, 1, null, () => M.phase === 'parley'));
  console.log(`    at ${Math.round(W.t)}s · Lamanites fallen ${W.stats.defeated} · Nephites fallen ${W.stats.fallen} · banks ${JSON.stringify(M.banks(W))}`);
  ok(M.phase === 'parley' && W.truce, 'encircled on both banks, Moroni stops the shedding of blood (43:52–54)');
  // Saved in the middle of the parley and loaded back (save.js), the story goes on from where it was: the rest of this test plays the loaded game.
  { const SAVE = require('../liberty/save.js'), snap = SAVE.dump(W, {}), steps = M.story.length;
    W = SAVE.load(JSON.parse(JSON.stringify(snap))).W;
    ok(!snap.lost.length && steps > 0 && M.story.length === steps && W.truce && W.mission === M, `a game saved in the middle of the parley, and loaded, keeps every step still to come (${steps})`); }
  const beforeCovenant = W.units('r').length;
  ms = Math.max(ms, run(W, 300, 1, null, () => W.over));
  console.log(`    Lamanites ${M.hostTotal}: ${W.stats.spared} spared by covenant · ${W.stats.defeated} fell · Nephites fallen ${W.stats.fallen} · at ${Math.round(W.t)}s · slowest step ${ms}ms`);
  ok(W.msgs.some(m => m.ref === 'Alma 44:15') && W.msgs.some(m => m.ref === 'Alma 44:19'), 'many make a covenant of peace, then Zerahemnah too (44:15–20)');
  ok(W.over && W.over.won && W.over.stars === 3, 'the war ends, Jershon kept, many spared: ' + (W.over ? W.over.title + ' ★' + W.over.stars : 'not over'));
  ok(W.stats.spared > 0 && W.stats.spared <= beforeCovenant, 'those who covenant depart into the wilderness (44:20)');
  ok(ms < 40, 'a step stays fast enough');
}

// ------------------------------------------------------------ free battle
console.log('Free battle · build a city, tear down the war camp');
{
  const FB = require('../liberty/missions.js').FREE_BATTLE;
  FB.level = 'normal';
  const W = new S.World(undefined, FB.map);
  W.mission = FB; FB.setup(W);
  const F = D.FREE;
  const std = W.units('p').find(u => u.def.deploys);
  ok(W.tech && std && !W.stronghold(), 'it starts with the standard of liberty, carts, workers and guards, and no city');
  ok(W.whyNotBuild('armory') === 'Needs Barracks' && W.whyNotTrain('stripling') === 'Needs Hall of the captains and Training ground', 'the armory needs a barracks first, and stripling warriors the hall of the captains and the training ground');
  ok(W.whyNotTrain('swordsman') === 'Needs Smithy' && W.whyNotTrain('spy') === 'Needs Training ground' && W.whyNotBuild('hall') === 'Needs Armory and Smithy', 'swordsmen come from the smithy, spies from the training ground, and the hall needs both the armory and the smithy');
  const city = W.deploy(std);
  ok(city && W.stronghold() === city && !W.units('p').some(u => u.def.deploys), 'planting the standard of liberty makes the city (Alma 46:36)');
  ok(W.foodCap() === 10 && W.storeCap() === 300, 'the city feeds 10 and stores 300 of each');
  W.res.timber = 290; W.gain('timber', 50);
  ok(W.res.timber === 300, 'more than the storehouses hold is lost');
  // Carts need a storehouse (play-test 2): in a skirmish the city takes no harvest; each storehouse brings a cart, like a refinery in Red Alert.
  { const cart = W.units('p').find(u => u.type === 'cart');
    ok(W.units('p').filter(u => u.type === 'cart').length === 1 && W.whyNotTrain('cart') === 'Needs Storehouse' && !W.nearestDropoff(cart), 'it starts with one cart; with no storehouse there is nowhere to bring the harvest, and no cart can be trained');
    W.order(cart, { type: 'idle' }); for (let i = 0; i < 20; i++) W.step(0.1);
    ok(cart.order.type === 'idle' && W.msgs.some(m => /horse carts have nowhere to bring the harvest: build a storehouse/.test(m.text)), 'so the cart waits, and you are told to build a storehouse');
    let spot = null; for (let r = 2; r < 9 && !spot; r++) for (let dy = -r; dy <= r && !spot; dy++) if (W.canPlace('storehouse', city.tx - 2 - r, city.ty + dy)) spot = [city.tx - 2 - r, city.ty + dy];
    W.res.timber += 60; const st = W.place('storehouse', spot[0], spot[1], []); W.res.timber -= 60;
    W.progress(st, 1);
    ok(W.units('p').filter(u => u.type === 'cart').length === 2 && W.msgs.some(m => m.text === 'A horse cart comes with the storehouse.') && W.nearestDropoff(cart) === st, 'a storehouse comes with a horse cart, and now the carts have somewhere to bring the harvest');
    W.order(cart, { type: 'idle' }); for (let i = 0; i < 5; i++) W.step(0.1);
    ok(cart.order.type === 'gather', 'and the waiting cart goes to work on its own'); }
  W.res = { grain: 200, timber: 250 };                 // what free battle starts with: no head start
  for (let i = 0; i < 3; i++) W.train(city, 'cart');
  ok(W.foodUsed() === 10 && W.whyNotTrain('cart').startsWith('Not enough food') && !W.train(city, 'cart'), 'with no food for more, no one else can be trained until a farm is built');
  ok(W.whyNotPlace('farm', city.tx + 20, city.ty) === 'far' && W.whyNotPlace('farm', city.tx + 5, city.ty) === '', 'a building must stand within reach of what you have (Red Alert\'s rule)');
  // Taking down what you built, and a gate where a wall piece stands (play-test 1).
  { const r0 = { ...W.res }; W.res.timber += 200; W.res.stone = (W.res.stone || 0) + 40;
    let spot = null; for (let r = 3; r < 9 && !spot; r++) for (let dx = -r; dx <= r && !spot; dx++) if (W.canPlace('wall', city.tx + dx, city.ty + city.h + r)) spot = [city.tx + dx, city.ty + city.h + r];
    const w = W.place('wall', spot[0], spot[1], []), t0 = W.res.timber;
    ok(W.sell(w) && w.dead && W.res.timber === t0 + W.costOf(D.BUILDINGS.wall, 'p', 'build').timber, 'a building still rising comes down with all it cost back');
    const w2 = W.place('wall', spot[0], spot[1], []); W.progress(w2, 1);
    ok(W.canPlace('gate', spot[0], spot[1]) && !W.canPlace('tower', spot[0], spot[1]), 'a gate may go where your own wall piece stands, nothing else may');
    const g = W.place('gate', spot[0], spot[1], []);
    ok(g && w2.dead && W.wallAt(spot[0], spot[1]) === null && W.occ[spot[1] * D.MAP_W + spot[0]] !== w2.id, 'the gate takes the wall piece\'s place');
    W.progress(g, 1); const s0 = W.res.stone;
    ok(W.sell(g) && W.res.stone === s0 + Math.floor(W.costOf(D.BUILDINGS.gate, 'p', 'build').stone / 2), 'a standing building comes down with half back (Red Alert\'s sell)');
    ok(!W.sell(city), 'the city itself cannot be taken down');
    W.res = r0; }
  { const far = W.place('farm', city.tx + 20, city.ty, []); ok(!far, 'so nothing can be built far off, near the enemy'); }
  // Stone: a rock face beside open ground holds it, a cart told to quarry brings it home, and towers take it.
  { const c = W.units('p').find(u => u.type === 'cart'), f = W.nearestResource(city.tx, city.ty, 'stone', c);
    ok(f && W.isResource(f[0], f[1], 'stone') && W.tile(f[0], f[1]) === D.T.ROCK, 'a rock face with stone lies within reach of the city');
    W.res.stone = 0; ok(!W.canAfford(D.BUILDINGS.tower.cost) && W.canAfford({ timber: 40 }), 'a watchtower can\'t go up without stone');
    ok(W.gatherAt(c, f[0], f[1]) && c.order.res === 'stone', 'tap a cart on a rock face and it quarries');
    run(W, 120, 1, () => {}); ok(W.res.stone > 0, `it brought stone home (${Math.round(W.res.stone)})`);
    ok(W.tile(f[0], f[1]) === D.T.ROCK, 'the rock face stays rock as it is worked');
    W.order(c, { type: 'idle' }); c.pref = null; }
  // The temple: your people near it are made whole; miracles are worked from it, each then waiting its time.
  { const t = W.addBuilding('temple', 'p', city.tx + 5, city.ty + 5, true), g = W.units('p').find(u => u.def.soldier);
    g.x = t.x + 40; g.y = t.y + 40; g.hp = 10;
    run(W, 20, 1, () => {}); ok(g.hp > 10, `a soldier beside the temple mends (${Math.round(g.hp)} hp after 20 s)`);
    const foes = ['lamanite', 'lamanite', 'slinger'].map(k => W.addUnit(k, 'r', t.x + 300, t.y));
    ok(W.whyNotMiracle('fire') === '' && W.miracle('fire', g.x, g.y), 'the pillar of fire can be worked');
    const hp = g.hp; W.damage(g, 50, foes[0]); ok(g.hp === hp, 'inside the ring of fire nothing harms your people (Helaman 5:23)');
    ok(W.whyNotMiracle('fire') === 'wait', 'and it must wait before it is worked again');
    ok(W.miracle('sleep', foes[0].x, foes[0].y) && foes.every(f => f.sleepUntil > W.t), 'a deep sleep falls on the enemies at the spot (Alma 55:16)');
    foes.forEach(f => { f.sleepUntil = 0; });
    ok(W.miracle('turn', foes[0].x, foes[0].y) && foes.some(f => f.order.type === 'attack' && foes.some(o => o.id === f.order.target)), 'confusion turns the enemies on each other (Judges 7:22)');
    const camp = FB.camps.find(c => !c.dead), chp = camp.hp;
    ok(W.miracle('quake', camp.x, camp.y) && camp.hp < chp, `the earthquake shakes a Lamanite camp (${Math.round(chp)} to ${Math.round(camp.hp)})`);
    g.hp = 5; g.poisonUntil = W.t + 10; g.poisonDps = 3; W.miracle('mercy'); ok(g.hp === (g.max || g.def.hp) && !(g.poisonUntil > W.t), 'mercy makes everyone whole (Alma 2:30), and purges poison');
    const sh = foes[2], shp = sh.hp; ok(W.miracle('shock', sh.x, sh.y, sh.id) && (sh.dead || (sh.hp < shp && sh.kneelUntil > W.t)), 'the shock throws one enemy down (1 Nephi 17:54)');
    for (const f of foes) if (!f.dead) W.kill(f);
    W.kill(t); }
  // The armory's new upgrades, the war camp's palisade, Lamanite ladders, and veteran ranks.
  { W.zones.length = 0;                                   // the temple's ring of fire is out
    const pal = W.buildings('r').filter(b => b.def.wall).length;
    ok(pal >= 20, `the war camp stands behind a palisade (${pal} pieces)`);
    // The training ground: a soldier trained while it stands comes out a veteran (Alma 53:21).
    { const spot = (t, dx, dy) => { for (let r = 0; r < 10; r++) for (let oy = -r; oy <= r; oy++) for (let ox = -r; ox <= r; ox++) if (W.canPlace(t, city.tx + dx + ox, city.ty + dy + oy)) return [city.tx + dx + ox, city.ty + dy + oy]; return null; };
      const [gx, gy] = spot('training', -7, -2), tg = W.addBuilding('training', 'p', gx, gy, true);
      const [bx, by] = spot('barracks', -8, -7), br = W.addBuilding('barracks', 'p', bx, by, true);
      const [fx, fy] = spot('farm', -4, -7), farm = W.addBuilding('farm', 'p', fx, fy, true);          // (food for him)
      W.res.grain += 100; W.res.timber += 100; const before = new Set(W.units('p').map(u => u.id)); W.truce = true;
      ok(W.train(br, 'spearman'), `with a training ground standing, the barracks still trains (${W.whyNotTrain('spearman') || 'ok'})`);
      let vet = null; for (let i = 0; i < 300 && !vet; i++) { W.step(0.1); vet = W.units('p').find(u => u.type === 'spearman' && !before.has(u.id)); }
      ok(vet && vet.rank === 1 && vet.hp > vet.def.hp, `a soldier trained beside the training ground comes out a veteran (Alma 53:21; rank ${vet && vet.rank}, ${vet && Math.round(vet.hp)} hp)`);
      W.truce = false; for (const b of [tg, br, farm]) W.remove(b); if (vet) W.remove(vet); }                  // (and the ground is cleared again)
    const a = W.addUnit('archer', 'p', city.x + 120, city.y + 120), r0 = W.rangeOf(a);
    W.bows = true; ok(W.rangeOf(a) > r0, 'bows of fine steel: archers shoot farther (1 Nephi 16:18)'); W.bows = false;
    const foe = W.addUnit('lamanite', 'r', a.x + 40, a.y), hp0 = a.hp;
    W.damage(a, 20, foe); const plain = hp0 - a.hp;
    a.hp = hp0; W.clothing = true; W.damage(a, 20, foe); ok(hp0 - a.hp < plain, 'thick clothing: archers take less harm (Alma 43:19)'); W.clothing = false;
    // a wall of yours across a Lamanite's way: with ladders he climbs it instead of breaking it
    W.truce = true;
    const wx = city.tx + 8, wy = city.ty, wall = [];                      // a long wall, so the way round is longer than the way over
    for (let y = wy - 9; y <= wy + 9; y++) if (W.canPlace('wall', wx, y)) wall.push(W.addBuilding('wall', 'p', wx, y, true));
    foe.x = (wx + 3) * 32 + 16; foe.y = wy * 32 + 16; foe.ladders = true; foe.hp = foe.def.hp; foe.scripted = true;   // (his own man, not the camp's)
    W.order(foe, { type: 'move', tx: wx - 3, ty: wy });
    let climbed = false;
    for (let i = 0; i < 250 && tileOf(foe.x) >= wx; i++) { W.step(0.1); climbed = climbed || !!foe.climbing; }
    ok(wall.length >= 12 && climbed && tileOf(foe.x) < wx && wall.every(w => !w.dead), `a Lamanite with ladders climbs over your wall without breaking it (Alma 49:22; ${wall.length} pieces, climbed ${climbed}, now at ${tileOf(foe.x)},${tileOf(foe.y)})`);
    for (const w of wall) W.remove(w);
    W.truce = false;
    // veteran ranks: three foes make a soldier valiant
    const v = W.units('p').find(u => u.def.soldier && !u.def.hero);
    for (let i = 0; i < 3; i++) W.kill(W.addUnit('lamanite', 'r', v.x + 300, v.y), v);
    ok(v.rank === 1 && v.max > v.def.hp, 'three foes make a soldier a veteran: more health and harder blows (Alma 53:20)');
    for (const w of wall) W.kill(w); W.kill(foe); W.kill(a); v.rank = 0; v.kills = 0; v.max = v.def.hp; }
  // Artifacts: the Jaredite ruins hold the sword of Laban, the Liahona and breastplates; right answers in a row bring the plates and the interpreters.
  { const relics = W.buildings('n').filter(b => b.def.relic);
    ok(relics.length === 4, `four Jaredite ruins stand on the map (${relics.length})`);
    const r = relics.find(b => b.artifact === 'breastplate'), s = W.addUnit('spearman', 'p', (r.tx - 1) * 32 + 16, r.ty * 32 + 16), armor0 = W.armor;
    run(W, 1, 0.1, () => {});
    ok(W.artifacts.breastplate && W.armor === armor0 + 2 && r.dead, 'a soldier beside a ruin finds the Jaredite breastplates: 2 more armor (Mosiah 8:10)');
    s.kills = 5;
    ok(W.grant('sword', 'test') && s.sword, 'the sword of Laban goes to your best soldier (1 Nephi 4:9)');
    const foe = W.addUnit('lamanite', 'r', s.x + 30, s.y), h0 = foe.hp; W.damage(foe, 10, s); const hit = h0 - foe.hp; W.kill(foe);
    const other = W.addUnit('spearman', 'p', s.x + 300, s.y), foe2 = W.addUnit('lamanite', 'r', other.x + 30, other.y), h1 = foe2.hp; W.damage(foe2, 10, other);
    ok(hit > h1 - foe2.hp, `the bearer strikes half again as hard (${hit.toFixed(1)} against ${(h1 - foe2.hp).toFixed(1)})`); W.kill(foe2);
    W.kill(s); ok(!s.sword && W.units('p').some(u => u.sword), 'when the bearer falls the sword passes on');
    W.kill(other);
    ok(W.grant('plates', 'test') && W.artifacts.plates, 'the brass plates: the armory works twice as fast (1 Nephi 5:10)');
    ok(W.grant('interpreters', 'test') && /Lamanites/.test(FB.nextAttack(W)), `the interpreters tell what comes next: "${FB.nextAttack(W)}" (Mosiah 8:17)`);
    ok(!W.grant('plates', 'test'), 'nothing is brought out twice');
    W.armor = armor0; }
  // Walls that level up, the ditch and its guards, and the great beasts of Ether 9:19 (art request 017).
  { const S = W.side('p'), R = W.side('r'), relics = W.buildings('n').filter(b => b.def.relic && !b.dead);
    const ruin = relics.find(b => b.artifact === 'beast'), w0 = W.units('p').filter(u => u.type === 'curelom').length;
    const scout = W.addUnit('worker', 'p', (ruin.tx - 1) * 32 + 16, ruin.ty * 32 + 16);
    run(W, 1, 0.1, () => {});
    ok(W.units('p').filter(u => u.type === 'curelom').length === w0 + 1 && ruin.dead, 'a ruin holds a great beast, tame: the Freemen find a curelom (Ether 9:19)');
    W.kill(scout); for (const u of W.units('p').filter(u => u.type === 'curelom')) W.remove(u);
    const armory = W.buildings('p', 'armory').find(b => b.built >= 1) || W.addBuilding('armory', 'p', city.tx + 7, city.ty + 6, true);
    const had = { ...S.researched }; delete S.researched.pickets;
    ok(!W.researchAt(armory).includes('stonewalls'), 'walls of stone come only after ridges of earth and pickets');
    S.researched.pickets = true;
    ok(W.researchAt(armory).includes('stonewalls'), 'and then the armory can make them');
    // a straight wall, raised to the third level by the research itself
    const wy = city.ty - 6; let wx = null;
    for (let x = city.tx - 8; x < city.tx + 8 && wx == null; x++) { let fits = true; for (let i = 0; i < 6; i++) if (!W.canPlace('wall', x + i, wy)) fits = false; if (fits && (x + wy) % 4 === 0) wx = x; }
    const line = []; for (let i = 0; i < 6; i++) line.push(W.addBuilding('wall', 'p', wx + i, wy, true));
    S.researching = { key: 'stonewalls', left: 0.01, by: armory.id }; W.step(0.05);
    ok(S.wallLevel === 3 && line.every(w => w.max === w.def.hp * 3), `the third level: walls three times as strong (${line[0].max})`);
    // the guard on every fourth piece casts a stone down on an enemy close below, and not on one farther off
    const guard = line.find(w => W.guarded(w)), near = W.addUnit('lamanite', 'r', guard.x, guard.y - 40), far = W.addUnit('lamanite', 'r', guard.x + 300, guard.y - 200);
    near.order = { type: 'idle' }; near.scripted = true; far.scripted = true; const h0 = near.hp, f0 = far.hp;
    for (let i = 0; i < 12; i++) { near.x = guard.x; near.y = guard.y - 40; W.step(0.1); }
    ok(line.filter(w => W.guarded(w)).length >= 1 && near.hp < h0 && far.hp === f0, `a guard casts stones down on enemies close below (Alma 49:22; ${h0} to ${Math.round(near.hp)})`);
    W.remove(near); W.remove(far);
    // the ditch: the same walk is slower beside the wall
    const walk = (y) => { const u = W.addUnit('lamanite', 'r', (wx - 3) * 32 + 16, y); u.scripted = true; W.order(u, { type: 'move', tx: wx + 9, ty: Math.floor(y / 32) }); for (let i = 0; i < 20; i++) W.step(0.1); const d = u.x - ((wx - 3) * 32 + 16); W.remove(u); return d; };
    const by = walk((wy - 1) * 32 + 16), open = walk((wy - 6) * 32 + 16);
    ok(by < open * 0.85, `the ditch slows those who come at the wall (${Math.round(by)} against ${Math.round(open)} in 2s; Alma 49:18)`);
    for (const w of line) W.remove(w); S.wallLevel = 1; S.wallMul = 1; S.researched = had;
    // the beasts: three mouths each, strong, and brought down by spearmen and Lamanite warriors
    const food0 = W.foodUsed(), cu = W.addUnit('curelom', 'p', city.x + 400, city.y + 300);
    ok(W.foodUsed() === food0 + 3, 'a curelom eats for three');
    const sp = W.addUnit('spearman', 'p', cu.x + 60, cu.y), sw = W.addUnit('swordsman', 'p', cu.x + 60, cu.y + 30), cm = W.addUnit('cumom', 'r', cu.x + 30, cu.y);
    const hitBy = (from, to) => { const h = to.hp; W.damage(to, 10, from); const d = h - to.hp; to.hp = h; return d; };
    ok(hitBy(sp, cm) > hitBy(sw, cm) * 1.3, 'spearmen strike a great beast half again as hard');
    const lm = W.addUnit('lamanite', 'r', cu.x - 30, cu.y), sl = W.addUnit('slinger', 'r', cu.x - 30, cu.y + 30);
    ok(hitBy(lm, cu) > hitBy(sl, cu) * 1.3, 'and so do Lamanite warriors');
    const tower = W.addBuilding('tower', 'p', city.tx + 9, city.ty - 3, true), hb = (f) => { const h = tower.hp; W.damage(tower, f.def.dmg, f); const d = h - tower.hp; tower.hp = h; return d; };
    ok(hb(cm) > hb(lm) * 4, `the cumom butts down buildings (${hb(cm).toFixed(0)} a blow against a warrior's ${hb(lm).toFixed(0)})`);
    for (const u of [cu, sp, sw, cm, lm, sl]) W.remove(u); W.remove(tower); }

  // A steady player: the carts haul on their own; build up the tree, keep an army home, then march on the camps.
  const S0 = { x: city.tx, y: city.ty };
  const plan = [['farm', 4, -3], ['barracks', 6, 1], ['farm', -3, -3], ['granary', -3, 1], ['armory', 6, 5], ['farm', 0, 6],
    ['smithy', 9, 5], ['training', -7, -2], ['stables', -4, 5], ['hall', -8, 2], ['farm', 3, 9], ['tower', 7, -5], ['farm', -6, -1], ['granary', 10, 3], ['farm', -1, -6], ['farm', 13, 0], ['farm', -6, 8], ['temple', 12, 6]];
  const research = { armory: ['breastplates', 'clothing', 'pickets'], smithy: ['cimeters', 'bows'], hall: ['ladders'] };
  let attackAt = null, blocked = 0;
  const workers = () => W.units('p').filter(u => u.type === 'worker'), carts = () => W.units('p').filter(u => u.type === 'cart');
  const army = () => W.soldiers().filter(u => !u.def.hero);
  let selfBuilt = false;
  const ms = run(W, 45 * 60, 1, W => {
    // Build the next thing; it rises on its own, and the two workers hurry it.
    const unbuilt = W.buildings('p').filter(b => b.built < 1);
    if (plan.length && unbuilt.length < 2) {
      const [type, dx, dy] = plan[0];
      if (W.whyNotBuild(type)) blocked++;
      else if (W.canAfford(D.BUILDINGS[type].cost)) {
        // The nearest open ground to where it's wanted.
        let spot = null;
        for (let r = 0; r < 8 && !spot; r++) for (let oy = -r; oy <= r && !spot; oy++) for (let ox = -r; ox <= r && !spot; ox++) if (W.canPlace(type, S0.x + dx + ox, S0.y + dy + oy)) spot = [S0.x + dx + ox, S0.y + dy + oy];
        const b = spot && W.place(type, spot[0], spot[1], []);
        plan.shift();
        if (b) unbuilt.push(b);
      }
    }
    for (const b of unbuilt) {
      const on = workers().filter(u => u.order.type === 'build' && u.order.target === b.id).length;
      workers().filter(u => u.order.type !== 'build').sort((a, c) => S.dist(a, b) - S.dist(c, b)).slice(0, Math.max(0, 2 - on)).forEach(u => W.order(u, { type: 'build', target: b.id }));
    }
    // A building with no worker beside it still rises.
    if (!selfBuilt) { const lone = unbuilt.find(b => b.built > 0.2 && !workers().some(u => u.order.type === 'build' && u.order.target === b.id)); if (lone) selfBuilt = true; }
    quarry(W, carts());
    for (const u of carts()) u.idleFor = u.order.type === 'idle' ? (u.idleFor || 0) + 1 : 0;   // (a cart idles for a moment between trips; stuck is longer)
    // Keep grain and timber about even: point a cart at whichever is short.
    const much = W.res.grain > W.res.timber + 250 ? 'grain' : W.res.timber > W.res.grain + 250 ? 'timber' : null;
    const mover = much && carts().find(u => u.order.type === 'gather' && u.order.res === much);
    if (mover) { mover.pref = much === 'grain' ? 'timber' : 'grain'; const f = W.nearestResource(S0.x + 2, S0.y + 2, mover.pref); if (f) W.gatherAt(mover, f[0], f[1]); }
    if (W.temple() && !W.whyNotMiracle('mercy') && W.units('p').some(u => u.hp < (u.max || u.def.hp) * 0.5)) W.miracle('mercy');
    if (process.env.DIAG && Math.floor(W.t) % 30 === 0 && Math.floor(W.t) !== (W._diag || 0)) { W._diag = Math.floor(W.t); console.log(`      diag t=${Math.floor(W.t)} army=${army().length} carts=${carts().length} workers=${workers().length} bld=${W.buildings('p').map(b => b.type[0] + (b.built < 1 ? '~' : '')).join('')} g/t/s=${Math.round(W.res.grain)}/${Math.round(W.res.timber)}/${Math.round(W.res.stone)} plan=${plan[0] ? plan[0][0] : '-'} foes=${[...W.ents.values()].filter(e => e.kind === 'unit' && e.team === 'r' && !e.dead).length} timberNear=${JSON.stringify(W.nearestResource(S0.x, S0.y, 'timber'))} cartsAt=${carts().map(u => tileOf(u.x) + ',' + tileOf(u.y) + ':' + u.order.type + ':' + (u.order.res || '') + ':' + (u.phase || '') + ':' + (u.carry ? u.carry.type + u.carry.amt : 0) + ':' + (u.pref || '')).join(' ')} msg=${(W.msgs.slice(-1)[0] || {}).text}`); }
    // Research first, then train: carts, then soldiers.
    for (const [type, keys] of Object.entries(research)) { const b = W.buildings('p', type).find(b => b.built >= 1); if (b && !W.researching && keys.length && W.research(b, keys[0])) { keys.shift(); break; } }   // and train meanwhile
    const s = W.stronghold();
    if (s && s.queue.length < 1 && carts().length < 4) W.train(s, 'cart');
    const st = W.buildings('p', 'stables').find(b => b.built >= 1);
    if (st && st.queue.length < 1 && carts().length < 5) W.train(st, 'cart');
    // Save up for the big buildings rather than spending it all on soldiers.
    if (plan.length && ['armory', 'smithy', 'training', 'stables', 'hall', 'temple'].includes(plan[0][0]) && !W.whyNotBuild(plan[0][0]) && !W.canAfford(D.BUILDINGS[plan[0][0]].cost) && army().length >= 6) return;
    const br = W.buildings('p', 'barracks').find(b => b.built >= 1), hall = W.buildings('p', 'hall').find(b => b.built >= 1);
    // A spy goes to see what the nearest ruin holds.
    const spy = W.units('p').find(u => u.type === 'spy'), relic = W.buildings('n').filter(b => b.def.relic && !b.dead).sort((a, b) => S.dist(a, s || a) - S.dist(b, s || b))[0];
    if (br && !spy && (W.trained.spy || 0) < 2 && relic && !br.queue.length) W.train(br, 'spy');
    if (spy && relic && spy.order.type === 'idle') W.order(spy, { type: 'move', goal: W.rectOf(relic), near: true });
    if (hall && hall.queue.length < 1) W.train(hall, !(W.trained.stripling || 0) || army().length % 3 ? 'stripling' : 'javelin');   // the hall first: its men cost more
    if (br && br.queue.length < 2) W.train(br, W.has('armory') ? (army().length % 2 ? 'archer' : 'swordsman') : (army().length % 2 ? 'nslinger' : 'spearman'));
    // March out once the army is strong, and tear down the camps, then the war camp.
    if (!attackAt && (army().length >= 30 || W.t > 16 * 60)) attackAt = W.t;
    if (attackAt) {
      const targets = FB.camps.filter(c => !c.dead).concat(FB.warcamp.dead ? [] : [FB.warcamp]);
      const t = targets.sort((a, b) => S.dist(a, s || a) - S.dist(b, s || b))[0];
      if (t) for (const u of army().filter(u => u.order.type === 'idle')) W.order(u, { type: 'attack', target: t.id });
    }
  });
  console.log(`    at ${Math.round(W.t / 60)} min · marches ${FB.camp.marches} · army ${army().length} · carts ${carts().length} · food ${W.foodUsed()}/${W.foodCap()} · store ${W.storeCap()} · slowest step ${ms}ms`);
  ok(selfBuilt, 'buildings rise on their own once placed, with no worker beside them');
  ok(carts().every(u => (u.idleFor || 0) < 3) && carts().length >= 4, 'idle carts go and haul on their own (' + carts().length + ' carts, none left idle)');
  ok(W.researched.breastplates && W.armor === 4 && W.dmgUp === 3 && W.researched.cimeters && W.buildings('p').filter(b => b.def.wall).every(b => b.max === b.def.hp * 2), 'the armory made breastplates and pickets, and the smithy cimeters');
  ok(W.trained.stripling > 0 && W.trained.cart > 0, `the hall trains stripling warriors (${W.trained.stripling || 0}), and the stables horse carts (${W.trained.cart || 0})`);
  ok(FB.camp.marches >= 2, 'the Lamanites marched on the city, again and again (' + FB.camp.marches + ' marches)');
  ok(W.over && W.over.won && W.over.stars === 2, 'the war camp falls: ' + (W.over ? W.over.title + ' ★' + W.over.stars : 'not over'));
  { const worked = W.msgs.filter(m => /^Their Rameumptom: /.test(m.text)).map(m => m.text.slice(18, -1));
    console.log(`    the King-men opponent worked from its Rameumptom: ${worked.join(', ') || 'nothing'}`); }
  ok(ms < 40, 'a step stays fast enough with a whole city');
}

// ------------------------------------------------------------ free battle as the King-men
{
  console.log('Free battle as the King-men · pick a side, then a captain');
  const FB = require('../liberty/missions.js').FREE_BATTLE, CAMP = require('../liberty/camp.js');
  const spotNear = (W, home, t, dx, dy) => { for (let r = 0; r < 14; r++) for (let oy = -r; oy <= r; oy++) for (let ox = -r; ox <= r; ox++) if (W.canPlace(t, home.tx + dx + ox, home.ty + dy + oy)) return [home.tx + dx + ox, home.ty + dy + oy]; return null; };
  // The captains' gifts and the Rameumptom's works, in a world of their own.
  { FB.level = 'normal'; FB.side = 'kingmen'; FB.captain = 'ammoron';
    const W = new S.World(undefined, FB.map); W.mission = FB; FB.setup(W);
    ok(W.side('p').side === 'kingmen' && W.side('r').side === 'freemen' && W.side('p').captain.name === 'Ammoron' && D.CAPTAINS.freemen[FB.theirCaptain], 'the human holds the King-men under Ammoron; the opponent holds the Freemen under a captain of its own');
    { const zara = W.buildings('r', 'stronghold')[0], towers = W.buildings('r', 'tower').filter(t => S.dist(t, zara) < 9 * 32);
      ok(towers.length === FB.LEVELS.normal.cityTowers, `Zarahemla stands behind watchtowers of its own (${towers.length} on Normal), as the war camp has its lookouts`); }
    // Saving for its temple, the Freemen opponent makes no upgrades meanwhile (they would spend what it's saving).
    { const C = FB.camp, R = W.side('r'), was = { ...R.res }, keep = C.nextWanted;
      const zara = W.buildings('r', 'stronghold')[0], arm = W.addBuilding('armory', 'r', zara.tx - 6, zara.ty + 6, true);
      C.nextWanted = () => 'temple';
      R.res = { grain: 100, timber: 150, stone: 0 };                         // enough for an upgrade, not for the temple
      C.research();
      ok(!R.researching && C.roomFor('temple'), 'saving for its temple, the Freemen opponent makes no upgrade meanwhile');
      C.nextWanted = keep; delete C.nextWanted; R.res = was; W.remove(arm); }
    const camp = W.stronghold();
    ok(camp && camp.type === 'warcamp' && camp.name === 'Your camp' && W.units('p').some(u => u.type === 'ammoron') && W.units('p').filter(u => u.type === 'bearer').length === 2, 'the King-men start with their war camp, two bearers, a few warriors and their captain');
    ok(W.buildings('r', 'stronghold').length === 1 && W.units('r').some(u => u.def.hero) && FB.targets()[0].type === 'stronghold', 'the Freemen opponent starts with Zarahemla, its guards and its captain; Zarahemla is what you must tear down');
    ok(W.whyNotTrain('lamanite') === '' && W.whyNotBuild('rameumptom') === "Needs Chief captain's pavilion" && W.whyNotBuild('idol') === 'Needs Rameumptom' && W.foodHint('p') === 'pitch tents', "the King-men's tree: warriors now, the Rameumptom after the pavilion, idols after it; food comes from tents" + ` (${W.whyNotBuild('idol')})`);
    ok(W.costOf(D.UNITS.lamanite, 'p', 'train').grain === 24 && W.costOf(D.UNITS.amalekite, 'p', 'train').grain === 60, "Ammoron's gift: warriors cost less (24 grain), captains the same");
    W.side('p').captain = D.CAPTAINS.kingmen.zerahemnah;
    ok(W.costOf(D.UNITS.amalekite, 'p', 'train').grain === 42 && W.costOf(D.UNITS.lamanite, 'p', 'train').grain === 30, "Zerahemnah's gift: captains cost less (42 grain)");
    { const R = W.side('r'), was = R.captain; R.captain = D.CAPTAINS.freemen.moroni;
      ok(W.costOf(D.BUILDINGS.wall, 'r', 'build').timber === 3 && W.costOf(D.BUILDINGS.gate, 'r', 'build').stone === 8, "Moroni's gift: earthworks and gates cost half");
      R.captain = D.CAPTAINS.freemen.teancum; const j = W.addUnit('javelin', 'r', camp.x + 600, camp.y + 600);
      ok(W.rangeOf(j) === D.UNITS.javelin.range + 30, "Teancum's gift: javelin throwers reach farther"); W.remove(j); R.captain = was; }
    W.side('p').captain = D.CAPTAINS.kingmen.amalickiah;
    W.res = { grain: 900, timber: 900, stone: 100 }; W.truce = true;
    const at = (t, dx, dy) => { const s = spotNear(W, camp, t, dx, dy); return W.addBuilding(t, 'p', s[0], s[1], true); };
    const muster = at('muster', 0, 9), court = at('rameumptom', 5, 12), dance = at('wardance', -7, 9);
    ok(W.temple() === court && court.w === 4 && W.whyNotMiracle('poison') === '' && W.whyNotMiracle('flattery') === '' && W.whyNotMiracle('fire') === 'temple', 'the Rameumptom (4 x 4) works poison, bloodthirst and cunning, not miracles (Alma 31:21)');
    ok(W.costOf(D.UNITS.lamanite, 'p', 'train').grain === 24, 'while the Rameumptom stands, warriors cost less (Alma 49:6)');
    const city = W.buildings('r', 'stronghold')[0];
    const foe = W.addUnit('spearman', 'r', camp.x + 200, camp.y + 320), foe2 = W.addUnit('spearman', 'r', foe.x + 30, foe.y);
    ok(W.miracle('flattery', foe.x, foe.y, foe.id) && foe.turnUntil > W.t && foe.order.type === 'attack' && foe.order.target === foe2.id, 'flattery turns one enemy on his own (Alma 46:5)');
    ok(W.miracle('dissension', city.x, city.y, city.id) && city.stalledUntil > W.t, "dissension stops an enemy building's work for a while (Alma 53:8)");
    { city.queue.push({ type: 'cart', left: 30 }); for (let i = 0; i < 20; i++) W.step(0.1); ok(city.queue[0] && city.queue[0].left === 30, 'while it lasts, nothing is trained there'); }
    const n0 = W.units('p').filter(u => u.type === 'lamanite').length;
    ok(W.miracle('host') && W.units('p').filter(u => u.type === 'lamanite').length === n0 + 6, "the king's call brings six warriors at once (Alma 48:3)");
    { const seen = () => { const e = W.enemiesNear(foe2, 'r', 400, true); return e && (e.def.foe || e.def.soldier) ? e.type : ''; };   // (a bearer with his knife is no warrior)
      ok(W.miracle('stratagem') && W.units('p').filter(u => u.def.foe).every(u => W.hidden(u)) && !seen(), 'by stratagem your warriors go unseen until they strike (Alma 58:6)' + (seen() ? ' (seen: ' + seen() + ')' : '')); }
    ok(W.miracleWait('stratagem') > 0 && W.miracleWait('stratagem') <= D.CUNNING.stratagem.wait * 0.5 + 0.01, "Amalickiah's gift: cunning waits half as long");
    { const before = new Set(W.units('p').map(u => u.id)); W.train(muster, 'lamanite'); let w = null; for (let i = 0; i < 200 && !w; i++) { W.step(0.1); w = W.units('p').find(u => u.type === 'lamanite' && !before.has(u.id)); }
      ok(w && w.fierceUntil > W.t, 'from the war-dance ground a warrior comes out fierce for a while (Alma 48:3)'); }
    // The Rameumptom's own works (018): bloodthirst, poison by degrees, and the idols' zeal.
    { const band = W.units('p').filter(u => u.type === 'lamanite').slice(0, 4), c = band[0];
      for (const u of band) { u.x = c.x + (u.id % 3) * 10; u.y = c.y; W.order(u, { type: 'idle' }); }
      W.side('p').ready.bloodthirst = 0;
      ok(W.miracle('bloodthirst', c.x, c.y) && band.every(u => u.thirstUntil > W.t), 'bloodthirst takes the warriors at the spot (Moroni 9:5)');
      const T = W.addBuilding('temple', 'r', city.tx - 6, city.ty, true); W.side('r').ready.fire = 0; W.side('r').ready.sleep = 0;
      ok(W.miracle('fire', c.x, c.y, null, 'r') && band.every(u => !(u.fearUntil > W.t)), "the pillar of fire doesn't turn back the bloodthirsty");
      W.zones = W.zones.filter(z => z.kind !== 'fire');
      ok(W.miracle('sleep', c.x, c.y, null, 'r') && band.every(u => !(u.sleepUntil > W.t)), 'nor does a deep sleep fall on them');
      W.truce = false;
      const dummy = W.addUnit('spearman', 'r', c.x + 400, c.y + 400), plain = band.find(u => u !== c);
      plain.thirstUntil = 0; let h = dummy.hp; W.damage(dummy, 20, plain); const d0 = h - dummy.hp; h = dummy.hp; W.damage(dummy, 20, c); const d1 = h - dummy.hp;
      ok(d1 > d0 * 1.4, `the bloodthirsty strike half again as hard (${d0.toFixed(1)} then ${d1.toFixed(1)})`);
      W.remove(dummy);
      const v = W.addUnit('spearman', 'r', c.x + 600, c.y - 300), mx = S.maxHp(v); W.side('p').ready.poison = 0;
      ok(W.miracle('poison', v.x, v.y, v.id) && v.poisonUntil > W.t, 'poison is given to one enemy (Alma 47:18)');
      for (let i = 0; i < 80; i++) W.step(0.1);
      ok(v.dead || (v.hp < mx * 0.75 && v.hp > mx * 0.5), `by degrees: after 8 s about half his strength is gone (${Math.round(v.hp)} of ${mx})`);
      for (let i = 0; i < 80; i++) W.step(0.1);
      ok(v.dead || v.hp <= mx * 0.3, `after 15 s, three quarters (${Math.round(v.hp)} of ${mx})`);
      W.truce = true; W.kill(T);
      for (let i = 0; i < 4; i++) at('idol', 12 + i * 4, 0);
      W.side('p').ready.dissension = 0; W.miracle('dissension', city.x, city.y, city.id);
      ok(Math.abs(W.miracleWait('dissension') - D.CUNNING.dissension.wait * 0.5 * 0.5) < 0.01, `three idols (a fourth adds nothing) bring the works back half again sooner (${W.miracleWait('dissension').toFixed(1)} s)`); } }
  // The opponents work their powers where the fighting is (camp.js: works), and not at Easy.
  for (const level of ['normal', 'easy']) { FB.level = level; FB.side = 'kingmen'; FB.captain = 'ammoron';
    const W = new S.World(undefined, FB.map); W.mission = FB; FB.setup(W); W.truce = true;
    const city = W.buildings('r', 'stronghold')[0], bot = FB.camp;
    W.addBuilding('temple', 'r', city.tx - 6, city.ty, true);
    const x = city.x + 300, y = city.y + 300;
    const mine = [0, 1, 2, 3, 4].map(i => W.addUnit('spearman', 'r', x + i * 12, y)), foes = [0, 1, 2, 3, 4].map(i => W.addUnit('lamanite', 'p', x + i * 12, y + 40));
    bot.works();
    const worked = Object.keys(W.side('r').ready).filter(k => W.side('r').ready[k] > W.t);
    if (level === 'normal') ok(worked.length === 1 && W.msgs.some(m => /^Their temple: /.test(m.text)), `the Freemen opponent works a miracle where the fighting is (${worked.join(', ')})`);
    else ok(!worked.length, 'at Easy the opponents work no powers');
    for (const u of mine.concat(foes)) W.remove(u); }
  // A steady King-men player: tents and a muster ground, bearers hauling, works from the Rameumptom, then the host marches on Zarahemla.
  { FB.level = 'normal'; FB.side = 'kingmen'; FB.captain = 'ammoron';
    const W = new S.World(undefined, FB.map); W.mission = FB; FB.setup(W);
    const camp = W.stronghold(), S0 = { x: camp.tx, y: camp.ty };
    const plan = [['storetent', -6, 9], ['tents', 0, 8], ['muster', 4, 8], ['tents', -4, 8], ['tents', 8, -2], ['shieldtent', -4, 12], ['tents', 0, 12], ['pavilion', 4, 12], ['tents', 8, 6], ['wardance', -8, 4], ['tents', -8, 0],
      ['rameumptom', 9, 10], ['tents', 12, 2], ['muster', -8, 8], ['tents', 12, 6], ['tents', -8, -4], ['ladderworks', 2, 15], ['tents', 12, 10], ['tents', -12, 4], ['tents', 16, 2], ['tents', -12, 0], ['tents', 16, 6]];
    const research = { shieldtent: ['lshields', 'skins'], ladderworks: ['lladders'] };
    const bearers = () => W.units('p').filter(u => u.type === 'bearer'), army = () => W.soldiers('p').filter(u => !u.def.hero);
    let attackAt = null, raised = false;
    const ms = run(W, 30 * 60, 1, W => {
      if (W.buildings('r', 'barracks').some(b => b.built >= 1) && W.buildings('r', 'farm').filter(b => b.built >= 1).length >= 2) raised = true;   // (seen while it stands: it may be torn down by the end)
      if (camp.queue.length < 1 && bearers().length < 8) W.train(camp, 'bearer');
      const unbuilt = W.buildings('p').filter(b => b.built < 1);
      if (plan.length && unbuilt.length < 2) {
        const [type, dx, dy] = plan[0];
        if (!W.whyNotBuild(type) && W.canAfford(W.costOf(D.BUILDINGS[type], 'p', 'build'))) { const s = spotNear(W, camp, type, dx, dy); const b = s && W.place(type, s[0], s[1], []); plan.shift(); if (b) unbuilt.push(b); }
      }
      for (const b of unbuilt) if (!bearers().some(u => u.order.type === 'build' && u.order.target === b.id)) {   // one bearer hurries each
        const u = bearers().filter(u => u.order.type !== 'build' && !u.carry).sort((p, q) => S.dist(p, b) - S.dist(q, b))[0]; if (u) W.order(u, { type: 'build', target: b.id }); }
      const much = W.res.grain > W.res.timber + 200 ? 'grain' : W.res.timber > W.res.grain + 200 ? 'timber' : null;
      const mover = much && bearers().find(u => u.order.type === 'gather' && u.order.res === much);
      if (mover) { mover.pref = much === 'grain' ? 'timber' : 'grain'; const f = W.nearestResource(S0.x + 2, S0.y + 2, mover.pref); if (f) W.gatherAt(mover, f[0], f[1]); }
      for (const [type, keys] of Object.entries(research)) { const b = W.buildings('p', type).find(b => b.built >= 1); if (b && !W.researching && keys.length && W.research(b, keys[0])) { keys.shift(); break; } }
      // Cunning: the king's call whenever it can be, dissension on Zarahemla, stratagem as the host goes, flattery on a raider.
      const city = W.buildings('r', 'stronghold')[0];
      if (W.temple()) {
        if (!W.whyNotMiracle('host')) W.miracle('host');
        if (city && !city.dead && !W.whyNotMiracle('dissension')) W.miracle('dissension', city.x, city.y, city.id);
        if (attackAt && !W.whyNotMiracle('stratagem')) W.miracle('stratagem');
      }
      const big = plan.length && ['muster', 'shieldtent', 'pavilion', 'rameumptom'].includes(plan[0][0]) && !W.whyNotBuild(plan[0][0]) && !W.canAfford(W.costOf(D.BUILDINGS[plan[0][0]], 'p', 'build')) && army().length >= 6;
      const pav = W.buildings('p', 'pavilion').find(b => b.built >= 1);
      if (!big) {
        if (pav && pav.queue.length < 1 && army().length >= 8 && army().filter(u => u.def.needs).length < army().length / 5) W.train(pav, army().length % 2 ? 'amalekite' : 'zoramite');
        for (const g of W.buildings('p', 'muster').filter(b => b.built >= 1)) if (g.queue.length < 2) W.train(g, army().length % 3 === 2 ? 'slinger' : 'lamanite');
      }
      // Raiders by the camp: the idle warriors fall on them.
      const raiders = W.units('r').filter(e => e.def.dmg && !e.dead && W.buildings('p').some(b => S.dist(b, e) < 300));
      if (raiders.length) {
        for (const u of army().filter(u => u.order.type === 'idle' || (u.order.type === 'attack' && !W.ents.get(u.order.target)))) { const t = raiders.sort((a, b) => S.dist(a, u) - S.dist(b, u))[0]; W.order(u, { type: 'attack', target: t.id }); }
        if (W.temple() && !W.whyNotMiracle('flattery')) W.miracle('flattery', raiders[0].x, raiders[0].y, raiders[0].id);
      }
      // (and comes back when the raiders run home: no chasing them into Zarahemla's guns before the army is ready)
      if (!attackAt) for (const u of army()) { const t = u.order.type === 'attack' && W.ents.get(u.order.target); if (t && t.kind === 'unit' && !W.buildings('p').some(b => S.dist(b, t) < 360)) W.order(u, { type: 'move', tx: S0.x + 2, ty: S0.y + 9 }); }
      if (!attackAt && ((army().length >= 55 && W.buildings('p', 'rameumptom').some(b => b.built >= 1)) || W.t > 16 * 60)) attackAt = W.t;   // a great host, with the Rameumptom's works behind it
      if (attackAt) { const t = W.buildings('r').filter(b => !b.dead && !b.def.wall).sort((a, b) => S.dist(a, camp) - S.dist(b, camp))[0]; if (t) for (const u of army().filter(u => u.order.type === 'idle').slice(8)) W.order(u, { type: 'attack', target: t.id }); }   // (eight stay home)
      if (process.env.DIAG && Math.floor(W.t) % 60 === 0 && Math.floor(W.t) !== (W._diag || 0)) { W._diag = Math.floor(W.t); console.log(`      diag t=${Math.floor(W.t)} mine=${army().length} theirs=${W.soldiers('r').length} myBld=${W.buildings('p').filter(b => b.def.cost && !b.def.wall).map(b => b.type[0]).join('')} theirBld=${W.buildings('r').filter(b => b.def.cost && !b.def.wall).map(b => b.type[0]).join('')} g/t=${Math.round(W.res.grain)}/${Math.round(W.res.timber)} marches ${FB.camp.marches} city=${city ? Math.round(city.hp) : 'down'}`); }
    });
    console.log(`    at ${Math.round(W.t / 60)} min · their marches ${FB.camp.marches} · my army ${army().length} · their army ${W.soldiers('r').length} · fallen ${W.stats.fallen} · defeated ${W.stats.defeated} · slowest step ${ms}ms`);
    ok(raised && FB.camp.marches >= 2, `the Freemen opponent raised farms and a barracks and marched on the camp, again and again (${FB.camp.marches} marches)`);
    ok((W.trained.lamanite || 0) >= 8 && W.buildings('p', 'muster').length >= 1 && W.buildings('p', 'rameumptom').length === 1, `the King-men player raised a muster ground and the Rameumptom and trained warriors (${W.trained.lamanite || 0})`);
    ok(W.over && W.over.won && W.t < 20 * 60, 'Zarahemla falls within 20 minutes: ' + (W.over ? W.over.title + ' ★' + W.over.stars : 'not over'));
    { const worked = W.msgs.filter(m => /^Their temple: /.test(m.text)).map(m => m.text.slice(14, -1));
      console.log(`    the Freemen opponent worked from its temple: ${worked.join(', ') || 'nothing (it had none yet)'}`); }
    ok(ms < 40, 'a step stays fast enough with two camps');
    FB.side = 'freemen'; FB.captain = 'moroni'; }
}

// ------------------------------------------------------------ out of the wilderness
// ------------------------------------------------------------ Blake's gameplay review: fighting on the way, falling back, the levels
console.log('Fighting on the way · Blake\'s gameplay review');
{
  const FB = require('../liberty/missions.js').FREE_BATTLE;
  FB.level = 'normal'; FB.side = 'freemen'; FB.captain = Object.keys(D.CAPTAINS.freemen)[0];
  const W = new S.World(undefined, FB.map); W.mission = FB; FB.setup(W);
  const city = W.deploy(W.units('p').find(u => u.def.deploys));
  const x0 = city.x + 64, y0 = city.y - 6 * 32, far = tileOf(x0) + 14;            // (open ground above the city)
  const man = (type, team, x, y) => { const u = W.addUnit(type, team, x, y); u.scripted = true; return u; };
  // A soldier sent across the field (the way the game sends them now) fights the enemy he meets, then goes on.
  { const s = man('spearman', 'p', x0, y0), foe = man('lamanite', 'r', x0 + 120, y0);
    W.moveTo(s, far, tileOf(y0), true); for (let i = 0; i < 10; i++) W.step(0.1);
    ok(s.order.type === 'attack' && s.order.target === foe.id && s.order.then && s.order.then.type === 'move', 'a soldier sent across the field fights the enemy he meets on the way');
    W.kill(foe); for (let i = 0; i < 10; i++) W.step(0.1);
    ok(s.order.type === 'move' && s.order.tx === far, 'and when the enemy falls he goes on where he was sent');
    W.remove(s); }
  // Fall back: a plain march keeps walking, struck or not.
  { const s = man('spearman', 'p', x0, y0), foe = man('lamanite', 'r', x0 + 120, y0);
    W.moveTo(s, far, tileOf(y0)); for (let i = 0; i < 10; i++) W.step(0.1);
    W.damage(s, 5, foe); for (let i = 0; i < 5; i++) W.step(0.1);
    ok(s.order.type === 'move', 'Fall back: a soldier told only to march keeps walking, even when struck');
    W.remove(s); W.remove(foe); }
  // Sent against a building, he strikes back at whoever strikes him, then goes on to the building.
  { const camp = FB.camps.find(c => !c.dead), s = man('spearman', 'p', camp.x - 260, camp.y + 40), foe = man('lamanite', 'r', s.x - 30, s.y);
    W.order(s, { type: 'attack', target: camp.id }); W.step(0.1);
    W.damage(s, 5, foe);
    ok(s.order.type === 'attack' && s.order.target === foe.id && s.order.then && s.order.then.target === camp.id, 'a soldier sent against a camp turns on the warrior who strikes him on the way');
    W.kill(foe); for (let i = 0; i < 5; i++) W.step(0.1);
    ok(s.order.type === 'attack' && s.order.target === camp.id, 'then goes on to the camp');
    W.remove(s); }
  // Struck by one he can't reach (on an island), he gives it up after 8 s and goes back to the camp, and doesn't turn again at once.
  { const camp = FB.camps.find(c => !c.dead), s = man('spearman', 'p', camp.x - 300, camp.y + 40);
    const ix = tileOf(s.x) - 4, iy = tileOf(s.y), saved = [];
    for (let y = iy - 2; y <= iy + 2; y++) for (let x = ix - 2; x <= ix + 2; x++) { saved.push([x, y, W.tile(x, y), W.amt[y * D.MAP_W + x]]); if (x !== ix || y !== iy) W.setTile(x, y, D.T.WATER); }
    const foe = man('slinger', 'r', ix * 32 + 16, iy * 32 + 16); W.order(foe, { type: 'idle' });
    W.order(s, { type: 'attack', target: camp.id }); W.step(0.1);
    W.damage(s, 1, foe); const chased = s.order.type === 'attack' && s.order.target === foe.id;
    for (let i = 0; i < 90; i++) { foe.x = ix * 32 + 16; foe.y = iy * 32 + 16; foe.cool = 99; W.step(0.1); }
    ok(chased && s.order.type === 'attack' && s.order.target === camp.id, 'struck by a slinger he can\'t reach, he gives up the chase after 8 s and goes back to the camp');
    W.damage(s, 1, foe);
    ok(s.order.target === camp.id, 'and he doesn\'t turn on him again straight away');
    for (const [x, y, t, a] of saved) W.setTile(x, y, t, a);
    W.remove(s); W.remove(foe); }
  // The levels climb: each harder level comes sooner, stronger and better guarded; Normal's war camp and city stand behind towers.
  { const L = FB.LEVELS, up = (k) => L.easy[k] <= L.normal[k] && L.normal[k] <= L.hard[k];
    ok(L.easy.first >= L.normal.first && L.normal.first >= L.hard.first && up('strength') && up('guards') && up('campGuards') && up('march') && up('towers') && up('stars'),
      'the levels climb: from Easy to Hard the Lamanites march sooner, stronger, and keep more guards and towers');
    ok(!L.easy.works && L.normal.works && L.hard.works, 'the opponent works its powers on Normal and Hard, not on Easy'); }
  // The King-men's swords and cimeters (Alma 43:20): the ladder-works makes them, lighter than Nephite steel.
  ok(D.BUILDINGS.ladderworks.research.includes('lcimeters') && D.RESEARCH.lcimeters.side === 'kingmen' && D.RESEARCH.lcimeters.dmg === 2 && D.RESEARCH.cimeters.dmg === 3,
    'the King-men\'s ladder-works makes swords and cimeters: +2 for warriors who fight up close (the Nephites\' steel gives +3)');
}

console.log('Defensive Carts & Fighting Workers · Blake\'s gameplay evolution');
{
  const W = new S.World();
  const man = (type, team, x, y) => W.addUnit(type, team, x, y);
  // 1. Worker fights back with scythe (dmg 5)
  {
    const wrk = man('worker', 'p', 200, 200), foe = man('lamanite', 'r', 215, 200);
    const hp0 = foe.hp;
    W.damage(wrk, 5, foe);
    ok(foe.hp < hp0, 'worker strikes back with scythe when attacked');
    ok(W.effects.some(f => f.kind === 'hit' && f.team === 'p'), 'worker scythe hit effect shown');
    W.remove(wrk); W.remove(foe);
  }
  // 2. Grain cart bursts into speed escape
  {
    const cart = man('cart', 'p', 200, 200), foe = man('lamanite', 'r', 215, 200);
    cart.pref = 'grain';
    W.damage(cart, 5, foe);
    ok(cart.burstUntil > W.t, 'grain cart gets speed burst when attacked');
    W.remove(cart); W.remove(foe);
  }
  // 3. Stone cart flings stones up to range 110
  {
    const cart = man('cart', 'p', 200, 200), foe = man('lamanite', 'r', 280, 200);
    cart.carry = { type: 'stone', amt: 10 };
    const hp0 = foe.hp;
    W.damage(cart, 5, foe);
    ok(foe.hp < hp0, 'stone cart flings stones at pursuer');
    ok(W.effects.some(f => f.kind === 'stone' && f.team === 'p'), 'stone projectile thrown from cart');
    W.remove(cart); W.remove(foe);
  }
  // 4. Timber cart drops stakes and slows pursuer
  {
    const cart = man('cart', 'p', 200, 200), foe = man('lamanite', 'r', 225, 200);
    cart.carry = { type: 'timber', amt: 10 };
    const hp0 = foe.hp;
    W.damage(cart, 5, foe);
    ok(foe.hp < hp0, 'timber cart drops stakes on attacker');
    ok(foe.slow < 1, 'timber cart slows attacker');
    ok(W.effects.some(f => f.kind === 'hit' && f.team === 'p'), 'timber defensive hit effect');
    W.remove(cart); W.remove(foe);
  }
}

console.log('Command Center & Tactical Cohort Battalions · Red Alert 2 Evolution');
{
  const W = new S.World();
  W.side('p').res.grain = 1000;
  W.side('p').res.timber = 1000;
  W.side('p').res.stone = 1000;

  // 1. Production building auto-cohort assignment
  const b = W.addBuilding('barracks', 'p', 10, 10, true);
  b.autoCohort = 1;
  b.rally = [15, 15];
  W.train(b, 'spearman');
  while (b.queue.length > 0) W.step(0.5);
  const soldier = W.units('p').find(u => u.type === 'spearman');
  ok(soldier && soldier.cohort === 1, 'barracks recruit auto-joins configured Cohort 1');
  ok(soldier.order.type === 'move' && soldier.order.tx === 15 && soldier.order.ty === 15, 'new recruit marches to building rally point');

  // 2. Default unit cohort categorization: Melee -> 1, Ranged -> 2, Beasts/Carts -> 3
  const archerBuilding = W.addBuilding('barracks', 'p', 20, 10, true);
  W.train(archerBuilding, 'archer');
  while (archerBuilding.queue.length > 0) W.step(0.5);
  const archer = W.units('p').find(u => u.type === 'archer');
  ok(archer && archer.cohort === 2, 'ranged recruit auto-joins Skirmishers (Cohort 2)');

  const stable = W.addBuilding('stables', 'p', 30, 10, true);
  W.train(stable, 'cart');
  while (stable.queue.length > 0) W.step(0.5);
  const cart = W.units('p').find(u => u.type === 'cart');
  ok(cart && cart.cohort === 3, 'transport cart auto-joins Siege & Supply (Cohort 3)');

  // 3. Cart docking sequence and yield popups (+10 Grain)
  const storehouse = W.addBuilding('storehouse', 'p', 40, 10, true);
  const ladenCart = W.addUnit('cart', 'p', storehouse.x + 40, storehouse.y);
  ladenCart.carry = { type: 'grain', amt: 10, max: 10 };
  ladenCart.phase = 'dock';
  ladenCart.dockT = 0;
  ladenCart.dropoff = storehouse.id;
  ladenCart.order = { type: 'gather', target: null };
  const g0 = W.side('p').res.grain;
  for (let s = 0; s < 9; s++) W.step(0.1);
  ok(ladenCart.phase !== 'dock' && (!ladenCart.carry || ladenCart.carry.amt === 0), 'cart completes tilting dock and unloads cargo');
  ok(W.side('p').res.grain >= g0 + 10, 'resources credited to base stores after cart dock');
  ok(W.yieldPops.some(p => p.text.includes('+10 Grain')), 'floating yield popup created upon cart unloading');

  // 4. Formation speed synchronization: troops in cohort lock speed to slowest member
  const swordFast = W.addUnit('spearman', 'p', 100, 100);
  const curelomSlow = W.addUnit('curelom', 'p', 102, 100);
  swordFast.cohort = 1;
  curelomSlow.cohort = 1;
  W.cohorts[1].speedLock = true;
  const sTx = tileOf(swordFast.x) + 6, sTy = tileOf(swordFast.y);
  W.moveTo(swordFast, sTx, sTy);
  W.moveTo(curelomSlow, sTx, sTy);

  const xFast0 = swordFast.x;
  W.step(0.2);
  const fastDist = swordFast.x - xFast0;
  ok(fastDist < (swordFast.def.speed * 0.2 * 0.75), 'fast infantry in cohort synchronizes march speed to slow Curelom');

  // 5. Multi-waypoint route advancement
  const scout = W.addUnit('worker', 'p', 100, 200);
  const stx = tileOf(scout.x), sty = tileOf(scout.y);
  scout.order = {
    type: 'move',
    tx: stx + 1,
    ty: sty,
    target: null,
    waypoints: [{ x: stx + 3, y: sty }, { x: stx + 5, y: sty }]
  };
  for (let s = 0; s < 15; s++) {
    W.step(0.1);
    if (scout.order.waypoints.length === 1) break;
  }
  ok(scout.order.waypoints.length === 1, 'unit advances along sequential waypoints');

  // 6. Rules of engagement: break march and defend if HP drops below threshold
  const soldierMarch = W.addUnit('spearman', 'p', 100, 300);
  soldierMarch.order = {
    type: 'move',
    target: null,
    healthThreshold: 50,
    waypoints: [{ x: 200, y: 300 }]
  };
  const foe = W.addUnit('lamanite', 'r', 110, 300);
  const hpMax = soldierMarch.max || soldierMarch.def.hp;
  W.damage(soldierMarch, hpMax * 0.8, foe);
  for (let s = 0; s < 5; s++) {
    W.step(0.1);
    if (soldierMarch.order.type === 'attack' || soldierMarch.order.healthThreshold == null) break;
  }
  ok(soldierMarch.order.type === 'attack' || soldierMarch.order.healthThreshold == null, 'squad breaks march and fights when squad health drops below threshold');
}

console.log('Specialized Industry Buildings · Ancient Nephite Crafts');
{
  const W = new S.World();
  W.side('p').res.grain = 500;
  W.side('p').res.timber = 500;
  W.side('p').res.stone = 500;

  // 1. Sawmill
  const saw = W.addBuilding('sawmill', 'p', 20, 20, true);
  const t0 = W.side('p').res.timber;
  W.step(5.0);
  ok(W.side('p').res.timber > t0, 'timber works passively mills timber (Helaman 3:9)');
  ok(W.takesHarvest(saw), 'timber works serves as local timber dropoff');

  // 2. Stone Quarry
  const qry = W.addBuilding('quarry', 'p', 25, 20, true);
  const s0 = W.side('p').res.stone;
  W.step(5.0);
  ok(W.side('p').res.stone > s0, 'stone quarry passively cuts limestone blocks');
  ok(W.takesHarvest(qry), 'stone quarry serves as local stone dropoff');

  // 3. Cement Kiln / Brickworks
  const kl = W.addBuilding('brickworks', 'p', 30, 20, true);
  ok(W.takesHarvest(kl), 'cement kiln serves as dropoff');
  ok(kl.def.cement === true, 'cement kiln marked as cement works (Helaman 3:7)');

  // 4. Cement repair bonus
  const wall = W.addBuilding('wall', 'p', 22, 25, true);
  wall.hp = 100;
  const wrk = W.addUnit('worker', 'p', S.center(21), S.center(25));
  W.order(wrk, { type: 'build', target: wall.id });
  const hpA = wall.hp;
  W.step(1.0);
  ok(wall.hp > hpA, 'worker repairs damaged fortifications with cement');

  W.remove(saw); W.remove(qry); W.remove(kl); W.remove(wall); W.remove(wrk);
}

console.log('Out of the Wilderness · build a city, hold off the raids');
{
  const WM = require('../liberty/missions.js').WILD;
  const game = (level, length) => { WM.level = level; WM.length = length; const W = new S.World(undefined, WM.map); W.mission = WM; WM.setup(W); return W; };
  let W = game('normal', 'short');
  const std = W.units('p').find(u => u.def.deploys);
  ok(W.tech && std && !W.stronghold() && WM.raids === 5, 'it starts with the standard of liberty, carts, workers and guards, and 5 raids to come');
  // Every way in reaches the valley, so every raid can come all the way down (and be beaten).
  const open = (x, y) => W.inBounds(x, y) && ![D.T.WATER, D.T.ROCK, D.T.FOREST].includes(W.tile(x, y));
  const seen = new Set([D.WILD.START.x + ',' + D.WILD.START.y]), queue = [[D.WILD.START.x, D.WILD.START.y]];
  while (queue.length) { const [x, y] = queue.pop(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (open(x + dx, y + dy) && !seen.has((x + dx) + ',' + (y + dy))) { seen.add((x + dx) + ',' + (y + dy)); queue.push([x + dx, y + dy]); } }
  ok(D.WILD.WAYS.every(w => seen.has(w.x + ',' + w.y)), 'all four ways in lead down into the valley: ' + D.WILD.WAYS.map(w => w.name).join(', '));
  const city = W.deploy(std);
  ok(city && W.stronghold() === city, 'planting the standard of liberty makes the city (Alma 46:36)');
  // Nobody builds anything: the first raid is told of before it comes, and comes.
  run(W, WM.LEVELS.normal.first + 2, 1);
  const warned = W.msgs.find(m => /gathering at/.test(m.text)), came = W.msgs.find(m => /comes down from/.test(m.text));
  ok(warned && came && came.t - warned.t >= WM.LEVELS.normal.warn - 1, `the first raid is seen gathering ${came && warned ? Math.round(came.t - warned.t) : '?'}s before it comes down (3 Nephi 4:1)`);
  ok(WM.bands.length === 1 && WM.bands[0].units.length >= 3, 'and it comes down: ' + (WM.bands[0] ? WM.bands[0].units.length : 0) + ' raiders');
  run(W, 30 * 60, 1);
  ok(W.over && !W.over.won, 'a city with no one to guard it falls: ' + (W.over ? W.over.title + ', ' + W.over.detail : 'not over'));

  // A watchtower near a way in sees what gathers there half a minute sooner.
  W = game('normal', 'short');
  const c2 = W.deploy(W.units('p').find(u => u.def.deploys));
  for (const w of D.WILD.WAYS) { const [x, y] = W.freeTileNear(w.x, Math.max(w.y, 4) + (w.y < 5 ? 3 : 0), 'p'); for (let r = 0; r < 6; r++) if (W.whyNotPlace('tower', x + r, y) !== 'ground') { W.addBuilding('tower', 'p', x + r, y, true); break; } }
  run(W, WM.LEVELS.normal.first - WM.LEVELS.normal.warn - 25, 1);
  ok(W.msgs.some(m => /Your watchtower sees/.test(m.text)), 'a watchtower near a way in sees the raid gathering sooner (3 Nephi 3:14)');
  ok(WM.objectives(W).find(o => o.optional).have >= 3, 'the goals count the ways in that have a watchtower near them');

  // A steady defender: the free battle builder, with watchtowers, a mixed army kept home, and walls mended.
  for (const level of ['normal']) {
    W = game(level, 'short');
    const home = W.deploy(W.units('p').find(u => u.def.deploys));
    const S0 = { x: home.tx, y: home.ty };
    const plan = [['storehouse', -4, 4], ['farm', 4, -3], ['barracks', 6, 1], ['farm', -3, -3], ['granary', -3, 1], ['tower', 2, -6], ['armory', 6, 5], ['farm', 0, 6], ['tower', -7, 2],
      ['smithy', 9, 5], ['training', -7, -3], ['tower', 10, -2], ['hall', 9, -3], ['farm', 3, 9], ['tower', 2, 10], ['farm', -6, -1], ['granary', 10, 3], ['farm', -1, -6], ['farm', 13, 0]];
    const research = { armory: ['breastplates', 'clothing', 'pickets'], smithy: ['cimeters', 'bows'], hall: ['ladders'] };
    const workers = () => W.units('p').filter(u => u.type === 'worker');
    const army = () => W.soldiers().filter(u => !u.def.hero);
    const ms = run(W, 40 * 60, 1, W => {
      const unbuilt = W.buildings('p').filter(b => b.built < 1);
      if (plan.length && unbuilt.length < 2) {
        const [type, dx, dy] = plan[0];
        if (!W.whyNotBuild(type) && W.canAfford(D.BUILDINGS[type].cost)) {
          let spot = null;
          for (let r = 0; r < 8 && !spot; r++) for (let oy = -r; oy <= r && !spot; oy++) for (let ox = -r; ox <= r && !spot; ox++) if (W.canPlace(type, S0.x + dx + ox, S0.y + dy + oy)) spot = [S0.x + dx + ox, S0.y + dy + oy];
          const b = spot && W.place(type, spot[0], spot[1], []); plan.shift(); if (b) unbuilt.push(b);
        } else if (W.whyNotBuild(type)) plan.push(plan.shift());
      }
      for (const b of unbuilt) {
        const on = workers().filter(u => u.order.type === 'build' && u.order.target === b.id).length;
        workers().filter(u => u.order.type !== 'build').sort((a, c) => S.dist(a, b) - S.dist(c, b)).slice(0, Math.max(0, 2 - on)).forEach(u => W.order(u, { type: 'build', target: b.id }));
      }
      const broken = W.buildings('p').find(b => b.built >= 1 && W.needsWork(b) && b.hp < S.maxHp(b) * 0.7);
      if (broken && !workers().some(u => u.order.type === 'build' && u.order.target === broken.id)) { const w = workers().find(u => u.order.type !== 'build'); if (w) W.order(w, { type: 'build', target: broken.id }); }
      quarry(W, W.units('p').filter(u => u.type === 'cart'));
    // Keep grain and timber about even: point a cart at whichever is short.
      const carts = W.units('p').filter(u => u.type === 'cart');
      const much = W.res.grain > W.res.timber + 250 ? 'grain' : W.res.timber > W.res.grain + 250 ? 'timber' : null;
      const mover = much && carts.find(u => u.order.type === 'gather' && u.order.res === much);
      if (mover) { mover.pref = much === 'grain' ? 'timber' : 'grain'; const f = W.nearestResource(S0.x + 2, S0.y + 2, mover.pref); if (f) W.gatherAt(mover, f[0], f[1]); }
      for (const [type, keys] of Object.entries(research)) { const b = W.buildings('p', type).find(b => b.built >= 1); if (b && !W.researching && keys.length && W.research(b, keys[0])) { keys.shift(); break; } }   // and train meanwhile
      const s = W.stronghold();
      if (s && s.queue.length < 1 && carts.length < 5) W.train(s, 'cart');
      if (plan.length && ['armory', 'hall'].includes(plan[0][0]) && !W.whyNotBuild(plan[0][0]) && !W.canAfford(D.BUILDINGS[plan[0][0]].cost) && army().length >= 6) return;
      const br = W.buildings('p', 'barracks').find(b => b.built >= 1), hall = W.buildings('p', 'hall').find(b => b.built >= 1), n = army().length;
      if (br && br.queue.length < 2) W.train(br, W.has('armory') ? ['archer', 'swordsman', 'spearman'][n % 3] : (n % 2 ? 'nslinger' : 'spearman'));
      if (hall && hall.queue.length < 1) W.train(hall, n % 3 ? 'stripling' : 'javelin');
      army().filter(u => u.order.type === 'idle' && S.dist(u, s || u) > 7 * 32).forEach((u, i) => W.moveTo(u, S0.x + 1 + (i % 6) - 3, S0.y + 2 + Math.floor(i / 6) - 2));
    });
    console.log(`    ${level}: at ${Math.round(W.t / 60)} min · raids beaten ${WM.beaten}/${WM.raids} · buildings lost ${WM.lost} · army ${army().length} · Nephites fallen ${W.stats.fallen} · raiders fallen ${W.stats.defeated} · slowest step ${ms}ms`);
    ok(W.over && W.over.won && W.over.stars === 2, 'a steady defender holds off all 5 raids on Normal: ' + (W.over ? W.over.title + ' ★' + W.over.stars : 'not over'));
    ok(WM.bands.length === 5 && WM.bands.some(b => b.units.some(u => u.def.leader || u.type === 'amalekite')), 'the last raid brings a Lamanite army with an armored captain');
    ok(ms < 40, 'a step stays fast enough');
  }
}

// ------------------------------------------------------------ saving a game (Blake: "prevent us accidentally exiting the game ... we'll lose our progress")
console.log('Saving a game · Blake\'s "we\'ll lose our progress"');
{
  // One process plays a game, saving at 3 minutes and again at 5; a fresh one (a page opened again) loads the first save and plays on
  // to 5 minutes. The two must match to the last arrow: the save holds everything the game needs.
  const { execFileSync } = await import('node:child_process'), fs = await import('node:fs'), os = await import('node:os'), path = await import('node:path'), { fileURLToPath } = await import('node:url');
  const child = fileURLToPath(new URL('./liberty-save-child.mjs', import.meta.url));
  for (const sc of ['m2', 'm3', 'm4', 'm5', 'm6', 'free:normal:freemen', 'free:hard:kingmen', 'wild:normal']) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'liberty-save-'));
    const played = JSON.parse(execFileSync('node', [child, 'play', sc, '180', '120', dir]).toString().trim().split('\n').pop());
    execFileSync('node', [child, 'load', '120', dir + '/a.json', dir + '/b2.json']);
    const same = fs.readFileSync(dir + '/b.json', 'utf8') === fs.readFileSync(dir + '/b2.json', 'utf8');
    ok(same && !played.lost.length && played.bytes < 200000, `${sc}: saved at 3 minutes and loaded in a fresh page, it plays on exactly as before (${Math.round(played.bytes / 1024)} KB)`);
    fs.rmSync(dir, { recursive: true, force: true });
  }
  // Loading clears what an earlier game left on the mission, and a save that can't go on is caught before it is offered.
  { const SAVE = require('../liberty/save.js'), W = start('m1'), snap = JSON.parse(JSON.stringify(SAVE.dump(W, {})));
    W.mission.leftOver = 900;
    const { mission } = SAVE.load(JSON.parse(JSON.stringify(snap)));
    ok(!('leftOver' in mission), 'loading a save clears what an earlier game left on the mission');
    ok(SAVE.playsOn(JSON.parse(JSON.stringify(snap)), 20), 'a good save plays on');
    const broken = JSON.parse(JSON.stringify(snap).replace(/"hp":(\d+)/, '"hp":"gone"'));
    ok(!SAVE.playsOn(broken, 20), 'a save that would go wrong (a unit\'s health not a number) is caught before it is offered'); }
  // Anything that can't be written down (a function) is noted, so the screen keeps the last good save instead.
  { const SAVE = require('../liberty/save.js'), W = start('m1'); W.mission.flags = { oops: () => 1 };
    ok(SAVE.dump(W, {}).lost.includes('oops'), 'a save that would lose something says so'); W.mission.flags = {}; }
}

// ------------------------------------------------------------ Campaign Missions & Star Perks
console.log('Campaign Missions & Star Perks · Meta-Progression');
{
  const { MISSIONS } = require('../liberty/missions.js');
  ok(MISSIONS.length === 6, 'all 6 campaign missions defined and exported');
  for (const id of ['m3', 'm4', 'm5', 'm6', 'm1', 'm2']) {
    const m = MISSIONS.find(x => x.id === id);
    ok(m && m.chapter && m.goals && m.starsText, `mission ${id} has full canonical metadata (${m.chapter})`);
    const W = new S.World(undefined, m.map);
    W.mission = m;
    m.setup(W);
    ok(W.ents.size > 0 && Array.isArray(m.objectives(W)), `mission ${id} sets up world entities and objectives`);
  }

  // Perks mechanics tests
  // 1. brass_plates increases research speed by 25%
  {
    const W = new S.World();
    W.tech = true;
    W.perks = ['brass_plates'];
    W.res = { grain: 500, timber: 500, stone: 500 };
    const b = W.addBuilding('armory', 'p', 10, 10, true);
    ok(W.research(b, 'breastplates'), 'armory starts research');
    const t0 = W.side('p').researching.left;
    W.step(1);
    const dt = t0 - W.side('p').researching.left;
    ok(Math.abs(dt - 1.25) < 0.05, `brass_plates perk speeds up research by 1.25x (${dt.toFixed(2)}s per 1s)`);
  }

  // 2. moroni_forts discounts walls, gates, and ditches by 20%
  {
    const W = new S.World();
    W.perks = ['moroni_forts'];
    const wallCostNormal = D.BUILDINGS.wall.cost.timber;
    const wallCostPerk = W.costOf(D.BUILDINGS.wall, 'p', 'build').timber;
    ok(wallCostPerk === Math.round(wallCostNormal * 0.8), `moroni_forts perk gives 20% discount on walls (${wallCostPerk} vs ${wallCostNormal})`);
    const gateCostNormal = D.BUILDINGS.gate.cost.timber;
    const gateCostPerk = W.costOf(D.BUILDINGS.gate, 'p', 'build').timber;
    ok(gateCostPerk === Math.round(gateCostNormal * 0.8), `moroni_forts perk gives 20% discount on gates (${gateCostPerk} vs ${gateCostNormal})`);
  }

  // 3. stripling_covenant gives striplings +20% HP and rank 1
  {
    const W = new S.World();
    W.perks = ['stripling_covenant'];
    const u = W.addUnit('stripling', 'p', 100, 100);
    ok(u.rank >= 1 && u.max === Math.round(D.UNITS.stripling.hp * 1.2), `stripling_covenant perk grants rank 1 and +20% HP (${u.max} vs ${D.UNITS.stripling.hp})`);
  }

  // 4. joseph_granaries adds +300 to storeCap
  {
    const W0 = new S.World();
    const cap0 = W0.storeCap('p');
    const W1 = new S.World();
    W1.perks = ['joseph_granaries'];
    const cap1 = W1.storeCap('p');
    ok(cap1 === cap0 + 300, `joseph_granaries perk increases storeCap by +300 (${cap1} vs ${cap0})`);
  }

  // 5. nephite_chariots gives carts 20% speed
  {
    const W = new S.World();
    W.perks = ['nephite_chariots'];
    const c = W.addUnit('cart', 'p', 100, 100);
    c.path = [[10, 10]];
    const x0 = c.x, y0 = c.y;
    W.follow(c, 1);
    const distMoved = Math.hypot(c.x - x0, c.y - y0);
    const expected = D.UNITS.cart.speed * 1.2;
    ok(Math.abs(distMoved - expected) < 2, `nephite_chariots perk gives carts 20% speed boost (${distMoved.toFixed(1)} vs ${expected.toFixed(1)})`);
  }

  // 6. Council questions defined for all campaign chapters
  {
    for (const m of MISSIONS) {
      const chaps = m.chapters || [m.chapter];
      for (const c of chaps) {
        const qs = D.QUESTIONS[c];
        ok(Array.isArray(qs) && qs.length >= 5, `council questions defined for ${c} (${qs ? qs.length : 0} >= 5)`);
      }
    }
  }
}

// ------------------------------------------------------------ quotes
// Every quotation in the game, in its text or its comments, is checked
// against the verses cited on the same line: the words must be there.
console.log('Quotes');
{
  const fs = await import('node:fs'), { fileURLToPath } = await import('node:url');
  const window = {};
  new Function('window', fs.readFileSync(new URL('../liberty/scripture.js', import.meta.url), 'utf8'))(window);
  const TEXT = Object.assign({}, window.LIBERTY_SCRIPTURE);
  // Quotes from other chapters (the units' descriptions) are checked against the
  // pinned data tools/verify.mjs downloads, when it's there.
  const cache = process.env.SCRIPTURE_CACHE || fileURLToPath(new URL('./.scripture-cache', import.meta.url));
  if (fs.existsSync(cache)) for (const f of fs.readdirSync(cache).filter(f => f.endsWith('.json'))) {
    const data = JSON.parse(fs.readFileSync(cache + '/' + f, 'utf8'));
    for (const c of data.sections || data.books.flatMap(b => b.chapters)) for (const v of c.verses) {
      const key = v.reference.replace(/:\d+$/, '');
      if (!TEXT[key] || !window.LIBERTY_SCRIPTURE[key]) (TEXT[key] = TEXT[key] || [])[v.verse - 1] = v.text;
    }
  } else console.log('    (no scripture data: quotes outside the missions\' chapters are not checked; run node tools/verify.mjs once)');
  const norm = s => s.toLowerCase().replace(/\\/g, '').replace(/[’']/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
  let checked = 0;
  const bad = [];
  for (const file of ['data.js', 'sim.js', 'missions.js', 'ui.js']) {
    fs.readFileSync(new URL('../liberty/' + file, import.meta.url), 'utf8').split('\n').forEach((line, n) => {
      // (ui.js's straight quotes are HTML attributes; its quotations use curly ones.)
      const quotes = [...line.matchAll(file === 'ui.js' ? /“([^”]+)”/g : /“([^”]+)”|"([a-z][^"]+)"/g)].map(m => m[1] || m[2]);
      if (!quotes.length) return;
      const verses = [];
      for (const m of line.matchAll(/((?:[1-4] )?[A-Z][a-z]+ \d+):(\d+(?:[–-]\d+)?(?:, ?\d+(?:[–-]\d+)?)*)/g)) {
        for (const part of m[2].split(',')) {
          const [a, b] = part.trim().split(/[–-]/).map(Number);
          for (let v = a; v <= (b || a); v++) verses.push((TEXT[m[1]] || [])[v - 1] || '');
        }
      }
      const where = `${file}:${n + 1}`;
      if (!verses.length) { bad.push(`${where} quotes with no verse cited: ${quotes.join(' / ')}`); return; }
      const hay = norm(verses.join(' '));
      for (const q of quotes) {
        checked++;
        for (const piece of q.split(/…|\.\.\./)) if (norm(piece) && !hay.includes(norm(piece))) bad.push(`${where} “${piece.trim()}” isn't in the verses it cites`);
      }
    });
  }
  bad.forEach(b => console.log('    ' + b));
  ok(!bad.length && checked > 15, `${checked} quotations match the verses they cite`);
}

// ------------------------------------------------------------ losing
console.log('Losing');
{
  const W = start('m1');
  W.remove(W.stronghold());
  run(W, 1);
  ok(W.over && !W.over.won, 'losing Zarahemla ends the mission');
}

// ------------------------------------------------------------ the pictures
// The game shows each picture's WebP, so a WebP made from an older picture would quietly show the old one. Every PNG and
// JPG in liberty/assets/ needs a WebP made from it as it is now (python3 tools/liberty-webp.py writes them, and
// webp.json notes the picture each was made from).
console.log('Pictures');
{
  const fs = await import('node:fs'), path = await import('node:path'), { createHash } = await import('node:crypto'), { fileURLToPath } = await import('node:url');
  const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'liberty', 'assets');
  const made = JSON.parse(fs.readFileSync(path.join(dir, 'webp.json'), 'utf8'));
  const pics = fs.readdirSync(dir).filter(n => /\.(png|jpg)$/.test(n));
  const missing = pics.filter(n => !fs.existsSync(path.join(dir, n.replace(/\.(png|jpg)$/, '.webp'))));
  const stale = pics.filter(n => made[n] !== createHash('sha256').update(fs.readFileSync(path.join(dir, n))).digest('hex'));
  ok(!missing.length, `every picture has its WebP${missing.length ? ' (missing: ' + missing.join(', ') + ')' : ''}`);
  ok(!stale.length, `every WebP was made from its picture as it is now${stale.length ? ' (run python3 tools/liberty-webp.py: ' + stale.join(', ') + ')' : ''}`);
}

// The offline copy keeps a versioned file for good, so a file changed under the same ?v= never reaches a device that has
// played: an old sim.js beside a new ui.js broke the game in October 2026.
console.log('Versions · the offline copy');
{
  const { check } = await import('./liberty-versions.mjs');
  const { missing, changed, unnoted } = check();
  ok(!missing.length, `every versioned file the game asks for is there${missing.length ? ' (missing: ' + missing.join(', ') + ')' : ''}`);
  ok(!changed.length, `no file changed without a new ?v=${changed.length ? ' (give these a new version: ' + changed.join(', ') + ')' : ''}`);
  ok(!unnoted.length, `every versioned file is noted in liberty/versions.json${unnoted.length ? ' (run node tools/liberty-versions.mjs: ' + unnoted.slice(0, 6).join(', ') + (unnoted.length > 6 ? '…' : '') + ')' : ''}`);
}

console.log(failed ? `\n${failed} failed` : '\nall passed');
process.exit(failed ? 1 : 0);
