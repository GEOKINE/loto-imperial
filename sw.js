const CACHE_NAME = 'loto-imperial-v11';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './offline.html',
  './css/style.css',
  './js/app.js',
  './js/sequence.js',
  './js/menu.js',
  './js/chatbot.js',
  './js/supabaseClient.js',
  './manifest.json',
  './img/icons/maskable_icon_x192 (2).png',
  './img/icons/LOGO.svg'
];

// Instalación: Guardar archivos básicos en caché
self.addEventListener('install', event => {
  console.log('Loto Imperial SW: Instalando v11...');
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      console.log('Cacheando assets imperiales...');
      // Usamos Promise.allSettled para que si un archivo falla, los demás se guarden igual
      await Promise.allSettled(
        ASSETS_TO_CACHE.map(url => cache.add(url))
      );
      return cache;
    }).then(() => self.skipWaiting())
  );
});

// Activación: Limpiar cachés antiguas
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME)
            .map(key => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// Estrategia: Cache First, luego Red, y si falla todo -> offline.html
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      // 1. Si está en caché, devolverlo inmediatamente
      if (cachedResponse) {
        return cachedResponse;
      }

      // 2. Si no está en caché, intentar buscarlo en la red
      return fetch(event.request).catch(async () => {
        // 3. Si la red falla Y es una petición de navegación (HTML), devolver offline.html
        if (event.request.mode === 'navigate') {
          const offlinePage = await caches.match('offline.html');
          if (offlinePage) return offlinePage;

          const indexPage = await caches.match('index.html');
          if (indexPage) return indexPage;
        }

        // 4. CRÍTICO: Siempre devolver un objeto Response válido.
        // Esto evita el error "Failed to convert value to Response" que bloqueaba la página.
        return new Response('Recurso no disponible offline', {
          status: 503,
          headers: { 'Content-Type': 'text/plain' }
        });
      });
    })
  );
});
