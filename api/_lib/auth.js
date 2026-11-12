import { AsyncLocalStorage } from 'node:async_hooks';
import { createClient } from '@supabase/supabase-js';

/**
 * Server-side session check. The service role key never leaves this process.
 * ALLOWED_EMAILS is a comma-separated list of accounts that may call the API.
 */

let adminClient;
const requestAuth = new AsyncLocalStorage();

export function getRequestAccessToken() {
  return requestAuth.getStore()?.token || '';
}

export function parseAllowedEmails(raw = process.env.ALLOWED_EMAILS) {
  return String(raw || '')
    .split(/[,;\s]+/)
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function readBearer(req) {
  const header = String(req.headers?.authorization || req.headers?.Authorization || '');
  if (!header.startsWith('Bearer ')) return '';
  return header.slice(7).trim();
}

export function evaluateAccess({ user, error, allowedEmails }) {
  if (error || !user?.id) {
    return { ok: false, status: 401, error: 'Please log in.' };
  }
  const email = String(user.email || '').trim().toLowerCase();
  const allow = Array.isArray(allowedEmails) ? allowedEmails : [];
  if (!allow.length) {
    return { ok: true, status: 200, user, userId: user.id, email };
  }
  if (!email || !allow.includes(email)) {
    return { ok: false, status: 403, error: 'This account is not allowed.' };
  }
  return { ok: true, status: 200, user, userId: user.id, email };
}

export function getAdminClient() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  // Service role is preferred. The public key already set for the app can still
  // verify a user access token via auth.getUser.
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  if (!adminClient) {
    adminClient = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return adminClient;
}

export function getUsageClient() {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) return getAdminClient();
  const token = getRequestAccessToken();
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const anon = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !anon || !token) return getAdminClient();
  return createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function requireUser(req) {
  const token = readBearer(req);
  requestAuth.enterWith({ token });
  if (!token) {
    return { ok: false, status: 401, error: 'Please log in.' };
  }

  const supabase = getAdminClient();
  if (!supabase) {
    return { ok: false, status: 503, error: 'Server auth is not configured.' };
  }

  const { data, error } = await supabase.auth.getUser(token);
  return evaluateAccess({
    user: data?.user,
    error,
    allowedEmails: parseAllowedEmails(),
  });
}
