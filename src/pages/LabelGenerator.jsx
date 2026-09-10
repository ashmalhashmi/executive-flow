import { useMemo, useState } from 'react';
import {
  Tag,
  Plus,
  FileDown,
  FileType,
  Mail,
  Loader2,
  Trash2,
  Eye,
  Save,
} from 'lucide-react';
import { useLabelsExecutive } from '../context/ExecutiveContext';
import GlassCard from '../components/ui/GlassCard';
import FormField, { SelectInput, TextInput } from '../components/ui/FormField';
import ListPager from '../components/ui/ListPager';
import { usePagedList } from '../hooks/usePagedList';
import {
  DEFAULT_FILE_LABEL_FORMAT,
  FILE_LABEL_BORDERS,
  FILE_LABEL_COPIES_MAX,
  FILE_LABEL_NAME_SIZES,
  FILE_LABEL_ORIENTATIONS,
  PAFDA_LABEL_IDENTITY,
  fileLabelPreviewBorderStyle,
  getFileLabelBox,
  resolveFileLabelFormat,
} from '../constants/labelTemplates';
import { normalizeFileLabelDesignation } from '../utils/fileLabelEntries';
import { downloadFileLabelPdf } from '../utils/labelPdf';
import { downloadFileLabelWord } from '../utils/fileLabelDocHtml';
import { sendFileLabelPdfEmail } from '../utils/fileLabelEmail';

const EMAIL_KEY = 'executive_flow_file_label_email';

function loadExportEmail() {
  try {
    return localStorage.getItem(EMAIL_KEY) || '';
  } catch {
    return '';
  }
}

function saveExportEmail(email) {
  try {
    localStorage.setItem(EMAIL_KEY, String(email || '').trim());
  } catch {
    /* ignore */
  }
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
}

