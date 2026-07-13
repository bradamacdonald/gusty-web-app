import {
  ASPECT_OFFSET_M,
  buildElevationSamplePoints,
  computeSlopeAspect,
} from '../../lib/terrain-aspect.js';

const ELEVATION_BASE = 'https://api.open-meteo.com/v1/elevation';

/**
 * Fetch elevations (m) for many lat/lng points via Open-Meteo.
 */
export async function fetchElevations(points, { signal } = {}) {
  if (!points?.length) return [];
  const lats = points.map((p) => p.lat).join(',');
  const lngs = points.map((p) => p.lng).join(',');
  const url = `${ELEVATION_BASE}?latitude=${encodeURIComponent(lats)}&longitude=${encodeURIComponent(lngs)}`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Elevation API ${res.status}`);
  const data = await res.json();
  return Array.isArray(data.elevation) ? data.elevation : [];
}

/**
 * DEM-derived slope/aspect at a point (Open-Meteo elevation / SRTM-class DEM).
 */
export async function fetchTerrainAspect(lat, lng, { signal, offsetM = ASPECT_OFFSET_M } = {}) {
  if (lat == null || lng == null || Number.isNaN(lat) || Number.isNaN(lng)) {
    return null;
  }
  const points = buildElevationSamplePoints(lat, lng, offsetM);
  const elevations = await fetchElevations(points, { signal });
  return computeSlopeAspect(elevations, offsetM);
}

/** Single-point elevation from the same DEM source. */
export async function fetchPointElevation(lat, lng, { signal } = {}) {
  const [elev] = await fetchElevations([{ lat, lng }], { signal });
  return elev != null && !Number.isNaN(elev) ? elev : null;
}
