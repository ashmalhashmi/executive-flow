import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import GlassCard from './GlassCard';

/**
 * Collapsible tool panel — keeps long pages scannable (Import, Capture, etc.).
 */
export default function CollapsibleSection({
  title,
  subtitle,
  icon,
  defaultOpen = false,
  open: controlledOpen,
  onOpenChange,
  badge,
  className = '',
  children,
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;

  const setOpen = (next) => {
    if (!isControlled) setUncontrolledOpen(next);
    onOpenChange?.(next);
  };

  return (
    <GlassCard className={className}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-start gap-3 text-left"
        aria-expanded={open}
      >
        {icon && (
          <span className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5">
            {icon}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-zinc-100">{title}</p>
            {badge != null && badge !== '' && (
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium text-zinc-300">
                {badge}
              </span>
            )}
          </div>
          {subtitle && <p className="mt-0.5 text-xs text-zinc-500">{subtitle}</p>}
        </div>
        <ChevronDown
          className={[
            'mt-2 h-5 w-5 shrink-0 text-zinc-400 transition-transform',
            open ? 'rotate-180' : '',
          ].join(' ')}
        />
      </button>
      {open && <div className="mt-4 border-t border-white/10 pt-4">{children}</div>}
    </GlassCard>
  );
}
