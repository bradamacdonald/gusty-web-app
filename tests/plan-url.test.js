import { describe, expect, it } from 'vitest';
import { withPlanElevParams } from '../src/lib/plan-url.js';

describe('withPlanElevParams', () => {
  it('adds th and obj while preserving other params', () => {
    const next = withPlanElevParams('lat=49.5&lng=-123.1&name=Test', 1200, 1800);
    const p = new URLSearchParams(next);
    expect(p.get('lat')).toBe('49.5');
    expect(p.get('name')).toBe('Test');
    expect(p.get('th')).toBe('1200');
    expect(p.get('obj')).toBe('1800');
  });

  it('rounds elevations and strips when invalid', () => {
    const next = withPlanElevParams('th=1&obj=2&lat=50', 1400.6, NaN);
    const p = new URLSearchParams(next);
    expect(p.get('th')).toBe('1401');
    expect(p.has('obj')).toBe(false);
    expect(p.get('lat')).toBe('50');
  });
});
