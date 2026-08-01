import { useState } from 'react';
import { Mail, Loader2, Send, Wallet } from 'lucide-react';
import GlassCard from '../ui/GlassCard';
import FormField, { TextInput } from '../ui/FormField';
import { useExpenditureExecutive } from '../../context/ExecutiveContext';
import { getCurrentWeekRangeISO } from '../../utils/dates';
import {
  isValidEmail,
  loadWeeklyExpenditureEmailSettings,
  saveWeeklyExpenditureEmailSettings,
} from '../../utils/weeklyExpenditureEmailSettings';
import { supabase } from '../../lib/supabase';

export default function WeeklyExpenditureEmailCard({ cloudUser, onSettingsSaved }) {
  const { expenditureState } = useExpenditureExecutive();
  const [settings, setSettings] = useState(() => loadWeeklyExpenditureEmailSettings());
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [testBusy, setTestBusy] = useState(false);

  const save = () => {
    if (settings.enabled && !isValidEmail(settings.email)) {
      setMessage('Valid email address likhein');
      return;
    }
    const next = saveWeeklyExpenditureEmailSettings(settings);
    setSettings(next);
    setMessage(
      next.enabled
        ? `Saved — har Sunday 9:00 PM (Pakistan) Mon–Sun expenditure PDF ${next.email} par jayegi. Cloud Save bhi zaroor karein.`
        : 'Disabled — weekly expenditure email band.',
    );
    onSettingsSaved?.(next);
  };

  const sendTestNow = async () => {
    if (!isValidEmail(settings.email)) {
      setMessage('Pehle valid email save karein');
      return;
    }

    const range = getCurrentWeekRangeISO();
    const expenditures = expenditureState?.expenditures || [];

    setTestBusy(true);
    setMessage('');
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (supabase) {
        const { data } = await supabase.auth.getSession();
        if (data.session?.access_token) {
          headers.Authorization = `Bearer ${data.session.access_token}`;
        }
      }

      const res = await fetch('/api/weekly-expenditure-summary', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          email: settings.email.trim(),
          timezone: settings.timezone || 'Asia/Karachi',
          weekStart: range.weekStart,
          weekEnd: range.weekEnd,
          openingBalance: expenditureState?.openingBalance || 0,
          openingBalanceDate: expenditureState?.openingBalanceDate || '',
          expenditures,
          force: true,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || `Send failed (${res.status})`);
      }
      const result = data.results?.[0];
      if (result?.sent) {
        setMessage(
          `Test email bhej di — inbox check karein (${result.count} entries this week).`,
        );
      } else if (result?.error) {
        throw new Error(result.error);
      } else {
        setMessage(data.message || 'Server responded — inbox check karein.');
      }
    } catch (err) {
      setMessage(err.message || 'Test email fail — RESEND_API_KEY check karein.');
    } finally {
      setTestBusy(false);
    }
  };

  return (
    <GlassCard className="p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <Wallet className="h-5 w-5 shrink-0 text-rose-300" />
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
            Weekly Expenditure Email
          </h3>
          <p className="mt-2 text-sm text-zinc-500">
            Har <strong className="text-zinc-300">Sunday 9:00 PM (Pakistan)</strong> — us hafte
            (Mon–Sun) ki expenditure summary <strong className="text-zinc-300">PDF</strong> email.
            Empty week par bhi summary jayegi (0 entries).
          </p>

          <div className="mt-4 space-y-3">
            <label className="flex items-center gap-3 text-sm text-zinc-200">
              <input
                type="checkbox"
                checked={settings.enabled}
                onChange={(e) =>
                  setSettings((p) => ({ ...p, enabled: e.target.checked }))
                }
                className="h-4 w-4 rounded border-white/20 bg-black/40"
              />
              Sunday auto email enable karein
            </label>

            <FormField label="Email address" id="weekly-exp-email">
              <TextInput
                id="weekly-exp-email"
                type="email"
                value={settings.email}
                onChange={(e) => setSettings((p) => ({ ...p, email: e.target.value }))}
                placeholder={cloudUser?.email || 'you@example.com'}
              />
            </FormField>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setBusy(true);
                  try {
                    save();
                  } finally {
                    setBusy(false);
                  }
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-rose-500 disabled:opacity-50"
              >
                <Mail className="h-4 w-4" />
                {busy ? 'Saving…' : 'Save settings'}
              </button>
              <button
                type="button"
                disabled={testBusy || !settings.email.trim()}
                onClick={sendTestNow}
                className="inline-flex items-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-2.5 text-sm font-medium text-rose-100 hover:bg-rose-500/20 disabled:opacity-50"
              >
                {testBusy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Send this week&apos;s summary now
              </button>
            </div>

            {message && <p className="text-xs text-zinc-400">{message}</p>}

            <div className="rounded-xl border border-white/10 bg-black/20 p-3 text-xs text-zinc-500">
              <p className="font-medium text-zinc-300">Kaise chalega</p>
              <ol className="mt-2 list-decimal space-y-1 pl-4">
                <li>Enable + email → Save</li>
                <li>
                  <strong className="text-zinc-300">Real-time Pulse</strong> (login + auto
                  cloud sync so cron can read expenditure)
                </li>
                <li>Har Sunday <strong className="text-zinc-300">9:00 PM Pakistan</strong> — Mon–Sun week PDF email</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </GlassCard>
  );
}
