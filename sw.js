// FieldTrack Service Worker v7
// CACHE VERSION BUMPED — forces fresh fetch of all files on update

const CACHE_NAME = 'fieldtrack-v7';  // ← increment this on every deploy
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Install: cache fresh assets, skip waiting immediately
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting(); // activate immediately, don't wait for old SW to die
});

// Activate: delete ALL old caches, claim all clients immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => {
        console.log('[SW] Deleting old cache:', k);
        return caches.delete(k);
      }))
    ).then(() => self.clients.claim())
  );
});

// Fetch: NETWORK-FIRST for HTML (always get fresh index.html)
//        Cache-first only for non-HTML assets
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Always network for Apps Script API
  if (url.hostname.includes('script.google.com') ||
      url.hostname.includes('accounts.google.com')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Network-first for HTML navigation — guarantees fresh index.html always
  if (event.request.mode === 'navigate' ||
      event.request.destination === 'document' ||
      url.pathname.endsWith('.html') ||
      url.pathname === '/') {
    event.respondWith(
      fetch(event.request).then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
        }
        return response;
      }).catch(() => caches.match(event.request))
    );
    return;
  }

  // Cache-first for other static assets (manifest, icons, fonts)
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
        }
        return response;
      });
    })
  );
});
