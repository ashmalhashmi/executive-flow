import { Menu, Bell } from 'lucide-react';

/** Top bar for mobile — opens sidebar drawer */
export default function MobileHeader({ onMenuOpen, title }) {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-white/10 bg-zinc-950/90 px-3 pb-4 pt-[calc(0.75rem+var(--safe-top))] backdrop-blur-xl lg:hidden">
      <button
        type="button"
        onClick={onMenuOpen}
        className="rounded-xl border border-white/10 bg-white/5 p-2.5 text-zinc-300 transition hover:bg-white/10 hover:text-white"
        aria-label="Open navigation"
      >
        <Menu className="h-5 w-5" />
      </button>
      <h2 className="truncate text-sm font-semibold text-white">{title}</h2>
      <button
        type="button"
        className="rounded-xl border border-white/10 bg-white/5 p-2.5 text-zinc-400 transition hover:text-white"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
      </button>
    </header>
  );
}
