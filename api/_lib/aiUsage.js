import { parseAllowedEmails, getUsageClient } from './auth.js';
import {
  addKarachiDays,
  formatKarachiDate,
  formatKarachiDateTime,
  getTodayISOInTimeZone,
  karachiDayBounds,
  karachiMonthBounds,
  karachiMonthEndIso,
} from './karachiDate.js';

export const AI_USAGE_BILLING_URL =
  'https://platform.openai.com/settings/organization/billing';

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

export const MODEL_RATES_PER_MILLION = {
  'gpt-4.1-mini': { input: 0.4, cachedInput: 0.1, output: 1.6 },
  'gpt-4.1': { input: 2, cachedInput: 0.5, output: 8 },
  'gpt-4o-mini': { input: 0.15, cachedInput: 0.075, output: 0.6 },
  'gpt-4o': { input: 2.5, cachedInput: 1.25, output: 10 },
};

const DEFAULT_RATES = MODEL_RATES_PER_MILLION['gpt-4.1-mini'];
const SNAPSHOT_ID = 'openai_reported';

export function featureLabel(feature) {
  return AI_USAGE_FEATURES[feature] || 'Other';
}

export function getModelRates(model) {
  const key = String(model || '').trim().toLowerCase();
  return MODEL_RATES_PER_MILLION[key] || DEFAULT_RATES;
}

function asTokenCount(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n);
}

export function parseOpenAIUsage(data) {
  const usage = data?.usage;
  if (!usage || typeof usage !== 'object') return null;

  const inputTokens = asTokenCount(usage.input_tokens ?? usage.prompt_tokens);
  const outputTokens = asTokenCount(usage.output_tokens ?? usage.completion_tokens);
  if (inputTokens == null && outputTokens == null) return null;

  const cachedRaw =
    usage.input_tokens_details?.cached_tokens ??
    usage.prompt_tokens_details?.cached_tokens ??
    0;
  const cachedInputTokens = asTokenCount(cachedRaw) ?? 0;
  const input = inputTokens ?? 0;

  return {
    inputTokens: input,
    cachedInputTokens: Math.min(cachedInputTokens, input),
    outputTokens: outputTokens ?? 0,
  };
}

export function estimateCostUsd(usage, model) {
  if (!usage) return null;
  const rates = getModelRates(model);
  const cached = Math.min(usage.cachedInputTokens || 0, usage.inputTokens || 0);
  const uncached = Math.max(0, (usage.inputTokens || 0) - cached);
  const output = usage.outputTokens || 0;
  const usd =
    (uncached * rates.input + cached * rates.cachedInput + output * rates.output) /
    1_000_000;
  return Math.round(usd * 1e8) / 1e8;
}

export function parseAdminEmails(
  adminRaw = process.env.ADMIN_EMAILS,
  allowedRaw = process.env.ALLOWED_EMAILS,
) {
  const admin = parseAllowedEmails(adminRaw);
  if (admin.length) return admin;
  return parseAllowedEmails(allowedRaw);
}

export function isUsageAdmin(email, adminEmails = parseAdminEmails()) {
  const value = String(email || '').trim().toLowerCase();
  if (!value) return false;
  if (!adminEmails.length) return true;
  return adminEmails.includes(value);
}

export async function recordAiUsage({
  feature,
  model,
  status,
  usage,
  errorKind,
  userId,
} = {}) {
  try {
    const supabase = getUsageClient();
    if (!supabase) return;

    const tokensKnown = Boolean(usage);
    await supabase.from('ai_usage_events').insert({
      feature: String(feature || 'unknown').slice(0, 64),
      model: String(model || '').slice(0, 80),
      status: status === 'success' ? 'success' : 'failed',
      input_tokens: tokensKnown ? usage.inputTokens : null,
      cached_input_tokens: tokensKnown ? usage.cachedInputTokens : null,
      output_tokens: tokensKnown ? usage.outputTokens : null,
      estimated_cost_usd: tokensKnown ? estimateCostUsd(usage, model) : null,
      tokens_known: tokensKnown,
      error_kind: tokensKnown ? null : String(errorKind || '').slice(0, 40) || null,
      user_id: userId || null,
    });
  } catch {
    // Receipt save must never block the clerk's result.
  }
}

function sumCost(rows) {
  return rows.reduce((total, row) => {
    const n = Number(row.estimated_cost_usd);
    return Number.isFinite(n) ? total + n : total;
  }, 0);
}

