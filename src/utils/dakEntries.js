const AUTO_DISPATCH_PREFIX = 'DAK-';

export const DAK_CLEARED_AT_STORAGE_KEY = 'executive_flow_dak_cleared_at';

export function parseDakClearedAt(raw) {
  if (raw == null || raw === '') return '';
  const t = Date.parse(String(raw).trim());
  if (!Number.isFinite(t)) return '';
  return new Date(t).toISOString();
}

export function maxDakClearedAt(...values) {
  let maxMs = 0;
  let maxIso = '';
  for (const value of values) {
    const iso = parseDakClearedAt(value);
    if (!iso) continue;
    const ms = Date.parse(iso);
    if (ms > maxMs) {
      maxMs = ms;
      maxIso = iso;
    }
  }
  return maxIso;
}

export function loadDakClearedAt() {
  try {
    const raw = localStorage.getItem(DAK_CLEARED_AT_STORAGE_KEY);
    if (!raw) return '';
    return parseDakClearedAt(JSON.parse(raw));
  } catch {
    return parseDakClearedAt(localStorage.getItem(DAK_CLEARED_AT_STORAGE_KEY));
  }
}

export function saveDakClearedAt(iso) {
  const parsed = parseDakClearedAt(iso);
  if (!parsed) {
    localStorage.removeItem(DAK_CLEARED_AT_STORAGE_KEY);
    return '';
  }
  localStorage.setItem(DAK_CLEARED_AT_STORAGE_KEY, JSON.stringify(parsed));
  return parsed;
}

function entryTimestampMs(entry) {
  const t = Date.parse(String(entry?.updatedAt || entry?.createdAt || ''));
  return Number.isFinite(t) ? t : 0;
}

/** Drop register rows that existed at or before an intentional Erase Dak. */
export function applyDakClearedAt(entries, clearedAt) {
  const list = normalizeDakList(entries);
  const iso = parseDakClearedAt(clearedAt);
  if (!iso) return list;
  const clearMs = Date.parse(iso);
  return list.filter((entry) => entryTimestampMs(entry) > clearMs);
}

/** Union merge + honor the later Erase Dak tombstone (scan photos/Sr# still merge). */
export function mergeDakSnapshotData(localData, cloudData) {
  const clearedAt = maxDakClearedAt(
    localData?.settings?.dakClearedAt,
    cloudData?.settings?.dakClearedAt,
  );
  const dak = applyDakClearedAt(
    mergeDakLists(normalizeDakList(cloudData?.dak), normalizeDakList(localData?.dak)),
    clearedAt,
  );
  const settings = { ...(localData?.settings && typeof localData.settings === 'object' ? localData.settings : {}) };
  if (clearedAt) settings.dakClearedAt = clearedAt;
  return { dak, settings, dakClearedAt: clearedAt };
}

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

