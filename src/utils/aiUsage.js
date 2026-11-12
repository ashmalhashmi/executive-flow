import { authorizedJsonHeaders, errorIfUnauthenticated, LOGIN_REQUIRED } from './apiAuth';

export const AI_USAGE_FEATURES = {
  compose_draft: 'Compose Draft',
  compose_improve: 'Compose Improve',
  reference_extraction: 'Reference Extraction',
  dak_scan: 'Dak Scan',
  contact_extraction: 'Contact Extraction',
  contact_categorization: 'Contact Categorization',
  expenditure_categorization: 'Expenditure Categorization',
  petty_cash_invoice: 'Petty Cash Invoice',
  receiving_note: 'Receiving Note',
  muhasaba: 'Muhasaba',
};

export const OPENAI_BILLING_URL =
  'https://platform.openai.com/settings/organization/billing';

export function formatUsd(value) {
  if (value == null || !Number.isFinite(Number(value))) return 'Unknown';
  const n = Number(value);
  if (n === 0) return '$0.00';
  if (Math.abs(n) < 0.01) return `$${n.toFixed(6)}`;
  return `$${n.toFixed(4)}`;
}

export function formatPkr(value) {
  if (value == null || !Number.isFinite(Number(value))) return 'Unknown';
  const n = Number(value);
  if (n === 0) return 'Rs. 0';
  if (Math.abs(n) < 1) {
    return `Rs. ${n.toFixed(4).replace(/0+$/, '').replace(/\.$/, '')}`;
  }
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

export function formatUsdWallet(value) {
  if (value == null || !Number.isFinite(Number(value))) return 'Unknown';
  const n = Number(value);
  if (n === 0) return '$0.00';
  if (Math.abs(n) >= 0.01) return `$${n.toFixed(2)}`;
  return formatUsd(n);
}

export function fxRateHint(fx) {
  const rate = Number(fx?.usdPkrRate);
  if (!Number.isFinite(rate) || rate <= 0) return '';
  const source =
    fx.source === 'live' ? 'live rate' : fx.source === 'env' ? 'set rate' : 'approx rate';
  const asOf = fx.asOf ? ` as of ${formatKarachiDate(fx.asOf)}` : '';
  return `PKR ≈ USD × ${rate.toLocaleString('en-PK', { maximumFractionDigits: 2 })} (${source}${asOf}). OpenAI bills in USD.`;
}

export function formatTokenCount(value, known = true) {
  if (!known || value == null || !Number.isFinite(Number(value))) return 'Unknown';
  return Number(value).toLocaleString('en-US');
}

export function formatKarachiDate(value) {
  if (value == null || value === '') return 'Unknown';
  const raw = String(value);
  const date = /^\d{4}-\d{2}-\d{2}$/.test(raw)
    ? new Date(`${raw}T12:00:00+05:00`)
    : new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Karachi',
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function formatKarachiStamp(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Karachi',
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

export function karachiTodayIso() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Karachi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

async function postUsage(body) {
  const { headers, token } = await authorizedJsonHeaders();
  if (!token) {
    const err = new Error(LOGIN_REQUIRED);
    err.code = 'LOGIN_REQUIRED';
    throw err;
  }
  const res = await fetch('/api/ai-usage', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  const authError = errorIfUnauthenticated(res, data);
  if (authError) throw authError;
  if (!res.ok) {
    const err = new Error(data.error || 'Usage ledger load failed');
    err.code = data.code || 'LEDGER_FAILED';
    throw err;
  }
  return data;
}

export function fetchAiUsageLedger(filters) {
  return postUsage({ action: 'ai-usage', ...filters });
}

export function syncReportedSpend() {
  return postUsage({ action: 'ai-usage-sync' });
}

export function saveWalletFill(payload) {
  return postUsage({ action: 'ai-usage-wallet-fill', ...payload });
}

export function removeWalletFill(id) {
  return postUsage({ action: 'ai-usage-wallet-delete', id });
}
