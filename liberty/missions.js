// Title of Liberty: the missions, each from one chapter and unlocked by
// reading it. The rules follow the story: gather into one place and wait
// for the robbers (3 Nephi 3), then outlast them and cut off their retreat
// (3 Nephi 4).
(function (root) {
  'use strict';
  const D = root.LIB_DATA || require('./data.js');
  const S = root.LIB_SIM || require('./sim.js');
  const CAMP = root.LIB_CAMP || require('./camp.js');
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
    id: 'm1', campaign: 'gidgiddoni', chapter: '3 Nephi 3', title: 'Gather to One Place', year: 'The seventeenth year',
    starsText: '★ ready in time, ★★ with weapons, armor and shields made, ★★★ with all five villages gathered.',
    deadline: 14 * 60,
    briefing: [
      ['Giddianhi, leader of the Gadianton robbers, has written to Lachoneus: give up your cities, or “on the morrow month” his armies will come down.', '3 Nephi 3:8'],
      ['Lachoneus sends a proclamation: gather “unto one place,” with your families, flocks, herds and all your substance.', '3 Nephi 3:13'],
      ['Build fortifications round about, set guards to watch day and night, and wait for them: do not go up into the mountains.', '3 Nephi 3:14, 21']
    ],
    goals: 'Bring 4 of the 5 villages to Zarahemla, build 40 walls, 4 watchtowers and train 10 guards, before the robbers come down.',
    setup(W) {
      W.res = { grain: 220, timber: 260, stone: 80 };
      W.addBuilding('stronghold', 'p', CITY.x, CITY.y, true);
      const at = (dx, dy) => [center(CITY.x + dx), center(CITY.y + dy)];
      [[-1, 4], [4, 4]].forEach(([dx, dy]) => W.addUnit('cart', 'p', ...at(dx, dy)));
      [[0, 5], [3, 5]].forEach(([dx, dy]) => W.addUnit('worker', 'p', ...at(dx, dy)));
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
        [40, W => !W.buildings('p', 'barracks').length, 'Tap Zarahemla, tap Barracks, then tap where it goes. It builds itself; the barracks trains guards.'],
        [100, W => W.buildings('p').filter(b => b.def.wall).length < 4, 'Tap Zarahemla, tap Walls, and drag a line on the map. Build them round about the city.'],
        [160, W => !W.buildings('p', 'tower').length, 'Watchtowers shoot at robbers who come near. Build one on each side of the city.'],
        [240, W => W.res.grain + W.res.timber < 150, 'Short of timber? Tap a cart, then a forest. Zarahemla can make more carts, and the council gives some too.'],
        [300, W => W.res.stone < 40 && W.buildings('p', 'tower').length < 4, 'Watchtowers take stone. Tap a cart, then a rock face, and it quarries and hauls on its own.']
      ];
      W.msg('Lachoneus sends a proclamation: gather your families, flocks, herds and all your substance “unto one place.”', '3 Nephi 3:13');
      W.msg('Send a soldier to each village. When the proclamation reaches it, its people march to Zarahemla.', null, 'tip');
    },
    gathered() { return this.villages.filter(v => v.arrived >= Math.ceil(v.people / 2)).length; },
    objectives(W) {
      const walls = W.buildings('p').filter(b => b.def.wall && b.built >= 1).length;
      const towers = W.buildings('p', 'tower').filter(b => b.built >= 1).length;
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
    foeBrain: robberBrain,
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
    id: 'm2', campaign: 'gidgiddoni', chapter: '3 Nephi 4', title: 'The Robbers Come Down', year: 'The eighteenth to twenty-first years',
    starsText: '★ the robbers are gone, ★★ most of them stopped, ★★★ most stopped and Zemnarihah taken.',
    power() { return this.cryReady && !this.cryUsed ? { id: 'cry', label: 'Cry unto the Lord', ref: '3 Nephi 4:8–10' } : null; },
    usePower(W) { this.cry(W); },
    // At night, where to stand: in the way of their retreat.
    markers() { return ['night', 'retreat'].includes(this.phase) ? PASSES.map(x => ({ x, y: 6, label: 'Block the pass here' })) : []; },
    needs: 'm1',
    briefing: [
      ['The robbers come out of the mountains and take the empty lands, but there is no food there.', '3 Nephi 4:1–3'],
      ['Zarahemla has laid up provisions “for the space of seven years.”', '3 Nephi 4:4'],
      ['Hold the city. When they can no longer stay, cut off their retreat.', '3 Nephi 4:24']
    ],
    goals: 'Stand against Giddianhi\'s attack, outlast Zemnarihah\'s siege, then cut off the robbers\' retreat.',
    setup(W) {
      W.res = { grain: 900, timber: 320, stone: 120 };
      W.addBuilding('stronghold', 'p', CITY.x, CITY.y, true);
      fortify(W);
      for (const v of VILLAGES) for (let y = v.y; y < v.y + 3; y++) for (let x = v.x; x < v.x + 3; x++) W.setTile(x, y, T.RUIN);
      const put = (type, tx, ty) => { const [x, y] = W.freeTileNear(tx, ty, 'p'); return W.addUnit(type, 'p', center(x), center(y)); };
      for (let i = 0; i < 3; i++) { const u = put('cart', 26 + i * 3, 43); const f = W.nearestResource(26 + i * 3, 43, 'grain'); if (f) W.gatherAt(u, f[0], f[1]); }
      for (let i = 0; i < 2; i++) put('worker', 36 + i, 43);
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
    foeBrain: robberBrain,
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


  // ------------------------------------------------ Mission 3 · Alma 43–44

  const SD = D.SIDON;
  const inRect = (u, c) => { const x = tileOf(u.x), y = tileOf(u.y); return x >= c.x0 && x <= c.x1 && y >= c.y0 && y <= c.y1; };
  const nearTile = (u, p, r) => Math.hypot(u.x - center(p.x), u.y - center(p.y)) <= r * TILE;
  const westOfRiver = u => tileOf(u.x) < SD.river(tileOf(u.y));
  const around = (p, r) => ({ x0: p.x - r, y0: p.y - r, x1: p.x + r, y1: p.y + r });

  // The Lamanites: march the way Alma foresaw, fight whoever they find, run, or stand.
  function sidonBrain(W, u) {
    const o = u.order, M = W.mission;
    if (u.surrendered || W.truce) return;
    if (o.type === 'attack') {
      const t = W.ents.get(o.target);
      if (alive(t) && !t.untouchable) {
        if (t.kind === 'building') { const e = W.enemiesNear(u, 'r', 70, true); if (e) W.order(u, { type: 'attack', target: e.id, then: o.then || o }); }
        return;
      }
    }
    if (u.mode === 'flee') return;                     // running for the river, not fighting
    // Zerahemnah, badly hurt, "withdrew from before them into the midst of his soldiers" (Alma 44:12).
    if (u.spare && u.hp < u.def.hp * 0.3 && u.mode !== 'withdrawn') { u.mode = 'withdrawn'; u.noAuto = true; W.order(u, { type: 'move', goal: around(SD.GATHER, 1), near: true }); return; }
    if (u.mode === 'withdrawn') return;
    if (u.mode === 'waiting' || u.mode === 'cornered') {
      // Cornered and "struck with terror" (Alma 43:53), they fight only when struck.
      const e = W.enemiesNear(u, 'r', u.mode === 'cornered' ? 80 : 60, true);
      if (e && o.type !== 'attack' && (u.mode === 'waiting' || W.t - (u.hitAt || -99) < 3)) W.order(u, { type: 'attack', target: e.id });
      else if (u.mode === 'cornered' && o.type === 'idle' && !nearTile(u, SD.GATHER, 3)) W.order(u, { type: 'move', goal: around(SD.GATHER, 1), near: true });
      return;
    }
    // On the march they keep to their course, thinking no one knows where they've gone (43:22).
    const e = W.enemiesNear(u, 'r', u.mode === 'fight' ? 320 : 120, true);
    if (e) { W.order(u, { type: 'attack', target: e.id, then: u.mode === 'march' ? M.marchOrder(u) : null }); return; }
    if (u.mode === 'raid') { const j = M.jershon; if (alive(j) && (o.type !== 'attack' || o.target !== j.id)) W.order(u, { type: 'attack', target: j.id }); return; }
    if (o.type === 'idle') W.order(u, M.marchOrder(u));
  }

  const m3 = {
    id: 'm3', campaign: 'moroni', chapter: 'Alma 43–44', chapters: ['Alma 43', 'Alma 44'], title: 'At the River Sidon', year: 'The eighteenth year of the judges',
    map: D.buildSidonMap, research: 'breastplates',
    briefing: [
      ['The Zoramites have joined the Lamanites. Zerahemnah gathers their armies in Antionum, to bring the Nephites into bondage.', 'Alma 43:4–8'],
      ['Moroni, chief captain at twenty-five, meets them in the borders of Jershon.', 'Alma 43:16–18'],
      ['The Nephites fight “for their homes and their liberties, their wives and their children.”', 'Alma 43:45']
    ],
    goals: 'Arm your people, find out where the Lamanites are going, hide your armies by the river Sidon, and end the war with a covenant of peace.',
    starsText: '★ the war ends in peace, ★★ and Jershon kept safe, ★★★ and at least 1 in 4 of the Lamanites spared by a covenant.',
    setup(W) {
      W.border = null;
      W.res = { grain: 320, timber: 300, stone: 60 };
      W.noGo = [Object.assign({ text: 'That is Antionum, the Zoramites\' land. Moroni waits for them in the borders of Jershon.', ref: 'Alma 43:18' }, SD.ANTIONUM_LAND)];
      const J = SD.JERSHON;
      this.jershon = W.addBuilding('stronghold', 'p', J.x, J.y, true, { name: 'Jershon' });
      this.manti = W.addBuilding('stronghold', 'p', SD.MANTI.x, SD.MANTI.y, true, { name: 'Manti' });
      W.addBuilding('barracks', 'p', J.x - 6, J.y + 1, true);
      const put = (type, tx, ty) => { const [x, y] = W.freeTileNear(tx, ty, 'p'); return W.addUnit(type, 'p', center(x), center(y)); };
      for (let i = 0; i < 2; i++) { const u = put('cart', J.x - 1 + i * 2, J.y + 6); const f = W.nearestResource(J.x, J.y + 6, i ? 'grain' : 'timber'); if (f) W.gatherAt(u, f[0], f[1]); }
      for (let i = 0; i < 2; i++) put('worker', J.x + 3 + i, J.y + 6);
      put('moroni', J.x + 1, J.y + 8); put('lehi', J.x + 3, J.y + 8);
      for (let i = 0; i < 8; i++) put('spearman', J.x - 3 + i, J.y + 9);
      for (let i = 0; i < 4; i++) put('archer', J.x - 1 + i, J.y + 10);
      this.alma = W.addUnit('alma', 'n', center(SD.ALMA.x), center(SD.ALMA.y), { untouchable: true });
      // Zerahemnah's armies in Antionum, "more than double the number of the Nephites" (Alma 43:51).
      this.camp = W.addBuilding('camp', 'r', SD.ANTIONUM.x, SD.ANTIONUM.y, true, { untouchable: true, name: 'Lamanite camp in Antionum',
        about: 'The Lamanites "came into the land of Antionum, which is the land of the Zoramites; and a man by the name of Zerahemnah was their leader" (Alma 43:5).' });
      this.hostList = [['zerahemnah', 1], ['amalekite', 2], ['zoramite', 2], ['lamanite', 19], ['slinger', 8]];
      this.hostTotal = this.hostList.reduce((a, [, n]) => a + n, 0);
      this.host = [];
      let k = 0;
      for (const [type, n] of this.hostList) for (let i = 0; i < n; i++, k++) {
        const [x, y] = W.freeTileNear(SD.ANTIONUM.x + 1 + (k % 7) - 3, SD.ANTIONUM.y + 4 + Math.floor(k / 7), 'r');
        this.host.push(W.addUnit(type, 'r', center(x), center(y), { mode: 'waiting', spare: type === 'zerahemnah' }));
      }
      this.villages = SD.VILLAGES.map(v => W.addBuilding('village', 'n', v.x, v.y, true, { name: v.name, state: 'waiting' }));
      this.phase = 'arm'; this.flags = {}; this.check = 0; this.story = [];
      W.msg('The Lamanites gather in Antionum with Zerahemnah. Moroni meets them in the borders of Jershon.', 'Alma 43:15–18');
      W.msg('Choose the barracks and make breastplates and shields, and train more soldiers.', null, 'tip');
    },
    get phaseLabel() {
      return { arm: 'The eighteenth year: the Lamanites wait in Antionum', seek: 'Where have they gone?', ready: 'The Lamanites come in', march: 'The Lamanites come', rout: 'They flee to the river', west: 'By the river Sidon', dragons: 'They fight like dragons', flee: 'Encircle them', parley: 'Moroni speaks to Zerahemnah', fight2: 'The last of the fighting', peace: 'A covenant of peace' }[this.phase];
    },
    timeLeft(W) { return this.phase === 'ready' ? Math.max(0, this.comeAt - W.t) : null; },
    // How many soldiers are where the story wants them.
    count(W, test) { return W.soldiers().filter(test).length; },
    guards(W) { return this.count(W, u => !u.def.hero && alive(this.jershon) && dist(u, this.jershon) < 9 * TILE); },
    inCover(W, side) { const c = SD.COVER.find(c => c.side === side); return this.count(W, u => inRect(u, c)); },
    hiddenReady(W) { return this.inCover(W, 'east') >= 6 && this.inCover(W, 'west') >= 6; },
    banks(W) {
      const near = u => nearTile(u, SD.GATHER, 9);
      return { west: this.count(W, u => near(u) && westOfRiver(u)), east: this.count(W, u => near(u) && tileOf(u.x) > SD.river(tileOf(u.y)) + 1) };
    },
    objectives(W) {
      const f = this.flags, p = this.phase;
      if (p === 'arm') return [
        { text: 'Arm your people with breastplates and shields', ref: 'Alma 43:19', have: W.armor ? 1 : 0, need: 1 },
        { text: 'Train soldiers', ref: 'Alma 43:18', have: Math.min(16, this.count(W, u => !u.def.hero)), need: 16 }];
      if (p === 'seek') return [
        { text: 'Send spies to watch their camp', ref: 'Alma 43:23', have: f.spies ? 1 : 0, need: 1 },
        { text: 'Send messengers to Alma, to ask the Lord', ref: 'Alma 43:23–24', have: f.alma ? 1 : 0, need: 1 }];
      if (p === 'ready') return [
        { text: 'Leave part of the army in Jershon', ref: 'Alma 43:25', have: Math.min(4, this.guards(W)), need: 4 },
        { text: 'Gather the people of Manti\'s quarter to battle', ref: 'Alma 43:26', have: this.villages.filter(v => v.state !== 'waiting').length, need: 3 },
        { text: 'Hide an army south of the hill Riplah (take Lehi)', ref: 'Alma 43:31', have: Math.min(6, this.inCover(W, 'east')), need: 6 },
        { text: 'Hide the rest in the west valley (take Moroni)', ref: 'Alma 43:32', have: Math.min(6, this.inCover(W, 'west')), need: 6 }];
      if (['march', 'rout', 'west', 'dragons'].includes(p)) return [
        { text: 'Let them pass the hill, then strike as they cross the river', ref: 'Alma 43:34–35', have: f.lehi ? 1 : 0, need: 1 },
        { text: 'Drive them into the river, and meet them on the other side', ref: 'Alma 43:40–41', have: ['west', 'dragons'].includes(p) ? 1 : 0, need: 1 },
        { text: 'Keep Manti safe', ref: 'Alma 43:24', have: alive(this.manti) ? 1 : 0, need: 1 }];
      if (p === 'flee') { const b = this.banks(W); return [
        { text: 'Encircle them: 4 soldiers on the west bank', ref: 'Alma 43:52', have: Math.min(4, b.west), need: 4 },
        { text: 'and 4 on the east bank, near where they gather', ref: 'Alma 43:52', have: Math.min(4, b.east), need: 4 }]; }
      return [{ text: 'Lamanites spared by a covenant of peace (★★★ at ' + Math.ceil(this.hostTotal / 4) + ')', ref: 'Alma 44:15, 20', have: W.stats.spared, need: Math.ceil(this.hostTotal / 4) }];
    },
    marchOrder(u) {
      u.way = Math.min(u.way || 1, SD.ROUTE.length - 1);
      const [x, y] = SD.ROUTE[u.way];
      return { type: 'move', goal: around({ x, y }, 1), near: true, way: u.way };
    },
    power(W) {
      const f = this.flags;
      if (this.phase === 'ready' && this.hiddenReady(W)) return { id: 'come', label: 'Hidden and ready: let them come', ref: 'Alma 43:33' };
      if (this.phase === 'march' && f.crossing && !f.lehi) return { id: 'lehi', label: 'Now, Lehi: fall on their rear!', ref: 'Alma 43:35' };
      const left = this.host.filter(u => alive(u) && !u.surrendered);
      if (['march', 'rout', 'west', 'dragons'].includes(this.phase) && !f.moroni && left.filter(westOfRiver).length >= left.length / 3) return { id: 'moroni', label: 'Moroni: fall upon them!', ref: 'Alma 43:41' };
      if (this.phase === 'dragons' && f.shrink && !f.liberty) return { id: 'liberty', label: 'Remember your liberty!', ref: 'Alma 43:48–49' };
      return null;
    },
    usePower(W, id) {
      const f = this.flags, foes = W.units('r').filter(u => !u.surrendered);
      const charge = list => { for (const s of list) { const t = foes.slice().sort((a, b) => dist(a, s) - dist(b, s))[0]; if (t) W.order(s, { type: 'attack', target: t.id }); } };
      if (id === 'come') { this.comeAt = W.t; return; }
      if (id === 'lehi') {
        f.lehi = true;
        charge(W.soldiers().filter(s => inRect(s, SD.COVER[0]) || s.def === D.UNITS.lehi));
        W.msg('Lehi leads his army forth and encircles them about on the east, in their rear.', 'Alma 43:35', 'good');
        W.msg('The Lamanites turn about and begin to contend with the army of Lehi.', 'Alma 43:36', 'warn');
        for (const u of foes) if (u.mode === 'march') u.mode = 'fight';
      }
      if (id === 'moroni') {
        f.moroni = true;
        charge(W.soldiers().filter(s => westOfRiver(s)));
        W.msg('Moroni and his army meet the Lamanites in the valley, on the other side of the river Sidon.', 'Alma 43:41', 'good');
      }
      if (id === 'liberty') {
        f.liberty = true;
        W.boost.r = 1; W.shield.r = 1; W.boost.p = 1.3; this.boostEnds = W.t + 60;
        for (const s of W.soldiers()) if (s.order.type === 'move') W.order(s, { type: 'idle' });   // no more falling back
        W.msg('Moroni inspires their hearts with “the thoughts of their lands, their liberty, yea, their freedom from bondage.”', 'Alma 43:48', 'good');
        W.msg('“They cried with one voice unto the Lord their God, for their liberty and their freedom from bondage.” The Lamanites flee to the waters of Sidon.', 'Alma 43:49–50', 'good');
        this.phase = 'flee';
        for (const u of foes) { u.mode = 'flee'; u.noAuto = true; W.order(u, { type: 'move', goal: around(SD.GATHER, 1), near: true, gather: true }); }
        W.msg('Now surround them on both sides of the river, and they will be in your hands. Only soldiers you send will strike them.', 'Alma 43:51–52', 'tip');
      }
    },
    markers(W) {
      const f = this.flags;
      if (this.phase === 'seek') return [f.alma ? null : { x: SD.ALMA.x, y: SD.ALMA.y, label: 'Alma' }, f.spies ? null : { x: SD.TRACKS.x, y: SD.TRACKS.y, label: 'Where they went' }].filter(Boolean);
      if (this.phase === 'flee') return [{ x: SD.GATHER.x, y: SD.GATHER.y, label: 'Surround them here, on both banks' }];
      return [];
    },
    update(W, dt) {
      const f = this.flags;
      if (!alive(this.manti)) return this.finish(W, false, 'Manti has fallen.');
      if (!W.soldiers().length) return this.finish(W, false, 'Moroni\'s armies are gone.');
      if (!alive(this.jershon) && !f.jershonLost) { f.jershonLost = true; W.msg('The Lamanites have taken Jershon.', null, 'warn'); }
      if (this.boostEnds && W.t >= this.boostEnds) { W.boost.p = 1; this.boostEnds = 0; }
      while (this.story.length && W.t >= this.story[0][0]) this.story.shift()[1](W);
      if ((this.check -= dt) > 0) return;
      this.check = 0.5;
      if (this.phase === 'ready' && W.t >= this.comeAt) this.startMarch(W);
      const foes = W.units('r').filter(u => !u.surrendered), host = this.host.filter(alive).filter(u => !u.surrendered);
      if (this.phase === 'arm' && W.armor && this.count(W, u => !u.def.hero) >= 16) {
        this.phase = 'seek';
        W.msg('The Lamanites see the Nephites\' armor, and are “exceedingly afraid” though they are many more.', 'Alma 43:21', 'warn');
        W.msg('They leave Antionum and go round about in the wilderness, thinking Moroni won\'t know where they have gone.', 'Alma 43:22', 'warn');
        W.msg('Send spies to watch them, and messengers to Alma to ask the Lord where they will go. The gold rings show where.', 'Alma 43:23', 'tip');
        W.noGo = [];
        for (const u of this.host) { u.mode = 'flee'; W.order(u, { type: 'move', goal: around(SD.TRACKS, 1), near: true, leave: true }); }
        this.camp.untouchable = false; W.remove(this.camp);
      }
      if (this.phase === 'seek') {
        const ps = W.units('p').filter(u => u.type !== 'villager');
        if (!f.spies && ps.some(u => nearTile(u, SD.TRACKS, 5))) { f.spies = true; W.msg('The spies find where they went: round about in the wilderness, away from Jershon.', 'Alma 43:23', 'good'); }
        if (!f.alma && ps.some(u => nearTile(u, SD.ALMA, 3))) {
          f.alma = true;
          W.msg('“The word of the Lord came unto Alma”: the Lamanites are marching round about in the wilderness, to come over into the land of Manti.', 'Alma 43:24');
        }
        if (f.spies && f.alma) {
          this.phase = 'ready'; this.comeAt = W.t + 240;
          W.route = SD.ROUTE; W.cover = SD.COVER.map(c => Object.assign({}, c));
          W.msg('Moroni finds by his spies which course they will take. Leave part of the army in Jershon, and take the rest to Manti.', 'Alma 43:25, 30', 'tip');
          W.msg('Hide one army south of the hill Riplah with Lehi, and the rest in the west valley with Moroni. A hidden army holds still until you give the order.', 'Alma 43:31–32', 'tip');
        }
      }
      // The people of that quarter gather to battle (43:26).
      for (const v of this.villages) {
        if (v.state !== 'waiting' || !W.units('p').some(u => dist(u, v) < 4.5 * TILE)) continue;
        v.state = 'gone';
        for (let i = 0; i < 2; i++) { const [x, y] = W.freeTileNear(v.tx + 1, v.ty + 3, 'p'); W.addUnit('spearman', 'p', center(x), center(y)); }
        W.msg(`The people of ${v.name} gather themselves together to battle, to defend their lands.`, 'Alma 43:26', 'good');
      }
      if (this.phase === 'march') {
        const cx = host.reduce((a, u) => a + u.x, 0) / Math.max(1, host.length) / TILE;
        if (!f.crossing && host.some(u => u.mode === 'march' && tileOf(u.x) <= SD.river(tileOf(u.y)) + 1) && cx < SD.river(24) + 7) {
          f.crossing = true;
          W.msg('They have passed the hill Riplah and come into the valley, and begin to cross the river Sidon. Now!', 'Alma 43:35', 'warn');
        }
        if (this.hostTotal - host.length >= Math.ceil(this.hostTotal * 0.2)) {
          this.phase = 'rout'; this.routAt = W.t;
          W.msg('The Lamanites become frightened and flee toward the river Sidon, and cross its waters. Lehi keeps his armies on the bank.', 'Alma 43:39–40', 'good');
          for (const u of host) { u.mode = 'flee'; W.order(u, { type: 'move', goal: around({ x: SD.GATHER.x - 3, y: SD.GATHER.y + 1 }, 1), near: true, rout: true }); }
        }
      }
      if (this.phase === 'rout' && (W.t - this.routAt > 25 || host.every(u => westOfRiver(u) || u.order.type !== 'move'))) {
        this.phase = 'west'; this.westAt = W.t;
        for (const u of host) { u.mode = 'march'; u.way = SD.ROUTE.findIndex(([x, y]) => x < SD.river(y)); W.order(u, this.marchOrder(u)); }
      }
      if (this.phase === 'west' && W.t - this.westAt > 2) {
        this.phase = 'dragons'; this.dragonsAt = W.t;
        W.boost.r = 1.35; W.shield.r = 0.75;
        W.msg('Now the Lamanites fight with great strength and courage: “they did fight like dragons.”', 'Alma 43:43–44', 'warn');
      }
      if (this.phase === 'dragons') {
        if (!f.shrink && W.t - this.dragonsAt > 4) {
          f.shrink = true;
          W.msg('The men of Moroni are “about to shrink and flee from them.” Remind them what they fight for!', 'Alma 43:48', 'warn');
        }
        // Soldiers far from Moroni lose heart and fall back, a few at a time.
        if (f.shrink && !f.liberty && (this.shrinkAt || 0) <= W.t) {
          this.shrinkAt = W.t + 4;
          const moroni = W.soldiers().find(s => s.def === D.UNITS.moroni);
          W.soldiers().filter(s => !s.def.hero && s.order.type === 'attack' && (!moroni || dist(s, moroni) > D.UNITS.moroni.aura)).slice(0, 2).forEach(s => {
            const t = W.ents.get(s.order.target), dx = t ? s.x - t.x : 1, dy = t ? s.y - t.y : 0, d = Math.hypot(dx, dy) || 1;
            W.order(s, { type: 'move', tx: tileOf(s.x + dx / d * 5 * TILE), ty: tileOf(s.y + dy / d * 5 * TILE) });
          });
        }
      }
      if (this.phase === 'flee') {
        for (const u of host) if (u.mode === 'flee' && u.order.type !== 'move') u.mode = 'cornered';
        const b = this.banks(W);
        if (b.west >= 4 && b.east >= 4) this.startParley(W, host);
      }
      if (this.phase === 'fight2' && (host.length <= this.remainAt / 2 || (alive(this.zera) && this.zera.hp < this.zera.def.hp * 0.45))) {
        this.phase = 'peace';
        W.truce = true;
        W.msg('Zerahemnah cries mightily unto Moroni, “promising that he would covenant and also his people with them,” if they will spare the rest.', 'Alma 44:19', 'good');
        W.msg('Moroni causes that the work of death should cease. They enter into a covenant of peace, and are suffered to depart into the wilderness.', 'Alma 44:20', 'good');
        for (const u of W.units('r').filter(u => !u.surrendered)) this.covenant(W, u);    // the band at Jershon too
      }
      // Everyone gone from the field: in battle, or in peace.
      if (['march', 'rout', 'west', 'dragons', 'flee', 'fight2', 'peace'].includes(this.phase) && !W.units('r').some(u => !u.surrendered) && !W.units('x').length) {
        W.msg('The armies of Moroni return to their houses and their lands.', 'Alma 44:23', 'good');
        this.finish(W, true);
      }
    },
    startMarch(W) {
      this.phase = 'march';
      this.host = [];
      let k = 0;
      for (const [type, n] of this.hostList) for (let i = 0; i < n; i++, k++) {
        const [x, y] = W.freeTileNear(SD.ROUTE[0][0] - Math.floor(k / 5), SD.ROUTE[0][1] - 2 + (k % 5), 'r');
        const u = W.addUnit(type, 'r', center(x), center(y), { mode: 'march', way: 1, spare: type === 'zerahemnah' });
        if (type === 'zerahemnah') this.zera = u;
        this.host.push(u); W.order(u, this.marchOrder(u));
      }
      W.msg('The Lamanites come out of the wilderness, on the north of the hill Riplah.', 'Alma 43:34', 'warn');
      // "Lest by any means a part of the Lamanites should come into that land" (43:25).
      if (this.guards(W) < 4) {
        this.flags.raided = true;
        for (let i = 0; i < 7; i++) {
          const [x, y] = W.freeTileNear(62 - (i % 3), 1 + Math.floor(i / 3), 'r');
          W.addUnit(i < 5 ? 'lamanite' : 'slinger', 'r', center(x), center(y), { mode: 'raid' });
        }
        W.msg('Jershon was left with too few guards, and a band of Lamanites comes against it.', 'Alma 43:25', 'warn');
      }
    },
    startParley(W, host) {
      this.phase = 'parley';
      W.truce = true; W.boost.r = 1;
      for (const s of W.units('p')) if (s.def.soldier) W.order(s, { type: 'idle' });
      for (const u of host) { u.mode = 'cornered'; W.order(u, { type: 'idle' }); }
      const at = W.t, say = (dt, fn) => this.story.push([at + dt, fn]);
      W.msg('They are encircled on both sides of the river, and are struck with terror. Moroni commands his men “that they should stop shedding their blood.”', 'Alma 43:53–54', 'good');
      say(4, W => W.msg('Moroni: “Behold, Zerahemnah, that we do not desire to be men of blood.”', 'Alma 44:1'));
      say(9, W => W.msg('“Deliver up your weapons of war unto us, and we will seek not your blood, … if ye will go your way and come not again to war against us.”', 'Alma 44:6'));
      say(15, W => W.msg('Zerahemnah gives up his sword, but will not take an oath: “it is your breastplates and your shields that have preserved you.”', 'Alma 44:8–9', 'warn'));
      say(21, W => W.msg('Moroni gives back the weapons: “ye shall not depart except ye depart with an oath that ye will not return again against us to war.”', 'Alma 44:10–11'));
      say(27, W => W.msg('Zerahemnah rushes at Moroni, but “one of Moroni\'s soldiers smote it even to the earth, and it broke by the hilt.”', 'Alma 44:12', 'warn'));
      say(32, W => {
        const list = this.host.filter(alive).filter(u => !u.surrendered && !u.def.leader);
        const go = list.slice(0, Math.ceil(list.length * 0.55));
        for (const u of go) this.covenant(W, u);
        W.msg('Many throw down their weapons of war at the feet of Moroni, and enter into a covenant of peace, and depart into the wilderness.', 'Alma 44:15', 'good');
      });
      say(37, W => {
        this.phase = 'fight2';
        W.truce = false;
        const rest = this.host.filter(alive).filter(u => !u.surrendered);
        this.remainAt = rest.length;
        for (const u of rest) if (u.mode !== 'withdrawn') { u.mode = 'fight'; u.noAuto = false; }
        W.msg('Zerahemnah stirs up the rest to anger, and Moroni commands his people to fall upon them.', 'Alma 44:16–17', 'warn');
      });
    },
    covenant(W, u) {
      u.surrendered = true; u.untouchable = true; u.team = 'x';
      W.order(u, { type: 'move', goal: { x0: 62, y0: 8, x1: 63, y1: 12 }, near: false, depart: true });
    },
    onArrive(W, u) {
      const o = u.order;
      if (o.leave) { W.remove(u); return true; }
      if (o.depart) { W.stats.spared++; W.remove(u); return true; }
      if (o.gather || o.rout) { W.order(u, { type: 'idle' }); return true; }
      if (o.way != null) {
        if (++u.way < SD.ROUTE.length) W.order(u, this.marchOrder(u));
        else { u.mode = 'fight'; W.order(u, { type: 'attack', target: this.manti.id }); }
        return true;
      }
      return false;
    },
    foeBrain: sidonBrain,
    finish(W, won, why) {
      if (W.over) return;
      const spared = W.stats.spared, safe = !this.flags.jershonLost;
      W.over = won
        ? { won: true, stars: 1 + (safe ? 1 : 0) + (spared >= this.hostTotal / 4 ? 1 : 0),
            title: 'They depart in peace',
            text: '“Behold, Zerahemnah, that we do not desire to be men of blood.”', ref: 'Alma 44:1',
            detail: `${spared} of the Lamanites made a covenant of peace and went into the wilderness. Jershon ${safe ? 'was kept safe' : 'was taken'}.`,
            next: 'Coming next: Moroni raises the title of liberty (Alma 46).' }
        : { won: false, title: why || 'The Lamanites prevailed', text: 'Hide your armies where the Lord showed Alma they would come, and wait to strike until they cross the river.', ref: null };
    }
  };

  // ------------------------------------------------ Free battle

  // Build a city from nothing and tear down the Lamanite war camp: Red Alert's
  // way of playing, with the Book of Mormon's buildings and troops.
  const FR = D.FREE;
  // The camp's difficulty (camp.js): how many bearers it keeps hauling, what it starts with, when it may first march,
  // how long at most between marches, how big an army it gathers before marching (and how much bigger each time),
  // and how long a tent it loses waits before going up again.
  const LEVELS = {
    // (Their shields and breastplates now come from the shield-makers' tent, so the armor here is only what they start with.)
    easy:   { name: 'Easy',   first: 360, every: 150, bearers: 3, start: { grain: 150, timber: 150 }, march: 6,  marchGrow: 1, rebuild: 240, stars: 1, guards: 8,  campGuards: 3, towers: 1, strength: 1.1,  armor: 0, fierce: 0.05 },
    normal: { name: 'Normal', first: 300, every: 130, bearers: 5, start: { grain: 250, timber: 250 }, march: 8,  marchGrow: 2, rebuild: 180, stars: 2, guards: 14, campGuards: 5, towers: 3, strength: 1.25, armor: 0, fierce: 0.08 },
    hard:   { name: 'Hard',   first: 270, every: 115, bearers: 7, start: { grain: 350, timber: 350, stone: 50 }, march: 10, marchGrow: 3, rebuild: 120, stars: 3, guards: 18, campGuards: 6, towers: 3, strength: 1.35, armor: 1, fierce: 0.1 }
  };

  // The Lamanites: guards keep near home; the rest go for your nearest building.
  function freeBrain(W, u) {
    const o = u.order;
    if (o.type === 'attack') {
      const t = W.ents.get(o.target);
      if (alive(t)) {
        if (t.kind === 'building') { const e = W.enemiesNear(u, 'r', 90, true); if (e) W.order(u, { type: 'attack', target: e.id, then: o }); }
        else if (u.home && dist(t, u.home) > 11 * TILE) W.order(u, { type: 'move', goal: W.rectOf(u.home), near: true });   // guards don't chase far
        return;
      }
    }
    if (u.mode === 'guard' || u.mode === 'muster') {
      const e = W.enemiesNear(u, 'r', 200, true);
      if (e && (!u.home || dist(e, u.home) < 10 * TILE)) W.order(u, { type: 'attack', target: e.id });
      else if (u.home && alive(u.home) && o.type === 'idle' && dist(u, u.home) > 5 * TILE) W.order(u, { type: 'move', goal: W.rectOf(u.home), near: true });
      else if (u.home && !alive(u.home)) u.mode = 'attack';
      return;
    }
    const e = W.enemiesNear(u, 'r', u.def.sight, true);
    if (e) { if (o.type !== 'attack' || o.target !== e.id) W.order(u, { type: 'attack', target: e.id }); return; }
    const bs = W.buildings('p'), list = bs.filter(b => !b.def.wall).length ? bs.filter(b => !b.def.wall) : bs;
    let best = null, bd = Infinity;
    for (const b of list) { const d = dist(u, b); if (d < bd) { bd = d; best = b; } }
    if (!best) { const p = W.units('p').sort((a, b) => dist(a, u) - dist(b, u))[0]; best = p || null; }
    if (best && (o.type !== 'attack' || o.target !== best.id)) W.order(u, { type: 'attack', target: best.id });
  }

  const free = {
    id: 'free', campaign: 'free', title: 'Free battle', chapter: 'Any chapter you have read', free: true, map: D.buildFreeMap,
    year: 'In the days of Captain Moroni', level: 'normal', LEVELS,
    goals: 'Plant the standard of liberty, build up your city, and tear down the Lamanite war camp and its three camps.',
    starsText: '★ won on Easy, ★★ on Normal, ★★★ on Hard.',
    briefing: [
      ['Moroni "planted the standard of liberty among the Nephites," and fortified the land against the Lamanites.', 'Alma 46:36'],
      ['Plant yours on open ground, and your city begins. Tap the city to build, and buildings rise on their own. Carts bring in grain and timber; farms feed your people; granaries and storehouses hold what comes in.', null],
      ['The barracks trains spearmen and slingers; the armory opens swordsmen, archers and armor; the stables, horse carts; the hall of the captains, javelin throwers and stripling warriors.', null],
      ['These Lamanites have "prepared themselves with shields, and with breastplates" too.', 'Alma 49:6']
    ],
    setup(W) {
      const L = LEVELS[this.level];
      W.tech = true; W.border = null;
      W.res = { grain: 200, timber: 250, stone: 50 };
      // By Moroni's later wars the Lamanites "prepared themselves with shields, and with breastplates" (Alma 49:6).
      W.boost.r = L.strength; W.foeArmor = L.armor;
      const put = (type, x, y, team, extra) => { const [fx, fy] = W.freeTileNear(x, y, team || 'p'); return W.addUnit(type, team || 'p', center(fx), center(fy), extra); };
      const S0 = FR.START;
      this.standard = put('standard', S0.x + 2, S0.y + 2);
      put('cart', S0.x, S0.y + 5); put('cart', S0.x + 3, S0.y + 5); put('worker', S0.x + 1, S0.y + 6); put('worker', S0.x + 2, S0.y + 6);
      put('spearman', S0.x + 5, S0.y); put('spearman', S0.x + 6, S0.y + 1); put('nslinger', S0.x + 5, S0.y + 2);
      this.warcamp = W.addBuilding('warcamp', 'r', FR.WARCAMP.x, FR.WARCAMP.y, true);
      // A palisade round the war camp, with a gap on the south side where the armies come out. Ladders and cords, or the earthquake, get you over it.
      { const x0 = this.warcamp.tx - 2, y0 = this.warcamp.ty - 2, x1 = this.warcamp.tx + this.warcamp.w + 1, y1 = this.warcamp.ty + this.warcamp.h + 1;
        for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
          if (x !== x0 && x !== x1 && y !== y0 && y !== y1) continue;
          if (y === y1 && (x === this.warcamp.tx + 1 || x === this.warcamp.tx + 2)) continue;
          if (W.whyNotPlace('wall', x, y) === 'ground') continue;
          W.addBuilding('wall', 'r', x, y, true);
        } }
      this.camps = FR.CAMPS.map(c => W.addBuilding('camp', 'r', c.x, c.y, true, { name: 'Lamanite camp', about: 'Lamanite warriors gather here to march on your city.' }));
      const guard = (home, list) => { let k = 0; for (const [type, n] of list) for (let i = 0; i < n; i++, k++) put(type, home.tx + (k % 4), home.ty + home.h + Math.floor(k / 4), 'r', { mode: 'guard', home }); };
      this.guardList = [['lamanite', Math.ceil(L.guards * 0.6)], ['slinger', Math.floor(L.guards * 0.3)], ['amalekite', 1], ['zoramite', L.stars > 1 ? 1 : 0]];
      guard(this.warcamp, this.guardList);
      for (const c of this.camps) guard(c, [['lamanite', Math.ceil(L.campGuards * 0.6)], ['slinger', Math.floor(L.campGuards * 0.4)]]);
      // Their own watchtowers, round the war camp.
      // Jaredite ruins, each holding something (Mosiah 8:8-11): the sword of Laban far to the south-east, the Liahona across the ford, breastplates in the north-west.
      for (const [x, y, key] of [[54, 45, 'sword'], [37, 24, 'liahona'], [7, 7, 'breastplate']]) {
        let spot = null;
        for (let r = 0; r < 6 && !spot; r++) for (let dy = -r; dy <= r && !spot; dy++) for (let dx = -r; dx <= r && !spot; dx++) if (W.whyNotPlace('relic', x + dx, y + dy) !== 'ground') spot = [x + dx, y + dy];
        if (!spot) continue;
        for (let yy = spot[1] - 1; yy <= spot[1] + 2; yy++) for (let xx = spot[0] - 1; xx <= spot[0] + 2; xx++) if (W.tile(xx, yy) === T.GRASS) W.setTile(xx, yy, T.RUIN);
        W.addBuilding('relic', 'n', spot[0], spot[1], true, { artifact: key });
      }
      this.foretold = 0;
      const spots = [[-4, 2], [7, 2], [1, 8]];
      for (let i = 0; i < L.towers; i++) {
        const [dx, dy] = spots[i];
        const [x, y] = W.freeTileNear(this.warcamp.tx + dx, this.warcamp.ty + dy, 'r');
        if (W.whyNotPlace('tower', x, y) !== 'ground') W.addBuilding('tower', 'r', x, y, true);   // theirs: reach is the Nephites' rule
      }
      this.planted = false; this.nextFierce = 300;
      // The camp's mind (camp.js): bearers haul, tents go up, an army gathers and marches, and what falls goes up again.
      W.side('r').res = { grain: L.start.grain, timber: L.start.timber, stone: L.start.stone || 0 };
      put('bearer', this.warcamp.tx + 1, this.warcamp.ty + this.warcamp.h, 'r'); put('bearer', this.warcamp.tx + 2, this.warcamp.ty + this.warcamp.h, 'r');
      this.camp = new CAMP.Camp(W, 'r', this.warcamp, L);
      W.msg('Choose the standard of liberty and plant it on open ground to begin your city.', 'Alma 46:36', 'tip');
      W.msg('Tap your city to build. Carts bring in grain and timber, and stone from a rock face when you ask; farms feed your people. The Lamanites will come: build a barracks.', null, 'tip');
    },
    timeLeft(W) { return null; },
    // What has gathered at the war camp, for one who holds the interpreters (Mosiah 8:17).
    nextAttack(W) { return this.camp ? this.camp.forecast() : ''; },
    objectives(W) {
      return [
        { text: 'Plant the standard of liberty', ref: 'Alma 46:36', have: this.planted ? 1 : 0, need: 1 },
        { text: 'Tear down the Lamanite camps', ref: null, have: this.camps.filter(c => !alive(c)).length, need: this.camps.length },
        { text: 'Tear down the Lamanite war camp (it sends more guards while it stands)', ref: null, have: alive(this.warcamp) ? 0 : 1, need: 1 }
      ];
    },
    update(W) {
      const L = LEVELS[this.level];
      if (!this.planted && W.stronghold()) this.planted = true;
      // The camp's mind: bearers, tents, the army. With the interpreters, warning as it gathers (Mosiah 8:17).
      if (alive(this.warcamp)) {
        this.camp.update();
        const r = this.camp.readiness();
        if (W.artifacts.interpreters && r >= 0.7 && this.foretold < this.camp.marches + 1) { this.foretold = this.camp.marches + 1; W.msg(`The interpreters show what gathers at the war camp: ${this.camp.forecast()}.`, 'Mosiah 8:17', 'warn'); }
        this.phaseLabel = r >= 0.7 ? 'Lamanites ready' : 'Lamanites gather';
      } else this.phaseLabel = '';
      if (W.t >= this.nextFierce) { this.nextFierce = W.t + 300; W.boost.r = Math.min(L.strength + 0.3, W.boost.r + L.fierce); }
      if (!alive(this.warcamp) && !this.camps.some(alive)) return this.finish(W, true);
      const standing = W.buildings('p').length || W.units('p').some(u => u.def.deploys);
      if (!standing) this.finish(W, false);
    },
    onDestroy(W, b) { if (this.camp) this.camp.noteLost(b); },
    foeBrain: freeBrain,
    finish(W, won) {
      if (W.over) return;
      const L = LEVELS[this.level], m = Math.floor(W.t / 60);
      W.over = won
        ? { won: true, stars: L.stars, title: 'The war camp is torn down',
            text: '“And thus Moroni planted the standard of liberty among the Nephites.”', ref: 'Alma 46:36',
            detail: `Won on ${L.name} in ${m} minutes.` }
        : { won: false, title: 'Your city has fallen', text: 'Build farms and a barracks early, and walls with watchtowers on the side the attacks come from.', ref: null };
    }
  };

  // ------------------------------------------------ Out of the Wilderness

  // Build a city in an open valley and hold off the raids that come down out
  // of the wilderness by four ways in, bigger each time. Free battle's
  // buildings and troops; no camp to tear down, only the raids to outlast.
  const WD = D.WILD;
  const WILD_LEVELS = {
    easy:   { name: 'Easy',   first: 300, every: 170, warn: 90, mult: 0.7, stars: 1, strength: 1,    armor: 0 },
    normal: { name: 'Normal', first: 240, every: 150, warn: 70, mult: 1,   stars: 2, strength: 1.15, armor: 1 },
    hard:   { name: 'Hard',   first: 200, every: 130, warn: 55, mult: 1.3, stars: 3, strength: 1.3,  armor: 2 }
  };
  const WILD_LENGTHS = {
    short: { name: 'Short', raids: 5, about: '5 raids, about 15 minutes' },
    long:  { name: 'Long', raids: 10, about: '10 raids, about 30 minutes' }
  };
  // Raid k of n. Robbers mostly; every third raid, and the last, brings a
  // Lamanite army with them. From the fourth they come two ways at once,
  // from the eighth three, and the armies bring armored captains.
  function raidPlan(k, n, L, rand) {
    const army = k % 3 === 0 || k === n;
    const size = Math.max(2, Math.round((2.5 + 1.5 * k) * L.mult));
    const ways = Math.min(3, 1 + (k >= 4 ? 1 : 0) + (k >= 8 ? 1 : 0));
    const order = WD.WAYS.map((_, i) => i);
    for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
    const groups = [];
    for (let g = 0; g < ways; g++) {
      const share = Math.max(2, Math.round(size / ways));
      const list = army && g === 0
        ? [['lamanite', Math.ceil(share * 0.6)], ['slinger', Math.floor(share * 0.4)], ['amalekite', k >= 5 ? 1 : 0], ['zoramite', k >= 8 ? 1 : 0]]
        : [['robber', Math.ceil(share * 0.7)], ['robberArcher', Math.floor(share * 0.3)]];
      groups.push({ way: order[g], list: list.filter(([, m]) => m > 0) });
    }
    return { k, army, groups, count: groups.reduce((a, g) => a + g.list.reduce((b, [, m]) => b + m, 0), 0) };
  }
  // A watchtower of yours stands near this way in, and sees what gathers there.
  const watched = (W, way) => W.buildings('p', 'tower').some(t => t.built >= 1 && Math.hypot(t.x - center(way.x), t.y - center(way.y)) < 16 * TILE);
  const waysOf = plan => plan.groups.map(g => WD.WAYS[g.way].name).join(' and ');

  // Raiders: whoever of yours is near, then, for robbers, the farms and stores
  // first, as raiders took "the corn of their fields" (Mosiah 9:14); else the nearest building.
  function wildBrain(W, u) {
    const o = u.order;
    if (o.type === 'attack') {
      const t = W.ents.get(o.target);
      if (alive(t) && !t.untouchable) {
        if (t.kind === 'building') { const e = W.enemiesNear(u, 'r', 90, true); if (e) W.order(u, { type: 'attack', target: e.id, then: o }); }
        return;
      }
    }
    const e = W.enemiesNear(u, 'r', u.def.sight, true);
    if (e) { if (o.type !== 'attack' || o.target !== e.id) W.order(u, { type: 'attack', target: e.id }); return; }
    const bs = W.buildings('p').filter(b => !b.def.wall);
    const stores = u.type.startsWith('robber') ? bs.filter(b => b.type === 'farm' || b.type === 'granary' || b.type === 'storehouse') : [];
    const list = stores.length ? stores : bs.length ? bs : W.buildings('p').length ? W.buildings('p') : W.units('p');
    let best = null, bd = Infinity;
    for (const b of list) { const d = dist(u, b); if (d < bd) { bd = d; best = b; } }
    if (best && (o.type !== 'attack' || o.target !== best.id)) W.order(u, { type: 'attack', target: best.id });
  }

  const wild = {
    id: 'wild', campaign: 'wild', title: 'Out of the Wilderness', chapter: 'Any chapter you have read', free: true, map: D.buildWildMap,
    year: 'In the days of the robbers of Gadianton', level: 'normal', length: 'short', LEVELS: WILD_LEVELS, LENGTHS: WILD_LENGTHS,
    kicker() { return 'Out of the Wilderness · ' + WILD_LEVELS[this.level].name + ' · ' + WILD_LENGTHS[this.length].name; },
    goals: 'Plant the standard of liberty, build up your city, and hold off the raids that come down out of the wilderness.',
    starsText: '★ held on Easy, ★★ on Normal, ★★★ on Hard.',
    briefing: [
      ['The robbers "began to come down and to sally forth from the hills, and out of the mountains, and the wilderness".', '3 Nephi 4:1'],
      ['Plant the standard of liberty and build your city. Farms feed your people; walls and watchtowers keep them.', null],
      ['Lachoneus set guards "round about to watch them, and to guard them from the robbers day and night".', '3 Nephi 3:14'],
      ['Moroni put "the greater number of men" where the fortifications were weakest.', 'Alma 48:9'],
      ['Raiders come by four ways: the two passes through the mountains, the western wilderness, and the river fords. You hear which way before they come, and sooner if one of your watchtowers stands near it.', null]
    ],
    setup(W) {
      const L = WILD_LEVELS[this.level];
      W.tech = true; W.border = null;
      W.res = { grain: 200, timber: 250, stone: 50 };
      W.boost.r = L.strength; W.foeArmor = L.armor;
      const put = (type, x, y) => { const [fx, fy] = W.freeTileNear(x, y, 'p'); return W.addUnit(type, 'p', center(fx), center(fy)); };
      const S0 = WD.START;
      this.standard = put('standard', S0.x + 2, S0.y + 2);
      put('cart', S0.x, S0.y + 5); put('cart', S0.x + 3, S0.y + 5); put('worker', S0.x + 1, S0.y + 6); put('worker', S0.x + 2, S0.y + 6);
      put('spearman', S0.x + 5, S0.y); put('spearman', S0.x + 6, S0.y + 1); put('nslinger', S0.x + 5, S0.y + 2);
      this.raids = WILD_LENGTHS[this.length].raids;
      this.raid = 0;                     // raids that have come down
      this.nextAt = L.first;             // when the next one comes
      this.coming = null;                // the next raid, once it's gathering: { plan, warned }
      this.bands = [];                   // each raid's raiders: [{ k, units, done }]
      this.beaten = 0; this.lost = 0; this.planted = false;
      // Where each way's raiders appear: ground near it that leads down into the valley, nearest first.
      const open = (x, y) => W.passable(x, y, 'r'), key = (x, y) => y * D.MAP_W + x;
      const valley = new Set([key(S0.x, S0.y)]), q = [[S0.x, S0.y]];
      while (q.length) { const [x, y] = q.pop(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (open(x + dx, y + dy) && !valley.has(key(x + dx, y + dy))) { valley.add(key(x + dx, y + dy)); q.push([x + dx, y + dy]); } }
      this.spawns = WD.WAYS.map(w => {
        const out = [], seen = new Set([key(w.x, w.y)]), wq = [[w.x, w.y]];
        while (wq.length && out.length < 30) {
          const [x, y] = wq.shift();
          if (valley.has(key(x, y))) out.push([x, y]);
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (open(nx, ny) && !seen.has(key(nx, ny)) && Math.max(Math.abs(nx - w.x), Math.abs(ny - w.y)) <= 6) { seen.add(key(nx, ny)); wq.push([nx, ny]); } }
        }
        return out.length ? out : [[w.x, w.y]];
      });
      W.msg('Choose the standard of liberty and plant it on open ground to begin your city.', 'Alma 46:36', 'tip');
      W.msg(`Robbers will come down out of the wilderness: ${this.raids} raids, bigger each time. Build a barracks, then walls and watchtowers on the ways in.`, null, 'tip');
    },
    get phaseLabel() {
      if (!this.raids) return '';
      return this.raid < this.raids ? `Raid ${this.raid + 1} of ${this.raids} comes in` : 'The last raid: hold on';
    },
    timeLeft(W) { return this.raid < this.raids ? Math.max(0, this.nextAt - W.t) : null; },
    // Where the next raid is gathering, once it's been seen.
    markers(W) {
      if (!this.coming || !this.coming.warned) return [];
      return this.coming.plan.groups.map(g => { const w = WD.WAYS[g.way]; return { x: w.x, y: w.y, label: 'Raiders gathering', always: true }; });
    },
    objectives(W) {
      return [
        { text: 'Plant the standard of liberty', ref: 'Alma 46:36', have: this.planted ? 1 : 0, need: 1 },
        { text: 'Hold off the raids', ref: '3 Nephi 4:1', have: this.beaten, need: this.raids },
        { text: 'Watchtowers by the ways in: they see raids coming sooner', ref: '3 Nephi 3:14', have: WD.WAYS.filter(w => watched(W, w)).length, need: WD.WAYS.length, optional: true }
      ];
    },
    update(W) {
      const L = WILD_LEVELS[this.level];
      if (!this.planted && W.stronghold()) this.planted = true;
      // The next raid gathers in the wilderness: a watchtower near its way in sees it half a minute sooner.
      if (this.raid < this.raids && !this.coming && W.t >= this.nextAt - L.warn - 30) this.coming = { plan: raidPlan(this.raid + 1, this.raids, L, W.rand), warned: false };
      if (this.coming && !this.coming.warned) {
        const seen = this.coming.plan.groups.some(g => watched(W, WD.WAYS[g.way]));
        if (W.t >= this.nextAt - L.warn - (seen ? 30 : 0)) {
          this.coming.warned = true;
          const p = this.coming.plan, who = p.army ? 'Robbers and a Lamanite army are' : 'Robbers are';
          W.msg(seen ? `Your watchtower sees ${p.count} raiders gathering at ${waysOf(p)}.` : `${who} gathering at ${waysOf(p)}!`, '3 Nephi 4:1', 'warn');
        }
      }
      if (this.coming && W.t >= this.nextAt) {
        const p = this.coming.plan, units = [];
        for (const g of p.groups) {
          const w = WD.WAYS[g.way];
          const spots = this.spawns[g.way];
          let k = 0;
          for (const [type, m] of g.list) for (let i = 0; i < m; i++, k++) {
            const [x, y] = spots[k % spots.length];
            units.push(W.addUnit(type, 'r', center(x), center(y), { mode: 'raid', raid: p.k }));
          }
        }
        this.bands.push({ k: p.k, units, done: false });
        this.raid++; this.coming = null; this.nextAt = W.t + L.every;
        W.msg(p.k === this.raids ? `The last and greatest raid comes down from ${waysOf(p)}: ${p.count} of them!` : `Raid ${p.k} comes down from ${waysOf(p)}: ${p.count} of them!`, null, 'warn');
      }
      // Raiders who get nowhere and strike no one for a minute go back, as robbers would
      // "retreat back into the mountains, and into the wilderness" (Helaman 11:25).
      if (W.t >= (this.nextStuck || 0)) {
        this.nextStuck = W.t + 5;
        for (const b of this.bands) if (!b.done) for (const u of b.units) {
          if (!alive(u)) continue;
          const moved = !u.lastSpot || Math.hypot(u.x - u.lastSpot.x, u.y - u.lastSpot.y) > 24, struck = W.t - (u.struckAt || -99) < 6;
          u.lastSpot = { x: u.x, y: u.y };
          u.stuck = moved || struck ? 0 : (u.stuck || 0) + 5;
          if (u.stuck === 30) W.order(u, { type: 'idle' });                   // look for something else to go after
          if (u.stuck >= 60) { W.remove(u); b.fled = (b.fled || 0) + 1; }
        }
      }
      // A raid is beaten when its raiders are all gone.
      for (const b of this.bands) if (!b.done && !b.units.some(alive)) {
        b.done = true; this.beaten++;
        W.msg((b.fled ? `The last of raid ${b.k} go back into the wilderness. ` : `Raid ${b.k} is beaten back. `) + (this.beaten < this.raids ? 'Mend the walls: more will come.' : ''), b.fled ? 'Helaman 11:25' : null, 'good');
      }
      if (this.raid >= this.raids && this.bands.every(b => b.done)) return this.finish(W, true);
      if (this.planted ? !W.stronghold() : !alive(this.standard)) this.finish(W, false);
    },
    onDestroy(W, b) { if (b.team === 'p' && !b.def.wall) this.lost++; },
    foeBrain: wildBrain,
    finish(W, won) {
      if (W.over) return;
      const L = WILD_LEVELS[this.level], m = Math.floor(W.t / 60);
      W.over = won
        ? { won: true, stars: L.stars, title: 'The raids are beaten back',
            text: '“Thus he did fortify and strengthen the land.”', ref: 'Alma 48:9',
            detail: `Held off ${this.raids} raids on ${L.name} in ${m} minutes. ${this.lost ? this.lost + ' of your buildings fell.' : 'Not one of your buildings fell.'}` }
        : { won: false, title: 'Your city has fallen', text: 'Put walls and watchtowers on the ways in, and the most soldiers where the walls are weakest.', ref: 'Alma 48:9',
            detail: `You held off ${this.beaten} of ${this.raids} raids.` };
    }
  };

  // In the order of the Book of Mormon.
  const CAMPAIGNS = [
    { id: 'moroni', title: 'Captain Moroni', about: 'Alma 43 onward: Moroni defends the Nephites against Zerahemnah, Amalickiah and Ammoron.' },
    { id: 'gidgiddoni', title: 'Lachoneus and Gidgiddoni', about: '3 Nephi 3–4: the Nephites gather into one place and outlast the Gadianton robbers.' }
  ];
  const MISSIONS = [m3, m1, m2];
  const API = { MISSIONS, CAMPAIGNS, FREE_BATTLE: free, WILD: wild, robberBrain, spawnRobbers };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.LIB_MISSIONS = API;
})(this);
