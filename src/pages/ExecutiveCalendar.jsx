import { useMemo, useState } from 'react';
import { FileDown } from 'lucide-react';
import { useMeetingsExecutive, useSouvenirsExecutive } from '../context/ExecutiveContext';
import CustomCalendar from '../components/calendar/CustomCalendar';
import DayAppointmentsPanel from '../components/calendar/DayAppointmentsPanel';
import ScheduleAppointmentModal from '../components/calendar/ScheduleAppointmentModal';
import MeetingSouvenirPanel from '../components/calendar/MeetingSouvenirPanel';
import GlassCard from '../components/ui/GlassCard';
import { formatDisplayDate, getTodayISO } from '../utils/dates';
import { parseISO } from '../utils/calendar';

export default function ExecutiveCalendar() {
  const { meetings, addMeeting, updateMeeting, cancelMeeting } = useMeetingsExecutive();
  const { addSouvenirsFromPresentation } = useSouvenirsExecutive();
  const today = getTodayISO();
  const todayParts = parseISO(today);

  const [viewYear, setViewYear] = useState(todayParts.year);
  const [viewMonth, setViewMonth] = useState(todayParts.monthIndex);
  const [selectedDate, setSelectedDate] = useState(today);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState(null);
  const [logYear, setLogYear] = useState(todayParts.year);
  const [logMonth, setLogMonth] = useState(todayParts.monthIndex);
  const [pdfBusy, setPdfBusy] = useState(false);

  const calendarMeetings = useMemo(
    () => meetings.filter((m) => m.scheduledViaCalendar !== false),
    [meetings],
  );

  const allVisitsSorted = useMemo(
    () =>
      [...calendarMeetings].sort((a, b) =>
        `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`),
      ),
    [calendarMeetings],
  );

  const appointmentCounts = useMemo(() => {
    const counts = {};
    calendarMeetings.forEach((m) => {
      if (m.status !== 'Completed') {
        counts[m.date] = (counts[m.date] || 0) + 1;
      }
    });
    return counts;
  }, [calendarMeetings]);

  const dayAppointments = useMemo(
    () =>
      calendarMeetings
        .filter((m) => m.date === selectedDate && m.status !== 'Completed')
        .sort((a, b) => a.time.localeCompare(b.time)),
    [calendarMeetings, selectedDate],
  );

  const logYears = useMemo(() => {
    const years = Array.from(
      new Set(
        calendarMeetings
          .map((m) => Number((m.date || '').slice(0, 4)))
          .filter((y) => Number.isFinite(y) && y > 0),
      ),
    ).sort((a, b) => b - a);

    return years.length ? years : [todayParts.year];
  }, [calendarMeetings, todayParts.year]);

  const monthOptions = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => ({
        value: i,
        label: new Date(2000, i, 1).toLocaleDateString('en-US', { month: 'long' }),
      })),
    [],
  );

  const monthRecordCount = useMemo(
    () =>
      calendarMeetings.filter((m) => {
        const parts = parseISO(m.date);
        return parts.year === logYear && parts.monthIndex === logMonth;
      }).length,
    [calendarMeetings, logMonth, logYear],
  );

  const goPrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else setViewMonth((m) => m - 1);
  };

  const goNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else setViewMonth((m) => m + 1);
  };

  const goToday = () => {
    const p = parseISO(getTodayISO());
    setViewYear(p.year);
    setViewMonth(p.monthIndex);
    setSelectedDate(getTodayISO());
  };

  const openScheduleModal = () => {
    setEditingMeeting(null);
    setModalOpen(true);
  };

  const openEditModal = (meeting) => {
    setEditingMeeting(meeting);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingMeeting(null);
  };

  const handleSchedule = (payload) => {
    const { meetingId, ...data } = payload;
    if (meetingId) {
      updateMeeting(meetingId, data);
    } else {
      addMeeting({ ...data, scheduledViaCalendar: true });
    }
    setSelectedDate(data.date);
    const viewParts = parseISO(data.date);
    setViewYear(viewParts.year);
    setViewMonth(viewParts.monthIndex);
    window.setTimeout(() => {
      document.getElementById('meeting-board')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 150);
  };

  const jumpToMeetingDate = (dateISO) => {
    if (!dateISO) return;
    setSelectedDate(dateISO);
    const parts = parseISO(dateISO);
    setViewYear(parts.year);
    setViewMonth(parts.monthIndex);
    document.getElementById('meeting-board')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleDownloadMeetingLog = async () => {
    if (!monthRecordCount) return;
    setPdfBusy(true);
    try {
      const { downloadMonthlyMeetingLogPdf } = await import('../utils/monthlyMeetingLogPdf');
      downloadMonthlyMeetingLogPdf({
        meetings: calendarMeetings,
        year: logYear,
        monthIndex: logMonth,
      });
    } finally {
      setPdfBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      {allVisitsSorted.length > 0 && (
        <GlassCard className="border-indigo-500/20 bg-indigo-500/5 p-4 sm:p-5">
          <p className="text-sm font-medium text-indigo-200">
            Visit Log — {allVisitsSorted.length} meetings saved
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            Neeche se meeting dabayein — calendar us date par khul jayega.
          </p>
          <ul className="custom-scrollbar mt-3 max-h-48 space-y-1 overflow-y-auto sm:max-h-56">
            {allVisitsSorted.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => jumpToMeetingDate(m.date)}
                  className="flex w-full items-center justify-between gap-2 rounded-lg border border-white/5 bg-black/20 px-3 py-2 text-left text-sm hover:border-indigo-500/30 hover:bg-indigo-500/10"
                >
                  <span className="min-w-0 truncate font-medium text-zinc-100">{m.title}</span>
                  <span className="shrink-0 text-xs text-zinc-500">
                    {formatDisplayDate(m.date)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </GlassCard>
      )}

      <div className="grid gap-6 xl:grid-cols-5">
        <div className="xl:col-span-3">
          <CustomCalendar
            year={viewYear}
            monthIndex={viewMonth}
            selectedDate={selectedDate}
            appointmentCounts={appointmentCounts}
            onSelectDate={setSelectedDate}
            onPrevMonth={goPrevMonth}
            onNextMonth={goNextMonth}
            onToday={goToday}
          />
        </div>
        <div className="xl:col-span-2 space-y-6">
          <GlassCard className="p-5">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
              Monthly Meeting Log PDF
            </h3>
            <p className="mt-1 text-xs text-zinc-500">
              Year-Month select karein, phir us month ka meeting log PDF ban jayega.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="text-xs text-zinc-400">
                Year
                <select
                  value={logYear}
                  onChange={(e) => setLogYear(Number(e.target.value))}
                  className="mt-1 block w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-sm text-zinc-100 shadow-sm outline-none ring-0 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/40"
                >
                  {logYears.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs text-zinc-400">
                Month
                <select
                  value={logMonth}
                  onChange={(e) => setLogMonth(Number(e.target.value))}
                  className="mt-1 block w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-sm text-zinc-100 shadow-sm outline-none ring-0 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/40"
                >
                  {monthOptions.map((month) => (
                    <option key={month.value} value={month.value}>
                      {month.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <button
              type="button"
              onClick={handleDownloadMeetingLog}
              disabled={pdfBusy || monthRecordCount === 0}
              className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl border border-sky-500/30 bg-sky-500/10 px-4 py-2.5 text-sm font-medium text-sky-200 hover:bg-sky-500/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FileDown className="h-4 w-4" />
              {pdfBusy ? 'PDF ban rahi hai…' : `Generate Meeting Log (${monthRecordCount})`}
            </button>
          </GlassCard>

          <DayAppointmentsPanel
            selectedDate={selectedDate}
            appointments={dayAppointments}
            onScheduleClick={openScheduleModal}
            onEditMeeting={openEditModal}
            onCancelMeeting={cancelMeeting}
          />
          <MeetingSouvenirPanel
            selectedDate={selectedDate}
            meetingsOnDay={dayAppointments}
            onSavePresentation={addSouvenirsFromPresentation}
          />
        </div>
      </div>

      <ScheduleAppointmentModal
        isOpen={modalOpen}
        onClose={closeModal}
        dateISO={selectedDate}
        meeting={editingMeeting}
        onSchedule={handleSchedule}
      />
    </div>
  );
}
