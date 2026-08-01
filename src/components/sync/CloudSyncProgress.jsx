/** Save-to-cloud upload progress — percentage + phase label */
export default function CloudSyncProgress({
  progress = 0,
  phase = '',
  optimisticSaved = false,
  active = false,
}) {
  if (!active) return null;

  const barColor = optimisticSaved ? 'bg-emerald-500' : 'bg-sky-500';
  const clamped = Math.min(100, Math.max(0, progress));

  return (
    <div className="mt-3 space-y-2 rounded-xl border border-white/10 bg-black/20 p-3">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="min-w-0 truncate text-zinc-300">
          {optimisticSaved ? 'Saved — cloud confirm ho rahi hai…' : phase || 'Uploading…'}
        </span>
        <span className="shrink-0 font-medium tabular-nums text-sky-200">{clamped}%</span>
      </div>
      <div
        className="h-2.5 overflow-hidden rounded-full bg-white/10"
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Cloud save progress"
      >
        <div
          className={`h-full rounded-full transition-all duration-300 ease-out ${barColor}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
      {optimisticSaved && (
        <p className="text-[11px] text-emerald-300/90">
          Chhota backup — pehle success dikhaya, ab server confirm kar raha hai.
        </p>
      )}
    </div>
  );
}
