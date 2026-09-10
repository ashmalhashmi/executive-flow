import { Image, MessageCircle, Pencil } from 'lucide-react';
import { formatDisplayDate } from '../../utils/dates';
import { getDakWhatsAppUrl } from '../../utils/dakWhatsApp';

const REGISTER_COLUMNS = [
  { key: 'sr', label: 'Sr#', className: 'w-10 text-center' },
  { key: 'subject', label: 'Subject', className: 'min-w-[140px]' },
  { key: 'forwardedDate', label: 'Date (Dispatched)', className: 'min-w-[110px]' },
  { key: 'receivedDate', label: 'Date Received', className: 'min-w-[110px]' },
  { key: 'designation', label: 'Marked To', className: 'min-w-[100px]' },
  { key: 'actions', label: '', className: 'w-28' },
];

export default function DakRegisterTable({
  entries,
  highlightIds = [],
  onEdit,
}) {
  if (!entries.length) return null;

  const highlightSet = new Set(highlightIds);

  return (
    <div className="-mx-1 overflow-x-auto rounded-xl border border-violet-500/20 bg-black/20">
      <table className="min-w-full border-collapse text-left text-xs">
        <thead>
          <tr className="border-b border-violet-500/25 bg-violet-500/10 text-[10px] uppercase tracking-wider text-violet-200/90">
            {REGISTER_COLUMNS.map((col) => (
              <th key={col.key} className={`px-3 py-2.5 whitespace-nowrap ${col.className || ''}`}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => {
            const isNew = highlightSet.has(entry.id);
            return (
              <tr
                key={entry.id}
                id={`dak-entry-${entry.id}`}
                className={`border-b border-white/5 transition-colors ${
                  isNew ? 'bg-emerald-500/15 ring-1 ring-inset ring-emerald-500/40' : 'hover:bg-white/[0.03]'
                }`}
              >
                <td className="px-3 py-2.5 text-center font-medium text-zinc-300">
                  {entry.registerSr || '—'}
                </td>
                <td className="px-3 py-2.5 font-medium text-zinc-100">
                  {entry.subject}
                  {isNew && (
                    <span className="ml-2 rounded bg-emerald-500/25 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-emerald-200">
                      Saved
                    </span>
                  )}
                </td>
                <td className="px-3 py-2.5 text-zinc-300">
                  {entry.forwardedDate ? formatDisplayDate(entry.forwardedDate) : '—'}
                </td>
                <td className="px-3 py-2.5 text-zinc-400">
                  {entry.receivedDate ? formatDisplayDate(entry.receivedDate) : '—'}
                </td>
                <td className="px-3 py-2.5 text-zinc-300">{entry.designation || '—'}</td>
                <td className="px-3 py-2.5">
                  <div className="flex flex-wrap gap-1">
                    {entry.scanPhotoUrl ? (
                      <a
                        href={entry.scanPhotoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex rounded p-1.5 text-sky-400 hover:bg-white/5"
                        title="Scan photo"
                      >
                        <Image className="h-3.5 w-3.5" />
                      </a>
                    ) : null}
                    <a
                      href={getDakWhatsAppUrl(entry)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex rounded p-1.5 text-[#25D366] hover:bg-white/5"
                      title="WhatsApp"
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                    </a>
                    <button
                      type="button"
                      onClick={() => onEdit?.(entry)}
                      className="inline-flex rounded p-1.5 text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
                      title="Edit"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
