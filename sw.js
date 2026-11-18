/**
 * ==============================================================================
 * LOTO IMPERIAL - SERVICE WORKER MODULAR (ES MODULE)
 * Archivo: sw.js
 * 
 * Cumple con:
 * - Formato ES Module (type: 'module')
 * - Importación de estrategias modulares desde strategies.js
 * - CacheStorage versionado dinámico: swr-cache-${BUILD_HASH}
 * - Contador de versión autoincrementable (v5)
 * - Estrategia Network-First con Timeout y AbortController
 * - Estrategia Stale-While-Revalidate para estáticos (CSS, JS, imágenes)
 * - Estrategia Cache-First para CDNs y fuentes inmutables
 * - Limpieza automática de cachés obsoletas en el evento 'activate'
 * ==============================================================================
 */

import { 
  networkFirstStrategy, 
  staleWhileRevalidateStrategy, 
  cacheFirstStrategy 
} from './strategies.js';

// 1. CONTROL DE VERSIONES Y CACHESTORAGE VERSIONADO
const CACHE_VERSION = 'v5';
const BUILD_HASH = '2026.11.18.v5';

export const STATIC_CACHE_NAME = `pwa-static-${CACHE_VERSION}`;
export const SWR_CACHE_NAME = `swr-cache-${BUILD_HASH}`;
export const DYNAMIC_CACHE_NAME = `pwa-dynamic-${CACHE_VERSION}`;

const ACTIVE_CACHES = [STATIC_CACHE_NAME, SWR_CACHE_NAME, DYNAMIC_CACHE_NAME];

// 2. RECURSOS ESENCIALES PARA PRECACHE (Evento Install)
const CORE_PRECACHE_ASSETS = [
  './',
  'index.html',
  'style.css',
  'app.js',
  'strategies.js',
  'manifest.json',
  'menu.json',
  'favi.png',
  'icon-512.png',
  'LOGO.svg',
  'img/icons/maskable_icon (2).png',
  'imagenes/cat-bell.png',
  'js/config.js',
  'js/menu.js',
  'js/sequence.js',
  'js/supabaseClient.js'
];

// 3. EVENTO INSTALL: Precacheo de recursos críticos
self.addEventListener('install', (event) => {
  console.log(`[SW Module ${CACHE_VERSION}] Instalando Service Worker con BUILD_HASH: ${BUILD_HASH}`);
  self.skipWaiting();

  event.waitUntil(
    caches.open(STATIC_CACHE_NAME).then(async (cache) => {
      for (const asset of CORE_PRECACHE_ASSETS) {
        try {
          await cache.add(asset);
        } catch (err) {
          console.warn(`[SW Install] Precache tolerante: ${asset} no pudo cargarse en este momento.`, err);
        }
      }
      console.log(`[SW Install] Precaché completado en ${STATIC_CACHE_NAME}`);
    })
  );
});

// 4. EVENTO ACTIVATE: Limpieza de cachés antiguas e invalidación automática
self.addEventListener('activate', (event) => {
  console.log(`[SW Module ${CACHE_VERSION}] Activando y purgando cachés obsoletas...`);

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (!ACTIVE_CACHES.includes(cacheName)) {
            console.log(`[SW Activate] Eliminando caché obsoleta: ${cacheName}`);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 5. EVENTO FETCH: Enrutamiento inteligente por tipo de recurso y estrategia
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Solo interceptamos peticiones GET
  if (request.method !== 'GET') return;

  // No interceptar endpoints de autenticación directa de Supabase
  if (url.pathname.includes('/auth/v1/')) return;

  // A. NAVEGACIÓN PRINCIPAL (HTML / Documentos) -> Network-First con Fallback a index.html
  if (request.mode === 'navigate') {
    event.respondWith(
      networkFirstStrategy(request, STATIC_CACHE_NAME, 3000).catch(() => {
        return caches.match('index.html') || caches.match('./');
      })
    );
    return;
  }

  // B. DATOS DINÁMICOS Y APIS (menu.json, Supabase REST API) -> DEBE TENER NETWORK FIRST
  const isApiOrData = 
    url.pathname.endsWith('menu.json') || 
    url.pathname.includes('/rest/v1/') ||
    url.hostname.includes('supabase.co');

  if (isApiOrData) {
    event.respondWith(
      networkFirstStrategy(request, DYNAMIC_CACHE_NAME, 3000).catch(async () => {
        // Fallback local en caso de desconexión
        const fallback = await caches.match(request);
        if (fallback) return fallback;
        if (url.pathname.endsWith('menu.json')) {
          return caches.match('menu.json');
        }
        return new Response(JSON.stringify({ offline: true, error: "Network timeout / Offline" }), {
          headers: { 'Content-Type': 'application/json' },
          status: 503
        });
      })
    );
    return;
  }

  // C. RECURSOS ESTÁTICOS PROPIOS (CSS, JS, imágenes locales, iconos) -> STALE-WHILE-REVALIDATE
  const isLocalStatic = 
    url.origin === self.location.origin && (
      url.pathname.endsWith('.css') ||
      url.pathname.endsWith('.js') ||
      url.pathname.endsWith('.png') ||
      url.pathname.endsWith('.svg') ||
      url.pathname.endsWith('.jpg') ||
      url.pathname.endsWith('.jpeg') ||
      url.pathname.endsWith('.webp') ||
      url.pathname.endsWith('.json')
    );

  if (isLocalStatic) {
    event.respondWith(
      staleWhileRevalidateStrategy(request, SWR_CACHE_NAME, 3500).catch(() => {
        return caches.match(request);
      })
    );
    return;
  }

  // D. ACTIVOS EXTERNOS E INMUTABLES (Google Fonts, CDNs, Unsplash) -> CACHE-FIRST
  const isThirdPartyAsset = 
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('gstatic.com') ||
    url.hostname.includes('cdnjs.cloudflare.com') ||
    url.hostname.includes('unpkg.com') ||
    url.hostname.includes('tailwindcss.com') ||
    url.hostname.includes('images.unsplash.com');

  if (isThirdPartyAsset) {
    event.respondWith(
      cacheFirstStrategy(request, STATIC_CACHE_NAME, 4000).catch(() => {
        return caches.match(request);
      })
    );
    return;
  }

  // E. POR DEFECTO: Stale-While-Revalidate en caché SWR
  event.respondWith(
    staleWhileRevalidateStrategy(request, SWR_CACHE_NAME, 3000).catch(() => {
      return caches.match(request);
    })
  );
});
