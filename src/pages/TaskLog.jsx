import { useMemo, useState } from 'react';
import {
  CheckSquare,
  Plus,
  Pencil,
  XCircle,
  Save,
  FileDown,
  CheckCircle2,
} from 'lucide-react';
import { useTasksExecutive } from '../context/ExecutiveContext';
import GlassCard from '../components/ui/GlassCard';
import FormField, { TextInput } from '../components/ui/FormField';
import { formatDisplayDate, formatDisplayTime, getTodayISO } from '../utils/dates';
import { taskStatusLabel } from '../utils/taskEntries';

const emptyForm = () => ({
  title: '',
  date: getTodayISO(),
  time: '09:00',
});

export default function TaskLog() {
  const { taskEntries, addTaskEntry, updateTaskEntry, completeTaskEntry, cancelTaskEntry } =
    useTasksExecutive();

  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [editingId, setEditingId] = useState('');
  const [pdfBusy, setPdfBusy] = useState(false);
  const [rowPdfId, setRowPdfId] = useState('');

  const listEntries = useMemo(
    () =>
      [...taskEntries]
        .filter((t) => t.status !== 'cancelled')
        .sort((a, b) => {
          const statusOrder = (s) => (s === 'active' ? 0 : 1);
          const byStatus = statusOrder(a.status) - statusOrder(b.status);
          if (byStatus !== 0) return byStatus;
          return `${b.date}T${b.time}`.localeCompare(`${a.date}T${a.time}`);
        }),
    [taskEntries],
  );

  const resetForm = () => {
    setForm(emptyForm());
    setErrors({});
    setEditingId('');
  };

  const startEdit = (entry) => {
    setEditingId(entry.id);
    setForm({
      title: entry.title,
      date: entry.date,
      time: entry.time,
    });
    setErrors({});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const validateForm = () => {
    const next = {};
    if (!form.title.trim()) next.title = 'Task likhein';
    if (!form.date) next.date = 'Date select karein';
    if (!form.time) next.time = 'Time select karein';
    if (Object.keys(next).length) {
      setErrors(next);
      return null;
    }
    setErrors({});
    return {
      title: form.title.trim(),
      date: form.date,
      time: form.time,
    };
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = validateForm();
    if (!payload) return;

    if (editingId) {
      updateTaskEntry(editingId, payload);
    } else {
      addTaskEntry(payload);
    }
    resetForm();
  };

  const handleDownloadAllPdf = async () => {
    if (!listEntries.length) return;
    setPdfBusy(true);
    try {
      const { downloadTaskLogPdf } = await import('../utils/taskLogPdf');
      downloadTaskLogPdf(listEntries);
    } finally {
      setPdfBusy(false);
    }
  };

  const handleDownloadRowPdf = async (entry) => {
    setRowPdfId(entry.id);
    try {
      const { downloadSingleTaskPdf } = await import('../utils/taskLogPdf');
      downloadSingleTaskPdf(entry);
    } finally {
      setRowPdfId('');
    }
  };

  const handleMarkDone = (entry) => {
    if (
      !window.confirm(
        `"${entry.title}" complete ho gaya?\n\nOK karein to status Done mark ho jayega.`,
      )
    ) {
      return;
    }
    completeTaskEntry(entry.id);
    if (editingId === entry.id) resetForm();
  };

  const handleCancelEntry = (entry) => {
    if (
      !window.confirm(`"${entry.title}" cancel karein? Ye task list se hat jayega.`)
    ) {
      return;
    }
    cancelTaskEntry(entry.id);
    if (editingId === entry.id) resetForm();
  };

  return (
    <div className="space-y-6">
      <GlassCard className="border-amber-500/20 bg-amber-500/5 p-5 sm:p-6">
        <div className="mb-4 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/15">
            <CheckSquare className="h-5 w-5 text-amber-300" strokeWidth={1.75} />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-400/90">
              {editingId ? 'Edit Task' : 'New Task'}
            </p>
            <p className="text-sm text-zinc-500">Date aur time ke sath task log karein</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField label="Task *" id="task-title" error={errors.title}>
            <TextInput
              id="task-title"
              value={form.title}
              onChange={(e) => {
                setForm((p) => ({ ...p, title: e.target.value }));
                setErrors((p) => ({ ...p, title: undefined }));
              }}
              placeholder="Kya karna hai — short title"
            />
          </FormField>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Date *" id="task-date" error={errors.date}>
              <TextInput
                id="task-date"
                type="date"
                value={form.date}
                onChange={(e) => {
                  setForm((p) => ({ ...p, date: e.target.value }));
                  setErrors((p) => ({ ...p, date: undefined }));
                }}
              />
            </FormField>
            <FormField label="Time *" id="task-time" error={errors.time}>
              <TextInput
                id="task-time"
                type="time"
                value={form.time}
                onChange={(e) => {
                  setForm((p) => ({ ...p, time: e.target.value }));
                  setErrors((p) => ({ ...p, time: undefined }));
                }}
              />
            </FormField>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-amber-500"
            >
              {editingId ? (
                <>
                  <Save className="h-4 w-4" />
                  Save changes
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Add Task
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
              Task Log — All entries
            </h3>
            <p className="mt-1 text-xs text-zinc-500">
              <strong className="text-zinc-300">{listEntries.length}</strong> task
              {listEntries.length === 1 ? '' : 's'} · pending pehle, phir done
            </p>
          </div>
          <button
            type="button"
            disabled={!listEntries.length || pdfBusy}
            onClick={handleDownloadAllPdf}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/15 px-4 py-2.5 text-sm font-medium text-amber-100 hover:bg-amber-500/25 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <FileDown className={`h-4 w-4 ${pdfBusy ? 'animate-pulse' : ''}`} />
            {pdfBusy ? 'PDF…' : 'Download all PDF'}
          </button>
        </div>

        {listEntries.length === 0 ? (
          <p className="rounded-xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-zinc-500">
            Abhi koi task nahi — upar se add karein
          </p>
        ) : (
          <ul className="space-y-3">
            {listEntries.map((entry) => {
              const isDone = entry.status === 'done';
              return (
                <li
                  key={entry.id}
                  className={`rounded-xl border p-4 ${
                    isDone
                      ? 'border-emerald-500/25 bg-emerald-500/5'
                      : 'border-white/10 bg-black/25'
                  }`}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p
                          className={`text-sm font-semibold ${
                            isDone ? 'text-emerald-200 line-through decoration-emerald-500/50' : 'text-zinc-100'
                          }`}
                        >
                          {entry.title}
                        </p>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                            isDone
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-amber-500/20 text-amber-300'
                          }`}
                        >
                          {taskStatusLabel(entry.status)}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-zinc-500">
                        {formatDisplayDate(entry.date)} · {formatDisplayTime(entry.time)}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      {!isDone && (
                        <button
                          type="button"
                          onClick={() => handleMarkDone(entry)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-500"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          OK
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={rowPdfId === entry.id}
                        onClick={() => handleDownloadRowPdf(entry)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-xs text-amber-100 hover:bg-amber-500/20 disabled:opacity-50"
                      >
                        <FileDown className="h-3.5 w-3.5" />
                        PDF
                      </button>
                      <button
                        type="button"
                        onClick={() => startEdit(entry)}
                        disabled={isDone}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-2 text-xs text-zinc-200 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
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
              );
            })}
          </ul>
        )}
      </GlassCard>
    </div>
  );
}
