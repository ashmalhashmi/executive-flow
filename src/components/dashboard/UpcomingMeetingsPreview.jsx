import { CalendarDays, ArrowRight } from 'lucide-react';
import GlassCard from '../ui/GlassCard';
import StatusBadge from '../ui/StatusBadge';
import { formatDisplayTime, getRelativeDayLabel } from '../../utils/dates';

export default function UpcomingMeetingsPreview({ meetings, onNavigate }) {
  const preview = meetings.slice(0, 3);

  return (
    <GlassCard className="flex flex-col p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-indigo-400" strokeWidth={1.75} />
          <h3 className="text-sm font-semibold text-white">Upcoming Meetings</h3>
        </div>
        <button
          type="button"
          onClick={() => onNavigate('meetings')}
          className="flex items-center gap-1 text-xs font-medium text-indigo-400 transition hover:text-indigo-300"
        >
          View all
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {preview.length === 0 ? (
        <p className="py-6 text-center text-sm text-zinc-500">No upcoming meetings</p>
      ) : (
        <ul className="space-y-3">
          {preview.map((meeting) => (
            <li
              key={meeting.id}
              className="rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3 transition hover:border-white/10 hover:bg-white/5"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-zinc-100">
                    {meeting.title}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {getRelativeDayLabel(meeting.date)} · {formatDisplayTime(meeting.time)}
                  </p>
                </div>
                <StatusBadge status={meeting.status} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </GlassCard>
  );
}
