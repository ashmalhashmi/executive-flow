import { Plus, Clock } from 'lucide-react';
import GlassCard from '../ui/GlassCard';
import StatusBadge from '../ui/StatusBadge';
import { formatDisplayDate, formatDisplayTime, getRelativeDayLabel } from '../../utils/dates';

export default function DayAppointmentsPanel({
  selectedDate,
  appointments,
  onScheduleClick,
}) {
  const sorted = [...appointments].sort((a, b) => a.time.localeCompare(b.time));

  return (
    <GlassCard className="flex h-full flex-col p-5 sm:p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-indigo-400/90">
            Selected Day
          </p>
          <h3 className="mt-1 text-lg font-semibold text-white">
            {getRelativeDayLabel(selectedDate)}
          </h3>
          <p className="text-sm text-zinc-500">{formatDisplayDate(selectedDate)}</p>
        </div>
        <button
          type="button"
          onClick={onScheduleClick}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-500 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-indigo-500/20 hover:bg-indigo-400"
        >
          <Plus className="h-4 w-4" />
          Nayi Appointment
        </button>
      </div>

      {sorted.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-white/10 py-12 text-center">
          <Clock className="mb-3 h-10 w-10 text-zinc-600" />
          <p className="text-sm text-zinc-400">Is din koi appointment nahi</p>
          <p className="mt-1 text-xs text-zinc-600">
            &quot;Nayi Appointment&quot; se schedule karein
          </p>
        </div>
      ) : (
        <ul className="custom-scrollbar max-h-[320px] space-y-2 overflow-y-auto">
          {sorted.map((apt) => (
            <li
              key={apt.id}
              className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-zinc-100">{apt.title}</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {formatDisplayTime(apt.time)}
                  </p>
                </div>
                <StatusBadge status={apt.status} />
              </div>
              {apt.agenda && (
                <p className="mt-2 line-clamp-2 text-xs text-zinc-500">{apt.agenda}</p>
              )}
            </li>
          ))}
        </ul>
      )}

      <p className="mt-4 border-t border-white/5 pt-3 text-center text-xs text-zinc-600">
        {sorted.length} appointment{sorted.length !== 1 ? 's' : ''} is din
      </p>
    </GlassCard>
  );
}
