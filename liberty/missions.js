// Title of Liberty: the missions, each from one chapter and unlocked by
// reading it. The rules follow the story: gather into one place and wait
// for the robbers (3 Nephi 3), then outlast them and cut off their retreat
// (3 Nephi 4).
(function (root) {
  'use strict';
  const D = root.LIB_DATA || require('./data.js');
  const S = root.LIB_SIM || require('./sim.js');
  const { TILE, T, PASSES, CITY, VILLAGES } = D;
  const { center, tileOf, dist } = S;

  const cityRect = () => ({ x0: CITY.x, y0: CITY.y, x1: CITY.x + 3, y1: CITY.y + 3 });
  const passExit = x => ({ x0: x - 1, y0: 0, x1: x + 1, y1: 1 });
  const nearestPass = u => PASSES.reduce((a, b) => Math.abs(center(b) - u.x) < Math.abs(center(a) - u.x) ? b : a);
  const alive = e => e && !e.dead;

  // Robbers come down one of the passes, in a group.
  function spawnRobbers(W, passX, list, extra) {
    const out = [];
    let k = 0;
    for (const [type, n] of list) for (let i = 0; i < n; i++, k++) {
      const x = passX + ((k % 3) - 1), y = 2 + Math.floor(k / 3);
      const [fx, fy] = W.freeTileNear(x, y, 'r');
      out.push(W.addUnit(type, 'r', center(fx), center(fy), Object.assign({}, extra)));
    }
    return out;
  }

  // What a robber does next: fight whoever is close, then follow the band's plan.
  function robberBrain(W, u) {
    const o = u.order;
    if (u.surrendered) return;
    if (o.type === 'retreat' || o.type === 'flee' || o.type === 'hunt') {
      if (W.mission.onRetreatThink) W.mission.onRetreatThink(W, u);
      return;
    }
    if (o.type === 'attack') {
      const t = W.ents.get(o.target);
      if (alive(t)) {
        // Hacking at a wall or a house, but someone's right there: fight them instead.
        if (t.kind === 'building') { const e = W.enemiesNear(u, 'r', 70, true); if (e) W.order(u, { type: 'attack', target: e.id, then: o.then || o }); }
        return;
      }
    }
    if (u.mode === 'waiting') {                     // breaking camp in the night: they only fight if you come close
      const e = W.enemiesNear(u, 'r', 60, true);
      if (e && o.type !== 'attack') W.order(u, { type: 'attack', target: e.id });
      return;
    }
    const siege = u.mode === 'siege';
    const e = W.enemiesNear(u, 'r', siege ? 120 : u.def.sight, siege);
    if (e) { W.order(u, { type: 'attack', target: e.id }); return; }
    if (u.mode === 'raid') {
      const v = W.mission.raidTarget && W.mission.raidTarget(W, u);
      if (v) {
        const same = o.type === 'move' && (v.village ? o.raid === v.village : o.chase === v.unit);
        if (!same) W.order(u, { type: 'move', goal: v.goal, near: true, raid: v.village || null, chase: v.unit || null });
        return;
      }
      u.mode = 'assault';
    }
    if (u.mode === 'assault') {
      const s = W.stronghold();
      if (s && (o.type !== 'attack' || o.target !== s.id)) W.order(u, { type: 'attack', target: s.id });
      return;
    }
    if (siege) {
      const camp = W.ents.get(u.camp);
      if (camp && dist(u, camp) > 4 * TILE && o.type !== 'move') W.order(u, { type: 'move', goal: W.rectOf(camp), near: true });
    }
  }

  // ------------------------------------------------ Mission 1 · 3 Nephi 3

  const m1 = {
    id: 'm1', chapter: '3 Nephi 3', title: 'Gather to One Place', year: 'The seventeenth year',
    deadline: 14 * 60,
    briefing: [
      ['Giddianhi, leader of the Gadianton robbers, has written to Lachoneus: give up your cities, or “on the morrow month” his armies will come down.', '3 Nephi 3:8'],
      ['Lachoneus sends a proclamation: gather “unto one place,” with your families, flocks, herds and all your substance.', '3 Nephi 3:13'],
      ['Build fortifications round about, set guards to watch day and night, and wait for them: do not go up into the mountains.', '3 Nephi 3:14, 21']
    ],
    goals: 'Bring 4 of the 5 villages to Zarahemla, build 40 walls, 4 watchtowers and train 10 guards, before the robbers come down.',
    setup(W) {
      W.res = { grain: 220, timber: 260 };
      W.addBuilding('stronghold', 'p', CITY.x, CITY.y, true);
      const at = (dx, dy) => [center(CITY.x + dx), center(CITY.y + dy)];
      [[-1, 4], [0, 5], [3, 5], [4, 4]].forEach(([dx, dy]) => W.addUnit('worker', 'p', ...at(dx, dy)));
      W.addUnit('gidgiddoni', 'p', ...at(1, -2));
      W.addUnit('spearman', 'p', ...at(0, -2));
      W.addUnit('spearman', 'p', ...at(2, -2));
      W.addUnit('archer', 'p', ...at(3, -2));
      this.villages = VILLAGES.map(v => {
        const b = W.addBuilding('village', 'n', v.x, v.y, true, { name: v.name, people: v.people, flocks: v.flocks, state: 'waiting', arrived: 0, lost: 0 });
        return b;
      });
      this.raids = [[60, [['robber', 2]]], [170, [['robber', 3]]], [290, [['robber', 3], ['robberArcher', 1]]], [410, [['robber', 4], ['robberArcher', 1]]],
                    [530, [['robber', 4], ['robberArcher', 2]]], [650, [['robber', 5], ['robberArcher', 2]]], [770, [['robber', 5], ['robberArcher', 2]]]];
      this.nextRaid = 0;
      this.check = 0;
      // Hints for a first game, each only if it hasn't been done by then.
      this.tips = [
        [40, W => !W.buildings('p', 'barracks').length, 'Choose a worker, tap Barracks, then tap where it goes. The barracks trains guards.'],
        [100, W => W.buildings('p').filter(b => b.def.wall).length < 4, 'Choose workers, tap Walls, and drag a line on the map. Build them round about Zarahemla.'],
        [160, W => !W.buildings('p', 'tower').length, 'Watchtowers shoot at robbers who come near. Build one on each side of the city.'],
        [240, W => W.res.grain + W.res.timber < 150, 'Short of timber? Choose workers and tap a forest. The council gives some too.']
      ];
      W.msg('Lachoneus sends a proclamation: gather your families, flocks, herds and all your substance “unto one place.”', '3 Nephi 3:13');
      W.msg('Send a soldier to each village. When the proclamation reaches it, its people march to Zarahemla.', null, 'tip');
    },
    gathered() { return this.villages.filter(v => v.arrived >= Math.ceil(v.people / 2)).length; },
    objectives(W) {
      const walls = W.buildings('p').filter(b => b.def.wall && b.built).length;
      const towers = W.buildings('p', 'tower').filter(b => b.built).length;
      const guards = W.soldiers().filter(u => !u.def.hero).length;
      return [
        { text: 'Gather the villages to Zarahemla', ref: '3 Nephi 3:13, 22', have: this.gathered(), need: 4, of: 5 },
        { text: 'Build fortifications round about', ref: '3 Nephi 3:14', have: walls, need: 40 },
        { text: 'Build watchtowers for the guards', ref: '3 Nephi 3:14', have: towers, need: 4 },
        { text: 'Train guards', ref: '3 Nephi 3:14', have: guards, need: 10 },
        { text: 'Make weapons, armor and shields (optional)', ref: '3 Nephi 3:26', have: W.armor ? 1 : 0, need: 1, optional: true }
      ];
    },
    timeLeft(W) { return Math.max(0, this.deadline - W.t); },
    timerLabel: 'The robbers come down in',
    update(W, dt) {
      // The proclamation reaches a village when one of your people gets close.
      if ((this.check -= dt) <= 0) {
        this.check = 0.5;
        for (const v of this.villages) {
          if (v.state !== 'waiting') continue;
          const near = W.units('p').some(u => u.type !== 'villager' && u.type !== 'flock' && dist(u, v) < 4.5 * TILE);
          if (near) this.gatherVillage(W, v);
        }
      }
      while (this.tips.length && W.t >= this.tips[0][0]) { const [, need, text] = this.tips.shift(); if (need(W)) W.msg(text, null, 'tip'); }
      // Raids from the hills on the villages that haven't gathered.
      const r = this.raids[this.nextRaid];
      if (r && W.t >= r[0]) {
        this.nextRaid++;
        const pass = PASSES[(this.nextRaid * 2) % 3];
        spawnRobbers(W, pass, r[1], { mode: 'raid' });
        W.msg('Robbers come down out of the hills to raid!', null, 'warn');
      }
      const done = this.objectives(W).filter(o => !o.optional).every(o => o.have >= o.need);
      if (done) this.finish(W, true);
      else if (W.t >= this.deadline) this.finish(W, false);
      if (!W.stronghold()) this.finish(W, false, 'Zarahemla has fallen.');
    },
    gatherVillage(W, v) {
      v.state = 'gone';
      W.msg(`The proclamation reaches ${v.name}. They take their flocks and grain and march to Zarahemla.`, '3 Nephi 3:22');
      const out = [];
      for (let i = 0; i < v.people; i++) out.push(W.addUnit('villager', 'p', v.x + (i - 1) * 14, v.y + 20, { from: v, carry: { type: 'grain', amt: 20 } }));
      for (let i = 0; i < v.flocks; i++) out.push(W.addUnit('flock', 'p', v.x + (i - 1) * 18, v.y - 10, { from: v }));
      for (const u of out) W.order(u, { type: 'caravan', goal: cityRect(), near: true });
      this.leave(W, v);
    },
    // The village is left empty (3 Nephi 4:1: "the cities which had been left desolate").
    leave(W, v) {
      W.remove(v);
      for (let y = v.ty; y < v.ty + v.h; y++) for (let x = v.tx; x < v.tx + v.w; x++) W.setTile(x, y, T.RUIN);
    },
    onArrive(W, u) {
      if (u.order.type === 'caravan') {
        if (u.type === 'flock') { W.res.grain += u.def.carries; W.remove(u); }
        else {
          if (u.carry) { W.res.grain += u.carry.amt; u.carry = null; }
          u.type = 'worker'; u.def = D.UNITS.worker; u.hp = Math.min(u.hp + 5, u.def.hp);
          W.order(u, { type: 'idle' });
          W.stats.gathered++;
        }
        if (u.from) {
          if (u.type === 'worker') u.from.arrived++;
          if (u.from.arrived === Math.ceil(u.from.people / 2)) W.msg(`${u.from.name} has gathered at Zarahemla.`, '3 Nephi 3:25', 'good');
        }
        return true;
      }
      if (u.order.raid) {                           // robbers reached a village no one had warned
        const v = u.order.raid;
        if (v.state === 'waiting') {
          v.state = 'taken';
          W.msg(`Robbers took ${v.name} before its people could gather.`, null, 'warn');
          this.leave(W, v);
        }
        W.order(u, { type: 'idle' });
        return true;
      }
      return false;
    },
    raidTarget(W, u) {
      const waiting = this.villages.filter(v => v.state === 'waiting');
      let best = null, bd = Infinity;
      for (const v of waiting) { const d = dist(u, v); if (d < bd) { bd = d; best = { goal: W.rectOf(v), village: v }; } }
      if (best) return best;
      // Nothing left to take: go after anyone out in the open.
      for (const p of W.units('p')) { const d = dist(u, p); if (d < bd && d < 600) { bd = d; best = { goal: W.rectOf(p), unit: p.id }; } }
      return best;
    },
    robberBrain,
    finish(W, won, why) {
      if (W.over) return;
      const got = this.gathered();
      W.over = won
        ? { won: true, stars: got === 5 ? 3 : W.armor ? 2 : 1,
            title: 'Zarahemla is ready',
            text: '“They did fortify themselves against their enemies; and they did dwell in one land, and in one body.”', ref: '3 Nephi 3:25',
            next: 'Read 3 Nephi 4 to find out what the robbers did next, and to open the next mission.' }
        : { won: false, title: why || 'The robbers came down too soon',
            text: why ? 'Keep guards near the city.' : 'Send soldiers to the villages early, and build walls while the villagers march in.', ref: null };
    }
  };

  // ------------------------------------------------ Mission 2 · 3 Nephi 4

  // Zarahemla as the first mission left it: walls round about with four gates.
  const RING = { x0: 21, y0: 31, x1: 42, y1: 46 };
  const inside = u => { const x = tileOf(u.x), y = tileOf(u.y); return x > RING.x0 && x < RING.x1 && y > RING.y0 && y < RING.y1; };
  function fortify(W) {
    const { x0, x1, y0, y1 } = RING;
    const gates = new Set(['31,31', '32,31', '21,38', '42,38', '31,46', '32,46']);
    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) {
      if (x !== x0 && x !== x1 && y !== y0 && y !== y1) continue;
      if (!W.inBounds(x, y) || W.tile(x, y) === T.WATER || W.tile(x, y) === T.ROCK) continue;
      W.addBuilding(gates.has(x + ',' + y) ? 'gate' : 'wall', 'p', x, y, true);
    }
    W.addBuilding('tower', 'p', 23, 32, true);
    W.addBuilding('tower', 'p', 39, 32, true);
    W.addBuilding('tower', 'p', 23, 43, true);
    W.addBuilding('tower', 'p', 39, 43, true);
    W.addBuilding('barracks', 'p', 25, 38, true);
    W.addBuilding('storehouse', 'p', 36, 38, true);
  }

  const m2 = {
    id: 'm2', chapter: '3 Nephi 4', title: 'The Robbers Come Down', year: 'The eighteenth to twenty-first years',
    needs: 'm1',
    briefing: [
      ['The robbers come out of the mountains and take the empty lands, but there is no food there.', '3 Nephi 4:1–3'],
      ['Zarahemla has laid up provisions “for the space of seven years.”', '3 Nephi 4:4'],
      ['Hold the city. When they can no longer stay, cut off their retreat.', '3 Nephi 4:24']
    ],
    goals: 'Stand against Giddianhi\'s attack, outlast Zemnarihah\'s siege, then cut off the robbers\' retreat.',
    setup(W) {
      W.res = { grain: 900, timber: 320 };
      W.addBuilding('stronghold', 'p', CITY.x, CITY.y, true);
      fortify(W);
      for (const v of VILLAGES) for (let y = v.y; y < v.y + 3; y++) for (let x = v.x; x < v.x + 3; x++) W.setTile(x, y, T.RUIN);
      const put = (type, tx, ty) => { const [x, y] = W.freeTileNear(tx, ty, 'p'); return W.addUnit(type, 'p', center(x), center(y)); };
      for (let i = 0; i < 6; i++) { const u = put('worker', 26 + i * 2, 43); const f = W.nearestResource(26 + i * 2, 43, 'grain'); if (f) W.gatherAt(u, f[0], f[1]); }
      for (let i = 0; i < 6; i++) put('spearman', 27 + i, 34);
      for (let i = 0; i < 4; i++) put('archer', 28 + i, 35);
      put('gidgiddoni', 31, 35);
      this.phase = 'prep';
      this.phaseAt = 0;
      this.wave = [];
      this.camps = [];
      this.cryUsed = false; this.cryReady = false;
      this.giddianhi = null; this.giddianhiDown = null;
      this.zem = null; this.zemDown = false;
      this.retreatTotal = 0;
      W.msg('The robbers come out of the mountains and take the lands the Nephites left. But there is no game for them there.', '3 Nephi 4:1–2');
      W.msg('Zarahemla has provisions for seven years. Get ready: they must come up in open battle.', '3 Nephi 4:4', 'tip');
    },
    timerLabel: null,
    timeLeft(W) {
      if (this.phase === 'prep') return Math.max(0, 110 - W.t);
      if (this.phase === 'interlude') return Math.max(0, this.phaseAt + 60 - W.t);
      if (this.phase === 'night') return Math.max(0, this.marchAt - W.t);
      return null;
    },
    get phaseLabel() {
      return { prep: 'The eighteenth year: Giddianhi comes up to battle in', giddianhi: 'The nineteenth year', pursuit: 'The nineteenth year', interlude: 'The twentieth year: the siege begins in', siege: 'The twenty and first year: the siege', night: 'Night: the robbers march at dawn, in', retreat: 'The robbers withdraw' }[this.phase];
    },
    objectives(W) {
      const p = this.phase;
      const list = [];
      list.push({ text: 'Stand against Giddianhi\'s attack', ref: '3 Nephi 4:5–12', have: ['prep', 'giddianhi'].includes(p) ? 0 : 1, need: 1 });
      if (p === 'pursuit' || this.giddianhiDown != null) list.push({ text: 'Pursue them to the borders of the wilderness (optional)', ref: '3 Nephi 4:13–14', have: this.giddianhiDown ? 1 : 0, need: 1, optional: true });
      if (['siege', 'night', 'retreat', 'done'].includes(p)) list.push({ text: 'Outlast the siege: the robbers run out of food', ref: '3 Nephi 4:16–20', have: p === 'siege' ? 0 : 1, need: 1 });
      if (['night', 'retreat', 'done'].includes(p)) list.push({ text: 'Cut off their retreat', ref: '3 Nephi 4:24–26', have: this.retreatTotal - this.retreatLeft(W) - W.stats.escaped, need: this.retreatTotal });
      return list;
    },
    retreatLeft(W) { return W.units('r').filter(u => !u.surrendered).length; },
    update(W, dt) {
      if (!W.stronghold()) return this.finish(W, false);
      if (this.phase === 'prep' && W.t >= 110) this.startGiddianhi(W);
      else if (this.phase === 'giddianhi') {
        const left = this.wave.filter(alive);
        const g = this.giddianhi;
        if (left.length <= Math.ceil(this.wave.length * 0.3) || (alive(g) && g.hp < g.def.hp * 0.35)) this.fallBack(W);
      } else if (this.phase === 'pursuit') {
        if (!this.wave.some(alive)) {
          this.phase = 'interlude'; this.phaseAt = W.t;
          W.msg('The armies return to their place of security. The robbers do not come again in the nineteenth or twentieth year.', '3 Nephi 4:15');
          W.soldiers().filter(s => !inside(s)).forEach((s, i) => W.moveTo(s, 27 + (i % 10), 34 + ((i / 10) | 0)));
        }
      } else if (this.phase === 'interlude' && W.t >= this.phaseAt + 60) this.startSiege(W);
      else if (this.phase === 'siege') this.stepSiege(W, dt);
      else if (this.phase === 'night' && W.t >= this.marchAt) this.march(W);
      else if (this.phase === 'retreat' && this.retreatLeft(W) === 0) this.finish(W, true);
    },
    startGiddianhi(W) {
      this.phase = 'giddianhi';
      this.cryReady = true;
      const g = spawnRobbers(W, PASSES[1], [['giddianhi', 1], ['robber', 6], ['robberArcher', 2]], { mode: 'assault' });
      this.giddianhi = g[0];
      this.wave = g.concat(spawnRobbers(W, PASSES[0], [['robber', 5], ['robberArcher', 2]], { mode: 'assault' }),
                           spawnRobbers(W, PASSES[2], [['robber', 5], ['robberArcher', 2]], { mode: 'assault' }));
      W.msg('Giddianhi\'s armies come up to battle. “Great and terrible was the appearance of the armies of Giddianhi.”', '3 Nephi 4:7', 'warn');
    },
    // The Nephites "had all fallen to the earth, and did lift their cries to the Lord" (3 Nephi 4:8).
    cry(W) {
      if (!this.cryReady || this.cryUsed) return;
      this.cryUsed = true; this.cryReady = false;
      for (const u of W.units('p')) u.kneelUntil = W.t + 2.5;
      W.buffUntil = W.t + 2.5 + 75;
      W.msg('The Nephites fall to the earth and cry to the Lord. The robbers shout for joy, thinking they are afraid.', '3 Nephi 4:8–9');
      W.msg('But they do not fear them: “in the strength of the Lord they did receive them.” Your people take less harm for a while.', '3 Nephi 4:10', 'good');
    },
    fallBack(W) {
      this.phase = 'pursuit';
      this.cryReady = false;
      W.msg('The Nephites beat them, and they fall back. Pursue them “as far as the borders of the wilderness.”', '3 Nephi 4:12–13', 'good');
      for (const u of this.wave.filter(alive)) {
        W.order(u, { type: 'flee', goal: passExit(nearestPass(u)), near: false });
        if (u === this.giddianhi) u.slow = 0.55;   // "being weary because of his much fighting" (3 Nephi 4:14)
      }
      this.giddianhiDown = false;
    },
    startSiege(W) {
      this.phase = 'siege';
      W.prov = 100;
      this.huntYield = 8;
      this.nextHunt = W.t + 20;
      this.nextRaid = W.t + 45;
      // Out of the watchtowers' reach, on every side (3 Nephi 4:16).
      const spots = [[29, 23, 'zemnarihah'], [11, 36], [51, 36], [48, 29]];
      const ring = [[-1, 1], [3, 1], [1, -1], [1, 3], [-1, -1], [3, 3], [-1, 3], [3, -1]];
      for (const [x, y, leader] of spots) {
        const camp = W.addBuilding('camp', 'r', x, y, true);
        this.camps.push(camp);
        const band = [['robber', leader ? 5 : 4], ['robberArcher', 1]];
        if (leader) band.unshift([leader, 1]);
        let k = 0;
        for (const [type, n] of band) for (let i = 0; i < n; i++, k++) {
          const [fx, fy] = W.freeTileNear(x + ring[k % 8][0], y + ring[k % 8][1], 'r');
          const u = W.addUnit(type, 'r', center(fx), center(fy), { mode: 'siege', camp: camp.id });
          if (leader && type === leader) this.zem = u;
        }
      }
      W.msg('In the twenty and first year, Zemnarihah\'s robbers come up on all sides to lay siege round about.', '3 Nephi 4:16–17', 'warn');
      W.msg('But their food is scarce: watch the robbers\' food run out. March out and fall upon their camps.', '3 Nephi 4:18–21', 'tip');
    },
    stepSiege(W, dt) {
      const band = W.units('r');
      W.prov -= dt * (0.1 + 0.03 * band.length);
      // Hunting in the wilderness brings back less and less (3 Nephi 4:20: "the wild game became scarce").
      if (W.t >= this.nextHunt) {
        this.nextHunt = W.t + 30;
        for (const c of this.camps.filter(alive)) {
          const h = band.find(u => u.camp === c.id && u.order.type !== 'attack' && !u.def.leader && u.order.type !== 'hunt');
          if (h) W.order(h, { type: 'hunt', goal: { x0: nearestPass(h) - 1, y0: 7, x1: nearestPass(h) + 1, y1: 8 }, near: true, leg: 'out' });
        }
      }
      // Now and then a few test the walls, while there are enough of them.
      if (W.t >= this.nextRaid) {
        this.nextRaid = W.t + 45;
        const camps = this.camps.filter(alive);
        const c = camps[Math.floor(W.t) % Math.max(1, camps.length)];
        const men = c ? band.filter(u => u.camp === c.id && u.mode === 'siege' && !u.def.leader) : [];
        if (band.length > 12 && men.length >= 4) men.slice(0, 2).forEach(u => { u.mode = 'assault'; });
      }
      if (W.prov <= 0 || !this.camps.some(alive)) this.startRetreat(W);
    },
    onKill(W, e, from) {
      if (e === this.giddianhi && this.phase === 'pursuit') {
        this.giddianhiDown = true;
        W.msg('Giddianhi, weary from his much fighting, was overtaken.', '3 Nephi 4:14', 'good');
      }
      if (this.phase === 'siege' && e.team === 'p') W.prov += 4;    // plunder
      if (e === this.zem) this.zemDown = true;
    },
    onDestroy(W, b) {
      if (b.type === 'camp' && this.phase === 'siege') {
        W.prov -= 15;
        W.msg('The Nephites march out and fall upon the robbers\' camp.', '3 Nephi 4:21', 'good');
        const other = this.camps.find(c => c !== b && alive(c));
        for (const u of W.units('r')) if (u.camp === b.id) { u.camp = other ? other.id : null; if (!other) u.mode = 'assault'; }
      }
    },
    onArrive(W, u) {
      const o = u.order;
      if (o.type === 'hunt') {
        if (o.leg === 'out') { W.order(u, { type: 'hunt', goal: W.rectOf(W.ents.get(u.camp) || u), near: true, leg: 'back' }); return true; }
        W.prov += this.huntYield;
        this.huntYield = Math.max(1, this.huntYield - 1);
        W.order(u, { type: 'idle' });
        return true;
      }
      if (o.type === 'flee' || o.type === 'retreat') {
        if (o.type === 'retreat') W.stats.escaped++;
        W.remove(u);
        return true;
      }
      if (o.type === 'prisoner') { W.remove(u); return true; }
      return false;
    },
    // Zemnarihah gives up the siege. Gidgiddoni sends his armies out "in the
    // night-time" to get in front of them, so that "on the morrow, when the
    // robbers began their march," they are met (3 Nephi 4:24–25).
    startRetreat(W) {
      this.phase = 'night';
      this.marchAt = W.t + 20;
      W.night = true;
      W.prov = Math.max(0, W.prov);
      W.borderOpen = true;
      const band = W.units('r');
      this.retreatTotal = band.length;
      for (const u of band) { u.weak = true; u.mode = 'waiting'; if (u.order.type !== 'attack') W.order(u, { type: 'idle' }); }
      W.msg('“The robbers were about to perish with hunger.” Zemnarihah commands them to withdraw to the land northward.', '3 Nephi 4:20–23', 'warn');
      W.msg('It is night. Send your armies out now to the three passes, in the way of their retreat. At dawn the robbers march.', '3 Nephi 4:24–25', 'tip');
    },
    march(W) {
      this.phase = 'retreat';
      W.night = false;
      W.msg('Morning: the robbers begin their march. Those you meet will give themselves up.', '3 Nephi 4:25–27', 'warn');
      for (const u of W.units('r')) {
        u.slow = u.def.leader ? 0.62 : 0.72; u.mode = 'retreat';
        W.order(u, { type: 'retreat', goal: passExit(nearestPass(u)), near: false });
      }
      for (const c of this.camps.filter(alive)) W.remove(c);
    },
    // A retreating robber caught by your soldiers gives himself up (3 Nephi 4:27).
    onRetreatThink(W, u) {
      if (u.order.type !== 'retreat') return;
      const near = W.soldiers().filter(s => dist(s, u) < 72);
      if (near.length >= 2 || (near.length && u.hp < u.def.hp * 0.6)) {
        u.surrendered = true; u.untouchable = true; u.team = 'x'; u.weak = false;
        W.stats.prisoners++;
        if (u === this.zem) { this.zemDown = true; W.msg('Zemnarihah was taken.', '3 Nephi 4:28', 'good'); }
        W.order(u, { type: 'prisoner', goal: cityRect(), near: true });
        if (W.stats.prisoners % 5 === 1) W.msg('Robbers yield themselves up as prisoners.', '3 Nephi 4:27', 'good');
        return;
      }
      if (near.length === 1 && dist(near[0], u) < 26) W.order(u, { type: 'attack', target: near[0].id, then: u.order });
    },
    robberBrain,
    finish(W, won) {
      if (W.over) return;
      if (!won) { W.over = { won: false, title: 'Zarahemla has fallen', text: 'Keep your walls mended and your soldiers inside them until the robbers run out of food.', ref: null }; return; }
      const stopped = this.retreatTotal - W.stats.escaped, share = this.retreatTotal ? stopped / this.retreatTotal : 1;
      W.over = { won: true, stars: share >= 0.8 && this.zemDown ? 3 : share >= 0.6 ? 2 : 1,
        title: 'The robbers are cut off',
        text: '“They knew it was because of their repentance and their humility that they had been delivered from an everlasting destruction.”', ref: '3 Nephi 4:33',
        detail: `${W.stats.prisoners} gave themselves up, ${W.stats.escaped} got away.`,
        next: '“Hosanna to the Most High God” (3 Nephi 4:32).' };
    }
  };

  const MISSIONS = [m1, m2];
  const API = { MISSIONS, robberBrain, spawnRobbers };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.LIB_MISSIONS = API;
})(this);
