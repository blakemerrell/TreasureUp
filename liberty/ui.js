// Title of Liberty: the screen. Draws the world that liberty/sim.js runs,
// turns clicks and taps into orders, and runs the menus: read the chapter,
// then play its mission. Nothing here decides who wins a fight.
(function () {
  'use strict';
  const D = window.LIB_DATA, S = window.LIB_SIM, MISSIONS = window.LIB_MISSIONS.MISSIONS, CAMPAIGNS = window.LIB_MISSIONS.CAMPAIGNS, FREE = window.LIB_MISSIONS.FREE_BATTLE, WILD = window.LIB_MISSIONS.WILD;
  const TEXT = window.LIBERTY_SCRIPTURE || {};
  const AUDIO = window.LIB_AUDIO;
  const { TILE, MAP_W, MAP_H, T, UNITS, BUILDINGS, RESEARCH, QUESTIONS, MIRACLES, POWERS, ARTIFACTS, SIDES, CAPTAINS } = D;
  const { tileOf, dist } = S;
  const WORLD_W = MAP_W * TILE, WORLD_H = MAP_H * TILE;
  const STEP = 1 / 20;

  // Every picture has a WebP beside its PNG or JPG, about a quarter of the size (8.5 MB of them came to 2.1 MB) and the same
  // to the eye. A browser that can't show WebP (an iPhone before iOS 14) gets the original: a game picture tries it on its
  // own error, a picture in the menus through the one listener below.
  const ORIG = new Map();
  const webp = url => { const w = String(url).replace(/\.(png|jpg)(?=\?|$)/, '.webp'); if (w !== url) ORIG.set(w, url); return w; };
  document.addEventListener('error', e => { const t = e.target; if (t && t.tagName === 'IMG') { const o = ORIG.get(t.getAttribute('src')); if (o) t.src = o; } }, true);
  // The game's own pictures wait until the opening page has shown (or a game begins), so the paintings on it come first:
  // until then a picture keeps the address it's given, and loadPictures() sends for them all.
  const LATER = [];
  function picture() {
    const im = new Image();
    Object.defineProperty(im, 'src', { configurable: true, get() { return im.want || ''; }, set(u) { im.want = u; LATER.push(im); } });
    return im;
  }
  let picturesAsked = false;
  function loadPictures() {
    if (picturesAsked) return;
    picturesAsked = true;
    for (const im of LATER) { const u = im.want; delete im.src; im.onerror = () => { im.onerror = null; im.src = u; }; im.src = webp(u); }
  }
  if (document.readyState === 'complete') setTimeout(loadPictures, 0); else addEventListener('load', () => setTimeout(loadPictures, 0));
  // The offline copy (sw.js): after one visit the game opens from the device, with or without the internet. Only over https
  // (and on this computer, for the tests); ?nosw=1 on the address leaves it out.
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || /^(localhost|127\.0\.0\.1)$/.test(location.hostname)) && !/[?&]nosw=1/.test(location.search))
    addEventListener('load', () => navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).catch(() => { /* no offline copy: the game is the same */ }));

