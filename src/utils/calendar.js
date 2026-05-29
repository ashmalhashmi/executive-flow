import { getTodayISO } from './dates';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** YYYY-MM-DD from year, month (1-12), day */
export function toISO(year, month, day) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** Build 6-week calendar grid for a given month */
export function buildMonthGrid(year, monthIndex) {
  const first = new Date(year, monthIndex, 1);
  const last = new Date(year, monthIndex + 1, 0);
  const daysInMonth = last.getDate();
  const startPad = first.getDay();

  const cells = [];

  const prevMonth = monthIndex === 0 ? 11 : monthIndex - 1;
  const prevYear = monthIndex === 0 ? year - 1 : year;
  const prevLast = new Date(prevYear, prevMonth + 1, 0).getDate();

  for (let i = startPad - 1; i >= 0; i--) {
    const day = prevLast - i;
    cells.push({
      iso: toISO(prevYear, prevMonth + 1, day),
      day,
      inMonth: false,
    });
  }

  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({
      iso: toISO(year, monthIndex + 1, d),
      day: d,
      inMonth: true,
    });
  }

  let nextDay = 1;
  const nextMonth = monthIndex === 11 ? 0 : monthIndex + 1;
  const nextYear = monthIndex === 11 ? year + 1 : year;
  while (cells.length < 42) {
    cells.push({
      iso: toISO(nextYear, nextMonth + 1, nextDay),
      day: nextDay,
      inMonth: false,
    });
    nextDay += 1;
  }

  return cells;
}

export function getMonthLabel(year, monthIndex) {
  return new Date(year, monthIndex, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
}

export { WEEKDAYS };

export function isTodayISO(iso) {
  return iso === getTodayISO();
}

/** Parse YYYY-MM-DD to { year, monthIndex, day } */
export function parseISO(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return { year: y, monthIndex: m - 1, day: d };
}
