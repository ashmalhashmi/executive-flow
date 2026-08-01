import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase, supabaseConfigured, CLOUD_TABLE } from '../lib/supabase';
import { hasAnyAppData, summarizeBackup, validateBackup } from '../utils/backup';
import { pushSnapshotToCloud } from '../utils/cloudSyncPush';
import { snapshotDataKey } from '../utils/cloudSyncState';
import { getAuthRedirectTo } from '../utils/authRedirect';

/** Debounce after every local edit — Real-time Pulse push */
const PULSE_PUSH_DEBOUNCE_MS = 1_200;
/** Poll cloud for remote edits when Realtime is unavailable */
const PULSE_PULL_INTERVAL_MS = 4_000;
/** First pulse shortly after login (was 30s manual-era delay) */
const PULSE_BOOT_DELAY_MS = 1_500;
const CLOUD_PREVIEW_DELAY_MS = 1_200;
/** Brief pause after applying a remote pull so we don't echo-push mid-apply */
const PULL_SETTLE_MS = 2_500;

function formatSyncSummary(summary) {
  return `${summary.calendarMeetings} calendar meetings, ${summary.meetings} total meetings, ${summary.souvenirs} souvenirs, ${summary.expenditures} expenditures, ${summary.orders} orders, ${summary.dak} dak, ${summary.tasks} tasks, ${summary.contacts} contacts`;
}

function buildSuccessMessage(summary) {
  let message = `Synced — ${formatSyncSummary(summary)}`;
  if (summary.calendarMeetings === 0 && summary.meetings > 0) {
    message +=
      ' Warning: My Calendar meetings 0 — pehle My Calendar se schedule karein.';
  }
  return message;
}

