import { fetchPointElevation } from './api/terrain.js';

/** Max difference (m) before a URL/hint elev is treated as stale vs DEM. */
export const ELEVATION_HINT_TOLERANCE_M = 250;

/**
 * Prefer DEM at the pin. Keep a hint only when it agrees with DEM
 * (e.g. curated trailhead elev that matches the sample). Never invent a default.
 */
export function chooseElevation(demMetres, hintMetres = null, toleranceM = ELEVATION_HINT_TOLERANCE_M) {
  const dem = demMetres != null && !Number.isNaN(Number(demMetres)) ? Number(demMetres) : null;
  const hint = hintMetres != null && !Number.isNaN(Number(hintMetres)) ? Number(hintMetres) : null;

  if (dem == null) {
    return hint != null ? Math.round(hint) : null;
  }
  if (hint != null && Math.abs(hint - dem) <= toleranceM) {
    return Math.round(hint);
  }
  return Math.round(dem);
}

/** Parse display strings like "1,580 m" or "12 m". Returns null if unknown. */
export function parseElevationMetres(elevStr) {
  if (elevStr == null || elevStr === '' || elevStr === '—') return null;
  if (typeof elevStr === 'number' && Number.isFinite(elevStr)) return Math.round(elevStr);
  const m = String(elevStr).match(/(-?[\d,]+)\s*m?/i);
  if (!m) return null;
  const n = parseInt(m[1].replace(/,/g, ''), 10);
  return Number.isFinite(n) ? n : null;
}

/**
 * DEM elevation for a specific lat/lng. Optional hint is validated against DEM.
 */
export async function resolveSpotElevation(lat, lng, { hint = null, signal } = {}) {
  if (lat == null || lng == null || Number.isNaN(lat) || Number.isNaN(lng)) {
    return Number.isFinite(hint) ? Math.round(hint) : null;
  }
  let dem = null;
  try {
    dem = await fetchPointElevation(lat, lng, { signal });
  } catch {
    dem = null;
  }
  return chooseElevation(dem, hint);
}

/**
 * Build forecast URL. Elevation is included only when known for this pin.
 */
export function buildSpotForecastUrl({ lat, lng, name = 'Location', elevation = null } = {}) {
  const params = new URLSearchParams({
    lat: String(lat),
    lng: String(lng),
    name: name || 'Location',
  });
  if (elevation != null && Number.isFinite(Number(elevation))) {
    params.set('elevation', String(Math.round(Number(elevation))));
  }
  return `forecast.html?${params.toString()}`;
}
