import { useState } from 'react';
import { FileDown, Gift } from 'lucide-react';
import { useSouvenirsExecutive } from '../context/ExecutiveContext';
import GlassCard from '../components/ui/GlassCard';
import SouvenirLogTable from '../components/souvenirs/SouvenirLogTable';
import QuickSouvenirLogForm from '../components/souvenirs/QuickSouvenirLogForm';
import { normalizeSouvenirLogEntries } from '../utils/souvenirLog';

export default function SouvenirLog() {
  const { souvenirs, removeSouvenirLogEntry, addSouvenirLogEntry } = useSouvenirsExecutive();
  const rows = normalizeSouvenirLogEntries(souvenirs);
  const hasRecords = rows.length > 0;
  const [pdfBusy, setPdfBusy] = useState(false);

  const handleQuickSave = ({ meetingTitle, date, detail }) =>
    addSouvenirLogEntry({
      meetingTitle,
      date,
      detail,
      source: 'quick-log',
    });

  const handleDownloadPdf = async () => {
    if (!hasRecords) return;
    setPdfBusy(true);
    try {
      const { downloadSouvenirLogPdf } = await import('../utils/souvenirLogPdf');
      downloadSouvenirLogPdf(souvenirs);
    } finally {
      setPdfBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <QuickSouvenirLogForm onSave={handleQuickSave} />

      <GlassCard className="p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
              Souvenir Log PDF
            </h3>
            <p className="mt-1 text-xs text-zinc-500">
              Meeting / occasion, date, aur souvenirs ka exact text PDF me download karein.
            </p>
          </div>
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={pdfBusy || !hasRecords}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-sm font-medium text-amber-200 hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FileDown className="h-4 w-4" />
            {pdfBusy ? 'PDF ban rahi hai…' : 'Download PDF'}
          </button>
        </div>
      </GlassCard>

      {hasRecords ? (
        <SouvenirLogTable
          souvenirs={souvenirs}
          onDeleteEntry={removeSouvenirLogEntry}
        />
      ) : (
        <GlassCard className="flex flex-col items-center justify-center px-6 py-12 text-center">
          <Gift className="mb-4 h-12 w-12 text-zinc-600" strokeWidth={1.25} />
          <p className="text-sm font-medium text-zinc-400">Abhi koi souvenir record nahi</p>
          <p className="mt-2 max-w-sm text-xs text-zinc-600">
            Upar <strong className="text-zinc-500">Quick Log Souvenir</strong> se seedha entry
            add karein — calendar meeting zaroori nahi.
          </p>
        </GlassCard>
      )}
    </div>
  );
}
