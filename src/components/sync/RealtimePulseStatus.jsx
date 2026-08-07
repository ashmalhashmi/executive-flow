/** Real-time Pulse status — hybrid: background auto + optional Save/Load on Sync page. */
export default function RealtimePulseStatus({
  pulseState = 'idle',
  lastSyncedAt = null,
  syncMessage = '',
  isPushActive = false,
  isPulling = false,
}) {
  const active = pulseState === 'syncing' || isPushActive || isPulling;
  const errored = pulseState === 'error';
  const live = pulseState === 'live' && !active && !errored;

  let label = 'Pulse idle — login to enable';
  let dotClass = 'bg-zinc-500';
  let ringClass = '';

  if (errored) {
    label = 'Pulse error — will retry';
    dotClass = 'bg-red-400';
  } else if (active) {
    label = isPulling ? 'Pulse · receiving…' : 'Pulse · saving…';
    dotClass = 'bg-sky-400';
    ringClass = 'animate-ping';
  } else if (live) {
    label = 'Real-time Pulse · live (hybrid)';
    dotClass = 'bg-emerald-400';
    ringClass = 'animate-pulse';
  }

  return (
    <div className="rounded-xl border border-sky-500/25 bg-sky-500/5 p-4">
      <div className="flex items-start gap-3">
        <span className="relative mt-1 flex h-3 w-3 shrink-0">
          {ringClass ? (
            <span
              className={`absolute inline-flex h-full w-full rounded-full opacity-60 ${dotClass} ${ringClass}`}
            />
          ) : null}
          <span className={`relative inline-flex h-3 w-3 rounded-full ${dotClass}`} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-sky-100">{label}</p>
          <p className="mt-1 text-xs text-zinc-400">
            Background mein auto-save / auto-load. Agar doosri device ke changes na dikhein — neeche{' '}
            <strong className="text-zinc-300">Load now</strong> dabao.
          </p>
          {lastSyncedAt && (
            <p className="mt-2 text-[11px] text-zinc-500">
              Last pulse: {new Date(lastSyncedAt).toLocaleString()}
            </p>
          )}
          {syncMessage && (
            <p
              className={`mt-2 text-xs ${
                errored ? 'text-red-300' : live || active ? 'text-emerald-300/90' : 'text-zinc-400'
              }`}
            >
              {syncMessage}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
