import { Calendar } from 'lucide-react';
import { openInGoogleCalendar } from '../../utils/googleCalendar';

export default function GoogleCalendarButton({
  meeting,
  variant = 'ghost',
  className = '',
}) {
  const styles = {
    ghost:
      'border border-white/10 bg-white/5 text-zinc-300 hover:border-sky-500/30 hover:bg-sky-500/10 hover:text-sky-200',
    primary:
      'border border-sky-500/30 bg-sky-500/15 text-sky-200 hover:bg-sky-500/25',
  };

  return (
    <button
      type="button"
      onClick={() => openInGoogleCalendar(meeting)}
      className={[
        'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition',
        styles[variant] ?? styles.ghost,
        className,
      ].join(' ')}
      title="Add to Google Calendar"
    >
      <Calendar className="h-3.5 w-3.5" />
      Google Calendar
    </button>
  );
}
