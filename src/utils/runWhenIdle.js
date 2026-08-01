export function runWhenIdle(fn) {
  if (typeof requestIdleCallback === 'function') {
    return requestIdleCallback(fn, { timeout: 3000 });
  }
  return setTimeout(fn, 0);
}

export function cancelIdle(id) {
  if (typeof cancelIdleCallback === 'function' && typeof id === 'number') {
    cancelIdleCallback(id);
  } else {
    clearTimeout(id);
  }
}
