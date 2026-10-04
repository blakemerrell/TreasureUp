#!/usr/bin/env node
// Helper for tools/test-liberty.mjs: plays a game a while, or loads one, in a process of its own (as a fresh page would).
//   node tools/liberty-save-child.mjs play <scenario> <t1> <t2> <out-dir>   saves at t1 (a.json) and at t1 + t2 (b.json)
//   node tools/liberty-save-child.mjs load <t2> <in.json> <out.json>        loads a save, plays t2 more, saves again
import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire(import.meta.url);
const D = require('../liberty/data.js'); globalThis.LIB_DATA = D;
const S = require('../liberty/sim.js'); globalThis.LIB_SIM = S;
const M = require('../liberty/missions.js');
const SAVE = require('../liberty/save.js');
const [mode, ...args] = process.argv.slice(2);
const steps = (W, sec) => { for (let i = 0; i < sec * 10 && !W.over; i++) W.step(0.1); };
const out = (W, file) => { const s = SAVE.dump(W, { note: 'test' }); delete s.at; fs.writeFileSync(file, JSON.stringify(s)); };

if (mode === 'play') {
  const [scenario, t1, t2, dir] = args;
  const [id, level, side] = scenario.split(':');
  const m = id === 'free' ? M.FREE_BATTLE : id === 'wild' ? M.WILD : M.MISSIONS.find(x => x.id === id);
  if (level) m.level = level;
  if (side) { m.side = side; m.captain = Object.keys(D.CAPTAINS[side])[0]; }
  const W = new S.World(undefined, m.map); W.mission = m; m.setup(W);
  // A few orders, so the save holds paths, orders, building and training under way.
  const std = W.units('p').find(u => u.def.deploys); if (std) W.deploy(std);
  const home = W.stronghold();
  if (home) {
    const want = W.tech ? (W.side('p').side === 'kingmen' ? 'storetent' : 'storehouse') : null;
    if (want) for (let r = 3; r < 9; r++) { let done = false; for (let d = -r; d <= r && !done; d++) if (W.canPlace(want, home.tx + d, home.ty + home.h + r)) { W.res.timber += 100; done = !!W.place(want, home.tx + d, home.ty + home.h + r, []); } if (done) break; }
    const soldiers = W.soldiers(); soldiers.forEach((u, i) => W.moveTo(u, S.tileOf(home.x) + 4 + (i % 3), S.tileOf(home.y) - 5 - Math.floor(i / 3), true));
  }
  steps(W, +t1); out(W, dir + '/a.json');
  steps(W, +t2); out(W, dir + '/b.json');
  console.log(JSON.stringify({ t: W.t, ents: W.ents.size, over: !!W.over, bytes: fs.statSync(dir + '/a.json').size, lost: JSON.parse(fs.readFileSync(dir + '/a.json')).lost }));
} else if (mode === 'load') {
  const [t2, inp, outp] = args;
  const t0 = performance.now();
  const { W } = SAVE.load(JSON.parse(fs.readFileSync(inp, 'utf8')));
  const ms = performance.now() - t0;
  steps(W, +t2); out(W, outp);
  console.log(JSON.stringify({ t: W.t, loadMs: Math.round(ms) }));
}
