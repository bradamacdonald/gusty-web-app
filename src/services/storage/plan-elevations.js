import { STORAGE_KEYS } from '../../lib/constants.js';
import { spotKey } from '../../lib/coordinates.js';

function readAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.planElevs);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeAll(map) {
  try {
    localStorage.setItem(STORAGE_KEYS.planElevs, JSON.stringify(map));
  } catch {
    // ignore
  }
}

export function getPlanElevations(lat, lng) {
  const all = readAll();
  const entry = all[spotKey(lat, lng)];
  if (!entry) return null;
  const th = entry.th != null ? parseInt(entry.th, 10) : NaN;
  const obj = entry.obj != null ? parseInt(entry.obj, 10) : NaN;
  if (!Number.isFinite(th) || !Number.isFinite(obj)) return null;
  return { th, obj };
}

export function setPlanElevations(lat, lng, th, obj) {
  if (!Number.isFinite(th) || !Number.isFinite(obj)) return;
  const all = readAll();
  all[spotKey(lat, lng)] = {
    th: Math.round(th),
    obj: Math.round(obj),
  };
  writeAll(all);
}
