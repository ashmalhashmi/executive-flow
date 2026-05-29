const STYLES = {
  Scheduled: 'bg-sky-500/15 text-sky-300 border-sky-500/25',
  'SOP Sent': 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25',
  Completed: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/25',
  Delivered: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25',
  Pending: 'bg-amber-500/15 text-amber-300 border-amber-500/25',
  Alert: 'bg-rose-500/15 text-rose-300 border-rose-500/25',
};

export default function StatusBadge({ status, className = '' }) {
  return (
    <span
      className={[
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium tracking-wide',
        STYLES[status] ?? STYLES.Scheduled,
        className,
      ].join(' ')}
    >
      {status}
    </span>
  );
}
