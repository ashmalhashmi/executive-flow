import { useState } from 'react';
import { Mail, Loader2, Send, Sunrise } from 'lucide-react';
import GlassCard from '../ui/GlassCard';
import FormField, { TextInput } from '../ui/FormField';
import { getTodayISO } from '../../utils/dates';
import {
  isValidMorningBoardEmail,
  loadMorningBoardSettings,
  saveMorningBoardSettings,
} from '../../utils/morningBoardSettings';
import { supabase } from '../../lib/supabase';

function todaysBoardMeetings(meetings) {
  const today = getTodayISO();
  return [...(meetings || [])]
    .filter(
      (m) =>
        m.date === today &&
        m.scheduledViaCalendar !== false &&
        m.status !== 'Completed' &&
        String(m.status || '').toLowerCase() !== 'cancelled',
    )
    .sort((a, b) => String(a.time || '').localeCompare(String(b.time || '')));
}

export default function MorningBoardEmailCard({ meetings, onSettingsSaved, cloudUser }) {
  const [settings, setSettings] = useState(() => loadMorningBoardSettings());
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [testBusy, setTestBusy] = useState(false);

  const save = () => {
    if (settings.enabled && !isValidMorningBoardEmail(settings.email)) {
      setMessage('Valid email address likhein');
      return;
    }
    const next = saveMorningBoardSettings(settings);
    setSettings(next);
    setMessage(
      next.enabled
        ? `Saved — har din 8:00 AM (Pakistan) Meeting Board PDF ${next.email} par jayegi. Real-time Pulse cloud par sync karegi.`
        : 'Disabled — morning email band.',
    );
    onSettingsSaved?.(next);
  };

  const sendTestNow = async () => {
    if (!isValidMorningBoardEmail(settings.email)) {
      setMessage('Pehle valid email save karein');
      return;
    }
    const dayMeetings = todaysBoardMeetings(meetings);
    if (!dayMeetings.length) {
      setMessage('Aaj koi calendar meeting nahi — test skip. Kal ke liye enable rakhein.');
      return;
    }

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

      const res = await fetch('/api/morning-meeting-board', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          email: settings.email.trim(),
          dateISO: getTodayISO(),
          timezone: settings.timezone || 'Asia/Karachi',
          meetings: dayMeetings,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || `Send failed (${res.status})`);
      }
      const result = data.results?.[0];
      if (result?.skipped) {
        setMessage('Aaj meetings nahi thin — email skip.');
      } else if (result?.sent) {
        setMessage(`Test email bhej di — inbox check karein (${result.count} meetings).`);
      } else if (result?.error) {
        throw new Error(result.error);
      } else {
        setMessage(data.message || 'Server responded — inbox check karein.');
      }
    } catch (err) {
      setMessage(err.message || 'Test email fail — RESEND_API_KEY / login check karein.');
    } finally {
      setTestBusy(false);
    }
  };

  return (
    <GlassCard className="p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <Sunrise className="h-5 w-5 shrink-0 text-amber-300" />
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
            Morning Meeting Board Email
          </h3>
          <p className="mt-2 text-sm text-zinc-500">
            Roz <strong className="text-zinc-300">8:00 AM (Pakistan)</strong> — sirf us din ki
            calendar meetings ka Meeting Board PDF email. Agar meeting na ho to email skip.
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
              Auto email enable karein
            </label>

            <FormField label="Email address" id="morning-board-email">
              <TextInput
                id="morning-board-email"
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
                className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-amber-500 disabled:opacity-50"
              >
                <Mail className="h-4 w-4" />
                {busy ? 'Saving…' : 'Save settings'}
              </button>
              <button
                type="button"
                disabled={testBusy || !settings.email.trim()}
                onClick={sendTestNow}
                className="inline-flex items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-2.5 text-sm font-medium text-amber-100 hover:bg-amber-500/20 disabled:opacity-50"
              >
                {testBusy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Send today&apos;s board now
              </button>
            </div>

            {message && <p className="text-xs text-zinc-400">{message}</p>}

            <div className="rounded-xl border border-white/10 bg-black/20 p-3 text-xs text-zinc-500">
              <p className="font-medium text-zinc-300">Asaan setup (Google Gmail — recommended)</p>
              <ol className="mt-2 list-decimal space-y-1 pl-4">
                <li>
                  Google Sheet → Extensions → Apps Script → file{' '}
                  <code className="text-amber-200">MorningBoardEmail.gs</code> paste
                </li>
                <li>
                  Run: <code className="text-amber-200">installMorningMeetingBoardTrigger</code> →
                  Allow
                </li>
                <li>Test: Run <code className="text-amber-200">sendMorningMeetingBoard</code></li>
              </ol>
              <p className="mt-2">
                Email aapke Google account par jayegi. Meetings Sheet se uthengi — is liye app se
                Google Sheet sync on rakhein.
              </p>
            </div>
          </div>
        </div>
      </div>
    </GlassCard>
  );
}
