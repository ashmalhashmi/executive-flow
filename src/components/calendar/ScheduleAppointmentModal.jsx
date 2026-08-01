import { useEffect, useState } from 'react';
import { CalendarPlus, Save } from 'lucide-react';
import Modal from '../ui/Modal';
import FormField, { TextInput, TextArea, SelectInput } from '../ui/FormField';
import { formatDisplayDate, fromTime24, toTime24 } from '../../utils/dates';

const EMPTY = {
  title: '',
  date: '',
  hour: '10',
  minute: '00',
  period: '',
  location: '',
  agenda: '',
  attendees: '',
};

const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

function meetingToForm(meeting) {
  const t = fromTime24(meeting.time || '10:00');
  return {
    title: meeting.title || '',
    date: meeting.date || '',
    hour: t.hour,
    minute: t.minute,
    period: t.period,
    location: meeting.location || '',
    agenda: meeting.agenda || '',
    attendees: (meeting.attendees || []).join(', '),
  };
}

export default function ScheduleAppointmentModal({
  isOpen,
  onClose,
  dateISO,
  meeting = null,
  onSchedule,
}) {
  const isEdit = Boolean(meeting?.id);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!isOpen) return;
    if (meeting) {
      setForm(meetingToForm(meeting));
    } else {
      setForm({ ...EMPTY, date: dateISO });
    }
    setErrors({});
  }, [isOpen, dateISO, meeting]);

  const update = (field, value) => {
    setForm((p) => ({ ...p, [field]: value }));
    setErrors((p) => ({ ...p, [field]: undefined, time: undefined }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const next = {};
    if (!form.title.trim()) next.title = 'Title zaroori hai';
    if (!form.hour) next.time = 'Ghanta select karein';
    if (!form.minute) next.time = 'Minute select karein';
    if (form.period !== 'AM' && form.period !== 'PM') {
      next.period = 'AM ya PM select karein — subah hai ya sham?';
    }
    const meetingDate = isEdit ? form.date : dateISO;
    if (!meetingDate) next.date = 'Date select karein';
    if (Object.keys(next).length) {
      setErrors(next);
      return;
    }

    const time = toTime24(form.hour, form.minute, form.period);
    if (!time) {
      setErrors({ time: 'Time sahi select karein' });
      return;
    }

    onSchedule({
      meetingId: meeting?.id,
      title: form.title,
      date: meetingDate,
      time,
      location: form.location,
      agenda: form.agenda,
      attendees: form.attendees
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      automateReminders: true,
      scheduledViaCalendar: true,
    });
    onClose();
  };

  const periodBtnClass = (active) =>
    [
      'flex-1 rounded-xl border px-4 py-3 text-sm font-semibold transition',
      active
        ? 'border-indigo-400/50 bg-indigo-500/25 text-white shadow-inner'
        : 'border-white/10 bg-white/5 text-zinc-400 hover:bg-white/10',
    ].join(' ');

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Appointment Edit Karein' : 'Appointment Schedule Karein'}
      size="lg"
    >
      {isEdit ? (
        <FormField label="Date" id="apt-date" error={errors.date} className="-mt-2 mb-4">
          <TextInput
            id="apt-date"
            type="date"
            value={form.date}
            onChange={(e) => update('date', e.target.value)}
          />
        </FormField>
      ) : (
        <p className="-mt-2 mb-4 text-sm text-zinc-500">
          <span className="font-medium text-zinc-400">Date:</span>{' '}
          {formatDisplayDate(dateISO)}
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label="Appointment / Meeting Title" id="apt-title" error={errors.title}>
          <TextInput
            id="apt-title"
            value={form.title}
            onChange={(e) => update('title', e.target.value)}
            placeholder="e.g. Client call, Board review"
            autoFocus
          />
        </FormField>

        <FormField
          label="Meeting Time"
          id="apt-hour"
          error={errors.time}
          hint="Pehle ghanta/minute, phir AM (subah) ya PM (sham) zaroor select karein"
        >
          <div className="grid grid-cols-2 gap-2">
            <SelectInput
              id="apt-hour"
              value={form.hour}
              onChange={(e) => update('hour', e.target.value)}
              aria-label="Hour"
            >
              <option value="">Ghanta</option>
              {HOURS.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </SelectInput>
            <SelectInput
              id="apt-minute"
              value={form.minute}
              onChange={(e) => update('minute', e.target.value)}
              aria-label="Minute"
            >
              <option value="">Minute</option>
              {MINUTES.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </SelectInput>
            <button
              type="button"
              onClick={() => update('period', 'AM')}
              className={`${periodBtnClass(form.period === 'AM')} col-span-1`}
            >
              AM
              <span className="mt-0.5 block text-[10px] font-normal text-zinc-400">Subah</span>
            </button>
            <button
              type="button"
              onClick={() => update('period', 'PM')}
              className={`${periodBtnClass(form.period === 'PM')} col-span-1`}
            >
              PM
              <span className="mt-0.5 block text-[10px] font-normal text-zinc-400">Sham</span>
            </button>
          </div>
          {errors.period && <p className="mt-1.5 text-xs text-rose-400">{errors.period}</p>}
          {form.period && form.hour && form.minute && (
            <p className="mt-2 text-xs text-indigo-300">
              Selected: {form.hour}:{form.minute} {form.period}
            </p>
          )}
        </FormField>

        <FormField label="Location" id="apt-location" hint="Meeting venue / room / address">
          <TextInput
            id="apt-location"
            value={form.location}
            onChange={(e) => update('location', e.target.value)}
            placeholder="e.g. Board Room, Floor 3 — Islamabad"
          />
        </FormField>

        <FormField label="Notes / Agenda (optional)" id="apt-agenda">
          <TextArea
            id="apt-agenda"
            rows={3}
            value={form.agenda}
            onChange={(e) => update('agenda', e.target.value)}
            placeholder="Discussion points…"
          />
        </FormField>

        <FormField label="Attendees (optional)" id="apt-attendees" hint="Comma-separated">
          <TextInput
            id="apt-attendees"
            value={form.attendees}
            onChange={(e) => update('attendees', e.target.value)}
            placeholder="Name 1, Name 2"
          />
        </FormField>

        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/10 px-4 py-2.5 text-sm text-zinc-400 hover:bg-white/5"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-400"
          >
            {isEdit ? (
              <>
                <Save className="h-4 w-4" />
                Save Changes
              </>
            ) : (
              <>
                <CalendarPlus className="h-4 w-4" />
                Calendar par Save
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
