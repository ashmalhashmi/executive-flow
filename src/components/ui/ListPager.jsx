import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Shared pagination controls for long record lists.
 */
export default function ListPager({
  page,
  totalPages,
  total,
  showingLabel,
  onPageChange,
  className = '',
}) {
  if (total <= 0 || totalPages <= 1) {
    if (total > 0 && showingLabel) {
      return (
        <p className={`text-xs text-zinc-500 ${className}`.trim()}>{showingLabel}</p>
      );
    }
    return null;
  }

  return (
    <div
      className={`flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between ${className}`.trim()}
    >
      <p className="text-xs text-zinc-500">{showingLabel}</p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Prev
        </button>
        <span className="min-w-[5.5rem] text-center text-xs text-zinc-400">
          Page {page} of {totalPages}
        </span>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
