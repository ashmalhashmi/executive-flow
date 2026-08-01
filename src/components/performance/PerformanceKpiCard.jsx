import { Gauge } from 'lucide-react';
import GlassCard from '../ui/GlassCard';
import { KPI_GOALS } from '../../constants/performanceKpi';
import { formatKpiValue } from '../../utils/performanceKpi';
import { usePerformanceKpi } from '../../hooks/usePerformanceKpi';

const RATING_STYLES = {
  good: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
  'needs-improvement': 'border-amber-500/30 bg-amber-500/10 text-amber-200',
  poor: 'border-rose-500/30 bg-rose-500/10 text-rose-200',
  unknown: 'border-white/10 bg-black/20 text-zinc-400',
};

function KpiTile({ label, goalText, entry, valueText }) {
  const rating = entry?.rating ?? 'unknown';
  return (
    <div className={`rounded-xl border px-4 py-3 ${RATING_STYLES[rating]}`}>
      <p className="text-xs font-semibold uppercase tracking-wider opacity-80">{label}</p>
      <p className="mt-1 text-2xl font-bold">{valueText}</p>
      <p className="mt-1 text-xs opacity-70">Goal: {goalText}</p>
      {entry?.updatedAt && (
        <p className="mt-1 text-[10px] opacity-50">
          {new Date(entry.updatedAt).toLocaleString()}
        </p>
      )}
    </div>
  );
}

export default function PerformanceKpiCard() {
  const { snapshot } = usePerformanceKpi();

  return (
    <GlassCard className="border-sky-500/20 bg-sky-500/5 p-5 sm:p-6">
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-sky-500/30 bg-sky-500/15">
          <Gauge className="h-5 w-5 text-sky-300" />
        </span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-sky-400/90">
            Speed KPI
          </p>
          <p className="text-sm text-zinc-500">LCP + INP — is device par live track</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <KpiTile
          label="LCP"
          goalText="< 2.5s"
          entry={snapshot.lcp}
          valueText={formatKpiValue('lcp', snapshot.lcp)}
        />
        <KpiTile
          label="INP"
          goalText="< 200ms"
          entry={snapshot.inp}
          valueText={formatKpiValue('inp', snapshot.inp)}
        />
      </div>

      <p className="mt-3 text-xs text-zinc-600">
        Tabs switch karein — INP update hoga. Goal: {KPI_GOALS.lcp.label} &lt;{' '}
        {KPI_GOALS.lcp.target}s · {KPI_GOALS.inp.label} &lt; {KPI_GOALS.inp.target}ms
      </p>
    </GlassCard>
  );
}
