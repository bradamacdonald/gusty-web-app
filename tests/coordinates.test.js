import { describe, expect, it } from 'vitest';
import {
  formatCoordinates,
  isCoordinateLike,
  parseLocationFromUrl,
  resolveLocationName,
  spotKey,
} from '../src/lib/coordinates.js';

describe('formatCoordinates', () => {
  it('formats lat/lng with hemisphere labels', () => {
    expect(formatCoordinates(49.2827, -123.1207)).toBe('49.2827° N · 123.1207° W');
    expect(formatCoordinates(-33.8688, 151.2093)).toBe('33.8688° S · 151.2093° E');
  });
});

describe('isCoordinateLike', () => {
  it('detects coordinate-shaped search strings', () => {
    expect(isCoordinateLike('49.28, -123.12')).toBe(true);
    expect(isCoordinateLike('49.28° N')).toBe(true);
    expect(isCoordinateLike('')).toBe(true);
    expect(isCoordinateLike('Mount Baker')).toBe(false);
  });
});

describe('spotKey', () => {
  it('rounds coordinates to four decimal places', () => {
    expect(spotKey(49.28271234, -123.12074567)).toBe('49.2827,-123.1207');
  });
});

describe('parseLocationFromUrl', () => {
  it('parses forecast query parameters', () => {
    const result = parseLocationFromUrl('?lat=49.5&lng=-123.1&name=Grouse%20Mountain&elevation=1234&model=ECMWF');
    expect(result).toEqual({
      lat: 49.5,
      lng: -123.1,
      name: 'Grouse Mountain',
      elevation: 1234,
      model: 'ECMWF',
    });
  });
});

describe('resolveLocationName', () => {
  it('prefers a decoded place name over coordinates', () => {
    expect(resolveLocationName(49.5, -123.1, 'Grouse%20Mountain')).toBe('Grouse Mountain');
  });

  it('falls back to formatted coordinates for generic names', () => {
    expect(resolveLocationName(49.5, -123.1, 'Location')).toBe('49.5000° N · 123.1000° W');
    expect(resolveLocationName(49.5, -123.1, null)).toBe('49.5000° N · 123.1000° W');
  });
});
