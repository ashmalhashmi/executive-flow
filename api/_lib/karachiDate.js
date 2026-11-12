/** Today's calendar date in a given IANA timezone (default Asia/Karachi). */
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

export function formatBoardDateLong(isoDate, timeZone = 'Asia/Karachi') {
  const [y, m, d] = isoDate.split('-').map(Number);
  const utcNoon = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  return utcNoon.toLocaleDateString('en-US', {
    timeZone,
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export function addKarachiDays(isoDate, days) {
  const [y, m, d] = String(isoDate || '').split('-').map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d + Number(days || 0)));
  const year = utc.getUTCFullYear();
  const month = String(utc.getUTCMonth() + 1).padStart(2, '0');
  const day = String(utc.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Inclusive PKT day → UTC bounds. Pakistan has no DST (UTC+05:00). */
export function karachiDayBounds(isoDate) {
  const day = String(isoDate || '').slice(0, 10);
  const start = new Date(`${day}T00:00:00+05:00`);
  const end = new Date(`${addKarachiDays(day, 1)}T00:00:00+05:00`);
  return { start, end };
}

export function karachiMonthBounds(at = new Date(), timeZone = 'Asia/Karachi') {
  const today = getTodayISOInTimeZone(timeZone, at);
  const [year, month] = today.split('-');
  const startIso = `${year}-${month}-01`;
  const nextMonth = month === '12'
    ? `${Number(year) + 1}-01-01`
    : `${year}-${String(Number(month) + 1).padStart(2, '0')}-01`;
  return {
    year: Number(year),
    month: Number(month),
    start: new Date(`${startIso}T00:00:00+05:00`),
    end: new Date(`${nextMonth}T00:00:00+05:00`),
    startIso,
  };
}

function asKarachiDate(value) {
  if (value instanceof Date) return value;
  const raw = String(value || '');
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return new Date(`${raw}T12:00:00+05:00`);
  return new Date(raw);
}

export function formatKarachiDate(value, timeZone = 'Asia/Karachi') {
  const date = asKarachiDate(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-GB', {
    timeZone,
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function formatKarachiDateTime(value, timeZone = 'Asia/Karachi') {
  const date = asKarachiDate(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-GB', {
    timeZone,
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

export function karachiMonthEndIso(at = new Date(), timeZone = 'Asia/Karachi') {
  const month = karachiMonthBounds(at, timeZone);
  return getTodayISOInTimeZone(timeZone, new Date(month.end.getTime() - 1));
}
