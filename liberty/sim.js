// Title of Liberty: the simulation. Everything that happens in a mission,
// with no drawing and no input, so it runs the same in the browser and in
// the tests (node tools/test-liberty.mjs).
(function (root) {
  'use strict';
  const D = root.LIB_DATA || require('./data.js');
  const { TILE, MAP_W, MAP_H, T, UNITS, BUILDINGS, RESEARCH, MIRACLES, ARTIFACTS } = D;
  const REACH = 8;
  const KINDS = ['grain', 'timber', 'stone'];      // what the carts bring in
  const QUARRY = 100, OPEN = new Set([T.GRASS, T.FIELD, T.RUIN, T.FORD]);   // stone in a rock face beside open ground                                      // how many squares from your buildings a new one may stand
  const idx = (x, y) => y * MAP_W + x;
  const center = t => t * TILE + TILE / 2;
  const tileOf = p => Math.floor(p / TILE);
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const maxHp = e => e.max || e.def.hp;                // walls grow stronger with pickets
  // What kind of fighter a unit is, for who beats whom: shooters, the armored, and the lightly armed.
  const kindOf = def => def.beast ? 'beast' : def.ranged ? 'ranged' : (def.armor || 0) >= 2 ? 'armored' : 'light';
  // A fighter: a soldier of the Nephites, or a warrior of the Lamanites.
  const fighter = def => !!(def.soldier || def.foe);
  // One who can be sent to fight: a fighter with a blow, and not a hauler, builder or scout (ui.js sends these on attack-move).
  const canFight = def => fighter(def) && !!def.dmg && !def.gathers && !def.builds && !def.scout;
  // Armor takes a share of each blow, never all of it.
  const ARMOR = 6;

  // ------------------------------------------------------------------ world

  class World {
    constructor(seed, map) {
      this.rand = D.rng(seed == null ? 7 : seed);  // the same game plays out the same way
      const m = (map || D.buildMap)();
      this.tiles = m.tiles;
      this.amt = m.amt;
      // Rock with open ground beside it is a rock face: carts can quarry stone there. It stays rock when worked out.
      for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) {
        const i = idx(x, y);
        if (this.tiles[i] !== T.ROCK || this.amt[i]) continue;
        for (let dy = -1; dy <= 1 && !this.amt[i]; dy++) for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx, ny = y + dy;
          if ((dx || dy) && nx >= 0 && ny >= 0 && nx < MAP_W && ny < MAP_H && OPEN.has(this.tiles[idx(nx, ny)])) { this.amt[i] = QUARRY; break; }
        }
      }
      this.occ = new Int32Array(MAP_W * MAP_H);   // building id on each tile
      this.ents = new Map();
      this.nextId = 1;
      this.t = 0;
      this.me = 'p';                               // the human's side; the opponent is 'r'
      this.sides = { p: World.side('freemen'), r: World.side('kingmen') };   // each side's stores, upgrades and finds
      this.prov = null;                            // the robbers' food, when it matters
      this.border = D.BORDER_Y;                    // a row the player may not go north of; null for none
      this.borderOpen = false;
      this.cover = [];                             // places an army can lie hidden: [{ x0, y0, x1, y1, name }]
      this.truce = false;                          // while it holds, nobody is hurt
      this.boost = { p: 1, r: 1 };                 // each side's strength, for a while
      this.shield = { p: 1, r: 1 };                // and how much harm each side takes
      this.buffUntil = 0;                          // "in the strength of the Lord" (3 Nephi 4:10)
      this.zones = [];                             // where a miracle is at work: { kind, team, x, y, r, until }
      this.quakeAt = -99;
      this.tech = false;                           // free battle: food, storage and a tech tree
      this.msgs = [];
      this.stats = { prisoners: 0, escaped: 0, fallen: 0, defeated: 0, gathered: 0, spared: 0 };
      this.trained = {};                           // how many of each kind were trained
      this.alarms = [];                            // where something of yours was attacked: [{ t, x, y }]
      this.noGo = [];                              // lands the player's people may not enter: [{ x0, y0, x1, y1, text, ref }]
      this.over = null;                            // { won, text, stars }
      this.terrainDirty = true;
      this.effects = [];                           // arrows and the like, for drawing
      this.lastBorderMsg = -99;
      this.perks = [];                             // campaign star perks and relics (data.js: PERKS)
      this.yieldPops = [];                         // floating harvest/production yield text popups: [{ x, y, text, type, t }]
      this.cohorts = {
        1: { name: 'Vanguard', formation: 'phalanx', speedLock: true, rule: 'hunt', healthThreshold: 50 },
        2: { name: 'Skirmishers', formation: 'line', speedLock: true, rule: 'hunt', healthThreshold: 50 },
        3: { name: 'Siege & Supply', formation: 'escort', speedLock: true, rule: 'speed', healthThreshold: 40 }
      };
      this.rallyPoints = {};                       // { buildingId: { x, y } }
    }

    setCohort(u, cohortId) { if (u) u.cohort = cohortId; }
    cohortUnits(team, cohortId) { return this.units(team).filter(u => u.cohort === cohortId); }

    hasPerk(id) { return Array.isArray(this.perks) && this.perks.includes(id); }

    // --- sides
    // What one side holds: its stores, what it has made, and what it has found. The human's side is read as
    // World.res, World.researched and so on, so the panel, the missions and the tests needn't know about sides.
    static side(name) {
      return { side: name || null, res: { grain: 0, timber: 0, stone: 0 }, researched: {}, researching: null,
        armor: 0, dmgUp: 0, wallMul: 1, wallLevel: 1, bows: false, clothing: false, ladders: false, artifacts: {}, ready: {}, captain: null };
    }
    side(team) { return this.sides[team] || (this.sides[team] = World.side()); }
    // What to call a side's people in a message: "The Lamanites have made ..." (data.js: SIDES).
    peopleOf(team) { const k = this.side(team).side, S = D.SIDES && D.SIDES[k]; return (S && S.people) || 'The enemy'; }
    get res() { return this.side(this.me).res; }                       set res(v) { this.side(this.me).res = v; }
    get researched() { return this.side(this.me).researched; }         set researched(v) { this.side(this.me).researched = v; }
    get researching() { return this.side(this.me).researching; }       set researching(v) { this.side(this.me).researching = v; }
    get armor() { return this.side(this.me).armor; }                   set armor(v) { this.side(this.me).armor = v; }
    get dmgUp() { return this.side(this.me).dmgUp; }                   set dmgUp(v) { this.side(this.me).dmgUp = v; }
    get wallMul() { return this.side(this.me).wallMul; }               set wallMul(v) { this.side(this.me).wallMul = v; }
    get bows() { return this.side(this.me).bows; }                     set bows(v) { this.side(this.me).bows = v; }
    get clothing() { return this.side(this.me).clothing; }             set clothing(v) { this.side(this.me).clothing = v; }
    get ladders() { return this.side(this.me).ladders; }               set ladders(v) { this.side(this.me).ladders = v; }
    get artifacts() { return this.side(this.me).artifacts; }           set artifacts(v) { this.side(this.me).artifacts = v; }
    get ready() { return this.side(this.me).ready; }                   set ready(v) { this.side(this.me).ready = v; }
    get foeArmor() { return this.side('r').armor; }                    set foeArmor(v) { this.side('r').armor = v; }

    // --- tiles
    inBounds(x, y) { return x >= 0 && y >= 0 && x < MAP_W && y < MAP_H; }
    tile(x, y) { return this.inBounds(x, y) ? this.tiles[idx(x, y)] : T.ROCK; }
    setTile(x, y, t, a) { this.tiles[idx(x, y)] = t; this.amt[idx(x, y)] = a || 0; this.terrainDirty = true; }
    // Can this team stand on (x, y)? Robbers can also plan through walls, which they then break.
    passable(x, y, team, throughWalls) {
      if (!this.inBounds(x, y)) return false;
      const t = this.tiles[idx(x, y)];
      if (t === T.WATER || t === T.ROCK || t === T.FOREST) return false;
      const b = this.occ[idx(x, y)];
      if (b) {
        const e = this.ents.get(b);
        if (!e) return true;
        if (e.def.gate && e.team === team) return true;
        if (!(throughWalls && e.def.wall && e.team !== team)) return false;   // over an enemy's wall, never one's own
      }
      // Gidgiddoni: "we will not go against them, but we will wait till they shall come against us" (3 Nephi 3:21).
      if (team === this.me && this.border != null && y < this.border && !this.borderOpen) return false;
      if (team === this.me && this.noGo.length && this.noGo.some(z => x >= z.x0 && x <= z.x1 && y >= z.y0 && y <= z.y1)) return false;
      return true;
    }

    msg(text, ref, kind) { this.msgs.push({ t: this.t, text, ref: ref || null, kind: kind || 'story' }); }

    // --- entities
    addUnit(type, team, x, y, extra) {
      const def = UNITS[type];
      const u = Object.assign({ id: this.nextId++, kind: 'unit', type, def, team, x, y, hp: def.hp, cool: 0, order: { type: 'idle' }, path: null, carry: null, face: 0, think: this.rand() * 0.4 }, extra || {});
      if (team === this.me && type === 'stripling' && this.hasPerk('stripling_covenant')) {
        u.rank = Math.max(u.rank || 0, 1);
        u.kills = Math.max(u.kills || 0, 3);
        const hpBonus = Math.round(def.hp * 1.2);
        u.max = Math.max(u.max || def.hp, hpBonus);
        u.hp = u.max;
      }
      this.ents.set(u.id, u);
      return u;
    }
    addBuilding(type, team, tx, ty, built, extra) {
      const def = BUILDINGS[type];
      const mul = this.side(team).wallMul, max = def.wall && mul > 1 ? def.hp * mul : undefined;
      const b = Object.assign({ id: this.nextId++, kind: 'building', type, def, team, tx, ty, w: def.w, h: def.h, max,
        x: (tx + def.w / 2) * TILE, y: (ty + def.h / 2) * TILE, hp: built ? (max || def.hp) : Math.max(1, (max || def.hp) * 0.1), built: built ? 1 : 0, queue: [], cool: 0 }, extra || {});
      for (let y = ty; y < ty + def.h; y++) for (let x = tx; x < tx + def.w; x++) {
        if (this.tile(x, y) === T.FOREST || this.tile(x, y) === T.FIELD) this.setTile(x, y, T.GRASS);
        this.occ[idx(x, y)] = b.id;
      }
      this.ents.set(b.id, b);
      this.pushUnitsOut(b);
      return b;
    }
    remove(e) {
      if (!this.ents.has(e.id)) return;
      this.ents.delete(e.id);
      if (e.kind === 'building') {
        for (let y = e.ty; y < e.ty + e.h; y++) for (let x = e.tx; x < e.tx + e.w; x++) if (this.occ[idx(x, y)] === e.id) this.occ[idx(x, y)] = 0;
        this.terrainDirty = true;
      }
      e.dead = true;
    }
    units(team) { const out = []; for (const e of this.ents.values()) if (e.kind === 'unit' && (!team || e.team === team)) out.push(e); return out; }
    buildings(team, type) { const out = []; for (const e of this.ents.values()) if (e.kind === 'building' && (!team || e.team === team) && (!type || e.type === type)) out.push(e); return out; }
    // A side's capital: Zarahemla for the Freemen, the war camp for the King-men (data.js: SIDES).
    sideOf(team) { const k = this.side(team || this.me).side; return (k && D.SIDES && D.SIDES[k]) || null; }
    capitalType(team) { const S = this.sideOf(team); return (S && S.capital) || 'stronghold'; }
    foodHint(team) { const S = this.sideOf(team); return (S && S.foodHint) || 'build a farm'; }
    stronghold(team) { return this.buildings(team || this.me, this.capitalType(team))[0] || null; }
    soldiers(team) { return this.units(team || this.me).filter(u => fighter(u.def)); }
    // A hero of the Nephites; or, in a skirmish, a leader of the Lamanites.
    heroic(u) { return !!(u.def.hero || (u.def.leader && this.tech)); }

    // Nearest free tile to (tx, ty) this team can stand on.
    freeTileNear(tx, ty, team) {
      for (let r = 0; r < 12; r++) {
        for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          if (this.passable(tx + dx, ty + dy, team)) return [tx + dx, ty + dy];
        }
      }
      return [tx, ty];
    }
    pushUnitsOut(b) {
      for (const u of this.units()) {
        const tx = tileOf(u.x), ty = tileOf(u.y);
        if (tx >= b.tx && tx < b.tx + b.w && ty >= b.ty && ty < b.ty + b.h) {
          const [fx, fy] = this.freeTileNear(tx, ty, u.team);
          u.x = center(fx); u.y = center(fy); u.path = null;
        }
      }
    }

    // --- paths: A* on tiles, eight ways, no cutting corners.
    // `goal` is a rectangle; `near` means ending next to it is enough.
    findPath(u, goal, near) {
      const team = u.team, walls = (u.team !== this.me && fighter(u.def)) || this.canClimb(u);
      const sx = tileOf(u.x), sy = tileOf(u.y);
      const gx0 = goal.x0, gy0 = goal.y0, gx1 = goal.x1, gy1 = goal.y1;
      const reached = (x, y) => near
        ? x >= gx0 - 1 && x <= gx1 + 1 && y >= gy0 - 1 && y <= gy1 + 1
        : x >= gx0 && x <= gx1 && y >= gy0 && y <= gy1;
      const hx = (gx0 + gx1) / 2, hy = (gy0 + gy1) / 2;
      const h = (x, y) => { const dx = Math.abs(x - hx), dy = Math.abs(y - hy); return Math.max(dx, dy) + 0.414 * Math.min(dx, dy); };
      if (reached(sx, sy)) return [];
      const N = MAP_W * MAP_H;
      const g = new Float32Array(N).fill(Infinity), from = new Int32Array(N).fill(-1), closed = new Uint8Array(N);
      const heap = [];   // [f, i]
      const push = (f, i) => { heap.push([f, i]); let k = heap.length - 1; while (k > 0) { const p = (k - 1) >> 1; if (heap[p][0] <= heap[k][0]) break; [heap[p], heap[k]] = [heap[k], heap[p]]; k = p; } };
      const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let k = 0; for (;;) { const l = 2 * k + 1, r = l + 1; let m = k; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === k) break; [heap[m], heap[k]] = [heap[k], heap[m]]; k = m; } } return top; };
      const cost = (x, y) => {
        if (!this.passable(x, y, team, walls)) return Infinity;
        let c = 1;
        const b = this.occ[idx(x, y)];
        if (b && walls) c += 10;                    // breaking through takes a while
        if (this.tiles[idx(x, y)] === T.FORD) c += 0.5;
        return c;
      };
      const s = idx(sx, sy);
      g[s] = 0; push(h(sx, sy), s);
      let best = s, bestH = h(sx, sy), n = 0, end = -1;
      while (heap.length && n++ < 9000) {
        const [, i] = pop();
        if (closed[i]) continue;
        closed[i] = 1;
        const x = i % MAP_W, y = (i / MAP_W) | 0;
        if (reached(x, y)) { end = i; break; }
        const hh = h(x, y);
        if (hh < bestH) { bestH = hh; best = i; }
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue;
          const nx = x + dx, ny = y + dy;
          if (!this.inBounds(nx, ny)) continue;
          const j = idx(nx, ny);
          if (closed[j]) continue;
          let c = cost(nx, ny);
          if (c === Infinity) continue;
          if (dx && dy) {                          // diagonal: both sides must be open
            if (cost(x + dx, y) === Infinity || cost(x, y + dy) === Infinity) continue;
            c *= 1.414;
          }
          const ng = g[i] + c;
          if (ng < g[j]) { g[j] = ng; from[j] = i; push(ng + h(nx, ny), j); }
        }
      }
      if (end < 0) end = best;                     // can't get there: as close as it can
      const path = [];
      for (let i = end; i !== s && i >= 0; i = from[i]) path.push([i % MAP_W, (i / MAP_W) | 0]);
      return path.reverse();
    }
    rectOf(e) { return e.kind === 'building' ? { x0: e.tx, y0: e.ty, x1: e.tx + e.w - 1, y1: e.ty + e.h - 1 } : { x0: tileOf(e.x), y0: tileOf(e.y), x1: tileOf(e.x), y1: tileOf(e.y) }; }
    // Standing on a tile next to the rectangle (diagonals count), the same test findPath's `near` uses.
    nextTo(u, r) {
      const x = tileOf(u.x), y = tileOf(u.y);
      return x >= r.x0 - 1 && x <= r.x1 + 1 && y >= r.y0 - 1 && y <= r.y1 + 1;
    }
    // The last few steps, straight at a point, when the path has run out.
    approach(u, px, py, dt) {
      const dx = px - u.x, dy = py - u.y, d = Math.hypot(dx, dy);
      if (d < 1) return;
      let sp = u.def.speed * (u.slow || 1);
      if (u.type === 'cart' && u.team === this.me && this.hasPerk('nephite_chariots')) sp *= 1.2;
      const s = Math.min(d, sp * dt);
      const nx = u.x + dx / d * s, ny = u.y + dy / d * s;
      if (this.passable(tileOf(nx), tileOf(ny), u.team)) { u.x = nx; u.y = ny; u.face = Math.atan2(dy, dx); }
    }

    // --- orders (what a player's click, or the robbers' plans, ask for)
    order(u, o) {
      // A worker taken off gathering to build goes back to it when the building is done.
      if (o.type === 'build' && !o.resume) o.resume = u.order.type === 'gather' ? { type: 'gather', tx: u.order.tx, ty: u.order.ty, res: u.order.res } : u.order.resume || null;
      u.order = o; u.path = null; u.repath = 0;
      if (o.type === 'gather') u.phase = 'go';                 // always walk to it first, even if it was working elsewhere
      else if (o.type !== 'build') u.phase = null;
    }
    moveTo(u, tx, ty, attackMove) {
      if (u.team === this.me && this.border != null && ty < this.border && !this.borderOpen) {
        if (this.t - this.lastBorderMsg > 8) {
          this.lastBorderMsg = this.t;
          this.msg('Gidgiddoni: “we will not go against them, but we will wait till they shall come against us.”', '3 Nephi 3:21', 'rule');
        }
        ty = this.border;
      }
      const z = u.team === this.me && this.noGo.find(z => tx >= z.x0 && tx <= z.x1 && ty >= z.y0 && ty <= z.y1);
      if (z && this.t - this.lastBorderMsg > 8) { this.lastBorderMsg = this.t; this.msg(z.text, z.ref, 'rule'); }
      this.order(u, { type: 'move', tx, ty, attackMove: !!attackMove });
    }

    // --- the tech tree (free battle): what stands, what it opens, food and storage
    visible(def) { return !def.tier || this.tech; }
    has(type, team) { return this.buildings(team || this.me, type).some(b => b.built >= 1); }
    missing(def, team) { return this.tech ? (def.needs || []).filter(t => !this.has(t, team)) : []; }
    foodCap(team) { let n = 0; for (const b of this.buildings(team || this.me)) if (b.built >= 1) n += b.def.food || 0; return n; }
    foodUsed(team) {
      team = team || this.me;
      let n = 0;
      for (const e of this.ents.values()) {
        if (e.team !== team) continue;
        if (e.kind === 'unit' && !this.heroic(e) && (fighter(e.def) || e.def.gathers || e.def.builds || e.def.scout)) n += e.def.eats || 1;
        else if (e.kind === 'building') for (const q of e.queue) n += UNITS[q.type].eats || 1;
      }
      return n;
    }
    storeCap(team) {
      let n = 0;
      for (const b of this.buildings(team || this.me)) if (b.built >= 1) n += b.def.store || 0;
      if ((team || this.me) === this.me && this.hasPerk('joseph_granaries')) n += 300;
      return n;
    }
    // Grain and timber coming in; in free battle, only as much as the storehouses hold.
    gain(kind, amt, team) {
      team = team || this.me;
      const res = this.side(team).res;
      res[kind] = (res[kind] || 0) + amt;
      if (!this.tech) return;
      const cap = this.storeCap(team);
      if (res[kind] > cap) { res[kind] = cap; if (team === this.me) this.fullAt = this.t; }
    }
    // Why a building can't go up yet, or '' if it can.
    whyNotBuild(type, team) {
      const def = BUILDINGS[type], need = this.missing(def, team);
      if (!this.visible(def)) return 'Not in this mission';
      if (need.length) return 'Needs ' + need.map(t => BUILDINGS[t].name).join(' and ');
      return '';
    }
    whyNotTrain(type, team) {
      const def = UNITS[type], need = this.missing(def, team);
      if (!this.visible(def)) return 'Not in this mission';
      if (need.length) return 'Needs ' + need.map(t => BUILDINGS[t].name).join(' and ');
      if (this.tech && this.foodUsed(team) + (def.eats || 1) > this.foodCap(team)) return 'Not enough food: ' + this.foodHint(team);
      return '';
    }
    // The standard of liberty, planted: your city stands there (Alma 46:36).
    deploy(u) {
      if (!u.def.deploys) return null;
      const x = tileOf(u.x) - 1, y = tileOf(u.y) - 1;
      const type = this.capitalType(u.team);
      if (!this.canPlace(type, x, y, u.team)) return null;
      const side = this.side(u.team);
      const heroType = u.heroType || (side.captain && side.captain.hero) || (u.team === 'p' ? 'moroni' : 'zerahemnah');
      this.remove(u);
      const b = this.addBuilding(type, u.team, x, y, true, { name: type === 'stronghold' ? "Captain's encampment" : 'Your camp', tier: 1 });
      // The Leader plants the standard and steps out as an active combat hero!
      let hero = null;
      if (UNITS[heroType] && !this.units(u.team).some(un => un.type === heroType)) {
        const [hx, hy] = this.freeTileNear(b.tx + 1, b.ty + b.h, u.team);
        hero = this.addUnit(heroType, u.team, center(hx), center(hy));
      }
      if (u.team === this.me) {
        const heroName = hero ? UNITS[heroType].name : 'your captain';
        this.msg('You plant the standard of liberty, and ' + heroName + ' leads your armies.', 'Alma 46:36', 'good');
      }
      return b;
    }

    // --- building and training
    canAfford(cost, team) { const res = this.side(team || this.me).res; return !cost || KINDS.every(k => (cost[k] || 0) <= (res[k] || 0)); }
    pay(cost, team) { if (!cost) return; const res = this.side(team || this.me).res; for (const k of KINDS) if (cost[k]) res[k] = (res[k] || 0) - cost[k]; }
    // Your own wall piece on a square, if there is one.
    wallAt(tx, ty, team) { const id = this.occ[idx(tx, ty)], e = id && this.ents.get(id); return e && e.kind === 'building' && e.type === 'wall' && e.team === (team || this.me) && !e.dead ? e : null; }
    // What taking a building down gives back: all of it while it is still rising, half once it stands (Red Alert's sell).
    sellValue(b) {
      const cost = this.costOf(b.def, b.team, 'build'), k = b.built < 1 ? 1 : 0.5, out = {};
      for (const r of KINDS) if (cost[r]) out[r] = Math.floor(cost[r] * k);
      return out;
    }
    // Take down something you built. What it was training, or making, comes back too. (Not the city or the camp: they were never built.)
    sell(b) {
      if (!b || b.dead || b.kind !== 'building' || !b.def.cost || b.untouchable) return false;
      this.refund(this.sellValue(b), b.team);
      for (const q of b.queue || []) this.refund(this.costOf(UNITS[q.type], b.team, 'train'), b.team);
      const S = this.side(b.team);
      if (S.researching && S.researching.by === b.id) { this.refund(RESEARCH[S.researching.key].cost, b.team); S.researching = null; }
      this.remove(b);
      return true;
    }
    refund(cost, team) { if (!cost) return; const res = this.side(team || this.me).res; for (const k of KINDS) if (cost[k]) res[k] = (res[k] || 0) + cost[k]; }
    canPlace(type, tx, ty, team) { return !this.whyNotPlace(type, tx, ty, team); }
    // Why a building can't go on that spot: 'ground' (not open, or over the border), 'far' (out of reach of your
    // buildings: like Red Alert, you build next to what you have), or '' when it can.
    whyNotPlace(type, tx, ty, team) {
      const def = BUILDINGS[type];
      team = team || this.me;
      for (let y = ty; y < ty + def.h; y++) for (let x = tx; x < tx + def.w; x++) {
        if (!this.inBounds(x, y)) return 'ground';
        const t = this.tile(x, y);
        if (t !== T.GRASS && t !== T.FIELD && t !== T.RUIN) return 'ground';
        if (this.occ[idx(x, y)] && !(def.gate && this.wallAt(x, y, team))) return 'ground';   // (a gate may take the place of your own wall piece)
        if (team === this.me && this.border != null && y < this.border) return 'ground';
      }
      if (def.cost && !this.inReach(tx, ty, def.w, def.h, team)) return 'far';
      return '';
    }
    inReach(tx, ty, w, h, team) {
      for (const b of this.buildings(team || this.me)) {
        if (b.def.wall != null) continue;
        const gap = Math.max(b.tx - (tx + w), tx - (b.tx + b.w), b.ty - (ty + h), ty - (b.ty + b.h));
        if (gap < REACH) return true;
      }
      return false;
    }
    place(type, tx, ty, builders, team) {
      const def = BUILDINGS[type];
      team = team || this.me;
      if (!def || !def.cost) return null;            // only what can be built: not a city, a village or a camp
      const cost = this.costOf(def, team, 'build');
      if (this.whyNotBuild(type, team) || !this.canPlace(type, tx, ty, team) || !this.canAfford(cost, team)) return null;
      this.pay(cost, team);
      if (def.gate) { const w = this.wallAt(tx, ty, team); if (w) this.sell(w); }   // the gate goes in where the wall piece was
      const b = this.addBuilding(type, team, tx, ty, false);
      for (const u of builders || []) if (u.def.builds) this.order(u, { type: 'build', target: b.id });
      return b;
    }
    train(b, type) {
      const def = UNITS[type];
      const cost = this.costOf(def, b.team, 'train');
      if (b.built < 1 || !b.def.trains || !b.def.trains.includes(type) || this.whyNotTrain(type, b.team) || !this.canAfford(cost, b.team) || b.queue.length >= 5) return false;
      this.pay(cost, b.team);
      b.queue.push({ type, left: def.time });
      return true;
    }
    // What a thing costs this side: a captain's gift, or the Rameumptom, may make it cheaper (data.js: CAPTAINS).
    costOf(def, team, what) {
      team = team || this.me;
      const c = this.side(team).captain, g = (c && c.bonus) || {};
      let k = 1;
      if (what === 'build' && def.wall != null && g.wallCost) k = g.wallCost;
      if (what === 'build' && team === this.me && this.hasPerk('moroni_forts') && (def.wall != null || def.gate || def.ditch)) k *= 0.8;
      if (what === 'train' && def.foe && !def.leader) {
        if (def.needs && g.captainCost) k = g.captainCost;                                   // the captains
        else if (!def.needs && g.warriorCost) k = g.warriorCost;                             // warriors and slingers
        if (!def.needs && this.buildings(team).some(x => x.def.powers === 'cunning' && x.built >= 1 && !x.dead)) k *= 0.8;   // the Rameumptom: numbers (Alma 49:6)
      }
      if (k === 1 || !def.cost) return def.cost;
      const out = {}; for (const r of KINDS) if (def.cost[r]) out[r] = Math.round(def.cost[r] * k);
      return out;
    }
    // What a building can make: in free battle, the armory's list; in a mission, the mission's own armor at the barracks.
    researchAt(b) {
      if (b.type === 'stronghold') return (b.def.research || []).filter(k => !this.side(b.team).researched[k] && (!RESEARCH[k].after || this.side(b.team).researched[RESEARCH[k].after]));
      if (this.tech) return (b.def.research || []).filter(k => k !== 'armor' && (!RESEARCH[k].after || this.side(b.team).researched[RESEARCH[k].after]));   // (a level of walls after the one before it)
      return b.def.research ? [(this.mission && this.mission.research) || 'armor'] : [];
    }
    research(b, key) {
      const r = RESEARCH[key];
      if (!r || !this.researchAt(b).includes(key)) return false;   // only where it's made
      const S = this.side(b.team);
      if (b.built < 1 || S.researched[key] || S.researching || !this.canAfford(r.cost, b.team)) return false;
      this.pay(r.cost, b.team);
      S.researching = { key, left: r.time, by: b.id };
      return true;
    }

    // --- combat
    damage(target, amount, from) {
      if (target.dead || target.untouchable || this.truce) return;
      if (this.inZone(target, 'fire', target.team)) return;                  // within their pillar of fire nothing harms them (Helaman 5:23)
      const F = from && this.side(from.team);
      let a = amount * (from && this.boost[from.team] || 1);
      if (from && from.kind === 'unit' && fighter(from.def) && !from.def.ranged) a += F.dmgUp;
      if (from && from.kind === 'unit' && this.aura(from)) a *= 1.25;
      if (from && from.type === 'archer' && F.bows) a += 4;                                // bows of fine steel
      if (from && from.type === 'javelin' && F.captain && F.captain.bonus.javelin) a += 4;  // Teancum's javelins
      if (from && from.fierceUntil > this.t) a *= 1.25;                                     // fierce from the war-dance
      if (from && from.thirstUntil > this.t) a *= 1.5;                                      // bloodthirst: they "fight like dragons" (Alma 43:44)
      if (from && from.rank) a *= 1 + 0.15 * from.rank;                                   // a veteran strikes harder
      if (from && from.sword) a *= 1.5;                                                   // the sword of Laban (1 Nephi 4:9)
      if (from && from.def.foe && from.weak) a *= 0.6;
      const TS = this.side(target.team), unit = target.kind === 'unit';
      // Each kind of fighter is strong against another (data.js: `beats`).
      if (from && from.kind === 'unit' && unit && from.def.beats && [].concat(from.def.beats).includes(kindOf(target.def))) a *= 1.5;
      if (from && from.def.siege && target.kind === 'building') a *= from.def.siege;     // the cumom butts down walls and buildings
      const armor = (target.def.armor || 0) + (unit && target.def.ranged && TS.clothing ? 2 : 0) + (unit && (target.def.soldier || target.def.foe) ? TS.armor : 0);
      a = Math.max(1, a * ARMOR / (ARMOR + armor));
      if (target.team === this.me && this.t < this.buffUntil) a *= 0.65;
      a *= this.shield[target.team] || 1;
      if (target.spare) a = Math.min(a, Math.max(0, target.hp - 1));   // his part in the story isn't over
      target.hp -= a;
      target.hitAt = this.t;
      if (target.hp > 0 && unit && target.order && target.order.type === 'move' && target.order.healthThreshold && (target.hp / (target.max || target.def.hp)) * 100 < target.order.healthThreshold) {
        this.order(target, { type: 'idle' });
        this.autoAcquire(target, target.def.sight);
        if (target.team === this.me && this.t - (target.breakMsgAt || -99) > 10) {
          target.breakMsgAt = this.t;
          this.msg('Cohort breaks march: taking defensive stand!', null, 'warn');
        }
      }
      if (target.kind === 'building') target.lastHitBy = from ? from.id : null;
      if (target.kind === 'unit' && from && from.team === this.me && target.team !== this.me) target.lastHitBy = from.id;
      if (target.team === this.me && from && from.team !== this.me) { this.callHelp(target, from); this.alarm(target); }
      // Defensive counter-attacks for carts and fighting workers
      if (target.hp > 0 && unit && from && from.kind === 'unit' && !from.dead && from.team !== target.team) {
        if (target.type === 'cart') {
          const load = (target.carry && target.carry.type) || target.pref || 'grain';
          if (load === 'grain') {
            target.burstUntil = this.t + 3;
          } else if (load === 'stone') {
            if (dist(target, from) <= 110 && target.cool <= 0) {
              target.face = Math.atan2(from.y - target.y, from.x - target.x);
              this.effects.push({ t: this.t, x0: target.x, y0: target.y, x1: from.x, y1: from.y, kind: 'stone', team: target.team });
              this.damage(from, 6, target);
              target.cool = 1.2;
            }
          } else if (load === 'timber') {
            if (dist(target, from) <= 35 && target.cool <= 0) {
              target.face = Math.atan2(from.y - target.y, from.x - target.x);
              this.effects.push({ t: this.t, x0: target.x, y0: target.y, x1: from.x, y1: from.y, kind: 'hit', stake: true, team: target.team });
              this.damage(from, 8, target);
              target.cool = 1.4;
              from.slow = 0.5;
              from.slowUntil = this.t + 1.8;
            }
          }
        } else if (target.type === 'worker') {
          if (dist(target, from) <= 22 && target.cool <= 0) {
            target.face = Math.atan2(from.y - target.y, from.x - target.x);
            this.effects.push({ t: this.t, x0: target.x, y0: target.y, x1: from.x, y1: from.y, kind: 'hit', scythe: true, team: target.team });
            this.damage(from, target.def.dmg || 5, target);
            target.cool = target.def.cd || 1.2;
          }
        }
      }
      // Your soldiers sent against a building strike back at whoever strikes them on the way, then go on (Blake's review:
      // they used to walk on into the defenders). A plain march (Fall back) keeps walking. A chase that lands no blow for 8 s is
      // given up (a slinger across a river can't be reached), and then he doesn't turn again for 10 s, so he can't be led to and fro.
      if (target.hp > 0 && unit && target.team === this.me && (canFight(target.def) || target.type === 'worker') && from && from.kind === 'unit' && !from.dead && from.team !== target.team
          && !(target.strikeCool > this.t)) {
        const o = target.order, at = o.type === 'attack' && this.ents.get(o.target);
        if (at && at.kind === 'building') this.order(target, { type: 'attack', target: from.id, then: o, leash: { x: target.x, y: target.y }, until: this.t + 8 });
        else if (target.type === 'worker' && o.type !== 'attack' && o.type !== 'move') {
          this.order(target, { type: 'attack', target: from.id, then: o, leash: { x: target.x, y: target.y }, until: this.t + 6 });
        }
      }
      if (target.hp <= 0) this.kill(target, from);
    }
    // Something of yours is attacked: idle soldiers nearby come to defend it.
    callHelp(target, from) {
      if (target.helpAt && this.t - target.helpAt < 1) return;
      target.helpAt = this.t;
      for (const u of this.ents.values()) {
        if (u.kind !== 'unit' || u.team !== target.team || !fighter(u.def) || u.dead) continue;
        if (u.order.type !== 'idle' || dist(u, target) > 360) continue;
        this.order(u, { type: 'attack', target: from.id, leash: { x: u.x, y: u.y } });
      }
    }
    // A building or a worker of yours is attacked: say so (now and then, not every blow) and mark the place.
    alarm(target) {
      if (target.kind === 'unit' && !target.def.gathers && !target.def.builds && !target.def.scout) return;   // soldiers fighting are no news
      const last = this.alarms[this.alarms.length - 1];
      if (last && this.t - last.t < 15 && Math.hypot(last.x - target.x, last.y - target.y) < 500) return;
      this.alarms.push({ t: this.t, x: target.x, y: target.y });
      if (this.alarms.length > 20) this.alarms.shift();
      const what = target.kind === 'building' ? (target.name === 'Your city' ? 'Your city' : 'Your ' + target.def.name.toLowerCase()) : target.def.scout ? 'Your spy' : 'Your workers';
      this.msg(`${what} ${target.kind === 'building' ? 'is' : 'are'} under attack!`, null, 'warn');
    }
    aura(u) {
      if (!fighter(u.def) || this.heroic(u)) return false;
      for (const h of this.ents.values()) if (h.kind === 'unit' && (this.heroic(h) || h.sword) && h.team === u.team && !h.dead && dist(h, u) < (h.def.aura || 110)) return true;
      return false;
    }
    // --- artifacts: found among the Jaredite ruins, or brought out by the people (data.js: ARTIFACTS)
    grant(key, how, team, at) {
      team = team || this.me;
      const a = ARTIFACTS[key], S = this.side(team);
      if (!a || S.artifacts[key]) return false;
      S.artifacts[key] = true;
      if (key === 'beast') {                         // the side's own great beast, tame, where it was found
        const type = S.side === 'kingmen' ? 'cumom' : 'curelom', [x, y] = this.freeTileNear(at ? at.tx : tileOf(this.stronghold(team).x), at ? at.ty + 1 : tileOf(this.stronghold(team).y) + 3, team);
        this.addUnit(type, team, center(x), center(y));
      }
      if (key === 'breastplate') S.armor += 2;
      if (key === 'sword') this.swordTo(null, team);
      if (team === this.me) this.msg(a.found, a.ref, 'good');
      else this.msg(`${this.peopleOf(team)} have found ${a.name.replace(/^The /, 'the ')}.`, a.ref, 'warn');
      if (this.mission && this.mission.onArtifact) this.mission.onArtifact(this, key, how, team);
      return true;
    }
    // The sword of Laban goes to the best soldier standing; when he falls, to the next.
    swordTo(except, team) {
      team = team || this.me;
      if (!this.side(team).artifacts.sword) return null;
      let best = null, bk = -1;
      for (const u of this.units(team)) if (u !== except && (u.def.soldier || u.def.foe) && !u.def.hero && !u.def.leader && !u.dead && (u.kills || 0) > bk) { bk = u.kills || 0; best = u; }
      if (best) best.sword = true;
      return best;
    }
    // --- the temple's miracles
    // Is `e` within a zone of that kind? With `team`, one worked by that side; with `foe`, one worked by any other side.
    inZone(e, kind, team, foe) { return this.zones.some(z => z.kind === kind && (team == null || z.team === team) && (foe == null || z.team !== foe) && Math.hypot(e.x - z.x, e.y - z.y) < z.r); }
    // Where a side's powers are worked: the Freemen's temple, the King-men's Rameumptom (data.js: POWERS). temple() is the old name.
    powerHouse(team) { return this.buildings(team || this.me).find(b => b.def.powers && b.built >= 1 && !b.dead) || null; }
    temple(team) { return this.powerHouse(team); }
    power(key) { for (const k in D.POWERS) if (D.POWERS[k][key]) return D.POWERS[k][key]; return null; }
    // Why a miracle can't be worked now: 'temple' (none stands), 'wait' (not yet), or ''.
    whyNotMiracle(key, team) { const m = this.power(key), h = this.powerHouse(team); if (!m) return 'none'; if (!h || !D.POWERS[h.def.powers][key]) return 'temple'; return this.t < (this.side(team || this.me).ready[key] || 0) ? 'wait' : ''; }
    miracleWait(key, team) { return Math.max(0, (this.side(team || this.me).ready[key] || 0) - this.t); }
    // Work a miracle at a spot (or on one foe, or on everyone). False if it can't be.
    miracle(key, x, y, targetId, team) {
      team = team || this.me;
      const m = this.power(key);
      if (!m || this.whyNotMiracle(key, team)) return false;
      const foesIn = r => [...this.ents.values()].filter(e => e.kind === 'unit' && e.team !== team && e.team !== 'n' && !e.dead && !e.untouchable && Math.hypot(e.x - x, e.y - y) < r);
      const thirsty = u => u.thirstUntil > this.t;   // bloodthirst: fire, sleep and confusion don't turn them back (Moroni 9:5)
      if (key === 'fire') {
        this.zones.push({ kind: 'fire', team, x, y, r: m.r, until: this.t + m.last });
        for (const u of foesIn(m.r)) {
          if (thirsty(u)) continue;
          u.fearUntil = this.t + m.last;
          const a = Math.atan2(u.y - y, u.x - x), [tx, ty] = this.freeTileNear(tileOf(x + Math.cos(a) * (m.r + 80)), tileOf(y + Math.sin(a) * (m.r + 80)), u.team);
          this.order(u, { type: 'move', tx, ty });
        }
      } else if (key === 'cloud') {
        this.zones.push({ kind: 'cloud', team, x, y, r: m.r, until: this.t + m.last });
      } else if (key === 'quake') {
        this.zones.push({ kind: 'quake', team, x, y, r: m.r, until: this.t + 1.5 }); this.quakeAt = this.t;
        for (const b of [...this.ents.values()]) if (b.kind === 'building' && b.team !== team && !b.dead && !b.untouchable && !b.def.neutral && this.distToRect({ x, y }, b) < m.r) this.damage(b, maxHp(b) * (b.def.wall != null ? 1 : 0.4) / (this.shield[b.team] || 1), null);
        for (const u of [...this.ents.values()]) if (u.kind === 'unit' && !u.dead && Math.hypot(u.x - x, u.y - y) < m.r) u.kneelUntil = this.t + 3;
      } else if (key === 'sleep') {
        this.zones.push({ kind: 'sleep', team, x, y, r: m.r, until: this.t + m.last });
        for (const u of foesIn(m.r)) { if (thirsty(u)) continue; u.sleepUntil = this.t + m.last; this.order(u, { type: 'idle' }); }
      } else if (key === 'turn') {
        this.zones.push({ kind: 'turn', team, x, y, r: m.r, until: this.t + m.last });
        for (const u of foesIn(m.r)) { if (thirsty(u)) continue; u.turnUntil = this.t + m.last; this.turnOn(u); }
      } else if (key === 'mercy') {
        for (const u of this.units(team)) { u.hp = maxHp(u); u.poisonUntil = 0; }          // (and any poison is purged)
        this.zones.push({ kind: 'mercy', team, x: 0, y: 0, r: 0, until: this.t + 2 });
      } else if (key === 'shock') {
        const u = this.ents.get(targetId);
        if (!u || u.kind !== 'unit' || u.team === team || u.team === 'n' || u.dead || u.untouchable) return false;
        this.damage(u, 30 / (this.shield[u.team] || 1), null);
        if (!u.dead) {
          u.kneelUntil = this.t + 4;
          const t = this.temple(team), a = Math.atan2(u.y - (t ? t.y : y), u.x - (t ? t.x : x)), nx = u.x + Math.cos(a) * 64, ny = u.y + Math.sin(a) * 64;
          if (this.passable(tileOf(nx), tileOf(ny), u.team)) { u.x = nx; u.y = ny; u.path = null; }
        }
        this.zones.push({ kind: 'shock', team, x: u.x, y: u.y, r: 24, until: this.t + 1 });
      } else if (key === 'flattery') {              // one of theirs turns on his own for a while (Alma 46:5)
        const u = this.ents.get(targetId);
        if (!u || u.kind !== 'unit' || u.team === team || u.team === 'n' || u.dead || u.untouchable) return false;
        u.turnUntil = this.t + m.last; this.turnOn(u);
        this.zones.push({ kind: 'turn', team, x: u.x, y: u.y, r: 30, until: this.t + 2 });
      } else if (key === 'dissension') {            // one of their buildings stops its work (Alma 53:8)
        const b = this.ents.get(targetId);
        if (!b || b.kind !== 'building' || b.team === team || b.team === 'n' || b.dead || b.untouchable) return false;
        b.stalledUntil = this.t + m.last;
        this.zones.push({ kind: 'turn', team, x: b.x, y: b.y, r: 40, until: this.t + 2 });
      } else if (key === 'stratagem') {             // your fighters go unseen until they strike (Alma 58:6)
        for (const u of this.units(team)) if (fighter(u.def)) u.stealthUntil = this.t + m.last;
        this.zones.push({ kind: 'mercy', team, x: 0, y: 0, r: 0, until: this.t + 2 });
      } else if (key === 'poison') {                // "poison by degrees" (Alma 47:18): three quarters of his strength, little by little
        const u = this.ents.get(targetId);
        if (!u || u.kind !== 'unit' || u.team === team || u.team === 'n' || u.dead || u.untouchable) return false;
        u.poisonUntil = this.t + m.last; u.poisonDps = maxHp(u) * 0.75 / m.last;
        this.zones.push({ kind: 'poison', team, x: u.x, y: u.y, r: 24, until: this.t + 2 });
      } else if (key === 'bloodthirst') {           // "they thirst after blood" (Moroni 9:5): harder blows, and nothing turns them back
        this.zones.push({ kind: 'thirst', team, x, y, r: m.r, until: this.t + m.last });
        for (const u of this.units(team)) {
          if (!fighter(u.def) || u.dead || Math.hypot(u.x - x, u.y - y) >= m.r) continue;
          u.thirstUntil = this.t + m.last; u.fearUntil = 0; u.sleepUntil = 0;
          if (u.turnUntil > this.t) { u.turnUntil = 0; this.order(u, { type: 'idle' }); }
        }
      } else if (key === 'host') {                  // six warriors at once (Alma 48:3)
        const at = this.buildings(team).find(b => b.def.trains && b.def.trains.includes('lamanite') && b.built >= 1 && !b.dead) || this.powerHouse(team);
        for (let i = 0; i < 6; i++) { const [tx, ty] = this.freeTileNear(at.tx + i % 3, at.ty + at.h, team); this.addUnit('lamanite', team, center(tx), center(ty), at.spawn || undefined); }
        this.zones.push({ kind: 'mercy', team, x: 0, y: 0, r: 0, until: this.t + 2 });
      }
      const cap = this.side(team).captain;
      // Each idol standing, up to three, brings the Rameumptom's works back a sixth sooner (data.js: idol).
      const idols = Math.min(3, this.buildings(team).filter(b => b.def.idol && b.built >= 1 && !b.dead).length);
      this.side(team).ready[key] = this.t + m.wait * ((cap && cap.bonus.powerWait) || 1) * (1 - idols / 6);
      if (team === this.me) this.msg(m.done, m.ref, 'good');
      else { const h = (D.SIDES[this.side(team).side] || {}).house || 'Temple'; this.msg(`Their ${h === 'Temple' ? 'temple' : h}: ${m.name}!`, m.ref, 'warn'); }
      return true;
    }
    // A foe turned against his own fights the nearest of them.
    turnOn(u) {
      let best = null, bd = 170;
      for (const e of this.ents.values()) if (e !== u && e.kind === 'unit' && e.team === u.team && !e.dead && !e.untouchable) { const d = dist(u, e); if (d < bd) { bd = d; best = e; } }
      if (best) this.order(u, { type: 'attack', target: best.id });
      return !!best;
    }
    kill(e, from) {
      if (e.kind === 'unit') {
        if (e.team === this.me) {
          this.stats.fallen++;
          if (this.heroic(e)) {
            (this.heroesBack = this.heroesBack || []).push({ type: e.type, at: this.t + 40 });
            const s = this.stronghold();
            this.msg(`${e.def.name} is wounded and carried back to ${s ? s.name || s.def.name : 'the city'}. He will lead again soon.`, null, 'warn');
          }
          if (e.type === 'villager' && e.from) e.from.lost = (e.from.lost || 0) + 1;
          if (e.sword) { e.sword = false; this.msg(this.swordTo(e, e.team) ? 'The bearer of the sword of Laban has fallen: it passes to another.' : 'The bearer of the sword of Laban has fallen. It waits for the next soldier.', null, 'warn'); }
        } else {
          this.stats.defeated++;
          if (e.sword) { e.sword = false; this.swordTo(e, e.team); }
        }
        // A veteran: three foes make a soldier "exceedingly valiant for courage" (Alma 53:20); eight, a veteran twice over.
        if (from && from.kind === 'unit' && from.team !== e.team && e.team !== 'n' && fighter(from.def) && !this.heroic(from) && !from.dead) {
          from.kills = (from.kills || 0) + 1;
          const rank = from.kills >= 8 ? 2 : from.kills >= 3 ? 1 : 0;
          if (rank > (from.rank || 0)) {
            from.rank = rank; from.max = Math.round(from.def.hp * (1 + 0.15 * rank)); from.hp = Math.min(from.max, from.hp + from.def.hp * 0.15);
            if (from.team === this.me && this.t - (this.rankMsgAt || -99) > 20) { this.rankMsgAt = this.t; this.msg(`A ${from.def.name.toLowerCase()} is ${rank === 1 ? 'a veteran now, "exceedingly valiant for courage"' : 'a veteran twice over'}: he fights harder and lasts longer.`, 'Alma 53:20', 'good'); }
          }
        }
        if (this.mission && this.mission.onKill) this.mission.onKill(this, e, from);
      } else {
        if (this.mission && this.mission.onDestroy) this.mission.onDestroy(this, e, from);
      }
      this.remove(e);
    }

    // Standing still in cover, and not fighting lately: the enemy walks past (Alma 43:27).
    hidden(u) {
      if (u.kind !== 'unit') return false;
      if (u.stealthUntil > this.t && this.t - (u.struckAt || -99) >= 2) return true;      // by stratagem, unseen until they strike (Alma 58:6)
      if (u.team !== this.me || !this.cover.length || u.order.type !== 'idle' || this.t - (u.struckAt || -99) < 4) return false;
      const x = tileOf(u.x), y = tileOf(u.y);
      return this.cover.some(c => x >= c.x0 && x <= c.x1 && y >= c.y0 && y <= c.y1);
    }
    // Everything within `r` of `p` that `team` would fight.
    // (`auto`: looking for a fight on their own, which leaves alone anyone marked noAuto.)
    enemiesNear(p, team, r, unitsOnly, auto) {
      let best = null, bd = r;
      for (const e of this.ents.values()) {
        if (e.dead || e.untouchable || e.team === team || e.team === 'n' || e.team === 'x') continue;
        if (auto && e.noAuto) continue;
        if (e.team !== team && this.hidden(e) && dist(p, e) > 40) continue;
        if (unitsOnly && e.kind !== 'unit') continue;
        // (Towers and cities shoot from their walls, as they're shot at: measured from the edge, not the middle.)
        const d = e.kind === 'building' ? this.distToRect(p, e) : p.kind === 'building' ? this.distToRect(e, p) : dist(p, e);
        // Units first: a building has to be much closer to be chosen over a person.
        const dd = e.kind === 'building' ? d + 60 : d;
        if (dd < bd) { bd = dd; best = e; }
      }
      return best;
    }
    distToRect(p, b) {
      const x0 = b.tx * TILE, y0 = b.ty * TILE, x1 = (b.tx + b.w) * TILE, y1 = (b.ty + b.h) * TILE;
      const dx = Math.max(x0 - p.x, 0, p.x - x1), dy = Math.max(y0 - p.y, 0, p.y - y1);
      return Math.hypot(dx, dy);
    }
    reachOf(u, target) { return (target.kind === 'building' ? this.distToRect(u, target) : dist(u, target) - 10) <= this.rangeOf(u) + 6; }
    // How far a unit strikes: archers farther with bows of fine steel (1 Nephi 16:18).
    rangeOf(u) { const S = this.side(u.team); return u.def.range + (u.type === 'archer' && S.bows ? 40 : 0) + (u.type === 'javelin' && S.captain && S.captain.bonus.javelin ? S.captain.bonus.javelin : 0); }
    // Who can go over an enemy wall: those who brought ladders, or a side's fighters once it has made ladders (Alma 62:21).
    // A wall of the third level, with its ditch, belonging to someone other than `team`, on that square.
    ditchAt(x, y, team) {
      const id = this.inBounds(x, y) && this.occ[idx(x, y)], e = id && this.ents.get(id);
      return !!(e && e.def.wall != null && e.team !== team && !e.dead && e.built >= 1 && this.side(e.team).wallLevel >= 3);
    }
    ditchNear(u) {
      const x = tileOf(u.x), y = tileOf(u.y);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (this.ditchAt(x + dx, y + dy, u.team)) return true;
      return false;
    }
    // A guard on every fourth wall piece at the third level, who casts stones down on enemies close below (Alma 49:22).
    guarded(b) { return b.type === 'wall' && b.built >= 1 && !b.dead && this.side(b.team).wallLevel >= 3 && (b.tx + b.ty) % 4 === 0; }
    canClimb(u) { return !!u.ladders || ((u.def.soldier || u.def.foe) && !!this.side(u.team).ladders); }

    // ------------------------------------------------------------ the tick

    step(dt) {
      if (this.over) return;
      this.t += dt;
      for (const e of Array.from(this.ents.values())) {
        if (e.dead) continue;
        if (e.kind === 'unit') this.stepUnit(e, dt); else this.stepBuilding(e, dt);
      }
      this.separate(dt);
      for (const team in this.sides) {
        const S = this.sides[team];
        if (!S.researching) continue;
        const b = this.ents.get(S.researching.by);
        if (!b || b.dead) { S.researching = null; continue; }
        if (b.stalledUntil > this.t) continue;                                     // dissension: no work for a while
        let rSpeed = (S.artifacts.plates ? 2 : 1);
        if (team === this.me && this.hasPerk('brass_plates')) rSpeed *= 1.25;
        if ((S.researching.left -= dt * rSpeed) <= 0) {   // twice as fast with the brass plates, 1.25x with brass_plates perk
          const key = S.researching.key, r = RESEARCH[key];
          S.researched[key] = true; S.researching = null;
          S.armor += r.armor || 0;
          S.dmgUp += r.dmg || 0;
          if (r.bows) S.bows = true;
          if (r.clothing) S.clothing = true;
          if (r.ladders) S.ladders = true;
          if (r.level) S.wallLevel = Math.max(S.wallLevel, r.level);
          if (r.walls) {
            S.wallMul = r.walls;
            for (const w of this.buildings(team)) if (w.def.wall) { const f = w.hp / maxHp(w); w.max = w.def.hp * r.walls; w.hp = f * w.max; }
          }
          if (r.strongholdTier) {
            const sh = this.stronghold(team);
            if (sh) {
              sh.tier = r.strongholdTier;
              sh.name = r.strongholdTier === 2 ? 'Civic Council Platform' : 'Zarahemla Acropolis';
              sh.max = r.strongholdTier === 2 ? 2400 : 3500;
              sh.hp = Math.min(sh.max, sh.hp + (r.strongholdTier === 2 ? 600 : 1100));
            }
          }
          if (team === this.me) this.msg(r.done, r.ref, 'good');
          else this.msg(`${this.peopleOf(team)} have made ${r.name.toLowerCase()}.`, r.ref, 'warn');
        }
      }
      for (const h of (this.heroesBack || []).filter(h => this.t >= h.at)) {
        this.heroesBack.splice(this.heroesBack.indexOf(h), 1);
        const s = this.stronghold();
        if (s) { const [x, y] = this.freeTileNear(s.tx + 1, s.ty + s.h, this.me); this.addUnit(h.type, this.me, center(x), center(y)); this.msg(UNITS[h.type].name + ' leads the armies again.', null, 'good'); }
      }
      this.effects = this.effects.filter(f => this.t - f.t < (f.kind === 'stone' ? 0.6 : 0.35));   // (a stone cast down takes a little longer to land)
      this.zones = this.zones.filter(z => this.t < z.until);
      this.yieldPops = (this.yieldPops || []).filter(p => this.t - p.t < 1.6);
      // A Jaredite ruin: someone of yours beside it finds what it holds (Mosiah 8:9-11).
      for (const b of this.buildings('n')) if (b.def.relic && !b.dead && b.artifact) for (const team in this.sides) if (this.units(team).some(u => (team === this.me || !u.def.foe) && this.nextTo(u, this.rectOf(b)))) { const key = b.artifact; this.remove(b); this.grant(key, 'ruin', team, b); break; }   // (an army marching past takes nothing; that's for 5c)
      if (this.t - (this.swordCheckAt || -99) > 2) { this.swordCheckAt = this.t; for (const team in this.sides) if (this.sides[team].artifacts.sword && !this.units(team).some(u => u.sword)) this.swordTo(null, team); }
      // A temple: that side's people near it are made whole, a little at a time.
      for (const b of this.buildings(null, 'temple')) if (b.built >= 1 && !b.dead) for (const u of this.units(b.team)) if (u.hp < maxHp(u) && dist(u, b) < b.def.heals) u.hp = Math.min(maxHp(u), u.hp + maxHp(u) * 0.012 * dt);
      if (this.mission) this.mission.update(this, dt);
    }

    // Building goes on by itself once a thing is placed, like Red Alert; a worker beside it adds as much again.
    progress(b, step) {
      b.built = Math.min(1, b.built + step);
      b.hp = Math.min(maxHp(b), b.hp + maxHp(b) * step * 0.9);
      if (b.built >= 1) {
        if (b.team === this.me) this.msg(b.def.name + ' is finished.', null, 'good');
        if (b.def.brings && this.tech) {             // a store comes with a hauler, as a refinery comes with a harvester
          const [x, y] = this.freeTileNear(b.tx + Math.floor(b.w / 2), b.ty + b.h, b.team);
          this.addUnit(b.def.brings, b.team, center(x), center(y));
          if (b.team === this.me) this.msg(`A ${UNITS[b.def.brings].name.toLowerCase()} comes with the ${b.def.name.toLowerCase()}.`, null, 'good');
        }
        if (this.mission && this.mission.onBuilt) this.mission.onBuilt(this, b);
      }
    }
    // Several of the same building make things faster, up to two and a half times; the stables are quick on their own.
    trainSpeed(b) {
      const same = this.buildings(b.team, b.type).filter(x => x.built >= 1).length;
      return Math.min(2.5, 1 + 0.5 * (same - 1)) * (b.def.fast || 1);
    }
    stepBuilding(b, dt) {
      if (b.built < 1) {                     // rising: it does nothing else yet
        if (b.def.work) this.progress(b, dt / b.def.work);
        return;
      }
      if (b.def.grows) this.gain('grain', b.def.grows * dt, b.team);   // "they did raise grain in abundance" (Helaman 6:12)
      if (b.def.mills) this.gain('timber', b.def.mills * dt, b.team);   // "timber to build their houses" (Helaman 3:9)
      if (b.def.quarries) this.gain('stone', b.def.quarries * dt, b.team);
      if (b.def.bakes) this.gain('stone', b.def.bakes * dt, b.team);    // cement and brickworks (Helaman 3:7)
      if (b.queue.length && !(b.stalledUntil > this.t)) {
        const q = b.queue[0];
        if ((q.left -= dt * this.trainSpeed(b)) <= 0) {
          b.queue.shift();
          const [x, y] = this.freeTileNear(b.tx + Math.floor(b.w / 2), b.ty + b.h, b.team);
          const u = this.addUnit(q.type, b.team, center(x), center(y), b.spawn || undefined);   // (b.spawn: what its trainees start with, e.g. a camp's mode and home)
          // A training ground standing: a soldier comes out a veteran, "taught" like the striplings (Alma 53:21).
          if (fighter(u.def) && !this.heroic(u)) {
            const own = this.buildings(b.team).filter(t => t.built >= 1 && !t.dead), cap = this.side(b.team).captain;
            if (own.some(t => t.def.veterans)) {
              const r = (cap && cap.bonus.ranks) || 1;
              u.rank = Math.max(u.rank || 0, r);
              u.kills = u.rank >= 2 ? 8 : 3;
              const base = (u.type === 'stripling' && b.team === this.me && this.hasPerk('stripling_covenant')) ? u.def.hp * 1.2 : u.def.hp;
              u.max = Math.round(base * (1 + 0.15 * u.rank));
              u.hp = u.max;
            }
            if (own.some(t => t.def.fierce)) u.fierceUntil = this.t + 45;      // from the war-dance: faster and harder for a while
          }
          if (b.team === this.me) this.trained[q.type] = (this.trained[q.type] || 0) + 1;
          if (b.autoCohort) u.cohort = b.autoCohort;
          else if (u.type === 'cart' || u.type === 'curelom' || u.type === 'cumom' || (u.def && u.def.siege)) {
            u.cohort = 3;
          } else if (fighter(u.def)) {
            u.cohort = u.def.ranged ? 2 : 1;
          }
          if (b.rally) {
            const rx = Array.isArray(b.rally) ? b.rally[0] : (b.rally.tx != null ? b.rally.tx : tileOf(b.rally.x));
            const ry = Array.isArray(b.rally) ? b.rally[1] : (b.rally.ty != null ? b.rally.ty : tileOf(b.rally.y));
            this.moveTo(u, rx, ry);
          }
        }
      }
      if (this.guarded(b)) {                        // the wall's guard: a heavy stone on whoever is close below
        b.cool = (b.cool || 0) - dt;
        if (b.cool <= 0) {
          const e = this.enemiesNear(b, b.team, 56, true);
          if (e) {
            this.effects.push({ t: this.t, x0: b.x, y0: b.y, x1: e.x, y1: e.y, kind: 'stone', team: b.team });
            this.damage(e, 22, b);
            for (const o of [...this.ents.values()]) if (o !== e && o.kind === 'unit' && o.team === e.team && !o.dead && dist(o, e) < 24) this.damage(o, 9, b);   // and it rolls
            b.cool = 3;
          } else b.cool = 0.4;
        }
      }
      if (b.def.dmg) {                              // a watchtower
        b.cool -= dt;
        if (b.cool <= 0) {
          const e = this.enemiesNear(b, b.team, b.def.range);
          if (e && e.kind === 'unit') { this.shoot(b, e, b.def.dmg); b.cool = b.def.cd; }
          else b.cool = 0.3;
        }
      }
    }
    shoot(from, target, dmg) {
      const kind = from.type === 'javelin' ? 'javelin' : (from.type === 'slinger' || from.type === 'nslinger') ? 'stone' : 'arrow';
      this.effects.push({ t: this.t, x0: from.x, y0: from.y, x1: target.x, y1: target.y, kind, team: from.team });
      this.damage(target, dmg, from);
    }

    stepUnit(u, dt) {
      u.cool -= dt;
      if (u.slowUntil && this.t > u.slowUntil) { u.slow = 1; u.slowUntil = 0; }
      if (u.type === 'cart' && u.hitAt && this.t - u.hitAt < 4 && u.cool <= 0) {
        const load = (u.carry && u.carry.type) || u.pref || 'grain';
        if (load === 'stone') {
          const foe = this.enemiesNear(u, u.team, 110, true);
          if (foe) {
            u.face = Math.atan2(foe.y - u.y, foe.x - u.x);
            this.effects.push({ t: this.t, x0: u.x, y0: u.y, x1: foe.x, y1: foe.y, kind: 'stone', team: u.team });
            this.damage(foe, 6, u);
            u.cool = 1.2;
          }
        } else if (load === 'timber') {
          const foe = this.enemiesNear(u, u.team, 35, true);
          if (foe) {
            u.face = Math.atan2(foe.y - u.y, foe.x - u.x);
            this.effects.push({ t: this.t, x0: u.x, y0: u.y, x1: foe.x, y1: foe.y, kind: 'hit', stake: true, team: u.team });
            this.damage(foe, 8, u);
            u.cool = 1.4;
            foe.slow = 0.5;
            foe.slowUntil = this.t + 1.8;
          }
        }
      }
      if (u.poisonUntil > this.t && !this.truce) {         // poison by degrees (Alma 47:18): no armor stops it
        const a = u.spare ? Math.min(u.poisonDps * dt, Math.max(0, u.hp - 1)) : u.poisonDps * dt;
        u.hp -= a; u.hitAt = this.t;
        if (u.hp <= 0) { this.kill(u, null); return; }
      }
      if (u.kneelUntil && this.t < u.kneelUntil) return;   // "fallen to the earth" in prayer (3 Nephi 4:8)
      if (u.sleepUntil && this.t < u.sleepUntil) return;   // in a deep sleep (Alma 55:16)
      u.think -= dt;
      if (u.think <= 0) {
        u.think = 0.4;
        const mine = u.team === this.me || !fighter(u.def);           // the human's, or a hauler or builder of any side
        if (!mine && this.mission && this.mission.foeBrain) {
          if (u.turnUntil > this.t) { if (u.order.type === 'idle') this.turnOn(u); }          // turned on his own (Judges 7:22)
          else if (!(u.fearUntil > this.t)) this.mission.foeBrain(this, u);                    // (fleeing the fire, he keeps running)
        }
        // (An army lying hidden holds still until it's ordered, or found.)
        else if (mine && u.order.type === 'idle' && u.def.dmg && !u.def.gathers && !u.def.builds && (!this.hidden(u) || this.t - (u.hitAt || -99) < 2)) this.autoAcquire(u, u.def.sight);
        else if (mine && u.order.type === 'move' && (u.order.attackMove || u.order.rule === 'hunt')) this.autoAcquire(u, u.def.sight, true);
        else if (mine && u.order.type === 'idle' && (u.def.gathers || u.def.builds) && u.hitAt && this.t - u.hitAt < 1.5) this.autoAcquire(u, 60);
        // A cart with nothing to do goes and hauls, like a harvester in Red Alert.
        else if (mine && u.order.type === 'idle' && u.def.gathers && u.def.load) this.autoHaul(u);
        if (mine && u.order.type === 'move' && u.order.healthThreshold && (u.hp / (u.max || u.def.hp)) * 100 < u.order.healthThreshold) {
          this.order(u, { type: 'idle' });
          this.autoAcquire(u, u.def.sight);
          if (u.team === this.me && this.t - (u.breakMsgAt || -99) > 10) {
            u.breakMsgAt = this.t;
            this.msg('Cohort breaks march: taking defensive stand!', null, 'warn');
          }
        }
      }
      const o = u.order;
      switch (o.type) {
        case 'move': case 'caravan': case 'retreat': case 'flee': case 'prisoner': case 'hunt': {
          if (!u.path) {
            const g = o.goal || { x0: o.tx, y0: o.ty, x1: o.tx, y1: o.ty };
            u.path = this.findPath(u, g, !!o.near);
          }
          if (this.follow(u, dt)) this.arrive(u);
          else if (this.blockedBy && (u.def.foe || u.def.soldier)) { const w = this.blockedBy; this.blockedBy = null; this.order(u, { type: 'attack', target: w.id, then: o }); }
          break;
        }
        case 'attack': {
          const t = this.ents.get(o.target);
          if (!t || t.dead || t.untouchable) { this.afterFight(u); break; }
          if (o.until && this.t > o.until) { u.strikeCool = this.t + 10; this.afterFight(u, true); break; }   // (a strike-back given up: back to his errand)
          if (this.reachOf(u, t)) {
            u.path = null;
            u.face = Math.atan2(t.y - u.y, t.x - u.x);
            if (u.cool <= 0 && !this.inZone(u, 'cloud', null, u.team)) {        // in the cloud of darkness they can't see to strike
              if (u.def.ranged) this.shoot(u, t, u.def.dmg); else { this.damage(t, u.def.dmg, u); this.effects.push({ t: this.t, x0: u.x, y0: u.y, x1: t.x, y1: t.y, kind: 'hit', team: u.team }); }
              u.cool = u.def.cd; u.struckAt = this.t;
              if (o.until) o.until = this.t + 8;                              // (landing blows: the strike-back goes on)
            }
          } else {
            u.repath = (u.repath || 0) - dt;
            if (!u.path || !u.path.length || u.repath <= 0) {
              u.path = this.findPath(u, this.rectOf(t), true);
              u.repath = 0.8;
            }
            // Walking into a wall on the way: break it (foes).
            if (this.follow(u, dt) || !u.path) {
              // Beside it but not yet in reach (a corner, say): step in.
              const px = t.kind === 'building' ? Math.max(t.tx * TILE, Math.min(u.x, (t.tx + t.w) * TILE)) : t.x;
              const py = t.kind === 'building' ? Math.max(t.ty * TILE, Math.min(u.y, (t.ty + t.h) * TILE)) : t.y;
              this.approach(u, px, py, dt);
            }
            if (this.blockedBy && (u.def.foe || u.def.soldier)) { const w = this.blockedBy; this.blockedBy = null; if (w.team !== u.team && w.id !== t.id) this.order(u, { type: 'attack', target: w.id, then: o }); }
            // A soldier who went after someone gives up a long chase.
            else if (o.leash && dist(u, o.leash) > 220) this.afterFight(u, true);
          }
          break;
        }
        case 'gather': this.stepGather(u, dt); break;
        case 'build': this.stepBuild(u, dt); break;
        case 'idle': default: break;
      }
    }
    afterFight(u, gaveUp) {
      const then = u.order.then, leash = u.order.leash;
      if (then) { this.order(u, then); return; }
      this.order(u, { type: 'idle' });
      if (u.team !== this.me && fighter(u.def)) return;
      if (!gaveUp && this.autoAcquire(u, u.def.sight, false, leash)) return;
      // Back to where they were standing guard.
      if (leash && dist(u, leash) > TILE * 1.5) this.order(u, { type: 'move', tx: tileOf(leash.x), ty: tileOf(leash.y) });
    }
    // Fight the nearest enemy in sight. The leash is where they were posted: they won't be drawn far from it.
    autoAcquire(u, r, keepMove, leash) {
      const e = this.enemiesNear(u, u.team, r, false, true);
      if (!e || (leash && dist(e, leash) > 220)) return false;
      const back = keepMove ? u.order : (u.order.type === 'idle' ? null : u.order);
      this.order(u, { type: 'attack', target: e.id, then: back, leash: leash || { x: u.x, y: u.y } });
      return true;
    }
    // Walks along the path; true when there.
    follow(u, dt) {
      this.blockedBy = null;
      if (!u.path) return false;
      if (!u.path.length) { u.path = null; return true; }
      const [tx, ty] = u.path[0];
      u.climbing = false;
      if (!this.passable(tx, ty, u.team)) {
        const b = this.occ[idx(tx, ty)] && this.ents.get(this.occ[idx(tx, ty)]);
        if (b && b.def.wall && b.team !== u.team && this.canClimb(u)) u.climbing = true;                  // over it, slowly
        else if (b && b.def.wall && b.team !== u.team && (u.def.foe || u.def.soldier)) { this.blockedBy = b; return false; }   // break it first
        else { u.path = null; return false; }     // something new in the way: plan again
      }
      const cx = center(tx), cy = center(ty);
      const dx = cx - u.x, dy = cy - u.y, d = Math.hypot(dx, dy);
      let sp = u.def.speed * (u.slow || 1) * (this.tile(tileOf(u.x), tileOf(u.y)) === T.FORD ? 0.7 : 1);
      if (u.climbing) sp *= this.ditchAt(tx, ty, u.team) ? 0.25 : 0.4;
      else if (this.ditchNear(u)) sp *= 0.6;                 // down into the ditch and up again (Alma 49:18)
      if (u.fierceUntil > this.t) sp *= 1.15;
      if (u.burstUntil > this.t) sp *= 1.4;
      if (u.carry && u.carry.amt) sp *= 0.9;
      if (u.type === 'cart' && u.team === this.me && this.hasPerk('nephite_chariots')) sp *= 1.2;

      // Formation speed synchronization: troops in the same cohort match the slowest unit's speed
      if (u.cohort && this.cohorts && this.cohorts[u.cohort] && this.cohorts[u.cohort].speedLock && !u.charging) {
        const cohortMoving = this.cohortUnits(u.team, u.cohort).filter(v => !v.dead && v.order && v.order.type === 'move');
        if (cohortMoving.length > 1) {
          let minSp = sp;
          for (const m of cohortMoving) {
            let msp = m.def.speed * (m.slow || 1);
            if (m.carry && m.carry.amt) msp *= 0.9;
            if (msp < minSp) minSp = msp;
          }
          sp = Math.min(sp, minSp);
        }
      }

      const s = sp * dt;
      // Close is close enough: units crowding one tile push each other off its exact middle.
      const reach = u.path.length === 1 ? 12 : 9;
      if (d <= Math.max(s, reach)) { u.path.shift(); if (!u.path.length) { u.path = null; return true; } }
      else { u.x += dx / d * s; u.y += dy / d * s; u.face = Math.atan2(dy, dx); }
      return false;
    }
    arrive(u) {
      const o = u.order;
      if (this.mission && this.mission.onArrive && this.mission.onArrive(this, u)) return;
      if (o.type === 'move') {
        if (o.waypoints && o.waypoints.length > 0) {
          const wp = o.waypoints.shift();
          const wx = wp.x != null ? wp.x : wp[0];
          const wy = wp.y != null ? wp.y : wp[1];
          o.tx = wx;
          o.ty = wy;
          u.path = null;
          return;
        }
        this.order(u, { type: 'idle' });
      }
    }

    // Units don't stand on each other.
    separate(dt) {
      const list = this.units();
      const cell = 48, grid = new Map();
      for (const u of list) { const k = ((u.x / cell) | 0) + ',' + ((u.y / cell) | 0); if (!grid.has(k)) grid.set(k, []); grid.get(k).push(u); }
      for (const u of list) {
        const cx = (u.x / cell) | 0, cy = (u.y / cell) | 0;
        for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
          const g = grid.get((cx + ox) + ',' + (cy + oy));
          if (!g) continue;
          for (const v of g) {
            if (v.id <= u.id) continue;
            const dx = v.x - u.x, dy = v.y - u.y, d = Math.hypot(dx, dy) || 0.01;
            if (d < 15) {
              const push = (15 - d) / 2 * Math.min(1, dt * 12);
              let px = dx / d * push, py = dy / d * push;
              // Two walking into each other step aside, rather than pushing head on for ever.
              if (u.path || v.path) { const qx = px - py, qy = py + px; px = qx * 0.7; py = qy * 0.7; }
              this.nudge(u, -px, -py); this.nudge(v, px, py);
            }
          }
        }
      }
    }
    nudge(u, dx, dy) {
      const nx = u.x + dx, ny = u.y + dy;
      if (this.passable(tileOf(nx), tileOf(ny), u.team) || !this.passable(tileOf(u.x), tileOf(u.y), u.team)) { u.x = nx; u.y = ny; }
    }

    // --- gathering: out to the field or the trees, back to the storehouse
    stepGather(u, dt) {
      const o = u.order;
      if (!u.phase) u.phase = 'go';
      // Next to it, diagonals included, is close enough to work.
      const near = () => this.nextTo(u, { x0: o.tx, y0: o.ty, x1: o.tx, y1: o.ty });
      if (u.phase === 'go') {
        if (!this.isResource(o.tx, o.ty, o.res)) {
          const next = this.nearestResource(o.tx, o.ty, o.res, u);
          if (!next) { this.order(u, { type: 'idle' }); return; }
          o.tx = next[0]; o.ty = next[1]; u.path = null;
        }
        if (near()) { u.phase = 'work'; u.path = null; u.work = 0; u.tries = 0; return; }
        if (!u.path) u.path = this.findPath(u, { x0: o.tx, y0: o.ty, x1: o.tx, y1: o.ty }, true);
        if (this.follow(u, dt) && !near()) {
          // Couldn't get next to that one: try another.
          u.tries = (u.tries || 0) + 1;
          const next = u.tries < 5 && this.nearestResource(o.tx, o.ty, o.res, u, o.tx + ',' + o.ty);
          if (!next) { this.order(u, { type: 'idle' }); return; }
          o.tx = next[0]; o.ty = next[1]; u.path = null;
        }
      } else if (u.phase === 'work') {
        const i = idx(o.tx, o.ty);
        if (!near()) { u.phase = 'go'; u.path = null; return; }                       // pushed away: walk back first
        if (this.amt[i] <= 0) { u.phase = u.carry && u.carry.amt ? 'back' : 'go'; return; }
        const t = this.tiles[i], kind = t === T.FOREST ? 'timber' : t === T.ROCK ? 'stone' : 'grain';
        if (u.carry && u.carry.amt && u.carry.type !== kind) { u.phase = 'back'; u.path = null; return; }   // bring home what it holds first
        u.workingRes = kind;
        u.workingAt = { tx: o.tx, ty: o.ty };
        u.work += dt;
        const each = (kind === 'grain' ? 0.6 : kind === 'timber' ? 0.45 : 0.75) / (u.def.quick || 1);   // seconds a unit takes
        if (u.work >= each) {
          u.work -= each;
          if (!u.carry || u.carry.type !== kind) u.carry = { type: kind, amt: 0 };
          u.carry.amt += 1; this.amt[i] -= 1;
          if (this.amt[i] <= 0) { if (t === T.ROCK) this.terrainDirty = true; else this.setTile(o.tx, o.ty, T.GRASS); }   // a worked-out face stays rock
          if (u.carry.amt >= (u.def.load || 10)) { u.phase = 'back'; u.path = null; u.workingRes = null; }
        }
      } else if (u.phase === 'back') {
        u.workingRes = null;
        const drop = this.nearestDropoff(u);
        if (!drop) { this.order(u, { type: 'idle' }); return; }
        if (this.nextTo(u, this.rectOf(drop))) {
          if (u.type === 'cart') {
            u.phase = 'dock';
            u.dockT = 0;
            u.dockDrop = drop.id;
            u.path = null;
            const targetX = drop.kind === 'building' ? (drop.tx + drop.w / 2) * TILE : drop.x;
            const targetY = drop.kind === 'building' ? (drop.ty + drop.h / 2) * TILE : drop.y;
            u.face = Math.atan2(targetY - u.y, targetX - u.x);
            return;
          }
          if (u.carry) {
            this.gain(u.carry.type, u.carry.amt, u.team);
            u.dumpAt = this.t;
            u.dumpType = u.carry.type;
            u.dumpTo = drop.id;
            if (drop.type === 'cart') drop.settleAt = this.t;
            u.carry = null;
          }
          // A cart hauling on its own chooses afresh each trip, so it never keeps filling a full store while the other runs short.
          if (!u.pref && u.def.load) { this.order(u, { type: 'idle' }); return; }
          u.phase = 'go'; u.path = null; u.tries = 0; return;
        }
        if (!u.path) u.path = this.findPath(u, this.rectOf(drop), true);
        if (this.follow(u, dt) && !this.nextTo(u, this.rectOf(drop))) {
          u.tries = (u.tries || 0) + 1;              // walled off from it
          if (u.tries > 4) this.order(u, { type: 'idle' });
        }
      } else if (u.phase === 'dock') {
        const drop = this.ents.get(u.dockDrop) || this.nearestDropoff(u);
        u.dockT = (u.dockT || 0) + dt;
        if (u.dockT >= 0.8 || !drop) {
          if (u.carry && u.carry.amt) {
            const amt = u.carry.amt, type = u.carry.type;
            this.gain(type, amt, u.team);
            u.dumpAt = this.t;
            u.dumpType = type;
            u.dumpAmt = amt;
            u.dumpTo = drop ? drop.id : null;
            if (drop) {
              if (drop.type === 'cart') drop.settleAt = this.t;
              if (!this.yieldPops) this.yieldPops = [];
              const dx = drop.kind === 'building' ? (drop.tx + drop.w / 2) * TILE : drop.x;
              const dy = drop.kind === 'building' ? drop.ty * TILE - 8 : drop.y - 12;
              this.yieldPops.push({ x: dx, y: dy, text: `+${amt} ${type[0].toUpperCase() + type.slice(1)}`, type, t: this.t });
            }
            u.carry = null;
          }
          u.dockT = 0;
          if (!u.pref && u.def.load) { this.order(u, { type: 'idle' }); return; }
          u.phase = 'go'; u.path = null; u.tries = 0; return;
        }
      }
    }
    isResource(x, y, kind) {
      const t = this.tile(x, y);
      return (kind === 'timber' ? t === T.FOREST : kind === 'stone' ? t === T.ROCK : t === T.FIELD) && this.amt[idx(x, y)] > 0;
    }
    // The nearest tree or field someone can stand next to, preferring ones fewer workers are on.
    nearestResource(tx, ty, kind, who, skip) {
      const crowd = new Map();
      for (const w of this.ents.values()) if (w.kind === 'unit' && w !== who && w.order.type === 'gather') { const k = w.order.tx + ',' + w.order.ty; crowd.set(k, (crowd.get(k) || 0) + 1); }
      let best = null, bd = Infinity;
      const team = who ? who.team : this.me, y0 = team === this.me ? (this.border || 0) : 0;
      for (let y = Math.max(y0, ty - 14); y <= Math.min(MAP_H - 1, ty + 14); y++) for (let x = Math.max(0, tx - 14); x <= Math.min(MAP_W - 1, tx + 14); x++) {
        if (!this.isResource(x, y, kind) || (skip && skip === x + ',' + y)) continue;
        let open = this.passable(x, y, team);
        for (let dy = -1; dy <= 1 && !open; dy++) for (let dx = -1; dx <= 1 && !open; dx++) if ((dx || dy) && this.passable(x + dx, y + dy, team)) open = true;
        if (!open) continue;
        const d = Math.hypot(x - tx, y - ty) + 2.5 * (crowd.get(x + ',' + y) || 0);
        if (d < bd) { bd = d; best = [x, y]; }
      }
      return best;
    }
    // Where haulers unload. In a story mission the city takes it too; in a skirmish only a store does (Red Alert's refinery).
    takesHarvest(b) { const d = b.def.dropoff; return d === true || (d === 'story' && !this.tech); }
    nearestDropoff(u) {
      let best = null, bd = Infinity;
      for (const b of this.buildings(u.team)) if (this.takesHarvest(b) && b.built >= 1) { const d = this.distToRect(u, b); if (d < bd) { bd = d; best = b; } }
      return best;
    }
    gatherAt(u, tx, ty) {
      const t = this.tile(tx, ty);
      if (!u.def.gathers || (t !== T.FOREST && t !== T.FIELD && t !== T.ROCK)) return false;
      this.order(u, { type: 'gather', tx, ty, res: t === T.FOREST ? 'timber' : t === T.ROCK ? 'stone' : 'grain' });
      return true;
    }
    // An idle cart picks what it hauls: what it was last sent for, or else whichever of grain and timber is shorter;
    // and the nearest of it. Stone only comes when a cart was sent for it.
    autoHaul(u) {
      if (!this.nearestDropoff(u)) {                 // nowhere to bring it: wait, and say so now and then
        const S = D.SIDES && D.SIDES[this.side(u.team).side];
        if (u.team === this.me && S && this.t - (this.noStoreAt || -99) > 90) {   // (now and then, not every forty seconds: Blake's review)
          this.noStoreAt = this.t; this.msg(`Your ${UNITS[u.type].name.toLowerCase()}s have nowhere to bring the harvest: build a ${BUILDINGS[S.store].name.toLowerCase()}.`, null, 'warn'); }
        return false;
      }
      const R = this.side(u.team).res, low = R.grain <= R.timber ? 'grain' : 'timber', other = low === 'grain' ? 'timber' : 'grain';
      const kinds = u.pref ? [u.pref, ...[low, other].filter(k => k !== u.pref)] : [low, other];
      const tx = tileOf(u.x), ty = tileOf(u.y);
      for (const k of kinds) { const f = this.nearestResource(tx, ty, k, u); if (f) return this.gatherAt(u, f[0], f[1]); }
      return false;
    }

    // --- building and mending: stand next to it and work
    needsWork(b) { return !b.dead && (b.built < 1 || b.hp < maxHp(b)) && !!b.def.work; }
    // Mending costs timber: making it whole again costs half what it took to build (10 at least).
    mendCost(b) { return Math.max(10, ((b.def.cost && b.def.cost.timber) || 0) * 0.5) / maxHp(b); }
    stepBuild(u, dt) {
      const b = this.ents.get(u.order.target);
      if (!b || b.team !== u.team || !this.needsWork(b)) { this.order(u, u.order.resume || { type: 'idle' }); return; }
      if (this.nextTo(u, this.rectOf(b))) {
        u.path = null;
        const step = dt / b.def.work;
        if (b.built >= 1) {                           // mending what's broken: slower than building, and it uses timber
          const cement = this.buildings(u.team).some(x => x.def.cement && x.built >= 1 && !x.dead);
          const res = this.side(u.team).res, per = this.mendCost(b), hp = Math.min(maxHp(b) - b.hp, maxHp(b) * step * (cement ? 0.4 : 0.25), res.timber / per);
          if (hp <= 0) {
            if (u.team === this.me && this.t - (this.noTimberAt || -99) > 20) { this.noTimberAt = this.t; this.msg('No timber left to mend with: send workers to the trees.', null, 'warn'); }
            this.order(u, u.order.resume || { type: 'idle' });
            return;
          }
          b.hp += hp; res.timber -= hp * per;
        } else this.progress(b, step);
        if (!this.needsWork(b)) {
          // A wall-builder moves on to the next unfinished or broken wall nearby.
          const next = this.buildings(u.team).filter(x => x !== b && this.needsWork(x) && dist(x, u) < 200).sort((a, c) => dist(a, u) - dist(c, u))[0];
          this.order(u, next ? { type: 'build', target: next.id, resume: u.order.resume } : u.order.resume || { type: 'idle' });
        }
        return;
      }
      if (!u.path) u.path = this.findPath(u, this.rectOf(b), true);
      if (this.follow(u, dt) && !this.nextTo(u, this.rectOf(b))) this.order(u, u.order.resume || { type: 'idle' });
    }
  }

  const SIM = { World, TILE, center, tileOf, dist, maxHp, kindOf, REACH, KINDS, canFight };
  if (typeof module !== 'undefined' && module.exports) module.exports = SIM;
  else root.LIB_SIM = SIM;
})(this);
