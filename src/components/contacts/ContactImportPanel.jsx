import { useMemo, useState } from 'react';
import { Loader2, Undo2, Upload } from 'lucide-react';
import CollapsibleSection from '../ui/CollapsibleSection';
import {
  CONTACT_IMPORT_FIELDS,
  emptyContactUiColumnMap,
  guessContactColumnMap,
  parseColumnIndex,
  previewMappedContactRows,
  readContactImportFile,
  rowsToContacts,
  uiColumnMapFromIndexMapping,
} from '../../utils/contactCsvImport';
import {
  countFileImportedContacts,
  withoutFileImportedContacts,
} from '../../utils/contactEntries';

const COL_OPTIONS = (headers) => [
  { value: '', label: '— Select column —' },
  ...headers.map((h, i) => ({ value: String(i), label: h || `Column ${i + 1}` })),
];

/** Isolated chunk — CSV/JSON import helpers stay off Contact Database first paint. */
export default function ContactImportPanel({ contacts, importContacts }) {
  const [importBusy, setImportBusy] = useState(false);
  const [importMessage, setImportMessage] = useState('');
  const [importFileName, setImportFileName] = useState('');
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [csvRows, setCsvRows] = useState([]);
  const [jsonContacts, setJsonContacts] = useState([]);
  const [importType, setImportType] = useState('');
  const [columnMap, setColumnMap] = useState(emptyContactUiColumnMap);
  const [importMode, setImportMode] = useState('merge');
  const [importOpen, setImportOpen] = useState(false);

  const importedFileCount = useMemo(
    () => countFileImportedContacts(contacts),
    [contacts],
  );

  const previewContacts = useMemo(() => {
    if (importType === 'json') return jsonContacts;
    if (parseColumnIndex(columnMap.name) === null) return [];
    return rowsToContacts(csvRows, columnMap);
  }, [importType, jsonContacts, csvRows, columnMap]);

  const mappedPreviewRows = useMemo(() => {
    if (!csvRows.length || parseColumnIndex(columnMap.name) === null) return [];
    return previewMappedContactRows(csvRows, columnMap, 3);
  }, [csvRows, columnMap]);

  const handleImportFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportBusy(true);
    setImportMessage('');
    try {
      const result = await readContactImportFile(file);
      setImportFileName(file.name);
      setImportType(result.type);
      if (result.type === 'json') {
        setJsonContacts(result.contacts);
        setCsvHeaders([]);
        setCsvRows([]);
        setImportMessage(`${result.contacts.length} contacts JSON se load — Import dabayein`);
      } else {
        setJsonContacts([]);
        setCsvHeaders(result.headers);
        setCsvRows(result.rows);
        const guessed = guessContactColumnMap(result.headers);
        setColumnMap(uiColumnMapFromIndexMapping(guessed));
        setImportMessage(`${result.rows.length} rows load ho gayi — neeche columns confirm karein`);
      }
      setImportOpen(true);
    } catch (err) {
      setImportMessage(err.message || 'File read failed');
      setImportFileName('');
      setCsvHeaders([]);
      setCsvRows([]);
      setJsonContacts([]);
      setImportType('');
    } finally {
      setImportBusy(false);
      e.target.value = '';
    }
  };

  const handleImportToApp = () => {
    if (!previewContacts.length) {
      setImportMessage('Import ke liye valid contacts nahi — Naam column + phone/email zaroori');
      return;
    }
    const label =
      importMode === 'merge'
        ? `${previewContacts.length} contacts purane list ke sath jod dein?`
        : `${previewContacts.length} contacts import karein? Purani contacts replace ho jayengi.`;
    if (!window.confirm(label)) return;

    const { saved, merged } = importContacts(previewContacts, importMode);
    const mergeNote =
      merged > 0 ? ` · ${merged} duplicate${merged === 1 ? '' : 's'} merged` : '';
    setImportMessage(`Done — ${saved} unique contacts${mergeNote}. Neeche list dekhein.`);
    setCsvHeaders([]);
    setCsvRows([]);
    setJsonContacts([]);
    setImportType('');
    setImportFileName('');
  };

  const handleCancelFileImport = () => {
    if (!importedFileCount) {
      setImportMessage('Koi file import mojood nahi');
      return;
    }
    if (
      !window.confirm(
        `Cancel file import?\n\n${importedFileCount} file se import contacts delete ho jayenge.\nManual contacts reh jayenge.`,
      )
    ) {
      return;
    }
    importContacts(withoutFileImportedContacts(contacts), 'replace');
    setImportMessage(`Done — ${importedFileCount} imported contacts hata diye`);
  };

  const colOpts = COL_OPTIONS(csvHeaders);

  return (
    <CollapsibleSection
      open={importOpen}
      onOpenChange={setImportOpen}
      defaultOpen={false}
      className="border-violet-500/20 bg-violet-500/5 p-5 sm:p-6"
      icon={<Upload className="h-5 w-5 text-violet-300" />}
      title="File se Import"
      subtitle="CSV / JSON — zaroorat par kholein"
      badge={importedFileCount > 0 ? String(importedFileCount) : undefined}
    >
      <div className="mb-4 flex flex-wrap gap-2">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-violet-500/30 bg-violet-500/10 px-4 py-2.5 text-sm font-medium text-violet-200 hover:bg-violet-500/20">
          {importBusy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          CSV / JSON file choose karein
          <input
            type="file"
            accept=".csv,.json,text/csv,application/json"
            className="sr-only"
            disabled={importBusy}
            onChange={handleImportFile}
          />
        </label>
        {importedFileCount > 0 && (
          <button
            type="button"
            onClick={handleCancelFileImport}
            className="inline-flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-sm text-rose-200 hover:bg-rose-500/20"
          >
            <Undo2 className="h-4 w-4" />
            Cancel file import ({importedFileCount})
          </button>
        )}
      </div>

      {importFileName && (
        <p className="mb-3 text-xs text-zinc-400">
          File: <span className="text-zinc-200">{importFileName}</span>
          {importType === 'csv' && csvRows.length > 0 && ` · ${csvRows.length} rows`}
          {importType === 'json' &&
            jsonContacts.length > 0 &&
            ` · ${jsonContacts.length} contacts`}
        </p>
      )}

      {csvHeaders.length > 0 && (
        <div className="mb-4 space-y-3 rounded-xl border border-white/10 bg-black/20 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Robot ko batayein — kaun column kya hai
          </p>
          <p className="text-xs text-zinc-500">
            Har dropdown = aapki CSV file ka column. Import usi index se value lega.
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {CONTACT_IMPORT_FIELDS.map(({ key, label, required }) => (
              <label key={key} className="text-xs text-zinc-400">
                {label}
                {required ? ' *' : ' (optional)'}
                <select
                  value={columnMap[key]}
                  onChange={(e) => setColumnMap((p) => ({ ...p, [key]: e.target.value }))}
                  className="mt-1 block w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-zinc-100"
                >
                  {colOpts.map((opt) => (
                    <option key={`${key}-${opt.value || 'empty'}`} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>

          {mappedPreviewRows.length > 0 && (
            <div className="rounded-lg border border-violet-500/20 bg-violet-500/5 p-3">
              <p className="mb-2 text-xs font-medium text-violet-200">
                Mapping preview (file se pehli rows)
              </p>
              <ul className="space-y-2 text-xs text-zinc-400">
                {mappedPreviewRows.map((row, i) => (
                  <li key={i} className="rounded border border-white/5 bg-black/20 px-2 py-1.5">
                    <span className="font-medium text-zinc-200">{row.name}</span>
                    {row.department && ` · ${row.department}`}
                    {row.designation && ` · ${row.designation}`}
                    {row.phone && ` · ${row.phone}`}
                    {row.email && ` · ${row.email}`}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-emerald-300/90">
                Ready: {previewContacts.length} contacts import ke liye
              </p>
            </div>
          )}
        </div>
      )}

      {(csvHeaders.length > 0 || jsonContacts.length > 0) && (
        <div className="mb-4 flex flex-wrap gap-4 text-sm text-zinc-400">
          <label className="inline-flex items-center gap-2">
            <input
              type="radio"
              name="contact-import-mode"
              checked={importMode === 'merge'}
              onChange={() => setImportMode('merge')}
            />
            Merge (purani + nayi)
          </label>
          <label className="inline-flex items-center gap-2">
            <input
              type="radio"
              name="contact-import-mode"
              checked={importMode === 'replace'}
              onChange={() => setImportMode('replace')}
            />
            Replace (sirf file wale)
          </label>
        </div>
      )}

      {(csvHeaders.length > 0 || jsonContacts.length > 0) && (
        <button
          type="button"
          onClick={handleImportToApp}
          disabled={!previewContacts.length}
          className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Upload className="h-4 w-4" />
          Import to App ({previewContacts.length})
        </button>
      )}

      {importMessage && <p className="mt-3 text-sm text-zinc-400">{importMessage}</p>}

      <p className="mt-4 text-xs text-zinc-600">
        CSV columns: Naam, Phone, Email, Department, Designation, Contact No, Address — ya JSON /
        app backup file jisme <code className="text-zinc-500">contacts</code> array ho.
      </p>
    </CollapsibleSection>
  );
}