function parseRegisterSr(raw) {
  const n = Number.parseInt(String(raw ?? '').trim(), 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function getNextRegisterSr(entries) {
  let max = 0;
  for (const entry of entries || []) {
    if (entry.status === 'cancelled') continue;
    const sr = parseRegisterSr(entry.registerSr);
    if (sr > max) max = sr;
  }
  return max + 1;
}

/** Use scanned/manual Sr# when valid; otherwise next serial (manual register style). */
export function resolveRegisterSr(payload, activeEntries) {
  const fromPayload = parseRegisterSr(payload?.registerSr);
  if (fromPayload > 0) return fromPayload;
  return getNextRegisterSr(activeEntries);
}

function backfillRegisterSr(entries) {
  const active = entries.filter((e) => e.status !== 'cancelled');
  const missing = active.filter((e) => parseRegisterSr(e.registerSr) <= 0);
  if (!missing.length) return entries;

  const assignMap = new Map();

  if (missing.length === active.length) {
    const sorted = [...active].sort((a, b) => {
      const da = a.createdAt || a.forwardedDate || '';
      const db = b.createdAt || b.forwardedDate || '';
      return da.localeCompare(db);
    });
    sorted.forEach((e, i) => assignMap.set(e.id, i + 1));
  } else {
    let next = getNextRegisterSr(active);
    const sortedMissing = [...missing].sort((a, b) => {
      const da = a.createdAt || a.forwardedDate || '';
      const db = b.createdAt || b.forwardedDate || '';
      return da.localeCompare(db);
    });
    for (const e of sortedMissing) {
      assignMap.set(e.id, next);
      next += 1;
    }
  }

  return entries.map((e) =>
    assignMap.has(e.id) ? { ...e, registerSr: assignMap.get(e.id) } : e,
  );
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
  const registerSr = parseRegisterSr(raw.registerSr);
  const scanPhotoUrl = String(raw.scanPhotoUrl ?? '').trim();
  return {
    id: raw.id || `dak-${Date.now()}`,
    fileId,
    registerSr: registerSr > 0 ? registerSr : 0,
    externalDispatchNo,
    receivedDate,
    forwardedDate,
    designation,
    subject,
    scanPhotoUrl,
    status: raw.status === 'cancelled' ? 'cancelled' : 'active',
    createdAt: raw.createdAt || new Date().toISOString(),
    updatedAt: raw.updatedAt || raw.createdAt || new Date().toISOString(),
  };
}

export function normalizeDakList(list) {
  if (!Array.isArray(list)) return [];
  return backfillRegisterSr(list.map(normalizeDakEntry).filter(Boolean));
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

/** Context-primary search — subject, marked to, dates. */
export function searchDakEntries(entries, query) {
  const q = String(query ?? '').trim().toLowerCase();
  if (!q) return [...(entries || [])];

  return (entries || []).filter((entry) => {
    const subject = String(entry.subject ?? '').toLowerCase();
    const markedTo = String(entry.designation ?? '').toLowerCase();
    const dispatched = String(entry.forwardedDate ?? '').toLowerCase();
    const received = String(entry.receivedDate ?? '').toLowerCase();
    const sr = String(entry.registerSr ?? '').toLowerCase();

    return (
      subject.includes(q) ||
      markedTo.includes(q) ||
      dispatched.includes(q) ||
      received.includes(q) ||
      sr.includes(q)
    );
  });
}

/** Filter by marked to and/or dispatch date (forwardedDate). */
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

/** Manual register order — Sr# 1 at top, ascending. */
export function sortDakRegisterEntries(entries) {
  return [...(entries || [])].sort((a, b) => {
    const srA = parseRegisterSr(a.registerSr) || Number.MAX_SAFE_INTEGER;
    const srB = parseRegisterSr(b.registerSr) || Number.MAX_SAFE_INTEGER;
    if (srA !== srB) return srA - srB;
    return (a.createdAt || '').localeCompare(b.createdAt || '');
  });
}

function entryTimestamp(entry) {
  return new Date(entry?.updatedAt || entry?.createdAt || 0).getTime();
}

/** Merge two dak rows — keep scan photo URL + register Sr# from either side. */
function mergeDakEntryPair(a, b) {
  if (!a) return b;
  if (!b) return a;
  const newer = entryTimestamp(a) >= entryTimestamp(b) ? a : b;
  const older = newer === a ? b : a;
  const srNewer = parseRegisterSr(newer.registerSr);
  const srOlder = parseRegisterSr(older.registerSr);
  return {
    ...newer,
    scanPhotoUrl: String(newer.scanPhotoUrl || older.scanPhotoUrl || '').trim(),
    registerSr: srNewer > 0 ? srNewer : srOlder,
    externalDispatchNo: newer.externalDispatchNo || older.externalDispatchNo,
    receivedDate: newer.receivedDate || older.receivedDate,
  };
}

/** Union merge by id — prevents cloud sync from wiping scanPhotoUrl / register Sr#. */
export function mergeDakLists(...lists) {
  const byId = new Map();
  for (const list of lists) {
    for (const entry of list || []) {
      if (!entry?.id) continue;
      byId.set(entry.id, mergeDakEntryPair(byId.get(entry.id), entry));
    }
  }
  return normalizeDakList([...byId.values()]);
}

/** Newest dispatch date first — for exports/search that need recency. */
export function sortDakEntries(entries) {
  return [...(entries || [])].sort((a, b) =>
    `${b.forwardedDate}T${b.subject}`.localeCompare(`${a.forwardedDate}T${a.subject}`),
  );
}
