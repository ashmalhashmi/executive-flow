import { Gift, ArrowRight, Lock } from 'lucide-react';
import GlassCard from '../ui/GlassCard';

export default function SouvenirWeeklySummary({ summary, onNavigate }) {
  const {
    enabled,
    nextEnableLabel,
    weekLabel,
    totalQty,
    totalEntries,
    meetingCount,
    topItems,
  } = summary;

  if (!enabled) {
    return (
      <GlassCard className="border-zinc-700/50 bg-zinc-900/50 p-5 sm:p-6 opacity-90">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-zinc-600/50 bg-zinc-800/80">
            <Lock className="h-5 w-5 text-zinc-600" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-600">
              Souvenir Weekly Summary (disabled)
            </p>
            <h3 className="mt-1 text-base font-medium text-zinc-500">
              Hafte ke end par enable hogi
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-zinc-600">
              Yeh summary har <strong className="text-zinc-500">Sunday</strong> ko khulegi
              aur batayegi is hafte (Monday–Sunday) kitne souvenirs distribute hue.
            </p>
            <p className="mt-2 text-xs font-medium text-zinc-500">{nextEnableLabel}</p>
          </div>
        </div>
      </GlassCard>
    );
  }

  const headline =
    totalQty === 0
      ? 'Is hafte koi souvenir distribute nahi hua'
      : totalQty === 1
        ? 'Is hafte 1 souvenir distribute hua'
        : `Is hafte ${totalQty} souvenirs distribute hue`;

  return (
    <GlassCard className="border-amber-500/20 bg-gradient-to-br from-amber-500/10 via-white/5 to-transparent p-5 sm:p-6">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-amber-300/90">
            Souvenir Weekly Summary · Hafte ka end
          </p>
          <h3 className="mt-1 text-lg font-semibold text-white">{headline}</h3>
          <p className="mt-1 text-xs text-zinc-500">{weekLabel}</p>
        </div>
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-amber-500/25 bg-amber-500/15">
          <Gift className="h-5 w-5 text-amber-300" strokeWidth={1.75} />
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 min-[400px]:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-center">
          <p className="text-[10px] uppercase tracking-wide text-zinc-500">Total qty</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-white">{totalQty}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-center">
          <p className="text-[10px] uppercase tracking-wide text-zinc-500">Records</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-white">{totalEntries}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-center">
          <p className="text-[10px] uppercase tracking-wide text-zinc-500">Meetings</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-white">{meetingCount}</p>
        </div>
      </div>

      {topItems.length > 0 && (
        <div className="mt-4 border-t border-white/10 pt-4">
          <p className="mb-2 text-xs font-medium text-zinc-500">Item-wise count</p>
          <ul className="space-y-1.5">
            {topItems.map(({ name, qty }) => (
              <li key={name} className="flex justify-between text-sm">
                <span className="truncate pr-2 text-zinc-400">{name}</span>
                <span className="shrink-0 tabular-nums font-medium text-amber-300">{qty}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <button
        type="button"
        onClick={() => onNavigate('souvenirs')}
        className="mt-4 flex w-full items-center justify-center gap-1 text-xs font-medium text-amber-400/90 transition hover:text-amber-300"
      >
        Souvenir Log dekhein
        <ArrowRight className="h-3.5 w-3.5" />
      </button>
    </GlassCard>
  );
}