export function useCloudSync({ getAppSnapshot, importAppData, dataRevision = 0 }) {
  const [user, setUser] = useState(null);
  const [syncStatus, setSyncStatus] = useState('idle');
  const [syncMessage, setSyncMessage] = useState('');
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncPhase, setSyncPhase] = useState('');
  const [optimisticSaved, setOptimisticSaved] = useState(false);
  const [cloudPreview, setCloudPreview] = useState(null);
  const [restoreAvailable, setRestoreAvailable] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState(null);
  const [pulseState, setPulseState] = useState('idle'); // idle | live | syncing | error
  const [otpEmail, setOtpEmail] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const pullInFlight = useRef(false);
  const pushInFlight = useRef(false);
  const sessionDataKeyRef = useRef('');
  const pullSettleUntilRef = useRef(0);
  const autoPulledForUserRef = useRef('');
  const cloudUpdatedAtRef = useRef(null);
  const applyingRemoteRef = useRef(false);
  const bootReadyRef = useRef(false);
  const getAppSnapshotRef = useRef(getAppSnapshot);
  getAppSnapshotRef.current = getAppSnapshot;

  const resetPushUi = useCallback(() => {
    setSyncProgress(0);
    setSyncPhase('');
    setOptimisticSaved(false);
  }, []);

  useEffect(() => {
    if (!supabaseConfigured || !supabase) return undefined;

    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        setOtpSent(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchCloudPreview = useCallback(async () => {
    if (!supabaseConfigured || !supabase || !user) return null;

    const { data, error } = await supabase
      .from(CLOUD_TABLE)
      .select('payload, updated_at')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error || !data?.payload) {
      setCloudPreview(null);
      setRestoreAvailable(false);
      cloudUpdatedAtRef.current = null;
      return null;
    }

    const validated = validateBackup(data.payload);
    if (!validated.ok) {
      setCloudPreview(null);
      setRestoreAvailable(false);
      return null;
    }

    cloudUpdatedAtRef.current = data.updated_at ?? null;
    const summary = summarizeBackup(validated.data);
    setCloudPreview({ summary, updatedAt: data.updated_at ?? null });
    const localSummary = summarizeBackup(getAppSnapshot().data);
    setRestoreAvailable(!hasAnyAppData(localSummary) && hasAnyAppData(summary));
    return { summary, updatedAt: data.updated_at ?? null, payload: validated.data };
  }, [user, getAppSnapshot]);

  useEffect(() => {
    if (!user?.id) {
      setCloudPreview(null);
      sessionDataKeyRef.current = '';
      setRestoreAvailable(false);
      setPulseState('idle');
      bootReadyRef.current = false;
      return undefined;
    }
    sessionDataKeyRef.current = snapshotDataKey(getAppSnapshot());
    setPulseState('live');
    setSyncMessage(
      'Real-time Pulse on — changes auto-save; other device updates appear automatically.',
    );
    const previewTimer = setTimeout(() => {
      fetchCloudPreview();
    }, CLOUD_PREVIEW_DELAY_MS);
    const bootTimer = setTimeout(() => {
      bootReadyRef.current = true;
    }, PULSE_BOOT_DELAY_MS);
    return () => {
      clearTimeout(previewTimer);
      clearTimeout(bootTimer);
    };
    // Only re-arm on login — not on every snapshot identity change
    // eslint-disable-next-line react-hooks/exhaustive-deps -- getAppSnapshot/fetchCloudPreview intentionally omitted
  }, [user?.id]);

  const pullFromCloud = useCallback(
    async ({ silent = false } = {}) => {
      if (!supabaseConfigured || !supabase || !user) return { ok: false, error: 'Login required' };
      if (pullInFlight.current) return { ok: false, error: 'Pull already in progress' };
      if (pushInFlight.current) return { ok: false, skipped: true };

      pullInFlight.current = true;
      if (!silent) {
        resetPushUi();
        setSyncStatus('pulling');
        setSyncMessage('Cloud se data la rahe hain…');
      } else {
        setPulseState('syncing');
      }

      try {
        const { data, error } = await supabase
          .from(CLOUD_TABLE)
          .select('payload, updated_at')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          setSyncStatus('error');
          setPulseState('error');
          setSyncMessage(error.message);
          return { ok: false, error: error.message };
        }

        if (!data?.payload) {
          if (!silent) {
            setSyncStatus('idle');
            setSyncMessage(
              'Cloud par abhi koi data nahi — is device par edits Pulse se auto-save hongi.',
            );
          } else {
            setPulseState('live');
          }
          setCloudPreview(null);
          setRestoreAvailable(false);
          cloudUpdatedAtRef.current = null;
          return { ok: true, empty: true };
        }

        const validated = validateBackup(data.payload);
        if (!validated.ok) {
          setSyncStatus('error');
          setPulseState('error');
          setSyncMessage(validated.error);
          return { ok: false, error: validated.error };
        }

        const incomingKey = snapshotDataKey(validated.data);
        if (incomingKey === sessionDataKeyRef.current) {
          cloudUpdatedAtRef.current = data.updated_at ?? null;
          setLastSyncedAt(data.updated_at ?? new Date().toISOString());
          const summary = summarizeBackup(validated.data);
          setCloudPreview({ summary, updatedAt: data.updated_at ?? null });
          if (!silent) {
            setSyncStatus('idle');
            setSyncMessage('Already in sync with cloud.');
          } else {
            setPulseState('live');
          }
          return { ok: true, skipped: true, summary };
        }

        applyingRemoteRef.current = true;
        importAppData(validated.data);
        sessionDataKeyRef.current = incomingKey;
        pullSettleUntilRef.current = Date.now() + PULL_SETTLE_MS;
        cloudUpdatedAtRef.current = data.updated_at ?? null;
        setRestoreAvailable(false);

        const summary = summarizeBackup(validated.data);
        setLastSyncedAt(data.updated_at ?? new Date().toISOString());
        setCloudPreview({ summary, updatedAt: data.updated_at ?? null });
        setSyncStatus('idle');
        setPulseState('live');
        setSyncMessage(
          silent
            ? `Pulse · updated from other device · ${new Date().toLocaleTimeString()}`
            : `Load ho gaya — ${formatSyncSummary(summary)}. Jis tab mein changes kiye thay woh tab kholo.`,
        );
        // Allow revision bump from import to settle before treating as local edits
        setTimeout(() => {
          applyingRemoteRef.current = false;
        }, PULL_SETTLE_MS);
        return { ok: true, summary };
      } finally {
        pullInFlight.current = false;
      }
    },
    [user, importAppData, resetPushUi],
  );

  /** Empty device + cloud has data → auto restore once per login */
  useEffect(() => {
    if (!user?.id || !restoreAvailable) return;
    if (autoPulledForUserRef.current === user.id) return;
    autoPulledForUserRef.current = user.id;
    setSyncMessage('Cloud backup mila — Real-time Pulse auto-loading…');
    void pullFromCloud({ silent: true });
  }, [user?.id, restoreAvailable, pullFromCloud]);

  const pushToCloud = useCallback(
    async ({ silent = false, force = false } = {}) => {
      if (!supabaseConfigured || !supabase || !user) {
        return { ok: false, error: 'Login required' };
      }
      if (pushInFlight.current) {
        return { ok: false, skipped: true, error: 'Save already in progress' };
      }
      if (pullInFlight.current && silent) {
        return { ok: false, skipped: true };
      }

      const currentDataKey = snapshotDataKey(getAppSnapshot());
      const hasLocalEdits = currentDataKey !== sessionDataKeyRef.current;

      if (silent && !force) {
        if (applyingRemoteRef.current || Date.now() < pullSettleUntilRef.current) {
          return { ok: false, skipped: true };
        }
        if (!hasLocalEdits) {
          return { ok: false, skipped: true };
        }
      }

      pushInFlight.current = true;
      if (!silent) {
        resetPushUi();
      } else {
        setPulseState('syncing');
      }

      const snapshot = getAppSnapshot();
      const summary = summarizeBackup(snapshot.data);
      const successMessage = buildSuccessMessage(summary);
      const payloadBytes = new Blob([JSON.stringify(snapshot)]).size;
      const isSmall = payloadBytes <= 80_000;

      const cloudSummary = cloudPreview?.summary;
      if (!hasAnyAppData(summary) && cloudSummary && hasAnyAppData(cloudSummary)) {
        const blockedMessage =
          'Is device par data khali hai — cloud par purana backup hai. Pulse pehle cloud se load karega; empty overwrite block hai.';
        if (!silent) {
          setSyncStatus('error');
          setSyncMessage(blockedMessage);
        }
        setPulseState('error');
        pushInFlight.current = false;
        return { ok: false, error: blockedMessage, blockedEmptyOverwrite: true };
      }

      if (!silent) {
        setSyncStatus(isSmall ? 'confirming' : 'pushing');
        setSyncMessage(
          isSmall
            ? `${successMessage} (cloud confirm ho rahi hai…)`
            : 'Cloud par save ho raha hai…',
        );

        if (isSmall) {
          setOptimisticSaved(true);
          setSyncProgress(100);
          setSyncPhase('Uploading…');
        } else {
          setSyncProgress(5);
          setSyncPhase('Preparing backup…');
        }
      }

      try {
        await pushSnapshotToCloud({
          supabase,
          table: CLOUD_TABLE,
          userId: user.id,
          getAppSnapshot,
          onProgress: ({ progress, phase }) => {
            if (silent) return;
            if (!isSmall) {
              setSyncProgress(progress);
              setSyncPhase(phase);
            } else if (progress < 100) {
              setSyncPhase(phase);
            }
          },
        });

        const savedAt = new Date().toISOString();
        sessionDataKeyRef.current = snapshotDataKey(snapshot);
        cloudUpdatedAtRef.current = savedAt;
        setLastSyncedAt(savedAt);
        setCloudPreview({ summary, updatedAt: savedAt });
        setPulseState('live');
        if (silent) {
          setSyncStatus('idle');
          setSyncMessage(`Pulse · auto-saved · ${new Date(savedAt).toLocaleTimeString()}`);
        } else {
          setSyncStatus('idle');
          setSyncMessage(successMessage);
          setSyncProgress(100);
          setSyncPhase('Complete');
          setOptimisticSaved(false);
        }
        return { ok: true, summary };
      } catch (err) {
        setSyncStatus('error');
        setPulseState('error');
        if (!silent) {
          setOptimisticSaved(false);
          setSyncProgress(0);
          setSyncPhase('');
        }
        setSyncMessage(err.message || 'Cloud save failed');
        return { ok: false, error: err.message };
      } finally {
        pushInFlight.current = false;
      }
    },
    [user, getAppSnapshot, resetPushUi, cloudPreview],
  );

  const pushToCloudRef = useRef(pushToCloud);
  pushToCloudRef.current = pushToCloud;
  const pullFromCloudRef = useRef(pullFromCloud);
  pullFromCloudRef.current = pullFromCloud;

  /** Real-time Pulse: every local change → debounced silent push */
  useEffect(() => {
    if (!supabaseConfigured || !user?.id) return undefined;
    if (!bootReadyRef.current && dataRevision === 0) return undefined;
    if (applyingRemoteRef.current) return undefined;

    const timer = setTimeout(() => {
      void pushToCloudRef.current({ silent: true });
    }, dataRevision === 0 ? PULSE_BOOT_DELAY_MS : PULSE_PUSH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [user?.id, dataRevision]);

  /** Boot + visibility: ensure pending local edits flush */
  useEffect(() => {
    if (!supabaseConfigured || !user?.id) return undefined;

    const bootTimer = setTimeout(() => {
      bootReadyRef.current = true;
      void pushToCloudRef.current({ silent: true });
    }, PULSE_BOOT_DELAY_MS);

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        void pullFromCloudRef.current({ silent: true });
      } else if (document.visibilityState === 'hidden') {
        void pushToCloudRef.current({ silent: true, force: false });
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      clearTimeout(bootTimer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [user?.id]);

  /**
   * Remote pulse: if cloud updated_at is newer and we have no local edits, auto-pull.
   * Realtime subscription + polling fallback.
   */
  useEffect(() => {
    if (!supabaseConfigured || !supabase || !user?.id) return undefined;

    const checkRemote = async () => {
      if (pullInFlight.current || pushInFlight.current || applyingRemoteRef.current) return;
      const currentKey = snapshotDataKey(getAppSnapshotRef.current());
      const hasLocalEdits = currentKey !== sessionDataKeyRef.current;
      if (hasLocalEdits) {
        // Local edits win — pulse will push them
        return;
      }

      const { data, error } = await supabase
        .from(CLOUD_TABLE)
        .select('updated_at')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error || !data?.updated_at) return;

      const known = cloudUpdatedAtRef.current;
      if (known && new Date(data.updated_at).getTime() <= new Date(known).getTime()) {
        return;
      }

      await pullFromCloudRef.current({ silent: true });
    };

    const interval = setInterval(() => {
      void checkRemote();
    }, PULSE_PULL_INTERVAL_MS);

    let channel;
    try {
      channel = supabase
        .channel(`pulse-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: CLOUD_TABLE,
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            void checkRemote();
          },
        )
        .subscribe();
    } catch {
      channel = null;
    }

    // Immediate check shortly after login
    const firstCheck = setTimeout(() => {
      void checkRemote();
    }, PULSE_BOOT_DELAY_MS + 500);

    return () => {
      clearInterval(interval);
      clearTimeout(firstCheck);
      if (channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, [user?.id]);

  const signInWithGoogle = useCallback(async () => {
    if (!supabaseConfigured || !supabase) {
      return { ok: false, error: 'Supabase configure nahi hai' };
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: getAuthRedirectTo(),
        queryParams: { prompt: 'select_account' },
      },
    });
    if (error) {
      const msg = String(error.message || '');
      if (/provider is not enabled|Unsupported provider/i.test(msg)) {
        return {
          ok: false,
          error:
            'Google login Supabase mein ON nahi hai. Abhi Email OTP use karein (neeche), ya Supabase → Authentication → Providers → Google enable karein.',
        };
      }
      return { ok: false, error: msg };
    }
    return { ok: true };
  }, []);

  const signInWithEmail = useCallback(async (email) => {
    if (!supabaseConfigured || !supabase) {
      return { ok: false, error: 'Supabase configure nahi hai' };
    }
    const trimmed = email?.trim().toLowerCase();
    if (!trimmed) return { ok: false, error: 'Email likhein' };

    const { error } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: {
        emailRedirectTo: getAuthRedirectTo(),
        shouldCreateUser: true,
      },
    });
    if (error) {
      const msg = String(error.message || '');
      if (/rate limit|over_email_send_rate_limit/i.test(msg)) {
        return {
          ok: false,
          error: 'Rate limit — 30–60 minute baad dubara try karein (ya pehle wali email ka 6-digit code use karein).',
        };
      }
      return { ok: false, error: msg };
    }

    setOtpEmail(trimmed);
    setOtpSent(true);
    return {
      ok: true,
      message:
        'Login email bhej di. Gmail mein 6–8 digit CODE dhoondo (subject/body) — app mein type karein. Spam bhi check karein.',
    };
  }, []);

  const verifyEmailOtp = useCallback(async (email, token) => {
    if (!supabaseConfigured || !supabase) {
      return { ok: false, error: 'Supabase configure nahi hai' };
    }
    const trimmedEmail = (email || otpEmail || '').trim().toLowerCase();
    const code = String(token || '').replace(/\s/g, '');
    if (!trimmedEmail) return { ok: false, error: 'Email likhein' };
    if (!/^\d{6,8}$/.test(code)) {
      return { ok: false, error: 'Email ka 6–8 digit code likhein' };
    }

    const { data, error } = await supabase.auth.verifyOtp({
      email: trimmedEmail,
      token: code,
      type: 'email',
    });

    if (error) {
      return { ok: false, error: error.message || 'Code galat ya expire ho gaya' };
    }

    setUser(data.session?.user ?? null);
    setOtpSent(false);
    setSyncMessage(
      `Logged in: ${data.session?.user?.email || trimmedEmail} — Real-time Pulse starting…`,
    );
    return {
      ok: true,
      message: 'Login successful — Real-time Pulse ab auto sync karegi (Save/Load ki zaroorat nahi).',
    };
  }, [otpEmail]);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setSyncMessage('');
    setCloudPreview(null);
    setLastSyncedAt(null);
    setRestoreAvailable(false);
    setOtpSent(false);
    setOtpEmail('');
    setPulseState('idle');
    autoPulledForUserRef.current = '';
    cloudUpdatedAtRef.current = null;
    bootReadyRef.current = false;
    resetPushUi();
  }, [resetPushUi]);

  const isPushActive = syncStatus === 'pushing' || syncStatus === 'confirming';

  return {
    supabaseConfigured,
    user,
    syncStatus,
    syncMessage,
    syncProgress,
    syncPhase,
    optimisticSaved,
    isPushActive,
    cloudPreview,
    restoreAvailable,
    lastSyncedAt,
    pulseState,
    otpSent,
    otpEmail,
    signInWithGoogle,
    signInWithEmail,
    verifyEmailOtp,
    signOut,
    pullFromCloud,
    pushToCloud,
    fetchCloudPreview,
  };
}
