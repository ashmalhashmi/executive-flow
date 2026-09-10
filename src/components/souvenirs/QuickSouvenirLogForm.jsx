import { useState } from 'react';
import { Gift, CheckCircle2, Zap } from 'lucide-react';
import GlassCard from '../ui/GlassCard';
import FormField, { TextInput, TextArea } from '../ui/FormField';
import { getTodayISO } from '../../utils/dates';

/**
 * Standalone souvenir logger — no calendar meeting required.
 */
export default function QuickSouvenirLogForm({ onSave }) {
  const [meetingTitle, setMeetingTitle] = useState('');
  const [date, setDate] = useState(() => getTodayISO());
  const [detail, setDetail] = useState('');
  const [errors, setErrors] = useState({});
  const [saved, setSaved] = useState(false);

  const reset = () => {
    setMeetingTitle('');
    setDate(getTodayISO());
    setDetail('');
    setErrors({});
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const next = {};
    if (!detail.trim()) next.detail = 'Souvenir detail likhna zaroori hai';
    if (!date) next.date = 'Date required';
    setErrors(next);
    if (Object.keys(next).length) return;

    const entry = onSave?.({
      meetingTitle: meetingTitle.trim(),
      date,
      detail: detail.trim(),
    });
    if (!entry) return;

    reset();
    setSaved(true);
    setTimeout(() => setSaved(false), 4000);
  };

  return (
    <GlassCard className="border-amber-500/25 bg-amber-500/5 p-5 sm:p-6">
      <div className="mb-4 flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/15">
          <Zap className="h-5 w-5 text-amber-300" strokeWidth={1.75} />
        </span>
        <div>
          <h3 className="text-sm font-semibold text-white">Quick Log Souvenir</h3>
          <p className="mt-1 text-xs text-zinc-500">
            Kabhi bhi — planned meeting ki zaroorat nahi. Walk-in / surprise visit bhi yahan
            record karein.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <FormField
          label="Occasion / Meeting (optional)"
          id="quick-souv-meeting"
          hint="Khali chhorenge to “Walk-in / Quick log” save hoga"
        >
          <TextInput
            id="quick-souv-meeting"
            value={meetingTitle}
            onChange={(e) => setMeetingTitle(e.target.value)}
            placeholder="e.g. Guest visit — Dr. Ahmed"
          />
        </FormField>

        <FormField label="Date" id="quick-souv-date" error={errors.date}>
          <TextInput
            id="quick-souv-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </FormField>

        <FormField
          label="Souvenir Detail"
          id="quick-souv-detail"
          error={errors.detail}
          hint="Exact text — waisa hi log aur PDF mein dikhega"
        >
          <TextArea
            id="quick-souv-detail"
            rows={3}
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            placeholder="e.g. Crystal Award 1, Branded Pen 2"
          />
        </FormField>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-amber-400"
          >
            <Gift className="h-4 w-4" />
            Log Souvenir
          </button>
          {saved && (
            <p className="flex items-center gap-1.5 text-xs font-medium text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
              Saved to Souvenir Log
            </p>
          )}
        </div>
      </form>
    </GlassCard>
  );
}
