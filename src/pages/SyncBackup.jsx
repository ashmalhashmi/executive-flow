import { useMemo, useState } from 'react';
import { countDiff } from '../utils/cloudSyncState';
import {
  Cloud,
  CloudOff,
  RefreshCw,
  LogIn,
  LogOut,
  Smartphone,
  Mail,
  Table2,
  Loader2,
  Activity,
} from 'lucide-react';
import {
  useAppMetaExecutive,
  useCaptureExecutive,
  useContactsExecutive,
  useDakExecutive,
  useExpenditureExecutive,
  useMeetingsExecutive,
  useOrdersExecutive,
  useSouvenirsExecutive,
  useTasksExecutive,
} from '../context/ExecutiveContext';
import { useCloudSyncContext } from '../context/CloudSyncContext';
import { useGoogleSheetsSyncContext } from '../context/GoogleSheetsSyncContext';
import GlassCard from '../components/ui/GlassCard';
import CloudSyncProgress from '../components/sync/CloudSyncProgress';
import RealtimePulseStatus from '../components/sync/RealtimePulseStatus';
import { summarizeBackup } from '../utils/backup';
import DiaryImportPanel from '../components/sync/DiaryImportPanel';
import PerformanceKpiCard from '../components/performance/PerformanceKpiCard';
import MorningBoardEmailCard from '../components/sync/MorningBoardEmailCard';
import WeeklyExpenditureEmailCard from '../components/sync/WeeklyExpenditureEmailCard';

