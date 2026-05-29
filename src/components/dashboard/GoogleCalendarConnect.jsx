import { Calendar, Link2, RefreshCw, Unlink } from 'lucide-react';
import GlassCard from '../ui/GlassCard';

export default function GoogleCalendarConnect({
  connected,
  syncing,
  error,
  canUseApi,
  onConnect,
  onDisconnect,
  onImport,
}) {
  return (
    <GlassCard className="p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-sky-500/25 bg-sky-500/15">
          <Calendar className="h-5 w-5 text-sky-300" strokeWidth={1.75} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-white">Google Calendar</h3>
          <p className="mt-1 text-xs leading-relaxed text-zinc-500">
            Meetings ko Google Calendar se connect karein — import karein ya har meeting
            calendar mein add karein.
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
          <span className="text-[11px] text-zinc-600">
            Import ke liye .env mein Client ID chahiye
          </span>
        )}
      </div>

      {error && (
        <p className="mt-3 rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
          {error}
        </p>
      )}

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {canUseApi && !connected && (
          <button
            type="button"
            onClick={onConnect}
            disabled={syncing}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-sky-500 disabled:opacity-50"
          >
            <Link2 className="h-4 w-4" />
            Connect Google Calendar
          </button>
        )}
        {canUseApi && connected && (
          <>
            <button
              type="button"
              onClick={onImport}
              disabled={syncing}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-sky-500 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Importing…' : 'Import next 7 days'}
            </button>
            <button
              type="button"
              onClick={onDisconnect}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-sm font-medium text-zinc-400 transition hover:bg-white/5 hover:text-white"
            >
              <Unlink className="h-4 w-4" />
              Disconnect
            </button>
          </>
        )}
        <a
          href="https://calendar.google.com"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-sm font-medium text-zinc-300 transition hover:bg-white/5"
        >
          <Calendar className="h-4 w-4" />
          Open Google Calendar
        </a>
      </div>

      {!canUseApi && (
        <p className="mt-3 text-[11px] leading-relaxed text-zinc-600">
          Auto-import: copy <code className="text-zinc-500">.env.example</code> to{' '}
          <code className="text-zinc-500">.env</code> and set{' '}
          <code className="text-zinc-500">VITE_GOOGLE_CLIENT_ID</code> from Google Cloud
          Console (Calendar API enabled).
        </p>
      )}
    </GlassCard>
  );
}
