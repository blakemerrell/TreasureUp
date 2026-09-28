// Title of Liberty: the simulation. Everything that happens in a mission,
// with no drawing and no input, so it runs the same in the browser and in
// the tests (node tools/test-liberty.mjs).
(function (root) {
  'use strict';
  const D = root.LIB_DATA || require('./data.js');
  const { TILE, MAP_W, MAP_H, T, UNITS, BUILDINGS, RESEARCH } = D;
  const idx = (x, y) => y * MAP_W + x;
  const center = t => t * TILE + TILE / 2;
  const tileOf = p => Math.floor(p / TILE);
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  // ------------------------------------------------------------------ world

  class World {
    constructor(seed) {
      this.rand = D.rng(seed == null ? 7 : seed);  // the same game plays out the same way
      const m = D.buildMap();
      this.tiles = m.tiles;
      this.amt = m.amt;
      this.occ = new Int32Array(MAP_W * MAP_H);   // building id on each tile
      this.ents = new Map();
      this.nextId = 1;
      this.t = 0;
      this.res = { grain: 0, timber: 0 };
      this.prov = null;                            // the robbers' food, when it matters
      this.borderOpen = false;
      this.buffUntil = 0;                          // "in the strength of the Lord" (3 Nephi 4:10)
      this.armor = 0;                              // Weapons, armor and shields (3 Nephi 3:26)
      this.researching = null;
      this.msgs = [];
      this.stats = { prisoners: 0, escaped: 0, fallen: 0, defeated: 0, gathered: 0 };
      this.over = null;                            // { won, text, stars }
      this.terrainDirty = true;
      this.effects = [];                           // arrows and the like, for drawing
      this.lastBorderMsg = -99;
    }

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
        if (e.def.gate && team === 'p') return true;
        if (!(throughWalls && e.def.wall)) return false;
      }
      // Gidgiddoni: "we will not go against them, but we will wait till they shall come against us" (3 Nephi 3:21).
      if (team === 'p' && y < D.BORDER_Y && !this.borderOpen) return false;
      return true;
    }

    msg(text, ref, kind) { this.msgs.push({ t: this.t, text, ref: ref || null, kind: kind || 'story' }); }

    // --- entities
    addUnit(type, team, x, y, extra) {
      const def = UNITS[type];
      const u = Object.assign({ id: this.nextId++, kind: 'unit', type, def, team, x, y, hp: def.hp, cool: 0, order: { type: 'idle' }, path: null, carry: null, face: 0, think: this.rand() * 0.4 }, extra || {});
      this.ents.set(u.id, u);
      return u;
    }
    addBuilding(type, team, tx, ty, built, extra) {
      const def = BUILDINGS[type];
      const b = Object.assign({ id: this.nextId++, kind: 'building', type, def, team, tx, ty, w: def.w, h: def.h,
        x: (tx + def.w / 2) * TILE, y: (ty + def.h / 2) * TILE, hp: built ? def.hp : Math.max(1, def.hp * 0.1), built: built ? 1 : 0, queue: [], cool: 0 }, extra || {});
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
    stronghold() { return this.buildings('p', 'stronghold')[0] || null; }
    soldiers() { return this.units('p').filter(u => u.def.soldier); }

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
          const [fx, fy] = this.freeTileNear(tx, ty, u.team === 'p' ? 'p' : u.team);
          u.x = center(fx); u.y = center(fy); u.path = null;
        }
      }
    }

    // --- paths: A* on tiles, eight ways, no cutting corners.
    // `goal` is a rectangle; `near` means ending next to it is enough.
    findPath(u, goal, near) {
      const team = u.team, walls = !!u.def.robber;
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
      const s = Math.min(d, u.def.speed * (u.slow || 1) * dt);
      const nx = u.x + dx / d * s, ny = u.y + dy / d * s;
      if (this.passable(tileOf(nx), tileOf(ny), u.team === 'p' ? 'p' : u.team)) { u.x = nx; u.y = ny; u.face = Math.atan2(dy, dx); }
    }

    // --- orders (what a player's click, or the robbers' plans, ask for)
    order(u, o) {
      u.order = o; u.path = null; u.repath = 0;
      if (o.type !== 'gather' && o.type !== 'build') u.phase = null;
    }
    moveTo(u, tx, ty, attackMove) {
      if (u.team === 'p' && ty < D.BORDER_Y && !this.borderOpen) {
        if (this.t - this.lastBorderMsg > 8) {
          this.lastBorderMsg = this.t;
          this.msg('Gidgiddoni: “we will not go against them, but we will wait till they shall come against us.”', '3 Nephi 3:21', 'rule');
        }
        ty = D.BORDER_Y;
      }
      this.order(u, { type: 'move', tx, ty, attackMove: !!attackMove });
    }

    // --- building and training
    canAfford(cost) { return !cost || ((cost.grain || 0) <= this.res.grain && (cost.timber || 0) <= this.res.timber); }
    pay(cost) { if (!cost) return; this.res.grain -= cost.grain || 0; this.res.timber -= cost.timber || 0; }
    refund(cost) { if (!cost) return; this.res.grain += cost.grain || 0; this.res.timber += cost.timber || 0; }
    canPlace(type, tx, ty) {
      const def = BUILDINGS[type];
      for (let y = ty; y < ty + def.h; y++) for (let x = tx; x < tx + def.w; x++) {
        if (!this.inBounds(x, y)) return false;
        const t = this.tile(x, y);
        if (t !== T.GRASS && t !== T.FIELD && t !== T.RUIN) return false;
        if (this.occ[idx(x, y)]) return false;
        if (y < D.BORDER_Y) return false;
      }
      return true;
    }
    place(type, tx, ty, builders) {
      const def = BUILDINGS[type];
      if (!this.canPlace(type, tx, ty) || !this.canAfford(def.cost)) return null;
      this.pay(def.cost);
      const b = this.addBuilding(type, 'p', tx, ty, false);
      for (const u of builders || []) if (u.def.builds) this.order(u, { type: 'build', target: b.id });
      return b;
    }
    train(b, type) {
      const def = UNITS[type];
      if (!b.built || !b.def.trains || !b.def.trains.includes(type) || !this.canAfford(def.cost) || b.queue.length >= 5) return false;
      this.pay(def.cost);
      b.queue.push({ type, left: def.time });
      return true;
    }
    research(b, key) {
      const r = RESEARCH[key];
      if (!b.built || this.armor || this.researching || !this.canAfford(r.cost)) return false;
      this.pay(r.cost);
      this.researching = { key, left: r.time, by: b.id };
      return true;
    }

    // --- combat
    damage(target, amount, from) {
      if (target.dead || target.untouchable) return;
      let a = amount;
      if (from && from.team === 'p' && this.aura(from)) a *= 1.25;
      if (from && from.def.robber && from.weak) a *= 0.6;
      const armor = (target.def.armor || 0) + (target.kind === 'unit' && target.team === 'p' && target.def.soldier ? this.armor : 0);
      a = Math.max(1, a - armor);
      if (target.team === 'p' && this.t < this.buffUntil) a *= 0.65;
      target.hp -= a;
      target.hitAt = this.t;
      if (target.kind === 'unit' && target.team !== 'p' && from && from.team === 'p') target.lastHitBy = from.id;
      if (target.team === 'p' && from && from.team === 'r') this.callHelp(target, from);
      if (target.hp <= 0) this.kill(target, from);
    }
    // Something of yours is attacked: idle soldiers nearby come to defend it.
    callHelp(target, from) {
      if (target.helpAt && this.t - target.helpAt < 1) return;
      target.helpAt = this.t;
      for (const u of this.ents.values()) {
        if (u.kind !== 'unit' || u.team !== 'p' || !u.def.soldier || u.dead) continue;
        if (u.order.type !== 'idle' || dist(u, target) > 360) continue;
        this.order(u, { type: 'attack', target: from.id, leash: { x: u.x, y: u.y } });
      }
    }
    aura(u) {
      if (!u.def.soldier || u.def.hero) return false;
      for (const h of this.ents.values()) if (h.kind === 'unit' && h.def.hero && h.team === 'p' && dist(h, u) < h.def.aura) return true;
      return false;
    }
    kill(e, from) {
      if (e.kind === 'unit') {
        if (e.team === 'p') {
          this.stats.fallen++;
          if (e.def.hero) {
            this.heroBack = this.t + 40;
            this.msg('Gidgiddoni is wounded and carried back to Zarahemla. He will lead again soon.', null, 'warn');
          }
          if (e.type === 'villager' && e.from) e.from.lost = (e.from.lost || 0) + 1;
        } else if (e.def.robber) this.stats.defeated++;
        if (this.mission && this.mission.onKill) this.mission.onKill(this, e, from);
      } else {
        if (this.mission && this.mission.onDestroy) this.mission.onDestroy(this, e, from);
      }
      this.remove(e);
    }

    // Everything within `r` of `p` that `team` would fight.
    enemiesNear(p, team, r, unitsOnly) {
      let best = null, bd = r;
      for (const e of this.ents.values()) {
        if (e.dead || e.untouchable || e.team === team || e.team === 'n' || e.team === 'x') continue;
        if (unitsOnly && e.kind !== 'unit') continue;
        if (team === 'p' && e.team !== 'r') continue;
        if (team === 'r' && e.team !== 'p') continue;
        const d = e.kind === 'building' ? this.distToRect(p, e) : dist(p, e);
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
    reachOf(u, target) { return (target.kind === 'building' ? this.distToRect(u, target) : dist(u, target) - 10) <= u.def.range + 6; }

    // ------------------------------------------------------------ the tick

    step(dt) {
      if (this.over) return;
      this.t += dt;
      for (const e of Array.from(this.ents.values())) {
        if (e.dead) continue;
        if (e.kind === 'unit') this.stepUnit(e, dt); else this.stepBuilding(e, dt);
      }
      this.separate(dt);
      if (this.researching) {
        const b = this.ents.get(this.researching.by);
        if (!b) { this.researching = null; }
        else if ((this.researching.left -= dt) <= 0) {
          this.armor = 2; this.researching = null;
          this.msg('Weapons, armor and shields are ready: your soldiers are stronger.', '3 Nephi 3:26', 'good');
        }
      }
      if (this.heroBack && this.t >= this.heroBack) {
        this.heroBack = 0;
        const s = this.stronghold();
        if (s) { const [x, y] = this.freeTileNear(s.tx + 1, s.ty + s.h, 'p'); this.addUnit('gidgiddoni', 'p', center(x), center(y)); this.msg('Gidgiddoni leads the armies again.', null, 'good'); }
      }
      this.effects = this.effects.filter(f => this.t - f.t < 0.35);
      if (this.mission) this.mission.update(this, dt);
    }

    stepBuilding(b, dt) {
      if (!b.built) return;
      if (b.queue.length) {
        const q = b.queue[0];
        if ((q.left -= dt) <= 0) {
          b.queue.shift();
          const [x, y] = this.freeTileNear(b.tx + Math.floor(b.w / 2), b.ty + b.h, 'p');
          const u = this.addUnit(q.type, 'p', center(x), center(y));
          if (b.rally) this.moveTo(u, b.rally[0], b.rally[1]);
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
      this.effects.push({ t: this.t, x0: from.x, y0: from.y, x1: target.x, y1: target.y, kind: 'arrow', team: from.team });
      this.damage(target, dmg, from);
    }

    stepUnit(u, dt) {
      u.cool -= dt;
      if (u.kneelUntil && this.t < u.kneelUntil) return;   // "fallen to the earth" in prayer (3 Nephi 4:8)
      u.think -= dt;
      if (u.think <= 0) {
        u.think = 0.4;
        if (u.def.robber && this.mission && this.mission.robberBrain) this.mission.robberBrain(this, u);
        else if (u.team === 'p' && u.order.type === 'idle' && u.def.dmg && !u.def.gathers) this.autoAcquire(u, u.def.sight);
        else if (u.team === 'p' && u.order.type === 'move' && u.order.attackMove) this.autoAcquire(u, u.def.sight, true);
        else if (u.team === 'p' && u.order.type === 'idle' && u.def.gathers && u.hitAt && this.t - u.hitAt < 1.5) this.autoAcquire(u, 60);
      }
      const o = u.order;
      switch (o.type) {
        case 'move': case 'caravan': case 'retreat': case 'flee': case 'prisoner': case 'hunt': {
          if (!u.path) {
            const g = o.goal || { x0: o.tx, y0: o.ty, x1: o.tx, y1: o.ty };
            u.path = this.findPath(u, g, !!o.near);
          }
          if (this.follow(u, dt)) this.arrive(u);
          else if (u.def.robber && this.blockedBy) { const w = this.blockedBy; this.blockedBy = null; this.order(u, { type: 'attack', target: w.id, then: o }); }
          break;
        }
        case 'attack': {
          const t = this.ents.get(o.target);
          if (!t || t.dead || t.untouchable) { this.afterFight(u); break; }
          if (this.reachOf(u, t)) {
            u.path = null;
            u.face = Math.atan2(t.y - u.y, t.x - u.x);
            if (u.cool <= 0) {
              if (u.def.ranged) this.shoot(u, t, u.def.dmg); else { this.damage(t, u.def.dmg, u); this.effects.push({ t: this.t, x0: u.x, y0: u.y, x1: t.x, y1: t.y, kind: 'hit', team: u.team }); }
              u.cool = u.def.cd;
            }
          } else {
            u.repath = (u.repath || 0) - dt;
            if (!u.path || !u.path.length || u.repath <= 0) {
              u.path = this.findPath(u, this.rectOf(t), true);
              u.repath = 0.8;
            }
            // Walking into a wall on the way: break it (robbers).
            if (this.follow(u, dt) || !u.path) {
              // Beside it but not yet in reach (a corner, say): step in.
              const px = t.kind === 'building' ? Math.max(t.tx * TILE, Math.min(u.x, (t.tx + t.w) * TILE)) : t.x;
              const py = t.kind === 'building' ? Math.max(t.ty * TILE, Math.min(u.y, (t.ty + t.h) * TILE)) : t.y;
              this.approach(u, px, py, dt);
            }
            if (u.def.robber && this.blockedBy) { const w = this.blockedBy; this.blockedBy = null; if (w.team === 'p' && w.id !== t.id) this.order(u, { type: 'attack', target: w.id, then: o }); }
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
      if (u.team !== 'p') return;
      if (!gaveUp && this.autoAcquire(u, u.def.sight, false, leash)) return;
      // Back to where they were standing guard.
      if (leash && dist(u, leash) > TILE * 1.5) this.order(u, { type: 'move', tx: tileOf(leash.x), ty: tileOf(leash.y) });
    }
    // Fight the nearest enemy in sight. The leash is where they were posted: they won't be drawn far from it.
    autoAcquire(u, r, keepMove, leash) {
      const e = this.enemiesNear(u, u.team, r);
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
      if (!this.passable(tx, ty, u.team === 'p' ? 'p' : u.team)) {
        const b = this.occ[idx(tx, ty)] && this.ents.get(this.occ[idx(tx, ty)]);
        if (b && b.def.wall && u.def.robber) { this.blockedBy = b; return false; }
        u.path = null;                              // something new in the way: plan again
        return false;
      }
      const cx = center(tx), cy = center(ty);
      const dx = cx - u.x, dy = cy - u.y, d = Math.hypot(dx, dy);
      let sp = u.def.speed * (u.slow || 1) * (this.tile(tileOf(u.x), tileOf(u.y)) === T.FORD ? 0.7 : 1);
      if (u.carry && u.carry.amt) sp *= 0.9;
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
      if (o.type === 'move') this.order(u, { type: 'idle' });
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
      if (this.passable(tileOf(nx), tileOf(ny), u.team === 'p' ? 'p' : u.team) || !this.passable(tileOf(u.x), tileOf(u.y), u.team === 'p' ? 'p' : u.team)) { u.x = nx; u.y = ny; }
    }

    // --- gathering: out to the field or the trees, back to the storehouse
    stepGather(u, dt) {
      const o = u.order;
      if (!u.phase) u.phase = 'go';
      if (u.phase === 'go') {
        if (!this.isResource(o.tx, o.ty, o.res)) {
          const next = this.nearestResource(o.tx, o.ty, o.res, u);
          if (!next) { this.order(u, { type: 'idle' }); return; }
          o.tx = next[0]; o.ty = next[1]; u.path = null;
        }
        // Next to it, diagonals included, is close enough to work.
        const near = () => this.nextTo(u, { x0: o.tx, y0: o.ty, x1: o.tx, y1: o.ty });
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
        if (this.amt[i] <= 0) { u.phase = u.carry && u.carry.amt ? 'back' : 'go'; return; }
        u.work += dt;
        const kind = this.tiles[i] === T.FOREST ? 'timber' : 'grain', each = kind === 'grain' ? 0.6 : 0.45;
        if (u.work >= each) {
          u.work -= each;
          if (!u.carry || u.carry.type !== kind) u.carry = { type: kind, amt: 0 };
          u.carry.amt += 1; this.amt[i] -= 1;
          if (this.amt[i] <= 0) this.setTile(o.tx, o.ty, T.GRASS);
          if (u.carry.amt >= 10) { u.phase = 'back'; u.path = null; }
        }
      } else if (u.phase === 'back') {
        const drop = this.nearestDropoff(u);
        if (!drop) { this.order(u, { type: 'idle' }); return; }
        if (this.nextTo(u, this.rectOf(drop))) {
          if (u.carry) { this.res[u.carry.type] += u.carry.amt; u.carry = null; }
          u.phase = 'go'; u.path = null; u.tries = 0; return;
        }
        if (!u.path) u.path = this.findPath(u, this.rectOf(drop), true);
        if (this.follow(u, dt) && !this.nextTo(u, this.rectOf(drop))) {
          u.tries = (u.tries || 0) + 1;              // walled off from it
          if (u.tries > 4) this.order(u, { type: 'idle' });
        }
      }
    }
    isResource(x, y, kind) {
      const t = this.tile(x, y);
      return (kind === 'timber' ? t === T.FOREST : t === T.FIELD) && this.amt[idx(x, y)] > 0;
    }
    // The nearest tree or field someone can stand next to, preferring ones fewer workers are on.
    nearestResource(tx, ty, kind, who, skip) {
      const crowd = new Map();
      for (const w of this.ents.values()) if (w.kind === 'unit' && w !== who && w.order.type === 'gather') { const k = w.order.tx + ',' + w.order.ty; crowd.set(k, (crowd.get(k) || 0) + 1); }
      let best = null, bd = Infinity;
      for (let y = Math.max(D.BORDER_Y, ty - 14); y <= Math.min(MAP_H - 1, ty + 14); y++) for (let x = Math.max(0, tx - 14); x <= Math.min(MAP_W - 1, tx + 14); x++) {
        if (!this.isResource(x, y, kind) || (skip && skip === x + ',' + y)) continue;
        let open = this.passable(x, y, 'p');
        for (let dy = -1; dy <= 1 && !open; dy++) for (let dx = -1; dx <= 1 && !open; dx++) if ((dx || dy) && this.passable(x + dx, y + dy, 'p')) open = true;
        if (!open) continue;
        const d = Math.hypot(x - tx, y - ty) + 2.5 * (crowd.get(x + ',' + y) || 0);
        if (d < bd) { bd = d; best = [x, y]; }
      }
      return best;
    }
    nearestDropoff(u) {
      let best = null, bd = Infinity;
      for (const b of this.buildings('p')) if (b.def.dropoff && b.built) { const d = this.distToRect(u, b); if (d < bd) { bd = d; best = b; } }
      return best;
    }
    gatherAt(u, tx, ty) {
      const t = this.tile(tx, ty);
      if (!u.def.gathers || (t !== T.FOREST && t !== T.FIELD)) return false;
      this.order(u, { type: 'gather', tx, ty, res: t === T.FOREST ? 'timber' : 'grain' });
      return true;
    }

    // --- building and mending: stand next to it and work
    needsWork(b) { return b.team === 'p' && !b.dead && (!b.built || b.hp < b.def.hp) && !!b.def.work; }
    stepBuild(u, dt) {
      const b = this.ents.get(u.order.target);
      if (!b || !this.needsWork(b)) { this.order(u, { type: 'idle' }); return; }
      if (this.nextTo(u, this.rectOf(b))) {
        u.path = null;
        const step = dt / b.def.work;
        if (b.built) b.hp = Math.min(b.def.hp, b.hp + b.def.hp * step * 0.5);    // mending a broken wall
        else {
          b.built = Math.min(1, b.built + step);
          b.hp = Math.min(b.def.hp, b.hp + b.def.hp * step * 0.9);
          if (b.built >= 1) {
            b.built = 1;
            this.msg(b.def.name + ' is finished.', null, 'good');
            if (this.mission && this.mission.onBuilt) this.mission.onBuilt(this, b);
          }
        }
        if (!this.needsWork(b)) {
          // A wall-builder moves on to the next unfinished or broken wall nearby.
          const next = this.buildings('p').filter(x => x !== b && this.needsWork(x) && dist(x, u) < 200).sort((a, c) => dist(a, u) - dist(c, u))[0];
          this.order(u, next ? { type: 'build', target: next.id } : { type: 'idle' });
        }
        return;
      }
      if (!u.path) u.path = this.findPath(u, this.rectOf(b), true);
      if (this.follow(u, dt) && !this.nextTo(u, this.rectOf(b))) this.order(u, { type: 'idle' });
    }
  }

  const SIM = { World, TILE, center, tileOf, dist };
  if (typeof module !== 'undefined' && module.exports) module.exports = SIM;
  else root.LIB_SIM = SIM;
})(this);
