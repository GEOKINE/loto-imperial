/**
 * ==============================================================================
 * LOTO IMPERIAL - ESTRATEGIAS DE CACHÉ PARA SERVICE WORKER (PWA)
 * Archivo: strategies.js
 * 
 * Estrategias implementadas:
 * 1. Network-First con Timeout (AbortController) - Para APIs y datos dinámicos.
 * 2. Stale-While-Revalidate con Timeout - Para recursos estáticos (CSS, JS, imágenes).
 * 3. Cache-First con Network Fallback - Para multimedia pesada y fuentes inmutables.
 * ==============================================================================
 */

/**
 * Realiza una petición fetch con timeout usando AbortController para prevenir
 * que la revalidación o la consulta queden colgadas indefinidamente.
 * 
 * @param {Request|string} request - Petición a realizar.
 * @param {number} timeoutMs - Milisegundos máximos de espera (por defecto 3000ms).
 * @returns {Promise<Response>}
 */
export async function fetchWithTimeout(request, timeoutMs = 3000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    const response = await fetch(request, { signal: controller.signal });
    clearTimeout(timeoutId);
    return response;
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

/**
 * Estrategia NETWORK-FIRST con Timeout:
 * Prioriza la red para obtener los datos más recientes.
 * Si la red tarda más de timeoutMs o falla (offline), recurre inmediatamente a la caché.
 * 
 * @param {Request} request 
 * @param {string} cacheName 
 * @param {number} timeoutMs 
 * @returns {Promise<Response>}
 */
export async function networkFirstStrategy(request, cacheName, timeoutMs = 3000) {
  try {
    const networkResponse = await fetchWithTimeout(request, timeoutMs);
    if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
      const responseClone = networkResponse.clone();
      const cache = await caches.open(cacheName);
      await cache.put(request, responseClone);
    }
    return networkResponse;
  } catch (error) {
    console.warn(`[SW Strategy: Network-First] Red no disponible o timeout (${timeoutMs}ms) para ${request.url}. Buscando en caché...`);
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    throw error;
  }
}

/**
 * Estrategia STALE-WHILE-REVALIDATE con Timeout:
 * Responde inmediatamente desde la caché local (0 ms de latencia) y al mismo tiempo
 * lanza una petición en segundo plano con AbortController para actualizar la caché.
 * Si el recurso no estaba en caché, espera a la red.
 * 
 * @param {Request} request 
 * @param {string} cacheName 
 * @param {number} timeoutMs 
 * @returns {Promise<Response>}
 */
export async function staleWhileRevalidateStrategy(request, cacheName, timeoutMs = 3500) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);

  // Promesa de actualización en segundo plano con timeout
  const networkUpdatePromise = fetchWithTimeout(request, timeoutMs)
    .then(async (networkResponse) => {
      if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
        await cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    })
    .catch((err) => {
      // Si la revalidación en segundo plano falla por estar offline o timeout, es tolerante
      // No interrumpe la experiencia del usuario si ya hay datos en caché
    });

  // Si existe en caché, respondemos de inmediato y dejamos que se revalide en fondo
  if (cachedResponse) {
    return cachedResponse;
  }

  // Si no estaba en caché, debemos esperar a la respuesta de red
  const freshResponse = await networkUpdatePromise;
  if (freshResponse) {
    return freshResponse;
  }

  throw new Error(`[SW Strategy: SWR] Recurso no encontrado en caché ni en red: ${request.url}`);
}

/**
 * Estrategia CACHE-FIRST con Fallback a Red:
 * Ideal para activos inmutables (fuentes web, librerías en CDN, imágenes de Unsplash).
 * Revisa primero la caché; si no existe, consulta la red y almacena en caché.
 * 
 * @param {Request} request 
 * @param {string} cacheName 
 * @param {number} timeoutMs 
 * @returns {Promise<Response>}
 */
export async function cacheFirstStrategy(request, cacheName, timeoutMs = 4000) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetchWithTimeout(request, timeoutMs);
    if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
      const cache = await caches.open(cacheName);
      await cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.warn(`[SW Strategy: Cache-First] Falló red para ${request.url}:`, error.message);
    throw error;
  }
}
