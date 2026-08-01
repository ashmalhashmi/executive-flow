import { Menu, Table2 } from 'lucide-react';

/** Top bar for mobile — opens sidebar drawer */
export default function MobileHeader({ onMenuOpen, title, onSheetView, showSheetButton }) {
  return (
    <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-white/10 bg-zinc-950/90 px-4 pb-3 pt-[calc(0.75rem+var(--safe-top))] backdrop-blur-xl lg:hidden">
      <button
        type="button"
        onClick={onMenuOpen}
        className="shrink-0 rounded-xl border border-white/10 bg-white/5 p-2.5 text-zinc-300 transition hover:bg-white/10 hover:text-white"
        aria-label="Open navigation"
      >
        <Menu className="h-5 w-5" />
      </button>
      <h2 className="min-w-0 flex-1 text-center text-sm font-semibold leading-snug text-white break-safe">
        {title}
      </h2>
      {showSheetButton ? (
        <button
          type="button"
          onClick={onSheetView}
          className="shrink-0 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-2.5 text-emerald-300 transition hover:bg-emerald-500/20"
          aria-label="View Google Sheet backup"
        >
          <Table2 className="h-5 w-5" />
        </button>
      ) : (
        <div className="h-10 w-10 shrink-0" aria-hidden />
      )}
    </header>
  );
}
