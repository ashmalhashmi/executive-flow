import { useCallback, useState } from 'react';
import { ReminderContext } from '../../context/ReminderContext';
import { useMeetingReminders } from '../../hooks/useMeetingReminders';
import { playAlarmSound, unlockAudio } from '../../utils/alarmSound';
import { clearReminderFired } from '../../utils/reminders';
import { formatDisplayTime } from '../../utils/dates';
import ReminderAlert from './ReminderAlert';

function showBrowserNotification(meeting) {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') {
    return;
  }
  try {
    const n = new Notification('Meeting in 1 hour · Executive Flow', {
      body: `${meeting.title} at ${formatDisplayTime(meeting.time)}`,
      tag: `reminder-test-${meeting.id}`,
    });
    n.onclick = () => {
      window.focus();
      n.close();
    };
  } catch {
    /* ignore */
  }
}

/** App-wide 1hr calendar reminders — mount inside ExecutiveProvider */
export default function ReminderHost({ children }) {
  const { activeReminder, dismissReminder, retriggerReminder } = useMeetingReminders();
  const [testMeeting, setTestMeeting] = useState(null);

  const dismissAll = useCallback(() => {
    dismissReminder();
    setTestMeeting(null);
  }, [dismissReminder]);

  /** Test alarm — fired mark nahi hota, asli 1hr reminder baad mein chalega */
  const testAlarmNow = useCallback(async (meeting) => {
    unlockAudio();
    await playAlarmSound();
    showBrowserNotification(meeting);
    setTestMeeting(meeting);
  }, []);

  /** Asli reminder dubara trigger (fired reset) */
  const resetAndRetrigger = useCallback(
    async (meeting) => {
      clearReminderFired(meeting.id);
      setTestMeeting(null);
      await retriggerReminder(meeting);
    },
    [retriggerReminder],
  );

  const showing = activeReminder || testMeeting;

  return (
    <ReminderContext.Provider value={{ testAlarmNow, resetAndRetrigger }}>
      {children}
      {showing && (
        <ReminderAlert meeting={activeReminder || testMeeting} onDismiss={dismissAll} />
      )}
    </ReminderContext.Provider>
  );
}
