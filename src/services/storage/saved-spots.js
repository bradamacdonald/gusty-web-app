import { STORAGE_KEYS } from '../../lib/constants.js';
import { formatCoordinates, isCoordinateLike, spotKey } from '../../lib/coordinates.js';
import {
  convertWindForDisplay,
  getConditionDisplayLabel,
  getWindUnit,
} from './settings.js';
import { windClassFromSpeed } from '../../lib/wind.js';

/** Map sustained wind (km/h) to saved-card badge tier. */
export function conditionKeyFromSpeed(kmh) {
  if (kmh == null || Number.isNaN(Number(kmh))) return 'unknown';
  const v = Number(kmh);
  if (v < 30) return 'go';
  if (v <= 60) return 'caution';
  return 'no-go';
}

export function getSavedSpots() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.savedSpots);
    const spots = raw ? JSON.parse(raw) : [];
    let changed = false;
    spots.forEach((s) => {
      if (s.name && isCoordinateLike(s.name)) {
        s.name = 'Location';
        changed = true;
      }
    });
    if (changed) setSavedSpots(spots);
    return spots;
  } catch {
    return [];
  }
}

export function setSavedSpots(arr) {
  localStorage.setItem(STORAGE_KEYS.savedSpots, JSON.stringify(arr));
}

export function isSpotSaved(lat, lng) {
  const key = spotKey(lat, lng);
  return getSavedSpots().some((s) => spotKey(s.lat, s.lng) === key);
}

/**
 * Persist current-hour wind onto a saved spot (no-op if not saved).
 * Speeds are always stored as km/h; display converts via settings.
 */
export function updateSavedSpotWind(lat, lng, {
  windSpeed,
  windDirection = null,
  elevation = null,
  capturedAt = Date.now(),
} = {}) {
  if (windSpeed == null || Number.isNaN(Number(windSpeed))) return false;
  const spots = getSavedSpots();
  const key = spotKey(lat, lng);
  const idx = spots.findIndex((s) => spotKey(s.lat, s.lng) === key);
  if (idx < 0) return false;

  const speed = Math.round(Number(windSpeed));
  const next = { ...spots[idx] };
  next.windSpeed = speed;
  next.condition = conditionKeyFromSpeed(speed);
  next.windCapturedAt = capturedAt;
  if (windDirection) next.windDirection = windDirection;
  if (elevation != null && !Number.isNaN(Number(elevation))) {
    next.elevation = Math.round(Number(elevation));
  }
  spots[idx] = next;
  setSavedSpots(spots);
  return true;
}

export function toggleSavedSpot({ lat, lng, name, elevation = null }) {
  const spots = getSavedSpots();
  const key = spotKey(lat, lng);
  const idx = spots.findIndex((s) => spotKey(s.lat, s.lng) === key);
  const nameToSave = isCoordinateLike(name) ? formatCoordinates(lat, lng) : name;

  if (idx >= 0) {
    spots.splice(idx, 1);
  } else {
    spots.push({
      name: nameToSave,
      lat,
      lng,
      elevation: elevation != null && !isNaN(elevation) ? Math.round(elevation) : null,
    });
  }
  setSavedSpots(spots);
  return idx < 0;
}

export function buildForecastUrl(spot) {
  const p = new URLSearchParams({
    lat: spot.lat,
    lng: spot.lng,
    name: spot.name || 'Location',
  });
  if (spot.elevation != null && !isNaN(spot.elevation)) {
    p.set('elevation', spot.elevation);
  }
  return `forecast.html?${p.toString()}`;
}

export function getSpotDisplayData(spot) {
  const hasWind = spot.windSpeed != null && !Number.isNaN(Number(spot.windSpeed));
  if (!hasWind) {
    return {
      condition: 'unknown',
      conditionLabel: 'Open to load',
      windDir: '—',
      windSpeed: null,
      windDisp: '—',
      windUnit: getWindUnit(),
      windClass: '',
      hasLive: false,
    };
  }

  const windSpeed = Number(spot.windSpeed);
  const condition = spot.condition || conditionKeyFromSpeed(windSpeed);
  return {
    condition,
    conditionLabel: getConditionDisplayLabel(windSpeed),
    windDir: spot.windDirection || '—',
    windSpeed,
    windDisp: convertWindForDisplay(windSpeed),
    windUnit: getWindUnit(),
    windClass: windClassFromSpeed(windSpeed),
    hasLive: true,
    windCapturedAt: spot.windCapturedAt || null,
  };
}
