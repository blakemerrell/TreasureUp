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
  const W = new S.World();
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

// ------------------------------------------------------------ quotes
// Every quotation in the game, in its text or its comments, is checked
// against the verses cited on the same line: the words must be there.
console.log('Quotes');
{
  const fs = await import('node:fs');
  const window = {};
  new Function('window', fs.readFileSync(new URL('../liberty/scripture.js', import.meta.url), 'utf8'))(window);
  const TEXT = window.LIBERTY_SCRIPTURE;
  const norm = s => s.toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
  let checked = 0;
  const bad = [];
  for (const file of ['data.js', 'sim.js', 'missions.js', 'ui.js']) {
    fs.readFileSync(new URL('../liberty/' + file, import.meta.url), 'utf8').split('\n').forEach((line, n) => {
      // (ui.js's straight quotes are HTML attributes; its quotations use curly ones.)
      const quotes = [...line.matchAll(file === 'ui.js' ? /“([^”]+)”/g : /“([^”]+)”|"([a-z][^"]+)"/g)].map(m => m[1] || m[2]);
      if (!quotes.length) return;
      const verses = [];
      for (const m of line.matchAll(/(3 Nephi \d+):(\d+(?:[–-]\d+)?(?:, ?\d+(?:[–-]\d+)?)*)/g)) {
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
