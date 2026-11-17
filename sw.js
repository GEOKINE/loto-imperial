// LOTO IMPERIAL - Service Worker PWA (Offline-First)
const CACHE_NAME = 'loto-imperial-v4';

const CORE_ASSETS = [
    './',
    'index.html',
    'style.css',
    'app.js',
    'manifest.json',
    'menu.json',
    'favi.png',
    'img/icons/maskable_icon (2).png',
    'LOGO.svg',
    'icon-512.png',
    'imagenes/cat-bell.png',
    'js/config.js',
    'js/menu.js',
    'js/sequence.js',
    'js/supabaseClient.js'
];

// 1. INSTALACIÓN: Precachear recursos esenciales de forma segura
self.addEventListener('install', (event) => {
    console.log('[SW] Instalando Loto Imperial Service Worker...');
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then(async (cache) => {
            // Usamos carga tolerante para que si un asset no crítico falla, el SW se instale igual
            for (const asset of CORE_ASSETS) {
                try {
                    await cache.add(asset);
                } catch (err) {
                    console.warn(`[SW] No se pudo precachear ${asset}:`, err);
                }
            }
            console.log('[SW] Recursos esenciales precacheados.');
        })
    );
});

// 2. ACTIVACIÓN: Limpiar cachés antiguas y tomar control inmediato
self.addEventListener('activate', (event) => {
    console.log('[SW] Activando nueva versión del Service Worker...');
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME) {
                        console.log('[SW] Eliminando caché obsoleta:', key);
                        return caches.delete(key);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// 3. FETCH: Estrategia Híbrida (Cache-First para assets locales, Network-First con fallback para datos)
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Solo manejamos peticiones GET
    if (request.method !== 'GET') return;

    // No interceptamos llamadas de autenticación directa
    if (url.pathname.includes('/auth/v1/')) return;

    event.respondWith(
        caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
                // Actualizamos en segundo plano si hay red (Stale-while-revalidate para assets locales)
                if (url.origin === self.location.origin) {
                    fetch(request).then((networkResponse) => {
                        if (networkResponse && networkResponse.status === 200) {
                            caches.open(CACHE_NAME).then((cache) => cache.put(request, networkResponse));
                        }
                    }).catch(() => {/* Silencioso en modo offline */});
                }
                return cachedResponse;
            }

            // Si no está en caché, intentamos red
            return fetch(request).then((networkResponse) => {
                if (!networkResponse || networkResponse.status !== 200) {
                    return networkResponse;
                }

                // Guardamos en caché imágenes remotas (Unsplash) y fuentes
                if (
                    url.hostname.includes('unsplash.com') || 
                    url.hostname.includes('googleapis.com') ||
                    url.hostname.includes('gstatic.com') ||
                    url.hostname.includes('cdnjs.cloudflare.com')
                ) {
                    const responseClone = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
                }

                return networkResponse;
            }).catch(() => {
                // Fallback offline para navegación de páginas
                if (request.mode === 'navigate') {
                    return caches.match('index.html');
                }
            });
        })
    );
});
