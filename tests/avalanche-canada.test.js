import { describe, expect, it } from 'vitest';
import {
  dangerMeta,
  normalizeAvalancheProduct,
} from '../src/services/api/avalanche-canada.js';

describe('dangerMeta', () => {
  it('maps standard North American scale', () => {
    expect(dangerMeta('moderate').num).toBe(2);
    expect(dangerMeta('considerable').label).toBe('Considerable');
    expect(dangerMeta('offseason').num).toBeNull();
  });
});

describe('normalizeAvalancheProduct', () => {
  it('extracts ALP/TLN/BTL bands and highlights', () => {
    const normalized = normalizeAvalancheProduct({
      id: 'abc',
      url: 'https://avalanche.ca/forecasts/abc',
      owner: { display: 'Avalanche Canada' },
      report: {
        title: 'Kokanee-Ymir',
        forecaster: 'Avalanche Canada',
        dateIssued: '2026-01-15T23:00:00.000Z',
        highlights: '<p><strong>Wind slabs</strong> remain a concern.</p>',
        problems: [{ type: { display: 'Wind Slab', value: 'wind-slab' } }],
        dangerRatings: [
          {
            ratings: {
              alp: { display: 'Alpine', rating: { value: 'considerable', display: 'Considerable' } },
              tln: { display: 'Treeline', rating: { value: 'moderate', display: 'Moderate' } },
              btl: { display: 'Below Treeline', rating: { value: 'low', display: 'Low' } },
            },
          },
        ],
      },
    });

    expect(normalized.title).toBe('Kokanee-Ymir');
    expect(normalized.highlights).toBe('Wind slabs remain a concern.');
    expect(normalized.problems).toEqual(['Wind Slab']);
    expect(normalized.bands).toHaveLength(3);
    expect(normalized.highest.value).toBe('considerable');
    expect(normalized.highest.num).toBe(3);
    expect(normalized.url).toContain('avalanche.ca');
  });

  it('returns null without a report', () => {
    expect(normalizeAvalancheProduct({})).toBeNull();
  });
});
