const CACHE_NAME = 'yeah-v2';
const urlsToCache = [
  './',
  './index.html',
  './css/style.css',
  './js/app.js',
  './js/storage.js',
  './js/maps.js',
  './js/export.js',
  './manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  // Ignorar peticiones de extensiones y protocolos no HTTP
  if (!event.request.url.startsWith('http')) {
    return;
  }

  // Ignorar peticiones a APIs externas (Nominatim, Leaflet, etc)
  if (event.request.url.includes('nominatim.openstreetmap.org') ||
      event.request.url.includes('unpkg.com') ||
      event.request.url.includes('tile.openstreetmap.org')) {
    event.respondWith(fetch(event.request));
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }
        return fetch(event.request).catch(() => {
          // Si falla, devolver index.html para rutas de la app
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
        });
      })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});
