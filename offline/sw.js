const CACHE_VERSION = 'v1';
const CACHE_NAME = `micro-apps-${CACHE_VERSION}`;
const OFFLINE_URL = './offline/offline.html';

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const coreAssets = [
        './',
        './index.html',
        './shared/shell/shell.css',
        './shared/shell/shell.js',
        './shared/ui/components.js',
        './shared/utils/dom.js',
        './shared/utils/format.js',
        './shared/utils/storage.js',
        './apps/apps.json',
        OFFLINE_URL,
      ];

      try {
        const manifestResponse = await fetch('./apps/apps.json');
        if (manifestResponse.ok) {
          const apps = await manifestResponse.json();
          for (const app of apps) {
            coreAssets.push(app.entryPath);
            const base = app.entryPath.replace(/[^/]+$/, '');
            coreAssets.push(`${base}app.js`, `${base}app.css`);
          }
        }
      } catch (error) {
        console.warn('Skipping manifest pre-cache', error);
      }

      await cache.addAll(coreAssets);
      self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
          return null;
        })
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  if (request.mode === 'navigate') {
    event.respondWith(pageHandler(request));
    return;
  }

  event.respondWith(cacheFirst(request));
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

async function cacheFirst(request) {
  const cached = await caches.match(request, { ignoreSearch: true });
  if (cached) return cached;
  try {
    const response = await fetch(request);
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, response.clone());
    return response;
  } catch (error) {
    return caches.match(OFFLINE_URL);
  }
}

async function pageHandler(request) {
  try {
    const response = await fetch(request);
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, response.clone());
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) return cached;
    return caches.match(OFFLINE_URL);
  }
}
