import { Calendar, Link2, Unlink, Loader2 } from 'lucide-react';
import GlassCard from '../ui/GlassCard';

export default function OutlookCalendarConnect({
  connected,
  syncing,
  error,
  lastMessage,
  canUseApi,
  onConnect,
  onDisconnect,
}) {
  return (
    <GlassCard className="border-sky-500/20 bg-sky-500/5 p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-sky-500/25 bg-sky-500/15">
          <Calendar className="h-5 w-5 text-sky-300" strokeWidth={1.75} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-white">Outlook Calendar</h3>
          <p className="mt-1 text-xs leading-relaxed text-zinc-500">
            Connect karein — My Calendar par save / edit hone wali meetings Outlook mein
            one-way push hongi (create / update / delete).
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span
          className={[
            'rounded-full border px-2.5 py-0.5 text-[11px] font-medium',
            connected
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
              : 'border-white/10 bg-white/5 text-zinc-500',
          ].join(' ')}
        >
          {connected ? 'Connected' : 'Not connected'}
        </span>
        {!canUseApi && (
          <span className="text-[11px] text-amber-400/90">
            Setup: VITE_MSAL_CLIENT_ID (.env / Vercel) — Azure SPA + Calendars.ReadWrite
          </span>
        )}
      </div>

      {error && (
        <p className="mt-3 rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
          {error}
        </p>
      )}
      {!error && lastMessage && (
        <p className="mt-3 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
          {lastMessage}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {!connected ? (
          <button
            type="button"
            onClick={onConnect}
            disabled={!canUseApi || syncing}
            className="inline-flex items-center gap-2 rounded-xl border border-sky-500/30 bg-sky-500/15 px-3.5 py-2 text-xs font-medium text-sky-200 hover:bg-sky-500/25 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {syncing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Link2 className="h-3.5 w-3.5" />
            )}
            Connect Outlook
          </button>
        ) : (
          <button
            type="button"
            onClick={onDisconnect}
            disabled={syncing}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-xs font-medium text-zinc-300 hover:bg-white/10 disabled:opacity-50"
          >
            {syncing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Unlink className="h-3.5 w-3.5" />
            )}
            Disconnect
          </button>
        )}
      </div>
    </GlassCard>
  );
}
