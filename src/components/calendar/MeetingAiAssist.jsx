import { useRef, useState } from 'react';
import { Camera, Sparkles } from 'lucide-react';
import { fillMeetingFromBrief, fillMeetingFromInvite } from '../../utils/meetingAiExtract';

export default function MeetingAiAssist({ onApply, onImageKept }) {
  const fileRef = useRef(null);
  const [brief, setBrief] = useState('');
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');

  const run = async (kind, task) => {
    setBusy(kind);
    setError('');
    setMessage('');
    try {
      const result = await task();
      onApply(result.fields || {}, result.invitationImageRef || '');
      if (result.storageWarning) setError(result.storageWarning);
      else setMessage(kind === 'snap' ? 'Invitation save ho gayi aur fields bhar gaye.' : 'Fields bhar gaye. Save se pehle dekh lein.');
    } catch (err) {
      if (err?.invitationImageRef) onImageKept(err.invitationImageRef);
      setError(err?.message || 'AI se fields nahi bhare');
    } finally {
      setBusy('');
    }
  };

  const onPick = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));
    run('snap', () => fillMeetingFromInvite(file));
  };

  return (
    <div className="mb-4 rounded-xl border border-indigo-500/25 bg-indigo-500/10 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-indigo-200">AI se bharen</p>
      <p className="mt-1 text-xs leading-relaxed text-zinc-400">
        Jagah, waqt, aur topic likh dein. Ya invitation ki photo lagayein — photo save hogi aur fields usi se bhar jayenge.
      </p>
      <textarea
        value={brief}
        onChange={(e) => setBrief(e.target.value)}
        rows={3}
        placeholder="e.g. Board room, 3 baje, budget review"
        className="mt-3 w-full resize-y rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-indigo-500/40 focus:outline-none"
      />
      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          disabled={Boolean(busy)}
          onClick={() => run('brief', () => fillMeetingFromBrief(brief))}
          className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-500 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-400 disabled:opacity-50"
        >
          <Sparkles className="h-4 w-4" />
          {busy === 'brief' ? 'AI likh raha hai…' : 'Text se fields bharo'}
        </button>
        <button
          type="button"
          disabled={Boolean(busy)}
          onClick={() => fileRef.current?.click()}
          className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-white/15 px-3 py-2 text-sm font-medium text-zinc-100 hover:bg-white/5 disabled:opacity-50"
        >
          <Camera className="h-4 w-4" />
          {busy === 'snap' ? 'Photo padh raha hai…' : 'Invitation snap'}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          capture="environment"
          className="hidden"
          onChange={onPick}
        />
      </div>
      {previewUrl ? (
        <img src={previewUrl} alt="Invitation preview" className="mt-3 max-h-36 rounded-lg border border-white/10 object-contain" />
      ) : null}
      {message ? <p className="mt-2 text-xs text-emerald-300">{message}</p> : null}
      {error ? <p className="mt-2 text-xs text-rose-300">{error}</p> : null}
    </div>
  );
}
