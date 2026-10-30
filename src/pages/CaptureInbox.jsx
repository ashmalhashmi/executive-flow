import { useMemo, useState } from 'react';
import {
  StickyNote,
  Plus,
  Pencil,
  Trash2,
  Save,
  Search,
  Archive,
} from 'lucide-react';
import { useCaptureExecutive } from '../context/ExecutiveContext';
import GlassCard from '../components/ui/GlassCard';
import FormField, { TextInput, TextArea } from '../components/ui/FormField';
import ListPager from '../components/ui/ListPager';
import { usePagedList } from '../hooks/usePagedList';
import { formatDisplayDate } from '../utils/dates';
import {
  captureDisplayTitle,
  sortCaptureEntries,
} from '../utils/captureEntries';

const emptyForm = () => ({
  title: '',
  text: '',
});

function formatNoteWhen(iso) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return `${formatDisplayDate(d.toISOString().slice(0, 10))} · ${d.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    })}`;
  } catch {
    return '—';
  }
}

export default function CaptureInbox() {
  const {
    captureEntries,
    addCaptureEntry,
    updateCaptureEntry,
    completeCaptureEntry,
    removeCaptureEntry,
  } = useCaptureExecutive();

  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [editingId, setEditingId] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('active'); // active | all | archived

  const sorted = useMemo(() => sortCaptureEntries(captureEntries), [captureEntries]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sorted.filter((entry) => {
      if (filter === 'active' && entry.status !== 'active') return false;
      if (filter === 'archived' && entry.status !== 'done') return false;
      if (!q) return true;
      const hay = `${entry.title || ''} ${entry.text || ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [sorted, query, filter]);

  const {
    page,
    setPage,
    totalPages,
    pageItems,
    total,
    showingLabel,
  } = usePagedList(filtered, { pageSize: 30 });

  const activeCount = useMemo(
    () => captureEntries.filter((e) => e.status === 'active').length,
    [captureEntries],
  );
  const archivedCount = useMemo(
    () => captureEntries.filter((e) => e.status === 'done').length,
    [captureEntries],
  );

  const resetForm = () => {
    setForm(emptyForm());
    setErrors({});
    setEditingId('');
  };

  const startEdit = (entry) => {
    setEditingId(entry.id);
    setForm({
      title: entry.title || '',
      text: entry.text || '',
    });
    setErrors({});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const title = form.title.trim();
    const text = form.text.trim();
    if (!text) {
      setErrors({ text: 'Important note likhna zaroori hai' });
      return;
    }
    setErrors({});

    if (editingId) {
      updateCaptureEntry(editingId, { title, text });
    } else {
      addCaptureEntry({ title, text, bucket: 'captured' });
    }
    resetForm();
  };

  const handleDelete = (entry) => {
    const label = captureDisplayTitle(entry);
    if (!window.confirm(`"${label}" delete karein?\n\nYe record list se hat jayega.`)) {
      return;
    }
    removeCaptureEntry(entry.id);
    if (editingId === entry.id) resetForm();
  };

  const handleArchive = (entry) => {
    if (
      !window.confirm(
        `"${captureDisplayTitle(entry)}" archive karein?\n\nActive list se hat kar Archive mein chala jayega.`,
      )
    ) {
      return;
    }
    completeCaptureEntry(entry.id);
    if (editingId === entry.id) resetForm();
  };

  return (
    <div className="space-y-6">
      <GlassCard className="border-violet-500/20 bg-violet-500/5 p-5 sm:p-6">
        <div className="mb-4 flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-violet-500/30 bg-violet-500/15">
            <StickyNote className="h-5 w-5 text-violet-300" strokeWidth={1.75} />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-white">
              {editingId ? 'Edit Important Note' : 'Important Notes'}
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-zinc-500">
              Zaroori information yahan save karein — baad mein edit / delete / archive asani se.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <FormField
            label="Title (optional)"
            id="note-title"
            hint="Short label — list mein pehle dikhega"
          >
            <TextInput
              id="note-title"
              value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              placeholder="e.g. Wi‑Fi password · DG meeting points"
            />
          </FormField>

          <FormField label="Note *" id="note-text" error={errors.text}>
            <TextArea
              id="note-text"
              rows={4}
              value={form.text}
              onChange={(e) => {
                setForm((p) => ({ ...p, text: e.target.value }));
                setErrors((p) => ({ ...p, text: undefined }));
              }}
              placeholder="Apni zaroori baat yahan likhein…"
            />
          </FormField>

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
                  Save note
                </>
              )}
            </button>
            {editingId ? (
              <button
                type="button"
                onClick={resetForm}
                className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-4 py-2.5 text-sm text-zinc-300 hover:bg-white/5"
              >
                Cancel edit
              </button>
            ) : null}
          </div>
        </form>
      </GlassCard>

      <GlassCard className="p-5 sm:p-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
              Saved records
            </h3>
            <p className="mt-1 text-xs text-zinc-500">
              <strong className="text-zinc-300">{activeCount}</strong> active
              {archivedCount ? (
                <>
                  {' '}
                  · <strong className="text-zinc-300">{archivedCount}</strong> archived
                </>
              ) : null}{' '}
              · {showingLabel}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'active', label: `Active (${activeCount})` },
              { id: 'all', label: `All (${captureEntries.length})` },
              { id: 'archived', label: `Archived (${archivedCount})` },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setFilter(tab.id);
                  setPage(1);
                }}
                className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition ${
                  filter === tab.id
                    ? 'border-violet-400/50 bg-violet-500/20 text-violet-100'
                    : 'border-white/10 bg-white/5 text-zinc-400 hover:bg-white/10'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <FormField label="Search" id="note-search" hint="Title ya note text">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <TextInput
              id="note-search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Search notes…"
              className="pl-9"
            />
          </div>
        </FormField>

        {total === 0 ? (
          <div className="mt-6 flex flex-col items-center justify-center px-4 py-12 text-center">
            <StickyNote className="mb-3 h-10 w-10 text-zinc-600" strokeWidth={1.25} />
            <p className="text-sm font-medium text-zinc-400">
              {query.trim() ? 'Koi note match nahi hua' : 'Abhi koi note save nahi'}
            </p>
            <p className="mt-1 max-w-sm text-xs text-zinc-600">
              Upar form se pehli important baat save karein — yahan record list banegi.
            </p>
          </div>
        ) : (
          <>
            <ul className="mt-4 space-y-3">
              {pageItems.map((entry) => {
                const isEditing = editingId === entry.id;
                const isArchived = entry.status === 'done';
                return (
                  <li
                    key={entry.id}
                    className={`rounded-xl border p-4 ${
                      isEditing
                        ? 'border-violet-400/40 bg-violet-500/10'
                        : isArchived
                          ? 'border-white/5 bg-white/[0.02] opacity-80'
                          : 'border-white/10 bg-white/[0.03]'
                    }`}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          {entry.title?.trim() ? (
                            <p className="font-medium text-zinc-100">{entry.title.trim()}</p>
                          ) : null}
                          {isArchived ? (
                            <span className="rounded-md border border-zinc-500/30 bg-zinc-500/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-zinc-400">
                              Archived
                            </span>
                          ) : null}
                        </div>
                        <p
                          className={`whitespace-pre-wrap break-safe text-sm leading-relaxed ${
                            entry.title?.trim()
                              ? 'mt-2 text-zinc-300'
                              : 'font-medium text-zinc-100'
                          }`}
                        >
                          {entry.text}
                        </p>
                        <p className="mt-2 text-[11px] text-zinc-500">
                          Updated {formatNoteWhen(entry.updatedAt)}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => startEdit(entry)}
                          className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium ${
                            isEditing
                              ? 'border-violet-400/50 bg-violet-500/20 text-violet-100'
                              : 'border-violet-500/30 bg-violet-500/10 text-violet-300 hover:bg-violet-500/20'
                          }`}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Edit
                        </button>
                        {!isArchived ? (
                          <button
                            type="button"
                            onClick={() => handleArchive(entry)}
                            className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-xs font-medium text-zinc-300 hover:bg-white/10"
                          >
                            <Archive className="h-3.5 w-3.5" />
                            Archive
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => handleDelete(entry)}
                          className="inline-flex items-center gap-1 rounded-lg border border-red-500/30 bg-red-500/10 px-2.5 py-1.5 text-xs font-medium text-red-300 hover:bg-red-500/20"
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
            <ListPager
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
              showingLabel={showingLabel}
              className="mt-4"
            />
          </>
        )}
      </GlassCard>
    </div>
  );
}
