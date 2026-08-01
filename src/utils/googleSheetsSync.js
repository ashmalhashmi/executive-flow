import { buildAppSnapshot } from './backup';

export const sheetViewUrl = import.meta.env.VITE_GOOGLE_SHEET_VIEW_URL || '';

/** Auto-push runs when webhook or server API route is configured. */
export const sheetsSyncEnabled = Boolean(
  import.meta.env.VITE_GOOGLE_SHEETS_WEBHOOK_URL ||
    import.meta.env.VITE_GOOGLE_SHEETS_USE_API === '1',
);

/** UI features (status + magnified viewer). */
export const sheetsConfigured = sheetsSyncEnabled || Boolean(sheetViewUrl);

export function getSheetEmbedUrl(viewUrl) {
  if (!viewUrl) return '';
  const match = viewUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (!match) return viewUrl;
  return `https://docs.google.com/spreadsheets/d/${match[1]}/htmlembed?widget=true&headers=false`;
}

/** Stable fingerprint so identical data does not re-mirror the sheet. */
export function sheetsPayloadFingerprint(snapshotData) {
  return JSON.stringify(snapshotData ?? {});
}

export function buildSheetsPayload({
  meetings,
  souvenirs,
  expenditureState,
  orders,
  dakEntries,
  taskEntries,
  contacts,
}) {
  const snapshot = buildAppSnapshot({
    meetings,
    souvenirs,
    expenditureState,
    orders,
    dakEntries,
    taskEntries,
    contacts,
  });
  return {
    ...snapshot,
    syncMode: 'mirror',
    syncedAt: new Date().toISOString(),
    source: 'executive-flow',
  };
}

export async function pushToGoogleSheets(payload) {
  const webhook = import.meta.env.VITE_GOOGLE_SHEETS_WEBHOOK_URL;

  if (webhook) {
    const res = await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
    });
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { ok: res.ok, raw: text };
    }
    if (!res.ok || data.ok === false) {
      throw new Error(data.error || 'Google Sheet sync failed');
    }
    return { ok: true, via: 'webhook', ...data };
  }

  const res = await fetch('/api/sheets-sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Google Sheet sync failed');
  }
  return { ok: true, via: 'api', ...data };
}
