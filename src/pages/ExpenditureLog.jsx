import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Wallet,
  Plus,
  Trash2,
  TrendingDown,
  FileDown,
  PieChart,
  CalendarDays,
  Pencil,
  Save,
  Eraser,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { useExpenditureExecutive } from '../context/ExecutiveContext';
import GlassCard from '../components/ui/GlassCard';
import FormField, { TextInput } from '../components/ui/FormField';
import { formatPKR, parsePKRInput } from '../utils/currency';
import {
  formatDisplayDate,
  getTodayISO,
  getYearMonth,
  getCurrentWeekRangeISO,
} from '../utils/dates';
import {
  DEFAULT_EXPENDITURE_CATEGORY,
  EXPENDITURE_CATEGORIES,
  normalizeExpenditureCategory,
  resolveExpenditureCategory,
  categorySelectFromStored,
} from '../constants/expenditureCategories';
import {
  buildCategoryBreakdown,
  countExpendituresBeforeDate,
  filterExpendituresByRange,
} from '../utils/expenditureAnalytics';
import { categorizeExpenditureWithAi } from '../utils/expenditureAiCategorize';

const CATEGORY_COLORS = {
  Food: 'bg-amber-500/20 text-amber-200 border-amber-500/30',
  Rent: 'bg-violet-500/20 text-violet-200 border-violet-500/30',
  Entertainment: 'bg-pink-500/20 text-pink-200 border-pink-500/30',
  Transport: 'bg-sky-500/20 text-sky-200 border-sky-500/30',
  Utilities: 'bg-yellow-500/20 text-yellow-200 border-yellow-500/30',
  Healthcare: 'bg-emerald-500/20 text-emerald-200 border-emerald-500/30',
  Shopping: 'bg-orange-500/20 text-orange-200 border-orange-500/30',
  Other: 'bg-zinc-500/20 text-zinc-300 border-zinc-500/30',
};

const emptyForm = () => ({
  description: '',
  amount: '',
  date: getTodayISO(),
  category: DEFAULT_EXPENDITURE_CATEGORY,
});

function CategoryBadge({ category }) {
  const cat = normalizeExpenditureCategory(category);
  const color =
    CATEGORY_COLORS[cat] ||
    'bg-indigo-500/20 text-indigo-200 border-indigo-500/30';
  return (
    <span
      className={`inline-flex rounded-lg border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${color}`}
    >
      {cat}
    </span>
  );
}

