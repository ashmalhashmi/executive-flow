/** Optional Task Log reminder — 15 minutes before the scheduled time. */

import { TASK_REMINDER_LEAD_MS, taskStatus, taskWhen } from './taskEntries';

const FIRED_KEY = 'executive_flow_task_reminders_fired';

function readFired() {
  try {
    const raw = localStorage.getItem(FIRED_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(list) ? list : []);
  } catch {
    return new Set();
  }
}

function writeFired(ids) {
  try {
    localStorage.setItem(FIRED_KEY, JSON.stringify([...ids]));
  } catch {
    /* quota or private mode */
  }
}

export function wasTaskReminderFired(taskId) {
  return readFired().has(taskId);
}

export function markTaskReminderFired(taskId) {
  const fired = readFired();
  fired.add(taskId);
  writeFired(fired);
}

export function clearTaskReminderFired(taskId) {
  const fired = readFired();
  fired.delete(taskId);
  writeFired(fired);
}

export function taskReminderAt(entry) {
  const when = taskWhen(entry);
  if (!when) return null;
  return when.getTime() - TASK_REMINDER_LEAD_MS;
}

export function isTaskReminderEligible(entry, now = Date.now()) {
  if (!entry?.remind) return false;
  if (taskStatus(entry.status) !== 'active') return false;
  const when = taskWhen(entry);
  const reminderAt = taskReminderAt(entry);
  if (!when || reminderAt == null) return false;
  return when.getTime() > now && reminderAt < when.getTime();
}

export function shouldFireTaskReminder(entry, now = Date.now()) {
  if (!isTaskReminderEligible(entry, now)) return false;
  if (wasTaskReminderFired(entry.id)) return false;
  const reminderAt = taskReminderAt(entry);
  return reminderAt != null && now >= reminderAt;
}
