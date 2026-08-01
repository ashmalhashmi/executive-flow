export function normalizeTaskEntry(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const title = String(raw.title ?? '').trim();
  const date = String(raw.date ?? '').trim();
  const time = String(raw.time ?? '').trim();
  if (!title || !date || !time) return null;
  let status = 'active';
  if (raw.status === 'done') status = 'done';
  else if (raw.status === 'cancelled') status = 'cancelled';
  return {
    id: raw.id || `task-${Date.now()}`,
    title,
    date,
    time,
    status,
    completedAt: status === 'done' ? raw.completedAt || new Date().toISOString() : null,
    createdAt: raw.createdAt || new Date().toISOString(),
    updatedAt: raw.updatedAt || raw.createdAt || new Date().toISOString(),
  };
}

export function normalizeTaskList(list) {
  if (!Array.isArray(list)) return [];
  return list.map(normalizeTaskEntry).filter(Boolean);
}

export function taskStatusLabel(status) {
  if (status === 'done') return 'Done';
  if (status === 'cancelled') return 'Cancelled';
  return 'Pending';
}
