import GlassCard from '../ui/GlassCard';
import { formatDisplayTime } from '../../utils/dates';

/** Aaj ki meetings — sirf Executive Flow Calendar; title + time only */
export default function TodayMeetingsHero({ todayMeetings = [] }) {
  const hasMeetings = todayMeetings.length > 0;

  return (
    <GlassCard className="border-sky-500/20 bg-gradient-to-br from-sky-500/10 via-white/5 to-transparent p-6 sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-widest text-sky-300/90">
        Meetings Today · Executive Flow Calendar
      </p>

      {!hasMeetings ? (
        <p className="mt-4 text-lg text-zinc-500">Aaj koi meeting schedule nahi hai</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {todayMeetings.map((m) => (
            <li
              key={m.id}
              className="flex flex-wrap items-baseline justify-between gap-2 border-b border-white/5 pb-3 last:border-0 last:pb-0"
            >
              <span className="font-medium text-white">{m.title}</span>
              <span className="text-sm tabular-nums text-zinc-400">
                {formatDisplayTime(m.time)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </GlassCard>
  );
}
