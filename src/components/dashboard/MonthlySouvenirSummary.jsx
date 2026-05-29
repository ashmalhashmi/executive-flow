import { Gift, Package } from 'lucide-react';
import GlassCard from '../ui/GlassCard';

export default function MonthlySouvenirSummary({ summary, onNavigate }) {
  const { monthLabel, count, totalQty, delivered, pending, topItems } = summary;

  return (
    <GlassCard className="p-5 sm:p-6">
      <div className="mb-4 flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-amber-300/90">
            Monthly Souvenir Summary · Mahina summary
          </p>
          <h3 className="mt-1 text-lg font-semibold text-white">{monthLabel}</h3>
        </div>
        <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-500/25 bg-amber-500/15">
          <Gift className="h-5 w-5 text-amber-300" strokeWidth={1.75} />
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <p className="text-[10px] uppercase tracking-wide text-zinc-500">Distributions</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-white">{count}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <p className="text-[10px] uppercase tracking-wide text-zinc-500">Total qty</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-white">{totalQty}</p>
        </div>
        <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/5 p-3">
          <p className="text-[10px] uppercase tracking-wide text-zinc-500">Delivered</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-emerald-300">
            {delivered}
          </p>
        </div>
        <div className="rounded-xl border border-amber-500/15 bg-amber-500/5 p-3">
          <p className="text-[10px] uppercase tracking-wide text-zinc-500">Pending</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-amber-300">{pending}</p>
        </div>
      </div>

      {topItems.length > 0 && (
        <div className="mt-4 border-t border-white/5 pt-4">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-zinc-500">
            <Package className="h-3.5 w-3.5" />
            Is mahine sab se zyada share
          </p>
          <ul className="space-y-1.5">
            {topItems.map(({ name, qty }) => (
              <li
                key={name}
                className="flex justify-between text-sm text-zinc-400"
              >
                <span className="truncate pr-2">{name}</span>
                <span className="shrink-0 tabular-nums text-zinc-300">{qty}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <button
        type="button"
        onClick={() => onNavigate('souvenirs')}
        className="mt-4 w-full rounded-xl border border-white/10 py-2 text-xs font-medium text-zinc-400 transition hover:bg-white/5 hover:text-white"
      >
        Full Souvenir Log dekhein →
      </button>
    </GlassCard>
  );
}
