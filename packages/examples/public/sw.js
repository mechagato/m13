/**
 * m13 service worker — T-202 (Fase 2, P1 PWA) · endurecido por auditoría 06-12 (B12).
 *
 * Estrategia (D-3001: a mano, cero deps, cero red nueva — Constitution §1):
 * - Navegación (index): network-first con fallback a cache → offline abre la app.
 * - Assets /assets/* (content-hashed por Vite, inmutables): cache-first puro.
 * - Escenas .m13: PRECACHEADAS en install (demo vivo sin red — venue InnovaFest)
 *   y servidas stale-while-revalidate: respuesta inmediata del cache + refresh de
 *   red en background → un hotfix de escena llega al siguiente load SIN esperar
 *   cambio de __BUILD_HASH__.
 * - Versionado: el registro usa /sw.js?v=<build> — la query cambia el byte-stream
 *   percibido, fuerza SW nuevo, y activate purga los caches de versiones previas.
 */
const VERSION = new URL(self.location).searchParams.get('v') || 'dev';
const CACHE = 'm13-' + VERSION;

// Inyectado al build por el plugin de vite.config.ts (lista real de public/scenes/)
const PRECACHE_SCENES = __PRECACHE_SCENES__;

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(['/', '/manifest.webmanifest', '/icons/icon-192.png', ...PRECACHE_SCENES]))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
      .then(() =>
        self.clients.matchAll().then((cs) => cs.forEach((c) => c.postMessage({ type: 'm13-updated', version: VERSION }))),
      ),
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;

  // Navegación: red primero (deploy fresco), cache si no hay red
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .then((r) => {
          const copy = r.clone();
          caches.open(CACHE).then((c) => c.put('/', copy));
          return r;
        })
        .catch(() => caches.match('/')),
    );
    return;
  }

  // Escenas .m13: stale-while-revalidate — cache al instante, refresh en background
  if (url.pathname.endsWith('.m13')) {
    e.respondWith(
      caches.match(e.request).then((hit) => {
        const refresh = fetch(e.request)
          .then((r) => {
            if (r.ok) {
              const copy = r.clone();
              caches.open(CACHE).then((c) => c.put(e.request, copy));
            }
            return r;
          })
          .catch(() => hit);
        return hit || refresh;
      }),
    );
    return;
  }

  // Todo lo demás same-origin: cache-first, poblado al vuelo
  e.respondWith(
    caches.match(e.request).then(
      (hit) =>
        hit ||
        fetch(e.request).then((r) => {
          if (r.ok) {
            const copy = r.clone();
            caches.open(CACHE).then((c) => c.put(e.request, copy));
          }
          return r;
        }),
    ),
  );
});
