/** Remind 1 hour before meeting */
export const REMINDER_MS_BEFORE = 60 * 60 * 1000;

const FIRED_KEY = 'executive_flow_reminders_fired';

export function getMeetingDateTime(meeting) {
  const [y, m, d] = meeting.date.split('-').map(Number);
  const [h, min] = (meeting.time || '09:00').split(':').map(Number);
  return new Date(y, m - 1, d, h, min, 0, 0);
}

export function getReminderTimestamp(meeting) {
  return getMeetingDateTime(meeting).getTime() - REMINDER_MS_BEFORE;
}

export function loadFiredReminderIds() {
  try {
    const raw = localStorage.getItem(FIRED_KEY);
    if (raw) return new Set(JSON.parse(raw));
  } catch {
    /* ignore */
  }
  return new Set();
}

export function markReminderFired(meetingId) {
  const fired = loadFiredReminderIds();
  fired.add(meetingId);
  localStorage.setItem(FIRED_KEY, JSON.stringify([...fired]));
}

export function wasReminderFired(meetingId) {
  return loadFiredReminderIds().has(meetingId);
}

/** Test dubara karne ke liye (localStorage se hata dein) */
export function clearReminderFired(meetingId) {
  const fired = loadFiredReminderIds();
  fired.delete(meetingId);
  localStorage.setItem(FIRED_KEY, JSON.stringify([...fired]));
}

/** Calendar appointments eligible for reminders */
export function isReminderEligible(meeting) {
  if (meeting.scheduledViaCalendar !== true) return false;
  if (meeting.status === 'Completed') return false;
  const meetingAt = getMeetingDateTime(meeting).getTime();
  return meetingAt > Date.now();
}

export function shouldFireReminderNow(meeting) {
  if (!isReminderEligible(meeting)) return false;
  if (wasReminderFired(meeting.id)) return false;
  const now = Date.now();
  const reminderAt = getReminderTimestamp(meeting);
  const meetingAt = getMeetingDateTime(meeting).getTime();
  return now >= reminderAt && now < meetingAt;
}

export function msUntilReminder(meeting) {
  return getReminderTimestamp(meeting) - Date.now();
}
