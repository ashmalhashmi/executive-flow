import { Bell, X } from 'lucide-react';
import { formatDisplayDate, formatDisplayTime } from '../../utils/dates';

export default function TaskReminderAlert({ task, onDismiss }) {
  if (!task) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-[180] px-3 pb-[calc(0.75rem+var(--safe-bottom))]">
      <div
        role="alertdialog"
        aria-labelledby="task-reminder-title"
        className="mx-auto flex w-full max-w-md items-start gap-3 rounded-2xl border border-amber-500/40 bg-zinc-900 p-4 shadow-2xl shadow-black/40"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-500/40 bg-amber-500/20">
          <Bell className="h-5 w-5 text-amber-300" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-300">
            15 minutes · Task Log
          </p>
          <h2 id="task-reminder-title" className="mt-1 break-words text-sm font-semibold text-white">
            {task.title}
          </h2>
          <p className="mt-1 text-xs text-zinc-400">
            {formatDisplayDate(task.date)} · {formatDisplayTime(task.time)}
          </p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/10 hover:text-white"
          aria-label="Dismiss task reminder"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
