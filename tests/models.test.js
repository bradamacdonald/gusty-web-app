import { describe, expect, it } from 'vitest';
import {
  estimateModelAvailableAt,
  formatTimeAgo,
  getModelRunTimeAgo,
} from '../src/lib/models.js';

describe('formatTimeAgo', () => {
  it('formats minutes and hours', () => {
    const now = new Date('2026-01-15T12:00:00Z');
    expect(formatTimeAgo(new Date('2026-01-15T11:40:00Z'), now)).toBe('Est. 20m ago');
    expect(formatTimeAgo(new Date('2026-01-15T09:00:00Z'), now)).toBe('Est. 3h ago');
  });
});

describe('estimateModelAvailableAt', () => {
  it('applies dissemination lag so a fresh cycle is not claimed early', () => {
    // 01:00 UTC — HRDPS 00z not yet disseminated (lag 3h); expect prior 18z + 3h = 21:00 previous day
    const now = new Date('2026-01-15T01:00:00Z');
    const available = estimateModelAvailableAt('hrdps', now);
    expect(available.toISOString()).toBe('2026-01-14T21:00:00.000Z');
  });

  it('uses 00z+lag once dissemination window has passed', () => {
    const now = new Date('2026-01-15T04:00:00Z');
    const available = estimateModelAvailableAt('hrdps', now);
    expect(available.toISOString()).toBe('2026-01-15T03:00:00.000Z');
  });
});

describe('getModelRunTimeAgo', () => {
  it('returns estimated label', () => {
    const now = new Date('2026-01-15T04:00:00Z');
    expect(getModelRunTimeAgo('hrdps', now)).toBe('Est. 1h ago');
  });
});
