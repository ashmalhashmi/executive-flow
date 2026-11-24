import { useMemo, useRef, useState } from 'react';
import { Camera, Copy, Search, Trash2, X } from 'lucide-react';
import { useCorrespondenceExecutive } from '../context/ExecutiveContext';
import GlassCard from '../components/ui/GlassCard';
import { examineCorrespondence } from '../utils/correspondenceAi';
import { correspondenceMatchesQuery } from '../utils/correspondenceEntries';

const KIND_LABEL = {
  information: 'Sirf ittila — action nahi',
  action: 'Action chahiye',
  unclear: 'Letter se wazah nahi hui',
};

const CLEAR_ROWS = [
  ['C — Context', 'context'],
  ['L — Link', 'link'],
  ['E — Essence', 'essence'],
  ['A — Authority', 'authority'],
  ['R — Required Response', 'requiredResponse'],
  ['6 — Deadline', 'deadline'],
  ['7 — Action (tajweez)', 'action'],
];

function blank(value, emptyLabel) {
  const text = String(value || '').trim();
  return text || emptyLabel;
}

function ReviewCard({ entry }) {
  const [copied, setCopied] = useState(false);
  const copyBrief = async () => {
    const line = String(entry.dgBriefing || '').trim();
    if (!line) return;
    try {
      await navigator.clipboard.writeText(line);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-300">Subject</p>
          <h3 className="mt-1 text-lg font-semibold text-white">
            {blank(entry.subject, 'Subject letter par nahi mila')}
          </h3>
        </div>
        <span className="rounded-full border border-white/15 px-3 py-1 text-xs text-zinc-200">
          {KIND_LABEL[entry.letterKind] || KIND_LABEL.unclear}
        </span>
      </div>

      {entry.examineError ? (
        <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
          {entry.examineError}
        </p>
      ) : null}
      {entry.storageWarning ? (
        <p className="text-xs text-amber-300">{entry.storageWarning}</p>
      ) : null}

      <section>
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Simple explanation</p>
        <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-zinc-100">
          {blank(entry.simpleExplanation, 'Roman Urdu explanation abhi nahi bani.')}
        </p>
      </section>

      <dl className="grid gap-3 sm:grid-cols-2">
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Background</dt>
          <dd className="mt-1 text-sm text-zinc-200">{blank(entry.background, 'Letter mein background nahi likha.')}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Main crux</dt>
          <dd className="mt-1 text-sm text-zinc-200">{blank(entry.mainCrux, 'Crux nahi nikla.')}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Required action</dt>
          <dd className="mt-1 text-sm text-zinc-200">
            {blank(entry.requiredAction, 'Letter ne koi action nahi manga.')}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Responsible officer</dt>
          <dd className="mt-1 text-sm text-zinc-200">
            {blank(entry.responsibleOfficer, 'Letter mein zimmedar officer ka naam nahi.')}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Deadline</dt>
          <dd className="mt-1 text-sm text-zinc-200">{blank(entry.deadline, 'Letter mein deadline nahi di gayi.')}</dd>
        </div>
      </dl>

      <section className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-200">DG briefing</p>
          <button
            type="button"
            onClick={copyBrief}
            disabled={!entry.dgBriefing}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-emerald-100 hover:bg-white/10 disabled:opacity-40"
          >
            <Copy className="h-3.5 w-3.5" />
            {copied ? 'Copy ho gayi' : 'Copy'}
          </button>
        </div>
        <p className="mt-2 text-sm text-white">
          {blank(entry.dgBriefing, 'DG ke liye one-line summary nahi bani.')}
        </p>
      </section>

      <section>
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">CLEAR-7</p>
        <ul className="mt-2 space-y-2">
          {CLEAR_ROWS.map(([label, key]) => (
            <li key={key} className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
              <p className="text-xs font-semibold text-indigo-200">{label}</p>
              <p className="mt-1 text-sm text-zinc-200">
                {blank(entry.clear7?.[key], 'Letter mein yeh baat nahi mili.')}
              </p>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-zinc-500">
          7 — Action aik tajweez hai. Baqi points sirf us baat par hain jo letter par likhi hai.
        </p>
      </section>

      {entry.imageRefs?.length ? (
        <div className="flex flex-wrap gap-3">
          {entry.imageRefs.map((href, index) => (
            <a
              key={`${href}-${index}`}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex text-sm text-sky-300 hover:text-sky-200"
            >
              {entry.imageRefs.length > 1 ? `Saved page ${index + 1}` : 'Saved letter photo'}
            </a>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default function CorrespondenceReview() {
  const { correspondenceEntries, addCorrespondenceEntry, removeCorrespondenceEntry } =
    useCorrespondenceExecutive();
  const fileRef = useRef(null);
  const snapModeRef = useRef('start');
  const [pages, setPages] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState('');

  const sorted = useMemo(
    () =>
      [...correspondenceEntries].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))),
    [correspondenceEntries],
  );
  const visible = sorted.filter((entry) => correspondenceMatchesQuery(entry, query));
  const selected = sorted.find((entry) => entry.id === selectedId) || visible[0] || null;

  const dropPages = (list) => {
    list.forEach((page) => URL.revokeObjectURL(page.previewUrl));
  };

  const onPick = (event) => {
    const next = event.target.files?.[0];
    event.target.value = '';
    if (!next) return;
    const page = {
      id: `page-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      file: next,
      previewUrl: URL.createObjectURL(next),
    };
    setError('');
    setPages((prev) => {
      if (snapModeRef.current === 'append') {
        if (prev.length >= 6) return prev;
        return [...prev, page];
      }
      dropPages(prev);
      return [page];
    });
  };

  const removePage = (id) => {
    setPages((prev) => {
      const target = prev.find((page) => page.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((page) => page.id !== id);
    });
  };

  const openSnap = (mode) => {
    snapModeRef.current = mode;
    fileRef.current?.click();
  };

  const examine = async () => {
    if (!pages.length) {
      setError('Pehle letter ki photo lagayein');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const data = await examineCorrespondence(pages.map((page) => page.file));
      const saved = addCorrespondenceEntry({ ...data, examineError: '' });
      setSelectedId(saved.id);
      dropPages(pages);
      setPages([]);
    } catch (err) {
      if (err?.imageRef || err?.imageRefs?.length) {
        const saved = addCorrespondenceEntry({
          imageRef: err.imageRef || '',
          imageRefs: err.imageRefs || [],
          storageWarning: err.storageWarning || '',
          examineError: err.message || 'CLEAR-7 examine nahi hui',
        });
        setSelectedId(saved.id);
      }
      setError(err?.message || 'CLEAR-7 examine nahi hui');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <GlassCard className="p-5 sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-indigo-300">CLEAR-7</p>
        <h2 className="mt-1 text-xl font-semibold text-white">Correspondence</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-400">
          Correspondence, letter, ya summary ki photo lagayein. Kai pages hon to Next page snap
          se agla page lagayein, phir ek dafa Save aur examine. AI saari pages ko ek letter samajh
          kar CLEAR-7 karti hai. Jo letter par nahi likha, woh system nahi ghadta.
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <button
            type="button"
            onClick={() => openSnap('start')}
            disabled={busy}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/15 px-4 py-2 text-sm font-medium text-zinc-100 hover:bg-white/5 disabled:opacity-50"
          >
            <Camera className="h-4 w-4" />
            Letter snap
          </button>
          <button
            type="button"
            onClick={() => openSnap('append')}
            disabled={busy || pages.length === 0 || pages.length >= 6}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/15 px-4 py-2 text-sm font-medium text-zinc-100 hover:bg-white/5 disabled:opacity-50"
          >
            <Camera className="h-4 w-4" />
            Next page snap
          </button>
          <button
            type="button"
            onClick={examine}
            disabled={busy || pages.length === 0}
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-400 disabled:opacity-50"
          >
            {busy ? 'Save aur examine ho raha hai…' : 'Save aur examine'}
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
        {pages.length ? (
          <div className="mt-4">
            <p className="text-xs text-zinc-400">
              {pages.length} {pages.length === 1 ? 'page' : 'pages'} — 6 tak. Letter snap nayi letter shuru karta hai.
            </p>
            <ul className="mt-3 flex gap-3 overflow-x-auto pb-1">
              {pages.map((page, index) => (
                <li key={page.id} className="relative shrink-0">
                  <img
                    src={page.previewUrl}
                    alt={`Letter page ${index + 1}`}
                    className="h-28 w-20 rounded-lg border border-white/10 object-cover"
                  />
                  <span className="absolute bottom-1 left-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] text-white">
                    {index + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => removePage(page.id)}
                    disabled={busy}
                    aria-label={`Page ${index + 1} hataein`}
                    className="absolute -right-1 -top-1 rounded-full border border-white/20 bg-zinc-900 p-1 text-zinc-200 hover:bg-zinc-800 disabled:opacity-50"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}
        <p className="mt-3 text-xs text-zinc-500">
          AI ke liye Sync &amp; Backup se sign in hona zaroori hai. Photo is device par list mein rehti hai aur account sync ke sath jaati hai.
        </p>
      </GlassCard>

      <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        <GlassCard className="p-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Subject ya crux search"
              className="w-full rounded-xl border border-white/10 bg-white/5 py-2 pl-9 pr-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-indigo-500/40 focus:outline-none"
            />
          </div>
          {visible.length === 0 ? (
            <p className="mt-4 text-sm text-zinc-500">Abhi koi saved letter nahi.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {visible.map((entry) => (
                <li key={entry.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(entry.id)}
                    className={`w-full rounded-xl border px-3 py-2 text-left ${
                      selected?.id === entry.id
                        ? 'border-indigo-400/40 bg-indigo-500/15'
                        : 'border-white/10 bg-white/[0.03] hover:bg-white/5'
                    }`}
                  >
                    <p className="whitespace-normal break-words text-sm font-medium leading-snug text-zinc-100">
                      {entry.subject || 'Subject nahi mila'}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">
                      {new Date(entry.createdAt).toLocaleString()}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </GlassCard>

        <GlassCard className="p-5 sm:p-6">
          {selected ? (
            <>
              <div className="mb-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    if (!window.confirm('Yeh correspondence delete karein?')) return;
                    removeCorrespondenceEntry(selected.id);
                    setSelectedId('');
                  }}
                  className="inline-flex items-center gap-1 rounded-lg border border-red-500/30 px-2.5 py-1 text-xs text-red-300 hover:bg-red-500/10"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </button>
              </div>
              <ReviewCard entry={selected} />
            </>
          ) : (
            <p className="text-sm text-zinc-500">Snap save hone ke baad CLEAR-7 yahan khulega.</p>
          )}
        </GlassCard>
      </div>
    </div>
  );
}
