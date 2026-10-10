import fs from 'fs';

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Title of Liberty · Terrain & Shroud Interactive Mockup</title>
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800;900&display=swap" rel="stylesheet">
<style>
  :root {
    --ink: #06070c; --panel: rgba(14, 18, 32, 0.95); --line: rgba(255, 255, 255, 0.16);
    --gold: #fcd34d; --gold-deep: #d97706; --sky: #38bdf8; --green: #22c55e;
  }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background: var(--ink); color: #fff; font-family: 'Outfit', system-ui, sans-serif; user-select: none; }
  
  #canvas { position: absolute; inset: 0; width: 100%; height: 100%; cursor: grab; }
  #canvas:active { cursor: grabbing; }

  /* Top Control Bar */
  #topBar {
    position: absolute; top: 12px; left: 16px; right: 16px; height: 56px;
    display: flex; align-items: center; justify-content: space-between;
    padding: 0 16px; background: var(--panel); border: 1px solid var(--line);
    border-radius: 12px; backdrop-filter: blur(12px); z-index: 20;
    box-shadow: 0 8px 32px rgba(0,0,0,0.65);
  }
  .title-group { display: flex; align-items: center; gap: 12px; }
  .badge { background: linear-gradient(135deg, #f59e0b, #d97706); color: #000; font-weight: 900; font-size: 11px; padding: 4px 9px; border-radius: 6px; letter-spacing: 0.5px; text-transform: uppercase; }
  .title-text { font-size: 15px; font-weight: 800; color: #fff; }
  
  .mode-buttons { display: flex; background: rgba(0,0,0,0.5); padding: 4px; border-radius: 10px; gap: 4px; border: 1px solid var(--line); }
  .btn {
    border: none; background: transparent; color: #94a3b8; font-weight: 700; font-size: 13px;
    padding: 7px 16px; border-radius: 8px; cursor: pointer; transition: all 0.15s ease;
  }
  .btn:hover { color: #fff; background: rgba(255,255,255,0.08); }
  .btn.active { color: #000; background: var(--gold); box-shadow: 0 2px 10px rgba(252, 211, 77, 0.45); }

  .hint { font-size: 12px; color: #94a3b8; font-weight: 600; display: flex; align-items: center; gap: 6px; }
  .hint b { color: var(--gold); }

  /* Westwood Radar Minimap */
  #radarContainer {
    position: absolute; bottom: 20px; right: 20px; width: 190px; height: 190px;
    background: #03060c; border: 2px solid #22c55e; border-radius: 50%;
    box-shadow: 0 0 24px rgba(34, 197, 94, 0.35), inset 0 0 16px rgba(34, 197, 94, 0.2);
    overflow: hidden; z-index: 20; pointer-events: none;
  }
  #radarCanvas { width: 100%; height: 100%; display: block; border-radius: 50%; }
  #radarLabel {
    position: absolute; top: 7px; width: 100%; text-align: center;
    font-size: 9px; font-weight: 900; letter-spacing: 1.5px; color: #22c55e; text-shadow: 0 0 4px #22c55e;
  }

  /* Legend / Info Card */
  #legend {
    position: absolute; bottom: 20px; left: 20px; width: 300px;
    background: var(--panel); border: 1px solid var(--line); border-radius: 12px;
    padding: 14px 16px; z-index: 20; font-size: 12px; line-height: 1.5; color: #cbd5e1;
    box-shadow: 0 8px 32px rgba(0,0,0,0.65); backdrop-filter: blur(10px);
  }
  #legend h3 { margin: 0 0 6px 0; font-size: 14px; font-weight: 800; color: #fff; display: flex; justify-content: space-between; }
  .legend-item { display: flex; align-items: flex-start; gap: 8px; margin-top: 6px; }
  .dot { width: 10px; height: 10px; border-radius: 3px; flex-shrink: 0; margin-top: 4px; }
</style>
</head>
<body>

<canvas id="canvas"></canvas>

<!-- Top Bar Controls -->
<div id="topBar">
  <div class="title-group">
    <span class="badge">RA2 Interactive Mockup</span>
    <span class="title-text">Canyon Cliffs, Waterfalls & Westwood Shroud</span>
  </div>
  <div class="mode-buttons">
    <button class="btn active" id="btnStart" onclick="setMode('start')">1. Game Start (Shroud Active)</button>
    <button class="btn" id="btnScout" onclick="setMode('scout')">2. Move Guard (Carve Shroud)</button>
    <button class="btn" id="btnFull" onclick="setMode('full')">3. Full Map (Art View)</button>
  </div>
  <div class="hint">
    <span>💡 <b>Tip:</b> Click & drag to pan • Scroll to zoom</span>
  </div>
</div>

<!-- Westwood Radar -->
<div id="radarContainer">
  <div id="radarLabel">WESTWOOD RADAR · SWEEP</div>
  <canvas id="radarCanvas" width="190" height="190"></canvas>
</div>

<!-- Legend Card -->
<div id="legend">
  <h3>
    <span>Red Alert 2 Elements</span>
    <span style="color:var(--gold); font-size:11px;">2:1 Isometric</span>
  </h3>
  <div class="legend-item"><span class="dot" style="background:#b48356;"></span> <span><b>Vertical Canyon Cliffs:</b> 52px tall drop, stratified limestone/sandstone layers, sunlit rims & talus boulders</span></div>
  <div class="legend-item"><span class="dot" style="background:#38bdf8;"></span> <span><b>Cascading Waterfalls:</b> Plunging white foam rapids, billowing spray mist & splash basins</span></div>
  <div class="legend-item"><span class="dot" style="background:#0284c7;"></span> <span><b>River Sidon:</b> Azure current, broad golden sand beaches & white surf lines</span></div>
  <div class="legend-item"><span class="dot" style="background:#06070c; border:1px solid #475569;"></span> <span><b>Westwood Shroud:</b> 100% pitch black, permanently revealed by moving units</span></div>
</div>

<script>
(function() {
  const cv = document.getElementById('canvas');
  const ctx = cv.getContext('2d');
  const rcv = document.getElementById('radarCanvas');
  const rctx = rcv.getContext('2d');

  let vw = 0, vh = 0, dpr = 1;
  const TILE = 32;
  const MAP_W = 64, MAP_H = 48;
  const WORLD_ISO_MIN_X = -MAP_H * TILE;
  const WORLD_ISO_MAX_X = MAP_W * TILE;
  const WORLD_ISO_W = WORLD_ISO_MAX_X - WORLD_ISO_MIN_X;
  const WORLD_ISO_H = (MAP_W + MAP_H) * TILE * 0.5;
  const ISO_OFFSET_X = -WORLD_ISO_MIN_X;

  const toIso = (wx, wy) => ({ ix: (wx - wy), iy: (wx + wy) * 0.5 });
  const fromIso = (ix, iy) => ({ wx: (ix + 2 * iy) * 0.5, wy: (2 * iy - ix) * 0.5 });

  // Camera
  const cam = { x: 0, y: 0, z: 1.0 };
  let mode = 'start'; // 'start', 'scout', 'full'

  // Image assets
  const IMG = {};
  ['grass_seamless', 'wheat_seamless', 'stronghold', 'tower', 'spearman', 'moroni'].forEach(name => {
    IMG[name] = new Image();
    IMG[name].src = 'assets/' + name + '.png';
  });

  let grassPattern = null, wheatPattern = null;
  function updatePatterns() {
    if (!grassPattern && IMG.grass_seamless.complete && IMG.grass_seamless.naturalWidth > 0) {
      try { grassPattern = tctx.createPattern(IMG.grass_seamless, 'repeat'); } catch (e) {}
    }
    if (!wheatPattern && IMG.wheat_seamless.complete && IMG.wheat_seamless.naturalWidth > 0) {
      try { wheatPattern = tctx.createPattern(IMG.wheat_seamless, 'repeat'); } catch (e) {}
    }
  }
  IMG.grass_seamless.onload = () => { updatePatterns(); renderTerrain(); };
  IMG.wheat_seamless.onload = () => { updatePatterns(); renderTerrain(); };
  IMG.stronghold.onload = () => {};
  IMG.tower.onload = () => {};
  IMG.spearman.onload = () => {};

  // Terrain Grid
  const T = { GRASS: 0, FOREST: 1, WATER: 2, FORD: 3, ROCK: 4, FIELD: 5 };
  const tiles = new Uint8Array(MAP_W * MAP_H);

  function hash(x, y, k) {
    let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(k | 0, 1442695041);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }

  // Build the Map
  for (let x = 0; x < MAP_W; x++) {
    const isPass = Math.abs(x - 11) <= 1 || Math.abs(x - 32) <= 1 || Math.abs(x - 53) <= 1;
    const depth = 2 + (x % 3 === 0 ? 1 : 0);
    for (let y = 0; y <= depth; y++) {
      if (!isPass) tiles[y * MAP_W + x] = T.ROCK;
    }
    for (let y = depth + 1; y < 10; y++) {
      if (!isPass && hash(x, y, 1) < 0.65) tiles[y * MAP_W + x] = T.FOREST;
    }
  }

  // River Sidon winding west to east at row 24
  for (let x = 0; x < MAP_W; x++) {
    const cy = Math.round(24 + 2.2 * Math.sin(x / 6.5) + Math.sin(x / 2.7) * 0.6);
    for (let y = cy; y < cy + 2; y++) {
      const isBridge = (x >= 8 && x <= 10) || (x >= 30 && x <= 32) || (x >= 50 && x <= 52);
      tiles[y * MAP_W + x] = isBridge ? T.FORD : T.WATER;
    }
  }

  // Waterfall 1 (West) & Headwater Plunge Pool at (5, 4..5)
  [[5, 4], [6, 4], [5, 5], [6, 5], [4, 5]].forEach(([x, y]) => tiles[y * MAP_W + x] = T.WATER);
  for (let y = 6; y <= 23; y++) {
    const sx = Math.round(4 + Math.sin(y / 3) * 1.2);
    tiles[y * MAP_W + sx] = (y >= 13 && y <= 15) ? T.FORD : T.WATER;
  }
  // Waterfall 2 (East) Plunge Pool at (45, 3..4)
  [[45, 3], [46, 3], [45, 4], [46, 4]].forEach(([x, y]) => tiles[y * MAP_W + x] = T.WATER);

  // Forests & Wheat Fields
  for (let y = 30; y < 45; y++) {
    for (let x = 20; x < 45; x++) {
      if ((x >= 23 && x <= 26 && y >= 34 && y <= 36) || (x >= 37 && x <= 40 && y >= 34 && y <= 36)) {
        tiles[y * MAP_W + x] = T.FIELD;
      }
      if (hash(x, y, 9) < 0.22 && tiles[y * MAP_W + x] === T.GRASS) {
        tiles[y * MAP_W + x] = T.FOREST;
      }
    }
  }

  // ---------------- Render Terrain to Offscreen Canvas ----------------
  const terrainCv = document.createElement('canvas');
  terrainCv.width = WORLD_ISO_W; terrainCv.height = WORLD_ISO_H;
  const tctx = terrainCv.getContext('2d');

  function renderTerrain() {
    updatePatterns();
    tctx.fillStyle = '#497d22';
    tctx.fillRect(0, 0, WORLD_ISO_W, WORLD_ISO_H);

    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        paintTile(tctx, x, y);
      }
    }
  }

  function tileDiamond(x, y) {
    const top = { x: (x - y) * TILE + ISO_OFFSET_X, y: (x + y) * TILE * 0.5 };
    const right = { x: (x + 1 - y) * TILE + ISO_OFFSET_X, y: (x + 1 + y) * TILE * 0.5 };
    const bottom = { x: (x - y) * TILE + ISO_OFFSET_X, y: (x + y + 2) * TILE * 0.5 };
    const left = { x: (x - y - 1) * TILE + ISO_OFFSET_X, y: (x + y + 1) * TILE * 0.5 };
    return { top, right, bottom, left, cx: top.x, cy: (top.y + bottom.y) * 0.5 };
  }

  function paintTile(c, x, y) {
    const t = tiles[y * MAP_W + x], h = k => hash(x, y, k);
    const d = tileDiamond(x, y);

    const isLand = (tx, ty) => {
      if (tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H) return false;
      const nt = tiles[ty * MAP_W + tx];
      return nt !== T.WATER && nt !== T.FORD;
    };
    const isRock = (tx, ty) => tx >= 0 && ty >= 0 && tx < MAP_W && ty < MAP_H && tiles[ty * MAP_W + tx] === T.ROCK;
    const isWater = (tx, ty) => tx >= 0 && ty >= 0 && tx < MAP_W && ty < MAP_H && (tiles[ty * MAP_W + tx] === T.WATER || tiles[ty * MAP_W + tx] === T.FORD);
    const nearLand = isLand(x, y - 1) || isLand(x + 1, y) || isLand(x, y + 1) || isLand(x - 1, y);

    if (t === T.WATER || t === T.FORD) {
      // Azure River Sidon
      const wGrad = c.createLinearGradient(d.left.x, d.top.y, d.right.x, d.bottom.y);
      wGrad.addColorStop(0, '#0284c7');
      wGrad.addColorStop(0.35, '#0369a1');
      wGrad.addColorStop(0.7, '#0284c7');
      wGrad.addColorStop(1, '#075985');
      c.fillStyle = wGrad;
      c.beginPath(); c.moveTo(d.top.x, d.top.y); c.lineTo(d.right.x, d.right.y); c.lineTo(d.bottom.x, d.bottom.y); c.lineTo(d.left.x, d.left.y); c.closePath(); c.fill();

      // Broad Golden Sand Shorelines & Surf
      if (nearLand) {
        c.strokeStyle = '#d4a366'; c.lineWidth = 6;
        if (isLand(x, y - 1)) { c.beginPath(); c.moveTo(d.top.x, d.top.y); c.lineTo(d.right.x, d.right.y); c.stroke(); }
        if (isLand(x - 1, y)) { c.beginPath(); c.moveTo(d.left.x, d.left.y); c.lineTo(d.top.x, d.top.y); c.stroke(); }
        if (isLand(x, y + 1)) { c.beginPath(); c.moveTo(d.left.x, d.left.y); c.lineTo(d.bottom.x, d.bottom.y); c.stroke(); }
        if (isLand(x + 1, y)) { c.beginPath(); c.moveTo(d.bottom.x, d.bottom.y); c.lineTo(d.right.x, d.right.y); c.stroke(); }

        c.strokeStyle = '#b88648'; c.lineWidth = 2.4;
        if (isLand(x, y - 1)) { c.beginPath(); c.moveTo(d.top.x, d.top.y + 1); c.lineTo(d.right.x - 1, d.right.y); c.stroke(); }
        if (isLand(x - 1, y)) { c.beginPath(); c.moveTo(d.left.x + 1, d.left.y); c.lineTo(d.top.x, d.top.y + 1); c.stroke(); }
        if (isLand(x, y + 1)) { c.beginPath(); c.moveTo(d.left.x + 1, d.left.y); c.lineTo(d.bottom.x, d.bottom.y - 1); c.stroke(); }
        if (isLand(x + 1, y)) { c.beginPath(); c.moveTo(d.bottom.x, d.bottom.y - 1); c.lineTo(d.right.x - 1, d.right.y); c.stroke(); }

        c.strokeStyle = 'rgba(255,255,255,0.85)'; c.lineWidth = 1.6;
        if (isLand(x, y - 1)) { c.beginPath(); c.moveTo(d.top.x, d.top.y + 2); c.lineTo(d.right.x - 2, d.right.y); c.stroke(); }
        if (isLand(x - 1, y)) { c.beginPath(); c.moveTo(d.left.x + 2, d.left.y); c.lineTo(d.top.x, d.top.y + 2); c.stroke(); }
        if (isLand(x, y + 1)) { c.beginPath(); c.moveTo(d.left.x + 2, d.left.y); c.lineTo(d.bottom.x, d.bottom.y - 2); c.stroke(); }
        if (isLand(x + 1, y)) { c.beginPath(); c.moveTo(d.bottom.x, d.bottom.y - 2); c.lineTo(d.right.x - 2, d.right.y); c.stroke(); }

        if (h(12) < 0.6) {
          c.fillStyle = '#78716c';
          c.beginPath(); c.arc(d.cx - 6 + h(13) * 12, d.cy - 3 + h(14) * 6, 1.6, 0, 7); c.fill();
        }
      }

      // Water Ripple Waves
      c.strokeStyle = 'rgba(224, 242, 254, 0.55)'; c.lineWidth = 1.4;
      for (let k = 0; k < 3; k++) {
        const fx = d.cx - 10 + h(k + 30) * 20, fy = d.cy - 4 + h(k + 35) * 8;
        c.beginPath(); c.moveTo(fx - 8, fy + 1); c.quadraticCurveTo(fx, fy - 1.5, fx + 8, fy + 1); c.stroke();
      }

      // Waterfall Plunge Pool if below cliff
      if (isRock(x, y - 1)) {
        const poolX = d.top.x, poolY = d.top.y;
        const poolGrad = c.createRadialGradient(poolX, poolY + 4, 3, poolX, poolY + 4, 24);
        poolGrad.addColorStop(0, '#ffffff'); poolGrad.addColorStop(0.35, 'rgba(224, 242, 254, 0.92)'); poolGrad.addColorStop(0.7, 'rgba(56, 189, 248, 0.75)'); poolGrad.addColorStop(1, 'rgba(2, 132, 199, 0)');
        c.fillStyle = poolGrad;
        c.beginPath(); c.ellipse(poolX, poolY + 4, 26, 13, 0, 0, 7); c.fill();
        c.strokeStyle = 'rgba(255, 255, 255, 0.85)'; c.lineWidth = 1.6;
        c.beginPath(); c.ellipse(poolX, poolY + 4, 15, 7.5, 0, 0, 7); c.stroke();
      }

      // Stone Bridge
      if (t === T.FORD) {
        c.fillStyle = '#857c75';
        c.beginPath(); c.moveTo(d.top.x, d.top.y - 6); c.lineTo(d.right.x, d.right.y - 6); c.lineTo(d.bottom.x, d.bottom.y - 6); c.lineTo(d.left.x, d.left.y - 6); c.closePath(); c.fill();
        c.strokeStyle = '#57534e'; c.lineWidth = 1; c.stroke();
        for (let p = -8; p <= 8; p += 4) {
          c.beginPath(); c.moveTo(d.cx + p - 6, d.cy - 9 + p * 0.3); c.lineTo(d.cx + p + 6, d.cy - 3 + p * 0.3); c.stroke();
        }
        c.fillStyle = '#44403c';
        c.beginPath(); c.moveTo(d.left.x, d.left.y - 6); c.lineTo(d.bottom.x, d.bottom.y - 6); c.lineTo(d.bottom.x, d.bottom.y + 4); c.lineTo(d.left.x, d.left.y + 4); c.closePath(); c.fill();
        c.fillStyle = '#a8a29e';
        c.fillRect(d.left.x, d.left.y - 9, 4, 4); c.fillRect(d.cx - 2, d.cy - 4, 4, 4); c.fillRect(d.bottom.x - 4, d.bottom.y - 9, 4, 4);
        c.strokeStyle = '#d6d3d1'; c.lineWidth = 1.2;
        c.beginPath(); c.moveTo(d.left.x, d.left.y - 6); c.lineTo(d.top.x, d.top.y - 6); c.lineTo(d.right.x, d.right.y - 6); c.stroke();
      }
    } else if (t === T.ROCK) {
      // ---------------- TOWERING VERTICAL CANYON CLIFFS & WATERFALLS ----------------
      const CLIFF_H = 50;
      const pTop = { x: d.top.x, y: d.top.y - CLIFF_H };
      const pRight = { x: d.right.x, y: d.right.y - CLIFF_H };
      const pBottom = { x: d.bottom.x, y: d.bottom.y - CLIFF_H };
      const pLeft = { x: d.left.x, y: d.left.y - CLIFF_H };

      const dropSW = !isRock(x, y + 1);
      const dropSE = !isRock(x + 1, y);
      const isWaterfall = dropSW && (isWater(x, y + 1) || (x === 5 && y === 3) || (x === 45 && y === 2));

      // South-West Cliff Face (Warm Sunlit Sandstone)
      if (dropSW) {
        const swGrad = c.createLinearGradient(pLeft.x, pLeft.y, d.bottom.x, d.bottom.y);
        swGrad.addColorStop(0, '#cda37b'); swGrad.addColorStop(0.35, '#b48356'); swGrad.addColorStop(0.7, '#8f6137'); swGrad.addColorStop(1, '#664322');
        c.fillStyle = swGrad;
        c.beginPath(); c.moveTo(pLeft.x, pLeft.y); c.lineTo(pBottom.x, pBottom.y); c.lineTo(d.bottom.x, d.bottom.y); c.lineTo(d.left.x, d.left.y); c.closePath(); c.fill();

        // 4 Horizontal Sedimentary Strata Layers
        for (let s = 1; s <= 4; s++) {
          const frac = s / 5;
          const sy1 = pLeft.y + CLIFF_H * frac + (h(s * 17) - 0.5) * 3;
          const sy2 = pBottom.y + CLIFF_H * frac + (h(s * 19) - 0.5) * 3;
          c.strokeStyle = '#432815'; c.lineWidth = 1.8;
          c.beginPath(); c.moveTo(pLeft.x, sy1); c.lineTo(pBottom.x, sy2); c.stroke();
          c.strokeStyle = '#fae2aa'; c.lineWidth = 1.0;
          c.beginPath(); c.moveTo(pLeft.x, sy1 + 1.5); c.lineTo(pBottom.x, sy2 + 1.5); c.stroke();
        }

        // 3 Vertical Columnar Joint Fractures
        for (let col = 1; col <= 3; col++) {
          const cf = col / 4;
          const cx1 = pLeft.x + (pBottom.x - pLeft.x) * cf + (h(col + 31) - 0.5) * 3;
          const cy1 = pLeft.y + (pBottom.y - pLeft.y) * cf;
          const cx2 = d.left.x + (d.bottom.x - d.left.x) * cf + (h(col + 31) - 0.5) * 3;
          const cy2 = d.left.y + (d.bottom.y - d.left.y) * cf;
          c.strokeStyle = '#27160a'; c.lineWidth = 2.0;
          c.beginPath(); c.moveTo(cx1, cy1); c.lineTo(cx2, cy2); c.stroke();
          c.strokeStyle = '#fef08a'; c.lineWidth = 1.0;
          c.beginPath(); c.moveTo(cx1 + 1.4, cy1 + 1); c.lineTo(cx2 + 1.4, cy2); c.stroke();
        }

        // Ledges with Alpine Moss
        if (h(45) < 0.7) {
          const lx = pLeft.x + (pBottom.x - pLeft.x) * 0.45;
          const ly = pLeft.y + CLIFF_H * 0.45;
          c.fillStyle = '#3f6212';
          c.beginPath(); c.ellipse(lx, ly, 5, 2.5, 0.2, 0, 7); c.fill();
          c.fillStyle = '#65a30d'; c.fillRect(lx - 2, ly - 1, 3, 1.5);
        }

        // Talus Boulders at Base
        c.fillStyle = 'rgba(0,0,0,0.42)';
        c.beginPath(); c.ellipse((d.left.x + d.bottom.x) * 0.5, (d.left.y + d.bottom.y) * 0.5 + 2, 16, 5, 0.2, 0, 7); c.fill();
        for (let b = 0; b < 2; b++) {
          const bx = d.left.x + 8 + h(b + 71) * 14, by = d.left.y + 4 + h(b + 72) * 8;
          const br = 2.5 + h(b + 73) * 2;
          c.fillStyle = '#684529'; c.beginPath(); c.arc(bx, by, br, 0, 7); c.fill();
          c.fillStyle = '#d6a77a'; c.fillRect(bx - br * 0.5, by - br * 0.7, br, br * 0.6);
        }
      }

      // South-East Cliff Face (Shadowed Canyon Wall)
      if (dropSE) {
        const seGrad = c.createLinearGradient(pBottom.x, pBottom.y, d.right.x, d.right.y);
        seGrad.addColorStop(0, '#382213'); seGrad.addColorStop(0.45, '#24140a'); seGrad.addColorStop(1, '#150a04');
        c.fillStyle = seGrad;
        c.beginPath(); c.moveTo(pBottom.x, pBottom.y); c.lineTo(pRight.x, pRight.y); c.lineTo(d.right.x, d.right.y); c.lineTo(d.bottom.x, d.bottom.y); c.closePath(); c.fill();
        for (let col = 1; col <= 3; col++) {
          const cf = col / 4;
          const cx1 = pBottom.x + (pRight.x - pBottom.x) * cf; const cy1 = pBottom.y + (pRight.y - pBottom.y) * cf;
          const cx2 = d.bottom.x + (d.right.x - d.bottom.x) * cf; const cy2 = d.bottom.y + (d.right.y - d.bottom.y) * cf;
          c.strokeStyle = '#0a0402'; c.lineWidth = 1.8;
          c.beginPath(); c.moveTo(cx1, cy1); c.lineTo(cx2, cy2); c.stroke();
        }
        c.fillStyle = 'rgba(0,0,0,0.5)';
        c.beginPath(); c.ellipse((d.bottom.x + d.right.x) * 0.5 + 4, (d.bottom.y + d.right.y) * 0.5 + 4, 18, 6, -0.2, 0, 7); c.fill();
      }

      // Mountain Plateau Top
      c.beginPath(); c.moveTo(pTop.x, pTop.y); c.lineTo(pRight.x, pRight.y); c.lineTo(pBottom.x, pBottom.y); c.lineTo(pLeft.x, pLeft.y); c.closePath();
      if (grassPattern) { c.fillStyle = grassPattern; c.fill(); }
      else { c.fillStyle = '#558f27'; c.fill(); }

      // Sunlit Limestone Rim Highlights
      if (dropSW) {
        c.strokeStyle = '#fef08a'; c.lineWidth = 2.4;
        c.beginPath(); c.moveTo(pLeft.x, pLeft.y); c.lineTo(pBottom.x, pBottom.y); c.stroke();
        c.strokeStyle = '#ffffff'; c.lineWidth = 1.2;
        c.beginPath(); c.moveTo(pLeft.x, pLeft.y); c.lineTo(pBottom.x, pBottom.y); c.stroke();
      }
      if (dropSE) {
        c.strokeStyle = '#d6a77a'; c.lineWidth = 1.6;
        c.beginPath(); c.moveTo(pBottom.x, pBottom.y); c.lineTo(pRight.x, pRight.y); c.stroke();
      }

      // Alpine Conifer Pines on Plateau
      if (h(88) < 0.42 && !isWaterfall) {
        const tx = pTop.x + (h(89) - 0.5) * 14, ty = (pTop.y + pBottom.y) * 0.5 + (h(90) - 0.5) * 5;
        c.fillStyle = '#2d1808'; c.fillRect(tx - 1, ty - 2, 2, 5);
        c.fillStyle = '#143815'; c.beginPath(); c.moveTo(tx, ty - 14); c.lineTo(tx + 7, ty - 2); c.lineTo(tx - 7, ty - 2); c.closePath(); c.fill();
        c.fillStyle = '#2f7331'; c.beginPath(); c.moveTo(tx, ty - 14); c.lineTo(tx, ty - 2); c.lineTo(tx - 7, ty - 2); c.closePath(); c.fill();
      }

      // ROARING WATERFALL DOWN THE CLIFF!
      if (isWaterfall) {
        const wTopX = (pLeft.x + pBottom.x) * 0.5, wTopY = (pLeft.y + pBottom.y) * 0.5;
        const wBotX = (d.left.x + d.bottom.x) * 0.5, wBotY = (d.left.y + d.bottom.y) * 0.5;
        const wWidth = 18;

        // Top lip cleft in rock
        c.fillStyle = '#0369a1';
        c.beginPath(); c.moveTo(wTopX - wWidth * 0.55, wTopY - 2); c.lineTo(wTopX + wWidth * 0.55, wTopY - 2); c.lineTo(wTopX + wWidth * 0.4, wTopY + 2); c.lineTo(wTopX - wWidth * 0.4, wTopY + 2); c.closePath(); c.fill();

        // Plunging Azure Waterfall Curtain
        const fallGrad = c.createLinearGradient(wTopX - wWidth * 0.5, wTopY, wTopX + wWidth * 0.5, wTopY);
        fallGrad.addColorStop(0, '#0284c7'); fallGrad.addColorStop(0.25, '#38bdf8'); fallGrad.addColorStop(0.5, '#f0f9ff'); fallGrad.addColorStop(0.75, '#38bdf8'); fallGrad.addColorStop(1, '#0284c7');
        c.fillStyle = fallGrad;
        c.beginPath(); c.moveTo(wTopX - wWidth * 0.45, wTopY); c.lineTo(wTopX + wWidth * 0.45, wTopY); c.lineTo(wBotX + wWidth * 0.6, wBotY); c.lineTo(wBotX - wWidth * 0.6, wBotY); c.closePath(); c.fill();

        // Churning White Foam Torrent Streaks
        c.strokeStyle = '#ffffff'; c.lineWidth = 2.4;
        for (let st = -2; st <= 2; st++) {
          const ox = st * 3;
          c.beginPath(); c.moveTo(wTopX + ox * 0.8, wTopY + Math.abs(st) * 1.5); c.lineTo(wBotX + ox * 1.25, wBotY); c.stroke();
        }
        c.strokeStyle = 'rgba(224, 242, 254, 0.85)'; c.lineWidth = 1.4;
        for (let st = -3; st <= 3; st += 2) {
          const ox = st * 2.5;
          c.beginPath(); c.moveTo(wTopX + ox, wTopY + 2); c.lineTo(wBotX + ox * 1.35, wBotY); c.stroke();
        }

        // Billowing Side Mist & Spray
        const sprayGrad = c.createRadialGradient(wTopX, wTopY + CLIFF_H * 0.6, 6, wTopX, wTopY + CLIFF_H * 0.6, 24);
        sprayGrad.addColorStop(0, 'rgba(240, 249, 255, 0.45)'); sprayGrad.addColorStop(1, 'rgba(240, 249, 255, 0)');
        c.fillStyle = sprayGrad;
        c.beginPath(); c.ellipse(wTopX, wTopY + CLIFF_H * 0.6, 24, 15, 0, 0, 7); c.fill();

        // Foaming Splash Basin at Bottom
        const basinGrad = c.createRadialGradient(wBotX, wBotY + 2, 2, wBotX, wBotY + 2, 26);
        basinGrad.addColorStop(0, '#ffffff'); basinGrad.addColorStop(0.35, 'rgba(224, 242, 254, 0.95)'); basinGrad.addColorStop(0.65, 'rgba(56, 189, 248, 0.8)'); basinGrad.addColorStop(1, 'rgba(2, 132, 199, 0)');
        c.fillStyle = basinGrad;
        c.beginPath(); c.ellipse(wBotX, wBotY + 2, 28, 14, 0, 0, 7); c.fill();

        c.strokeStyle = 'rgba(255, 255, 255, 0.85)'; c.lineWidth = 1.8;
        c.beginPath(); c.ellipse(wBotX, wBotY + 2, 16, 8, 0, 0, 7); c.stroke();

        // Wet River Rocks
        c.fillStyle = '#261a12';
        c.beginPath(); c.arc(wBotX - wWidth * 0.75, wBotY + 1, 4.5, 0, 7); c.fill();
        c.beginPath(); c.arc(wBotX + wWidth * 0.75, wBotY + 2, 5, 0, 7); c.fill();
        c.fillStyle = '#6b7280';
        c.fillRect(wBotX - wWidth * 0.75 - 1.5, wBotY - 1, 3, 2); c.fillRect(wBotX + wWidth * 0.75 - 1.5, wBotY, 3, 2);
      }
    } else if (t === T.FOREST) {
      // Lush Evergreen Pines & Golden Aspens
      if (grassPattern) { c.fillStyle = grassPattern; c.fill(); }
      else { c.fillStyle = '#558f27'; c.fill(); }
      c.fillStyle = 'rgba(16, 40, 10, 0.32)'; c.fill();

      for (let k = 0; k < 2; k++) {
        const tx = d.cx - 10 + h(k + 50) * 20;
        const ty = d.cy - 6 + h(k + 60) * 12;
        const treeType = h(k + 80);
        c.fillStyle = 'rgba(0,0,0,0.38)';
        c.beginPath(); c.ellipse(tx + 6, ty + 6, 12, 6, 0.2, 0, 7); c.fill();

        if (treeType < 0.6) {
          // Pine
          c.fillStyle = '#2d1808'; c.fillRect(tx - 1.5, ty - 3, 3, 7);
          const tiers = [
            { y: ty - 4, w: 18, h: 8, col1: '#143815', col2: '#276722' },
            { y: ty - 10, w: 14, h: 7, col1: '#1c4a1d', col2: '#35852b' },
            { y: ty - 16, w: 10, h: 6, col1: '#255e26', col2: '#45a337' },
            { y: ty - 22, w: 5,  h: 5, col1: '#2f7331', col2: '#5bc049' }
          ];
          for (const tr of tiers) {
            c.fillStyle = tr.col1;
            c.beginPath(); c.moveTo(tx, tr.y - tr.h); c.lineTo(tx + tr.w * 0.5, tr.y); c.lineTo(tx - tr.w * 0.5, tr.y); c.closePath(); c.fill();
            c.fillStyle = tr.col2;
            c.beginPath(); c.moveTo(tx, tr.y - tr.h); c.lineTo(tx, tr.y); c.lineTo(tx - tr.w * 0.5, tr.y); c.closePath(); c.fill();
          }
        } else {
          // Golden Aspen
          c.fillStyle = '#452b14'; c.fillRect(tx - 1.5, ty - 4, 3, 8);
          const r = 8 + h(k + 70) * 4;
          c.fillStyle = '#78350f'; c.beginPath(); c.arc(tx + 2, ty - 7, r * 1.05, 0, 7); c.fill();
          c.fillStyle = '#b45309'; c.beginPath(); c.arc(tx, ty - 9, r * 0.9, 0, 7); c.fill();
          c.fillStyle = '#d97706'; c.beginPath(); c.arc(tx - r * 0.25, ty - 11, r * 0.7, 0, 7); c.fill();
          c.fillStyle = '#f59e0b'; c.beginPath(); c.arc(tx - r * 0.35, ty - 13, r * 0.45, 0, 7); c.fill();
          c.fillStyle = '#fde047'; c.fillRect(tx - r * 0.3, ty - 14, 2.5, 2);
        }
      }
    } else if (t === T.FIELD) {
      // Golden Wheat Fields
      if (wheatPattern) {
        c.fillStyle = wheatPattern;
        c.beginPath(); c.moveTo(d.top.x, d.top.y + 1); c.lineTo(d.right.x - 2, d.right.y); c.lineTo(d.bottom.x, d.bottom.y - 1); c.lineTo(d.left.x + 2, d.left.y); c.closePath(); c.fill();
      } else {
        c.fillStyle = '#ca8a04';
        c.beginPath(); c.moveTo(d.top.x, d.top.y); c.lineTo(d.right.x, d.right.y); c.lineTo(d.bottom.x, d.bottom.y); c.lineTo(d.left.x, d.left.y); c.closePath(); c.fill();
      }
      // Fence posts
      c.fillStyle = '#5c3317';
      c.fillRect(d.left.x + 1, d.left.y - 4, 2.5, 6); c.fillRect(d.top.x - 1, d.top.y - 3, 2.5, 6);
      c.fillRect(d.right.x - 3, d.right.y - 4, 2.5, 6); c.fillRect(d.bottom.x - 1, d.bottom.y - 3, 2.5, 6);
      c.strokeStyle = '#78350f'; c.lineWidth = 1;
      c.beginPath(); c.moveTo(d.left.x + 2, d.left.y - 2); c.lineTo(d.top.x, d.top.y - 1); c.moveTo(d.top.x, d.top.y - 1); c.lineTo(d.right.x - 2, d.right.y - 2); c.stroke();
    } else {
      // Prairie Meadow
      if (grassPattern) { c.fillStyle = grassPattern; c.fill(); }
      else { c.fillStyle = '#558f27'; c.fill(); }

      // Earthen plaza under Zarahemla
      if (x >= 28 && x <= 36 && y >= 34 && y <= 40) {
        c.fillStyle = 'rgba(194, 153, 88, 0.48)'; c.fill();
      }
    }
  }

  renderTerrain();

  // ---------------- Westwood Shroud of War ----------------
  const shroudCv = document.createElement('canvas');
  shroudCv.width = WORLD_ISO_W; shroudCv.height = WORLD_ISO_H;
  const sctx = shroudCv.getContext('2d');

  function initShroud() {
    sctx.globalCompositeOperation = 'source-over';
    sctx.fillStyle = '#06070c'; // 100% Westwood Pitch Black Shroud
    sctx.fillRect(0, 0, WORLD_ISO_W, WORLD_ISO_H);

    // Punch out vision
    sctx.globalCompositeOperation = 'destination-out';
    const punch = (wx, wy, rad) => {
      const { ix, iy } = toIso(wx, wy);
      const cx = ix + ISO_OFFSET_X, cy = iy;
      const grad = sctx.createRadialGradient(cx, cy, rad * 0.45, cx, cy, rad);
      grad.addColorStop(0, 'rgba(0,0,0,1)');
      grad.addColorStop(0.85, 'rgba(0,0,0,0.85)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      sctx.fillStyle = grad;
      sctx.beginPath(); sctx.arc(cx, cy, rad, 0, Math.PI * 2); sctx.fill();
    };

    if (mode === 'full') {
      sctx.clearRect(0, 0, WORLD_ISO_W, WORLD_ISO_H);
      return;
    }

    // 1. Zarahemla Home Base
    punch(32 * TILE, 37 * TILE, 260);

    // 2. Village Scout Clearings in Mode 'start' & 'scout'
    punch(6 * TILE, 14 * TILE, 140);  // Gideon (by West Waterfall & River)
    punch(21 * TILE, 12 * TILE, 120); // Minon
    punch(40 * TILE, 14 * TILE, 120); // Melek
    punch(56 * TILE, 13 * TILE, 130); // Manti (by East Cliffs)
    punch(51 * TILE, 29 * TILE, 140); // Sidom (by River Sidon)

    // 3. Scout path in Mode 'scout'
    if (mode === 'scout') {
      punch(scout.x, scout.y, 160);
      punch(16 * TILE, 24 * TILE, 170); // River Bridge Crossing
      punch(8 * TILE, 14 * TILE, 160);  // Gideon Road
      punch(6 * TILE, 7 * TILE, 180);   // Approaching Waterfall
    }
  }

  // Active Scout Unit
  const scout = { x: 8 * TILE, y: 6 * TILE };

  // Mode Selection
  window.setMode = function(newMode) {
    mode = newMode;
    document.querySelectorAll('.btn').forEach(b => b.classList.remove('active'));
    if (mode === 'start') document.getElementById('btnStart').classList.add('active');
    if (mode === 'scout') document.getElementById('btnScout').classList.add('active');
    if (mode === 'full') document.getElementById('btnFull').classList.add('active');
    initShroud();
    
    if (mode === 'start') {
      const pt = toIso(32 * TILE, 33 * TILE);
      cam.x = pt.ix - (vw / cam.z) / 2;
      cam.y = pt.iy - (vh / cam.z) / 2;
    } else if (mode === 'scout') {
      const pt = toIso(7 * TILE, 6 * TILE);
      cam.x = pt.ix - (vw / cam.z) / 2;
      cam.y = pt.iy - (vh / cam.z) / 2;
    } else {
      const pt = toIso(32 * TILE, 22 * TILE);
      cam.x = pt.ix - (vw / cam.z) / 2;
      cam.y = pt.iy - (vh / cam.z) / 2;
    }
  };

  // Resize & Camera
  function resize() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    vw = window.innerWidth; vh = window.innerHeight;
    cv.width = vw * dpr; cv.height = vh * dpr;
    cv.style.width = vw + 'px'; cv.style.height = vh + 'px';
  }
  window.addEventListener('resize', () => { resize(); setMode(mode); });
  resize();

  // Mouse / Pan / Drag
  let dragging = false, lx = 0, ly = 0;
  cv.addEventListener('pointerdown', e => {
    dragging = true; lx = e.clientX; ly = e.clientY;
    if (mode === 'scout') {
      const ix = cam.x + e.clientX / cam.z;
      const iy = cam.y + e.clientY / cam.z;
      const w = fromIso(ix, iy);
      scout.x = w.wx; scout.y = w.wy;
      initShroud();
    }
  });
  window.addEventListener('pointermove', e => {
    if (dragging) {
      cam.x -= (e.clientX - lx) / cam.z;
      cam.y -= (e.clientY - ly) / cam.z;
      lx = e.clientX; ly = e.clientY;
    }
  });
  window.addEventListener('pointerup', () => dragging = false);
  cv.addEventListener('wheel', e => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.15 : 0.85;
    cam.z = Math.max(0.4, Math.min(2.2, cam.z * factor));
  }, { passive: false });

  // Animated Water Particles
  const particles = [];
  function addSpray(x, y) {
    for (let k = 0; k < 2; k++) {
      particles.push({
        x: x + (Math.random() - 0.5) * 22,
        y: y + (Math.random() - 0.5) * 10,
        vx: (Math.random() - 0.5) * 1.5,
        vy: -Math.random() * 2 - 0.5,
        r: 1.5 + Math.random() * 2,
        life: 0, maxLife: 28
      });
    }
  }

  // Main Render Loop
  function loop(now) {
    requestAnimationFrame(loop);

    ctx.fillStyle = '#06070c';
    ctx.fillRect(0, 0, cv.width, cv.height);

    ctx.save();
    const z = cam.z * dpr;
    ctx.setTransform(z, 0, 0, z, -cam.x * z, -cam.y * z);

    // 1. Draw World Terrain
    ctx.drawImage(terrainCv, -ISO_OFFSET_X, 0);

    // 2. Draw Mesoamerican Stronghold & Watchtowers at Zarahemla
    const zPt = toIso(32 * TILE, 37 * TILE);
    if (IMG.stronghold.complete && IMG.stronghold.naturalWidth > 0) {
      ctx.drawImage(IMG.stronghold, zPt.ix - 80, zPt.iy - 110, 160, 130);
    } else {
      ctx.fillStyle = '#857c75'; ctx.fillRect(zPt.ix - 40, zPt.iy - 50, 80, 50);
    }
    // Watchtowers
    const tw1 = toIso(23 * TILE, 32 * TILE);
    if (IMG.tower.complete && IMG.tower.naturalWidth > 0) {
      ctx.drawImage(IMG.tower, tw1.ix - 24, tw1.iy - 48, 48, 56);
    }
    const tw2 = toIso(39 * TILE, 32 * TILE);
    if (IMG.tower.complete && IMG.tower.naturalWidth > 0) {
      ctx.drawImage(IMG.tower, tw2.ix - 24, tw2.iy - 48, 48, 56);
    }

    // 3. Draw Spearman Guard Scout
    const sPt = toIso(scout.x, scout.y);
    if (IMG.spearman.complete && IMG.spearman.naturalWidth > 0) {
      ctx.drawImage(IMG.spearman, sPt.ix - 18, sPt.iy - 32, 36, 36);
    } else {
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(sPt.ix, sPt.iy, 8, 4, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#0284c7'; ctx.beginPath(); ctx.arc(sPt.ix - 4, sPt.iy - 10, 6, 0, 7); ctx.fill();
    }

    // 4. Dynamic Waterfall Spray Animation
    const wf1 = toIso(5.5 * TILE, 4.5 * TILE);
    if (Math.random() < 0.6) addSpray(wf1.ix, wf1.iy);
    const wf2 = toIso(45.5 * TILE, 3.5 * TILE);
    if (Math.random() < 0.4) addSpray(wf2.ix, wf2.iy);

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life++; p.x += p.vx; p.y += p.vy;
      const alpha = 1 - p.life / p.maxLife;
      if (alpha <= 0) { particles.splice(i, 1); continue; }
      ctx.fillStyle = \`rgba(240, 249, 255, \${alpha * 0.75})\`;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill();
    }

    // 5. Westwood Shroud of War (100% Opaque Pitch Black)
    if (mode !== 'full') {
      ctx.drawImage(shroudCv, -ISO_OFFSET_X, 0);
    }

    ctx.restore();

    // 6. Draw Westwood Radar
    drawRadar(now);
  }

  function drawRadar(now) {
    const rw = rcv.width, rh = rcv.height;
    rctx.fillStyle = '#03060c';
    rctx.fillRect(0, 0, rw, rh);

    rctx.drawImage(terrainCv, 0, 0, rw, rh);

    if (mode !== 'full') {
      rctx.drawImage(shroudCv, 0, 0, rw, rh);
    }

    // Green Phosphor Grid Rings
    rctx.strokeStyle = 'rgba(34, 197, 94, 0.4)'; rctx.lineWidth = 1;
    rctx.beginPath(); rctx.arc(rw * 0.5, rh * 0.5, rw * 0.22, 0, 7); rctx.stroke();
    rctx.beginPath(); rctx.arc(rw * 0.5, rh * 0.5, rw * 0.42, 0, 7); rctx.stroke();
    rctx.beginPath(); rctx.moveTo(rw * 0.5, 0); rctx.lineTo(rw * 0.5, rh); rctx.stroke();
    rctx.beginPath(); rctx.moveTo(0, rh * 0.5); rctx.lineTo(rw, rh * 0.5); rctx.stroke();

    // Radar Sweep Beam
    const sweep = (now * 0.002) % (Math.PI * 2);
    rctx.save();
    rctx.translate(rw * 0.5, rh * 0.5);
    rctx.rotate(sweep);
    const sGrad = rctx.createLinearGradient(0, 0, rw * 0.5, 0);
    sGrad.addColorStop(0, 'rgba(34, 197, 94, 0.55)');
    sGrad.addColorStop(1, 'rgba(34, 197, 94, 0)');
    rctx.fillStyle = sGrad;
    rctx.beginPath(); rctx.moveTo(0, 0); rctx.arc(0, 0, rw * 0.5, -0.35, 0.35); rctx.fill();
    rctx.restore();

    // Camera Viewport Box
    const cx = ((cam.x - WORLD_ISO_MIN_X) / WORLD_ISO_W) * rw;
    const cy = (cam.y / WORLD_ISO_H) * rh;
    const cw = (vw / cam.z / WORLD_ISO_W) * rw;
    const ch = (vh / cam.z / WORLD_ISO_H) * rh;
    rctx.strokeStyle = '#fde68a'; rctx.lineWidth = 1.5;
    rctx.strokeRect(cx, cy, cw, ch);
  }

  // Initial Setup
  initShroud();
  setMode('start');
  requestAnimationFrame(loop);
})();
</script>

</body>
</html>
`;

fs.writeFileSync('liberty/mockup.html', html);
console.log('Updated liberty/mockup.html');
