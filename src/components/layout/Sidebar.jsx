import { Sparkles, X } from 'lucide-react';
import { NAV_ITEMS } from '../../constants/navigation';
import { prefetchTab } from '../../utils/tabImports';

/**
 * Sticky glassmorphism sidebar — desktop always visible, mobile as slide-over drawer.
 */
export default function Sidebar({ activeTab, onTabChange, isOpen, onClose }) {
  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={[
          'fixed inset-y-0 left-0 z-50 flex w-[min(18rem,85vw)] flex-col pt-[var(--safe-top)] pb-[var(--safe-bottom)] sm:w-72',
          'border-r border-white/10 bg-zinc-950/80 backdrop-blur-xl',
          'transition-transform duration-300 ease-out lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
      >
        {/* Brand header */}
        <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-indigo-400/30 bg-indigo-500/20">
              <Sparkles className="h-5 w-5 text-indigo-300" strokeWidth={1.75} />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight text-white">
                Executive Flow
              </h1>
              <p className="text-xs text-zinc-500">AI Executive Assistant</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-zinc-400 transition hover:bg-white/5 hover:text-white lg:hidden"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="custom-scrollbar flex-1 overflow-y-auto px-3 py-4">
          <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-widest text-zinc-600">
            Workspace
          </p>
          <ul className="space-y-1">
            {NAV_ITEMS.map(({ id, label, description, icon: Icon }) => {
              const isActive = activeTab === id;
              return (
                <li key={id}>
                  <button
                    type="button"
                    onPointerEnter={() => prefetchTab(id)}
                    onFocus={() => prefetchTab(id)}
                    onClick={() => {
                      onTabChange(id);
                      onClose?.();
                    }}
                    className={[
                      'group flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition-all duration-200',
                      isActive
                        ? 'border border-white/10 bg-white/10 shadow-inner shadow-white/5'
                        : 'border border-transparent hover:border-white/5 hover:bg-white/5',
                    ].join(' ')}
                  >
                    <span
                      className={[
                        'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors',
                        isActive
                          ? 'bg-indigo-500/25 text-indigo-300'
                          : 'bg-white/5 text-zinc-400 group-hover:text-zinc-200',
                      ].join(' ')}
                    >
                      <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span
                        className={[
                          'block text-sm font-medium',
                          isActive ? 'text-white' : 'text-zinc-300 group-hover:text-white',
                        ].join(' ')}
                      >
                        {label}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-zinc-500">
                        {description}
                      </span>
                    </span>
                    {isActive && (
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer status */}
        <div className="border-t border-white/10 p-4">
          <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-md">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              <span className="text-xs font-medium text-zinc-300">Reminders on</span>
            </div>
            <p className="mt-1 text-[11px] text-zinc-500">
              Calendar meetings · 1 hr pehle alarm
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
