import { useMemo, useState } from 'react';
import { useExecutive } from '../context/ExecutiveContext';
import CustomCalendar from '../components/calendar/CustomCalendar';
import DayAppointmentsPanel from '../components/calendar/DayAppointmentsPanel';
import ScheduleAppointmentModal from '../components/calendar/ScheduleAppointmentModal';
import MeetingSouvenirPanel from '../components/calendar/MeetingSouvenirPanel';
import { getTodayISO } from '../utils/dates';
import { parseISO } from '../utils/calendar';

export default function ExecutiveCalendar() {
  const { meetings, addMeeting, cancelMeeting, addSouvenirsFromPresentation } =
    useExecutive();
  const today = getTodayISO();
  const todayParts = parseISO(today);

  const [viewYear, setViewYear] = useState(todayParts.year);
  const [viewMonth, setViewMonth] = useState(todayParts.monthIndex);
  const [selectedDate, setSelectedDate] = useState(today);
  const [modalOpen, setModalOpen] = useState(false);

  const calendarMeetings = useMemo(
    () => meetings.filter((m) => m.scheduledViaCalendar === true),
    [meetings],
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

  const handleSchedule = (payload) => {
    addMeeting({ ...payload, scheduledViaCalendar: true });
  };

  return (
    <div className="space-y-6">
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
          <DayAppointmentsPanel
            selectedDate={selectedDate}
            appointments={dayAppointments}
            onScheduleClick={() => setModalOpen(true)}
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
        onClose={() => setModalOpen(false)}
        dateISO={selectedDate}
        onSchedule={handleSchedule}
      />
    </div>
  );
}
