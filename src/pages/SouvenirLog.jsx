import { Gift } from 'lucide-react';
import { useExecutive } from '../context/ExecutiveContext';
import GlassCard from '../components/ui/GlassCard';
import PresentationBatches from '../components/souvenirs/PresentationBatches';

export default function SouvenirLog({ onNavigate }) {
  const { souvenirs } = useExecutive();

  const calendarSouvenirs = souvenirs.filter((s) => s.source === 'calendar-meeting');
  const hasRecords = calendarSouvenirs.length > 0;

  return (
    <div className="space-y-6">
      {hasRecords ? (
        <PresentationBatches souvenirs={souvenirs} />
      ) : (
        <GlassCard className="flex flex-col items-center justify-center px-6 py-16 text-center">
          <Gift className="mb-4 h-12 w-12 text-zinc-600" strokeWidth={1.25} />
          <p className="text-sm font-medium text-zinc-400">Abhi koi souvenir record nahi</p>
          <p className="mt-2 max-w-sm text-xs text-zinc-600">
            Calendar par jis din meeting ho, wahan &quot;Souvenirs Presented&quot; se text
            likh kar save karein.
          </p>
          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate('calendar')}
              className="mt-4 text-sm font-medium text-indigo-400 hover:text-indigo-300"
            >
              My Calendar kholein →
            </button>
          )}
        </GlassCard>
      )}
    </div>
  );
}
