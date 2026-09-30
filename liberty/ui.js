// Title of Liberty: the screen. Draws the world that liberty/sim.js runs,
// turns clicks and taps into orders, and runs the menus: read the chapter,
// then play its mission. Nothing here decides who wins a fight.
(function () {
  'use strict';
  const D = window.LIB_DATA, S = window.LIB_SIM, MISSIONS = window.LIB_MISSIONS.MISSIONS, CAMPAIGNS = window.LIB_MISSIONS.CAMPAIGNS, FREE = window.LIB_MISSIONS.FREE_BATTLE;
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

  // ------------------------------------------------------------ 2:1 Isometric Projection
  // Standard Westwood Red Alert 2 dimetric ratio (tile width : height = 2 : 1)
  const toIso = (wx, wy) => ({ ix: (wx - wy), iy: (wx + wy) * 0.5 });
  const fromIso = (ix, iy) => ({ x: (ix + 2 * iy) * 0.5, y: (2 * iy - ix) * 0.5 });
  const WORLD_ISO_MIN_X = -MAP_H * TILE; // -1536
  const WORLD_ISO_MAX_X = MAP_W * TILE;  // 2048
  const WORLD_ISO_MIN_Y = 0;
  const WORLD_ISO_MAX_Y = (MAP_W + MAP_H) * TILE * 0.5; // 1792
  const WORLD_ISO_W = WORLD_ISO_MAX_X - WORLD_ISO_MIN_X; // 3584
  const WORLD_ISO_H = WORLD_ISO_MAX_Y - WORLD_ISO_MIN_Y; // 1792
  const ISO_OFFSET_X = -WORLD_ISO_MIN_X; // 1536

  // ------------------------------------------------------------ canvas & camera

  const cv = $('view'), ctx = cv.getContext('2d');
  const mini = $('mini'), mctx = mini.getContext('2d');
  let dpr = 1, vw = 0, vh = 0;
  const topH = () => $('hud').offsetHeight || 0;
  const bottomH = () => (window.innerWidth >= 860 || $('panel').hidden) ? 0 : ($('panel').offsetHeight || 0);
  const rightW = () => (window.innerWidth >= 860 && !$('panel').hidden) ? ($('panel').offsetWidth || 236) : 0;

  function resize() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    vw = window.innerWidth; vh = window.innerHeight;
    cv.width = Math.round(vw * dpr); cv.height = Math.round(vh * dpr);
    cv.style.width = vw + 'px'; cv.style.height = vh + 'px';
    const mw = mini.clientWidth || 144;
    mini.width = Math.round(mw * dpr); mini.height = Math.round(mw * WORLD_ISO_H / WORLD_ISO_W * dpr);
    mini.style.height = Math.round(mw * WORLD_ISO_H / WORLD_ISO_W) + 'px';
    miniDirty = true;
    $('rotate').hidden = !(W && vw < 560 && vh > vw);
    clampCam();
  }
  function clampCam() {
    const w = (vw - rightW()) / cam.z, h = (vh - topH() - bottomH()) / cam.z;
    cam.x = clamp(cam.x, WORLD_ISO_MIN_X - 160, WORLD_ISO_MAX_X - w + 160);
    cam.y = clamp(cam.y, WORLD_ISO_MIN_Y - 80, WORLD_ISO_MAX_Y - h + 80);
  }
  const toWorld = (sx, sy) => fromIso(cam.x + sx / cam.z, cam.y + sy / cam.z);
  const toScreen = (wx, wy) => {
    const { ix, iy } = toIso(wx, wy);
    return { x: (ix - cam.x) * cam.z, y: (iy - cam.y) * cam.z };
  };
  function lookAt(wx, wy) {
    const { ix, iy } = toIso(wx, wy);
    const usableW = vw - rightW();
    const usableH = vh - topH() - bottomH();
    cam.x = ix - usableW / cam.z / 2;
    cam.y = iy - (topH() + usableH / 2) / cam.z;
    clampCam();
  }
  function zoomAt(sx, sy, z) {
    const p = toWorld(sx, sy);
    cam.z = clamp(z, 0.45, 2.2);
    const { ix, iy } = toIso(p.x, p.y);
    cam.x = ix - sx / cam.z; cam.y = iy - sy / cam.z;
    clampCam();
  }

  // ------------------------------------------------------------ Shroud of War (Westwood Fog of War)
  const shroudCv = document.createElement('canvas');
  shroudCv.width = WORLD_ISO_W; shroudCv.height = WORLD_ISO_H;
  const sctx = shroudCv.getContext('2d');
  const explored = new Uint8Array(MAP_W * MAP_H);

  function initShroud() {
    explored.fill(0);
    sctx.globalCompositeOperation = 'source-over';
    sctx.fillStyle = '#06070c'; // Westwood Pitch Black Shroud
    sctx.fillRect(0, 0, WORLD_ISO_W, WORLD_ISO_H);
    miniDirty = true;
    revealShroud();
  }

  function revealShroud() {
    if (!W) return;
    sctx.globalCompositeOperation = 'destination-out';
    const punch = (wx, wy, rad) => {
      const { ix, iy } = toIso(wx, wy);
      const cx = ix + ISO_OFFSET_X, cy = iy;
      const r = Math.max(54, rad * 1.15);
      const grad = sctx.createRadialGradient(cx, cy, r * 0.65, cx, cy, r);
      grad.addColorStop(0, 'rgba(0, 0, 0, 1)');
      grad.addColorStop(0.8, 'rgba(0, 0, 0, 0.95)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      sctx.fillStyle = grad;
      sctx.beginPath();
      sctx.arc(cx, cy, r, 0, Math.PI * 2);
      sctx.fill();

      // Mark explored tiles in map grid
      const tr = Math.ceil(rad / TILE) + 1;
      const x0 = Math.max(0, Math.floor(wx / TILE - tr));
      const x1 = Math.min(MAP_W - 1, Math.ceil(wx / TILE + tr));
      const y0 = Math.max(0, Math.floor(wy / TILE - tr));
      const y1 = Math.min(MAP_H - 1, Math.ceil(wy / TILE + tr));
      const r2 = rad * rad;
      for (let ty = y0; ty <= y1; ty++) {
        for (let tx = x0; tx <= x1; tx++) {
          const dx = (tx + 0.5) * TILE - wx, dy = (ty + 0.5) * TILE - wy;
          if (dx * dx + dy * dy <= r2) explored[ty * MAP_W + tx] = 1;
        }
      }
    };

    for (const u of W.units('p')) punch(u.x, u.y, u.def.sight || 170);
    for (const b of W.buildings('p')) {
      const bx = (b.tx + b.w * 0.5) * TILE, by = (b.ty + b.h * 0.5) * TILE;
      punch(bx, by, b.def.range ? b.def.range + 60 : 210);
    }
    miniDirty = true;
  }

  const inVision = (wx, wy) => {
    for (const u of W.units('p')) {
      if (Math.hypot(u.x - wx, u.y - wy) <= (u.def.sight || 170)) return true;
    }
    for (const b of W.buildings('p')) {
      const bx = (b.tx + b.w * 0.5) * TILE, by = (b.ty + b.h * 0.5) * TILE;
      if (Math.hypot(bx - wx, by - wy) <= (b.def.range ? b.def.range + 50 : 200)) return true;
    }
    return false;
  };

  const isVisible = e => {
    if (e.team === 'p' || e.team === 'x') return true;
    if (e.kind === 'unit') return inVision(e.x, e.y);
    const tx = Math.min(MAP_W - 1, Math.max(0, Math.floor(e.tx + e.w * 0.5)));
    const ty = Math.min(MAP_H - 1, Math.max(0, Math.floor(e.ty + e.h * 0.5)));
    return explored[ty * MAP_W + tx] === 1;
  };

  // ------------------------------------------------------------ isometric terrain

  const terrain = document.createElement('canvas');
  terrain.width = WORLD_ISO_W; terrain.height = WORLD_ISO_H;
  const tctx = terrain.getContext('2d');
  let painted = null, miniDirty = true;
  function hash(x, y, k) {
    let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(k | 0, 1442695041);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }
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
  function tileDiamond(c, x, y) {
    const top = { x: (x - y) * TILE + ISO_OFFSET_X, y: (x + y) * TILE * 0.5 };
    const right = { x: (x + 1 - y) * TILE + ISO_OFFSET_X, y: (x + 1 + y) * TILE * 0.5 };
    const bottom = { x: (x - y) * TILE + ISO_OFFSET_X, y: (x + y + 2) * TILE * 0.5 };
    const left = { x: (x - (y + 1)) * TILE + ISO_OFFSET_X, y: (x + y + 1) * TILE * 0.5 };
    c.beginPath();
    c.moveTo(top.x, top.y);
    c.lineTo(right.x, right.y);
    c.lineTo(bottom.x, bottom.y);
    c.lineTo(left.x, left.y);
    c.closePath();
    return { top, right, bottom, left, cx: top.x, cy: (top.y + bottom.y) * 0.5 };
  }
  function paintTile(x, y) {
    const c = tctx, i = y * MAP_W + x, t = W.tiles[i], a = W.amt[i], h = k => hash(x, y, k);
    const d = tileDiamond(c, x, y);

    const isLand = (tx, ty) => {
      if (tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H) return false;
      const nt = W.tiles[ty * MAP_W + tx];
      return nt !== T.WATER && nt !== T.FORD;
    };
    const nearLand = isLand(x, y - 1) || isLand(x + 1, y) || isLand(x, y + 1) || isLand(x - 1, y);

    if (t === T.GRASS) {
      // Lush tropical green grass
      c.fillStyle = '#3b7a24'; c.fill();
      // Add some subtle texture details
      for (let k = 0; k < 4; k++) {
        c.fillStyle = h(k+10) < 0.5 ? '#2d6318' : '#65a148';
        c.fillRect(d.cx - 6 + h(k+20)*12, d.cy - 3 + h(k+30)*6, 2, 2);
      }
    } else if (t === T.WATER || t === T.FORD) {
      // River Sidon: Rich deep azure/cyan gradient
      const wGrad = c.createLinearGradient(d.left.x, d.top.y, d.right.x, d.bottom.y);
      if (t === T.WATER) {
        wGrad.addColorStop(0, '#0284c7');
        wGrad.addColorStop(0.5, '#0369a1');
        wGrad.addColorStop(1, '#075985');
      } else {
        wGrad.addColorStop(0, '#38bdf8');
        wGrad.addColorStop(0.5, '#0284c7');
        wGrad.addColorStop(1, '#0ea5e9');
      }
      c.fillStyle = wGrad; c.fill();

      // Shoreline sandy beach transition if bordering land
      if (nearLand) {
        c.strokeStyle = '#c5a86d'; c.lineWidth = 3.5;
        if (isLand(x, y - 1)) { c.beginPath(); c.moveTo(d.top.x, d.top.y); c.lineTo(d.right.x, d.right.y); c.stroke(); }
        if (isLand(x - 1, y)) { c.beginPath(); c.moveTo(d.left.x, d.left.y); c.lineTo(d.top.x, d.top.y); c.stroke(); }
        if (isLand(x, y + 1)) { c.beginPath(); c.moveTo(d.left.x, d.left.y); c.lineTo(d.bottom.x, d.bottom.y); c.stroke(); }
        if (isLand(x + 1, y)) { c.beginPath(); c.moveTo(d.bottom.x, d.bottom.y); c.lineTo(d.right.x, d.right.y); c.stroke(); }
        // Water edge foam
        c.strokeStyle = 'rgba(255,255,255,.45)'; c.lineWidth = 1.2;
        if (isLand(x, y - 1)) { c.beginPath(); c.moveTo(d.top.x, d.top.y + 1); c.lineTo(d.right.x - 1, d.right.y); c.stroke(); }
        if (isLand(x - 1, y)) { c.beginPath(); c.moveTo(d.left.x + 1, d.left.y); c.lineTo(d.top.x, d.top.y + 1); c.stroke(); }
      }

      // Translucent glistening water currents
      c.strokeStyle = 'rgba(224,242,254,.38)'; c.lineWidth = 1.2;
      for (let k = 0; k < 3; k++) {
        const fx = d.cx - 10 + h(k + 30) * 20, fy = d.cy - 4 + h(k + 35) * 8;
        c.beginPath(); c.moveTo(fx - 6, fy); c.lineTo(fx + 6, fy); c.stroke();
      }

      if (t === T.FORD) {
        // Natural river stepping boulders with foaming rapids
        c.fillStyle = '#78716c';
        for (let k = 0; k < 4; k++) {
          const bx = d.cx - 10 + h(k) * 20, by = d.cy - 4 + h(k + 10) * 8;
          c.beginPath(); c.ellipse(bx, by, 3.5, 2.2, 0.2, 0, 7); c.fill();
        }
        c.fillStyle = '#a8a29e';
        for (let k = 0; k < 4; k++) {
          const bx = d.cx - 10 + h(k) * 20, by = d.cy - 5 + h(k + 10) * 8;
          c.beginPath(); c.ellipse(bx - 0.5, by - 0.5, 2, 1.2, 0.2, 0, 7); c.fill();
        }
        // White foam rapids around rocks
        c.fillStyle = 'rgba(255,255,255,.7)';
        c.fillRect(d.cx - 8, d.cy - 1, 16, 2);
        c.fillRect(d.cx - 4, d.cy + 3, 10, 1.5);
      }
    } else if (t === T.ROCK) {
      // Stratified Mountain Cliffs with rich horizontal strata
      c.fillStyle = '#292524'; c.fill();
      c.fillStyle = '#44403c'; c.fillRect(d.left.x + 4, d.cy - 7, (d.right.x - d.left.x) - 8, 5);
      c.fillStyle = '#57534e'; c.fillRect(d.left.x + 6, d.cy, (d.right.x - d.left.x) - 12, 4);
      c.fillStyle = '#78716c'; c.fillRect(d.left.x + 8, d.cy + 4, (d.right.x - d.left.x) - 16, 3);
      // Sunlit upper ridge
      c.strokeStyle = '#d6d3d1'; c.lineWidth = 1.8;
      c.beginPath(); c.moveTo(d.left.x, d.left.y); c.lineTo(d.top.x, d.top.y); c.lineTo(d.right.x, d.right.y); c.stroke();
    } else if (t === T.FOREST) {
      // Lush tropical jungle forest with rich soil and dense canopy
      c.fillStyle = '#1c3814'; c.fill();
      const n = a > 80 ? 3 : a > 35 ? 2 : 1;
      for (let k = 0; k < n; k++) {
        const tx = d.cx - 10 + h(k + 50) * 20, ty = d.cy - 6 + h(k + 60) * 12, r = 8 + h(k + 70) * 4;
        // Ground shadow
        c.fillStyle = 'rgba(0,0,0,.42)'; c.beginPath(); c.ellipse(tx + 5, ty + 7, r * 1.3, r * 0.65, 0.2, 0, 7); c.fill();
        // Buttress trunk
        c.fillStyle = '#3f1f08'; c.fillRect(tx - 2, ty - 2, 4, 8);
        // Volumetric 4-tier tropical canopy
        c.fillStyle = '#0f290d'; c.beginPath(); c.arc(tx + 1, ty - 4, r, 0, 7); c.fill();
        c.fillStyle = '#1b4a16'; c.beginPath(); c.arc(tx, ty - 5, r * 0.9, 0, 7); c.fill();
        c.fillStyle = '#2f7524'; c.beginPath(); c.arc(tx - r * 0.25, ty - 6 - r * 0.2, r * 0.65, 0, 7); c.fill();
        c.fillStyle = '#4ade80'; c.beginPath(); c.arc(tx - r * 0.4, ty - 7 - r * 0.35, r * 0.35, 0, 7); c.fill();
      }
    } else if (t === T.FIELD) {
      // Golden Tilled Grain & Corn Terrace
      c.fillStyle = '#38230e'; c.fill();
      c.fillStyle = a > 150 ? '#ca8a04' : '#92400e';
      c.beginPath();
      c.moveTo(d.top.x, d.top.y + 2); c.lineTo(d.right.x - 3, d.right.y); c.lineTo(d.bottom.x, d.bottom.y - 2); c.lineTo(d.left.x + 3, d.left.y);
      c.fill();
      // Furrow rows & Golden Stalks
      c.strokeStyle = '#facc15'; c.lineWidth = 1.4;
      for (let f = -10; f <= 10; f += 4) {
        c.beginPath();
        c.moveTo(d.cx - 12 + f, d.cy - 6 + f * 0.5);
        c.lineTo(d.cx + 12 + f, d.cy + 6 + f * 0.5);
        c.stroke();
      }
      if (a > 150) {
        c.fillStyle = '#78350f'; c.fillRect(d.left.x + 2, d.left.y - 4, 3, 7);
      }
    } else if (t === T.RUIN) {
      // Ancient carved stone foundations
      c.fillStyle = '#292524'; c.fill();
      c.fillStyle = '#57534e'; c.fillRect(d.cx - 12, d.cy - 6, 24, 12);
      c.fillStyle = '#78716c'; c.fillRect(d.cx - 12, d.cy - 6, 24, 2);
      c.fillStyle = '#15803d'; c.fillRect(d.cx - 8, d.cy, 8, 3);
    } else {
      // Lush Mesoamerican Prairie Grass: multi-hued natural soil
      const gHues = ['#2e581c', '#356321', '#3b6e26', '#447d2c', '#315c1e', '#3e7328'];
      c.fillStyle = gHues[Math.floor(h(1) * gHues.length)];
      c.fill();

      // Sunlit top edge highlight
      c.strokeStyle = 'rgba(134, 239, 172, .18)'; c.lineWidth = 1;
      c.beginPath(); c.moveTo(d.left.x, d.left.y); c.lineTo(d.top.x, d.top.y); c.lineTo(d.right.x, d.right.y); c.stroke();

      // Organic soil clods or wildflowers
      if (h(2) < 0.18) {
        // Rich earthen loam patch
        c.fillStyle = 'rgba(78, 56, 32, .35)';
        c.beginPath(); c.ellipse(d.cx - 4 + h(3) * 8, d.cy - 2 + h(4) * 4, 5, 2.5, 0.2, 0, 7); c.fill();
      }
      if (h(5) < 0.09) {
        // Wildflower dot (marigold or tropical amaranth)
        c.fillStyle = h(6) < 0.5 ? '#facc15' : '#ef4444';
        c.fillRect(d.cx - 6 + h(7) * 12, d.cy - 3 + h(8) * 6, 2, 2);
      }
    }
  }

  // ------------------------------------------------------------ particle engine

  const particles = [];
  function addSmoke(ix, iy, dark = true) {
    if (particles.length > 80) return;
    particles.push({ ix, iy, vx: (Math.random() - 0.5) * 0.4, vy: -0.7 - Math.random() * 0.6, size: 3 + Math.random() * 3, life: 0, maxLife: 40 + Math.random() * 20, dark });
  }
  function addFire(ix, iy) {
    if (particles.length > 80) return;
    particles.push({ ix: ix + (Math.random() - 0.5) * 6, iy, vx: (Math.random() - 0.5) * 0.5, vy: -1.0 - Math.random() * 0.8, size: 3 + Math.random() * 2, life: 0, maxLife: 20 });
  }
  function addSpark(ix, iy) {
    if (particles.length > 80) return;
    particles.push({ ix, iy, vx: (Math.random() - 0.5) * 2.5, vy: (Math.random() - 0.5) * 2.5 - 1, size: 1.5, life: 0, maxLife: 15, spark: true });
  }

  // ------------------------------------------------------------ drawing

  const TEAM = { p: '#1d4ed8', r: '#b91c1c' };
  function draw(now) {
    if (W.terrainDirty || !painted) paintTerrain();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#080911'; ctx.fillRect(0, 0, cv.width, cv.height);
    const z = cam.z * dpr;
    ctx.setTransform(z, 0, 0, z, -cam.x * z, -cam.y * z);
    ctx.drawImage(terrain, -ISO_OFFSET_X, 0);

    const inView = e => {
      const { ix, iy } = toIso(e.x, e.y);
      return ix > cam.x - 160 && ix < cam.x + vw / cam.z + 160 && iy > cam.y - 160 && iy < cam.y + vh / cam.z + 160;
    };
    const selSet = new Set(sel);

    drawZones();
    if (W.border != null && !W.borderOpen) drawBorder();

    // Isometric depth sorting: entities with larger (x + y) are closer to camera and drawn on top
    const isoDepth = e => e.kind === 'building' ? (e.tx + e.w * 0.5 + e.ty + e.h * 0.5) * TILE : (e.x + e.y);
    const ents = [];
    for (const e of W.ents.values()) if (inView(e) && isVisible(e)) ents.push(e);
    ents.sort((a, b) => isoDepth(a) - isoDepth(b));

    // Draw entities in depth order
    for (const e of ents) {
      if (e.kind === 'building') {
        drawBuilding(e, selSet.has(e.id), now);
      } else {
        if (selSet.has(e.id)) drawRing(e);
        drawUnit(e, now);
        if (selSet.has(e.id) || (e.hitAt && W.t - e.hitAt < 3)) {
          const { ix, iy } = toIso(e.x, e.y);
          hpBar(ix, iy - radius(e) - 18, 22, e.hp / e.def.hp);
        }
      }
    }

    // Dynamic environmental smoke & fire particles
    for (const e of ents) {
      if (e.kind === 'building') {
        const { ix, iy } = toIso(e.x, e.y);
        if (e.type === 'armory' && Math.random() < 0.25) addSmoke(ix + 6, iy - 32, false);
        if (e.type === 'warcamp' && Math.random() < 0.3) { addSmoke(ix, iy - 20, false); addFire(ix, iy - 8); }
        if (e.hp < S.maxHp(e) * 0.6 && Math.random() < 0.3) addSmoke(ix, iy - 24, true);
        if (e.hp < S.maxHp(e) * 0.3 && Math.random() < 0.4) { addSmoke(ix, iy - 28, true); addFire(ix, iy - 16); }
      }
    }

    // Render active particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life++;
      p.ix += p.vx; p.iy += p.vy;
      const alpha = 1 - p.life / p.maxLife;
      if (alpha <= 0) { particles.splice(i, 1); continue; }
      if (p.spark) {
        ctx.fillStyle = `rgba(254,240,138,${alpha})`;
        ctx.beginPath(); ctx.arc(p.ix, p.iy, p.size, 0, 7); ctx.fill();
      } else if (p.dark) {
        ctx.fillStyle = `rgba(28,25,23,${alpha * 0.65})`;
        ctx.beginPath(); ctx.arc(p.ix, p.iy, p.size, 0, 7); ctx.fill();
      } else {
        ctx.fillStyle = `rgba(249,115,22,${alpha * 0.8})`;
        ctx.beginPath(); ctx.arc(p.ix, p.iy, p.size, 0, 7); ctx.fill();
      }
    }

    drawEffects();
    drawMarkers(now);
    drawGhost();

    // Order feedback pings in isometric
    for (let i = pings.length - 1; i >= 0; i--) {
      const p = pings[i], age = (now - p.t) / 450;
      if (age > 1) { pings.splice(i, 1); continue; }
      const { ix, iy } = toIso(p.wx !== undefined ? p.wx : p.x, p.wy !== undefined ? p.wy : p.y);
      ctx.save();
      ctx.strokeStyle = p.color; ctx.globalAlpha = 1 - age; ctx.lineWidth = 2;
      if (p.type === 'attack') {
        const rad = 8 + age * 12;
        ctx.beginPath(); ctx.arc(ix, iy, rad, 0, 7); ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(ix - rad - 4, iy); ctx.lineTo(ix + rad + 4, iy);
        ctx.moveTo(ix, iy - rad - 4); ctx.lineTo(ix, iy + rad + 4);
        ctx.stroke();
      } else {
        const rad = 6 + age * 18;
        ctx.beginPath();
        ctx.moveTo(ix, iy - rad * 0.5);
        ctx.lineTo(ix + rad, iy);
        ctx.lineTo(ix, iy + rad * 0.5);
        ctx.lineTo(ix - rad, iy);
        ctx.closePath();
        ctx.stroke();
      }
      ctx.restore();
    }

    // ---------------- Westwood Shroud of War ----------------
    ctx.drawImage(shroudCv, -ISO_OFFSET_X, 0);

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
    const p0 = toIso(0, y), p1 = toIso(WORLD_W, y);
    ctx.save();
    ctx.strokeStyle = 'rgba(248,113,113,.85)'; ctx.lineWidth = 3; ctx.setLineDash([14, 10]);
    ctx.beginPath(); ctx.moveTo(p0.ix, p0.iy); ctx.lineTo(p1.ix, p1.iy); ctx.stroke();
    ctx.setLineDash([]);
    ctx.font = '700 12px Outfit, system-ui, sans-serif'; ctx.textAlign = 'center';
    for (let x = 8; x < MAP_W; x += 16) {
      const pt = toIso(x * TILE, y);
      ctx.fillStyle = 'rgba(0,0,0,.65)'; ctx.fillRect(pt.ix - 118, pt.iy - 24, 236, 18);
      ctx.fillStyle = '#fecaca'; ctx.fillText('Wilderness: wait for them to come (3 Nephi 3:21)', pt.ix, pt.iy - 11);
    }
    ctx.restore();
  }
  function drawMarkers(now) {
    const list = mission.markers ? mission.markers(W) : [];
    if (!list.length) return;
    const pulse = 0.6 + 0.4 * Math.sin(now / 250);
    ctx.font = '800 13px Outfit, system-ui, sans-serif'; ctx.textAlign = 'center';
    for (const m of list) {
      if (!explored[Math.floor(m.y) * MAP_W + Math.floor(m.x)]) continue;
      const { ix, iy } = toIso((m.x + 0.5) * TILE, (m.y + 0.5) * TILE);
      const w = ctx.measureText(m.label).width + 16;
      ctx.strokeStyle = `rgba(253,230,138,${pulse})`; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(ix, iy, 42, 21, 0, 0, 7); ctx.stroke();
      ctx.fillStyle = 'rgba(0,0,0,.65)'; ctx.fillRect(ix - w / 2, iy - 48, w, 18);
      ctx.fillStyle = '#fde68a'; ctx.fillText(m.label, ix, iy - 35);
    }
  }
  function drawZones() {
    ctx.save();
    ctx.font = '800 13px Outfit, system-ui, sans-serif'; ctx.textAlign = 'left';
    for (const c of W.cover) {
      const p0 = toIso(c.x0 * TILE, c.y0 * TILE);
      const p1 = toIso((c.x1 + 1) * TILE, c.y0 * TILE);
      const p2 = toIso((c.x1 + 1) * TILE, (c.y1 + 1) * TILE);
      const p3 = toIso(c.x0 * TILE, (c.y1 + 1) * TILE);
      ctx.fillStyle = 'rgba(74,222,128,.12)';
      ctx.beginPath(); ctx.moveTo(p0.ix, p0.iy); ctx.lineTo(p1.ix, p1.iy); ctx.lineTo(p2.ix, p2.iy); ctx.lineTo(p3.ix, p3.iy); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(134,239,172,.8)'; ctx.lineWidth = 2; ctx.setLineDash([10, 8]); ctx.stroke(); ctx.setLineDash([]);
      const t = c.name + ' · hide here', tw = ctx.measureText(t).width + 12;
      ctx.fillStyle = 'rgba(0,0,0,.65)'; ctx.fillRect(p0.ix + 4, p0.iy + 4, tw, 18);
      ctx.fillStyle = '#bbf7d0'; ctx.fillText(t, p0.ix + 10, p0.iy + 17);
    }
    if (W.route) {
      const [rx, ry] = W.route[0];
      if (explored[ry * MAP_W + rx]) {
        ctx.strokeStyle = 'rgba(248,113,113,.75)'; ctx.lineWidth = 4; ctx.setLineDash([4, 10]); ctx.lineCap = 'round';
        ctx.beginPath();
        W.route.forEach(([x, y], i) => {
          const { ix, iy } = toIso((x + 0.5) * TILE, (y + 0.5) * TILE);
          (i ? ctx.lineTo : ctx.moveTo).call(ctx, ix, iy);
        });
        ctx.stroke(); ctx.setLineDash([]);
        const [lx, ly] = W.route[1], lp = toIso(lx * TILE, ly * TILE), t = 'The way they will come (Alma 43:24)', tw = ctx.measureText(t).width + 12;
        ctx.fillStyle = 'rgba(0,0,0,.65)'; ctx.fillRect(lp.ix - tw / 2, lp.iy - 30, tw, 18);
        ctx.fillStyle = '#fecaca'; ctx.textAlign = 'center'; ctx.fillText(t, lp.ix, lp.iy - 17); ctx.textAlign = 'left';
      }
    }
    for (const z of W.noGo) {
      const midX = Math.floor((z.x0 + z.x1) * 0.5), midY = Math.floor((z.y0 + z.y1) * 0.5);
      if (explored[midY * MAP_W + midX]) {
        const p0 = toIso(z.x0 * TILE, z.y0 * TILE);
        const p1 = toIso((z.x1 + 1) * TILE, z.y0 * TILE);
        const p2 = toIso((z.x1 + 1) * TILE, (z.y1 + 1) * TILE);
        const p3 = toIso(z.x0 * TILE, (z.y1 + 1) * TILE);
        ctx.fillStyle = 'rgba(127,29,29,.15)';
        ctx.beginPath(); ctx.moveTo(p0.ix, p0.iy); ctx.lineTo(p1.ix, p1.iy); ctx.lineTo(p2.ix, p2.iy); ctx.lineTo(p3.ix, p3.iy); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = 'rgba(248,113,113,.75)'; ctx.lineWidth = 3; ctx.setLineDash([14, 10]); ctx.stroke(); ctx.setLineDash([]);
        const t = 'Antionum: the Zoramites\' land (Alma 43:5)', tw = ctx.measureText(t).width + 12;
        ctx.fillStyle = 'rgba(0,0,0,.65)'; ctx.fillRect(p0.ix + 6, p0.iy + 6, tw, 18);
        ctx.fillStyle = '#fecaca'; ctx.fillText(t, p0.ix + 12, p0.iy + 19);
      }
    }
    ctx.restore();
  }

  function hpBar(x, y, w, f) {
    if (f >= 1) return;
    ctx.fillStyle = 'rgba(0,0,0,.75)'; ctx.fillRect(x - w / 2 - 1, y - 1, w + 2, 5);
    ctx.fillStyle = f > 0.5 ? '#22c55e' : f > 0.25 ? '#eab308' : '#ef4444'; ctx.fillRect(x - w / 2, y, w * clamp(f, 0, 1), 3);
  }
  const radius = u => u.def.leader ? 11 : u.def.hero ? 10 : u.type === 'flock' || u.type === 'cart' ? 10 : u.type === 'stripling' || u.def.deploys ? 9 : u.def.gathers || u.type === 'villager' ? 7 : 8;

  // RA2 Isometric Corner Brackets Selection Reticle
  function drawRing(u) {
    const { ix, iy } = toIso(u.x, u.y);
    const r = radius(u);
    const col = u.def.hero ? '#fcd34d' : u.team === 'p' ? '#4ade80' : '#ef4444';
    drawIsoCorners(ix - r - 4, iy - r * 0.5 - 2, (r + 4) * 2, (r + 4) * 1.1, col);
  }
  function drawIsoCorners(x, y, w, h, color) {
    ctx.save();
    ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.beginPath();
    const b = Math.min(6, w * 0.25);
    ctx.moveTo(x, y + b); ctx.lineTo(x, y); ctx.lineTo(x + b, y);
    ctx.moveTo(x + w - b, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + b);
    ctx.moveTo(x + w, y + h - b); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w - b, y + h);
    ctx.moveTo(x + b, y + h); ctx.lineTo(x, y + h); ctx.lineTo(x, y + h - b);
    ctx.stroke();
    ctx.restore();
  }

  // Ancient American / Book of Mormon Character Sprites in 2:1 Isometric
  
  function drawUnit(u, now) {
    const d = u.def;
    const { ix, iy } = toIso(u.x, u.y);
    const r = radius(u);
    const kneel = u.kneelUntil && W.t < u.kneelUntil;
    const moving = (u.path && u.path.length > 0) || u.order.type === 'move' || u.order.type === 'gather' || u.order.type === 'return' || u.order.type === 'attack';
    const walkCycle = moving ? Math.sin(now * 0.015 + u.id) : 0;
    const bob = moving ? Math.abs(walkCycle) * 2.2 : 0;
    const x = ix, y = iy - (kneel ? -2 : 1) - bob;
    
    // Calculate direction (1 for right, -1 for left)
    let flip = 1;
    if (moving && u.path && u.path.length > 0) {
      const tx = Math.floor(u.x / TILE), ty = Math.floor(u.y / TILE);
      const nx = u.path[0][0], ny = u.path[0][1];
      // Isometric left vs right: if dx < dy it's mostly left, if dx > dy mostly right
      const dx = nx - tx, dy = ny - ty;
      if (dx - dy < 0) flip = -1;
    } else if (u.order.type === 'attack' && u.order.target) {
      const target = W.ents.get(u.order.target);
      if (target) {
        const dx = target.x - u.x, dy = target.y - u.y;
        if (dx - dy < 0) flip = -1;
      }
    }

    // Ground Drop Shadow
    ctx.fillStyle = 'rgba(0,0,0,.32)'; ctx.beginPath(); ctx.ellipse(ix + 2, iy + 2, r * 0.95, r * 0.48, 0, 0, 7); ctx.fill();

    if (u.type === 'cart') {
      ctx.save(); ctx.translate(x, y); ctx.scale(flip, 1);
      ctx.fillStyle = '#7c5a3a'; ctx.fillRect(-12, -6, 16, 12);
      ctx.strokeStyle = '#3f2a14'; ctx.lineWidth = 1.5; ctx.strokeRect(-12, -6, 16, 12);
      ctx.fillStyle = '#2b1d10'; ctx.fillRect(-10, -8, 5, 2); ctx.fillRect(-10, 6, 5, 2);
      ctx.fillStyle = '#a16207'; ctx.beginPath(); ctx.ellipse(10, 0, 7, 4, 0, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.arc(16, -1, 2.8, 0, 7); ctx.fill();
      if (u.carry && u.carry.amt) {
        ctx.fillStyle = u.carry.type === 'timber' ? '#8b5a2b' : '#ca8a04';
        ctx.fillRect(-10, -4, 12, 8);
      }
      ctx.restore();
      return;
    }
    if (u.def.deploys) {
      ctx.strokeStyle = '#451a03'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(x, y + 4); ctx.lineTo(x, y - 26); ctx.stroke();
      const wave = Math.sin(now / 180) * 2.5;
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.moveTo(x, y - 26);
      ctx.quadraticCurveTo(x + 10, y - 28 + wave, x + 20, y - 24 + wave);
      ctx.lineTo(x, y - 14);
      ctx.fill();
      ctx.strokeStyle = 'rgba(120,80,30,.7)'; ctx.lineWidth = 1;
      for (let k = 0; k < 2; k++) {
        ctx.beginPath(); ctx.moveTo(x + 3, y - 23 + k * 4); ctx.lineTo(x + 13, y - 22 + k * 4); ctx.stroke();
      }
      return;
    }
    if (u.type === 'flock') {
      ctx.fillStyle = '#f1f5f9';
      for (const [dx, dy] of [[-4, 1], [4, 1], [0, -3]]) { ctx.beginPath(); ctx.arc(x + dx, y + dy, 5, 0, 7); ctx.fill(); }
      ctx.fillStyle = '#475569'; ctx.beginPath(); ctx.arc(x + (flip===1?7:-7), y - 4, 2.6, 0, 7); ctx.fill();
      return;
    }

    const hid = W.hidden(u);
    if (hid) ctx.globalAlpha = 0.5;

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(flip, 1);

    // Marching Legs
    ctx.fillStyle = '#451a03';
    ctx.fillRect(-3 + walkCycle * 3, 2, 2.5, 6);
    ctx.fillRect(1 - walkCycle * 3, 2, 2.5, 6);

    // Torso & Quilted Cotton Armor
    let skinColor = d.foe ? '#b45309' : '#d8bd8e';
    let tunicColor = TEAM.p;
    if (d.foe) tunicColor = '#7f1d1d';
    else if (u.type === 'worker') tunicColor = '#a8814f';
    else if (d.hero) tunicColor = '#b45309';

    ctx.fillStyle = tunicColor;
    ctx.fillRect(-4, -6, 8, 8);

    // Armor & Pectoral Plates
    if (u.team === 'p' && d.soldier) {
      ctx.fillStyle = d.hero || u.type === 'stripling' ? '#f59e0b' : '#c7ae86';
      ctx.fillRect(-3, -5, 6, 5);
    }
    if (d.foe) {
      ctx.fillStyle = '#991b1b'; ctx.fillRect(-4, -1, 8, 4);
    }

    // Head, Helmet & Headband
    ctx.fillStyle = skinColor;
    ctx.beginPath(); ctx.arc(0, -10, 4, 0, 7); ctx.fill();

    if (d.hero) {
      ctx.fillStyle = '#16a34a'; ctx.fillRect(-4, -15, 8, 3);
      ctx.fillStyle = '#dc2626'; ctx.beginPath(); ctx.moveTo(-2, -15); ctx.lineTo(2, -15); ctx.lineTo(0, -22); ctx.fill();
    } else if (d.foe) {
      ctx.fillStyle = '#ef4444'; ctx.fillRect(-4, -13, 8, 2);
    } else if (u.type === 'stripling') {
      ctx.fillStyle = '#ea580c'; ctx.fillRect(-4, -13, 8, 2);
    }

    // Attack Swing
    const attacking = u.order.type === 'attack' && W.t - (u.hitAt || -99) < 0.3;
    const swing = attacking ? Math.PI / 2 : 0;

    // Weapon & Shield
    if (d.soldier) {
      ctx.save();
      // Back Arm / Shield
      if (u.team === 'p') {
        ctx.fillStyle = '#b45309';
        ctx.beginPath(); ctx.arc(-2, -2, 3.5, 0, 7); ctx.fill();
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath(); ctx.arc(-2, -2, 1.5, 0, 7); ctx.fill();
      }
      
      // Front Arm / Weapon
      ctx.translate(3, -4);
      if (attacking) ctx.rotate(swing);
      ctx.strokeStyle = '#451a03'; ctx.lineWidth = 1.5;
      
      if (u.type === 'archer' || u.type === 'slinger') {
        ctx.beginPath(); ctx.moveTo(0, -5); ctx.lineTo(0, 5); ctx.stroke();
      } else {
        ctx.beginPath(); ctx.moveTo(-2, 4); ctx.lineTo(4, -8); ctx.stroke();
        ctx.fillStyle = '#94a3b8';
        ctx.beginPath(); ctx.arc(4, -8, 2, 0, 7); ctx.fill(); // sword tip/mace
      }
      ctx.restore();
    } else if (u.type === 'worker') {
      // Pickaxe / Axe for workers
      ctx.save();
      ctx.translate(3, -4);
      if (moving && u.order.type === 'gather' && W.t - (u.hitAt||-99) < 0.3) ctx.rotate(Math.PI/2);
      ctx.strokeStyle = '#451a03'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(-2, 4); ctx.lineTo(4, -6); ctx.stroke();
      ctx.fillStyle = '#64748b';
      ctx.fillRect(2, -7, 5, 3);
      ctx.restore();
    }

    ctx.restore();
    if (hid) ctx.globalAlpha = 1;
    
    // Health bar
    if (u.hp < u.max && (sel.includes(u.id) || u.team === 'r')) {
      const pct = Math.max(0, u.hp / u.max);
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(ix - 8, iy - 22, 16, 3);
      ctx.fillStyle = u.team === 'p' ? '#4ade80' : '#f87171';
      ctx.fillRect(ix - 8, iy - 22, 16 * pct, 3);
    }
    
    // Selection Ring
    if (sel.includes(u.id)) {
      ctx.strokeStyle = '#fde047'; ctx.lineWidth = 1; ctx.setLineDash([2, 2]);
      ctx.beginPath(); ctx.ellipse(ix + 2, iy + 2, r * 1.2, r * 0.6, 0, 0, 7); ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  // Title of Liberty: the screen. Draws the world that liberty/sim.js runs,
// turns clicks and taps into orders, and runs the menus: read the chapter,
// then play its mission. Nothing here decides who wins a fight.
(function () {
  'use strict';
  const D = window.LIB_DATA, S = window.LIB_SIM, MISSIONS = window.LIB_MISSIONS.MISSIONS, CAMPAIGNS = window.LIB_MISSIONS.CAMPAIGNS, FREE = window.LIB_MISSIONS.FREE_BATTLE;
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

  // ------------------------------------------------------------ 2:1 Isometric Projection
  // Standard Westwood Red Alert 2 dimetric ratio (tile width : height = 2 : 1)
  const toIso = (wx, wy) => ({ ix: (wx - wy), iy: (wx + wy) * 0.5 });
  const fromIso = (ix, iy) => ({ x: (ix + 2 * iy) * 0.5, y: (2 * iy - ix) * 0.5 });
  const WORLD_ISO_MIN_X = -MAP_H * TILE; // -1536
  const WORLD_ISO_MAX_X = MAP_W * TILE;  // 2048
  const WORLD_ISO_MIN_Y = 0;
  const WORLD_ISO_MAX_Y = (MAP_W + MAP_H) * TILE * 0.5; // 1792
  const WORLD_ISO_W = WORLD_ISO_MAX_X - WORLD_ISO_MIN_X; // 3584
  const WORLD_ISO_H = WORLD_ISO_MAX_Y - WORLD_ISO_MIN_Y; // 1792
  const ISO_OFFSET_X = -WORLD_ISO_MIN_X; // 1536

  // ------------------------------------------------------------ canvas & camera

  const cv = $('view'), ctx = cv.getContext('2d');
  const mini = $('mini'), mctx = mini.getContext('2d');
  let dpr = 1, vw = 0, vh = 0;
  const topH = () => $('hud').offsetHeight || 0;
  const bottomH = () => (window.innerWidth >= 860 || $('panel').hidden) ? 0 : ($('panel').offsetHeight || 0);
  const rightW = () => (window.innerWidth >= 860 && !$('panel').hidden) ? ($('panel').offsetWidth || 236) : 0;

  function resize() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    vw = window.innerWidth; vh = window.innerHeight;
    cv.width = Math.round(vw * dpr); cv.height = Math.round(vh * dpr);
    cv.style.width = vw + 'px'; cv.style.height = vh + 'px';
    const mw = mini.clientWidth || 144;
    mini.width = Math.round(mw * dpr); mini.height = Math.round(mw * WORLD_ISO_H / WORLD_ISO_W * dpr);
    mini.style.height = Math.round(mw * WORLD_ISO_H / WORLD_ISO_W) + 'px';
    miniDirty = true;
    $('rotate').hidden = !(W && vw < 560 && vh > vw);
    clampCam();
  }
  function clampCam() {
    const w = (vw - rightW()) / cam.z, h = (vh - topH() - bottomH()) / cam.z;
    cam.x = clamp(cam.x, WORLD_ISO_MIN_X - 160, WORLD_ISO_MAX_X - w + 160);
    cam.y = clamp(cam.y, WORLD_ISO_MIN_Y - 80, WORLD_ISO_MAX_Y - h + 80);
  }
  const toWorld = (sx, sy) => fromIso(cam.x + sx / cam.z, cam.y + sy / cam.z);
  const toScreen = (wx, wy) => {
    const { ix, iy } = toIso(wx, wy);
    return { x: (ix - cam.x) * cam.z, y: (iy - cam.y) * cam.z };
  };
  function lookAt(wx, wy) {
    const { ix, iy } = toIso(wx, wy);
    const usableW = vw - rightW();
    const usableH = vh - topH() - bottomH();
    cam.x = ix - usableW / cam.z / 2;
    cam.y = iy - (topH() + usableH / 2) / cam.z;
    clampCam();
  }
  function zoomAt(sx, sy, z) {
    const p = toWorld(sx, sy);
    cam.z = clamp(z, 0.45, 2.2);
    const { ix, iy } = toIso(p.x, p.y);
    cam.x = ix - sx / cam.z; cam.y = iy - sy / cam.z;
    clampCam();
  }

  // ------------------------------------------------------------ Shroud of War (Westwood Fog of War)
  const shroudCv = document.createElement('canvas');
  shroudCv.width = WORLD_ISO_W; shroudCv.height = WORLD_ISO_H;
  const sctx = shroudCv.getContext('2d');
  const explored = new Uint8Array(MAP_W * MAP_H);

  function initShroud() {
    explored.fill(0);
    sctx.globalCompositeOperation = 'source-over';
    sctx.fillStyle = '#06070c'; // Westwood Pitch Black Shroud
    sctx.fillRect(0, 0, WORLD_ISO_W, WORLD_ISO_H);
    miniDirty = true;
    revealShroud();
  }

  function revealShroud() {
    if (!W) return;
    sctx.globalCompositeOperation = 'destination-out';
    const punch = (wx, wy, rad) => {
      const { ix, iy } = toIso(wx, wy);
      const cx = ix + ISO_OFFSET_X, cy = iy;
      const r = Math.max(54, rad * 1.15);
      const grad = sctx.createRadialGradient(cx, cy, r * 0.65, cx, cy, r);
      grad.addColorStop(0, 'rgba(0, 0, 0, 1)');
      grad.addColorStop(0.8, 'rgba(0, 0, 0, 0.95)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      sctx.fillStyle = grad;
      sctx.beginPath();
      sctx.arc(cx, cy, r, 0, Math.PI * 2);
      sctx.fill();

      // Mark explored tiles in map grid
      const tr = Math.ceil(rad / TILE) + 1;
      const x0 = Math.max(0, Math.floor(wx / TILE - tr));
      const x1 = Math.min(MAP_W - 1, Math.ceil(wx / TILE + tr));
      const y0 = Math.max(0, Math.floor(wy / TILE - tr));
      const y1 = Math.min(MAP_H - 1, Math.ceil(wy / TILE + tr));
      const r2 = rad * rad;
      for (let ty = y0; ty <= y1; ty++) {
        for (let tx = x0; tx <= x1; tx++) {
          const dx = (tx + 0.5) * TILE - wx, dy = (ty + 0.5) * TILE - wy;
          if (dx * dx + dy * dy <= r2) explored[ty * MAP_W + tx] = 1;
        }
      }
    };

    for (const u of W.units('p')) punch(u.x, u.y, u.def.sight || 170);
    for (const b of W.buildings('p')) {
      const bx = (b.tx + b.w * 0.5) * TILE, by = (b.ty + b.h * 0.5) * TILE;
      punch(bx, by, b.def.range ? b.def.range + 60 : 210);
    }
    miniDirty = true;
  }

  const inVision = (wx, wy) => {
    for (const u of W.units('p')) {
      if (Math.hypot(u.x - wx, u.y - wy) <= (u.def.sight || 170)) return true;
    }
    for (const b of W.buildings('p')) {
      const bx = (b.tx + b.w * 0.5) * TILE, by = (b.ty + b.h * 0.5) * TILE;
      if (Math.hypot(bx - wx, by - wy) <= (b.def.range ? b.def.range + 50 : 200)) return true;
    }
    return false;
  };

  const isVisible = e => {
    if (e.team === 'p' || e.team === 'x') return true;
    if (e.kind === 'unit') return inVision(e.x, e.y);
    const tx = Math.min(MAP_W - 1, Math.max(0, Math.floor(e.tx + e.w * 0.5)));
    const ty = Math.min(MAP_H - 1, Math.max(0, Math.floor(e.ty + e.h * 0.5)));
    return explored[ty * MAP_W + tx] === 1;
  };

  // ------------------------------------------------------------ isometric terrain

  const terrain = document.createElement('canvas');
  terrain.width = WORLD_ISO_W; terrain.height = WORLD_ISO_H;
  const tctx = terrain.getContext('2d');
  let painted = null, miniDirty = true;
  function hash(x, y, k) {
    let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(k | 0, 1442695041);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }
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
  function tileDiamond(c, x, y) {
    const top = { x: (x - y) * TILE + ISO_OFFSET_X, y: (x + y) * TILE * 0.5 };
    const right = { x: (x + 1 - y) * TILE + ISO_OFFSET_X, y: (x + 1 + y) * TILE * 0.5 };
    const bottom = { x: (x - y) * TILE + ISO_OFFSET_X, y: (x + y + 2) * TILE * 0.5 };
    const left = { x: (x - (y + 1)) * TILE + ISO_OFFSET_X, y: (x + y + 1) * TILE * 0.5 };
    c.beginPath();
    c.moveTo(top.x, top.y);
    c.lineTo(right.x, right.y);
    c.lineTo(bottom.x, bottom.y);
    c.lineTo(left.x, left.y);
    c.closePath();
    return { top, right, bottom, left, cx: top.x, cy: (top.y + bottom.y) * 0.5 };
  }
  function paintTile(x, y) {
    const c = tctx, i = y * MAP_W + x, t = W.tiles[i], a = W.amt[i], h = k => hash(x, y, k);
    const d = tileDiamond(c, x, y);

    const isLand = (tx, ty) => {
      if (tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H) return false;
      const nt = W.tiles[ty * MAP_W + tx];
      return nt !== T.WATER && nt !== T.FORD;
    };
    const nearLand = isLand(x, y - 1) || isLand(x + 1, y) || isLand(x, y + 1) || isLand(x - 1, y);

    if (t === T.GRASS) {
      // Lush tropical green grass
      c.fillStyle = '#3b7a24'; c.fill();
      // Add some subtle texture details
      for (let k = 0; k < 4; k++) {
        c.fillStyle = h(k+10) < 0.5 ? '#2d6318' : '#65a148';
        c.fillRect(d.cx - 6 + h(k+20)*12, d.cy - 3 + h(k+30)*6, 2, 2);
      }
    } else if (t === T.WATER || t === T.FORD) {
      // River Sidon: Rich deep azure/cyan gradient
      const wGrad = c.createLinearGradient(d.left.x, d.top.y, d.right.x, d.bottom.y);
      if (t === T.WATER) {
        wGrad.addColorStop(0, '#0284c7');
        wGrad.addColorStop(0.5, '#0369a1');
        wGrad.addColorStop(1, '#075985');
      } else {
        wGrad.addColorStop(0, '#38bdf8');
        wGrad.addColorStop(0.5, '#0284c7');
        wGrad.addColorStop(1, '#0ea5e9');
      }
      c.fillStyle = wGrad; c.fill();

      // Shoreline sandy beach transition if bordering land
      if (nearLand) {
        c.strokeStyle = '#c5a86d'; c.lineWidth = 3.5;
        if (isLand(x, y - 1)) { c.beginPath(); c.moveTo(d.top.x, d.top.y); c.lineTo(d.right.x, d.right.y); c.stroke(); }
        if (isLand(x - 1, y)) { c.beginPath(); c.moveTo(d.left.x, d.left.y); c.lineTo(d.top.x, d.top.y); c.stroke(); }
        if (isLand(x, y + 1)) { c.beginPath(); c.moveTo(d.left.x, d.left.y); c.lineTo(d.bottom.x, d.bottom.y); c.stroke(); }
        if (isLand(x + 1, y)) { c.beginPath(); c.moveTo(d.bottom.x, d.bottom.y); c.lineTo(d.right.x, d.right.y); c.stroke(); }
        // Water edge foam
        c.strokeStyle = 'rgba(255,255,255,.45)'; c.lineWidth = 1.2;
        if (isLand(x, y - 1)) { c.beginPath(); c.moveTo(d.top.x, d.top.y + 1); c.lineTo(d.right.x - 1, d.right.y); c.stroke(); }
        if (isLand(x - 1, y)) { c.beginPath(); c.moveTo(d.left.x + 1, d.left.y); c.lineTo(d.top.x, d.top.y + 1); c.stroke(); }
      }

      // Translucent glistening water currents
      c.strokeStyle = 'rgba(224,242,254,.38)'; c.lineWidth = 1.2;
      for (let k = 0; k < 3; k++) {
        const fx = d.cx - 10 + h(k + 30) * 20, fy = d.cy - 4 + h(k + 35) * 8;
        c.beginPath(); c.moveTo(fx - 6, fy); c.lineTo(fx + 6, fy); c.stroke();
      }

      if (t === T.FORD) {
        // Natural river stepping boulders with foaming rapids
        c.fillStyle = '#78716c';
        for (let k = 0; k < 4; k++) {
          const bx = d.cx - 10 + h(k) * 20, by = d.cy - 4 + h(k + 10) * 8;
          c.beginPath(); c.ellipse(bx, by, 3.5, 2.2, 0.2, 0, 7); c.fill();
        }
        c.fillStyle = '#a8a29e';
        for (let k = 0; k < 4; k++) {
          const bx = d.cx - 10 + h(k) * 20, by = d.cy - 5 + h(k + 10) * 8;
          c.beginPath(); c.ellipse(bx - 0.5, by - 0.5, 2, 1.2, 0.2, 0, 7); c.fill();
        }
        // White foam rapids around rocks
        c.fillStyle = 'rgba(255,255,255,.7)';
        c.fillRect(d.cx - 8, d.cy - 1, 16, 2);
        c.fillRect(d.cx - 4, d.cy + 3, 10, 1.5);
      }
    } else if (t === T.ROCK) {
      // Stratified Mountain Cliffs with rich horizontal strata
      c.fillStyle = '#292524'; c.fill();
      c.fillStyle = '#44403c'; c.fillRect(d.left.x + 4, d.cy - 7, (d.right.x - d.left.x) - 8, 5);
      c.fillStyle = '#57534e'; c.fillRect(d.left.x + 6, d.cy, (d.right.x - d.left.x) - 12, 4);
      c.fillStyle = '#78716c'; c.fillRect(d.left.x + 8, d.cy + 4, (d.right.x - d.left.x) - 16, 3);
      // Sunlit upper ridge
      c.strokeStyle = '#d6d3d1'; c.lineWidth = 1.8;
      c.beginPath(); c.moveTo(d.left.x, d.left.y); c.lineTo(d.top.x, d.top.y); c.lineTo(d.right.x, d.right.y); c.stroke();
    } else if (t === T.FOREST) {
      // Lush tropical jungle forest with rich soil and dense canopy
      c.fillStyle = '#1c3814'; c.fill();
      const n = a > 80 ? 3 : a > 35 ? 2 : 1;
      for (let k = 0; k < n; k++) {
        const tx = d.cx - 10 + h(k + 50) * 20, ty = d.cy - 6 + h(k + 60) * 12, r = 8 + h(k + 70) * 4;
        // Ground shadow
        c.fillStyle = 'rgba(0,0,0,.42)'; c.beginPath(); c.ellipse(tx + 5, ty + 7, r * 1.3, r * 0.65, 0.2, 0, 7); c.fill();
        // Buttress trunk
        c.fillStyle = '#3f1f08'; c.fillRect(tx - 2, ty - 2, 4, 8);
        // Volumetric 4-tier tropical canopy
        c.fillStyle = '#0f290d'; c.beginPath(); c.arc(tx + 1, ty - 4, r, 0, 7); c.fill();
        c.fillStyle = '#1b4a16'; c.beginPath(); c.arc(tx, ty - 5, r * 0.9, 0, 7); c.fill();
        c.fillStyle = '#2f7524'; c.beginPath(); c.arc(tx - r * 0.25, ty - 6 - r * 0.2, r * 0.65, 0, 7); c.fill();
        c.fillStyle = '#4ade80'; c.beginPath(); c.arc(tx - r * 0.4, ty - 7 - r * 0.35, r * 0.35, 0, 7); c.fill();
      }
    } else if (t === T.FIELD) {
      // Golden Tilled Grain & Corn Terrace
      c.fillStyle = '#38230e'; c.fill();
      c.fillStyle = a > 150 ? '#ca8a04' : '#92400e';
      c.beginPath();
      c.moveTo(d.top.x, d.top.y + 2); c.lineTo(d.right.x - 3, d.right.y); c.lineTo(d.bottom.x, d.bottom.y - 2); c.lineTo(d.left.x + 3, d.left.y);
      c.fill();
      // Furrow rows & Golden Stalks
      c.strokeStyle = '#facc15'; c.lineWidth = 1.4;
      for (let f = -10; f <= 10; f += 4) {
        c.beginPath();
        c.moveTo(d.cx - 12 + f, d.cy - 6 + f * 0.5);
        c.lineTo(d.cx + 12 + f, d.cy + 6 + f * 0.5);
        c.stroke();
      }
      if (a > 150) {
        c.fillStyle = '#78350f'; c.fillRect(d.left.x + 2, d.left.y - 4, 3, 7);
      }
    } else if (t === T.RUIN) {
      // Ancient carved stone foundations
      c.fillStyle = '#292524'; c.fill();
      c.fillStyle = '#57534e'; c.fillRect(d.cx - 12, d.cy - 6, 24, 12);
      c.fillStyle = '#78716c'; c.fillRect(d.cx - 12, d.cy - 6, 24, 2);
      c.fillStyle = '#15803d'; c.fillRect(d.cx - 8, d.cy, 8, 3);
    } else {
      // Lush Mesoamerican Prairie Grass: multi-hued natural soil
      const gHues = ['#2e581c', '#356321', '#3b6e26', '#447d2c', '#315c1e', '#3e7328'];
      c.fillStyle = gHues[Math.floor(h(1) * gHues.length)];
      c.fill();

      // Sunlit top edge highlight
      c.strokeStyle = 'rgba(134, 239, 172, .18)'; c.lineWidth = 1;
      c.beginPath(); c.moveTo(d.left.x, d.left.y); c.lineTo(d.top.x, d.top.y); c.lineTo(d.right.x, d.right.y); c.stroke();

      // Organic soil clods or wildflowers
      if (h(2) < 0.18) {
        // Rich earthen loam patch
        c.fillStyle = 'rgba(78, 56, 32, .35)';
        c.beginPath(); c.ellipse(d.cx - 4 + h(3) * 8, d.cy - 2 + h(4) * 4, 5, 2.5, 0.2, 0, 7); c.fill();
      }
      if (h(5) < 0.09) {
        // Wildflower dot (marigold or tropical amaranth)
        c.fillStyle = h(6) < 0.5 ? '#facc15' : '#ef4444';
        c.fillRect(d.cx - 6 + h(7) * 12, d.cy - 3 + h(8) * 6, 2, 2);
      }
    }
  }

  // ------------------------------------------------------------ particle engine

  const particles = [];
  function addSmoke(ix, iy, dark = true) {
    if (particles.length > 80) return;
    particles.push({ ix, iy, vx: (Math.random() - 0.5) * 0.4, vy: -0.7 - Math.random() * 0.6, size: 3 + Math.random() * 3, life: 0, maxLife: 40 + Math.random() * 20, dark });
  }
  function addFire(ix, iy) {
    if (particles.length > 80) return;
    particles.push({ ix: ix + (Math.random() - 0.5) * 6, iy, vx: (Math.random() - 0.5) * 0.5, vy: -1.0 - Math.random() * 0.8, size: 3 + Math.random() * 2, life: 0, maxLife: 20 });
  }
  function addSpark(ix, iy) {
    if (particles.length > 80) return;
    particles.push({ ix, iy, vx: (Math.random() - 0.5) * 2.5, vy: (Math.random() - 0.5) * 2.5 - 1, size: 1.5, life: 0, maxLife: 15, spark: true });
  }

  // ------------------------------------------------------------ drawing

  const TEAM = { p: '#1d4ed8', r: '#b91c1c' };
  function draw(now) {
    if (W.terrainDirty || !painted) paintTerrain();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#080911'; ctx.fillRect(0, 0, cv.width, cv.height);
    const z = cam.z * dpr;
    ctx.setTransform(z, 0, 0, z, -cam.x * z, -cam.y * z);
    ctx.drawImage(terrain, -ISO_OFFSET_X, 0);

    const inView = e => {
      const { ix, iy } = toIso(e.x, e.y);
      return ix > cam.x - 160 && ix < cam.x + vw / cam.z + 160 && iy > cam.y - 160 && iy < cam.y + vh / cam.z + 160;
    };
    const selSet = new Set(sel);

    drawZones();
    if (W.border != null && !W.borderOpen) drawBorder();

    // Isometric depth sorting: entities with larger (x + y) are closer to camera and drawn on top
    const isoDepth = e => e.kind === 'building' ? (e.tx + e.w * 0.5 + e.ty + e.h * 0.5) * TILE : (e.x + e.y);
    const ents = [];
    for (const e of W.ents.values()) if (inView(e) && isVisible(e)) ents.push(e);
    ents.sort((a, b) => isoDepth(a) - isoDepth(b));

    // Draw entities in depth order
    for (const e of ents) {
      if (e.kind === 'building') {
        drawBuilding(e, selSet.has(e.id), now);
      } else {
        if (selSet.has(e.id)) drawRing(e);
        drawUnit(e, now);
        if (selSet.has(e.id) || (e.hitAt && W.t - e.hitAt < 3)) {
          const { ix, iy } = toIso(e.x, e.y);
          hpBar(ix, iy - radius(e) - 18, 22, e.hp / e.def.hp);
        }
      }
    }

    // Dynamic environmental smoke & fire particles
    for (const e of ents) {
      if (e.kind === 'building') {
        const { ix, iy } = toIso(e.x, e.y);
        if (e.type === 'armory' && Math.random() < 0.25) addSmoke(ix + 6, iy - 32, false);
        if (e.type === 'warcamp' && Math.random() < 0.3) { addSmoke(ix, iy - 20, false); addFire(ix, iy - 8); }
        if (e.hp < S.maxHp(e) * 0.6 && Math.random() < 0.3) addSmoke(ix, iy - 24, true);
        if (e.hp < S.maxHp(e) * 0.3 && Math.random() < 0.4) { addSmoke(ix, iy - 28, true); addFire(ix, iy - 16); }
      }
    }

    // Render active particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life++;
      p.ix += p.vx; p.iy += p.vy;
      const alpha = 1 - p.life / p.maxLife;
      if (alpha <= 0) { particles.splice(i, 1); continue; }
      if (p.spark) {
        ctx.fillStyle = `rgba(254,240,138,${alpha})`;
        ctx.beginPath(); ctx.arc(p.ix, p.iy, p.size, 0, 7); ctx.fill();
      } else if (p.dark) {
        ctx.fillStyle = `rgba(28,25,23,${alpha * 0.65})`;
        ctx.beginPath(); ctx.arc(p.ix, p.iy, p.size, 0, 7); ctx.fill();
      } else {
        ctx.fillStyle = `rgba(249,115,22,${alpha * 0.8})`;
        ctx.beginPath(); ctx.arc(p.ix, p.iy, p.size, 0, 7); ctx.fill();
      }
    }

    drawEffects();
    drawMarkers(now);
    drawGhost();

    // Order feedback pings in isometric
    for (let i = pings.length - 1; i >= 0; i--) {
      const p = pings[i], age = (now - p.t) / 450;
      if (age > 1) { pings.splice(i, 1); continue; }
      const { ix, iy } = toIso(p.wx !== undefined ? p.wx : p.x, p.wy !== undefined ? p.wy : p.y);
      ctx.save();
      ctx.strokeStyle = p.color; ctx.globalAlpha = 1 - age; ctx.lineWidth = 2;
      if (p.type === 'attack') {
        const rad = 8 + age * 12;
        ctx.beginPath(); ctx.arc(ix, iy, rad, 0, 7); ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(ix - rad - 4, iy); ctx.lineTo(ix + rad + 4, iy);
        ctx.moveTo(ix, iy - rad - 4); ctx.lineTo(ix, iy + rad + 4);
        ctx.stroke();
      } else {
        const rad = 6 + age * 18;
        ctx.beginPath();
        ctx.moveTo(ix, iy - rad * 0.5);
        ctx.lineTo(ix + rad, iy);
        ctx.lineTo(ix, iy + rad * 0.5);
        ctx.lineTo(ix - rad, iy);
        ctx.closePath();
        ctx.stroke();
      }
      ctx.restore();
    }

    // ---------------- Westwood Shroud of War ----------------
    ctx.drawImage(shroudCv, -ISO_OFFSET_X, 0);

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
    const p0 = toIso(0, y), p1 = toIso(WORLD_W, y);
    ctx.save();
    ctx.strokeStyle = 'rgba(248,113,113,.85)'; ctx.lineWidth = 3; ctx.setLineDash([14, 10]);
    ctx.beginPath(); ctx.moveTo(p0.ix, p0.iy); ctx.lineTo(p1.ix, p1.iy); ctx.stroke();
    ctx.setLineDash([]);
    ctx.font = '700 12px Outfit, system-ui, sans-serif'; ctx.textAlign = 'center';
    for (let x = 8; x < MAP_W; x += 16) {
      const pt = toIso(x * TILE, y);
      ctx.fillStyle = 'rgba(0,0,0,.65)'; ctx.fillRect(pt.ix - 118, pt.iy - 24, 236, 18);
      ctx.fillStyle = '#fecaca'; ctx.fillText('Wilderness: wait for them to come (3 Nephi 3:21)', pt.ix, pt.iy - 11);
    }
    ctx.restore();
  }
  function drawMarkers(now) {
    const list = mission.markers ? mission.markers(W) : [];
    if (!list.length) return;
    const pulse = 0.6 + 0.4 * Math.sin(now / 250);
    ctx.font = '800 13px Outfit, system-ui, sans-serif'; ctx.textAlign = 'center';
    for (const m of list) {
      if (!explored[Math.floor(m.y) * MAP_W + Math.floor(m.x)]) continue;
      const { ix, iy } = toIso((m.x + 0.5) * TILE, (m.y + 0.5) * TILE);
      const w = ctx.measureText(m.label).width + 16;
      ctx.strokeStyle = `rgba(253,230,138,${pulse})`; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(ix, iy, 42, 21, 0, 0, 7); ctx.stroke();
      ctx.fillStyle = 'rgba(0,0,0,.65)'; ctx.fillRect(ix - w / 2, iy - 48, w, 18);
      ctx.fillStyle = '#fde68a'; ctx.fillText(m.label, ix, iy - 35);
    }
  }
  function drawZones() {
    ctx.save();
    ctx.font = '800 13px Outfit, system-ui, sans-serif'; ctx.textAlign = 'left';
    for (const c of W.cover) {
      const p0 = toIso(c.x0 * TILE, c.y0 * TILE);
      const p1 = toIso((c.x1 + 1) * TILE, c.y0 * TILE);
      const p2 = toIso((c.x1 + 1) * TILE, (c.y1 + 1) * TILE);
      const p3 = toIso(c.x0 * TILE, (c.y1 + 1) * TILE);
      ctx.fillStyle = 'rgba(74,222,128,.12)';
      ctx.beginPath(); ctx.moveTo(p0.ix, p0.iy); ctx.lineTo(p1.ix, p1.iy); ctx.lineTo(p2.ix, p2.iy); ctx.lineTo(p3.ix, p3.iy); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(134,239,172,.8)'; ctx.lineWidth = 2; ctx.setLineDash([10, 8]); ctx.stroke(); ctx.setLineDash([]);
      const t = c.name + ' · hide here', tw = ctx.measureText(t).width + 12;
      ctx.fillStyle = 'rgba(0,0,0,.65)'; ctx.fillRect(p0.ix + 4, p0.iy + 4, tw, 18);
      ctx.fillStyle = '#bbf7d0'; ctx.fillText(t, p0.ix + 10, p0.iy + 17);
    }
    if (W.route) {
      const [rx, ry] = W.route[0];
      if (explored[ry * MAP_W + rx]) {
        ctx.strokeStyle = 'rgba(248,113,113,.75)'; ctx.lineWidth = 4; ctx.setLineDash([4, 10]); ctx.lineCap = 'round';
        ctx.beginPath();
        W.route.forEach(([x, y], i) => {
          const { ix, iy } = toIso((x + 0.5) * TILE, (y + 0.5) * TILE);
          (i ? ctx.lineTo : ctx.moveTo).call(ctx, ix, iy);
        });
        ctx.stroke(); ctx.setLineDash([]);
        const [lx, ly] = W.route[1], lp = toIso(lx * TILE, ly * TILE), t = 'The way they will come (Alma 43:24)', tw = ctx.measureText(t).width + 12;
        ctx.fillStyle = 'rgba(0,0,0,.65)'; ctx.fillRect(lp.ix - tw / 2, lp.iy - 30, tw, 18);
        ctx.fillStyle = '#fecaca'; ctx.textAlign = 'center'; ctx.fillText(t, lp.ix, lp.iy - 17); ctx.textAlign = 'left';
      }
    }
    for (const z of W.noGo) {
      const midX = Math.floor((z.x0 + z.x1) * 0.5), midY = Math.floor((z.y0 + z.y1) * 0.5);
      if (explored[midY * MAP_W + midX]) {
        const p0 = toIso(z.x0 * TILE, z.y0 * TILE);
        const p1 = toIso((z.x1 + 1) * TILE, z.y0 * TILE);
        const p2 = toIso((z.x1 + 1) * TILE, (z.y1 + 1) * TILE);
        const p3 = toIso(z.x0 * TILE, (z.y1 + 1) * TILE);
        ctx.fillStyle = 'rgba(127,29,29,.15)';
        ctx.beginPath(); ctx.moveTo(p0.ix, p0.iy); ctx.lineTo(p1.ix, p1.iy); ctx.lineTo(p2.ix, p2.iy); ctx.lineTo(p3.ix, p3.iy); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = 'rgba(248,113,113,.75)'; ctx.lineWidth = 3; ctx.setLineDash([14, 10]); ctx.stroke(); ctx.setLineDash([]);
        const t = 'Antionum: the Zoramites\' land (Alma 43:5)', tw = ctx.measureText(t).width + 12;
        ctx.fillStyle = 'rgba(0,0,0,.65)'; ctx.fillRect(p0.ix + 6, p0.iy + 6, tw, 18);
        ctx.fillStyle = '#fecaca'; ctx.fillText(t, p0.ix + 12, p0.iy + 19);
      }
    }
    ctx.restore();
  }

  function hpBar(x, y, w, f) {
    if (f >= 1) return;
    ctx.fillStyle = 'rgba(0,0,0,.75)'; ctx.fillRect(x - w / 2 - 1, y - 1, w + 2, 5);
    ctx.fillStyle = f > 0.5 ? '#22c55e' : f > 0.25 ? '#eab308' : '#ef4444'; ctx.fillRect(x - w / 2, y, w * clamp(f, 0, 1), 3);
  }
  const radius = u => u.def.leader ? 11 : u.def.hero ? 10 : u.type === 'flock' || u.type === 'cart' ? 10 : u.type === 'stripling' || u.def.deploys ? 9 : u.def.gathers || u.type === 'villager' ? 7 : 8;

  // RA2 Isometric Corner Brackets Selection Reticle
  function drawRing(u) {
    const { ix, iy } = toIso(u.x, u.y);
    const r = radius(u);
    const col = u.def.hero ? '#fcd34d' : u.team === 'p' ? '#4ade80' : '#ef4444';
    drawIsoCorners(ix - r - 4, iy - r * 0.5 - 2, (r + 4) * 2, (r + 4) * 1.1, col);
  }
  function drawIsoCorners(x, y, w, h, color) {
    ctx.save();
    ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.beginPath();
    const b = Math.min(6, w * 0.25);
    ctx.moveTo(x, y + b); ctx.lineTo(x, y); ctx.lineTo(x + b, y);
    ctx.moveTo(x + w - b, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + b);
    ctx.moveTo(x + w, y + h - b); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w - b, y + h);
    ctx.moveTo(x + b, y + h); ctx.lineTo(x, y + h); ctx.lineTo(x, y + h - b);
    ctx.stroke();
    ctx.restore();
  }

  // Ancient American / Book of Mormon Character Sprites in 2:1 Isometric
  function drawUnit(u, now) {
    const d = u.def;
    const { ix, iy } = toIso(u.x, u.y);
    const r = radius(u);
    const kneel = u.kneelUntil && W.t < u.kneelUntil;
    const moving = (u.path && u.path.length > 0) || u.order.type === 'move' || u.order.type === 'gather' || u.order.type === 'return';
    const walkCycle = moving ? Math.sin(now * 0.015 + u.id) : 0;
    const bob = Math.abs(walkCycle) * 2.2;
    const x = ix, y = iy - (kneel ? -2 : 1) - bob;

    // Ground Drop Shadow
    ctx.fillStyle = 'rgba(0,0,0,.32)'; ctx.beginPath(); ctx.ellipse(ix + 2, iy + 2, r * 0.95, r * 0.48, 0, 0, 7); ctx.fill();

    if (u.type === 'cart') {
      // 2-Wheeled Wooden Horse Cart Harvester
      ctx.save(); ctx.translate(x, y);
      ctx.fillStyle = '#7c5a3a'; ctx.fillRect(-12, -6, 16, 12);
      ctx.strokeStyle = '#3f2a14'; ctx.lineWidth = 1.5; ctx.strokeRect(-12, -6, 16, 12);
      // Wheels
      ctx.fillStyle = '#2b1d10'; ctx.fillRect(-10, -8, 5, 2); ctx.fillRect(-10, 6, 5, 2);
      // Trotting Horse with mane
      ctx.fillStyle = '#a16207'; ctx.beginPath(); ctx.ellipse(10, 0, 7, 4, 0, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.arc(16, -1, 2.8, 0, 7); ctx.fill();
      if (u.carry && u.carry.amt) {
        ctx.fillStyle = u.carry.type === 'timber' ? '#8b5a2b' : '#ca8a04';
        ctx.fillRect(-10, -4, 12, 8); // loaded sacks/timber
      }
      ctx.restore();
      return;
    }
    if (u.def.deploys) {
      // Moroni's Title of Liberty: piece of his coat on a tall pole (Alma 46:12–13)
      ctx.strokeStyle = '#451a03'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(x, y + 4); ctx.lineTo(x, y - 26); ctx.stroke();
      const wave = Math.sin(now / 180) * 2.5;
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.moveTo(x, y - 26);
      ctx.quadraticCurveTo(x + 10, y - 28 + wave, x + 20, y - 24 + wave);
      ctx.lineTo(x, y - 14);
      ctx.fill();
      // Scripture writing strokes
      ctx.strokeStyle = 'rgba(120,80,30,.7)'; ctx.lineWidth = 1;
      for (let k = 0; k < 2; k++) {
        ctx.beginPath(); ctx.moveTo(x + 3, y - 23 + k * 4); ctx.lineTo(x + 13, y - 22 + k * 4); ctx.stroke();
      }
    }
    if (u.type === 'flock') {
      ctx.fillStyle = '#f1f5f9';
      for (const [dx, dy] of [[-4, 1], [4, 1], [0, -3]]) { ctx.beginPath(); ctx.arc(x + dx, y + dy, 5, 0, 7); ctx.fill(); }
      ctx.fillStyle = '#475569'; ctx.beginPath(); ctx.arc(x + 7, y - 4, 2.6, 0, 7); ctx.fill();
      return;
    }

    const hid = W.hidden(u);
    if (hid) ctx.globalAlpha = 0.5;

    // Marching Legs
    ctx.fillStyle = '#451a03';
    ctx.fillRect(x - 3 + walkCycle * 2, y + 2, 2.5, 6);
    ctx.fillRect(x + 1 - walkCycle * 2, y + 2, 2.5, 6);

    // Torso & Quilted Cotton Armor
    let skinColor = d.foe ? '#b45309' : '#d8bd8e';
    let tunicColor = TEAM.p;
    if (d.foe) tunicColor = '#7f1d1d';
    else if (u.type === 'worker') tunicColor = '#a8814f';
    else if (d.hero) tunicColor = '#b45309';

    ctx.fillStyle = tunicColor;
    ctx.fillRect(x - 4, y - 6, 8, 8);

    // Armor & Pectoral Plates
    if (u.team === 'p' && d.soldier) {
      ctx.fillStyle = d.hero || u.type === 'stripling' ? '#f59e0b' : '#c7ae86'; // bronze or quilted armor
      ctx.fillRect(x - 3, y - 5, 6, 5);
    }
    if (d.foe) {
      // Blood-dyed lambskin loins & body paint (3 Nephi 4:7 / Alma 43:20)
      ctx.fillStyle = '#991b1b'; ctx.fillRect(x - 4, y - 1, 8, 4);
    }

    // Head, Helmet & Headband
    ctx.fillStyle = skinColor;
    ctx.beginPath(); ctx.arc(x, y - 10, 4, 0, 7); ctx.fill();

    // Ancient feathered headdress / headbands
    if (d.hero) {
      // Moroni / Gidgiddoni Quetzal feather plumes & cape
      ctx.fillStyle = '#10b981'; ctx.fillRect(x - 2, y - 15, 2, 4);
      ctx.fillStyle = '#ef4444'; ctx.fillRect(x, y - 16, 2, 5);
      // Crimson commander cape
      const capeWave = Math.sin(now * 0.01) * 3;
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.moveTo(x - 3, y - 5);
      ctx.quadraticCurveTo(x - 8, y + capeWave, x - 11, y + 6 + capeWave);
      ctx.lineTo(x - 3, y + 3);
      ctx.fill();
    } else if (u.type === 'stripling') {
      // White and gold woven headband
      ctx.fillStyle = '#fef08a'; ctx.fillRect(x - 4, y - 12, 8, 2);
    } else if (d.foe && d.leader) {
      // Horned bone headplate
      ctx.fillStyle = '#e2e8f0'; ctx.fillRect(x - 5, y - 13, 10, 3);
    }

    // Weapon & Shield pointing with u.face
    if (d.dmg && !kneel && u.team !== 'x') {
      const f = u.face || 0, cx = Math.cos(f), cy = Math.sin(f);
      // Shield on left arm
      if (u.team === 'p' && d.soldier && !d.ranged) {
        ctx.fillStyle = '#ca8a04';
        ctx.beginPath(); ctx.arc(x - cx * 4 - 3, y - cy * 2, 4.5, 0, 7); ctx.fill();
        ctx.strokeStyle = '#1d4ed8'; ctx.lineWidth = 1; ctx.stroke();
      }
      // Weapon on right hand
      ctx.strokeStyle = d.foe ? '#18181b' : '#e2e8f0'; ctx.lineWidth = 1.8;
      if (u.type === 'swordsman' || (d.foe && !d.ranged)) {
        // Curved cimeter / obsidian macuahuitl
        ctx.beginPath(); ctx.moveTo(x + cx * 2, y + cy * 2); ctx.lineTo(x + cx * 10, y + cy * 10 - 4); ctx.stroke();
      } else if (u.type === 'javelin') {
        // Atlatl dart
        ctx.beginPath(); ctx.moveTo(x - cx * 2, y - cy * 2); ctx.lineTo(x + cx * 12, y + cy * 12 - 6); ctx.stroke();
      } else {
        // Spear
        ctx.beginPath(); ctx.moveTo(x + cx * 2, y + cy * 2); ctx.lineTo(x + cx * 11, y + cy * 11 - 8); ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x + cx * 11, y + cy * 11 - 8, 1.5, 0, 7); ctx.fill();
      }
    }

    if (u.carry && u.carry.amt) {
      ctx.fillStyle = u.carry.type === 'timber' ? '#8b5a2b' : '#ca8a04';
      ctx.fillRect(x - 3, y - 14, 6, 6); // backpack pack
    }
    if (d.leader || d.hero || d.prophet) {
      ctx.font = '700 10px Outfit, system-ui, sans-serif'; ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(0,0,0,.65)'; const tw = ctx.measureText(d.name).width + 8; ctx.fillRect(x - tw / 2, y + 9, tw, 13);
      ctx.fillStyle = d.foe ? '#fecaca' : '#fde68a'; ctx.fillText(d.name, x, y + 19);
    }
    if (hid) ctx.globalAlpha = 1;
  }

  // 2.5D Isometric Buildings with South-East Cast Shadows & Architectural Detail
  function drawBuilding(b, selected, now) {
    const { ix, iy } = toIso(b.x, b.y);
    const w = b.w * TILE, h = b.h * TILE;
    ctx.save();
    if (b.built < 1) ctx.globalAlpha = 0.55;

    // South-East Cast Ground Shadow
    ctx.fillStyle = 'rgba(0,0,0,.38)';
    ctx.beginPath();
    ctx.ellipse(ix + b.w * 8, iy + b.h * 4, b.w * 18, b.h * 10, 0.2, 0, 7);
    ctx.fill();

    switch (b.type) {
      case 'stronghold': {
        // Monumental Zarahemla Stone Fortress / Citadel
        const elev = 52;
        // Foundation & Tier 1 (Sloping Limestone Walls)
        ctx.fillStyle = '#786445';
        ctx.beginPath(); ctx.moveTo(ix, iy + 16); ctx.lineTo(ix + 46, iy - 8); ctx.lineTo(ix + 46, iy - 8 - elev); ctx.lineTo(ix, iy + 16 - elev); ctx.fill();
        ctx.fillStyle = '#a8926b';
        ctx.beginPath(); ctx.moveTo(ix, iy + 16); ctx.lineTo(ix - 46, iy - 8); ctx.lineTo(ix - 46, iy - 8 - elev); ctx.lineTo(ix, iy + 16 - elev); ctx.fill();
        // Red and Gold Carved Cornice Frieze
        ctx.fillStyle = '#991b1b';
        ctx.beginPath(); ctx.moveTo(ix, iy + 16 - elev); ctx.lineTo(ix + 46, iy - 8 - elev); ctx.lineTo(ix + 46, iy - 12 - elev); ctx.lineTo(ix, iy + 12 - elev); ctx.fill();
        ctx.beginPath(); ctx.moveTo(ix, iy + 16 - elev); ctx.lineTo(ix - 46, iy - 8 - elev); ctx.lineTo(ix - 46, iy - 12 - elev); ctx.lineTo(ix, iy + 12 - elev); ctx.fill();
        ctx.fillStyle = '#d97706'; ctx.fillRect(ix - 40, iy - 10 - elev, 80, 2);
        // Tier 2 Flat Parapet
        ctx.fillStyle = '#cfbe95';
        ctx.beginPath(); ctx.moveTo(ix, iy + 12 - elev); ctx.lineTo(ix + 46, iy - 12 - elev); ctx.lineTo(ix, iy - 32 - elev); ctx.lineTo(ix - 46, iy - 12 - elev); ctx.fill();
        // Grand Central Stone Staircase
        ctx.fillStyle = '#574833';
        ctx.beginPath(); ctx.moveTo(ix - 12, iy + 16); ctx.lineTo(ix + 12, iy + 16); ctx.lineTo(ix + 10, iy + 16 - elev); ctx.lineTo(ix - 10, iy + 16 - elev); ctx.fill();
        ctx.fillStyle = '#cfbe95';
        for (let s = 0; s < 7; s++) ctx.fillRect(ix - 10 + s * 0.3, iy + 14 - s * (elev / 7), 20 - s * 0.6, 2);
        // Central Keep Tower / Council Room
        ctx.fillStyle = '#bfa97c'; ctx.fillRect(ix - 18, iy - 42 - elev, 36, 28);
        ctx.fillStyle = '#e5d5ad'; ctx.fillRect(ix - 16, iy - 44 - elev, 32, 4); // cornice
        // Twin Flaming Stone Fire Altars
        [-24, 24].forEach(bx => {
          ctx.fillStyle = '#574833'; ctx.fillRect(ix + bx - 4, iy - 14 - elev, 8, 8);
          ctx.fillStyle = '#f97316'; ctx.beginPath(); ctx.arc(ix + bx, iy - 16 - elev, 4 + Math.sin(now / 110 + bx) * 1.5, 0, 7); ctx.fill();
          ctx.fillStyle = '#fef08a'; ctx.beginPath(); ctx.arc(ix + bx, iy - 17 - elev, 2, 0, 7); ctx.fill();
        });
        // Title of Liberty Banner
        ctx.strokeStyle = '#451a03'; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(ix, iy - 44 - elev); ctx.lineTo(ix, iy - 78 - elev); ctx.stroke();
        const wave = Math.sin(now / 160) * 3;
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.moveTo(ix, iy - 78 - elev);
        ctx.quadraticCurveTo(ix + 12, iy - 82 - elev + wave, ix + 26, iy - 76 - elev + wave);
        ctx.lineTo(ix + 26, iy - 62 - elev + wave);
        ctx.lineTo(ix, iy - 64 - elev);
        ctx.fill();
        // Coat writing strokes
        ctx.strokeStyle = 'rgba(120,60,10,.8)'; ctx.lineWidth = 1;
        for (let k = 0; k < 3; k++) {
          ctx.beginPath(); ctx.moveTo(ix + 4, iy - 74 - elev + k * 4); ctx.lineTo(ix + 18, iy - 73 - elev + k * 4); ctx.stroke();
        }
        // Citadel Name Badge
        label(b.name || b.def.name, ix, iy + 26, '#fde68a');
        break;
      }
      case 'hall': {
        // Red-and-Ochre Stepped Temple Pyramid (Hall of the Captains)
        const steps = [
          { col: '#991b1b', topCol: '#b91c1c', w: 54, h: 28, yOff: 0 },
          { col: '#b45309', topCol: '#d97706', w: 42, h: 22, yOff: 12 },
          { col: '#991b1b', topCol: '#b91c1c', w: 30, h: 16, yOff: 24 }
        ];
        steps.forEach(st => {
          ctx.fillStyle = st.col;
          ctx.fillRect(ix - st.w / 2, iy - st.h / 2 - st.yOff, st.w, st.h);
          ctx.fillStyle = st.topCol;
          ctx.fillRect(ix - st.w / 2 + 2, iy - st.h / 2 - st.yOff, st.w - 4, 3);
        });
        // Central Steep Temple Staircase
        ctx.fillStyle = '#451a03';
        ctx.beginPath(); ctx.moveTo(ix - 7, iy + 14); ctx.lineTo(ix + 7, iy + 14); ctx.lineTo(ix + 5, iy - 32); ctx.lineTo(ix - 5, iy - 32); ctx.fill();
        ctx.fillStyle = '#fde68a';
        for (let s = 0; s < 6; s++) ctx.fillRect(ix - 5, iy + 12 - s * 7, 10, 1.5);
        // Top Temple Sanctuary with Turquoise Lintel
        ctx.fillStyle = '#d97706'; ctx.fillRect(ix - 10, iy - 42, 20, 14);
        ctx.fillStyle = '#06b6d4'; ctx.fillRect(ix - 12, iy - 44, 24, 3); // turquoise lintel
        ctx.fillStyle = '#1c1917'; ctx.fillRect(ix - 4, iy - 36, 8, 8); // doorway
        // Altar Brazier
        ctx.fillStyle = '#f97316'; ctx.beginPath(); ctx.arc(ix, iy - 46, 3 + Math.sin(now / 100) * 1.5, 0, 7); ctx.fill();
        label(b.def.name, ix, iy + 26, '#fde68a');
        break;
      }
      case 'tower': {
        // Authentic Captain Moroni Watchtower: Earthen mound, timber pickets, 4-post tower & thatched roof
        const elev = 48;
        // Earthen Rampart Mound
        ctx.fillStyle = '#6f5134'; ctx.beginPath(); ctx.ellipse(ix, iy, 22, 12, 0, 0, 7); ctx.fill();
        // Ring of Sharpened Wooden Pickets
        ctx.fillStyle = '#a27a4d';
        for (let a = 0; a < 8; a++) {
          const px = ix + Math.cos(a * 0.8) * 18, py = iy + Math.sin(a * 0.8) * 9 - 3;
          ctx.fillRect(px - 1.5, py - 6, 3, 8);
        }
        // 4 Timber Posts with Cross Braces
        ctx.fillStyle = '#451a03';
        ctx.fillRect(ix - 8, iy - 6 - elev, 3, elev);
        ctx.fillRect(ix + 5, iy - 6 - elev, 3, elev);
        ctx.fillRect(ix - 5, iy - 2 - elev, 2.5, elev);
        ctx.fillRect(ix + 2, iy - 2 - elev, 2.5, elev);
        // Timber Platform Deck
        ctx.fillStyle = '#78350f'; ctx.fillRect(ix - 12, iy - 8 - elev, 24, 5);
        // Rope Ladder
        ctx.strokeStyle = '#b45309'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(ix - 2, iy - 5 - elev); ctx.lineTo(ix - 2, iy); ctx.stroke();
        // Thatched Pyramid Canopy
        ctx.fillStyle = '#ca8a04';
        ctx.beginPath(); ctx.moveTo(ix - 14, iy - 10 - elev); ctx.lineTo(ix, iy - 26 - elev); ctx.lineTo(ix + 14, iy - 10 - elev); ctx.fill();
        ctx.strokeStyle = '#854d0e'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(ix - 14, iy - 10 - elev); ctx.lineTo(ix, iy - 26 - elev); ctx.lineTo(ix + 14, iy - 10 - elev); ctx.stroke();
        // Warning Signal Torch / Brazier
        ctx.fillStyle = '#f97316'; ctx.beginPath(); ctx.arc(ix, iy - 12 - elev, 3 + Math.sin(now / 100) * 1.5, 0, 7); ctx.fill();
        break;
      }
      case 'armory': {
        // Helaman 3 Cement House: Smooth lime cement walls, stone battlements, forge embers
        const elev = 26;
        // White Hydraulic Cement Body
        ctx.fillStyle = '#d6d3d1'; ctx.fillRect(ix - 22, iy - elev, 44, elev);
        ctx.fillStyle = '#e7e5e4'; ctx.fillRect(ix - 24, iy - elev - 2, 48, 4); // cornice
        // Roof Battlements
        ctx.fillStyle = '#a8a29e';
        for (let b0 = -20; b0 <= 16; b0 += 9) ctx.fillRect(ix + b0, iy - elev - 6, 5, 5);
        // Red Painted Geometric Lintel
        ctx.fillStyle = '#991b1b'; ctx.fillRect(ix - 8, iy - 16, 16, 3);
        // Open Arched Doorway with Glowing Forge Fire
        ctx.fillStyle = '#1c1917'; ctx.fillRect(ix - 6, iy - 13, 12, 14);
        ctx.fillStyle = '#ea580c'; ctx.beginPath(); ctx.arc(ix, iy - 5, 4 + Math.sin(now / 90) * 1.5, 0, 7); ctx.fill();
        // Outside Stone Anvil & Weapon Chest
        ctx.fillStyle = '#44403c'; ctx.fillRect(ix + 14, iy - 6, 7, 6);
        label(b.def.name, ix, iy + 16, '#fde68a');
        break;
      }
      case 'storehouse':
      case 'village': {
        // Raised Platform Thatched Dwelling / Granary
        const elev = 22;
        // Limestone Raised Basal Platform
        ctx.fillStyle = '#78716c'; ctx.fillRect(ix - 20, iy - 4, 40, 8);
        ctx.fillStyle = '#a8a29e'; ctx.fillRect(ix - 18, iy - 6, 36, 3);
        // White Stucco Walls
        ctx.fillStyle = '#f5f5f4'; ctx.fillRect(ix - 16, iy - elev, 32, elev - 4);
        // Corner Timber Posts
        ctx.fillStyle = '#573010'; ctx.fillRect(ix - 17, iy - elev, 3, elev); ctx.fillRect(ix + 14, iy - elev, 3, elev);
        // Steep Textured Thatch Roof (Palm fronds)
        ctx.fillStyle = '#ca8a04';
        ctx.beginPath(); ctx.moveTo(ix - 22, iy - elev + 2); ctx.lineTo(ix, iy - elev - 18); ctx.lineTo(ix + 22, iy - elev + 2); ctx.fill();
        ctx.strokeStyle = '#854d0e'; ctx.lineWidth = 1;
        for (let l = 0; l < 4; l++) {
          ctx.beginPath(); ctx.moveTo(ix - 18 + l * 4, iy - elev + 2 - l * 4); ctx.lineTo(ix + 18 - l * 4, iy - elev + 2 - l * 4); ctx.stroke();
        }
        // Doorway
        ctx.fillStyle = '#1c1917'; ctx.fillRect(ix - 4, iy - 10, 8, 8);
        if (b.type === 'village') label(b.name, ix, iy + 16, '#bbf7d0');
        break;
      }
      case 'barracks': {
        // Fortified Timber Log Palisade & Warrior Training Ring
        const elev = 24;
        ctx.fillStyle = '#52341b'; ctx.fillRect(ix - 24, iy - elev, 48, elev);
        // Log palisade posts
        ctx.fillStyle = '#784620';
        for (let p0 = -22; p0 <= 18; p0 += 6) ctx.fillRect(ix + p0, iy - elev - 4, 4, elev + 4);
        // Thatched warrior pavilion
        ctx.fillStyle = '#a16207';
        ctx.beginPath(); ctx.moveTo(ix - 18, iy - elev); ctx.lineTo(ix, iy - elev - 14); ctx.lineTo(ix + 18, iy - elev); ctx.fill();
        // Weapon racks & shield banner
        ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(ix + 12, iy - 6); ctx.lineTo(ix + 12, iy - 16); ctx.stroke();
        ctx.fillStyle = '#3b8226'; ctx.beginPath(); ctx.arc(ix + 12, iy - 11, 3.5, 0, 7); ctx.fill();
        label(b.def.name, ix, iy + 16, '#fde68a');
        break;
      }
      case 'farm': {
        // Irrigated Maize Terrace & Thatched Shed
        ctx.fillStyle = '#3f2812'; ctx.fillRect(ix - 20, iy - 12, 40, 18);
        // Stone irrigation canal
        ctx.fillStyle = '#0284c7'; ctx.fillRect(ix - 18, iy - 4, 36, 3);
        // Corn stalks
        ctx.fillStyle = '#ca8a04';
        for (let c0 = -16; c0 <= 16; c0 += 5) ctx.fillRect(ix + c0, iy - 14, 2, 8);
        ctx.fillStyle = '#15803d';
        for (let c0 = -16; c0 <= 16; c0 += 5) ctx.fillRect(ix + c0 - 1, iy - 12, 4, 2);
        // Thatched work shed
        ctx.fillStyle = '#854d0e'; ctx.fillRect(ix + 8, iy - 22, 14, 12);
        ctx.fillStyle = '#ca8a04';
        ctx.beginPath(); ctx.moveTo(ix + 6, iy - 22); ctx.lineTo(ix + 15, iy - 30); ctx.lineTo(ix + 24, iy - 22); ctx.fill();
        break;
      }
      case 'granary': {
        // Stucco cylindrical grain silo with conical thatch roof
        ctx.fillStyle = '#e7e5e4'; ctx.beginPath(); ctx.arc(ix, iy - 8, 16, 0, 7); ctx.fill();
        ctx.strokeStyle = '#a8a29e'; ctx.lineWidth = 2; ctx.stroke();
        // Conical thatch cap
        ctx.fillStyle = '#ca8a04'; ctx.beginPath(); ctx.moveTo(ix - 18, iy - 8); ctx.lineTo(ix, iy - 26); ctx.lineTo(ix + 18, iy - 8); ctx.fill();
        ctx.strokeStyle = '#854d0e'; ctx.lineWidth = 1;
        ctx.stroke();
        break;
      }
      case 'stables': {
        // Enclosed corral with timber fences and horse shelter
        ctx.strokeStyle = '#784620'; ctx.lineWidth = 2; ctx.strokeRect(ix - 22, iy - 14, 44, 24);
        ctx.fillStyle = '#ca8a04'; ctx.fillRect(ix - 18, iy - 20, 20, 8); // roof
        ctx.fillStyle = '#a16207'; ctx.beginPath(); ctx.ellipse(ix + 4, iy - 4, 9, 5, 0, 0, 7); ctx.fill(); // horse
        break;
      }
      case 'warcamp':
      case 'camp': {
        // Heavy Spiked Log Palisade & Hide War Pavilions with Roaring Fire
        ctx.strokeStyle = '#3f200c'; ctx.lineWidth = 3.5;
        ctx.strokeRect(ix - 34, iy - 18, 68, 36);
        // Spiked stake tops
        ctx.fillStyle = '#78350f';
        for (let s0 = -32; s0 <= 30; s0 += 7) ctx.fillRect(ix + s0, iy - 22, 3, 6);
        // Red-and-black war lodge
        ctx.fillStyle = '#7f1d1d';
        ctx.beginPath(); ctx.moveTo(ix - 20, iy + 6); ctx.lineTo(ix, iy - 22); ctx.lineTo(ix + 20, iy + 6); ctx.fill();
        // Bone totem / horns
        ctx.strokeStyle = '#f1f5f9'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(ix - 4, iy - 22); ctx.lineTo(ix, iy - 26); ctx.lineTo(ix + 4, iy - 22); ctx.stroke();
        // Roaring Central Bonfire
        ctx.fillStyle = '#ea580c'; ctx.beginPath(); ctx.arc(ix, iy + 2, 7 + Math.sin(now / 80) * 2, 0, 7); ctx.fill();
        ctx.fillStyle = '#fef08a'; ctx.beginPath(); ctx.arc(ix, iy, 4 + Math.sin(now / 90) * 1.5, 0, 7); ctx.fill();
        label(b.def.name, ix, iy + 26, '#fecaca');
        break;
      }
      case 'wall':
      case 'gate': {
        // Alma 50:1–3 Earthen rampart topped with wooden timber pickets
        ctx.fillStyle = '#5c4028'; ctx.fillRect(ix - 12, iy - 6, 24, 12);
        ctx.fillStyle = '#8f5c2c';
        for (let k = 0; k < 4; k++) ctx.fillRect(ix - 9 + k * 6, iy - 14, 3, 9); // Pointed pickets
        if (b.type === 'gate') {
          ctx.fillStyle = '#b45309'; ctx.fillRect(ix - 6, iy - 10, 12, 16); // Reinforced gate door
          ctx.fillStyle = '#1c1917'; ctx.fillRect(ix - 2, iy - 2, 4, 4);
        }
        break;
      }
      default: {
        ctx.fillStyle = '#78716c'; ctx.fillRect(ix - 16, iy - 16, 32, 24);
        break;
      }
    }
    ctx.restore();

    // Selection Corners
    if (selected) {
      drawIsoCorners(ix - w * 0.45, iy - h * 0.35, w * 0.9, h * 0.7, '#4ade80');
    }
    if (b.built < 1) {
      ctx.fillStyle = 'rgba(0,0,0,.7)'; ctx.fillRect(ix - 20, iy - 4, 40, 6);
      ctx.fillStyle = '#fcd34d'; ctx.fillRect(ix - 19, iy - 3, 38 * b.built, 4);
    } else if (b.def.hp < 99999 && (selected || b.hp < S.maxHp(b))) {
      hpBar(ix, iy - 36, 44, b.hp / S.maxHp(b));
    }
  }

  function label(text, x, y, color) {
    ctx.font = '700 11px Outfit, system-ui, sans-serif'; ctx.textAlign = 'center';
    const w = ctx.measureText(text).width + 10;
    ctx.fillStyle = 'rgba(0,0,0,.65)'; ctx.fillRect(x - w / 2, y - 10, w, 14);
    ctx.fillStyle = color; ctx.fillText(text, x, y + 1);
  }

  // Ballistic 3D Parabolic Projectiles with Grounded Shadows
  function drawEffects() {
    for (const f of W.effects) {
      const p = clamp((W.t - f.t) / 0.35, 0, 1);
      const p0 = toIso(f.x0, f.y0), p1 = toIso(f.x1, f.y1);
      const gx = p0.ix + (p1.ix - p0.ix) * p;
      const gy = p0.iy + (p1.iy - p0.iy) * p;

      if (f.kind === 'arrow') {
        const dist = Math.hypot(p1.ix - p0.ix, p1.iy - p0.iy);
        const maxH = Math.min(42, dist * 0.28);
        const h = Math.sin(p * Math.PI) * maxH;
        // Ground Shadow
        ctx.fillStyle = `rgba(0,0,0,${0.35 * (1 - h / 50)})`;
        ctx.beginPath(); ctx.ellipse(gx, gy, 4, 2, 0, 0, 7); ctx.fill();
        // Flying Arrow
        const ax = gx, ay = gy - h;
        const angle = Math.atan2((p1.iy - p0.iy) - Math.cos(p * Math.PI) * maxH * 0.05, p1.ix - p0.ix);
        ctx.strokeStyle = f.team === 'r' ? '#fca5a5' : '#fef08a'; ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(ax - Math.cos(angle) * 7, ay - Math.sin(angle) * 7);
        ctx.lineTo(ax, ay);
        ctx.stroke();
      } else {
        // Hit Impact Spark & Dust
        ctx.fillStyle = `rgba(255,255,255,${0.8 * (1 - p)})`;
        ctx.beginPath(); ctx.arc(gx, gy, 4 + p * 5, 0, 7); ctx.fill();
        if (Math.random() < 0.4) addSpark(gx, gy);
      }
    }
  }

  // Where a building would go: green if it fits, red if not (Isometric Diamond Ghost)
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
      for (let dy = 0; dy < def.h; dy++) {
        for (let dx = 0; dx < def.w; dx++) {
          const tx = x + dx, ty = y + dy;
          const top = toIso(tx * TILE, ty * TILE);
          const right = toIso((tx + 1) * TILE, ty * TILE);
          const bottom = toIso((tx + 1) * TILE, (ty + 1) * TILE);
          const left = toIso(tx * TILE, (ty + 1) * TILE);
          ctx.beginPath();
          ctx.moveTo(top.ix, top.iy); ctx.lineTo(right.ix, right.iy); ctx.lineTo(bottom.ix, bottom.iy); ctx.lineTo(left.ix, left.iy); ctx.closePath();
          ctx.fillStyle = ok ? 'rgba(74,222,128,.4)' : 'rgba(248,113,113,.45)'; ctx.fill();
          ctx.strokeStyle = ok ? '#4ade80' : '#f87171'; ctx.lineWidth = 1.5; ctx.stroke();
        }
      }
    }
    if (def.range && spots.length) {
      const [x, y] = spots[0];
      const { ix, iy } = toIso((x + def.w / 2) * TILE, (y + def.h / 2) * TILE);
      ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.setLineDash([6, 6]);
      ctx.beginPath(); ctx.ellipse(ix, iy, def.range, def.range * 0.5, 0, 0, 7); ctx.stroke(); ctx.setLineDash([]);
    }
  }
  const topLeft = (type, wx, wy) => { const d = BUILDINGS[type]; return [tileOf(wx) - Math.floor((d.w - 1) / 2), tileOf(wy) - Math.floor((d.h - 1) / 2)]; };

  // ------------------------------------------------------------ Westwood Radar Minimap

  const miniTerrain = document.createElement('canvas');
  let miniAt = 0;
  function drawMini() {
    const mw = mini.width, mh = mini.height;
    if (!mw || !mh) return;
    if (miniDirty && performance.now() - miniAt > 800) {
      miniTerrain.width = mw; miniTerrain.height = mh;
      miniTerrain.getContext('2d').drawImage(terrain, 0, 0, mw, mh);
      miniDirty = false; miniAt = performance.now();
    }
    mctx.drawImage(miniTerrain, 0, 0);

    // Composite shroud on minimap: unexplored radar is pitch black!
    mctx.drawImage(shroudCv, 0, 0, mw, mh);

    // Green Phosphor Radar Sweep Beam
    const now = performance.now();
    const sweepAngle = (now * 0.0018) % (Math.PI * 2);
    mctx.save();
    mctx.translate(mw * 0.5, mh * 0.5);
    mctx.rotate(sweepAngle);
    const grad = mctx.createLinearGradient(0, 0, mw * 0.6, 0);
    grad.addColorStop(0, 'rgba(16, 185, 129, 0.45)');
    grad.addColorStop(1, 'rgba(16, 185, 129, 0)');
    mctx.fillStyle = grad;
    mctx.beginPath(); mctx.moveTo(0, 0); mctx.arc(0, 0, Math.max(mw, mh), -0.3, 0.3); mctx.fill();
    mctx.restore();

    // Unit & Building Blips (Filtered by Vision)
    const toMini = (wx, wy) => {
      const { ix, iy } = toIso(wx, wy);
      return {
        mx: (ix - WORLD_ISO_MIN_X) / WORLD_ISO_W * mw,
        my: (iy - WORLD_ISO_MIN_Y) / WORLD_ISO_H * mh
      };
    };

    for (const e of W.ents.values()) {
      if (!isVisible(e)) continue;
      const pt = toMini(e.x, e.y);
      if (e.kind === 'building') {
        mctx.fillStyle = e.team === 'p' ? '#60a5fa' : e.team === 'r' ? '#f87171' : '#fcd34d';
        mctx.fillRect(pt.mx - 2, pt.my - 2, 4, 4);
      } else {
        mctx.fillStyle = e.team === 'r' ? '#ef4444' : e.team === 'x' ? '#a1a1aa' : e.def.hero ? '#fcd34d' : '#fff';
        mctx.fillRect(pt.mx - 1, pt.my - 1, 2, 2);
      }
    }

    // Camera Viewport Parallelogram
    const tl = toMini(toWorld(0, topH()).x, toWorld(0, topH()).y);
    const tr = toMini(toWorld(vw - rightW(), topH()).x, toWorld(vw - rightW(), topH()).y);
    const br = toMini(toWorld(vw - rightW(), vh - bottomH()).x, toWorld(vw - rightW(), vh - bottomH()).y);
    const bl = toMini(toWorld(0, vh - bottomH()).x, toWorld(0, vh - bottomH()).y);
    mctx.strokeStyle = '#fde68a'; mctx.lineWidth = Math.max(1, dpr);
    mctx.beginPath();
    mctx.moveTo(tl.mx, tl.my); mctx.lineTo(tr.mx, tr.my); mctx.lineTo(br.mx, br.my); mctx.lineTo(bl.mx, bl.my); mctx.closePath();
    mctx.stroke();
  }

  // ------------------------------------------------------------ selecting and ordering

  const selectable = e => e && !e.dead && e.team === 'p' && e.type !== 'villager' && e.type !== 'flock';
  const selEnts = () => sel.map(id => W.ents.get(id)).filter(e => e && !e.dead);
  const selUnits = () => selEnts().filter(e => e.kind === 'unit' && selectable(e));
  function setSel(list) { sel = list.filter(selectable).map(e => e.id); infoEnt = null; placing = null; wallLine = null; refreshPanel(true); }

  function entityAt(wx, wy, sx, sy) {
    let best = null, bd = 24;
    for (const e of W.ents.values()) {
      if (e.kind !== 'unit') continue;
      const d = Math.hypot(e.x - wx, e.y - wy) - (e.team === 'p' ? 3 : 0);
      if (d < bd) { bd = d; best = e; }
    }
    if (!best && sx != null && sy != null) {
      let bsd = 22;
      for (const e of W.ents.values()) {
        if (e.kind !== 'unit') continue;
        const s = toScreen(e.x, e.y);
        const sd = Math.hypot(s.x - sx, (s.y - 12) - sy);
        if (sd < bsd) { bsd = sd; best = e; }
      }
    }
    if (best) return best;
    const tx = tileOf(wx), ty = tileOf(wy);
    const id = W.inBounds(tx, ty) && W.occ[ty * MAP_W + tx];
    return (id && W.ents.get(id)) || null;
  }

  function clickAt(wx, wy, add, double, sx, sy) {
    if (placing) return placeAt(wx, wy, add);
    const e = entityAt(wx, wy, sx, sy);
    const units = selUnits();
    // With people chosen, a click on anything but one of your own units is an order.
    if (units.length && !(e && e.kind === 'unit' && selectable(e)) && !(e && e.kind === 'building' && e.team === 'p' && !canWorkOn(units, e))) return command(wx, wy, sx, sy);
    if (selectable(e)) {
      if (double && e.kind === 'unit') {
        const same = W.units('p').filter(u => {
          if (u.type !== e.type) return false;
          const s = toScreen(u.x, u.y);
          return s.x >= 0 && s.x <= vw && s.y >= topH() && s.y <= vh - bottomH();
        });
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

  function command(wx, wy, sx, sy) {
    const units = selUnits();
    if (!units.length) return;
    const e = entityAt(wx, wy, sx, sy), tx = tileOf(wx), ty = tileOf(wy);
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
  function ping(wx, wy, color) { pings.push({ wx, wy, color, t: performance.now(), type: color === '#f87171' ? 'attack' : 'move' }); }

  // --- building
  function startPlacing(type) {
    const def = BUILDINGS[type];
    if (W.whyNotBuild(type)) return toast(W.whyNotBuild(type) + '.', 'warn');
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
      clickAt(p.x, p.y, e.shiftKey || e.ctrlKey || e.metaKey, dbl, e.clientX, e.clientY);
    } else if (g.kind === 'right') {
      if (placing) { placing = null; wallLine = null; refreshPanel(true); }
      else command(p.x, p.y, e.clientX, e.clientY);
    } else if (g.kind === 'box') {
      const bx0 = Math.min(box.x0, box.x1), bx1 = Math.max(box.x0, box.x1);
      const by0 = Math.min(box.y0, box.y1), by1 = Math.max(box.y0, box.y1);
      const inside = W.units('p').filter(u => {
        if (!selectable(u)) return false;
        const s = toScreen(u.x, u.y);
        return s.x >= bx0 && s.x <= bx1 && s.y >= by0 && s.y <= by1;
      });
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
  const miniPoint = e => {
    const r = mini.getBoundingClientRect();
    const mx = (e.clientX - r.left) / r.width;
    const my = (e.clientY - r.top) / r.height;
    const ix = WORLD_ISO_MIN_X + mx * WORLD_ISO_W;
    const iy = WORLD_ISO_MIN_Y + my * WORLD_ISO_H;
    return fromIso(ix, iy);
  };
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
    const key = [sel.join(','), ents.length && ents[0].id, placing, W.res.grain >= 20, W.res.timber >= 6, W.tech && W.foodUsed() >= W.foodCap(), Object.keys(W.researched).join(), W.researching && W.researching.key,
      W.tech && ['barracks', 'armory', 'stables', 'hall', 'farm'].map(t => W.has(t)).join(),
      ...(W.tech ? ['farm', 'granary', 'armory', 'stables', 'hall'].map(t => W.canAfford(BUILDINGS[t].cost)) : []),
      ...(W.tech ? ['nslinger', 'swordsman', 'cart', 'javelin', 'stripling'].map(t => W.canAfford(UNITS[t].cost)) : []),
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
      const bar = d.hp < 99999 ? `<div class="hp"><em style="width:${Math.max(0, e.hp / S.maxHp(e) * 100)}%"></em></div>` : '';
      const doing = e.kind === 'unit' ? ({ gather: 'Gathering ' + (e.order.res || ''), build: 'Building', attack: 'Fighting', move: 'Marching', idle: 'Waiting for orders' }[e.order.type] || '') : e.built < 1 ? 'Being built: ' + Math.floor(e.built * 100) + '%' : '';
      return `<h3>${esc(e.name && e.kind === 'building' ? e.name : d.name)}</h3>${bar}${doing ? `<div>${esc(doing)}</div>` : ''}<p>${esc(d.about || '')}</p>`;
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
      if (units.length === 1 && units[0].def.deploys) h += cmd('deploy', 'Plant it here', 'Alma 46:36', 'wide on');
      if (units.some(u => u.def.builds)) {
        const list = W.tech ? ['farm', 'granary', 'storehouse', 'barracks', 'wall', 'gate', 'tower', 'armory', 'stables', 'hall'] : ['wall', 'gate', 'tower', 'barracks', 'storehouse'];
        for (const t of list) {
          const def = BUILDINGS[t], why = W.whyNotBuild(t);
          h += cmd('build:' + t, t === 'wall' ? 'Walls' : def.name, why ? esc(why) : costHtml(def.cost) + (t === 'wall' ? ' each' : ''), why || !W.canAfford(def.cost) ? 'poor' : '');
        }
      }
      h += cmd('stop', 'Stop', 'H');
      return h;
    }
    if (b.built < 1) return `<div class="note">Choose workers, then tap this to build it.</div>`;
    let h = '';
    for (const t of (b.def.trains || []).filter(t => W.visible(UNITS[t]))) {
      const why = W.whyNotTrain(t);
      h += cmd('train:' + t, UNITS[t].name, why ? esc(why) : costHtml(UNITS[t].cost), why || !W.canAfford(UNITS[t].cost) ? 'poor' : '');
    }
    // What this building can make: in free battle, the armory's list; in a mission, the mission's own armor.
    const keys = W.tech ? (b.def.research || []).filter(k => k !== 'armor') : b.def.research ? [mission.research || 'armor'] : [];
    for (const k of keys.filter(k => !W.researched[k])) {
      const r = RESEARCH[k];
      if (W.researching && W.researching.key === k) h += `<div class="note">Making ${esc(r.name.toLowerCase())}: ${Math.ceil(W.researching.left)}s</div>`;
      else h += cmd('research:' + k, esc(r.name), W.researching ? 'Wait: one at a time' : costHtml(r.cost), 'wide ' + (W.researching || !W.canAfford(r.cost) ? 'poor' : ''));
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
    else if (act === 'train' && one) { if (!W.train(one, arg)) toast(one.queue.length >= 5 ? 'The line is full.' : W.whyNotTrain(arg) || poorText(UNITS[arg].cost), 'warn'); }
    else if (act === 'deploy' && one) {
      const city = W.deploy(one);
      if (city) setSel([city]); else toast('The city needs open ground, 4 by 4. Move the standard to a clear spot.', 'warn');
    }
    else if (act === 'research' && one) {
      if (W.research(one, arg)) toast(RESEARCH[arg].about, 'me', RESEARCH[arg].ref);
      else toast(W.researching ? 'One thing at a time: wait until this is made.' : poorText(RESEARCH[arg].cost), 'warn');
    }
    refreshPanel(true);
  });
  function showInfo(e) { sel = []; infoEnt = e; placing = null; refreshPanel(true); }

  $('bArmy').onclick = () => { const s = W && W.soldiers(); if (s && s.length) { setSel(s); } };
  $('bIdle').onclick = () => {
    if (!W) return;
    const idle = W.units('p').filter(u => u.def.gathers && u.order.type === 'idle');
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
    const cap = W.tech ? '/' + W.storeCap() : '';
    setText('rGrain', Math.floor(W.res.grain) + cap);
    setText('rTimber', Math.floor(W.res.timber) + cap);
    const ps = W.units('p');
    setText('rPeople', W.tech ? W.foodUsed() + '/' + W.foodCap() : ps.filter(u => u.type === 'worker').length + ' · ' + ps.filter(u => u.def.soldier).length);
    if (W.fullAt && W.fullAt > (shown.fullToast || -99) + 20) { shown.fullToast = W.fullAt; toast('Your storehouses are full: build a granary to hold more.', 'warn'); }
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
    const qs = (mission.free ? Object.keys(save.read) : chaptersOf(mission)).flatMap(c => QUESTIONS[c] || []);
    if (!qs.length) return toast('Read a chapter from the missions first: the council asks about what you have read.', 'warn');
    if (!council.queue.length) council.queue = shuffle(qs.map((_, i) => i));
    const q = qs[council.queue.shift()];
    const answers = shuffle([q.right, ...q.wrong]);
    openDialog(`<div class="dialog"><div class="kicker">The council · ${esc(q.ref.replace(/:.*/, ''))}</div><h2>${esc(q.q)}</h2>
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
    // Free battle: open once any chapter with council questions has been read.
    const anyRead = Object.keys(save.read).some(c => QUESTIONS[c]);
    const freeCard = `<h2 class="camp">Free battle</h2><p class="camp-about">Red Alert's way of playing: plant the standard of liberty, build your city up through the tech tree, and tear down the Lamanite war camp.</p>
      <div class="cards"><div class="card ${anyRead ? '' : 'locked'}">
        <div class="kicker">The council asks about every chapter you've read</div>
        <h2>Free battle</h2>
        ${save.won.free ? starsHtml(save.won.free) : ''}
        <p>${esc(FREE.goals)}</p>
        ${anyRead ? '' : '<div class="lock">🔒 Read a mission\'s chapter to open free battle.</div>'}
        <div class="row">${Object.keys(FREE.LEVELS).map(l => `<button class="btn ${anyRead && l === 'easy' ? 'go' : ''}" data-free="${l}" ${anyRead ? '' : 'disabled'}>${FREE.LEVELS[l].name}</button>`).join('')}</div>
      </div></div>`;
    const s = showScreen(`<div class="wrap">
      <div class="kicker">A Book of Mormon strategy game</div>
      <h1><span>Title of Liberty</span></h1>
      <p class="lede">Lead the Nephites through the wars of the Book of Mormon. Read each chapter first, then play it: the missions follow what happens in the verses.</p>
      ${cards}
      ${freeCard}
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
      const r = e.target.closest('[data-read]'), p = e.target.closest('[data-play]'), f = e.target.closest('[data-free]');
      if (f && !f.disabled) { FREE.level = f.dataset.free; return briefing(FREE); }
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
      <div class="kicker">${m.free ? 'Free battle · ' + esc(m.LEVELS[m.level].name) : esc(CAMPAIGNS.find(c => c.id === m.campaign).title) + ' · Mission ' + (inCampaign(m).indexOf(m) + 1) + ' · ' + esc(m.chapter)} · ${esc(m.year)}</div>
      <h2 style="font-size:32px">${esc(m.title)}</h2>
      <ul>${m.briefing.map(([t, r]) => `<li>${esc(t)} ${refBtn(r)}</li>`).join('')}</ul>
      ${m.free ? `<p class="lede">Your building line: city → farms and granaries → barracks → armory → stables and the hall of the captains. A farm feeds 8 people; nobody can be trained without food.</p>` : ''}
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
    initShroud();
    cam.z = vw < 700 ? 0.8 : 1;
    const s = W.stronghold() || W.units('p')[0];
    lookAt(s.x, s.y - (m.id === 'm1' ? 160 : 60));
    if (m.free) setSel(W.units('p').filter(u => u.def.deploys));
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
      revealShroud();
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
  window.LIB_UI = { get W() { return W; }, get mission() { return mission; }, cam, begin: (id, level) => { if (level) FREE.level = level; begin(id === 'free' ? FREE : MISSIONS.find(m => m.id === id)); }, toWorld, lookAt,
    screenOf: (x, y) => toScreen(x, y),
    remoteClick: (sx, sy, color) => {
      const w = toWorld(sx, sy);
      if (w) clickAt(w.x, w.y, false, false, sx, sy);
    },
    remoteCommand: (act, arg) => {
      if (!W) return;
      const one = selEnts()[0];
      if (act === 'build') startPlacing(arg);
      else if (act === 'done' || act === 'cancel') { placing = null; wallLine = null; refreshPanel(true); }
      else if (act === 'stop') for (const u of selUnits()) W.order(u, { type: 'idle' });
      else if (act === 'train' && one) { W.train(one, arg); }
      refreshPanel(true);
    }
  };
})();
