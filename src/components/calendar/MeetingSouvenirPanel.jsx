import { useEffect, useMemo, useState } from 'react';
import { Gift, Lock, CheckCircle2 } from 'lucide-react';
import GlassCard from '../ui/GlassCard';
import FormField, { TextArea } from '../ui/FormField';
import { parseSouvenirPresentationText } from '../../utils/parseSouvenirText';
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

  const parsed = useMemo(() => parseSouvenirPresentationText(rawText), [rawText]);

  const handleSave = () => {
    if (!enabled || !selectedMeeting || parsed.length === 0) return;
    onSavePresentation({
      meetingId: selectedMeeting.id,
      meetingTitle: selectedMeeting.title,
      date: selectedDate,
      rawText: rawText.trim(),
      items: parsed,
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
            Meeting ke baad kitne souvenirs diye — text mein likhein, system alag record
            karega
          </p>
        </div>
      </div>

      {meetingsOnDay.length > 1 && (
        <FormField label="Meeting select karein" id="souv-meeting-pick" className="mb-4">
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
        label="Kitne souvenirs present kiye?"
        id="souv-presentation-text"
        hint='Format: "Crystal Award: 2, Pen: 5" ya "2 portfolios, 3 pens"'
      >
        <TextArea
          id="souv-presentation-text"
          rows={4}
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          placeholder="e.g. Executive Crystal Award: 2, Branded Portfolio: 1, Fountain Pen: 6"
          disabled={!enabled}
        />
      </FormField>

      {parsed.length > 0 && (
        <div className="mb-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-emerald-400/90">
            Parsed records (Souvenir Log mein save honge)
          </p>
          <ul className="space-y-1">
            {parsed.map((item) => (
              <li
                key={item.label}
                className="flex justify-between text-sm text-zinc-300"
              >
                <span>{item.label}</span>
                <span className="tabular-nums font-medium text-emerald-300">
                  {item.quantity}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={handleSave}
          disabled={parsed.length === 0}
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
