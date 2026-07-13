import { beforeEach, describe, expect, it } from 'vitest';
import { STORAGE_KEYS } from '../src/lib/constants.js';
import {
  conditionKeyFromSpeed,
  getSavedSpots,
  getSpotDisplayData,
  setSavedSpots,
  toggleSavedSpot,
  updateSavedSpotWind,
} from '../src/services/storage/saved-spots.js';

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
}

describe('conditionKeyFromSpeed', () => {
  it('maps wind bands to badge tiers', () => {
    expect(conditionKeyFromSpeed(null)).toBe('unknown');
    expect(conditionKeyFromSpeed(20)).toBe('go');
    expect(conditionKeyFromSpeed(45)).toBe('caution');
    expect(conditionKeyFromSpeed(70)).toBe('no-go');
  });
});

describe('saved spot wind snapshots', () => {
  beforeEach(() => {
    mockLocalStorage();
    localStorage.setItem(STORAGE_KEYS.hairMode, 'false');
    localStorage.setItem(STORAGE_KEYS.units, 'metric');
  });

  it('does not invent wind when none is stored', () => {
    toggleSavedSpot({ lat: 49.5, lng: -123.1, name: 'Grouse', elevation: 1200 });
    const d = getSpotDisplayData(getSavedSpots()[0]);
    expect(d.hasLive).toBe(false);
    expect(d.windDisp).toBe('—');
    expect(d.condition).toBe('unknown');
    expect(d.conditionLabel).toBe('Open to load');
  });

  it('persists real wind onto a saved spot', () => {
    toggleSavedSpot({ lat: 49.5, lng: -123.1, name: 'Grouse', elevation: 1200 });
    expect(
      updateSavedSpotWind(49.5, -123.1, {
        windSpeed: 28,
        windDirection: 'SW',
        elevation: 1230,
      })
    ).toBe(true);

    const spot = getSavedSpots()[0];
    expect(spot.windSpeed).toBe(28);
    expect(spot.windDirection).toBe('SW');
    expect(spot.condition).toBe('go');
    expect(spot.elevation).toBe(1230);
    expect(spot.windCapturedAt).toBeTypeOf('number');

    const d = getSpotDisplayData(spot);
    expect(d.hasLive).toBe(true);
    expect(d.windDir).toBe('SW');
    expect(d.conditionLabel).toBe('Favorable');
  });

  it('no-ops when the spot is not saved', () => {
    expect(
      updateSavedSpotWind(50, -120, { windSpeed: 40, windDirection: 'N' })
    ).toBe(false);
    expect(getSavedSpots()).toEqual([]);
  });

  it('keeps order when rewriting wind via setSavedSpots round-trip', () => {
    toggleSavedSpot({ lat: 49.5, lng: -123.1, name: 'A' });
    toggleSavedSpot({ lat: 50.1, lng: -122.9, name: 'B' });
    updateSavedSpotWind(50.1, -122.9, { windSpeed: 55, windDirection: 'E' });
    const names = getSavedSpots().map((s) => s.name);
    expect(names).toEqual(['A', 'B']);
    expect(getSavedSpots()[1].condition).toBe('caution');
  });
});
