import { useCallback, useEffect, useRef, useState } from 'react';
import { useExecutive } from '../context/ExecutiveContext';
import { playAlarmSound, unlockAudio } from '../utils/alarmSound';
import {
  isReminderEligible,
  markReminderFired,
  msUntilReminder,
  shouldFireReminderNow,
} from '../utils/reminders';
import { formatDisplayTime } from '../utils/dates';

function showBrowserNotification(meeting) {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') {
    return;
  }
  try {
    const n = new Notification('Meeting in 1 hour · Executive Flow', {
      body: `${meeting.title} at ${formatDisplayTime(meeting.time)}`,
      tag: `reminder-${meeting.id}`,
      requireInteraction: true,
    });
    n.onclick = () => {
      window.focus();
      n.close();
    };
  } catch {
    /* ignore */
  }
}

export function useMeetingReminders() {
  const { meetings } = useExecutive();
  const [activeReminder, setActiveReminder] = useState(null);
  const timersRef = useRef([]);
  const firedSessionRef = useRef(new Set());

  const triggerReminder = useCallback(async (meeting) => {
    if (firedSessionRef.current.has(meeting.id)) return;
    firedSessionRef.current.add(meeting.id);
    markReminderFired(meeting.id);

    await playAlarmSound();
    showBrowserNotification(meeting);
    setActiveReminder(meeting);
  }, []);

  const dismissReminder = useCallback(() => {
    setActiveReminder(null);
  }, []);

  const scheduleAll = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];

    const calendarMeetings = meetings.filter(isReminderEligible);

    calendarMeetings.forEach((meeting) => {
      if (shouldFireReminderNow(meeting)) {
        triggerReminder(meeting);
        return;
      }

      const ms = msUntilReminder(meeting);
      if (ms > 0 && ms < 7 * 24 * 60 * 60 * 1000) {
        const id = setTimeout(() => triggerReminder(meeting), ms);
        timersRef.current.push(id);
      }
    });
  }, [meetings, triggerReminder]);

  useEffect(() => {
    scheduleAll();
    const interval = setInterval(scheduleAll, 30_000);
    return () => {
      clearInterval(interval);
      timersRef.current.forEach(clearTimeout);
    };
  }, [scheduleAll]);

  useEffect(() => {
    if (typeof Notification === 'undefined') return;
    if (Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  useEffect(() => {
    const unlock = () => unlockAudio();
    window.addEventListener('click', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    return () => {
      window.removeEventListener('click', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  const retriggerReminder = useCallback(async (meeting) => {
    firedSessionRef.current.delete(meeting.id);
    await playAlarmSound();
    showBrowserNotification(meeting);
    setActiveReminder(meeting);
    markReminderFired(meeting.id);
  }, []);

  return { activeReminder, dismissReminder, retriggerReminder };
}
