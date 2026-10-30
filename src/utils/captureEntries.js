/** Important Notes — save / edit / delete personal records. */

export function normalizeCaptureEntry(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const text = String(raw.text ?? '').trim();
  if (!text) return null;

  const bucket = raw.bucket === 'now' ? 'now' : 'captured';
  const status = raw.status === 'done' ? 'done' : 'active';
  const title = String(raw.title ?? '').trim();

  return {
    id: raw.id || `capture-${Date.now()}`,
    title,
    text,
    bucket,
    status,
    completedAt: status === 'done' ? raw.completedAt || new Date().toISOString() : null,
    createdAt: raw.createdAt || new Date().toISOString(),
    updatedAt: raw.updatedAt || raw.createdAt || new Date().toISOString(),
  };
}

export function normalizeCaptureList(list) {
  if (!Array.isArray(list)) return [];
  return list.map(normalizeCaptureEntry).filter(Boolean);
}

export function captureDisplayTitle(entry) {
  const title = String(entry?.title || '').trim();
  if (title) return title;
  const text = String(entry?.text || '').trim();
  if (!text) return 'Untitled note';
  return text.length > 60 ? `${text.slice(0, 60)}…` : text;
}

export function sortCaptureEntries(list) {
  return [...(list || [])].sort(
    (a, b) => (Date.parse(b.updatedAt) || 0) - (Date.parse(a.updatedAt) || 0),
  );
}
