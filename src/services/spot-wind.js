import { getCurrentHourIndex } from '../lib/datetime.js';
import { degreesToCompass } from '../lib/wind.js';
import { fetchModelWind } from './api/open-meteo.js';
import {
  convertWindForDisplay,
  getConditionDisplayLabel,
  getWindUnit,
} from './storage/settings.js';

/**
 * Snapshot current-hour wind for a spot (elevation-aware when provided).
 * Used by Saved list refresh; Compare Spots UI is paused.
 */
export async function fetchSpotWindSnapshot(
  { lat, lng, elevation = null, name = 'Location', id = null },
  { model = 'gem_hrdps_continental' } = {}
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
