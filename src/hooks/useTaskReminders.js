import { useCallback, useEffect, useRef, useState } from 'react';
import { useTasksExecutive } from '../context/ExecutiveContext';
import { playAlarmSound } from '../utils/alarmSound';
import { formatDisplayTime } from '../utils/dates';
import {
  isTaskReminderEligible,
  markTaskReminderFired,
  shouldFireTaskReminder,
  taskReminderAt,
} from '../utils/taskReminders';

function showBrowserNotification(task) {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  try {
    const n = new Notification('Task in 15 minutes · Executive Flow', {
      body: `${task.title} at ${formatDisplayTime(task.time)}`,
      tag: `task-reminder-${task.id}`,
    });
    n.onclick = () => {
      window.focus();
      n.close();
    };
  } catch {
    /* ignore */
  }
}

export function useTaskReminders() {
  const { taskEntries } = useTasksExecutive();
  const [active, setActive] = useState(null);
  const timersRef = useRef([]);
  const firedSessionRef = useRef(new Set());

  const trigger = useCallback(async (task) => {
    if (firedSessionRef.current.has(task.id)) return;
    firedSessionRef.current.add(task.id);
    markTaskReminderFired(task.id);
    await playAlarmSound();
    showBrowserNotification(task);
    setActive(task);
  }, []);

  const dismiss = useCallback(() => setActive(null), []);

  const scheduleAll = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    const now = Date.now();

    taskEntries.forEach((task) => {
      if (shouldFireTaskReminder(task, now)) {
        trigger(task);
        return;
      }
      if (!isTaskReminderEligible(task, now)) return;
      const ms = (taskReminderAt(task) || 0) - now;
      if (ms > 0 && ms < 7 * 24 * 60 * 60 * 1000) {
        timersRef.current.push(setTimeout(() => trigger(task), ms));
      }
    });
  }, [taskEntries, trigger]);

  useEffect(() => {
    scheduleAll();
    const interval = setInterval(scheduleAll, 30_000);
    return () => {
      clearInterval(interval);
      timersRef.current.forEach(clearTimeout);
    };
  }, [scheduleAll]);

  useEffect(() => {
    if (typeof Notification === 'undefined') return undefined;
    if (Notification.permission !== 'default') return undefined;
    const hasRemind = taskEntries.some((task) => task.remind && task.status === 'active');
    if (!hasRemind) return undefined;
    Notification.requestPermission().catch(() => {});
    return undefined;
  }, [taskEntries]);

  return { active, dismiss };
}
