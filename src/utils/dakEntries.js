const AUTO_DISPATCH_PREFIX = 'DAK-';

export function generateDispatchNumber(entries, at = new Date()) {
  const year = at.getFullYear();
  const prefix = `${AUTO_DISPATCH_PREFIX}${year}-`;
  let max = 0;

  for (const entry of entries || []) {
    if (entry.status === 'cancelled') continue;
    const fileId = String(entry.fileId ?? '');
    if (!fileId.startsWith(prefix)) continue;
    const seq = parseInt(fileId.slice(prefix.length), 10);
    if (Number.isFinite(seq) && seq > max) max = seq;
  }

  return `${prefix}${String(max + 1).padStart(4, '0')}`;
}

export function normalizeDakEntry(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const fileId = String(raw.fileId ?? '').trim();
  const externalDispatchNo = String(raw.externalDispatchNo ?? '').trim();
  const receivedDate = String(raw.receivedDate ?? '').trim();
  const forwardedDate = String(raw.forwardedDate ?? '').trim();
  const designation = String(raw.designation ?? '').trim();
  const subject = String(raw.subject ?? '').trim();
  if (!fileId || !forwardedDate || !designation || !subject) return null;
  return {
    id: raw.id || `dak-${Date.now()}`,
    fileId,
    externalDispatchNo,
    receivedDate,
    forwardedDate,
    designation,
    subject,
    status: raw.status === 'cancelled' ? 'cancelled' : 'active',
    createdAt: raw.createdAt || new Date().toISOString(),
    updatedAt: raw.updatedAt || raw.createdAt || new Date().toISOString(),
  };
}

export function normalizeDakList(list) {
  if (!Array.isArray(list)) return [];
  return list.map(normalizeDakEntry).filter(Boolean);
}

export function isDuplicateDakFileId(entries, fileId, excludeId = '') {
  const key = String(fileId ?? '').trim().toLowerCase();
  if (!key) return false;
  return entries.some(
    (e) =>
      e.status !== 'cancelled' &&
      e.id !== excludeId &&
      String(e.fileId).trim().toLowerCase() === key,
  );
}

/** Context-primary search — subject, addressee, dates; system ref is secondary. */
export function searchDakEntries(entries, query) {
  const q = String(query ?? '').trim().toLowerCase();
  if (!q) return [...(entries || [])];

  return (entries || []).filter((entry) => {
    const subject = String(entry.subject ?? '').toLowerCase();
    const addressee = String(entry.designation ?? '').toLowerCase();
    const dispatched = String(entry.forwardedDate ?? '').toLowerCase();
    const received = String(entry.receivedDate ?? '').toLowerCase();
    const systemRef = String(entry.fileId ?? '').toLowerCase();
    const official = String(entry.externalDispatchNo ?? '').toLowerCase();

    return (
      subject.includes(q) ||
      addressee.includes(q) ||
      dispatched.includes(q) ||
      received.includes(q) ||
      official.includes(q) ||
      systemRef.includes(q)
    );
  });
}

/** Filter by addressee and/or dispatch date (forwardedDate). */
export function filterDakEntries(
  entries,
  { addressee = '', designation = '', dispatchDate = '', receivedDate = '' } = {},
) {
  let list = [...(entries || [])];

  const des = String(addressee || designation || '').trim();
  if (des) {
    list = list.filter((entry) => entry.designation === des);
  }

  const dispatched = String(dispatchDate ?? '').trim();
  if (dispatched) {
    list = list.filter((entry) => entry.forwardedDate === dispatched);
  }

  const received = String(receivedDate ?? '').trim();
  if (received) {
    list = list.filter((entry) => entry.receivedDate === received);
  }

  return list;
}

/** Newest dispatch date first — humans scan by when, not by number. */
export function sortDakEntries(entries) {
  return [...(entries || [])].sort((a, b) =>
    `${b.forwardedDate}T${b.subject}`.localeCompare(`${a.forwardedDate}T${a.subject}`),
  );
}
