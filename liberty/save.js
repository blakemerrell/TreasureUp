// Saving a game in progress, and loading it back. Blake: "find a way to prevent us accidentally exiting the game. If I hit the
// wrong gesture or something, it will exit the game and we'll lose our progress."
//
// The whole battle is written down as plain data: every unit and building, both sides' stores and upgrades, the mission's story
// so far, the computer opponent's plans and where the world's dice stand. What never changes (the kinds of units and buildings,
// the upgrades, the captains, the levels) is written by name, not copied; anything held in two places is written once and pointed
// to, so a unit the mission keeps an eye on is still the same unit after loading. A loaded game plays on exactly as the saved one
// would have (tools/test-liberty.mjs checks it, step by step).
(function (root) {
  const D = root.LIB_DATA || require('./data.js');
  const S = root.LIB_SIM || require('./sim.js');
  const CAMP = root.LIB_CAMP || require('./camp.js');
  const M = root.LIB_MISSIONS || require('./missions.js');
  const VERSION = 1;
  const KEY = 'liberty.game';
  const ARRAYS = { Int8Array, Uint8Array, Int16Array, Uint16Array, Int32Array, Uint32Array, Float32Array, Float64Array };
  const missions = () => M.MISSIONS.concat([M.FREE_BATTLE, M.WILD]);

  // What never changes, by name: 'D.UNITS.spearman', 'D.BUILDINGS.temple.cost', 'M.free.LEVELS.normal' and so on.
  let REG = null;
  function registry() {
    if (REG) return REG;
    const byObj = new Map(), byName = new Map();
    const walk = (name, o, depth) => {
      if (!o || typeof o !== 'object' || byObj.has(o) || depth > 4) return;
      byObj.set(o, name); byName.set(name, o);
      for (const k of Object.keys(o)) walk(name + '.' + k, o[k], depth + 1);
    };
    for (const k of Object.keys(D)) walk('D.' + k, D[k], 0);              // the kinds, upgrades, captains, maps' places and questions
    walk('C.PLANS', CAMP.PLANS, 0); walk('C.MIXES', CAMP.MIXES, 0);
    for (const m of missions()) for (const k of ['LEVELS', 'LENGTHS']) walk('M.' + m.id + '.' + k, m[k], 0);
    return (REG = { byObj, byName });
  }

  // The world, the mission's own state and the screen's (the council, the camera, what has been explored), as one piece of JSON.
  function dump(W, ui) {
    const R = registry(), memo = new Map(), ids = new Map(missions().map(m => [m, m.id])), lost = [];
    let n = 0;
    // A function can't be written down (all but the dice): note where one was, so the game isn't saved without it.
    const fn = (v, where) => { if (typeof v === 'function' && !v.state) lost.push(where); };
    const enc = v => {
      if (v === null || typeof v === 'boolean' || typeof v === 'string') return v;
      if (typeof v === 'number') return Number.isFinite(v) ? v : { $num: String(v) };
      if (v === undefined) return { $u: 1 };
      if (typeof v === 'function') return v.state ? { $rng: v.state() } : { $u: 1 };      // (the world's dice are the one function kept)
      if (R.byObj.has(v)) return { $s: R.byObj.get(v) };
      if (ids.has(v)) return { $m: ids.get(v) };
      if (memo.has(v)) return { $r: memo.get(v) };
      const id = n++; memo.set(v, id);
      if (Array.isArray(v)) return { $o: id, a: v.map((x, i) => (fn(x, '[' + i + ']'), enc(x))) };
      if (ArrayBuffer.isView(v)) return { $o: id, ta: v.constructor.name, d: Array.from(v) };
      if (v instanceof Map) return { $o: id, map: [...v].map(([k, x]) => [enc(k), enc(x)]) };
      if (v instanceof Set) return { $o: id, set: [...v].map(enc) };
      const o = {};
      for (const k of Object.keys(v)) { fn(v[k], k); o[k] = enc(v[k]); }
      return { $o: id, c: v instanceof S.World ? 'World' : v instanceof CAMP.Camp ? 'Camp' : undefined, v: o };
    };
    // The mission's own state: what it holds besides its methods and the getters that work things out.
    const m = W.mission, own = {};
    for (const k of Object.keys(m)) {
      const d = Object.getOwnPropertyDescriptor(m, k);
      if (d.get || d.set || typeof d.value === 'function') continue;
      own[k] = m[k];
    }
    const state = [enc(W), enc(own), enc(ui || {})];
    return { v: VERSION, at: Date.now(), mission: m.id, t: W.t, lost, state };
  }

  function load(snap) {
    if (!snap || snap.v !== VERSION) throw new Error('not a game this version can load');
    const R = registry(), table = [], byId = new Map(missions().map(m => [m.id, m]));
    const dec = x => {
      if (x === null || typeof x !== 'object') return x;
      if ('$num' in x) return Number(x.$num);
      if ('$u' in x) return undefined;
      if ('$rng' in x) return D.rng(x.$rng);
      if ('$s' in x) { if (!R.byName.has(x.$s)) throw new Error('unknown ' + x.$s); return R.byName.get(x.$s); }
      if ('$m' in x) return byId.get(x.$m);
      if ('$r' in x) return table[x.$r];
      if (x.a) { const a = []; table[x.$o] = a; for (const e of x.a) a.push(dec(e)); return a; }
      if (x.ta) { const a = new ARRAYS[x.ta](x.d); table[x.$o] = a; return a; }
      if (x.map) { const mp = new Map(); table[x.$o] = mp; for (const [k, v] of x.map) mp.set(dec(k), dec(v)); return mp; }
      if (x.set) { const st = new Set(); table[x.$o] = st; for (const v of x.set) st.add(dec(v)); return st; }
      const o = x.c === 'World' ? Object.create(S.World.prototype) : x.c === 'Camp' ? Object.create(CAMP.Camp.prototype) : {};
      table[x.$o] = o;
      for (const k of Object.keys(x.v)) o[k] = dec(x.v[k]);
      return o;
    };
    const W = dec(snap.state[0]), own = dec(snap.state[1]), ui = dec(snap.state[2]);
    const m = byId.get(snap.mission);
    if (!(W instanceof S.World) || !m || W.mission !== m) throw new Error('the save is broken');
    Object.assign(m, own);
    return { W, mission: m, ui };
  }

  // What the opening page says about a saved game: which one, and how far in.
  function describe(snap) {
    const m = missions().find(x => x.id === snap.mission);
    if (!m) return null;
    return { title: m.title, minutes: Math.max(1, Math.round((snap.t || 0) / 60)), at: snap.at, kicker: snap.kicker || '' };
  }

  const SAVE = { dump, load, describe, KEY, VERSION };
  if (typeof module !== 'undefined' && module.exports) module.exports = SAVE;
  else root.LIB_SAVE = SAVE;
})(this);
