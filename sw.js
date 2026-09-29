/* Unni service worker — offline shell + installability
   Bump CACHE name whenever Unni.html UI changes so old shells are dropped. */
const CACHE = 'unni-v4';
const ASSETS = ['./Unni.html', './manifest.json', './sw.js'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  const path = url.pathname;
  const isAppShell =
    path.endsWith('Unni.html') ||
    path.endsWith('/') ||
    path.endsWith('/index.html') ||
    path.endsWith('sw.js');

  // Network-first, bypass HTTP cache — so reopening after PIN shows latest UI
  if (isAppShell) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(event.request, copy));
          }
          return res;
        })
        .catch(() =>
          caches.match(event.request).then((r) => r || caches.match('./Unni.html'))
        )
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) =>
      cached || fetch(event.request).catch(() => cached)
    )
  );
});
