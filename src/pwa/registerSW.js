const RELOAD_GUARD_KEY = 'ef-sw-reload';

function hardReloadWithCacheBust() {
  const url = new URL(window.location.href);
  url.searchParams.set('ef_refresh', String(Date.now()));
  window.location.replace(`${url.pathname}${url.search}${url.hash}`);
}

/** Service worker disabled — caused stale-cache boot loops on mobile after deploy. */
export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  window.addEventListener(
    'load',
    async () => {
      try {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
        if ('caches' in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map((k) => caches.delete(k)));
        }
      } catch {
        /* ignore */
      }
    },
    { once: true },
  );
}

export function markAppBootSuccess() {
  sessionStorage.removeItem(RELOAD_GUARD_KEY);
  if (typeof window !== 'undefined') {
    window.__efBoot = { ...(window.__efBoot || {}), reactMounted: true, at: Date.now() };
  }
  document.getElementById('ef-boot-recovery')?.remove();
  document.getElementById('ef-boot-wait')?.remove();
  document.getElementById('ef-chunk-recovery')?.remove();
  document.querySelector('.app-boot')?.remove();
}

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
  hardReloadWithCacheBust();
}
