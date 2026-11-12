import { useCallback, useEffect, useState } from 'react';
import { Receipt, RefreshCw, ExternalLink, ShieldAlert, Wallet, CalendarDays } from 'lucide-react';
import GlassCard from '../components/ui/GlassCard';
import FormField, { TextInput } from '../components/ui/FormField';
import { useCloudSyncContext } from '../context/CloudSyncContext';
import {
  AI_USAGE_FEATURES,
  OPENAI_BILLING_URL,
  fetchAiUsageLedger,
  formatKarachiDate,
  formatKarachiStamp,
  formatPkr,
  formatTokenCount,
  formatUsd,
  formatUsdWallet,
  fxRateHint,
  karachiTodayIso,
  removeWalletFill,
  saveWalletFill,
  syncReportedSpend,
} from '../utils/aiUsage';

const emptyFilters = () => ({
  from: '',
  to: '',
  feature: '',
  status: '',
});

function MetricCard({ label, value, subValue, hint }) {
  return (
    <GlassCard className="p-4">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-white">{value}</p>
      {subValue ? <p className="mt-0.5 text-sm text-zinc-300">{subValue}</p> : null}
      {hint ? <p className="mt-1 text-xs text-zinc-500">{hint}</p> : null}
    </GlassCard>
  );
}

function MoneyCell({ usd, pkr, known = true }) {
  if (!known) return 'Unknown';
  return (
    <span className="block">
      <span className="block">{formatUsd(usd)}</span>
      <span className="block text-xs text-zinc-500">{formatPkr(pkr)}</span>
    </span>
  );
}

function tokenCell(value, known) {
  return known ? formatTokenCount(value, true) : 'Unknown';
}

