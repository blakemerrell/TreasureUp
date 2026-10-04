// Ammon at Sebus (🎮 → Arcade): the king's flocks at the waters of Sebus
// (Alma 17). Robbers come to scatter the flock; Ammon stands against them
// alone, with his sword and his sling, and gathers back the sheep they scatter.
// Side view, like a fighting game, 1 player (Blake, 2026-10-04: "Street
// fighter style game. Ammon against the robbers. Protect the sheep.").
//
// Ammon can't be beaten: the king's servants said "he cannot be slain by the
// enemies of the king" (Alma 18:3). A club only stuns him for a moment. What
// can be lost is the flock: scattered sheep wander off, and when 4 of the 8
// are lost, the game is over. His sword knocks the clubs out of the robbers'
// hands and they run (the scripture says more; this is for an 11-year-old).
// Each level ends with the robbers' leader, then a question from this week.
// Moves (startStrike, mighty): a 3-hit sword combo, an overhead blow in the
// air, a counter just after a block, and a meter that, full, sends a stone
// "with mighty power" (Alma 17:36) at every robber on the field.
//
// index.html loads this file the first time the game opens, with its words in
// content/arcade.js (window.TU_ARCADE.ammon), and passes the same host as the
// other arcade games. Pictures in arcade/ammon/ (arcade/README.md). No XP: just
// for fun. A best score is kept on this device. The tests drive it step by
// step with window.TU_AMMON_MANUAL and TUAmmon._t (the end of this file).
(function () {
  'use strict';

  const T = {
    speed: 6, jump: 11, gravity: 32,          // Ammon: units a second; a jump; gravity
    strike: 0.34, strikeHit: [0.08, 0.2], reach: 1.9, push: 2.6,   // the sword: how long, when it lands, how far it reaches, how far it knocks back
    sling: 0.42, slingAt: 0.22, stoneSpeed: 15, stones: 6, stonesMax: 12,
    stun: 0.7, chiefStun: 1.1,                // a club's blow stuns, never more
    sheep: 8, lose: 4,                        // the flock, and how many lost ends the game
    flock: [2.6, 7.2],                        // where the flock grazes (units from the left)
    robberSpeed: 2.3, robberStep: 0.25, robberMax: 4.6,
    windup: 0.45, chiefWindup: 0.7, between: 2.4, shield: 8, ready: 3,
    // The moves (Blake, 2026-10-04: "What like of combos can we do?"): sword three times in a row (the
    // third a finishing blow), sword in the air (an overhead blow), sword just after a block (a counter),
    // and, with the meter full, sword and sling together (Alma 17:36's "mighty power").
    chainWin: 0.35, chainPush: 1.2, finishPush: 3.5, combo: 50, counterWin: 0.6, daze: 0.7, lunge: 22,
    power: 100, together: 0.2, flash: 0.6,
    fill: { robber: 7, chief: 20, gather: 5, counter: 6, combo: 5, right: 25 }
  };
  let STORE = 'treasureup.ammon.v1';
  let host = null, root = null, G = null, raf = 0, last = 0, off = null, audio = null;
  const keys = new Set();
  const W = () => (window.TU_ARCADE && window.TU_ARCADE.ammon) || {};
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const $ = id => document.getElementById(id);
  const manual = () => !!window.TU_AMMON_MANUAL;
  const fmt = n => Number(n || 0).toLocaleString('en-US');
  function saved() { try { return JSON.parse(localStorage.getItem(STORE)) || {}; } catch (e) { return {}; } }
  function save(patch) { try { localStorage.setItem(STORE, JSON.stringify(Object.assign(saved(), patch))); } catch (e) {} }
  function rng(seed) { let a = seed >>> 0; return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  function sound(kind) {
    if (saved().muted || !audio) return;
    const notes = { hit: [[150, 0.07]], block: [[880, 0.05]], sling: [[600, 0.04], [900, 0.04]], stun: [[120, 0.2]], flee: [[523, 0.06], [784, 0.08]],
      scatter: [[300, 0.08], [220, 0.12]], combo: [[392, 0.05], [523, 0.05], [784, 0.1]], ready: [[659, 0.07], [988, 0.12]],
      mighty: [[262, 0.06], [392, 0.06], [523, 0.06], [784, 0.08], [1047, 0.22]], gather: [[659, 0.06], [880, 0.08]], clear: [[523, 0.09], [659, 0.09], [784, 0.09], [1047, 0.2]], over: [[392, 0.2], [330, 0.2], [262, 0.4]], right: [[784, 0.08], [1047, 0.14]], wrong: [[220, 0.2]] }[kind] || [];
    let t = audio.currentTime + 0.01;
    notes.forEach(([f, d]) => {
      const o = audio.createOscillator(), v = audio.createGain();
      o.type = kind === 'hit' || kind === 'stun' ? 'square' : 'triangle';
      o.frequency.setValueAtTime(f, t);
      v.gain.setValueAtTime(0.0001, t); v.gain.exponentialRampToValueAtTime(0.08, t + 0.01); v.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(v).connect(audio.destination); o.start(t); o.stop(t + d + 0.02); t += d;
    });
  }
  function wakeAudio() { try { if (!audio) audio = new (window.AudioContext || window.webkitAudioContext)(); if (audio.state === 'suspended') audio.resume(); } catch (e) { audio = null; } }

  // ===================== the game =====================

  function newGame() {
    const portrait = window.innerHeight > window.innerWidth * 1.05;
    const seed = typeof window.TU_AMMON_SEED === 'number' ? window.TU_AMMON_SEED : Date.now();
    G = { w: portrait ? 16 : 24, rand: rng(seed), time: 0, level: 0, score: 0, state: 'play', ready: manual() ? 0 : T.ready, paused: false,
      stones: T.stones, lost: 0, robbersOff: 0, chiefsOff: 0, gathered: 0, shieldUntil: 0, used: new Set(), power: 0, flashAt: -9, combos: 0, mighties: 0,
      me: { x: 0, y: 0, vy: 0, face: 1, act: 'ready', t: 0, stun: 0, step: 0, chain: 0, chainUntil: 0, counterUntil: 0, lx: 0, hits: 0 },
      sheep: [], robbers: [], shots: [], drops: [], floats: [], between: 0, banner: null, q: null };
    const home = T.flock, span = (portrait ? home[1] - 1.2 : home[1]) - home[0];
    for (let k = 0; k < T.sheep; k++) {
      const x = home[0] + span * (k + 0.5) / T.sheep;
      G.sheep.push({ home: x, x, state: 'flock', tx: x, row: k % 2, wig: G.rand() * 6 });
    }
    G.me.x = home[0] + span + 2;
    nextLevel();
  }
  const alive = () => G.sheep.filter(s => s.state !== 'lost');
  const inFlock = () => G.sheep.filter(s => s.state === 'flock' || s.state === 'return').length;

  function nextLevel() {
    G.level++;
    const L = G.level;
    G.wave = { total: Math.min(15, 3 + 2 * L), spawned: 0, every: Math.max(1.1, 3.2 - 0.25 * L), next: 1.2, chief: false };
    G.levelStart = G.time;
    G.levelLost = 0;
    // The scattered sheep come home between levels; the lost ones stay lost.
    G.sheep.forEach(s => { if (s.state !== 'lost') { s.state = 'flock'; s.x = s.home; } });
  }
  function spawnRobber() {
    const L = G.level, left = L >= 3 && G.rand() < 0.3;
    G.robbers.push({ kind: 'robber', x: left ? -1 : G.w + 1, face: left ? 1 : -1, hp: L >= 4 ? 3 : 2, act: 'walk', t: 0, kx: 0,
      speed: Math.min(T.robberMax, T.robberSpeed + (L - 1) * T.robberStep) * (0.85 + G.rand() * 0.3), step: G.rand() });
    G.wave.spawned++;
  }
  function spawnChief() {
    G.wave.chief = true;
    G.robbers.push({ kind: 'chief', x: G.w + 1.5, face: -1, hp: 5 + 2 * G.level, hpMax: 5 + 2 * G.level, act: 'walk', t: 0, kx: 0, speed: 2.1 + 0.15 * G.level, charge: 2.5, step: 0 });
    G.banner = { title: 'The robbers’ leader!', small: '', line: W().chief, until: G.time + 2.5 };
  }

  function float(text, x, y, color) { G.floats.push({ text, x, y, color, at: G.time }); }

  function update(dt) {
    if (!G || G.state !== 'play' || G.q) return;
    G.time += dt;
    if (G.between > 0) {
      G.between -= dt;
      if (G.between <= 0) askQuestion();
      return;
    }
    const me = G.me;
    // ----- Ammon -----
    if (me.stun > 0) { me.stun -= dt; me.act = 'stun'; }
    else if (me.act === 'stun') me.act = 'ready';
    if (me.lx) { const k = Math.sign(me.lx) * Math.min(Math.abs(me.lx), T.lunge * dt); me.x += k; me.lx -= k; }   // a chained blow or a counter steps in
    if (me.act === 'strike' || me.act === 'sling') {
      me.t += dt;
      if (me.act === 'strike' && !me.landed && me.t >= T.strikeHit[0]) {
        me.landed = true;
        const k = me.kind, reach = T.reach + (k === 'air' ? 0.5 : 0);
        const hit = G.robbers.filter(r => r.act !== 'flee' && Math.sign(r.x - me.x) === me.face && Math.abs(r.x - me.x) < reach + (r.kind === 'chief' ? 0.3 : 0));
        if (hit.length) me.hits++;
        const finish = k === 'finish' && me.hits >= 3;
        let label = null;
        if (k === 'air') label = 'Overhead!';
        else if (k === 'counter') { label = 'Counter!'; addPower(T.fill.counter); }
        else if (finish) { label = `3-hit combo! +${T.combo}`; G.score += T.combo; G.combos++; addPower(T.fill.combo); }
        else if (hit.length && me.chain === 2 && me.hits >= 2) label = '2 hits!';
        hit.forEach((r, i) => hurt(r, k === 'strike' ? 1 : 2, me.face, {
          push: k === 'strike' ? T.chainPush : k === 'finish' ? T.finishPush : T.push, daze: k === 'air' || k === 'counter' ? T.daze : 0, label: i ? null : label }));
        if (hit.length && label) sound(finish || k === 'counter' ? 'combo' : 'hit');
      }
      if (me.act === 'sling' && !me.thrown && me.t >= T.slingAt) {
        me.thrown = true;
        G.shots.push({ x: me.x + me.face * 0.6, y: 2.4, vx: me.face * T.stoneSpeed, vy: 3 });
        sound('sling');
      }
      if (me.t >= (me.act === 'strike' ? T.strike : T.sling)) {
        const was = me.act;
        me.act = 'ready'; me.t = 0;
        if (was === 'strike') { if (me.queued) startStrike(true); else me.chainUntil = G.time + T.chainWin; }
      }
    }
    const blocking = me.act !== 'stun' && keys.has('block') && me.y <= 0;
    if (me.act === 'ready' || me.act === 'walk' || me.act === 'block') me.act = blocking ? 'block' : 'ready';
    let mx = (keys.has('right') ? 1 : 0) - (keys.has('left') ? 1 : 0);
    if (me.act !== 'stun' && !blocking && me.act !== 'sling') {
      if (mx) { me.x += mx * T.speed * dt * (me.act === 'strike' ? 0.3 : 1); if (me.act !== 'strike') me.face = mx; if (me.act === 'ready') me.act = 'walk'; me.step += dt * 6; }
      if (keys.has('up') && me.y <= 0) { me.vy = T.jump; }
    }
    if (me.y > 0 || me.vy > 0) { me.vy -= T.gravity * dt; me.y = Math.max(0, me.y + me.vy * dt); if (me.y <= 0) me.vy = 0; }
    me.x = Math.max(0.6, Math.min(G.w - 0.6, me.x));
    // Gathering: walk to a scattered sheep and it runs home.
    for (const s of G.sheep) if ((s.state === 'stray' || s.state === 'run') && Math.abs(s.x - me.x) < 1 && me.y < 1) {
      s.state = 'return'; G.gathered++; G.score += 25; float('Gathered! +25', s.x, 2.2, '#bbf7d0'); sound('gather'); addPower(T.fill.gather);
    }
    // ----- stones -----
    for (const st of G.shots) {
      st.x += st.vx * dt; if (!st.target) { st.vy -= 9 * dt; st.y += st.vy * dt; }
      for (const r of G.robbers) if (!st.done && r.act !== 'flee' && (!st.target || st.target === r) && Math.abs(r.x - st.x) < 0.6 && st.y < 3.2 && st.y > 0.3) {
        st.done = true;
        if (st.target) hurt(r, r.kind === 'chief' ? 3 : r.hp, Math.sign(st.vx), { push: T.finishPush, daze: T.daze, mighty: true });
        else hurt(r, 1, Math.sign(st.vx));
      }
      if (st.target && st.target.act === 'flee' && !st.done) st.done = true;
      if (st.y < 0 || st.x < -1 || st.x > G.w + 1) st.done = true;
    }
    G.shots = G.shots.filter(s => !s.done);
    // ----- pouches of stones -----
    for (const d of G.drops) if (!d.taken && Math.abs(d.x - me.x) < 0.9 && me.y < 1) {
      d.taken = true; const n = Math.min(3, T.stonesMax - G.stones); G.stones += n; float(n ? `+${n} stones` : 'Pouch full', d.x, 1.8, '#e5e7eb');
    }
    G.drops = G.drops.filter(d => !d.taken && G.time - d.at < 12);
    // ----- robbers -----
    const W0 = G.wave;
    if (G.hold) { /* the tests try one thing at a time */ }
    else if (W0.spawned < W0.total) {
      W0.next -= dt;
      const busy = G.robbers.filter(r => r.act !== 'flee').length;
      if (W0.next <= 0 && busy < Math.min(5, 2 + Math.floor(G.level / 2))) { spawnRobber(); W0.next = W0.every; }
    } else if (!W0.chief && !G.robbers.length) spawnChief();
    for (const r of G.robbers) robber(r, dt, blocking);
    G.robbers = G.robbers.filter(r => !(r.act === 'flee' && (r.x < -2 || r.x > G.w + 2)));
    // ----- sheep -----
    for (const s of G.sheep) {
      s.wig += dt;
      if (s.state === 'run') { const d = s.tx - s.x; s.x += Math.sign(d) * Math.min(Math.abs(d), 5 * dt); if (Math.abs(d) < 0.05) s.state = 'stray'; }
      else if (s.state === 'stray') {   // a scattered sheep wanders off toward the nearer edge
        s.x += (s.x < G.w / 2 ? -1 : 1) * 0.35 * dt;
        if (s.x < -0.8 || s.x > G.w + 0.8) { s.state = 'lost'; G.lost++; G.levelLost++; float('A sheep is lost!', Math.max(1, Math.min(G.w - 1, s.x)), 3, '#fca5a5'); sound('scatter'); }
      } else if (s.state === 'return') { const d = s.home - s.x; s.x += Math.sign(d) * Math.min(Math.abs(d), 5.5 * dt); if (Math.abs(d) < 0.05) s.state = 'flock'; }
    }
    if (G.lost >= T.lose) return over();
    // ----- a level ends when its leader has run -----
    if (!G.hold && W0.chief && !G.robbers.length) clearLevel();
  }

  // A robber (or their leader): to the flock, or at Ammon when he's in the way.
  function robber(r, dt, blocking) {
    const me = G.me, chief = r.kind === 'chief';
    r.t += dt; r.step += dt * 5;
    if (r.kx) { const k = Math.sign(r.kx) * Math.min(Math.abs(r.kx), 9 * dt); r.x += k; r.kx -= k; }
    if (r.act === 'flee') { r.x += r.face * 6.5 * dt; return; }
    if (r.act === 'hit') { if (r.t > (r.daze || 0.35)) { r.act = 'walk'; r.t = 0; r.daze = 0; } return; }
    if (r.act === 'recover') { if (r.t > 0.5) { r.act = 'walk'; r.t = 0; } return; }
    const dx = me.x - r.x, near = Math.abs(dx) < (chief ? 2.3 : 1.7) && me.act !== 'stun' && me.y < 1.2;
    if (r.act === 'windup') {
      r.face = Math.sign(dx) || r.face;
      if (r.t >= (chief ? T.chiefWindup : T.windup)) {   // the blow
        r.act = 'recover'; r.t = 0;
        if (Math.abs(me.x - r.x) < (chief ? 2.5 : 1.9) && me.y < 1.2 && me.act !== 'stun') {
          const front = Math.sign(r.x - me.x) === me.face;
          if (G.time < G.shieldUntil || (blocking && front)) {
            float(G.time < G.shieldUntil ? 'Protected!' : 'Blocked!', me.x, 3.6, '#fde68a'); sound('block');
            if (blocking && front) me.counterUntil = G.time + T.counterWin;
            r.kx = -r.face * (chief ? 1 : 1.6); r.act = 'hit'; r.t = 0;
            if (chief) me.x = Math.max(0.6, Math.min(G.w - 0.6, me.x + r.face * 0.6));   // the leader's blow still pushes him back
          } else {
            me.stun = chief ? T.chiefStun : T.stun; me.act = 'stun'; me.t = 0;
            me.x = Math.max(0.6, Math.min(G.w - 0.6, me.x + r.face * (chief ? 2.4 : 1.3)));
            float('Stunned!', me.x, 3.6, '#fca5a5'); sound('stun');
          }
        }
      }
      return;
    }
    if (chief) {   // the leader charges now and then from afar
      r.charge -= dt;
      if (r.act === 'charge') {
        r.x += r.face * 8.5 * dt;
        if (Math.abs(me.x - r.x) < 1.2 && me.y < 1.2 && me.act !== 'stun') {
          const front = Math.sign(r.x - me.x) === me.face;
          if (G.time < G.shieldUntil || (blocking && front)) { float('Blocked!', me.x, 3.6, '#fde68a'); sound('block'); r.act = 'hit'; r.t = 0; r.kx = -r.face * 2; if (blocking && front) me.counterUntil = G.time + T.counterWin; }
          else { me.stun = T.chiefStun; me.act = 'stun'; me.x = Math.max(0.6, Math.min(G.w - 0.6, me.x + r.face * 3)); float('Stunned!', me.x, 3.6, '#fca5a5'); sound('stun'); r.act = 'recover'; r.t = 0; }
          r.charge = 4;
        }
        if (r.t > 1.2 || r.x < 0.3 || r.x > G.w - 0.3) { r.act = 'recover'; r.t = 0; r.charge = 3.5; r.x = Math.max(0.3, Math.min(G.w - 0.3, r.x)); }
        scatterAt(r);
        return;
      }
      if (r.charge <= 0 && Math.abs(dx) > 4 && r.x < G.w && r.x > 0) { r.act = 'charge'; r.t = 0; r.face = Math.sign(dx); return; }
    }
    if (near) { r.act = 'windup'; r.t = 0; r.face = Math.sign(dx) || r.face; return; }
    // Walk to the nearest sheep still with the flock (or a scattered one), else to Ammon.
    const flock = G.sheep.filter(s => s.state === 'flock' || s.state === 'return' || s.state === 'stray');
    const target = flock.length ? flock.reduce((a, s) => Math.abs(s.x - r.x) < Math.abs(a.x - r.x) ? s : a) : me;
    r.face = Math.sign(target.x - r.x) || r.face;
    r.x += r.face * r.speed * dt;
    r.act = 'walk';
    scatterAt(r);
  }
  // A robber at a sheep scatters it: it runs off into the field, away from the flock.
  function scatterAt(r) {
    for (const s of G.sheep) {
      if (Math.abs(s.x - r.x) > 0.7) continue;
      if (s.state === 'flock' || s.state === 'return') {
        const away = r.face >= 0 ? 1 : -1, to = s.x + away * (3 + G.rand() * 5);
        s.state = 'run'; s.tx = Math.max(-0.5, Math.min(G.w + 0.5, to));
        float('Scattered!', s.x, 2.4, '#fdba74'); sound('scatter');
      } else if (s.state === 'stray') { s.state = 'run'; s.tx = Math.max(-1, Math.min(G.w + 1, s.x + (s.x < G.w / 2 ? -2.5 : 2.5))); }
    }
  }
  // A blow from the sword or a stone: knocked back, and with the last one, the club is gone and he runs.
  // o: how far it knocks him back, how long he's dazed, and a word for the move that did it.
  function hurt(r, n, dir, o) {
    o = o || {};
    const push = o.push == null ? T.push : o.push;
    r.hp -= n; r.kx = dir * (r.kind === 'chief' ? Math.min(1.2, push * 0.45) : push); r.act = 'hit'; r.t = 0; r.daze = o.daze || 0;
    sound('hit');
    if (o.label) float(o.label, r.x, 4.3, '#fbbf24');
    if (r.hp > 0) { float(r.kind === 'chief' ? `${r.hp} to go` : 'Hit!', r.x, 3.4, '#fde68a'); return; }
    r.act = 'flee'; r.face = r.x < G.w / 2 ? -1 : 1;
    const pts = r.kind === 'chief' ? 500 * G.level : 100;
    G.score += pts;
    if (r.kind === 'chief') G.chiefsOff++; else G.robbersOff++;
    if (!o.mighty) addPower(r.kind === 'chief' ? T.fill.chief : T.fill.robber);   // the meter's own stones don't refill it
    float(`${r.kind === 'chief' ? 'The leader runs!' : 'He runs!'} +${pts}`, r.x, 3.8, '#bbf7d0'); sound('flee');
    if (r.kind === 'robber' && G.rand() < 0.35) G.drops.push({ x: Math.max(0.8, Math.min(G.w - 0.8, r.x)), at: G.time });
  }

  // The meter: driving robbers off, gathering sheep, counters, combos and right answers fill it.
  function addPower(n) {
    if (!G || G.power >= T.power) return;
    G.power = Math.min(T.power, G.power + n);
    if (G.power >= T.power) { float('⚡ Mighty power is ready!', G.me.x, 4.6, '#fbbf24'); sound('ready'); }
  }
  // A sword blow: in the air, an overhead blow; just after a block, a counter; else the next in a chain of three.
  function startStrike(chained) {
    const me = G.me;
    let kind = 'strike';
    if (me.y > 0.25) { kind = 'air'; me.chain = 0; me.hits = 0; }
    else if (G.time < me.counterUntil) { kind = 'counter'; me.chain = 1; me.hits = 0; }
    else {
      me.chain = (chained || G.time < me.chainUntil) && me.chain > 0 && me.chain < 3 ? me.chain + 1 : 1;
      if (me.chain === 1) me.hits = 0;
      if (me.chain === 3) kind = 'finish';
    }
    me.act = 'strike'; me.kind = kind; me.t = 0; me.landed = false; me.queued = false; me.chainUntil = 0; me.counterUntil = 0;
    // A counter or a chained blow steps in to the robber in front, so it reaches him.
    if (kind === 'counter' || me.chain > 1) {
      const range = kind === 'counter' ? 4.2 : 3.2;
      const front = G.robbers.filter(r => r.act !== 'flee' && Math.sign(r.x - me.x) === me.face && Math.abs(r.x - me.x) < range)
        .sort((a, b) => Math.abs(a.x - me.x) - Math.abs(b.x - me.x))[0];
      if (front && Math.abs(front.x - me.x) > 1.35) me.lx = (Math.abs(front.x - me.x) - 1.35) * me.face;
    }
  }
  // Sword and sling together, with the meter full: a stone "with mighty power" at every robber on the field.
  function mighty() {
    const me = G.me;
    if (G.power < T.power) { float('Not ready yet', me.x, 3.6, '#e5e7eb'); return; }
    me.press = null;
    const targets = G.robbers.filter(r => r.act !== 'flee');
    if (!targets.length) { float('No robbers here yet', me.x, 3.6, '#e5e7eb'); return; }
    if (me.act === 'sling' && !me.thrown) G.stones++;   // the sling press that began it isn't spent
    if (me.act === 'strike' || me.act === 'sling') { me.act = 'ready'; me.t = 0; }
    me.queued = false;
    G.power = 0; G.flashAt = G.time; G.mighties++;
    targets.forEach(r => { const dir = Math.sign(r.x - me.x) || me.face; G.shots.push({ x: me.x + dir * 0.4, y: 2, vx: dir * 24, vy: 0, target: r }); });
    float('Mighty power!', me.x, 4.4, '#fbbf24'); sound('mighty');
  }

  function clearLevel() {
    const flock = inFlock(), bonus = 150 * G.level, sheep = 50 * flock;
    G.score += bonus + sheep;
    const lines = W().levels || [];
    G.banner = { title: `Level ${G.level} cleared! +${fmt(bonus + sheep)}`, small: `${fmt(bonus)} for the level · ${fmt(sheep)} for ${flock} sheep safe`,
      line: lines[(G.level - 1) % Math.max(1, lines.length)], until: Infinity };
    G.between = T.between;
    G.shots = []; G.drops = [];
    sound('clear');
  }
  // Between levels: a question from this week (the same as the other arcade games).
  function askQuestion() {
    const q = host && host.ask ? host.ask(G.used) : null;
    if (!q) return afterQuestion();
    G.q = Object.assign({}, q, { picked: null });
    renderQuestion();
  }
  function answer(i) {
    const q = G.q;
    if (!q || q.picked != null) return;
    q.picked = i;
    const right = q.choices[i] === q.right;
    if (right) { G.score += 200; G.stones = Math.min(T.stonesMax, G.stones + 4); G.shieldNext = true; addPower(T.fill.right); sound('right'); }
    else sound('wrong');
    renderQuestion();
  }
  function afterQuestion() {
    const shield = G.shieldNext;
    G.q = null; G.shieldNext = false; G.banner = null;
    nextLevel();
    if (shield) G.shieldUntil = G.time + T.shield;
    G.ready = manual() ? 0 : T.ready;
    renderGame();
  }
  function over() {
    G.state = 'over';
    const was = saved().best || 0;
    const top = (saved().top || []).concat(G.score > 0 ? [{ name: host.player().name || 'You', score: G.score, level: G.level, at: Date.now() }] : []).sort((a, b) => b.score - a.score).slice(0, 10);
    save({ best: Math.max(was, G.score), top, plays: (saved().plays || 0) + 1 });
    G.newBest = G.score > was && G.score > 0;
    sound('over');
    renderOver();
  }

  // ===================== drawing =====================

  // Pictures (arcade/ammon/, painted by Gemini; arcade/README.md): [width, height, torso x, feet y] as fractions.
  const SPR = {"ammon-block":[136,267,0.526,1.0],"ammon-ready":[120,280,0.496,0.986],"ammon-sling":[149,298,0.564,1.0],"ammon-strike":[179,297,0.536,0.987],"ammon-walk1":[134,275,0.541,0.985],"ammon-walk2":[102,264,0.426,0.985],"chief-charge":[214,349,0.554,0.991],"chief-flee":[209,303,0.493,0.99],"chief-ready":[183,330,0.516,0.991],"chief-smash":[216,335,0.444,1.0],"pouch":[78,80,0.468,0.962],"robber-attack":[190,235,0.576,0.987],"robber-flee":[171,246,0.588,0.992],"robber-hit":[175,266,0.523,0.992],"robber-walk":[134,270,0.586,0.989],"sheep-graze":[178,140,0.522,0.979],"sheep-run":[222,135,0.547,0.978],"stone":[45,44,0.489,0.932]};
  // How tall each set of pictures stands, in units (Ammon 3.2 tall in his ready pose).
  const SCALE = { ammon: 3.2 / 280, robber: 3.1 / 270, chief: 3.6 / 330, sheep: 1.35 / 140, stone: 0.42 / 44, pouch: 0.75 / 80 };
  const PICS = {};
  function pic(name) {
    let im = PICS[name];
    if (!im) { im = PICS[name] = new Image(); im.src = 'arcade/ammon/' + name + (name === 'sebus' ? '.jpg' : '.png'); }
    return im.complete && im.naturalWidth ? im : null;
  }
  // A sprite with its torso at x and its feet at the ground (gy), facing face (its pictures face right).
  function sprite(ctx, name, x, gy, u, face, alpha) {
    const s = SPR[name], im = pic(name);
    if (!s || !im) return false;
    const k = SCALE[name.split('-')[0]] * u, w = s[0] * k, h = s[1] * k;
    ctx.save();
    if (alpha != null) ctx.globalAlpha = alpha;
    ctx.translate(x, gy);
    if (face < 0) ctx.scale(-1, 1);
    ctx.drawImage(im, -s[2] * w, -s[3] * h, w, h);
    ctx.restore();
    return true;
  }
  function board() {
    const c = $('amCanvas');
    if (!c || !G) return null;
    const r = $('amStage').getBoundingClientRect();
    const tall = G.w < 20 ? 11 : 7.5;   // upright, more sky over the same ground
    const u = Math.max(8, Math.floor(Math.min((r.width - 4) / G.w, (r.height - 4) / tall)));
    const dpr = Math.min(2, window.devicePixelRatio || 1), cw = G.w * u, ch = Math.round(tall * u);
    if (c._u !== u || c._dpr !== dpr || c._w !== G.w) {
      c._u = u; c._dpr = dpr; c._w = G.w;
      c.width = cw * dpr; c.height = ch * dpr; c.style.width = cw + 'px'; c.style.height = ch + 'px';
    }
    return { c, ctx: c.getContext('2d'), u, dpr, cw, ch };
  }
  function draw(now) {
    const b = board();
    if (!b) return;
    const { ctx, u, dpr, cw, ch } = b, t = now || 0, gy = ch - u * 0.9, X = v => v * u;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // The waters of Sebus, the picture covering the stage (its ground at the bottom), or a painted sky and field
    const bg = pic('sebus');
    if (bg) {
      const k = Math.max(cw / bg.naturalWidth, ch / bg.naturalHeight), w = bg.naturalWidth * k, h = bg.naturalHeight * k;
      ctx.drawImage(bg, (cw - w) * 0.15, ch - h, w, h);
    } else {
      const g = ctx.createLinearGradient(0, 0, 0, ch); g.addColorStop(0, '#f6c78b'); g.addColorStop(0.55, '#c7d79a'); g.addColorStop(1, '#a3b26a');
      ctx.fillStyle = g; ctx.fillRect(0, 0, cw, ch);
      ctx.fillStyle = '#3b82c4'; ctx.beginPath(); ctx.ellipse(X(1.5), gy - u * 1.6, X(3), u * 0.6, 0, 0, 7); ctx.fill();
    }
    // Shadows, then the sheep (back row a little higher), pouches, robbers and Ammon, then stones and words
    const shadow = (x, r) => { ctx.fillStyle = 'rgba(40,30,10,.25)'; ctx.beginPath(); ctx.ellipse(X(x), gy + u * 0.05, u * r, u * 0.18, 0, 0, 7); ctx.fill(); };
    const sheepY = s => gy - (s.row ? u * 0.35 : 0);
    for (const s of G.sheep.filter(x => x.state !== 'lost').sort((a, b) => b.row - a.row)) {
      const running = s.state === 'run' || s.state === 'return', face = running ? Math.sign((s.state === 'run' ? s.tx : s.home) - s.x) || 1 : (Math.sin(s.wig * 0.4) > 0 ? -1 : 1);
      shadow(s.x, 0.55);
      const bob = running ? Math.abs(Math.sin(s.wig * 12)) * u * 0.12 : 0;
      // Its graze picture faces left, its run picture right
      if (!sprite(ctx, running ? 'sheep-run' : 'sheep-graze', X(s.x), sheepY(s) - bob, u, running ? face : -face)) {
        ctx.fillStyle = '#f5f0e6'; ctx.beginPath(); ctx.ellipse(X(s.x), sheepY(s) - u * 0.6 - bob, u * 0.6, u * 0.42, 0, 0, 7); ctx.fill();
      }
      if (s.state === 'stray') { ctx.fillStyle = '#fde68a'; ctx.font = `900 ${Math.round(u * 0.5)}px system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.fillText('!', X(s.x), sheepY(s) - u * 1.6); }
    }
    for (const d of G.drops) { shadow(d.x, 0.35); sprite(ctx, 'pouch', X(d.x), gy, u, 1) || (ctx.fillStyle = '#7c4a1e', ctx.fillRect(X(d.x) - u * 0.3, gy - u * 0.6, u * 0.6, u * 0.6)); }
    for (const r of G.robbers) {
      const chief = r.kind === 'chief', set = chief ? 'chief' : 'robber';
      const name = r.act === 'flee' ? `${set}-flee` : r.act === 'hit' ? (chief ? 'chief-ready' : 'robber-hit') : r.act === 'windup' ? (chief ? 'chief-smash' : 'robber-attack')
        : r.act === 'charge' ? 'chief-charge' : chief ? 'chief-ready' : 'robber-walk';
      const bob = r.act === 'walk' || r.act === 'flee' || r.act === 'charge' ? Math.abs(Math.sin(r.step * 2)) * u * 0.1 : 0;
      shadow(r.x, chief ? 0.8 : 0.6);
      if (!sprite(ctx, name, X(r.x), gy - bob, u, r.face, r.act === 'hit' && Math.floor(t / 60) % 2 ? 0.6 : 1)) {
        ctx.fillStyle = chief ? '#7f1d1d' : '#b45309'; ctx.fillRect(X(r.x) - u * 0.4, gy - u * 3, u * 0.8, u * 3);
      }
      if (chief && r.act !== 'flee') {   // the leader's strength, over his head
        const bw = u * 2, bx = X(r.x) - bw / 2, by = gy - u * 4.2;
        ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(bx, by, bw, u * 0.22);
        ctx.fillStyle = '#ef4444'; ctx.fillRect(bx, by, bw * Math.max(0, r.hp) / r.hpMax, u * 0.22);
      }
    }
    // Ammon
    const me = G.me;
    const walkFrame = Math.floor(me.step) % 2 ? 'ammon-walk1' : 'ammon-walk2';
    const name = me.act === 'strike' ? 'ammon-strike' : me.act === 'sling' ? 'ammon-sling' : me.act === 'block' ? 'ammon-block' : me.act === 'walk' && me.y <= 0 ? walkFrame : 'ammon-ready';
    shadow(me.x, 0.6 - Math.min(0.3, me.y * 0.08));
    if (G.time < G.shieldUntil) {   // the Lord's protection: a glow round him
      const gl = ctx.createRadialGradient(X(me.x), gy - u * 1.6 - X(me.y), u * 0.4, X(me.x), gy - u * 1.6 - X(me.y), u * 2.4);
      gl.addColorStop(0, 'rgba(253,230,138,.45)'); gl.addColorStop(1, 'rgba(253,230,138,0)'); ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(X(me.x), gy - u * 1.6 - X(me.y), u * 2.4, 0, 7); ctx.fill();
    }
    if (!sprite(ctx, name, X(me.x), gy - X(me.y), u, me.face, me.act === 'stun' && Math.floor(t / 80) % 2 ? 0.45 : 1)) {
      ctx.fillStyle = '#2563eb'; ctx.fillRect(X(me.x) - u * 0.4, gy - u * 3.1 - X(me.y), u * 0.8, u * 3.1);
    }
    if (me.act === 'stun') { ctx.fillStyle = '#fde68a'; ctx.font = `${Math.round(u * 0.6)}px system-ui`; ctx.textAlign = 'center'; ctx.fillText('💫', X(me.x), gy - u * 3.5 - X(me.y)); }
    // The sword's sweep: gold for a finishing blow, a counter or an overhead blow
    if (me.act === 'strike' && me.t > 0.03 && me.t < 0.24) {
      const big = me.kind !== 'strike', a = 1 - (me.t - 0.03) / 0.21, cx = X(me.x) + me.face * u * 0.5, cy = gy - u * 1.9 - X(me.y), rad = u * (big ? 1.9 : 1.5);
      const from = me.kind === 'air' ? -1.5 : -1.1, to = me.kind === 'air' ? 1.3 : 0.9;
      ctx.save(); ctx.globalAlpha = Math.max(0, a); ctx.lineCap = 'round';
      ctx.strokeStyle = big ? '#fbbf24' : 'rgba(255,255,255,.85)'; ctx.lineWidth = u * (big ? 0.32 : 0.2);
      ctx.beginPath();
      if (me.face > 0) ctx.arc(cx, cy, rad, from, to); else ctx.arc(cx, cy, rad, Math.PI - to, Math.PI - from);
      ctx.stroke(); ctx.restore();
    }
    for (const st of G.shots) {
      if (st.target) { ctx.fillStyle = 'rgba(251,191,36,.45)'; ctx.beginPath(); ctx.ellipse(X(st.x - Math.sign(st.vx) * 0.5), gy - X(st.y), u * 0.7, u * 0.18, 0, 0, 7); ctx.fill(); }
      sprite(ctx, 'stone', X(st.x), gy - X(st.y), u, 1) || (ctx.fillStyle = '#9ca3af', ctx.beginPath(), ctx.arc(X(st.x), gy - X(st.y), u * 0.2, 0, 7), ctx.fill());
    }
    // Mighty power: a flash of gold over the field
    if (G.time - G.flashAt < T.flash) { ctx.fillStyle = `rgba(253,230,138,${0.45 * (1 - (G.time - G.flashAt) / T.flash)})`; ctx.fillRect(0, 0, cw, ch); }
    // Words that float up and fade
    ctx.textAlign = 'center'; ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,.6)';
    ctx.font = `900 ${Math.round(Math.max(12, u * 0.5))}px system-ui, sans-serif`;
    G.floats = G.floats.filter(f => G.time - f.at < 1.2);
    for (const f of G.floats) { const a = 1 - (G.time - f.at) / 1.2, y = gy - X(f.y) - (G.time - f.at) * u * 1.2; ctx.globalAlpha = a; ctx.fillStyle = f.color; ctx.strokeText(f.text, X(f.x), y); ctx.fillText(f.text, X(f.x), y); }
    ctx.globalAlpha = 1;
    // 3, 2, 1, and the banner between levels
    if (G.ready > 0 || (G.banner && G.time < (G.banner.until || 0))) {
      const big = G.ready > 0 ? String(Math.ceil(G.ready)) : G.banner.title;
      ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.fillRect(0, 0, cw, ch);
      ctx.fillStyle = '#fff'; ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.lineWidth = 6;
      ctx.font = `900 ${Math.round(Math.min(cw, ch) * (G.ready > 0 ? 0.3 : 0.09))}px system-ui, sans-serif`;
      ctx.strokeText(big, cw / 2, ch * 0.48); ctx.fillText(big, cw / 2, ch * 0.48);
    }
  }

  // ===================== the screens =====================

  const coarse = () => !!(window.matchMedia && window.matchMedia('(any-pointer: coarse)').matches) || !!window.TU_AMMON_PADS;
  function shell(body) {
    root.innerHTML = `<div class="am-top">
        <div class="am-name"><div class="eyebrow">Arcade · no XP, just for fun</div><div class="board-title">Ammon at Sebus</div></div>
        <div id="amHud" class="am-hud"></div>
        <div class="am-btns">${G && G.state === 'play' && root.dataset.view === 'game' ? '<button class="btn ghost" data-am="pause" aria-label="Pause">⏸</button>' : ''}<button class="btn ghost" data-am="sound" aria-label="Sound on or off">${saved().muted ? '🔈' : '🔊'}</button>${window.TUFull ? TUFull.html('btn ghost') : ''}<button class="btn ghost" data-am="exit">Exit</button></div>
      </div>${body}`;
  }
  function scoresHtml() {
    const top = saved().top || [];
    if (top.length) return `<div class="eyebrow">Best on this device</div><ol>${top.slice(0, 5).map(f => `<li><span>${esc(f.name)}</span><b>${fmt(f.score)}</b></li>`).join('')}</ol>`;
    return '<p class="am-note">No scores yet. Be the first!</p>';
  }
  function renderMenu() {
    root.dataset.view = 'menu';
    const keysHow = coarse() ? 'the ◀ ▶ ▲ pad, and <b>SWORD</b>, <b>SLING</b> and <b>BLOCK</b>' : 'the arrows or <b>A D</b> to move, <b>↑</b> or <b>W</b> to jump; <b>J</b> sword, <b>K</b> sling, hold <b>L</b> to block';
    shell(`<div class="am-menu">
      <img class="am-hero" src="arcade/ammon.jpg" width="960" height="480" alt="At the waters of Sebus, Ammon whirls his sling in front of the king's flock while the robbers stumble back and run, and the king's servants watch, amazed.">
      <p class="am-hook">${host.html(W().hook || '')}</p>
      <div class="board-actions"><button class="btn" data-am="start">▶ Start</button></div>
      <ul class="am-how">
        <li>Play with ${keysHow}.</li>
        <li>Robbers come to <b>scatter the flock</b>. Walk to a scattered sheep to <b>gather it</b> back before it wanders off. Lose ${T.lose} sheep and the game is over.</li>
        <li>Your <b>sword</b> knocks the clubs out of their hands; your <b>sling</b> reaches far, but stones run out (a robber may drop a pouch).</li>
        <li><b>Block</b> a club facing it. Ammon can’t be beaten, but a club stuns him for a moment.</li>
        <li>Each level ends with the <b>robbers’ leader</b>, then a question from this week: right, and you get stones and the Lord’s protection.</li>
      </ul>
      <div class="am-moves"><div class="eyebrow">Moves</div><ul>
        <li><b>3-hit combo:</b> ${coarse() ? 'SWORD' : 'sword'} three times in a row. The third blow knocks him far, +${T.combo}.</li>
        <li><b>Overhead:</b> jump, then ${coarse() ? 'SWORD' : 'sword'} in the air. A double blow, and he’s dazed.</li>
        <li><b>Counter:</b> block his club, then ${coarse() ? 'SWORD' : 'sword'} right away. A double blow.</li>
        <li><b>⚡ Mighty power:</b> drive robbers off, gather sheep and answer right to fill the meter. When it’s full, ${coarse() ? 'tap <b>⚡ POWER</b>' : 'press <b>J</b> and <b>K</b> together (or <b>E</b>)'}: a stone at every robber on the field.</li>
      </ul></div>
      <div class="am-scores">${scoresHtml()}</div></div>`);
    hud();
  }
  function renderGame() {
    root.dataset.view = 'game';
    const pads = coarse() ? `<div class="am-pads"><div class="am-pad am-left"><button data-hold="left" aria-label="Left">◀</button><button data-hold="up" aria-label="Jump">▲</button><button data-hold="right" aria-label="Right">▶</button></div>
      <div class="am-pad am-right"><button data-tap="strike" class="am-act">SWORD</button><button data-tap="sling" class="am-act">SLING</button><button data-hold="block" class="am-act">BLOCK</button><button data-tap="power" class="am-act am-power" hidden>⚡ POWER</button></div></div>` : '';
    shell(`<div id="amPanel" class="am-panel" aria-live="polite"></div>
      <div id="amStage" class="am-stage"><div class="am-frame"><canvas id="amCanvas" role="img" aria-label="The waters of Sebus: Ammon, the king's flock and the robbers"></canvas><div id="amBox" class="am-box" hidden></div></div></div>${pads}`);
    hud(); panel();
  }
  function renderQuestion() {
    const box = $('amBox'), q = G.q;
    if (!box || !q) return;
    box.hidden = false;
    const picked = q.picked != null, right = picked && q.choices[q.picked] === q.right;
    box.innerHTML = `<div class="am-card">
      <div class="eyebrow">${q.review ? 'A review · ' + esc(q.review) : 'From this week'}</div>
      <p class="am-q">${host.html(q.q, q.ref)}</p>
      <div class="am-choices">${q.choices.map((c, i) => `<button class="am-choice${picked ? (c === q.right ? ' right' : i === q.picked ? ' wrong' : '') : ''}" data-ans="${i}"${picked ? ' disabled' : ''}><b>${'ABC'[i]}</b><span>${esc(c)}</span></button>`).join('')}</div>
      ${picked ? `<p class="am-why"><b class="${right ? 'ok' : 'no'}">${right ? 'Right! +200, 4 more stones and the Lord’s protection' : 'Not this time.'}</b> ${q.why ? host.html(q.why, q.ref) : ''}</p>
        <div class="board-actions"><button class="btn" data-am="next">▶ Level ${G.level + 1}</button></div>` : ''}</div>`;
  }
  function hud() {
    const el = $('amHud');
    if (!el) return;
    if (!G || root.dataset.view !== 'game') { const best = saved().best || 0; el.innerHTML = best ? `<span class="score-chip">Best ${fmt(best)}</span>` : ''; return; }
    const safe = inFlock(), left = alive().length;
    el.innerHTML = `<span class="score-chip"><b>${fmt(G.score)}</b></span><span class="score-chip">Level ${G.level}</span>
      <span class="score-chip" title="Sheep with the flock">🐑 ${safe}/${left}${G.lost ? ` <small class="am-lost">· ${G.lost} lost</small>` : ''}</span><span class="score-chip" title="Sling stones">🪨 ${G.stones}</span>
      <span class="score-chip am-meter${G.power >= T.power ? ' full' : ''}" title="Mighty power"><i style="width:${Math.round(100 * G.power / T.power)}%"></i><span>⚡ ${G.power >= T.power ? 'Ready!' : Math.round(100 * G.power / T.power) + '%'}</span></span>`;
    const pw = root.querySelector('[data-tap="power"]');
    if (pw) pw.hidden = G.power < T.power;
  }
  function panel() {
    const el = $('amPanel');
    if (!el || !G) return;
    const strays = G.sheep.filter(s => s.state === 'stray' || s.state === 'run').length;
    let head, line = '';
    if (G.banner && (G.between > 0 || G.time < (G.banner.until || 0))) { head = `<b class="ok">${esc(G.banner.title)}</b> <small>${esc(G.banner.small || '')}</small>`; line = G.banner.line || ''; }
    else if (G.time - G.flashAt < 4) { head = '<b class="ok">Mighty power!</b> A stone at every robber on the field.'; line = W().mighty || ''; }
    else if (G.me.act === 'stun') head = '<b class="no">Stunned!</b> Face the robber and <b>block</b> his club next time.';
    else if (strays) head = `<b class="no">${strays} ${strays === 1 ? 'sheep is' : 'sheep are'} scattered!</b> Walk to ${strays === 1 ? 'it' : 'them'} to gather the flock.`;
    else if (G.time < G.shieldUntil) head = '<b class="ok">The Lord’s protection</b> is with you for a few seconds.';
    else if (G.power >= T.power) head = `<b class="ok">⚡ Mighty power is ready!</b> ${coarse() ? 'Tap <b>⚡ POWER</b>' : 'Press <b>J</b> and <b>K</b> together (or <b>E</b>)'} when the robbers come.`;
    else head = 'Keep the robbers away from the flock.';
    if (!line && G.level === 1 && G.robbersOff === 0) line = W().hook || '';
    const html = `<p class="am-status">${head}</p>${line ? `<p class="am-line">${host.html(line)}</p>` : ''}`;
    if (el._html !== html) { el._html = html; el.innerHTML = html; }
  }
  function renderOver() {
    root.dataset.view = 'over';
    shell(`<div class="am-menu">
      <div class="eyebrow">${G.newBest ? '🏆 New best!' : 'The robbers scattered the flock this time'}</div>
      <div class="am-big">${fmt(G.score)}</div>
      <p class="am-note">${G.level - 1 ? `${G.level - 1} ${G.level - 1 === 1 ? 'level' : 'levels'} cleared` : 'No level cleared yet'} · ${G.robbersOff} ${G.robbersOff === 1 ? 'robber' : 'robbers'} and ${G.chiefsOff} ${G.chiefsOff === 1 ? 'leader' : 'leaders'} driven off · ${G.gathered} sheep gathered</p>
      <p class="am-hook">${host.html(W().over || '')}</p>
      <div class="board-actions"><button class="btn" data-am="start">▶ Play again</button><button class="btn ghost" data-am="menu">Menu</button></div>
      <div class="am-scores">${scoresHtml()}</div></div>`);
  }
  function pause(on) {
    if (!G || G.state !== 'play' || G.q) return;
    G.paused = on;
    const box = $('amBox');
    if (box) { box.hidden = !on; box.innerHTML = on ? '<div class="am-card" style="text-align:center"><b style="font-size:24px">Paused</b><div class="board-actions" style="justify-content:center"><button class="btn" data-am="resume">▶ Resume</button><button class="btn ghost" data-am="quit">End game</button></div></div>' : ''; }
  }

  // ----- input -----
  const KEY = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', a: 'left', d: 'right', w: 'up', A: 'left', D: 'right', W: 'up', l: 'block', L: 'block', c: 'block', C: 'block' };
  const TAP = { j: 'strike', J: 'strike', z: 'strike', Z: 'strike', k: 'sling', K: 'sling', x: 'sling', X: 'sling', e: 'power', E: 'power' };
  function act(what) {
    const me = G && G.me;
    if (!me || G.state !== 'play' || G.paused || G.q || G.ready > 0 || G.between > 0 || me.act === 'stun') return;
    if (what === 'power') return mighty();
    // Sword and sling pressed together (within a moment), with the meter full
    const other = { strike: 'sling', sling: 'strike' }[what];
    if (G.power >= T.power && me.press && me.press.what === other && G.time - me.press.at <= T.together) return mighty();
    me.press = { what, at: G.time };
    if (me.act === 'strike') { if (what === 'strike' && me.t >= T.strikeHit[0] && me.kind !== 'air' && me.chain < 3) me.queued = true; return; }   // the next blow of the chain, as this one ends
    if (me.act === 'sling') return;
    if (what === 'strike') startStrike(false);
    else if (what === 'sling') {
      if (G.stones <= 0) { float('Out of stones!', me.x, 3.6, '#fca5a5'); return; }
      G.stones--; me.act = 'sling'; me.t = 0; me.thrown = false;
    }
  }
  function onKeyDown(e) {
    if (!root || root.hidden) return;
    if (G && G.q) {
      const i = { 1: 0, 2: 1, 3: 2, a: 0, b: 1, c: 2, A: 0, B: 1, C: 2 }[e.key];
      if (i != null && G.q.picked == null && i < G.q.choices.length) { e.preventDefault(); answer(i); }
      else if (e.key === 'Enter' && G.q.picked != null) { e.preventDefault(); afterQuestion(); }
      return;
    }
    if (root.dataset.view !== 'game') { if (e.key === 'Enter') { e.preventDefault(); start(); } return; }
    if (KEY[e.key]) { e.preventDefault(); keys.add(KEY[e.key]); }
    else if (TAP[e.key]) { e.preventDefault(); if (!e.repeat) act(TAP[e.key]); }
    else if (e.key === ' ') { e.preventDefault(); if (!e.repeat) act('strike'); }
    else if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') { e.preventDefault(); pause(!(G && G.paused)); }
  }
  function onKeyUp(e) { if (KEY[e.key]) keys.delete(KEY[e.key]); }
  function onClick(e) {
    const ans = e.target.closest('[data-ans]');
    if (ans) { answer(Number(ans.dataset.ans)); return; }
    const b = e.target.closest('[data-am]');
    if (!b) return;
    const a = b.dataset.am;
    wakeAudio();
    if (a === 'exit') close();
    else if (a === 'sound') { save({ muted: !saved().muted }); b.textContent = saved().muted ? '🔈' : '🔊'; }
    else if (a === 'start') start();
    else if (a === 'menu') { G = null; renderMenu(); }
    else if (a === 'pause') pause(!G.paused);
    else if (a === 'resume') pause(false);
    else if (a === 'quit') { pause(false); over(); }
    else if (a === 'next') afterQuestion();
  }
  // The touch pads: a held button is held (◀ ▶ ▲ BLOCK); SWORD and SLING act on the touch.
  const held = new Map();
  function onDown(e) {
    const h = e.target.closest('[data-hold]'), tp = e.target.closest('[data-tap]');
    if (!h && !tp) return;
    e.preventDefault(); wakeAudio();
    try { e.target.setPointerCapture(e.pointerId); } catch (err) {}
    if (h) { held.set(e.pointerId, h.dataset.hold); keys.add(h.dataset.hold); h.classList.add('on'); }
    else act(tp.dataset.tap);
  }
  function onUp(e) {
    const k = held.get(e.pointerId);
    if (k) { held.delete(e.pointerId); if (![...held.values()].includes(k)) keys.delete(k); root.querySelectorAll(`[data-hold="${k}"]`).forEach(b => b.classList.remove('on')); }
  }
  function onHide() { if (document.hidden && G && G.state === 'play') pause(true); }

  function start() {
    keys.clear(); held.clear();
    wakeAudio();
    newGame();
    renderGame();
    last = performance.now();
  }
  function frame(now) {
    if (!root || root.hidden) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (G && G.state === 'play' && root.dataset.view === 'game' && !G.paused && !G.q && !manual()) {
      if (G.ready > 0) G.ready = Math.max(0, G.ready - dt);
      else update(dt);
    }
    if (G && root.dataset.view === 'game') { draw(now); hud(); panel(); }
    raf = requestAnimationFrame(frame);
  }

  function injectCss() {
    if ($('amCss')) return;
    const css = document.createElement('style');
    css.id = 'amCss';
    css.textContent = `
      #ammon .am-top { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
      #ammon .am-hud { display: flex; gap: 6px; flex-wrap: wrap; margin-left: auto; }
      #ammon .am-btns { display: flex; gap: 6px; }
      #ammon .am-lost { color: #fca5a5; font-weight: 800; }
      #ammon .am-meter { position: relative; overflow: hidden; min-width: 84px; text-align: center; }
      #ammon .am-meter i { position: absolute; left: 0; top: 0; bottom: 0; background: rgba(251,191,36,.35); }
      #ammon .am-meter span { position: relative; }
      #ammon .am-meter.full { box-shadow: 0 0 0 2px #fbbf24, 0 0 14px rgba(251,191,36,.7); }
      #ammon .am-moves { padding: 10px 14px; border-radius: 14px; background: rgba(251,191,36,.08); border: 1px solid rgba(251,191,36,.3); }
      #ammon .am-moves ul { margin: 6px 0 0; padding-left: 20px; list-style: disc; display: grid; gap: 5px; font-size: 15px; line-height: 1.4; color: rgba(255,255,255,.88); }
      #ammon .am-right { position: relative; }
      #ammon .am-pad .am-act.am-power { position: absolute; right: 0; bottom: calc(100% + 10px); width: auto; height: 52px; padding: 0 16px; border-radius: 26px; background: rgba(217,119,6,.9); color: #fff; font-size: 14px; box-shadow: 0 0 18px rgba(251,191,36,.8); }
      #ammon .am-pad .am-act.am-power[hidden] { display: none; }
      #ammon .am-menu { max-width: 640px; width: 100%; margin: 14px auto 0; display: grid; gap: 12px; }
      #ammon .am-hero { display: block; width: 100%; height: auto; max-height: 34vh; aspect-ratio: 2 / 1; object-fit: cover; border-radius: 14px; box-shadow: 0 8px 28px rgba(0,0,0,.4); }
      #ammon .am-hook { font-size: 16px; line-height: 1.45; color: rgba(255,255,255,.88); margin: 0; }
      #ammon .am-how { margin: 0; padding-left: 20px; list-style: disc; display: grid; gap: 6px; font-size: 15px; line-height: 1.4; color: rgba(255,255,255,.85); }
      #ammon .am-scores ol { margin: 6px 0 0; padding: 0; list-style: none; display: grid; gap: 4px; counter-reset: r; }
      #ammon .am-scores li { display: flex; justify-content: space-between; gap: 10px; padding: 6px 10px; border-radius: 10px; background: rgba(255,255,255,.06); counter-increment: r; }
      #ammon .am-scores li span::before { content: counter(r) ". "; color: rgba(255,255,255,.55); }
      #ammon .am-note { color: rgba(255,255,255,.7); font-size: 14px; margin: 0; }
      #ammon .am-big { font-size: clamp(36px, 6vw, 64px); font-weight: 900; line-height: 1.1; }
      #ammon .am-panel { margin-top: 10px; height: 4.6em; overflow-y: auto; padding: 8px 12px; border-radius: 14px; background: rgba(0,0,0,.25); border: 1px solid rgba(255,255,255,.12); font-size: clamp(14px, 1.4vw, 18px); }
      #ammon .am-status { margin: 0 0 4px; line-height: 1.3; } #ammon .am-status .ok { color: #fde68a; } #ammon .am-status .no { color: #fca5a5; } #ammon .am-status small { color: rgba(255,255,255,.7); }
      #ammon .am-line { margin: 0; color: rgba(255,255,255,.82); line-height: 1.35; }
      #ammon .am-stage { flex: 1; min-height: 200px; display: grid; place-items: center; margin-top: 10px; }
      #ammon .am-frame { position: relative; border: 6px solid #6b3f1d; border-radius: 10px; box-shadow: 0 0 0 2px #3b220e, 0 10px 30px rgba(0,0,0,.5); line-height: 0; }
      #ammon canvas { display: block; touch-action: none; border-radius: 4px; }
      #ammon .am-box[hidden] { display: none; }
      #ammon .am-box { position: absolute; inset: 0; display: grid; place-items: center; background: rgba(15,10,5,.6); line-height: 1.35; overflow-y: auto; padding: 10px; }
      #ammon .am-card { width: min(560px, 100%); display: grid; gap: 10px; padding: 16px; border-radius: 16px; background: rgba(20,16,40,.95); border: 1px solid rgba(255,255,255,.15); }
      #ammon .am-q { margin: 0; font-weight: 800; font-size: clamp(16px, 1.8vw, 21px); line-height: 1.3; }
      #ammon .am-choices { display: grid; gap: 8px; }
      #ammon .am-choice { display: flex; gap: 10px; align-items: center; text-align: left; padding: 10px 12px; border-radius: 12px; border: 2px solid rgba(255,255,255,.18); background: rgba(255,255,255,.06); color: #fff; font: inherit; font-weight: 700; cursor: pointer; }
      #ammon .am-choice b { display: grid; place-items: center; min-width: 1.7em; height: 1.7em; border-radius: 8px; background: rgba(255,255,255,.14); }
      #ammon .am-choice.right { border-color: #4ade80; background: rgba(74,222,128,.18); } #ammon .am-choice.wrong { border-color: #f87171; background: rgba(248,113,113,.15); }
      #ammon .am-why { margin: 0; font-size: 15px; } #ammon .am-why .ok { color: #86efac; } #ammon .am-why .no { color: #fca5a5; }
      #ammon .am-pads { position: fixed; left: 12px; right: 12px; bottom: calc(var(--sab, 0px) + 14px); display: flex; justify-content: space-between; align-items: flex-end; gap: 8px; z-index: 5; pointer-events: none; }
      #ammon .am-pad { display: flex; gap: 8px; pointer-events: auto; }
      #ammon .am-pad button { width: 64px; height: 64px; border-radius: 50%; border: 3px solid rgba(253,230,138,.8); background: rgba(120,53,15,.72); color: #fde68a; font: 900 20px system-ui, sans-serif; touch-action: none; user-select: none; -webkit-user-select: none; }
      #ammon .am-pad .am-act { width: 76px; height: 76px; font-size: 13px; letter-spacing: .04em; }
      #ammon .am-pad button.on, #ammon .am-pad button:active { background: rgba(253,224,71,.55); color: #422006; }
      @media (max-width: 520px) {
        #ammon .board-title { font-size: 18px; } #ammon .am-name .eyebrow { display: none; }
        #ammon .am-top { display: grid; grid-template-columns: 1fr auto; } #ammon .am-hud { grid-column: 1 / -1; grid-row: 2; margin-left: 0; }
        #ammon .am-btns .btn { padding: 8px 12px; } #ammon .score-chip { padding: 4px 10px; font-size: 13px; }
        #ammon .am-pad { gap: 6px; } #ammon .am-pad button { width: 48px; height: 48px; font-size: 17px; } #ammon .am-pad .am-act { width: 56px; height: 56px; font-size: 10px; }
        #ammon .am-pad .am-act.am-power { width: auto; height: 46px; font-size: 13px; }
      }`;
    document.head.appendChild(css);
  }

  function open(h) {
    host = h;
    STORE = (h.ns || 'treasureup.') + 'ammon.v1';
    root = $('ammon');
    if (!root) return;
    injectCss();
    root.hidden = false;
    document.body.style.overflow = 'hidden';
    G = null;
    ['sebus', 'ammon-ready', 'ammon-walk1', 'ammon-walk2', 'ammon-strike', 'ammon-sling', 'ammon-block', 'robber-walk', 'robber-attack', 'robber-hit', 'robber-flee',
      'chief-ready', 'chief-charge', 'chief-smash', 'chief-flee', 'sheep-graze', 'sheep-run', 'stone', 'pouch'].forEach(pic);
    renderMenu();
    const kd = e => onKeyDown(e), ku = e => onKeyUp(e), ck = e => onClick(e), dn = e => onDown(e), up = e => onUp(e), vis = () => onHide();
    const blur = () => { keys.clear(); held.clear(); };
    window.addEventListener('keydown', kd); window.addEventListener('keyup', ku); window.addEventListener('blur', blur);
    root.addEventListener('click', ck); root.addEventListener('pointerdown', dn);
    window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
    document.addEventListener('visibilitychange', vis);
    off = () => {
      window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku); window.removeEventListener('blur', blur);
      root.removeEventListener('click', ck); root.removeEventListener('pointerdown', dn);
      window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up);
      document.removeEventListener('visibilitychange', vis);
    };
    last = performance.now();
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(frame);
  }
  function close() {
    if (G && G.state === 'play' && G.score > 0) over();   // a game left early still counts
    cancelAnimationFrame(raf);
    if (off) off();
    off = null; G = null; keys.clear(); held.clear();
    if (root) { root.hidden = true; root.innerHTML = ''; }
    document.body.style.overflow = '';
    if (host && host.closed) host.closed();
  }

  window.TUAmmon = {
    open, close,
    // For the tests (with window.TU_AMMON_MANUAL set, nothing moves until step()).
    _t: {
      state: () => G, T,
      step(ms = 50) { for (let t = 0; t < ms && G && G.state === 'play' && !G.q; t += 50) update(Math.min(50, ms - t) / 1000); if (G && root.dataset.view === 'game') { hud(); panel(); draw(performance.now()); } },
      key(name, down) { down ? keys.add(name) : keys.delete(name); }, act, hold(on) { G.hold = !!on; },
      robber(x, opts) { G.robbers.push(Object.assign({ kind: 'robber', x, face: x > G.me.x ? -1 : 1, hp: 2, act: 'walk', t: 0, kx: 0, speed: 2.3, step: 0 }, opts || {})); G.wave.spawned++; },
      answer, next: afterQuestion, draw: () => draw(performance.now())
    }
  };
})();
