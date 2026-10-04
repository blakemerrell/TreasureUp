// Title of Liberty: the camp's mind. In free battle the King-men's war camp
// gathers, builds, trains, marches and rebuilds by the same rules as the
// player (design/evolution.md, section 8). No drawing and no input, so it
// runs the same in the browser and in the tests.
(function (root) {
  'use strict';
  const D = root.LIB_DATA || require('./data.js');
  const S = root.LIB_SIM || require('./sim.js');
  const { BUILDINGS, UNITS, RESEARCH, T, MAP_W } = D;
  const { dist } = S;
  const alive = e => e && !e.dead;

  // What the camp wants standing, in order: it raises the first thing on the list it lacks and can pay for.
  const PLAN = [
    ['tents', 1], ['muster', 1], ['storetent', 1], ['tents', 2], ['shieldtent', 1], ['tents', 3], ['pavilion', 1],
    ['tents', 4], ['ladderworks', 1], ['tents', 5]
  ];
  // Who it trains, as shares of the army: warriors and slingers from the muster ground, captains from the pavilion.
  const MIX = [['lamanite', 0.55], ['slinger', 0.3], ['amalekite', 0.075], ['zoramite', 0.075]];

  class Camp {
    // `home` is the war camp; `L` the difficulty (missions.js LEVELS): bearers, start, first, every, march, marchGrow, rebuild, guards.
    constructor(W, team, home, L) {
      this.W = W; this.team = team; this.home = home; this.L = L;
      this.lostAt = {};                 // when a tent of each kind last fell: it waits before going up again
      this.nextThink = 0;
      this.marches = 0; this.lastMarch = 0; this.wantArmy = L.march;
      this.warned = {};                 // what the player has been told the camp now fields
    }
    units() { return this.W.units(this.team); }
    buildings(type) { return this.W.buildings(this.team, type).filter(alive); }
    warriors() { return this.units().filter(u => u.def.foe); }
    mustered() { return this.warriors().filter(u => u.mode === 'muster'); }
    // How near the next march is, 0 to 1.
    readiness() { return Math.min(1, this.mustered().length / this.wantArmy); }
    // What has gathered, for one who holds the interpreters (Mosiah 8:17).
    forecast() {
      const m = this.mustered(), S = this.W.side(this.team);
      const n = type => m.filter(u => u.type === type).length;
      const parts = [];
      if (n('lamanite')) parts.push(`${n('lamanite')} warriors`);
      if (n('slinger')) parts.push(`${n('slinger')} slingers`);
      const caps = n('amalekite') + n('zoramite');
      if (caps) parts.push(`${caps} captain${caps > 1 ? 's' : ''}`);
      const people = this.W.peopleOf(this.team).replace(/^The /, '');
      return `${m.length} of ${this.wantArmy} ${people} gathered` + (parts.length ? ' (' + parts.join(', ') + ')' : '') + (S.ladders ? ', with ladders' : '');
    }
    noteLost(b) { if (b.team === this.team && b.def.cost) this.lostAt[b.type] = this.W.t; }

    update() {
      const W = this.W;
      if (!alive(this.home) || W.t < this.nextThink) return;
      this.nextThink = W.t + 1;
      this.keepBearers(); this.build(); this.research(); this.train(); this.defend(); this.muster();
    }

    // --- the economy: enough bearers hauling. The idle ones haul on their own, like carts (sim.js: autoHaul).
    keepBearers() {
      const have = this.units().filter(u => u.def.gathers).length + this.home.queue.length;
      if (have < this.L.bearers && this.home.queue.length < 2) this.W.train(this.home, 'bearer');
    }
    // Grain to keep back while there's a tent to raise.
    reserve() { return this.nextWanted() ? 40 : 0; }
    nextWanted() {
      const W = this.W;
      for (const [type, n] of PLAN) {
        if (this.buildings(type).length >= n) continue;
        if (W.t < (this.lostAt[type] || -9999) + this.L.rebuild) continue;
        if (W.whyNotBuild(type, this.team)) continue;
        return type;
      }
      return null;
    }
    build() {
      const W = this.W, type = this.nextWanted();
      if (!type) return;
      const def = BUILDINGS[type];
      if (!W.canAfford(def.cost, this.team)) return;
      if (this.buildings().some(b => b.built < 1)) return;            // one thing at a time
      const spot = this.spotFor(type);
      if (!spot) return;
      const builder = this.units().filter(u => u.def.builds && u.order.type !== 'build').sort((a, b) => dist(a, this.home) - dist(b, this.home))[0];
      W.place(type, spot[0], spot[1], builder ? [builder] : [], this.team);
    }
    // A free plot near the camp, outside its palisade: ring by ring outward, the nearest first.
    spotFor(type) {
      const W = this.W, def = BUILDINGS[type], h = this.home;
      const cx = h.tx + Math.floor(h.w / 2), cy = h.ty + Math.floor(h.h / 2);
      for (let r = 3; r <= 14; r++) {
        const ring = [];
        for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (Math.max(Math.abs(dx), Math.abs(dy)) === r) ring.push([cx + dx - Math.floor(def.w / 2), cy + dy - Math.floor(def.h / 2), W.rand()]);
        ring.sort((a, b) => a[2] - b[2]);                                // (in no fixed order, so the camp grows all round)
        for (const [x, y] of ring) if (!W.whyNotPlace(type, x, y, this.team) && !this.cramped(x, y, def)) return [x, y];
      }
      return null;
    }
    // Not on a field (that's food), and not against the palisade, so the way out stays open.
    cramped(tx, ty, def) {
      const W = this.W;
      for (let y = ty - 1; y <= ty + def.h; y++) for (let x = tx - 1; x <= tx + def.w; x++) {
        if (!W.inBounds(x, y)) continue;
        const inside = x >= tx && x < tx + def.w && y >= ty && y < ty + def.h;
        if (inside && W.tile(x, y) === T.FIELD) return true;
        const id = W.occ[y * MAP_W + x], e = id && W.ents.get(id);
        if (e && e.def.wall && e.team === this.team) return true;
      }
      return false;
    }

    // --- what the tents make, one at a time, as the camp can pay
    research() {
      const W = this.W, side = W.side(this.team);
      if (side.researching) return;
      for (const b of this.buildings()) {
        if (b.built < 1 || !b.def.research) continue;
        for (const key of W.researchAt(b)) {
          if (side.researched[key]) continue;
          const r = RESEARCH[key];
          if (r.ladders && this.marches < 2) continue;                      // ladders come after the walls have stopped them twice (Alma 49:22)
          if (!W.canAfford(r.cost, this.team) || side.res.grain - (r.cost.grain || 0) < this.reserve()) return;
          if (W.research(b, key)) return;
        }
      }
    }

    // --- the army: trained from the tents in the mix, as food and grain allow
    train() {
      const W = this.W, side = W.side(this.team);
      // The mix is kept over the army that will march (and what's queued), not over the guards at home.
      const army = this.mustered(), queued = [];
      for (const b of this.buildings()) for (const q of b.queue) if (UNITS[q.type].foe) queued.push(q);
      const total = army.length + queued.length || 1;
      if (army.length + queued.length >= this.wantArmy) return;         // the army is gathered: grain goes to tents and research now
      for (const b of this.buildings()) {
        if (b.built < 1 || !b.def.trains || b.queue.length >= 2) continue;
        let pick = null, worst = -Infinity;
        for (const [type, share] of MIX) {
          if (!b.def.trains.includes(type)) continue;
          if (UNITS[type].needs && this.marches < 1) continue;            // captains lead from the second march on
          const have = (army.filter(u => u.type === type).length + queued.filter(q => q.type === type).length) / total;
          if (share - have > worst) { worst = share - have; pick = type; }
        }
        if (!pick) continue;
        if (side.res.grain - (UNITS[pick].cost.grain || 0) < this.reserve()) return;
        b.spawn = { mode: 'muster', home: this.home };                   // they gather by the camp until they march
        W.train(b, pick);
      }
    }

    // --- a tent under attack: those gathered at the camp go to it
    defend() {
      const W = this.W;
      for (const b of this.buildings()) {
        if (W.t - (b.hitAt || -99) > 2 || !b.lastHitBy) continue;
        const foe = W.ents.get(b.lastHitBy);
        if (!alive(foe) || W.distToRect(foe, b) > 260) continue;             // (still there, not long gone)
        for (const u of this.mustered()) if (u.order.type !== 'attack') W.order(u, { type: 'attack', target: foe.id, then: { type: 'move', goal: W.rectOf(this.home), near: true } });
        return;
      }
    }

    // --- new warriors keep the camp or gather by it; when enough have gathered, they march
    muster() {
      const W = this.W, L = this.L;
      let guards = this.warriors().filter(u => u.mode === 'guard' && u.home === this.home).length;
      for (const u of this.warriors()) if (!u.mode) {
        u.home = this.home;
        if (guards < Math.ceil(L.guards * 0.6)) { u.mode = 'guard'; guards++; } else u.mode = 'muster';
      }
      const m = this.mustered();
      if (W.t < L.first || !m.length) return;
      const overdue = W.t - Math.max(this.lastMarch, L.first - L.every) >= L.every && m.length >= Math.max(3, Math.ceil(this.wantArmy * 0.6));
      if (m.length < this.wantArmy && !overdue) return;
      for (const u of m) { u.mode = 'attack'; u.home = null; W.order(u, { type: 'idle' }); }
      this.marches++; this.lastMarch = W.t; this.wantArmy += L.marchGrow;
      const side = W.side(this.team), who = W.peopleOf(this.team);
      W.msg(`${who} come to battle: ${m.length} of them${side.ladders ? ', with ladders' : ''}.`, null, 'warn');
      if (side.ladders && !this.warned.ladders) { this.warned.ladders = true; W.msg('They bring ladders: your walls slow them now, but no longer stop them. Towers and archers behind the walls will.', 'Alma 49:22', 'warn'); }
      if (m.some(u => u.type === 'amalekite' || u.type === 'zoramite') && !this.warned.captains) { this.warned.captains = true; W.msg('Captains lead them now, "and they were all Amalekites and Zoramites": armored, and the warriors near them fight harder.', 'Alma 43:6', 'warn'); }
    }
  }

  const CAMP = { Camp, PLAN, MIX };
  if (typeof module !== 'undefined' && module.exports) module.exports = CAMP;
  else root.LIB_CAMP = CAMP;
})(this);
