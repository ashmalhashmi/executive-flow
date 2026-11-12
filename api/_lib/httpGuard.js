import { requireUser } from './auth.js';
import { enforceRateLimit } from './rateLimit.js';

export function jsonByteLength(value) {
  return Buffer.byteLength(JSON.stringify(value ?? {}), 'utf8');
}

export function readJsonBody(req, maxBytes) {
  const headerLen = Number(req.headers['content-length'] || 0);
  if (Number.isFinite(headerLen) && headerLen > maxBytes) {
    return { ok: false, status: 413, error: 'Request too large' };
  }

  let body = req.body;
  if (typeof body === 'string') {
    if (Buffer.byteLength(body, 'utf8') > maxBytes) {
      return { ok: false, status: 413, error: 'Request too large' };
    }
    try {
      body = body ? JSON.parse(body) : {};
    } catch {
      return { ok: false, status: 400, error: 'Invalid JSON' };
    }
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    body = {};
  }

  if (jsonByteLength(body) > maxBytes) {
    return { ok: false, status: 413, error: 'Request too large' };
  }

  return { ok: true, body };
}

/** POST + verified user + allow-list + rate limit + body size. */
export async function guardPost(req, res, { maxBytes = 1_000_000, bucket = 'api' } = {}) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return null;
  }

  const auth = await requireUser(req);
  if (!auth.ok) {
    res.status(auth.status).json({
      error: auth.error,
      code: auth.status === 403 ? 'FORBIDDEN' : 'LOGIN_REQUIRED',
    });
    return null;
  }

  const limited = await enforceRateLimit(req, { userId: auth.userId, bucket });
  if (!limited.ok) {
    res.setHeader('Retry-After', String(limited.retryAfter || 60));
    res.status(429).json({ error: limited.error });
    return null;
  }

  const parsed = readJsonBody(req, maxBytes);
  if (!parsed.ok) {
    res.status(parsed.status).json({ error: parsed.error });
    return null;
  }

  return {
    user: auth.user,
    userId: auth.userId,
    email: auth.email,
    body: parsed.body,
  };
}
