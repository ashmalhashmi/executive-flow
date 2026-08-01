import PageShellSkeleton from './PageShellSkeleton';

/** Lightweight placeholder while a tab chunk loads — dashboard keeps full shell */
export default function TabPanelSkeleton({ tabId }) {
  if (tabId === 'dashboard') {
    return <PageShellSkeleton />;
  }

  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading section">
      <div className="h-8 w-52 max-w-full animate-pulse rounded-lg bg-white/10" />
      <div className="h-4 w-72 max-w-full animate-pulse rounded-md bg-white/10" />
      <div className="h-56 animate-pulse rounded-2xl border border-white/10 bg-white/5 sm:h-64" />
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="h-24 animate-pulse rounded-xl border border-white/10 bg-white/5" />
        <div className="h-24 animate-pulse rounded-xl border border-white/10 bg-white/5" />
      </div>
    </div>
  );
}
