// Look and Live (🎮 → Look and Live): the camp of Israel when “the LORD sent
// fiery serpents among the people” (Numbers 21:6). Fiery serpents chase you
// through the tents; a bite poisons you, and the poison keeps rising. Moses
// holds up the serpent of brass on a pole: hold LOOK (or Space) to stop and
// look at it. Looking heals, and fills the meter that clears the level, but
// only while nothing stands between you and the pole (a tent, or a serpent
// crossing your view), and you can't move while you look. “The labor which
// they had to perform was to look” (1 Nephi 17:41).
//
// index.html loads this file the first time the game opens, with the words
// in content/arcade.js (window.TU_ARCADE.look), and passes the same host as
// Wilderness Snake (snake.js). No XP: just for fun. The tests drive it step by
// step with window.TU_LOOK_MANUAL and TULook._t (see the end of this file).
(function () {
  'use strict';

  const T = {
    speed: 6,                    // your speed (map units a second)
    r: 0.45,                     // your size
    snakeSpeed: 2.3, snakeStep: 0.32, snakeMax: 5.6, turn: 2.4,   // serpents: speed at level 1, faster each level, top speed, how fast they turn
    snakeLen: 11, gap: 0.34, head: 0.36,
    bite: 0.34, creep: 0.05, heal: 0.55,   // poison: a bite, the rise a second while bitten, the healing a second while looking
    look: 4, lookStep: 0.45,     // seconds of clear looking to clear level 1, and more each level
    shield: 1.0,                 // seconds after a bite before another
    flyFrom: 3,                  // the level the fiery flying serpents start
    between: 2.6                 // seconds between levels
  };
  let STORE = 'treasureup.look.v1';
  let host = null, root = null, G = null, raf = 0, last = 0, off = null, audio = null;
  const keys = new Set();
  let stick = null;              // the touch joystick: { id, x, y, dx, dy }
  let lookId = null;             // the finger holding LOOK
  const W = () => (window.TU_ARCADE && window.TU_ARCADE.look) || {};
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const $ = id => document.getElementById(id);
  const manual = () => !!window.TU_LOOK_MANUAL;
  const fmt = n => Number(n || 0).toLocaleString('en-US');
  function saved() { try { return JSON.parse(localStorage.getItem(STORE)) || {}; } catch (e) { return {}; } }
  function save(patch) { try { localStorage.setItem(STORE, JSON.stringify(Object.assign(saved(), patch))); } catch (e) {} }
  function rng(seed) { let a = seed >>> 0; return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  function sound(kind) {
    if (saved().muted || !audio) return;
    const notes = { bite: [[180, 0.18]], heal: [[784, 0.05]], clear: [[523, 0.09], [659, 0.09], [784, 0.09], [1047, 0.2]], over: [[392, 0.2], [330, 0.2], [262, 0.4]], blocked: [[220, 0.06]] }[kind] || [];
    let t = audio.currentTime + 0.01;
    notes.forEach(([f, d]) => {
      const o = audio.createOscillator(), v = audio.createGain();
      o.type = kind === 'bite' ? 'sawtooth' : 'triangle';
      o.frequency.setValueAtTime(f, t);
      v.gain.setValueAtTime(0.0001, t); v.gain.exponentialRampToValueAtTime(0.09, t + 0.01); v.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(v).connect(audio.destination); o.start(t); o.stop(t + d + 0.02); t += d;
    });
  }
  function wakeAudio() { try { if (!audio) audio = new (window.AudioContext || window.webkitAudioContext)(); if (audio.state === 'suspended') audio.resume(); } catch (e) { audio = null; } }

  // ===================== the game =====================

  function newGame() {
    const portrait = window.innerHeight > window.innerWidth * 1.05;
    const seed = typeof window.TU_LOOK_SEED === 'number' ? window.TU_LOOK_SEED : Date.now();
    G = { w: portrait ? 18 : 32, h: portrait ? 26 : 19, rand: rng(seed), time: 0, level: 0, score: 0, state: 'play', ready: manual() ? 0 : 3,
      poison: 0, faith: 0, looking: false, clear: false, block: null, shieldUntil: 0, bites: 0, levelBites: 0, levelStart: 0, lookedEver: false,
      player: { x: 0, y: 0, fx: 1, fy: 0 }, moses: { x: 0, y: 0 }, tents: [], serpents: [], floats: [], between: 0, banner: null, hurt: 0, cleared: 0 };
    nextLevel();
  }
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  function spot(minFromPlayer, minFromMoses, margin = 1.6) {
    for (let k = 0; k < 300; k++) {
      const p = { x: margin + G.rand() * (G.w - 2 * margin), y: margin + G.rand() * (G.h - 2 * margin) };
      if (dist(p, G.player) < minFromPlayer - (k > 200 ? 2 : 0) || dist(p, G.moses) < minFromMoses - (k > 200 ? 1 : 0)) continue;
      if (G.tents.some(t => dist(p, t) < t.r + 1.4)) continue;
      return p;
    }
    return { x: G.w / 2, y: G.h / 2 };
  }
  // A new level: Moses somewhere new, the tents pitched again, and more serpents, faster.
  function nextLevel() {
    G.level++;
    G.faith = 0; G.levelBites = 0; G.levelStart = G.time; G.looking = false; G.block = null;
    G.tents = [];
    G.player = Object.assign(G.player, G.level === 1 ? { x: G.w * 0.2, y: G.h * 0.7 } : {});
    G.moses = { x: 0, y: -99 };
    G.moses = spot(G.w * 0.35, 0, 2.8);
    const tents = Math.min(8, 4 + Math.floor(G.level / 2));
    for (let k = 0; k < tents; k++) {
      const p = spot(3, 3.2, 1.8);
      G.tents.push({ x: p.x, y: p.y, r: 0.95, turn: G.rand() * 0.6 - 0.3 });
    }
    const n = Math.min(9, 1 + G.level), speed = Math.min(T.snakeMax, T.snakeSpeed + (G.level - 1) * T.snakeStep);
    G.serpents = [];
    for (let k = 0; k < n; k++) G.serpents.push(serpent(speed, G.level >= T.flyFrom && k % 2 === 1));
  }
  // A serpent comes in from an edge, away from you.
  function serpent(speed, flies) {
    let p;
    for (let k = 0; k < 50; k++) {
      const side = Math.floor(G.rand() * 4);
      p = side === 0 ? { x: 0.5, y: G.rand() * G.h } : side === 1 ? { x: G.w - 0.5, y: G.rand() * G.h } : side === 2 ? { x: G.rand() * G.w, y: 0.5 } : { x: G.rand() * G.w, y: G.h - 0.5 };
      if (dist(p, G.player) > 7) break;
    }
    const ang = Math.atan2(G.h / 2 - p.y, G.w / 2 - p.x);
    return { pts: Array.from({ length: T.snakeLen }, () => ({ x: p.x, y: p.y })), ang, speed, flies, dashT: 2 + G.rand() * 3, dash: 0, wig: G.rand() * 6 };
  }

  // Can you see the pole? The line from you to Moses, against the tents and every serpent's body.
  function lineBlock() {
    const a = G.player, b = G.moses, abx = b.x - a.x, aby = b.y - a.y, len2 = abx * abx + aby * aby || 1;
    let best = null;
    const near = (p, r) => {
      const t = Math.max(0, Math.min(1, ((p.x - a.x) * abx + (p.y - a.y) * aby) / len2));
      const qx = a.x + abx * t, qy = a.y + aby * t;
      if (Math.hypot(p.x - qx, p.y - qy) < r && t > 0.02 && t < 0.97 && (!best || t < best.t)) best = { t, x: qx, y: qy };
    };
    G.tents.forEach(t => near(t, t.r * 0.85));
    G.serpents.forEach(s => s.pts.forEach((p, n) => { if (n % 2 === 0) near(p, 0.42); }));
    return best;
  }

  function update(dt) {
    if (!G || G.state !== 'play') return;
    G.time += dt;
    if (G.between > 0) {
      G.between -= dt;
      if (G.between <= 0) nextLevel();
      return;
    }
    const P = G.player;
    // Moving (not while looking): the keys, or the touch stick
    let mx = 0, my = 0;
    if (keys.has('left')) mx -= 1; if (keys.has('right')) mx += 1; if (keys.has('up')) my -= 1; if (keys.has('down')) my += 1;
    if (stick && (stick.dx || stick.dy)) { mx = stick.dx; my = stick.dy; }
    const m = Math.hypot(mx, my);
    if (m > 1) { mx /= m; my /= m; }
    if (!G.looking && (mx || my)) {
      P.x += mx * T.speed * dt; P.y += my * T.speed * dt;
      P.fx = mx; P.fy = my;
      P.x = Math.max(T.r, Math.min(G.w - T.r, P.x)); P.y = Math.max(T.r, Math.min(G.h - T.r, P.y));
      for (const t of G.tents) { const d = dist(P, t), min = t.r + T.r; if (d < min && d > 0) { P.x = t.x + (P.x - t.x) / d * min; P.y = t.y + (P.y - t.y) / d * min; } }
      const dm = dist(P, G.moses);
      if (dm < 1 && dm > 0) { P.x = G.moses.x + (P.x - G.moses.x) / dm; P.y = G.moses.y + (P.y - G.moses.y) / dm; }
    }
    // Looking: the meter fills and the poison heals, while the way is clear
    G.block = null; G.clear = false;
    if (G.looking) {
      G.lookedEver = true;
      const dx = G.moses.x - P.x, dy = G.moses.y - P.y, d = Math.hypot(dx, dy) || 1;
      P.fx = dx / d; P.fy = dy / d;
      G.block = lineBlock();
      G.clear = !G.block;
      if (G.clear) {
        const need = T.look + (G.level - 1) * T.lookStep;
        G.faith = Math.min(1, G.faith + dt / need);
        if (G.poison > 0) { G.poison = Math.max(0, G.poison - T.heal * dt); if (Math.floor(G.time * 6) !== Math.floor((G.time - dt) * 6)) sound('heal'); }
      }
    } else if (G.poison > 0) G.poison = Math.min(1, G.poison + T.creep * dt);
    // The serpents slither after you, round the tents, and (from level 3) dart now and then
    for (const s of G.serpents) {
      const h = s.pts[0], want = Math.atan2(P.y - h.y, P.x - h.x);
      let da = ((want - s.ang + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
      s.ang += Math.max(-T.turn * dt, Math.min(T.turn * dt, da));
      s.wig += dt * 7;
      if (s.flies) { s.dashT -= dt; if (s.dashT <= 0) { s.dash = 0.6; s.dashT = 2.5 + G.rand() * 3; } if (s.dash > 0) s.dash -= dt; }
      const v = s.speed * (s.dash > 0 ? 2.2 : 1), dir = s.ang + Math.sin(s.wig) * 0.5;
      let nx = h.x + Math.cos(dir) * v * dt, ny = h.y + Math.sin(dir) * v * dt;
      for (const t of G.tents) if (Math.hypot(nx - t.x, ny - t.y) < t.r + 0.2) { s.ang += 1.6 * dt * 4; nx = h.x; ny = h.y; }
      if (nx < 0.2 || nx > G.w - 0.2) { s.ang = Math.PI - s.ang; nx = Math.max(0.2, Math.min(G.w - 0.2, nx)); }
      if (ny < 0.2 || ny > G.h - 0.2) { s.ang = -s.ang; ny = Math.max(0.2, Math.min(G.h - 0.2, ny)); }
      s.pts[0] = { x: nx, y: ny };
      for (let k = 1; k < s.pts.length; k++) {
        const a = s.pts[k - 1], b = s.pts[k], d = Math.hypot(b.x - a.x, b.y - a.y);
        if (d > T.gap) { s.pts[k] = { x: a.x + (b.x - a.x) / d * T.gap, y: a.y + (b.y - a.y) / d * T.gap }; }
      }
      // A bite
      if (G.time >= G.shieldUntil && Math.hypot(nx - P.x, ny - P.y) < T.r + T.head) {
        G.poison = Math.min(1, G.poison + T.bite);
        G.bites++; G.levelBites++;
        G.shieldUntil = G.time + T.shield;
        G.hurt = 0.5;
        s.ang += Math.PI;   // it turns away
        const d = Math.hypot(P.x - nx, P.y - ny) || 1;
        P.x = Math.max(T.r, Math.min(G.w - T.r, P.x + (P.x - nx) / d * 0.8)); P.y = Math.max(T.r, Math.min(G.h - T.r, P.y + (P.y - ny) / d * 0.8));
        float('Bitten!', P.x, P.y - 0.8, '#fca5a5'); sound('bite');
      }
    }
    if (G.hurt > 0) G.hurt -= dt;
    if (G.poison >= 1) return over();
    if (G.faith >= 1) clearLevel();
  }
  function float(text, x, y, color) { G.floats.push({ text, x, y, color, at: G.time }); }
  function clearLevel() {
    const secs = G.time - G.levelStart, bonus = 100 * G.level, clean = G.levelBites ? 0 : 50 * G.level, quick = Math.max(0, Math.round((40 - secs) * 5));
    G.score += bonus + clean + quick;
    G.cleared = G.level;
    G.poison = 0;
    G.looking = false;
    const lines = W().levels || [];
    G.banner = { title: `Level ${G.level} cleared! +${fmt(bonus + clean + quick)}`, small: [`${fmt(bonus)} for the level`, clean ? `${fmt(clean)} with no bites` : '', quick ? `${fmt(quick)} for speed` : ''].filter(Boolean).join(' · '),
      line: G.level + 1 === T.flyFrom ? W().flying : lines[(G.level - 1) % Math.max(1, lines.length)] };
    G.between = T.between;
    sound('clear');
  }
  function over() {
    G.state = 'over';
    G.looking = false;
    const was = saved().best || 0;
    const top = (saved().top || []).concat(G.score > 0 ? [{ name: host.player().name || 'You', score: G.score, level: G.cleared, at: Date.now() }] : []).sort((a, b) => b.score - a.score).slice(0, 10);
    save({ best: Math.max(was, G.score), top, plays: (saved().plays || 0) + 1 });
    G.newBest = G.score > was && G.score > 0;
    if (G.score > 0) Promise.resolve(host.saveBest('look', G.score)).then(() => loadFamily(), () => {});
    sound('over');
    renderOver();
  }

  // ===================== drawing =====================

  let bg = null;
  function board() {
    const c = $('lkCanvas');
    if (!c || !G) return null;
    const r = $('lkStage').getBoundingClientRect();
    const u = Math.max(8, Math.floor(Math.min((r.width - 16) / G.w, (r.height - 16) / G.h)));
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    if (c._u !== u || c._dpr !== dpr || c._w !== G.w) {
      c._u = u; c._dpr = dpr; c._w = G.w;
      c.width = G.w * u * dpr; c.height = G.h * u * dpr;
      c.style.width = G.w * u + 'px'; c.style.height = G.h * u + 'px';
      bg = null;
    }
    return { c, ctx: c.getContext('2d'), u, dpr };
  }
  function desert(u, dpr) {
    const w = G.w * u, h = G.h * u, o = document.createElement('canvas'), r = rng(11);
    o.width = w * dpr; o.height = h * dpr;
    const x = o.getContext('2d');
    x.scale(dpr, dpr);
    const g = x.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.7);
    g.addColorStop(0, '#ecd09a'); g.addColorStop(1, '#cfa262');
    x.fillStyle = g; x.fillRect(0, 0, w, h);
    x.lineWidth = Math.max(1, u * 0.06);
    for (let k = 0; k < 18; k++) {
      const y0 = r() * h, amp = u * (0.3 + r() * 0.6), len = w * (0.3 + r() * 0.5), x0 = r() * (w - len);
      x.strokeStyle = r() < 0.5 ? 'rgba(255,240,205,.45)' : 'rgba(150,100,40,.16)';
      x.beginPath();
      for (let t = 0; t <= 1.0001; t += 0.05) { const px = x0 + t * len, py = y0 + Math.sin(t * Math.PI * 2 + k) * amp; t ? x.lineTo(px, py) : x.moveTo(px, py); }
      x.stroke();
    }
    for (let k = 0; k < G.w * G.h / 4; k++) { x.fillStyle = r() < 0.5 ? 'rgba(110,70,30,.2)' : 'rgba(255,250,235,.3)'; x.beginPath(); x.arc(r() * w, r() * h, u * (0.03 + r() * 0.05), 0, 7); x.fill(); }
    return o;
  }
  function draw(now) {
    const b = board();
    if (!b) return;
    const { ctx, u, dpr } = b, t = now || 0, P = G.player, M = G.moses;
    if (!bg) bg = desert(u, dpr);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(bg, 0, 0);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const X = v => v * u;
    // The golden ring round Moses
    const glow = ctx.createRadialGradient(X(M.x), X(M.y), 0, X(M.x), X(M.y), u * 2.4);
    glow.addColorStop(0, 'rgba(253,224,71,.45)'); glow.addColorStop(1, 'rgba(253,224,71,0)');
    ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(X(M.x), X(M.y), u * 2.4, 0, 7); ctx.fill();
    // Tents: striped goat-hair tents, seen from above
    for (const tn of G.tents) {
      const x = X(tn.x), y = X(tn.y), r = tn.r * u;
      ctx.save(); ctx.translate(x, y); ctx.rotate(tn.turn);
      ctx.fillStyle = 'rgba(60,35,10,.25)'; ctx.beginPath(); ctx.ellipse(r * 0.15, r * 0.2, r * 1.05, r * 0.85, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#4a3423'; ctx.strokeStyle = '#2a1b10'; ctx.lineWidth = Math.max(1, u * 0.06);
      ctx.beginPath(); ctx.moveTo(-r, -r * 0.7); ctx.lineTo(r, -r * 0.7); ctx.lineTo(r * 0.9, r * 0.75); ctx.lineTo(-r * 0.9, r * 0.75); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#7a5a3e'; ctx.lineWidth = u * 0.12;
      for (const k of [-0.45, 0, 0.45]) { ctx.beginPath(); ctx.moveTo(-r * 0.95, k * r); ctx.lineTo(r * 0.95, k * r); ctx.stroke(); }
      ctx.strokeStyle = '#c9a57a'; ctx.lineWidth = u * 0.05; ctx.beginPath(); ctx.moveTo(0, -r * 0.7); ctx.lineTo(0, r * 0.75); ctx.stroke();
      ctx.restore();
    }
    // Your look: a gold line to the pole when it's clear; red up to what's in the way
    if (G.looking) {
      const tx = G.block ? G.block.x : M.x + 0.5, ty = G.block ? G.block.y : M.y - 1.4;
      ctx.strokeStyle = G.block ? 'rgba(239,68,68,.85)' : `rgba(253,224,71,${0.65 + 0.3 * Math.sin(t / 90)})`;
      ctx.lineWidth = u * (G.block ? 0.1 : 0.16); ctx.setLineDash(G.block ? [u * 0.3, u * 0.2] : []);
      ctx.beginPath(); ctx.moveTo(X(P.x), X(P.y)); ctx.lineTo(X(tx), X(ty)); ctx.stroke(); ctx.setLineDash([]);
      if (G.block) { ctx.strokeStyle = '#ef4444'; ctx.lineWidth = u * 0.12; const s = u * 0.25; ctx.beginPath(); ctx.moveTo(X(tx) - s, X(ty) - s); ctx.lineTo(X(tx) + s, X(ty) + s); ctx.moveTo(X(tx) + s, X(ty) - s); ctx.lineTo(X(tx) - s, X(ty) + s); ctx.stroke(); }
    }
    // Moses, and the serpent of brass on its pole
    drawPerson(ctx, X(M.x), X(M.y), u, '#7c2d12', '#e9b384', true, { x: 0, y: 1 });
    const px = X(M.x) + u * 0.5, top = X(M.y) - u * 2.4;
    ctx.strokeStyle = '#5b3a1f'; ctx.lineWidth = u * 0.16; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(px, X(M.y) + u * 0.25); ctx.lineTo(px, top); ctx.moveTo(px - u * 0.5, top + u * 0.3); ctx.lineTo(px + u * 0.5, top + u * 0.3); ctx.stroke();
    // The serpent of brass, wound up the pole, its head over the crossbar
    ctx.save(); ctx.shadowColor = '#fde047'; ctx.shadowBlur = u * (1.1 + 0.4 * Math.sin(t / 200));
    ctx.lineJoin = 'round';
    const coil = () => { ctx.beginPath(); for (let k = 0; k <= 24; k++) { const f = k / 24, y = X(M.y) - u * (0.5 + 1.75 * f), x = px + Math.sin(f * Math.PI * 3.2) * u * 0.42; k ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } };
    ctx.strokeStyle = '#8a5a1c'; ctx.lineWidth = u * 0.3; coil(); ctx.stroke();
    ctx.shadowBlur = 0; ctx.strokeStyle = '#e0a640'; ctx.lineWidth = u * 0.2; coil(); ctx.stroke();
    ctx.strokeStyle = '#fbe3a2'; ctx.lineWidth = u * 0.06; coil(); ctx.stroke();
    const hx = px + Math.sin(3.2 * Math.PI) * u * 0.42, hy = X(M.y) - u * 2.25;
    ctx.fillStyle = '#c98a2e'; ctx.beginPath(); ctx.ellipse(hx + u * 0.12, hy - u * 0.18, u * 0.26, u * 0.19, -0.5, 0, 7); ctx.fill();
    ctx.fillStyle = '#422006'; ctx.beginPath(); ctx.arc(hx + u * 0.2, hy - u * 0.24, u * 0.05, 0, 7); ctx.fill();
    ctx.restore();
    // The fiery serpents
    for (const s of G.serpents) {
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      const path = () => { ctx.beginPath(); s.pts.forEach((p, n) => n ? ctx.lineTo(X(p.x), X(p.y)) : ctx.moveTo(X(p.x), X(p.y))); };
      ctx.strokeStyle = '#7f1d1d'; ctx.lineWidth = u * 0.42; path(); ctx.stroke();
      ctx.strokeStyle = '#dc2626'; ctx.lineWidth = u * 0.32; path(); ctx.stroke();
      ctx.strokeStyle = `rgba(251,146,60,${0.55 + 0.4 * Math.sin(t / 60 + s.wig)})`; ctx.lineWidth = u * 0.13; path(); ctx.stroke();
      const h = s.pts[0], a = Math.atan2(h.y - s.pts[2].y, h.x - s.pts[2].x);
      if (s.flies && s.dash > 0) {   // fiery flying serpents: wings while they dart
        ctx.fillStyle = 'rgba(251,191,36,.85)';
        for (const side of [-1, 1]) { ctx.beginPath(); ctx.moveTo(X(h.x), X(h.y)); ctx.lineTo(X(h.x) + Math.cos(a + side * 2.2) * u * 0.9, X(h.y) + Math.sin(a + side * 2.2) * u * 0.9); ctx.lineTo(X(h.x) + Math.cos(a + side * 2.8) * u * 0.6, X(h.y) + Math.sin(a + side * 2.8) * u * 0.6); ctx.fill(); }
      }
      ctx.fillStyle = '#991b1b'; ctx.beginPath(); ctx.ellipse(X(h.x), X(h.y), u * 0.32, u * 0.26, a, 0, 7); ctx.fill();
      ctx.fillStyle = '#fde047';
      for (const side of [-1, 1]) { ctx.beginPath(); ctx.arc(X(h.x) + Math.cos(a + side * 0.7) * u * 0.17, X(h.y) + Math.sin(a + side * 0.7) * u * 0.17, u * 0.06, 0, 7); ctx.fill(); }
    }
    // You
    const shielded = G.time < G.shieldUntil;
    ctx.globalAlpha = shielded ? 0.5 + 0.5 * Math.abs(Math.sin(t / 70)) : 1;
    drawPerson(ctx, X(P.x), X(P.y), u, '#1d4ed8', '#f1c27d', false, { x: P.fx, y: P.fy });
    ctx.globalAlpha = 1;
    if (G.poison > 0) { ctx.strokeStyle = `rgba(132,204,22,${0.4 + 0.5 * G.poison})`; ctx.lineWidth = u * 0.1; ctx.beginPath(); ctx.arc(X(P.x), X(P.y), u * 0.7, 0, 7); ctx.stroke(); }
    // Words rising
    G.floats = G.floats.filter(f => G.time - f.at < 1.3);
    for (const f of G.floats) {
      const age = (G.time - f.at) / 1.3;
      ctx.globalAlpha = 1 - age; ctx.fillStyle = f.color; ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.lineWidth = 3;
      ctx.font = `900 ${Math.round(u * 0.7)}px system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.strokeText(f.text, X(f.x), X(f.y) - age * u); ctx.fillText(f.text, X(f.x), X(f.y) - age * u); ctx.globalAlpha = 1;
    }
    // A bite flashes red; a level cleared, gold; and 3, 2, 1 to begin
    const w = G.w * u, hh = G.h * u;
    if (G.hurt > 0) { ctx.fillStyle = `rgba(220,38,38,${G.hurt * 0.5})`; ctx.fillRect(0, 0, w, hh); }
    if (G.between > 0 || G.ready > 0) {
      ctx.fillStyle = G.between > 0 ? 'rgba(253,224,71,.18)' : 'rgba(30,18,6,.35)'; ctx.fillRect(0, 0, w, hh);
      ctx.fillStyle = '#fff'; ctx.strokeStyle = 'rgba(0,0,0,.55)'; ctx.lineWidth = 6; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const big = G.between > 0 ? G.banner.title : String(Math.ceil(G.ready));
      ctx.font = `900 ${Math.round(Math.min(w, hh) * (G.between > 0 ? 0.08 : 0.3))}px system-ui, sans-serif`;
      ctx.strokeText(big, w / 2, hh / 2); ctx.fillText(big, w / 2, hh / 2);
      if (G.ready > 0) {
        const tip = coarse() ? 'Drag to move · hold LOOK to look' : 'Arrows or W A S D to move · hold SPACE to look';
        ctx.font = `800 ${Math.round(u * 0.8)}px system-ui, sans-serif`; ctx.strokeText(tip, w / 2, hh / 2 + Math.min(w, hh) * 0.22); ctx.fillText(tip, w / 2, hh / 2 + Math.min(w, hh) * 0.22);
      }
    }
  }
  // A person from above: robe, head, and which way they face.
  function drawPerson(ctx, x, y, u, robe, skin, beard, face) {
    ctx.fillStyle = 'rgba(40,25,8,.3)'; ctx.beginPath(); ctx.ellipse(x + u * 0.08, y + u * 0.14, u * 0.5, u * 0.36, 0, 0, 7); ctx.fill();
    ctx.fillStyle = robe; ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.lineWidth = Math.max(1, u * 0.06);
    ctx.beginPath(); ctx.arc(x, y, u * 0.48, 0, 7); ctx.fill(); ctx.stroke();
    const hx = x + face.x * u * 0.12, hy = y + face.y * u * 0.12;
    ctx.fillStyle = skin; ctx.beginPath(); ctx.arc(hx, hy, u * 0.26, 0, 7); ctx.fill();
    if (beard) { ctx.fillStyle = '#f5f5f4'; ctx.beginPath(); ctx.arc(hx + face.x * u * 0.14, hy + face.y * u * 0.14, u * 0.14, 0, 7); ctx.fill(); }
    ctx.fillStyle = '#1f2937';
    for (const side of [-1, 1]) { ctx.beginPath(); ctx.arc(hx + face.x * u * 0.14 - face.y * side * u * 0.1, hy + face.y * u * 0.14 + face.x * side * u * 0.1, u * 0.045, 0, 7); ctx.fill(); }
  }

  // ===================== the screens =====================

  const coarse = () => !!(window.matchMedia && window.matchMedia('(any-pointer: coarse)').matches) || !!window.TU_LOOK_PADS;
  function shell(body) {
    root.innerHTML = `<div class="lk-top">
        <div class="lk-name"><div class="eyebrow">Arcade · no XP, just for fun</div><div class="board-title">Look and Live</div></div>
        <div id="lkHud" class="lk-hud"></div>
        <div class="lk-btns">${G && G.state === 'play' && root.dataset.view === 'game' ? '<button class="btn ghost" data-lk="pause" aria-label="Pause"><svg class="lk-ico" viewBox="0 0 12 14" aria-hidden="true"><rect x="1" y="1" width="3.5" height="12" rx="1" fill="currentColor"/><rect x="7.5" y="1" width="3.5" height="12" rx="1" fill="currentColor"/></svg></button>' : ''}<button class="btn ghost" data-lk="sound" aria-label="Sound on or off">${saved().muted ? '🔈' : '🔊'}</button><button class="btn ghost" data-lk="exit">Exit</button></div>
      </div>${body}`;
  }
  function scoresHtml() {
    const fam = saved().fam, top = saved().top || [];
    if (fam && fam.length) return `<div class="eyebrow">👪 Family best</div><ol>${fam.slice(0, 8).map(f => `<li${f.me ? ' class="me"' : ''}><span>${esc(f.name)}</span><b>${fmt(f.best)}</b></li>`).join('')}</ol>`;
    if (top.length) return `<div class="eyebrow">Best on this device</div><ol>${top.slice(0, 5).map(f => `<li><span>${esc(f.name)}</span><b>${fmt(f.score)}</b></li>`).join('')}</ol>`;
    return '<p class="lk-note">No scores yet. Be the first!</p>';
  }
  function loadFamily() {
    return Promise.resolve(host.familyBests('look')).then(list => {
      if (!list) return;
      save({ fam: list.sort((a, b) => b.best - a.best) });
      const el = $('lkScores');
      if (el) el.innerHTML = scoresHtml();
    }, () => {});
  }
  function renderMenu() {
    root.dataset.view = 'menu';
    shell(`<div class="lk-menu">
      <p class="lk-hook">${host.html(W().hook || '')}</p>
      <div class="board-actions"><button class="btn" data-lk="start">▶ Start</button></div>
      <ul class="lk-how">
        <li><b>Move</b> with the arrows or W A S D${coarse() ? ', or drag on the camp' : ''}. Keep away from the <b>fiery serpents</b>.</li>
        <li>A bite <b>poisons</b> you, and the poison keeps rising. Fill the green ring and you fall.</li>
        <li><b>Hold SPACE</b>${coarse() ? ' or <b>LOOK</b>' : ''} to stop and look at the serpent of brass on Moses’s pole. Looking heals you, and fills the gold meter that clears the level.</li>
        <li>You can only look when nothing is <b>in the way</b>: a tent, or a serpent crossing your view. And you can’t move while you look.</li>
        <li>Each level brings more serpents, faster. From level ${T.flyFrom}, some fly.</li>
      </ul>
      <div id="lkScores" class="lk-scores">${scoresHtml()}</div></div>`);
    hud();
  }
  function renderGame() {
    root.dataset.view = 'game';
    shell(`<div id="lkPanel" class="lk-panel" aria-live="polite"></div>
      <div id="lkStage" class="lk-stage"><div class="lk-frame"><canvas id="lkCanvas" role="img" aria-label="The camp: you, Moses with the brass serpent, the tents and the fiery serpents"></canvas>
        ${coarse() ? '<button class="lk-look" data-lk="look" aria-label="Hold to look at the brass serpent">LOOK</button>' : ''}<div id="lkPause" class="lk-pausebox" hidden></div></div></div>`);
    bg = null;
    hud(); panel();
  }
  function hud() {
    const el = $('lkHud');
    if (!el) return;
    if (!G || root.dataset.view !== 'game') { const best = saved().best || 0; el.innerHTML = best ? `<span class="score-chip">Best ${fmt(best)}</span>` : ''; return; }
    el.innerHTML = `<span class="score-chip"><b>${fmt(G.score)}</b></span><span class="score-chip">Level ${G.level}</span>
      <span class="score-chip lk-meter" title="Poison"><i class="lk-poison" style="width:${Math.round(G.poison * 100)}%"></i><span>Poison</span></span>
      <span class="score-chip lk-meter" title="Looked"><i class="lk-faith" style="width:${Math.round(G.faith * 100)}%"></i><span>Look</span></span>`;
  }
  function panel() {
    const el = $('lkPanel');
    if (!el || !G) return;
    let head, line = '';
    if (G.between > 0 && G.banner) { head = `<b class="ok">${esc(G.banner.title)}</b> <small>${esc(G.banner.small)}</small>`; line = G.banner.line || ''; }
    else if (G.looking && G.block) head = '<b class="no">Something is in the way.</b> Move until you can see the pole.';
    else if (G.looking) head = `<b class="ok">Looking…</b> ${G.poison > 0 ? 'the poison is going.' : 'keep looking!'}`;
    else if (G.poison > 0) head = '<b class="no">You’re bitten!</b> Look to the brass serpent before the poison gets you.';
    else head = `Hold ${coarse() ? '<b>LOOK</b>' : '<b>SPACE</b>'} to look at the brass serpent, with nothing in the way.`;
    if (!line && G.level === 1 && !G.lookedEver) line = W().hook || '';
    const html = `<p class="lk-status">${head}</p>${line ? `<p class="lk-line">${host.html(line)}</p>` : ''}`;
    if (el._html !== html) { el._html = html; el.innerHTML = html; }
  }
  function renderOver() {
    root.dataset.view = 'over';
    const line = G.lookedEver ? W().over : W().never;
    shell(`<div class="lk-menu">
      <div class="eyebrow">${G.newBest ? '🏆 New best!' : 'The poison won this time'}</div>
      <div class="lk-big">${fmt(G.score)}</div>
      <p class="lk-note">${G.cleared ? `${G.cleared} ${G.cleared === 1 ? 'level' : 'levels'} cleared` : 'No level cleared yet'} · ${G.bites} ${G.bites === 1 ? 'bite' : 'bites'}</p>
      <p class="lk-hook">${host.html(line || '')}</p>
      <div class="board-actions"><button class="btn" data-lk="start">▶ Play again</button><button class="btn ghost" data-lk="menu">Menu</button></div>
      <div id="lkScores" class="lk-scores">${scoresHtml()}</div></div>`);
  }
  function pause(on) {
    if (!G || G.state !== 'play') return;
    G.paused = on;
    G.looking = false;
    const box = $('lkPause');
    if (box) { box.hidden = !on; box.innerHTML = on ? '<div class="lk-pausecard"><b>Paused</b><div class="board-actions"><button class="btn" data-lk="resume">▶ Resume</button><button class="btn ghost" data-lk="quit">End game</button></div></div>' : ''; }
  }

  // ----- input -----
  const KEY = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right', W: 'up', S: 'down', A: 'left', D: 'right' };
  function onKeyDown(e) {
    if (!root || root.hidden) return;
    if (root.dataset.view !== 'game') { if (e.key === 'Enter') { e.preventDefault(); start(); } return; }
    if (KEY[e.key]) { e.preventDefault(); keys.add(KEY[e.key]); }
    else if (e.key === ' ') { e.preventDefault(); if (G && !G.paused) G.looking = true; }
    else if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') { e.preventDefault(); pause(!(G && G.paused)); }
  }
  function onKeyUp(e) {
    if (KEY[e.key]) keys.delete(KEY[e.key]);
    else if (e.key === ' ' && G) G.looking = false;
  }
  function onClick(e) {
    const b = e.target.closest('[data-lk]');
    if (!b) return;
    const act = b.dataset.lk;
    wakeAudio();
    if (act === 'exit') close();
    else if (act === 'sound') { save({ muted: !saved().muted }); b.textContent = saved().muted ? '🔈' : '🔊'; }
    else if (act === 'start') start();
    else if (act === 'menu') { G = null; renderMenu(); loadFamily(); }
    else if (act === 'pause') pause(!G.paused);
    else if (act === 'resume') pause(false);
    else if (act === 'quit') { pause(false); over(); }
  }
  // LOOK is held (pointer down to up); a drag anywhere else on the camp moves you.
  function onDown(e) {
    if (!G || root.dataset.view !== 'game') return;
    if (e.target.closest('[data-lk="look"]')) { e.preventDefault(); if (!G.paused) G.looking = true; lookId = e.pointerId; capture(e); return; }
    if (e.target.id === 'lkCanvas' && !stick) { stick = { id: e.pointerId, x: e.clientX, y: e.clientY, dx: 0, dy: 0 }; capture(e); }
  }
  // Capture can fail (the finger already gone); letting go is matched by pointer id anyway.
  function capture(e) { try { e.target.setPointerCapture(e.pointerId); } catch (err) {} }
  function onMove(e) {
    if (!stick || e.pointerId !== stick.id) return;
    const dx = e.clientX - stick.x, dy = e.clientY - stick.y, d = Math.hypot(dx, dy);
    stick.dx = d < 6 ? 0 : dx / Math.max(d, 40); stick.dy = d < 6 ? 0 : dy / Math.max(d, 40);
  }
  function onUp(e) {
    if (e.pointerId === lookId || (e.target.closest && e.target.closest('[data-lk="look"]'))) { lookId = null; if (G) G.looking = false; }
    if (stick && e.pointerId === stick.id) stick = null;
  }
  function onHide() { if (document.hidden && G && G.state === 'play') pause(true); }

  function start() {
    keys.clear(); stick = null; lookId = null;
    newGame();
    renderGame();
    last = performance.now();
  }
  function frame(now) {
    if (!root || root.hidden) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (G && G.state === 'play' && root.dataset.view === 'game' && !G.paused && !manual()) {
      if (G.ready > 0) G.ready = Math.max(0, G.ready - dt);
      else update(dt);
    }
    if (G && root.dataset.view === 'game') { draw(now); hud(); panel(); }
    raf = requestAnimationFrame(frame);
  }

  function injectCss() {
    if ($('lkCss')) return;
    const css = document.createElement('style');
    css.id = 'lkCss';
    css.textContent = `
      #look .lk-top { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
      #look .lk-hud { display: flex; gap: 6px; flex-wrap: wrap; margin-left: auto; }
      #look .lk-btns { display: flex; gap: 6px; }
      #look .lk-ico { width: 14px; height: 16px; display: block; }
      #look .lk-meter { position: relative; overflow: hidden; min-width: 84px; text-align: center; }
      #look .lk-meter i { position: absolute; left: 0; top: 0; bottom: 0; } #look .lk-meter span { position: relative; }
      #look .lk-poison { background: rgba(132,204,22,.55); } #look .lk-faith { background: rgba(253,224,71,.55); }
      #look .lk-menu { max-width: 640px; width: 100%; margin: 14px auto 0; display: grid; gap: 12px; }
      #look .lk-hook { font-size: 16px; line-height: 1.45; color: rgba(255,255,255,.88); margin: 0; }
      #look .lk-how { margin: 0; padding-left: 20px; list-style: disc; display: grid; gap: 6px; font-size: 15px; line-height: 1.4; color: rgba(255,255,255,.85); }
      #look .lk-scores ol { margin: 6px 0 0; padding: 0; list-style: none; display: grid; gap: 4px; counter-reset: r; }
      #look .lk-scores li { display: flex; justify-content: space-between; gap: 10px; padding: 6px 10px; border-radius: 10px; background: rgba(255,255,255,.06); counter-increment: r; }
      #look .lk-scores li span::before { content: counter(r) ". "; color: rgba(255,255,255,.55); }
      #look .lk-scores li.me { outline: 2px solid var(--gold); }
      #look .lk-note { color: rgba(255,255,255,.7); font-size: 14px; margin: 0; }
      #look .lk-panel { margin-top: 10px; height: 5.4em; overflow-y: auto; padding: 8px 12px; border-radius: 14px; background: rgba(0,0,0,.25); border: 1px solid rgba(255,255,255,.12); font-size: clamp(14px, 1.4vw, 18px); }
      #look .lk-status { margin: 0 0 4px; line-height: 1.3; } #look .lk-status .ok { color: #fde68a; } #look .lk-status .no { color: #fca5a5; } #look .lk-status small { color: rgba(255,255,255,.7); }
      #look .lk-line { margin: 0; color: rgba(255,255,255,.82); line-height: 1.35; }
      #look .lk-stage { flex: 1; min-height: 220px; display: grid; place-items: center; margin-top: 10px; }
      #look .lk-frame { position: relative; border: 6px solid #6b3f1d; border-radius: 10px; box-shadow: 0 0 0 2px #3b220e, 0 10px 30px rgba(0,0,0,.5); line-height: 0; }
      #look canvas { display: block; touch-action: none; border-radius: 4px; }
      #look .lk-look { position: absolute; right: 12px; bottom: 12px; width: 92px; height: 92px; border-radius: 50%; border: 3px solid #fde68a; background: rgba(120,53,15,.78); color: #fde68a; font: 900 18px system-ui, sans-serif; letter-spacing: .05em; touch-action: none; user-select: none; -webkit-user-select: none; line-height: 1; }
      #look .lk-look:active { background: rgba(253,224,71,.5); color: #422006; }
      #look .lk-pausebox { position: absolute; inset: 0; display: grid; place-items: center; background: rgba(15,10,5,.55); line-height: 1.3; }
      #look .lk-pausecard { display: grid; gap: 10px; padding: 16px 20px; border-radius: 16px; background: rgba(20,16,40,.92); text-align: center; } #look .lk-pausecard b { font-size: 24px; }
      #look .lk-big { font-size: clamp(36px, 6vw, 64px); font-weight: 900; line-height: 1.1; }
      @media (max-width: 520px) {
        #look .board-title { font-size: 18px; } #look .lk-name .eyebrow { display: none; }
        #look .lk-top { display: grid; grid-template-columns: 1fr auto; } #look .lk-hud { grid-column: 1 / -1; grid-row: 2; margin-left: 0; }
        #look .lk-btns .btn { padding: 8px 12px; } #look .score-chip { padding: 4px 10px; font-size: 13px; } #look .lk-meter { min-width: 66px; }
        #look .lk-panel { height: 6.6em; }
      }`;
    document.head.appendChild(css);
  }

  function open(h) {
    host = h;
    STORE = (h.ns || 'treasureup.') + 'look.v1';
    root = $('look');
    if (!root) return;
    injectCss();
    root.hidden = false;
    document.body.style.overflow = 'hidden';
    G = null;
    renderMenu();
    loadFamily();
    const kd = e => onKeyDown(e), ku = e => onKeyUp(e), ck = e => onClick(e), dn = e => onDown(e), mv = e => onMove(e), up = e => onUp(e), vis = () => onHide();
    const blur = () => { keys.clear(); stick = null; lookId = null; if (G) G.looking = false; };
    window.addEventListener('keydown', kd); window.addEventListener('keyup', ku); window.addEventListener('blur', blur);
    root.addEventListener('click', ck); root.addEventListener('pointerdown', dn);
    window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
    document.addEventListener('visibilitychange', vis);
    off = () => {
      window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku); window.removeEventListener('blur', blur);
      root.removeEventListener('click', ck); root.removeEventListener('pointerdown', dn);
      window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up);
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
    off = null; G = null; keys.clear(); stick = null;
    if (root) { root.hidden = true; root.innerHTML = ''; }
    document.body.style.overflow = '';
    if (host && host.closed) host.closed();
  }

  window.TULook = {
    open, close,
    // For the tests (with window.TU_LOOK_MANUAL set, nothing moves until step()).
    _t: {
      state: () => G, T,
      step(ms = 50) { for (let t = 0; t < ms && G && G.state === 'play'; t += 50) update(Math.min(50, ms - t) / 1000); if (G && root.dataset.view === 'game') { hud(); panel(); draw(performance.now()); } },
      look(on) { if (G) G.looking = !!on; }, key(name, down) { down ? keys.add(name) : keys.delete(name); },
      draw: () => draw(performance.now()), block: () => lineBlock()
    }
  };
})();
