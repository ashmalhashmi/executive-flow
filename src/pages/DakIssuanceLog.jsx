import { useMemo, useState } from 'react';
import {
  FileText,
  Plus,
  MessageCircle,
  Pencil,
  XCircle,
  Save,
  FileDown,
  Filter,
  X,
  Search,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useDakExecutive } from '../context/ExecutiveContext';
import GlassCard from '../components/ui/GlassCard';
import FormField, { TextInput } from '../components/ui/FormField';
import { formatDisplayDate, getTodayISO } from '../utils/dates';
import {
  DAK_DESIGNATION_CUSTOM,
  DAK_DESIGNATION_OPTIONS,
  designationToFormValue,
  resolveDakDesignation,
} from '../constants/dakDesignations';
import { filterDakEntries, searchDakEntries, sortDakEntries } from '../utils/dakEntries';
import { getDakWhatsAppUrl } from '../utils/dakWhatsApp';

const emptyForm = () => ({
  receivedDate: '',
  forwardedDate: getTodayISO(),
  designationPreset: DAK_DESIGNATION_OPTIONS[0],
  designationCustom: '',
  subject: '',
  externalDispatchNo: '',
});

export default function DakIssuanceLog() {
  const { dakEntries, addDakEntry, updateDakEntry, cancelDakEntry } = useDakExecutive();

  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [editingId, setEditingId] = useState('');
  const [editingSystemRef, setEditingSystemRef] = useState('');
  const [pdfBusy, setPdfBusy] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAddressee, setFilterAddressee] = useState('');
  const [filterDispatchDate, setFilterDispatchDate] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const listEntries = useMemo(
    () => sortDakEntries(dakEntries.filter((d) => d.status !== 'cancelled')),
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

  const clearFilters = () => {
    setFilterAddressee('');
    setFilterDispatchDate('');
    setSearchQuery('');
  };

  const resetForm = () => {
    setForm(emptyForm());
    setErrors({});
    setEditingId('');
    setEditingSystemRef('');
    setShowAdvanced(false);
  };

  const startEdit = (entry) => {
    const { preset, custom } = designationToFormValue(entry.designation);
    setEditingId(entry.id);
    setEditingSystemRef(entry.fileId);
    setForm({
      receivedDate: entry.receivedDate || '',
      forwardedDate: entry.forwardedDate,
      designationPreset: preset,
      designationCustom: custom,
      subject: entry.subject,
      externalDispatchNo: entry.externalDispatchNo || '',
    });
    setShowAdvanced(Boolean(entry.externalDispatchNo));
    setErrors({});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const validateForm = () => {
    const next = {};
    if (!form.subject.trim()) next.subject = 'Subject likhein — yahi se file dhundhenge';
    if (!form.forwardedDate) next.forwardedDate = 'Dispatch date select karein';
    const designation = resolveDakDesignation(form.designationPreset, form.designationCustom);
    if (!designation) {
      next.designation =
        form.designationPreset === DAK_DESIGNATION_CUSTOM
          ? 'Addressee likhein'
          : 'Addressee select karein';
    }
    if (Object.keys(next).length) {
      setErrors(next);
      return null;
    }
    setErrors({});
    return {
      receivedDate: form.receivedDate.trim(),
      forwardedDate: form.forwardedDate,
      designation,
      subject: form.subject.trim(),
      externalDispatchNo: form.externalDispatchNo.trim(),
    };
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = validateForm();
    if (!payload) return;

    if (editingId) {
      updateDakEntry(editingId, payload);
    } else {
      addDakEntry(payload);
    }
    resetForm();
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

  const handleCancelEntry = (entry) => {
    if (
      !window.confirm(
        `"${entry.subject}" cancel karein? Ye entry list se hat jayegi.`,
      )
    ) {
      return;
    }
    cancelDakEntry(entry.id);
    if (editingId === entry.id) resetForm();
  };

  const showCustomAddressee = form.designationPreset === DAK_DESIGNATION_CUSTOM;

  return (
    <div className="space-y-6">
      <GlassCard className="border-violet-500/20 bg-violet-500/5 p-5 sm:p-6">
        <div className="mb-4 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-violet-500/30 bg-violet-500/15">
            <FileText className="h-5 w-5 text-violet-300" strokeWidth={1.75} />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-violet-400/90">
              {editingId ? 'Edit Dak Entry' : 'New Dak Entry'}
            </p>
            <p className="text-sm text-zinc-500">
              Sirf context likhein — Subject, Date, Addressee. System apna dispatch number khud
              banayega.
            </p>
          </div>
        </div>

        {editingId && editingSystemRef && (
          <div className="mb-4 rounded-xl border border-violet-500/20 bg-black/30 px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
              System dispatch ref (auto — edit nahi hota)
            </p>
            <p className="mt-1 font-mono text-sm text-violet-200">{editingSystemRef}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField label="Subject *" id="dak-subject" error={errors.subject}>
            <TextInput
              id="dak-subject"
              value={form.subject}
              onChange={(e) => {
                setForm((p) => ({ ...p, subject: e.target.value }));
                setErrors((p) => ({ ...p, subject: undefined }));
              }}
              placeholder="File ka subject / matter — isi se dhundhenge"
              autoFocus
            />
          </FormField>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              label="Date (Dispatched) *"
              id="dak-dispatched"
              error={errors.forwardedDate}
            >
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

          <FormField label="Addressee *" id="dak-addressee" error={errors.designation}>
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
            <FormField label="Addressee (custom)" id="dak-addressee-custom">
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

          <div>
            <button
              type="button"
              onClick={() => setShowAdvanced((v) => !v)}
              className="inline-flex items-center gap-2 text-xs font-medium text-zinc-400 hover:text-zinc-200"
            >
              {showAdvanced ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
              Official outward no. already hai? (optional)
            </button>
            {showAdvanced && (
              <div className="mt-3">
                <FormField
                  label="Official outward no. (optional)"
                  id="dak-external"
                  hint="Registry ka number — system apna ref alag banata hai"
                >
                  <TextInput
                    id="dak-external"
                    value={form.externalDispatchNo}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, externalDispatchNo: e.target.value }))
                    }
                    placeholder="Agar diary / outward register mein pehle se number hai"
                  />
                </FormField>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-violet-500"
            >
              {editingId ? (
                <>
                  <Save className="h-4 w-4" />
                  Save changes
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Add Dak Entry
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
      </GlassCard>

      <GlassCard className="p-5 sm:p-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
              Dak Issuance — All entries
            </h3>
            <p className="mt-1 text-xs text-zinc-500">
              <strong className="text-zinc-300">{filteredEntries.length}</strong> of{' '}
              <strong className="text-zinc-300">{listEntries.length}</strong> file
              {listEntries.length === 1 ? '' : 's'}
              {hasActiveFilter ? ' — search / filter active' : ' — subject & date se scan karein'}
            </p>
          </div>
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

        <div className="mb-4 space-y-3">
          <FormField label="Search by subject, addressee, or date" id="dak-search">
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
              Filter by context
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
              <FormField label="Addressee" id="dak-filter-addressee" className="sm:flex-1">
                <select
                  id="dak-filter-addressee"
                  value={filterAddressee}
                  onChange={(e) => setFilterAddressee(e.target.value)}
                  className="block w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2.5 text-sm text-zinc-100 shadow-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/40"
                >
                  <option value="">All addressees</option>
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

        {listEntries.length === 0 ? (
          <p className="rounded-xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-zinc-500">
            Abhi koi dak entry nahi — upar se subject aur addressee likh kar add karein
          </p>
        ) : filteredEntries.length === 0 ? (
          <p className="rounded-xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-zinc-500">
            Is search / filter par koi dak match nahi — subject ya date badlein
          </p>
        ) : (
          <ul className="space-y-3">
            {filteredEntries.map((entry) => (
              <li
                key={entry.id}
                className="rounded-xl border border-white/10 bg-black/25 p-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold leading-snug text-zinc-100">
                      {entry.subject}
                    </p>
                    <p className="mt-2 text-xs text-zinc-400">
                      <span className="text-zinc-300">
                        {formatDisplayDate(entry.forwardedDate)}
                      </span>
                      <span className="text-zinc-600"> · </span>
                      <span>{entry.designation}</span>
                    </p>
                    <p className="mt-2 font-mono text-[10px] text-zinc-600">
                      System ref: {entry.fileId}
                      {entry.externalDispatchNo
                        ? ` · Official: ${entry.externalDispatchNo}`
                        : ''}
                    </p>
                    {entry.receivedDate && (
                      <p className="mt-1 text-[10px] text-zinc-600">
                        Received: {formatDisplayDate(entry.receivedDate)}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <a
                      href={getDakWhatsAppUrl(entry)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#25D366] px-3 py-2 text-xs font-medium text-white hover:bg-[#20bd5a]"
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                      WhatsApp
                    </a>
                    <button
                      type="button"
                      onClick={() => startEdit(entry)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-2 text-xs text-zinc-200 hover:bg-white/5"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCancelEntry(entry)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/30 px-3 py-2 text-xs text-red-300 hover:bg-red-500/10"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      Cancel
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </GlassCard>
    </div>
  );
}
