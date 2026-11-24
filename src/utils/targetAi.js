import { authorizedJsonHeaders, errorIfUnauthenticated, LOGIN_REQUIRED } from './apiAuth';

export async function suggestTargetPractice({ title, deadline }) {
  const target = String(title || '').trim();
  const day = String(deadline || '').trim();
  if (!target) throw new Error('Target likhein');
  if (!day) throw new Error('Deadline specify karein');

  const { headers, token } = await authorizedJsonHeaders();
  if (!token) throw Object.assign(new Error(LOGIN_REQUIRED), { code: 'LOGIN_REQUIRED' });

  let res;
  let rawText = '';
  try {
    res = await fetch('/api/extract-petty-invoice', {
      method: 'POST',
      headers,
      body: JSON.stringify({ purpose: 'target-suggest', title: target, deadline: day }),
    });
    rawText = await res.text();
  } catch {
    throw new Error('Network error — internet check karke dubara try karein');
  }

  let data = {};
  try {
    data = rawText ? JSON.parse(rawText) : {};
  } catch {
    throw new Error(`Server error (${res.status})`);
  }
  if (!res.ok) {
    const authError = errorIfUnauthenticated(res, data);
    if (authError) throw authError;
    throw new Error(data.error || 'AI ne identity nahi likhi');
  }
  const identity = String(data.identity || '').trim();
  const actions = Array.isArray(data.actions)
    ? data.actions.map((item) => String(item || '').trim()).filter(Boolean).slice(0, 3)
    : [];
  if (!identity || actions.length < 3) {
    throw new Error('AI ne identity aur 3 actions nahi likhein — dubara try karein');
  }
  return { identity, actions };
}
