import { STORAGE_KEYS } from '../../lib/constants.js';
import { formatCoordinates, isCoordinateLike, spotKey } from '../../lib/coordinates.js';
import {
  convertWindForDisplay,
  getConditionDisplayLabel,
  getWindUnit,
} from './settings.js';
import { windClassFromSpeed } from '../../lib/wind.js';

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
  const name = spot.name || 'Location';
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
  }
  const h = Math.abs(hash);
  const condition = spot.condition || (h % 3 === 0 ? 'go' : h % 3 === 1 ? 'caution' : 'no-go');
  const windSpeed = spot.windSpeed != null ? spot.windSpeed : 18 + (h % 45);
  const conditionLabel = getConditionDisplayLabel(windSpeed);
  const windDir = spot.windDirection || ['N', 'NE', 'E', 'SE', 'S', 'SW', 'WSW', 'W', 'NW'][h % 9];

  return {
    condition,
    conditionLabel,
    windDir,
    windSpeed,
    windDisp: convertWindForDisplay(windSpeed),
    windUnit: getWindUnit(),
    windClass: windClassFromSpeed(windSpeed),
  };
}
