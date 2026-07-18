import { describe, expect, it } from 'vitest';
import {
  buildSpotForecastUrl,
  chooseElevation,
  parseElevationMetres,
} from '../src/services/spot-elevation.js';

describe('chooseElevation', () => {
  it('uses DEM at the pin when no hint is provided', () => {
    expect(chooseElevation(12, null)).toBe(12);
    expect(chooseElevation(12.6, null)).toBe(13);
  });

  it('keeps a hint only when it agrees with DEM', () => {
    expect(chooseElevation(10, 40)).toBe(40);
    expect(chooseElevation(10, 300)).toBe(10); // stale mountain default vs sea-level DEM
  });

  it('falls back to hint when DEM is unavailable', () => {
    expect(chooseElevation(null, 1580)).toBe(1580);
    expect(chooseElevation(null, null)).toBeNull();
  });
});

describe('parseElevationMetres', () => {
  it('parses labelled metres and rejects unknowns', () => {
    expect(parseElevationMetres('1,580 m')).toBe(1580);
    expect(parseElevationMetres('12 m')).toBe(12);
    expect(parseElevationMetres('—')).toBeNull();
    expect(parseElevationMetres('')).toBeNull();
  });
});

describe('buildSpotForecastUrl', () => {
  it('omits elevation unless known for the pin', () => {
    const bare = buildSpotForecastUrl({
      lat: 49.28,
      lng: -123.12,
      name: 'Vancouver',
    });
    expect(bare).not.toContain('elevation=');
    expect(bare).toContain('name=Vancouver');

    const withElev = buildSpotForecastUrl({
      lat: 49.28,
      lng: -123.12,
      name: 'Vancouver',
      elevation: 12,
    });
    expect(withElev).toContain('elevation=12');
  });
});
