import { lazy, Suspense, useState } from 'react';
import { Loader2, Upload } from 'lucide-react';
import GlassCard from '../ui/GlassCard';

const ContactImportPanel = lazy(() => import('./ContactImportPanel'));

/** CSV/JSON import chunk loads only after user opens Import. */
export default function LazyContactImportPanel({ contacts, importContacts }) {
  const [enabled, setEnabled] = useState(false);

  if (!enabled) {
    return (
      <GlassCard className="border-violet-500/20 bg-violet-500/5 p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-violet-500/30 bg-violet-500/15">
              <Upload className="h-5 w-5 text-violet-300" />
            </span>
            <div>
              <h3 className="text-sm font-semibold text-white">File se Import</h3>
              <p className="mt-1 text-xs text-zinc-500">
                CSV / JSON tools pehle paint ke baad load hote hain — data safe rehta hai.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setEnabled(true)}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-violet-500/30 bg-violet-500/10 px-4 py-2.5 text-sm font-medium text-violet-200 hover:bg-violet-500/20"
          >
            <Upload className="h-4 w-4" />
            Open import
          </button>
        </div>
      </GlassCard>
    );
  }

  return (
    <Suspense
      fallback={
        <GlassCard className="flex items-center justify-center gap-2 p-8 text-sm text-zinc-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          Import tools load ho rahe hain…
        </GlassCard>
      }
    >
      <ContactImportPanel contacts={contacts} importContacts={importContacts} />
    </Suspense>
  );
}
