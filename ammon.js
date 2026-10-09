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
    chainWin: 0.38, chainPush: 1.4, finishPush: 3.8, combo: 50, counterWin: 0.65, daze: 0.7, lunge: 22,
    power: 100, together: 0.2, flash: 0.6,
    fill: { robber: 7, chief: 20, gather: 5, counter: 8, combo: 6, bash: 5, launch: 6, right: 25 }
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
      mighty: [[262, 0.06], [392, 0.06], [523, 0.06], [784, 0.08], [1047, 0.22]], gather: [[659, 0.06], [880, 0.08]], clear: [[523, 0.09], [659, 0.09], [784, 0.09], [1047, 0.2]], over: [[392, 0.2], [330, 0.2], [262, 0.4]], right: [[784, 0.08], [1047, 0.14]], wrong: [[220, 0.2]],
      slash: [[540, 0.04], [280, 0.04]], bash: [[240, 0.05], [120, 0.07]], launch: [[320, 0.04], [640, 0.07]], dash: [[360, 0.03], [180, 0.04]] }[kind] || [];
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
      shake: 0, hitstop: 0, sparks: [],
      me: { x: 0, y: 0, vy: 0, vx: 0, hp: 100, hpMax: 100, face: 1, act: 'ready', t: 0, stun: 0, step: 0, chain: 0, chainUntil: 0, counterUntil: 0, lx: 0, hits: 0, buffer: null, landTimer: 0, k: { left: 'left', right: 'right', up: 'up', block: 'block', strike: 'strike', sling: 'sling', power: 'power' } },
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
    G.robbers.push({ kind: 'robber', x: left ? -1 : G.w + 1, y: 0, vy: 0, face: left ? 1 : -1, hp: L >= 4 ? 3 : 2, act: 'walk', t: 0, kx: 0,
      speed: Math.min(T.robberMax, T.robberSpeed + (L - 1) * T.robberStep) * (0.85 + G.rand() * 0.3), step: G.rand() });
    G.wave.spawned++;
  }
  function spawnChief() {
    G.wave.chief = true;
    G.robbers.push({ kind: 'chief', x: G.w + 1.5, y: 0, vy: 0, face: -1, hp: 5 + 2 * G.level, hpMax: 5 + 2 * G.level, act: 'walk', t: 0, kx: 0, speed: 2.1 + 0.15 * G.level, charge: 2.5, step: 0 });
    G.banner = { title: 'The robbers’ leader!', small: '', line: W().chief, until: G.time + 2.5 };
  }

  function float(text, x, y, color) { G.floats.push({ text, x, y, color, at: G.time }); }
  function spark(x, y, vx, vy, color, size, life) {
    if (!G || !G.sparks) return;
    G.sparks.push({ x, y, vx, vy, color: color || '#fbbf24', size: size || 3, life: life || 0.35, maxLife: life || 0.35 });
  }


  function update(dt) {
    if (!G || G.state !== 'play' || G.q) return;
    if (G.hitstop > 0) {
      G.hitstop = Math.max(0, G.hitstop - dt);
      return;
    }
    G.time += dt;
    if (G.between > 0) {
      G.between -= dt;
      if (G.between <= 0) askQuestion();
      return;
    }
    const me = G.me;
    if (me.landTimer > 0) me.landTimer = Math.max(0, me.landTimer - dt);
    if (me.stun > 0) { me.stun -= dt; me.act = 'stun'; }
    else if (me.act === 'stun') me.act = 'ready';
    if (me.lx) { const k = Math.sign(me.lx) * Math.min(Math.abs(me.lx), T.lunge * dt); me.x += k; me.lx -= k; }   // a chained blow or a counter steps in
    if (me.act === 'strike' || me.act === 'sling') {
      me.t += dt;
      if (me.act === 'strike' && !me.landed && me.t >= T.strikeHit[0]) {
        me.landed = true;
        const k = me.kind;
        const reach = T.reach + (k === 'air' ? 0.6 : k === 'bash' ? 0.7 : k === 'slide' ? 0.9 : k === 'finish' ? 0.6 : 0);
        const hit = G.robbers.filter(r => {
          const frontOrClose = Math.sign(r.x - me.x) === me.face || Math.abs(r.x - me.x) < 0.6;
          return r.act !== 'flee' && frontOrClose && Math.abs(r.x - me.x) < reach + (r.kind === 'chief' ? 0.3 : 0) && (k !== 'air' || Math.abs((r.y || 0) - me.y) < 2.0);
        });
        if (hit.length) me.hits++;
        const finish = k === 'finish' && me.hits >= 3;
        let label = null, pushDist = T.push, dazeTime = 0, dmg = 1, hitSound = 'hit', shakeAmt = 0.22, hitstopAmt = 0.04;

        if (k === 'air') {
          const juggled = hit.some(r => (r.y || 0) > 0.3);
          if (juggled) {
            label = 'Air Juggle! +75'; G.score += 75; dmg = 2; pushDist = T.finishPush; hitSound = 'combo'; shakeAmt = 0.45; hitstopAmt = 0.07; addPower(T.fill.combo);
          } else {
            label = 'Overhead!'; dmg = 2; dazeTime = T.daze; pushDist = 1.4; hitSound = 'hit'; shakeAmt = 0.3;
          }
        } else if (k === 'counter') {
          label = 'Counter! +60'; G.score += 60; dmg = 2; dazeTime = T.daze * 1.5; pushDist = T.push * 1.5; addPower(T.fill.counter); hitSound = 'combo'; shakeAmt = 0.55; hitstopAmt = 0.07;
        } else if (k === 'bash') {
          label = 'Shield Bash!'; dmg = 1; dazeTime = 0.6; pushDist = 3.2; hitSound = 'bash'; shakeAmt = 0.35; hitstopAmt = 0.05; addPower(T.fill.bash);
        } else if (k === 'launcher') {
          label = 'Rising Uppercut!'; dmg = 2; dazeTime = 0.8; pushDist = 1.2; hitSound = 'launch'; shakeAmt = 0.38; hitstopAmt = 0.05; addPower(T.fill.launch);
          hit.forEach(r => { r.vy = 9.8; r.y = 0.1; });
        } else if (k === 'slide') {
          label = 'Slide Sweep!'; dmg = 1; dazeTime = 0.6; pushDist = 2.0; hitSound = 'hit'; shakeAmt = 0.25; addPower(4);
        } else if (finish) {
          label = `3-hit combo! +${T.combo}`; G.score += T.combo; G.combos++; dmg = 2; pushDist = T.finishPush; addPower(T.fill.combo); hitSound = 'combo'; shakeAmt = 0.6; hitstopAmt = 0.07;
        } else if (k === 'chain2') {
          label = '2 hits!'; pushDist = 1.2; dmg = 1; shakeAmt = 0.25;
        } else {
          pushDist = 0.85; dmg = 1; shakeAmt = 0.18;
        }

        if (hit.length) {
          G.shake = Math.max(G.shake || 0, shakeAmt);
          G.hitstop = Math.max(G.hitstop || 0, hitstopAmt);
          sound(hitSound);
          hit.forEach((r, i) => {
            const sparkCol = finish || k === 'counter' ? '#fbbf24' : k === 'bash' ? '#60a5fa' : '#fef08a';
            for (let sp = 0; sp < (finish || k === 'counter' ? 8 : 4); sp++) {
              spark(r.x, 1.6 + (r.y || 0), (Math.random() - 0.5) * 8, Math.random() * 6 + 1, sparkCol, 3, 0.3);
            }
            hurt(r, dmg, me.face, { push: pushDist, daze: dazeTime, label: i ? null : label });
          });
        }
      }
      if (me.act === 'sling' && !me.thrown && me.t >= (me.isBurst ? 0.08 : T.slingAt)) {
        me.thrown = true;
        const spd = me.isBurst ? T.stoneSpeed * 1.3 : T.stoneSpeed;
        G.shots.push({ x: me.x + me.face * 0.7, y: 2.2, vx: me.face * spd, vy: me.isBurst ? 1.5 : 3, burst: me.isBurst });
        sound('sling');
        if (me.isBurst) {
          G.shake = Math.max(G.shake || 0, 0.25);
          for (let sp = 0; sp < 5; sp++) spark(me.x + me.face * 0.7, 2.2, me.face * (Math.random() * 6 + 4), (Math.random() - 0.5) * 4, '#38bdf8', 3, 0.25);
        }
      }
      if (me.t >= (me.act === 'strike' ? T.strike : (me.isBurst ? 0.28 : T.sling))) {
        const was = me.act;
        me.act = 'ready'; me.t = 0; me.isBurst = false;
        if (was === 'strike') {
          if (me.queued) {
            startStrike(me, true);
          } else if (me.buffer && G.time - me.buffer.time < 0.25) {
            const buf = me.buffer; me.buffer = null;
            if (buf.what === me.k.strike) {
              const override = buf.block ? 'bash' : (buf.up ? 'launcher' : (buf.moving && me.y <= 0 ? 'slide' : null));
              startStrike(me, false, override);
            } else {
              act(buf.what);
            }
          } else {
            me.chainUntil = G.time + T.chainWin;
          }
        } else if (me.buffer && G.time - me.buffer.time < 0.25) {
          const buf = me.buffer; me.buffer = null;
          if (buf.what === me.k.strike) {
            const override = buf.block ? 'bash' : (buf.up ? 'launcher' : (buf.moving && me.y <= 0 ? 'slide' : null));
            startStrike(me, false, override);
          } else {
            act(buf.what);
          }
        }
      }
    }
    const blocking = me.act !== 'stun' && keys.has(me.k.block) && me.y <= 0;
    if (me.act === 'ready' || me.act === 'walk' || me.act === 'block') me.act = blocking ? 'block' : 'ready';
    let mx = (keys.has(me.k.right) ? 1 : 0) - (keys.has(me.k.left) ? 1 : 0);
    if (me.act !== 'stun' && !blocking && me.act !== 'sling') {
      if (mx) {
        me.vx = (me.vx || 0) * 0.6 + mx * T.speed * 0.4;
        me.x += me.vx * dt * (me.act === 'strike' ? (me.kind === 'slide' ? 1.4 : 0.25) : 1);
        if (me.act !== 'strike') me.face = mx;
        if (me.act === 'ready') me.act = 'walk';
        me.step += dt * 6;
      } else {
        me.vx = (me.vx || 0) * Math.max(0, 1 - dt * 16);
        me.x += me.vx * dt;
      }
      if (keys.has(me.k.up) && me.y <= 0) { me.vy = T.jump; }
    } else {
      me.vx = 0;
    }
    if (me.y > 0 || me.vy > 0) {
      me.vy -= T.gravity * dt; me.y = Math.max(0, me.y + me.vy * dt);
      if (me.y <= 0) {
        me.vy = 0; me.landTimer = 0.08;
        if (mx) spark(me.x, 0.1, -mx * 3, 2, '#d1d5db', 2, 0.2);
      }
    }
    me.x = Math.max(0.6, Math.min(G.w - 0.6, me.x));
    // Gathering: walk to a scattered sheep and it runs home.
    for (const s of G.sheep) if ((s.state === 'stray' || s.state === 'run') && Math.abs(s.x - me.x) < 1 && me.y < 1) {
      s.state = 'return'; G.gathered++; G.score += 25; me.hp = Math.min(me.hpMax || 100, (me.hp || 100) + 15); float('Gathered! +15 HP +25', s.x, 2.2, '#bbf7d0'); sound('gather'); addPower(T.fill.gather); hud();
    }
    // ----- stones -----
    
    // ----- particle sparks -----
    if (G.sparks && G.sparks.length) {
      for (const p of G.sparks) {
        p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy -= 12 * dt;
      }
      G.sparks = G.sparks.filter(p => p.life > 0);
    }
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
      d.taken = true; const n = Math.min(3, T.stonesMax - G.stones); G.stones += n; float(n ? `+${n} stones` : 'Pouch full', d.x, 1.8, '#e5e7eb'); hud();
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
    for (const r of G.robbers) robber(r, dt);
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
  function robber(r, dt) {
    const me = G.me, chief = r.kind === 'chief';
    const blocking = me.act !== 'stun' && keys.has(me.k.block) && me.y <= 0;
    r.t += dt; r.step += dt * 5;

    // Airborne physics when juggled or launched
    if (r.vy || (r.y || 0) > 0) {
      r.vy = (r.vy || 0) - 26 * dt;
      r.y = Math.max(0, (r.y || 0) + r.vy * dt);
      if (r.y <= 0) {
        r.y = 0; r.vy = 0;
        if (r.act === 'hit') r.t = 0;
        spark(r.x, 0.1, -r.face * 3, 2, '#d1d5db', 2, 0.2);
      }
    }

    if (r.kx) { const k = Math.sign(r.kx) * Math.min(Math.abs(r.kx), 9 * dt); r.x += k; r.kx -= k; }
    if (r.act === 'flee') { r.x += r.face * 6.5 * dt; return; }
    if (r.act === 'hit') { if (r.t > (r.daze || 0.35) && (r.y || 0) <= 0) { r.act = 'walk'; r.t = 0; r.daze = 0; } return; }
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
            const dmg = chief ? 25 : 15;
            me.hp = Math.max(0, (me.hp != null ? me.hp : 100) - dmg);
            me.stun = chief ? T.chiefStun : T.stun; me.act = 'stun'; me.t = 0;
            me.x = Math.max(0.6, Math.min(G.w - 0.6, me.x + r.face * (chief ? 2.4 : 1.3)));
            G.shake = Math.max(G.shake || 0, chief ? 0.65 : 0.4);
            float(me.hp <= 0 ? 'Down! Stand firm!' : `Stunned! -${dmg} HP`, me.x, 3.6, '#fca5a5'); sound('stun');
            if (me.hp <= 0) { me.stun = 2.2; me.hp = 50; }
            hud();
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
          else {
            const dmg = 30;
            me.hp = Math.max(0, (me.hp != null ? me.hp : 100) - dmg);
            me.stun = T.chiefStun; me.act = 'stun'; me.x = Math.max(0.6, Math.min(G.w - 0.6, me.x + r.face * 3));
            G.shake = Math.max(G.shake || 0, 0.75);
            float(me.hp <= 0 ? 'Down! Stand firm!' : `Stunned! -${dmg} HP`, me.x, 3.6, '#fca5a5'); sound('stun'); r.act = 'recover'; r.t = 0;
            if (me.hp <= 0) { me.stun = 2.2; me.hp = 50; }
            hud();
          }
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
  // Sword combat: 3-hit combo chain, rising launcher uppercut, shield bash, slide sweep, overhead air cleave, and parry counter.
  function startStrike(me, chained, overrideKind) {
    let kind = overrideKind || 'strike';
    const moving = keys.has(me.k.left) || keys.has(me.k.right);
    const holdingUp = keys.has(me.k.up);
    const holdingBlock = keys.has(me.k.block);

    if (overrideKind) {
      kind = overrideKind;
    } else if (holdingBlock) {
      kind = 'bash'; me.chain = 0; me.hits = 0;
    } else if (holdingUp && me.y <= 0.35) {
      kind = 'launcher'; me.chain = 0; me.hits = 0;
    } else if (G.time < me.counterUntil) {
      kind = 'counter'; me.chain = 1; me.hits = 0;
    } else if (me.y > 0.25) {
      kind = 'air'; me.chain = 0; me.hits = 0;
    } else if (moving && me.y <= 0 && me.chain === 0) {
      kind = 'slide'; me.chain = 0; me.hits = 0;
    } else {
      me.chain = (chained || G.time < me.chainUntil) && me.chain > 0 && me.chain < 3 ? me.chain + 1 : 1;
      if (me.chain === 1) { me.hits = 0; kind = 'strike'; }
      else if (me.chain === 2) { kind = 'chain2'; }
      else if (me.chain === 3) { kind = 'finish'; }
    }
    me.act = 'strike'; me.kind = kind; me.t = 0; me.landed = false; me.queued = false; me.chainUntil = 0; me.counterUntil = 0;

    if (kind === 'counter' || me.chain > 1) {
      const range = kind === 'counter' ? 4.5 : 3.8;
      const front = G.robbers.filter(r => r.act !== 'flee' && Math.sign(r.x - me.x) === me.face && Math.abs(r.x - me.x) < range)
        .sort((a, b) => Math.abs(a.x - me.x) - Math.abs(b.x - me.x))[0];
      if (front && Math.abs(front.x - me.x) > 1.35) me.lx = (Math.abs(front.x - me.x) - 1.35) * me.face;
      sound(kind === 'counter' ? 'combo' : 'slash');
    } else if (kind === 'slide') {
      me.lx = me.face * 3.6;
      sound('dash');
      spark(me.x, 0.1, -me.face * 5, 2, '#fff', 3, 0.25);
    } else if (kind === 'bash') {
      me.lx = me.face * 1.8;
      sound('bash');
    } else if (kind === 'launcher') {
      me.vy = 8.8; me.lx = me.face * 1.2;
      sound('launch');
    } else {
      sound('slash');
    }
  }
  // Sword and sling together, with the meter full: a stone "with mighty power" at every robber on the field.
  

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
    if (right) { G.score += 200; G.stones = Math.min(T.stonesMax, G.stones + 4); G.me.hp = G.me.hpMax || 100; G.shieldNext = true; addPower(T.fill.right); sound('right'); hud(); }
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
  function sprite(ctx, name, x, gy, u, face, alpha, tr) {
    const s = SPR[name], im = pic(name);
    if (!s || !im) return false;
    const k = SCALE[name.split('-')[0]] * u, w = s[0] * k, h = s[1] * k;
    ctx.save();
    if (alpha != null) ctx.globalAlpha = alpha;
    ctx.translate(x, gy);
    if (tr) {
      if (tr.dx || tr.dy) ctx.translate(tr.dx || 0, tr.dy || 0);
      if (tr.rot) ctx.rotate(face < 0 ? -tr.rot : tr.rot);
      if (tr.sx != null || tr.sy != null) ctx.scale(tr.sx != null ? tr.sx : 1, tr.sy != null ? tr.sy : 1);
    }
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
    // Screen shake
    if (G && G.shake > 0) {
      G.shake = Math.max(0, G.shake - 0.05);
      const shakePx = G.shake * u * 0.4;
      ctx.translate((Math.random() - 0.5) * shakePx * 2, (Math.random() - 0.5) * shakePx * 2);
    }
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
      if (s.state === 'stray') { ctx.fillStyle = '#fde68a'; ctx.font = `900 ${Math.round(u * 0.5)}px 'Courier New', Courier, monospace`; ctx.textAlign = 'center'; ctx.fillText('!', X(s.x), sheepY(s) - u * 1.6); }
    }
    for (const d of G.drops) { shadow(d.x, 0.35); sprite(ctx, 'pouch', X(d.x), gy, u, 1) || (ctx.fillStyle = '#7c4a1e', ctx.fillRect(X(d.x) - u * 0.3, gy - u * 0.6, u * 0.6, u * 0.6)); }
    for (const r of G.robbers) {
      const chief = r.kind === 'chief', set = chief ? 'chief' : 'robber';
      const name = r.act === 'flee' ? `${set}-flee` : r.act === 'hit' ? (chief ? 'chief-ready' : 'robber-hit') : r.act === 'windup' ? (chief ? 'chief-smash' : 'robber-attack')
        : r.act === 'charge' ? 'chief-charge' : chief ? 'chief-ready' : 'robber-walk';
      const bob = r.act === 'walk' || r.act === 'flee' || r.act === 'charge' ? Math.abs(Math.sin(r.step * 2)) * u * 0.1 : 0;
      shadow(r.x, chief ? 0.8 : 0.6);
      let rTr = null;
      if (r.act === 'hit') {
        if ((r.y || 0) > 0.2) rTr = { rot: r.t * 8 * r.face, sx: 1.1, sy: 1.1 };
        else rTr = { rot: -r.face * 0.24, sx: 1.08, sy: 0.94 };
      } else if (r.act === 'charge') {
        rTr = { rot: r.face * 0.18, sx: 1.1, sy: 0.95 };
      }
      const ry = gy - bob - X(r.y || 0);
      if (!sprite(ctx, name, X(r.x), ry, u, r.face, r.act === 'hit' && Math.floor(t / 60) % 2 ? 0.6 : 1, rTr)) {
        ctx.fillStyle = chief ? '#7f1d1d' : '#b45309'; ctx.fillRect(X(r.x) - u * 0.4, ry - u * 3, u * 0.8, u * 3);
      }
      if (chief && r.act !== 'flee') {
        const bw = u * 2, bx = X(r.x) - bw / 2, by = ry - u * 4.2;
        ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(bx, by, bw, u * 0.22);
        ctx.fillStyle = '#ef4444'; ctx.fillRect(bx, by, bw * Math.max(0, r.hp) / r.hpMax, u * 0.22);
      }
    }
    const me = G.me;
    const walkFrame = Math.floor(me.step) % 2 ? 'ammon-walk1' : 'ammon-walk2';
    const name = me.act === 'strike' ? (me.kind === 'bash' ? 'ammon-block' : 'ammon-strike') : me.act === 'sling' ? 'ammon-sling' : me.act === 'block' ? 'ammon-block' : me.act === 'walk' && me.y <= 0 ? walkFrame : 'ammon-ready';
    shadow(me.x, 0.6 - Math.min(0.3, me.y * 0.08));
    if (G.time < G.shieldUntil) {
      const gl = ctx.createRadialGradient(X(me.x), gy - u * 1.6 - X(me.y), u * 0.4, X(me.x), gy - u * 1.6 - X(me.y), u * 2.4);
      gl.addColorStop(0, 'rgba(253,230,138,.45)'); gl.addColorStop(1, 'rgba(253,230,138,0)'); ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(X(me.x), gy - u * 1.6 - X(me.y), u * 2.4, 0, 7); ctx.fill();
    }

    // Procedural animation transforms for Ammon
    let meTr = null;
    if (me.act === 'strike') {
      const prog = me.t / T.strike;
      if (me.kind === 'finish') {
        const leap = Math.sin(prog * Math.PI) * u * 0.4;
        meTr = { dy: -leap, rot: 0.26, sx: 1.14, sy: 1.08 };
      } else if (me.kind === 'launcher') {
        meTr = { dy: -u * 0.35 * (1 - prog), rot: -0.32, sx: 0.88, sy: 1.22 };
      } else if (me.kind === 'slide') {
        meTr = { dy: u * 0.32, rot: 0.45, sx: 1.34, sy: 0.72 };
      } else if (me.kind === 'bash') {
        meTr = { dx: me.face * u * 0.32, rot: 0.14, sx: 1.12, sy: 0.96 };
      } else if (me.kind === 'air') {
        meTr = { rot: 0.35, sx: 1.05, sy: 1.1 };
      } else if (me.kind === 'chain2') {
        meTr = { rot: -0.16, sx: 1.08, sy: 0.98 };
      } else {
        meTr = { dx: me.face * u * 0.18, rot: 0.14, sx: 1.06, sy: 1.0 };
      }
    } else if (me.act === 'stun') {
      meTr = { rot: Math.sin(G.time * 22) * 0.22, sx: 0.95, sy: 0.95 };
    } else if (me.y > 0) {
      const stretch = me.vy > 0 ? 1.12 : 0.94;
      meTr = { sx: 1 / Math.sqrt(stretch), sy: stretch };
    } else if (me.landTimer > 0) {
      meTr = { sx: 1.15, sy: 0.85 };
    }

    if (!sprite(ctx, name, X(me.x), gy - X(me.y), u, me.face, me.act === 'stun' && Math.floor(t / 80) % 2 ? 0.45 : 1, meTr)) {
      ctx.fillStyle = '#2563eb'; ctx.fillRect(X(me.x) - u * 0.4, gy - u * 3.1 - X(me.y), u * 0.8, u * 3.1);
    }
    if (me.act === 'stun') { ctx.fillStyle = '#fde68a'; ctx.font = `${Math.round(u * 0.6)}px 'Courier New', Courier, monospace`; ctx.textAlign = 'center'; ctx.fillText('💫', X(me.x), gy - u * 3.5 - X(me.y)); }

    // Dynamic sword sweep effects
    if (me.act === 'strike' && me.t > 0.02 && me.t < 0.26) {
      const a = 1 - (me.t - 0.02) / 0.24, cx = X(me.x) + me.face * u * 0.5, cy = gy - u * 1.9 - X(me.y);
      ctx.save(); ctx.globalAlpha = Math.max(0, a); ctx.lineCap = 'round';
      if (me.kind === 'bash') {
        ctx.strokeStyle = '#60a5fa'; ctx.lineWidth = u * 0.35;
        ctx.beginPath();
        if (me.face > 0) ctx.ellipse(cx + u * 0.6, cy, u * 0.7, u * 1.6, 0, -1.2, 1.2);
        else ctx.ellipse(cx - u * 0.6, cy, u * 0.7, u * 1.6, 0, Math.PI - 1.2, Math.PI + 1.2);
        ctx.stroke();
      } else if (me.kind === 'slide') {
        ctx.strokeStyle = '#fef08a'; ctx.lineWidth = u * 0.24;
        ctx.beginPath();
        ctx.moveTo(X(me.x) - me.face * u * 0.8, gy - u * 0.3);
        ctx.lineTo(X(me.x) + me.face * u * 1.8, gy - u * 0.3);
        ctx.stroke();
      } else if (me.kind === 'launcher') {
        ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = u * 0.32;
        ctx.beginPath();
        if (me.face > 0) ctx.arc(cx, cy, u * 1.8, -2.1, 0.4);
        else ctx.arc(cx, cy, u * 1.8, Math.PI - 0.4, Math.PI + 2.1);
        ctx.stroke();
      } else {
        const big = me.kind === 'finish' || me.kind === 'counter' || me.kind === 'air';
        const rad = u * (big ? 2.0 : me.kind === 'chain2' ? 1.7 : 1.5);
        const from = me.kind === 'air' ? -1.6 : me.kind === 'chain2' ? -0.8 : -1.2;
        const to = me.kind === 'air' ? 1.3 : me.kind === 'chain2' ? 1.2 : 0.9;
        ctx.strokeStyle = big ? '#fbbf24' : me.kind === 'chain2' ? '#38bdf8' : 'rgba(255,255,255,.9)';
        ctx.lineWidth = u * (big ? 0.36 : 0.22);
        ctx.beginPath();
        if (me.face > 0) ctx.arc(cx, cy, rad, from, to); else ctx.arc(cx, cy, rad, Math.PI - to, Math.PI - from);
        ctx.stroke();
      }
      ctx.restore();
    }
    
    // Render particle sparks
    if (G.sparks && G.sparks.length) {
      G.sparks = G.sparks.filter(p => p.life > 0);
      for (const p of G.sparks) {
        p.life -= 0.03; p.x += p.vx * 0.03; p.y += p.vy * 0.03; p.vy -= 12 * 0.03;
        const alpha = Math.max(0, p.life / p.maxLife);
        ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(X(p.x), gy - X(p.y), u * 0.06 * p.size, 0, 7); ctx.fill();
        ctx.restore();
      }
    }
    for (const st of G.shots) {
      if (st.target) { ctx.fillStyle = 'rgba(251,191,36,.45)'; ctx.beginPath(); ctx.ellipse(X(st.x - Math.sign(st.vx) * 0.5), gy - X(st.y), u * 0.7, u * 0.18, 0, 0, 7); ctx.fill(); }
      sprite(ctx, 'stone', X(st.x), gy - X(st.y), u, 1) || (ctx.fillStyle = '#9ca3af', ctx.beginPath(), ctx.arc(X(st.x), gy - X(st.y), u * 0.2, 0, 7), ctx.fill());
    }
    // Mighty power: a flash of gold over the field
    if (G.time - G.flashAt < T.flash) { ctx.fillStyle = `rgba(253,230,138,${0.45 * (1 - (G.time - G.flashAt) / T.flash)})`; ctx.fillRect(0, 0, cw, ch); }
    // Words that float up and fade
    ctx.textAlign = 'center'; ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,.6)';
    ctx.font = `900 ${Math.round(Math.max(12, u * 0.5))}px 'Courier New', Courier, monospace`;
    G.floats = G.floats.filter(f => G.time - f.at < 1.2);
    for (const f of G.floats) { const a = 1 - (G.time - f.at) / 1.2, y = gy - X(f.y) - (G.time - f.at) * u * 1.2; ctx.globalAlpha = a; ctx.fillStyle = f.color; ctx.strokeText(f.text, X(f.x), y); ctx.fillText(f.text, X(f.x), y); }
    ctx.globalAlpha = 1;
    // 3, 2, 1, and the banner between levels
    if (G.ready > 0 || (G.banner && G.time < (G.banner.until || 0))) {
      const big = G.ready > 0 ? String(Math.ceil(G.ready)) : G.banner.title;
      ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.fillRect(0, 0, cw, ch);
      ctx.fillStyle = '#fff'; ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.lineWidth = 6;
      ctx.font = `900 ${Math.round(Math.min(cw, ch) * (G.ready > 0 ? 0.3 : 0.09))}px 'Courier New', Courier, monospace`;
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
      <div class="am-moves"><div class="eyebrow">Moves & Combos</div><ul>
        <li><b>3-Hit Blade Chain:</b> ${coarse() ? 'Tap <b>A</b>' : 'Sword (<b>J</b> or <b>Z</b>)'} 3× in rhythm. The 3rd hit leaps with a golden finisher (+${T.combo} pts)!</li>
        <li><b>Shield Bash (Crowd Control):</b> Hold Block (${coarse() ? '<b>X</b>' : '<b>L</b>'}) + tap Sword (${coarse() ? '<b>A</b>' : '<b>J</b>'}). Ammon shoves with his shield, blasting robbers back!</li>
        <li><b>Rising Uppercut & Air Juggle:</b> Jump or hold Up + Sword. Launches the robber airborne! Jump up and strike again for an <b>Air Juggle (+75)</b>!</li>
        <li><b>Slide Sweep:</b> Run forward + Sword while on the ground. Ammon sweeps low, tripping robbers and sliding under clubs!</li>
        <li><b>Sling Burst (Cancel):</b> Tap Sling (${coarse() ? '<b>B</b>' : '<b>K</b>'}) right after a sword strike for an instant point-blank blast!</li>
        <li><b>Parry Counter:</b> Hold Block facing a club right as it strikes, then tap Sword right away for a devastating counter-thrust!</li>
        <li><b>⚡ Mighty Power:</b> Fill the meter, then tap <b>⚡ POWER</b> (or <b>E</b>): an enchanted stone strikes every robber on the field!</li>
      </ul></div>
      <div class="am-scores">${scoresHtml()}</div></div>`);
    hud();
  }
  function renderGame() {
    root.dataset.view = 'game';
    const pads = coarse() ? `<div class="am-pads arcade-deck">
      <!-- Floating Dynamic Joystick Zone (touch & drag anywhere on left half) -->
      <div class="am-joy-zone" id="joyZone">
        <div class="arcade-joy floating-joy" id="joyBase" style="display: none;">
          <div class="joy-stick"></div>
          <div class="joy-ball red" id="joyBall"></div>
        </div>
        <div class="joy-hint" id="joyHint">◀ TOUCH &amp; DRAG TO MOVE ▶</div>
      </div>

      <!-- Ergonomic Thumb Arc Action Cluster -->
      <div class="am-btn-cluster" id="btnCluster">
        <!-- Mighty Power Button (pops up above cluster when 100% full) -->
        <button data-tap="power" class="arcade-btn am-power-btn" id="amPowerBtn" hidden aria-label="Mighty Power">
          ⚡ MIGHTY POWER!
        </button>

        <!-- Top-Left: Dedicated Jump Button -->
        <button data-hold="up" class="arcade-btn green btn-jump" aria-label="Jump">
          <span class="btn-lbl">▲</span>
          <span class="btn-sub">JUMP</span>
        </button>

        <!-- Top-Right: Sling Button with live Stone Badge -->
        <button data-tap="sling" class="arcade-btn yellow btn-sling" aria-label="Sling">
          <span class="btn-lbl">B</span>
          <span class="btn-sub">SLING</span>
          <span class="btn-badge" id="btnStoneBadge">${G.stones}</span>
        </button>

        <!-- Mid-Left: Block Shield Button -->
        <button data-hold="block" class="arcade-btn blue btn-block" aria-label="Block">
          <span class="btn-lbl">X</span>
          <span class="btn-sub">BLOCK</span>
        </button>

        <!-- Big Primary Anchor: Sword Strike Button -->
        <button data-tap="strike" class="arcade-btn red btn-strike" aria-label="Sword">
          <span class="btn-lbl">A</span>
          <span class="btn-sub">SWORD</span>
        </button>
      </div>
    </div>` : '';
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
    const hp = Math.max(0, G.me.hp != null ? G.me.hp : 100);
    const hpMax = G.me.hpMax || 100;
    const hpPct = Math.round(100 * hp / hpMax);
    const pips = Array.from({ length: T.stonesMax }, (_, i) => `<i class="am-pip${i < G.stones ? ' on' : ''}"></i>`).join('');

    el.innerHTML = `<div class="am-hud-wrap">
      <div class="am-hud-block am-hp-box" title="Ammon's Health">
        <div class="am-hud-head"><span class="am-hud-name">❤️ AMMON</span><b class="am-hud-val">${hp}/${hpMax}</b></div>
        <div class="am-meter-track"><div class="am-hp-fill" style="width:${hpPct}%"></div></div>
      </div>
      <div class="am-hud-block am-stone-box${G.stones <= 2 ? ' am-low' : ''}" title="Sling stones">
        <div class="am-hud-head"><span class="am-hud-name">🪨 STONES</span><b class="am-hud-val">${G.stones}<small>/${T.stonesMax}</small></b></div>
        <div class="am-stone-pips">${pips}</div>
      </div>
      <div class="am-hud-block am-pwr-box${G.power >= T.power ? ' full' : ''}" title="Mighty power">
        <div class="am-hud-head"><span class="am-hud-name">⚡ POWER</span><b class="am-hud-val">${G.power >= T.power ? 'READY!' : Math.round(100 * G.power / T.power) + '%'}</b></div>
        <div class="am-meter-track"><div class="am-pwr-fill" style="width:${Math.round(100 * G.power / T.power)}%"></div></div>
      </div>
      <div class="am-hud-block am-flock-box${G.lost ? ' am-warn' : ''}" title="Flock Status">
        <div class="am-hud-head"><span class="am-hud-name">🐑 FLOCK</span><b class="am-hud-val">${safe}/${left}${G.lost ? ` <small class="am-lost">(${G.lost} lost!)</small>` : ''}</b></div>
      </div>
      <div class="am-hud-block am-score-box">
        <div class="am-hud-head"><span class="am-hud-name">LVL ${G.level}</span><b class="am-hud-val">${fmt(G.score)}</b></div>
      </div>
    </div>`;

    const sBadge = $('btnStoneBadge');
    if (sBadge) {
      sBadge.textContent = G.stones;
      sBadge.classList.toggle('empty', G.stones === 0);
    }
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
    if (!G || !G.me || G.state !== 'play' || G.paused || G.q || G.ready > 0 || G.between > 0) return;
    const me = G.me;
    if (me.act === 'stun') return;
    if (what === me.k.power) { mighty(); return; }

    const isStrike = what === me.k.strike;
    const isSling = what === me.k.sling;
    if (!isStrike && !isSling) return;

    if (G.power >= T.power && me.press && ((isStrike && me.press.what === me.k.sling) || (isSling && me.press.what === me.k.strike)) && G.time - me.press.at <= T.together) { mighty(); return; }
    me.press = { what, at: G.time };

    // Sword-to-Sling Burst Cancel!
    if (isSling && me.act === 'strike' && me.t >= T.strikeHit[0] && G.stones > 0) {
      me.act = 'sling'; me.t = 0; me.thrown = false; me.isBurst = true; G.stones--; hud();
      float('Sling Burst!', me.x, 3.8, '#38bdf8');
      return;
    }

    const moving = keys.has(me.k.left) || keys.has(me.k.right);
    if (me.act === 'strike') {
      if (isStrike && me.t >= T.strikeHit[0] && me.kind !== 'air' && me.chain < 3 && !keys.has(me.k.up) && !keys.has(me.k.block)) {
        me.queued = true;
      } else {
        me.buffer = { what, time: G.time, up: keys.has(me.k.up), block: keys.has(me.k.block), moving };
      }
      return;
    }
    if (me.act === 'sling') {
      me.buffer = { what, time: G.time, up: keys.has(me.k.up), block: keys.has(me.k.block), moving };
      return;
    }

    if (isStrike) startStrike(me, false);
    else if (isSling && G.stones > 0) { me.act = 'sling'; me.t = 0; me.thrown = false; me.isBurst = false; G.stones--; hud(); }
  }
  function mighty() {
    const me = G.me;
    if (G.power < T.power) { float('Not ready yet', me.x, 3.6, '#e5e7eb'); return; }
    me.press = null;
    const targets = G.robbers.filter(r => r.act !== 'flee');
    if (!targets.length) { float('No robbers here yet', me.x, 3.6, '#e5e7eb'); return; }
    if (me.act === 'sling' && !me.thrown) G.stones++;
    if (me.act === 'strike' || me.act === 'sling') { me.act = 'ready'; me.t = 0; }
    me.queued = false;
    G.power = 0; G.flashAt = G.time; G.mighties++;
    targets.forEach(r => { const dir = Math.sign(r.x - me.x) || me.face; G.shots.push({ x: me.x + dir * 0.4, y: 2, vx: dir * 24, vy: 0, target: r }); });
    float('Mighty power!', me.x, 4.4, '#fbbf24'); sound('mighty');
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
      /* In-Game HUD Styling */
      #ammon .am-hud-wrap { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
      #ammon .am-hud-block { background: rgba(18, 14, 34, 0.9); border: 1px solid rgba(255, 255, 255, 0.16); border-radius: 10px; padding: 4px 10px; min-height: 40px; display: flex; flex-direction: column; justify-content: center; font-family: 'Courier New', Courier, monospace; box-shadow: 0 4px 12px rgba(0,0,0,0.3); }
      #ammon .am-hud-head { display: flex; justify-content: space-between; align-items: center; gap: 8px; font-size: 13px; font-weight: 800; }
      #ammon .am-hud-name { color: rgba(255,255,255,0.7); font-size: 11px; letter-spacing: 0.5px; }
      #ammon .am-hud-val { color: #fff; font-size: 13px; }
      #ammon .am-meter-track { width: 100%; height: 8px; background: rgba(0,0,0,0.6); border-radius: 4px; overflow: hidden; margin-top: 3px; border: 1px solid rgba(255,255,255,0.1); }
      #ammon .am-hp-fill { height: 100%; background: linear-gradient(90deg, #ef4444 0%, #eab308 50%, #22c55e 100%); transition: width 0.2s ease; border-radius: 3px; }
      #ammon .am-pwr-fill { height: 100%; background: linear-gradient(90deg, #d97706, #fbbf24); transition: width 0.15s ease; border-radius: 3px; }
      #ammon .am-pwr-box.full { border-color: #fbbf24; box-shadow: 0 0 14px rgba(251,191,36,0.6); }
      #ammon .am-stone-box.am-low { border-color: #f87171; box-shadow: 0 0 10px rgba(248,113,113,0.5); }
      #ammon .am-flock-box.am-warn { border-color: #fb923c; }
      #ammon .am-stone-pips { display: flex; gap: 3px; margin-top: 4px; }
      #ammon .am-pip { width: 7px; height: 7px; border-radius: 50%; background: rgba(255,255,255,0.2); }
      #ammon .am-pip.on { background: #eab308; box-shadow: 0 0 4px #eab308; }

      /* Mobile Controls: Floating Joystick & Thumb Arc */
      #ammon .am-pads { position: fixed; left: 0; right: 0; bottom: 0; height: 165px; pointer-events: none; z-index: 20; display: flex; justify-content: space-between; align-items: flex-end; padding: 0 16px 16px 16px; box-sizing: border-box; }
      #ammon .am-joy-zone { position: relative; width: 48vw; height: 160px; pointer-events: auto; touch-action: none; }
      #ammon .joy-hint { position: absolute; left: 15px; bottom: 15px; font: 900 12px 'Courier New', Courier, monospace; color: rgba(255,255,255,0.45); letter-spacing: 1px; pointer-events: none; transition: opacity 0.3s; }
      #ammon .floating-joy { position: fixed; width: 90px; height: 90px; border-radius: 50%; background: radial-gradient(circle, rgba(15,15,20,0.85) 40%, rgba(35,35,45,0.7) 70%); border: 3px solid rgba(255,255,255,0.35); box-shadow: 0 0 20px rgba(0,0,0,0.7), inset 0 0 10px rgba(0,0,0,0.8); pointer-events: none; z-index: 30; }
      #ammon .joy-stick { position: absolute; left: 40px; top: 40px; width: 10px; height: 10px; background: #666; border-radius: 5px; }
      #ammon .joy-ball { position: absolute; left: 25px; top: 25px; width: 40px; height: 40px; border-radius: 50%; background: radial-gradient(circle at 10px 10px, #ff6b6b, #c0392b); box-shadow: 0 8px 16px rgba(0,0,0,0.6); pointer-events: none; }

      #ammon .am-btn-cluster { position: relative; width: 165px; height: 145px; pointer-events: auto; }
      #ammon .am-btn-cluster .arcade-btn { position: absolute; display: flex; flex-direction: column; align-items: center; justify-content: center; border-radius: 50%; border: none; touch-action: none; user-select: none; -webkit-user-select: none; font-family: 'Courier New', Courier, monospace; box-shadow: 0 5px 0 #000, 0 8px 12px rgba(0,0,0,0.5); cursor: pointer; transition: transform 0.05s; }
      #ammon .am-btn-cluster .arcade-btn:active, #ammon .am-btn-cluster .arcade-btn.on { transform: translateY(4px); box-shadow: 0 1px 0 #000, 0 2px 5px rgba(0,0,0,0.5); }

      #ammon .btn-strike { right: 0; bottom: 0; width: 66px; height: 66px; background: radial-gradient(circle, #ef4444, #b91c1c); border: 3px solid #f87171 !important; z-index: 2; }
      #ammon .btn-strike .btn-lbl { font-size: 24px; font-weight: 900; line-height: 1; color: #fff; }
      #ammon .btn-strike .btn-sub { font-size: 9px; font-weight: 800; color: #fecaca; }

      #ammon .btn-sling { right: 0; top: 0; width: 52px; height: 52px; background: radial-gradient(circle, #f59e0b, #d97706); border: 2px solid #fde68a !important; }
      #ammon .btn-sling .btn-lbl { font-size: 18px; font-weight: 900; line-height: 1; color: #fff; }
      #ammon .btn-sling .btn-sub { font-size: 8px; font-weight: 800; color: #fef3c7; }

      #ammon .btn-jump { right: 78px; top: 0; width: 52px; height: 52px; background: radial-gradient(circle, #10b981, #059669); border: 2px solid #6ee7b7 !important; }
      #ammon .btn-jump .btn-lbl { font-size: 18px; font-weight: 900; line-height: 1; color: #fff; }
      #ammon .btn-jump .btn-sub { font-size: 8px; font-weight: 800; color: #d1fae5; }

      #ammon .btn-block { right: 82px; bottom: 8px; width: 52px; height: 52px; background: radial-gradient(circle, #3b82f6, #1d4ed8); border: 2px solid #93c5fd !important; }
      #ammon .btn-block .btn-lbl { font-size: 18px; font-weight: 900; line-height: 1; color: #fff; }
      #ammon .btn-block .btn-sub { font-size: 8px; font-weight: 800; color: #dbeafe; }

      #ammon .btn-badge { position: absolute; top: -5px; right: -5px; background: #eab308; color: #1e1b4b; font-weight: 900; font-size: 12px; width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 5px rgba(0,0,0,0.6); border: 2px solid #fff; }
      #ammon .btn-badge.empty { background: #ef4444; color: #fff; }

      #ammon .am-power-btn { right: 0; bottom: 155px; width: 165px; height: 38px; border-radius: 19px !important; background: linear-gradient(90deg, #d97706, #fbbf24) !important; border: 2px solid #fef08a !important; color: #1e1b4b !important; font: 900 13px 'Courier New', Courier, monospace !important; box-shadow: 0 0 16px rgba(251,191,36,0.8), 0 3px 0 #92400e !important; text-shadow: none !important; }
      #ammon .am-power-btn[hidden] { display: none !important; }

      @media (max-width: 520px) {
        #ammon .board-title { font-size: 18px; } #ammon .am-name .eyebrow { display: none; }
        #ammon .am-top { display: grid; grid-template-columns: 1fr auto; } #ammon .am-hud { grid-column: 1 / -1; grid-row: 2; margin-left: 0; }
        #ammon .am-btns .btn { padding: 8px 12px; }
        #ammon .am-btn-cluster { width: 180px; height: 170px; }
        #ammon .btn-strike { width: 62px; height: 62px; right: 5px; bottom: 5px; }
        #ammon .btn-sling { width: 48px; height: 48px; right: 5px; top: 15px; }
        #ammon .btn-jump { width: 48px; height: 48px; right: 75px; top: 5px; }
        #ammon .btn-block { width: 48px; height: 48px; right: 85px; bottom: 15px; }
        #ammon .am-power-btn { width: 160px; height: 38px; bottom: 155px; font-size: 12px !important; }
        #ammon .am-hud-wrap { gap: 4px; }
        #ammon .am-hud-block { padding: 3px 6px; min-height: 34px; }
        #ammon .am-hud-name { font-size: 9px; }
        #ammon .am-hud-val { font-size: 12px; }
        #ammon .am-meter-track { height: 6px; }
      }`;
    document.head.appendChild(css);
  }

  
  let joyTouchId = null, joyStartX = 0, joyStartY = 0;
  function updateJoys(e) {
    if (!coarse()) return;
    const base = document.getElementById('joyBase');
    const ball = document.getElementById('joyBall');
    const hint = document.getElementById('joyHint');

    for (let i = 0; i < e.touches.length; i++) {
      const t = e.touches[i];
      // Left side touches: Floating dynamic virtual joystick
      if (t.clientX < window.innerWidth * 0.52) {
        if (joyTouchId === null) {
          joyTouchId = t.identifier;
          joyStartX = t.clientX;
          joyStartY = t.clientY;
          if (base) {
            base.style.left = (t.clientX - 45) + 'px';
            base.style.top = (t.clientY - 45) + 'px';
            base.style.display = 'block';
          }
          if (hint) hint.style.opacity = '0';
        }
        if (t.identifier === joyTouchId) {
          const dx = t.clientX - joyStartX;
          const dy = t.clientY - joyStartY;
          const maxD = 40;
          const dist = Math.hypot(dx, dy);
          const nx = dist > maxD ? dx / dist * maxD : dx;
          const ny = dist > maxD ? dy / dist * maxD : dy;
          if (ball) ball.style.transform = `translate(${nx}px, ${ny}px)`;

          if (nx < -14) { keys.add('left'); keys.delete('right'); }
          else if (nx > 14) { keys.add('right'); keys.delete('left'); }
          else { keys.delete('left'); keys.delete('right'); }

          if (ny < -18) keys.add('up');
          else keys.delete('up');
        }
      } else {
        // Right side touches: Thumb-Slide / Roll button detection
        const target = document.elementFromPoint(t.clientX, t.clientY);
        if (target) {
          const tapBtn = target.closest('[data-tap]');
          if (tapBtn && t._lastTap !== tapBtn) {
            t._lastTap = tapBtn;
            tapBtn.classList.add('on');
            setTimeout(() => tapBtn.classList.remove('on'), 120);
            act(tapBtn.dataset.tap);
          }
          const holdBtn = target.closest('[data-hold]');
          if (holdBtn && !keys.has(holdBtn.dataset.hold)) {
            keys.add(holdBtn.dataset.hold);
            holdBtn.classList.add('on');
          }
        }
      }
    }
  }

  function onTouchEnd(e) {
    if (!coarse()) return;
    const base = document.getElementById('joyBase');
    const ball = document.getElementById('joyBall');
    const hint = document.getElementById('joyHint');

    let stillActive = false;
    for (let i = 0; i < e.touches.length; i++) {
      if (e.touches[i].identifier === joyTouchId) { stillActive = true; break; }
    }
    if (!stillActive && joyTouchId !== null) {
      joyTouchId = null;
      keys.delete('left'); keys.delete('right'); keys.delete('up');
      if (base) base.style.display = 'none';
      if (ball) ball.style.transform = 'translate(0px, 0px)';
      if (hint) hint.style.opacity = '0.7';
    }
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
    const tm = e => updateJoys(e), te = e => onTouchEnd(e);
    const kd = e => onKeyDown(e), ku = e => onKeyUp(e), ck = e => onClick(e), dn = e => onDown(e), up = e => onUp(e), vis = () => onHide();
    const blur = () => { keys.clear(); held.clear(); };
    window.addEventListener('touchstart', tm, {passive:false}); window.addEventListener('touchmove', tm, {passive:false}); window.addEventListener('touchend', te); window.addEventListener('touchcancel', te);
    window.addEventListener('keydown', kd); window.addEventListener('keyup', ku); window.addEventListener('blur', blur);
    root.addEventListener('click', ck); root.addEventListener('pointerdown', dn);
    window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
    document.addEventListener('visibilitychange', vis);
    off = () => {
      window.removeEventListener('touchstart', tm); window.removeEventListener('touchmove', tm); window.removeEventListener('touchend', te); window.removeEventListener('touchcancel', te);
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
      robber(x, opts) { G.robbers.push(Object.assign({ kind: 'robber', x, y: 0, vy: 0, face: x > G.me.x ? -1 : 1, hp: 2, act: 'walk', t: 0, kx: 0, speed: 2.3, step: 0 }, opts || {})); G.wave.spawned++; },
      answer, next: afterQuestion, draw: () => draw(performance.now())
    }
  };
})();
