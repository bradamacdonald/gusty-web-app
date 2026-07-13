import { getCurrentHourIndex } from '../lib/datetime.js';
import { degreesToCompass } from '../lib/wind.js';
import { fetchModelWind } from './api/open-meteo.js';
import {
  convertWindForDisplay,
  getConditionDisplayLabel,
  getWindUnit,
} from './storage/settings.js';

const MAX_COMPARE_ALTERNATES = 2;

/**
 * Snapshot current-hour wind for a spot (elevation-aware when provided).
 */
export async function fetchSpotWindSnapshot(
  { lat, lng, elevation = null, name = 'Location', id = null },
  { model = 'gem_hrdps_continental', signal } = {}
) {
  const attempts = [model, 'ecmwf_ifs025'];
  let data = null;
  let usedModel = model;

  for (const api of attempts) {
    try {
      data = await fetchModelWind(lat, lng, api, 2, elevation);
      usedModel = api;
      if (data?.hourly?.windspeed_10m?.length) break;
    } catch {
      data = null;
    }
  }

  if (!data?.hourly?.windspeed_10m?.length) {
    return {
      id,
      name,
      lat,
      lng,
      elevation,
      speed: null,
      gust: null,
      dir: null,
      dirLabel: '—',
      windDisp: '—',
      windUnit: getWindUnit(),
      conditionLabel: '—',
      model: usedModel,
      error: true,
    };
  }

  const idx = Math.min(
    getCurrentHourIndex(data.hourly),
    data.hourly.windspeed_10m.length - 1
  );
  const speed = data.hourly.windspeed_10m[idx];
  const gust = data.hourly.windgusts_10m?.[idx] ?? null;
  const dir = data.hourly.winddirection_10m?.[idx] ?? null;

  return {
    id,
    name,
    lat,
    lng,
    elevation,
    speed,
    gust,
    dir,
    dirLabel: dir != null ? degreesToCompass(dir) : '—',
    windDisp: convertWindForDisplay(speed),
    windUnit: getWindUnit(),
    conditionLabel: getConditionDisplayLabel(speed),
    model: usedModel,
    error: false,
  };
}

export function pickCompareCandidates(savedSpots, currentLat, currentLng, { limit = 8 } = {}) {
  if (!Array.isArray(savedSpots) || !savedSpots.length) return [];
  return savedSpots
    .filter((s) => {
      if (s.lat == null || s.lng == null) return false;
      return (
        Math.abs(s.lat - currentLat) > 0.0008 || Math.abs(s.lng - currentLng) > 0.0008
      );
    })
    .slice(0, limit);
}

export function rankSnapshotsByCalm(snapshots) {
  return [...snapshots].sort((a, b) => {
    const aSpeed = a.speed == null ? Number.POSITIVE_INFINITY : a.speed;
    const bSpeed = b.speed == null ? Number.POSITIVE_INFINITY : b.speed;
    return aSpeed - bSpeed;
  });
}

export { MAX_COMPARE_ALTERNATES };
