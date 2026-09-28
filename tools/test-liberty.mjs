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
  ok(W.stronghold() && W.units('p').length === 8, 'starts with Zarahemla, 4 workers, 3 guards and Gidgiddoni');
  ok(M.villages.length === 5, 'five villages wait for the proclamation');
  // The border: a soldier ordered into the mountains stops at the edge of the wilderness.
  const g = W.units('p').find(u => u.def.hero);
  W.moveTo(g, 32, 3);
  ok(g.order.ty === D.BORDER_Y && W.msgs.some(m => m.ref === '3 Nephi 3:21'), 'Gidgiddoni won\'t march into the wilderness (3 Nephi 3:21)');

  // A simple player: soldiers visit the villages; workers gather, then build
  // a barracks, four towers and the wall round about, the way mission 2 starts.
  const soldiers = W.soldiers();
  const plan = D.VILLAGES.map(v => [v.x + 1, v.y + 4]);
  soldiers.forEach((s, i) => W.moveTo(s, ...plan[i % plan.length]));
  const workers = W.units('p').filter(u => u.type === 'worker');
  workers.forEach((w, i) => { const f = W.nearestResource(30, 42, i % 2 ? 'grain' : 'timber'); W.gatherAt(w, f[0], f[1]); });
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
    for (const w of all.filter(u => u.order.type === 'idle')) {
      const f = W.nearestResource(30, 40, W.res.grain < 150 ? 'grain' : 'timber');
      if (f) W.gatherAt(w, f[0], f[1]);
    }
    const barracks = W.buildings('p', 'barracks').find(b => b.built);
    if (barracks && barracks.queue.length < 2 && W.soldiers().filter(u => !u.def.hero).length + barracks.queue.length < 11) W.train(barracks, W.soldiers().length % 2 ? 'archer' : 'spearman');
    const s = W.stronghold();
    if (s && s.queue.length < 1 && all.length < 12) W.train(s, 'worker');
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
    for (const w of W.units('p').filter(u => u.type === 'worker' && u.order.type === 'idle')) { const f = W.nearestResource(SD.JERSHON.x, SD.JERSHON.y + 6, W.res.grain < W.res.timber ? 'grain' : 'timber'); if (f) W.gatherAt(w, f[0], f[1]); }
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

// ------------------------------------------------------------ quotes
// Every quotation in the game, in its text or its comments, is checked
// against the verses cited on the same line: the words must be there.
console.log('Quotes');
{
  const fs = await import('node:fs');
  const window = {};
  new Function('window', fs.readFileSync(new URL('../liberty/scripture.js', import.meta.url), 'utf8'))(window);
  const TEXT = window.LIBERTY_SCRIPTURE;
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
