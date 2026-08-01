import { onINP, onLCP } from 'web-vitals';
import { KPI_GOALS, PERFORMANCE_STORAGE_KEY } from '../constants/performanceKpi';

function loadStored() {
  try {
    const raw = localStorage.getItem(PERFORMANCE_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    const { lcp, inp } = parsed;
    return { lcp, inp };
  } catch {
    return {};
  }
}

function saveStored(data) {
  try {
    localStorage.setItem(PERFORMANCE_STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* ignore quota */
  }
  window.dispatchEvent(new CustomEvent('executive-flow:kpi-update', { detail: data }));
}

function rateMetric(key, value) {
  const goal = KPI_GOALS[key];
  if (!goal || value == null || !Number.isFinite(value)) return 'unknown';
  if (value <= goal.target) return 'good';
  if (value <= goal.target * 1.6) return 'needs-improvement';
  return 'poor';
}

function patchMetric(key, value, extra = {}) {
  const stored = loadStored();
  const next = {
    ...stored,
    [key]: {
      value,
      rating: rateMetric(key, value),
      updatedAt: new Date().toISOString(),
      ...extra,
    },
  };
  saveStored(next);
  return next;
}

export function getPerformanceKpiSnapshot() {
  return loadStored();
}

let started = false;

export function initPerformanceKpi() {
  if (started || typeof window === 'undefined') return;
  started = true;

  onLCP((metric) => {
    patchMetric('lcp', Math.round((metric.value / 1000) * 100) / 100, {
      id: metric.id,
      rawMs: metric.value,
    });
  });

  onINP((metric) => {
    patchMetric('inp', Math.round(metric.value), {
      id: metric.id,
    });
  });
}

export function formatKpiValue(key, entry) {
  if (!entry?.value && entry?.value !== 0) return '—';
  if (key === 'lcp') return `${entry.value}s`;
  if (key === 'inp') return `${entry.value}ms`;
  return String(entry.value);
}
