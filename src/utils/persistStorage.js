/** Debounced localStorage writes — main thread block kam kare (bade logs ke liye). */

const DEBOUNCE_MS = 800;
const timers = new Map();
const pending = new Map();

function runWhenIdle(fn) {
  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(fn, { timeout: 2500 });
  } else {
    setTimeout(fn, 0);
  }
}

export function schedulePersist(key, value) {
  pending.set(key, value);
  if (timers.has(key)) clearTimeout(timers.get(key));
  timers.set(
    key,
    setTimeout(() => {
      timers.delete(key);
      const next = pending.get(key);
      pending.delete(key);
      if (next === undefined) return;
      runWhenIdle(() => {
        try {
          localStorage.setItem(key, JSON.stringify(next));
        } catch (err) {
          console.warn(`[persist] ${key} save failed`, err);
        }
      });
    }, DEBOUNCE_MS),
  );
}

export function flushPersist(key) {
  if (!pending.has(key)) return;
  if (timers.has(key)) {
    clearTimeout(timers.get(key));
    timers.delete(key);
  }
  const next = pending.get(key);
  pending.delete(key);
  try {
    localStorage.setItem(key, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

export function flushAllPersist() {
  for (const key of [...pending.keys()]) {
    flushPersist(key);
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', flushAllPersist);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushAllPersist();
  });
}
