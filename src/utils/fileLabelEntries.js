import { resolveFileLabelFormat } from '../constants/labelTemplates';

export const FILE_LABELS_STORAGE_KEY = 'executive_flow_file_labels';

/** One integrated phrase — never keep line-breaks that split Member / (Pharma). */
export function normalizeFileLabelDesignation(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

export function normalizeFileLabel(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const name = normalizeFileLabelDesignation(raw.name ?? raw.line1 ?? '');
  if (!name) return null;
  const format = resolveFileLabelFormat(raw);
  return {
    id: String(raw.id || '').trim() || `flabel-${Date.now()}`,
    name,
    ...format,
    createdAt: raw.createdAt || new Date().toISOString(),
    updatedAt: raw.updatedAt || raw.createdAt || new Date().toISOString(),
  };
}

export function normalizeFileLabelList(list) {
  if (!Array.isArray(list)) return [];
  return list.map(normalizeFileLabel).filter(Boolean);
}

export function fileLabelFilenameStem(name) {
  const safe = String(name || 'file-label')
    .replace(/[^\w\-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
  return safe || 'file-label';
}