export default function AiUsageSpend() {
  const cloud = useCloudSyncContext();
  const [filters, setFilters] = useState(emptyFilters);
  const [ledger, setLedger] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [savingFill, setSavingFill] = useState(false);
  const [error, setError] = useState('');
  const [fillForm, setFillForm] = useState(() => ({
    filledOn: karachiTodayIso(),
    amountUsd: '',
    amountPkr: '',
    note: '',
  }));

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchAiUsageLedger(filters);
      setLedger(data);
    } catch (err) {
      setLedger(null);
      setError(err.message || 'Ledger load failed');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    if (!cloud?.user) {
      setLoading(false);
      return undefined;
    }
    load();
    return undefined;
  }, [cloud?.user, load]);

  async function onSaveFill(e) {
    e.preventDefault();
    setSavingFill(true);
    setError('');
    try {
      await saveWalletFill(fillForm);
      setFillForm((prev) => ({ ...prev, amountUsd: '', amountPkr: '', note: '' }));
      await load();
    } catch (err) {
      setError(err.message || 'Wallet fill save failed');
    } finally {
      setSavingFill(false);
    }
  }

  async function onDeleteFill(id) {
    if (!id) return;
    setSavingFill(true);
    setError('');
    try {
      await removeWalletFill(id);
      await load();
    } catch (err) {
      setError(err.message || 'Wallet fill delete failed');
    } finally {
      setSavingFill(false);
    }
  }

  async function onSyncReported() {
    setSyncing(true);
    setError('');
    try {
      const data = await syncReportedSpend();
      setLedger((prev) => (prev ? { ...prev, reportedSpend: data.reportedSpend } : prev));
    } catch (err) {
      setError(err.message || 'Reported spend sync failed');
    } finally {
      setSyncing(false);
    }
  }

  if (!cloud?.user) {
    return (
      <GlassCard className="p-8 text-center">
        <ShieldAlert className="mx-auto h-8 w-8 text-amber-300" />
        <h3 className="mt-3 text-lg font-semibold text-white">Admin ledger</h3>
        <p className="mt-2 text-sm text-zinc-400">
          Sign in on Sync & Backup to open AI Usage & Spend. Dashboard refresh does not call OpenAI.
        </p>
      </GlassCard>
    );
  }

  if (error && error.includes('admin-only')) {
    return (
      <GlassCard className="p-8 text-center">
        <ShieldAlert className="mx-auto h-8 w-8 text-rose-300" />
        <h3 className="mt-3 text-lg font-semibold text-white">Admin only</h3>
        <p className="mt-2 text-sm text-zinc-400">This ledger is limited to authorized managers.</p>
      </GlassCard>
    );
  }

  const today = ledger?.today;
  const month = ledger?.month;
  const wallet = ledger?.wallet;
  const reported = ledger?.reportedSpend;
  const billingUrl = ledger?.billingUrl || OPENAI_BILLING_URL;
  const todayLabel = today?.label || formatKarachiDate(karachiTodayIso());
  const monthRange = month?.runningRangeLabel || todayLabel;

  return (
    <div className="space-y-6">
      <GlassCard className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-indigo-400/90">
              Private ledger · Pakistan time
            </p>
            <h3 className="mt-1 flex items-center gap-2 text-lg font-semibold text-white">
              <Receipt className="h-5 w-5 text-indigo-300" />
              AI Usage & Spend
            </h3>
            <p className="mt-2 flex items-center gap-1.5 text-sm text-zinc-300">
              <CalendarDays className="h-4 w-4 text-indigo-300" />
              As of {ledger?.asOfLabel || formatKarachiStamp(new Date())} PKT
            </p>
            <p className="mt-2 max-w-2xl text-sm text-zinc-400">
              Track OpenAI API credit fills vs estimated spend (USD + PKR). Record each prepaid
              top-up with its date — OpenAI does not send wallet-fill receipts to this app. Exact
              remaining credit on OpenAI is only on the billing dashboard.
            </p>
            {fxRateHint(ledger?.fx) ? (
              <p className="mt-2 max-w-2xl text-xs text-zinc-500">{fxRateHint(ledger?.fx)}</p>
            ) : null}
            {ledger?.lastReceiptLabel ? (
              <p className="mt-1 max-w-2xl text-xs text-zinc-500">
                Last API call receipt: {ledger.lastReceiptLabel} PKT
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-200 hover:bg-white/10 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh ledger
          </button>
        </div>
      </GlassCard>

      {error ? (
        <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Today spend"
          value={formatUsd(today?.costUsd)}
          subValue={formatPkr(today?.costPkr)}
          hint={`${today?.calls || 0} calls · ${todayLabel}`}
        />
        <MetricCard
          label="Today wallet fill"
          value={formatUsdWallet(wallet?.todayFilledUsd)}
          subValue={formatPkr(wallet?.todayFilledPkr)}
          hint={
            wallet?.todayFillCount
              ? `${wallet.todayFillCount} fill${wallet.todayFillCount === 1 ? '' : 's'} · ${todayLabel}`
              : `No fill recorded · ${todayLabel}`
          }
        />
        <MetricCard
          label="This month spend"
          value={formatUsd(month?.costUsd)}
          subValue={formatPkr(month?.costPkr)}
          hint={`${month?.calls || 0} calls · ${monthRange}`}
        />
        <MetricCard
          label="Recorded credits left"
          value={formatUsdWallet(wallet?.remainingUsd)}
          subValue={formatPkr(wallet?.remainingPkr)}
          hint={
            wallet?.firstFill
              ? `Fills since ${wallet.firstFill.filledOnLabel} minus API spend`
              : `No fills recorded yet · as of ${todayLabel}`
          }
        />
      </div>

      <GlassCard className="p-5">
        <h4 className="flex items-center gap-2 text-sm font-semibold text-white">
          <Wallet className="h-4 w-4 text-indigo-300" />
          Expense decision
        </h4>
        <p className="mt-1 text-xs text-zinc-500">
          Dates are Pakistan calendar days. Daily pace uses this month’s spend ÷ day of month (
          {todayLabel}).
        </p>
        <p className="mt-3 text-sm text-zinc-200">{wallet?.headline || `Checking fills for ${todayLabel}…`}</p>
        <p className="mt-1 text-sm text-zinc-400">{wallet?.action || ''}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3 text-sm">
          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <p className="text-[11px] uppercase tracking-wider text-zinc-500">Month fill vs spend</p>
            <p className="mt-1 text-white">
              {formatUsdWallet(wallet?.monthFilledUsd)} in · {formatUsd(month?.costUsd)} out
            </p>
            <p className="mt-0.5 text-xs text-zinc-500">{month?.rangeLabel || monthRange}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <p className="text-[11px] uppercase tracking-wider text-zinc-500">Daily pace this month</p>
            <p className="mt-1 text-white">{formatUsd(wallet?.dailyBurnUsd)}</p>
            <p className="mt-0.5 text-xs text-zinc-500">{formatPkr(wallet?.dailyBurnPkr)} / day</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <p className="text-[11px] uppercase tracking-wider text-zinc-500">Refill runway</p>
            <p className="mt-1 text-white">
              {wallet?.runwayLabel
                ? wallet.runwayLabel
                : wallet?.daysLeft === 0
                  ? 'Refill now'
                  : 'Need a fill date first'}
            </p>
            <p className="mt-0.5 text-xs text-zinc-500">
              {wallet?.daysLeft != null
                ? `${wallet.daysLeft} day${wallet.daysLeft === 1 ? '' : 's'} of recorded credit`
                : `As of ${todayLabel}`}
            </p>
          </div>
        </div>
      </GlassCard>

      <GlassCard className="p-5">
        <h4 className="text-sm font-semibold text-white">Record OpenAI API wallet fill</h4>
        <p className="mt-1 text-xs text-zinc-500">
          Jab OpenAI billing pe prepaid credit add karo, yahan <strong>date</strong> aur USD likho.
          Optional PKR = jo card/bank se actually pay hua.
        </p>
        <form onSubmit={onSaveFill} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <FormField label="Fill date (PKT)" id="wallet-fill-on">
            <TextInput
              id="wallet-fill-on"
              type="date"
              required
              value={fillForm.filledOn}
              onChange={(e) => setFillForm((prev) => ({ ...prev, filledOn: e.target.value }))}
            />
          </FormField>
          <FormField label="Amount (USD)" id="wallet-fill-usd">
            <TextInput
              id="wallet-fill-usd"
              type="number"
              min="0.01"
              step="0.01"
              required
              placeholder="e.g. 5.00"
              value={fillForm.amountUsd}
              onChange={(e) => setFillForm((prev) => ({ ...prev, amountUsd: e.target.value }))}
            />
          </FormField>
          <FormField label="Amount (PKR, optional)" id="wallet-fill-pkr">
            <TextInput
              id="wallet-fill-pkr"
              type="number"
              min="0"
              step="0.01"
              placeholder="e.g. 1400"
              value={fillForm.amountPkr}
              onChange={(e) => setFillForm((prev) => ({ ...prev, amountPkr: e.target.value }))}
            />
          </FormField>
          <FormField label="Note (optional)" id="wallet-fill-note">
            <TextInput
              id="wallet-fill-note"
              placeholder="OpenAI prepaid credits"
              value={fillForm.note}
              onChange={(e) => setFillForm((prev) => ({ ...prev, note: e.target.value }))}
            />
          </FormField>
          <div className="sm:col-span-2 lg:col-span-4">
            <button
              type="submit"
              disabled={savingFill || loading}
              className="rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-4 py-2.5 text-sm text-indigo-100 hover:bg-indigo-500/20 disabled:opacity-50"
            >
              {savingFill ? 'Saving…' : 'Save fill'}
            </button>
          </div>
        </form>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-[11px] uppercase tracking-wider text-zinc-500">
              <tr>
                <th className="pb-2 pr-3">Fill date (PKT)</th>
                <th className="pb-2 pr-3">USD</th>
                <th className="pb-2 pr-3">PKR</th>
                <th className="pb-2 pr-3">Note</th>
                <th className="pb-2"> </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-zinc-300">
              {(wallet?.fills || []).length ? (
                wallet.fills.map((row) => (
                  <tr key={row.id}>
                    <td className="whitespace-nowrap py-2 pr-3">{row.filledOnLabel}</td>
                    <td className="py-2 pr-3">{formatUsdWallet(row.amountUsd)}</td>
                    <td className="py-2 pr-3">
                      {row.amountPkr == null ? '—' : formatPkr(row.amountPkr)}
                    </td>
                    <td className="py-2 pr-3">{row.note || '—'}</td>
                    <td className="py-2">
                      <button
                        type="button"
                        disabled={savingFill}
                        onClick={() => onDeleteFill(row.id)}
                        className="text-xs text-rose-300 hover:text-rose-200 disabled:opacity-50"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-zinc-500">
                    {loading ? 'Loading fills…' : `No wallet fills yet — start with ${todayLabel}.`}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>

      <GlassCard className="p-5">
        <h4 className="text-sm font-semibold text-white">Feature breakdown</h4>
        <p className="mt-1 text-xs text-zinc-500">
          {month?.rangeLabel || monthRange} totals unless date / feature / status filters are set.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-[11px] uppercase tracking-wider text-zinc-500">
              <tr>
                <th className="pb-2 pr-4">Feature</th>
                <th className="pb-2 pr-4">Calls</th>
                <th className="pb-2 pr-4">Success</th>
                <th className="pb-2 pr-4">Failed</th>
                <th className="pb-2">Est. USD / PKR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-zinc-300">
              {(ledger?.breakdown || []).length ? (
                ledger.breakdown.map((row) => (
                  <tr key={row.feature}>
                    <td className="py-2 pr-4 text-white">{row.label}</td>
                    <td className="py-2 pr-4">{row.calls}</td>
                    <td className="py-2 pr-4">{row.success}</td>
                    <td className="py-2 pr-4">{row.failed}</td>
                    <td className="py-2">
                      <MoneyCell usd={row.costUsd} pkr={row.costPkr} />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-zinc-500">
                    {loading ? 'Loading receipts…' : 'No receipts in this range yet.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>

      <GlassCard className="p-5">
        <h4 className="text-sm font-semibold text-white">Filter receipts</h4>
        <p className="mt-1 text-xs text-zinc-500">
          Empty dates = full ledger. From/To are Pakistan calendar days.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <FormField label="From (PKT)" id="usage-from">
            <TextInput
              id="usage-from"
              type="date"
              value={filters.from}
              onChange={(e) => setFilters((prev) => ({ ...prev, from: e.target.value }))}
            />
          </FormField>
          <FormField label="To (PKT)" id="usage-to">
            <TextInput
              id="usage-to"
              type="date"
              value={filters.to}
              onChange={(e) => setFilters((prev) => ({ ...prev, to: e.target.value }))}
            />
          </FormField>
          <FormField label="Feature" id="usage-feature">
            <select
              id="usage-feature"
              value={filters.feature}
              onChange={(e) => setFilters((prev) => ({ ...prev, feature: e.target.value }))}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-zinc-100"
            >
              <option value="">All features</option>
              {Object.entries(AI_USAGE_FEATURES).map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Status" id="usage-status">
            <select
              id="usage-status"
              value={filters.status}
              onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-zinc-100"
            >
              <option value="">All</option>
              <option value="success">Success</option>
              <option value="failed">Failed</option>
            </select>
          </FormField>
        </div>
      </GlassCard>

      <GlassCard className="p-5">
        <div className="flex items-baseline justify-between gap-3">
          <h4 className="text-sm font-semibold text-white">Recent receipts</h4>
          <p className="text-xs text-zinc-500">
            Showing {ledger?.rows?.length || 0} of {ledger?.rowCount || 0}
            {ledger?.lastReceiptLabel ? ` · last ${ledger.lastReceiptLabel} PKT` : ''}
          </p>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-[11px] uppercase tracking-wider text-zinc-500">
              <tr>
                <th className="pb-2 pr-3">Time (PKT)</th>
                <th className="pb-2 pr-3">Feature</th>
                <th className="pb-2 pr-3">Model</th>
                <th className="pb-2 pr-3">Status</th>
                <th className="pb-2 pr-3">Input</th>
                <th className="pb-2 pr-3">Cached</th>
                <th className="pb-2 pr-3">Output</th>
                <th className="pb-2">Est. USD / PKR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-zinc-300">
              {(ledger?.rows || []).length ? (
                ledger.rows.map((row) => (
                  <tr key={row.id}>
                    <td className="whitespace-nowrap py-2 pr-3">{formatKarachiStamp(row.occurredAt)}</td>
                    <td className="py-2 pr-3 text-white">{row.featureLabel}</td>
                    <td className="py-2 pr-3">{row.model || 'Unknown'}</td>
                    <td className="py-2 pr-3">
                      <span
                        className={
                          row.status === 'success'
                            ? 'text-emerald-300'
                            : 'text-rose-300'
                        }
                      >
                        {row.status === 'success' ? 'Success' : 'Failed'}
                      </span>
                    </td>
                    <td className="py-2 pr-3">{tokenCell(row.inputTokens, row.tokensKnown)}</td>
                    <td className="py-2 pr-3">{tokenCell(row.cachedInputTokens, row.tokensKnown)}</td>
                    <td className="py-2 pr-3">{tokenCell(row.outputTokens, row.tokensKnown)}</td>
                    <td className="py-2">
                      <MoneyCell
                        usd={row.estimatedCostUsd}
                        pkr={row.estimatedCostPkr}
                        known={row.tokensKnown}
                      />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-6 text-center text-zinc-500">
                    {loading ? 'Loading receipts…' : 'No matching receipts.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>

      <GlassCard className="p-5">
        <h4 className="text-sm font-semibold text-white">OpenAI reported spend</h4>
        <p className="mt-1 text-sm text-zinc-400">
          Separate from per-task estimates. Needs an org Admin API key (`OPENAI_ADMIN_KEY`) later.
          Exact prepaid remaining is not stored here. Use wallet fills above for office expense
          dates.
        </p>
        {reported?.configured ? (
          <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-2xl font-semibold text-white">{formatUsd(reported.reportedUsd)}</p>
              <p className="mt-0.5 text-sm text-zinc-300">{formatPkr(reported.reportedPkr)}</p>
              <p className="mt-1 text-xs text-zinc-500">
                Last sync:{' '}
                {reported.syncedAt ? formatKarachiStamp(reported.syncedAt) : 'never'}
                {reported.periodStart && reported.periodEnd
                  ? ` · period ${formatKarachiDate(reported.periodStart)} – ${formatKarachiDate(reported.periodEnd)}`
                  : ''}
                {reported.error ? ` · ${reported.error}` : ''}
              </p>
            </div>
            <button
              type="button"
              onClick={onSyncReported}
              disabled={syncing}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-200 hover:bg-white/10 disabled:opacity-50"
            >
              {syncing ? 'Syncing…' : 'Sync reported spend'}
            </button>
          </div>
        ) : (
          <p className="mt-3 text-sm text-zinc-500">
            Admin API key not configured. Per-task estimates still work with the existing project
            key.
          </p>
        )}
        <a
          href={billingUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-flex items-center gap-2 text-sm text-indigo-300 hover:text-indigo-200"
        >
          Open OpenAI billing dashboard
          <ExternalLink className="h-4 w-4" />
        </a>
      </GlassCard>
    </div>
  );
}
