import { useRef, useState } from 'react';
import { ArrowRight, ClipboardPaste, ImagePlus, Loader2, Zap } from 'lucide-react';
import GlassCard from '../ui/GlassCard';
import { extractContactWithAi } from '../../utils/contactAiExtract';
import ContactCaptureVerifyModal from './ContactCaptureVerifyModal';

const STEPS = [
  { id: 'capture', label: 'Capture', color: 'text-amber-300' },
  { id: 'verify', label: 'Verify', color: 'text-cyan-300' },
  { id: 'sync', label: 'Sync', color: 'text-emerald-300' },
];

export default function ContactCaptureLoop({ contacts, onSaveContact }) {
  const [rawText, setRawText] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imageName, setImageName] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [previewContact, setPreviewContact] = useState(null);
  const [extractVia, setExtractVia] = useState('ai');
  const imageRef = useRef(null);

  const handlePaste = async () => {
    try {
      const clip = await navigator.clipboard.readText();
      if (clip?.trim()) {
        setRawText(clip.trim());
        setMessage('');
      } else {
        setMessage('Clipboard khali hai');
      }
    } catch {
      setMessage('Clipboard access nahi mila — manually paste karein');
    }
  };

  const handleImage = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImageName(file.name);
    setMessage('');
  };

  const handleCapture = async () => {
    setBusy(true);
    setMessage('');
    try {
      const result = await extractContactWithAi({ text: rawText, imageFile });
      setPreviewContact(result.contact);
      setExtractVia(result.via || 'ai');
      setVerifyOpen(true);
      if (result.warning) setMessage(result.warning);
    } catch (err) {
      setMessage(err.message || 'Capture failed');
    } finally {
      setBusy(false);
    }
  };

  const handleSync = async (payload) => {
    const saved = onSaveContact(payload);
    if (saved) {
      setRawText('');
      setImageFile(null);
      setImageName('');
      if (imageRef.current) imageRef.current.value = '';
      setMessage('Synced ✓ — contact saved, Sheet sync background mein');
    }
    return saved;
  };

  return (
    <>
      <GlassCard className="border-amber-500/25 bg-gradient-to-br from-amber-500/10 to-emerald-500/5 p-5 sm:p-6">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/15">
              <Zap className="h-5 w-5 text-amber-300" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-400/90">
                Capture → Verify → Sync
              </p>
              <p className="text-sm text-zinc-500">
                Card / WhatsApp / OCR text — abhi capture karo, baad mein mat choro
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs font-medium">
            {STEPS.map((step, i) => (
              <span key={step.id} className="flex items-center gap-1">
                <span className={step.color}>{step.label}</span>
                {i < STEPS.length - 1 && <ArrowRight className="h-3 w-3 text-zinc-600" />}
              </span>
            ))}
          </div>
        </div>

        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-amber-300/80">
          Step 1 — Capture
        </p>
        <label htmlFor="capture-raw-text" className="sr-only">
          Messy contact text
        </label>
        <textarea
          id="capture-raw-text"
          rows={4}
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          placeholder="Card text, WhatsApp forward, ya PDF copy-paste — turant yahan daalo"
          className="w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2.5 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/30"
        />

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handlePaste}
            className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-zinc-200 hover:bg-white/10"
          >
            <ClipboardPaste className="h-4 w-4" />
            Paste clipboard
          </button>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-zinc-200 hover:bg-white/10">
            <ImagePlus className="h-4 w-4" />
            {imageName || 'Card photo'}
            <input
              ref={imageRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={handleImage}
            />
          </label>
          <button
            type="button"
            onClick={handleCapture}
            disabled={busy || (!rawText.trim() && !imageFile)}
            className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
            Capture &amp; Parse
          </button>
        </div>

        {message && <p className="mt-3 text-sm text-zinc-400">{message}</p>}
      </GlassCard>

      <ContactCaptureVerifyModal
        isOpen={verifyOpen}
        onClose={() => setVerifyOpen(false)}
        initialContact={previewContact}
        contacts={contacts}
        onConfirm={handleSync}
        extractVia={extractVia}
      />
    </>
  );
}
