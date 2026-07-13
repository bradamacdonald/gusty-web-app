import { describe, expect, it } from 'vitest';
import { degreesToCompass, windClassFromSpeed, windRampColor } from '../src/lib/wind.js';

describe('windRampColor', () => {
  it('maps speed tiers to CSS custom properties', () => {
    expect(windRampColor(10)).toBe('var(--wind-calm)');
    expect(windRampColor(25)).toBe('var(--wind-light)');
    expect(windRampColor(45)).toBe('var(--wind-moderate)');
    expect(windRampColor(120)).toBe('var(--wind-extreme)');
  });
});

describe('windClassFromSpeed', () => {
  it('returns class names for wind tiers', () => {
    expect(windClassFromSpeed(10)).toBe('wind-calm');
    expect(windClassFromSpeed(40)).toBe('wind-moderate');
    expect(windClassFromSpeed(95)).toBe('wind-extreme');
  });
});

describe('degreesToCompass', () => {
  it('converts degrees to 16-point compass labels', () => {
    expect(degreesToCompass(0)).toBe('N');
    expect(degreesToCompass(90)).toBe('E');
    expect(degreesToCompass(180)).toBe('S');
    expect(degreesToCompass(45)).toBe('NE');
  });

  it('returns em dash for null input', () => {
    expect(degreesToCompass(null)).toBe('—');
  });
});
