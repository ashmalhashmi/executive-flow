/** Week range helpers for Asia/Karachi (Monday–Sunday). */

export function getTodayISOInTimeZone(timeZone = 'Asia/Karachi', at = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(at);

  const year = parts.find((p) => p.type === 'year')?.value;
  const month = parts.find((p) => p.type === 'month')?.value;
  const day = parts.find((p) => p.type === 'day')?.value;
  return `${year}-${month}-${day}`;
}

/** Monday–Sunday ISO range containing `dateISO` in the given timezone. */
export function getWeekRangeContainingISO(dateISO, timeZone = 'Asia/Karachi') {
  const [y, m, d] = dateISO.split('-').map(Number);
  // Use noon UTC-ish local via formatter weekday
  const probe = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const weekday = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
  }).format(probe);

  const dayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const day = dayMap[weekday] ?? 0;
  const diffToMonday = day === 0 ? -6 : 1 - day;

  const monday = addDaysISO(dateISO, diffToMonday);
  const sunday = addDaysISO(monday, 6);
  return { weekStart: monday, weekEnd: sunday };
}

export function addDaysISO(isoDate, days) {
  const [y, m, d] = isoDate.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(dt.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

export function isSundayInTimeZone(timeZone = 'Asia/Karachi', at = new Date()) {
  const weekday = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
  }).format(at);
  return weekday === 'Sun';
}

export function formatDisplayDateISO(isoDate) {
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
