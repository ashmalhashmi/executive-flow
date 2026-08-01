/** DD-MM-YYYY or DD/MM/YYYY → YYYY-MM-DD (day first, Pakistan / Google Sheet style) */
export function parseDateAsDmy(raw) {
  if (raw == null || raw === '') return '';
  const s = String(raw).trim();
  const dash = s.match(/^(\d{1,2})[-.](\d{1,2})[-.](\d{4})$/);
  if (dash) {
    const dd = Number(dash[1]);
    const mm = Number(dash[2]);
    const yyyy = Number(dash[3]);
    if (dd >= 1 && dd <= 31 && mm >= 1 && mm <= 12) {
      return `${yyyy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
    }
  }
  const slash = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slash) {
    const dd = Number(slash[1]);
    const mm = Number(slash[2]);
    const yyyy = Number(slash[3]);
    if (dd >= 1 && dd <= 31 && mm >= 1 && mm <= 12) {
      return `${yyyy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
    }
  }
  return '';
}

/** MM/DD/YYYY — sirf audit / compare ke liye (galat parse dikhane ke liye) */
export function parseDateAsMdy(raw) {
  if (raw == null || raw === '') return '';
  const s = String(raw).trim();
  const slash = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slash) {
    const mm = Number(slash[1]);
    const dd = Number(slash[2]);
    const yyyy = Number(slash[3]);
    if (dd >= 1 && dd <= 31 && mm >= 1 && mm <= 12) {
      return `${yyyy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
    }
  }
  return '';
}

export function looksLikeDmyCell(raw) {
  const s = String(raw ?? '').trim();
  return /^(\d{1,2})[-./](\d{1,2})[-./](\d{4})$/.test(s);
}

/** Google Sheet / JSON dates → YYYY-MM-DD for calendar matching */
export function normalizeSheetDateIso(raw) {
  if (raw == null || raw === '') return '';
  if (typeof raw === 'object' && raw instanceof Date) {
    const y = raw.getFullYear();
    const m = String(raw.getMonth() + 1).padStart(2, '0');
    const d = String(raw.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  const s = String(raw).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) return s.slice(0, 10);

  const dmyIso = parseDateAsDmy(s);
  if (dmyIso) return dmyIso;

  const parsed = new Date(s);
  if (!Number.isNaN(parsed.getTime()) && !/^[\d.]+$/.test(s)) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const d = String(parsed.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  const serial = Number(s);
  if (Number.isFinite(serial) && serial > 30000 && serial < 100000) {
    const epoch = new Date(Date.UTC(1899, 11, 30));
    epoch.setUTCDate(epoch.getUTCDate() + Math.floor(serial));
    const y = epoch.getUTCFullYear();
    const m = String(epoch.getUTCMonth() + 1).padStart(2, '0');
    const d = String(epoch.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  return s;
}

/** Sheet time values → HH:mm */
export function normalizeSheetTime24(raw) {
  if (raw == null || raw === '') return '09:00';
  if (typeof raw === 'object' && raw instanceof Date) {
    return `${String(raw.getHours()).padStart(2, '0')}:${String(raw.getMinutes()).padStart(2, '0')}`;
  }
  const s = String(raw).trim();
  if (/^\d{1,2}:\d{2}/.test(s)) {
    const [h, m] = s.split(':');
    return `${String(Number(h)).padStart(2, '0')}:${String(m).padStart(2, '0').slice(0, 2)}`;
  }
  if (s.includes('T')) {
    const d = new Date(s);
    if (!Number.isNaN(d.getTime())) {
      return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    }
  }
  return '09:00';
}

export function normalizeMeetingForCalendar(meeting) {
  if (!meeting || typeof meeting !== 'object') return meeting;
  return {
    ...meeting,
    date: normalizeSheetDateIso(meeting.date) || meeting.date || '',
    time: normalizeSheetTime24(meeting.time),
    scheduledViaCalendar: meeting.scheduledViaCalendar !== false,
    status: meeting.status || 'Scheduled',
  };
}

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

/** Build 24h "HH:mm" from 12-hour parts */
export function toTime24(hour12, minute, period) {
  let h = Number(hour12);
  const m = Number(minute);
  if (!Number.isFinite(h) || h < 1 || h > 12) return '';
  if (!Number.isFinite(m) || m < 0 || m > 59) return '';
  if (period === 'AM') {
    if (h === 12) h = 0;
  } else if (period === 'PM') {
    if (h !== 12) h += 12;
  } else {
    return '';
  }
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Split 24h "HH:mm" into 12-hour picker values */
export function fromTime24(time24) {
  const [h, min] = time24.split(':').map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(min)) {
    return { hour: '10', minute: '00', period: 'AM' };
  }
  return {
    hour: String(h % 12 || 12),
    minute: String(min).padStart(2, '0'),
    period: h >= 12 ? 'PM' : 'AM',
  };
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

/** Short weekday + day number, e.g. "Mon 29" */
export function formatShortDayLabel(isoDate) {
  const [y, m, d] = isoDate.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const weekday = date.toLocaleDateString('en-US', { weekday: 'short' });
  return { weekday, day: d, label: `${weekday} ${d}` };
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
