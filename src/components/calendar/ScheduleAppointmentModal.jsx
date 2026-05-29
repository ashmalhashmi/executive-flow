import { useEffect, useState } from 'react';
import { CalendarPlus } from 'lucide-react';
import Modal from '../ui/Modal';
import FormField, { TextInput, TextArea } from '../ui/FormField';
import { formatDisplayDate } from '../../utils/dates';

const EMPTY = {
  title: '',
  time: '10:00',
  agenda: '',
  attendees: '',
};

export default function ScheduleAppointmentModal({
  isOpen,
  onClose,
  dateISO,
  onSchedule,
}) {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isOpen) {
      setForm(EMPTY);
      setErrors({});
    }
  }, [isOpen, dateISO]);

  const update = (field, value) => {
    setForm((p) => ({ ...p, [field]: value }));
    setErrors((p) => ({ ...p, [field]: undefined }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const next = {};
    if (!form.title.trim()) next.title = 'Title zaroori hai';
    if (!form.time) next.time = 'Time select karein';
    if (Object.keys(next).length) {
      setErrors(next);
      return;
    }

    onSchedule({
      title: form.title,
      date: dateISO,
      time: form.time,
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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Appointment Schedule Karein"
      size="lg"
    >
      <p className="-mt-2 mb-4 text-sm text-zinc-500">
        <span className="font-medium text-zinc-400">Date:</span>{' '}
        {formatDisplayDate(dateISO)}
      </p>

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

        <FormField label="Time" id="apt-time" error={errors.time}>
          <TextInput
            id="apt-time"
            type="time"
            value={form.time}
            onChange={(e) => update('time', e.target.value)}
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
            <CalendarPlus className="h-4 w-4" />
            Calendar par Save
          </button>
        </div>
      </form>
    </Modal>
  );
}