export default function SyncBackup() {
  const { meetings } = useMeetingsExecutive();
  const { souvenirs } = useSouvenirsExecutive();
  const { expenditureState } = useExpenditureExecutive();
  const { orders } = useOrdersExecutive();
  const { dakEntries } = useDakExecutive();
  const { taskEntries } = useTasksExecutive();
  const { captureEntries } = useCaptureExecutive();
  const { contacts } = useContactsExecutive();
  const { importAppData, getAppSnapshot } = useAppMetaExecutive();
  const [loginEmail, setLoginEmail] = useState('hashmiashmal57@gmail.com');
  const [otpCode, setOtpCode] = useState('');
  const [authMessage, setAuthMessage] = useState('');
  const [authBusy, setAuthBusy] = useState(false);

  const cloud = useCloudSyncContext();

  const sheets = useGoogleSheetsSyncContext();

  const localSummary = summarizeBackup({
    meetings,
    souvenirs,
    expenditure: expenditureState,
    orders,
    dak: dakEntries,
    tasks: taskEntries,
    captures: captureEntries,
    contacts,
  });

  const cloudDiff = useMemo(() => {
    if (!cloud?.cloudPreview?.summary) return null;
    return countDiff(localSummary, cloud.cloudPreview.summary);
  }, [localSummary, cloud?.cloudPreview?.summary]);

  return (
    <div className="space-y-6">
      <GlassCard className="p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <Smartphone className="h-5 w-5 text-indigo-300" />
          <div>
            <p className="text-sm font-medium text-white">Is device par abhi</p>
            <p className="text-xs text-zinc-500">
              {localSummary.calendarMeetings} calendar meetings · {localSummary.meetings} total ·{' '}
              {localSummary.souvenirs} souvenirs · {localSummary.expenditures} expenditures ·{' '}
              {localSummary.orders} orders · {localSummary.dak} dak · {localSummary.tasks} tasks ·{' '}
              {localSummary.captures} captures · {localSummary.contacts} contacts
            </p>
          </div>
        </div>
      </GlassCard>

      {cloud?.restoreAvailable && (
        <GlassCard className="border-amber-500/30 bg-amber-500/10 p-5 sm:p-6">
          <p className="text-sm font-semibold text-amber-100">Cloud par purana backup mila</p>
          <p className="mt-2 text-sm text-amber-100/80">
            Is device khali hai — <strong>Real-time Pulse</strong> cloud se auto-load kar rahi hai.
            Kuch edit mat karein jab tak pulse &quot;live&quot; na dikhe.
          </p>
        </GlassCard>
      )}

      <PerformanceKpiCard />

      <MorningBoardEmailCard meetings={meetings} cloudUser={cloud?.user} />

      <WeeklyExpenditureEmailCard cloudUser={cloud?.user} />

      <DiaryImportPanel
        meetings={meetings}
        importAppData={importAppData}
        getAppSnapshot={getAppSnapshot}
      />

      <GlassCard className="p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <Table2 className="h-5 w-5 shrink-0 text-emerald-300" />
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
              Google Sheet — Auto Backup
            </h3>
            <p className="mt-2 text-sm text-zinc-500">
              Har change ke baad data Google Sheet par save hota hai. Raw tabs backend ke liye;
              Report tabs QUERY se print-ready view banati hain — status colours aur named ranges ke
              sath.
            </p>

            {!sheets?.sheetsConfigured ? (
              <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-4 text-xs text-zinc-400">
                <p className="font-medium text-zinc-300">Setup pending (developer)</p>
                <p className="mt-2">
                  Apps Script webhook URL:
                  <code className="mx-1 break-all text-emerald-300">VITE_GOOGLE_SHEETS_WEBHOOK_URL</code>
                </p>
                <p className="mt-2">
                  Sheet magnified view:
                  <code className="mx-1 break-all text-emerald-300">VITE_GOOGLE_SHEET_VIEW_URL</code>
                </p>
                <p className="mt-2">
                  Guide: <strong>scripts/google-sheets-webhook.gs</strong>
                </p>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs text-zinc-400">
                  <p className="font-medium text-emerald-200">Automatic sync</p>
                  <p className="mt-1">
                    Raw tabs: Meetings, Souvenirs, Expenditure, Orders, Dak, Tasks, Contacts, Meta.
                    Report tabs (QUERY): Meetings Report, Orders Report, Tasks Report, etc. — status
                    conditional formatting (Pending / Done / Cancelled) aur EF_* named ranges.
                  </p>
                </div>

                {sheets.sheetsSyncEnabled ? (
                  <div className="flex items-center gap-2 text-sm text-zinc-300">
                    {sheets.status === 'syncing' ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />
                        <span>{sheets.message || 'Sheet update ho rahi hai…'}</span>
                      </>
                    ) : sheets.status === 'error' ? (
                      <span className="text-red-300">{sheets.message}</span>
                    ) : (
                      <span className="text-emerald-300">
                        {sheets.message || 'Sheet backup ready'}
                        {sheets.lastSyncedAt
                          ? ` · ${new Date(sheets.lastSyncedAt).toLocaleString()}`
                          : ''}
                      </span>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-amber-300/90">
                    Viewer configured — auto-sync ke liye webhook URL add karein.
                  </p>
                )}

                <div className="flex flex-wrap gap-2">
                  {sheets.sheetViewUrl && (
                    <button
                      type="button"
                      onClick={() => sheets.openSheetViewer?.()}
                      className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-500"
                    >
                      <Table2 className="h-4 w-4" />
                      View Google Sheet (Magnified)
                    </button>
                  )}
                  {sheets.sheetsSyncEnabled && (
                    <button
                      type="button"
                      disabled={sheets.status === 'syncing'}
                      onClick={() => sheets.syncNow?.()}
                      className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-4 py-2.5 text-sm text-zinc-200 hover:bg-white/5 disabled:opacity-50"
                    >
                      <RefreshCw
                        className={`h-4 w-4 ${sheets.status === 'syncing' ? 'animate-spin' : ''}`}
                      />
                      Sync Now
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </GlassCard>

      <GlassCard className="p-5 sm:p-6">
        <div className="flex items-start gap-3">
          {cloud.supabaseConfigured ? (
            <Cloud className="h-5 w-5 shrink-0 text-sky-300" />
          ) : (
            <CloudOff className="h-5 w-5 shrink-0 text-zinc-500" />
          )}
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
              Cloud Sync — Real-time Pulse
            </h3>
            <p className="mt-2 text-sm text-zinc-500">
              Dono devices par <strong className="text-zinc-300">same email</strong> se login —
              uske baad Pulse background mein har change auto-save / auto-load karti hai.
            </p>
            <div className="mt-3 rounded-xl border border-sky-500/20 bg-sky-500/5 p-3 text-xs text-zinc-400">
              <p className="font-medium text-sky-200 flex items-center gap-1.5">
                <Activity className="h-3.5 w-3.5" />
                Background Automation
              </p>
              <p className="mt-1">
                1) Dono devices: <strong>wahi email</strong> se login
                <br />
                2) Edit anywhere — Pulse ~1s mein cloud par likhti hai
                <br />
                3) Doosri device kholo / wait — changes magically dikhein
                <br />
                4) Manual Save / Load ki zaroorat nahi
              </p>
            </div>

            {!cloud.supabaseConfigured ? (
              <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-4 text-xs text-zinc-400">
                <p className="font-medium text-zinc-300">Setup pending (developer)</p>
                <p className="mt-2">
                  Supabase project banane ke baad Vercel env vars add karni hongi:
                  <code className="mx-1 break-all text-indigo-300">VITE_SUPABASE_URL</code>
                  aur
                  <code className="mx-1 break-all text-indigo-300">VITE_SUPABASE_ANON_KEY</code>
                </p>
                <p className="mt-2">SQL file: <strong>supabase/schema.sql</strong></p>
              </div>
            ) : cloud.user ? (
              <div className="mt-4 space-y-3">
                <RealtimePulseStatus
                  pulseState={cloud.pulseState}
                  lastSyncedAt={cloud.lastSyncedAt}
                  syncMessage={cloud.syncMessage}
                  isPushActive={cloud.isPushActive}
                  isPulling={cloud.syncStatus === 'pulling'}
                />
                <p className="text-sm text-emerald-300">
                  Logged in: {cloud.user.email ?? cloud.user.id}
                </p>
                <div className="rounded-xl border border-white/10 bg-black/20 p-3 text-xs">
                  <p className="font-medium text-zinc-300">Is device · cloud mirror</p>
                  <p className="mt-1 text-zinc-500">
                    Local: {localSummary.meetings} meetings · {localSummary.orders} orders ·{' '}
                    {localSummary.tasks} tasks · {localSummary.dak} dak · {localSummary.expenditures}{' '}
                    expenses · {localSummary.contacts} contacts
                  </p>
                  {cloud.cloudPreview ? (
                    <p className="mt-1 text-zinc-500">
                      Cloud: {cloud.cloudPreview.summary.meetings} meetings ·{' '}
                      {cloud.cloudPreview.summary.orders} orders ·{' '}
                      {cloud.cloudPreview.summary.tasks} tasks · {cloud.cloudPreview.summary.dak} dak
                      · {cloud.cloudPreview.summary.expenditures} expenses ·{' '}
                      {cloud.cloudPreview.summary.contacts ?? 0} contacts
                      {cloud.cloudPreview.updatedAt
                        ? ` · ${new Date(cloud.cloudPreview.updatedAt).toLocaleString()}`
                        : ''}
                    </p>
                  ) : (
                    <p className="mt-1 text-zinc-500">Cloud status load ho rahi hai…</p>
                  )}
                  {cloudDiff && (
                    <p className="mt-2 text-amber-300/90">
                      Counts briefly alag — Pulse sync kar rahi hai (local edits push, remote pull).
                    </p>
                  )}
                </div>
                <p className="text-[11px] text-zinc-500">
                  Same email on every device. Google vs Email OTP alag accounts bana sakte hain —
                  dono jagah identical login use karein.
                </p>
                <CloudSyncProgress
                  active={cloud.isPushActive}
                  progress={cloud.syncProgress}
                  phase={cloud.syncPhase}
                  optimisticSaved={cloud.optimisticSaved}
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={cloud.isPushActive || cloud.syncStatus === 'pulling'}
                    onClick={() => cloud.fetchCloudPreview()}
                    className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-4 py-2 text-sm text-zinc-200 hover:bg-white/5 disabled:opacity-50"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Refresh status
                  </button>
                  <button
                    type="button"
                    onClick={() => cloud.signOut()}
                    className="inline-flex items-center gap-2 rounded-xl border border-red-500/30 px-4 py-2 text-sm text-red-300 hover:bg-red-500/10"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                <p className="text-xs text-amber-200/90">
                  Recommended: <strong>same email</strong> on laptop + mobile (
                  <strong className="text-amber-100">hashmiashmal57@gmail.com</strong>). Google
                  login abhi Supabase mein OFF hai — Email use karein.
                </p>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <input
                    type="email"
                    placeholder="your@email.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600"
                  />
                  <button
                    type="button"
                    disabled={authBusy}
                    onClick={async () => {
                      setAuthBusy(true);
                      setAuthMessage('');
                      const res = await cloud.signInWithEmail(loginEmail);
                      setAuthMessage(res.ok ? res.message : res.error);
                      setAuthBusy(false);
                    }}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-400 disabled:opacity-50"
                  >
                    <Mail className="h-4 w-4" />
                    {authBusy ? 'Sending…' : 'Send Email Code'}
                  </button>
                </div>

                <div className="rounded-xl border border-sky-500/25 bg-sky-500/10 p-3 text-xs text-zinc-300 space-y-2">
                  <p className="font-medium text-sky-100">Email aayi? Code dhoondo:</p>
                  <p>
                    Subject mein ya body mein <strong className="text-white">6–8 digit number</strong>{' '}
                    (e.g. <code className="text-indigo-200">847291</code>) — woh yahan neeche type
                    karein.
                  </p>
                  <p className="text-zinc-500">
                    Agar sirf link dikhe (purani email): link Chrome mein kholo, ya naya email
                    mangwao after OTP template apply.
                  </p>
                </div>

                {(cloud.otpSent || otpCode) && (
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 space-y-2">
                    <p className="text-xs text-emerald-100">
                      Agar email mein 6-digit code hai to yahan type karein:
                    </p>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <input
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        placeholder="123456"
                        maxLength={8}
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/[^\d]/g, ''))}
                        className="flex-1 rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-center text-lg tracking-[0.3em] text-zinc-100 placeholder:text-zinc-600"
                      />
                      <button
                        type="button"
                        disabled={authBusy || otpCode.length < 6}
                        onClick={async () => {
                          setAuthBusy(true);
                          const res = await cloud.verifyEmailOtp(loginEmail, otpCode);
                          setAuthMessage(res.ok ? res.message : res.error);
                          if (res.ok) setOtpCode('');
                          setAuthBusy(false);
                        }}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
                      >
                        Verify & Login
                      </button>
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  disabled={authBusy}
                  onClick={async () => {
                    setAuthBusy(true);
                    const res = await cloud.signInWithGoogle();
                    if (!res.ok) setAuthMessage(res.error);
                    setAuthBusy(false);
                  }}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-medium text-zinc-200 hover:bg-white/10 disabled:opacity-50"
                >
                  <LogIn className="h-4 w-4" />
                  Sign in with Google (optional)
                </button>
                <p className="text-[11px] text-zinc-500">
                  Google tabhi chalega jab Supabase → Authentication → Providers → Google enable ho.
                  Abhi Email OTP use karein.
                </p>
                {authMessage && (
                  <p
                    className={`text-xs ${
                      /rate limit|nahi|galat|failed|error|ON nahi/i.test(authMessage)
                        ? 'text-red-300'
                        : 'text-emerald-300'
                    }`}
                  >
                    {authMessage}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
