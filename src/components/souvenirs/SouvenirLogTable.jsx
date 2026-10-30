import { Pencil, Trash2 } from 'lucide-react';
import GlassCard from '../ui/GlassCard';
import { formatDisplayDate } from '../../utils/dates';
import { normalizeSouvenirLogEntries } from '../../utils/souvenirLog';

export default function SouvenirLogTable({
  souvenirs,
  onDeleteEntry,
  onEditEntry,
  editingId = '',
}) {
  const rows = normalizeSouvenirLogEntries(souvenirs);

  if (rows.length === 0) return null;

  const handleDelete = (row) => {
    if (
      window.confirm(
        `"${row.meeting}" (${formatDisplayDate(row.date)}) ki entry delete karein?`,
      )
    ) {
      onDeleteEntry(row.id);
    }
  };

  return (
    <GlassCard className="p-5 sm:p-6">
      <h3 className="text-sm font-semibold text-white">Souvenir Log</h3>
      <p className="mt-1 mb-4 text-xs text-zinc-500">
        Meeting Title · Souvenirs (exact text) · Date
      </p>

      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-xs font-semibold uppercase tracking-wider text-zinc-400">
              <th className="px-3 py-2.5">Meeting Title</th>
              <th className="px-3 py-2.5">Souvenirs</th>
              <th className="px-3 py-2.5 whitespace-nowrap">Date</th>
              <th className="px-3 py-2.5 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {rows.map((row) => {
              const isEditing = editingId === row.id;
              return (
                <tr
                  key={row.id}
                  className={`hover:bg-white/[0.02] ${
                    isEditing ? 'bg-sky-500/5' : ''
                  }`}
                >
                  <td className="px-3 py-3 font-medium text-zinc-100">{row.meeting}</td>
                  <td className="px-3 py-3 break-safe text-zinc-300">{row.detail}</td>
                  <td className="px-3 py-3 whitespace-nowrap text-zinc-400">
                    {formatDisplayDate(row.date)}
                  </td>
                  <td className="px-3 py-3 text-right">
                    <div className="inline-flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => onEditEntry?.(row)}
                        className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-medium ${
                          isEditing
                            ? 'border-sky-400/50 bg-sky-500/20 text-sky-100'
                            : 'border-sky-500/30 bg-sky-500/10 text-sky-300 hover:bg-sky-500/20'
                        }`}
                        aria-label={`Edit ${row.meeting}`}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(row)}
                        className="inline-flex items-center gap-1 rounded-lg border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-300 hover:bg-red-500/20"
                        aria-label={`Delete ${row.meeting}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ul className="space-y-3 sm:hidden">
        {rows.map((row) => {
          const isEditing = editingId === row.id;
          return (
            <li
              key={row.id}
              className={`rounded-xl border p-4 ${
                isEditing
                  ? 'border-sky-500/30 bg-sky-500/10'
                  : 'border-amber-500/15 bg-amber-500/5'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-zinc-100">{row.meeting}</p>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    {formatDisplayDate(row.date)}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => onEditEntry?.(row)}
                    className={`rounded-lg border p-2 ${
                      isEditing
                        ? 'border-sky-400/50 bg-sky-500/20 text-sky-100'
                        : 'border-sky-500/30 bg-sky-500/10 text-sky-300 hover:bg-sky-500/20'
                    }`}
                    aria-label={`Edit ${row.meeting}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(row)}
                    className="rounded-lg border border-red-500/30 bg-red-500/10 p-2 text-red-300 hover:bg-red-500/20"
                    aria-label={`Delete ${row.meeting}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <p className="mt-2 break-safe text-sm leading-relaxed text-zinc-300">
                {row.detail}
              </p>
            </li>
          );
        })}
      </ul>
    </GlassCard>
  );
}
