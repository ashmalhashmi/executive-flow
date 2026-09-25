import { useCallback, useState } from 'react';
import {
  connectOutlookCalendar,
  disconnectOutlookCalendar,
  deleteOutlookEvent,
  getActiveOutlookAccount,
  getOutlookMsal,
  isOutlookConfigured,
  isOutlookConnectedSync,
  pushMeetingToOutlook,
} from '../utils/outlookCalendar';

export function useOutlookCalendar() {
  const [connected, setConnected] = useState(() => isOutlookConnectedSync());
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState(null);
  const [lastMessage, setLastMessage] = useState('');

  const refreshConnected = useCallback(async () => {
    if (!isOutlookConfigured()) {
      setConnected(false);
      return false;
    }
    try {
      const msal = await getOutlookMsal();
      const account = getActiveOutlookAccount(msal);
      const ok = Boolean(account);
      setConnected(ok);
      return ok;
    } catch {
      setConnected(isOutlookConnectedSync());
      return isOutlookConnectedSync();
    }
  }, []);

  const connect = useCallback(async () => {
    setError(null);
    setLastMessage('');
    setSyncing(true);
    try {
      await connectOutlookCalendar();
      setConnected(true);
      setLastMessage('Outlook connected — nayi meetings Outlook mein push hongi.');
      return true;
    } catch (err) {
      setError(err?.message || 'Outlook connect fail');
      setConnected(false);
      return false;
    } finally {
      setSyncing(false);
    }
  }, []);

  const disconnect = useCallback(async () => {
    setError(null);
    setLastMessage('');
    setSyncing(true);
    try {
      await disconnectOutlookCalendar();
      setConnected(false);
      setLastMessage('Outlook disconnected.');
    } catch (err) {
      setError(err?.message || 'Disconnect fail');
      setConnected(false);
    } finally {
      setSyncing(false);
    }
  }, []);

  const pushMeeting = useCallback(async (meeting) => {
    if (!isOutlookConfigured()) return null;
    if (!isOutlookConnectedSync() && !connected) return null;

    setError(null);
    setSyncing(true);
    try {
      const result = await pushMeetingToOutlook(meeting);
      setConnected(true);
      setLastMessage(
        result.action === 'updated'
          ? 'Outlook event update ho gaya.'
          : 'Meeting Outlook Calendar mein add ho gayi.',
      );
      return result.eventId;
    } catch (err) {
      const msg = err?.message || 'Outlook push fail';
      setError(msg);
      if (/expired|connect again|login/i.test(msg)) setConnected(false);
      return null;
    } finally {
      setSyncing(false);
    }
  }, [connected]);

  const removeMeetingEvent = useCallback(async (outlookEventId) => {
    const id = String(outlookEventId || '').trim();
    if (!id) return;
    if (!isOutlookConfigured() || (!connected && !isOutlookConnectedSync())) return;

    setError(null);
    try {
      await deleteOutlookEvent(id);
      setLastMessage('Outlook event delete ho gaya.');
    } catch (err) {
      setError(err?.message || 'Outlook delete fail');
    }
  }, [connected]);

  return {
    connected,
    syncing,
    error,
    lastMessage,
    canUseApi: isOutlookConfigured(),
    connect,
    disconnect,
    pushMeeting,
    removeMeetingEvent,
    refreshConnected,
    clearMessage: () => setLastMessage(''),
  };
}