function formatSavedAt(iso) {
  try {
    return new Date(iso).toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

function emptyForm() {
  return { name: '', ...DEFAULT_FILE_LABEL_FORMAT };
}

function formatFromEntry(entry) {
  return resolveFileLabelFormat(entry);
}

export default function LabelGenerator() {
  const { fileLabels, addFileLabel, updateFileLabel, removeFileLabel } = useLabelsExecutive();
  const [form, setForm] = useState(emptyForm);
  const [emailTo, setEmailTo] = useState(() => loadExportEmail());
  const [selectedId, setSelectedId] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState('');

  const listEntries = useMemo(
    () =>
      [...fileLabels].sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || ''))),
    [fileLabels],
  );

  const {
    page,
    setPage,
    totalPages,
    pageItems,
    total,
    showingLabel,
  } = usePagedList(listEntries, { pageSize: 50 });

  const format = resolveFileLabelFormat(form);
  const nameSpec = FILE_LABEL_NAME_SIZES[format.nameSize];
  const borderSpec = FILE_LABEL_BORDERS[format.border];
  const box = getFileLabelBox(format.orientation);
  const isPortrait = format.orientation === 'portrait';
  const previewName = normalizeFileLabelDesignation(form.name);
  const canExport = previewName.length > 0;
  const identity = PAFDA_LABEL_IDENTITY;
  const { forest, gold, slate, ink } = identity.colors;

  const exportPayload = (name, extra) => ({
    name: normalizeFileLabelDesignation(name),
    ...resolveFileLabelFormat(extra),
  });

  const runExport = async (kind, payload) => {
    const options = exportPayload(payload?.name, payload);
    if (!options.name) {
      setMessage('Pehle designation likhein — e.g. Member (Pharma).');
      return;
    }
    if (kind === 'email' && !isValidEmail(emailTo.trim())) {
      setMessage('Pehle valid email address likhein.');
      return;
    }
    setBusy(kind);
    setMessage('');
    try {
      if (kind === 'pdf') {
        const filename = await downloadFileLabelPdf(options);
        setMessage(`PDF ready — ${filename}`);
      } else if (kind === 'word') {
        const filename = await downloadFileLabelWord(options);
        setMessage(`Word ready — ${filename}`);
      } else if (kind === 'email') {
        const to = emailTo.trim();
        const result = await sendFileLabelPdfEmail({ email: to, ...options });
        saveExportEmail(to);
        setMessage(
          `PDF email ho gayi → ${to}${result.filename ? ` (${result.filename})` : ''}.`,
        );
      }
    } catch (err) {
      setMessage(err.message || 'Export fail');
    } finally {
      setBusy('');
    }
  };

  const handleSave = () => {
    if (!previewName) {
      setMessage('Pehle designation likhein — e.g. Member (Pharma).');
      return;
    }
    const payload = { name: previewName, ...format };
    if (selectedId) {
      updateFileLabel(selectedId, payload);
      setMessage('Label update ho gaya — Pulse cloud par bhi jayega.');
      return;
    }
    const created = addFileLabel(payload);
    if (created?.id) setSelectedId(created.id);
    setMessage('Label save ho gaya — Pulse cloud par bhi jayega.');
  };

  const handleSelect = (entry) => {
    setSelectedId(entry.id);
    setForm({ name: entry.name, ...formatFromEntry(entry) });
    setMessage('');
  };

  const handleNew = () => {
    setSelectedId('');
    setForm(emptyForm());
    setMessage('');
  };

  const handleDelete = (entry) => {
    if (!window.confirm(`"${entry.name}" delete karein?`)) return;
    removeFileLabel(entry.id);
    if (selectedId === entry.id) handleNew();
    setMessage('Label delete ho gaya.');
  };

  return (
    <div className="space-y-6">
      <GlassCard className="border-emerald-500/20 bg-emerald-500/5 p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/15">
            <Tag className="h-5 w-5 text-emerald-300" strokeWidth={1.75} />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400/90">
              File Labels
            </p>
            <p className="mt-1 text-sm text-zinc-400">
              Official plate — locked{' '}
              <span className="text-zinc-200">{identity.acronym}</span> + legal name, gold divider,
              phir aapka designation. Center-aligned, forest / gold / slate. Size, weight, border,
              orientation, copies aap set karte ho.
            </p>
          </div>
        </div>
      </GlassCard>

      <div className="grid gap-6 lg:grid-cols-2">
        <GlassCard className="p-5 sm:p-6">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-300">
            {selectedId ? 'Edit label' : 'New label'}
          </h3>
          <FormField
            label="Designation *"
            id="file-label-name"
            hint="Aik integrated tukra — Member (Pharma). Do lines mein mat todo."
          >
            <TextInput
              id="file-label-name"
              value={form.name}
              placeholder="Member (Pharma)"
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            />
          </FormField>

          <div className="mt-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-center">
            <p
              className="text-[11px] font-bold tracking-[0.28em]"
              style={{ color: '#6ee7b7' }}
            >
              {identity.acronym}
            </p>
            <p className="mt-0.5 text-[10px] text-zinc-500">{identity.legalName}</p>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <FormField label="Designation size" id="file-label-name-size">
              <SelectInput
                id="file-label-name-size"
                value={format.nameSize}
                onChange={(e) => setForm((p) => ({ ...p, nameSize: e.target.value }))}
              >
                {Object.values(FILE_LABEL_NAME_SIZES).map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </SelectInput>
            </FormField>
            <FormField label="Weight" id="file-label-weight">
              <SelectInput
                id="file-label-weight"
                value={format.nameWeight}
                onChange={(e) => setForm((p) => ({ ...p, nameWeight: e.target.value }))}
              >
                <option value="bold">Bold</option>
                <option value="regular">Regular</option>
              </SelectInput>
            </FormField>
            <FormField label="Border" id="file-label-border">
              <SelectInput
                id="file-label-border"
                value={format.border}
                onChange={(e) => setForm((p) => ({ ...p, border: e.target.value }))}
              >
                {Object.values(FILE_LABEL_BORDERS).map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </SelectInput>
            </FormField>
            <FormField label="Orientation" id="file-label-orientation">
              <SelectInput
                id="file-label-orientation"
                value={format.orientation}
                onChange={(e) => setForm((p) => ({ ...p, orientation: e.target.value }))}
              >
                {Object.values(FILE_LABEL_ORIENTATIONS).map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </SelectInput>
            </FormField>
            <FormField
              label="Label copies"
              id="file-label-copies"
              hint="Scroll / select — utni identical plates preview + PDF / Word / Email"
            >
              <SelectInput
                id="file-label-copies"
                value={String(format.copies)}
                onChange={(e) => setForm((p) => ({ ...p, copies: Number(e.target.value) }))}
              >
                {Array.from({ length: FILE_LABEL_COPIES_MAX }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    {n} {n === 1 ? 'copy' : 'copies'}
                  </option>
                ))}
              </SelectInput>
            </FormField>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={!canExport}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {selectedId ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {selectedId ? 'Save changes' : 'Save'}
            </button>
            {selectedId ? (
              <button
                type="button"
                onClick={handleNew}
                className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-4 py-2.5 text-sm text-zinc-300 hover:bg-white/5"
              >
                New label
              </button>
            ) : null}
            <button
              type="button"
              disabled={Boolean(busy) || !canExport}
              onClick={() => runExport('pdf', { name: previewName, ...format })}
              className="inline-flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-sm font-medium text-amber-200 hover:bg-amber-500/20 disabled:opacity-50"
            >
              <FileDown className="h-4 w-4" />
              {busy === 'pdf' ? 'PDF…' : 'PDF'}
            </button>
            <button
              type="button"
              disabled={Boolean(busy) || !canExport}
              onClick={() => runExport('word', { name: previewName, ...format })}
              className="inline-flex items-center gap-2 rounded-xl border border-sky-500/30 bg-sky-500/10 px-3 py-2.5 text-sm font-medium text-sky-200 hover:bg-sky-500/20 disabled:opacity-50"
            >
              <FileType className="h-4 w-4" />
              {busy === 'word' ? 'Word…' : 'Word'}
            </button>
          </div>

          <div className="mt-4 space-y-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
            <FormField label="Email PDF" id="file-label-email">
              <TextInput
                id="file-label-email"
                type="email"
                value={emailTo}
                onChange={(e) => setEmailTo(e.target.value)}
                placeholder="you@example.com"
              />
            </FormField>
            <button
              type="button"
              disabled={Boolean(busy) || !canExport}
              onClick={() => runExport('email', { name: previewName, ...format })}
              className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-200 hover:bg-emerald-500/20 disabled:opacity-50"
            >
              {busy === 'email' ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Mail className="h-3.5 w-3.5" />
              )}
              {busy === 'email' ? 'Sending…' : 'Email PDF'}
            </button>
          </div>
          {message && <p className="mt-3 text-sm text-emerald-200/90">{message}</p>}
        </GlassCard>

        <GlassCard className="border-white/10 p-5 sm:p-6">
          <h3 className="mb-1 text-sm font-semibold uppercase tracking-wider text-zinc-300">
            Preview
          </h3>
          <p className="mb-4 text-xs text-zinc-500">
            {box.label} · {box.widthMm}×{box.heightMm} mm · A4 {box.page} · {format.copies}{' '}
            {format.copies === 1 ? 'copy' : 'copies'}
          </p>
          <div className="flex max-h-[520px] min-h-[200px] flex-col items-center gap-4 overflow-auto rounded-2xl border border-dashed border-white/15 bg-zinc-950/60 p-5">
            {Array.from({ length: format.copies }, (_, i) => (
              <div
                key={`preview-plate-${i}`}
                className="flex shrink-0 flex-col items-center justify-center bg-white px-4 py-3 text-center shadow-lg"
                style={{
                  width: box.previewW,
                  minHeight: box.previewH,
                  ...fileLabelPreviewBorderStyle(borderSpec),
                }}
              >
                <p
                  className="font-bold leading-none"
                  style={{
                    color: forest,
                    fontSize: isPortrait ? 15 : 20,
                    letterSpacing: isPortrait ? '0.22em' : '0.32em',
                  }}
                >
                  {identity.acronym}
                </p>
                <p
                  className="mt-1.5 leading-snug"
                  style={{
                    color: slate,
                    fontSize: isPortrait ? 8.5 : 10,
                    maxWidth: '92%',
                  }}
                >
                  {identity.legalName}
                </p>
                <div
                  className="mt-2.5 mb-2.5 flex items-center gap-1.5"
                  style={{ width: isPortrait ? '58%' : '46%' }}
                >
                  <span className="h-px flex-1" style={{ background: gold }} />
                  <span
                    className="h-1.5 w-1.5 shrink-0 rotate-45"
                    style={{ background: gold }}
                  />
                  <span className="h-px flex-1" style={{ background: gold }} />
                </div>
                <p
                  className="leading-snug"
                  style={{
                    color: ink,
                    fontSize: isPortrait ? Math.min(nameSpec.previewPx, 14) : nameSpec.previewPx,
                    fontWeight: format.nameWeight === 'regular' ? 400 : 700,
                    maxWidth: '92%',
                  }}
                >
                  {previewName || '— Designation —'}
                </p>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      <GlassCard className="p-5 sm:p-6">
        <div className="mb-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
            Saved labels
          </h3>
          <p className="mt-1 text-xs text-zinc-500">
            <span className="text-zinc-300">{total}</span> label{total === 1 ? '' : 's'} · cloud Pulse
            ke through devices par · {showingLabel}
          </p>
        </div>

        {total === 0 ? (
          <p className="rounded-xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-zinc-500">
            Abhi koi saved label nahi — designation likh kar Save karein
          </p>
        ) : (
          <>
            <ListPager
              page={page}
              totalPages={totalPages}
              total={total}
              showingLabel={showingLabel}
              onPageChange={setPage}
              className="mb-3"
            />
            <ul className="space-y-3">
              {pageItems.map((entry) => {
                const active = selectedId === entry.id;
                const saved = formatFromEntry(entry);
                return (
                  <li
                    key={entry.id}
                    className={`rounded-xl border p-4 ${
                      active
                        ? 'border-emerald-500/35 bg-emerald-500/10'
                        : 'border-white/10 bg-black/25'
                    }`}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <button
                        type="button"
                        onClick={() => handleSelect(entry)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <p className="text-sm font-semibold text-zinc-100">{entry.name}</p>
                        <p className="mt-1 text-xs text-zinc-500">
                          {formatSavedAt(entry.createdAt)} ·{' '}
                          {FILE_LABEL_NAME_SIZES[saved.nameSize].label} · {saved.nameWeight} ·{' '}
                          {FILE_LABEL_BORDERS[saved.border].label} border ·{' '}
                          {FILE_LABEL_ORIENTATIONS[saved.orientation].label} · {saved.copies}{' '}
                          {saved.copies === 1 ? 'copy' : 'copies'}
                        </p>
                      </button>
                      <div className="flex shrink-0 flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => handleSelect(entry)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-xs text-zinc-200 hover:bg-white/10"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          View
                        </button>
                        <button
                          type="button"
                          disabled={Boolean(busy)}
                          onClick={() => runExport('pdf', { name: entry.name, ...saved })}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 text-xs text-amber-200 hover:bg-amber-500/20 disabled:opacity-50"
                        >
                          PDF
                        </button>
                        <button
                          type="button"
                          disabled={Boolean(busy)}
                          onClick={() => runExport('word', { name: entry.name, ...saved })}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-sky-500/30 bg-sky-500/10 px-2.5 py-1.5 text-xs text-sky-200 hover:bg-sky-500/20 disabled:opacity-50"
                        >
                          Word
                        </button>
                        <button
                          type="button"
                          disabled={Boolean(busy)}
                          onClick={() => runExport('email', { name: entry.name, ...saved })}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1.5 text-xs text-emerald-200 hover:bg-emerald-500/20 disabled:opacity-50"
                        >
                          Email
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(entry)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-2.5 py-1.5 text-xs text-rose-200 hover:bg-rose-500/20"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </GlassCard>
    </div>
  );
}
