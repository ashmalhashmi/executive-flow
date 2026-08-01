/** 2-minute rule inbox — do now vs capture for later. */

export function normalizeCaptureEntry(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const text = String(raw.text ?? '').trim();
  if (!text) return null;

  const bucket = raw.bucket === 'now' ? 'now' : 'captured';
  const status = raw.status === 'done' ? 'done' : 'active';

  return {
    id: raw.id || `capture-${Date.now()}`,
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
