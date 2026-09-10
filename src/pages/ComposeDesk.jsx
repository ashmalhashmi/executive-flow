import { useMemo, useState } from 'react';
import {
  PenLine,
  Sparkles,
  Loader2,
  Copy,
  CheckCircle2,
  FileDown,
  FileType,
  Mail,
  RotateCcw,
  Lightbulb,
  Paperclip,
  X,
} from 'lucide-react';
import GlassCard from '../components/ui/GlassCard';
import FormField, { TextInput, TextArea } from '../components/ui/FormField';
import { COMPOSE_LETTERHEAD } from '../constants/composeLetterhead';
import {
  COMPOSE_CORRESPONDENCE_TYPES,
  COMPOSE_PURPOSES,
  COMPOSE_TONES,
  COMPOSE_LANGUAGES,
  COMPOSE_REFERENCE_MODES,
  COMPOSE_PRESENTATION_PRESETS,
  EMPTY_COMPOSE_INTENT,
} from '../constants/composePurposes';
import { composeIntentIsReady } from '../utils/composeDraft';
import {
  generateComposeDraft,
  improveComposeDraftWithAi,
  extractReferenceWithAi,
} from '../utils/composeAiDraft';
import { sendComposeLetterEmail } from '../utils/composeLetterEmail';
import Toggle from '../components/ui/Toggle';

const EMAIL_STORAGE_KEY = 'executive_flow_compose_email';

function loadComposeEmail() {
  try {
    return String(localStorage.getItem(EMAIL_STORAGE_KEY) || '').trim();
  } catch {
    return '';
  }
}

function saveComposeEmail(email) {
  try {
    localStorage.setItem(EMAIL_STORAGE_KEY, String(email || '').trim());
  } catch {
    /* ignore */
  }
}
const selectClass =
  'w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-zinc-100 focus:border-indigo-500/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/20';

const MAX_ATTACH_BYTES = 4 * 1024 * 1024; // 4 MB session attach

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('File read fail'));
    reader.readAsDataURL(file);
  });
}