const IMG = {
  moroni: picture(),
  spearman: picture(),
  worker: picture(),
  spy: picture(),
  robber: picture(),
  robberArcher: picture(),
  robberChief: picture(),
  nslinger: picture(),
  archer: picture(),
  swordsman: picture(),
  javelin: picture(),
  lehi: picture(),
  gidgiddoni: picture(),
  lamanSlinger: picture(),
  lamanCaptain: picture(),
  zerahemnah: picture(),
  stripling: picture(),
  lamanite: picture(),
  cart: picture(),
  cartGrain: picture(),                          // the cart, laden: a picture per load, and one loading
  cartTimber: picture(),
  cartStone: picture(),
  cartWork: picture(),
  cartParked: picture(),
  cartGrainParked: picture(),
  cartTimberParked: picture(),
  cartStoneParked: picture(),
  unit: picture(),
  stronghold: picture(),
  encampment: picture(),
  councilPlatform: picture(),
  acropolis: picture(),
  barracks: picture(),
  tower: picture(),
  storehouse: picture(),
  armory: picture(),
  granary: picture(),
  stables: picture(),
  hall: picture(),
  temple: picture(),
  ruin: picture(),
  lamaniteCamp: picture(),
  robbersCamp: picture(),
  warcamp: picture(),
  lamaniteTower: picture(),
  gate: picture(),
  farm: picture()
};
IMG.moroni.src = 'assets/moroni.png?v=13';
IMG.spearman.src = 'assets/spearman.png?v=13';
IMG.worker.src = 'assets/worker.png?v=1';        // drawn by Gemini: liberty/art/requests/001-worker.md
IMG.spy.src = 'assets/spy.png?v=1';
IMG.robber.src = 'assets/robber.png?v=1';        // and these: 002-robbers.md
IMG.robberArcher.src = 'assets/robber_archer.png?v=1';
IMG.robberChief.src = 'assets/robber_chief.png?v=1';
IMG.nslinger.src = 'assets/nslinger.png?v=1';    // and these: 003-slinger-archer.md
IMG.archer.src = 'assets/archer.png?v=1';
IMG.swordsman.src = 'assets/swordsman.png?v=1';  // and these: 004-swordsman-javelin.md
IMG.javelin.src = 'assets/javelin.png?v=1';
IMG.lehi.src = 'assets/lehi.png?v=1';            // and these: 005-heroes.md
IMG.gidgiddoni.src = 'assets/gidgiddoni.png?v=1';
IMG.lamanSlinger.src = 'assets/lamanite_slinger.png?v=1';   // and these: 006-lamanites.md
IMG.lamanCaptain.src = 'assets/lamanite_captain.png?v=1';
IMG.zerahemnah.src = 'assets/zerahemnah.png?v=2';
IMG.stripling.src = 'assets/stripling.png?v=13';
IMG.lamanite.src = 'assets/lamanite.png?v=13';
IMG.cart.src = 'assets/cart.png?v=14';
IMG.cartGrain.src = 'assets/cart_grain.png?v=1';
IMG.cartTimber.src = 'assets/cart_timber.png?v=1';
IMG.cartStone.src = 'assets/cart_stone.png?v=1';
IMG.cartWork.src = 'assets/cart_loading.png?v=1';
IMG.cartParked.src = 'assets/cart_parked.png?v=1';
IMG.cartGrainParked.src = 'assets/cart_grain_parked.png?v=1';
IMG.cartTimberParked.src = 'assets/cart_timber_parked.png?v=1';
IMG.cartStoneParked.src = 'assets/cart_stone_parked.png?v=1';
IMG.unit.src = 'assets/spearman.png?v=13';
IMG.stronghold.src = 'assets/stronghold.png?v=15';   // the chief judge's palace, in the white stone of the other buildings (020-city-palace.md)
IMG.encampment.src = 'assets/encampment.png?v=1';
IMG.councilPlatform.src = 'assets/council_platform.png?v=1';
IMG.acropolis.src = 'assets/acropolis.png?v=1';
IMG.barracks.src = 'assets/barracks.png?v=13';
IMG.tower.src = 'assets/tower.png?v=13';
IMG.storehouse.src = 'assets/storehouse.png?v=13';
IMG.armory.src = 'assets/armory.png?v=13';
IMG.granary.src = 'assets/granary.png?v=2';      // and these: 007-buildings.md (with shadows since)
IMG.stables.src = 'assets/stables.png?v=2';
IMG.hall.src = 'assets/hall.png?v=2';
IMG.temple.src = 'assets/temple.png?v=4';           // after the manner of Solomon's: its porch and two great pillars, no tower (023)
IMG.quarry = picture(); IMG.quarry.src = 'assets/quarry.png?v=1';
IMG.sawmill = picture(); IMG.sawmill.src = 'assets/sawmill.png?v=1';
IMG.brickworks = picture(); IMG.brickworks.src = 'assets/brickworks.png?v=1';
IMG.ruin.src = 'assets/ruin.png?v=1';
IMG.lamaniteCamp.src = 'assets/lamanite_camp.png?v=1';   // and these: 009-battlefield.md
IMG.robbersCamp.src = 'assets/robbers_camp.png?v=1';
IMG.warcamp.src = 'assets/warcamp.png?v=1';
IMG.lamaniteTower.src = 'assets/lamanite_tower.png?v=1';
// The King-men's camp (camp.js; pictures: 014-kingmen-camp.md).
for (const k of ['bearer', 'tents', 'storetent', 'muster', 'shieldtent', 'ladderworks', 'pavilion']) { IMG[k] = picture(); IMG[k].src = `assets/${k}.png?v=1`; }
// Walls of every level and both sides, a guard, and the great beasts, drawn by Gemini (art/requests/017).
for (const k of ['bank', 'pickets', 'stone', 'stakes', 'hides', 'campditch']) { IMG['wall_' + k] = picture(); IMG['wall_' + k].src = `assets/wall_${k}.png?v=1`; }
for (const k of ['bank', 'pickets', 'stone', 'stakes']) { IMG['wallpost_' + k] = picture(); IMG['wallpost_' + k].src = `assets/wall_${k}_post.png?v=1`; }
for (const k of ['gate_stone', 'gate_stakes', 'wallguard', 'curelom', 'cumom']) { IMG[k] = picture(); IMG[k].src = `assets/${k}.png?v=1`; }
// The Freemen's smithy and training ground (pictures: 015-smithy-training.md).
for (const k of ['smithy', 'training']) { IMG[k] = picture(); IMG[k].src = `assets/${k}.png?v=1`; }
// The captains' heroes (Helaman from 006, the rest from 016) and the King-men's war-dance ground (016).
for (const k of ['helaman', 'teancum', 'amalickiah', 'ammoron', 'wardance']) { IMG[k] = picture(); IMG[k].src = `assets/${k}.png?v=1`; }
// The Rameumptom and the idols (018), and the painted flames that burn in its braziers (the 'Fire and Frames' demo).
for (const k of ['rameumptom', 'idol_jaguar', 'idol_warrior', 'flames']) { IMG[k] = picture(); IMG[k].src = `assets/${k}.png?v=1`; }
IMG.gate.src = 'assets/gate.png?v=1';
IMG.farm.src = 'assets/farm.png?v=13';
                                // the simulation's tick, as in the tests
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // ------------------------------------------------------------ icons

  const ICON = {
    grain: '<svg class="i" viewBox="0 0 16 16"><path d="M8 15V5" stroke="#e8c15a" stroke-width="1.6" fill="none"/><g fill="#f5d06b"><ellipse cx="8" cy="3" rx="1.6" ry="2.4"/><ellipse cx="5.6" cy="6" rx="1.4" ry="2.2" transform="rotate(-30 5.6 6)"/><ellipse cx="10.4" cy="6" rx="1.4" ry="2.2" transform="rotate(30 10.4 6)"/><ellipse cx="5.6" cy="9.5" rx="1.4" ry="2.2" transform="rotate(-30 5.6 9.5)"/><ellipse cx="10.4" cy="9.5" rx="1.4" ry="2.2" transform="rotate(30 10.4 9.5)"/></g></svg>',
    timber: '<svg class="i" viewBox="0 0 16 16"><rect x="1" y="5" width="12" height="6" rx="3" fill="#a0673a"/><ellipse cx="13" cy="8" rx="2.4" ry="3" fill="#e0b27e"/><ellipse cx="13" cy="8" rx="1.1" ry="1.4" fill="#a0673a"/></svg>',
    stone: '<svg class="i" viewBox="0 0 16 16"><path d="M1.5 13.5l2-5.5h9l2 5.5z" fill="#a8a29e"/><path d="M4.5 8l1.5-4.5h4L11.5 8z" fill="#d6d3d1"/><path d="M3 10.2h10" stroke="#78716c" stroke-width=".8"/><path d="M1.5 13.5h13l-1 1.5h-11z" fill="#78716c"/></svg>',
    people: '<svg class="i" viewBox="0 0 16 16" fill="#bfdbfe"><circle cx="5" cy="4.5" r="2.3"/><circle cx="11" cy="4.5" r="2.3"/><path d="M1 14c0-3.3 1.8-5 4-5s4 1.7 4 5zM7 14c0-3.3 1.8-5 4-5s4 1.7 4 5z"/></svg>'
  };
  const KINDS = ['grain', 'timber', 'stone'];
  const costHtml = c => !c ? '' : KINDS.map(k => c[k] ? ICON[k] + c[k] : '').filter(Boolean).map(x => '<span class="c">' + x + '</span>').join(' ');
  const costText = c => KINDS.filter(k => c && c[k]).map(k => c[k] + ' ' + k).join(', ') || 'nothing';

  // ------------------------------------------------------------ saves

  const KEY = 'liberty.v1';
  const save = (() => {
    try { return Object.assign({ read: {}, won: {}, perks: [] }, JSON.parse(localStorage.getItem(KEY)) || {}); }
    catch (e) { return { read: {}, won: {}, perks: [] }; }
  })();
  if (!Array.isArray(save.perks)) save.perks = [];
  const store = () => { try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) { /* private mode: progress lasts this visit */ } };
  const totalStars = () => Object.values(save.won || {}).reduce((a, b) => a + (Number(b) || 0), 0);
  const spentStars = () => (save.perks || []).reduce((a, id) => a + (D.PERKS[id] ? D.PERKS[id].stars : 0), 0);
  const availableStars = () => Math.max(0, totalStars() - spentStars());
  // Every mission is open (Blake: "read first, then play isn't really working"). Reading its chapter first earns a gift
  // at the start and opens the council's questions; it is suggested, not required.
  const chaptersOf = m => m.chapters || [m.chapter];
  const allRead = m => chaptersOf(m).every(c => save.read[c]);
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
  let aiming = null;                                 // a miracle waiting for its spot
  let wallLine = null;                               // [[x, y], ...] while dragging a wall
  let wallStart = null;                              // on a touch screen, where the wall starts (the next tap is where it ends)
  let armedRemove = null;                            // a building whose Remove was tapped once: a second tap takes it down
  let hover = null;                                  // the mouse's world position
  let infoEnt = null;                                // a robber or village being looked at
  let boxMode = false, box = null;
  let paused = false, speed = 1, modal = false;
  let council = null;                                // { nextAt, queue, right }
  let shownMsgs = 0, endShown = false;
  const cam = { x: 0, y: 0, z: 1 };
  const keys = new Set();
  const pings = [];                                  // where an order was given, for a moment
  const dustAt = new WeakMap();                      // when a helper's blow last raised dust (this page's clock: kept off the unit, which is saved)
  const unitKinetic = new WeakMap();                 // Westwood RA2 procedural motion engine: displacement, stride, lean, squash-and-stretch, recoil

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
  const sided = () => document.body.classList.contains('side');
  const bottomH = () => (sided() || $('panel').hidden) ? 0 : ($('panel').offsetHeight || 0);
  const rightW = () => (sided() && !$('panel').hidden) ? ($('panel').offsetWidth || 236) : 0;

  function resize() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    vw = window.innerWidth; vh = window.innerHeight;
    cv.width = Math.round(vw * dpr); cv.height = Math.round(vh * dpr);
    cv.style.width = vw + 'px'; cv.style.height = vh + 'px';
    // The command panel goes down the right on a screen wider than tall (a phone on its side, a tablet, a laptop); held upright, along the bottom.
    document.body.classList.toggle('side', vw > vh);
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
  // A big canvas the device will really make. iPhones have a budget for canvas memory, and past it a new canvas
  // quietly draws nothing at all: no error, just an empty picture. So each big canvas is made at the largest of
  // these sizes where a test dot actually sticks, and scaled so the code painting it needn't know.
  // ?debug=1 on the address: a box on the screen saying what the device really drew (see debugBox below).
  const DBG = { on: /[?&]debug=1/.test(location.search), made: {}, paint: 'not yet', lost: 0, restored: 0 };
  // Chrome on a phone can drop what a canvas holds when the device runs short of graphics memory: the canvas
  // fires 'contextlost', then 'contextrestored' when it can be painted again, blank. Everything painted once
  // (the ground, the fog, the tree pictures) has to be painted again then; the screen repaints every frame anyway.
  // A loss means the phone is short of graphics memory, so the ground and the fog come back one size smaller (shrinkBig):
  // painted again at the same size they could be dropped again, and again, each time a heavy repaint.
  let repaintAll = false, shrinkBig = false;
  function watchLoss(c) {
    c.addEventListener('contextlost', () => { DBG.lost++; });
    c.addEventListener('contextrestored', () => { DBG.restored++; repaintAll = true; shrinkBig = true; });
    return c;
  }
  const lostNow = x => !!(x && x.isContextLost && x.isContextLost());
  // Chrome (and Silk on the Fire tablet, and Edge and Samsung's browser, all built on it) says when it drops a canvas, so there
  // the game never reads a canvas back to check. Reading back is worse than it looks: after a couple of reads Chrome moves the
  // canvas off the graphics chip ("Multiple readback operations using getImageData..."), and then the ground and the fog,
  // copied to the screen every frame, cost the phone dearly. Blake's Android phone: "Chrome isn't responding" 16 s in.
  // Only a browser that wipes without a word (Safari on the iPhone) gets the test dot and the once-a-second look.
  // (Chrome's engine, by its name in the browser's description; on an iPhone every browser is Safari's engine underneath.)
  const SAYS_LOST = typeof HTMLCanvasElement !== 'undefined' && 'oncontextlost' in HTMLCanvasElement.prototype &&
    /(Chrome|Chromium)\/\d/.test(navigator.userAgent) && !/iPhone|iPad|iPod/.test(navigator.userAgent);
  // A phone with little memory (Chrome tells, rounded down: 4 for a 6 GB phone) starts the ground and the fog a size smaller.
  const LOW_MEM = !!(navigator.deviceMemory && navigator.deviceMemory <= 4);
  // ?canvas=0.5 on the address makes every big canvas that size, as a phone short of memory would (to test on a computer).
  const FORCE_K = +((location.search.match(/[?&]canvas=([\d.]+)/) || [])[1] || 0);
  function bigCanvas(w, h, sizes, name) {
    for (const k of FORCE_K ? [FORCE_K] : sizes) {
      const c = document.createElement('canvas'); c.width = Math.round(w * k); c.height = Math.round(h * k);
      const x = c.getContext('2d');
      if (x && SAYS_LOST) {
        if (!lostNow(x)) { x.scale(k, k); c.k = k; c.sizes = sizes; c.full = [w, h]; DBG.made[name] = c.width + '×' + c.height + ' at ' + k; return [watchLoss(c), x]; }
      } else if (x) {
        x.fillStyle = '#fff'; x.fillRect(0, 0, 1, 1);
        let ok = false; try { ok = x.getImageData(0, 0, 1, 1).data[3] === 255; } catch (e) { ok = false; }
        if (ok) { x.clearRect(0, 0, 1, 1); x.scale(k, k); c.k = k; c.sizes = sizes; c.full = [w, h]; DBG.made[name] = c.width + '×' + c.height + ' at ' + k; return [watchLoss(c), x]; }
      }
      c.width = c.height = 0;                       // hand its memory back before trying smaller
    }
    DBG.made[name] = 'every size refused';
    const c = document.createElement('canvas'); c.k = 1; c.sizes = []; c.full = [w, h]; return [watchLoss(c), c.getContext('2d')];
  }
  // One size smaller, in place (painting goes through fit(), which reads c.k): true if there was a smaller size to go to.
  function shrinkCanvas(c, name) {
    const k = c.sizes.find(s => s < c.k);
    if (!k || FORCE_K) return false;
    c.width = Math.round(c.full[0] * k); c.height = Math.round(c.full[1] * k); c.k = k;
    DBG.made[name] = c.width + '×' + c.height + ' at ' + k + ' (made smaller after a loss)';
    return true;
  }
  // A big canvas is drawn on at its own scale (bigCanvas). A phone that wipes a canvas to save memory (an iPhone does it without
  // a word; Chrome says 'contextlost') resets that scale with it, and the next painting came out magnified and shifted: Blake's
  // screenshot, the ground slid off to one side, the fog gone, "too far from your city". So every painting sets the scale first.
  const fit = (cv, c) => c.setTransform(cv.k || 1, 0, 0, cv.k || 1, 0, 0);
  // The fog is soft at its edges, so half size looks the same and leaves the ground the room to be sharp.
  const [shroudCv, sctx] = bigCanvas(TERR_W, TERR_H, LOW_MEM ? [0.35, 0.25] : [0.5, 0.35, 0.25], 'fog');
  const explored = new Uint8Array(MAP_W * MAP_H);

  function initShroud() {
    explored.fill(0);
    paintShroud();
  }
  // The shroud over the whole slab, with every explored tile opened again.
  function paintShroud() {
    fit(shroudCv, sctx);
    sctx.globalCompositeOperation = 'source-over';
    sctx.clearRect(0, 0, TERR_W, TERR_H);
    sctx.fillStyle = '#06070c'; // Westwood Pitch Black Shroud, over the slab and its hills
    const at = (x, y, h) => [(x - y) * TILE + ISO_OFFSET_X, (x + y) * TILE * 0.5 - h * LEVEL + PAD];
    const up = PAD / LEVEL, down = -SKIRT / LEVEL;
    const edge = [at(0, 0, up), at(MAP_W, 0, up), at(MAP_W, 0, down), at(MAP_W, MAP_H, down), at(0, MAP_H, down), at(0, MAP_H, up)];
    sctx.beginPath(); edge.forEach(([x, y], k) => k ? sctx.lineTo(x, y) : sctx.moveTo(x, y)); sctx.closePath(); sctx.fill();
    sctx.globalCompositeOperation = 'destination-out'; sctx.fillStyle = 'rgba(0, 0, 0, 1)';
    for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) {
      if (!explored[y * MAP_W + x]) continue;
      const { ix, iy } = toIso((x + 0.5) * TILE, (y + 0.5) * TILE);
      sctx.beginPath(); sctx.arc(ix + ISO_OFFSET_X, iy + PAD, TILE * 0.9, 0, Math.PI * 2); sctx.fill();
    }
    miniDirty = true;
    revealShroud();
  }

  function revealShroud() {
    fit(shroudCv, sctx);
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

    for (const u of W.units('p')) punch(u.x, u.y, (u.def.sight || 170) * (W.artifacts.liahona ? 1.5 : 1));   // farther with the Liahona
    for (const b of W.buildings('p')) if (b.def.wall == null) punch(b.x, b.y, 110 + Math.max(b.w, b.h) * TILE * 0.5);
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

  const [terrain, tctx] = bigCanvas(TERR_W, TERR_H, LOW_MEM ? [0.7, 0.5, 0.35] : [1, 0.7, 0.5, 0.35], 'ground');
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
    if (!DBG.on) return paintTerrainNow();
    const t0 = performance.now(); DBG.paint = 'started';
    try { paintTerrainNow(); DBG.paint = 'done in ' + Math.round(performance.now() - t0) + ' ms'; }
    catch (e) { DBG.paint = 'FAILED: ' + e.message; throw e; }
  }
  function paintTerrainNow() {
    fit(terrain, tctx);
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

  // A rock face with stone to quarry: a few cut blocks show where a cart can work.
  function paintQuarry(c, P, h) {
    for (let k = 0; k < 3; k++) {
      const [qx, qy] = inTile(P, 0.22 + 0.56 * h(30 + k), 0.3 + 0.45 * h(34 + k));
      c.fillStyle = 'rgba(228, 224, 216, .85)'; c.fillRect(qx - 3, qy - 2, 6, 3.5);
      c.fillStyle = 'rgba(66, 60, 56, .55)'; c.fillRect(qx - 3, qy + 1.5, 6, 1);
    }
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
    else if (t === T.ROCK) { paintBoulders(c, P, h, shade); if (a > 0 && (W.border == null || W.borderOpen || y >= W.border)) paintQuarry(c, P, h); }
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
      const cv = watchLoss(document.createElement('canvas')); cv.width = w * S; cv.height = ht * S;
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
  function addDust(ix, iy) {                       // a helper's blow on a building: a little puff of dust
    if (particles.length > 80) return;
    particles.push({ ix: ix + (Math.random() - 0.5) * 6, iy: iy - Math.random() * 4, vx: (Math.random() - 0.5) * 0.7, vy: -0.35 - Math.random() * 0.4, size: 2 + Math.random() * 2.5, life: 0, maxLife: 26, dust: true });
  }
  function addSpark(ix, iy) {
    if (particles.length > 80) return;
    particles.push({ ix, iy, vx: (Math.random() - 0.5) * 2.5, vy: (Math.random() - 0.5) * 2.5 - 1, size: 1.5, life: 0, maxLife: 15, spark: true });
  }

  // Sacred Covenant Ripples & Pillar of Light (Alma 46:36)
  const sacredRipples = [];
  let camShake = 0;
  function triggerPlantStandardEffect(city, pos, now) {
    const { ix, iy } = toIso(pos.x, pos.y);
    sacredRipples.push({
      ix, iy,
      born: now,
      maxLife: 1500,
      maxR: 160
    });
    camShake = 4.2;
    // Holy golden light particles ascending to heaven
    for (let i = 0; i < 28; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.8 + Math.random() * 2.4;
      particles.push({
        ix: ix + (Math.random() - 0.5) * 10,
        iy: iy - 14 + (Math.random() - 0.5) * 8,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed * 0.45 - 1.3 - Math.random() * 1.8,
        size: 2.2 + Math.random() * 2.4,
        life: 0,
        maxLife: 35 + Math.floor(Math.random() * 25),
        gold: true
      });
    }
    // Deep ground impact dust puffs around standard base
    for (let d = 0; d < 7; d++) {
      addDust(ix + (Math.random() - 0.5) * 20, iy + 3 + (Math.random() - 0.5) * 8);
    }
  }

  function drawSacredRipples(now) {
    if (!sacredRipples.length) return;
    for (let i = sacredRipples.length - 1; i >= 0; i--) {
      const r = sacredRipples[i];
      const elapsed = now - r.born;
      if (elapsed >= r.maxLife) {
        sacredRipples.splice(i, 1);
        continue;
      }
      const p = elapsed / r.maxLife;
      const curR = r.maxR * Math.sqrt(p);
      const alpha = (1 - p) * 0.88;

      ctx.save();
      // Outer golden covenant ring
      ctx.strokeStyle = `rgba(253, 230, 138, ${alpha})`;
      ctx.lineWidth = 3.5 * (1 - p * 0.65);
      ctx.beginPath();
      ctx.ellipse(r.ix, r.iy, curR, curR * 0.5, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Inner amber resonance ring
      ctx.strokeStyle = `rgba(217, 119, 6, ${alpha * 0.65})`;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.ellipse(r.ix, r.iy, curR * 0.72, curR * 0.36, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Soft holy turf illumination
      ctx.fillStyle = `rgba(254, 240, 138, ${alpha * 0.12})`;
      ctx.beginPath();
      ctx.ellipse(r.ix, r.iy, curR, curR * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function drawSacredPillars(now) {
    if (!sacredRipples.length) return;
    for (const r of sacredRipples) {
      const elapsed = now - r.born;
      if (elapsed >= r.maxLife) continue;
      const p = elapsed / r.maxLife;
      if (p < 0.65) {
        const lp = p / 0.65;
        const beamAlpha = Math.sin(lp * Math.PI) * 0.85;
        const beamW = 24 * (1 - lp * 0.45);
        ctx.save();
        const grad = ctx.createLinearGradient(r.ix, r.iy, r.ix, r.iy - 140);
        grad.addColorStop(0, `rgba(254, 240, 138, ${beamAlpha * 0.85})`);
        grad.addColorStop(0.65, `rgba(253, 230, 138, ${beamAlpha * 0.45})`);
        grad.addColorStop(1, 'rgba(253, 230, 138, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(r.ix - beamW * 0.5, r.iy - 140, beamW, 140);
        ctx.restore();
      }
    }
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
    if (W.t - W.quakeAt < 1.2) { const s = (1.2 - (W.t - W.quakeAt)) * 5; ctx.translate((Math.random() - 0.5) * s, (Math.random() - 0.5) * s); }   // the earthquake
    if (camShake > 0.05) { ctx.translate((Math.random() - 0.5) * camShake, (Math.random() - 0.5) * camShake); camShake *= 0.88; }
    ctx.drawImage(terrain, -ISO_OFFSET_X, -PAD, TERR_W, TERR_H);
    drawGlints(now);

    const inView = e => {
      const { ix, iy } = toIso(e.x, e.y);
      return ix > cam.x - 160 && ix < cam.x + vw / cam.z + 160 && iy > cam.y - 160 && iy < cam.y + vh / cam.z + 160;
    };
    const selSet = new Set(sel);

    drawCover();
    drawSacredRipples(now);
    if (W.border != null && !W.borderOpen) drawBorder();

    // Isometric depth sorting: entities with larger (x + y) are closer to camera and drawn on top
    const isoDepth = e => e.kind === 'building' ? (e.tx + e.w * 0.5 + e.ty + e.h * 0.5) * TILE : (e.depth != null ? e.depth : (e.x + e.y));
    const ents = [];
    for (const e of W.ents.values()) {
      if (inView(e) && isVisible(e)) {
        ents.push(e);
        if (e.type === 'cart' && e.order && e.order.type === 'gather' && e.phase === 'work' && !(e.path && e.path.length)) {
          const hwProxy = getCartHarvesterProxy(e, now);
          if (hwProxy) ents.push(hwProxy);
        }
      }
    }
    for (const e of ents) if (e.kind === 'building') drawFloor(e);
    for (const t of trees) if (inView(t)) ents.push(t);
    ents.sort((a, b) => isoDepth(a) - isoDepth(b));

    // Draw entities in depth order
    for (const e of ents) {
      if (e.kind === 'tree') {
        drawTree(e);
      } else if (e.kind === 'building') {
        drawBuilding(e, selSet.has(e.id), now);
      } else if (e.kind === 'cartHarvester') {
        drawCartHarvesterWorker(e.state, now);
      } else {
        if (selSet.has(e.id)) drawRing(e);
        drawUnit(e, now);
        if (selSet.has(e.id) || (e.hitAt && W.t - e.hitAt < 3)) {
          const { ix, iy } = toIso(e.x, e.y);
          hpBar(ix, iy - radius(e) - 18, 22, e.hp / e.def.hp);
        }
      }
    }

    drawSacredPillars(now);

    // Dynamic environmental smoke, sparks & specialized industry particles
    for (const e of ents) {
      if (e.kind === 'building' && e.built >= 1) {
        const { ix, iy } = toIso(e.x, e.y);
        if (e.type === 'armory' && Math.random() < 0.25) { addSmoke(ix + 6, iy - 32, false); addSpark(ix + 8, iy - 12); }
        if (e.type === 'brickworks' && Math.random() < 0.16) addSmoke(ix + 10, iy - 42, true);
        if (e.type === 'quarry' && Math.random() < 0.18) { addDust(ix + (Math.random() - 0.5) * 22, iy - 6); addSpark(ix + (Math.random() - 0.5) * 22, iy - 10); }
        if (e.type === 'sawmill' && Math.random() < 0.25) {
          particles.push({
            ix: ix + 4, iy: iy - 12,
            vx: 0.8 + Math.random() * 1.2, vy: -0.8 - Math.random(),
            size: 2.0, wood: true, life: 0, maxLife: 20
          });
        }
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
      } else if (p.gold) {
        ctx.fillStyle = `rgba(254,240,138,${alpha * 0.95})`;
        ctx.beginPath(); ctx.arc(p.ix, p.iy, p.size * (1 - p.life / p.maxLife * 0.4), 0, 7); ctx.fill();
      } else if (p.wood) {
        ctx.fillStyle = `rgba(180,83,9,${alpha})`;
        ctx.save(); ctx.translate(p.ix, p.iy); ctx.rotate(p.life * 0.25);
        ctx.fillRect(-p.size, -p.size * 0.6, p.size * 2, p.size * 1.2);
        ctx.restore();
      } else if (p.chaff) {
        ctx.fillStyle = `rgba(253,224,71,${alpha * 0.95})`;
        ctx.save(); ctx.translate(p.ix, p.iy); ctx.rotate(p.life * 0.18);
        ctx.fillRect(-p.size, -p.size * 0.4, p.size * 2, p.size * 0.8);
        ctx.restore();
      } else if (p.transfer) {
        ctx.fillStyle = p.col || '#fbbf24';
        ctx.beginPath(); ctx.arc(p.ix, p.iy, p.size, 0, 7); ctx.fill();
      } else if (p.dust) {
        ctx.fillStyle = `rgba(214,190,140,${alpha * 0.85})`;
        ctx.beginPath(); ctx.arc(p.ix, p.iy, p.size + p.life * 0.08, 0, 7); ctx.fill();
      } else if (p.dark) {
        ctx.fillStyle = `rgba(28,25,23,${alpha * 0.65})`;
        ctx.beginPath(); ctx.arc(p.ix, p.iy, p.size, 0, 7); ctx.fill();
      } else {
        ctx.fillStyle = `rgba(249,115,22,${alpha * 0.8})`;
        ctx.beginPath(); ctx.arc(p.ix, p.iy, p.size, 0, 7); ctx.fill();
      }
    }

    drawEffects();
    drawZones(now);
    drawLiahona();
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
    ctx.drawImage(shroudCv, -ISO_OFFSET_X, -PAD, TERR_W, TERR_H);
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
  // Where an army can lie hidden (the Sidon mission). (It was once also named drawZones, and the miracles' drawZones hid it.)
  function drawCover() {
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
    const col = u.def.hero || (u.def.leader && u.team === 'p') ? '#fcd34d' : u.team === 'p' ? '#4ade80' : '#ef4444';
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

  const ready = img => img && img.complete && img.naturalWidth;

  // Harvester worker logistics attached to parked horse carts
  function getCartHarvesterProxy(u, now) {
    if (!u.order || u.order.tx == null || u.order.ty == null) return null;
    let k = unitKinetic.get(u);
    if (!k) { k = {}; unitKinetic.set(u, k); }

    const targetTile = W ? W.tile(u.order.tx, u.order.ty) : null;
    const gatherRes = u.order.res || (targetTile === T.FOREST ? 'timber' : targetTile === T.ROCK ? 'stone' : 'grain');

    // Cart facing and wagon bed tailgate deposit spot
    const cartFlip = k.lastFlip || 1;
    const bedWx = u.x + (cartFlip > 0 ? 10 : -10);
    const bedWy = u.y + (cartFlip > 0 ? 6 : -6);    // Tailgate deposit area at the rear of the wagon bed

    // Direction vector from cart bed to resource tile center
    const resWx = (u.order.tx + 0.5) * TILE;
    const resWy = (u.order.ty + 0.5) * TILE;
    const toResX = resWx - bedWx;
    const toResY = resWy - bedWy;
    const toResDist = Math.hypot(toResX, toResY) || 1;
    const dirX = toResX / toResDist;
    const dirY = toResY / toResDist;

    // Harvest station: deliberate visual stride of 22 to 28 world pixels away from wagon bed
    const harvestDist = Math.max(22, Math.min(toResDist - 8, 28));
    const standWx = bedWx + dirX * harvestDist + 4;
    const standWy = bedWy + dirY * harvestDist + 8;

    // 2.8 second deliberate RTS logistics loop (100% continuous, zero teleportation)
    const loopSec = 2.8;
    const cycle = ((now * 0.001 / loopSec + (u.id * 0.37)) % 1.0);

    let curWx = bedWx, curWy = bedWy;
    let wAngle = 0;
    let wBob = 0;
    let wCarrying = false;
    let settleBounce = 0;

    if (cycle < 0.28) {
      // Phase 1: Walking from cart bed tailgate out to resource station (empty hands)
      const p = cycle / 0.28;
      const ease = p * p * (3 - 2 * p);
      curWx = bedWx + (standWx - bedWx) * ease;
      curWy = bedWy + (standWy - bedWy) * ease;
      wBob = Math.abs(Math.sin(p * Math.PI * 4)) * 2.2;
      const wFlip = (standWx >= bedWx) ? 1 : -1;
      wAngle = 0.07 * wFlip;
      wCarrying = false;
    } else if (cycle < 0.64) {
      // Phase 2: Harvesting at resource (2 heavy, deliberate strikes)
      curWx = standWx;
      curWy = standWy;
      const p = (cycle - 0.28) / 0.36;
      const swing = (p * 2) % 1.0;
      const swingIdx = Math.floor(p * 2);

      if (swing < 0.52) {
        // Slow deliberate windup
        const wp = swing / 0.52;
        wAngle = -0.32 * Math.sin(wp * Math.PI * 0.5);
        wBob = -wp * 1.4;
      } else if (swing < 0.76) {
        // Power strike impact
        const sp = (swing - 0.52) / 0.24;
        wAngle = -0.32 + sp * 0.68;
        wBob = sp * 2.4;
        const strikeId = swingIdx + '_' + Math.floor(now * 0.001 / loopSec);
        if (sp > 0.60 && k.lastCartStrike !== strikeId) {
          k.lastCartStrike = strikeId;
          const { ix: sIsoX, iy: sIsoY } = toIso(standWx, standWy);
          const wFlip = (resWx >= standWx) ? 1 : -1;
          if (gatherRes === 'timber') {
            for (let c = 0; c < 5; c++) {
              particles.push({
                ix: sIsoX + 10 * wFlip, iy: sIsoY - 14 + (Math.random() - 0.5) * 6,
                vx: wFlip * (0.8 + Math.random() * 1.6), vy: -1.4 - Math.random() * 1.2,
                size: 2.4, wood: true, life: 0, maxLife: 26
              });
            }
          } else if (gatherRes === 'grain') {
            for (let c = 0; c < 5; c++) {
              particles.push({
                ix: sIsoX + 8 * wFlip + (Math.random() - 0.5) * 6, iy: sIsoY - 8,
                vx: (Math.random() - 0.5) * 1.8, vy: -1.2 - Math.random() * 0.8,
                size: 2.0, chaff: true, life: 0, maxLife: 26
              });
            }
          } else if (gatherRes === 'stone') {
            addDust(sIsoX + 10 * wFlip, sIsoY - 6);
            addSpark(sIsoX + 10 * wFlip, sIsoY - 12);
          }
        }
      } else {
        // Recovery back to ready position
        const rp = (swing - 0.76) / 0.24;
        wAngle = 0.36 * (1 - rp);
        wBob = 2.4 * (1 - rp);
      }
      if (p > 0.85) wCarrying = true; // Bends down and picks up the load
    } else if (cycle < 0.88) {
      // Phase 3: Walking back to cart tailgate carrying the resource bundle
      const p = (cycle - 0.64) / 0.24;
      const ease = p * p * (3 - 2 * p);
      curWx = standWx + (bedWx - standWx) * ease;
      curWy = standWy + (bedWy - standWy) * ease;
      wBob = Math.abs(Math.sin(p * Math.PI * 4)) * 2.0;
      const wFlip = (bedWx >= standWx) ? 1 : -1;
      wAngle = -0.06 * wFlip; // Weight lean
      wCarrying = true;
    } else {
      // Phase 4: Depositing goods into cart bed
      const p = (cycle - 0.88) / 0.12;
      curWx = bedWx;
      curWy = bedWy;
      const wFlip = (bedWx >= standWx) ? 1 : -1;
      const dumpCurve = Math.sin(p * Math.PI);
      wAngle = dumpCurve * 0.38 * wFlip;
      wBob = dumpCurve * 2.4;
      settleBounce = Math.sin(p * Math.PI) * 3.4;
      k.settleBounce = settleBounce;
      const dumpId = 'dump_' + Math.floor(now * 0.001 / loopSec);
      if (p > 0.35 && p < 0.75 && k.lastCartDump !== dumpId) {
        k.lastCartDump = dumpId;
        const { ix: bIsoX, iy: bIsoY } = toIso(bedWx, bedWy);
        const col = gatherRes === 'grain' ? '#fde047' : gatherRes === 'stone' ? '#d1d5db' : '#b45309';
        for (let t = 0; t < 5; t++) {
          particles.push({
            ix: bIsoX + (Math.random() - 0.5) * 8, iy: bIsoY - 10,
            vx: (Math.random() - 0.5) * 1.4, vy: -1.3 - Math.random() * 0.8,
            size: 2.4, transfer: true, col, life: 0, maxLife: 20
          });
        }
      }
      if (p < 0.45) wCarrying = true;
    }

    // Convert to isometric for drawing
    const { ix, iy } = toIso(curWx, curWy);
    const wFlip = (cycle < 0.64) ? (standWx >= bedWx ? 1 : -1) : (bedWx >= standWx ? 1 : -1);

    // Natural depth sorting ensures worker renders cleanly relative to nearby trees
    const sortDepth = curWx + curWy + 2;

    return {
      kind: 'cartHarvester',
      cart: u,
      x: curWx,
      y: curWy,
      depth: sortDepth,
      state: {
        wx: ix,
        wy: iy,
        wFlip,
        wAngle,
        wBob,
        wCarrying,
        gatherRes,
        cycle
      }
    };
  }

  function drawCartHarvesterWorker(hw, now) {
    const { wx, wy, wFlip, wAngle, wBob, wCarrying, gatherRes, cycle } = hw;
    const wImg = ready(IMG.worker) ? IMG.worker : null;

    // Contact shadow
    ctx.fillStyle = 'rgba(0,0,0,0.32)';
    ctx.beginPath();
    ctx.ellipse(wx, wy + 1, 8, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.translate(wx, wy - wBob);
    ctx.scale(wFlip, 1);
    if (wAngle) ctx.rotate(wAngle);

    if (wImg) {
      ctx.drawImage(wImg, -14, -39, 20, 40);
    } else {
      ctx.fillStyle = '#a8814f';
      ctx.fillRect(-4, -18, 8, 12);
      ctx.fillStyle = '#d8bd8e';
      ctx.beginPath(); ctx.arc(0, -22, 4, 0, 7); ctx.fill();
    }

    // Carried resource or tools in hands
    if (wCarrying) {
      if (gatherRes === 'timber') {
        // Cut timber log held in both arms across chest
        ctx.fillStyle = '#451a03';
        ctx.beginPath(); ctx.roundRect(-4, -24, 18, 8, 2); ctx.fill();
        ctx.fillStyle = '#92400e';
        ctx.beginPath(); ctx.roundRect(-3, -23, 16, 6, 1.5); ctx.fill();
        ctx.fillStyle = '#fde68a';
        ctx.beginPath(); ctx.ellipse(-2, -20, 1.5, 3, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#b45309';
        ctx.beginPath(); ctx.ellipse(-2, -20, 0.8, 1.8, 0, 0, Math.PI * 2); ctx.fill();
      } else if (gatherRes === 'grain') {
        // Golden sheaf of ripe wheat
        ctx.fillStyle = '#ca8a04'; ctx.beginPath();
        ctx.ellipse(5, -21, 6, 9, 0.25, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fde047'; ctx.beginPath();
        ctx.ellipse(5, -21, 4.5, 7, 0.25, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#eab308'; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(4, -26); ctx.lineTo(1, -32); ctx.moveTo(5, -26); ctx.lineTo(5, -33); ctx.moveTo(6, -26); ctx.lineTo(9, -32); ctx.stroke();
      } else if (gatherRes === 'stone') {
        // Dressed limestone building block
        ctx.fillStyle = '#57534e'; ctx.fillRect(-1, -24, 14, 10);
        ctx.fillStyle = '#a8a29e'; ctx.fillRect(0, -23, 12, 8);
        ctx.fillStyle = '#e7e5e4'; ctx.fillRect(1, -22, 10, 3);
      }
    } else if (cycle >= 0.28 && cycle < 0.64) {
      // Dynamic tool swing at resource
      if (gatherRes === 'grain') {
        // Harvesting scythe
        ctx.strokeStyle = '#78350f'; ctx.lineWidth = 2.0; ctx.beginPath();
        ctx.moveTo(0, -16); ctx.lineTo(10, -26); ctx.stroke();
        ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 2.2; ctx.beginPath();
        ctx.arc(12, -28, 7, -1.2, 0.8); ctx.stroke();
      } else if (gatherRes === 'stone') {
        // Quarry pickaxe
        ctx.strokeStyle = '#78350f'; ctx.lineWidth = 2.2; ctx.beginPath();
        ctx.moveTo(0, -18); ctx.lineTo(12, -28); ctx.stroke();
        ctx.strokeStyle = '#64748b'; ctx.lineWidth = 2.4; ctx.beginPath();
        ctx.moveTo(7, -30); ctx.lineTo(16, -26); ctx.stroke();
      }
    } else if (cycle < 0.28) {
      // Tool held over shoulder while striding to resource
      ctx.strokeStyle = '#78350f'; ctx.lineWidth = 2.0; ctx.lineCap = 'round'; ctx.beginPath();
      ctx.moveTo(-2, -18); ctx.lineTo(-12, -28); ctx.stroke();
      if (gatherRes === 'timber') {
        ctx.fillStyle = '#cbd5e1'; ctx.beginPath();
        ctx.moveTo(-11, -30); ctx.lineTo(-16, -27); ctx.lineTo(-12, -25); ctx.closePath(); ctx.fill();
      } else if (gatherRes === 'grain') {
        ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 2.0; ctx.beginPath();
        ctx.arc(-11, -28, 5, 2.0, 4.0); ctx.stroke();
      } else if (gatherRes === 'stone') {
        ctx.strokeStyle = '#64748b'; ctx.lineWidth = 2.2; ctx.beginPath();
        ctx.moveTo(-7, -29); ctx.lineTo(-15, -26); ctx.stroke();
      }
    }

    ctx.restore();
  }

  // Ancient American / Book of Mormon Character Sprites in 2:1 Isometric (Westwood RA2 Kinetic Engine)
  function drawUnit(u, now) {
    const d = u.def;
    let { ix, iy } = toIso(u.x, u.y);
    const r = radius(u);
    const kneel = u.kneelUntil && W.t < u.kneelUntil;
    const moving = !!(u.path && u.path.length > 0);
    const bt = u.order.type === 'build' && W.ents.get(u.order.target);
    const hammering = !!(bt && !bt.dead && !moving && W.nextTo(u, W.rectOf(bt)));   // a helper at work on a building
    const working = (u.order.type === 'gather' && u.phase === 'work') || hammering;

    // --- Westwood RA2 Kinetic Motion Physics ---
    let k = unitKinetic.get(u);
    if (!k) {
      k = {
        lx: u.x, ly: u.y, lastTime: now,
        dist: 0, stridePhase: 0, speed: 0,
        lean: 0, lastFoot: -1,
        wasSel: false, popAt: 0,
        lastHp: u.hp, flinchAt: 0,
        lastStruckAt: u.struckAt || 0, lungeAt: 0
      };
      unitKinetic.set(u, k);
    }

    const dt = Math.max(0.001, Math.min(0.1, (now - (k.lastTime || now)) / 1000));
    k.lastTime = now;

    // 1. Physical ground displacement (zero moonwalking)
    const deltaX = u.x - k.lx;
    const deltaY = u.y - k.ly;
    const rawDist = Math.hypot(deltaX, deltaY);
    k.lx = u.x;
    k.ly = u.y;

    const isWarp = rawDist > 48;
    const moved = isWarp ? 0 : rawDist;
    const instantSpeed = moved / dt;
    k.speed = k.speed * 0.72 + instantSpeed * 0.28;
    const isPhysicallyMoving = k.speed > 2.2 || (moving && moved > 0.02);

    // 2. Accumulated stride & displacement-locked walk cadence
    const isCart = u.type === 'cart';
    const isBeast = u.type === 'curelom' || u.type === 'cumom';
    const STRIDE_PX = isBeast ? 30 : (isCart ? 22 : 13); // pixels per footstep
    if (moved > 0.001) {
      k.dist += moved;
      k.stridePhase = (k.dist / STRIDE_PX) * Math.PI;
    } else if (!isPhysicallyMoving) {
      k.stridePhase = k.stridePhase * 0.82;
      if (Math.abs(k.stridePhase) < 0.02) k.stridePhase = 0;
    }

    // 3. Stride vertical bobbing & lateral hip sway
    const walkCycle = isPhysicallyMoving ? Math.sin(k.stridePhase) : 0;
    const stepDown = Math.abs(walkCycle); // 0 at passing, 1 at ground impact
    let bob = 0;
    let sway = 0;
    if (isCart) {
      bob = isPhysicallyMoving ? Math.sin(k.dist * 0.55) * 0.85 : 0; // wheel chassis rumble
    } else if (isBeast) {
      bob = isPhysicallyMoving ? stepDown * 3.4 : 0; // deep quadruped ground impacts
      sway = isPhysicallyMoving ? walkCycle * 1.8 : 0; // heavy head/tusk momentum
    } else {
      bob = isPhysicallyMoving ? stepDown * 2.2 : (working ? Math.abs(Math.sin(now * 0.02 + u.id)) * 1.5 : 0);
      sway = isPhysicallyMoving ? walkCycle * 0.65 : 0;
    }

    // 4. Westwood Kinetic Squash & Stretch (muscle & armor weight)
    let scaleX = 1.0;
    let scaleY = 1.0;
    if (isPhysicallyMoving && !isCart) {
      const squash = stepDown * (isBeast ? 0.075 : 0.052);
      scaleX = 1.0 + squash * 0.75;
      scaleY = 1.0 - squash;
    } else if (!working && !isCart) {
      const breath = Math.sin(now * 0.003 + u.id) * 0.015;
      scaleX += breath;
      scaleY -= breath;
    }

    // 5. Facing orientation & forward body lean (velocity banking)
    let flip = k.lastFlip || 1;
    if (moving && u.path && u.path.length > 0) {
      const tx = Math.floor(u.x / 32), ty = Math.floor(u.y / 32);
      const nx = u.path[0][0], ny = u.path[0][1];
      const dx = nx - tx, dy = ny - ty;
      if (dx - dy < 0) flip = -1;
      else if (dx - dy > 0) flip = 1;
      k.lastFlip = flip;
    } else if (u.order.type === 'attack' && u.order.target) {
      const target = W.ents.get(u.order.target);
      if (target) {
        const dx = target.x - u.x, dy = target.y - u.y;
        if (dx - dy < 0) flip = -1;
        else if (dx - dy > 0) flip = 1;
        k.lastFlip = flip;
      }
    } else if (hammering) {
      if (bt.x - u.x - (bt.y - u.y) < 0) flip = -1;
      else flip = 1;
      k.lastFlip = flip;
    }

    const normSpeed = Math.min(1.4, k.speed / Math.max(1, (d.speed || 60)));
    const targetLean = (isPhysicallyMoving && !isCart) ? ((isBeast ? 0.04 : 0.075) * normSpeed) : 0;
    k.lean = k.lean * 0.72 + targetLean * 0.28;

    // 6. Tactical Selection "Command Pop" (instant responsiveness)
    const isSelected = sel.includes(u.id);
    if (isSelected && !k.wasSel) {
      k.popAt = now;
    }
    k.wasSel = isSelected;
    let popHop = 0;
    if (now - (k.popAt || 0) < 160) {
      const pp = (now - k.popAt) / 160;
      const pop = Math.sin(pp * Math.PI);
      scaleX *= (1 + pop * 0.07);
      scaleY *= (1 + pop * 0.07);
      popHop = pop * 2.5;
    }

    // 7. Combat Strike Lunge & Weapon Recoil Kickback
    if (u.struckAt && u.struckAt !== k.lastStruckAt) {
      k.lastStruckAt = u.struckAt;
      k.lungeAt = now;
    }
    let combatOffsetX = 0, combatOffsetY = 0;
    const lungeElapsed = now - (k.lungeAt || 0);
    if (lungeElapsed < 240) {
      const lp = lungeElapsed / 240;
      const curve = Math.sin(lp * Math.PI);
      const isRanged = (d.range || 1) > 2;
      const dist = isBeast ? curve * 7.5 : (isRanged ? -curve * 2.8 : curve * 4.5);
      combatOffsetX = dist * flip;
      combatOffsetY = dist * 0.25;
    }

    // 8. Hit Flinch / Damage Shudder
    if (u.hp < k.lastHp || (u.hitAt && W.t - u.hitAt < 0.16)) {
      if (u.hp < k.lastHp) k.flinchAt = now;
      k.lastHp = u.hp;
    }
    let flinchX = 0, flinchY = 0;
    const flinchElapsed = now - (k.flinchAt || 0);
    if (flinchElapsed < 150) {
      const fp = flinchElapsed / 150;
      const amp = (1 - fp) * 2.2;
      flinchX = Math.sin(fp * Math.PI * 5) * amp;
      flinchY = -Math.abs(Math.sin(fp * Math.PI * 3)) * amp * 0.6;
    }

    // 9. Tactile Footfall Dust Puffs & River Sidon Water Droplets
    const inFord = W && W.tile(tileOf(u.x), tileOf(u.y)) === T.FORD;
    const currentFoot = Math.floor(k.stridePhase / Math.PI);
    if (isPhysicallyMoving && currentFoot !== k.lastFoot) {
      k.lastFoot = currentFoot;
      if (inFord) {
        if (Math.random() < 0.65) {
          particles.push({
            ix: ix + (Math.random() - 0.5) * 8,
            iy: iy - 1,
            vx: (Math.random() - 0.5) * 1.4,
            vy: -1.2 - Math.random() * 0.8,
            size: 1.8, life: 0, maxLife: 15
          });
        }
      } else if (isBeast && k.speed > 10) {
        addDust(ix - 8 * flip, iy + 2);
        addDust(ix + 6 * flip, iy + 2);
      } else if (k.speed > 20 && !isCart) {
        addDust(ix - 4 * flip + (Math.random() - 0.5) * 4, iy + 1);
      } else if (isCart && k.speed > 15) {
        addDust(ix - 8 * flip, iy + 2);
      }
    }

    // 10. Harvester Labor Mechanics: Woodcutting Axe, Scythe Reaping & Stone Quarrying (Workers Only)
    const isWorkerGathering = (u.type === 'worker' || u.type === 'bearer') && u.order.type === 'gather' && u.phase === 'work' && !moving;
    let workAngle = 0;
    let workBob = 0;
    let workSway = 0;
    if (isWorkerGathering) {
      const targetTile = W ? W.tile(u.order.tx, u.order.ty) : null;
      const gatherRes = u.order.res || (targetTile === T.FOREST ? 'timber' : targetTile === T.ROCK ? 'stone' : 'grain');
      if (gatherRes === 'timber') {
        // Natural human woodcutting rhythm: 1.4s cycle (60% slow windup, 15% power chop, 25% recovery)
        const cycle = ((now * 0.0007 + u.id * 0.37) % 1.0);
        if (cycle < 0.6) {
          const p = cycle / 0.6;
          workAngle = -0.16 * Math.sin(p * Math.PI * 0.5);
          workBob = -p * 1.0;
        } else if (cycle < 0.75) {
          const p = (cycle - 0.6) / 0.15;
          workAngle = -0.16 + p * 0.42;
          workBob = p * 2.2;
          if (p > 0.8 && now - (k.lastChopAt || 0) > 400) {
            k.lastChopAt = now;
            for (let w = 0; w < 3; w++) {
              particles.push({
                ix: ix + 8 * flip, iy: iy - 12 + (Math.random() - 0.5) * 6,
                vx: flip * (0.8 + Math.random() * 1.4), vy: -1.2 - Math.random() * 1.2,
                size: 2.2, wood: true, life: 0, maxLife: 22
              });
            }
          }
        } else {
          const p = (cycle - 0.75) / 0.25;
          workAngle = 0.26 * (1 - p);
          workBob = 2.2 * (1 - p);
        }
      } else if (gatherRes === 'grain') {
        // Natural human scythe harvest: 1.6s broad sweeping arc
        const cycle = ((now * 0.0006 + u.id * 0.31) % 1.0);
        if (cycle < 0.5) {
          const p = cycle / 0.5;
          workAngle = -0.15 * Math.sin(p * Math.PI);
          workSway = -1.8 * Math.sin(p * Math.PI);
        } else if (cycle < 0.8) {
          const p = (cycle - 0.5) / 0.3;
          workAngle = 0.22 * Math.sin(p * Math.PI);
          workSway = 2.0 * Math.sin(p * Math.PI);
          if (p > 0.5 && now - (k.lastReapAt || 0) > 450) {
            k.lastReapAt = now;
            for (let g = 0; g < 3; g++) {
              particles.push({
                ix: ix + 6 * flip + (Math.random() - 0.5) * 6, iy: iy - 6,
                vx: (Math.random() - 0.5) * 1.5, vy: -0.8 - Math.random() * 0.8,
                size: 1.8, chaff: true, life: 0, maxLife: 24
              });
            }
          }
        } else {
          workAngle = 0; workSway = 0;
        }
      } else if (gatherRes === 'stone') {
        // Natural human quarry pickaxe: 1.5s strike
        const cycle = ((now * 0.00065 + u.id * 0.41) % 1.0);
        if (cycle < 0.6) {
          const p = cycle / 0.6;
          workAngle = -0.18 * Math.sin(p * Math.PI * 0.5);
          workBob = -p * 1.2;
        } else if (cycle < 0.75) {
          const p = (cycle - 0.6) / 0.15;
          workAngle = -0.18 + p * 0.46;
          workBob = p * 2.4;
          if (p > 0.8 && now - (k.lastMineAt || 0) > 400) {
            k.lastMineAt = now;
            addDust(ix + 8 * flip, iy - 6);
            addSpark(ix + 8 * flip, iy - 10);
          }
        } else {
          const p = (cycle - 0.75) / 0.25;
          workAngle = 0.28 * (1 - p);
          workBob = 2.4 * (1 - p);
        }
      }
    }

    // 11. Worker Resource Dump & Cart Heavy-Load Suspension Settle
    let dumpAngle = 0;
    let dumpY = 0;
    if (!isCart && u.dumpAt && W.t - u.dumpAt < 0.35) {
      const dp = (W.t - u.dumpAt) / 0.35;
      const dumpCurve = Math.sin(dp * Math.PI);
      dumpAngle = dumpCurve * 0.28 * flip;
      dumpY = dumpCurve * 3.0;
      if (!k.dumpSpawned || k.dumpAt !== u.dumpAt) {
        k.dumpSpawned = true; k.dumpAt = u.dumpAt;
        const col = u.dumpType === 'grain' ? '#fde047' : u.dumpType === 'stone' ? '#d1d5db' : '#b45309';
        for (let t = 0; t < 4; t++) {
          particles.push({
            ix: ix + (Math.random() - 0.5) * 6, iy: iy - 10,
            vx: flip * (1.0 + Math.random() * 1.2), vy: -1.6 - Math.random() * 1.0,
            size: 2.2, transfer: true, col, life: 0, maxLife: 18
          });
        }
      }
    }

    let cartBounce = 0;
    const isCartHarvesting = isCart && u.order.type === 'gather' && u.phase === 'work' && !moving;
    if (isCart && k.settleBounce) {
      cartBounce += k.settleBounce;
      k.settleBounce *= 0.85;
    } else if (isCart && u.settleAt && W.t - u.settleAt < 0.4) {
      const sp = (W.t - u.settleAt) / 0.4;
      cartBounce = Math.sin(sp * Math.PI * 2) * (1 - sp) * 2.8; // subtle 2.8px wooden spring settle
    }

    const blow = hammering ? Math.max(0, Math.sin(now * 0.011 + u.id * 1.7)) : 0;
    if (hammering) {
      const p = toIso(bt.x, bt.y), dx = p.ix - ix, dy = p.iy - iy, dd = Math.hypot(dx, dy) || 1;
      ix += dx / dd * 18; iy += dy / dd * 9;
      if (blow > 0.97 && now - (dustAt.get(u) || -1e9) > 300) {     // the blow lands: dust where it struck
        dustAt.set(u, now);
        const a = Math.atan2(bt.y - u.y, bt.x - u.x), pt = toIso(u.x + Math.cos(a) * 18, u.y + Math.sin(a) * 18);
        addDust(pt.ix, pt.iy - 6); addDust(pt.ix, pt.iy - 10);
      }
    }

    const x = ix + sway + workSway + combatOffsetX + flinchX;
    const y = iy - (kneel ? -2 : 1) - bob - workBob - popHop + combatOffsetY + flinchY + dumpY + cartBounce;

    if (inFord) {
      // Tactical river ford crossing (Alma 43:31–35): animated ripples and splashes over River Sidon
      const rip1 = (now * 0.0022 + u.id * 0.23) % 1;
      const rip2 = (now * 0.0022 + u.id * 0.23 + 0.5) % 1;
      ctx.strokeStyle = `rgba(186, 230, 253, ${0.55 * (1 - rip1)})`; ctx.lineWidth = 1.3;
      ctx.beginPath(); ctx.ellipse(ix, iy, r * 1.1 + rip1 * 12, (r * 0.55 + rip1 * 6), 0, 0, 7); ctx.stroke();
      ctx.strokeStyle = `rgba(186, 230, 253, ${0.4 * (1 - rip2)})`; ctx.lineWidth = 1.0;
      ctx.beginPath(); ctx.ellipse(ix, iy, r * 1.1 + rip2 * 12, (r * 0.55 + rip2 * 6), 0, 0, 7); ctx.stroke();
      if (moving) {
        ctx.fillStyle = `rgba(255, 255, 255, ${0.7 + 0.2 * Math.sin(now * 0.02 + u.id)})`;
        ctx.beginPath(); ctx.arc(ix - 5 * flip, iy - 2, 2.2, 0, 7); ctx.fill();
        ctx.beginPath(); ctx.arc(ix + 6 * flip, iy - 1, 1.8, 0, 7); ctx.fill();
      }
    } else {
      const shadowScale = isPhysicallyMoving ? (1.0 - (bob / 2.2) * 0.1) : (popHop > 0 ? (1.0 - (popHop / 2.5) * 0.18) : 1.0);
      ctx.fillStyle = `rgba(0,0,0,${0.32 * shadowScale})`;
      ctx.beginPath();
      ctx.ellipse(ix + 2, iy + 2, r * 0.95 * shadowScale, r * 0.48 * shadowScale, 0, 0, 7);
      ctx.fill();
    }
    if (u.type === 'cart' && u.burstUntil > W.t && Math.random() < 0.45) addDust(ix - 12 * flip, iy + 2);
    if (u.thirstUntil > W.t) {                       // bloodthirst (Moroni 9:5): a red glow at his feet
      ctx.fillStyle = `rgba(220,38,38,${0.32 + 0.18 * Math.sin(now * 0.015 + u.id)})`; ctx.beginPath(); ctx.ellipse(ix, iy, r * 1.6, r * 0.8, 0, 0, 7); ctx.fill();
    }
    if (u.poisonUntil > W.t) {                       // poison by degrees (Alma 47:18): green bubbles rising over his head
      for (let k = 0; k < 3; k++) { const p = (now * 0.0011 + k / 3) % 1; ctx.fillStyle = `rgba(132,204,22,${0.9 * (1 - p)})`; ctx.beginPath(); ctx.arc(ix - 5 + k * 5, iy - 50 - p * 14, 2 + k * 0.4, 0, 7); ctx.fill(); }
    }

    const hid = W.hidden(u);
    if (hid) ctx.globalAlpha = 0.5;

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(flip * scaleX, scaleY);
    if (hammering) ctx.rotate(blow * 0.24 - 0.07);    // leans into each blow
    else if (isWorkerGathering) ctx.rotate(workAngle); // woodchopping chop, scythe sweep, or pickaxe strike
    else if (dumpAngle) ctx.rotate(dumpAngle);        // bending forward to dump goods into cart
    else if (k.lean) ctx.rotate(k.lean);

    let uImg = IMG.spearman;
    let uw = 28, uh = 44, uox = 11, uoy = 43;
    if (u.type === 'standard') {
      const hType = u.heroType || 'moroni';
      uImg = ready(IMG[hType]) ? IMG[hType] : IMG.moroni;
      if (hType === 'lehi') { uw = 40; uh = 48; uox = 24; uoy = 47; }
      else if (hType === 'gidgiddoni') { uw = 28; uh = 48; uox = 18; uoy = 47; }
      else if (hType === 'helaman') { uw = 37; uh = 48; uox = 18; uoy = 47; }
      else { uw = 37; uh = 48; uox = 17; uoy = 47; }
    } else if (u.type === 'lehi') {
      uImg = IMG.lehi;
      uw = 40; uh = 48; uox = 24; uoy = 47;
    } else if (u.type === 'gidgiddoni') {
      uImg = IMG.gidgiddoni;
      uw = 28; uh = 48; uox = 18; uoy = 47;
    } else if (u.type === 'helaman') {
      uImg = ready(IMG.helaman) ? IMG.helaman : IMG.moroni;
      if (uImg === IMG.helaman) { uw = 37; uh = 48; uox = 18; uoy = 47; } else { uw = 37; uh = 48; uox = 17; uoy = 47; }
    } else if (u.type === 'teancum' || u.type === 'amalickiah' || u.type === 'ammoron') {
      uImg = ready(IMG[u.type]) ? IMG[u.type] : u.type === 'teancum' ? IMG.moroni : IMG.lamanCaptain;
      uh = 48; uw = Math.round(48 * uImg.naturalWidth / uImg.naturalHeight); uox = Math.round(uw / 2); uoy = 47;
    } else if (u.type === 'moroni' || d.hero) {
      uImg = IMG.moroni;                         // the older pictures, drawn at their own shape
      uw = 37; uh = 48; uox = 17; uoy = 47;      // (they were squeezed to 60-85% of their width)
    } else if (u.type === 'curelom' || u.type === 'cumom') {
      uImg = IMG[u.type];                        // drawn by Gemini at three times their size on screen (art/requests/017)
      uw = uImg.naturalWidth / 3; uh = uImg.naturalHeight / 3; uox = uw / 2; uoy = uh - 2;
    } else if (u.type === 'stripling') {
      uImg = IMG.stripling;
      uw = 37; uh = 44; uox = 15; uoy = 43;
    } else if (u.type === 'nslinger') {
      uImg = IMG.nslinger;
      uw = 26; uh = 44; uox = 15; uoy = 43;
    } else if (u.type === 'archer') {
      uImg = IMG.archer;
      uw = 23; uh = 44; uox = 9; uoy = 43;
    } else if (u.type === 'swordsman') {
      uImg = IMG.swordsman;
      uw = 21; uh = 44; uox = 12; uoy = 43;
    } else if (u.type === 'javelin') {
      uImg = IMG.javelin;
      uw = 40; uh = 44; uox = 16; uoy = 43;
    } else if (u.type === 'robber') {           // Gemini's are cropped to the figure: uox is
      uImg = IMG.robber;                         // where the feet are, so they stand on the spot
      uw = 28; uh = 44; uox = 17; uoy = 43;
    } else if (u.type === 'robberArcher') {
      uImg = IMG.robberArcher;
      uw = 33; uh = 44; uox = 13; uoy = 43;
    } else if (u.type === 'giddianhi' || u.type === 'zemnarihah') {
      uImg = IMG.robberChief;
      uw = 30; uh = 48; uox = 18; uoy = 47;
    } else if (u.type === 'slinger') {          // the Lamanite slinger
      uImg = IMG.lamanSlinger;
      uw = 33; uh = 44; uox = 24; uoy = 43;
    } else if (u.type === 'amalekite' || u.type === 'zoramite') {
      uImg = IMG.lamanCaptain;                   // clothed, not armored (Alma 43:20-21)
      uw = 26; uh = 44; uox = 17; uoy = 43;
    } else if (u.type === 'zerahemnah') {
      uImg = IMG.zerahemnah;
      uw = 36; uh = 48; uox = 17; uoy = 47;
    } else if (u.type === 'bearer') {              // the King-men's bearer (014), bent under his bundle
      uImg = ready(IMG.bearer) ? IMG.bearer : IMG.lamanite;
      if (uImg === IMG.bearer) { uw = 27; uh = 44; uox = 13; uoy = 43; } else { uw = 41; uh = 44; uox = 19; uoy = 43; }
    } else if (u.type === 'lamanite' || d.foe) {
      uImg = IMG.lamanite;
      uw = 41; uh = 44; uox = 19; uoy = 43;
    } else if (u.type === 'cart') {
      // The cart and its driver: loading at a field, forest or rock face; laden on the way home; else empty.
      // The pictures are kept at three times their size on screen, all scaled alike, so the cart stays one size.
      const load = u.carry && u.carry.amt > 0 ? u.carry.type : null;
      if (isCartHarvesting) {
        uImg = load === 'grain' ? (ready(IMG.cartGrainParked) ? IMG.cartGrainParked : IMG.cartGrain) :
               load === 'timber' ? (ready(IMG.cartTimberParked) ? IMG.cartTimberParked : IMG.cartTimber) :
               load === 'stone' ? (ready(IMG.cartStoneParked) ? IMG.cartStoneParked : IMG.cartStone) :
               (ready(IMG.cartParked) ? IMG.cartParked : IMG.cart);
      } else {
        uImg = load === 'grain' ? IMG.cartGrain : load === 'timber' ? IMG.cartTimber : load === 'stone' ? IMG.cartStone : IMG.cart;
      }
      if (!(uImg.complete && uImg.naturalWidth)) uImg = IMG.cart;
      uw = uImg.naturalWidth / 3; uh = uImg.naturalHeight / 3; uox = uw / 2; uoy = uh - 1;
    } else if (u.type === 'spy') {
      uImg = IMG.spy;                            // 76 × 150 like the worker
      uw = 20; uh = 40; uox = 10; uoy = 39;
    } else if (u.type === 'worker') {
      uImg = IMG.worker;                         // 76 × 150, cropped to the figure: feet on the ground
      uw = 20; uh = 40; uox = 14; uoy = 39;
    }

    if (uImg && uImg.complete && uImg.naturalWidth) {
      ctx.drawImage(uImg, -uox, -uoy, uw, uh);
      if (u.type === 'standard') {
        drawTitleOfLibertyStandard(flip, now, u.id);
      } else if (u.type === 'worker' && ((u.order && u.order.type === 'attack') || (u.cool && u.cool > 0.6))) {
        drawWorkerScytheCombat(now, u.id);
      }
    } else {
      ctx.fillStyle = '#451a03';
      ctx.fillRect(-3 + walkCycle * 3, 2, 2.5, 6);
      ctx.fillRect(1 - walkCycle * 3, 2, 2.5, 6);
      let tunicColor = d.foe ? '#7f1d1d' : (u.type === 'worker' ? '#a8814f' : (d.hero ? '#b45309' : '#4ade80'));
      ctx.fillStyle = tunicColor;
      ctx.fillRect(-4, -6, 8, 8);
      ctx.fillStyle = d.foe ? '#b45309' : '#d8bd8e';
      ctx.beginPath(); ctx.arc(0, -10, 4, 0, 7); ctx.fill();
      if (u.type === 'standard') {
        drawTitleOfLibertyStandard(flip, now, u.id);
      } else if (u.type === 'worker' && ((u.order && u.order.type === 'attack') || (u.cool && u.cool > 0.6))) {
        drawWorkerScytheCombat(now, u.id);
      }
    }

    if (u.type === 'cart' && u.burstUntil > W.t) {
      if (!u.burstSoundPlayed) {
        u.burstSoundPlayed = true;
        if (AUDIO) AUDIO.play('cartSpeedBurst');
      }
      ctx.strokeStyle = 'rgba(254, 240, 138, 0.7)'; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
      for (let s = 0; s < 3; s++) {
        const sy = -8 - s * 6;
        ctx.beginPath();
        ctx.moveTo(-uox - 4, sy);
        ctx.lineTo(-uox - 22 - s * 5, sy);
        ctx.stroke();
      }
    } else if (u.type === 'cart') {
      u.burstSoundPlayed = false;
    }
    
    ctx.restore();
    if (hid) ctx.globalAlpha = 1;
    
    if (u.sword) {                                  // the sword of Laban, held high
      ctx.strokeStyle = '#fde68a'; ctx.lineWidth = 2; ctx.lineCap = 'round';
      const sy = iy - uh - 8 - (u.rank || 0) * 4; ctx.beginPath(); ctx.moveTo(ix + 7, sy - 8); ctx.lineTo(ix + 7, sy + 2); ctx.moveTo(ix + 4, sy); ctx.lineTo(ix + 10, sy); ctx.stroke();
    }
    if (u.rank) {                                   // a veteran's chevrons (Alma 53:20)
      const rankColor = u.rank >= 2 ? '#fef08a' : '#f59e0b';
      for (let k = 0; k < u.rank; k++) {
        const cy = iy - uh - 5 - k * 5;
        ctx.strokeStyle = 'rgba(15, 9, 4, 0.9)'; ctx.lineWidth = 2.8; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.beginPath(); ctx.moveTo(ix - 4, cy + 3); ctx.lineTo(ix, cy - 1); ctx.lineTo(ix + 4, cy + 3); ctx.stroke();
        ctx.strokeStyle = rankColor; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(ix - 4, cy + 3); ctx.lineTo(ix, cy - 1); ctx.lineTo(ix + 4, cy + 3); ctx.stroke();
      }
      if (u.rank >= 2) {
        const glow = (Math.sin(now / 180 + u.id) + 1) * 0.5;
        ctx.strokeStyle = `rgba(253, 224, 71, ${0.3 + 0.3 * glow})`; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.ellipse(ix, iy, r * 1.15, r * 0.58, 0, 0, 7); ctx.stroke();
      }
    }
    if (u.hp < u.max && (sel.includes(u.id) || u.team === 'r')) {
      const pct = Math.max(0, u.hp / u.max);
      const barY = iy - uh - 4 - (u.rank ? u.rank * 5 + 3 : 0);
      ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fillRect(ix - 10, barY, 20, 3.5);
      ctx.fillStyle = u.team === 'p' ? '#4ade80' : '#f87171';
      ctx.fillRect(ix - 9.5, barY + 0.5, 19 * pct, 2.5);
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
    stronghold: { cx: 542, by: 701, span: 990 },
    encampment: { cx: 498, by: 740, span: 996 },
    councilPlatform: { cx: 488, by: 708, span: 962 },
    acropolis: { cx: 542, by: 701, span: 990 },
    barracks: { cx: 191, by: 291, span: 331 },
    storehouse: { cx: 187, by: 283, span: 358 },
    tower: { cx: 214, by: 493, span: 428 },
    armory: { cx: 74, by: 147, span: 150 },
    granary: { cx: 200, by: 333, span: 397 },
    // The King-men's camp (014) and the Freemen's smithy and training ground (015): each as wide as its plot, set by its front corner.
    tents: { cx: 150, by: 183, span: 300 },
    storetent: { cx: 150, by: 193, span: 300 },
    muster: { cx: 225, by: 276, span: 450 },
    shieldtent: { cx: 150, by: 186, span: 300 },
    ladderworks: { cx: 150, by: 197, span: 300 },
    pavilion: { cx: 225, by: 380, span: 450 },
    smithy: { cx: 150, by: 295, span: 300 },
    training: { cx: 187, by: 322, span: 375 },
    wardance: { cx: 187, by: 234, span: 375 },
    rameumptom: { cx: 301, by: 480, span: 600 },
    idol_jaguar: { cx: 225, by: 412, span: 450 },
    idol_warrior: { cx: 226, by: 556, span: 450 },
    stables: { cx: 200, by: 318, span: 375 },
    hall: { cx: 200, by: 310, span: 400 },
    temple: { cx: 301, by: 709, span: 600 },
    ruin: { cx: 99, by: 154, span: 209 },
    lamaniteCamp: { cx: 210, by: 240, span: 419 },
    robbersCamp: { cx: 210, by: 242, span: 418 },
    warcamp: { cx: 210, by: 267, span: 419 },
    quarry: { cx: 488, by: 702, span: 977 },
    sawmill: { cx: 437, by: 736, span: 875 },
    brickworks: { cx: 502, by: 848, span: 1004 },
    lamaniteTower: { cx: 199, by: 461, span: 398 },
  };
  // Which picture a building is drawn with: the Lamanites' watchtowers are their own; a camp is the robbers' in 3 Nephi, the Lamanites' elsewhere.
  const pictureOf = b => (b.type === 'tower' && b.team === 'r') || b.type === 'lookout' ? 'lamaniteTower' : b.type === 'warcamp' ? 'warcamp' : b.type === 'idol' ? (b.id % 2 ? 'idol_jaguar' : 'idol_warrior')
    : b.type === 'camp' ? (mission && mission.campaign === 'gidgiddoni' ? 'robbersCamp' : 'lamaniteCamp')
    : (b.type === 'stronghold') ? (b.tier === 1 ? 'encampment' : b.tier === 2 ? 'councilPlatform' : 'acropolis')
    : PICTURE[b.type];
  const PICTURE = { stronghold: 'acropolis', encampment: 'encampment', councilPlatform: 'councilPlatform', acropolis: 'acropolis', barracks: 'barracks', hall: 'hall', tower: 'tower', armory: 'armory', storehouse: 'storehouse', granary: 'granary', stables: 'stables', temple: 'temple', relic: 'ruin',
    quarry: 'quarry', sawmill: 'sawmill', brickworks: 'brickworks',
    tents: 'tents', storetent: 'storetent', muster: 'muster', shieldtent: 'shieldtent', ladderworks: 'ladderworks', pavilion: 'pavilion', smithy: 'smithy', training: 'training', wardance: 'wardance', rameumptom: 'rameumptom' };
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
    if (b.type === 'camp' || b.type === 'warcamp' || b.type === 'village' || b.def.side === 'kingmen' || (b.type === 'training' && !ready(IMG.training))) {
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

  // Fire and smoke on the great buildings (018): the Rameumptom's braziers burn with Gemini's painted flames, flipped
  // like a flipbook and added as light; incense rises before the idols. Points are in each picture's own pixels.
  const FX = {
    rameumptom: { fire: [[175, 247], [435, 247], [304, 330]] },
    councilPlatform: { fire: [[200, 435], [788, 435], [500, 580]], fireH: 10 },
    temple: { fire: [[386, 366], [372, 375], [358, 383], [344, 391], [330, 401], [317, 409], [302, 418]], fireH: 9 },   // the great lampstand's seven lamps (023)
    idol_jaguar: { smoke: [[90, 248], [230, 312]] },
    idol_warrior: { smoke: [[95, 362], [228, 428]] },
    brickworks: { smoke: [[310, 175]] }
  };
  function drawFx(b, key, ix, frontY, sc, now) {
    const fx = FX[key], sp = SPRITE[key];
    if (!fx || b.built < 1) return;
    const at = ([px, py]) => [ix + (px - sp.cx) * sc, frontY + (py - sp.by) * sc];
    if (fx.fire && ready(IMG.flames)) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      fx.fire.forEach((p, k) => {
        const [x, y] = at(p), i = Math.floor(now / 1000 * 11 + k * 2.3 + b.id) % 6, h = fx.fireH || 16, w = h * 75 / 140;
        ctx.drawImage(IMG.flames, i * 75, 0, 75, 140, x - w / 2, y - h + 2, w, h);
      });
      ctx.restore();
    }
    if (fx.smoke && Math.random() < 0.06) for (const p of fx.smoke) { const [x, y] = at(p); addSmoke(x, y - 2, false); }
  }

  function drawBuilding(b, selected, now) {
    const top = b.def.wall != null ? heightAt(b.x, b.y) : floorOf(b);
    const { ix, iy } = isoAt(b.x, b.y, top);
    const w = b.w * TILE, h = b.h * TILE;
    ctx.save();
    if (b.built < 1) ctx.globalAlpha = 0.55;
    const key = pictureOf(b) || 'storehouse', sp = SPRITE[key], img = IMG[key];
    const place = () => {                             // the picture, as wide as the plot, set on it by its front corner
      const front = isoAt((b.tx + b.w) * TILE, (b.ty + b.h) * TILE, top), sc = (b.w + b.h) * TILE / sp.span;
      ctx.drawImage(img, ix - sp.cx * sc, front.iy - sp.by * sc, img.naturalWidth * sc, img.naturalHeight * sc);
      drawFx(b, key, ix, front.iy, sc, now);
    };
    if (b.def.wall != null) { if (!drawWallArt(b)) drawEarthwork(b); }
    else if (b.type === 'camp' || b.type === 'warcamp' || (b.def.side === 'kingmen' && !(sp && ready(img)))) {
      if (sp && ready(img)) { place(); if (b.type === 'warcamp') banner(ix + 4, iy - h * 0.9, '#9f1239', now, b.id); }
      else drawCamp(b, now);
    }
    else if (b.type === 'village') drawVillage(b);
    else if (b.type === 'farm') {
      // the granary hut from the farm's picture, on its tilled plot
      if (ready(IMG.farm)) ctx.drawImage(IMG.farm, 50, 14, 58, 66, ix - 26, iy - 52, 52, 59);
    } else if (sp && ready(img)) {
      place();
      if (b.type === 'hall') banner(ix + 6, iy - h * 1.2, '#d4a017', now, b.id);
      if (b.type === 'stronghold') {
        const bannerY = b.tier === 1 ? iy - h * 0.45 : b.tier === 2 ? iy - h * 0.65 : iy - h * 0.75;
        banner(ix + 8, bannerY, '#f4f1e6', now, b.id);
      }
      if (b.built >= 1) {
        const inScreen = ix > cam.x - 100 && ix < cam.x + vw / cam.z + 100 && iy > cam.y - 100 && iy < cam.y + vh / cam.z + 100;
        if (b.type === 'sawmill') {
          // Spinning bronze circular saw blade / waterwheel (Helaman 3:9)
          const sawAngle = (now * 0.008) % (Math.PI * 2);
          ctx.save();
          ctx.translate(ix + 6, iy - 16);
          ctx.rotate(sawAngle);
          ctx.strokeStyle = '#d97706'; ctx.lineWidth = 2.0;
          ctx.beginPath(); ctx.arc(0, 0, 7.5, 0, Math.PI * 2); ctx.stroke();
          ctx.strokeStyle = '#fef08a'; ctx.lineWidth = 1.0;
          for (let a = 0; a < 4; a++) {
            const rad = a * Math.PI / 2;
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(rad) * 7.5, Math.sin(rad) * 7.5); ctx.stroke();
          }
          ctx.restore();
          if (inScreen && Math.random() < 0.003 && AUDIO) AUDIO.play('industrySaw');
        } else if (b.type === 'brickworks') {
          // Warm pulsating kiln furnace glow in brick archway (Helaman 3:7)
          const kilnGlow = 0.5 + 0.3 * Math.sin(now * 0.005 + b.id);
          ctx.fillStyle = `rgba(249, 115, 22, ${kilnGlow})`;
          ctx.beginPath(); ctx.ellipse(ix + 4, iy - 18, 9, 5.5, 0, 0, 7); ctx.fill();
          ctx.fillStyle = `rgba(254, 240, 138, ${kilnGlow * 0.8})`;
          ctx.beginPath(); ctx.ellipse(ix + 4, iy - 18, 4.5, 2.5, 0, 0, 7); ctx.fill();
        } else if (b.type === 'quarry') {
          if (inScreen && Math.random() < 0.003 && AUDIO) AUDIO.play('industryChisel');
        } else if (b.type === 'armory') {
          if (inScreen && Math.random() < 0.003 && AUDIO) AUDIO.play('industryAnvil');
        }
      }
    } else if (b.type === 'smithy' && ready(IMG.armory)) {   // the armory's picture, on the smaller plot, with the forge's glow
      const a = SPRITE.armory, im = IMG.armory, front = isoAt((b.tx + b.w) * TILE, (b.ty + b.h) * TILE, top), sc = (b.w + b.h) * TILE / a.span;
      ctx.drawImage(im, ix - a.cx * sc, front.iy - a.by * sc, im.naturalWidth * sc, im.naturalHeight * sc);
      if (b.built >= 1) {
        ctx.fillStyle = `rgba(255, 150, 40, ${0.55 + 0.25 * Math.sin(now / 90 + b.id)})`;
        ctx.beginPath(); ctx.arc(ix + 4, iy - 14, 4.5, 0, Math.PI * 2); ctx.fill();
        const inScreen = ix > cam.x - 100 && ix < cam.x + vw / cam.z + 100 && iy > cam.y - 100 && iy < cam.y + vh / cam.z + 100;
        if (inScreen && Math.random() < 0.003 && AUDIO) AUDIO.play('industryAnvil');
      }
    } else if (b.type === 'training') {
      drawTraining(b, now);
    } else { ctx.fillStyle = '#bfa97c'; ctx.fillRect(ix - w * 0.5, iy - h, w, h); }
    ctx.restore();

    if (selected) {
      drawIsoCorners(ix - w * 0.45, iy - h * 0.35, w * 0.9, h * 0.7, '#4ade80');
    }
    const helpers = b.team === 'p' && W.needsWork(b) ? W.units('p').filter(u => u.order.type === 'build' && u.order.target === b.id && W.nextTo(u, W.rectOf(b)) && !(u.path && u.path.length)).length : 0;
    if (b.built < 1) {
      ctx.fillStyle = 'rgba(0,0,0,.7)'; ctx.fillRect(ix - 25, iy - 4, 50, 8);
      ctx.fillStyle = helpers ? (Math.floor(now / 250) % 2 ? '#fde68a' : '#fcd34d') : '#d6a93a'; ctx.fillRect(ix - 24, iy - 3, 48 * b.built, 6);
      if (helpers) drawHelpers(ix, iy - 7, helpers, true);
    } else if (b.def.hp < 99999 && (selected || b.hp < S.maxHp(b))) {
      hpBar(ix, iy - 36, 44, b.hp / S.maxHp(b));
      if (helpers) drawHelpers(ix, iy - 41, helpers, false);
    }
  }
  // A small hammer over a building's bar for each helper at work on it, and how much faster it goes (Blake's play-test).
  function drawHelpers(cx, y, n, rising) {         // (rising: it builds itself too, so each helper adds as much again)
    const shown = Math.min(n, 4), w = shown * 11 + (rising ? 22 : 0), x0 = cx - w / 2;
    ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(x0 - 2, y - 11, w + 4, 12);
    for (let i = 0; i < shown; i++) {
      const hx = x0 + 2 + i * 11;
      ctx.fillStyle = '#c8a46a'; ctx.fillRect(hx + 4, y - 8, 2, 8);        // the handle
      ctx.fillStyle = '#e5e7eb'; ctx.fillRect(hx + 1, y - 10, 8, 4);       // the head
    }
    if (!rising) return;
    ctx.font = 'bold 9px system-ui, sans-serif'; ctx.fillStyle = '#fde68a'; ctx.textBaseline = 'alphabetic';
    ctx.fillText('×' + (n + 1), x0 + shown * 11 + 3, y - 2);
  }

  // The training ground: posts at the plot's corners, a straw dummy in the middle, a banner.
  function drawTraining(b, now) {
    const top = floorOf(b);
    const post = (x, y) => { const [px, py] = isoPt(x, y, top); ctx.strokeStyle = '#4a3420'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, py - 16); ctx.stroke(); };
    for (const [x, y] of [[b.tx + 0.3, b.ty + 0.3], [b.tx + b.w - 0.3, b.ty + 0.3], [b.tx + 0.3, b.ty + b.h - 0.3], [b.tx + b.w - 0.3, b.ty + b.h - 0.3]]) post(x, y);
    const [cx, cy] = isoPt(b.tx + b.w / 2, b.ty + b.h / 2, top);
    ctx.strokeStyle = '#4a3420'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx, cy + 2); ctx.lineTo(cx, cy - 20); ctx.stroke();
    ctx.fillStyle = '#c9a85a'; ctx.beginPath(); ctx.ellipse(cx, cy - 14, 7, 10, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#8a6a2a'; ctx.lineWidth = 1; ctx.stroke();
    if (b.built >= 1) banner(cx + 14, cy - 26, '#f4f1e6', now, b.id);
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

  // The Title of Liberty (Alma 46:12–13): Captain Moroni's torn coat fastened upon the end of a pole
  function drawTitleOfLibertyStandard(flip, now, id) {
    ctx.save();
    const poleX = -2;
    const poleBottomY = 4;
    const poleTopY = -68;

    // 1. Carved Hardwood Spear-Staff
    ctx.strokeStyle = '#3e2009'; ctx.lineWidth = 2.8; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(poleX, poleBottomY); ctx.lineTo(poleX, poleTopY); ctx.stroke();
    ctx.strokeStyle = '#78350f'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(poleX - 0.4, poleBottomY); ctx.lineTo(poleX - 0.4, poleTopY); ctx.stroke();

    // Golden grip rings
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(poleX - 2, -26, 4, 3);
    ctx.fillRect(poleX - 2, -32, 4, 2);

    // Bronze spearhead point atop staff
    ctx.fillStyle = '#b45309';
    ctx.beginPath();
    ctx.moveTo(poleX - 3.5, poleTopY + 2);
    ctx.lineTo(poleX, poleTopY - 9);
    ctx.lineTo(poleX + 3.5, poleTopY + 2);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.moveTo(poleX - 1.2, poleTopY + 1);
    ctx.lineTo(poleX, poleTopY - 8);
    ctx.lineTo(poleX + 1.2, poleTopY + 1);
    ctx.closePath();
    ctx.fill();

    // 2. Dynamic Aerodynamic Linen Wind Waves
    const w1 = Math.sin(now * 0.0045 + id) * 4.2;
    const w2 = Math.sin(now * 0.008 + id * 1.6) * 2.4;
    const w3 = Math.cos(now * 0.012 + id * 2.2) * 1.8;

    const topY = poleTopY + 4;
    const bannerH = 30;
    const bannerL = 34; // length of cloth trailing backward

    // Sacred Covenant Radiant Glow
    const auraAlpha = 0.32 + 0.16 * Math.sin(now * 0.0035 + id);
    ctx.strokeStyle = `rgba(253, 230, 138, ${auraAlpha})`;
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.moveTo(poleX, topY);
    ctx.bezierCurveTo(poleX - 10, topY + w1, poleX - 22, topY - 2 + w2, poleX - bannerL, topY + w1 + w2);
    ctx.lineTo(poleX - bannerL, topY + bannerH + w1 + w2 + w3);
    ctx.bezierCurveTo(poleX - 22, topY + bannerH - 2 + w2, poleX - 10, topY + bannerH + w1, poleX, topY + bannerH);
    ctx.stroke();

    // 3. Woven Bleached Linen Cloth Body (Moroni's rent coat)
    ctx.fillStyle = '#faf8f5';
    ctx.beginPath();
    ctx.moveTo(poleX, topY);
    ctx.bezierCurveTo(poleX - 10, topY + w1, poleX - 22, topY - 2 + w2, poleX - bannerL, topY + w1 + w2);
    
    // Ragged torn bottom edge (rent coat silhouette)
    ctx.lineTo(poleX - bannerL, topY + bannerH * 0.75 + w1 + w2);
    ctx.lineTo(poleX - bannerL + 5, topY + bannerH + w1 + w2);
    ctx.lineTo(poleX - bannerL + 11, topY + bannerH * 0.85 + w2);
    ctx.lineTo(poleX - bannerL + 18, topY + bannerH + w1);
    ctx.lineTo(poleX - bannerL + 25, topY + bannerH * 0.9 + w1);
    ctx.lineTo(poleX, topY + bannerH);
    ctx.closePath();
    ctx.fill();

    // Shading on cloth folds
    ctx.fillStyle = 'rgba(214, 209, 199, 0.45)';
    ctx.beginPath();
    ctx.moveTo(poleX - 12, topY + w1);
    ctx.quadraticCurveTo(poleX - 18, topY + bannerH * 0.5 + w2, poleX - 14, topY + bannerH * 0.9);
    ctx.lineTo(poleX - 17, topY + bannerH * 0.9);
    ctx.quadraticCurveTo(poleX - 21, topY + bannerH * 0.5 + w2, poleX - 15, topY + w1);
    ctx.closePath();
    ctx.fill();

    // 4. Crimson & Gold Ornamental Borders
    ctx.strokeStyle = '#991b1b'; ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(poleX, topY + 1.2);
    ctx.bezierCurveTo(poleX - 10, topY + 1.2 + w1, poleX - 22, topY - 0.8 + w2, poleX - bannerL, topY + 1.2 + w1 + w2);
    ctx.stroke();
    ctx.strokeStyle = '#d97706'; ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.moveTo(poleX, topY + 2.8);
    ctx.bezierCurveTo(poleX - 10, topY + 2.8 + w1, poleX - 22, topY + 0.8 + w2, poleX - bannerL, topY + 2.8 + w1 + w2);
    ctx.stroke();

    // 5. Ancient Reformed Egyptian Script Lines ("In memory of our God...")
    ctx.strokeStyle = 'rgba(41, 37, 36, 0.7)'; ctx.lineWidth = 1.1; ctx.lineCap = 'butt';
    for (let r = 0; r < 3; r++) {
      const lineY = topY + 8 + r * 6.5;
      const lw1 = (w1 + w2) * (0.4 + r * 0.25);
      ctx.beginPath();
      ctx.moveTo(poleX - 4, lineY + lw1 * 0.5);
      ctx.lineTo(poleX - 9, lineY + lw1 * 0.7);
      ctx.moveTo(poleX - 11, lineY + lw1 * 0.8);
      ctx.lineTo(poleX - 18, lineY + lw1 * 0.9);
      ctx.moveTo(poleX - 20, lineY + lw1);
      ctx.lineTo(poleX - 27, lineY + lw1);
      ctx.stroke();
    }

    // 6. Fluttering Frayed Threads at the Trailing Edge
    ctx.strokeStyle = '#f4f1e6'; ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(poleX - bannerL, topY + 4 + w1 + w2);
    ctx.lineTo(poleX - bannerL - 5, topY + 6 + w1 + w2 + w3);
    ctx.moveTo(poleX - bannerL, topY + bannerH * 0.5 + w2);
    ctx.lineTo(poleX - bannerL - 6, topY + bannerH * 0.5 + w2 + w1);
    ctx.stroke();

    ctx.restore();
  }

  // Worker Scythe Defensive Combat Stance
  function drawWorkerScytheCombat(now, id) {
    ctx.save();
    const cycle = ((now * 0.005 + id) % 1.0);
    const slash = Math.sin(cycle * Math.PI);
    // Dynamic sweeping curved scythe blade in local unit coordinates
    ctx.translate(2, -18);
    ctx.rotate(slash * 0.65);
    // Shaft
    ctx.strokeStyle = '#5c2e0b'; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-6, 12); ctx.lineTo(12, -14); ctx.stroke();
    // Silver blade
    ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 2.8;
    ctx.beginPath(); ctx.arc(12, -14, 10, -1.2, 0.8); ctx.stroke();
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.arc(12, -14, 10, -0.6, 0.4); ctx.stroke();
    if (slash > 0.65) {
      ctx.fillStyle = '#fef08a';
      ctx.beginPath(); ctx.arc(17, -19, 2.0, 0, 7); ctx.fill();
    }
    ctx.restore();
  }

  // Earthworks (Alma 50:1–3): a bank of earth with grass on top, joined to the banks beside it, and a frame of pickets
  // along its top once they're made. A gate is a timber gate standing across the bank, along its line.
  // A wall of pictures (Gemini's, at twice game size): each square shows the stretch of its style's straight section toward
  // each neighbouring piece, sheared to the map's exact slant and mirrored for walls running the other way, with a post
  // where the line turns, ends or meets another. Which style: the side's own, at the level its walls have reached.
  const WALLART = {
    bank: { w: 145, h: 100, top: [65.2, -0.555], bot: [114.9, -0.586] },
    pickets: { w: 119, h: 122, top: [55.2, -0.569], bot: [136.4, -0.485] },
    stone: { w: 148, h: 151, top: [81.5, -0.646], bot: [170.8, -0.579] },
    stakes: { w: 136, h: 140, top: [65.8, -0.534], bot: [145.1, -0.537] },
    hides: { w: 139, h: 153, top: [71.9, -0.547], bot: [153.9, -0.53] },
    campditch: { w: 139, h: 142, top: [62.2, -0.547], bot: [162.2, -0.619] }
  };
  const WALLPOST = { bank: 'bank', pickets: 'pickets', stone: 'stone', stakes: 'stakes', hides: 'stakes', campditch: 'stakes' };
  const WALLGATE = { stone: 'gate_stone', stakes: 'gate_stakes', hides: 'gate_stakes', campditch: 'gate_stakes' };
  function wallStyle(b) {
    const S = W.side(b.team), king = S.side === 'kingmen' || (!S.side && b.team === 'r'), lv = S.wallLevel || 1;
    return king ? ['stakes', 'hides', 'campditch'][lv - 1] : ['bank', 'pickets', 'stone'][lv - 1];
  }
  function drawWallArt(b) {
    const key = wallStyle(b), A = WALLART[key], img = IMG['wall_' + key], post = IMG['wallpost_' + WALLPOST[key]];
    if (!A || !ready(img) || !ready(post)) return false;
    const links = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => {
      const x = b.tx + dx, y = b.ty + dy;
      if (!W.inBounds(x, y)) return false;
      const n = W.ents.get(W.occ[y * MAP_W + x]);
      return n && n.kind === 'building' && n.def.wall != null && !n.dead;
    });
    const g = isoPt(b.tx + 0.5, b.ty + 0.5, heightAt((b.tx + 0.5) * TILE, (b.ty + 0.5) * TILE));
    const mid = A.w / 2, slope = (A.top[1] + A.bot[1]) / 2, k = -0.5 - slope;          // straighten it to the map's slant
    const groundY = A.bot[0] + A.bot[1] * mid - 13;                                     // the middle of its foot, at the middle column
    const half = (dx, dy) => {
      const alongY = dy !== 0, left = alongY ? dy > 0 : dx < 0;                         // which half of the square, on the screen
      ctx.save();
      ctx.beginPath(); ctx.rect(left ? g[0] - TILE * 0.5 - 0.5 : g[0] - 0.5, g[1] - 140, TILE * 0.5 + 1, 200); ctx.clip();
      ctx.translate(g[0], g[1]);
      if (!alongY) ctx.scale(-1, 1);
      ctx.scale(0.5, 0.5); ctx.transform(1, k, 0, 1, 0, 0);
      ctx.drawImage(img, -mid, -groundY);
      ctx.restore();
    };
    const order = links.slice().sort(([ax, ay], [bx, by]) => (ax + ay) - (bx + by));    // the far half first
    for (const [dx, dy] of order) half(dx, dy);
    const straight = links.length === 2 && links[0][0] === -links[1][0] && links[0][1] === -links[1][1];
    if (b.type === 'gate') {
      const gi = IMG[WALLGATE[key] || 'gate'];
      if (!ready(gi)) return true;
      const alongX = links.some(([dx, dy]) => dy === 0) && !links.some(([dx, dy]) => dx === 0);
      const wd = TILE * 1.75, ht = wd * gi.naturalHeight / gi.naturalWidth;
      ctx.save(); ctx.translate(g[0], g[1] + TILE * 0.36);
      if (alongX) ctx.scale(-1, 1);
      ctx.drawImage(gi, -wd / 2, -ht, wd, ht);
      ctx.restore();
    } else if (!straight) {                                                             // where the line turns, ends or meets another
      const pw = post.naturalWidth / 2, ph = post.naturalHeight / 2;
      ctx.drawImage(post, g[0] - pw / 2, g[1] + 7 - ph, pw, ph);
    }
    // the guard on every fourth piece of the strongest walls, ready to cast stones down (Alma 49:22)
    if (W.guarded(b)) {
      const king = key === 'campditch', gi = king ? IMG.lamanSlinger : IMG.wallguard;
      const feet = straight || b.type === 'gate' ? g[1] + (A.top[0] + A.top[1] * mid - groundY) / 2 + 9 : g[1] + 7 - post.naturalHeight / 2 + 9;
      const throwing = W.effects.some(f => f.kind === 'stone' && f.x0 === b.x && f.y0 === b.y && W.t - f.t < 0.5);
      if (gi && ready(gi)) { const gh = 30, gw = gh * gi.naturalWidth / gi.naturalHeight; ctx.drawImage(gi, g[0] - gw / 2, feet - gh - (throwing ? 3 : 0), gw, gh); }
    }
    return true;
  }
  function drawEarthwork(b) {
    const cx = (b.tx + 0.5) * TILE, cy = (b.ty + 0.5) * TILE;
    const links = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => {
      const x = b.tx + dx, y = b.ty + dy;
      if (!W.inBounds(x, y)) return false;
      const n = W.ents.get(W.occ[y * MAP_W + x]);
      return n && n.kind === 'building' && n.def.wall != null && !n.dead;
    });
    const H = 2.3, FOOT = 0.42 * TILE, TOP = 0.09 * TILE;          // how high (in levels), and how wide at the foot and at the top (half-widths)
    const P = (wx, wy, k) => isoPt(wx / TILE, wy / TILE, heightAt(wx, wy) + k);
    // One stretch of bank from the middle of this square to its edge. Light comes from the upper left:
    // a bank running along x shows its lit side; one running along y, its shaded side.
    const stretch = (dx, dy) => {
      const ex = cx + dx * TILE * 0.5, ey = cy + dy * TILE * 0.5, along = dy === 0;
      const side = w => along ? [0, w] : [w, 0];
      const [fx, fy] = side(FOOT), [tx, ty] = side(TOP);
      fillPoly([P(cx - fx, cy - fy, 0), P(ex - fx, ey - fy, 0), P(ex - tx, ey - ty, H), P(cx - tx, cy - ty, H)], '#4a3421');
      fillPoly([P(cx + fx, cy + fy, 0), P(ex + fx, ey + fy, 0), P(ex + tx, ey + ty, H), P(cx + tx, cy + ty, H)], along ? '#9a7447' : '#6b4d2e');
      fillPoly([P(cx - tx, cy - ty, H), P(ex - tx, ey - ty, H), P(ex + tx, ey + ty, H), P(cx + tx, cy + ty, H)], '#86a04c');
      // the foot of the near side, where the bank meets the ground, a little darker
      const a = P(cx + fx, cy + fy, 0), z = P(ex + fx, ey + fy, 0);
      ctx.strokeStyle = 'rgba(40, 26, 12, .45)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(z[0], z[1]); ctx.stroke();
    };
    // The middle of the square: a heap where the stretches meet (or the whole of a bank on its own).
    const heap = () => {
      fillPoly([P(cx + FOOT, cy - FOOT, 0), P(cx + FOOT, cy + FOOT, 0), P(cx + TOP, cy + TOP, H), P(cx + TOP, cy - TOP, H)], '#6b4d2e');
      fillPoly([P(cx - FOOT, cy + FOOT, 0), P(cx + FOOT, cy + FOOT, 0), P(cx + TOP, cy + TOP, H), P(cx - TOP, cy + TOP, H)], '#9a7447');
      fillPoly([P(cx - TOP, cy - TOP, H), P(cx + TOP, cy - TOP, H), P(cx + TOP, cy + TOP, H), P(cx - TOP, cy + TOP, H)], '#86a04c');
    };
    for (const [dx, dy] of links.filter(([dx, dy]) => dx + dy < 0)) stretch(dx, dy);       // the stretches going away from us first
    heap();
    for (const [dx, dy] of links.filter(([dx, dy]) => dx + dy > 0)) stretch(dx, dy);
    if (b.type === 'gate') {
      // the gate's picture runs along y (lower left to upper right on the screen); a bank along x gets it mirrored
      if (!ready(IMG.gate)) return;
      const alongX = links.some(([dx, dy]) => dy === 0) && !links.some(([dx, dy]) => dx === 0);
      const g = P(cx, cy, 0), wd = TILE * 1.75, ht = wd * IMG.gate.naturalHeight / IMG.gate.naturalWidth;
      ctx.save(); ctx.translate(g[0], g[1] + TILE * 0.36);
      if (alongX) ctx.scale(-1, 1);
      ctx.drawImage(IMG.gate, -wd / 2, -ht, wd, ht);
      ctx.restore();
    } else if (W.researched.pickets || b.team === 'r') {   // a Lamanite palisade always has its stakes
      // a frame of pickets along the top of the bank, sharpened
      const line = links.length ? links.flatMap(([dx, dy]) => [0.12, 0.42, 0.72, 0.98].map(t => [cx + dx * TILE * 0.5 * t, cy + dy * TILE * 0.5 * t])) : [[cx, cy]];
      for (const [sx, sy] of line.sort((a, b) => a[0] + a[1] - b[0] - b[1])) {
        const p = P(sx, sy, H);
        ctx.strokeStyle = '#5c3e22'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(p[0], p[1] + 1); ctx.lineTo(p[0], p[1] - 9); ctx.stroke();
        ctx.fillStyle = '#d2b07c'; ctx.beginPath(); ctx.moveTo(p[0] - 1.2, p[1] - 9); ctx.lineTo(p[0], p[1] - 12); ctx.lineTo(p[0] + 1.2, p[1] - 9); ctx.fill();
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

  // The Liahona: a brass pointer at the edge of the view, toward the war camp when it's out of sight (1 Nephi 16:10).
  function drawLiahona() {
    const goal = mission.targets ? mission.targets().find(b => b && !b.dead) : mission.warcamp;   // (for the King-men, Zarahemla, not their own camp)
    if (!W.artifacts.liahona || !goal || goal.dead) return;
    const t = toIso(goal.x, goal.y);
    const x0 = cam.x, y0 = cam.y, x1 = cam.x + (vw - rightW()) / cam.z, y1 = cam.y + (vh - bottomH()) / cam.z, top = y0 + topH() / cam.z;
    if (t.ix > x0 && t.ix < x1 && t.iy > top && t.iy < y1) return;
    const mx = (x0 + x1) / 2, my = (top + y1) / 2, a = Math.atan2(t.iy - my, t.ix - mx);
    const px = Math.max(x0 + 26, Math.min(x1 - 26, mx + Math.cos(a) * 9999)), py = Math.max(top + 26, Math.min(y1 - 26, my + Math.sin(a) * 9999));
    ctx.save(); ctx.translate(px, py);
    ctx.fillStyle = '#b8860b'; ctx.strokeStyle = '#fde68a'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, 0, 11, 0, 7); ctx.fill(); ctx.stroke();
    ctx.rotate(a); ctx.fillStyle = '#fef3c7'; ctx.beginPath(); ctx.moveTo(9, 0); ctx.lineTo(-4, -4); ctx.lineTo(-2, 0); ctx.lineTo(-4, 4); ctx.fill();
    ctx.restore();
  }

  // Where a miracle is at work.
  function drawZones(now) {
    for (const z of W.zones) {
      const { ix, iy } = toIso(z.x, z.y), left = z.until - W.t;
      if (z.kind === 'fire') {
        const f = 0.85 + 0.15 * Math.sin(now * 0.02);
        ctx.strokeStyle = `rgba(251,146,60,${0.9 * f})`; ctx.lineWidth = 6; ctx.beginPath(); ctx.ellipse(ix, iy, z.r, z.r / 2, 0, 0, 7); ctx.stroke();
        ctx.strokeStyle = `rgba(254,240,138,${0.8 * f})`; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.ellipse(ix, iy, z.r - 3, z.r / 2 - 2, 0, 0, 7); ctx.stroke();
        for (let k = 0; k < 28; k++) {
          const a = k / 28 * Math.PI * 2, h = 10 + 8 * Math.abs(Math.sin(now * 0.012 + k * 1.7)), fx = ix + Math.cos(a) * z.r, fy = iy + Math.sin(a) * z.r / 2;
          ctx.fillStyle = k % 2 ? 'rgba(249,115,22,.85)' : 'rgba(254,215,102,.9)'; ctx.beginPath(); ctx.moveTo(fx - 3, fy); ctx.lineTo(fx, fy - h); ctx.lineTo(fx + 3, fy); ctx.fill();
        }
      } else if (z.kind === 'cloud') {
        const g = ctx.createRadialGradient(ix, iy - 10, 0, ix, iy - 10, z.r); g.addColorStop(0, 'rgba(20,16,30,.78)'); g.addColorStop(0.75, 'rgba(30,26,40,.6)'); g.addColorStop(1, 'rgba(30,26,40,0)');
        ctx.save(); ctx.translate(ix, iy - 10); ctx.scale(1, 0.6); ctx.translate(-ix, -(iy - 10)); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(ix, iy - 10, z.r, 0, 7); ctx.fill(); ctx.restore();
      } else if (z.kind === 'sleep') {
        ctx.fillStyle = 'rgba(147,197,253,.15)'; ctx.beginPath(); ctx.ellipse(ix, iy, z.r, z.r / 2, 0, 0, 7); ctx.fill();
        ctx.fillStyle = 'rgba(219,234,254,.9)'; ctx.font = 'bold 14px sans-serif';
        for (let k = 0; k < 3; k++) { const p = (now * 0.0008 + k / 3) % 1; ctx.globalAlpha = 1 - p; ctx.fillText('z', ix - 20 + k * 20, iy - 20 - p * 40); }
        ctx.globalAlpha = 1;
      } else if (z.kind === 'turn') {
        ctx.strokeStyle = 'rgba(248,113,113,.8)'; ctx.lineWidth = 3; ctx.setLineDash([8, 6]); ctx.lineDashOffset = -now * 0.03; ctx.beginPath(); ctx.ellipse(ix, iy, z.r, z.r / 2, 0, 0, 7); ctx.stroke(); ctx.setLineDash([]); ctx.lineDashOffset = 0;
      } else if (z.kind === 'quake') {
        ctx.strokeStyle = `rgba(40,30,20,${0.9 * Math.min(1, left)})`; ctx.lineWidth = 2;
        for (let k = 0; k < 7; k++) {
          const a = k * 0.9 + 0.3; ctx.beginPath(); ctx.moveTo(ix, iy);
          for (let s = 1; s <= 4; s++) { const b = a + Math.sin(s * 2.3 + k) * 0.35; ctx.lineTo(ix + Math.cos(b) * z.r * s / 4, iy + Math.sin(b) * z.r * s / 8); }
          ctx.stroke();
        }
      } else if (z.kind === 'mercy') {
        for (const u of W.units(z.team)) { const p = toIso(u.x, u.y); ctx.fillStyle = `rgba(254,243,199,${0.5 * left / 2})`; ctx.beginPath(); ctx.ellipse(p.ix, p.iy - 20, 18, 30, 0, 0, 7); ctx.fill(); }
      } else if (z.kind === 'thirst') {                  // bloodthirst: a red pulse over the ground, and over each warrior in it (drawUnit)
        const f = 0.6 + 0.4 * Math.sin(now * 0.012), a = Math.min(1, left / 2);
        ctx.fillStyle = `rgba(185,28,28,${0.13 * f * a})`; ctx.beginPath(); ctx.ellipse(ix, iy, z.r, z.r / 2, 0, 0, 7); ctx.fill();
        ctx.strokeStyle = `rgba(239,68,68,${0.7 * f * a})`; ctx.lineWidth = 2.5; ctx.setLineDash([3, 7]); ctx.lineDashOffset = now * 0.02;
        ctx.beginPath(); ctx.ellipse(ix, iy, z.r, z.r / 2, 0, 0, 7); ctx.stroke(); ctx.setLineDash([]); ctx.lineDashOffset = 0;
      } else if (z.kind === 'poison') {                  // the cup is given: a green swirl where it falls
        ctx.strokeStyle = `rgba(132,204,22,${Math.max(0, left / 2)})`; ctx.lineWidth = 2.5;
        for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.arc(ix, iy - 18, 6 + k * 6 + (2 - left) * 8, k * 2 + now * 0.004, k * 2 + now * 0.004 + 3.5); ctx.stroke(); }
      } else if (z.kind === 'shock') {
        ctx.strokeStyle = `rgba(253,224,71,${Math.max(0, left)})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(ix - 8, iy - 50); ctx.lineTo(ix + 2, iy - 30); ctx.lineTo(ix - 4, iy - 30); ctx.lineTo(ix + 6, iy - 10); ctx.stroke();
      }
    }
  }

  // Ballistic 3D Parabolic Projectiles with Grounded Shadows
  function drawEffects() {
    for (const f of W.effects) {
      const p = clamp((W.t - f.t) / 0.35, 0, 1);
      const p0 = toIso(f.x0, f.y0), p1 = toIso(f.x1, f.y1);
      const gx = p0.ix + (p1.ix - p0.ix) * p;
      const gy = p0.iy + (p1.iy - p0.iy) * p;

      if (f.kind === 'stone') {
        if (!f.launchedSound) {
          f.launchedSound = true;
          if (AUDIO) AUDIO.play('cartFlingStone');
        }
        const q = clamp((W.t - f.t) / 0.5, 0, 1), sx = p0.ix + (p1.ix - p0.ix) * q, sy = p0.iy - 26 * (1 - q * q) + (p1.iy - p0.iy) * q;
        if (q < 1) { ctx.fillStyle = '#9ca3af'; ctx.strokeStyle = '#4b5563'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(sx, sy - 4, 3.5, 0, 7); ctx.fill(); ctx.stroke(); }
        else if (!f.dusted) { f.dusted = true; addDust(p1.ix, p1.iy); addDust(p1.ix + 4, p1.iy); addDust(p1.ix - 4, p1.iy); if (AUDIO) AUDIO.play('combatHit'); }
        continue;
      }
      if (f.stake) {
        if (!f.stakeSound) {
          f.stakeSound = true;
          if (AUDIO) AUDIO.play('cartStakes');
          for (let k = 0; k < 5; k++) {
            particles.push({
              ix: p1.ix + (Math.random() - 0.5) * 14, iy: p1.iy + (Math.random() - 0.5) * 8,
              vx: (Math.random() - 0.5) * 1.5, vy: -1.0 - Math.random() * 1.5,
              size: 2.0, wood: true, life: 0, maxLife: 20
            });
          }
        }
        ctx.save();
        ctx.strokeStyle = '#78350f'; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
        for (let s = -1; s <= 1; s++) {
          const sx = p1.ix + s * 6, sy = p1.iy;
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(sx - s * 2, sy - 13 + Math.abs(s) * 3);
          ctx.stroke();
          ctx.strokeStyle = '#fef08a'; ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(sx - s * 2, sy - 10 + Math.abs(s) * 3);
          ctx.lineTo(sx - s * 2, sy - 13 + Math.abs(s) * 3);
          ctx.stroke();
          ctx.strokeStyle = '#78350f'; ctx.lineWidth = 2.4;
        }
        ctx.restore();
        continue;
      }
      if (f.scythe && !f.scytheSound) {
        f.scytheSound = true;
        if (AUDIO) AUDIO.play('scytheSlash');
        addSpark(p1.ix, p1.iy - 10);
      }
      if (f.kind === 'javelin') {
        const dist = Math.hypot(p1.ix - p0.ix, p1.iy - p0.iy);
        const maxH = Math.min(38, dist * 0.25);
        const h = Math.sin(p * Math.PI) * maxH;
        // Ground Shadow
        ctx.fillStyle = `rgba(0,0,0,${0.35 * (1 - h / 45)})`;
        ctx.beginPath(); ctx.ellipse(gx, gy, 6, 2.5, 0, 0, 7); ctx.fill();
        // Flying Javelin: heavy wooden spear shaft + bronze spearpoint glint
        const jx = gx, jy = gy - h;
        const angle = Math.atan2((p1.iy - p0.iy) - Math.cos(p * Math.PI) * maxH * 0.08, p1.ix - p0.ix);
        ctx.strokeStyle = '#92400e'; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(jx - Math.cos(angle) * 13, jy - Math.sin(angle) * 13);
        ctx.lineTo(jx, jy);
        ctx.stroke();
        ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 2.8;
        ctx.beginPath();
        ctx.moveTo(jx - Math.cos(angle) * 3, jy - Math.sin(angle) * 3);
        ctx.lineTo(jx + Math.cos(angle) * 2, jy + Math.sin(angle) * 2);
        ctx.stroke();
        if (p >= 0.95 && !f.hitPlayed) {
          f.hitPlayed = true;
          if (AUDIO) AUDIO.play('combatHit');
          addSpark(p1.ix, p1.iy - 10);
        }
        continue;
      }
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
        if (p >= 0.95 && !f.hitPlayed) { f.hitPlayed = true; if (AUDIO) AUDIO.play('combatHit'); }
      } else {
        // Hit Impact Spark & Dust
        ctx.fillStyle = `rgba(255,255,255,${0.8 * (1 - p)})`;
        ctx.beginPath(); ctx.arc(gx, gy, 4 + p * 5, 0, 7); ctx.fill();
        if (Math.random() < 0.4) addSpark(gx, gy);
        if (!f.hitPlayed) { f.hitPlayed = true; if (AUDIO) AUDIO.play('combatHit'); }
      }
    }
  }

  // Where a building would go: green if it fits, red if not (Isometric Diamond Ghost)
  function drawGhost() {
    if (aiming && hover) {                           // where the miracle would fall
      const m = W.power(aiming), { ix, iy } = toIso(hover.x, hover.y);
      if (m.aim !== 'foe' && m.aim !== 'building' && m.r) { ctx.strokeStyle = 'rgba(253,230,138,.9)'; ctx.lineWidth = 2; ctx.setLineDash([6, 5]); ctx.beginPath(); ctx.ellipse(ix, iy, m.r, m.r / 2, 0, 0, 7); ctx.stroke(); ctx.setLineDash([]); }
    }
    if (!placing) return;
    const def = BUILDINGS[placing], cost = W.costOf(def, 'p', 'build');
    let spots = [];
    if (wallStart && hover && touchy) spots = lineTiles(wallStart, [tileOf(hover.x), tileOf(hover.y)]);
    else if (wallLine) spots = wallLine.map(([x, y]) => [x, y]);
    else if (hover) spots = [topLeft(placing, hover.x, hover.y)];
    const left = Object.assign({}, W.res);
    for (const [x, y] of spots) {
      for (const k of KINDS) left[k] = (left[k] || 0) - (cost[k] || 0);
      const ok = W.canPlace(placing, x, y) && KINDS.every(k => left[k] >= 0);
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
    if (placing !== 'wall' && spots.length) {
      const [x, y] = spots[0];
      const ok = W.canPlace(placing, x, y) && KINDS.every(k => left[k] >= 0);
      const bObj = { tx: x, ty: y, w: def.w, h: def.h, def, type: placing, team: 'p', tier: 1 };
      const topH = floorOf(bObj);
      const { ix, iy } = isoAt(x * TILE, y * TILE, topH);
      const front = isoAt((x + def.w) * TILE, (y + def.h) * TILE, topH);
      const key = pictureOf(bObj) || placing;
      const sp = SPRITE[key], img = IMG[key];
      if (sp && ready(img)) {
        const sc = (def.w + def.h) * TILE / sp.span;
        ctx.save();
        ctx.globalAlpha = ok ? 0.72 : 0.42;
        if (!ok) ctx.filter = 'grayscale(0.6) brightness(0.85) sepia(0.6) hue-rotate(-50deg)';
        ctx.drawImage(img, ix - sp.cx * sc, front.iy - sp.by * sc, img.naturalWidth * sc, img.naturalHeight * sc);
        ctx.restore();
      }
      if (touchPlacePos) {
        const centerIso = toIso((x + def.w / 2) * TILE, (y + def.h / 2) * TILE);
        const touchIsoX = cam.x + touchPlacePos.x / cam.z;
        const touchIsoY = cam.y + touchPlacePos.y / cam.z;
        ctx.save();
        ctx.strokeStyle = 'rgba(253, 230, 138, 0.8)';
        ctx.lineWidth = 2 / cam.z;
        ctx.beginPath();
        ctx.arc(touchIsoX, touchIsoY, 16 / cam.z, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = 'rgba(253, 230, 138, 0.2)';
        ctx.fill();

        ctx.strokeStyle = ok ? 'rgba(74, 222, 128, 0.9)' : 'rgba(248, 113, 113, 0.9)';
        ctx.lineWidth = 2 / cam.z;
        ctx.setLineDash([4 / cam.z, 4 / cam.z]);
        ctx.beginPath();
        ctx.moveTo(touchIsoX, touchIsoY);
        ctx.lineTo(centerIso.ix, centerIso.iy);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
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

    const now = performance.now();

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
        mctx.fillRect(pt.mx - 2 * dpr, pt.my - 2 * dpr, 4 * dpr, 4 * dpr);
      } else {
        mctx.fillStyle = e.team === 'r' ? '#ef4444' : e.team === 'x' ? '#a1a1aa' : e.def.hero || e.def.leader ? '#fcd34d' : '#fff';
        mctx.fillRect(pt.mx - dpr, pt.my - dpr, 2 * dpr, 2 * dpr);
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
  function setSel(list) {
    const prev = sel.length;
    sel = list.filter(selectable).map(e => e.id);
    infoEnt = null; placing = null; aiming = null; wallLine = null; wallStart = null; armedRemove = null; touchSpot = null; touchPlacePos = null;
    if (sel.length && AUDIO && (!prev || sel.length !== prev)) AUDIO.play('select');
    refreshPanel(true);
  }

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
    if (aiming) return aimAt(wx, wy, sx, sy);
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
    if (b && b.kind === 'building' && b.def.trains && !e) { b.rally = [tileOf(wx), tileOf(wy)]; ping(wx, wy, '#fde68a'); toast('Rally point set: new ones from here will go there.'); return; }
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
      if (AUDIO) { AUDIO.play('orderAttack'); AUDIO.unitAcknowledge(units[0], 'attack'); }
      return ping(e.x, e.y, '#f87171');
    }
    const workers = units.filter(u => u.def.builds), rest = units.filter(u => !u.def.builds);
    if (e && e.kind === 'building' && workers.length && W.needsWork(e)) {
      for (const u of workers) W.order(u, { type: 'build', target: e.id });
      if (rest.length) moveGroup(rest, tx, ty);
      if (AUDIO) { AUDIO.play('orderMove'); AUDIO.unitAcknowledge(workers[0] || units[0], 'move'); }
      return ping(e.x, e.y, '#fde68a');
    }
    const kind = W.isResource(tx, ty, 'timber') ? 'timber' : W.isResource(tx, ty, 'grain') ? 'grain' : W.isResource(tx, ty, 'stone') ? 'stone' : null;
    const carts = units.filter(u => u.def.gathers), others = units.filter(u => !u.def.gathers);
    if (kind && carts.length) {
      carts.forEach((u, i) => { u.pref = kind; const f = i ? W.nearestResource(tx, ty, kind, u) || [tx, ty] : [tx, ty]; W.gatherAt(u, f[0], f[1]); });
      if (others.length) moveGroup(others, tx, ty);
      if (AUDIO) { AUDIO.play('orderMove'); AUDIO.unitAcknowledge(carts[0] || units[0], 'move'); }
      return ping(wx, wy, kind === 'timber' ? '#a3e635' : kind === 'stone' ? '#d6d3d1' : '#fde047');
    }
    moveGroup(units, tx, ty, true);
    if (AUDIO) { AUDIO.play('orderMove'); AUDIO.unitAcknowledge(units[0], 'move'); }
    ping(wx, wy, '#86efac');
  }
  // Everyone to their own tile around the spot, nearest first. With `fight`, soldiers fight whatever they meet on the way
  // (Blake's review: they used to walk past the enemy); Fall back passes no `fight`, so they keep walking.
  function moveGroup(units, tx, ty, fight) {
    if (W.border != null && !W.borderOpen && ty < W.border) { W.moveTo(units[0], tx, ty, fight && fighterOf(units[0])); ty = W.border; }
    const spots = [];
    for (let r = 0; spots.length < units.length && r < 9; r++) {
      for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        if (W.passable(tx + dx, ty + dy, 'p')) spots.push([tx + dx, ty + dy]);
      }
    }
    const cx = (tx + 0.5) * TILE, cy = (ty + 0.5) * TILE;
    units.slice().sort((a, b) => Math.hypot(a.x - cx, a.y - cy) - Math.hypot(b.x - cx, b.y - cy))
      .forEach((u, i) => { const s = spots[i] || [tx, ty]; W.moveTo(u, s[0], s[1], fight && fighterOf(u)); });
  }
  const fighterOf = u => S.canFight(u.def);
  function ping(wx, wy, color) { pings.push({ wx, wy, color, t: performance.now(), type: color === '#f87171' ? 'attack' : 'move' }); }

  // --- building
  function startPlacing(type) {
    const def = BUILDINGS[type];
    if (W.whyNotBuild(type)) return toast(W.whyNotBuild(type) + '.', 'warn');
    if (!W.canAfford(def.cost)) return toast(poorText(def.cost), 'warn');
    placing = type; wallLine = null; wallStart = null; touchSpot = null; touchPlacePos = null;
    toast(type === 'wall' ? (touchy ? 'Tap where the wall starts, then where it ends. Tap Done when you finish.' : 'Drag a line where the wall goes. Tap Done when you finish.') : `Tap where the ${def.name.toLowerCase()} goes.`, 'me');
    refreshPanel(true);
  }
  // A miracle: tap its button, then the spot (or the foe) it falls on.
  function startAiming(key) {
    const why = W.whyNotMiracle(key), m = W.power(key);
    if (!m) return;
    if (why === 'temple') return toast(`${(SIDES[W.side('p').side] || SIDES.freemen).house === 'Temple' ? 'A temple' : 'The Rameumptom'} must stand first.`, 'warn');
    if (why === 'wait') return toast(`${m.name} can be worked again in ${Math.ceil(W.miracleWait(key))}s.`, 'warn');
    if (m.aim === 'none') { if (W.miracle(key)) { placing = null; aiming = null; refreshPanel(true); } return; }
    aiming = key; placing = null; wallLine = null; touchSpot = null; touchPlacePos = null;
    toast(m.aim === 'foe' ? `Tap the enemy the ${m.name.toLowerCase()} falls on.` : m.aim === 'building' ? `Tap the enemy building the ${m.name.toLowerCase()} falls on.` : `Tap the spot where the ${m.name.toLowerCase()} falls.`, 'me');
    refreshPanel(true);
  }
  function aimAt(wx, wy, sx, sy) {
    const key = aiming, m = W.power(key);
    if (m.aim === 'foe' || m.aim === 'building') {
      const e = entityAt(wx, wy, sx, sy);
      if (!e || e.kind !== (m.aim === 'foe' ? 'unit' : 'building') || e.team === 'p' || e.team === 'n') return toast(m.aim === 'foe' ? 'Tap an enemy.' : 'Tap an enemy building.', 'warn');
      if (W.miracle(key, e.x, e.y, e.id)) { aiming = null; if (AUDIO) AUDIO.announce('miracle'); refreshPanel(true); }
      return;
    }
    if (W.miracle(key, wx, wy)) { aiming = null; if (AUDIO) AUDIO.announce('miracle'); refreshPanel(true); ping(wx, wy, '#fde68a'); }
  }
  function placeAt(wx, wy, keep) {
    const [x, y] = topLeft(placing, wx, wy);
    const b = W.place(placing, x, y, []);
    if (!b) { const why = W.whyNotPlace(placing, x, y); return toast(!why ? poorText(BUILDINGS[placing].cost) : why === 'far' ? 'Too far from your city. Build within reach of what you have.' : 'It can\'t go there. Build on open ground, south of the wilderness.', 'warn'); }
    assignBuilders([b]);
    if (AUDIO) AUDIO.play('build');
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
    if (made.length && AUDIO) AUDIO.play('build');
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
    const need = KINDS.filter(k => (c[k] || 0) > (W.res[k] || 0));
    return 'Not enough ' + need.join(' or ') + ' yet. ' + (need.includes('stone') ? 'Tap a cart, then a rock face: it quarries and hauls on its own.' : 'The carts bring it in; the council gives some too.');
  }

  // ------------------------------------------------------------ pointer and keys

  const ptrs = new Map();
  let gesture = null, lastTap = { t: 0, x: 0, y: 0 };
  let touchSpot = null, touchy = false;                // where a building would go, after a first tap; and whether this is a touch screen
  let touchPlacePos = null;                            // active touch { x, y } when dragging a building on mobile
  cv.addEventListener('contextmenu', e => e.preventDefault());
  document.addEventListener('pointerdown', () => { if (AUDIO) AUDIO.wake(); }, { once: true, passive: true });
  cv.addEventListener('pointerdown', e => {
    if (AUDIO) AUDIO.wake();
    if (!W || modal) return;
    cv.setPointerCapture(e.pointerId);
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    touchy = e.pointerType !== 'mouse';
    if (ptrs.size === 2) {
      const [a, b] = [...ptrs.values()];
      box = null; wallLine = null; touchPlacePos = null;
      gesture = { kind: 'pinch', d0: Math.hypot(a.x - b.x, a.y - b.y) || 1, z0: cam.z, mid: { x: cam.x + (a.x + b.x) / 2 / cam.z, y: cam.y + (a.y + b.y) / 2 / cam.z } };
      return;
    }
    if (ptrs.size > 2) return;
    const p = toWorld(e.clientX, e.clientY);
    if (e.button === 2) { gesture = { kind: 'right' }; return; }
    if (e.button === 1) { gesture = { kind: 'pan', lx: e.clientX, ly: e.clientY }; return; }
    if (placing === 'wall' && e.pointerType === 'mouse') { const t = [tileOf(p.x), tileOf(p.y)]; wallLine = [t]; gesture = { kind: 'wall', a: t }; return; }
    if (placing && placing !== 'wall' && e.pointerType !== 'mouse') {
      const own = entityAt(p.x, p.y, e.clientX, e.clientY);
      if (!(selectable(own) && (own.kind === 'unit' || own.def.wall == null))) {
        // Finger placement on touch: offset upward by 52px so thumb never obscures footprint!
        const offY = 52;
        const targetWorld = toWorld(e.clientX, e.clientY - offY);
        hover = targetWorld;
        touchPlacePos = { x: e.clientX, y: e.clientY };
        const spot = topLeft(placing, targetWorld.x, targetWorld.y);
        const wasPreviewed = touchSpot && spot[0] === touchSpot[0] && spot[1] === touchSpot[1];
        gesture = { kind: 'place', sx: e.clientX, sy: e.clientY, spot, moved: false, alreadyPreviewed: wasPreviewed };
        touchSpot = spot;
        return;
      }
    }
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
    if (gesture.kind === 'place') {
      if (Math.hypot(e.clientX - gesture.sx, e.clientY - gesture.sy) > 6) gesture.moved = true;
      const offY = 52;
      const targetWorld = toWorld(e.clientX, e.clientY - offY);
      hover = targetWorld;
      touchPlacePos = { x: e.clientX, y: e.clientY };
      touchSpot = topLeft(placing, targetWorld.x, targetWorld.y);
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
    touchPlacePos = null;
    if (!g || cancelled || !W) { box = null; if (!wallStart) wallLine = null; return; }
    const p = toWorld(e.clientX, e.clientY);
    // Building something, and you tap one of your own people or buildings: you mean to choose it, not to build there.
    // (Walls aside: you may be drawing next to one. And a gate goes on a wall piece of yours.)
    if ((g.kind === 'press' || g.kind === 'place' || (g.kind === 'wall' && (!wallLine || wallLine.length < 2))) && placing) {
      const own = entityAt(p.x, p.y, e.clientX, e.clientY);
      if (selectable(own) && (own.kind === 'unit' || own.def.wall == null)) { setSel([own]); return; }
    }
    // Walls on a touch screen: tap where it starts, then where it ends.
    if (g.kind === 'press' && g.touch && placing === 'wall') {
      const t = [tileOf(p.x), tileOf(p.y)];
      if (!wallStart) { wallStart = t; wallLine = [t]; toast('Now tap where the wall ends (the same spot again for one piece).', 'me'); return; }
      placeLine(lineTiles(wallStart, t)); wallStart = null; wallLine = null;
      return;
    }
    if (g.kind === 'place') {
      if (!placing) return;
      const spot = touchSpot || (hover && topLeft(placing, hover.x, hover.y));
      if (!spot) return;
      const ok = W.canPlace(placing, spot[0], spot[1]);
      if (!g.moved && g.alreadyPreviewed && ok) {
        const [cx, cy] = [(spot[0] + BUILDINGS[placing].w / 2) * TILE, (spot[1] + BUILDINGS[placing].h / 2) * TILE];
        placeAt(cx, cy, false);
        touchSpot = null;
        return;
      }
      if (ok) {
        toast('Tap again to build here, or drag to reposition.', 'me');
      } else {
        const why = W.whyNotPlace(placing, spot[0], spot[1]);
        toast(why === 'far' ? 'Too far from your city: build within reach of what you have.' : 'It can\'t go there: pick open ground.', 'warn');
      }
      return;
    }
    if (g.kind === 'press' && g.touch && placing && placing !== 'wall') {
      // On a touch screen there's no pointer to show where it would go: the first tap shows it, a second tap there builds it.
      const spot = topLeft(placing, p.x, p.y);
      if (!touchSpot || touchSpot[0] !== spot[0] || touchSpot[1] !== spot[1]) {
        touchSpot = spot; hover = p;
        toast(W.canPlace(placing, spot[0], spot[1]) ? 'Tap it again to build it there.' : W.whyNotPlace(placing, spot[0], spot[1]) === 'far' ? 'Too far from your city: build within reach of what you have.' : 'It can\'t go there: tap open ground.', 'me');
        return;
      }
      touchSpot = null;
    }
    if (g.kind === 'press') {
      const now = performance.now(), dbl = now - lastTap.t < 350 && Math.hypot(e.clientX - lastTap.x, e.clientY - lastTap.y) < 20;
      lastTap = { t: now, x: e.clientX, y: e.clientY };
      clickAt(p.x, p.y, e.shiftKey || e.ctrlKey || e.metaKey, dbl, e.clientX, e.clientY);
    } else if (g.kind === 'right') {
      if (placing || aiming) { placing = null; aiming = null; wallLine = null; refreshPanel(true); }
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
      if (placing || aiming) { placing = null; aiming = null; wallLine = null; refreshPanel(true); }
      else if (sel.length) setSel([]);
      else openMenu();
      return;
    }
    if (modal) return;
    if (e.key === ' ') { e.preventDefault(); togglePause(); return; }
    if (e.key === 'm' || e.key === 'M') {
      if (AUDIO) {
        AUDIO.wake();
        AUDIO.toggleMute();
        updateAudioButton();
        if (!AUDIO.isMuted()) AUDIO.play('tap');
      }
      return;
    }
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

  let actsKey = '', panelKey = '', panelAt = 0;
  function refreshPanel(force) {
    if (!W) return;
    let ents = selEnts();
    if (ents.length !== sel.length) sel = ents.map(e => e.id);
    if (!ents.length && infoEnt && !infoEnt.dead && W.ents.has(infoEnt.id)) ents = [infoEnt];
    cv.classList.toggle('placing', !!placing);
    const one = ents.length === 1 ? ents[0] : null;
    const info = $('selInfo');
    if (!info.querySelector('.selcard')) info.innerHTML = '<div class="selcard"></div><div class="acts"></div>';
    const cardKey = [sel.join(','), ents.length && ents[0].id, one && one.kind === 'building' ? [Math.floor(one.built * 20), Math.ceil(one.hp / S.maxHp(one) * 20)].join() : '',
      one && one.kind === 'unit' ? Math.ceil(one.hp / S.maxHp(one) * 20) + one.order.type : '', ents.length > 1 ? ents.map(e => e.type).join() : ''].join('|');
    const actKey = [sel.join(','), ents.length && ents[0].id, placing, aiming, wallStart && wallStart.join(), armedRemove, touchy, one && one.built >= 1, one && one.rally ? 1 : 0,
      one && one.type === 'wall' && W.canAfford(W.costOf(BUILDINGS.gate, 'p', 'build')), one && one.state].join('|');
    if (force || cardKey !== panelKey) { panelKey = cardKey; info.querySelector('.selcard').innerHTML = infoHtml(ents); }
    if (force || actKey !== actsKey) { actsKey = actKey; info.querySelector('.acts').innerHTML = actsHtml(ents); }
    updateBar();
  }
  // The picture on the card: its button picture if it has one, or else the picture it's drawn with.
  const DRAWN_AS = { lehi: 'lehi', gidgiddoni: 'gidgiddoni', robber: 'robber', robberArcher: 'robber_archer', giddianhi: 'robber_chief', zemnarihah: 'robber_chief',
    slinger: 'lamanite_slinger', amalekite: 'lamanite_captain', zoramite: 'lamanite_captain', zerahemnah: 'zerahemnah' };
  function picOf(e) {
    if (e.type === 'standard') {
      const hType = e.heroType || 'moroni';
      return `<img class="pic" src="${webp('assets/cameo_' + hType + '.png?v=13')}" alt="">`;
    }
    const pic = e.kind === 'building' && e.team !== 'p' && IMG[pictureOf(e)];
    const own = pic && (ready(pic) ? pic : e.def.side === 'kingmen' ? IMG.lamaniteCamp : pic);   // (a tent without its picture yet shows the camp's)
    const c = own ? own.src : CAMEO_MAP[(e.kind === 'unit' ? 'train:' : 'build:') + e.type] || (e.type === 'stronghold' && (e.tier === 1 ? 'assets/cameo_encampment.png?v=1' : e.tier === 2 ? 'assets/cameo_council.png?v=1' : 'assets/cameo_acropolis.png?v=1'));
    if (c) return `<img class="pic" src="${webp(c)}" alt="">`;
    if (DRAWN_AS[e.type]) return `<img class="pic" src="${webp(`assets/${DRAWN_AS[e.type]}.png?v=1`)}" alt="">`;
    if (e.kind === 'unit' && (e.type === 'lamanite' || e.def.foe)) return `<img class="pic" src="${webp('assets/cameo_lamanite.png?v=10')}" alt="">`;
    return '';
  }
  function infoHtml(ents) {
    if (!ents.length) return W.night ? '<p class="about only">It is night.</p>' : '';     // (nothing chosen: the room goes to the build bar)
    if (ents.length === 1) {
      const e = ents[0], d = e.def;
      const bar = d.hp < 99999 ? `<div class="hp"><em style="width:${Math.max(0, e.hp / S.maxHp(e) * 100)}%"></em></div>` : '';
      const doing = e.kind === 'unit' ? ({ gather: 'Gathering ' + (e.order.res || ''), build: 'Building', attack: 'Fighting', move: 'Marching', idle: 'Waiting for orders' }[e.order.type] || '') : e.built < 1 ? 'Being built: ' + Math.floor(e.built * 100) + '%' : '';
      const pic = picOf(e);
      const title = e.type === 'standard' ? ((e.heroType && D.UNITS[e.heroType] ? D.UNITS[e.heroType].name : 'Captain Moroni') + ' (Standard-bearer)') : (e.name && e.kind === 'building' ? e.name : d.name);
      return `${pic}<div${pic ? '' : ' style="grid-column: 1 / -1"'}><h3>${esc(title)}</h3>${bar}${doing ? `<div class="doing">${esc(doing)}</div>` : ''}</div>` +
        (e.about || d.about ? `<p class="about">${esc(e.about || d.about)}</p>` : '');
    }
    const count = {};
    for (const e of ents) count[e.def.name] = (count[e.def.name] || 0) + 1;
    const most = Object.entries(count).sort((a, b) => b[1] - a[1])[0][0];
    const many = n => n.endsWith('man') ? n.slice(0, -3) + 'men' : n + 's';      // spearmen, javelin throwers
    return `${picOf(ents.find(e => e.def.name === most))}<div><h3>${ents.length} chosen</h3><div class="doing">${Object.entries(count).map(([n, k]) => k + ' ' + esc(k > 1 ? many(n.toLowerCase()) : n.toLowerCase())).join(', ')}</div></div>`;
  }
  const CAMEO_MAP = {
    'deploy': 'assets/cameo_moroni.png?v=10',
    'train:worker': 'assets/cameo_worker.png?v=1',
    'train:spearman': 'assets/cameo_spearman.png?v=10',
    'train:nslinger': 'assets/cameo_nslinger.png?v=1',
    'train:archer': 'assets/cameo_archer.png?v=1',
    'train:swordsman': 'assets/cameo_swordsman.png?v=1',
    'train:javelin': 'assets/cameo_javelin.png?v=1',
    'train:stripling': 'assets/cameo_stripling.png?v=10',
    'train:moroni': 'assets/cameo_moroni.png?v=10',
    'train:cart': 'assets/cameo_cart.png?v=2',
    'train:curelom': 'assets/cameo_curelom.png?v=1',
    'train:cumom': 'assets/cameo_cumom.png?v=1',
    'research:stonewalls': 'assets/cameo_wall_stone.png?v=1',
    'research:hides': 'assets/cameo_wall_hides.png?v=1',
    'research:campditch': 'assets/cameo_wall_campditch.png?v=1',
    'train:spy': 'assets/cameo_spy.png?v=1',
    'build:farm': 'assets/cameo_farm.png?v=1',
    'build:granary': 'assets/cameo_granary.png?v=1',
    'build:storehouse': 'assets/cameo_storehouse.png?v=1',
    'build:barracks': 'assets/cameo_barracks.png?v=1',
    'build:wall': 'assets/cameo_wall.png?v=1',
    'build:gate': 'assets/cameo_gate.png?v=1',
    gatehere: 'assets/cameo_gate.png?v=1',
    'build:tower': 'assets/cameo_tower.png?v=10',
    'build:armory': 'assets/cameo_armory.png?v=10',
    'build:stables': 'assets/cameo_stables.png?v=1',
    'build:hall': 'assets/cameo_hall.png?v=1',
    'build:temple': 'assets/cameo_temple.png?v=5',
    'build:smithy': 'assets/cameo_smithy.png?v=1',
    'build:training': 'assets/cameo_training.png?v=1',
    'build:sawmill': 'assets/cameo_sawmill.png?v=1',
    'build:quarry': 'assets/cameo_quarry.png?v=1',
    'build:brickworks': 'assets/cameo_brickworks.png?v=1',
    'train:bearer': 'assets/cameo_bearer.png?v=1',
    'build:tents': 'assets/cameo_tents.png?v=1',
    'build:storetent': 'assets/cameo_storetent.png?v=1',
    'build:muster': 'assets/cameo_muster.png?v=1',
    'build:shieldtent': 'assets/cameo_shieldtent.png?v=1',
    'build:ladderworks': 'assets/cameo_ladderworks.png?v=1',
    'build:pavilion': 'assets/cameo_pavilion.png?v=1',
    'build:lookout': 'assets/cameo_lookout.png?v=1',
    'build:wardance': 'assets/cameo_wardance.png?v=1',
    'build:rameumptom': 'assets/cameo_rameumptom.png?v=1',
    'build:idol': 'assets/cameo_idol.png?v=1',
    'train:lamanite': 'assets/cameo_lamanite.png?v=1',
    'train:slinger': 'assets/cameo_lslinger.png?v=1',
    'train:amalekite': 'assets/cameo_lcaptain.png?v=1',
    'train:zoramite': 'assets/cameo_lcaptain.png?v=1',
    'research:armor': 'assets/cameo_armor.png?v=1',
    'research:breastplates': 'assets/cameo_breastplates.png?v=1',
    'research:cimeters': 'assets/cameo_cimeters.png?v=1',
    'research:pickets': 'assets/cameo_pickets.png?v=1',
    'research:lcimeters': 'assets/cameo_cimeters.png?v=1',
    'research:bows': 'assets/cameo_bows.png?v=1',
    'research:clothing': 'assets/cameo_clothing.png?v=1',
    'research:ladders': 'assets/cameo_ladders.png?v=1',
    'research:council': 'assets/cameo_council.png?v=1',
    'research:acropolis': 'assets/cameo_acropolis.png?v=1'
  };
  const BREAKS = Object.fromEntries(['Store-house', 'Watch-tower', 'Swords-man', 'Spear-man', 'Breast-plates', 'Strip-ling', 'cime-ters', 'Bar-racks', 'Earth-quake', 'Con-fusion',
    'cap-tains', 'Jave-lin', 'Gran-ary', 'Sta-bles', 'Sol-diers', 'war-rior', 'throw-er', 'Train-ing', 'Lad-der', 'Pavil-ion', 'Lama-nite', 'Ama-lekite', 'Zora-mite',
    'Dis-sension', 'Strata-gem', 'Flat-tery', 'Mus-ter', 'Sling-er', 'Pick-ets', 'Cloth-ing', 'Cure-lom', 'Rameump-tom', 'Blood-thirst'].map(w => [w.replace('-', ''), w.replace('-', '\u00ad')]));
  // Buttons with no picture: a drawn sign instead.
  const SIGN = {
    stop: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>',
    fallback: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 6L4 12l6 6M4 12h11a5 5 0 0 1 0 10h-2"/></svg>',
    letgo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    cancel: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    done: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5 9-10"/></svg>',
    remove: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v5M14 11v5"/></svg>',
    gatehere: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 21V9l8-5 8 5v12M8 21v-8h8v8M12 13v8"/></svg>',
    deploy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 21V3M6 4h11l-3 4 3 4H6"/></svg>',
    research: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4l6 6-9 9H5v-6z"/><path d="M12 6l6 6"/></svg>',
    // the temple's miracles
    'miracle:poison': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 3h10M8 3v3a6 6 0 0 0 1 3.5L7 13a6 6 0 1 0 10 0l-2-3.5A6 6 0 0 0 16 6V3"/><circle cx="10.5" cy="16" r="1" fill="currentColor"/><circle cx="13.5" cy="18" r="1" fill="currentColor"/></svg>',
    'miracle:bloodthirst': '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2s6 7.2 6 12a6 6 0 0 1-12 0c0-4.8 6-12 6-12z"/></svg>',
    'miracle:flattery': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 12c3-4 6-4 8 0s5 4 8 0"/><path d="M12 4v3M12 17v3"/></svg>',
    'miracle:dissension': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20V9l8-5 8 5v11"/><path d="M12 9v7M9 12l3 4 3-4"/></svg>',
    'miracle:stratagem': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6z"/><path d="M4 4l16 16"/></svg>',
    'miracle:host': '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="7" cy="8" r="3"/><circle cx="17" cy="8" r="3"/><circle cx="12" cy="6" r="3"/><path d="M2 20c0-4 3-6 5-6s5 2 5 6M12 20c0-4 3-6 5-6s5 2 5 6"/></svg>',
    'miracle:fire': '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2c1 4 5 5.5 5 10a5 5 0 0 1-10 0c0-2 1-3.2 2-4.2 0 2 1 3 2 3 0-3-1-6 1-8.8z"/></svg>',
    'miracle:cloud': '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 18a4 4 0 0 1-.5-8A5.5 5.5 0 0 1 17 9a3.5 3.5 0 0 1 .5 7z"/><path d="M5 21h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    'miracle:quake': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12h4l2-5 3 10 3-8 2 3h4"/></svg>',
    'miracle:sleep': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14h6l-6 6h6M13 4h6l-6 6h6"/></svg>',
    'miracle:turn': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 5l14 14M19 5L5 19M5 5h4M5 5v4M19 19h-4M19 19v-4"/></svg>',
    'miracle:mercy': '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 21s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.5-7 10-7 10z"/></svg>',
    'miracle:shock': '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L4 14h6l-1 8 9-12h-6z"/></svg>'
  };
  // A tile that can be used for the first time wears "New" for a while, like a new icon in Red Alert.
  const seenTiles = new Set(), newUntil = {};
  function noteUnlock(act, can) { if (can && !seenTiles.has(act)) { seenTiles.add(act); if (W && W.t > 2) newUntil[act] = performance.now() + 25000; } }
  const cmd = (act, name, cost, cls) => {
    const pic = CAMEO_MAP[act], sign = SIGN[act];
    if (newUntil[act] > performance.now()) cls = (cls || '') + ' new';
    const face = pic ? `<img src="${webp(pic)}" alt="">` : sign ? `<i class="ic">${sign}</i>` : '';
    // Long words may break where they'd break in print (Watch-tower), never anywhere else; the longest piece sets how big the name can be.
    const shown = String(name).replace(/[A-Za-z]{7,}/g, w => BREAKS[w] || w);
    const n = Math.max(6, ...shown.split(/[\s\u00ad]+/).map(w => w.length));
    return `<button class="cmd ${cls || ''}" data-cmd="${act}" data-label="${name}" style="--n:${n}"><span class="face">${face}<b>${shown}</b></span>${cost ? `<small>${cost}</small>` : ''}</button>`;
  };
  // ------------------------------------------------------------ the side panel: Red Alert's build bar (Blake's play-test)
  // Two columns that are always there: what you can build and make on the left, who you can train and the powers on the right.
  // Each tile shows its own progress swept over its picture, like Red Alert's clock, and a people tile how many are waiting.
  // The tiles are made once and then changed where they stand, so a tap on one is never lost to a redraw.
  const capitalUp = () => W.buildings('p').some(b => b.def.builder && b.built >= 1 && !b.dead);
  function barTiles() {
    const build = [], train = [];
    if (capitalUp()) {
      const list = W.tech ? (SIDES[W.side('p').side] || SIDES.freemen).build : ['wall', 'gate', 'tower', 'barracks', 'storehouse'];
      for (const t of list) if (!W.whyNotBuild(t)) build.push('build:' + t);
    }
    const mine = W.buildings('p').filter(b => b.built >= 1 && !b.dead);
    const seenK = new Set(), seenT = new Set();
    for (const b of mine) for (const k of W.researchAt(b)) if (!W.researched[k] && !seenK.has(k)) { seenK.add(k); build.push('research:' + k); }
    for (const b of mine) for (const t of b.def.trains || []) {
      if (seenT.has(t) || !W.visible(UNITS[t])) continue;
      const why = W.whyNotTrain(t);
      if (why && !why.startsWith('Not enough food')) continue;          // like Red Alert: only what you can make now
      seenT.add(t); train.push('train:' + t);
    }
    const h = W.powerHouse('p');
    if (h) for (const k of Object.keys(POWERS[h.def.powers] || {})) train.push('miracle:' + k);
    return { build, train };
  }
  const tileName = id => { const [act, arg] = id.split(':'); return act === 'build' ? (arg === 'wall' ? 'Walls' : BUILDINGS[arg].name) : act === 'train' ? UNITS[arg].name : act === 'research' ? RESEARCH[arg].name : W.power(arg).name; };
  // Shorter names where the whole one won't fit on a tile (the whole name shows when you hold the mouse over it).
  const SHORT = { 'build:training': 'Training', 'research:stonewalls': 'Walls of stone', 'research:campditch': 'Ditch and bank', 'build:pavilion': 'Pavilion', 'build:wardance': 'War-dance', 'build:shieldtent': 'Shield tent', 'build:hall': "Captains' hall", 'build:rameumptom': 'Rameumptom',
    'miracle:host': "King's call", 'train:amalekite': 'Amalekite', 'train:zoramite': 'Zoramite', 'train:javelin': 'Javelin', 'train:nslinger': 'Slinger', 'train:slinger': 'Slinger',
    'miracle:fire': 'Pillar of fire', 'miracle:cloud': 'Darkness', 'research:lladders': 'Ladders', 'research:ladders': 'Ladders',
    'research:council': 'Council platform', 'research:acropolis': 'Zarahemla acropolis',
    'build:sawmill': 'Timber works', 'build:quarry': 'Stone quarry', 'build:brickworks': 'Cement kiln' };
  function tileHtml(id) {
    const pic = CAMEO_MAP[id], sign = SIGN[id] || (id.startsWith('research:') ? SIGN.research : '');
    const face = pic ? `<img src="${webp(pic)}" alt="">` : sign ? `<i class="ic">${sign}</i>` : '';
    const shown = esc(SHORT[id] || tileName(id)).replace(/[A-Za-z]{7,}/g, w => BREAKS[w] || w);     // (long words break where they would in print)
    return `<button class="bt" data-cmd="${id}" title="${esc(tileName(id))}"><span class="pic">${face}<i class="sweep"></i><em class="n"></em></span><span class="tx"><b>${shown}</b><small></small></span></button>`;
  }
  // How a tile stands now: its progress (0 to 1), how many wait, what its small line says, and whether it can be used.
  function tileState(id) {
    const [act, arg] = id.split(':');
    let p = 0, n = 0, small = '', poor = false, on = false, ready = false;
    if (act === 'build') {
      const cost = W.costOf(BUILDINGS[arg], 'p', 'build'), rising = W.buildings('p', arg).filter(b => b.built < 1 && !b.dead);
      on = placing === arg;
      if (rising.length) { p = rising.reduce((a, c) => c.id > a.id ? c : a).built; n = rising.length > 1 ? rising.length : 0; }
      poor = !W.canAfford(cost);
      small = on ? 'Tap the map' : costHtml(cost) + (arg === 'wall' ? ' each' : '');
    } else if (act === 'train') {
      const def = UNITS[arg], cost = W.costOf(def, 'p', 'train'), why = W.whyNotTrain(arg);
      for (const b of W.buildings('p')) b.queue.forEach((q, i) => { if (q.type !== arg) return; n++; if (i === 0) p = Math.max(p, 1 - q.left / def.time); });
      poor = !!why || !W.canAfford(cost);
      small = why ? 'Not enough food' : costHtml(cost);
    } else if (act === 'research') {
      const r = RESEARCH[arg], R = W.side('p').researching;
      if (R && R.key === arg) { p = 1 - R.left / r.time; small = 'Making: ' + Math.ceil(R.left) + 's'; }
      else { poor = !!R || !W.canAfford(r.cost); small = R ? 'One at a time' : costHtml(r.cost); }
    } else if (act === 'miracle') {
      const m = W.power(arg), wait = W.miracleWait(arg), cap = W.side('p').captain, full = m.wait * ((cap && cap.bonus.powerWait) || 1);
      on = aiming === arg;
      if (wait > 0) { p = Math.max(0.01, 1 - wait / full); poor = true; small = 'in ' + Math.ceil(wait) + 's'; }
      else { ready = true; small = on ? 'Tap where' : 'Ready'; }
    }
    return { p, n, small, poor, on, ready, going: p > 0 && p < 1 };
  }
  let barKey = '', tileEls = new Map();
  function updateBar() {
    if (!W) return;
    const { build, train } = barTiles(), key = build.join() + '|' + train.join(), bar = $('cmds');
    if (key !== barKey || !bar.classList.contains('bar')) {
      barKey = key; bar.classList.add('bar');
      for (const id of build.concat(train)) noteUnlock(id, true);
      const standard = W.units('p').some(u => u.def.deploys);
      bar.innerHTML = `<div class="bcol"><h4>Build</h4>${build.length ? build.map(tileHtml).join('') : `<div class="note">${standard ? 'Plant the standard of liberty first: choose it, then <b>Plant it here</b>.' : 'Nothing to build yet.'}</div>`}</div>` +
        `<div class="bcol"><h4>Train</h4>${train.length ? train.map(tileHtml).join('') : '<div class="note">Your people come out of your buildings.</div>'}</div>`;
      tileEls = new Map([...bar.querySelectorAll('.bt')].map(el => [el.dataset.cmd, el]));
    }
    const nowMs = performance.now();
    for (const [id, el] of tileEls) {
      const s = tileState(id);
      const cls = 'bt' + (s.poor ? ' poor' : '') + (s.on ? ' on' : '') + (s.ready ? ' ready' : '') + (s.going ? ' going' : '') + (newUntil[id] > nowMs ? ' new' : '');
      if (el.className !== cls) el.className = cls;
      const pv = s.going ? s.p.toFixed(3) : '0';
      if (el._p !== pv) { el._p = pv; el.style.setProperty('--p', pv); }
      const nv = s.n ? String(s.n) : '';
      if (el._n !== nv) { el._n = nv; el.querySelector('.n').textContent = nv; }
      if (el._s !== s.small) { el._s = s.small; el.querySelector('small').innerHTML = s.small; }
    }
  }
  // A tap on a tile: place it, train one more, make it, or work it.
  function useTile(id) {
    const [act, arg] = id.split(':');
    if (act === 'build') { if (placing === arg) { placing = null; wallLine = null; wallStart = null; refreshPanel(true); } else startPlacing(arg); }
    else if (act === 'train') trainOne(arg);
    else if (act === 'research') {
      const b = W.buildings('p').find(b => b.built >= 1 && W.researchAt(b).includes(arg));
      if (b && W.research(b, arg)) toast(RESEARCH[arg].about, 'me', RESEARCH[arg].ref);
      else toast(W.researching ? 'One thing at a time: wait until this is made.' : poorText(RESEARCH[arg].cost), 'warn');
    }
    else if (act === 'miracle') startAiming(arg);
  }
  // One more of them, from whichever of your buildings has the shortest line (the chosen one first, if it trains them).
  function trainOne(type) {
    const one = selEnts()[0], score = b => b.queue.length - (b === one ? 0.5 : 0);
    const at = W.buildings('p').filter(b => b.built >= 1 && !b.dead && (b.def.trains || []).includes(type)).sort((a, b) => score(a) - score(b))[0];
    if (!at) return;
    if (!W.train(at, type)) toast(at.queue.length >= 5 ? 'The line is full.' : W.whyNotTrain(type) || poorText(W.costOf(UNITS[type], 'p', 'train')), 'warn');
  }
  // Hold a tile (or right-click it) to take one back: the last of that kind still waiting, or a building still rising, with all it cost.
  function takeBack(id) {
    const [act, arg] = id.split(':');
    if (act === 'train') {
      let best = null;
      for (const b of W.buildings('p')) for (let i = b.queue.length - 1; i >= 0; i--) if (b.queue[i].type === arg) { if (!best || i > best.i) best = { b, i }; break; }
      if (!best) return;
      best.b.queue.splice(best.i, 1); W.refund(W.costOf(UNITS[arg], 'p', 'train'));
      toast(`One ${UNITS[arg].name.toLowerCase()} fewer: what it cost comes back.`, 'me');
    } else if (act === 'build') {
      const b = W.buildings('p', arg).filter(b => b.built < 1 && !b.dead).sort((a, c) => c.id - a.id)[0];
      if (b && W.sell(b)) toast(`${b.def.name} stopped: all it cost comes back.`, 'me');
    }
    updateBar(); refreshPanel(true);
  }
  let holdT = null, held = false, holdTouch = false;
  $('cmds').addEventListener('pointerdown', e => {
    const btn = e.target.closest('.bt');
    held = false; clearTimeout(holdT);
    if (!btn || !W || e.pointerType === 'mouse') return;
    holdTouch = true;
    holdT = setTimeout(() => { held = true; takeBack(btn.dataset.cmd); }, 550);
  });
  for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) $('cmds').addEventListener(ev, () => clearTimeout(holdT));
  $('cmds').addEventListener('contextmenu', e => {
    const btn = e.target.closest('.bt');
    if (!btn || !W) return;
    e.preventDefault();
    if (held) return;                                // (a long press already took one back)
    clearTimeout(holdT);
    if (holdTouch) held = true;
    takeBack(btn.dataset.cmd);
  });
  $('cmds').addEventListener('click', e => {
    const btn = e.target.closest('.bt');
    if (!btn || !W) return;
    if (held) { held = false; return; }
    holdTouch = false;
    useTile(btn.dataset.cmd);
    updateBar(); refreshPanel(true);
  });

  // Under the chosen one's card: what can be done with it (and, while building or aiming, how, and how to stop).
  function actsHtml(ents) {
    const a = (id, label, cls) => `<button class="act ${cls || ''}" data-cmd="${id}">${SIGN[id] ? `<i>${SIGN[id]}</i>` : ''}<span>${label}</span></button>`;
    if (aiming) {
      const m = W.power(aiming);
      return `<p class="hint">${m.aim === 'foe' ? 'Tap the enemy it falls on.' : m.aim === 'building' ? 'Tap the enemy building it falls on.' : 'Tap the spot where it falls.'} <i>${esc(m.ref)}</i></p>` + a('cancel', 'Cancel');
    }
    if (placing) {
      const def = BUILDINGS[placing], each = costHtml(W.costOf(def, 'p', 'build'));
      return `<p class="hint">${placing === 'wall' ? (touchy ? (wallStart ? 'Now tap where the wall ends.' : 'Tap where the wall starts, then where it ends.') : 'Drag a line on the map for a wall.') + ' Each piece ' + each + '.' : 'Tap the map where the ' + esc(def.name.toLowerCase()) + ' goes.'} Tap one of your people to stop.</p>` +
        (placing === 'wall' ? a('done', 'Done', 'on') : '') + a('cancel', 'Cancel');
    }
    if (!ents.length) return `<p class="hint minor">Tap your people (or <b>Soldiers</b>), then where they go or what they fight.</p>`;
    const b = ents[0];
    if (b.team !== 'p') {
      if (b.type === 'village') return `<p class="hint">${b.state === 'waiting' ? 'Send a soldier or worker here. When the proclamation reaches ' + esc(b.name) + ', its people march to Zarahemla.' : 'Its people have gone.'}</p>`;
      if (b.team === 'x') return `<p class="hint">He gave himself up (3 Nephi 4:27).</p>`;
      if (b.def.prophet) return '';
      if (b.kind === 'building') return `<p class="hint">${b.untouchable ? 'Too strong to tear down.' : 'Choose soldiers, then tap it to tear it down.'}</p>`;
      return `<p class="hint">Choose soldiers, then tap him to fight.</p>`;
    }
    if (ents.some(e => e.kind === 'unit')) {
      const home = W.stronghold(), canFall = home && ents.some(e => e.kind === 'unit' && fighterOf(e));
      const soldiers = ents.filter(e => e.kind === 'unit' && fighterOf(e));
      const hasMelee = soldiers.some(e => !e.def.ranged);
      const hasRanged = soldiers.some(e => e.def.ranged);
      let subFilters = '';
      if (soldiers.length > 1 && hasMelee && hasRanged) {
        subFilters = a('filtermelee', '🛡️ Frontline') + a('filterranged', '🏹 Ranged');
      }
      return (ents.length === 1 && b.def.deploys ? a('deploy', 'Plant it here', 'go') : '') +
        subFilters +
        (canFall ? a('fallback', 'Fall back') : '') + a('stop', 'Stop') + a('letgo', 'Let go');
    }
    let h = '';
    if (b.built < 1) h += `<p class="hint minor">It builds itself. Workers sent to it hurry it along.</p>`;
    else if (b.def.trains) h += `<p class="hint minor">${b.rally ? 'New ones go to the rally point.' : 'Tap the ground to set where new ones go.'}</p>`;
    if (b.type === 'stronghold' && b.built >= 1 && b.team === 'p') {
      const rKeys = W.researchAt(b);
      for (const k of rKeys) {
        const r = RESEARCH[k], S = W.side(b.team);
        if (r && !S.researched[k]) {
          if (S.researching && S.researching.key === k) {
            h += `<p class="hint">Upgrading to ${esc(r.name)}: ${Math.ceil(S.researching.left)}s left</p>`;
          } else if (!S.researching) {
            const cost = r.cost, can = W.canAfford(cost);
            h += a('upgradestronghold:' + k, `Upgrade: ${r.name} (${costHtml(cost)})`, can ? 'go' : 'poor');
          }
        }
      }
    }
    if (b.def.cost && !b.untouchable) {
      if (b.type === 'wall' && b.built >= 1) { const c = W.costOf(BUILDINGS.gate, 'p', 'build'), why = W.whyNotBuild('gate'); h += a('gatehere', 'Make a gate here ' + (why ? '' : costHtml(c)), why || !W.canAfford(c) ? 'poor' : ''); }
      const armed = armedRemove === b.id;
      h += a('remove', (armed ? 'Tap again' : b.built < 1 ? 'Stop building' : 'Remove') + ' ' + costHtml(W.sellValue(b)) + ' back', armed ? 'armed' : '');
    }
    return h;
  }
  $('selInfo').addEventListener('click', e => {
    const btn = e.target.closest('.act');
    if (!btn || !W) return;
    const act = btn.dataset.cmd, one = selEnts()[0];
    if (act === 'done' || act === 'cancel') { placing = null; aiming = null; wallLine = null; wallStart = null; }
    else if (act === 'filtermelee') {
      const m = selUnits().filter(u => fighterOf(u) && !u.def.ranged);
      if (m.length) { setSel(m); if (AUDIO) AUDIO.play('select'); }
    }
    else if (act === 'filterranged') {
      const r = selUnits().filter(u => u.def.ranged);
      if (r.length) { setSel(r); if (AUDIO) AUDIO.play('select'); }
    }
    else if (act === 'stop') {
      for (const u of selUnits()) W.order(u, { type: 'idle' });
      if (AUDIO) AUDIO.play('tap');
    }
    else if (act === 'fallback') {                 // home without stopping to fight: a retreat
      const h = W.stronghold(); if (h) { moveGroup(selUnits(), tileOf(h.x), h.ty + h.h + 1, false); ping(h.x, h.y, '#93c5fd'); toast('Falling back to ' + (h.type === 'warcamp' ? 'your camp' : 'your city') + '.', 'me'); if (AUDIO) AUDIO.announce('fallback'); }
    }
    else if (act === 'letgo') return setSel([]);
    else if (act === 'remove' && one) {
      if (armedRemove !== one.id) {                // a second tap, so a slip of the finger takes nothing down
        armedRemove = one.id;
        const id = one.id; setTimeout(() => { if (armedRemove === id) { armedRemove = null; refreshPanel(true); } }, 3000);
      } else {
        const back = W.sellValue(one), name = one.name || one.def.name;
        armedRemove = null;
        if (W.sell(one)) { toast(`${name} taken down: ${costText(back)} back.`, 'me'); return setSel([]); }
      }
    }
    else if (act && act.startsWith('upgradestronghold:') && one) {
      const k = act.slice('upgradestronghold:'.length);
      if (W.research(one, k)) {
        toast(`Beginning upgrade: ${RESEARCH[k].name}.`, 'me');
      } else {
        const r = RESEARCH[k];
        if (r) toast(poorText(r.cost), 'warn');
      }
    }
    else if (act === 'gatehere' && one) {
      const g = W.place('gate', one.tx, one.ty, []);
      if (g) { toast('A gate goes in where the wall was: your people pass, robbers must break it.', 'me'); return setSel([g]); }
      toast(W.whyNotBuild('gate') ? W.whyNotBuild('gate') + '.' : poorText(W.costOf(BUILDINGS.gate, 'p', 'build')), 'warn');
    }
    else if (act === 'deploy' && one) {
      const pos = { x: one.x, y: one.y };
      const city = W.deploy(one);
      if (city) {
        triggerPlantStandardEffect(city, pos, performance.now());
        if (AUDIO) {
          AUDIO.play('plantStandard');
          AUDIO.announce('deploy');
        }
        camShake = 7.0;
        toast('“In memory of our God, our religion, and freedom, and our peace, our wives, and our children…” (Alma 46:12)', 'good');
        return setSel([city]);
      }
      toast('The city needs open ground, 4 by 4. Move the standard to a clear spot.', 'warn');
    }
    refreshPanel(true);
  });
  function showInfo(e) { sel = []; infoEnt = e; placing = null; aiming = null; refreshPanel(true); }

  $('bArmy').onclick = () => {
    if (!W) return;
    const all = W.soldiers();
    if (!all || !all.length) return;
    const current = selUnits();
    const isAll = current.length === all.length && current.every(u => all.includes(u));
    const melee = all.filter(u => !u.def.ranged);
    const ranged = all.filter(u => u.def.ranged);
    const isMelee = melee.length && current.length === melee.length && current.every(u => melee.includes(u));

    if (!current.length || (!isAll && !isMelee)) {
      setSel(all);
      toast(`All soldiers selected (${all.length}). Tap again for Frontline.`, 'tip');
    } else if (isAll && melee.length) {
      setSel(melee);
      toast(`Frontline selected (${melee.length}). Tap again for Ranged.`, 'tip');
    } else if (ranged.length) {
      setSel(ranged);
      toast(`Ranged selected (${ranged.length}). Tap again for All.`, 'tip');
    } else {
      setSel(all);
    }
  };
  // Your city, where everything is built from; before it's planted, the standard of liberty.
  $('bCity').onclick = () => {
    if (!W) return;
    const c = W.stronghold() || W.units('p').find(u => u.def.deploys);
    if (!c) return;
    setSel([c]); lookAt(c.x, c.y);
  };
  $('bTemple').onclick = () => { const t = W && W.temple(); if (t) { setSel([t]); lookAt(t.x, t.y); } };
  $('arts').onclick = e => { const k = e.target.dataset && e.target.dataset.art; if (k && ARTIFACTS[k]) toast(ARTIFACTS[k].name + ': ' + ARTIFACTS[k].about, 'me', ARTIFACTS[k].ref); };
  function setBoxMode(on) { boxMode = on; $('bBox').classList.toggle('on', on); if (on) toast('Now drag on the map to draw a box around people.', 'me'); }
  $('bBox').onclick = () => setBoxMode(!boxMode);

  // ------------------------------------------------------------ top bar

  const shown = {};
  const setText = (id, v) => { if (shown[id] !== v) { shown[id] = v; $(id).textContent = v; } };
  const setHtml = (id, v) => { if (shown[id] !== v) { shown[id] = v; $(id).innerHTML = v; } };
  const mmss = s => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');
  let hudAt = 0;
  function hud(now) {
    const cap = W.tech && W.storeCap() > 0 ? '<small>/' + W.storeCap() + '</small>' : '';
    setHtml('rGrain', Math.floor(W.res.grain) + cap);
    setHtml('rTimber', Math.floor(W.res.timber) + cap);
    setHtml('rStone', Math.floor(W.res.stone || 0) + cap);
    const ps = W.units('p');
    setText('rPeople', W.tech ? W.foodUsed() + '/' + W.foodCap() : ps.filter(u => u.def.gathers || u.def.builds).length + ' · ' + ps.filter(u => u.def.soldier).length);
    if (W.fullAt && W.fullAt > (shown.fullToast || -99) + 20) { shown.fullToast = W.fullAt; toast('Your storehouses are full: build a granary to hold more.', 'warn'); }
    updateBar();                                       // (every frame: the tiles' clocks sweep smoothly)
    if (now - hudAt < 250) return;
    hudAt = now;
    const left = mission.timeLeft(W), label = W.artifacts.interpreters && mission.nextAttack ? 'Next: ' + mission.nextAttack(W) : (mission.phaseLabel || mission.timerLabel || '');
    setHtml('clock', (label ? '<span class="lbl">' + esc(label) + '</span>' : '') + (left != null ? ' <b>' + mmss(left) + '</b>' : ''));
    $('food').hidden = W.prov == null;
    if (W.prov != null) $('foodBar').style.width = clamp(W.prov, 0, 100) + '%';
    const pw = mission.power ? mission.power(W) : null;
    $('cry').hidden = !pw;
    $('bTemple').hidden = !(W.tech && W.temple());
    if (W.tech) { const S = SIDES[W.side('p').side] || SIDES.freemen; $('bTemple').lastChild.textContent = S.house; $('bTemple').title = S.house === 'Temple' ? 'Your temple: miracles are worked from it' : 'Your Rameumptom: wicked works are stirred up from it';
      $('bCity').lastChild.textContent = S.capital === 'warcamp' ? 'Camp' : 'City'; $('bCity').title = S.capital === 'warcamp' ? 'Your war camp: everything is built from here' : 'Your city: everything is built from here'; }
    const held = Object.keys(W.artifacts || {}).filter(k => W.artifacts[k] && ARTIFACTS[k]);
    $('arts').hidden = !held.length;
    setHtml('arts', held.map(k => `<img src="${webp(`assets/cameo_${k === 'beast' ? (W.side('p').side === 'kingmen' ? 'cumom' : 'curelom') : k}.png?v=1`)}" data-art="${k}" title="${esc(ARTIFACTS[k].name)}" alt="">`).join(''));
    if (pw) setHtml('cry', esc(pw.label) + '<small>' + esc(pw.ref || '') + '</small>');
    powerNow = pw;
    const ready = !council || W.t >= council.nextAt;
    $('bCouncil').disabled = !ready;
    setHtml('bCouncil', ready ? 'Council' : '<span class="lbl">Council </span>' + Math.ceil(council.nextAt - W.t) + 's');
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
    if (AUDIO) {
      if (text.includes('is finished')) AUDIO.announce('buildDone');
      else if (text.includes('advances to Tier') || text.includes('reaches Tier') || text.includes('Acropolis Citadel is complete')) {
        AUDIO.play('upgradeCheer');
      }
      else if (text.includes('is ready')) {
        const name = text.replace(' is ready.', '').trim();
        AUDIO.announce('unitReady', name);
      } else if (text.startsWith('A ') && text.includes('comes with')) {
        AUDIO.announce('unitReady');
      } else if (text.includes('is a veteran')) {
        AUDIO.announce('valor');
      } else if (kind === 'warn' && (text.includes('raid') || text.includes('march') || text.includes('gathering') || text.includes('attack') || text.includes('fallen'))) {
        AUDIO.announce('baseAttack');
      } else if (kind === 'rule') {
        AUDIO.play('tap');
      }
    }
    const el = document.createElement('div');
    el.className = 'msg ' + (kind || 'story');
    el.dataset.t = performance.now();
    el.innerHTML = esc(text) + (ref ? ' ' + refBtn(ref) : '');
    $('feed').appendChild(el);
  }
  const toast = (text, kind, ref) => addMsg(text, kind || 'me', ref);
  // Anything that goes wrong in a battle is said on the screen, once, so a screenshot from a phone or tablet
  // shows what broke where it can't be watched from a computer.
  const reported = new Set();
  const report = msg => { if (!W || reported.has(msg) || reported.size > 4) return; reported.add(msg); addMsg('Something went wrong: ' + msg, 'warn'); };
  window.addEventListener('error', e => report(String(e.message || e.error || 'unknown').slice(0, 140)));
  window.addEventListener('unhandledrejection', e => report(String((e.reason && e.reason.message) || e.reason || 'unknown').slice(0, 140)));

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
    if (!qs.length) return toast('Read a chapter from the missions to open the council: its right answers bring grain, timber and treasures.', 'warn');
    if (!council.queue.length) council.queue = shuffle(qs.map((_, i) => i));
    // Opening a question starts the wait, and it comes back later unless it's answered right,
    // so closing one you don't know isn't a way to skip to an easier one.
    const qi = council.queue.shift(), q = qs[qi], temple = !!W.temple();   // with a temple, the council comes back sooner and gives double (Mosiah 2:7)
    council.queue.push(qi); council.nextAt = W.t + (temple ? 15 : 30);
    const answers = shuffle([q.right, ...q.wrong]);
    openDialog(`<div class="dialog"><div class="kicker">The council · ${esc(q.ref.replace(/:.*/, ''))}</div><h2>${esc(q.q)}</h2>
      <div class="choices">${answers.map(a => `<button class="choice" data-a="${esc(a)}">${esc(a)}</button>`).join('')}</div><div id="cAfter"></div></div>`);
    const root = $('dialog');
    root.querySelectorAll('.choice').forEach(btn => btn.onclick = () => {
      if (root.querySelector('.choice.right, .choice.wrong')) return;
      const ok = btn.dataset.a === q.right;
      council.streak = ok ? (council.streak || 0) + 1 : 0;
      root.querySelectorAll('.choice').forEach(b => { if (b.dataset.a === q.right) b.classList.add('right'); else if (b === btn) b.classList.add('wrong'); });
      const vs = versesOf(q.ref);
      if (ok) {
        W.gain('grain', temple ? 80 : 40); W.gain('timber', temple ? 120 : 60); council.right++;
        council.queue = council.queue.filter(i => i !== qi);
        council.nextAt = W.t + (temple ? 30 : 60);
      }
      // Right answers in a row bring out the people's treasures (data.js: ARTIFACTS).
      const found = ok && W.tech ? Object.keys(ARTIFACTS).find(k => ARTIFACTS[k].from === 'council' && ARTIFACTS[k].streak === council.streak && !W.artifacts[k]) : null;
      if (found) W.grant(found, 'council');
      $('cAfter').innerHTML = `<div class="say ${ok ? 'good' : 'bad'}">${ok ? (temple ? 'Right! The people gather at the temple and bring 80 grain and 120 timber.' : 'Right! The people bring 40 grain and 60 timber.') + (council.streak > 1 ? ' That is ' + council.streak + ' in a row.' : '') : 'Not quite. Here is what the chapter says:'}</div>${found ? `<div class="say good">${esc(ARTIFACTS[found].found)}</div>` : ''}
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
  // Pick a side, then a captain, for free battle (design/evolution.md, section 7); the last pick is remembered.
  // The last choices on the free battle and wilderness screens are remembered too (Easy and short until changed).
  const pick = (() => {
    let p = {}; try { p = JSON.parse(localStorage.getItem('liberty.pick') || '{}') || {}; } catch (e) { /* no store */ }
    if (!(CAPTAINS[p.side] && CAPTAINS[p.side][p.captain])) { p.side = 'freemen'; p.captain = 'moroni'; }
    if (!FREE.LEVELS[p.level]) p.level = 'easy';
    if (!WILD.LEVELS[p.wild]) p.wild = 'easy';
    if (!WILD.LENGTHS[p.length]) p.length = Object.keys(WILD.LENGTHS)[0];
    return p;
  })();
  function savePick() { try { localStorage.setItem('liberty.pick', JSON.stringify(pick)); } catch (e) { /* no store */ } }
  function openMenu() {
    if (!W || W.over) return home();
    openDialog(`<div class="dialog"><div class="kicker">Paused</div><h2>${esc(mission.title)}</h2>
      <div class="choices"><button class="choice" data-close>Keep playing</button><button class="choice" id="mRestart">Start this mission again</button><button class="choice" id="mQuit">Leave this game (it stays saved)</button></div></div>`);
    $('mRestart').onclick = () => { closeDialog(); begin(mission); };
    $('mQuit').onclick = () => { closeDialog(); menuFor(mission)(); };
  }
  $('bMenu').onclick = openMenu;

  // ------------------------------------------------------------ the opening page
  // Blake: "The opening page.. can you add some art!? And better layout the game options cleaner." A painting of Moroni raising
  // the title of liberty (art/requests/019), then three big tiles, each opening a screen with only its own choices.
  const ART = { title: 'assets/title.jpg?v=2', story: 'assets/tile_story.jpg?v=2', free: 'assets/tile_free.jpg?v=2', wild: 'assets/tile_wild.jpg?v=1' };
  const menuFor = m => m === WILD ? wildScreen : m && m.free ? freeScreen : storyScreen;
  const councilNote = () => Object.keys(save.read).some(c => QUESTIONS[c]) ? '' : '<p class="lock suggest">Read a mission\'s chapter to open the council: its right answers bring grain, timber and treasures.</p>';
  const segHtml = (keys, on, attr, label) => `<div class="seg">${keys.map(k => `<button class="btn ${k === on ? 'go' : ''}" ${attr}="${k}">${label(k)}</button>`).join('')}</div>`;
  const modeHead = (art, kicker, title) => `<div class="modeHead"><img src="${webp(art)}" alt=""><button class="back" id="mBack" aria-label="Back">←</button>
      <div class="over"><div class="kicker">${esc(kicker)}</div><h2>${esc(title)}</h2></div></div>`;

  // Off the battlefield: the game in progress is saved first (it can be continued from the opening page).
  function leaveGame() {
    if (W && !W.over) autosave();
    if (AUDIO && AUDIO.stopAmbience) AUDIO.stopAmbience();
    W = null; mission = null; sel = []; placing = null; aiming = null;
    setGameUi(false);
    dropGuard();
  }

  function home() {
    leaveGame();
    const won = MISSIONS.filter(m => save.won[m.id]).length;
    const snap = savedGame(), d = snap && SAVE.describe(snap), sub = d ? (snap.kicker || '').replace(d.title + ' · ', '') : '';
    const resume = d ? `<div class="resume"><div class="rtext"><div class="kicker">Your saved game</div><b>${esc(d.title)}</b>
        <small>${esc(sub)}${sub ? ' · ' : ''}${d.minutes} minute${d.minutes > 1 ? 's' : ''} in</small></div>
        <button class="btn go" id="bContinue">Continue</button></div>` : '';
    const tile = (mode, title, about, stars) => `<button class="tile" data-mode="${mode}"><img src="${webp(ART[mode])}" alt="">
        ${stars ? `<span class="tstars">${starsHtml(stars)}</span>` : ''}<span class="cap"><b>${esc(title)}</b><small>${esc(about)}</small></span></button>`;
    const s = showScreen(`<div class="hero"><img src="${webp(ART.title)}" alt="Captain Moroni lifts the title of liberty before his army (Alma 46:12–13)"></div>
      <div class="wrap home">
      <div class="heroText"><div class="kicker">A Book of Mormon strategy game</div>
        <h1><span>Title of Liberty</span></h1>
        <p class="lede">Lead the Nephites through the wars of the Book of Mormon. ${refBtn('Alma 46:12')}</p>
        <button class="btn" id="bHow">How to play</button></div>
      ${resume}
      <div class="tiles">
        ${tile('story', 'Story missions', `Play the chapters · ${won} of ${MISSIONS.length} won`, 0)}
        ${tile('free', 'Free battle', 'Pick a side and a captain, and tear down the enemy', save.won.free || 0)}
        ${tile('wild', WILD.title, 'Build a city and hold off the raids', save.won.wild || 0)}
      </div>
      <details class="how"><summary>All the controls</summary><ul>
        <li><b>Choose</b> your people: tap or click one. Drag a box around several (on a touch screen, tap <b>Box select</b> first). <b>Soldiers</b> chooses your whole army.</li>
        <li><b>Give orders</b>: with people chosen, tap the ground to march, an enemy to fight, trees or a field to gather, or an unfinished building to build it. (On a computer, right-click works too.) Soldiers fight anyone they meet on the way; <b>Fall back</b> brings them home without stopping.</li>
        <li><b>Build</b>: tap your city (or the <b>City</b> button), pick a building, then tap where it goes, within reach of what you have. It rises on its own. For walls, drag a line.</li>
        <li><b>Gather</b>: carts bring in grain and timber by themselves, and stone from a rock face when you ask. Tap a cart, then a field, a forest or a rock face, to choose which.</li>
        <li><b>Train</b>: your city makes carts and workers; the barracks, soldiers and spies. Workers mend what's damaged and hurry what's being built. A soldier who fells three foes becomes a veteran.</li>
        <li><b>Miracles</b>: build a temple and tap it. Each miracle falls where you tap next, then needs time before it can be worked again.</li>
        <li><b>Treasures</b>: send someone to a Jaredite ruin to see what it holds. Right answers at the council, several in a row, bring out more. Tap one in the panel to read about it.</li>
        <li><b>Story moments</b>: when the chapter's big moment comes (crying unto the Lord, Lehi's attack), a gold button appears at the top.</li>
        <li><b>The council</b>: answer a question from the chapter for grain and timber. Get it wrong and you'll see the verse.</li>
        <li><b>Look around</b>: drag the map (arrow keys on a computer), pinch or scroll to zoom, or tap the small map.</li>
        <li>Tap any gold verse reference to read the verse.</li>
      </ul></details>
      <p class="aside">The title of liberty was Captain Moroni's banner (Alma 46:12–13); his story is the first campaign. The maps are pictures of each story: where these places were isn't known.</p>
      <p class="aside"><a href="../">← Back to Treasure Up</a></p>
    </div>`);
    $('bHow').onclick = () => showTips('mission', null, true);
    if ($('bContinue')) $('bContinue').onclick = continueGame;
    s.onclick = e => {
      const t = e.target.closest('[data-mode]');
      if (t) ({ story: storyScreen, free: freeScreen, wild: wildScreen })[t.dataset.mode]();
    };
  }

  let currentMapTab = 'tactical';
  let activePoiId = null;

  const WORLD_POIS = [
    {
      id: 'lehi',
      x: 50, y: 642, w: 260, h: 88,
      name: "Lehi's Landing & First Inheritance",
      ref: 'Alma 22:28 · 1 Nephi 18',
      chapter: '1 Nephi 18',
      short: "Lehi's family landed on the Sea West seashore, pitched their tents, and planted seeds in abundance. Here Nephi fled from his brethren upward into the mountains."
    },
    {
      id: 'nephi',
      x: 672, y: 622, w: 165, h: 58,
      name: 'City of Lehi-Nephi',
      ref: '2 Nephi 5:5–8 · Mosiah 9',
      chapter: '2 Nephi 5',
      short: 'The ancestral highland valley where Nephi built a temple after the manner of Solomon; later reclaimed by Zeniff, Noah, and Limhi.'
    },
    {
      id: 'mormon',
      x: 990, y: 615, w: 180, h: 55,
      name: 'Waters & Forest of Mormon',
      ref: 'Mosiah 18:4–30',
      chapter: 'Mosiah 18',
      short: "A secluded fountain of pure water bordered by a thicket of small trees where Alma preached and baptized 204 souls into Christ's covenant."
    },
    {
      id: 'zarahemla',
      x: 526, y: 416, w: 118, h: 66,
      name: 'City of Zarahemla',
      ref: 'Omni 1:13 · Alma 2:15',
      chapter: 'Alma 2',
      short: 'The walled capitol on the west bank of River Sidon, seat of the Chief Judge, and cultural heart of the Nephite nation.'
    },
    {
      id: 'gideon',
      x: 820, y: 418, w: 140, h: 52,
      name: 'Valley of Gideon',
      ref: 'Alma 6:7 · Alma 14',
      chapter: 'Alma 6',
      short: 'Fertile valley across the River Sidon on the east bank, named after the faithful patriot who withstood King Noah and Korihor.'
    },
    {
      id: 'noah',
      x: 450, y: 350, w: 120, h: 46,
      name: 'City of Noah',
      ref: 'Alma 49:12–25',
      chapter: 'Alma 49',
      short: 'Fortified by Captain Moroni with high earthen ramparts, deep ditches, and timber pickets, completely thwarting the Lamanite assault.'
    },
    {
      id: 'antiparah',
      x: 275, y: 442, w: 115, h: 34,
      name: 'Antiparah & Southwest Frontier',
      ref: 'Alma 53 · Alma 56',
      chapter: 'Alma 56',
      short: 'Stone mountain fortress near Sea West where Helaman and his 2,000 stripling warriors led the Lamanites on a decoy march.'
    },
    {
      id: 'neck',
      x: 550, y: 276, w: 290, h: 36,
      name: 'The Narrow Neck of Land & Pass',
      ref: 'Alma 22:32 · Alma 52:9',
      chapter: 'Alma 22',
      short: "A day and a half's journey from Sea East to Sea West. The continental chokepoint heavily guarded by Moroni and Teancum."
    },
    {
      id: 'hagoth',
      x: 382, y: 286, w: 135, h: 42,
      name: 'Ship of Hagoth & West Sea Launch',
      ref: 'Alma 63:5–8',
      chapter: 'Alma 63',
      short: 'An exceedingly curious man built large ships launched into the West Sea by the narrow neck, carrying Nephites into the land northward.'
    },
    {
      id: 'cumorah',
      x: 752, y: 168, w: 130, h: 44,
      name: 'Hill Cumorah & Land of Desolation',
      ref: 'Mormon 6:6 · Ether 15:11',
      chapter: 'Mormon 6',
      short: 'Ancient hill where both the Jaredite and Nephite civilizations made their final stands, and where sacred records were hidden.'
    }
  ];

  function worldMapHtml() {
    let poisHtml = '';
    for (const p of WORLD_POIS) {
      const active = activePoiId === p.id;
      poisHtml += `<g class="poiNode ${active ? 'active' : ''}" data-poi="${p.id}" role="button" tabindex="0" aria-label="${esc(p.name)}">
        <!-- Exact glowing gold text calligraphy directly illuminating city name -->
        <image href="assets/text_glow_${p.id}.webp" x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" class="poiTextGlow" onerror="this.setAttribute('href','assets/text_glow_${p.id}.png')"/>
        <!-- Generous transparent hit area for easy tapping on touch screens -->
        <rect x="${p.x - 8}" y="${p.y - 6}" width="${p.w + 16}" height="${p.h + 12}" fill="transparent" class="poiHitbox"/>
      </g>`;
    }

    return `<div class="campMapWrap">
      <svg class="campMapSvg" viewBox="0 0 1376 768" preserveAspectRatio="xMidYMid meet">
        <image href="assets/world_map.webp" x="0" y="0" width="1376" height="768" onerror="this.setAttribute('href','assets/world_map.jpg')"/>
        ${poisHtml}
      </svg>
    </div>`;
  }

  function activePoiCardHtml() {
    if (!activePoiId) return '';
    const p = WORLD_POIS.find(x => x.id === activePoiId);
    if (!p) return '';
    return `<div class="poiCard">
      <h3>
        <span>📜 ${esc(p.name)}</span>
        <span class="poiRef">${esc(p.ref)}</span>
      </h3>
      <p>${esc(p.short)}</p>
      <div class="row">
        ${p.chapter ? `<button class="btn go" data-read="${esc(p.chapter)}">📖 Read ${esc(p.chapter)}</button>` : ''}
        <button class="btn" data-close-poi>✕ Close</button>
      </div>
    </div>`;
  }

  function campaignMapHtml() {
    const coords = {
      m3: { cx: 770, cy: 535, label: 'River Sidon', num: 1, ref: 'Alma 43–44', labelY: 596, refY: 616 },
      m4: { cx: 126, cy: 410, label: 'Standard Raised', num: 2, ref: 'Alma 46', labelY: 472, refY: 492 },
      m5: { cx: 675, cy: 230, label: 'City of Noah', num: 3, ref: 'Alma 48–49', labelY: 165, refY: 185 },
      m6: { cx: 250, cy: 600, label: 'Antiparah', num: 4, ref: 'Alma 53, 56', labelY: 664, refY: 684 },
      m1: { cx: 590, cy: 410, label: 'Zarahemla', num: 5, ref: '3 Nephi 3', labelY: 345, refY: 365 },
      m2: { cx: 1160, cy: 330, label: 'Northern Passes', num: 6, ref: '3 Nephi 4', labelY: 265, refY: 285 }
    };

    let nodes = '';
    for (const m of MISSIONS) {
      const pos = coords[m.id];
      if (!pos) continue;
      const stars = save.won[m.id] || 0;
      const active = !stars;
      const starY = (pos.labelY > pos.cy) ? (pos.cy - 46) : (pos.cy + 52);
      nodes += `<g class="mapNode ${active ? 'active' : ''}" data-node="${m.id}" role="button" aria-label="${esc(m.title)}">
        <!-- Glowing candlelight aura -->
        <circle cx="${pos.cx}" cy="${pos.cy}" r="48" class="sealGlow" fill="rgba(217,119,6,0.28)" opacity="0"/>
        <!-- Outer Crimson Wax Seal with seal rim edge -->
        <circle cx="${pos.cx}" cy="${pos.cy}" r="32" fill="url(#sealWax)" stroke="#4a0e0e" stroke-width="2.2"/>
        <!-- Burnished Gold Inner Rim -->
        <circle cx="${pos.cx}" cy="${pos.cy}" r="26" class="sealRim" fill="none" stroke="#d97706" stroke-width="2.2"/>
        <!-- Aged Vellum Core Disc -->
        <circle cx="${pos.cx}" cy="${pos.cy}" r="22" class="core" fill="#fdfaf3" stroke="#2c1608" stroke-width="1.4"/>
        <!-- Mission Number in Cinzel Roman Serif -->
        <text x="${pos.cx}" y="${pos.cy + 7.5}" text-anchor="middle" fill="#2c1608" font-family="'Cinzel', 'Georgia', serif" font-weight="900" font-size="21">${pos.num}</text>
        <!-- Label above/below with parchment halo -->
        <text x="${pos.cx}" y="${pos.labelY}" text-anchor="middle" font-family="'Cinzel', 'Georgia', serif" font-weight="800" font-size="18" fill="#2c1608" style="paint-order: stroke fill; stroke: #f6eedb; stroke-width: 6px; stroke-linejoin: round;">${esc(pos.label)}</text>
        <!-- Scripture Ref with parchment halo in rubricated red -->
        <text x="${pos.cx}" y="${pos.refY}" text-anchor="middle" font-family="'Cinzel', 'Georgia', serif" font-weight="700" font-size="14.5" fill="#8b1e0f" font-style="italic" style="paint-order: stroke fill; stroke: #f6eedb; stroke-width: 5px; stroke-linejoin: round;">${esc(pos.ref)}</text>
        <!-- Stars -->
        ${stars ? `<text x="${pos.cx}" y="${starY}" text-anchor="middle" fill="#b45309" font-size="22" font-weight="900" style="paint-order: stroke fill; stroke: #f6eedb; stroke-width: 4.5px;">${'★'.repeat(stars)}</text>` : ''}
      </g>`;
    }

    return `<div class="campMapWrap">
      <svg class="campMapSvg" viewBox="0 0 1376 768" preserveAspectRatio="xMidYMid meet">
        <defs>
          <!-- Crimson wax seal radial gradient -->
          <radialGradient id="sealWax" cx="40%" cy="35%" r="65%">
            <stop offset="0%" stop-color="#dc2626"/>
            <stop offset="55%" stop-color="#991b1b"/>
            <stop offset="100%" stop-color="#450a0a"/>
          </radialGradient>
        </defs>

        <!-- Hand-Painted Tolkien Middle-earth Cartography Painting -->
        <image href="assets/middle_earth_map.webp" x="0" y="0" width="1376" height="768" onerror="this.setAttribute('href','assets/middle_earth_map.jpg')"/>

        <!-- Hand-Drawn March Route (Crimson Ink Dotted Trail) -->
        <path d="M 770 535 C 600 660, 300 520, 126 410 C 180 260, 460 170, 675 230 C 580 340, 380 480, 250 600 C 350 690, 460 520, 590 410 C 760 380, 960 350, 1160 330" stroke="#991b1b" stroke-width="4.5" stroke-dasharray="6 8" fill="none" opacity="0.8" stroke-linecap="round"/>

        <!-- Interactive Mission Wax Seals & Labels -->
        ${nodes}
      </svg>
    </div>`;
  }

  function perksHtml() {
    const tot = totalStars(), avail = availableStars(), spent = spentStars();
    const perkEntries = Object.values(D.PERKS || {});
    const items = perkEntries.map(p => {
      const active = (save.perks || []).includes(p.id);
      const canAfford = avail >= p.stars;
      const statusBtn = active
        ? `<button class="btn go perkActive" data-perk-refund="${esc(p.id)}">✓ Active · Reclaim</button>`
        : canAfford
          ? `<button class="btn go" data-perk-unlock="${esc(p.id)}">Invoke (${'★'.repeat(p.stars)})</button>`
          : `<button class="btn disabled" disabled>Needs ${p.stars - avail} more ★</button>`;
      return `<div class="perkCard ${active ? 'active' : ''}">
        <div class="perkHead">
          <b>${esc(p.name)}</b>
          <span class="perkStars">${'★'.repeat(p.stars)}</span>
        </div>
        <div class="perkRef">${refBtn(p.ref)}</div>
        <p class="perkAbout">${esc(p.about)}</p>
        <div class="perkAction">${statusBtn}</div>
      </div>`;
    }).join('');

    return `<details class="perksDrawer" ${spent > 0 ? 'open' : ''}>
      <summary class="perksSummary">
        <span class="pSumTitle">🛡️ Blessings &amp; Relics of Liberty</span>
        <span class="pSumBadge">★ ${tot} won · <b>★ ${avail} available</b></span>
      </summary>
      <div class="perksBody">
        <p class="perksIntro">Invest stars won in battle to invoke enduring blessings across your campaign missions. You can reclaim your stars anytime to try different combinations.</p>
        <div class="perksGrid">${items}</div>
        ${spent > 0 ? `<div class="row" style="margin-top:10px"><button class="btn" id="bResetPerks">Reclaim All Stars (${spent}★)</button></div>` : ''}
      </div>
    </details>`;
  }

  // Story missions: the campaigns, each mission a card. Every one is open; reading its chapters first brings a gift.
  function storyScreen() {
    leaveGame();
    const card = m => {
      const stars = save.won[m.id] || 0;
      const unread = chaptersOf(m).filter(c => !save.read[c]);
      const why = unread.length ? `Read ${unread.join(' and ')} first: you start with a gift of grain and timber, and the council asks about it.` : '';
      return `<div class="card" id="card-${m.id}">
        <div class="kicker">Mission ${inCampaign(m).indexOf(m) + 1} · ${esc(m.chapter)}</div>
        <h2>${esc(m.title)}</h2>
        ${stars ? starsHtml(stars) : ''}
        <p>${esc(m.goals)}</p>
        ${why ? `<div class="lock suggest">${esc(why)}</div>` : `<div class="lock read">✓ Read: the people bring a gift when it starts.</div>`}
        <div class="row">
          <button class="btn go" data-play="${m.id}">${stars ? 'Play again' : 'Play'}</button>
          ${chaptersOf(m).map(c => `<button class="btn" data-read="${esc(c)}">${save.read[c] ? 'Read ' + esc(c) + ' again' : 'Read ' + esc(c)}</button>`).join('')}
        </div></div>`;
    };
    const mapSection = `<div class="mapTabs">
      <button class="mapTab ${currentMapTab === 'tactical' ? 'active' : ''}" data-maptab="tactical">⚔️ Wars of Liberty Campaign</button>
      <button class="mapTab ${currentMapTab === 'world' ? 'active' : ''}" data-maptab="world">📜 Lands of the Book of Mormon</button>
    </div>
    ${currentMapTab === 'tactical' ? campaignMapHtml() : worldMapHtml()}
    ${currentMapTab === 'world' ? activePoiCardHtml() : ''}`;
    const s = showScreen(`${modeHead(ART.story, 'Follow the chapters', 'Story missions')}<div class="wrap mode">
      ${mapSection}
      ${perksHtml()}
      ${CAMPAIGNS.map(c => `<h2 class="camp">${esc(c.title)}</h2><p class="camp-about">${esc(c.about)}</p><div class="cards">${MISSIONS.filter(m => m.campaign === c.id).map(card).join('')}</div>`).join('')}
      <div class="row"><button class="btn" data-how>How to play</button></div></div>`);
    $('mBack').onclick = home;
    s.onclick = e => {
      const r = e.target.closest('[data-read]'), p = e.target.closest('[data-play]'), n = e.target.closest('[data-node]');
      const pu = e.target.closest('[data-perk-unlock]');
      const pr = e.target.closest('[data-perk-refund]');
      const rst = e.target.closest('#bResetPerks');
      const mt = e.target.closest('[data-maptab]');
      const poi = e.target.closest('[data-poi]');
      const cp = e.target.closest('[data-close-poi]');
      if (mt) {
        currentMapTab = mt.dataset.maptab;
        activePoiId = null;
        if (AUDIO) AUDIO.play('select');
        storyScreen();
        return;
      }
      if (poi) {
        activePoiId = (activePoiId === poi.dataset.poi) ? null : poi.dataset.poi;
        if (AUDIO) AUDIO.play(activePoiId ? 'select' : 'cancel');
        storyScreen();
        return;
      }
      if (cp) {
        activePoiId = null;
        if (AUDIO) AUDIO.play('cancel');
        storyScreen();
        return;
      }
      if (e.target.closest('[data-how]')) return showTips('mission', null, true);
      if (pu) {
        const id = pu.dataset.perkUnlock;
        const perk = D.PERKS[id];
        if (perk && availableStars() >= perk.stars) {
          save.perks = save.perks || [];
          if (!save.perks.includes(id)) {
            save.perks.push(id);
            store();
            AUDIO.play('upgrade');
            AUDIO.announce('miracle');
            storyScreen();
          }
        }
        return;
      }
      if (pr) {
        const id = pr.dataset.perkRefund;
        save.perks = (save.perks || []).filter(x => x !== id);
        store();
        AUDIO.play('cancel');
        storyScreen();
        return;
      }
      if (rst) {
        save.perks = [];
        store();
        AUDIO.play('cancel');
        storyScreen();
        return;
      }
      if (n) {
        const id = n.dataset.node;
        const targetCard = $(`card-${id}`);
        if (targetCard) {
          targetCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
          targetCard.classList.remove('highlighted');
          void targetCard.offsetWidth;
          targetCard.classList.add('highlighted');
          if (AUDIO) AUDIO.play('select');
        }
        return;
      }
      if (r) openReader(r.dataset.read);
      else if (p) briefing(MISSIONS.find(m => m.id === p.dataset.play));
    };
  }

  // Free battle: a side, a captain, a level, then Play. Only these choices on the screen.
  function freeScreen() {
    leaveGame();
    const opts = () => {
      const S = SIDES[pick.side], caps = CAPTAINS[pick.side], c = caps[pick.captain], L = FREE.LEVELS;
      return `<h3 class="sec">Your side</h3>
        <div class="seg sides">${Object.keys(SIDES).map(k => `<button class="btn ${pick.side === k ? 'go' : ''}" data-side="${k}"><img src="${webp(`assets/cameo_${k === 'kingmen' ? 'lamanite' : 'spearman'}.png?v=1`)}" alt="">${esc(SIDES[k].name)}</button>`).join('')}</div>
        <p class="small">${esc(S.about)}</p>
        <h3 class="sec">Your captain</h3>
        <div class="seg caps">${Object.keys(caps).map(k => `<button class="btn cap ${pick.captain === k ? 'go' : ''}" data-captain="${k}"><img src="${webp(`assets/cameo_${caps[k].hero}.png?v=1`)}" alt="">${esc(caps[k].name)}</button>`).join('')}</div>
        <p class="small"><b>${esc(c.gift)}.</b> ${esc(c.about)}</p>
        <h3 class="sec">Level</h3>
        ${segHtml(Object.keys(L), pick.level, 'data-level', l => `${esc(L[l].name)} <span class="lv">${'★'.repeat(L[l].stars)}</span>`)}`;
    };
    const s = showScreen(`${modeHead(ART.free, 'Skirmish', 'Free battle')}<div class="wrap mode">
      ${save.won.free ? starsHtml(save.won.free) : ''}
      <p class="lede">Build up your city or camp, and tear down the enemy's. The council asks about every chapter you've read.</p>
      <div id="freeOpts">${opts()}</div>
      ${councilNote()}
      <div class="row play"><button class="btn go big" id="bPlay">Play</button><button class="btn" data-how>How to play</button></div></div>`);
    $('mBack').onclick = home;
    $('bPlay').onclick = () => { FREE.level = pick.level; FREE.side = pick.side; FREE.captain = pick.captain; briefing(FREE); };
    s.onclick = e => {
      const sd = e.target.closest('[data-side]'), cp = e.target.closest('[data-captain]'), lv = e.target.closest('[data-level]');
      if (e.target.closest('[data-how]')) return showTips('free-' + pick.side, null, true);
      if (sd) { pick.side = sd.dataset.side; pick.captain = Object.keys(CAPTAINS[pick.side])[0]; }
      else if (cp) pick.captain = cp.dataset.captain;
      else if (lv) pick.level = lv.dataset.level;
      else return;
      savePick(); $('freeOpts').innerHTML = opts();
    };
  }

  // Out of the Wilderness: how long, how hard, then Play.
  function wildScreen() {
    leaveGame();
    const opts = () => `<h3 class="sec">How long</h3>
        ${segHtml(Object.keys(WILD.LENGTHS), pick.length, 'data-length', k => esc(WILD.LENGTHS[k].name))}
        <p class="small">${esc(WILD.LENGTHS[pick.length].about)}</p>
        <h3 class="sec">Level</h3>
        ${segHtml(Object.keys(WILD.LEVELS), pick.wild, 'data-level', l => esc(WILD.LEVELS[l].name))}`;
    const s = showScreen(`${modeHead(ART.wild, 'Skirmish', WILD.title)}<div class="wrap mode">
      ${save.won.wild ? starsHtml(save.won.wild) : ''}
      <p class="lede">${esc(WILD.goals)} The council asks about every chapter you've read.</p>
      <div id="wildOpts">${opts()}</div>
      ${councilNote()}
      <div class="row play"><button class="btn go big" id="bPlay">Play</button><button class="btn" data-how>How to play</button></div></div>`);
    $('mBack').onclick = home;
    $('bPlay').onclick = () => { WILD.level = pick.wild; WILD.length = pick.length; briefing(WILD); };
    s.onclick = e => {
      const ln = e.target.closest('[data-length]'), lv = e.target.closest('[data-level]');
      if (e.target.closest('[data-how]')) return showTips('wild', null, true);
      if (ln) pick.length = ln.dataset.length; else if (lv) pick.wild = lv.dataset.level; else return;
      savePick(); $('wildOpts').innerHTML = opts();
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
    $('rdBack').onclick = storyScreen;
    done.onclick = () => { save.read[chapter] = save.read[chapter] || Date.now(); store(); storyScreen(); };
    s.onclick = null;
  }

  // Canonical Book of Mormon War Council Dialogues before battle
  const WAR_COUNCILS = {
    m3: {
      title: 'Council at the River Sidon',
      ref: 'Alma 43:23–24',
      speakers: [
        { name: 'Captain Moroni', role: 'Chief Captain', cameo: 'cameo_moroni', quote: 'Inquire of the Lord whether our armies shall go into the wilderness to search out the Lamanites.' },
        { name: 'Alma the Younger', role: 'High Priest & Prophet', cameo: 'cameo_plates', quote: 'Behold, the Lamanites will cross the river Sidon in the south wilderness, away by the head of the river.' },
        { name: 'Chief Lehi', role: 'Nephite Commander', cameo: 'cameo_spearman', quote: 'We shall conceal our men in the valley east of Sidon, and fall upon their rear when they pass.' }
      ]
    },
    m4: {
      title: 'Moroni\'s Covenant Council',
      ref: 'Alma 46:12–13',
      speakers: [
        { name: 'Captain Moroni', role: 'Chief Captain', cameo: 'cameo_moroni', quote: 'In memory of our God, our religion, and freedom, and our peace, our wives, and our children!' },
        { name: 'Nephite Council', role: 'Voice of the People', cameo: 'cameo_council', quote: 'Whosoever will maintain this title upon the land, let them come forth in the strength of the Lord!' }
      ]
    },
    m5: {
      title: 'Council on Fortifications',
      ref: 'Alma 48:8, Alma 49:4',
      speakers: [
        { name: 'Captain Moroni', role: 'Chief Captain', cameo: 'cameo_moroni', quote: 'We shall cast up dirt round about to shield our men, and build timber pickets higher than a man\'s stature.' },
        { name: 'Chief Lehi', role: 'City Commander', cameo: 'cameo_spearman', quote: 'Ammonihah and Noah are fortified; the enemy expects easy plunder, but they shall meet walls of stone and earth.' }
      ]
    },
    m6: {
      title: 'Covenant of the Two Thousand',
      ref: 'Alma 53:17, Alma 56:46',
      speakers: [
        { name: 'Helaman', role: 'Prophet & Captain', cameo: 'cameo_helaman', quote: 'They entered into a covenant that they never would give up their liberty, but would fight in all cases.' },
        { name: 'Stripling Warrior', role: 'Son of the Anti-Nephi-Lehies', cameo: 'cameo_stripling', quote: 'Father, behold our God is with us, and he will not suffer that we should fall; our mothers taught us!' }
      ]
    },
    m1: {
      title: 'The Great Gathering Council',
      ref: '3 Nephi 3:21–22',
      speakers: [
        { name: 'Governor Lachoneus', role: 'Chief Judge', cameo: 'cameo_council', quote: 'Gather together all our people with their flocks and herds into one place, in the land of Zarahemla.' },
        { name: 'Gidgiddoni', role: 'Chief Captain & Prophet', cameo: 'cameo_moroni', quote: 'Except the Lord bid us, we will not go against them; but we will prepare and wait until they come down upon us.' }
      ]
    },
    m2: {
      title: 'Council of the Siege',
      ref: '3 Nephi 4:18–19',
      speakers: [
        { name: 'Gidgiddoni', role: 'Chief Captain', cameo: 'cameo_moroni', quote: 'The robbers have no meat save it be in the wilderness; their provisions fail, and famine weakens their host.' },
        { name: 'Governor Lachoneus', role: 'Chief Judge', cameo: 'cameo_council', quote: 'Hold the strongholds and guard the storehouses! In the strength of the Lord the siege shall be broken.' }
      ]
    }
  };

  // What game this is, in a line: the briefing's kicker, and the saved game's on the opening page.
  const kickerOf = m => m.kicker ? m.kicker() : m === FREE ? `Free battle · ${FREE.LEVELS[FREE.level].name} · ${SIDES[FREE.side === 'kingmen' ? 'kingmen' : 'freemen'].name}`
    : `${CAMPAIGNS.find(c => c.id === m.campaign).title} · Mission ${inCampaign(m).indexOf(m) + 1} · ${m.chapter}`;
  function briefing(m) {
    const councilData = WAR_COUNCILS[m.id];
    const councilHtml = councilData ? `<div class="councilCard" style="background:rgba(26,20,13,0.88);border:1.5px solid rgba(212,160,23,0.45);border-radius:10px;padding:14px 18px;margin:16px 0;box-shadow:0 4px 16px rgba(0,0,0,0.4)">
      <div style="font-size:11px;letter-spacing:1.5px;color:#d4a017;text-transform:uppercase;font-weight:700;margin-bottom:10px">📜 War Council · ${esc(councilData.title)} ${refBtn(councilData.ref)}</div>
      <div style="display:flex;flex-direction:column;gap:11px">
        ${councilData.speakers.map(s => `
          <div style="display:flex;gap:12px;align-items:center">
            <img src="${webp(`assets/${s.cameo}.png?v=5`)}" alt="${esc(s.name)}" style="width:42px;height:42px;border-radius:50%;border:1.5px solid #d4a017;object-fit:cover;flex-shrink:0;background:#2a1c0d">
            <div style="flex:1">
              <div style="font-size:12px;font-weight:700;color:#fef08a">${esc(s.name)} <span style="font-weight:400;color:#a8a29e;font-size:11px">(${esc(s.role)})</span></div>
              <div style="font-size:13px;font-style:italic;color:#e7e5e4;line-height:1.4">&ldquo;${esc(s.quote)}&rdquo;</div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>` : '';

    showScreen(`<div class="wrap brief">
      <div class="kicker">${esc(kickerOf(m))} · ${esc(m.year)}</div>
      <h2 style="font-size:32px">${esc(m.title)}</h2>
      <ul>${m.briefing.map(([t, r]) => `<li>${esc(t)} ${refBtn(r)}</li>`).join('')}</ul>
      ${councilHtml}
      ${m === FREE ? `<p class="lede">You are the ${m.side === 'kingmen' ? 'King-men' : 'Freemen'}, under ${esc(CAPTAINS[m.side === 'kingmen' ? 'kingmen' : 'freemen'][m.captain].name)}.</p>` : ''}
      <div class="goalbox"><b>Your goals.</b> ${esc(m.goals)}</div>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <button class="btn go" id="bBegin">Begin</button>
        ${m.campaign ? '<button class="btn" id="bMap">View Map</button>' : ''}
        <button class="btn" id="bTips">Tips</button>
        <button class="btn" id="bBack">Back</button>
      </div></div>`);
    $('bBegin').onclick = () => askThenBegin(m);
    $('bBack').onclick = () => menuFor(m)();
    $('bTips').onclick = () => showTips(tipsKey(m));
    if ($('bMap')) $('bMap').onclick = () => storyScreen();
    if (!(save.tips || {})[tipsKey(m)]) showTips(tipsKey(m));
  }

  // ------------------------------------------------------------ the tips card
  // Blake: "a card that we can read really quickly that teaches things about the gameplay." Four or five tips, a picture each;
  // it shows over the briefing before each kind of game until "Don't show again", and from How to play on the menu.
  const TIPS = {
    'free-freemen': { title: 'Free battle · the Freemen', tips: [
      ['cameo_stronghold', 'Plant the standard', 'Tap the flag, then Plant it here. Your city begins where it stands.'],
      ['cameo_storehouse', 'Build', 'Tap your city. A storehouse first, then farms for food and a barracks for soldiers.'],
      ['cameo_spearman', 'Fight', 'Tap Soldiers, then where to go. They fight anyone they meet. Fall back brings them home.'],
      ['cameo_breastplates', 'Grow stronger', 'The armory and smithy make upgrades. Soldiers who win fights become veterans.'],
      ['cameo_temple', 'Win', 'Tear down the three Lamanite camps and their war camp. Your temple works miracles.']] },
    'free-kingmen': { title: 'Free battle · the King-men', tips: [
      ['cameo_storetent', 'Your camp', 'Tap your war camp. A store tent first, then tents: each feeds eight warriors.'],
      ['cameo_muster', 'Warriors', 'The muster ground trains warriors and slingers: cheap, quick and many.'],
      ['cameo_lamanite', 'Fight', 'Tap Soldiers, then where to go. They fight anyone they meet. Fall back brings them home.'],
      ['cameo_cimeters', 'Grow stronger', 'The shield-makers make shields; the ladder-works, cimeters and ladders.'],
      ['cameo_rameumptom', 'Win', 'Tear down Zarahemla. Your Rameumptom poisons an enemy and stirs up bloodthirst.']] },
    mission: { title: 'Story missions', tips: [
      ['cameo_moroni', 'Follow the story', 'Each mission is a chapter. The Goals panel says what to do, with its verse.'],
      ['cameo_spearman', 'Command', 'Tap your people, then where they go or what they fight. Soldiers fight on the way.'],
      ['cameo_storehouse', 'Build', 'Tap your city to build. Carts bring in grain and timber on their own.'],
      ['cameo_plates', 'Read first', 'Read the chapter before you play: you start with a gift, and the council asks about it.'],
      ['cameo_sword', 'Story moments', 'When the big moment comes, a gold button appears at the top. Tap it.']] },
    wild: { title: 'Out of the Wilderness', tips: [
      ['cameo_stronghold', 'Plant the standard', 'Tap the flag, then Plant it here. Your city begins where it stands.'],
      ['cameo_tower', 'Watch the ways', 'Raiders come by four ways. A watchtower near a way warns you sooner.'],
      ['cameo_spearman', 'Fight', 'Tap Soldiers, then where to go. They fight anyone they meet. Fall back brings them home.'],
      ['cameo_wall', 'Hold out', 'Walls and towers slow the raiders. Beat every raid to win.']] }
  };
  const tipsKey = m => m === WILD ? 'wild' : m.free ? 'free-' + (m.side === 'kingmen' ? 'kingmen' : 'freemen') : 'mission';
  function showTips(key, done, browse) {
    const T = TIPS[key] || TIPS.mission;
    const tabs = browse ? `<div class="row tipTabs">${Object.keys(TIPS).map(k => `<button class="btn ${k === key ? 'go' : ''}" data-tips="${k}">${esc(TIPS[k].title.replace(/^Free battle · /, ''))}</button>`).join('')}</div>` : '';
    openDialog(`<div class="dialog tipsCard"><div class="kicker">How to play</div><h2>${esc(T.title)}</h2>${tabs}
      <ul class="tips">${T.tips.map(([pic, b, t]) => `<li><img src="${webp(`assets/${pic}.png?v=5`)}" alt=""><div><b>${esc(b)}</b><span>${esc(t)}</span></div></li>`).join('')}</ul>
      <div class="row" style="margin-top:14px"><button class="btn go" id="tGot">Got it</button>${browse ? '' : '<button class="btn" id="tNever">Don\'t show again</button>'}</div></div>`);
    $('tGot').onclick = () => { closeDialog(); if (done) done(); };
    if ($('tNever')) $('tNever').onclick = () => { save.tips = save.tips || {}; save.tips[key] = 1; store(); closeDialog(); if (done) done(); };
    $('dialog').querySelectorAll('[data-tips]').forEach(b => b.onclick = () => showTips(b.dataset.tips, done, true));
  }

  // `opts.noSave`: a co-op match the TV starts (multi.js) isn't saved, and doesn't write over the saved game.
  let noSave = false;
  function begin(m, opts) {
    noSave = !!(opts && opts.noSave);
    const world = new S.World(undefined, m.map);
    world.mission = m;
    world.perks = (opts && opts.perks) || (save.perks ? save.perks.slice() : []);
    m.setup(world);
    W = world;
    // Read the chapter first, and the people bring a gift (Blake: reading earns bonuses instead of opening the mission).
    if (!m.free && m !== WILD && allRead(m)) { W.gain('grain', 100); W.gain('timber', 100); W.msg(`You read ${chaptersOf(m).join(' and ')}: the people bring 100 grain and 100 timber.`, null, 'good'); }
    enterGame(m, null);
    autosave();
  }
  // The screen around a world, new or loaded (`ui`: what save.js kept of the screen: the council, the camera, what was explored).
  function enterGame(m, ui) {
    loadPictures();                                         // (if the opening page hadn't finished, the game's pictures start now)
    if (AUDIO && AUDIO.startAmbience) AUDIO.startAmbience();
    mission = m;
    buildHeights();
    sel = []; placing = null; wallLine = null; painted = null; miniDirty = true; endShown = false; particles.length = 0;
    shownMsgs = ui ? W.msgs.length : 0;                     // (a loaded game doesn't replay its old messages)
    seenTiles.clear(); for (const k in newUntil) delete newUntil[k];
    for (const t in BUILDINGS) noteUnlock('build:' + t, !W.whyNotBuild(t));                 // what can be made at the start is not new
    for (const t in UNITS) { const why = W.whyNotTrain(t); noteUnlock('train:' + t, !why || why.startsWith('Not enough food')); }
    paused = !!ui; speed = 1; $('bSpeed').textContent = '1×'; $('bPause').textContent = paused ? '▶' : '❚❚';
    council = ui && ui.council ? ui.council : { nextAt: 20, queue: [], right: 0, streak: 0 };
    closeDialog(); hideScreen();
    $('feed').innerHTML = '';
    setGameUi(true);
    $('goals').open = window.innerWidth >= 700 && window.innerHeight >= 600;
    resize();
    initShroud();
    if (ui && ui.explored && ui.explored.length === explored.length) { explored.set(ui.explored); paintShroud(); }
    cam.z = ui && ui.cam ? ui.cam.z : vw < 700 ? 0.8 : 1;
    const s = W.stronghold() || W.units('p')[0];
    if (ui && ui.cam) { cam.x = ui.cam.x; cam.y = ui.cam.y; clampCam(); }
    else if (s) lookAt(s.x, s.y - (m.id === 'm1' ? 160 : 60));
    if (m.free && !ui) setSel(W.units('p').filter(u => u.def.deploys));
    refreshPanel(true);
    guardHistory();
    if (ui) toast('Your game is back where you left it. Tap ▶ to go on.', 'me');
  }

  function showEnd() {
    endShown = true;
    clearSave();
    const o = W.over;
    if (o.won) { save.won[mission.id] = Math.max(save.won[mission.id] || 0, o.stars || 1); store(); }
    const next = inCampaign(mission)[inCampaign(mission).indexOf(mission) + 1];
    const unread = next ? chaptersOf(next).filter(c => !save.read[c]) : [];
    const nextBtn = o.won && next ? `<button class="btn go" id="eNext">Next: ${esc(next.title)}</button>` + (unread.length ? `<button class="btn" data-read="${esc(unread[0])}">Read ${esc(unread[0])} first</button>` : '') : '';
    setTimeout(() => {
      const s = showScreen(`<div class="wrap end">
        <div class="kicker">${o.won ? 'Victory' : 'Defeat'} · ${esc(mission.title)}</div>
        <h1><span>${esc(o.title)}</span></h1>
        ${o.won ? starsHtml(o.stars || 1) : ''}
        <p class="quote">${esc(o.text)}</p>${o.ref ? refBtn(o.ref) : ''}
        ${o.detail ? `<p class="lede" style="margin-top:12px">${esc(o.detail)}</p>` : ''}
        ${o.next ? `<p class="lede">${esc(o.next)}</p>` : ''}
        ${o.won && mission.starsText ? `<p class="lede">Stars: ${esc(mission.starsText)}</p>` : ''}
        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:18px">${nextBtn}<button class="btn ${nextBtn ? '' : 'go'}" id="eAgain">Play again</button><button class="btn" id="eHome">${mission.free ? 'Choices' : 'Missions'}</button></div></div>`);
      $('eAgain').onclick = () => begin(mission);
      $('eHome').onclick = () => menuFor(mission)();
      if ($('eNext')) $('eNext').onclick = () => briefing(next);
      s.onclick = e => { const r = e.target.closest('[data-read]'); if (r) openReader(r.dataset.read); };
    }, 1200);
  }

  function togglePause() {
    paused = !paused;
    $('bPause').textContent = paused ? '▶' : '❚❚';
    $('bPause').style.background = paused ? '#f59e0b' : '';
    $('bPause').style.color = paused ? '#000' : '';
    if (paused) toast('Game is Paused. Press Space or ▶ to resume.', 'warn');
  }
  $('bPause').onclick = togglePause;
  $('bSpeed').onclick = () => { speed = speed === 1 ? 2 : 1; $('bSpeed').textContent = speed + '×'; };
  function updateAudioButton() {
    if (!$('bAudio')) return;
    const m = AUDIO && AUDIO.isMuted();
    $('bAudio').textContent = m ? '🔇' : '🔊';
    $('bAudio').title = m ? 'Sound: Muted (M)' : 'Sound: On (M)';
  }
  if ($('bAudio')) {
    $('bAudio').onclick = () => {
      if (AUDIO) {
        AUDIO.wake();
        AUDIO.toggleMute();
        updateAudioButton();
        if (!AUDIO.isMuted()) AUDIO.play('tap');
      }
    };
    updateAudioButton();
  }
  let powerNow = null;
  $('cry').onclick = () => { if (W && powerNow) { mission.usePower(W, powerNow.id); $('cry').hidden = true; powerNow = null; shown.cry = null; } };
  document.addEventListener('visibilitychange', () => { if (document.hidden && W && !W.over && !paused) togglePause(); });

  // ------------------------------------------------------------ keeping a game safe
  // Blake: "find a way to prevent us accidentally exiting the game. If I hit the wrong gesture or something, it will exit the game
  // and we'll lose our progress." A game in progress saves itself (save.js) every 15 seconds, when it starts, and whenever the page
  // is hidden or left; the opening page offers to continue it. A back swipe or the back button opens the pause menu instead of
  // leaving; a refresh or a closing tab asks first, where the browser lets a page ask (iPhones don't: the save covers them).
  const SAVE = window.LIB_SAVE;
  function autosave() {
    if (!SAVE || !W || !mission || W.over || noSave) return;
    try {
      const snap = SAVE.dump(W, { council, cam: { x: cam.x, y: cam.y, z: cam.z }, explored });
      if (snap.lost.length) return;                        // something couldn't be written down: keep the last good save
      snap.kicker = kickerOf(mission); snap.build = buildTag();
      localStorage.setItem(SAVE.KEY, JSON.stringify(snap));
    } catch (e) { /* storage full, or a private window: play on */ }
  }
  function savedGame() {
    try { const s = SAVE && JSON.parse(localStorage.getItem(SAVE.KEY) || 'null'); return s && s.v === SAVE.VERSION ? s : null; } catch (e) { return null; }
  }
  function clearSave() { try { if (SAVE) localStorage.removeItem(SAVE.KEY); } catch (e) { /* no store */ } }
  setInterval(() => { if (!paused) autosave(); }, 15000);
  document.addEventListener('visibilitychange', () => { if (document.hidden) autosave(); });
  window.addEventListener('pagehide', autosave);
  window.addEventListener('beforeunload', e => { if (W && !W.over) { autosave(); e.preventDefault(); e.returnValue = ''; } });
  // The back swipe: while a game is on, one step of history stands in front of it. Going back opens the pause menu and puts it back.
  function guardHistory() { try { if (!(history.state && history.state.libertyGame)) history.pushState({ libertyGame: 1 }, ''); } catch (e) { /* no history */ } }
  function dropGuard() { try { if (history.state && history.state.libertyGame) history.back(); } catch (e) { /* no history */ } }
  window.addEventListener('popstate', () => {
    if (!W || W.over || endShown) return;                   // (on the menus, back works as usual)
    guardHistory(); autosave(); openMenu();
  });
  function continueGame() {
    const snap = savedGame();
    // Saved before the game was updated: played on a minute in a copy first, and let go if it can't go on.
    const fresh = snap && snap.build === buildTag();
    let got = null;
    try { got = snap && (fresh || SAVE.playsOn(snap, 30)) && SAVE.load(snap); } catch (e) { got = null; }
    if (!got) {
      clearSave(); home();
      return openDialog(`<div class="dialog"><div class="kicker">Your saved game</div><h2>${snap && !fresh ? 'The game was updated, and that saved game can\'t go on' : 'That saved game could not be opened'}</h2>
        <p class="lede">Sorry. Start a new one from the tiles below.</p><div class="choices"><button class="choice" data-close>OK</button></div></div>`);
    }
    noSave = false;
    W = got.W;
    enterGame(got.mission, got.ui || {});
  }
  // Starting another game would write over the saved one: ask first (from the Begin button only).
  function askThenBegin(m) {
    const snap = savedGame(), d = snap && SAVE.describe(snap);
    if (!d) return begin(m);
    openDialog(`<div class="dialog"><div class="kicker">A game is saved</div><h2>${esc(d.title)}, ${d.minutes} minute${d.minutes > 1 ? 's' : ''} in</h2>
      <p class="lede">Starting ${esc(m.title)} will replace it.</p>
      <div class="choices"><button class="choice" id="sgGo">Continue the saved game</button><button class="choice" id="sgNew">Start ${esc(m.title)}</button><button class="choice" data-close>Back</button></div></div>`);
    $('sgGo').onclick = () => { closeDialog(); continueGame(); };
    $('sgNew').onclick = () => { closeDialog(); clearSave(); begin(m); };
  }
  // Which version of the game's rules a save was made with: the ?v= of the scripts that hold the game itself.
  function buildTag() {
    return [...document.querySelectorAll('script[src]')].map(e => e.getAttribute('src')).filter(x => /^(data|sim|camp|missions|save)\.js/.test(x)).join(' ');
  }


  // ------------------------------------------------------------ ?debug=1: what this device really drew
  // Colours read back from each layer at your city: if a layer shows 0,0,0,0 the device drew nothing on it.
  let debugAt = 0, debugEl = null;
  const px = (c, x, y) => { try { return [...c.getContext('2d').getImageData(Math.round(x), Math.round(y), 1, 1).data].join(','); } catch (e) { return 'unreadable: ' + e.message; } };
  function debugBox(now) {
    if (!DBG.on || !W || now - debugAt < 1000) return;
    debugAt = now;
    if (!debugEl) { debugEl = document.createElement('pre'); debugEl.style.cssText = 'position:fixed;left:6px;top:60px;z-index:50;margin:0;padding:6px 8px;max-width:92vw;white-space:pre-wrap;font:11px/1.3 monospace;color:#fff;background:rgba(0,0,0,.82);border:1px solid #c9962e;border-radius:6px;pointer-events:none'; document.body.appendChild(debugEl); }
    const home = W.stronghold() || W.units('p')[0], g = toIso(home.x - 110, home.y + 110);
    const gx = (g.ix + ISO_OFFSET_X), gy = (g.iy + PAD), s = toScreen(home.x - 110, home.y + 110);
    const a = document.createElement('canvas'); a.width = a.height = 8; a.getContext('2d').fillStyle = '#f00'; a.getContext('2d').fillRect(0, 0, 8, 8);
    const b = document.createElement('canvas'); b.width = b.height = 8; b.getContext('2d').drawImage(a, 0, 0);
    debugEl.textContent = [
      navigator.userAgent.replace(/^Mozilla\/5.0 /, '').slice(0, 120),
      `screen ${vw}×${vh}  device ratio ${window.devicePixelRatio}  drawn at ${dpr}  zoom ${cam.z.toFixed(2)}  dark mode ${matchMedia('(prefers-color-scheme: dark)').matches}`,
      `ground canvas ${DBG.made.ground}   fog canvas ${DBG.made.fog}`,
      `ground painting: ${DBG.paint}   trees ${trees.length}   tree pictures ${TREES ? TREES.length : 'none yet'}`,
      `painted again ${DBG.repaints || 0} time(s) (${DBG.blank || 0} after finding it blank); context lost ${DBG.lost} time(s), restored ${DBG.restored}; lost now: ground ${tctx.isContextLost ? lostNow(tctx) : 'can\'t tell'}, fog ${sctx.isContextLost ? lostNow(sctx) : 'can\'t tell'}, tree ${TREES && TREES[0].cv.getContext('2d').isContextLost ? lostNow(TREES[0].cv.getContext('2d')) : 'can\'t tell'}`,
      `graphics memory: ${navigator.deviceMemory || '?'} GB device${LOW_MEM ? ' (low: smaller ground and fog)' : ''}, ${performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) + ' MB script' : ''}`,
      `frames: ${DBG.fps} a second, the longest ${DBG.worst} ms`,
      // Reading the canvases back is what makes Chrome move them off the graphics chip, so where the browser says
      // when it drops one, the box doesn't read them either (it would slow the very thing it's watching).
      ...(SAYS_LOST ? ['browser says when it drops a canvas: yes, so nothing is read back'] : [
        `ground at city: ${px(terrain, gx * terrain.k, gy * terrain.k)}`,
        `fog at city: ${px(shroudCv, gx * shroudCv.k, gy * shroudCv.k)}`,
        `screen at city: ${px(cv, s.x * dpr, (s.y) * dpr)}`,
        `tree picture: ${TREES ? px(TREES[0].cv, TREES[0].cv.width / 2, TREES[0].cv.height * 0.4) : '-'}`]),
      `canvas onto canvas (should be 255,0,0,255): ${px(b, 4, 4)}`,
      `errors: ${[...reported].join(' | ') || 'none'}`,
    ].join('\n');
  }

  // ------------------------------------------------------------ the loop

  let last = 0, acc = 0;
  let probeAt = 0, probe = null;                       // where a painted land tile is, on the ground canvas
  // A tile nobody has seen with nothing seen for 4 tiles round it: the fog there must be dark (the soft edge of the seen land
  // reaches past the tiles marked seen, so a tile at the edge can be clear without the fog being wiped).
  let darkAt = -1;
  function deepDark() {
    const deep = i => { const x = i % MAP_W, y = (i / MAP_W) | 0;
      for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) { const xx = x + dx, yy = y + dy; if (xx >= 0 && yy >= 0 && xx < MAP_W && yy < MAP_H && explored[yy * MAP_W + xx]) return false; }
      return true; };
    if (darkAt >= 0 && deep(darkAt)) return darkAt;
    darkAt = -1;
    for (let i = 0; i < explored.length; i++) if (!explored[i] && deep(i)) { darkAt = i; break; }
    return darkAt;
  }
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.25, (now - (last || now)) / 1000);
    if (DBG.on && last) {                              // for the debug box: frames a second, and the longest, over the last second
      DBG.n = (DBG.n || 0) + 1; DBG.w = Math.max(DBG.w || 0, now - last);
      if (now - (DBG.since || 0) > 1000) { DBG.fps = DBG.n; DBG.worst = Math.round(DBG.w); DBG.n = 0; DBG.w = 0; DBG.since = now; }
    }
    last = now;
    if (!W) return;
    if (repaintAll && !lostNow(tctx) && !lostNow(sctx)) {
      if (shrinkBig) { shrinkBig = false; shrinkCanvas(terrain, 'ground'); shrinkCanvas(shroudCv, 'fog'); probe = null; }
      repaintAll = false; painted = null; TREES = null; paintShroud(); DBG.repaints = (DBG.repaints || 0) + 1;
    }
    // Once a second, make sure the ground is still there: a phone can drop it without saying so (only where it doesn't say).
    if (!SAYS_LOST && now - probeAt > 1000 && painted && !lostNow(tctx)) {
      probeAt = now;
      if (!probe) { const s = W.stronghold() || W.units('p')[0]; const { ix, iy } = toIso(s.x - 2 * TILE, s.y + 2 * TILE); probe = [(ix + ISO_OFFSET_X) * terrain.k, (iy + PAD) * terrain.k]; }
      let a = 255; try { a = tctx.getImageData(Math.round(probe[0]), Math.round(probe[1]), 1, 1).data[3]; } catch (e) { a = 255; }
      if (a === 0) { DBG.blank = (DBG.blank || 0) + 1; DBG.repaints = (DBG.repaints || 0) + 1; painted = null; TREES = null; paintShroud(); }
      // And the fog: a tile nobody has seen yet must still be dark. If it isn't, the phone wiped the fog: paint it again.
      const hid = deepDark();
      if (hid >= 0 && !lostNow(sctx)) {
        const { ix, iy } = toIso((hid % MAP_W + 0.5) * TILE, (Math.floor(hid / MAP_W) + 0.5) * TILE), k = shroudCv.k || 1;
        let f = 255; try { f = sctx.getImageData(Math.round((ix + ISO_OFFSET_X) * k), Math.round((iy + PAD) * k), 1, 1).data[3]; } catch (e) { f = 255; }
        if (f === 0) { DBG.fogBlank = (DBG.fogBlank || 0) + 1; paintShroud(); }
      }
    }
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
    debugBox(now);
    if (W.over && !endShown) showEnd();
    if (window.LIB_MULTI && window.LIB_MULTI.drawCursor) window.LIB_MULTI.drawCursor(ctx);
  }

  $('iGrain').innerHTML = ICON.grain; $('iTimber').innerHTML = ICON.timber; $('iStone').innerHTML = ICON.stone; $('iPeople').innerHTML = ICON.people;
  window.addEventListener('resize', resize);
  resize();
  home();
  requestAnimationFrame(frame);
  // A window on the game for automated play-throughs in a browser.
  window.LIB_UI = { get W() { return W; }, get mission() { return mission; }, get sel() { return sel; }, get selEnts() { return selEnts(); }, cam, begin: (id, level, length) => { const m = id === 'free' ? FREE : id === 'wild' ? WILD : MISSIONS.find(m => m.id === id); if (level) m.level = level; if (length) m.length = length; begin(m, { noSave: true }); }, toWorld, lookAt, setSel: s => setSel(s), refreshPanel: () => refreshPanel(true),
    briefing: (id) => { const m = typeof id === 'string' ? MISSIONS.find(x => x.id === id) : id; briefing(m); },
    storyScreen: () => storyScreen(),
    home: () => home(),
    screenOf: (x, y) => toScreen(x, y),
    hidden: () => ({ terrain, shroudCv, trees: TREES }),         // the canvases painted once, for tests that wipe them
    remoteClick: (sx, sy, color) => {
      const w = toWorld(sx, sy);
      if (w) clickAt(w.x, w.y, false, false, sx, sy);
    },
    remoteCommand: (act, arg) => {
      if (!W) return;
      const one = selEnts()[0];
      if (act === 'build') startPlacing(arg);
      else if (act === 'done' || act === 'cancel') { placing = null; aiming = null; wallLine = null; wallStart = null; refreshPanel(true); }
      else if (act === 'miracle') startAiming(arg);
      else if (act === 'stop') for (const u of selUnits()) W.order(u, { type: 'idle' });
      else if (act === 'train') trainOne(arg);
      refreshPanel(true);
    }
  };
})();
