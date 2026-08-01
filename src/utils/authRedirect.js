/** Canonical production origin for auth redirects (magic link / OAuth). */
export const APP_ORIGIN =
  typeof window !== 'undefined' && window.location?.origin
    ? window.location.origin
    : 'https://executive-flow-seven.vercel.app';

export function getAuthRedirectTo() {
  if (typeof window === 'undefined') return 'https://executive-flow-seven.vercel.app';
  // Prefer current origin so preview/local still work; production stays production.
  return window.location.origin;
}
