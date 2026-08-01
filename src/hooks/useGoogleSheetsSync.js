import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  buildSheetsPayload,
  pushToGoogleSheets,
  sheetsConfigured,
  sheetsSyncEnabled,
} from '../utils/googleSheetsSync';
import { cancelIdle, runWhenIdle } from '../utils/runWhenIdle';

const SYNC_DEBOUNCE_MS = 8000;
/** Boot ke baad sheet sync — first paint ko block na kare */
const SYNC_BOOT_DELAY_MS = 20_000;

export function useGoogleSheetsSync({ getAppSnapshot, dataRevision = 0, enabled = true }) {
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');
  const [lastSyncedAt, setLastSyncedAt] = useState(null);
  const debounceRef = useRef(null);
  const idleRef = useRef(null);
  const syncingRef = useRef(false);
  const mountedRef = useRef(true);
  const snapshotRef = useRef(getAppSnapshot);
  const [syncBootReady, setSyncBootReady] = useState(false);

  snapshotRef.current = getAppSnapshot;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (idleRef.current) cancelIdle(idleRef.current);
    };
  }, []);

  useEffect(() => {
    const id = setTimeout(() => setSyncBootReady(true), SYNC_BOOT_DELAY_MS);
    return () => clearTimeout(id);
  }, []);

  const runSync = useCallback(async () => {
    if (!sheetsConfigured || !enabled || syncingRef.current) {
      return { ok: false, skipped: true };
    }

    syncingRef.current = true;
    if (mountedRef.current) {
      setStatus('syncing');
      setMessage('Google Sheet update ho rahi hai…');
    }

    try {
      const snapshot = snapshotRef.current?.();
      const payload = buildSheetsPayload({
        meetings: snapshot?.data?.meetings ?? [],
        souvenirs: snapshot?.data?.souvenirs ?? [],
        expenditureState: snapshot?.data?.expenditure ?? {
          openingBalance: 0,
          openingBalanceDate: '',
          expenditures: [],
        },
        orders: snapshot?.data?.orders ?? [],
        dakEntries: snapshot?.data?.dak ?? [],
        taskEntries: snapshot?.data?.tasks ?? [],
        contacts: snapshot?.data?.contacts ?? [],
      });
      await pushToGoogleSheets(payload);
      if (!mountedRef.current) return { ok: true };
      setLastSyncedAt(new Date().toISOString());
      setStatus('idle');
      setMessage('Google Sheet updated');
      return { ok: true };
    } catch (err) {
      if (!mountedRef.current) return { ok: false };
      setStatus('error');
      setMessage(err.message || 'Sheet sync error');
      return { ok: false, error: err.message };
    } finally {
      syncingRef.current = false;
    }
  }, [enabled]);

  useEffect(() => {
    if (!syncBootReady || !sheetsConfigured || !enabled || !sheetsSyncEnabled) {
      return undefined;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (idleRef.current) cancelIdle(idleRef.current);
      idleRef.current = runWhenIdle(() => {
        idleRef.current = null;
        runSync();
      });
    }, SYNC_DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [syncBootReady, dataRevision, enabled, runSync]);

  return useMemo(
    () => ({
      sheetsConfigured,
      sheetsSyncEnabled,
      status,
      message,
      lastSyncedAt,
      syncNow: runSync,
    }),
    [status, message, lastSyncedAt, runSync],
  );
}
