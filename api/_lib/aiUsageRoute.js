import { guardPost } from './httpGuard.js';
import {
  AI_USAGE_BILLING_URL,
  AI_USAGE_FEATURES,
  buildFeatureBreakdown,
  buildUsageLedger,
  buildWalletDecision,
  deleteWalletFill,
  hasOpenAIAdminKey,
  insertWalletFill,
  isUsageAdmin,
  listUsageEvents,
  listWalletFills,
  mapUsageRow,
  mapWalletFill,
  parseAdminEmails,
  readReportedSpendSnapshot,
  syncReportedSpend,
} from './aiUsage.js';
import { karachiDayBounds } from './karachiDate.js';
import { getUsdPkrRate, usdToPkr } from './usdPkr.js';

function requestPath(req) {
  return String(req.url || req.headers?.['x-invoke-path'] || '');
}

export function isAiUsageRequest(req) {
  const path = requestPath(req);
  if (path.includes('ai-usage')) return true;
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const action = String(body.action || '');
  return (
    action === 'ai-usage' ||
    action === 'ai-usage-sync' ||
    action === 'ai-usage-wallet-fill' ||
    action === 'ai-usage-wallet-delete'
  );
}

function recordedPkrTotal(rows) {
  if (!rows.length) return null;
  if (rows.some((row) => row.amount_pkr == null || row.amount_pkr === '')) return null;
  const total = rows.reduce((sum, row) => sum + Number(row.amount_pkr), 0);
  return Number.isFinite(total) ? total : null;
}

function walletPayload(fills, spentAllUsd, monthSpentUsd, rate, now) {
  const decision = buildWalletDecision({ fills, spentAllUsd, monthSpentUsd, now });
  const todayRows = fills.filter((row) => mapWalletFill(row)?.filledOn === decision.todayIso);
  return {
    ...decision,
    todayFilledPkr: recordedPkrTotal(todayRows) ?? usdToPkr(decision.todayFilledUsd, rate),
    monthFilledPkr: usdToPkr(decision.monthFilledUsd, rate),
    allFilledPkr: usdToPkr(decision.allFilledUsd, rate),
    remainingPkr: usdToPkr(decision.remainingUsd, rate),
    dailyBurnPkr: usdToPkr(decision.dailyBurnUsd, rate),
    spentAllPkr: usdToPkr(decision.spentAllUsd, rate),
    fills: fills.map(mapWalletFill),
  };
}

function snapshotPayload(snapshot, configured, usdPkrRate) {
  if (!snapshot) {
    return {
      configured,
      reportedUsd: null,
      reportedPkr: null,
      syncedAt: null,
      periodStart: null,
      periodEnd: null,
    };
  }
  const reportedUsd = snapshot.reported_usd == null ? null : Number(snapshot.reported_usd);
  return {
    configured,
    reportedUsd,
    reportedPkr: usdToPkr(reportedUsd, usdPkrRate),
    syncedAt: snapshot.synced_at || null,
    periodStart: snapshot.period_start || null,
    periodEnd: snapshot.period_end || null,
    source: snapshot.source || null,
  };
}

