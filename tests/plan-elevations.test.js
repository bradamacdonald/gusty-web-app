import { beforeEach, describe, expect, it } from 'vitest';
import {
  getPlanElevations,
  setPlanElevations,
} from '../src/services/storage/plan-elevations.js';
import { STORAGE_KEYS } from '../src/lib/constants.js';

function mockLocalStorage() {
  const store = new Map();
  globalThis.localStorage = {
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

describe('plan elevations', () => {
  beforeEach(() => {
    mockLocalStorage();
  });

  it('persists trailhead and objective elevations per spot', () => {
    setPlanElevations(49.9, -117.3, 1400, 2200);
    expect(getPlanElevations(49.9, -117.3)).toEqual({ th: 1400, obj: 2200 });
    expect(getPlanElevations(50.0, -117.3)).toBeNull();
  });

  it('overwrites previous elevations for the same spot', () => {
    setPlanElevations(49.9, -117.3, 1400, 2200);
    setPlanElevations(49.9, -117.3, 1600, 2400);
    expect(getPlanElevations(49.9, -117.3)).toEqual({ th: 1600, obj: 2400 });
  });

  it('uses the gusty_plan_elevs storage key', () => {
    setPlanElevations(49.9, -117.3, 1000, 1500);
    const raw = localStorage.getItem(STORAGE_KEYS.planElevs);
    expect(JSON.parse(raw)).toEqual({
      '49.9,-117.3': { th: 1000, obj: 1500 },
    });
  });
});
