/**
 * Per-user and per-IP request limits.
 * In-memory counts reset when a serverless isolate shuts down and are not shared
 * across instances. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN
 * (Upstash Redis or any Redis REST clone of that API) for a shared counter.
 */

const memory = new Map();

function limitConfig() {
  const max = Number(process.env.RATE_LIMIT_MAX || 30);
  const windowMs = Number(process.env.RATE_LIMIT_WINDOW_MS || 10 * 60 * 1000);
  return {
    max: Number.isFinite(max) && max > 0 ? max : 30,
    windowMs: Number.isFinite(windowMs) && windowMs > 0 ? windowMs : 10 * 60 * 1000,
  };
}

export function consumeMemoryLimit(store, key, { max, windowMs, now = Date.now() }) {
  const row = store.get(key);
  if (!row || now - row.start >= windowMs) {
    store.set(key, { start: now, count: 1 });
    return { ok: true };
  }
  if (row.count >= max) {
    return {
      ok: false,
      retryAfter: Math.max(1, Math.ceil((windowMs - (now - row.start)) / 1000)),
    };
  }
  row.count += 1;
  return { ok: true };
}

function clientIp(req) {
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return forwarded || String(req.headers['x-real-ip'] || 'unknown');
}

async function consumeUpstash(key, max, windowMs) {
  const base = String(process.env.UPSTASH_REDIS_REST_URL || '').replace(/\/$/, '');
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!base || !token) return null;

  const res = await fetch(`${base}/pipeline`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify([
      ['INCR', key],
      ['PEXPIRE', key, String(windowMs), 'NX'],
    ]),
  });
  if (!res.ok) return null;

  const data = await res.json().catch(() => null);
  const first = Array.isArray(data) ? data[0] : data?.result?.[0];
  const count = Number(first?.result ?? first);
  if (!Number.isFinite(count)) return null;
  if (count > max) {
    return { ok: false, retryAfter: Math.max(1, Math.ceil(windowMs / 1000)) };
  }
  return { ok: true };
}

async function consume(key, max, windowMs) {
  try {
    const shared = await consumeUpstash(key, max, windowMs);
    if (shared) return shared;
  } catch {
    /* fall through to this isolate's memory */
  }
  return consumeMemoryLimit(memory, key, { max, windowMs });
}

export async function enforceRateLimit(req, { userId, bucket = 'api' }) {
  const { max, windowMs } = limitConfig();
  const ipMax = max * 2;
  const userResult = await consume(`${bucket}:user:${userId}`, max, windowMs);
  if (!userResult.ok) {
    return { ok: false, error: 'Too many requests. Try again shortly.', retryAfter: userResult.retryAfter };
  }
  const ipResult = await consume(`${bucket}:ip:${clientIp(req)}`, ipMax, windowMs);
  if (!ipResult.ok) {
    return { ok: false, error: 'Too many requests. Try again shortly.', retryAfter: ipResult.retryAfter };
  }
  return { ok: true };
}
