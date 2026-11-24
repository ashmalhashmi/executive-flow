import { getTodayISO } from './dates';

function text(value) {
  return String(value ?? '').trim();
}

function normalizeAction(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const label = text(raw.text);
  if (!label) return null;
  const repetitions = Number(raw.repetitions);
  return {
    id: text(raw.id) || `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    text: label,
    repetitions: Number.isFinite(repetitions) && repetitions > 0 ? Math.floor(repetitions) : 0,
    lastDoneOn: text(raw.lastDoneOn).slice(0, 10),
  };
}

export function normalizeTarget(entry) {
  if (!entry || typeof entry !== 'object') return null;
  const title = text(entry.title);
  const identity = text(entry.identity);
  if (!title && !identity) return null;
  const status = entry.status === 'achieved' ? 'achieved' : 'active';
  return {
    id: text(entry.id) || `tgt-${Date.now()}`,
    createdAt: text(entry.createdAt) || new Date().toISOString(),
    updatedAt: text(entry.updatedAt) || text(entry.createdAt) || new Date().toISOString(),
    title,
    deadline: text(entry.deadline).slice(0, 10),
    identity,
    actions: Array.isArray(entry.actions) ? entry.actions.map(normalizeAction).filter(Boolean) : [],
    status,
    achievedAt: status === 'achieved' ? text(entry.achievedAt) : '',
  };
}

export function normalizeTargetList(list) {
  if (!Array.isArray(list)) return [];
  return list.map(normalizeTarget).filter(Boolean);
}

export function targetDaysLeft(deadline, today = getTodayISO()) {
  const day = text(deadline).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !/^\d{4}-\d{2}-\d{2}$/.test(today)) return null;
  const start = new Date(`${today}T00:00:00`);
  const end = new Date(`${day}T00:00:00`);
  return Math.round((end.getTime() - start.getTime()) / 86400000);
}

export function deadlineLabel(deadline, today = getTodayISO()) {
  const left = targetDaysLeft(deadline, today);
  if (left == null) return 'Deadline set nahi';
  if (left < 0) return `${Math.abs(left)} din overdue`;
  if (left === 0) return 'Aaj deadline hai';
  if (left === 1) return '1 din baqi';
  return `${left} din baqi`;
}