function summarize(rows) {
  const failed = rows.filter((row) => row.status === 'failed').length;
  const unknownTokens = rows.filter((row) => !row.tokens_known).length;
  return {
    calls: rows.length,
    failed,
    unknownTokens,
    costUsd: Math.round(sumCost(rows.filter((row) => row.tokens_known)) * 1e8) / 1e8,
  };
}

export function buildFeatureBreakdown(rows) {
  const byFeature = new Map();
  for (const row of rows) {
    const key = row.feature || 'unknown';
    if (!byFeature.has(key)) {
      byFeature.set(key, {
        feature: key,
        label: featureLabel(key),
        calls: 0,
        success: 0,
        failed: 0,
        unknownTokens: 0,
        costUsd: 0,
      });
    }
    const bucket = byFeature.get(key);
    bucket.calls += 1;
    if (row.status === 'success') bucket.success += 1;
    else bucket.failed += 1;
    if (!row.tokens_known) bucket.unknownTokens += 1;
    const cost = Number(row.estimated_cost_usd);
    if (row.tokens_known && Number.isFinite(cost)) bucket.costUsd += cost;
  }

  return [...byFeature.values()]
    .map((row) => ({ ...row, costUsd: Math.round(row.costUsd * 1e8) / 1e8 }))
    .sort((a, b) => b.costUsd - a.costUsd || b.calls - a.calls);
}

function inRange(iso, start, end) {
  const t = new Date(iso).getTime();
  return t >= start.getTime() && t < end.getTime();
}

export function buildUsageLedger({ rows, now = new Date() }) {
  const todayIso = getTodayISOInTimeZone('Asia/Karachi', now);
  const todayBounds = karachiDayBounds(todayIso);
  const month = karachiMonthBounds(now);
  const todayRows = rows.filter((row) => inRange(row.occurred_at, todayBounds.start, todayBounds.end));
  const monthRows = rows.filter((row) => inRange(row.occurred_at, month.start, month.end));

  const monthEndIso = karachiMonthEndIso(now);
  const lastReceiptAt = rows[0]?.occurred_at || null;

  return {
    timezone: 'Asia/Karachi',
    today: {
      iso: todayIso,
      label: formatKarachiDate(todayIso),
      ...summarize(todayRows),
    },
    month: {
      year: month.year,
      month: month.month,
      startIso: month.startIso,
      endIso: monthEndIso,
      rangeLabel: `${formatKarachiDate(month.startIso)} – ${formatKarachiDate(monthEndIso)}`,
      runningRangeLabel: `${formatKarachiDate(month.startIso)} – ${formatKarachiDate(todayIso)}`,
      ...summarize(monthRows),
    },
    lastReceiptAt,
    lastReceiptLabel: lastReceiptAt ? formatKarachiDateTime(lastReceiptAt) : null,
    asOfLabel: formatKarachiDateTime(now),
    breakdown: buildFeatureBreakdown(monthRows),
  };
}

function roundMoney(value, digits = 8) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  const factor = 10 ** digits;
  return Math.round(n * factor) / factor;
}

function sumAmount(rows, key) {
  return rows.reduce((total, row) => {
    const n = Number(row[key]);
    return Number.isFinite(n) ? total + n : total;
  }, 0);
}

export function mapWalletFill(row) {
  if (!row) return null;
  const filledOn = getTodayISOInTimeZone('Asia/Karachi', new Date(row.filled_at));
  const amountPkr = row.amount_pkr == null ? null : Number(row.amount_pkr);
  return {
    id: row.id,
    filledAt: row.filled_at,
    filledOn,
    filledOnLabel: formatKarachiDate(filledOn),
    amountUsd: Number(row.amount_usd),
    amountPkr: Number.isFinite(amountPkr) ? amountPkr : null,
    note: String(row.note || '').trim(),
    source: row.source || 'manual',
  };
}

