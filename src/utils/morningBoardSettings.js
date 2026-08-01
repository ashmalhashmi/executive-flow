const STORAGE_KEY = 'executive_flow_morning_board';

export const DEFAULT_MORNING_BOARD = {
  enabled: false,
  email: '',
  timezone: 'Asia/Karachi',
};

export function loadMorningBoardSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_MORNING_BOARD };
    const parsed = JSON.parse(raw);
    return {
      enabled: Boolean(parsed.enabled),
      email: String(parsed.email || '').trim(),
      timezone: String(parsed.timezone || 'Asia/Karachi').trim() || 'Asia/Karachi',
    };
  } catch {
    return { ...DEFAULT_MORNING_BOARD };
  }
}

export function saveMorningBoardSettings(settings) {
  const next = {
    enabled: Boolean(settings.enabled),
    email: String(settings.email || '').trim(),
    timezone: String(settings.timezone || 'Asia/Karachi').trim() || 'Asia/Karachi',
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function isValidMorningBoardEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
}
