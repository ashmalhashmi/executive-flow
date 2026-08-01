import { useMemo, useState } from 'react';
import { Plus, Clock, X, ClipboardList, FileDown, MessageCircle, Pencil } from 'lucide-react';
import GlassCard from '../ui/GlassCard';
import StatusBadge from '../ui/StatusBadge';
import {
  formatDisplayDate,
  formatDisplayTime,
  getRelativeDayLabel,
} from '../../utils/dates';
import { getMeetingBoardWhatsAppUrl, getSingleMeetingWhatsAppUrl } from '../../utils/whatsappShare';

export default function DayAppointmentsPanel({
  selectedDate,
  appointments,
  onScheduleClick,
  onEditMeeting,
  onCancelMeeting,
}) {
  const [busy, setBusy] = useState(false);
  const sorted = [...appointments].sort((a, b) => a.time.localeCompare(b.time));

  const meetingBoardWhatsAppUrl = useMemo(
    () =>
      appointments.length ? getMeetingBoardWhatsAppUrl(selectedDate, appointments) : '',
    [selectedDate, appointments],
  );

  const handleDownloadPdf = async () => {
    setBusy(true);
    try {
      const { downloadMeetingBoardPdf } = await import('../../utils/meetingBoardPdf');
      downloadMeetingBoardPdf({ dateISO: selectedDate, meetings: sorted });
    } finally {
      setBusy(false);
    }
  };

  return (
    <GlassCard className="flex h-full flex-col p-5 sm:p-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-indigo-400/90">
            Selected Day
          </p>
          <h3 className="mt-1 text-lg font-semibold text-white">
            {getRelativeDayLabel(selectedDate)}
          </h3>
          <p className="text-sm text-zinc-500">{formatDisplayDate(selectedDate)}</p>
        </div>
        <button
          type="button"
          onClick={onScheduleClick}
          className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-indigo-500 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-indigo-500/20 hover:bg-indigo-400 sm:w-auto"
        >
          <Plus className="h-4 w-4" />
          Nayi Appointment
        </button>
      </div>

      {sorted.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-white/10 py-12 text-center">
          <Clock className="mb-3 h-10 w-10 text-zinc-600" />
          <p className="text-sm text-zinc-400">Is din koi appointment nahi</p>
          <p className="mt-2 max-w-xs text-xs leading-relaxed text-zinc-600">
            Pehle upar calendar par <strong className="text-zinc-500">woh din tap karein</strong>{' '}
            jis ke liye meeting schedule karni hai (dot = meeting hai), phir &quot;Nayi
            Appointment&quot; dabayein.
          </p>
        </div>
      ) : (
        <>
          <ul className="space-y-2">
            {sorted.map((apt) => (
              <li
                key={apt.id}
                className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="break-safe font-medium text-zinc-100">{apt.title}</p>
                    <p className="mt-1 break-safe text-xs text-zinc-500">
                      {formatDisplayTime(apt.time)}
                      {apt.location ? ` · ${apt.location}` : ''}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:shrink-0 sm:justify-end">
                    <a
                      href={getSingleMeetingWhatsAppUrl(apt, selectedDate)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-lg border border-[#25D366]/40 bg-[#25D366]/10 px-2.5 py-1 text-xs font-medium text-[#25D366] hover:bg-[#25D366]/20"
                      aria-label={`Share ${apt.title} on WhatsApp`}
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                      WhatsApp
                    </a>
                    <StatusBadge status={apt.status} />
                    {onEditMeeting && (
                      <button
                        type="button"
                        onClick={() => onEditMeeting(apt)}
                        className="rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-2.5 py-1 text-xs font-medium text-indigo-300 hover:bg-indigo-500/20"
                        aria-label={`Edit ${apt.title}`}
                      >
                        <span className="inline-flex items-center gap-1">
                          <Pencil className="h-3.5 w-3.5" />
                          Edit
                        </span>
                      </button>
                    )}
                    {onCancelMeeting && (
                      <button
                        type="button"
                        onClick={() => {
                          if (
                            window.confirm(
                              `"${apt.title}" cancel karein? Yeh appointment list se hat jayegi.`,
                            )
                          ) {
                            onCancelMeeting(apt.id);
                          }
                        }}
                        className="rounded-lg border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-300 hover:bg-red-500/20"
                        aria-label={`Cancel ${apt.title}`}
                      >
                        <span className="inline-flex items-center gap-1">
                          <X className="h-3.5 w-3.5" />
                          Cancel
                        </span>
                      </button>
                    )}
                  </div>
                </div>
                {apt.agenda && (
                  <p className="mt-2 break-safe text-xs text-zinc-500">{apt.agenda}</p>
                )}
              </li>
            ))}
          </ul>

          <div
            id="meeting-board"
            className="mt-5 border-t border-white/10 pt-5"
          >
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-emerald-400" />
                <div>
                  <p className="text-sm font-semibold text-white">{formatDisplayDate(selectedDate)}</p>
                  <p className="text-xs text-zinc-500">Sr#, Meeting, Time, Venue</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <a
                  href={meetingBoardWhatsAppUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#20bd5a] sm:w-auto"
                >
                  <MessageCircle className="h-4 w-4" />
                  Share on WhatsApp
                </a>
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  disabled={busy}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-sm font-medium text-emerald-200 hover:bg-emerald-500/20 disabled:opacity-60 sm:w-auto"
                >
                  <FileDown className="h-4 w-4" />
                  {busy ? 'PDF ban rahi hai…' : 'Download PDF'}
                </button>
              </div>
            </div>

            <div className="space-y-2 sm:hidden">
              {sorted.map((meeting, index) => (
                <div
                  key={meeting.id}
                  className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3"
                >
                  <div className="flex items-center justify-between gap-2 text-xs text-zinc-500">
                    <span className="font-semibold text-emerald-300">Sr# {index + 1}</span>
                    <span>{formatDisplayTime(meeting.time)}</span>
                  </div>
                  <p className="mt-2 break-safe text-sm font-medium text-zinc-100">
                    {meeting.title}
                  </p>
                  <p className="mt-1 break-safe text-xs text-zinc-400">
                    Venue: {meeting.location?.trim() || '—'}
                  </p>
                </div>
              ))}
            </div>

            <div className="hidden overflow-x-auto rounded-xl border border-emerald-500/20 bg-emerald-500/5 sm:block">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-zinc-400">
                    <th className="px-3 py-2.5 font-semibold">Sr#</th>
                    <th className="px-3 py-2.5 font-semibold">Meeting</th>
                    <th className="px-3 py-2.5 font-semibold">Time</th>
                    <th className="px-3 py-2.5 font-semibold">Venue</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((meeting, index) => (
                    <tr key={meeting.id} className="border-b border-white/5 last:border-0">
                      <td className="px-3 py-2.5 text-center font-medium text-emerald-300">
                        {index + 1}
                      </td>
                      <td className="px-3 py-2.5 font-medium text-zinc-100">{meeting.title}</td>
                      <td className="px-3 py-2.5 whitespace-nowrap text-zinc-300">
                        {formatDisplayTime(meeting.time)}
                      </td>
                      <td className="px-3 py-2.5 text-zinc-400">
                        {meeting.location?.trim() || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <p className="mt-4 border-t border-white/5 pt-3 text-center text-xs text-zinc-600">
        {sorted.length} appointment{sorted.length !== 1 ? 's' : ''} is din
      </p>
    </GlassCard>
  );
}
