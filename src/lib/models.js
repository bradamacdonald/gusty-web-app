import { MODEL_API_BY_NAME } from './constants.js';

/**
 * Approximate NWP cycle + dissemination lag (UTC hours after cycle before
 * fields typically appear on Open-Meteo). Open-Meteo does not expose model
 * run timestamps in the forecast payload, so this remains an estimate.
 *
 * Schedule: GFS/HRDPS 00/06/12/18, ECMWF/GEM 00/12, HRRR hourly.
 */
const MODEL_CYCLES = {
  gfs: { hours: [0, 6, 12, 18], lagHours: 4 },
  hrdps: { hours: [0, 6, 12, 18], lagHours: 3 },
  ecmwf: { hours: [0, 12], lagHours: 7 },
  gem: { hours: [0, 12], lagHours: 4 },
  hrrr: { hours: null, lagHours: 1 },
};

export function formatTimeAgo(fromDate, now = new Date()) {
  if (!(fromDate instanceof Date) || Number.isNaN(fromDate.getTime())) return '';
  const diffMs = now - fromDate;
  if (diffMs < 0) return 'Est. pending';
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  if (diffMin < 1) return 'Est. just now';
  if (diffHr < 1) return `Est. ${diffMin}m ago`;
  if (diffHr < 48) return `Est. ${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  return `Est. ${diffDays}d ago`;
}

/**
 * Latest cycle dissemination time that should already be available.
 */
export function estimateModelAvailableAt(model, now = new Date()) {
  const cfg = MODEL_CYCLES[model];
  if (!cfg) return null;

  if (model === 'hrrr') {
    const available = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        now.getUTCHours(),
        0,
        0
      )
    );
    available.setUTCHours(available.getUTCHours() - cfg.lagHours);
    return available;
  }

  const cycles = [];
  for (let dayBack = 0; dayBack <= 2; dayBack += 1) {
    cfg.hours.forEach((hour) => {
      cycles.push(
        new Date(
          Date.UTC(
            now.getUTCFullYear(),
            now.getUTCMonth(),
            now.getUTCDate() - dayBack,
            hour,
            0,
            0
          )
        )
      );
    });
  }
  cycles.sort((a, b) => b - a);

  for (const cycle of cycles) {
    const available = new Date(cycle.getTime() + cfg.lagHours * 3600000);
    if (available <= now) return available;
  }
  return null;
}

export function getModelRunTimeAgo(model, now = new Date()) {
  const availableAt = estimateModelAvailableAt(model, now);
  return formatTimeAgo(availableAt, now);
}

export function modelKeyToApi(key) {
  const map = {
    ecmwf: 'ECMWF',
    gfs: 'GFS',
    gem: 'GEM',
    hrdps: 'HRDPS',
    hrrr: 'HRRR',
  };
  return MODEL_API_BY_NAME[map[key]] || key;
}

export function modelKeyToName(key) {
  const map = {
    gfs: 'GFS',
    ecmwf: 'ECMWF',
    gem: 'GEM',
    hrdps: 'HRDPS',
    hrrr: 'HRRR',
  };
  return map[key] || '';
}
