import { lazy, Suspense, useState } from 'react';
import { Loader2, Zap } from 'lucide-react';
import GlassCard from '../ui/GlassCard';

const ContactCaptureLoop = lazy(() => import('./ContactCaptureLoop'));

/**
 * Capture/AI extract pulls Supabase auth — load only after user opens this section
 * (or after idle prefetch), so Contact Database first paint stays light.
 */
export default function LazyContactCaptureLoop({ contacts, onSaveContact }) {
  const [enabled, setEnabled] = useState(false);

  if (!enabled) {
    return (
      <GlassCard className="border-amber-500/20 bg-amber-500/5 p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/15">
              <Zap className="h-5 w-5 text-amber-300" strokeWidth={1.75} />
            </span>
            <div>
              <h3 className="text-sm font-semibold text-white">Card / AI Capture</h3>
              <p className="mt-1 text-xs text-zinc-500">
                Visiting card ya paste text se contact nikaalne ke liye yahan kholein (pehle load
                light rakha gaya).
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setEnabled(true)}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-sm font-medium text-amber-200 hover:bg-amber-500/20"
          >
            <Zap className="h-4 w-4" />
            Open capture
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
          Capture tools load ho rahe hain…
        </GlassCard>
      }
    >
      <ContactCaptureLoop
        contacts={contacts}
        onSaveContact={onSaveContact}
        defaultOpen
      />
    </Suspense>
  );
}
