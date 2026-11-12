import { supabase } from '../lib/supabase';

export const LOGIN_REQUIRED = 'Please log in to use this feature.';

export async function authorizedJsonHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  if (!supabase) return { headers, token: '' };
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token || '';
  if (token) headers.Authorization = `Bearer ${token}`;
  return { headers, token };
}

export function errorIfUnauthenticated(res, data) {
  if (res.status === 401 || res.status === 403) {
    const err = new Error(data?.error || LOGIN_REQUIRED);
    err.code = res.status === 403 ? 'FORBIDDEN' : 'LOGIN_REQUIRED';
    return err;
  }
  return null;
}
