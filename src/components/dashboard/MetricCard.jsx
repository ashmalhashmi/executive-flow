import GlassCard from '../ui/GlassCard';

/**
 * High-level KPI tile for the dashboard overview.
 */
export default function MetricCard({
  label,
  value,
  subtext,
  icon: Icon,
  accent = 'indigo',
  alert = false,
}) {
  const accents = {
    indigo: 'from-indigo-500/20 to-transparent text-indigo-300',
    sky: 'from-sky-500/20 to-transparent text-sky-300',
    amber: 'from-amber-500/20 to-transparent text-amber-300',
    rose: 'from-rose-500/20 to-transparent text-rose-300',
  };

  return (
    <GlassCard className="group relative overflow-hidden p-5 transition hover:border-white/15 hover:bg-white/[0.07]">
      <div
        className={`pointer-events-none absolute -right-4 -top-4 h-24 w-24 rounded-full bg-gradient-to-br ${accents[accent] ?? accents.indigo} opacity-60 blur-2xl transition group-hover:opacity-80`}
      />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            {label}
          </p>
          <p
            className={[
              'mt-2 text-3xl font-semibold tabular-nums tracking-tight',
              alert ? 'text-rose-300' : 'text-white',
            ].join(' ')}
          >
            {value}
          </p>
          {subtext && (
            <p className="mt-2 text-xs leading-relaxed text-zinc-500">{subtext}</p>
          )}
        </div>
        {Icon && (
          <div
            className={[
              'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5',
              alert ? 'text-rose-300' : 'text-zinc-400',
            ].join(' ')}
          >
            <Icon className="h-5 w-5" strokeWidth={1.75} />
          </div>
        )}
      </div>
    </GlassCard>
  );
}
