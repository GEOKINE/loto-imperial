const CACHE_NAME = 'loto-imperial-v13';
const ASSETS_TO_CACHE = [
  'index.html',
  'offline.html',
  'css/style.css',
  'js/app.js',
  'js/sequence.js',
  'js/menu.js',
  'js/chatbot.js',
  'js/supabaseClient.js',
  'manifest.json',
  'img/icons/maskable_icon_x192 (2).png',
  'img/icons/LOGO.svg'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await Promise.allSettled(
        ASSETS_TO_CACHE.map(url => cache.add(url))
      );
      return cache;
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) return cachedResponse;

      return fetch(event.request).catch(async () => {
        if (event.request.mode === 'navigate') {
          const cache = await caches.open(CACHE_NAME);
          const cachedRequests = await cache.keys();

          const offlineResponse = await cachedRequests.find(req =>
            req.url.endsWith('offline.html')
          );

          if (offlineResponse) {
            return caches.match(offlineResponse);
          }

          const indexResponse = await cachedRequests.find(req =>
            req.url.endsWith('index.html')
          );
          if (indexResponse) return caches.match(indexResponse);
        }

        return new Response('Recurso no disponible offline', {
          status: 503,
          headers: { 'Content-Type': 'text/plain' }
        });
      });
    })
  );
});