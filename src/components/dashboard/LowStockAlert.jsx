import { TriangleAlert } from 'lucide-react';
import GlassCard from '../ui/GlassCard';

export default function LowStockAlert({ items }) {
  if (items.length === 0) {
    return (
      <GlassCard className="border-emerald-500/20 bg-emerald-500/5 p-5">
        <p className="text-sm text-emerald-300/90">All souvenir inventory levels are healthy.</p>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="border-rose-500/20 bg-rose-500/5 p-5 sm:p-6">
      <div className="mb-3 flex items-center gap-2">
        <TriangleAlert className="h-4 w-4 text-rose-400" strokeWidth={1.75} />
        <h3 className="text-sm font-semibold text-rose-200">Low stock attention</h3>
      </div>
      <ul className="space-y-2">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex items-center justify-between gap-3 rounded-lg border border-rose-500/15 bg-black/20 px-3 py-2 text-sm"
          >
            <span className="truncate text-zinc-300">{item.itemName}</span>
            <span className="shrink-0 tabular-nums text-xs font-medium text-rose-300">
              {item.stock} left
              <span className="text-rose-400/60"> / min {item.threshold}</span>
            </span>
          </li>
        ))}
      </ul>
    </GlassCard>
  );
}
