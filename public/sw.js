// Minimal service worker: shows /offline.html when a page can't load without a connection.
// It never caches pages, data, form posts or server actions, so nothing can go stale.
// VERSION is the first 8 hex digits of sha256(offline.html + icons/icon-192.png), so changing either
// file changes this worker and refreshes the cache. tests/pwa.test.ts fails until it is updated.
const VERSION = "7636b93c";
const CACHE = `wrt-offline-${VERSION}`;
const OFFLINE_URL = "/offline.html";
const PRECACHE = [OFFLINE_URL, "/icons/icon-192.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(PRECACHE.map((url) => new Request(url, { cache: "reload" }))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith("wrt-offline-") && key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL)));
    return;
  }
  // Let the offline page show its icon; everything else goes straight to the network.
  if (new URL(request.url).pathname === "/icons/icon-192.png") {
    event.respondWith(caches.match(request).then((cached) => cached ?? fetch(request)));
  }
});
