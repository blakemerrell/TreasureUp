// Title of Liberty: the screen. Draws the world that liberty/sim.js runs,
// turns clicks and taps into orders, and runs the menus: read the chapter,
// then play its mission. Nothing here decides who wins a fight.
(function () {
  'use strict';
  const D = window.LIB_DATA, S = window.LIB_SIM, MISSIONS = window.LIB_MISSIONS.MISSIONS, CAMPAIGNS = window.LIB_MISSIONS.CAMPAIGNS;
  const TEXT = window.LIBERTY_SCRIPTURE || {};
  const { TILE, MAP_W, MAP_H, T, UNITS, BUILDINGS, RESEARCH, QUESTIONS } = D;
  const { tileOf, dist } = S;
  const WORLD_W = MAP_W * TILE, WORLD_H = MAP_H * TILE;
  const STEP = 1 / 20;                                // the simulation's tick, as in the tests
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // ------------------------------------------------------------ icons

  const ICON = {
    grain: '<svg class="i" viewBox="0 0 16 16"><path d="M8 15V5" stroke="#e8c15a" stroke-width="1.6" fill="none"/><g fill="#f5d06b"><ellipse cx="8" cy="3" rx="1.6" ry="2.4"/><ellipse cx="5.6" cy="6" rx="1.4" ry="2.2" transform="rotate(-30 5.6 6)"/><ellipse cx="10.4" cy="6" rx="1.4" ry="2.2" transform="rotate(30 10.4 6)"/><ellipse cx="5.6" cy="9.5" rx="1.4" ry="2.2" transform="rotate(-30 5.6 9.5)"/><ellipse cx="10.4" cy="9.5" rx="1.4" ry="2.2" transform="rotate(30 10.4 9.5)"/></g></svg>',
    timber: '<svg class="i" viewBox="0 0 16 16"><rect x="1" y="5" width="12" height="6" rx="3" fill="#a0673a"/><ellipse cx="13" cy="8" rx="2.4" ry="3" fill="#e0b27e"/><ellipse cx="13" cy="8" rx="1.1" ry="1.4" fill="#a0673a"/></svg>',
    people: '<svg class="i" viewBox="0 0 16 16" fill="#bfdbfe"><circle cx="5" cy="4.5" r="2.3"/><circle cx="11" cy="4.5" r="2.3"/><path d="M1 14c0-3.3 1.8-5 4-5s4 1.7 4 5zM7 14c0-3.3 1.8-5 4-5s4 1.7 4 5z"/></svg>'
  };
  const costHtml = c => !c ? '' : [c.grain ? ICON.grain + c.grain : '', c.timber ? ICON.timber + c.timber : ''].filter(Boolean).join(' ');

  // ------------------------------------------------------------ saves

  const KEY = 'liberty.v1';
  const save = (() => {
    try { return Object.assign({ read: {}, won: {} }, JSON.parse(localStorage.getItem(KEY)) || {}); }
    catch (e) { return { read: {}, won: {} }; }
  })();
  const store = () => { try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) { /* private mode: progress lasts this visit */ } };
  // A mission opens once every chapter it's from has been read (and the one before it won).
  const chaptersOf = m => m.chapters || [m.chapter];
  const allRead = m => chaptersOf(m).every(c => save.read[c]);
  const unlocked = m => allRead(m) && (!m.needs || !!save.won[m.needs]);
  const inCampaign = m => MISSIONS.filter(x => x.campaign === m.campaign);

  // ------------------------------------------------------------ scripture

  const BOOKS = { '3 Nephi': 'bofm/3-ne', 'Alma': 'bofm/alma', 'Helaman': 'bofm/hel' };
  function glUrl(ref) {
    const m = /^(.+?) (\d+)(?::(\d+))?/.exec(ref || '');
    if (!m || !BOOKS[m[1]]) return null;
    return 'https://www.churchofjesuschrist.org/study/scriptures/' + BOOKS[m[1]] + '/' + m[2] + '?lang=eng' + (m[3] ? '&id=p' + m[3] + '#p' + m[3] : '');
  }
  // The verses a reference like "3 Nephi 4:8–10" or "3 Nephi 3:14, 21" points at.
  function versesOf(ref) {
    const m = /^(.+? \d+):(.+)$/.exec(ref || '');
    if (!m || !TEXT[m[1]]) return [];
    const out = [];
    for (const part of m[2].split(',')) {
      const r = part.trim().split(/[–-]/).map(Number);
      for (let v = r[0]; v <= (r[1] || r[0]); v++) if (TEXT[m[1]][v - 1]) out.push([v, TEXT[m[1]][v - 1]]);
    }
    return out;
  }
  const refBtn = ref => ref ? `<button class="ref" data-ref="${esc(ref)}">${esc(ref)}</button>` : '';

  // ------------------------------------------------------------ state

  let W = null, mission = null;
  let sel = [];                                      // selected entity ids
  let placing = null;                                // a building type waiting for a spot
  let wallLine = null;                               // [[x, y], ...] while dragging a wall
  let hover = null;                                  // the mouse's world position
  let infoEnt = null;                                // a robber or village being looked at
  let boxMode = false, box = null;
  let paused = false, speed = 1, modal = false;
  let council = null;                                // { nextAt, queue, right }
  let shownMsgs = 0, endShown = false;
  const cam = { x: 0, y: 0, z: 1 };
  const keys = new Set();
  const pings = [];                                  // where an order was given, for a moment

  // ------------------------------------------------------------ canvas

  const cv = $('view'), ctx = cv.getContext('2d');
  const mini = $('mini'), mctx = mini.getContext('2d');
  let dpr = 1, vw = 0, vh = 0;
  const topH = () => $('hud').offsetHeight || 0;
  const bottomH = () => $('panel').offsetHeight || 0;

  function resize() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    vw = window.innerWidth; vh = window.innerHeight;
    cv.width = Math.round(vw * dpr); cv.height = Math.round(vh * dpr);
    cv.style.width = vw + 'px'; cv.style.height = vh + 'px';
    const mw = mini.clientWidth || 144;
    mini.width = Math.round(mw * dpr); mini.height = Math.round(mw * MAP_H / MAP_W * dpr);
    mini.style.height = Math.round(mw * MAP_H / MAP_W) + 'px';
    miniDirty = true;
    $('rotate').hidden = !(W && vw < 560 && vh > vw);
    clampCam();
  }
  // The camera may show a little past the map's edges, so nothing hides under the bars.
  function clampCam() {
    const w = vw / cam.z, h = vh / cam.z, top = topH() / cam.z, bot = bottomH() / cam.z;
    cam.x = w >= WORLD_W ? (WORLD_W - w) / 2 : clamp(cam.x, 0, WORLD_W - w);
    cam.y = h - top - bot >= WORLD_H ? (WORLD_H - h) / 2 : clamp(cam.y, -top, WORLD_H - h + bot);
  }
  const toWorld = (sx, sy) => ({ x: cam.x + sx / cam.z, y: cam.y + sy / cam.z });
  function lookAt(wx, wy) {
    const usable = vh - topH() - bottomH();
    cam.x = wx - vw / cam.z / 2; cam.y = wy - (topH() + usable / 2) / cam.z;
    clampCam();
  }
  function zoomAt(sx, sy, z) {
    const p = toWorld(sx, sy);
    cam.z = clamp(z, 0.45, 2.2);
    cam.x = p.x - sx / cam.z; cam.y = p.y - sy / cam.z;
    clampCam();
  }

  // ------------------------------------------------------------ terrain

  const terrain = document.createElement('canvas');
  terrain.width = WORLD_W; terrain.height = WORLD_H;
  const tctx = terrain.getContext('2d');
  let painted = null, miniDirty = true;
  function hash(x, y, k) {
    let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(k | 0, 1442695041);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }
  // What a tile looks like, so it's only painted again when that changes.
  function look(i) {
    const t = W.tiles[i], a = W.amt[i];
    if (t === T.FOREST) return t * 4 + (a > 80 ? 2 : a > 35 ? 1 : 0);
    if (t === T.FIELD) return t * 4 + (a > 150 ? 1 : 0);
    return t * 4;
  }
  function paintTerrain() {
    if (!painted) { painted = new Int16Array(MAP_W * MAP_H).fill(-1); }
    for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) {
      const i = y * MAP_W + x, l = look(i);
      if (painted[i] !== l) { painted[i] = l; paintTile(x, y); miniDirty = true; }
    }
    W.terrainDirty = false;
  }
  function paintTile(x, y) {
    const c = tctx, i = y * MAP_W + x, t = W.tiles[i], a = W.amt[i], px = x * TILE, py = y * TILE, h = k => hash(x, y, k);
    c.fillStyle = '#5a8a3b'; c.fillRect(px, py, TILE, TILE);
    for (let k = 0; k < 7; k++) { c.fillStyle = h(k) < 0.5 ? '#4f7d33' : '#699c4a'; c.fillRect(px + h(k + 10) * 30, py + h(k + 20) * 30, 2, 2); }
    if (t === T.WATER || t === T.FORD) {
      c.fillStyle = t === T.WATER ? '#2a679b' : '#5c9ab5'; c.fillRect(px, py, TILE, TILE);
      c.strokeStyle = t === T.WATER ? 'rgba(170,215,245,.35)' : 'rgba(235,245,250,.4)'; c.lineWidth = 1.5;
      for (let k = 0; k < 2; k++) { const wy = py + 9 + k * 13 + h(k) * 4, wx = px + 3 + h(k + 5) * 8; c.beginPath(); c.moveTo(wx, wy); c.quadraticCurveTo(wx + 7, wy - 4, wx + 14, wy); c.stroke(); }
      if (t === T.FORD) { c.fillStyle = '#cfc5a6'; for (let k = 0; k < 5; k++) { c.beginPath(); c.arc(px + 4 + h(k + 30) * 24, py + 4 + h(k + 40) * 24, 2.4, 0, 7); c.fill(); } }
    } else if (t === T.ROCK) {
      c.fillStyle = '#6a6157'; c.fillRect(px, py, TILE, TILE);
      c.fillStyle = '#857a6d'; c.beginPath(); c.moveTo(px, py + TILE); c.lineTo(px + 6 + h(1) * 14, py + 3 + h(2) * 10); c.lineTo(px + TILE, py + TILE); c.fill();
      c.fillStyle = '#9b907f'; c.beginPath(); c.moveTo(px + 6 + h(1) * 14, py + 3 + h(2) * 10); c.lineTo(px + 10 + h(1) * 14, py + 10 + h(2) * 10); c.lineTo(px + 2 + h(1) * 14, py + 12 + h(2) * 10); c.fill();
      c.fillStyle = 'rgba(0,0,0,.18)'; c.fillRect(px, py + TILE - 4, TILE, 4);
    } else if (t === T.FOREST) {
      const n = a > 80 ? 3 : a > 35 ? 2 : 1;
      c.fillStyle = '#3f6e2c'; c.fillRect(px, py, TILE, TILE);
      for (let k = 0; k < n; k++) {
        const tx = px + 7 + h(k + 50) * 18, ty = py + 8 + h(k + 60) * 16, r = 7 + h(k + 70) * 4;
        c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.arc(tx + 2, ty + 3, r, 0, 7); c.fill();
        c.fillStyle = '#285222'; c.beginPath(); c.arc(tx, ty, r, 0, 7); c.fill();
        c.fillStyle = '#3c7a30'; c.beginPath(); c.arc(tx - r * 0.3, ty - r * 0.3, r * 0.55, 0, 7); c.fill();
      }
    } else if (t === T.FIELD) {
      c.fillStyle = a > 150 ? '#caa748' : '#b7a266'; c.fillRect(px + 1, py + 1, TILE - 2, TILE - 2);
      c.strokeStyle = 'rgba(125,92,30,.5)'; c.lineWidth = 1;
      for (let k = 4; k < TILE; k += 6) { c.beginPath(); c.moveTo(px + 2, py + k); c.lineTo(px + TILE - 2, py + k); c.stroke(); }
      if (a > 150) { c.fillStyle = '#e6c663'; for (let k = 0; k < 6; k++) c.fillRect(px + 3 + h(k + 80) * 25, py + 3 + h(k + 90) * 25, 2, 3); }
    } else if (t === T.RUIN) {
      c.fillStyle = '#6e7a55'; c.fillRect(px, py, TILE, TILE);
      c.fillStyle = '#a39d8e'; for (let k = 0; k < 4; k++) c.fillRect(px + 3 + h(k + 100) * 22, py + 3 + h(k + 110) * 22, 5 + h(k) * 4, 4);
      c.fillStyle = '#3b3a33'; c.fillRect(px + 8 + h(7) * 12, py + 10 + h(8) * 10, 7, 2);
    }
  }

  // ------------------------------------------------------------ drawing

  const TEAM = { p: '#1d4ed8', r: '#b91c1c' };
  function draw(now) {
    if (W.terrainDirty || !painted) paintTerrain();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#1b2a14'; ctx.fillRect(0, 0, cv.width, cv.height);
    const z = cam.z * dpr;
    ctx.setTransform(z, 0, 0, z, -cam.x * z, -cam.y * z);
    ctx.drawImage(terrain, 0, 0);
    const vx0 = cam.x - 64, vy0 = cam.y - 64, vx1 = cam.x + vw / cam.z + 64, vy1 = cam.y + vh / cam.z + 64;
    const inView = e => e.x > vx0 && e.x < vx1 && e.y > vy0 && e.y < vy1;
    const selSet = new Set(sel);

    drawZones();
    if (W.border != null && !W.borderOpen) drawBorder();
    const bs = [], us = [];
    for (const e of W.ents.values()) if (inView(e)) (e.kind === 'building' ? bs : us).push(e);
    bs.sort((a, b) => a.y - b.y); us.sort((a, b) => a.y - b.y);
    for (const b of bs) drawBuilding(b, selSet.has(b.id), now);
    for (const u of us) if (selSet.has(u.id)) drawRing(u);
    for (const u of us) drawUnit(u, now);
    for (const u of us) if (selSet.has(u.id) || (u.hitAt && W.t - u.hitAt < 3)) hpBar(u.x, u.y - radius(u) - 7, 20, u.hp / u.def.hp);
    drawEffects();
    drawMarkers(now);
    drawGhost();
    for (let i = pings.length - 1; i >= 0; i--) {
      const p = pings[i], age = (now - p.t) / 500;
      if (age > 1) { pings.splice(i, 1); continue; }
      ctx.strokeStyle = p.color; ctx.globalAlpha = 1 - age; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(p.x, p.y, 6 + age * 14, 0, 7); ctx.stroke(); ctx.globalAlpha = 1;
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (W.night) { ctx.fillStyle = 'rgba(8,12,40,.5)'; ctx.fillRect(0, 0, cv.width, cv.height); }
    if (box) {
      ctx.strokeStyle = '#86efac'; ctx.lineWidth = 1.5 * dpr; ctx.fillStyle = 'rgba(134,239,172,.12)';
      const x = Math.min(box.x0, box.x1) * dpr, y = Math.min(box.y0, box.y1) * dpr, w = Math.abs(box.x1 - box.x0) * dpr, h = Math.abs(box.y1 - box.y0) * dpr;
      ctx.fillRect(x, y, w, h); ctx.strokeRect(x, y, w, h);
    }
    drawMini();
  }

  function drawBorder() {
    const y = W.border * TILE;
    ctx.save();
    ctx.strokeStyle = 'rgba(248,113,113,.85)'; ctx.lineWidth = 3; ctx.setLineDash([14, 10]);
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(WORLD_W, y); ctx.stroke();
    ctx.setLineDash([]);
    ctx.font = '700 12px Outfit, system-ui, sans-serif'; ctx.textAlign = 'center';
    for (let x = 8; x < MAP_W; x += 16) {
      ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(x * TILE - 118, y - 24, 236, 18);
      ctx.fillStyle = '#fecaca'; ctx.fillText('Wilderness: wait for them to come (3 Nephi 3:21)', x * TILE, y - 11);
    }
    ctx.restore();
  }
  // Gold rings where the story wants someone to go.
  function drawMarkers(now) {
    const list = mission.markers ? mission.markers(W) : [];
    if (!list.length) return;
    const pulse = 0.6 + 0.4 * Math.sin(now / 250);
    ctx.font = '800 13px Outfit, system-ui, sans-serif'; ctx.textAlign = 'center';
    for (const m of list) {
      const x = (m.x + 0.5) * TILE, y = (m.y + 0.5) * TILE, w = ctx.measureText(m.label).width + 16;
      ctx.strokeStyle = `rgba(253,230,138,${pulse})`; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(x, y, 40, 0, 7); ctx.stroke();
      ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(x - w / 2, y - 62, w, 18);
      ctx.fillStyle = '#fde68a'; ctx.fillText(m.label, x, y - 49);
    }
  }
  // Places to hide an army, the way the enemy will come, and lands closed to you.
  function drawZones() {
    ctx.save();
    ctx.font = '800 13px Outfit, system-ui, sans-serif'; ctx.textAlign = 'left';
    for (const c of W.cover) {
      const x = c.x0 * TILE, y = c.y0 * TILE, w = (c.x1 - c.x0 + 1) * TILE, h = (c.y1 - c.y0 + 1) * TILE;
      ctx.fillStyle = 'rgba(74,222,128,.10)'; ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = 'rgba(134,239,172,.8)'; ctx.lineWidth = 2; ctx.setLineDash([10, 8]); ctx.strokeRect(x, y, w, h); ctx.setLineDash([]);
      const t = c.name + ' · hide here', tw = ctx.measureText(t).width + 12;
      ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(x + 4, y + 4, tw, 18);
      ctx.fillStyle = '#bbf7d0'; ctx.fillText(t, x + 10, y + 17);
    }
    if (W.route) {
      ctx.strokeStyle = 'rgba(248,113,113,.75)'; ctx.lineWidth = 4; ctx.setLineDash([4, 10]); ctx.lineCap = 'round';
      ctx.beginPath(); W.route.forEach(([x, y], i) => (i ? ctx.lineTo : ctx.moveTo).call(ctx, (x + 0.5) * TILE, (y + 0.5) * TILE)); ctx.stroke();
      ctx.setLineDash([]);
      const [ax, ay] = W.route[W.route.length - 1], [bx, by] = W.route[W.route.length - 2], a = Math.atan2(ay - by, ax - bx);
      ctx.fillStyle = 'rgba(248,113,113,.9)'; ctx.beginPath();
      ctx.moveTo((ax + 0.5) * TILE + Math.cos(a) * 14, (ay + 0.5) * TILE + Math.sin(a) * 14);
      ctx.lineTo((ax + 0.5) * TILE + Math.cos(a + 2.5) * 14, (ay + 0.5) * TILE + Math.sin(a + 2.5) * 14);
      ctx.lineTo((ax + 0.5) * TILE + Math.cos(a - 2.5) * 14, (ay + 0.5) * TILE + Math.sin(a - 2.5) * 14); ctx.fill();
      const [lx, ly] = W.route[1], t = 'The way they will come (Alma 43:24)', tw = ctx.measureText(t).width + 12;
      ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(lx * TILE - tw / 2, ly * TILE - 30, tw, 18);
      ctx.fillStyle = '#fecaca'; ctx.textAlign = 'center'; ctx.fillText(t, lx * TILE, ly * TILE - 17); ctx.textAlign = 'left';
    }
    for (const z of W.noGo) {
      const x = z.x0 * TILE, y = z.y0 * TILE, w = (z.x1 - z.x0 + 1) * TILE, h = (z.y1 - z.y0 + 1) * TILE;
      ctx.fillStyle = 'rgba(127,29,29,.12)'; ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = 'rgba(248,113,113,.75)'; ctx.lineWidth = 3; ctx.setLineDash([14, 10]); ctx.strokeRect(x, y, w, h); ctx.setLineDash([]);
      const t = 'Antionum: the Zoramites\' land (Alma 43:5)', tw = ctx.measureText(t).width + 12;
      ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(x + 6, y + 6, tw, 18);
      ctx.fillStyle = '#fecaca'; ctx.fillText(t, x + 12, y + 19);
    }
    ctx.restore();
  }

  function hpBar(x, y, w, f) {
    if (f >= 1) return;
    ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(x - w / 2 - 1, y - 1, w + 2, 5);
    ctx.fillStyle = f > 0.5 ? '#22c55e' : f > 0.25 ? '#eab308' : '#ef4444'; ctx.fillRect(x - w / 2, y, w * clamp(f, 0, 1), 3);
  }
  const radius = u => u.def.leader ? 11 : u.def.hero ? 10 : u.type === 'flock' ? 10 : u.def.gathers || u.type === 'villager' ? 7 : 8;
  function drawRing(u) {
    ctx.strokeStyle = '#86efac'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(u.x, u.y + 4, radius(u) + 4, (radius(u) + 4) * 0.55, 0, 0, 7); ctx.stroke();
  }
  function drawUnit(u, now) {
    const d = u.def, x = u.x, r = radius(u);
    const kneel = u.kneelUntil && W.t < u.kneelUntil;
    const y = u.y - (kneel ? -2 : 1);
    ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.beginPath(); ctx.ellipse(x + 2, u.y + r * 0.7, r, r * 0.45, 0, 0, 7); ctx.fill();
    if (u.type === 'flock') {
      ctx.fillStyle = '#f1f5f9';
      for (const [dx, dy] of [[-4, 1], [4, 1], [0, -3]]) { ctx.beginPath(); ctx.arc(x + dx, y + dy, 5, 0, 7); ctx.fill(); }
      ctx.fillStyle = '#475569'; ctx.beginPath(); ctx.arc(x + 7, y - 4, 2.6, 0, 7); ctx.fill();
      return;
    }
    let body, rim;
    const hid = W.hidden(u);
    if (hid) ctx.globalAlpha = 0.5;
    if (u.team === 'x') { body = '#8b929c'; rim = '#e5e7eb'; }
    else if (d.prophet) { body = '#f5f5f4'; rim = '#fcd34d'; }
    else if (d.foe) { body = d.color || (d.leader ? '#7f1d1d' : '#b91c1c'); rim = '#fecaca'; }
    else if (u.type === 'worker') { body = '#a8814f'; rim = '#fef3c7'; }
    else if (u.type === 'villager') { body = '#d8bd8e'; rim = '#fffbeb'; }
    else if (d.hero) { body = '#d97706'; rim = '#fde68a'; }
    else { body = TEAM.p; rim = '#dbeafe'; }
    if (W.t < W.buffUntil && u.team === 'p' && d.soldier) {
      ctx.fillStyle = 'rgba(253,230,138,.28)'; ctx.beginPath(); ctx.arc(x, y, r + 6, 0, 7); ctx.fill();
    }
    // The weapon, pointing where they face.
    if (d.dmg && !kneel && u.team !== 'x') {
      const f = u.face || 0, cx = Math.cos(f), cy = Math.sin(f);
      ctx.strokeStyle = d.foe ? '#27272a' : u.type === 'worker' ? '#78583a' : '#e5e7eb'; ctx.lineWidth = 2;
      if (d.ranged) { ctx.beginPath(); ctx.arc(x + cx * r * 0.7, y + cy * r * 0.7, r * 0.9, f - 1.1, f + 1.1); ctx.stroke(); }
      else { ctx.beginPath(); ctx.moveTo(x + cx * (r - 3), y + cy * (r - 3)); ctx.lineTo(x + cx * (r + (u.type === 'worker' ? 4 : 10)), y + cy * (r + (u.type === 'worker' ? 4 : 10))); ctx.stroke(); }
    }
    ctx.fillStyle = body; ctx.strokeStyle = rim; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, kneel ? r * 0.8 : r, 0, 7); ctx.fill(); ctx.stroke();
    if (d.foe) {
      // Robbers: “a lamb-skin about their loins … dyed in blood” and “head-plates” (3 Nephi 4:7).
      // Lamanites: “a skin which was girded about their loins” (Alma 43:20).
      ctx.strokeStyle = d.band || '#f5f5f4'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(x, y, r * 0.55, 0.35, Math.PI - 0.35); ctx.stroke();
      if (d.leader) { ctx.fillStyle = '#a1a1aa'; ctx.fillRect(x - 6, y - r - 2, 12, 5); }
    }
    if (d.hero) star(x, y, 5, '#fff7d6');
    if (u.type === 'spearman') { ctx.fillStyle = '#bfdbfe'; ctx.fillRect(x - 3, y - 3, 6, 6); }
    if (u.carry && u.carry.amt) { ctx.fillStyle = u.carry.type === 'timber' ? '#8b5a2b' : '#eab308'; ctx.fillRect(x + r - 3, y - r - 1, 6, 6); }
    if (u.team === 'x') { ctx.strokeStyle = '#3f3f46'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x - 5, y + 2); ctx.lineTo(x + 5, y + 2); ctx.stroke(); }
    if (kneel) { ctx.strokeStyle = 'rgba(253,230,138,.95)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x, y - r - 3, 6, 2.5, 0, 0, 7); ctx.stroke(); }
    if (d.leader || d.hero || d.prophet) {
      ctx.font = '700 10px Outfit, system-ui, sans-serif'; ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(0,0,0,.55)'; const w = ctx.measureText(d.name).width + 8; ctx.fillRect(x - w / 2, y + r + 3, w, 13);
      ctx.fillStyle = d.foe ? '#fecaca' : '#fde68a'; ctx.fillText(d.name, x, y + r + 13);
    }
    if (hid) { ctx.globalAlpha = 1; ctx.fillStyle = '#86efac'; ctx.beginPath(); ctx.ellipse(x + r, y - r, 3.5, 2, -0.6, 0, 7); ctx.fill(); }
  }
  function star(x, y, r, color) {
    ctx.fillStyle = color; ctx.beginPath();
    for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? r * 0.45 : r; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
    ctx.fill();
  }
  const wallAt = (x, y) => { const id = W.inBounds(x, y) && W.occ[y * MAP_W + x]; const e = id && W.ents.get(id); return !!(e && e.def.wall); };

  function drawBuilding(b, selected, now) {
    const x = b.tx * TILE, y = b.ty * TILE, w = b.w * TILE, h = b.h * TILE, c = ctx;
    c.save();
    if (!b.built) c.globalAlpha = 0.55;
    const box = (x0, y0, w0, h0, fill, stroke) => { c.fillStyle = fill; c.fillRect(x0, y0, w0, h0); if (stroke) { c.strokeStyle = stroke; c.lineWidth = 2; c.strokeRect(x0, y0, w0, h0); } };
    switch (b.type) {
      case 'stronghold': {
        box(x + 5, y + 5, w - 10, h - 10, '#b7a27b', '#5f4f36');
        for (const [cx, cy] of [[x + 3, y + 3], [x + w - 27, y + 3], [x + 3, y + h - 27], [x + w - 27, y + h - 27]]) box(cx, cy, 24, 24, '#d3c29c', '#5f4f36');
        box(x + 36, y + 34, 56, 56, '#e6d8b6', '#5f4f36');
        c.fillStyle = '#8e4b2e'; c.beginPath(); c.moveTo(x + 32, y + 50); c.lineTo(x + 64, y + 26); c.lineTo(x + 96, y + 50); c.fill();
        c.fillStyle = '#6b3a24'; c.fillRect(x + 57, y + 70, 14, 20);
        c.strokeStyle = '#3f2f1f'; c.lineWidth = 2; c.beginPath(); c.moveTo(x + 64, y + 26); c.lineTo(x + 64, y + 6); c.stroke();
        c.fillStyle = '#2563eb'; c.beginPath(); c.moveTo(x + 64, y + 6); c.lineTo(x + 82, y + 11); c.lineTo(x + 64, y + 16); c.fill();
        label(b.name || b.def.name, x + w / 2, y + h + 12, '#fde68a');
        break;
      }
      case 'storehouse':
        box(x + 5, y + 8, w - 10, h - 13, '#9a6a3d', '#4d331c');
        c.fillStyle = '#6d4526'; c.fillRect(x + 3, y + 5, w - 6, 12);
        c.fillStyle = '#e9d7a5'; for (let k = 0; k < 3; k++) { c.beginPath(); c.arc(x + 18 + k * 14, y + h - 14, 5, 0, 7); c.fill(); }
        break;
      case 'barracks':
        box(x + 6, y + 10, w - 12, h - 16, '#c7ae86', '#5f4f36');
        c.fillStyle = '#7a3b2e'; c.fillRect(x + 3, y + 6, w - 6, 26);
        c.fillStyle = '#5b2a20'; c.fillRect(x + w / 2 - 8, y + h - 26, 16, 20);
        c.strokeStyle = '#e5e7eb'; c.lineWidth = 2.5;
        c.beginPath(); c.moveTo(x + 22, y + 44); c.lineTo(x + 44, y + 66); c.moveTo(x + 44, y + 44); c.lineTo(x + 22, y + 66); c.stroke();
        break;
      case 'tower':
        box(x + 8, y + 8, w - 16, h - 16, '#ad9c7c', '#4f412c');
        box(x + 16, y + 16, w - 32, h - 32, '#cdbd9b', null);
        c.fillStyle = '#4f412c'; for (let k = 0; k < 4; k++) { c.fillRect(x + 8 + k * 14, y + 4, 7, 6); }
        if (b.built) { c.fillStyle = TEAM.p; c.beginPath(); c.arc(x + w / 2, y + h / 2, 5, 0, 7); c.fill(); }
        break;
      case 'wall': case 'gate': {
        const cx = x + TILE / 2, cy = y + TILE / 2;
        c.fillStyle = '#6f5134';
        c.fillRect(x + 8, y + 8, TILE - 16, TILE - 16);
        if (wallAt(b.tx - 1, b.ty)) c.fillRect(x, y + 8, TILE / 2, TILE - 16);
        if (wallAt(b.tx + 1, b.ty)) c.fillRect(cx, y + 8, TILE / 2, TILE - 16);
        if (wallAt(b.tx, b.ty - 1)) c.fillRect(x + 8, y, TILE - 16, TILE / 2);
        if (wallAt(b.tx, b.ty + 1)) c.fillRect(x + 8, cy, TILE - 16, TILE / 2);
        c.fillStyle = '#a27a4d';
        for (let k = 0; k < 3; k++) c.fillRect(x + 9 + k * 5.5, y + 11, 3, 10);
        if (b.type === 'gate') { c.fillStyle = '#c28a4a'; c.fillRect(x + 6, y + 6, TILE - 12, TILE - 12); c.strokeStyle = '#3f2a14'; c.lineWidth = 2; c.strokeRect(x + 6, y + 6, TILE - 12, TILE - 12); c.beginPath(); c.moveTo(cx, y + 6); c.lineTo(cx, y + TILE - 6); c.stroke(); }
        break;
      }
      case 'village': {
        for (const [dx, dy] of [[24, 30], [66, 26], [46, 64]]) {
          c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.arc(x + dx + 2, y + dy + 3, 14, 0, 7); c.fill();
          c.fillStyle = '#caa679'; c.beginPath(); c.arc(x + dx, y + dy, 14, 0, 7); c.fill();
          c.fillStyle = '#8a5a32'; c.beginPath(); c.arc(x + dx, y + dy, 8, 0, 7); c.fill();
        }
        label(b.name, x + w / 2, y + h + 12, '#fff');
        if (b.state === 'waiting') {
          const bob = Math.sin(now / 300) * 3;
          c.fillStyle = '#fcd34d'; c.beginPath(); c.arc(x + w / 2, y - 12 + bob, 11, 0, 7); c.fill();
          c.fillStyle = '#1a1405'; c.font = '900 15px Outfit, system-ui, sans-serif'; c.textAlign = 'center'; c.fillText('!', x + w / 2, y - 7 + bob);
        }
        break;
      }
      case 'camp':
        for (const [dx, dy] of [[22, 30], [70, 28], [46, 70]]) {
          c.fillStyle = '#7f1d1d'; c.beginPath(); c.moveTo(x + dx - 16, y + dy + 12); c.lineTo(x + dx, y + dy - 14); c.lineTo(x + dx + 16, y + dy + 12); c.fill();
          c.strokeStyle = '#fecaca'; c.lineWidth = 1.5; c.stroke();
        }
        c.fillStyle = '#f97316'; c.beginPath(); c.arc(x + 48, y + 46, 5 + Math.sin(now / 120) * 1.5, 0, 7); c.fill();
        c.fillStyle = '#fde047'; c.beginPath(); c.arc(x + 48, y + 47, 2.5, 0, 7); c.fill();
        break;
    }
    c.restore();
    if (selected) { ctx.strokeStyle = '#86efac'; ctx.lineWidth = 2; ctx.strokeRect(x + 1, y + 1, w - 2, h - 2); }
    if (!b.built) {
      ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(x + 4, y + h / 2 - 3, w - 8, 6);
      ctx.fillStyle = '#fcd34d'; ctx.fillRect(x + 5, y + h / 2 - 2, (w - 10) * b.built, 4);
    } else if (b.def.hp < 99999 && (selected || b.hp < b.def.hp)) hpBar(x + w / 2, y - 6, Math.min(w - 6, 60), b.hp / b.def.hp);
  }
  function label(text, x, y, color) {
    ctx.font = '700 11px Outfit, system-ui, sans-serif'; ctx.textAlign = 'center';
    const w = ctx.measureText(text).width + 10;
    ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(x - w / 2, y - 10, w, 14);
    ctx.fillStyle = color; ctx.fillText(text, x, y + 1);
  }
  function drawEffects() {
    for (const f of W.effects) {
      const p = clamp((W.t - f.t) / 0.35, 0, 1);
      if (f.kind === 'arrow') {
        const x = f.x0 + (f.x1 - f.x0) * p, y = f.y0 + (f.y1 - f.y0) * p, a = Math.atan2(f.y1 - f.y0, f.x1 - f.x0);
        ctx.strokeStyle = f.team === 'r' ? '#fca5a5' : '#fef9c3'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(x - Math.cos(a) * 7, y - Math.sin(a) * 7); ctx.lineTo(x, y); ctx.stroke();
      } else {
        ctx.fillStyle = `rgba(255,255,255,${0.7 * (1 - p)})`; ctx.beginPath(); ctx.arc(f.x1, f.y1, 4 + p * 5, 0, 7); ctx.fill();
      }
    }
  }
  // Where a building would go: green if it fits, red if not.
  function drawGhost() {
    if (!placing) return;
    const def = BUILDINGS[placing];
    let spots = [];
    if (wallLine) spots = wallLine.map(([x, y]) => [x, y]);
    else if (hover) spots = [topLeft(placing, hover.x, hover.y)];
    let money = W.res.timber;
    for (const [x, y] of spots) {
      money -= def.cost.timber || 0;
      const ok = W.canPlace(placing, x, y) && money >= 0 && W.res.grain >= (def.cost.grain || 0);
      ctx.fillStyle = ok ? 'rgba(74,222,128,.35)' : 'rgba(248,113,113,.4)';
      ctx.fillRect(x * TILE, y * TILE, def.w * TILE, def.h * TILE);
      ctx.strokeStyle = ok ? '#4ade80' : '#f87171'; ctx.lineWidth = 1.5; ctx.strokeRect(x * TILE, y * TILE, def.w * TILE, def.h * TILE);
    }
    if (def.range && spots.length) {
      const [x, y] = spots[0];
      ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.setLineDash([6, 6]);
      ctx.beginPath(); ctx.arc((x + def.w / 2) * TILE, (y + def.h / 2) * TILE, def.range, 0, 7); ctx.stroke(); ctx.setLineDash([]);
    }
  }
  const topLeft = (type, wx, wy) => { const d = BUILDINGS[type]; return [tileOf(wx) - Math.floor((d.w - 1) / 2), tileOf(wy) - Math.floor((d.h - 1) / 2)]; };

  // ------------------------------------------------------------ minimap

  const miniTerrain = document.createElement('canvas');
  let miniAt = 0;
  function drawMini() {
    const mw = mini.width, mh = mini.height;
    if (!mw) return;
    if (miniDirty && performance.now() - miniAt > 800) {
      miniTerrain.width = mw; miniTerrain.height = mh;
      miniTerrain.getContext('2d').drawImage(terrain, 0, 0, mw, mh);
      miniDirty = false; miniAt = performance.now();
    }
    mctx.drawImage(miniTerrain, 0, 0);
    const sx = mw / WORLD_W, sy = mh / WORLD_H;
    if (W.border != null && !W.borderOpen) { mctx.fillStyle = 'rgba(248,113,113,.8)'; mctx.fillRect(0, W.border * TILE * sy - 1, mw, 2); }
    for (const e of W.ents.values()) {
      if (e.kind === 'building') {
        mctx.fillStyle = e.team === 'p' ? '#93c5fd' : e.team === 'r' ? '#f87171' : e.state === 'waiting' ? '#fcd34d' : '#d6d3d1';
        mctx.fillRect(e.tx * TILE * sx, e.ty * TILE * sy, Math.max(2, e.w * TILE * sx), Math.max(2, e.h * TILE * sy));
      }
    }
    for (const e of W.ents.values()) {
      if (e.kind !== 'unit') continue;
      mctx.fillStyle = e.team === 'r' ? '#ef4444' : e.team === 'x' ? '#d4d4d8' : e.def.hero ? '#fcd34d' : '#fff';
      const s = Math.max(2, 2 * dpr);
      mctx.fillRect(e.x * sx - s / 2, e.y * sy - s / 2, s, s);
    }
    mctx.strokeStyle = '#fde68a'; mctx.lineWidth = Math.max(1, dpr);
    mctx.strokeRect(cam.x * sx, cam.y * sy, vw / cam.z * sx, vh / cam.z * sy);
  }

  // ------------------------------------------------------------ selecting and ordering

  const selectable = e => e && !e.dead && e.team === 'p' && e.type !== 'villager' && e.type !== 'flock';
  const selEnts = () => sel.map(id => W.ents.get(id)).filter(e => e && !e.dead);
  const selUnits = () => selEnts().filter(e => e.kind === 'unit' && selectable(e));
  function setSel(list) { sel = list.filter(selectable).map(e => e.id); infoEnt = null; placing = null; wallLine = null; refreshPanel(true); }

  function entityAt(wx, wy) {
    let best = null, bd = 16;
    for (const e of W.ents.values()) {
      if (e.kind !== 'unit') continue;
      const d = Math.hypot(e.x - wx, e.y - wy) - (e.team === 'p' ? 2 : 0);
      if (d < bd) { bd = d; best = e; }
    }
    if (best) return best;
    const tx = tileOf(wx), ty = tileOf(wy);
    const id = W.inBounds(tx, ty) && W.occ[ty * MAP_W + tx];
    return (id && W.ents.get(id)) || null;
  }

  function clickAt(wx, wy, add, double) {
    if (placing) return placeAt(wx, wy, add);
    const e = entityAt(wx, wy);
    const units = selUnits();
    // With people chosen, a click on anything but one of your own units is an order.
    if (units.length && !(e && e.kind === 'unit' && selectable(e)) && !(e && e.kind === 'building' && e.team === 'p' && !canWorkOn(units, e))) return command(wx, wy);
    if (selectable(e)) {
      if (double && e.kind === 'unit') {
        const same = W.units('p').filter(u => u.type === e.type && u.x > cam.x && u.x < cam.x + vw / cam.z && u.y > cam.y && u.y < cam.y + vh / cam.z);
        return setSel(same);
      }
      if (add && e.kind === 'unit') return setSel(sel.includes(e.id) ? selEnts().filter(x => x !== e) : selEnts().filter(x => x.kind === 'unit').concat(e));
      return setSel([e]);
    }
    const b = selEnts()[0];
    if (b && b.kind === 'building' && b.def.trains && !e) { b.rally = [tileOf(wx), tileOf(wy)]; ping(wx, wy, '#fde68a'); toast('Rally point set: new ' + (b.type === 'barracks' ? 'guards' : 'workers') + ' will go there.'); return; }
    if (e) showInfo(e);
    else setSel([]);
  }
  const canWorkOn = (units, b) => units.some(u => u.def.builds) && W.needsWork(b);

  function command(wx, wy) {
    const units = selUnits();
    if (!units.length) return;
    const e = entityAt(wx, wy), tx = tileOf(wx), ty = tileOf(wy);
    if (e && e.team === 'r' && !e.untouchable) {
      for (const u of units) if (u.def.dmg) W.order(u, { type: 'attack', target: e.id });
      return ping(e.x, e.y, '#f87171');
    }
    const workers = units.filter(u => u.def.builds), rest = units.filter(u => !u.def.builds);
    if (e && e.kind === 'building' && workers.length && W.needsWork(e)) {
      for (const u of workers) W.order(u, { type: 'build', target: e.id });
      if (rest.length) moveGroup(rest, tx, ty);
      return ping(e.x, e.y, '#fde68a');
    }
    const kind = W.isResource(tx, ty, 'timber') ? 'timber' : W.isResource(tx, ty, 'grain') ? 'grain' : null;
    if (kind && workers.length) {
      workers.forEach((u, i) => { const f = i ? W.nearestResource(tx, ty, kind, u) || [tx, ty] : [tx, ty]; W.gatherAt(u, f[0], f[1]); });
      if (rest.length) moveGroup(rest, tx, ty);
      return ping(wx, wy, kind === 'timber' ? '#a3e635' : '#fde047');
    }
    moveGroup(units, tx, ty);
    ping(wx, wy, '#86efac');
  }
  // Everyone to their own tile around the spot, nearest first.
  function moveGroup(units, tx, ty) {
    if (W.border != null && !W.borderOpen && ty < W.border) { W.moveTo(units[0], tx, ty); ty = W.border; }
    const spots = [];
    for (let r = 0; spots.length < units.length && r < 9; r++) {
      for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        if (W.passable(tx + dx, ty + dy, 'p')) spots.push([tx + dx, ty + dy]);
      }
    }
    const cx = (tx + 0.5) * TILE, cy = (ty + 0.5) * TILE;
    units.slice().sort((a, b) => Math.hypot(a.x - cx, a.y - cy) - Math.hypot(b.x - cx, b.y - cy))
      .forEach((u, i) => { const s = spots[i] || [tx, ty]; W.moveTo(u, s[0], s[1]); });
  }
  function ping(x, y, color) { pings.push({ x, y, color, t: performance.now() }); }

  // --- building
  function startPlacing(type) {
    const def = BUILDINGS[type];
    if (!W.canAfford(def.cost)) return toast(poorText(def.cost), 'warn');
    placing = type; wallLine = null;
    toast(type === 'wall' ? 'Drag a line where the wall goes. Tap Done when you finish.' : `Tap where the ${def.name.toLowerCase()} goes.`, 'me');
    refreshPanel(true);
  }
  function placeAt(wx, wy, keep) {
    const [x, y] = topLeft(placing, wx, wy);
    const b = W.place(placing, x, y, []);
    if (!b) return toast(W.canPlace(placing, x, y) ? poorText(BUILDINGS[placing].cost) : 'It can\'t go there. Build on open ground, south of the wilderness.', 'warn');
    assignBuilders([b]);
    if (placing !== 'wall' && !keep) { placing = null; refreshPanel(true); }
  }
  function placeLine(tiles) {
    const made = [];
    for (const [x, y] of tiles) {
      if (!W.canPlace('wall', x, y)) continue;
      if (!W.canAfford(BUILDINGS.wall.cost)) { toast(poorText(BUILDINGS.wall.cost), 'warn'); break; }
      made.push(W.place('wall', x, y, []));
    }
    assignBuilders(made);
  }
  // The chosen workers split the new work between them, nearest first.
  function assignBuilders(list) {
    const ws = selUnits().filter(u => u.def.builds);
    if (!ws.length || !list.length) return;
    ws.forEach((u, i) => {
      const b = list.length === 1 ? list[0] : list.slice().sort((a, c) => dist(a, u) - dist(c, u))[Math.min(i, list.length - 1) % list.length];
      W.order(u, { type: 'build', target: b.id });
    });
  }
  function lineTiles(a, b) {
    const out = [];
    let [x0, y0] = a; const [x1, y1] = b;
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (let n = 0; n < 200; n++) {
      out.push([x0, y0]);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
    return out;
  }
  function poorText(c) {
    const need = [];
    if ((c.grain || 0) > W.res.grain) need.push('grain');
    if ((c.timber || 0) > W.res.timber) need.push('timber');
    return 'Not enough ' + need.join(' or ') + ' yet. Workers gather it; the council gives some too.';
  }

  // ------------------------------------------------------------ pointer and keys

  const ptrs = new Map();
  let gesture = null, lastTap = { t: 0, x: 0, y: 0 };
  cv.addEventListener('contextmenu', e => e.preventDefault());
  cv.addEventListener('pointerdown', e => {
    if (!W || modal) return;
    cv.setPointerCapture(e.pointerId);
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ptrs.size === 2) {
      const [a, b] = [...ptrs.values()];
      box = null; wallLine = null;
      gesture = { kind: 'pinch', d0: Math.hypot(a.x - b.x, a.y - b.y) || 1, z0: cam.z, mid: toWorld((a.x + b.x) / 2, (a.y + b.y) / 2) };
      return;
    }
    if (ptrs.size > 2) return;
    const p = toWorld(e.clientX, e.clientY);
    if (e.button === 2) { gesture = { kind: 'right' }; return; }
    if (e.button === 1) { gesture = { kind: 'pan', lx: e.clientX, ly: e.clientY }; return; }
    if (placing === 'wall') { const t = [tileOf(p.x), tileOf(p.y)]; wallLine = [t]; gesture = { kind: 'wall', a: t }; return; }
    gesture = { kind: 'press', sx: e.clientX, sy: e.clientY, touch: e.pointerType !== 'mouse' };
  });
  cv.addEventListener('pointermove', e => {
    if (!W) return;
    if (e.pointerType === 'mouse') hover = toWorld(e.clientX, e.clientY);
    const pt = ptrs.get(e.pointerId);
    if (!pt || !gesture) return;
    const lx = pt.x, ly = pt.y;
    pt.x = e.clientX; pt.y = e.clientY;
    if (gesture.kind === 'pinch' && ptrs.size === 2) {
      const [a, b] = [...ptrs.values()];
      cam.z = clamp(gesture.z0 * Math.hypot(a.x - b.x, a.y - b.y) / gesture.d0, 0.45, 2.2);
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      cam.x = gesture.mid.x - mx / cam.z; cam.y = gesture.mid.y - my / cam.z; clampCam();
      return;
    }
    if (gesture.kind === 'press' && Math.hypot(e.clientX - gesture.sx, e.clientY - gesture.sy) > 9) {
      const { sx, sy } = gesture;
      if (gesture.touch && !boxMode) gesture = { kind: 'pan' };
      else { gesture = { kind: 'box' }; box = { x0: sx, y0: sy, x1: e.clientX, y1: e.clientY }; }
    }
    if (gesture.kind === 'pan') { cam.x -= (e.clientX - lx) / cam.z; cam.y -= (e.clientY - ly) / cam.z; clampCam(); }
    else if (gesture.kind === 'box') { box.x1 = e.clientX; box.y1 = e.clientY; }
    else if (gesture.kind === 'wall') { const p = toWorld(e.clientX, e.clientY); wallLine = lineTiles(gesture.a, [tileOf(p.x), tileOf(p.y)]); }
  });
  function endPointer(e, cancelled) {
    if (!ptrs.has(e.pointerId)) return;
    ptrs.delete(e.pointerId);
    const g = gesture;
    if (ptrs.size) { if (g && g.kind === 'pinch') gesture = { kind: 'done' }; return; }
    gesture = null;
    if (!g || cancelled || !W) { box = null; wallLine = null; return; }
    const p = toWorld(e.clientX, e.clientY);
    if (g.kind === 'press') {
      const now = performance.now(), dbl = now - lastTap.t < 350 && Math.hypot(e.clientX - lastTap.x, e.clientY - lastTap.y) < 20;
      lastTap = { t: now, x: e.clientX, y: e.clientY };
      clickAt(p.x, p.y, e.shiftKey || e.ctrlKey || e.metaKey, dbl);
    } else if (g.kind === 'right') {
      if (placing) { placing = null; wallLine = null; refreshPanel(true); }
      else command(p.x, p.y);
    } else if (g.kind === 'box') {
      const a = toWorld(Math.min(box.x0, box.x1), Math.min(box.y0, box.y1)), b = toWorld(Math.max(box.x0, box.x1), Math.max(box.y0, box.y1));
      const inside = W.units('p').filter(u => selectable(u) && u.x >= a.x && u.x <= b.x && u.y >= a.y && u.y <= b.y);
      box = null;
      if (inside.length) { setSel(e.shiftKey ? selEnts().filter(x => x.kind === 'unit').concat(inside) : inside); if (boxMode) setBoxMode(false); }
    } else if (g.kind === 'wall') {
      placeLine(wallLine || [g.a]); wallLine = null;
    }
  }
  cv.addEventListener('pointerup', e => endPointer(e, false));
  cv.addEventListener('pointercancel', e => endPointer(e, true));
  cv.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') hover = null; });
  cv.addEventListener('wheel', e => { if (!W) return; e.preventDefault(); zoomAt(e.clientX, e.clientY, cam.z * Math.pow(1.0015, -e.deltaY)); }, { passive: false });

  // The minimap: tap or drag to look; right-click to send the chosen ones there.
  let miniDrag = false;
  const miniPoint = e => { const r = mini.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * WORLD_W, y: (e.clientY - r.top) / r.height * WORLD_H }; };
  mini.addEventListener('contextmenu', e => e.preventDefault());
  mini.addEventListener('pointerdown', e => {
    if (!W) return;
    const p = miniPoint(e);
    if (e.button === 2) return command(p.x, p.y);
    miniDrag = true; mini.setPointerCapture(e.pointerId); lookAt(p.x, p.y);
  });
  mini.addEventListener('pointermove', e => { if (miniDrag) { const p = miniPoint(e); lookAt(p.x, p.y); } });
  mini.addEventListener('pointerup', () => { miniDrag = false; });

  window.addEventListener('keydown', e => {
    if (!W || e.target.closest && e.target.closest('input, textarea')) return;
    if (e.key === 'Escape') {
      if (modal) return;
      if (placing) { placing = null; wallLine = null; refreshPanel(true); }
      else if (sel.length) setSel([]);
      else openMenu();
      return;
    }
    if (modal) return;
    if (e.key === ' ') { e.preventDefault(); togglePause(); return; }
    if (e.key === 'h' || e.key === 'H') { for (const u of selUnits()) W.order(u, { type: 'idle' }); return; }
    if (e.key === '+' || e.key === '=') zoomAt(vw / 2, vh / 2, cam.z * 1.2);
    if (e.key === '-') zoomAt(vw / 2, vh / 2, cam.z / 1.2);
    keys.add(e.key.toLowerCase());
  });
  window.addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));
  window.addEventListener('blur', () => keys.clear());
  function panKeys(dt) {
    const s = 700 * dt / cam.z;
    if (keys.has('arrowleft') || keys.has('a')) cam.x -= s;
    if (keys.has('arrowright') || keys.has('d')) cam.x += s;
    if (keys.has('arrowup') || keys.has('w')) cam.y -= s;
    if (keys.has('arrowdown') || keys.has('s')) cam.y += s;
    if (keys.size) clampCam();
  }

  // ------------------------------------------------------------ the bottom panel

  let panelKey = '', panelAt = 0;
  function refreshPanel(force) {
    if (!W) return;
    let ents = selEnts();
    if (ents.length !== sel.length) sel = ents.map(e => e.id);
    if (!ents.length && infoEnt && !infoEnt.dead && W.ents.has(infoEnt.id)) ents = [infoEnt];
    cv.classList.toggle('placing', !!placing);
    const one = ents.length === 1 ? ents[0] : null;
    const key = [sel.join(','), ents.length && ents[0].id, placing, W.res.grain >= 20, W.res.timber >= 6,
      ...['storehouse', 'barracks', 'tower', 'gate'].map(t => W.canAfford(BUILDINGS[t].cost)),
      ...['worker', 'spearman', 'archer'].map(t => W.canAfford(UNITS[t].cost)),
      one && one.kind === 'building' ? [one.built > 0 ? Math.floor(one.built * 20) : 0, one.queue.map(q => q.type + Math.ceil(q.left)).join(), W.researching ? Math.ceil(W.researching.left) : '', W.armor, Math.ceil(one.hp / one.def.hp * 20)] : '',
      one && one.kind === 'unit' ? Math.ceil(one.hp / one.def.hp * 20) + one.order.type : ''].join('|');
    if (!force && key === panelKey) return;
    panelKey = key;
    $('selInfo').innerHTML = infoHtml(ents);
    $('cmds').innerHTML = cmdsHtml(ents);
  }
  function infoHtml(ents) {
    if (!ents.length) return `<h3>${esc(mission.title)}</h3><p>Tap one of your people to choose them. ${W.night ? 'It is night.' : ''}</p>`;
    if (ents.length === 1) {
      const e = ents[0], d = e.def;
      const bar = d.hp < 99999 ? `<div class="hp"><em style="width:${Math.max(0, e.hp / d.hp * 100)}%"></em></div>` : '';
      const doing = e.kind === 'unit' ? ({ gather: 'Gathering ' + (e.order.res || ''), build: 'Building', attack: 'Fighting', move: 'Marching', idle: 'Waiting for orders' }[e.order.type] || '') : !e.built ? 'Being built: ' + Math.floor(e.built * 100) + '%' : '';
      return `<h3>${esc(d.name)}</h3>${bar}${doing ? `<div>${esc(doing)}</div>` : ''}<p>${esc(d.about || '')}</p>`;
    }
    const count = {};
    for (const e of ents) count[e.def.name] = (count[e.def.name] || 0) + 1;
    return `<h3>${ents.length} chosen</h3><p>${Object.entries(count).map(([n, k]) => k + ' ' + esc(n) + (k > 1 ? 's' : '')).join(', ')}</p>`;
  }
  const cmd = (act, name, cost, cls) => `<button class="cmd ${cls || ''}" data-cmd="${act}"><span>${name}</span>${cost ? `<small>${cost}</small>` : ''}</button>`;
  function cmdsHtml(ents) {
    if (placing) {
      const def = BUILDINGS[placing];
      return `<div class="note">${placing === 'wall' ? 'Drag a line on the map for a wall: each piece costs ' + costHtml(def.cost) + '.' : 'Tap the map where the ' + esc(def.name.toLowerCase()) + ' goes. ' + costHtml(def.cost)}</div>` +
        (placing === 'wall' ? cmd('done', 'Done', '', 'on') : '') + cmd('cancel', 'Cancel');
    }
    if (!ents.length) return `<div class="note">Choose people with a tap, or a whole group with <b>Soldiers</b> or <b>Box select</b>. Then tap where they should go, or what they should gather, build or fight.</div>`;
    const b = ents[0];
    if (b.team !== 'p') {
      if (b.type === 'village') return `<div class="note">${b.state === 'waiting' ? 'Send a soldier or worker here. When the proclamation reaches ' + esc(b.name) + ', its people march to Zarahemla.' : 'Its people have gone.'}</div>`;
      if (b.team === 'x') return `<div class="note">He gave himself up (3 Nephi 4:27).</div>`;
      if (b.def.prophet) return `<div class="note">${esc(b.def.about)}</div>`;
      return `<div class="note">${esc(b.def.about || (b.def.leader ? 'A leader of the robbers.' : 'A Gadianton robber.'))} Choose soldiers, then tap him to fight.</div>`;
    }
    const units = ents.filter(e => e.kind === 'unit');
    if (units.length) {
      let h = '';
      if (units.some(u => u.def.builds)) {
        for (const t of ['wall', 'gate', 'tower', 'barracks', 'storehouse']) {
          const def = BUILDINGS[t];
          h += cmd('build:' + t, t === 'wall' ? 'Walls' : def.name, costHtml(def.cost) + (t === 'wall' ? ' each' : ''), W.canAfford(def.cost) ? '' : 'poor');
        }
      }
      h += cmd('stop', 'Stop', 'H');
      return h;
    }
    if (!b.built) return `<div class="note">Choose workers, then tap this to build it.</div>`;
    let h = '';
    for (const t of b.def.trains || []) h += cmd('train:' + t, UNITS[t].name, costHtml(UNITS[t].cost), W.canAfford(UNITS[t].cost) ? '' : 'poor');
    const rk = mission.research || 'armor';
    if (b.def.research && !W.armor) {
      const r = RESEARCH[rk];
      h += W.researching ? `<div class="note">Making ${esc(r.name.toLowerCase())}: ${Math.ceil(W.researching.left)}s</div>`
        : cmd('research:' + rk, esc(r.name), costHtml(r.cost), 'wide ' + (W.canAfford(r.cost) ? '' : 'poor'));
    }
    if (b.queue && b.queue.length) {
      const q = b.queue[0], p = 100 - q.left / UNITS[q.type].time * 100;
      h += `<div class="queue">Training: ${b.queue.map((x, i) => `<span${i ? '' : ` style="--p:${p.toFixed(0)}%"`}>${esc(UNITS[x.type].name)}</span>`).join('')}</div>`;
    }
    if (b.def.trains) h += `<div class="note">${b.rally ? 'New ones go to the rally point.' : 'Tap the ground to set where new ones go.'}</div>`;
    return h || `<div class="note">${esc(b.def.about || '')}</div>`;
  }
  $('cmds').addEventListener('click', e => {
    const btn = e.target.closest('[data-cmd]');
    if (!btn || !W) return;
    const [act, arg] = btn.dataset.cmd.split(':');
    const one = selEnts()[0];
    if (act === 'build') startPlacing(arg);
    else if (act === 'done' || act === 'cancel') { placing = null; wallLine = null; refreshPanel(true); }
    else if (act === 'stop') for (const u of selUnits()) W.order(u, { type: 'idle' });
    else if (act === 'train' && one) { if (!W.train(one, arg)) toast(one.queue.length >= 5 ? 'The line is full.' : poorText(UNITS[arg].cost), 'warn'); }
    else if (act === 'research' && one) {
      if (W.research(one, arg)) toast(RESEARCH[arg].about, 'me', RESEARCH[arg].ref);
      else toast(poorText(RESEARCH[arg].cost), 'warn');
    }
    refreshPanel(true);
  });
  function showInfo(e) { sel = []; infoEnt = e; placing = null; refreshPanel(true); }

  $('bArmy').onclick = () => { const s = W && W.soldiers(); if (s && s.length) { setSel(s); } };
  $('bIdle').onclick = () => {
    if (!W) return;
    const idle = W.units('p').filter(u => u.type === 'worker' && u.order.type === 'idle');
    if (!idle.length) return toast('Every worker is busy.');
    setSel(idle); lookAt(idle[0].x, idle[0].y);
  };
  function setBoxMode(on) { boxMode = on; $('bBox').classList.toggle('on', on); if (on) toast('Now drag on the map to draw a box around people.', 'me'); }
  $('bBox').onclick = () => setBoxMode(!boxMode);

  // ------------------------------------------------------------ top bar

  const shown = {};
  const setText = (id, v) => { if (shown[id] !== v) { shown[id] = v; $(id).textContent = v; } };
  const setHtml = (id, v) => { if (shown[id] !== v) { shown[id] = v; $(id).innerHTML = v; } };
  const mmss = s => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');
  let hudAt = 0;
  function hud(now) {
    setText('rGrain', String(Math.floor(W.res.grain)));
    setText('rTimber', String(Math.floor(W.res.timber)));
    const ps = W.units('p');
    setText('rPeople', ps.filter(u => u.type === 'worker').length + ' · ' + ps.filter(u => u.def.soldier).length);
    if (now - hudAt < 250) return;
    hudAt = now;
    const left = mission.timeLeft(W), label = mission.phaseLabel || mission.timerLabel || '';
    setHtml('clock', esc(label) + (left != null ? ' <b>' + mmss(left) + '</b>' : ''));
    $('food').hidden = W.prov == null;
    if (W.prov != null) $('foodBar').style.width = clamp(W.prov, 0, 100) + '%';
    const pw = mission.power ? mission.power(W) : null;
    $('cry').hidden = !pw;
    if (pw) setHtml('cry', esc(pw.label) + '<small>' + esc(pw.ref || '') + '</small>');
    powerNow = pw;
    const ready = !council || W.t >= council.nextAt;
    $('bCouncil').disabled = !ready;
    setText('bCouncil', ready ? 'Council' : 'Council ' + Math.ceil(council.nextAt - W.t) + 's');
    const goals = mission.objectives(W).map(o => {
      const done = o.have >= o.need;
      return `<li class="${done ? 'done' : ''} ${o.optional ? 'opt' : ''}"><span>${done ? '✓' : '○'}</span><span>${esc(o.text)} ${refBtn(o.ref)}</span><span class="n">${o.need > 1 ? Math.min(o.have, o.need) + '/' + o.need : ''}</span></li>`;
    }).join('');
    setHtml('goalList', goals);
    refreshPanel(false);
    feedTick();
  }

  // ------------------------------------------------------------ the story, as it happens

  function feedTick() {
    while (shownMsgs < W.msgs.length) { const m = W.msgs[shownMsgs++]; addMsg(m.text, m.kind, m.ref); }
    const items = [...$('feed').children], now = performance.now();
    items.forEach((el, i) => {
      const age = now - +el.dataset.t, life = el.classList.contains('warn') || el.classList.contains('tip') ? 14000 : 10000;
      if (age > life || i < items.length - 4) { if (!el.classList.contains('old')) { el.classList.add('old'); setTimeout(() => el.remove(), 700); } }
    });
  }
  function addMsg(text, kind, ref) {
    const el = document.createElement('div');
    el.className = 'msg ' + (kind || 'story');
    el.dataset.t = performance.now();
    el.innerHTML = esc(text) + (ref ? ' ' + refBtn(ref) : '');
    $('feed').appendChild(el);
  }
  const toast = (text, kind, ref) => addMsg(text, kind || 'me', ref);

  // Any verse reference on the screen opens the verses themselves.
  document.addEventListener('click', e => {
    const r = e.target.closest('[data-ref]');
    if (r) { e.preventDefault(); showVerses(r.dataset.ref); }
  });
  function showVerses(ref) {
    const vs = versesOf(ref), url = glUrl(ref);
    openDialog(`<div class="dialog"><div class="kicker">${esc(ref)}</div>
      ${vs.length ? `<div class="verse">${vs.map(([n, t]) => `<p><b>${n}</b>${esc(t)}</p>`).join('')}</div>` : '<p>That verse is in Gospel Library.</p>'}
      <div class="row" style="display:flex;gap:8px;margin-top:14px;flex-wrap:wrap"><button class="btn go" data-close>Back to the battle</button>${url ? `<a class="btn" href="${url}" target="_blank" rel="noopener">Gospel Library</a>` : ''}</div></div>`);
  }

  // ------------------------------------------------------------ the council

  // Right answers from the chapter bring the people's gifts; a wrong one
  // shows the verse that settles it.
  function openCouncil() {
    if (!W || (council && W.t < council.nextAt)) return;
    const qs = chaptersOf(mission).flatMap(c => QUESTIONS[c] || []);
    if (!council.queue.length) council.queue = shuffle(qs.map((_, i) => i));
    const q = qs[council.queue.shift()];
    const answers = shuffle([q.right, ...q.wrong]);
    openDialog(`<div class="dialog"><div class="kicker">The council · ${esc(mission.chapter)}</div><h2>${esc(q.q)}</h2>
      <div class="choices">${answers.map(a => `<button class="choice" data-a="${esc(a)}">${esc(a)}</button>`).join('')}</div><div id="cAfter"></div></div>`);
    const root = $('dialog');
    root.querySelectorAll('.choice').forEach(btn => btn.onclick = () => {
      if (root.querySelector('.choice.right, .choice.wrong')) return;
      const ok = btn.dataset.a === q.right;
      root.querySelectorAll('.choice').forEach(b => { if (b.dataset.a === q.right) b.classList.add('right'); else if (b === btn) b.classList.add('wrong'); });
      const vs = versesOf(q.ref);
      if (ok) {
        W.res.grain += 40; W.res.timber += 60; council.right++;
        council.nextAt = W.t + 60;
      } else {
        council.queue.push(qs.indexOf(q));
        council.nextAt = W.t + 30;
      }
      $('cAfter').innerHTML = `<div class="say ${ok ? 'good' : 'bad'}">${ok ? 'Right! The people bring 40 grain and 60 timber.' : 'Not quite. Here is what the chapter says:'}</div>
        <div class="verse">${vs.map(([n, t]) => `<p><b>${esc(q.ref.replace(/:.*/, ''))}:${n}</b> ${esc(t)}</p>`).join('')}</div>
        <div style="margin-top:14px"><button class="btn go" data-close>Back to the battle</button></div>`;
    });
  }
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  $('bCouncil').onclick = openCouncil;

  // ------------------------------------------------------------ dialogs and screens

  // Dialogs (the council, a verse, the pause menu) sit over whatever is showing.
  const syncModal = () => { modal = !$('screen').hidden || !$('dialog').hidden; };
  function openDialog(html) {
    const d = $('dialog');
    d.hidden = false; d.innerHTML = html; d.scrollTop = 0;
    d.onclick = e => { if (e.target.closest('[data-close]') || e.target === d) closeDialog(); };
    syncModal();
    return d;
  }
  function closeDialog() { const d = $('dialog'); d.hidden = true; d.innerHTML = ''; d.onclick = null; syncModal(); }
  function showScreen(html) {
    const s = $('screen');
    s.hidden = false; s.innerHTML = html; s.scrollTop = 0; s.onclick = null;
    syncModal();
    return s;
  }
  function hideScreen() { const s = $('screen'); s.hidden = true; s.innerHTML = ''; s.onclick = null; syncModal(); }
  function setGameUi(on) {
    for (const id of ['hud', 'panel', 'goals']) $(id).hidden = !on;
    document.body.classList.toggle('playing', on);
    if (!on) { $('cry').hidden = true; $('feed').innerHTML = ''; $('rotate').hidden = true; }
  }

  const starsHtml = n => `<span class="stars">${[1, 2, 3].map(k => `<span class="${k <= n ? '' : 'off'}">★</span>`).join('')}</span>`;
  function openMenu() {
    if (!W || W.over) return home();
    openDialog(`<div class="dialog"><div class="kicker">Paused</div><h2>${esc(mission.title)}</h2>
      <div class="choices"><button class="choice" data-close>Keep playing</button><button class="choice" id="mRestart">Start this mission again</button><button class="choice" id="mQuit">Leave to the missions</button></div></div>`);
    $('mRestart').onclick = () => { closeDialog(); begin(mission); };
    $('mQuit').onclick = () => { closeDialog(); home(); };
  }
  $('bMenu').onclick = openMenu;

  function home() {
    W = null; mission = null; sel = []; placing = null;
    setGameUi(false);
    const card = m => {
      const read = allRead(m), open = unlocked(m), stars = save.won[m.id] || 0, need = m.needs && MISSIONS.find(x => x.id === m.needs);
      const unread = chaptersOf(m).filter(c => !save.read[c]);
      const why = unread.length ? `Read ${unread.join(' and ')} to open this mission.` : !open ? `Win ${need.title} first.` : '';
      return `<div class="card ${open ? '' : 'locked'}">
        <div class="kicker">Mission ${inCampaign(m).indexOf(m) + 1} · ${esc(m.chapter)}</div>
        <h2>${esc(m.title)}</h2>
        ${stars ? starsHtml(stars) : ''}
        <p>${esc(m.goals)}</p>
        ${why ? `<div class="lock">🔒 ${esc(why)}</div>` : ''}
        <div class="row">
          ${chaptersOf(m).map(c => `<button class="btn ${save.read[c] ? '' : 'go'}" data-read="${esc(c)}">${save.read[c] ? 'Read ' + esc(c) + ' again' : 'Read ' + esc(c)}</button>`).join('')}
          <button class="btn ${read && open ? 'go' : ''}" data-play="${m.id}" ${open ? '' : 'disabled'}>${stars ? 'Play again' : 'Play'}</button>
        </div></div>`;
    };
    const cards = CAMPAIGNS.map(c => `<h2 class="camp">${esc(c.title)}</h2><p class="camp-about">${esc(c.about)}</p><div class="cards">${MISSIONS.filter(m => m.campaign === c.id).map(card).join('')}</div>`).join('');
    const s = showScreen(`<div class="wrap">
      <div class="kicker">A Book of Mormon strategy game</div>
      <h1><span>Title of Liberty</span></h1>
      <p class="lede">Lead the Nephites through the wars of the Book of Mormon. Read each chapter first, then play it: the missions follow what happens in the verses.</p>
      ${cards}
      <details class="how"><summary>How to play</summary><ul>
        <li><b>Choose</b> your people: tap or click one. Drag a box around several (on a touch screen, tap <b>Box select</b> first). <b>Soldiers</b> chooses your whole army.</li>
        <li><b>Give orders</b>: with people chosen, tap the ground to march, an enemy to fight, trees or a field to gather, or an unfinished building to build it. (On a computer, right-click works too.)</li>
        <li><b>Build</b>: choose workers, pick a building, then tap where it goes. For walls, drag a line.</li>
        <li><b>Train</b>: choose your city for workers, or the barracks for soldiers and armor.</li>
        <li><b>Story moments</b>: when the chapter's big moment comes (crying unto the Lord, Lehi's attack), a gold button appears at the top.</li>
        <li><b>The council</b>: answer a question from the chapter for grain and timber. Get it wrong and you'll see the verse.</li>
        <li><b>Look around</b>: drag the map (arrow keys on a computer), pinch or scroll to zoom, or tap the small map.</li>
        <li>Tap any gold verse reference to read the verse.</li>
      </ul></details>
      <p class="aside">The title of liberty was Captain Moroni's banner (Alma 46:12–13); his story is the first campaign. The maps are pictures of each story: where these places were isn't known.</p>
      <p class="aside"><a href="../">← Back to Treasure Up</a></p>
    </div>`);
    s.onclick = e => {
      const r = e.target.closest('[data-read]'), p = e.target.closest('[data-play]');
      if (r) openReader(r.dataset.read);
      else if (p && !p.disabled) briefing(MISSIONS.find(m => m.id === p.dataset.play));
    };
  }

  // The chapter, in full. "I read it" opens once he reaches the end, or has
  // opened it in Gospel Library instead (the same rule as the main app).
  function openReader(chapter) {
    const vs = TEXT[chapter] || [], url = glUrl(chapter);
    const s = showScreen(`<div class="reader">
      <header><button id="rdBack" aria-label="Back">←</button><h2>${esc(chapter)}</h2></header>
      <div class="verses" id="rdBody">${vs.map((t, i) => `<p><b>${i + 1}</b>${esc(t)}</p>`).join('')}</div>
      <footer><div class="hint" id="rdHint">Read to the end, then tap it.</div>
        <button class="btn go" id="rdDone" disabled>I read ${esc(chapter)}</button>
        ${url ? `<a href="${url}" target="_blank" rel="noopener" id="rdGL">Read it in Gospel Library instead</a>` : ''}</footer></div>`);
    const body = $('rdBody'), done = $('rdDone');
    const ok = () => { done.disabled = false; $('rdHint').textContent = 'Well done. Tap to open the mission.'; };
    const check = () => { if (body.scrollTop + body.clientHeight >= body.scrollHeight - 60) ok(); };
    body.addEventListener('scroll', check, { passive: true });
    requestAnimationFrame(check);
    if ($('rdGL')) $('rdGL').addEventListener('click', ok);
    $('rdBack').onclick = home;
    done.onclick = () => { save.read[chapter] = save.read[chapter] || Date.now(); store(); home(); };
    s.onclick = null;
  }

  function briefing(m) {
    showScreen(`<div class="wrap brief">
      <div class="kicker">${esc(CAMPAIGNS.find(c => c.id === m.campaign).title)} · Mission ${inCampaign(m).indexOf(m) + 1} · ${esc(m.chapter)} · ${esc(m.year)}</div>
      <h2 style="font-size:32px">${esc(m.title)}</h2>
      <ul>${m.briefing.map(([t, r]) => `<li>${esc(t)} ${refBtn(r)}</li>`).join('')}</ul>
      <div class="goalbox"><b>Your goals.</b> ${esc(m.goals)}</div>
      <div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn go" id="bBegin">Begin</button><button class="btn" id="bBack">Back</button></div></div>`);
    $('bBegin').onclick = () => begin(m);
    $('bBack').onclick = home;
  }

  function begin(m) {
    mission = m;
    W = new S.World(undefined, m.map);
    W.mission = m;
    m.setup(W);
    sel = []; placing = null; wallLine = null; painted = null; miniDirty = true; shownMsgs = 0; endShown = false;
    paused = false; speed = 1; $('bSpeed').textContent = '1×'; $('bPause').textContent = '❚❚';
    council = { nextAt: 20, queue: [], right: 0 };
    closeDialog(); hideScreen();
    $('feed').innerHTML = '';
    setGameUi(true);
    $('goals').open = window.innerWidth >= 700 && window.innerHeight >= 600;
    resize();
    cam.z = vw < 700 ? 0.8 : 1;
    const s = W.stronghold();
    lookAt(s.x, s.y - (m.id === 'm1' ? 160 : 60));
    refreshPanel(true);
  }

  function showEnd() {
    endShown = true;
    const o = W.over;
    if (o.won) { save.won[mission.id] = Math.max(save.won[mission.id] || 0, o.stars || 1); store(); }
    const next = inCampaign(mission)[inCampaign(mission).indexOf(mission) + 1];
    const unread = next ? chaptersOf(next).filter(c => !save.read[c]) : [];
    const nextBtn = o.won && next ? (!unread.length
      ? `<button class="btn go" id="eNext">Next: ${esc(next.title)}</button>`
      : `<button class="btn go" data-read="${esc(unread[0])}">Read ${esc(unread[0])}</button>`) : '';
    setTimeout(() => {
      const s = showScreen(`<div class="wrap end">
        <div class="kicker">${o.won ? 'Victory' : 'Defeat'} · ${esc(mission.title)}</div>
        <h1><span>${esc(o.title)}</span></h1>
        ${o.won ? starsHtml(o.stars || 1) : ''}
        <p class="quote">${esc(o.text)}</p>${o.ref ? refBtn(o.ref) : ''}
        ${o.detail ? `<p class="lede" style="margin-top:12px">${esc(o.detail)}</p>` : ''}
        ${o.next ? `<p class="lede">${esc(o.next)}</p>` : ''}
        ${o.won && mission.starsText ? `<p class="lede">Stars: ${esc(mission.starsText)}</p>` : ''}
        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:18px">${nextBtn}<button class="btn ${nextBtn ? '' : 'go'}" id="eAgain">Play again</button><button class="btn" id="eHome">Missions</button></div></div>`);
      $('eAgain').onclick = () => begin(mission);
      $('eHome').onclick = home;
      if ($('eNext')) $('eNext').onclick = () => briefing(next);
      s.onclick = e => { const r = e.target.closest('[data-read]'); if (r) openReader(r.dataset.read); };
    }, 1200);
  }

  function togglePause() { paused = !paused; $('bPause').textContent = paused ? '▶' : '❚❚'; if (paused) toast('Paused. Press Space or ▶ to go on.'); }
  $('bPause').onclick = togglePause;
  $('bSpeed').onclick = () => { speed = speed === 1 ? 2 : 1; $('bSpeed').textContent = speed + '×'; };
  let powerNow = null;
  $('cry').onclick = () => { if (W && powerNow) { mission.usePower(W, powerNow.id); $('cry').hidden = true; powerNow = null; shown.cry = null; } };
  document.addEventListener('visibilitychange', () => { if (document.hidden && W && !W.over && !paused) togglePause(); });

  // ------------------------------------------------------------ the loop

  let last = 0, acc = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.25, (now - (last || now)) / 1000);
    last = now;
    if (!W) return;
    if (!W.over && !paused && !modal) {
      acc += dt * speed;
      let n = 0;
      while (acc >= STEP && n < 10) { W.step(STEP); acc -= STEP; n++; }
      if (n === 10) acc = 0;
    }
    if (!modal) panKeys(dt);
    draw(now);
    hud(now);
    if (W.over && !endShown) showEnd();
  }

  $('iGrain').innerHTML = ICON.grain; $('iTimber').innerHTML = ICON.timber; $('iPeople').innerHTML = ICON.people;
  window.addEventListener('resize', resize);
  resize();
  home();
  requestAnimationFrame(frame);
  // A window on the game for automated play-throughs in a browser.
  window.LIB_UI = { get W() { return W; }, get mission() { return mission; }, cam, begin: id => begin(MISSIONS.find(m => m.id === id)), toWorld, lookAt,
    screenOf: (x, y) => ({ x: (x - cam.x) * cam.z, y: (y - cam.y) * cam.z }) };
})();
