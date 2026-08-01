const CACHE_NAME = 'executive-flow-v110';
const APP_SHELL = [
  '/manifest.webmanifest',
  '/vite.svg',
  '/fonts/inter.css',
  '/fonts/inter-latin-400-normal.woff2',
  '/fonts/inter-latin-600-normal.woff2',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key)),
      ),
    ),
  );
  self.clients.claim();
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

function isAssetPath(pathname) {
  return pathname.includes('/assets/');
}

function isNavigateRequest(request) {
  return (
    request.mode === 'navigate' ||
    request.destination === 'document' ||
    (request.headers.get('accept') || '').includes('text/html')
  );
}

/** HTML / navigation: network first so deploys never serve stale index */
async function networkFirstDocument(request) {
  try {
    const response = await fetch(request);
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response('Offline', { status: 503, statusText: 'Offline' });
  }
}

/** Hashed build chunks: network first, cache fallback — avoids stale JS after deploy */
async function networkFirstAsset(request) {
  const cache = await caches.open(CACHE_NAME);

  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    return new Response('Asset offline', { status: 503, statusText: 'Offline' });
  }
}

/** Fonts / manifest: stale-while-revalidate */
async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  const networkPromise = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => null);

  if (cached) {
    networkPromise.catch(() => {});
    return cached;
  }

  const fresh = await networkPromise;
  if (fresh) return fresh;
  return cache.match(request);
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Always fetch sw.js from network so updates can install
  if (url.pathname.endsWith('/sw.js')) return;

  if (isNavigateRequest(request)) {
    event.respondWith(networkFirstDocument(request));
    return;
  }

  if (isAssetPath(url.pathname)) {
    event.respondWith(networkFirstAsset(request));
    return;
  }

  event.respondWith(staleWhileRevalidate(request));
});
