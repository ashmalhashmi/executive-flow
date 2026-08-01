let refreshing = false;
const RELOAD_GUARD_KEY = 'ef-sw-reload';

export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;
    if (sessionStorage.getItem(RELOAD_GUARD_KEY) === '1') return;
    sessionStorage.setItem(RELOAD_GUARD_KEY, '1');
    refreshing = true;
    window.location.reload();
  });

  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js');

      reg.addEventListener('updatefound', () => {
        const worker = reg.installing;
        if (!worker) return;
        worker.addEventListener('statechange', () => {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) {
            worker.postMessage({ type: 'SKIP_WAITING' });
          }
        });
      });

      await reg.update();

      if (reg.waiting) {
        reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
    } catch {
      /* silent fail in unsupported/dev edge cases */
    }
  });
}

/** Call after React mounts — allows one SW reload per session only when needed */
export function markAppBootSuccess() {
  sessionStorage.removeItem(RELOAD_GUARD_KEY);
}

/** Clear SW + caches when boot shell never unmounts (stale deploy cache) */
export async function recoverFromStalePwaCache() {
  sessionStorage.removeItem(RELOAD_GUARD_KEY);
  if ('serviceWorker' in navigator) {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.map((r) => r.unregister()));
  }
  if ('caches' in window) {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
  }
  window.location.reload();
}
