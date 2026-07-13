import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearForecastCache,
  FORECAST_CACHE_TTL_MS,
  readForecastCache,
  writeForecastCache,
} from '../src/services/storage/forecast-cache.js';

function mockSessionStorage() {
  const store = new Map();
  globalThis.sessionStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => {
      store.set(k, String(v));
    },
    removeItem: (k) => {
      store.delete(k);
    },
  };
  return store;
}

describe('forecast cache', () => {
  beforeEach(() => {
    mockSessionStorage();
  });

  it('round-trips a payload keyed by spot + elevation', () => {
    const payload = {
      main: { elevation: 1500, hourly: { windspeed_10m: [10] } },
      gfs: { hourly: { windspeed_10m: [12] } },
      gem: null,
      hrdps: null,
      avy: { productType: 'forecast' },
    };
    expect(writeForecastCache(50.1, -122.9, 1500, payload)).toBe(true);

    const cached = readForecastCache(50.1, -122.9, 1500);
    expect(cached.main).toEqual(payload.main);
    expect(cached.gfs).toEqual(payload.gfs);
    expect(cached.avy).toEqual(payload.avy);
    expect(cached.savedAt).toBeTypeOf('number');
  });

  it('returns null when TTL expired', () => {
    writeForecastCache(50.1, -122.9, null, {
      main: { hourly: {} },
    });
    const expired = readForecastCache(50.1, -122.9, null, {
      now: Date.now() + FORECAST_CACHE_TTL_MS + 1,
    });
    expect(expired).toBeNull();
  });

  it('treats elevation hints as distinct keys', () => {
    writeForecastCache(50.1, -122.9, 1200, { main: { tag: 'low' } });
    writeForecastCache(50.1, -122.9, 1800, { main: { tag: 'high' } });
    expect(readForecastCache(50.1, -122.9, 1200).main.tag).toBe('low');
    expect(readForecastCache(50.1, -122.9, 1800).main.tag).toBe('high');
    clearForecastCache(50.1, -122.9, 1200);
    expect(readForecastCache(50.1, -122.9, 1200)).toBeNull();
    expect(readForecastCache(50.1, -122.9, 1800).main.tag).toBe('high');
  });
});
