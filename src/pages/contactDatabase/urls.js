/** Runtime-only URL helpers for Contact Database actions. */

export function buildGoogleSearchUrl(queryText) {
  const query = String(queryText ?? '').trim();
  if (!query) return '';
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}
