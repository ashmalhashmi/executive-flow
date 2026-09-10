import { useEffect, useMemo, useState } from 'react';
import { Gift, CheckCircle2 } from 'lucide-react';
import GlassCard from '../ui/GlassCard';
import FormField, { TextArea, TextInput } from '../ui/FormField';
import { formatDisplayTime } from '../../utils/dates';

/**
 * Calendar-side convenience logger.
 * Meeting on that day is optional — free-text occasion works anytime.
 */
export default function MeetingSouvenirPanel({
  selectedDate,
  meetingsOnDay,
  onSavePresentation,
}) {
  const hasMeetings = meetingsOnDay.length > 0;
  const [selectedMeetingId, setSelectedMeetingId] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [rawText, setRawText] = useState('');
  const [saved, setSaved] = useState(false);

  const selectedMeeting = useMemo(
    () => meetingsOnDay.find((m) => m.id === selectedMeetingId) ?? null,
    [meetingsOnDay, selectedMeetingId],
  );

  useEffect(() => {
    if (meetingsOnDay[0]) {
      setSelectedMeetingId(meetingsOnDay[0].id);
    } else {
      setSelectedMeetingId('');
    }
    setCustomTitle('');
    setRawText('');
    setSaved(false);
  }, [selectedDate, meetingsOnDay]);

  const meetingTitle = hasMeetings
    ? selectedMeeting?.title || customTitle.trim()
    : customTitle.trim();

  const canSave = rawText.trim().length > 0;

  const handleSave = () => {
    if (!canSave) return;
    onSavePresentation({
      meetingId: selectedMeeting?.id,
      meetingTitle: meetingTitle || 'Walk-in / Quick log',
      date: selectedDate,
      rawText: rawText.trim(),
    });
    setRawText('');
    if (!hasMeetings) setCustomTitle('');
    setSaved(true);
    setTimeout(() => setSaved(false), 4000);
  };

  return (
    <GlassCard className="border-amber-500/25 bg-amber-500/5 p-5 sm:p-6">
      <div className="mb-4 flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/15">
          <Gift className="h-5 w-5 text-amber-300" strokeWidth={1.75} />
        </span>
        <div>
          <h3 className="text-sm font-semibold text-white">Log Souvenir</h3>
          <p className="mt-1 text-xs text-zinc-500">
            Calendar meeting optional — spontaneous visit bhi yahan save ho sakti hai. Ya{' '}
            <span className="text-zinc-400">Souvenir Log → Quick Log</span> use karein.
          </p>
        </div>
      </div>

      {hasMeetings ? (
        <FormField label="Meeting (optional pick)" id="souv-meeting-pick" className="mb-4">
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
      ) : (
        <FormField
          label="Occasion / Guest (optional)"
          id="souv-custom-title"
          className="mb-4"
          hint="Is din koi calendar meeting nahi — phir bhi log kar sakte hain"
        >
          <TextInput
            id="souv-custom-title"
            value={customTitle}
            onChange={(e) => setCustomTitle(e.target.value)}
            placeholder="e.g. Walk-in — supplier visit"
          />
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
          Log Souvenir
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
