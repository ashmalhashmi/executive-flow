import { useMemo, useState } from 'react';
import { BookOpen, Upload, Loader2, ClipboardCheck, Undo2, Trash2 } from 'lucide-react';
import GlassCard from '../ui/GlassCard';
import {
  guessColumnMap,
  readCsvFile,
  rowsToMeetings,
} from '../../utils/csvImport';
import { pilotVerifyCsvVsApp } from '../../utils/csvPilotVerify';
import { pilotDateFormatAudit } from '../../utils/csvDateFormatPilot';
import {
  countDiaryImportedMeetings,
  withoutDiaryImportedMeetings,
} from '../../utils/diaryImport';

const COL_OPTIONS = (headers) => [
  { value: '', label: '— Select column —' },
  ...headers.map((h, i) => ({ value: String(i), label: h || `Column ${i + 1}` })),
];

export default function DiaryImportPanel({ meetings, importAppData, getAppSnapshot }) {
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [csvRows, setCsvRows] = useState([]);
  const [columnMap, setColumnMap] = useState({
    date: '',
    meeting: '',
    time: '',
    venue: '',
    notes: '',
  });
  const [importMode, setImportMode] = useState('replace');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [fileName, setFileName] = useState('');
  const [pilotReport, setPilotReport] = useState(null);

  const previewMeetings = useMemo(() => {
    if (columnMap.date === '' || columnMap.meeting === '') return [];
    return rowsToMeetings(csvRows, columnMap);
  }, [csvRows, columnMap]);

  const importedCount = useMemo(
    () => countDiaryImportedMeetings(meetings),
    [meetings],
  );

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setMessage('');
    try {
      const { headers, rows } = await readCsvFile(file);
      if (!headers.length) throw new Error('CSV khali hai ya format sahi nahi');
      setCsvHeaders(headers);
      setCsvRows(rows);
      setFileName(file.name);
      const guessed = guessColumnMap(headers);
      setColumnMap({
        date: guessed.date !== '' ? String(guessed.date) : '',
        meeting: guessed.meeting !== '' ? String(guessed.meeting) : '',
        time: guessed.time !== '' ? String(guessed.time) : '',
        venue: guessed.venue !== '' ? String(guessed.venue) : '',
        notes: guessed.notes !== '' ? String(guessed.notes) : '',
      });
      setPilotReport(null);
      setMessage(`${rows.length} rows load ho gayi — neeche columns confirm karein`);
    } catch (err) {
      setMessage(err.message || 'CSV read failed');
      setCsvHeaders([]);
      setCsvRows([]);
    } finally {
      setBusy(false);
      e.target.value = '';
    }
  };

  const handleImport = () => {
    if (!previewMeetings.length) {
      setMessage('Pehle Date aur Meeting columns select karein');
      return;
    }
    const label =
      importMode === 'merge'
        ? `${previewMeetings.length} meetings purane data ke sath jod dein?`
        : `${previewMeetings.length} meetings import karein? Purani meetings replace ho jayengi.`;
    if (!window.confirm(label)) return;

    const snapshot = getAppSnapshot().data;
    const nextMeetings =
      importMode === 'merge' ? [...meetings, ...previewMeetings] : previewMeetings;

    importAppData({
      ...snapshot,
      meetings: nextMeetings,
    });

    setMessage(
      `Done — ${previewMeetings.length} meetings app me save ho gayi. My Calendar khol kar dekhein.`,
    );
    setPilotReport(null);
  };

  const handleClearAllMeetings = () => {
    if (!meetings.length) {
      setMessage('Calendar pehle se khali hai');
      return;
    }
    const label = `Sab meetings delete karein?\n\n${meetings.length} meetings hat jayengi — purani Google Sheet (raat wala) import + CSV + manual sab.\n\nUs ke baad nayi CSV → Replace → Import karein.`;
    if (!window.confirm(label)) return;

    const snapshot = getAppSnapshot().data;
    importAppData({ ...snapshot, meetings: [] });
    setPilotReport(null);
    setMessage(
      'Done — sab meetings clear. Ab CSV upload karein, Replace selected rakhein, Import to App dabayein.',
    );
  };

  const handleCancelImport = () => {
    if (!importedCount) {
      setMessage('Koi diary/CSV import mojood nahi — cancel karne ke liye kuch nahi');
      return;
    }
    const label = `Cancel import?\n\n${importedCount} CSV se import ki hui meetings delete ho jayengi.\nManual / pehle se add ki hui meetings reh jayengi.`;
    if (!window.confirm(label)) return;

    const snapshot = getAppSnapshot().data;
    importAppData({
      ...snapshot,
      meetings: withoutDiaryImportedMeetings(meetings),
    });
    setPilotReport(null);
    setMessage(
      `Done — ${importedCount} imported meetings hata di. My Calendar refresh karein.`,
    );
  };

  const runPilotTest = () => {
    if (!previewMeetings.length) {
      setMessage('Pehle Date aur Meeting columns select karein');
      return;
    }
    const report = pilotVerifyCsvVsApp(csvRows, columnMap, meetings);
    const dateAudit = pilotDateFormatAudit(csvRows, columnMap, meetings);
    setPilotReport({ ...report, dateAudit });
    if (dateAudit?.dateShiftRows > 0) {
      setMessage(
        `⚠ DD-MM-YYYY pilot: ${dateAudit.dateShiftRows} meetings ki date sheet se alag app calendar par hai — neeche table dekhein.`,
      );
    } else if (report.allMatched && dateAudit?.allDatesAlign) {
      setMessage('Pilot PASS — Sheet DD-MM-YYYY aur calendar dates match.');
    } else {
      setMessage('Pilot report neeche — date format + match details.');
    }
  };

  const colOpts = COL_OPTIONS(csvHeaders);

  return (
    <GlassCard className="border-amber-500/20 bg-amber-500/5 p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <BookOpen className="h-5 w-5 shrink-0 text-amber-300" />
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-amber-200/90">
            Diary / Google Sheet → App Import
          </h3>
          <p className="mt-2 text-sm text-zinc-500">
            Purani diary (Google Sheet) ko robot ko samjhana: pehle sheet se{' '}
            <strong className="text-zinc-300">CSV file</strong> banayein, phir batayein kaun
            column <strong className="text-zinc-300">Date</strong> hai aur kaun{' '}
            <strong className="text-zinc-300">Meeting</strong> — app copy kar lega.
          </p>

          <ol className="mt-3 list-decimal space-y-1 pl-5 text-xs text-zinc-500">
            <li>
              Google Sheet kholo → <strong className="text-zinc-400">File → Download → CSV</strong>
            </li>
            <li>Neeche CSV upload karo</li>
            <li>Date / Meeting columns select karo (auto-detect ho sakta hai)</li>
            <li>
              <strong className="text-zinc-400">Import to App</strong> dabao → My Calendar me
              dikhega
            </li>
            <li>
              Import ke baad <strong className="text-zinc-400">wahi CSV</strong> dubara upload →{' '}
              <strong className="text-zinc-400">Pilot test</strong> se calendar match check karein
            </li>
          </ol>

          {meetings.length > 0 && (
            <div className="mt-4 space-y-3 rounded-xl border border-red-500/25 bg-red-500/5 px-4 py-3">
              <p className="text-xs text-zinc-400">
                Is device par <strong className="text-zinc-200">{meetings.length}</strong>{' '}
                total meetings (purani sheet import + nayi CSV + manual)
                {importedCount > 0 && (
                  <>
                    {' '}
                    · <strong className="text-zinc-200">{importedCount}</strong> nayi CSV (
                    Cancel import se hat sakti hain)
                  </>
                )}
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleClearAllMeetings}
                  className="inline-flex items-center gap-2 rounded-xl border border-red-600/60 bg-red-600/20 px-4 py-2 text-sm font-medium text-red-50 transition hover:bg-red-600/35"
                >
                  <Trash2 className="h-4 w-4" />
                  Purana import hatao (sab meetings clear)
                </button>
                {importedCount > 0 && (
                  <button
                    type="button"
                    onClick={handleCancelImport}
                    className="inline-flex items-center gap-2 rounded-xl border border-red-500/50 bg-red-500/15 px-4 py-2 text-sm font-medium text-red-100 transition hover:bg-red-500/25"
                  >
                    <Undo2 className="h-4 w-4" />
                    Cancel import (sirf CSV)
                  </button>
                )}
              </div>
              <p className="text-[11px] text-zinc-500">
                Raat wali Google Sheet import ke liye pehle{' '}
                <strong className="text-zinc-400">Purana import hatao</strong>, phir Workflow 1:
                CSV + Replace + Import.
              </p>
            </div>
          )}

          <div className="mt-4">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-2.5 text-sm font-medium text-amber-100 hover:bg-amber-500/20">
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              CSV file choose karein
              <input
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={handleFile}
                disabled={busy}
              />
            </label>
            {fileName && (
              <p className="mt-2 text-xs text-zinc-500">
                File: {fileName} · {csvRows.length} data rows
              </p>
            )}
          </div>

          {csvHeaders.length > 0 && (
            <div className="mt-4 space-y-3 rounded-xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Robot ko batayein — kaun column kya hai
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-xs text-zinc-400">
                  Date column *
                  <select
                    value={columnMap.date}
                    onChange={(e) =>
                      setColumnMap((p) => ({ ...p, date: e.target.value }))
                    }
                    className="mt-1 block w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-zinc-100"
                  >
                    {colOpts.map((o) => (
                      <option key={`d-${o.value}`} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs text-zinc-400">
                  Meeting column *
                  <select
                    value={columnMap.meeting}
                    onChange={(e) =>
                      setColumnMap((p) => ({ ...p, meeting: e.target.value }))
                    }
                    className="mt-1 block w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-zinc-100"
                  >
                    {colOpts.map((o) => (
                      <option key={`m-${o.value}`} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs text-zinc-400">
                  Time (optional)
                  <select
                    value={columnMap.time}
                    onChange={(e) =>
                      setColumnMap((p) => ({ ...p, time: e.target.value }))
                    }
                    className="mt-1 block w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-zinc-100"
                  >
                    {colOpts.map((o) => (
                      <option key={`t-${o.value}`} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs text-zinc-400">
                  Venue (optional)
                  <select
                    value={columnMap.venue}
                    onChange={(e) =>
                      setColumnMap((p) => ({ ...p, venue: e.target.value }))
                    }
                    className="mt-1 block w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-zinc-100"
                  >
                    {colOpts.map((o) => (
                      <option key={`v-${o.value}`} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="flex flex-wrap gap-3 text-xs text-zinc-400">
                <label className="inline-flex items-center gap-2">
                  <input
                    type="radio"
                    checked={importMode === 'merge'}
                    onChange={() => setImportMode('merge')}
                  />
                  Merge (purani meetings + nayi)
                </label>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="radio"
                    checked={importMode === 'replace'}
                    onChange={() => setImportMode('replace')}
                  />
                  Replace (sirf CSV wali meetings)
                </label>
              </div>

              {previewMeetings.length > 0 && (
                <p className="text-xs text-emerald-300/90">
                  Preview: {previewMeetings.length} meetings ready import ke liye
                </p>
              )}

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={!previewMeetings.length}
                  onClick={handleImport}
                  className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-amber-500 disabled:opacity-50"
                >
                  Import to App
                </button>
                <button
                  type="button"
                  disabled={!previewMeetings.length}
                  onClick={runPilotTest}
                  className="inline-flex items-center gap-2 rounded-xl border border-indigo-500/50 bg-indigo-500/15 px-4 py-2.5 text-sm font-medium text-indigo-100 hover:bg-indigo-500/25 disabled:opacity-50"
                >
                  <ClipboardCheck className="h-4 w-4" />
                  Pilot test — CSV vs Calendar
                </button>
              </div>

              {pilotReport?.dateAudit && (
                <div
                  className={`mt-3 space-y-3 rounded-lg border p-3 text-xs ${
                    pilotReport.dateAudit.dateShiftRows === 0
                      ? 'border-emerald-500/40 bg-emerald-500/10'
                      : 'border-red-500/40 bg-red-500/10'
                  }`}
                >
                  <p className="font-semibold text-zinc-100">
                    {pilotReport.dateAudit.dateShiftRows === 0
                      ? '✓ DD-MM-YYYY date pilot — calendar sheet se match'
                      : '✗ DD-MM-YYYY date pilot — calendar par galat din'}
                  </p>
                  <p className="text-zinc-400">
                    Sheet format: {pilotReport.dateAudit.sheetFormatAssumed}
                  </p>
                  <ul className="space-y-1 text-zinc-300">
                    <li>DD-MM-YYYY style cells: {pilotReport.dateAudit.dmyPatternRows}</li>
                    <li>
                      Same meeting, sahi date (sheet = app):{' '}
                      <strong className="text-emerald-300">{pilotReport.dateAudit.okRows}</strong>
                    </li>
                    <li>
                      Date shift (sheet alag, app alag):{' '}
                      <strong
                        className={
                          pilotReport.dateAudit.dateShiftRows
                            ? 'text-red-300'
                            : 'text-zinc-400'
                        }
                      >
                        {pilotReport.dateAudit.dateShiftRows}
                      </strong>
                    </li>
                    <li>App mein meeting hi nahi: {pilotReport.dateAudit.missingInAppRows}</li>
                    {pilotReport.dateAudit.ambiguousRows > 0 && (
                      <li className="text-amber-200">
                        Slash dates (06/03) — DMY vs MDY alag:{' '}
                        {pilotReport.dateAudit.ambiguousRows}
                      </li>
                    )}
                  </ul>

                  {pilotReport.dateAudit.shiftedSamples?.length > 0 && (
                    <div className="overflow-x-auto">
                      <p className="mb-2 font-medium text-red-200">
                        Sheet vs Calendar — date shift (pehle 25)
                      </p>
                      <table className="w-full min-w-[520px] border-collapse text-left text-[11px]">
                        <thead>
                          <tr className="border-b border-white/10 text-zinc-500">
                            <th className="py-1 pr-2">Sheet (raw)</th>
                            <th className="py-1 pr-2">Sheet matlab</th>
                            <th className="py-1 pr-2">App calendar</th>
                            <th className="py-1">Meeting</th>
                          </tr>
                        </thead>
                        <tbody className="text-zinc-300">
                          {pilotReport.dateAudit.shiftedSamples.map((r, i) => (
                            <tr key={`sh-${i}`} className="border-b border-white/5">
                              <td className="py-1.5 pr-2 font-mono text-amber-200">{r.rawDate}</td>
                              <td className="py-1.5 pr-2 text-emerald-300/90">{r.sheetLabel}</td>
                              <td className="py-1.5 pr-2 text-red-300/90">{r.appCalendarLabel}</td>
                              <td className="py-1.5 truncate">{r.title}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {pilotReport && (
                <div
                  className={`mt-3 space-y-2 rounded-lg border p-3 text-xs ${
                    pilotReport.allMatched
                      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-100'
                      : 'border-amber-500/40 bg-amber-500/10 text-amber-100'
                  }`}
                >
                  <p className="font-semibold">
                    {pilotReport.allMatched ? '✓ Name + date match' : '⚠ Pilot — differences'}
                  </p>
                  <ul className="space-y-1 text-zinc-300">
                    <li>
                      CSV valid rows: {pilotReport.csvValidCount} / {pilotReport.csvRowCount}
                      {pilotReport.skippedCsvRows > 0 &&
                        ` (${pilotReport.skippedCsvRows} skip — khali date/title)`}
                    </li>
                    <li>App calendar meetings: {pilotReport.appCalendarCount}</li>
                    <li>
                      Match (same date + meeting name):{' '}
                      <strong>{pilotReport.matchedCount}</strong>
                    </li>
                    <li>CSV mein hain, app mein nahi: {pilotReport.onlyInCsvCount}</li>
                    <li>App mein hain, CSV mein nahi: {pilotReport.onlyInAppCount}</li>
                    <li>Shared dates (dono jagah): {pilotReport.datesSharedCount}</li>
                  </ul>
                  {pilotReport.onlyInCsv.length > 0 && (
                    <div>
                      <p className="font-medium text-zinc-400">Sample — sirf CSV:</p>
                      <ul className="mt-1 list-inside list-disc text-zinc-400">
                        {pilotReport.onlyInCsv.map((r, i) => (
                          <li key={`c-${i}`}>
                            {r.date} — {r.title}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {pilotReport.onlyInApp.length > 0 && (
                    <div>
                      <p className="font-medium text-zinc-400">Sample — sirf App:</p>
                      <ul className="mt-1 list-inside list-disc text-zinc-400">
                        {pilotReport.onlyInApp.map((r, i) => (
                          <li key={`a-${i}`}>
                            {r.date} — {r.title}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {pilotReport.titleDateMismatches.length > 0 && (
                    <div>
                      <p className="font-medium text-zinc-400">
                        Same title, different date (CSV vs App):
                      </p>
                      <ul className="mt-1 list-inside list-disc text-zinc-400">
                        {pilotReport.titleDateMismatches.map((r, i) => (
                          <li key={`m-${i}`}>
                            {r.title}: app {r.appDate}, CSV {r.csvDates.join(' / ')}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <p className="text-zinc-500">
                    My Calendar par dot = us date par meeting. Visit Log se date dabao — wahi
                    date honi chahiye jo CSV me hai.
                  </p>
                </div>
              )}
            </div>
          )}

          {message && (
            <p
              className={`mt-3 text-xs ${
                message.startsWith('Done') || message.includes('load')
                  ? 'text-emerald-300'
                  : 'text-red-300'
              }`}
            >
              {message}
            </p>
          )}
        </div>
      </div>
    </GlassCard>
  );
}
