import { spotKey } from '../../lib/coordinates.js';

const CACHE_PREFIX = 'gusty_forecast_cache:';
const DEFAULT_TTL_MS = 20 * 60 * 1000; // 20 minutes

function cacheKey(lat, lng, elevHint) {
  const elevPart = elevHint != null && !Number.isNaN(elevHint) ? String(Math.round(elevHint)) : 'auto';
  return `${CACHE_PREFIX}${spotKey(lat, lng)}:${elevPart}`;
}

export function readForecastCache(lat, lng, elevHint = null, { ttlMs = DEFAULT_TTL_MS, now = Date.now() } = {}) {
  try {
    const raw = sessionStorage.getItem(cacheKey(lat, lng, elevHint));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.savedAt || !parsed?.main) return null;
    if (now - parsed.savedAt > ttlMs) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeForecastCache(lat, lng, elevHint, payload) {
  try {
    const entry = {
      savedAt: Date.now(),
      elevHint: elevHint != null && !Number.isNaN(elevHint) ? Math.round(elevHint) : null,
      main: payload.main,
      gfs: payload.gfs ?? null,
      gem: payload.gem ?? null,
      hrdps: payload.hrdps ?? null,
      avy: payload.avy ?? null,
    };
    sessionStorage.setItem(cacheKey(lat, lng, elevHint), JSON.stringify(entry));
    return true;
  } catch {
    // Quota / private mode — ignore
    return false;
  }
}

export function clearForecastCache(lat, lng, elevHint = null) {
  try {
    sessionStorage.removeItem(cacheKey(lat, lng, elevHint));
  } catch {
    // ignore
  }
}

export { DEFAULT_TTL_MS as FORECAST_CACHE_TTL_MS };
