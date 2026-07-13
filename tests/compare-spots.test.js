import { describe, expect, it } from 'vitest';
import {
  MAX_COMPARE_ALTERNATES,
  pickCompareCandidates,
  rankSnapshotsByCalm,
} from '../src/services/compare-spots.js';

describe('pickCompareCandidates', () => {
  it('excludes the current location and caps the list', () => {
    const saved = [
      { name: 'Here', lat: 49.44, lng: -117.15, elevation: 1600 },
      { name: 'Rossland', lat: 49.08, lng: -117.8, elevation: 1023 },
      { name: 'Nelson', lat: 49.49, lng: -117.29, elevation: 535 },
      { name: 'Far', lat: 51.1, lng: -115.5, elevation: 1400 },
    ];
    const picks = pickCompareCandidates(saved, 49.44, -117.15, { limit: 2 });
    expect(picks).toHaveLength(2);
    expect(picks.every((p) => p.name !== 'Here')).toBe(true);
  });
});

describe('rankSnapshotsByCalm', () => {
  it('orders calmest first and pushes missing wind to the end', () => {
    const ranked = rankSnapshotsByCalm([
      { name: 'Windy', speed: 55 },
      { name: 'Calm', speed: 12 },
      { name: 'Unknown', speed: null },
      { name: 'Moderate', speed: 28 },
    ]);
    expect(ranked.map((r) => r.name)).toEqual(['Calm', 'Moderate', 'Windy', 'Unknown']);
  });
});

describe('MAX_COMPARE_ALTERNATES', () => {
  it('keeps comparisons focused', () => {
    expect(MAX_COMPARE_ALTERNATES).toBe(2);
  });
});
