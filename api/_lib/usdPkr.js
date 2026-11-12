const FALLBACK_USD_PKR = 278;
const LIVE_TTL_MS = 60 * 60 * 1000;

let liveCache = null;

export function usdToPkr(usd, rate) {
  if (usd == null || usd === '') return null;
  const amount = Number(usd);
  const fx = Number(rate);
  if (!Number.isFinite(amount) || !Number.isFinite(fx) || fx <= 0) return null;
  return Math.round(amount * fx * 1e6) / 1e6;
}

export function resolveUsdPkrRate({ envRate, liveRate, fallback = FALLBACK_USD_PKR } = {}) {
  const env = Number(envRate);
  if (Number.isFinite(env) && env > 0) {
    return { rate: env, source: 'env' };
  }
  const live = Number(liveRate);
  if (Number.isFinite(live) && live > 50 && live < 1000) {
    return { rate: live, source: 'live' };
  }
  const fb = Number(fallback);
  return {
    rate: Number.isFinite(fb) && fb > 0 ? fb : FALLBACK_USD_PKR,
    source: 'fallback',
  };
}

async function fetchLiveUsdPkrRate() {
  const now = Date.now();
  if (liveCache && now - liveCache.at < LIVE_TTL_MS) return liveCache.value;

  const res = await fetch('https://open.er-api.com/v6/latest/USD', {
    signal: AbortSignal.timeout(4000),
  });
  const data = await res.json().catch(() => null);
  const resolved = resolveUsdPkrRate({ liveRate: data?.rates?.PKR });
  if (!res.ok || resolved.source !== 'live') {
    throw new Error('live FX unavailable');
  }
  const value = {
    rate: resolved.rate,
    source: 'live',
    asOf: data?.time_last_update_utc || null,
  };
  liveCache = { at: now, value };
  return value;
}

export async function getUsdPkrRate() {
  const envResolved = resolveUsdPkrRate({ envRate: process.env.USD_PKR_RATE });
  if (envResolved.source === 'env') {
    return { ...envResolved, asOf: null };
  }
  try {
    return await fetchLiveUsdPkrRate();
  } catch {
    return { ...resolveUsdPkrRate({}), asOf: null };
  }
}