export function buildWalletDecision({
  fills = [],
  spentAllUsd = 0,
  monthSpentUsd = 0,
  now = new Date(),
} = {}) {
  const todayIso = getTodayISOInTimeZone('Asia/Karachi', now);
  const todayBounds = karachiDayBounds(todayIso);
  const month = karachiMonthBounds(now);
  const todayFills = fills.filter((row) => inRange(row.filled_at, todayBounds.start, todayBounds.end));
  const monthFills = fills.filter((row) => inRange(row.filled_at, month.start, month.end));
  const todayFilledUsd = roundMoney(sumAmount(todayFills, 'amount_usd'), 4);
  const monthFilledUsd = roundMoney(sumAmount(monthFills, 'amount_usd'), 4);
  const allFilledUsd = roundMoney(sumAmount(fills, 'amount_usd'), 4);
  const remainingUsd = roundMoney(allFilledUsd - Number(spentAllUsd || 0), 8);
  const dayOfMonth = Math.max(1, Number(todayIso.slice(8, 10)) || 1);
  const dailyBurnUsd = roundMoney(Number(monthSpentUsd || 0) / dayOfMonth, 8);
  let daysLeft = null;
  if (allFilledUsd > 0 && remainingUsd <= 0) daysLeft = 0;
  else if (dailyBurnUsd > 0 && remainingUsd > 0) daysLeft = Math.floor(remainingUsd / dailyBurnUsd);

  const runwayIso = daysLeft && daysLeft > 0 ? addKarachiDays(todayIso, daysLeft) : null;
  const last = fills[0] ? mapWalletFill(fills[0]) : null;
  const first = fills.length ? mapWalletFill(fills[fills.length - 1]) : null;

  let headline = `No OpenAI API credit fill recorded for ${formatKarachiDate(todayIso)}.`;
  let action = 'If you added prepaid API credit on OpenAI billing, save the date and USD amount below.';
  if (todayFilledUsd > 0) {
    headline = `Today (${formatKarachiDate(todayIso)}) wallet fill: $${todayFilledUsd.toFixed(2)}.`;
    action = remainingUsd > 0
      ? 'Track spend against this fill. Refill before the runway date.'
      : 'Recorded fills are already used — add the next credit fill.';
  } else if (last) {
    headline = `Last wallet fill: $${Number(last.amountUsd).toFixed(2)} on ${last.filledOnLabel}.`;
    action = remainingUsd > 0
      ? 'No fill recorded today. Remaining is from earlier top-ups.'
      : 'Recorded fills are used up — add a new OpenAI API credit fill.';
  }
  if (runwayIso && remainingUsd > 0) {
    action = `At this month’s daily pace, recorded credits last until ${formatKarachiDate(runwayIso)}.`;
  }

  return {
    todayIso,
    todayLabel: formatKarachiDate(todayIso),
    todayFilledUsd,
    todayFillCount: todayFills.length,
    monthFilledUsd,
    monthFillCount: monthFills.length,
    allFilledUsd,
    fillCount: fills.length,
    spentAllUsd: roundMoney(spentAllUsd, 8),
    remainingUsd,
    dailyBurnUsd,
    daysLeft,
    runwayIso,
    runwayLabel: runwayIso ? formatKarachiDate(runwayIso) : null,
    lastFill: last,
    firstFill: first,
    headline,
    action,
  };
}

export async function listWalletFills({ limit = 50 } = {}) {
  try {
    const supabase = getUsageClient();
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('ai_usage_wallet_fills')
      .select('id, filled_at, amount_usd, amount_pkr, note, source')
      .order('filled_at', { ascending: false })
      .limit(Math.min(Number(limit) || 50, 100));
    if (error) {
      const message = error.message || '';
      if (
        /does not exist|schema cache|could not find the table|permission denied|row-level security/i.test(
          message,
        )
      ) {
        return [];
      }
      throw error;
    }
    return data || [];
  } catch {
    return [];
  }
}

export async function insertWalletFill({ filledOn, amountUsd, amountPkr, note, userId } = {}) {
  const day = String(filledOn || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) {
    throw new Error('Fill date (PKT) likhein');
  }
  const usd = Number(amountUsd);
  if (!Number.isFinite(usd) || usd <= 0 || usd > 100000) {
    throw new Error('USD amount sahi likhein');
  }
  let pkr = null;
  if (amountPkr !== '' && amountPkr != null) {
    pkr = Number(amountPkr);
    if (!Number.isFinite(pkr) || pkr < 0 || pkr > 50_000_000) {
      throw new Error('PKR amount sahi likhein');
    }
  }
  const supabase = getUsageClient();
  if (!supabase) throw new Error('Wallet table unavailable');
  const filledAt = new Date(`${day}T12:00:00+05:00`).toISOString();
  const { data, error } = await supabase
    .from('ai_usage_wallet_fills')
    .insert({
      filled_at: filledAt,
      amount_usd: roundMoney(usd, 4),
      amount_pkr: pkr,
      note: String(note || '').trim().slice(0, 200) || null,
      source: 'manual',
      user_id: userId || null,
    })
    .select('id, filled_at, amount_usd, amount_pkr, note, source')
    .single();
  if (error) throw error;
  return data;
}

