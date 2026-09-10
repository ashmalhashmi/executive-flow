import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL || '';
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const cloudTable = 'user_app_data';

const logEl = document.getElementById('log');
const btnCache = document.getElementById('btn-cache');
const btnSend = document.getElementById('btn-send');
const btnVerify = document.getElementById('btn-verify');
const btnLoad = document.getElementById('btn-load');
const btnOpen = document.getElementById('btn-open');
const emailEl = document.getElementById('email');
const otpEl = document.getElementById('otp');

let supabase = null;
let sessionUser = null;

function log(msg, cls) {
  logEl.textContent = msg;
  logEl.className = cls || '';
}

function validateBackup(raw) {
  if (!raw || raw.app !== 'executive-flow' || !raw.data) {
    return { ok: false, error: 'Cloud backup format invalid hai' };
  }
  const d = raw.data;
  return {
    ok: true,
    data: {
      meetings: d.meetings ?? [],
      souvenirs: d.souvenirs ?? [],
      expenditure: d.expenditure ?? { openingBalance: 0, openingBalanceDate: '', expenditures: [] },
      orders: d.orders ?? [],
      dak: d.dak ?? [],
      tasks: d.tasks ?? [],
      captures: d.captures ?? [],
      contacts: d.contacts ?? [],
      pettyCash: d.pettyCash ?? { cases: [], refreshmentNotes: [] },
      fileLabels: d.fileLabels ?? [],
      settings: d.settings ?? {},
    },
  };
}

function writeSnapshot(data) {
  localStorage.setItem('executive_flow_meetings', JSON.stringify(data.meetings ?? []));
  localStorage.setItem('executive_flow_souvenirs', JSON.stringify(data.souvenirs ?? []));
  localStorage.setItem('executive_flow_expenditure', JSON.stringify(data.expenditure ?? {}));
  localStorage.setItem('executive_flow_orders', JSON.stringify(data.orders ?? []));
  localStorage.setItem('executive_flow_dak', JSON.stringify(data.dak ?? []));
  localStorage.setItem('executive_flow_tasks', JSON.stringify(data.tasks ?? []));
  localStorage.setItem('executive_flow_captures', JSON.stringify(data.captures ?? []));
  localStorage.setItem('executive_flow_contacts', JSON.stringify(data.contacts ?? []));
  localStorage.setItem(
    'executive_flow_petty_cash',
    JSON.stringify(data.pettyCash ?? { cases: [], refreshmentNotes: [] }),
  );
  localStorage.setItem('executive_flow_file_labels', JSON.stringify(data.fileLabels ?? []));
  const s = data.settings || {};
  if (s.dakClearedAt) {
    localStorage.setItem('executive_flow_dak_cleared_at', JSON.stringify(s.dakClearedAt));
  }
  if (s.morningMeetingBoard) {
    localStorage.setItem('executive_flow_morning_board', JSON.stringify(s.morningMeetingBoard));
  }
  if (s.weeklyExpenditureEmail) {
    localStorage.setItem('executive_flow_weekly_expenditure_email', JSON.stringify(s.weeklyExpenditureEmail));
  }
  if (s.pettyCashSignatures) {
    localStorage.setItem('executive_flow_petty_cash_signatures', JSON.stringify(s.pettyCashSignatures));
  }
}

function summarize(data) {
  return `${(data.meetings ?? []).length} meetings · ${(data.orders ?? []).length} orders · ${(data.dak ?? []).length} dak · ${(data.contacts ?? []).length} contacts · ${(data.fileLabels ?? []).length} labels · ${(data.expenditure?.expenditures ?? []).length} expenses`;
}

async function clearAppCacheOnly() {
  if ('serviceWorker' in navigator) {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.map((r) => r.unregister()));
  }
  if ('caches' in window) {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
  }
}

btnCache.addEventListener('click', async () => {
  btnCache.disabled = true;
  try {
    await clearAppCacheOnly();
    log('Cache saaf ho gaya (local data safe). Ab login karein.', 'ok');
  } catch (e) {
    log(String(e.message || e), 'err');
  } finally {
    btnCache.disabled = false;
  }
});

btnSend.addEventListener('click', async () => {
  const email = emailEl.value.trim().toLowerCase();
  if (!email) return log('Email likhein', 'warn');
  btnSend.disabled = true;
  try {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/restore.html`,
        shouldCreateUser: true,
      },
    });
    if (error) throw error;
    log('Code email par bhej diya — Spam folder bhi check karein.', 'ok');
  } catch (e) {
    log(String(e.message || e), 'err');
  } finally {
    btnSend.disabled = false;
  }
});

btnVerify.addEventListener('click', async () => {
  const email = emailEl.value.trim().toLowerCase();
  const token = otpEl.value.replace(/\s/g, '');
  if (!email || !/^\d{6,8}$/.test(token)) {
    return log('Email + 6–8 digit code likhein', 'warn');
  }
  btnVerify.disabled = true;
  try {
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'email',
    });
    if (error) throw error;
    sessionUser = data.session?.user ?? null;
    btnLoad.disabled = false;
    log(`Login OK: ${sessionUser?.email || email}. Ab "Load my data" dabao.`, 'ok');
  } catch (e) {
    log(String(e.message || e), 'err');
  } finally {
    btnVerify.disabled = false;
  }
});

btnLoad.addEventListener('click', async () => {
  if (!sessionUser) return log('Pehle login karein', 'warn');
  btnLoad.disabled = true;
  try {
    const { data, error } = await supabase
      .from(cloudTable)
      .select('payload, updated_at')
      .eq('user_id', sessionUser.id)
      .maybeSingle();
    if (error) throw error;
    if (!data?.payload) {
      log('Cloud par abhi koi backup nahi — kya pehle Sync login tha?', 'warn');
      return;
    }
    const validated = validateBackup(data.payload);
    if (!validated.ok) throw new Error(validated.error);
    writeSnapshot(validated.data);
    const when = data.updated_at ? new Date(data.updated_at).toLocaleString() : '';
    log(
      `Data restore ho gaya! ${summarize(validated.data)}${when ? `\nCloud time: ${when}` : ''}\nAb "Open Executive Flow" dabao.`,
      'ok',
    );
  } catch (e) {
    log(String(e.message || e), 'err');
  } finally {
    btnLoad.disabled = false;
  }
});

btnOpen.addEventListener('click', async () => {
  btnOpen.disabled = true;
  log('Cache saaf karke app khol rahe hain…', 'ok');
  try {
    await clearAppCacheOnly();
    window.location.replace('./?ef_refresh=' + Date.now());
  } catch (e) {
    log(String(e.message || e), 'err');
    btnOpen.disabled = false;
  }
});

(async () => {
  try {
    await clearAppCacheOnly();
    if (!url || !anonKey) {
      log('Cloud sync configure nahi hai — developer se contact karein.', 'err');
      return;
    }
    supabase = createClient(url, anonKey, {
      auth: { persistSession: true, detectSessionInUrl: true, flowType: 'pkce' },
    });
    const { data } = await supabase.auth.getSession();
    if (data.session?.user) {
      sessionUser = data.session.user;
      emailEl.value = sessionUser.email || '';
      btnLoad.disabled = false;
      log(`Logged in: ${sessionUser.email}. "Load my data" dabao.`, 'ok');
    } else {
      log('Ready — cache fix ho chuka. Email se login karein.', 'ok');
    }
  } catch (e) {
    log('Setup error: ' + (e.message || e), 'err');
  }
})();
