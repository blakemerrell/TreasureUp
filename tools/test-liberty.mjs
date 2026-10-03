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
  const W = start('m3');
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
  ok(W.whyNotBuild('armory') === 'Needs Barracks' && W.whyNotTrain('stripling') === 'Needs Hall of the captains', 'the armory needs a barracks first, and stripling warriors the hall of the captains');
  const city = W.deploy(std);
  ok(city && W.stronghold() === city && !W.units('p').some(u => u.def.deploys), 'planting the standard of liberty makes the city (Alma 46:36)');
  ok(W.foodCap() === 10 && W.storeCap() === 300, 'the city feeds 10 and stores 300 of each');
  W.res.timber = 290; W.gain('timber', 50);
  ok(W.res.timber === 300, 'more than the storehouses hold is lost');
  W.res = { grain: 200, timber: 250 };                 // what free battle starts with: no head start
  for (let i = 0; i < 3; i++) W.train(city, 'cart');
  ok(W.foodUsed() === 10 && W.whyNotTrain('cart').startsWith('Not enough food') && !W.train(city, 'cart'), 'with no food for more, no one else can be trained until a farm is built');
  ok(W.whyNotPlace('farm', city.tx + 20, city.ty) === 'far' && W.whyNotPlace('farm', city.tx + 5, city.ty) === '', 'a building must stand within reach of what you have (Red Alert\'s rule)');
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
    g.hp = 5; W.miracle('mercy'); ok(g.hp === (g.max || g.def.hp), 'mercy makes everyone whole (Alma 2:30)');
    const sh = foes[2], shp = sh.hp; ok(W.miracle('shock', sh.x, sh.y, sh.id) && (sh.dead || (sh.hp < shp && sh.kneelUntil > W.t)), 'the shock throws one enemy down (1 Nephi 17:54)');
    for (const f of foes) if (!f.dead) W.kill(f);
    W.kill(t); }
  // The armory's new upgrades, the war camp's palisade, Lamanite ladders, and veteran ranks.
  { W.zones.length = 0;                                   // the temple's ring of fire is out
    const pal = W.buildings('r').filter(b => b.def.wall).length;
    ok(pal >= 20, `the war camp stands behind a palisade (${pal} pieces)`);
    const a = W.addUnit('archer', 'p', city.x + 120, city.y + 120), r0 = W.rangeOf(a);
    W.bows = true; ok(W.rangeOf(a) > r0, 'bows of fine steel: archers shoot farther (1 Nephi 16:18)'); W.bows = false;
    const foe = W.addUnit('lamanite', 'r', a.x + 40, a.y), hp0 = a.hp;
    W.damage(a, 20, foe); const plain = hp0 - a.hp;
    a.hp = hp0; W.clothing = true; W.damage(a, 20, foe); ok(hp0 - a.hp < plain, 'thick clothing: archers take less harm (Alma 43:19)'); W.clothing = false;
    // a wall of yours across a Lamanite's way: with ladders he climbs it instead of breaking it
    W.truce = true;
    const wx = city.tx + 8, wy = city.ty, wall = [];
    for (let y = wy - 3; y <= wy + 3; y++) if (W.canPlace('wall', wx, y)) wall.push(W.addBuilding('wall', 'p', wx, y, true));
    foe.x = (wx + 3) * 32 + 16; foe.y = wy * 32 + 16; foe.ladders = true; foe.hp = foe.def.hp;
    W.order(foe, { type: 'move', tx: wx - 3, ty: wy });
    run(W, 15, 0.1, () => {});
    ok(wall.length >= 5 && tileOf(foe.x) < wx && wall.every(w => !w.dead), `a Lamanite with ladders climbs over your wall without breaking it (Alma 49:22; now at ${tileOf(foe.x)},${tileOf(foe.y)})`);
    W.truce = false;
    // veteran ranks: three foes make a soldier valiant
    const v = W.units('p').find(u => u.def.soldier && !u.def.hero);
    for (let i = 0; i < 3; i++) W.kill(W.addUnit('lamanite', 'r', v.x + 300, v.y), v);
    ok(v.rank === 1 && v.max > v.def.hp, 'three foes make a soldier a veteran: more health and harder blows (Alma 53:20)');
    for (const w of wall) W.kill(w); W.kill(foe); W.kill(a); v.rank = 0; v.kills = 0; v.max = v.def.hp; }

  // A steady player: the carts haul on their own; build up the tree, keep an army home, then march on the camps.
  const S0 = { x: city.tx, y: city.ty };
  const plan = [['farm', 4, -3], ['barracks', 6, 1], ['farm', -3, -3], ['granary', -3, 1], ['armory', 6, 5], ['farm', 0, 6],
    ['stables', -4, 5], ['hall', 9, -3], ['farm', 3, 9], ['tower', 7, -5], ['farm', -6, -1], ['granary', 10, 3], ['farm', -1, -6], ['farm', 13, 0], ['farm', -6, 8], ['temple', 12, 6]];
  const research = ['breastplates', 'cimeters', 'pickets', 'bows', 'clothing', 'ladders'];
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
    // Keep grain and timber about even: point a cart at whichever is short.
    const much = W.res.grain > W.res.timber + 250 ? 'grain' : W.res.timber > W.res.grain + 250 ? 'timber' : null;
    const mover = much && carts().find(u => u.order.type === 'gather' && u.order.res === much);
    if (mover) { mover.pref = much === 'grain' ? 'timber' : 'grain'; const f = W.nearestResource(S0.x + 2, S0.y + 2, mover.pref); if (f) W.gatherAt(mover, f[0], f[1]); }
    if (W.temple() && !W.whyNotMiracle('mercy') && W.units('p').some(u => u.hp < (u.max || u.def.hp) * 0.5)) W.miracle('mercy');
    if (process.env.DIAG && Math.floor(W.t) % 30 === 0 && Math.floor(W.t) !== (W._diag || 0)) { W._diag = Math.floor(W.t); console.log(`      diag t=${Math.floor(W.t)} army=${army().length} carts=${carts().length} workers=${workers().length} bld=${W.buildings('p').map(b => b.type[0] + (b.built < 1 ? '~' : '')).join('')} g/t/s=${Math.round(W.res.grain)}/${Math.round(W.res.timber)}/${Math.round(W.res.stone)} plan=${plan[0] ? plan[0][0] : '-'} foes=${[...W.ents.values()].filter(e => e.kind === 'unit' && e.team === 'r' && !e.dead).length} timberNear=${JSON.stringify(W.nearestResource(S0.x, S0.y, 'timber'))} cartsAt=${carts().map(u => tileOf(u.x) + ',' + tileOf(u.y) + ':' + u.order.type + ':' + (u.order.res || '') + ':' + (u.phase || '') + ':' + (u.carry ? u.carry.type + u.carry.amt : 0) + ':' + (u.pref || '')).join(' ')} msg=${(W.msgs.slice(-1)[0] || {}).text}`); }
    // Research first, then train: carts, then soldiers.
    const arm = W.buildings('p', 'armory').find(b => b.built >= 1);
    if (arm && !W.researching && research.length && W.research(arm, research[0])) research.shift();   // and train meanwhile
    const s = W.stronghold();
    if (s && s.queue.length < 1 && carts().length < 4) W.train(s, 'cart');
    const st = W.buildings('p', 'stables').find(b => b.built >= 1);
    if (st && st.queue.length < 1 && carts().length < 5) W.train(st, 'cart');
    // Save up for the big buildings rather than spending it all on soldiers.
    if (plan.length && ['armory', 'stables', 'hall', 'temple'].includes(plan[0][0]) && !W.whyNotBuild(plan[0][0]) && !W.canAfford(D.BUILDINGS[plan[0][0]].cost) && army().length >= 6) return;
    const br = W.buildings('p', 'barracks').find(b => b.built >= 1), hall = W.buildings('p', 'hall').find(b => b.built >= 1);
    if (br && br.queue.length < 2) W.train(br, W.has('armory') ? (army().length % 2 ? 'archer' : 'swordsman') : (army().length % 2 ? 'nslinger' : 'spearman'));
    if (hall && hall.queue.length < 1) W.train(hall, army().length % 3 ? 'stripling' : 'javelin');
    // March out once the army is strong, and tear down the camps, then the war camp.
    if (!attackAt && (army().length >= 30 || W.t > 16 * 60)) attackAt = W.t;
    if (attackAt) {
      const targets = FB.camps.filter(c => !c.dead).concat(FB.warcamp.dead ? [] : [FB.warcamp]);
      const t = targets.sort((a, b) => S.dist(a, s || a) - S.dist(b, s || b))[0];
      if (t) for (const u of army().filter(u => u.order.type === 'idle')) W.order(u, { type: 'attack', target: t.id });
    }
  });
  console.log(`    at ${Math.round(W.t / 60)} min · wave ${FB.wave} · army ${army().length} · carts ${carts().length} · food ${W.foodUsed()}/${W.foodCap()} · store ${W.storeCap()} · slowest step ${ms}ms`);
  ok(selfBuilt, 'buildings rise on their own once placed, with no worker beside them');
  ok(carts().every(u => u.order.type !== 'idle') && carts().length >= 4, 'idle carts go and haul on their own (' + carts().length + ' carts, none idle)');
  ok(W.researched.breastplates && W.armor === 4 && W.dmgUp === 3 && W.buildings('p').filter(b => b.def.wall).every(b => b.max === b.def.hp * 2), 'the armory made breastplates, cimeters and pickets');
  ok(W.trained.stripling > 0 && W.trained.cart > 0, `the hall trains stripling warriors (${W.trained.stripling || 0}), and the stables horse carts (${W.trained.cart || 0})`);
  ok(FB.wave >= 2, 'the Lamanites attacked, again and again (' + FB.wave + ' waves)');
  ok(W.over && W.over.won && W.over.stars === 2, 'the war camp falls: ' + (W.over ? W.over.title + ' ★' + W.over.stars : 'not over'));
  ok(ms < 40, 'a step stays fast enough with a whole city');
}