export async function deleteWalletFill(id) {
  const fillId = String(id || '').trim();
  if (!/^[0-9a-f-]{36}$/i.test(fillId)) {
    throw new Error('Fill id galat hai');
  }
  const supabase = getUsageClient();
  if (!supabase) throw new Error('Wallet table unavailable');
  const { error } = await supabase.from('ai_usage_wallet_fills').delete().eq('id', fillId);
  if (error) throw error;
}

export function mapUsageRow(row) {
  const known = Boolean(row.tokens_known);
  return {
    id: row.id,
    occurredAt: row.occurred_at,
    feature: row.feature,
    featureLabel: featureLabel(row.feature),
    model: row.model || '',
    status: row.status,
    inputTokens: known ? row.input_tokens : null,
    cachedInputTokens: known ? row.cached_input_tokens : null,
    outputTokens: known ? row.output_tokens : null,
    estimatedCostUsd: known ? Number(row.estimated_cost_usd) : null,
    tokensKnown: known,
    errorKind: row.error_kind || null,
  };
}

function sumReportedAmount(payload) {
  const buckets = Array.isArray(payload?.data) ? payload.data : [];
  let total = 0;
  let found = false;
  for (const bucket of buckets) {
    const results = Array.isArray(bucket?.results) ? bucket.results : [];
    for (const item of results) {
      const value = Number(item?.amount?.value);
      if (Number.isFinite(value)) {
        total += value;
        found = true;
      }
    }
  }
  return found ? Math.round(total * 1e6) / 1e6 : null;
}

export async function readReportedSpendSnapshot() {
  try {
    const supabase = getUsageClient();
    if (!supabase) return null;
    const { data } = await supabase
      .from('ai_usage_spend_snapshots')
      .select('reported_usd, period_start, period_end, synced_at, source')
      .eq('id', SNAPSHOT_ID)
      .maybeSingle();
    return data || null;
  } catch {
    return null;
  }
}

export function hasOpenAIAdminKey() {
  return Boolean(process.env.OPENAI_ADMIN_KEY?.trim());
}

export async function syncReportedSpend({ now = new Date() } = {}) {
  const adminKey = process.env.OPENAI_ADMIN_KEY?.trim();
  if (!adminKey) {
    return { configured: false, snapshot: await readReportedSpendSnapshot() };
  }

  const month = karachiMonthBounds(now);
  const startTime = Math.floor(month.start.getTime() / 1000);
  const response = await fetch(
    `https://api.openai.com/v1/organization/costs?start_time=${startTime}&bucket_width=1d`,
    {
      headers: { Authorization: `Bearer ${adminKey}` },
      signal: AbortSignal.timeout(15_000),
    },
  );
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error('OpenAI reported spend sync failed');
  }

  const snapshot = {
    id: SNAPSHOT_ID,
    reported_usd: sumReportedAmount(payload),
    period_start: month.start.toISOString(),
    period_end: month.end.toISOString(),
    synced_at: now.toISOString(),
    source: 'openai_organization_costs',
  };

  const supabase = getUsageClient();
  if (supabase) await supabase.from('ai_usage_spend_snapshots').upsert(snapshot);
  return { configured: true, snapshot };
}

export async function listUsageEvents({ from, to, feature, status, limit = 2000 } = {}) {
  const supabase = getUsageClient();
  if (!supabase) return [];

  let query = supabase
    .from('ai_usage_events')
    .select(
      'id, occurred_at, feature, model, status, input_tokens, cached_input_tokens, output_tokens, estimated_cost_usd, tokens_known, error_kind',
    )
    .order('occurred_at', { ascending: false })
    .limit(Math.min(Number(limit) || 2000, 2000));

  if (from) query = query.gte('occurred_at', from);
  if (to) query = query.lt('occurred_at', to);
  if (feature && AI_USAGE_FEATURES[feature]) query = query.eq('feature', feature);
  if (status === 'success' || status === 'failed') query = query.eq('status', status);

  const { data, error } = await query;
  if (error) {
    const message = error.message || '';
    if (
      /does not exist|schema cache|could not find the table|permission denied|row-level security/i.test(
        message,
      )
    ) {
      return [];
    }
    throw error;
  }
  return data || [];
}
