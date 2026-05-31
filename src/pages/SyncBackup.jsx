import { useRef, useState } from 'react';
import {
  Cloud,
  CloudOff,
  Download,
  Upload,
  RefreshCw,
  LogIn,
  LogOut,
  Smartphone,
} from 'lucide-react';
import { useExecutive } from '../context/ExecutiveContext';
import { useCloudSync } from '../hooks/useCloudSync';
import GlassCard from '../components/ui/GlassCard';
import {
  buildAppSnapshot,
  downloadBackup,
  readBackupFile,
  summarizeBackup,
} from '../utils/backup';

export default function SyncBackup() {
  const { meetings, souvenirs, expenditureState, importAppData, getAppSnapshot } =
    useExecutive();
  const fileRef = useRef(null);
  const [importPreview, setImportPreview] = useState(null);
  const [localMessage, setLocalMessage] = useState('');

  const cloud = useCloudSync({
    getAppSnapshot,
    importAppData,
    meetings,
    souvenirs,
    expenditureState,
  });

  const handleExport = () => {
    const snapshot = buildAppSnapshot({ meetings, souvenirs, expenditureState });
    downloadBackup(snapshot);
    const s = summarizeBackup(snapshot.data);
    setLocalMessage(
      `Export ho gaya — ${s.meetings} meetings, ${s.souvenirs} souvenirs, ${s.expenditures} expenditures`,
    );
  };

  const handleFilePick = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const result = await readBackupFile(file);
    if (!result.ok) {
      setImportPreview(null);
      setLocalMessage(result.error);
      return;
    }
    setImportPreview({ ...summarizeBackup(result.data), data: result.data, exportedAt: result.exportedAt });
    setLocalMessage('');
    e.target.value = '';
  };

  const handleImportConfirm = () => {
    if (!importPreview?.data) return;
    if (
      !window.confirm(
        'Import se is device ka purana data replace ho jayega. Continue karein?',
      )
    ) {
      return;
    }
    importAppData(importPreview.data);
    setImportPreview(null);
    setLocalMessage('Import successful — ab yeh device par naya data hai');
  };

  const localSummary = summarizeBackup({
    meetings,
    souvenirs,
    expenditure: expenditureState,
  });

  return (
    <div className="space-y-6">
      {/* Current device summary */}
      <GlassCard className="p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <Smartphone className="h-5 w-5 text-indigo-300" />
          <div>
            <p className="text-sm font-medium text-white">Is device par abhi</p>
            <p className="text-xs text-zinc-500">
              {localSummary.meetings} meetings · {localSummary.souvenirs} souvenirs ·{' '}
              {localSummary.expenditures} expenditures
            </p>
          </div>
        </div>
      </GlassCard>

      {/* Export / Import */}
      <GlassCard className="p-5 sm:p-6">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
          Step 1 — Export / Import (manual sync)
        </h3>
        <p className="mt-2 text-sm text-zinc-500">
          Laptop se file export karein, phone par import karein — ya ulta. WhatsApp / email se
          file bhej sakte hain.
        </p>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={handleExport}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-400"
          >
            <Download className="h-4 w-4" />
            Export Backup File
          </button>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-medium text-zinc-200 hover:bg-white/10"
          >
            <Upload className="h-4 w-4" />
            Import Backup File
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={handleFilePick}
          />
        </div>

        {importPreview && (
          <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
            <p className="text-sm font-medium text-amber-100">Import preview</p>
            <p className="mt-1 text-xs text-amber-200/80">
              {importPreview.meetings} meetings · {importPreview.souvenirs} souvenirs ·{' '}
              {importPreview.expenditures} expenditures
              {importPreview.exportedAt ? ` · exported ${importPreview.exportedAt.slice(0, 10)}` : ''}
            </p>
            <button
              type="button"
              onClick={handleImportConfirm}
              className="mt-3 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-500"
            >
              Confirm Import (replace this device)
            </button>
          </div>
        )}

        {localMessage && (
          <p className="mt-3 text-sm text-emerald-300">{localMessage}</p>
        )}
      </GlassCard>

      {/* Supabase cloud */}
      <GlassCard className="p-5 sm:p-6">
        <div className="flex items-start gap-3">
          {cloud.supabaseConfigured ? (
            <Cloud className="h-5 w-5 shrink-0 text-sky-300" />
          ) : (
            <CloudOff className="h-5 w-5 shrink-0 text-zinc-500" />
          )}
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
              Step 2 — Cloud Sync (Supabase, auto)
            </h3>
            <p className="mt-2 text-sm text-zinc-500">
              Google login ke baad laptop aur mobile same data share karenge — internet chahiye.
            </p>

            {!cloud.supabaseConfigured ? (
              <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-4 text-xs text-zinc-400">
                <p className="font-medium text-zinc-300">Setup pending (developer)</p>
                <p className="mt-2">
                  Supabase project banane ke baad Vercel env vars add karni hongi:
                  <code className="mx-1 text-indigo-300">VITE_SUPABASE_URL</code>
                  aur
                  <code className="mx-1 text-indigo-300">VITE_SUPABASE_ANON_KEY</code>
                </p>
                <p className="mt-2">SQL file: <strong>supabase/schema.sql</strong></p>
              </div>
            ) : cloud.user ? (
              <div className="mt-4 space-y-3">
                <p className="text-sm text-emerald-300">
                  Logged in: {cloud.user.email ?? cloud.user.id}
                </p>
                {cloud.lastSyncedAt && (
                  <p className="text-xs text-zinc-500">
                    Last sync: {new Date(cloud.lastSyncedAt).toLocaleString()}
                  </p>
                )}
                {cloud.syncMessage && (
                  <p className="text-xs text-zinc-400">{cloud.syncMessage}</p>
                )}
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={cloud.syncStatus === 'pushing' || cloud.syncStatus === 'pulling'}
                    onClick={() => cloud.pushToCloud()}
                    className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2 text-sm text-white hover:bg-sky-500 disabled:opacity-50"
                  >
                    <RefreshCw className={`h-4 w-4 ${cloud.syncStatus === 'pushing' ? 'animate-spin' : ''}`} />
                    Save to Cloud
                  </button>
                  <button
                    type="button"
                    disabled={cloud.syncStatus === 'pushing' || cloud.syncStatus === 'pulling'}
                    onClick={() => cloud.pullFromCloud()}
                    className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-4 py-2 text-sm text-zinc-200 hover:bg-white/5 disabled:opacity-50"
                  >
                    Load from Cloud
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
              <button
                type="button"
                onClick={() => cloud.signInWithGoogle()}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-medium text-zinc-900 hover:bg-zinc-100"
              >
                <LogIn className="h-4 w-4" />
                Sign in with Google
              </button>
            )}
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
