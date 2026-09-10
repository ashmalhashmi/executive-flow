import { useEffect, useMemo, useState } from 'react';
import {
  FileText,
  Plus,
  Save,
  FileDown,
  Filter,
  X,
  Search,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Trash2,
} from 'lucide-react';
import { useDakExecutive } from '../context/ExecutiveContext';
import GlassCard from '../components/ui/GlassCard';
import FormField, { TextInput } from '../components/ui/FormField';
import { getTodayISO } from '../utils/dates';
import {
  DAK_DESIGNATION_CUSTOM,
  DAK_DESIGNATION_OPTIONS,
  designationToFormValue,
  resolveDakDesignation,
} from '../constants/dakDesignations';
import { filterDakEntries, searchDakEntries, sortDakRegisterEntries } from '../utils/dakEntries';
import DakScanCapture from '../components/dak/DakScanCapture';
import DakScanPreviewTable from '../components/dak/DakScanPreviewTable';
import DakRegisterTable from '../components/dak/DakRegisterTable';
import ListPager from '../components/ui/ListPager';
import { usePagedList } from '../hooks/usePagedList';
import { extractedRowsToScanDraft } from '../utils/dakAiExtract';

const emptyForm = () => ({
  registerSr: '',
  receivedDate: '',
  forwardedDate: getTodayISO(),
  designationPreset: DAK_DESIGNATION_OPTIONS[0],
  designationCustom: '',
  subject: '',
});

