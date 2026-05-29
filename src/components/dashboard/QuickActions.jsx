import { CalendarPlus, Calendar, Gift, ChevronRight } from 'lucide-react';
import GlassCard from '../ui/GlassCard';

const ACTIONS = [
  {
    id: 'calendar',
    label: 'Open Calendar',
    description: 'Custom calendar par appointment',
    icon: Calendar,
    tab: 'calendar',
    accent: 'hover:border-indigo-500/30 hover:bg-indigo-500/10',
    iconClass: 'text-indigo-300',
  },
  {
    id: 'souvenir',
    label: 'Log Souvenir',
    description: 'Record a distribution',
    icon: Gift,
    tab: 'souvenirs',
    accent: 'hover:border-amber-500/30 hover:bg-amber-500/10',
    iconClass: 'text-amber-300',
  },
];

export default function QuickActions({ onNavigate }) {
  return (
    <GlassCard className="p-5 sm:p-6">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-white">Quick Actions</h3>
        <p className="mt-1 text-xs text-zinc-500">
          Jump to common workflows in one click
        </p>
      </div>
      <ul className="space-y-2">
        {ACTIONS.map(
          ({ id, label, description, icon: Icon, tab, accent, iconClass }) => (
            <li key={id}>
              <button
                type="button"
                onClick={() => onNavigate(tab)}
                className={[
                  'flex w-full items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3 text-left transition duration-200',
                  accent,
                ].join(' ')}
              >
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/5 ${iconClass}`}
                >
                  <Icon className="h-5 w-5" strokeWidth={1.75} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-zinc-200">
                    {label}
                  </span>
                  <span className="block text-xs text-zinc-500">{description}</span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-zinc-600" />
              </button>
            </li>
          ),
        )}
      </ul>
    </GlassCard>
  );
}
