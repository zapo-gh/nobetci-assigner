const CACHE_PREFIX = 'nobetci-assigner';
const CACHE_VERSION = 'v1';
const RUNTIME_CACHE = `${CACHE_PREFIX}-${CACHE_VERSION}`;

const swUrl = new URL(self.location.href);
const assetsBaseParam = swUrl.searchParams.get('assetsBase');
const ASSET_BASE = assetsBaseParam ? assetsBaseParam.replace(/\/$/, '') : '';

const APP_SHELL = [
  { url: '/', useAssetBase: false },
  { url: '/index.html', useAssetBase: false },
  { url: '/manifest.json', useAssetBase: false },
  { url: '/favicon.svg', useAssetBase: true },
  { url: '/favicon_yedek.svg', useAssetBase: true }
];

const resolveAssetUrl = (entry) => {
  if (!entry?.url) return '/';
  const path = entry.url.startsWith('/') ? entry.url : `/${entry.url}`;
  if (!entry.useAssetBase || !ASSET_BASE) {
    return path;
  }
  return `${ASSET_BASE}${path}`;
};

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(RUNTIME_CACHE)
      .then((cache) => cache.addAll(APP_SHELL.map(resolveAssetUrl)))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith(CACHE_PREFIX) && key !== RUNTIME_CACHE)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) {
        return cached;
      }

      return fetch(request)
        .then((response) => {
          const clone = response.clone();

          caches.open(RUNTIME_CACHE).then((cache) => {
            cache.put(request, clone);
          });

          return response;
        })
        .catch(() => cached);
    })
  );
});

