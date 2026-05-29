import { Calendar, ArrowRight } from 'lucide-react';
import GlassCard from '../ui/GlassCard';
import { formatDisplayTime, getRelativeDayLabel } from '../../utils/dates';

/** Weekly summary — sirf Executive Flow Calendar appointments */
export default function NextWeekMeetings({ meetings, onNavigate }) {
  return (
    <GlassCard className="flex flex-col p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-indigo-400" strokeWidth={1.75} />
            <h3 className="text-sm font-semibold text-white">Weekly Summary</h3>
          </div>
          <p className="mt-1 text-xs text-zinc-500">
            Executive Flow Calendar · agle 7 din · {meetings.length} appointment
            {meetings.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onNavigate('calendar')}
          className="flex items-center gap-1 text-xs font-medium text-indigo-400 transition hover:text-indigo-300"
        >
          Calendar kholein
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {meetings.length === 0 ? (
        <p className="py-8 text-center text-sm leading-relaxed text-zinc-500">
          Agle hafte ke liye Executive Flow Calendar par koi appointment nahi.
          <br />
          <button
            type="button"
            onClick={() => onNavigate('calendar')}
            className="mt-2 text-indigo-400 hover:text-indigo-300"
          >
            My Calendar se schedule karein →
          </button>
        </p>
      ) : (
        <ul className="space-y-3">
          {meetings.map((meeting) => (
            <li
              key={meeting.id}
              className="rounded-xl border border-indigo-500/15 bg-indigo-500/5 px-4 py-3"
            >
              <p className="font-medium text-zinc-100">{meeting.title}</p>
              <p className="mt-1 text-xs text-zinc-500">
                {getRelativeDayLabel(meeting.date)} · {formatDisplayTime(meeting.time)}
              </p>
              {meeting.agenda && (
                <p className="mt-2 line-clamp-2 text-xs text-zinc-600">{meeting.agenda}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </GlassCard>
  );
}
