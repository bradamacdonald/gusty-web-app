import { MODEL_API_BY_NAME } from './constants.js';

/** Model run schedules (UTC): GFS 00/06/12/18, ECMWF/GEM 00/12, HRRR hourly */
export function getModelRunTimeAgo(model) {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const d = now.getUTCDate();
  const h = now.getUTCHours();

  let lastRun;
  if (model === 'gfs') {
    const gfsHours = [0, 6, 12, 18];
    const prev = gfsHours.filter((x) => x <= h).pop();
    lastRun =
      prev !== undefined
        ? new Date(Date.UTC(y, m, d, prev, 0, 0))
        : new Date(Date.UTC(y, m, d - 1, 18, 0, 0));
  } else if (model === 'ecmwf' || model === 'gem') {
    lastRun = h >= 12 ? new Date(Date.UTC(y, m, d, 12, 0, 0)) : new Date(Date.UTC(y, m, d, 0, 0, 0));
  } else if (model === 'hrrr') {
    lastRun = new Date(Date.UTC(y, m, d, h, 0, 0));
  } else {
    return '';
  }

  const diffMs = now - lastRun;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  if (diffMin < 1) return 'Updated just now';
  if (diffHr < 1) return `Updated ${diffMin}m ago`;
  return `Updated ${diffHr}h ago`;
}

export function modelKeyToApi(key) {
  const map = { ecmwf: 'ECMWF', gfs: 'GFS', gem: 'GEM', hrrr: 'HRRR' };
  return MODEL_API_BY_NAME[map[key]] || key;
}

export function modelKeyToName(key) {
  const map = { gfs: 'GFS', ecmwf: 'ECMWF', gem: 'GEM', hrrr: 'HRRR' };
  return map[key] || '';
}
