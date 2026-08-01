import { useEffect, useMemo, useState } from 'react';
import { Gift, Lock, CheckCircle2 } from 'lucide-react';
import GlassCard from '../ui/GlassCard';
import FormField, { TextArea } from '../ui/FormField';
import { formatDisplayTime } from '../../utils/dates';

export default function MeetingSouvenirPanel({
  selectedDate,
  meetingsOnDay,
  onSavePresentation,
}) {
  const enabled = meetingsOnDay.length > 0;
  const [selectedMeetingId, setSelectedMeetingId] = useState('');
  const [rawText, setRawText] = useState('');
  const [saved, setSaved] = useState(false);

  const selectedMeeting = useMemo(
    () => meetingsOnDay.find((m) => m.id === selectedMeetingId) ?? meetingsOnDay[0],
    [meetingsOnDay, selectedMeetingId],
  );

  useEffect(() => {
    if (meetingsOnDay[0]) {
      setSelectedMeetingId(meetingsOnDay[0].id);
    } else {
      setSelectedMeetingId('');
    }
    setRawText('');
    setSaved(false);
  }, [selectedDate, meetingsOnDay]);

  const canSave = rawText.trim().length > 0;

  const handleSave = () => {
    if (!enabled || !selectedMeeting || !canSave) return;
    onSavePresentation({
      meetingId: selectedMeeting.id,
      meetingTitle: selectedMeeting.title,
      date: selectedDate,
      rawText: rawText.trim(),
    });
    setRawText('');
    setSaved(true);
    setTimeout(() => setSaved(false), 4000);
  };

  if (!enabled) {
    return (
      <GlassCard className="border-zinc-700/50 bg-zinc-900/50 p-5 opacity-80">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-zinc-600/50 bg-zinc-800/80">
            <Lock className="h-5 w-5 text-zinc-600" />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-zinc-500">
              Souvenirs Presented (disabled)
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-zinc-600">
              Yeh option sirf un dinon par enable hoti hai jab{' '}
              <strong className="text-zinc-500">Executive Flow Calendar</strong> par meeting
              schedule ho. Pehle is din appointment add karein.
            </p>
          </div>
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="border-amber-500/25 bg-amber-500/5 p-5 sm:p-6">
      <div className="mb-4 flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/15">
          <Gift className="h-5 w-5 text-amber-300" strokeWidth={1.75} />
        </span>
        <div>
          <h3 className="text-sm font-semibold text-white">Souvenirs Presented</h3>
          <p className="mt-1 text-xs text-zinc-500">
            Jo likhein wahi Souvenir Log aur Google Sheet mein save hoga
          </p>
        </div>
      </div>

      {meetingsOnDay.length > 1 && (
        <FormField label="Meeting" id="souv-meeting-pick" className="mb-4">
          <select
            id="souv-meeting-pick"
            value={selectedMeeting?.id ?? ''}
            onChange={(e) => setSelectedMeetingId(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-zinc-100 focus:border-amber-500/40 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
          >
            {meetingsOnDay.map((m) => (
              <option key={m.id} value={m.id} className="bg-zinc-900">
                {m.title} · {formatDisplayTime(m.time)}
              </option>
            ))}
          </select>
        </FormField>
      )}

      <FormField
        label="Detail"
        id="souv-presentation-text"
        hint="Exact text likhein — parse nahi hoga, waisa hi save hoga"
      >
        <TextArea
          id="souv-presentation-text"
          rows={4}
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          placeholder="e.g. Crystal Award 2, Branded Portfolio 1, Fountain Pen 6"
          disabled={!enabled}
        />
      </FormField>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={handleSave}
          disabled={!canSave}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Gift className="h-4 w-4" />
          Souvenir Log mein save
        </button>
        {saved && (
          <p className="flex items-center gap-1.5 text-xs font-medium text-emerald-400">
            <CheckCircle2 className="h-4 w-4" />
            Saved — Souvenir Log dekhein
          </p>
        )}
      </div>
    </GlassCard>
  );
}
