import { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, HeartHandshake, Loader2, Quote, Sparkles, Target } from 'lucide-react';
import { useMuhasabaExecutive } from '../context/ExecutiveContext';
import GlassCard from '../components/ui/GlassCard';
import { evaluateMuhasabaDeed } from '../utils/muhasabaAi';

export default function MuhasabaPage() {
  const { muhasabaEntries, addMuhasabaEntry, completeMuhasabaAction } = useMuhasabaExecutive();

  const [deedText, setDeedText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [activeId, setActiveId] = useState(null);
  const [toast, setToast] = useState('');
  const textareaRef = useRef(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(''), 2800);
    return () => clearTimeout(t);
  }, [toast]);

  const sorted = useMemo(
    () =>
      [...muhasabaEntries].sort(
        (a, b) => (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0),
      ),
    [muhasabaEntries],
  );

  const active = sorted.find((entry) => entry.id === activeId) || sorted[0] || null;

  const submitDeed = async (e) => {
    e.preventDefault();
    const text = deedText.trim();
    if (!text || busy) return;

    setBusy(true);
    setError('');
    try {
      const result = await evaluateMuhasabaDeed(text);
      const created = addMuhasabaEntry({
        deedText: text,
        classification: result.classification,
        evaluation: result.evaluation,
        divineReference: result.divineReference,
        identityStatement: result.identityStatement,
        immediateAction: result.immediateAction,
      });
      if (created?.id) setActiveId(created.id);
      setDeedText('');
      textareaRef.current?.focus();
    } catch (err) {
      setError(err.message || 'Evaluation failed');
    } finally {
      setBusy(false);
    }
  };

  const markDone = (id) => {
    completeMuhasabaAction(id);
    setToast('Action completed ✅');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-emerald-500/25 bg-emerald-500/10">
          <HeartHandshake className="h-5 w-5 text-emerald-300" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-white sm:text-xl">Muhasaba</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Self-accountability · deed → reflection · identity · 2-minute action
          </p>
        </div>
      </div>

      <GlassCard className="border-emerald-500/15 bg-emerald-500/[0.03] p-5 sm:p-6">
        <form onSubmit={submitDeed} className="space-y-4">
          <label htmlFor="muhasaba-deed" className="block text-sm font-medium text-zinc-300">
            Aaj ka deed
          </label>
          <textarea
            ref={textareaRef}
            id="muhasaba-deed"
            rows={4}
            value={deedText}
            onChange={(e) => setDeedText(e.target.value)}
            placeholder="Jo kiya / socha / chhoda — bina judgment likho…"
            className="w-full resize-y rounded-2xl border border-white/15 bg-black/40 px-4 py-3 text-base text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-emerald-500/40 focus:ring-2 focus:ring-emerald-500/15"
          />
          {error ? <p className="text-sm text-rose-300">{error}</p> : null}
          <button
            type="submit"
            disabled={busy || !deedText.trim()}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500/90 px-4 py-2.5 text-sm font-medium text-zinc-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Evaluating…
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Evaluate deed
              </>
            )}
          </button>
        </form>
      </GlassCard>

      {toast ? (
        <div
          role="status"
          className="rounded-xl border border-emerald-500/30 bg-emerald-500/15 px-4 py-3 text-sm text-emerald-100"
        >
          {toast}
        </div>
      ) : null}

      {active ? (
        <GlassCard className="border-emerald-500/25 bg-gradient-to-b from-emerald-500/10 to-transparent p-5 sm:p-6">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span
              className={[
                'rounded-full px-2.5 py-1 text-xs font-medium uppercase tracking-wide',
                active.classification === 'bad'
                  ? 'bg-amber-500/15 text-amber-200'
                  : 'bg-emerald-500/15 text-emerald-200',
              ].join(' ')}
            >
              {active.classification}
            </span>
            <span className="text-xs text-zinc-500">
              {new Date(active.createdAt).toLocaleString()}
            </span>
          </div>

          <p className="text-sm text-zinc-400">Deed</p>
          <p className="mt-1 text-base text-zinc-100">{active.deedText}</p>

          {active.evaluation ? (
            <p className="mt-4 text-sm leading-relaxed text-zinc-300">{active.evaluation}</p>
          ) : null}

          <div className="mt-6 space-y-4">
            <div className="rounded-xl border border-emerald-500/20 bg-black/25 p-4">
              <div className="mb-2 flex items-center gap-2 text-emerald-300">
                <Quote className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase tracking-wider">
                  Divine reference
                </span>
              </div>
              <p className="text-sm leading-relaxed text-emerald-50/95">{active.divineReference}</p>
            </div>

            <div className="rounded-xl border border-white/10 bg-black/25 p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Identity
              </p>
              <p className="text-lg font-medium leading-snug text-white">
                {active.identityStatement}
              </p>
            </div>

            <div className="rounded-xl border border-emerald-400/25 bg-emerald-500/10 p-4">
              <div className="mb-2 flex items-center gap-2 text-emerald-200">
                <Target className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase tracking-wider">
                  Immediate action
                </span>
              </div>
              <p className="text-base text-emerald-50">{active.immediateAction}</p>

              {active.isActionCompleted ? (
                <p className="mt-4 inline-flex items-center gap-2 text-sm text-emerald-300">
                  <CheckCircle2 className="h-4 w-4" />
                  Action completed
                </p>
              ) : (
                <button
                  type="button"
                  onClick={() => markDone(active.id)}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl border border-emerald-400/40 bg-emerald-500/20 px-4 py-2.5 text-sm font-medium text-emerald-50 transition hover:bg-emerald-500/30"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Action Completed ✅
                </button>
              )}
            </div>
          </div>
        </GlassCard>
      ) : (
        <GlassCard className="flex flex-col items-center justify-center px-6 py-14 text-center">
          <HeartHandshake className="mb-3 h-8 w-8 text-zinc-600" />
          <p className="text-sm text-zinc-500">Pehla deed likho — reflection yahan aayegi</p>
        </GlassCard>
      )}

      {sorted.length > 1 ? (
        <section>
          <h2 className="mb-3 text-sm font-medium text-zinc-400">Recent logs</h2>
          <ul className="space-y-2">
            {sorted.slice(0, 12).map((entry) => (
              <li key={entry.id}>
                <button
                  type="button"
                  onClick={() => setActiveId(entry.id)}
                  className={[
                    'w-full rounded-xl border px-4 py-3 text-left transition',
                    entry.id === active?.id
                      ? 'border-emerald-500/30 bg-emerald-500/10'
                      : 'border-white/10 bg-white/[0.03] hover:border-white/20',
                  ].join(' ')}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="min-w-0 truncate text-sm text-zinc-200">{entry.deedText}</p>
                    {entry.isActionCompleted ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                    ) : null}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
