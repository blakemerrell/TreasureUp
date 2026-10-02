// Title of Liberty: the screen. Draws the world that liberty/sim.js runs,
// turns clicks and taps into orders, and runs the menus: read the chapter,
// then play its mission. Nothing here decides who wins a fight.
(function () {
  'use strict';
  const D = window.LIB_DATA, S = window.LIB_SIM, MISSIONS = window.LIB_MISSIONS.MISSIONS, CAMPAIGNS = window.LIB_MISSIONS.CAMPAIGNS, FREE = window.LIB_MISSIONS.FREE_BATTLE, WILD = window.LIB_MISSIONS.WILD;
  const TEXT = window.LIBERTY_SCRIPTURE || {};
  const { TILE, MAP_W, MAP_H, T, UNITS, BUILDINGS, RESEARCH, QUESTIONS } = D;
  const { tileOf, dist } = S;
  const WORLD_W = MAP_W * TILE, WORLD_H = MAP_H * TILE;
  const STEP = 1 / 20;

const IMG = {
  moroni: new Image(),
  spearman: new Image(),
  worker: new Image(),
  stripling: new Image(),
  lamanite: new Image(),
  cart: new Image(),
  unit: new Image(),
  stronghold: new Image(),
  barracks: new Image(),
  tower: new Image(),
  storehouse: new Image(),
  armory: new Image(),
  farm: new Image()
};
IMG.moroni.src = 'assets/moroni.png?v=13';
IMG.spearman.src = 'assets/spearman.png?v=13';
IMG.worker.src = 'assets/worker.png?v=1';        // drawn by Gemini: liberty/art/requests/001-worker.md
IMG.stripling.src = 'assets/stripling.png?v=13';
IMG.lamanite.src = 'assets/lamanite.png?v=13';
IMG.cart.src = 'assets/cart.png?v=13';
IMG.unit.src = 'assets/spearman.png?v=13';
IMG.stronghold.src = 'assets/stronghold.png?v=13';
IMG.barracks.src = 'assets/barracks.png?v=13';
IMG.tower.src = 'assets/tower.png?v=13';
IMG.storehouse.src = 'assets/storehouse.png?v=13';
IMG.armory.src = 'assets/armory.png?v=13';
IMG.farm.src = 'assets/farm.png?v=13';
                                // the simulation's tick, as in the tests
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
  const WORLD_ISO_MIN_X = -MAP_H * TILE; // -1536
  const WORLD_ISO_MAX_X = MAP_W * TILE;  // 2048
  const WORLD_ISO_MIN_Y = 0;
  const WORLD_ISO_MAX_Y = (MAP_W + MAP_H) * TILE * 0.5; // 1792
  const WORLD_ISO_W = WORLD_ISO_MAX_X - WORLD_ISO_MIN_X; // 3584
  const WORLD_ISO_H = WORLD_ISO_MAX_Y - WORLD_ISO_MIN_Y; // 1792
  const ISO_OFFSET_X = -WORLD_ISO_MIN_X; // 1536

  // Hills: every corner of the tile grid has a height, in steps of LEVEL
  // pixels on the screen. They're only drawn: sim.js sees flat ground, so
  // where people can walk and build is the same as without them.
  const LEVEL = 8, WATER_LVL = -0.45;
  const PAD = 112, SKIRT = 64;                        // room on the ground canvas above the map for hills, and below it for the slab's earth
  const TERR_W = WORLD_ISO_W, TERR_H = WORLD_ISO_H + PAD + SKIRT;
  const VW = MAP_W + 1;
  const hts = new Float32Array(VW * (MAP_H + 1));
  let hilly = false;                                 // heights made for this map
  const hv = (x, y) => hts[clamp(y, 0, MAP_H) * VW + clamp(x, 0, MAP_W)];
  function heightAt(wx, wy) {
    if (!hilly) return 0;
    const fx = clamp(wx / TILE, 0, MAP_W - 1e-3), fy = clamp(wy / TILE, 0, MAP_H - 1e-3);
    const x = Math.floor(fx), y = Math.floor(fy), u = fx - x, v = fy - y, i = y * VW + x;
    return (hts[i] * (1 - u) + hts[i + 1] * u) * (1 - v) + (hts[i + VW] * (1 - u) + hts[i + VW + 1] * u) * v;
  }
  const toIso = (wx, wy) => ({ ix: (wx - wy), iy: (wx + wy) * 0.5 - heightAt(wx, wy) * LEVEL });
  const isoAt = (wx, wy, h) => ({ ix: (wx - wy), iy: (wx + wy) * 0.5 - h * LEVEL });
  const fromIso = (ix, iy) => ({ x: (ix + 2 * iy) * 0.5, y: (2 * iy - ix) * 0.5 });   // the flat ground under a point
  // The ground under a point on the screen, hills and all: settle onto the height there.
  function groundAt(ix, iy) {
    let p = fromIso(ix, iy);
    for (let k = 0; k < 6; k++) {
      const q = fromIso(ix, iy + heightAt(p.x, p.y) * LEVEL);
      p = k < 3 ? q : { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 };
    }
    return p;
  }

  // ------------------------------------------------------------ canvas & camera

  const cv = $('view'), ctx = cv.getContext('2d');
  const mini = $('mini'), mctx = mini.getContext('2d');
  let dpr = 1, vw = 0, vh = 0;
  let sky = null;                                    // the night sky round the map, made for the screen's size
  const topH = () => $('hud').offsetHeight || 0;
  const bottomH = () => (window.innerWidth >= 860 || $('panel').hidden) ? 0 : ($('panel').offsetHeight || 0);
  const rightW = () => (window.innerWidth >= 860 && !$('panel').hidden) ? ($('panel').offsetWidth || 236) : 0;

  function resize() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    vw = window.innerWidth; vh = window.innerHeight;
    cv.width = Math.round(vw * dpr); cv.height = Math.round(vh * dpr);
    cv.style.width = vw + 'px'; cv.style.height = vh + 'px';
    const mw = mini.clientWidth || 144;
    mini.width = Math.round(mw * dpr); mini.height = Math.round(mw * TERR_H / TERR_W * dpr);
    mini.style.height = Math.round(mw * TERR_H / TERR_W) + 'px';
    sky = null;
    miniDirty = true;
    $('rotate').hidden = !(W && vw < 560 && vh > vw);
    clampCam();
  }
  function clampCam() {
    const w = (vw - rightW()) / cam.z, h = (vh - topH() - bottomH()) / cam.z;
    cam.x = clamp(cam.x, WORLD_ISO_MIN_X - 160, WORLD_ISO_MAX_X - w + 160);
    cam.y = clamp(cam.y, WORLD_ISO_MIN_Y - PAD - 40, WORLD_ISO_MAX_Y + SKIRT - h + 40);
  }
  const toWorld = (sx, sy) => groundAt(cam.x + sx / cam.z, cam.y + sy / cam.z);
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
  shroudCv.width = TERR_W; shroudCv.height = TERR_H;
  const sctx = shroudCv.getContext('2d');
  const explored = new Uint8Array(MAP_W * MAP_H);

  function initShroud() {
    explored.fill(0);
    sctx.globalCompositeOperation = 'source-over';
    sctx.clearRect(0, 0, TERR_W, TERR_H);
    sctx.fillStyle = '#06070c'; // Westwood Pitch Black Shroud, over the slab and its hills
    const at = (x, y, h) => [(x - y) * TILE + ISO_OFFSET_X, (x + y) * TILE * 0.5 - h * LEVEL + PAD];
    const up = PAD / LEVEL, down = -SKIRT / LEVEL;
    const edge = [at(0, 0, up), at(MAP_W, 0, up), at(MAP_W, 0, down), at(MAP_W, MAP_H, down), at(0, MAP_H, down), at(0, MAP_H, up)];
    sctx.beginPath(); edge.forEach(([x, y], k) => k ? sctx.lineTo(x, y) : sctx.moveTo(x, y)); sctx.closePath(); sctx.fill();
    miniDirty = true;
    revealShroud();
  }

  function revealShroud() {
    if (!W) return;
    sctx.globalCompositeOperation = 'destination-out';
    const punch = (wx, wy, rad) => {
      const { ix, iy } = toIso(wx, wy);
      const cx = ix + ISO_OFFSET_X, cy = iy + PAD;
      const r = Math.max(54, rad * 1.15);
      const grad = sctx.createRadialGradient(cx, cy, r * 0.45, cx, cy, r);
      grad.addColorStop(0, 'rgba(0, 0, 0, 1)');
      grad.addColorStop(0.5, 'rgba(0, 0, 0, 0.9)');
      grad.addColorStop(0.8, 'rgba(0, 0, 0, 0.5)');
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

  // ------------------------------------------------------------ the ground
  // The map the way SimCity 2000 drew it, lit like Red Alert 2: a slab of land
  // with gentle rises, rocky heights where the rock is and the river sunk
  // between its banks, lit from the upper left like the pictures of the
  // buildings and people. It's painted once onto a canvas, and a tile again
  // only when it changes (a wood cut down, a field reaped).

  const terrain = document.createElement('canvas');
  terrain.width = TERR_W; terrain.height = TERR_H;
  const tctx = terrain.getContext('2d');
  let painted = null, miniDirty = true;
  function hash(x, y, k) {
    let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(k | 0, 1442695041);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }
  // Smooth noise: the lie of the land, and where the grass is lush or dry.
  // With a period, it repeats every `period` steps (for textures that tile).
  function noise(x, y, k, period) {
    const x0 = Math.floor(x), y0 = Math.floor(y), u = x - x0, v = y - y0;
    const w = n => period ? ((n % period) + period) % period : n;
    const su = u * u * (3 - 2 * u), sv = v * v * (3 - 2 * v);
    const a = hash(w(x0), w(y0), k), b = hash(w(x0 + 1), w(y0), k), c = hash(w(x0), w(y0 + 1), k), d = hash(w(x0 + 1), w(y0 + 1), k);
    return (a + (b - a) * su) * (1 - sv) + (c + (d - c) * su) * sv;
  }
  const fbm = (x, y, k) => noise(x, y, k) * 0.57 + noise(x * 2.1, y * 2.1, k + 7) * 0.29 + noise(x * 4.3, y * 4.3, k + 13) * 0.14;
  const isWet = t => t === T.WATER || t === T.FORD;
  let seed = 1;
  let shore = null, dry = null, wetTiles = [];       // tiles from the water; tiles from the land; where the water is

  // How many steps each tile is from the nearest tile that `is` (0 on those).
  function distance(is) {
    const d = new Float32Array(MAP_W * MAP_H).fill(99), q = [];
    for (let i = 0; i < d.length; i++) if (is(W.tiles[i])) { d[i] = 0; q.push(i); }
    for (let n = 0; n < q.length; n++) {
      const i = q[n], x = i % MAP_W, y = (i - x) / MAP_W;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= MAP_W || ny >= MAP_H) continue;
        const j = ny * MAP_W + nx;
        if (d[j] > d[i] + 1) { d[j] = d[i] + 1; q.push(j); }
      }
    }
    return d;
  }

  // The heights, made once when a map starts (rock and water never move):
  // rolling ground that falls to the river, and the rock standing up out of it.
  function buildHeights() {
    seed = 1;
    for (const ch of String(mission.id || mission.title || 'free')) seed = (seed * 31 + ch.charCodeAt(0)) % 9973;
    const rockIn = distance(t => t !== T.ROCK);
    shore = distance(isWet); dry = distance(t => !isWet(t));
    wetTiles = [];
    for (let i = 0; i < MAP_W * MAP_H; i++) if (isWet(W.tiles[i])) wetTiles.push([i % MAP_W, Math.floor(i / MAP_W)]);
    for (let vy = 0; vy <= MAP_H; vy++) for (let vx = 0; vx <= MAP_W; vx++) {
      let n = 0, wet = 0, rock = 0, rockDeep = 0, near = 99;
      for (let k = 0; k < 4; k++) {
        const tx = vx - 1 + (k & 1), ty = vy - 1 + (k >> 1);
        if (tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H) continue;
        const i = ty * MAP_W + tx; n++;
        if (isWet(W.tiles[i])) wet++;
        if (W.tiles[i] === T.ROCK) { rock++; rockDeep = Math.max(rockDeep, rockIn[i]); }
        near = Math.min(near, shore[i]);
      }
      const valley = clamp((near - 0.5) / 3.5, 0, 1);
      let h = (0.3 + 3.6 * fbm(vx / 13, vy / 13, seed)) * valley * valley * (3 - 2 * valley);
      if (wet === n) h = WATER_LVL; else if (wet) h = 0;
      if (rock) h += Math.pow(rock / n, 0.6) * (2.6 + 1.2 * Math.min(rockDeep, 3)) * (0.75 + 0.5 * noise(vx / 2.5, vy / 2.5, seed + 5));
      hts[vy * VW + vx] = h;
    }
    // Each corner's light and the grass's colour there, so tiles shade smoothly into each other.
    for (let vy = 0; vy <= MAP_H; vy++) for (let vx = 0; vx <= MAP_W; vx++) {
      const gx = (hv(vx + 1, vy) - hv(vx - 1, vy)) * 0.25, gy = (hv(vx, vy + 1) - hv(vx, vy - 1)) * 0.25;
      vLight[vy * VW + vx] = clamp(1 + ((-gx * SUN[0] - gy * SUN[1] + SUN[2]) / Math.hypot(gx, gy, 1) / SUN[2] - 1) * 0.8, 0.5, 1.3);
      const tone = mix(mix(PAL.lush, PAL.dry, clamp(fbm(vx / 9, vy / 9, seed + 21) * 1.7 - 0.5, 0, 1)), PAL.dark, clamp(fbm(vx / 4, vy / 4, seed + 33) * 1.8 - 0.95, 0, 0.55));
      vTone.set(tone, (vy * VW + vx) * 3);
    }
    hilly = true;
  }
  const vLight = new Float32Array(VW * (MAP_H + 1)), vTone = new Float32Array(VW * (MAP_H + 1) * 3);
  const toneAt = (x, y) => { const i = (clamp(y, 0, MAP_H) * VW + clamp(x, 0, MAP_W)) * 3; return [vTone[i], vTone[i + 1], vTone[i + 2]]; };
  const lum = c => c[0] * 0.3 + c[1] * 0.59 + c[2] * 0.11;
  // Fill a triangle whose brightness runs smoothly from corner to corner (one colour, lit by b at each corner).
  function shadedTri(c, p1, p2, p3, b1, b2, b3, col) {
    const e1x = p2[0] - p1[0], e1y = p2[1] - p1[1], e2x = p3[0] - p1[0], e2y = p3[1] - p1[1], det = e1x * e2y - e1y * e2x;
    c.beginPath(); c.moveTo(p1[0], p1[1]); c.lineTo(p2[0], p2[1]); c.lineTo(p3[0], p3[1]); c.closePath();
    const lo = Math.min(b1, b2, b3), hi = Math.max(b1, b2, b3);
    if (Math.abs(det) < 1e-6 || hi - lo < 0.004) c.fillStyle = rgb(col, (b1 + b2 + b3) / 3);
    else {
      const gx = ((b2 - b1) * e2y - (b3 - b1) * e1y) / det, gy = ((b3 - b1) * e1x - (b2 - b1) * e2x) / det, g2 = gx * gx + gy * gy;
      const g = c.createLinearGradient(p1[0] + gx * (lo - b1) / g2, p1[1] + gy * (lo - b1) / g2, p1[0] + gx * (hi - b1) / g2, p1[1] + gy * (hi - b1) / g2);
      g.addColorStop(0, rgb(col, lo)); g.addColorStop(1, rgb(col, hi));
      c.fillStyle = g;
    }
    c.fill(); c.lineWidth = 0.8; c.strokeStyle = rgb(col, (b1 + b2 + b3) / 3); c.stroke();
  }

  // Light comes from the upper left, as in the pictures: slopes facing it are brighter.
  const SUN = (() => { const l = [-0.6, -0.3, 0.74], m = Math.hypot(l[0], l[1], l[2]); return l.map(v => v / m); })();
  function shadeOf(a, b, c, d) {                     // corner heights: top (x, y), right (x+1, y), bottom (x+1, y+1), left (x, y+1)
    const gx = (b + c - a - d) * 0.25, gy = (d + c - a - b) * 0.25;
    return clamp((-gx * SUN[0] - gy * SUN[1] + SUN[2]) / Math.hypot(gx, gy, 1) / SUN[2], 0.45, 1.35);
  }

  const mix = (p, q, t) => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t, p[2] + (q[2] - p[2]) * t];
  const rgb = (c, s = 1, a = 1) => `rgba(${clamp(c[0] * s, 0, 255) | 0},${clamp(c[1] * s, 0, 255) | 0},${clamp(c[2] * s, 0, 255) | 0},${a})`;
  const PAL = {
    lush: [92, 128, 54], dry: [152, 150, 86], dark: [62, 98, 44], floor: [66, 88, 46],
    sand: [190, 170, 122], mud: [96, 80, 58], burnt: [74, 64, 52],
    rock: [132, 128, 120], cliff: [104, 98, 92],
    deep: [34, 86, 106], shallow: [66, 132, 138], ford: [136, 160, 128],
    soil: [104, 74, 48], ripe: [216, 180, 82], green: [142, 160, 72], stubble: [168, 140, 94],
    topsoil: [84, 58, 38], clay: [170, 118, 72], bedrock: [114, 108, 102],
  };

  // Where a corner of the tile grid lands on the ground canvas, at height h.
  const canX = (vx, vy) => (vx - vy) * TILE + ISO_OFFSET_X;
  const canY = (vx, vy, h) => (vx + vy) * TILE * 0.5 - h * LEVEL + PAD;
  function tileCorners(x, y, flat) {
    const h = flat == null ? [hv(x, y), hv(x + 1, y), hv(x + 1, y + 1), hv(x, y + 1)] : [flat, flat, flat, flat];
    return { h, P: [[canX(x, y), canY(x, y, h[0])], [canX(x + 1, y), canY(x + 1, y, h[1])], [canX(x + 1, y + 1), canY(x + 1, y + 1, h[2])], [canX(x, y + 1), canY(x, y + 1, h[3])]] };
  }
  // A point inside a tile: u along its x side, v along its y side.
  const inTile = (P, u, v) => [(P[0][0] * (1 - u) + P[1][0] * u) * (1 - v) + (P[3][0] * (1 - u) + P[2][0] * u) * v,
    (P[0][1] * (1 - u) + P[1][1] * u) * (1 - v) + (P[3][1] * (1 - u) + P[2][1] * u) * v];
  function poly(c, P) { c.beginPath(); c.moveTo(P[0][0], P[0][1]); for (let k = 1; k < P.length; k++) c.lineTo(P[k][0], P[k][1]); c.closePath(); }
  const blob = (c, x, y, rx, ry) => { c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.fill(); };

  // Fine texture laid over each tile's colour (overlay: mid grey leaves the colour as it is).
  let TEX = null;
  function texture(kind) {
    const s = 128, cv = document.createElement('canvas'); cv.width = cv.height = s;
    const c = cv.getContext('2d'), img = c.createImageData(s, s), d = img.data, k = { grass: 11, rock: 23, water: 37 }[kind];
    for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
      const n1 = noise(x / 16, y / 16, k, 8), n2 = noise(x / 8, y / 8, k + 1, 16), n3 = noise(x / 2, y / 2, k + 2, 64), r = hash(x, y, k + 3);
      let v;
      if (kind === 'grass') v = 128 + 34 * (n1 - 0.5) + 30 * (n2 - 0.5) + 34 * (n3 - 0.5) + 24 * (r - 0.5);
      else if (kind === 'rock') v = 128 + 60 * (n1 - 0.5) + 44 * (n2 - 0.5) + 34 * (n3 - 0.5) + 22 * (r - 0.5) + 10 * Math.sin(y * 0.9 + n1 * 6);   // blotches and faint strata
      else v = 128 + 26 * (n2 - 0.5) + 16 * (n3 - 0.5);
      const i = (y * s + x) * 4;
      d[i] = d[i + 1] = d[i + 2] = clamp(v, 0, 255); d[i + 3] = 255;
    }
    c.putImageData(img, 0, 0);
    if (kind === 'grass') {                           // blades, lit at the tip or in shade
      c.lineWidth = 1;
      for (let j = 0; j < 700; j++) {
        const x = 3 + hash(j, 1, 90) * (s - 6), y = 6 + hash(j, 2, 90) * (s - 9), l = 2 + hash(j, 3, 90) * 3;
        c.strokeStyle = hash(j, 5, 90) < 0.5 ? 'rgba(255,255,225,.5)' : 'rgba(0,0,0,.4)';
        c.beginPath(); c.moveTo(x, y); c.lineTo(x + (hash(j, 4, 90) - 0.5) * 2, y - l); c.stroke();
      }
    }
    return tctx.createPattern(cv, 'repeat');
  }
  function overlay(c, P, pat, alpha) {
    c.save(); poly(c, P); c.clip();
    c.globalCompositeOperation = 'overlay'; c.globalAlpha = alpha; c.fillStyle = pat;
    const xs = P.map(p => p[0]), ys = P.map(p => p[1]), x0 = Math.min(...xs), y0 = Math.min(...ys);
    c.fillRect(x0 - 1, y0 - 1, Math.max(...xs) - x0 + 2, Math.max(...ys) - y0 + 2);
    c.restore();
  }

  // What a tile looks like, so it's painted again only when that changes.
  function look(i) {
    const t = W.tiles[i], a = W.amt[i];
    if (t === T.FOREST) return t * 4 + (a > 80 ? 2 : a > 35 ? 1 : 0);
    if (t === T.FIELD) return t * 4 + (a > 150 ? 2 : a > 60 ? 1 : 0);
    return t * 4;
  }
  function paintTerrain() {
    if (!TEX) TEX = { grass: texture('grass'), rock: texture('rock'), water: texture('water') };
    const whole = !painted;
    if (whole) { painted = new Int16Array(MAP_W * MAP_H).fill(-1); tctx.clearRect(0, 0, TERR_W, TERR_H); }
    let changed = false;
    // Back to front, so a rise in front covers what's behind it.
    for (let s = 0; s <= MAP_W + MAP_H - 2; s++) {
      for (let x = Math.max(0, s - MAP_H + 1); x <= Math.min(MAP_W - 1, s); x++) {
        const y = s - x, i = y * MAP_W + x, l = look(i);
        if (painted[i] !== l) { painted[i] = l; paintTile(x, y); changed = true; }
      }
    }
    if (whole) paintSides();
    if (changed) { plantTrees(); miniDirty = true; }
    W.terrainDirty = false;
  }

  function paintTile(x, y) {
    const c = tctx, i = y * MAP_W + x, t = W.tiles[i], a = W.amt[i], h = k => hash(x, y, k + seed);
    if (isWet(t)) return paintWater(x, y, t);
    const { h: H, P } = tileCorners(x, y);
    const steep = Math.max(H[0], H[1], H[2], H[3]) - Math.min(H[0], H[1], H[2], H[3]), shade = shadeOf(H[0], H[1], H[2], H[3]);
    const tones = [toneAt(x, y), toneAt(x + 1, y), toneAt(x + 1, y + 1), toneAt(x, y + 1)];
    let col = mix(mix(tones[0], tones[1], 0.5), mix(tones[2], tones[3], 0.5), 0.5);
    if (t === T.FOREST) col = mix(col, PAL.floor, 0.65);
    if (t === T.RUIN) col = mix(col, PAL.burnt, 0.6);
    if (shore[i] === 1) col = mix(col, PAL.sand, 0.3);
    if (t === T.ROCK) col = mix(PAL.rock, col, 0.18);
    else if (steep > 2) col = mix(col, PAL.cliff, clamp((steep - 2) / 2.5, 0, 0.45));   // bare earth where it's too steep for grass
    {
      const L = [[x, y], [x + 1, y], [x + 1, y + 1], [x, y + 1]].map(([vx, vy], k) => vLight[vy * VW + vx] * lum(tones[k]) / lum(mix(mix(tones[0], tones[1], 0.5), mix(tones[2], tones[3], 0.5), 0.5)));
      if (Math.abs(H[0] - H[2]) < Math.abs(H[1] - H[3])) { shadedTri(c, P[0], P[1], P[2], L[0], L[1], L[2], col); shadedTri(c, P[0], P[2], P[3], L[0], L[2], L[3], col); }
      else { shadedTri(c, P[0], P[1], P[3], L[0], L[1], L[3], col); shadedTri(c, P[1], P[2], P[3], L[1], L[2], L[3], col); }
    }
    overlay(c, P, t === T.ROCK || steep > 2.4 ? TEX.rock : TEX.grass, t === T.ROCK ? 0.7 : 0.5);
    if (t === T.FIELD) paintField(c, P, a, shade, h);
    else if (t === T.FOREST) paintTreeShadows(c, P, x, y, a);
    else if (t === T.RUIN) paintRuin(c, P, h);
    else if (t === T.ROCK) paintBoulders(c, P, h, shade);
    else if (h(5) < 0.1) {                            // a few wild flowers
      c.fillStyle = h(6) < 0.5 ? '#f3d250' : '#e8eef0';
      for (let k = 0; k < 3; k++) { const [fx, fy] = inTile(P, 0.2 + 0.6 * h(7 + k), 0.2 + 0.6 * h(10 + k)); c.fillRect(fx, fy, 1.6, 1.6); }
    }
    // A lip of sand where the water lies behind the land.
    c.strokeStyle = 'rgba(214, 196, 150, .7)'; c.lineWidth = 1.2;
    if (y > 0 && isWet(W.tiles[i - MAP_W])) { c.beginPath(); c.moveTo(P[0][0], P[0][1] + 0.5); c.lineTo(P[1][0], P[1][1] + 0.5); c.stroke(); }
    if (x > 0 && isWet(W.tiles[i - 1])) { c.beginPath(); c.moveTo(P[3][0], P[3][1] + 0.5); c.lineTo(P[0][0], P[0][1] + 0.5); c.stroke(); }
    // The tile grid, faintly, as SimCity 2000 showed it.
    c.strokeStyle = 'rgba(30, 40, 16, .09)'; c.lineWidth = 1;
    c.beginPath(); c.moveTo(P[3][0], P[3][1]); c.lineTo(P[0][0], P[0][1]); c.lineTo(P[1][0], P[1][1]); c.stroke();
  }

  function paintWater(x, y, t) {
    const c = tctx, i = y * MAP_W + x, h = k => hash(x, y, k + seed);
    const land = (tx, ty) => tx >= 0 && ty >= 0 && tx < MAP_W && ty < MAP_H && !isWet(W.tiles[ty * MAP_W + tx]);
    // The bank on the far sides, from the land's edge down to the water.
    const bank = (va, vb) => {
      poly(c, [[canX(va[0], va[1]), canY(va[0], va[1], hv(va[0], va[1]))], [canX(vb[0], vb[1]), canY(vb[0], vb[1], hv(vb[0], vb[1]))],
        [canX(vb[0], vb[1]), canY(vb[0], vb[1], WATER_LVL)], [canX(va[0], va[1]), canY(va[0], va[1], WATER_LVL)]]);
      c.fillStyle = rgb(PAL.mud); c.fill();
    };
    if (land(x, y - 1)) bank([x, y], [x + 1, y]);
    if (land(x - 1, y)) bank([x, y + 1], [x, y]);
    const { P } = tileCorners(x, y, WATER_LVL);
    const col = t === T.FORD ? mix(PAL.ford, PAL.shallow, 0.2) : mix(PAL.shallow, PAL.deep, clamp((dry[i] - 1) / 2, 0, 1));
    poly(c, P); c.fillStyle = rgb(col); c.fill(); c.lineWidth = 1; c.strokeStyle = c.fillStyle; c.stroke();
    overlay(c, P, TEX.water, 0.4);
    if (t === T.FORD) {                               // the shallows: ripples over sand, and stones to step on
      c.strokeStyle = 'rgba(232, 226, 196, .45)'; c.lineWidth = 1;
      for (let k = 0; k < 2; k++) {
        const A = inTile(P, 0.1, 0.3 + 0.4 * k), B = inTile(P, 0.9, 0.3 + 0.4 * k);
        c.beginPath(); c.moveTo(A[0], A[1]); c.quadraticCurveTo((A[0] + B[0]) / 2, (A[1] + B[1]) / 2 - 2, B[0], B[1]); c.stroke();
      }
      for (let k = 0; k < 4; k++) {
        const [sx, sy] = inTile(P, 0.18 + 0.64 * h(10 + k), 0.18 + 0.64 * h(20 + k)), r = 2.4 + h(30 + k) * 1.6;
        c.fillStyle = 'rgba(30, 50, 50, .35)'; blob(c, sx + 1, sy + 1, r * 1.1, r * 0.55);
        c.fillStyle = '#8f897d'; blob(c, sx, sy, r, r * 0.55);
        c.fillStyle = '#cfc8b8'; blob(c, sx - r * 0.25, sy - r * 0.18, r * 0.5, r * 0.25);
      }
    }
    // Foam where it meets the land.
    c.strokeStyle = 'rgba(236, 244, 236, .55)'; c.lineWidth = 1.4;
    const edge = (A, B) => { c.beginPath(); c.moveTo(A[0], A[1]); c.lineTo(B[0], B[1]); c.stroke(); };
    if (land(x, y - 1)) edge(P[0], P[1]);
    if (land(x - 1, y)) edge(P[3], P[0]);
    if (land(x + 1, y)) edge(P[1], P[2]);
    if (land(x, y + 1)) edge(P[2], P[3]);
  }

  // Rows of grain, ripe gold while there's plenty to reap, stubble when it's nearly gone.
  function paintField(c, P, a, shade, h) {
    poly(c, P); c.fillStyle = rgb(PAL.soil, shade); c.fill();
    overlay(c, P, TEX.grass, 0.35);
    const crop = a > 150 ? PAL.ripe : a > 60 ? PAL.green : PAL.stubble, rows = 5;
    for (let r = 0; r < rows; r++) {
      const v = (r + 0.5) / rows, A = inTile(P, 0.07, v), B = inTile(P, 0.93, v);
      c.strokeStyle = rgb(crop, shade * 0.72); c.lineWidth = 3.4;
      c.beginPath(); c.moveTo(A[0], A[1] + 0.8); c.lineTo(B[0], B[1] + 0.8); c.stroke();
      c.strokeStyle = rgb(crop, shade); c.lineWidth = 2.3;
      c.beginPath(); c.moveTo(A[0], A[1]); c.lineTo(B[0], B[1]); c.stroke();
      if (a > 60) {
        c.fillStyle = rgb(crop, shade * 1.22);
        for (let k = 0; k < 6; k++) { const [ex, ey] = inTile(P, 0.1 + 0.8 * (k + h(30 + r * 7 + k) * 0.7) / 6, v); c.fillRect(ex - 0.5, ey - 2.4, 1, 2.2); }
      }
    }
    c.strokeStyle = 'rgba(60, 40, 22, .5)'; c.lineWidth = 1; poly(c, P); c.stroke();
  }

  function paintRuin(c, P, h) {                       // what the robbers left: scorched ground, fallen stones, a charred beam
    for (let k = 0; k < 4; k++) {
      const [sx, sy] = inTile(P, 0.15 + 0.7 * h(40 + k), 0.15 + 0.7 * h(44 + k));
      c.fillStyle = 'rgba(0,0,0,.3)'; c.fillRect(sx - 2, sy - 0.5, 7, 2);
      c.fillStyle = '#8d8478'; c.fillRect(sx - 3, sy - 2, 6, 3);
      c.fillStyle = '#bdb4a5'; c.fillRect(sx - 3, sy - 3, 6, 1.3);
    }
    const A = inTile(P, 0.25, 0.6), B = inTile(P, 0.7, 0.45);
    c.strokeStyle = '#2b2119'; c.lineWidth = 2; c.beginPath(); c.moveTo(A[0], A[1]); c.lineTo(B[0], B[1]); c.stroke();
  }

  function paintBoulders(c, P, h, shade) {
    for (let k = 0; k < 2; k++) {
      if (h(70 + k) > 0.65) continue;
      const [sx, sy] = inTile(P, 0.25 + 0.5 * h(72 + k), 0.25 + 0.5 * h(74 + k)), r = 3 + h(76 + k) * 3;
      c.fillStyle = 'rgba(0,0,0,.25)'; blob(c, sx + 2, sy + 1.5, r * 1.1, r * 0.55);
      c.fillStyle = rgb(PAL.rock, shade * 0.82); blob(c, sx, sy - r * 0.35, r, r * 0.7);
      c.fillStyle = rgb(PAL.rock, shade * 1.22); blob(c, sx - r * 0.3, sy - r * 0.6, r * 0.5, r * 0.32);
    }
  }

  // The slab's two front sides: the earth under the map, as SimCity 2000 cut it.
  function paintSides() {
    const c = tctx, BOTTOM = -(SKIRT / LEVEL) + 1;
    const at = (v, lv) => [canX(v[0], v[1]), canY(v[0], v[1], lv)];
    const side = (va, vb, wet, light) => {
      const tA = wet ? WATER_LVL : hv(va[0], va[1]), tB = wet ? WATER_LVL : hv(vb[0], vb[1]);
      const band = (hiA, hiB, loA, loB, col) => {
        poly(c, [at(va, hiA), at(vb, hiB), at(vb, Math.min(loB, hiB)), at(va, Math.min(loA, hiA))]);
        c.fillStyle = rgb(col, light); c.fill(); c.strokeStyle = c.fillStyle; c.lineWidth = 0.8; c.stroke();
      };
      band(tA, tB, BOTTOM, BOTTOM, PAL.bedrock);
      band(wet ? -1.8 : tA - 0.55, wet ? -1.8 : tB - 0.55, -2.8, -2.8, PAL.clay);
      if (wet) band(tA, tB, -1.8, -1.8, PAL.shallow);
      else band(tA, tB, tA - 0.55, tB - 0.55, PAL.topsoil);
      c.strokeStyle = rgb(PAL.bedrock, light * 0.8); c.lineWidth = 1;
      for (const lv of [-3.9, -5.2]) { const A = at(va, lv), B = at(vb, lv); c.beginPath(); c.moveTo(A[0], A[1]); c.lineTo(B[0], B[1]); c.stroke(); }
    };
    for (let x = 0; x < MAP_W; x++) side([x, MAP_H], [x + 1, MAP_H], isWet(W.tiles[(MAP_H - 1) * MAP_W + x]), 0.95);
    for (let y = 0; y < MAP_H; y++) side([MAP_W, y], [MAP_W, y + 1], isWet(W.tiles[y * MAP_W + MAP_W - 1]), 0.7);
    c.strokeStyle = 'rgba(0, 0, 0, .6)'; c.lineWidth = 1.5;
    const a = at([0, MAP_H], BOTTOM), b = at([MAP_W, MAP_H], BOTTOM), d = at([MAP_W, 0], BOTTOM);
    c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.lineTo(d[0], d[1]); c.stroke();
  }

  // ------------------------------------------------------------ trees
  // Trees stand among the people and are drawn in depth order with them, so
  // a worker behind a wood is hidden by it. Each is one of a dozen pictures
  // painted once at the start, at twice the size for zooming in.

  let TREES = null, trees = [];
  const circle = (c, x, y, r) => { c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill(); };
  function makeTrees() {
    const out = [], greens = [[58, 96, 40], [70, 108, 44], [50, 88, 48], [92, 114, 46], [64, 100, 36], [78, 100, 54]];
    for (let k = 0; k < 12; k++) {
      const conifer = k >= 8, g = greens[k % greens.length], r = j => hash(k, j, 777), S = 2;
      const w = conifer ? 32 : 44, ht = conifer ? 64 : 58, ax = w / 2, ay = ht - 4, trunk = conifer ? 14 : 22;
      const cv = document.createElement('canvas'); cv.width = w * S; cv.height = ht * S;
      const c = cv.getContext('2d'); c.scale(S, S);
      const light = mix(g, [240, 238, 170], 0.45), shadow = mix(g, [12, 28, 26], 0.55), rim = mix(g, [8, 14, 10], 0.78);
      c.fillStyle = '#4e3624';
      c.beginPath(); c.moveTo(ax - 2.4, ay); c.lineTo(ax - 1.2, ay - trunk); c.lineTo(ax + 1.2, ay - trunk); c.lineTo(ax + 2.4, ay); c.closePath(); c.fill();
      c.fillStyle = '#2c1f15'; c.fillRect(ax + 0.2, ay - trunk, 1.4, trunk);
      if (!conifer) {
        const cx = ax + (r(1) - 0.5) * 3, cy = ay - 32 - r(2) * 4, rx = 13 + r(3) * 4, ry = 11 + r(4) * 3, blobs = [];
        for (let j = 0; j < 18; j++) {
          const an = r(10 + j) * Math.PI * 2, d = Math.sqrt(r(40 + j)) * 0.78;
          blobs.push([cx + Math.cos(an) * rx * d, cy + Math.sin(an) * ry * d, 4.2 + r(70 + j) * 3.6]);
        }
        blobs.sort((p, q) => p[1] - q[1]);
        c.fillStyle = rgb(rim);
        for (const [bx, by, br] of blobs) circle(c, bx, by, br + 1.4);
        for (const [bx, by, br] of blobs) {
          const lit = clamp(0.55 - ((bx - cx) / rx + (by - cy) / ry) * 0.5, 0, 1);
          c.fillStyle = rgb(mix(shadow, g, 0.3 + 0.7 * lit)); circle(c, bx, by, br);
          c.fillStyle = rgb(mix(g, light, lit * 0.9), 1, 0.85); circle(c, bx - br * 0.32, by - br * 0.36, br * 0.52);
        }
      } else {
        const tiers = [];
        for (let j = 0; j < 5; j++) {
          const ty = ay - 9 - j * 9, tw = 14 - j * 2.4 + r(j) * 1.5, th = 16 - j * 0.6, pts = [[ax, ty - th]];
          for (let z = 0; z <= 6; z++) pts.push([ax + tw - (tw * 2 * z) / 6, ty + (z % 2 ? -2.2 : 0.6)]);
          tiers.push(pts);
        }
        c.strokeStyle = rgb(rim); c.lineWidth = 2.6; c.lineJoin = 'round';
        for (const t of tiers) { poly(c, t); c.stroke(); }
        for (const t of tiers) {
          poly(c, t); c.fillStyle = rgb(mix(shadow, g, 0.55)); c.fill();
          c.save(); poly(c, t); c.clip();
          c.fillStyle = rgb(mix(g, light, 0.35)); c.fillRect(ax - 20, t[0][1] - 2, 20, 30);
          c.restore();
        }
      }
      // Leaves catching the light, and the whole tree lit like everything else.
      c.globalCompositeOperation = 'source-atop';
      for (let j = 0; j < 60; j++) {
        const sx = ax - w * 0.42 + r(200 + j) * w * 0.84, sy = 4 + r(300 + j) * (ay - trunk);
        const lit = (sx - ax) / w + (sy - ay / 2) / ht < 0;
        c.fillStyle = lit ? 'rgba(236, 240, 170, .55)' : 'rgba(10, 26, 16, .45)'; c.fillRect(sx, sy, 1.2, 1.2);
      }
      const grad = c.createLinearGradient(0, 0, w, ht);
      grad.addColorStop(0, 'rgba(255, 240, 190, .16)'); grad.addColorStop(1, 'rgba(0, 18, 30, .3)');
      c.fillStyle = grad; c.fillRect(0, 0, w, ht);
      const small = document.createElement('canvas'); small.width = w; small.height = ht;   // for zoomed out, so a thousand trees aren't each shrunk every frame
      small.getContext('2d').drawImage(cv, 0, 0, w, ht);
      out.push({ cv, small, w, h: ht, ax, ay });
    }
    return out;
  }
  // Where a wood's trees stand inside its tile: fewer as it's cut down.
  function treesOf(x, y, a) {
    const n = a > 80 ? 3 : a > 35 ? 2 : 1, slots = [[0.3, 0.3], [0.72, 0.42], [0.42, 0.74]], out = [];
    for (let k = 0; k < n; k++) out.push({
      u: slots[k][0] + (hash(x, y, 50 + k) - 0.5) * 0.24, v: slots[k][1] + (hash(x, y, 60 + k) - 0.5) * 0.24,
      s: Math.floor(hash(x, y, 80 + k) * 12),
    });
    return out;
  }
  function paintTreeShadows(c, P, x, y, a) {
    c.save(); poly(c, P); c.clip(); c.fillStyle = 'rgba(14, 26, 10, .34)';
    for (const tr of treesOf(x, y, a)) { const [sx, sy] = inTile(P, tr.u, tr.v); blob(c, sx + 8, sy + 2.5, 14, 6); }
    c.restore();
  }
  function plantTrees() {
    trees = [];
    for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) {
      const i = y * MAP_W + x;
      if (W.tiles[i] !== T.FOREST) continue;
      for (const tr of treesOf(x, y, W.amt[i])) trees.push({ kind: 'tree', x: (x + tr.u) * TILE, y: (y + tr.v) * TILE, s: tr.s });
    }
  }
  function drawTree(e) {
    if (!TREES) TREES = makeTrees();
    const s = TREES[e.s], p = toIso(e.x, e.y), k = 1.2;
    ctx.drawImage(cam.z * dpr > 1.05 ? s.cv : s.small, p.ix - s.ax * k, p.iy - s.ay * k, s.w * k, s.h * k);
  }

  // The river sparkles: a few glints on the water, coming and going.
  function drawGlints(now) {
    const t = now / 1000, x0 = cam.x - 40, x1 = cam.x + vw / cam.z + 40, y0 = cam.y - 40, y1 = cam.y + vh / cam.z + 40;
    ctx.strokeStyle = '#eef8fa'; ctx.lineWidth = 1.2;
    for (const [x, y] of wetTiles) {
      const { ix, iy } = isoAt((x + 0.5) * TILE, (y + 0.5) * TILE, WATER_LVL);
      if (ix < x0 || ix > x1 || iy < y0 || iy > y1) continue;
      for (let k = 0; k < 2; k++) {
        const a = Math.sin(t * 1.7 + hash(x, y, 300 + k) * 6.28);
        if (a < 0.4) continue;
        const gx = ix - 14 + hash(x, y, 310 + k) * 28, gy = iy - 4 + hash(x, y, 320 + k) * 8;
        ctx.globalAlpha = (a - 0.4) * 0.9;
        ctx.beginPath(); ctx.moveTo(gx - 3.5, gy); ctx.lineTo(gx + 3.5, gy); ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  }

  // Smoke, fire and sparks on the screen only; a new mission starts with none.
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
    if (!sky) {
      sky = ctx.createRadialGradient(cv.width / 2, cv.height * 0.4, 0, cv.width / 2, cv.height * 0.4, Math.max(cv.width, cv.height) * 0.75);
      sky.addColorStop(0, '#172236'); sky.addColorStop(1, '#05070c');
    }
    ctx.fillStyle = sky; ctx.fillRect(0, 0, cv.width, cv.height);
    const z = cam.z * dpr;
    ctx.setTransform(z, 0, 0, z, -cam.x * z, -cam.y * z);
    ctx.drawImage(terrain, -ISO_OFFSET_X, -PAD);
    drawGlints(now);

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
    for (const e of ents) if (e.kind === 'building') drawFloor(e);
    for (const t of trees) if (inView(t)) ents.push(t);
    ents.sort((a, b) => isoDepth(a) - isoDepth(b));

    // Draw entities in depth order
    for (const e of ents) {
      if (e.kind === 'tree') {
        drawTree(e);
      } else if (e.kind === 'building') {
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

    // Something of yours under attack: a red ring on the ground there for a few seconds.
    for (const a of W.alarms) {
      const age = W.t - a.t;
      if (age > 4) continue;
      const { ix, iy } = toIso(a.x, a.y), r = 30 + (age * 40) % 40;
      ctx.strokeStyle = `rgba(248,113,113,${0.9 * (1 - age / 4)})`; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(ix, iy, r, r / 2, 0, 0, 7); ctx.stroke();
    }

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
    ctx.drawImage(shroudCv, -ISO_OFFSET_X, -PAD);
    drawMarkers(now, true);

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
    ctx.beginPath();
    for (let x = 0; x <= MAP_W; x++) { const p = toIso(x * TILE, y); x ? ctx.lineTo(p.ix, p.iy) : ctx.moveTo(p.ix, p.iy); }
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.font = '700 12px Outfit, system-ui, sans-serif'; ctx.textAlign = 'center';
    for (let x = 8; x < MAP_W; x += 16) {
      const pt = toIso(x * TILE, y);
      ctx.fillStyle = 'rgba(0,0,0,.65)'; ctx.fillRect(pt.ix - 118, pt.iy - 24, 236, 18);
      ctx.fillStyle = '#fecaca'; ctx.fillText('Wilderness: wait for them to come (3 Nephi 3:21)', pt.ix, pt.iy - 11);
    }
    ctx.restore();
  }
  // Story places, once explored; or, after the shroud (overFog), warnings that show through it.
  function drawMarkers(now, overFog) {
    const list = (mission.markers ? mission.markers(W) : []).filter(m => !!m.always === !!overFog);
    if (!list.length) return;
    const pulse = 0.6 + 0.4 * Math.sin(now / 250);
    ctx.font = '800 13px Outfit, system-ui, sans-serif'; ctx.textAlign = 'center';
    for (const m of list) {
      if (!m.always && !explored[Math.floor(m.y) * MAP_W + Math.floor(m.x)]) continue;
      const { ix, iy } = toIso((m.x + 0.5) * TILE, (m.y + 0.5) * TILE);
      const w = ctx.measureText(m.label).width + 16;
      ctx.strokeStyle = m.always ? `rgba(248,113,113,${pulse})` : `rgba(253,230,138,${pulse})`; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(ix, iy, 42, 21, 0, 0, 7); ctx.stroke();
      ctx.fillStyle = 'rgba(0,0,0,.65)'; ctx.fillRect(ix - w / 2, iy - 48, w, 18);
      ctx.fillStyle = m.always ? '#fecaca' : '#fde68a'; ctx.fillText(m.label, ix, iy - 35);
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
    const moving = !!(u.path && u.path.length > 0);
    const working = u.order.type === 'gather' && u.phase === 'work';
    const walkCycle = moving ? Math.sin(now * 0.015 + u.id) : 0;
    const bob = moving ? Math.abs(walkCycle) * 2.2 : (working ? Math.abs(Math.sin(now * 0.02 + u.id)) * 1.5 : 0);
    const x = ix, y = iy - (kneel ? -2 : 1) - bob;
    
    let flip = 1;
    if (moving && u.path && u.path.length > 0) {
      const tx = Math.floor(u.x / 32), ty = Math.floor(u.y / 32);
      const nx = u.path[0][0], ny = u.path[0][1];
      const dx = nx - tx, dy = ny - ty;
      if (dx - dy < 0) flip = -1;
    } else if (u.order.type === 'attack' && u.order.target) {
      const target = W.ents.get(u.order.target);
      if (target) {
        const dx = target.x - u.x, dy = target.y - u.y;
        if (dx - dy < 0) flip = -1;
      }
    }

    ctx.fillStyle = 'rgba(0,0,0,.32)'; ctx.beginPath(); ctx.ellipse(ix + 2, iy + 2, r * 0.95, r * 0.48, 0, 0, 7); ctx.fill();

    const hid = W.hidden(u);
    if (hid) ctx.globalAlpha = 0.5;

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(flip, 1);

    if (u.type === 'standard') {
      ctx.restore(); if (hid) ctx.globalAlpha = 1;
      banner(x - 1, y - 30, '#f4f1e6', now, u.id);
      return;
    }
    let uImg = IMG.spearman;
    let uw = 22, uh = 44, uox = 11, uoy = 42;
    if (u.type === 'moroni' || d.hero) {
      uImg = IMG.moroni;
      uw = 25; uh = 48; uox = 12; uoy = 46;
    } else if (u.type === 'stripling') {
      uImg = IMG.stripling;
      uw = 22; uh = 44; uox = 11; uoy = 42;
    } else if (u.type === 'lamanite' || u.type === 'zerahemnah' || d.foe) {
      uImg = IMG.lamanite;
      uw = 25; uh = 44; uox = 12; uoy = 42;
    } else if (u.type === 'cart') {
      uImg = IMG.cart;
      uw = 40; uh = 28; uox = 20; uoy = 24;
    } else if (u.type === 'worker') {
      uImg = IMG.worker;                         // 76 × 150, cropped to the figure: feet on the ground
      uw = 20; uh = 40; uox = 10; uoy = 39;
    }

    if (uImg && uImg.complete && uImg.naturalWidth) {
      ctx.drawImage(uImg, -uox, -uoy, uw, uh);
    } else {
      ctx.fillStyle = '#451a03';
      ctx.fillRect(-3 + walkCycle * 3, 2, 2.5, 6);
      ctx.fillRect(1 - walkCycle * 3, 2, 2.5, 6);
      let tunicColor = d.foe ? '#7f1d1d' : (u.type === 'worker' ? '#a8814f' : (d.hero ? '#b45309' : '#4ade80'));
      ctx.fillStyle = tunicColor;
      ctx.fillRect(-4, -6, 8, 8);
      ctx.fillStyle = d.foe ? '#b45309' : '#d8bd8e';
      ctx.beginPath(); ctx.arc(0, -10, 4, 0, 7); ctx.fill();
    }
    
    ctx.restore();
    if (hid) ctx.globalAlpha = 1;
    
    if (u.hp < u.max && (sel.includes(u.id) || u.team === 'r')) {
      const pct = Math.max(0, u.hp / u.max);
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(ix - 8, iy - 22, 16, 3);
      ctx.fillStyle = u.team === 'p' ? '#4ade80' : '#f87171';
      ctx.fillRect(ix - 8, iy - 22, 16 * pct, 3);
    }
    if (sel.includes(u.id)) {
      ctx.strokeStyle = '#fde047'; ctx.lineWidth = 1; ctx.setLineDash([2, 2]);
      ctx.beginPath(); ctx.ellipse(ix + 2, iy + 2, r * 1.2, r * 0.6, 0, 0, 7); ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  // ------------------------------------------------------------ buildings
  // Each picture is drawn at its own shape (never stretched), sized to the
  // width of the building's ground and set on it by its front corner. What
  // has no picture is drawn here: earthworks, tents, the villages' huts.

  // In each picture's own pixels: the middle of its base across, the front
  // corner where it meets the ground, and how wide the base is.
  const SPRITE = {
    stronghold: { cx: 250, by: 419, span: 483 },
    barracks: { cx: 191, by: 291, span: 331 },
    storehouse: { cx: 187, by: 283, span: 358 },
    tower: { cx: 214, by: 493, span: 428 },
    armory: { cx: 74, by: 147, span: 150 },
  };
  const PICTURE = { stronghold: 'stronghold', barracks: 'barracks', hall: 'barracks', tower: 'tower', armory: 'armory', storehouse: 'storehouse', granary: 'storehouse', stables: 'storehouse' };
  const ready = img => img && img.complete && img.naturalWidth;
  // A building stands on flat ground just above the highest corner of its plot.
  function floorOf(b) {
    let top = -9;
    for (let y = b.ty; y <= b.ty + b.h; y++) for (let x = b.tx; x <= b.tx + b.w; x++) top = Math.max(top, hv(x, y));
    return top + 0.15;
  }
  const isoPt = (x, y, h) => { const p = isoAt(x * TILE, y * TILE, h); return [p.ix, p.iy]; };
  function fillPoly(P, style) { ctx.beginPath(); P.forEach(([x, y], k) => k ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath(); ctx.fillStyle = style; ctx.fill(); }

  // Under a building: a flat earthen floor, with its sides showing where the ground falls away.
  // Camps and villages sit on trodden ground instead; earthworks need nothing.
  function drawFloor(b) {
    if (b.def.wall != null) return;
    const x0 = b.tx, y0 = b.ty, x1 = b.tx + b.w, y1 = b.ty + b.h;
    if (b.type === 'camp' || b.type === 'warcamp' || b.type === 'village') {
      const P = [];
      for (let x = x0; x <= x1; x++) P.push(isoPt(x, y0, hv(x, y0)));
      for (let y = y0 + 1; y <= y1; y++) P.push(isoPt(x1, y, hv(x1, y)));
      for (let x = x1 - 1; x >= x0; x--) P.push(isoPt(x, y1, hv(x, y1)));
      for (let y = y1 - 1; y > y0; y--) P.push(isoPt(x0, y, hv(x0, y)));
      fillPoly(P, b.type === 'village' ? 'rgba(150, 120, 80, .55)' : 'rgba(110, 86, 60, .6)');
      return;
    }
    const top = floorOf(b);
    for (let x = x0; x < x1; x++) fillPoly([isoPt(x, y1, top), isoPt(x + 1, y1, top), isoPt(x + 1, y1, hv(x + 1, y1)), isoPt(x, y1, hv(x, y1))], '#8a6d4a');
    for (let y = y0; y < y1; y++) fillPoly([isoPt(x1, y, top), isoPt(x1, y + 1, top), isoPt(x1, y + 1, hv(x1, y + 1)), isoPt(x1, y, hv(x1, y))], '#6b5238');
    const F = [isoPt(x0, y0, top), isoPt(x1, y0, top), isoPt(x1, y1, top), isoPt(x0, y1, top)];
    fillPoly(F, b.type === 'farm' ? '#6a4a30' : '#ad9168');
    ctx.strokeStyle = 'rgba(60, 44, 26, .55)'; ctx.lineWidth = 1; ctx.stroke();
    if (b.type === 'farm') {                          // tilled rows, green or ripe
      const ripe = b.built >= 1;
      for (let r = 0; r < b.h * 3; r++) {
        const v = y0 + (r + 0.5) / 3, A = isoPt(x0 + 0.1, v, top), B = isoPt(x1 - 0.1, v, top);
        ctx.strokeStyle = ripe ? '#c9a14c' : '#7e8a40'; ctx.lineWidth = 2.4;
        ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); ctx.stroke();
      }
    }
  }

  function drawBuilding(b, selected, now) {
    const top = b.def.wall != null ? heightAt(b.x, b.y) : floorOf(b);
    const { ix, iy } = isoAt(b.x, b.y, top);
    const w = b.w * TILE, h = b.h * TILE;
    ctx.save();
    if (b.built < 1) ctx.globalAlpha = 0.55;
    if (b.def.wall != null) drawEarthwork(b);
    else if (b.type === 'camp' || b.type === 'warcamp') drawCamp(b, now);
    else if (b.type === 'village') drawVillage(b);
    else if (b.type === 'farm') {
      // the granary hut from the farm's picture, on its tilled plot
      if (ready(IMG.farm)) ctx.drawImage(IMG.farm, 50, 14, 58, 66, ix - 26, iy - 52, 52, 59);
    } else {
      const sp = SPRITE[PICTURE[b.type]] || SPRITE.storehouse, img = IMG[PICTURE[b.type]] || IMG.storehouse;
      const front = isoAt((b.tx + b.w) * TILE, (b.ty + b.h) * TILE, top), sc = (b.w + b.h) * TILE / sp.span;
      if (ready(img)) ctx.drawImage(img, ix - sp.cx * sc, front.iy - sp.by * sc, img.naturalWidth * sc, img.naturalHeight * sc);
      else { ctx.fillStyle = '#bfa97c'; ctx.fillRect(ix - w * 0.5, iy - h, w, h); }
      if (b.type === 'hall') banner(ix + 6, iy - h * 1.2, '#d4a017', now, b.id);
      if (b.type === 'stables') fence(b, top);
    }
    ctx.restore();

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

  // A cloth on a pole, stirring in the wind.
  function banner(x, y, color, now, id) {
    ctx.strokeStyle = '#3b2a1a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y + 26); ctx.lineTo(x, y - 4); ctx.stroke();
    const wave = Math.sin(now / 260 + id) * 2;
    ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(x + 1, y - 4);
    ctx.quadraticCurveTo(x + 8, y - 6 + wave, x + 15, y - 3 + wave); ctx.lineTo(x + 15, y + 6 + wave);
    ctx.quadraticCurveTo(x + 8, y + 4 + wave, x + 1, y + 6); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 0.8; ctx.stroke();
  }
  // Rails along the front of the stables' yard.
  function fence(b, top) {
    const x0 = b.tx, y1 = b.ty + b.h, x1 = b.tx + b.w;
    ctx.strokeStyle = '#6b4a2a'; ctx.lineWidth = 1.5;
    const A = isoPt(x0 + 0.1, y1 - 0.1, top), B = isoPt(x1 - 0.1, y1 - 0.1, top), C = isoPt(x1 - 0.1, b.ty + 0.1, top);
    for (const dy of [-3, -6]) { ctx.beginPath(); ctx.moveTo(A[0], A[1] + dy); ctx.lineTo(B[0], B[1] + dy); ctx.lineTo(C[0], C[1] + dy); ctx.stroke(); }
    ctx.fillStyle = '#4e3420';
    for (let k = 0; k <= 6; k++) { const t = k / 6, P = k <= 3 ? [A[0] + (B[0] - A[0]) * t * 2, A[1] + (B[1] - A[1]) * t * 2] : [B[0] + (C[0] - B[0]) * (t - 0.5) * 2, B[1] + (C[1] - B[1]) * (t - 0.5) * 2]; ctx.fillRect(P[0] - 1, P[1] - 8, 2, 8); }
  }

  // Earthworks (Alma 50:1–3): a ridge of earth joined to the ones beside it, with pickets on top once they're made. A gate is a timber door in the ridge.
  function drawEarthwork(b) {
    const cxw = (b.tx + 0.5) * TILE, cyw = (b.ty + 0.5) * TILE;
    const links = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => {
      const x = b.tx + dx, y = b.ty + dy;
      if (!W.inBounds(x, y)) return false;
      const n = W.ents.get(W.occ[y * MAP_W + x]);
      return n && n.kind === 'building' && n.def.wall != null && !n.dead;
    });
    const up = (wx, wy, k) => isoAt(wx, wy, heightAt(wx, wy) + k);
    const ends = links.map(([dx, dy]) => [cxw + dx * TILE * 0.5, cyw + dy * TILE * 0.5]);
    const ridge = (k, width, color, ox = 0, oy = 0) => {
      const c0 = up(cxw, cyw, k);
      ctx.strokeStyle = color; ctx.lineWidth = width;
      ctx.beginPath();
      if (!ends.length) { ctx.moveTo(c0.ix - 6 + ox, c0.iy + oy); ctx.lineTo(c0.ix + 6 + ox, c0.iy + oy); }
      for (const [ex, ey] of ends) { const e = up(ex, ey, k); ctx.moveTo(c0.ix + ox, c0.iy + oy); ctx.lineTo(e.ix + ox, e.iy + oy); }
      ctx.stroke();
    };
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ridge(0, 15, 'rgba(20, 14, 6, .3)', 5, 2);
    ridge(0.35, 14, '#6e5132');
    ridge(0.8, 10, '#957046');
    ridge(1.1, 4, '#c19a62', -1.5, -1);
    if (b.type === 'gate') {
      const c0 = up(cxw, cyw, 0.4);
      ctx.fillStyle = '#5a3c22'; ctx.fillRect(c0.ix - 7, c0.iy - 10, 14, 11);
      ctx.fillStyle = '#8a5f37'; ctx.fillRect(c0.ix - 6, c0.iy - 9, 5.5, 9); ctx.fillRect(c0.ix + 0.5, c0.iy - 9, 5.5, 9);
    } else if (W.researched.pickets) {
      const stakes = ends.length ? ends.flatMap(([ex, ey]) => [0.2, 0.55, 0.9].map(t => [cxw + (ex - cxw) * t, cyw + (ey - cyw) * t])) : [[cxw, cyw]];
      for (const [sx, sy] of stakes) {
        const p = up(sx, sy, 1.1);
        ctx.strokeStyle = '#5c3e22'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(p.ix, p.iy); ctx.lineTo(p.ix, p.iy - 8); ctx.stroke();
        ctx.fillStyle = '#d2b07c'; ctx.fillRect(p.ix - 1, p.iy - 9, 2, 1.5);
      }
    }
  }

  // A hide tent at (wx, wy), s tiles long, its ridge running along x.
  function tent(wx, wy, s, hide, dark, ground) {
    const L = s * 0.5 * TILE, D = s * 0.36 * TILE, H = s * 1.8;
    const p = (dx, dy, up) => isoPt((wx + dx) / TILE, (wy + dy) / TILE, ground + up);
    fillPoly([p(-L, -D, 0), p(L, -D, 0), p(L, 0, H), p(-L, 0, H)], dark);        // the far side
    fillPoly([p(-L, D, 0), p(L, D, 0), p(L, 0, H), p(-L, 0, H)], hide);          // the near side
    fillPoly([p(L, -D, 0), p(L, D, 0), p(L, 0, H)], dark);                         // the end, in shade
    const d = [p(L, -D * 0.35, 0), p(L, D * 0.35, 0), p(L, 0, H * 0.55)];
    fillPoly(d, 'rgba(20, 12, 8, .75)');
    ctx.strokeStyle = 'rgba(30, 18, 10, .7)'; ctx.lineWidth = 1;
    const r0 = p(-L, 0, H), r1 = p(L, 0, H);
    ctx.beginPath(); ctx.moveTo(r0[0], r0[1]); ctx.lineTo(r1[0], r1[1]); ctx.stroke();
  }
  // The robbers' camps (3 Nephi 4:1) and the Lamanite war camp: tents round a fire; the war camp walled with stakes.
  function drawCamp(b, now) {
    const x0 = b.tx, y0 = b.ty, x1 = b.tx + b.w, y1 = b.ty + b.h, g = heightAt(b.x, b.y), war = b.type === 'warcamp';
    const hide = war ? '#b8956a' : '#93402f', dark = war ? '#7c6040' : '#5e281e';
    const stakes = (pts) => {
      for (const [x, y] of pts) {
        const p = isoPt(x, y, hv(Math.round(x), Math.round(y)));
        ctx.strokeStyle = '#4a3220'; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(p[0], p[1] - 13); ctx.stroke();
        ctx.fillStyle = '#c8a878'; ctx.beginPath(); ctx.moveTo(p[0] - 1.3, p[1] - 13); ctx.lineTo(p[0], p[1] - 16); ctx.lineTo(p[0] + 1.3, p[1] - 13); ctx.fill();
      }
    };
    const along = (ax, ay, bx, by, n) => Array.from({ length: n + 1 }, (_, k) => [ax + (bx - ax) * k / n, ay + (by - ay) * k / n]);
    if (war) stakes([...along(x0, y0, x1, y0, 10), ...along(x0, y0, x0, y1, 10)]);     // the far walls first
    const spots = war ? [[0.3, 0.3], [0.72, 0.28], [0.28, 0.7]] : [[0.28, 0.3], [0.7, 0.36], [0.32, 0.72]];
    for (const [u, v] of spots) tent((x0 + u * b.w) * TILE, (y0 + v * b.h) * TILE, war ? 1.2 : 1, hide, dark, g);
    // the fire
    const f = isoPt(x0 + b.w * 0.62, y0 + b.h * 0.66, g), flick = Math.sin(now / 90 + b.id) * 1.5;
    ctx.fillStyle = '#3a2516'; ctx.fillRect(f[0] - 5, f[1] - 2, 10, 3);
    ctx.fillStyle = 'rgba(249, 115, 22, .9)'; blob(ctx, f[0], f[1] - 5 - flick * 0.4, 4, 6 + flick);
    ctx.fillStyle = 'rgba(253, 224, 71, .95)'; blob(ctx, f[0], f[1] - 4, 2, 3.5 + flick * 0.5);
    if (war) {
      stakes([...along(x1, y0, x1, y1, 10), ...along(x0, y1, x1, y1, 10)]);
      banner(isoPt(x0 + b.w * 0.5, y0 + b.h * 0.5, g)[0], isoPt(x0 + b.w * 0.5, y0 + b.h * 0.5, g)[1] - 34, '#9f1239', now, b.id);
    }
  }
  // A village: a few huts (the storehouse's picture, small) round a yard.
  function drawVillage(b) {
    if (!ready(IMG.storehouse)) return;
    const sp = SPRITE.storehouse, sc = 1.6 * TILE / sp.span;
    for (const [u, v] of [[0.3, 0.3], [0.75, 0.4], [0.35, 0.78]]) {
      const wx = (b.tx + u * b.w) * TILE, wy = (b.ty + v * b.h) * TILE, p = toIso(wx, wy);
      const front = toIso(wx + TILE * 0.8, wy + TILE * 0.8);
      ctx.drawImage(IMG.storehouse, p.ix - sp.cx * sc, front.iy - sp.by * sc, IMG.storehouse.naturalWidth * sc, IMG.storehouse.naturalHeight * sc);
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
        mx: (ix - WORLD_ISO_MIN_X) / TERR_W * mw,
        my: (iy + PAD) / TERR_H * mh
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

    // Where raiders are gathering: a pulsing red mark at the way in.
    for (const m of mission.markers ? mission.markers(W) : []) {
      if (!m.always) continue;
      const pt = toMini((m.x + 0.5) * TILE, (m.y + 0.5) * TILE), r = (3 + 2 * Math.sin(now / 200)) * dpr;
      mctx.fillStyle = 'rgba(248,113,113,.9)'; mctx.beginPath(); mctx.arc(pt.mx, pt.my, Math.max(2, r), 0, 7); mctx.fill();
    }

    // Where something of yours was just attacked: a red ring, flashing for a few seconds.
    for (const a of W.alarms) {
      const age = W.t - a.t;
      if (age > 6) continue;
      const pt = toMini(a.x, a.y);
      mctx.strokeStyle = `rgba(248,113,113,${1 - age / 6})`; mctx.lineWidth = 2 * dpr;
      mctx.beginPath(); mctx.arc(pt.mx, pt.my, (3 + (age * 8) % 8) * dpr, 0, 7); mctx.stroke();
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
    // With people chosen, a click on anything but a different one of your own units is an order.
    if (units.length && !(e && e.kind === 'unit' && selectable(e) && (!sel.includes(e.id) || double)) && !(e && e.kind === 'building' && e.team === 'p' && !canWorkOn(units, e))) {
      return command(wx, wy, sx, sy);
    }
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
    placing = type; wallLine = null; touchSpot = null;
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
  let touchSpot = null, touchy = false;                // where a building would go, after a first tap; and whether this is a touch screen
  cv.addEventListener('contextmenu', e => e.preventDefault());
  cv.addEventListener('pointerdown', e => {
    if (!W || modal) return;
    cv.setPointerCapture(e.pointerId);
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    touchy = e.pointerType !== 'mouse';
    if (ptrs.size === 2) {
      const [a, b] = [...ptrs.values()];
      box = null; wallLine = null;
      gesture = { kind: 'pinch', d0: Math.hypot(a.x - b.x, a.y - b.y) || 1, z0: cam.z, mid: { x: cam.x + (a.x + b.x) / 2 / cam.z, y: cam.y + (a.y + b.y) / 2 / cam.z } };
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
    if (g.kind === 'press' && g.touch && placing && placing !== 'wall') {
      // On a touch screen there's no pointer to show where it would go: the first tap shows it, a second tap there builds it.
      const spot = topLeft(placing, p.x, p.y);
      if (!touchSpot || touchSpot[0] !== spot[0] || touchSpot[1] !== spot[1]) {
        touchSpot = spot; hover = p;
        toast(W.canPlace(placing, spot[0], spot[1]) ? 'Tap it again to build it there.' : 'It can\'t go there: tap open ground.', 'me');
        return;
      }
      touchSpot = null;
    }
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
    return groundAt(WORLD_ISO_MIN_X + mx * TERR_W, my * TERR_H - PAD);
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
  const CAMEO_MAP = {
    'deploy': 'assets/cameo_moroni.png?v=9',
    'train:worker': 'assets/cameo_worker.png?v=1',
    'train:spearman': 'assets/cameo_spearman.png?v=9',
    'train:stripling': 'assets/cameo_stripling.png?v=9',
    'train:moroni': 'assets/cameo_moroni.png?v=9',
    'build:tower': 'assets/cameo_tower.png?v=9',
    'build:armory': 'assets/cameo_armory.png?v=9'
  };
  const cmd = (act, name, cost, cls) => {
    const icon = CAMEO_MAP[act];
    const imgHtml = icon ? `<img src="${icon}" style="width:36px;height:36px;border-radius:3px;border:1px solid #d97706;object-fit:cover;margin-bottom:2px;" alt="" />` : '';
    return `<button class="cmd ${cls || ''}" data-cmd="${act}">${imgHtml}<span>${name}</span>${cost ? `<small>${cost}</small>` : ''}</button>`;
  };
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
      h += cmd('stop', 'Stop', touchy ? '' : 'H');
      h += cmd('letgo', 'Let go', touchy ? '' : 'Esc');
      return h;
    }
    if (b.built < 1) return `<div class="note">Choose workers, then tap this to build it.</div>`;
    let h = '';
    for (const t of (b.def.trains || []).filter(t => W.visible(UNITS[t]))) {
      const why = W.whyNotTrain(t);
      h += cmd('train:' + t, UNITS[t].name, why ? esc(why) : costHtml(UNITS[t].cost), why || !W.canAfford(UNITS[t].cost) ? 'poor' : '');
    }
    // What this building can make: in free battle, the armory's list; in a mission, the mission's own armor.
    const keys = W.researchAt(b);
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
    else if (act === 'letgo') setSel([]);
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
    // Opening a question starts the wait, and it comes back later unless it's answered right,
    // so closing one you don't know isn't a way to skip to an easier one.
    const qi = council.queue.shift(), q = qs[qi];
    council.queue.push(qi); council.nextAt = W.t + 30;
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
        W.gain('grain', 40); W.gain('timber', 60); council.right++;
        council.queue = council.queue.filter(i => i !== qi);
        council.nextAt = W.t + 60;
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
    const lock = anyRead ? '' : '<div class="lock">🔒 Read a mission\'s chapter to open the skirmishes.</div>';
    const freeCard = `<h2 class="camp">Skirmish</h2><p class="camp-about">Red Alert's way of playing: plant the standard of liberty and build your city up through the tech tree. Then hold off the raids, or tear down the Lamanite war camp.</p>
      <div class="cards"><div class="card ${anyRead ? '' : 'locked'}">
        <div class="kicker">The council asks about every chapter you've read</div>
        <h2>${esc(WILD.title)}</h2>
        ${save.won.wild ? starsHtml(save.won.wild) : ''}
        <p>${esc(WILD.goals)}</p>
        ${lock}
        ${Object.keys(WILD.LENGTHS).map(len => `<div class="row" style="align-items:center"><span style="min-width:9em;font-size:13px"><b>${esc(WILD.LENGTHS[len].name)}</b> · ${esc(WILD.LENGTHS[len].about)}</span>${Object.keys(WILD.LEVELS).map(l => `<button class="btn ${anyRead && l === 'easy' && len === 'short' ? 'go' : ''}" data-wild="${l}:${len}" ${anyRead ? '' : 'disabled'}>${WILD.LEVELS[l].name}</button>`).join('')}</div>`).join('')}
      </div><div class="card ${anyRead ? '' : 'locked'}">
        <div class="kicker">The council asks about every chapter you've read</div>
        <h2>Free battle</h2>
        ${save.won.free ? starsHtml(save.won.free) : ''}
        <p>${esc(FREE.goals)}</p>
        ${lock}
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
      const r = e.target.closest('[data-read]'), p = e.target.closest('[data-play]'), f = e.target.closest('[data-free]'), w = e.target.closest('[data-wild]');
      if (f && !f.disabled) { FREE.level = f.dataset.free; return briefing(FREE); }
      if (w && !w.disabled) { [WILD.level, WILD.length] = w.dataset.wild.split(':'); return briefing(WILD); }
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
      <div class="kicker">${m.kicker ? esc(m.kicker()) : m.free ? 'Free battle · ' + esc(m.LEVELS[m.level].name) : esc(CAMPAIGNS.find(c => c.id === m.campaign).title) + ' · Mission ' + (inCampaign(m).indexOf(m) + 1) + ' · ' + esc(m.chapter)} · ${esc(m.year)}</div>
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
    buildHeights();
    sel = []; placing = null; wallLine = null; painted = null; miniDirty = true; shownMsgs = 0; endShown = false; particles.length = 0;
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
    if (window.LIB_MULTI && window.LIB_MULTI.drawCursor) window.LIB_MULTI.drawCursor(ctx);
  }

  $('iGrain').innerHTML = ICON.grain; $('iTimber').innerHTML = ICON.timber; $('iPeople').innerHTML = ICON.people;
  window.addEventListener('resize', resize);
  resize();
  home();
  requestAnimationFrame(frame);
  // A window on the game for automated play-throughs in a browser.
  window.LIB_UI = { get W() { return W; }, get mission() { return mission; }, get sel() { return sel; }, get selEnts() { return selEnts(); }, cam, begin: (id, level, length) => { const m = id === 'free' ? FREE : id === 'wild' ? WILD : MISSIONS.find(m => m.id === id); if (level) m.level = level; if (length) m.length = length; begin(m); }, toWorld, lookAt,
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
