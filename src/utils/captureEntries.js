/** Important Notes — personal records, independent of Tasks, Dak, and Contacts. */

import { normalizeNoteVaultBlob } from './notesVault';

export function captureStatus(rawStatus) {
  if (rawStatus === 'trash') return 'trash';
  if (rawStatus === 'done' || rawStatus === 'archived') return 'archived';
  return 'active';
}

export function normalizeCaptureEntry(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const vault = normalizeNoteVaultBlob(raw.vault);
  const text = vault ? '' : String(raw.text ?? '').trim();
  const title = vault ? '' : String(raw.title ?? '').trim();
  if (!text && !vault) return null;

  const bucket = raw.bucket === 'now' ? 'now' : 'captured';
  const status = captureStatus(raw.status);
  const pinned = Boolean(raw.pinned);
  const now = new Date().toISOString();

  return {
    id: raw.id || `capture-${Date.now()}`,
    title,
    text,
    bucket,
    status,
    pinned,
    pinnedAt: pinned ? raw.pinnedAt || raw.updatedAt || now : null,
    vault,
    completedAt: status === 'archived' ? raw.completedAt || raw.updatedAt || now : null,
    trashedAt: status === 'trash' ? raw.trashedAt || raw.updatedAt || now : null,
    createdAt: raw.createdAt || now,
    updatedAt: raw.updatedAt || raw.createdAt || now,
  };
}

export function normalizeCaptureList(list) {
  if (!Array.isArray(list)) return [];
  return list.map(normalizeCaptureEntry).filter(Boolean);
}

export function captureDisplayTitle(entry, secret) {
  const title = String(secret?.title || entry?.title || '').trim();
  if (title) return title;
  if (entry?.vault && !secret) return 'Encrypted vault note';
  const text = String(secret?.text || entry?.text || '').trim();
  if (!text) return 'Untitled note';
  return text.length > 60 ? `${text.slice(0, 60)}…` : text;
}

export function captureSearchText(entry, secret) {
  if (entry?.vault && !secret) return '';
  return `${secret?.title || entry?.title || ''} ${secret?.text || entry?.text || ''}`.toLowerCase();
}

export function sortCaptureEntries(list) {
  return [...(list || [])].sort((a, b) => {
    const ap = a.pinned ? 1 : 0;
    const bp = b.pinned ? 1 : 0;
    if (ap !== bp) return bp - ap;
    if (ap && bp) {
      const pinDelta = (Date.parse(b.pinnedAt) || 0) - (Date.parse(a.pinnedAt) || 0);
      if (pinDelta) return pinDelta;
    }
    return (Date.parse(b.updatedAt) || 0) - (Date.parse(a.updatedAt) || 0);
  });
}
