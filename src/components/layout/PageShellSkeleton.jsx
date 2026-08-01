/** Dashboard-shaped skeleton — matches HTML boot shell while lazy chunks load */
export default function PageShellSkeleton() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Loading page">
      <section className="rounded-2xl border border-sky-500/20 bg-gradient-to-br from-sky-500/10 via-white/5 to-transparent p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-sky-300/90">
          Meetings Today · Executive Flow Calendar
        </p>
        <div className="mt-4 h-5 w-3/4 max-w-md animate-pulse rounded-md bg-white/10" />
        <div className="mt-2 h-4 w-2/5 animate-pulse rounded-md bg-white/10" />
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-5 sm:p-6">
        <p className="text-sm font-semibold text-white">Weekly Summary</p>
        <p className="mt-1 text-xs text-zinc-500">Executive Flow Calendar · agle 7 din</p>
        <div className="mt-4 space-y-3">
          {[0, 1].map((key) => (
            <div
              key={key}
              className="rounded-xl border border-indigo-500/15 bg-indigo-500/5 px-4 py-3"
            >
              <div className="h-4 w-2/3 animate-pulse rounded-md bg-white/10" />
              <div className="mt-2 h-3 w-1/2 animate-pulse rounded-md bg-white/10" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