function CategoryBreakdown({ title, subtitle, breakdown, emptyMessage }) {
  if (!breakdown.rows.length) {
    return (
      <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-6 text-center text-sm text-zinc-500">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-medium text-zinc-200">{title}</p>
        {subtitle && <p className="mt-0.5 text-xs text-zinc-500">{subtitle}</p>}
      </div>
      {breakdown.topShareCategories.length > 0 && (
        <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-300/90">
            80/20 insight
          </p>
          <p className="mt-1 text-sm text-zinc-200">
            <span className="font-semibold text-amber-200">
              ~{breakdown.topSharePercent}%
            </span>{' '}
            kharcha in categories par:{' '}
            <span className="text-amber-100">
              {breakdown.topShareCategories.join(', ')}
            </span>
          </p>
        </div>
      )}
      <ul className="space-y-2">
        {breakdown.rows.map((row) => (
          <li key={row.category} className="rounded-xl border border-white/10 bg-black/20 px-3 py-2.5">
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <CategoryBadge category={row.category} />
              <span className="text-sm font-semibold text-rose-200">
                {formatPKR(row.amount)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-rose-500 to-amber-400"
                  style={{ width: `${Math.max(row.percent, 2)}%` }}
                />
              </div>
              <span className="w-10 shrink-0 text-right text-xs text-zinc-400">
                {row.percent.toFixed(0)}%
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function ExpenditureLog() {
  const {
    expenditureOpeningBalance,
    expenditureOpeningBalanceDate,
    setExpenditureOpeningBalance,
    expenditures,
    addExpenditure,
    updateExpenditure,
    removeExpenditure,
    removeExpendituresBeforeDate,
    clearExpenditureRecords,
    expenditureSummary,
  } = useExpenditureExecutive();

  const [openingInput, setOpeningInput] = useState(
    expenditureOpeningBalance > 0 ? String(expenditureOpeningBalance) : '',
  );
  const [openingDateInput, setOpeningDateInput] = useState(
    expenditureOpeningBalanceDate || getTodayISO(),
  );
  const [openingSaved, setOpeningSaved] = useState(false);
  const [eraseMessage, setEraseMessage] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [editingId, setEditingId] = useState('');
  const todayParts = getYearMonth(getTodayISO());
  const [logYear, setLogYear] = useState(todayParts.year);
  const [logMonth, setLogMonth] = useState(todayParts.month - 1);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [categoryBusy, setCategoryBusy] = useState(false);
  const [categoryHint, setCategoryHint] = useState('');
  const categoryUserPickedRef = useRef(false);
  const editDescriptionRef = useRef('');

  const weekRange = useMemo(() => getCurrentWeekRangeISO(), []);

  const weekExpenditures = useMemo(
    () => filterExpendituresByRange(expenditures, weekRange.weekStart, weekRange.weekEnd),
    [expenditures, weekRange.weekEnd, weekRange.weekStart],
  );

  const weekBreakdown = useMemo(
    () => buildCategoryBreakdown(weekExpenditures),
    [weekExpenditures],
  );

  const allTimeBreakdown = useMemo(
    () => buildCategoryBreakdown(expenditures),
    [expenditures],
  );

  const weekTotal = weekBreakdown.total;

  const logYears = useMemo(() => {
    const years = Array.from(
      new Set(
        expenditures
          .map((e) => getYearMonth(e.date || '').year)
          .filter((y) => Number.isFinite(y) && y > 0),
      ),
    ).sort((a, b) => b - a);
    return years.length ? years : [todayParts.year];
  }, [expenditures, todayParts.year]);

  const monthOptions = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => ({
        value: i,
        label: new Date(2000, i, 1).toLocaleDateString('en-US', { month: 'long' }),
      })),
    [],
  );

  const monthExpenditures = useMemo(
    () =>
      expenditures.filter((e) => {
        const { year, month } = getYearMonth(e.date || '');
        return year === logYear && month === logMonth + 1;
      }),
    [expenditures, logMonth, logYear],
  );

  const resetForm = () => {
    setForm(emptyForm());
    setErrors({});
    setEditingId('');
    setCategoryHint('');
    categoryUserPickedRef.current = false;
    editDescriptionRef.current = '';
  };

  const startEdit = (entry) => {
    const { select } = categorySelectFromStored(entry.category);
    setEditingId(entry.id);
    editDescriptionRef.current = entry.description || '';
    categoryUserPickedRef.current = true;
    setCategoryHint('');
    setForm({
      description: entry.description || '',
      amount: String(entry.amount ?? ''),
      date: entry.date || getTodayISO(),
      category: select,
    });
    setErrors({});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    const description = form.description.trim();
    if (description.length < 3) {
      setCategoryHint('');
      return undefined;
    }
    if (categoryUserPickedRef.current) return undefined;
    if (editingId && description === editDescriptionRef.current) return undefined;

    const timer = setTimeout(async () => {
      setCategoryBusy(true);
      try {
        const result = await categorizeExpenditureWithAi(description);
        if (categoryUserPickedRef.current) return;
        setForm((prev) => ({ ...prev, category: result.category }));
        setCategoryHint(
          result.warning
            ? result.warning
            : result.via === 'ai'
              ? `AI category: ${result.category}`
              : `Suggested: ${result.category}`,
        );
      } finally {
        setCategoryBusy(false);
      }
    }, 650);

    return () => clearTimeout(timer);
  }, [form.description, editingId]);

  const eraseCutoffDate = expenditureOpeningBalanceDate || openingDateInput;
  const recordsBeforeOpening = useMemo(
    () => countExpendituresBeforeDate(expenditures, eraseCutoffDate),
    [expenditures, eraseCutoffDate],
  );

  const eraseBeforeOpeningDate = (cutoffDate, { skipConfirm = false } = {}) => {
    const cut = String(cutoffDate ?? '').trim();
    if (!cut) {
      setErrors({ openingDate: 'Pehle opening date set karein' });
      return 0;
    }
    const pending = countExpendituresBeforeDate(expenditures, cut);
    if (!pending) return 0;
    if (
      !skipConfirm &&
      !window.confirm(
        `${pending} expenditure(s) before ${formatDisplayDate(cut)} delete karein?\n\nYe records app se hat jayengi (Google Sheet backup mein mojood reh sakti hain).`,
      )
    ) {
      return 0;
    }
    const removed = removeExpendituresBeforeDate(cut);
    const editingTarget = editingId
      ? expenditures.find((e) => e.id === editingId)
      : null;
    if (editingTarget?.date && editingTarget.date < cut) {
      resetForm();
    }
    if (removed > 0) {
      setEraseMessage(`${removed} purani entries erase ho gayin (before ${formatDisplayDate(cut)})`);
      setTimeout(() => setEraseMessage(''), 4000);
    }
    return removed;
  };

  const handleSaveOpening = () => {
    const amount = parsePKRInput(openingInput);
    if (!Number.isFinite(amount) || amount < 0) {
      setErrors({ opening: 'Valid opening balance likhein (0 ya zyada)' });
      return;
    }
    if (!openingDateInput) {
      setErrors({ openingDate: 'Opening balance ki date select karein' });
      return;
    }
    setErrors({});
    const pendingErase = countExpendituresBeforeDate(expenditures, openingDateInput);
    if (
      pendingErase > 0 &&
      !window.confirm(
        `Opening ${formatDisplayDate(openingDateInput)} se save karein?\n\n${pendingErase} purani entry(s) app log se erase ho jayengi (Sheet mein backup ho chuka ho to theek).`,
      )
    ) {
      return;
    }
    setExpenditureOpeningBalance(amount, openingDateInput);
    if (pendingErase > 0) {
      eraseBeforeOpeningDate(openingDateInput, { skipConfirm: true });
    }
    setOpeningSaved(true);
    setTimeout(() => setOpeningSaved(false), 2500);
  };

  const handleEraseBeforeOpening = () => {
    eraseBeforeOpeningDate(eraseCutoffDate);
  };

  const handleRemoveAllRecords = () => {
    const count = expenditures.length;
    const hasOpening = expenditureOpeningBalance > 0 || Boolean(expenditureOpeningBalanceDate);
    if (!count && !hasOpening) {
      setEraseMessage('Remove karne ko koi record nahi');
      setTimeout(() => setEraseMessage(''), 3000);
      return;
    }
    if (
      !window.confirm(
        `App se expenditure records remove karein?\n\n• Opening balance clear\n• ${count} expense entr${count === 1 ? 'y' : 'ies'} delete\n\nGoogle Sheet backup pehle se save ho to theek — yeh sirf app log reset karega taake naya opening balance set kar sako.`,
      )
    ) {
      return;
    }
    clearExpenditureRecords();
    setOpeningInput('');
    setOpeningDateInput(getTodayISO());
    setOpeningSaved(false);
    resetForm();
    setErrors({});
    setEraseMessage(
      count > 0
        ? `Records remove — opening + ${count} entries clear. Ab naya opening balance save karein.`
        : 'Opening balance clear. Ab naya opening balance save karein.',
    );
    setTimeout(() => setEraseMessage(''), 5000);
  };

  const validateForm = () => {
    const next = {};
    if (!form.description.trim()) next.description = 'Description zaroori hai';
    const amount = parsePKRInput(form.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      next.amount = 'Valid amount likhein (PKR)';
    }
    if (!form.date) next.date = 'Date select karein';
    if (Object.keys(next).length) {
      setErrors(next);
      return null;
    }
    setErrors({});
    return {
      description: form.description.trim(),
      amount,
      date: form.date,
      category: resolveExpenditureCategory(form.category),
    };
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = validateForm();
    if (!payload) return;

    if (editingId) {
      updateExpenditure(editingId, payload);
      resetForm();
      return;
    }

    addExpenditure(payload);
    setForm({
      ...emptyForm(),
      category: form.category,
    });
  };

  const handleDownloadPdf = async () => {
    if (!monthExpenditures.length) return;
    setPdfBusy(true);
    try {
      const { downloadExpenditureLogPdf } = await import('../utils/expenditureLogPdf');
      downloadExpenditureLogPdf({
        expenditures,
        openingBalance: expenditureOpeningBalance,
        openingBalanceDate: expenditureOpeningBalanceDate,
        year: logYear,
        monthIndex: logMonth,
      });
    } finally {
      setPdfBusy(false);
    }
  };

  const { totalSpent, closingBalance } = expenditureSummary;

  const weekLabel = `${formatDisplayDate(weekRange.weekStart)} – ${formatDisplayDate(weekRange.weekEnd)}`;

  return (
    <div className="space-y-6">
      {/* Weekly summary — 80/20 review */}
      <GlassCard className="border-amber-500/20 bg-amber-500/5 p-5 sm:p-6">
        <div className="mb-4 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/15">
            <CalendarDays className="h-5 w-5 text-amber-300" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-400/90">
              Is Hafte Ka Review
            </p>
            <p className="text-sm text-zinc-500">{weekLabel} (Mon–Sun)</p>
          </div>
        </div>
        <div className="mb-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-3">
            <p className="text-xs uppercase tracking-wider text-zinc-500">Is hafte total</p>
            <p className="mt-1 text-xl font-bold text-rose-300">{formatPKR(weekTotal)}</p>
            <p className="mt-1 text-xs text-zinc-500">
              {weekExpenditures.length} entries
            </p>
          </div>
          <div className="rounded-xl border border-amber-400/25 bg-amber-500/10 px-4 py-3">
            <p className="text-xs uppercase tracking-wider text-amber-300/80">Tip</p>
            <p className="mt-1 text-sm text-zinc-300">
              Chhoti entries bhi add karein — 5 Rs chai bhi count hoti hai
            </p>
          </div>
        </div>
        <CategoryBreakdown
          title="Category-wise (is hafte)"
          subtitle="Dekhein ke zyada tar paisa kahan ja raha hai"
          breakdown={weekBreakdown}
          emptyMessage="Is hafte abhi koi kharcha nahi — har kharcha turant yahan add karein"
        />
      </GlassCard>

      {/* All-time top categories */}
      {allTimeBreakdown.rows.length > 0 && (
        <GlassCard className="p-5 sm:p-6">
          <div className="mb-4 flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-indigo-500/30 bg-indigo-500/15">
              <PieChart className="h-5 w-5 text-indigo-300" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-indigo-400/90">
                Overall Top Categories
              </p>
              <p className="text-sm text-zinc-500">
                Kul {formatPKR(allTimeBreakdown.total)} — sab entries
              </p>
            </div>
          </div>
          <CategoryBreakdown title="" breakdown={allTimeBreakdown} emptyMessage="" />
        </GlassCard>
      )}

      {/* Opening balance */}
      <GlassCard className="p-5 sm:p-6">
        <div className="mb-4 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/15">
            <Wallet className="h-5 w-5 text-emerald-300" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400/90">
              Opening Balance
            </p>
            <p className="text-sm text-zinc-500">
              Shuruati balance (PKR) + us din ki date — us date se aage ka kharcha subtract hoga
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          <FormField label="Amount (PKR)" id="opening-balance" className="sm:flex-1" error={errors.opening}>
            <TextInput
              id="opening-balance"
              type="text"
              inputMode="decimal"
              placeholder="e.g. 50000"
              value={openingInput}
              onChange={(e) => {
                setOpeningInput(e.target.value);
                setErrors((p) => ({ ...p, opening: undefined }));
              }}
            />
          </FormField>
          <FormField
            label="Effective from date *"
            id="opening-balance-date"
            className="sm:flex-1"
            error={errors.openingDate}
          >
            <TextInput
              id="opening-balance-date"
              type="date"
              value={openingDateInput}
              onChange={(e) => {
                setOpeningDateInput(e.target.value);
                setErrors((p) => ({ ...p, openingDate: undefined }));
              }}
            />
          </FormField>
          <button
            type="button"
            onClick={handleSaveOpening}
            className="shrink-0 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-500"
          >
            {openingSaved ? 'Saved ✓' : 'Save Opening'}
          </button>
        </div>
        {expenditureOpeningBalance > 0 && (
          <p className="mt-3 text-sm text-zinc-400">
            Current opening:{' '}
            <span className="font-semibold text-emerald-300">
              {formatPKR(expenditureOpeningBalance)}
            </span>
            {expenditureOpeningBalanceDate ? (
              <>
                {' '}
                — effective from{' '}
                <span className="text-zinc-300">
                  {formatDisplayDate(expenditureOpeningBalanceDate)}
                </span>
              </>
            ) : null}
          </p>
        )}
        {recordsBeforeOpening > 0 && (
          <div className="mt-4 flex flex-col gap-3 border-t border-white/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-zinc-500">
              <strong className="text-amber-200">{recordsBeforeOpening}</strong> entries opening
              date se pehle ki — app mein ab balance par count nahi hoti (Sheet backup alag)
            </p>
            <button
              type="button"
              onClick={handleEraseBeforeOpening}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-2.5 text-sm font-medium text-amber-100 hover:bg-amber-500/20"
            >
              <Eraser className="h-4 w-4" />
              Erase before {formatDisplayDate(eraseCutoffDate)}
            </button>
          </div>
        )}
        <div className="mt-4 flex flex-col gap-3 border-t border-white/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-zinc-500">
            Naya period / naya opening balance? Purana app log hatao — Sheet pe pehle se backup ho
            to safe.
          </p>
          <button
            type="button"
            onClick={handleRemoveAllRecords}
            disabled={expenditures.length === 0 && expenditureOpeningBalance <= 0 && !expenditureOpeningBalanceDate}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-2.5 text-sm font-medium text-rose-100 hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Trash2 className="h-4 w-4" />
            Remove records
          </button>
        </div>
        {eraseMessage && (
          <p className="mt-3 text-sm text-emerald-300">{eraseMessage}</p>
        )}
      </GlassCard>

      {/* Add / edit expenditure */}
      <GlassCard className="p-5 sm:p-6">
        <div className="mb-4 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-rose-500/30 bg-rose-500/15">
            <TrendingDown className="h-5 w-5 text-rose-300" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-rose-400/90">
              {editingId ? 'Edit Expenditure' : 'New Expenditure'}
            </p>
            <p className="text-sm text-zinc-500">
              {editingId
                ? 'Description, amount ya date update karein — category AI suggest karega'
                : 'Description likhein — AI fixed category suggest karega (chai 5 Rs bhi)'}
            </p>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField label="Expenditure / Description" id="exp-desc" error={errors.description}>
            <TextInput
              id="exp-desc"
              placeholder="e.g. petrol refill 9388, monthly rent, chai"
              value={form.description}
              onChange={(e) => {
                const nextDescription = e.target.value;
                if (!editingId || nextDescription !== editDescriptionRef.current) {
                  categoryUserPickedRef.current = false;
                }
                setForm((p) => ({ ...p, description: nextDescription }));
                setErrors((p) => ({ ...p, description: undefined }));
              }}
            />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Category (fixed list)" id="exp-category">
              <select
                id="exp-category"
                value={form.category}
                onChange={(e) => {
                  categoryUserPickedRef.current = true;
                  setCategoryHint('Manual category selected');
                  setForm((p) => ({ ...p, category: e.target.value }));
                }}
                className="block w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2.5 text-sm text-zinc-100 shadow-sm outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/40"
              >
                {EXPENDITURE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              {(categoryBusy || categoryHint) && (
                <p className="mt-2 flex items-center gap-1.5 text-xs text-indigo-300/90">
                  {categoryBusy ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5" />
                  )}
                  {categoryBusy ? 'AI category suggest ho rahi hai…' : categoryHint}
                </p>
              )}
            </FormField>
            <FormField label="Date" id="exp-date-top" error={errors.date}>
              <TextInput
                id="exp-date-top"
                type="date"
                value={form.date}
                onChange={(e) => {
                  setForm((p) => ({ ...p, date: e.target.value }));
                  setErrors((p) => ({ ...p, date: undefined }));
                }}
              />
            </FormField>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Amount (PKR)" id="exp-amount" error={errors.amount}>
              <TextInput
                id="exp-amount"
                type="text"
                inputMode="decimal"
                placeholder="e.g. 5, 250, 2500"
                value={form.amount}
                onChange={(e) => {
                  setForm((p) => ({ ...p, amount: e.target.value }));
                  setErrors((p) => ({ ...p, amount: undefined }));
                }}
              />
            </FormField>
            <div className="hidden sm:block" aria-hidden />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-500 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-indigo-500/20 hover:bg-indigo-400"
            >
              {editingId ? (
                <>
                  <Save className="h-4 w-4" />
                  Save Changes
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Add Expenditure
                </>
              )}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-xl border border-white/15 px-4 py-2.5 text-sm text-zinc-300 hover:bg-white/5"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </GlassCard>

      {/* Expenditure list + PDF */}
      <GlassCard className="p-5 sm:p-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
              Expenditure Log
            </h3>
            <p className="mt-1 text-xs text-zinc-500">
              Year-Month select karke PDF: Sr#, Description, Category, Date, Amount
            </p>
          </div>
        </div>
        <div className="mb-4 grid gap-3 sm:grid-cols-2">
          <label className="text-xs text-zinc-400">
            Year
            <select
              value={logYear}
              onChange={(e) => setLogYear(Number(e.target.value))}
              className="mt-1 block w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-sm text-zinc-100 shadow-sm outline-none ring-0 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/40"
            >
              {logYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-zinc-400">
            Month
            <select
              value={logMonth}
              onChange={(e) => setLogMonth(Number(e.target.value))}
              className="mt-1 block w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-sm text-zinc-100 shadow-sm outline-none ring-0 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/40"
            >
              {monthOptions.map((month) => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <button
          type="button"
          onClick={handleDownloadPdf}
          disabled={pdfBusy || monthExpenditures.length === 0}
          className="mb-4 inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-sm font-medium text-emerald-200 hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <FileDown className="h-4 w-4" />
          {pdfBusy ? 'PDF ban rahi hai…' : `Download PDF (${monthExpenditures.length})`}
        </button>
        {expenditures.length === 0 ? (
          <p className="py-8 text-center text-sm text-zinc-500">
            Abhi koi expenditure record nahi
          </p>
        ) : (
          <ul className="custom-scrollbar max-h-none space-y-2 sm:max-h-[360px] sm:overflow-y-auto">
            {expenditures.map((item) => (
              <li
                key={item.id}
                className={[
                  'flex items-center justify-between gap-3 rounded-xl border px-4 py-3',
                  editingId === item.id
                    ? 'border-indigo-400/40 bg-indigo-500/10'
                    : 'border-white/10 bg-white/[0.03]',
                ].join(' ')}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-zinc-100">{item.description}</p>
                    <CategoryBadge category={item.category} />
                  </div>
                  <p className="mt-0.5 text-xs text-zinc-500">{formatDisplayDate(item.date)}</p>
                </div>
                <p className="shrink-0 text-sm font-semibold text-rose-300">
                  − {formatPKR(item.amount)}
                </p>
                <button
                  type="button"
                  onClick={() => startEdit(item)}
                  className="shrink-0 rounded-lg p-2 text-zinc-500 hover:bg-indigo-500/10 hover:text-indigo-300"
                  aria-label="Edit expenditure"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(`"${item.description}" delete karein?`)) {
                      if (editingId === item.id) resetForm();
                      removeExpenditure(item.id);
                    }
                  }}
                  className="shrink-0 rounded-lg p-2 text-zinc-500 hover:bg-red-500/10 hover:text-red-300"
                  aria-label="Delete expenditure"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </GlassCard>

      {/* Summary: total spent + closing balance */}
      <GlassCard className="border-indigo-500/20 bg-indigo-500/5 p-5 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-3">
            <p className="text-xs uppercase tracking-wider text-zinc-500">Opening</p>
            <p className="mt-1 text-lg font-semibold text-emerald-300">
              {formatPKR(expenditureOpeningBalance)}
            </p>
            {expenditureOpeningBalanceDate ? (
              <p className="mt-1 text-xs text-zinc-500">
                From {formatDisplayDate(expenditureOpeningBalanceDate)}
              </p>
            ) : null}
          </div>
          <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-3">
            <p className="text-xs uppercase tracking-wider text-zinc-500">Total Expenditure</p>
            <p className="mt-1 text-lg font-semibold text-rose-300">
              − {formatPKR(totalSpent)}
            </p>
            {expenditureOpeningBalanceDate ? (
              <p className="mt-1 text-xs text-zinc-500">
                Sirf {formatDisplayDate(expenditureOpeningBalanceDate)} se aage
              </p>
            ) : null}
          </div>
          <div className="rounded-xl border border-indigo-400/30 bg-indigo-500/10 px-4 py-3">
            <p className="text-xs uppercase tracking-wider text-indigo-300/80">Closing Balance</p>
            <p
              className={[
                'mt-1 text-xl font-bold',
                closingBalance >= 0 ? 'text-white' : 'text-rose-400',
              ].join(' ')}
            >
              {formatPKR(closingBalance)}
            </p>
          </div>
        </div>
        <p className="mt-4 text-center text-xs text-zinc-600">
          Closing = Opening − expenditures on/after opening date (PKR)
        </p>
      </GlassCard>
    </div>
  );
}
