/** Today's date as YYYY-MM-DD in local timezone */
export function getTodayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Human-readable date, e.g. "May 23, 2026" */
export function formatDisplayDate(isoDate) {
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/** 12-hour time from 24h "HH:mm" */
export function formatDisplayTime(time24) {
  const [h, min] = time24.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${hour12}:${String(min).padStart(2, '0')} ${period}`;
}

/** Add days to an ISO date string (YYYY-MM-DD) */
export function addDaysISO(isoDate, days) {
  const [y, m, d] = isoDate.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  const yy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

/** True if target is between start and end (inclusive), ISO strings */
export function isDateBetween(iso, startISO, endISO) {
  return iso >= startISO && iso <= endISO;
}

/** Current month label, e.g. "May 2026" */
export function getCurrentMonthLabel() {
  return new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

/** Monday–Sunday range for the current calendar week (ISO dates) */
export function getCurrentWeekRangeISO() {
  const now = new Date();
  const day = now.getDay(); // 0 = Sunday
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const toISO = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
  };

  return { weekStart: toISO(monday), weekEnd: toISO(sunday) };
}

/** Weekly summary sirf hafte ke akhir (Sunday) par */
export function isWeeklySummaryEnabled() {
  return new Date().getDay() === 0;
}

export function getNextWeekEndLabel() {
  const day = new Date().getDay();
  if (day === 0) return 'Aaj enabled hai';
  const daysLeft = 7 - day;
  return `Sunday ko enable hogi (${daysLeft} din baad)`;
}

/** Parse ISO date to year/month for filtering */
export function getYearMonth(isoDate) {
  const [y, m] = isoDate.split('-').map(Number);
  return { year: y, month: m };
}

/** Relative label for meeting cards */
export function getRelativeDayLabel(isoDate) {
  const today = getTodayISO();
  if (isoDate === today) return 'Today';

  const t = new Date(today);
  const target = new Date(isoDate);
  const diff = Math.round((target - t) / (1000 * 60 * 60 * 24));

  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  if (diff > 1 && diff <= 7) return `In ${diff} days`;
  return formatDisplayDate(isoDate);
}
