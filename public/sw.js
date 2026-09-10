/** Passthrough SW — clears old caches, does not intercept requests (avoids stale deploy loops). */
const CACHE_NAME = 'executive-flow-v112';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
    ).then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
