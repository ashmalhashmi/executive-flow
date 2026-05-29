import { useCallback, useState } from 'react';
import {
  fetchGoogleCalendarEvents,
  getStoredGoogleToken,
  requestGoogleCalendarAccess,
  setStoredGoogleToken,
  GOOGLE_CLIENT_ID,
} from '../utils/googleCalendar';
import { addDaysISO, getTodayISO } from '../utils/dates';

export function useGoogleCalendar({ onImportEvents }) {
  const [connected, setConnected] = useState(() => Boolean(getStoredGoogleToken()));
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState(null);

  const connect = useCallback(async () => {
    setError(null);
    try {
      await requestGoogleCalendarAccess();
      setConnected(true);
      return true;
    } catch (err) {
      setError(err.message);
      setConnected(false);
      return false;
    }
  }, []);

  const disconnect = useCallback(() => {
    setStoredGoogleToken(null);
    setConnected(false);
    setError(null);
  }, []);

  const importNextWeek = useCallback(async () => {
    setError(null);
    setSyncing(true);
    try {
      let token = getStoredGoogleToken();
      if (!token) {
        const ok = await connect();
        if (!ok) return { imported: 0 };
        token = getStoredGoogleToken();
      }

      const today = getTodayISO();
      const weekEnd = addDaysISO(today, 7);
      const timeMin = `${today}T00:00:00`;
      const timeMax = `${weekEnd}T23:59:59`;

      const events = await fetchGoogleCalendarEvents(timeMin, timeMax, token);
      const count = onImportEvents?.(events) ?? 0;
      return { imported: count };
    } catch (err) {
      setError(err.message);
      if (err.message.includes('expired') || err.message.includes('Not connected')) {
        setConnected(false);
      }
      return { imported: 0 };
    } finally {
      setSyncing(false);
    }
  }, [connect, onImportEvents]);

  return {
    connected,
    syncing,
    error,
    canUseApi: Boolean(GOOGLE_CLIENT_ID),
    connect,
    disconnect,
    importNextWeek,
  };
}
