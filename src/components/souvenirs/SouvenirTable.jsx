import StatusBadge from '../ui/StatusBadge';
import { formatDisplayDate } from '../../utils/dates';

const COLUMNS = [
  { key: 'itemName', label: 'Item Name' },
  { key: 'quantity', label: 'Qty' },
  { key: 'meeting', label: 'Meeting / Recipient' },
  { key: 'dateDistributed', label: 'Date' },
  { key: 'status', label: 'Status' },
];

export default function SouvenirTable({ souvenirs }) {
  if (souvenirs.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-zinc-500">
        No distributions match this filter.
      </p>
    );
  }

  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-xs font-medium uppercase tracking-wider text-zinc-500">
              {COLUMNS.map((col) => (
                <th key={col.key} className="px-4 py-3 font-medium">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {souvenirs.map((row) => (
              <tr key={row.id} className="transition hover:bg-white/[0.03]">
                <td className="px-4 py-3.5">
                  <p className="font-medium text-zinc-200">{row.itemName}</p>
                  {row.source === 'calendar-meeting' && (
                    <span className="mt-1 inline-block rounded border border-amber-500/20 bg-amber-500/10 px-1.5 py-0.5 text-[10px] text-amber-300">
                      Calendar meeting
                    </span>
                  )}
                </td>
                <td className="px-4 py-3.5 tabular-nums text-zinc-300">{row.quantity}</td>
                <td className="px-4 py-3.5 text-zinc-400">
                  {row.meetingTitle ? (
                    <span title={row.rawPresentationText || ''}>{row.meetingTitle}</span>
                  ) : (
                    row.recipientName
                  )}
                </td>
                <td className="px-4 py-3.5 text-zinc-400">
                  {formatDisplayDate(row.dateDistributed)}
                </td>
                <td className="px-4 py-3.5">
                  <StatusBadge status={row.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="divide-y divide-white/5 md:hidden">
        {souvenirs.map((row) => (
          <li key={row.id} className="px-4 py-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium text-zinc-100">{row.itemName}</p>
                <p className="mt-1 text-sm text-zinc-400">
                  {row.meetingTitle || row.recipientName}
                </p>
              </div>
              <StatusBadge status={row.status} />
            </div>
            <div className="mt-3 flex flex-wrap gap-3 text-xs text-zinc-500">
              <span>
                Qty: <strong className="text-zinc-300">{row.quantity}</strong>
              </span>
              <span>{formatDisplayDate(row.dateDistributed)}</span>
              {row.source === 'calendar-meeting' && (
                <span className="text-amber-400/80">Calendar meeting</span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
