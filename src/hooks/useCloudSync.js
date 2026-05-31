import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase, supabaseConfigured, CLOUD_TABLE } from '../lib/supabase';
import { buildAppSnapshot, validateBackup } from '../utils/backup';

const SYNC_DEBOUNCE_MS = 2500;

export function useCloudSync({
  getAppSnapshot,
  importAppData,
  meetings,
  souvenirs,
  expenditureState,
}) {
  const [user, setUser] = useState(null);
  const [syncStatus, setSyncStatus] = useState('idle');
  const [syncMessage, setSyncMessage] = useState('');
  const [lastSyncedAt, setLastSyncedAt] = useState(null);
  const skipNextPush = useRef(false);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (!supabaseConfigured || !supabase) return undefined;

    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const pullFromCloud = useCallback(async () => {
    if (!supabaseConfigured || !supabase || !user) return { ok: false, error: 'Login required' };

    setSyncStatus('pulling');
    setSyncMessage('Cloud se data la rahe hain…');

    const { data, error } = await supabase
      .from(CLOUD_TABLE)
      .select('payload, updated_at')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      setSyncStatus('error');
      setSyncMessage(error.message);
      return { ok: false, error: error.message };
    }

    if (!data?.payload) {
      setSyncStatus('idle');
      setSyncMessage('Cloud par abhi koi data nahi — pehli save yahan se hogi');
      return { ok: true, empty: true };
    }

    const validated = validateBackup(data.payload);
    if (!validated.ok) {
      setSyncStatus('error');
      setSyncMessage(validated.error);
      return { ok: false, error: validated.error };
    }

    skipNextPush.current = true;
    importAppData(validated.data);
    setLastSyncedAt(data.updated_at ?? new Date().toISOString());
    setSyncStatus('idle');
    setSyncMessage('Cloud se data load ho gaya');
    return { ok: true };
  }, [user, importAppData]);

  const pushToCloud = useCallback(async () => {
    if (!supabaseConfigured || !supabase || !user) return { ok: false, error: 'Login required' };

    setSyncStatus('pushing');
    setSyncMessage('Cloud par save ho raha hai…');

    const snapshot = getAppSnapshot();
    const { error } = await supabase.from(CLOUD_TABLE).upsert(
      {
        user_id: user.id,
        payload: snapshot,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    );

    if (error) {
      setSyncStatus('error');
      setSyncMessage(error.message);
      return { ok: false, error: error.message };
    }

    setLastSyncedAt(new Date().toISOString());
    setSyncStatus('idle');
    setSyncMessage('Cloud par save ho gaya');
    return { ok: true };
  }, [user, getAppSnapshot]);

  const signInWithGoogle = useCallback(async () => {
    if (!supabaseConfigured || !supabase) {
      return { ok: false, error: 'Supabase configure nahi hai' };
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  }, []);

  const signInWithEmail = useCallback(async (email) => {
    if (!supabaseConfigured || !supabase) {
      return { ok: false, error: 'Supabase configure nahi hai' };
    }
    const trimmed = email?.trim();
    if (!trimmed) return { ok: false, error: 'Email likhein' };

    const { error } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true, message: 'Email par magic link bhej diya — link se login karein' };
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setSyncMessage('');
    setLastSyncedAt(null);
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    pullFromCloud();
    // Initial pull when user signs in
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    if (!user) return undefined;

    if (skipNextPush.current) {
      skipNextPush.current = false;
      return undefined;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      pushToCloud();
    }, SYNC_DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [user, meetings, souvenirs, expenditureState, pushToCloud]);

  return {
    supabaseConfigured,
    user,
    syncStatus,
    syncMessage,
    lastSyncedAt,
    signInWithGoogle,
    signInWithEmail,
    signOut,
    pullFromCloud,
    pushToCloud,
  };
}
