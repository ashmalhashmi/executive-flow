import { X, ExternalLink } from 'lucide-react';
import { getSheetEmbedUrl, sheetViewUrl } from '../../utils/googleSheetsSync';

export default function GoogleSheetViewerModal({ isOpen, onClose }) {
  if (!isOpen || !sheetViewUrl) return null;

  const embedUrl = getSheetEmbedUrl(sheetViewUrl);

  return (
    <div className="fixed inset-0 z-[120] flex flex-col bg-zinc-950">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-4 py-3 pt-[calc(0.75rem+var(--safe-top))]">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white">Google Sheet — Live Backup</p>
          <p className="text-xs text-zinc-500">Magnified view · scroll karein</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <a
            href={sheetViewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 px-3 py-2 text-xs text-zinc-200 hover:bg-white/5"
          >
            <ExternalLink className="h-4 w-4" />
            Browser
          </a>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/15 p-2 text-zinc-300 hover:bg-white/10"
            aria-label="Close sheet view"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </header>
      <div className="min-h-0 flex-1 bg-white pb-[var(--safe-bottom)]">
        <iframe
          title="Executive Flow Google Sheet backup"
          src={embedUrl}
          className="h-full w-full border-0"
          allowFullScreen
        />
      </div>
    </div>
  );
}