// ------------------------------------------------------------ out of the wilderness
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
    const plan = [['farm', 4, -3], ['barracks', 6, 1], ['farm', -3, -3], ['granary', -3, 1], ['tower', 2, -6], ['armory', 6, 5], ['farm', 0, 6], ['tower', -7, 2],
      ['tower', 10, -2], ['hall', 9, -3], ['farm', 3, 9], ['tower', 2, 10], ['farm', -6, -1], ['granary', 10, 3], ['farm', -1, -6], ['farm', 13, 0]];
    const research = ['breastplates', 'cimeters', 'pickets', 'bows', 'clothing', 'ladders'];
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
      const arm = W.buildings('p', 'armory').find(b => b.built >= 1);
      if (arm && !W.researching && research.length && W.research(arm, research[0])) research.shift();   // and train meanwhile
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

// ------------------------------------------------------------ quotes
// Every quotation in the game, in its text or its comments, is checked
// against the verses cited on the same line: the words must be there.
console.log('Quotes');
{
  const fs = await import('node:fs');
  const window = {};
  new Function('window', fs.readFileSync(new URL('../liberty/scripture.js', import.meta.url), 'utf8'))(window);
  const TEXT = Object.assign({}, window.LIBERTY_SCRIPTURE);
  // Quotes from other chapters (the units' descriptions) are checked against the
  // pinned data tools/verify.mjs downloads, when it's there.
  const cache = process.env.SCRIPTURE_CACHE || new URL('./.scripture-cache', import.meta.url).pathname;
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

console.log(failed ? `\n${failed} failed` : '\nall passed');
process.exit(failed ? 1 : 0);
