import GlassCard from '../ui/GlassCard';
import { formatDisplayDate } from '../../utils/dates';

/** Grouped view of calendar meeting souvenir text entries */
export default function PresentationBatches({ souvenirs }) {
  const batches = souvenirs
    .filter((s) => s.presentationBatchId && s.rawPresentationText)
    .reduce((acc, s) => {
      if (!acc[s.presentationBatchId]) {
        acc[s.presentationBatchId] = {
          batchId: s.presentationBatchId,
          meetingTitle: s.meetingTitle,
          date: s.dateDistributed,
          rawText: s.rawPresentationText,
          items: [],
        };
      }
      return acc;
    }, {});

  const list = Object.values(batches).map((batch) => {
    const items = souvenirs.filter((s) => s.presentationBatchId === batch.batchId);
    return { ...batch, items };
  });

  if (list.length === 0) return null;

  return (
    <GlassCard className="p-5 sm:p-6">
      <h3 className="text-sm font-semibold text-white">Souvenir records</h3>
      <p className="mt-1 mb-4 text-xs text-zinc-500">
        Label aur quantity alag alag save — original text neeche
      </p>
      <ul className="space-y-4">
        {list.map((batch) => (
          <li
            key={batch.batchId}
            className="rounded-xl border border-amber-500/15 bg-amber-500/5 p-4"
          >
            <p className="font-medium text-zinc-200">{batch.meetingTitle}</p>
            <p className="text-xs text-zinc-500">{formatDisplayDate(batch.date)}</p>
            <p className="mt-2 rounded-lg bg-black/20 p-2 text-xs italic text-zinc-500">
              &quot;{batch.rawText}&quot;
            </p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {batch.items.map((item) => (
                <li
                  key={item.id}
                  className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-zinc-300"
                >
                  {item.itemName}: <strong>{item.quantity}</strong>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </GlassCard>
  );
}
