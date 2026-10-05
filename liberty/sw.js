// Title of Liberty's offline copy (a service worker). After one visit the game opens from the device itself, quickly,
// with or without the internet; GitHub Pages only lets a browser keep a file for 10 minutes before asking again.
//   - The page itself (index.html): the network first, so a new version is there as soon as it's published; the copy kept
//     here if the network is away or slower than 3.5 s.
//   - A file with a version on its address (ui.js?v=55, temple.webp?v=4): kept for good, since a new version gets a new
//     address. Fetching a new version throws out the older ones of that file.
//   - Anything else of ours (../fullscreen.js, the icons) and Google's fonts: the copy kept here at once, refreshed behind.
// To take it away from every device: publish an sw.js whose install handler calls self.registration.unregister().
'use strict';
const CACHE = 'liberty-1';
const FONTS = /^https:\/\/fonts\.(googleapis|gstatic)\.com$/;

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil((async () => {
  for (const k of await caches.keys()) if (k !== CACHE && k.startsWith('liberty-')) await caches.delete(k);
  await self.clients.claim();
})()));

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const u = new URL(req.url);
  const ours = u.origin === self.location.origin;
  if (!ours && !FONTS.test(u.origin)) return;                       // Firebase, co-op and the rest go straight to the network
  if (ours && (req.mode === 'navigate' || /\.html$|\/$/.test(u.pathname))) return e.respondWith(page(req, u));
  if (ours && /(^|&)v=/.test(u.search.slice(1))) return e.respondWith(versioned(req, u));
  e.respondWith(kept(req));
});

// The page: the network if it answers in time, else the copy (one copy, whatever ?debug=1 or such is on the address).
async function page(req, u) {
  const cache = await caches.open(CACHE), key = u.origin + u.pathname.replace(/\/$/, '/index.html');
  const net = fetch(req).then(r => { if (r.ok) cache.put(key, r.clone()); return r; });
  net.catch(() => {});                                              // (if the copy answers first, a failed fetch isn't an error)
  const slow = new Promise(res => setTimeout(res, 3500));
  try {
    const r = await Promise.race([net, slow.then(() => null)]);
    if (r) return r;
    return (await cache.match(key)) || await net;
  } catch (err) {
    const kept = await cache.match(key);
    if (kept) return kept;
    throw err;
  }
}

// A versioned file: the copy if there is one; else the network, kept, and the file's older versions thrown out.
async function versioned(req, u) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(req);
  if (hit) return hit;
  const r = await fetch(req);
  if (r.ok) {
    await cache.put(req, r.clone());
    for (const k of await cache.keys()) { const o = new URL(k.url); if (o.pathname === u.pathname && o.search !== u.search) await cache.delete(k); }
  }
  return r;
}

// Anything else: the copy at once if there is one, and a fresh one fetched behind it for next time.
async function kept(req) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(req);
  const net = fetch(req).then(r => { if (r.ok || r.type === 'opaque') cache.put(req, r.clone()); return r; }).catch(() => null);
  return hit || (await net) || Response.error();
}
