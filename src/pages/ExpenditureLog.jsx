import { useState } from 'react';
import { Wallet, Plus, Trash2, TrendingDown } from 'lucide-react';
import { useExecutive } from '../context/ExecutiveContext';
import GlassCard from '../components/ui/GlassCard';
import FormField, { TextInput } from '../components/ui/FormField';
import { formatPKR, parsePKRInput } from '../utils/currency';
import { getTodayISO } from '../utils/dates';

export default function ExpenditureLog() {
  const {
    expenditureOpeningBalance,
    setExpenditureOpeningBalance,
    expenditures,
    addExpenditure,
    removeExpenditure,
    expenditureSummary,
  } = useExecutive();

  const [openingInput, setOpeningInput] = useState(
    expenditureOpeningBalance > 0 ? String(expenditureOpeningBalance) : '',
  );
  const [openingSaved, setOpeningSaved] = useState(false);
  const [form, setForm] = useState({ description: '', amount: '' });
  const [errors, setErrors] = useState({});

  const handleSaveOpening = () => {
    const amount = parsePKRInput(openingInput);
    if (!Number.isFinite(amount) || amount < 0) {
      setErrors({ opening: 'Valid opening balance likhein (0 ya zyada)' });
      return;
    }
    setErrors({});
    setExpenditureOpeningBalance(amount);
    setOpeningSaved(true);
    setTimeout(() => setOpeningSaved(false), 2500);
  };

  const handleAddExpenditure = (e) => {
    e.preventDefault();
    const next = {};
    if (!form.description.trim()) next.description = 'Description zaroori hai';
    const amount = parsePKRInput(form.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      next.amount = 'Valid amount likhein (PKR)';
    }
    if (Object.keys(next).length) {
      setErrors(next);
      return;
    }
    setErrors({});
    addExpenditure({
      description: form.description.trim(),
      amount,
      date: getTodayISO(),
    });
    setForm({ description: '', amount: '' });
  };

  const { totalSpent, closingBalance } = expenditureSummary;

  return (
    <div className="space-y-6">
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
            <p className="text-sm text-zinc-500">Shuruati balance (PKR) — aap khud likhein</p>
          </div>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <FormField label="Amount (PKR)" id="opening-balance" className="flex-1" error={errors.opening}>
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
          </p>
        )}
      </GlassCard>

      {/* Add expenditure */}
      <GlassCard className="p-5 sm:p-6">
        <div className="mb-4 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-rose-500/30 bg-rose-500/15">
            <TrendingDown className="h-5 w-5 text-rose-300" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-rose-400/90">
              New Expenditure
            </p>
            <p className="text-sm text-zinc-500">Kharcha aur amount PKR mein</p>
          </div>
        </div>
        <form onSubmit={handleAddExpenditure} className="space-y-4">
          <FormField label="Expenditure / Description" id="exp-desc" error={errors.description}>
            <TextInput
              id="exp-desc"
              placeholder="e.g. Office supplies, Travel, Lunch"
              value={form.description}
              onChange={(e) => {
                setForm((p) => ({ ...p, description: e.target.value }));
                setErrors((p) => ({ ...p, description: undefined }));
              }}
            />
          </FormField>
          <FormField label="Amount (PKR)" id="exp-amount" error={errors.amount}>
            <TextInput
              id="exp-amount"
              type="text"
              inputMode="decimal"
              placeholder="e.g. 2500"
              value={form.amount}
              onChange={(e) => {
                setForm((p) => ({ ...p, amount: e.target.value }));
                setErrors((p) => ({ ...p, amount: undefined }));
              }}
            />
          </FormField>
          <button
            type="submit"
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-500 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-indigo-500/20 hover:bg-indigo-400 sm:w-auto"
          >
            <Plus className="h-4 w-4" />
            Add Expenditure
          </button>
        </form>
      </GlassCard>

      {/* Expenditure list */}
      <GlassCard className="p-5 sm:p-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-400">
          Expenditure Log
        </h3>
        {expenditures.length === 0 ? (
          <p className="py-8 text-center text-sm text-zinc-500">
            Abhi koi expenditure record nahi
          </p>
        ) : (
          <ul className="custom-scrollbar max-h-[360px] space-y-2 overflow-y-auto">
            {expenditures.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-zinc-100">{item.description}</p>
                  <p className="mt-0.5 text-xs text-zinc-500">{item.date}</p>
                </div>
                <p className="shrink-0 text-sm font-semibold text-rose-300">
                  − {formatPKR(item.amount)}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(`"${item.description}" delete karein?`)) {
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
          </div>
          <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-3">
            <p className="text-xs uppercase tracking-wider text-zinc-500">Total Expenditure</p>
            <p className="mt-1 text-lg font-semibold text-rose-300">
              − {formatPKR(totalSpent)}
            </p>
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
          Closing = Opening − Total Expenditure (PKR)
        </p>
      </GlassCard>
    </div>
  );
}
