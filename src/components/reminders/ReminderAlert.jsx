import { Bell, X } from 'lucide-react';
import { formatDisplayDate, formatDisplayTime } from '../../utils/dates';

export default function ReminderAlert({ meeting, onDismiss }) {
  return (
    <div
      className="fixed inset-0 z-[200] flex items-end justify-center bg-black/75 p-4 pb-[calc(1rem+var(--safe-bottom))] pt-[calc(0.75rem+var(--safe-top))] backdrop-blur-sm sm:items-center"
      role="alertdialog"
      aria-labelledby="reminder-title"
    >
      <div className="w-full max-w-md animate-[tabFadeIn_0.3s_ease-out] rounded-2xl border border-amber-500/40 bg-zinc-900 p-5 shadow-2xl shadow-amber-500/20 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-amber-500/40 bg-amber-500/20">
            <Bell className="h-6 w-6 animate-pulse text-amber-300" />
          </div>
          <button
            type="button"
            onClick={onDismiss}
            className="rounded-lg p-1.5 text-zinc-500 hover:bg-white/10 hover:text-white"
            aria-label="Dismiss"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mt-4 text-xs font-semibold uppercase tracking-widest text-amber-400">
          1 hour reminder · Executive Flow Calendar
        </p>
        <h2 id="reminder-title" className="mt-2 break-safe text-xl font-semibold text-white">
          {meeting.title}
        </h2>
        <p className="mt-2 text-sm text-zinc-400">
          {formatDisplayDate(meeting.date)} · {formatDisplayTime(meeting.time)}
        </p>
        <p className="mt-4 text-sm text-zinc-500">
          Aapki meeting 1 ghante mein shuru hogi.
        </p>

        <button
          type="button"
          onClick={onDismiss}
          className="mt-6 w-full rounded-xl bg-amber-500 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-amber-400"
        >
          OK, samajh gaya
        </button>
      </div>
    </div>
  );
}