export async function handleAiUsage(req, res) {
  const gate = await guardPost(req, res, { maxBytes: 16_000, bucket: 'ai-usage' });
  if (!gate) return;

  if (!isUsageAdmin(gate.email, parseAdminEmails())) {
    return res.status(403).json({
      error: 'AI Usage ledger is admin-only.',
      code: 'ADMIN_ONLY',
    });
  }

  const action = String(gate.body?.action || 'ai-usage');
  const configured = hasOpenAIAdminKey();

  try {
    if (action === 'ai-usage-sync') {
      try {
        const [result, fx] = await Promise.all([syncReportedSpend(), getUsdPkrRate()]);
        return res.status(200).json({
          ok: true,
          billingUrl: AI_USAGE_BILLING_URL,
          fx: { usdPkrRate: fx.rate, source: fx.source, asOf: fx.asOf || null },
          reportedSpend: snapshotPayload(result.snapshot, result.configured, fx.rate),
        });
      } catch {
        const [snapshot, fx] = await Promise.all([
          readReportedSpendSnapshot(),
          getUsdPkrRate(),
        ]);
        return res.status(200).json({
          ok: true,
          billingUrl: AI_USAGE_BILLING_URL,
          fx: { usdPkrRate: fx.rate, source: fx.source, asOf: fx.asOf || null },
          reportedSpend: {
            ...snapshotPayload(snapshot, configured, fx.rate),
            error: 'Reported spend sync failed',
          },
        });
      }
    }

    if (action === 'ai-usage-wallet-fill') {
      try {
        await insertWalletFill({
          filledOn: gate.body?.filledOn,
          amountUsd: gate.body?.amountUsd,
          amountPkr: gate.body?.amountPkr,
          note: gate.body?.note,
          userId: gate.userId,
        });
        return res.status(200).json({ ok: true });
      } catch (err) {
        return res.status(400).json({ error: err.message || 'Wallet fill save failed' });
      }
    }

    if (action === 'ai-usage-wallet-delete') {
      try {
        await deleteWalletFill(gate.body?.id);
        return res.status(200).json({ ok: true });
      } catch (err) {
        return res.status(400).json({ error: err.message || 'Wallet fill delete failed' });
      }
    }

    const feature = String(gate.body?.feature || '').trim();
    const status = String(gate.body?.status || '').trim();
    const fromDay = String(gate.body?.from || '').trim();
    const toDay = String(gate.body?.to || '').trim();

    let from = '';
    let to = '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(fromDay)) from = karachiDayBounds(fromDay).start.toISOString();
    if (/^\d{4}-\d{2}-\d{2}$/.test(toDay)) to = karachiDayBounds(toDay).end.toISOString();

    const [monthRows, filteredRows, snapshot, fx, fills] = await Promise.all([
      listUsageEvents({ limit: 2000 }),
      listUsageEvents({
        from,
        to,
        feature: AI_USAGE_FEATURES[feature] ? feature : '',
        status,
        limit: 2000,
      }),
      readReportedSpendSnapshot(),
      getUsdPkrRate(),
      listWalletFills(),
    ]);
    const rate = fx.rate;
    const now = new Date();

    const ledger = buildUsageLedger({ rows: monthRows, now });
    const spentAllUsd = monthRows
      .filter((row) => row.tokens_known)
      .reduce((total, row) => {
        const n = Number(row.estimated_cost_usd);
        return Number.isFinite(n) ? total + n : total;
      }, 0);
    const recent = filteredRows.slice(0, 100).map((row) => {
      const mapped = mapUsageRow(row);
      return {
        ...mapped,
        estimatedCostPkr: usdToPkr(mapped.estimatedCostUsd, rate),
      };
    });
    const breakdownSource = from || to || feature || status
      ? buildFeatureBreakdown(filteredRows)
      : ledger.breakdown;

    return res.status(200).json({
      ok: true,
      timezone: ledger.timezone,
      asOfLabel: ledger.asOfLabel,
      lastReceiptAt: ledger.lastReceiptAt,
      lastReceiptLabel: ledger.lastReceiptLabel,
      fx: { usdPkrRate: rate, source: fx.source, asOf: fx.asOf || null },
      today: {
        ...ledger.today,
        costPkr: usdToPkr(ledger.today.costUsd, rate),
      },
      month: {
        ...ledger.month,
        costPkr: usdToPkr(ledger.month.costUsd, rate),
      },
      wallet: walletPayload(fills, spentAllUsd, ledger.month.costUsd, rate, now),
      breakdown: breakdownSource.map((row) => ({
        ...row,
        costPkr: usdToPkr(row.costUsd, rate),
      })),
      features: AI_USAGE_FEATURES,
      rows: recent,
      rowCount: filteredRows.length,
      billingUrl: AI_USAGE_BILLING_URL,
      reportedSpend: snapshotPayload(snapshot, configured, rate),
    });
  } catch {
    return res.status(500).json({ error: 'Usage ledger load failed' });
  }
}