export default function ComposeDesk() {
  const [intent, setIntent] = useState({ ...EMPTY_COMPOSE_INTENT });
  const [draft, setDraft] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState(false);
  /** Session-only enclosure for PDF */
  const [referenceAttachment, setReferenceAttachment] = useState(null);
  const [useAi, setUseAi] = useState(true);
  const [extractBusy, setExtractBusy] = useState(false);
  const [improveBusy, setImproveBusy] = useState(false);
  const [emailTo, setEmailTo] = useState(() => loadComposeEmail());
  const [emailBusy, setEmailBusy] = useState(false);

  const intentReady = useMemo(() => composeIntentIsReady(intent), [intent]);
  const showCiteFields =
    intent.referenceMode === 'cite' || intent.referenceMode === 'both';
  const showAttachField =
    intent.referenceMode === 'attach' || intent.referenceMode === 'both';

  const update = (field, value) => {
    setIntent((prev) => ({ ...prev, [field]: value }));
    setMessage('');
  };

  const handleReferenceMode = (mode) => {
    setMessage('');
    if (mode === 'none' || mode === 'cite') {
      setReferenceAttachment(null);
      setIntent((prev) => ({
        ...prev,
        referenceMode: mode,
        referenceFileName: '',
      }));
      return;
    }
    setIntent((prev) => ({ ...prev, referenceMode: mode }));
  };

  const handleAttachFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > MAX_ATTACH_BYTES) {
      setMessage('Attachment max 4 MB — chhoti scan/PDF use karein.');
      return;
    }
    const okType =
      file.type.startsWith('image/') ||
      file.type === 'application/pdf' ||
      file.type === 'application/msword' ||
      file.type ===
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      /\.(pdf|png|jpe?g|webp|docx?)$/i.test(file.name);
    if (!okType) {
      setMessage('Sirf PDF, Word (.doc/.docx), ya image (JPG/PNG) attach karein.');
      return;
    }
    try {
      const dataUrl = await readFileAsDataUrl(file);
      setReferenceAttachment({
        name: file.name,
        mimeType: file.type || 'application/octet-stream',
        dataUrl,
      });
      setIntent((prev) => ({ ...prev, referenceFileName: file.name }));
      setMessage(`Attached: ${file.name}`);
    } catch {
      setMessage('File read nahi hui — dobara try karein.');
    }
  };

  const clearAttachment = () => {
    setReferenceAttachment(null);
    setIntent((prev) => ({ ...prev, referenceFileName: '' }));
  };

  const handleAiExtractReference = async () => {
    if (!referenceAttachment?.dataUrl) {
      setMessage('Pehle reference letter ki image (JPG/PNG) attach karein.');
      return;
    }
    setExtractBusy(true);
    setMessage('');
    try {
      const extracted = await extractReferenceWithAi({
        dataUrl: referenceAttachment.dataUrl,
        mimeType: referenceAttachment.mimeType,
      });
      setIntent((prev) => ({
        ...prev,
        referenceMode: prev.referenceMode === 'attach' ? 'both' : prev.referenceMode,
        referenceLetterNo: extracted.referenceLetterNo || prev.referenceLetterNo,
        referenceDate: extracted.referenceDate || prev.referenceDate,
      }));
      if (!extracted.referenceLetterNo && !extracted.referenceDate) {
        setMessage('AI ne Letter No./Date nahi padhi — manually likhein ya clear scan try karein.');
      } else {
        setMessage(
          `AI extract: No. ${extracted.referenceLetterNo || '—'} · Date ${extracted.referenceDate || '—'}`,
        );
      }
    } catch (err) {
      setMessage(err.message || 'AI extract fail');
    } finally {
      setExtractBusy(false);
    }
  };

  const handleGenerate = async () => {
    if (!intentReady) {
      setMessage('Pehle 2–3 Core Ideas (Intent) likhein — yahi 20% value hai.');
      return;
    }
    if (
      (intent.referenceMode === 'cite' || intent.referenceMode === 'both') &&
      !intent.referenceLetterNo.trim() &&
      !intent.referenceDate.trim()
    ) {
      setMessage('Reference details: Letter No. ya Date likhein.');
      return;
    }
    if (
      (intent.referenceMode === 'attach' || intent.referenceMode === 'both') &&
      !referenceAttachment
    ) {
      setMessage('Reference attach mode: pehle file choose karein.');
      return;
    }

    setBusy(true);
    setMessage('');
    try {
      const payload = {
        ...intent,
        referenceFileName: referenceAttachment?.name || intent.referenceFileName || '',
      };
      const next = await generateComposeDraft(payload, { useAi });
      setDraft(next);
      if (next.via === 'ai') {
        setMessage('AI draft ready — check karke Copy / PDF / Improve with AI use karein.');
      } else {
        setMessage(next.warning || 'Local template se draft ready.');
      }
    } finally {
      setBusy(false);
    }
  };

  const handleImproveAi = async () => {
    if (!draft?.body) return;
    setImproveBusy(true);
    setMessage('');
    try {
      const next = await improveComposeDraftWithAi({ intent, draft });
      setDraft(next);
      setMessage('AI ne draft improve kar diya — facts check karke export karein.');
    } catch (err) {
      setMessage(err.message || 'AI improve fail');
    } finally {
      setImproveBusy(false);
    }
  };

  const handleCopy = async () => {
    if (!draft?.body) return;
    try {
      await navigator.clipboard.writeText(draft.body);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setMessage('Copy fail — text select karke manually copy karein.');
    }
  };

  const handlePdf = async () => {
    if (!draft?.body) return;
    const { downloadComposeLetterPdf } = await import('../utils/composeLetterPdf');
    await downloadComposeLetterPdf({
      subject: draft.subject,
      body: draft.body,
      letterNo: draft.letterNo || intent.letterNo,
      attachPafdaHeader: Boolean(intent.attachPafdaHeader),
      referenceAttachment:
        intent.referenceMode === 'attach' || intent.referenceMode === 'both'
          ? referenceAttachment
          : null,
    });
  };

  const handleWord = async () => {
    if (!draft?.body) return;
    const { downloadComposeLetterWord } = await import('../utils/composeLetterDoc');
    await downloadComposeLetterWord({
      subject: draft.subject,
      body: draft.body,
      letterNo: draft.letterNo || intent.letterNo,
      attachPafdaHeader: Boolean(intent.attachPafdaHeader),
    });
  };

  const handleEmail = async () => {
    if (!draft?.body) return;
    const to = emailTo.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      setMessage('Pehle valid email address likhein.');
      return;
    }
    setEmailBusy(true);
    setMessage('');
    try {
      const result = await sendComposeLetterEmail({
        email: to,
        subject: draft.subject,
        body: draft.body,
        letterNo: draft.letterNo || intent.letterNo,
        attachPafdaHeader: Boolean(intent.attachPafdaHeader),
      });
      saveComposeEmail(to);
      setMessage(
        `Word letter email ho gayi → ${to}${result.filename ? ` (${result.filename})` : ''}. Inbox check karein.`,
      );
    } catch (err) {
      setMessage(err.message || 'Email fail — RESEND_API_KEY / login check karein.');
    } finally {
      setEmailBusy(false);
    }
  };

  const handleReset = () => {
    setIntent({ ...EMPTY_COMPOSE_INTENT });
    setDraft(null);
    setMessage('');
    setReferenceAttachment(null);
  };

  return (
    <div className="space-y-6">
      <GlassCard className="border-indigo-500/20 bg-indigo-500/5 p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-indigo-500/30 bg-indigo-500/15">
            <PenLine className="h-5 w-5 text-indigo-300" strokeWidth={1.75} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-white">Compose Desk</h2>
            <ol className="mt-3 space-y-2.5 text-xs leading-relaxed text-zinc-400">
              <li>
                <span className="font-medium text-zinc-200">1. Metadata —</span>{' '}
                Pehle Intent (Letter / Note Sheet) select karein, phir purpose, addressee,
                reference/PUC, aur PAFDA header define karein.
              </li>
              <li>
                <span className="font-medium text-zinc-200">2. Content —</span>{' '}
                Core ideas, tone, language, aur presentation style (tables / lists) choose
                karein.
              </li>
              <li>
                <span className="font-medium text-zinc-200">3. Generate —</span>{' '}
                Generate se AI ya local template slots bharta hai aur official blueprint mein
                format karta hai.
              </li>
              <li>
                <span className="font-medium text-zinc-200">4. Refine &amp; export —</span>{' '}
                Draft review/edit karein; Copy, PDF, Word, ya Email se nikaalein.
              </li>
            </ol>
          </div>
        </div>
      </GlassCard>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* INTENT — human 20% */}
        <GlassCard className="p-5 sm:p-6">
          <div className="mb-4 flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-amber-300" />
            <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
              1 · Intent (aap ka kaam)
            </h3>
          </div>

          <div className="space-y-4">
            <FormField
              label="Type of correspondence"
              id="compose-corr-type"
              hint="Letter = bahar bhejni wali · Note Sheet = file pe internal noting"
            >
              <select
                id="compose-corr-type"
                value={intent.correspondenceType || 'letter'}
                onChange={(e) => {
                  update('correspondenceType', e.target.value);
                }}
                className={selectClass}
              >
                {COMPOSE_CORRESPONDENCE_TYPES.map((t) => (
                  <option key={t.id} value={t.id} className="bg-zinc-900">
                    {t.label} — {t.description}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Purpose" id="compose-purpose">
              <select
                id="compose-purpose"
                value={intent.purpose}
                onChange={(e) => update('purpose', e.target.value)}
                className={selectClass}
              >
                {COMPOSE_PURPOSES.map((p) => (
                  <option key={p.id} value={p.id} className="bg-zinc-900">
                    {p.label} — {p.description}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField
              label={
                intent.correspondenceType === 'note_sheet' ? 'File No. (optional)' : 'Letter No.'
              }
              id="compose-letter-no"
              hint={
                intent.correspondenceType === 'note_sheet'
                  ? 'Note sheet pe File No. — blank bhi chalega'
                  : 'Draft mein pehle No., uske bilkul neeche Date aayegi'
              }
            >
              <TextInput
                id="compose-letter-no"
                value={intent.letterNo}
                onChange={(e) => update('letterNo', e.target.value)}
                placeholder={
                  intent.correspondenceType === 'note_sheet'
                    ? 'e.g. PAFDA/Coord/2026/089'
                    : 'e.g. SO(Coord)/2026/112'
                }
              />
            </FormField>

            <FormField
              label="Attach PAFDA Letter Header?"
              id="compose-pafda-header"
              hint="Yes = official letterhead draft / PDF / Word / Email ke top pe (Letter aur Note Sheet dono)"
            >
              <select
                id="compose-pafda-header"
                value={intent.attachPafdaHeader ? 'yes' : 'no'}
                onChange={(e) => update('attachPafdaHeader', e.target.value === 'yes')}
                className={selectClass}
              >
                <option value="no" className="bg-zinc-900">
                  No
                </option>
                <option value="yes" className="bg-zinc-900">
                  Yes
                </option>
              </select>
            </FormField>

            {intent.attachPafdaHeader ? (
              <div className="overflow-hidden rounded-xl border border-white/10 bg-white p-2">
                <img
                  src={COMPOSE_LETTERHEAD.imagePath}
                  alt="PAFDA Letter Header"
                  className="mx-auto h-auto w-full max-w-lg object-contain"
                />
              </div>
            ) : null}

            <FormField
              label={
                intent.correspondenceType === 'note_sheet'
                  ? 'Submitted to / For orders of (optional)'
                  : 'Addressee'
              }
              id="compose-addressee"
              hint={
                intent.correspondenceType === 'note_sheet'
                  ? 'e.g. Director General / Worthy DG'
                  : 'Kis ko chithi / dak?'
              }
            >
              <TextInput
                id="compose-addressee"
                value={intent.addressee}
                onChange={(e) => update('addressee', e.target.value)}
                placeholder={
                  intent.correspondenceType === 'note_sheet'
                    ? 'e.g. Director General'
                    : 'e.g. The Secretary, …'
                }
              />
            </FormField>

            <FormField label="Subject (optional)" id="compose-subject">
              <TextInput
                id="compose-subject"
                value={intent.subject}
                onChange={(e) => update('subject', e.target.value)}
                placeholder="Auto-derive bhi ho sakta hai"
              />
            </FormField>

            <div className="rounded-xl border border-white/10 bg-black/20 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Paperclip className="h-4 w-4 text-amber-300" />
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  {intent.correspondenceType === 'note_sheet'
                    ? 'Reference / PUC (optional)'
                    : 'Reference letter (optional)'}
                </p>
              </div>
              <FormField
                label="Kaise include karein?"
                id="compose-ref-mode"
                hint={
                  intent.correspondenceType === 'note_sheet'
                    ? 'Paper Under Consideration — No./Date ya attach'
                    : 'Purani chithi ka No./Date likhein, ya scan/PDF attach karein'
                }
              >
                <select
                  id="compose-ref-mode"
                  value={intent.referenceMode}
                  onChange={(e) => handleReferenceMode(e.target.value)}
                  className={selectClass}
                >
                  {COMPOSE_REFERENCE_MODES.map((m) => (
                    <option key={m.id} value={m.id} className="bg-zinc-900">
                      {m.label}
                    </option>
                  ))}
                </select>
              </FormField>

              {showCiteFields ? (
                <div className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <FormField label="Ref. Letter No." id="compose-ref-no">
                      <TextInput
                        id="compose-ref-no"
                        value={intent.referenceLetterNo}
                        onChange={(e) => update('referenceLetterNo', e.target.value)}
                        placeholder="e.g. SO(Food)/2026/45"
                      />
                    </FormField>
                    <FormField
                      label="Ref. Date"
                      id="compose-ref-date"
                      hint="Khud type karein — e.g. 02 Aug 2026"
                    >
                      <TextInput
                        id="compose-ref-date"
                        type="text"
                        value={intent.referenceDate}
                        onChange={(e) => update('referenceDate', e.target.value)}
                        placeholder="e.g. 02 Aug 2026"
                      />
                    </FormField>
                  </div>
                </div>
              ) : null}

              {showAttachField ? (
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-zinc-400" htmlFor="compose-ref-file">
                    Attach referenced letter (PDF / Word / image)
                  </label>
                  <input
                    id="compose-ref-file"
                    type="file"
                    accept="application/pdf,image/*,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    onChange={handleAttachFile}
                    className="block w-full text-xs text-zinc-400 file:mr-3 file:rounded-lg file:border-0 file:bg-amber-500/20 file:px-3 file:py-2 file:text-xs file:font-medium file:text-amber-100"
                  />
                  {referenceAttachment ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
                        <span className="truncate">{referenceAttachment.name}</span>
                        <button
                          type="button"
                          onClick={clearAttachment}
                          className="shrink-0 rounded p-1 hover:bg-white/10"
                          aria-label="Remove attachment"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      {referenceAttachment.mimeType?.startsWith('image/') ? (
                        <button
                          type="button"
                          onClick={handleAiExtractReference}
                          disabled={extractBusy}
                          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-3 py-2 text-xs font-medium text-indigo-200 hover:bg-indigo-500/20 disabled:opacity-50"
                        >
                          {extractBusy ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Sparkles className="h-3.5 w-3.5" />
                          )}
                          {extractBusy
                            ? 'AI padh rahi hai…'
                            : 'AI: scan se Ref. No. + Date nikaalo'}
                        </button>
                      ) : (
                        <p className="text-[11px] text-zinc-600">
                          AI extract JPG/PNG scan pe chalta hai (PDF enclosure ke liye details
                          manually likhein).
                        </p>
                      )}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>

            <FormField
              label="Core Ideas — 2–3 points (zaroori)"
              id="compose-ideas"
              hint="Yahi asli 20% value hai. Har line ek point. Blank page yahan khatam."
            >
              <TextArea
                id="compose-ideas"
                rows={4}
                value={intent.coreIdeas}
                onChange={(e) => update('coreIdeas', e.target.value)}
                placeholder={'e.g.\nFee challan late submitted\nNeed 1 week extension\nWill pay by 30 Aug'}
              />
            </FormField>

            <FormField
              label="Presentation (optional)"
              id="compose-presentation"
              hint="Kabhi facts table / list mein behtar lagte hain — apni preference likhein ya chip tap karein."
            >
              <div className="mb-2 flex flex-wrap gap-2">
                {COMPOSE_PRESENTATION_PRESETS.map((preset) => {
                  const active =
                    String(intent.presentationPreference || '').trim() ===
                    preset.value;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() =>
                        update(
                          'presentationPreference',
                          active ? '' : preset.value,
                        )
                      }
                      className={`rounded-lg border px-2.5 py-1 text-xs transition ${
                        active
                          ? 'border-indigo-400/50 bg-indigo-500/20 text-indigo-100'
                          : 'border-white/10 bg-white/5 text-zinc-300 hover:border-white/20 hover:bg-white/10'
                      }`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
              <TextArea
                id="compose-presentation"
                rows={2}
                value={intent.presentationPreference || ''}
                onChange={(e) => update('presentationPreference', e.target.value)}
                placeholder='e.g. Use a table with columns: Item | Qty | Remarks'
              />
            </FormField>

            <FormField
              label={
                intent.correspondenceType === 'note_sheet'
                  ? 'Proposal / orders sought (optional)'
                  : 'Desired outcome (optional)'
              }
              id="compose-outcome"
            >
              <TextInput
                id="compose-outcome"
                value={intent.outcome}
                onChange={(e) => update('outcome', e.target.value)}
                placeholder="e.g. Approve extension by Friday"
              />
            </FormField>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Tone" id="compose-tone">
                <select
                  id="compose-tone"
                  value={intent.tone}
                  onChange={(e) => update('tone', e.target.value)}
                  className={selectClass}
                >
                  {COMPOSE_TONES.map((t) => (
                    <option key={t.id} value={t.id} className="bg-zinc-900">
                      {t.label}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Language" id="compose-lang">
                <select
                  id="compose-lang"
                  value={intent.language}
                  onChange={(e) => update('language', e.target.value)}
                  className={selectClass}
                >
                  {COMPOSE_LANGUAGES.map((l) => (
                    <option key={l.id} value={l.id} className="bg-zinc-900">
                      {l.label}
                    </option>
                  ))}
                </select>
              </FormField>
            </div>

            <FormField
              label={
                intent.correspondenceType === 'note_sheet'
                  ? 'Note writer (name / designation)'
                  : 'Sender name (optional)'
              }
              id="compose-sender"
            >
              <TextInput
                id="compose-sender"
                value={intent.senderName}
                onChange={(e) => update('senderName', e.target.value)}
                placeholder="Closing signature"
              />
            </FormField>

            <Toggle
              id="compose-use-ai"
              checked={useAi}
              onChange={setUseAi}
              label="Use AI (Gemini)"
              description="ON = AI formal letter banaye. OFF = local template only. Key na ho to auto-fallback."
            />

            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={handleGenerate}
                disabled={busy || !intentReady}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {busy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                {busy
                  ? useAi
                    ? 'AI draft bana rahi hai…'
                    : 'Draft ban raha hai…'
                  : useAi
                    ? 'Generate with AI'
                    : 'Generate Draft (template)'}
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-sm text-zinc-400 hover:bg-white/5 hover:text-white"
              >
                <RotateCcw className="h-4 w-4" />
                Reset
              </button>
            </div>
          </div>
        </GlassCard>

        {/* JUDGMENT — human QC */}
        <GlassCard className="p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
              2 · Draft → aap editor
            </h3>
            {draft?.via ? (
              <span className="rounded-lg border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                via {draft.via}
              </span>
            ) : null}
          </div>

          {!draft ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/10 bg-black/20 px-4 py-16 text-center">
              <PenLine className="mb-3 h-10 w-10 text-zinc-600" strokeWidth={1.25} />
              <p className="text-sm text-zinc-500">Abhi koi draft nahi</p>
              <p className="mt-1 max-w-xs text-xs text-zinc-600">
                Left side Intent bharain → Generate. Blank-page barrier yahan khatam.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <FormField label="Subject (edit OK)" id="draft-subject">
                <TextInput
                  id="draft-subject"
                  value={draft.subject}
                  onChange={(e) => setDraft((d) => ({ ...d, subject: e.target.value }))}
                />
              </FormField>
              {intent.attachPafdaHeader ? (
                <div className="overflow-hidden rounded-xl border border-emerald-500/20 bg-white p-2">
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-700/80">
                    PAFDA Letter Header (final draft top)
                  </p>
                  <img
                    src={COMPOSE_LETTERHEAD.imagePath}
                    alt="PAFDA Letter Header"
                    className="mx-auto h-auto w-full object-contain"
                  />
                </div>
              ) : null}
              <FormField
                label="Letter body — check facts, phrasing; phir Copy / PDF / Word / Email"
                id="draft-body"
              >
                <TextArea
                  id="draft-body"
                  rows={16}
                  value={draft.body}
                  onChange={(e) => setDraft((d) => ({ ...d, body: e.target.value }))}
                  className="font-mono text-[13px] leading-relaxed"
                />
              </FormField>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleImproveAi}
                  disabled={improveBusy || busy}
                  className="inline-flex items-center gap-2 rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-3 py-2 text-xs font-medium text-indigo-200 hover:bg-indigo-500/20 disabled:opacity-50"
                >
                  {improveBusy ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5" />
                  )}
                  {improveBusy ? 'AI improve…' : 'Improve with AI'}
                </button>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-zinc-200 hover:bg-white/10"
                >
                  {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
                <button
                  type="button"
                  onClick={handlePdf}
                  className="inline-flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-200 hover:bg-amber-500/20"
                >
                  <FileDown className="h-3.5 w-3.5" />
                  PDF
                </button>
                <button
                  type="button"
                  onClick={handleWord}
                  className="inline-flex items-center gap-2 rounded-xl border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-xs font-medium text-sky-200 hover:bg-sky-500/20"
                >
                  <FileType className="h-3.5 w-3.5" />
                  Word
                </button>
              </div>

              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 space-y-2">
                <FormField
                  label="Email letter as Word (.doc)"
                  id="compose-email-to"
                  hint="Resend se Word attachment — same setup as Morning Board email"
                >
                  <TextInput
                    id="compose-email-to"
                    type="email"
                    value={emailTo}
                    onChange={(e) => setEmailTo(e.target.value)}
                    placeholder="you@example.com"
                  />
                </FormField>
                <button
                  type="button"
                  onClick={handleEmail}
                  disabled={emailBusy || busy || !draft?.body}
                  className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-200 hover:bg-emerald-500/20 disabled:opacity-50"
                >
                  {emailBusy ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Mail className="h-3.5 w-3.5" />
                  )}
                  {emailBusy ? 'Sending…' : 'Email Word letter'}
                </button>
              </div>
            </div>
          )}
        </GlassCard>
      </div>

      {message ? (
        <p className="text-center text-xs text-indigo-200/90">{message}</p>
      ) : null}
    </div>
  );
}
