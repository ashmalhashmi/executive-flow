import { useEffect, useMemo, useState } from 'react';
import {
  Bell,
  CheckCircle2,
  CheckSquare,
  FileDown,
  Pencil,
  Plus,
  RotateCcw,
  Save,
  Search,
  Trash2,
} from 'lucide-react';
import { useTasksExecutive } from '../context/ExecutiveContext';
import { useCloudSyncContext } from '../context/CloudSyncContext';
import GlassCard from '../components/ui/GlassCard';
import FormField, { TextInput } from '../components/ui/FormField';
import ListPager from '../components/ui/ListPager';
import { usePagedList } from '../hooks/usePagedList';
import { formatDisplayDate, formatDisplayTime, getTodayISO } from '../utils/dates';
import {
  isTaskOverdue,
  isTaskToday,
  sortTaskEntries,
  taskDisplayStatus,
  taskMatchesQuery,
  taskStatus,
} from '../utils/taskEntries';

const emptyForm = () => ({
  title: '',
  date: getTodayISO(),
  time: '09:00',
  remind: false,
});

function formatCompleted(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const actionClass =
  'inline-flex min-h-9 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium';

export default function TaskLog() {
  const {
    taskEntries,
    addTaskEntry,
    updateTaskEntry,
    completeTaskEntry,
    reopenTaskEntry,
    trashTaskEntry,
    restoreTaskEntry,
    removeTaskEntry,
  } = useTasksExecutive();
  const cloud = useCloudSyncContext();

  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [editingId, setEditingId] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [pdfBusy, setPdfBusy] = useState(false);
  const [rowPdfId, setRowPdfId] = useState('');
  const [now, setNow] = useState(() => new Date());
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  const todayISO = getTodayISO();

  const counts = useMemo(() => {
    let today = 0;
    let pending = 0;
    let overdue = 0;
    let done = 0;
    let trash = 0;
    for (const entry of taskEntries) {
      const status = taskStatus(entry.status);
      if (status === 'trash') {
        trash += 1;
        continue;
      }
      if (isTaskToday(entry, todayISO)) today += 1;
      if (status === 'done') done += 1;
      else {
        pending += 1;
        if (isTaskOverdue(entry, now)) overdue += 1;
      }
    }
    return { today, pending, overdue, done, trash, all: taskEntries.length - trash };
  }, [taskEntries, todayISO, now]);

  const visible = useMemo(() => {
    return sortTaskEntries(taskEntries, now).filter((entry) => {
      const status = taskStatus(entry.status);
      if (filter === 'trash') return status === 'trash';
      if (status === 'trash') return false;
      if (filter === 'pending' && status !== 'active') return false;
      if (filter === 'done' && status !== 'done') return false;
      return taskMatchesQuery(entry, query);
    });
  }, [taskEntries, now, filter, query]);

  const {
    page,
    setPage,
    totalPages,
    pageItems,
    total,
    showingLabel,
  } = usePagedList(visible, { pageSize: 30 });

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
      remind: Boolean(entry.remind),
    });
    setErrors({});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const title = form.title.trim();
    const next = {};
    if (!title) next.title = 'Task likhein';
    if (!form.date) next.date = 'Date select karein';
    if (!form.time) next.time = 'Time select karein';
    if (Object.keys(next).length) {
      setErrors(next);
      return;
    }
    const payload = { title, date: form.date, time: form.time, remind: form.remind };
    if (editingId) updateTaskEntry(editingId, payload);
    else addTaskEntry(payload);
    resetForm();
    setFilter(filter === 'trash' ? 'pending' : filter);
    setPage(1);
  };

  const handleDelete = (entry) => {
    if (
      !window.confirm(
        `"${entry.title}" trash mein move karein?\n\nList se hat jayega. Trash se restore kar sakte hain.`,
      )
    ) {
      return;
    }
    trashTaskEntry(entry.id);
    if (editingId === entry.id) resetForm();
  };

  const handlePurge = (entry) => {
    if (!window.confirm(`"${entry.title}" hamesha delete karein?\n\nYe wapas nahi aayega.`)) return;
    removeTaskEntry(entry.id);
    if (editingId === entry.id) resetForm();
  };

  const handleDownloadAllPdf = async () => {
    const rows = sortTaskEntries(taskEntries, now).filter((entry) => taskStatus(entry.status) !== 'trash');
    if (!rows.length) return;
    setPdfBusy(true);
    try {
      const { downloadTaskLogPdf } = await import('../utils/taskLogPdf');
      downloadTaskLogPdf(rows);
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

  const syncLine = !online
    ? 'Offline. Tasks is device par save hain aur connection aate hi account ke sath sync ho jayengi.'
    : cloud?.user
      ? 'Is device par save, aur aap ke account ke sath sync hoti hain.'
      : 'Is device par save. Laptop aur mobile par sync ke liye Sync & Backup se sign in karein.';

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {[
          { label: "Today's Tasks", value: counts.today, tone: 'text-zinc-100' },
          { label: 'Pending', value: counts.pending, tone: 'text-amber-200' },
          { label: 'Overdue', value: counts.overdue, tone: counts.overdue ? 'text-red-300' : 'text-zinc-100' },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3 sm:px-4"
          >
            <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">{item.label}</p>
            <p className={`mt-1 text-2xl font-semibold ${item.tone}`}>{item.value}</p>
          </div>
        ))}
      </div>

      <GlassCard className="border-amber-500/20 bg-amber-500/5 p-5 sm:p-6">
        <div className="mb-4 flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/15">
            <CheckSquare className="h-5 w-5 text-amber-300" strokeWidth={1.75} />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-white">{editingId ? 'Edit Task' : 'New Task'}</h2>
            <p className="mt-1 text-xs leading-relaxed text-zinc-500">
              Date aur time ke sath kaam likhein. My Notes se alag — yahan sirf woh kaam jo karna hai.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <FormField label="Task Title *" id="task-title" error={errors.title}>
            <TextInput
              id="task-title"
              value={form.title}
              onChange={(e) => {
                setForm((prev) => ({ ...prev, title: e.target.value }));
                setErrors((prev) => ({ ...prev, title: undefined }));
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
                onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))}
              />
            </FormField>
            <FormField label="Time *" id="task-time" error={errors.time}>
              <TextInput
                id="task-time"
                type="time"
                value={form.time}
                onChange={(e) => setForm((prev) => ({ ...prev, time: e.target.value }))}
              />
            </FormField>
          </div>
          <label className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3 text-sm text-zinc-300">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 accent-amber-500"
              checked={form.remind}
              onChange={(e) => setForm((prev) => ({ ...prev, remind: e.target.checked }))}
            />
            <span>
              <span className="font-medium text-zinc-100">Remind me</span>
              <span className="mt-0.5 block text-xs leading-relaxed text-zinc-500">
                Scheduled time se 15 minutes pehle notification. Optional.
              </span>
            </span>
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-amber-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-amber-500"
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
            {editingId ? (
              <button
                type="button"
                onClick={resetForm}
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/15 px-4 py-2.5 text-sm text-zinc-300 hover:bg-white/5"
              >
                Cancel edit
              </button>
            ) : null}
          </div>
        </form>
        <p className="mt-3 text-[11px] leading-relaxed text-zinc-500">{syncLine}</p>
      </GlassCard>

      <GlassCard className="p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'all', label: `All Tasks (${counts.all})` },
              { id: 'pending', label: `Pending (${counts.pending})` },
              { id: 'done', label: `Done (${counts.done})` },
              { id: 'trash', label: `Trash (${counts.trash})` },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setFilter(tab.id);
                  setPage(1);
                }}
                className={`rounded-lg border px-3 py-2 text-xs font-medium transition ${
                  filter === tab.id
                    ? 'border-amber-400/50 bg-amber-500/20 text-amber-100'
                    : 'border-white/10 bg-white/5 text-zinc-400 hover:bg-white/10'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            disabled={!counts.all || pdfBusy}
            onClick={handleDownloadAllPdf}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/15 px-4 py-2 text-sm font-medium text-amber-100 hover:bg-amber-500/25 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <FileDown className={`h-4 w-4 ${pdfBusy ? 'animate-pulse' : ''}`} />
            {pdfBusy ? 'PDF…' : 'Download All PDF'}
          </button>
        </div>

        <div className="relative mt-4">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <TextInput
            id="task-search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search tasks…"
            aria-label="Search tasks"
            className="pl-9"
          />
        </div>
        <p className="mt-3 text-xs text-zinc-500">{showingLabel}</p>

        {total === 0 ? (
          <p className="mt-6 rounded-xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-zinc-500">
            {query.trim()
              ? 'Koi task match nahi hua'
              : filter === 'done'
                ? 'Abhi koi done task nahi'
                : filter === 'trash'
                  ? 'Trash khali hai'
                  : 'Abhi koi task nahi — upar se add karein'}
          </p>
        ) : (
          <>
            <ul className="mt-4 space-y-3">
              {pageItems.map((entry) => {
                const status = taskStatus(entry.status);
                const overdue = isTaskOverdue(entry, now);
                const label = taskDisplayStatus(entry, now);
                const done = status === 'done';
                return (
                  <li
                    key={entry.id}
                    className={`rounded-xl border p-4 ${
                      overdue
                        ? 'border-red-500/30 bg-red-500/[0.06]'
                        : done
                          ? 'border-emerald-500/25 bg-emerald-500/5'
                          : 'border-white/10 bg-black/25'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p
                          className={`text-sm font-semibold ${
                            done ? 'text-emerald-200 line-through decoration-emerald-500/50' : 'text-zinc-100'
                          }`}
                        >
                          {entry.title}
                        </p>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                            overdue
                              ? 'bg-red-500/20 text-red-300'
                              : done
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : 'bg-amber-500/20 text-amber-300'
                          }`}
                        >
                          {label}
                        </span>
                        {entry.remind && status === 'active' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-zinc-400">
                            <Bell className="h-3 w-3" />
                            Reminder
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-xs text-zinc-500">
                        {formatDisplayDate(entry.date)} · {formatDisplayTime(entry.time)}
                        {done && entry.completedAt ? ` · Done ${formatCompleted(entry.completedAt)}` : ''}
                      </p>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {status === 'active' ? (
                        <button
                          type="button"
                          onClick={() => completeTaskEntry(entry.id)}
                          className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-500"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Mark Done
                        </button>
                      ) : null}
                      {status === 'done' ? (
                        <button
                          type="button"
                          onClick={() => reopenTaskEntry(entry.id)}
                          className={`${actionClass} border-emerald-500/30 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20`}
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          Reopen
                        </button>
                      ) : null}
                      {status === 'trash' ? (
                        <button
                          type="button"
                          onClick={() => restoreTaskEntry(entry.id)}
                          className={`${actionClass} border-emerald-500/30 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20`}
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          Restore
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => startEdit(entry)}
                          className={`${actionClass} border-white/15 bg-white/5 text-zinc-200 hover:bg-white/10`}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Edit
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={rowPdfId === entry.id || status === 'trash'}
                        onClick={() => handleDownloadRowPdf(entry)}
                        className={`${actionClass} border-amber-500/35 bg-amber-500/10 text-amber-100 hover:bg-amber-500/20 disabled:opacity-40`}
                      >
                        <FileDown className="h-3.5 w-3.5" />
                        PDF
                      </button>
                      {status === 'trash' ? (
                        <button
                          type="button"
                          onClick={() => handlePurge(entry)}
                          className={`${actionClass} border-red-500/30 text-red-300 hover:bg-red-500/10`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete forever
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleDelete(entry)}
                          className={`${actionClass} border-red-500/30 text-red-300 hover:bg-red-500/10`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </button>
                      )}
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
