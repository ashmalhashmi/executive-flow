import { useMemo, useState } from 'react';
import { Check, Plus, Target, Trash2 } from 'lucide-react';
import { useTargetsExecutive } from '../context/ExecutiveContext';
import GlassCard from '../components/ui/GlassCard';
import FormField, { TextArea, TextInput } from '../components/ui/FormField';
import { formatDisplayDate, getTodayISO } from '../utils/dates';
import { deadlineLabel, targetDaysLeft } from '../utils/targetEntries';

const EMPTY_FORM = {
  title: '',
  deadline: '',
  identity: '',
  actionDraft: '',
  actions: [],
};

function DeadlineLine({ deadline, status }) {
  if (status === 'achieved') return null;
  const left = targetDaysLeft(deadline);
  const tone = left == null ? 'text-zinc-500' : left < 0 ? 'text-rose-300' : left === 0 ? 'text-amber-200' : 'text-emerald-200';
  return (
    <p className={`text-xs font-medium ${tone}`}>
      {deadline ? formatDisplayDate(deadline) : 'Koi deadline nahi'}
      {' · '}
      {deadlineLabel(deadline)}
    </p>
  );
}

export default function Targets() {
  const {
    targetEntries,
    addTarget,
    updateTarget,
    addTargetAction,
    removeTargetAction,
    voteTargetAction,
    achieveTarget,
    reopenTarget,
    removeTarget,
  } = useTargetsExecutive();
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('active');
  const [editingId, setEditingId] = useState('');
  const [actionDrafts, setActionDrafts] = useState({});

  const visible = useMemo(() => {
    return [...targetEntries]
      .filter((entry) => (filter === 'achieved' ? entry.status === 'achieved' : entry.status !== 'achieved'))
      .sort((a, b) => String(a.deadline || '9999').localeCompare(String(b.deadline || '9999')));
  }, [targetEntries, filter]);

  const addDraftAction = () => {
    const text = form.actionDraft.trim();
    if (!text) return;
    setForm((prev) => ({
      ...prev,
      actionDraft: '',
      actions: [...prev.actions, text],
    }));
  };

  const saveTarget = (event) => {
    event.preventDefault();
    const title = form.title.trim();
    const identity = form.identity.trim();
    const pending = form.actionDraft.trim();
    const actions = [...form.actions, ...(pending ? [pending] : [])];
    if (!title) {
      setError('Target likhein');
      return;
    }
    if (!form.deadline) {
      setError('Deadline specify karein');
      return;
    }
    if (!identity) {
      setError('Identity statement likhein');
      return;
    }
    if (!actions.length) {
      setError('Kam az kam aik favorable action likhein');
      return;
    }
    addTarget({
      title,
      deadline: form.deadline,
      identity,
      actions: actions.map((text) => ({ text })),
    });
    setForm(EMPTY_FORM);
    setError('');
    setFilter('active');
  };

  return (
    <div className="space-y-6">
      <GlassCard className="p-5 sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-indigo-300">Identity · repetition</p>
        <h2 className="mt-1 flex items-center gap-2 text-xl font-semibold text-white">
          <Target className="h-5 w-5 text-indigo-300" />
          Targets
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-400">
          Target woh natija hai jo aap chahte hain, deadline aap khud rakhte hain. Identity statement
          batati hai aap kis shakhs ban rahe hain. Favorable actions chhoti repeats hain: har dafa
          karna us identity ka aik vote hai, aur wahi repeat rasta mazboot karta hai, jab tak target
          achieve na ho jaye.
        </p>
        <form onSubmit={saveTarget} className="mt-5 grid gap-4">
          <FormField label="Target" id="target-title" hint="Outcome, aik jumle mein.">
            <TextInput
              id="target-title"
              value={form.title}
              onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
              placeholder="Maslan: office dak same day clear ho"
            />
          </FormField>
          <FormField label="Deadline" id="target-deadline" hint="Yeh date operator specify karta hai.">
            <TextInput
              id="target-deadline"
              type="date"
              value={form.deadline}
              min={getTodayISO()}
              onChange={(event) => setForm((prev) => ({ ...prev, deadline: event.target.value }))}
            />
          </FormField>
          <FormField
            label="Identity statement"
            id="target-identity"
            hint="Main woh shakhs hoon jo…"
          >
            <TextArea
              id="target-identity"
              rows={2}
              value={form.identity}
              onChange={(event) => setForm((prev) => ({ ...prev, identity: event.target.value }))}
              placeholder="Main woh shakhs hoon jo har file usi din band karta hai"
            />
          </FormField>
          <FormField
            label="Favorable actions"
            id="target-action"
            hint="Chhoti, dohrane layak actions. Inhein target achieve hone tak karte rahen."
          >
            <div className="flex gap-2">
              <TextInput
                id="target-action"
                value={form.actionDraft}
                onChange={(event) => setForm((prev) => ({ ...prev, actionDraft: event.target.value }))}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    addDraftAction();
                  }
                }}
                placeholder="Maslan: shaam ko pending dak ki list dekhun"
              />
              <button
                type="button"
                onClick={addDraftAction}
                className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-white/15 px-3 text-sm text-zinc-100 hover:bg-white/5"
              >
                <Plus className="h-4 w-4" />
                Add
              </button>
            </div>
            {form.actions.length ? (
              <ul className="mt-2 space-y-1">
                {form.actions.map((action, index) => (
                  <li key={`${action}-${index}`} className="flex items-center justify-between gap-2 text-sm text-zinc-200">
                    <span>{action}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          actions: prev.actions.filter((_, item) => item !== index),
                        }))
                      }
                      className="text-xs text-zinc-500 hover:text-rose-300"
                    >
                      Hataein
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </FormField>
          {error ? <p className="text-sm text-rose-300">{error}</p> : null}
          <div>
            <button
              type="submit"
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-400"
            >
              Save target
            </button>
          </div>
        </form>
      </GlassCard>

      <div className="flex gap-2">
        {['active', 'achieved'].map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium ${
              filter === key ? 'bg-white text-zinc-950' : 'border border-white/10 text-zinc-300 hover:bg-white/5'
            }`}
          >
            {key === 'active' ? 'Active' : 'Achieved'}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <GlassCard className="p-5">
          <p className="text-sm text-zinc-500">
            {filter === 'achieved' ? 'Abhi koi achieved target nahi.' : 'Abhi koi active target nahi.'}
          </p>
        </GlassCard>
      ) : (
        visible.map((entry) => {
          const editing = editingId === entry.id;
          return (
            <GlassCard key={entry.id} className="p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-lg font-semibold text-white">{entry.title || 'Target'}</h3>
                  <DeadlineLine deadline={entry.deadline} status={entry.status} />
                </div>
                <div className="flex flex-wrap gap-2">
                  {entry.status === 'achieved' ? (
                    <button
                      type="button"
                      onClick={() => reopenTarget(entry.id)}
                      className="rounded-lg border border-white/15 px-2.5 py-1 text-xs text-zinc-200 hover:bg-white/5"
                    >
                      Reopen
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => achieveTarget(entry.id)}
                      className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/30 px-2.5 py-1 text-xs text-emerald-200 hover:bg-emerald-500/10"
                    >
                      <Check className="h-3.5 w-3.5" />
                      Achieved
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setEditingId(editing ? '' : entry.id)}
                    className="rounded-lg border border-white/15 px-2.5 py-1 text-xs text-zinc-200 hover:bg-white/5"
                  >
                    {editing ? 'Close' : 'Edit'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!window.confirm('Yeh target delete karein?')) return;
                      removeTarget(entry.id);
                    }}
                    className="inline-flex items-center gap-1 rounded-lg border border-red-500/30 px-2.5 py-1 text-xs text-red-300 hover:bg-red-500/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </button>
                </div>
              </div>

              {editing ? (
                <div className="mt-4 grid gap-3">
                  <FormField label="Target" id={`edit-title-${entry.id}`}>
                    <TextInput
                      id={`edit-title-${entry.id}`}
                      defaultValue={entry.title}
                      onBlur={(event) => updateTarget(entry.id, { title: event.target.value })}
                    />
                  </FormField>
                  <FormField label="Deadline" id={`edit-deadline-${entry.id}`}>
                    <TextInput
                      id={`edit-deadline-${entry.id}`}
                      type="date"
                      defaultValue={entry.deadline}
                      onBlur={(event) => updateTarget(entry.id, { deadline: event.target.value })}
                    />
                  </FormField>
                  <FormField label="Identity statement" id={`edit-identity-${entry.id}`}>
                    <TextArea
                      id={`edit-identity-${entry.id}`}
                      rows={2}
                      defaultValue={entry.identity}
                      onBlur={(event) => updateTarget(entry.id, { identity: event.target.value })}
                    />
                  </FormField>
                </div>
              ) : (
                <p className="mt-3 text-sm text-indigo-100">“{entry.identity || 'Identity abhi likhi nahi.'}”</p>
              )}

              <ul className="mt-4 space-y-2">
                {entry.actions.map((action) => (
                  <li
                    key={action.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="text-sm text-zinc-100">{action.text}</p>
                      <p className="text-xs text-zinc-500">
                        {action.repetitions} {action.repetitions === 1 ? 'repeat' : 'repeats'}
                        {action.lastDoneOn ? ` · last ${formatDisplayDate(action.lastDoneOn)}` : ''}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {entry.status !== 'achieved' ? (
                        <button
                          type="button"
                          onClick={() => voteTargetAction(entry.id, action.id)}
                          className="rounded-lg bg-indigo-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-400"
                        >
                          Kiya
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => removeTargetAction(entry.id, action.id)}
                        className="text-xs text-zinc-500 hover:text-rose-300"
                      >
                        Hataein
                      </button>
                    </div>
                  </li>
                ))}
              </ul>

              {entry.status !== 'achieved' ? (
                <div className="mt-3 flex gap-2">
                  <TextInput
                    value={actionDrafts[entry.id] || ''}
                    onChange={(event) =>
                      setActionDrafts((prev) => ({ ...prev, [entry.id]: event.target.value }))
                    }
                    onKeyDown={(event) => {
                      if (event.key !== 'Enter') return;
                      event.preventDefault();
                      const text = String(actionDrafts[entry.id] || '').trim();
                      if (!text) return;
                      addTargetAction(entry.id, text);
                      setActionDrafts((prev) => ({ ...prev, [entry.id]: '' }));
                    }}
                    placeholder="Aur aik favorable action"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const text = String(actionDrafts[entry.id] || '').trim();
                      if (!text) return;
                      addTargetAction(entry.id, text);
                      setActionDrafts((prev) => ({ ...prev, [entry.id]: '' }));
                    }}
                    className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-white/15 px-3 text-sm text-zinc-100 hover:bg-white/5"
                  >
                    <Plus className="h-4 w-4" />
                    Add
                  </button>
                </div>
              ) : null}
            </GlassCard>
          );
        })
      )}
    </div>
  );
}
