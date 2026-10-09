// Wilderness Snake (🎮 → Wilderness Snake): an arcade Snake in the camp of
// Israel, for 1 player or 2 on one screen. Manna grows the snake; every few
// manna, a question from the week's reels drops three jars, A, B and C, and
// eating the right one grows it a lot more, since man lives “by every word
// that proceedeth out of the mouth of the LORD” (Deuteronomy 8:3). The brass
// serpent (Numbers 21:8) lets a snake that crashes look and live once; fiery
// serpents (Numbers 21:6) come out as the levels climb.
//
// index.html loads this file the first time the game opens, and passes a
// host: ask(used) for a question, player() for who's playing, html(text) to
// link scripture references, familyBests() and saveBest(score) for the
// family's best scores, and closed() when the game is left. The lines come
// from content/arcade.js (window.TU_ARCADE.snake), whose quotes
// tools/verify.mjs checks. No XP: just for fun. Tests drive it step by step with
// window.TU_SNAKE_MANUAL and TUSnake._t (see the end of this file).
(function () {
  'use strict';

  const T = {
    tick: 150, tickMin: 72, tickStep: 9,   // ms a step: level 1, the fastest, and how much faster each level
    qSlow: 1.25,                           // steps are this much slower while a question is up, to read it
    manna: 10, quail: 30, right: 100,      // points (a right answer: 100 × (1 + streak), up to ×5)
    streakMax: 4,
    grow: { manna: 1, quail: 2, right: 3 }, shrink: 3, minLen: 3,
    qEvery: 4, qSeconds: 25,               // a question after every 4 manna, up for 25 seconds
    quailChance: 0.2, quailMs: 7000, brassMs: 12000,
    levelEvery: 8,                         // things eaten (manna, quail, right answers) a level
    resumeMs: 3000,                        // 3, 2, 1 after reading a question, before the snake goes again
    ghostMs: 2200, respawnMs: 1200,        // after looking to the brass serpent, or (2 players) a crash
    round2p: 120, crash2p: 50,             // a 2-player round's seconds, and what a crash costs
    feedbackMs: 6000
  };
  let STORE = 'treasureup.snake.v1';      // (the host's prefix: the test site keeps its own)
  const DIRS = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };
  const JAR = [{ l: 'A', c: '#e11d48' }, { l: 'B', c: '#2563eb' }, { l: 'C', c: '#059669' }];
  const SKIN = [
    { body: '#c8902e', dark: '#7a4b12', belly: '#f2d39b', name: 'gold' },
    { body: '#1f9e93', dark: '#0d5650', belly: '#a7eee6', name: 'teal' }
  ];

  let host = null, root = null, G = null, raf = 0, last = 0, keyOff = null, ro = null, audio = null;
  const ui = { mode: '1p', names: ['', 'Player 2'], view: 'menu', fam: null };
  let dbGameRef = null, unsubscribeInputs = null, gameCode = null, myClientId = null, networkConfig = null;
  const C = () => (window.TU_ARCADE && window.TU_ARCADE.snake) || {}, L = () => C().lines || {};
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const $ = id => document.getElementById(id);
  const key = (x, y) => x + ',' + y;
  const manual = () => !!window.TU_SNAKE_MANUAL;

  // ----- saved on this device: best, top scores, the family's (as last seen), sound -----
  function saved() { try { return JSON.parse(localStorage.getItem(STORE)) || {}; } catch (e) { return {}; } }
  function save(patch) { try { localStorage.setItem(STORE, JSON.stringify(Object.assign(saved(), patch))); } catch (e) {} }

  // Seeded random numbers (window.TU_SNAKE_SEED for the tests).
  function rng(seed) { let a = seed >>> 0; return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  // ----- sound: short blips from the browser (⏸ and 🔊 in the bar) -----
  function sound(kind) {
    if (saved().muted || !audio) return;
    const notes = { tick: [[660, 0.06]], go: [[880, 0.06], [1175, 0.12]], manna: [[880, 0.05]], quail: [[660, 0.06], [990, 0.06]], right: [[523, 0.08], [659, 0.08], [784, 0.12]], wrong: [[196, 0.18]],
      crash: [[150, 0.25]], brass: [[784, 0.08], [988, 0.08], [1175, 0.16]], level: [[440, 0.07], [554, 0.07], [659, 0.07], [880, 0.14]], ask: [[587, 0.06], [784, 0.08]] }[kind] || [];
    let t = audio.currentTime + 0.01;
    notes.forEach(([f, d]) => {
      const o = audio.createOscillator(), v = audio.createGain();
      o.type = kind === 'wrong' || kind === 'crash' ? 'sawtooth' : 'square';
      o.frequency.setValueAtTime(f, t);
      if (kind === 'crash') o.frequency.exponentialRampToValueAtTime(60, t + d);
      v.gain.setValueAtTime(0.0001, t); v.gain.exponentialRampToValueAtTime(0.08, t + 0.01); v.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(v).connect(audio.destination); o.start(t); o.stop(t + d + 0.02); t += d;
    });
  }
  function wakeAudio() {
    try { if (!audio) audio = new (window.AudioContext || window.webkitAudioContext)(); if (audio.state === 'suspended') audio.resume(); } catch (e) { audio = null; }
  }

  // ===================== the game =====================

  // The grid takes the shape of the space it has (Blake, 2026-10-04: "Snake
  // needs to fill the screen"), with about as many squares as before: 448
  // across a wide screen (28 × 16), 300 down a tall one (15 × 20).
  function gridFor(w, h) {
    if (!(w > 50 && h > 50)) { const portrait = window.innerHeight > window.innerWidth * 1.05; return portrait ? { cols: 15, rows: 19 } : { cols: 28, rows: 16 }; }
    // Try whole-pixel squares near the size that gives that many, and keep the one that leaves the least
    // sand unused without straying far from that many (fewer, bigger squares would be an easier game).
    const n = w >= h ? 448 : 300, side = Math.sqrt(w * h / n);
    let best = null;
    for (let c = Math.max(8, Math.floor(side * 0.8)); c <= Math.ceil(side * 1.25); c++) {
      const cols = Math.max(10, Math.min(40, Math.floor(w / c))), rows = Math.max(10, Math.min(40, Math.floor(h / c)));
      const cell = Math.floor(Math.min(w / cols, h / rows)), waste = (w * h - cols * rows * cell * cell) / (w * h);
      const score = waste + 0.25 * Math.abs(Math.log(cols * rows / n));
      if (!best || score < best.score) best = { cols, rows, score };
    }
    return { cols: best.cols, rows: best.rows };
  }
  function newGame(mode, dims) {
    const { cols, rows } = dims || gridFor(0, 0);
    const seed = typeof window.TU_SNAKE_SEED === 'number' ? window.TU_SNAKE_SEED : Date.now();
    G = { mode, cols, rows, rand: rng(seed), time: 0, tickN: 0, acc: 0, state: 'play', paused: false, reading: null, level: 1, eaten: 0, mannaSinceQ: 0, ready: manual() ? 0 : 3000,
      snakes: [], manna: [], quail: null, jars: [], q: null, fb: null, used: new Set(), asked: 0, rocks: new Set(), fiery: [], brass: null, floats: [], banner: null };
    const names = mode === '2p' ? [ui.names[0] || 'Player 1', ui.names[1] || 'Player 2'] : [ui.names[0] || (host.player().name || 'You')];
    names.forEach((name, i) => {
      // 1 player: in the middle, heading right. 2 players: Player 1 (arrows) on the right heading left, Player 2 (WASD) on the left heading right.
      const y = mode === '2p' ? Math.round(rows * (i === 0 ? 0.32 : 0.68)) : Math.floor(rows / 2);
      const dir = mode === '2p' && i === 0 ? DIRS.left : DIRS.right;
      const hx = mode === '2p' ? (i === 0 ? cols - 6 : 5) : Math.floor(cols / 2) - 2;
      const body = Array.from({ length: 4 }, (_, k) => ({ x: hx - dir.x * k, y }));
      G.snakes.push({ i, name, skin: SKIN[i], body, dir, queue: [], grow: 0, alive: true, score: 0, streak: 0, right: 0, wrong: 0, brass: 0, ghostUntil: 0, respawnAt: 0, keep: 4, bestStreak: 0 });
    });
    fillManna();
  }

  const tickMs = () => Math.max(T.tickMin, T.tick - (G.level - 1) * T.tickStep) * (G.q ? T.qSlow : 1);
  const inside = (x, y) => x >= 0 && y >= 0 && x < G.cols && y < G.rows;
  const ghost = s => G.time < s.ghostUntil;
  function snakeAt(x, y, except) { for (const s of G.snakes) if (s.alive && s !== except && s.body.some(b => b.x === x && b.y === y)) return s; return null; }
  const fieryAt = (x, y) => G.fiery.some(f => f.body.some(b => b.x === x && b.y === y));
  const itemAt = (x, y) => G.manna.some(m => m.x === x && m.y === y) || (G.quail && G.quail.x === x && G.quail.y === y) || G.jars.some(j => j.x === x && j.y === y) || (G.brass && G.brass.x === x && G.brass.y === y);
  function busy(x, y) { return !inside(x, y) || G.rocks.has(key(x, y)) || !!snakeAt(x, y) || fieryAt(x, y) || itemAt(x, y); }
  // A free cell at least `away` steps from every snake's head (and, for jars, from each other).
  function freeCell(away = 3, apart = []) {
    for (let k = 0; k < 400; k++) {
      const x = Math.floor(G.rand() * G.cols), y = Math.floor(G.rand() * G.rows);
      if (busy(x, y)) continue;
      const far = G.snakes.every(s => !s.alive || Math.abs(s.body[0].x - x) + Math.abs(s.body[0].y - y) >= away - (k > 300 ? 2 : 0));
      if (far && apart.every(p => Math.abs(p.x - x) + Math.abs(p.y - y) >= 4 - (k > 300 ? 2 : 0))) return { x, y };
    }
    for (let y = 0; y < G.rows; y++) for (let x = 0; x < G.cols; x++) if (!busy(x, y)) return { x, y };
    return null;
  }
  function fillManna() { const want = G.mode === '2p' ? 3 : 2; while (G.manna.length < want) { const c = freeCell(2); if (!c) break; G.manna.push(c); } }
  function float(text, x, y, color) { G.floats.push({ text, x, y, color: color || '#fff', at: G.time }); }
  // A moment for the panel (the brass serpent, a level): it shows first, and an answer's why shows after it.
  function banner(text, line, ms) { G.banner = { text, line, until: G.time + ms }; if (G.fb) G.fb.until += ms; }

  // A turn from the keys, the pad or a swipe: kept in order (two at most),
  // never straight back into the neck.
  function turn(i, name, fromNet) {
    if (networkConfig && !fromNet && networkConfig.myPlayer === i) {
      if (dbGameRef) dbGameRef.collection('inputs').add({ sender: myClientId, player: i, dir: name, time: Date.now() });
    }
    if (!G || G.state !== 'play') return;
    if (G.reading) return ready(i, name, fromNet);
    const s = G.snakes[i], d = DIRS[name];
    if (!s || !d) return;
    const lastDir = s.queue.length ? s.queue[s.queue.length - 1] : s.dir;
    if ((d.x === -lastDir.x && d.y === -lastDir.y) || (d.x === lastDir.x && d.y === lastDir.y) || s.queue.length >= 2) return;
    s.queue.push(d);
    if (G.paused && !manual()) G.paused = false;
  }

  function step() {
    if (!G || G.state !== 'play') return;
    G.time += tickMs();
    G.tickN++;
    for (const s of G.snakes) if (!s.alive && s.respawnAt && G.time >= s.respawnAt) respawn(s);
    const alive = G.snakes.filter(s => s.alive);
    for (const s of alive) { if (s.queue.length) s.dir = s.queue.shift(); s.nx = s.body[0].x + s.dir.x; s.ny = s.body[0].y + s.dir.y; }
    // Where bodies will be after this step (a tail moves on unless it's growing). A ghost's body isn't solid.
    const occ = new Set();
    for (const s of alive) if (!ghost(s)) { const keep = s.grow > 0 ? s.body.length : s.body.length - 1; for (let k = 0; k < keep; k++) occ.add(key(s.body[k].x, s.body[k].y)); }
    const crashed = [];
    for (const s of alive) {
      const k = key(s.nx, s.ny);
      if (!inside(s.nx, s.ny) || G.rocks.has(k)) { crashed.push(s); continue; }
      if (ghost(s)) continue;
      if (occ.has(k) || fieryAt(s.nx, s.ny) || alive.some(o => o !== s && !ghost(o) && o.nx === s.nx && o.ny === s.ny)) crashed.push(s);
    }
    for (const s of alive) {
      if (crashed.includes(s)) { crash(s); continue; }
      s.body.unshift({ x: s.nx, y: s.ny });
      if (s.grow > 0) s.grow--; else s.body.pop();
      eat(s);
    }
    if (G.state !== 'play') return;
    if (G.tickN % 2 === 0) moveFiery();
    // Timers: the question, the quail, the brass serpent, and a 2-player round.
    if (G.q && G.time >= G.q.until) closeQuestion({ timeout: true });
    if (G.quail && G.time >= G.quail.until) G.quail = null;
    if (G.brass && G.time >= G.brass.until) G.brass = null;
    if (G.fb && G.time >= G.fb.until) G.fb = null;
    if (G.banner && G.time >= G.banner.until) G.banner = null;
    if (!G.brass && G.level >= 3 && G.rand() < 1 / 400 && G.snakes.some(s => s.alive && !s.brass)) placeBrass();
    fillManna();
    const level = 1 + Math.floor(G.eaten / T.levelEvery);
    if (level > G.level) levelUp(level);
    if (G.mode === '2p' && G.time >= T.round2p * 1000) return gameOver();
  }

  function eat(s) {
    const h = s.body[0];
    const mi = G.manna.findIndex(m => m.x === h.x && m.y === h.y);
    if (mi >= 0) {
      G.manna.splice(mi, 1);
      s.score += T.manna; s.grow += T.grow.manna; G.eaten++; G.mannaSinceQ++;
      float('+' + T.manna, h.x, h.y, '#fff7d6'); sound('manna');
      if (!G.quail && G.rand() < T.quailChance) { const c = freeCell(3); if (c) G.quail = Object.assign(c, { until: G.time + T.quailMs }); }
      if (!G.q && G.mannaSinceQ >= T.qEvery) openQuestion();
    }
    if (G.quail && G.quail.x === h.x && G.quail.y === h.y) {
      G.quail = null; s.score += T.quail; s.grow += T.grow.quail; G.eaten++;
      float('+' + T.quail + ' quail!', h.x, h.y, '#fde68a'); sound('quail');
    }
    if (G.brass && G.brass.x === h.x && G.brass.y === h.y) {
      G.brass = null;
      if (!s.brass) s.brass = 1;
      float('Brass serpent!', h.x, h.y, '#fbbf24'); sound('brass');
      banner('The brass serpent: crash once, and look and live.', L().brass, 4000);
    }
    const ji = G.jars.findIndex(j => j.x === h.x && j.y === h.y);
    if (ji >= 0) answer(s, G.jars[ji]);
  }

  // ----- questions: three jars, A, B and C -----
  function openQuestion() {
    const q = host.ask(G.used);
    G.mannaSinceQ = 0;
    if (!q || !q.choices || q.choices.length < 2) return;
    G.asked++;
    // Everything stops while the question is read (Javan: hard "to read the
    // question and play the game at the same time"); its clock starts on Go.
    G.q = Object.assign({}, q, { opened: G.time, until: Infinity });
    G.reading = { ready: G.snakes.map(x => !x.alive) };
    G.fb = null;
    const spots = [];
    q.choices.slice(0, 3).forEach((choice, n) => { const c = freeCell(5, spots); if (c) { spots.push(c); G.jars.push(Object.assign(c, { n, choice })); } });
    sound('ask');
  }
  function answer(s, jar) {
    const q = G.q, h = s.body[0];
    if (!q) return;
    if (jar.choice === q.right) {
      const mult = 1 + Math.min(s.streak, T.streakMax), pts = T.right * mult;
      s.score += pts; s.grow += T.grow.right; s.streak++; s.right++; G.eaten++;
      s.bestStreak = Math.max(s.bestStreak, s.streak);
      float('+' + pts + (mult > 1 ? ' ×' + mult : ''), h.x, h.y, '#86efac'); sound('right');
      if (s.streak % 3 === 0 && !s.brass && !G.brass) placeBrass();
    } else {
      s.streak = 0; s.wrong++;
      const cut = Math.min(T.shrink, s.body.length - T.minLen);
      if (cut > 0) s.body.splice(s.body.length - cut, cut);
      s.grow = 0;
      float('−' + T.shrink, h.x, h.y, '#fca5a5'); sound('wrong');
    }
    closeQuestion({ by: s.i, picked: jar.choice, right: jar.choice === q.right });
  }
  function closeQuestion(result) {
    const q = G.q;
    G.q = null; G.jars = []; G.reading = null;
    if (!q) return;
    if (result.timeout) for (const s of G.snakes) s.streak = 0;
    G.fb = Object.assign({ q, until: G.time + T.feedbackMs }, result);
  }
  // Read it, then go: an arrow, a swipe, the pad, Space, Enter or ▶ Go. With
  // two players, each says they're ready with their own keys (or ▶ Go for both).
  function ready(i, name, fromNet) {
    if (networkConfig && !fromNet && i != null && networkConfig.myPlayer === i) {
      if (dbGameRef) dbGameRef.collection('inputs').add({ sender: myClientId, player: i, ready: true, time: Date.now() });
    }
    const r = G && G.reading;
    if (!r) return;
    if (i == null) r.ready = r.ready.map(() => true); else r.ready[i] = true;
    if (!r.ready.every(Boolean)) return;
    G.reading = null;
    // Then 3, 2, 1 before the snake goes again (Javan: "a little countdown timer
    // to know … when I'm going to start again"). The question's clock starts after it.
    if (manual()) { if (G.q && G.q.until === Infinity) G.q.until = G.time + T.qSeconds * 1000; }
    else { G.ready = T.resumeMs; G.readyTip = 'Get ready… then eat the right jar!'; sound('tick'); }
    if (G.paused) pause(false);
    last = performance.now(); G.acc = 0;
    if (i != null && name) turn(i, name);
    readCard();
  }
  // Read the question again: tap the panel while its jars are out (the clock waits too).
  function reread() {
    if (!G || !G.q || G.reading || G.state !== 'play') return;
    G.reading = { ready: G.snakes.map(x => !x.alive) };
    readCard();
  }
  function placeBrass() { const c = freeCell(4); if (c) G.brass = Object.assign(c, { until: G.time + T.brassMs }); }

  // ----- crashes: the brass serpent, a 2-player respawn, or the end -----
  function crash(s) {
    const h = s.body[0];
    if (s.brass) {
      // Look and live: the snake stays where it is, turned to a safe way, and can't be hurt for a moment.
      s.brass = 0;
      s.ghostUntil = G.time + T.ghostMs;
      s.queue = [];
      const ways = Object.values(DIRS).filter(d => !(d.x === -s.dir.x && d.y === -s.dir.y));
      const safe = ways.filter(d => { const x = h.x + d.x, y = h.y + d.y; return inside(x, y) && !G.rocks.has(key(x, y)); });
      if (safe.length) s.dir = safe.find(d => d === s.dir) || safe[0];
      float('Look and live!', h.x, h.y, '#fbbf24'); sound('brass');
      banner((G.mode === '2p' ? s.name + ' looked' : 'You looked') + ' to the brass serpent, and lived!', L().live, 4500);
      return;
    }
    sound('crash');
    if (G.mode === '1p') { s.alive = false; return gameOver(); }
    s.alive = false;
    s.keep = Math.max(T.minLen, Math.floor(s.body.length / 2));
    s.score = Math.max(0, s.score - T.crash2p);
    s.streak = 0;
    s.respawnAt = G.time + T.respawnMs;
    float('Crash! −' + T.crash2p, h.x, h.y, '#fca5a5');
  }
  function respawn(s) {
    for (let k = 0; k < 300; k++) {
      const c = freeCell(5);
      if (!c) break;
      const d = [DIRS.left, DIRS.right, DIRS.up, DIRS.down][Math.floor(G.rand() * 4)];
      const body = Array.from({ length: s.keep }, (_, n) => ({ x: c.x - d.x * n, y: c.y - d.y * n }));
      const ahead = [1, 2, 3].every(n => inside(c.x + d.x * n, c.y + d.y * n) && !busy(c.x + d.x * n, c.y + d.y * n));
      if (ahead && body.every((b, n) => n === 0 || (inside(b.x, b.y) && !busy(b.x, b.y)))) {
        Object.assign(s, { body, dir: d, queue: [], grow: 0, alive: true, respawnAt: 0, ghostUntil: G.time + T.ghostMs });
        return;
      }
    }
    s.respawnAt = G.time + 500;   // no room yet: try again soon
  }

  // ----- levels: faster, then rocks, then fiery serpents -----
  function levelUp(level) {
    G.level = level;
    const rocks = Math.min(14, (level - 1) * 2);
    while (G.rocks.size < rocks) { const c = freeCell(5); if (!c) break; G.rocks.add(key(c.x, c.y)); }
    const fiery = Math.min(3, Math.max(0, Math.floor((level - 1) / 2)));
    let first = false;
    while (G.fiery.length < fiery) {
      const c = freeCell(7);
      if (!c) break;
      G.fiery.push({ body: [c, { x: c.x, y: c.y }, { x: c.x, y: c.y }], dir: DIRS.right });
      first = G.fiery.length === 1;
    }
    sound('level');
    if (first) banner('Level ' + level + ': fiery serpents! Don’t touch them.', L().fiery, 4500);
    else banner('Level ' + level + (rocks ? ': faster, and more rocks.' : ': faster!'), '', 2500);
  }
  function moveFiery() {
    for (const f of G.fiery) {
      const h = f.body[0], ways = Object.values(DIRS).filter(d => !(d.x === -f.dir.x && d.y === -f.dir.y));
      const open = ways.filter(d => { const x = h.x + d.x, y = h.y + d.y; return inside(x, y) && !G.rocks.has(key(x, y)) && !itemAt(x, y) && !G.fiery.some(o => o !== f && o.body.some(b => b.x === x && b.y === y)); });
      if (!open.length) { f.dir = { x: -f.dir.x, y: -f.dir.y }; f.body.reverse(); continue; }
      const d = open.includes(f.dir) && G.rand() < 0.7 ? f.dir : open[Math.floor(G.rand() * open.length)];
      const nx = h.x + d.x, ny = h.y + d.y, s = snakeAt(nx, ny);
      if (s && !ghost(s)) {
        const head = s.body[0].x === nx && s.body[0].y === ny;
        if (head) { crash(s); if (G.state !== 'play') return; }
        else {
          // A bite on the body: the snake loses 2 from its tail, and the fiery serpent turns back.
          const cut = Math.min(2, s.body.length - T.minLen);
          if (cut > 0) s.body.splice(s.body.length - cut, cut);
          float('Bitten! −2', nx, ny, '#fb923c'); sound('wrong');
        }
        f.dir = { x: -f.dir.x, y: -f.dir.y };
        continue;
      }
      if (s) continue;   // a ghost: wait
      f.dir = d;
      f.body.unshift({ x: nx, y: ny });
      f.body.pop();
    }
  }

  function gameOver() {
    G.state = 'over';
    G.q = null; G.jars = [];
    if (G.mode === '1p') {
      const s = G.snakes[0], was = saved().best || 0;
      const top = (saved().top || []).concat(s.score > 0 ? [{ name: s.name, score: s.score, right: s.right, asked: G.asked, level: G.level, at: Date.now() }] : [])
        .sort((a, b) => b.score - a.score).slice(0, 10);
      save({ best: Math.max(was, s.score), top, plays: (saved().plays || 0) + 1 });
      G.newBest = s.score > was && s.score > 0;
      if (s.score > 0) Promise.resolve(host.saveBest('snake', s.score)).then(() => loadFamily(), () => {});
    } else save({ plays: (saved().plays || 0) + 1 });
    render();
  }

  // ===================== drawing =====================

  // Pictures (arcade/, painted by Gemini; arcade/README.md). Until one has loaded, its shape is drawn instead.
  const PICS = {};
  function pic(name) {
    let im = PICS[name];
    if (!im) { im = PICS[name] = new Image(); im.onload = () => { if (name === 'sand.jpg') bg = null; }; im.src = 'arcade/' + name; }
    return im.complete && im.naturalWidth ? im : null;
  }
  // A picture standing on its spot: h cells tall, its foot at (x, y); flip for a mirror image.
  function stand(ctx, im, x, y, h, flip) {
    const w = h * im.naturalWidth / im.naturalHeight;
    if (!flip) { ctx.drawImage(im, x - w / 2, y - h, w, h); return; }
    ctx.save(); ctx.translate(x, 0); ctx.scale(-1, 1); ctx.drawImage(im, -w / 2, y - h, w, h); ctx.restore();
  }

  let bg = null;
  function board() {
    const c = $('snCanvas');
    if (!c || !G) return null;
    const stage = $('snStage'), r = stage.getBoundingClientRect();
    const cell = Math.max(8, Math.floor(Math.min((r.width - 16) / G.cols, (r.height - 16) / G.rows)));
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    if (c._cell !== cell || c._dpr !== dpr || c._cols !== G.cols) {
      c._cell = cell; c._dpr = dpr; c._cols = G.cols;
      c.width = G.cols * cell * dpr; c.height = G.rows * cell * dpr;
      c.style.width = G.cols * cell + 'px'; c.style.height = G.rows * cell + 'px';
      bg = null;
    }
    return { c, ctx: c.getContext('2d'), cell, dpr };
  }
  // The desert floor, drawn once a size: sand, the ripples of the dunes, small stones.
  function desert(cell, dpr) {
    const w = G.cols * cell, h = G.rows * cell, o = document.createElement('canvas');
    o.width = w * dpr; o.height = h * dpr;
    const x = o.getContext('2d'), r = rng(7), sand = pic('sand.jpg');
    x.scale(dpr, dpr);
    if (sand) {   // the painted sand, a tile every 6 cells, and the cells faintly checked so a turn is easy to judge
      const pat = x.createPattern(sand, 'repeat'), k = cell * 9 / sand.naturalWidth;
      pat.setTransform(new DOMMatrix().scale(k));
      x.fillStyle = pat; x.fillRect(0, 0, w, h);
      for (let yy = 0; yy < G.rows; yy++) for (let xx = 0; xx < G.cols; xx++) if ((xx + yy) % 2) { x.fillStyle = 'rgba(120,80,30,.05)'; x.fillRect(xx * cell, yy * cell, cell, cell); }
      const v = x.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.75);
      v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(120,70,20,.14)');
      x.fillStyle = v; x.fillRect(0, 0, w, h);
      return o;
    }
    const g = x.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, '#efd29a'); g.addColorStop(0.5, '#e5c182'); g.addColorStop(1, '#d9ae6c');
    x.fillStyle = g; x.fillRect(0, 0, w, h);
    for (let yy = 0; yy < G.rows; yy++) for (let xx = 0; xx < G.cols; xx++) if ((xx + yy) % 2) { x.fillStyle = 'rgba(120,80,30,.045)'; x.fillRect(xx * cell, yy * cell, cell, cell); }
    x.lineWidth = Math.max(1, cell * 0.06);
    for (let k = 0; k < 14; k++) {
      const y0 = r() * h, amp = cell * (0.3 + r() * 0.5), len = w * (0.3 + r() * 0.5), x0 = r() * (w - len);
      x.strokeStyle = r() < 0.5 ? 'rgba(255,240,205,.5)' : 'rgba(150,100,40,.18)';
      x.beginPath();
      for (let t = 0; t <= 1.0001; t += 0.05) { const px = x0 + t * len, py = y0 + Math.sin(t * Math.PI * 2 + k) * amp; t ? x.lineTo(px, py) : x.moveTo(px, py); }
      x.stroke();
    }
    for (let k = 0; k < G.cols * G.rows / 6; k++) { x.fillStyle = r() < 0.5 ? 'rgba(110,70,30,.22)' : 'rgba(255,250,235,.35)'; x.beginPath(); x.arc(r() * w, r() * h, cell * (0.03 + r() * 0.05), 0, 7); x.fill(); }
    return o;
  }

  function draw(now) {
    const b = board();
    if (!b) return;
    const { ctx, cell, dpr } = b;
    if (!bg) bg = desert(cell, dpr);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(bg, 0, 0);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const cx = x => (x + 0.5) * cell, cy = y => (y + 0.5) * cell, t = now || 0;
    // Rocks
    const rock = pic('rock.png');
    for (const k of G.rocks) {
      const [x, y] = k.split(',').map(Number), r = rng(x * 131 + y * 7), pts = 7;
      if (rock) { stand(ctx, rock, cx(x), cy(y) + cell * 0.5, cell * 1.02, r() < 0.5); continue; }
      ctx.fillStyle = '#8b7d6b'; ctx.strokeStyle = '#4a3f33'; ctx.lineWidth = Math.max(1, cell * 0.06);
      ctx.beginPath();
      for (let n = 0; n < pts; n++) { const a = n / pts * Math.PI * 2, rr = cell * (0.36 + r() * 0.1); const px = cx(x) + Math.cos(a) * rr, py = cy(y) + Math.sin(a) * rr * 0.85; n ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.beginPath(); ctx.ellipse(cx(x) - cell * 0.1, cy(y) - cell * 0.12, cell * 0.14, cell * 0.08, -0.4, 0, 7); ctx.fill();
    }
    // Manna: small white wafers, “like coriander seed” (Exodus 16:31)
    const manna = pic('manna.png');
    for (const m of G.manna) {
      if (manna) {   // a bright patch under it, so it shows on the sand
        const g = ctx.createRadialGradient(cx(m.x), cy(m.y) + cell * 0.1, 0, cx(m.x), cy(m.y) + cell * 0.1, cell * 0.75);
        g.addColorStop(0, 'rgba(255,255,255,.85)'); g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx(m.x), cy(m.y) + cell * 0.1, cell * 0.75, 0, 7); ctx.fill();
        stand(ctx, manna, cx(m.x), cy(m.y) + cell * 0.42, cell * 0.8); continue;
      }
      ctx.save(); ctx.shadowColor = 'rgba(255,255,255,.95)'; ctx.shadowBlur = cell * 0.5;
      ctx.fillStyle = '#fffdf6'; ctx.strokeStyle = '#b89a5e'; ctx.lineWidth = Math.max(1, cell * 0.05);
      ctx.beginPath(); ctx.ellipse(cx(m.x), cy(m.y), cell * 0.32, cell * 0.25, 0.3, 0, 7); ctx.fill(); ctx.restore(); ctx.stroke();
      ctx.fillStyle = '#e9dcbc';
      [[-0.08, -0.03], [0.07, 0.05], [0.02, -0.08]].forEach(([dx, dy]) => { ctx.beginPath(); ctx.arc(cx(m.x) + dx * cell, cy(m.y) + dy * cell, cell * 0.035, 0, 7); ctx.fill(); });
    }
    // Quail
    if (G.quail) {
      const q = G.quail, bob = Math.sin(t / 150) * cell * 0.05, x = cx(q.x), y = cy(q.y) + bob, left = q.until - G.time;
      ctx.globalAlpha = left < 2000 ? 0.5 + 0.5 * Math.abs(Math.sin(t / 90)) : 1;
      const quail = pic('quail.png');
      if (quail) stand(ctx, quail, x, y + cell * 0.5, cell * 1.05);
      else {
        ctx.fillStyle = '#8b5e34'; ctx.beginPath(); ctx.ellipse(x, y + cell * 0.05, cell * 0.3, cell * 0.22, 0, 0, 7); ctx.fill();
        ctx.fillStyle = '#6b4423'; ctx.beginPath(); ctx.ellipse(x - cell * 0.05, y + cell * 0.04, cell * 0.17, cell * 0.11, 0.3, 0, 7); ctx.fill();
        ctx.fillStyle = '#9c6b3e'; ctx.beginPath(); ctx.arc(x + cell * 0.22, y - cell * 0.12, cell * 0.12, 0, 7); ctx.fill();
        ctx.fillStyle = '#f59e0b'; ctx.beginPath(); ctx.moveTo(x + cell * 0.33, y - cell * 0.13); ctx.lineTo(x + cell * 0.44, y - cell * 0.09); ctx.lineTo(x + cell * 0.32, y - cell * 0.06); ctx.fill();
        ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(x + cell * 0.25, y - cell * 0.15, cell * 0.025, 0, 7); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    // Jars: A, B and C
    for (const j of G.jars) {
      const x = cx(j.x), y = cy(j.y), pulse = 1 + Math.sin(t / 180 + j.n) * 0.06, s = cell * 1.18 * pulse, col = JAR[j.n].c;
      ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.ellipse(x, y + s * 0.4, s * 0.34, s * 0.09, 0, 0, 7); ctx.fill();
      const jar = pic('jar.png');
      if (jar) {
        ctx.save(); ctx.shadowColor = col; ctx.shadowBlur = cell * 0.6; stand(ctx, jar, x, y + s * 0.44, s * 1.3); ctx.restore();
        const by = y - s * 0.13, br = s * 0.25;
        ctx.fillStyle = col; ctx.strokeStyle = '#fff'; ctx.lineWidth = Math.max(1.5, cell * 0.06);
        ctx.beginPath(); ctx.arc(x, by, br, 0, 7); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.font = `900 ${Math.round(s * 0.34)}px system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(JAR[j.n].l, x, by + s * 0.01);
        continue;
      }
      ctx.fillStyle = col; ctx.strokeStyle = '#3b2412'; ctx.lineWidth = Math.max(1, cell * 0.05);
      ctx.beginPath(); ctx.ellipse(x, y + s * 0.08, s * 0.36, s * 0.33, 0, 0, 7); ctx.fill(); ctx.stroke();
      ctx.fillRect(x - s * 0.15, y - s * 0.36, s * 0.3, s * 0.18); ctx.strokeRect(x - s * 0.15, y - s * 0.36, s * 0.3, s * 0.18);
      ctx.fillStyle = '#fff'; ctx.font = `900 ${Math.round(s * 0.46)}px system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(JAR[j.n].l, x, y + s * 0.1);
    }
    // The brass serpent on its pole
    if (G.brass) {
      const x = cx(G.brass.x), y = cy(G.brass.y), left = G.brass.until - G.time, brass = pic('brass.png');
      ctx.globalAlpha = left < 3000 ? 0.45 + 0.55 * Math.abs(Math.sin(t / 110)) : 1;
      ctx.save(); ctx.shadowColor = '#fde047'; ctx.shadowBlur = cell * 0.6;
      if (brass) stand(ctx, brass, x, y + cell * 0.55, cell * 1.3);
      else {
        ctx.strokeStyle = '#6b4423'; ctx.lineWidth = cell * 0.1; ctx.beginPath(); ctx.moveTo(x, y + cell * 0.45); ctx.lineTo(x, y - cell * 0.42); ctx.stroke();
        ctx.strokeStyle = '#d4943a'; ctx.lineWidth = cell * 0.13; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(x - cell * 0.05, y + cell * 0.3); ctx.bezierCurveTo(x + cell * 0.4, y + cell * 0.15, x - cell * 0.4, y - cell * 0.05, x + cell * 0.05, y - cell * 0.25); ctx.stroke();
        ctx.fillStyle = '#f0b55a'; ctx.beginPath(); ctx.arc(x + cell * 0.1, y - cell * 0.3, cell * 0.1, 0, 7); ctx.fill();
      }
      ctx.restore(); ctx.globalAlpha = 1;
    }
    // Fiery serpents
    for (const f of G.fiery) {
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.strokeStyle = '#dc2626'; ctx.lineWidth = cell * 0.5;
      ctx.beginPath(); f.body.forEach((p, n) => n ? ctx.lineTo(cx(p.x), cy(p.y)) : ctx.moveTo(cx(p.x), cy(p.y))); ctx.stroke();
      ctx.strokeStyle = `rgba(251,146,60,${0.6 + 0.4 * Math.sin(t / 70)})`; ctx.lineWidth = cell * 0.22; ctx.stroke();
      const h = f.body[0]; ctx.fillStyle = '#7f1d1d'; ctx.beginPath(); ctx.arc(cx(h.x), cy(h.y), cell * 0.28, 0, 7); ctx.fill();
      ctx.fillStyle = '#fde047'; ctx.beginPath(); ctx.arc(cx(h.x) + f.dir.x * cell * 0.1 - f.dir.y * cell * 0.1, cy(h.y) + f.dir.y * cell * 0.1 + f.dir.x * cell * 0.1, cell * 0.06, 0, 7); ctx.fill();
    }
    // The snakes
    for (const s of G.snakes) if (s.alive) drawSnake(ctx, s, cell, cx, cy, t);
    // 3, 2, 1, before the snake moves
    if (G.ready > 0) {
      const n = Math.ceil(G.ready / 1000), w = G.cols * cell, h = G.rows * cell;
      ctx.fillStyle = 'rgba(30,18,6,.35)'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#fff'; ctx.strokeStyle = 'rgba(0,0,0,.55)'; ctx.lineWidth = 6; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = `900 ${Math.round(Math.min(w, h) * 0.3)}px system-ui, sans-serif`; ctx.strokeText(n, w / 2, h / 2); ctx.fillText(n, w / 2, h / 2);
      ctx.font = `800 ${Math.round(cell * 0.8)}px system-ui, sans-serif`;
      const tip = G.readyTip || (G.mode === '2p' ? 'Player 1: arrows · Player 2: W A S D' : coarse() ? 'Swipe or use the pad to steer' : 'Arrow keys or W A S D to steer');
      ctx.strokeText(tip, w / 2, h / 2 + Math.min(w, h) * 0.22); ctx.fillText(tip, w / 2, h / 2 + Math.min(w, h) * 0.22);
    }
    // Points and words rising from where they happened
    G.floats = G.floats.filter(f => G.time - f.at < 1400 || G.state !== 'play');
    for (const f of G.floats) {
      const age = Math.min(1, (G.time - f.at) / 1400);
      ctx.globalAlpha = 1 - age; ctx.fillStyle = f.color; ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.lineWidth = 3;
      ctx.font = `900 ${Math.round(cell * 0.62)}px system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const x = Math.min(Math.max(cx(f.x), cell * 2), (G.cols - 2) * cell), y = cy(f.y) - age * cell * 1.4;
      ctx.strokeText(f.text, x, y); ctx.fillText(f.text, x, y); ctx.globalAlpha = 1;
    }
  }
  function drawSnake(ctx, s, cell, cx, cy, t) {
    ctx.lineJoin = 'round';
    const b = s.body, sk = s.skin;
    ctx.globalAlpha = ghost(s) ? 0.45 + 0.35 * Math.abs(Math.sin(t / 80)) : 1;
    
    // Draw people from tail to head
    for (let n = b.length - 1; n >= 0; n--) {
      const p = b[n], x = cx(p.x), y = cy(p.y);
      const isHead = n === 0;
      
      // Figure out direction this person is facing
      let dx = 0, dy = 0;
      if (isHead) {
        dx = s.dir.x; dy = s.dir.y;
      } else {
        const ahead = b[n - 1];
        dx = ahead.x - p.x; dy = ahead.y - p.y;
        if (dx === 0 && dy === 0) { dx = s.dir.x; dy = s.dir.y; } // fallback
      }
      
      // Wobble for walking animation
      const walk = Math.sin((t / 150) + n) * cell * 0.1;
      
      // Shoulders/Tunic
      ctx.fillStyle = sk.body;
      ctx.strokeStyle = sk.dark;
      ctx.lineWidth = cell * 0.08;
      ctx.beginPath();
      // Ellipse perpendicular to walking direction
      const angle = Math.atan2(dy, dx);
      ctx.ellipse(x + dx * walk, y + dy * walk, cell * 0.35, cell * 0.25, angle + Math.PI/2, 0, 7);
      ctx.fill();
      ctx.stroke();
      
      // Head/Skin
      ctx.fillStyle = sk.belly;
      ctx.beginPath();
      ctx.arc(x + dx * cell * 0.1, y + dy * cell * 0.1, cell * 0.2, 0, 7);
      ctx.fill();
      ctx.stroke();
      
      // Hair/Headdress
      ctx.fillStyle = sk.dark;
      ctx.beginPath();
      ctx.arc(x + dx * cell * 0.05, y + dy * cell * 0.05, cell * 0.18, angle + Math.PI/2, angle - Math.PI/2, true);
      ctx.fill();
      
      // Leader gets a staff
      if (isHead) {
        ctx.strokeStyle = '#6b4423'; // wood brown
        ctx.lineWidth = cell * 0.1;
        ctx.lineCap = 'round';
        ctx.beginPath();
        const staffX = x + Math.cos(angle + Math.PI/4) * cell * 0.4;
        const staffY = y + Math.sin(angle + Math.PI/4) * cell * 0.4;
        ctx.moveTo(staffX, staffY);
        ctx.lineTo(staffX + dx * cell * 0.6, staffY + dy * cell * 0.6);
        ctx.stroke();
      }
    }
    
    // Brass serpent buff indicator
    if (s.brass) {
      const h = b[0];
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(cx(h.x) - s.dir.x * cell * 0.3, cy(h.y) - s.dir.y * cell * 0.3, cell * 0.12, 0, 7);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // ===================== the screens =====================

  const brassIcon = '<svg class="sn-ico" viewBox="0 0 20 24" aria-hidden="true"><line x1="10" y1="23" x2="10" y2="2" stroke="#6b4423" stroke-width="2.4"/><path d="M9 19 C17 16, 3 11, 11 6" fill="none" stroke="#d4943a" stroke-width="3" stroke-linecap="round"/><circle cx="12" cy="5" r="2.2" fill="#f0b55a"/></svg>';
  const skinDot = s => `<span class="sn-dot" style="background:${s.skin.body}"></span>`;
  const fmt = n => Number(n || 0).toLocaleString('en-US');

  function render() {
    if (!root) return;
    if (!G || ui.view === 'menu') return renderMenu();
    if (G.state === 'over') return renderOver();
    hud(); panel();
  }
  // Full screen is the whole app's (fullscreen.js: its button here, in the top bar and elsewhere); when it changes, refit the board if the snake hasn't moved yet.
  const fsBtn = () => window.TUFull ? TUFull.html('btn ghost') : '';
  function onFs() { setTimeout(onResize, 120); }
  function shell(body) {
    root.dataset.view = ui.view; root.dataset.mode = G ? G.mode : ui.mode;
    root.innerHTML = `<div class="sn-top">
        <div class="sn-name"><div class="eyebrow">Arcade · no XP, just for fun</div><div class="board-title">Wilderness Caravan</div></div>
        <div id="snHud" class="sn-hud"></div>
        <div class="sn-btns">${G && G.state === 'play' && ui.view === 'game' ? '<button class="btn ghost" data-sn="pause" aria-label="Pause"><svg class="sn-ico2" viewBox="0 0 12 14" aria-hidden="true"><rect x="1" y="1" width="3.5" height="12" rx="1" fill="currentColor"/><rect x="7.5" y="1" width="3.5" height="12" rx="1" fill="currentColor"/></svg></button>' : ''}${fsBtn()}<button class="btn ghost" data-sn="sound" aria-label="Sound on or off">${saved().muted ? '🔈' : '🔊'}</button><button class="btn ghost" data-sn="exit">Exit</button></div>
      </div>${body}`;
  }

  function renderMenu() {
    ui.view = 'menu';
    const two = ui.mode === '2p', me = host.player().name || '';
    shell(`<div class="sn-menu">
      <img class="sn-hero" src="arcade/snake.jpg" width="960" height="480" alt="The camp of Israel at sunrise: families gather manna into baskets, quail fly over, and a caravan winds toward the manna.">
      <p class="sn-hook">${host.html(C().hook || '')}</p>
      <div class="sn-modes" role="radiogroup" aria-label="Players">
        <button class="sn-mode${ui.mode === '1p' ? ' on' : ''}" data-sn="mode" data-v="1p" role="radio" aria-checked="${ui.mode === '1p'}"><b>1 player</b><small>Arrows or WASD</small></button>
        <button class="sn-mode${ui.mode === '2p' ? ' on' : ''}" data-sn="mode" data-v="2p" role="radio" aria-checked="${ui.mode === '2p'}"><b>2 players, local</b><small>Most points wins</small></button>
        <button class="sn-mode${ui.mode === 'host' ? ' on' : ''}" data-sn="mode" data-v="host" role="radio" aria-checked="${ui.mode === 'host'}"><b>Host Game</b><small>Create room code</small></button>
        <button class="sn-mode${ui.mode === 'join' ? ' on' : ''}" data-sn="mode" data-v="join" role="radio" aria-checked="${ui.mode === 'join'}"><b>Join Game</b><small>Enter room code</small></button>
      </div>
      ${ui.mode === '2p' ? `<div class="sn-names">
        <label>${skinDot({ skin: SKIN[0] })}<span>Player 1 · arrow keys${coarse() ? ' · right pad' : ''}</span><input class="field" id="snN0" maxlength="16" value="${esc(ui.names[0] || me || 'Player 1')}"></label>
        <label>${skinDot({ skin: SKIN[1] })}<span>Player 2 · W A S D${coarse() ? ' · left pad' : ''}</span><input class="field" id="snN1" maxlength="16" value="${esc(ui.names[1] || 'Player 2')}"></label></div>` : ''}
      ${ui.mode === 'host' ? `<div class="sn-names"><label><input type="checkbox" id="snHostPlay" checked> I am Player 1 (uncheck if this is just a TV/Screen)</label></div>` : ''}
      ${ui.mode === 'join' ? `<div class="sn-names"><label>Room Code: <input class="field" id="snJoinCode" placeholder="4-digit code" maxlength="4" style="text-transform:uppercase;"></label><label><input type="checkbox" id="snJoinScreen" checked> Show game screen (uncheck to use as remote controller only)</label></div>` : ''}
      <div class="board-actions"><button class="btn" data-sn="start">▶ Start</button></div>
      <ul class="sn-how">
        <li><b>Manna</b> grows your caravan. Don’t hit the cliffs, the rocks or yourself.</li>
        <li>Every ${T.qEvery} manna, a <b>question</b> from this week’s reading drops three jars, <b class="sn-a">A</b> <b class="sn-b">B</b> <b class="sn-c">C</b>. Eat the right one: +${T.right} and you grow ${T.grow.right}, more for a streak (up to ×${T.streakMax + 1}). The wrong one: you shrink ${T.shrink}.</li>
        <li>${brassIcon}<b>The brass serpent</b> comes with every 3 right in a row: crash once, and you look and live.</li>
        <li>Each level is faster, then brings rocks, then <b>fiery serpents</b>.</li>
      </ul>
      <div id="snBoardList" class="sn-scores">${scoresHtml()}</div>
    </div>`);
    hud();
  }
  // The family's best scores (each person's best), or this device's.
  function scoresHtml() {
    const fam = ui.fam || saved().fam, top = saved().top || [];
    if (fam && fam.length) return `<div class="eyebrow">👪 Family best</div><ol>${fam.slice(0, 8).map(f => `<li${f.me ? ' class="me"' : ''}><span>${esc(f.name)}</span><b>${fmt(f.best)}</b></li>`).join('')}</ol>`;
    if (top.length) return `<div class="eyebrow">Best on this device</div><ol>${top.slice(0, 5).map(f => `<li><span>${esc(f.name)}</span><b>${fmt(f.score)}</b></li>`).join('')}</ol>`;
    return '<p class="sn-note">No scores yet. Be the first!</p>';
  }
  function loadFamily() {
    return Promise.resolve(host.familyBests('snake')).then(list => {
      if (!list) return;
      ui.fam = list.sort((a, b) => b.best - a.best);
      save({ fam: ui.fam });
      const el = $('snBoardList');
      if (el) el.innerHTML = scoresHtml();
    }, () => {});
  }

  function renderGame() {
    ui.view = 'game';
    shell(`<div id="snPanel" class="sn-panel" aria-live="polite"></div>
      <div id="snStage" class="sn-stage"><div class="sn-frame${coarse() ? ' pads' : ''}"><canvas id="snCanvas" role="img" aria-label="The desert: your caravan, manna, and any jars"></canvas>${coarse() ? padsHtml() : ''}<div id="snRead" class="sn-read" hidden></div><div id="snPause" class="sn-pausebox" hidden></div></div></div>`);
    bg = null;
    hud(); panel(); readCard();
  }
  // Size the grid to the stage now that it's on the screen; before the snake has moved, again when the screen changes (say, ⛶).
  function fit() {
    const st = $('snStage');
    if (!st || !G) return;
    const r = st.getBoundingClientRect(), d = gridFor(r.width - 16, r.height - 16);
    if (d.cols === G.cols && d.rows === G.rows) return;
    newGame(G.mode, d);
    bg = null; hud(); panel(); readCard();
  }
  function onResize() { if (G && ui.view === 'game' && G.state === 'play' && G.tickN === 0 && !G.q) fit(); }
  // The question, big over the board, while everything waits.
  function readCard() {
    const el = $('snRead');
    if (!el) return;
    const r = G && G.reading, q = G && G.q;
    if (!r || !q) { if (!el.hidden) { el.hidden = true; el.innerHTML = ''; el._html = ''; } return; }
    const two = G.mode === '2p';
    const who = two ? `<div class="sn-rd-who">${G.snakes.map(x => `<span class="${r.ready[x.i] ? 'on' : ''}">${skinDot(x)}${esc(x.name)} ${r.ready[x.i] ? '✓ ready' : x.i === 0 ? '· any arrow' : '· W A S D'}</span>`).join('')}</div>` : '';
    const html = `<div class="sn-rd-card">
      <div class="eyebrow">📜 ${q.review ? 'A review' : 'This week'} · read it, then go</div>
      <p class="sn-rd-q">${esc(q.q)}</p>
      <div class="sn-rd-ans">${q.choices.map((c, n) => `<div><b style="background:${JAR[n].c}">${JAR[n].l}</b><span>${esc(c)}</span></div>`).join('')}</div>
      ${who}
      <div class="sn-rd-go"><button class="btn" data-sn="go">▶ ${two ? 'Both ready' : 'Go'}</button><small>${two ? 'or each press a direction' : coarse() ? 'or swipe, or press the pad' : 'or press an arrow key'}</small></div></div>`;
    if (el._html !== html) { el._html = html; el.innerHTML = html; }
    el.hidden = false;
  }
  function padsHtml(onlyPlayer) {
    const pad = (p, label) => `<div class="sn-pad" data-p="${p}" aria-label="${label}">
      <button data-sn="dir" data-p="${p}" data-d="up" aria-label="Up">▲</button><button data-sn="dir" data-p="${p}" data-d="left" aria-label="Left">◀</button>
      <button data-sn="dir" data-p="${p}" data-d="right" aria-label="Right">▶</button><button data-sn="dir" data-p="${p}" data-d="down" aria-label="Down">▼</button></div>`;
    if (onlyPlayer != null) return pad(onlyPlayer, 'Player ' + (onlyPlayer + 1));
    return `${G && G.mode === '2p' ? pad(1, 'Player 2') : ''}${pad(0, G && G.mode === '2p' ? 'Player 1' : 'Steer')}`;
  }
  const coarse = () => !!(window.matchMedia && window.matchMedia('(any-pointer: coarse)').matches) || !!window.TU_SNAKE_PADS;

  function hud() {
    const el = $('snHud');
    if (!el) return;
    if (!G || ui.view !== 'game') { const best = saved().best || 0; el.innerHTML = best ? `<span class="score-chip">Best ${fmt(best)}</span>` : ''; return; }
    const chips = G.snakes.map(s => `<span class="score-chip sn-chip" style="--k:${s.skin.body}">${G.mode === '2p' ? skinDot(s) + esc(s.name) + ' ' : ''}<b>${fmt(s.score)}</b>${s.streak > 1 ? ` <span class="sn-streak">×${1 + Math.min(s.streak, T.streakMax)}</span>` : ''}${s.brass ? brassIcon : ''}${!s.alive ? ' 💥' : ''}</span>`).join('');
    const left = G.mode === '2p' ? Math.max(0, Math.ceil(T.round2p - G.time / 1000)) : null;
    const codeHtml = networkConfig && gameCode ? `<span class="score-chip" style="background:#4ade80; color:#064e3b;">Code: ${gameCode}</span>` : '';
    el.innerHTML = `${codeHtml}${chips}<span class="score-chip">Level ${G.level}</span>${left != null ? `<span class="score-chip${left <= 10 ? ' sn-hot' : ''}">⏱ ${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}</span>` : `<span class="score-chip sn-best">Best ${fmt(Math.max(saved().best || 0, G.snakes[0].score))}</span>`}`;
  }
  // Above the desert: the question and its jars, then whether it was right and why; otherwise a line from the story.
  function panel() {
    const el = $('snPanel');
    if (!el || !G) return;
    let html;
    if (G.q && G.reading) {
      html = `<p class="sn-idle">📜 A question! Read it, then go.</p><p class="sn-why">The caravan waits while you read.</p>`;
    } else if (G.q) {
      const wait = G.q.until === Infinity;   // the 3, 2, 1 after reading: the clock hasn't started
      const left = wait ? T.qSeconds : Math.max(0, Math.ceil((G.q.until - G.time) / 1000)), pct = wait ? 100 : Math.max(0, (G.q.until - G.time) / (T.qSeconds * 1000)) * 100;
      html = `<div class="sn-qhead"><span class="eyebrow">📜 Eat the right jar · tap here to read it again</span><b class="${left <= 5 ? 'sn-hot' : ''}">${left}s</b></div>
        <div class="sn-bar"><i style="width:${pct}%"></i></div>
        <p class="sn-q">${esc(G.q.q)}</p>
        <div class="sn-answers">${G.q.choices.map((c, n) => `<div class="sn-ans"><b style="background:${JAR[n].c}">${JAR[n].l}</b><span>${esc(c)}</span></div>`).join('')}</div>`;
    } else if (G.banner) {
      html = `<p class="sn-fb ok">${esc(G.banner.text)}</p>${G.banner.line ? `<p class="sn-why">${host.html(G.banner.line)}</p>` : ''}`;
    } else if (G.fb) {
      const f = G.fb, s = f.by != null ? G.snakes[f.by] : null, who = G.mode === '2p' && s ? esc(s.name) + ': ' : '';
      const head = f.timeout ? `⏳ Time’s up. The answer: ${esc(f.q.right)}.` : f.right ? `✅ ${who}Right! ${esc(f.q.right)}.` : `❌ ${who}Not quite. The answer: ${esc(f.q.right)}.`;
      html = `<p class="sn-fb ${f.right ? 'ok' : 'no'}">${head}</p>${f.q.why ? `<p class="sn-why">${host.html(f.q.why, f.q.ref)}</p>` : ''}`;
    } else {
      const n = T.qEvery - G.mannaSinceQ;
      html = `<p class="sn-idle">Gather manna. ${n <= 1 ? 'The next one brings a question!' : `${n} more and a question drops three jars.`}</p><p class="sn-why">${host.html(L().manna || '')}</p>`;
    }
    if (el._html !== html) { el._html = html; el.innerHTML = html; }
  }

  function renderOver() {
    ui.view = 'over';
    const lines = L();
    let body;
    if (G.mode === '1p') {
      const s = G.snakes[0];
      body = `<div class="sn-menu sn-over">
        <div class="eyebrow">${G.newBest ? '🏆 New best!' : 'The caravan rests'}</div>
        <div class="sn-big">${fmt(s.score)}</div>
        <p class="sn-note">${s.right} of ${G.asked} ${G.asked === 1 ? 'question' : 'questions'} right · best streak ${s.bestStreak} · level ${G.level} · length ${s.body.length}</p>
        <p class="sn-hook">${host.html(lines.over || '')}</p>
        <div class="board-actions"><button class="btn" data-sn="again">▶ Play again</button><button class="btn ghost" data-sn="menu">Menu</button></div>
        <div id="snBoardList" class="sn-scores">${scoresHtml()}</div></div>`;
    } else {
      const [a, b] = G.snakes, win = a.score === b.score ? null : a.score > b.score ? a : b;
      body = `<div class="sn-menu sn-over">
        <div class="eyebrow">Time’s up!</div>
        <div class="sn-big">${win ? skinDot(win) + esc(win.name) + ' wins!' : 'A tie!'}</div>
        <div class="sn-vs">${G.snakes.map(s => `<div>${skinDot(s)}<b>${esc(s.name)}</b><span>${fmt(s.score)}</span><small>${s.right} right · ${s.wrong} wrong</small></div>`).join('')}</div>
        <p class="sn-hook">${host.html(lines.over || '')}</p>
        <div class="board-actions"><button class="btn" data-sn="again">▶ Rematch</button><button class="btn ghost" data-sn="menu">Menu</button></div></div>`;
    }
    shell(body);
  }

  function pause(on) {
    if (!G || G.state !== 'play') return;
    G.paused = on;
    const box = $('snPause');
    if (box) {
      box.hidden = !on;
      box.innerHTML = on ? '<div class="sn-pausecard"><b>Paused</b><div class="board-actions"><button class="btn" data-sn="resume">▶ Resume</button><button class="btn ghost" data-sn="quit">End game</button></div></div>' : '';
    }
  }

  // ----- input -----
  function onKey(e) {
    if (!root || root.hidden) return;
    if (e.target && /^(INPUT|TEXTAREA)$/.test(e.target.tagName) && e.key !== 'Enter') return;
    const k = e.key, two = G && G.mode === '2p';
    const p1 = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' }[k];
    const p2 = { w: 'up', s: 'down', a: 'left', d: 'right', W: 'up', S: 'down', A: 'left', D: 'right' }[k];
    if (ui.view === 'game' && G && G.state === 'play') {
      if (G.reading && !G.paused && (k === ' ' || k === 'Enter')) { e.preventDefault(); ready(null); return; }
      if (p1) { e.preventDefault(); turn(0, p1); return; }
      if (p2) { e.preventDefault(); turn(two ? 1 : 0, p2); return; }
      if (k === ' ' || k === 'p' || k === 'P' || k === 'Escape') { e.preventDefault(); pause(!G.paused); return; }
    } else if (k === 'Enter' && (ui.view === 'menu' || ui.view === 'over')) { e.preventDefault(); start(); }
  }
  function onClick(e) {
    const b = e.target.closest('[data-sn]');
    if (!b && e.target.closest('#snPanel') && !e.target.closest('a')) { reread(); return; }
    if (!b || b.disabled) return;
    const act = b.dataset.sn;
    wakeAudio();
    if (act === 'exit') close();
    else if (act === 'sound') { save({ muted: !saved().muted }); b.textContent = saved().muted ? '🔈' : '🔊'; }
    else if (act === 'mode') { readNames(); ui.mode = b.dataset.v; renderMenu(); }
    else if (act === 'start' || act === 'again') start();
    else if (act === 'menu') { G = null; renderMenu(); loadFamily(); }
    else if (act === 'pause') pause(!G.paused);
    else if (act === 'resume') pause(false);
    else if (act === 'quit') { pause(false); gameOver(); }
    else if (act === 'go') ready(null);
    else if (act === 'ready') { if (networkConfig && networkConfig.myPlayer != null) ready(networkConfig.myPlayer, null); }
  }
  // The pads steer on touch, right away (not on the click after it).
  function onPadDown(e) {
    const b = e.target.closest('[data-sn="dir"]');
    if (!b) return;
    e.preventDefault();
    turn(Number(b.dataset.p), b.dataset.d);
  }
  // A swipe on the desert: one player anywhere; two players, each on their own half (Player 2 on the left).
  let swipe = null;
  function onDown(e) { if (e.target.id === 'snCanvas') swipe = { x: e.clientX, y: e.clientY, p: G && G.mode === '2p' && e.clientX < e.target.getBoundingClientRect().left + e.target.clientWidth / 2 ? 1 : 0 }; }
  function onMove(e) {
    if (!swipe) return;
    const dx = e.clientX - swipe.x, dy = e.clientY - swipe.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 18) return;
    turn(swipe.p, Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
    swipe = { x: e.clientX, y: e.clientY, p: swipe.p };
  }
  function onUp() { swipe = null; }
  function onHide() { if (document.hidden && G && G.state === 'play') pause(true); }

  function readNames() { const a = $('snN0'), b = $('snN1'); if (a) ui.names[0] = a.value.trim(); if (b) ui.names[1] = b.value.trim(); }
  function listenInputs() {
    if (!dbGameRef) return;
    unsubscribeInputs = dbGameRef.collection('inputs').orderBy('time').onSnapshot(snap => {
      snap.docChanges().forEach(change => {
        if (change.type === 'added') {
          const data = change.doc.data();
          if (data.sender !== myClientId) {
            if (data.ready) ready(data.player, null, true);
            else if (data.dir) turn(data.player, data.dir, true);
          }
        }
      });
    });
  }

  async function start() {
    readNames();
    const btn = document.querySelector('[data-sn="start"]');
    if (btn) btn.disabled = true;

    try {
      if (ui.mode === 'host') {
        const isPlay = $('snHostPlay') ? $('snHostPlay').checked : true;
        gameCode = Math.floor(1000 + Math.random() * 9000).toString();
        const seed = Date.now();
        window.TU_SNAKE_SEED = seed;
        myClientId = Math.random().toString(36).slice(2);
        
        const db = await host.db();
        dbGameRef = db.collection('arcade_snake').doc(gameCode);
        await dbGameRef.set({ seed, hostIsPlay: isPlay, playersJoined: 0, createdAt: host.fv().serverTimestamp() });
        
        networkConfig = { role: 'host', isTV: !isPlay, myPlayer: isPlay ? 0 : null };
        listenInputs();
        
        newGame('2p');
        renderGame();
      } else if (ui.mode === 'join') {
        const code = ($('snJoinCode') ? $('snJoinCode').value : '').toUpperCase();
        if (!code) { if (btn) btn.disabled = false; return alert('Enter code'); }
        const showScreen = $('snJoinScreen') ? $('snJoinScreen').checked : true;
        myClientId = Math.random().toString(36).slice(2);
        
        const db = await host.db();
        dbGameRef = db.collection('arcade_snake').doc(code);
        const doc = await dbGameRef.get();
        if (!doc.exists) { if (btn) btn.disabled = false; return alert('Game not found'); }
        
        const data = doc.data();
        const pIndex = (data.playersJoined || 0) + (data.hostIsPlay ? 1 : 0);
        if (pIndex > 1) { if (btn) btn.disabled = false; return alert('Game full'); }
        await dbGameRef.update({ playersJoined: (data.playersJoined || 0) + 1 });
        
        window.TU_SNAKE_SEED = data.seed;
        networkConfig = { role: 'join', seeScreen: showScreen, myPlayer: pIndex };
        gameCode = code;
        listenInputs();
        
        if (showScreen) {
          newGame('2p');
          renderGame();
        } else {
          renderRemote();
          return;
        }
      } else {
        networkConfig = null;
        window.TU_SNAKE_SEED = null;
        gameCode = null;
        newGame(ui.mode);
        renderGame();
      }
      fit();
      last = performance.now();
    } catch (e) {
      console.error(e);
      alert('Network error');
      if (btn) btn.disabled = false;
    }
  }

  function renderRemote() {
    ui.view = 'remote';
    shell(`<div class="sn-remote" style="text-align:center; padding: 40px; display:flex; flex-direction:column; align-items:center;">
      <div class="eyebrow">Remote Controller</div>
      <h2 style="color:#fff; margin-bottom: 20px;">You are Player ${networkConfig.myPlayer + 1}</h2>
      <div style="position:relative; width: 160px; height: 160px; margin-bottom: 20px;">
        ${padsHtml(networkConfig.myPlayer)}
      </div>
      <div style="margin-top: 20px;">
        <button class="btn" data-sn="ready" style="padding: 12px 24px; font-size: 18px;">▶ Ready / Go</button>
      </div>
    </div>`);
  }

  function frame(now) {
    if (!root || root.hidden) return;
    const dt = Math.min(250, now - last);
    last = now;
    if (G && G.state === 'play' && ui.view === 'game' && !G.paused && !manual() && G.ready > 0) {   // 3, 2, 1…
      const was = Math.ceil(G.ready / 1000);
      G.ready = Math.max(0, G.ready - dt);
      const now1 = Math.ceil(G.ready / 1000);
      if (now1 !== was) sound(now1 ? 'tick' : 'go');
      if (!G.ready) { G.readyTip = null; if (G.q && G.q.until === Infinity) G.q.until = G.time + T.qSeconds * 1000; }
    }
    else if (G && G.state === 'play' && ui.view === 'game' && !G.paused && !manual() && !G.reading) {
      G.acc += dt;
      let n = 0;
      while (G.acc >= tickMs() && G.state === 'play' && n++ < 5) { G.acc -= tickMs(); step(); }
      if (G.state !== 'play') { raf = requestAnimationFrame(frame); return; }
    }
    if (G && ui.view === 'game') { draw(now); hud(); panel(); readCard(); }
    raf = requestAnimationFrame(frame);
  }

  function injectCss() {
    if ($('snCss')) return;
    const css = document.createElement('style');
    css.id = 'snCss';
    css.textContent = `
      #snake .sn-top { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
      #snake .sn-hud { display: flex; gap: 6px; flex-wrap: wrap; margin-left: auto; }
      #snake .sn-btns { display: flex; gap: 6px; }
      #snake .sn-chip { border-color: var(--k); display: inline-flex; align-items: center; gap: 4px; }
      #snake .sn-streak { color: #fbbf24; }
      #snake .sn-hot { color: #fca5a5; }
      #snake .sn-ico { display: inline-block; width: 14px; height: 17px; vertical-align: -3px; margin: 0 4px 0 2px; }
      #snake .sn-dot { display: inline-block; width: 12px; height: 12px; border-radius: 50%; margin-right: 6px; vertical-align: -1px; border: 2px solid rgba(255,255,255,.6); }
      #snake .sn-menu { max-width: 640px; width: 100%; margin: 14px auto 0; display: grid; gap: 12px; }
      #snake .sn-hero { display: block; width: 100%; height: auto; max-height: 34vh; aspect-ratio: 2 / 1; object-fit: cover; border-radius: 14px; box-shadow: 0 8px 28px rgba(0,0,0,.4); }
      #snake .sn-hook { font-size: 16px; line-height: 1.45; color: rgba(255,255,255,.88); margin: 0; }
      #snake .sn-modes { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
      #snake .sn-mode { display: grid; gap: 4px; padding: 14px; border-radius: 16px; border: 2px solid rgba(255,255,255,.18); background: rgba(255,255,255,.06); color: #fff; font: inherit; text-align: left; cursor: pointer; }
      #snake .sn-mode.on { border-color: var(--gold); background: rgba(253,230,138,.12); }
      #snake .sn-mode b { font-size: 18px; } #snake .sn-mode small { color: rgba(255,255,255,.7); font-weight: 600; }
      #snake .sn-names { display: grid; gap: 8px; } #snake .sn-names label { display: grid; gap: 4px; font-weight: 700; font-size: 14px; }
      #snake .sn-how { margin: 0; padding-left: 20px; display: grid; gap: 6px; font-size: 15px; line-height: 1.4; color: rgba(255,255,255,.85); }
      #snake .sn-a, #snake .sn-b, #snake .sn-c { display: inline-block; min-width: 1.5em; text-align: center; border-radius: 6px; color: #fff; }
      #snake .sn-a { background: ${JAR[0].c}; } #snake .sn-b { background: ${JAR[1].c}; } #snake .sn-c { background: ${JAR[2].c}; }
      #snake .sn-scores ol { margin: 6px 0 0; padding: 0; list-style: none; display: grid; gap: 4px; counter-reset: r; }
      #snake .sn-scores li { display: flex; justify-content: space-between; gap: 10px; padding: 6px 10px; border-radius: 10px; background: rgba(255,255,255,.06); counter-increment: r; }
      #snake .sn-scores li span::before { content: counter(r) ". "; color: rgba(255,255,255,.55); }
      #snake .sn-scores li.me { outline: 2px solid var(--gold); }
      #snake .sn-note { color: rgba(255,255,255,.7); font-size: 14px; margin: 0; }
      #snake[data-view="game"] { padding-top: calc(var(--sat) + 8px); padding-bottom: calc(var(--sab) + 8px); }
      #snake .sn-panel { margin-top: 8px; height: 7.8em; overflow: hidden; padding: 6px 12px; border-radius: 14px; background: rgba(0,0,0,.25); border: 1px solid rgba(255,255,255,.12); font-size: 13px; cursor: default; flex: none; }
      #snake .sn-panel .sn-why { display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
      #snake .sn-panel .sn-q { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      #snake .sn-panel .sn-ans span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; }
      #snake .sn-panel .sn-q { margin-bottom: 3px; } #snake .sn-panel .sn-bar { margin: 3px 0 4px; } #snake .sn-panel .sn-answers { gap: 2px; } #snake .sn-panel .sn-ans b { width: 1.35em; height: 1.35em; }
      @media (min-width: 760px) { #snake .sn-panel { height: 6.6em; font-size: 15px; } #snake .sn-answers { grid-template-columns: repeat(3, 1fr); gap: 10px; } #snake .sn-panel .sn-why { -webkit-line-clamp: 2; } }
      @media (max-height: 560px) { #snake .sn-panel { height: 4.4em; } #snake .sn-panel .sn-q { display: none; } }
      #snake .sn-qhead { display: flex; justify-content: space-between; align-items: center; gap: 8px; } #snake .sn-qhead .eyebrow { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; }
      #snake .sn-bar { height: 4px; border-radius: 4px; background: rgba(255,255,255,.12); margin: 4px 0 6px; overflow: hidden; } #snake .sn-bar i { display: block; height: 100%; background: var(--gold); }
      #snake .sn-q { margin: 0 0 6px; font-weight: 800; font-size: clamp(15px, 1.5vw, 21px); line-height: 1.25; }
      #snake .sn-answers { display: grid; gap: 4px; }
      #snake .sn-ans { display: flex; gap: 8px; align-items: center; font-size: clamp(13px, 1.3vw, 18px); font-weight: 600; line-height: 1.2; }
      #snake .sn-ans b { flex: 0 0 auto; width: 1.6em; height: 1.6em; display: grid; place-items: center; border-radius: 50%; color: #fff; }
      #snake .sn-fb { margin: 0 0 4px; font-weight: 800; font-size: clamp(15px, 1.6vw, 21px); } #snake .sn-fb.ok { color: #86efac; } #snake .sn-fb.no { color: #fca5a5; }
      #snake .sn-why, #snake .sn-idle { margin: 0; font-size: clamp(13px, 1.4vw, 18px); line-height: 1.4; color: rgba(255,255,255,.85); }
      #snake .sn-idle { font-weight: 800; color: #fff; margin-bottom: 4px; }
      #snake .sn-stage { flex: 1; min-height: 200px; display: grid; place-items: center; margin-top: 8px; }
      #snake .sn-read[hidden] { display: none; }
      #snake .sn-read { position: absolute; inset: 0; z-index: 2; display: grid; place-items: center; padding: 10px; background: rgba(12,8,24,.62); line-height: 1.3; overflow-y: auto; }
      #snake .sn-frame.pads .sn-read { bottom: 148px; }   /* the pads stay free below it, to say you're ready */
      #snake .sn-pausebox { z-index: 3; }
      #snake .sn-chip, #snake .score-chip { white-space: nowrap; }
      #snake .sn-rd-card { width: min(100%, 760px); display: grid; gap: 12px; padding: clamp(14px, 2.4vw, 26px); border-radius: 18px; background: rgba(20,16,40,.95); border: 1px solid rgba(255,255,255,.16); box-shadow: 0 12px 40px rgba(0,0,0,.5); }
      #snake .sn-rd-q { margin: 0; font-size: clamp(18px, 2.6vw, 30px); font-weight: 800; line-height: 1.3; }
      #snake .sn-rd-ans { display: grid; gap: 8px; }
      #snake .sn-rd-ans div { display: flex; gap: 10px; align-items: center; font-size: clamp(16px, 2.1vw, 24px); font-weight: 600; line-height: 1.25; }
      #snake .sn-rd-ans b { flex: 0 0 auto; width: 1.7em; height: 1.7em; display: grid; place-items: center; border-radius: 50%; color: #fff; font-weight: 900; }
      #snake .sn-rd-who { display: flex; gap: 8px; flex-wrap: wrap; } #snake .sn-rd-who span { padding: 6px 10px; border-radius: 999px; background: rgba(255,255,255,.08); font-weight: 700; font-size: 14px; } #snake .sn-rd-who span.on { background: rgba(134,239,172,.2); color: #bbf7d0; }
      #snake .sn-rd-go { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; } #snake .sn-rd-go small { color: rgba(255,255,255,.65); font-size: 14px; }
      #snake .sn-frame { position: relative; border: 6px solid #6b3f1d; border-radius: 10px; box-shadow: 0 0 0 2px #3b220e, 0 10px 30px rgba(0,0,0,.5); line-height: 0; }
      #snake canvas { display: block; touch-action: none; border-radius: 4px; }
      #snake .sn-pausebox[hidden] { display: none; }
      #snake .sn-pausebox { position: absolute; inset: 0; display: grid; place-items: center; background: rgba(15,10,5,.55); line-height: 1.3; }
      #snake .sn-pausecard { display: grid; gap: 10px; padding: 16px 20px; border-radius: 16px; background: rgba(20,16,40,.92); text-align: center; } #snake .sn-pausecard b { font-size: 24px; }
      #snake .sn-pad { position: absolute; bottom: 8px; right: 8px; display: grid; grid-template-columns: repeat(3, 50px); grid-template-rows: repeat(3, 44px); gap: 4px; touch-action: none; opacity: .82; z-index: 1; }
      #snake .sn-pad[data-p="1"] { right: auto; left: 8px; }
      #snake .sn-pad button { border: 1px solid rgba(255,255,255,.35); border-radius: 12px; background: rgba(20,12,4,.38); color: #fff; font-size: 19px; touch-action: none; user-select: none; -webkit-user-select: none; text-shadow: 0 1px 2px rgba(0,0,0,.6); }
      #snake .sn-pad button:active { background: rgba(253,230,138,.55); }
      #snake .sn-pad [data-d="up"] { grid-column: 2; grid-row: 1; } #snake .sn-pad [data-d="left"] { grid-column: 1; grid-row: 2; }
      #snake .sn-pad [data-d="right"] { grid-column: 3; grid-row: 2; } #snake .sn-pad [data-d="down"] { grid-column: 2; grid-row: 3; }
      #snake .sn-big { font-size: clamp(36px, 6vw, 64px); font-weight: 900; line-height: 1.1; }
      #snake .sn-vs { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
      #snake .sn-vs > div { display: grid; gap: 2px; padding: 10px 12px; border-radius: 14px; background: rgba(255,255,255,.06); }
      #snake .sn-vs span { font-size: 28px; font-weight: 900; } #snake .sn-vs small { color: rgba(255,255,255,.7); }
      #snake .sn-ico2 { width: 14px; height: 16px; display: block; }
      @media (max-width: 520px) {
        #snake .sn-modes { grid-template-columns: 1fr; } #snake .board-title { font-size: 18px; } #snake .sn-name .eyebrow, #snake .sn-wk { display: none; }
        #snake .sn-top { display: grid; grid-template-columns: 1fr auto; } #snake .sn-hud { grid-column: 1 / -1; grid-row: 2; margin-left: 0; }
        #snake .sn-btns .btn { padding: 8px 12px; } #snake .score-chip { padding: 4px 10px; font-size: 13px; }
        #snake .sn-pad { grid-template-columns: repeat(3, 46px); grid-template-rows: repeat(3, 40px); }
        #snake[data-view="game"] .sn-name, #snake[data-view="game"] .sn-best { display: none; } #snake[data-view="game"] .sn-top { display: flex; flex-wrap: nowrap; } #snake[data-view="game"] .sn-hud { margin-left: 0; flex-wrap: nowrap; }
        #snake[data-view="game"][data-mode="2p"] .sn-top, #snake[data-view="game"][data-mode="2p"] .sn-hud { flex-wrap: wrap; }
        #snake[data-view="game"] .sn-btns { margin-left: auto; } #snake[data-view="game"] .sn-btns .btn { padding: 7px 10px; }
        #snake .sn-panel .sn-q { display: none; } #snake .sn-panel .sn-why { -webkit-line-clamp: 2; }
      }`;
    document.head.appendChild(css);
  }

  function open(h) {
    host = h;
    STORE = (h.ns || 'treasureup.') + 'snake.v1';
    root = $('snake');
    if (!root) return;
    injectCss();
    root.hidden = false;
    document.body.style.overflow = 'hidden';
    if (!ui.names[0]) ui.names[0] = host.player().name || '';
    G = null;
    renderMenu();
    loadFamily();
    const kd = e => onKey(e), ck = e => onClick(e), pd = e => onPadDown(e), dn = e => onDown(e), mv = e => onMove(e), up = () => onUp(), vis = () => onHide();
    window.addEventListener('keydown', kd);
    root.addEventListener('click', ck);
    root.addEventListener('pointerdown', pd);
    root.addEventListener('pointerdown', dn);
    window.addEventListener('pointermove', mv);
    window.addEventListener('pointerup', up);
    document.addEventListener('visibilitychange', vis);
    const rs = () => onResize(), fs = () => onFs();
    window.addEventListener('resize', rs);
    document.addEventListener('fullscreenchange', fs); document.addEventListener('webkitfullscreenchange', fs);
    keyOff = () => {
      window.removeEventListener('resize', rs); document.removeEventListener('fullscreenchange', fs); document.removeEventListener('webkitfullscreenchange', fs);
      window.removeEventListener('keydown', kd); root.removeEventListener('click', ck); root.removeEventListener('pointerdown', pd); root.removeEventListener('pointerdown', dn);
      window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); document.removeEventListener('visibilitychange', vis);
    };
    last = performance.now();
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(frame);
  }
  function close() {
    if (unsubscribeInputs) unsubscribeInputs();
    unsubscribeInputs = null;
    if (G && G.state === 'play' && G.mode === '1p' && G.snakes[0].score > 0) { G.state = 'play'; gameOver(); }   // a game left early still counts
    cancelAnimationFrame(raf);
    if (keyOff) keyOff();
    keyOff = null;
    G = null;
    if (root) { root.hidden = true; root.innerHTML = ''; }
    document.body.style.overflow = '';
    if (host && host.closed) host.closed();
  }

  window.TUSnake = {
    open, close,
    // For the tests (with window.TU_SNAKE_MANUAL set, nothing moves until step()).
    _t: {
      state: () => G, T,
      step: (n = 1) => { for (let k = 0; k < n && G && G.state === 'play'; k++) step(); render(); draw(performance.now()); },
      turn, put(kind, x, y) {
        if (kind === 'manna') G.manna.push({ x, y });
        else if (kind === 'quail') G.quail = { x, y, until: G.time + T.quailMs };
        else if (kind === 'brass') G.brass = { x, y, until: G.time + T.brassMs };
        else if (kind === 'rock') G.rocks.add(key(x, y));
      },
      clear() { G.manna = []; G.quail = null; G.brass = null; },
      ask: () => { openQuestion(); render(); readCard(); }, go: (i, d) => { ready(i == null ? null : i, d); render(); }, fit, gridFor, draw: () => draw(performance.now())
    }
  };
})();
