const CACHE_NAME = 'entrena-sin-equipo-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon_192x192.png',
  '/icon_512x512.png',
  '/splash_1024x1024.png',
  'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;700&display=swap'
];

// ── INSTALL: precache all assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS.filter(url => !url.startsWith('http')));
    })
  );
  self.skipWaiting();
});

// ── ACTIVATE: clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ── FETCH: Cache first for local assets, network first for API
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // API calls (Anthropic) — always network, never cache
  if (url.hostname === 'api.anthropic.com') {
    event.respondWith(fetch(event.request));
    return;
  }

  // Google Fonts — network first, fallback cache
  if (url.hostname.includes('fonts.gstatic.com') || url.hostname.includes('fonts.googleapis.com')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Local assets — cache first, fallback network
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        // Offline fallback: return index.html for navigation requests
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
      });
    })
  );
});

// ── BACKGROUND SYNC placeholder for future use
self.addEventListener('sync', event => {
  if (event.tag === 'sync-metrics') {
    console.log('Background sync: metrics');
  }
});
