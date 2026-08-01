const STORAGE_KEY = 'executive_flow_weekly_expenditure_email';

export const DEFAULT_WEEKLY_EXPENDITURE_EMAIL = {
  enabled: false,
  email: '',
  timezone: 'Asia/Karachi',
};

export function loadWeeklyExpenditureEmailSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_WEEKLY_EXPENDITURE_EMAIL };
    const parsed = JSON.parse(raw);
    return {
      enabled: Boolean(parsed.enabled),
      email: String(parsed.email || '').trim(),
      timezone: String(parsed.timezone || 'Asia/Karachi').trim() || 'Asia/Karachi',
    };
  } catch {
    return { ...DEFAULT_WEEKLY_EXPENDITURE_EMAIL };
  }
}

export function saveWeeklyExpenditureEmailSettings(settings) {
  const next = {
    enabled: Boolean(settings.enabled),
    email: String(settings.email || '').trim(),
    timezone: String(settings.timezone || 'Asia/Karachi').trim() || 'Asia/Karachi',
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
}
