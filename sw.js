// FieldTrack SW v99 — intentionally minimal, no caching
// Forces browser to always fetch fresh files from server
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(ks => Promise.all(ks.map(k => caches.delete(k))))
    .then(() => self.clients.claim())
  );
});
// No fetch handler = no caching, everything goes to network
