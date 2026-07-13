import { describe, expect, it } from 'vitest';
import {
  buildElevationSamplePoints,
  classifyWindExposure,
  computeSlopeAspect,
  degreesToAspectLabel,
  formatAspectSummary,
  offsetLatLng,
} from '../src/lib/terrain-aspect.js';

describe('offsetLatLng', () => {
  it('moves roughly 60 m north', () => {
    const p = offsetLatLng(49.0, -117.0, 0, 60);
    expect(p.lat).toBeGreaterThan(49.0);
    expect(p.lng).toBeCloseTo(-117.0, 5);
  });
});

describe('buildElevationSamplePoints', () => {
  it('returns a 3x3 neighborhood', () => {
    const pts = buildElevationSamplePoints(50, -120, 60);
    expect(pts).toHaveLength(9);
    expect(pts[4].lat).toBeCloseTo(50, 5);
    expect(pts[4].lng).toBeCloseTo(-120, 5);
  });
});

describe('computeSlopeAspect', () => {
  it('detects an east-facing slope', () => {
    // Elevations increase toward W → faces E (downhill east)
    const elev = [
      1100, 1050, 1000,
      1100, 1050, 1000,
      1100, 1050, 1000,
    ];
    const t = computeSlopeAspect(elev, 60);
    expect(t.isFlat).toBe(false);
    expect(t.aspectDeg).toBeGreaterThan(45);
    expect(t.aspectDeg).toBeLessThan(135);
    expect(t.aspectCardinal).toBe('E');
  });

  it('marks near-flat terrain', () => {
    const elev = Array(9).fill(1500);
    const t = computeSlopeAspect(elev, 60);
    expect(t.isFlat).toBe(true);
    expect(t.aspectDeg).toBeNull();
  });
});

describe('degreesToAspectLabel', () => {
  it('maps cardinals', () => {
    expect(degreesToAspectLabel(0)).toBe('N');
    expect(degreesToAspectLabel(90)).toBe('E');
    expect(degreesToAspectLabel(180)).toBe('S');
    expect(degreesToAspectLabel(270)).toBe('W');
  });
});

describe('classifyWindExposure', () => {
  it('flags lee when slope faces downwind', () => {
    // Wind from W (270) → airflow toward E (90); east-facing = lee
    expect(classifyWindExposure(90, 270).kind).toBe('lee');
    // West-facing into west wind = windward
    expect(classifyWindExposure(270, 270).kind).toBe('windward');
  });
});

describe('formatAspectSummary', () => {
  it('includes exposure when wind is known', () => {
    const terrain = {
      isFlat: false,
      slopeDeg: 28,
      aspectDeg: 90,
      aspectLabel: 'E',
    };
    expect(formatAspectSummary(terrain, 270)).toMatch(/faces E/);
    expect(formatAspectSummary(terrain, 270)).toMatch(/Lee/i);
  });
});
