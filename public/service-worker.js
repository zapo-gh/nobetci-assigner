const CACHE_PREFIX = 'nobetci-assigner';
const swUrl = new URL(self.location.href);
const assetsBaseParam = swUrl.searchParams.get('assetsBase');
const versionParam = swUrl.searchParams.get('v');
const normalizedVersion = versionParam
  ? versionParam.replace(/[^a-zA-Z0-9._-]/g, '').substring(0, 32)
  : 'v1';
const CACHE_VERSION = normalizedVersion || 'v1';
const RUNTIME_CACHE = `${CACHE_PREFIX}-${CACHE_VERSION}`;
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

  const url = new URL(request.url);
  
  // Supabase API isteklerini bypass et - her zaman network'ten çek
  const isSupabaseRequest = url.hostname.includes('supabase.co') || 
                            url.hostname.includes('supabase.io');
  
  if (isSupabaseRequest) {
    // Supabase istekleri için cache kullanma, direkt network'e git
    event.respondWith(fetch(request));
    return;
  }
  
  const isAsset = url.pathname.startsWith('/assets/');
  const isStatic = APP_SHELL.some(entry => {
    const entryUrl = resolveAssetUrl(entry);
    return url.pathname === entryUrl || url.pathname === entryUrl.replace(/^\/+/, '');
  });

  // Dinamik asset'ler (JS, CSS) için network-first stratejisi
  if (isAsset) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(request, clone);
            });
            return response;
          }
          throw new Error('Network response not ok');
        })
        .catch(() => {
          return caches.match(request).then((cached) => {
            if (cached) {
              return cached;
            }
            // Cache'de de yoksa, network hatası döndür
            return new Response('Asset not available', { 
              status: 503, 
              statusText: 'Service Unavailable' 
            });
          });
        })
    );
    return;
  }

  // Statik dosyalar için cache-first stratejisi
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) {
        return cached;
      }

      return fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(request, clone);
            });
            return response;
          }
          throw new Error('Network response not ok');
        })
        .catch(() => {
          // Statik dosyalar için fallback
          if (isStatic) {
            return caches.match('/index.html').then((fallback) => {
              return fallback || new Response('Not found', { status: 404 });
            });
          }
          return new Response('Not found', { status: 404 });
        });
    })
  );
});

