// Treasure Up opens with no Wi-Fi (Blake, 2026-10-07: "Yes, add it"; the
// tracer found a Kindle opened offline got only the browser's offline page).
//
// The app and its content come from the network first, as before, so every
// deploy reaches a phone with a connection the way it always has; the copy
// kept here is for when there's none. Pictures, Be still's tracks and the
// Firebase library are kept once fetched and served from the copy (each is
// refreshed in the background). Other sites (YouTube, Firebase's own traffic,
// GitHub for developer mode) are left alone.
const VERSION = 'dev';   // the deploy writes its commit here (pages.yml), so each deploy refreshes the copy
// Named by its own address too: the live app and the test site share github.io, and so its storage.
const SCOPE = new URL(self.registration.scope).pathname;
const PREFIX = 'treasureup-' + SCOPE + '-';
const CACHE = PREFIX + VERSION;
const SHELL = ['./', 'index.html', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png',
  'fullscreen.js', 'scripture-words.js', 'content/weeks.js', 'content/past/index.js', 'content/reading.js', 'content/audio.js',
  'content/boards.js', 'content/sunday.js'];
const FIREBASE_SDK = /^https:\/\/www\.gstatic\.com\/firebasejs\//;
const KEPT = /\.(png|jpe?g|webp|gif|svg|m4a|mp3|woff2?)$/i;

self.addEventListener('install', e => {
  // Each file on its own: one missing (a deploy without the chapters) doesn't stop the rest.
  e.waitUntil(caches.open(CACHE)
    .then(c => Promise.all(SHELL.map(u => c.add(new Request(u, { cache: 'reload' })).catch(() => {}))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith(PREFIX) && k !== CACHE).map(k => caches.delete(k))))   // its own older copies only
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || req.headers.has('range')) return;           // a sound played in pieces: as before
  const sdk = FIREBASE_SDK.test(req.url);
  if (!sdk && url.origin !== self.location.origin) return;
  if (!sdk && !url.pathname.startsWith(SCOPE)) return;

  // Kept once fetched: the copy now, a fresh one for next time.
  if (sdk || KEPT.test(url.pathname)) {
    e.respondWith(caches.open(CACHE).then(async c => {
      const hit = await c.match(req);
      const fresh = fetch(req).then(r => { if (r.ok || r.type === 'opaque') c.put(req, r.clone()); return r; }).catch(() => hit || Response.error());
      return hit || fresh;
    }));
    return;
  }

  // The app and its content: the network first; with no connection, the copy.
  e.respondWith(caches.open(CACHE).then(async c => {
    try {
      const r = await fetch(req);
      if (r.ok && url.search === '') c.put(req, r.clone());   // an invite link or ?v= stamp isn't a page of its own to keep
      return r;
    } catch (err) {
      const hit = await c.match(req, { ignoreSearch: req.mode === 'navigate' });
      if (hit) return hit;
      // The app's own address, opened offline (an invite link, the TV's #host): its page.
      if (req.mode === 'navigate' && (url.pathname === SCOPE || url.pathname === SCOPE + 'index.html')) return (await c.match('index.html')) || Response.error();
      return Response.error();
    }
  }));
});
