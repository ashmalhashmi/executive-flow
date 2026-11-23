/** Task Log — time-bound work, independent of My Notes. */

export const TASK_REMINDER_LEAD_MS = 15 * 60 * 1000;

export function taskStatus(rawStatus) {
  if (rawStatus === 'trash' || rawStatus === 'cancelled') return 'trash';
  if (rawStatus === 'done') return 'done';
  return 'active';
}

export function taskWhen(entry) {
  const date = String(entry?.date || '');
  const [y, m, d] = date.split('-').map(Number);
  if (!y || !m || !d) return null;
  const [h, min] = String(entry?.time || '00:00').split(':').map(Number);
  return new Date(y, m - 1, d, h || 0, min || 0, 0, 0);
}

export function isTaskOverdue(entry, now = new Date()) {
  if (taskStatus(entry?.status) !== 'active') return false;
  const when = taskWhen(entry);
  if (!when) return false;
  return when.getTime() < now.getTime();
}

export function isTaskToday(entry, todayISO) {
  return taskStatus(entry?.status) !== 'trash' && String(entry?.date || '') === todayISO;
}

export function taskDisplayStatus(entry, now = new Date()) {
  const status = taskStatus(entry?.status);
  if (status === 'trash') return 'Trash';
  if (status === 'done') return 'Done';
  if (isTaskOverdue(entry, now)) return 'Overdue';
  return 'Pending';
}

export function taskStatusLabel(status) {
  if (status === 'done') return 'Done';
  if (status === 'trash' || status === 'cancelled') return 'Trash';
  return 'Pending';
}

export function normalizeTaskEntry(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const title = String(raw.title ?? '').trim();
  const date = String(raw.date ?? '').trim();
  const time = String(raw.time ?? '').trim();
  if (!title || !date || !time) return null;
  const status = taskStatus(raw.status);
  const now = new Date().toISOString();
  return {
    id: raw.id || `task-${Date.now()}`,
    title,
    date,
    time,
    status,
    remind: Boolean(raw.remind),
    completedAt:
      status === 'active' ? null : raw.completedAt || (status === 'done' ? raw.updatedAt || now : null),
    trashedAt: status === 'trash' ? raw.trashedAt || raw.updatedAt || now : null,
    createdAt: raw.createdAt || now,
    updatedAt: raw.updatedAt || raw.createdAt || now,
  };
}

export function normalizeTaskList(list) {
  if (!Array.isArray(list)) return [];
  return list.map(normalizeTaskEntry).filter(Boolean);
}

function sortGroup(entry, now) {
  const status = taskStatus(entry.status);
  if (status === 'trash') return 3;
  if (status === 'done') return 2;
  if (isTaskOverdue(entry, now)) return 0;
  return 1;
}

/** Overdue, then upcoming pending, then done. */
export function sortTaskEntries(list, now = new Date()) {
  return [...(list || [])].sort((a, b) => {
    const group = sortGroup(a, now) - sortGroup(b, now);
    if (group !== 0) return group;
    if (taskStatus(a.status) === 'done' && taskStatus(b.status) === 'done') {
      return (Date.parse(b.completedAt) || 0) - (Date.parse(a.completedAt) || 0);
    }
    const aw = taskWhen(a)?.getTime() || 0;
    const bw = taskWhen(b)?.getTime() || 0;
    return aw - bw;
  });
}

export function taskMatchesQuery(entry, query) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return true;
  return String(entry?.title || '').toLowerCase().includes(q);
}
