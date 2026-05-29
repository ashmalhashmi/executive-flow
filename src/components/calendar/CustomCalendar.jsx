import { ChevronLeft, ChevronRight } from 'lucide-react';
import GlassCard from '../ui/GlassCard';
import { buildMonthGrid, getMonthLabel, isTodayISO, WEEKDAYS } from '../../utils/calendar';

export default function CustomCalendar({
  year,
  monthIndex,
  selectedDate,
  appointmentCounts,
  onSelectDate,
  onPrevMonth,
  onNextMonth,
  onToday,
}) {
  const cells = buildMonthGrid(year, monthIndex);
  const monthLabel = getMonthLabel(year, monthIndex);

  return (
    <GlassCard className="p-4 sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-white">{monthLabel}</h3>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onPrevMonth}
            className="rounded-lg border border-white/10 p-2 text-zinc-400 transition hover:bg-white/10 hover:text-white"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onToday}
            className="rounded-lg border border-indigo-500/30 bg-indigo-500/15 px-3 py-1.5 text-xs font-medium text-indigo-300 transition hover:bg-indigo-500/25"
          >
            Aaj
          </button>
          <button
            type="button"
            onClick={onNextMonth}
            className="rounded-lg border border-white/10 p-2 text-zinc-400 transition hover:bg-white/10 hover:text-white"
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map((d) => (
          <div
            key={d}
            className="py-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-600"
          >
            {d}
          </div>
        ))}

        {cells.map((cell) => {
          const count = appointmentCounts[cell.iso] || 0;
          const isSelected = cell.iso === selectedDate;
          const isToday = isTodayISO(cell.iso);

          return (
            <button
              key={cell.iso}
              type="button"
              onClick={() => onSelectDate(cell.iso)}
              className={[
                'relative flex min-h-[44px] flex-col items-center justify-center rounded-lg border text-xs transition sm:min-h-[52px] sm:rounded-xl sm:text-sm md:min-h-[56px]',
                !cell.inMonth && 'opacity-35',
                isSelected
                  ? 'border-indigo-400/50 bg-indigo-500/25 text-white shadow-inner'
                  : 'border-transparent text-zinc-300 hover:border-white/10 hover:bg-white/5',
                isToday && !isSelected && 'ring-1 ring-sky-500/40',
              ].join(' ')}
            >
              <span className={isToday ? 'font-bold text-sky-300' : 'font-medium'}>
                {cell.day}
              </span>
              {count > 0 && (
                <span className="mt-0.5 flex gap-0.5">
                  {Array.from({ length: Math.min(count, 3) }).map((_, i) => (
                    <span
                      key={i}
                      className={[
                        'h-1 w-1 rounded-full',
                        isSelected ? 'bg-white' : 'bg-indigo-400',
                      ].join(' ')}
                    />
                  ))}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <p className="mt-4 text-center text-xs text-zinc-600">
        Din par click karein · appointment schedule karein
      </p>
    </GlassCard>
  );
}