function scrollToRegister(highlightId) {
  document.getElementById('dak-register')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  if (highlightId) {
    setTimeout(() => {
      document.getElementById(`dak-entry-${highlightId}`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }, 350);
  }
}

export default function DakIssuanceLog() {
  const { dakEntries, addDakEntry, addDakEntriesBulk, updateDakEntry, eraseAllDakEntries } =
    useDakExecutive();

  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [editingId, setEditingId] = useState('');
  const [pdfBusy, setPdfBusy] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAddressee, setFilterAddressee] = useState('');
  const [filterDispatchDate, setFilterDispatchDate] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [scanDraftRows, setScanDraftRows] = useState([]);
  const [scanPhotoUrl, setScanPhotoUrl] = useState('');
  const [registerNotice, setRegisterNotice] = useState('');
  const [highlightEntryIds, setHighlightEntryIds] = useState([]);

  const listEntries = useMemo(
    () => sortDakRegisterEntries(dakEntries.filter((d) => d.status !== 'cancelled')),
    [dakEntries],
  );

  const addresseeFilterOptions = useMemo(() => {
    const fromData = new Set(listEntries.map((entry) => entry.designation));
    const merged = [...DAK_DESIGNATION_OPTIONS];
    for (const addressee of fromData) {
      if (!merged.includes(addressee)) merged.push(addressee);
    }
    return merged.sort((a, b) => a.localeCompare(b));
  }, [listEntries]);

  const filteredEntries = useMemo(() => {
    const searched = searchDakEntries(listEntries, searchQuery);
    return filterDakEntries(searched, {
      addressee: filterAddressee,
      dispatchDate: filterDispatchDate,
    });
  }, [listEntries, searchQuery, filterAddressee, filterDispatchDate]);

  const hasActiveFilter = Boolean(filterAddressee || filterDispatchDate.trim() || searchQuery.trim());
  const dakFilterKey = `${searchQuery}|${filterAddressee}|${filterDispatchDate}`;
  const {
    page: dakPage,
    setPage: setDakPage,
    totalPages: dakTotalPages,
    pageItems: dakPageItems,
    total: dakTotal,
    showingLabel: dakShowingLabel,
  } = usePagedList(filteredEntries, { pageSize: 50, resetKey: dakFilterKey });

  useEffect(() => {
    if (!highlightEntryIds.length) return undefined;
    const timer = window.setTimeout(() => setHighlightEntryIds([]), 12000);
    return () => window.clearTimeout(timer);
  }, [highlightEntryIds]);

  useEffect(() => {
    if (listEntries.length === 0) setShowAddForm(true);
  }, [listEntries.length]);

  const clearFilters = () => {
    setFilterAddressee('');
    setFilterDispatchDate('');
    setSearchQuery('');
  };

  const resetForm = () => {
    setForm(emptyForm());
    setErrors({});
    setEditingId('');
  };

  const showSavedInRegister = (savedEntries, message) => {
    const ids = savedEntries.map((e) => e.id).filter(Boolean);
    setHighlightEntryIds(ids);
    setRegisterNotice(message);
    clearFilters();
    scrollToRegister(ids[0]);
  };

  const handleScanExtracted = ({ rows, scanPhotoUrl: photoUrl, storageWarning }) => {
    setScanDraftRows(extractedRowsToScanDraft(rows));
    setScanPhotoUrl(String(photoUrl ?? '').trim());
    setRegisterNotice(storageWarning || '');
    setShowAddForm(true);
    setTimeout(() => {
      document.getElementById('dak-scan-preview')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleSaveScanRows = (payloads) => {
    const saved = addDakEntriesBulk(payloads);
    setScanDraftRows([]);
    setScanPhotoUrl('');
    showSavedInRegister(
      saved,
      `${saved.length} entr${saved.length === 1 ? 'y' : 'ies'} digital register mein save — neeche table dekhein`,
    );
  };

  const clearScanDraft = () => {
    setScanDraftRows([]);
    setScanPhotoUrl('');
  };

  const startEdit = (entry) => {
    const { preset, custom } = designationToFormValue(entry.designation);
    setEditingId(entry.id);
    setForm({
      registerSr: entry.registerSr ? String(entry.registerSr) : '',
      receivedDate: entry.receivedDate || '',
      forwardedDate: entry.forwardedDate,
      designationPreset: preset,
      designationCustom: custom,
      subject: entry.subject,
    });
    setErrors({});
    setShowAddForm(true);
    setRegisterNotice('');
    document.getElementById('dak-add-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  const validateForm = () => {
    const next = {};
    if (!form.subject.trim()) next.subject = 'Subject likhein — yahi se file dhundhenge';
    if (!form.forwardedDate) next.forwardedDate = 'Dispatch date select karein';
    const designation = resolveDakDesignation(form.designationPreset, form.designationCustom);
    if (!designation) {
      next.designation =
        form.designationPreset === DAK_DESIGNATION_CUSTOM
          ? 'Marked To likhein'
          : 'Marked To select karein';
    }
    if (Object.keys(next).length) {
      setErrors(next);
      return null;
    }
    setErrors({});
    return {
      registerSr: form.registerSr.trim() ? Number(form.registerSr) : undefined,
      receivedDate: form.receivedDate.trim(),
      forwardedDate: form.forwardedDate,
      designation,
      subject: form.subject.trim(),
    };
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = validateForm();
    if (!payload) return;

    if (editingId) {
      const id = editingId;
      updateDakEntry(id, payload);
      resetForm();
      setShowAddForm(false);
      showSavedInRegister([{ id }], 'Entry update ho gayi — register table mein dekhein');
    } else {
      const created = addDakEntry(payload);
      resetForm();
      setShowAddForm(false);
      showSavedInRegister([created], 'Nayi entry digital register mein save — table mein dekhein');
    }
  };

  const handleDownloadPdf = async () => {
    if (!filteredEntries.length) return;
    setPdfBusy(true);
    try {
      const { downloadDakIssuancePdf } = await import('../utils/dakIssuancePdf');
      downloadDakIssuancePdf(filteredEntries);
    } finally {
      setPdfBusy(false);
    }
  };

  const handleEraseAllDak = () => {
    const count = listEntries.length;
    if (!count) return;
    if (
      !window.confirm(
        `Poora Dak Issuance Log erase karein?\n\n${count} entr${count === 1 ? 'y' : 'ies'} delete ho jayengi — register khali ho jayega.`,
      )
    ) {
      return;
    }
    eraseAllDakEntries();
    resetForm();
    setScanDraftRows([]);
    setScanPhotoUrl('');
    setShowAddForm(false);
    setHighlightEntryIds([]);
    setRegisterNotice(`${count} entr${count === 1 ? 'y' : 'ies'} erase — register khali`);
  };

  const showCustomAddressee = form.designationPreset === DAK_DESIGNATION_CUSTOM;

  return (
    <div className="space-y-6">
      <GlassCard id="dak-register" className="border-violet-500/30 bg-violet-500/5 p-5 sm:p-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-violet-500/30 bg-violet-500/15">
              <BookOpen className="h-5 w-5 text-violet-300" strokeWidth={1.75} />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-violet-400/90">
                Dak Issuance Register — digital
              </p>
              <p className="text-sm text-zinc-500">
                Manual register jaisa — save ke baad yahi table dikhegi, app band karke dubara kholne par bhi
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={!listEntries.length}
              onClick={handleEraseAllDak}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-500/35 bg-red-500/10 px-4 py-2.5 text-sm font-medium text-red-200 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Trash2 className="h-4 w-4" />
              Erase Dak
            </button>
            <button
              type="button"
              disabled={!filteredEntries.length || pdfBusy}
              onClick={handleDownloadPdf}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-violet-500/40 bg-violet-500/15 px-4 py-2.5 text-sm font-medium text-violet-100 hover:bg-violet-500/25 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <FileDown className={`h-4 w-4 ${pdfBusy ? 'animate-pulse' : ''}`} />
              {pdfBusy ? 'PDF…' : `Download PDF (${filteredEntries.length})`}
            </button>
          </div>
        </div>

        {registerNotice && (
          <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
            {registerNotice}
          </div>
        )}

        <div className="mb-4 space-y-3">
          <FormField label="Search register — subject, marked to, date" id="dak-search">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <TextInput
                id="dak-search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="e.g. budget approval, GM(IT), 2026-07-12"
                className="pl-10"
              />
            </div>
          </FormField>

          <div className="rounded-xl border border-violet-500/25 bg-violet-500/5 p-4">
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-violet-300/90">
              <Filter className="h-4 w-4" />
              Filter
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
              <FormField label="Marked To" id="dak-filter-addressee" className="sm:flex-1">
                <select
                  id="dak-filter-addressee"
                  value={filterAddressee}
                  onChange={(e) => setFilterAddressee(e.target.value)}
                  className="block w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2.5 text-sm text-zinc-100 shadow-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/40"
                >
                  <option value="">All marked to</option>
                  {addresseeFilterOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Date (Dispatched)" id="dak-filter-dispatch" className="sm:flex-1">
                <TextInput
                  id="dak-filter-dispatch"
                  type="date"
                  value={filterDispatchDate}
                  onChange={(e) => setFilterDispatchDate(e.target.value)}
                />
              </FormField>
              {hasActiveFilter && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/15 px-4 py-2.5 text-sm text-zinc-300 hover:bg-white/5"
                >
                  <X className="h-4 w-4" />
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>

        <p className="mb-3 text-xs text-zinc-500">
          <strong className="text-zinc-300">{filteredEntries.length}</strong> of{' '}
          <strong className="text-zinc-300">{listEntries.length}</strong> entr
          {listEntries.length === 1 ? 'y' : 'ies'}
          {hasActiveFilter ? ' — filter active' : ''}
          {filteredEntries.length > 0 ? ` · ${dakShowingLabel}` : ''}
        </p>

        {listEntries.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/10 px-4 py-10 text-center">
            <p className="text-sm text-zinc-400">Register abhi khali hai</p>
            <p className="mt-2 text-xs text-zinc-500">
              Neeche se scan karein ya manual entry add karein — save ke baad yahan table mein dikhega
            </p>
            <button
              type="button"
              onClick={() => {
                setShowAddForm(true);
                document.getElementById('dak-add-section')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500"
            >
              <Plus className="h-4 w-4" />
              Pehli entry add karein
            </button>
          </div>
        ) : filteredEntries.length === 0 ? (
          <p className="rounded-xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-zinc-500">
            Is search / filter par koi entry nahi — Clear karein
          </p>
        ) : (
          <>
            <ListPager
              page={dakPage}
              totalPages={dakTotalPages}
              total={dakTotal}
              showingLabel={dakShowingLabel}
              onPageChange={setDakPage}
              className="mb-3"
            />
            <DakRegisterTable
              entries={dakPageItems}
              highlightIds={highlightEntryIds}
              onEdit={startEdit}
            />
            <ListPager
              page={dakPage}
              totalPages={dakTotalPages}
              total={dakTotal}
              showingLabel={dakShowingLabel}
              onPageChange={setDakPage}
              className="mt-3"
            />
          </>
        )}
      </GlassCard>

      <GlassCard id="dak-add-section" className="border-violet-500/20 p-5 sm:p-6">
        <button
          type="button"
          onClick={() => setShowAddForm((v) => !v)}
          className="flex w-full items-center justify-between gap-3 text-left"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/5">
              <FileText className="h-5 w-5 text-violet-300" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Nayi entry — scan ya manual
              </p>
              <p className="text-sm text-zinc-500">Save ke baad upar wali register table mein dikhega</p>
            </div>
          </div>
          {showAddForm ? (
            <ChevronUp className="h-5 w-5 shrink-0 text-zinc-500" />
          ) : (
            <ChevronDown className="h-5 w-5 shrink-0 text-zinc-500" />
          )}
        </button>

        {showAddForm && (
          <div className="mt-5 border-t border-white/10 pt-5">
            {!editingId && (
              <div className="mb-4">
                <DakScanCapture onExtracted={handleScanExtracted} disabled={Boolean(editingId)} />
              </div>
            )}

            {!editingId && scanDraftRows.length > 0 && (
              <div id="dak-scan-preview" className="mb-4">
                {scanPhotoUrl && (
                  <p className="mb-2 text-xs text-emerald-300/90">
                    Scan photo cloud par save —{' '}
                    <a
                      href={scanPhotoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline hover:text-emerald-200"
                    >
                      preview
                    </a>
                  </p>
                )}
                <DakScanPreviewTable
                  rows={scanDraftRows}
                  scanPhotoUrl={scanPhotoUrl}
                  onChange={setScanDraftRows}
                  onSave={handleSaveScanRows}
                  onDismiss={clearScanDraft}
                />
              </div>
            )}

            {editingId && form.registerSr && (
              <div className="mb-4 rounded-xl border border-violet-500/20 bg-black/30 px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                  Register Sr#
                </p>
                <p className="mt-1 text-sm text-violet-200">{form.registerSr}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {!editingId && (
                <FormField
                  label="Sr# (optional)"
                  id="dak-sr"
                  hint="Khali chhor dein — agla number auto assign hoga (manual register jaisa)"
                >
                  <TextInput
                    id="dak-sr"
                    inputMode="numeric"
                    value={form.registerSr}
                    onChange={(e) => setForm((p) => ({ ...p, registerSr: e.target.value }))}
                    placeholder="e.g. 45"
                  />
                </FormField>
              )}

              <FormField label="Subject *" id="dak-subject" error={errors.subject}>
                <TextInput
                  id="dak-subject"
                  value={form.subject}
                  onChange={(e) => {
                    setForm((p) => ({ ...p, subject: e.target.value }));
                    setErrors((p) => ({ ...p, subject: undefined }));
                  }}
                  placeholder="File ka subject / matter"
                />
              </FormField>

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Date (Dispatched) *" id="dak-dispatched" error={errors.forwardedDate}>
                  <TextInput
                    id="dak-dispatched"
                    type="date"
                    value={form.forwardedDate}
                    onChange={(e) => {
                      setForm((p) => ({ ...p, forwardedDate: e.target.value }));
                      setErrors((p) => ({ ...p, forwardedDate: undefined }));
                    }}
                  />
                </FormField>
                <FormField label="Date Received (optional)" id="dak-received">
                  <TextInput
                    id="dak-received"
                    type="date"
                    value={form.receivedDate}
                    onChange={(e) => setForm((p) => ({ ...p, receivedDate: e.target.value }))}
                  />
                </FormField>
              </div>

              <FormField label="Marked To *" id="dak-addressee" error={errors.designation}>
                <select
                  id="dak-addressee"
                  value={form.designationPreset}
                  onChange={(e) => {
                    setForm((p) => ({ ...p, designationPreset: e.target.value }));
                    setErrors((p) => ({ ...p, designation: undefined }));
                  }}
                  className="block w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2.5 text-sm text-zinc-100 shadow-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/40"
                >
                  {DAK_DESIGNATION_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                  <option value={DAK_DESIGNATION_CUSTOM}>Other — naam / office likhein</option>
                </select>
              </FormField>

              {showCustomAddressee && (
                <FormField label="Marked To (custom)" id="dak-addressee-custom">
                  <TextInput
                    id="dak-addressee-custom"
                    value={form.designationCustom}
                    onChange={(e) => {
                      setForm((p) => ({ ...p, designationCustom: e.target.value }));
                      setErrors((p) => ({ ...p, designation: undefined }));
                    }}
                    placeholder="Jisko dak ja rahi hai"
                  />
                </FormField>
              )}

              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-violet-500"
                >
                  {editingId ? (
                    <>
                      <Save className="h-4 w-4" />
                      Save &amp; register mein dekhein
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      Add to register
                    </>
                  )}
                </button>
                {editingId && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-4 py-2.5 text-sm text-zinc-300 hover:bg-white/5"
                  >
                    Cancel edit
                  </button>
                )}
              </div>
            </form>
          </div>
        )}
      </GlassCard>
    </div>
  );
}
